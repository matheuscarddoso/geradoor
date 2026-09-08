/**
 * Modelo do layout da folha: tamanho de página, posição de cada código e a
 * numeração. É a estrutura que o editor manipula, que o PDF consome e que o
 * operador exporta em JSON para reusar no próximo serviço.
 *
 * Convenção de coordenadas: origem no canto **superior** esquerdo da página,
 * `y` crescendo para baixo, tudo em milímetros. O PDF nasce com a origem
 * embaixo, mas o editor e o `jspdf` em `mm` trabalham por cima; manter uma só
 * convenção em toda a cadeia evita a classe de bug em que a folha sai
 * espelhada na vertical.
 */

import { MODULO_MINIMO_MM, modulosPorTamanho } from "@/lib/code128";
import { FONTE_PADRAO, fontePorId, metricaDe, type PesoDaFonte } from "@/lib/fontes";

/**
 * Ângulo em graus, no sentido horário, de 0 a 360.
 *
 * O giro é em torno do **centro** do bloco de barras, e não do canto: é o que
 * faz o código girar no lugar quando o operador arrasta a alça de rotação ou
 * digita um ângulo, em vez de sair orbitando o próprio canto.
 *
 * Múltiplos de 90° têm caminho próprio no PDF, onde as barras seguem sendo
 * retângulos alinhados aos eixos. É o caso do formulário e o que não depende
 * de arredondamento de matriz nenhuma. Fora deles, cada barra vira um
 * quadrilátero — ver `desenharBarras`.
 */
export type Rotacao = number;

export type AlinhamentoDoTexto = "esquerda" | "centro" | "direita";

/** O ângulo é reto o bastante para as barras seguirem alinhadas aos eixos. */
export function ehAnguloReto(rotacao: number): boolean {
  return Math.abs(rotacao % 90) < 1e-9;
}

export function normalizarAngulo(graus: number): number {
  const voltas = ((graus % 360) + 360) % 360;
  // Tira o resíduo de ponto flutuante de quem chegou perto de um ângulo reto
  // arrastando a alça: 89,9999997° tem que virar 90° para cair no caminho
  // rápido do PDF.
  const proximo = Math.round(voltas / 90) * 90;
  return Math.abs(voltas - proximo) < 1e-6 ? proximo % 360 : voltas;
}

export interface Codigo {
  id: string;
  /** mm, canto superior esquerdo do bloco de barras. */
  x: number;
  y: number;
  /** mm, dimensão de leitura: o comprimento do símbolo, ponta a ponta. */
  comprimento: number;
  /** mm, altura da barra, perpendicular à leitura. */
  altura: number;
  /** Graus no sentido horário, girando em torno do centro do bloco. */
  rotacao: Rotacao;
  /** Imprime o número em texto legível ao lado das barras. */
  texto: boolean;
  /** Quantos dígitos finais o texto mostra. 0 mostra todos. */
  textoDigitos: number;
  /** pt, corpo do texto legível. */
  textoTamanho: number;
  /** mm, folga entre a borda das barras e o texto. */
  textoEspaco: number;
  /** Família do número legível. Ver `FONTES`. */
  textoFonte: string;
  /** 400 ou 700. O avanço do dígito muda com o peso em fonte proporcional. */
  textoPeso: PesoDaFonte;
  /**
   * Entreletras, em ems.
   *
   * Afasta os dígitos sem mexer no corpo. Numa etiqueta apertada é o que deixa
   * o número legível sem ele crescer e invadir a barra.
   */
  textoEntreletras: number;
  /** Onde o número se apoia, na largura do código. */
  textoAlinhamento: AlinhamentoDoTexto;
  /**
   * Põe o texto do lado de cima das barras, em vez de embaixo.
   *
   * É independente do ângulo de propósito. O giro é rígido: "embaixo" vira
   * esquerda a 90° e direita a 270°, e sem esta chave não haveria como pôr o
   * número do lado que a arte já reserva sem também inverter o sentido das
   * barras. Nas etiquetas do FORM ROE 01, deitadas, o número fica à direita —
   * que é este lado.
   */
  textoAcima: boolean;
}

export interface Pagina {
  /** mm */
  largura: number;
  /** mm */
  altura: number;
}

