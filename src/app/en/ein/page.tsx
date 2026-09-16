import type { Metadata } from "next";
import EinClient from "./EinClient";
import { Palco } from "@/components/shell/AppShell";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "EIN Generator: Employer Identification Numbers for testing";
const DESCRIPTION =
  "Generate EINs with a real IRS campus prefix, for testing forms and databases. Free, no sign-up, and nothing leaves your browser.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/ein" });

const schema = [
  toolSchema({
    name: "EIN Generator",
    description: DESCRIPTION,
    path: "/en/ein",
    features: ["Real IRS campus prefixes", "Formatted XX-XXXXXXX", "Runs in the browser, nothing is sent"],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "EIN Generator", path: "/en/ein" },
  ]),
];

export default function Page() {
  return (
    <div lang="en">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Palco>
        <EinClient />
      </Palco>
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </div>
  );
}
