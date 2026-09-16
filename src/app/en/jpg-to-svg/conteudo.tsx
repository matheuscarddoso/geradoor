import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/jpg-to-svg. Artefato de compressão, foto como pior caso. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "JPG arrives with noise, and that hurts the trace",
    conteudo: (
      <>
        <p>
          JPG is <Dado>lossy</Dado>: to save space, the format scrambles the pixels around every high-contrast
          edge. That is blocking artifact, nearly invisible to the eye — but the tracer sees it, and tends to
          follow the smear instead of the shape.
        </p>
        <p>
          In practice it shows up as a slightly wavy edge where a straight line should be. If the same artwork
          exists as PNG, use the PNG: the result is cleaner for the same effort.
        </p>
      </>
    ),
  },
  {
    titulo: "If your JPG is a photo, it probably is not worth it",
    conteudo: (
      <>
        <p>
          Most JPGs in the world are photographs, and a photograph is the <Dado>worst case</Dado> for vectorizing.
          Photos are continuous gradient; vectors are flat-color shapes. Converting turns the gradient into
          patches, the file gets heavy, and the result looks like a screen print — occasionally striking, almost
          never what the person wanted.
        </p>
        <p>
          It is worth it when the JPG is really a drawing that was saved as JPG: a logo, an icon, line art, a
          label, a scanned signature. That is the common case for someone who received a client&apos;s mark by
          email and does not have the original file.
        </p>
      </>
    ),
  },
  {
    titulo: "Getting the most out of a bad JPG",
    conteudo: (
      <>
        <p>
          <Dado>Lower the color count.</Dado> Fewer colors force the tracer to ignore the variation the
          compression invented and to see the regions that matter. On a two-color logo, ask for two colors.
        </p>
        <p>
          Then check the <Dado>measured fidelity</Dado> the page reports before downloading: the percentage of
          pixels where the drawing matches the input. It drops when you simplify too far, and it is how you find
          the point where the file got clean without ceasing to be the same mark.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "How do I convert JPG to SVG?",
    resposta:
      "Drop the JPG into the area above. Because JPG arrives with compression noise, the first adjustment worth making is lowering the color count, and the fidelity the page reports tells you whether you simplified too far. Then download the SVG.",
  },
  {
    pergunta: "Can I vectorize a photo from a JPG?",
    resposta:
      "You can, but the result rarely justifies it. A photo is continuous gradient and a vector is flat-color shapes: converting turns the gradient into patches, the file gets heavy and the result looks like a screen print. Vectorizing is for logos, icons and line art.",
  },
  {
    pergunta: "Why is the edge of my SVG wavy?",
    resposta:
      "Because JPG compresses with loss and scrambles the pixels around every high-contrast edge. The tracer follows that smear. Lowering the color count helps, and using the PNG of the same artwork, when one exists, solves it.",
  },
  {
    pergunta: "JPG or PNG: which converts better?",
    resposta:
      "PNG, whenever you have the choice. PNG is lossless and holds the exact boundary between colors, while JPG hands you the boundary already blurred by compression.",
  },
  {
    pergunta: "Is the file uploaded anywhere?",
    resposta:
      "No. The conversion runs inside your browser, in WebAssembly. The JPG is never uploaded, never stored and never passes through a server.",
  },
  {
    pergunta: "What is the maximum JPG size?",
    resposta:
      "80 MB. Worth noting that high resolution does not improve a JPG result: the compression noise is scaled up too, and an 8000-pixel file often vectorizes the same or worse than the same artwork at 2000.",
  },
  {
    pergunta: "Will the SVG keep the original quality?",
    resposta:
      "It will not be identical, and no vectorizer delivers that. Tracing simplifies: it merges close colors, drops noise and approximates curves. That is why the page shows fidelity as a percentage, so you see what was lost before downloading.",
  },
];

export const VEJA = ["/en/vectorizer", "/en/png-to-svg"];