export interface Layout {
  /**
   * 1 guardava `x`/`y` como o canto da caixa **já girada**, e só admitia 0° ou
   * 90°. 2 guarda o canto do bloco não girado e gira em torno do centro, o que
   * é o que permite ângulo livre. Ver `normalizarLayout`.
   */
  versao: 2;
  pagina: Pagina;
  /** Quantos dígitos o número ocupa, com zeros à esquerda. */
  digitos: number;
  codigos: Codigo[];
  /**
   * Como a arte de fundo é desenhada.
   *
   * Mora no layout, e não junto da imagem no IndexedDB, porque é decisão de
   * desenho: entra no desfazer, sai no arquivo exportado e volta igual em
   * outra máquina, mesmo que a arte carregada lá seja outra. A imagem em si
   * são megabytes e continua fora daqui.
   */
  arte: {
    /** 0 a 1. Arte clara deixa as barras se destacarem na conferência. */
    opacidade: number;
    /** O olho da linha de arte: desenha ou não, na prévia e no PDF. */
    visivel: boolean;
  };
}

export const ARTE_PADRAO = { opacidade: 1, visivel: true } as const;

export const LIMITES = {
  pagina: { min: 20, max: 1200 },
  comprimento: { min: 5, max: 400 },
  altura: { min: 2, max: 200 },
  digitos: { min: 2, max: 12 },
  /**
   * Teto de códigos por folha.
   *
   * Não é gosto: cada código vira ~19 retângulos no SVG da prévia, e um
   * arquivo de layout corrompido ou adulterado com dezenas de milhares de
   * entradas trava a aba antes de qualquer aviso aparecer. Quinze é o
   * formulário real; duzentos é folga de sobra para qualquer serviço.
   */
  codigosMaximo: 200,
  /**
   * Tetos de tamanho do resultado, em bytes.
   *
   * A trava é por byte, e não por página, porque é a memória que quebra e uma
   * página custa de 0,5 KB a vários megabytes conforme a arte — contar página
   * mede a coisa errada.
   *
   * Medido em geração real: 10 mil páginas dão 39 MB de saída com 284 MB de
   * pico, e 30 mil dão 117 MB com 354 MB de pico. O pico é o zip acumulado
   * mais o bloco em montagem, cerca de 240 MB de folga fixa, e não um múltiplo
   * do resultado. Nos 400 MB de teto o pico fica perto de 640 MB, que a aba
   * aguenta; acima disso o próprio download de um único arquivo já é o
   * problema seguinte.
   */
  bytesParaAvisar: 150 * 1024 * 1024,
  bytesMaximo: 400 * 1024 * 1024,
  /** Teto de páginas por geração, independente do tamanho. */
  paginasMaximo: 100_000,
} as const;

export const TAMANHOS_PAGINA: ReadonlyArray<{
  id: string;
  nome: string;
  pagina: Pagina;
}> = [
  { id: "roe01", nome: "FORM ROE 01 — 218 × 238", pagina: { largura: 218, altura: 238 } },
  { id: "a4", nome: "A4 — 210 × 297", pagina: { largura: 210, altura: 297 } },
  { id: "a4-paisagem", nome: "A4 paisagem — 297 × 210", pagina: { largura: 297, altura: 210 } },
  { id: "a5", nome: "A5 — 148 × 210", pagina: { largura: 148, altura: 210 } },
  { id: "a3", nome: "A3 — 297 × 420", pagina: { largura: 297, altura: 420 } },
  { id: "carta", nome: "Carta — 216 × 279", pagina: { largura: 216, altura: 279 } },
  { id: "oficio", nome: "Ofício — 216 × 330", pagina: { largura: 216, altura: 330 } },
];

/** 1 mm em pontos PDF. */
export const PT_POR_MM = 72 / 25.4;

export const mmParaPt = (mm: number) => mm * PT_POR_MM;

/**
 * Reserva da Helvetica, para quando a Geist Mono não carrega.
 *
 * A Helvetica é padrão do PDF e não embute arquivo nenhum, então serve de
 * degradação: numa rede ruim o operador continua gerando, com o número num
 * desenho um pouco diferente, em vez de não gerar.
 */
export const FONTE_DE_RESERVA = {
  familia: "helvetica",
  alturaDoDigito: 0.72,
} as const;

