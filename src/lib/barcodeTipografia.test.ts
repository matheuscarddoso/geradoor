/**
 * A tipografia do número legível, verificada no PDF que sai.
 *
 * O que importa aqui não é a escolha aparecer no painel, e sim o arquivo da
 * fonte chegar embutido no documento e o número cair no lugar exato — porque é
 * esse número que o operador confere na folha impressa, ao lado das barras.
 *
 * O `fetch` do navegador não existe no Node, então é servido do próprio
 * `public/`: são os mesmos bytes que o navegador baixaria.
 */
import { readFileSync } from "node:fs";
import { inflateSync, unzlibSync } from "fflate";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { gerarAmostra } from "@/lib/barcodePdf";
import { FONTES, metricaDe, type PesoDaFonte } from "@/lib/fontes";
import {
  ARTE_PADRAO,
  PT_POR_MM,
  novoId,
  type AlinhamentoDoTexto,
  type Layout,
} from "@/lib/barcodeLayout";

beforeAll(() => {
  globalThis.fetch = (async (caminho: string) =>
    new Response(readFileSync(`public${caminho}`))) as typeof fetch;
});

const PAGINA = { largura: 120, altura: 60 };
const CODIGO = { x: 10, y: 20, comprimento: 45, altura: 14 };

function folha(campos: {
  fonte: string;
  peso: PesoDaFonte;
  entreletras?: number;
  alinhamento?: AlinhamentoDoTexto;
  corpo?: number;
}): Layout {
  return {
    versao: 2,
    pagina: PAGINA,
    digitos: 6,
    arte: ARTE_PADRAO,
    codigos: [
      {
        id: novoId(),
        ...CODIGO,
        rotacao: 0,
        texto: true,
        textoDigitos: 6,
        textoTamanho: campos.corpo ?? 8,
        textoEspaco: 0.8,
        textoAcima: false,
        textoFonte: campos.fonte,
        textoPeso: campos.peso,
        textoEntreletras: campos.entreletras ?? 0,
        textoAlinhamento: campos.alinhamento ?? "centro",
      },
    ],
  };
}

const bytes = async (layout: Layout) =>
  new Uint8Array(await (await gerarAmostra(layout, 4501, null)).arrayBuffer());

/** Um bloco de texto do fluxo da página, já em pontos. */
interface Escrita {
  fonte: string;
  corpo: number;
  entreletras: number;
  x: number;
  y: number;
}

/**
 * Lê as escritas do fluxo da página e resolve o apelido `/F12` no nome real da
 * fonte, que é o que diz qual arquivo foi de fato usado.
 */
function escritas(pdf: Uint8Array): Escrita[] {
  const texto = new TextDecoder("latin1").decode(pdf);

  // O apelido `/F15` só existe no dicionário de recursos da página, que aponta
  // para o objeto da fonte; o nome real está lá dentro, no `/BaseFont`.
  // Um objeto por vez: procurar o `/BaseFont` a partir do `N 0 obj` sem essa
  // fronteira atravessa o `endobj` e casa o nome do objeto seguinte.
  const porObjeto = new Map<string, string>();
  for (const objeto of texto.split("endobj")) {
    const numero = /(\d+)\s+0\s+obj/.exec(objeto);
    const nome = /\/BaseFont\s*\/([^\s/>]+)/.exec(objeto);
    if (numero && nome) porObjeto.set(numero[1]!, nome[1]!);
  }

  const nomes = new Map<string, string>();
  for (const recursos of texto.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) {
    for (const m of recursos[1]!.matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      const nome = porObjeto.get(m[2]!);
      if (nome) nomes.set(m[1]!, nome);
    }
  }

  let cursor = 0;
  for (;;) {
    const abre = texto.indexOf("stream", cursor);
    if (abre < 0) break;
    const fecha = texto.indexOf("endstream", abre);
    if (fecha < 0) break;
    cursor = fecha + 1;

    let inicio = abre + "stream".length;
    if (texto[inicio] === "\r") inicio++;
    if (texto[inicio] === "\n") inicio++;

    let bruto: Uint8Array;
    try {
      const cru = pdf.subarray(inicio, fecha);
      try {
        bruto = unzlibSync(cru);
      } catch {
        bruto = inflateSync(cru);
      }
    } catch {
      continue;
    }

    const conteudo = new TextDecoder("latin1").decode(bruto);
    if (!/\d\s+re\s/.test(conteudo)) continue;

    const lidas: Escrita[] = [];
    for (const bloco of conteudo.matchAll(/BT([\s\S]*?)ET/g)) {
      const corpo = /\/(F\d+)\s+([\d.]+)\s+Tf/.exec(bloco[1]!);
      const tc = /(-?[\d.]+)\s+Tc/.exec(bloco[1]!);
      const td = /(-?[\d.]+)\s+(-?[\d.]+)\s+Td/.exec(bloco[1]!);
      if (!corpo || !td) continue;
      lidas.push({
        fonte: nomes.get(corpo[1]!) ?? corpo[1]!,
        corpo: Number(corpo[2]),
        entreletras: tc ? Number(tc[1]) : 0,
        x: Number(td[1]),
        y: Number(td[2]),
      });
    }
    return lidas;
  }
  throw new Error("não achei o fluxo de conteúdo da página");
}

