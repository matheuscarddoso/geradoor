/**
 * Traçado de precisão: imagem de cores chapadas para caminhos vetoriais exatos.
 *
 * É o traçado do Logo, da Ilustração e do Traço. A Foto continua no VTracer
 * (wasm/vetorizador), onde o efeito pôster é o que se espera.
 *
 * Por que não o VTracer para logo: ele traça o degrau dos pixels já reduzidos
 * a cores chapadas e tenta alisar esse degrau com splines. A informação de onde
 * a borda realmente passa — o antisserrilhado — foi jogada fora antes, e o que
 * sai é uma reta de logo desenhada como dezenas de curvinhas que ondulam em
 * volta dela. Aqui o caminho é o inverso:
 *
 * 1. **Borda com precisão abaixo do pixel.** Cada cor vira um campo de
 *    cobertura: 1 no miolo, 0 fora, e na borda a fração que o antisserrilhado
 *    indica — a posição da cor do pixel entre as duas cores vizinhas. O
 *    contorno é a curva de nível 0,5 desse campo (marching squares com
 *    interpolação), e passa exatamente no meio da borda.
 * 2. **Reta é reta.** Cantos são detectados pela virada do contorno; entre dois
 *    cantos, o que cabe numa reta vira uma linha só, ajustada por mínimos
 *    quadrados, e o canto entre duas retas vira a interseção delas — exato,
 *    e não o pixel mais próximo.
 * 3. **Curva é curva, com o mínimo de pontos.** O resto é ajustado com Béziers
 *    cúbicas (Schneider, "An Algorithm for Automatically Fitting Digitized
 *    Curves", Graphics Gems, 1990), subdividindo só onde o erro passa da
 *    tolerância.
 * 4. **Sem frestas.** Um caminho por cor, com buracos (`evenodd`). Cada camada
 *    avança dois pixels por baixo das camadas desenhadas depois dela, onde as
 *    duas se encostam: o antisserrilhado das duas bordas não deixa o fundo
 *    vazar numa linha fina entre elas.
 *
 * Tudo puro e síncrono, para rodar no worker e ser conferido por teste.
 */

import type { Dimensoes } from "./vetorizador";

/* -------------------------------------------------------------------------
   Entrada
   ------------------------------------------------------------------------- */

export type Cor = readonly [number, number, number];

export interface EntradaDoTracado {
  dimensoes: Dimensoes;
  /** Pixels RGBA originais, com o antisserrilhado. */
  original: Uint8ClampedArray | Uint8Array;
  /** Rótulo de cor de cada pixel (índice em `cores`), ou -1 para vazio. */
  rotulos: Int16Array;
  cores: readonly Cor[];
  /**
   * Rótulo que não é traçado: o fundo. Com `retangulo`, é desenhado como um
   * retângulo por baixo de tudo; sem, fica transparente.
   */
  fundo: { rotulo: number; retangulo: boolean } | null;
  /** Cor de preenchimento a usar no lugar da paleta, por rótulo (o traço usa). */
  preenchimento?: ReadonlyMap<number, string>;
}

export interface OpcoesDoTracado {
  /** Regiões menores que isto, em pixels, são absorvidas pela vizinha. */
  areaMinima: number;
  /** 0 a 1: de cantos vivos e tolerância justa a curvas suaves. */
  suavidade: number;
  casasDecimais?: number;
  /** Força o fator de ampliação do campo (testes e medições). */
  ampliacao?: number;
}

/**
 * Contornos a partir dos quais o traçado para: o SVG passaria do teto que a
 * página aceita (MAX_CAMINHOS), e ajustar o resto só gastaria tempo e memória.
 */
export const MAX_CONTORNOS = 8_000;

/**
 * Regiões que o traçado aceita desenhar. Acima disto, o piso de área sobe até
 * caber (ver `pisoDeArea`).
 *
 * Cada região vira pelo menos um contorno, e cada contorno custa memória e
 * tempo. Numa arte de verdade são dezenas a poucos milhares; em ruído, uma por
 * pixel.
 */
export const MAX_REGIOES = 6_000;

/** O traçado passou de `MAX_CONTORNOS`: a página refaz com ajustes mais simples. */
export class TracadoComplexoDemais extends Error {}

export interface ResultadoDoTracado {
  /** Elementos SVG, na ordem de empilhamento. */
  elementos: string;
  /** Contornos fechados desenhados (formas e buracos). */
  formas: number;
  /** O piso de área usado; acima do pedido, a imagem foi simplificada. */
  piso: number;
}

/** Quanto uma camada avança por baixo das que vêm depois dela, em pixels. */
const AVANCO_SOB_A_VIZINHA = 2;

/* -------------------------------------------------------------------------
   Manchas pequenas
   ------------------------------------------------------------------------- */

/**
 * Absorve as regiões menores que `areaMinima` na vizinha com quem elas mais
 * fazem divisa. É o controle de detalhe: uma mancha de ruído some, e o
 * contorno em volta dela não ganha um desvio.
 *
 * Vazio (-1) conta como uma cor: um furinho transparente num logo também some.
 */
export function absorverManchas(rotulos: Int16Array, { largura, altura }: Dimensoes, areaMinima: number): void {
  if (areaMinima <= 1) return;
  const total = largura * altura;
  const componente = new Int32Array(total);
  const pilha = new Int32Array(total);
  const membros = new Int32Array(total);

  for (let passada = 0; passada < 3; passada++) {
    componente.fill(-1);
    let mudou = false;
    let id = 0;
    for (let inicio = 0; inicio < total; inicio++) {
      if (componente[inicio] !== -1) continue;
      const rotulo = rotulos[inicio];
      let topo = 0;
      let n = 0;
      pilha[topo++] = inicio;
      componente[inicio] = id;
      while (topo > 0) {
        const i = pilha[--topo];
        membros[n++] = i;
        const x = i % largura;
        const vizinhos = [x > 0 ? i - 1 : -1, x < largura - 1 ? i + 1 : -1, i >= largura ? i - largura : -1, i + largura < total ? i + largura : -1];
        for (const j of vizinhos) {
          if (j < 0 || componente[j] !== -1 || rotulos[j] !== rotulo) continue;
          componente[j] = id;
          pilha[topo++] = j;
        }
      }
      if (n < areaMinima) {
        const divisa = new Map<number, number>();
        for (let k = 0; k < n; k++) {
          const i = membros[k];
          const x = i % largura;
          const vizinhos = [x > 0 ? i - 1 : -1, x < largura - 1 ? i + 1 : -1, i - largura, i + largura];
          for (const j of vizinhos) {
            if (j < 0 || j >= total || componente[j] === id) continue;
            divisa.set(rotulos[j], (divisa.get(rotulos[j]) ?? 0) + 1);
          }
        }
        let destino = rotulo;
        let maior = 0;
        for (const [r, c] of divisa) {
          if (r !== rotulo && c > maior) {
            maior = c;
            destino = r;
          }
        }
        if (destino !== rotulo) {
          for (let k = 0; k < n; k++) rotulos[membros[k]] = destino;
          mudou = true;
        }
      }
      id++;
    }
    if (!mudou) break;
  }
}

/** Quantas regiões conexas de cor os rótulos têm. */
export function contarRegioes(rotulos: Int16Array, { largura, altura }: Dimensoes, teto = Infinity): number {
  const total = largura * altura;
  const visitado = new Uint8Array(total);
  const pilha = new Int32Array(total);
  let regioes = 0;
  for (let inicio = 0; inicio < total; inicio++) {
    if (visitado[inicio]) continue;
    regioes++;
    if (regioes > teto) return regioes;
    const rotulo = rotulos[inicio];
    let topo = 0;
    pilha[topo++] = inicio;
    visitado[inicio] = 1;
    while (topo > 0) {
      const i = pilha[--topo];
      const x = i % largura;
      const vizinhos = [x > 0 ? i - 1 : -1, x < largura - 1 ? i + 1 : -1, i >= largura ? i - largura : -1, i + largura < total ? i + largura : -1];
      for (const j of vizinhos) {
        if (j < 0 || visitado[j] || rotulos[j] !== rotulo) continue;
        visitado[j] = 1;
        pilha[topo++] = j;
      }
    }
  }
  return regioes;
}

