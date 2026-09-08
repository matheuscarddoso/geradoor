/**
 * Lê o PDF gerado de volta e reconstrói as barras a partir dos operadores de
 * desenho.
 *
 * É o teste que existe porque o erro que passou por aqui não aparecia na tela:
 * a 90° as barras saíam no sentido oposto ao que o modelo declarava, e o
 * símbolo continuava parecendo um código de barras válido — só valia outro
 * número. Nenhuma inspeção visual pega isso; comparar a geometria do PDF com
 * a codificação, pega.
 *
 * Não usa rasterizador nem binário externo de propósito: `inflateSync` do
 * fflate, que já é dependência, deixa o teste rodar em qualquer máquina e a
 * cada mudança.
 */

import { encode } from "fast-png";
import { inflateSync, unzlibSync } from "fflate";
import { describe, expect, it } from "vitest";
import { FONTE_PADRAO } from "@/lib/fontes";
import { barrasNormalizadas, codificarCode128 } from "@/lib/code128";
import {
  ARTE_PADRAO,
  centroDoCodigo,
  girarPonto,
  layoutRoe01,
  novoId,
  PT_POR_MM,
  type Codigo,
  type Layout,
} from "@/lib/barcodeLayout";
import { FaixaInvalidaError, gerarAmostra, gerarPdfs } from "@/lib/barcodePdf";

const bytesDoPdf = async (blob: Blob) => new Uint8Array(await blob.arrayBuffer());

/**
 * Extrai e descomprime o fluxo de conteúdo da primeira página.
 *
 * O PDF sai comprimido em produção, e é justamente essa saída que interessa
 * conferir — gerar sem compressão testaria um caminho que ninguém usa.
 */
function fluxoDeConteudo(pdf: Uint8Array): string {
  const texto = new TextDecoder("latin1").decode(pdf);
  // Varre todo bloco `stream`/`endstream` e tenta descomprimir: depender da
  // ordem das chaves do dicionário deixaria o teste refém do formatador do
  // jspdf, que não é contrato.
  let cursor = 0;
  for (;;) {
    const abre = texto.indexOf("stream", cursor);
    if (abre < 0) break;
    const fecha = texto.indexOf("endstream", abre);
    if (fecha < 0) break;
    cursor = fecha + 1;

    // Pula a quebra de linha que separa `stream` do conteúdo.
    let inicio = abre + "stream".length;
    if (texto[inicio] === "\r") inicio++;
    if (texto[inicio] === "\n") inicio++;
    let fim = fecha;
    if (texto[fim - 1] === "\n") fim--;
    if (texto[fim - 1] === "\r") fim--;

    try {
      // O jspdf grava zlib (cabeçalho 0x78 0x9c), não deflate cru; a segunda
      // tentativa cobre quem gravar sem envelope.
      const cru = pdf.subarray(inicio, fim);
      let bruto: Uint8Array;
      try {
        bruto = unzlibSync(cru);
      } catch {
        bruto = inflateSync(cru);
      }
      const conteudo = new TextDecoder("latin1").decode(bruto);
      // A página é o fluxo que preenche retângulos.
      if (/\d\s+re\s/.test(conteudo) && /\bf\b/.test(conteudo)) return conteudo;
    } catch {
      // Fonte, imagem ou fluxo não comprimido: segue procurando.
    }
  }
  throw new Error("não achei o fluxo de conteúdo da página");
}

/** Uma forma preenchida do fluxo, pelos cantos, em mm com y para baixo. */
type Forma = ReadonlyArray<{ x: number; y: number }>;

/**
 * Toda forma preenchida da página, em milímetros.
 *
 * São duas gramáticas: em ângulo reto as barras saem como `re`, e em ângulo
 * livre como polígono de quatro vértices (`m`/`l`/`h`). O teste tem de ler as
 * duas, senão metade dos ângulos passaria sem ser conferida — que foi
 * exatamente o que aconteceu na primeira versão deste arquivo.
 */
