import type { Metadata } from "next";
import Link from "next/link";
import { Lista, PaginaLegal, Termo, type SecaoLegal } from "@/components/shell/TextoLegal";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Política de Cookies",
  description:
    "O Geradoor não usa cookies de rastreamento nem de publicidade. O que guardamos fica no seu navegador e é só preferência.",
  path: "/cookies",
});

const SECOES: SecaoLegal[] = [
  {
    titulo: "O resumo",
    conteudo: (
      <>
        <p>
          O Geradoor <Termo>não usa cookies de rastreamento, de perfil ou de publicidade</Termo>, e por isso não
          tem aquela faixa de consentimento. O que guardamos fica no armazenamento local do seu navegador, são
          preferências suas e nunca chegam até nós.
        </p>
      </>
    ),
  },
  {
    titulo: "O que fica guardado no seu navegador",
    conteudo: (
      <>
        <p>
          Não são cookies: é o armazenamento local, que o navegador não envia junto com os pedidos ao servidor.
          Guardamos ali:
        </p>
        <Lista>
          <li>
            <Termo>Tema</Termo> — se você escolheu claro ou escuro.
          </li>
          <li>
            <Termo>Menu lateral</Termo> — se você o deixou aberto ou recolhido.
          </li>
          <li>
            <Termo>Pincel do removedor de fundo</Termo> — o tamanho de cada ferramenta e se o pincel mágico está
            ligado.
          </li>
          <li>
            <Termo>Etiquetas do código de barras</Termo> — o layout, a unidade de medida e a última aba.
          </li>
          <li>
            <Termo>Recentes</Termo> — a lista de resultados que aparece no menu, para você reabrir o que acabou de
            gerar. Ela fica só aí; pode limpar pelo ícone de lixeira ao lado do título.
          </li>
        </Lista>
      </>
    ),
  },
  {
    titulo: "Os dois cookies que existem",
    conteudo: (
      <>
        <p>
          Eles só aparecem para quem usa a área interna do gerador de etiquetas, que é protegida por senha. Se
          você nunca entrou lá, o site não grava cookie nenhum no seu navegador.
        </p>
        <Lista>
          <li>
            <Termo>acesso_grafica</Termo> — guarda a sessão de quem entrou com a senha. É assinado, não
            pode ser lido nem alterado por JavaScript e vale por noventa dias.
          </li>
          <li>
            <Termo>grafica_liberada</Termo> — serve só para o menu saber que deve mostrar aquele item. Não
            autoriza nada: forjá-lo acrescenta uma linha na lista e o clique cai na tela de senha do mesmo jeito.
          </li>
        </Lista>
      </>
    ),
  },
  {
    titulo: "Medição de uso sem cookies",
    conteudo: (
      <>
        <p>
          Para saber quais páginas são visitadas, usamos o Vercel Web Analytics, que funciona sem cookies: cada
          visita vira um código técnico derivado do pedido, trocado a cada 24 horas, que não atravessa dias nem
          sites. Nada disso identifica você. O detalhe está na{" "}
          <Link href="/privacidade" className="font-medium text-foreground underline underline-offset-4">
            Política de Privacidade
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    titulo: "Como apagar",
    conteudo: (
      <>
        <p>
          Nas configurações do seu navegador, apagar os dados do site remove tudo de uma vez — preferências e os
          dois cookies. Navegação anônima também funciona: nada sobrevive ao fechar a janela. A única
          consequência é que o site volta ao estado inicial, e a lista de recentes some.
        </p>
      </>
    ),
  },
];

export default function Cookies() {
  return <PaginaLegal titulo="Política de Cookies" secoes={SECOES} />;
}
