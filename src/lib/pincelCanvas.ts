import { carimbos, type Traco } from "./pincel";

type Contexto = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Máscaras dos traços mágicos já decodificadas, pela Blob de origem. A
 * decodificação é assíncrona e o desenho não pode ser: quem desenha resolve
 * as máscaras antes e passa o mapa.
 */
export type MascarasDecodificadas = ReadonlyMap<Blob, CanvasImageSource>;

const SEM_MASCARAS: MascarasDecodificadas = new Map();

/**
 * Traço mágico: aplica o elemento selecionado, e não a área pintada.
 *
 * - Restaurar: a foto original, recortada pela máscara do elemento, é
 *   desenhada por cima. Precisa de um canvas intermediário do tamanho da
 *   região — o `destination-in` aplicado direto no canvas principal apagaria
 *   tudo fora da máscara, inclusive o recorte que já estava ali.
 * - Apagar: `destination-out` com a própria máscara tira o elemento, na
 *   medida do alfa dela, sem tocar em mais nada.
 */
function desenharTracoMagico(
  ctx: Contexto,
  traco: Traco,
  escala: number,
  original: CanvasImageSource,
  mascara: CanvasImageSource
) {
  if (!traco.magia) return;
  const { x, y, largura, altura } = traco.magia.regiao;
  const destino = { x: x * escala, y: y * escala, largura: largura * escala, altura: altura * escala };

  ctx.save();
  ctx.imageSmoothingQuality = "high";
  if (traco.ferramenta === "apagar") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(mascara, destino.x, destino.y, destino.largura, destino.altura);
  } else {
    const camada = new OffscreenCanvas(Math.max(1, Math.round(destino.largura)), Math.max(1, Math.round(destino.altura)));
    const ctxDaCamada = camada.getContext("2d");
    if (ctxDaCamada) {
      ctxDaCamada.imageSmoothingQuality = "high";
      ctxDaCamada.drawImage(original, x, y, largura, altura, 0, 0, camada.width, camada.height);
      ctxDaCamada.globalCompositeOperation = "destination-in";
      ctxDaCamada.drawImage(mascara, 0, 0, camada.width, camada.height);
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(camada, destino.x, destino.y, destino.largura, destino.altura);
      camada.width = camada.height = 0;
    }
  }
  ctx.restore();
}

/**
 * Desenha um traço por cima do recorte já pintado no contexto.
 *
 * A mesma função serve à tela, em resolução de janela, e ao download, em
 * resolução cheia dentro do worker. Só a `escala` muda — pixels do canvas
 * por pixel da imagem —, então o que se vê é o que se baixa.
 *
 * - Apagar: `destination-out` tira alfa onde o círculo passa.
 * - Restaurar: a região do traço vira área de recorte e a foto original é
 *   desenhada dentro dela, opaca. Devolve o pixel inteiro, com a cor que a
 *   câmera registrou, que é o que se quer ao trazer de volta um brinco ou uma
 *   mão que o modelo comeu.
 * - Mágico, em qualquer das duas: ver `desenharTracoMagico`.
 *
 * `aPartirDe` desenha só os carimbos novos de um traço em andamento: o canvas
 * já tem o começo dele, e redesenhar o traço inteiro a cada movimento do
 * ponteiro custaria mais a cada segundo de pincelada.
 */
export function desenharTraco(
  ctx: Contexto,
  traco: Traco,
  escala: number,
  original: CanvasImageSource,
  imagem: { largura: number; altura: number },
  aPartirDe = 0,
  mascaras: MascarasDecodificadas = SEM_MASCARAS
) {
  if (traco.magia) {
    const mascara = mascaras.get(traco.magia.mascara);
    if (mascara) desenharTracoMagico(ctx, traco, escala, original, mascara);
    return;
  }

  const centros = carimbos(traco).slice(aPartirDe);
  if (centros.length === 0) return;

  const raio = traco.raio * escala;
  const caminho = new Path2D();
  for (const { x, y } of centros) {
    const cx = x * escala;
    const cy = y * escala;
    caminho.moveTo(cx + raio, cy);
    caminho.arc(cx, cy, raio, 0, Math.PI * 2);
  }

  ctx.save();
  if (traco.ferramenta === "apagar") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fill(caminho);
  } else {
    ctx.clip(caminho);
    ctx.globalCompositeOperation = "source-over";
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(original, 0, 0, imagem.largura * escala, imagem.altura * escala);
  }
  ctx.restore();
}

/**
 * Só a marca do traço, sem aplicar nada: é o destaque que aparece enquanto o
 * pincel mágico é arrastado e processado. Vermelho para apagar, verde para
 * restaurar, a convenção de todo editor de máscara.
 */
export function desenharMarcaDoTraco(ctx: Contexto, traco: Traco, escala: number, aPartirDe = 0) {
  const centros = carimbos(traco).slice(aPartirDe);
  if (centros.length === 0) return;
  const raio = traco.raio * escala;
  const caminho = new Path2D();
  for (const { x, y } of centros) {
    caminho.moveTo(x * escala + raio, y * escala);
    caminho.arc(x * escala, y * escala, raio, 0, Math.PI * 2);
  }
  ctx.save();
  // Opaco no canvas de marca; a transparência vem do CSS do canvas inteiro,
  // para as sobreposições do traço não escurecerem onde os círculos cruzam.
  ctx.fillStyle = traco.ferramenta === "apagar" ? "rgb(239 68 68)" : "rgb(34 197 94)";
  ctx.fill(caminho);
  ctx.restore();
}

/** O recorte com todos os traços, do zero. */
export function desenharRecorteEditado(
  ctx: Contexto,
  recorte: CanvasImageSource,
  original: CanvasImageSource,
  tracos: readonly Traco[],
  imagem: { largura: number; altura: number },
  escala: number,
  mascaras: MascarasDecodificadas = SEM_MASCARAS
) {
  ctx.save();
  ctx.globalCompositeOperation = "copy";
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(recorte, 0, 0, imagem.largura * escala, imagem.altura * escala);
  ctx.restore();
  for (const traco of tracos) desenharTraco(ctx, traco, escala, original, imagem, 0, mascaras);
}
