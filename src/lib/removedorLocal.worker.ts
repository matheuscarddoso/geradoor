/**
 * Modo leve: remove o fundo no próprio aparelho, sem rede.
 *
 * Só nasce quando a Cloudflare não está disponível — cota do mês esgotada,
 * sem conexão, fora do ar. A qualidade é menor que a do BiRefNet de lá, mas
 * o recorte sai em vez de um erro.
 *
 * Dois modelos pequenos rodam no processador, em WebAssembly, e não na GPU:
 * com entradas de 320 e 512 px eles levam fração de segundo na CPU, e a WebGPU
 * só trazia risco — cada navegador expõe limites diferentes, e foi num deles
 * que o modelo anterior quebrou. Um caminho só, que roda igual em todo lugar.
 */

import * as ort from "onnxruntime-web/wasm";
import { recortar } from "./recorte";
import {
  LADO_DO_U2NETP,
  MODELOS,
  NORMALIZACAO_MODNET,
  NORMALIZACAO_U2NETP,
  concordancia,
  dimensoesDoModnet,
  ehPessoa,
  esticarSaida,
  hexDoDigest,
  redimensionarPlano,
  restringirAoSujeito,
  rgbaParaTensor,
  type Dimensoes,
  type Normalizacao,
  type PedidoAoWorker,
  type RespostaDoWorker,
} from "./removedorDeFundo";

// Threads só existem com isolamento de origem cruzada (ver next.config.ts).
// Sem ele o ORT cai para uma thread sozinho; fixar 1 evita o aviso no console.
// Quatro é o teto útil para modelos deste tamanho: acima disso o custo de
// coordenar as threads come o ganho.
ort.env.wasm.numThreads = self.crossOriginIsolated
  ? Math.min(4, navigator.hardwareConcurrency || 1)
  : 1;
// Já estamos num worker: o proxy do ORT abriria um segundo, à toa.
ort.env.wasm.proxy = false;

interface Sessoes {
  objeto: ort.InferenceSession;
  pessoa: ort.InferenceSession;
}

/**
 * Sessões compartilhadas entre pedidos.
 *
 * Guardar a promessa, e não o resultado, impede dois pedidos seguidos de
 * criarem sessões em dobro: o segundo espera as do primeiro.
 */
let sessoes: Promise<Sessoes> | null = null;

const LADO_U2NETP: Dimensoes = { largura: LADO_DO_U2NETP, altura: LADO_DO_U2NETP };

function enviar(resposta: RespostaDoWorker) {
  self.postMessage(resposta);
}

