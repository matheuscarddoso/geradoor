import type { Metadata } from "next";
import { SITE, jsonLd } from "@/lib/seo";
import { AppShell } from "@/components/shell/AppShell";
import { GeistSans } from "geist/font";
import { Toaster } from "@/components/ui/sonner"
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: {
    default: "Geradoor — geradores de CPF, CNPJ, QR Code e link de WhatsApp",
    template: "%s | Geradoor",
  },
  description: SITE.description,
  metadataBase: new URL(SITE.url),
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  // Cada página define o seu canonical. Aqui fica só a raiz, como fallback.
  alternates: { canonical: SITE.url },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: "Geradoor — geradores de CPF, CNPJ, QR Code e link de WhatsApp",
    description: SITE.description,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Geradoor — geradores online de dados de teste",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Geradoor — geradores de CPF, CNPJ, QR Code e link de WhatsApp",
    description: SITE.description,
    images: ["/og-image.png"],
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
    inLanguage: "pt-BR",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon.svg`,
  },
];

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
      <body className={`${GeistSans.className} bg-background`}>
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
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}