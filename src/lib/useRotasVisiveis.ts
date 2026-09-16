"use client";

import { useEffect, useState } from "react";
import { PISTA_COOKIE } from "@/lib/acessoDaGrafica";
import { usePathname } from "next/navigation";
import { ROTAS, ROTAS_PUBLICAS, traduzir, type RotaTraduzida } from "@/lib/rotas";
import { idiomaDoCaminho } from "@/lib/idioma";

/**
 * As ferramentas que este navegador deve ver no menu e na busca.
 *
 * As privadas entram só se a máquina já passou pelo portão. A leitura é num
 * efeito, e não durante a renderização, porque o HTML vem do servidor sem
 * saber de cookie nenhum: ler `document.cookie` no corpo do componente daria
 * uma marcação diferente da do servidor e quebraria a hidratação. O item
 * aparece um quadro depois de montar, que num menu ninguém percebe.
 *
 * Vale repetir que a pista não autoriza nada: forjá-la só acrescenta uma linha
 * no menu, e o clique cai na tela de senha do mesmo jeito.
 */
export function useRotasVisiveis(): RotaTraduzida[] {
  const [liberada, setLiberada] = useState(false);
  const caminho = usePathname();

  useEffect(() => {
    // Compara o nome inteiro para `outra_grafica_liberada` não valer por esta.
    setLiberada(
      document.cookie
        .split("; ")
        .some((pedaco) => pedaco.split("=")[0] === PISTA_COOKIE)
    );
  }, []);

  const idioma = idiomaDoCaminho(caminho);
  return (liberada ? ROTAS : ROTAS_PUBLICAS).map((rota) => traduzir(rota, idioma));
}
