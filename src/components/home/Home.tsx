import Link from "next/link";
import { ArrowRight, Cpu, EyeOff, Gauge } from "lucide-react";
import { Rodape } from "@/components/shell/Rodape";
import { EtiquetaNovo } from "@/components/shell/EtiquetaNovo";
import { ConteudoDaFerramenta, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { BlocoDeChamada, CabecalhoDaSecao, CartaoNumerado, MarcadorDeSecao } from "./Secoes";
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

/**
 * O cabeçalho de uma seção.
 *
 * `marcador` é o que vai na régua de cima, em caixa alta; `pilula` é a
 * sobrancelha dentro da seção; `apoio` é o parágrafo que explica o título.
 */
type SecaoDaHome = {
  marcador: string;
  pilula: string;
  titulo: { antes: string; destaque: string };
  apoio: string;
};

export type ConteudoDaHome = {
  hero: TextoDaHero;
  ferramentas: SecaoDaHome;
  pilares: SecaoDaHome & { cartoes: { titulo: string; texto: string }[] };
  detalhe: SecaoDaHome;
  perguntas: SecaoDaHome;
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
          <CabecalhoDaSecao
            sobrancelha={conteudo.ferramentas.pilula}
            titulo={conteudo.ferramentas.titulo.antes}
            destaque={conteudo.ferramentas.titulo.destaque}
          >
            {conteudo.ferramentas.apoio}
          </CabecalhoDaSecao>
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
          <CabecalhoDaSecao
            sobrancelha={conteudo.pilares.pilula}
            titulo={conteudo.pilares.titulo.antes}
            destaque={conteudo.pilares.titulo.destaque}
          >
            {conteudo.pilares.apoio}
          </CabecalhoDaSecao>
          <div className="mt-10 grid border-s border-t border-border sm:grid-cols-3">
            {conteudo.pilares.cartoes.map((cartao, i) => {
              const Icone = ICONES[i] ?? Cpu;
              return (
                <CartaoNumerado
                  key={cartao.titulo}
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
        <div className="mx-auto max-w-5xl">
          <CabecalhoDaSecao
            sobrancelha={conteudo.detalhe.pilula}
            titulo={conteudo.detalhe.titulo.antes}
            destaque={conteudo.detalhe.titulo.destaque}
          >
            {conteudo.detalhe.apoio}
          </CabecalhoDaSecao>
        </div>
        <div className="mx-auto max-w-5xl">
          <ConteudoDaFerramenta secoes={conteudo.secoes} faq={[]} veja={[]} idioma={idioma} nivel={3} />
        </div>
      </section>

      {/* [04] As perguntas. */}
      <MarcadorDeSecao numero={4}>{conteudo.perguntas.marcador}</MarcadorDeSecao>
      <section className="border-b border-border px-4 pt-12 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-5xl">
          <CabecalhoDaSecao
            sobrancelha={conteudo.perguntas.pilula}
            titulo={conteudo.perguntas.titulo.antes}
            destaque={conteudo.perguntas.titulo.destaque}
          >
            {conteudo.perguntas.apoio}
          </CabecalhoDaSecao>
        </div>
        <div className="mx-auto max-w-5xl">
          <ConteudoDaFerramenta secoes={[]} faq={conteudo.faq} veja={[]} idioma={idioma} nivel={3} semTituloDaFaq />
        </div>
      </section>

      <BlocoDeChamada
        titulo={conteudo.chamada.titulo}
        acao={
          <>
            <Link
              href={destaque.href}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {conteudo.chamada.acao}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={idioma === "en" ? "/en/privacy" : "/privacidade"}
              className="inline-flex items-center rounded-full border border-white/35 px-4 py-2.5 text-sm text-white/90 transition-colors duration-150 hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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
