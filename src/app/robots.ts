import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * O arquivo antes se chamava robot.ts, no singular. A convenção do App Router
 * é robots.ts, então o Next nunca o leu e /robots.txt respondia 404 — pior,
 * caía na rota /[shortcode], que tentava resolver "robots.txt" como código.
 */

/**
 * O que nenhum robô deve varrer.
 *
 * Painel e API não têm conteúdo indexável. /docs está com boilerplate não
 * finalizado e entraria no índice como página fina.
 */
const FORA = ["/admin", "/admin/", "/api/", "/docs"];

/**
 * Os robôs de busca generativa, nomeados de propósito.
 *
 * O `*` já os liberaria por omissão — é assim que estão os concorrentes todos.
 * Nomeá-los serve para duas coisas: deixar escrito que a liberação é uma
 * decisão, e não um esquecimento; e evitar o acidente clássico de alguém
 * apertar o `*` um dia e cortar, sem perceber, a fonte de citação em ChatGPT,
 * Claude, Perplexity e AI Overviews.
 *
 * OAI-SearchBot é o que alimenta o índice de busca do ChatGPT — bloqueá-lo é
 * deixar de ser citado lá. GPTBot é o de treino e ChatGPT-User o de leitura sob
 * demanda; os três são user-agents distintos.
 */
const ROBOS_DE_IA = [
  "OAI-SearchBot",
  "GPTBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: FORA },
      // Um grupo nomeado substitui o `*` para aquele robô: o disallow precisa
      // ser repetido aqui, senão o painel e a API ficariam abertos justamente
      // para eles.
      ...ROBOS_DE_IA.map((userAgent) => ({ userAgent, allow: "/", disallow: FORA })),
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
