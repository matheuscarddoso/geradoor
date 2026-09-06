"use client";

import { useEffect } from "react";

/**
 * Decide se um toque na barra de espaço deve gerar um novo valor.
 *
 * Está separada do hook porque é a regra que segura o atalho da página inteira:
 * como função pura, dá para verificá-la sem DOM.
 *
 * Três guardas, todas necessárias:
 *
 * 1. Campos editáveis ficam de fora — dentro deles espaço é espaço. Um campo
 *    somente-leitura não conta: ele só exibe o valor gerado, e também copia no
 *    clique, então o foco cai nele o tempo todo. Se ele bloqueasse o atalho,
 *    copiar uma vez desligaria o espaço pelo resto da visita.
 * 2. Botões e links ficam de fora porque espaço é a tecla de ativação nativa
 *    deles. Sem isso, com o foco no botão de copiar, o mesmo toque copiaria e
 *    geraria ao mesmo tempo.
 * 3. Modificadores ficam de fora: Cmd+Espaço e Ctrl+Espaço pertencem ao sistema.
 */
export function espacoDeveGerar(evento: KeyboardEvent): boolean {
  if (evento.code !== "Space") return false;
  if (evento.metaKey || evento.ctrlKey || evento.altKey) return false;

  const alvo = evento.target as HTMLElement | null;
  if (!alvo) return false;

  const tag = alvo.tagName;
  const campo = tag === "INPUT" || tag === "TEXTAREA";
  const somenteLeitura =
    campo && (alvo as HTMLInputElement | HTMLTextAreaElement).readOnly;

  const editavel = (campo && !somenteLeitura) || tag === "SELECT" || alvo.isContentEditable;
  const ativavel =
    tag === "BUTTON" ||
    tag === "A" ||
    alvo.getAttribute("role") === "button" ||
    alvo.closest("button, a, [role='button']") !== null;

  return !editavel && !ativavel;
}

/**
 * Dispara uma ação quando a barra de espaço é pressionada na página.
 *
 * O preventDefault evita a rolagem que o espaço causa por padrão.
 */
export function useEspacoParaGerar(acao: () => void, ativo = true) {
  useEffect(() => {
    if (!ativo) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (!espacoDeveGerar(evento)) return;
      evento.preventDefault();
      acao();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [acao, ativo]);
}
