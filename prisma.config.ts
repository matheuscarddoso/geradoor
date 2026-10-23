import { defineConfig } from "prisma/config";

/*
 * Desde o Prisma 7 a CLI não lê mais o .env sozinha. O arquivo só existe na
 * máquina de quem desenvolve; na Vercel as variáveis já chegam no ambiente e
 * não há .env para ler — por isso a falta dele não é erro.
 */
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // `generate` não conecta e roda no postinstall, inclusive onde não há
    // banco configurado. Só `migrate` precisa do endereço de verdade, e falha
    // com mensagem clara se ele faltar.
    url: process.env.DATABASE_URL ?? "",
  },
});
