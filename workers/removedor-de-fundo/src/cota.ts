/**
 * Guarda de cota: o que impede este Worker de gerar custo na conta.
 *
 * O plano Free do Cloudflare Images inclui 5.000 transformações únicas por
 * mês. A documentação não diz como a remoção de fundo (`segment`) é cobrada,
 * então a conta aqui é conservadora: cada recorte vale uma transformação,
 * mesmo que a Cloudflare conte a mesma imagem repetida uma vez só. O contador
 * sempre chega ao limite antes da Cloudflare.
 *
 * O contador mora num Durable Object com SQLite, e não em KV, por
 * consistência: o KV é eventual, e duas requisições simultâneas no último
 * recorte do mês passariam as duas. No Durable Object, as leituras e escritas
 * de SQL são síncronas dentro de uma requisição, então reservar é atômico.
 */

/** Teto que nenhuma configuração consegue ultrapassar: 98% das 5.000 grátis. */
export const TETO_ABSOLUTO_MENSAL = 4_900;

export interface Limites {
  mensal: number;
  diario: number;
  porIpPorDia: number;
}

/** Os valores padrão, também usados quando a variável vem vazia ou inválida. */
export const LIMITES_PADRAO: Limites = {
  // 10% abaixo das 5.000: margem para o que a documentação não diz.
  mensal: 4_500,
  // Um único dia de abuso não queima mais que uns 4% do mês.
  diario: 200,
  // Uma pessoa trocando de foto a tarde toda não chega aqui; um script chega.
  porIpPorDia: 25,
};

/**
 * Lê os limites das variáveis do Worker.
 *
 * Valor ausente, não numérico ou não positivo cai no padrão — erro de digitação
 * na configuração nunca vira "sem limite". E o mensal nunca passa do teto
 * absoluto, nem se alguém escrever 50000.
 */
export function lerLimites(variaveis: {
  LIMITE_MENSAL?: string;
  LIMITE_DIARIO?: string;
  LIMITE_POR_IP_DIA?: string;
}): Limites {
  const numero = (valor: string | undefined, padrao: number) => {
    const n = Number(valor);
    return Number.isInteger(n) && n > 0 ? n : padrao;
  };
  return {
    mensal: Math.min(TETO_ABSOLUTO_MENSAL, numero(variaveis.LIMITE_MENSAL, LIMITES_PADRAO.mensal)),
    diario: numero(variaveis.LIMITE_DIARIO, LIMITES_PADRAO.diario),
    porIpPorDia: numero(variaveis.LIMITE_POR_IP_DIA, LIMITES_PADRAO.porIpPorDia),
  };
}

export interface Uso {
  mes: number;
  dia: number;
  ip: number;
}

export type Negativa = "cota" | "cota-diaria" | "limite-ip-dia";

/**
 * Decide se mais um recorte cabe.
 *
 * A ordem importa para a mensagem: o mês esgotado vale para todo mundo e é o
 * que precisa ser dito primeiro; o limite por IP é o mais específico.
 */
export function decidir(uso: Uso, limites: Limites): Negativa | null {
  if (uso.mes >= limites.mensal) return "cota";
  if (uso.dia >= limites.diario) return "cota-diaria";
  if (uso.ip >= limites.porIpPorDia) return "limite-ip-dia";
  return null;
}

/** Chaves de período em UTC, o mesmo fuso em que a Cloudflare reinicia os limites. */
export function periodos(agora: Date): { mes: string; dia: string } {
  const iso = agora.toISOString();
  return { mes: iso.slice(0, 7), dia: iso.slice(0, 10) };
}

/**
 * Identificador do IP para o contador: hash do IP com o dia.
 *
 * O IP em si nunca é gravado. Como o dia entra no hash, o mesmo IP gera um
 * identificador diferente a cada dia, e os de dias anteriores são apagados na
 * primeira requisição do dia seguinte.
 */
