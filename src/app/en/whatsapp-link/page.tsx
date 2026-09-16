import type { Metadata } from "next";
import WhatsappGeneratorClient from "@/app/whatsapp/WhatsappGeneratorClient";
import { ConteudoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import { FAQ, SECOES, VEJA } from "./conteudo";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "WhatsApp Link Generator with a preset message";
const DESCRIPTION =
  "Create a wa.me link that opens a chat with you, with the message already typed. Works without saving the contact. Free and no sign-up.";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/en/whatsapp-link" });

const schema = [
  toolSchema({
    name: "WhatsApp Link Generator",
    description: DESCRIPTION,
    path: "/en/whatsapp-link",
    features: ["wa.me click-to-chat format", "Preset message", "QR Code of the same link"],
  }),
  breadcrumbSchema([
    { name: "Home", path: "/en" },
    { name: "WhatsApp Link Generator", path: "/en/whatsapp-link" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <WhatsappGeneratorClient titulo="WhatsApp Link Generator" descricao="Create a wa.me link that opens a chat with you, message ready. Nobody needs to save your contact." />
      <ConteudoDaFerramenta secoes={SECOES} faq={FAQ} veja={VEJA} idioma="en" />
    </>
  );
}
