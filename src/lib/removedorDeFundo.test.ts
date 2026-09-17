import { describe, expect, it } from "vitest";
import {
  LIMIAR_DE_PESSOA,
  LIMITE_DE_PIXELS_IOS,
  LIMITE_DE_PIXELS_PADRAO,
  MAX_BYTES,
  ampliarAlfa,
  dimensoesDaPrevia,
  limiteDePixels,
  NORMALIZACAO_MODNET,
  NORMALIZACAO_U2NETP,
  concordancia,
  dimensoesDeTrabalho,
  dimensoesDeEnvio,
  dimensoesDoModnet,
  ehPessoa,
  esticarSaida,
  formatarDuracao,
  formatarMegabytes,
  hexDoDigest,
  interpretarFalha,
  mediaEmCaixa,
  nomeDoRecorte,
  redimensionarPlano,
  restringirAoSujeito,
  rgbaParaTensor,
  validarArquivo,
} from "./removedorDeFundo";

describe("validarArquivo", () => {
  it("aceita os formatos que o navegador decodifica", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/avif"]) {
      expect(validarArquivo({ type, size: 1024 })).toEqual({ ok: true });
    }
  });

  it("recusa HEIC, que só o Safari abre", () => {
    expect(validarArquivo({ type: "image/heic", size: 1024 }).ok).toBe(false);
  });

  it("recusa SVG, que não tem fundo para remover", () => {
    expect(validarArquivo({ type: "image/svg+xml", size: 1024 }).ok).toBe(false);
  });

  it("recusa arquivo vazio e acima do teto, e aceita exatamente no teto", () => {
    expect(validarArquivo({ type: "image/png", size: 0 }).ok).toBe(false);
    expect(validarArquivo({ type: "image/png", size: MAX_BYTES + 1 }).ok).toBe(false);
    expect(MAX_BYTES).toBeGreaterThanOrEqual(80 * 1024 * 1024);
    expect(validarArquivo({ type: "image/png", size: MAX_BYTES }).ok).toBe(true);
  });
});

describe("dimensoesDeTrabalho", () => {
  it("preserva a foto de 21 MP: a saída tem a resolução da entrada", () => {
    expect(dimensoesDeTrabalho({ largura: 4000, altura: 5333 })).toEqual({ largura: 4000, altura: 5333, reduzida: false });
  });

  it("preserva a foto de 48 MP no desktop", () => {
    expect(dimensoesDeTrabalho({ largura: 8064, altura: 6048 }).reduzida).toBe(false);
  });

  it("no iOS, reduz só o que passa do limite de canvas, sem passar dele e sem distorcer", () => {
    const limite = limiteDePixels({ ios: true });
    const { largura, altura, reduzida } = dimensoesDeTrabalho({ largura: 8064, altura: 6048 }, limite);
    expect(reduzida).toBe(true);
    expect(largura * altura).toBeLessThanOrEqual(LIMITE_DE_PIXELS_IOS);
    expect(largura / altura).toBeCloseTo(8064 / 6048, 2);
    expect(dimensoesDeTrabalho({ largura: 4096, altura: 4096 }, limite).reduzida).toBe(false);
  });

  it("não passa do limite em proporção extrema, onde o arredondamento pesa", () => {
    const { largura, altura } = dimensoesDeTrabalho({ largura: 400_000, altura: 999 });
    expect(largura * altura).toBeLessThanOrEqual(LIMITE_DE_PIXELS_PADRAO);
    expect(altura).toBeGreaterThanOrEqual(1);
  });

  it("recusa dimensão zero", () => {
    expect(() => dimensoesDeTrabalho({ largura: 0, altura: 10 })).toThrow(RangeError);
  });
});

