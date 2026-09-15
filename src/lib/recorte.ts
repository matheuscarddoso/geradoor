import { aplicarMascaraComCorDaFrente } from "./primeiroPlano";
import { ampliarAlfa, dimensoesDaPrevia } from "./removedorDeFundo";

type FonteDeMascara = ImageBitmap | OffscreenCanvas;

/**
 * Aplica uma máscara à imagem em resolução cheia. Usado pelos dois workers do
 * removedor: o que recebe a máscara pronta da Cloudflare e o do modo leve.
 *
 * O PNG final tem exatamente a resolução da imagem recebida, e os pixels
 * opacos saem com a cor exata da entrada: só as bordas semitransparentes são
 * tocadas, para tirar a cor do fundo que vazou para elas (ver primeiroPlano.ts).
 *
 * Memória, numa foto de 21 MP: o alfa é ampliado direto num buffer de um byte
 * por pixel (21 MB), e não num canvas RGBA do tamanho da foto (85 MB); sobram
 * o canvas da foto e a leitura dos pixels dele, que não têm como não existir.
 *
 * Devolve também uma prévia de até 2560 px para a tela. Uma caixa de 1280 px
 * numa tela 2x não mostra mais que isso, e decodificar o PNG de 21 MP inteiro
 * só para exibir custaria outros 85 MB por imagem na página.
 */
export async function recortar(imagem: ImageBitmap, mascara: FonteDeMascara): Promise<{ recorte: Blob; previa: Blob }> {
  const { width: largura, height: altura } = imagem;

  // Alfa da máscara no tamanho dela, que é pequeno.
  const canvasDaMascara = new OffscreenCanvas(mascara.width, mascara.height);
  const ctxDaMascara = canvasDaMascara.getContext("2d", { willReadFrequently: true });
  if (!ctxDaMascara) throw new Error("Canvas 2D indisponível no worker");
  ctxDaMascara.drawImage(mascara, 0, 0);
  const pixelsDaMascara = ctxDaMascara.getImageData(0, 0, mascara.width, mascara.height).data;
  const alfaDaMascara = new Uint8Array(mascara.width * mascara.height);
  for (let i = 0; i < alfaDaMascara.length; i++) alfaDaMascara[i] = pixelsDaMascara[i * 4 + 3];
  canvasDaMascara.width = canvasDaMascara.height = 0;

  const alfa = ampliarAlfa(
    alfaDaMascara,
    { largura: mascara.width, altura: mascara.height },
    { largura, altura }
  );

  const canvas = new OffscreenCanvas(largura, altura);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D indisponível no worker");
  ctx.drawImage(imagem, 0, 0);
  const pixels = ctx.getImageData(0, 0, largura, altura);
  aplicarMascaraComCorDaFrente(pixels.data, alfa, { largura, altura });
  ctx.putImageData(pixels, 0, 0);

  const recorte = await canvas.convertToBlob({ type: "image/png" });

  const tamanhoDaPrevia = dimensoesDaPrevia({ largura, altura });
  let previa = recorte;
  if (tamanhoDaPrevia.largura !== largura || tamanhoDaPrevia.altura !== altura) {
    const canvasDaPrevia = new OffscreenCanvas(tamanhoDaPrevia.largura, tamanhoDaPrevia.altura);
    const ctxDaPrevia = canvasDaPrevia.getContext("2d");
    if (ctxDaPrevia) {
      ctxDaPrevia.imageSmoothingQuality = "high";
      ctxDaPrevia.drawImage(canvas, 0, 0, tamanhoDaPrevia.largura, tamanhoDaPrevia.altura);
      previa = await canvasDaPrevia.convertToBlob({ type: "image/png" });
      canvasDaPrevia.width = canvasDaPrevia.height = 0;
    }
  }

  // Devolve a memória do canvas já, sem esperar o coletor.
  canvas.width = canvas.height = 0;
  return { recorte, previa };
}
