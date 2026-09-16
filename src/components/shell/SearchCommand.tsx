"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { GRUPOS } from "@/lib/rotas";
import { useRotasVisiveis } from "@/lib/useRotasVisiveis";
import { useTextos } from "@/lib/useTextos";
import { useRecentes } from "@/lib/recentes";
import { EtiquetaNovo } from "./EtiquetaNovo";

/**
 * Busca das ferramentas, aberta por ⌘F / Ctrl+F.
 *
 * Filtra pelas rotas e pelo histórico local, e navega para o resultado
 * escolhido. Não tem campo próprio na tela: é atalho, como em qualquer editor.
 *
 * ⌘F toma o lugar da busca do navegador nesta página, de propósito — procurar
 * texto numa ferramenta de gerar não serve para nada, e achar a ferramenta
 * serve. ⌘K continua funcionando para quem tem o costume dos apps de comando.
 */
export function SearchCommand({ aberto, onAberto }: { aberto: boolean; onAberto: (aberto: boolean) => void }) {
  const router = useRouter();
  const rotas = useRotasVisiveis();
  const t = useTextos();
  const { recentes } = useRecentes();

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      const tecla = evento.key.toLowerCase();
      if ((tecla === "f" || tecla === "k") && (evento.metaKey || evento.ctrlKey) && !evento.shiftKey && !evento.altKey) {
        evento.preventDefault();
        onAberto(true);
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [onAberto]);

  const irPara = useCallback(
    (href: string) => {
      onAberto(false);
      router.push(href);
    },
    [onAberto, router]
  );

  return (
    <CommandDialog open={aberto} onOpenChange={onAberto}>
      <CommandInput grande placeholder={`${t.buscarFerramenta}…`} />
      <CommandList>
        <CommandEmpty>{t.semResultado}</CommandEmpty>

        {GRUPOS.map((grupo) => {
          const doGrupo = rotas.filter((rota) => rota.grupo === grupo);
          if (doGrupo.length === 0) return null;
          return (
            <CommandGroup key={grupo} heading={grupo === "ferramenta" ? t.ferramentas : t.geradores}>
              {doGrupo.map(({ href, label, descricao, termos, icon: Icone, novo }) => (
                <CommandItem
                  key={href}
                  /* value alimenta o filtro do cmdk: junta rótulo, descrição e
                     sinônimos para "empresa" achar CNPJ e "zap" achar WhatsApp. */
                  value={`${label} ${descricao} ${termos.join(" ")}`}
                  onSelect={() => irPara(href)}
                >
                  <Icone className="h-4 w-4 shrink-0 text-zinc-400" />
                  <span className="shrink-0 font-medium">{label}</span>
                  {novo && <EtiquetaNovo />}
                  {/* A descrição vem logo ao lado do nome, não encostada na
                      borda: assim se lê como uma frase só, e a linha não fica
                      com um vão no meio quando o nome é curto. */}
                  <span className="min-w-0 truncate text-[13px] text-zinc-400 dark:text-zinc-500">{descricao}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        {recentes.length > 0 && (
          <CommandGroup heading={t.recentes}>
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
  );
}
