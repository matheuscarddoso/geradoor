import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /qr-code.
 *
 * Um cuidado que quase todo blog erra: os percentuais de correção de erro do QR
 * Code (7%, 15%, 25%, 30%) são sobre CODEWORDS, não sobre área da imagem. A
 * própria Denso Wave é explícita nisso. Dizer "o nível H tolera cobrir 30% da
 * imagem" é falso e leva a código que não lê.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "Como criar um QR Code de um link",
    conteudo: (
      <>
        <p>
          Cole o endereço no campo acima. O QR Code aparece na hora e pode ser baixado em{" "}
          <Dado>PNG, SVG ou PDF</Dado>. Para impressão, prefira SVG ou PDF: são vetoriais e ficam nítidos em
          qualquer tamanho, do adesivo ao painel.
        </p>
        <p>
          O código aponta para um link curto nosso, que redireciona para o endereço informado. É o que permite o
          desenho ficar mais simples e mais fácil de ler — quanto mais longo o texto, mais denso o QR Code e mais
          perto a câmera precisa chegar.
        </p>
      </>
    ),
  },
  {
    titulo: "Por que dá para pôr uma logo no meio",
    conteudo: (
      <>
        <p>
          Todo QR Code carrega redundância: o padrão define quatro níveis de correção de erro — L, M, Q e H —, que
          recuperam respectivamente cerca de <Dado>7%, 15%, 25% e 30% dos codewords</Dado> do símbolo, usando
          Reed-Solomon. É a mesma matemática que faz um código riscado ou sujo continuar lendo.
        </p>
        <p>
          Quando você adiciona uma logo, esta página sobe a correção para o <Dado>nível H</Dado>, o mais alto, e é
          esse orçamento de recuperação que a logo consome. Por isso ela vai no centro e não no canto: os três
          quadrados de posicionamento e os padrões de temporização <Dado>não são protegidos</Dado> por correção de
          erro nenhuma — cobrir um deles quebra o código em qualquer nível.
        </p>
        <p>Uma ressalva que vale escrever: os percentuais são sobre os codewords, não sobre a área da imagem.</p>
      </>
    ),
  },
  {
    titulo: "O link curto e o que fica guardado",
    conteudo: (
      <>
        <p>
          Para o QR Code funcionar depois, o endereço de destino precisa ficar guardado. Ficam no nosso banco: a
          URL informada, o código curto, a data de criação e a <Dado>contagem de leituras</Dado>. Cada leitura
          registra apenas data e hora — não guardamos IP, localização nem aparelho de quem leu.
        </p>
        <p>
          Por isso, não coloque informação sensível na URL encurtada: quem tiver o código curto chega ao destino.
          O detalhe está na Política de Privacidade.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "O QR Code expira?",
    resposta:
      "Não. O link curto fica ativo por tempo indeterminado e o código continua funcionando. Se quiser desativar um QR Code que você criou, peça por e-mail.",
  },
  {
    pergunta: "Posso imprimir em tamanho grande?",
    resposta:
      "Sim. Baixe em SVG ou PDF: os dois são vetoriais e ficam nítidos em qualquer tamanho, sem os quadradinhos que aparecem ao ampliar um PNG.",
  },
  {
    pergunta: "Tem marca d'água ou limite de uso?",
    resposta:
      "Não. Não há marca d'água, cadastro, limite de códigos nem cobrança, e o arquivo é seu para qualquer uso, inclusive comercial.",
  },
  {
    pergunta: "Por que a logo tem que ficar no centro?",
    resposta:
      "Porque as três marcas de posicionamento nos cantos e os padrões de temporização não são cobertos por correção de erro: tapar qualquer um deles quebra o código. O centro é a única região que a correção de erro consegue reconstruir.",
  },
  {
    pergunta: "Qual o nível de correção de erro usado?",
    resposta:
      "Quando há logo, o nível H, o mais alto, que recupera cerca de 30% dos codewords do símbolo. É esse orçamento que a logo consome. Sem logo, um nível menor já basta e deixa o desenho mais simples de ler.",
  },
  {
    pergunta: "Dá para saber quantas pessoas leram o código?",
    resposta:
      "A contagem de leituras é registrada, com data e hora. Não guardamos IP, localização, aparelho nem qualquer informação sobre quem leu.",
  },
  {
    pergunta: "Posso mudar o destino depois de imprimir?",
    resposta:
      "Ainda não. O código curto aponta para o endereço informado na criação e não é editável — se o destino mudar, será preciso gerar um novo QR Code.",
  },
];

export const VEJA = ["/instagram", "/whatsapp", "/vetorizador"];
