import type { MetadataRoute } from "next";
import { PAGINAS_LEGAIS } from "@/components/shell/Rodape";
import { ROTAS_DE_POUSO, ROTAS_PUBLICAS } from "@/lib/rotas";
import { absolute } from "@/lib/seo";

/**
 * O mapa do site, derivado das rotas.
 *
 * Era uma lista escrita à mão e, como toda lista escrita à mão ao lado de
 * outra, saiu de sincronia. Agora vem de `ROTAS_PUBLICAS` — a mesma fonte do
 * menu e da busca —, então ferramenta nova entra sozinha e rota marcada como
 * privada nunca entra. /admin, /docs e /[shortcode] continuam fora: painel,
 * rascunho e redirecionamento não são conteúdo.
 */

/**
 * A data de modificação.
 *
 * Fixa, e não `new Date()`: com a data do build, toda página aparecia mudada a
 * cada deploy, mesmo sem uma vírgula alterada. Buscador que aprende que o
 * `lastmod` de um site mente passa a ignorá-lo.
 */
const ATUALIZACAO = new Date("2026-09-16T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const ferramentas = ROTAS_PUBLICAS.map((rota) => ({
    url: absolute(rota.href),
    lastModified: ATUALIZACAO,
    changeFrequency: "monthly" as const,
    // As ferramentas de imagem e os geradores de documento são as páginas com
    // intenção de busca de verdade; QR, Instagram e WhatsApp vêm logo atrás.
    priority: rota.grupo === "ferramenta" || rota.href === "/cpf" || rota.href === "/cnpj" ? 0.9 : 0.8,
  }));

  // As páginas de pouso vêm abaixo das ferramentas em prioridade: elas atacam
  // uma busca específica, enquanto a ferramenta atende a intenção inteira.
  const pousos = ROTAS_DE_POUSO.map((rota) => ({
    url: absolute(rota.href),
    lastModified: ATUALIZACAO,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [
    {
      url: absolute("/"),
      lastModified: ATUALIZACAO,
      changeFrequency: "monthly" as const,
      priority: 1,
    },
    ...ferramentas,
    ...pousos,
    ...PAGINAS_LEGAIS.map(({ href }) => ({
      url: absolute(href),
      lastModified: ATUALIZACAO,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
