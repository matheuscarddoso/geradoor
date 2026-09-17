/**
 * Regras do removedor de fundo que não dependem de navegador.
 *
 * Tudo que decide alguma coisa — que arquivo entra, em que tamanho a imagem é
 * trabalhada, como os pixels viram a entrada do modelo e como a saída vira
 * máscara — mora aqui, e não no worker, para poder ser conferido por teste
 * sem canvas e sem carregar o modelo.
 */

import type { Regiao, Traco } from "./pincel";

/**
 * Endereço do Worker da Cloudflare que faz o recorte principal.
 *
 * O recorte de verdade é o do Cloudflare Images com `segment=foreground`, que
 * roda o BiRefNet — um modelo grande demais para o navegador, que estourou a
 * memória em máquinas de 8 GB quando rodou aqui. O código do Worker está em
 * workers/removedor-de-fundo. A variável permite apontar para outro deploy
 * sem mexer no código; o endereço não é segredo.
 */
export const REMOVEDOR_URL =
  process.env.NEXT_PUBLIC_REMOVEDOR_URL ?? "https://geradoor-removedor-de-fundo.mathuscardoso.workers.dev/";

/**
 * Lado maior da cópia enviada à Cloudflare.
 *
 * O BiRefNet decide em 1024 px; mandar a foto de 12 MP inteira só deixaria o
 * upload lento no 4G sem ganho de borda. 2048 dá folga de sobra, e a máscara
 * que volta é aplicada na foto original, que nunca perde resolução.
 */
export const LADO_MAXIMO_DE_ENVIO = 2048;

/** Tamanho da cópia de envio: a própria imagem se couber, senão reduzida sem distorcer. */
export function dimensoesDeEnvio(original: Dimensoes, ladoMaximo = LADO_MAXIMO_DE_ENVIO): Dimensoes {
  const maior = Math.max(original.largura, original.altura);
  if (maior <= ladoMaximo) return { largura: original.largura, altura: original.altura };
  const escala = ladoMaximo / maior;
  return {
    largura: Math.max(1, Math.round(original.largura * escala)),
    altura: Math.max(1, Math.round(original.altura * escala)),
  };
}

/**
 * Por que o recorte completo não veio.
 *
 * Código, e não a frase pronta: o site fala duas línguas e esta função é pura.
 * Quem exibe — o gancho, que tem acesso ao dicionário — é que traduz. Antes a
 * frase em português nascia aqui e chegava intacta à página em inglês.
 */
export type CodigoDaFalha =
  | "cota-do-mes"
  | "cota-do-dia"
  | "limite-do-ip"
  | "fora-do-ar"
  | "ritmo"
  | "imagem-ilegivel"
  | "imagem-grande";

export type Falha =
  | { modoLeve: true; codigo: CodigoDaFalha }
  | { modoLeve: false; codigo: CodigoDaFalha };

/**
 * O que fazer quando a Cloudflare não devolve o recorte.
 *
 * Regra: se o problema é do serviço — cota, fora do ar, sem rede, origem não
 * cadastrada num deploy de preview —, a pessoa não tem culpa nem o que fazer,
 * então o modo leve assume e ela recebe um recorte com um aviso honesto. Se o
 * problema é da imagem ou do ritmo de envio, o modo leve não resolveria nada
 * de diferente, e o certo é dizer o que aconteceu.
 */
export function interpretarFalha(status: number | null, motivo: string | null): Falha {
  switch (motivo) {
    case "cota":
      return { modoLeve: true, codigo: "cota-do-mes" };
    case "cota-diaria":
      return { modoLeve: true, codigo: "cota-do-dia" };
    case "limite-ip-dia":
      return { modoLeve: true, codigo: "limite-do-ip" };
    case "limite":
      return { modoLeve: false, codigo: "ritmo" };
    case "formato":
    case "imagem":
      return { modoLeve: false, codigo: "imagem-ilegivel" };
    case "tamanho":
      return { modoLeve: false, codigo: "imagem-grande" };
  }
  if (status === 429) {
    return { modoLeve: false, codigo: "ritmo" };
  }
  // Sem rede (status nulo), origem recusada, 5xx ou resposta que não se
  // entende: tudo isso é do serviço.
  return { modoLeve: true, codigo: "fora-do-ar" };
}

