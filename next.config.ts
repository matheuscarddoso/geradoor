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
      {
        // Isolamento de origem cruzada só no removedor de fundo. Sem ele não
        // há SharedArrayBuffer, e o WASM do modelo roda numa thread só — o
        // recorte fica de duas a três vezes mais lento. `credentialless`, e
        // não `require-corp`, para não exigir Cross-Origin-Resource-Policy de
        // recurso externo que a página carregue, como o script de analytics.
        //
        // Fica restrito à rota porque COOP isola a janela: aplicado no site
        // todo, quebraria qualquer popup ou integração que dependa de
        // window.opener. Chegar aqui por navegação do cliente não recebe os
        // headers, e o removedor funciona igual, só sem as threads extras.
        source: "/removedor-de-fundo",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
      {
        // Contrapartida do bloco acima. Numa página com COEP, o script de um
        // worker dedicado precisa trazer COEP compatível, ou o Chrome bloqueia
        // o worker (ERR_BLOCKED_BY_RESPONSE) e o removedor não carrega. O
        // chunk do worker tem hash no nome, então a regra cobre a pasta
        // estática inteira. Em JS, CSS e fonte o header é inerte: só tem
        // efeito quando a resposta vira documento ou worker.
        source: "/_next/static/:path*",
        headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }],
      },
      {
        // Os modelos levam a versão no nome do arquivo: um modelo novo é um
        // arquivo novo. Então o que já foi baixado nunca muda, e pode ficar no
        // cache para sempre — quem volta ao removedor não baixa nada de novo.
        source: "/modelos/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
