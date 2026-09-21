import type { Metadata } from "next";
import { ROTAS_PUBLICAS } from "@/lib/rotas";
import { Home as PaginaInicial } from "@/components/home/Home";
import { HOME } from "./conteudo";
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

/**
 * A lista de ferramentas, na ordem em que a home as mostra.
 *
 * Era um segundo nó `WebSite` — com a mesma url do que o layout raiz já
 * declara e com outra descrição. Dois `WebSite` para o mesmo endereço, com
 * textos divergentes, é ambiguidade gratuita para quem lê. Aqui vai só o que a
 * página é: uma lista.
 */
const listaDeFerramentas = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `Ferramentas do ${SITE.name}`,
  itemListOrder: "https://schema.org/ItemListOrderAscending",
  numberOfItems: ROTAS_PUBLICAS.length,
  itemListElement: ROTAS_PUBLICAS.map((rota, indice) => ({
    "@type": "ListItem",
    position: indice + 1,
    item: {
      "@type": "WebApplication",
      name: rota.label,
      description: rota.descricao,
      url: absolute(rota.href),
      applicationCategory: "UtilitiesApplication",
      inLanguage: "pt-BR",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
    },
  })),
};

/**
 * Só a lista aqui. O FAQPage é emitido pelo próprio ConteudoDaFerramenta, a
 * partir da mesma lista que desenha as perguntas na tela — declarar de novo
 * aqui criaria dois nós FAQPage na mesma página.
 */
const schema = listaDeFerramentas;

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PaginaInicial idioma="pt-BR" conteudo={HOME} />
    </>
  );
}