/**
 * O piso de área que faz a imagem caber em `MAX_REGIOES`, absorvendo as
 * manchas até lá.
 *
 * Existe para o caso em que a imagem não é vetorizável no detalhe pedido: uma
 * textura, uma foto ruidosa, um degradê que virou milhares de manchinhas. Sem
 * isto, o traçado ia até o fim, gastava segundos e centenas de megabytes, e o
 * resultado era descartado pelos tetos da página — que então mandava tentar de
 * novo, mais simples, com o mesmo custo. Aqui a conta é feita antes, sobre
 * rótulos: contar regiões é O(n) e não aloca quase nada.
 *
 * Escreve em `rotulos` e devolve o piso usado, para quem chama saber que
 * simplificou.
 */
export function pisoDeArea(rotulos: Int16Array, dimensoes: Dimensoes, areaMinima: number, maxRegioes = MAX_REGIOES): number {
  let piso = Math.max(1, areaMinima);
  absorverManchas(rotulos, dimensoes, piso);
  // Cada passo dobra o piso; o teto é metade da imagem, quando não sobra nada
  // a fundir e insistir seria laço infinito.
  const tetoDoPiso = (dimensoes.largura * dimensoes.altura) / 2;
  while (contarRegioes(rotulos, dimensoes, maxRegioes) > maxRegioes && piso < tetoDoPiso) {
    piso = Math.max(4, piso * 2);
    absorverManchas(rotulos, dimensoes, piso);
  }
  return piso;
}

/* -------------------------------------------------------------------------
   Cobertura
   ------------------------------------------------------------------------- */

/**
 * Para cada pixel, quanto dele é da própria cor (0,5 a 1) e qual é a outra
 * cor da mistura, entre as vizinhas.
 *
 * A cor de um pixel de borda é a mistura linear das duas cores que ele cobre
 * — é assim que o antisserrilhado é desenhado. A projeção da cor do pixel no
 * segmento entre as duas cores dá a fração de cada uma. Na borda com o vazio,
 * a fração é o alfa.
 */
export function coberturas(entrada: EntradaDoTracado): { cobertura: Float32Array; outra: Int16Array } {
  const { dimensoes, original, rotulos, cores } = entrada;
  const { largura, altura } = dimensoes;
  const total = largura * altura;
  const cobertura = new Float32Array(total).fill(1);
  const outra = new Int16Array(total).fill(-2);

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      const proprio = rotulos[i];
      if (proprio < 0) continue;
      const p = i * 4;
      let melhor = -2;
      let melhorCobertura = 1;
      let melhorDistancia = Infinity;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= altura) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= largura) continue;
          const r = rotulos[yy * largura + xx];
          if (r === proprio) continue;
          if (r < 0) {
            // Borda com o vazio: o alfa é a cobertura.
            const c = Math.max(0.5, original[p + 3] / 255);
            if (melhor === -2 || c < melhorCobertura) {
              melhor = -1;
              melhorCobertura = c;
              melhorDistancia = 0;
            }
            continue;
          }
          const [ar, ag, ab] = cores[proprio];
          const [br, bg, bb] = cores[r];
          const vr = br - ar;
          const vg = bg - ag;
          const vb = bb - ab;
          const comprimento2 = vr * vr + vg * vg + vb * vb;
          if (comprimento2 === 0) continue;
          const t = ((original[p] - ar) * vr + (original[p + 1] - ag) * vg + (original[p + 2] - ab) * vb) / comprimento2;
          const tLimitado = Math.min(0.5, Math.max(0, t));
          // Qual vizinha explica a cor: a de menor distância até o segmento.
          const qr = ar + vr * tLimitado - original[p];
          const qg = ag + vg * tLimitado - original[p + 1];
          const qb = ab + vb * tLimitado - original[p + 2];
          const distancia = qr * qr + qg * qg + qb * qb;
          if (melhor < 0 ? melhor === -2 : distancia < melhorDistancia) {
            melhor = r;
            melhorDistancia = distancia;
            melhorCobertura = 1 - tLimitado;
          }
        }
      }
      if (melhor !== -2) {
        outra[i] = melhor;
        cobertura[i] = melhorCobertura;
      }
    }
  }
  return { cobertura, outra };
}

/** Dilata uma máscara binária por um quadrado de raio `raio`. */
function dilatar(mascara: Uint8Array, { largura, altura }: Dimensoes, raio: number): Uint8Array {
  const temporaria = new Uint8Array(mascara.length);
  const saida = new Uint8Array(mascara.length);
  for (let y = 0; y < altura; y++) {
    const linha = y * largura;
    for (let x = 0; x < largura; x++) {
      if (!mascara[linha + x]) continue;
      for (let k = Math.max(0, x - raio); k <= Math.min(largura - 1, x + raio); k++) temporaria[linha + k] = 1;
    }
  }
  for (let x = 0; x < largura; x++) {
    for (let y = 0; y < altura; y++) {
      if (!temporaria[y * largura + x]) continue;
      for (let k = Math.max(0, y - raio); k <= Math.min(altura - 1, y + raio); k++) saida[k * largura + x] = 1;
    }
  }
  return saida;
}

/**
 * Mantém vivo o traço fino que caiu entre duas fileiras de pixels.
 *
 * Um traço de 1 px de largura desenhado entre duas fileiras pinta cada uma pela
 * metade: nenhum pixel passa de 0,5, e a curva de nível 0,5 não o vê. É o topo
 * de um "O" num texto de 9 px, que abria e virava "U". Quando dois pixels
 * vizinhos formam uma crista — os dois abaixo de 0,6, somando pelo menos 0,8,
 * mais altos que os de fora —, os dois sobem para 0,6: a curva de nível passa
 * a contorná-los com folga, numa largura próxima da do traço.
 *
 * Abaixo de 0,6, e não de 0,5: medido no "O" que abria, o par era 0,48 e
 * 0,50 — o segundo, exatamente no nível, deixava o contorno de fora e o de
 * dentro se tocarem num ponto, e o traço tinha espessura zero ali.
 */
export function preservarTracosFinos(
  campo: Float32Array,
  { largura, altura }: Dimensoes,
  caixa: { x0: number; y0: number; x1: number; y1: number }
): void {
  const elevar: number[] = [];
  const valor = (x: number, y: number) => (x < 0 || y < 0 || x >= largura || y >= altura ? 0 : campo[y * largura + x]);
  for (let y = Math.max(0, caixa.y0 - 1); y <= Math.min(altura - 1, caixa.y1 + 1); y++) {
    for (let x = Math.max(0, caixa.x0 - 1); x <= Math.min(largura - 1, caixa.x1 + 1); x++) {
      const v = valor(x, y);
      if (v < 0.25 || v >= 0.6) continue;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        const u = valor(x + dx, y + dy);
        if (u < 0.25 || u >= 0.6 || u + v < 0.8) continue;
        if (valor(x - dx, y - dy) < v && valor(x + 2 * dx, y + 2 * dy) < u) {
          elevar.push(y * largura + x, (y + dy) * largura + x + dx);
        }
      }
    }
  }
  for (const i of elevar) campo[i] = Math.max(campo[i], 0.6);
}

/**
 * Quantas vezes o campo de uma região é ampliado antes das curvas de nível.
 *
 * Até 3×, e só em região pequena: a ampliação existe para o detalhe que cabe
 * em poucos pixels — a haste de uma letra, a ponta de um traço —, e numa
 * região grande ela não muda o contorno, só multiplica a memória por nove. O
 * limite é por área ampliada: 1,5 MP, o bastante para uma palavra inteira de
 * texto miúdo.
 *
 * No banco de logos sintéticos, 3× deu o menor erro somado; 4× piorou os
 * traços curvos.
 */
export const PIXELS_MAXIMOS_AMPLIADOS = 1_500_000;

export function fatorDeAmpliacao({ largura, altura }: Dimensoes): number {
  const area = Math.max(1, largura * altura);
  return Math.max(1, Math.min(3, Math.floor(Math.sqrt(PIXELS_MAXIMOS_AMPLIADOS / area))));
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return (
    p1 +
    0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)))
  );
}

/**
 * O campo de uma região, ampliado `fator` vezes por interpolação bicúbica
 * (Catmull-Rom), com margem de 2 px de zeros.
 *
 * Por que ampliar o campo, e não a imagem: a imagem ampliada tem de ser
 * reduzida a cores de novo, e o antisserrilhado espalhado some — o que fazia
 * a haste de um "I" desaparecer. O campo já é a cobertura, e a bicúbica
 * reconstrói entre as amostras o que a linear achata: o pico de um traço de
 * 1 px dividido entre duas fileiras (0,48 e 0,50) volta a passar do nível no
 * meio delas, e a curva de uma letra de 9 px sai redonda, não facetada.
 */
