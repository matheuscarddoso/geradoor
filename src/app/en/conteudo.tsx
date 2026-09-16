import Link from "next/link";
import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import type { ConteudoDaHome } from "@/components/home/Home";
import { ROTAS_PUBLICAS, traduzir } from "@/lib/rotas";

/**
 * O texto da home em inglês.
 *
 * Não é a tradução literal da versão em português. O assunto é o mesmo — o que
 * sai do aparelho, por que não há cadastro, o que é dado de teste —, mas quem
 * lê é outra pessoa: não conhece CPF nem CNPJ, e precisa que a frase diga o que
 * são antes de dizer o que o gerador faz.
 */

const linque = "font-medium text-foreground underline decoration-zinc-300 underline-offset-4 dark:decoration-zinc-600";

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "What leaves your device, and what doesn't",
    conteudo: (
      <>
        <p>
          <Dado>Five of the nine tools send nothing anywhere.</Dado> The generators run in JavaScript inside your
          browser. The{" "}
          <Link href="/en/vectorizer" className={linque}>
            vectorizer
          </Link>{" "}
          runs on a WebAssembly engine downloaded with the page: your image is never uploaded, never stored, never
          touches a server. Close the tab and it is gone.
        </p>
        <p>
          The other four need a server, and it is worth saying exactly what for. The{" "}
          <Link href="/en/background-remover" className={linque}>
            background remover
          </Link>{" "}
          sends a <Dado>downscaled copy</Dado> of the photo — at most 2048 pixels on the long side — to compute
          the cutout. That copy is discarded when the request ends. Your full-resolution photo never leaves your
          device: the final cutout is assembled in your browser.
        </p>
        <p>
          The three QR Code generators store the destination address, because a short link without a stored
          destination is not a short link.
        </p>
      </>
    ),
  },
  {
    titulo: "Why there is no sign-up",
    conteudo: (
      <>
        <p>
          Because there is nothing to keep. No account means no password to leak, no email to sell and no history
          to cross-reference — and, in practice, sign-up on a one-off tool exists to capture a contact, not to make
          the tool better.
        </p>
        <p>
          The economics work because almost everything runs on your device: the thousandth generated number costs
          us exactly what the first one did, which is nothing. The only tool with a daily cap is the background
          remover, which uses a real server — and when the cap runs out the cutout moves to your own device with
          smaller models, instead of turning into a paywall.
        </p>
      </>
    ),
  },
  {
    titulo: "Test data belongs to nobody",
    conteudo: (
      <>
        <p>
          The SSNs, EINs, card numbers and phone numbers generated here are{" "}
          <Dado>combinations that satisfy each format&apos;s rules</Dado>. They were never issued, belong to no
          person or company, carry no credit and are not identification.
        </p>
        <p>
          They exist to test software: filling a staging form, checking an input mask, seeding a test database,
          verifying the error message on a sign-up flow. Using them to impersonate someone, commit fraud or bypass
          identity verification is a crime, and the responsibility is entirely the user&apos;s.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Is it really free?",
    resposta:
      "Yes. No sign-up, no paid tier, no watermark and no download limit. Most tools run inside your browser, so usage costs us nothing — and the one that does cost something, the background remover, has a daily cap instead of a price.",
  },
  {
    pergunta: "Do I need an account?",
    resposta:
      "No, for any tool. There is no sign-up on this site: no password to leak, no email to sell and no history to cross-reference.",
  },
  {
    pergunta: "Are my images stored?",
    resposta:
      "No. In the vectorizer the image never leaves your device. In the background remover only a downscaled copy is sent to compute the outline, and it is discarded when the request ends, with no storage and no cache — your full-resolution photo stays with you.",
  },
  {
    pergunta: "Does it work on a phone?",
    resposta:
      "Yes, every tool. There is no app to install and no extension: everything happens in the browser, on desktop and on mobile.",
  },
  {
    pergunta: "Is the generated data real?",
    resposta:
      "No. These are combinations that satisfy each format's rules and nothing more — never issued, listed in no registry, and rejected by any system that checks against the official source.",
  },
  {
    pergunta: "Can I use the files commercially?",
    resposta:
      "Yes. The cutout PNG, the SVG and the QR Code are yours, for any use, commercial included. Checking whether the content respects someone else's trademark or copyright is the responsibility of whoever uploads it.",
  },
  {
    pergunta: "Is there an API?",
    resposta:
      "Not a public, documented one yet. Every tool works through the browser, and anyone who needs to automate at volume should look for a service built for that.",
  },
];

const DESTAQUE = traduzir(ROTAS_PUBLICAS.find((r) => r.novo) ?? ROTAS_PUBLICAS[0], "en");

export const HOME: ConteudoDaHome = {
  hero: {
    aviso: { texto: DESTAQUE.descricao, href: DESTAQUE.href },
    titulo: { antes: "Tools that do the job", destaque: "and get out of the way" },
    subtitulo:
      "Background removal, vectorizing, QR Codes and test data — most of it without ever uploading your file.",
    acao: { texto: "Open the vectorizer", href: "/en/vectorizer" },
    secundaria: { texto: "See every tool", href: "#ferramentas" },
    nota: "Free, no sign-up and no watermark.",
    legendaDaTela:
      "The Geradoor vectorizer with a logo converted to SVG: a slider comparing image and vector, colour and detail controls, and 98% measured fidelity.",
  },
  ferramentas: {
    marcador: "The tools",
    pilula: "Nine, and none asks for an account",
    titulo: { antes: "Images, codes and test data", destaque: "in one place" },
  },
  pilares: {
    marcador: "How it works",
    pilula: "The essentials",
    titulo: { antes: "Open it, use it,", destaque: "move on" },
    cartoes: [
      {
        titulo: "Runs on your device",
        texto:
          "Five of the nine tools compute everything inside the browser, in JavaScript or WebAssembly. No upload, no queue, and nothing left behind to delete.",
      },
      {
        titulo: "No sign-up",
        texto:
          "There is no account on this site. No password to leak, no email to sell, no history to cross-reference — and nothing between opening the page and using it.",
      },
      {
        titulo: "No watermark",
        texto:
          "Files come out clean and at original resolution. No hidden paid tier and no downscaled preview that only improves if you subscribe.",
      },
    ],
  },
  detalhe: {
    marcador: "Privacy",
    pilula: "What stays, what goes",
    titulo: { antes: "Privacy, said", destaque: "plainly" },
  },
  perguntas: {
    marcador: "Questions",
    pilula: "Frequently asked",
    titulo: { antes: "What people ask", destaque: "before using it" },
  },
  chamada: {
    titulo: "Pick a tool and start",
    texto: "No sign-up, no limits, nothing to install. Open it and go.",
    acao: DESTAQUE.label,
    secundaria: "How we handle your data",
  },
  secoes: SECOES,
  faq: FAQ,
};
