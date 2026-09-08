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
  FONTE_PADRAO,
  metricaDe,
  type PesoDaFonte,
} from "@/lib/fontes";
import {
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
 * Arquivos de fonte em base64, um por peso, buscados uma vez por sessão.
 *
 * Ficam em `public/` e não no pacote: o conjunto todo passa de meio megabyte,
 * e embutido no módulo entraria no bundle de quem só abre a página. Assim cada
 * arquivo é baixado quando uma folha de fato o usa.
 *
 * A promessa é guardada, e não o resultado, para duas gerações simultâneas não
 * baixarem duas vezes o mesmo arquivo.
 */
const arquivosPendentes = new Map<string, Promise<string | null>>();

function carregarArquivo(caminho: string): Promise<string | null> {
  const guardado = arquivosPendentes.get(caminho);
  if (guardado) return guardado;

  const pendente = (async () => {
    try {
      const resposta = await fetch(caminho);
      if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
      const bytes = new Uint8Array(await resposta.arrayBuffer());
      // Em blocos porque `String.fromCharCode` com dezenas de milhares de
      // argumentos de uma vez estoura a pilha de chamadas.
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
      console.warn(`Não foi possível carregar ${caminho}; usando Helvetica.`, erro);
      return null;
    }
  })();

  arquivosPendentes.set(caminho, pendente);
  return pendente;
}

/** Chave de uma fonte no documento: família e peso identificam o arquivo. */
const chaveDaFonte = (id: string, peso: PesoDaFonte) => `${id}-${peso}`;

/** Baixa só o que a folha usa. */
async function carregarFontesDoLayout(layout: Layout): Promise<Map<string, string | null>> {
  const usadas = new Map<string, string>();
  for (const codigo of layout.codigos) {
    if (!codigo.texto) continue;
    usadas.set(
      chaveDaFonte(codigo.textoFonte, codigo.textoPeso),
      metricaDe(codigo.textoFonte, codigo.textoPeso).arquivo
    );
  }
  // A régua da amostra escreve, então o padrão sempre entra.
  usadas.set(
    chaveDaFonte(FONTE_PADRAO, 400),
    metricaDe(FONTE_PADRAO, 400).arquivo
  );

  const pares = await Promise.all(
    [...usadas].map(async ([chave, caminho]) => [chave, await carregarArquivo(caminho)] as const)
  );
  return new Map(pares);
}

/** A fonte de fato usada para um texto, depois de tentar registrar a escolhida. */
interface FonteAtiva {
  familia: string;
  alturaDoDigito: number;
  avanco: number;
}

/**
 * Registra no documento tudo que foi baixado e devolve como consultar.
 *
 * Quem não carregou cai na Helvetica: o número sai num desenho diferente, mas
 * sai — e a folha continua utilizável.
 */
function registrarFontes(
  doc: jsPDF,
  arquivos: ReadonlyMap<string, string | null>
): (id: string, peso: PesoDaFonte) => FonteAtiva {
  const registradas = new Set<string>();
  for (const [chave, base64] of arquivos) {
    if (!base64) continue;
    try {
      const nome = `${chave}.ttf`;
      doc.addFileToVFS(nome, base64);
      doc.addFont(nome, chave, "normal");
      registradas.add(chave);
    } catch (erro) {
      console.warn(`A fonte ${chave} não pôde ser registrada no PDF.`, erro);
    }
  }

  return (id, peso) => {
    const chave = chaveDaFonte(id, peso);
    if (!registradas.has(chave)) return { ...FONTE_DE_RESERVA, avanco: 0.6 };
    const m = metricaDe(id, peso);
    return { familia: chave, alturaDoDigito: m.alturaDoDigito, avanco: m.avanco };
  };
}

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
  doc.setFont(fonte.familia, "normal");
  doc.setFontSize(codigo.textoTamanho);

  const corpo = codigo.textoTamanho / PT_POR_MM;
  // Entreletras em ems: acompanha o corpo, que é como se pensa espaçamento de
  // tipo. O `jspdf` recebe em unidade do documento.
  const entreletras = codigo.textoEntreletras * corpo;
  doc.setCharSpace(entreletras);

  // A largura sai da métrica da fonte, e não de `getTextWidth`: a conta tem
  // de ser a mesma que a prévia faz, senão o número que aparece na tela cai
  // num lugar e o impresso em outro. O último caractere não arrasta
  // entreletras.
  const larguraTexto =
    texto.length * fonte.avanco * corpo + Math.max(0, texto.length - 1) * entreletras;
  const subida = corpo * fonte.alturaDoDigito;

  const recuo =
    codigo.textoAlinhamento === "esquerda"
      ? 0
      : codigo.textoAlinhamento === "direita"
        ? codigo.comprimento - larguraTexto
        : (codigo.comprimento - larguraTexto) / 2;

  // Posiciona no referencial local e só então gira junto com o bloco. Assim o
  // texto acompanha o código em qualquer ângulo, sem um segundo conjunto de
  // contas por quadrante.
  const centro = centroDoCodigo(codigo);
  const angulo = normalizarAngulo(codigo.rotacao);
  const ancora = girarPonto(
    {
      x: codigo.x + recuo,
      // Abaixo, a linha de base fica uma subida depois do pé das barras;
      // acima, ela fica sobre o topo e os glifos crescem para fora.
      y: codigo.textoAcima
        ? codigo.y - codigo.textoEspaco
        : codigo.y + codigo.altura + codigo.textoEspaco + subida,
    },
    centro,
    angulo
  );

  // O `angle` do jspdf conta no sentido anti-horário e gira em torno da
  // âncora, que já é o começo da linha de base — daí o sinal invertido e
  // nenhuma correção de alinhamento.
  if (angulo === 0) doc.text(texto, ancora.x, ancora.y);
  else doc.text(texto, ancora.x, ancora.y, { angle: -angulo });

  // Zera para o próximo texto não herdar o espaçamento deste.
  doc.setCharSpace(0);
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
  /**
   * Imprime a régua de calibração no pé da página.
   *
   * Só a amostra usa. A folha de produção leva a arte do cliente e não pode
   * ganhar marca que não estava no formulário.
   */
  calibrar?: boolean;
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
  calibrar = false,
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

  // Uma busca por geração; cada documento registra os mesmos arquivos.
  const arquivosDeFonte = await carregarFontesDoLayout(layout);
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
    const fontePara = registrarFontes(doc, arquivosDeFonte);
    const fontePadrao = fontePara(FONTE_PADRAO, 400);
    doc.setFont(fontePadrao.familia, "normal");
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
        if (codigo.texto) {
          desenharTexto(doc, codigo, valor, fontePara(codigo.textoFonte, codigo.textoPeso));
        }
      }

      if (calibrar) desenharCalibracao(doc, layout.pagina, fontePadrao);

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

