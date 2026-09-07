/**
 * Matemática da manipulação direta: mover, redimensionar e girar um código
 * arrastando na folha.
 *
 * Fica separada do componente porque é a parte que erra em silêncio. Um sinal
 * trocado aqui não quebra a tela: ele desloca a caixa alguns décimos de
 * milímetro por gesto, o que ninguém percebe no editor e aparece na tiragem.
 * Como função pura, dá para conferir a invariante que importa — a âncora do
 * gesto não se move — em qualquer ângulo, o que é o teste que este arquivo tem.
 *
 * Todo o raciocínio acontece no referencial **local** do código: o bloco não
 * girado, com o eixo x no sentido da leitura. Girar o ponteiro para dentro
 * desse referencial, resolver o retângulo lá, e devolver o resultado para a
 * página é o que faz o mesmo código servir para 0° e para 137°.
 */

import {
  LIMITES,
  centroDoCodigo,
  girarPonto,
  normalizarAngulo,
  type Codigo,
  type Ponto,
} from "@/lib/barcodeLayout";

/**
 * As nove pegadas de um retângulo, pelo sinal em cada eixo local.
 *
 * `-1` é a borda de início do eixo, `1` a de fim, `0` o meio. Assim uma alça
 * de canto e uma de aresta caem no mesmo código: a de aresta só tem um dos
 * eixos livre.
 */
export interface Alca {
  id: string;
  sx: -1 | 0 | 1;
  sy: -1 | 0 | 1;
}

export const ALCAS: readonly Alca[] = [
  { id: "no", sx: -1, sy: -1 },
  { id: "n", sx: 0, sy: -1 },
  { id: "ne", sx: 1, sy: -1 },
  { id: "l", sx: 1, sy: 0 },
  { id: "se", sx: 1, sy: 1 },
  { id: "s", sx: 0, sy: 1 },
  { id: "so", sx: -1, sy: 1 },
  { id: "o", sx: -1, sy: 0 },
];

export interface Modificadores {
  /** Trava a proporção ao redimensionar; trava o eixo ao mover; 15° ao girar. */
  shift: boolean;
  /** Redimensiona a partir do centro, mantendo-o parado. */
  alt: boolean;
}

/** Décimo de milímetro: a menor diferença que se julga no papel. */
const PASSO_MM = 0.1;
/** Décimo de grau na mão livre, 15° com Shift. */
const PASSO_GRAU = 0.1;
const PASSO_GRAU_TRAVADO = 15;

const arredondar = (valor: number, passo: number) => Math.round(valor / passo) * passo;

/** Ponto da página levado para o referencial local de um código. */
function paraLocal(ponto: Ponto, centro: Ponto, rotacao: number): Ponto {
  return girarPonto(ponto, centro, -rotacao);
}

/**
 * Move o código, com Shift travando no eixo dominante.
 *
 * O eixo é o da página, e não o do código: quem arrasta está julgando o
 * alinhamento contra a folha e contra os outros códigos, não contra a
 * inclinação daquele.
 */
export function moverCodigo(
  inicial: Codigo,
  deslocamento: Ponto,
  modificadores: Modificadores
): Pick<Codigo, "x" | "y"> {
  let { x: dx, y: dy } = deslocamento;
  if (modificadores.shift) {
    if (Math.abs(dx) > Math.abs(dy)) dy = 0;
    else dx = 0;
  }
  return {
    x: arredondar(inicial.x + dx, PASSO_MM),
    y: arredondar(inicial.y + dy, PASSO_MM),
  };
}

/**
 * Redimensiona pela alça arrastada.
 *
 * A invariante do gesto é que a âncora — a borda ou o canto oposto ao que está
 * na mão — não se mexe na página. Com o código girado isso não sai de graça:
 * mudar largura muda o centro, e o centro é o pivô da rotação, então manter a
 * âncora parada exige recolocar o centro junto. É o que as duas últimas contas
 * fazem.
 */
