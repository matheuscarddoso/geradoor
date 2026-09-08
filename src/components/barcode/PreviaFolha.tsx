"use client";

import { memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { barrasNormalizadas, codificarCode128 } from "@/lib/code128";
import { familiaCss, metricaDe } from "@/lib/fontes";
import {
  girarPonto,
  PT_POR_MM,
  caixaEnvolvente,
  centroDoCodigo,
  ehAnguloReto,
  normalizarAngulo,
  textoDoCodigo,
  type Codigo,
  type Layout,
  type Ponto,
} from "@/lib/barcodeLayout";
import {
  ALCAS,
  anguloDoPonteiro,
  cursorDaAlca,
  girarCodigo,
  moverCodigo,
  redimensionarCodigo,
  travarMedida,
  type Alca,
} from "@/lib/barcodeGestos";
import {
  calcularAlinhamento,
  detectarEspacamento,
  interseccionam,
  uniaoDeCaixas,
  type Caixa,
  type Espacamento,
  type Guia,
} from "@/lib/barcodeGuias";
import type { Arte } from "@/lib/barcodeStore";
import { focoEmCampo } from "@/lib/atalhos";
import { formatarNaUnidade, medidaEmTexto, type Unidade } from "@/lib/unidades";

/**
 * A única cor saturada do editor.
 *
 * A paleta do site é neutra de ponta a ponta; a seleção é a exceção porque
 * precisa se distinguir das barras pretas sobre papel branco, onde nenhum
 * cinza tem contraste suficiente para ler como estado, e não como conteúdo.
 */
/**
 * O azul de seleção do Figma.
 *
 * Não é escolha estética: quem vai usar isto já opera Figma há anos, e a
 * seleção é o sinal mais repetido de um editor. Manter a mesma cor, as mesmas
 * quatro alças de canto e o mesmo selo de medida é o que faz a ferramenta não
 * precisar ser aprendida de novo.
 */
const COR_SELECAO = "#0d99ff";

/** Medidas do cromo de seleção, em pixels de tela — constantes em qualquer zoom. */
const ALCA_PX = 7;
/** Lado da área que gira, logo fora de cada canto. */
const ZONA_ROTACAO_PX = 14;
/** Espessura da faixa que redimensiona ao longo de cada aresta. */
const ZONA_ARESTA_PX = 8;
const CORPO_ROTULO_PX = 11;

/**
 * Cursor de rotação, desenhado à mão porque o CSS não tem um.
 *
 * Traço branco por fora e preto por dentro para o cursor ser visível tanto
 * sobre o papel branco quanto sobre as barras. O Figma usa exatamente esta
 * gramática, e é o que sinaliza "aqui gira" sem precisar de alça visível.
 */
/** As quatro alças visíveis. */
const CANTOS = ALCAS.filter((a) => a.sx !== 0 && a.sy !== 0);
/** As quatro faixas invisíveis, uma por aresta. */
const ARESTAS = ALCAS.filter((a) => a.sx === 0 || a.sy === 0);

const CURSOR_ROTACAO =
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E` +
  `%3Cg fill='none' stroke='%23fff' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E` +
  `%3Cpath d='M12 5.5a6.5 6.5 0 1 1-6.5 6.5'/%3E%3Cpath d='M8.5 8.5 12 5.5 15 9'/%3E%3C/g%3E` +
  `%3Cg fill='none' stroke='%23000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E` +
  `%3Cpath d='M12 5.5a6.5 6.5 0 1 1-6.5 6.5'/%3E%3Cpath d='M8.5 8.5 12 5.5 15 9'/%3E%3C/g%3E` +
  `%3C/svg%3E") 12 12, crosshair`;

/**
 * A que distância, em pixels de tela, o código gruda numa guia.
 *
 * Em pixel e não em milímetro porque "perto" é o que a pessoa vê: a mesma
 * distância física vale um milímetro no zoom baixo e um décimo no alto.
 */
const IMA_PX = 6;

/** Cor das guias. Página e vizinho se distinguem: uma é fixa, a outra não. */
const COR_GUIA_CODIGO = "#f43f5e";
const COR_GUIA_PAGINA = "#8b5cf6";

/** Só existe para o caso impossível de um gesto de mover sem código algum. */
const conjuntoVazio: Caixa = { x: 0, y: 0, largura: 0, altura: 0 };

/** Retângulo entre dois pontos, em qualquer ordem de arrasto. */
function retanguloEntre(a: Ponto, b: Ponto): Caixa {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    largura: Math.abs(a.x - b.x),
    altura: Math.abs(a.y - b.y),
  };
}

/**
 * Ferramenta ativa. Cada uma se apropria do arrasto de um jeito diferente, e é
 * por isso que são modos e não modificadores: o mesmo gesto no papel vazio
 * seleciona por área, arrasta a vista ou traça uma medida.
 */
export type ModoDaFolha = "mover" | "mao" | "escala" | "medir";

const COR_MEDIDA = "#0ea5e9";

/**
 * A medida traçada no papel, com a distância escrita na unidade escolhida.
 *
 * Mostra também as componentes horizontal e vertical quando a linha está
 * torta: numa folha de formulário quase toda medida que interessa é de um eixo
 * só, e ver dx e dy separados é o que confirma que a linha está reta.
 */
