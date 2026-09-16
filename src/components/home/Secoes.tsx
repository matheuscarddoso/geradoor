import { cn } from "@/lib/utils";
import { GradeCintilante } from "./GradeCintilante";

/**
 * As peças de desenho das seções.
 *
 * A gramática vem das referências que o autor trouxe: **sobrancelha em caixa
 * alta**, título grande logo abaixo e um parágrafo de apoio — nessa ordem,
 * todos encostados na mesma margem esquerda. É o que dá a impressão de coluna
 * editorial em vez de blocos empilhados.
 *
 * A pílula com borda que havia aqui antes saiu: numa página de fio de 1px ela
 * era o único elemento com cápsula, e chamava atenção para si em vez de para o
 * título.
 */

/**
 * O marcador que abre uma seção: `| [01] NOME` e três asteriscos na outra ponta.
 *
 * Em monoespaçada porque é sinalização, não texto de leitura — a mesma família
 * do logotipo, então não inaugura fonte no sistema. Os asteriscos não dizem
 * nada: fecham a linha, que de outro modo morreria no meio da página.
 */
export function MarcadorDeSecao({ numero, children }: { numero: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-y border-border px-4 py-3 sm:px-8">
      <p className="flex items-center gap-2.5 font-logo text-[11px] uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">
        <span className="text-blue-600 dark:text-blue-400">|</span>
        <span className="tabular-nums">[{String(numero).padStart(2, "0")}]</span>
        <span>{children}</span>
      </p>
      <span aria-hidden="true" className="font-logo text-[11px] tracking-[0.2em] text-zinc-300 dark:text-zinc-600">
        ***
      </span>
    </div>
  );
}

/** A sobrancelha: o assunto da seção, em caixa alta, acima do título. */
export function Sobrancelha({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">{children}</p>
  );
}

/**
 * O cabeçalho de uma seção: sobrancelha, título e parágrafo de apoio.
 *
 * Existe como peça única porque os três andam sempre juntos e sempre na mesma
 * margem — separá-los seria abrir espaço para uma seção sair desalinhada das
 * outras, que foi exatamente o que aconteceu antes.
 */
export function CabecalhoDaSecao({
  sobrancelha,
  titulo,
  destaque,
  children,
  centrado = false,
}: {
  sobrancelha: string;
  titulo: string;
  destaque?: string;
  /** O parágrafo de apoio. Opcional: nem toda seção precisa explicar-se. */
  children?: React.ReactNode;
  centrado?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-3", centrado && "items-center text-center")}>
      <Sobrancelha>{sobrancelha}</Sobrancelha>
      <h2 className="max-w-2xl text-balance text-2xl font-medium leading-[1.15] tracking-[-0.02em] sm:text-[34px]">
        {titulo}
        {destaque && <span className="text-blue-600 dark:text-blue-400"> {destaque}</span>}
      </h2>
      {children && (
        <p className="max-w-xl text-balance text-[15px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {children}
        </p>
      )}
    </div>
  );
}

/**
 * Cartão da grade de pilares.
 *
 * O ícone fica na linha do título, e não num canto acima dele: é como a
 * referência faz, e é o que permite a descrição começar na mesma vertical do
 * título em vez de recuar.
 */
export function CartaoNumerado({
  titulo,
  children,
  icone,
}: {
  titulo: string;
  children: React.ReactNode;
  icone?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-e border-border p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        {icone && <span className="text-zinc-400 dark:text-zinc-500">{icone}</span>}
        <h3 className="text-[15px] font-medium tracking-tight">{titulo}</h3>
      </div>
      <p className="text-sm leading-[1.7] text-zinc-600 dark:text-zinc-300">{children}</p>
    </div>
  );
}

/**
 * O bloco que fecha a página.
 *
 * Azul da marca, texto branco e a grade cintilante por trás. O azul é o mesmo
 * que já destaca palavra de título e etiqueta "Novo" — o bloco é o único lugar
 * onde ele aparece chapado, e é por isso que funciona como ponto final.
 */
export function BlocoDeChamada({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children: React.ReactNode;
  acao: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden bg-blue-600 px-6 py-16 text-center sm:py-24">
      <GradeCintilante className="pointer-events-none absolute inset-0 h-full w-full" />
      {/* Um véu radial no centro para o texto não disputar com a grade. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,rgba(37,99,235,0.85),transparent)]"
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
        <h2 className="text-balance text-2xl font-medium tracking-[-0.02em] text-white sm:text-[34px]">{titulo}</h2>
        <p className="text-balance text-[15px] leading-relaxed text-white/75">{children}</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">{acao}</div>
      </div>
    </div>
  );
}
