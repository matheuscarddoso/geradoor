import { TAMANHO, TEXTOS_DA_IMAGEM, TIPO_DA_IMAGEM, imagemDeCompartilhamento } from "@/lib/og";

/*
 * A versão da arte, e por que ela existe.
 *
 * O Next deriva a query da og:image da hash DESTE arquivo, não do desenho em
 * lib/og.tsx. Quando a imagem da raiz mudou para a marca sozinha, o desenho
 * mudou e a URL não — e Facebook, WhatsApp e LinkedIn guardam a imagem por URL.
 * O resultado foi a prévia antiga continuar aparecendo mesmo depois de mandar
 * extrair de novo, porque o "extrair" rebusca o HTML e não os bytes da imagem.
 *
 * Mexer neste número muda a hash e, com ela, a URL: os caches de fora buscam
 * de novo. Incremente sempre que a composição da imagem da raiz mudar.
 */
const VERSAO_DA_ARTE = 2;

export const alt = TEXTOS_DA_IMAGEM["/"].titulo;
export const size = TAMANHO;
export const contentType = TIPO_DA_IMAGEM;

export default function Imagem() {
  void VERSAO_DA_ARTE;
  return imagemDeCompartilhamento("/");
}