function formas(conteudo: string, alturaDaPagina: number): Forma[] {
  const paraMm = (x: number, y: number) => ({
    x: x / PT_POR_MM,
    // O PDF conta y de baixo para cima; o modelo, de cima para baixo.
    y: alturaDaPagina - y / PT_POR_MM,
  });
  const achadas: Forma[] = [];

  // Retângulos. O jspdf emite altura negativa no modo de compatibilidade, e
  // aí o `y` do operador já é a borda de cima.
  const reRect = /(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+re\s*\n?f/g;
  for (let m = reRect.exec(conteudo); m; m = reRect.exec(conteudo)) {
    const [x, y, largura, altura] = m.slice(1, 5).map(Number) as [number, number, number, number];
    const y0 = Math.min(y, y + altura);
    const y1 = Math.max(y, y + altura);
    const x0 = Math.min(x, x + largura);
    const x1 = Math.max(x, x + largura);
    achadas.push([paraMm(x0, y0), paraMm(x1, y0), paraMm(x1, y1), paraMm(x0, y1)]);
  }

  // Polígonos fechados e preenchidos.
  const rePoly = /(-?[\d.]+)\s+(-?[\d.]+)\s+m\s+((?:-?[\d.]+\s+-?[\d.]+\s+l\s+)+)h\s*\n?f/g;
  for (let m = rePoly.exec(conteudo); m; m = rePoly.exec(conteudo)) {
    const cantos = [paraMm(Number(m[1]), Number(m[2]))];
    const reL = /(-?[\d.]+)\s+(-?[\d.]+)\s+l/g;
    for (let l = reL.exec(m[3]!); l; l = reL.exec(m[3]!)) {
      cantos.push(paraMm(Number(l[1]), Number(l[2])));
    }
    achadas.push(cantos);
  }

  return achadas;
}

/**
 * Reconstrói as larguras de elemento, em módulos, varrendo o eixo de leitura.
 *
 * Devolve barra e espaço alternados a partir de uma barra — a mesma forma que
 * `codificarCode128` produz, para os dois poderem ser comparados diretamente.
 *
 * Trabalha no referencial local do código: gira cada canto de volta e mede.
 * Assim a mesma conta serve para 0° e para 137°, e a filtragem pela faixa
 * perpendicular é o que descarta a régua de calibração e os outros códigos da
 * folha.
 */
function elementosLidos(codigo: Codigo, todas: readonly Forma[]): number[] {
  const centro = centroDoCodigo(codigo);
  const local = (ponto: { x: number; y: number }) => {
    const p = girarPonto(ponto, centro, -codigo.rotacao);
    return { t: p.x - codigo.x, s: p.y - codigo.y };
  };

  const folga = 0.5;
  const barras = todas
    .map((forma) => {
      const pontos = forma.map(local);
      const ts = pontos.map((p) => p.t);
      const ss = pontos.map((p) => p.s);
      return {
        t0: Math.min(...ts),
        t1: Math.max(...ts),
        s0: Math.min(...ss),
        s1: Math.max(...ss),
      };
    })
    .filter(
      (b) =>
        b.t0 > -folga &&
        b.t1 < codigo.comprimento + folga &&
        b.s0 > -folga &&
        b.s1 < codigo.altura + folga
    )
    .sort((a, b) => a.t0 - b.t0);

  const modulo = codigo.comprimento / codificarCode128("000000").modulos;
  const elementos: number[] = [];
  let cursor = 0;
  for (const barra of barras) {
    if (elementos.length > 0) elementos.push(Math.round((barra.t0 - cursor) / modulo));
    elementos.push(Math.round((barra.t1 - barra.t0) / modulo));
    cursor = barra.t1;
  }
  return elementos;
}

const semTexto = (codigo: Codigo): Codigo => ({ ...codigo, texto: false });

function folhaDeUmCodigo(rotacao: number): Layout {
  return {
    versao: 2,
    pagina: { largura: 120, altura: 120 },
    digitos: 6,
    arte: ARTE_PADRAO,
    codigos: [
      semTexto({
        id: novoId(),
        x: 35,
        y: 50,
        comprimento: 45,
        altura: 14,
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
      }),
    ],
  };
}

describe("as barras no PDF batem com a codificação", () => {
  // Os quatro ângulos retos usam o caminho de `rect`; os livres, o de
  // quadrilátero. Os dois têm de chegar no mesmo símbolo.
  for (const rotacao of [0, 90, 180, 270, 30, 45, 137, 315]) {
    it(`a ${rotacao}°`, async () => {
      const layout = folhaDeUmCodigo(rotacao);
      const codigo = layout.codigos[0]!;
      const pdf = await bytesDoPdf(await gerarAmostra(layout, 4501, null));
      const lido = elementosLidos(
        codigo,
        formas(fluxoDeConteudo(pdf), layout.pagina.altura)
      );
      const esperado = codificarCode128("004501").elementos;

      expect(lido).toEqual(esperado);
    });
  }

  it("o formulário inteiro, com os quinze códigos", async () => {
    const layout = { ...layoutRoe01(), codigos: layoutRoe01().codigos.map(semTexto) };
    const pdf = await bytesDoPdf(await gerarAmostra(layout, 4501, null));
    const todas = formas(fluxoDeConteudo(pdf), layout.pagina.altura);
    const esperado = codificarCode128("004501").elementos;

    for (const codigo of layout.codigos) {
      expect(elementosLidos(codigo, todas)).toEqual(esperado);
    }
  });

  it("mantém a espessura da barra em ponto flutuante", async () => {
    // Arredondar a largura para inteiro engorda uma barra em quase 20% e o
    // leitor recusa. O teste exige pelo menos três casas de precisão.
    const layout = folhaDeUmCodigo(0);
    const codigo = layout.codigos[0]!;
    const pdf = await bytesDoPdf(await gerarAmostra(layout, 4501, null));
    const todas = formas(fluxoDeConteudo(pdf), layout.pagina.altura);
    const modulo = codigo.comprimento / 68;
    const barras = barrasNormalizadas(codificarCode128("004501"));
    const larguras = todas
      .filter((f) => f.every((p) => p.y > codigo.y - 0.5 && p.y < codigo.y + codigo.altura + 0.5))
      .map((f) => Math.max(...f.map((p) => p.x)) - Math.min(...f.map((p) => p.x)))
      .sort((a, b) => a - b);
    const esperadas = barras
      .map((b) => b.largura * codigo.comprimento)
      .sort((a, b) => a - b);

    expect(larguras).toHaveLength(esperadas.length);
    for (const [i, esperada] of esperadas.entries()) {
      expect(larguras[i]!).toBeCloseTo(esperada, 3);
    }
    expect(modulo).toBeCloseTo(0.6617, 3);
  });
});

describe("faixa e arquivos", () => {
  const faixa = (de: number, ate: number, paginasPorArquivo = 1000) => ({
    de,
    ate,
    paginasPorArquivo,
  });

  it("recusa faixa vazia, sem código e sem página por arquivo", async () => {
    const layout = folhaDeUmCodigo(0);
    await expect(
      gerarPdfs({ layout, faixa: faixa(10, 5), fundo: null })
    ).rejects.toThrow(FaixaInvalidaError);
    await expect(
      gerarPdfs({ layout, faixa: faixa(1, 1, 0), fundo: null })
    ).rejects.toThrow(FaixaInvalidaError);
    await expect(
      gerarPdfs({ layout: { ...layout, codigos: [] }, faixa: faixa(1, 1), fundo: null })
    ).rejects.toThrow(FaixaInvalidaError);
  });

  it("quebra em arquivos e devolve um .zip", async () => {
    const resultado = await gerarPdfs({
      layout: folhaDeUmCodigo(0),
      faixa: faixa(1, 25, 10),
      fundo: null,
    });
    expect(resultado.arquivos).toBe(3);
    expect(resultado.nome.endsWith(".zip")).toBe(true);
    expect(resultado.paginas).toBe(25);
  });

  it("cabendo em um arquivo, devolve o PDF direto", async () => {
    const resultado = await gerarPdfs({
      layout: folhaDeUmCodigo(0),
      faixa: faixa(1, 5, 10),
      fundo: null,
    });
    expect(resultado.arquivos).toBe(1);
    expect(resultado.nome).toBe("000001-000005.pdf");
  });

  it("cancela e não devolve arquivo parcial", async () => {
    const controle = new AbortController();
    const promessa = gerarPdfs({
      layout: folhaDeUmCodigo(0),
      faixa: faixa(1, 400, 400),
      fundo: null,
      sinal: controle.signal,
      aoProgredir: (p) => {
        if (p.paginasFeitas >= 25) controle.abort();
      },
    });
    await expect(promessa).rejects.toThrow(/cancel/i);
  });
});

describe("arte de fundo", () => {
  /**
   * Um PNG pequeno mas de verdade, montado aqui.
   *
   * O `jspdf` decodifica a imagem para embutir, então um PNG improvisado à mão
   * não passa — e a imagem tem de ser real para o caminho testado ser o que
   * roda em produção.
   */
  const fundo = {
    dataUrl: (() => {
      const lado = 8;
      const dados = new Uint8Array(lado * lado * 3).fill(200);
      const png = encode({ width: lado, height: lado, data: dados, channels: 3, depth: 8 });
      let bruto = "";
      for (const byte of png) bruto += String.fromCharCode(byte);
      return `data:image/png;base64,${Buffer.from(bruto, "latin1").toString("base64")}`;
    })(),
    formato: "PNG" as const,
  };

  it("entra uma vez por documento, não uma por página", async () => {
    const resultado = await gerarPdfs({
      layout: folhaDeUmCodigo(0),
      faixa: { de: 1, ate: 40, paginasPorArquivo: 40 },
      fundo,
    });
    const texto = new TextDecoder("latin1").decode(await bytesDoPdf(resultado.blob));
    expect(texto.match(/\/Subtype \/Image/g) ?? []).toHaveLength(1);
    expect(texto.match(/\/Type \/Page[^s]/g) ?? []).toHaveLength(40);
  });

  it("escondida, não é embutida", async () => {
    const layout = folhaDeUmCodigo(0);
    const resultado = await gerarPdfs({
      layout: { ...layout, arte: { opacidade: 1, visivel: false } },
      faixa: { de: 1, ate: 1, paginasPorArquivo: 1 },
      fundo,
    });
    const texto = new TextDecoder("latin1").decode(await bytesDoPdf(resultado.blob));
    expect(texto).not.toContain("/Subtype /Image");
  });

  it("com opacidade, isola o estado gráfico para as barras não clarearem", async () => {
    const layout = folhaDeUmCodigo(0);
    const resultado = await gerarPdfs({
      layout: { ...layout, arte: { opacidade: 0.4, visivel: true } },
      faixa: { de: 1, ate: 1, paginasPorArquivo: 1 },
      fundo,
    });
    const conteudo = fluxoDeConteudo(await bytesDoPdf(resultado.blob));
    // O par salvar/restaurar em volta da imagem é o que impede a opacidade de
    // vazar para as barras — barra translúcida é código que o leitor recusa.
    expect(conteudo).toMatch(/q\s/);
    expect(conteudo).toMatch(/\sQ/);
    expect(conteudo.indexOf("Q")).toBeLessThan(conteudo.lastIndexOf("re"));
  });
});

describe("régua de calibração", () => {
  it("só a amostra recebe, e mede exatamente 100 mm", async () => {
    const layout = folhaDeUmCodigo(0);
    const amostra = await bytesDoPdf(await gerarAmostra(layout, 4501, null));
    const largura = (f: Forma) =>
      Math.max(...f.map((p) => p.x)) - Math.min(...f.map((p) => p.x));
    const naAmostra = formas(fluxoDeConteudo(amostra), layout.pagina.altura);
    // A barra da régua é a forma mais larga da página.
    expect(Math.max(...naAmostra.map(largura))).toBeCloseTo(100, 2);

    const producao = await gerarPdfs({
      layout,
      faixa: { de: 4501, ate: 4501, paginasPorArquivo: 1 },
      fundo: null,
    });
    const naProducao = formas(
      fluxoDeConteudo(await bytesDoPdf(producao.blob)),
      layout.pagina.altura
    );
    // Na produção a forma mais larga é uma barra, muito menor que a régua.
    expect(Math.max(...naProducao.map(largura))).toBeLessThan(5);
  });
});
