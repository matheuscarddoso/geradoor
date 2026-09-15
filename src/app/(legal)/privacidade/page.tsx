import type { Metadata } from "next";
import Link from "next/link";
import { Lista, Secao, Termo, TituloLegal } from "@/components/shell/TextoLegal";
import { EMAIL_DE_CONTATO, RESPONSAVEL, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Política de Privacidade",
  description:
    "O que o Geradoor coleta, o que não coleta e o que acontece com as imagens e os links que passam pelas ferramentas.",
  path: "/privacidade",
});

export default function Privacidade() {
  return (
    <>
      <TituloLegal>Política de Privacidade</TituloLegal>

      <Secao numero={1} titulo="Quem é o responsável">
        <p>
          O Geradoor é operado por {RESPONSAVEL}, pessoa física. Para qualquer assunto de privacidade — pedir
          informação, correção ou exclusão de dados —, escreva para{" "}
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-medium text-foreground underline underline-offset-4">
            {EMAIL_DE_CONTATO}
          </a>
          .
        </p>
      </Secao>

      <Secao numero={2} titulo="O princípio: quase tudo acontece no seu navegador">
        <p>
          A maior parte das ferramentas não manda nada para lugar nenhum. O CPF, o CNPJ, o cartão de teste, o
          telefone, o link do WhatsApp e do Instagram e a vetorização de imagem são calculados dentro do seu
          navegador. Fechou a aba, acabou: nada daquilo passou por um servidor.
        </p>
        <p>Só três coisas saem do seu aparelho, e estão detalhadas abaixo.</p>
      </Secao>

      <Secao numero={3} titulo="O Removedor de fundo e a sua imagem">
        <p>
          Para recortar a foto, o navegador manda uma <Termo>cópia reduzida</Termo> dela — no máximo 2048 pixels
          de lado — a um serviço nosso hospedado na Cloudflare, que devolve o contorno do que está em primeiro
          plano. A foto em tamanho original nunca sai do seu aparelho: o recorte final é montado aqui, com a
          resposta que voltou.
        </p>
        <Lista>
          <li>
            A cópia enviada <Termo>não é gravada</Termo>. Ela é processada e descartada ao fim do pedido, e a
            resposta vai sem cache.
          </li>
          <li>
            O pedido segue <Termo>sem cookie e sem referer</Termo>: o serviço não sabe de que página você veio nem
            quem você é.
          </li>
          <li>
            Existe um limite diário por pessoa, para o custo não fugir do controle. Para contá-lo, guardamos um
            código derivado do seu IP — um hash do endereço com a data do dia —, nunca o endereço em si. Como a
            data entra na conta, o código muda todo dia, e os do dia anterior são apagados.
          </li>
          <li>
            Quando esse serviço está indisponível ou o limite acabou, o recorte é feito no seu próprio aparelho,
            com modelos menores. A página avisa quando isso acontece.
          </li>
        </Lista>
      </Secao>

      <Secao numero={4} titulo="O QR Code e o link que você encurta">
        <p>
          O gerador de QR Code cria um link curto, e isso exige guardar alguma coisa. Ficam no nosso banco de
          dados: o <Termo>endereço de destino</Termo> que você digitou, o código curto correspondente, a data de
          criação e a contagem de quantas vezes o QR Code foi lido.
        </p>
        <Lista>
          <li>
            Cada leitura registra apenas a <Termo>data e a hora</Termo>. Não guardamos endereço IP, localização,
            aparelho nem qualquer outra informação de quem leu o código.
          </li>
          <li>
            Esses registros ficam por tempo indeterminado, porque o link precisa continuar funcionando. Se quiser
            que um QR Code seja desativado e apagado, peça por e-mail.
          </li>
          <li>
            Não coloque informação sensível na URL encurtada: quem tiver o código curto chega ao destino, e o
            endereço fica guardado conosco.
          </li>
        </Lista>
      </Secao>

      <Secao numero={5} titulo="Medição de uso">
        <p>
          Usamos o Vercel Web Analytics e o Speed Insights para saber quais páginas são visitadas e se elas
          carregam rápido. Essa medição <Termo>não usa cookies</Termo> e não cria identificador que atravesse
          dias ou sites: cada visita é reduzida a um código técnico derivado do pedido, que é trocado a cada 24
          horas. O que sobra são números agregados — quantas visitas, de que país, em que página —, sem ligação
          com uma pessoa.
        </p>
      </Secao>

      <Secao numero={6} titulo="Registros do servidor">
        <p>
          Como qualquer site, o nosso serviço de hospedagem (Vercel) e o serviço que faz o recorte (Cloudflare)
          mantêm registros técnicos de acesso — endereço IP, data, recurso pedido —, usados para operar,
          proteger contra abuso e investigar incidentes. Não usamos esses registros para perfilar ninguém.
        </p>
      </Secao>

      <Secao numero={7} titulo="O que guardamos no seu navegador">
        <p>
          Preferências ficam no armazenamento local do seu navegador e não chegam até nós: o tema claro ou
          escuro, a sidebar aberta ou recolhida, o tamanho do pincel do removedor, o layout de etiquetas e a
          lista de resultados recentes que aparece no menu. Apagar os dados do site no navegador apaga tudo
          isso. Os detalhes estão na{" "}
          <Link href="/cookies" className="font-medium text-foreground underline underline-offset-4">
            Política de Cookies
          </Link>
          .
        </p>
      </Secao>

      <Secao numero={8} titulo="Com quem os dados são compartilhados">
        <p>
          Não vendemos nem cedemos dados a ninguém. Os únicos terceiros envolvidos são os que fazem o site
          funcionar:
        </p>
        <Lista>
          <li>
            <Termo>Vercel</Termo> — hospedagem, banco de dados dos QR Codes e medição de uso.
          </li>
          <li>
            <Termo>Cloudflare</Termo> — o recorte do Removedor de fundo.
          </li>
        </Lista>
        <p>
          Os dois operam servidores fora do Brasil, então há transferência internacional. Também podemos
          divulgar informação quando a lei ou uma ordem judicial exigir.
        </p>
      </Secao>

      <Secao numero={9} titulo="Por que podemos tratar esses dados">
        <p>
          Na Lei Geral de Proteção de Dados: para <Termo>executar o que você pediu</Termo> — recortar a imagem,
          criar o link curto — e por <Termo>legítimo interesse</Termo> em manter o serviço no ar, protegido
          contra abuso e em condições de melhorar. Não usamos seus dados para publicidade.
        </p>
      </Secao>

      <Secao numero={10} titulo="Seus direitos">
        <p>
          Você pode pedir confirmação de que tratamos algum dado seu, acesso a ele, correção, anonimização,
          bloqueio ou exclusão, e também se opor a um tratamento. Basta escrever para{" "}
          <a href={`mailto:${EMAIL_DE_CONTATO}`} className="font-medium text-foreground underline underline-offset-4">
            {EMAIL_DE_CONTATO}
          </a>
          . Vale um aviso honesto: como não pedimos cadastro e a medição de uso é anônima, quase nunca temos
          como ligar um dado a você. O caso em que conseguimos agir é o do QR Code, se você nos disser qual é o
          link curto.
        </p>
      </Secao>

      <Secao numero={11} titulo="Segurança">
        <p>
          Todo o tráfego é criptografado por HTTPS. A área interna do site é protegida por senha e por um cookie
          assinado. Ainda assim, nenhum serviço é imune a falhas: não envie por aqui documento, dado de saúde,
          senha ou qualquer informação que você não possa perder.
        </p>
      </Secao>

      <Secao numero={12} titulo="Crianças">
        <p>
          O Geradoor é uma ferramenta de trabalho e não se destina a menores de 13 anos. Não coletamos
          conscientemente dados de crianças.
        </p>
      </Secao>

      <Secao numero={13} titulo="Mudanças">
        <p>
          Quando esta política mudar, a data no topo muda junto. Alterações relevantes valem a partir da
          publicação; continuar usando o site depois disso significa que você as conhece.
        </p>
      </Secao>
    </>
  );
}
