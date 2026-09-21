import { PaginaNaoEncontrada } from "@/components/shell/PaginaNaoEncontrada";

/** O 404 de `notFound()` nas rotas em português — o QR Code curto expirado, por exemplo. */
export default function NaoEncontrada() {
  return <PaginaNaoEncontrada idioma="pt-BR" />;
}
