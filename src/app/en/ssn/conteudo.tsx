import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /en/ssn.
 *
 * O assunto central é o que separa o SSN do CPF: não há dígito verificador, e a
 * validade é uma questão de faixa. Quem chega esperando a lógica de um documento
 * brasileiro erra, e o texto corrige isso na primeira seção.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "An SSN has no check digit",
    conteudo: (
      <>
        <p>
          This trips up anyone used to national ID numbers that end in a computed digit. A Social Security Number
          has <Dado>no checksum at all</Dado>. There is no arithmetic you can run on the first seven digits to
          derive the last two, which means no form can prove an SSN is genuine without asking the SSA.
        </p>
        <p>
          What a form <Dado>can</Dado> check is the range. Certain blocks were never issued and never will be, so
          a number inside them is definitively invalid. That is the whole of offline SSN validation.
        </p>
      </>
    ),
  },
  {
    titulo: "The ranges that were never issued",
    conteudo: (
      <>
        <p>The SSA has published these, and they hold for every SSN regardless of when it was assigned:</p>
        <ul className="flex list-disc flex-col gap-1 ps-5 marker:text-zinc-300 dark:marker:text-zinc-600">
          <li>
            Area (first three digits) of <Dado>000</Dado>, <Dado>666</Dado>, or anything from{" "}
            <Dado>900 to 999</Dado>
          </li>
          <li>
            Group (middle two) of <Dado>00</Dado>
          </li>
          <li>
            Serial (last four) of <Dado>0000</Dado>
          </li>
        </ul>
        <p>
          One thing that is <Dado>no longer true</Dado>, and that plenty of blog posts still repeat: the area
          number used to indicate the state where the card was issued. Since the SSA randomized assignment in June
          2011, it indicates nothing. Any tool claiming to tell you where an SSN came from is reading a pattern
          that stopped existing.
        </p>
      </>
    ),
  },
  {
    titulo: "Why the demo range is off by default",
    conteudo: (
      <>
        <p>
          The SSA reserves <Dado>987-65-4320 through 987-65-4329</Dado> for advertising and training material.
          Those ten numbers will never belong to anyone, which sounds like exactly what a test generator should
          produce.
        </p>
        <p>
          Except they sit inside the 900-999 block that was never issued. They are provably fake{" "}
          <Dado>and therefore invalid</Dado>, so a form with strict validation rejects them. A generator that
          returned only those numbers would be useless for testing the success path of a sign-up flow, which is
          what most people need. So the default is a number from the issuable ranges, and the demo range is one
          switch away.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Does the generated SSN belong to anyone?",
    resposta:
      "It was not issued and is not registered to anyone. Because the SSA has issued a large share of the valid space, a randomly generated number could coincide with a real one — which is exactly why these belong in test environments and nowhere else.",
  },
  {
    pergunta: "Is it legal to generate an SSN?",
    resposta:
      "Generating one is legal: it is a number in a valid format, and it exists to test software. Using one to impersonate someone, commit fraud, apply for credit or bypass identity verification is a federal crime, regardless of where the number came from.",
  },
  {
    pergunta: "Why not use 123-45-6789?",
    resposta:
      "You can, and it is formally valid. But many systems blocklist it precisely because it is the obvious fake, so it fails in a way that tells you nothing about your validation logic. A random number from the issuable range exercises the real path.",
  },
  {
    pergunta: "Can I tell which state an SSN came from?",
    resposta:
      "Not anymore. The area number encoded the issuing state until June 2011, when the SSA randomized assignment. Any tool that claims to map a modern SSN to a state is reading a pattern that no longer exists.",
  },
  {
    pergunta: "Is the number sent to a server?",
    resposta:
      "No. The whole thing is computed in your browser, in JavaScript. Nothing generated here leaves your device, is stored anywhere, or passes through a server.",
  },
  {
    pergunta: "How do I validate an SSN in my own code?",
    resposta:
      "Check the format and the three excluded ranges: area not 000, 666 or 900-999; group not 00; serial not 0000. There is no check digit to verify. Anything beyond that requires the SSA's Consent Based SSN Verification service.",
  },
];

export const VEJA = ["/en/ein", "/en/credit-card", "/en/phone"];
