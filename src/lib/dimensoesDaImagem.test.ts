/**
 * O leitor de cabeçalho, contra arquivos de verdade.
 *
 * Os arquivos são gerados aqui com a mesma biblioteca que o resto do projeto
 * usa para imagens em teste, e conferidos contra as dimensões pedidas: é o que
 * garante que o número lido sem decodificar é o mesmo que o decodificador
 * encontraria.
 */
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { BYTES_DO_CABECALHO, dimensoesDoCabecalho, dimensoesNaTela } from "./dimensoesDaImagem";

const LARGURA = 613;
const ALTURA = 409;

function fonte(largura = LARGURA, altura = ALTURA) {
  return sharp({
    create: { width: largura, height: altura, channels: 3, background: { r: 200, g: 80, b: 40 } },
  }).composite([
    {
      input: Buffer.from(
        `<svg width="${largura}" height="${altura}"><circle cx="${largura / 2}" cy="${altura / 2}" r="${altura / 3}" fill="#123"/></svg>`
      ),
      top: 0,
      left: 0,
    },
  ]);
}

const arquivos: Record<string, Buffer> = {};

beforeAll(async () => {
  arquivos.png = await fonte().png().toBuffer();
  arquivos.jpeg = await fonte().jpeg({ quality: 80 }).toBuffer();
  arquivos.jpegProgressivo = await fonte().jpeg({ progressive: true }).toBuffer();
  arquivos.webp = await fonte().webp().toBuffer();
  arquivos.webpSemPerdas = await fonte().webp({ lossless: true }).toBuffer();
  arquivos.avif = await fonte().avif({ quality: 50 }).toBuffer();
  arquivos.png16 = await fonte(60, 40).png().toBuffer();
});

const comoArrayBuffer = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

describe("dimensões pelo cabeçalho", () => {
  it("lê PNG, JPEG (inclusive progressivo), WebP com e sem perdas, e AVIF", () => {
    for (const nome of ["png", "jpeg", "jpegProgressivo", "webp", "webpSemPerdas", "avif"]) {
      const lidas = dimensoesDoCabecalho(comoArrayBuffer(arquivos[nome]));
      expect(lidas, nome).not.toBeNull();
      expect([nome, lidas!.largura, lidas!.altura]).toEqual([nome, LARGURA, ALTURA]);
    }
  });

  it("basta o começo do arquivo", () => {
    const pedaco = arquivos.jpeg.subarray(0, Math.min(BYTES_DO_CABECALHO, arquivos.jpeg.length));
    expect(dimensoesDoCabecalho(comoArrayBuffer(Buffer.from(pedaco)))?.largura).toBe(LARGURA);
  });

  it("devolve nulo para arquivo que não é imagem, vazio ou truncado", () => {
    expect(dimensoesDoCabecalho(comoArrayBuffer(Buffer.from("isto não é uma imagem, é um texto")))).toBeNull();
    expect(dimensoesDoCabecalho(new ArrayBuffer(0))).toBeNull();
    expect(dimensoesDoCabecalho(comoArrayBuffer(Buffer.from(arquivos.png.subarray(0, 12))))).toBeNull();
  });

  it("lê a orientação do EXIF e troca os lados quando a imagem está girada", async () => {
    const deitada = await fonte().withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const lidas = dimensoesDoCabecalho(comoArrayBuffer(deitada));
    expect(lidas?.orientacao).toBe(6);
    // No arquivo, os lados são os originais; na tela, trocados.
    expect([lidas?.largura, lidas?.altura]).toEqual([LARGURA, ALTURA]);
    const naTela = await dimensoesNaTela(new Blob([new Uint8Array(deitada)]));
    expect(naTela).toEqual({ largura: ALTURA, altura: LARGURA });
  });

  it("orientação de pé não troca os lados", async () => {
    const emPe = await fonte().withMetadata({ orientation: 1 }).jpeg().toBuffer();
    expect(await dimensoesNaTela(new Blob([new Uint8Array(emPe)]))).toEqual({ largura: LARGURA, altura: ALTURA });
  });

  it("dimensoesNaTela devolve nulo quando não reconhece o formato", async () => {
    expect(await dimensoesNaTela(new Blob(["nada disso é imagem"]))).toBeNull();
  });

  it("bate com o que o decodificador encontra", async () => {
    for (const nome of ["png", "jpeg", "webp", "avif", "png16"]) {
      const meta = await sharp(arquivos[nome]).metadata();
      const naTela = await dimensoesNaTela(new Blob([new Uint8Array(arquivos[nome])]));
      expect([nome, naTela?.largura, naTela?.altura]).toEqual([nome, meta.width, meta.height]);
    }
  });
});
