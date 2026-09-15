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
import type { Preparacao } from "./vetorizador";
import { TracadoComplexoDemais, pisoDeArea, tracarPreciso } from "./tracadoPreciso";
import { dimensoesNaTela } from "./dimensoesDaImagem";
import {
  MAX_BYTES_DO_SVG,
  MAX_CAMINHOS,
  ajustarCoresAPaleta,
  aplicarRotulos,
  dimensoesDaAmostra,
  fidelidade,
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

/**
 * A imagem decodificada no maior tamanho que ainda será usado, e as dimensões
 * originais dela.
 *
 * O tamanho vem do cabeçalho do arquivo, e a decodificação já sai reduzida. É
 * a diferença entre um bitmap de 192 MB e um de 13 MB numa foto de 48 MP: sem
 * isso, a maior alocação da ferramenta acontecia antes de qualquer decisão, e
 * numa máquina com pouca memória livre era ela que derrubava a aba.
 *
 * Se o cabeçalho não for reconhecido, decodifica inteiro, como antes.
 */
async function decodificar(arquivo: Blob): Promise<{ bitmap: ImageBitmap; original: Dimensoes }> {
  const original = await dimensoesNaTela(arquivo);
  if (!original) {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    return { bitmap, original: { largura: bitmap.width, altura: bitmap.height } };
  }
  // O maior dos dois usos: o traçado e a prévia de tela.
  const tracado = dimensoesDeTracado(original);
  const previa = dimensoesDaPrevia(original);
  const alvo = tracado.largura * tracado.altura >= previa.largura * previa.altura ? tracado : previa;
  const bitmap =
    alvo.largura >= original.largura
      ? await createImageBitmap(arquivo, { imageOrientation: "from-image" })
      : await createImageBitmap(arquivo, {
          imageOrientation: "from-image",
          resizeWidth: alvo.largura,
          resizeHeight: alvo.altura,
          resizeQuality: "high",
        });
  return { bitmap, original };
}

async function preparar(pedido: Pedido<"preparar">) {
  let bitmap: ImageBitmap;
  let original: Dimensoes;
  try {
    ({ bitmap, original } = await decodificar(pedido.arquivo));
  } catch {
    enviar({ tipo: "erro", id: pedido.id, mensagem: "Não foi possível abrir essa imagem" });
    return;
  }
  try {
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
    if (tamanhoDaPrevia.largura !== bitmap.width || tamanhoDaPrevia.altura !== bitmap.height) {
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
function amostrar(pixels: Uint8ClampedArray, tracado: Dimensoes): Uint8ClampedArray {
  const amostra = dimensoesDaAmostra(tracado);
  const origem = new OffscreenCanvas(tracado.largura, tracado.altura);
  contexto(origem).putImageData(new ImageData(pixels, tracado.largura, tracado.altura), 0, 0);
  const destino = new OffscreenCanvas(amostra.largura, amostra.altura);
  const ctx = contexto(destino);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(origem, 0, 0, amostra.largura, amostra.altura);
  const dados = ctx.getImageData(0, 0, amostra.largura, amostra.altura).data;
  origem.width = origem.height = destino.width = destino.height = 0;
  return dados;
}

/** Os elementos do SVG como formas de canvas, para desenhar sem passar por texto. */
function formasDoSvg(elementos: string): Array<{ forma: Path2D; cor: string; parImpar: boolean }> {
  const formas: Array<{ forma: Path2D; cor: string; parImpar: boolean }> = [];
  for (const m of elementos.matchAll(/<(rect|path)\b([^>]*)>/g)) {
    const atributos = m[2];
    const cor = /fill="([^"]*)"/.exec(atributos)?.[1] ?? "#000000";
    const forma = new Path2D();
    if (m[1] === "rect") {
      const largura = Number(/width="([\d.]+)"/.exec(atributos)?.[1] ?? 0);
      const altura = Number(/height="([\d.]+)"/.exec(atributos)?.[1] ?? 0);
      forma.rect(0, 0, largura, altura);
    } else {
      const d = /\sd="([^"]*)"/.exec(atributos)?.[1];
      if (!d) continue;
      // O VTracer emite cada caminho na origem, com o deslocamento num
      // `transform`; sem aplicá-lo, todas as formas se amontoam no canto.
      const t = /transform="translate\(([-\d.]+),\s*([-\d.]+)\)"/.exec(atributos);
      forma.addPath(new Path2D(d), t ? new DOMMatrix().translate(Number(t[1]), Number(t[2])) : undefined);
    }
    formas.push({ forma, cor, parImpar: atributos.includes('fill-rule="evenodd"') });
  }
  return formas;
}

