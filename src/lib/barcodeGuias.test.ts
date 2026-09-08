/**
 * Alinhamento e distribuição.
 *
 * O que se confere aqui é intenção, não implementação: alinhar com um código
 * selecionado usa a folha como moldura, com vários usa a própria seleção, e
 * distribuir iguala o **vão** e não o centro. Trocar qualquer uma dessas três
 * coisas continua compilando e passa a produzir folha errada em silêncio.
 */

import { describe, expect, it } from "vitest";
import { FONTE_PADRAO } from "@/lib/fontes";
import { caixaEnvolvente, layoutRoe01, type Codigo, type Pagina } from "@/lib/barcodeLayout";
import {
  alinharConjunto,
  calcularAlinhamento,
  detectarEspacamento,
  distribuirConjunto,
  girarConjunto,
  interseccionam,
  uniaoDeCaixas,
} from "@/lib/barcodeGuias";

const codigo = (id: string, x: number, y: number, comprimento = 40, altura = 12, rotacao = 0): Codigo => ({
  id,
  x,
  y,
  comprimento,
  altura,
  rotacao,
  texto: false,
  textoDigitos: 0,
  textoTamanho: 8,
  textoEspaco: 0.8,
  textoAcima: false,
  textoFonte: FONTE_PADRAO,
  textoPeso: 400,
  textoEntreletras: 0,
  textoAlinhamento: "centro",
});
const pagina: Pagina = { largura: 200, altura: 200 };
const caixa = (x: number, y = 50, largura = 20, altura = 10) => ({ x, y, largura, altura });

describe("ímã das guias", () => {
  const vizinhas = [caixa(20, 20, 40, 10), caixa(20, 60, 40, 10)];

  it("gruda na borda do vizinho", () => {
    const r = calcularAlinhamento({ x: 21.2, y: 100, largura: 40, altura: 10 }, vizinhas, pagina, 2);
    expect(r.ajuste.x).toBeCloseTo(-1.2, 9);
    expect(r.guias.some((g) => g.eixo === "x" && g.origem === "codigo")).toBe(true);
  });

  it("gruda no centro da folha", () => {
    const r = calcularAlinhamento({ x: 79.3, y: 100, largura: 40, altura: 10 }, vizinhas, pagina, 2);
    expect(r.ajuste.x).toBeCloseTo(0.7, 9);
    expect(r.guias.some((g) => g.origem === "pagina")).toBe(true);
  });

  it("não gruda fora da tolerância", () => {
    const r = calcularAlinhamento({ x: 30, y: 100, largura: 40, altura: 10 }, vizinhas, pagina, 2);
    expect(r.ajuste.x).toBe(0);
    expect(r.guias.filter((g) => g.eixo === "x")).toHaveLength(0);
  });
});

describe("vãos iguais durante o arrasto", () => {
  it("gruda na posição que iguala os dois vãos", () => {
    // Vizinhas em 10..30 e 70..90; a móvel em 40,3 fica a 0,3 do lugar certo.
    const r = detectarEspacamento(caixa(40.3), [caixa(10), caixa(70)], "x", 0.5);
    expect(r).not.toBeNull();
    expect(r!.ajuste).toBeCloseTo(-0.3, 6);
    expect(r!.vao).toBeCloseTo(10, 6);
    expect(r!.marcas).toHaveLength(2);
  });

  it("a tolerância é medida na caixa, não na diferença dos vãos", () => {
    // Um milímetro fora vira dois de diferença entre os vãos: não gruda.
    expect(detectarEspacamento(caixa(41), [caixa(10), caixa(70)], "x", 0.5)).toBeNull();
  });

  it("ignora vizinho que não é da mesma fileira", () => {
    expect(detectarEspacamento(caixa(40), [caixa(10), caixa(70, 200)], "x", 0.5)).toBeNull();
  });

  it("precisa de dois vizinhos e de vão de verdade", () => {
    expect(detectarEspacamento(caixa(40), [caixa(10)], "x", 0.5)).toBeNull();
    // Caixas sobrepostas não têm vão.
    expect(detectarEspacamento(caixa(15), [caixa(10), caixa(20)], "x", 0.5)).toBeNull();
  });
});

describe("alinhar", () => {
  it("com um selecionado, a moldura é a folha", () => {
    expect(alinharConjunto([codigo("a", 50, 50)], pagina, "esquerda")[0]!.x).toBe(0);
  });

  it("com vários, a moldura é a seleção", () => {
    const tres = [codigo("a", 10, 10), codigo("b", 30, 40), codigo("c", 20, 80)];
    // A borda esquerda da seleção é 10 — alinhar não arrasta o grupo para a
    // margem do papel.
    expect(alinharConjunto(tres, pagina, "esquerda").map((r) => r.x)).toEqual([10, 10, 10]);
    expect(alinharConjunto(tres, pagina, "direita").map((r) => r.x)).toEqual([30, 30, 30]);
  });

  it("preserva o giro ao recolocar a caixa", () => {
    const deitado = layoutRoe01().codigos.find((c) => c.rotacao === 90)!;
    const movido = { ...deitado, ...alinharConjunto([deitado], { largura: 218, altura: 238 }, "esquerda")[0]! };
    expect(movido.rotacao).toBe(90);
    // Alinha pela caixa envolvente, então a quina que avança é a que encosta.
    expect(caixaEnvolvente(movido).x).toBeCloseTo(0, 2);
  });
});

