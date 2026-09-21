import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /cpf.
 *
 * Tudo aqui é conferível contra `src/app/utils/cpf_gen.ts` ou contra a regra
 * pública do documento. Onde a ferramenta não faz algo — escolher o estado de
 * origem, por exemplo — o texto diz que não faz, em vez de ficar calado.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "Como o CPF é calculado?",
    conteudo: (
      <>
        <p>
          Os nove primeiros dígitos são livres. Os dois últimos são calculados a partir deles. Para o{" "}
          <Dado>primeiro verificador</Dado>, multiplique os nove dígitos pelos pesos 10, 9, 8, 7, 6, 5, 4, 3 e 2,
          some tudo e tire o resto da divisão por 11. Resto menor que 2 vira 0; nos demais casos, o dígito é 11
          menos o resto.
        </p>
        <p>
          O <Dado>segundo verificador</Dado> repete a conta com dez dígitos — os nove originais mais o primeiro
          verificador — e pesos de 11 a 2. É por isso que trocar um único algarismo no meio do número derruba os
          dois dígitos finais de uma vez: cada um deles depende de tudo que vem antes.
        </p>
      </>
    ),
  },
  {
    titulo: "O nono dígito indica a região de emissão",
    conteudo: (
      <>
        <p>
          O nono algarismo do CPF não é aleatório na vida real: ele identifica a região fiscal onde o documento
          foi emitido. A tabela é esta:
        </p>
        <ul className="flex list-disc flex-col gap-1 ps-5 marker:text-zinc-300 dark:marker:text-zinc-600">
          <li>
            <Dado>0</Dado> — Rio Grande do Sul
          </li>
          <li>
            <Dado>1</Dado> — Distrito Federal, Goiás, Mato Grosso, Mato Grosso do Sul e Tocantins
          </li>
          <li>
            <Dado>2</Dado> — Acre, Amapá, Amazonas, Pará, Rondônia e Roraima
          </li>
          <li>
            <Dado>3</Dado> — Ceará, Maranhão e Piauí
          </li>
          <li>
            <Dado>4</Dado> — Alagoas, Paraíba, Pernambuco e Rio Grande do Norte
          </li>
          <li>
            <Dado>5</Dado> — Bahia e Sergipe
          </li>
          <li>
            <Dado>6</Dado> — Minas Gerais
          </li>
          <li>
            <Dado>7</Dado> — Espírito Santo e Rio de Janeiro
          </li>
          <li>
            <Dado>8</Dado> — São Paulo
          </li>
          <li>
            <Dado>9</Dado> — Paraná e Santa Catarina
          </li>
        </ul>
        <p>
          O gerador aqui sorteia os nove primeiros dígitos sem filtro, então o nono sai aleatório e a região do
          número gerado é indiferente. Se o seu teste depende de um estado específico, troque o nono dígito à mão
          e gere os verificadores de novo pela conta acima.
        </p>
      </>
    ),
  },
  {
    titulo: "CPF gerado não é CPF de ninguém",
    conteudo: (
      <>
        <p>
          O que sai daqui é uma <Dado>combinação que passa na conta de verificação</Dado>, e só. O número não foi
          emitido pela Receita Federal, não está ligado a nenhuma pessoa, não consta em cadastro nenhum e não vale
          como documento. Se você digitá-lo num sistema que consulta a Receita, ele será recusado.
        </p>
        <p>
          Ele serve para o que a validação local exige: preencher formulário em ambiente de teste, conferir
          máscara de campo, popular banco de homologação, testar a mensagem de erro de um cadastro. Usar para se
          passar por outra pessoa ou fraudar cadastro é crime, e a responsabilidade é de quem faz.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "É legal gerar CPF?",
    resposta:
      "Gerar é legal: o número é só uma combinação que fecha a conta de verificação, e existe para testar software. Ilegal é o uso — se passar por outra pessoa, fraudar cadastro, burlar verificação de identidade ou enganar sistema são crimes previstos no Código Penal, independentemente de onde o número saiu.",
  },
  {
    pergunta: "O CPF gerado pertence a alguém?",
    resposta:
      "Não. O número não é emitido pela Receita Federal nem está vinculado a nenhum registro. Como o espaço de CPFs válidos é limitado, um número gerado pode por coincidência coincidir com um emitido — por isso o correto é usá-lo apenas em ambiente de teste, nunca em cadastro real.",
  },
  {
    pergunta: "Por que preciso gerar CPF para testar?",
    resposta:
      "Porque a maior parte dos formulários valida o CPF antes de enviar, e um número inventado à mão quase nunca fecha os dois dígitos verificadores. Sem um CPF que passe na conta, não dá para testar o caminho de sucesso do cadastro nem popular um banco de homologação.",
  },
  {
    pergunta: "O gerador cria CPF de um estado específico?",
    resposta:
      "Não. Os nove primeiros dígitos são sorteados sem filtro, então o nono — que indica a região fiscal de emissão — sai aleatório. Se o seu teste depende de uma região, troque o nono dígito e recalcule os dois verificadores.",
  },
  {
    pergunta: "O CPF gerado é enviado para algum servidor?",
    resposta:
      "Não. O cálculo acontece inteiro no seu navegador, em JavaScript. Nenhum número gerado sai do seu aparelho, não fica gravado em lugar nenhum e não passa por servidor.",
  },
  {
    pergunta: "Quantos CPFs posso gerar?",
    resposta:
      "Quantos quiser. Não há limite, cadastro, fila nem cobrança — como a conta roda no seu próprio navegador, gerar mais não custa nada a ninguém.",
  },
  {
    pergunta: "Como validar um CPF que eu já tenho?",
    resposta:
      "Refaça a conta dos dois dígitos verificadores: pesos de 10 a 2 para o primeiro, de 11 a 2 para o segundo, módulo 11, e resto menor que 2 vira zero. Se os dois baterem com os dois últimos algarismos, o número é formalmente válido — o que não diz nada sobre ele existir na Receita.",
  },
];

export const VEJA = ["/validador-de-cpf", "/cnpj", "/cartao-de-credito"];
