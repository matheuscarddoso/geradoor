import { describe, expect, it, vi } from "vitest";
import { MAX_BYTES, atender, cabecalhosDeCors, motivoDaFalhaDoImages, type Env } from "./index";
import type { PedidoDeCota, RespostaDeCota } from "./cota";

const ORIGEM = "https://www.geradoor.com";
const PNG_RECORTADO = new Uint8Array([137, 80, 78, 71]);

function criarEnv(opcoes: {
  info?: { format: string; width?: number; height?: number } | Error;
  recorte?: Response | Error;
  limiteOk?: boolean;
  limiteGlobalOk?: boolean;
  /** Resposta do contador; Error simula o Durable Object fora do ar. */
  cota?: RespostaDeCota | Error;
  ativo?: string;
} = {}) {
  const chamadas = { transform: [] as unknown[], limite: [] as string[], cota: [] as PedidoDeCota[] };
  const env: Env = {
    ORIGENS_PERMITIDAS: `${ORIGEM},http://localhost:3001`,
    REMOVEDOR_ATIVO: opcoes.ativo ?? "true",
    LIMITE_POR_IP: {
      limit: vi.fn(async ({ key }: { key: string }) => {
        chamadas.limite.push(key);
        return { success: opcoes.limiteOk ?? true };
      }),
    },
    LIMITE_GLOBAL: {
      limit: vi.fn(async () => ({ success: opcoes.limiteGlobalOk ?? true })),
    },
    COTA: {
      idFromName: () => "global",
      get: () => ({
        fetch: vi.fn(async (_url: string, init: RequestInit) => {
          const pedido = JSON.parse(String(init.body)) as PedidoDeCota;
          chamadas.cota.push(pedido);
          if (opcoes.cota instanceof Error) throw opcoes.cota;
          if (pedido.operacao === "esgotar") return Response.json({ permitido: false, motivo: "cota" });
          return Response.json(opcoes.cota ?? { permitido: true });
        }),
      }),
    },
    IMAGES: {
      info: vi.fn(async () => {
        if (opcoes.info instanceof Error) throw opcoes.info;
        return opcoes.info ?? { format: "image/jpeg", width: 1200, height: 1600 };
      }),
      input: vi.fn(() => ({
        transform: (o: { segment: "foreground" }) => {
          chamadas.transform.push(o);
          return {
            output: async () => {
              if (opcoes.recorte instanceof Error) throw opcoes.recorte;
              const resposta = opcoes.recorte ?? new Response(PNG_RECORTADO, { headers: { "Content-Type": "image/png" } });
              return { response: () => resposta };
            },
          };
        },
      })),
    },
  };
  return { env, chamadas };
}

function pedido({
  metodo = "POST",
  origem = ORIGEM,
  tipo = "image/jpeg",
  corpo = new Uint8Array([1, 2, 3]) as BodyInit | null,
  ip = "203.0.113.7",
  cabecalhos = {} as Record<string, string>,
} = {}) {
  const headers = new Headers(cabecalhos);
  if (origem) headers.set("Origin", origem);
  if (tipo) headers.set("Content-Type", tipo);
  if (ip) headers.set("CF-Connecting-IP", ip);
  return new Request("https://removedor.example/", {
    method: metodo,
    headers,
    body: metodo === "POST" ? corpo : undefined,
  });
}

const motivo = async (resposta: Response) => ((await resposta.json()) as { motivo: string }).motivo;

describe("cabecalhosDeCors", () => {
  it("devolve a origem exata, nunca curinga", () => {
    expect(cabecalhosDeCors(ORIGEM, ORIGEM)["Access-Control-Allow-Origin"]).toBe(ORIGEM);
  });

  it("não libera origem fora da lista nem parecida com uma da lista", () => {
    expect(cabecalhosDeCors("https://geradoor.com.evil.io", ORIGEM)).toEqual({});
    expect(cabecalhosDeCors(null, ORIGEM)).toEqual({});
  });
});