describe("ampliarAlfa", () => {
  it("mantém um alfa constante em qualquer escala", () => {
    const resultado = ampliarAlfa(new Uint8Array(4).fill(200), { largura: 2, altura: 2 }, { largura: 7, altura: 5 });
    expect(Array.from(resultado).every((v) => v === 200)).toBe(true);
  });

  it("interpola no meio e mantém os extremos", () => {
    const resultado = ampliarAlfa([0, 255], { largura: 2, altura: 1 }, { largura: 4, altura: 1 });
    expect(Array.from(resultado)).toEqual([0, 64, 191, 255]);
  });

  it("é identidade no mesmo tamanho", () => {
    const origem = Uint8Array.from({ length: 12 }, (_, i) => i * 20);
    expect(Array.from(ampliarAlfa(origem, { largura: 4, altura: 3 }, { largura: 4, altura: 3 }))).toEqual(Array.from(origem));
  });
});

describe("dimensoesDaPrevia", () => {
  it("reduz a foto grande para o lado de 2560 e deixa a pequena como está", () => {
    expect(dimensoesDaPrevia({ largura: 4000, altura: 5333 })).toEqual({ largura: 1920, altura: 2560 });
    expect(dimensoesDaPrevia({ largura: 2000, altura: 1333 })).toEqual({ largura: 2000, altura: 1333 });
  });
});

describe("dimensoesDeEnvio", () => {
  it("manda a imagem como está quando cabe", () => {
    expect(dimensoesDeEnvio({ largura: 1600, altura: 1064 })).toEqual({ largura: 1600, altura: 1064 });
  });

  it("reduz a foto de 12 MP ao lado maior de 2048 sem distorcer", () => {
    const { largura, altura } = dimensoesDeEnvio({ largura: 4000, altura: 3000 });
    expect(largura).toBe(2048);
    expect(altura).toBe(1536);
  });

  it("vale para retrato também", () => {
    expect(dimensoesDeEnvio({ largura: 3000, altura: 4000 })).toEqual({ largura: 1536, altura: 2048 });
  });
});

describe("interpretarFalha", () => {
  it("cota esgotada cai no modo leve com aviso", () => {
    const falha = interpretarFalha(503, "cota");
    expect(falha.modoLeve).toBe(true);
  });

  it("sem rede, fora do ar ou origem de preview também cai no modo leve", () => {
    expect(interpretarFalha(null, null).modoLeve).toBe(true);
    expect(interpretarFalha(503, "indisponivel").modoLeve).toBe(true);
    expect(interpretarFalha(403, "origem").modoLeve).toBe(true);
    expect(interpretarFalha(502, null).modoLeve).toBe(true);
  });

  it("cotas diárias caem no modo leve, cada uma com o seu aviso", () => {
    const doDia = interpretarFalha(503, "cota-diaria");
    const doIp = interpretarFalha(429, "limite-ip-dia");
    expect(doDia).toEqual({ modoLeve: true, codigo: "cota-do-dia" });
    expect(doIp).toEqual({ modoLeve: true, codigo: "limite-do-ip" });
  });

  it("desligado no interruptor cai no modo leve como fora do ar", () => {
    expect(interpretarFalha(503, "pausado").modoLeve).toBe(true);
  });

  it("limite de rajada por IP não cai no modo leve: diz para esperar", () => {
    expect(interpretarFalha(429, "limite")).toEqual({ modoLeve: false, codigo: "ritmo" });
    expect(interpretarFalha(429, null).modoLeve).toBe(false);
  });

  it("imagem ilegível não cai no modo leve: o problema é o arquivo", () => {
    expect(interpretarFalha(400, "imagem").modoLeve).toBe(false);
    expect(interpretarFalha(415, "formato").modoLeve).toBe(false);
    expect(interpretarFalha(413, "tamanho").modoLeve).toBe(false);
  });
});

describe("dimensoesDoModnet", () => {
  it("leva o lado menor a 512 e os dois lados a múltiplos de 32", () => {
    expect(dimensoesDoModnet({ largura: 1000, altura: 667 })).toEqual({ largura: 768, altura: 512 });
    expect(dimensoesDoModnet({ largura: 987, altura: 1481 })).toEqual({ largura: 512, altura: 768 });
  });

  it("amplia foto pequena até o lado menor de 512", () => {
    expect(dimensoesDoModnet({ largura: 300, altura: 200 })).toEqual({ largura: 768, altura: 512 });
  });

  it("nunca devolve lado abaixo de 32, nem em proporção extrema", () => {
    const { largura, altura } = dimensoesDoModnet({ largura: 20, altura: 4000 });
    expect(largura % 32).toBe(0);
    expect(altura % 32).toBe(0);
    expect(largura).toBeGreaterThanOrEqual(32);
  });
});

