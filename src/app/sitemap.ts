import type { MetadataRoute } from "next";
import { PAGINAS_LEGAIS } from "@/components/shell/Rodape";
import { ROTAS_COM_INGLES, ROTAS_DE_POUSO, ROTAS_PUBLICAS } from "@/lib/rotas";
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

  /*
   * A versão em inglês entra com a mesma estrutura e prioridade um degrau
   * abaixo: o site nasceu em português, e as páginas de lá têm histórico que as
   * novas ainda não têm. O hreflang é quem diz ao buscador que são a mesma
   * página em outro idioma; a prioridade só ordena o rastreamento.
   */
  const ingles = [
    { url: absolute("/en"), priority: 0.9 },
    ...ROTAS_COM_INGLES.map((rota) => ({
      url: absolute(rota.en.href),
      priority: rota.grupo === "ferramenta" ? 0.8 : 0.7,
    })),
    ...ROTAS_DE_POUSO.flatMap((rota) => (rota.en ? [{ url: absolute(rota.en.href), priority: 0.6 }] : [])),
  ].map(({ url, priority }) => ({
    url,
    lastModified: ATUALIZACAO,
    changeFrequency: "monthly" as const,
    priority,
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
    ...ingles,
    ...PAGINAS_LEGAIS.flatMap(({ href, en }) => [
      { url: absolute(href), lastModified: ATUALIZACAO, changeFrequency: "yearly" as const, priority: 0.3 },
      { url: absolute(en.href), lastModified: ATUALIZACAO, changeFrequency: "yearly" as const, priority: 0.3 },
    ]),
  ];
}
