import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