export function ampliarRegiao(
  campo: Float32Array,
  { largura, altura }: Dimensoes,
  caixa: { x0: number; y0: number; x1: number; y1: number },
  fator: number
): { campo: Float32Array; dimensoes: Dimensoes; x: number; y: number } {
  const MARGEM = 2;
  const x0 = caixa.x0 - MARGEM;
  const y0 = caixa.y0 - MARGEM;
  const lo = caixa.x1 - caixa.x0 + 1 + 2 * MARGEM;
  const ao = caixa.y1 - caixa.y0 + 1 + 2 * MARGEM;
  const valor = (x: number, y: number) =>
    x < 0 || y < 0 || x >= largura || y >= altura ? 0 : campo[y * largura + x];

  const ln = lo * fator;
  const an = ao * fator;
  // Primeiro nas colunas, depois nas linhas: separável.
  const horizontal = new Float32Array(ln * ao);
  for (let j = 0; j < ao; j++) {
    const yy = y0 + j;
    for (let X = 0; X < ln; X++) {
      const s = (X + 0.5) / fator - 0.5;
      const i = Math.floor(s);
      const t = s - i;
      const xx = x0 + i;
      horizontal[j * ln + X] = catmullRom(valor(xx - 1, yy), valor(xx, yy), valor(xx + 1, yy), valor(xx + 2, yy), t);
    }
  }
  const saida = new Float32Array(ln * an);
  const h = (X: number, j: number) => (j < 0 || j >= ao ? 0 : horizontal[j * ln + X]);
  for (let Y = 0; Y < an; Y++) {
    const s = (Y + 0.5) / fator - 0.5;
    const j = Math.floor(s);
    const t = s - j;
    for (let X = 0; X < ln; X++) {
      const v = catmullRom(h(X, j - 1), h(X, j), h(X, j + 1), h(X, j + 2), t);
      saida[Y * ln + X] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
  }
  return { campo: saida, dimensoes: { largura: ln, altura: an }, x: x0, y: y0 };
}

/* -------------------------------------------------------------------------
   Contornos: marching squares
   ------------------------------------------------------------------------- */

/**
 * As curvas de nível 0,5 de um campo, como polilinhas fechadas.
 *
 * O campo é amostrado nos centros dos pixels e cercado por uma moldura de
 * zeros, então toda curva fecha — uma forma que encosta na borda da imagem é
 * cortada exatamente nela. Os pontos ficam onde a interpolação linear entre
 * dois centros cruza 0,5. Nas selas (dois cantos dentro em diagonal), a média
 * dos quatro decide se eles se ligam.
 *
 * Coordenadas em pixels da imagem, com (0, 0) no canto superior esquerdo.
 */
export function curvasDeNivel(
  campo: Float32Array,
  { largura, altura }: Dimensoes,
  caixa: { x0: number; y0: number; x1: number; y1: number } = { x0: 0, y0: 0, x1: largura - 1, y1: altura - 1 }
): Float64Array[] {
  const gl = largura + 2;
  const ga = altura + 2;
  const valor = (gx: number, gy: number) =>
    gx < 1 || gy < 1 || gx > largura || gy > altura ? 0 : campo[(gy - 1) * largura + (gx - 1)];

  // Arestas: horizontais em ids pares, verticais em ímpares.
  const vizinhoA = new Map<number, number>();
  const vizinhoB = new Map<number, number>();
  const ligar = (e1: number, e2: number) => {
    for (const [a, b] of [
      [e1, e2],
      [e2, e1],
    ]) {
      if (!vizinhoA.has(a)) vizinhoA.set(a, b);
      else vizinhoB.set(a, b);
    }
  };

  // Só as células em volta de onde o campo não é zero: a camada de um olho de
  // 20 px não precisa varrer a imagem inteira.
  const gy0 = Math.max(0, caixa.y0);
  const gy1 = Math.min(ga - 2, caixa.y1 + 1);
  const gx0 = Math.max(0, caixa.x0);
  const gx1 = Math.min(gl - 2, caixa.x1 + 1);
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      const tl = valor(gx, gy) >= 0.5;
      const tr = valor(gx + 1, gy) >= 0.5;
      const br = valor(gx + 1, gy + 1) >= 0.5;
      const bl = valor(gx, gy + 1) >= 0.5;
      const caso = (tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0);
      if (caso === 0 || caso === 15) continue;
      const T = (gy * gl + gx) * 2;
      const B = ((gy + 1) * gl + gx) * 2;
      const L = (gy * gl + gx) * 2 + 1;
      const R = (gy * gl + gx + 1) * 2 + 1;
      switch (caso) {
        case 1: case 14: ligar(L, B); break;
        case 2: case 13: ligar(B, R); break;
        case 3: case 12: ligar(L, R); break;
        case 4: case 11: ligar(T, R); break;
        case 6: case 9: ligar(T, B); break;
        case 7: case 8: ligar(T, L); break;
        case 5:
        case 10: {
          const centro = (valor(gx, gy) + valor(gx + 1, gy) + valor(gx + 1, gy + 1) + valor(gx, gy + 1)) / 4 >= 0.5;
          // Caso 5: dentro TR e BL; caso 10: dentro TL e BR.
          const ligaTRBL = caso === 5 ? centro : !centro;
          if (ligaTRBL) {
            ligar(T, L);
            ligar(B, R);
          } else {
            ligar(T, R);
            ligar(L, B);
          }
        }
      }
    }
  }

  const ponto = (aresta: number): [number, number] => {
    const indice = aresta >> 1;
    const gx = indice % gl;
    const gy = (indice - gx) / gl;
    if ((aresta & 1) === 0) {
      const a = valor(gx, gy);
      const b = valor(gx + 1, gy);
      return [gx - 0.5 + (0.5 - a) / (b - a), gy - 0.5];
    }
    const a = valor(gx, gy);
    const b = valor(gx, gy + 1);
    return [gx - 0.5, gy - 0.5 + (0.5 - a) / (b - a)];
  };

  const visitada = new Set<number>();
  const curvas: Float64Array[] = [];
  for (const inicio of vizinhoA.keys()) {
    if (visitada.has(inicio)) continue;
    const pontos: number[] = [];
    let anterior = -1;
    let atual = inicio;
    while (!visitada.has(atual)) {
      visitada.add(atual);
      const [x, y] = ponto(atual);
      const n = pontos.length;
      if (n < 2 || Math.abs(pontos[n - 2] - x) > 1e-9 || Math.abs(pontos[n - 1] - y) > 1e-9) pontos.push(x, y);
      const a = vizinhoA.get(atual)!;
      const b = vizinhoB.get(atual);
      const proxima = a !== anterior || b === undefined ? a : b;
      anterior = atual;
      atual = proxima;
    }
    if (pontos.length >= 6) curvas.push(Float64Array.from(pontos));
  }
  return curvas;
}

/* -------------------------------------------------------------------------
   Ajuste: retas, cantos e Béziers
   ------------------------------------------------------------------------- */

type P = [number, number];

const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]];
const soma = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]];
const escalar = (a: P, s: number): P => [a[0] * s, a[1] * s];
const produto = (a: P, b: P) => a[0] * b[0] + a[1] * b[1];
const norma = (a: P) => Math.hypot(a[0], a[1]);
const unitario = (a: P): P => {
  const n = norma(a);
  return n === 0 ? [1, 0] : [a[0] / n, a[1] / n];
};

export type Comando = { tipo: "L"; p: P } | { tipo: "C"; c1: P; c2: P; p: P };

interface Parametros {
  /** Distância máxima de um ponto à reta para o trecho valer como reta. */
  toleranciaDaReta: number;
  /** Erro máximo, em pixels, do ajuste de curva. */
  toleranciaDaCurva: number;
  /** Virada, em graus, a partir da qual um vértice é canto de qualquer jeito. */
  anguloDeCanto: number;
  /** Distância, em pixels, do vértice à corda dos pontos médios acima da qual é canto. */
  alturaDeCanto: number;
  /** Só retas: nenhum ajuste de curva. */
  poligono: boolean;
}

export function parametrosDoAjuste(suavidade: number): Parametros {
  const s = Math.min(1, Math.max(0, suavidade));
  return {
    // Reta de verdade, lida abaixo do pixel, desvia menos de 0,1 px; a aresta
    // de um arco, até ~0,22 px da melhor reta. A tolerância fica entre os dois.
    toleranciaDaReta: 0.15 + 0.1 * s,
    // Medido no banco de logos sintéticos: a fidelidade cai de forma contínua
    // com a tolerância, e acima de ~0,5 px os traços curvos começam a ondular.
    toleranciaDaCurva: 0.2 + 0.6 * s,
    anguloDeCanto: 60 + 30 * s,
    alturaDeCanto: 1.2 + 1.6 * s,
    poligono: s === 0,
  };
}

