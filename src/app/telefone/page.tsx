import type { Metadata } from "next";
import TelefoneGeneratorClient from "./TelefoneGeneratorClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de telefone celular com DDD por estado";
const DESCRIPTION =
  "Gere números de celular com DDD real de cada estado, para testar cadastros e máscaras. Com ou sem formatação. Grátis e sem cadastro.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/telefone",
});

const schema = [
  toolSchema({
    name: "Gerador de Telefone",
    description: DESCRIPTION,
    path: "/telefone",
    features: [
      "DDD real de cada unidade da federação",
      "Nono dígito obrigatório de celular",
      "Alterna entre número formatado e cru",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Gerador de Telefone", path: "/telefone" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <TelefoneGeneratorClient />
    </>
  );
}