describe("rgbaParaTensor", () => {
  // Imagem 2 × 2: vermelho, verde, azul, branco. O alfa é ignorado.
  const rgba = [255, 0, 0, 255, 0, 255, 0, 0, 0, 0, 255, 128, 255, 255, 255, 255];
  const dois = { largura: 2, altura: 2 };

  it("separa os canais em planos e normaliza como no treino do U²-Net", () => {
    const tensor = rgbaParaTensor(rgba, dois, NORMALIZACAO_U2NETP);
    expect(tensor).toHaveLength(12);
    expect(tensor[0]).toBeCloseTo((1 - 0.485) / 0.229, 5);
    expect(tensor[1]).toBeCloseTo((0 - 0.485) / 0.229, 5);
    expect(tensor[4 + 1]).toBeCloseTo((1 - 0.456) / 0.224, 5);
    expect(tensor[8 + 2]).toBeCloseTo((1 - 0.406) / 0.225, 5);
  });

  it("leva tudo para -1 a 1 na normalização do MODNet", () => {
    const tensor = rgbaParaTensor(rgba, dois, NORMALIZACAO_MODNET);
    expect(tensor[0]).toBe(1);
    expect(tensor[1]).toBe(-1);
  });

  it("aceita imagem retangular, que é o caso do MODNet", () => {
    expect(rgbaParaTensor(new Uint8ClampedArray(3 * 2 * 4), { largura: 3, altura: 2 }, NORMALIZACAO_MODNET)).toHaveLength(18);
  });

  it("recusa buffer de tamanho errado em vez de ler lixo", () => {
    expect(() => rgbaParaTensor(new Uint8ClampedArray(15), dois, NORMALIZACAO_U2NETP)).toThrow(RangeError);
    expect(() => rgbaParaTensor(new Uint8ClampedArray(16), dois, NORMALIZACAO_U2NETP, new Float32Array(8))).toThrow(RangeError);
  });
});

describe("esticarSaida", () => {
  it("estica a saída que não encosta em 0 e 1", () => {
    expect(Array.from(esticarSaida([0.1, 0.5, 0.9]))).toEqual([0, 0.5, 1]);
  });

  it("não inventa objeto numa imagem sem nada: amplitude pequena é usada como veio", () => {
    expect(Math.max(...esticarSaida([0.02, 0.05, 0.08]))).toBeCloseTo(0.08, 5);
  });

  it("não corta a faixa de pouca confiança, onde fica a roupa escura", () => {
    const [, baixa] = esticarSaida([0, 0.1, 1]);
    expect(baixa).toBeCloseTo(0.1, 5);
  });
});

describe("redimensionarPlano", () => {
  it("preserva um plano constante em qualquer escala", () => {
    const resultado = redimensionarPlano(new Float32Array(4).fill(0.7), { largura: 2, altura: 2 }, { largura: 5, altura: 3 });
    for (const v of resultado) expect(v).toBeCloseTo(0.7, 5);
  });

  it("interpola no meio e mantém os cantos", () => {
    const resultado = redimensionarPlano([0, 1], { largura: 2, altura: 1 }, { largura: 4, altura: 1 });
    expect(resultado[0]).toBe(0);
    expect(resultado[3]).toBe(1);
    expect(resultado[1]).toBeCloseTo(0.25, 5);
    expect(resultado[2]).toBeCloseTo(0.75, 5);
  });

  it("recusa plano que não bate com as dimensões", () => {
    expect(() => redimensionarPlano([1, 2, 3], { largura: 2, altura: 2 }, { largura: 1, altura: 1 })).toThrow(RangeError);
  });
});