export async function identificarIp(ip: string, dia: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${dia}:${ip}`));
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* -------------------------------------------------------------------------
   Durable Object
   ------------------------------------------------------------------------- */

/** O pedaço da API do Durable Object que é usado, tipado à mão (ver index.ts). */
interface SqlCursor {
  toArray(): Array<Record<string, unknown>>;
}

export interface EstadoDoObjeto {
  storage: { sql: { exec(consulta: string, ...parametros: unknown[]): SqlCursor } };
  blockConcurrencyWhile<T>(fn: () => Promise<T> | T): Promise<T>;
}

export type PedidoDeCota =
  | { operacao: "reservar"; ipHash: string; agora: string; limites: Limites }
  | { operacao: "esgotar"; agora: string; limites: Limites };

export type RespostaDeCota = { permitido: true } | { permitido: false; motivo: Negativa };

/**
 * Contador global de recortes. Um único objeto (`idFromName("global")`), para
 * que todas as requisições do mundo passem pela mesma contagem.
 */
export class Cota {
  constructor(private readonly estado: EstadoDoObjeto) {
    void estado.blockConcurrencyWhile(() => {
      estado.storage.sql.exec(
        "CREATE TABLE IF NOT EXISTS uso (chave TEXT PRIMARY KEY, total INTEGER NOT NULL)"
      );
    });
  }

  private total(chave: string): number {
    const [linha] = this.estado.storage.sql.exec("SELECT total FROM uso WHERE chave = ?", chave).toArray();
    return typeof linha?.total === "number" ? linha.total : 0;
  }

  private somar(chave: string) {
    this.estado.storage.sql.exec(
      "INSERT INTO uso (chave, total) VALUES (?, 1) ON CONFLICT(chave) DO UPDATE SET total = total + 1",
      chave
    );
  }

  /**
   * Reserva um recorte, se couber.
   *
   * Tudo aqui é SQL síncrono, sem `await` no meio: o Durable Object não
   * atende outra requisição entre a leitura e a escrita, então não existe
   * janela para duas reservas passarem juntas pelo último recorte.
   */
  reservar(ipHash: string, agora: Date, limites: Limites): RespostaDeCota {
    const { mes, dia } = periodos(agora);
    const chaveDia = `dia:${dia}`;
    const chaveIp = `ip:${dia}:${ipHash}`;

    // Primeira requisição do dia: apaga os contadores de IP e de dia antigos.
    // Os do mês ficam — são doze linhas por ano.
    if (this.total(chaveDia) === 0) {
      this.estado.storage.sql.exec(
        "DELETE FROM uso WHERE (chave LIKE 'ip:%' AND chave NOT LIKE ?) OR (chave LIKE 'dia:%' AND chave <> ?)",
        `ip:${dia}:%`,
        chaveDia
      );
    }

    const motivo = decidir(
      { mes: this.total(`mes:${mes}`), dia: this.total(chaveDia), ip: this.total(chaveIp) },
      limites
    );
    if (motivo) return { permitido: false, motivo };

    this.somar(`mes:${mes}`);
    this.somar(chaveDia);
    this.somar(chaveIp);
    return { permitido: true };
  }

  /**
   * A Cloudflare disse que a cota acabou (erro 9422). O contador passa a
   * concordar com ela até o mês virar, e ninguém mais chama o Images à toa.
   */
  esgotar(agora: Date, limites: Limites) {
    const { mes } = periodos(agora);
    this.estado.storage.sql.exec(
      "INSERT INTO uso (chave, total) VALUES (?, ?) ON CONFLICT(chave) DO UPDATE SET total = MAX(total, excluded.total)",
      `mes:${mes}`,
      limites.mensal
    );
  }

  async fetch(request: Request): Promise<Response> {
    const pedido = (await request.json()) as PedidoDeCota;
    const agora = new Date(pedido.agora);
    if (pedido.operacao === "esgotar") {
      this.esgotar(agora, pedido.limites);
      return Response.json({ permitido: false, motivo: "cota" } satisfies RespostaDeCota);
    }
    return Response.json(this.reservar(pedido.ipHash, agora, pedido.limites) satisfies RespostaDeCota);
  }
}
