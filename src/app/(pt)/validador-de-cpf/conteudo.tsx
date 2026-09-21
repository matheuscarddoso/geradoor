import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /validador-de-cpf.
 *
 * A intenção aqui é o oposto da do gerador, e o texto trata do que só importa
 * a quem está conferindo: o que a validação NÃO prova, os repetidos que passam
 * na conta, e a diferença entre formalmente válido e existente na Receita.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "O que esta validação prova, e o que não prova",
    conteudo: (
      <>
        <p>
          Ela prova <Dado>uma coisa só</Dado>: que os dois últimos algarismos são o resultado correto da conta
          feita sobre os nove primeiros. É a mesma verificação que o formulário de um site faz antes de enviar o
          cadastro.
        </p>
        <p>
          Ela <Dado>não prova</Dado> que o CPF existe, que foi emitido, que está regular ou que pertence a quem
          disse pertencer. Só a Receita Federal responde isso, e só ela. Um número inventado pode passar aqui e
          ser recusado lá — é exatamente o que acontece com todo CPF gerado para teste.
        </p>
      </>
    ),
  },
  {
    titulo: "Como a conta funciona",
    conteudo: (
      <>
        <p>
          Para o <Dado>primeiro verificador</Dado>, multiplique os nove primeiros algarismos pelos pesos 10, 9, 8,
          7, 6, 5, 4, 3 e 2, some tudo e tire o resto da divisão por 11. Resto menor que 2 vira 0; nos demais
          casos, o dígito é 11 menos o resto. O <Dado>segundo</Dado> repete a conta com dez algarismos — os nove
          mais o primeiro verificador — e pesos de 11 a 2.
        </p>
        <p>
          Como cada verificador depende de tudo que vem antes, trocar um único algarismo no meio do número derruba
          os dois de uma vez. É por isso que o erro de digitação quase nunca passa despercebido — e por que, quando
          a validação falha aqui, a página mostra quais dígitos eram esperados.
        </p>
      </>
    ),
  },
  {
    titulo: "Os onze números que enganam a conta",
    conteudo: (
      <>
        <p>
          <Dado>000.000.000-00</Dado>, <Dado>111.111.111-11</Dado> e os outros nove com todos os algarismos iguais
          fecham a verificação por acidente: a soma dos pesos faz o resto cair certinho. Eles são formalmente
          válidos e universalmente recusados.
        </p>
        <p>
          Todo validador sério trata esses onze como caso à parte, e este também: eles aparecem como inválidos, com
          a explicação. Se você está escrevendo a sua própria validação, esse é o teste que costuma faltar.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "Como saber se um CPF é válido?",
    resposta:
      "Cole o número no campo acima: a resposta aparece enquanto você digita, sem botão. A conta confere se os dois últimos algarismos correspondem ao cálculo feito sobre os nove primeiros.",
  },
  {
    pergunta: "O validador diz se o CPF existe na Receita Federal?",
    resposta:
      "Não, e nenhum validador offline diz. Aqui se confere apenas a matemática dos dígitos verificadores. Saber se o CPF foi emitido, a quem pertence e se está regular exige consulta à própria Receita Federal.",
  },
  {
    pergunta: "Por que 111.111.111-11 aparece como inválido?",
    resposta:
      "Porque números com todos os algarismos iguais fecham a conta por acidente — a soma dos pesos faz o resto cair certinho — mas são recusados por qualquer sistema. São onze casos, e todo validador sério os trata à parte.",
  },
  {
    pergunta: "O CPF que eu colar é enviado para algum lugar?",
    resposta:
      "Não. A conta roda inteira no seu navegador, em JavaScript. O número não é enviado a servidor nenhum, não fica gravado e não aparece em registro nenhum nosso.",
  },
  {
    pergunta: "Posso validar com ponto e traço?",
    resposta:
      "Pode. A máscara é aplicada sozinha e os caracteres que não são algarismo são ignorados — tanto faz colar 835.562.116-61 ou 83556211661.",
  },
  {
    pergunta: "O que significa a região que aparece no resultado?",
    resposta:
      "O nono algarismo indica a região fiscal onde o documento foi emitido. Vale para CPF emitido de verdade; num número gerado para teste ele é sorteado, e a região não significa nada.",
  },
  {
    pergunta: "Posso usar isso para validar uma lista grande?",
    resposta:
      "A página confere um número por vez. Para uma lista, o caminho é implementar a conta no seu próprio código — os pesos e a regra do módulo 11 estão descritos acima.",
  },
];

export const VEJA = ["/cpf", "/cnpj"];
