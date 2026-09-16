import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /removedor-de-fundo.
 *
 * Os números saem do código, não de marketing: LADO_MAXIMO_DE_ENVIO e MAX_BYTES
 * em src/lib/removedorDeFundo.ts, os modelos em public/modelos, e o contrato do
 * serviço em workers/removedor-de-fundo/README.md. Se algum deles mudar, este
 * texto precisa mudar junto.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "Como tirar o fundo de uma foto",
    conteudo: (
      <>
        <p>
          Arraste a imagem para a área acima, ou clique para escolher um arquivo. O recorte sai sozinho em alguns
          segundos e você baixa um <Dado>PNG com fundo transparente</Dado>. Não há cadastro, fila, marca d&apos;água
          nem limite de downloads.
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
    titulo: "Que qualidade de borda esperar",
    conteudo: (
      <>
        <p>
          O recorte não é um contorno duro: cada pixel da borda recebe uma <Dado>transparência parcial</Dado>, o
          que é o que permite fio de cabelo, pelo de animal e folha fina aparecerem sem serrilhado e sem aquela
          auréola clara que denuncia recorte automático.
        </p>
        <p>
          O arquivo sai na <Dado>resolução original da foto</Dado>, não numa prévia reduzida. Aceita JPG, PNG,
          WebP e AVIF, até 80 MB por arquivo.
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
          A foto em tamanho original <Dado>nunca sai do seu aparelho</Dado>: o recorte final é montado aqui, no seu
          navegador, combinando a máscara que voltou com a imagem que você abriu. E quando o serviço está fora do
          ar ou o limite diário acabou, o recorte inteiro passa a ser feito no seu próprio aparelho, com modelos
          menores — a página avisa quando isso acontece.
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
    pergunta: "Preciso instalar alguma coisa?",
    resposta:
      "Não. Funciona no navegador, no computador e no celular, sem instalar programa nem extensão. Também não precisa de conta.",
  },
  {
    pergunta: "Dá para trocar o fundo por uma cor ou por outra imagem?",
    resposta:
      "O download sai com fundo transparente, que é o que permite montar o recorte sobre qualquer cor ou imagem no editor da sua preferência. A troca de fundo dentro da própria ferramenta ainda não existe.",
  },
];

export const VEJA = ["/vetorizador", "/qr-code"];
