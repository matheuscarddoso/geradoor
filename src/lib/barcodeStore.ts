/**
 * Persistência do editor entre sessões.
 *
 * O layout é pequeno e vai para `localStorage`. A arte é uma imagem de vários
 * megabytes e vai para o IndexedDB — em `localStorage` ela estouraria a cota e
 * levaria o layout junto. Numa gráfica o mesmo formulário volta por meses; ter
 * a folha montada ao reabrir a aba é a diferença entre a ferramenta ser usada
 * e ser refeita do zero toda vez.
 *
 * Tudo aqui falha em silêncio de propósito: navegação privada, cota cheia ou
 * armazenamento bloqueado tornam a persistência impossível, mas nenhuma delas
 * é motivo para impedir o operador de gerar o PDF agora.
 */

import { normalizarLayout, type Layout } from "@/lib/barcodeLayout";

const CHAVE_LAYOUT = "geradoor:codigo-de-barras:layout";
const BANCO = "geradoor-codigo-de-barras";
const DEPOSITO = "arte";
const CHAVE_ARTE = "atual";
const VERSAO_BANCO = 1;

export interface Arte {
  nome: string;
  dataUrl: string;
  formato: "PNG" | "JPEG";
  /** px, para o editor conferir a proporção contra a página. */
  largura: number;
  altura: number;
  /**
   * Quantos bytes esta arte ocupa **dentro** de um PDF.
   *
   * Não dá para deduzir do tamanho em disco: o JPEG entra como está, via
   * DCTDecode, mas o PNG é decodificado e recomprimido pelo jspdf, e nas
   * medições isso foi de 5,8× a 375× o original conforme a imagem. Como é
   * este número, e não o do disco, que decide se a faixa cabe na memória, ele
   * é medido de verdade uma vez e guardado junto da arte.
   */
  bytesNoPdf?: number;
}

export function lerLayout(): Layout | null {
  try {
    const bruto = localStorage.getItem(CHAVE_LAYOUT);
    return bruto ? normalizarLayout(JSON.parse(bruto)) : null;
  } catch {
    return null;
  }
}

/**
 * Já avisou que a gravação do layout falhou.
 *
 * Sem isto o aviso sairia a cada quadro de arrasto, porque o layout é gravado
 * a cada mudança. Uma linha basta para a falha ser diagnosticável.
 */
let falhaDeGravacaoAvisada = false;

export function gravarLayout(layout: Layout): void {
  try {
    localStorage.setItem(CHAVE_LAYOUT, JSON.stringify(layout));
  } catch (erro) {
    // Cota cheia, aba anônima ou armazenamento bloqueado. A sessão atual
    // segue inteira; o que se perde é o layout sobreviver ao recarregar —
    // e é por isso que a falha precisa aparecer em algum lugar em vez de
    // sumir: o operador acha que o trabalho está salvo e não está.
    if (!falhaDeGravacaoAvisada) {
      falhaDeGravacaoAvisada = true;
      console.warn(
        "Não foi possível guardar o layout neste navegador; ele não sobrevive ao recarregar. Use Exportar para salvar em arquivo.",
        erro
      );
    }
  }
}

function abrirBanco(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let pedido: IDBOpenDBRequest;
    try {
      pedido = indexedDB.open(BANCO, VERSAO_BANCO);
    } catch {
      return resolve(null);
    }
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(DEPOSITO)) {
        pedido.result.createObjectStore(DEPOSITO);
      }
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => resolve(null);
    pedido.onblocked = () => resolve(null);
  });
}

/**
 * Confere a forma do registro lido do IndexedDB.
 *
 * O banco é uma fronteira como qualquer outra: o que está lá foi gravado por
 * uma versão anterior do código, ou por uma gravação que morreu no meio. Um
 * registro sem `dataUrl` só apareceria como exceção no meio de uma geração de
 * dez mil páginas, que é o pior lugar possível para descobrir isso.
 */