function Medida({
  medida,
  unidade,
  escala,
}: {
  medida: { inicio: Ponto; fim: Ponto };
  unidade: Unidade;
  escala: number;
}) {
  const dx = medida.fim.x - medida.inicio.x;
  const dy = medida.fim.y - medida.inicio.y;
  const distancia = Math.hypot(dx, dy);
  if (distancia < 0.2) return null;

  const meio = {
    x: (medida.inicio.x + medida.fim.x) / 2,
    y: (medida.inicio.y + medida.fim.y) / 2,
  };
  // O rótulo é desenhado em milímetros mas tem que sair do mesmo tamanho em
  // qualquer zoom, daí dividir pela escala.
  const corpo = 11 / escala;
  const torta = Math.abs(dx) > 0.2 && Math.abs(dy) > 0.2;
  const rotulo = torta
    ? `${medidaEmTexto(distancia, unidade)}  ·  ${formatarNaUnidade(Math.abs(dx), unidade)} × ${formatarNaUnidade(Math.abs(dy), unidade)}`
    : medidaEmTexto(distancia, unidade);
  const tique = 3 / escala;
  const perpendicular = { x: (-dy / distancia) * tique, y: (dx / distancia) * tique };

  return (
    <g pointerEvents="none">
      <line
        x1={medida.inicio.x}
        y1={medida.inicio.y}
        x2={medida.fim.x}
        y2={medida.fim.y}
        stroke={COR_MEDIDA}
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {[medida.inicio, medida.fim].map((ponta, indice) => (
        <line
          key={indice}
          x1={ponta.x - perpendicular.x}
          y1={ponta.y - perpendicular.y}
          x2={ponta.x + perpendicular.x}
          y2={ponta.y + perpendicular.y}
          stroke={COR_MEDIDA}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <text
        x={meio.x}
        y={meio.y - corpo * 0.5}
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize={corpo}
        fill={COR_MEDIDA}
        stroke="#fff"
        strokeWidth={corpo * 0.28}
        paintOrder="stroke"
      >
        {rotulo}
      </text>
    </g>
  );
}

interface Props {
  layout: Layout;
  /**
   * Cursor manipula; medir só mede.
   *
   * São modos, e não um botão de ligar régua, porque as duas coisas disputam o
   * mesmo gesto: arrastar no papel vazio seleciona por área no cursor e traça
   * uma medida no medir. Sem separar, uma das duas teria que virar um
   * modificador escondido.
   */
  modo: ModoDaFolha;
  arte: Arte | null;
  /** Número desenhado na prévia. */
  valor: string;
  selecionados: readonly string[];
  /** Substitui a seleção inteira. */
  aoSelecionar: (ids: string[]) => void;
  /**
   * Recebe as medidas alteradas pelo gesto, de um código ou de vários.
   *
   * É em lote porque mover uma seleção de doze etiquetas tem que ser uma
   * mudança de estado, e uma entrada de histórico — não doze.
   */
  aoAlterar: (mudancas: ReadonlyArray<{ id: string; mudanca: Partial<Codigo> }>) => void;
  /** Avisa que um gesto começou, para o histórico tratá-lo como uma unidade. */
  aoIniciarGesto: () => void;
  /**
   * Alt ao começar a arrastar: duplica antes de mover, como no Figma.
   *
   * Devolve os ids das cópias, que passam a ser o que o gesto arrasta — o
   * original fica onde estava. É o caminho mais rápido para a segunda fileira
   * de etiquetas.
   */
  aoDuplicarArrastando: (ids: readonly string[]) => string[];
  /** Avisa que o gesto terminou. */
  aoTerminarGesto: () => void;
  /**
   * Aborta o gesto em curso quando muda.
   *
   * Vem de fora porque quem decide cancelar é o teclado, que mora no cliente
   * junto com o resto dos atalhos. Um sinal declarativo evita depender da
   * ordem em que dois listeners de `window` são chamados, que é o tipo de
   * fragilidade que aparece só às vezes.
   */
  abortarGesto: number;
  /** Pixels de tela por milímetro de papel. */
  escala: number;
  /** Unidade em que a medida é escrita. */
  unidade: Unidade;
  /**
   * Punho para a mesa em volta da folha começar os mesmos gestos.
   *
   * Quem recebe o ponteiro fora do papel é o contêiner que rola, que mora no
   * editor; a lógica do gesto é toda daqui. Sem isto, o de fora precisaria de
   * uma segunda marquise, que divergiria desta.
   */
  superficie?: React.Ref<SuperficieDaFolha>;
}

/** O que a mesa em volta da folha chama para começar e conduzir um gesto. */
export interface SuperficieDaFolha {
  apontar: (evento: React.PointerEvent) => void;
  seguir: (evento: React.PointerEvent) => void;
  terminar: () => void;
}

type Gesto =
  | { tipo: "mover"; iniciais: readonly Codigo[]; ponteiroInicial: Ponto }
  | { tipo: "redimensionar"; inicial: Codigo; alca: Alca }
  | { tipo: "girar"; inicial: Codigo; anguloInicial: number }
  | { tipo: "medir"; inicio: Ponto; fim: Ponto }
  | {
      tipo: "marquise";
      inicio: Ponto;
      atual: Ponto;
      /** Seleção de antes do gesto, para o Shift somar em vez de trocar. */
      anterior: readonly string[];
      somar: boolean;
    };

/**
 * A folha, em tamanho de tela, com manipulação direta.
 *
 * Desenha em SVG com o `viewBox` em milímetros — as mesmas coordenadas que vão
 * para o PDF. Não é economia de código: é o que garante que arrastar a caixa
 * dois milímetros aqui mova dois milímetros no papel. Qualquer conversão
 * intermediária para pixel abriria espaço para a prévia e o impresso
 * divergirem, que é o erro caro numa gráfica.
 *
 * Cada código é desenhado no referencial dele, não girado, e o `<g>` em volta
 * aplica a rotação. Barras, texto, contorno e alças herdam o giro de graça, e
 * a conta de cada peça fica idêntica à do PDF.
 */
function PreviaFolhaBase({
  layout,
  modo,
  arte,
  valor,
  selecionados,
  aoSelecionar,
  aoAlterar,
  aoIniciarGesto,
  aoDuplicarArrastando,
  aoTerminarGesto,
  abortarGesto,
  escala,
  unidade,
  superficie,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gesto = useRef<Gesto | null>(null);
  const [gestoAtivo, setGestoAtivo] = useState<Gesto["tipo"] | null>(null);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [marquise, setMarquise] = useState<Caixa | null>(null);
  /** Medida no papel, mantida na tela até a próxima ou a troca de modo. */
  const [medida, setMedida] = useState<{ inicio: Ponto; fim: Ponto } | null>(null);
  const [espacamentos, setEspacamentos] = useState<Espacamento[]>([]);

  const barras = useMemo(() => barrasNormalizadas(codificarCode128(valor)), [valor]);

  // Trocar de modo apaga a medida na tela: ela pertence ao modo de medir, e
  // deixá-la sobrando confundiria com uma guia de alinhamento.
  useEffect(() => {
    if (modo !== "medir") setMedida(null);
  }, [modo]);

  const { largura, altura } = layout.pagina;

  /**
   * Converte a posição do ponteiro em milímetros de papel.
   *
   * Usa a matriz do próprio SVG em vez de dividir pela escala: assim o gesto
   * continua exato com a folha rolada, com zoom do navegador e em tela de
   * densidade dupla, sem o editor precisar saber de nada disso.
   */
  const paraPagina = (evento: React.PointerEvent): Ponto | null => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const ponto = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(ctm.inverse());
    return { x: ponto.x, y: ponto.y };
  };

  const iniciarGesto = (evento: React.PointerEvent, novo: Gesto) => {
    evento.stopPropagation();
    // O `preventDefault` que segura o gesto também bloqueia a troca de foco do
    // navegador. Sem tirar o foco à mão, quem acabou de digitar no painel
    // continua com o cursor no campo, e todo atalho de teclado fica morto até
    // clicar em outra coisa — inclusive o ⌘A e o Delete.
    const focado = document.activeElement as HTMLElement | null;
    if (focoEmCampo(focado)) focado?.blur();
    evento.preventDefault();
    (evento.currentTarget as Element).setPointerCapture(evento.pointerId);
    gesto.current = novo;
    setGestoAtivo(novo.tipo);
    // A marquise não mexe em medida nenhuma: abrir transação de histórico para
    // ela deixaria uma entrada vazia a cada arrasto no papel.
    if (novo.tipo !== "marquise" && novo.tipo !== "medir") aoIniciarGesto();
  };

  /**
   * Decide a seleção a partir de um clique num código.
   *
   * Shift e ⌘/Ctrl alternam a participação, como em qualquer editor. Clicar num
   * código que já faz parte da seleção não a desmancha: é o que permite pegar
   * um grupo de doze e arrastar por qualquer um deles.
   */
  const selecionarPorClique = (evento: React.PointerEvent, id: string): string[] => {
    const alternando = evento.shiftKey || evento.metaKey || evento.ctrlKey;
    if (alternando) {
      return selecionados.includes(id)
        ? selecionados.filter((outro) => outro !== id)
        : [...selecionados, id];
    }
    return selecionados.includes(id) ? [...selecionados] : [id];
  };

  const seguirGesto = (evento: React.PointerEvent) => {
    const atual = gesto.current;
    const ponteiro = paraPagina(evento);
    if (!atual || !ponteiro) return;

    const modificadores = { shift: evento.shiftKey, alt: evento.altKey };
    // Alt já é "redimensionar pelo centro"; usar a mesma tecla para desligar o
    // ímã brigaria com isso. Ctrl é a tecla livre, e é a que o Figma usa.
    const semIma = evento.ctrlKey || evento.metaKey;
    const tolerancia = IMA_PX / escala;

    if (atual.tipo === "medir") {
      const fim = modificadores.shift ? travarMedida(atual.inicio, ponteiro) : ponteiro;
      gesto.current = { ...atual, fim };
      setMedida({ inicio: atual.inicio, fim });
      return;
    }

    if (atual.tipo === "marquise") {
      const somar = atual.somar;
      const area = retanguloEntre(atual.inicio, ponteiro);
      gesto.current = { ...atual, atual: ponteiro };
      setMarquise(area);
      const tocados = layout.codigos
        .filter((codigo) => interseccionam(area, caixaEnvolvente(codigo)))
        .map((codigo) => codigo.id);
      aoSelecionar(
        somar ? [...new Set([...atual.anterior, ...tocados])] : tocados
      );
      return;
    }

    if (atual.tipo === "mover") {
      const primeiro = atual.iniciais[0];
      if (!primeiro) return;
      const bruto = {
        x: ponteiro.x - atual.ponteiroInicial.x,
        y: ponteiro.y - atual.ponteiroInicial.y,
      };
      // O eixo travado pelo Shift vale para o grupo inteiro, então o
      // deslocamento é resolvido uma vez e aplicado igual a todos.
      const referencia = moverCodigo(primeiro, bruto, modificadores);
      let deslocamento = { x: referencia.x - primeiro.x, y: referencia.y - primeiro.y };

      /**
       * Qual eixo o Shift travou.
       *
       * O ímã não pode mexer nele. Sem esta trava o alinhamento arrastava a
       * caixa alguns décimos para fora do eixo — o Shift ficava "meio
       * cravado", que é pior que não ter, porque a mão confia nele.
       */
      const travado: "x" | "y" | null = modificadores.shift
        ? deslocamento.x === 0 && deslocamento.y !== 0
          ? "x"
          : deslocamento.y === 0 && deslocamento.x !== 0
            ? "y"
            : null
        : null;

      if (!semIma) {
        const movidas = atual.iniciais.map((codigo) =>
          caixaEnvolvente({
            ...codigo,
            x: codigo.x + deslocamento.x,
            y: codigo.y + deslocamento.y,
          })
        );
        const conjunto = uniaoDeCaixas(movidas) ?? conjuntoVazio;
        const emMovimento = new Set(atual.iniciais.map((codigo) => codigo.id));
        const alinhamento = calcularAlinhamento(
          conjunto,
          layout.codigos
            .filter((codigo) => !emMovimento.has(codigo.id))
            .map(caixaEnvolvente),
          layout.pagina,
          tolerancia
        );
        // A guia do eixo travado também sai de cena: desenhar uma linha que
        // o gesto não vai seguir promete um alinhamento que não acontece.
        setGuias(travado ? alinhamento.guias.filter((g) => g.eixo !== travado) : alinhamento.guias);
        deslocamento = {
          x: travado === "x" ? deslocamento.x : deslocamento.x + alinhamento.ajuste.x,
          y: travado === "y" ? deslocamento.y : deslocamento.y + alinhamento.ajuste.y,
        };

        // Vão igual só entra onde o ímã de borda não pegou: com os dois
        // ativos no mesmo eixo, um desfaria o outro a cada quadro.
        const vizinhas = layout.codigos
          .filter((codigo) => !emMovimento.has(codigo.id))
          .map(caixaEnvolvente);
        const caixaFinal = uniaoDeCaixas(
          atual.iniciais.map((codigo) =>
            caixaEnvolvente({
              ...codigo,
              x: codigo.x + deslocamento.x,
              y: codigo.y + deslocamento.y,
            })
          )
        );
        const achados: Espacamento[] = [];
        if (caixaFinal) {
          for (const eixo of ["x", "y"] as const) {
            if (eixo === travado) continue;
            if (alinhamento.ajuste[eixo] !== 0) continue;
            const espaco = detectarEspacamento(caixaFinal, vizinhas, eixo, tolerancia);
            if (!espaco) continue;
            achados.push(espaco);
            deslocamento = {
              ...deslocamento,
              [eixo]: deslocamento[eixo] + espaco.ajuste,
            };
          }
        }
        setEspacamentos(achados);
      } else {
        setGuias([]);
        setEspacamentos([]);
      }

      aoAlterar(
        atual.iniciais.map((codigo) => ({
          id: codigo.id,
          mudanca: {
            x: Number((codigo.x + deslocamento.x).toFixed(2)),
            y: Number((codigo.y + deslocamento.y).toFixed(2)),
          },
        }))
      );
      return;
    }

    if (atual.tipo === "redimensionar") {
      // No redimensionamento o ímã age sobre o ponteiro, que é o que a borda
      // arrastada persegue. Só em ângulo reto: girado, a borda não é paralela
      // a guia nenhuma e grudar deixaria de querer dizer alguma coisa.
      let alvo = ponteiro;
      if (!semIma && ehAnguloReto(atual.inicial.rotacao)) {
        const alinhamento = calcularAlinhamento(
          { x: ponteiro.x, y: ponteiro.y, largura: 0, altura: 0 },
          layout.codigos
            .filter((codigo) => codigo.id !== atual.inicial.id)
            .map(caixaEnvolvente),
          layout.pagina,
          tolerancia
        );
        // Só o eixo que a alça de fato move.
        const ajusteX = atual.alca.sx === 0 ? 0 : alinhamento.ajuste.x;
        const ajusteY = atual.alca.sy === 0 ? 0 : alinhamento.ajuste.y;
        alvo = { x: ponteiro.x + ajusteX, y: ponteiro.y + ajusteY };
        setGuias(
          alinhamento.guias.filter((guia) =>
            guia.eixo === "x" ? atual.alca.sx !== 0 : atual.alca.sy !== 0
          )
        );
      } else {
        setGuias([]);
      }
      // A ferramenta Escala trava a proporção e leva o corpo do texto junto,
      // que é o que a distingue do redimensionamento comum: escalar a
      // etiqueta inteira, e não só a caixa das barras.
      const escalando = modo === "escala";
      const medidas = redimensionarCodigo(
        atual.inicial,
        atual.alca,
        alvo,
        escalando ? { ...modificadores, shift: true } : modificadores
      );
      const fator = medidas.comprimento / atual.inicial.comprimento;
      aoAlterar([
        {
          id: atual.inicial.id,
          mudanca: escalando
            ? {
                ...medidas,
                textoTamanho: Number(
                  Math.min(48, Math.max(3, atual.inicial.textoTamanho * fator)).toFixed(1)
                ),
                textoEspaco: Number(
                  Math.min(20, Math.max(0, atual.inicial.textoEspaco * fator)).toFixed(2)
                ),
              }
            : medidas,
        },
      ]);
      return;
    }

    setGuias([]);
    aoAlterar([
      {
        id: atual.inicial.id,
        mudanca: girarCodigo(atual.inicial, atual.anguloInicial, ponteiro, modificadores),
      },
    ]);
  };

  /** Abaixo disso o gesto foi um clique, não um arrasto. */
  const ARRASTO_MINIMO_PX = 3;

  const terminarGesto = () => {
    const atual = gesto.current;
    if (!atual) return;
    if (atual.tipo === "marquise") {
      const percorrido =
        Math.hypot(atual.atual.x - atual.inicio.x, atual.atual.y - atual.inicio.y) * escala;
      // Clique curto no papel vazio: limpa em vez de selecionar uma faixa de
      // meio pixel, que pegaria o que estivesse embaixo do cursor.
      if (percorrido < ARRASTO_MINIMO_PX && !atual.somar) aoSelecionar([]);
    }
    gesto.current = null;
    setGestoAtivo(null);
    setGuias([]);
    setEspacamentos([]);
    setMarquise(null);
    if (atual.tipo !== "marquise" && atual.tipo !== "medir") aoTerminarGesto();
    // A medida fica na tela de propósito: quem mediu quer ler o número, não
    // vê-lo desaparecer junto com o dedo.
  };

  // Cancelamento vindo do teclado: solta o gesto sem fechar a transação do
  // histórico, que o cliente desfaz.
  useEffect(() => {
    gesto.current = null;
    setGestoAtivo(null);
    setGuias([]);
    setEspacamentos([]);
    setMarquise(null);
  }, [abortarGesto]);

  /**
   * Ponteiro no vazio: marquise, ou medida quando a régua está na mão.
   *
   * Serve o papel e serve a mesa em volta dele. No Figma a área de trabalho não
   * termina na borda do quadro: dá para começar a laçada fora e arrastar por
   * cima, e clicar fora tira o foco do que estava selecionado. Como o
   * `paraPagina` usa a matriz do SVG, um ponto fora da folha converte igual —
   * em milímetro negativo ou maior que a página — e nenhuma conta muda.
   */
  const apontarNoVazio = (evento: React.PointerEvent) => {
    const ponteiro = paraPagina(evento);
    if (!ponteiro) return;
    if (modo === "medir") {
      iniciarGesto(evento, { tipo: "medir", inicio: ponteiro, fim: ponteiro });
      return;
    }
    // Na mão, o arrasto pertence ao contêiner que rola a vista.
    if (modo === "mao") return;
    // Arrastar no vazio seleciona por área; um clique sem arrasto limpa a
    // seleção. Quem decide é a distância percorrida, conferida no fim do gesto.
    iniciarGesto(evento, {
      tipo: "marquise",
      inicio: ponteiro,
      atual: ponteiro,
      anterior: [...selecionados],
      somar: evento.shiftKey || evento.metaKey || evento.ctrlKey,
    });
    if (!evento.shiftKey && !evento.metaKey && !evento.ctrlKey) aoSelecionar([]);
  };

  // O contêiner que rola é quem recebe o ponteiro na mesa em volta da folha, e
  // ele mora no editor. Estes três é o que ele precisa chamar para o gesto ser
  // exatamente o mesmo de dentro do papel — nada de uma segunda implementação
  // de marquise que divergiria da primeira na primeira mudança.
  useImperativeHandle(
    superficie,
    () => ({
      apontar: apontarNoVazio,
      seguir: seguirGesto,
      terminar: terminarGesto,
    }),
    // Sem lista: cada render devolve as funções da vez, que leem a seleção e o
    // modo atuais. Guardar as primeiras congelaria a seleção de antes.
  );

  const conjunto = layout.codigos.filter((codigo) => selecionados.includes(codigo.id));
  // Alça de girar e de redimensionar só com um selecionado: escalar um grupo
  // com códigos em ângulos diferentes exigiria cisalhar as barras, e barra
  // cisalhada é código que leitor nenhum lê.
  const codigoSelecionado = conjunto.length === 1 ? conjunto[0]! : null;
  /** Mover e escalar manipulam; mão e medir, não. */
  const manipulando = modo === "mover" || modo === "escala";
  const caixaDoGrupo = conjunto.length > 1 ? uniaoDeCaixas(conjunto.map(caixaEnvolvente)) : null;

  /**
   * Texto legível de um código, no referencial local.
   *
   * Ancorado no começo da linha de base, e não no meio: é assim que o PDF
   * desenha, e o entreletras do SVG sobra depois do último caractere em vez de
   * deslocar o texto. Centrar aqui e ancorar lá daria posições diferentes na
   * tela e no papel.
   */
  const textoLocal = (codigo: Codigo) => {
    const corpo = codigo.textoTamanho / PT_POR_MM;
    const fonte = metricaDe(codigo.textoFonte, codigo.textoPeso);
    const digitos = textoDoCodigo(codigo, valor).length;
    const entreletras = codigo.textoEntreletras * corpo;
    const largura = digitos * fonte.avanco * corpo + Math.max(0, digitos - 1) * entreletras;
    const recuo =
      codigo.textoAlinhamento === "esquerda"
        ? 0
        : codigo.textoAlinhamento === "direita"
          ? codigo.comprimento - largura
          : (codigo.comprimento - largura) / 2;
    return {
      corpo,
      entreletras,
      familia: familiaCss(codigo.textoFonte),
      peso: codigo.textoPeso,
      x: codigo.x + recuo,
      y: codigo.textoAcima
        ? codigo.y - codigo.textoEspaco
        : codigo.y + codigo.altura + codigo.textoEspaco + corpo * fonte.alturaDoDigito,
    };
  };

  const giro = (codigo: Codigo) => {
    const centro = centroDoCodigo(codigo);
    return `rotate(${codigo.rotacao} ${centro.x} ${centro.y})`;
  };

  return (
    <svg
      ref={svgRef}
      width={largura * escala}
      height={altura * escala}
      viewBox={`0 0 ${largura} ${altura}`}
      onPointerDown={apontarNoVazio}
      onPointerMove={seguirGesto}
      onPointerUp={terminarGesto}
      onPointerCancel={terminarGesto}
      className="block shrink-0 touch-none select-none bg-white shadow-[0_1px_2px_rgba(0,0,0,.2),0_12px_32px_-8px_rgba(0,0,0,.35)]"
      style={{
        cursor: modo === "medir" ? "crosshair" : undefined,
        // A laçada e a medida podem começar na mesa em volta da folha, e cortá-las
        // na borda do papel deixaria o operador arrastando um retângulo que ele
        // não vê. O branco da folha continua sendo o fundo do elemento, então a
        // borda da área que imprime continua legível.
        overflow: "visible",
      }}
      role="img"
      aria-label={`Folha de ${largura} por ${altura} milímetros com ${layout.codigos.length} códigos de barras`}
    >
      {arte && layout.arte.visivel && (
        <image
          href={arte.dataUrl}
          x={0}
          y={0}
          width={largura}
          height={altura}
          opacity={layout.arte.opacidade}
          preserveAspectRatio="none"
        />
      )}

      {layout.codigos.map((codigo) => {
        const texto = textoLocal(codigo);
        return (
          <g key={codigo.id} transform={giro(codigo)}>
            {barras.map((barra, indice) => (
              <rect
                key={indice}
                x={codigo.x + barra.inicio * codigo.comprimento}
                y={codigo.y}
                width={barra.largura * codigo.comprimento}
                height={codigo.altura}
                fill="#000"
              />
            ))}

            {codigo.texto && (
              <text
                x={texto.x}
                y={texto.y}
                textAnchor="start"
                fontFamily={texto.familia}
                fontWeight={texto.peso}
                letterSpacing={texto.entreletras}
                fontSize={texto.corpo}
                fill="#000"
              >
                {textoDoCodigo(codigo, valor)}
              </text>
            )}

            {/* Alvo do gesto de mover: cobre a caixa inteira, inclusive os
                espaços brancos entre as barras, que também são o código. */}
            <rect
              x={codigo.x}
              y={codigo.y}
              width={codigo.comprimento}
              height={codigo.altura}
              fill="transparent"
              style={{ cursor: gestoAtivo === "mover" ? "grabbing" : "move" }}
              pointerEvents={manipulando ? undefined : "none"}
              onPointerDown={(evento) => {
                if (!manipulando) return;
                const ponteiro = paraPagina(evento);
                if (!ponteiro) return;
                const proxima = selecionarPorClique(evento, codigo.id);
                // Arrasta tudo que está selecionado, não só o que foi clicado.
                const originais = layout.codigos.filter((outro) => proxima.includes(outro.id));
                if (originais.length === 0) return;

                // Alt duplica e passa a arrastar as cópias, deixando os
                // originais no lugar — o gesto de fazer a segunda fileira.
                if (evento.altKey) {
                  // Abre a transação antes de duplicar para os dois — a cópia
                  // e o arrasto dela — caírem numa entrada só de desfazer. É
                  // um gesto na mão de quem usa, e tem de ser um Cmd+Z.
                  aoIniciarGesto();
                  const copias = aoDuplicarArrastando(originais.map((o) => o.id));
                  if (copias.length > 0) {
                    aoSelecionar(copias);
                    iniciarGesto(evento, {
                      tipo: "mover",
                      iniciais: originais.map((o, i) => ({ ...o, id: copias[i] ?? o.id })),
                      ponteiroInicial: ponteiro,
                    });
                    return;
                  }
                }

                aoSelecionar(proxima);
                iniciarGesto(evento, {
                  tipo: "mover",
                  iniciais: originais,
                  ponteiroInicial: ponteiro,
                });
              }}
              onPointerMove={seguirGesto}
              onPointerUp={terminarGesto}
              onPointerCancel={terminarGesto}
            />
          </g>
        );
      })}

      {/* Contorno de cada selecionado. Com um só, o bloco de alças abaixo
          desenha o contorno grosso; aqui é o que mostra a participação de
          cada peça de um grupo. */}
      {manipulando &&
        conjunto.length > 1 &&
        conjunto.map((codigo) => (
          <g key={`sel-${codigo.id}`} transform={giro(codigo)}>
            <rect
              x={codigo.x}
              y={codigo.y}
              width={codigo.comprimento}
              height={codigo.altura}
              fill="none"
              stroke={COR_SELECAO}
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          </g>
        ))}

      {/* Moldura do grupo, com o selo da medida. Sem alças: escalar um grupo
          com códigos em ângulos diferentes exigiria cisalhar as barras, e
          barra cisalhada é código que leitor nenhum lê. */}
      {manipulando && caixaDoGrupo && (
        <g pointerEvents="none">
          <rect
            x={caixaDoGrupo.x}
            y={caixaDoGrupo.y}
            width={caixaDoGrupo.largura}
            height={caixaDoGrupo.altura}
            fill="none"
            stroke={COR_SELECAO}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
          <SeloDeMedida
            caixa={caixaDoGrupo}
            escala={escala}
            texto={`${formatarNaUnidade(caixaDoGrupo.largura, unidade)} × ${formatarNaUnidade(
              caixaDoGrupo.altura,
              unidade
            )}`}
          />
          <text
            x={caixaDoGrupo.x}
            y={caixaDoGrupo.y - (CORPO_ROTULO_PX / escala) * 0.45}
            fontFamily="var(--font-geist-mono), ui-monospace, monospace"
            fontSize={CORPO_ROTULO_PX / escala}
            fill={COR_SELECAO}
          >
            {conjunto.length} códigos
          </text>
        </g>
      )}

      {/* Vãos iguais: um par de setas por vão, com a medida no meio. É o que
          confirma que a fileira ficou regular sem conferir número por número
          no painel. */}
      {espacamentos.map((espaco, indice) =>
        espaco.marcas.map((marca, j) => (
          <MarcaDeVao
            key={`vao-${indice}-${j}`}
            eixo={espaco.eixo}
            marca={marca}
            vao={espaco.vao}
            unidade={unidade}
            escala={escala}
          />
        ))
      )}

      {/* Guias de alinhamento, desenhadas só durante o gesto. */}
      {guias.map((guia, indice) => (
        <line
          key={`${guia.eixo}-${guia.posicao}-${indice}`}
          x1={guia.eixo === "x" ? guia.posicao : guia.de}
          y1={guia.eixo === "x" ? guia.de : guia.posicao}
          x2={guia.eixo === "x" ? guia.posicao : guia.ate}
          y2={guia.eixo === "x" ? guia.ate : guia.posicao}
          stroke={guia.origem === "pagina" ? COR_GUIA_PAGINA : COR_GUIA_CODIGO}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      ))}

      {medida && <Medida medida={medida} unidade={unidade} escala={escala} />}

      {marquise && (
        <rect
          x={marquise.x}
          y={marquise.y}
          width={marquise.largura}
          height={marquise.altura}
          fill={COR_SELECAO}
          fillOpacity={0.08}
          stroke={COR_SELECAO}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {/* A seleção sai por último para as alças ficarem acima de qualquer
          outro código, independentemente da ordem da lista. */}
      {manipulando && codigoSelecionado && (
        <CromoDeSelecao
          codigo={codigoSelecionado}
          escala={escala}
          unidade={unidade}
          girando={gestoAtivo === "girar"}
          rotulo={`Código ${layout.codigos.indexOf(codigoSelecionado) + 1}`}
          aoRedimensionar={(evento, alca) =>
            iniciarGesto(evento, { tipo: "redimensionar", inicial: codigoSelecionado, alca })
          }
          aoGirar={(evento) => {
            const ponteiro = paraPagina(evento);
            if (!ponteiro) return;
            iniciarGesto(evento, {
              tipo: "girar",
              inicial: codigoSelecionado,
              anguloInicial: anguloDoPonteiro(ponteiro, centroDoCodigo(codigoSelecionado)),
            });
          }}
          aoSeguir={seguirGesto}
          aoTerminar={terminarGesto}
        />
      )}

    </svg>
  );
}


/**
 * Extensão visual de um código: as barras **mais** o número legível, já
 * girada.
 *
 * O contorno e as alças ficam na caixa das barras, que é o que o modelo
 * redimensiona. Mas o nome e o selo de medida têm que sair de fora de tudo o
 * que se vê — senão o selo cai sobre o número impresso, que é exatamente o
 * dado que o operador está conferindo.
 */
function envolventeVisual(codigo: Codigo): Caixa {
  const barras = caixaEnvolvente(codigo);
  if (!codigo.texto) return barras;

  const corpo = codigo.textoTamanho / PT_POR_MM;
  const fonte = metricaDe(codigo.textoFonte, codigo.textoPeso);
  // Sem o valor à mão aqui: a contagem de dígitos do modelo é a largura do
  // texto em qualquer página da tiragem, que é o que a envolvente precisa.
  const digitos = Math.max(1, codigo.textoDigitos || 6);
  const entreletras = codigo.textoEntreletras * corpo;
  const alturaTexto = corpo * fonte.alturaDoDigito;
  const larguraTexto = digitos * corpo * fonte.avanco + Math.max(0, digitos - 1) * entreletras;
  const meioX = codigo.x + codigo.comprimento / 2;
  const topo = codigo.textoAcima
    ? codigo.y - codigo.textoEspaco - alturaTexto
    : codigo.y + codigo.altura + codigo.textoEspaco;

  const centro = centroDoCodigo(codigo);
  const cantos = [
    { x: meioX - larguraTexto / 2, y: topo },
    { x: meioX + larguraTexto / 2, y: topo },
    { x: meioX + larguraTexto / 2, y: topo + alturaTexto },
    { x: meioX - larguraTexto / 2, y: topo + alturaTexto },
  ].map((ponto) => girarPonto(ponto, centro, codigo.rotacao));

  const xs = [barras.x, barras.x + barras.largura, ...cantos.map((c) => c.x)];
  const ys = [barras.y, barras.y + barras.altura, ...cantos.map((c) => c.y)];
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, largura: Math.max(...xs) - x, altura: Math.max(...ys) - y };
}

/**
 * Uma marca de vão igual: a linha entre duas caixas, com a medida escrita.
 */
function MarcaDeVao({
  eixo,
  marca,
  vao,
  unidade,
  escala,
}: {
  eixo: "x" | "y";
  marca: { de: number; ate: number; posicao: number };
  vao: number;
  unidade: Unidade;
  escala: number;
}) {
  const corpo = 10 / escala;
  const tique = 3 / escala;
  const horizontal = eixo === "x";
  const x1 = horizontal ? marca.de : marca.posicao;
  const y1 = horizontal ? marca.posicao : marca.de;
  const x2 = horizontal ? marca.ate : marca.posicao;
  const y2 = horizontal ? marca.posicao : marca.ate;

  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={COR_GUIA_CODIGO} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {[0, 1].map((ponta) => {
        const px = ponta === 0 ? x1 : x2;
        const py = ponta === 0 ? y1 : y2;
        return (
          <line
            key={ponta}
            x1={horizontal ? px : px - tique}
            y1={horizontal ? py - tique : py}
            x2={horizontal ? px : px + tique}
            y2={horizontal ? py + tique : py}
            stroke={COR_GUIA_CODIGO}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <text
        x={horizontal ? (x1 + x2) / 2 : x1 + tique * 1.6}
        y={horizontal ? y1 - tique * 1.3 : (y1 + y2) / 2}
        textAnchor={horizontal ? "middle" : "start"}
        dominantBaseline={horizontal ? "auto" : "middle"}
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize={corpo}
        fill={COR_GUIA_CODIGO}
        stroke="#fff"
        strokeWidth={corpo * 0.3}
        paintOrder="stroke"
      >
        {formatarNaUnidade(vao, unidade)}
      </text>
    </g>
  );
}

/**
 * O selo de medida do Figma: pílula azul, texto branco, sempre horizontal e
 * logo abaixo da caixa — mesmo com o objeto girado, porque número de leitura
 * não se lê de lado.
 */
function SeloDeMedida({
  caixa,
  escala,
  texto,
}: {
  caixa: { x: number; y: number; largura: number; altura: number };
  escala: number;
  texto: string;
}) {
  const corpo = CORPO_ROTULO_PX / escala;
  // O SVG não mede texto fora do DOM; meio caractere de erro aqui só folga a
  // pílula, que é o lado inofensivo.
  const largura = texto.length * corpo * 0.58 + corpo * 0.9;
  return (
    <g pointerEvents="none">
      <rect
        x={caixa.x + caixa.largura / 2 - largura / 2}
        y={caixa.y + caixa.altura + corpo * 0.5}
        width={largura}
        height={corpo * 1.7}
        rx={corpo * 0.35}
        fill={COR_SELECAO}
      />
      <text
        x={caixa.x + caixa.largura / 2}
        y={caixa.y + caixa.altura + corpo * 1.68}
        textAnchor="middle"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize={corpo}
        fill="#fff"
      >
        {texto}
      </text>
    </g>
  );
}

/**
 * O cromo de seleção, no desenho do Figma.
 *
 * Quatro alças visíveis, nos cantos. As arestas também redimensionam, mas por
 * faixas invisíveis ao longo da borda — é assim no Figma, e é o que deixa a
 * seleção limpa sem tirar o gesto. A rotação não tem alça: acontece logo
 * **fora** de cada canto, onde o cursor troca para a seta circular. Nome
 * acima, medida em selo abaixo.
 *
 * Nome e selo ficam fora do grupo girado de propósito: no Figma eles seguem
 * horizontais em qualquer ângulo, porque texto de leitura não se lê de lado.
 */
function CromoDeSelecao({
  codigo,
  escala,
  unidade,
  girando,
  rotulo,
  aoRedimensionar,
  aoGirar,
  aoSeguir,
  aoTerminar,
}: {
  codigo: Codigo;
  escala: number;
  unidade: Unidade;
  girando: boolean;
  rotulo: string;
  aoRedimensionar: (evento: React.PointerEvent, alca: Alca) => void;
  aoGirar: (evento: React.PointerEvent) => void;
  aoSeguir: (evento: React.PointerEvent) => void;
  aoTerminar: () => void;
}) {
  const alca = ALCA_PX / escala;
  const zonaRotacao = ZONA_ROTACAO_PX / escala;
  const zonaAresta = ZONA_ARESTA_PX / escala;
  const centro = centroDoCodigo(codigo);
  const { x, y, comprimento, altura } = codigo;
  const anguloDaTela = normalizarAngulo(codigo.rotacao);

  // O contorno usa a caixa das barras; nome e selo usam a extensão visual,
  // que inclui o número impresso.
  const visual = envolventeVisual(codigo);
  const corpo = CORPO_ROTULO_PX / escala;
  const medida = girando
    ? `${Number(codigo.rotacao.toFixed(1))}°`
    : `${formatarNaUnidade(comprimento, unidade)} × ${formatarNaUnidade(altura, unidade)}`;
  const eventos = {
    onPointerMove: aoSeguir,
    onPointerUp: aoTerminar,
    onPointerCancel: aoTerminar,
  };

  return (
    <>
      <g transform={`rotate(${codigo.rotacao} ${centro.x} ${centro.y})`}>
        {/* Zonas que giram: quadrados logo fora de cada canto, por baixo das
            alças, para o canto em si continuar redimensionando. */}
        {CANTOS.map(({ id, sx, sy }) => (
          <rect
            key={`girar-${id}`}
            x={centro.x + (sx * comprimento) / 2 - (sx > 0 ? 0 : zonaRotacao)}
            y={centro.y + (sy * altura) / 2 - (sy > 0 ? 0 : zonaRotacao)}
            width={zonaRotacao}
            height={zonaRotacao}
            fill="transparent"
            style={{ cursor: CURSOR_ROTACAO }}
            onPointerDown={aoGirar}
            {...eventos}
          />
        ))}

        <rect
          x={x}
          y={y}
          width={comprimento}
          height={altura}
          fill="none"
          stroke={COR_SELECAO}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />

        {/* Arestas: redimensionam, sem alça desenhada. */}
        {ARESTAS.map((aresta) => {
          const horizontal = aresta.sx === 0;
          return (
            <rect
              key={`aresta-${aresta.id}`}
              x={horizontal ? x : centro.x + (aresta.sx * comprimento) / 2 - zonaAresta / 2}
              y={horizontal ? centro.y + (aresta.sy * altura) / 2 - zonaAresta / 2 : y}
              width={horizontal ? comprimento : zonaAresta}
              height={horizontal ? zonaAresta : altura}
              fill="transparent"
              style={{ cursor: cursorDaAlca(aresta, anguloDaTela) }}
              onPointerDown={(evento) => aoRedimensionar(evento, aresta)}
              {...eventos}
            />
          );
        })}

        {CANTOS.map((canto) => (
          <rect
            key={`canto-${canto.id}`}
            x={centro.x + (canto.sx * comprimento) / 2 - alca / 2}
            y={centro.y + (canto.sy * altura) / 2 - alca / 2}
            width={alca}
            height={alca}
            fill="#fff"
            stroke={COR_SELECAO}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            style={{ cursor: cursorDaAlca(canto, anguloDaTela) }}
            onPointerDown={(evento) => aoRedimensionar(evento, canto)}
            {...eventos}
          />
        ))}
      </g>

      <text
        x={visual.x}
        y={visual.y - corpo * 0.45}
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
        fontSize={corpo}
        fill={COR_SELECAO}
        pointerEvents="none"
      >
        {rotulo}
      </text>

      <SeloDeMedida caixa={visual} escala={escala} texto={medida} />
    </>
  );
}

/**
 * Memoizado porque a geração pulsa o progresso a cada 25 páginas, e sem isto
 * cada pulso reconciliaria os ~285 elementos de SVG da folha — trabalho
 * inútil disputando a thread com a montagem do PDF. Todas as props são
 * estáveis durante a geração, então o `memo` corta o render inteiro.
 */
export const PreviaFolha = memo(PreviaFolhaBase);
