import { encode } from "uqr";

import { ALTURA_DA_MAIUSCULA, GLIFOS, KERNING } from "./glifosDoRotulo";

/**
 * Desenho do QR Code do Instagram no estilo do cartão de perfil do app:
 * módulos em ponto, marcadores de canto arredondados com miolo redondo, o
 * glifo do Instagram vazado no centro e o @ embaixo.
 *
 * Aqui é só geometria — nada de React nem de DOM —, para que a prévia na tela
 * e os arquivos baixados saiam do mesmo cálculo, e para que isso seja testável.
 * Tudo é medido em módulos: 1 unidade = 1 módulo do código.
 */

export type VarianteDoQr = "preto" | "gradiente";

export const VARIANTES: readonly VarianteDoQr[] = ["preto", "gradiente"];

/**
 * O degradê do Instagram, aplicado na diagonal sobre o arquivo inteiro — do
 * canto de cima à esquerda, em laranja, ao fim do @, em azul-violeta.
 *
 * O primeiro tom é laranja, e não o amarelo da marca: o marcador de canto
 * cai nesse trecho, e amarelo sobre branco não dá contraste para a câmera
 * achar o código.
 */
export const DEGRADE: ReadonlyArray<readonly [offset: number, cor: string]> = [
  [0, "#F9A23A"],
  [0.3, "#F56A38"],
  [0.5, "#E1306C"],
  [0.66, "#C72F8A"],
  [0.82, "#8A3AB9"],
  [1, "#5851DB"],
];

/**
 * Zona de silêncio, em módulos. A norma pede 4; o cartão do Instagram usa
 * menos, e 3 é o que leitores de celular leem sem falhar mantendo o desenho
 * enxuto. Abaixo disso a câmera perde a borda do código.
 */
const MARGEM = 3;

/**
 * Raio do ponto. Abaixo de ~0,35 o código começa a parecer poeira e o leitor
 * a errar módulo; acima de 0,45 os pontos se tocam e o estilo some.
 */
const RAIO_DO_PONTO = 0.36;

const LADO_DO_MARCADOR = 7;
/** Raio externo do anel do marcador. O interno sai concêntrico: este menos a espessura. */
const RAIO_DO_MARCADOR = 2.3;
/** O miolo ocupa as 3 células centrais, como manda a proporção 1:1:3:1:1. */
const RAIO_DO_MIOLO = 1.5;

/**
 * Fração do lado limpa no centro para o glifo. Com correção H (30%), ~27% do
 * lado — ~7% da área — fica folgado mesmo com a perda extra do estilo em ponto.
 */
const FRACAO_DO_CENTRO = 0.27;
/** Respiro entre o glifo e os pontos em volta, em módulos. */
const RESPIRO_DO_GLIFO = 0.8;

/** Altura da maiúscula do @, em fração do lado do código. */
const ALTURA_DO_ROTULO = 0.07;
/** Distância entre o código e o @, em fração do lado. */
const VAO_DO_ROTULO = 0.06;

/** Espessura do traço do @ desenhado, em unidades da fonte — a haste da Oswald 300. */
const TRACO_DA_ARROBA = 74;
/** Espaço entre o @ e a primeira letra, em unidades da fonte. */
const VAO_DA_ARROBA = 110;
/**
 * Espaçamento extra entre letras, em unidades da fonte. A Oswald é desenhada
 * para título, apertada; em caixa alta pequena, sob o código, ela pede ar —
 * é o que o rótulo do cartão do app tem.
 */
const ENTRELETRA = 90;

export interface DesenhoDoQrInstagram {
  largura: number;
  altura: number;
  /** Todos os pontos num caminho só: milhares de <circle> pesariam no DOM e no arquivo. */
  pontos: string;
  /** Anéis dos três marcadores. Preencher com `evenodd`. */
  marcadores: string;
  miolos: string;
  /** Glifo do Instagram. Preencher com `evenodd`. */
  glifo: string;
  rotulo: {
    letras: string;
    /** O @ é traço, não contorno: um círculo aberto desenhado com caneta redonda. */
    arroba: string;
    espessuraDaArroba: number;
  } | null;
}

const n3 = (valor: number) => Number(valor.toFixed(3));

function circulo(cx: number, cy: number, r: number): string {
  return `M${n3(cx - r)} ${n3(cy)}a${n3(r)} ${n3(r)} 0 1 0 ${n3(r * 2)} 0a${n3(r)} ${n3(r)} 0 1 0 ${n3(-r * 2)} 0Z`;
}