export function redimensionarCodigo(
  inicial: Codigo,
  alca: Alca,
  ponteiro: Ponto,
  modificadores: Modificadores
): Pick<Codigo, "x" | "y" | "comprimento" | "altura"> {
  const centro = centroDoCodigo(inicial);
  const rotacao = inicial.rotacao;
  const { comprimento, altura } = inicial;

  // Âncora: o oposto da alça. Com Alt, é o próprio centro que fica parado.
  const ancoraLocal: Ponto = modificadores.alt
    ? { x: 0, y: 0 }
    : { x: (-alca.sx * comprimento) / 2, y: (-alca.sy * altura) / 2 };
  const ancoraPagina = girarPonto(
    { x: centro.x + ancoraLocal.x, y: centro.y + ancoraLocal.y },
    centro,
    rotacao
  );

  // O ponteiro, medido a partir da âncora, nos eixos do código.
  const local = paraLocal(ponteiro, ancoraPagina, rotacao);
  const dx = local.x - ancoraPagina.x;
  const dy = local.y - ancoraPagina.y;
  const escala = modificadores.alt ? 2 : 1;

  let novoComprimento = alca.sx === 0 ? comprimento : alca.sx * dx * escala;
  let novaAltura = alca.sy === 0 ? altura : alca.sy * dy * escala;

  // Shift num canto mantém a proporção: o eixo que se afastou mais manda, que
  // é o comportamento que não trava a mão de quem arrasta na diagonal.
  if (modificadores.shift && alca.sx !== 0 && alca.sy !== 0) {
    const fatorX = novoComprimento / comprimento;
    const fatorY = novaAltura / altura;
    const fator = Math.abs(fatorX) > Math.abs(fatorY) ? fatorX : fatorY;
    novoComprimento = comprimento * fator;
    novaAltura = altura * fator;
  }

  novoComprimento = Math.min(
    LIMITES.comprimento.max,
    Math.max(LIMITES.comprimento.min, arredondar(novoComprimento, PASSO_MM))
  );
  novaAltura = Math.min(
    LIMITES.altura.max,
    Math.max(LIMITES.altura.min, arredondar(novaAltura, PASSO_MM))
  );

  // Onde o centro tem que ficar para a âncora não sair do lugar.
  const centroLocalDepois: Ponto = modificadores.alt
    ? { x: 0, y: 0 }
    : { x: (alca.sx * novoComprimento) / 2, y: (alca.sy * novaAltura) / 2 };
  const girado = girarPonto(
    { x: ancoraPagina.x + centroLocalDepois.x, y: ancoraPagina.y + centroLocalDepois.y },
    ancoraPagina,
    rotacao
  );

  return {
    x: arredondar(girado.x - novoComprimento / 2, PASSO_MM),
    y: arredondar(girado.y - novaAltura / 2, PASSO_MM),
    comprimento: novoComprimento,
    altura: novaAltura,
  };
}

/**
 * Gira em torno do centro, que por isso não se mexe: `x` e `y` continuam os
 * mesmos e só o ângulo muda.
 */
export function girarCodigo(
  inicial: Codigo,
  anguloInicialDoPonteiro: number,
  ponteiro: Ponto,
  modificadores: Modificadores
): Pick<Codigo, "rotacao"> {
  const centro = centroDoCodigo(inicial);
  const atual = anguloDoPonteiro(ponteiro, centro);
  const passo = modificadores.shift ? PASSO_GRAU_TRAVADO : PASSO_GRAU;
  return {
    rotacao: normalizarAngulo(
      arredondar(inicial.rotacao + (atual - anguloInicialDoPonteiro), passo)
    ),
  };
}

/** Ângulo do ponteiro visto do centro, em graus, na convenção do modelo. */
export function anguloDoPonteiro(ponteiro: Ponto, centro: Ponto): number {
  return (Math.atan2(ponteiro.y - centro.y, ponteiro.x - centro.x) * 180) / Math.PI;
}

const CURSORES = [
  "ns-resize",
  "nesw-resize",
  "ew-resize",
  "nwse-resize",
] as const;

/**
 * Cursor de uma alça já considerando o giro do código.
 *
 * Sem isto a alça do canto superior de um código deitado mostraria a seta na
 * diagonal errada, e o gesto passa a contrariar o que o cursor promete.
 */
export function cursorDaAlca(alca: Alca, rotacao: number): string {
  const graus = (Math.atan2(alca.sy, alca.sx) * 180) / Math.PI + rotacao;
  // 180° é a mesma seta de dois sentidos: quatro orientações cobrem tudo.
  const setor = Math.round(normalizarAngulo(graus + 90) / 45) % 4;
  return CURSORES[setor] ?? "ew-resize";
}

/**
 * Trava a medida no eixo, ou na diagonal exata.
 *
 * É o Shift da régua: numa folha de formulário quase toda medida que interessa
 * é de um eixo só, e à mão livre a linha sai sempre um pouco torta — aí o
 * número lido é a hipotenusa, não a distância que se queria medir. Os 45°
 * entram porque uma diagonal exata também é medida legítima, e é o que o
 * Figma faz.
 */
export function travarMedida(inicio: Ponto, fim: Ponto): Ponto {
  const dx = fim.x - inicio.x;
  const dy = fim.y - inicio.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  // Perto da diagonal, vale a diagonal: projeta no menor dos dois para a
  // linha ficar exatamente a 45°.
  const diagonal = Math.min(ax, ay) / Math.max(ax, ay, 1e-9) > Math.tan(Math.PI / 8);
  if (diagonal) {
    const lado = (ax + ay) / 2;
    return { x: inicio.x + Math.sign(dx) * lado, y: inicio.y + Math.sign(dy) * lado };
  }
  return ax >= ay ? { x: fim.x, y: inicio.y } : { x: inicio.x, y: fim.y };
}
