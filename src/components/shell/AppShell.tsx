"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { SearchCommand } from "./SearchCommand";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

/**
 * Casca da aplicação: sidebar à esquerda e a folha ocupando o resto.
 *
 * Vive no layout raiz para a sidebar não remontar a cada navegação — é o que
 * dá a sensação de app em vez de site. As rotas que não são ferramenta
 * (/admin, /docs) passam direto, sem casca.
 */
/** Rotas cujo layout encosta nas bordas da área de conteúdo. */
const SEM_MOLDURA = new Set([
  "/whatsapp",
  "/qr-code",
  "/instagram",
  "/codigo-de-barras",
  "/removedor-de-fundo",
  "/vetorizador",
]);

const CHAVE_DA_SIDEBAR = "geradoor:sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const [aberta, setAberta] = useState(true);
  const [gaveta, setGaveta] = useState(false);
  const [busca, setBusca] = useState(false);
  const [mac, setMac] = useState(false);

  /*
   * A escolha de quem usa, lembrada entre visitas.
   *
   * Lida num efeito, e não no estado inicial: o HTML vem do servidor sem saber
   * de localStorage, e ler durante a renderização daria marcação diferente da
   * do cliente. Começa aberta, que é o certo para quem chega pela primeira vez.
   */
  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    try {
      if (localStorage.getItem(CHAVE_DA_SIDEBAR) === "recolhida") setAberta(false);
    } catch {
      // Janela anônima ou dados de site bloqueados: fica o padrão.
    }
  }, []);

  const definirAberta = useCallback((valor: boolean) => {
    setAberta(valor);
    try {
      localStorage.setItem(CHAVE_DA_SIDEBAR, valor ? "aberta" : "recolhida");
    } catch {
      // Sem persistência a escolha ainda vale nesta sessão.
    }
  }, []);

  // A gaveta do celular fecha sozinha ao navegar: continuar aberta sobre a
  // ferramenta recém-escolhida esconderia justamente o que se foi ver.
  useEffect(() => setGaveta(false), [caminho]);

  const ehFerramenta = ROTAS.some((rota) => rota.href === caminho);
  if (!ehFerramenta) return <>{children}</>;

  // Rotas que desenham a própria moldura: recebem a área crua, sem padding e
  // sem centralização, para poderem encostar nas bordas.
  const semMoldura = SEM_MOLDURA.has(caminho);
  const abrirBusca = () => {
    setGaveta(false);
    setBusca(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {aberta && (
        <Sidebar
          className="hidden md:flex"
          onRecolher={() => definirAberta(false)}
          onBuscar={abrirBusca}
          mac={mac}
        />
      )}

      {/* No celular a sidebar é gaveta: não há largura para ela fixa. */}
      <Sheet open={gaveta} onOpenChange={setGaveta}>
        <SheetContent side="left" className="w-64 p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Sidebar className="w-full border-e-0" onRecolher={() => setGaveta(false)} onBuscar={abrirBusca} mac={mac} />
        </SheetContent>
      </Sheet>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Com a sidebar recolhida, este é o único caminho de volta para ela.
            Fica sobre o conteúdo, e não numa faixa própria: uma coluna vazia
            de 48 px só para um botão desperdiça a largura que a folha ganhou. */}
        <button
          type="button"
          onClick={() => (window.innerWidth < 768 ? setGaveta(true) : definirAberta(true))}
          data-touch-target
          aria-label="Abrir menu"
          title="Abrir menu"
          className={cn(
            "absolute left-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-lg",
            "bg-background/80 text-zinc-500 backdrop-blur-sm transition-colors duration-150",
            "hover:bg-zinc-100 hover:text-foreground dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
            aberta && "md:hidden"
          )}
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        {/* overflow-auto, não overflow-y-auto: a raiz do shell tem
            overflow-hidden, então conteúdo mais largo que a área seria cortado
            sem barra alguma. Assim degrada para rolagem.

            O padding do topo no celular é o espaço do botão acima: sem ele, o
            botão cobriria o título da ferramenta. */}
        <main className={cn("min-h-0 min-w-0 flex-1 overflow-auto pt-12 md:pt-0", aberta && "md:pt-0")}>
          {semMoldura ? (
            children
          ) : (
            /* min-h-full com items-center centraliza quando o conteúdo cabe e
               deixa crescer quando não cabe, sem cortar o topo — que é o que
               acontece com justify-center puro em contêiner que rola. */
            <div className="flex min-h-full items-center justify-center px-6 py-10 sm:px-8">
              {children}
            </div>
          )}
        </main>
      </div>

      <SearchCommand aberto={busca} onAberto={setBusca} />
    </div>
  );
}

/**
 * Cabeçalho de página, alinhado ao topo da área de conteúdo.
 * Padroniza título e subtítulo entre as ferramentas.
 */
export function PageHeader({
  title,
  description,
  icone,
}: {
  title: string;
  description: string;
  /** Marca opcional acima do título, alinhada com ele. */
  icone?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {icone && <div className="mb-4 text-foreground">{icone}</div>}
      <h1 className="text-xl font-medium leading-none tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
