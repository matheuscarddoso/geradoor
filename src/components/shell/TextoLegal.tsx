import { ATUALIZACAO_LEGAL } from "@/lib/seo";

/**
 * Tipografia das páginas de texto.
 *
 * Existe para as três páginas legais saírem iguais: mesma hierarquia, mesma
 * medida de linha, mesmo espaçamento. Texto de política se lê de má vontade, e
 * a única coisa que o desenho pode fazer é não atrapalhar.
 */

export function TituloLegal({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">{children}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Atualizado em {ATUALIZACAO_LEGAL}</p>
    </>
  );
}

export function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-medium tracking-tight">
        {numero}. {titulo}
      </h2>
      <div className="mt-2 flex flex-col gap-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

export function Lista({ children }: { children: React.ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 ps-5 marker:text-zinc-300 dark:marker:text-zinc-600">{children}</ul>;
}

export function Termo({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-foreground">{children}</strong>;
}
