"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { barrasNormalizadas, codificarCode128 } from "@/lib/code128";
import {
  FONTE_DO_NUMERO,
  MODULOS_ZONA_SILENCIO,
  PT_POR_MM,
  caixaEnvolvente,
  centroDoCodigo,
  ehAnguloReto,
  moduloEmMm,
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
  type Alca,
} from "@/lib/barcodeGestos";
import {
  calcularAlinhamento,
  interseccionam,
  uniaoDeCaixas,
  type Caixa,
  type Guia,
} from "@/lib/barcodeGuias";
import type { Arte } from "@/lib/barcodeStore";
import { formatarNaUnidade, medidaEmTexto, type Unidade } from "@/lib/unidades";

/**
 * A única cor saturada do editor.
 *
 * A paleta do site é neutra de ponta a ponta; a seleção é a exceção porque
 * precisa se distinguir das barras pretas sobre papel branco, onde nenhum
 * cinza tem contraste suficiente para ler como estado, e não como conteúdo.
 */
const COR_SELECAO = "#2563eb";

/** Lado da alça e distância da alça de rotação, em pixels de tela. */
const ALCA_PX = 7;
const ROTACAO_PX = 22;

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
  aoTerminarGesto,
  abortarGesto,
  escala,
  unidade,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gesto = useRef<Gesto | null>(null);
  const [gestoAtivo, setGestoAtivo] = useState<Gesto["tipo"] | null>(null);
  const [guias, setGuias] = useState<Guia[]>([]);
  const [marquise, setMarquise] = useState<Caixa | null>(null);
  /** Medida no papel, mantida na tela até a próxima ou a troca de modo. */
  const [medida, setMedida] = useState<{ inicio: Ponto; fim: Ponto } | null>(null);

  const barras = useMemo(() => barrasNormalizadas(codificarCode128(valor)), [valor]);

  // Trocar de modo apaga a medida na tela: ela pertence ao modo de medir, e
  // deixá-la sobrando confundiria com uma guia de alinhamento.
  useEffect(() => {
    if (modo !== "medir") setMedida(null);
  }, [modo]);

  const { largura, altura } = layout.pagina;
  const alcaMm = ALCA_PX / escala;
  const rotacaoMm = ROTACAO_PX / escala;

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
      gesto.current = { ...atual, fim: ponteiro };
      setMedida({ inicio: atual.inicio, fim: ponteiro });
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
        setGuias(alinhamento.guias);
        deslocamento = {
          x: deslocamento.x + alinhamento.ajuste.x,
          y: deslocamento.y + alinhamento.ajuste.y,
        };
      } else {
        setGuias([]);
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
    setMarquise(null);
  }, [abortarGesto]);

  const conjunto = layout.codigos.filter((codigo) => selecionados.includes(codigo.id));
  // Alça de girar e de redimensionar só com um selecionado: escalar um grupo
  // com códigos em ângulos diferentes exigiria cisalhar as barras, e barra
  // cisalhada é código que leitor nenhum lê.
  const codigoSelecionado = conjunto.length === 1 ? conjunto[0]! : null;
  /** Mover e escalar manipulam; mão e medir, não. */
  const manipulando = modo === "mover" || modo === "escala";
  const caixaDoGrupo = conjunto.length > 1 ? uniaoDeCaixas(conjunto.map(caixaEnvolvente)) : null;

  /** Texto legível de um código, no referencial local. */
  const textoLocal = (codigo: Codigo) => {
    const corpo = codigo.textoTamanho / PT_POR_MM;
    return {
      corpo,
      x: codigo.x + codigo.comprimento / 2,
      y: codigo.textoAcima
        ? codigo.y - codigo.textoEspaco
        : codigo.y + codigo.altura + codigo.textoEspaco + corpo * FONTE_DO_NUMERO.alturaDoDigito,
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
      onPointerDown={(evento) => {
        const ponteiro = paraPagina(evento);
        if (!ponteiro) return;
        if (modo === "medir") {
          iniciarGesto(evento, { tipo: "medir", inicio: ponteiro, fim: ponteiro });
          return;
        }
        // Na mão, o arrasto pertence ao contêiner que rola a vista.
        if (modo === "mao") return;
        // Arrastar no papel vazio seleciona por área; um clique sem arrasto
        // limpa a seleção. Quem decide é a distância percorrida, conferida no
        // fim do gesto.
        iniciarGesto(evento, {
          tipo: "marquise",
          inicio: ponteiro,
          atual: ponteiro,
          anterior: [...selecionados],
          somar: evento.shiftKey || evento.metaKey || evento.ctrlKey,
        });
        if (!evento.shiftKey && !evento.metaKey && !evento.ctrlKey) aoSelecionar([]);
      }}
      onPointerMove={seguirGesto}
      onPointerUp={terminarGesto}
      onPointerCancel={terminarGesto}
      className="block shrink-0 touch-none select-none bg-white shadow-[0_1px_2px_rgba(0,0,0,.2),0_12px_32px_-8px_rgba(0,0,0,.35)]"
      style={{ cursor: modo === "medir" ? "crosshair" : undefined }}
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
                textAnchor="middle"
                fontFamily="var(--font-geist-mono), ui-monospace, monospace"
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
                aoSelecionar(proxima);
                // Arrasta tudo que está selecionado, não só o que foi clicado.
                const iniciais = layout.codigos.filter((outro) =>
                  proxima.includes(outro.id)
                );
                if (iniciais.length === 0) return;
                iniciarGesto(evento, { tipo: "mover", iniciais, ponteiroInicial: ponteiro });
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

      {/* Moldura do grupo: é a referência do alinhamento em conjunto. */}
      {manipulando && caixaDoGrupo && (
        <rect
          x={caixaDoGrupo.x}
          y={caixaDoGrupo.y}
          width={caixaDoGrupo.largura}
          height={caixaDoGrupo.altura}
          fill="none"
          stroke={COR_SELECAO}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
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
        <g transform={giro(codigoSelecionado)}>
          {(() => {
            const codigo = codigoSelecionado;
            const folga = moduloEmMm(codigo.comprimento, layout.digitos) * MODULOS_ZONA_SILENCIO;
            const centro = centroDoCodigo(codigo);
            const alcaAnguloBase = -normalizarAngulo(codigo.rotacao);
            return (
              <>
                {/* Zona de silêncio: a área branca que o leitor precisa nas
                    duas pontas. Só na seleção, para não poluir a folha. */}
                <rect
                  x={codigo.x - folga}
                  y={codigo.y}
                  width={codigo.comprimento + folga * 2}
                  height={codigo.altura}
                  fill="none"
                  stroke={COR_SELECAO}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />

                <rect
                  x={codigo.x}
                  y={codigo.y}
                  width={codigo.comprimento}
                  height={codigo.altura}
                  fill="none"
                  stroke={COR_SELECAO}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />

                {/* Haste e alça de rotação, acima da aresta de cima. */}
                <line
                  x1={centro.x}
                  y1={codigo.y}
                  x2={centro.x}
                  y2={codigo.y - rotacaoMm}
                  stroke={COR_SELECAO}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
                <circle
                  cx={centro.x}
                  cy={codigo.y - rotacaoMm}
                  r={alcaMm * 0.75}
                  fill="#fff"
                  stroke={COR_SELECAO}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: "grab" }}
                  onPointerDown={(evento) => {
                    const ponteiro = paraPagina(evento);
                    if (!ponteiro) return;
                    iniciarGesto(evento, {
                      tipo: "girar",
                      inicial: codigo,
                      anguloInicial: anguloDoPonteiro(ponteiro, centroDoCodigo(codigo)),
                    });
                  }}
                  onPointerMove={seguirGesto}
                  onPointerUp={terminarGesto}
                  onPointerCancel={terminarGesto}
                />

                {ALCAS.map((alca) => {
                  const cx = centro.x + (alca.sx * codigo.comprimento) / 2;
                  const cy = centro.y + (alca.sy * codigo.altura) / 2;
                  return (
                    <rect
                      key={alca.id}
                      x={cx - alcaMm / 2}
                      y={cy - alcaMm / 2}
                      width={alcaMm}
                      height={alcaMm}
                      fill="#fff"
                      stroke={COR_SELECAO}
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                      // A alça gira junto com o código, então o cursor tem que
                      // girar também: no referencial da tela, a seta é a que
                      // corresponde à direção já rotacionada.
                      style={{ cursor: cursorDaAlca(alca, -alcaAnguloBase) }}
                      onPointerDown={(evento) =>
                        iniciarGesto(evento, { tipo: "redimensionar", inicial: codigo, alca })
                      }
                      onPointerMove={seguirGesto}
                      onPointerUp={terminarGesto}
                      onPointerCancel={terminarGesto}
                    />
                  );
                })}
              </>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

/**
 * Memoizado porque a geração pulsa o progresso a cada 25 páginas, e sem isto
 * cada pulso reconciliaria os ~285 elementos de SVG da folha — trabalho
 * inútil disputando a thread com a montagem do PDF. Todas as props são
 * estáveis durante a geração, então o `memo` corta o render inteiro.
 */
export const PreviaFolha = memo(PreviaFolhaBase);
