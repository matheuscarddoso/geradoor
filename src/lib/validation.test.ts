import { describe, expect, it } from "vitest";

import { createQRCodeSchema, shortcodeSchema, updateQRCodeSchema } from "./validation";

/**
 * As fronteiras HTTP do QR Code.
 *
 * Escritos antes da troca do zod 3 pelo 4, para provar que a troca não muda o
 * que entra e o que é recusado — é aqui que um `javascript:` viraria destino
 * de redirect.
 */

describe("shortcodeSchema", () => {
  it.each(["abc123", "a.b_c~d-e", "X".repeat(64)])("aceita %s", (codigo) => {
    expect(shortcodeSchema.safeParse(codigo).success).toBe(true);
  });

  it.each(["", "a/b", "a b", "X".repeat(65), "a\u0000b", "ação"])("recusa %j", (codigo) => {
    expect(shortcodeSchema.safeParse(codigo).success).toBe(false);
  });
});

describe("createQRCodeSchema", () => {
  const valido = { url: "https://example.com/caminho?x=1", shortcode: "abc123" };

  it("aceita o pedido mínimo", () => {
    expect(createQRCodeSchema.safeParse(valido).success).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>",
    "file:///etc/passwd",
    "https://abc",
    "https://banco.com@golpe.com",
    "",
  ])("recusa a url %j e aponta o campo url", (url) => {
    const r = createQRCodeSchema.safeParse({ ...valido, url });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((issue) => issue.path[0] === "url")).toBe(true);
  });

  it("aceita expiresAt ISO com Z, null ou ausente", () => {
    for (const expiresAt of ["2030-01-01T00:00:00Z", "2030-01-01T00:00:00.123Z", null, undefined]) {
      expect(createQRCodeSchema.safeParse({ ...valido, expiresAt }).success, String(expiresAt)).toBe(true);
    }
  });

  it("recusa expiresAt que não é data-hora ISO em UTC", () => {
    for (const expiresAt of ["amanhã", "2030-01-01", "2030-01-01T00:00:00+03:00", 1893456000000]) {
      expect(createQRCodeSchema.safeParse({ ...valido, expiresAt }).success, String(expiresAt)).toBe(false);
    }
  });

  it("aceita descrição até 2000 caracteres, null ou ausente", () => {
    expect(createQRCodeSchema.safeParse({ ...valido, description: "x".repeat(2000) }).success).toBe(true);
    expect(createQRCodeSchema.safeParse({ ...valido, description: null }).success).toBe(true);
    expect(createQRCodeSchema.safeParse({ ...valido, description: "x".repeat(2001) }).success).toBe(false);
  });

  it("aponta o shortcode, e não a url, quando só o shortcode é ruim", () => {
    const r = createQRCodeSchema.safeParse({ ...valido, shortcode: "a/b" });
    expect(r.error?.issues.some((issue) => issue.path[0] === "url")).toBe(false);
  });
});

describe("updateQRCodeSchema", () => {
  it("recusa o pedido vazio", () => {
    expect(updateQRCodeSchema.safeParse({}).success).toBe(false);
  });

  it("aceita mudar só um campo", () => {
    expect(updateQRCodeSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(updateQRCodeSchema.safeParse({ url: "https://example.com" }).success).toBe(true);
    expect(updateQRCodeSchema.safeParse({ expiresAt: null }).success).toBe(true);
  });

  it("recusa url perigosa também na edição", () => {
    expect(updateQRCodeSchema.safeParse({ url: "javascript:alert(1)" }).success).toBe(false);
  });
});
