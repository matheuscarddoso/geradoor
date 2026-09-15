import type { Metadata } from "next";
import VetorizadorClient from "./VetorizadorClient";
import { breadcrumbSchema, jsonLd, pageMetadata, toolSchema } from "@/lib/seo";

const TITLE = "Vetorizar imagem online e grátis: PNG e JPG para SVG";
const DESCRIPTION =
  "Transforme logos, ilustrações, desenhos e fotos em SVG vetorial, com as curvas redesenhadas e fidelidade medida. Grátis, sem cadastro e sem enviar a imagem: tudo roda no seu navegador.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/vetorizador",
});

const schema = [
  toolSchema({
    name: "Vetorizador",
    description: DESCRIPTION,
    path: "/vetorizador",
    features: [
      "Conversão de PNG, JPG, WEBP e AVIF para SVG",
      "Estilos para logo, ilustração, foto e traço",
      "Escolha automática do número de cores",
      "Fundo transparente para logos",
      "Processamento no navegador, sem envio da imagem",
    ],
  }),
  breadcrumbSchema([
    { name: "Início", path: "/" },
    { name: "Vetorizador", path: "/vetorizador" },
  ]),
];

export default function Page() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} />
      <VetorizadorClient />
    </>
  );
}
