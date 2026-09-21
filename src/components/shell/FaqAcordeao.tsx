import { ChevronDown } from "lucide-react";
import type { PerguntaDaFerramenta } from "./ConteudoDaFerramenta";

/**
 * As perguntas frequentes, em acordeão.
 *
 * Acordeão porque algumas páginas têm dez perguntas, e dez respostas abertas
 * empurram para baixo tudo que vem depois.
 *
 * `<details>` nativo, e não o Accordion do Radix. O Radix DESMONTA o conteúdo
 * fechado: a resposta não ia no HTML servido, só no JSON-LD. Enquanto foi assim
 * o Googlebot, que não clica, leu ~300 palavras a menos por página, e o
 * `FAQPage` passou a descrever texto invisível — exatamente a violação que
 * este bloco existe para evitar. Com `<details>` a resposta está no documento,
 * fechada ou aberta; o buscador a indexa, e o "localizar na página" do
 * navegador abre o item sozinho quando o termo está lá dentro.
 *
 * De quebra vira componente de servidor: zero JavaScript para abrir e fechar.
 * Cada item abre independente dos outros — quem abre duas perguntas quer
 * comparar as respostas.
 *
 * Antes de trocar isto por qualquer componente de acordeão, confira no HTML
 * servido (`curl`, não o inspetor do navegador) que a resposta continua lá.
 */
export function FaqAcordeao({ perguntas }: { perguntas: PerguntaDaFerramenta[] }) {
  return (
    <div className="faq border-t border-border">
      {perguntas.map(({ pergunta, resposta }) => (
        <details key={pergunta} className="group border-b border-border">
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-4 rounded py-4 text-start text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 [&::-webkit-details-marker]:hidden"
          >
            {pergunta}
            <ChevronDown
              aria-hidden
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <p className="pb-4 pe-8 text-sm leading-[1.7] text-zinc-600 dark:text-zinc-300">{resposta}</p>
        </details>
      ))}
    </div>
  );
}
