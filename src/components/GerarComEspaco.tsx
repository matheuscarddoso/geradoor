"use client";

import { Space } from "lucide-react";

/**
 * Texto de apoio da ação de gerar.
 *
 * É um <button> de verdade, não um parágrafo: no toque ele precisa ser
 * acionável, já que a barra de espaço não existe ali. No mouse continua com
 * cara de legenda e o atalho segue funcionando pela página inteira.
 *
 * O `self-center` no lugar de `mx-auto`: nas telas de CPF e CNPJ a coluna tem a
 * largura do valor gerado, que é menor que esta legenda. Margem automática em
 * item de flex vira zero quando o espaço livre é negativo — e ainda cancela o
 * alinhamento do container —, então a legenda vazaria toda para um lado só.
 * Com `self-center` ela transborda igual dos dois lados e segue centrada.
 *
 * Ser botão também resolve o foco de teclado: com ele focado, espaço aciona
 * pela via nativa; com o foco em qualquer outro lugar, pelo listener global.
 * Nunca pelos dois ao mesmo tempo, porque o hook ignora alvos acionáveis.
 */
export function GerarComEspaco({ onGerar }: { onGerar: () => void }) {
  return (
    <button
      type="button"
      onClick={onGerar}
      className="block shrink-0 self-center whitespace-nowrap text-center text-xs text-subtle transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-full px-2 py-1"
    >
      <span className="apenas-mouse">
        Pressione
        {/* Margem no chip, não espaço em branco no JSX: o espaço colapsa e o
            rótulo encosta nas palavras vizinhas. */}
        <kbd className="mx-1.5 inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 align-middle font-sans text-subtle">
          <Space className="h-3 w-3" aria-hidden="true" />
          espaço
        </kbd>
        para gerar outro
      </span>
      <span className="apenas-toque">Toque para gerar outro</span>
    </button>
  );
}
