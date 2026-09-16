import type { Metadata } from "next";
import VetorizadorClient from "@/app/vetorizador/VetorizadorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Convert PNG to SVG online, free";
const DESCRIPTION =
  "Turn a PNG into a vector SVG with redrawn curves and transparency preserved. Free, no sign-up, and the file never leaves your browser.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/png-to-svg" });

const schema = [
  toolSchema({
    name: "PNG to SVG Converter",
    description: DESCRIPTION,
    path: "/en/png-to-svg",
    features: [
      "Redraws shapes as Bézier curves",
      "Keeps the PNG transparent background",
      "Converts in the browser, no upload",
    ],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "Vectorizer", path: "/en/vectorizer" },
    { name: "PNG to SVG", path: "/en/png-to-svg" },
  ]),
];

export default function Page() {
  return (
    <div lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <VetorizadorClient titulo="Convert PNG to SVG" descricao="Drop a PNG and download an SVG: shapes are redrawn as curves, and a transparent background stays transparent." />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </div>
  );
}
