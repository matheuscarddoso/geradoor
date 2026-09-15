import { ATUALIZACAO_LEGAL } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { SumarioLegal } from "./SumarioLegal";

/**
 * A folha das páginas de texto: privacidade, termos e cookies.
 *
 * Texto de política se lê de má vontade. O que o desenho pode fazer é não
 * atrapalhar: uma coluna de medida confortável, um sumário fixo ao lado para
 * pular direto ao assunto, e o resto em fio de 1px — a mesma régua que a home
 * usa na grade de ferramentas.
 */

export type SecaoLegal = {
  titulo: string;
  conteudo: React.ReactNode;
};

/**
 * O id da âncora de uma seção, derivado do próprio título.
 *
 * Sai do título e não de um campo à parte para não existir a chance de um
 * andar sem o outro: o sumário e a seção são gerados da mesma lista.
 */
export function idDaSecao(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A cruz que marca um vértice do desenho.
 *
 * Fica centrada no canto, metade para dentro e metade para fora, que é o que
 * faz a linha tracejada parecer um recorte de planta e não uma caixa.
 */
function Cruz({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 10"
      className={cn(
        "pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 text-zinc-300 dark:text-zinc-700",
        className
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M5 0v10M0 5h10" />
    </svg>
  );
}

/** Caixa de linha tracejada, com uma cruz em cada vértice. */
export function Moldura({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative border border-dashed border-border", className)}>
      <Cruz className="left-0 top-0" />
      <Cruz className="right-0 top-0 translate-x-1/2" />
      <Cruz className="bottom-0 left-0 translate-y-1/2" />
      <Cruz className="bottom-0 right-0 translate-x-1/2 translate-y-1/2" />
      {children}
    </div>
  );
}

export function Lista({ children }: { children: React.ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-2 ps-5 marker:text-zinc-300 dark:marker:text-zinc-600">{children}</ul>
  );
}

export function Termo({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>;
}

export function PaginaLegal({ titulo, secoes }: { titulo: string; secoes: SecaoLegal[] }) {
  return (
    <>
      {/* A faixa do título ocupa a largura inteira da folha: as linhas
          tracejadas de cima e de baixo atravessam de trilho a trilho, e é nos
          quatro encontros que ficam as cruzes. Sem margem em volta — o vão
          faria a moldura flutuar dentro da página em vez de fazer parte
          dela. */}
      <Moldura className="border-x-0 px-4 py-10 sm:px-8 sm:py-14">
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">{titulo}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">Atualizado em {ATUALIZACAO_LEGAL}</p>
      </Moldura>

      {/* O sumário fica numa coluna própria a partir de lg. Abaixo disso não há
          largura para duas colunas, e um sumário empilhado antes do texto só
          empurraria a leitura para baixo. */}
      <div className="mx-auto grid gap-10 px-4 pb-20 pt-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-12">
        <article className="min-w-0 max-w-2xl">
          {secoes.map(({ titulo: tituloDaSecao, conteudo }, indice) => (
            <section
              key={tituloDaSecao}
              id={idDaSecao(tituloDaSecao)}
              // Espaço acima da âncora para o título não colar no topo da
              // janela quando se chega por um link do sumário.
              className="scroll-mt-8 border-t border-dashed border-border pb-10 pt-8 first:border-t-0 first:pt-0"
            >
              <h2 className="flex gap-3 text-[15px] font-medium tracking-tight">
                <span className="tabular-nums text-zinc-400 dark:text-zinc-600">
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <span>{tituloDaSecao}</span>
              </h2>
              <div className="mt-3 flex flex-col gap-4 ps-[1.9rem] text-sm leading-[1.7] text-zinc-600 dark:text-zinc-300">
                {conteudo}
              </div>
            </section>
          ))}
        </article>

        <aside className="hidden lg:block">
          <SumarioLegal secoes={secoes.map(({ titulo: t }) => ({ id: idDaSecao(t), titulo: t }))} />
        </aside>
      </div>
    </>
  );
}
