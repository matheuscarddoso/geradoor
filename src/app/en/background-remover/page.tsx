import type { Metadata } from "next";
import RemovedorDeFundoClient from "@/app/removedor-de-fundo/RemovedorDeFundoClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Background Remover: free, no watermark, full resolution";
const DESCRIPTION =
  "Remove the background from any photo in seconds and download a transparent PNG at the original resolution. Free, no sign-up and no watermark.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/en/background-remover",
});

const schema = [
  toolSchema({
    name: "Background Remover",
    description: DESCRIPTION,
    path: "/en/background-remover",
    features: [
      "Transparent PNG at the original resolution",
      "Partial transparency along hair and fur",
      "Brush and magic brush for manual fixes",
    ],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "Background Remover", path: "/en/background-remover" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <RemovedorDeFundoClient
        titulo="Background Remover"
        descricao="Remove the background from any photo in seconds and download a transparent PNG, at the original resolution. Free, no sign-up, no watermark."
      />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </>
  );
}
