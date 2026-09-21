import { Dado, type PerguntaDaFerramenta, type SecaoDaFerramenta } from "@/components/shell/ConteudoDaFerramenta";

/**
 * O texto de /telefone.
 *
 * Fatos conferidos nas páginas da Anatel. Um cuidado deliberado: o que mudou em
 * 2026 foi a reestruturação das ÁREAS LOCAIS da telefonia fixa, de 4.118 para
 * 67 — não houve DDD novo nem mudança de código. Escrever "novos DDDs em 2026"
 * seria errado, e é o erro que circula por aí.
 */

export const SECOES: SecaoDaFerramenta[] = [
  {
    titulo: "Como saber se um número é celular ou fixo",
    conteudo: (
      <>
        <p>
          Pelo primeiro dígito, segundo a regra de numeração da Anatel.{" "}
          <Dado>Celular sempre começa com 9</Dado> e tem nove dígitos depois do DDD, no formato 9XXXX-XXXX.{" "}
          <Dado>Fixo começa com 2, 3, 4 ou 5</Dado> e tem oito dígitos. Números iniciados em 7 são de rádio, e
          fixos de área rural começam com 57.
        </p>
        <p>
          O DDD tem sempre dois dígitos, e existem <Dado>67 códigos</Dado> no país. É por isso que uma máscara de
          telefone bem-feita não pode ter tamanho fixo: precisa aceitar oito e nove dígitos.
        </p>
      </>
    ),
  },
  {
    titulo: "O nono dígito",
    conteudo: (
      <>
        <p>
          O 9 na frente do celular não é enfeite: foi acrescentado para ampliar a quantidade de números
          disponíveis, à medida que as linhas móveis passaram de uma por pessoa. A migração aconteceu por etapas,
          região a região, e a Anatel considera concluída em todo o território nacional desde{" "}
          <Dado>14 de fevereiro de 2017</Dado>.
        </p>
        <p>
          Na prática isso significa que qualquer sistema que ainda valide celular com oito dígitos está quebrado há
          quase uma década — e é um dos casos de teste que mais aparece em migração de cadastro antigo.
        </p>
      </>
    ),
  },
  {
    titulo: "Número gerado não toca em lugar nenhum",
    conteudo: (
      <>
        <p>
          O que sai daqui é um número no <Dado>formato correto</Dado>, com DDD que existe e primeiro dígito que
          respeita a regra da Anatel. Não é uma linha habilitada: não pertence a ninguém, não recebe chamada e não
          recebe mensagem.
        </p>
        <p>
          Serve para preencher cadastro em ambiente de teste, conferir máscara de campo e popular banco de
          homologação. Enviar mensagem para números gerados, além de não chegar a lugar nenhum, pode esbarrar em
          linha de outra pessoa — o espaço de números é finito.
        </p>
      </>
    ),
  },
];

export const FAQ: PerguntaDaFerramenta[] = [
  {
    pergunta: "O telefone gerado existe?",
    resposta:
      "Não como linha habilitada. O número respeita o formato — DDD válido, celular começando com 9, nove dígitos —, mas não está ativo em operadora nenhuma, não pertence a ninguém e não recebe chamada nem mensagem.",
  },
  {
    pergunta: "Posso escolher o estado?",
    resposta:
      "Sim. O gerador sorteia um DDD real do estado escolhido, o que importa quando o sistema em teste valida a região do número ou calcula alguma coisa a partir dela.",
  },
  {
    pergunta: "Por que o celular tem nove dígitos?",
    resposta:
      "O nono dígito foi acrescentado para ampliar a quantidade de números disponíveis. A migração foi por etapas e a Anatel a considera concluída em todo o país desde 14 de fevereiro de 2017. Todo celular no Brasil começa com 9.",
  },
  {
    pergunta: "Como diferenciar celular de fixo pelo número?",
    resposta:
      "Pelo primeiro dígito depois do DDD: 9 é celular, com nove dígitos; 2, 3, 4 e 5 são fixos, com oito dígitos. Números iniciados em 7 são de rádio e fixos de área rural começam com 57.",
  },
  {
    pergunta: "Houve DDD novo em 2026?",
    resposta:
      "Não. O que mudou em 2026 foi a reestruturação das áreas locais da telefonia fixa, que caíram de 4.118 para 67 e passaram a coincidir com os DDDs — o que muda tarifação e discagem de chamadas fixas. Nenhum código de DDD foi criado ou alterado.",
  },
  {
    pergunta: "O número gerado é enviado para algum servidor?",
    resposta:
      "Não. O sorteio acontece inteiro no seu navegador. Nenhum número sai do seu aparelho e nada fica gravado.",
  },
];

export const VEJA = ["/cpf", "/cnpj", "/whatsapp"];
