import { describe, expect, it } from "vitest";

import { FERRAMENTAS, preencher, type Ferramentas } from "./textosDasFerramentas";
import { IDIOMAS } from "./idioma";

/**
 * O dicionário das ferramentas, conferido nos dois idiomas.
 *
 * O tipo `Ferramentas` já obriga as duas línguas a terem as mesmas chaves. O
 * que ele não vê é o conteúdo: uma chave em inglês com a frase em português
 * compila igual. Foi assim que "impressão" e "Pesquisar país..." chegaram às
 * páginas /en. Estes testes leem o valor, não a forma.
 */

const secoes = Object.keys(FERRAMENTAS["pt-BR"]) as (keyof Ferramentas)[];

/** Percorre a árvore devolvendo `caminho -> texto` para cada folha. */
function folhas(idioma: (typeof IDIOMAS)[number]): Record<string, string> {
  const saida: Record<string, string> = {};
  for (const secao of secoes) {
    const bloco = FERRAMENTAS[idioma][secao] as Record<string, string>;
    for (const [chave, valor] of Object.entries(bloco)) saida[`${secao}.${chave}`] = valor;
  }
  return saida;
}

describe("dicionário das ferramentas", () => {
  it("tem as mesmas chaves nos dois idiomas", () => {
    expect(Object.keys(folhas("en")).sort()).toEqual(Object.keys(folhas("pt-BR")).sort());
  });

  it("não deixa nenhum texto vazio", () => {
    for (const idioma of IDIOMAS) {
      for (const [caminho, texto] of Object.entries(folhas(idioma))) {
        expect(texto.trim(), `${idioma} ${caminho}`).not.toBe("");
      }
    }
  });

  /**
   * Acento latino é o sinal mais barato e mais confiável de português esquecido
   * no bloco inglês. Não pega tudo — "Search country" ficaria invisível se
   * alguém escrevesse "Buscar pais" sem acento —, mas pega o caso comum, que é
   * copiar a linha de cima e traduzir só metade.
   */
  it("não tem acento de português no bloco em inglês", () => {
    const acentuadas = Object.entries(folhas("en")).filter(([, texto]) =>
      /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(texto)
    );
    expect(acentuadas).toEqual([]);
  });

  /** Um texto igual nos dois idiomas quase sempre é tradução que faltou. */
  it("só repete o mesmo texto quando a palavra é a mesma nas duas línguas", () => {
    const pt = folhas("pt-BR");
    const en = folhas("en");
    // Marca, sigla, unidade e palavra idêntica nos dois idiomas.
    const iguaisDePropósito = new Set([
      "comum.paraColar",
      "vetorizador.automatico",
      "vetorizador.formatos",
      "removedor.formatos",
      "qr.criar",
      "instagram.seuPerfil",
    ]);
    const repetidos = Object.keys(pt).filter(
      (caminho) =>
        pt[caminho] === en[caminho] &&
        !iguaisDePropósito.has(caminho) &&
        // Uma palavra curta e sem espaço costuma ser a mesma nas duas línguas.
        (pt[caminho].includes(" ") || pt[caminho].length > 12)
    );
    expect(repetidos).toEqual([]);
  });

  /** Os marcadores precisam sobreviver à tradução, ou a frase perde o número. */
  it("mantém os mesmos marcadores nos dois idiomas", () => {
    const pt = folhas("pt-BR");
    const en = folhas("en");
    const marcadores = (texto: string) => (texto.match(/\{\w+\}/g) ?? []).sort();
    for (const caminho of Object.keys(pt)) {
      expect(marcadores(en[caminho]), caminho).toEqual(marcadores(pt[caminho]));
    }
  });
});

describe("preencher", () => {
  it("troca o marcador pelo valor", () => {
    expect(preencher("{n}% da imagem à mostra", { n: 40 })).toBe("40% da imagem à mostra");
  });

  it("troca todos os marcadores, inclusive repetidos", () => {
    expect(preencher("{a} e {b} e {a}", { a: "x", b: "y" })).toBe("x e y e x");
  });

  it("deixa intacto o marcador sem valor, em vez de escrever 'undefined'", () => {
    expect(preencher("{a} e {b}", { a: "x" })).toBe("x e {b}");
  });
});
