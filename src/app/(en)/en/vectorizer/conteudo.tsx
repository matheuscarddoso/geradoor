import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/vectorizer. O argumento forte aqui é que a imagem não sai do aparelho. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "What vectorizing actually does",
    conteudo: (
      <>
        <p>
          A JPG or PNG is a grid of pixels: zoom in and you find the squares. An <Dado>SVG is a drawing</Dado>, a
          list of curves and colors. It has no resolution, so the same mark serves a 16-pixel favicon and a
          two-meter banner with a clean edge at both.
        </p>
        <p>
          Vectorizing is the way back: start from the pixels and redraw the shapes as curves. That works very well
          for logos, icons, line art and flat-color illustration, and badly for photographs, where there is no
          crisp shape to recover.
        </p>
      </>
    ),
  },
  {
    titulo: "Your image never leaves your device",
    conteudo: (
      <>
        <p>
          The tracer runs <Dado>entirely inside your browser</Dado>, on a WebAssembly engine downloaded with the
          page. Not a byte of your image is uploaded. There is no queue, no server-side processing and nothing to
          delete afterwards.
        </p>
        <p>
          This matters when the file is a client&apos;s mark under NDA, or artwork that has not shipped yet. Every
          other vectorizer worth naming — Vectorizer.AI, Convertio, Adobe — sends your image to their servers. It
          is also why there is no daily cap here: the processing cost is your device&apos;s, not ours.
        </p>
      </>
    ),
  },
  {
    titulo: "Fidelity you can see before you download",
    conteudo: (
      <>
        <p>
          The tool separates colors, finds the outline of each region and fits <Dado>Bézier curves</Dado> over it,
          rather than a thousand-sided polygon pretending to be a curve. A straight edge is recognized as straight,
          an arc as an arc, a corner as a corner.
        </p>
        <p>
          When it finishes, a slider compares the original and the vector side by side, and the page reports{" "}
          <Dado>measured fidelity</Dado>: the percentage of pixels where the drawing matches the input. Change the
          color count or the detail level and watch the number move before you commit. Accepts JPG, PNG, WebP and
          AVIF up to 80 MB, with up to 64 colors in the result.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Is my image uploaded anywhere?",
    resposta:
      "No. The tracing engine runs inside your browser, in WebAssembly. The image is never uploaded, never stored and never passes through a server — not ours, not anyone's.",
  },
  {
    pergunta: "Does it work on photographs?",
    resposta:
      "It runs, but the result rarely justifies it. A photo is continuous gradient, and vectorizing turns gradient into flat patches: the file gets heavy and the result looks like a screen print. Vectorizing is for logos, icons, line art and flat-color illustration.",
  },
  {
    pergunta: "Will the SVG look identical to the original?",
    resposta:
      "No, and no vectorizer delivers that. Tracing simplifies: it merges close colors, drops noise and approximates curves. That is why the page reports measured fidelity as a percentage — you see what was lost before downloading rather than discovering it at print size.",
  },
  {
    pergunta: "What is the maximum file size?",
    resposta:
      "80 MB, in JPG, PNG, WebP or AVIF. Very large images are downscaled before tracing, because past a certain size the extra detail does not change the drawing and would only consume your device's memory.",
  },
  {
    pergunta: "Can I use the SVG commercially?",
    resposta:
      "The file is yours, for any use, commercial included. We do not charge, do not watermark and claim nothing over the result. Checking whether the image content respects someone else's trademark or copyright is the responsibility of whoever uploads it.",
  },
  {
    pergunta: "Can I edit the SVG afterwards?",
    resposta:
      "Yes. It is an ordinary SVG with shapes separated by color, and it opens in Illustrator, Inkscape, Figma, Affinity or any vector editor, where you can change every curve and every color.",
  },
  {
    pergunta: "What is the difference between vectorizing and just saving as SVG?",
    resposta:
      "Saving a PNG inside an .svg file only wraps the same pixels: zooming still shows the squares. Vectorizing redraws the shapes as curves, which is what makes the file sharp at any size.",
  },
];

export const VEJA = ["/en/png-to-svg", "/en/jpg-to-svg", "/en/background-remover"];
