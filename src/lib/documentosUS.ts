/**
 * Geradores de dado de teste dos Estados Unidos: SSN, EIN e telefone.
 *
 * Não são o CPF e o CNPJ com outro nome. São formatos diferentes, com regras
 * diferentes, e a diferença mais importante é esta: **SSN e EIN não têm dígito
 * verificador**. No CPF e no CNPJ, os últimos dígitos saem de uma conta sobre
 * os primeiros, e é isso que um formulário confere. Aqui não há conta nenhuma —
 * a validade é uma questão de faixa: certos intervalos nunca foram emitidos, e
 * é só isso que dá para verificar sem consultar o órgão.
 *
 * Isso cria uma tensão que o CPF não tem, e que está resolvida em cada gerador
 * abaixo: o número que passa em formulário é o que pode, em tese, coincidir com
 * o de alguém; o número garantidamente falso é justamente o que o formulário
 * recusa. Onde existe faixa reservada — SSN e telefone —, as duas opções estão
 * expostas, e o padrão é o que serve para testar.
 */

/* ────────────────────────────── SSN ────────────────────────────── */

/**
 * Social Security Number: `AAA-GG-SSSS`.
 *
 * Três partes: área (3), grupo (2) e série (4). Desde a randomização de junho
 * de 2011, a área deixou de indicar o estado de emissão — quem escrever o
 * contrário está repetindo informação que venceu.
 *
 * O que **nunca** foi emitido, segundo a Social Security Administration:
 * área 000, 666 e de 900 a 999; grupo 00; série 0000.
 */
export const AREAS_INVALIDAS_DE_SSN = { zero: 0, seiscentosSessentaSeis: 666, novecentosOuMais: 900 } as const;

/**
 * A faixa que a própria SSA reserva para publicidade e material didático.
 *
 * 987-65-4320 a 987-65-4329 nunca serão atribuídos a ninguém. É a escolha certa
 * para um gerador de teste: o número é reconhecidamente falso, e não há como
 * ele coincidir com o de uma pessoa real.
 */
export const SSN_DE_DEMONSTRACAO = { area: 987, grupo: 65, serieInicial: 4320, serieFinal: 4329 } as const;

/*
 * E aqui está a armadilha dessa faixa, que só aparece quando se escreve o
 * teste: 987 está DENTRO do intervalo 900-999, que a SSA nunca emitiu. A faixa
 * de demonstração é garantidamente falsa justamente por ser inválida — e, por
 * isso, um formulário com validação estrita a RECUSA.
 *
 * O que decide o padrão do gerador é para que ele serve. Serve para o
 * formulário aceitar e a pessoa testar o caminho de sucesso; um número que
 * nunca passa não testa nada. Então o padrão é `aleatorio`, que respeita as
 * faixas emissíveis, e a faixa de demonstração fica como escolha explícita de
 * quem precisa de um número que comprovadamente não é de ninguém.
 */

export type EstiloDeSsn = "demonstracao" | "aleatorio";

