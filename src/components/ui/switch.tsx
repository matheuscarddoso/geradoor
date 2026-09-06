"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

/**
 * Switch com a aparência do UISwitch do iOS.
 *
 * O tamanho real do nativo (51x31) fica grande demais junto de tipografia de
 * 13px e controles de 36px, então a peça foi reduzida MANTENDO a proporção:
 *
 *   nativo   51x31  botão 27  ->  trilho 1.645  botão/altura 0.871
 *   aqui     40x24  botão 21  ->  trilho 1.667  botão/altura 0.875
 *
 * Menos de 1,5% de desvio nos dois eixos. Em pixel e não na escala do Tailwind
 * porque arredondar para w-10/h-6 quebraria a razão, e o desenho denuncia.
 *
 * A curva é a do iOS (0.32, 0.72, 0, 1), que sai rápido e desacelera longo.
 */
const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-[24px] w-[40px] shrink-0 cursor-pointer items-center rounded-full p-[1.5px]",
      "transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "bg-[var(--ios-switch-off)] data-[state=checked]:bg-[var(--ios-switch-on)]",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[21px] w-[21px] rounded-full bg-white",
        "transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
        "shadow-[0_2px_5px_rgba(0,0,0,0.15),0_2px_1px_rgba(0,0,0,0.06)]",
        "data-[state=unchecked]:translate-x-0 data-[state=checked]:translate-x-[16px]"
      )}
    />
  </SwitchPrimitives.Root>
))
Switch.displayName = SwitchPrimitives.Root.displayName

export { Switch }
