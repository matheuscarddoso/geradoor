import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import {
  Cota,
  LIMITES_PADRAO,
  TETO_ABSOLUTO_MENSAL,
  decidir,
  identificarIp,
  lerLimites,
  periodos,
  type EstadoDoObjeto,
  type Limites,
} from "./cota";

/**
 * Estado de Durable Object com SQLite de verdade por baixo.
 *
 * O SQL do contador — ON CONFLICT, LIKE, a limpeza do dia anterior — roda num
 * SQLite real, e não num mock que concordaria com qualquer consulta.
 */
function estadoComSqlite(): EstadoDoObjeto & { banco: DatabaseSync } {
  const banco = new DatabaseSync(":memory:");
  return {
    banco,
    storage: {
      sql: {
        exec(consulta: string, ...parametros: unknown[]) {
          const comando = banco.prepare(consulta);
          const leitura = /^\s*select/i.test(consulta);
          const linhas = leitura
            ? (comando.all(...(parametros as never[])) as Array<Record<string, unknown>>)
            : (comando.run(...(parametros as never[])), []);
          return { toArray: () => linhas };
        },
      },
    },
    blockConcurrencyWhile: async <T,>(fn: () => Promise<T> | T) => fn(),
  };
}

const limites: Limites = { mensal: 5, diario: 3, porIpPorDia: 2 };
const dia1 = new Date("2026-09-14T10:00:00Z");

describe("lerLimites", () => {
  it("usa o padrão quando a variável falta, é inválida ou não é positiva", () => {
    expect(lerLimites({})).toEqual(LIMITES_PADRAO);
    expect(lerLimites({ LIMITE_MENSAL: "abc", LIMITE_DIARIO: "0", LIMITE_POR_IP_DIA: "-3" })).toEqual(LIMITES_PADRAO);
    expect(lerLimites({ LIMITE_DIARIO: "12.5" }).diario).toBe(LIMITES_PADRAO.diario);
  });

  it("nunca deixa o mensal passar do teto absoluto, nem configurado errado", () => {
    expect(lerLimites({ LIMITE_MENSAL: "50000" }).mensal).toBe(TETO_ABSOLUTO_MENSAL);
    expect(TETO_ABSOLUTO_MENSAL).toBeLessThan(5_000);
  });

  it("aceita valores menores que o padrão", () => {
    expect(lerLimites({ LIMITE_MENSAL: "1000", LIMITE_DIARIO: "50", LIMITE_POR_IP_DIA: "5" })).toEqual({
      mensal: 1000,
      diario: 50,
      porIpPorDia: 5,
    });
  });
});

describe("decidir", () => {
  it("permite enquanto tudo está abaixo do limite", () => {
    expect(decidir({ mes: 4, dia: 2, ip: 1 }, limites)).toBeNull();
  });

  it("nega exatamente no limite, não um depois", () => {
    expect(decidir({ mes: 5, dia: 0, ip: 0 }, limites)).toBe("cota");
    expect(decidir({ mes: 0, dia: 3, ip: 0 }, limites)).toBe("cota-diaria");
    expect(decidir({ mes: 0, dia: 0, ip: 2 }, limites)).toBe("limite-ip-dia");
  });

  it("dá prioridade ao mês esgotado, que vale para todo mundo", () => {
    expect(decidir({ mes: 5, dia: 3, ip: 2 }, limites)).toBe("cota");
  });
});

describe("periodos e identificarIp", () => {
  it("usa UTC, o fuso em que a Cloudflare reinicia os limites", () => {
    expect(periodos(new Date("2026-09-30T23:30:00-03:00"))).toEqual({ mes: "2026-10", dia: "2026-10-01" });
  });

  it("não grava o IP e muda o identificador a cada dia", async () => {
    const hoje = await identificarIp("203.0.113.7", "2026-09-14");
    const amanha = await identificarIp("203.0.113.7", "2026-09-15");
    expect(hoje).not.toContain("203");
    expect(hoje).toMatch(/^[0-9a-f]{24}$/);
    expect(hoje).not.toBe(amanha);
    expect(await identificarIp("203.0.113.7", "2026-09-14")).toBe(hoje);
  });
});

