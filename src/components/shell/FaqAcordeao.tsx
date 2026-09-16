"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { PerguntaDaFerramenta } from "./ConteudoDaFerramenta";

/**
 * As perguntas frequentes, em acordeão.
 *
 * Antes era uma lista de definições com tudo aberto. Vira acordeão porque a
 * página passou a ter dez perguntas em alguns lugares, e dez respostas abertas
 * empurram para baixo tudo que vem depois — quem chega procurando uma resposta
 * específica tinha de varrer o texto inteiro.
 *
 * Um detalhe que precisa ficar claro, porque é fácil errar: o `FAQPage` do
 * JSON-LD continua saindo da MESMA lista, e a resposta continua no HTML servido.
 * Acordeão fechado esconde com CSS, não remove do documento — se removesse,
 * seria texto de FAQPage invisível ao leitor, que é violação da diretriz do
 * Google, e o buscador deixaria de ver o conteúdo.
 *
 * `type="multiple"` sem item aberto por padrão: quem abre duas perguntas quer
 * comparar as duas respostas, e fechar a primeira ao abrir a segunda seria
 * trabalhar contra isso.
 */
export function FaqAcordeao({ perguntas }: { perguntas: PerguntaDaFerramenta[] }) {
  return (
    <Accordion type="multiple" className="border-t border-border">
      {perguntas.map(({ pergunta, resposta }) => (
        <AccordionItem key={pergunta} value={pergunta} className="border-border">
          <AccordionTrigger className="gap-4 py-4 text-start text-[15px] font-medium hover:no-underline">
            {pergunta}
          </AccordionTrigger>
          <AccordionContent className="pb-4 pe-8 text-sm leading-[1.7] text-zinc-600 dark:text-zinc-300">
            {resposta}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
