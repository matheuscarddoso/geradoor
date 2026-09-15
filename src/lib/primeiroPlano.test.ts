import { describe, expect, it } from "vitest";
import { aplicarMascaraComCorDaFrente } from "./primeiroPlano";

/**
 * Cena sintética com resposta conhecida: metade esquerda é "cabelo" vermelho
 * opaco, metade direita é fundo azul, e uma faixa fina no meio é borda
 * semitransparente onde a câmera registrou a mistura dos dois.
 *
 * A proporção importa: a faixa tem 2 px numa imagem de 1020, como um fio numa
 * foto. O método estima as cores pela vizinhança, e uma borda quase do tamanho
 * da janela de média não é o caso que ele resolve — nem o que existe em foto.
 */
const BORDA_INICIO = 500;
const BORDA_FIM = 502;

function cena(largura = 1020, altura = 48, alfaDaBorda = 128) {
  const rgba = new Uint8ClampedArray(largura * altura * 4);
  const alfa = new Uint8Array(largura * altura);
  const vermelho = [220, 40, 30];
  const azul = [40, 80, 230];
  const a = alfaDaBorda / 255;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      const regiao = x < BORDA_INICIO ? "frente" : x < BORDA_FIM ? "borda" : "fundo";
      const cor =
        regiao === "frente"
          ? vermelho
          : regiao === "fundo"
            ? azul
            : vermelho.map((v, c) => a * v + (1 - a) * azul[c]);
      rgba.set([...cor, 255], i * 4);
      alfa[i] = regiao === "frente" ? 255 : regiao === "fundo" ? 0 : alfaDaBorda;
    }
  }
  return { rgba, alfa, dimensoes: { largura, altura }, vermelho, azul };
}

const pixel = (rgba: Uint8ClampedArray, largura: number, x: number, y: number) =>
  Array.from(rgba.subarray((y * largura + x) * 4, (y * largura + x) * 4 + 4));

describe("aplicarMascaraComCorDaFrente", () => {
  it("tira o fundo da cor da borda: a mistura volta para perto do vermelho", () => {
    const { rgba, alfa, dimensoes, vermelho, azul } = cena();
    const antes = pixel(rgba, dimensoes.largura, BORDA_INICIO, 24);
    aplicarMascaraComCorDaFrente(rgba, alfa, dimensoes);
    const depois = pixel(rgba, dimensoes.largura, BORDA_INICIO, 24);

    const distancia = (cor: number[], alvo: number[]) =>
      Math.hypot(cor[0] - alvo[0], cor[1] - alvo[1], cor[2] - alvo[2]);

    // Antes a borda estava a meio caminho do azul; depois fica bem mais perto
    // do vermelho do que estava, e o azul do fundo sai do canal B.
    expect(distancia(depois, vermelho)).toBeLessThan(distancia(antes, vermelho) / 3);
    expect(depois[2]).toBeLessThan(antes[2] - 60);
    expect(distancia(depois, azul)).toBeGreaterThan(distancia(antes, azul));
    expect(depois[3]).toBe(128);
  });

  it("não mexe na cor do que é opaco nem do que é fundo", () => {
    const { rgba, alfa, dimensoes, vermelho, azul } = cena();
    aplicarMascaraComCorDaFrente(rgba, alfa, dimensoes);
    expect(pixel(rgba, dimensoes.largura, 10, 10)).toEqual([...vermelho, 255]);
    expect(pixel(rgba, dimensoes.largura, 900, 10).slice(0, 3)).toEqual(azul);
    expect(pixel(rgba, dimensoes.largura, 900, 10)[3]).toBe(0);
  });

  it("arredonda para opaco o que é quase opaco, e para vazio o que é quase vazio", () => {
    const { rgba, dimensoes } = cena();
    const alfa = new Uint8Array(dimensoes.largura * dimensoes.altura).fill(254);
    alfa[0] = 2;
    aplicarMascaraComCorDaFrente(rgba, alfa, dimensoes);
    expect(rgba[3]).toBe(0);
    expect(rgba[7]).toBe(255);
    expect(rgba[(dimensoes.largura * dimensoes.altura - 1) * 4 + 3]).toBe(255);
  });

  it("funciona quando a foto é maior que a grade das médias", () => {
    // 3000 px: a grade reduz a um terço, e a correção ainda precisa acontecer
    // na resolução cheia, no pixel exato da borda.
    const { rgba, alfa, dimensoes, vermelho, azul } = cena(3000, 24);
    const antes = pixel(rgba, dimensoes.largura, BORDA_INICIO, 12);
    aplicarMascaraComCorDaFrente(rgba, alfa, dimensoes);
    const depois = pixel(rgba, dimensoes.largura, BORDA_INICIO, 12);
    const distancia = (cor: number[]) => Math.hypot(cor[0] - vermelho[0], cor[1] - vermelho[1], cor[2] - vermelho[2]);
    expect(distancia(depois)).toBeLessThan(distancia(antes) / 2);
    expect(depois[2]).toBeLessThan(azul[2]);
  });

  it("recusa buffers que não batem com as dimensões", () => {
    expect(() =>
      aplicarMascaraComCorDaFrente(new Uint8ClampedArray(16), new Uint8Array(3), { largura: 2, altura: 2 })
    ).toThrow(RangeError);
  });
});
