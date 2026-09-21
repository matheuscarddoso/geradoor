import { Documento, metadataDoSite } from "@/components/shell/Documento";

/**
 * Layout raiz das páginas em inglês — tudo sob /en.
 * O porquê de haver dois layouts raiz está em `Documento`.
 */
export const metadata = metadataDoSite("en");

export default function LayoutIngles({ children }: { children: React.ReactNode }) {
  return <Documento idioma="en">{children}</Documento>;
}
