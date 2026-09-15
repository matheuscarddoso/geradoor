import { describe, expect, it } from "vitest";
import {
  AJUSTES_INICIAIS,
  LADO_MAXIMO_DE_TRACADO,
  PIXELS_MAXIMOS_DE_TRACADO,
  ajustarCoresAPaleta,
  ajustesDoEstilo,
  aplicarPaleta,
  binarizar,
  binarizarAlfa,
  contarCores,
  detectarEstilo,
  dimensoesDaAmostra,
  dimensoesDeTracado,
  fidelidade,
  histograma,
  kmeans,
  limiarDeOtsu,
  montarSvg,
  nomeDoVetor,
  normalizarAjustes,
  oklabParaSrgb,
  paletaAutomatica,
  parametrosDoMotor,
  pesosDoMiolo,
  prepararPixels,
  removerFundoLiso,
  simplificar,
  srgbParaOklab,
  validarArquivo,
  type Dimensoes,
} from "./vetorizador";

/** Imagem RGBA preenchida por uma função de (x, y) para [r, g, b, a]. */
function imagem({ largura, altura }: Dimensoes, cor: (x: number, y: number) => [number, number, number, number]) {
  const px = new Uint8ClampedArray(largura * altura * 4);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      px.set(cor(x, y), (y * largura + x) * 4);
    }
  }
  return px;
}

const BRANCO: [number, number, number, number] = [255, 255, 255, 255];
const LARANJA: [number, number, number, number] = [227, 87, 46, 255];
const AZUL: [number, number, number, number] = [26, 190, 187, 255];

/** Logo de teste: fundo branco, círculo laranja, quadrado azul, com antisserrilhado. */
function logo(lado = 120) {
  return imagem({ largura: lado, altura: lado }, (x, y) => {
    const d = Math.hypot(x - lado / 2, y - lado / 2) - lado * 0.3;
    if (x > lado * 0.4 && x < lado * 0.6 && y > lado * 0.4 && y < lado * 0.6) return AZUL;
    if (d < -0.5) return LARANJA;
    if (d > 0.5) return BRANCO;
    // Borda de um pixel misturando laranja e branco.
    const t = d + 0.5;
    return [
      Math.round(LARANJA[0] * (1 - t) + 255 * t),
      Math.round(LARANJA[1] * (1 - t) + 255 * t),
      Math.round(LARANJA[2] * (1 - t) + 255 * t),
      255,
    ];
  });
}

