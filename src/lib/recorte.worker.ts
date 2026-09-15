/**
 * Trabalho de imagem em resolução cheia, fora da thread principal.
 *
 * - `aplicar-mascara`: a Cloudflare recorta uma cópia reduzida da foto, que é
 *   o que vale mandar pela rede; aqui a máscara é ampliada sobre o bitmap
 *   original e o PNG sai no tamanho da foto.
 * - `aplicar-tracos`: os ajustes de pincel são pintados na tela em resolução
 *   de janela; para o download, são repintados aqui sobre o recorte inteiro.
 * - `preparar-regiao` e `selecionar-elemento`: os dois passos locais do pincel
 *   mágico, antes e depois de a região ir à Cloudflare.
 *
 * Worker separado do modo leve de propósito: este não carrega runtime de
 * inferência nenhum, então o caminho normal fica leve do começo ao fim.
 */

import { desenharRecorteEditado } from "./pincelCanvas";
import { elementoDoTraco, ocultarOQueJaFicou } from "./pincelMagico";
import { recortar } from "./recorte";
import type { PedidoDeRecorte, RespostaDeRecorte } from "./removedorDeFundo";

type Pedido<T extends PedidoDeRecorte["tipo"]> = Extract<PedidoDeRecorte, { tipo: T }>;

function enviar(resposta: RespostaDeRecorte) {
  self.postMessage(resposta);
}

/**
 * O original no tamanho em que o recorte foi feito, com a orientação do EXIF.
 *
 * Decodificado sob demanda, e não mantido desde o recorte: ficar com um
 * bitmap de 48 MB vivo só para o caso de alguém pintar custaria memória a
 * todo mundo que só baixa.
 */
function decodificarOriginal(original: Blob, trabalho: { largura: number; altura: number }) {
  return createImageBitmap(original, {
    imageOrientation: "from-image",
    resizeWidth: trabalho.largura,
    resizeHeight: trabalho.altura,
    resizeQuality: "high",
  });
}

/** As máscaras dos traços mágicos, decodificadas. Quem chama fecha os bitmaps. */
async function decodificarMascaras(tracos: Pedido<"aplicar-tracos">["tracos"]) {
  const mascaras = new Map<Blob, ImageBitmap>();
  for (const traco of tracos) {
    if (traco.magia && !mascaras.has(traco.magia.mascara)) {
      mascaras.set(traco.magia.mascara, await createImageBitmap(traco.magia.mascara));
    }
  }
  return mascaras;
}

async function aplicarTracos(pedido: Pedido<"aplicar-tracos">): Promise<Blob> {
  const { largura, altura } = pedido.trabalho;
  const recorte = await createImageBitmap(pedido.recorte);
  const original = await decodificarOriginal(pedido.original, pedido.trabalho);
  const mascaras = await decodificarMascaras(pedido.tracos);
  try {
    const canvas = new OffscreenCanvas(largura, altura);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível no worker");
    desenharRecorteEditado(ctx, recorte, original, pedido.tracos, { largura, altura }, 1, mascaras);
    const png = await canvas.convertToBlob({ type: "image/png" });
    canvas.width = canvas.height = 0;
    return png;
  } finally {
    recorte.close();
    original.close();
    mascaras.forEach((bitmap) => bitmap.close());
  }
}

/**
 * O alfa do recorte como está agora — recorte mais os traços já feitos —,
 * só na região e no tamanho de envio.
 */
async function alfaAtualDaRegiao(
  pedido: Pedido<"preparar-regiao">,
  original: ImageBitmap,
  atual: NonNullable<Pedido<"preparar-regiao">["atual"]>
): Promise<Uint8Array> {
  const { regiao, envio, trabalho } = pedido;
  const recorte = await createImageBitmap(atual.recorte);
  const mascaras = await decodificarMascaras(atual.tracos);
  try {
    const canvas = new OffscreenCanvas(envio.largura, envio.altura);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D indisponível no worker");
    // A mesma função do download, deslocada para a região: o que se oculta é
    // exatamente o que a pessoa vê incluído na tela.
    const escala = envio.largura / regiao.largura;
    ctx.setTransform(1, 0, 0, 1, -regiao.x * escala, -regiao.y * escala);
    desenharRecorteEditado(ctx, recorte, original, atual.tracos, trabalho, escala, mascaras);
    const pixels = ctx.getImageData(0, 0, envio.largura, envio.altura).data;
    const alfa = new Uint8Array(envio.largura * envio.altura);
    for (let i = 0; i < alfa.length; i++) alfa[i] = pixels[i * 4 + 3];
    canvas.width = canvas.height = 0;
    return alfa;
  } finally {
    recorte.close();
    mascaras.forEach((bitmap) => bitmap.close());
  }
}

