import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/qr-code. Os percentuais de correção são sobre codewords. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "How to create a QR Code from a link",
    conteudo: (
      <>
        <p>
          Paste the address in the field above. The QR Code appears immediately and downloads as{" "}
          <Dado>PNG, SVG or PDF</Dado>. For print, use SVG or PDF: both are vector and stay sharp at any size,
          from a sticker to a billboard.
        </p>
        <p>
          The code points to a short link of ours, which redirects to the address you gave. That keeps the drawing
          simpler and easier to scan — the longer the text, the denser the QR Code and the closer a camera has to
          get.
        </p>
      </>
    ),
  },
  {
    titulo: "Why a logo in the middle works",
    conteudo: (
      <>
        <p>
          Every QR Code carries redundancy. The standard defines four error correction levels — L, M, Q and H —
          recovering roughly <Dado>7%, 15%, 25% and 30% of the symbol&apos;s codewords</Dado> using Reed-Solomon.
          It is the same math that keeps a scratched or dirty code readable.
        </p>
        <p>
          When you add a logo, this page raises correction to <Dado>level H</Dado>, the highest, and that recovery
          budget is what the logo consumes. It goes in the center rather than a corner because the three position
          squares and the timing patterns are <Dado>not protected</Dado> by error correction at all — covering one
          breaks the code at any level.
        </p>
        <p>Worth stating plainly: those percentages are of codewords, not of image area.</p>
      </>
    ),
  },
  {
    titulo: "The short link, and what is stored",
    conteudo: (
      <>
        <p>
          For the QR Code to work later, the destination has to be stored. Our database keeps the URL you entered,
          the short code, the creation date and a <Dado>scan count</Dado>. Each scan records only date and time —
          no IP address, no location, no device.
        </p>
        <p>
          Because of that, do not put sensitive information in the shortened URL: anyone with the short code
          reaches the destination. The detail is in the Privacy Policy.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Does the QR Code expire?",
    resposta:
      "No. The short link stays active indefinitely and the code keeps working. If you want a QR Code you created deactivated, ask by email.",
  },
  {
    pergunta: "Can I print it large?",
    resposta:
      "Yes. Download as SVG or PDF: both are vector and stay sharp at any size, without the squares that appear when a PNG is scaled up.",
  },
  {
    pergunta: "Is there a watermark or usage limit?",
    resposta:
      "No. No watermark, no sign-up, no limit on how many codes you create and no charge. The file is yours for any use, commercial included.",
  },
  {
    pergunta: "Why does the logo have to go in the center?",
    resposta:
      "Because the three position markers in the corners and the timing patterns are not covered by error correction: covering any of them breaks the code. The center is the only region error correction can reconstruct.",
  },
  {
    pergunta: "What error correction level is used?",
    resposta:
      "Level H when there is a logo, the highest, recovering about 30% of the symbol's codewords. That budget is what the logo consumes. Without a logo a lower level is enough and keeps the drawing simpler to scan.",
  },
  {
    pergunta: "Can I see how many people scanned it?",
    resposta:
      "The scan count is recorded, with date and time. We do not store IP address, location, device or anything else about who scanned.",
  },
  {
    pergunta: "Can I change the destination after printing?",
    resposta:
      "Not yet. The short code points to the address given at creation and is not editable — if the destination changes, you will need a new QR Code.",
  },
];

export const VEJA = ["/en/instagram-qr-code", "/en/whatsapp-link", "/en/vectorizer"];
