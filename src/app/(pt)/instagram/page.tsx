import type { Metadata } from "next";
import InstagramGeneratorClient from "./InstagramGeneratorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de QR Code do Instagram";
const DESCRIPTION =
  "Crie um QR Code que abre o seu perfil do Instagram, no estilo do cartão do app. Informe o @, escolha a versão preta ou em gradiente e baixe em PNG, PDF ou SVG.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/instagram",
});

const schema = [
  toolSchema({
    name: "Gerador de QR Code do Instagram",
    description: DESCRIPTION,
    path: "/instagram",
    features: [
      "QR Code apontando para o perfil",
      "Estilo do cartão do Instagram, em preto ou gradiente",
      "Download em PNG, PDF e SVG",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "QR Code do Instagram", path: "/instagram" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <InstagramGeneratorClient />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} />
    </>
  );
}