/**
 * Modo leve: dois modelos pequenos, os dois Apache 2.0, servidos pelo próprio
 * site. Só entram quando a Cloudflare não está disponível.
 *
 * Nenhum modelo leve recorta bem tudo. O U²-Netp acha qualquer objeto em
 * destaque, mas decide em 320 px: em gente, o cabelo sai em blocos e roupa
 * escura some. O MODNet foi treinado só com pessoas e trabalha em 512 px, e
 * aí o cabelo sai fio a fio; num relógio, ele devolve lixo. Os dois juntos
 * somam 11 MB, menos que qualquer modelo grande sozinho, e rodam em pouco
 * mais de um segundo.
 *
 * A escolha entre eles é automática (ver `ehPessoa`). Modelos grandes, como o
 * BiRefNet, ficaram de fora por memória: estouravam o heap do WASM e o limite
 * de storage buffers da GPU da Apple, e no Safari derrubavam a aba.
 *
 * Moram em /public com versão no nome, em vez de virem do Hub: os
 * repositórios são de terceiros e o arquivo poderia mudar por baixo. O hash
 * garante que o que roda é o arquivo que foi conferido.
 */
export const MODELOS = {
  objeto: {
    url: "/modelos/u2netp-v1.onnx",
    sha256: "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8",
  },
  pessoa: {
    url: "/modelos/modnet-q-v1.onnx",
    sha256: "92e49898c3e05a6d7a944fc67a8cb87c4aad754ffb6ebd949528c7d1105fee3a",
  },
} as const;

/** Lado da entrada do U²-Netp, em pixels. Fixo no grafo do ONNX. */
export const LADO_DO_U2NETP = 320;

/** Lado menor da entrada do MODNet, como no preprocessor_config.json. */
const LADO_MENOR_DO_MODNET = 512;

/**
 * Tamanho da entrada do MODNet: lado menor em 512, proporção mantida, os dois
 * lados múltiplos de 32 — a rede reduz a imagem cinco vezes pela metade, e um
 * lado que não divide por 32 desalinha as camadas.
 */
export function dimensoesDoModnet(original: Dimensoes): Dimensoes {
  const escala = LADO_MENOR_DO_MODNET / Math.min(original.largura, original.altura);
  const multiplo = (valor: number) => Math.max(32, Math.round((valor * escala) / 32) * 32);
  return { largura: multiplo(original.largura), altura: multiplo(original.altura) };
}

/**
 * A saída tem a resolução da entrada. Não há teto de qualidade: os únicos
 * limites são os técnicos, de quando o navegador simplesmente não consegue.
 *
 * - WebKit no iPhone e no iPad: canvas acima de 16.777.216 px (4096²) não dá
 *   erro — devolve imagem em branco. Aí, e só aí, a imagem é reduzida, e a
 *   página diz que foi.
 * - Demais navegadores: 64 MP, que cobre câmera de 48 e de 50 MP com folga. O
 *   canvas aguentaria mais, mas cada megapixel custa 4 MB por cópia, e a
 *   imagem precisa de algumas cópias vivas durante o recorte.
 *
 * Uma versão anterior reduzia tudo acima de 12 MP para economizar memória: uma
 * foto de 21 MP saía com 12. A memória agora é economizada onde não custa
 * qualidade — a tela usa prévias, e só a exportação toca a resolução cheia.
 */
export const LIMITE_DE_PIXELS_IOS = 16_777_216;
export const LIMITE_DE_PIXELS_PADRAO = 64_000_000;

export function limiteDePixels(ambiente: { ios: boolean }): number {
  return ambiente.ios ? LIMITE_DE_PIXELS_IOS : LIMITE_DE_PIXELS_PADRAO;
}

/**
 * 80 MB. Uma foto de 48 MP em JPEG passa de 20 MB, e em PNG passa de 60 MB;
 * o teto só barra o que não é foto.
 */
export const MAX_BYTES = 80 * 1024 * 1024;

export const TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type Validacao = { ok: true } | { ok: false; motivo: string };

export function validarArquivo(arquivo: { type: string; size: number }): Validacao {
  if (!(TIPOS_ACEITOS as readonly string[]).includes(arquivo.type)) {
    // HEIC é o caso comum aqui: o iPhone salva nele, e só o Safari decodifica.
    return { ok: false, motivo: "Use uma imagem JPG, PNG, WEBP ou AVIF" };
  }
  if (arquivo.size === 0) {
    return { ok: false, motivo: "Esse arquivo está vazio" };
  }
  if (arquivo.size > MAX_BYTES) {
    return { ok: false, motivo: "A imagem precisa ter até 80 MB" };
  }
  return { ok: true };
}

