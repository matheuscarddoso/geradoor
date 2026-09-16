/**
 * Constantes e blocos de dados estruturados do site.
 *
 * Centralizado para que título, descrição, canonical e JSON-LD de uma página
 * saiam sempre da mesma fonte — divergência entre eles é o erro de SEO mais
 * comum em site com muitas páginas parecidas.
 */

/** Quem responde pelo site, e para onde vão os pedidos de privacidade. */
export const RESPONSAVEL = "Matheus Cardoso";
export const EMAIL_DE_CONTATO = "mathuscardoso@gmail.com";

/**
 * Data da última revisão dos textos legais.
 *
 * Fixa e escrita à mão: a data serve para a pessoa saber se leu a versão que
 * está no ar, e uma data calculada na hora diria "atualizado hoje" todo dia,
 * sem nada ter mudado.
 */
export const ATUALIZACAO_LEGAL = "15 de setembro de 2026";

export const SITE = {
  name: "Geradoor",
  url: "https://www.geradoor.com",
  locale: "pt_BR",
  description:
    "Ferramentas online grátis: removedor de fundo, vetorizador de imagem, gerador de QR Code e geradores de CPF, CNPJ, cartão e telefone para teste. Sem cadastro e sem marca d'água.",
  twitter: "@geradoor",
} as const;

/** Caminho absoluto a partir de um path relativo. */
export const absolute = (path: string) =>
  path === "/" ? SITE.url : `${SITE.url}${path}`;

/**
 * Serializa JSON-LD de forma segura para dentro de <script>.
 *
 * Escapar "<" impede que qualquer string do payload feche a tag e injete
 * markup. Hoje o conteúdo é estático, mas o custo de garantir é zero.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

interface ToolSchemaInput {
  name: string;
  description: string;
  path: string;
  /** Termos que descrevem a função, usados no campo featureList. */
  features: string[];
}

/**
 * Schema de aplicação web para as páginas de ferramenta.
 *
 * WebApplication com offers a preço zero é o tipo que o Google entende para
 * ferramenta online gratuita. Sem `aggregateRating`: nota inventada é violação
 * de política e derruba todos os rich results do domínio.
 */
export function toolSchema({ name, description, path, features }: ToolSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name,
    description,
    url: absolute(path),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requer JavaScript",
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    featureList: features,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: SITE.url,
    },
  };
}

/** Trilha de navegação. Ajuda o Google a montar o breadcrumb do resultado. */
export function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  };
}

/** Perguntas frequentes. Só usar quando o texto estiver visível na página. */
export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * Metadata completa de uma página.
 *
 * Existe por causa de uma pegadinha do Next: `openGraph` e `twitter` definidos
 * numa página SUBSTITUEM o objeto do layout, não mesclam. Declarar apenas
 * título e descrição na página derruba silenciosamente og:type, og:locale,
 * og:site_name e rebaixa o card do Twitter para "summary". Aqui os dois blocos
 * são montados inteiros, sempre.
 *
 * A imagem fica de fora: ela vem do `opengraph-image.tsx` de cada rota, que o
 * Next injeta sozinho e com prioridade sobre o que for declarado aqui.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}) {
  const url = absolute(path);
  return {
    title,
    description,
    // O site é monolíngue. Declarar pt-BR e x-default na mesma URL custa duas
    // linhas e evita que o buscador trate a página como português genérico —
    // concorrente que serve pt-PT para busca brasileira perde por isso.
    alternates: {
      canonical: url,
      languages: { "pt-BR": url, "x-default": url },
    },
    openGraph: {
      type: "website" as const,
      siteName: SITE.name,
      locale: SITE.locale,
      url,
      title,
      description,
      // Sem `images`: cada rota tem o seu `opengraph-image.tsx`, e imagem
      // declarada aqui apareceria como uma segunda og:image na página.
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
    },
  };
}
