import type { Metadata } from "next";
import RemovedorDeFundoClient from "./RemovedorDeFundoClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Removedor de fundo de imagem online e grátis";
const DESCRIPTION =
  "Remova o fundo de fotos em segundos, com contorno preciso até no cabelo, e baixe em PNG transparente na resolução original. Grátis e sem marca d'água.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/removedor-de-fundo",
});

const schema = [
  toolSchema({
    name: "Removedor de fundo",
    description: DESCRIPTION,
    path: "/removedor-de-fundo",
    features: [
      "Remoção de fundo com segmentação em alta resolução",
      "PNG transparente na resolução original",
      "Fundo branco, preto ou cor personalizada",
      "Imagem descartada logo após o processamento",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Removedor de fundo", path: "/removedor-de-fundo" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <RemovedorDeFundoClient />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} />
    </>
  );
}
