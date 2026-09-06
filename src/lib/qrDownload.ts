/**
 * Download do QR Code em PNG, PDF ou SVG.
 *
 * Implementação única para as duas telas que geram código. Antes cada uma
 * tinha a sua: /qr-code com os três formatos e /whatsapp só com PNG, e as
 * duas repetiam a mesma serialização de SVG.
 */

export type QrFormat = "png" | "pdf" | "svg";

export class QrDownloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QrDownloadError";
  }
}

/** Fator de amostragem do PNG. 4x cobre impressão sem inflar o arquivo. */
const DEFAULT_SCALE = 4;

function triggerDownload(blobOrUrl: Blob | string, filename: string) {
  const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  if (typeof blobOrUrl !== "string") URL.revokeObjectURL(url);
}

/**
 * Serializa o SVG como data URL.
 *
 * `encodeURIComponent` em vez de `btoa`: btoa só aceita Latin-1 e lança
 * InvalidCharacterError em qualquer caractere fora dessa faixa. Hoje o SVG do
 * QR é ASCII, mas com logo embutido ou título acentuado deixa de ser.
 */
function svgToDataUrl(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new QrDownloadError("Não foi possível renderizar o QR Code"));
    image.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new QrDownloadError("Não foi possível gerar o arquivo"));
    }, "image/png");
  });
}

interface DownloadOptions {
  /** O elemento <svg> do QR Code já renderizado na tela. */
  element: SVGElement | null;
  format: QrFormat;
  /** Nome do arquivo, sem extensão. */
  filename?: string;
}

/**
 * Baixa o QR Code no formato pedido.
 * Lança QrDownloadError com mensagem exibível ao usuário.
 */
export async function downloadQrCode({
  element,
  format,
  filename = "qrcode",
}: DownloadOptions): Promise<void> {
  if (!element) {
    throw new QrDownloadError("QR Code não encontrado");
  }

  const markup = new XMLSerializer().serializeToString(element);

  if (format === "svg") {
    triggerDownload(
      new Blob([markup], { type: "image/svg+xml;charset=utf-8" }),
      `${filename}.svg`
    );
    return;
  }

  // As dimensões saem do próprio SVG, não de constante: as duas telas
  // renderizam em tamanhos diferentes e a margem entra no viewBox.
  const rendered = element.getBoundingClientRect();
  const size = Math.round(rendered.width) || 200;

  const canvas = document.createElement("canvas");
  canvas.width = size * DEFAULT_SCALE;
  canvas.height = size * DEFAULT_SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new QrDownloadError("Seu navegador não suporta canvas 2D");

  const image = await loadImage(svgToDataUrl(markup));
  ctx.scale(DEFAULT_SCALE, DEFAULT_SCALE);
  ctx.drawImage(image, 0, 0, size, size);

  if (format === "png") {
    triggerDownload(await toBlob(canvas), `${filename}.png`);
    return;
  }

  // PDF entra por import dinâmico: jspdf pesa e só é usado aqui.
  const { default: JsPDF } = await import("jspdf");
  const pdf = new JsPDF();
  const side = 180;
  const offset = (210 - side) / 2; // centraliza na largura A4
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", offset, offset, side, side);
  pdf.save(`${filename}.pdf`);
}
