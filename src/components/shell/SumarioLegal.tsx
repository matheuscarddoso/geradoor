"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * O sumário fixo das páginas de texto.
 *
 * Acompanha a rolagem e marca em que seção a leitura está. É a única parte
 * dessas páginas que precisa de JavaScript, e por isso vive sozinha aqui: o
 * texto em si continua saindo pronto do servidor.
 */
export function SumarioLegal({ secoes }: { secoes: { id: string; titulo: string }[] }) {
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
    <nav aria-label="Nesta página" className="sticky top-8">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Nesta página</p>
      <ul className="mt-3 flex flex-col border-s border-border">
        {secoes.map(({ id, titulo }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={ativa === id ? "true" : undefined}
              className={cn(
                "-ms-px block border-s border-transparent py-1.5 ps-3 text-[13px] leading-snug transition-colors duration-150",
                "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                ativa === id ? "border-foreground text-foreground" : "text-muted-foreground"
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