/** Zona de silêncio mínima do Code 128: 10 módulos de cada lado das barras. */
export const MODULOS_ZONA_SILENCIO = 10;

export function novoId(): string {
  // `randomUUID` existe em todo navegador que o projeto suporta; o fallback
  // cobre contexto não seguro, onde ele não é exposto.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
}

/** Formata o número da página com zeros à esquerda. */
export function formatarValor(numero: number, digitos: number): string {
  return String(numero).padStart(digitos, "0");
}

/**
 * O que o texto legível de um código mostra para um dado número.
 *
 * As barras sempre carregam o número inteiro; `textoDigitos` só recorta o que
 * a pessoa lê. A arte antiga do formulário mostrava três dígitos, e o operador
 * está acostumado a conferir por eles — mudar isso à força atrapalharia mais
 * do que ajuda.
 */
export function textoDoCodigo(codigo: Codigo, valor: string): string {
  if (codigo.textoDigitos <= 0 || codigo.textoDigitos >= valor.length) return valor;
  return valor.slice(-codigo.textoDigitos);
}

export interface Ponto {
  x: number;
  y: number;
}

/**
 * O bloco de barras antes de girar: `x`, `y`, comprimento e altura como estão
 * no modelo. É neste referencial que tudo é desenhado, com a rotação aplicada
 * por cima — no PDF e na prévia igualmente.
 */
function caixaLocal(codigo: Codigo) {
  return {
    x: codigo.x,
    y: codigo.y,
    largura: codigo.comprimento,
    altura: codigo.altura,
  };
}

/** Centro do bloco de barras: o ponto em torno do qual a rotação acontece. */
export function centroDoCodigo(codigo: Codigo): Ponto {
  return {
    x: codigo.x + codigo.comprimento / 2,
    y: codigo.y + codigo.altura / 2,
  };
}

/**
 * Gira um ponto em torno de outro, em graus no sentido horário.
 *
 * Nos ângulos retos usa 0 e ±1 exatos em vez de `Math.cos`/`Math.sin`, que dão
 * 6,1e-17 em vez de zero para 90°. O resíduo não muda nada no desenho, mas
 * contamina o que é comparado: uma caixa envolvente que devia começar em
 * 22,47 vira 22,469999, e "encostar na margem" passa a devolver 0,01 em vez de
 * 0. Como os ângulos retos são o caso do formulário, vale tratar exato.
 */
const QUADRANTES: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

export function girarPonto(ponto: Ponto, centro: Ponto, graus: number): Ponto {
  const voltas = ((graus % 360) + 360) % 360;
  const quadrante = Math.round(voltas / 90);
  const exato =
    Math.abs(voltas - quadrante * 90) < 1e-9 ? QUADRANTES[quadrante % 4] : undefined;

  const rad = (voltas * Math.PI) / 180;
  const cos = exato ? exato[0] : Math.cos(rad);
  const sen = exato ? exato[1] : Math.sin(rad);
  const dx = ponto.x - centro.x;
  const dy = ponto.y - centro.y;
  return {
    x: centro.x + dx * cos - dy * sen,
    y: centro.y + dx * sen + dy * cos,
  };
}

/** Os quatro cantos do bloco de barras já girados, em ordem horária. */
function cantosDoCodigo(codigo: Codigo): [Ponto, Ponto, Ponto, Ponto] {
  const { x, y, largura, altura } = caixaLocal(codigo);
  const centro = centroDoCodigo(codigo);
  const girar = (p: Ponto) => girarPonto(p, centro, codigo.rotacao);
  return [
    girar({ x, y }),
    girar({ x: x + largura, y }),
    girar({ x: x + largura, y: y + altura }),
    girar({ x, y: y + altura }),
  ];
}

/**
 * Menor retângulo alinhado aos eixos que contém o bloco girado.
 *
 * É o que serve para saber se o código saiu da página: com o giro, o canto
 * superior esquerdo do modelo pode estar dentro do papel e uma quina do
 * símbolo já estar fora.
 */
export function caixaEnvolvente(codigo: Codigo) {
  const cantos = cantosDoCodigo(codigo);
  const xs = cantos.map((c) => c.x);
  const ys = cantos.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, largura: Math.max(...xs) - x, altura: Math.max(...ys) - y };
}

