import type { MetadataRoute } from "next";
import { absolute } from "@/lib/seo";

/**
 * Faltavam /cnpj e /cartao-de-credito, que são duas das páginas com maior
 * intenção de busca. /docs fica fora enquanto o conteúdo for placeholder, e
 * /admin e /[shortcode] nunca entram: painel e redirect não são conteúdo.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    { path: "/", priority: 1, changeFrequency: "monthly" as const },
    { path: "/cnpj", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/cartao-de-credito", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/telefone", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/qr-code", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/instagram", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/whatsapp", priority: 0.8, changeFrequency: "monthly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: absolute(path),
    lastModified,
    changeFrequency,
    priority,
  }));
}
