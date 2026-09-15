/**
 * Regras do vetorizador que não dependem de navegador.
 *
 * O traçado em si é do VTracer, compilado para WebAssembly
 * (wasm/vetorizador). O que decide a qualidade antes e depois dele mora aqui:
 * em que resolução traçar, quantas cores usar e quais, como tirar o fundo,
 * como os controles viram parâmetros do motor, como o SVG é montado e como a
 * fidelidade é medida. Tudo puro, para ser conferido por teste sem canvas.
 *
 * Este arquivo só importa tipos: roda igual no worker, na página e no Node.
 */

import type { EntradaDoTracado } from "./tracadoPreciso";

export interface Dimensoes {
  largura: number;
  altura: number;
}

/* -------------------------------------------------------------------------
   Arquivo e limites
   ------------------------------------------------------------------------- */

/** O motor, com versão no nome: um motor novo é um arquivo novo. */
export const MOTOR = {
  url: "/wasm/vetorizador-v2.wasm",
  sha256: "2403f697fd2064f9713a6d9ac4504f4057017546469fa4efa835dfad97693cb2",
} as const;

export const MAX_BYTES = 80 * 1024 * 1024;

export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export type Validacao = { ok: true } | { ok: false; motivo: string };

export function validarArquivo(arquivo: { type: string; size: number }): Validacao {
  if (!(TIPOS_ACEITOS as readonly string[]).includes(arquivo.type)) {
    return { ok: false, motivo: "Use uma imagem JPG, PNG, WEBP ou AVIF" };
  }
  if (arquivo.size === 0) return { ok: false, motivo: "Esse arquivo está vazio" };
  if (arquivo.size > MAX_BYTES) return { ok: false, motivo: "A imagem precisa ter até 80 MB" };
  return { ok: true };
}

/**
 * Teto de área do traçado: 1,2 MP.
 *
 * Não é teto de qualidade da saída: o SVG é vetorial e sai com o tamanho
 * original. É a resolução em que as formas são lidas, e o contorno é lido
 * abaixo do pixel (ver tracadoPreciso.ts), então 1,2 MP descreve uma forma com
 * precisão de fração de pixel — mais do que qualquer logo precisa.
 *
 * O que manda aqui é memória. Medido em navegador, com o teto anterior de
 * 2 MP: subir quatro imagens em sequência levava o Chrome de 640 MB a 960 MB,
 * com picos de 1,08 GB, e numa máquina com pouca RAM livre a aba morria. O
 * custo é quase linear na área, e 1,2 MP corta o pico quase à metade.
 */
export const PIXELS_MAXIMOS_DE_TRACADO = 1_200_000;
export const LADO_MAXIMO_DE_TRACADO = 1600;


/**
 * Lado maior da prévia de tela da imagem original.
 *
 * O palco tem uns 900 px de largura, o dobro numa tela retina. 1800 px mostra
 * tudo o que a tela mostra, e guarda metade dos pixels que 2560 guardava — a
 * prévia é a segunda maior alocação por imagem, depois do traçado.
 */
export const LADO_DA_PREVIA = 1800;

/**
 * A resolução em que a imagem é traçada: a própria, ou reduzida ao teto.
 *
 * Nunca ampliada. Uma versão anterior ampliava imagens pequenas até 1024 px
 * para o contorno sair mais liso, e a interpolação espalhava o antisserrilhado:
 * a haste de 1,5 px de um "I" num texto pequeno clareava até nenhum pixel
 * passar da metade, e a letra sumia do SVG. O traçado de precisão lê a borda
 * abaixo do pixel no próprio antisserrilhado, e não precisa de mais pixels.
 */
export function dimensoesDeTracado(original: Dimensoes): Dimensoes {
  const { largura, altura } = original;
  if (largura <= 0 || altura <= 0) throw new RangeError("Dimensões precisam ser positivas");
  const maior = Math.max(largura, altura);
  const escala = Math.min(1, LADO_MAXIMO_DE_TRACADO / maior, Math.sqrt(PIXELS_MAXIMOS_DE_TRACADO / (largura * altura)));
  return {
    largura: Math.max(1, Math.floor(largura * escala)),
    altura: Math.max(1, Math.floor(altura * escala)),
  };
}

export function dimensoesDaPrevia(original: Dimensoes): Dimensoes {
  const maior = Math.max(original.largura, original.altura);
  if (maior <= LADO_DA_PREVIA) return { ...original };
  const escala = LADO_DA_PREVIA / maior;
  return {
    largura: Math.max(1, Math.round(original.largura * escala)),
    altura: Math.max(1, Math.round(original.altura * escala)),
  };
}

/**
 * Tetos do SVG gerado. Acima deles o resultado não é mostrado: o traçado é
 * refeito mais simples.
 *
 * O risco aqui não é o motor, é a página. O SVG fica vivo três vezes — como
 * texto, como Blob e como imagem rasterizada pelo navegador, que numa tela
 * retina desenha o dobro de pixels em cada uma das duas camadas do comparador.
 * Medido: um SVG de 3,9 MB deixava ~90 MB presos por imagem exibida.
 *
 * 8 mil caminhos e 3 MB cobrem com folga o que uma arte vetorizável produz —
 * o logo mais detalhado do banco de testes deu 1,2 mil caminhos e 33 KB — e
 * seguram a foto, onde o detalhe é infinito por natureza.
 */
export const MAX_CAMINHOS = 8_000;
export const MAX_BYTES_DO_SVG = 3 * 1024 * 1024;

/**
 * Tentativas de simplificar antes de desistir.
 *
 * Duas, e não mais: cada tentativa é um traçado inteiro, com o pico de memória
 * dele. O piso automático de área (ver `pisoDeArea`) já resolve antes o caso
 * que fazia a terceira tentativa ser necessária.
 */
export const MAX_TENTATIVAS = 2;

/** Tempo máximo de uma vetorização antes de o worker ser descartado. */
export const TEMPO_LIMITE_MS = 30_000;

/* -------------------------------------------------------------------------
   Estilos e ajustes
   ------------------------------------------------------------------------- */

export type Estilo = "automatico" | "logo" | "ilustracao" | "foto" | "traco";
export type EstiloConcreto = Exclude<Estilo, "automatico">;

export interface Ajustes {
  estilo: Estilo;
  /** Número de cores, ou "auto" para o menor que representa bem a imagem. */
  cores: number | "auto";
  /** 0 a 100: quanto de mancha pequena é mantida. */
  detalhe: number;
  /** 0 a 100: de cantos vivos a curvas suaves. */
  suavidade: number;
  /** Tira o fundo liso ligado às bordas antes de traçar. */
  fundoTransparente: boolean;
  /** Só no traço: 0 a 255, ou "auto" para o limiar de Otsu. */
  limiar: number | "auto";
}

export const CORES_MINIMAS = 2;
export const CORES_MAXIMAS = 64;

interface PerfilDoEstilo {
  detalhe: number;
  suavidade: number;
  /** Faixa em que a escolha automática de cores procura. */
  faixaDeCores: readonly [number, number];
  /**
   * Fração máxima de pixels mal representados (ver `DISTANTE`) aceita na
   * escolha automática de cores.
   */
  erroAlvo: number;
  /** Suaviza o ruído da foto antes de reduzir as cores. */
  suavizarAntes: boolean;
}

/**
 * O ponto de partida de cada estilo.
 *
 * O erro-alvo é a fração de pixels que a paleta pode deixar longe da cor
 * verdadeira. Num logo, meio por cento: é o antisserrilhado das bordas, e
 * nada mais. Numa foto, que vira pôster de qualquer jeito, oito por cento em
 * troca de um arquivo que abre.
 */
export const PERFIS: Record<EstiloConcreto, PerfilDoEstilo> = {
  logo: { detalhe: 70, suavidade: 50, faixaDeCores: [2, 16], erroAlvo: 0.005, suavizarAntes: false },
  ilustracao: { detalhe: 75, suavidade: 50, faixaDeCores: [2, 32], erroAlvo: 0.02, suavizarAntes: false },
  foto: { detalhe: 55, suavidade: 80, faixaDeCores: [8, 64], erroAlvo: 0.08, suavizarAntes: true },
  traco: { detalhe: 70, suavidade: 50, faixaDeCores: [2, 2], erroAlvo: 0, suavizarAntes: false },
};

