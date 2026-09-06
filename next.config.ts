import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Permite buildar sem derrubar o `next dev`.
   *
   * Os dois escrevem no mesmo `.next` por padrão, e rodar um build enquanto o
   * dev está de pé corrompe o diretório — o sintoma é "Cannot find module for
   * page" numa rota diferente a cada execução. Com NEXT_BUILD_DIR o build usa
   * a sua própria pasta e não encosta na do dev.
   */
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  async headers() {
    return [
      {
        // Headers seguros para aplicar em todas as rotas: nenhum altera
        // renderização. CSP global ficou de fora de propósito — exigiria
        // validar visualmente cada página antes de arriscar bloquear um
        // recurso legítimo.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
