import { NextResponse } from "next/server";

export const runtime = "edge";

function hashString(str: string): [number, number] {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return [h1 >>> 0, h2 >>> 0];
}

function mulberry32(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function gray(v: number): string {
  const h = Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, "0");
  return `#${h}${h}${h}`;
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawName = searchParams.get("name") ?? "A";
  const name = escapeXml(rawName.toUpperCase().slice(0, 2));

  const rawFontSize = parseFloat(searchParams.get("font-size") ?? "0.5");
  const computedFontSize = Number.isFinite(rawFontSize) ? 32 * rawFontSize : 16;

  const defaultDimension = 64;
  const width = defaultDimension;

  const ratioParam = searchParams.get("aspectRatio");
  let ratio = NaN;
  if (ratioParam) {
    if (ratioParam.includes("/")) {
      const [num, den] = ratioParam.split("/");
      ratio = parseFloat(num) / parseFloat(den);
    } else {
      ratio = parseFloat(ratioParam);
    }
  }
  const height =
    !Number.isNaN(ratio) && ratio > 0 ? width / ratio : defaultDimension;

  const hash = hashString(rawName);
  const rng = mulberry32(hash[0]);
  const p = Array.from({ length: 6 }, () => rng());

  // Dark base (8–35) guarantees WCAG AA contrast with white text
  const baseLuminance = 8 + ((hash[0] ^ hash[1]) & 0xff) % 28;

  const blobs = [
    {
      x: p[0],
      y: p[1],
      r: 0.5 + p[2] * 0.35,
      l: baseLuminance + 100 + ((hash[0] >> 8) & 0x3f),
    },
    {
      x: p[3],
      y: p[4],
      r: 0.45 + p[5] * 0.3,
      l: baseLuminance + 60 + ((hash[1] >> 8) & 0x3f),
    },
    {
      x: ((hash[0] >> 8) & 0xff) / 255,
      y: ((hash[1] >> 16) & 0xff) / 255,
      r: 0.65,
      l: baseLuminance + 140,
    },
  ];

  const defs = blobs
    .map(
      (b, i) =>
        `<radialGradient id="g${i}" cx="${b.x.toFixed(3)}" cy="${b.y.toFixed(3)}" r="${b.r.toFixed(3)}" gradientUnits="objectBoundingBox">` +
        `<stop offset="0%" stop-color="${gray(b.l)}" stop-opacity="0.85"/>` +
        `<stop offset="100%" stop-color="${gray(b.l)}" stop-opacity="0"/>` +
        `</radialGradient>`
    )
    .join("");

  const layers = blobs
    .map((_, i) => `<rect fill="url(#g${i})" width="${width}" height="${height}"/>`)
    .join("");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs>${defs}` +
    `<style>@font-face{font-family:'Inter';font-style:normal;font-weight:500;font-display:swap;` +
    `src:url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2) format('woff2');` +
    `unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}</style>` +
    `</defs>` +
    `<rect fill="${gray(baseLuminance)}" width="${width}" height="${height}"/>` +
    layers +
    `<text x="50%" y="50%" text-anchor="middle" ` +
    `font-family="Inter,-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Fira Sans','Droid Sans','Helvetica Neue',sans-serif" ` +
    `font-size="${computedFontSize}" fill="#ffffff" font-weight="500" letter-spacing="-0.5" dy="0.35em">${name}</text>` +
    `</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
