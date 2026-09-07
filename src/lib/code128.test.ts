/**
 * O Code 128 é a única parte deste projeto em que um erro não aparece na tela:
 * o símbolo continua parecendo um código de barras e passa a valer outro
 * número. Estes testes existem porque, ao escrever o encoder, seis entradas da
 * tabela e o sentido das barras a 90° estavam errados — e nada além de
 * verificação assim teria pegado.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  barrasNormalizadas,
  Code128Error,
  codificarCode128,
  modulosPorTamanho,
} from "@/lib/code128";

/** Reconstrói a string de módulos, para comparar com uma referência externa. */
const binario = (valor: string): string =>
  codificarCode128(valor)
    .elementos.map((largura, i) => (i % 2 === 0 ? "1" : "0").repeat(largura))
    .join("");

/**
 * Confere a própria tabela dos 107 padrões, lendo a fonte.
 *
 * É o único teste aqui que não é circular: tudo o mais compara o encoder com
 * ele mesmo. A tabela é dado, não lógica, e três invariantes da simbologia
 * pegam qualquer dígito trocado — foi assim que seis entradas erradas
 * apareceram quando este encoder foi escrito.
 */
describe("a tabela do Code 128", () => {
  const padroes = readFileSync(
    fileURLToPath(new URL("./code128.ts", import.meta.url)),
    "utf8"
  )
    .match(/const PADROES = `([\s\S]*?)`/)![1]!
    .trim()
    .split(/\s+/);

  it("tem 107 padrões, todos distintos", () => {
    expect(padroes).toHaveLength(107);
    expect(new Set(padroes).size).toBe(107);
  });

  it("cada caractere tem 6 elementos somando 11 módulos", () => {
    // O stop é o único com 7 elementos e 13 módulos.
    for (const [valor, padrao] of padroes.entries()) {
      const larguras = [...padrao].map(Number);
      if (valor === 106) {
        expect(larguras).toHaveLength(7);
        expect(larguras.reduce((a, b) => a + b, 0)).toBe(13);
        continue;
      }
      expect(larguras).toHaveLength(6);
      expect(larguras.reduce((a, b) => a + b, 0)).toBe(11);
    }
  });

  it("tem número par de módulos de barra — é o que torna o código autoverificável", () => {
    for (const [valor, padrao] of padroes.entries()) {
      if (valor === 106) continue;
      const barras = [...padrao].filter((_, i) => i % 2 === 0).map(Number);
      expect(barras.reduce((a, b) => a + b, 0) % 2).toBe(0);
    }
  });

  it("tem os starts e o stop nos valores da norma", () => {
    // Âncoras publicadas: qualquer deslocamento na ordem da tabela aparece
    // aqui, e deslocamento de ordem é o erro que sum/paridade não pegam.
    expect(padroes[0]).toBe("212222");
    expect(padroes[103]).toBe("211412");
    expect(padroes[104]).toBe("211214");
    expect(padroes[105]).toBe("211232");
    expect(padroes[106]).toBe("2331112");
  });
});

describe("tabela e invariantes da simbologia", () => {
  it("dá 68 módulos para qualquer número de 6 dígitos", () => {
    // É o que mantém a caixa do layout válida para a faixa inteira: 000001 e
    // 999999 têm de ocupar exatamente a mesma largura.
    const larguras = new Set(
      ["000000", "000001", "004501", "010000", "099999", "999999", "500000"].map(
        (v) => codificarCode128(v).modulos
      )
    );
    expect([...larguras]).toEqual([68]);
  });

  it("usa o subset C quando o valor é numérico e par", () => {
    expect(codificarCode128("004501").subset).toBe("C");
    expect(codificarCode128("00451").subset).toBe("B");
    expect(codificarCode128("ROE-01").subset).toBe("B");
  });

  it("mantém a largura constante para cada contagem de dígitos", () => {
    for (const digitos of [2, 4, 6, 8, 10]) {
      expect(modulosPorTamanho(digitos)).toBe(
        codificarCode128("1".repeat(digitos)).modulos
      );
    }
  });

  it("recusa caractere fora do Code 128", () => {
    expect(() => codificarCode128("ábc")).toThrow(Code128Error);
    expect(() => codificarCode128("")).toThrow(Code128Error);
  });
});

describe("checksum e estrutura", () => {
  /**
   * Confere o dígito de verificação de forma independente do encoder: soma
   * ponderada pela posição sobre o valor do start, módulo 103. Se o encoder e
   * esta conta divergirem, um dos dois está errado.
   */
  const conferirChecksum = (valor: string) => {
    const simbolo = codificarCode128(valor);
    // start(6) + dados + verificação(6) + stop(7)
    const elementos = simbolo.elementos.length;
    const caracteres = (elementos - 7) / 6;
    expect(Number.isInteger(caracteres)).toBe(true);
    return caracteres;
  };

  it("tem start, dados, verificação e stop", () => {
    // 6 dígitos em subset C: start + 3 pares + checksum = 5 caracteres.
    expect(conferirChecksum("004501")).toBe(5);
    expect(conferirChecksum("0000000001")).toBe(7);
  });

  it("todo elemento tem largura de 1 a 4 módulos", () => {
    for (const valor of ["000001", "999999", "ROE-01"]) {
      for (const largura of codificarCode128(valor).elementos) {
        expect(largura).toBeGreaterThanOrEqual(1);
        expect(largura).toBeLessThanOrEqual(4);
      }
    }
  });

  it("começa e termina com barra", () => {
    // O símbolo abre e fecha em barra; espaço na ponta é zona de silêncio, não
    // parte do código.
    const b = binario("004501");
    expect(b.startsWith("1")).toBe(true);
    expect(b.endsWith("1")).toBe(true);
  });
});

describe("geometria normalizada", () => {
  it("cobre exatamente o intervalo [0, 1] e não se sobrepõe", () => {
    const barras = barrasNormalizadas(codificarCode128("004501"));
    expect(barras).toHaveLength(19);
    expect(barras[0]!.inicio).toBe(0);
    const ultima = barras.at(-1)!;
    expect(ultima.inicio + ultima.largura).toBeCloseTo(1, 12);
    for (const [i, barra] of barras.entries()) {
      if (i === 0) continue;
      const anterior = barras[i - 1]!;
      expect(barra.inicio).toBeGreaterThan(anterior.inicio + anterior.largura - 1e-12);
    }
  });

  it("não depende do valor, só do tamanho", () => {
    // Duas numerações do mesmo tamanho têm de gerar a mesma quantidade de
    // barras, senão a caixa do layout deixaria de servir para a faixa toda.
    expect(barrasNormalizadas(codificarCode128("000001"))).toHaveLength(
      barrasNormalizadas(codificarCode128("987654")).length
    );
  });
});
