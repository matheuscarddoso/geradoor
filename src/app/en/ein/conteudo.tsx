import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/ein. Prefixo de campus é a única verificação offline possível. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "What the two-digit prefix means",
    conteudo: (
      <>
        <p>
          An EIN is nine digits written <Dado>XX-XXXXXXX</Dado>. The first two are the campus prefix: the IRS
          office or system that assigned the number. The remaining seven are sequential.
        </p>
        <p>
          The prefix is the only part a form can check without calling the IRS. If the first two digits are not on
          the published list, the number was never assigned. Everything else is unverifiable offline, because{" "}
          <Dado>an EIN has no check digit</Dado> — same as an SSN, and unlike most national company identifiers.
        </p>
      </>
    ),
  },
  {
    titulo: "Prefixes moved online, and old ones still count",
    conteudo: (
      <>
        <p>
          The prefix used to mean a physical location: 06 was Connecticut, 95 was California. That stopped in 2001,
          when the IRS moved assignment to campuses and internet applications. Prefixes like{" "}
          <Dado>20, 26, 27, 45, 46, 47, 81 and 82</Dado> come from online applications and map to no state at all.
        </p>
        <p>
          Numbers issued under the old scheme stay valid forever, so a validator has to accept both. This generator
          draws from the full published list rather than guessing at a range.
        </p>
      </>
    ),
  },
  {
    titulo: "An EIN is public, and that matters for test data",
    conteudo: (
      <>
        <p>
          Unlike an SSN, an EIN is not secret. Nonprofits publish theirs on Form 990, and the IRS exempt
          organization database is searchable. That makes it tempting to grab a real one for testing.
        </p>
        <p>
          Do not. A real EIN in a test database is real company data in a system that was never designed to hold
          it, and it will eventually leak into a log, a fixture, or a screenshot. A generated number costs nothing
          and carries no such risk.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Is the generated EIN registered to a company?",
    resposta:
      "No. It has a valid campus prefix and a sequential body, which is all an offline check can verify. It is not assigned in the IRS records and will be rejected by anything that queries them.",
  },
  {
    pergunta: "Does an EIN have a check digit?",
    resposta:
      "No. Unlike many national company identifiers, an EIN carries no checksum. The only offline validation possible is whether the two-digit prefix appears on the IRS list of assigned campus prefixes.",
  },
  {
    pergunta: "What is the difference between an EIN and a TIN?",
    resposta:
      "TIN is the umbrella term for taxpayer identification numbers, which includes SSNs, EINs and ITINs. An EIN is specifically the one issued to businesses and other entities, and it is sometimes called a Federal Tax Identification Number.",
  },
  {
    pergunta: "Can I tell which state an EIN came from?",
    resposta:
      "Only for numbers issued before 2001. The prefix used to map to a physical district, but assignment moved to campuses and online applications, and prefixes like 20, 26, 27, 45, 46, 47, 81 and 82 correspond to no location.",
  },
  {
    pergunta: "Is the number sent to a server?",
    resposta:
      "No. It is generated in your browser, in JavaScript. Nothing leaves your device and nothing is stored.",
  },
  {
    pergunta: "Why not just use a real company's EIN for testing?",
    resposta:
      "Because EINs are public, it is easy to find one — and that is exactly the problem. Real company data in a test system eventually surfaces in a log, a fixture or a screenshot. A generated number carries none of that risk.",
  },
];

export const VEJA = ["/en/ssn", "/en/credit-card", "/en/phone"];