function inteiro(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Gera um SSN.
 *
 * O padrão é `aleatorio`: respeita as faixas emissíveis e passa em validação,
 * que é o que faz o gerador servir para testar formulário.
 *
 * `demonstracao` devolve a faixa reservada pela SSA, que não pertence nem
 * pertencerá a ninguém — e que, exatamente por estar no intervalo 900-999, é
 * recusada por validação estrita. Use quando o que importa é o número ser
 * comprovadamente falso, não passar no formulário.
 */
export function gerarSsn(estilo: EstiloDeSsn = "aleatorio"): string {
  if (estilo === "demonstracao") {
    const serie = inteiro(SSN_DE_DEMONSTRACAO.serieInicial, SSN_DE_DEMONSTRACAO.serieFinal);
    return `${SSN_DE_DEMONSTRACAO.area}${SSN_DE_DEMONSTRACAO.grupo}${serie}`;
  }

  let area = inteiro(1, 899);
  while (area === 666) area = inteiro(1, 899);
  const grupo = inteiro(1, 99);
  const serie = inteiro(1, 9999);

  return `${String(area).padStart(3, "0")}${String(grupo).padStart(2, "0")}${String(serie).padStart(4, "0")}`;
}

/** Diz se um SSN respeita as faixas emissíveis. Não diz se existe. */
export function ssnValido(entrada: string): boolean {
  const d = entrada.replace(/\D/g, "");
  if (d.length !== 9) return false;

  const area = Number(d.slice(0, 3));
  const grupo = Number(d.slice(3, 5));
  const serie = Number(d.slice(5));

  if (area === 0 || area === 666 || area >= 900) return false;
  if (grupo === 0) return false;
  if (serie === 0) return false;
  return true;
}

export function formatarSsn(ssn: string): string {
  return ssn.replace(/^(\d{3})(\d{2})(\d{4})$/, "$1-$2-$3");
}

/* ────────────────────────────── EIN ────────────────────────────── */

/**
 * Employer Identification Number: `PP-NNNNNNN`.
 *
 * Nove dígitos. Os dois primeiros são o prefixo de campus — a unidade do IRS
 * que emitiu —, e o resto é sequencial. Também não há dígito verificador: a
 * única verificação possível sem consultar o IRS é se o prefixo está na lista
 * dos que o IRS usa.
 */
export const PREFIXOS_DE_EIN = [
  10, 12, 60, 67, 50, 53, 1, 2, 3, 4, 5, 6, 11, 13, 14, 16, 21, 22, 23, 25, 34, 51, 52, 54, 55, 56, 57, 58, 59,
  65, 30, 32, 35, 36, 37, 38, 61, 15, 24, 40, 44, 94, 95, 80, 90, 33, 39, 41, 42, 43, 46, 48, 62, 63, 64, 66,
  68, 71, 72, 73, 74, 75, 76, 77, 81, 82, 83, 84, 85, 86, 87, 88, 91, 92, 93, 98, 99, 20, 26, 27, 45, 47, 81,
] as const;

export function gerarEin(): string {
  const prefixo = PREFIXOS_DE_EIN[Math.floor(Math.random() * PREFIXOS_DE_EIN.length)];
  const sequencia = inteiro(0, 9_999_999);
  return `${String(prefixo).padStart(2, "0")}${String(sequencia).padStart(7, "0")}`;
}

/** Diz se o prefixo de campus é um dos que o IRS usa. Não diz se o EIN existe. */
export function einValido(entrada: string): boolean {
  const d = entrada.replace(/\D/g, "");
  if (d.length !== 9) return false;
  return (PREFIXOS_DE_EIN as readonly number[]).includes(Number(d.slice(0, 2)));
}

export function formatarEin(ein: string): string {
  return ein.replace(/^(\d{2})(\d{7})$/, "$1-$2");
}

/* ──────────────────────── Telefone dos EUA ──────────────────────── */

/**
 * Telefone no Plano de Numeração da América do Norte: `(AAA) BBB-CCCC`.
 *
 * Três partes: código de área (3), prefixo central (3) e linha (4). As regras
 * que um número precisa respeitar para ser discável:
 *
 * - O primeiro dígito da área e do prefixo vai de **2 a 9**. Nunca 0 ou 1.
 * - O prefixo central **não** pode ser `N11` (211, 311, … 911), que são
 *   serviços.
 * - Área com os dois últimos dígitos iguais a 9 (`N9X` com XX=99) é reservada
 *   para expansão futura.
 *
 * A faixa `555-0100` a `555-0199` é a reservada para ficção — é a que aparece
 * em filme justamente por não tocar em lugar nenhum.
 */
export const LINHA_FICTICIA = { prefixo: 555, inicial: 100, final: 199 } as const;

/**
 * Códigos de área por estado, dos mais populosos.
 *
 * Lista curta de propósito: são os que cobrem a maior parte dos casos de teste,
 * e uma tabela com os mais de 300 códigos do plano envelheceria a cada abertura
 * de novo código sem deixar o gerador melhor.
 */
export const AREAS_POR_ESTADO: Record<string, { nome: string; codigos: number[] }> = {
  AL: { nome: "Alabama", codigos: [205, 251, 256, 334, 938] },
  AZ: { nome: "Arizona", codigos: [480, 520, 602, 623, 928] },
  CA: { nome: "California", codigos: [213, 310, 408, 415, 510, 619, 650, 714, 818, 916, 925, 949] },
  CO: { nome: "Colorado", codigos: [303, 719, 720, 970] },
  CT: { nome: "Connecticut", codigos: [203, 475, 860, 959] },
  DC: { nome: "District of Columbia", codigos: [202] },
  FL: { nome: "Florida", codigos: [305, 321, 352, 386, 407, 561, 727, 754, 813, 850, 904, 941, 954] },
  GA: { nome: "Georgia", codigos: [229, 404, 470, 478, 678, 706, 762, 770, 912] },
  IL: { nome: "Illinois", codigos: [217, 224, 309, 312, 331, 618, 630, 708, 773, 815, 847, 872] },
  IN: { nome: "Indiana", codigos: [219, 260, 317, 463, 574, 765, 812, 930] },
  MA: { nome: "Massachusetts", codigos: [339, 351, 413, 508, 617, 774, 781, 857, 978] },
  MD: { nome: "Maryland", codigos: [240, 301, 410, 443, 667] },
  MI: { nome: "Michigan", codigos: [231, 248, 269, 313, 517, 586, 616, 734, 810, 906, 947, 989] },
  MN: { nome: "Minnesota", codigos: [218, 320, 507, 612, 651, 763, 952] },
  MO: { nome: "Missouri", codigos: [314, 417, 573, 636, 660, 816] },
  NC: { nome: "North Carolina", codigos: [252, 336, 704, 743, 828, 910, 919, 980, 984] },
  NJ: { nome: "New Jersey", codigos: [201, 551, 609, 640, 732, 848, 856, 862, 908, 973] },
  NV: { nome: "Nevada", codigos: [702, 725, 775] },
  NY: { nome: "New York", codigos: [212, 315, 332, 347, 516, 518, 585, 631, 646, 716, 718, 845, 914, 917, 929] },
  OH: { nome: "Ohio", codigos: [216, 220, 234, 326, 330, 380, 419, 440, 513, 567, 614, 740, 937] },
  OR: { nome: "Oregon", codigos: [458, 503, 541, 971] },
  PA: { nome: "Pennsylvania", codigos: [215, 223, 267, 272, 412, 445, 484, 570, 610, 717, 724, 814, 878] },
  SC: { nome: "South Carolina", codigos: [803, 843, 854, 864] },
  TN: { nome: "Tennessee", codigos: [423, 615, 629, 731, 865, 901, 931] },
  TX: { nome: "Texas", codigos: [210, 214, 254, 281, 325, 346, 361, 409, 430, 432, 469, 512, 682, 713, 726, 737, 806, 817, 830, 832, 903, 915, 936, 940, 956, 972, 979] },
  VA: { nome: "Virginia", codigos: [276, 434, 540, 571, 703, 757, 804, 826, 948] },
  WA: { nome: "Washington", codigos: [206, 253, 360, 425, 509, 564] },
  WI: { nome: "Wisconsin", codigos: [262, 414, 534, 608, 715, 920] },
};

export type EstiloDeTelefone = "ficticio" | "aleatorio";

/**
 * Gera um telefone americano.
 *
 * No estilo `ficticio`, usa a faixa 555-01XX reservada — não toca em ninguém.
 * No estilo `aleatorio`, gera um número que respeita todas as regras de
 * discagem, para testar validação que recusa o 555.
 */
export function gerarTelefoneUS(sigla?: string, estilo: EstiloDeTelefone = "ficticio"): string {
  const estado = sigla ? AREAS_POR_ESTADO[sigla] : undefined;
  const codigos = estado?.codigos ?? Object.values(AREAS_POR_ESTADO).flatMap((e) => e.codigos);
  const area = codigos[Math.floor(Math.random() * codigos.length)];

  if (estilo === "ficticio") {
    const linha = inteiro(LINHA_FICTICIA.inicial, LINHA_FICTICIA.final);
    return `${area}${LINHA_FICTICIA.prefixo}${String(linha).padStart(4, "0")}`;
  }

  let prefixo = inteiro(200, 999);
  // N11 é serviço (411, 911...), e 555 é a faixa de ficção: fora do aleatório.
  while (prefixo % 100 === 11 || prefixo === 555) prefixo = inteiro(200, 999);
  const linha = inteiro(0, 9999);

  return `${area}${prefixo}${String(linha).padStart(4, "0")}`;
}

/** Diz se o número respeita as regras de discagem do plano norte-americano. */
export function telefoneUsValido(entrada: string): boolean {
  const d = entrada.replace(/\D/g, "").replace(/^1/, "");
  if (d.length !== 10) return false;

  const area = Number(d.slice(0, 3));
  const prefixo = Number(d.slice(3, 6));

  if (d[0] < "2" || d[3] < "2") return false;
  if (prefixo % 100 === 11) return false;
  if (area % 100 === 99) return false;
  return true;
}

export function formatarTelefoneUS(numero: string): string {
  return numero.replace(/^(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");
}
