import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/credit-card. Luhn, prefixos e a inexistência de faixa de teste. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "How a card number is validated",
    conteudo: (
      <>
        <p>
          Every card number satisfies the <Dado>Luhn algorithm</Dado>, defined in ISO/IEC 7812. The arithmetic:
          from the right, double every second digit; when doubling passes 9, add the two digits of the result (or
          subtract 9, which is the same). Sum everything. If the total divides by 10, the number passes.
        </p>
        <p>
          It is a <Dado>typo check, not a fraud check</Dado>: it catches a wrong digit and most transpositions of
          neighbors. Anyone can produce a number that passes Luhn — what decides whether a purchase happens is the
          issuer&apos;s authorization, not this sum.
        </p>
      </>
    ),
  },
  {
    titulo: "The prefix names the network",
    conteudo: (
      <>
        <p>
          The leading digits are the IIN, which identifies who issued the card. That is why a form recognizes the
          network while you type, before any lookup. The prefixes published by the networks themselves:
        </p>
        <ul className="flex list-disc flex-col gap-1 ps-5 marker:text-zinc-300 dark:marker:text-zinc-600">
          <li>
            <Dado>Visa</Dado> — starts with 4; 13, 16 or 19 digits
          </li>
          <li>
            <Dado>Mastercard</Dado> — 51 to 55, and the 2-series, 222100 to 272099; 16 digits
          </li>
          <li>
            <Dado>American Express</Dado> — 34 or 37; 15 digits
          </li>
          <li>
            <Dado>Diners Club</Dado> — 300 to 305, 36 or 38
          </li>
          <li>
            <Dado>Discover</Dado> — 6011, 644 to 649, 65; 16 to 19 digits
          </li>
          <li>
            <Dado>JCB</Dado> — 3528 to 3589; 16 to 19 digits
          </li>
        </ul>
      </>
    ),
  },
  {
    titulo: "The generated number buys nothing",
    conteudo: (
      <>
        <p>
          What comes out here passes Luhn and carries the right network prefix. That is all. There is no account
          behind it, no issuer, no credit line, and <Dado>no transaction will be authorized</Dado>. It exists so a
          form accepts the input and you can keep testing the flow.
        </p>
        <p>
          And a warning that catches people early:{" "}
          <Dado>there is no officially reserved BIN range for testing</Dado>. The test numbers you see in gateway
          documentation — Stripe&apos;s, for instance — work only in that gateway&apos;s sandbox, with a test key,
          and are declined in production. To test real charges, use your payment provider&apos;s sandbox, not a
          generated number.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Can I buy something with the generated card?",
    resposta:
      "No. The number passes the check digit, but there is no bank account behind it: no issuer, no credit line and no transaction gets authorized. Attempting to use it for a purchase is fraud, and it does not work.",
  },
  {
    pergunta: "So what is it for?",
    resposta:
      "Testing software. Checkout forms validate the number with Luhn and detect the network from the prefix before sending anything. Without a number that passes that validation, you cannot test the input mask, the network detection or the payment error screen.",
  },
  {
    pergunta: "Are the CVV and expiry real too?",
    resposta:
      "No. They are plausible values in the right shape — three digits, or four on American Express, and a future date. They relate to no issuer and exist to fill the form fields.",
  },
  {
    pergunta: "Can I test real charges with these?",
    resposta:
      "No. For that, use your payment provider's sandbox numbers, which work only with a test key and simulate approval and decline. There is no officially reserved range for testing outside those environments.",
  },
  {
    pergunta: "Is the number sent to a server?",
    resposta:
      "No. The draw and the Luhn check digit are computed entirely in your browser. Nothing leaves your device and nothing is stored.",
  },
  {
    pergunta: "Why does the form know the network before I finish typing?",
    resposta:
      "Because the leading digits identify the issuer: 4 is Visa, 34 and 37 are American Express, 51 to 55 and the 2-series are Mastercard. The form reads that prefix locally, without looking anything up.",
  },
];

export const VEJA = ["/en/ssn", "/en/ein", "/en/phone"];
