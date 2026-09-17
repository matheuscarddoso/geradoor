/**
 * Pincel mágico: em vez de pintar um círculo, seleciona o elemento que o
 * traço tocou.
 *
 * O pincel comum devolve exatamente a área pintada — numa flor sobre folhas,
 * vem flor, folha e o que mais estiver no círculo, com borda redonda. O
 * mágico recorta uma região em volta do traço, pede ao mesmo modelo do
 * recorte principal (BiRefNet, na Cloudflare) a segmentação só daquela
 * região, e fica com as partes segmentadas que o traço encostou. A borda é a
 * do modelo; o traço só diz qual elemento.
 *
 * Tudo aqui é puro, para o critério de seleção ser conferido por teste.
 */

import { mediaEmCaixa, type CodigoDaFalha, type Dimensoes, type Falha } from "./removedorDeFundo";
import { carimbos, type Regiao, type Traco } from "./pincel";

export type { Regiao };

/* -------------------------------------------------------------------------
   Região
   ------------------------------------------------------------------------- */

/**
 * Folga em volta do traço, de cada lado: metade do maior lado dele, entre um
 * piso e um teto.
 *
 * A região precisa de contexto — o modelo decide o que é elemento olhando em
 * volta — e precisa caber o elemento que o traço tocou. Mas cada pixel a mais
 * é mais candidato a "assunto principal": uma região de 68% da foto, que um
 * traço largo gerava com a folga antiga, trazia estacas, dálias vermelhas ao
 * fundo e a manga, e as flores que se queria incluir perdiam a disputa.
 *
 * Mais justa que isto também não serve: medido, uma região colada ao traço
 * não tem contexto, e o modelo devolve dúvida em vez de segmentação.
 */
const FOLGA_RELATIVA = 0.5;
const FOLGA_MINIMA = 96;
const FOLGA_MAXIMA = 240;

/**
 * Lado mínimo da região, em pixels da imagem. Com menos, um toque rápido numa
 * flor de 400 px a mandava cortada ao modelo.
 */
const LADO_MINIMO = 512;

/**
 * Região da imagem em volta do traço: retangular, justa ao traço com folga,
 * dentro da imagem e em pixels inteiros.
 *
 * Retangular, e não quadrada: um traço horizontal sobre uma fileira de flores
 * não precisa arrastar para dentro da região o céu e o chão.
 */
export function regiaoDoTraco(traco: Traco, imagem: Dimensoes): Regiao {
  const centros = carimbos(traco);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { x, y } of centros) {
    minX = Math.min(minX, x - traco.raio);
    minY = Math.min(minY, y - traco.raio);
    maxX = Math.max(maxX, x + traco.raio);
    maxY = Math.max(maxY, y + traco.raio);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, largura: imagem.largura, altura: imagem.altura };

  const larguraDoTraco = maxX - minX;
  const alturaDoTraco = maxY - minY;
  const folga = Math.min(FOLGA_MAXIMA, Math.max(FOLGA_MINIMA, Math.max(larguraDoTraco, alturaDoTraco) * FOLGA_RELATIVA));

  const largura = Math.min(imagem.largura, Math.round(Math.max(LADO_MINIMO, larguraDoTraco + 2 * folga)));
  const altura = Math.min(imagem.altura, Math.round(Math.max(LADO_MINIMO, alturaDoTraco + 2 * folga)));
  const centroX = (minX + maxX) / 2;
  const centroY = (minY + maxY) / 2;
  // Encostada na borda da imagem, a região desliza para dentro em vez de
  // encolher: continua com o mesmo contexto.
  const x = Math.min(imagem.largura - largura, Math.max(0, Math.round(centroX - largura / 2)));
  const y = Math.min(imagem.altura - altura, Math.max(0, Math.round(centroY - altura / 2)));
  return { x, y, largura, altura };
}

/**
 * A área pintada, rasterizada na grade da máscara da região: 1 onde o pincel
 * passou, 0 fora. É a semente da seleção.
 */
export function pegadaNaGrade(traco: Traco, regiao: Regiao, grade: Dimensoes): Uint8Array {
  const pegada = new Uint8Array(grade.largura * grade.altura);
  const escalaX = grade.largura / regiao.largura;
  const escalaY = grade.altura / regiao.altura;
  const raio = Math.max(0.75, traco.raio * Math.min(escalaX, escalaY));
  const raio2 = raio * raio;

  for (const centro of carimbos(traco)) {
    const cx = (centro.x - regiao.x) * escalaX;
    const cy = (centro.y - regiao.y) * escalaY;
    const x0 = Math.max(0, Math.floor(cx - raio));
    const x1 = Math.min(grade.largura - 1, Math.ceil(cx + raio));
    const y0 = Math.max(0, Math.floor(cy - raio));
    const y1 = Math.min(grade.altura - 1, Math.ceil(cy + raio));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= raio2) pegada[y * grade.largura + x] = 1;
      }
    }
  }
  return pegada;
}