describe("distribuir", () => {
  it("iguala os vãos e mantém os extremos", () => {
    const fila = [
      codigo("a", 10, 50, 20),
      codigo("b", 44, 50, 20),
      codigo("c", 60, 50, 20),
      codigo("d", 130, 50, 20),
    ];
    const xs = distribuirConjunto(fila, "x")
      .map((r) => r.x)
      .sort((a, b) => a - b);
    expect(xs[0]).toBe(10);
    expect(xs.at(-1)).toBe(130);
    const vaos = xs.slice(1).map((x, i) => x - xs[i]! - 20);
    expect(Math.max(...vaos) - Math.min(...vaos)).toBeLessThanOrEqual(0.01);
  });

  it("iguala o vão, não o centro, com larguras diferentes", () => {
    const misto = [codigo("a", 10, 50, 10), codigo("b", 40, 50, 30), codigo("c", 100, 50, 20)];
    const postos = distribuirConjunto(misto, "x")
      .map((r) => ({ x: r.x, w: misto.find((m) => m.id === r.id)!.comprimento }))
      .sort((a, b) => a.x - b.x);
    const vaos = postos.slice(1).map((p, i) => p.x - (postos[i]!.x + postos[i]!.w));
    expect(Math.max(...vaos) - Math.min(...vaos)).toBeLessThanOrEqual(0.01);
  });

  it("com menos de três não faz nada", () => {
    expect(distribuirConjunto([codigo("a", 0, 0), codigo("b", 50, 0)], "x")).toHaveLength(0);
  });
});

describe("girar em conjunto", () => {
  const fila = [codigo("a", 10, 50), codigo("b", 60, 50), codigo("c", 110, 50)];

  it("é rígido: dimensões intactas e mesmo ângulo somado", () => {
    const girado = girarConjunto(fila, 90);
    for (const [i, r] of girado.entries()) {
      expect(r.rotacao).toBe(90);
      // A rotação não escala nada: escalar um grupo cisalharia as barras.
      const original = fila[i]!;
      expect(original.comprimento).toBe(40);
      expect(original.altura).toBe(12);
    }
  });

  it("mantém o centro do grupo parado", () => {
    const antes = uniaoDeCaixas(fila.map(caixaEnvolvente))!;
    const depois = uniaoDeCaixas(
      fila.map((c, i) => caixaEnvolvente({ ...c, ...girarConjunto(fila, 90)[i]! }))
    )!;
    expect(antes.x + antes.largura / 2).toBeCloseTo(depois.x + depois.largura / 2, 1);
    expect(antes.y + antes.altura / 2).toBeCloseTo(depois.y + depois.altura / 2, 1);
  });

  it("quatro voltas de 90° voltam ao início", () => {
    let atual = fila;
    for (let i = 0; i < 4; i++) {
      const r = girarConjunto(atual, 90);
      atual = atual.map((c, j) => ({ ...c, ...r[j]! }));
    }
    for (const [i, c] of atual.entries()) {
      expect(c.x).toBeCloseTo(fila[i]!.x, 1);
      expect(c.y).toBeCloseTo(fila[i]!.y, 1);
      expect(c.rotacao).toBe(0);
    }
  });
});

describe("seleção por área", () => {
  it("pega quem toca, não só quem está contido", () => {
    expect(interseccionam(caixa(0, 0, 10, 10), caixa(5, 5, 10, 10))).toBe(true);
    expect(interseccionam(caixa(0, 0, 100, 100), caixa(40, 40, 5, 5))).toBe(true);
  });

  it("encostar não é tocar", () => {
    expect(interseccionam(caixa(0, 0, 10, 10), caixa(10, 0, 10, 10))).toBe(false);
    expect(interseccionam(caixa(0, 0, 10, 10), caixa(50, 50, 10, 10))).toBe(false);
  });

  it("vale para laçada começada fora do papel, em milímetro negativo", () => {
    // A mesa em volta da folha faz parte da área de trabalho: arrastar de fora
    // para dentro tem de pegar o que a laçada toca. Como o ponteiro vira
    // milímetro pela matriz do SVG, fora do papel é coordenada negativa — e
    // nenhuma conta aqui pode supor que a origem seja zero.
    expect(interseccionam(caixa(-30, -20, 60, 60), caixa(20, 20, 50, 14))).toBe(true);
    expect(interseccionam(caixa(-30, -20, 40, 30), caixa(20, 20, 50, 14))).toBe(false);
  });
});