/**
 * Simplificação de Ramer–Douglas–Peucker de um trecho aberto: os índices dos
 * vértices que ficam, sem os extremos.
 */
function simplificarTrecho(pontos: readonly P[], de: number, ate: number, tolerancia: number, saida: number[]): void {
  const n = pontos.length;
  const a = pontos[de % n];
  const b = pontos[ate % n];
  const d = sub(b, a);
  const comprimento = norma(d);
  let maior = -1;
  let indice = -1;
  for (let k = de + 1; k < ate; k++) {
    const q = pontos[k % n];
    const e =
      comprimento < 1e-9 ? norma(sub(q, a)) : Math.abs((q[0] - a[0]) * d[1] - (q[1] - a[1]) * d[0]) / comprimento;
    if (e > maior) {
      maior = e;
      indice = k;
    }
  }
  if (indice < 0 || maior <= tolerancia) return;
  simplificarTrecho(pontos, de, indice, tolerancia, saida);
  saida.push(indice % n);
  simplificarTrecho(pontos, indice, ate, tolerancia, saida);
}

/** Tolerância do polígono mínimo sobre o contorno, em pixels. */
const TOLERANCIA_DO_POLIGONO = 0.45;

/**
 * Índices dos cantos de uma polilinha fechada.
 *
 * Em dois passos, na ideia do Potrace (Selinger, "Potrace: a polygon-based
 * tracing algorithm", 2003), reescrita aqui:
 *
 * 1. **Polígono mínimo.** O contorno vira o polígono com menos vértices que
 *    fica a menos de 0,45 px dele. Uma reta vira uma aresta; um canto, um
 *    vértice no lugar dele; uma curva, uma sequência de arestas curtas.
 * 2. **Canto ou curva, vértice a vértice.** Um vértice é canto se a virada
 *    nele passa de `viradaDeCanto`, ou se ele fica longe da corda entre os
 *    pontos médios das duas arestas — mais que `alturaDeCanto`. Uma curva
 *    suave, polígonizada com essa tolerância, deixa cada vértice a ~0,9 px da
 *    corda, qualquer que seja o raio; um canto de 135° entre arestas longas
 *    fica a vários pixels. E a ponta redonda de um traço, que vira três arestas
 *    curtas com viradas de 60°, fica abaixo dos dois limites: continua curva.
 */
export function cantos(pontos: readonly P[], viradaDeCanto: number, alturaDeCanto = 2): number[] {
  return analisarPoligono(pontos, viradaDeCanto, alturaDeCanto).cantos;
}

/** O polígono mínimo (índices dos vértices, em ordem) e quais vértices são canto. */
export function analisarPoligono(
  pontos: readonly P[],
  viradaDeCanto: number,
  alturaDeCanto: number
): { vertices: number[]; cantos: number[] } {
  const n = pontos.length;
  if (n < 6) return { vertices: [], cantos: [] };
  let distante = 0;
  for (let i = 1; i < n; i++) if (norma(sub(pontos[i], pontos[0])) > norma(sub(pontos[distante], pontos[0]))) distante = i;
  if (distante === 0) return { vertices: [], cantos: [] };
  const vertices: number[] = [0];
  simplificarTrecho(pontos, 0, distante, TOLERANCIA_DO_POLIGONO, vertices);
  vertices.push(distante);
  simplificarTrecho(pontos, distante, n, TOLERANCIA_DO_POLIGONO, vertices);

  // O antisserrilhado corta a ponta de um canto, e a simplificação põe um
  // vértice em cada lado do corte: um canto de 90° vira dois de 45°, e nenhum
  // passa do limite. Dois vértices próximos são fundidos — fica o de maior
  // virada — quando as viradas deles, no mesmo sentido, somam até 150°: é o
  // canto partido. Somando mais, são os dois cantos da ponta reta de um traço
  // fino (90° + 90°), e ficam. Abaixo de 1,6 px, funde sempre. O corte de um
  // canto agudo de 45°, lido no campo ampliado, chega a ~2,5 px.
  const ARESTA_MINIMA = 1.6;
  const CORTE_DE_CANTO = 2.6;
  const viradaComSinal = (k: number, lista: number[]) => {
    const t = lista.length;
    const e1 = sub(pontos[lista[k]], pontos[lista[(k - 1 + t) % t]]);
    const e2 = sub(pontos[lista[(k + 1) % t]], pontos[lista[k]]);
    return Math.atan2(e1[0] * e2[1] - e1[1] * e2[0], produto(e1, e2));
  };
  let fundiu = true;
  while (fundiu && vertices.length > 3) {
    fundiu = false;
    for (let k = 0; k < vertices.length && vertices.length > 3; k++) {
      const proximo = (k + 1) % vertices.length;
      const aresta = norma(sub(pontos[vertices[proximo]], pontos[vertices[k]]));
      if (aresta >= CORTE_DE_CANTO) continue;
      const va = viradaComSinal(k, vertices);
      const vb = viradaComSinal(proximo, vertices);
      const cantoPartido = Math.sign(va) === Math.sign(vb) && Math.abs(va + vb) <= (150 * Math.PI) / 180;
      if (aresta >= ARESTA_MINIMA && !cantoPartido) continue;
      vertices.splice(Math.abs(va) >= Math.abs(vb) ? proximo : k, 1);
      fundiu = true;
      break;
    }
  }
  vertices.sort((x, y) => x - y);
  const m = vertices.length;
  if (m < 3) return { vertices, cantos: [] };

  const limite = Math.cos((viradaDeCanto * Math.PI) / 180);
  const resultado: number[] = [];
  for (let k = 0; k < m; k++) {
    const u = pontos[vertices[(k - 1 + m) % m]];
    const v = pontos[vertices[k]];
    const w = pontos[vertices[(k + 1) % m]];
    const e1 = sub(v, u);
    const e2 = sub(w, v);
    if (norma(e1) < 1e-9 || norma(e2) < 1e-9) continue;
    const viradaForte = produto(unitario(e1), unitario(e2)) < limite;
    const m1 = escalar(soma(u, v), 0.5);
    const m2 = escalar(soma(v, w), 0.5);
    const corda = sub(m2, m1);
    const comprimento = norma(corda);
    const altura =
      comprimento < 1e-9 ? norma(sub(v, m1)) : Math.abs((v[0] - m1[0]) * corda[1] - (v[1] - m1[1]) * corda[0]) / comprimento;
    if (viradaForte || altura > alturaDeCanto) resultado.push(vertices[k]);
  }
  return { vertices, cantos: resultado.sort((x, y) => x - y) };
}

interface Reta {
  centro: P;
  direcao: P;
  erroMaximo: number;
}

/** Reta de mínimos quadrados totais (componente principal) e o maior desvio. */
export function ajustarReta(pontos: readonly P[]): Reta {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pontos) {
    cx += x;
    cy += y;
  }
  cx /= pontos.length;
  cy /= pontos.length;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const [x, y] of pontos) {
    sxx += (x - cx) * (x - cx);
    sxy += (x - cx) * (y - cy);
    syy += (y - cy) * (y - cy);
  }
  const angulo = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const direcao: P = [Math.cos(angulo), Math.sin(angulo)];
  let erroMaximo = 0;
  for (const [x, y] of pontos) {
    erroMaximo = Math.max(erroMaximo, Math.abs((x - cx) * direcao[1] - (y - cy) * direcao[0]));
  }
  return { centro: [cx, cy], direcao, erroMaximo };
}

/**
 * Se os pontos são pedaço de arco, e não reta.
 *
 * A tolerância sozinha não separa: numa circunferência de 25 px de raio, a
 * aresta de 9 px do polígono mínimo desvia 0,13 px da melhor reta — dentro do
 * que o ruído de uma reta de verdade pode dar. O que separa é comparar os dois
 * modelos: um círculo (ajuste algébrico de Kåsa) explica o arco com erro
 * quase nulo, e numa reta de verdade ele não melhora nada sobre a reta.
 */