/**
 * Distância de cada pixel até o pixel pintado mais próximo, em pixels.
 *
 * Transformada chanfrada 3-4 em duas passadas: O(n), sem raiz quadrada, e a
 * menos de 8% da distância euclidiana — sobra precisão para ampliar a pegada
 * na busca da semente. Pixels pintados valem 0.
 */
export function distanciaAtePegada(pegada: ArrayLike<number>, grade: Dimensoes): Float32Array {
  const { largura, altura } = grade;
  const LONGE = 1e9;
  const d = new Float32Array(largura * altura);
  for (let i = 0; i < d.length; i++) d[i] = pegada[i] ? 0 : LONGE;

  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      let v = d[i];
      if (x > 0) v = Math.min(v, d[i - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[i - largura] + 3);
        if (x > 0) v = Math.min(v, d[i - largura - 1] + 4);
        if (x < largura - 1) v = Math.min(v, d[i - largura + 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let y = altura - 1; y >= 0; y--) {
    for (let x = largura - 1; x >= 0; x--) {
      const i = y * largura + x;
      let v = d[i];
      if (x < largura - 1) v = Math.min(v, d[i + 1] + 3);
      if (y < altura - 1) {
        v = Math.min(v, d[i + largura] + 3);
        if (x < largura - 1) v = Math.min(v, d[i + largura + 1] + 4);
        if (x > 0) v = Math.min(v, d[i + largura - 1] + 4);
      }
      d[i] = v;
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/* -------------------------------------------------------------------------
   Seleção
   ------------------------------------------------------------------------- */

/**
 * Quanto em volta do traço vale procurar a semente, em raios do pincel.
 *
 * O modelo marca como fundo o que não é o elemento — caule, botão, o miolo
 * escuro de uma flor. Um traço que passe só por aí não acharia semente
 * nenhuma, embora a flor esteja a meio pincel de distância. Meio raio a mais
 * cobre a imprecisão natural da mão.
 */
export const BUSCA_DE_SEMENTE_EM_RAIOS = 0.5;

/**
 * Certeza mínima para um pixel ser semente ou miolo do elemento: 50%.
 *
 * Fixa, de propósito. Uma versão anterior baixava o limiar até a metade da
 * maior certeza sob o traço, para achar flores em que o modelo hesitava — e
 * quando ele não via elemento nenhum, o que passava eram fragmentos de ruído
 * a 25% de certeza espalhados pela foto. Medido: 132 pedaços de 6 px.
 */
const LIMIAR = 128;

/** Até onde a borda suave do modelo acompanha o elemento, em pixels da grade. */
const RAIO_DA_BORDA = 2;

/** Faixa de alfa que conta como dúvida do modelo. */
const DUVIDA_MINIMA = 40;
const DUVIDA_MAXIMA = 215;

/**
 * Fração máxima da máscara em dúvida para ela valer como segmentação.
 *
 * Quando o modelo acha o elemento, a máscara é quase binária: nas regiões
 * medidas com elemento claro, de 0,3% a 4% dos pixels ficaram em tom
 * intermediário. Quando não acha, devolve um cinza granulado — de 77% a 99%.
 * Um quarto separa os dois com folga larga.
 */
const DUVIDA_TOLERADA = 0.25;

/** Se a máscara é uma segmentação de verdade, e não o modelo em dúvida. */
export function mascaraConfiavel(mascara: ArrayLike<number>): boolean {
  let duvida = 0;
  for (let i = 0; i < mascara.length; i++) {
    if (mascara[i] > DUVIDA_MINIMA && mascara[i] < DUVIDA_MAXIMA) duvida++;
  }
  return mascara.length > 0 && duvida / mascara.length <= DUVIDA_TOLERADA;
}

/**
 * O elemento que o traço tocou, com a borda suave do modelo.
 *
 * `mascara` é o alfa que o modelo devolveu para a região (0 a 255). As partes
 * acima do `limiar` que encostam na pegada são o elemento, achado por
 * preenchimento a partir delas; partes segmentadas que o traço não tocou —
 * a flor do lado, que ninguém pediu — ficam de fora.
 *
 * Os pixels de borda, abaixo do limiar mas colados ao elemento, entram com o
 * alfa que o modelo deu: é o que mantém a borda macia em vez de serrilhada.
 *
 * Devolve `null` quando o traço não encostou em nada que o modelo considere
 * elemento, ou quando o que encostou é pequeno demais para ser um.
 */
export function selecionarElemento(
  mascara: ArrayLike<number>,
  grade: Dimensoes,
  pegada: ArrayLike<number>,
  limiar = LIMIAR,
  /** Menor elemento aceito, em pixels da grade. Abaixo disto é ruído. */
  areaMinima = 1
): Uint8Array | null {
  const { largura, altura } = grade;
  const total = largura * altura;
  if (mascara.length !== total || pegada.length !== total) {
    throw new RangeError("Máscara, pegada e grade não batem");
  }

  const noElemento = new Uint8Array(total);
  // Cada pixel entra na pilha no máximo uma vez, porque é marcado antes.
  const pilha = new Int32Array(total);
  let topo = 0;

  for (let i = 0; i < total; i++) {
    if (pegada[i] && mascara[i] >= limiar) {
      noElemento[i] = 1;
      pilha[topo++] = i;
    }
  }
  if (topo === 0) return null;

  let area = topo;
  while (topo > 0) {
    const i = pilha[--topo];
    const x = i % largura;
    const vizinhos = [x > 0 ? i - 1 : -1, x < largura - 1 ? i + 1 : -1, i - largura, i + largura];
    for (const j of vizinhos) {
      if (j >= 0 && j < total && !noElemento[j] && mascara[j] >= limiar) {
        noElemento[j] = 1;
        pilha[topo++] = j;
        area++;
      }
    }
  }
  if (area < areaMinima) return null;

  const resultado = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (noElemento[i]) {
      resultado[i] = mascara[i];
      continue;
    }
    if (mascara[i] === 0) continue;
    // Borda: fora do elemento, mas com alfa e colada nele.
    const x = i % largura;
    const y = (i - x) / largura;
    let colado = false;
    for (let dy = -RAIO_DA_BORDA; dy <= RAIO_DA_BORDA && !colado; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= altura) continue;
      for (let dx = -RAIO_DA_BORDA; dx <= RAIO_DA_BORDA; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < largura && noElemento[yy * largura + xx]) {
          colado = true;
          break;
        }
      }
    }
    if (colado) resultado[i] = mascara[i];
  }
  return resultado;
}

/** Largura do esmaecimento na borda da região, em fração do lado dela. */
const FAIXA_DE_ESMAECIMENTO = 0.04;

/**
 * Esmaece a seleção junto das bordas da região que ficam dentro da imagem.
 *
 * Se o elemento continua além da região, a seleção termina ali — e um corte
 * reto no meio de uma pétala é a primeira coisa que o olho vê. Numa faixa
 * estreita a seleção vai a zero em degradê. Nas bordas da região que coincidem
 * com a borda da foto não há o que esmaecer: o elemento acaba ali de verdade.
 */
export function esmaecerBordasInternas(
  selecao: Uint8Array,
  grade: Dimensoes,
  internas: { esquerda: boolean; direita: boolean; topo: boolean; base: boolean }
): Uint8Array {
  const { largura, altura } = grade;
  const faixa = Math.max(2, Math.round(Math.max(largura, altura) * FAIXA_DE_ESMAECIMENTO));
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const i = y * largura + x;
      if (selecao[i] === 0) continue;
      let distancia = Infinity;
      if (internas.esquerda) distancia = Math.min(distancia, x);
      if (internas.direita) distancia = Math.min(distancia, largura - 1 - x);
      if (internas.topo) distancia = Math.min(distancia, y);
      if (internas.base) distancia = Math.min(distancia, altura - 1 - y);
      if (distancia < faixa) selecao[i] = Math.round(selecao[i] * (distancia / faixa));
    }
  }
  return selecao;
}