describe("Cota (Durable Object)", () => {
  it("conta e para no limite por IP, sem afetar outro IP", () => {
    const cota = new Cota(estadoComSqlite());
    expect(cota.reservar("a", dia1, limites)).toEqual({ permitido: true });
    expect(cota.reservar("a", dia1, limites)).toEqual({ permitido: true });
    expect(cota.reservar("a", dia1, limites)).toEqual({ permitido: false, motivo: "limite-ip-dia" });
    expect(cota.reservar("b", dia1, limites)).toEqual({ permitido: true });
  });

  it("negativa não consome cota: tentar de novo depois de negado não soma", () => {
    const estado = estadoComSqlite();
    const cota = new Cota(estado);
    cota.reservar("a", dia1, limites);
    cota.reservar("a", dia1, limites);
    for (let i = 0; i < 10; i++) cota.reservar("a", dia1, limites);
    const [{ total }] = estado.banco.prepare("SELECT total FROM uso WHERE chave = 'mes:2026-09'").all() as Array<{ total: number }>;
    expect(total).toBe(2);
  });

  it("para no limite diário global e volta no dia seguinte, limpando o dia antigo", () => {
    const estado = estadoComSqlite();
    const cota = new Cota(estado);
    expect(cota.reservar("a", dia1, limites).permitido).toBe(true);
    expect(cota.reservar("b", dia1, limites).permitido).toBe(true);
    expect(cota.reservar("c", dia1, limites).permitido).toBe(true);
    expect(cota.reservar("d", dia1, limites)).toEqual({ permitido: false, motivo: "cota-diaria" });

    const dia2 = new Date("2026-09-15T08:00:00Z");
    expect(cota.reservar("a", dia2, limites)).toEqual({ permitido: true });
    const chaves = (estado.banco.prepare("SELECT chave FROM uso ORDER BY chave").all() as Array<{ chave: string }>).map((l) => l.chave);
    expect(chaves).toEqual(["dia:2026-09-15", "ip:2026-09-15:a", "mes:2026-09"]);
  });

  it("para no limite mensal mesmo trocando de dia e de IP", () => {
    const cota = new Cota(estadoComSqlite());
    const mensal: Limites = { mensal: 4, diario: 100, porIpPorDia: 100 };
    for (let d = 1; d <= 4; d++) {
      expect(cota.reservar(`ip${d}`, new Date(`2026-09-0${d}T12:00:00Z`), mensal).permitido).toBe(true);
    }
    expect(cota.reservar("novo", new Date("2026-09-20T12:00:00Z"), mensal)).toEqual({ permitido: false, motivo: "cota" });
    // Virou o mês: volta a permitir.
    expect(cota.reservar("novo", new Date("2026-10-01T00:00:01Z"), mensal).permitido).toBe(true);
  });

  it("esgotar trava o resto do mês na hora, sem nunca diminuir o contador", () => {
    const estado = estadoComSqlite();
    const cota = new Cota(estado);
    cota.reservar("a", dia1, limites);
    cota.esgotar(dia1, limites);
    expect(cota.reservar("b", dia1, limites)).toEqual({ permitido: false, motivo: "cota" });

    // Um limite menor depois não reduz o contador já esgotado.
    cota.esgotar(dia1, { ...limites, mensal: 1 });
    const [{ total }] = estado.banco.prepare("SELECT total FROM uso WHERE chave = 'mes:2026-09'").all() as Array<{ total: number }>;
    expect(total).toBe(5);
  });

  it("atende pelo fetch, o protocolo que o Worker usa", async () => {
    const cota = new Cota(estadoComSqlite());
    const pedir = (corpo: object) =>
      cota.fetch(new Request("https://cota/", { method: "POST", body: JSON.stringify(corpo) })).then((r) => r.json());
    expect(await pedir({ operacao: "reservar", ipHash: "a", agora: dia1.toISOString(), limites })).toEqual({ permitido: true });
    expect(await pedir({ operacao: "esgotar", agora: dia1.toISOString(), limites })).toEqual({ permitido: false, motivo: "cota" });
    expect(await pedir({ operacao: "reservar", ipHash: "b", agora: dia1.toISOString(), limites })).toEqual({ permitido: false, motivo: "cota" });
  });
});