/**
 * As duas pontas do eixo de leitura do código, na página.
 *
 * A zona de silêncio é medida a partir delas, porque é ao longo da leitura
 * que o leitor precisa do branco — não nos lados das barras.
 */
function pontasDeLeitura(codigo: Codigo): [Ponto, Ponto] {
  const centro = centroDoCodigo(codigo);
  const meio = codigo.y + codigo.altura / 2;
  return [
    girarPonto({ x: codigo.x, y: meio }, centro, codigo.rotacao),
    girarPonto({ x: codigo.x + codigo.comprimento, y: meio }, centro, codigo.rotacao),
  ];
}

/** Espessura de um módulo, em mm, para o comprimento e a numeração dados. */
export function moduloEmMm(comprimento: number, digitos: number): number {
  return comprimento / modulosPorTamanho(digitos);
}

export type GravidadeAviso = "erro" | "atencao";

export interface Aviso {
  gravidade: GravidadeAviso;
  mensagem: string;
  /** Código a que o aviso se refere, quando é de um código só. */
  codigoId?: string;
}

/**
 * Confere o layout antes de deixar gerar.
 *
 * Separa em erro e atenção de propósito: numa gráfica, reimprimir um lote
 * perdido ou aceitar uma barra fina de propósito são necessidades reais. Só
 * trava o que produz PDF inservível; o resto avisa e deixa seguir.
 */
export function avaliarLayout(layout: Layout): Aviso[] {
  const avisos: Aviso[] = [];
  const { largura, altura } = layout.pagina;

  if (layout.codigos.length === 0) {
    avisos.push({
      gravidade: "erro",
      mensagem: "Nenhum código na folha. Adicione ao menos um para gerar o PDF.",
    });
  }

  for (const codigo of layout.codigos) {
    const envolvente = caixaEnvolvente(codigo);
    const modulo = moduloEmMm(codigo.comprimento, layout.digitos);

    if (modulo < MODULO_MINIMO_MM) {
      avisos.push({
        gravidade: "atencao",
        codigoId: codigo.id,
        mensagem: `Barra de ${modulo.toFixed(3)} mm, abaixo do mínimo de ${MODULO_MINIMO_MM} mm do Code 128. Aumente o comprimento para ${(
          MODULO_MINIMO_MM * modulosPorTamanho(layout.digitos)
        ).toFixed(2)} mm ou reduza o número de dígitos.`,
      });
    }

    // Mede a caixa envolvente, e não a do modelo: girado, o canto de cima do
    // bloco pode estar dentro do papel com uma quina do símbolo já fora.
    if (
      envolvente.x < -0.001 ||
      envolvente.y < -0.001 ||
      envolvente.x + envolvente.largura > largura + 0.001 ||
      envolvente.y + envolvente.altura > altura + 0.001
    ) {
      avisos.push({
        gravidade: "erro",
        codigoId: codigo.id,
        mensagem: "O código está fora da página. Reposicione ou aumente a folha.",
      });
      continue;
    }

    // Zona de silêncio: mede ao longo da leitura, que é onde o leitor precisa
    // do branco, e só contra a borda do papel — encostar em linha ou texto da
    // arte fica para a conferência visual, que o editor desenha.
    const folga = modulo * MODULOS_ZONA_SILENCIO;
    const apertado = pontasDeLeitura(codigo).some((ponta) => {
      const distancia = Math.min(ponta.x, ponta.y, largura - ponta.x, altura - ponta.y);
      return distancia < folga;
    });

    if (apertado) {
      avisos.push({
        gravidade: "atencao",
        codigoId: codigo.id,
        mensagem: `Menos de ${folga.toFixed(
          2
        )} mm de área branca até a borda do papel. O leitor precisa dessa folga nas duas pontas do código.`,
      });
    }
  }

  return avisos;
}

/**
 * Custo em bytes do vetor de uma página, sem a arte.
 *
 * Calibrado gerando PDFs reais e medindo a diferença entre 200 e 400 páginas,
 * variando a quantidade de códigos (1, 5, 15, 30) e os dígitos (4, 6, 10). O
 * custo por código cai conforme a quantidade sobe, porque os códigos de uma
 * mesma folha carregam o mesmo número e o Flate do fluxo de conteúdo aproveita
 * a repetição. A fórmula é deliberadamente um teto: ela superestima de 15% a
 * 95% nas configurações medidas, e errar para cima é o lado seguro de uma
 * trava que existe para não deixar a aba morrer no meio do serviço.
 */
