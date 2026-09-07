/**
 * Montagem do PDF: uma página por número, os códigos desenhados como vetor
 * sobre a arte de fundo, e o resultado quebrado em arquivos de tamanho fixo.
 *
 * Três decisões estruturam este arquivo:
 *
 * 1. A arte entra **uma vez** por documento. `addImage` com o mesmo `alias`
 *    reaproveita o objeto embutido, então mil páginas custam uma imagem, não
 *    mil. Sem isso o arquivo passa de gigabyte.
 * 2. O símbolo é codificado **uma vez por página** e desenhado nas N posições.
 *    Todos os códigos da folha carregam o mesmo número, então recodificar por
 *    posição seria trabalho jogado fora.
 * 3. As barras saem como `rect` em ponto flutuante, nunca como imagem. Numa
 *    etiqueta apertada o módulo fica perto de 0,26 mm; rasterizar a 300 dpi
 *    joga cada barra para o pixel mais próximo e o leitor recusa.
 */

import { jsPDF } from "jspdf";
import { Zip, ZipPassThrough } from "fflate";
import { barrasNormalizadas, codificarCode128, type BarraNormalizada } from "@/lib/code128";
import {
  FONTE_DE_RESERVA,
  FONTE_DO_NUMERO,
  centroDoCodigo,
  contarArquivos,
  ehAnguloReto,
  girarPonto,
  normalizarAngulo,
  formatarValor,
  nomeArquivoPdf,
  nomeArquivoZip,
  PT_POR_MM,
  textoDoCodigo,
  type Codigo,
  type Faixa,
  type Layout,
  type Pagina,
} from "@/lib/barcodeLayout";

export interface Fundo {
  /** A arte como data URL. */
  dataUrl: string;
  formato: "PNG" | "JPEG";
}

export interface Progresso {
  paginasFeitas: number;
  totalPaginas: number;
  arquivosFeitos: number;
  totalArquivos: number;
  /** ms desde o início. */
  decorrido: number;
  /** ms restantes pela média até aqui, ou null enquanto não dá para estimar. */
  restante: number | null;
}

export interface Resultado {
  nome: string;
  blob: Blob;
  arquivos: number;
  paginas: number;
}

export class FaixaInvalidaError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "FaixaInvalidaError";
  }
}

export class GeracaoCancelada extends Error {
  constructor() {
    super("Geração cancelada.");
    this.name = "GeracaoCancelada";
  }
}

/**
 * Devolve o controle ao navegador.
 *
 * A geração roda na thread principal de propósito: `jspdf` toca APIs de
 * documento em alguns caminhos e um worker traria uma classe de falha só
 * observável em produção. O custo é ter que ceder a thread — o que também é o
 * que faz a barra de progresso andar e o botão de cancelar responder.
 */
const respirar = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/** Páginas montadas entre uma pausa e outra. */
const PAGINAS_POR_FATIA = 25;

/**
 * A Geist Mono em base64, buscada uma vez por sessão.
 *
 * Fica em `public/` e não no pacote porque a fonte tem 68 KB: embutida no
 * módulo, ela entraria no bundle de quem só abre a página. Assim é baixada
 * quando alguém de fato gera, junto do próprio `jspdf`.
 *
 * A promessa é guardada, e não o resultado, para duas gerações simultâneas não
 * baixarem duas vezes.
 */
let fontePendente: Promise<string | null> | null = null;

function carregarFonte(): Promise<string | null> {
  fontePendente ??= (async () => {
    try {
      const resposta = await fetch(FONTE_DO_NUMERO.arquivo);
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const bytes = new Uint8Array(await resposta.arrayBuffer());
      // Em blocos porque `String.fromCharCode` com 68 mil argumentos de uma
      // vez estoura a pilha de chamadas.
      let bruto = "";
      const bloco = 8192;
      for (let i = 0; i < bytes.length; i += bloco) {
        bruto += String.fromCharCode(...bytes.subarray(i, i + bloco));
      }
      return btoa(bruto);
    } catch (erro) {
      // Rede ruim ou arquivo ausente: cai para a Helvetica, que é padrão do
      // PDF. Gerar com o número num desenho diferente é muito melhor que não
      // gerar.
      console.warn("Não foi possível carregar a Geist Mono; usando Helvetica.", erro);
      return null;
    }
  })();
  return fontePendente;
}

/** A fonte de fato usada num documento, depois de tentar registrar a Geist. */
interface FonteAtiva {
  familia: string;
  alturaDoDigito: number;
}

