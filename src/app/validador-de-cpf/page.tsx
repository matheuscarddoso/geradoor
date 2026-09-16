import type { Metadata } from "next";
import ValidadorClient from "./ValidadorClient";
import { Palco } from "@/components/shell/AppShell";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Validador de CPF online e grátis";
const DESCRIPTION =
  "Confira se um CPF é válido na hora. Quando não fecha, a página mostra quais dígitos verificadores eram esperados. Grátis e sem enviar o número.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/validador-de-cpf",
});

const schema = [
  toolSchema({
    name: "Validador de CPF",
    description: DESCRIPTION,
    path: "/validador-de-cpf",
    features: [
      "Responde enquanto você digita",
      "Mostra quais dígitos verificadores eram esperados",
      "Confere no navegador, sem enviar o número",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Validador de CPF", path: "/validador-de-cpf" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Palco>
        <ValidadorClient />
      </Palco>
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} />
    </>
  );
}
