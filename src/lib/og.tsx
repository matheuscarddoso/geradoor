import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * A imagem que aparece quando alguém compartilha uma página do Geradoor.
 *
 * Mesma composição em todas: a foto de fundo, uma camada preta por cima e o
 * nome da ferramenta ao centro, em Geist Pixel. O que muda é o texto.
 *
 * As imagens são geradas no build, não a cada acesso: cada rota tem um
 * `opengraph-image.tsx` sem dado dinâmico, e o Next transforma isso em arquivo
 * estático. Não há função de servidor rodando por causa disto, e não há custo
 * por compartilhamento.
 */

export const TAMANHO = { width: 1200, height: 630 };
export const TIPO_DA_IMAGEM = "image/png";

const daPasta = (caminho: string) => readFileSync(join(process.cwd(), caminho));

/**
 * A foto vai embutida: o gerador roda no build, sem servidor para buscá-la.
 *
 * Ela já vem escurecida e com a paleta reduzida. O escurecimento podia ser uma
 * camada preta aqui, mas aí o resultado teria as milhares de cores da foto
 * original, e o PNG que o gerador devolve passava de 2 MB — acima do que o
 * WhatsApp aceita para mostrar prévia. Com a paleta curta, o mesmo PNG fica
 * perto de 300 KB, e na tela a diferença não se vê: a foto já é feita de
 * blocos de cor chapada.
 */
const fundo = `data:image/png;base64,${daPasta("public/og-fundo.png").toString("base64")}`;

/**
 * Título e subtítulo de cada rota.
 *
 * Aqui, e não em `rotas.ts`: o menu precisa de rótulos curtos que caibam numa
 * linha estreita, e a imagem precisa de um nome grande e de uma frase que
 * explique — são textos com trabalhos diferentes.
 *
 * O título vai a uma ou duas palavras. Em corpo grande e fonte de pixel, uma
 * terceira palavra obriga a diminuir tudo, e o que era um cartaz vira um
 * parágrafo.
 */
export const TEXTOS_DA_IMAGEM: Record<string, { titulo: string; subtitulo: string }> = {
  "/": {
    titulo: "CPF",
    subtitulo: "Gere CPF válido para testar seus formulários. Grátis, sem cadastro e sem limite.",
  },
  "/cnpj": {
    titulo: "CNPJ",
    subtitulo: "Gere CNPJ válido para testar seus formulários. Grátis, sem cadastro e sem limite.",
  },
  "/cartao-de-credito": {
    titulo: "Cartão",
    subtitulo: "Números de cartão de crédito válidos para teste, com bandeira, validade e CVV.",
  },
  "/telefone": {
    titulo: "Telefone",
    subtitulo: "Gere celular com DDD real de qualquer estado, no formato que o seu sistema espera.",
  },
  "/qr-code": {
    titulo: "QR Code",
    subtitulo: "Crie QR Code de qualquer link, com a sua logo no meio e download em PNG ou SVG.",
  },
  "/codigo-de-barras": {
    titulo: "Código de barras",
    subtitulo: "Gere etiquetas com código de barras e imprima em folha A4, na medida certa.",
  },
  "/removedor-de-fundo": {
    titulo: "Removedor de fundo",
    subtitulo:
      "Tire o fundo de qualquer foto em segundos, com contorno preciso até no cabelo. Grátis e sem marca d'água.",
  },
  "/vetorizador": {
    titulo: "Vetorizador",
    subtitulo:
      "Transforme uma imagem em SVG: as formas são redesenhadas como curvas, nítidas em qualquer tamanho.",
  },
  "/instagram": {
    titulo: "Instagram",
    subtitulo: "QR Code que abre o seu perfil no aplicativo, pronto para imprimir ou postar.",
  },
  "/whatsapp": {
    titulo: "WhatsApp",
    subtitulo: "Crie o link wa.me com a mensagem já escrita, sem salvar o número na agenda.",
  },
  "/privacidade": {
    titulo: "Privacidade",
    subtitulo: "O que o Geradoor coleta, o que não coleta, e o que acontece com as imagens e os links que passam pelas ferramentas.",
  },
  "/termos": {
    titulo: "Termos de uso",
    subtitulo: "Para que servem os dados de teste, o que você pode fazer com os arquivos gerados e os limites da nossa responsabilidade.",
  },
  "/cookies": {
    titulo: "Cookies",
    subtitulo: "Sem rastreamento e sem publicidade: o que fica guardado é preferência sua, e fica no seu navegador.",
  },
};

/**
 * Corpo do título conforme o tamanho dele.
 *
 * O cartaz só funciona se o nome ocupar a largura, e um valor fixo não serve
 * para "CPF" e para "Removedor de fundo" ao mesmo tempo. A conta é pela
 * contagem de letras, que na Geist Pixel — de largura constante — prevê a
 * linha com precisão suficiente.
 */
/**
 * O contorno que engrossa o título até parecer semibold.
 *
 * A Geist Pixel tem um peso só — as variantes dela são formas de pixel
 * (quadrado, círculo, linha), não pesos —, e o gerador de imagem não engrossa
 * fonte que não tem o peso pedido: `fontWeight: 600` sai idêntico ao normal.
 * Um contorno da própria cor, nas quatro direções, engrossa o traço de
 * verdade, e numa fonte de pixel o resultado é limpo: não há curva para
 * borrar.
 *
 * A espessura acompanha o corpo, senão o mesmo valor engrossaria demais um
 * título pequeno e desapareceria num grande. 1,8% foi escolhido comparando
 * lado a lado: abaixo disso o peso mal se nota, acima vira negrito.
 */
export function contornoDoTitulo(corpo: number): string {
  const e = (corpo * 0.018).toFixed(2);
  return `${e}px 0 0 #fff, -${e}px 0 0 #fff, 0 ${e}px 0 #fff, 0 -${e}px 0 #fff`;
}

export function corpoDoTitulo(titulo: string): number {
  const letras = titulo.length;
  if (letras <= 4) return 168;
  if (letras <= 8) return 128;
  if (letras <= 12) return 104;
  if (letras <= 16) return 84;
  return 72;
}

export function imagemDeCompartilhamento(rota: string): ImageResponse {
  const texto = TEXTOS_DA_IMAGEM[rota];
  if (!texto) throw new Error(`Sem texto de compartilhamento para ${rota}`);
  const corpo = corpoDoTitulo(texto.titulo);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- fora do Next: isto vira uma imagem, não uma página */}
        <img src={fundo} alt="" width={TAMANHO.width} height={TAMANHO.height} style={{ position: "absolute", inset: 0 }} />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 26,
            padding: "0 96px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "Geist Pixel",
              fontSize: corpo,
              lineHeight: 1,
              color: "#ffffff",
              letterSpacing: -1,
              textShadow: contornoDoTitulo(corpo),
            }}
          >
            {texto.titulo}
          </div>
          <div
            style={{
              fontFamily: "Inter",
              fontSize: 27,
              lineHeight: 1.45,
              color: "rgba(255, 255, 255, 0.82)",
              maxWidth: 840,
            }}
          >
            {texto.subtitulo}
          </div>
        </div>
      </div>
    ),
    {
      ...TAMANHO,
      fonts: [
        { name: "Geist Pixel", data: daPasta("public/fonts/geistpixel-400.woff"), weight: 400, style: "normal" },
        { name: "Inter", data: daPasta("public/fonts/inter-400.ttf"), weight: 400, style: "normal" },
      ],
    }
  );
}
