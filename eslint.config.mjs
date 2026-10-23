import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      // Regras do React Compiler, que chegaram com o eslint-plugin-react-hooks
      // 7 e o projeto não usa. Ficam como aviso, não erro: o caso mais comum
      // aqui é o gerador que sorteia o valor no efeito de montagem, de
      // propósito — sortear no render daria um número no servidor e outro no
      // cliente, e a hidratação quebraria. Reescrever tudo para agradar a
      // regra mexeria em código que funciona sem ganho nenhum enquanto o
      // compilador estiver desligado.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Saída gerada: cliente do Prisma e o WASM do vetorizador.
    "src/generated/**",
    "public/**",
    "wasm/**",
  ]),
]);
