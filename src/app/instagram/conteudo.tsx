import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /instagram. O QR aponta para a URL pública do perfil, não para um recurso interno do app. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "Como criar um QR Code do seu Instagram",
    conteudo: (
      <>
        <p>
          Digite o seu <Dado>@</Dado> e o código aparece na hora, apontando para o endereço público do seu perfil.
          Baixe em PNG para usar em tela, ou em SVG e PDF para imprimir — os dois últimos são vetoriais e ficam
          nítidos em qualquer tamanho.
        </p>
        <p>
          Qualquer câmera de celular lê, sem precisar do aplicativo do Instagram aberto: o código é um QR Code
          comum, não o código interno do app. Quem escanear vai direto para o seu perfil.
        </p>
      </>
    ),
  },
  {
    titulo: "Por que não usar o código do próprio aplicativo",
    conteudo: (
      <>
        <p>
          O Instagram tem um código próprio, que só é lido de dentro do aplicativo, pela câmera dele. Serve bem
          quando as duas pessoas já estão no Instagram — e falha em cartaz, vitrine, cardápio e cartão de visita,
          onde quem passa vai apontar a câmera normal do celular.
        </p>
        <p>
          O código desta página é um <Dado>QR Code padrão</Dado>, que aponta para instagram.com com o seu usuário.
          Qualquer câmera lê, e o celular abre no aplicativo se ele estiver instalado.
        </p>
      </>
    ),
  },
  {
    titulo: "Onde imprimir e em que tamanho",
    conteudo: (
      <>
        <p>
          Em vitrine, embalagem, cardápio, crachá e cartão de visita. Para impressão prefira{" "}
          <Dado>SVG ou PDF</Dado>: não têm resolução fixa e não ficam com serrilhado ao ampliar.
        </p>
        <p>
          Deixe uma margem branca em volta do código — sem essa borda, a câmera perde a referência das marcas de
          canto e a leitura falha. E imprima com bom contraste: código claro sobre fundo escuro costuma dar
          trabalho para leitores mais simples.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Precisa ter o Instagram aberto para ler?",
    resposta:
      "Não. É um QR Code comum, que qualquer câmera de celular lê. O aparelho abre o link no aplicativo do Instagram se ele estiver instalado, ou no navegador se não estiver.",
  },
  {
    pergunta: "Funciona para perfil comercial e para perfil pessoal?",
    resposta:
      "Sim, para qualquer perfil público. O código aponta para o endereço do seu usuário no instagram.com, e o tipo de conta não muda nada.",
  },
  {
    pergunta: "O QR Code para de funcionar se eu trocar de @?",
    resposta:
      "Sim. O código aponta para o endereço do usuário informado — trocando o @, o endereço antigo deixa de existir e é preciso gerar um novo código.",
  },
  {
    pergunta: "Dá para imprimir em tamanho grande?",
    resposta:
      "Sim. Baixe em SVG ou PDF, que são vetoriais e ficam nítidos em qualquer tamanho, do crachá ao cartaz. O PNG serve melhor para uso em tela.",
  },
  {
    pergunta: "Tem marca d'água ou cobrança?",
    resposta:
      "Não. Não há marca d'água, cadastro nem cobrança, e o arquivo é seu para qualquer uso, inclusive comercial.",
  },
  {
    pergunta: "Qual a diferença para o nametag do Instagram?",
    resposta:
      "O nametag só é lido de dentro do aplicativo do Instagram. Este é um QR Code padrão, lido por qualquer câmera — que é o que você precisa em material impresso, onde ninguém vai abrir o app para escanear.",
  },
];

export const VEJA = ["/qr-code", "/whatsapp", "/removedor-de-fundo"];
