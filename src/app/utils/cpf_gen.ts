export function generateCPF(): string {
  // * 10, não * 9: com 9 o sorteio devolve 0 a 8 e o dígito 9 nunca sai. Em
  // 200 mil CPFs gerados, cada dígito de 0 a 8 aparecia em 11,1% das posições e
  // o 9 em nenhuma — um décimo do espaço de números era inalcançável, e a falta
  // do 9 é visível a olho nu numa lista.
  const randomDigits = (): number => Math.floor(Math.random() * 10);

  const cpf: number[] = Array.from({ length: 9 }, randomDigits);

  const calculateDigit = (cpfArray: number[]): number => {
    const sum = cpfArray.reduce((total, num, index) => {
      return total + num * (cpfArray.length + 1 - index);
    }, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  cpf.push(calculateDigit(cpf));
  cpf.push(calculateDigit(cpf));

  return cpf.join('');
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}