function registrarFonte(doc: jsPDF, base64: string | null): FonteAtiva {
  if (!base64) return { ...FONTE_DE_RESERVA };
  try {
    const nome = "GeistMono-Regular.ttf";
    doc.addFileToVFS(nome, base64);
    doc.addFont(nome, FONTE_DO_NUMERO.familia, "normal");
    return {
      familia: FONTE_DO_NUMERO.familia,
      alturaDoDigito: FONTE_DO_NUMERO.alturaDoDigito,
    };
  } catch (erro) {
    console.warn("A Geist Mono não pôde ser registrada no PDF; usando Helvetica.", erro);
    return { ...FONTE_DE_RESERVA };
  }
}

/**
 * Desenha as barras de um código, com ou sem giro.
 *
 * Dois caminhos de propósito. Em múltiplo de 90° cada barra segue sendo um
 * retângulo alinhado aos eixos e sai por `rect`: é o caso do formulário, o
 * caminho verificado por decodificação do raster, e o de menor fluxo de
 * conteúdo. Em qualquer outro ângulo a barra vira um quadrilátero desenhado
 * por `lines`, que é API documentada — nada de escrever matriz de
 * transformação por dentro do jspdf, onde um erro de sinal só apareceria
 * depois de impresso.
 *
 * Nos dois, as coordenadas seguem em ponto flutuante até o operador do PDF.
 */
function desenharBarras(
  doc: jsPDF,
  codigo: Codigo,
  barras: readonly BarraNormalizada[]
): void {
  const { comprimento, altura } = codigo;
  const centro = centroDoCodigo(codigo);
  const angulo = normalizarAngulo(codigo.rotacao);

  if (ehAnguloReto(angulo)) {
    const quadrante = angulo / 90;
    const deitado = quadrante % 2 === 1;
    // A 90° e 270° o bloco troca de eixo em torno do mesmo centro.
    const caixaX = deitado ? centro.x - altura / 2 : codigo.x;
    const caixaY = deitado ? centro.y - comprimento / 2 : codigo.y;

    for (const barra of barras) {
      // Qual ponta da caixa recebe o primeiro módulo, derivado do giro no
      // sentido horário em torno do centro — o mesmo que a prévia aplica com
      // `rotate` do SVG:
      //
      //     0°  (u, v) -> ( u,  v)   primeiro módulo à esquerda
      //    90°  (u, v) -> (-v,  u)   primeiro módulo em cima
      //   180°  (u, v) -> (-u, -v)   primeiro módulo à direita
      //   270°  (u, v) -> ( v, -u)   primeiro módulo embaixo
      //
      // Ou seja: só 180° e 270° invertem a contagem. Um leitor lê nos dois
      // sentidos, então o erro aqui não aparece na conferência com o leitor —
      // aparece como o número trocado de ponta em relação à prévia.
      const invertido = quadrante >= 2;
      const inicio = invertido ? 1 - barra.inicio - barra.largura : barra.inicio;

      if (deitado) {
        doc.rect(caixaX, caixaY + inicio * comprimento, altura, barra.largura * comprimento, "F");
      } else {
        doc.rect(caixaX + inicio * comprimento, caixaY, barra.largura * comprimento, altura, "F");
      }
    }
    return;
  }

  for (const barra of barras) {
    const x0 = codigo.x + barra.inicio * comprimento;
    const x1 = x0 + barra.largura * comprimento;
    const y0 = codigo.y;
    const y1 = y0 + altura;

    const cantos = [
      { x: x0, y: y0 },
      { x: x1, y: y0 },
      { x: x1, y: y1 },
      { x: x0, y: y1 },
    ].map((ponto) => girarPonto(ponto, centro, angulo));

    // `lines` recebe cada vértice como deslocamento do anterior.
    const passos: Array<[number, number]> = [];
    for (let i = 1; i < cantos.length; i++) {
      const atual = cantos[i]!;
      const anterior = cantos[i - 1]!;
      passos.push([atual.x - anterior.x, atual.y - anterior.y]);
    }
    doc.lines(passos, cantos[0]!.x, cantos[0]!.y, [1, 1], "F", true);
  }
}