function bytesDoVetorPorPagina(layout: Layout): number {
  const escalaDigitos = modulosPorTamanho(layout.digitos) / modulosPorTamanho(6);
  return 450 + layout.codigos.length * 110 * escalaDigitos;
}

export interface EstimativaTamanho {
  /** Bytes do resultado inteiro: todos os PDFs somados. */
  total: number;
  /** Bytes do maior arquivo isolado. */
  porArquivo: number;
  /** Quanto do total é a arte, repetida uma vez por arquivo. */
  daArte: number;
}

/**
 * Estima o tamanho do resultado antes de gerar.
 *
 * `bytesDaArteNoPdf` precisa ser o tamanho **dentro** do PDF, medido, não o do
 * arquivo em disco: o JPEG entra como está, mas o PNG é decodificado e
 * recomprimido pelo jspdf, e isso chegou a 375× o original nas medições. Usar
 * o tamanho do disco aqui subestimaria o resultado em uma ordem de grandeza.
 */
export function estimarTamanho(
  layout: Layout,
  faixa: Faixa,
  bytesDaArteNoPdf: number
): EstimativaTamanho {
  const paginas = Math.max(0, faixa.ate - faixa.de + 1);
  const arquivos = contarArquivos(faixa);
  const paginasNoMaior = Math.min(paginas, faixa.paginasPorArquivo);
  const vetor = bytesDoVetorPorPagina(layout);
  // Arte escondida não é embutida, então não pesa no resultado.
  const arte = layout.arte.visivel ? bytesDaArteNoPdf : 0;
  // A arte entra uma vez por arquivo, não por página: o `alias` do jspdf
  // reaproveita o objeto embutido. Conferido num PDF de 100 páginas, que sai
  // com um único objeto de imagem.
  return {
    total: arquivos * arte + paginas * vetor,
    porArquivo: arte + paginasNoMaior * vetor,
    daArte: arquivos * arte,
  };
}

/**
 * Palpite pessimista do custo da arte no PDF, para quando a medição falha.
 *
 * Nunca devolve zero. Zero seria o lado errado de errar: a trava de tamanho
 * passaria a ignorar a arte, que é justamente a parte que domina o resultado,
 * e liberaria uma faixa que a aba não aguenta.
 *
 * O que prevê o custo do PNG é a contagem de pixels, não o tamanho do arquivo:
 * o jspdf decodifica a imagem e guarda o bitmap, então uma miniatura de 12 KB
 * com muitos pixels sai maior que uma foto de 400 KB. Medido em três imagens,
 * deu 3,00 B/px sem canal alfa e 4,00 B/px com — daí o 4 como teto. O JPEG é
 * embutido como está, via DCTDecode, e o tamanho do arquivo serve.
 */
export function estimarBytesDaArte(arte: {
  dataUrl: string;
  formato: "PNG" | "JPEG";
  largura: number;
  altura: number;
}): number {
  if (arte.formato === "JPEG") {
    const base64 = arte.dataUrl.slice(arte.dataUrl.indexOf(",") + 1);
    return Math.round(Math.ceil((base64.length * 3) / 4) * 1.1);
  }
  return arte.largura * arte.altura * 4;
}

export function formatarBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  return mb < 100 ? `${mb.toFixed(1).replace(".", ",")} MB` : `${Math.round(mb)} MB`;
}

export interface Faixa {
  de: number;
  ate: number;
  /** Páginas por arquivo PDF. Vira um .zip quando a faixa não cabe em um só. */
  paginasPorArquivo: number;
}

/**
 * Confere a faixa contra o layout e contra o tamanho do resultado.
 *
 * A trava de tamanho é o ponto importante: sem ela o operador começa uma faixa
 * que a aba não aguenta, espera minutos e perde tudo num travamento sem
 * mensagem. Melhor recusar na hora e explicar o que reduzir.
 */
