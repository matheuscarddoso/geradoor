"use client";

import React, { forwardRef, useId, useMemo } from "react";

import { DEGRADE, desenharQrInstagram, type VarianteDoQr } from "@/lib/qrInstagram";

interface QrInstagramProps {
  /** O que o código lê: o link curto do geradoor. */
  valor: string;
  /** O @ embaixo do código. Sem ele, o arquivo sai quadrado, só com o código. */
  usuario?: string | null;
  variante: VarianteDoQr;
  /**
   * Largura gravada no arquivo, em px. Na tela quem manda é o CSS; este valor
   * vale para quem abre o .svg baixado num editor.
   */
  largura?: number;
  className?: string;
  /** Nome acessível. Omitido, o desenho é decorativo. */
  titulo?: string;
}

/**
 * QR Code do Instagram no estilo do cartão de perfil do app, em preto ou no
 * degradê da marca.
 *
 * O mesmo elemento é a prévia e a fonte do download: o arquivo é este SVG
 * serializado, então o que a pessoa vê é exatamente o que ela baixa.
 */
export const QrInstagram = forwardRef<SVGSVGElement, QrInstagramProps>(function QrInstagram(
  { valor, usuario, variante, largura = 300, className, titulo },
  ref
) {
  const desenho = useMemo(() => desenharQrInstagram(valor, usuario), [valor, usuario]);

  // Id único por instância: o modal mostra as duas variantes ao mesmo tempo, e
  // a prévia do celular é uma terceira. Dois <linearGradient> com o mesmo id
  // fazem o navegador pintar todos com o primeiro — e, se esse estiver num
  // elemento oculto, com nada. O `useId` traz caracteres que `url(#…)` não
  // aceita sem escape; ficam só letras, números, _ e -.
  const idDoDegrade = `degrade-ig-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const tinta = variante === "gradiente" ? `url(#${idDoDegrade})` : "#000000";

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${desenho.largura} ${desenho.altura}`}
      width={largura}
      height={Number(((largura * desenho.altura) / desenho.largura).toFixed(2))}
      className={className}
      role={titulo ? "img" : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      {variante === "gradiente" && (
        <defs>
          {/* Uma régua só para o arquivo inteiro, do canto de cima ao fim do
              @: o degradê atravessa o código e continua no rótulo. */}
          <linearGradient
            id={idDoDegrade}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={desenho.largura}
            y2={desenho.altura}
          >
            {DEGRADE.map(([offset, cor]) => (
              <stop key={offset} offset={offset} stopColor={cor} />
            ))}
          </linearGradient>
        </defs>
      )}

      <rect width={desenho.largura} height={desenho.altura} fill="#FFFFFF" />

      <g fill={tinta}>
        <path d={desenho.pontos} />
        <path d={desenho.marcadores} fillRule="evenodd" />
        <path d={desenho.miolos} />
        <path d={desenho.glifo} fillRule="evenodd" />
        {desenho.rotulo && (
          <>
            <path d={desenho.rotulo.letras} />
            <path
              d={desenho.rotulo.arroba}
              fill="none"
              stroke={tinta}
              strokeWidth={desenho.rotulo.espessuraDaArroba}
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    </svg>
  );
});
