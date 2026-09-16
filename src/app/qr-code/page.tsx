import type { Metadata } from "next";
import QrCodeGeneratorClient from "./QrCodeGeneratorClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de QR Code com logo no centro";
const DESCRIPTION =
  "Crie QR Code a partir de qualquer link e coloque a sua logo no centro. Baixe em PNG, PDF ou SVG. Grátis, sem marca d'água e sem cadastro.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/qr-code",
});

const schema = [
  toolSchema({
    name: "Gerador de QR Code",
    description: DESCRIPTION,
    path: "/qr-code",
    features: [
      "Logo personalizada no centro do código",
      "Download em PNG, PDF e SVG",
      "Correção de erro nível H quando há logo",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Gerador de QR Code", path: "/qr-code" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <QrCodeGeneratorClient />
    </>
  );
}
