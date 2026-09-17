import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HREFS_COM_CASCA,
  ROTAS,
  ROTAS_COM_INGLES,
  ROTAS_DE_POUSO,
  ROTAS_PUBLICAS,
  parDeIdiomas,
  traduzir,
} from "./rotas";

/**
 * A tabela de rotas, conferida contra o disco.
 *
 * O campo `en` era obrigatório, então o código de barras — que é interno e só
 * existe em português — ganhou um par só para satisfazer o tipo. O menu passou
 * a oferecer `/en/barcode`, que nunca foi construído, e quem estava logado
 * batia em 404. Um endereço declarado é uma promessa; estes testes conferem se
 * existe arquivo atrás dela.
 */

/** O `page.tsx` que responde por um endereço, se houver. */
function temPagina(href: string): boolean {
  const relativo = href === "/" ? "" : href;
  // Grupo de rota: `(legal)` não aparece na URL, então vale procurar nos dois.
  return (
    existsSync(`src/app${relativo}/page.tsx`) ||
    existsSync(`src/app${relativo.replace(/^\/en/, "/en/(legal)")}/page.tsx`) ||
    existsSync(`src/app/(legal)${relativo}/page.tsx`)
  );
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
});
