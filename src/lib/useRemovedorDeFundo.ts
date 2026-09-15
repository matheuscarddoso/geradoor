"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  REMOVEDOR_URL,
  dimensoesDaPrevia,
  dimensoesDeEnvio,
  dimensoesDeTrabalho,
  limiteDePixels,
  interpretarFalha,
  validarArquivo,
  type Dimensoes,
  type Falha,
  type PedidoAoWorker,
  type PedidoDeRecorte,
  type RespostaDeRecorte,
  type RespostaDoWorker,
} from "@/lib/removedorDeFundo";
import type { Traco } from "@/lib/pincel";
import { avisoDeRecuo, regiaoDoTraco } from "@/lib/pincelMagico";

export interface ImagemCarregada {
  nome: string;
  bytes: number;
  /**
   * Object URL da imagem para a tela: o próprio arquivo quando ele cabe na
   * prévia, ou uma cópia de até 2560 px quando não cabe. Só a tela usa isto;
   * recorte, pincel e exportação trabalham sobre o arquivo original.
   */
  url: string;
  original: Dimensoes;
  /** Tamanho em que foi trabalhada e em que o PNG sai. */
  trabalho: Dimensoes;
  reduzida: boolean;
}

/** Onde o recorte foi feito. */
export type Modo = "nuvem" | "leve";

export type Estado =
  | { fase: "vazio" }
  /** Só no modo leve: carregando os modelos no aparelho. */
  | { fase: "preparando"; imagem: ImagemCarregada }
  | { fase: "processando"; imagem: ImagemCarregada }
  | {
      fase: "pronto";
      imagem: ImagemCarregada;
      /** `blob` na resolução da entrada; `url` aponta para a prévia de tela. */
      recorte: { blob: Blob; url: string };
      duracaoMs: number;
      modo: Modo;
      /** Por que caiu no modo leve, quando caiu. */
      aviso: string | null;
    }
  | { fase: "erro"; imagem: ImagemCarregada | null; mensagem: string };

export class ArquivoRecusado extends Error {}

/**
 * Quanto tempo um worker fica vivo sem trabalho.
 *
 * A memória do WebAssembly só cresce: depois do pico de uma inferência, o
 * heap do worker fica daquele tamanho até o worker morrer. Encerrá-lo depois
 * de um minuto parado devolve essa memória ao sistema.
 */
const OCIOSO_MS = 60_000;

/**
 * Tempo máximo esperando a Cloudflare. O recorte leva de 1 a 5 s; passou
 * disso, algo está errado, e o modo leve entrega antes de a pessoa desistir.
 */
const TEMPO_LIMITE_MS = 30_000;

const MENSAGEM_GENERICA = "Não foi possível remover o fundo desta imagem.";

/**
 * Decodifica e, se passar do teto de área, reduz já na decodificação.
 *
 * `imageOrientation: "from-image"` é explícito porque a foto de celular vem
 * deitada no arquivo e de pé no EXIF. O `<img>` do original respeita o EXIF, e
 * o recorte precisa sair na mesma orientação para os dois se sobreporem.
 */
/**
 * WebKit no iPhone e no iPad, onde o canvas tem o limite duro de 16,7 MP. O
 * iPadOS se apresenta como Mac; o toque é o que o denuncia.
 */
function ehIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

async function decodificar(arquivo: File) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  } catch {
    throw new ArquivoRecusado("Não foi possível abrir essa imagem");
  }

  const original = { largura: bitmap.width, altura: bitmap.height };
  const trabalho = dimensoesDeTrabalho(original, limiteDePixels({ ios: ehIos() }));
  if (!trabalho.reduzida) return { bitmap, original, trabalho };

  const reduzido = await createImageBitmap(bitmap, {
    resizeWidth: trabalho.largura,
    resizeHeight: trabalho.altura,
    resizeQuality: "high",
  });
  bitmap.close();
  return { bitmap: reduzido, original, trabalho };
}

/**
 * A cópia que vai para a Cloudflare: JPEG, lado maior de até 2048 px.
 *
 * Reencodar a partir do bitmap, e não mandar o arquivo original, resolve três
 * coisas de uma vez: o EXIF já está aplicado (ninguém do outro lado precisa
 * adivinhar a orientação), o upload fica pequeno, e AVIF que o navegador
 * abriu chega num formato que o Worker aceita. O fundo branco por baixo é
 * para PNG com transparência, que em JPEG viraria preto.
 */
