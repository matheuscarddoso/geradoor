import type { Metadata } from "next";
import QrCodeGeneratorClient from "@/app/qr-code/QrCodeGeneratorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "QR Code Generator with a logo in the center";
const DESCRIPTION =
  "Create a QR Code from any link and put your logo in the center. Download as PNG, PDF or SVG. Free, no watermark and no sign-up.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/qr-code" });

const schema = [
  toolSchema({
    name: "QR Code Generator",
    description: DESCRIPTION,
    path: "/en/qr-code",
    features: ["Custom logo in the center", "PNG, PDF and SVG download", "Level H error correction with a logo"],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "QR Code Generator", path: "/en/qr-code" },
  ]),
];

export default function Page() {
  return (
    <div lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <QrCodeGeneratorClient
        titulo="QR Code Generator"
        descricao="Create a QR Code from any link, with your logo in the center. Download as PNG, PDF or SVG."
      />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </div>
  );
}