export function eArco(pontos: readonly P[], reta: Reta): boolean {
  if (pontos.length < 5 || reta.erroMaximo < 0.06) return false;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sxz = 0, syz = 0, sz = 0;
  const [cx, cy] = reta.centro;
  for (const [x0, y0] of pontos) {
    const x = x0 - cx;
    const y = y0 - cy;
    const z = x * x + y * y;
    sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; sxz += x * z; syz += y * z; sz += z;
  }
  const n = pontos.length;
  // Resolve [sxx sxy sx; sxy syy sy; sx sy n] · [D E F] = -[sxz syz sz].
  const m = [
    [sxx, sxy, sx, -sxz],
    [sxy, syy, sy, -syz],
    [sx, sy, n, -sz],
  ];
  for (let c = 0; c < 3; c++) {
    let pivo = c;
    for (let l = c + 1; l < 3; l++) if (Math.abs(m[l][c]) > Math.abs(m[pivo][c])) pivo = l;
    if (Math.abs(m[pivo][c]) < 1e-12) return false;
    [m[c], m[pivo]] = [m[pivo], m[c]];
    for (let l = 0; l < 3; l++) {
      if (l === c) continue;
      const f = m[l][c] / m[c][c];
      for (let k = c; k < 4; k++) m[l][k] -= f * m[c][k];
    }
  }
  const D = m[0][3] / m[0][0];
  const E = m[1][3] / m[1][1];
  const F = m[2][3] / m[2][2];
  const centroX = -D / 2;
  const centroY = -E / 2;
  const raio2 = centroX * centroX + centroY * centroY - F;
  if (!(raio2 > 0)) return false;
  const raio = Math.sqrt(raio2);
  let erroDoCirculo = 0;
  for (const [x0, y0] of pontos) erroDoCirculo = Math.max(erroDoCirculo, Math.abs(Math.hypot(x0 - cx - centroX, y0 - cy - centroY) - raio));
  return erroDoCirculo < reta.erroMaximo * 0.5;
}

function interseccao(a: Reta, b: Reta): P | null {
  const d = a.direcao[0] * b.direcao[1] - a.direcao[1] * b.direcao[0];
  if (Math.abs(d) < Math.sin((8 * Math.PI) / 180)) return null;
  const w = sub(b.centro, a.centro);
  const t = (w[0] * b.direcao[1] - w[1] * b.direcao[0]) / d;
  return soma(a.centro, escalar(a.direcao, t));
}

function projetar(p: P, reta: Reta): P {
  const t = produto(sub(p, reta.centro), reta.direcao);
  return soma(reta.centro, escalar(reta.direcao, t));
}

/* Ajuste de Bézier cúbica (Schneider, Graphics Gems I). */

function bezier(c: readonly [P, P, P, P], t: number): P {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return [a * c[0][0] + b * c[1][0] + d * c[2][0] + e * c[3][0], a * c[0][1] + b * c[1][1] + d * c[2][1] + e * c[3][1]];
}

function parametrizarPorCorda(pontos: readonly P[]): number[] {
  const u = [0];
  for (let i = 1; i < pontos.length; i++) u.push(u[i - 1] + norma(sub(pontos[i], pontos[i - 1])));
  const total = u[u.length - 1] || 1;
  return u.map((v) => v / total);
}

function gerarBezier(pontos: readonly P[], u: readonly number[], t1: P, t2: P): [P, P, P, P] {
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  let c00 = 0;
  let c01 = 0;
  let c11 = 0;
  let x0 = 0;
  let x1 = 0;
  for (let i = 0; i < pontos.length; i++) {
    const t = u[i];
    const s = 1 - t;
    const b0 = s * s * s;
    const b1 = 3 * s * s * t;
    const b2 = 3 * s * t * t;
    const b3 = t * t * t;
    const a1 = escalar(t1, b1);
    const a2 = escalar(t2, b2);
    c00 += produto(a1, a1);
    c01 += produto(a1, a2);
    c11 += produto(a2, a2);
    const resto = sub(pontos[i], soma(escalar(primeiro, b0 + b1), escalar(ultimo, b2 + b3)));
    x0 += produto(a1, resto);
    x1 += produto(a2, resto);
  }
  const det = c00 * c11 - c01 * c01;
  let alfa1 = det === 0 ? 0 : (x0 * c11 - x1 * c01) / det;
  let alfa2 = det === 0 ? 0 : (c00 * x1 - c01 * x0) / det;
  const corda = norma(sub(ultimo, primeiro));
  const epsilon = 1e-6 * corda;
  if (alfa1 < epsilon || alfa2 < epsilon) alfa1 = alfa2 = corda / 3;
  return [primeiro, soma(primeiro, escalar(t1, alfa1)), soma(ultimo, escalar(t2, alfa2)), ultimo];
}

function erroMaximoDaBezier(pontos: readonly P[], c: readonly [P, P, P, P], u: readonly number[]): { erro: number; indice: number } {
  let erro = 0;
  let indice = Math.floor(pontos.length / 2);
  for (let i = 1; i < pontos.length - 1; i++) {
    const d = sub(bezier(c, u[i]), pontos[i]);
    const e = produto(d, d);
    if (e >= erro) {
      erro = e;
      indice = i;
    }
  }
  return { erro, indice };
}

function reparametrizar(pontos: readonly P[], u: readonly number[], c: readonly [P, P, P, P]): number[] {
  const d1: [P, P, P] = [escalar(sub(c[1], c[0]), 3), escalar(sub(c[2], c[1]), 3), escalar(sub(c[3], c[2]), 3)];
  const d2: [P, P] = [escalar(sub(d1[1], d1[0]), 2), escalar(sub(d1[2], d1[1]), 2)];
  return u.map((t, i) => {
    const s = 1 - t;
    const q = bezier(c, t);
    const q1: P = [s * s * d1[0][0] + 2 * s * t * d1[1][0] + t * t * d1[2][0], s * s * d1[0][1] + 2 * s * t * d1[1][1] + t * t * d1[2][1]];
    const q2: P = [s * d2[0][0] + t * d2[1][0], s * d2[0][1] + t * d2[1][1]];
    const diferenca = sub(q, pontos[i]);
    const numerador = produto(diferenca, q1);
    const denominador = produto(q1, q1) + produto(diferenca, q2);
    if (denominador === 0) return t;
    return Math.min(1, Math.max(0, t - numerador / denominador));
  });
}

export function ajustarCurva(pontos: readonly P[], t1: P, t2: P, tolerancia: number, profundidade = 0): Array<[P, P, P, P]> {
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  if (pontos.length === 2) {
    const d = norma(sub(ultimo, primeiro)) / 3;
    return [[primeiro, soma(primeiro, escalar(t1, d)), soma(ultimo, escalar(t2, d)), ultimo]];
  }
  const tolerancia2 = tolerancia * tolerancia;
  let u = parametrizarPorCorda(pontos);
  let c = gerarBezier(pontos, u, t1, t2);
  let { erro, indice } = erroMaximoDaBezier(pontos, c, u);
  if (erro < tolerancia2) return [c];
  if (erro < tolerancia2 * 16) {
    for (let k = 0; k < 6; k++) {
      u = reparametrizar(pontos, u, c);
      c = gerarBezier(pontos, u, t1, t2);
      ({ erro, indice } = erroMaximoDaBezier(pontos, c, u));
      if (erro < tolerancia2) return [c];
    }
  }
  if (profundidade > 24) return [c];
  indice = Math.min(pontos.length - 2, Math.max(1, indice));
  // Tangente na partição medida sobre ~1,5 px de arco para cada lado. Com os
  // vizinhos imediatos — a frações de pixel no contorno denso —, a direção
  // saía com ruído, e cada partição virava uma quina visível na curva.
  let antes = indice - 1;
  while (antes > 0 && norma(sub(pontos[indice], pontos[antes])) < 1.5) antes--;
  let depois = indice + 1;
  while (depois < pontos.length - 1 && norma(sub(pontos[depois], pontos[indice])) < 1.5) depois++;
  const tangenteCentral = unitario(sub(pontos[antes], pontos[depois]));
  return [
    ...ajustarCurva(pontos.slice(0, indice + 1), t1, tangenteCentral, tolerancia, profundidade + 1),
    ...ajustarCurva(pontos.slice(indice), escalar(tangenteCentral, -1), t2, tolerancia, profundidade + 1),
  ];
}

/** Direção da polilinha a partir de um extremo, medida sobre ~2,5 px de arco. */
function tangenteNaPonta(pontos: readonly P[], doFim: boolean): P {
  const n = pontos.length;
  const origem = doFim ? pontos[n - 1] : pontos[0];
  let alvo = doFim ? pontos[0] : pontos[n - 1];
  for (let k = 1; k < n; k++) {
    const q = doFim ? pontos[n - 1 - k] : pontos[k];
    alvo = q;
    if (norma(sub(q, origem)) >= 2.5) break;
  }
  return unitario(sub(alvo, origem));
}

