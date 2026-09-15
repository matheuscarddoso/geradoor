/**
 * Largura e altura de uma imagem lidas do cabeçalho do arquivo, sem decodificar.
 *
 * Serve para pedir ao navegador a imagem **já reduzida**. Sem isto, a única
 * forma de saber o tamanho é decodificar inteiro, e uma foto de 48 MP vira um
 * bitmap de 192 MB antes de qualquer coisa — numa máquina com pouca memória
 * livre, é a alocação que mata a aba.
 *
 * Lê só os primeiros bytes de PNG, JPEG, WebP e AVIF/HEIF, e devolve também a
 * orientação do EXIF, que decide se os dois lados trocam. Formato que não se
 * reconheça devolve nulo, e quem chama decodifica do jeito antigo.
 */

export interface DimensoesDoArquivo {
  largura: number;
  altura: number;
  /**
   * Orientação do EXIF (1 a 8), quando houver. De 5 a 8, a imagem é girada em
   * um quarto de volta, e a largura e a altura do arquivo aparecem trocadas na
   * tela.
   */
  orientacao: number;
}

/** Quantos bytes do começo do arquivo bastam. O EXIF de um JPEG cabe aqui. */
export const BYTES_DO_CABECALHO = 256 * 1024;

const u16 = (v: DataView, p: number, littleEndian = false) => v.getUint16(p, littleEndian);
const u32 = (v: DataView, p: number, littleEndian = false) => v.getUint32(p, littleEndian);

function ehPng(v: DataView) {
  return v.byteLength > 24 && u32(v, 0) === 0x89504e47 && u32(v, 4) === 0x0d0a1a0a;
}

function ehJpeg(v: DataView) {
  return v.byteLength > 4 && u16(v, 0) === 0xffd8;
}

function ehRiffWebp(v: DataView) {
  return v.byteLength > 16 && u32(v, 0) === 0x52494646 && u32(v, 8) === 0x57454250;
}

/**
 * Orientação no EXIF de um JPEG.
 *
 * O EXIF vem num APP1 logo no começo: cabeçalho "Exif\0\0", um TIFF com a
 * ordem dos bytes ("II" ou "MM") e uma lista de campos, um deles o 0x0112.
 */
function orientacaoDoExif(v: DataView, inicio: number, tamanho: number): number {
  if (tamanho < 14 || u32(v, inicio) !== 0x45786966) return 1;
  const tiff = inicio + 6;
  const ordem = u16(v, tiff);
  if (ordem !== 0x4949 && ordem !== 0x4d4d) return 1;
  const little = ordem === 0x4949;
  if (u16(v, tiff + 2, little) !== 42) return 1;
  const ifd = tiff + u32(v, tiff + 4, little);
  if (ifd + 2 > v.byteLength) return 1;
  const campos = u16(v, ifd, little);
  for (let i = 0; i < campos; i++) {
    const campo = ifd + 2 + i * 12;
    if (campo + 12 > v.byteLength) break;
    if (u16(v, campo, little) === 0x0112) {
      const valor = u16(v, campo + 8, little);
      return valor >= 1 && valor <= 8 ? valor : 1;
    }
  }
  return 1;
}

function dimensoesDoJpeg(v: DataView): DimensoesDoArquivo | null {
  let p = 2;
  let orientacao = 1;
  while (p + 4 <= v.byteLength) {
    if (v.getUint8(p) !== 0xff) {
      p++;
      continue;
    }
    const marcador = v.getUint8(p + 1);
    // Marcadores sem tamanho.
    if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) {
      p += 2;
      continue;
    }
    if (marcador === 0xd9 || marcador === 0xda) break;
    const tamanho = u16(v, p + 2);
    if (tamanho < 2) break;
    if (marcador === 0xe1) orientacao = orientacaoDoExif(v, p + 4, tamanho);
    // SOF0–SOF15, menos os que não carregam dimensões (0xc4, 0xc8, 0xcc).
    const ehSof = marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;
    if (ehSof && p + 9 <= v.byteLength) {
      return { altura: u16(v, p + 5), largura: u16(v, p + 7), orientacao };
    }
    p += 2 + tamanho;
  }
  return null;
}

