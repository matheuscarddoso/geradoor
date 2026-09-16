import type { Metadata } from "next";
import VetorizadorClient from "@/app/vetorizador/VetorizadorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Image Vectorizer: PNG and JPG to SVG, free";
const DESCRIPTION =
  "Turn a logo, illustration or photo into an SVG with redrawn curves and measured fidelity. Free, no sign-up, and your image never leaves the browser.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/vectorizer" });

const schema = [
  toolSchema({
    name: "Image Vectorizer",
    description: DESCRIPTION,
    path: "/en/vectorizer",
    features: [
      "Redraws shapes as Bézier curves",
      "Reports measured fidelity before download",
      "Runs in the browser, image never uploaded",
    ],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "Vectorizer", path: "/en/vectorizer" },
  ]),
];

export default function Page() {
  return (
    <div lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <VetorizadorClient
        titulo="Image Vectorizer"
        descricao="Turn an image into an SVG: shapes are redrawn as curves, sharp at any size. Nothing is uploaded."
      />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </div>
  );
}
