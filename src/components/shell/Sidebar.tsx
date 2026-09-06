"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ROTAS } from "@/lib/rotas";
import { useRecentes } from "@/lib/recentes";
import { hrefDeRestauracao } from "@/lib/qrRecente";
import { cn } from "@/lib/utils";

function Secao({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1.5 pt-5 text-xs font-medium text-zinc-400 dark:text-zinc-500">
      {children}
    </p>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const caminho = usePathname();
  const { recentes, limpar } = useRecentes();

  return (
    <aside
      className={cn(
        "flex h-full w-60 shrink-0 flex-col overflow-y-auto border-e border-zinc-200 px-2 pb-6 dark:border-zinc-800",
        className
      )}
    >
      <Secao>Geradores</Secao>
      <nav className="flex flex-col gap-0.5">
        {ROTAS.map(({ href, label, icon: Icone }) => {
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
              {label}
            </Link>
          );
        })}
      </nav>

      {/* A seção só aparece quando há algo — cabeçalho sobre lista vazia é
          ruído, e o histórico começa vazio para todo mundo. */}
      {recentes.length > 0 && (
        <>
          <div className="flex items-center justify-between pe-1">
            <Secao>Recentes</Secao>
            <button
              type="button"
              onClick={limpar}
              aria-label="Limpar histórico"
              title="Limpar histórico"
              className="mt-3 rounded-md p-1.5 text-zinc-400 transition-colors duration-150 hover:text-foreground dark:hover:text-zinc-100"
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
    </aside>
  );
}
