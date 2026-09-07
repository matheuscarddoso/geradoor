"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  AlignStartHorizontal,
  AlignStartVertical,
  Barcode,
  ChevronDown,
  Copy,
  Download,
  FileUp,
  Image as ImagemIcone,
  Loader,
  Check,
  Eye,
  EyeOff,
  Hand,
  Keyboard,
  Maximize2,
  Minus,
  MousePointer2,
  // `Lock` colide com o tipo global da Web Locks API, daí o apelido.
  Lock as Travado,
  Unlock as Destravado,
  Plus,
  RotateCcw,
  RotateCw,
  Redo2,
  Ruler,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CampoNumero } from "@/components/barcode/CampoNumero";
import { PreviaFolha, type ModoDaFolha } from "@/components/barcode/PreviaFolha";
import { REGUA_PX, Reguas } from "@/components/barcode/Reguas";
import {
  LIMITES,
  TAMANHOS_PAGINA,
  avaliarFaixa,
  avaliarLayout,
  codigoPadrao,
  contarArquivos,
  estimarBytesDaArte,
  estimarTamanho,
  formatarBytes,
  formatarValor,
  layoutInicial,
  layoutRoe01,
  moduloEmMm,
  normalizarAngulo,
  normalizarLayout,
  novoId,
  type Codigo,
  type Faixa,
  type Layout,
  type Ponto,
} from "@/lib/barcodeLayout";
import { baixar } from "@/lib/baixarArquivo";
import type { Progresso } from "@/lib/barcodePdf";
import {
  ArteInvalidaError,
  gravarArte,
  gravarLayout,
  lerArquivoDeArte,
  lerArte,
  lerLayout,
  type Arte,
} from "@/lib/barcodeStore";
import {
  alinharConjunto,
  distribuirConjunto,
  girarConjunto,
  type Alinhar,
} from "@/lib/barcodeGuias";
import {
  UNIDADES,
  formatarNaUnidade,
  gravarUnidade,
  medidaEmTexto,
  lerUnidade,
  paraMm,
  definicaoDaUnidade,
  type Unidade,
} from "@/lib/unidades";
import {
  descreverSobreposicao,
  gravarEmissoes,
  lerEmissoes,
  novaEmissao,
  sobreposicoes,
  type Emissao,
} from "@/lib/barcodeEmissoes";
import { useHistorico } from "@/lib/useHistorico";
import { ehPlataformaMac, focoEmCampo, reconhecerAtalho, rotuloDoAtalho } from "@/lib/atalhos";
import { cn } from "@/lib/utils";

const FAIXA_INICIAL: Faixa = { de: 1, ate: 1000, paginasPorArquivo: 1000 };

/**
 * Pixels de tela por milímetro a 100%.
 *
 * A referência é a de 96 dpi do CSS: com este fator, um código que mede
 * 17,86 mm no papel mede 17,86 mm na régua encostada na tela.
 */
const PX_POR_MM_A_100 = 100 / (96 / 25.4);

/**
 * A folha de atalhos.
 *
 * Existe porque quem opera isto vem do Figma e conhece os gestos, mas não tem
 * onde conferir os daqui. Um editor sem essa lista obriga a decorar por
 * tentativa, e quem não decora volta a usar só o mouse.
 */
const ATALHOS_DOCUMENTADOS: ReadonlyArray<{
  grupo: string;
  itens: ReadonlyArray<readonly [string, string]>;
}> = [
  {
    grupo: "Ferramentas",
    itens: [
      ["V", "Mover"],
      ["H", "Mão (arrastar a vista)"],
      ["K", "Escalar"],
      ["M", "Medir"],
      ["Espaço", "Mão temporária, enquanto segurar"],
    ],
  },
  {
    grupo: "Seleção",
    itens: [
      ["Clique", "Selecionar"],
      ["Shift+clique", "Somar ou tirar da seleção"],
      ["Arrastar no papel", "Selecionar por área"],
      ["Ctrl+A", "Selecionar tudo"],
      ["Esc", "Desmarcar, ou cancelar o gesto"],
    ],
  },
  {
    grupo: "Editar",
    itens: [
      ["Ctrl+Z", "Desfazer"],
      ["Ctrl+Shift+Z", "Refazer"],
      ["Ctrl+D", "Duplicar"],
      ["Ctrl+C · Ctrl+V", "Copiar e colar"],
      ["Delete", "Remover"],
      ["Setas", "Mover 0,1 mm"],
      ["Shift+setas", "Mover 1 mm"],
    ],
  },
  {
    grupo: "Durante o gesto",
    itens: [
      ["Shift", "Trava proporção, ângulo de 15° ou eixo"],
      ["Alt", "Redimensiona pelo centro"],
      ["Ctrl", "Desliga o ímã das guias"],
    ],
  },
  {
    grupo: "Vista",
    itens: [
      ["+ · −", "Zoom"],
      ["0", "Encaixar na tela"],
      ["Ctrl+S", "Exportar o layout"],
      ["?", "Esta lista"],
    ],
  },
];

/** Ferramenta que manipula o desenho: é a que o botão da esquerda aplica. */
type FerramentaDeManipulacao = "mover" | "mao" | "escala";

const FERRAMENTAS_DE_MANIPULACAO: readonly FerramentaDeManipulacao[] = [
  "mover",
  "mao",
  "escala",
];

const FERRAMENTAS: Record<
  ModoDaFolha,
  { nome: string; tecla: string; icone: typeof MousePointer2 }
> = {
  mover: { nome: "Mover", tecla: "V", icone: MousePointer2 },
  mao: { nome: "Mão", tecla: "H", icone: Hand },
  escala: { nome: "Escalar", tecla: "K", icone: Maximize2 },
  medir: { nome: "Medir", tecla: "M", icone: Ruler },
};

type BotaoDeAlinhamento = readonly [
  Alinhar,
  typeof AlignStartVertical,
  /** Dica com um só selecionado: a moldura é a folha. */
  string,
  /** Dica com vários: a moldura é a seleção. */
  string,
];

/**
 * Medida compartilhada por um conjunto, ou `NaN` quando divergem.
 *
 * O campo mostra vazio no caso divergente em vez de escolher um dos valores:
 * mostrar o do primeiro faria o painel afirmar algo falso sobre os outros
 * onze.
 */
function medidaComum(
  codigos: readonly Codigo[],
  campo: "comprimento" | "altura" | "rotacao"
): number {
  const primeiro = codigos[0];
  if (!primeiro) return Number.NaN;
  const valor = primeiro[campo];
  return codigos.every((codigo) => Math.abs(codigo[campo] - valor) < 1e-9)
    ? valor
    : Number.NaN;
}

/**
 * Alinhamento em dois grupos de três: o primeiro age no eixo horizontal, o
 * segundo no vertical. É o agrupamento de qualquer editor, e é o que deixa
 * escolher sem ler os ícones um por um.
 */
const GRUPOS_DE_ALINHAMENTO: readonly (readonly BotaoDeAlinhamento[])[] = [
  [
    ["esquerda", AlignStartVertical, "Encostar à esquerda da folha", "Alinhar pela borda esquerda da seleção"],
    ["centro-h", AlignCenterVertical, "Centralizar na horizontal", "Centralizar na horizontal dentro da seleção"],
    ["direita", AlignEndVertical, "Encostar à direita da folha", "Alinhar pela borda direita da seleção"],
  ],
  [
    ["topo", AlignStartHorizontal, "Encostar no topo da folha", "Alinhar pelo topo da seleção"],
    ["centro-v", AlignCenterHorizontal, "Centralizar na vertical", "Centralizar na vertical dentro da seleção"],
    ["base", AlignEndHorizontal, "Encostar na base da folha", "Alinhar pela base da seleção"],
  ],
];

/**
 * Escala uma dimensão junto com a outra, respeitando o limite dela.
 *
 * Sem o limite, travar a proporção e encolher o comprimento até o mínimo
 * levaria a altura para zero — e uma barra de altura zero é um código que não
 * existe, sem nada na tela explicando por quê.
 */
function escalarJunto(
  valor: number,
  fator: number,
  limite: { min: number; max: number }
): number {
  if (!Number.isFinite(fator) || fator <= 0) return valor;
  return Number(Math.min(limite.max, Math.max(limite.min, valor * fator)).toFixed(2));
}