/** Uma Bézier que não se afasta da corda é uma reta. */
function eReta(c: readonly [P, P, P, P]): boolean {
  const corda = sub(c[3], c[0]);
  const comprimento = norma(corda);
  if (comprimento < 1e-9) return true;
  const n: P = [-corda[1] / comprimento, corda[0] / comprimento];
  const afastamento = Math.max(Math.abs(produto(sub(c[1], c[0]), n)), Math.abs(produto(sub(c[2], c[0]), n)));
  const t1 = produto(sub(c[1], c[0]), corda) / (comprimento * comprimento);
  const t2 = produto(sub(c[2], c[0]), corda) / (comprimento * comprimento);
  return afastamento < 0.15 && t1 >= -0.05 && t1 <= 1.05 && t2 >= -0.05 && t2 <= 1.05;
}

/**
 * O contorno fechado como comandos de caminho, a partir do primeiro ponto.
 * Devolve o ponto inicial e os comandos até voltar a ele.
 */
/** Pontos do contorno ajustado, a cada ~0,5 px. */
function amostrarAjuste(inicio: P, comandos: readonly Comando[]): P[] {
  const amostras: P[] = [inicio];
  let atual = inicio;
  for (const c of comandos) {
    if (c.tipo === "L") {
      const passos = Math.max(1, Math.ceil(norma(sub(c.p, atual)) / 0.5));
      for (let k = 1; k <= passos; k++) amostras.push(soma(atual, escalar(sub(c.p, atual), k / passos)));
    } else {
      const comprimento = norma(sub(c.c1, atual)) + norma(sub(c.c2, c.c1)) + norma(sub(c.p, c.c2));
      const passos = Math.max(2, Math.ceil(comprimento / 0.5));
      for (let k = 1; k <= passos; k++) amostras.push(bezier([atual, c.c1, c.c2, c.p], k / passos));
    }
    atual = c.p;
  }
  return amostras;
}

/**
 * Maior distância de um ponto do contorno real até o contorno ajustado.
 *
 * É o que diz se o ajuste é fiel à forma, e não só à área: um "E" de 8 px que
 * perdeu os dois recortes muda pouco de área, mas o fundo do recorte fica a
 * mais de um pixel do ajuste. Grade de 2 px para a busca não ser quadrática.
 */
function desvioMaximo(pontos: readonly P[], ajusteBruto: readonly P[]): number {
  // A referência precisa ser densa: entre dois pontos distantes do contorno
  // real, o ponto do meio conta.
  const ajuste: P[] = [];
  for (let i = 0; i < ajusteBruto.length; i++) {
    const a = ajusteBruto[i];
    const b = ajusteBruto[(i + 1) % ajusteBruto.length];
    const passos = Math.max(1, Math.ceil(norma(sub(b, a)) / 0.5));
    for (let k = 0; k < passos; k++) ajuste.push(soma(a, escalar(sub(b, a), k / passos)));
  }
  const CELULA = 2;
  const grade = new Map<number, P[]>();
  const chave = (x: number, y: number) => (Math.floor(y / CELULA) + 50000) * 100003 + Math.floor(x / CELULA) + 50000;
  for (const q of ajuste) {
    const k = chave(q[0], q[1]);
    const lista = grade.get(k);
    if (lista) lista.push(q);
    else grade.set(k, [q]);
  }
  let pior = 0;
  for (const p of pontos) {
    let melhor = Infinity;
    for (let raio = 1; raio <= 4 && melhor === Infinity; raio++) {
      const cx = Math.floor(p[0] / CELULA);
      const cy = Math.floor(p[1] / CELULA);
      for (let dy = -raio; dy <= raio; dy++) {
        for (let dx = -raio; dx <= raio; dx++) {
          const lista = grade.get((cy + dy + 50000) * 100003 + cx + dx + 50000);
          if (!lista) continue;
          for (const q of lista) melhor = Math.min(melhor, Math.hypot(p[0] - q[0], p[1] - q[1]));
        }
      }
    }
    pior = Math.max(pior, melhor === Infinity ? CELULA * 5 : melhor);
    if (pior > 8) return pior;
  }
  return pior;
}

/**
 * O contorno fechado como comandos de caminho.
 *
 * Com uma rede de segurança para formas pequenas, onde um canto mal lido
 * deforma a letra inteira: se algum ponto do contorno real ficar a mais de
 * ~1 px do ajuste, tenta de novo só com os cantos inequívocos e tolerância
 * justa; se ainda assim não couber, a forma sai como polígono fiel aos pontos.
 * Deformada ou sumida, nunca.
 */
/** Quantos contornos saíram em cada nível da rede de segurança (diagnóstico e testes). */
export const niveisDoAjuste = { normal: 0, conservador: 0, poligono: 0, retaEntreCantos: 0, retaSemDuvida: 0, retaDestacada: 0 };

/** Maior lado, em pixels, abaixo do qual uma forma é tratada como pequena. */
const FORMA_PEQUENA = 24;

