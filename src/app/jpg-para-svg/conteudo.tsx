import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /jpg-para-svg.
 *
 * O assunto aqui é o oposto do da página de PNG: o JPG chega com artefato de
 * compressão e quase sempre é foto, que é o pior caso para vetorizar. Dizer
 * isso é mais útil — e mais honesto — do que prometer conversão perfeita.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "O JPG chega com ruído, e isso atrapalha o traçado",
    conteudo: (
      <>
        <p>
          JPG é compressão <Dado>com perda</Dado>: para economizar espaço, o formato embaralha um pouco os pixels
          em volta de toda borda de alto contraste. É o chamado artefato de blocagem, e a olho nu quase não se vê
          — mas o traçado vê, e tende a seguir o borrão em vez da forma.
        </p>
        <p>
          Na prática, isso aparece como uma borda levemente ondulada onde deveria haver uma reta. Se o mesmo
          desenho existir em PNG, prefira o PNG: o resultado é mais limpo com o mesmo esforço.
        </p>
      </>
    ),
  },
  {
    titulo: "Se o seu JPG é uma foto, provavelmente não compensa",
    conteudo: (
      <>
        <p>
          A maior parte dos JPGs do mundo é foto, e foto é o <Dado>pior caso</Dado> para vetorização. Foto é
          degradê contínuo; vetor é forma de cor chapada. Converter transforma o degradê em manchas, o arquivo
          fica pesado e o resultado parece um pôster serigrafado — às vezes bonito, quase nunca o que a pessoa
          queria.
        </p>
        <p>
          Vale a pena quando o JPG é, na verdade, um desenho salvo em JPG: logo, ícone, ilustração de traço,
          rótulo, assinatura digitalizada. É o caso comum de quem recebeu a marca de um cliente por e-mail e não
          tem o arquivo original.
        </p>
      </>
    ),
  },
  {
    titulo: "Como tirar o melhor de um JPG ruim",
    conteudo: (
      <>
        <p>
          <Dado>Reduza o número de cores.</Dado> Menos cores forçam o traçado a ignorar a variação que a
          compressão inventou e a enxergar as regiões que importam. Num logo de duas cores, peça duas cores.
        </p>
        <p>
          Depois, confira a <Dado>fidelidade medida</Dado> que a página informa antes de baixar: é a porcentagem
          de pixels em que o desenho bate com a imagem de entrada. Ela cai quando você simplifica demais, e é o
          jeito de achar o ponto em que o arquivo ficou limpo sem deixar de ser a mesma marca.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Como converter JPG para SVG?",
    resposta:
      "Solte o arquivo JPG na área acima. Como o JPG chega com ruído de compressão, o primeiro ajuste que costuma valer é baixar o número de cores — e a fidelidade que a página informa mostra se você simplificou demais. Depois é só baixar o SVG.",
  },
  {
    pergunta: "Dá para vetorizar uma foto em JPG?",
    resposta:
      "Dá, mas o resultado raramente compensa. Foto é degradê contínuo e vetor é forma de cor chapada: a conversão transforma o degradê em manchas, o arquivo fica pesado e o resultado parece um pôster. Vetorização serve para logo, ícone e ilustração de traço.",
  },
  {
    pergunta: "Por que a borda do meu SVG ficou ondulada?",
    resposta:
      "Porque o JPG comprime com perda e embaralha os pixels em volta de toda borda de alto contraste. O traçado segue esse borrão. Reduzir o número de cores ajuda, e usar o PNG do mesmo desenho, quando existe, resolve.",
  },
  {
    pergunta: "JPG ou PNG: qual converte melhor?",
    resposta:
      "PNG, sempre que houver escolha. PNG é compressão sem perda e guarda a borda exata entre as cores, enquanto o JPG entrega a borda já borrada pela compressão.",
  },
  {
    pergunta: "O arquivo é enviado para algum servidor?",
    resposta:
      "Não. O traçado acontece no seu próprio aparelho, e o JPG nunca é transmitido — o que importa quando o arquivo é a marca de um cliente que chegou por e-mail e não pode circular.",
  },
  {
    pergunta: "Qual o tamanho máximo do JPG?",
    resposta:
      "80 MB. Vale notar que resolução alta não melhora o resultado de um JPG: o ruído de compressão também é ampliado, e um arquivo de 8 mil pixels costuma vetorizar igual ou pior que o mesmo desenho com 2 mil.",
  },
  {
    pergunta: "O SVG fica com a qualidade do original?",
    resposta:
      "Não fica idêntico, e nenhum vetorizador entrega isso. O traçado simplifica: junta cores próximas, descarta ruído e aproxima curvas. Por isso a página mostra a fidelidade em porcentagem, para você ver quanto foi perdido antes de baixar.",
  },
];

export const VEJA = ["/vetorizador", "/png-para-svg"];
