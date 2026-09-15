/**
 * O traçado de precisão contra geometria conhecida.
 *
 * As imagens são rasterizadas aqui mesmo, com 8 × 8 amostras por pixel — o
 * antisserrilhado de qualquer renderizador —, a partir de formas cuja posição
 * exata se sabe. O SVG que sai tem de reproduzir essa posição, e não o degrau
 * dos pixels.
 */
import { describe, expect, it } from "vitest";
import {
  absorverManchas,
  ampliarRegiao,
  curvasDeNivel,
  tracarPreciso,
  type EntradaDoTracado,
} from "./tracadoPreciso";
import { ajustesDoEstilo, prepararPixels, type Dimensoes } from "./vetorizador";

type Cor = [number, number, number];

/** Imagem RGBA com cada pixel coberto pela fração de amostras dentro da forma. */
function rasterizar({ largura, altura }: Dimensoes, formas: Array<{ dentro: (x: number, y: number) => boolean; cor: Cor }>, fundo: Cor) {
  const px = new Uint8ClampedArray(largura * altura * 4);
  const N = 8;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const soma = [0, 0, 0];
      for (let sy = 0; sy < N; sy++) {
        for (let sx = 0; sx < N; sx++) {
          const qx = x + (sx + 0.5) / N;
          const qy = y + (sy + 0.5) / N;
          let cor = fundo;
          for (const f of formas) if (f.dentro(qx, qy)) cor = f.cor;
          soma[0] += cor[0];
          soma[1] += cor[1];
          soma[2] += cor[2];
        }
      }
      const p = (y * largura + x) * 4;
      px[p] = Math.round(soma[0] / (N * N));
      px[p + 1] = Math.round(soma[1] / (N * N));
      px[p + 2] = Math.round(soma[2] / (N * N));
      px[p + 3] = 255;
    }
  }
  return px;
}

const PRETO: Cor = [17, 17, 17];
const CREME: Cor = [241, 238, 227];

function poligono(pontos: Array<[number, number]>) {
  return (x: number, y: number) => {
    let dentro = false;
    for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i++) {
      const [xi, yi] = pontos[i];
      const [xj, yj] = pontos[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
    }
    return dentro;
  };
}

/** Traça uma imagem de logo inteira e devolve os `d` dos caminhos desenhados. */
function tracar(d: Dimensoes, px: Uint8ClampedArray, suavidade = 0.5) {
  const preparacao = prepararPixels(px, d, ajustesDoEstilo("logo"));
  expect(preparacao.entrada).toBeDefined();
  // Ampliação padrão: o mesmo caminho que a página usa.
  const { elementos, formas } = tracarPreciso(preparacao.entrada as EntradaDoTracado, { areaMinima: 4, suavidade });
  const caminhos = [...elementos.matchAll(/ d="([^"]*)"/g)].map((m) => m[1]);
  return { elementos, formas, caminhos, preparacao };
}

/** Os vértices (fins de L e C) de um caminho, em ordem. */
function vertices(d: string): Array<[number, number]> {
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const saida: Array<[number, number]> = [];
  let i = 0;
  for (const cmd of d.match(/[MLCZ]/g) ?? []) {
    if (cmd === "M" || cmd === "L") {
      saida.push([nums[i], nums[i + 1]]);
      i += 2;
    } else if (cmd === "C") {
      saida.push([nums[i + 4], nums[i + 5]]);
      i += 6;
    }
  }
  return saida;
}

const perto = (a: [number, number], b: [number, number], tolerancia: number) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]) <= tolerancia;

describe("curvas de nível", () => {
  it("um quadrado dá um contorno fechado; um anel, dois", () => {
    const d = { largura: 12, altura: 12 };
    const quadrado = new Float32Array(144);
    for (let y = 3; y < 9; y++) for (let x = 3; x < 9; x++) quadrado[y * 12 + x] = 1;
    expect(curvasDeNivel(quadrado, d)).toHaveLength(1);
    const anel = new Float32Array(quadrado);
    for (let y = 5; y < 7; y++) for (let x = 5; x < 7; x++) anel[y * 12 + x] = 0;
    expect(curvasDeNivel(anel, d)).toHaveLength(2);
  });

  it("a borda passa onde a cobertura cruza a metade, entre os centros dos pixels", () => {
    const d = { largura: 6, altura: 6 };
    const campo = new Float32Array(36);
    for (let y = 0; y < 6; y++) {
      campo[y * 6 + 2] = 1;
      campo[y * 6 + 3] = 0.25;
    }
    const [curva] = curvasDeNivel(campo, d);
    const xs = new Set<number>();
    for (let i = 0; i < curva.length; i += 2) if (curva[i + 1] > 0.6 && curva[i + 1] < 5.4) xs.add(Math.round(curva[i] * 100) / 100);
    // À direita: entre o centro de x=2 (2,5, valor 1) e o de x=3 (3,5, valor 0,25).
    expect([...xs].some((x) => Math.abs(x - (2.5 + 0.5 / 0.75)) < 0.01)).toBe(true);
  });
});