export function ajustesDoEstilo(estilo: Estilo, fundoTransparente = false): Ajustes {
  const perfil = PERFIS[estilo === "automatico" ? "ilustracao" : estilo];
  return {
    estilo,
    cores: "auto",
    detalhe: perfil.detalhe,
    suavidade: perfil.suavidade,
    fundoTransparente,
    limiar: "auto",
  };
}

export const AJUSTES_INICIAIS: Ajustes = ajustesDoEstilo("automatico");

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** Ajustes vindos de fora — URL, armazenamento, controle — sempre dentro dos limites. */
export function normalizarAjustes(ajustes: Ajustes): Ajustes {
  return {
    estilo: ajustes.estilo,
    cores: ajustes.cores === "auto" ? "auto" : Math.round(limitar(ajustes.cores, CORES_MINIMAS, CORES_MAXIMAS)),
    detalhe: Math.round(limitar(ajustes.detalhe, 0, 100)),
    suavidade: Math.round(limitar(ajustes.suavidade, 0, 100)),
    fundoTransparente: Boolean(ajustes.fundoTransparente),
    limiar: ajustes.limiar === "auto" ? "auto" : Math.round(limitar(ajustes.limiar, 0, 255)),
  };
}

/* -------------------------------------------------------------------------
   Parâmetros do motor
   ------------------------------------------------------------------------- */

export type ModoDeCurva = "pixel" | "poligono" | "curva";

/** Os parâmetros do VTracer, nas unidades que o módulo recebe. */
export interface ParametrosDoMotor {
  binario: boolean;
  modo: ModoDeCurva;
  /** Lado da menor mancha mantida, em pixels do traçado. */
  ladoDaMancha: number;
  /** Bits de cor comparados, 1 a 8. */
  precisaoDeCor: number;
  /** Diferença mínima de cor para duas regiões virarem camadas separadas. */
  diferencaDeCamada: number;
  anguloDeCanto: number;
  comprimentoMinimo: number;
  iteracoes: number;
  anguloDeEmenda: number;
  casasDecimais: number;
}

/**
 * Dos controles para o motor.
 *
 * - **Detalhe** vira o tamanho da menor mancha mantida. Em pixels do traçado,
 *   proporcional ao lado dele: a mesma posição do controle descarta a mesma
 *   fração da imagem numa foto de 800 ou de 2000 px.
 * - **Suavidade** vira o ângulo abaixo do qual uma virada do contorno é canto
 *   vivo, numa curva quadrática de 20° a 180°: no meio do controle, 60°, o
 *   padrão do VTracer — o canto de 90° de uma letra continua canto. Acima, os
 *   cantos viram curva (180° é o que o VTracer usa para foto). No zero,
 *   polígono puro — o que um pixel art ou um ícone reto pede.
 * - **Cores** não chega aqui: a imagem já vem reduzida à paleta (ver
 *   `quantizar`), então o motor compara cores com precisão total e não junta
 *   camadas de cores diferentes.
 */
export function parametrosDoMotor(ajustes: Ajustes, estilo: EstiloConcreto, tracado: Dimensoes): ParametrosDoMotor {
  const escala = Math.max(tracado.largura, tracado.altura) / 1000;
  const fracaoDeDescarte = Math.pow(1 - ajustes.detalhe / 100, 1.5);
  const ladoDaMancha = Math.max(1, Math.round((1 + fracaoDeDescarte * 11) * Math.max(0.5, escala)));
  const s = ajustes.suavidade / 100;
  return {
    binario: estilo === "traco",
    modo: ajustes.suavidade === 0 ? "poligono" : "curva",
    ladoDaMancha,
    precisaoDeCor: 8,
    diferencaDeCamada: 0,
    anguloDeCanto: Math.round(20 + 160 * s * s),
    comprimentoMinimo: Math.round((3 + s * 3) * 10) / 10,
    iteracoes: 10,
    anguloDeEmenda: 45,
    casasDecimais: 2,
  };
}

/**
 * Uma versão mais simples dos ajustes, para quando o SVG passa dos tetos ou o
 * motor esgota a memória: menos cores e menos detalhe a cada tentativa.
 */
export function simplificar(ajustes: Ajustes, coresUsadas: number): Ajustes {
  const cores = Math.max(CORES_MINIMAS, Math.floor((ajustes.cores === "auto" ? coresUsadas : ajustes.cores) * 0.5));
  return normalizarAjustes({
    ...ajustes,
    cores,
    detalhe: Math.max(0, ajustes.detalhe - 35),
  });
}

/* -------------------------------------------------------------------------
   Cor: sRGB ↔ OKLab
   ------------------------------------------------------------------------- */

/**
 * OKLab (Björn Ottosson, 2020): um espaço de cor em que a distância euclidiana
 * acompanha a diferença percebida. É o que faz a redução de cores gastar a
 * paleta onde o olho vê diferença — em RGB, dois azuis escuros distintos e dois
 * amarelos idênticos à vista pesam o mesmo.
 */