export function ajustarContorno(pontosPlanos: Float64Array, parametrosDaImagem: Parametros): { inicio: P; comandos: Comando[] } {
  const pontos: P[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pontosPlanos.length; i += 2) {
    const x = pontosPlanos[i];
    const y = pontosPlanos[i + 1];
    pontos.push([x, y]);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  // Forma pequena — letra de texto miúdo, o furo de um "O" — com tolerância
  // justa. O anel de um "O" de 9 px tem 1 px de traço: com 0,75 px de folga em
  // cada contorno, o de fora e o de dentro se cruzam, o preenchimento evenodd
  // cancela o traço, e a letra abre.
  // Pequena nas duas direções: uma letra, um furo. Um traço longo de 7 px de
  // largura não é — com a tolerância justa, as pontas redondas dele caíam na
  // rede de segurança e saíam como polígono.
  const pequena = Math.max(maxX - minX, maxY - minY) < FORMA_PEQUENA;
  const parametros: Parametros = pequena
    ? {
        ...parametrosDaImagem,
        toleranciaDaCurva: Math.min(parametrosDaImagem.toleranciaDaCurva, 0.25),
        toleranciaDaReta: Math.min(parametrosDaImagem.toleranciaDaReta, 0.15),
      }
    : parametrosDaImagem;
  const limite = pequena ? 0.45 : Math.max(1, parametros.toleranciaDaCurva * 1.5);

  // Nos dois sentidos: o contorno real perto do ajuste (nada foi cortado) e o
  // ajuste perto do contorno real (nenhuma curva escapou num espinho). O
  // segundo com folga maior: num canto agudo, a interseção das retas fica
  // legitimamente além da ponta que o antisserrilhado arredondou — ~1,5 px num
  // canto de 45° —, e um espinho de verdade tem dez vezes isso.
  const fiel = (a: { inicio: P; comandos: Comando[] }) => {
    const amostras = amostrarAjuste(a.inicio, a.comandos);
    return desvioMaximo(pontos, amostras) <= limite && desvioMaximo(amostras, pontos) <= (pequena ? 1.5 : Math.max(3, limite * 2.5));
  };
  const ajuste = ajustarContornoSemRede(pontos, parametros);
  if (fiel(ajuste)) {
    niveisDoAjuste.normal++;
    return ajuste;
  }

  const conservador = ajustarContornoSemRede(pontos, {
    ...parametros,
    anguloDeCanto: Math.max(parametros.anguloDeCanto, 80),
    alturaDeCanto: Math.max(parametros.alturaDeCanto, 2.5),
    toleranciaDaCurva: Math.min(parametros.toleranciaDaCurva, 0.35),
    toleranciaDaReta: Math.min(parametros.toleranciaDaReta, 0.3),
  });
  if (fiel(conservador)) {
    niveisDoAjuste.conservador++;
    return conservador;
  }
  niveisDoAjuste.poligono++;

  // Dois pontos de partida, o primeiro e o mais distante dele: a
  // simplificação de um laço fechado a partir de um ponto só não tem corda.
  let distante = 0;
  for (let i = 1; i < pontos.length; i++) {
    if (norma(sub(pontos[i], pontos[0])) > norma(sub(pontos[distante], pontos[0]))) distante = i;
  }
  return poligono(pontos, [0, distante], 0.3);
}

/** Aresta do polígono mínimo a partir da qual o trecho é tratado como reta. */
const ARESTA_RETA = 6;

function ajustarContornoSemRede(pontos: readonly P[], parametros: Parametros): { inicio: P; comandos: Comando[] } {
  const n = pontos.length;
  const { vertices, cantos: indicesDeCanto } = analisarPoligono(pontos, parametros.anguloDeCanto, parametros.alturaDeCanto);
  const ehCanto = new Set(indicesDeCanto);

  if (parametros.poligono) {
    return poligono(pontos, indicesDeCanto.length >= 2 ? indicesDeCanto : [0, Math.floor(n / 2)], parametros.toleranciaDaReta);
  }

  // Pontos de divisão: os cantos, e as pontas de toda aresta longa do
  // polígono que é reta de fato — ali uma reta encontra uma curva, ou outra
  // reta sem canto. Aresta longa que não é reta é pedaço de arco grande.
  //
  // O polígono de um arco grande tem arestas longas que desviam da reta menos
  // que o ruído, todas de tamanho parecido. Uma reta de desenho se distingue
  // de três jeitos: é muito mais longa que as arestas vizinhas (a reta que
  // entra numa curva), ou está presa entre dois cantos (o lado de um
  // polígono), ou é reta sem margem de dúvida.
  const divisao = new Set<number>(indicesDeCanto);
  const arestasRetas = new Set<string>();
  const nv = vertices.length;
  const comprimentoDaAresta = (k: number) => norma(sub(pontos[vertices[(k + 1) % nv]], pontos[vertices[k]]));
  for (let k = 0; k < nv; k++) {
    const a = vertices[k];
    const b = vertices[(k + 1) % nv];
    const comprimento = comprimentoDaAresta(k);
    if (comprimento < ARESTA_RETA) continue;
    const trecho: P[] = [];
    for (let i = a; i !== b; i = (i + 1) % n) trecho.push(pontos[i]);
    trecho.push(pontos[b]);
    // Sem as pontas: o antisserrilhado arredonda um canto agudo de 45° até
    // ~1,3 px a partir da ponta, e com a folga fixa de 1,2 px a aresta curta
    // entre dois cantos agudos — a ponta de uma listra — não passava por reta.
    const folga = Math.min(2.5, comprimento * 0.2);
    const miolo = trecho.filter((q) => norma(sub(q, pontos[a])) > folga && norma(sub(q, pontos[b])) > folga);
    if (miolo.length < 2) continue;
    const reta = ajustarReta(miolo);
    if (reta.erroMaximo > parametros.toleranciaDaReta || eArco(miolo, reta)) continue;
    const entreCantos = ehCanto.has(a) && ehCanto.has(b);
    const destacada = comprimento >= 1.8 * Math.max(comprimentoDaAresta((k - 1 + nv) % nv), comprimentoDaAresta((k + 1) % nv));
    // Sem dúvida só em aresta longa: medida sem as pontas, uma aresta de 6 px
    // de arco sobra com 3,6 px, curtos demais para mostrar a curvatura.
    const semDuvida = comprimento >= 15 && reta.erroMaximo <= 0.08;
    if (entreCantos || destacada || semDuvida) {
      if (entreCantos) niveisDoAjuste.retaEntreCantos++;
      else if (semDuvida) niveisDoAjuste.retaSemDuvida++;
      else niveisDoAjuste.retaDestacada++;
      divisao.add(a);
      divisao.add(b);
      arestasRetas.add(`${a}-${b}`);
    }
  }
  // Emendas lisas também onde a curvatura é alta — a ponta redonda de um
  // traço: uma Bézier só não descreve a ponta e a lateral juntas, e o ajuste
  // entortava a ponta numa bolha.
  for (let k = 0; k < nv; k++) {
    const u = pontos[vertices[(k - 1 + nv) % nv]];
    const v = pontos[vertices[k]];
    const w = pontos[vertices[(k + 1) % nv]];
    const cosseno = produto(unitario(sub(v, u)), unitario(sub(w, v)));
    if (cosseno < Math.cos((35 * Math.PI) / 180)) divisao.add(vertices[k]);
  }
  let pontosDeDivisao = [...divisao].sort((x, y) => x - y);
  if (pontosDeDivisao.length < 2) {
    // Curva fechada sem reta nem canto — círculo, gota: quatro emendas lisas.
    const base = vertices.length >= 4 ? vertices : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4)];
    const passo = base.length / 4;
    pontosDeDivisao = [0, 1, 2, 3].map((k) => base[Math.floor(k * passo)]).filter((v, i, lista) => lista.indexOf(v) === i);
  }
  const t = pontosDeDivisao.length;

  const trechos: P[][] = pontosDeDivisao.map((inicio, k) => {
    const fim = pontosDeDivisao[(k + 1) % t];
    const trecho: P[] = [];
    let i = inicio;
    do {
      trecho.push(pontos[i]);
      i = (i + 1) % n;
    } while (i !== fim);
    trecho.push(pontos[fim]);
    return trecho;
  });

  // Reta de cada trecho, medida sem as pontas que o antisserrilhado arredonda.
  // A folga é proporcional ao trecho: numa aresta de 3 px, tirar 1,2 px de
  // cada lado não deixava ponto para medir a direção dela.
  //
  // Só é reta o trecho que é uma aresta já aprovada como reta, ou que está
  // preso entre dois cantos — o lado curto de um polígono. Um trecho curto
  // entre emendas lisas passaria no teste de reta por ser curto, e a ponta
  // redonda de um traço virava um polígono.
  const retas: Array<Reta | null> = trechos.map((trecho, k) => {
    const de = pontosDeDivisao[k];
    const ate = pontosDeDivisao[(k + 1) % t];
    if (!arestasRetas.has(`${de}-${ate}`) && !(ehCanto.has(de) && ehCanto.has(ate))) return null;
    const comprimento = norma(sub(trecho[trecho.length - 1], trecho[0]));
    const folga = ehCanto.size > 0 ? Math.min(2.5, comprimento * 0.2) : 0;
    const miolo = trecho.filter((q) => norma(sub(q, trecho[0])) > folga && norma(sub(q, trecho[trecho.length - 1])) > folga);
    const base = miolo.length >= 2 ? miolo : trecho;
    const reta = ajustarReta(base);
    return reta.erroMaximo <= parametros.toleranciaDaReta && !eArco(base, reta) ? reta : null;
  });

  // Posição de cada ponto de divisão.
  const posicao: P[] = pontosDeDivisao.map((indice, k) => {
    const antes = retas[(k - 1 + t) % t];
    const depois = retas[k];
    const detectado = pontos[indice];
    if (ehCanto.has(indice) && antes && depois) {
      const x = interseccao(antes, depois);
      if (x && norma(sub(x, detectado)) <= 3) return x;
    }
    if (depois && antes) return projetar(detectado, norma(sub(projetar(detectado, depois), detectado)) < norma(sub(projetar(detectado, antes), detectado)) ? depois : antes);
    if (depois) return projetar(detectado, depois);
    if (antes) return projetar(detectado, antes);
    return detectado;
  });

  /** Tangente de saída (sentido do contorno) num ponto de divisão liso. */
  const tangenteLisa = (k: number): P => {
    const antes = retas[(k - 1 + t) % t];
    const depois = retas[k];
    const indice = pontosDeDivisao[k];
    // Direção medida sobre 1,5 px de arco para cada lado: no contorno denso,
    // dois pontos vizinhos ficam a frações de pixel, e a tangente saía ruidosa.
    const aDistancia = (sentidoDoPasso: 1 | -1) => {
      let j = indice;
      let percorrido = 0;
      for (let passos = 0; passos < n - 1 && percorrido < 1.5; passos++) {
        const proximo = (j + sentidoDoPasso + n) % n;
        percorrido += norma(sub(pontos[proximo], pontos[j]));
        j = proximo;
      }
      return pontos[j];
    };
    const sentido = unitario(sub(aDistancia(1), aDistancia(-1)));
    const alinhar = (reta: Reta): P => escalar(reta.direcao, Math.sign(produto(reta.direcao, sentido)) || 1);
    if (depois) return alinhar(depois);
    if (antes) return alinhar(antes);
    return sentido;
  };

  const comandos: Comando[] = [];
  for (let k = 0; k < t; k++) {
    const de = posicao[k];
    const ate = posicao[(k + 1) % t];
    if (retas[k]) {
      comandos.push({ tipo: "L", p: ate });
      continue;
    }
    const trecho = trechos[k];
    const pontosDoAjuste = [de, ...trecho.slice(1, -1), ate];
    const t1 = ehCanto.has(pontosDeDivisao[k]) ? tangenteNaPonta(pontosDoAjuste, false) : tangenteLisa(k);
    const t2 = ehCanto.has(pontosDeDivisao[(k + 1) % t])
      ? tangenteNaPonta(pontosDoAjuste, true)
      : escalar(tangenteLisa((k + 1) % t), -1);
    for (const c of ajustarCurva(pontosDoAjuste, t1, t2, parametros.toleranciaDaCurva)) {
      comandos.push(eReta(c) ? { tipo: "L", p: c[3] } : { tipo: "C", c1: c[1], c2: c[2], p: c[3] });
    }
  }
  return { inicio: posicao[0], comandos: juntarColineares(posicao[0], comandos) };
}

