import type { Metadata } from "next";
import InstagramGeneratorClient from "@/app/instagram/InstagramGeneratorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Instagram QR Code Generator";
const DESCRIPTION =
  "Create a QR Code that opens your Instagram profile, readable by any phone camera. Download PNG, SVG or PDF. Free and no sign-up.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/instagram-qr-code" });

const schema = [
  toolSchema({
    name: "Instagram QR Code Generator",
    description: DESCRIPTION,
    path: "/en/instagram-qr-code",
    features: ["Readable by any camera, not just the app", "PNG, SVG and PDF download", "Points at your public profile"],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "Instagram QR Code Generator", path: "/en/instagram-qr-code" },
  ]),
];

export default function Page() {
  return (
    <div lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <InstagramGeneratorClient titulo="Instagram QR Code" descricao="A QR Code that opens your Instagram profile. Any phone camera reads it, with no app needed." />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </div>
  );
}
