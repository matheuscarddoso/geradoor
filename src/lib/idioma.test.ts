import { describe, expect, it } from "vitest";
import { idiomaDoCaminho, idiomaPreferido, semPrefixo } from "./idioma";

describe("idiomaPreferido", () => {
  it("lê a preferência do navegador brasileiro", () => {
    expect(idiomaPreferido("pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("pt-BR");
  });

  it("lê a de um navegador em inglês", () => {
    expect(idiomaPreferido("en-US,en;q=0.9")).toBe("en");
  });

  it("respeita o peso, e não a ordem de escrita", () => {
    // Inglês vem primeiro no texto, mas com peso menor.
    expect(idiomaPreferido("en;q=0.5,pt-BR;q=0.9")).toBe("pt-BR");
  });

  it("aceita português de Portugal como português", () => {
    expect(idiomaPreferido("pt-PT,pt;q=0.9")).toBe("pt-BR");
  });

  it("manda quem fala outro idioma para o inglês", () => {
    expect(idiomaPreferido("es-ES,es;q=0.9")).toBe("en");
    expect(idiomaPreferido("ja,ko;q=0.8")).toBe("en");
  });

  it("cai no padrão sem cabeçalho ou com curinga", () => {
    expect(idiomaPreferido(null)).toBe("pt-BR");
    expect(idiomaPreferido("*")).toBe("pt-BR");
  });

  it("ignora entrada malformada sem quebrar", () => {
    expect(idiomaPreferido(",,;q=,")).toBe("en");
    expect(idiomaPreferido("pt-BR;q=abc")).toBe("en");
  });

  it("descarta idioma com peso zero", () => {
    // q=0 significa "não quero este".
    expect(idiomaPreferido("pt-BR;q=0,en;q=0.9")).toBe("en");
  });
});

describe("idiomaDoCaminho", () => {
  it("reconhece o prefixo de inglês", () => {
    expect(idiomaDoCaminho("/en")).toBe("en");
    expect(idiomaDoCaminho("/en/vectorizer")).toBe("en");
  });

  it("trata o resto como português", () => {
    expect(idiomaDoCaminho("/")).toBe("pt-BR");
    expect(idiomaDoCaminho("/vetorizador")).toBe("pt-BR");
  });

  it("não confunde rota que apenas começa com as letras en", () => {
    expect(idiomaDoCaminho("/entrar")).toBe("pt-BR");
    expect(idiomaDoCaminho("/codigo-de-barras/entrar")).toBe("pt-BR");
  });
});

describe("semPrefixo", () => {
  it("devolve o caminho equivalente sem o idioma", () => {
    expect(semPrefixo("/en/vectorizer")).toBe("/vectorizer");
    expect(semPrefixo("/en")).toBe("/");
    expect(semPrefixo("/vetorizador")).toBe("/vetorizador");
    expect(semPrefixo("/")).toBe("/");
  });
});