/**
 * Desenha o resultado na amostra e mede a fidelidade contra a referência.
 *
 * Aqui, e não na página: o worker já tem as formas e as desenha com `Path2D`,
 * sem passar por texto. Na página, medir custava decodificar um SVG de
 * milhares de caminhos na thread principal — com uma imagem ruidosa, isso
 * deixava a tela sem responder por dezenas de segundos.
 */
function medirFidelidade(elementos: string, tracado: Dimensoes, referencia: Uint8ClampedArray): number {
  const amostra = dimensoesDaAmostra(tracado);
  const canvas = new OffscreenCanvas(amostra.largura, amostra.altura);
  const ctx = contexto(canvas);
  ctx.scale(amostra.largura / tracado.largura, amostra.altura / tracado.altura);
  for (const { forma, cor, parImpar } of formasDoSvg(elementos)) {
    ctx.fillStyle = cor;
    ctx.fill(forma, parImpar ? "evenodd" : "nonzero");
  }
  const desenhado = ctx.getImageData(0, 0, amostra.largura, amostra.altura).data;
  canvas.width = canvas.height = 0;
  return fidelidade(referencia, desenhado, amostra);
}

async function vetorizar(pedido: Pedido<"vetorizar">) {
  const inicio = performance.now();
  const { tracado, original, ajustes } = pedido;
  // O buffer chegou por cópia: este worker é o dono dele e pode escrever.
  const pixels = new Uint8ClampedArray(pedido.pixels);
  const referencia: { pixels: Uint8ClampedArray | null } = { pixels: null };
  const preparacao = prepararPixels(pixels, tracado, ajustes, (p) => (referencia.pixels = p));

  const parametros = parametrosDoMotor(ajustes, preparacao.estilo, tracado);
  let resultado: { caminhos: string; total: number };
  try {
    const areaMinima = parametros.ladoDaMancha * parametros.ladoDaMancha;
    if (preparacao.preciso) {
      // Logo, arte chapada e Traço: traçado de precisão.
      const { elementos, formas } = tracarPreciso(preparacao.entrada, {
        areaMinima,
        suavidade: ajustes.suavidade / 100,
        casasDecimais: parametros.casasDecimais,
      });
      resultado = { caminhos: elementos, total: formas };
    } else {
      // Foto e arte com textura: VTracer. O piso automático de área tira antes
      // as manchas que só virariam caminhos — sem ele, uma foto ruidosa levava
      // treze segundos e quase um giga para devolver um SVG que a página
      // descartava por complexidade.
      const { rotulos, cores } = preparacao.entrada;
      const piso = pisoDeArea(rotulos, tracado, areaMinima);
      aplicarRotulos(pixels, rotulos, cores);
      const motor = await criarMotor(pedido.modulo);
      resultado = motor.vetorizar(pixels, tracado.largura, tracado.altura, {
        ...parametros,
        ladoDaMancha: Math.max(parametros.ladoDaMancha, Math.round(Math.sqrt(piso))),
      });
    }
  } catch (erro) {
    if (erro instanceof MotorEsgotado || erro instanceof TracadoComplexoDemais) {
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

  const nota = medirFidelidade(resultado.caminhos, tracado, amostrar(referencia.pixels ?? pixels, tracado));
  enviar({
    tipo: "pronto",
    id: pedido.id,
    svg,
    caminhos: resultado.total,
    // Sem a entrada: são megabytes de pixels e rótulos que só valem aqui, e
    // a resposta é copiada para a página.
    preparacao: { ...preparacao, entrada: undefined as unknown as Preparacao["entrada"] },
    fidelidade: nota,
    duracaoMs: performance.now() - inicio,
  });
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
