import { Suspense } from "react";
import type { Metadata } from "next";
import WhatsappGeneratorClient from "./WhatsappGeneratorClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Gerador de link do WhatsApp com mensagem pronta";
const DESCRIPTION =
  "Crie seu link wa.me com mensagem já preenchida e QR Code para compartilhar. Quem clicar abre a conversa com você direto no WhatsApp. Grátis e sem cadastro.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/whatsapp",
});

const schema = [
  toolSchema({
    name: "Gerador de link do WhatsApp",
    description: DESCRIPTION,
    path: "/whatsapp",
    features: [
      "Link wa.me com mensagem pré-preenchida",
      "QR Code do link para download",
      "Prévia da conversa antes de gerar",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Gerador de link do WhatsApp", path: "/whatsapp" },
  ]),
];

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(schema) }}
      />
      <Suspense>
        <WhatsappGeneratorClient />
      </Suspense>
    </>
  );
}