describe("arquivo e tamanhos", () => {
  it("aceita os formatos que o navegador decodifica e recusa o resto", () => {
    expect(validarArquivo({ type: "image/png", size: 10 }).ok).toBe(true);
    expect(validarArquivo({ type: "image/avif", size: 10 }).ok).toBe(true);
    expect(validarArquivo({ type: "image/heic", size: 10 }).ok).toBe(false);
    expect(validarArquivo({ type: "image/svg+xml", size: 10 }).ok).toBe(false);
    expect(validarArquivo({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(validarArquivo({ type: "image/png", size: 81 * 1024 * 1024 }).ok).toBe(false);
  });

  it("reduz a foto grande ao teto de 2 MP sem distorcer", () => {
    const d = dimensoesDeTracado({ largura: 8000, altura: 6000 });
    expect(d.largura * d.altura).toBeLessThanOrEqual(PIXELS_MAXIMOS_DE_TRACADO);
    expect(d.largura / d.altura).toBeCloseTo(8000 / 6000, 2);
  });

  it("respeita o lado máximo mesmo em proporção extrema", () => {
    const d = dimensoesDeTracado({ largura: 10000, altura: 100 });
    expect(d.largura).toBeLessThanOrEqual(LADO_MAXIMO_DE_TRACADO);
  });

  it("nunca amplia: imagem pequena é traçada no tamanho dela", () => {
    expect(dimensoesDeTracado({ largura: 680, altura: 457 })).toEqual({ largura: 680, altura: 457 });
    expect(dimensoesDeTracado({ largura: 64, altura: 64 })).toEqual({ largura: 64, altura: 64 });
  });

  it("deixa como está o que já cabe entre os limites", () => {
    expect(dimensoesDeTracado({ largura: 1200, altura: 900 })).toEqual({ largura: 1200, altura: 900 });
  });

  it("amostra da fidelidade com lado de até 384 px", () => {
    expect(dimensoesDaAmostra({ largura: 1920, altura: 1080 })).toEqual({ largura: 384, altura: 216 });
  });
});

describe("ajustes", () => {
  it("começa no automático, com cores e limiar automáticos", () => {
    expect(AJUSTES_INICIAIS.estilo).toBe("automatico");
    expect(AJUSTES_INICIAIS.cores).toBe("auto");
    expect(AJUSTES_INICIAIS.limiar).toBe("auto");
  });

  it("trocar de estilo mantém o fundo transparente escolhido", () => {
    expect(ajustesDoEstilo("foto", true).fundoTransparente).toBe(true);
  });

  it("normaliza valores fora dos limites em vez de repassar", () => {
    const n = normalizarAjustes({ ...AJUSTES_INICIAIS, cores: 900, detalhe: -5, suavidade: 140.4, limiar: 999 });
    expect(n).toMatchObject({ cores: 64, detalhe: 0, suavidade: 100, limiar: 255 });
  });

  it("simplificar corta cores e detalhe, sem passar do mínimo", () => {
    const s = simplificar({ ...AJUSTES_INICIAIS, cores: 20, detalhe: 60 }, 20);
    expect(s.cores).toBe(10);
    expect(s.detalhe).toBe(25);
    const minimo = simplificar({ ...AJUSTES_INICIAIS, cores: 2, detalhe: 10 }, 2);
    expect(minimo.cores).toBe(2);
    expect(minimo.detalhe).toBe(0);
  });

  it("simplificar parte das cores que o automático usou", () => {
    expect(simplificar(AJUSTES_INICIAIS, 40).cores).toBe(20);
  });
});

describe("parâmetros do motor", () => {
  const tracado = { largura: 1000, altura: 1000 };

  it("suavidade no meio é o padrão do VTracer: canto a 60°", () => {
    expect(parametrosDoMotor({ ...AJUSTES_INICIAIS, suavidade: 50 }, "logo", tracado).anguloDeCanto).toBe(60);
  });

  it("suavidade zero é polígono; o máximo, curva com cantos a 180°", () => {
    expect(parametrosDoMotor({ ...AJUSTES_INICIAIS, suavidade: 0 }, "logo", tracado).modo).toBe("poligono");
    const maxima = parametrosDoMotor({ ...AJUSTES_INICIAIS, suavidade: 100 }, "logo", tracado);
    expect(maxima.modo).toBe("curva");
    expect(maxima.anguloDeCanto).toBe(180);
  });

  it("detalhe máximo mantém manchas de um pixel; menos detalhe descarta manchas maiores", () => {
    expect(parametrosDoMotor({ ...AJUSTES_INICIAIS, detalhe: 100 }, "logo", tracado).ladoDaMancha).toBe(1);
    expect(parametrosDoMotor({ ...AJUSTES_INICIAIS, detalhe: 0 }, "logo", tracado).ladoDaMancha).toBe(12);
  });

  it("a mancha acompanha a resolução do traçado", () => {
    const pequena = parametrosDoMotor({ ...AJUSTES_INICIAIS, detalhe: 0 }, "logo", { largura: 1000, altura: 500 });
    const grande = parametrosDoMotor({ ...AJUSTES_INICIAIS, detalhe: 0 }, "logo", { largura: 2000, altura: 1000 });
    expect(grande.ladoDaMancha).toBe(pequena.ladoDaMancha * 2);
  });

  it("só o traço é binário", () => {
    expect(parametrosDoMotor(AJUSTES_INICIAIS, "traco", tracado).binario).toBe(true);
    expect(parametrosDoMotor(AJUSTES_INICIAIS, "foto", tracado).binario).toBe(false);
  });
});

describe("cor", () => {
  it("OKLab ida e volta preserva a cor", () => {
    for (const [r, g, b] of [
      [0, 0, 0],
      [255, 255, 255],
      [227, 87, 46],
      [26, 190, 187],
      [12, 200, 90],
    ]) {
      const [L, a, bb] = srgbParaOklab(r, g, b);
      const volta = oklabParaSrgb(L, a, bb);
      volta.forEach((v, i) => expect(Math.abs(v - [r, g, b][i])).toBeLessThanOrEqual(1));
    }
  });

  it("branco tem luminosidade 1 e cromaticidade zero", () => {
    const [L, a, b] = srgbParaOklab(255, 255, 255);
    expect(L).toBeCloseTo(1, 3);
    expect(Math.abs(a)).toBeLessThan(1e-3);
    expect(Math.abs(b)).toBeLessThan(1e-3);
  });
});

describe("preparação dos pixels", () => {
  it("alfa vira binário, e o transparente perde a cor", () => {
    const px = new Uint8ClampedArray([10, 20, 30, 60, 10, 20, 30, 200]);
    binarizarAlfa(px);
    expect([...px]).toEqual([0, 0, 0, 0, 10, 20, 30, 255]);
  });

  it("o miolo das formas pesa 1, a borda pesa pouco", () => {
    const px = logo();
    const pesos = pesosDoMiolo(px, { largura: 120, altura: 120 });
    expect(pesos).not.toBeNull();
    // Centro do quadrado azul: miolo.
    expect(pesos![60 * 120 + 60]).toBe(1);
    // Na divisa entre o azul e o laranja: borda.
    expect(pesos![60 * 120 + 48]).toBeLessThan(1);
  });

  it("numa textura sem miolo, os pesos não se aplicam", () => {
    let s = 7;
    const ruido = imagem({ largura: 50, altura: 50 }, () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return [s & 255, (s >> 8) & 255, (s >> 16) & 255, 255];
    });
    expect(pesosDoMiolo(ruido, { largura: 50, altura: 50 })).toBeNull();
  });

  it("a paleta do logo tem as cores dele, e não as do antisserrilhado", () => {
    const px = logo();
    const d = { largura: 120, altura: 120 };
    const h = histograma(px, pesosDoMiolo(px, d) ?? undefined);
    const paleta = paletaAutomatica(h, [2, 16], 0.005);
    const cores = aplicarPaleta(px, h, paleta);
    expect(cores).toHaveLength(3);
    const distancia = (c: number[], alvo: number[]) => Math.max(...c.map((v, i) => Math.abs(v - alvo[i])));
    for (const alvo of [BRANCO, LARANJA, AZUL]) {
      expect(cores.some((c) => distancia(c, alvo) <= 3)).toBe(true);
    }
  });

  it("k-means é determinístico", () => {
    const h = histograma(logo());
    const a = kmeans(h, 3);
    const b = kmeans(h, 3);
    expect([...a.centros]).toEqual([...b.centros]);
  });

  it("detecta logo em cores chapadas e foto em ruído", () => {
    expect(detectarEstilo(histograma(logo()))).toBe("logo");
    let s = 3;
    const ruido = imagem({ largura: 80, altura: 80 }, () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return [s & 255, (s >> 8) & 255, (s >> 16) & 255, 255];
    });
    expect(detectarEstilo(histograma(ruido))).toBe("foto");
  });

  it("Otsu separa tinta escura de papel claro", () => {
    const px = imagem({ largura: 40, altura: 40 }, (x) => (x < 10 ? [30, 30, 30, 255] : [230, 230, 230, 255]));
    const limiar = limiarDeOtsu(px);
    expect(limiar).toBeGreaterThanOrEqual(30);
    expect(limiar).toBeLessThan(230);
    binarizar(px, limiar);
    expect(px[0]).toBe(0);
    expect(px[39 * 4]).toBe(255);
  });
});

describe("fundo liso", () => {
  const d = { largura: 60, altura: 60 };
  /** Branco com um quadrado laranja e, dentro dele, um miolo branco. */
  const comMiolo = () =>
    imagem(d, (x, y) => {
      if (x >= 25 && x < 35 && y >= 25 && y < 35) return BRANCO;
      if (x >= 15 && x < 45 && y >= 15 && y < 45) return LARANJA;
      return BRANCO;
    });

  it("tira o fundo ligado à borda e mantém o branco de dentro do desenho", () => {
    const px = comMiolo();
    expect(removerFundoLiso(px, d)).toBe("removido");
    expect(px[3]).toBe(0);
    expect(px[(30 * 60 + 30) * 4 + 3]).toBe(255);
    expect(px[(20 * 60 + 20) * 4 + 3]).toBe(255);
  });

  it("não mexe quando a borda não é de uma cor só", () => {
    const px = imagem(d, (x) => [x * 4, 100, 200 - x * 3, 255]);
    const antes = new Uint8ClampedArray(px);
    expect(removerFundoLiso(px, d)).toBe("sem-fundo-liso");
    expect(px).toEqual(antes);
  });

  it("reconhece imagem que já tem fundo transparente", () => {
    const px = imagem(d, (x, y) => (x > 20 && x < 40 && y > 20 && y < 40 ? LARANJA : [0, 0, 0, 0]));
    expect(removerFundoLiso(px, d)).toBe("ja-transparente");
  });

  it("na preparação, a referência também perde o fundo que o traçado perdeu", () => {
    const px = comMiolo();
    let referencia: Uint8ClampedArray | null = null;
    const r = prepararPixels(px, d, { ...ajustesDoEstilo("logo"), fundoTransparente: true }, (p) => (referencia = p));
    expect(r.fundo).toBe("removido");
    expect(referencia![3]).toBe(0);
    expect(referencia![(20 * 60 + 20) * 4 + 3]).toBe(255);
  });
});

describe("preparação completa", () => {
  it("no traço, a referência é só a tinta, sobre transparente", () => {
    const d = { largura: 40, altura: 40 };
    const px = imagem(d, (x) => (x < 10 ? [0, 0, 0, 255] : BRANCO));
    let referencia: Uint8ClampedArray | null = null;
    const r = prepararPixels(px, d, ajustesDoEstilo("traco"), (p) => (referencia = p));
    expect(r.estilo).toBe("traco");
    expect(r.paleta).toEqual([]);
    expect(referencia![3]).toBe(255);
    expect(referencia![39 * 4 + 3]).toBe(0);
  });

  it("no automático, decide o estilo e usa só as cores da paleta", () => {
    const d = { largura: 120, altura: 120 };
    const px = logo();
    const r = prepararPixels(px, d, AJUSTES_INICIAIS);
    expect(r.estilo).toBe("logo");
    const usadas = new Set<string>();
    for (let p = 0; p < px.length; p += 4) usadas.add(`${px[p]},${px[p + 1]},${px[p + 2]}`);
    expect(usadas.size).toBe(r.coresUsadas);
  });

  it("número de cores fixo é respeitado", () => {
    const r = prepararPixels(logo(), { largura: 120, altura: 120 }, { ...ajustesDoEstilo("ilustracao"), cores: 2 });
    expect(r.coresUsadas).toBe(2);
  });
});

describe("SVG", () => {
  it("monta o documento com o tamanho original e o viewBox do traçado", () => {
    const svg = montarSvg('<path d="M0 0" fill="#000000" transform="translate(0,0)"/>', { largura: 100, altura: 50 }, { largura: 400, altura: 200 });
    expect(svg).toBe('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 100 50"><path d="M0 0" fill="#000000"/></svg>');
  });

  it("no traço, troca o preto pela cor escolhida", () => {
    const svg = montarSvg('<path d="M0 0" fill="#000000"/>', { largura: 1, altura: 1 }, { largura: 1, altura: 1 }, "#ff0066");
    expect(svg).toContain('fill="#ff0066"');
  });

  it("encaixa as cores misturadas pelo motor na paleta", () => {
    const svg = '<svg><path fill="#383233"/><path fill="#3D3434"/><path fill="#E3572E"/><path fill="#BC9B88"/></svg>';
    const ajustado = ajustarCoresAPaleta(svg, [
      [56, 50, 51],
      [227, 87, 46],
      [255, 255, 255],
    ]);
    // Os grafites viram o grafite da paleta; o bege, a cor mais próxima dele.
    const cores = ajustado.match(/#[0-9A-F]{6}/g) ?? [];
    expect(cores.every((c) => ["#383233", "#E3572E", "#FFFFFF"].includes(c))).toBe(true);
    expect(contarCores(ajustado)).toBe(2);
  });

  it("paleta vazia deixa o SVG como está", () => {
    expect(ajustarCoresAPaleta('<path fill="#123456"/>', [])).toBe('<path fill="#123456"/>');
  });

  it("nome do arquivo em .svg, sem caracteres que o sistema recusa", () => {
    expect(nomeDoVetor("logo final.png")).toBe("logo final.svg");
    expect(nomeDoVetor("a/b:c*.jpeg")).toBe("a-b-c.svg");
    expect(nomeDoVetor(".png")).toBe("imagem.svg");
  });
});

describe("fidelidade", () => {
  const d = { largura: 20, altura: 20 };

  it("é 1 para amostras iguais", () => {
    const a = logo(20);
    expect(fidelidade(a, new Uint8ClampedArray(a), d)).toBe(1);
  });

  it("tolera o contorno deslocado em um pixel", () => {
    const a = imagem(d, (x) => (x < 10 ? LARANJA : BRANCO));
    const b = imagem(d, (x) => (x < 11 ? LARANJA : BRANCO));
    expect(fidelidade(a, b, d)).toBe(1);
  });

  it("acusa uma região inteira com a cor errada", () => {
    const a = imagem(d, (x) => (x < 10 ? LARANJA : BRANCO));
    const b = imagem(d, (x) => (x < 10 ? AZUL : BRANCO));
    expect(fidelidade(a, b, d)).toBeLessThan(0.6);
  });

  it("fundo transparente dos dois lados não conta como acerto", () => {
    const a = imagem(d, (x, y) => (x === 5 && y === 5 ? LARANJA : [0, 0, 0, 0]));
    const b = imagem(d, (x, y) => (x === 15 && y === 15 ? LARANJA : [0, 0, 0, 0]));
    expect(fidelidade(a, b, d)).toBe(0);
  });

  it("recusa amostras de tamanhos diferentes", () => {
    expect(() => fidelidade(new Uint8ClampedArray(4), new Uint8ClampedArray(8), { largura: 1, altura: 1 })).toThrow(RangeError);
  });
});
