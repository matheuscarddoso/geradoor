import Link from "next/link";
import { MaximizeIcon } from "@/components/ui/maximize-icon";
import { Rodape } from "@/components/shell/Rodape";

/**
 * As páginas de texto: privacidade, termos e cookies.
 *
 * Fora da casca das ferramentas de propósito. Aqui não há nada para operar —
 * há um texto para ler —, e uma coluna estreita centrada numa folha limpa lê
 * melhor do que o mesmo texto espremido entre a sidebar e o palco.
 */
export default function LayoutLegal({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="flex justify-center px-4 pt-6 sm:pt-10">
        <div className="w-full max-w-3xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-foreground transition-colors duration-150 hover:bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <MaximizeIcon size={18} className="flex items-center" />
            <span className="font-logo text-base font-medium tracking-tight">Geradoor</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 justify-center px-4 py-6 sm:py-8">
        <article className="w-full max-w-3xl rounded-2xl bg-background p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_32px_-12px_rgb(0_0_0/0.12)] ring-1 ring-black/5 sm:p-10 dark:ring-white/10">
          {children}
        </article>
      </main>

      <Rodape className="border-t-0 pb-6" />
    </div>
  );
}
