import type { Metadata } from "next";
import CpfGeneratorClient from "./CpfGeneratorClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

// A home fica no mesmo segmento do layout raiz, e title.template só se aplica
// a segmentos filhos. Por isso a marca entra manualmente aqui.
const TITLE = "Gerador de CPF válido online e grátis | Geradoor";
const DESCRIPTION =
  "Gere CPF válido para testar sistemas e formulários. Números aleatórios que respeitam o cálculo dos dígitos verificadores. Grátis e sem cadastro.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/",
});

const schema = [
  toolSchema({
    name: "Gerador de CPF",
    description: DESCRIPTION,
    path: "/",
    features: [
      "Gera CPF com dígitos verificadores válidos",
      "Copiar com um clique",
      "Formato com ou sem pontuação",
    ],
  }),
  breadcrumbSchema([{ name: "Gerador de CPF", path: "/" }]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <CpfGeneratorClient />
    </>
  );
}