export interface Dimensoes {
  largura: number;
  altura: number;
}

/**
 * Tamanho em que a imagem é trabalhada e exportada.
 *
 * Preserva o original sempre que o navegador aguenta. Quando não aguenta,
 * reduz mantendo a proporção, com arredondamento para baixo: arredondar para
 * cima podia passar do limite por um pixel, que é justamente o que faz o
 * canvas do iOS devolver imagem em branco.
 */
export function dimensoesDeTrabalho(
  original: Dimensoes,
  maxPixels: number = LIMITE_DE_PIXELS_PADRAO
): Dimensoes & { reduzida: boolean } {
  const { largura, altura } = original;
  if (largura <= 0 || altura <= 0) {
    throw new RangeError("Dimensões precisam ser positivas");
  }
  if (largura * altura <= maxPixels) {
    return { largura, altura, reduzida: false };
  }
  const escala = Math.sqrt(maxPixels / (largura * altura));
  return {
    largura: Math.max(1, Math.floor(largura * escala)),
    altura: Math.max(1, Math.floor(altura * escala)),
    reduzida: true,
  };
}

export interface Normalizacao {
  media: readonly [number, number, number];
  desvio: readonly [number, number, number];
}

/** A do treino do U²-Net: média e desvio do ImageNet. */
export const NORMALIZACAO_U2NETP: Normalizacao = {
  media: [0.485, 0.456, 0.406],
  desvio: [0.229, 0.224, 0.225],
};

/** A do treino do MODNet: tudo levado para -1 a 1. */
export const NORMALIZACAO_MODNET: Normalizacao = {
  media: [0.5, 0.5, 0.5],
  desvio: [0.5, 0.5, 0.5],
};

/**
 * Pixels RGBA intercalados para o tensor do modelo: float32, canais
 * separados (CHW), normalizados.
 *
 * O alfa é ignorado. Um PNG com transparência chega com o fundo transparente
 * em preto, o que é o que o modelo esperaria ver de qualquer jeito.
 *
 * `destino` permite reaproveitar o mesmo buffer entre imagens do mesmo tamanho.
 */
export function rgbaParaTensor(
  rgba: ArrayLike<number>,
  { largura, altura }: Dimensoes,
  { media, desvio }: Normalizacao,
  destino: Float32Array = new Float32Array(3 * largura * altura)
): Float32Array {
  const area = largura * altura;
  if (rgba.length !== area * 4) {
    throw new RangeError(`Esperava ${area * 4} bytes RGBA, recebeu ${rgba.length}`);
  }
  if (destino.length !== area * 3) {
    throw new RangeError(`Destino precisa ter ${area * 3} posições`);
  }
  for (let i = 0; i < area; i++) {
    const p = i * 4;
    destino[i] = (rgba[p] / 255 - media[0]) / desvio[0];
    destino[area + i] = (rgba[p + 1] / 255 - media[1]) / desvio[1];
    destino[2 * area + i] = (rgba[p + 2] / 255 - media[2]) / desvio[2];
  }
  return destino;
}

/**
 * Menor amplitude de saída que ainda vale esticar.
 *
 * A saída do U²-Netp passa por min–max, como no rembg, porque ele raramente
 * encosta em 0 e 1. Mas numa imagem sem objeto nenhum a amplitude é ruído, e
 * esticar ruído até o branco inventaria um recorte. Abaixo disto, a saída é
 * usada como veio.
 */
const AMPLITUDE_MINIMA = 0.2;

/**
 * Saída do U²-Netp esticada para ocupar de 0 a 1.
 *
 * Sem curva de contraste por cima, de propósito. Uma versão anterior zerava
 * tudo abaixo de 15% de confiança para estreitar a borda, e o que caía nessa
 * faixa não era só halo: era jaqueta escura contra fundo escuro, e ela sumia
 * do recorte. Cortar menos e deixar a borda um pouco mais macia é o erro que
 * se perdoa.
 */
