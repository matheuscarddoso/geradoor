import type { Metadata } from "next";
import VetorizadorClient from "../vetorizador/VetorizadorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Converter PNG para SVG online e grátis";
const DESCRIPTION =
  "Transforme PNG em vetor SVG com as curvas redesenhadas e a transparência preservada. Grátis, sem cadastro e sem enviar o arquivo: roda no seu navegador.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/png-para-svg",
});

const schema = [
  toolSchema({
    name: "Conversor de PNG para SVG",
    description: DESCRIPTION,
    path: "/png-para-svg",
    features: [
      "Redesenha as formas como curvas de Bézier",
      "Preserva o fundo transparente do PNG",
      "Converte no navegador, sem enviar o arquivo",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Vetorizador", path: "/vetorizador" },
    { name: "PNG para SVG", path: "/png-para-svg" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <VetorizadorClient
        titulo="Converter PNG para SVG"
        descricao="Solte o PNG e baixe um SVG: as formas são redesenhadas como curvas, e o fundo transparente continua transparente."
      />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} />
    </>
  );
}
