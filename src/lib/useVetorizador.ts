"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_TENTATIVAS,
  MOTOR,
  TEMPO_LIMITE_MS,
  dimensoesDaAmostra,
  fidelidade,
  simplificar,
  validarArquivo,
  type Ajustes,
  type Dimensoes,
  type EstiloConcreto,
  type PedidoAoVetorizador,
  type ResultadoDoFundo,
  type RespostaDoVetorizador,
} from "@/lib/vetorizador";

export interface ImagemCarregada {
  nome: string;
  bytes: number;
  /** Object URL da prévia de tela (até 2560 px). */
  url: string;
  original: Dimensoes;
  tracado: Dimensoes;
}

export interface Resultado {
  svg: string;
  /** Object URL do SVG, para a tela e para abrir em outra aba. */
  url: string;
  bytes: number;
  caminhos: number;
  cores: number;
  estilo: EstiloConcreto;
  fundo: ResultadoDoFundo | null;
  limiar: number | null;
  /** Os tetos de complexidade obrigaram a simplificar os ajustes pedidos. */
  simplificado: boolean;
  duracaoMs: number;
  /** 0 a 1. Nulo enquanto é medida. */
  fidelidade: number | null;
}

export type Estado =
  | { fase: "vazio" }
  | { fase: "preparando"; nome: string }
  | { fase: "vetorizando"; imagem: ImagemCarregada; resultado: Resultado | null }
  | { fase: "pronto"; imagem: ImagemCarregada; resultado: Resultado }
  | { fase: "erro"; imagem: ImagemCarregada | null; resultado: Resultado | null; mensagem: string };

export class ArquivoRecusado extends Error {}

const MENSAGEM_COMPLEXA =
  "Esta imagem tem detalhe demais para virar um SVG que abre sem travar. Tente menos cores ou menos detalhe.";
const MENSAGEM_DEMOROU =
  "A vetorização demorou demais e foi interrompida. Tente menos cores ou menos detalhe.";

function hexDoDigest(digest: ArrayBuffer): string {
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * O motor compilado, compartilhado por todos os workers.
 *
 * Compilar uma vez na página e mandar o `WebAssembly.Module` para cada worker
 * é o que torna barato descartá-los: o worker só instancia, sem baixar nem
 * compilar de novo. O hash garante que o que roda é o arquivo conferido.
 */
let modulo: Promise<WebAssembly.Module> | null = null;
function obterModulo(): Promise<WebAssembly.Module> {
  modulo ??= (async () => {
    const resposta = await fetch(MOTOR.url);
    if (!resposta.ok) throw new Error(`${MOTOR.url} respondeu ${resposta.status}`);
    const bytes = await resposta.arrayBuffer();
    if (hexDoDigest(await crypto.subtle.digest("SHA-256", bytes)) !== MOTOR.sha256) {
      throw new Error("Motor com hash inesperado");
    }
    return WebAssembly.compile(bytes);
  })().catch((erro) => {
    modulo = null;
    throw erro;
  });
  return modulo;
}

/** Desenha o SVG na amostra e compara com a referência. */
async function medirFidelidade(url: string, referencia: ArrayBuffer, tracado: Dimensoes): Promise<number> {
  const amostra = dimensoesDaAmostra(tracado);
  const imagem = new Image();
  imagem.decoding = "async";
  imagem.src = url;
  await imagem.decode();
  const canvas = document.createElement("canvas");
  canvas.width = amostra.largura;
  canvas.height = amostra.altura;
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas 2D indisponível");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(imagem, 0, 0, amostra.largura, amostra.altura);
    const vetor = ctx.getImageData(0, 0, amostra.largura, amostra.altura).data;
    return fidelidade(new Uint8ClampedArray(referencia), vetor, amostra);
  } finally {
    canvas.width = canvas.height = 0;
  }
}

/**
 * Vetorização no navegador, sem travar a página nem o computador.
 *
 * As garantias, e onde cada uma mora:
 * - O motor roda num worker, nunca na thread da página.
 * - Um worker por pedido, descartado ao fim: a memória do WebAssembly volta ao
 *   sistema a cada vetorização, e pedir de novo encerra a anterior na hora.
 * - O motor tem teto duro de 512 MB (wasm/vetorizador) e o traçado, de 2 MP.
 * - O SVG passa por tetos de caminhos e de bytes antes de chegar à tela;
 *   acima deles, a vetorização é refeita mais simples, até três vezes.
 * - Trinta segundos sem resposta encerram o worker.
 * - A foto é decodificada uma vez só; os ajustes trabalham sobre a cópia de
 *   até 2 MP.
 */
