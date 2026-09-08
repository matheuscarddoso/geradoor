/**
 * Catálogo das fontes do número legível.
 *
 * Cada uma existe como arquivo TTF em `public/fonts`, e não como link para o
 * Google: o `jspdf` só embute TrueType, e o que ele serve pela rede é WOFF2,
 * que precisaria de descompressão Brotli no navegador. Servir o TTF do próprio
 * domínio também é o que faz o PDF sair igual sem depender de rede de
 * terceiros no meio de uma tiragem.
 *
 * As métricas foram lidas das tabelas `head`, `OS/2` e `hmtx` de cada arquivo,
 * não estimadas. São elas que põem o topo do dígito exatamente na folga pedida
 * e que dimensionam o texto na prévia igual ao impresso. Repare que o avanço
 * muda com o peso em fonte proporcional — o Inter Bold é mais largo que o
 * Regular —, por isso a métrica é por peso e não por família.
 */

export type PesoDaFonte = 400 | 700;

export interface MetricaDaFonte {
  /** Caminho servido, para o navegador e para o `jspdf`. */
  arquivo: string;
  /** Altura do dígito, em ems. Vem de `sCapHeight`. */
  alturaDoDigito: number;
  /** Avanço do dígito, em ems. Vem de `hmtx` do glifo "0". */
  avanco: number;
}

export interface Fonte {
  id: string;
  nome: string;
  /**
   * Monoespaçada.
   *
   * Num número de série isto importa: os dígitos não dançam de largura de uma
   * página para a outra, e a coluna impressa fica alinhada de cima a baixo.
   */
  mono: boolean;
  /** Nota curta para quem escolhe sem conhecer a fonte. */
  sobre: string;
  pesos: Record<PesoDaFonte, MetricaDaFonte>;
}

const metrica = (
  arquivo: string,
  alturaDoDigito: number,
  avanco: number
): MetricaDaFonte => ({ arquivo: `/fonts/${arquivo}`, alturaDoDigito, avanco });

export const FONTES: readonly Fonte[] = [
  {
    id: "geistmono",
    nome: "Geist Mono",
    mono: true,
    sobre: "A do site. Dígito de largura fixa.",
    pesos: {
      400: metrica("geistmono-400.ttf", 0.71, 0.6),
      700: metrica("geistmono-700.ttf", 0.71, 0.6),
    },
  },
  {
    id: "robotomono",
    nome: "Roboto Mono",
    mono: true,
    sobre: "Mono de traço aberto, boa em corpo pequeno.",
    pesos: {
      400: metrica("robotomono-400.ttf", 0.7109, 0.6001),
      700: metrica("robotomono-700.ttf", 0.7109, 0.6001),
    },
  },
  {
    id: "ibmplexmono",
    nome: "IBM Plex Mono",
    mono: true,
    sobre: "Zero cortado: não se confunde com a letra O.",
    pesos: {
      400: metrica("ibmplexmono-400.ttf", 0.698, 0.6),
      700: metrica("ibmplexmono-700.ttf", 0.698, 0.6),
    },
  },
  {
    id: "courierprime",
    nome: "Courier Prime",
    mono: true,
    sobre: "Datilográfica. Dígito baixo, pede corpo maior.",
    pesos: {
      400: metrica("courierprime-400.ttf", 0.5796, 0.5996),
      700: metrica("courierprime-700.ttf", 0.5796, 0.5996),
    },
  },
  {
    id: "inter",
    nome: "Inter",
    mono: false,
    sobre: "Proporcional, desenhada para tela e etiqueta.",
    pesos: {
      400: metrica("inter-400.ttf", 0.7275, 0.6309),
      700: metrica("inter-700.ttf", 0.7275, 0.6743),
    },
  },
  {
    id: "roboto",
    nome: "Roboto",
    mono: false,
    sobre: "Proporcional estreita, cabe mais em pouca largura.",
    pesos: {
      400: metrica("roboto-400.ttf", 0.7109, 0.562),
      700: metrica("roboto-700.ttf", 0.7109, 0.5737),
    },
  },
  {
    id: "archivonarrow",
    nome: "Archivo Narrow",
    mono: false,
    sobre: "Condensada. Para quando a etiqueta é apertada.",
    pesos: {
      400: metrica("archivonarrow-400.ttf", 0.686, 0.456),
      700: metrica("archivonarrow-700.ttf", 0.686, 0.456),
    },
  },
];

export const FONTE_PADRAO = "geistmono";

const PORID = new Map(FONTES.map((f) => [f.id, f]));

/** A fonte pedida, ou a padrão quando o id não existe mais. */
export function fontePorId(id: string): Fonte {
  return PORID.get(id) ?? PORID.get(FONTE_PADRAO)!;
}

export function metricaDe(id: string, peso: PesoDaFonte): MetricaDaFonte {
  return fontePorId(id).pesos[peso];
}

/** Nome da família para o CSS da prévia. Casa com o `@font-face` do projeto. */
export const familiaCss = (id: string): string =>
  `"${fontePorId(id).nome}", ui-monospace, monospace`;

/**
 * Reserva da Helvetica, para quando o arquivo da fonte não carrega.
 *
 * A Helvetica é padrão do PDF e não embute arquivo nenhum: numa rede ruim o
 * operador continua gerando, com o número num desenho um pouco diferente, em
 * vez de não gerar.
 */
export const FONTE_DE_RESERVA = {
  familia: "helvetica",
  alturaDoDigito: 0.72,
} as const;
