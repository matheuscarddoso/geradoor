import type { Metadata } from "next";
import { Palco } from "@/components/shell/AppShell";
import CpfGeneratorClient from "./CpfGeneratorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de CPF válido online e grátis";
const DESCRIPTION =
  "Gere CPF válido para testar sistemas e formulários. Números aleatórios que respeitam o cálculo dos dígitos verificadores. Grátis e sem cadastro.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/cpf",
});

const schema = [
  toolSchema({
    name: "Gerador de CPF",
    description: DESCRIPTION,
    path: "/cpf",
    features: [
      "Gera CPF com dígitos verificadores válidos",
      "Copiar com um clique",
      "Formato com ou sem pontuação",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Gerador de CPF", path: "/cpf" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <Palco>
        <CpfGeneratorClient />
      </Palco>
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} />
    </>
  );
}