function desenharTexto(
  doc: jsPDF,
  codigo: Codigo,
  valor: string,
  fonte: FonteAtiva
): void {
  const texto = textoDoCodigo(codigo, valor);
  doc.setFontSize(codigo.textoTamanho);

  // A âncora é calculada aqui, e não com `align`/`baseline` do jspdf, porque
  // os dois aplicam o deslocamento nos eixos da página, não nos do texto: com
  // `angle`, o centramento acaba empurrando o texto para o lado errado. Com a
  // âncora explícita, `text` põe a origem da linha de base exatamente no ponto
  // pedido — conferido no fluxo de conteúdo gerado.
  const larguraTexto = doc.getTextWidth(texto);
  const subida = (codigo.textoTamanho * fonte.alturaDoDigito) / PT_POR_MM;

  // Posiciona no referencial local, centrado sob as barras, e só então gira
  // junto com o bloco. Assim o texto acompanha o código em qualquer ângulo,
  // sem um segundo conjunto de contas por quadrante.
  const centro = centroDoCodigo(codigo);
  const angulo = normalizarAngulo(codigo.rotacao);
  const ancora = girarPonto(
    {
      x: codigo.x + (codigo.comprimento - larguraTexto) / 2,
      // Abaixo, a linha de base fica uma subida depois do pé das barras;
      // acima, ela fica sobre o topo e os glifos crescem para fora.
      y: codigo.textoAcima
        ? codigo.y - codigo.textoEspaco
        : codigo.y + codigo.altura + codigo.textoEspaco + subida,
    },
    centro,
    angulo
  );

  if (angulo === 0) {
    doc.text(texto, ancora.x, ancora.y);
    return;
  }

  // O `angle` do jspdf conta no sentido anti-horário e gira em torno da
  // âncora, que já é o começo da linha de base — daí o sinal invertido e
  // nenhuma correção de alinhamento.
  doc.text(texto, ancora.x, ancora.y, { angle: -angulo });
}

function novoDocumento(layout: Layout): jsPDF {
  return new jsPDF({
    unit: "mm",
    format: [layout.pagina.largura, layout.pagina.altura],
    orientation: layout.pagina.largura > layout.pagina.altura ? "landscape" : "portrait",
    compress: true,
    // Quatro casas de ponto são 35 nanômetros: preserva a espessura exata da
    // barra e ainda mantém o fluxo de conteúdo enxuto em milhares de páginas.
    floatPrecision: 4,
  });
}

export interface OpcoesGeracao {
  layout: Layout;
  faixa: Faixa;
  fundo: Fundo | null;
  aoProgredir?: (progresso: Progresso) => void;
  sinal?: AbortSignal;
}

/**
 * Gera a faixa inteira e devolve um único arquivo para baixar: o PDF, quando
 * cabe em um só, ou um .zip com os blocos.
 */
export async function gerarPdfs({
  layout,
  faixa,
  fundo,
  aoProgredir,
  sinal,
}: OpcoesGeracao): Promise<Resultado> {
  const totalPaginas = faixa.ate - faixa.de + 1;
  const totalArquivos = contarArquivos(faixa);
  const inicio = Date.now();

  // A interface já barra isto, mas a função é exportada e não pode confiar em
  // quem chama: sem a guarda, uma faixa vazia atravessava o laço sem produzir
  // bloco nenhum e estourava num TypeError obscuro na hora de montar o Blob.
  if (totalPaginas < 1) {
    throw new FaixaInvalidaError(
      `Faixa vazia: o número final (${faixa.ate}) é menor que o inicial (${faixa.de}).`
    );
  }
  if (!Number.isInteger(faixa.paginasPorArquivo) || faixa.paginasPorArquivo < 1) {
    throw new FaixaInvalidaError("Cada arquivo precisa ter ao menos uma página inteira.");
  }
  if (layout.codigos.length === 0) {
    throw new FaixaInvalidaError("O layout não tem nenhum código de barras.");
  }

  const conferirCancelamento = () => {
    if (sinal?.aborted) throw new GeracaoCancelada();
  };
  conferirCancelamento();

  const blocos: Array<{ nome: string; bytes: Uint8Array }> = [];
  // O zip é montado em fluxo: cada PDF pronto é empurrado e liberado em
  // seguida, então a memória fica no tamanho de um bloco, não da faixa toda.
  const pedacosZip: Uint8Array[] = [];
  let erroZip: Error | null = null;
  const zip =
    totalArquivos > 1
      ? new Zip((erro, dados) => {
          if (erro) erroZip = erro;
          else pedacosZip.push(dados);
        })
      : null;

  // Uma busca por geração; cada documento registra a mesma base64.
  const fonteBase64 = await carregarFonte();
  conferirCancelamento();

  let paginasFeitas = 0;
  let arquivosFeitos = 0;

  const avisar = () => {
    if (!aoProgredir) return;
    const decorrido = Date.now() - inicio;
    aoProgredir({
      paginasFeitas,
      totalPaginas,
      arquivosFeitos,
      totalArquivos,
      decorrido,
      restante:
        paginasFeitas > 0
          ? Math.round((decorrido / paginasFeitas) * (totalPaginas - paginasFeitas))
          : null,
    });
  };
  avisar();

  for (let inicioBloco = faixa.de; inicioBloco <= faixa.ate; inicioBloco += faixa.paginasPorArquivo) {
    const fimBloco = Math.min(inicioBloco + faixa.paginasPorArquivo - 1, faixa.ate);
    const doc = novoDocumento(layout);
    const fonte = registrarFonte(doc, fonteBase64);
    doc.setFont(fonte.familia, "normal");
    doc.setFillColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);

    for (let numero = inicioBloco; numero <= fimBloco; numero++) {
      conferirCancelamento();

      // O construtor já abre a primeira página do documento.
      if (numero !== inicioBloco) {
        doc.addPage([layout.pagina.largura, layout.pagina.altura]);
      }

      if (fundo && layout.arte.visivel) {
        // A opacidade entra num estado gráfico próprio, salvo e restaurado em
        // volta da imagem: sem o par save/restore ela vazaria para as barras,
        // e barra translúcida é código que o leitor recusa.
        const clareada = layout.arte.opacidade < 1;
        if (clareada) {
          doc.saveGraphicsState();
          doc.setGState(doc.GState({ opacity: layout.arte.opacidade }));
        }
        doc.addImage(
          fundo.dataUrl,
          fundo.formato,
          0,
          0,
          layout.pagina.largura,
          layout.pagina.altura,
          "arte",
          "NONE"
        );
        if (clareada) doc.restoreGraphicsState();
      }

      const valor = formatarValor(numero, layout.digitos);
      const barras = barrasNormalizadas(codificarCode128(valor));

      for (const codigo of layout.codigos) {
        desenharBarras(doc, codigo, barras);
        if (codigo.texto) desenharTexto(doc, codigo, valor, fonte);
      }

      paginasFeitas++;
      if (paginasFeitas % PAGINAS_POR_FATIA === 0) {
        avisar();
        await respirar();
      }
    }

    const bytes = new Uint8Array(doc.output("arraybuffer"));
    const nome = nomeArquivoPdf(inicioBloco, fimBloco, layout.digitos);

    if (zip) {
      const entrada = new ZipPassThrough(nome);
      zip.add(entrada);
      // Nível zero: PDF já sai comprimido internamente: recomprimir custa
      // tempo e não tira quase nada do tamanho.
      entrada.push(bytes, true);
      if (erroZip) throw erroZip;
    } else {
      blocos.push({ nome, bytes });
    }

    arquivosFeitos++;
    avisar();
    await respirar();
  }

  conferirCancelamento();

  if (zip) {
    zip.end();
    if (erroZip) throw erroZip;
    return {
      nome: nomeArquivoZip(faixa, layout.digitos),
      blob: new Blob(pedacosZip, { type: "application/zip" }),
      arquivos: totalArquivos,
      paginas: totalPaginas,
    };
  }

  const unico = blocos[0];
  if (!unico) {
    throw new FaixaInvalidaError("A geração terminou sem produzir nenhum arquivo.");
  }
  return {
    nome: unico.nome,
    blob: new Blob([unico.bytes], { type: "application/pdf" }),
    arquivos: 1,
    paginas: totalPaginas,
  };
}