function poligono(pontos: readonly P[], indicesDeCanto: number[], tolerancia: number): { inicio: P; comandos: Comando[] } {
  const n = pontos.length;
  const comandos: Comando[] = [];
  const simplificar = (trecho: P[]): P[] => {
    if (trecho.length <= 2) return [trecho[trecho.length - 1]];
    const a = trecho[0];
    const b = trecho[trecho.length - 1];
    const d = sub(b, a);
    const comprimento = norma(d) || 1;
    let maior = -1;
    let indice = 0;
    for (let i = 1; i < trecho.length - 1; i++) {
      const e = Math.abs((trecho[i][0] - a[0]) * d[1] - (trecho[i][1] - a[1]) * d[0]) / comprimento;
      if (e > maior) {
        maior = e;
        indice = i;
      }
    }
    if (maior <= tolerancia) return [b];
    return [...simplificar(trecho.slice(0, indice + 1)), ...simplificar(trecho.slice(indice))];
  };
  for (let k = 0; k < indicesDeCanto.length; k++) {
    const inicio = indicesDeCanto[k];
    const fim = indicesDeCanto[(k + 1) % indicesDeCanto.length];
    const trecho: P[] = [];
    let i = inicio;
    do {
      trecho.push(pontos[i]);
      i = (i + 1) % n;
    } while (i !== fim);
    trecho.push(pontos[fim]);
    for (const p of simplificar(trecho)) comandos.push({ tipo: "L", p });
  }
  return { inicio: pontos[indicesDeCanto[0]], comandos };
}

/** Retas seguidas na mesma direção viram uma só. */
function juntarColineares(inicio: P, comandos: Comando[]): Comando[] {
  const saida: Comando[] = [];
  let anterior = inicio;
  for (const comando of comandos) {
    const ultimo = saida[saida.length - 1];
    if (comando.tipo === "L" && ultimo?.tipo === "L") {
      const origem = saida.length >= 2 ? saida[saida.length - 2].p : inicio;
      const a = unitario(sub(ultimo.p, origem));
      const b = unitario(sub(comando.p, ultimo.p));
      if (produto(a, b) > Math.cos((1.5 * Math.PI) / 180)) {
        const d = sub(comando.p, origem);
        const comprimento = norma(d) || 1;
        const desvio = Math.abs((ultimo.p[0] - origem[0]) * d[1] - (ultimo.p[1] - origem[1]) * d[0]) / comprimento;
        if (desvio < 0.2) {
          saida[saida.length - 1] = comando;
          anterior = comando.p;
          continue;
        }
      }
    }
    saida.push(comando);
    anterior = comando.p;
  }
  void anterior;
  return saida;
}

/* -------------------------------------------------------------------------
   Montagem
   ------------------------------------------------------------------------- */

function numero(v: number, casas: number): string {
  const s = v.toFixed(casas);
  return s.includes(".") ? s.replace(/\.?0+$/, "") || "0" : s;
}

function hex([r, g, b]: Cor): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export function caminhoSvg(contornos: ReadonlyArray<{ inicio: P; comandos: Comando[] }>, casas: number): string {
  const f = (v: number) => numero(v, casas);
  const partes: string[] = [];
  for (const { inicio, comandos } of contornos) {
    partes.push(`M${f(inicio[0])} ${f(inicio[1])}`);
    for (const c of comandos) {
      if (c.tipo === "L") partes.push(`L${f(c.p[0])} ${f(c.p[1])}`);
      else partes.push(`C${f(c.c1[0])} ${f(c.c1[1])} ${f(c.c2[0])} ${f(c.c2[1])} ${f(c.p[0])} ${f(c.p[1])}`);
    }
    partes.push("Z");
  }
  return partes.join("");
}

/**
 * O traçado inteiro: manchas absorvidas, uma camada por cor, da maior para a
 * menor área, cada uma com o seu campo de cobertura, contornos e ajuste.
 */
export function tracarPreciso(entrada: EntradaDoTracado, opcoes: OpcoesDoTracado): ResultadoDoTracado {
  const { dimensoes, rotulos, cores, fundo } = entrada;
  const { largura, altura } = dimensoes;
  const total = largura * altura;
  const casas = opcoes.casasDecimais ?? 2;
  const parametros = parametrosDoAjuste(opcoes.suavidade);

  const piso = pisoDeArea(rotulos, dimensoes, opcoes.areaMinima);
  const { cobertura, outra } = coberturas(entrada);

  const contagem = new Map<number, number>();
  for (let i = 0; i < total; i++) if (rotulos[i] >= 0) contagem.set(rotulos[i], (contagem.get(rotulos[i]) ?? 0) + 1);
  const camadas = [...contagem.keys()].filter((r) => r !== fundo?.rotulo).sort((a, b) => contagem.get(b)! - contagem.get(a)! || a - b);
  const ordem = new Map(camadas.map((r, k) => [r, k]));

  const elementos: string[] = [];
  let formas = 0;
  if (fundo?.retangulo) {
    elementos.push(`<rect width="${largura}" height="${altura}" fill="${hex(cores[fundo.rotulo])}"/>`);
  }

  const campo = new Float32Array(total);
  const mascara = new Uint8Array(total);
  for (const camada of camadas) {
    const posicao = ordem.get(camada)!;
    for (let i = 0; i < total; i++) mascara[i] = rotulos[i] === camada ? 1 : 0;
    const perto = dilatar(mascara, dimensoes, AVANCO_SOB_A_VIZINHA);
    let x0 = largura;
    let y0 = altura;
    let x1 = -1;
    let y1 = -1;
    for (let i = 0; i < total; i++) {
      const r = rotulos[i];
      if (r === camada) {
        campo[i] = cobertura[i];
      } else if (r >= 0 && perto[i] && (ordem.get(r) ?? -1) > posicao) {
        // Por baixo de uma camada que vem depois: cobre por inteiro.
        campo[i] = 1;
      } else if (outra[i] === camada) {
        campo[i] = 1 - cobertura[i];
      } else if (r < 0 && perto[i]) {
        // Vazio na borda: o alfa do antisserrilhado.
        campo[i] = Math.min(0.5, entrada.original[i * 4 + 3] / 255);
      } else {
        campo[i] = 0;
      }
      if (campo[i] > 0) {
        const x = i % largura;
        const y = (i - x) / largura;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) continue;
    preservarTracosFinos(campo, dimensoes, { x0, y0, x1, y1 });
    // O fator é por camada, pela área que ela ocupa: o fundo de um logo não é
    // ampliado, o texto miúdo dele é.
    const fator = opcoes.ampliacao ?? fatorDeAmpliacao({ largura: x1 - x0 + 5, altura: y1 - y0 + 5 });
    let curvas: Float64Array[];
    if (fator === 1) {
      curvas = curvasDeNivel(campo, dimensoes, { x0, y0, x1, y1 });
    } else {
      const regiao = ampliarRegiao(campo, dimensoes, { x0, y0, x1, y1 }, fator);
      curvas = curvasDeNivel(regiao.campo, regiao.dimensoes);
      // De volta a pixels da imagem.
      for (const c of curvas) {
        for (let k = 0; k < c.length; k += 2) {
          c[k] = regiao.x + c[k] / fator;
          c[k + 1] = regiao.y + c[k + 1] / fator;
        }
      }
    }
    if (formas + curvas.length > MAX_CONTORNOS) throw new TracadoComplexoDemais(`${formas + curvas.length} contornos`);
    const contornos = curvas.map((c) => ajustarContorno(c, parametros));
    if (contornos.length === 0) continue;
    formas += contornos.length;
    const cor = entrada.preenchimento?.get(camada) ?? hex(cores[camada]);
    elementos.push(`<path d="${caminhoSvg(contornos, casas)}" fill="${cor}" fill-rule="evenodd"/>`);
  }
  return { elementos: elementos.join(""), formas, piso };
}
