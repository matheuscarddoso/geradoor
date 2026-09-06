"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Histórico do que foi gerado, guardado no navegador.
 *
 * Store externo em vez de contexto porque quem escreve (as páginas) e quem lê
 * (a sidebar) estão em ramos diferentes da árvore. `useSyncExternalStore`
 * resolve isso e já trata o render do servidor, onde localStorage não existe.
 */

export type TipoRecente =
  | "cpf"
  | "cnpj"
  | "cartao"
  | "telefone"
  | "instagram"
  | "qrcode"
  | "whatsapp";

export interface Recente {
  id: string;
  tipo: TipoRecente;
  /** Texto exibido na lista. */
  label: string;
  /** Destino ao clicar. Ausente quando o item não é um link. */
  href?: string;
  /** Momento do registro, em milissegundos. */
  em: number;
}

const CHAVE = "geradoor:recentes";
/** Teto da lista. Acima disso a sidebar vira parede de texto. */
const LIMITE = 12;

let cache: Recente[] = [];
let carregado = false;
const inscritos = new Set<() => void>();

/**
 * Toda leitura e escrita passa por try/catch: em janela anônima ou com dados
 * de site bloqueados, o acesso a localStorage lança em vez de devolver null.
 */
function ler(): Recente[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.filter(
      (item): item is Recente =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Recente).id === "string" &&
        typeof (item as Recente).label === "string"
    );
  } catch {
    return [];
  }
}

function escrever(lista: Recente[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // Sem persistência a lista ainda funciona na sessão atual.
  }
}

function notificar() {
  inscritos.forEach((fn) => fn());
}

function inscrever(fn: () => void) {
  inscritos.add(fn);
  // Mantém abas abertas em sincronia.
  const aoMudarStorage = (evento: StorageEvent) => {
    if (evento.key === CHAVE) {
      cache = ler();
      notificar();
    }
  };
  window.addEventListener("storage", aoMudarStorage);
  return () => {
    inscritos.delete(fn);
    window.removeEventListener("storage", aoMudarStorage);
  };
}

function snapshot(): Recente[] {
  if (!carregado) {
    cache = ler();
    carregado = true;
  }
  return cache;
}

/** No servidor a lista é sempre vazia, e precisa ser a MESMA referência. */
const VAZIO: Recente[] = [];
const snapshotServidor = () => VAZIO;

export function useRecentes() {
  const recentes = useSyncExternalStore(inscrever, snapshot, snapshotServidor);

  const registrar = useCallback(
    (entrada: Omit<Recente, "id" | "em">) => {
      const item: Recente = {
        ...entrada,
        id: `${entrada.tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        em: Date.now(),
      };
      // Remove duplicata do mesmo valor antes de inserir, para não repetir
      // a mesma linha quando alguém gera o mesmo item duas vezes.
      const semDuplicata = snapshot().filter(
        (existente) => existente.label !== item.label
      );
      cache = [item, ...semDuplicata].slice(0, LIMITE);
      escrever(cache);
      notificar();
    },
    []
  );

  const limpar = useCallback(() => {
    cache = [];
    escrever(cache);
    notificar();
  }, []);

  return { recentes, registrar, limpar };
}
