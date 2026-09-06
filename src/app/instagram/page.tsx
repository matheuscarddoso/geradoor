import { Suspense } from "react";
import type { Metadata } from "next";
import InstagramGeneratorClient from "./InstagramGeneratorClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de QR Code do Instagram";
const DESCRIPTION =
  "Crie um QR Code que abre o seu perfil do Instagram. Informe o @, escolha se quer a marca no centro e baixe em PNG, PDF ou SVG.";

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
      "Marca do Instagram no centro do código",
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
      <Suspense>
        <InstagramGeneratorClient />
      </Suspense>
    </>
  );
}
