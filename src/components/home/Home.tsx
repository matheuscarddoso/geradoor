import Link from "next/link";
import { ArrowRight, Cpu, EyeOff, Gauge } from "lucide-react";
import { Rodape } from "@/components/shell/Rodape";
import { EtiquetaNovo } from "@/components/shell/EtiquetaNovo";
import { ConteudoDaFerramenta, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { BlocoDeChamada, CartaoNumerado, MarcadorDeSecao, Pilula, TituloDaSecao } from "./Secoes";
import { Hero, TelaDoProduto, type TextoDaHero } from "./Hero";
import { rotasPublicas } from "@/lib/rotas";
import type { Idioma } from "@/lib/idioma";

/**
 * A home, nos dois idiomas.
 *
 * A primeira tela não mudou: continua sendo a hero com a grade de ferramentas
 * inteira à vista, sem rolar. O que veio depois é a estrutura de um wireframe
 * de referência — marcador numerado por seção, pílula anunciando o assunto,
 * fileira de cartões e bloco invertido no fim.
 *
 * Um cuidado que a referência ensina e que vale repetir: cada seção começa com
 * um fio de ponta a ponta e um marcador. É isso que faz a página parecer
 * construída sobre uma régua, e não uma pilha de blocos soltos.
 */

export type ConteudoDaHome = {
  hero: TextoDaHero;
  ferramentas: { marcador: string; pilula: string; titulo: { antes: string; destaque: string } };
  pilares: {
    marcador: string;
    pilula: string;
    titulo: { antes: string; destaque: string };
    cartoes: { titulo: string; texto: string }[];
  };
  detalhe: { marcador: string; pilula: string; titulo: { antes: string; destaque: string } };
  perguntas: { marcador: string; pilula: string; titulo: { antes: string; destaque: string } };
  chamada: { titulo: string; texto: string; acao: string; secundaria: string };
  secoes: SecaoDaFerramenta[];
  faq: PerguntaDaFerramenta[];
};

const ICONES = [Cpu, EyeOff, Gauge];

export function Home({ idioma, conteudo }: { idioma: Idioma; conteudo: ConteudoDaHome }) {
  const rotas = rotasPublicas(idioma);
  const inicio = idioma === "en" ? "/en" : "/";
  const destaque = rotas.find((r) => r.novo) ?? rotas[0];

  return (
    <div className="flex min-h-dvh flex-col" lang={idioma === "en" ? "en" : undefined}>
      <Hero idioma={idioma} texto={conteudo.hero}>
        <TelaDoProduto>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/hero-produto.webp"
            alt={conteudo.hero.legendaDaTela}
            width={1440}
            height={900}
            className="w-full"
          />
        </TelaDoProduto>
      </Hero>

      {/* [01] As ferramentas, na grade de fios. Saiu da hero: ali competia com
          o título, e aqui tem a seção inteira para si. */}
      <div className="pt-24 sm:pt-32">
        <MarcadorDeSecao numero={1}>{conteudo.ferramentas.marcador}</MarcadorDeSecao>
      </div>
      <section id="ferramentas" className="scroll-mt-4 border-b border-border px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start gap-4">
            <Pilula>{conteudo.ferramentas.pilula}</Pilula>
            <TituloDaSecao destaque={conteudo.ferramentas.titulo.destaque}>
              {conteudo.ferramentas.titulo.antes}
            </TituloDaSecao>
          </div>
          <nav className="mt-10 border-t border-border">
            <ul className="grid grid-cols-2 border-s border-border sm:grid-cols-3">
              {rotas.map(({ href, label, labelCurto, descricao, icon: Icone, novo }, indice) => (
                <li
                  key={href}
                  className={`border-b border-e border-border ${
                    indice === rotas.length - 1 ? "col-span-2 sm:col-span-1" : ""
                  }`}
                >
                  <Link
                    href={href}
                    className="group flex h-full flex-col gap-5 p-3.5 transition-colors duration-150 hover:bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 sm:gap-8 sm:p-5"
                  >
                    <span className="hidden flex-1 items-center justify-center py-3 sm:flex">
                      <Icone
                        className="icone-tracado h-7 w-7 text-zinc-400 transition-colors duration-150 group-hover:text-foreground dark:text-zinc-600"
                        strokeWidth={1.25}
                      />
                    </span>
                    <span className="block">
                      <span className="flex items-center gap-1.5">
                        <Icone className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-600 sm:hidden" />
                        <span className="truncate text-sm font-medium sm:hidden">{labelCurto ?? label}</span>
                        <span className="hidden truncate text-sm font-medium sm:inline">{label}</span>
                        {novo && <EtiquetaNovo idioma={idioma} />}
                      </span>
                      <span className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">
                        {descricao}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      {/* [02] Os três pilares, na fileira de cartões numerados. */}
      <MarcadorDeSecao numero={2}>{conteudo.pilares.marcador}</MarcadorDeSecao>
      <section className="border-b border-border px-4 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-start gap-4">
            <Pilula>{conteudo.pilares.pilula}</Pilula>
            <TituloDaSecao destaque={conteudo.pilares.titulo.destaque}>
              {conteudo.pilares.titulo.antes}
            </TituloDaSecao>
          </div>
          <div className="mt-10 grid border-s border-t border-border sm:grid-cols-3">
            {conteudo.pilares.cartoes.map((cartao, i) => {
              const Icone = ICONES[i] ?? Cpu;
              return (
                <CartaoNumerado
                  key={cartao.titulo}
                  numero={i + 1}
                  titulo={cartao.titulo}
                  icone={<Icone className="h-4 w-4" strokeWidth={1.5} />}
                >
                  {cartao.texto}
                </CartaoNumerado>
              );
            })}
          </div>
        </div>
      </section>

      {/* [03] O texto longo: o que sai do aparelho, o cadastro, o dado de teste. */}
      <MarcadorDeSecao numero={3}>{conteudo.detalhe.marcador}</MarcadorDeSecao>
      <section className="border-b border-border px-4 pt-12 sm:px-8 sm:pt-16">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4">
          <Pilula>{conteudo.detalhe.pilula}</Pilula>
          <TituloDaSecao destaque={conteudo.detalhe.titulo.destaque}>
            {conteudo.detalhe.titulo.antes}
          </TituloDaSecao>
        </div>
        <ConteudoDaFerramenta secoes={conteudo.secoes} faq={[]} veja={[]} idioma={idioma} nivel={3} />
      </section>

      {/* [04] As perguntas. */}
      <MarcadorDeSecao numero={4}>{conteudo.perguntas.marcador}</MarcadorDeSecao>
      <section className="border-b border-border px-4 pt-12 sm:px-8 sm:pt-16">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4">
          <Pilula>{conteudo.perguntas.pilula}</Pilula>
          <TituloDaSecao destaque={conteudo.perguntas.titulo.destaque}>
            {conteudo.perguntas.titulo.antes}
          </TituloDaSecao>
        </div>
        <ConteudoDaFerramenta secoes={[]} faq={conteudo.faq} veja={[]} idioma={idioma} nivel={3} semTituloDaFaq />
      </section>

      <BlocoDeChamada
        titulo={conteudo.chamada.titulo}
        acao={
          <>
            <Link
              href={destaque.href}
              className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-medium text-foreground transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
            >
              {conteudo.chamada.acao}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={idioma === "en" ? "/en/privacy" : "/privacidade"}
              className="inline-flex items-center rounded-full border border-background/25 px-4 py-2 text-sm text-background/80 transition-colors duration-150 hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
            >
              {conteudo.chamada.secundaria}
            </Link>
          </>
        }
      >
        {conteudo.chamada.texto}
      </BlocoDeChamada>

      <Rodape idioma={idioma} />
    </div>
  );
}
