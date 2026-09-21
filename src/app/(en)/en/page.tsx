import type { Metadata } from "next";
import { Home as PaginaInicial } from "@/components/home/Home";
import { HOME } from "./conteudo";
import { rotasPublicas } from "@/lib/rotas";
import { SITE, absolute, jsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "Geradoor · Free tools that run in your browser";
const DESCRIPTION =
  "Remove photo backgrounds, vectorize images, create QR Codes and generate test data. Free, no sign-up and no watermark.";

export const metadata: Metadata = {
  ...pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en" }),
  title: { absolute: TITLE },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `${SITE.name} tools`,
  itemListOrder: "https://schema.org/ItemListOrderAscending",
  numberOfItems: rotasPublicas("en").length,
  itemListElement: rotasPublicas("en").map((rota, indice) => ({
    "@type": "ListItem",
    position: indice + 1,
    item: {
      "@type": "WebApplication",
      name: rota.label,
      description: rota.descricao,
      url: absolute(rota.href),
      applicationCategory: "UtilitiesApplication",
      inLanguage: "en",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  })),
};

export default function HomeEn() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <PaginaInicial idioma="en" conteudo={HOME} />
    </>
  );
}
