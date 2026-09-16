import type { Metadata } from "next";
import PhoneClient from "./PhoneClient";
import { Palco } from "@/components/shell/AppShell";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "US Phone Number Generator by state";
const DESCRIPTION =
  "Generate US phone numbers that follow the North American Numbering Plan, by state or nationwide. Free, no sign-up, nothing leaves your browser.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/phone" });

const schema = [
  toolSchema({
    name: "US Phone Number Generator",
    description: DESCRIPTION,
    path: "/en/phone",
    features: [
      "Area codes that really serve each state",
      "555-01xx fiction range by default",
      "Follows every NANP dialing rule",
    ],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "Phone Number Generator", path: "/en/phone" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Palco>
        <PhoneClient />
      </Palco>
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </>
  );
}