async function copiaParaEnvio(bitmap: ImageBitmap): Promise<Blob> {
  const { largura, altura } = dimensoesDeEnvio({ largura: bitmap.width, altura: bitmap.height });
  const canvas = new OffscreenCanvas(largura, altura);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D indisponível");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, largura, altura);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  const jpeg = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
  canvas.width = canvas.height = 0;
  return jpeg;
}

/**
 * Imagem para a tela: o próprio arquivo quando cabe na prévia — sem
 * reencodar nada —, senão uma cópia reduzida a 2560 px. JPEG quando a
 * entrada não tem transparência; PNG quando pode ter.
 */
async function imagemDeTela(arquivo: File, bitmap: ImageBitmap): Promise<Blob> {
  const tamanho = dimensoesDaPrevia({ largura: bitmap.width, altura: bitmap.height });
  if (tamanho.largura === bitmap.width && tamanho.altura === bitmap.height) return arquivo;
  const canvas = new OffscreenCanvas(tamanho.largura, tamanho.altura);
  const ctx = canvas.getContext("2d");
  if (!ctx) return arquivo;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, tamanho.largura, tamanho.altura);
  const podeTerTransparencia = arquivo.type !== "image/jpeg";
  const previa = await canvas.convertToBlob(
    podeTerTransparencia ? { type: "image/png" } : { type: "image/jpeg", quality: 0.92 }
  );
  canvas.width = canvas.height = 0;
  return previa;
}

/** O motivo que o Worker devolveu no corpo JSON, se houver. */
async function lerMotivo(resposta: Response): Promise<string | null> {
  try {
    const corpo = (await resposta.json()) as { motivo?: unknown };
    return typeof corpo.motivo === "string" ? corpo.motivo : null;
  } catch {
    return null;
  }
}

/**
 * Tenta a Cloudflare e devolve a máscara, ou a falha interpretada.
 *
 * Nunca lança: qualquer coisa que dê errado vira uma `Falha`, que decide
 * entre o modo leve e uma mensagem.
 */
async function pedirMascara(
  bitmap: ImageBitmap,
  sinal: AbortSignal
): Promise<{ mascara: Blob } | { falha: Falha }> {
  let corpo: Blob;
  try {
    corpo = await copiaParaEnvio(bitmap);
  } catch {
    return { falha: interpretarFalha(null, null) };
  }
  return enviarAoRemovedor(corpo, sinal);
}

