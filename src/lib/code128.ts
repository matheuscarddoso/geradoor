/**
 * Code 128 implementado a partir da tabela da simbologia, sem biblioteca.
 *
 * Por que não usar um renderizador pronto: o formulário reserva uma caixa de
 * largura fixa para o código e, no aperto do FORM ROE 01, cada módulo fica em
 * 0,26 mm — quase o mínimo da simbologia. Quem desenha a barra precisa manter
 * a largura em ponto flutuante até o operador de `rect` do PDF; qualquer
 * arredondamento para pixel ou para inteiro engorda uma barra em ~20% e o
 * leitor recusa. Ter a codificação aqui é o que dá esse controle.
 *
 * A tabela foi extraída da fonte do jsbarcode e conferida por três invariantes
 * da simbologia (107 padrões distintos; 6 elementos somando 11 módulos, exceto
 * o stop; número par de módulos de barra) e por 3.017 comparações de saída
 * contra o encoder do jsbarcode nos subsets B e C, incluindo as bordas da
 * faixa de 6 dígitos. Não edite à mão.
 */

/**
 * Larguras dos elementos de cada valor, em módulos. Cada dígito é a largura de
 * um elemento, alternando barra e espaço a partir de uma barra. Índice = valor
 * do caractere. 103 a 105 são os starts; 106 é o stop, o único com 7 elementos.
 */
const PADROES = `
212222 222122 222221 121223 121322 131222 122213 122312 132212 221213
221312 231212 112232 122132 122231 113222 123122 123221 223211 221132
221231 213212 223112 312131 311222 321122 321221 312212 322112 322211
212123 212321 232121 111323 131123 131321 112313 132113 132311 211313
231113 231311 112133 112331 132131 113123 113321 133121 313121 211331
231131 213113 213311 213131 311123 311321 331121 312113 312311 332111
314111 221411 431111 111224 111422 121124 121421 141122 141221 112214
112412 122114 122411 142112 142211 241211 221114 413111 241112 134111
111242 121142 121241 114212 124112 124211 411212 421112 421211 212141
214121 412121 111143 111341 131141 114113 114311 411113 411311 113141
114131 311141 411131 211412 211214 211232 2331112
`
  .trim()
  .split(/\s+/)
  .map((padrao) => [...padrao].map(Number));

/**
 * Busca o padrão de um valor, recusando índice fora da tabela.
 *
 * Um índice inválido devolveria `undefined`, que o `flatMap` descartaria em
 * silêncio: o símbolo sairia com um caractere a menos, largura diferente e um
 * número que o leitor lê como outro. Numa gráfica isso vira uma tiragem
 * inteira errada e só aparece no cliente. Falhar aqui é a única saída
 * aceitável.
 */
function padraoDe(codigo: number): number[] {
  const padrao = PADROES[codigo];
  if (padrao === undefined) {
    throw new Code128Error(`Valor ${codigo} fora da tabela do Code 128.`);
  }
  return padrao;
}

const START_B = 104;
const START_C = 105;
const STOP = 106;
const MODULO = 103;

/** Menor módulo que a simbologia admite. Abaixo disso o leitor erra. */
export const MODULO_MINIMO_MM = 0.25;

export type SubsetCode128 = "B" | "C";

export interface SimboloCode128 {
  /**
   * Larguras dos elementos em módulos, alternando barra e espaço a partir de
   * uma barra. Índice par é barra, índice ímpar é espaço.
   */
  elementos: number[];
  /** Soma de `elementos`. É a largura total do símbolo, em módulos. */
  modulos: number;
  /** Subset efetivamente usado. */
  subset: SubsetCode128;
}

export class Code128Error extends Error {}

/**
 * Codifica um valor em Code 128.
 *
 * Prefere o subset C, onde cada par de dígitos vira um caractere: o símbolo
 * sai com metade dos módulos e sobra o dobro de espessura por barra. Só é
 * possível quando o valor é todo numérico e tem tamanho par — por isso a
 * numeração do formulário usa 6 dígitos e não 5 ou 7.
 *
 * A largura em módulos depende apenas do tamanho do valor, nunca do valor em
 * si: `000001` e `999999` ocupam os mesmos 68 módulos. É o que mantém a caixa
 * do layout válida para a faixa inteira.
 */
export function codificarCode128(valor: string): SimboloCode128 {
  if (valor.length === 0) {
    throw new Code128Error("O valor do código de barras está vazio.");
  }

  const numerico = /^[0-9]+$/.test(valor);
  const usaSubsetC = numerico && valor.length % 2 === 0;

  const start = usaSubsetC ? START_C : START_B;
  const codigos: number[] = [];

  if (usaSubsetC) {
    for (let i = 0; i < valor.length; i += 2) {
      codigos.push(Number(valor.slice(i, i + 2)));
    }
  } else {
    for (const char of valor) {
      const ponto = char.codePointAt(0) ?? 0;
      if (ponto < 32 || ponto > 126) {
        throw new Code128Error(
          `O caractere "${char}" não existe no Code 128. Use letras sem acento, números e pontuação simples.`
        );
      }
      codigos.push(ponto - 32);
    }
  }

  // Dígito de verificação: soma ponderada pela posição, a partir de 1, sobre o
  // valor do start. É o que torna o Code 128 autoverificável.
  let soma = start;
  for (const [indice, codigo] of codigos.entries()) {
    soma += codigo * (indice + 1);
  }
  const verificacao = soma % MODULO;

  const elementos = [start, ...codigos, verificacao, STOP].flatMap(padraoDe);

  return {
    elementos,
    modulos: elementos.reduce((total: number, largura: number) => total + largura, 0),
    subset: usaSubsetC ? "C" : "B",
  };
}

/**
 * Quantos módulos um valor de `tamanho` caracteres ocupa, sem codificar nada.
 *
 * Serve para o editor mostrar a espessura da barra em tempo real enquanto o
 * operador arrasta a caixa, sem gerar um símbolo a cada quadro.
 */
export function modulosPorTamanho(tamanho: number, numerico = true): number {
  const caracteres = numerico && tamanho % 2 === 0 ? tamanho / 2 : tamanho;
  // start + dados + verificação + stop, em módulos.
  return 11 + caracteres * 11 + 11 + 13;
}

/** Barra de um símbolo, como fração da largura total, em [0, 1]. */
export interface BarraNormalizada {
  /** Início da barra, em fração da largura do símbolo. */
  inicio: number;
  /** Largura da barra, em fração da largura do símbolo. */
  largura: number;
}

/**
 * Converte o símbolo em barras normalizadas.
 *
 * Normalizar em vez de devolver milímetros mantém uma única fonte de geometria
 * para os dois consumidores — a prévia em SVG e o PDF — que trabalham em
 * unidades diferentes. Enquanto os dois multiplicam a mesma fração pela mesma
 * largura de caixa, o que o operador vê na tela é o que sai impresso.
 */
export function barrasNormalizadas(simbolo: SimboloCode128): BarraNormalizada[] {
  const barras: BarraNormalizada[] = [];
  let cursor = 0;

  for (const [indice, largura] of simbolo.elementos.entries()) {
    if (indice % 2 === 0) {
      barras.push({
        inicio: cursor / simbolo.modulos,
        largura: largura / simbolo.modulos,
      });
    }
    cursor += largura;
  }

  return barras;
}
