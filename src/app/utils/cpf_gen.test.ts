import { describe, expect, it } from "vitest";
import { formatCPF, generateCPF } from "./cpf_gen";

/** O cálculo oficial: pesos decrescentes, módulo 11, resto menor que 2 vira 0. */
function digitoEsperado(digitos: number[]): number {
  const soma = digitos.reduce((total, d, i) => total + d * (digitos.length + 1 - i), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

describe("generateCPF", () => {
  it("devolve 11 dígitos", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCPF()).toMatch(/^\d{11}$/);
    }
  });

  it("fecha os dois dígitos verificadores", () => {
    for (let i = 0; i < 500; i++) {
      const digitos = generateCPF().split("").map(Number);
      const base = digitos.slice(0, 9);
      expect(digitos[9]).toBe(digitoEsperado(base));
      expect(digitos[10]).toBe(digitoEsperado([...base, digitos[9]]));
    }
  });

  it("sorteia os dez dígitos, não só de 0 a 8", () => {
    // Era `Math.random() * 9`, que nunca produz 9. Com 2 mil CPFs, a chance de
    // um dígito qualquer não aparecer por acaso é desprezível.
    const vistos = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      for (const d of generateCPF().slice(0, 9)) vistos.add(d);
    }
    expect([...vistos].sort().join("")).toBe("0123456789");
  });

  it("não devolve sempre o mesmo número", () => {
    const amostra = new Set(Array.from({ length: 100 }, generateCPF));
    expect(amostra.size).toBeGreaterThan(95);
  });
});

describe("formatCPF", () => {
  it("põe a máscara do documento", () => {
    expect(formatCPF("83556211661")).toBe("835.562.116-61");
  });

  it("devolve o texto intacto quando não são 11 dígitos", () => {
    expect(formatCPF("123")).toBe("123");
  });
});
