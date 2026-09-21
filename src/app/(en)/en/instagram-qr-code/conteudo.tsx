import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/instagram-qr-code. O ponto é: não é o nametag do app. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "How to create an Instagram QR Code",
    conteudo: (
      <>
        <p>
          Type your <Dado>@</Dado> and the code appears immediately, pointing at your public profile address.
          Download PNG for screen use, or SVG and PDF for print — both are vector and stay sharp at any size.
        </p>
        <p>
          Any phone camera reads it, without the Instagram app being open: this is an ordinary QR Code, not the
          app&apos;s internal code. Whoever scans lands on your profile.
        </p>
      </>
    ),
  },
  {
    titulo: "Why not use the app's own nametag",
    conteudo: (
      <>
        <p>
          Instagram has its own code, readable only from inside the app, through its camera. It works fine when
          both people are already on Instagram, and it fails on a poster, a shop window, a menu or a business card,
          where whoever walks past will point their normal camera.
        </p>
        <p>
          The code on this page is a <Dado>standard QR Code</Dado> pointing at instagram.com with your username.
          Any camera reads it, and the phone opens the app if it is installed.
        </p>
      </>
    ),
  },
  {
    titulo: "Where to print it, and at what size",
    conteudo: (
      <>
        <p>
          Shop windows, packaging, menus, badges and business cards. For print prefer <Dado>SVG or PDF</Dado>:
          neither has a fixed resolution, so neither shows a staircase edge when scaled.
        </p>
        <p>
          Leave a white margin around the code. Without that quiet zone the camera loses the reference for the
          corner markers and the scan fails. Print with good contrast too: a light code on a dark background gives
          simpler readers trouble.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Does Instagram need to be open to scan it?",
    resposta:
      "No. It is an ordinary QR Code that any phone camera reads. The device opens the link in the Instagram app if it is installed, or in the browser if it is not.",
  },
  {
    pergunta: "Does it work for business and personal profiles?",
    resposta:
      "Yes, for any public profile. The code points at your username's address on instagram.com, and the account type changes nothing.",
  },
  {
    pergunta: "Does the QR Code stop working if I change my @?",
    resposta:
      "Yes. The code points at the address of the username given, so changing the @ retires the old address and you need to generate a new code.",
  },
  {
    pergunta: "Can I print it large?",
    resposta:
      "Yes. Download SVG or PDF, which are vector and stay sharp at any size, from a badge to a poster. PNG is better for screen use.",
  },
  {
    pergunta: "Is there a watermark or a charge?",
    resposta: "No. No watermark, no sign-up and no charge, and the file is yours for any use, commercial included.",
  },
  {
    pergunta: "What is the difference from the Instagram nametag?",
    resposta:
      "The nametag is only readable from inside the Instagram app. This is a standard QR Code readable by any camera — which is what you need on printed material, where nobody will open the app to scan.",
  },
];

export const VEJA = ["/en/qr-code", "/en/whatsapp-link", "/en/background-remover"];
