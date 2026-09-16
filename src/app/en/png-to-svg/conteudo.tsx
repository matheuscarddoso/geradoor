import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/png-to-svg. Canal alfa, compressão sem perda, print de tela. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "PNG is the best format to vectorize",
    conteudo: (
      <>
        <p>
          PNG is <Dado>lossless</Dado>: the file holds exactly the pixels the program wrote, without the smearing
          JPG leaves around edges. For tracing that changes everything — the boundary between one color and the
          next arrives crisp, and the curve fitted over it lands where it should.
        </p>
        <p>
          It is why a logo exported as PNG almost always vectorizes better than the same logo as JPG, even at
          identical pixel dimensions.
        </p>
      </>
    ),
  },
  {
    titulo: "What happens to transparency",
    conteudo: (
      <>
        <p>
          PNG has an <Dado>alpha channel</Dado>, and a logo in PNG usually arrives with a transparent background.
          Tracing respects that: the transparent region becomes no shape at all, and the SVG comes out with the
          background cut through — which is exactly what you want when the file goes over another color.
        </p>
        <p>
          One case to watch: <Dado>partial</Dado> transparency, like a soft shadow or a feathered glow. Vectors
          have no per-pixel opacity, so a shadow turns into a step of color or disappears. If the file has a
          shadow, it probably will not survive.
        </p>
      </>
    ),
  },
  {
    titulo: "Screenshots work too",
    conteudo: (
      <>
        <p>
          Screen captures are where this pays off most, and almost nobody thinks of it. A screenshot of an icon, a
          chart or a diagram is <Dado>flat color with crisp edges</Dado> — the ideal case for tracing. You recover
          an editable file from something that only existed as an image.
        </p>
        <p>
          Small text is the exception: letters 10 or 12 pixels tall have no shape left to redraw, and the result
          comes out mushy. For those, raise the detail level and check the fidelity the page reports before
          downloading.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "How do I convert PNG to SVG?",
    resposta:
      "Drop the PNG into the area above and wait for the trace. Adjust the color count and detail level if you want, check the fidelity the page reports, and download the SVG. No sign-up and no software to install.",
  },
  {
    pergunta: "Is PNG transparency kept in the SVG?",
    resposta:
      "Yes, when it is full transparency: the cut-through region becomes no shape and the SVG has a transparent background. Partial transparency like a soft shadow does not survive — vectors have no per-pixel opacity, so the gradient becomes a step of color or disappears.",
  },
  {
    pergunta: "Why does PNG vectorize better than JPG?",
    resposta:
      "Because PNG is lossless and holds the exact boundary between one color and the next. JPG smears those boundaries when it compresses, and the tracer ends up following the smear instead of the shape.",
  },
  {
    pergunta: "Does it work on screenshots?",
    resposta:
      "Very well, because screen captures are usually flat color with crisp edges. The exception is small text: letters a few pixels tall have no shape left to redraw and come out mushy.",
  },
  {
    pergunta: "Is the file uploaded anywhere?",
    resposta:
      "No. The conversion runs inside your browser, in WebAssembly. The PNG is never uploaded, never stored and never passes through a server.",
  },
  {
    pergunta: "What is the maximum PNG size?",
    resposta:
      "80 MB. Very large images are downscaled before tracing, because past a certain size the extra detail does not change the drawing and would only consume your device's memory.",
  },
  {
    pergunta: "Can I convert several PNGs at once?",
    resposta:
      "Not yet. Conversion is one file at a time, so you can check the fidelity and adjust colors and detail before downloading.",
  },
];

export const VEJA = ["/en/vectorizer", "/en/jpg-to-svg"];
