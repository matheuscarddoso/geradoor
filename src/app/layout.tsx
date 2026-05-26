import type { Metadata } from "next";
import { GeistSans } from "geist/font";
import { Toaster } from "@/components/ui/sonner"
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from '@vercel/speed-insights/next';
import { PageTransition } from "@/components/PageTransition";
import { AnimatePresence } from "framer-motion";

export const metadata: Metadata = {
  title: {
    default: "Geradoor",
    template: `%s | Geradoor`,
  },
  openGraph: {
    description: "Gerador de",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Geradoor",
      },
    ]
  },
  metadataBase: new URL("https://www.geradoor.com"),
  keywords: ["gerador", "cpf", "gerador de cpf", "gerador de coiso"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-5073478672232880" />
      </head>
      <body className={`${GeistSans.className} bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AnimatePresence mode="wait">
            <PageTransition>
              {children}
            </PageTransition>
          </AnimatePresence>
          <Analytics />
          <SpeedInsights />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}