/**
 * O elemento que um traço mágico selecionou, a partir da máscara que o modelo
 * devolveu para a região. É o passo inteiro, puro, para ser testado de ponta
 * a ponta sem canvas: o worker só lê a máscara e grava o resultado.
 *
 * 1. Máscara em dúvida — o cinza granulado de quando o modelo não vê objeto —
 *    não vira seleção.
 * 2. A pegada do traço, ampliada em meio raio, é onde se procura a semente.
 * 3. O elemento inteiro conectado à semente é selecionado, com a borda do
 *    modelo, desde que tenha tamanho de elemento e não de ruído.
 * 4. Onde a região corta a foto no meio, a seleção esmaece em vez de terminar reta.
 *
 * Nulo quando não há um elemento definido perto do traço: quem chama aplica o
 * traço como pincel comum.
 */
export function elementoDoTraco(
  mascara: ArrayLike<number>,
  grade: Dimensoes,
  traco: Traco,
  regiao: Regiao,
  imagem: Dimensoes
): Uint8Array | null {
  if (!mascaraConfiavel(mascara)) return null;

  const pegada = pegadaNaGrade(traco, regiao, grade);
  const raioNaGrade = traco.raio * Math.min(grade.largura / regiao.largura, grade.altura / regiao.altura);
  const busca = Math.max(1, raioNaGrade * BUSCA_DE_SEMENTE_EM_RAIOS);
  const distancia = distanciaAtePegada(pegada, grade);
  const ampliada = new Uint8Array(pegada.length);
  let areaDaPegada = 0;
  for (let i = 0; i < ampliada.length; i++) {
    ampliada[i] = distancia[i] <= busca ? 1 : 0;
    areaDaPegada += pegada[i];
  }

  // Um elemento menor que um vigésimo do que se pintou não é o que se pintou.
  const areaMinima = Math.max(64, Math.round(areaDaPegada * 0.05));
  const selecao = selecionarElemento(mascara, grade, ampliada, LIMIAR, areaMinima);
  if (!selecao) return null;

  esmaecerBordasInternas(selecao, grade, {
    esquerda: regiao.x > 0,
    direita: regiao.x + regiao.largura < imagem.largura,
    topo: regiao.y > 0,
    base: regiao.y + regiao.altura < imagem.altura,
  });
  // Alfa de 1 a 3 não se vê, mas vira pixel solto no PNG de quem abre num
  // editor. O recorte principal já zera essa faixa; a seleção zera também.
  for (let i = 0; i < selecao.length; i++) if (selecao[i] < 4) selecao[i] = 0;
  return selecao;
}

