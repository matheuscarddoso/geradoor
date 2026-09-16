import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarcaGeradoor } from "@/components/ui/marca-geradoor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EtiquetaNovo } from "@/components/shell/EtiquetaNovo";
import type { Idioma } from "@/lib/idioma";

/**
 * A abertura da página.
 *
 * A composição vem de uma referência que o autor trouxe: fotografia sangrando
 * de ponta a ponta, título encostado à esquerda — e não centrado —, dois botões
 * e, logo abaixo, uma tela do produto em tamanho grande que avança para fora da
 * fotografia e invade a seção seguinte.
 *
 * Esse avanço é o que faz a peça funcionar. Uma imagem contida dentro da hero
 * fica decorativa; uma que atravessa a borda amarra as duas seções e obriga o
 * olho a descer. É o motivo de a hero não ter altura fixa aqui.
 *
 * A fotografia é escura por natureza, então o texto branco vive sobre ela sem
 * precisar de véu pesado — o degradê existe só para firmar o pé da imagem, onde
 * a tela do produto começa.
 */

export type TextoDaHero = {
  aviso: { texto: string; href: string };
  titulo: { antes: string; destaque: string };
  subtitulo: string;
  acao: { texto: string; href: string };
  secundaria: { texto: string; href: string };
  /** O que a legenda abaixo dos botões diz. Uma linha, factual. */
  nota: string;
  /** Texto alternativo da tela do produto: descreve o que ela mostra. */
  legendaDaTela: string;
};

export function Hero({
  idioma,
  texto,
  children,
}: {
  idioma: Idioma;
  texto: TextoDaHero;
  /** A tela do produto, que avança para fora da fotografia. */
  children?: React.ReactNode;
}) {
  const inicio = idioma === "en" ? "/en" : "/";

  return (
    <div className="relative">
      {/* A fotografia e o que a torna legível. Duas versões da mesma cena: a
          noturna no tema escuro, a diurna no claro — a troca é por CSS, em
          globals.css, para o navegador baixar só uma. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[760px] overflow-hidden sm:h-[820px]">
        <div className="hero-fundo h-full w-full" />
        {/* O véu, e é aqui que os dois temas divergem de verdade.
            No escuro o texto é branco e o véu é azul-noite. No claro a foto tem
            céu azul e mar brilhante, onde branco não se lê: o véu vira branco e
            o texto, escuro. O horizontal é o que importa, porque o texto mora à
            esquerda; o vertical firma o topo e o pé, de onde a tela emerge. */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/30 to-white/85 dark:from-[#0a1020]/75 dark:via-[#0a1020]/25 dark:to-[#0a1020]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/45 to-transparent dark:from-[#0a1020]/85 dark:via-[#0a1020]/35 dark:to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <Link href={inicio} className="flex items-center gap-2 text-zinc-900 dark:text-white">
            <MarcaGeradoor size={22} />
            <span className="font-logo text-base font-medium tracking-tight">Geradoor</span>
          </Link>
          <div className="text-zinc-900 dark:text-white">
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-8 sm:pb-14 sm:pt-24">
          <Link
            href={texto.aviso.href}
            className="group inline-flex items-center gap-2 rounded-full border border-zinc-900/15 bg-white/50 py-1 pe-2.5 ps-1.5 text-[13px] text-zinc-700 backdrop-blur transition-colors duration-150 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-white/20 dark:bg-white/[0.06] dark:text-white/80 dark:hover:text-white dark:focus-visible:ring-white/60"
          >
            <EtiquetaNovo idioma={idioma} />
            <span className="truncate">{texto.aviso.texto}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <h1 className="mt-6 max-w-3xl text-balance text-[34px] font-medium leading-[1.06] tracking-[-0.03em] text-zinc-900 sm:text-[56px] dark:text-white">
            {texto.titulo.antes}
            <br />
            <span className="text-zinc-900/45 dark:text-white/55">{texto.titulo.destaque}</span>
          </h1>

          <p className="mt-5 max-w-lg text-balance text-[15px] leading-relaxed text-zinc-600 dark:text-white/65">{texto.subtitulo}</p>

          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <Link
              href={texto.acao.href}
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 dark:bg-white dark:text-zinc-900 dark:focus-visible:ring-white/60"
            >
              {texto.acao.texto}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={texto.secundaria.href}
              className="inline-flex items-center rounded-full border border-zinc-900/20 px-4 py-2.5 text-sm text-zinc-700 transition-colors duration-150 hover:border-zinc-900/50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-white/25 dark:text-white/85 dark:hover:border-white/50 dark:hover:text-white dark:focus-visible:ring-white/60"
            >
              {texto.secundaria.texto}
            </Link>
          </div>

          <p className="mt-4 text-[13px] text-zinc-500 dark:text-white/45">{texto.nota}</p>
        </div>

        {children && <div className="mx-auto max-w-6xl px-4 sm:px-8">{children}</div>}
      </div>
    </div>
  );
}

/**
 * A moldura da tela do produto.
 *
 * Borda clara e sombra funda: é o que dá a ela a aparência de um objeto pousado
 * sobre a fotografia, e não de um recorte colado nela.
 */
export function TelaDoProduto({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-900/10 bg-zinc-950 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.35)] dark:border-white/12 dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)]">
      {children}
    </div>
  );
}