/** Manda um JPEG ao Worker da Cloudflare e devolve a máscara, ou a falha interpretada. */
async function enviarAoRemovedor(
  corpo: Blob,
  sinal: AbortSignal
): Promise<{ mascara: Blob } | { falha: Falha }> {
  let resposta: Response;
  try {
    resposta = await fetch(REMOVEDOR_URL, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: corpo,
      signal: sinal,
      // Sem cookie nem referer: o Worker não precisa saber de nada além da imagem.
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch {
    return { falha: interpretarFalha(null, null) };
  }
  if (!resposta.ok) return { falha: interpretarFalha(resposta.status, await lerMotivo(resposta)) };
  try {
    return { mascara: await resposta.blob() };
  } catch {
    return { falha: interpretarFalha(null, null) };
  }
}

export function useRemovedorDeFundo() {
  const [estado, setEstado] = useState<Estado>({ fase: "vazio" });
  const workerRecorte = useRef<Worker | null>(null);
  const workerLocal = useRef<Worker | null>(null);
  const pedidoAtual = useRef(0);
  const arquivoAtual = useRef<File | null>(null);
  const envioEmCurso = useRef<AbortController | null>(null);
  /** Momento em que o pedido atual começou, para medir a duração de ponta a ponta. */
  const inicioDoPedido = useRef(0);
  /** Aviso do pedido atual quando ele caiu no modo leve. */
  const avisoAtual = useRef<string | null>(null);
  /** Object URLs vivas, para revogar ao trocar de imagem e ao desmontar. */
  const urls = useRef<string[]>([]);
  const temporizadorOcioso = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Pedidos avulsos ao worker de recorte — exportar ajustes, pincel mágico —,
   * esperando resposta. Numerados para baixo, em negativo: o recorte
   * principal numera para cima a partir de 1, e ids que se cruzassem fariam a
   * resposta de um cair na promessa do outro.
   */
  const avulsos = useRef(
    new Map<number, { resolver: (resposta: RespostaDeRecorte) => void; rejeitar: (erro: Error) => void }>()
  );
  const ultimoAvulso = useRef(0);

  const revogarTudo = useCallback(() => {
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = [];
  }, []);

  const criarUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    return url;
  }, []);

  const encerrarWorkers = useCallback(() => {
    if (temporizadorOcioso.current) clearTimeout(temporizadorOcioso.current);
    temporizadorOcioso.current = null;
    workerRecorte.current?.terminate();
    workerRecorte.current = null;
    workerLocal.current?.terminate();
    workerLocal.current = null;
    // Um worker encerrado não responde mais: sem isto, quem esperava um
    // download ficaria com o botão girando para sempre.
    avulsos.current.forEach(({ rejeitar }) => rejeitar(new Error("Removedor encerrado")));
    avulsos.current.clear();
  }, []);

  const agendarEncerramento = useCallback(() => {
    if (temporizadorOcioso.current) clearTimeout(temporizadorOcioso.current);
    temporizadorOcioso.current = setTimeout(encerrarWorkers, OCIOSO_MS);
  }, [encerrarWorkers]);

  useEffect(
    () => () => {
      envioEmCurso.current?.abort();
      encerrarWorkers();
      revogarTudo();
    },
    [encerrarWorkers, revogarTudo]
  );

  /** Estado de pronto, compartilhado pelos dois caminhos. */
  const concluir = useCallback(
    (id: number, recorte: Blob, previa: Blob, modo: Modo) => {
      if (id !== pedidoAtual.current) return;
      agendarEncerramento();
      // A URL nasce fora do updater, que o React pode chamar duas vezes. É a
      // da prévia: a tela nunca decodifica o PNG de resolução cheia.
      const url = criarUrl(previa);
      const duracaoMs = performance.now() - inicioDoPedido.current;
      const aviso = modo === "leve" ? avisoAtual.current : null;
      setEstado((atual) =>
        atual.fase === "vazio" || !atual.imagem
          ? atual
          : { fase: "pronto", imagem: atual.imagem, recorte: { blob: recorte, url }, duracaoMs, modo, aviso }
      );
    },
    [agendarEncerramento, criarUrl]
  );

  const falhar = useCallback(
    (id: number, mensagem: string) => {
      if (id !== pedidoAtual.current) return;
      agendarEncerramento();
      setEstado((atual) => ({
        fase: "erro",
        imagem: "imagem" in atual ? atual.imagem : null,
        mensagem,
      }));
    },
    [agendarEncerramento]
  );

  /**
   * Os workers nascem no primeiro uso, e não ao abrir a página: quem só passa
   * por ela — boa parte do tráfego de busca — não paga por nenhum deles. O do
   * modo leve, com o runtime de inferência, só nasce se a Cloudflare falhar.
   */
  const obterWorkerRecorte = useCallback(() => {
    if (workerRecorte.current) return workerRecorte.current;
    const worker = new Worker(new URL("./recorte.worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (evento: MessageEvent<RespostaDeRecorte>) => {
      const resposta = evento.data;
      const avulso = avulsos.current.get(resposta.id);
      if (avulso) {
        avulsos.current.delete(resposta.id);
        avulso.resolver(resposta);
        if (avulsos.current.size === 0) agendarEncerramento();
        return;
      }
      if (resposta.tipo === "pronto") concluir(resposta.id, resposta.recorte, resposta.previa, "nuvem");
      else falhar(resposta.id, MENSAGEM_GENERICA);
    });
    worker.addEventListener("error", (evento) => {
      console.error("[removedor-de-fundo] worker de recorte", evento);
      workerRecorte.current = null;
      worker.terminate();
      avulsos.current.forEach(({ rejeitar }) => rejeitar(new Error("Worker de recorte caiu")));
      avulsos.current.clear();
      falhar(pedidoAtual.current, "O removedor não carregou. Recarregue a página e tente de novo.");
    });
    workerRecorte.current = worker;
    return worker;
  }, [agendarEncerramento, concluir, falhar]);

  const obterWorkerLocal = useCallback(() => {
    if (workerLocal.current) return workerLocal.current;
    const worker = new Worker(new URL("./removedorLocal.worker.ts", import.meta.url), { type: "module" });
    worker.addEventListener("message", (evento: MessageEvent<RespostaDoWorker>) => {
      const resposta = evento.data;
      if (resposta.id !== pedidoAtual.current) return;
      switch (resposta.tipo) {
        case "preparando":
        case "processando": {
          const fase = resposta.tipo;
          setEstado((atual) => (atual.fase === "vazio" || !atual.imagem ? atual : { fase, imagem: atual.imagem }));
          return;
        }
        case "pronto":
          concluir(resposta.id, resposta.recorte, resposta.previa, "leve");
          return;
        case "erro":
          falhar(resposta.id, resposta.mensagem);
      }
    });
    worker.addEventListener("error", (evento) => {
      console.error("[removedor-de-fundo] worker do modo leve", evento);
      workerLocal.current = null;
      worker.terminate();
      falhar(pedidoAtual.current, "O removedor não carregou. Recarregue a página e tente de novo.");
    });
    workerLocal.current = worker;
    return worker;
  }, [concluir, falhar]);

  const processar = useCallback(
    async (arquivo: File) => {
      const validacao = validarArquivo(arquivo);
      if (!validacao.ok) throw new ArquivoRecusado(validacao.motivo);

      const { bitmap, original, trabalho } = await decodificar(arquivo);

      envioEmCurso.current?.abort();
      revogarTudo();
      if (temporizadorOcioso.current) clearTimeout(temporizadorOcioso.current);
      arquivoAtual.current = arquivo;
      avisoAtual.current = null;
      const id = ++pedidoAtual.current;
      inicioDoPedido.current = performance.now();

      const imagem: ImagemCarregada = {
        nome: arquivo.name,
        bytes: arquivo.size,
        url: criarUrl(await imagemDeTela(arquivo, bitmap)),
        original,
        trabalho: { largura: trabalho.largura, altura: trabalho.altura },
        reduzida: trabalho.reduzida,
      };
      setEstado({ fase: "processando", imagem });

      const controlador = new AbortController();
      envioEmCurso.current = controlador;
      const tempoLimite = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
      const resultado = await pedirMascara(bitmap, controlador.signal);
      clearTimeout(tempoLimite);

      // Trocou de imagem ou limpou enquanto a rede respondia.
      if (id !== pedidoAtual.current) {
        bitmap.close();
        return;
      }
      envioEmCurso.current = null;

      if ("mascara" in resultado) {
        const pedido: PedidoDeRecorte = { tipo: "aplicar-mascara", id, imagem: bitmap, mascara: resultado.mascara };
        obterWorkerRecorte().postMessage(pedido, [bitmap]);
        return;
      }

      if (!resultado.falha.modoLeve) {
        bitmap.close();
        falhar(id, resultado.falha.mensagem);
        return;
      }

      avisoAtual.current = resultado.falha.aviso;
      const pedido: PedidoAoWorker = { tipo: "remover", id, imagem: bitmap };
      obterWorkerLocal().postMessage(pedido, [bitmap]);
    },
    [criarUrl, falhar, obterWorkerLocal, obterWorkerRecorte, revogarTudo]
  );

  /** Um pedido avulso ao worker de recorte, com a resposta como promessa. */
  const pedirAvulso = useCallback(
    (montar: (id: number) => PedidoDeRecorte): Promise<RespostaDeRecorte> => {
      if (temporizadorOcioso.current) clearTimeout(temporizadorOcioso.current);
      const id = -++ultimoAvulso.current;
      return new Promise<RespostaDeRecorte>((resolver, rejeitar) => {
        avulsos.current.set(id, { resolver, rejeitar });
        obterWorkerRecorte().postMessage(montar(id));
      });
    },
    [obterWorkerRecorte]
  );

  /**
   * O recorte com os ajustes de pincel, em resolução cheia.
   *
   * Feito no worker, sob demanda — só quando alguém baixa ou copia —, para
   * pintar continuar leve: na tela os traços são desenhados em resolução de
   * janela, e só aqui eles viram pixels do tamanho da foto.
   */
  const aplicarTracos = useCallback(
    async (tracos: readonly Traco[]): Promise<Blob> => {
      if (estado.fase !== "pronto" || !arquivoAtual.current) throw new Error("Sem recorte para ajustar");
      if (tracos.length === 0) return estado.recorte.blob;
      const original = arquivoAtual.current;
      const resposta = await pedirAvulso((id) => ({
        tipo: "aplicar-tracos",
        id,
        recorte: estado.recorte.blob,
        original,
        trabalho: estado.imagem.trabalho,
        tracos,
      }));
      if (resposta.tipo !== "tracos-prontos") throw new Error("Falha ao aplicar os ajustes");
      return resposta.recorte;
    },
    [estado, pedirAvulso]
  );

  /**
   * Pincel mágico: do traço, o elemento que ele tocou.
   *
   * Três passos, dois deles locais: recortar a região da foto em volta do
   * traço, mandá-la à Cloudflare pelo mesmo Worker do recorte principal — com
   * as mesmas travas de cota —, e ficar só com a parte segmentada que o traço
   * encostou.
   *
   * Nunca lança e nunca descarta o traço: sem elemento definido ou sem o
   * serviço, devolve o próprio traço, para ser aplicado como pincel comum,
   * junto com o aviso do porquê.
   */
  const pincelMagico = useCallback(
    async (traco: Traco, tracosAtuais: readonly Traco[]): Promise<{ traco: Traco; aviso: string | null }> => {
      const generico = {
        traco,
        aviso: "O pincel mágico não conseguiu processar este traço, então apliquei o pincel comum na área pintada.",
      };
      if (estado.fase !== "pronto" || !arquivoAtual.current) return generico;
      const original = arquivoAtual.current;
      const { trabalho } = estado.imagem;
      const regiao = regiaoDoTraco(traco, trabalho);
      // A mesma régua do recorte principal: o BiRefNet decide em 1024 px, e
      // mandar mais que isso só deixaria o traço mais lento de responder.
      const envio = dimensoesDeEnvio({ largura: regiao.largura, altura: regiao.altura }, 1024);

      try {
        const recorteAtual = estado.recorte.blob;
        const preparada = await pedirAvulso((id) => ({
          tipo: "preparar-regiao",
          id,
          original,
          trabalho,
          regiao,
          envio,
          // Restaurar é incluir o que ainda não está no recorte: o que já
          // está sai da região, para o modelo não escolher de novo o assunto
          // principal. Apagar mira justamente o que já está, então vai inteiro.
          atual: traco.ferramenta === "restaurar" ? { recorte: recorteAtual, tracos: tracosAtuais } : undefined,
        }));
        if (preparada.tipo !== "regiao-pronta") return generico;

        const controlador = new AbortController();
        const tempoLimite = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);
        const resultado = await enviarAoRemovedor(preparada.imagem, controlador.signal);
        clearTimeout(tempoLimite);
        if ("falha" in resultado) return { traco, aviso: avisoDeRecuo({ tipo: "falha", falha: resultado.falha }) };

        const selecao = await pedirAvulso((id) => ({
          tipo: "selecionar-elemento",
          id,
          mascara: resultado.mascara,
          traco,
          regiao,
          trabalho,
        }));
        if (selecao.tipo === "elemento-vazio") return { traco, aviso: avisoDeRecuo({ tipo: "sem-elemento" }) };
        if (selecao.tipo !== "elemento-pronto") return generico;
        return { traco: { ...traco, magia: { regiao, mascara: selecao.mascara } }, aviso: null };
      } catch {
        return generico;
      }
    },
    [estado, pedirAvulso]
  );

  const tentarDeNovo = useCallback(() => {
    const arquivo = arquivoAtual.current;
    if (arquivo) return processar(arquivo);
  }, [processar]);

  const limpar = useCallback(() => {
    // Limpar é dizer "terminei": cancela o envio, encerra os workers e
    // devolve a memória.
    pedidoAtual.current++;
    envioEmCurso.current?.abort();
    envioEmCurso.current = null;
    arquivoAtual.current = null;
    encerrarWorkers();
    revogarTudo();
    setEstado({ fase: "vazio" });
  }, [encerrarWorkers, revogarTudo]);

  return { estado, processar, tentarDeNovo, limpar, aplicarTracos, pincelMagico };
}

/**
 * O recorte sobre uma cor sólida, em PNG.
 *
 * Feito sob demanda, no clique, e não a cada troca de cor: numa imagem de
 * 12 MP a codificação leva perto de um segundo, e a prévia já mostra a cor
 * com CSS atrás do PNG transparente.
 */
export async function recorteSobreCor(recorte: Blob, cor: string): Promise<Blob> {
  const bitmap = await createImageBitmap(recorte);
  const canvas = document.createElement("canvas");
  try {
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D indisponível");
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar o PNG"))),
        "image/png"
      )
    );
  } finally {
    bitmap.close();
    // Zerar o tamanho devolve a memória do canvas na hora; esperar o coletor
    // deixaria 48 MB presos a cada exportação.
    canvas.width = canvas.height = 0;
  }
}
