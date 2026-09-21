import { readdirSync } from "node:fs";
import { sep } from "node:path";
import { describe, expect, it } from "vitest";

import {
  HREFS_COM_CASCA,
  PAGINAS_LEGAIS,
  ROTAS,
  ROTAS_COM_INGLES,
  ROTAS_DE_POUSO,
  ROTAS_PUBLICAS,
  parDeIdiomas,
  traduzir,
} from "./rotas";
import { pageMetadata } from "./seo";

/**
 * A tabela de rotas, conferida contra o disco.
 *
 * O campo `en` era obrigatório, então o código de barras — que é interno e só
 * existe em português — ganhou um par só para satisfazer o tipo. O menu passou
 * a oferecer `/en/barcode`, que nunca foi construído, e quem estava logado
 * batia em 404. Um endereço declarado é uma promessa; estes testes conferem se
 * existe arquivo atrás dela.
 */

/**
 * Todo endereço que tem `page.tsx` no disco.
 *
 * Grupos de rota — `(pt)`, `(en)`, `(legal)` — não aparecem na URL, então são
 * tirados do caminho, que é exatamente o que o Next faz. Listar a árvore, em
 * vez de testar caminhos conhecidos, é o que mantém este teste certo quando
 * alguém cria ou reorganiza um grupo.
 */
const ENDERECOS_COM_PAGINA = new Set(
  readdirSync("src/app", { recursive: true, encoding: "utf8" })
    .filter((arquivo) => arquivo.split(sep).at(-1) === "page.tsx")
    .map((arquivo) => {
      const segmentos = arquivo
        .split(sep)
        .slice(0, -1)
        .filter((segmento) => !/^\(.*\)$/.test(segmento));
      return `/${segmentos.join("/")}`;
    })
);

/** Se há um `page.tsx` que responde por um endereço. */
function temPagina(href: string): boolean {
  return ENDERECOS_COM_PAGINA.has(href);
}

describe("tabela de rotas", () => {
  it("toda rota declarada tem página no disco", () => {
    const semPagina = [...ROTAS, ...ROTAS_DE_POUSO].map((r) => r.href).filter((h) => !temPagina(h));
    expect(semPagina).toEqual([]);
  });

  it("todo par em inglês declarado tem página no disco", () => {
    const prometidos = [...ROTAS, ...ROTAS_DE_POUSO].flatMap((r) => (r.en ? [r.en.href] : []));
    expect(prometidos.filter((h) => !temPagina(h))).toEqual([]);
  });

  it("o código de barras não promete versão em inglês", () => {
    const barras = ROTAS.find((r) => r.href === "/codigo-de-barras");
    expect(barras?.privada).toBe(true);
    expect(barras?.en).toBeUndefined();
  });

  it("sem par em inglês, traduzir devolve a rota em português", () => {
    const barras = ROTAS.find((r) => r.href === "/codigo-de-barras")!;
    const emIngles = traduzir(barras, "en");
    expect(emIngles.href).toBe("/codigo-de-barras");
    expect(emIngles.label).toBe(barras.label);
  });

  it("sem par em inglês, não há hreflang a declarar", () => {
    expect(parDeIdiomas("/codigo-de-barras")).toBeNull();
    expect(parDeIdiomas("/en/barcode")).toBeNull();
  });

  it("ROTAS_COM_INGLES é a lista pública que realmente tem página em inglês", () => {
    expect(ROTAS_COM_INGLES.every((r) => r.en !== undefined)).toBe(true);
    expect(ROTAS_COM_INGLES.length).toBe(ROTAS_PUBLICAS.filter((r) => r.en).length);
    expect(ROTAS_COM_INGLES.some((r) => r.href === "/codigo-de-barras")).toBe(false);
  });

  it("a casca cobre todo endereço de ferramenta, nos dois idiomas", () => {
    for (const rota of ROTAS) {
      expect(HREFS_COM_CASCA.has(rota.href), rota.href).toBe(true);
      if (rota.en) expect(HREFS_COM_CASCA.has(rota.en.href), rota.en.href).toBe(true);
    }
    // E não guarda endereço que não existe.
    expect([...HREFS_COM_CASCA].filter((h) => !temPagina(h))).toEqual([]);
  });

  it("os dois idiomas apontam um para o outro", () => {
    for (const rota of ROTAS_COM_INGLES) {
      expect(parDeIdiomas(rota.href)).toEqual({ "pt-BR": rota.href, en: rota.en.href });
      expect(parDeIdiomas(rota.en.href)).toEqual({ "pt-BR": rota.href, en: rota.en.href });
    }
  });

  it("as páginas legais também são pares", () => {
    for (const p of PAGINAS_LEGAIS) {
      expect(parDeIdiomas(p.href)).toEqual({ "pt-BR": p.href, en: p.en.href });
      expect(parDeIdiomas(p.en.href)).toEqual({ "pt-BR": p.href, en: p.en.href });
      expect(temPagina(p.href), p.href).toBe(true);
      expect(temPagina(p.en.href), p.en.href).toBe(true);
    }
  });
});

/**
 * Nenhuma página em inglês pode se declarar português — nem pelo hreflang, nem
 * pelo og:locale. As páginas legais em inglês faziam as duas coisas.
 */
describe("metadata por idioma", () => {
  const enderecosEmIngles = [...ENDERECOS_COM_PAGINA].filter((h) => h === "/en" || h.startsWith("/en/"));

  it("página em inglês nunca aponta hreflang pt-BR para si mesma", () => {
    for (const href of enderecosEmIngles) {
      const { alternates } = pageMetadata({ title: "t", description: "d", path: href });
      const idiomas = alternates.languages as Record<string, string>;
      expect(idiomas["pt-BR"], href).not.toBe(alternates.canonical);
      expect(idiomas.en, href).toBe(alternates.canonical);
    }
  });

  it("og:locale acompanha o idioma do endereço", () => {
    expect(pageMetadata({ title: "t", description: "d", path: "/en/privacy" }).openGraph.locale).toBe("en_US");
    expect(pageMetadata({ title: "t", description: "d", path: "/privacidade" }).openGraph.locale).toBe("pt_BR");
  });
});
