import { describe, expect, it } from "vitest";
import { generateCPF } from "@/app/utils/cpf_gen";
import { apenasDigitos, validarCpf } from "./validarCpf";

describe("validarCpf", () => {
  it("aceita qualquer número que o gerador produz", () => {
    for (let i = 0; i < 500; i++) {
      expect(validarCpf(generateCPF()).estado).toBe("valido");
    }
  });

  it("aceita com e sem máscara", () => {
    const numero = generateCPF();
    const comMascara = numero.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    expect(validarCpf(comMascara).estado).toBe("valido");
    expect(validarCpf(numero).estado).toBe("valido");
  });

  it("reconhece o número incompleto sem chamar de inválido", () => {
    const r = validarCpf("835.562.11");
    expect(r).toEqual({ estado: "incompleto", digitos: 8 });
  });

  it("separa os repetidos, que fecham a conta por acidente", () => {
    for (const d of "0123456789") {
      expect(validarCpf(d.repeat(11)).estado).toBe("repetido");
    }
  });

  it("diz quais dígitos eram esperados quando não fecha", () => {
    const r = validarCpf("835.562.116-62");
    expect(r.estado).toBe("invalido");
    if (r.estado === "invalido") {
      expect(r.esperados).toEqual([6, 1]);
      expect(r.informados).toEqual([6, 2]);
    }
  });

  it("identifica a região pelo nono dígito", () => {
    // 111.444.777-35 é o exemplo clássico: nono dígito 7.
    const r = validarCpf("111.444.777-35");
    expect(r.estado).toBe("valido");
    if (r.estado === "valido") expect(r.regiao).toBe("Espírito Santo e Rio de Janeiro");
  });

  it("trata o campo vazio", () => {
    expect(validarCpf("").estado).toBe("vazio");
    expect(validarCpf("abc").estado).toBe("vazio");
  });
});

describe("apenasDigitos", () => {
  it("descarta o que não é algarismo e corta em onze", () => {
    expect(apenasDigitos("835.562.116-61")).toBe("83556211661");
    expect(apenasDigitos("8355621166199")).toBe("83556211661");
  });
});