function Secao({
  titulo,
  acao,
  children,
  refSecao,
}: {
  titulo: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  refSecao?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={refSecao} className="border-b border-border px-4 py-4">
      <div className="mb-3 flex h-5 items-center justify-between">
        <h2 className="text-xs font-medium text-foreground">{titulo}</h2>
        {acao}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

/**
 * Campo numérico que altera o layout, e por isso entra no histórico.
 *
 * Existe para não repetir as duas bordas de transação em cada um dos dez
 * campos — e para deixar óbvio, na leitura, quais campos são desfazíveis: os
 * da faixa de numeração usam o `CampoNumero` cru, porque a faixa é parâmetro
 * da tiragem, não desenho da folha.
 */
function CampoDeLayout({
  valorMm,
  aoMudarMm,
  unidade,
  aoIniciarGesto,
  aoTerminarGesto,
  minMm,
  maxMm,
  ...resto
}: Omit<React.ComponentProps<typeof CampoNumero>, "valor" | "aoMudar" | "min" | "max"> & {
  /** Sempre em milímetro: a conversão para a unidade escolhida é daqui. */
  valorMm: number;
  aoMudarMm: (mm: number) => void;
  unidade: Unidade;
  minMm?: number;
  maxMm?: number;
}) {
  const { casas, passo, rotulo } = definicaoDaUnidade(unidade);
  return (
    <CampoNumero
      {...resto}
      unidade={rotulo}
      casas={casas}
      passo={passo}
      valor={formatarNaUnidade(valorMm, unidade)}
      min={minMm === undefined ? undefined : formatarNaUnidade(minMm, unidade)}
      max={maxMm === undefined ? undefined : formatarNaUnidade(maxMm, unidade)}
      aoMudar={(valor) => aoMudarMm(paraMm(valor, unidade))}
      aoIniciarGesto={aoIniciarGesto}
      aoTerminarGesto={aoTerminarGesto}
    />
  );
}

/**
 * O motor de PDF falhou por não ter conseguido baixar o próprio código.
 *
 * Acontece com quem está com a aba aberta quando o site é publicado: o
 * `import` sob demanda aponta para um arquivo que o deploy substituiu. Também
 * é o que aparece em desenvolvimento quando o servidor recompila por baixo de
 * uma aba antiga. Sem distinguir, o operador leria "a geração falhou" e
 * tentaria de novo para sempre, quando o que resolve é recarregar.
 */
function ehFalhaDeCarregamento(erro: unknown): boolean {
  if (typeof erro !== "object" || erro === null) return false;
  const { name, message } = erro as { name?: unknown; message?: unknown };
  if (name === "ChunkLoadError") return true;
  return (
    typeof message === "string" &&
    /Loading chunk|dynamically imported module|Importing a module script failed/i.test(message)
  );
}

const AVISO_DE_RECARGA =
  "A página foi atualizada desde que você a abriu. Recarregue para continuar — o layout está guardado.";

function Dica({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-muted-foreground">{children}</p>;
}

export default function CodigoDeBarrasClient() {
  const historico = useHistorico<Layout>(layoutInicial());
  const layout = historico.estado;
  const { redefinir: redefinirHistorico } = historico;
  /** Alias curto: o nome de `setState` mentiria, isto passa pelo histórico. */
  const aplicarNoLayout = historico.aplicar;
  const [arte, setArte] = useState<Arte | null>(null);
  /** Ids selecionados. Vazio é nada selecionado; a ordem é a de entrada. */
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [faixa, setFaixa] = useState<Faixa>(FAIXA_INICIAL);
  const [progresso, setProgresso] = useState<Progresso | null>(null);
  const [amostrando, setAmostrando] = useState(false);
  const [escala, setEscala] = useState(2);
  const [escalaManual, setEscalaManual] = useState(false);
  const [pronto, setPronto] = useState(false);
  /**
   * Bytes que a arte ocupa dentro do PDF, medidos. Zero quando não há arte.
   * É este número, e não o do arquivo em disco, que dimensiona o resultado.
   */
  const [bytesDaArte, setBytesDaArte] = useState(0);
  const [confirmandoPreset, setConfirmandoPreset] = useState(false);
  const [confirmandoGeracao, setConfirmandoGeracao] = useState(false);
  const [limpandoEmissoes, setLimpandoEmissoes] = useState(false);
  const [mostrandoAtalhos, setMostrandoAtalhos] = useState(false);
  const [emissoes, setEmissoes] = useState<Emissao[]>([]);
  const [abortarGesto, setAbortarGesto] = useState(0);
  // Só para escrever o atalho na dica. Fica em estado porque `navigator` não
  // existe no render do servidor, e a marca da plataforma mudaria a hidratação.
  const [ehMac, setEhMac] = useState(false);
  /** Unidade de exibição. O modelo segue em milímetro; isto é só a fronteira. */
  const [unidade, setUnidade] = useState<Unidade>("mm");
  /** Trava de proporção do bloco de dimensões, como o cadeado do W/H. */
  const [proporcaoTravada, setProporcaoTravada] = useState(false);
  /**
   * Modo da folha. A régua aparece junto do modo de medir, em vez de ter
   * botão próprio: quem liga a régua está conferindo medida.
   */
  const [modo, setModo] = useState<ModoDaFolha>("mover");
  /**
   * Cópia interna, não a área de transferência do sistema.
   *
   * Colar código de barras entre abas não é caso de uso, e pedir permissão de
   * clipboard para uma coisa que só faz sentido dentro da própria folha seria
   * atrito sem retorno.
   */
  const copia = useRef<readonly Codigo[] | null>(null);
  const gestoEmCurso = useRef(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const inspetorRef = useRef<HTMLElement>(null);
  const arquivoArteRef = useRef<HTMLInputElement>(null);
  const arquivoLayoutRef = useRef<HTMLInputElement>(null);
  const cancelamento = useRef<AbortController | null>(null);
  /** O layout corrente, para callbacks estáveis lerem sem entrar nas deps. */
  /** Contêiner que rola: é ele que faz o pan, não uma transformação. */
  const roloRef = useRef<HTMLDivElement>(null);
  /** Espaço mantido pressionado: mão temporária, como em todo editor. */
  const [espacoPressionado, setEspacoPressionado] = useState(false);
  /**
   * A última ferramenta de manipulação escolhida.
   *
   * Guardada em separado do modo para o botão continuar aplicando a escolha
   * anterior depois de uma passagem pela régua — trocar de ferramenta e voltar
   * não pode devolver ao Mover por conta própria.
   */
  const [ferramentaDeManipulacao, setFerramentaDeManipulacao] =
    useState<FerramentaDeManipulacao>("mover");
  const arrastoDaVista = useRef<{ x: number; y: number; esq: number; topo: number } | null>(null);

  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const historicoRef = useRef(historico);
  historicoRef.current = historico;


  /**
   * Mede o custo real da arte dentro do PDF e guarda junto dela.
   *
   * Roda uma vez por arte, não por geração: o resultado vai para o IndexedDB e
   * volta pronto na próxima sessão. Sem este número a estimativa de tamanho
   * erraria por uma ordem de grandeza em arte PNG.
   */
  const medirEGuardarArte = useCallback(async (nova: Arte) => {
    try {
      const { medirArteNoPdf } = await import("@/lib/barcodePdf");
      const bytes = await medirArteNoPdf(
        { dataUrl: nova.dataUrl, formato: nova.formato },
        layoutRef.current.pagina
      );
      setBytesDaArte(bytes);
      setArte({ ...nova, bytesNoPdf: bytes });
      await gravarArte({ ...nova, bytesNoPdf: bytes });
    } catch (erro) {
      // A arte continua utilizável; o que se perde é a precisão da estimativa.
      // O palpite entra no lugar do zero de propósito: sem nenhum valor, a
      // trava de tamanho ignoraria justamente a parte que domina o resultado
      // e liberaria uma faixa que a aba não aguenta.
      // A medição é conveniência: se o motor não carregou, o palpite por pixel
      // cobre a estimativa e a arte segue utilizável. Só avisa se a falha for
      // de carregamento, que é a que o operador resolve recarregando.
      console.error("Falha ao medir a arte no PDF; usando estimativa:", erro);
      setBytesDaArte(estimarBytesDaArte(nova));
      if (ehFalhaDeCarregamento(erro)) toast.error(AVISO_DE_RECARGA);
    }
  }, []);

  // Recupera o trabalho da sessão anterior antes de deixar mexer, para não
  // sobrescrever o layout guardado com o padrão do primeiro render.
  useEffect(() => {
    let ativo = true;
    const guardado = lerLayout();
    if (guardado) redefinirHistorico(guardado);
    lerArte()
      .then((encontrada) => {
        if (!ativo || !encontrada) return;
        setArte(encontrada);
        if (encontrada.bytesNoPdf !== undefined) setBytesDaArte(encontrada.bytesNoPdf);
        else void medirEGuardarArte(encontrada);
      })
      .catch((erro) => {
        // `lerArte` já resolve em vez de rejeitar; este handler existe para
        // que uma regressão lá vire log, e nunca rejeição não tratada.
        console.error("Falha ao recuperar a arte guardada:", erro);
      });
    setEhMac(ehPlataformaMac());
    setUnidade(lerUnidade());
    setEmissoes(lerEmissoes());
    setPronto(true);
    return () => {
      ativo = false;
    };
  }, [medirEGuardarArte, redefinirHistorico]);

  useEffect(() => {
    if (pronto) gravarLayout(layout);
  }, [layout, pronto]);

  /**
   * A folga de pan em volta da folha, em pixels.
   *
   * É o `100vmax` do CSS lido de volta em número: o zoom ancorado precisa dela
   * porque a folga **não** escala junto com a folha. Tratar o conteúdo como se
   * escalasse inteiro faz o ponto sob o cursor escorregar.
   */
  const folgaDoCanvas = () => Math.max(window.innerWidth, window.innerHeight);

  /** Põe a folha no meio da área visível. */
  const centralizarFolha = useCallback(() => {
    const rolo = roloRef.current;
    if (!rolo) return;
    rolo.scrollLeft = (rolo.scrollWidth - rolo.clientWidth) / 2;
    rolo.scrollTop = (rolo.scrollHeight - rolo.clientHeight) / 2;
  }, []);
  const centralizarFolhaRef = useRef(centralizarFolha);
  centralizarFolhaRef.current = centralizarFolha;

  /**
   * Volta a folha para o meio da tela, no tamanho que couber.
   *
   * Recentraliza sempre, e não só quando a escala muda: com a folga de pan
   * grande dá para levar a folha para fora da tela, e "encaixar" é justamente
   * o caminho de volta. Antes isto era um `setEscalaManual(false)`, que não
   * fazia nada quando o modo já era automático — e aí a folha ficava perdida.
   */
  const encaixarNaTela = useCallback(() => {
    setEscalaManual(false);
    requestAnimationFrame(() => {
      centralizarFolhaRef.current();
      // Um segundo quadro porque a escala nova só chega ao DOM depois do
      // render que o `setEscalaManual` disparou.
      requestAnimationFrame(() => centralizarFolhaRef.current());
    });
  }, []);

  /**
   * Muda a escala mantendo um ponto da tela parado.
   *
   * Sem âncora, usa o centro da área — o que se espera de zoom por menu ou por
   * tecla. A pinça passa a posição do cursor, que é o que se espera dela.
   *
   * A conta desfaz e refaz a projeção: do rolamento tira o ponto da folha em
   * milímetros, e desse ponto tira o rolamento novo. Multiplicar o rolamento
   * pela razão das escalas seria mais curto e estaria errado, porque a folga
   * de pan é constante e entraria multiplicada.
   */
  const aplicarZoom = useCallback((proxima: number | ((atual: number) => number), ancoraTela?: Ponto) => {
    const rolo = roloRef.current;
    setEscalaManual(true);
    setEscala((atual) => {
      const bruta = typeof proxima === "function" ? proxima(atual) : proxima;
      const alvo = Math.min(8, Math.max(0.4, bruta));
      if (!rolo || alvo === atual) return alvo;

      const folga = folgaDoCanvas();
      const ancora = ancoraTela ?? { x: rolo.clientWidth / 2, y: rolo.clientHeight / 2 };
      const mmX = (rolo.scrollLeft + ancora.x - folga) / atual;
      const mmY = (rolo.scrollTop + ancora.y - folga) / atual;

      // No quadro seguinte, quando o conteúdo já tem o tamanho novo.
      requestAnimationFrame(() => {
        rolo.scrollLeft = folga + mmX * alvo - ancora.x;
        rolo.scrollTop = folga + mmY * alvo - ancora.y;
      });
      return alvo;
    });
  }, []);

  /**
   * Pinça de trackpad e Ctrl com a roda.
   *
   * O navegador manda pinça como `wheel` com `ctrlKey`. Sem o modificador o
   * evento passa direto, e o pan de dois dedos fica sendo a rolagem nativa —
   * mais suave que qualquer coisa reimplementada em JavaScript.
   */
  useEffect(() => {
    const rolo = roloRef.current;
    if (!rolo) return;
    const aoRolar = (evento: WheelEvent) => {
      if (!evento.ctrlKey && !evento.metaKey) return;
      evento.preventDefault();
      const caixa = rolo.getBoundingClientRect();
      aplicarZoom(
        // O divisor calibra a sensibilidade: com 180 um único passo de roda
        // dava 1,9× de zoom. Com 400 dá 1,35×, e a pinça — que manda muitos
        // deltas pequenos — segue contínua.
        (atual) => atual * Math.exp(-evento.deltaY / 400),
        { x: evento.clientX - caixa.x, y: evento.clientY - caixa.y }
      );
    };
    // `passive: false` porque o `preventDefault` da pinça precisa valer.
    rolo.addEventListener("wheel", aoRolar, { passive: false });
    return () => rolo.removeEventListener("wheel", aoRolar);
  }, [aplicarZoom]);

  // Encaixa a folha na área disponível enquanto o operador não escolheu um
  // zoom: trocar o tamanho da página não deve deixar a folha fora da tela.
  useEffect(() => {
    const area = areaRef.current;
    if (!area || escalaManual) return;
    const encaixar = () => {
      const margem = 88;
      setEscala(
        Math.max(
          0.4,
          Math.min(
            (area.clientWidth - margem) / layout.pagina.largura,
            (area.clientHeight - margem) / layout.pagina.altura,
            4
          )
        )
      );
    };
    encaixar();
    // Com a folga de pan, o conteúdo é sempre maior que a área: centralizar
    // deixou de ser trabalho do layout e passou a ser do rolamento.
    requestAnimationFrame(centralizarFolha);
    const observador = new ResizeObserver(() => {
      encaixar();
      requestAnimationFrame(centralizarFolha);
    });
    observador.observe(area);
    return () => observador.disconnect();
  }, [layout.pagina.largura, layout.pagina.altura, escalaManual, centralizarFolha]);

  const atualizarCodigo = useCallback(
    (id: string, mudanca: Partial<Codigo>) => {
      historicoRef.current.aplicar((atual: Layout) => ({
        ...atual,
        codigos: atual.codigos.map((codigo) =>
          codigo.id === id ? { ...codigo, ...mudanca } : codigo
        ),
      }));
    },
    []
  );

  /**
   * Aplica mudanças em vários códigos de uma vez.
   *
   * Uma chamada, uma mudança de estado, uma entrada de histórico: mover doze
   * etiquetas não pode virar doze passos de desfazer nem doze renders.
   */
  const atualizarVarios = useCallback(
    (mudancas: ReadonlyArray<{ id: string; mudanca: Partial<Codigo> }>) => {
      if (mudancas.length === 0) return;
      const porId = new Map(mudancas.map((m) => [m.id, m.mudanca]));
      historicoRef.current.aplicar((atual: Layout) => ({
        ...atual,
        codigos: atual.codigos.map((codigo) => {
          const mudanca = porId.get(codigo.id);
          return mudanca ? { ...codigo, ...mudanca } : codigo;
        }),
      }));
    },
    []
  );

  const alterarPorGesto = useCallback(
    (mudancas: ReadonlyArray<{ id: string; mudanca: Partial<Codigo> }>) =>
      atualizarVarios(mudancas),
    [atualizarVarios]
  );

  /**
   * Um arrasto na folha é uma entrada de histórico, não sessenta por segundo.
   * A transação abre no `pointerdown` e fecha no `pointerup`.
   */
  const iniciarGestoNoHistorico = useCallback(() => {
    gestoEmCurso.current = true;
    historicoRef.current.abrir();
  }, []);
  const terminarGestoNoHistorico = useCallback(() => {
    gestoEmCurso.current = false;
    historicoRef.current.encerrar();
  }, []);

  const reguasVisiveis = modo === "medir";
  /** A mão está ativa: pela ferramenta ou pelo espaço pressionado. */
  const maoAtiva = modo === "mao" || espacoPressionado;

  /**
   * Espaço pressionado vira mão enquanto durar.
   *
   * Fica fora da tabela de atalhos porque não é uma ação: é um estado que
   * começa no keydown e acaba no keyup, e precisa dos dois eventos.
   */
  useEffect(() => {
    const desce = (evento: KeyboardEvent) => {
      if (evento.code !== "Space" || evento.repeat) return;
      const alvo = evento.target as HTMLElement | null;
      if (focoEmCampo(alvo)) return;
      // Espaço pertence ao controle quando ele é interruptor, caixa ou item de
      // menu aberto: é como se alterna sem mouse. Em qualquer outro foco —
      // inclusive num botão — espaço é panorâmica.
      const papel = alvo?.getAttribute("role");
      if (papel === "switch" || papel === "checkbox") return;
      if (alvo?.closest('[role="menu"],[role="dialog"],[role="listbox"]')) return;

      // Na captura, e cortando a propagação, porque o gatilho de um menu que
      // acabou de ser usado fica com o foco: sem isto o espaço reabre o menu,
      // e o menu aberto põe `pointer-events: none` no body — a panorâmica
      // deixava de funcionar justamente depois de escolher um zoom.
      evento.preventDefault();
      evento.stopPropagation();
      setEspacoPressionado(true);
    };
    const sobe = (evento: KeyboardEvent) => {
      if (evento.code === "Space") setEspacoPressionado(false);
    };
    // Perder o foco da janela com o espaço apertado deixaria a mão presa.
    const soltar = () => setEspacoPressionado(false);
    window.addEventListener("keydown", desce, { capture: true });
    window.addEventListener("keyup", sobe, { capture: true });
    window.addEventListener("blur", soltar);
    return () => {
      window.removeEventListener("keydown", desce, { capture: true });
      window.removeEventListener("keyup", sobe, { capture: true });
      window.removeEventListener("blur", soltar);
    };
  }, []);

  // Os atalhos são assinados uma vez; zoom e encaixe chegam por ref.
  const aplicarZoomRef = useRef(aplicarZoom);
  aplicarZoomRef.current = aplicarZoom;
  const encaixarNaTelaRef = useRef(encaixarNaTela);
  encaixarNaTelaRef.current = encaixarNaTela;

  /** Arrasta a vista: mão, espaço ou botão do meio. */
  const iniciarArrastoDaVista = (evento: React.PointerEvent) => {
    const rolo = roloRef.current;
    if (!rolo) return;
    // Mesmo motivo do gesto na folha: `preventDefault` impede a troca de foco,
    // e o campo do painel ficaria com o cursor.
    const focado = document.activeElement as HTMLElement | null;
    if (focoEmCampo(focado)) focado?.blur();
    evento.preventDefault();
    (evento.currentTarget as Element).setPointerCapture(evento.pointerId);
    arrastoDaVista.current = {
      x: evento.clientX,
      y: evento.clientY,
      esq: rolo.scrollLeft,
      topo: rolo.scrollTop,
    };
  };

  const seguirArrastoDaVista = (evento: React.PointerEvent) => {
    const inicio = arrastoDaVista.current;
    const rolo = roloRef.current;
    if (!inicio || !rolo) return;
    rolo.scrollLeft = inicio.esq - (evento.clientX - inicio.x);
    rolo.scrollTop = inicio.topo - (evento.clientY - inicio.y);
  };

  const terminarArrastoDaVista = () => {
    arrastoDaVista.current = null;
  };

  const codigosSelecionados = useMemo(
    () => layout.codigos.filter((codigo) => selecionados.includes(codigo.id)),
    [layout.codigos, selecionados]
  );
  /** O inspetor de medida só faz sentido com um código: com vários, o painel
   *  troca para alinhar, distribuir e aplicar valor a todos. */
  const codigoAtivo = codigosSelecionados.length === 1 ? codigosSelecionados[0]! : null;

  // O atalho de teclado lê o código atual por ref. Antes as dependências do
  // efeito incluíam o objeto do código, que muda de identidade a cada
  // milímetro arrastado: o listener era removido e recolocado na janela ~60
  // vezes por segundo durante um arrasto.
  const codigoAtivoRef = useRef<Codigo | null>(null);
  codigoAtivoRef.current = codigoAtivo;
  const conjuntoRef = useRef<readonly Codigo[]>([]);
  conjuntoRef.current = codigosSelecionados;

  // Clicar num código na folha tem que trazer as medidas dele à vista: o
  // inspetor fica no fim de um painel rolável, e sem isto a seleção parece
  // não ter feito nada.
  useEffect(() => {
    if (selecionados.length > 0) {
      inspetorRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selecionados]);

  /** Move o código selecionado, como uma entrada de histórico por tecla. */
  const deslocar = useCallback(
    (dx: number, dy: number, passoGrande: boolean) => {
      const conjunto = conjuntoRef.current;
      if (conjunto.length === 0) return;
      const passo = passoGrande ? 1 : 0.1;
      historicoRef.current.abrir();
      atualizarVarios(
        conjunto.map((codigo) => ({
          id: codigo.id,
          mudanca: {
            x: Number((codigo.x + dx * passo).toFixed(2)),
            y: Number((codigo.y + dy * passo).toFixed(2)),
          },
        }))
      );
      historicoRef.current.encerrar();
    },
    [atualizarVarios]
  );

  /**
   * Todos os atalhos da tela, num só lugar.
   *
   * Assina a janela uma única vez e lê o estado por ref: antes as dependências
   * incluíam o objeto do código selecionado, que muda de identidade a cada
   * milímetro arrastado, e o listener era removido e recolocado umas sessenta
   * vezes por segundo durante um arrasto.
   */
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const atalho = reconhecerAtalho(evento);
      if (!atalho) return;
      const ativo = codigoAtivoRef.current;
      const conjunto = conjuntoRef.current;
      const historicoAtual = historicoRef.current;

      switch (atalho) {
        case "desmarcar":
          // Durante um gesto, Escape desfaz o que ele já mexeu em vez de
          // desmarcar: é a saída de quem começou a arrastar e se arrependeu.
          if (gestoEmCurso.current) {
            evento.preventDefault();
            historicoAtual.desfazer();
            historicoAtual.encerrar();
            gestoEmCurso.current = false;
            setAbortarGesto((n) => n + 1);
            return;
          }
          (evento.target as HTMLElement | null)?.blur?.();
          setSelecionados([]);
          return;

        case "desfazer":
          evento.preventDefault();
          if (gestoEmCurso.current) setAbortarGesto((n) => n + 1);
          gestoEmCurso.current = false;
          historicoAtual.desfazer();
          return;

        case "refazer":
          evento.preventDefault();
          if (gestoEmCurso.current) setAbortarGesto((n) => n + 1);
          gestoEmCurso.current = false;
          historicoAtual.refazer();
          return;

        case "exportar":
          // Intercepta o ⌘S do navegador: aqui "salvar" é gravar o layout em
          // arquivo, não baixar o HTML da página.
          evento.preventDefault();
          exportarLayoutRef.current();
          return;

        case "selecionar-tudo":
          evento.preventDefault();
          setSelecionados(layoutRef.current.codigos.map((codigo) => codigo.id));
          return;

        case "duplicar":
          if (conjunto.length === 0) return;
          evento.preventDefault();
          duplicarConjuntoRef.current(conjunto);
          return;

        case "copiar":
          if (conjunto.length === 0) return;
          copia.current = [...conjunto];
          toast.success(
            conjunto.length === 1 ? "Código copiado." : `${conjunto.length} códigos copiados.`
          );
          return;

        case "cortar":
          if (conjunto.length === 0) return;
          evento.preventDefault();
          copia.current = [...conjunto];
          removerSelecionadosRef.current(conjunto.map((codigo) => codigo.id));
          return;

        case "colar": {
          const guardado = copia.current;
          if (!guardado || guardado.length === 0) return;
          evento.preventDefault();
          duplicarConjuntoRef.current(guardado);
          return;
        }

        case "remover":
          if (conjunto.length === 0) return;
          evento.preventDefault();
          removerSelecionadosRef.current(conjunto.map((codigo) => codigo.id));
          return;

        case "mover-esquerda":
          evento.preventDefault();
          deslocar(-1, 0, evento.shiftKey);
          return;
        case "mover-direita":
          evento.preventDefault();
          deslocar(1, 0, evento.shiftKey);
          return;
        case "mover-cima":
          evento.preventDefault();
          deslocar(0, -1, evento.shiftKey);
          return;
        case "mover-baixo":
          evento.preventDefault();
          deslocar(0, 1, evento.shiftKey);
          return;

        case "zoom-mais":
          aplicarZoomRef.current((atual) => atual * 1.25);
          return;
        case "zoom-menos":
          aplicarZoomRef.current((atual) => atual / 1.25);
          return;
        case "zoom-encaixar":
          encaixarNaTelaRef.current();
          return;

        case "atalhos":
          setMostrandoAtalhos((atual) => !atual);
          return;

        case "modo-mover":
        case "modo-mao":
        case "modo-escala": {
          const ferramenta = atalho.slice("modo-".length) as FerramentaDeManipulacao;
          setFerramentaDeManipulacao(ferramenta);
          setModo(ferramenta);
          return;
        }
        case "modo-medir":
          setModo("medir");
          return;
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [deslocar]);

  /**
   * Envolve uma ação discreta numa entrada de histórico própria.
   *
   * O `encerrar` antes de abrir é a rede: se um gesto ficou aberto porque o
   * `pointerup` se perdeu — o ponteiro saiu da janela, o navegador comeu o
   * evento —, a ação seguinte não se junta a ele.
   */
  const comoUmaEntrada = useCallback((acao: () => void) => {
    historicoRef.current.encerrar();
    historicoRef.current.abrir();
    acao();
    historicoRef.current.encerrar();
  }, []);

  const removerCodigo = useCallback(
    (id: string) => {
      comoUmaEntrada(() =>
        historicoRef.current.aplicar((atual: Layout) => ({
          ...atual,
          codigos: atual.codigos.filter((c) => c.id !== id),
        }))
      );
      setSelecionados((atual) => atual.filter((outro) => outro !== id));
    },
    [comoUmaEntrada]
  );

  // Os atalhos são assinados uma única vez e alcançam as ações por ref, para
  // não reassinar a janela a cada render.
  const removerCodigoRef = useRef(removerCodigo);
  removerCodigoRef.current = removerCodigo;
  const exportarLayoutRef = useRef(exportarLayout);
  exportarLayoutRef.current = exportarLayout;

  function aplicarPreset() {
    comoUmaEntrada(() => historicoRef.current.aplicar(layoutRoe01()));
    setSelecionados([]);
    setConfirmandoPreset(false);
    toast.success("Layout do FORM ROE 01 aplicado: 15 códigos.");
  }

  /** Remove todos os selecionados numa entrada de histórico. */
  const removerSelecionados = useCallback(
    (ids: readonly string[]) => {
      if (ids.length === 0) return;
      const fora = new Set(ids);
      comoUmaEntrada(() =>
        historicoRef.current.aplicar((atual: Layout) => ({
          ...atual,
          codigos: atual.codigos.filter((codigo) => !fora.has(codigo.id)),
        }))
      );
      setSelecionados([]);
    },
    [comoUmaEntrada]
  );

  /**
   * Duplica sem deslocar, para o gesto de Alt+arrasto.
   *
   * Devolve os ids das cópias na mesma ordem dos originais, e não desloca
   * nada: quem move é o arrasto que começou. Deslocar aqui faria a cópia
   * saltar antes de a mão pedir.
   */
  const duplicarParaArrastar = useCallback(
    (ids: readonly string[]): string[] => {
      const originais = layoutRef.current.codigos.filter((c) => ids.includes(c.id));
      if (originais.length === 0) return [];
      const clones = originais.map((codigo) => ({ ...codigo, id: novoId() }));
      if (layoutRef.current.codigos.length + clones.length > LIMITES.codigosMaximo) {
        // Sem o aviso, o gesto degradaria para um simples mover e a pessoa
        // ficaria esperando uma cópia que não veio.
        toast.error(
          `A folha chegou no limite de ${LIMITES.codigosMaximo} códigos. Apague algum para duplicar.`
        );
        return [];
      }
      historicoRef.current.aplicar((atual: Layout) => ({
        ...atual,
        codigos: [...atual.codigos, ...clones],
      }));
      return clones.map((c) => c.id);
    },
    []
  );

  /** Duplica um conjunto deslocado, e deixa as cópias selecionadas. */
  const duplicarConjunto = useCallback(
    (originais: readonly Codigo[]) => {
      if (originais.length === 0) return;
      const clones = originais.map((codigo) => ({
        ...codigo,
        id: novoId(),
        x: Number((codigo.x + 5).toFixed(2)),
        y: Number((codigo.y + 5).toFixed(2)),
      }));
      comoUmaEntrada(() =>
        historicoRef.current.aplicar((atual: Layout) => ({
          ...atual,
          codigos: [...atual.codigos, ...clones].slice(0, LIMITES.codigosMaximo),
        }))
      );
      setSelecionados(clones.map((clone) => clone.id));
    },
    [comoUmaEntrada]
  );

  const duplicarConjuntoRef = useRef(duplicarConjunto);
  duplicarConjuntoRef.current = duplicarConjunto;
  const removerSelecionadosRef = useRef(removerSelecionados);
  removerSelecionadosRef.current = removerSelecionados;

  /**
   * Alinha o que está selecionado.
   *
   * Com um código, a moldura é a folha; com vários, é a própria seleção. A
   * distinção está em `alinharConjunto` — aqui é só uma entrada de histórico.
   */
  const alinhar = useCallback(
    (como: Alinhar) => {
      const conjunto = conjuntoRef.current;
      if (conjunto.length === 0) return;
      const destinos = alinharConjunto(conjunto, layoutRef.current.pagina, como);
      comoUmaEntrada(() =>
        atualizarVarios(destinos.map(({ id, x, y }) => ({ id, mudanca: { x, y } })))
      );
    },
    [comoUmaEntrada, atualizarVarios]
  );

  /** Escreve a mesma medida em todos os selecionados, numa entrada só. */
  const aplicarATodos = useCallback(
    (mudanca: Partial<Codigo>) => {
      const conjunto = conjuntoRef.current;
      if (conjunto.length === 0) return;
      atualizarVarios(conjunto.map((codigo) => ({ id: codigo.id, mudanca })));
    },
    [atualizarVarios]
  );

  /**
   * Gira a seleção em torno do centro comum.
   *
   * Aqui é seguro onde escalar não seria: rotação é transformação rígida, cada
   * código mantém as dimensões e nenhuma barra deforma.
   */
  const girarSelecao = useCallback(
    (graus: number) => {
      const destinos = girarConjunto(conjuntoRef.current, graus);
      if (destinos.length === 0) return;
      comoUmaEntrada(() =>
        atualizarVarios(
          destinos.map(({ id, x, y, rotacao }) => ({ id, mudanca: { x, y, rotacao } }))
        )
      );
    },
    [comoUmaEntrada, atualizarVarios]
  );

  /** Iguala os vãos da seleção no eixo dado. Precisa de três ou mais. */
  const distribuir = useCallback(
    (eixo: "x" | "y") => {
      const destinos = distribuirConjunto(conjuntoRef.current, eixo);
      if (destinos.length === 0) return;
      comoUmaEntrada(() =>
        atualizarVarios(destinos.map(({ id, x, y }) => ({ id, mudanca: { x, y } })))
      );
    },
    [comoUmaEntrada, atualizarVarios]
  );

  const anotarEmissao = (id: string, nota: string) => {
    setEmissoes((atual) => {
      const proxima = atual.map((e) => (e.id === id ? { ...e, nota } : e));
      gravarEmissoes(proxima);
      return proxima;
    });
  };

  const apagarEmissao = (id: string) => {
    setEmissoes((atual) => {
      const proxima = atual.filter((e) => e.id !== id);
      gravarEmissoes(proxima);
      return proxima;
    });
  };

  function adicionarCodigo() {
    const novo = codigoPadrao(layout.pagina, layout.digitos);
    comoUmaEntrada(() =>
      historicoRef.current.aplicar((atual: Layout) => ({
        ...atual,
        codigos: [...atual.codigos, novo],
      }))
    );
    setSelecionados([novo.id]);
  }

  // Desloca a cópia alguns milímetros, como qualquer editor: sobreposta ao
  // original ela pareceria não ter sido criada.
  const duplicarCodigo = (codigo: Codigo) => duplicarConjunto([codigo]);

  async function escolherArte(arquivo: File | undefined) {
    if (!arquivo) return;
    try {
      const nova = await lerArquivoDeArte(arquivo);
      setArte(nova);
      // Palpite pessimista já no primeiro render: a medição é assíncrona, e
      // até ela chegar a trava de tamanho não pode achar que a arte é grátis.
      setBytesDaArte(estimarBytesDaArte(nova));
      await medirEGuardarArte(nova);
      toast.success(`Arte carregada: ${nova.nome}`);
    } catch (erro) {
      console.error("Falha ao carregar a arte:", erro);
      toast.error(
        erro instanceof ArteInvalidaError ? erro.message : "Não foi possível carregar a arte."
      );
    }
  }

  function removerArte() {
    setArte(null);
    setBytesDaArte(0);
    gravarArte(null).catch((erro) => console.error("Falha ao apagar a arte guardada:", erro));
  }

  function exportarLayout() {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" });
    baixar(blob, "layout-codigos.json");
  }

  async function importarLayout(arquivo: File | undefined) {
    if (!arquivo) return;
    try {
      const novo = normalizarLayout(JSON.parse(await arquivo.text()));
      comoUmaEntrada(() => historicoRef.current.aplicar(novo));
      setSelecionados([]);
      toast.success("Layout carregado.");
    } catch (erro) {
      console.error("Falha ao importar o layout:", erro);
      toast.error("O arquivo não é um layout válido. Use um JSON exportado por esta página.");
    }
  }

  /**
   * O aviso de sobreposição, junto dos outros.
   *
   * Entra como atenção e não como erro de propósito: reemitir um lote perdido
   * é necessidade real numa gráfica, e travar nisso faria a ferramenta ser
   * contornada por fora — aí o histórico deixaria de valer para tudo.
   */
  const cruzadas = useMemo(
    () => sobreposicoes(faixa, emissoes),
    [faixa, emissoes]
  );

  const avisos = useMemo(
    () => [
      ...avaliarLayout(layout),
      ...avaliarFaixa(faixa, layout, bytesDaArte),
      ...(cruzadas.length > 0
        ? [
            {
              gravidade: "atencao" as const,
              mensagem: descreverSobreposicao(faixa, layout.digitos, cruzadas),
            },
          ]
        : []),
    ],
    [layout, faixa, bytesDaArte, cruzadas]
  );
  const estimativa = useMemo(
    () => estimarTamanho(layout, faixa, bytesDaArte),
    [layout, faixa, bytesDaArte]
  );
  const erros = avisos.filter((aviso) => aviso.gravidade === "erro");
  const temSelecao = codigosSelecionados.length > 0;
  const primeiroErro = erros[0];

  /**
   * Quais campos estão errados, para o contorno vermelho aparecer neles.
   *
   * Sai das mesmas condições da conferência, e não de um segundo conjunto de
   * regras: duas fontes de verdade divergiriam na primeira mudança de limite.
   */
  const camposInvalidos = useMemo(() => {
    const maiorNumero = 10 ** layout.digitos - 1;
    const foraDaPagina = new Set(
      avisos
        .filter((aviso) => aviso.gravidade === "erro" && aviso.codigoId)
        .map((aviso) => aviso.codigoId!)
    );
    return {
      // A faixa invertida acusa nos dois campos: o operador pode querer
      // corrigir qualquer um deles, e apontar só um escolheria por ele.
      de: faixa.ate < faixa.de,
      ate: faixa.ate < faixa.de || faixa.ate > maiorNumero,
      posicao: (id: string) => foraDaPagina.has(id),
    };
  }, [avisos, faixa.de, faixa.ate, layout.digitos]);
  const totalPaginas = Math.max(0, faixa.ate - faixa.de + 1);
  const totalArquivos = contarArquivos(faixa);
  const gerando = progresso !== null;

  async function gerar() {
    const primeiroErro = erros[0];
    if (primeiroErro) {
      toast.error(primeiroErro.mensagem);
      return;
    }
    if (gerando) return;

    const controle = new AbortController();
    cancelamento.current = controle;
    setProgresso({
      paginasFeitas: 0,
      totalPaginas,
      arquivosFeitos: 0,
      totalArquivos,
      decorrido: 0,
      restante: null,
    });

    try {
      // O `jspdf` só é baixado quando alguém de fato gera: são mais de cem
      // quilobytes que a maioria das visitas nunca precisa.
      const { gerarPdfs } = await import("@/lib/barcodePdf");
      const resultado = await gerarPdfs({
        layout,
        faixa,
        fundo: arte ? { dataUrl: arte.dataUrl, formato: arte.formato } : null,
        aoProgredir: setProgresso,
        sinal: controle.signal,
      });
      baixar(resultado.blob, resultado.nome);
      // Registra só depois de o arquivo sair: uma emissão anotada que não
      // chegou ao disco faria o aviso de sobreposição mentir para sempre.
      setEmissoes((atual) => {
        const proxima = [
          novaEmissao({
            faixa,
            digitos: layout.digitos,
            arquivo: resultado.nome,
            paginas: resultado.paginas,
            arquivos: resultado.arquivos,
          }),
          ...atual,
        ];
        gravarEmissoes(proxima);
        return proxima;
      });
      toast.success(
        resultado.arquivos > 1
          ? `${resultado.paginas.toLocaleString("pt-BR")} páginas em ${resultado.arquivos} arquivos: ${resultado.nome}`
          : `${resultado.paginas.toLocaleString("pt-BR")} páginas: ${resultado.nome}`
      );
    } catch (erro) {
      if (ehFalhaDeCarregamento(erro)) {
        console.error("Falha ao carregar o motor de PDF:", erro);
        toast.error(AVISO_DE_RECARGA);
        return;
      }
      const { GeracaoCancelada, FaixaInvalidaError } = await import("@/lib/barcodePdf");
      if (erro instanceof GeracaoCancelada) toast("Geração cancelada. Nada foi baixado.");
      else if (erro instanceof FaixaInvalidaError) toast.error(erro.message);
      else {
        console.error("Falha na geração:", erro);
        toast.error(
          erro instanceof RangeError
            ? "O navegador ficou sem memória. Reduza a faixa ou use uma arte mais leve."
            : "A geração falhou. Tente uma faixa menor ou reduza o tamanho da arte de fundo."
        );
      }
    } finally {
      setProgresso(null);
      cancelamento.current = null;
    }
  }

  async function baixarAmostra() {
    if (erros.some((aviso) => !aviso.codigoId) || layout.codigos.length === 0) {
      toast.error(erros[0]?.mensagem ?? "Adicione ao menos um código.");
      return;
    }
    setAmostrando(true);
    try {
      const { gerarAmostra } = await import("@/lib/barcodePdf");
      const blob = await gerarAmostra(
        layout,
        faixa.de,
        arte ? { dataUrl: arte.dataUrl, formato: arte.formato } : null
      );
      baixar(blob, `amostra-${formatarValor(faixa.de, layout.digitos)}.pdf`);
    } catch (erro) {
      console.error("Falha ao gerar a amostra:", erro);
      toast.error(
        ehFalhaDeCarregamento(erro) ? AVISO_DE_RECARGA : "Não foi possível gerar a amostra."
      );
    } finally {
      setAmostrando(false);
    }
  }

  const idTamanho =
    TAMANHOS_PAGINA.find(
      (opcao) =>
        opcao.pagina.largura === layout.pagina.largura &&
        opcao.pagina.altura === layout.pagina.altura
    )?.id ?? "personalizado";

  const proporcaoArte = arte ? arte.largura / arte.altura : null;
  const proporcaoPagina = layout.pagina.largura / layout.pagina.altura;
  const arteDesalinhada =
    proporcaoArte !== null && Math.abs(proporcaoArte - proporcaoPagina) / proporcaoPagina > 0.01;

  return (
    <div className="flex h-full min-h-0 w-full flex-col lg:flex-row">
      {/* Área da folha */}
      <div ref={areaRef} className="relative min-h-[380px] flex-1 overflow-hidden bg-muted/50">
        {/* Só este nível rola: a barra de ferramentas é irmã dele e fica
            parada. O pan é rolagem, e não uma transformação, porque assim o
            trackpad de dois dedos continua sendo a rolagem nativa do
            navegador — mais suave que qualquer reimplementação. */}
        <div
          ref={roloRef}
          onPointerDown={(evento) => {
            // Mão, espaço, ou botão do meio, que é o pan de sempre.
            if (maoAtiva || evento.button === 1) iniciarArrastoDaVista(evento);
          }}
          onPointerMove={seguirArrastoDaVista}
          onPointerUp={terminarArrastoDaVista}
          onPointerCancel={terminarArrastoDaVista}
          className={cn(
            "h-full w-full overflow-auto",
            maoAtiva && "cursor-grab active:cursor-grabbing"
          )}
        >
        {/* A folga de um viewport inteiro em cada direção é o que faz o pan
            valer a pena: dá para levar a folha para fora da tela e voltar,
            como em qualquer canvas. `w-max` impede o contêiner de esticar e
            achatar a folga. */}
        <div className="w-max p-[100vmax]">
        <div
          className="grid shrink-0"
          style={
            reguasVisiveis
              ? {
                  gridTemplateAreas: '"canto topo" "lado folha"',
                  gridTemplateColumns: `${REGUA_PX}px auto`,
                  gridTemplateRows: `${REGUA_PX}px auto`,
                }
              : undefined
          }
        >
          {reguasVisiveis && (
            <Reguas
              pagina={layout.pagina}
              escala={escala}
              unidade={unidade}
              selecionado={codigoAtivo}
            />
          )}
          <div style={reguasVisiveis ? { gridArea: "folha" } : undefined}>
        <PreviaFolha
          layout={layout}
          arte={arte}
          valor={formatarValor(faixa.de, layout.digitos)}
          selecionados={selecionados}
          aoSelecionar={setSelecionados}
          aoAlterar={alterarPorGesto}
          aoIniciarGesto={iniciarGestoNoHistorico}
          aoDuplicarArrastando={duplicarParaArrastar}
          aoTerminarGesto={terminarGestoNoHistorico}
          abortarGesto={abortarGesto}
          escala={escala}
          // O espaço pressionado vale como ferramenta Mão para a folha: sem
          // isto a marquise consome o `pointerdown` com `stopPropagation` e o
          // contêiner que rola nunca recebe o arrasto. A barra de ferramentas
          // continua mostrando a ferramenta de verdade.
          modo={maoAtiva ? "mao" : modo}
          unidade={unidade}
        />
          </div>
        </div>
        </div>
        </div>

        {/* Barra de ferramentas: centralizada no rodapé da área
            da folha. Desfazer fica à esquerda porque é histórico do documento,
            não ferramenta. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 grid grid-cols-[1fr_auto_1fr] items-end gap-3 p-3">
          <div className="pointer-events-auto flex w-fit items-center gap-px rounded-lg border border-border bg-background p-1 shadow-sm">
            <button
              type="button"
              aria-label="Desfazer"
              title={`Desfazer  ${rotuloDoAtalho("Ctrl+Z", ehMac)}`}
              disabled={!historico.podeDesfazer}
              onClick={() => historico.desfazer()}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Refazer"
              title={`Refazer  ${rotuloDoAtalho("Ctrl+Shift+Z", ehMac)}`}
              disabled={!historico.podeRefazer}
              onClick={() => historico.refazer()}
              className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-border bg-background p-1.5 shadow-lg">
            {/* Botão da ferramenta de manipulação, com o menu das três ao
                lado — a gramática de qualquer editor de canvas: o botão aplica
                a última escolhida, a seta abre as opções. */}
            <div className="flex items-center">
              <button
                type="button"
                title={`${FERRAMENTAS[ferramentaDeManipulacao].nome}  ${FERRAMENTAS[ferramentaDeManipulacao].tecla}`}
                aria-label={FERRAMENTAS[ferramentaDeManipulacao].nome}
                aria-pressed={modo === ferramentaDeManipulacao}
                onClick={() => setModo(ferramentaDeManipulacao)}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-s-lg transition-colors",
                  modo === ferramentaDeManipulacao
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {(() => {
                  const Icone = FERRAMENTAS[ferramentaDeManipulacao].icone;
                  return <Icone className="h-4 w-4" />;
                })()}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Escolher ferramenta"
                  className={cn(
                    "grid h-9 w-4 place-items-center rounded-e-lg transition-colors",
                    modo === ferramentaDeManipulacao
                      ? "bg-foreground/85 text-background hover:bg-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="min-w-[11rem]">
                  {FERRAMENTAS_DE_MANIPULACAO.map((id) => {
                    const { nome, tecla, icone: Icone } = FERRAMENTAS[id];
                    return (
                      <DropdownMenuItem
                        key={id}
                        className="gap-2 text-xs"
                        onClick={() => {
                          setFerramentaDeManipulacao(id);
                          setModo(id);
                        }}
                      >
                        <Check
                          className={cn("h-3 w-3", modo === id ? "opacity-100" : "opacity-0")}
                        />
                        <Icone className="h-3.5 w-3.5" />
                        <span className="flex-1">{nome}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{tecla}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <span aria-hidden className="mx-0.5 h-6 w-px bg-border" />

            <button
              type="button"
              title={`${FERRAMENTAS.medir.nome}  ${FERRAMENTAS.medir.tecla}`}
              aria-label={FERRAMENTAS.medir.nome}
              aria-pressed={modo === "medir"}
              onClick={() => setModo("medir")}
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg transition-colors",
                modo === "medir"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Ruler className="h-4 w-4" />
            </button>
          </div>

          {/* Terceira coluna vazia: o grid de 1fr auto 1fr é o que põe a barra
              no centro exato, sem depender da largura do bloco da esquerda. */}
          <div aria-hidden />
        </div>
      </div>

      {/* Painel */}
      <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-t border-border lg:w-[340px] lg:border-e-0 lg:border-s lg:border-t-0">
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="flex items-center gap-2 text-sm font-medium leading-none tracking-tight">
              <Barcode className="h-4 w-4 text-muted-foreground" />
              Gerador de código de barras
            </h1>

            <button
              type="button"
              aria-label="Ver os atalhos"
              title={`Atalhos  ${rotuloDoAtalho("?", ehMac)}`}
              onClick={() => setMostrandoAtalhos(true)}
              className="ms-auto grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Keyboard className="h-3.5 w-3.5" />
            </button>

            {/* Zoom no alto do painel, como em qualquer editor: é estado da
                vista, não ferramenta, e no rodapé disputava espaço com a barra
                de ferramentas. */}
            <DropdownMenu>
              <DropdownMenuTrigger className="-me-1 flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-1 font-mono text-[11px] tabular-nums text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {Math.round(escala * PX_POR_MM_A_100)}%
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[9rem]">
                <DropdownMenuItem
                  className="justify-between text-xs"
                  onClick={encaixarNaTela}
                >
                  Encaixar na tela
                  <span className="font-mono text-[10px] text-muted-foreground">0</span>
                </DropdownMenuItem>
                {[50, 100, 150, 200, 400].map((porcento) => (
                  <DropdownMenuItem
                    key={porcento}
                    className="text-xs"
                    onClick={() => aplicarZoom(porcento / PX_POR_MM_A_100)}
                  >
                    {porcento}%
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Monte a folha uma vez, gere a numeração inteira em Code 128 e imprima o intervalo que
            precisar. Nada sai do seu navegador.
          </p>
        </div>

        {/* Propriedades do documento: só com nada selecionado.

            É o comportamento do Figma — o painel da direita fala do documento
            quando nada está escolhido, e do objeto quando algo está. Sem isso,
            quem seleciona um código precisa rolar por cinco seções que não
            têm relação com o que está na mão. */}
        {!temSelecao && (
          <>
        <Secao
          titulo="Página"
          acao={
            <div className="flex items-center gap-px rounded-md border border-input p-px">
              {UNIDADES.map(({ id, rotulo, nome }) => (
                <button
                  key={id}
                  type="button"
                  title={nome}
                  aria-pressed={unidade === id}
                  onClick={() => {
                    setUnidade(id);
                    gravarUnidade(id);
                  }}
                  className={cn(
                    "h-5 rounded px-1.5 text-[10px] transition-colors",
                    unidade === id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          }
        >
          <Select
            value={idTamanho}
            onValueChange={(valor) => {
              const opcao = TAMANHOS_PAGINA.find((item) => item.id === valor);
              if (opcao) {
                comoUmaEntrada(() =>
                  historicoRef.current.aplicar((atual: Layout) => ({
                    ...atual,
                    pagina: opcao.pagina,
                  }))
                );
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Tamanho" />
            </SelectTrigger>
            <SelectContent>
              {TAMANHOS_PAGINA.map((opcao) => (
                <SelectItem key={opcao.id} value={opcao.id} className="text-xs">
                  {opcao.nome}
                </SelectItem>
              ))}
              {idTamanho === "personalizado" && (
                <SelectItem value="personalizado" className="text-xs">
                  Personalizado
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <CampoDeLayout
              aoIniciarGesto={iniciarGestoNoHistorico}
              aoTerminarGesto={terminarGestoNoHistorico}
              rotulo="L"
              unidade={unidade}
              valorMm={layout.pagina.largura}
              minMm={LIMITES.pagina.min}
              maxMm={LIMITES.pagina.max}
              aoMudarMm={(largura) =>
                aplicarNoLayout((atual: Layout) => ({ ...atual, pagina: { ...atual.pagina, largura } }))
              }
            />
            <CampoDeLayout
              aoIniciarGesto={iniciarGestoNoHistorico}
              aoTerminarGesto={terminarGestoNoHistorico}
              rotulo="A"
              unidade={unidade}
              valorMm={layout.pagina.altura}
              minMm={LIMITES.pagina.min}
              maxMm={LIMITES.pagina.max}
              aoMudarMm={(altura) =>
                aplicarNoLayout((atual: Layout) => ({ ...atual, pagina: { ...atual.pagina, altura } }))
              }
            />
          </div>
        </Secao>

        {/* Linha de arte no formato de uma camada: miniatura, opacidade, o
            olho que mostra ou esconde e o menos que remove. O + do cabeçalho
            é o que carrega — a mesma gramática de qualquer painel de camada. */}
        <Secao
          titulo="Arte de fundo"
          acao={
            <button
              type="button"
              aria-label="Carregar arte de fundo"
              title="Carregar PNG ou JPEG"
              onClick={() => arquivoArteRef.current?.click()}
              className="grid h-5 w-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        >
          <input
            ref={arquivoArteRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(evento) => {
              void escolherArte(evento.target.files?.[0]);
              evento.target.value = "";
            }}
          />

          {arte ? (
            <>
              <div className="flex h-9 items-center gap-2 rounded-md border border-input ps-1.5 pe-1">
                {/* A miniatura é a própria arte: reconhecer o formulário certo
                    pelo desenho é mais rápido que ler o nome do arquivo. */}
                <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded border border-border bg-white">
                  {/* `next/image` não serve aqui: a arte é um `data:` URL do
                      arquivo local do operador, que o otimizador não alcança —
                      ele precisa de URL estática ou remota. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={arte.dataUrl} alt="" className="h-full w-full object-contain" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[11px]" title={arte.nome}>
                  {arte.nome}
                </span>

                <label className="flex h-7 shrink-0 items-center gap-0.5 rounded ps-1 pe-1 text-[11px] text-muted-foreground focus-within:text-foreground">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label="Opacidade da arte, em porcento"
                    value={Math.round(layout.arte.opacidade * 100)}
                    onChange={(evento) => {
                      const digitos = evento.target.value.replace(/[^0-9]/g, "");
                      // Campo vazio é meio de digitar, não "zero por cento":
                      // apagar para trocar o número não pode sumir com a arte.
                      if (digitos === "") return;
                      const porcento = Number(digitos);
                      if (!Number.isFinite(porcento)) return;
                      aplicarNoLayout((atual: Layout) => ({
                        ...atual,
                        arte: {
                          ...atual.arte,
                          opacidade: Math.min(1, Math.max(0, porcento / 100)),
                        },
                      }));
                    }}
                    onFocus={(evento) => evento.currentTarget.select()}
                    className="w-7 bg-transparent text-right font-mono text-xs tabular-nums outline-none"
                  />
                  %
                </label>

                <button
                  type="button"
                  aria-label={layout.arte.visivel ? "Esconder a arte" : "Mostrar a arte"}
                  aria-pressed={layout.arte.visivel}
                  title={layout.arte.visivel ? "Esconder a arte" : "Mostrar a arte"}
                  onClick={() =>
                    comoUmaEntrada(() =>
                      aplicarNoLayout((atual: Layout) => ({
                        ...atual,
                        arte: { ...atual.arte, visivel: !atual.arte.visivel },
                      }))
                    )
                  }
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded transition-colors hover:bg-muted",
                    layout.arte.visivel ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {layout.arte.visivel ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  aria-label="Remover a arte"
                  title="Remover a arte"
                  onClick={removerArte}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
              </div>

              {arteDesalinhada && (
                <Dica>
                  A arte é {arte.largura}×{arte.altura} px, proporção diferente da página. Ela vai
                  ser esticada — ajuste o tamanho da página para bater com o original.
                </Dica>
              )}

              {bytesDaArte > 0 && (
                <Dica>
                  Ocupa{" "}
                  <span className="font-mono tabular-nums text-foreground">
                    {formatarBytes(bytesDaArte)}
                  </span>{" "}
                  dentro de cada PDF gerado — entra uma vez por arquivo, não uma por página.
                  {arte.formato === "PNG" && bytesDaArte > 3 * 1024 * 1024
                    ? " O PNG é guardado como bitmap, então o custo vem dos pixels, não do tamanho do arquivo. Salvar este mesmo formulário em JPEG derruba isso para uma fração."
                    : ""}
                </Dica>
              )}
            </>
          ) : (
            <Dica>
              Sem arte, a folha sai só com os códigos. Use o + para carregar o formulário — prefira
              JPEG, que entra no PDF sem recodificar. O PNG é guardado como bitmap, a cerca de 4
              bytes por pixel.
            </Dica>
          )}
        </Secao>

        <Secao titulo="Numeração">
          <div className="grid grid-cols-3 gap-2">
            <CampoNumero
              rotulo="de"
              invalido={camposInvalidos.de}
              valor={faixa.de}
              casas={0}
              passo={1}
              min={0}
              aoMudar={(de) => setFaixa((atual) => ({ ...atual, de }))}
            />
            <CampoNumero
              rotulo="até"
              invalido={camposInvalidos.ate}
              valor={faixa.ate}
              casas={0}
              passo={1}
              min={0}
              aoMudar={(ate) => setFaixa((atual) => ({ ...atual, ate }))}
            />
            <CampoNumero
              aoIniciarGesto={iniciarGestoNoHistorico}
              aoTerminarGesto={terminarGestoNoHistorico}
              rotulo="díg."
              rotuloAcessivel="dígitos da numeração"
              valor={layout.digitos}
              casas={0}
              passo={1}
              min={LIMITES.digitos.min}
              max={LIMITES.digitos.max}
              aoMudar={(digitos) => aplicarNoLayout((atual: Layout) => ({ ...atual, digitos }))}
            />
          </div>
          {/* Quantidade em vez de aritmética mental: "de 70000 até 75000" são
              5.001 folhas, porque as duas pontas entram. Quem precisa de cinco
              mil escreve cinco mil aqui e o "até" se acerta sozinho. */}
          <div className="grid grid-cols-2 gap-2">
            <CampoNumero
              rotulo="quantidade"
              rotuloAcessivel="quantidade de páginas"
              valor={totalPaginas}
              casas={0}
              passo={1}
              min={1}
              max={LIMITES.paginasMaximo}
              aoMudar={(quantidade) =>
                setFaixa((atual) => ({
                  ...atual,
                  ate: atual.de + Math.max(1, Math.round(quantidade)) - 1,
                }))
              }
            />
            <CampoNumero
              rotulo="por arquivo"
              rotuloAcessivel="páginas por arquivo"
              valor={faixa.paginasPorArquivo}
              casas={0}
              passo={10}
              min={1}
              max={LIMITES.paginasMaximo}
              aoMudar={(paginasPorArquivo) =>
                setFaixa((atual) => ({ ...atual, paginasPorArquivo }))
              }
            />
          </div>
          <Dica>
            {totalPaginas.toLocaleString("pt-BR")}{" "}
            {totalPaginas === 1 ? "página" : "páginas"}, de{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatarValor(faixa.de, layout.digitos)}
            </span>{" "}
            a{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatarValor(faixa.ate, layout.digitos)}
            </span>{" "}
            (as duas entram), em {totalArquivos}{" "}
            {totalArquivos === 1 ? "arquivo" : "arquivos"}
            {totalArquivos > 1 ? ", baixados num .zip" : ""}, perto de{" "}
            <span className="font-mono tabular-nums text-foreground">
              {formatarBytes(estimativa.total)}
            </span>
            {totalArquivos > 1 ? ` (${formatarBytes(estimativa.porArquivo)} por arquivo)` : ""}.{" "}
            {layout.digitos % 2 === 0
              ? "Com um número par de dígitos o código usa o subset C e fica com metade das barras."
              : "Um número ímpar de dígitos força o subset B: o código fica quase duas vezes mais largo. Prefira um par."}
          </Dica>
        </Secao>

        {/* Emissões: o controle de onde a numeração parou.
            Vem antes dos códigos porque é o que o operador consulta ao chegar
            para um serviço novo — a pergunta é "até onde eu já fui", não
            "como está a folha". */}
        {emissoes.length > 0 && (
          <Secao
            titulo={`Emissões · ${emissoes.length}`}
            acao={
              <button
                type="button"
                onClick={() => setLimpandoEmissoes(true)}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Limpar
              </button>
            }
          >
            <div className="max-h-56 space-y-1.5 overflow-y-auto">
              {emissoes.map((emissao) => (
                <div key={emissao.id} className="group rounded-md border border-input p-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] tabular-nums text-foreground">
                      {formatarValor(emissao.de, emissao.digitos)}–
                      {formatarValor(emissao.ate, emissao.digitos)}
                    </span>
                    <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">
                      {new Date(emissao.em).toLocaleDateString("pt-BR")}
                    </span>
                    <button
                      type="button"
                      aria-label={`Apagar a emissão ${formatarValor(emissao.de, emissao.digitos)}`}
                      title="Apagar do histórico"
                      onClick={() => apagarEmissao(emissao.id)}
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {emissao.paginas.toLocaleString("pt-BR")}{" "}
                    {emissao.paginas === 1 ? "página" : "páginas"} · {emissao.arquivo}
                  </p>
                  {/* A anotação é o que liga a faixa ao serviço: sem ela o
                      aviso de sobreposição diz "de 30/08" e o operador não
                      lembra de que cliente era. */}
                  <input
                    type="text"
                    value={emissao.nota}
                    onChange={(evento) => anotarEmissao(emissao.id, evento.target.value)}
                    placeholder="Cliente ou serviço"
                    maxLength={120}
                    aria-label={`Anotação da emissão ${formatarValor(emissao.de, emissao.digitos)}`}
                    className="mt-1 w-full bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </Secao>
        )}

        <Secao
          titulo={`Códigos na folha · ${layout.codigos.length}`}
          acao={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmandoPreset(true)}
                className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
              >
                FORM ROE 01
              </button>
              <button
                type="button"
                aria-label="Adicionar código"
                onClick={adicionarCodigo}
                className="grid h-5 w-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          }
        >
          <div className="max-h-44 space-y-px overflow-y-auto">
            {layout.codigos.map((codigo, indice) => {
              const ativo = selecionados.includes(codigo.id);
              return (
                <div
                  key={codigo.id}
                  className={cn(
                    "group flex h-7 items-center gap-2 rounded px-2 text-[11px] transition-colors",
                    ativo ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <button
                    type="button"
                    // Shift ou ⌘ na lista somam à seleção, igual ao clique na
                    // folha: são as duas formas de montar o mesmo grupo.
                    onClick={(evento) =>
                      setSelecionados((atual) =>
                        evento.shiftKey || evento.metaKey || evento.ctrlKey
                          ? atual.includes(codigo.id)
                            ? atual.filter((outro) => outro !== codigo.id)
                            : [...atual, codigo.id]
                          : [codigo.id]
                      )
                    }
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {/* O ícone acompanha o giro real, e não só os quadrantes:
                        na lista, é o que deixa reconhecer a etiqueta deitada
                        sem abrir o inspetor. */}
                    <Barcode
                      className="h-3 w-3 shrink-0"
                      style={{ transform: `rotate(${codigo.rotacao}deg)` }}
                    />
                    <span className="truncate">Código {indice + 1}</span>
                    <span className="ms-auto shrink-0 font-mono tabular-nums opacity-60">
                      {codigo.x.toFixed(1)}, {codigo.y.toFixed(1)}
                      {normalizarAngulo(codigo.rotacao) !== 0
                        ? ` · ${Number(codigo.rotacao.toFixed(1))}°`
                        : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Duplicar código ${indice + 1}`}
                    onClick={() => duplicarCodigo(codigo)}
                    className="opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover código ${indice + 1}`}
                    onClick={() => removerCodigo(codigo.id)}
                    className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
            {layout.codigos.length === 0 && (
              <Dica>Nenhum código ainda. Use o + para adicionar o primeiro.</Dica>
            )}
          </div>
        </Secao>

          </>
        )}
        {codigosSelecionados.length > 1 && (
          <Secao
            refSecao={inspetorRef}
            titulo={`${codigosSelecionados.length} códigos selecionados`}
          >
            <div className="flex items-center gap-1">
              {GRUPOS_DE_ALINHAMENTO.map((grupo, indice) => (
                <div
                  key={indice}
                  className="grid flex-1 grid-cols-3 gap-px rounded-md border border-input p-px"
                >
                  {grupo.map(([como, Icone, , dicaConjunto]) => (
                    <button
                      key={como}
                      type="button"
                      title={dicaConjunto}
                      aria-label={dicaConjunto}
                      onClick={() => alinhar(como)}
                      className="grid h-[26px] place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Icone className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Distribuir precisa de três: com dois não há vão do meio para
                igualar, e o botão prometeria algo que não acontece. */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={codigosSelecionados.length < 3}
                onClick={() => distribuir("x")}
                title="Igualar os vãos na horizontal"
                className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-input text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <AlignHorizontalSpaceAround className="h-3.5 w-3.5" />
                Vãos iguais
              </button>
              <button
                type="button"
                disabled={codigosSelecionados.length < 3}
                onClick={() => distribuir("y")}
                title="Igualar os vãos na vertical"
                className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-input text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
              >
                <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
                Vãos iguais
              </button>
            </div>

            {/* Girar o conjunto: rígido, então seguro. Escalar o conjunto
                continua de fora, porque aí sim as barras cisalhariam. */}
            <div className="grid grid-cols-2 gap-2">
              {([-90, 90] as const).map((graus) => (
                <button
                  key={graus}
                  type="button"
                  onClick={() => girarSelecao(graus)}
                  title={`Girar a seleção ${Math.abs(graus)}° ${graus > 0 ? "no sentido horário" : "no anti-horário"}`}
                  className="flex h-8 items-center justify-center gap-1.5 rounded-md border border-input text-[11px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  {graus > 0 ? (
                    <RotateCw className="h-3.5 w-3.5" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  {Math.abs(graus)}°
                </button>
              ))}
            </div>

            {/* Aplicar a mesma medida a todos é o que uniformiza uma fileira
                de etiquetas de uma vez — mais útil aqui que escalar o grupo,
                que em códigos girados exigiria cisalhar as barras. */}
            <div className="grid grid-cols-3 gap-2">
              <CampoDeLayout
                aoIniciarGesto={iniciarGestoNoHistorico}
                aoTerminarGesto={terminarGestoNoHistorico}
                rotulo="compr."
                rotuloAcessivel="comprimento de todos os selecionados"
                unidade={unidade}
                valorMm={medidaComum(codigosSelecionados, "comprimento")}
                minMm={LIMITES.comprimento.min}
                maxMm={LIMITES.comprimento.max}
                aoMudarMm={(comprimento) => aplicarATodos({ comprimento })}
              />
              <CampoDeLayout
                aoIniciarGesto={iniciarGestoNoHistorico}
                aoTerminarGesto={terminarGestoNoHistorico}
                rotulo="barra"
                rotuloAcessivel="altura da barra de todos os selecionados"
                unidade={unidade}
                valorMm={medidaComum(codigosSelecionados, "altura")}
                minMm={LIMITES.altura.min}
                maxMm={LIMITES.altura.max}
                aoMudarMm={(altura) => aplicarATodos({ altura })}
              />
              <CampoNumero
                aoIniciarGesto={iniciarGestoNoHistorico}
                aoTerminarGesto={terminarGestoNoHistorico}
                rotulo="giro"
                rotuloAcessivel="giro de todos os selecionados"
                unidade="°"
                valor={medidaComum(codigosSelecionados, "rotacao")}
                casas={1}
                passo={0.5}
                aoMudar={(rotacao) => aplicarATodos({ rotacao: normalizarAngulo(rotacao) })}
              />
            </div>

            <Dica>
              Um valor em branco quer dizer que os selecionados divergem; digitar
              iguala todos. Shift ou ⌘ clicando soma à seleção, e arrastar no papel
              vazio seleciona por área.
            </Dica>
          </Secao>
        )}

        {codigoAtivo && (
          <>
            <Secao refSecao={inspetorRef} titulo="Posição">
              {/* Alinhar na folha, em dois grupos de três como em qualquer
                  editor: o primeiro mexe no eixo horizontal, o segundo no
                  vertical. Alinhar um código a outro se faz arrastando, que é
                  onde as guias grudam. */}
              <div className="flex items-center gap-1">
                {GRUPOS_DE_ALINHAMENTO.map((grupo, indice) => (
                  <div
                    key={indice}
                    className="grid flex-1 grid-cols-3 gap-px rounded-md border border-input p-px"
                  >
                    {grupo.map(([como, Icone, dica]) => (
                      <button
                        key={como}
                        type="button"
                        title={dica}
                        aria-label={dica}
                        onClick={() => alinhar(como)}
                        className="grid h-[26px] place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <Icone className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CampoDeLayout
                  aoIniciarGesto={iniciarGestoNoHistorico}
                  aoTerminarGesto={terminarGestoNoHistorico}
                  rotulo="X"
                  invalido={camposInvalidos.posicao(codigoAtivo.id)}
                  unidade={unidade}
                  valorMm={codigoAtivo.x}
                  aoMudarMm={(x) => atualizarCodigo(codigoAtivo.id, { x })}
                />
                <CampoDeLayout
                  aoIniciarGesto={iniciarGestoNoHistorico}
                  aoTerminarGesto={terminarGestoNoHistorico}
                  rotulo="Y"
                  invalido={camposInvalidos.posicao(codigoAtivo.id)}
                  unidade={unidade}
                  valorMm={codigoAtivo.y}
                  aoMudarMm={(y) => atualizarCodigo(codigoAtivo.id, { y })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <CampoNumero
                  aoIniciarGesto={iniciarGestoNoHistorico}
                  aoTerminarGesto={terminarGestoNoHistorico}
                  rotulo="giro"
                  unidade="°"
                  valor={codigoAtivo.rotacao}
                  casas={1}
                  passo={0.5}
                  aoMudar={(rotacao) =>
                    atualizarCodigo(codigoAtivo.id, { rotacao: normalizarAngulo(rotacao) })
                  }
                />
                <div className="grid grid-cols-4 gap-px rounded-md border border-input p-px">
                  {[0, 90, 180, 270].map((angulo) => {
                    const ativo = normalizarAngulo(codigoAtivo.rotacao) === angulo;
                    return (
                      <button
                        key={angulo}
                        type="button"
                        title={`Girar para ${angulo}°`}
                        aria-pressed={ativo}
                        onClick={() =>
                          comoUmaEntrada(() => atualizarCodigo(codigoAtivo.id, { rotacao: angulo }))
                        }
                        className={cn(
                          "h-[26px] rounded text-[10px] tabular-nums transition-colors",
                          ativo
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {angulo}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Secao>

            <Secao
              titulo="Dimensões"
              acao={
                <button
                  type="button"
                  onClick={() => setProporcaoTravada((atual) => !atual)}
                  aria-pressed={proporcaoTravada}
                  title={
                    proporcaoTravada
                      ? "Proporção travada: mexer num lado mexe no outro"
                      : "Travar a proporção entre comprimento e altura"
                  }
                  className={cn(
                    "grid h-5 w-5 place-items-center rounded transition-colors",
                    proporcaoTravada
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {proporcaoTravada ? (
                    <Travado className="h-3 w-3" />
                  ) : (
                    <Destravado className="h-3 w-3" />
                  )}
                </button>
              }
            >
              <div className="grid grid-cols-2 gap-2">
                <CampoDeLayout
                  aoIniciarGesto={iniciarGestoNoHistorico}
                  aoTerminarGesto={terminarGestoNoHistorico}
                  rotulo="compr."
                  unidade={unidade}
                  valorMm={codigoAtivo.comprimento}
                  minMm={LIMITES.comprimento.min}
                  maxMm={LIMITES.comprimento.max}
                  aoMudarMm={(comprimento) =>
                    atualizarCodigo(codigoAtivo.id, {
                      comprimento,
                      ...(proporcaoTravada
                        ? { altura: escalarJunto(codigoAtivo.altura, comprimento / codigoAtivo.comprimento, LIMITES.altura) }
                        : {}),
                    })
                  }
                />
                <CampoDeLayout
                  aoIniciarGesto={iniciarGestoNoHistorico}
                  aoTerminarGesto={terminarGestoNoHistorico}
                  rotulo="barra"
                  unidade={unidade}
                  valorMm={codigoAtivo.altura}
                  minMm={LIMITES.altura.min}
                  maxMm={LIMITES.altura.max}
                  aoMudarMm={(altura) =>
                    atualizarCodigo(codigoAtivo.id, {
                      altura,
                      ...(proporcaoTravada
                        ? { comprimento: escalarJunto(codigoAtivo.comprimento, altura / codigoAtivo.altura, LIMITES.comprimento) }
                        : {}),
                    })
                  }
                />
              </div>

              <Dica>
                Barra de{" "}
                <span className="font-mono tabular-nums">
                  {medidaEmTexto(moduloEmMm(codigoAtivo.comprimento, layout.digitos), unidade)}
                </span>
                . O comprimento é a dimensão de leitura; a barra é a altura dela.
              </Dica>
            </Secao>

            <Secao titulo="Aparência">
              <div className="flex h-8 items-center justify-between rounded-md border border-input px-2">
                <span className="text-[11px] text-muted-foreground">Número em texto</span>
                <Switch
                  checked={codigoAtivo.texto}
                  onCheckedChange={(texto) =>
                    comoUmaEntrada(() => atualizarCodigo(codigoAtivo.id, { texto }))
                  }
                  aria-label="Imprimir o número em texto legível"
                />
              </div>

              {codigoAtivo.texto && (
                <>
                  <div className="flex h-8 items-center justify-between rounded-md border border-input px-2">
                    <span className="text-[11px] text-muted-foreground">Número do outro lado</span>
                    <Switch
                      checked={codigoAtivo.textoAcima}
                      onCheckedChange={(textoAcima) =>
                        comoUmaEntrada(() => atualizarCodigo(codigoAtivo.id, { textoAcima }))
                      }
                      aria-label="Pôr o número do lado de cima das barras"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <CampoNumero
                      aoIniciarGesto={iniciarGestoNoHistorico}
                      aoTerminarGesto={terminarGestoNoHistorico}
                      rotulo="díg."
                      rotuloAcessivel="dígitos mostrados no texto"
                      valor={codigoAtivo.textoDigitos}
                      casas={0}
                      passo={1}
                      min={0}
                      max={12}
                      aoMudar={(textoDigitos) => atualizarCodigo(codigoAtivo.id, { textoDigitos })}
                    />
                    <CampoNumero
                      aoIniciarGesto={iniciarGestoNoHistorico}
                      aoTerminarGesto={terminarGestoNoHistorico}
                      rotulo="corpo"
                      unidade="pt"
                      valor={codigoAtivo.textoTamanho}
                      casas={1}
                      passo={0.5}
                      min={3}
                      max={48}
                      aoMudar={(textoTamanho) => atualizarCodigo(codigoAtivo.id, { textoTamanho })}
                    />
                    <CampoDeLayout
                      aoIniciarGesto={iniciarGestoNoHistorico}
                      aoTerminarGesto={terminarGestoNoHistorico}
                      rotulo="folga"
                      unidade={unidade}
                      valorMm={codigoAtivo.textoEspaco}
                      minMm={0}
                      maxMm={20}
                      aoMudarMm={(textoEspaco) => atualizarCodigo(codigoAtivo.id, { textoEspaco })}
                    />
                  </div>

                  <Dica>
                    As barras sempre codificam o número inteiro; o campo de dígitos só recorta o que
                    aparece escrito — 0 mostra tudo. Segure Ctrl ao arrastar para ignorar o ímã das
                    guias.
                  </Dica>
                </>
              )}
            </Secao>
          </>
        )}

        {!temSelecao && avisos.length > 0 && (
          <Secao titulo="Conferência">
            <ul className="space-y-1.5">
              {avisos.map((aviso, indice) => (
                <li
                  key={indice}
                  className={cn(
                    "flex gap-2 text-[11px] leading-relaxed",
                    aviso.gravidade === "erro" ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  <span aria-hidden className="mt-1 h-1 w-1 shrink-0 rounded-full bg-current" />
                  <button
                    type="button"
                    disabled={!aviso.codigoId}
                    onClick={() => aviso.codigoId && setSelecionados([aviso.codigoId])}
                    className="text-left disabled:cursor-default"
                  >
                    {aviso.mensagem}
                  </button>
                </li>
              ))}
            </ul>
          </Secao>
        )}

        <div className="mt-auto space-y-2 border-t border-border p-4">
          {gerando && progresso ? (
            <>
              <Progress
                value={
                  progresso.totalPaginas > 0
                    ? (progresso.paginasFeitas / progresso.totalPaginas) * 100
                    : 0
                }
                className="h-1"
              />
              <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-muted-foreground">
                <span>
                  {progresso.paginasFeitas.toLocaleString("pt-BR")} /{" "}
                  {progresso.totalPaginas.toLocaleString("pt-BR")} páginas
                </span>
                <span>
                  {progresso.restante === null
                    ? "—"
                    : `${Math.ceil(progresso.restante / 1000)}s restantes`}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-full gap-2 text-xs"
                onClick={() => cancelamento.current?.abort()}
              >
                <X className="h-3.5 w-3.5" />
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                className="h-9 w-full gap-2 text-xs"
                disabled={erros.length > 0}
                onClick={() => setConfirmandoGeracao(true)}
              >
                <Download className="h-3.5 w-3.5" />
                Gerar {totalArquivos > 1 ? ".zip" : "PDF"}
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-1 text-[11px] font-normal text-muted-foreground"
                  disabled={amostrando || layout.codigos.length === 0}
                  onClick={() => void baixarAmostra()}
                >
                  {amostrando ? (
                    <Loader className="h-3 w-3 animate-spin" />
                  ) : (
                    <FileUp className="h-3 w-3" />
                  )}
                  Amostra
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-1 text-[11px] font-normal text-muted-foreground"
                  onClick={exportarLayout}
                >
                  Exportar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-1 text-[11px] font-normal text-muted-foreground"
                  onClick={() => arquivoLayoutRef.current?.click()}
                >
                  Importar
                </Button>
              </div>
              <input
                ref={arquivoLayoutRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(evento) => {
                  void importarLayout(evento.target.files?.[0]);
                  evento.target.value = "";
                }}
              />
              {/* Com a conferência escondida pela seleção, o motivo do botão
                  travado tem que aparecer aqui: botão desabilitado sem
                  explicação é um beco sem saída. */}
              {temSelecao && primeiroErro ? (
                <p className="text-[11px] leading-relaxed text-destructive">
                  {primeiroErro.mensagem}
                </p>
              ) : (
                <Dica>
                  A amostra é uma página só, para conferir no papel antes de rodar a faixa inteira.
                  Passe o leitor nela.
                </Dica>
              )}
            </>
          )}
        </div>
      </aside>

      <AlertDialog open={mostrandoAtalhos} onOpenChange={setMostrandoAtalhos}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Atalhos</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="grid max-h-[60vh] grid-cols-1 gap-4 overflow-y-auto sm:grid-cols-2">
                {ATALHOS_DOCUMENTADOS.map(({ grupo, itens }) => (
                  <div key={grupo}>
                    <p className="mb-1.5 text-[11px] font-medium text-foreground">{grupo}</p>
                    <dl className="space-y-1">
                      {itens.map(([tecla, acao]) => (
                        <div key={tecla} className="flex items-baseline gap-2">
                          <dt className="shrink-0 font-mono text-[10px] text-foreground">
                            {rotuloDoAtalho(tecla, ehMac)}
                          </dt>
                          <dd className="text-[11px] leading-snug text-muted-foreground">
                            {acao}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Limpar o histórico apaga o controle de onde a numeração parou, que é
          o dado mais difícil de reconstruir aqui — não sai num clique. */}
      <AlertDialog open={limpandoEmissoes} onOpenChange={setLimpandoEmissoes}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar o histórico de emissões?</AlertDialogTitle>
            <AlertDialogDescription>
              As {emissoes.length} emissões registradas somem, e com elas o aviso de sobreposição.
              Depois disso a ferramenta não tem mais como avisar que uma faixa já foi impressa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setEmissoes([]);
                gravarEmissoes([]);
                setLimpandoEmissoes(false);
              }}
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resumo antes de gerar.
          O prompt original pedia esta confirmação, e é onde o aviso de
          sobreposição pertence: no momento em que a decisão é tomada, não
          numa lista que rola. É também o único lugar em que a instrução de
          imprimir sem redução é lida — a impressora reduzindo 4% derruba o
          módulo de 0,26 mm abaixo do mínimo da norma, e a folha inteira falha
          por um seletor no diálogo de impressão. */}
      <AlertDialog open={confirmandoGeracao} onOpenChange={setConfirmandoGeracao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gerar a numeração?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Faixa</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {formatarValor(faixa.de, layout.digitos)} a{" "}
                    {formatarValor(faixa.ate, layout.digitos)}
                  </dd>
                  <dt className="text-muted-foreground">Páginas</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {totalPaginas.toLocaleString("pt-BR")}
                  </dd>
                  <dt className="text-muted-foreground">Códigos por página</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {layout.codigos.length}
                  </dd>
                  <dt className="text-muted-foreground">Arquivos</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {totalArquivos}
                    {totalArquivos > 1 ? " (num .zip)" : ""}
                  </dd>
                  <dt className="text-muted-foreground">Tamanho estimado</dt>
                  <dd className="font-mono tabular-nums text-foreground">
                    {formatarBytes(estimativa.total)}
                  </dd>
                </dl>

                {cruzadas.length > 0 && (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                    {descreverSobreposicao(faixa, layout.digitos, cruzadas)} Gerar de novo é
                    normal ao reimprimir um lote perdido — só confira se é isso.
                  </p>
                )}

                <p className="rounded-md border border-border bg-muted/50 p-2.5 text-[11px] leading-relaxed">
                  Ao imprimir, escolha <strong className="text-foreground">tamanho real</strong> ou{" "}
                  <strong className="text-foreground">100%</strong>. Com &quot;ajustar à
                  página&quot; a impressora reduz alguns por cento, a barra fica mais fina que o
                  mínimo do Code 128 e o leitor passa a errar — sem nada na folha denunciando.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmandoGeracao(false);
                void gerar();
              }}
            >
              Gerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Aplicar o preset joga fora o posicionamento inteiro, e o autosave
          grava por cima do que estava guardado: não há como voltar atrás. Meia
          hora de ajuste fino não pode sumir num clique errado. */}
      <AlertDialog open={confirmandoPreset} onOpenChange={setConfirmandoPreset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Substituir a folha pelo FORM ROE 01?</AlertDialogTitle>
            <AlertDialogDescription>
              {layout.codigos.length === 1
                ? "A folha atual tem um código, que será descartado."
                : `Os ${layout.codigos.length} códigos da folha atual serão descartados.`}{" "}
              Não dá para desfazer. Se quiser guardar o que está montado, cancele e use Exportar
              antes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={aplicarPreset}>Substituir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