describe("ampliação do campo", () => {
  it("reconstrói o pico de um traço de 1 px dividido entre duas fileiras", () => {
    const d = { largura: 8, altura: 8 };
    const campo = new Float32Array(64);
    for (let x = 1; x < 7; x++) {
      campo[3 * 8 + x] = 0.48;
      campo[4 * 8 + x] = 0.5;
    }
    const { campo: ampliado, dimensoes } = ampliarRegiao(campo, d, { x0: 1, y0: 3, x1: 6, y1: 4 }, 3);
    let maximo = 0;
    for (let i = 0; i < ampliado.length; i++) maximo = Math.max(maximo, ampliado[i]);
    expect(maximo).toBeGreaterThan(0.5);
    expect(dimensoes.largura).toBe((6 + 4) * 3);
  });
});

describe("manchas", () => {
  it("absorve a mancha pequena e mantém a forma maior, mesmo com buraco", () => {
    const w = 10;
    const mapa = ["..........", "..####....", ".##..##...", ".##..##..#", "..####....", ".........."];
    const rotulos = new Int16Array(w * mapa.length);
    mapa.forEach((l, y) => [...l].forEach((c, x) => (rotulos[y * w + x] = c === "#" ? 1 : 0)));
    absorverManchas(rotulos, { largura: w, altura: mapa.length }, 4);
    expect(rotulos[3 * w + 9]).toBe(0);
    expect(rotulos[1 * w + 2]).toBe(1);
    expect(rotulos[2 * w + 3]).toBe(0);
  });
});

describe("retas e cantos", () => {
  // Tolerância de 0,2 px: numa borda alinhada ao eixo, a cobertura é a mesma em
  // toda a aresta, e a interpolação entre centros de pixel desloca a reta
  // inteira de até ~0,15 px. Numa borda inclinada o erro varia e se compensa
  // no ajuste da reta.
  it("um retângulo de bordas fracionárias sai com os quatro cantos no lugar, só com retas", () => {
    const d = { largura: 80, altura: 60 };
    const px = rasterizar(d, [{ dentro: (x, y) => x >= 20.3 && x <= 61.7 && y >= 14.6 && y <= 45.2, cor: PRETO }], CREME);
    const { caminhos } = tracar(d, px);
    expect(caminhos).toHaveLength(1);
    expect(caminhos[0]).not.toContain("C");
    const vs = vertices(caminhos[0]);
    for (const canto of [[20.3, 14.6], [61.7, 14.6], [61.7, 45.2], [20.3, 45.2]] as Array<[number, number]>) {
      expect(vs.some((v) => perto(v, canto, 0.2))).toBe(true);
    }
  });

  it("um paralelogramo com cantos agudos sai com quatro retas e cantos na interseção", () => {
    const d = { largura: 120, altura: 90 };
    const cantos: Array<[number, number]> = [[20, 80], [70, 15], [98, 15], [48, 80]];
    const px = rasterizar(d, [{ dentro: poligono(cantos), cor: PRETO }], CREME);
    const { caminhos } = tracar(d, px);
    expect(caminhos[0].match(/L/g)?.length).toBeGreaterThanOrEqual(3);
    expect(caminhos[0]).not.toContain("C");
    const vs = vertices(caminhos[0]);
    for (const canto of cantos) expect(vs.some((v) => perto(v, canto, 0.25))).toBe(true);
  });

  it("uma haste de 3 px continua com as duas pontas retas, sem sumir", () => {
    const d = { largura: 40, altura: 40 };
    const px = rasterizar(d, [{ dentro: (x, y) => x >= 18 && x <= 21 && y >= 8 && y <= 32, cor: PRETO }], CREME);
    const { caminhos } = tracar(d, px);
    expect(caminhos).toHaveLength(1);
    const vs = vertices(caminhos[0]);
    for (const canto of [[18, 8], [21, 8], [21, 32], [18, 32]] as Array<[number, number]>) {
      expect(vs.some((v) => perto(v, canto, 0.2))).toBe(true);
    }
  });
});

