"use client";

import React from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Check } from "lucide-react";

import { QrInstagram } from "@/components/instagram/QrInstagram";
import { DEGRADE, VARIANTES, type VarianteDoQr } from "@/lib/qrInstagram";
import { useFerramentas } from "@/lib/useTextos";
import { cn } from "@/lib/utils";

/**
 * A escolha entre o código preto e o em degradê, em dois formatos: segmentado
 * no formulário, para decidir antes, e cartões no modal, para comparar o
 * código de verdade lado a lado antes de baixar. Os dois leem e escrevem o
 * mesmo estado.
 *
 * Radix e não botões soltos: é uma escolha exclusiva, então é `radiogroup` —
 * setas movem a seleção e o Tab para uma vez só no grupo.
 */

const AMOSTRA_DO_DEGRADE = `linear-gradient(135deg, ${DEGRADE.map(([o, c]) => `${c} ${o * 100}%`).join(", ")})`;

function useRotulos(): Record<VarianteDoQr, string> {
  const f = useFerramentas();
  return { preto: f.instagram.estiloPreto, gradiente: f.instagram.estiloGradiente };
}

function Amostra({ variante }: { variante: VarianteDoQr }) {
  return (
    <span
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/20"
      style={{ background: variante === "gradiente" ? AMOSTRA_DO_DEGRADE : "#000000" }}
    />
  );
}

interface SeletorProps {
  valor: VarianteDoQr;
  onChange: (variante: VarianteDoQr) => void;
}

/** Segmentado do formulário, no mesmo desenho do seletor de estilo do vetorizador. */
export function SeletorDeVariante({ valor, onChange }: SeletorProps) {
  const f = useFerramentas();
  const rotulos = useRotulos();

  return (
    <RadioGroup.Root
      value={valor}
      onValueChange={(v) => onChange(v as VarianteDoQr)}
      aria-label={f.instagram.estilo}
      orientation="horizontal"
      className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1"
    >
      {VARIANTES.map((variante) => (
        <RadioGroup.Item
          key={variante}
          value={variante}
          className={cn(
            "flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-[13px] text-subtle",
            "transition-[background-color,color,box-shadow] duration-150 hover:text-foreground",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-zinc-400",
            "data-[state=checked]:bg-background data-[state=checked]:font-medium data-[state=checked]:text-foreground",
            "data-[state=checked]:shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.08)]",
            "dark:data-[state=checked]:bg-zinc-800 dark:data-[state=checked]:shadow-[0_0_0_0.5px_rgb(255_255_255/0.08)]"
          )}
        >
          <Amostra variante={variante} />
          {rotulos[variante]}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}

interface EscolhaProps extends SeletorProps {
  valorDoQr: string;
  usuario?: string | null;
  /** Recebe o <svg> de cada variante: é dele que o download serializa o arquivo. */
  registrar: (variante: VarianteDoQr, svg: SVGSVGElement | null) => void;
}

/**
 * Cartões do modal com o código de verdade das duas variantes.
 *
 * A seleção não depende só do anel: o cartão escolhido ganha superfície, o
 * rótulo fica em peso e cor de texto principal e aparece o check.
 */
export function EscolhaDeVariante({ valor, onChange, valorDoQr, usuario, registrar }: EscolhaProps) {
  const f = useFerramentas();
  const rotulos = useRotulos();

  return (
    <RadioGroup.Root
      value={valor}
      onValueChange={(v) => onChange(v as VarianteDoQr)}
      aria-label={f.instagram.estilo}
      orientation="horizontal"
      className="grid grid-cols-2 gap-2"
    >
      {VARIANTES.map((variante) => (
        <RadioGroup.Item
          key={variante}
          value={variante}
          className={cn(
            // Raio concêntrico: 20 por fora = 12 do código + 8 de respiro.
            "group flex flex-col gap-2.5 rounded-[20px] p-2 pb-2.5 text-start",
            "transition-[background-color,box-shadow] duration-150 ease-out",
            "hover:bg-selected/60 data-[state=checked]:bg-selected",
            "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <QrInstagram
            ref={(svg) => registrar(variante, svg)}
            valor={valorDoQr}
            usuario={usuario}
            variante={variante}
            titulo={rotulos[variante]}
            className={cn(
              "h-auto w-full rounded-xl",
              // O código é branco: no tema escuro precisa de borda para não
              // vazar no cartão; no claro, de uma sombra mínima para não sumir.
              "shadow-[0_0_0_1px_rgb(0_0_0/0.08)] dark:shadow-[0_0_0_1px_rgb(255_255_255/0.1)]"
            )}
          />
          <span className="flex w-full items-center gap-2 px-1 text-[13px] text-subtle group-data-[state=checked]:font-medium group-data-[state=checked]:text-foreground">
            <Amostra variante={variante} />
            {rotulos[variante]}
            <Check
              aria-hidden="true"
              className="ms-auto h-3.5 w-3.5 opacity-0 transition-opacity duration-150 stroke-[2.25] group-data-[state=checked]:opacity-100"
            />
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
