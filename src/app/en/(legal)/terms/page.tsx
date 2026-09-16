import type { Metadata } from "next";
import Link from "next/link";
import { Lista, PaginaLegal, Termo, type SecaoLegal } from "@/components/shell/TextoLegal";
import { EMAIL_DE_CONTATO, RESPONSAVEL, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Use",
  description:
    "The rules for using Geradoor: what the test data is for, what you may do with the generated files, and the limits of our liability.",
  path: "/en/terms",
});

const SECOES: SecaoLegal[] = [
  {
    titulo: "Who operates this and what you agree to",
    conteudo: (
      <p>
        Geradoor is operated by {RESPONSAVEL}, an individual, reachable at{" "}
        <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-medium text-foreground underline underline-offset-4">
          {EMAIL_DE_CONTATO}
        </a>
        . By using the site you agree to these terms. If you do not agree, do not use it.
      </p>
    ),
  },
  {
    titulo: "The service",
    conteudo: (
      <>
        <p>
          Geradoor is a set of freely usable tools: test data generators, a QR Code generator, WhatsApp and
          Instagram link builders, a background remover and an image vectorizer. There is no sign-up, no charge and
          no watermark.
        </p>
        <p>
          Tools may change, gain limits or be taken down without notice. Nothing here is a promise of continuous
          service.
        </p>
      </>
    ),
  },
  {
    titulo: "Test data belongs to nobody",
    conteudo: (
      <>
        <p>
          This is the most important rule on the site. The SSNs, EINs, card numbers and phone numbers generated
          here are only <Termo>combinations that satisfy each format&apos;s rules</Termo>. They belong to no
          person, were issued by no agency, carry no credit, will not complete a purchase and are not
          identification.
        </p>
        <p>
          They exist to test software: filling a form, validating an input mask, seeding a test database.
        </p>
        <p>
          Using them to impersonate someone, commit fraud, deceive a system, bypass verification or for any other
          unlawful purpose is a <Termo>crime</Termo>, is prohibited by these terms, and is the sole responsibility
          of whoever does it.
        </p>
      </>
    ),
  },
  {
    titulo: "Acceptable use",
    conteudo: (
      <>
        <p>You may not use Geradoor to:</p>
        <Lista>
          <li>break the law or violate someone else&apos;s rights;</li>
          <li>process an image you do not have permission to use;</li>
          <li>commit fraud, impersonate a third party or bypass identity verification;</li>
          <li>overload the service, automate access at volume or work around usage limits;</li>
          <li>shorten a link leading to malware, a scam or unlawful content.</li>
        </Lista>
        <p>
          We may limit or block access, and deactivate a short link, when necessary to protect the service or other
          people.
        </p>
      </>
    ),
  },
  {
    titulo: "Your images and the generated files",
    conteudo: (
      <>
        <p>
          What you bring stays yours. Using the background remover grants us only the permission needed to process
          that image and return the result, and nothing beyond it. We do not use your images to train models, do
          not publish them and do not store them.
        </p>
        <p>
          The files that come out of here — the cutout PNG, the SVG, the QR Code, the labels — are yours, for any
          use, commercial included. Checking whether their content respects someone else&apos;s trademark,
          copyright or likeness is your responsibility.
        </p>
      </>
    ),
  },
  {
    titulo: "Check the result before you use it",
    conteudo: (
      <p>
        The cutout and the vectorizing are automatic. They simplify shapes, approximate colors and can lose fine
        detail. When the file is going to print, into a brand&apos;s identity, or anywhere an error is expensive,
        look at the result first.
      </p>
    ),
  },
  {
    titulo: "Short links",
    conteudo: (
      <p>
        A QR Code short link points to the address you provided, and we do not control what is on the other side.
        The destination is the responsibility of whoever created the link. Links stay active indefinitely and may
        be deactivated if used for something unlawful.
      </p>
    ),
  },
  {
    titulo: "No warranties",
    conteudo: (
      <p>
        The service is provided as is, without warranty of availability, of exact results or of fitness for a
        particular purpose. This does not remove rights that consumer law guarantees and that cannot be excluded by
        contract.
      </p>
    ),
  },
  {
    titulo: "Limitation of liability",
    conteudo: (
      <p>
        The service is free. To the extent the law permits, we are not liable for lost profits, data loss, indirect
        damage or harm arising from misuse of the test data. Excluded from this limit is anything the law does not
        allow to be excluded, such as willful misconduct and gross negligence.
      </p>
    ),
  },
  {
    titulo: "Privacy",
    conteudo: (
      <p>
        Data handling is described in the{" "}
        <Link href="/en/privacy" className="font-medium text-foreground underline underline-offset-4">
          Privacy Policy
        </Link>
        , which forms part of these terms.
      </p>
    ),
  },
  {
    titulo: "Governing law",
    conteudo: (
      <p>
        These terms are governed by Brazilian law. For consumer matters, the forum is the consumer&apos;s domicile;
        in other cases, the forum of the operator&apos;s district.
      </p>
    ),
  },
  {
    titulo: "Changes",
    conteudo: (
      <p>
        We may change these terms. The date at the top indicates the version in force, and material changes take
        effect on publication.
      </p>
    ),
  },
];

export default function Terms() {
  return <PaginaLegal titulo="Terms of Use" secoes={SECOES} idioma="en" />;
}
