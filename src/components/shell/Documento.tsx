import type { Metadata } from "next";
import { GeistSans } from "geist/font";
/*
 * A marca deveria usar Geist Pixel, mas o pacote `geist` — inclusive na 1.7.2,
 * a mais nova — só publica Sans e Mono, e não existe pacote separado no npm.
 * A Vercel distribui a Pixel como download em vercel.com/font.
 *
 * Geist Mono entra no lugar por ora. Para trocar, basta colocar o .woff2 em
 * src/app/fonts e apontar esta constante para ele com next/font/local: tudo
 * que usa a marca lê da variável --font-logo, num lugar só.
 */
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AppShell } from "./AppShell";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import type { Idioma } from "@/lib/idioma";
import { PERFIS_DO_AUTOR, RESPONSAVEL, SITE, SITE_POR_IDIOMA, absolute, jsonLd } from "@/lib/seo";
import "@/app/globals.css";
// Depois do globals: o preflight do Tailwind zera estilos de elemento e
// achataria o controle se viesse por último.
import "dialkit/styles.css";

/**
 * O documento HTML do site, compartilhado pelos dois layouts raiz.
 *
 * Existem dois layouts raiz — `src/app/(pt)/layout.tsx` e
 * `src/app/(en)/layout.tsx` — para que cada página sirva o `<html lang>` do
 * seu idioma. Antes havia um só, fixo em `pt-BR`, e as páginas em inglês se
 * declaravam português para todo buscador que lê o atributo (o Bing lê, e o
 * índice dele é o que alimenta a busca do ChatGPT).
 *
 * Ler o caminho num layout único exigiria `headers()`, que torna dinâmica toda
 * página do site. Grupos de rota resolvem sem isso: os parênteses não entram
 * na URL, então nenhum endereço mudou, e tudo continua estático. O custo é um
 * só — navegar de um layout raiz para o outro recarrega a página inteira —, e
 * ele só acontece na troca de idioma.
 *
 * Tudo que é igual nos dois fica aqui; o layout de cada idioma só diz qual é.
 */

/** A metadata padrão do site no idioma pedido. Cada página sobrescreve a sua. */
export function metadataDoSite(idioma: Idioma): Metadata {
  const { titulo, description, locale, raiz } = SITE_POR_IDIOMA[idioma];
  const url = absolute(raiz);

  return {
    title: { default: titulo, template: "%s | Geradoor" },
    description,
    metadataBase: new URL(SITE.url),
    applicationName: SITE.name,
    authors: [{ name: SITE.name, url: SITE.url }],
    creator: SITE.name,
    publisher: SITE.name,
    // Cada página define o seu canonical. Aqui fica só a raiz do idioma, como
    // fallback.
    alternates: {
      canonical: url,
      languages: { "pt-BR": SITE.url, en: absolute("/en"), "x-default": SITE.url },
    },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale,
      url,
      title: titulo,
      description,
      // Sem `images` aqui de propósito: quem desenha a imagem é o
      // opengraph-image.tsx de cada rota, e uma lista fixa neste ponto vira
      // fallback silencioso — foi assim que a captura antiga do gerador de CPF
      // continuou sendo compartilhada em rota que ainda não tinha a sua.
    },
    twitter: {
      card: "summary_large_image",
      title: titulo,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

/**
 * Identidade do site, para o Google ligar as páginas a uma mesma entidade.
 * Fica no documento porque vale para o domínio inteiro, não por página.
 */
const siteSchema = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    // O nó WebSite descreve o domínio inteiro, não a página, e o domínio serve
    // as duas línguas.
    inLanguage: ["pt-BR", "en"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon.svg`,
    // O site é feito por uma pessoa, e é ela que tem presença pública. Ligar as
    // duas entidades por `founder` é o que permite ao buscador juntar os
    // sinais sem que a marca reivindique perfil que não é dela.
    founder: {
      "@type": "Person",
      name: RESPONSAVEL,
      url: PERFIS_DO_AUTOR[0],
      sameAs: [...PERFIS_DO_AUTOR],
    },
  },
];

export function Documento({ idioma, children }: { idioma: Idioma; children: React.ReactNode }) {
  return (
    <html lang={idioma} suppressHydrationWarning>
      {/* A regra é do Pages Router (`next/head`) e só isenta arquivos em
          src/app; aqui é o documento do App Router, onde `<head>` é o certo. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <meta name="google-adsense-account" content="ca-pub-5073478672232880" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteSchema) }} />
      </head>
      <body className={`${GeistSans.className} ${GeistMono.variable} bg-background`}>
        <ThemeProvider
          attribute="class"
          /* Dark-first: o padrão é escuro, não o tema do sistema. */
          defaultTheme="dark"
          /* Sem "system": o valor de `theme` passa a ser sempre "dark" ou
             "light", nunca um terceiro estado que o Tailwind não reconhece. */
          enableSystem={false}
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
          <Analytics />
          <SpeedInsights />
          {/* Em cima, e não no canto de baixo: as ações principais do editor
              de código de barras — Gerar, Amostra, Exportar — ficam no rodapé
              do painel da direita, exatamente onde o toast aparecia. Ele
              engolia o clique de quem carregava a arte e pedia a amostra na
              sequência. */}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
