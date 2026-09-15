import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarcaGeradoor } from "@/components/ui/marca-geradoor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Rodape } from "@/components/shell/Rodape";
import { EtiquetaNovo } from "@/components/shell/EtiquetaNovo";
import { ROTAS_PUBLICAS } from "@/lib/rotas";
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
    <div className="flex h-dvh flex-col overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />

      <header className="flex shrink-0 items-center justify-between px-4 py-4 sm:px-8">
        <span className="flex items-center gap-2 text-foreground">
          <MarcaGeradoor size={22} />
          <span className="font-logo text-base font-medium tracking-tight">Geradoor</span>
        </span>
        <ThemeToggle />
      </header>

      {/* min-h-0 permite a grade encolher quando a tela é baixa, em vez de
          empurrar o rodapé para fora e criar rolagem. */}
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-4 pb-4 sm:gap-12 sm:px-8">
        <div className="flex flex-col items-center gap-5 text-center">
          <Link
            href={DESTAQUE.href}
            className="group inline-flex items-center gap-2 rounded-full border border-border py-1 pe-2.5 ps-1.5 text-[13px] text-zinc-500 transition-colors duration-150 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400"
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

        {/* A grade é desenhada por fios de 1px, não por cartões soltos: a borda
            de cima e da esquerda ficam no contêiner, e cada célula fecha a sua
            própria direita e a de baixo. Assim as linhas não engrossam onde
            duas células se encontram. */}
        <nav className="w-full max-w-5xl overflow-y-auto border-t border-border">
          <ul className="grid grid-cols-2 border-s border-border sm:grid-cols-3">
            {ROTAS_PUBLICAS.map(({ href, label, labelCurto, descricao, icon: Icone, novo }, indice) => (
              <li
                key={href}
                // O último item ocupa a linha inteira no celular, onde a grade
                // tem duas colunas e o número de ferramentas é ímpar: sem isso
                // sobraria meia linha sem fio nenhum.
                className={`border-b border-e border-border ${
                  indice === ROTAS_PUBLICAS.length - 1 ? "col-span-2 sm:col-span-1" : ""
                }`}
              >
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-5 p-3.5 transition-colors duration-150 hover:bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400 sm:gap-8 sm:p-5"
                >
                  {/* No celular o ícone vem ao lado do nome, porque não há
                      altura para nove células com um ícone em cima de cada
                      uma. Daí a partir de sm ele sobe para o centro. */}
                  <span className="hidden flex-1 items-center justify-center py-3 sm:flex">
                    <Icone
                      className="icone-tracado h-7 w-7 text-zinc-400 transition-colors duration-150 group-hover:text-foreground dark:text-zinc-600"
                      strokeWidth={1.25}
                    />
                  </span>
                  <span className="block">
                    <span className="flex items-center gap-1.5">
                      <Icone className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-600 sm:hidden" />
                      {/* E o nome curto, que em duas colunas estreitas
                          "Removedor de fundo" com a etiqueta ao lado saía
                          cortado no meio. */}
                      <span className="truncate text-sm font-medium sm:hidden">{labelCurto ?? label}</span>
                      <span className="hidden truncate text-sm font-medium sm:inline">{label}</span>
                      {novo && <EtiquetaNovo />}
                    </span>
                    {/* A descrição some no celular: ali ela só caberia cortada
                        no meio de uma reticência. */}
                    <span className="mt-0.5 hidden truncate text-xs text-muted-foreground sm:block">{descricao}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>

      <Rodape />
    </div>
  );
}
