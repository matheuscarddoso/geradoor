import Link from "next/link";
import { MarcaGeradoor } from "@/components/ui/marca-geradoor";
import type { Idioma } from "@/lib/idioma";

const TEXTO: Record<Idioma, { titulo: string; apoio: string; acao: string; inicio: string }> = {
  "pt-BR": {
    titulo: "Esta página não existe",
    apoio: "O endereço pode ter sido digitado errado, ou o link que trouxe você até aqui expirou.",
    acao: "Ver as ferramentas",
    inicio: "/",
  },
  en: {
    titulo: "This page doesn’t exist",
    apoio: "The address may have been mistyped, or the link that brought you here has expired.",
    acao: "See the tools",
    inicio: "/en",
  },
};

/**
 * A página de 404, nos dois idiomas.
 *
 * `bilingue` é para o 404 global, que responde a qualquer endereço sem rota e
 * não sabe de que idioma a pessoa veio: mostra o português, que é a raiz, e
 * oferece o caminho para o inglês.
 */
export function PaginaNaoEncontrada({ idioma, bilingue = false }: { idioma: Idioma; bilingue?: boolean }) {
  const t = TEXTO[idioma];

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <MarcaGeradoor size={28} className="text-foreground" />
      <p className="mt-8 font-mono text-xs tracking-[0.2em] text-muted-foreground">404</p>
      <h1 className="mt-3 text-balance text-2xl font-medium tracking-tight">{t.titulo}</h1>
      <p className="mt-3 max-w-sm text-pretty text-sm leading-relaxed text-muted-foreground">{t.apoio}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
        <Link
          href={t.inicio}
          className="rounded-lg bg-foreground px-4 py-2 font-medium text-background transition-opacity duration-150 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {t.acao}
        </Link>
        {bilingue && idioma === "pt-BR" && (
          <Link
            href="/en"
            lang="en"
            className="rounded text-muted-foreground underline decoration-zinc-300 underline-offset-4 transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:decoration-zinc-600"
          >
            English version
          </Link>
        )}
      </div>
    </main>
  );
}
