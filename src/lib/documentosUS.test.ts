import { describe, expect, it } from "vitest";
import {
  AREAS_POR_ESTADO,
  PREFIXOS_DE_EIN,
  SSN_DE_DEMONSTRACAO,
  einValido,
  formatarEin,
  formatarSsn,
  formatarTelefoneUS,
  gerarEin,
  gerarSsn,
  gerarTelefoneUS,
  ssnValido,
  telefoneUsValido,
} from "./documentosUS";

describe("gerarSsn", () => {
  it("devolve nove dígitos", () => {
    for (let i = 0; i < 200; i++) expect(gerarSsn()).toMatch(/^\d{9}$/);
  });

  it("usa a faixa emissível por padrão, para passar em formulário", () => {
    for (let i = 0; i < 200; i++) expect(ssnValido(gerarSsn())).toBe(true);
  });

  it("no estilo de demonstração usa a faixa reservada pela SSA", () => {
    for (let i = 0; i < 200; i++) {
      const s = gerarSsn("demonstracao");
      expect(Number(s.slice(0, 3))).toBe(SSN_DE_DEMONSTRACAO.area);
      expect(Number(s.slice(3, 5))).toBe(SSN_DE_DEMONSTRACAO.grupo);
      const serie = Number(s.slice(5));
      expect(serie).toBeGreaterThanOrEqual(SSN_DE_DEMONSTRACAO.serieInicial);
      expect(serie).toBeLessThanOrEqual(SSN_DE_DEMONSTRACAO.serieFinal);
    }
  });

  it("no estilo aleatório nunca cai numa faixa que a SSA não emite", () => {
    for (let i = 0; i < 3000; i++) {
      const s = gerarSsn("aleatorio");
      const area = Number(s.slice(0, 3));
      expect(area).not.toBe(0);
      expect(area).not.toBe(666);
      expect(area).toBeLessThan(900);
      expect(Number(s.slice(3, 5))).not.toBe(0);
      expect(Number(s.slice(5))).not.toBe(0);
      expect(ssnValido(s)).toBe(true);
    }
  });
});

describe("ssnValido", () => {
  it("recusa as faixas nunca emitidas", () => {
    expect(ssnValido("000-12-3456")).toBe(false);
    expect(ssnValido("666-12-3456")).toBe(false);
    expect(ssnValido("900-12-3456")).toBe(false);
    expect(ssnValido("999-12-3456")).toBe(false);
    expect(ssnValido("123-00-4567")).toBe(false);
    expect(ssnValido("123-45-0000")).toBe(false);
  });

  it("aceita um número de faixa emissível", () => {
    expect(ssnValido("123-45-6789")).toBe(true);
    expect(ssnValido("001-01-0001")).toBe(true);
    expect(ssnValido("899-99-9999")).toBe(true);
  });

  it("recusa a faixa de demonstração, que está no intervalo nunca emitido", () => {
    // 987-65-4320 é reservado pela SSA para publicidade — e por estar em
    // 900-999 é, por definição, inválido. É o motivo de o gerador não usar
    // essa faixa por padrão.
    expect(ssnValido("987-65-4320")).toBe(false);
  });

  it("recusa comprimento errado", () => {
    expect(ssnValido("123-45-678")).toBe(false);
    expect(ssnValido("")).toBe(false);
  });
});

describe("gerarEin", () => {
  it("devolve nove dígitos com prefixo de campus válido", () => {
    for (let i = 0; i < 500; i++) {
      const e = gerarEin();
      expect(e).toMatch(/^\d{9}$/);
      expect((PREFIXOS_DE_EIN as readonly number[])).toContain(Number(e.slice(0, 2)));
      expect(einValido(e)).toBe(true);
    }
  });
});

describe("einValido", () => {
  it("recusa prefixo que o IRS não usa", () => {
    expect(einValido("00-1234567")).toBe(false);
    expect(einValido("07-1234567")).toBe(false);
  });

  it("recusa comprimento errado", () => {
    expect(einValido("12-345678")).toBe(false);
  });
});

describe("gerarTelefoneUS", () => {
  it("devolve dez dígitos discáveis", () => {
    for (let i = 0; i < 500; i++) {
      const t = gerarTelefoneUS();
      expect(t).toMatch(/^\d{10}$/);
      expect(telefoneUsValido(t)).toBe(true);
    }
  });

  it("no estilo fictício usa a faixa 555-01XX, que não toca em ninguém", () => {
    for (let i = 0; i < 300; i++) {
      const t = gerarTelefoneUS(undefined, "ficticio");
      expect(t.slice(3, 6)).toBe("555");
      const linha = Number(t.slice(6));
      expect(linha).toBeGreaterThanOrEqual(100);
      expect(linha).toBeLessThanOrEqual(199);
    }
  });

  it("no estilo aleatório evita N11 e a faixa de ficção", () => {
    for (let i = 0; i < 3000; i++) {
      const t = gerarTelefoneUS(undefined, "aleatorio");
      const prefixo = Number(t.slice(3, 6));
      expect(prefixo % 100).not.toBe(11);
      expect(prefixo).not.toBe(555);
      expect(t[0] >= "2").toBe(true);
      expect(t[3] >= "2").toBe(true);
    }
  });

  it("respeita o estado escolhido", () => {
    for (const sigla of ["NY", "CA", "TX", "DC"]) {
      for (let i = 0; i < 60; i++) {
        const t = gerarTelefoneUS(sigla);
        expect(AREAS_POR_ESTADO[sigla].codigos).toContain(Number(t.slice(0, 3)));
      }
    }
  });
});

describe("telefoneUsValido", () => {
  it("recusa área ou prefixo começando com 0 ou 1", () => {
    expect(telefoneUsValido("012-345-6789")).toBe(false);
    expect(telefoneUsValido("112-345-6789")).toBe(false);
    expect(telefoneUsValido("212-045-6789")).toBe(false);
    expect(telefoneUsValido("212-145-6789")).toBe(false);
  });

  it("recusa prefixo de serviço N11", () => {
    expect(telefoneUsValido("212-911-4567")).toBe(false);
    expect(telefoneUsValido("212-411-4567")).toBe(false);
  });

  it("aceita com o 1 de longa distância na frente", () => {
    expect(telefoneUsValido("1-212-555-0123")).toBe(true);
  });
});

describe("formatação", () => {
  it("põe a máscara de cada documento", () => {
    expect(formatarSsn("987654320")).toBe("987-65-4320");
    expect(formatarEin("123456789")).toBe("12-3456789");
    expect(formatarTelefoneUS("2125550123")).toBe("(212) 555-0123");
  });
});
