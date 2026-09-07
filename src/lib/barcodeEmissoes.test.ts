/**
 * O aviso de sobreposição.
 *
 * É a razão de o histórico existir: sem ele o operador controla de cabeça onde
 * parou, e daí sai número repetido ou pulado — que vira retrabalho de
 * impressão, não um aviso na tela.
 */

import { describe, expect, it } from "vitest";
import { descreverSobreposicao, novaEmissao, sobreposicoes, type Emissao } from "@/lib/barcodeEmissoes";

const emissao = (
  de: number,
  ate: number,
  digitos = 6,
  nota = "",
  em = "2026-08-30T14:22:00.000Z"
): Emissao => ({
  id: `${de}-${ate}`,
  de,
  ate,
  digitos,
  em,
  arquivo: "x.pdf",
  paginas: ate - de + 1,
  arquivos: 1,
  nota,
});
const faixa = (de: number, ate: number) => ({ de, ate, paginasPorArquivo: 1000 });

describe("detecção", () => {
  const historico = [emissao(1, 10000, 6, "Carlos Campos")];

  it("acha faixa contida, faixa que engloba e encostada nas pontas", () => {
    expect(sobreposicoes(faixa(4000, 9000), historico)).toHaveLength(1);
    expect(sobreposicoes(faixa(1, 20000), historico)).toHaveLength(1);
    expect(sobreposicoes(faixa(10000, 12000), historico)).toHaveLength(1);
    expect(sobreposicoes(faixa(1, 1), historico)).toHaveLength(1);
  });

  it("não acusa faixa adjacente", () => {
    // Emitir 10001 em diante depois de 1–10000 é a continuação natural, e
    // avisar aí ensinaria o operador a ignorar o aviso.
    expect(sobreposicoes(faixa(10001, 20000), historico)).toHaveLength(0);
    expect(sobreposicoes(faixa(0, 0), historico)).toHaveLength(0);
  });

  it("acha todas as que cruzam", () => {
    const varias = [emissao(1, 5000), emissao(4000, 9000), emissao(20000, 30000)];
    expect(sobreposicoes(faixa(4500, 4600), varias)).toHaveLength(2);
  });

  it("histórico vazio nunca acusa", () => {
    expect(sobreposicoes(faixa(1, 100), [])).toHaveLength(0);
  });
});

describe("mensagem", () => {
  it("nomeia as duas faixas, a data e a anotação", () => {
    // Sem nomear, o operador só sabe que "tem algo" — e a saída fácil passa a
    // ser ignorar.
    const msg = descreverSobreposicao(faixa(4000, 9000), 6, [
      emissao(1, 10000, 6, "Carlos Campos"),
    ]);
    expect(msg).toContain("004000–009000");
    expect(msg).toContain("000001–010000");
    expect(msg).toContain("30/08/2026");
    expect(msg).toContain("Carlos Campos");
  });

  it("avisa quando a contagem de dígitos era outra", () => {
    const msg = descreverSobreposicao(faixa(4000, 9000), 6, [emissao(1, 10000, 5)]);
    expect(msg).toMatch(/5 dígitos/);
    expect(msg).toMatch(/esta usa 6/);
  });

  it("conta as demais no singular e no plural", () => {
    expect(
      descreverSobreposicao(faixa(4500, 4600), 6, [emissao(1, 9000), emissao(2, 8000)])
    ).toMatch(/mais uma emissão/);
    expect(
      descreverSobreposicao(faixa(4500, 4600), 6, [
        emissao(1, 9000),
        emissao(2, 8000),
        emissao(3, 7000),
      ])
    ).toMatch(/mais 2 emissões/);
  });

  it("sem cruzamento, não há mensagem", () => {
    expect(descreverSobreposicao(faixa(1, 2), 6, [])).toBe("");
  });

  it("aguenta data inválida sem quebrar", () => {
    const msg = descreverSobreposicao(faixa(1, 10), 6, [emissao(1, 10, 6, "", "não é data")]);
    expect(msg).toContain("data desconhecida");
  });
});

describe("registro", () => {
  it("guarda faixa, dígitos e data, e começa sem anotação", () => {
    const nova = novaEmissao({
      faixa: faixa(1, 1000),
      digitos: 6,
      arquivo: "000001-001000.pdf",
      paginas: 1000,
      arquivos: 1,
    });
    expect(nova.de).toBe(1);
    expect(nova.ate).toBe(1000);
    expect(nova.digitos).toBe(6);
    expect(nova.nota).toBe("");
    expect(Number.isNaN(new Date(nova.em).getTime())).toBe(false);
    expect(nova.id.length).toBeGreaterThan(8);
  });
});
