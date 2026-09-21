import { Documento, metadataDoSite } from "@/components/shell/Documento";

/**
 * Layout raiz das páginas em português — tudo que não está em /en.
 * O porquê de haver dois layouts raiz está em `Documento`.
 */
export const metadata = metadataDoSite("pt-BR");

export default function LayoutPortugues({ children }: { children: React.ReactNode }) {
  return <Documento idioma="pt-BR">{children}</Documento>;
}
