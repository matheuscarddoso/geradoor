import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MaximizeIcon } from "@/components/ui/maximize-icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Rodape } from "@/components/shell/Rodape";
import { EtiquetaNovo } from "@/components/shell/EtiquetaNovo";
import { GRUPOS, NOMES_DOS_GRUPOS, ROTAS_PUBLICAS } from "@/lib/rotas";
import { SITE, absolute, jsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Geradoor · Ferramentas grátis que rodam no seu navegador";
const DESCRIPTION =
  "Remova o fundo de fotos, vetorize imagens, crie QR Code e gere CPF e CNPJ válidos para teste. Grátis, sem cadastro e sem marca d'água.";

export const metadata: Metadata = {
  ...pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/" }),
  // A home fica no mesmo segmento do layout raiz, e `title.template` só vale
  // para os filhos: aqui a marca já está escrita no título.
  title: { absolute: TITLE },
};

/**
 * A ferramenta em destaque no aviso do topo.
 *
 * Uma só, e a mais recente: um aviso que lista três novidades não é aviso, é
 * índice — e o índice já está logo abaixo.
 */
const DESTAQUE = ROTAS_PUBLICAS.find((rota) => rota.novo) ?? ROTAS_PUBLICAS[0];

const schema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
  description: DESCRIPTION,
  inLanguage: "pt-BR",
  // A lista que a home mostra, na ordem em que ela aparece.
  hasPart: ROTAS_PUBLICAS.map((rota) => ({
    "@type": "WebApplication",
    name: rota.label,
    description: rota.descricao,
    url: absolute(rota.href),
    applicationCategory: "UtilitiesApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
  })),
};

export default function Home() {
  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* Um halo atrás do título, que some nas bordas. É o que dá profundidade
          sem encher a tela de enfeite. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(60%_60%_at_50%_0%,hsl(var(--foreground)/0.07),transparent_70%)]"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

      <header className="relative flex shrink-0 items-center justify-between px-4 py-4 sm:px-8">
        <span className="flex items-center gap-2 text-foreground">
          <MaximizeIcon size={18} className="flex items-center" />
          <span className="font-logo text-base font-medium tracking-tight">Geradoor</span>
        </span>
        <ThemeToggle />
      </header>

      {/* min-h-0 permite a lista encolher quando a tela é baixa, em vez de
          empurrar o rodapé para fora e criar rolagem. */}
      <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-7 px-4 pb-4 text-center sm:gap-9 sm:px-8">
        <div className="flex flex-col items-center gap-5">
          <Link
            href={DESTAQUE.href}
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/60 py-1 pe-2.5 ps-1.5 text-[13px] text-zinc-500 backdrop-blur transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400"
          >
            <EtiquetaNovo />
            <span className="truncate">{DESTAQUE.descricao}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>

          <h1 className="max-w-3xl text-balance text-3xl font-medium leading-[1.08] tracking-[-0.03em] sm:text-5xl">
            Ferramentas que fazem o trabalho e somem
          </h1>
          <p className="max-w-xl text-balance text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            Recorte de imagem, vetorização, QR Code e dados de teste. Sem cadastro, sem marca d&apos;água e sem
            enviar o que não precisa sair do seu navegador.
          </p>
        </div>

        <nav className="w-full max-w-4xl overflow-y-auto">
          {GRUPOS.map((grupo) => {
            const doGrupo = ROTAS_PUBLICAS.filter((rota) => rota.grupo === grupo);
            if (doGrupo.length === 0) return null;
            return (
              <div key={grupo} className="mb-5 last:mb-0">
                <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {NOMES_DOS_GRUPOS[grupo]}
                </h2>
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {doGrupo.map(({ href, label, labelCurto, descricao, icon: Icone, novo }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="group flex h-full items-center gap-2.5 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-start transition-colors duration-150 hover:border-zinc-300 hover:bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:border-zinc-700"
                      >
                        <Icone className="h-4 w-4 shrink-0 text-zinc-400 transition-colors duration-150 group-hover:text-foreground" />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            {/* No celular, o nome curto: em duas colunas, com a
                                etiqueta ao lado, "Removedor de fundo" saía
                                cortado no meio. */}
                            <span className="truncate text-sm font-medium sm:hidden">{labelCurto ?? label}</span>
                            <span className="hidden truncate text-sm font-medium sm:inline">{label}</span>
                            {novo && <EtiquetaNovo />}
                          </span>
                          {/* A descrição some no celular: em duas colunas
                              estreitas ela quebraria em três linhas e a lista
                              passaria da altura da tela. */}
                          <span className="hidden truncate text-xs text-muted-foreground sm:block">{descricao}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </main>

      <Rodape className="relative" />
    </div>
  );
}