describe("curvas", () => {
  it("um círculo sai só com curvas, rente ao raio", () => {
    const d = { largura: 80, altura: 80 };
    const px = rasterizar(d, [{ dentro: (x, y) => Math.hypot(x - 40.2, y - 39.7) <= 25, cor: PRETO }], CREME);
    const { caminhos } = tracar(d, px);
    expect(caminhos).toHaveLength(1);
    expect(caminhos[0]).not.toContain("L");
    for (const v of vertices(caminhos[0])) expect(Math.abs(Math.hypot(v[0] - 40.2, v[1] - 39.7) - 25)).toBeLessThan(0.3);
  });

  it("um traço de ponta redonda sai com retas nas laterais e curva nas pontas", () => {
    const d = { largura: 40, altura: 100 };
    const dentro = (x: number, y: number) => {
      const yy = Math.min(80, Math.max(20, y));
      return Math.hypot(x - 20, y - yy) <= 3.5;
    };
    const px = rasterizar(d, [{ dentro, cor: PRETO }], CREME);
    const { caminhos } = tracar(d, px);
    expect(caminhos).toHaveLength(1);
    expect(caminhos[0].match(/L/g)).toHaveLength(2);
    expect(caminhos[0]).toContain("C");
    // As laterais passam a 3,5 px do eixo.
    const laterais = vertices(caminhos[0]).filter((v) => v[1] > 25 && v[1] < 75);
    for (const v of laterais) expect(Math.abs(Math.abs(v[0] - 20) - 3.5)).toBeLessThan(0.2);
  });
});

describe("texto pequeno", () => {
  it("um O de traço fino continua fechado: contorno de fora e furo", () => {
    const d = { largura: 30, altura: 30 };
    const dentro = (x: number, y: number) => {
      const r = Math.hypot((x - 15) / 1.0, (y - 15) / 1.2);
      return r <= 5 && r >= 3.9;
    };
    const px = rasterizar(d, [{ dentro, cor: PRETO }], [255, 204, 0]);
    const { formas, caminhos } = tracar(d, px);
    expect(caminhos).toHaveLength(1);
    expect(formas).toBe(2);
  });
});

describe("paleta do traçado", () => {
  it("o antisserrilhado de um texto não vira cor: duas cores, não cinco", () => {
    const d = { largura: 120, altura: 40 };
    const hastes = Array.from({ length: 14 }, (_, k) => ({
      dentro: (x: number, y: number) => x >= 6 + k * 8.3 && x <= 7.6 + k * 8.3 && y >= 10.3 && y <= 29.6,
      cor: PRETO,
    }));
    const px = rasterizar(d, hastes, [255, 204, 0]);
    const { preparacao } = tracar(d, px);
    expect(preparacao.coresUsadas).toBe(2);
  });

  it("pixel de borda entre marinho e branco nunca recebe a cor de outra forma", () => {
    const d = { largura: 100, altura: 60 };
    const px = rasterizar(
      d,
      [
        { dentro: (x, y) => Math.hypot(x - 30, y - 30) <= 18, cor: [17, 34, 51] },
        { dentro: (x, y) => x >= 60 && x <= 92 && y >= 12 && y <= 48, cor: [29, 190, 187] },
      ],
      [255, 255, 255]
    );
    const { preparacao, formas } = tracar(d, px);
    const { rotulos, cores } = preparacao.entrada as EntradaDoTracado;
    const piscina = cores.findIndex((c) => c[1] > 150 && c[0] < 100);
    for (let y = 8; y < 52; y++) for (let x = 8; x < 52; x++) expect(rotulos[y * 100 + x]).not.toBe(piscina);
    expect(formas).toBe(2);
  });
});

describe("fundo", () => {
  it("com fundo transparente, o miolo cercado de fundo vira desenho da mesma cor", () => {
    const d = { largura: 60, altura: 60 };
    const px = rasterizar(
      d,
      [
        { dentro: (x, y) => x >= 15 && x <= 45 && y >= 15 && y <= 45, cor: PRETO },
        { dentro: (x, y) => x >= 25 && x <= 35 && y >= 25 && y <= 35, cor: CREME },
      ],
      CREME
    );
    const preparacao = prepararPixels(px, d, { ...ajustesDoEstilo("logo"), fundoTransparente: true });
    const entrada = preparacao.entrada as EntradaDoTracado;
    expect(entrada.fundo?.retangulo).toBe(false);
    expect(entrada.rotulos[30 * 60 + 30]).not.toBe(entrada.fundo?.rotulo);
    const { elementos } = tracarPreciso(entrada, { areaMinima: 4, suavidade: 0.5, ampliacao: 1 });
    expect(elementos).not.toContain("<rect");
    expect(elementos.match(/<path/g)).toHaveLength(2);
  });

  it("sem fundo transparente, o fundo é um retângulo e os buracos mostram ele", () => {
    const d = { largura: 60, altura: 60 };
    const px = rasterizar(d, [{ dentro: (x, y) => Math.hypot(x - 30, y - 30) <= 20, cor: PRETO }], CREME);
    const { elementos } = tracar(d, px);
    expect(elementos.startsWith('<rect width="60" height="60"')).toBe(true);
  });
});
