/**
 * Worker de remoção de fundo do Geradoor.
 *
 * Recebe uma imagem no corpo do POST, passa pelo Cloudflare Images com
 * `segment: "foreground"` — que roda o BiRefNet — e devolve o PNG com o fundo
 * transparente. Nada é gravado: a imagem entra como stream e sai como stream.
 *
 * O navegador manda uma cópia reduzida (lado maior de até 2048 px) e aplica a
 * máscara na foto original do lado de lá. Por isso os limites daqui são
 * apertados: eles não limitam a resolução final, só o tamanho do upload.
 *
 * Nada aqui pode gerar custo na conta. As travas, da mais barata à mais cara:
 * interruptor manual, rajada por IP e global, formato e tamanho reais, e só
 * então a reserva na cota (ver cota.ts), que conta por IP, por dia e por mês e
 * para antes das 5.000 transformações grátis. Qualquer falha no contador
 * fecha a porta: sem contagem confirmada, o Images não é chamado.
 */

import { Cota, identificarIp, lerLimites, periodos, type Limites, type PedidoDeCota, type RespostaDeCota } from "./cota";

export { Cota };

/**
 * O pedaço dos bindings que é usado, tipado à mão.
 *
 * O projeto compila com a lib DOM, e os tipos do Workers não convivem com ela
 * no mesmo programa. Descrever só o que se usa mantém o `tsc` da raiz
 * cobrindo este arquivo sem pacote de tipos extra.
 */
interface ImagesBinding {
  info(stream: ReadableStream<Uint8Array>): Promise<{ format: string; width?: number; height?: number }>;
  input(stream: ReadableStream<Uint8Array>): {
    transform(opcoes: { segment: "foreground" }): {
      output(opcoes: { format: "image/png" }): Promise<{ response(): Response }>;
    };
  };
}

interface RateLimit {
  limit(opcoes: { key: string }): Promise<{ success: boolean }>;
}

interface NamespaceDeObjeto {
  idFromName(nome: string): unknown;
  get(id: unknown): { fetch(url: string, init: RequestInit): Promise<Response> };
}

export interface Env {
  IMAGES: ImagesBinding;
  LIMITE_POR_IP: RateLimit;
  LIMITE_GLOBAL: RateLimit;
  COTA: NamespaceDeObjeto;
  ORIGENS_PERMITIDAS: string;
  /** Interruptor manual. Qualquer valor diferente de "true" desliga o recorte. */
  REMOVEDOR_ATIVO?: string;
  LIMITE_MENSAL?: string;
  LIMITE_DIARIO?: string;
  LIMITE_POR_IP_DIA?: string;
}

/** 8 MB. O navegador manda bem menos; o teto só barra abuso. */
export const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Lado e área máximos aceitos. Folga sobre os 2048 px que o navegador manda,
 * para uma versão antiga da página em cache não quebrar ao mudar o limite.
 */
export const MAX_LADO = 4096;
export const MAX_PIXELS = 16_000_000;

const FORMATOS = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Motivos de erro, estáveis, em vez de frases: a página decide o texto e,
 * principalmente, se vale cair para o modo leve.
 */
export type Motivo =
  | "origem"
  | "metodo"
  | "formato"
  | "tamanho"
  | "imagem"
  | "limite"
  | "limite-ip-dia"
  | "cota-diaria"
  | "cota"
  | "pausado"
  | "indisponivel";

class Recusa extends Error {
  constructor(
    readonly status: number,
    readonly motivo: Motivo,
    readonly headers: Record<string, string> = {}
  ) {
    super(motivo);
  }
}

/** Headers de CORS para a origem, se ela for permitida. Vazio se não for. */
export function cabecalhosDeCors(origem: string | null, permitidas: string): Record<string, string> {
  if (!origem) return {};
  const lista = permitidas.split(",").map((o) => o.trim()).filter(Boolean);
  if (!lista.includes(origem)) return {};
  return {
    "Access-Control-Allow-Origin": origem,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/** Lê o corpo inteiro, abortando assim que passar do teto — sem confiar no Content-Length. */
async function lerCorpo(request: Request): Promise<Uint8Array> {
  if (!request.body) throw new Recusa(400, "imagem");
  const leitor = request.body.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await leitor.cancel().catch(() => undefined);
      throw new Recusa(413, "tamanho");
    }
    partes.push(value);
  }
  if (total === 0) throw new Recusa(400, "imagem");
  const bytes = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) {
    bytes.set(parte, posicao);
    posicao += parte.byteLength;
  }
  return bytes;
}

const emStream = (bytes: Uint8Array) => new Blob([bytes]).stream();

/**
 * Traduz a falha do Images para um motivo.
 *
 * 9422 e 9432 são as respostas de cota do plano Free: o mês acabou. É o único
 * caso em que a página deve cair para o modo leve sem avisar erro.
 */
export function motivoDaFalhaDoImages(erro: unknown): Recusa {
  const codigo = Number((erro as { code?: unknown })?.code);
  if (codigo === 9422 || codigo === 9432) return new Recusa(503, "cota");
  if (codigo === 429) return new Recusa(429, "limite", { "Retry-After": "60" });
  return new Recusa(503, "indisponivel", { "Retry-After": "30" });
}

/**
 * Conversa com o contador. Um objeto só para o mundo todo, para que todas as
 * requisições passem pela mesma contagem.
 *
 * Qualquer falha — objeto fora do ar, limite do plano Free estourado, resposta
 * que não se entende — vira `indisponivel`. É a regra de falhar fechado: sem
 * a contagem confirmada, o Images não é chamado.
 */