export function esticarSaida(saida: ArrayLike<number>): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < saida.length; i++) {
    const v = saida[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const esticar = max - min >= AMPLITUDE_MINIMA;
  const base = esticar ? min : 0;
  const escala = esticar ? 1 / (max - min) : 1;

  const resultado = new Float32Array(saida.length);
  for (let i = 0; i < saida.length; i++) {
    resultado[i] = Math.min(1, Math.max(0, (saida[i] - base) * escala));
  }
  return resultado;
}

/**
 * Redimensiona um plano de um canal com interpolação bilinear, alinhada pelo
 * centro dos pixels — a mesma convenção do canvas, para as máscaras dos dois
 * modelos caírem no mesmo lugar quando comparadas.
 */
export function redimensionarPlano(
  origem: ArrayLike<number>,
  de: Dimensoes,
  para: Dimensoes
): Float32Array {
  if (origem.length !== de.largura * de.altura) throw new RangeError("Plano e dimensões não batem");
  const destino = new Float32Array(para.largura * para.altura);
  const escalaX = de.largura / para.largura;
  const escalaY = de.altura / para.altura;
  for (let y = 0; y < para.altura; y++) {
    const gy = Math.min(de.altura - 1, Math.max(0, (y + 0.5) * escalaY - 0.5));
    const y0 = Math.floor(gy);
    const y1 = Math.min(de.altura - 1, y0 + 1);
    const fy = gy - y0;
    for (let x = 0; x < para.largura; x++) {
      const gx = Math.min(de.largura - 1, Math.max(0, (x + 0.5) * escalaX - 0.5));
      const x0 = Math.floor(gx);
      const x1 = Math.min(de.largura - 1, x0 + 1);
      const fx = gx - x0;
      const cima = origem[y0 * de.largura + x0] * (1 - fx) + origem[y0 * de.largura + x1] * fx;
      const baixo = origem[y1 * de.largura + x0] * (1 - fx) + origem[y1 * de.largura + x1] * fx;
      destino[y * para.largura + x] = cima * (1 - fy) + baixo * fy;
    }
  }
  return destino;
}

/**
 * Concordância entre duas máscaras do mesmo tamanho: interseção sobre união
 * das regiões acima de `limiar`. 1 é a mesma forma; 0, nada em comum.
 */
export function concordancia(a: ArrayLike<number>, b: ArrayLike<number>, limiar = 0.5): number {
  if (a.length !== b.length) throw new RangeError("Máscaras de tamanhos diferentes");
  let intersecao = 0;
  let uniao = 0;
  for (let i = 0; i < a.length; i++) {
    const emA = a[i] > limiar;
    const emB = b[i] > limiar;
    if (emA && emB) intersecao++;
    if (emA || emB) uniao++;
  }
  return uniao === 0 ? 0 : intersecao / uniao;
}

/**
 * A partir de quanta concordância a foto é tratada como de pessoa.
 *
 * Medido, não chutado. Em retratos, meio corpo e pessoa com mochila, as
 * máscaras dos dois modelos concordaram entre 0,95 e 0,99. Num relógio, 0,08:
 * o MODNet procura gente, não acha, e marca pedaços soltos. 0,6 fica longe
 * dos dois lados, e ainda tolera o U²-Netp comendo parte da roupa, que é
 * justamente o caso em que o MODNet precisa assumir.
 */
export const LIMIAR_DE_PESSOA = 0.6;

export function ehPessoa(concordanciaEntreModelos: number): boolean {
  return concordanciaEntreModelos >= LIMIAR_DE_PESSOA;
}

/**
 * Média numa janela quadrada de lado `2r + 1`, em O(n) independente do raio.
 *
 * Separável, com soma corrente. Na borda a janela é cortada e a média divide
 * só pelo que cabe, sem inventar pixels além da imagem.
 */
export function mediaEmCaixa(origem: ArrayLike<number>, { largura, altura }: Dimensoes, raio: number): Float32Array {
  if (origem.length !== largura * altura) throw new RangeError("Plano e dimensões não batem");
  const temporario = new Float32Array(origem.length);
  const destino = new Float32Array(origem.length);

  for (let y = 0; y < altura; y++) {
    const linha = y * largura;
    let soma = 0;
    for (let x = 0; x <= Math.min(raio, largura - 1); x++) soma += origem[linha + x];
    for (let x = 0; x < largura; x++) {
      temporario[linha + x] = soma / (Math.min(largura - 1, x + raio) - Math.max(0, x - raio) + 1);
      if (x + raio + 1 < largura) soma += origem[linha + x + raio + 1];
      if (x - raio >= 0) soma -= origem[linha + x - raio];
    }
  }
  for (let x = 0; x < largura; x++) {
    let soma = 0;
    for (let y = 0; y <= Math.min(raio, altura - 1); y++) soma += temporario[y * largura + x];
    for (let y = 0; y < altura; y++) {
      destino[y * largura + x] = soma / (Math.min(altura - 1, y + raio) - Math.max(0, y - raio) + 1);
      if (y + raio + 1 < altura) soma += temporario[(y + raio + 1) * largura + x];
      if (y - raio >= 0) soma -= temporario[(y - raio) * largura + x];
    }
  }
  return destino;
}

/**
 * Máscara do MODNet restrita à vizinhança do sujeito que o U²-Netp encontrou.
 *
 * O MODNet às vezes marca uma manchinha solta longe da pessoa — um reflexo, um
 * pedaço de sombra. A região do U²-Netp, alargada por uma média em caixa,
 * funciona como cerca: dentro dela e perto da borda o MODNet decide sozinho,
 * com todo o detalhe; bem longe dela, nada passa. A cerca é larga de
 * propósito, um trinta e dois avos da imagem, para não cortar o cabelo solto
 * que o U²-Netp não viu.
 */
export function restringirAoSujeito(
  pessoa: ArrayLike<number>,
  sujeito: ArrayLike<number>,
  dimensoes: Dimensoes
): Float32Array {
  const n = dimensoes.largura * dimensoes.altura;
  if (pessoa.length !== n || sujeito.length !== n) throw new RangeError("Planos e dimensões não batem");

  const presenca = new Float32Array(n);
  for (let i = 0; i < n; i++) presenca[i] = sujeito[i] > 0.3 ? 1 : 0;
  const raio = Math.max(2, Math.round(Math.max(dimensoes.largura, dimensoes.altura) / 32));
  const vizinhanca = mediaEmCaixa(presenca, dimensoes, raio);

  const resultado = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // Qualquer presença na janela já libera por inteiro: a cerca não pode
    // esmaecer a borda de verdade, só apagar o que está fora dela.
    resultado[i] = pessoa[i] * Math.min(1, vizinhanca[i] * 10);
  }
  return resultado;
}

