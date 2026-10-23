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
  /**
   * Largura do arquivo em px, antes da amostragem do PNG. Sem ela vale a
   * largura na tela — o que amarra a resolução do arquivo ao layout do modal.
   */
  width?: number;
}

/**
 * Baixa o QR Code no formato pedido.
 * Lança QrDownloadError com mensagem exibível ao usuário.
 */
export async function downloadQrCode({
  element,
  format,
  filename = "qrcode",
  width,
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

  // As dimensões saem do próprio SVG, não de constante: as telas renderizam
  // em tamanhos diferentes e a margem entra no viewBox. A proporção também:
  // o código do Instagram leva o @ embaixo e não é quadrado.
  const rendered = element.getBoundingClientRect();
  const viewBox = element instanceof SVGSVGElement ? element.viewBox.baseVal : null;
  const ratio =
    viewBox && viewBox.width > 0
      ? viewBox.height / viewBox.width
      : rendered.width > 0
        ? rendered.height / rendered.width
        : 1;
  const drawWidth = width ?? (Math.round(rendered.width) || 200);
  const drawHeight = Math.round(drawWidth * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = drawWidth * DEFAULT_SCALE;
  canvas.height = drawHeight * DEFAULT_SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new QrDownloadError("Seu navegador não suporta canvas 2D");

  const image = await loadImage(svgToDataUrl(markup));
  ctx.scale(DEFAULT_SCALE, DEFAULT_SCALE);
  ctx.drawImage(image, 0, 0, drawWidth, drawHeight);

  if (format === "png") {
    triggerDownload(await toBlob(canvas), `${filename}.png`);
    return;
  }

  // PDF entra por import dinâmico: jspdf pesa e só é usado aqui.
  // Export nomeado, que é a API documentada e tem o mesmo formato em toda
  // condição de resolução do pacote (browser, node, bundler). O `default`
  // funciona no browser, mas não é o construtor em todas elas.
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const margin = 15;
  // Cabe na A4 com a margem dos dois lados, na largura e na altura.
  const pdfWidth = Math.min(210 - margin * 2, (297 - margin * 2) / ratio);
  const pdfHeight = pdfWidth * ratio;
  pdf.addImage(
    canvas.toDataURL("image/png"),
    "PNG",
    (210 - pdfWidth) / 2, // centraliza na largura A4
    margin,
    pdfWidth,
    pdfHeight,
    undefined,
    // Sem isso o jspdf grava os pixels crus: 1200 × 1332 viram 4,8 MB.
    "FAST"
  );
  pdf.save(`${filename}.pdf`);
}
