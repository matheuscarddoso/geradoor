import { describe, expect, it } from "vitest";
import {
  distanciaAtePegada,
  elementoDoTraco,
  esmaecerBordasInternas,
  mascaraConfiavel,
  avisoDeRecuo,
  ocultarOQueJaFicou,
  preencherBuracos,
  pegadaNaGrade,
  regiaoDoTraco,
  selecionarElemento,
} from "./pincelMagico";
import type { Traco } from "./pincel";

const traco = (pontos: Array<[number, number]>, raio: number, ferramenta: Traco["ferramenta"] = "restaurar"): Traco => ({
  ferramenta,
  raio,
  pontos: pontos.map(([x, y]) => ({ x, y })),
});

describe("regiaoDoTraco", () => {
  const imagem = { largura: 2000, altura: 1500 };

  it("justa ao traço, com folga de meio traço de cada lado", () => {
    // Traço de 300 × 100 com o raio: folga 150; 300 + 300 = 600 de largura,
    // e a altura sobe para o mínimo de 512.
    const regiao = regiaoDoTraco(traco([[900, 700], [1100, 700]], 50), imagem);
    expect(regiao.largura).toBe(600);
    expect(regiao.altura).toBe(512);
    expect(regiao.x + regiao.largura / 2).toBeCloseTo(1000, 0);
  });

  it("é retangular: traço horizontal não arrasta o céu e o chão", () => {
    const regiao = regiaoDoTraco(traco([[400, 700], [1400, 700]], 40), imagem);
    expect(regiao.largura).toBeGreaterThan(regiao.altura * 2);
  });

  it("traço largo com pincel grande não vira meia foto", () => {
    // O caso que falhava: pincel de raio 145 passado sobre as flores de baixo.
    const foto = { largura: 2000, altura: 1333 };
    const t = traco([[1450, 1060], [1600, 1150], [1750, 1120], [1880, 1230]], 145);
    const regiao = regiaoDoTraco(t, foto);
    const fracao = (regiao.largura * regiao.altura) / (foto.largura * foto.altura);
    expect(fracao).toBeLessThan(0.45);
  });

  it("um toque rápido ainda ganha o lado mínimo, com contexto", () => {
    const regiao = regiaoDoTraco(traco([[1000, 700]], 4), imagem);
    expect(regiao).toMatchObject({ largura: 512, altura: 512 });
  });

  it("desliza para dentro na borda em vez de encolher", () => {
    expect(regiaoDoTraco(traco([[10, 10]], 20), imagem)).toEqual({ x: 0, y: 0, largura: 512, altura: 512 });
    const noCanto = regiaoDoTraco(traco([[1995, 1495]], 20), imagem);
    expect(noCanto.x + noCanto.largura).toBe(2000);
    expect(noCanto.y + noCanto.altura).toBe(1500);
  });

  it("nunca passa do tamanho da imagem", () => {
    expect(regiaoDoTraco(traco([[0, 0], [2000, 1500]], 80), imagem)).toEqual({ x: 0, y: 0, largura: 2000, altura: 1500 });
  });
});

describe("pegadaNaGrade", () => {
  it("marca o círculo do pincel na grade da região, na escala dela", () => {
    // Região de 400 × 400 da imagem, em grade de 100 × 100: escala 1/4.
    const regiao = { x: 100, y: 100, largura: 400, altura: 400 };
    const pegada = pegadaNaGrade(traco([[300, 300]], 40), regiao, { largura: 100, altura: 100 });
    // Centro em (50, 50) na grade, raio 10.
    expect(pegada[50 * 100 + 50]).toBe(1);
    expect(pegada[50 * 100 + 58]).toBe(1);
    expect(pegada[50 * 100 + 62]).toBe(0);
    expect(pegada[0]).toBe(0);
  });
});

describe("selecionarElemento", () => {
  // Grade 20 × 10 com dois elementos: quadrado A em x 2..6 e B em x 12..16.
  const grade = { largura: 20, altura: 10 };
  const mascara = new Uint8Array(200);
  for (let y = 2; y <= 7; y++) {
    for (let x = 2; x <= 6; x++) mascara[y * 20 + x] = 255;
    for (let x = 12; x <= 16; x++) mascara[y * 20 + x] = 255;
    mascara[y * 20 + 7] = 90; // borda suave de A, abaixo do limiar
    mascara[y * 20 + 9] = 90; // pixel solto de alfa longe de A
  }

  const pegadaEm = (x: number, y: number) => {
    const pegada = new Uint8Array(200);
    pegada[y * 20 + x] = 1;
    return pegada;
  };

  it("pega o elemento inteiro a partir de um pixel tocado, e só ele", () => {
    const resultado = selecionarElemento(mascara, grade, pegadaEm(4, 4));
    expect(resultado).not.toBeNull();
    expect(resultado![2 * 20 + 2]).toBe(255);
    expect(resultado![7 * 20 + 6]).toBe(255);
    // B não foi tocado.
    expect(resultado![4 * 20 + 14]).toBe(0);
  });

  it("mantém a borda suave colada ao elemento, com o alfa do modelo", () => {
    const resultado = selecionarElemento(mascara, grade, pegadaEm(4, 4))!;
    expect(resultado[4 * 20 + 7]).toBe(90);
    // O pixel a três de distância não é borda de A.
    expect(resultado[4 * 20 + 9]).toBe(0);
  });

  it("devolve nulo quando o traço só passou pelo fundo", () => {
    expect(selecionarElemento(mascara, grade, pegadaEm(10, 0))).toBeNull();
  });

  it("junta os dois elementos quando o traço tocou os dois", () => {
    const pegada = pegadaEm(4, 4);
    pegada[4 * 20 + 14] = 1;
    const resultado = selecionarElemento(mascara, grade, pegada)!;
    expect(resultado[4 * 20 + 3]).toBe(255);
    expect(resultado[4 * 20 + 15]).toBe(255);
  });

  it("recusa máscara e pegada de tamanhos diferentes da grade", () => {
    expect(() => selecionarElemento(new Uint8Array(10), grade, new Uint8Array(200))).toThrow(RangeError);
  });
});

