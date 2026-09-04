import type { Metadata } from "next";
import CartaoGeneratorClient from "./CartaoGeneratorClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de cartão de crédito para teste";
const DESCRIPTION =
  "Gere números de cartão de crédito válidos pelo algoritmo de Luhn para testar checkout e antifraude. Não funcionam em compras reais.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/cartao-de-credito",
});

const schema = [
  toolSchema({
    name: "Gerador de cartão de crédito para teste",
    description: DESCRIPTION,
    path: "/cartao-de-credito",
    features: [
      "Número validado pelo algoritmo de Luhn",
      "Bandeira, validade e CVV",
      "Copiar com um clique",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Gerador de cartão de crédito", path: "/cartao-de-credito" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <CartaoGeneratorClient />
    </>
  );
}
