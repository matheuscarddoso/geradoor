import type { Metadata } from "next";
import CodigoDeBarrasClient from "./CodigoDeBarrasClient";

/*
 * A ferramenta é de uso interno, atrás de senha (veja `acessoDaGrafica.ts`).
 *
 * Por isso saiu o que existia aqui de SEO: `pageMetadata` com canonical e
 * Open Graph, e o JSON-LD de SoftwareApplication com a trilha de navegação.
 * Anunciar para o buscador uma página que responde redirecionamento é pedir
 * para ela ser rastreada, indexada como erro e mostrada a quem não pode
 * entrar. O título fica, porque é o nome da aba para quem já entrou.
 */
export const metadata: Metadata = {
  title: "Gerador de código de barras",
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <CodigoDeBarrasClient />;
}
