/**
 * A matemática do arrasto.
 *
 * A invariante que importa é uma só: a âncora do gesto — a borda ou o canto
 * oposto ao que está na mão — não se mexe na página. Com o código girado isso
 * não sai de graça, porque mudar a largura muda o centro, e o centro é o pivô
 * da rotação. Um sinal trocado aqui não quebra a tela: desloca a caixa alguns
 * décimos de milímetro por gesto, o que ninguém percebe no editor e aparece na
 * tiragem.
 */

import { describe, expect, it } from "vitest";
import { FONTE_PADRAO } from "@/lib/fontes";
import { centroDoCodigo, girarPonto, type Codigo, type Ponto } from "@/lib/barcodeLayout";
import {
  ALCAS,
  anguloDoPonteiro,
  cursorDaAlca,
  girarCodigo,
  moverCodigo,
  redimensionarCodigo,
  travarMedida,
  type Alca,
} from "@/lib/barcodeGestos";

const base = (rotacao: number): Codigo => ({
  id: "t",
  x: 40,
  y: 60,
  comprimento: 40,
  altura: 12,
  rotacao,
  texto: true,
  textoDigitos: 0,
  textoTamanho: 8,
  textoEspaco: 0.8,
  textoAcima: false,
  textoFonte: FONTE_PADRAO,
  textoPeso: 400,
  textoEntreletras: 0,
  textoAlinhamento: "centro",
});

/** O ponto de uma alça na página, para simular o ponteiro exatamente sobre ela. */
const pontoDaAlca = (codigo: Codigo, alca: Alca): Ponto => {
  const centro = centroDoCodigo(codigo);
  return girarPonto(
    {
      x: centro.x + (alca.sx * codigo.comprimento) / 2,
      y: centro.y + (alca.sy * codigo.altura) / 2,
    },
    centro,
    codigo.rotacao
  );
};
const pontoDaAncora = (codigo: Codigo, alca: Alca): Ponto =>
  pontoDaAlca(codigo, { ...alca, sx: -alca.sx as Alca["sx"], sy: -alca.sy as Alca["sy"] });

const ANGULOS = [0, 30, 45, 90, 137, 180, 270, 315, 359.5];
const DESLOCAMENTOS: ReadonlyArray<readonly [number, number]> = [
  [8, 5],
  [-6, 3],
  [15, -9],
  [-3, -7],
];

describe("redimensionar", () => {
  it("mantém a âncora imóvel em qualquer ângulo e qualquer alça", () => {
    let pior = 0;
    let casos = 0;
    for (const rotacao of ANGULOS) {
      for (const alca of ALCAS) {
        for (const [dx, dy] of DESLOCAMENTOS) {
          const codigo = base(rotacao);
          const antes = pontoDaAncora(codigo, alca);
          const ponteiro = pontoDaAlca(codigo, alca);
          const novo = {
            ...codigo,
            ...redimensionarCodigo(
              codigo,
              alca,
              { x: ponteiro.x + dx, y: ponteiro.y + dy },
              { shift: false, alt: false }
            ),
          };
          const depois = pontoDaAncora(novo, alca);
          pior = Math.max(pior, Math.hypot(depois.x - antes.x, depois.y - antes.y));
          casos++;
        }
      }
    }
    expect(casos).toBe(ANGULOS.length * ALCAS.length * DESLOCAMENTOS.length);
    // A posição é quantizada em centésimo de milímetro, então o desvio fica
    // no arredondamento e não na conta.
    expect(pior).toBeLessThan(0.08);
  });

  it("com Alt, o centro é que fica parado", () => {
    for (const rotacao of [0, 45, 90, 200]) {
      for (const alca of ALCAS) {
        const codigo = base(rotacao);
        const antes = centroDoCodigo(codigo);
        const ponteiro = pontoDaAlca(codigo, alca);
        const novo = {
          ...codigo,
          ...redimensionarCodigo(
            codigo,
            alca,
            { x: ponteiro.x + 7, y: ponteiro.y + 4 },
            { shift: false, alt: true }
          ),
        };
        const depois = centroDoCodigo(novo);
        expect(Math.hypot(depois.x - antes.x, depois.y - antes.y)).toBeLessThan(0.08);
      }
    }
  });

  it("com Shift num canto, mantém a proporção", () => {
    const alca = ALCAS.find((a) => a.id === "se")!;
    for (const rotacao of [0, 45, 90]) {
      const codigo = base(rotacao);
      const ponteiro = pontoDaAlca(codigo, alca);
      const novo = redimensionarCodigo(
        codigo,
        alca,
        { x: ponteiro.x + 20, y: ponteiro.y + 2 },
        { shift: true, alt: false }
      );
      expect(novo.comprimento / novo.altura).toBeCloseTo(
        codigo.comprimento / codigo.altura,
        2
      );
    }
  });

  it("respeita o mínimo, para a barra não virar nada", () => {
    const alca = ALCAS.find((a) => a.id === "l")!;
    const codigo = base(0);
    const ponteiro = pontoDaAlca(codigo, alca);
    const encolhido = redimensionarCodigo(
      codigo,
      alca,
      { x: ponteiro.x - 500, y: ponteiro.y },
      { shift: false, alt: false }
    );
    expect(encolhido.comprimento).toBeGreaterThanOrEqual(5);
    expect(encolhido.altura).toBeGreaterThanOrEqual(2);
  });
});