async function consultarCota(env: Env, pedido: PedidoDeCota): Promise<RespostaDeCota> {
  try {
    const objeto = env.COTA.get(env.COTA.idFromName("global"));
    const resposta = await objeto.fetch("https://cota/", { method: "POST", body: JSON.stringify(pedido) });
    if (!resposta.ok) throw new Error(`cota respondeu ${resposta.status}`);
    const corpo = (await resposta.json()) as RespostaDeCota;
    if (typeof corpo?.permitido !== "boolean") throw new Error("resposta de cota inválida");
    return corpo;
  } catch (erro) {
    console.error("[removedor-de-fundo] cota", erro);
    throw new Recusa(503, "indisponivel", { "Retry-After": "60" });
  }
}

const STATUS_DA_NEGATIVA: Record<Exclude<RespostaDeCota, { permitido: true }>["motivo"], number> = {
  cota: 503,
  "cota-diaria": 503,
  "limite-ip-dia": 429,
};

export async function atender(request: Request, env: Env): Promise<Response> {
  const cors = cabecalhosDeCors(request.headers.get("Origin"), env.ORIGENS_PERMITIDAS);

  const responderErro = (recusa: Recusa) =>
    new Response(JSON.stringify({ motivo: recusa.motivo }), {
      status: recusa.status,
      headers: {
        ...cors,
        ...recusa.headers,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });

  try {
    if (request.method === "OPTIONS") {
      if (!cors["Access-Control-Allow-Origin"]) throw new Recusa(403, "origem");
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== "POST") throw new Recusa(405, "metodo", { Allow: "POST, OPTIONS" });
    if (!cors["Access-Control-Allow-Origin"]) throw new Recusa(403, "origem");

    // Desligado à mão: responde antes de contar qualquer coisa.
    if (env.REMOVEDOR_ATIVO !== "true") throw new Recusa(503, "pausado");

    const tipo = (request.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
    if (!FORMATOS.has(tipo)) throw new Recusa(415, "formato");

    const tamanhoDeclarado = request.headers.get("Content-Length");
    if (tamanhoDeclarado && Number(tamanhoDeclarado) > MAX_BYTES) throw new Recusa(413, "tamanho");

    // O IP vem do edge da Cloudflare. Nunca de X-Forwarded-For, que qualquer
    // um escreve: bastaria trocar o header para zerar o próprio limite.
    const ip = request.headers.get("CF-Connecting-IP");
    if (!ip) throw new Recusa(400, "indisponivel");
    const [porIp, global] = await Promise.all([
      env.LIMITE_POR_IP.limit({ key: `removedor:${ip}` }),
      // Rajada somando todo mundo: um ataque espalhado em muitos IPs passa
      // pelo limite individual, mas não por este.
      env.LIMITE_GLOBAL.limit({ key: "removedor:global" }),
    ]);
    if (!porIp.success || !global.success) throw new Recusa(429, "limite", { "Retry-After": "60" });

    const bytes = await lerCorpo(request);

    // O formato real, e não o declarado: um arquivo qualquer com
    // Content-Type de imagem não chega ao modelo.
    let info: Awaited<ReturnType<ImagesBinding["info"]>>;
    try {
      info = await env.IMAGES.info(emStream(bytes));
    } catch {
      throw new Recusa(400, "imagem");
    }
    const { width = 0, height = 0 } = info;
    if (!FORMATOS.has(info.format) || width < 1 || height < 1) throw new Recusa(400, "imagem");
    if (width > MAX_LADO || height > MAX_LADO || width * height > MAX_PIXELS) {
      throw new Recusa(413, "tamanho");
    }

    // Só agora, com a imagem validada, a cota é reservada: arquivo inválido
    // não gasta recorte de ninguém. A reserva é feita antes de chamar o
    // Images e não é devolvida se ele falhar — contar a mais é o erro seguro.
    const agora = new Date();
    const limites: Limites = lerLimites(env);
    const ipHash = await identificarIp(ip, periodos(agora).dia);
    const reserva = await consultarCota(env, { operacao: "reservar", ipHash, agora: agora.toISOString(), limites });
    if (!reserva.permitido) {
      throw new Recusa(STATUS_DA_NEGATIVA[reserva.motivo], reserva.motivo, { "Retry-After": "3600" });
    }

    const inicio = Date.now();
    let recorte: Response;
    try {
      const resultado = await env.IMAGES.input(emStream(bytes))
        .transform({ segment: "foreground" })
        .output({ format: "image/png" });
      recorte = resultado.response();
    } catch (erro) {
      const recusa = motivoDaFalhaDoImages(erro);
      // A Cloudflare disse que a cota acabou: o contador passa a concordar,
      // e o resto do mês nem chega a chamar o Images.
      if (recusa.motivo === "cota") {
        await consultarCota(env, { operacao: "esgotar", agora: agora.toISOString(), limites }).catch(() => undefined);
      }
      throw recusa;
    }
    if (!recorte.ok || !recorte.body) {
      await recorte.body?.cancel().catch(() => undefined);
      throw new Recusa(503, "indisponivel", { "Retry-After": "30" });
    }

    return new Response(recorte.body, {
      headers: {
        ...cors,
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Server-Timing": `recorte;dur=${Date.now() - inicio}`,
      },
    });
  } catch (erro) {
    if (erro instanceof Recusa) return responderErro(erro);
    console.error("[removedor-de-fundo]", erro);
    return responderErro(new Recusa(500, "indisponivel"));
  }
}

export default {
  fetch: (request: Request, env: Env) => atender(request, env),
};
