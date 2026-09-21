import type { Metadata } from "next";
import Link from "next/link";
import { Lista, PaginaLegal, Termo, type SecaoLegal } from "@/components/shell/TextoLegal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "Geradoor uses no tracking or advertising cookies. What we keep stays in your browser and is only preferences.",
  path: "/en/cookies",
});

const SECOES: SecaoLegal[] = [
  {
    titulo: "The short version",
    conteudo: (
      <p>
        Geradoor uses <Termo>no tracking, profiling or advertising cookies</Termo>, which is why there is no
        consent banner. What we keep lives in your browser&apos;s local storage, is your own preferences, and never
        reaches us.
      </p>
    ),
  },
  {
    titulo: "What is kept in your browser",
    conteudo: (
      <>
        <p>
          These are not cookies: this is local storage, which the browser does not send along with requests to the
          server. We keep there:
        </p>
        <Lista>
          <li>
            <Termo>Theme</Termo> — whether you chose light or dark.
          </li>
          <li>
            <Termo>Language</Termo> — which of the two versions of the site you landed on, so the redirect happens
            once rather than on every visit.
          </li>
          <li>
            <Termo>Sidebar</Termo> — whether you left it open or collapsed.
          </li>
          <li>
            <Termo>Background remover brush</Termo> — the size of each tool and whether the magic brush is on.
          </li>
          <li>
            <Termo>Barcode labels</Termo> — the layout, the unit of measurement and the last tab.
          </li>
          <li>
            <Termo>Recent</Termo> — the list of results shown in the menu, so you can reopen what you just
            generated. It stays there only; clear it with the trash icon next to the heading.
          </li>
        </Lista>
      </>
    ),
  },
  {
    titulo: "The two cookies that do exist",
    conteudo: (
      <>
        <p>
          They appear only for people using the internal label-generator area, which is password protected. If you
          have never been in there, the site writes no cookie in your browser at all.
        </p>
        <Lista>
          <li>
            <Termo>acesso_grafica</Termo> — holds the session of whoever entered the password. It is signed, cannot
            be read or altered by JavaScript, and lasts ninety days.
          </li>
          <li>
            <Termo>grafica_liberada</Termo> — exists only so the menu knows to show that item. It authorizes
            nothing: forging it adds a line to the list, and the click still lands on the password screen.
          </li>
        </Lista>
      </>
    ),
  },
  {
    titulo: "Usage measurement without cookies",
    conteudo: (
      <p>
        To know which pages are visited we use Vercel Web Analytics, which works without cookies: each visit
        becomes a technical code derived from the request, rotated every 24 hours, that crosses neither days nor
        sites. None of it identifies you. The detail is in the{" "}
        <Link href="/en/privacy" className="font-medium text-foreground underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    ),
  },
  {
    titulo: "How to clear it",
    conteudo: (
      <p>
        In your browser settings, clearing the site&apos;s data removes everything at once — preferences and the
        two cookies. Private browsing also works: nothing survives closing the window. The only consequence is that
        the site returns to its initial state and the recent list disappears.
      </p>
    ),
  },
];

export default function Cookies() {
  return <PaginaLegal titulo="Cookie Policy" secoes={SECOES} idioma="en" />;
}
