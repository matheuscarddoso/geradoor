import type { Metadata } from "next";
import CodigoDeBarrasClient from "./CodigoDeBarrasClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de código de barras Code 128 em PDF numerado";
const DESCRIPTION =
  "Monte a folha com quantos códigos de barras quiser sobre a sua arte, gere a numeração sequencial inteira em PDF e baixe tudo num .zip. Code 128, vetorial, grátis e sem cadastro.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/codigo-de-barras",
});

const schema = [
  toolSchema({
    name: "Gerador de código de barras em PDF",
    description: DESCRIPTION,
    path: "/codigo-de-barras",
    features: [
      "Code 128 vetorial, com subset C automático para numeração",
      "Editor de posições sobre a arte do formulário",
      "Numeração sequencial dividida em arquivos e baixada em .zip",
      "Tamanho de página livre, em milímetros",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Gerador de código de barras", path: "/codigo-de-barras" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <CodigoDeBarrasClient />
    </>
  );
}
