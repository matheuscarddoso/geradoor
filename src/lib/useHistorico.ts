"use client";

import { useCallback, useMemo, useReducer } from "react";

/**
 * Histórico de desfazer e refazer com transações.
 *
 * O problema que ele resolve: arrastar um código dispara uma mudança de estado
 * por quadro, umas sessenta por segundo. Um histórico que empilhasse cada
 * mudança daria um desfazer por sexagésimo de segundo de arrasto — inútil, e
 * pior que não ter. O que o operador espera desfazer é o **gesto**: um
 * arrasto, um redimensionamento, uma digitação encerrada.
 *
 * Daí as transações. `abrir` marca o começo de um gesto, `encerrar` o fim, e
 * tudo entre os dois vira uma entrada só. Um gesto que não mudou nada não
 * empilha entrada nenhuma, porque o estado anterior só é guardado na primeira
 * mudança de dentro da transação — e não na abertura.
 */

interface Estado<T> {
  passado: T[];
  presente: T;
  futuro: T[];
  /**
   * Estado de antes da transação em curso, enquanto ela ainda não mudou nada.
   * Vira `null` na primeira mudança, que é quando ele é empilhado.
   */
  pendente: { antes: T } | null;
  emTransacao: boolean;
}

type Acao<T> =
  | { tipo: "aplicar"; proximo: T | ((atual: T) => T) }
  | { tipo: "desfazer" }
  | { tipo: "refazer" }
  | { tipo: "abrir" }
  | { tipo: "encerrar" }
  | { tipo: "redefinir"; estado: T };

/**
 * Teto de entradas guardadas.
 *
 * Cem cobre qualquer sessão de ajuste sem virar peso: os estados compartilham
 * estrutura — só o código alterado é um objeto novo —, então uma entrada custa
 * a diferença, não a folha inteira.
 */
const TETO = 100;

function reduzir<T>(estado: Estado<T>, acao: Acao<T>): Estado<T> {
  switch (acao.tipo) {
    case "aplicar": {
      const proximo =
        typeof acao.proximo === "function"
          ? (acao.proximo as (atual: T) => T)(estado.presente)
          : acao.proximo;
      if (proximo === estado.presente) return estado;

      // Dentro de uma transação, só a primeira mudança empilha o estado
      // anterior; as seguintes substituem o presente.
      if (estado.emTransacao) {
        if (estado.pendente) {
          return {
            passado: [...estado.passado, estado.pendente.antes].slice(-TETO),
            presente: proximo,
            futuro: [],
            pendente: null,
            emTransacao: true,
          };
        }
        return { ...estado, presente: proximo, futuro: [] };
      }

      return {
        passado: [...estado.passado, estado.presente].slice(-TETO),
        presente: proximo,
        futuro: [],
        pendente: null,
        emTransacao: false,
      };
    }

    case "desfazer": {
      const anterior = estado.passado.at(-1);
      if (anterior === undefined) return estado;
      return {
        passado: estado.passado.slice(0, -1),
        presente: anterior,
        futuro: [estado.presente, ...estado.futuro].slice(0, TETO),
        // Desfazer durante um gesto encerra a transação: o que vinha sendo
        // ajustado deixou de existir como unidade.
        pendente: null,
        emTransacao: false,
      };
    }

    case "refazer": {
      const [proximo, ...resto] = estado.futuro;
      if (proximo === undefined) return estado;
      return {
        passado: [...estado.passado, estado.presente].slice(-TETO),
        presente: proximo,
        futuro: resto,
        pendente: null,
        emTransacao: false,
      };
    }

    case "abrir":
      // Reabrir sem encerrar não perde a transação anterior: o gesto que
      // começou primeiro é o que define a entrada.
      if (estado.emTransacao) return estado;
      return { ...estado, pendente: { antes: estado.presente }, emTransacao: true };

    case "encerrar":
      if (!estado.emTransacao) return estado;
      return { ...estado, pendente: null, emTransacao: false };

    case "redefinir":
      // Carregar o trabalho guardado não é uma ação do operador: entra como
      // ponto de partida, sem virar entrada e sem poder ser desfeito para um
      // estado que ele nunca viu.
      return { passado: [], presente: acao.estado, futuro: [], pendente: null, emTransacao: false };
  }
}

export interface Historico<T> {
  estado: T;
  /** Muda o estado. Dentro de uma transação, coalesce com as anteriores. */
  aplicar: (proximo: T | ((atual: T) => T)) => void;
  desfazer: () => void;
  refazer: () => void;
  podeDesfazer: boolean;
  podeRefazer: boolean;
  /** Começa a coalescer: tudo até `encerrar` vira uma entrada só. */
  abrir: () => void;
  encerrar: () => void;
  /** Troca o estado sem criar entrada e limpando o histórico. */
  redefinir: (estado: T) => void;
}

export function useHistorico<T>(inicial: T): Historico<T> {
  const [estado, despachar] = useReducer(reduzir as typeof reduzir<T>, {
    passado: [],
    presente: inicial,
    futuro: [],
    pendente: null,
    emTransacao: false,
  });

  const aplicar = useCallback(
    (proximo: T | ((atual: T) => T)) => despachar({ tipo: "aplicar", proximo }),
    []
  );
  const desfazer = useCallback(() => despachar({ tipo: "desfazer" }), []);
  const refazer = useCallback(() => despachar({ tipo: "refazer" }), []);
  const abrir = useCallback(() => despachar({ tipo: "abrir" }), []);
  const encerrar = useCallback(() => despachar({ tipo: "encerrar" }), []);
  const redefinir = useCallback((novo: T) => despachar({ tipo: "redefinir", estado: novo }), []);

  return useMemo(
    () => ({
      estado: estado.presente,
      aplicar,
      desfazer,
      refazer,
      podeDesfazer: estado.passado.length > 0,
      podeRefazer: estado.futuro.length > 0,
      abrir,
      encerrar,
      redefinir,
    }),
    [estado, aplicar, desfazer, refazer, abrir, encerrar, redefinir]
  );
}