function quadradoArredondado(x: number, y: number, lado: number, r: number): string {
  const fim = lado - r * 2;
  return (
    `M${n3(x + r)} ${n3(y)}h${n3(fim)}a${n3(r)} ${n3(r)} 0 0 1 ${n3(r)} ${n3(r)}` +
    `v${n3(fim)}a${n3(r)} ${n3(r)} 0 0 1 ${n3(-r)} ${n3(r)}` +
    `h${n3(-fim)}a${n3(r)} ${n3(r)} 0 0 1 ${n3(-r)} ${n3(-r)}` +
    `v${n3(-fim)}a${n3(r)} ${n3(r)} 0 0 1 ${n3(r)} ${n3(-r)}Z`
  );
}

/**
 * Leva um contorno de glifo para a posição final: escala uniforme e
 * translação aplicadas nos números, não num `transform`.
 *
 * Num <g transform>, o degradê em `userSpaceOnUse` seria medido no espaço
 * transformado de cada letra, e o @ sairia com o degradê inteiro espremido
 * nele em vez de continuar o do código. Assar a posição no caminho mantém
 * uma só régua para o arquivo todo.
 *
 * Só cobre o que o gerador de glifos emite: comandos absolutos M, L, H, V, Q
 * e Z, com repetição implícita de coordenadas.
 */
export function posicionarCaminho(d: string, escala: number, dx: number, dy: number): string {
  return d.replace(/([MLHVQZ])([^MLHVQZ]*)/g, (_, comando: string, args: string) => {
    const numeros = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    const mover = numeros.map((valor, i) => {
      if (comando === "H") return n3(valor * escala + dx);
      if (comando === "V") return n3(valor * escala + dy);
      return n3(valor * escala + (i % 2 === 0 ? dx : dy));
    });
    return comando + mover.join(" ");
  });
}

/**
 * O @ desenhado à mão, redondo, no lugar do @ da Oswald, que é estreito e
 * oval como as letras dela. O arroba do cartão do app é um círculo, e é ele
 * que dá a cara do rótulo.
 *
 * Coordenadas em unidades da fonte, linha de base em y=0. O diâmetro passa um
 * pouco da altura da maiúscula: forma redonda do mesmo tamanho que a reta
 * parece menor (a mesma compensação que a fonte faz no O).
 */
function arrobaEmUnidades() {
  const diametro = ALTURA_DA_MAIUSCULA * 1.04;
  const raio = (diametro - TRACO_DA_ARROBA) / 2;
  const cx = diametro / 2;
  const cy = -ALTURA_DA_MAIUSCULA / 2;
  const interno = raio * 0.4;
  const gancho = (raio - interno) / 2;
  const fim = (50 * Math.PI) / 180;

  const comandos = [
    // Haste do "a", descendo pelo lado direito do miolo.
    ["M", cx + interno, cy - interno],
    ["L", cx + interno, cy],
    // Gancho por baixo, que vira o anel de fora.
    ["A", gancho, gancho, 0, 0, 0, cx + raio, cy],
    ["A", raio, raio, 0, 1, 0, cx + raio * Math.cos(fim), cy + raio * Math.sin(fim)],
    // Miolo.
    ["M", cx + interno, cy],
    ["A", interno, interno, 0, 1, 0, cx - interno, cy],
    ["A", interno, interno, 0, 1, 0, cx + interno, cy],
  ] as const;

  return { comandos, largura: diametro };
}

/** Rótulo do @ já posicionado: escala para caber na largura do código e centra pela tinta. */
function montarRotulo(usuario: string, inicioX: number, larguraMax: number, topo: number, alturaAlvo: number) {
  const texto = [...usuario.toUpperCase()].filter((c) => c in GLIFOS && c !== "@");
  const arroba = arrobaEmUnidades();

  const posicoes: Array<{ caractere: string; x: number }> = [];
  let cursor = arroba.largura + VAO_DA_ARROBA;
  texto.forEach((caractere, i) => {
    posicoes.push({ caractere, x: cursor });
    cursor += GLIFOS[caractere].avanco + ENTRELETRA + (KERNING[caractere + (texto[i + 1] ?? "")] ?? 0);
  });

  const ultima = posicoes.at(-1);
  const larguraDaTinta = ultima ? ultima.x + GLIFOS[ultima.caractere].tinta[1] : arroba.largura;

  const escala = Math.min(alturaAlvo / ALTURA_DA_MAIUSCULA, larguraMax / larguraDaTinta);
  const dx = inicioX + (larguraMax - larguraDaTinta * escala) / 2;
  // Centra a maiúscula na faixa reservada: um @ longo encolhe sem descolar do código.
  const dy = topo + (alturaAlvo + ALTURA_DA_MAIUSCULA * escala) / 2;

  const letras = posicoes
    .map(({ caractere, x }) => posicionarCaminho(GLIFOS[caractere].d, escala, dx + x * escala, dy))
    .join("");

  const em = (x: number, y: number) => `${n3(dx + x * escala)} ${n3(dy + y * escala)}`;
  const arrobaD = arroba.comandos
    .map((c) => {
      if (c[0] === "A") {
        const [, rx, ry, rot, grande, sentido, x, y] = c;
        return `A${n3(rx * escala)} ${n3(ry * escala)} ${rot} ${grande} ${sentido} ${em(x, y)}`;
      }
      return `${c[0]}${em(c[1], c[2])}`;
    })
    .join("");

  return { letras, arroba: arrobaD, espessuraDaArroba: n3(TRACO_DA_ARROBA * escala) };
}

