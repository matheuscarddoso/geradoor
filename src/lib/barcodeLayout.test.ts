/**
 * O modelo da folha: validação, migração e limites.
 *
 * O normalizador é a fronteira de dado não confiável — arquivo do operador ou
 * `localStorage` de uma versão anterior. Ele não recusa: coage cada campo e
 * segue, porque um JSON com um campo estranho ainda carrega o trabalho de meia
 * hora de quem montou a folha.
 */

import { describe, expect, it } from "vitest";
import {
  ARTE_PADRAO,
  avaliarFaixa,
  avaliarLayout,
  caixaEnvolvente,
  estimarBytesDaArte,
  estimarTamanho,
  LIMITES,
  layoutRoe01,
  moduloEmMm,
  normalizarAngulo,
  normalizarLayout,
} from "@/lib/barcodeLayout";
import { MODULO_MINIMO_MM } from "@/lib/code128";

describe("o preset do formulário", () => {
  it("põe os quinze códigos nas medidas levantadas no impresso", () => {
    const l = layoutRoe01();
    expect(l.codigos).toHaveLength(15);
    // Estas três posições foram medidas no FORM ROE 01 e não podem andar.
    const esperado = [
      [178.27, 28.18],
      [184.81, 169.54],
      [184.81, 201.39],
    ];
    for (const [i, [x, y]] of esperado.entries()) {
      const caixa = caixaEnvolvente(l.codigos[i]!);
      expect(caixa.x).toBeCloseTo(x!, 2);
      expect(caixa.y).toBeCloseTo(y!, 2);
    }
  });

  it("não gera aviso nenhum", () => {
    expect(avaliarLayout(layoutRoe01())).toEqual([]);
  });

  it("fica com módulo de 0,2626 mm — no limite da norma, e conhecido", () => {
    // Está acima do mínimo, mas sem margem: é o que justifica manter tudo em
    // ponto flutuante até o PDF.
    const modulo = moduloEmMm(17.86, 6);
    expect(modulo).toBeCloseTo(0.2626, 4);
    expect(modulo).toBeGreaterThan(MODULO_MINIMO_MM);
  });
});

describe("normalizar dado de fora", () => {
  it("coage valor hostil em vez de recusar o arquivo", () => {
    const l = normalizarLayout({
      pagina: { largura: "abc", altura: Number.NaN },
      digitos: Number.POSITIVE_INFINITY,
      codigos: [{ x: "10", y: null, comprimento: -5, altura: 1e9, rotacao: 45, textoTamanho: 0 }],
    });
    expect(l.pagina.largura).toBe(210);
    expect(l.digitos).toBeLessThanOrEqual(LIMITES.digitos.max);
    const c = l.codigos[0]!;
    expect(c.comprimento).toBe(LIMITES.comprimento.min);
    expect(c.altura).toBe(LIMITES.altura.max);
    expect(c.rotacao).toBe(45);
    expect(c.textoTamanho).toBeGreaterThanOrEqual(3);
  });

  it("põe teto na quantidade de códigos", () => {
    // Um arquivo adulterado com dezenas de milhares de entradas travaria a
    // aba antes de qualquer aviso aparecer.
    const l = normalizarLayout({ codigos: Array.from({ length: 5000 }, () => ({})) });
    expect(l.codigos).toHaveLength(LIMITES.codigosMaximo);
  });

  it("dá padrão à arte quando o arquivo é antigo", () => {
    expect(normalizarLayout({ codigos: [{}] }).arte).toEqual(ARTE_PADRAO);
  });

  it("é idempotente", () => {
    const uma = normalizarLayout(layoutRoe01());
    const duas = normalizarLayout(uma);
    expect(duas.codigos.map((c) => [c.x, c.y])).toEqual(uma.codigos.map((c) => [c.x, c.y]));
  });

  it("migra a versão 1, onde x e y eram o canto da caixa já girada", () => {
    // Sem converter, uma etiqueta deitada reapareceria deslocada em
    // milímetros — em silêncio, que é o pior jeito de errar aqui.
    const v1 = {
      versao: 1,
      pagina: { largura: 218, altura: 238 },
      digitos: 6,
      codigos: [
        { id: "b", x: 22.47, y: 175.65, comprimento: 17.86, altura: 6.55, rotacao: 90 },
      ],
    };
    const caixa = caixaEnvolvente(normalizarLayout(v1).codigos[0]!);
    expect(caixa.x).toBeCloseTo(22.47, 1);
    expect(caixa.y).toBeCloseTo(175.65, 1);
  });
});

describe("avaliar a faixa", () => {
  const l = layoutRoe01();

  it("recusa faixa invertida e número acima do que os dígitos permitem", () => {
    expect(
      avaliarFaixa({ de: 900, ate: 500, paginasPorArquivo: 1000 }, l, 0).some(
        (a) => a.gravidade === "erro"
      )
    ).toBe(true);
    expect(
      avaliarFaixa({ de: 1, ate: 1_000_000, paginasPorArquivo: 1000 }, l, 0).some((a) =>
        /maior número/.test(a.mensagem)
      )
    ).toBe(true);
  });

  it("trava por byte e não por página", () => {
    // Uma página custa de 0,5 KB a vários megabytes conforme a arte: contar
    // página mediria a coisa errada.
    const arteGrande = 20 * 1024 * 1024;
    const bloqueada = avaliarFaixa({ de: 1, ate: 1000, paginasPorArquivo: 1 }, l, arteGrande);
    expect(bloqueada.some((a) => a.gravidade === "erro")).toBe(true);
    const liberada = avaliarFaixa({ de: 1, ate: 1000, paginasPorArquivo: 1000 }, l, 0);
    expect(liberada.filter((a) => a.gravidade === "erro")).toHaveLength(0);
  });

  it("aceita faixa de uma página só", () => {
    expect(
      avaliarFaixa({ de: 4501, ate: 4501, paginasPorArquivo: 1000 }, l, 0).filter(
        (a) => a.gravidade === "erro"
      )
    ).toHaveLength(0);
  });
});

describe("estimativa de tamanho", () => {
  it("conta a arte uma vez por arquivo, e nada quando ela está escondida", () => {
    const l = layoutRoe01();
    const faixa = { de: 1, ate: 1000, paginasPorArquivo: 100 };
    const arte = 2_200_000;
    const visivel = estimarTamanho(l, faixa, arte);
    const escondida = estimarTamanho({ ...l, arte: { opacidade: 1, visivel: false } }, faixa, arte);
    expect(visivel.daArte).toBeCloseTo(arte * 10, 0);
    expect(escondida.daArte).toBe(0);
    expect(escondida.total).toBeLessThan(visivel.total);
  });

  it("estima PNG pelos pixels, não pelo tamanho do arquivo", () => {
    // O jspdf guarda o PNG como bitmap: uma miniatura de 12 KB com muitos
    // pixels sai maior que uma foto de 400 KB.
    const grande = estimarBytesDaArte({
      dataUrl: "data:image/png;base64,AAAA",
      formato: "PNG",
      largura: 2000,
      altura: 2000,
    });
    expect(grande).toBe(2000 * 2000 * 4);
  });
});

describe("normalizar ângulo", () => {
  it("gira para dentro de [0, 360) e limpa resíduo de ponto flutuante", () => {
    expect(normalizarAngulo(-45)).toBe(315);
    expect(normalizarAngulo(720)).toBe(0);
    // 89,9999997 tem de virar 90 para cair no caminho rápido do PDF.
    expect(normalizarAngulo(89.9999997)).toBe(90);
  });
});
