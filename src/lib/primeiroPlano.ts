/**
 * Estimativa da cor do primeiro plano nas bordas semitransparentes.
 *
 * O problema: um fio de cabelo ocupa só parte do pixel, e a câmera registra a
 * mistura `I = α·F + (1 − α)·B` — a cor do fio (F) com a do fundo (B). A
 * máscara acerta o α, mas a cor que fica no pixel ainda é a mistura. Sobre um
 * fundo novo, o cinza do estúdio que veio junto aparece como halo em volta do
 * cabelo. Medido num recorte real: 41% dos pixels semitransparentes do topo
 * da cabeça tinham a cor do fundo.
 *
 * A correção é o Blur-Fusion (Forte e Pitié, "Approximate Fast Foreground
 * Colour Estimation", ICIP 2021): estima F e B locais por médias ponderadas
 * pelo α e resolve a equação da mistura para F. Duas passadas, uma larga para
 * achar a cor de fundo e uma estreita para o detalhe.
 *
 * Por memória, as médias são calculadas numa grade de no máximo 1024 px — elas
 * variam devagar por construção — e só a fórmula final corre na resolução
 * cheia, lendo e escrevendo direto no buffer RGBA que já existe. Numa foto de
 * 12 MP isso é a diferença entre uns 60 MB e quase 900 MB.
 */

import { mediaEmCaixa, redimensionarPlano, type Dimensoes } from "./removedorDeFundo";

/** Lado maior da grade das médias. */
const LADO_DA_GRADE = 1024;

/** Alfa a partir do qual o pixel é tratado como opaco, e até onde como vazio. */
const QUASE_OPACO = 250;
const QUASE_VAZIO = 3;

const EPSILON = 1e-5;

/** Reduz um plano por média de área, sem aliasing, para a grade. */
function reduzirPorArea(origem: ArrayLike<number>, de: Dimensoes, para: Dimensoes, passo = 1, canal = 0): Float32Array {
  const destino = new Float32Array(para.largura * para.altura);
  for (let y = 0; y < para.altura; y++) {
    const ya = Math.floor((y * de.altura) / para.altura);
    const yb = Math.max(ya + 1, Math.floor(((y + 1) * de.altura) / para.altura));
    for (let x = 0; x < para.largura; x++) {
      const xa = Math.floor((x * de.largura) / para.largura);
      const xb = Math.max(xa + 1, Math.floor(((x + 1) * de.largura) / para.largura));
      let soma = 0;
      for (let yy = ya; yy < yb; yy++) {
        const linha = yy * de.largura;
        for (let xx = xa; xx < xb; xx++) soma += origem[(linha + xx) * passo + canal];
      }
      destino[y * para.largura + x] = soma / ((yb - ya) * (xb - xa));
    }
  }
  return destino;
}

interface Estimativa {
  /** Primeiro plano estimado, três planos. */
  frente: [Float32Array, Float32Array, Float32Array];
  /** Média local do primeiro plano, três planos. */
  mediaFrente: [Float32Array, Float32Array, Float32Array];
  /** Média local do fundo, três planos. */
  mediaFundo: [Float32Array, Float32Array, Float32Array];
}

/**
 * Uma passada do Blur-Fusion na grade. Tudo entre 0 e 1.
 *
 * `frente` e `fundo` são as estimativas da passada anterior (na primeira, a
 * própria imagem); a média de cada uma é ponderada pelo α ou pelo 1 − α, para
 * a cor do fundo não vazar para a estimativa do fio e vice-versa.
 */
function passada(
  imagem: Float32Array[],
  frente: Float32Array[],
  fundo: Float32Array[],
  alfa: Float32Array,
  grade: Dimensoes,
  raio: number
): Estimativa {
  const n = alfa.length;
  const mediaAlfa = mediaEmCaixa(alfa, grade, raio);
  const ponderado = new Float32Array(n);

  const mediaFrente = [0, 1, 2].map((c) => {
    for (let i = 0; i < n; i++) ponderado[i] = frente[c][i] * alfa[i];
    const media = mediaEmCaixa(ponderado, grade, raio);
    for (let i = 0; i < n; i++) media[i] /= mediaAlfa[i] + EPSILON;
    return media;
  }) as Estimativa["mediaFrente"];

  const mediaFundo = [0, 1, 2].map((c) => {
    for (let i = 0; i < n; i++) ponderado[i] = fundo[c][i] * (1 - alfa[i]);
    const media = mediaEmCaixa(ponderado, grade, raio);
    for (let i = 0; i < n; i++) media[i] /= 1 - mediaAlfa[i] + EPSILON;
    return media;
  }) as Estimativa["mediaFundo"];

  const novaFrente = [0, 1, 2].map((c) => {
    const f = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = alfa[i];
      const v = mediaFrente[c][i] + a * (imagem[c][i] - a * mediaFrente[c][i] - (1 - a) * mediaFundo[c][i]);
      f[i] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
    return f;
  }) as Estimativa["frente"];

  return { frente: novaFrente, mediaFrente, mediaFundo };
}

