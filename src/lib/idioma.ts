/**
 * Os dois idiomas do site, e como se decide qual mostrar.
 *
 * O português fica na raiz e o inglês em /en. A escolha é essa, e não um
 * prefixo para cada um (/pt e /en), por um motivo concreto: as URLs em
 * português já estão indexadas, e mover uma página indexada é jogar fora a
 * posição que ela conquistou.
 *
 * Quem chega com navegador em inglês é levado para /en na primeira visita, sem
 * precisar clicar em nada. Mas as duas versões têm endereço próprio — é o que
 * permite ao buscador indexar as duas e ao hreflang ligar uma à outra. Trocar o
 * conteúdo da MESMA URL conforme o cabeçalho do navegador faria o Googlebot,
 * que rastreia dos Estados Unidos em inglês, enxergar só a versão em inglês e
 * tirar todo o português do índice.
 */

export const IDIOMAS = ["pt-BR", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];

export const IDIOMA_PADRAO: Idioma = "pt-BR";

/** O prefixo de caminho de cada idioma. O padrão não tem prefixo. */
export const PREFIXO: Record<Idioma, string> = {
  "pt-BR": "",
  en: "/en",
};

/** Cookie que guarda a escolha, para o redirecionamento acontecer uma vez só. */
export const COOKIE_DO_IDIOMA = "geradoor:idioma";

/** Um ano: a pessoa não troca de idioma toda semana. */
export const VALIDADE_DO_COOKIE = 60 * 60 * 24 * 365;

/** O idioma de um caminho, pelo prefixo. */
export function idiomaDoCaminho(caminho: string): Idioma {
  return caminho === "/en" || caminho.startsWith("/en/") ? "en" : "pt-BR";
}

/** O caminho sem o prefixo de idioma, para casar as duas versões de uma página. */
export function semPrefixo(caminho: string): string {
  if (caminho === "/en") return "/";
  return caminho.startsWith("/en/") ? caminho.slice(3) : caminho;
}

/**
 * O idioma preferido, lido do cabeçalho Accept-Language.
 *
 * O cabeçalho vem como uma lista com pesos — `pt-BR,pt;q=0.9,en;q=0.8` —, em
 * que q maior significa preferência maior. Sem q explícito, vale 1.
 *
 * Qualquer variante de português (pt, pt-BR, pt-PT) cai em português; qualquer
 * outra coisa cai em inglês. Não é falta de cuidado: são os dois únicos idiomas
 * que o site tem, e mandar um falante de espanhol para a versão em português
 * seria pior do que mandá-lo para o inglês, que ele tem mais chance de ler.
 */
export function idiomaPreferido(accept: string | null): Idioma {
  if (!accept) return IDIOMA_PADRAO;

  const itens = accept
    .split(",")
    .map((parte) => {
      const [etiqueta, ...parametros] = parte.trim().split(";");
      const q = parametros
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const peso = q ? Number.parseFloat(q.slice(2)) : 1;
      return { etiqueta: etiqueta.trim().toLowerCase(), peso: Number.isFinite(peso) ? peso : 0 };
    })
    .filter((item) => item.etiqueta.length > 0 && item.peso > 0)
    .sort((a, b) => b.peso - a.peso);

  for (const { etiqueta } of itens) {
    if (etiqueta === "*") return IDIOMA_PADRAO;
    if (etiqueta === "pt" || etiqueta.startsWith("pt-")) return "pt-BR";
    if (etiqueta === "en" || etiqueta.startsWith("en-")) return "en";
  }

  // Nenhum dos dois na lista: manda para inglês, que é o que um falante de um
  // terceiro idioma tem mais chance de entender.
  return "en";
}