/**
 * Mede quantos bytes a arte ocupa dentro de um PDF.
 *
 * O tamanho do arquivo em disco não serve de referência. O JPEG entra como
 * está, via DCTDecode, e sai em 1,04× o original. O PNG é decodificado e
 * recomprimido pelo jspdf, e nas medições isso deu de 5,8× (uma imagem de 382
 * KB virou 2,2 MB) a 375× (uma de 12 KB com alfa virou 4,6 MB). Como a arte
 * entra uma vez por arquivo gerado, esse número multiplicado pela quantidade
 * de arquivos é o que decide se a faixa cabe na memória.
 *
 * Um documento vazio do mesmo tamanho serve de linha de base, para o resultado
 * ser só a imagem e não a estrutura do PDF.
 *
 * O resultado não depende do tamanho da página: o jspdf guarda os pixels
 * originais, e o retângulo passado só decide como eles são desenhados.
 * Conferido de 50×50 a 1000×1000 mm, sempre o mesmo número de bytes. É o que
 * permite medir uma vez e guardar o valor junto da arte.
 */
export async function medirArteNoPdf(fundo: Fundo, pagina: Pagina): Promise<number> {
  const vazio = new jsPDF({
    unit: "mm",
    format: [pagina.largura, pagina.altura],
    compress: true,
    floatPrecision: 4,
  });
  const base = vazio.output("arraybuffer").byteLength;

  const comArte = new jsPDF({
    unit: "mm",
    format: [pagina.largura, pagina.altura],
    compress: true,
    floatPrecision: 4,
  });
  comArte.addImage(fundo.dataUrl, fundo.formato, 0, 0, pagina.largura, pagina.altura, "arte", "NONE");

  return Math.max(0, comArte.output("arraybuffer").byteLength - base);
}

/** Monta um PDF de uma página só, para o operador conferir antes da faixa. */
export async function gerarAmostra(
  layout: Layout,
  numero: number,
  fundo: Fundo | null
): Promise<Blob> {
  const resultado = await gerarPdfs({
    layout,
    faixa: { de: numero, ate: numero, paginasPorArquivo: 1 },
    fundo,
  });
  return resultado.blob;
}
