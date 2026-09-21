import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /png-para-svg.
 *
 * Não é o do /vetorizador com a palavra trocada — seria página fina, e é o que
 * o Google diz explicitamente que não quer. O que está aqui só vale para PNG:
 * o canal alfa, o print de tela, o PNG que já nasceu de um vetor. O que vale
 * para JPG está na outra página, e é outro assunto.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "O PNG é o melhor formato para vetorizar",
    conteudo: (
      <>
        <p>
          PNG é compressão <Dado>sem perda</Dado>: o arquivo guarda exatamente os pixels que o programa gravou,
          sem os borrões que o JPG cria em volta das bordas. Para o traçado isso muda tudo — a fronteira entre uma
          cor e outra vem nítida, e a curva ajustada por cima cai onde deve cair.
        </p>
        <p>
          É por isso que um logo exportado em PNG quase sempre vetoriza melhor do que o mesmo logo em JPG, mesmo
          com o mesmo tamanho em pixels.
        </p>
      </>
    ),
  },
  {
    titulo: "O que acontece com a transparência",
    conteudo: (
      <>
        <p>
          PNG tem <Dado>canal alfa</Dado>, e um logo em PNG normalmente vem com fundo transparente. O traçado
          respeita isso: a região transparente não vira forma nenhuma, e o SVG sai com o fundo vazado — o que é
          exatamente o que você quer quando o arquivo vai para cima de outra cor.
        </p>
        <p>
          Cuidado com um caso: PNG com transparência <Dado>parcial</Dado>, como sombra suave ou brilho esfumaçado.
          Vetor não tem meio-tom de opacidade por pixel, então a sombra vira degrau de cor ou desaparece. Se o
          arquivo tem sombra, ela provavelmente não sobrevive.
        </p>
      </>
    ),
  },
  {
    titulo: "Print de tela também funciona",
    conteudo: (
      <>
        <p>
          Captura de tela é o caso em que a conversão mais compensa, e quase ninguém pensa nisso. Um print de um
          ícone, de um gráfico ou de um diagrama é <Dado>cor chapada com borda nítida</Dado> — o cenário ideal
          para o traçado. Você recupera um arquivo editável de algo que só existia como imagem.
        </p>
        <p>
          Print de texto pequeno é a exceção: letra com 10 ou 12 pixels de altura não tem forma suficiente para
          redesenhar, e o resultado sai empastado. Nesse caso, aumente o nível de detalhe antes de baixar e
          confira a fidelidade que a página informa.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Como converter PNG para SVG?",
    resposta:
      "Solte o arquivo PNG na área acima e aguarde o traçado. Ajuste o número de cores e o nível de detalhe se quiser, confira a fidelidade que a página informa e baixe o SVG. Não precisa de cadastro nem de programa instalado.",
  },
  {
    pergunta: "A transparência do PNG é mantida no SVG?",
    resposta:
      "Sim, quando é transparência total: a região vazada não vira forma e o SVG sai com fundo transparente. Transparência parcial, como sombra suave, não sobrevive — vetor não tem opacidade por pixel, então o degradê vira degrau de cor ou some.",
  },
  {
    pergunta: "Por que o PNG vetoriza melhor que o JPG?",
    resposta:
      "Porque PNG é compressão sem perda e guarda a borda exata entre uma cor e outra. O JPG cria borrões em volta das bordas ao comprimir, e o traçado acaba seguindo o borrão em vez da forma.",
  },
  {
    pergunta: "Funciona com print de tela?",
    resposta:
      "Funciona muito bem, porque captura de tela costuma ser cor chapada com borda nítida. A exceção é texto pequeno: letra com poucos pixels de altura não tem forma suficiente para ser redesenhada e sai empastada.",
  },
  {
    pergunta: "O arquivo é enviado para algum servidor?",
    resposta:
      "Não. A conversão roda dentro do seu navegador, em WebAssembly. O PNG não é enviado, não fica gravado em lugar nenhum e não passa por servidor.",
  },
  {
    pergunta: "Qual o tamanho máximo do PNG?",
    resposta:
      "80 MB. Imagens muito grandes são reduzidas antes do traçado, porque acima de certo tamanho o detalhe extra não muda o desenho e só consumiria memória do seu aparelho.",
  },
  {
    pergunta: "Dá para converter vários PNGs de uma vez?",
    resposta:
      "Ainda não. A conversão é de um arquivo por vez, para você poder conferir a fidelidade e ajustar cores e detalhe antes de baixar.",
  },
];

export const VEJA = ["/vetorizador", "/jpg-para-svg"];
