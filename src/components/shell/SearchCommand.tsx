"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ROTAS_PUBLICAS } from "@/lib/rotas";
import { useRecentes } from "@/lib/recentes";
import { cn } from "@/lib/utils";

/**
 * Busca das ferramentas, aberta por clique ou ⌘K / Ctrl+K.
 *
 * Filtra pelas rotas e pelo histórico local. É busca de verdade: navega para
 * o resultado escolhido, não é enfeite de topo.
 */
export function SearchCommand({ className }: { className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [mac, setMac] = useState(false);
  const router = useRouter();
  const { recentes } = useRecentes();

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key.toLowerCase() === "k" && (evento.metaKey || evento.ctrlKey)) {
        evento.preventDefault();
        setAberto((atual) => !atual);
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  const irPara = useCallback(
    (href: string) => {
      setAberto(false);
      router.push(href);
    },
    [router]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        // Superfície preenchida em vez de contorno, e o atalho como texto
        // simples: é o desenho da busca do Figma, onde o campo é fundo e não
        // moldura. Sem borda o topo fica com uma linha a menos disputando a
        // atenção com a folha.
        className={cn(
          "flex h-8 items-center gap-2 rounded-lg bg-zinc-100/80 px-2.5",
          "text-[13px] text-zinc-500 transition-colors duration-150",
          "hover:bg-zinc-100 hover:text-zinc-700",
          "dark:bg-zinc-800/60 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
          className
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="flex-1 truncate text-left">Buscar</span>
        <span className="ms-3 hidden shrink-0 font-sans text-[11px] tabular-nums text-zinc-400 sm:inline dark:text-zinc-500">
          {mac ? "⌘" : "Ctrl"}K
        </span>
      </button>

      <CommandDialog open={aberto} onOpenChange={setAberto}>
        <CommandInput placeholder="Buscar ferramenta..." />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>

          <CommandGroup heading="Geradores">
            {ROTAS_PUBLICAS.map(({ href, label, descricao, termos, icon: Icone }) => (
              <CommandItem
                key={href}
                /* value alimenta o filtro do cmdk: junta rótulo, descrição e
                   sinônimos para "empresa" achar CNPJ e "zap" achar WhatsApp. */
                value={`${label} ${descricao} ${termos.join(" ")}`}
                onSelect={() => irPara(href)}
                className="gap-2"
              >
                <Icone className="h-4 w-4 shrink-0 text-zinc-400" />
                <span>{label}</span>
                <span className="ms-auto truncate text-xs text-muted-foreground">
                  {descricao}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          {recentes.length > 0 && (
            <CommandGroup heading="Recentes">
              {recentes.slice(0, 5).map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => item.href && irPara(item.href)}
                  disabled={!item.href}
                >
                  <span className="truncate">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