/** A região da foto que vai à Cloudflare, em JPEG, no tamanho de envio. */
async function prepararRegiao(pedido: Pedido<"preparar-regiao">): Promise<Blob> {
  const original = await decodificarOriginal(pedido.original, pedido.trabalho);
  try {
    const { regiao, envio } = pedido;
    const canvas = new OffscreenCanvas(envio.largura, envio.altura);
    const ctx = canvas.getContext("2d", { willReadFrequently: Boolean(pedido.atual) });
    if (!ctx) throw new Error("Canvas 2D indisponível no worker");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(original, regiao.x, regiao.y, regiao.largura, regiao.altura, 0, 0, envio.largura, envio.altura);

    if (pedido.atual) {
      const alfa = await alfaAtualDaRegiao(pedido, original, pedido.atual);
      const pixels = ctx.getImageData(0, 0, envio.largura, envio.altura);
      ocultarOQueJaFicou(pixels.data, alfa, envio);
      ctx.putImageData(pixels, 0, 0);
    }

    const jpeg = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
    canvas.width = canvas.height = 0;
    return jpeg;
  } finally {
    original.close();
  }
}

/**
 * Da máscara que a Cloudflare devolveu para a região, só o elemento que o
 * traço tocou, como PNG de alfa. Nulo se o traço só passou por fundo.
 */
async function selecionar(pedido: Pedido<"selecionar-elemento">): Promise<Blob | null> {
  const bitmap = await createImageBitmap(pedido.mascara);
  const grade = { largura: bitmap.width, altura: bitmap.height };
  const canvas = new OffscreenCanvas(grade.largura, grade.altura);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D indisponível no worker");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pixels = ctx.getImageData(0, 0, grade.largura, grade.altura);
  const alfa = new Uint8Array(grade.largura * grade.altura);
  for (let i = 0; i < alfa.length; i++) alfa[i] = pixels.data[i * 4 + 3];

  const elemento = elementoDoTraco(alfa, grade, pedido.traco, pedido.regiao, pedido.trabalho);
  if (!elemento) {
    canvas.width = canvas.height = 0;
    return null;
  }

  // Só o alfa importa: a cor da máscara é descartada por quem a desenha.
  for (let i = 0; i < elemento.length; i++) {
    const p = i * 4;
    pixels.data[p] = pixels.data[p + 1] = pixels.data[p + 2] = 0;
    pixels.data[p + 3] = elemento[i];
  }
  ctx.putImageData(pixels, 0, 0);
  const png = await canvas.convertToBlob({ type: "image/png" });
  canvas.width = canvas.height = 0;
  return png;
}

self.addEventListener("message", async (evento: MessageEvent<PedidoDeRecorte>) => {
  const pedido = evento.data;
  if (!pedido) return;

  try {
    switch (pedido.tipo) {
      case "aplicar-tracos":
        enviar({ tipo: "tracos-prontos", id: pedido.id, recorte: await aplicarTracos(pedido) });
        return;
      case "preparar-regiao":
        enviar({ tipo: "regiao-pronta", id: pedido.id, imagem: await prepararRegiao(pedido) });
        return;
      case "selecionar-elemento": {
        const mascara = await selecionar(pedido);
        enviar(mascara ? { tipo: "elemento-pronto", id: pedido.id, mascara } : { tipo: "elemento-vazio", id: pedido.id });
        return;
      }
      case "aplicar-mascara": {
        let mascara: ImageBitmap | null = null;
        try {
          mascara = await createImageBitmap(pedido.mascara);
          const { recorte, previa } = await recortar(pedido.imagem, mascara);
          enviar({ tipo: "pronto", id: pedido.id, recorte, previa });
        } finally {
          mascara?.close();
          pedido.imagem.close();
        }
        return;
      }
    }
  } catch (erro) {
    console.error(`[removedor-de-fundo] ${pedido.tipo}`, erro);
    enviar({ tipo: "erro", id: pedido.id });
  }
});
