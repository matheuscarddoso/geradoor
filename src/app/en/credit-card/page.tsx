import type { Metadata } from "next";
import CartaoGeneratorClient from "@/app/cartao-de-credito/CartaoGeneratorClient";
import { Palco } from "@/components/shell/AppShell";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Credit Card Generator for testing";
const DESCRIPTION =
  "Generate valid credit card numbers for testing checkout forms, with network, expiry and CVV. Free, no sign-up, nothing leaves your browser.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/credit-card" });

const schema = [
  toolSchema({
    name: "Credit Card Generator",
    description: DESCRIPTION,
    path: "/en/credit-card",
    features: ["Passes the Luhn check", "Real network prefixes", "Runs in the browser"],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "Credit Card Generator", path: "/en/credit-card" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <Palco>
        <CartaoGeneratorClient titulo="Credit Card Generator" descricao="Card numbers that pass the Luhn check, for testing checkout forms. They authorize nothing." />
      </Palco>
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </>
  );
}