describe("concordancia e ehPessoa", () => {
  it("é 1 para a mesma forma e 0 para formas disjuntas", () => {
    expect(concordancia([1, 1, 0, 0], [1, 1, 0, 0])).toBe(1);
    expect(concordancia([1, 0, 0, 0], [0, 0, 0, 1])).toBe(0);
  });

  it("é interseção sobre união", () => {
    expect(concordancia([1, 1, 1, 0], [0, 1, 1, 1])).toBeCloseTo(0.5, 5);
  });

  it("não divide por zero quando nenhuma máscara marca nada", () => {
    expect(concordancia([0, 0], [0, 0])).toBe(0);
  });

  it("separa os casos medidos: pessoas acima de 0,95, relógio em 0,08", () => {
    expect(ehPessoa(0.95)).toBe(true);
    expect(ehPessoa(0.08)).toBe(false);
    expect(ehPessoa(LIMIAR_DE_PESSOA)).toBe(true);
  });
});

describe("mediaEmCaixa", () => {
  it("dá a média da janela, cortada na borda", () => {
    const resultado = mediaEmCaixa([0, 0, 3, 0, 0], { largura: 5, altura: 1 }, 1);
    expect(Array.from(resultado)).toEqual([0, 1, 1, 1, 0]);
  });

  it("não muda um plano constante", () => {
    for (const v of mediaEmCaixa(new Float32Array(12).fill(2), { largura: 4, altura: 3 }, 2)) expect(v).toBeCloseTo(2, 5);
  });
});

describe("restringirAoSujeito", () => {
  const lado = 64;
  const dimensoes = { largura: lado, altura: lado };
  const indice = (x: number, y: number) => y * lado + x;

  // Sujeito: quadrado no centro. Pessoa: o mesmo quadrado mais uma mancha no canto.
  const sujeito = new Float32Array(lado * lado);
  const pessoa = new Float32Array(lado * lado);
  for (let y = 24; y < 40; y++) for (let x = 24; x < 40; x++) sujeito[indice(x, y)] = pessoa[indice(x, y)] = 1;
  pessoa[indice(2, 2)] = 1;
  // Cabelo solto logo fora do sujeito: tem que sobreviver.
  pessoa[indice(41, 30)] = 0.6;

  const resultado = restringirAoSujeito(pessoa, sujeito, dimensoes);

  it("apaga a mancha solta longe do sujeito", () => {
    expect(resultado[indice(2, 2)]).toBe(0);
  });

  it("mantém o sujeito e o detalhe colado nele sem esmaecer", () => {
    expect(resultado[indice(32, 32)]).toBe(1);
    expect(resultado[indice(41, 30)]).toBeCloseTo(0.6, 5);
  });
});

describe("hexDoDigest", () => {
  it("formata com dois dígitos por byte, inclusive os menores que 16", () => {
    expect(hexDoDigest(new Uint8Array([0, 15, 16, 255]).buffer)).toBe("000f10ff");
  });
});

describe("nomeDoRecorte", () => {
  it("troca a extensão pelo sufixo em PNG", () => {
    expect(nomeDoRecorte("retrato.jpg")).toBe("retrato-sem-fundo.png");
  });

  it("tira só a última extensão", () => {
    expect(nomeDoRecorte("produto.final.v2.WEBP")).toBe("produto.final.v2-sem-fundo.png");
  });

  it("limpa o que o sistema de arquivos recusa", () => {
    expect(nomeDoRecorte('a/b:c*"d".png')).toBe("a-b-c-d-sem-fundo.png");
  });

  it("dá um nome quando não sobra nada", () => {
    expect(nomeDoRecorte(".png")).toBe("imagem-sem-fundo.png");
    expect(nomeDoRecorte("")).toBe("imagem-sem-fundo.png");
  });
});

describe("formatação", () => {
  it("megabytes com vírgula e casa só abaixo de 10", () => {
    expect(formatarMegabytes(5.5 * 1024 * 1024)).toBe("5,5 MB");
    expect(formatarMegabytes(114.5 * 1024 * 1024)).toBe("115 MB");
  });

  it("duração em ms abaixo de um segundo e em s acima", () => {
    expect(formatarDuracao(840.4)).toBe("840 ms");
    expect(formatarDuracao(2400)).toBe("2,4 s");
  });
});
