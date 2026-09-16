import { cn } from "@/lib/utils";
import type { Idioma } from "@/lib/idioma";

/**
 * Etiqueta "Novo" ao lado de uma ferramenta recém-lançada.
 *
 * É a única cor da navegação, que é toda em cinza — e é por isso que
 * funciona: um azul entre cinzas se lê de relance sem gritar. O azul é o dos
 * links do site, então não inaugura uma cor nova no sistema.
 */
export function EtiquetaNovo({ className, idioma = "pt-BR" }: { className?: string; idioma?: Idioma }) {
  return (
    <span
      className={cn(
        // Compacta de propósito: na sidebar de 240 px ela divide a linha com
        // "Removedor de fundo", e um pixel a mais de respiro cortava o rótulo.
        "shrink-0 rounded-full bg-blue-500/10 px-[5px] text-[10px] font-medium leading-4",
        "text-blue-600 dark:bg-blue-400/15 dark:text-blue-300",
        className
      )}
    >
      {idioma === "en" ? "New" : "Novo"}
    </span>
  );
}