const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function srgbParaOklab(r: number, g: number, b: number): [number, number, number] {
  const lr = LINEAR[r];
  const lg = LINEAR[g];
  const lb = LINEAR[b];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function linearParaByte(c: number): number {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(limitar(v, 0, 1) * 255);
}

export function oklabParaSrgb(L: number, a: number, b: number): [number, number, number] {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
  return [
    linearParaByte(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearParaByte(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearParaByte(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/* -------------------------------------------------------------------------
   Preparação dos pixels
   ------------------------------------------------------------------------- */

/**
 * Alfa binário: abaixo de 128 some, acima fica opaco.
 *
 * O SVG não tem meio-termo por pixel, e um pixel de borda com alfa 60 teria a
 * cor traçada como se fosse opaca — um contorno escuro em volta de todo PNG
 * recortado.
 */
export function binarizarAlfa(rgba: Uint8ClampedArray | Uint8Array): void {
  for (let p = 0; p < rgba.length; p += 4) {
    if (rgba[p + 3] < 128) {
      rgba[p] = rgba[p + 1] = rgba[p + 2] = rgba[p + 3] = 0;
    } else {
      rgba[p + 3] = 255;
    }
  }
}

/** Fração da borda que precisa ter a cor do fundo para ele valer como fundo liso. */
const BORDA_MINIMA_DO_FUNDO = 0.5;

export type ResultadoDoFundo = "removido" | "sem-fundo-liso" | "ja-transparente";

/**
 * Tira o fundo liso ligado às bordas: o branco atrás de um logo, o cinza de um
 * print de ícone. Roda depois da redução de cores.
 *
 * Depois da paleta, o fundo é uma cor exata, e o antisserrilhado já foi
 * decidido pixel a pixel entre o fundo e o desenho. Então basta um
 * preenchimento a partir da borda pela cor exata: os pixels da franja que
 * ficaram com a cor do fundo saem junto, os que ficaram com a cor do desenho
 * ficam, e o contorno sai limpo. Uma versão anterior tirava o fundo antes da
 * paleta, por tolerância, e a franja que sobrava virava lascas bege em volta
 * das letras.
 *
 * Só sai o que encosta na borda: o branco de dentro de um "O" fica, porque é
 * desenho. A cor do fundo é a mais comum entre os pixels opacos da borda, e
 * precisa ocupar pelo menos metade dela: fundo com textura ou degradê não
 * passa, e a função não mexe em nada.
 *
 * `removidos` recebe 1 em cada pixel tirado, para a referência da fidelidade
 * tirar o mesmo.
 */
export function removerFundoLiso(
  rgba: Uint8ClampedArray | Uint8Array,
  { largura, altura }: Dimensoes,
  removidos: Uint8Array = new Uint8Array(largura * altura)
): ResultadoDoFundo {
  const total = largura * altura;
  const borda: number[] = [];
  for (let x = 0; x < largura; x++) borda.push(x, (altura - 1) * largura + x);
  for (let y = 1; y < altura - 1; y++) borda.push(y * largura, y * largura + largura - 1);

  const cor = (i: number) => (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2];
  const contagem = new Map<number, number>();
  let opacasNaBorda = 0;
  for (const i of borda) {
    if (rgba[i * 4 + 3] === 0) continue;
    opacasNaBorda++;
    contagem.set(cor(i), (contagem.get(cor(i)) ?? 0) + 1);
  }
  if (opacasNaBorda < borda.length * BORDA_MINIMA_DO_FUNDO) return "ja-transparente";

  let corDoFundo = -1;
  let maior = 0;
  for (const [c, n] of contagem) {
    if (n > maior) {
      maior = n;
      corDoFundo = c;
    }
  }
  if (maior < borda.length * BORDA_MINIMA_DO_FUNDO) return "sem-fundo-liso";

  const pilha = new Int32Array(total);
  let topo = 0;
  for (const i of borda) {
    if (!removidos[i] && rgba[i * 4 + 3] !== 0 && cor(i) === corDoFundo) {
      removidos[i] = 1;
      pilha[topo++] = i;
    }
  }
  while (topo > 0) {
    const i = pilha[--topo];
    const x = i % largura;
    const vizinhos = [x > 0 ? i - 1 : -1, x < largura - 1 ? i + 1 : -1, i - largura, i + largura];
    for (const j of vizinhos) {
      if (j < 0 || j >= total || removidos[j] || rgba[j * 4 + 3] === 0 || cor(j) !== corDoFundo) continue;
      removidos[j] = 1;
      pilha[topo++] = j;
    }
  }
  for (let i = 0; i < total; i++) {
    if (removidos[i]) rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = rgba[i * 4 + 3] = 0;
  }
  return "removido";
}

/**
 * Suaviza o ruído preservando as bordas: filtro bilateral 3 × 3, duas
 * passadas, com peso pela diferença de cor.
 *
 * Numa foto, o grão do sensor vira milhares de manchas de dois pixels depois
 * da redução de cores, e cada mancha é um caminho no SVG. O filtro alisa o
 * grão sem borrar o contorno, que é o que o traçado precisa manter.
 */
export function suavizarPreservandoBordas(rgba: Uint8ClampedArray | Uint8Array, { largura, altura }: Dimensoes): void {
  const DOIS_SIGMA2 = 2 * 24 * 24;
  const pesoDeCor = new Float32Array(766);
  for (let d = 0; d < pesoDeCor.length; d++) pesoDeCor[d] = Math.exp(-(d * d) / 3 / DOIS_SIGMA2);
  const copia = new Uint8ClampedArray(rgba.length);

  for (let passada = 0; passada < 2; passada++) {
    copia.set(rgba);
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const p = (y * largura + x) * 4;
        if (copia[p + 3] === 0) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let soma = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= altura) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= largura) continue;
            const q = (yy * largura + xx) * 4;
            if (copia[q + 3] === 0) continue;
            const d = Math.abs(copia[q] - copia[p]) + Math.abs(copia[q + 1] - copia[p + 1]) + Math.abs(copia[q + 2] - copia[p + 2]);
            const w = pesoDeCor[d] * (dx === 0 || dy === 0 ? 1 : 0.7);
            r += copia[q] * w;
            g += copia[q + 1] * w;
            b += copia[q + 2] * w;
            soma += w;
          }
        }
        rgba[p] = Math.round(r / soma);
        rgba[p + 1] = Math.round(g / soma);
        rgba[p + 2] = Math.round(b / soma);
      }
    }
  }
}

/* -------------------------------------------------------------------------
   Redução de cores
   ------------------------------------------------------------------------- */

/**
 * Histograma das cores opacas em 18 bits (6 por canal), com a cor OKLab média
 * de cada caixa.
 *
 * A redução de cores trabalha sobre as caixas, com peso pela contagem, e não
 * sobre os pixels: uma foto de 2 MP tem tipicamente 20 a 80 mil caixas
 * ocupadas, e o k-means roda 25 a 100 vezes mais rápido sem amostragem — ou
 * seja, sem perder a cor rara de um detalhe pequeno.
 *
 * `pesoDoPixel` diz quanto cada pixel pesa na escolha da paleta (ver
 * `pesosDoMiolo`); sem ele, todos pesam 1.
 */
export interface Histograma {
  /** Índice da caixa de cada pixel, ou -1 para transparente. */
  caixaDoPixel: Int32Array;
  /** L, a, b médios de cada caixa ocupada, intercalados. */
  cores: Float32Array;
  pesos: Float32Array;
  total: number;
}

export function histograma(rgba: Uint8ClampedArray | Uint8Array, pesoDoPixel?: Float32Array): Histograma {
  const pixels = rgba.length / 4;
  const indiceDaChave = new Int32Array(1 << 18).fill(-1);
  const caixaDoPixel = new Int32Array(pixels);
  const somas: number[] = [];
  const pesos: number[] = [];
  const ocorrencias: number[] = [];
  let total = 0;

  for (let i = 0; i < pixels; i++) {
    const p = i * 4;
    if (rgba[p + 3] === 0) {
      caixaDoPixel[i] = -1;
      continue;
    }
    const chave = ((rgba[p] >> 2) << 12) | ((rgba[p + 1] >> 2) << 6) | (rgba[p + 2] >> 2);
    let caixa = indiceDaChave[chave];
    if (caixa === -1) {
      caixa = pesos.length;
      indiceDaChave[chave] = caixa;
      pesos.push(0);
      ocorrencias.push(0);
      somas.push(0, 0, 0);
    }
    caixaDoPixel[i] = caixa;
    // A cor da caixa é a média de todos os pixels dela; o peso na paleta é o
    // de cada pixel. Uma caixa só de borda continua existindo para receber
    // um centro, mesmo pesando pouco.
    const [L, a, b] = srgbParaOklab(rgba[p], rgba[p + 1], rgba[p + 2]);
    somas[caixa * 3] += L;
    somas[caixa * 3 + 1] += a;
    somas[caixa * 3 + 2] += b;
    ocorrencias[caixa] = (ocorrencias[caixa] ?? 0) + 1;
    const peso = pesoDoPixel ? pesoDoPixel[i] : 1;
    pesos[caixa] += peso;
    total += peso;
  }

  const cores = new Float32Array(somas.length);
  for (let c = 0; c < pesos.length; c++) {
    cores[c * 3] = somas[c * 3] / ocorrencias[c];
    cores[c * 3 + 1] = somas[c * 3 + 1] / ocorrencias[c];
    cores[c * 3 + 2] = somas[c * 3 + 2] / ocorrencias[c];
  }
  return { caixaDoPixel, cores, pesos: Float32Array.from(pesos), total };
}

/** Diferença máxima de canal entre vizinhos para um pixel ser miolo de forma. */
const VARIACAO_DO_MIOLO = 10;
/** Abaixo desta fração de miolo, a imagem é textura, e todos os pixels pesam igual. */
const MIOLO_MINIMO = 0.3;
/** Peso na paleta de um pixel que não é miolo. */
const PESO_DA_BORDA = 0.15;

/**
 * Peso de cada pixel na escolha da paleta: 1 no miolo das formas — pixels com
 * os quatro vizinhos da mesma cor —, 0,15 no resto.
 *
 * É o que impede o antisserrilhado de virar cor. Na borda entre um laranja e
 * um branco, a imagem tem uma faixa de pixels rosados; pesando como os outros,
 * o rosado vira uma cor, a faixa vira uma forma estreita e serrilhada ao longo
 * de todo contorno, e o círculo sai ondulado. Com peso pequeno, a paleta fica
 * com laranja e branco; cada pixel da faixa vai para o mais próximo dos dois,
 * e o contorno cai no meio dela — onde ele está de verdade.
 *
 * Peso pequeno, e não zero: uma região larga sem miolo nenhum — o degradê
 * metálico de uma moldura — ainda soma o bastante para ganhar as suas cores.
 * A faixa de antisserrilhado, de um ou dois pixels, não soma.
 *
 * Numa foto quase nada é miolo; aí a distinção não diz nada, e devolve nulo.
 */