function ehArte(valor: unknown): valor is Arte {
  if (typeof valor !== "object" || valor === null) return false;
  const a = valor as Record<string, unknown>;
  return (
    typeof a.nome === "string" &&
    typeof a.dataUrl === "string" &&
    a.dataUrl.startsWith("data:image/") &&
    (a.formato === "PNG" || a.formato === "JPEG") &&
    typeof a.largura === "number" &&
    Number.isFinite(a.largura) &&
    typeof a.altura === "number" &&
    Number.isFinite(a.altura) &&
    (a.bytesNoPdf === undefined ||
      (typeof a.bytesNoPdf === "number" && Number.isFinite(a.bytesNoPdf)))
  );
}

/**
 * Toda função de armazenamento resolve, nunca rejeita.
 *
 * Quem chama trata isto como conveniência, não como parte do fluxo, e chama
 * sem `await`. Se rejeitasse, viraria rejeição não tratada — e uma cota cheia
 * ou uma aba anônima passariam a derrubar a página em vez de só não guardar.
 */
export async function lerArte(): Promise<Arte | null> {
  try {
    const banco = await abrirBanco();
    if (!banco) return null;
    try {
      return await new Promise<Arte | null>((resolve) => {
        const pedido = banco.transaction(DEPOSITO, "readonly").objectStore(DEPOSITO).get(CHAVE_ARTE);
        pedido.onsuccess = () => resolve(ehArte(pedido.result) ? pedido.result : null);
        pedido.onerror = () => resolve(null);
      });
    } finally {
      banco.close();
    }
  } catch {
    // `transaction` lança de forma síncrona quando o depósito não existe ou o
    // banco está fechando. Sem arte guardada, o editor começa vazio.
    return null;
  }
}

export async function gravarArte(arte: Arte | null): Promise<void> {
  try {
    const banco = await abrirBanco();
    if (!banco) return;
    try {
      await new Promise<void>((resolve) => {
        const deposito = banco.transaction(DEPOSITO, "readwrite").objectStore(DEPOSITO);
        const pedido = arte ? deposito.put(arte, CHAVE_ARTE) : deposito.delete(CHAVE_ARTE);
        pedido.onsuccess = () => resolve();
        pedido.onerror = () => resolve();
      });
    } finally {
      banco.close();
    }
  } catch {
    // Cota cheia ou armazenamento bloqueado: a arte segue em memória e a
    // sessão atual funciona normalmente. Só não sobrevive ao recarregar.
  }
}

export class ArteInvalidaError extends Error {}

/** Maior arte aceita. Acima disso o PDF de dez mil páginas fica impraticável. */
const TAMANHO_MAXIMO = 20 * 1024 * 1024;

/**
 * Lê o arquivo de arte escolhido pelo operador.
 *
 * Só PNG e JPEG: são os dois formatos que o `jspdf` embute sem passar por
 * canvas, o que preserva os pixels originais e mantém a imagem entrando uma
 * única vez no documento.
 */
export async function lerArquivoDeArte(arquivo: File): Promise<Arte> {
  const formato = arquivo.type === "image/png" ? "PNG" : arquivo.type === "image/jpeg" ? "JPEG" : null;

  if (!formato) {
    throw new ArteInvalidaError(
      "A arte precisa ser PNG ou JPEG. Se o seu arquivo é PDF, exporte a página como PNG em 300 dpi."
    );
  }
  if (arquivo.size > TAMANHO_MAXIMO) {
    throw new ArteInvalidaError(
      `A arte tem ${(arquivo.size / 1048576).toFixed(1)} MB, acima do limite de 20 MB. Exporte em resolução menor.`
    );
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new ArteInvalidaError("Não foi possível ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });

  const { largura, altura } = await new Promise<{ largura: number; altura: number }>(
    (resolve, reject) => {
      const imagem = new Image();
      imagem.onload = () => resolve({ largura: imagem.naturalWidth, altura: imagem.naturalHeight });
      imagem.onerror = () =>
        reject(new ArteInvalidaError("O arquivo não abriu como imagem. Exporte de novo em PNG."));
      imagem.src = dataUrl;
    }
  );

  return { nome: arquivo.name, dataUrl, formato, largura, altura };
}
