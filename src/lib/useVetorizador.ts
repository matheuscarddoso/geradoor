"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_TENTATIVAS,
  MOTOR,
  TEMPO_LIMITE_MS,
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
  /** 0 a 1: quanto do resultado reproduz a imagem (ver `fidelidade`). */
  fidelidade: number;
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
const MENSAGEM_NAO_CARREGOU = "O vetorizador não carregou. Recarregue a página e tente de novo.";

/** Tempo que o worker fica vivo sem trabalho. */
const OCIOSO_MS = 60_000;

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
  /** O que fazer se o worker quebrar enquanto um pedido espera. */
  const erroDoWorker = useRef<(() => void) | null>(null);
  const temporizadorOcioso = useRef<ReturnType<typeof setTimeout> | null>(null);

  const encerrarWorker = useCallback(() => {
    if (temporizadorOcioso.current) clearTimeout(temporizadorOcioso.current);
    temporizadorOcioso.current = null;
    abandonar.current?.();
    abandonar.current = null;
    erroDoWorker.current = null;
    worker.current?.terminate();
    worker.current = null;
  }, []);

  /**
   * Um minuto sem trabalho e o worker sai de cena, com tudo que ele ainda
   * segurava: quem vetorizou uma vez e ficou olhando o resultado não paga por
   * um worker vivo.
   */
  const agendarOciosidade = useCallback(() => {
    if (temporizadorOcioso.current) clearTimeout(temporizadorOcioso.current);
    temporizadorOcioso.current = setTimeout(() => {
      if (!abandonar.current) encerrarWorker();
    }, OCIOSO_MS);
  }, [encerrarWorker]);

  const criarWorker = useCallback(() => {
    const novo = new Worker(new URL("./vetorizador.worker.ts", import.meta.url), { type: "module" });
    novo.addEventListener("error", (evento) => {
      console.error("[vetorizador] worker", evento);
      erroDoWorker.current?.();
    });
    worker.current = novo;
    return novo;
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
   * Um pedido ao worker, com a resposta como promessa. Resolve com nulo se
   * outro pedido tomar o lugar deste.
   *
   * O worker é reaproveitado entre pedidos e só morre quando precisa: pedido
   * abandonado, tempo esgotado, erro, ou um minuto sem trabalho. Criar um
   * worker por pedido custava compilar o módulo de novo a cada vez, e o
   * navegador segurava a memória dos anteriores por bem mais tempo do que
   * levava para chegar o próximo.
   *
   * Quando o worker é encerrado no meio, quem esperava recebe nulo: sem isso,
   * a promessa ficaria pendente para sempre, segurando os pixels na memória.
   */
  const pedir = useCallback(
    (pedido: PedidoAoVetorizador, transferir: Transferable[] = []): Promise<RespostaDoVetorizador | null> => {
      if (temporizadorOcioso.current) clearTimeout(temporizadorOcioso.current);
      // Worker ocupado com um pedido que ninguém quer mais: ele não para no
      // meio, então sai de cena e outro assume. É o caso de mexer num controle
      // enquanto a vetorização anterior corre.
      if (abandonar.current) encerrarWorker();
      const id = pedido.id;
      const atual = worker.current ?? criarWorker();
      return new Promise((resolver) => {
        const concluir = (resposta: RespostaDoVetorizador | null, descartar: boolean) => {
          if (encerrado) return;
          encerrado = true;
          clearTimeout(limite);
          atual.removeEventListener("message", aoResponder);
          if (abandonar.current === abandonarEste) abandonar.current = null;
          if (descartar) encerrarWorker();
          else agendarOciosidade();
          resolver(id === pedidoAtual.current ? resposta : null);
        };
        let encerrado = false;
        const aoResponder = (evento: MessageEvent<RespostaDoVetorizador>) => {
          if (evento.data?.id !== id) return;
          // Um motor que abortou deixa o heap do WebAssembly num estado
          // qualquer: esse worker não serve para o próximo pedido.
          concluir(evento.data, evento.data.tipo === "complexo-demais");
        };
        const abandonarEste = () => concluir(null, true);
        abandonar.current = abandonarEste;
        const limite = setTimeout(() => concluir({ tipo: "erro", id, mensagem: MENSAGEM_DEMOROU }, true), TEMPO_LIMITE_MS);
        atual.addEventListener("message", aoResponder);
        erroDoWorker.current = () => concluir({ tipo: "erro", id, mensagem: MENSAGEM_NAO_CARREGOU }, true);
        atual.postMessage(pedido, transferir);
      });
    },
    [agendarOciosidade, criarWorker, encerrarWorker]
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
          fidelidade: resposta.fidelidade,
        };
        const antiga = urlNaTela.current;
        urlNaTela.current = url;
        setEstado({ fase: "pronto", imagem, resultado });
        // A URL antiga ainda está no <img> até o React trocar; sai depois.
        if (antiga) setTimeout(() => revogar(antiga), 1000);
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
