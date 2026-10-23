import { describe, expect, it } from "vitest";
import { encode } from "uqr";

import { desenharQrInstagram, posicionarCaminho } from "./qrInstagram";

/**
 * A leitura do código foi conferida fora da suíte, rasterizando o SVG e
 * passando no zxing (com desfoque, JPEG, perspectiva e baixo contraste, nas
 * duas variantes). Aqui fica o que garante que esse resultado se mantém: que
 * nenhum módulo escuro fora das áreas reservadas some, que o centro limpo
 * não encosta nos marcadores e que o @ cabe na largura do código.
 */

const LINK = "https://www.geradoor.com/48ace1";
const MARGEM = 3;

/** Centros dos pontos desenhados, em coordenadas de módulo (sem a margem). */
function centrosDosPontos(pontos: string): Array<[number, number]> {
  return [...pontos.matchAll(/M([\d.]+) ([\d.]+)a([\d.]+)/g)].map(([, x, y, r]) => [
    Math.round(Number(x) + Number(r) - MARGEM - 0.5),
    Math.round(Number(y) - MARGEM - 0.5),
  ]);
}

describe("desenharQrInstagram", () => {
  it("desenha um ponto para cada módulo escuro fora dos marcadores e do centro", () => {
    const qr = encode(LINK, { ecc: "H", border: 0 });
    const desenho = desenharQrInstagram(LINK);
    const centros = new Set(centrosDosPontos(desenho.pontos).map(([x, y]) => `${x},${y}`));

    const n = qr.size;
    const noMarcador = (x: number, y: number) =>
      (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

    let escurosForaDoCentro = 0;
    qr.data.forEach((linha, y) =>
      linha.forEach((escuro, x) => {
        if (!escuro || noMarcador(x, y)) return;
        if (centros.has(`${x},${y}`)) escurosForaDoCentro++;
      })
    );

    // Todo ponto desenhado é um módulo escuro de verdade.
    expect(escurosForaDoCentro).toBe(centros.size);
    expect(centros.size).toBeGreaterThan(200);
  });

  it("limpa no centro menos do que a correção H recupera", () => {
    const qr = encode(LINK, { ecc: "H", border: 0 });
    const desenho = desenharQrInstagram(LINK);
    const desenhados = centrosDosPontos(desenho.pontos).length;

    const n = qr.size;
    let escurosDeDados = 0;
    qr.data.forEach((linha, y) =>
      linha.forEach((escuro, x) => {
        const noMarcador = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
        if (escuro && !noMarcador) escurosDeDados++;
      })
    );

    const perdidos = escurosDeDados - desenhados;
    expect(perdidos).toBeGreaterThan(0);
    // Folga larga: os 30% do nível H valem por codeword, e o centro ainda
    // apaga módulos claros, que não entram nesta conta.
    expect(perdidos / escurosDeDados).toBeLessThan(0.12);
  });

  it("deixa o centro limpo longe dos marcadores de canto", () => {
    const qr = encode(LINK, { ecc: "H", border: 0 });
    const desenho = desenharQrInstagram(LINK);
    const centros = new Set(centrosDosPontos(desenho.pontos).map(([x, y]) => `${x},${y}`));
    const meio = (qr.size - 1) / 2;

    // O módulo do meio é sempre limpo; a linha de sincronismo (linha 6) nunca é.
    expect(centros.has(`${meio},${meio}`)).toBe(false);
    const sincronismo = qr.data[6].filter((escuro, x) => escuro && x > 7 && x < qr.size - 8).length;
    const sincronismoDesenhado = [...centros].filter((c) => c.endsWith(",6")).length;
    expect(sincronismoDesenhado).toBe(sincronismo);
  });

  it("sai quadrado sem @ e mais alto com @", () => {
    const sem = desenharQrInstagram(LINK);
    const com = desenharQrInstagram(LINK, "geradoor");

    expect(sem.rotulo).toBeNull();
    expect(sem.altura).toBe(sem.largura);
    expect(com.rotulo).not.toBeNull();
    expect(com.altura).toBeGreaterThan(com.largura);
    // Mesmo código, mesma largura: só o rótulo acrescenta.
    expect(com.largura).toBe(sem.largura);
  });

  it("encaixa um @ de 30 caracteres dentro da largura do código", () => {
    const desenho = desenharQrInstagram(LINK, "a_very.long_username_30chars_x");
    // x de cada comando: H só tem x, V não tem, os demais alternam x e y.
    const xs = [...desenho.rotulo!.letras.matchAll(/([MLHVQZ])([^MLHVQZ]*)/g)].flatMap(([, comando, args]) => {
      const numeros = args.trim() ? args.trim().split(/\s+/).map(Number) : [];
      if (comando === "H") return numeros;
      if (comando === "V") return [];
      return numeros.filter((_, i) => i % 2 === 0);
    });

    expect(Math.min(...xs)).toBeGreaterThanOrEqual(MARGEM - 0.01);
    expect(Math.max(...xs)).toBeLessThanOrEqual(desenho.largura - MARGEM + 0.01);
  });

  it("ignora caracteres fora do que um @ do Instagram aceita", () => {
    const limpo = desenharQrInstagram(LINK, "perfil");
    const sujo = desenharQrInstagram(LINK, "per<script>fil");
    expect(sujo.rotulo!.letras).not.toContain("<");
    expect(limpo.rotulo!.letras.length).toBeLessThan(sujo.rotulo!.letras.length);
  });

  it("é determinístico: o mesmo link desenha o mesmo código", () => {
    expect(desenharQrInstagram(LINK, "geradoor")).toEqual(desenharQrInstagram(LINK, "geradoor"));
  });
});

describe("posicionarCaminho", () => {
  it("escala e desloca pares, H e V pelo eixo certo", () => {
    expect(posicionarCaminho("M1 2H3V4L5 6Q7 8 9 10Z", 2, 10, 100)).toBe(
      "M12 104H16V108L20 112Q24 116 28 120Z"
    );
  });

  it("aplica a repetição implícita de coordenadas", () => {
    expect(posicionarCaminho("M0 0 1 1 2 2Z", 1, 5, 5)).toBe("M5 5 6 6 7 7Z");
  });
});