export function pesosDoMiolo(rgba: Uint8ClampedArray | Uint8Array, { largura, altura }: Dimensoes): Float32Array | null {
  const pesos = new Float32Array(largura * altura);
  let opacos = 0;
  let noMiolo = 0;
  const parecido = (p: number, q: number) =>
    rgba[q + 3] !== 0 &&
    Math.abs(rgba[p] - rgba[q]) <= VARIACAO_DO_MIOLO &&
    Math.abs(rgba[p + 1] - rgba[q + 1]) <= VARIACAO_DO_MIOLO &&
    Math.abs(rgba[p + 2] - rgba[q + 2]) <= VARIACAO_DO_MIOLO;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      const p = i * 4;
      if (rgba[p + 3] === 0) continue;
      opacos++;
      const miolo =
        (x === 0 || parecido(p, p - 4)) &&
        (x === largura - 1 || parecido(p, p + 4)) &&
        (y === 0 || parecido(p, p - largura * 4)) &&
        (y === altura - 1 || parecido(p, p + largura * 4));
      pesos[i] = miolo ? 1 : PESO_DA_BORDA;
      if (miolo) noMiolo++;
    }
  }
  return opacos > 0 && noMiolo / opacos >= MIOLO_MINIMO ? pesos : null;
}

export interface Paleta {
  /** Centros em OKLab, intercalados. */
  centros: Float32Array;
  /** Centro de cada caixa do histograma. */
  rotulos: Int32Array;
  /** ΔE OKLab médio ponderado entre cada pixel e o seu centro. */
  erroMedio: number;
  /** Fração dos pixels a mais de `DISTANTE` do seu centro. */
  malRepresentados: number;
}

/**
 * Distância, em ΔE OKLab, a partir da qual a cor da paleta já não passa pela
 * cor do pixel. Duas vezes e meia o limiar de percepção (~0,02).
 *
 * Por que não o erro médio: num logo de fundo branco, o fundo é 80% dos
 * pixels e fica com erro zero; um círculo laranja inteiro pintado de cinza
 * mal mexe na média. A fração de pixels distantes não se dilui na área do
 * fundo: um elemento inteiro com a cor errada é uma fração inteira errada.
 */
const DISTANTE = 0.05;

/** Gerador pseudoaleatório de semente fixa: a mesma imagem dá a mesma paleta. */
function mulberry32(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ITERACOES_DO_KMEANS = 16;

/**
 * k-means ponderado em OKLab sobre o histograma, com início k-means++.
 *
 * Com menos caixas ocupadas que `k`, cada caixa vira uma cor: não há o que
 * reduzir.
 */
export function kmeans(h: Histograma, k: number): Paleta {
  const n = h.pesos.length;
  let comPeso = 0;
  for (let c = 0; c < n; c++) if (h.pesos[c] > 0) comPeso++;
  if (comPeso === 0) return { centros: new Float32Array(0), rotulos: new Int32Array(n), erroMedio: 0, malRepresentados: 0 };
  const efetivo = Math.min(k, comPeso);
  const centros = new Float32Array(efetivo * 3);
  const rotulos = new Int32Array(n);
  const aleatorio = mulberry32(0x5eed);

  // k-means++: o primeiro centro é a caixa mais populosa (determinístico e
  // quase sempre o fundo), os seguintes sorteados com peso × distância².
  let primeira = 0;
  for (let c = 1; c < n; c++) if (h.pesos[c] > h.pesos[primeira]) primeira = c;
  centros.set(h.cores.subarray(primeira * 3, primeira * 3 + 3), 0);
  const d2 = new Float64Array(n).fill(Infinity);
  for (let j = 1; j < efetivo; j++) {
    const [cl, ca, cb] = [centros[(j - 1) * 3], centros[(j - 1) * 3 + 1], centros[(j - 1) * 3 + 2]];
    let soma = 0;
    for (let c = 0; c < n; c++) {
      const dl = h.cores[c * 3] - cl;
      const da = h.cores[c * 3 + 1] - ca;
      const db = h.cores[c * 3 + 2] - cb;
      const d = dl * dl + da * da + db * db;
      if (d < d2[c]) d2[c] = d;
      soma += d2[c] * h.pesos[c];
    }
    let alvo = aleatorio() * soma;
    let escolhida = primeira;
    for (let c = 0; c < n; c++) {
      if (h.pesos[c] === 0) continue;
      escolhida = c;
      alvo -= d2[c] * h.pesos[c];
      if (alvo <= 0) break;
    }
    centros.set(h.cores.subarray(escolhida * 3, escolhida * 3 + 3), j * 3);
  }

  const somas = new Float64Array(efetivo * 3);
  const pesosDosCentros = new Float64Array(efetivo);
  let erro = 0;
  let distantes = 0;
  for (let iteracao = 0; iteracao <= ITERACOES_DO_KMEANS; iteracao++) {
    erro = 0;
    distantes = 0;
    let mudou = false;
    somas.fill(0);
    pesosDosCentros.fill(0);
    for (let c = 0; c < n; c++) {
      const L = h.cores[c * 3];
      const a = h.cores[c * 3 + 1];
      const b = h.cores[c * 3 + 2];
      let melhor = 0;
      let menor = Infinity;
      for (let j = 0; j < efetivo; j++) {
        const dl = L - centros[j * 3];
        const da = a - centros[j * 3 + 1];
        const db = b - centros[j * 3 + 2];
        const d = dl * dl + da * da + db * db;
        if (d < menor) {
          menor = d;
          melhor = j;
        }
      }
      if (rotulos[c] !== melhor) mudou = true;
      rotulos[c] = melhor;
      const w = h.pesos[c];
      erro += Math.sqrt(menor) * w;
      if (menor > DISTANTE * DISTANTE) distantes += w;
      somas[melhor * 3] += L * w;
      somas[melhor * 3 + 1] += a * w;
      somas[melhor * 3 + 2] += b * w;
      pesosDosCentros[melhor] += w;
    }
    if (iteracao === ITERACOES_DO_KMEANS || (!mudou && iteracao > 0)) break;
    for (let j = 0; j < efetivo; j++) {
      if (pesosDosCentros[j] === 0) continue;
      centros[j * 3] = somas[j * 3] / pesosDosCentros[j];
      centros[j * 3 + 1] = somas[j * 3 + 1] / pesosDosCentros[j];
      centros[j * 3 + 2] = somas[j * 3 + 2] / pesosDosCentros[j];
    }
  }
  return {
    centros,
    rotulos,
    erroMedio: h.total === 0 ? 0 : erro / h.total,
    malRepresentados: h.total === 0 ? 0 : distantes / h.total,
  };
}

/** Os números de cores que a escolha automática experimenta, em ordem. */
const DEGRAUS_DE_CORES = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64];

/**
 * A menor paleta, dentro da faixa, com a fração de pixels mal representados
 * abaixo do alvo. Se nenhuma chega lá, a maior da faixa.
 */
export function paletaAutomatica(h: Histograma, faixa: readonly [number, number], erroAlvo: number): Paleta {
  const degraus = DEGRAUS_DE_CORES.filter((k) => k >= faixa[0] && k <= faixa[1]);
  if (degraus.at(-1) !== faixa[1]) degraus.push(faixa[1]);
  let paleta = kmeans(h, degraus[0]);
  for (const k of degraus) {
    paleta = kmeans(h, k);
    if (paleta.malRepresentados <= erroAlvo || paleta.centros.length / 3 < k) break;
  }
  return paleta;
}

/**
 * Tira da paleta as cores que são só antisserrilhado: mistura de duas outras
 * cores da paleta, vista quase só em bordas.
 *
 * No texto pequeno, quase todo pixel é borda, e o peso do miolo não basta: a
 * paleta automática de um texto preto sobre amarelo saía com cinco cores —
 * três tons de oliva entre as duas — e cada tom virava um halo em volta das
 * letras. O traçado de precisão já lê a borda como mistura das duas cores
 * vizinhas; a cor intermediária só atrapalha.
 *
 * Uma cor sai quando fica a menos de 14 níveis (em sRGB, onde o
 * antisserrilhado mistura) do segmento entre duas outras, no miolo dele, menos
 * de 40% dos pixels dela são miolo de forma, e pelo menos 70% deles encostam
 * numa das duas cores. Um cinza de verdade entre preto e branco tem áreas
 * chapadas; o tom do meio de um degradê ocupa uma faixa larga, longe das
 * pontas. Os dois ficam.
 */
