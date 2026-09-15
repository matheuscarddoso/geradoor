import { describe, expect, it } from "vitest";
import {
  TAMANHO_MAXIMO,
  TAMANHO_MINIMO,
  ajustarTamanho,
  carimbos,
  comPonto,
  limitarTamanho,
  pontoNaImagem,
  reconhecerAtalhoDoPincel,
  type Traco,
} from "./pincel";

const traco = (pontos: Array<[number, number]>, raio = 10): Traco => ({
  ferramenta: "apagar",
  raio,
  pontos: pontos.map(([x, y]) => ({ x, y })),
});

describe("tamanho do pincel", () => {
  it("fica dentro dos limites e arredonda", () => {
    expect(limitarTamanho(0)).toBe(TAMANHO_MINIMO);
    expect(limitarTamanho(9999)).toBe(TAMANHO_MAXIMO);
    expect(limitarTamanho(33.6)).toBe(34);
    expect(limitarTamanho(Number.NaN)).toBe(TAMANHO_MINIMO);
  });

  it("[ e ] andam em passo proporcional, nunca menor que 2", () => {
    expect(ajustarTamanho(100, 1)).toBe(115);
    expect(ajustarTamanho(100, -1)).toBe(85);
    expect(ajustarTamanho(6, -1)).toBe(TAMANHO_MINIMO);
    expect(ajustarTamanho(TAMANHO_MAXIMO, 1)).toBe(TAMANHO_MAXIMO);
  });
});

describe("carimbos", () => {
  it("traço de um toque é um carimbo só", () => {
    expect(carimbos(traco([[5, 5]]))).toEqual([{ x: 5, y: 5 }]);
  });

  it("traço vazio não desenha nada", () => {
    expect(carimbos(traco([]))).toEqual([]);
  });

  it("preenche o caminho entre pontos distantes sem deixar buraco", () => {
    const raio = 10;
    const centros = carimbos(traco([[0, 0], [100, 0]], raio));
    for (let i = 1; i < centros.length; i++) {
      const salto = Math.hypot(centros[i].x - centros[i - 1].x, centros[i].y - centros[i - 1].y);
      expect(salto).toBeLessThanOrEqual(raio * 0.25 + 1e-9);
    }
    expect(centros.at(-1)).toEqual({ x: 100, y: 0 });
  });

  it("não fica infinito com raio minúsculo", () => {
    expect(carimbos(traco([[0, 0], [10, 0]], 0.01)).length).toBeLessThanOrEqual(21);
  });
});

describe("comPonto", () => {
  it("ignora ponto parado no mesmo lugar e devolve o mesmo objeto", () => {
    const inicial = traco([[10, 10]], 20);
    expect(comPonto(inicial, { x: 10.5, y: 10 })).toBe(inicial);
  });

  it("acrescenta ponto que andou, sem mutar o traço anterior", () => {
    const inicial = traco([[10, 10]], 20);
    const proximo = comPonto(inicial, { x: 30, y: 10 });
    expect(proximo.pontos).toHaveLength(2);
    expect(inicial.pontos).toHaveLength(1);
  });
});

describe("pontoNaImagem", () => {
  it("converte a posição na tela para pixels da imagem", () => {
    const caixa = { left: 100, top: 50, width: 400, height: 300 };
    expect(pontoNaImagem({ x: 300, y: 200 }, caixa, { largura: 4000, altura: 3000 })).toEqual({ x: 2000, y: 1500 });
  });

  it("aceita ponto fora da imagem, para o traço poder começar de fora", () => {
    const caixa = { left: 0, top: 0, width: 100, height: 100 };
    expect(pontoNaImagem({ x: -10, y: 50 }, caixa, { largura: 1000, altura: 1000 }).x).toBe(-100);
  });
});

describe("reconhecerAtalhoDoPincel", () => {
  const tecla = (key: string, extra: Partial<Parameters<typeof reconhecerAtalhoDoPincel>[0]> = {}) =>
    reconhecerAtalhoDoPincel({ key, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, emCampo: false, ...extra });

  it("E, R, [ e ] escolhem ferramenta e tamanho", () => {
    expect(tecla("e")).toBe("apagar");
    expect(tecla("R")).toBe("restaurar");
    expect(tecla("[")).toBe("diminuir");
    expect(tecla("]")).toBe("aumentar");
  });

  it("⌘Z desfaz, ⇧⌘Z e ⌘Y refazem, também com Ctrl", () => {
    expect(tecla("z", { metaKey: true })).toBe("desfazer");
    expect(tecla("z", { metaKey: true, shiftKey: true })).toBe("refazer");
    expect(tecla("y", { ctrlKey: true })).toBe("refazer");
  });

  it("⌘E e ⌘R ficam com o navegador", () => {
    expect(tecla("r", { metaKey: true })).toBeNull();
    expect(tecla("e", { ctrlKey: true })).toBeNull();
  });

  it("com o foco num campo, só Escape passa", () => {
    expect(tecla("e", { emCampo: true })).toBeNull();
    expect(tecla("z", { metaKey: true, emCampo: true })).toBeNull();
    expect(tecla("Escape", { emCampo: true })).toBe("sair");
  });
});
