"use client";

import { useEffect, useState } from "react";
import { PISTA_COOKIE } from "@/lib/acessoDaGrafica";
import { ROTAS, ROTAS_PUBLICAS, type Rota } from "@/lib/rotas";

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
export function useRotasVisiveis(): Rota[] {
  const [liberada, setLiberada] = useState(false);

  useEffect(() => {
    // Compara o nome inteiro para `outra_grafica_liberada` não valer por esta.
    setLiberada(
      document.cookie
        .split("; ")
        .some((pedaco) => pedaco.split("=")[0] === PISTA_COOKIE)
    );
  }, []);

  return liberada ? ROTAS : ROTAS_PUBLICAS;
}
