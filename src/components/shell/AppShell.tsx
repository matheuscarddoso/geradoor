"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MaximizeIcon, type MaximizeIconHandle } from "@/components/ui/maximize-icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sidebar } from "./Sidebar";
import { SearchCommand } from "./SearchCommand";
import { ROTAS } from "@/lib/rotas";
import { cn } from "@/lib/utils";

/**
 * Casca da aplicação: topo fixo, sidebar persistente e área de conteúdo.
 *
 * Vive no layout raiz para a sidebar não remontar a cada navegação — é o que
 * dá a sensação de app em vez de site. As rotas que não são ferramenta
 * (/admin, /docs) passam direto, sem casca.
 */
/** Rotas cujo layout encosta nas bordas da área de conteúdo. */
const SEM_MOLDURA = new Set(["/whatsapp", "/qr-code", "/instagram"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const logoRef = useRef<MaximizeIconHandle>(null);

  const ehFerramenta = ROTAS.some((rota) => rota.href === caminho);
  if (!ehFerramenta) return <>{children}</>;

  // Rotas que desenham a própria moldura: recebem a área crua, sem padding e
  // sem centralização, para poderem encostar nas bordas.
  const semMoldura = SEM_MOLDURA.has(caminho);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="relative flex h-14 shrink-0 items-center gap-1 border-b border-border px-3">
        {/* Sidebar em gaveta no mobile, onde não há largura para ela fixa */}
        <Sheet>
          <SheetTrigger
            data-touch-target
            aria-label="Abrir menu"
            className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 transition-colors duration-150 hover:bg-zinc-50 hover:text-foreground md:hidden dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 pt-10">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Sidebar className="w-full border-e-0" />
          </SheetContent>
        </Sheet>

        <Link
          href="/"
          data-touch-target
          onMouseEnter={() => logoRef.current?.startAnimation()}
          onMouseLeave={() => logoRef.current?.stopAnimation()}
          className="flex shrink-0 items-center gap-2 rounded-xl px-2 py-1.5 text-foreground transition-colors duration-150 hover:bg-selected"
        >
          <MaximizeIcon ref={logoRef} size={18} className="flex items-center" />
          <span className="font-logo text-base font-medium tracking-tight">Geradoor</span>
        </Link>

        {/* As abas do topo saíram: a sidebar já lista tudo, e duplicar a
            navegação em dois lugares só disputa espaço com a busca. */}

        <SearchCommand className="flex-1 md:absolute md:left-1/2 md:w-full md:max-w-[280px] md:flex-none md:-translate-x-1/2" />
        <ThemeToggle className="ms-auto shrink-0" />
      </header>

      <div className="flex min-h-0 flex-1">
        <Sidebar className="hidden md:flex" />
        {/* overflow-auto, não overflow-y-auto: a raiz do shell tem
              overflow-hidden, então conteúdo mais largo que a área seria
              cortado sem barra alguma. Assim degrada para rolagem. */}
        <main className="min-w-0 flex-1 overflow-auto">
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
    </div>
  );
}

/**
 * Cabeçalho de página, alinhado ao topo da área de conteúdo.
 * Padroniza título e subtítulo entre as cinco ferramentas.
 */
export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-medium leading-none tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