/**
 * Codifica `valor` e devolve o desenho completo.
 *
 * O texto codificado é o link curto do geradoor — curto o bastante para caber
 * numa versão baixa, onde o centro limpo não pega padrão de alinhamento.
 * Versões a partir da 7 têm um no meio; por isso o tamanho do centro limpo
 * não passa do que a correção H cobre com folga.
 */
export function desenharQrInstagram(valor: string, usuario?: string | null): DesenhoDoQrInstagram {
  const qr = encode(valor, { ecc: "H", border: 0 });
  const n = qr.size;

  // Ímpar, para o glifo ficar exatamente no meio de uma grade de lado ímpar.
  const limpo = Math.max(5, Math.round((n * FRACAO_DO_CENTRO - 1) / 2) * 2 + 1);
  const inicioDoLimpo = (n - limpo) / 2;
  const noCentro = (linha: number, coluna: number) =>
    linha >= inicioDoLimpo &&
    linha < inicioDoLimpo + limpo &&
    coluna >= inicioDoLimpo &&
    coluna < inicioDoLimpo + limpo;

  const noMarcador = (linha: number, coluna: number) => {
    const topo = linha < LADO_DO_MARCADOR;
    const esquerda = coluna < LADO_DO_MARCADOR;
    return (topo && esquerda) || (topo && coluna >= n - LADO_DO_MARCADOR) || (linha >= n - LADO_DO_MARCADOR && esquerda);
  };

  const pontos: string[] = [];
  qr.data.forEach((linha, y) => {
    linha.forEach((escuro, x) => {
      if (!escuro || noMarcador(y, x) || noCentro(y, x)) return;
      pontos.push(circulo(MARGEM + x + 0.5, MARGEM + y + 0.5, RAIO_DO_PONTO));
    });
  });

  const cantos: Array<[number, number]> = [
    [0, 0],
    [n - LADO_DO_MARCADOR, 0],
    [0, n - LADO_DO_MARCADOR],
  ];
  const marcadores = cantos
    .map(([x, y]) => {
      const px = MARGEM + x;
      const py = MARGEM + y;
      return (
        quadradoArredondado(px, py, LADO_DO_MARCADOR, RAIO_DO_MARCADOR) +
        quadradoArredondado(px + 1, py + 1, LADO_DO_MARCADOR - 2, RAIO_DO_MARCADOR - 1)
      );
    })
    .join("");
  const miolos = cantos
    .map(([x, y]) => circulo(MARGEM + x + LADO_DO_MARCADOR / 2, MARGEM + y + LADO_DO_MARCADOR / 2, RAIO_DO_MIOLO))
    .join("");

  // Glifo do Instagram: moldura arredondada, lente e flash, com o traço
  // proporcional ao lado — o mesmo desenho do ícone oficial em contorno.
  const lado = limpo - RESPIRO_DO_GLIFO * 2;
  const centro = MARGEM + n / 2;
  const traco = lado * 0.1;
  const raioDaMoldura = lado * 0.3;
  const raioDaLente = lado * 0.24;
  const canto = centro - lado / 2;
  const glifo =
    quadradoArredondado(canto, canto, lado, raioDaMoldura) +
    quadradoArredondado(canto + traco, canto + traco, lado - traco * 2, raioDaMoldura - traco) +
    circulo(centro, centro, raioDaLente) +
    circulo(centro, centro, raioDaLente - traco) +
    circulo(centro + lado * 0.265, centro - lado * 0.265, lado * 0.062);

  const largura = n + MARGEM * 2;
  const temRotulo = Boolean(usuario?.trim());
  const alturaDoRotulo = n * ALTURA_DO_ROTULO;
  const topoDoRotulo = MARGEM + n + n * VAO_DO_ROTULO;
  const altura = temRotulo ? topoDoRotulo + alturaDoRotulo + MARGEM : largura;

  return {
    largura,
    altura: n3(altura),
    pontos: pontos.join(""),
    marcadores,
    miolos,
    glifo,
    rotulo: temRotulo ? montarRotulo(usuario!.trim(), MARGEM, n, topoDoRotulo, alturaDoRotulo) : null,
  };
}
