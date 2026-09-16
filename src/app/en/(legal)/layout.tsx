import Link from "next/link";
import { MarcaGeradoor } from "@/components/ui/marca-geradoor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Rodape } from "@/components/shell/Rodape";

/**
 * As páginas de texto em inglês: privacy, terms e cookies.
 *
 * Cópia do layout em português, com o idioma marcado e o logo apontando para
 * /en. Um layout compartilhado precisaria descobrir o idioma pelo caminho, e
 * `headers()` num layout torna dinâmica toda página do site — medido.
 *
 * Fora da casca das ferramentas de propósito. Aqui não há nada para operar —
 * há um texto para ler. A folha é uma coluna centrada com os fios laterais à
 * mostra, a mesma régua de 1px da grade da home.
 */
export default function LayoutLegal({ children }: { children: React.ReactNode }) {
  return (
    // overflow-x-clip porque a faixa do título é full-bleed e as cruzes ficam
    // metade para fora dela: abaixo de lg, onde não há trilho lateral, essa
    // metade cairia fora da tela e criaria rolagem horizontal. `clip` corta sem
    // virar contêiner de rolagem, então o sumário fixo continua funcionando.
    <div lang="en" className="flex min-h-screen flex-col overflow-x-clip">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col border-border lg:border-x">
        <header className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-8">
          <Link
            href="/en"
            className="inline-flex items-center gap-2 rounded text-foreground transition-opacity duration-150 hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <MarcaGeradoor size={22} />
            <span className="font-logo text-base font-medium tracking-tight">Geradoor</span>
          </Link>
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>
      </div>

      <Rodape idioma="en" />
    </div>
  );
}
