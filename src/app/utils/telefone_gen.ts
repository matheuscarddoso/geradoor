/**
 * Gerador de celular brasileiro.
 *
 * Os DDDs saem do plano de numeração da Anatel, agrupados por unidade da
 * federação. Estado com mais de um DDD sorteia entre os seus — São Paulo tem
 * nove, e usar só o 11 daria um gerador que sempre devolve a capital.
 */

export interface Uf {
  sigla: string;
  nome: string;
  ddds: number[];
}

export const UFS: Uf[] = [
  { sigla: "AC", nome: "Acre", ddds: [68] },
  { sigla: "AL", nome: "Alagoas", ddds: [82] },
  { sigla: "AP", nome: "Amapá", ddds: [96] },
  { sigla: "AM", nome: "Amazonas", ddds: [92, 97] },
  { sigla: "BA", nome: "Bahia", ddds: [71, 73, 74, 75, 77] },
  { sigla: "CE", nome: "Ceará", ddds: [85, 88] },
  { sigla: "DF", nome: "Distrito Federal", ddds: [61] },
  { sigla: "ES", nome: "Espírito Santo", ddds: [27, 28] },
  { sigla: "GO", nome: "Goiás", ddds: [62, 64] },
  { sigla: "MA", nome: "Maranhão", ddds: [98, 99] },
  { sigla: "MT", nome: "Mato Grosso", ddds: [65, 66] },
  { sigla: "MS", nome: "Mato Grosso do Sul", ddds: [67] },
  { sigla: "MG", nome: "Minas Gerais", ddds: [31, 32, 33, 34, 35, 37, 38] },
  { sigla: "PA", nome: "Pará", ddds: [91, 93, 94] },
  { sigla: "PB", nome: "Paraíba", ddds: [83] },
  { sigla: "PR", nome: "Paraná", ddds: [41, 42, 43, 44, 45, 46] },
  { sigla: "PE", nome: "Pernambuco", ddds: [81, 87] },
  { sigla: "PI", nome: "Piauí", ddds: [86, 89] },
  { sigla: "RJ", nome: "Rio de Janeiro", ddds: [21, 22, 24] },
  { sigla: "RN", nome: "Rio Grande do Norte", ddds: [84] },
  { sigla: "RS", nome: "Rio Grande do Sul", ddds: [51, 53, 54, 55] },
  { sigla: "RO", nome: "Rondônia", ddds: [69] },
  { sigla: "RR", nome: "Roraima", ddds: [95] },
  { sigla: "SC", nome: "Santa Catarina", ddds: [47, 48, 49] },
  { sigla: "SP", nome: "São Paulo", ddds: [11, 12, 13, 14, 15, 16, 17, 18, 19] },
  { sigla: "SE", nome: "Sergipe", ddds: [79] },
  { sigla: "TO", nome: "Tocantins", ddds: [63] },
];

const sortear = <T,>(lista: T[]): T =>
  lista[Math.floor(Math.random() * lista.length)];

const digito = () => Math.floor(Math.random() * 10);

/**
 * Gera um celular de 11 dígitos: DDD + 9 + 8 dígitos.
 *
 * O nono dígito é obrigatório em celular no Brasil desde 2016, e o primeiro
 * dígito depois dele fica entre 6 e 9 — faixas abaixo disso são de telefone
 * fixo. Sem essa restrição o gerador produziria números que nenhuma
 * validação de celular aceita.
 *
 * @param sigla UF a usar. Ausente ou "all" sorteia entre todas.
 */
export function gerarTelefone(sigla?: string): string {
  const uf =
    sigla && sigla !== "all"
      ? UFS.find((item) => item.sigla === sigla) ?? sortear(UFS)
      : sortear(UFS);

  const ddd = sortear(uf.ddds);
  const primeiro = 6 + Math.floor(Math.random() * 4); // 6 a 9
  const restante = Array.from({ length: 7 }, digito).join("");

  return `${ddd}9${primeiro}${restante}`;
}

/** (11) 91234-5678 */
export function formatarTelefone(numero: string): string {
  const so = numero.replace(/\D/g, "");
  if (so.length !== 11) return numero;
  return `(${so.slice(0, 2)}) ${so.slice(2, 7)}-${so.slice(7)}`;
}
