import type { Metadata } from "next";
import { FormaDeEntrada } from "./FormaDeEntrada";

export const metadata: Metadata = {
  title: "Acesso restrito",
  // A ferramenta saiu do sitemap e do menu; a tela de senha também não tem por
  // que aparecer em busca. O middleware manda o mesmo no cabeçalho, para
  // quem lê o header e não o HTML.
  robots: { index: false, follow: false },
};

export default function EntrarPage() {
  return <FormaDeEntrada />;
}