export function removerMisturas(
  paleta: Paleta,
  h: Histograma,
  pesosDoPixel: Float32Array | null,
  dimensoes?: Dimensoes
): Paleta {
  let centros = Array.from({ length: paleta.centros.length / 3 }, (_, j) => j);
  const rgb = centros.map((j) => oklabParaSrgb(paleta.centros[j * 3], paleta.centros[j * 3 + 1], paleta.centros[j * 3 + 2]));
  const totais = new Float64Array(centros.length);
  const miolo = new Float64Array(centros.length);
  for (let i = 0; i < h.caixaDoPixel.length; i++) {
    const caixa = h.caixaDoPixel[i];
    if (caixa < 0) continue;
    const j = paleta.rotulos[caixa];
    totais[j]++;
    if (!pesosDoPixel || pesosDoPixel[i] === 1) miolo[j]++;
  }

  /**
   * Fração dos pixels da cor `j` que têm `a` e `b` a até 1 px: a faixa de
   * antisserrilhado é fina e fica entre as duas cores; o tom de um degradê
   * ocupa uma região, e os vizinhos dele são ele mesmo.
   */
  const naFaixa = (j: number, a: number, b: number) => {
    if (!dimensoes) return 1;
    const { largura, altura } = dimensoes;
    let dentro = 0;
    let contados = 0;
    for (let i = 0; i < h.caixaDoPixel.length; i++) {
      const caixa = h.caixaDoPixel[i];
      if (caixa < 0 || paleta.rotulos[caixa] !== j) continue;
      contados++;
      const x = i % largura;
      const y = (i - x) / largura;
      let temA = false;
      let temB = false;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= altura) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= largura) continue;
          const c = h.caixaDoPixel[yy * largura + xx];
          if (c < 0) continue;
          const r = paleta.rotulos[c];
          if (r === a) temA = true;
          else if (r === b) temB = true;
        }
      }
      if (temA || temB) dentro++;
    }
    return contados === 0 ? 0 : dentro / contados;
  };

  const eMistura = (j: number, restantes: number[]) => {
    if (totais[j] === 0 || miolo[j] / totais[j] >= 0.4) return false;
    const c = rgb[j];
    for (const a of restantes) {
      for (const b of restantes) {
        if (a >= b || a === j || b === j) continue;
        const A = rgb[a];
        const B = rgb[b];
        const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
        const comprimento2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
        if (comprimento2 < 40 * 40) continue;
        const t = ((c[0] - A[0]) * d[0] + (c[1] - A[1]) * d[1] + (c[2] - A[2]) * d[2]) / comprimento2;
        if (t < 0.08 || t > 0.92) continue;
        const distancia = Math.hypot(A[0] + d[0] * t - c[0], A[1] + d[1] * t - c[1], A[2] + d[2] * t - c[2]);
        if (distancia <= 14 && naFaixa(j, a, b) >= 0.7) return true;
      }
    }
    return false;
  };

  // Uma por vez, da mais "borda" para a menos: tirar uma pode tornar outra
  // extremo de segmento, e o critério precisa ser refeito.
  for (;;) {
    const candidatas = centros
      .filter((j) => eMistura(j, centros))
      .sort((x, y) => miolo[x] / totais[x] - miolo[y] / totais[y]);
    if (candidatas.length === 0 || centros.length <= 2) break;
    centros = centros.filter((j) => j !== candidatas[0]);
  }
  if (centros.length === paleta.centros.length / 3) return paleta;

  const novos = new Float32Array(centros.length * 3);
  centros.forEach((j, k) => novos.set(paleta.centros.subarray(j * 3, j * 3 + 3), k * 3));
  const rotulos = new Int32Array(paleta.rotulos.length);
  for (let caixa = 0; caixa < rotulos.length; caixa++) {
    const L = h.cores[caixa * 3];
    const a = h.cores[caixa * 3 + 1];
    const b = h.cores[caixa * 3 + 2];
    let melhor = 0;
    let menor = Infinity;
    for (let k = 0; k < centros.length; k++) {
      const dl = L - novos[k * 3];
      const da = a - novos[k * 3 + 1];
      const db = b - novos[k * 3 + 2];
      const dist = dl * dl + da * da + db * db;
      if (dist < menor) {
        menor = dist;
        melhor = k;
      }
    }
    rotulos[caixa] = melhor;
  }
  return { centros: novos, rotulos, erroMedio: paleta.erroMedio, malRepresentados: paleta.malRepresentados };
}

/** Escreve nos pixels a cor do rótulo de cada um; rótulo negativo vira transparente. */
export function aplicarRotulos(
  rgba: Uint8ClampedArray | Uint8Array,
  rotulos: Int16Array,
  cores: ReadonlyArray<readonly [number, number, number]>
): void {
  for (let i = 0; i < rotulos.length; i++) {
    const p = i * 4;
    const r = rotulos[i];
    if (r < 0) {
      rgba[p] = rgba[p + 1] = rgba[p + 2] = rgba[p + 3] = 0;
      continue;
    }
    const cor = cores[r];
    rgba[p] = cor[0];
    rgba[p + 1] = cor[1];
    rgba[p + 2] = cor[2];
    rgba[p + 3] = 255;
  }
}

/** Escreve a paleta nos pixels opacos. Devolve as cores em sRGB. */
export function aplicarPaleta(rgba: Uint8ClampedArray | Uint8Array, h: Histograma, paleta: Paleta): Array<[number, number, number]> {
  const k = paleta.centros.length / 3;
  const cores: Array<[number, number, number]> = [];
  for (let j = 0; j < k; j++) cores.push(oklabParaSrgb(paleta.centros[j * 3], paleta.centros[j * 3 + 1], paleta.centros[j * 3 + 2]));
  for (let i = 0; i < h.caixaDoPixel.length; i++) {
    const caixa = h.caixaDoPixel[i];
    if (caixa < 0) continue;
    const [r, g, b] = cores[paleta.rotulos[caixa]];
    const p = i * 4;
    rgba[p] = r;
    rgba[p + 1] = g;
    rgba[p + 2] = b;
  }
  return cores;
}

/**
 * O estilo que a imagem pede, para o modo automático.
 *
 * Uma imagem de cores chapadas é bem representada por poucas cores; uma foto
 * não é por nenhuma paleta pequena. Quanto sobra mal representado com 16 e com
 * 32 cores separa os três casos sem precisar entender o conteúdo.
 */
export function detectarEstilo(h: Histograma): EstiloConcreto {
  if (h.total === 0) return "logo";
  if (kmeans(h, 16).malRepresentados <= PERFIS.logo.erroAlvo) return "logo";
  if (kmeans(h, 32).malRepresentados <= PERFIS.ilustracao.erroAlvo) return "ilustracao";
  return "foto";
}

/**
 * Limiar de Otsu sobre a luminância dos pixels opacos: o que melhor separa
 * tinta de papel num traço, sem ninguém escolher.
 */
export function limiarDeOtsu(rgba: Uint8ClampedArray | Uint8Array): number {
  const histo = new Float64Array(256);
  let total = 0;
  for (let p = 0; p < rgba.length; p += 4) {
    if (rgba[p + 3] === 0) continue;
    histo[luminancia(rgba[p], rgba[p + 1], rgba[p + 2])]++;
    total++;
  }
  if (total === 0) return 128;
  let somaTotal = 0;
  for (let t = 0; t < 256; t++) somaTotal += t * histo[t];
  let somaFundo = 0;
  let pesoFundo = 0;
  let melhor = 128;
  let maiorVariancia = -1;
  for (let t = 0; t < 256; t++) {
    pesoFundo += histo[t];
    if (pesoFundo === 0) continue;
    const pesoFrente = total - pesoFundo;
    if (pesoFrente === 0) break;
    somaFundo += t * histo[t];
    const mediaFundo = somaFundo / pesoFundo;
    const mediaFrente = (somaTotal - somaFundo) / pesoFrente;
    const variancia = pesoFundo * pesoFrente * (mediaFundo - mediaFrente) ** 2;
    if (variancia > maiorVariancia) {
      maiorVariancia = variancia;
      melhor = t;
    }
  }
  return melhor;
}

