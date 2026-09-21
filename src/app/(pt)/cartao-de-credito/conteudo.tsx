import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /cartao-de-credito.
 *
 * Os prefixos publicados aqui são só os que têm fonte oficial: a ISO/IEC 7812 e
 * a documentação das próprias bandeiras. As faixas de Elo e Hipercard circulam
 * em repositório comunitário, sem documento público da bandeira — por isso não
 * entram numa tabela que o leitor tomaria como oficial.
 *
 * E não existe faixa de BIN reservada para teste: o que existe são números de
 * sandbox de cada gateway. O texto diz isso, porque a suposição contrária é
 * comum e leva a erro.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "Como um número de cartão é validado",
    conteudo: (
      <>
        <p>
          Todo número de cartão fecha pelo <Dado>algoritmo de Luhn</Dado>, definido na norma ISO/IEC 7812. A conta:
          da direita para a esquerda, dobre cada segundo dígito; quando a duplicação passar de 9, some os dois
          algarismos do resultado (ou, o que dá no mesmo, subtraia 9). Some tudo. Se o total for divisível por 10,
          o número passa.
        </p>
        <p>
          É uma <Dado>proteção contra erro de digitação</Dado>, não contra fraude: pega dígito trocado e a maioria
          das inversões de vizinhos. Qualquer pessoa consegue produzir um número que passe no Luhn — o que decide
          se a compra acontece é a autorização do emissor, não essa conta.
        </p>
      </>
    ),
  },
  {
    titulo: "O prefixo diz a bandeira",
    conteudo: (
      <>
        <p>
          Os primeiros dígitos são o IIN, que identifica quem emitiu. É por isso que o formulário reconhece a
          bandeira enquanto você digita, antes de qualquer consulta. Os prefixos publicados pelas próprias
          bandeiras:
        </p>
        <ul className="flex list-disc flex-col gap-1 ps-5 marker:text-zinc-300 dark:marker:text-zinc-600">
          <li>
            <Dado>Visa</Dado> — começa com 4; 13, 16 ou 19 dígitos
          </li>
          <li>
            <Dado>Mastercard</Dado> — 51 a 55, e a série 2, de 222100 a 272099; 16 dígitos
          </li>
          <li>
            <Dado>American Express</Dado> — 34 ou 37; 15 dígitos
          </li>
          <li>
            <Dado>Diners Club</Dado> — 300 a 305, 36 ou 38
          </li>
          <li>
            <Dado>Discover</Dado> — 6011, 644 a 649, 65; 16 a 19 dígitos
          </li>
          <li>
            <Dado>JCB</Dado> — 3528 a 3589; 16 a 19 dígitos
          </li>
        </ul>
        <p>
          As faixas de Elo e Hipercard não têm documento público da bandeira — circulam em listas mantidas pela
          comunidade, que podem estar desatualizadas. Por isso não estão nesta tabela.
        </p>
      </>
    ),
  },
  {
    titulo: "O número gerado não compra nada",
    conteudo: (
      <>
        <p>
          O que sai daqui passa no Luhn e tem o prefixo certo da bandeira. Só isso. Não existe conta por trás, não
          há emissor, não há limite e <Dado>nenhuma transação será autorizada</Dado>. Ele serve para o formulário
          aceitar o preenchimento e você seguir testando o fluxo.
        </p>
        <p>
          E vale um alerta que costuma pegar quem está começando:{" "}
          <Dado>não existe faixa de números oficialmente reservada para teste</Dado>. Os números de teste que você
          vê na documentação de gateways — como os do Stripe — funcionam apenas no ambiente de sandbox daquele
          gateway, com chave de teste, e são recusados em produção. Para testar cobrança de verdade, use o sandbox
          do seu meio de pagamento, não um número gerado.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Dá para comprar com o cartão gerado?",
    resposta:
      "Não. O número passa na conta de verificação, mas não existe conta bancária por trás dele: não há emissor, não há limite e nenhuma transação é autorizada. Tentar usá-lo para compra é fraude, e não funciona.",
  },
  {
    pergunta: "Então para que serve?",
    resposta:
      "Para testar software. Formulários de checkout validam o número pelo algoritmo de Luhn e detectam a bandeira pelo prefixo antes de enviar qualquer coisa. Sem um número que passe nessa validação, não dá para testar máscara de campo, detecção de bandeira nem a tela de erro do pagamento.",
  },
  {
    pergunta: "O CVV e a validade também são de verdade?",
    resposta:
      "Não. São valores plausíveis no formato certo — três dígitos, ou quatro no American Express, e uma data futura. Não têm relação com emissor nenhum e servem só para preencher os campos do formulário.",
  },
  {
    pergunta: "Posso testar cobrança real com esses números?",
    resposta:
      "Não. Para testar cobrança use os números de sandbox do seu meio de pagamento, que funcionam apenas com chave de teste e simulam aprovação e recusa. Não existe faixa de números oficialmente reservada para teste fora desses ambientes.",
  },
  {
    pergunta: "O número é enviado para algum servidor?",
    resposta:
      "Não. O sorteio e o cálculo do dígito de Luhn acontecem inteiros no seu navegador. Nada sai do seu aparelho e nada fica gravado.",
  },
  {
    pergunta: "Por que o formulário reconhece a bandeira antes de eu terminar de digitar?",
    resposta:
      "Porque os primeiros dígitos identificam quem emite o cartão: 4 é Visa, 34 e 37 são American Express, 51 a 55 e a série 2 são Mastercard. O formulário lê esse prefixo localmente, sem consultar nada.",
  },
];

export const VEJA = ["/cpf", "/cnpj", "/telefone"];