export function avaliarFaixa(
  faixa: Faixa,
  layout: Layout,
  bytesDaArteNoPdf: number
): Aviso[] {
  const avisos: Aviso[] = [];
  const { digitos } = layout;
  const maximo = 10 ** digitos - 1;

  if (!Number.isInteger(faixa.de) || !Number.isInteger(faixa.ate) || faixa.de < 0) {
    avisos.push({ gravidade: "erro", mensagem: "A faixa precisa ser de números inteiros." });
    return avisos;
  }
  if (faixa.ate < faixa.de) {
    avisos.push({
      gravidade: "erro",
      mensagem: "O número final é menor que o inicial. Inverta os dois campos.",
    });
    return avisos;
  }
  if (!Number.isInteger(faixa.paginasPorArquivo) || faixa.paginasPorArquivo < 1) {
    avisos.push({ gravidade: "erro", mensagem: "Cada arquivo precisa ter ao menos uma página." });
    return avisos;
  }
  if (faixa.ate > maximo) {
    avisos.push({
      gravidade: "erro",
      mensagem: `Com ${digitos} dígitos o maior número é ${formatarValor(
        maximo,
        digitos
      )}. Aumente os dígitos ou reduza a faixa.`,
    });
  }

  const paginas = faixa.ate - faixa.de + 1;
  if (paginas > LIMITES.paginasMaximo) {
    avisos.push({
      gravidade: "erro",
      mensagem: `${paginas.toLocaleString("pt-BR")} páginas passa do limite de ${LIMITES.paginasMaximo.toLocaleString(
        "pt-BR"
      )} de uma geração. Divida em duas faixas.`,
    });
    return avisos;
  }

  const estimativa = estimarTamanho(layout, faixa, bytesDaArteNoPdf);

  if (estimativa.total > LIMITES.bytesMaximo) {
    const arteDomina = estimativa.daArte > estimativa.total / 2;
    avisos.push({
      gravidade: "erro",
      mensagem: `O resultado sairia com cerca de ${formatarBytes(
        estimativa.total
      )}, acima do limite de ${formatarBytes(LIMITES.bytesMaximo)} que o navegador aguenta montar. ${
        arteDomina
          ? "A arte responde pela maior parte e entra uma vez por arquivo: use menos arquivos (mais páginas em cada) ou uma arte mais leve."
          : "Reduza a faixa ou divida em duas gerações."
      }`,
    });
  } else if (estimativa.total > LIMITES.bytesParaAvisar) {
    avisos.push({
      gravidade: "atencao",
      mensagem: `O resultado deve ficar perto de ${formatarBytes(
        estimativa.total
      )} e leva alguns minutos. Deixe esta aba aberta e à frente até terminar.`,
    });
  }

  return avisos;
}

/** Quantos arquivos a faixa vai gerar. */
export function contarArquivos(faixa: Faixa): number {
  const paginas = Math.max(0, faixa.ate - faixa.de + 1);
  return Math.ceil(paginas / Math.max(1, faixa.paginasPorArquivo));
}

/** Cria um código no centro da página, com medidas de etiqueta de formulário. */
export function codigoPadrao(pagina: Pagina, digitos: number): Codigo {
  const comprimento = Math.min(
    Math.max(MODULO_MINIMO_MM * modulosPorTamanho(digitos), 25),
    pagina.largura * 0.6
  );
  return {
    id: novoId(),
    x: Number(((pagina.largura - comprimento) / 2).toFixed(2)),
    y: Number((pagina.altura / 2 - 6).toFixed(2)),
    comprimento: Number(comprimento.toFixed(2)),
    altura: 12,
    rotacao: 0,
    texto: true,
    textoDigitos: 0,
    textoTamanho: 8,
    textoEspaco: 0.8,
    textoAcima: false,
    textoFonte: FONTE_PADRAO,
    textoPeso: 400,
    textoEntreletras: 0,
    textoAlinhamento: "centro",
  };
}

/**
 * Layout do FORM ROE 01: os 15 códigos em posição comprovada de produção.
 *
 * As medidas vêm do formulário impresso, que foi levantado com a origem no
 * canto de baixo; aqui já estão convertidas para o canto de cima. Vale como
 * ponto de partida — a arte que o operador carregar pode ter deslocamento, e é
 * para isso que o editor deixa arrastar.
 */
