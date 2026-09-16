import type { Metadata } from "next";
import VetorizadorClient from "@/app/vetorizador/VetorizadorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Convert JPG to SVG online, free";
const DESCRIPTION =
  "Turn a JPG into a vector SVG with redrawn curves and measured fidelity. Free, no sign-up, and the file never leaves your browser.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/jpg-to-svg" });

const schema = [
  toolSchema({
    name: "JPG to SVG Converter",
    description: DESCRIPTION,
    path: "/en/jpg-to-svg",
    features: [
      "Redraws shapes as Bézier curves",
      "Color control to work around compression noise",
      "Converts in the browser, no upload",
    ],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "Vectorizer", path: "/en/vectorizer" },
    { name: "JPG to SVG", path: "/en/jpg-to-svg" },
  ]),
];

export default function Page() {
  return (
    <div lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <VetorizadorClient titulo="Convert JPG to SVG" descricao="Drop a JPG and download an SVG. Works better on logos and line art than on photos, and the page shows fidelity before you download." />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </div>
  );
}
