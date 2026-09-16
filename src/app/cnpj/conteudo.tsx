import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /cnpj.
 *
 * O trecho do CNPJ alfanumérico foi conferido nas fontes oficiais: Instrução
 * Normativa RFB nº 2.229/2024, a página do programa na Receita e o documento de
 * cálculo do DV do Serpro. A armadilha que derruba quase toda implementação —
 * e que este texto explicita — é a conversão de letra: é ASCII menos 48, então
 * A vale 17 e não 10.
 *
 * O gerador daqui produz só CNPJ numérico. O texto diz isso em vez de deixar
 * subentendido.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "O que cada parte do CNPJ significa",
    conteudo: (
      <>
        <p>
          São 14 posições, em três blocos. Os <Dado>oito primeiros</Dado> são a raiz, que identifica a empresa. Os{" "}
          <Dado>quatro seguintes</Dado> são a ordem do estabelecimento: <Dado>0001</Dado> é sempre a matriz, e 0002
          em diante são as filiais. As <Dado>duas últimas</Dado> são os dígitos verificadores.
        </p>
        <p>
          É por isso que matriz e filial da mesma empresa compartilham os oito primeiros números e diferem só do
          nono ao décimo segundo — e por isso os dois dígitos finais mudam entre elas.
        </p>
      </>
    ),
  },
  {
    titulo: "Como os dígitos verificadores são calculados",
    conteudo: (
      <>
        <p>
          Para o <Dado>primeiro verificador</Dado>, multiplique os doze primeiros caracteres pelos pesos 5, 4, 3,
          2, 9, 8, 7, 6, 5, 4, 3 e 2, some tudo e tire o resto da divisão por 11. Resto 0 ou 1 resulta em dígito 0;
          nos demais casos, o dígito é 11 menos o resto.
        </p>
        <p>
          O <Dado>segundo verificador</Dado> repete a conta com treze caracteres — os doze originais mais o
          primeiro verificador — e pesos de 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3 e 2. Repare que o peso volta a 2
          depois do oitavo: a sequência é 2 a 9, da direita para a esquerda, recomeçando.
        </p>
      </>
    ),
  },
  {
    titulo: "O CNPJ alfanumérico já existe",
    conteudo: (
      <>
        <p>
          Desde <Dado>31 de julho de 2026</Dado> a Receita Federal emite CNPJ com letras, conforme a Instrução
          Normativa RFB nº 2.229/2024. O primeiro do país foi atribuído a uma filial do Banco do Brasil:{" "}
          <Dado>00.000.000/E08G-12</Dado>. A emissão é gradual ao longo de 2026 — como as combinações numéricas
          ainda não se esgotaram, uma inscrição nova ainda pode sair só com números.
        </p>
        <p>
          O formato continua com 14 posições. As <Dado>doze primeiras passam a aceitar letras</Dado> de A a Z além
          dos algarismos; os <Dado>dois dígitos verificadores continuam numéricos</Dado>. CNPJs antigos, só com
          números, seguem válidos para sempre e não precisam de nenhuma providência.
        </p>
        <p>
          O cálculo é o mesmo módulo 11, com uma etapa a mais: cada caractere vale{" "}
          <Dado>o seu código ASCII menos 48</Dado>. Os algarismos continuam valendo eles mesmos, e as letras
          começam em 17 — A vale 17, B vale 18, e assim até Z, que vale 42. É aqui que quase toda implementação
          erra, supondo A igual a 10; a tabela ASCII pula sete caracteres entre o 9 e o A. Um caso de teste
          oficial do Serpro para conferir o seu validador: <Dado>12.ABC.345/01DE-35</Dado>.
        </p>
        <p>O gerador desta página produz CNPJ apenas no formato numérico clássico.</p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "O CNPJ gerado é de uma empresa real?",
    resposta:
      "Não. É uma combinação que fecha a conta de verificação, e só. Não está inscrito na Receita Federal, não pertence a nenhuma empresa e não vale como identificação. Em qualquer sistema que consulte a Receita, ele será recusado.",
  },
  {
    pergunta: "Para que serve gerar CNPJ?",
    resposta:
      "Para testar software. A maior parte dos formulários valida o CNPJ antes de enviar, e um número inventado à mão quase nunca fecha os dois dígitos verificadores — sem um CNPJ que passe na conta não dá para testar o caminho de sucesso de um cadastro nem popular um banco de homologação.",
  },
  {
    pergunta: "O gerador cria CNPJ alfanumérico?",
    resposta:
      "Ainda não. O que sai aqui é o formato numérico clássico, que continua válido e continua sendo o mais comum. O CNPJ com letras existe desde 31 de julho de 2026 e é emitido gradualmente.",
  },
  {
    pergunta: "Como calcular o dígito verificador de um CNPJ com letras?",
    resposta:
      "É o mesmo módulo 11 do CNPJ numérico, com uma conversão antes: cada caractere vale o seu código ASCII menos 48, então A vale 17, B vale 18 e Z vale 42. Os pesos e a regra do resto não mudam. O erro mais comum é supor que A vale 10.",
  },
  {
    pergunta: "O que é a raiz do CNPJ?",
    resposta:
      "São os oito primeiros números, que identificam a empresa. Matriz e filiais compartilham a mesma raiz e se distinguem pelos quatro números seguintes, em que 0001 é sempre a matriz.",
  },
  {
    pergunta: "O número gerado é enviado para algum servidor?",
    resposta:
      "Não. O cálculo roda inteiro no seu navegador. Nenhum número sai do seu aparelho, não fica gravado em lugar nenhum e não passa por servidor.",
  },
  {
    pergunta: "Existe limite de quantos posso gerar?",
    resposta:
      "Não há limite, cadastro nem cobrança. Como a conta roda no seu próprio navegador, gerar mais não custa nada a ninguém.",
  },
];

export const VEJA = ["/cpf", "/cartao-de-credito", "/telefone"];
