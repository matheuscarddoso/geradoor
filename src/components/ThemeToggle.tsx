"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Alterna entre claro e escuro.
 *
 * O ícone só é pintado depois da montagem: o tema real vive no localStorage e
 * não existe durante o render do servidor, então desenhar um dos dois de cara
 * causaria divergência de hidratação e um piscar do ícone errado. Até lá fica
 * um espaço da mesma dimensão, para o layout não saltar.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  const escuro = resolvedTheme === "dark";

  /*
   * O rótulo TAMBÉM depende da montagem, não só o ícone.
   *
   * No servidor `resolvedTheme` é undefined, então `escuro` é false e o
   * aria-label sai como "Ativar tema escuro"; no cliente vira "Ativar tema
   * claro". React acusa divergência de hidratação em atributo, que ele não
   * corrige sozinho. Antes de montar, o botão é neutro.
   */
  const rotulo = !montado
    ? "Alternar tema"
    : escuro
      ? "Ativar tema claro"
      : "Ativar tema escuro";

  return (
    <button
      type="button"
      data-touch-target
      onClick={() => setTheme(escuro ? "light" : "dark")}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
        "text-zinc-500 transition-colors duration-150",
        "hover:bg-zinc-50 hover:text-foreground",
        "dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
        className
      )}
    >
      {montado ? (
        escuro ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
}
