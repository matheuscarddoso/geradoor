/**
 * O motor de vetorização: o VTracer em WebAssembly (wasm/vetorizador).
 *
 * O módulo não importa nada e exporta funções numéricas; este arquivo é a
 * ponte inteira entre ele e o TypeScript. Roda igual no worker e no Node dos
 * testes.
 */

import type { ModoDeCurva, ParametrosDoMotor } from "./vetorizador";

interface Exportacoes {
  memory: WebAssembly.Memory;
  alocar(tamanho: number): number;
  liberar(ponteiro: number, tamanho: number): void;
  vetorizar(
    ponteiro: number,
    tamanho: number,
    largura: number,
    altura: number,
    binario: number,
    recortado: number,
    modo: number,
    ladoDaMancha: number,
    precisaoDeCor: number,
    diferencaDeCamada: number,
    anguloDeCanto: number,
    comprimentoMinimo: number,
    iteracoes: number,
    anguloDeEmenda: number,
    casasDecimais: number
  ): number;
  resultado_ponteiro(): number;
  resultado_tamanho(): number;
  caminhos(): number;
}

const MODOS: Record<ModoDeCurva, number> = { pixel: 0, poligono: 1, curva: 2 };

/**
 * O motor esgotou a memória (teto de 512 MB do módulo) ou abortou.
 *
 * Depois disto a instância não serve mais: o WebAssembly abortado fica com o
 * heap num estado qualquer. Quem recebe descarta o worker inteiro.
 */
export class MotorEsgotado extends Error {}

export interface ResultadoDoMotor {
  /** Os elementos `<path>`, na ordem de empilhamento. */
  caminhos: string;
  total: number;
}

export interface Motor {
  vetorizar(pixels: Uint8Array | Uint8ClampedArray, largura: number, altura: number, p: ParametrosDoMotor): ResultadoDoMotor;
}

export async function criarMotor(modulo: WebAssembly.Module): Promise<Motor> {
  const instancia = await WebAssembly.instantiate(modulo, {});
  const e = instancia.exports as unknown as Exportacoes;
  const decodificador = new TextDecoder();

  return {
    vetorizar(pixels, largura, altura, p) {
      if (pixels.length !== largura * altura * 4) throw new RangeError("Pixels e dimensões não batem");
      let codigo: number;
      try {
        const ponteiro = e.alocar(pixels.length);
        // A view nasce depois de alocar: alocar pode crescer a memória, e uma
        // view criada antes apontaria para o buffer antigo, já desanexado.
        new Uint8Array(e.memory.buffer, ponteiro, pixels.length).set(pixels);
        codigo = e.vetorizar(
          ponteiro,
          pixels.length,
          largura,
          altura,
          p.binario ? 1 : 0,
          0,
          MODOS[p.modo],
          p.ladoDaMancha,
          p.precisaoDeCor,
          p.diferencaDeCamada,
          p.anguloDeCanto,
          p.comprimentoMinimo,
          p.iteracoes,
          p.anguloDeEmenda,
          p.casasDecimais
        );
      } catch (erro) {
        if (erro instanceof WebAssembly.RuntimeError) throw new MotorEsgotado(erro.message);
        throw erro;
      }
      if (codigo !== 0) throw new Error(`O motor recusou os parâmetros (código ${codigo})`);
      const texto = decodificador.decode(new Uint8Array(e.memory.buffer, e.resultado_ponteiro(), e.resultado_tamanho()));
      return { caminhos: texto, total: e.caminhos() };
    },
  };
}