/**
 * Amplia um alfa de um canal, byte por pixel, com interpolação bilinear
 * alinhada pelo centro dos pixels.
 *
 * Existe para a máscara da Cloudflare, que volta no tamanho da cópia enviada
 * (até 2048 px), chegar à resolução da foto sem passar por um canvas do
 * tamanho dela: um canvas RGBA de 21 MP são 85 MB, e o alfa de que se precisa
 * cabe em 21 MB.
 */
export function ampliarAlfa(origem: ArrayLike<number>, de: Dimensoes, para: Dimensoes): Uint8Array {
  if (origem.length !== de.largura * de.altura) throw new RangeError("Alfa e dimensões não batem");
  const destino = new Uint8Array(para.largura * para.altura);
  const escalaX = de.largura / para.largura;
  const escalaY = de.altura / para.altura;
  // Colunas pré-calculadas: o laço interno roda 21 milhões de vezes numa foto
  // de 21 MP, e refazer a mesma conta por coluna em cada linha pesaria.
  const x0s = new Int32Array(para.largura);
  const x1s = new Int32Array(para.largura);
  const fxs = new Float32Array(para.largura);
  for (let x = 0; x < para.largura; x++) {
    const gx = Math.min(de.largura - 1, Math.max(0, (x + 0.5) * escalaX - 0.5));
    x0s[x] = Math.floor(gx);
    x1s[x] = Math.min(de.largura - 1, x0s[x] + 1);
    fxs[x] = gx - x0s[x];
  }
  for (let y = 0; y < para.altura; y++) {
    const gy = Math.min(de.altura - 1, Math.max(0, (y + 0.5) * escalaY - 0.5));
    const y0 = Math.floor(gy);
    const l0 = y0 * de.largura;
    const l1 = Math.min(de.altura - 1, y0 + 1) * de.largura;
    const fy = gy - y0;
    const linha = y * para.largura;
    for (let x = 0; x < para.largura; x++) {
      const fx = fxs[x];
      const cima = origem[l0 + x0s[x]] * (1 - fx) + origem[l0 + x1s[x]] * fx;
      const baixo = origem[l1 + x0s[x]] * (1 - fx) + origem[l1 + x1s[x]] * fx;
      destino[linha + x] = Math.round(cima * (1 - fy) + baixo * fy);
    }
  }
  return destino;
}

/** Lado maior das prévias de tela. Uma caixa de 1280 px em tela 2x. */
export const LADO_DA_PREVIA = 2560;

/** Tamanho da prévia: a própria imagem se couber, senão reduzida sem distorcer. */
export function dimensoesDaPrevia(original: Dimensoes): Dimensoes {
  return dimensoesDeEnvio(original, LADO_DA_PREVIA);
}

