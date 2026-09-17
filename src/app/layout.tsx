import type { Metadata } from "next";
import { PERFIS_DO_AUTOR, RESPONSAVEL, SITE, jsonLd } from "@/lib/seo";
import { AppShell } from "@/components/shell/AppShell";
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
import { Toaster } from "@/components/ui/sonner"
import "./globals.css";
// Depois do globals: o preflight do Tailwind zera estilos de elemento e
// achataria o controle se viesse por último.
import "dialkit/styles.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: {
    default: "Geradoor · Ferramentas grátis que rodam no seu navegador",
    template: "%s | Geradoor",
  },
  description: SITE.description,
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  // Cada página define o seu canonical. Aqui fica só a raiz, como fallback.
  alternates: {
    canonical: SITE.url,
    languages: { "pt-BR": SITE.url, "x-default": SITE.url },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: "Geradoor · Ferramentas grátis que rodam no seu navegador",
    description: SITE.description,
    // Sem `images` aqui de propósito: quem desenha a imagem é o
    // opengraph-image.tsx de cada rota, e uma lista fixa neste ponto vira
    // fallback silencioso — foi assim que a captura antiga do gerador de CPF
    // continuou sendo compartilhada em rota que ainda não tinha a sua.
  },
  twitter: {
    card: "summary_large_image",
    title: "Geradoor · Ferramentas grátis que rodam no seu navegador",
    description: SITE.description,
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

/**
 * Identidade do site, para o Google ligar as páginas a uma mesma entidade.
 * Fica no layout porque vale para o domínio inteiro, não por página.
 */
const siteSchema = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    // O nó WebSite descreve o domínio inteiro, não a página, e o domínio serve
    // as duas línguas. Declarar só pt-BR aqui contradiz os hreflang das rotas
    // /en. Fica no layout — ler o caminho exigiria `headers()`, que tornaria
    // todas as páginas dinâmicas.
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

/**
 * O documento nasce em português, e a subárvore em inglês se declara por dentro.
 *
 * A versão óbvia disto seria ler o caminho no layout e trocar o `lang` do
 * `<html>`. Não dá: componente de servidor só recebe a rota por `headers()`, e
 * chamar `headers()` aqui torna DINÂMICA toda página do site — medido, `/cpf`
 * saiu de estático para renderizado a cada requisição. Trocar a geração
 * estática do site inteiro pelo atributo de uma subárvore é um mau negócio.
 *
 * A alternativa correta seria dois layouts raiz em grupos de rota, mas ela
 * obriga a mover todas as páginas já indexadas, e o risco não se paga.
 *
 * Então o `<html>` fica em pt-BR e as páginas em inglês marcam `lang="en"` no
 * próprio contêiner. É HTML válido: o atributo vale para a subárvore, que é o
 * que leitor de tela usa para escolher a pronúncia. Para o buscador, quem diz o
 * idioma de cada página é o hreflang, que aponta para o par certo.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-5073478672232880" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(siteSchema) }}
        />
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