function luminancia(r: number, g: number, b: number): number {
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

/**
 * Preto e branco para o modo traço: tinta vira preto opaco, o resto branco.
 * O motor lê o vermelho abaixo de 128 como tinta. Transparente conta como papel.
 */
export function binarizar(rgba: Uint8ClampedArray | Uint8Array, limiar: number): void {
  for (let p = 0; p < rgba.length; p += 4) {
    const tinta = rgba[p + 3] !== 0 && luminancia(rgba[p], rgba[p + 1], rgba[p + 2]) <= limiar;
    const v = tinta ? 0 : 255;
    rgba[p] = rgba[p + 1] = rgba[p + 2] = v;
    rgba[p + 3] = 255;
  }
}

/* -------------------------------------------------------------------------
   Preparação completa
   ------------------------------------------------------------------------- */

export interface Preparacao {
  estilo: EstiloConcreto;
  coresUsadas: number;
  /** A paleta aplicada, em sRGB. Vazia no traço. */
  paleta: Array<[number, number, number]>;
  fundo: ResultadoDoFundo | null;
  limiar: number | null;
  /**
   * Traçado de precisão (tracadoPreciso.ts). Falso na Foto e na arte com
   * textura, que vão ao VTracer.
   */
  preciso: boolean;
  /**
   * Rótulo de cor de cada pixel e as cores. O traçado de precisão trabalha
   * direto nisto; o caminho do VTracer usa para medir a complexidade e
   * simplificar antes de traçar.
   */
  entrada: EntradaDoTracado;
}

/**
 * Tudo o que acontece com os pixels antes do traçado, na ordem:
 *
 * 1. alfa binário;
 * 2. estilo decidido, se automático;
 * 3. no traço, binarização; nos demais, suavização (foto) e redução de cores;
 * 4. fundo liso, se pedido.
 *
 * Na Foto, os pixels saem prontos para o VTracer, com a paleta aplicada e o
 * fundo apagado. Nos demais estilos, sai também `entrada`, para o traçado de
 * precisão: os rótulos de cor de cada pixel e os pixels originais, cujo
 * antisserrilhado diz onde cada borda passa.
 *
 * `referencia` recebe a imagem que o SVG tenta reproduzir, contra a qual a
 * fidelidade é medida: os pixels depois do passo 1, sem o fundo que o passo 4
 * tirou — comparar com a original acusaria como erro o fundo que a pessoa
 * pediu para tirar. No traço, a tinta binarizada sobre transparente.
 */
export function prepararPixels(
  rgba: Uint8ClampedArray | Uint8Array,
  dimensoes: Dimensoes,
  ajustes: Ajustes,
  referencia?: (pixels: Uint8ClampedArray) => void
): Preparacao {
  const total = dimensoes.largura * dimensoes.altura;
  const original = new Uint8ClampedArray(rgba);
  binarizarAlfa(rgba);

  if (ajustes.estilo === "traco") {
    const limiar = ajustes.limiar === "auto" ? limiarDeOtsu(rgba) : ajustes.limiar;
    const rotulos = new Int16Array(total);
    const somas = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    for (let i = 0; i < total; i++) {
      const p = i * 4;
      if (rgba[p + 3] === 0) {
        rotulos[i] = -1;
        continue;
      }
      const r = luminancia(rgba[p], rgba[p + 1], rgba[p + 2]) <= limiar ? 0 : 1;
      rotulos[i] = r;
      somas[r][0] += rgba[p];
      somas[r][1] += rgba[p + 1];
      somas[r][2] += rgba[p + 2];
      somas[r][3]++;
    }
    const media = (k: number, padrao: number): [number, number, number] =>
      somas[k][3] === 0 ? [padrao, padrao, padrao] : [somas[k][0] / somas[k][3], somas[k][1] / somas[k][3], somas[k][2] / somas[k][3]];
    binarizar(rgba, limiar);
    if (referencia) {
      const tinta = new Uint8ClampedArray(rgba.length);
      for (let p = 0; p < rgba.length; p += 4) if (rgba[p] === 0) tinta[p + 3] = 255;
      referencia(tinta);
    }
    return {
      estilo: "traco",
      coresUsadas: 1,
      paleta: [],
      fundo: null,
      limiar,
      preciso: true,
      entrada: {
        dimensoes,
        original,
        rotulos,
        cores: [media(0, 0), media(1, 255)],
        // O papel não é desenhado: o traço é só a tinta, sobre transparente.
        fundo: { rotulo: 1, retangulo: false },
        preenchimento: new Map([[0, "#000000"]]),
      },
    };
  }

  const antes = referencia ? new Uint8ClampedArray(rgba) : null;

  let estilo: EstiloConcreto = ajustes.estilo === "automatico" ? "ilustracao" : ajustes.estilo;
  let pesos = pesosDoMiolo(rgba, dimensoes);
  let h = histograma(rgba, pesos ?? undefined);
  if (ajustes.estilo === "automatico") estilo = detectarEstilo(h);

  const perfil = PERFIS[estilo];
  if (perfil.suavizarAntes) {
    suavizarPreservandoBordas(rgba, dimensoes);
    pesos = pesosDoMiolo(rgba, dimensoes);
    h = histograma(rgba, pesos ?? undefined);
  }

  let paleta =
    ajustes.cores === "auto" ? paletaAutomatica(h, perfil.faixaDeCores, perfil.erroAlvo) : kmeans(h, ajustes.cores);
  const preciso = estilo === "logo" || (estilo === "ilustracao" && eArteChapada(h, paleta, pesos));
  // No traçado de precisão, a borda é lida como mistura: cor que só é
  // mistura sai da paleta. No VTracer, os tons intermediários são desenho.
  if (preciso) paleta = removerMisturas(paleta, h, pesos, dimensoes);
  const cores = aplicarPaleta(rgba, h, paleta);

  const rotulos = new Int16Array(total);
  for (let i = 0; i < total; i++) {
    const caixa = h.caixaDoPixel[i];
    rotulos[i] = caixa < 0 ? -1 : paleta.rotulos[caixa];
  }

  if (!preciso) {
    let fundo: ResultadoDoFundo | null = null;
    const removidos = new Uint8Array(total);
    if (ajustes.fundoTransparente) fundo = removerFundoLiso(rgba, dimensoes, removidos);
    if (antes && referencia) {
      if (fundo === "removido") for (let i = 0; i < total; i++) if (removidos[i]) antes[i * 4 + 3] = 0;
      referencia(antes);
    }
    // Os rótulos vão junto: o caminho do VTracer mede neles a complexidade da
    // imagem e simplifica antes de traçar (ver o worker).
    for (let i = 0; i < total; i++) if (removidos[i]) rotulos[i] = -1;
    return {
      estilo,
      coresUsadas: cores.length,
      paleta: cores,
      fundo,
      limiar: null,
      preciso: false,
      entrada: { dimensoes, original, rotulos, cores, fundo: null },
    };
  }

  rotularMisturas(rotulos, original, dimensoes, cores, pesos);
  const coresDoTracado: Array<[number, number, number]> = cores.map((c) => [...c] as [number, number, number]);
  const { resultado: fundo, entrada: fundoDaEntrada } = separarFundo(rotulos, dimensoes, coresDoTracado, ajustes.fundoTransparente);

  if (antes && referencia) {
    if (ajustes.fundoTransparente && fundo === "removido" && fundoDaEntrada) {
      for (let i = 0; i < total; i++) if (rotulos[i] === fundoDaEntrada.rotulo) antes[i * 4 + 3] = 0;
    }
    referencia(antes);
  }
  return {
    estilo,
    coresUsadas: cores.length,
    paleta: cores,
    fundo: ajustes.fundoTransparente ? fundo : null,
    limiar: null,
    preciso: true,
    entrada: { dimensoes, original, rotulos, cores: coresDoTracado, fundo: fundoDaEntrada },
  };
}

/**
 * Pixel de borda recebe uma das duas cores que ele mistura, nunca uma terceira.
 *
 * O antisserrilhado entre marinho e branco dá um azul acinzentado que, pela
 * cor mais próxima, pode cair num terceiro tom da paleta — o piscina de outra
 * forma da imagem. O círculo marinho saía com pontos piscina na borda, e o
 * contorno dele picotado por eles. Aqui, cada pixel que não é miolo procura,
 * entre as cores presentes numa janela 5 × 5 em volta, o par cuja mistura
 * explica a cor dele, e fica com a ponta do par mais próxima.
 */
function rotularMisturas(
  rotulos: Int16Array,
  original: Uint8ClampedArray,
  { largura, altura }: Dimensoes,
  cores: ReadonlyArray<readonly [number, number, number]>,
  pesos: Float32Array | null
): void {
  const saida = new Int16Array(rotulos);
  const presentes = new Set<number>();
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      if (rotulos[i] < 0 || (pesos && pesos[i] === 1)) continue;
      presentes.clear();
      for (let dy = -2; dy <= 2; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= altura) continue;
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= largura) continue;
          const r = rotulos[yy * largura + xx];
          if (r >= 0) presentes.add(r);
        }
      }
      if (presentes.size < 2) continue;
      const p = i * 4;
      const c = [original[p], original[p + 1], original[p + 2]];
      const proprio = cores[rotulos[i]];
      let melhorDistancia = Math.hypot(c[0] - proprio[0], c[1] - proprio[1], c[2] - proprio[2]);
      let melhor = rotulos[i];
      const lista = [...presentes];
      for (let u = 0; u < lista.length; u++) {
        for (let v = u + 1; v < lista.length; v++) {
          const A = cores[lista[u]];
          const B = cores[lista[v]];
          const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
          const comprimento2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
          if (comprimento2 === 0) continue;
          const t = Math.min(1, Math.max(0, ((c[0] - A[0]) * d[0] + (c[1] - A[1]) * d[1] + (c[2] - A[2]) * d[2]) / comprimento2));
          const distancia = Math.hypot(A[0] + d[0] * t - c[0], A[1] + d[1] * t - c[1], A[2] + d[2] * t - c[2]);
          if (distancia < melhorDistancia - 1) {
            melhorDistancia = distancia;
            melhor = t < 0.5 ? lista[u] : lista[v];
          }
        }
      }
      saida[i] = melhor;
    }
  }
  rotulos.set(saida);
}

