import type { Metadata } from "next";
import Link from "next/link";
import { Lista, Secao, Termo, TituloLegal } from "@/components/shell/TextoLegal";
import { EMAIL_DE_CONTATO, RESPONSAVEL, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Termos de Uso",
  description:
    "As regras de uso do Geradoor: para que servem os dados de teste, o que você pode fazer com os arquivos gerados e os limites da nossa responsabilidade.",
  path: "/termos",
});

export default function Termos() {
  return (
    <>
      <TituloLegal>Termos de Uso</TituloLegal>

      <Secao numero={1} titulo="Quem opera e o que você aceita">
        <p>
          O Geradoor é operado por {RESPONSAVEL}, pessoa física, e pode ser contatado em{" "}
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-medium text-foreground underline underline-offset-4">
            {EMAIL_DE_CONTATO}
          </a>
          . Ao usar o site, você concorda com estes termos. Se não concordar, não use.
        </p>
      </Secao>

      <Secao numero={2} titulo="O serviço">
        <p>
          O Geradoor é um conjunto de ferramentas de uso livre: geradores de dados de teste, gerador de QR Code,
          montador de link do WhatsApp e do Instagram, removedor de fundo e vetorizador de imagem. Não há
          cadastro, não há cobrança e não há marca d&apos;água.
        </p>
        <p>
          As ferramentas podem mudar, ganhar limites ou sair do ar sem aviso. Nada aqui é promessa de serviço
          contínuo.
        </p>
      </Secao>

      <Secao numero={3} titulo="Os dados de teste não são de ninguém">
        <p>
          Esta é a regra mais importante do site. Os CPFs, CNPJs, números de cartão e telefones gerados aqui são
          apenas <Termo>combinações que passam na conta de verificação</Termo> de cada formato. Eles não
          pertencem a nenhuma pessoa, não estão emitidos por órgão nenhum, não têm crédito, não funcionam em
          compra e não valem como documento.
        </p>
        <p>Eles existem para testar software: preencher formulário, validar máscara, popular banco de teste.</p>
        <p>
          Usá-los para se passar por outra pessoa, fraudar cadastro, enganar sistema, burlar verificação ou
          qualquer outra finalidade ilícita é <Termo>crime</Termo>, é proibido por estes termos e é
          responsabilidade exclusiva de quem faz.
        </p>
      </Secao>

      <Secao numero={4} titulo="Uso aceitável">
        <p>Você não pode usar o Geradoor para:</p>
        <Lista>
          <li>violar a lei ou o direito de outra pessoa;</li>
          <li>processar imagem que você não tem permissão de usar;</li>
          <li>fraudar, se passar por terceiro ou burlar verificação de identidade;</li>
          <li>sobrecarregar o serviço, automatizar acesso em volume ou contornar os limites de uso;</li>
          <li>encurtar link que leve a malware, golpe ou conteúdo ilegal.</li>
        </Lista>
        <p>
          Podemos limitar ou bloquear o acesso, e desativar um link curto, quando isso for necessário para
          proteger o serviço ou outras pessoas.
        </p>
      </Secao>

      <Secao numero={5} titulo="As suas imagens e os arquivos gerados">
        <p>
          O que você traz continua seu. Ao usar o removedor de fundo, você nos dá apenas a permissão necessária
          para processar aquela imagem e devolver o resultado — nada além disso. Não usamos as suas imagens para
          treinar modelo, não as publicamos e não as guardamos.
        </p>
        <p>
          Os arquivos que saem daqui — o PNG recortado, o SVG, o QR Code, as etiquetas — são seus, para o uso que
          quiser, inclusive comercial. Conferir se o conteúdo deles respeita marca, direito autoral ou imagem de
          terceiros é responsabilidade sua.
        </p>
      </Secao>

      <Secao numero={6} titulo="Confira o resultado antes de usar">
        <p>
          O recorte e a vetorização são automáticos. Eles simplificam formas, aproximam cores e podem perder
          detalhe fino. Quando o arquivo for para impressão, para a identidade de uma marca ou para qualquer
          lugar em que o erro custe caro, olhe o resultado antes.
        </p>
      </Secao>

      <Secao numero={7} titulo="Links curtos">
        <p>
          O link curto do QR Code aponta para o endereço que você informou, e nós não controlamos o que há do
          outro lado. O destino é responsabilidade de quem criou o link. Os links ficam ativos por tempo
          indeterminado e podem ser desativados se forem usados para algo ilícito.
        </p>
      </Secao>

      <Secao numero={8} titulo="Sem garantias">
        <p>
          O serviço é oferecido no estado em que se encontra, sem garantia de disponibilidade, de resultado
          exato ou de adequação a um fim específico. Isso não afasta os direitos que a lei brasileira garante ao
          consumidor e que não podem ser excluídos por contrato.
        </p>
      </Secao>

      <Secao numero={9} titulo="Limite de responsabilidade">
        <p>
          O serviço é gratuito. Na medida em que a lei permitir, não respondemos por lucro cessante, perda de
          dados, prejuízo indireto ou dano decorrente do uso indevido dos dados de teste. Fica de fora deste
          limite o que a lei não permite excluir, como dolo e culpa grave.
        </p>
      </Secao>

      <Secao numero={10} titulo="Privacidade">
        <p>
          O tratamento de dados está descrito na{" "}
          <Link href="/privacidade" className="font-medium text-foreground underline underline-offset-4">
            Política de Privacidade
          </Link>
          , que faz parte destes termos.
        </p>
      </Secao>

      <Secao numero={11} titulo="Lei aplicável">
        <p>
          Estes termos seguem a lei brasileira. Fica eleito o foro do domicílio do consumidor para as questões
          de consumo; nos demais casos, o foro da comarca do operador.
        </p>
      </Secao>

      <Secao numero={12} titulo="Mudanças">
        <p>
          Podemos alterar estes termos. A data no topo indica a versão em vigor, e mudanças relevantes valem a
          partir da publicação.
        </p>
      </Secao>
    </>
  );
}
