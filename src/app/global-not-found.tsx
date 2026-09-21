import type { Metadata } from "next";
import { Documento } from "@/components/shell/Documento";
import { PaginaNaoEncontrada } from "@/components/shell/PaginaNaoEncontrada";

/**
 * O 404 de endereço que não casa com rota nenhuma.
 *
 * Com dois layouts raiz não existe layout acima de tudo, e sem este arquivo o
 * Next servia a página de erro crua — sem estilo, sem tema e sem `<html lang>`.
 * Precisa de `experimental.globalNotFound` no next.config.
 */
export const metadata: Metadata = {
  title: "Página não encontrada | Geradoor",
  robots: { index: false, follow: true },
};

export default function NaoEncontradaGlobal() {
  return (
    <Documento idioma="pt-BR">
      <PaginaNaoEncontrada idioma="pt-BR" bilingue />
    </Documento>
  );
}
