/**
 * Unidade de exibição.
 *
 * O modelo é sempre em milímetro, do editor até o operador de `rect` do PDF.
 * A unidade escolhida aqui só atravessa a fronteira da interface: entra na
 * leitura do campo, sai na escrita. Guardar centímetro no layout obrigaria
 * cada conta de geometria a saber de unidade, e a primeira que esquecesse
 * deslocaria o código sem avisar.
 */

export type Unidade = "mm" | "cm" | "in" | "pt";

interface Definicao {
  /** Quantas unidades destas há em um milímetro. */
  porMm: number;
  /** Casas decimais que a unidade merece na tela. */
  casas: number;
  /** Quanto um pixel de arrasto vale, na unidade. */
  passo: number;
  rotulo: string;
  nome: string;
}

/**
 * O passo de cada unidade equivale a cerca de um décimo de milímetro, que é a
 * menor diferença que se julga no papel. Não faz sentido a mesma alça andar
 * mais fino só porque o campo passou a mostrar polegada.
 */
const DEFINICOES: Record<Unidade, Definicao> = {
  mm: { porMm: 1, casas: 2, passo: 0.1, rotulo: "mm", nome: "Milímetro" },
  cm: { porMm: 0.1, casas: 3, passo: 0.01, rotulo: "cm", nome: "Centímetro" },
  in: { porMm: 1 / 25.4, casas: 4, passo: 0.005, rotulo: "in", nome: "Polegada" },
  pt: { porMm: 72 / 25.4, casas: 1, passo: 0.25, rotulo: "pt", nome: "Ponto" },
};

export const UNIDADES = Object.entries(DEFINICOES).map(([id, def]) => ({
  id: id as Unidade,
  rotulo: def.rotulo,
  nome: def.nome,
}));

export const definicaoDaUnidade = (unidade: Unidade): Definicao => DEFINICOES[unidade];

/** Milímetro para a unidade de exibição. */
export const deMm = (mm: number, unidade: Unidade): number => mm * DEFINICOES[unidade].porMm;

/** Unidade de exibição para milímetro, que é o que o modelo guarda. */
export const paraMm = (valor: number, unidade: Unidade): number =>
  valor / DEFINICOES[unidade].porMm;

/** Número já convertido e arredondado para as casas da unidade. */
export function formatarNaUnidade(mm: number, unidade: Unidade): number {
  const { casas } = DEFINICOES[unidade];
  return Number(deMm(mm, unidade).toFixed(casas));
}

/** Texto curto de uma medida, com a unidade. Usado em selo e em dica. */
export function medidaEmTexto(mm: number, unidade: Unidade): string {
  return `${formatarNaUnidade(mm, unidade).toLocaleString("pt-BR")} ${DEFINICOES[unidade].rotulo}`;
}

export function lerUnidade(): Unidade {
  try {
    const guardada = localStorage.getItem("geradoor:codigo-de-barras:unidade");
    return guardada && guardada in DEFINICOES ? (guardada as Unidade) : "mm";
  } catch {
    return "mm";
  }
}

export function gravarUnidade(unidade: Unidade): void {
  try {
    localStorage.setItem("geradoor:codigo-de-barras:unidade", unidade);
  } catch {
    // Preferência de exibição não vale interromper nada.
  }
}

/**
 * Passo entre marcas da régua, na unidade, para o zoom dado.
 *
 * Escolhe o primeiro passo de uma escala 1-2-5 que deixe as marcas com pelo
 * menos 44 px de distância — abaixo disso os rótulos se encostam e a régua
 * deixa de ser legível justamente quando é mais consultada, no zoom baixo.
 */
export function passoDaRegua(unidade: Unidade, pxPorMm: number): number {
  const { porMm } = DEFINICOES[unidade];
  const minimoPx = 44;
  const candidatos = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  for (const passo of candidatos) {
    if ((passo / porMm) * pxPorMm >= minimoPx) return passo;
  }
  return candidatos[candidatos.length - 1] ?? 1000;
}
