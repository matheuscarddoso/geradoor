"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Peças de modal no padrão das referências: selo colorido no topo, título e
 * descrição centralizados, linha de destaque, superfície de conteúdo e
 * rodapé com botões pill.
 */

const SELO =
  "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z";

const CORES = {
  sucesso: "#6EE7A8",
  erro: "#F8555F",
  info: "#B39CF7",
} as const;

const GLIFOS = {
  sucesso: <path d="m9 12 2 2 4-4" />,
  erro: (
    <>
      <line x1="12" x2="12" y1="8" y2="13" />
      <line x1="12" x2="12.01" y1="16.5" y2="16.5" />
    </>
  ),
  info: (
    <>
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </>
  ),
} as const;

/**
 * Selo recortado com o glifo vazado.
 *
 * O glifo é traçado na cor da SUPERFÍCIE, não em preto: assim ele acompanha
 * o tema e continua parecendo recorte, e não desenho por cima.
 */
export function DialogSelo({
  variante = "info",
  className,
}: {
  variante?: keyof typeof CORES;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("mx-auto h-11 w-11", className)}
      aria-hidden="true"
    >
      <path d={SELO} fill={CORES[variante]} />
      <g
        className="stroke-background"
        fill="none"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {GLIFOS[variante]}
      </g>
    </svg>
  );
}

/** Linha de destaque com marcador, para o dado que importa. */
export function DialogDestaque({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-1.5 text-sm text-[#E6C15C]">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <g className="stroke-background" fill="none" strokeWidth="2.4" strokeLinecap="round">
          <line x1="12" x2="12" y1="16" y2="12" />
          <line x1="12" x2="12.01" y1="8" y2="8" />
        </g>
      </svg>
      {children}
    </p>
  );
}

/** Superfície sutil para o conteúdo dentro do modal. */
export function DialogSuperficie({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-selected px-4 py-3", className)}>
      {children}
    </div>
  );
}

/** Rodapé: um botão ocupa a linha, dois dividem em partes iguais. */
export function DialogAcoes({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 grid gap-2 [&>*]:w-full [&:has(>*+*)]:grid-cols-2">
      {children}
    </div>
  );
}
