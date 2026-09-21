import type { Metadata } from "next";
import SsnClient from "./SsnClient";
import { Palco } from "@/components/shell/AppShell";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "SSN Generator: valid Social Security Numbers for testing";
const DESCRIPTION =
  "Generate random SSNs that respect the ranges the SSA issues, for testing forms and databases. Free, no sign-up, and nothing leaves your browser.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/ssn" });

const schema = [
  toolSchema({
    name: "SSN Generator",
    description: DESCRIPTION,
    path: "/en/ssn",
    features: [
      "Respects every range the SSA never issued",
      "Optional SSA demo range (987-65-43xx)",
      "Runs in the browser, nothing is sent",
    ],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "SSN Generator", path: "/en/ssn" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Palco>
        <SsnClient />
      </Palco>
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </>
  );
}