/**
 * Corrige, no próprio buffer, a cor dos pixels semitransparentes e grava o
 * alfa da máscara.
 *
 * `rgba` é a foto original em resolução cheia; `alfa` é a máscara no mesmo
 * tamanho, um byte por pixel. Pixels opacos e vazios não mudam de cor — só as
 * bordas, que é onde a mistura com o fundo existe.
 */
export function aplicarMascaraComCorDaFrente(
  rgba: Uint8ClampedArray,
  alfa: ArrayLike<number>,
  dimensoes: Dimensoes
): void {
  const { largura, altura } = dimensoes;
  const total = largura * altura;
  if (rgba.length !== total * 4 || alfa.length !== total) {
    throw new RangeError("Buffers e dimensões não batem");
  }

  const escala = Math.min(1, LADO_DA_GRADE / Math.max(largura, altura));
  const grade = {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };

  // Imagem e alfa na grade, entre 0 e 1.
  const imagem = [0, 1, 2].map((c) => {
    const plano = reduzirPorArea(rgba, dimensoes, grade, 4, c);
    for (let i = 0; i < plano.length; i++) plano[i] /= 255;
    return plano;
  });
  const alfaNaGrade = reduzirPorArea(alfa, dimensoes, grade);
  for (let i = 0; i < alfaNaGrade.length; i++) alfaNaGrade[i] /= 255;

  // Raios proporcionais ao tamanho da grade: os 90 e 6 px do artigo são para
  // imagens na casa dos 1000 px, que é o tamanho da grade.
  const ladoMaior = Math.max(grade.largura, grade.altura);
  const raioLargo = Math.max(2, Math.round(ladoMaior / 12));
  const raioEstreito = Math.max(1, Math.round(ladoMaior / 170));

  const primeira = passada(imagem, imagem, imagem, alfaNaGrade, grade, raioLargo);
  const segunda = passada(imagem, primeira.frente, primeira.mediaFundo, alfaNaGrade, grade, raioEstreito);

  // As médias da segunda passada, ampliadas para a resolução cheia sob
  // demanda: amostradas por pixel de borda, sem alocar planos do tamanho da foto.
  const escalaX = grade.largura / largura;
  const escalaY = grade.altura / altura;
  const amostrar = (plano: Float32Array, x: number, y: number) => {
    const gx = Math.min(grade.largura - 1, Math.max(0, (x + 0.5) * escalaX - 0.5));
    const gy = Math.min(grade.altura - 1, Math.max(0, (y + 0.5) * escalaY - 0.5));
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const x1 = Math.min(grade.largura - 1, x0 + 1);
    const y1 = Math.min(grade.altura - 1, y0 + 1);
    const fx = gx - x0;
    const fy = gy - y0;
    const cima = plano[y0 * grade.largura + x0] * (1 - fx) + plano[y0 * grade.largura + x1] * fx;
    const baixo = plano[y1 * grade.largura + x0] * (1 - fx) + plano[y1 * grade.largura + x1] * fx;
    return cima * (1 - fy) + baixo * fy;
  };

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      const p = i * 4;
      const bruto = alfa[i];

      // O que é quase opaco vira opaco, e o que é quase vazio vira vazio: um
      // alfa de 254 no corpo inteiro não aparece na tela, mas faz o PNG sair
      // translúcido para quem abre num editor.
      if (bruto >= QUASE_OPACO) {
        rgba[p + 3] = 255;
        continue;
      }
      if (bruto <= QUASE_VAZIO) {
        rgba[p + 3] = 0;
        continue;
      }

      const a = bruto / 255;
      for (let c = 0; c < 3; c++) {
        const mediaF = amostrar(segunda.mediaFrente[c], x, y);
        const mediaB = amostrar(segunda.mediaFundo[c], x, y);
        const cor = rgba[p + c] / 255;
        const frente = mediaF + a * (cor - a * mediaF - (1 - a) * mediaB);
        rgba[p + c] = Math.round((frente < 0 ? 0 : frente > 1 ? 1 : frente) * 255);
      }
      rgba[p + 3] = bruto;
    }
  }
}
