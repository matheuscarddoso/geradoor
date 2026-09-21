import { TAMANHO, TEXTOS_DA_IMAGEM, TIPO_DA_IMAGEM, imagemDeCompartilhamento } from "@/lib/og";

export const alt = TEXTOS_DA_IMAGEM["/qr-code"].titulo;
export const size = TAMANHO;
export const contentType = TIPO_DA_IMAGEM;

export default function Imagem() {
  return imagemDeCompartilhamento("/qr-code");
}
