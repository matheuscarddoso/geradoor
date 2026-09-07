import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Node, e não jsdom: o que estes testes cobrem é geometria, codificação e
    // montagem de PDF — nada disso precisa de DOM, e um ambiente falso só
    // atrasaria a suíte que mais interessa rodar a cada mudança.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