/**
 * Por que o pincel mágico recuou e o traço virou pincel comum.
 *
 * O traço nunca é jogado fora: quem pintou recebe o que pintou, com um aviso
 * do porquê, e desfaz se não quiser. Descartar em silêncio — ou com um erro
 * e nada na tela — faz a ferramenta parecer quebrada.
 *
 * Aqui sai o motivo, não a frase: quem monta o texto é o gancho, que sabe em
 * que língua a página está.
 */
export type RecuoDoPincel =
  | { tipo: "sem-elemento" }
  | { tipo: "modo-leve" }
  | { tipo: "depois-da-falha"; codigo: CodigoDaFalha };

export function avisoDeRecuo(
  motivo: { tipo: "sem-elemento" } | { tipo: "falha"; falha: Falha }
): RecuoDoPincel {
  if (motivo.tipo === "sem-elemento") return { tipo: "sem-elemento" };
  if (motivo.falha.modoLeve) return { tipo: "modo-leve" };
  return { tipo: "depois-da-falha", codigo: motivo.falha.codigo };
}

/* -------------------------------------------------------------------------
   Ocultar o que já está no recorte
   ------------------------------------------------------------------------- */

/** Alfa a partir do qual um pixel da região conta como já incluído no recorte. */
const JA_INCLUIDO = 128;

/**
 * Preenche os buracos de uma imagem com as cores em volta, por push-pull.
 *
 * Pirâmide de médias ponderadas pela presença (Gortler et al., "The
 * Lumigraph", 1996): desce reduzindo pela metade até não sobrar buraco, e
 * sobe completando cada nível com o nível mais grosso. O resultado é um
 * degradê contínuo das cores das bordas, sem blocos nem contorno — uma
 * primeira versão por média de raio fixo deixava retângulos chapados nos
 * buracos grandes, e o modelo recortava a silhueta deles como objeto.
 *
 * `peso` é 1 onde o pixel vale e 0 onde é buraco. Escreve no próprio RGBA.
 */
