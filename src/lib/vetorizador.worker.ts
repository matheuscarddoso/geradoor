/**
 * Worker do vetorizador. Nasce para um pedido e é descartado depois dele.
 *
 * - `preparar`: decodifica o arquivo uma vez e devolve a imagem na resolução
 *   de traçado (até 2 MP) e a prévia de tela. A página guarda esses pixels, e
 *   a foto original não é decodificada de novo a cada ajuste.
 * - `vetorizar`: prepara os pixels, roda o motor e monta o SVG.
 *
 * Descartável de propósito. A memória do WebAssembly só cresce: depois de um
 * traçado de 300 MB, o heap fica com 300 MB até a instância morrer. Com um
 * worker por vetorização, a memória volta ao sistema ao fim de cada uma, e um
 * motor que abortou nunca é reaproveitado.
 */

import { MotorEsgotado, criarMotor } from "./vetorizadorMotor";
import {
  MAX_BYTES_DO_SVG,
  MAX_CAMINHOS,
  ajustarCoresAPaleta,
  dimensoesDaAmostra,
  dimensoesDaPrevia,
  dimensoesDeTracado,
  montarSvg,
  parametrosDoMotor,
  prepararPixels,
  type Dimensoes,
  type PedidoAoVetorizador,
  type RespostaDoVetorizador,
} from "./vetorizador";

type Pedido<T extends PedidoAoVetorizador["tipo"]> = Extract<PedidoAoVetorizador, { tipo: T }>;

function enviar(resposta: RespostaDoVetorizador, transferir: Transferable[] = []) {
  self.postMessage(resposta, { transfer: transferir });
}

function contexto(canvas: OffscreenCanvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D indisponível no worker");
  return ctx;
}

async function preparar(pedido: Pedido<"preparar">) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(pedido.arquivo, { imageOrientation: "from-image" });
  } catch {
    enviar({ tipo: "erro", id: pedido.id, mensagem: "Não foi possível abrir essa imagem" });
    return;
  }
  try {
    const original = { largura: bitmap.width, altura: bitmap.height };
    const tracado = dimensoesDeTracado(original);

    const canvas = new OffscreenCanvas(tracado.largura, tracado.altura);
    const ctx = contexto(canvas);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, tracado.largura, tracado.altura);
    // O ImageData de um canvas nunca é compartilhado; o tipo só não sabe disso.
    const pixels = ctx.getImageData(0, 0, tracado.largura, tracado.altura).data.buffer as ArrayBuffer;
    canvas.width = canvas.height = 0;

    const tamanhoDaPrevia = dimensoesDaPrevia(original);
    let previa: Blob = pedido.arquivo;
    if (tamanhoDaPrevia.largura !== original.largura || tamanhoDaPrevia.altura !== original.altura) {
      const canvasDaPrevia = new OffscreenCanvas(tamanhoDaPrevia.largura, tamanhoDaPrevia.altura);
      const ctxDaPrevia = contexto(canvasDaPrevia);
      ctxDaPrevia.imageSmoothingQuality = "high";
      ctxDaPrevia.drawImage(bitmap, 0, 0, tamanhoDaPrevia.largura, tamanhoDaPrevia.altura);
      previa = await canvasDaPrevia.convertToBlob(
        pedido.arquivo.type === "image/jpeg" ? { type: "image/jpeg", quality: 0.92 } : { type: "image/png" }
      );
      canvasDaPrevia.width = canvasDaPrevia.height = 0;
    }

    enviar({ tipo: "preparada", id: pedido.id, original, tracado, pixels, previa }, [pixels]);
  } finally {
    bitmap.close();
  }
}

/** A referência da fidelidade, reduzida ao tamanho da amostra. */
function amostrar(pixels: Uint8ClampedArray, tracado: Dimensoes): ArrayBuffer {
  const amostra = dimensoesDaAmostra(tracado);
  const origem = new OffscreenCanvas(tracado.largura, tracado.altura);
  contexto(origem).putImageData(new ImageData(pixels, tracado.largura, tracado.altura), 0, 0);
  const destino = new OffscreenCanvas(amostra.largura, amostra.altura);
  const ctx = contexto(destino);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(origem, 0, 0, amostra.largura, amostra.altura);
  const dados = ctx.getImageData(0, 0, amostra.largura, amostra.altura).data.buffer as ArrayBuffer;
  origem.width = origem.height = destino.width = destino.height = 0;
  return dados;
}

async function vetorizar(pedido: Pedido<"vetorizar">) {
  const inicio = performance.now();
  const { tracado, original, ajustes } = pedido;
  // O buffer chegou por cópia: este worker é o dono dele e pode escrever.
  const pixels = new Uint8ClampedArray(pedido.pixels);
  const referencia: { pixels: Uint8ClampedArray | null } = { pixels: null };
  const preparacao = prepararPixels(pixels, tracado, ajustes, (p) => (referencia.pixels = p));

  const motor = await criarMotor(pedido.modulo);
  let resultado;
  try {
    resultado = motor.vetorizar(pixels, tracado.largura, tracado.altura, parametrosDoMotor(ajustes, preparacao.estilo, tracado));
  } catch (erro) {
    if (erro instanceof MotorEsgotado) {
      enviar({ tipo: "complexo-demais", id: pedido.id, coresUsadas: preparacao.coresUsadas });
      return;
    }
    throw erro;
  }
  if (resultado.total > MAX_CAMINHOS) {
    enviar({ tipo: "complexo-demais", id: pedido.id, coresUsadas: preparacao.coresUsadas });
    return;
  }

  const svg = ajustarCoresAPaleta(
    montarSvg(resultado.caminhos, tracado, original, preparacao.estilo === "traco" ? pedido.corDoTraco : undefined),
    preparacao.paleta
  );
  if (svg.length > MAX_BYTES_DO_SVG) {
    enviar({ tipo: "complexo-demais", id: pedido.id, coresUsadas: preparacao.coresUsadas });
    return;
  }

  const amostra = amostrar(referencia.pixels ?? pixels, tracado);
  enviar(
    {
      tipo: "pronto",
      id: pedido.id,
      svg,
      caminhos: resultado.total,
      preparacao,
      referencia: amostra,
      duracaoMs: performance.now() - inicio,
    },
    [amostra]
  );
}

self.addEventListener("message", async (evento: MessageEvent<PedidoAoVetorizador>) => {
  const pedido = evento.data;
  if (!pedido) return;
  try {
    if (pedido.tipo === "preparar") await preparar(pedido);
    else await vetorizar(pedido);
  } catch (erro) {
    console.error(`[vetorizador] ${pedido.tipo}`, erro);
    enviar({ tipo: "erro", id: pedido.id, mensagem: "Não foi possível vetorizar esta imagem." });
  }
});
