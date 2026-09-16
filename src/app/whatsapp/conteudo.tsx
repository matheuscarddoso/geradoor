import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/** O texto de /whatsapp. O formato do link é o "click to chat" oficial do WhatsApp. */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "Como criar um link de WhatsApp",
    conteudo: (
      <>
        <p>
          Digite o número com DDD e, se quiser, a mensagem que deve vir escrita quando a conversa abrir. Sai um
          link <Dado>wa.me</Dado>, que é o formato de conversa direta do próprio WhatsApp — funciona no celular e
          no WhatsApp Web, e você recebe também um QR Code do mesmo link.
        </p>
        <p>
          Quem clicar cai direto na conversa com você, com a mensagem já digitada e o cursor pronto. Não precisa
          salvar o seu contato na agenda, que é justamente o atrito que faz a pessoa desistir antes de escrever.
        </p>
      </>
    ),
  },
  {
    titulo: "O número precisa do código do país",
    conteudo: (
      <>
        <p>
          O link do WhatsApp usa o número no formato internacional: <Dado>55</Dado> para o Brasil, seguido do DDD
          sem o zero e do número. Um celular de São Paulo vira 5511 mais os nove dígitos. Sem o código do país o
          link não abre conversa nenhuma — é o erro que mais aparece em link feito à mão.
        </p>
        <p>A página monta esse formato sozinha a partir do que você digitar, então basta informar DDD e número.</p>
      </>
    ),
  },
  {
    titulo: "Onde usar",
    conteudo: (
      <>
        <p>
          Em botão de site, na bio do Instagram, em assinatura de e-mail, em anúncio e em cartão de visita — no
          cartão e no balcão, o QR Code costuma funcionar melhor que o link escrito. O link não expira e não passa
          por servidor nosso: ele aponta direto para o wa.me do WhatsApp.
        </p>
        <p>
          A mensagem pronta funciona melhor quando identifica a origem — algo como &quot;Olá! Vim pelo
          site&quot; —, porque você passa a saber de onde veio cada conversa sem perguntar.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Preciso salvar o contato para conversar?",
    resposta:
      "Não, e esse é o ponto do link: quem clica abre a conversa direto, sem adicionar ninguém à agenda. Vale nos dois sentidos — nem você precisa ter o número de quem chega.",
  },
  {
    pergunta: "Funciona com WhatsApp Business?",
    resposta:
      "Sim. O link wa.me aponta para um número, e tanto faz se a conta é comum ou Business. Também funciona no WhatsApp Web e no aplicativo de computador.",
  },
  {
    pergunta: "O link expira?",
    resposta:
      "Não. Ele aponta direto para o wa.me do WhatsApp e continua valendo enquanto o número estiver ativo. Não passa por servidor nosso e não depende deste site continuar no ar.",
  },
  {
    pergunta: "Por que preciso colocar o 55 na frente?",
    resposta:
      "Porque o link usa o formato internacional, com o código do país antes do DDD. Sem o 55, o WhatsApp não consegue resolver o número e a conversa não abre. A página monta esse formato para você.",
  },
  {
    pergunta: "Dá para mandar mensagem em massa com isso?",
    resposta:
      "Não. O link abre uma conversa por vez, iniciada por quem clica. Envio em massa não autorizado viola os termos do WhatsApp e leva a bloqueio do número.",
  },
  {
    pergunta: "O meu número fica guardado em algum lugar?",
    resposta:
      "O link é montado no seu navegador e o número não é enviado a servidor nosso. Só o QR Code, quando gerado, cria um link curto que fica registrado — o link wa.me em si não.",
  },
];

export const VEJA = ["/qr-code", "/instagram", "/telefone"];
