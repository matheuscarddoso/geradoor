"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * Frame do iPhone 17 Pro, cortado na metade com fade no corte.
 *
 * A abertura da tela no PNG é transparente, então o conteúdo fica ATRÁS da
 * imagem: o bezel e a Dynamic Island passam por cima naturalmente, sem
 * precisar recortar nada.
 *
 * As medidas abaixo foram extraídas do próprio arquivo por flood fill na
 * região transparente, não estimadas — é o que faz a tela encaixar sem folga.
 * Proporção da abertura: 2,1771, contra 2,1741 do aparelho real.
 */

/** Dimensões do PNG. */
const FRAME_W = 920;
const FRAME_H = 2000;

/** Abertura da tela dentro do PNG, em pixels da imagem. */
const SCREEN = { x: 93, y: 201, w: 734, h: 1598 };

/**
 * Raio do canto da tela, medido na curvatura da abertura: 129px.
 *
 * Escrito como raio percentual de dois eixos (horizontal / vertical). Como a
 * porcentagem de cada eixo é relativa à dimensão daquele eixo, o par abaixo
 * reproduz exatamente um raio circular de 129px em qualquer escala de render —
 * um valor único em % viraria uma elipse.
 */
const SCREEN_RADIUS = `${(129 / SCREEN.w) * 100}% / ${(129 / SCREEN.h) * 100}%`;

/** Fração do aparelho que permanece visível antes do corte. */
const VISIBLE = 0.62;

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({ children, className }) => {
  // O fade precisa ser mask, não gradiente sobreposto: sobreposição só
  // funciona contra um fundo de cor conhecida, e esta página tem textura.
  const fade =
    "linear-gradient(to bottom, #000 0%, #000 70%, rgba(0,0,0,0.85) 84%, transparent 100%)";

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ aspectRatio: `${FRAME_W} / ${FRAME_H * VISIBLE}` }}
    >
      <div
        className="absolute inset-x-0 top-0 overflow-hidden"
        style={{
          aspectRatio: `${FRAME_W} / ${FRAME_H * VISIBLE}`,
          maskImage: fade,
          WebkitMaskImage: fade,
        }}
      >
        {/* Caixa do aparelho inteiro, ancorada no topo. O que passa do corte
            é aparado pelo overflow do contêiner acima. */}
        <div
          className="absolute inset-x-0 top-0"
          style={{ aspectRatio: `${FRAME_W} / ${FRAME_H}` }}
        >
          {/* Tela — atrás do frame */}
          <div
            className="absolute overflow-hidden"
            style={{
              left: pct(SCREEN.x, FRAME_W),
              top: pct(SCREEN.y, FRAME_H),
              width: pct(SCREEN.w, FRAME_W),
              height: pct(SCREEN.h, FRAME_H),
              borderRadius: SCREEN_RADIUS,
              // Container de consulta: o conteúdo da tela dimensiona tudo em
              // cqw, então tipografia e espaçamento acompanham o frame em
              // qualquer tamanho, em vez de quebrar a proporção em px fixo.
              containerType: "inline-size",
            }}
          >
            {children}
          </div>

          {/* Bezel e Dynamic Island por cima */}
          {/* eslint-disable-next-line @next/next/no-img-element -- asset estático, sem otimização a ganhar */}
          <img
            src="/iphone-17-pro.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
          />
        </div>
      </div>
    </div>
  );
};

export default PhoneFrame;