export function useVetorizador() {
  const [estado, setEstado] = useState<Estado>({ fase: "vazio" });
  const worker = useRef<Worker | null>(null);
  const pedidoAtual = useRef(0);
  const pixels = useRef<ArrayBuffer | null>(null);
  const imagemAtual = useRef<ImagemCarregada | null>(null);
  const urls = useRef<Set<string>>(new Set());
  /** URL do SVG na tela, para revogar quando outro tomar o lugar. */
  const urlNaTela = useRef<string | null>(null);

  const criarUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.add(url);
    return url;
  }, []);

  const revogar = useCallback((url: string | undefined) => {
    if (!url || !urls.current.has(url)) return;
    URL.revokeObjectURL(url);
    urls.current.delete(url);
  }, []);

  /** Desfecho do pedido em curso: encerrar o worker resolve a promessa com nulo. */
  const abandonar = useRef<(() => void) | null>(null);

  const encerrarWorker = useCallback(() => {
    // Um worker encerrado não responde mais: sem isto, quem esperava a
    // resposta ficaria preso para sempre, segurando os pixels na memória.
    abandonar.current?.();
    abandonar.current = null;
    worker.current?.terminate();
    worker.current = null;
  }, []);

  useEffect(
    () => () => {
      encerrarWorker();
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
    },
    [encerrarWorker]
  );

  /**
   * Um pedido a um worker novo. Resolve com a resposta, ou com nulo se outro
   * pedido tomou o lugar deste. O worker é encerrado em qualquer desfecho.
   */
  const pedir = useCallback(
    (pedido: PedidoAoVetorizador, transferir: Transferable[] = []): Promise<RespostaDoVetorizador | null> => {
      encerrarWorker();
      const id = pedido.id;
      const novo = new Worker(new URL("./vetorizador.worker.ts", import.meta.url), { type: "module" });
      worker.current = novo;
      return new Promise((resolver) => {
        const concluir = (resposta: RespostaDoVetorizador | null) => {
          clearTimeout(limite);
          novo.terminate();
          if (worker.current === novo) {
            worker.current = null;
            abandonar.current = null;
          }
          resolver(id === pedidoAtual.current ? resposta : null);
        };
        abandonar.current = () => concluir(null);
        const limite = setTimeout(() => concluir({ tipo: "erro", id, mensagem: MENSAGEM_DEMOROU }), TEMPO_LIMITE_MS);
        novo.addEventListener("message", (evento: MessageEvent<RespostaDoVetorizador>) => concluir(evento.data));
        novo.addEventListener("error", (evento) => {
          console.error("[vetorizador] worker", evento);
          concluir({ tipo: "erro", id, mensagem: "O vetorizador não carregou. Recarregue a página e tente de novo." });
        });
        novo.postMessage(pedido, transferir);
      });
    },
    [encerrarWorker]
  );

  const carregar = useCallback(
    async (arquivo: File): Promise<ImagemCarregada | null> => {
      const validacao = validarArquivo(arquivo);
      if (!validacao.ok) throw new ArquivoRecusado(validacao.motivo);

      const id = ++pedidoAtual.current;
      setEstado({ fase: "preparando", nome: arquivo.name });
      // O motor começa a baixar junto com a decodificação: chega pronto.
      void obterModulo().catch(() => undefined);

      const resposta = await pedir({ tipo: "preparar", id, arquivo });
      if (!resposta) return null;
      if (resposta.tipo !== "preparada") {
        // Sem imagem não há palco para mostrar o erro: ele sobe para a página,
        // que avisa, e a tela volta ao convite.
        setEstado({ fase: "vazio" });
        throw new ArquivoRecusado(resposta.tipo === "erro" ? resposta.mensagem : "Não foi possível abrir essa imagem");
      }

      // A imagem e o resultado antigos saem de cena: as URLs deles podem ir.
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
      urlNaTela.current = null;
      pixels.current = resposta.pixels;
      const imagem: ImagemCarregada = {
        nome: arquivo.name,
        bytes: arquivo.size,
        url: criarUrl(resposta.previa),
        original: resposta.original,
        tracado: resposta.tracado,
      };
      imagemAtual.current = imagem;
      setEstado({ fase: "vetorizando", imagem, resultado: null });
      return imagem;
    },
    [criarUrl, pedir]
  );

  const vetorizar = useCallback(
    async (ajustes: Ajustes, corDoTraco: string) => {
      const imagem = imagemAtual.current;
      const origem = pixels.current;
      if (!imagem || !origem) return;
      const id = ++pedidoAtual.current;
      setEstado((atual) => ({
        fase: "vetorizando",
        imagem,
        resultado: "resultado" in atual && atual.imagem === imagem ? atual.resultado : null,
      }));

      let moduloCompilado: WebAssembly.Module;
      try {
        moduloCompilado = await obterModulo();
      } catch (erro) {
        console.error("[vetorizador] motor", erro);
        if (id !== pedidoAtual.current) return;
        setEstado((atual) => ({
          fase: "erro",
          imagem,
          resultado: "resultado" in atual ? atual.resultado : null,
          mensagem: "O vetorizador não carregou. Confira a conexão e tente de novo.",
        }));
        return;
      }
      if (id !== pedidoAtual.current) return;

      let tentativa = ajustes;
      for (let n = 0; n < MAX_TENTATIVAS; n++) {
        // Os pixels vão por cópia, e não por transferência: a página continua
        // com eles para o próximo ajuste.
        const resposta = await pedir({
          tipo: "vetorizar",
          id,
          modulo: moduloCompilado,
          pixels: origem,
          tracado: imagem.tracado,
          original: imagem.original,
          ajustes: tentativa,
          corDoTraco,
        });
        if (!resposta) return;

        if (resposta.tipo === "complexo-demais") {
          tentativa = simplificar(tentativa, resposta.coresUsadas);
          continue;
        }
        if (resposta.tipo !== "pronto") {
          setEstado((atual) => ({
            fase: "erro",
            imagem,
            resultado: "resultado" in atual ? atual.resultado : null,
            mensagem: resposta.tipo === "erro" ? resposta.mensagem : "Não foi possível vetorizar esta imagem.",
          }));
          return;
        }

        const blob = new Blob([resposta.svg], { type: "image/svg+xml" });
        const url = criarUrl(blob);
        const resultado: Resultado = {
          svg: resposta.svg,
          url,
          bytes: blob.size,
          caminhos: resposta.caminhos,
          cores: resposta.preparacao.coresUsadas,
          estilo: resposta.preparacao.estilo,
          fundo: resposta.preparacao.fundo,
          limiar: resposta.preparacao.limiar,
          simplificado: n > 0,
          duracaoMs: resposta.duracaoMs,
          fidelidade: null,
        };
        const antiga = urlNaTela.current;
        urlNaTela.current = url;
        setEstado({ fase: "pronto", imagem, resultado });
        // A URL antiga ainda está no <img> até o React trocar; sai depois.
        if (antiga) setTimeout(() => revogar(antiga), 1000);

        try {
          const nota = await medirFidelidade(url, resposta.referencia, imagem.tracado);
          if (id !== pedidoAtual.current) return;
          setEstado((atual) =>
            atual.fase === "pronto" && atual.resultado.url === url
              ? { ...atual, resultado: { ...atual.resultado, fidelidade: nota } }
              : atual
          );
        } catch (erro) {
          console.error("[vetorizador] fidelidade", erro);
        }
        return;
      }

      setEstado((atual) => ({
        fase: "erro",
        imagem,
        resultado: "resultado" in atual ? atual.resultado : null,
        mensagem: MENSAGEM_COMPLEXA,
      }));
    },
    [criarUrl, pedir, revogar]
  );

  const limpar = useCallback(() => {
    pedidoAtual.current++;
    encerrarWorker();
    pixels.current = null;
    imagemAtual.current = null;
    urlNaTela.current = null;
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current.clear();
    setEstado({ fase: "vazio" });
  }, [encerrarWorker]);

  return { estado, carregar, vetorizar, limpar };
}
