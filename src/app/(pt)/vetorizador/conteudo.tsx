import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /vetorizador.
 *
 * Números conferidos contra src/lib/vetorizador.ts: TIPOS_ACEITOS, MAX_BYTES,
 * CORES_MAXIMAS e os limites de traçado. O que a ferramenta não faz bem — foto
 * com muito degradê — está escrito, porque prometer o contrário gera volta.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "O que é vetorizar uma imagem?",
    conteudo: (
      <>
        <p>
          Uma imagem comum — JPG, PNG — é uma grade de pixels: ampliar revela os quadradinhos. Um{" "}
          <Dado>SVG é um desenho</Dado>, uma lista de curvas e cores. Ele não tem resolução: a mesma marca serve
          para um favicon de 16 pixels e para um adesivo de dois metros, com a borda sempre limpa.
        </p>
        <p>
          Vetorizar é o caminho de volta: partir dos pixels e redesenhar as formas que estão ali como curvas. Por
          isso funciona muito bem com logo, ícone, ilustração de traço e desenho de cor chapada — e mal com foto
          cheia de degradê, onde não existe forma nítida a recuperar.
        </p>
      </>
    ),
  },
  {
    titulo: "Como converter PNG ou JPG em SVG",
    conteudo: (
      <>
        <p>
          Solte o arquivo na área acima. A ferramenta separa as cores, encontra o contorno de cada região e ajusta{" "}
          <Dado>curvas de Bézier</Dado> por cima — não um polígono de mil lados fingindo ser curva. Reta é
          reconhecida como reta, arco como arco, canto como canto.
        </p>
        <p>
          Depois de pronto, o comparador mostra o original e o vetor lado a lado, e a página informa a{" "}
          <Dado>fidelidade medida</Dado>: a porcentagem de pixels em que o desenho bate com a imagem de entrada.
          Você ajusta número de cores e nível de detalhe e vê a fidelidade mudar antes de baixar. Aceita JPG, PNG,
          WebP e AVIF, até 80 MB, e até 64 cores no resultado.
        </p>
      </>
    ),
  },
  {
    titulo: "A imagem não sai do seu aparelho",
    conteudo: (
      <>
        <p>
          A vetorização roda <Dado>inteira dentro do seu navegador</Dado>, num motor compilado para WebAssembly
          que é baixado junto com a página. Nenhum byte da sua imagem é enviado a servidor nenhum — não há upload,
          não há fila e não há nada para apagar depois.
        </p>
        <p>
          Isso importa quando o arquivo é a marca de um cliente sob acordo de confidencialidade, ou material que
          ainda não foi lançado. Também é o motivo de não haver limite diário: o custo do processamento é do seu
          aparelho, não nosso.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Que tipo de imagem vale a pena vetorizar?",
    resposta:
      "Logo, ícone, ilustração de traço, desenho de cor chapada, assinatura digitalizada e captura de tela de interface. O que essas imagens têm em comum é forma nítida e pouca variação de cor dentro de cada região — é disso que o traçado consegue recuperar uma curva.",
  },
  {
    pergunta: "Funciona com foto?",
    resposta:
      "Funciona, mas o resultado raramente compensa. Foto é feita de degradê contínuo, e vetorizar transforma degradê em manchas de cor chapada: o arquivo fica pesado e o resultado parece um pôster. Vetorização serve para logo, ícone, ilustração de traço e desenho de cor chapada.",
  },
  {
    pergunta: "O SVG fica idêntico à imagem original?",
    resposta:
      "Não, e nenhum vetorizador entrega isso. O traçado simplifica: junta cores próximas, descarta ruído e aproxima curvas. Por isso a página mostra a fidelidade medida em porcentagem — você vê o quanto foi perdido antes de baixar, em vez de descobrir na impressão.",
  },
  {
    pergunta: "Minha imagem é enviada para algum servidor?",
    resposta:
      "Não. O motor de vetorização roda dentro do seu navegador, em WebAssembly. A imagem não é enviada, não fica gravada em lugar nenhum e não passa por servidor — nem o nosso, nem o de terceiro.",
  },
  {
    pergunta: "Qual o tamanho máximo de arquivo?",
    resposta:
      "80 MB, nos formatos JPG, PNG, WebP e AVIF. Imagens muito grandes são reduzidas antes do traçado: acima de certo tamanho o detalhe extra não muda o desenho e só consumiria memória do seu aparelho.",
  },
  {
    pergunta: "Posso usar o SVG comercialmente?",
    resposta:
      "O arquivo é seu, para o uso que quiser, inclusive comercial. Não cobramos, não marcamos e não reivindicamos nada sobre o resultado. Conferir se o conteúdo da imagem respeita marca ou direito autoral de terceiro é responsabilidade de quem envia.",
  },
  {
    pergunta: "Dá para editar o SVG depois?",
    resposta:
      "Sim. O arquivo é um SVG comum, com as formas separadas por cor, e abre no Illustrator, Inkscape, Figma, Affinity ou qualquer editor vetorial — onde você pode mexer em cada curva e em cada cor.",
  },
  {
    pergunta: "Qual a diferença entre vetorizar e só salvar como SVG?",
    resposta:
      "Salvar um PNG dentro de um arquivo .svg apenas embrulha os mesmos pixels: ampliar continua mostrando os quadradinhos. Vetorizar redesenha as formas como curvas, e é o que faz o arquivo ficar nítido em qualquer tamanho.",
  },
];

export const VEJA = ["/png-para-svg", "/jpg-para-svg", "/removedor-de-fundo"];