export function layoutRoe01(): Layout {
  const pagina: Pagina = { largura: 218, altura: 238 };
  const comprimento = 17.86;

  /**
   * As medidas foram levantadas no formulário impresso como a caixa **final**
   * do código, já deitada. O modelo guarda o bloco em pé e gira em torno do
   * centro, então a 90° o canto precisa ser recolocado: o centro é o mesmo nos
   * dois referenciais, e dele sai o canto do bloco não girado.
   */
  const codigo = (
    x: number,
    y: number,
    altura: number,
    rotacao: Rotacao,
    textoTamanho: number
  ): Codigo => {
    const deitado = rotacao === 90;
    const centroX = x + (deitado ? altura : comprimento) / 2;
    const centroY = y + (deitado ? comprimento : altura) / 2;
    return {
      id: novoId(),
      x: Number((centroX - comprimento / 2).toFixed(2)),
      y: Number((centroY - altura / 2).toFixed(2)),
      comprimento,
      altura,
      rotacao,
      texto: true,
      textoDigitos: 3,
      textoTamanho,
      textoEspaco: 0.8,
      // Deitada, a etiqueta do formulário traz o número à direita das barras.
      textoAcima: deitado,
      textoFonte: FONTE_PADRAO,
      textoPeso: 400,
      textoEntreletras: 0,
      textoAlinhamento: "centro",
    };
  };

  const xEtiquetas = [22.47, 43.75, 64.88, 86.01, 107.14, 128.27];

  return {
    versao: 2,
    pagina,
    digitos: 6,
    arte: ARTE_PADRAO,
    codigos: [
      // Cabeçalho, ao lado do "FORM ROE 01".
      codigo(178.27, 28.18, 6.85, 0, 9),
      // Etiquetas grandes da direita.
      codigo(184.81, 169.54, 8.04, 0, 9),
      codigo(184.81, 201.39, 8.04, 0, 9),
      // Duas fileiras de seis etiquetas pequenas, lidas de baixo para cima.
      ...xEtiquetas.map((x) => codigo(x, 175.65, 6.55, 90, 8)),
      ...xEtiquetas.map((x) => codigo(x, 204.66, 6.55, 90, 8)),
    ],
  };
}

export function layoutInicial(): Layout {
  const pagina: Pagina = { largura: 210, altura: 297 };
  return {
    versao: 2,
    pagina,
    digitos: 6,
    arte: ARTE_PADRAO,
    codigos: [codigoPadrao(pagina, 6)],
  };
}

const numeroFinito = (valor: unknown, padrao: number): number =>
  typeof valor === "number" && Number.isFinite(valor) ? valor : padrao;

const limitar = (valor: number, min: number, max: number) =>
  Math.min(max, Math.max(min, valor));

/**
 * Lê um layout de fonte não confiável — arquivo do operador ou
 * `localStorage` de uma versão anterior — e devolve algo sempre utilizável.
 *
 * Não valida por schema para rejeitar: um JSON com um campo estranho ainda
 * carrega o trabalho de meia hora do operador. Cada campo cai no padrão e
 * segue.
 */
