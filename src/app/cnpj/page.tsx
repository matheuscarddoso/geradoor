import type { Metadata } from "next";
import CnpjGeneratorClient from "./CnpjGeneratorClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de CNPJ válido online e grátis";
const DESCRIPTION =
  "Gere CNPJ válido para testar cadastros e integrações. Números que seguem o cálculo oficial dos dígitos verificadores. Grátis e sem cadastro.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/cnpj",
});

const schema = [
  toolSchema({
    name: "Gerador de CNPJ",
    description: DESCRIPTION,
    path: "/cnpj",
    features: [
      "Gera CNPJ com dígitos verificadores válidos",
      "Copiar com um clique",
      "Formato com ou sem pontuação",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Gerador de CNPJ", path: "/cnpj" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <CnpjGeneratorClient />
    </>
  );
}
