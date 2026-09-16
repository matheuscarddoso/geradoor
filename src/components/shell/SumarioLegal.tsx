"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TEXTOS } from "@/lib/textos";
import type { Idioma } from "@/lib/idioma";

/**
 * O sumário fixo das páginas de texto.
 *
 * Acompanha a rolagem e marca em que seção a leitura está. É a única parte
 * dessas páginas que precisa de JavaScript, e por isso vive sozinha aqui: o
 * texto em si continua saindo pronto do servidor.
 */
export function SumarioLegal({
  secoes,
  idioma = "pt-BR",
}: {
  secoes: { id: string; titulo: string }[];
  idioma?: Idioma;
}) {
  const [ativa, setAtiva] = useState(secoes[0]?.id ?? "");

  useEffect(() => {
    const alvos = secoes
      .map(({ id }) => document.getElementById(id))
      .filter((elemento): elemento is HTMLElement => elemento !== null);
    if (alvos.length === 0) return;

    // A faixa de observação é o terço de cima da janela: a seção ativa passa a
    // ser a última cujo início já subiu além dela, que é como a leitura anda.
    const observador = new IntersectionObserver(
      (entradas) => {
        const visiveis = entradas.filter((entrada) => entrada.isIntersecting);
        if (visiveis.length === 0) return;
        const primeira = visiveis.reduce((melhor, entrada) =>
          entrada.boundingClientRect.top < melhor.boundingClientRect.top ? entrada : melhor
        );
        setAtiva(primeira.target.id);
      },
      { rootMargin: "-8% 0px -70% 0px", threshold: 0 }
    );

    alvos.forEach((alvo) => observador.observe(alvo));
    return () => observador.disconnect();
  }, [secoes]);

  return (
    <nav aria-label={TEXTOS[idioma].nestaPagina} className="sticky top-10">
      <p className="text-sm font-semibold tracking-tight text-foreground">{TEXTOS[idioma].nestaPagina}</p>
      <ul className="mt-5 flex flex-col">
        {secoes.map(({ id, titulo }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={ativa === id ? "true" : undefined}
              className={cn(
                "block rounded py-1.5 text-sm leading-snug transition-colors duration-150",
                "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                ativa === id ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {titulo}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