/**
 * Se a imagem é arte de cores chapadas: a maior parte dos pixels fora da cor
 * dominante é miolo de forma.
 *
 * Decide o traçado da Ilustração. Arte chapada vai ao traçado de precisão, com
 * retas e cantos exatos. Imagem com sombreado e textura — uma foto tratada
 * como ilustração — vai ao VTracer: medido numa foto, o traçado de precisão
 * ficou com 72% a 79% de fidelidade, contra 94% do VTracer, que empilha
 * regiões e reproduz melhor o sombreado.
 */
export function eArteChapada(h: Histograma, paleta: Paleta, pesosDoPixel: Float32Array | null): boolean {
  if (!pesosDoPixel) return false;
  const k = paleta.centros.length / 3;
  const contagem = new Float64Array(k);
  for (let i = 0; i < h.caixaDoPixel.length; i++) {
    const caixa = h.caixaDoPixel[i];
    if (caixa >= 0) contagem[paleta.rotulos[caixa]]++;
  }
  let dominante = 0;
  for (let j = 1; j < k; j++) if (contagem[j] > contagem[dominante]) dominante = j;
  let total = 0;
  let miolo = 0;
  for (let i = 0; i < h.caixaDoPixel.length; i++) {
    const caixa = h.caixaDoPixel[i];
    if (caixa < 0 || paleta.rotulos[caixa] === dominante) continue;
    total++;
    if (pesosDoPixel[i] === 1) miolo++;
  }
  return total > 0 && miolo / total >= 0.55;
}

/**
 * O fundo do traçado de precisão: a cor que ocupa pelo menos metade da borda.
 *
 * - Sem fundo transparente, ele vira um retângulo por baixo de tudo, e os
 *   pixels dele não são traçados — os buracos das outras camadas mostram o
 *   retângulo.
 * - Com fundo transparente, só a parte dele ligada à borda some. O resto — o
 *   branco dentro de um "O", os olhos de uma coruja — ganha um rótulo próprio,
 *   da mesma cor, e é traçado como desenho.
 */
function separarFundo(
  rotulos: Int16Array,
  { largura, altura }: Dimensoes,
  cores: Array<[number, number, number]>,
  transparente: boolean
): { resultado: ResultadoDoFundo; entrada: EntradaDoTracado["fundo"] } {
  const total = largura * altura;
  const borda: number[] = [];
  for (let x = 0; x < largura; x++) borda.push(x, (altura - 1) * largura + x);
  for (let y = 1; y < altura - 1; y++) borda.push(y * largura, y * largura + largura - 1);

  const contagem = new Map<number, number>();
  let opacas = 0;
  for (const i of borda) {
    if (rotulos[i] < 0) continue;
    opacas++;
    contagem.set(rotulos[i], (contagem.get(rotulos[i]) ?? 0) + 1);
  }
  if (opacas < borda.length * BORDA_MINIMA_DO_FUNDO) return { resultado: "ja-transparente", entrada: null };
  let rotulo = -1;
  let maior = 0;
  for (const [r, n] of contagem) {
    if (n > maior) {
      maior = n;
      rotulo = r;
    }
  }
  if (maior < borda.length * BORDA_MINIMA_DO_FUNDO) return { resultado: "sem-fundo-liso", entrada: null };
  if (!transparente) return { resultado: "removido", entrada: { rotulo, retangulo: true } };

  const ligado = new Uint8Array(total);
  const pilha = new Int32Array(total);
  let topo = 0;
  for (const i of borda) {
    if (!ligado[i] && rotulos[i] === rotulo) {
      ligado[i] = 1;
      pilha[topo++] = i;
    }
  }
  while (topo > 0) {
    const i = pilha[--topo];
    const x = i % largura;
    const vizinhos = [x > 0 ? i - 1 : -1, x < largura - 1 ? i + 1 : -1, i - largura, i + largura];
    for (const j of vizinhos) {
      if (j < 0 || j >= total || ligado[j] || rotulos[j] !== rotulo) continue;
      ligado[j] = 1;
      pilha[topo++] = j;
    }
  }
  const interno = cores.length;
  let temInterno = false;
  for (let i = 0; i < total; i++) {
    if (rotulos[i] === rotulo && !ligado[i]) {
      rotulos[i] = interno;
      temInterno = true;
    }
  }
  if (temInterno) cores.push([...cores[rotulo]] as [number, number, number]);
  return { resultado: "removido", entrada: { rotulo, retangulo: false } };
}

/**
 * Troca cada cor do SVG pela cor mais próxima da paleta.
 *
 * O motor pinta cada forma com a média dos pixels dela, e ao juntar uma
 * mancha pequena à vizinha a média mistura as duas: uma letra sai em quatro
 * tons de grafite e um contorno ganha uma lasca bege. Com a paleta, a letra é
 * uma cor só — a que a pessoa escolheu ao pedir N cores.
 */
