import Link from "next/link";
import { ROTAS_DE_POUSO, ROTAS_PUBLICAS, traduzir } from "@/lib/rotas";
import { FaqAcordeao } from "./FaqAcordeao";
import { TEXTOS } from "@/lib/textos";
import { cn } from "@/lib/utils";
import type { Idioma } from "@/lib/idioma";
import { faqSchema, jsonLd } from "@/lib/seo";

/**
 * O texto que fica abaixo da ferramenta.
 *
 * Existe por um motivo medido: as páginas de ferramenta serviam entre 15 e 98
 * palavras de HTML, sem um único <h2>. Não havia o que ranquear nem de onde um
 * motor generativo extrair resposta.
 *
 * O formato segue o que os estudos de citação mostram sendo extraído: um <h2>
 * escrito como a pergunta que a pessoa realmente faz, e logo abaixo um bloco
 * curto que responde sozinho — sem depender do parágrafo anterior, porque quem
 * recupera pega a passagem isolada. Nada de encher linguiça: o que conta é fato
 * por palavra, não contagem de palavras.
 *
 * A FAQ sai daqui e do JSON-LD ao mesmo tempo, da mesma lista. Texto de FAQPage
 * que não está visível na página é violação da diretriz do Google, e manter
 * duas cópias é garantir que uma envelheça.
 */

export type SecaoDaFerramenta = {
  /** Escrito como pergunta ou afirmação factual, não como rótulo de seção. */
  titulo: string;
  conteudo: React.ReactNode;
};

export type PerguntaDaFerramenta = {
  pergunta: string;
  /** Texto puro: vai igualzinho para a página e para o JSON-LD. */
  resposta: string;
};

export function ConteudoDaFerramenta({
  secoes,
  faq,
  veja,
  idioma = "pt-BR",
  nivel = 2,
  semTituloDaFaq = false,
  emColunas = false,
}: {
  secoes: SecaoDaFerramenta[];
  faq: PerguntaDaFerramenta[];
  /** Hrefs de ferramentas relacionadas, para a âncora sair descritiva. */
  veja: string[];
  idioma?: Idioma;
  /**
   * O nível dos títulos das seções.
   *
   * Nas páginas de ferramenta este bloco é o primeiro conteúdo depois do <h1>,
   * e os títulos são <h2>. Na home ele vive DENTRO de uma seção que já tem o
   * seu <h2>, e aí precisa descer para <h3> — dois <h2> seguidos dizendo a
   * mesma coisa quebram a hierarquia que o leitor de tela usa para navegar.
   */
  nivel?: 2 | 3;
  /** Esconde o título "Perguntas frequentes": a seção que envolve já o diz. */
  semTituloDaFaq?: boolean;
  /**
   * Distribui as seções em colunas, em vez de empilhá-las numa coluna estreita.
   *
   * Na home as grades vão até a borda do contêiner e a prosa parava bem antes,
   * o que deixava metade da seção vazia. Em duas colunas o texto ocupa a mesma
   * largura das grades e cada coluna mantém medida de leitura — que é o motivo
   * de não bastar alargar o parágrafo.
   */
  emColunas?: boolean;
}) {
  const t = TEXTOS[idioma];
  const Titulo = nivel === 3 ? "h3" : "h2";
  const classeDoTitulo = nivel === 3 ? "text-base font-medium tracking-tight" : "text-lg font-medium tracking-tight";
  // As páginas de pouso entram na busca por href junto com as ferramentas: é
  // este bloco que liga /vetorizador a /png-para-svg e de volta, e sem ele as
  // páginas novas ficariam órfãs, alcançáveis só pelo sitemap.
  const catalogo = [
    ...ROTAS_PUBLICAS.map((r) => traduzir(r, idioma)),
    ...ROTAS_DE_POUSO.map((r) => (idioma === "en" && r.en ? r.en : r)),
  ];
  const relacionadas = veja
    .map((href) => catalogo.find((rota) => rota.href === href))
    .filter((rota): rota is (typeof catalogo)[number] => rota !== undefined);

  return (
    <section className={cn("px-6 py-12 sm:py-16", nivel === 3 ? "px-0 sm:px-0" : "border-t border-border sm:px-10")}>
      {faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd(
              faqSchema(faq.map(({ pergunta, resposta }) => ({ question: pergunta, answer: resposta })))
            ),
          }}
        />
      )}

      {/* Aninhado numa seção da home, o bloco alinha à esquerda com o título
          que o antecede; sozinho numa página de ferramenta, centraliza. */}
      <div
        className={cn(
          "flex flex-col gap-10",
          nivel === 3 ? "" : "mx-auto max-w-2xl",
          emColunas ? "gap-x-10 sm:grid sm:grid-cols-2 sm:items-start" : "max-w-2xl"
        )}
      >
        {secoes.map(({ titulo, conteudo }) => (
          <div key={titulo}>
            <Titulo className={classeDoTitulo}>{titulo}</Titulo>
            <div className="mt-3 flex flex-col gap-3 text-sm leading-[1.7] text-zinc-600 dark:text-zinc-300">
              {conteudo}
            </div>
          </div>
        ))}

        {faq.length > 0 && (
          <div className={cn(emColunas && "sm:col-span-2")}>
            {!semTituloDaFaq && <Titulo className={classeDoTitulo}>{t.perguntasFrequentes}</Titulo>}
            <FaqAcordeao perguntas={faq} />
          </div>
        )}

        {relacionadas.length > 0 && (
          <div className={cn(emColunas && "sm:col-span-2")}>
            <Titulo className={classeDoTitulo}>{t.vejaTambem}</Titulo>
            <ul className="mt-3 flex flex-col gap-2">
              {relacionadas.map(({ href, label, descricao }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group inline-flex flex-wrap items-baseline gap-x-2 rounded text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  >
                    <span className="font-medium underline decoration-zinc-300 underline-offset-4 group-hover:decoration-current dark:decoration-zinc-600">
                      {label}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">— {descricao.toLowerCase()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/** Um dado factual destacado no meio do texto. */
export function Dado({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>;
}
