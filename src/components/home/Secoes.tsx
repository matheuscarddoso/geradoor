import { cn } from "@/lib/utils";

/**
 * As peças de desenho da home.
 *
 * A gramática é a mesma do resto do site — fio de 1px, cinza, uma única cor de
 * destaque — com três elementos emprestados de um wireframe de referência:
 * o marcador numerado em monoespaçada que abre cada seção, a pílula que anuncia
 * o assunto acima do título, e o bloco invertido que fecha a página.
 *
 * O que NÃO veio da referência: bloco de investidor, foto de equipe e logotipo
 * de cliente. Não temos nenhum dos três, e seção vazia esperando conteúdo é
 * pior que seção que não existe.
 */

/**
 * O marcador que abre uma seção: `| [01] NOME DA SEÇÃO` e três asteriscos na
 * outra ponta.
 *
 * Em monoespaçada porque é sinalização, não texto de leitura — a mesma família
 * do logotipo, então não inaugura uma fonte no sistema. Os asteriscos à direita
 * não dizem nada: fecham a linha, que de outro modo morreria no meio da página.
 */
export function MarcadorDeSecao({ numero, children }: { numero: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
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

/** A etiqueta que anuncia o assunto, logo acima do título da seção. */
export function Pilula({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-[12px] text-zinc-500 dark:text-zinc-400">
      {children}
    </span>
  );
}

/**
 * O título de uma seção, com a última parte em destaque.
 *
 * A referência põe uma palavra do título em laranja. Aqui é azul, que já é a
 * cor de destaque do site — inaugurar uma segunda seria quebrar o sistema por
 * causa de um título.
 */
export function TituloDaSecao({ children, destaque }: { children: React.ReactNode; destaque?: string }) {
  return (
    <h2 className="max-w-2xl text-balance text-2xl font-medium leading-[1.15] tracking-[-0.02em] sm:text-[34px]">
      {children}
      {destaque && <span className="text-blue-600 dark:text-blue-400"> {destaque}</span>}
    </h2>
  );
}

/** Cartão numerado, na fileira de três que a referência usa para os pilares. */
export function CartaoNumerado({
  numero,
  titulo,
  children,
  icone,
}: {
  numero: number;
  titulo: string;
  children: React.ReactNode;
  icone?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-e border-border p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="font-logo text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
          {String(numero).padStart(2, "0")}
        </span>
        {icone && <span className="text-blue-600 dark:text-blue-400">{icone}</span>}
      </div>
      <h3 className="text-[15px] font-medium tracking-tight">{titulo}</h3>
      <p className="text-sm leading-[1.7] text-zinc-600 dark:text-zinc-300">{children}</p>
    </div>
  );
}

/**
 * O bloco que fecha a página.
 *
 * A referência usa um retângulo laranja com trama de quadrados. Aqui o bloco é
 * invertido — tinta do texto como fundo —, que é o contraste mais forte
 * disponível sem inventar cor. A trama é a mesma ideia: uma grade de fios que
 * aparece de leve e dá textura ao que seria um retângulo chapado.
 */
export function BlocoDeChamada({
  titulo,
  children,
  acao,
  className,
}: {
  titulo: string;
  children: React.ReactNode;
  acao: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-foreground px-6 py-14 text-center sm:py-20", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--background)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--background)) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
        <h2 className="text-balance text-2xl font-medium tracking-[-0.02em] text-background sm:text-3xl">
          {titulo}
        </h2>
        <p className="text-balance text-sm leading-relaxed text-background/70">{children}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{acao}</div>
      </div>
    </div>
  );
}
