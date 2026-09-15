/**
 * O motor de verdade: o mesmo .wasm que a página serve, rodando em Node.
 *
 * Imagens pequenas de propósito — o que se confere aqui é o contrato (formas,
 * transparência, erros, determinismo e o hash publicado), não o desempenho.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { MOTOR, ajustesDoEstilo, parametrosDoMotor, prepararPixels, type Dimensoes } from "./vetorizador";
import { MotorEsgotado, criarMotor, type Motor } from "./vetorizadorMotor";

const bytes = readFileSync(join(process.cwd(), "public", MOTOR.url));
let modulo: WebAssembly.Module;
let motor: Motor;

beforeAll(async () => {
  modulo = await WebAssembly.compile(bytes);
  motor = await criarMotor(modulo);
});

function imagem({ largura, altura }: Dimensoes, cor: (x: number, y: number) => number[]) {
  const px = new Uint8ClampedArray(largura * altura * 4);
  for (let y = 0; y < altura; y++) for (let x = 0; x < largura; x++) px.set(cor(x, y), (y * largura + x) * 4);
  return px;
}

const d = { largura: 96, altura: 96 };
const quadradoNoBranco = () =>
  imagem(d, (x, y) => (x >= 24 && x < 72 && y >= 24 && y < 72 ? [227, 87, 46, 255] : [255, 255, 255, 255]));

describe("o arquivo publicado", () => {
  it("tem o hash que a página confere", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(MOTOR.sha256);
  });

  it("não importa nada e tem teto de memória", () => {
    expect(WebAssembly.Module.imports(modulo)).toEqual([]);
    const instancia = new WebAssembly.Instance(modulo, {});
    const memoria = instancia.exports.memory as WebAssembly.Memory;
    // 256 MB são 4096 páginas de 64 KB: crescer além disso tem de falhar.
    expect(() => memoria.grow(4096)).toThrow();
  });
});

describe("o motor", () => {
  it("traça um quadrado laranja sobre branco em duas formas, com as duas cores", () => {
    const { caminhos, total } = motor.vetorizar(quadradoNoBranco(), d.largura, d.altura, parametrosDoMotor(ajustesDoEstilo("logo"), "logo", d));
    expect(total).toBe(2);
    expect(caminhos).toContain('fill="#FFFFFF"');
    expect(caminhos).toContain('fill="#E3572E"');
  });

  it("é determinístico", () => {
    const p = parametrosDoMotor(ajustesDoEstilo("logo"), "logo", d);
    const a = motor.vetorizar(quadradoNoBranco(), d.largura, d.altura, p);
    const b = motor.vetorizar(quadradoNoBranco(), d.largura, d.altura, p);
    expect(a.caminhos).toBe(b.caminhos);
  });

  it("transparência não vira forma", () => {
    const px = imagem(d, (x, y) => (x >= 24 && x < 72 && y >= 24 && y < 72 ? [10, 120, 200, 255] : [0, 0, 0, 0]));
    const { caminhos, total } = motor.vetorizar(px, d.largura, d.altura, parametrosDoMotor(ajustesDoEstilo("logo"), "logo", d));
    expect(total).toBe(1);
    expect(caminhos).toContain('fill="#0A78C8"');
  });

  it("no modo binário, só a tinta vira forma", () => {
    const px = imagem(d, (x) => (x < 48 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const { caminhos, total } = motor.vetorizar(px, d.largura, d.altura, parametrosDoMotor(ajustesDoEstilo("traco"), "traco", d));
    expect(total).toBe(1);
    expect(caminhos).toContain('fill="#000000"');
  });

  it("descarta manchas menores que o detalhe pede", () => {
    // Uma mancha preta de 3 × 3 = 9 px: fica com mancha mínima de 2 × 2, sai
    // com 4 × 4.
    const px = quadradoNoBranco();
    for (let y = 4; y < 7; y++) for (let x = 4; x < 7; x++) px.set([0, 0, 0, 255], (y * 96 + x) * 4);
    const comDetalhe = motor.vetorizar(new Uint8ClampedArray(px), 96, 96, { ...parametrosDoMotor(ajustesDoEstilo("logo"), "logo", d), ladoDaMancha: 2 });
    const semDetalhe = motor.vetorizar(new Uint8ClampedArray(px), 96, 96, { ...parametrosDoMotor(ajustesDoEstilo("logo"), "logo", d), ladoDaMancha: 4 });
    expect(comDetalhe.total).toBeGreaterThan(semDetalhe.total);
  });

  it("recusa pixels que não batem com as dimensões", () => {
    expect(() => motor.vetorizar(new Uint8ClampedArray(12), 2, 2, parametrosDoMotor(ajustesDoEstilo("logo"), "logo", d))).toThrow(RangeError);
  });

  it("recusa parâmetro fora do contrato com erro, sem abortar", () => {
    expect(() =>
      motor.vetorizar(quadradoNoBranco(), 96, 96, { ...parametrosDoMotor(ajustesDoEstilo("logo"), "logo", d), precisaoDeCor: 9 })
    ).toThrow(/código -1/);
    // A instância continua servindo depois de uma recusa.
    expect(motor.vetorizar(quadradoNoBranco(), 96, 96, parametrosDoMotor(ajustesDoEstilo("logo"), "logo", d)).total).toBe(2);
  });

  it("imagem grande demais para o teto aborta como MotorEsgotado", async () => {
    // 1600 × 1600 de ruído: um cluster por pixel passa dos 256 MB e aborta
    // cedo, na alocação. Instância própria, porque a abortada não serve mais.
    const proprio = await criarMotor(modulo);
    const lado = 1600;
    const px = new Uint8Array(lado * lado * 4);
    let s = 1;
    for (let i = 0; i < px.length; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      px[i] = i % 4 === 3 ? 255 : s & 255;
    }
    const p = { ...parametrosDoMotor(ajustesDoEstilo("foto"), "foto", { largura: lado, altura: lado }), ladoDaMancha: 1 };
    expect(() => proprio.vetorizar(px, lado, lado, p)).toThrow(MotorEsgotado);
  });

  it("de ponta a ponta: preparação e motor dão um SVG de três cores para um logo", () => {
    const lado = 120;
    const px = imagem({ largura: lado, altura: lado }, (x, y) => {
      if (x > 48 && x < 72 && y > 48 && y < 72) return [26, 190, 187, 255];
      return Math.hypot(x - 60, y - 60) < 36 ? [227, 87, 46, 255] : [255, 255, 255, 255];
    });
    const dims = { largura: lado, altura: lado };
    const preparacao = prepararPixels(px, dims, ajustesDoEstilo("automatico"));
    const { total } = motor.vetorizar(px, lado, lado, parametrosDoMotor(ajustesDoEstilo("automatico"), preparacao.estilo, dims));
    expect(preparacao.coresUsadas).toBe(3);
    expect(total).toBe(3);
  });
});
