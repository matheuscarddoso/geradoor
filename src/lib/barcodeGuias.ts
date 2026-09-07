/**
 * Alinhamento grudento: as guias que aparecem ao arrastar e prendem o código
 * nas bordas e nos centros dos outros e da própria folha.
 *
 * É o que substitui o "arrastar e conferir de olho". Numa folha de formulário
 * as etiquetas ficam em fileira, e um décimo de milímetro de desalinho entre
 * elas é invisível na tela e evidente no papel cortado.
 *
 * Duas decisões que valem explicar:
 *
 * 1. A tolerância chega em **pixel de tela**, não em milímetro. O que o
 *    operador julga "perto" é o que ele vê: a seis pixels do alvo, a mesma
 *    distância física vale um milímetro com zoom baixo e um décimo com zoom
 *    alto. Tolerância em milímetro grudaria de longe no zoom alto e não
 *    grudaria de perto no zoom baixo.
 *
 * 2. O código girado é comparado pela **caixa envolvente**, não pelas quinas.
 *    É o que qualquer editor faz, e é o que corresponde ao que a pessoa vê
 *    como "a largura daquilo" na folha.
 */

import { caixaEnvolvente, type Codigo, type Pagina } from "@/lib/barcodeLayout";

export interface Caixa {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export type Eixo = "x" | "y";

export interface Guia {
  eixo: Eixo;
  /** Onde a linha fica, em mm de página. */
  posicao: number;
  /** Extremos da linha no outro eixo, para ela não varrer a folha inteira. */
  de: number;
  ate: number;
  /** Página gera guia de cor diferente: é referência fixa, não vizinho. */
  origem: "pagina" | "codigo";
}

export interface Alinhamento {
  /** Quanto somar à posição proposta para grudar, em mm. */
  ajuste: { x: number; y: number };
  guias: Guia[];
}

/** As três posições que contam num eixo: início, meio e fim. */
function pontosDoEixo(caixa: Caixa, eixo: Eixo): [number, number, number] {
  return eixo === "x"
    ? [caixa.x, caixa.x + caixa.largura / 2, caixa.x + caixa.largura]
    : [caixa.y, caixa.y + caixa.altura / 2, caixa.y + caixa.altura];
}

interface Candidato {
  posicao: number;
  origem: Guia["origem"];
  /** Extremos do alvo no outro eixo, para desenhar a guia do tamanho certo. */
  de: number;
  ate: number;
}

function candidatos(outras: Caixa[], pagina: Pagina, eixo: Eixo): Candidato[] {
  const lista: Candidato[] = [];
  const tamanho = eixo === "x" ? pagina.largura : pagina.altura;
  const cruzado = eixo === "x" ? pagina.altura : pagina.largura;

  // A folha: as duas bordas e o meio. O meio é o que resolve "centralizar".
  for (const posicao of [0, tamanho / 2, tamanho]) {
    lista.push({ posicao, origem: "pagina", de: 0, ate: cruzado });
  }

  for (const caixa of outras) {
    const [inicio, meio, fim] = pontosDoEixo(caixa, eixo);
    const [cruzadoInicio, , cruzadoFim] = pontosDoEixo(caixa, eixo === "x" ? "y" : "x");
    for (const posicao of [inicio, meio, fim]) {
      lista.push({ posicao, origem: "codigo", de: cruzadoInicio, ate: cruzadoFim });
    }
  }

  return lista;
}

function melhorNoEixo(
  movel: Caixa,
  outras: Caixa[],
  pagina: Pagina,
  eixo: Eixo,
  tolerancia: number
): { ajuste: number; guias: Guia[] } {
  const meus = pontosDoEixo(movel, eixo);
  const alvos = candidatos(outras, pagina, eixo);

  let melhor: { distancia: number; ajuste: number } | null = null;
  for (const meu of meus) {
    for (const alvo of alvos) {
      const distancia = Math.abs(alvo.posicao - meu);
      if (distancia > tolerancia) continue;
      if (!melhor || distancia < melhor.distancia) {
        melhor = { distancia, ajuste: alvo.posicao - meu };
      }
    }
  }
  if (!melhor) return { ajuste: 0, guias: [] };

  // Depois de grudar, todas as coincidências exatas viram guia: alinhar a
  // borda esquerda em três códigos ao mesmo tempo tem que desenhar uma linha
  // só, atravessando os três.
  const grudados = meus.map((m) => m + melhor.ajuste);
  const guias: Guia[] = [];
  const cruzadoMovel = pontosDoEixo(
    eixo === "x"
      ? { ...movel, y: movel.y }
      : { ...movel, x: movel.x },
    eixo === "x" ? "y" : "x"
  );

  for (const alvo of alvos) {
    if (!grudados.some((g) => Math.abs(g - alvo.posicao) < 1e-6)) continue;
    const existente = guias.find(
      (g) => Math.abs(g.posicao - alvo.posicao) < 1e-6 && g.origem === alvo.origem
    );
    const de = Math.min(alvo.de, cruzadoMovel[0]);
    const ate = Math.max(alvo.ate, cruzadoMovel[2]);
    if (existente) {
      existente.de = Math.min(existente.de, de);
      existente.ate = Math.max(existente.ate, ate);
    } else {
      guias.push({ eixo, posicao: alvo.posicao, de, ate, origem: alvo.origem });
    }
  }

  return { ajuste: melhor.ajuste, guias };
}

/**
 * Onde a caixa proposta deve grudar, e que guias desenhar.
 *
 * `tolerancia` vem em milímetros já convertidos do pixel de tela por quem
 * chama, que é quem sabe o zoom.
 */
export function calcularAlinhamento(
  proposta: Caixa,
  outras: Caixa[],
  pagina: Pagina,
  tolerancia: number
): Alinhamento {
  const emX = melhorNoEixo(proposta, outras, pagina, "x", tolerancia);
  const emY = melhorNoEixo(proposta, outras, pagina, "y", tolerancia);
  return {
    ajuste: { x: emX.ajuste, y: emY.ajuste },
    guias: [...emX.guias, ...emY.guias],
  };
}

export type Alinhar =
  | "esquerda"
  | "centro-h"
  | "direita"
  | "topo"
  | "centro-v"
  | "base";

/**
 * Encosta o código na folha.
 *
 * Alinha pela caixa envolvente, então um código girado encosta pela quina que
 * de fato avança — que é o que "encostar na margem" quer dizer para quem vai
 * imprimir, e não onde estaria o canto se ele não estivesse girado.
 *
 * A posição sai quantizada em centésimo de milímetro, igual ao que o campo
 * mostra. Num código girado isso deixa a caixa a até 5 µm da margem em vez de
 * exatamente nela — o ponto de uma laser de 600 dpi tem 42 µm, então é ruído
 * abaixo do que existe no papel. Não vale trocar por uma posição de precisão
 * infinita: o campo mostraria um número diferente do que está guardado, e aí o
 * operador não consegue reproduzir digitando.
 */
function alinharNaPagina(codigo: Codigo, pagina: Pagina, como: Alinhar): Pick<Codigo, "x" | "y"> {
  const envolvente = caixaEnvolvente(codigo);
  // Distância do canto do modelo até o canto da envolvente: é o que preserva o
  // giro ao recolocar a caixa.
  const folgaX = codigo.x - envolvente.x;
  const folgaY = codigo.y - envolvente.y;

  const destinoX = {
    esquerda: 0,
    "centro-h": (pagina.largura - envolvente.largura) / 2,
    direita: pagina.largura - envolvente.largura,
  };
  const destinoY = {
    topo: 0,
    "centro-v": (pagina.altura - envolvente.altura) / 2,
    base: pagina.altura - envolvente.altura,
  };

  const arredondar = (valor: number) => Number(valor.toFixed(2));

  if (como === "esquerda" || como === "centro-h" || como === "direita") {
    return { x: arredondar(destinoX[como] + folgaX), y: codigo.y };
  }
  return { x: codigo.x, y: arredondar(destinoY[como] + folgaY) };
}

/** Dois retângulos se tocam. É o critério da seleção por área. */
export function interseccionam(a: Caixa, b: Caixa): boolean {
  return (
    a.x < b.x + b.largura &&
    a.x + a.largura > b.x &&
    a.y < b.y + b.altura &&
    a.y + a.altura > b.y
  );
}

/** Menor retângulo que contém todos os dados. */
export function uniaoDeCaixas(caixas: readonly Caixa[]): Caixa | null {
  const primeira = caixas[0];
  if (!primeira) return null;
  const x = Math.min(...caixas.map((c) => c.x));
  const y = Math.min(...caixas.map((c) => c.y));
  return {
    x,
    y,
    largura: Math.max(...caixas.map((c) => c.x + c.largura)) - x,
    altura: Math.max(...caixas.map((c) => c.y + c.altura)) - y,
  };
}

/**
 * Caixa envolvente de um conjunto de códigos.
 *
 * É a referência de "onde está a seleção": o que o contorno do grupo desenha e
 * o que o alinhamento em conjunto usa como moldura.
 */
function caixaDoConjunto(codigos: readonly Codigo[]): Caixa | null {
  return uniaoDeCaixas(codigos.map(caixaEnvolvente));
}

export interface Reposicionamento {
  id: string;
  x: number;
  y: number;
}

const duasCasas = (valor: number) => Number(valor.toFixed(2));

/**
 * Alinha um conjunto de códigos.
 *
 * Com um só selecionado, a moldura é a folha — "alinhar à esquerda" quer dizer
 * encostar na margem. Com dois ou mais, a moldura é a própria seleção: alinhar
 * à esquerda encosta todos na borda esquerda de quem está mais à esquerda, sem
 * arrastar o grupo para a margem do papel. É a distinção que todo editor faz e
 * a que corresponde à intenção nos dois casos.
 */
export function alinharConjunto(
  codigos: readonly Codigo[],
  pagina: Pagina,
  como: Alinhar
): Reposicionamento[] {
  if (codigos.length === 0) return [];
  if (codigos.length === 1) {
    const unico = codigos[0]!;
    const { x, y } = alinharNaPagina(unico, pagina, como);
    return [{ id: unico.id, x, y }];
  }

  const grupo = caixaDoConjunto(codigos)!;
  return codigos.map((codigo) => {
    const propria = caixaEnvolvente(codigo);
    // Distância do canto do modelo até o canto da envolvente: é o que preserva
    // o giro ao recolocar a caixa.
    const folgaX = codigo.x - propria.x;
    const folgaY = codigo.y - propria.y;

    switch (como) {
      case "esquerda":
        return { id: codigo.id, x: duasCasas(grupo.x + folgaX), y: codigo.y };
      case "centro-h":
        return {
          id: codigo.id,
          x: duasCasas(grupo.x + (grupo.largura - propria.largura) / 2 + folgaX),
          y: codigo.y,
        };
      case "direita":
        return {
          id: codigo.id,
          x: duasCasas(grupo.x + grupo.largura - propria.largura + folgaX),
          y: codigo.y,
        };
      case "topo":
        return { id: codigo.id, x: codigo.x, y: duasCasas(grupo.y + folgaY) };
      case "centro-v":
        return {
          id: codigo.id,
          x: codigo.x,
          y: duasCasas(grupo.y + (grupo.altura - propria.altura) / 2 + folgaY),
        };
      case "base":
        return {
          id: codigo.id,
          x: codigo.x,
          y: duasCasas(grupo.y + grupo.altura - propria.altura + folgaY),
        };
    }
  });
}

/**
 * Iguala os vãos entre os códigos selecionados, no eixo dado.
 *
 * Mantém o primeiro e o último onde estão e redistribui o que está no meio:
 * é o que "não deixar solto" quer dizer numa fileira de etiquetas, e é o único
 * jeito que não empurra a fileira inteira para um lado.
 *
 * Iguala o **vão**, não o centro. Com etiquetas de larguras diferentes as duas
 * coisas divergem, e o que a régua de corte enxerga é o espaço entre elas.
 */
export function distribuirConjunto(
  codigos: readonly Codigo[],
  eixo: Eixo
): Reposicionamento[] {
  if (codigos.length < 3) return [];

  const comCaixa = codigos
    .map((codigo) => ({ codigo, caixa: caixaEnvolvente(codigo) }))
    .sort((a, b) => (eixo === "x" ? a.caixa.x - b.caixa.x : a.caixa.y - b.caixa.y));

  const primeiro = comCaixa[0]!;
  const ultimo = comCaixa[comCaixa.length - 1]!;
  const inicio = eixo === "x" ? primeiro.caixa.x : primeiro.caixa.y;
  const fim =
    eixo === "x"
      ? ultimo.caixa.x + ultimo.caixa.largura
      : ultimo.caixa.y + ultimo.caixa.altura;

  const somaDosTamanhos = comCaixa.reduce(
    (total, { caixa }) => total + (eixo === "x" ? caixa.largura : caixa.altura),
    0
  );
  const vao = (fim - inicio - somaDosTamanhos) / (comCaixa.length - 1);

  let cursor = inicio;
  return comCaixa.map(({ codigo, caixa }) => {
    const folga = eixo === "x" ? codigo.x - caixa.x : codigo.y - caixa.y;
    const posicao = duasCasas(cursor + folga);
    cursor += (eixo === "x" ? caixa.largura : caixa.altura) + vao;
    return eixo === "x"
      ? { id: codigo.id, x: posicao, y: codigo.y }
      : { id: codigo.id, x: codigo.x, y: posicao };
  });
}
