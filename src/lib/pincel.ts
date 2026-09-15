/**
 * Pincel de ajuste do recorte: apagar o que sobrou, restaurar o que sumiu.
 *
 * Os traços são guardados como vetores, em pixels da imagem, e não como
 * pixels pintados. É o que deixa desfazer barato (uma entrada é uma lista de
 * pontos, não uma cópia da máscara) e o que permite pintar numa tela do
 * tamanho da janela e exportar na resolução cheia com o mesmo traço.
 *
 * Tudo aqui é puro: sem canvas, sem DOM. O desenho mora em pincelCanvas.ts.
 */

export type Ferramenta = "apagar" | "restaurar";

export interface Ponto {
  x: number;
  y: number;
}

/** Retângulo em pixels da imagem. */
export interface Regiao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

export interface Traco {
  ferramenta: Ferramenta;
  /** Raio em pixels da imagem, fixado no momento do traço. */
  raio: number;
  pontos: Ponto[];
  /**
   * Presente só no pincel mágico: o elemento que o traço selecionou, como
   * PNG de alfa cobrindo a `regiao`. Guardado em Blob comprimido, e não em
   * bitmap, para cem entradas de histórico não virarem centenas de MB.
   */
  magia?: { regiao: Regiao; mascara: Blob };
}

/**
 * Tamanho do pincel em pixels de tela, diâmetro.
 *
 * Em tela, e não na imagem, porque é assim que se sente: 40 px é o mesmo
 * gesto numa foto de 800 ou de 4000. O traço converte para pixels da imagem
 * quando começa, então mudar a janela depois não muda o que já foi pintado.
 */
export const TAMANHO_MINIMO = 4;
export const TAMANHO_MAXIMO = 160;

/**
 * Cada ferramenta lembra o seu tamanho. Apagar costuma ser gesto largo, de
 * limpar sobra de fundo; restaurar costuma ser fino, de devolver um fio.
 */
export const TAMANHOS_INICIAIS: Record<Ferramenta, number> = {
  apagar: 48,
  restaurar: 24,
};

export function limitarTamanho(tamanho: number): number {
  if (!Number.isFinite(tamanho)) return TAMANHO_MINIMO;
  return Math.min(TAMANHO_MAXIMO, Math.max(TAMANHO_MINIMO, Math.round(tamanho)));
}

/**
 * Um passo de `[` ou `]`: proporcional ao tamanho atual, como no Photoshop.
 * Passo fixo seria lento no pincel grande e grosseiro no pequeno.
 */
export function ajustarTamanho(atual: number, direcao: 1 | -1): number {
  const passo = Math.max(2, Math.round(atual * 0.15));
  return limitarTamanho(atual + direcao * passo);
}

/** Espaço entre carimbos, em fração do raio. Um quarto não deixa borda serrilhada. */
const ESPACAMENTO = 0.25;

/**
 * Centros dos círculos que compõem o traço.
 *
 * O traço é desenhado como uma sequência de círculos, e não como `stroke()`,
 * porque o restaurar precisa da região como área de recorte (`clip`), e uma
 * linha não é área. Com círculos, apagar e restaurar cobrem exatamente o
 * mesmo lugar. Entre dois pontos distantes — o mouse rápido pula pixels —
 * os centros são interpolados para não sobrar buraco.
 */
export function carimbos(traco: Traco): Ponto[] {
  const { pontos, raio } = traco;
  if (pontos.length === 0) return [];
  const passo = Math.max(0.5, raio * ESPACAMENTO);
  const resultado: Ponto[] = [pontos[0]];
  for (let i = 1; i < pontos.length; i++) {
    const de = pontos[i - 1];
    const para = pontos[i];
    const distancia = Math.hypot(para.x - de.x, para.y - de.y);
    const divisoes = Math.max(1, Math.ceil(distancia / passo));
    for (let d = 1; d <= divisoes; d++) {
      const t = d / divisoes;
      resultado.push({ x: de.x + (para.x - de.x) * t, y: de.y + (para.y - de.y) * t });
    }
  }
  return resultado;
}

/**
 * Acrescenta um ponto ao traço, ignorando o que está perto demais do último.
 *
 * O ponteiro dispara dezenas de eventos por segundo, e com a mão parada eles
 * repetem o mesmo lugar. Guardar só o que andou pelo menos meio espaçamento
 * mantém o histórico enxuto sem mudar o desenho.
 */
export function comPonto(traco: Traco, ponto: Ponto): Traco {
  const ultimo = traco.pontos.at(-1);
  if (ultimo) {
    const minimo = Math.max(0.5, traco.raio * ESPACAMENTO * 0.5);
    if (Math.hypot(ponto.x - ultimo.x, ponto.y - ultimo.y) < minimo) return traco;
  }
  return { ...traco, pontos: [...traco.pontos, ponto] };
}

/**
 * Posição do ponteiro em pixels da imagem.
 *
 * `caixa` é o retângulo da imagem na tela. Pontos fora dela são aceitos —
 * começar o traço um pouco para fora e entrar é o jeito natural de limpar a
 * borda —, e o canvas simplesmente não desenha o que cai fora.
 */
export function pontoNaImagem(
  cliente: { x: number; y: number },
  caixa: { left: number; top: number; width: number; height: number },
  imagem: { largura: number; altura: number }
): Ponto {
  return {
    x: ((cliente.x - caixa.left) / caixa.width) * imagem.largura,
    y: ((cliente.y - caixa.top) / caixa.height) * imagem.altura,
  };
}

export type AtalhoDoPincel = "apagar" | "restaurar" | "diminuir" | "aumentar" | "desfazer" | "refazer" | "sair";

/**
 * Teclas do pincel. `E` e `R` são as letras de apagar e restaurar em quase
 * todo editor; `[` e `]` mudam o tamanho desde o Photoshop.
 *
 * Nada passa com o foco num campo, salvo Escape: é a saída de emergência.
 */
export function reconhecerAtalhoDoPincel(evento: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  emCampo: boolean;
}): AtalhoDoPincel | null {
  const tecla = evento.key.toLowerCase();
  if (tecla === "escape") return "sair";
  if (evento.emCampo) return null;

  if (evento.metaKey || evento.ctrlKey) {
    if (tecla === "z") return evento.shiftKey ? "refazer" : "desfazer";
    if (tecla === "y") return "refazer";
    return null;
  }
  if (evento.altKey) return null;

  if (tecla === "e") return "apagar";
  if (tecla === "r") return "restaurar";
  if (tecla === "[") return "diminuir";
  if (tecla === "]") return "aumentar";
  return null;
}
