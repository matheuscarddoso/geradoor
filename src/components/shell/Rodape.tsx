import Link from "next/link";
import { EMAIL_DE_CONTATO } from "@/lib/seo";
import type { Idioma } from "@/lib/idioma";
import { TEXTOS } from "@/lib/textos";
import { cn } from "@/lib/utils";

/** As páginas que o rodapé lista, na ordem. */
export const PAGINAS_LEGAIS = [
  { href: "/privacidade", en: { href: "/en/privacy", label: "Privacy" }, label: "Privacidade" },
  { href: "/termos", en: { href: "/en/terms", label: "Terms" }, label: "Termos de uso" },
  { href: "/cookies", en: { href: "/en/cookies", label: "Cookies" }, label: "Cookies" },
] as const;

/** As páginas legais no idioma pedido. */
export function paginasLegais(idioma: Idioma) {
  return PAGINAS_LEGAIS.map((p) => (idioma === "en" ? p.en : { href: p.href, label: p.label }));
}

/**
 * Rodapé do site: o que é obrigatório dizer, no menor espaço possível.
 *
 * Uma linha só, presa ao fim da área de conteúdo. Nas ferramentas de imagem
 * cada pixel de altura conta, e um rodapé de três colunas com endereço e redes
 * sociais tomaria o espaço do que a pessoa veio fazer. Quem procura política de
 * privacidade procura no rodapé, e aqui ela está — em toda página, sem rolar.
 */
export function Rodape({ className, idioma = "pt-BR" }: { className?: string; idioma?: Idioma }) {
  const link =
    "rounded transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400";
  const t = TEXTOS[idioma];

  return (
    <footer
      className={cn(
        "flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-2.5",
        "border-t border-zinc-200 text-[13px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400",
        className
      )}
    >
      <span>Geradoor</span>
      {paginasLegais(idioma).map(({ href, label }) => (
        <Link key={href} href={href} className={link}>
          {label}
        </Link>
      ))}
      <a href={`mailto:${EMAIL_DE_CONTATO}`} className={link}>
        {t.contato}
      </a>
    </footer>
  );
}
