import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /en/whatsapp-link. O código do país é o erro mais comum. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "How to create a WhatsApp link",
    conteudo: (
      <>
        <p>
          Enter the number with its country code and, if you want, the message that should already be typed when
          the chat opens. You get a <Dado>wa.me</Dado> link, which is WhatsApp&apos;s own click-to-chat format,
          working on phones and on WhatsApp Web, plus a QR Code of the same link.
        </p>
        <p>
          Whoever clicks lands straight in a chat with you, message ready and cursor waiting. They do not need to
          save your contact first, which is exactly the friction that makes people give up before writing.
        </p>
      </>
    ),
  },
  {
    titulo: "The number needs its country code",
    conteudo: (
      <>
        <p>
          A WhatsApp link uses the number in international format: <Dado>1</Dado> for the United States and Canada,{" "}
          <Dado>44</Dado> for the United Kingdom, <Dado>55</Dado> for Brazil, followed by the area code and the
          number. No plus sign, no spaces, no dashes.
        </p>
        <p>
          Without the country code the link opens no chat at all, and that is the single most common mistake in
          hand-written wa.me links. The page assembles the format for you from what you type.
        </p>
      </>
    ),
  },
  {
    titulo: "Where to use it",
    conteudo: (
      <>
        <p>
          A website button, an Instagram bio, an email signature, an ad, a business card. On a card or a counter,
          the QR Code usually works better than the written link. The link does not expire and does not pass
          through a server of ours: it points straight at WhatsApp&apos;s wa.me.
        </p>
        <p>
          A preset message works best when it identifies where the person came from — something like &quot;Hi! I
          came from the website&quot; — because then you know the source of each conversation without asking.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Do I need to save the contact to chat?",
    resposta:
      "No, and that is the point of the link: whoever clicks opens the chat directly, without adding anyone to their address book. It works both ways — you do not need their number either.",
  },
  {
    pergunta: "Does it work with WhatsApp Business?",
    resposta:
      "Yes. A wa.me link points at a number, and it makes no difference whether the account is personal or Business. It also works on WhatsApp Web and the desktop app.",
  },
  {
    pergunta: "Does the link expire?",
    resposta:
      "No. It points straight at WhatsApp's wa.me and keeps working as long as the number is active. It does not pass through a server of ours and does not depend on this site staying online.",
  },
  {
    pergunta: "Why do I need the country code?",
    resposta:
      "Because the link uses international format, with the country code before the area code. Without it, WhatsApp cannot resolve the number and no chat opens. The page assembles that format for you.",
  },
  {
    pergunta: "Can I send bulk messages with this?",
    resposta:
      "No. The link opens one conversation at a time, started by whoever clicks. Unsolicited bulk messaging violates WhatsApp's terms and gets the number banned.",
  },
  {
    pergunta: "Is my number stored anywhere?",
    resposta:
      "The link is assembled in your browser and the number is not sent to a server of ours. Only the QR Code, when generated, creates a short link that is recorded — the wa.me link itself is not.",
  },
];

export const VEJA = ["/en/qr-code", "/en/instagram-qr-code", "/en/phone"];
