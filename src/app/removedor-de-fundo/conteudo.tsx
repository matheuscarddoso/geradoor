import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /removedor-de-fundo.
 *
 * Os números saem do código, não de marketing: LADO_MAXIMO_DE_ENVIO e MAX_BYTES
 * em src/lib/removedorDeFundo.ts, os modelos em public/modelos, e o contrato do
 * serviço em workers/removedor-de-fundo/README.md. Se algum deles mudar, este
 * texto precisa mudar junto.
 *
 * Sobre a escolha de palavras: a página dizia só "removedor de fundo" e "tirar
 * o fundo". Quem procura escreve também "remover fundo de imagem", "sem perder
 * qualidade", "foto de produto" e, às vezes, "background" — e nenhuma dessas
 * aparecia aqui. As seções abaixo cobrem esses assuntos porque eles são
 * realmente diferentes entre si, não para repetir o mesmo termo: contra
 * remove.bg e Canva a disputa se ganha na busca específica, onde temos
 * argumento de verdade (resolução original, sem marca d'água, sem cadastro).
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "Como remover o fundo de uma imagem",
    conteudo: (
      <>
        <p>
          Arraste a imagem para a área acima, ou clique para escolher um arquivo. O recorte sai sozinho em alguns
          segundos e você baixa um <Dado>PNG com fundo transparente</Dado>. Não há cadastro, fila, marca
          d&apos;água nem limite de downloads.
        </p>
        <p>
          Se a máquina errar em algum canto — um vão entre o braço e o corpo, uma alça fina, uma sombra —, o
          pincel corrige à mão: pinte para devolver o que foi apagado ou para apagar o que sobrou. O pincel mágico
          completa a forma sozinho a partir de um traço curto.
        </p>
      </>
    ),
  },
  {
    titulo: "O recorte sai na resolução original, sem perder qualidade",
    conteudo: (
      <>
        <p>
          Esta é a diferença que costuma pesar na hora de escolher a ferramenta. O arquivo sai{" "}
          <Dado>do tamanho que entrou</Dado>: se você subiu uma foto de 12 megapixels, o PNG recortado tem 12
          megapixels. Não existe prévia reduzida, download em baixa resolução nem versão paga que libera o tamanho
          cheio.
        </p>
        <p>
          O recorte também não recomprime a imagem. A máscara calculada é aplicada sobre os pixels originais, no
          seu próprio navegador — o que sai é a sua foto com o fundo vazado, não uma cópia processada dela.
        </p>
      </>
    ),
  },
  {
    titulo: "Que qualidade de borda esperar",
    conteudo: (
      <>
        <p>
          O recorte não é um contorno duro: cada pixel da borda recebe uma <Dado>transparência parcial</Dado>, o
          que é o que permite fio de cabelo, pelo de animal e folha fina aparecerem sem serrilhado e sem aquela
          auréola clara que denuncia recorte automático.
        </p>
        <p>
          Aceita JPG, PNG, WebP e AVIF, até 80 MB por arquivo. O caso difícil é cabelo muito claro sobre fundo
          muito claro, onde não há contraste para a máquina decidir — e é exatamente para isso que existe o
          pincel.
        </p>
      </>
    ),
  },
  {
    titulo: "Remover o fundo de foto de produto",
    conteudo: (
      <>
        <p>
          É o uso mais comum, e o que mais exige. Marketplace costuma pedir{" "}
          <Dado>fundo branco e produto centralizado</Dado>, e uma foto tirada na bancada raramente chega assim.
          Baixando o PNG transparente você monta o produto sobre o branco — ou sobre qualquer cor da campanha —
          sem refazer a foto.
        </p>
        <p>
          Dois detalhes que fazem diferença em catálogo: produto com <Dado>parte vazada</Dado>, como a alça de uma
          bolsa ou o vão de uma cadeira, precisa que o buraco fique transparente também, e não preenchido — o
          pincel resolve quando a máquina fecha o vão por engano. E produto brilhante ou transparente, como vidro
          e acrílico, é o caso em que quase toda ferramenta erra: confira a borda antes de publicar.
        </p>
      </>
    ),
  },
  {
    titulo: "A sua foto fica guardada?",
    conteudo: (
      <>
        <p>
          Não. Para decidir o contorno, o navegador envia uma <Dado>cópia reduzida</Dado> da imagem — no máximo
          2048 pixels de lado — a um serviço nosso, que devolve só a máscara do que está em primeiro plano. A
          cópia é processada e descartada ao fim do pedido, sem gravação e sem cache, e o pedido segue sem cookie
          e sem referer.
        </p>
        <p>
          A foto em tamanho original <Dado>nunca sai do seu aparelho</Dado>: o recorte final é montado aqui, no
          seu navegador, combinando a máscara que voltou com a imagem que você abriu. E quando o serviço está fora
          do ar ou o limite diário acabou, o recorte inteiro passa a ser feito no seu próprio aparelho, com
          modelos menores — a página avisa quando isso acontece.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "É grátis mesmo? Tem marca d'água?",
    resposta:
      "É grátis e não tem marca d'água. Não há cadastro, não há versão paga escondida e o arquivo sai na resolução original da foto — não numa prévia reduzida que só melhora se você pagar.",
  },
  {
    pergunta: "Dá para remover o fundo sem perder qualidade?",
    resposta:
      "Sim. O PNG sai com a mesma resolução da imagem que entrou e a máscara é aplicada sobre os pixels originais, sem recompressão. O que muda é só o fundo, que fica transparente.",
  },
  {
    pergunta: "Removedor de fundo e removedor de background são a mesma coisa?",
    resposta:
      "São. Background é o termo em inglês para fundo, e as duas expressões descrevem a mesma função: separar o que está em primeiro plano do resto da imagem e devolver o recorte com o fundo transparente.",
  },
  {
    pergunta: "Em que formato sai o arquivo?",
    resposta:
      "PNG com canal alfa, que é o formato que guarda transparência de verdade. JPG não serve para isso: o formato não tem canal de transparência, e o fundo removido voltaria como branco.",
  },
  {
    pergunta: "Funciona com cabelo, pelo e objeto de borda fina?",
    resposta:
      "Sim. A borda recebe transparência parcial em vez de um contorno de liga-desliga, que é o que permite fio de cabelo e pelo de animal saírem sem serrilhado. Em cabelo muito claro sobre fundo muito claro o resultado piora — nesse caso o pincel corrige o que sobrou.",
  },
  {
    pergunta: "Serve para foto de produto de e-commerce?",
    resposta:
      "Serve, e é o uso mais comum. Baixe o PNG transparente e monte o produto sobre o fundo branco que o marketplace pede. Produto com parte vazada e produto de vidro são os casos que pedem conferência antes de publicar.",
  },
  {
    pergunta: "Qual o tamanho máximo de imagem?",
    resposta:
      "80 MB por arquivo, nos formatos JPG, PNG, WebP e AVIF. Fotos muito grandes são reduzidas apenas para a etapa de decidir o contorno; o recorte final é montado na resolução original.",
  },
  {
    pergunta: "Minhas fotos são usadas para treinar algum modelo?",
    resposta:
      "Não. A cópia reduzida enviada para calcular o contorno é descartada ao fim do pedido, não é gravada e não alimenta treinamento nenhum. A foto em tamanho original nem chega a sair do seu aparelho.",
  },
  {
    pergunta: "Preciso instalar alguma coisa ou criar conta?",
    resposta:
      "Não. Funciona no navegador, no computador e no celular, sem instalar programa nem extensão, e sem cadastro — não há e-mail a informar nem limite atrás de login.",
  },
  {
    pergunta: "Dá para trocar o fundo por uma cor ou por outra imagem?",
    resposta:
      "O download sai com fundo transparente, que é o que permite montar o recorte sobre qualquer cor ou imagem no editor da sua preferência. A troca de fundo dentro da própria ferramenta ainda não existe.",
  },
];

export const VEJA = ["/vetorizador", "/qr-code"];