async function criarSessao({ url, sha256 }: { url: string; sha256: string }) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`${url} respondeu ${resposta.status}`);
  const bytes = await resposta.arrayBuffer();

  // Arquivo corrompido no cache ou trocado no deploy: melhor falhar com
  // clareza do que rodar um modelo que não é o conferido.
  const hash = hexDoDigest(await crypto.subtle.digest("SHA-256", bytes));
  if (hash !== sha256) throw new Error(`${url} com hash inesperado`);

  return ort.InferenceSession.create(new Uint8Array(bytes), {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
}

async function criarSessoes(): Promise<Sessoes> {
  const [objeto, pessoa] = await Promise.all([
    criarSessao(MODELOS.objeto),
    criarSessao(MODELOS.pessoa),
  ]);
  return { objeto, pessoa };
}

/** A imagem redimensionada e convertida para o tensor de entrada de um modelo. */
function tensorDeEntrada(
  imagem: ImageBitmap,
  tamanho: Dimensoes,
  normalizacao: Normalizacao
): ort.Tensor {
  const canvas = new OffscreenCanvas(tamanho.largura, tamanho.altura);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D indisponível no worker");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(imagem, 0, 0, tamanho.largura, tamanho.altura);
  const { data } = ctx.getImageData(0, 0, tamanho.largura, tamanho.altura);
  const tensor = rgbaParaTensor(data, tamanho, normalizacao);
  return new ort.Tensor("float32", tensor, [1, 3, tamanho.altura, tamanho.largura]);
}

/** Roda um modelo e devolve a primeira saída como plano de um canal. */
async function inferir(sessao: ort.InferenceSession, entrada: ort.Tensor): Promise<Float32Array> {
  const saidas = await sessao.run({ [sessao.inputNames[0]]: entrada });
  // Copia antes de liberar: `data` aponta para memória que o dispose devolve.
  const plano = Float32Array.from(saidas[sessao.outputNames[0]].data as Float32Array);
  for (const tensor of Object.values(saidas)) tensor.dispose();
  entrada.dispose();
  return plano;
}

/**
 * A máscara final, e o tamanho da grade em que ela está.
 *
 * Os dois modelos rodam sempre, e é a concordância entre eles que decide quem
 * fica com a borda. Se as máscaras coincidem, a foto é de gente, e a borda do
 * MODNet — que trabalha em 512 px e foi treinado para cabelo — ganha, cercada
 * pela região do U²-Netp para não deixar manchas soltas. Se não coincidem, o
 * MODNet procurou uma pessoa que não está lá, e fica o U²-Netp.
 */
async function mascara(
  { objeto, pessoa }: Sessoes,
  imagem: ImageBitmap
): Promise<{ plano: Float32Array; grade: Dimensoes }> {
  // Em sequência, não em paralelo: rodar os dois juntos somaria os picos de
  // memória, e é memória que este removedor existe para poupar.
  const u2netp = esticarSaida(
    await inferir(objeto, tensorDeEntrada(imagem, LADO_U2NETP, NORMALIZACAO_U2NETP))
  );

  const gradeModnet = dimensoesDoModnet({ largura: imagem.width, altura: imagem.height });
  const modnet = await inferir(pessoa, tensorDeEntrada(imagem, gradeModnet, NORMALIZACAO_MODNET));

  const modnetNaGradeDoU2netp = redimensionarPlano(modnet, gradeModnet, LADO_U2NETP);
  if (!ehPessoa(concordancia(u2netp, modnetNaGradeDoU2netp))) {
    return { plano: u2netp, grade: LADO_U2NETP };
  }

  const u2netpNaGradeDoModnet = redimensionarPlano(u2netp, LADO_U2NETP, gradeModnet);
  return {
    plano: restringirAoSujeito(modnet, u2netpNaGradeDoModnet, gradeModnet),
    grade: gradeModnet,
  };
}

/** Canvas do tamanho da grade cujo canal alfa é a máscara. */
function canvasDaMascara(plano: Float32Array, grade: Dimensoes): OffscreenCanvas {
  const pixels = new Uint8ClampedArray(plano.length * 4);
  for (let i = 0; i < plano.length; i++) pixels[i * 4 + 3] = plano[i] * 255;

  const canvas = new OffscreenCanvas(grade.largura, grade.altura);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível no worker");
  ctx.putImageData(new ImageData(pixels, grade.largura, grade.altura), 0, 0);
  return canvas;
}

async function remover({ id, imagem }: PedidoAoWorker) {
  try {
    enviar({ tipo: "preparando", id });
    sessoes ??= criarSessoes();
    let carregadas: Sessoes;
    try {
      carregadas = await sessoes;
    } catch (erro) {
      // Sem guardar a falha: a próxima imagem tenta de novo.
      sessoes = null;
      throw erro;
    }

    enviar({ tipo: "processando", id });
    const inicio = performance.now();
    const { plano, grade } = await mascara(carregadas, imagem);
    const { recorte, previa } = await recortar(imagem, canvasDaMascara(plano, grade));
    enviar({ tipo: "pronto", id, recorte, previa, duracaoMs: performance.now() - inicio });
  } catch (erro) {
    console.error("[removedor-de-fundo]", erro);
    enviar({ tipo: "erro", id, mensagem: "Não foi possível remover o fundo desta imagem." });
  } finally {
    imagem.close();
  }
}

/**
 * Fila de um pedido por vez.
 *
 * Duas inferências simultâneas dobrariam o pico de memória sem ganho algum, e
 * quem troca de imagem no meio só quer o resultado da última.
 */
let fila = Promise.resolve();
let ultimoPedido = 0;

self.addEventListener("message", (evento: MessageEvent<PedidoAoWorker>) => {
  const pedido = evento.data;
  if (pedido?.tipo !== "remover") return;
  ultimoPedido = pedido.id;
  fila = fila.then(() => {
    // Trocou de imagem enquanto este esperava na fila: ninguém vai ler a
    // resposta, então não vale gastar processamento com ele.
    if (pedido.id !== ultimoPedido) {
      pedido.imagem.close();
      return;
    }
    return remover(pedido);
  });
});
