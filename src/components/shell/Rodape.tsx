import Link from "next/link";
import { EMAIL_DE_CONTATO } from "@/lib/seo";
import { cn } from "@/lib/utils";

/** As páginas que o rodapé lista, na ordem. */
export const PAGINAS_LEGAIS = [
  { href: "/privacidade", label: "Privacidade" },
  { href: "/termos", label: "Termos de uso" },
  { href: "/cookies", label: "Cookies" },
] as const;

/**
 * Rodapé do site: o que é obrigatório dizer, no menor espaço possível.
 *
 * Uma linha só, presa ao fim da área de conteúdo. Nas ferramentas de imagem
 * cada pixel de altura conta, e um rodapé de três colunas com endereço e redes
 * sociais tomaria o espaço do que a pessoa veio fazer. Quem procura política de
 * privacidade procura no rodapé, e aqui ela está — em toda página, sem rolar.
 */
export function Rodape({ className }: { className?: string }) {
  const link =
    "rounded transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";

  return (
    <footer
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2",
        "border-t border-zinc-200 text-[11px] text-zinc-400 dark:border-zinc-800 dark:text-zinc-500",
        className
      )}
    >
      <span>Geradoor</span>
      {PAGINAS_LEGAIS.map(({ href, label }) => (
        <Link key={href} href={href} className={link}>
          {label}
        </Link>
      ))}
      <a href={`mailto:${EMAIL_DE_CONTATO}`} className={link}>
        Contato
      </a>
    </footer>
  );
}
