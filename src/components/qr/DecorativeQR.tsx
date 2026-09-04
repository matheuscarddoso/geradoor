"use client";

import React, { useMemo } from "react";

/**
 * QR decorativo — não codifica nada.
 *
 * Serve de prévia enquanto o usuário digita: o desenho reage ao conteúdo, mas
 * o código real só nasce quando ele clica em criar. É determinístico por
 * conteúdo (mesmo texto, mesmo desenho) para não tremer a cada tecla.
 */

const GRID = 25;
const FINDER = 7;
const QUIET = 0;

/** PRNG determinístico. Precisa ser estável entre render e re-render. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Área ocupada pelos três marcadores de posição, que nunca recebem ruído. */
function isFinderZone(row: number, col: number): boolean {
  const inTopLeft = row < FINDER + 1 && col < FINDER + 1;
  const inTopRight = row < FINDER + 1 && col >= GRID - FINDER - 1;
  const inBottomLeft = row >= GRID - FINDER - 1 && col < FINDER + 1;
  return inTopLeft || inTopRight || inBottomLeft;
}

interface DecorativeQRProps {
  /** Semente do desenho. Conteúdo diferente, padrão diferente. */
  seed: string;
  size: number;
  className?: string;
}

const DecorativeQR: React.FC<DecorativeQRProps> = ({ seed, size, className }) => {
  const cells = useMemo(() => {
    const random = mulberry32(hash(seed || "geradoor"));
    const result: Array<[number, number]> = [];
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        if (isFinderZone(row, col)) continue;
        if (random() > 0.52) result.push([row, col]);
      }
    }
    return result;
  }, [seed]);

  const total = GRID + QUIET * 2;

  const finder = (row: number, col: number) => (
    <g key={`f-${row}-${col}`}>
      <rect x={col} y={row} width={FINDER} height={FINDER} fill="currentColor" />
      <rect x={col + 1} y={row + 1} width={FINDER - 2} height={FINDER - 2} fill="#fff" />
      <rect x={col + 2} y={row + 2} width={FINDER - 4} height={FINDER - 4} fill="currentColor" />
    </g>
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${total} ${total}`}
      className={className}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
    >
      <rect width={total} height={total} fill="#fff" />
      {cells.map(([row, col]) => (
        <rect key={`${row}-${col}`} x={col} y={row} width={1} height={1} fill="currentColor" />
      ))}
      {finder(0, 0)}
      {finder(0, GRID - FINDER)}
      {finder(GRID - FINDER, 0)}
    </svg>
  );
};

export default DecorativeQR;
