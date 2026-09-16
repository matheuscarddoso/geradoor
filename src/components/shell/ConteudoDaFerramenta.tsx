import Link from "next/link";
import { ROTAS_DE_POUSO, ROTAS_PUBLICAS } from "@/lib/rotas";
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
}: {
  secoes: SecaoDaFerramenta[];
  faq: PerguntaDaFerramenta[];
  /** Hrefs de ferramentas relacionadas, para a âncora sair descritiva. */
  veja: string[];
}) {
  // As páginas de pouso entram na busca por href junto com as ferramentas: é
  // este bloco que liga /vetorizador a /png-para-svg e de volta, e sem ele as
  // páginas novas ficariam órfãs, alcançáveis só pelo sitemap.
  const catalogo = [...ROTAS_PUBLICAS, ...ROTAS_DE_POUSO];
  const relacionadas = veja
    .map((href) => catalogo.find((rota) => rota.href === href))
    .filter((rota): rota is (typeof catalogo)[number] => rota !== undefined);

  return (
    <section className="border-t border-border px-6 py-12 sm:px-10 sm:py-16">
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

      <div className="mx-auto flex max-w-2xl flex-col gap-10">
        {secoes.map(({ titulo, conteudo }) => (
          <div key={titulo}>
            <h2 className="text-lg font-medium tracking-tight">{titulo}</h2>
            <div className="mt-3 flex flex-col gap-3 text-sm leading-[1.7] text-zinc-600 dark:text-zinc-300">
              {conteudo}
            </div>
          </div>
        ))}

        {faq.length > 0 && (
          <div>
            <h2 className="text-lg font-medium tracking-tight">Perguntas frequentes</h2>
            <dl className="mt-4 flex flex-col divide-y divide-border border-t border-border">
              {faq.map(({ pergunta, resposta }) => (
                <div key={pergunta} className="py-4">
                  <dt className="text-sm font-medium">{pergunta}</dt>
                  <dd className="mt-1.5 text-sm leading-[1.7] text-zinc-600 dark:text-zinc-300">{resposta}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {relacionadas.length > 0 && (
          <div>
            <h2 className="text-lg font-medium tracking-tight">Veja também</h2>
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
