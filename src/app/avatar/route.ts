import { NextResponse } from "next/server";

export const runtime = "edge";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawName = searchParams.get("name") ?? "A";
  const name = rawName.toUpperCase().slice(0, 2);

  const background = searchParams.get("background") ?? "27272a";
  const color = searchParams.get("color") ?? "fff";

  const rawFontSize = parseFloat(searchParams.get("font-size") ?? "0.5");
  const isValidFontSize = !Number.isNaN(rawFontSize);
  const computedFontSize = isValidFontSize ? 32 * rawFontSize : 16;

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

  const height = !Number.isNaN(ratio) && ratio > 0 ? width / ratio : defaultDimension;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><style>@font-face{font-family:'Inter';font-style:normal;font-weight:500;font-display:swap;src:url(https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}</style></defs><rect fill="#${background}" width="${width}" height="${height}"/><text x="50%" y="50%" text-anchor="middle" font-family="Inter,-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Fira Sans','Droid Sans','Helvetica Neue',sans-serif" font-size="${computedFontSize}" fill="#${color}" font-weight="500" letter-spacing="-0.5" dy="0.35em">${name}</text></svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