describe("atender", () => {
  it("recorta: manda segment foreground e devolve o PNG com CORS e sem cache", async () => {
    const { env, chamadas } = criarEnv();
    const resposta = await atender(pedido(), env);

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Content-Type")).toBe("image/png");
    expect(resposta.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEM);
    expect(resposta.headers.get("Cache-Control")).toBe("no-store");
    expect(new Uint8Array(await resposta.arrayBuffer())).toEqual(PNG_RECORTADO);
    expect(chamadas.transform).toEqual([{ segment: "foreground" }]);
  });

  it("responde o preflight só para origem permitida", async () => {
    const { env } = criarEnv();
    expect((await atender(pedido({ metodo: "OPTIONS" }), env)).status).toBe(204);
    expect((await atender(pedido({ metodo: "OPTIONS", origem: "https://outro.site" }), env)).status).toBe(403);
  });

  it("recusa origem desconhecida antes de gastar limite ou cota", async () => {
    const { env, chamadas } = criarEnv();
    const resposta = await atender(pedido({ origem: "https://outro.site" }), env);
    expect(resposta.status).toBe(403);
    expect(await motivo(resposta)).toBe("origem");
    expect(chamadas.limite).toEqual([]);
    expect(env.IMAGES.input).not.toHaveBeenCalled();
  });

  it("recusa método que não é POST", async () => {
    const { env } = criarEnv();
    expect((await atender(pedido({ metodo: "GET" }), env)).status).toBe(405);
  });

  it("recusa formato fora de JPEG, PNG e WebP", async () => {
    const { env } = criarEnv();
    const resposta = await atender(pedido({ tipo: "image/svg+xml" }), env);
    expect(resposta.status).toBe(415);
    expect(await motivo(resposta)).toBe("formato");
  });

  it("recusa pelo Content-Length declarado sem ler o corpo", async () => {
    const { env } = criarEnv();
    const resposta = await atender(pedido({ cabecalhos: { "Content-Length": String(MAX_BYTES + 1) } }), env);
    expect(resposta.status).toBe(413);
  });

  it("recusa corpo acima do teto mesmo mentindo no Content-Length", async () => {
    const { env } = criarEnv();
    const resposta = await atender(pedido({ corpo: new Uint8Array(MAX_BYTES + 1) }), env);
    expect(resposta.status).toBe(413);
    expect(env.IMAGES.input).not.toHaveBeenCalled();
  });

  it("limita por IP do edge, e não por header que o cliente escreve", async () => {
    const { env, chamadas } = criarEnv({ limiteOk: false });
    const resposta = await atender(pedido({ cabecalhos: { "X-Forwarded-For": "1.1.1.1" } }), env);
    expect(resposta.status).toBe(429);
    expect(resposta.headers.get("Retry-After")).toBe("60");
    expect(chamadas.limite).toEqual(["removedor:203.0.113.7"]);
  });

  it("recusa sem IP do edge em vez de dividir um limite entre todo mundo", async () => {
    const { env } = criarEnv();
    expect((await atender(pedido({ ip: "" }), env)).status).toBe(400);
  });

  it("confere o formato real: arquivo que não é imagem não chega ao modelo", async () => {
    const { env } = criarEnv({ info: new Error("não é imagem") });
    const resposta = await atender(pedido(), env);
    expect(resposta.status).toBe(400);
    expect(await motivo(resposta)).toBe("imagem");
    expect(env.IMAGES.input).not.toHaveBeenCalled();
  });

  it("recusa imagem grande demais em pixels", async () => {
    const { env } = criarEnv({ info: { format: "image/jpeg", width: 5000, height: 3000 } });
    expect((await atender(pedido(), env)).status).toBe(413);
  });

  it("traduz a cota esgotada do plano Free para 'cota' e trava o contador pelo resto do mês", async () => {
    const { env, chamadas } = criarEnv({ recorte: Object.assign(new Error("quota"), { code: 9422 }) });
    const resposta = await atender(pedido(), env);
    expect(resposta.status).toBe(503);
    expect(await motivo(resposta)).toBe("cota");
    expect(resposta.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEM);
    expect(chamadas.cota.map((c) => c.operacao)).toEqual(["reservar", "esgotar"]);
  });

  it("trata resposta ruim do Images como indisponível", async () => {
    const { env } = criarEnv({ recorte: new Response("x", { status: 500 }) });
    const resposta = await atender(pedido(), env);
    expect(resposta.status).toBe(503);
    expect(await motivo(resposta)).toBe("indisponivel");
  });
});

