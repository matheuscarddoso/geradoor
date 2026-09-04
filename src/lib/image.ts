/**
 * Normalização de imagem de logo para embutir no QR Code.
 *
 * Todo upload é convertido para um data URL PNG por três motivos:
 *
 * 1. O export para PNG/PDF desenha o SVG do QR num <canvas>. Referência
 *    externa tainta o canvas e faz toDataURL() lançar SecurityError; data URL
 *    não taint a.
 * 2. downloadQRCode() serializa o SVG e passa por btoa(), que só aceita
 *    Latin-1. Base64 é Latin-1 por construção, então o data URL sempre passa.
 * 3. Normaliza SVG, WebP e JPEG num formato único, com dimensão limitada.
 */

export const ACCEPTED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;

/** 4 MB. Acima disso o data URL resultante deixa a serialização do SVG lenta. */
export const MAX_LOGO_BYTES = 4 * 1024 * 1024;

/** O logo nunca é exibido acima de ~30% de um QR de 180px. 512 cobre retina. */
const MAX_DIMENSION = 512;

/** Lado da placa branca gerada. Múltiplo de 2 para centralizar sem subpixel. */
const PLATE_SIZE = 256;

/**
 * Desenha a imagem centralizada sobre uma placa branca arredondada.
 *
 * `excavate` do qrcode.react limpa módulos INTEIROS, então a área branca do
 * código cresce em degraus de um módulo enquanto o logo escala continuamente —
 * durante o arraste do slider os dois desencontram e parece defeito. Pintando
 * a mesma área de branco dentro da própria imagem, o degrau vira
 * branco-sobre-branco e deixa de ser visível.
 */
function drawOnPlate(
  image: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = PLATE_SIZE;
  canvas.height = PLATE_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LogoImageError("Seu navegador não suporta canvas 2D");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, PLATE_SIZE, PLATE_SIZE);

  // Respiro entre a marca e a borda da placa.
  const inner = PLATE_SIZE * 0.72;
  const scale = Math.min(inner / naturalWidth, inner / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;

  ctx.drawImage(
    image,
    (PLATE_SIZE - width) / 2,
    (PLATE_SIZE - height) / 2,
    width,
    height
  );

  return canvas;
}

export class LogoImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LogoImageError";
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new LogoImageError("Não foi possível ler o arquivo"));
    };
    reader.onerror = () =>
      reject(new LogoImageError("Falha ao ler o arquivo do disco"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new LogoImageError("Arquivo não parece ser uma imagem válida"));
    img.src = src;
  });
}

/**
 * Rasteriza markup SVG para data URL PNG.
 *
 * Necessário para os presets: um <image href="data:image/svg+xml,..."> dentro
 * do SVG do QR não carrega quando esse SVG é lido como imagem por um <img>,
 * que é exatamente o que o export para PNG/PDF faz. PNG sempre carrega.
 */
export async function rasterizeSvgMarkup(
  markup: string,
  size = 256
): Promise<string> {
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  const image = await loadImage(source);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new LogoImageError("Seu navegador não suporta canvas 2D");

  ctx.drawImage(image, 0, 0, size, size);
  return canvas.toDataURL("image/png");
}

/**
 * Converte o arquivo em data URL PNG, preservando proporção e transparência.
 * Lança LogoImageError com mensagem exibível ao usuário.
 */
export async function normalizeLogo(file: File): Promise<string> {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type as (typeof ACCEPTED_LOGO_TYPES)[number])) {
    throw new LogoImageError("Use PNG, JPG, WEBP ou SVG");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new LogoImageError("A imagem precisa ter menos de 4 MB");
  }

  const dataUrl = await readAsDataUrl(file);
  const image = await loadImage(dataUrl);

  // SVG sem width/height intrínsecos chega com naturalWidth 0.
  const naturalWidth = image.naturalWidth || MAX_DIMENSION;
  const naturalHeight = image.naturalHeight || MAX_DIMENSION;

  const canvas = drawOnPlate(image, naturalWidth, naturalHeight);

  try {
    return canvas.toDataURL("image/png");
  } catch (error) {
    // SecurityError acontece se a imagem tiver taintado o canvas.
    throw new LogoImageError(
      error instanceof Error && error.name === "SecurityError"
        ? "Esta imagem não pode ser processada pelo navegador"
        : "Não foi possível converter a imagem"
    );
  }
}
