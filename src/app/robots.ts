import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * O arquivo antes se chamava robot.ts, no singular. A convenção do App Router
 * é robots.ts, então o Next nunca o leu e /robots.txt respondia 404 — pior,
 * caía na rota /[shortcode], que tentava resolver "robots.txt" como código.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Painel e API não têm conteúdo indexável. /docs está com boilerplate
        // não finalizado e ficaria como página fina no índice.
        disallow: ["/admin", "/admin/", "/api/", "/docs"],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
