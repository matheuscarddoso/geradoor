import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/phone. As regras do NANP, e por que 555 é o padrão. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "The rules a US number has to follow",
    conteudo: (
      <>
        <p>
          A number in the North American Numbering Plan is <Dado>(NXX) NXX-XXXX</Dado>, and the letters are not
          decoration. N means a digit from <Dado>2 to 9</Dado>: neither the area code nor the central office
          prefix may start with 0 or 1, because those were reserved for the operator and for long distance.
        </p>
        <p>
          Two more rules that catch naive generators. The prefix cannot be <Dado>N11</Dado> — 211, 311, 411, 611,
          911 and the rest are service codes. And an area code ending in 99 is held back for future expansion.
        </p>
      </>
    ),
  },
  {
    titulo: "555 does not mean what people think",
    conteudo: (
      <>
        <p>
          Films use 555 numbers, so the whole prefix is widely assumed to be fake. It is not. Only{" "}
          <Dado>555-0100 through 555-0199</Dado> is reserved for fiction. The rest of the 555 range is assignable,
          and some of it is assigned — 555-1212 is directory assistance across the continent.
        </p>
        <p>
          That hundred-number block is the default here, because a test number that actually rings someone&apos;s
          phone is worse than one that fails a validator. If your validation rejects 555 outright, the switch above
          turns it off and the generator uses any legal prefix instead.
        </p>
      </>
    ),
  },
  {
    titulo: "Area codes by state, and why the list is short",
    conteudo: (
      <>
        <p>
          Picking a state gives you an area code that genuinely serves it, which matters when the system under
          test derives a region, a timezone or a tax rule from the number.
        </p>
        <p>
          The list covers the more populous states rather than all 300-plus codes in the plan. A full table would
          need updating every time a new overlay opens, and a stale table that claims a code exists where it does
          not is worse than a short one that is right.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Will the generated number reach anyone?",
    resposta:
      "Not with the 555 range on, which is the default: 555-0100 through 555-0199 is reserved for fiction and is not assignable. With it off, the generator produces any legal number, and those can correspond to a real line.",
  },
  {
    pergunta: "Can I pick a state?",
    resposta:
      "Yes. The generator uses an area code that actually serves the state you choose, which matters when the system under test derives a region, a timezone or a tax rule from the number.",
  },
  {
    pergunta: "Why can't an area code start with 0 or 1?",
    resposta:
      "Those digits were reserved for the operator and for long-distance access when the plan was designed, so both the area code and the central office prefix must start with a digit from 2 to 9.",
  },
  {
    pergunta: "Are all 555 numbers fake?",
    resposta:
      "No, and this is a common misconception. Only 555-0100 through 555-0199 is reserved for fiction. The rest of the 555 prefix is assignable, and 555-1212 is directory assistance.",
  },
  {
    pergunta: "Does it generate numbers with the country code?",
    resposta:
      "The output is the ten-digit national format. Add a leading 1 for the country code, or +1 for E.164, depending on what your system expects.",
  },
  {
    pergunta: "Is the number sent to a server?",
    resposta: "No. It is generated in your browser. Nothing leaves your device and nothing is stored.",
  },
];

export const VEJA = ["/en/ssn", "/en/ein", "/en/whatsapp-link"];