/**
 * Régua de calibração impressa, com a medida escrita ao lado.
 *
 * É o teste que não depende de acreditar em ninguém: se a barra impressa não
 * medir 100 mm na régua de verdade, a impressora está reduzindo. Isso importa
 * porque "ajustar à página" tira alguns por cento, o módulo de 0,26 mm cai
 * abaixo do mínimo do Code 128, e a folha inteira passa a falhar no leitor sem
 * nada denunciando na aparência.
 *
 * Só entra na amostra. A folha de produção carrega a arte do cliente e não
 * pode ganhar marca nenhuma.
 */
function desenharCalibracao(doc: jsPDF, pagina: Pagina, fonte: FonteAtiva): void {
  const comprimento = Math.min(100, pagina.largura - 20);
  const x = (pagina.largura - comprimento) / 2;
  const y = pagina.altura - 8;
  const traco = 2.5;

  doc.setFillColor(0, 0, 0);
  doc.rect(x, y - 0.4, comprimento, 0.8, "F");
  // Marcas nas pontas e a cada dez milímetros: dá para conferir com régua
  // curta se a folha não couber na mesa.
  for (let d = 0; d <= comprimento; d += 10) {
    const alto = d === 0 || d === comprimento;
    doc.rect(x + d - 0.2, y - (alto ? traco : traco / 2), 0.4, alto ? traco : traco / 2, "F");
  }

  doc.setFont(fonte.familia, "normal");
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);
  const legenda = `${comprimento} mm — se nao medir isto na regua, a impressora esta reduzindo. Imprima em tamanho real (100%).`;
  doc.text(legenda, pagina.largura / 2 - doc.getTextWidth(legenda) / 2, y + 4);
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
    calibrar: true,
  });
  return resultado.blob;
}