export function normalizarLayout(entrada: unknown): Layout {
  const bruto = (entrada ?? {}) as Partial<Layout> & { pagina?: Partial<Pagina> };
  const base = layoutInicial();

  const pagina: Pagina = {
    largura: limitar(
      numeroFinito(bruto.pagina?.largura, base.pagina.largura),
      LIMITES.pagina.min,
      LIMITES.pagina.max
    ),
    altura: limitar(
      numeroFinito(bruto.pagina?.altura, base.pagina.altura),
      LIMITES.pagina.min,
      LIMITES.pagina.max
    ),
  };

  const digitos = Math.round(
    limitar(numeroFinito(bruto.digitos, base.digitos), LIMITES.digitos.min, LIMITES.digitos.max)
  );

  const veioDaVersao1 = ehVersao1(entrada);
  const codigos = (Array.isArray(bruto.codigos) ? bruto.codigos : [])
    .slice(0, LIMITES.codigosMaximo)
    .map(
    (item): Codigo => {
      const c = (item ?? {}) as Partial<Codigo>;
      return {
        id: typeof c.id === "string" && c.id.length > 0 ? c.id : novoId(),
        x: limitar(numeroFinito(c.x, 0), -LIMITES.pagina.max, LIMITES.pagina.max),
        y: limitar(numeroFinito(c.y, 0), -LIMITES.pagina.max, LIMITES.pagina.max),
        comprimento: limitar(
          numeroFinito(c.comprimento, 30),
          LIMITES.comprimento.min,
          LIMITES.comprimento.max
        ),
        altura: limitar(numeroFinito(c.altura, 10), LIMITES.altura.min, LIMITES.altura.max),
        rotacao: normalizarAngulo(numeroFinito(c.rotacao, 0)),
        texto: c.texto !== false,
        textoDigitos: Math.round(limitar(numeroFinito(c.textoDigitos, 0), 0, 12)),
        textoTamanho: limitar(numeroFinito(c.textoTamanho, 8), 3, 48),
        textoEspaco: limitar(numeroFinito(c.textoEspaco, 0.8), 0, 20),
        textoAcima: c.textoAcima === true,
        textoFonte: fontePorId(typeof c.textoFonte === "string" ? c.textoFonte : "").id,
        textoPeso: c.textoPeso === 700 ? 700 : 400,
        textoEntreletras: limitar(numeroFinito(c.textoEntreletras, 0), -0.2, 1),
        textoAlinhamento:
          c.textoAlinhamento === "esquerda" || c.textoAlinhamento === "direita"
            ? c.textoAlinhamento
            : "centro",
      };
    })
    .map((codigo) => (veioDaVersao1 ? migrarDaVersao1(codigo) : codigo));

  const arteBruta = (bruto.arte ?? {}) as Partial<Layout["arte"]>;

  return {
    versao: 2,
    pagina,
    digitos,
    arte: {
      opacidade: limitar(numeroFinito(arteBruta.opacidade, 1), 0, 1),
      visivel: arteBruta.visivel !== false,
    },
    codigos: codigos.length > 0 ? codigos : [codigoPadrao(pagina, digitos)],
  };
}

/**
 * Traz um layout da versão 1 para a 2.
 *
 * Na 1, `x` e `y` eram o canto da caixa **já girada**, e o único giro possível
 * era 90°. Na 2 são o canto do bloco em pé, girado em torno do centro. Sem
 * converter, uma etiqueta deitada reapareceria deslocada em milímetros — em
 * silêncio, que é o pior jeito de errar aqui: o operador reabre a folha
 * montada, não percebe, e a tiragem sai com o código fora do campo.
 *
 * O centro é o mesmo nos dois referenciais, então é dele que sai o canto novo.
 * A 1 também punha o número à direita das barras deitadas, que na 2 é
 * `textoAcima`.
 */
function migrarDaVersao1(codigo: Codigo): Codigo {
  if (!ehAnguloReto(codigo.rotacao) || normalizarAngulo(codigo.rotacao) % 180 === 0) {
    return codigo;
  }
  const centroX = codigo.x + codigo.altura / 2;
  const centroY = codigo.y + codigo.comprimento / 2;
  return {
    ...codigo,
    x: Number((centroX - codigo.comprimento / 2).toFixed(2)),
    y: Number((centroY - codigo.altura / 2).toFixed(2)),
    textoAcima: true,
  };
}

/**
 * Um layout da versão 1 nunca traz `textoAcima`, que a 2 sempre escreve.
 *
 * É um discriminador mais confiável que o número da versão: houve layouts
 * gravados com `versao: 1` e o modelo já novo durante o desenvolvimento, e
 * migrar um deles deslocaria o que estava certo.
 */
function ehVersao1(entrada: unknown): boolean {
  const bruto = entrada as { versao?: unknown; codigos?: unknown };
  if (typeof bruto?.versao === "number" && bruto.versao >= 2) return false;
  const codigos = Array.isArray(bruto?.codigos) ? bruto.codigos : [];
  return !codigos.some(
    (item) => typeof item === "object" && item !== null && "textoAcima" in item
  );
}

/** Nome do arquivo de um bloco da faixa. */
export function nomeArquivoPdf(de: number, ate: number, digitos: number): string {
  return de === ate
    ? `${formatarValor(de, digitos)}.pdf`
    : `${formatarValor(de, digitos)}-${formatarValor(ate, digitos)}.pdf`;
}

export function nomeArquivoZip(faixa: Faixa, digitos: number): string {
  return `codigos-${formatarValor(faixa.de, digitos)}-${formatarValor(faixa.ate, digitos)}.zip`;
}