function dimensoesDoWebp(v: DataView): DimensoesDoArquivo | null {
  const formato = u32(v, 12);
  // VP8X: largura e altura menos um, em 24 bits little-endian.
  if (formato === 0x56503858 && v.byteLength > 30) {
    const largura = 1 + (v.getUint8(24) | (v.getUint8(25) << 8) | (v.getUint8(26) << 16));
    const altura = 1 + (v.getUint8(27) | (v.getUint8(28) << 8) | (v.getUint8(29) << 16));
    return { largura, altura, orientacao: 1 };
  }
  // VP8 (com perdas): quadro-chave, dimensões em 14 bits.
  if (formato === 0x56503820 && v.byteLength > 30) {
    return { largura: u16(v, 26, true) & 0x3fff, altura: u16(v, 28, true) & 0x3fff, orientacao: 1 };
  }
  // VP8L (sem perdas): 14 bits cada, empacotados a partir do byte 21.
  if (formato === 0x5650384c && v.byteLength > 25) {
    const bits = u32(v, 21, true);
    return { largura: 1 + (bits & 0x3fff), altura: 1 + ((bits >> 14) & 0x3fff), orientacao: 1 };
  }
  return null;
}

/**
 * AVIF e HEIF: procura a caixa `ispe` (ImageSpatialExtents).
 *
 * Varrer as caixas exigiria entender a hierarquia inteira do formato; como o
 * identificador tem quatro bytes e é seguido de versão e das duas dimensões, a
 * primeira ocorrência dele é a do item principal na prática. Se o arquivo não
 * trouxer nada plausível, devolve nulo e o caminho antigo assume.
 */
function dimensoesDoIsobmff(v: DataView): DimensoesDoArquivo | null {
  const limite = Math.min(v.byteLength - 16, BYTES_DO_CABECALHO);
  for (let p = 0; p < limite; p++) {
    if (u32(v, p) !== 0x69737065) continue;
    const largura = u32(v, p + 8);
    const altura = u32(v, p + 12);
    if (largura > 0 && altura > 0 && largura < 100_000 && altura < 100_000) {
      return { largura, altura, orientacao: 1 };
    }
  }
  return null;
}

/** As dimensões pelo cabeçalho, ou nulo se o formato não for reconhecido. */
export function dimensoesDoCabecalho(bytes: ArrayBuffer): DimensoesDoArquivo | null {
  if (bytes.byteLength < 16) return null;
  const v = new DataView(bytes);
  try {
    if (ehPng(v)) return { largura: u32(v, 16), altura: u32(v, 20), orientacao: 1 };
    if (ehJpeg(v)) return dimensoesDoJpeg(v);
    if (ehRiffWebp(v)) return dimensoesDoWebp(v);
    return dimensoesDoIsobmff(v);
  } catch {
    // Arquivo truncado ou malformado: quem chama decodifica do jeito antigo.
    return null;
  }
}

/**
 * As dimensões como elas aparecem na tela, já com a orientação aplicada, ou
 * nulo.
 */
export async function dimensoesNaTela(arquivo: Blob): Promise<{ largura: number; altura: number } | null> {
  const cabecalho = await arquivo.slice(0, BYTES_DO_CABECALHO).arrayBuffer();
  const lidas = dimensoesDoCabecalho(cabecalho);
  if (!lidas || lidas.largura <= 0 || lidas.altura <= 0) return null;
  const girada = lidas.orientacao >= 5 && lidas.orientacao <= 8;
  return girada
    ? { largura: lidas.altura, altura: lidas.largura }
    : { largura: lidas.largura, altura: lidas.altura };
}