export function ajustarCoresAPaleta(svg: string, paleta: ReadonlyArray<readonly [number, number, number]>): string {
  if (paleta.length === 0) return svg;
  const centros = paleta.map(([r, g, b]) => srgbParaOklab(r, g, b));
  const hex = paleta.map(([r, g, b]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase());
  const memo = new Map<string, string>();
  return svg.replace(/fill="#([0-9A-Fa-f]{6})"/g, (_, cor: string) => {
    let destino = memo.get(cor);
    if (!destino) {
      const n = parseInt(cor, 16);
      const [L, a, b] = srgbParaOklab((n >> 16) & 255, (n >> 8) & 255, n & 255);
      let melhor = 0;
      let menor = Infinity;
      centros.forEach(([cl, ca, cb], j) => {
        const d = (L - cl) ** 2 + (a - ca) ** 2 + (b - cb) ** 2;
        if (d < menor) {
          menor = d;
          melhor = j;
        }
      });
      destino = hex[melhor];
      memo.set(cor, destino);
    }
    return `fill="${destino}"`;
  });
}

/* -------------------------------------------------------------------------
   SVG
   ------------------------------------------------------------------------- */

/**
 * O documento SVG a partir dos caminhos do motor.
 *
 * O `viewBox` fica na resolução do traçado e `width`/`height` na da imagem
 * original: o arquivo abre com o tamanho da foto em qualquer programa, e as
 * coordenadas continuam com a precisão em que foram traçadas.
 *
 * No traço, `corDoTraco` troca o preto do motor pela cor escolhida.
 */
export function montarSvg(caminhos: string, tracado: Dimensoes, original: Dimensoes, corDoTraco?: string): string {
  let corpo = caminhos.replaceAll(' transform="translate(0,0)"', "");
  if (corDoTraco) corpo = corpo.replaceAll('fill="#000000"', `fill="${corDoTraco}"`);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${original.largura}" height="${original.altura}" ` +
    `viewBox="0 0 ${tracado.largura} ${tracado.altura}">${corpo}</svg>`
  );
}

/** Quantas cores distintas o SVG usa. */
export function contarCores(svg: string): number {
  return new Set(svg.match(/fill="#[0-9A-Fa-f]{6}"/g) ?? []).size;
}

/** Nome do arquivo exportado: o original sem extensão, em .svg. */
export function nomeDoVetor(nomeOriginal: string): string {
  const semExtensao = nomeOriginal.replace(/\.[^./\\]+$/, "");
  const limpo = semExtensao
    .replace(/[\\/:*?"<>|\x00-\x1f]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/^[\s-]+|[\s-]+$/g, "");
  return `${limpo || "imagem"}.svg`;
}

/* -------------------------------------------------------------------------
   Fidelidade
   ------------------------------------------------------------------------- */

/** Lado maior das amostras comparadas na medida de fidelidade. */
export const LADO_DA_AMOSTRA = 384;

/**
 * Diferença, em ΔE OKLab, até a qual um pixel conta como reproduzido: uma vez
 * e meia o limiar de percepção lado a lado (~0,02).
 *
 * Calibrado para a nota acompanhar o que se vê. Com 0,05, uma foto reduzida a
 * 8 cores, com faixas evidentes, marcava 93%; com 0,03 marca 78%, a mesma foto
 * em 48 cores 94%, e um logo ou um traço fiéis continuam acima de 98%.
 */
export const TOLERANCIA_DE_FIDELIDADE = 0.03;

/**
 * Fração dos pixels relevantes em que o SVG desenhado reproduz a referência.
 *
 * Relevante é o pixel que é opaco em pelo menos uma das duas: fundo
 * transparente dos dois lados não conta como acerto, senão um logo pequeno
 * numa tela vazia pontuaria 99% com qualquer desenho.
 *
 * Um pixel conta como reproduzido se, nos dois sentidos, a cor dele — e a
 * opacidade — aparece no outro lado nele ou num vizinho imediato: o que a
 * referência tem precisa estar no SVG, e o que o SVG desenhou precisa estar
 * na referência. Só num sentido, uma forma inventada pelo SVG sobre o fundo
 * transparente passaria, porque o vizinho dela na referência também é
 * transparente. A tolerância de um pixel na
 * amostra de 384 px é para o contorno: o traçado põe a borda no meio da faixa
 * de antisserrilhado, e numa moldura fina de 2 px, meio pixel de diferença
 * sem essa folga derrubava a nota de um desenho idêntico à vista para 50%.
 */
export function fidelidade(
  referencia: Uint8ClampedArray | Uint8Array,
  vetor: Uint8ClampedArray | Uint8Array,
  { largura, altura }: Dimensoes
): number {
  if (referencia.length !== vetor.length || referencia.length !== largura * altura * 4) {
    throw new RangeError("Amostras e dimensões não batem");
  }
  const total = largura * altura;
  const lab = (px: Uint8ClampedArray | Uint8Array) => {
    const saida = new Float32Array(total * 3);
    for (let i = 0; i < total; i++) {
      const [L, a, b] = srgbParaOklab(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
      saida[i * 3] = L;
      saida[i * 3 + 1] = a;
      saida[i * 3 + 2] = b;
    }
    return saida;
  };
  const labRef = lab(referencia);
  const labVet = lab(vetor);
  const tolerancia2 = TOLERANCIA_DE_FIDELIDADE * TOLERANCIA_DE_FIDELIDADE;

  /** Se o pixel `i` de `a` aparece em `b`, nele ou num vizinho. */
  const coberto = (
    a: Uint8ClampedArray | Uint8Array,
    labA: Float32Array,
    b: Uint8ClampedArray | Uint8Array,
    labB: Float32Array,
    x: number,
    y: number
  ) => {
    const i = y * largura + x;
    const opaca = a[i * 4 + 3] >= 128;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= altura) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        if (xx < 0 || xx >= largura) continue;
        const j = yy * largura + xx;
        if (b[j * 4 + 3] >= 128 !== opaca) continue;
        if (!opaca) return true;
        const dl = labA[i * 3] - labB[j * 3];
        const da = labA[i * 3 + 1] - labB[j * 3 + 1];
        const db = labA[i * 3 + 2] - labB[j * 3 + 2];
        if (dl * dl + da * da + db * db <= tolerancia2) return true;
      }
    }
    return false;
  };

  let relevantes = 0;
  let iguais = 0;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      if (referencia[i * 4 + 3] < 128 && vetor[i * 4 + 3] < 128) continue;
      relevantes++;
      if (coberto(referencia, labRef, vetor, labVet, x, y) && coberto(vetor, labVet, referencia, labRef, x, y)) iguais++;
    }
  }
  return relevantes === 0 ? 1 : iguais / relevantes;
}

export function dimensoesDaAmostra(d: Dimensoes): Dimensoes {
  const escala = Math.min(1, LADO_DA_AMOSTRA / Math.max(d.largura, d.altura));
  return { largura: Math.max(1, Math.round(d.largura * escala)), altura: Math.max(1, Math.round(d.altura * escala)) };
}

/* -------------------------------------------------------------------------
   Formatação
   ------------------------------------------------------------------------- */

export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  const mb = bytes / (1024 * 1024);
  return `${(mb < 10 ? mb.toFixed(1) : Math.round(mb).toString()).replace(".", ",")} MB`;
}

export function formatarNumero(n: number): string {
  return n.toLocaleString("pt-BR");
}

export const NOMES_DOS_ESTILOS: Record<Estilo, string> = {
  automatico: "Automático",
  logo: "Logo",
  ilustracao: "Ilustração",
  foto: "Foto",
  traco: "Traço",
};

/* -------------------------------------------------------------------------
   Protocolo entre a página e o worker
   ------------------------------------------------------------------------- */

export type PedidoAoVetorizador =
  | {
      /** Decodifica o arquivo e devolve a imagem na resolução de traçado. */
      tipo: "preparar";
      id: number;
      arquivo: Blob;
    }
  | {
      tipo: "vetorizar";
      id: number;
      modulo: WebAssembly.Module;
      /** Pixels RGBA na resolução de traçado. O worker trabalha numa cópia. */
      pixels: ArrayBuffer;
      tracado: Dimensoes;
      original: Dimensoes;
      ajustes: Ajustes;
      corDoTraco: string;
    };

export type RespostaDoVetorizador =
  | {
      tipo: "preparada";
      id: number;
      original: Dimensoes;
      tracado: Dimensoes;
      pixels: ArrayBuffer;
      previa: Blob;
    }
  | {
      tipo: "pronto";
      id: number;
      svg: string;
      caminhos: number;
      preparacao: Preparacao;
      /** 0 a 1, medida no worker contra a imagem preparada. */
      fidelidade: number;
      duracaoMs: number;
    }
  | {
      /** Passou dos tetos: a página tenta de novo com `simplificar`. */
      tipo: "complexo-demais";
      id: number;
      coresUsadas: number;
    }
  | { tipo: "erro"; id: number; mensagem: string };