export function preencherBuracos(rgba: Uint8ClampedArray, peso: Float32Array, grade: Dimensoes): void {
  const niveis: Array<{ largura: number; altura: number; cor: Float32Array; peso: Float32Array }> = [];
  let largura = grade.largura;
  let altura = grade.altura;
  let cor = new Float32Array(largura * altura * 3);
  let pesoAtual = Float32Array.from(peso);
  for (let i = 0; i < largura * altura; i++) {
    for (let c = 0; c < 3; c++) cor[i * 3 + c] = rgba[i * 4 + c] * pesoAtual[i];
  }
  niveis.push({ largura, altura, cor, peso: pesoAtual });

  // Descida: soma 2 × 2 de cor ponderada e de peso.
  while (largura > 1 || altura > 1) {
    const l2 = Math.max(1, Math.ceil(largura / 2));
    const a2 = Math.max(1, Math.ceil(altura / 2));
    const cor2 = new Float32Array(l2 * a2 * 3);
    const peso2 = new Float32Array(l2 * a2);
    for (let y = 0; y < altura; y++) {
      for (let x = 0; x < largura; x++) {
        const i = y * largura + x;
        const j = (y >> 1) * l2 + (x >> 1);
        peso2[j] += pesoAtual[i];
        for (let c = 0; c < 3; c++) cor2[j * 3 + c] += cor[i * 3 + c];
      }
    }
    largura = l2;
    altura = a2;
    cor = cor2;
    pesoAtual = peso2;
    niveis.push({ largura, altura, cor, peso: pesoAtual });
  }

  // Normaliza cada nível para cor média e peso limitado a 1.
  for (const nivel of niveis) {
    for (let i = 0; i < nivel.largura * nivel.altura; i++) {
      const p = nivel.peso[i];
      for (let c = 0; c < 3; c++) nivel.cor[i * 3 + c] = p > 0 ? nivel.cor[i * 3 + c] / p : 0;
      nivel.peso[i] = Math.min(1, p);
    }
  }

  // Subida: o que falta em cada nível vem do nível de cima, interpolado.
  for (let n = niveis.length - 2; n >= 0; n--) {
    const fino = niveis[n];
    const grosso = niveis[n + 1];
    for (let y = 0; y < fino.altura; y++) {
      const gy = Math.min(grosso.altura - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
      const y0 = Math.floor(gy);
      const y1 = Math.min(grosso.altura - 1, y0 + 1);
      const fy = gy - y0;
      for (let x = 0; x < fino.largura; x++) {
        const i = y * fino.largura + x;
        const p = fino.peso[i];
        if (p >= 1) continue;
        const gx = Math.min(grosso.largura - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const x0 = Math.floor(gx);
        const x1 = Math.min(grosso.largura - 1, x0 + 1);
        const fx = gx - x0;
        for (let c = 0; c < 3; c++) {
          const v00 = grosso.cor[(y0 * grosso.largura + x0) * 3 + c];
          const v10 = grosso.cor[(y0 * grosso.largura + x1) * 3 + c];
          const v01 = grosso.cor[(y1 * grosso.largura + x0) * 3 + c];
          const v11 = grosso.cor[(y1 * grosso.largura + x1) * 3 + c];
          const interpolada = (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
          fino.cor[i * 3 + c] = fino.cor[i * 3 + c] * p + interpolada * (1 - p);
        }
        fino.peso[i] = 1;
      }
    }
  }

  const base = niveis[0];
  for (let i = 0; i < grade.largura * grade.altura; i++) {
    if (peso[i] >= 1) continue;
    for (let c = 0; c < 3; c++) rgba[i * 4 + c] = base.cor[i * 3 + c];
  }
}

/**
 * Tira da região o que já está no recorte, antes de mandá-la ao modelo.
 *
 * O modelo recorta "o assunto principal" da imagem que recebe. Para restaurar
 * algo que ainda não está no recorte — as flores de baixo —, a região em volta
 * do traço costuma pegar também o assunto já recortado — a dália na mão,
 * nítida —, e o modelo escolhe ele de novo. Com o que já está no recorte
 * substituído pelas cores do fundo em volta, o assunto principal da região
 * passa a ser o que falta incluir.
 *
 * O que já está no recorte é dilatado antes de virar buraco, para a franja
 * clara das pétalas não sobrar como contorno em volta do preenchimento.
 *
 * Escreve no próprio buffer RGBA da região.
 */
export function ocultarOQueJaFicou(rgba: Uint8ClampedArray, alfaAtual: ArrayLike<number>, grade: Dimensoes): void {
  const { largura, altura } = grade;
  const total = largura * altura;
  if (rgba.length !== total * 4 || alfaAtual.length !== total) {
    throw new RangeError("Buffers e grade não batem");
  }

  const presenca = new Float32Array(total);
  let temRecorte = false;
  for (let i = 0; i < total; i++) {
    if (alfaAtual[i] >= JA_INCLUIDO) {
      presenca[i] = 1;
      temRecorte = true;
    }
  }
  if (!temRecorte) return;

  const dilatado = mediaEmCaixa(presenca, grade, Math.max(2, Math.round(Math.max(largura, altura) / 96)));
  const peso = new Float32Array(total);
  let temFundo = false;
  for (let i = 0; i < total; i++) {
    if (dilatado[i] === 0) {
      peso[i] = 1;
      temFundo = true;
    }
  }
  // Região inteira já recortada: não há o que puxar, e nada a incluir ali.
  if (!temFundo) return;
  preencherBuracos(rgba, peso, grade);
}