describe("mascaraConfiavel", () => {
  it("aceita máscara quase binária, como a de um elemento claro", () => {
    const mascara = new Uint8Array(1000);
    mascara.fill(255, 0, 400);
    mascara.fill(120, 400, 420); // 2% de borda suave
    expect(mascaraConfiavel(mascara)).toBe(true);
  });

  it("recusa o cinza granulado de quando o modelo não vê objeto", () => {
    const mascara = Uint8Array.from({ length: 1000 }, (_, i) => 60 + ((i * 37) % 120));
    expect(mascaraConfiavel(mascara)).toBe(false);
  });
});

describe("esmaecerBordasInternas", () => {
  it("esmaece só nas bordas da região que ficam dentro da foto", () => {
    const grade = { largura: 100, altura: 1 };
    const selecao = new Uint8Array(100).fill(255);
    esmaecerBordasInternas(selecao, grade, { esquerda: false, direita: true, topo: false, base: false });
    expect(selecao[0]).toBe(255);
    expect(selecao[50]).toBe(255);
    expect(selecao[99]).toBe(0);
    expect(selecao[97]).toBeGreaterThan(0);
    expect(selecao[97]).toBeLessThan(255);
  });
});

describe("elementoDoTraco", () => {
  // Foto 1000 × 1000; região 500 × 500 a partir de (0, 0), grade 100 × 100.
  const imagem = { largura: 1000, altura: 1000 };
  const regiao = { x: 0, y: 0, largura: 500, altura: 500 };
  const grade = { largura: 100, altura: 100 };
  // Flor: disco de raio 25 centrado em (50, 50) na grade, com miolo escuro
  // (marcado como fundo pelo modelo) de raio 6.
  const mascara = new Uint8Array(100 * 100);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const r = Math.hypot(x - 50, y - 50);
      if (r <= 25 && r > 6) mascara[y * 100 + x] = 255;
    }
  }

  it("traço no miolo escuro ainda acha a flor e seleciona ela inteira", () => {
    // Toque bem no centro, raio de pincel 25 px da foto = 5 na grade: a
    // pegada fica dentro do miolo, e a busca ampliada alcança as pétalas.
    const traco = { ferramenta: "restaurar" as const, raio: 25, pontos: [{ x: 250, y: 250 }] };
    const elemento = elementoDoTraco(mascara, grade, traco, regiao, imagem);
    expect(elemento).not.toBeNull();
    expect(elemento![50 * 100 + 72]).toBe(255);
    expect(elemento![28 * 100 + 50]).toBe(255);
  });

  it("máscara em dúvida não vira seleção, mesmo com alfa sob o traço", () => {
    const granulado = Uint8Array.from({ length: 100 * 100 }, (_, i) => 60 + ((i * 37) % 160));
    const traco = { ferramenta: "restaurar" as const, raio: 25, pontos: [{ x: 250, y: 250 }] };
    expect(elementoDoTraco(granulado, grade, traco, regiao, imagem)).toBeNull();
  });

  it("fragmento do tamanho de ruído não conta como elemento", () => {
    const quase = new Uint8Array(100 * 100);
    quase[50 * 100 + 50] = 255;
    quase[50 * 100 + 51] = 255;
    const traco = { ferramenta: "restaurar" as const, raio: 25, pontos: [{ x: 250, y: 250 }] };
    expect(elementoDoTraco(quase, grade, traco, regiao, imagem)).toBeNull();
  });

  it("não deixa alfa invisível de 1 a 3 no resultado", () => {
    const comPoeira = Uint8Array.from(mascara, (v, i) => (v === 0 && i % 7 === 0 ? 2 : v));
    const traco = { ferramenta: "restaurar" as const, raio: 25, pontos: [{ x: 250, y: 250 }] };
    const elemento = elementoDoTraco(comPoeira, grade, traco, regiao, imagem)!;
    expect(elemento.some((v) => v > 0 && v < 4)).toBe(false);
  });

  it("traço longe de tudo avisa em vez de selecionar", () => {
    const traco = { ferramenta: "restaurar" as const, raio: 10, pontos: [{ x: 20, y: 480 }] };
    expect(elementoDoTraco(mascara, grade, traco, regiao, imagem)).toBeNull();
  });
});