describe("travas de custo", () => {
  it("desligado no interruptor: recusa antes de contar ou chamar o Images", async () => {
    const { env, chamadas } = criarEnv({ ativo: "false" });
    const resposta = await atender(pedido(), env);
    expect(resposta.status).toBe(503);
    expect(await motivo(resposta)).toBe("pausado");
    expect(chamadas.limite).toEqual([]);
    expect(chamadas.cota).toEqual([]);
    expect(env.IMAGES.input).not.toHaveBeenCalled();
  });

  it("interruptor ausente conta como desligado, nunca como ligado", async () => {
    const { env } = criarEnv();
    delete env.REMOVEDOR_ATIVO;
    expect(await motivo(await atender(pedido(), env))).toBe("pausado");
  });

  it("rajada global estourada recusa mesmo com o IP dentro do limite", async () => {
    const { env } = criarEnv({ limiteGlobalOk: false });
    const resposta = await atender(pedido(), env);
    expect(resposta.status).toBe(429);
    expect(env.IMAGES.input).not.toHaveBeenCalled();
  });

  it.each([
    ["cota", 503],
    ["cota-diaria", 503],
    ["limite-ip-dia", 429],
  ] as const)("cota negada (%s) responde %i e não chama o Images", async (negativa, status) => {
    const { env } = criarEnv({ cota: { permitido: false, motivo: negativa } });
    const resposta = await atender(pedido(), env);
    expect(resposta.status).toBe(status);
    expect(await motivo(resposta)).toBe(negativa);
    expect(env.IMAGES.input).not.toHaveBeenCalled();
  });

  it("contador fora do ar falha fechado: sem contagem, sem Images", async () => {
    const { env } = criarEnv({ cota: new Error("objeto indisponível") });
    const resposta = await atender(pedido(), env);
    expect(resposta.status).toBe(503);
    expect(await motivo(resposta)).toBe("indisponivel");
    expect(env.IMAGES.input).not.toHaveBeenCalled();
  });

  it("imagem inválida não consome cota: a reserva vem depois da validação", async () => {
    const { env, chamadas } = criarEnv({ info: new Error("não é imagem") });
    await atender(pedido(), env);
    expect(chamadas.cota).toEqual([]);
  });

  it("reserva com hash do IP, nunca o IP, e com os limites das variáveis", async () => {
    const { env, chamadas } = criarEnv();
    env.LIMITE_MENSAL = "99999";
    await atender(pedido(), env);
    const [reserva] = chamadas.cota;
    expect(reserva.operacao).toBe("reservar");
    expect(JSON.stringify(reserva)).not.toContain("203.0.113.7");
    expect(reserva.operacao === "reservar" && reserva.limites.mensal).toBe(4_900);
  });
});

describe("motivoDaFalhaDoImages", () => {
  it("reconhece os dois códigos de cota", () => {
    expect(motivoDaFalhaDoImages({ code: 9422 }).motivo).toBe("cota");
    expect(motivoDaFalhaDoImages({ code: 9432 }).motivo).toBe("cota");
  });

  it("qualquer outra falha é indisponibilidade, não cota", () => {
    expect(motivoDaFalhaDoImages(new Error("x")).motivo).toBe("indisponivel");
  });
});
