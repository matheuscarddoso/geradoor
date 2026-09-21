import type { Metadata } from "next";
import VetorizadorClient from "../vetorizador/VetorizadorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Converter JPG para SVG online e grátis";
const DESCRIPTION =
  "Transforme JPG em vetor SVG com as curvas redesenhadas e a fidelidade medida. Grátis, sem cadastro e sem enviar o arquivo: roda no seu navegador.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/jpg-para-svg",
});

const schema = [
  toolSchema({
    name: "Conversor de JPG para SVG",
    description: DESCRIPTION,
    path: "/jpg-para-svg",
    features: [
      "Redesenha as formas como curvas de Bézier",
      "Controle de cores para contornar o ruído da compressão",
      "Converte no navegador, sem enviar o arquivo",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Vetorizador", path: "/vetorizador" },
    { name: "JPG para SVG", path: "/jpg-para-svg" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <VetorizadorClient
        titulo="Converter JPG para SVG"
        descricao="Solte o JPG e baixe um SVG. Funciona melhor com logo e ilustração de traço do que com foto — a página mostra a fidelidade antes de você baixar."
      />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} />
    </>
  );
}
