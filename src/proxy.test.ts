import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

/**
 * Os portões do painel admin e do gerador de código de barras.
 *
 * Nasceu de uma regressão: o portão do admin passou a cobrir `/api/admin/*`
 * inteiro, inclusive a API de login. Sem sessão, o POST de login voltava
 * como redirect para a tela de login e o painel ficou trancado para
 * qualquer credencial, em produção, sem nada acusar.
 */

const pedir = (caminho: string, init?: { method?: string }) =>
  new NextRequest(new URL(caminho, "https://www.geradoor.com"), init);

const redirecionaPara = (res: Response) => res.headers.get("location");

describe("portão do admin", () => {
  it("deixa a tela de login abrir sem sessão", async () => {
    const res = await proxy(pedir("/admin/login"));
    expect(redirecionaPara(res)).toBeNull();
  });

  it("deixa a API de login receber o POST sem sessão", async () => {
    const res = await proxy(pedir("/api/admin/login", { method: "POST" }));
    expect(redirecionaPara(res)).toBeNull();
  });

  it("manda para o login quem abre o painel sem sessão", async () => {
    const res = await proxy(pedir("/admin"));
    expect(redirecionaPara(res)).toMatch(/\/admin\/login$/);
  });

  it("barra as outras APIs do admin sem sessão", async () => {
    const res = await proxy(pedir("/api/admin/qrcode/abc", { method: "PATCH" }));
    expect(redirecionaPara(res)).toMatch(/\/admin\/login$/);
  });

  it("não indexa nada do admin", async () => {
    const res = await proxy(pedir("/admin/login"));
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });
});

describe("portão do código de barras", () => {
  it("manda para a tela de senha quem chega sem sessão", async () => {
    const res = await proxy(pedir("/codigo-de-barras"));
    expect(redirecionaPara(res)).toMatch(/\/codigo-de-barras\/entrar/);
  });
});
