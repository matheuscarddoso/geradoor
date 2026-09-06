"use client";

import { useEffect } from "react";

/**
 * Dispara uma ação quando a barra de espaço é pressionada na página.
 *
 * Três guardas, todas necessárias:
 *
 * 1. Campos de texto ficam de fora — dentro deles espaço é espaço.
 * 2. Botões e links ficam de fora porque espaço é a tecla de ativação nativa
 *    deles. Sem isso, com o foco no botão de copiar, o mesmo toque copiaria e
 *    geraria ao mesmo tempo.
 * 3. Modificadores ficam de fora: Cmd+Espaço e Ctrl+Espaço pertencem ao sistema.
 *
 * O preventDefault evita a rolagem que o espaço causa por padrão.
 */
export function useEspacoParaGerar(acao: () => void, ativo = true) {
  useEffect(() => {
    if (!ativo) return;

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.code !== "Space") return;
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;

      const alvo = evento.target as HTMLElement | null;
      if (!alvo) return;

      const tag = alvo.tagName;
      const editavel =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        alvo.isContentEditable;
      const ativavel =
        tag === "BUTTON" ||
        tag === "A" ||
        alvo.getAttribute("role") === "button" ||
        alvo.closest("button, a, [role='button']") !== null;

      if (editavel || ativavel) return;

      evento.preventDefault();
      acao();
    };

    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [acao, ativo]);
}