describe("ocultarOQueJaFicou", () => {
  // Região 64 × 64 de fundo verde, com uma "dália" branca já recortada no meio.
  const grade = { largura: 64, altura: 64 };
  const verde = [60, 110, 50];
  function cena() {
    const rgba = new Uint8ClampedArray(64 * 64 * 4);
    const alfa = new Uint8Array(64 * 64);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const i = y * 64 + x;
        const naFlor = x >= 24 && x < 40 && y >= 24 && y < 40;
        rgba.set(naFlor ? [250, 248, 240, 255] : [...verde, 255], i * 4);
        alfa[i] = naFlor ? 255 : 0;
      }
    }
    return { rgba, alfa };
  }

  it("troca o que já está no recorte pelas cores do fundo em volta", () => {
    const { rgba, alfa } = cena();
    ocultarOQueJaFicou(rgba, alfa, grade);
    const centro = Array.from(rgba.subarray((32 * 64 + 32) * 4, (32 * 64 + 32) * 4 + 3));
    for (let c = 0; c < 3; c++) expect(Math.abs(centro[c] - verde[c])).toBeLessThan(6);
  });

  it("não mexe no que é fundo", () => {
    const { rgba, alfa } = cena();
    ocultarOQueJaFicou(rgba, alfa, grade);
    expect(Array.from(rgba.subarray(0, 3))).toEqual(verde);
  });

  it("preenche sem degrau: vizinhos dentro do buraco quase não diferem", () => {
    // Fundo em degradê horizontal de 0 a 255, buraco grande no meio.
    const lado = 128;
    const rgba = new Uint8ClampedArray(lado * lado * 4);
    const peso = new Float32Array(lado * lado).fill(1);
    for (let y = 0; y < lado; y++) {
      for (let x = 0; x < lado; x++) {
        const i = y * lado + x;
        const v = Math.round((x / (lado - 1)) * 255);
        rgba.set([v, v, v, 255], i * 4);
        if (x >= 20 && x < 108 && y >= 20 && y < 108) {
          peso[i] = 0;
          rgba.set([255, 0, 255, 255], i * 4);
        }
      }
    }
    preencherBuracos(rgba, peso, { largura: lado, altura: lado });
    let maiorSalto = 0;
    for (let y = 21; y < 107; y++) {
      for (let x = 21; x < 107; x++) {
        const i = (y * lado + x) * 4;
        maiorSalto = Math.max(maiorSalto, Math.abs(rgba[i] - rgba[i + 4]), Math.abs(rgba[i] - rgba[i + lado * 4]));
        // Nada do magenta de marcação sobrou.
        expect(Math.abs(rgba[i] - rgba[i + 1])).toBeLessThan(40);
      }
    }
    expect(maiorSalto).toBeLessThan(12);
  });

  it("sem nada recortado na região, não muda um pixel", () => {
    const { rgba } = cena();
    const antes = Uint8ClampedArray.from(rgba);
    ocultarOQueJaFicou(rgba, new Uint8Array(64 * 64), grade);
    expect(rgba).toEqual(antes);
  });
});

describe("avisoDeRecuo", () => {
  it("sem elemento, diz que aplicou o pincel comum", () => {
    expect(avisoDeRecuo({ tipo: "sem-elemento" })).toContain("apliquei o pincel comum");
  });

  it("serviço fora ou cota, diz que o mágico não está disponível", () => {
    expect(avisoDeRecuo({ tipo: "falha", falha: { modoLeve: true, aviso: "x" } })).toContain("não está disponível");
  });

  it("ritmo ou imagem, repete o motivo e diz o que foi feito", () => {
    const aviso = avisoDeRecuo({ tipo: "falha", falha: { modoLeve: false, mensagem: "Espere um minuto." } });
    expect(aviso).toMatch(/^Espere um minuto\. .*pincel comum/);
  });
});

describe("distanciaAtePegada", () => {
  it("é zero na pegada e cresce afastando dela, perto da distância euclidiana", () => {
    const grade = { largura: 41, altura: 41 };
    const pegada = new Uint8Array(41 * 41);
    pegada[20 * 41 + 20] = 1;
    const d = distanciaAtePegada(pegada, grade);
    expect(d[20 * 41 + 20]).toBe(0);
    expect(d[20 * 41 + 30]).toBeCloseTo(10, 5);
    // Diagonal: 10√2 ≈ 14,1; a chanfrada 3-4 dá 13,3, dentro de 8%.
    expect(Math.abs(d[30 * 41 + 30] - 10 * Math.SQRT2) / (10 * Math.SQRT2)).toBeLessThan(0.08);
  });
});