describe("a fonte escolhida vai embutida no PDF", () => {
  for (const fonte of FONTES) {
    for (const peso of [400, 700] as const) {
      it(`${fonte.nome} ${peso}`, async () => {
        const pdf = await bytes(folha({ fonte: fonte.id, peso }));
        const texto = new TextDecoder("latin1").decode(pdf);
        const chave = `${fonte.id}-${peso}`;

        // O nome tem de estar no documento e o arquivo junto: sem o FontFile2
        // o leitor de PDF substitui por outra fonte e a largura muda.
        expect(texto).toContain(`/BaseFont /${chave}`);
        expect(texto).toContain("/FontFile2");

        const escrita = escritas(pdf).find((e) => e.fonte === chave);
        expect(escrita, "o número foi escrito na fonte escolhida").toBeDefined();
      });
    }
  }

  it("cai na Helvetica quando o arquivo não carrega, em vez de não gerar", async () => {
    // Módulo novo de propósito: o carregador guarda a busca de cada arquivo por
    // sessão, e os casos acima já encheram esse cache. Sem zerar, o 404 nunca
    // chegaria a acontecer e o teste passaria sem testar nada.
    vi.resetModules();
    const original = globalThis.fetch;
    globalThis.fetch = (async () => new Response(null, { status: 404 })) as typeof fetch;
    try {
      const modulo = await import("@/lib/barcodePdf");
      const blob = await modulo.gerarAmostra(folha({ fonte: "inter", peso: 400 }), 4501, null);
      const pdf = new Uint8Array(await blob.arrayBuffer());
      // Uma tiragem no meio de um turno de impressão não pode parar porque a
      // rede caiu: sai no desenho de reserva, mas sai.
      expect(escritas(pdf).some((e) => e.fonte === "Helvetica")).toBe(true);
    } finally {
      globalThis.fetch = original;
      vi.resetModules();
    }
  });
});

describe("o número cai no lugar exato", () => {
  /** Largura do texto pela métrica da fonte, em milímetros. */
  const larguraMm = (fonte: string, peso: PesoDaFonte, corpo: number, entre: number) => {
    const em = corpo / PT_POR_MM;
    return 6 * metricaDe(fonte, peso).avanco * em + 5 * entre * em;
  };

  const doCodigo = (pdf: Uint8Array, chave: string) => {
    const escrita = escritas(pdf).find((e) => e.fonte === chave);
    if (!escrita) throw new Error(`não achei escrita em ${chave}`);
    return escrita;
  };

  for (const alinhamento of ["esquerda", "centro", "direita"] as const) {
    it(`alinhado à ${alinhamento}`, async () => {
      const pdf = await bytes(folha({ fonte: "inter", peso: 400, alinhamento }));
      const escrita = doCodigo(pdf, "inter-400");
      const largura = larguraMm("inter", 400, 8, 0);
      const esperado =
        CODIGO.x +
        (alinhamento === "esquerda"
          ? 0
          : alinhamento === "direita"
            ? CODIGO.comprimento - largura
            : (CODIGO.comprimento - largura) / 2);

      expect(escrita.x / PT_POR_MM).toBeCloseTo(esperado, 3);
    });
  }

  it("o entreletras chega ao fluxo e vale por em, não por milímetro", async () => {
    // Em ems o espaçamento acompanha o corpo, que é como se pensa espaçamento
    // de tipo: dobrar o corpo dobra o espaço, e o desenho não se desfaz.
    const pdf = await bytes(folha({ fonte: "geistmono", peso: 400, entreletras: 0.1, corpo: 10 }));
    const escrita = doCodigo(pdf, "geistmono-400");

    expect(escrita.entreletras).toBeCloseTo(0.1 * 10, 3);
  });

  it("o entreletras alarga o texto e empurra o começo para a esquerda", async () => {
    const semEspaco = doCodigo(await bytes(folha({ fonte: "geistmono", peso: 400 })), "geistmono-400");
    const comEspaco = doCodigo(
      await bytes(folha({ fonte: "geistmono", peso: 400, entreletras: 0.2 })),
      "geistmono-400"
    );

    // Centrado, o texto mais largo começa antes — por metade do que cresceu.
    const cresceu = larguraMm("geistmono", 400, 8, 0.2) - larguraMm("geistmono", 400, 8, 0);
    expect((semEspaco.x - comEspaco.x) / PT_POR_MM).toBeCloseTo(cresceu / 2, 3);
  });

  it("a linha de base respeita a altura do dígito de cada fonte", async () => {
    // A Courier Prime tem dígito bem mais baixo que a Inter. Se a subida
    // viesse de um número fixo, o topo do número encostaria nas barras numa
    // fonte e ficaria solto na outra.
    for (const fonte of ["courierprime", "inter"] as const) {
      const pdf = await bytes(folha({ fonte, peso: 400 }));
      const escrita = doCodigo(pdf, `${fonte}-400`);
      const subida = (8 / PT_POR_MM) * metricaDe(fonte, 400).alturaDoDigito;
      const esperadoDoTopo = CODIGO.y + CODIGO.altura + 0.8 + subida;

      expect(PAGINA.altura - escrita.y / PT_POR_MM).toBeCloseTo(esperadoDoTopo, 3);
    }
  });

  it("não vaza o entreletras de um código para o seguinte", async () => {
    // Numa fonte que a régua de calibração da amostra não usa, para as duas
    // escritas lidas serem só as dos códigos.
    const base = folha({ fonte: "inter", peso: 400, entreletras: 0.3 });
    const layout: Layout = {
      ...base,
      codigos: [
        base.codigos[0]!,
        { ...base.codigos[0]!, id: novoId(), y: 40, textoEntreletras: 0 },
      ],
    };
    const lidas = escritas(await bytes(layout)).filter((e) => e.fonte === "inter-400");

    expect(lidas).toHaveLength(2);
    expect(lidas[1]!.entreletras).toBe(0);
  });
});
