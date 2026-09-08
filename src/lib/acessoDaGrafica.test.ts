/**
 * O portão do gerador.
 *
 * O que se verifica aqui é o que decide entre uma pessoa entrar ou não: a
 * senha errada não abre, o cookie forjado não abre, o cookie vencido não abre,
 * e a comparação de senha não vaza por timing. É o tipo de coisa que ninguém
 * descobre estar quebrada olhando a tela — a tela abre igual nos dois casos.
 */
import { describe, expect, it } from "vitest";
import { ACESSO_MAX_AGE_SECONDS } from "@/lib/acessoDaGrafica";
import { createSessionToken, timingSafeEqual, verifySessionToken } from "@/lib/session";

const SEGREDO = "chave-de-assinatura-do-cookie-da-grafica";

describe("a sessão da gráfica", () => {
  it("aceita o cookie que ela mesma assinou", async () => {
    const token = await createSessionToken(SEGREDO, ACESSO_MAX_AGE_SECONDS);
    expect(await verifySessionToken(SEGREDO, token)).toBe(true);
  });

  it("recusa cookie assinado com outra chave", async () => {
    // É isto que separa o cookie de uma senha: quem tem o cookie de outro
    // ambiente, ou de outro portão do mesmo site, não entra aqui.
    const token = await createSessionToken("outra-chave-qualquer", ACESSO_MAX_AGE_SECONDS);
    expect(await verifySessionToken(SEGREDO, token)).toBe(false);
  });

  it("recusa cookie com o conteúdo trocado", async () => {
    const token = await createSessionToken(SEGREDO, ACESSO_MAX_AGE_SECONDS);
    const [conteudo, assinatura] = token.split(".");
    // Uma validade nova, com a assinatura antiga: é a tentativa óbvia de
    // esticar o acesso, e a assinatura é o que a barra.
    const futuro = Buffer.from(
      JSON.stringify({ iat: 0, exp: Math.floor(Date.now() / 1000) + 999_999 })
    )
      .toString("base64url")
      .replace(/=+$/, "");
    expect(conteudo).toBeTruthy();
    expect(await verifySessionToken(SEGREDO, `${futuro}.${assinatura}`)).toBe(false);
  });

  it("recusa cookie vencido, mesmo com assinatura boa", async () => {
    const token = await createSessionToken(SEGREDO, -1);
    expect(await verifySessionToken(SEGREDO, token)).toBe(false);
  });

  it("recusa entrada malformada em vez de estourar", async () => {
    // Um cookie velho, cortado ou de outra versão do formato não pode virar
    // 500: erro do servidor na tela de senha é o que faz o operador achar que
    // a ferramenta caiu.
    for (const ruim of ["", ".", "sem-ponto", "a.b", "eyJ9.assinatura"]) {
      expect(await verifySessionToken(SEGREDO, ruim)).toBe(false);
    }
    expect(await verifySessionToken(undefined, await createSessionToken(SEGREDO))).toBe(false);
    expect(await verifySessionToken(SEGREDO, undefined)).toBe(false);
  });

  it("dura noventa dias, não o turno do admin", async () => {
    // O prazo é o que decide se o operador vê a tela de senha uma vez ou toda
    // manhã. Se alguém baixar isto para as oito horas do admin sem querer, o
    // teste avisa.
    expect(ACESSO_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 90);
  });
});

describe("a comparação da senha", () => {
  it("aceita só a senha igual", () => {
    expect(timingSafeEqual("senha-da-grafica", "senha-da-grafica")).toBe(true);
    expect(timingSafeEqual("senha-da-grafica", "senha-da-grafic")).toBe(false);
    expect(timingSafeEqual("senha-da-grafica", "Senha-da-grafica")).toBe(false);
    expect(timingSafeEqual("", "senha-da-grafica")).toBe(false);
  });

  it("não fica mais lenta conforme o prefixo acerta", () => {
    // Uma comparação que sai no primeiro byte diferente entrega, aos poucos, a
    // senha inteira: mede-se o tempo, mantém-se o caractere que demorou mais.
    // Aqui os dois casos têm de custar o mesmo dentro do ruído da máquina.
    const senha = "x".repeat(64);
    const nadaAcerta = "y".repeat(64);
    const quaseTudoAcerta = "x".repeat(63) + "y";

    const medir = (a: string, b: string) => {
      // Uma volta a seco para o JIT não cobrar a compilação da primeira medida.
      for (let i = 0; i < 2000; i++) timingSafeEqual(a, b);
      const inicio = performance.now();
      for (let i = 0; i < 20_000; i++) timingSafeEqual(a, b);
      return performance.now() - inicio;
    };

    const cego = medir(senha, nadaAcerta);
    const quente = medir(senha, quaseTudoAcerta);
    const diferenca = Math.abs(quente - cego) / Math.max(cego, quente);

    expect(diferenca).toBeLessThan(0.5);
  });
});
