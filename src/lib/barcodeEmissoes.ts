/**
 * Histórico do que já foi emitido, e o aviso de sobreposição.
 *
 * É a razão de a ferramenta existir. Sem isto o operador controla de cabeça
 * onde parou, e é daí que sai número repetido ou pulado — que vira retrabalho
 * de impressão, não um aviso na tela. Com o histórico, a folha de segunda-feira
 * denuncia a de quinta.
 *
 * O aviso **nunca** bloqueia. Reemitir um lote perdido, molhado ou mal cortado
 * é necessidade real numa gráfica, e uma ferramenta que trava nisso passa a ser
 * contornada por fora — aí o histórico deixa de valer para tudo.
 */

import { formatarValor, type Faixa } from "@/lib/barcodeLayout";

export interface Emissao {
  id: string;
  /** Primeiro número da faixa, inclusive. */
  de: number;
  /** Último número da faixa, inclusive. */
  ate: number;
  /** Dígitos usados: muda o código impresso, então entra na comparação. */
  digitos: number;
  /** Momento da emissão, em ISO. */
  em: string;
  /** Nome do arquivo baixado. */
  arquivo: string;
  paginas: number;
  arquivos: number;
  /** Anotação livre do operador: cliente, serviço, ordem de produção. */
  nota: string;
}

const CHAVE = "geradoor:codigo-de-barras:emissoes";

/**
 * Teto de emissões guardadas.
 *
 * Duzentas cobrem anos de uma gráfica que emite semanalmente, e ocupam uns
 * 30 KB — cabe folgado na cota do `localStorage`. Passando disso, a mais
 * antiga sai: um registro de três anos atrás não ajuda a decidir nada hoje.
 */
const TETO = 200;

const ehEmissao = (valor: unknown): valor is Emissao => {
  if (typeof valor !== "object" || valor === null) return false;
  const e = valor as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.de === "number" &&
    Number.isFinite(e.de) &&
    typeof e.ate === "number" &&
    Number.isFinite(e.ate) &&
    typeof e.digitos === "number" &&
    Number.isFinite(e.digitos) &&
    typeof e.em === "string" &&
    typeof e.arquivo === "string" &&
    typeof e.nota === "string"
  );
};

/**
 * Lê o histórico do navegador.
 *
 * Filtra registro malformado em vez de recusar o arquivo inteiro: uma entrada
 * corrompida não pode apagar as outras cento e noventa e nove.
 */
export function lerEmissoes(): Emissao[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return [];
    const dados: unknown = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.filter(ehEmissao).slice(0, TETO);
  } catch {
    return [];
  }
}

let falhaAvisada = false;

export function gravarEmissoes(emissoes: readonly Emissao[]): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(emissoes.slice(0, TETO)));
  } catch (erro) {
    // Cota cheia ou aba anônima. O que se perde é o histórico sobreviver ao
    // recarregar — e é grave o bastante para aparecer em algum lugar, porque
    // o operador passa a confiar num controle que não está sendo gravado.
    if (!falhaAvisada) {
      falhaAvisada = true;
      console.warn(
        "Não foi possível guardar o histórico de emissões neste navegador. O aviso de sobreposição não vai funcionar depois de recarregar.",
        erro
      );
    }
  }
}

export interface DadosDaEmissao {
  faixa: Faixa;
  digitos: number;
  arquivo: string;
  paginas: number;
  arquivos: number;
}

export function novaEmissao({
  faixa,
  digitos,
  arquivo,
  paginas,
  arquivos,
}: DadosDaEmissao): Emissao {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    de: faixa.de,
    ate: faixa.ate,
    digitos,
    em: new Date().toISOString(),
    arquivo,
    paginas,
    arquivos,
    nota: "",
  };
}

/**
 * Emissões cuja faixa cruza a pedida.
 *
 * Duas faixas se cruzam quando uma começa antes de a outra acabar, nas duas
 * direções. A comparação é numérica mesmo quando a contagem de dígitos
 * difere: `004000` e `4000` são códigos de barras diferentes, mas para quem
 * confere a papelada é o mesmo número de formulário, e é isso que gera a
 * confusão que o aviso existe para evitar. A diferença de dígitos entra na
 * mensagem, não no critério.
 */
export function sobreposicoes(
  faixa: Faixa,
  emissoes: readonly Emissao[]
): Emissao[] {
  return emissoes.filter((e) => faixa.de <= e.ate && faixa.ate >= e.de);
}

const dataCurta = (iso: string): string => {
  const data = new Date(iso);
  return Number.isNaN(data.getTime())
    ? "data desconhecida"
    : data.toLocaleDateString("pt-BR");
};

/**
 * A mensagem do aviso, dizendo exatamente o que cruza com o quê.
 *
 * Nomear as duas faixas e a data é o que transforma o aviso em decisão: sem
 * isso o operador só sabe que "tem algo", e a saída fácil passa a ser ignorar.
 */
export function descreverSobreposicao(
  faixa: Faixa,
  digitos: number,
  cruzadas: readonly Emissao[]
): string {
  const primeira = cruzadas[0];
  if (!primeira) return "";

  const nossa = `${formatarValor(faixa.de, digitos)}–${formatarValor(faixa.ate, digitos)}`;
  const dela = `${formatarValor(primeira.de, primeira.digitos)}–${formatarValor(
    primeira.ate,
    primeira.digitos
  )}`;
  const nota = primeira.nota.trim() ? ` · ${primeira.nota.trim()}` : "";
  const digitosDiferentes =
    primeira.digitos !== digitos
      ? ` Aquela usava ${primeira.digitos} dígitos, esta usa ${digitos}.`
      : "";
  const restantes = cruzadas.length - 1;
  const outras =
    restantes > 0
      ? restantes === 1
        ? " E com mais uma emissão."
        : ` E com mais ${restantes} emissões.`
      : "";

  return `A faixa ${nossa} se sobrepõe à emissão de ${dataCurta(primeira.em)} (${dela}${nota}).${digitosDiferentes}${outras}`;
}
