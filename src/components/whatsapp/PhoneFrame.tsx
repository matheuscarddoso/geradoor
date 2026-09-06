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

/**
 * Abertura da tela dentro do PNG, em pixels da imagem.
 *
 * A transição do bezel para a tela tem um pixel suavizado em cada borda —
 * alpha 74 nas laterais, 192 e 137 em cima e embaixo. A tela precisa passar
 * POR BAIXO desse pixel: parando na primeira coluna totalmente transparente,
 * o fundo do painel aparece através dos 29% de transparência e desenha um fio
 * claro contornando o aparelho.
 *
 * Vertical já cobria (201..1798). Horizontal parava em 93..826 e deixava as
 * colunas 92 e 827 de fora — daí o desencaixe.
 */
const SCREEN = { x: 92, y: 200, w: 736, h: 1600 };

/**
 * Recorte da tela pela máscara extraída do próprio PNG.
 *
 * `border-radius` foi abandonado aqui: a tela do iPhone é um squircle, de
 * curvatura contínua, e o CSS só desenha arco de círculo. O melhor ajuste
 * circular deu 119px com 2,54px de erro médio, e o conteúdo vazava no meio
 * da curva — nenhum raio único encaixa.
 *
 * A máscara é a região transparente do PNG isolada por flood fill (a área
 * fora do aparelho também é transparente, mas não se conecta à tela), com a
 * opacidade complementar da borda suavizada para não serrilhar.
 */
const SCREEN_MASK = "url(/iphone-screen-mask.png)";

/** Fração do aparelho que permanece visível antes do corte. */
const VISIBLE = 0.62;

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Recorte do aparelho.
   *
   * "fade" mostra metade e dissolve no corte — serve quando o frame está solto
   * sobre o fundo da página. "inteiro" desenha o aparelho todo e deixa quem
   * contém decidir onde cortar, que é o caso do painel com overflow-hidden:
   * dois recortes ao mesmo tempo brigam e o fade aparece no meio do painel.
   */
  recorte?: "fade" | "inteiro";
}

const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  className,
  recorte = "fade",
}) => {
  const inteiro = recorte === "inteiro";
  const visivel = inteiro ? 1 : VISIBLE;
  // O fade precisa ser mask, não gradiente sobreposto: sobreposição só
  // funciona contra um fundo de cor conhecida, e esta página tem textura.
  const fade = inteiro
    ? "none"
    : "linear-gradient(to bottom, #000 0%, #000 70%, rgba(0,0,0,0.85) 84%, transparent 100%)";

  return (
    <div
      className={cn("relative select-none", className)}
      style={{ aspectRatio: `${FRAME_W} / ${FRAME_H * visivel}` }}
    >
      <div
        className="absolute inset-x-0 top-0 overflow-hidden"
        style={{
          aspectRatio: `${FRAME_W} / ${FRAME_H * visivel}`,
          ...(inteiro ? {} : { maskImage: fade, WebkitMaskImage: fade }),
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
              maskImage: SCREEN_MASK,
              WebkitMaskImage: SCREEN_MASK,
              maskSize: "100% 100%",
              WebkitMaskSize: "100% 100%",
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
