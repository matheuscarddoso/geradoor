"use client";

import React from "react";
import { Slider } from "dialkit";

/**
 * Limites do tamanho do logo, em fração do lado do QR.
 *
 * Mesmo com correção de erro nível H (recupera ~30% dos módulos), passar de
 * 30% do lado faz leitores começarem a falhar. O slider não deixa chegar lá.
 *
 * Ficam aqui, e não em cada tela, porque as três — QR Code, WhatsApp e
 * Instagram — precisam do mesmo teto. Um limite frouxo numa delas geraria
 * código ilegível sem que nada acusasse.
 */
export const LOGO_MIN_SCALE = 0.12;
export const LOGO_MAX_SCALE = 0.3;
export const LOGO_DEFAULT_SCALE = 0.22;

interface LogoScaleSliderProps {
  /** Fração do lado do QR ocupada pelo logo. */
  scale: number;
  onScaleChange: (scale: number) => void;
  label?: string;
}

/**
 * O `.dialkit-root` não é decorativo: a dialkit declara todas as variáveis de
 * CSS dela nessa classe, normalmente aplicada pelo `DialRoot`. Um `Slider`
 * avulso sem esse ancestral renderiza sem nenhuma medida e desaparece.
 */
export function LogoScaleSlider({ scale, onScaleChange, label = "Tamanho" }: LogoScaleSliderProps) {
  return (
    <div className="dialkit-root">
      <Slider
        label={label}
        value={Math.round(scale * 100)}
        onChange={(proximo) => onScaleChange(proximo / 100)}
        min={LOGO_MIN_SCALE * 100}
        max={LOGO_MAX_SCALE * 100}
        step={1}
        unit="%"
      />
    </div>
  );
}