describe("girar", () => {
  it("não mexe na posição: o pivô é o centro", () => {
    const codigo = base(20);
    const centro = centroDoCodigo(codigo);
    const inicial = anguloDoPonteiro({ x: centro.x + 30, y: centro.y }, centro);
    const girado = girarCodigo(codigo, inicial, { x: centro.x + 30, y: centro.y + 30 }, {
      shift: false,
      alt: false,
    });
    expect(Object.keys(girado)).toEqual(["rotacao"]);
  });

  it("com Shift, trava em múltiplos de 15°", () => {
    const codigo = base(20);
    const centro = centroDoCodigo(codigo);
    const inicial = anguloDoPonteiro({ x: centro.x + 30, y: centro.y }, centro);
    const { rotacao } = girarCodigo(codigo, inicial, { x: centro.x + 30, y: centro.y + 30 }, {
      shift: true,
      alt: false,
    });
    expect(rotacao % 15).toBe(0);
  });
});

describe("mover", () => {
  it("com Shift, trava no eixo em que a mão foi mais longe", () => {
    expect(moverCodigo(base(0), { x: 10, y: 3 }, { shift: true, alt: false })).toEqual({
      x: 50,
      y: 60,
    });
    expect(moverCodigo(base(0), { x: 2, y: 9 }, { shift: true, alt: false })).toEqual({
      x: 40,
      y: 69,
    });
  });

  it("arredonda em décimo de milímetro", () => {
    const { x } = moverCodigo(base(0), { x: 0.04, y: 0 }, { shift: false, alt: false });
    expect(x).toBe(40);
  });
});

describe("cursor da alça", () => {
  it("acompanha o giro do código", () => {
    // A alça de cima de um código em pé redimensiona na vertical; deitado, na
    // horizontal. O cursor tem de contar a mesma história que o gesto.
    const norte = ALCAS.find((a) => a.id === "n")!;
    expect(cursorDaAlca(norte, 0)).toBe("ns-resize");
    expect(cursorDaAlca(norte, 90)).toBe("ew-resize");
  });
});

describe("travar a medida com Shift", () => {
  const inicio = { x: 10, y: 10 };

  it("achata na horizontal quando o gesto foi mais horizontal", () => {
    // Sem isto o número lido é a hipotenusa, não a distância que se queria
    // medir — e numa folha de formulário quase toda medida é de um eixo só.
    expect(travarMedida(inicio, { x: 110, y: 18 })).toEqual({ x: 110, y: 10 });
  });

  it("achata na vertical quando o gesto foi mais vertical", () => {
    expect(travarMedida(inicio, { x: 16, y: 90 })).toEqual({ x: 10, y: 90 });
  });

  it("perto da diagonal, trava em 45° exatos", () => {
    const p = travarMedida(inicio, { x: 60, y: 56 });
    expect(Math.abs(p.x - inicio.x)).toBeCloseTo(Math.abs(p.y - inicio.y), 9);
  });

  it("respeita o sentido do arrasto", () => {
    expect(travarMedida(inicio, { x: -50, y: 12 })).toEqual({ x: -50, y: 10 });
    expect(travarMedida(inicio, { x: 12, y: -50 })).toEqual({ x: 10, y: -50 });
  });

  it("aguenta gesto de tamanho zero", () => {
    expect(travarMedida(inicio, inicio)).toEqual(inicio);
  });
});
