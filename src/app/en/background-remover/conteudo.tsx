import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /en/background-remover.
 *
 * Não é tradução do português: em inglês a disputa é contra remove.bg e Canva,
 * e o que nos separa deles — resolução original, sem marca d'água, a foto não
 * sair do aparelho — precisa aparecer mais cedo e mais explícito.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "How to remove a background",
    conteudo: (
      <>
        <p>
          Drop an image into the area above, or click to pick a file. The cutout takes a few seconds and downloads
          as a <Dado>transparent PNG</Dado>. No sign-up, no queue, no watermark and no download limit.
        </p>
        <p>
          When the machine misses a corner — the gap between an arm and a body, a thin strap, a shadow — the brush
          fixes it by hand: paint to bring back what was erased, or to erase what stayed. The magic brush completes
          a shape from a short stroke.
        </p>
      </>
    ),
  },
  {
    titulo: "Full resolution, and no watermark",
    conteudo: (
      <>
        <p>
          This is the difference that usually decides which tool people keep. The file comes out{" "}
          <Dado>the size it went in</Dado>: upload a 12-megapixel photo and the cutout PNG is 12 megapixels. There
          is no reduced preview, no low-resolution download and no paid tier that unlocks the real file.
        </p>
        <p>
          The cutout does not recompress either. The computed mask is applied over the original pixels, in your own
          browser, so what you get is your photo with the background cut away rather than a processed copy of it.
        </p>
      </>
    ),
  },
  {
    titulo: "Hair, fur and thin edges",
    conteudo: (
      <>
        <p>
          The cutout is not a hard outline. Every pixel along the edge gets <Dado>partial transparency</Dado>,
          which is what lets a strand of hair, animal fur or a thin leaf come through without a staircase edge and
          without the pale halo that gives away automatic cutouts.
        </p>
        <p>
          Accepts JPG, PNG, WebP and AVIF, up to 80 MB. The hard case is pale hair against a pale background, where
          there is no contrast for the machine to work from — that is what the brush is for.
        </p>
      </>
    ),
  },
  {
    titulo: "Product photos for e-commerce",
    conteudo: (
      <>
        <p>
          The most common use, and the most demanding. Marketplaces usually want a{" "}
          <Dado>white background with the product centered</Dado>, and a photo taken on a workbench rarely arrives
          that way. Download the transparent PNG and place the product over white, or over any campaign color,
          without reshooting.
        </p>
        <p>
          Two details that matter for a catalog: a product with a <Dado>hole through it</Dado>, like a bag handle
          or the gap in a chair, needs that hole transparent rather than filled, and the brush fixes it when the
          machine closes the gap. Glass, acrylic and anything glossy is where nearly every tool struggles, so check
          the edge before you publish.
        </p>
      </>
    ),
  },
  {
    titulo: "Is your photo stored?",
    conteudo: (
      <>
        <p>
          No. To compute the outline, your browser sends a <Dado>downscaled copy</Dado> of the image, at most 2048
          pixels on the long side, to a service of ours, which returns only the mask of what is in the foreground.
          That copy is processed and discarded when the request ends, with no storage and no cache, and the request
          carries no cookie and no referer.
        </p>
        <p>
          Your full-resolution photo <Dado>never leaves your device</Dado>: the final cutout is assembled here, in
          your browser, from the mask that came back. When the service is down or the daily cap is reached, the
          whole cutout moves to your own device with smaller models, and the page says so.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Is it free? Is there a watermark?",
    resposta:
      "It is free and there is no watermark. No sign-up, no hidden paid tier, and the file comes out at the original resolution of your photo rather than a reduced preview that only improves if you pay.",
  },
  {
    pergunta: "Can I remove a background without losing quality?",
    resposta:
      "Yes. The PNG has the same resolution as the image that went in, and the mask is applied over the original pixels with no recompression. The only thing that changes is the background, which becomes transparent.",
  },
  {
    pergunta: "What format is the file?",
    resposta:
      "PNG with an alpha channel, which is the format that stores real transparency. JPG cannot do this: the format has no transparency channel, so a removed background would come back as white.",
  },
  {
    pergunta: "Does it handle hair, fur and thin edges?",
    resposta:
      "Yes. The edge gets partial transparency instead of a hard on-off outline, which is what lets hair and fur come through without a staircase edge. Pale hair on a pale background is the hard case, and the brush fixes what is left.",
  },
  {
    pergunta: "Does it work for product photos?",
    resposta:
      "It does, and that is the most common use. Download the transparent PNG and place the product over the white background a marketplace asks for. Products with a hole through them and glass or acrylic items are the cases worth checking before you publish.",
  },
  {
    pergunta: "What is the maximum file size?",
    resposta:
      "80 MB per file, in JPG, PNG, WebP or AVIF. Large photos are downscaled only for the step that computes the outline; the final cutout is assembled at the original resolution.",
  },
  {
    pergunta: "Are my photos used to train a model?",
    resposta:
      "No. The downscaled copy sent to compute the outline is discarded when the request ends, is never stored, and feeds no training. Your full-resolution photo never leaves your device in the first place.",
  },
  {
    pergunta: "Do I need to install anything or create an account?",
    resposta:
      "No. It runs in the browser, on desktop and mobile, with no program and no extension to install, and no sign-up — there is no email to hand over and nothing behind a login.",
  },
  {
    pergunta: "Can I replace the background with a color or another image?",
    resposta:
      "The download has a transparent background, which is what lets you place the cutout over any color or image in the editor of your choice. Replacing the background inside this tool does not exist yet.",
  },
];

export const VEJA = ["/en/vectorizer", "/en/qr-code"];