/** Hash hexadecimal minúsculo de um digest, para comparar com MODELO_SHA256. */
export function hexDoDigest(digest: ArrayBuffer): string {
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Nome do arquivo exportado: o original, sem a extensão, com o sufixo.
 *
 * Sai sempre em PNG, porque é o único formato comum com transparência que
 * todo programa abre. Caracteres que o sistema de arquivos recusa viram hífen.
 *
 * O nome cai na pasta de downloads da pessoa, então segue a língua da página:
 * quem usa o site em inglês baixa "photo-no-background.png". As duas palavras
 * chegam de fora porque esta função é pura e não tem como saber o idioma. O
 * padrão em português existe para quem chamar sem dicionário.
 */
export function nomeDoRecorte(
  nomeOriginal: string,
  textos: { padrao: string; sufixo: string } = { padrao: "imagem", sufixo: "sem-fundo" }
): string {
  const semExtensao = nomeOriginal.replace(/\.[^./\\]+$/, "");
  const limpo = semExtensao
    .replace(/[\\/:*?"<>|\x00-\x1f]+/g, "-")
    .replace(/\s+/g, " ")
    // Hífen nas pontas vinha de caractere inválido no começo ou no fim, e
    // colado ao sufixo virava "nome--sem-fundo".
    .replace(/^[\s-]+|[\s-]+$/g, "");
  return `${limpo || textos.padrao}-${textos.sufixo}.png`;
}

/** "5,5 MB", com uma casa só abaixo de 10 — onde a casa ainda informa. */
export function formatarMegabytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const texto = mb < 10 ? mb.toFixed(1) : Math.round(mb).toString();
  return `${texto.replace(".", ",")} MB`;
}

/** "840 ms" abaixo de um segundo, "2,4 s" acima. */
export function formatarDuracao(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

/* -------------------------------------------------------------------------
   Protocolo entre a página e o worker
   ------------------------------------------------------------------------- */

/** Worker de recorte: aplica a máscara da Cloudflare à foto original. */
export type PedidoDeRecorte =
  | {
      tipo: "aplicar-mascara";
      id: number;
      imagem: ImageBitmap;
      mascara: Blob;
    }
  | {
      /** Repinta os ajustes de pincel na resolução cheia, para o download. */
      tipo: "aplicar-tracos";
      id: number;
      recorte: Blob;
      /** O arquivo original: é dele que o restaurar tira a cor. */
      original: Blob;
      /** Tamanho em que o recorte foi feito, que é o do PNG final. */
      trabalho: Dimensoes;
      tracos: readonly Traco[];
    }
  | {
      /** Pincel mágico, passo 1: a região da foto, no tamanho de envio. */
      tipo: "preparar-regiao";
      id: number;
      original: Blob;
      trabalho: Dimensoes;
      regiao: Regiao;
      envio: Dimensoes;
      /**
       * Presente no restaurar: o recorte como está agora, para o que já foi
       * incluído sair da região antes de ir ao modelo (ver ocultarOQueJaFicou).
       */
      atual?: { recorte: Blob; tracos: readonly Traco[] };
    }
  | {
      /** Pincel mágico, passo 2: da máscara da região, só o elemento tocado. */
      tipo: "selecionar-elemento";
      id: number;
      mascara: Blob;
      traco: Traco;
      regiao: Regiao;
      trabalho: Dimensoes;
    };

export type RespostaDeRecorte =
  | { tipo: "pronto"; id: number; recorte: Blob; previa: Blob }
  | { tipo: "tracos-prontos"; id: number; recorte: Blob }
  | { tipo: "regiao-pronta"; id: number; imagem: Blob }
  | { tipo: "elemento-pronto"; id: number; mascara: Blob }
  | { tipo: "elemento-vazio"; id: number }
  | { tipo: "erro"; id: number };

/** Worker do modo leve: recorta no aparelho, com os modelos locais. */
export type PedidoAoWorker = {
  tipo: "remover";
  id: number;
  imagem: ImageBitmap;
};

export type RespostaDoWorker =
  | { tipo: "preparando"; id: number }
  | { tipo: "processando"; id: number }
  | {
      tipo: "pronto";
      id: number;
      recorte: Blob;
      /** Até 2560 px, para a tela. O `recorte` tem a resolução da entrada. */
      previa: Blob;
      /** Inferência e recorte, sem o carregamento dos modelos. */
      duracaoMs: number;
    }
  | { tipo: "erro"; id: number };
