import Link from "next/link";
import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";
import type { ConteudoDaHome } from "@/components/home/Home";
import { ROTAS_PUBLICAS } from "@/lib/rotas";

/**
 * O texto da home.
 *
 * A hero continua ocupando a primeira tela sem rolagem. Isto aqui vive abaixo
 * dela, e existe porque a raiz servia 133 palavras e nenhum <h2> — ranqueava
 * pela marca e por mais nada.
 *
 * O que está escrito é o que nos separa do concorrente, e é verificável linha
 * por linha no código: quais ferramentas não mandam nada para servidor nenhum,
 * qual manda e o quê, e por que não pedimos cadastro.
 */

const linque = "font-medium text-foreground underline decoration-zinc-300 underline-offset-4 dark:decoration-zinc-600";

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "O que sai do seu aparelho e o que não sai",
    conteudo: (
      <>
        <p>
          <Dado>Cinco das nove ferramentas não enviam nada para lugar nenhum.</Dado> O CPF, o CNPJ, o cartão de
          teste e o telefone são calculados em JavaScript dentro do seu navegador. O{" "}
          <Link href="/vetorizador" className={linque}>
            vetorizador
          </Link>{" "}
          roda num motor compilado para WebAssembly, baixado junto com a página: a sua imagem não é enviada, não
          fica gravada e não passa por servidor. Fechou a aba, acabou.
        </p>
        <p>
          As outras quatro precisam de servidor, e vale dizer exatamente para quê. O{" "}
          <Link href="/removedor-de-fundo" className={linque}>
            removedor de fundo
          </Link>{" "}
          manda uma <Dado>cópia reduzida</Dado> da foto — no máximo 2048 pixels de lado — para calcular o contorno;
          a cópia é descartada ao fim do pedido e a foto em tamanho original nunca sai do seu aparelho.
        </p>
        <p>
          Os três geradores de QR Code — o{" "}
          <Link href="/qr-code" className={linque}>
            de link
          </Link>
          , o do{" "}
          <Link href="/instagram" className={linque}>
            Instagram
          </Link>{" "}
          e o do{" "}
          <Link href="/whatsapp" className={linque}>
            WhatsApp
          </Link>{" "}
          — guardam o endereço de destino, porque um link curto sem destino guardado não é um link curto. No
          WhatsApp e no Instagram isso vale só para o QR Code: se você apenas copiar o link, ele é montado no seu
          navegador e nada é enviado.
        </p>
      </>
    ),
  },
  {
    titulo: "Por que não pedimos cadastro",
    conteudo: (
      <>
        <p>
          Porque não há o que guardar. Sem conta não existe senha para vazar, e-mail para vender nem histórico para
          cruzar — e, na prática, cadastro em ferramenta de uso pontual serve para captar contato, não para
          melhorar a ferramenta.
        </p>
        <p>
          A conta econômica fecha porque quase tudo roda no seu aparelho: gerar o milésimo CPF custa a nós o mesmo
          que gerar o primeiro, ou seja, nada. A única ferramenta com limite diário é o removedor de fundo, que
          usa servidor de verdade — e quando o limite acaba o recorte passa a ser feito no seu próprio aparelho,
          com modelos menores, em vez de virar uma tela pedindo assinatura.
        </p>
      </>
    ),
  },
  {
    titulo: "Dado de teste não é dado de ninguém",
    conteudo: (
      <>
        <p>
          Os CPFs, CNPJs, números de cartão e telefones gerados aqui são{" "}
          <Dado>combinações que passam na conta de verificação</Dado> de cada formato. Não foram emitidos por órgão
          nenhum, não pertencem a nenhuma pessoa ou empresa, não têm crédito e não valem como documento.
        </p>
        <p>
          Existem para testar software: preencher formulário em homologação, conferir máscara de campo, popular
          banco de teste, validar a mensagem de erro de um cadastro. Usá-los para se passar por outra pessoa,
          fraudar cadastro ou burlar verificação é crime, e a responsabilidade é de quem faz.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "É tudo grátis mesmo?",
    resposta:
      "É. Não há cadastro, versão paga, marca d'água nem limite de downloads. A maior parte das ferramentas roda dentro do seu navegador, então o uso não nos custa nada — e o que custa, como o removedor de fundo, tem um limite diário em vez de uma cobrança.",
  },
  {
    pergunta: "Preciso criar conta?",
    resposta:
      "Não, em nenhuma ferramenta. Não existe cadastro no site: sem conta não há senha para vazar, e-mail para vender nem histórico para cruzar.",
  },
  {
    pergunta: "As minhas imagens ficam guardadas?",
    resposta:
      "Não. No vetorizador a imagem nem sai do seu aparelho. No removedor de fundo, só uma cópia reduzida é enviada para calcular o contorno, e ela é descartada ao fim do pedido, sem gravação e sem cache — a foto em tamanho original fica com você.",
  },
  {
    pergunta: "Funciona no celular?",
    resposta:
      "Sim, todas as ferramentas. Não há aplicativo para instalar nem extensão: tudo acontece no navegador, no computador e no celular.",
  },
  {
    pergunta: "Os dados gerados são de pessoas reais?",
    resposta:
      "Não. São combinações que fecham a conta de verificação de cada formato e nada mais — não constam em cadastro nenhum, não foram emitidos por órgão nenhum e são recusados por qualquer sistema que consulte a fonte oficial.",
  },
  {
    pergunta: "Posso usar os arquivos comercialmente?",
    resposta:
      "Sim. O PNG recortado, o SVG, o QR Code e as etiquetas são seus, para qualquer uso, inclusive comercial. Conferir se o conteúdo respeita marca ou direito autoral de terceiro é responsabilidade de quem envia a imagem.",
  },
  {
    pergunta: "Tem API?",
    resposta:
      "Ainda não existe API pública documentada. Todas as ferramentas funcionam pelo navegador, e quem precisa automatizar em volume deve procurar um serviço feito para isso.",
  },
];

