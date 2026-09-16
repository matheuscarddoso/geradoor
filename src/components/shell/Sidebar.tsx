"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, Search, Trash2 } from "lucide-react";
import { MarcaGeradoor } from "@/components/ui/marca-geradoor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GRUPOS } from "@/lib/rotas";
import { useRotasVisiveis } from "@/lib/useRotasVisiveis";
import { useIdioma, useTextos } from "@/lib/useTextos";
import { useRecentes } from "@/lib/recentes";
import { hrefDeRestauracao } from "@/lib/qrRecente";
import { cn } from "@/lib/utils";
import { EtiquetaNovo } from "./EtiquetaNovo";

function Secao({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1.5 pt-4 text-xs font-medium text-zinc-400 dark:text-zinc-500">
      {children}
    </p>
  );
}

interface SidebarProps {
  className?: string;
  /** Recolhe a sidebar; no celular, fecha a gaveta. */
  onRecolher: () => void;
  onBuscar: () => void;
  /** Mac, para a dica do atalho. */
  mac: boolean;
}

/**
 * A sidebar é a casca inteira: identidade no topo, navegação no meio, tema e
 * busca no rodapé.
 *
 * Não há mais barra no topo da página. Ela repetia a logo que já estava aqui e
 * roubava 56 px de altura de todas as ferramentas — numa tela de notebook, é a
 * diferença entre o palco do removedor caber ou não. O desenho é o de um app
 * de edição: uma coluna com tudo, e a folha ocupando o resto.
 */
export function Sidebar({ className, onRecolher, onBuscar, mac }: SidebarProps) {
  const caminho = usePathname();
  const rotas = useRotasVisiveis();
  const { recentes, limpar } = useRecentes();
  const idioma = useIdioma();
  const t = useTextos();

  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col border-e border-zinc-200 dark:border-zinc-800",
        className
      )}
    >
      <div className="flex shrink-0 items-center gap-1 px-2 py-2">
        <Link
          href="/"
          data-touch-target
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-foreground transition-colors duration-150 hover:bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <MarcaGeradoor size={22} />
          <span className="truncate font-logo text-base font-medium tracking-tight">Geradoor</span>
        </Link>
        <button
          type="button"
          onClick={onRecolher}
          data-touch-target
          aria-label={t.recolherMenu}
          title={t.recolherMenu}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {GRUPOS.map((grupo) => {
          const doGrupo = rotas.filter((rota) => rota.grupo === grupo);
          if (doGrupo.length === 0) return null;
          return (
            <div key={grupo}>
              <Secao>{grupo === "ferramenta" ? t.ferramentas : t.geradores}</Secao>
              <nav className="flex flex-col gap-0.5">
                {doGrupo.map(({ href, label, icon: Icone, novo }) => {
                  const ativa = caminho === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={ativa ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                        ativa
                          ? "bg-zinc-100 font-medium text-foreground dark:bg-zinc-800"
                          : "text-zinc-600 hover:bg-zinc-50 hover:text-foreground dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      )}
                    >
                      <Icone className="h-4 w-4 shrink-0 text-zinc-400" />
                      <span className="min-w-0 truncate">{label}</span>
                      {novo && <EtiquetaNovo className="ms-auto" />}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}

        {/* A seção só aparece quando há algo — cabeçalho sobre lista vazia é
            ruído, e o histórico começa vazio para todo mundo. */}
        {recentes.length > 0 && (
          <>
            <div className="flex items-center justify-between pe-1">
              <Secao>{t.recentes}</Secao>
              <button
                type="button"
                onClick={limpar}
                aria-label="Limpar histórico"
                title="Limpar histórico"
                className="mt-2 rounded-md p-1.5 text-zinc-400 transition-colors duration-150 hover:text-foreground dark:hover:text-zinc-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <ul className="flex flex-col gap-0.5">
              {recentes.map((item) => {
                // Reconstrói o destino para reabrir o resultado, inclusive nos
                // itens gravados antes de a restauração existir.
                const destino = hrefDeRestauracao(item);
                const conteudo = (
                  <>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span className="truncate">{item.label}</span>
                  </>
                );
                const estilo =
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm text-zinc-500 dark:text-zinc-400";
                return (
                  <li key={item.id}>
                    {destino ? (
                      <Link
                        href={destino}
                        className={cn(
                          estilo,
                          "transition-colors duration-150 hover:bg-zinc-50 hover:text-foreground dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                        )}
                      >
                        {conteudo}
                      </Link>
                    ) : (
                      <span className={cn(estilo, "cursor-default")} title={item.label}>
                        {conteudo}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Rodapé: a busca não tem mais campo no topo, então é aqui que ela
          aparece — como atalho, que é o que ela é. */}
      <div className="flex shrink-0 items-center gap-1 border-t border-zinc-200 px-2 py-2 dark:border-zinc-800">
        <button
          type="button"
          onClick={onBuscar}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors duration-150 hover:bg-zinc-50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Search className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="truncate">{t.buscar}</span>
          <span className="ms-auto shrink-0 font-sans text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {mac ? "⌘F" : "Ctrl+F"}
          </span>
        </button>
        <ThemeToggle className="shrink-0" />
      </div>
    </aside>
  );
}
