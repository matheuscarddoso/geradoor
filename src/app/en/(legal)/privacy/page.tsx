import type { Metadata } from "next";
import Link from "next/link";
import { Lista, PaginaLegal, Termo, type SecaoLegal } from "@/components/shell/TextoLegal";
import { EMAIL_DE_CONTATO, RESPONSAVEL, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "What Geradoor collects, what it does not, and what happens to the images and links that pass through the tools.",
  path: "/en/privacy",
});

const SECOES: SecaoLegal[] = [
  {
    titulo: "Who is responsible",
    conteudo: (
      <>
        <p>
          Geradoor is operated by {RESPONSAVEL}, an individual. For anything about privacy — requesting
          information, correction or deletion of data — write to{" "}
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-medium text-foreground underline underline-offset-4">
            {EMAIL_DE_CONTATO}
          </a>
          .
        </p>
      </>
    ),
  },
  {
    titulo: "The principle: almost everything happens in your browser",
    conteudo: (
      <>
        <p>
          Most tools send nothing anywhere. The SSN, EIN, test card, phone number and image vectorizing are
          computed inside your browser. Close the tab and it is gone: none of it passed through a server.
        </p>
        <p>
          The WhatsApp link and the Instagram profile address are also assembled here, in your browser. But the{" "}
          <Termo>QR Code</Termo> on those two pages, like the QR Code generator, creates a short link — and a short
          link requires storing the destination. Copying the link without generating the QR Code sends nothing.
        </p>
      </>
    ),
  },
  {
    titulo: "The Background Remover and your image",
    conteudo: (
      <>
        <p>
          To cut out a photo, your browser sends a <Termo>downscaled copy</Termo> of it — at most 2048 pixels on
          the long side — to a service of ours hosted on Cloudflare, which returns the outline of what is in the
          foreground. Your full-resolution photo never leaves your device: the final cutout is assembled here, from
          the response that came back.
        </p>
        <Lista>
          <li>
            The copy sent is <Termo>not stored</Termo>. It is processed and discarded when the request ends, and
            the response carries no cache.
          </li>
          <li>
            The request goes <Termo>without cookies and without a referer</Termo>: the service does not know what
            page you came from or who you are.
          </li>
          <li>
            There is a daily cap per person, to keep costs from running away. To count it, we store a code derived
            from your IP address — a hash of the address with the day&apos;s date — never the address itself. Since
            the date is part of the hash, the code changes every day and the previous day&apos;s codes are deleted.
          </li>
          <li>
            When that service is unavailable or the cap is reached, the cutout is computed on your own device with
            smaller models. The page says so when that happens.
          </li>
        </Lista>
      </>
    ),
  },
  {
    titulo: "The QR Code and the link you shorten",
    conteudo: (
      <>
        <p>
          The QR Code generator creates a short link, and that requires storing something. Our database holds: the{" "}
          <Termo>destination address</Termo> you entered, the corresponding short code, the creation date and a
          count of how many times the QR Code was scanned.
        </p>
        <Lista>
          <li>
            Each scan records only the <Termo>date and time</Termo>. We do not store IP address, location, device
            or anything else about whoever scanned.
          </li>
          <li>
            These records are kept indefinitely, because the link has to keep working. If you want a QR Code
            deactivated and deleted, ask by email.
          </li>
          <li>
            Do not put sensitive information in a shortened URL: anyone with the short code reaches the
            destination, and the address is stored with us.
          </li>
        </Lista>
      </>
    ),
  },
  {
    titulo: "Usage measurement",
    conteudo: (
      <>
        <p>
          We use Vercel Web Analytics and Speed Insights to know which pages are visited and whether they load
          quickly. This measurement <Termo>uses no cookies</Termo> and creates no identifier that follows you
          across days or sites: each visit is reduced to a technical code derived from the request, rotated every
          24 hours. What remains are aggregate numbers — how many visits, from which country, on which page — with
          no link to a person.
        </p>
      </>
    ),
  },
  {
    titulo: "Server logs",
    conteudo: (
      <>
        <p>
          Like any site, our hosting provider (Vercel) and the service that computes the cutout (Cloudflare) keep
          technical access logs — IP address, date, resource requested — used to operate the service, protect
          against abuse and investigate incidents. We do not use these logs to profile anyone.
        </p>
      </>
    ),
  },
  {
    titulo: "What we keep in your browser",
    conteudo: (
      <>
        <p>
          Preferences live in your browser&apos;s local storage and never reach us: the light or dark theme, the
          sidebar open or collapsed, the brush size in the background remover, the label layout, the chosen
          language, and the list of recent results shown in the menu. Clearing site data in your browser clears all
          of it. The detail is in the{" "}
          <Link href="/en/cookies" className="font-medium text-foreground underline underline-offset-4">
            Cookie Policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    titulo: "Who the data is shared with",
    conteudo: (
      <>
        <p>We do not sell or hand data to anyone. The only third parties involved are the ones that run the site:</p>
        <Lista>
          <li>
            <Termo>Vercel</Termo> — hosting, the QR Code database and usage measurement.
          </li>
          <li>
            <Termo>Cloudflare</Termo> — the Background Remover cutout.
          </li>
        </Lista>
        <p>
          Both operate servers outside Brazil, so there is an international transfer. We may also disclose
          information when the law or a court order requires it.
        </p>
      </>
    ),
  },
  {
    titulo: "Why we may process this data",
    conteudo: (
      <>
        <p>
          Under Brazil&apos;s LGPD: to <Termo>perform what you asked for</Termo> — cut out the image, create the
          short link — and by <Termo>legitimate interest</Termo> in keeping the service running, protected against
          abuse, and improvable. We do not use your data for advertising.
        </p>
      </>
    ),
  },
  {
    titulo: "Your rights",
    conteudo: (
      <>
        <p>
          You may request confirmation that we process any data of yours, access to it, correction, anonymization,
          blocking or deletion, and you may object to a processing. Write to{" "}
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-medium text-foreground underline underline-offset-4">
            {EMAIL_DE_CONTATO}
          </a>
          . One honest caveat: since we ask for no sign-up and the usage measurement is anonymous, we almost never
          have a way to link a piece of data to you. The case where we can act is the QR Code, if you tell us the
          short link.
        </p>
      </>
    ),
  },
  {
    titulo: "Security",
    conteudo: (
      <>
        <p>
          All traffic is encrypted over HTTPS. The internal area of the site is protected by a password and a
          signed cookie. Even so, no service is immune to failure: do not send documents, health data, passwords or
          anything you cannot afford to lose through this site.
        </p>
      </>
    ),
  },
  {
    titulo: "Children",
    conteudo: (
      <>
        <p>
          Geradoor is a work tool and is not directed at children under 13. We do not knowingly collect data from
          children.
        </p>
      </>
    ),
  },
  {
    titulo: "Changes",
    conteudo: (
      <>
        <p>
          When this policy changes, the date at the top changes with it. Material changes take effect on
          publication; continuing to use the site afterwards means you are aware of them.
        </p>
      </>
    ),
  },
];

export default function Privacy() {
  return <PaginaLegal titulo="Privacy Policy" secoes={SECOES} idioma="en" />;
}