/** A ferramenta anunciada no aviso do topo: uma só, e a mais recente. */
const DESTAQUE = ROTAS_PUBLICAS.find((rota) => rota.novo) ?? ROTAS_PUBLICAS[0];

export const HOME: ConteudoDaHome = {
  aviso: { texto: DESTAQUE.descricao, href: DESTAQUE.href },
  titulo: { antes: "Ferramentas que fazem o trabalho", destaque: "e somem" },
  subtitulo:
    "Recorte de imagem, vetorização, QR Code e dados de teste. Sem cadastro, sem marca d'água e sem enviar o que não precisa sair do seu navegador.",
  pilares: {
    marcador: "Como funciona",
    pilula: "O essencial",
    titulo: { antes: "Ferramenta que abre, faz e", destaque: "sai da frente" },
    cartoes: [
      {
        titulo: "Roda no seu aparelho",
        texto:
          "Cinco das nove ferramentas calculam tudo dentro do navegador, em JavaScript ou WebAssembly. Não há upload, não há fila e não há nada para apagar depois.",
      },
      {
        titulo: "Sem cadastro",
        texto:
          "Não existe conta no site. Sem conta não há senha para vazar, e-mail para vender nem histórico para cruzar — e nada atrasa você entre abrir a página e usar.",
      },
      {
        titulo: "Sem marca d'água",
        texto:
          "O arquivo sai limpo e na resolução original. Não há versão paga escondida nem prévia reduzida que só melhora se você assinar.",
      },
    ],
  },
  detalhe: {
    marcador: "Privacidade",
    pilula: "O que fica, o que vai",
    titulo: { antes: "Privacidade dita", destaque: "sem rodeio" },
  },
  perguntas: {
    marcador: "Dúvidas",
    pilula: "Perguntas frequentes",
    titulo: { antes: "O que perguntam", destaque: "antes de usar" },
  },
  chamada: {
    titulo: "Escolha uma ferramenta e comece",
    texto: "Sem cadastro, sem limite e sem instalar nada. Abre e usa.",
    acao: DESTAQUE.label,
    secundaria: "Como tratamos seus dados",
  },
  secoes: SECOES,
  faq: FAQ,
};
