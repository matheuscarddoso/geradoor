/**
 * Validação de CPF: a mesma conta do gerador, no sentido inverso.
 *
 * Fica separada do `cpf_gen` de propósito. Gerar e conferir são funções
 * opostas e independentes: se um dia o gerador mudar, o validador precisa
 * continuar dizendo a verdade sobre um número que veio de fora.
 */

export type ResultadoDaValidacao =
  | { estado: "vazio" }
  | { estado: "incompleto"; digitos: number }
  | { estado: "repetido" }
  | { estado: "invalido"; esperados: [number, number]; informados: [number, number] }
  | { estado: "valido"; regiao: string };

/**
 * A região fiscal de emissão, pelo nono dígito.
 *
 * Vale para CPF emitido de verdade; num número gerado para teste o nono dígito
 * é sorteado, então isto é informação sobre o formato, não sobre a pessoa.
 */
export const REGIOES: Record<string, string> = {
  "0": "Rio Grande do Sul",
  "1": "Distrito Federal, Goiás, Mato Grosso, Mato Grosso do Sul e Tocantins",
  "2": "Acre, Amapá, Amazonas, Pará, Rondônia e Roraima",
  "3": "Ceará, Maranhão e Piauí",
  "4": "Alagoas, Paraíba, Pernambuco e Rio Grande do Norte",
  "5": "Bahia e Sergipe",
  "6": "Minas Gerais",
  "7": "Espírito Santo e Rio de Janeiro",
  "8": "São Paulo",
  "9": "Paraná e Santa Catarina",
};

/** Só os algarismos, no máximo onze. */
export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "").slice(0, 11);
}

/** Um dígito verificador: pesos decrescentes, módulo 11, resto menor que 2 vira 0. */
export function digitoVerificador(digitos: number[]): number {
  const soma = digitos.reduce((total, d, i) => total + d * (digitos.length + 1 - i), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCpf(entrada: string): ResultadoDaValidacao {
  const limpo = apenasDigitos(entrada);
  if (limpo.length === 0) return { estado: "vazio" };
  if (limpo.length < 11) return { estado: "incompleto", digitos: limpo.length };

  // 111.111.111-11 e os outros dez repetidos fecham a conta por acidente: a
  // soma é sempre múltipla de 11. São formalmente válidos e universalmente
  // recusados, então merecem resposta própria em vez de um "válido" enganoso.
  if (/^(\d)\1{10}$/.test(limpo)) return { estado: "repetido" };

  const digitos = limpo.split("").map(Number);
  const base = digitos.slice(0, 9);
  const primeiro = digitoVerificador(base);
  const segundo = digitoVerificador([...base, primeiro]);

  if (digitos[9] !== primeiro || digitos[10] !== segundo) {
    return {
      estado: "invalido",
      esperados: [primeiro, segundo],
      informados: [digitos[9], digitos[10]],
    };
  }

  return { estado: "valido", regiao: REGIOES[limpo[8]] ?? "não identificada" };
}
