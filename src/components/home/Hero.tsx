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
      {/* A fotografia e o que a escurece. `object-cover` com foco à direita
          mantém a lua e o mar visíveis quando a tela estreita. */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[760px] overflow-hidden sm:h-[820px]">
        <picture>
          <source media="(max-width: 640px)" srcSet="/hero-noite-p.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-noite.webp"
            alt=""
            width={1920}
            height={1081}
            fetchPriority="high"
            decoding="async"
            className="h-full w-full object-cover object-[70%_center]"
          />
        </picture>
        {/* Três camadas, cada uma com um trabalho.
            A vertical firma o topo, onde fica o cabeçalho, e o pé, de onde a
            tela do produto emerge. A horizontal escurece só o lado esquerdo —
            é onde o texto vive, e sem ela o subtítulo cai em cima das colunas
            do templo e some. A última fecha na cor do fundo, para a fotografia
            não terminar num corte reto. */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1020]/75 via-[#0a1020]/25 to-[#0a1020]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1020]/85 via-[#0a1020]/35 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <Link href={inicio} className="flex items-center gap-2 text-white">
            <MarcaGeradoor size={22} />
            <span className="font-logo text-base font-medium tracking-tight">Geradoor</span>
          </Link>
          <div className="text-white">
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:px-8 sm:pb-14 sm:pt-24">
          <Link
            href={texto.aviso.href}
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] py-1 pe-2.5 ps-1.5 text-[13px] text-white/80 backdrop-blur transition-colors duration-150 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <EtiquetaNovo idioma={idioma} />
            <span className="truncate">{texto.aviso.texto}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <h1 className="mt-6 max-w-3xl text-balance text-[34px] font-medium leading-[1.06] tracking-[-0.03em] text-white sm:text-[56px]">
            {texto.titulo.antes}
            <br />
            <span className="text-white/55">{texto.titulo.destaque}</span>
          </h1>

          <p className="mt-5 max-w-lg text-balance text-[15px] leading-relaxed text-white/65">{texto.subtitulo}</p>

          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            <Link
              href={texto.acao.href}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {texto.acao.texto}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={texto.secundaria.href}
              className="inline-flex items-center rounded-full border border-white/25 px-4 py-2.5 text-sm text-white/85 transition-colors duration-150 hover:border-white/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {texto.secundaria.texto}
            </Link>
          </div>

          <p className="mt-4 text-[13px] text-white/45">{texto.nota}</p>
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
    <div className="overflow-hidden rounded-xl border border-white/12 bg-zinc-950 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)]">
      {children}
    </div>
  );
}
