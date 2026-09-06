"use client";

import { QRCodeSVG } from "qrcode.react";
import { LOGO_PRESETS } from "@/components/qr/presets";
import { perfilUrl } from "@/lib/instagram";

/**
 * Prévia da tela de compartilhar perfil do Instagram.
 *
 * Mostra o QR de verdade, montado com o @ digitado — vira devolutiva ao vivo
 * em vez de mockup estático. Dimensionada em cqw sobre a tela do aparelho,
 * onde 100cqw equivale aos 393pt de largura do iPhone.
 */

const pt = (v: number) => `${(v / 393) * 100}cqw`;
const MARCA = LOGO_PRESETS.find((p) => p.id === "instagram");

/**
 * O QR da prévia NÃO leva a classe `qrcode-svg`.
 *
 * O download busca o código pelo `document.querySelector(".qrcode-svg")`, e
 * com dois elementos marcados ele pegaria o primeiro do DOM — que seria este,
 * decorativo, em vez do código do modal.
 */
export function PerfilPreview({ usuario }: { usuario: string }) {
  const arroba = usuario.trim() || "seu.perfil";

  return (
    <div
      className="imsg flex h-full w-full flex-col"
      style={{ fontFamily: "-apple-system, system-ui, sans-serif" }}
    >
      {/* Barra de status */}
      <div
        className="flex shrink-0 items-center justify-between"
        style={{ padding: `${pt(16)} ${pt(24)} 0`, height: pt(52) }}
      >
        <span
          className="font-semibold"
          style={{ fontSize: pt(15), color: "var(--imsg-received-text)" }}
        >
          10:51
        </span>
        <span style={{ fontSize: pt(13), color: "var(--imsg-received-text)" }}>
          ıı|ı 79
        </span>
      </div>

      {/* Topo: fechar, rótulo e leitor */}
      <div
        className="flex shrink-0 items-center justify-between"
        style={{ padding: `${pt(6)} ${pt(18)} 0` }}
      >
        <span
          className="imsg-glass flex items-center justify-center rounded-full"
          style={{ width: pt(40), height: pt(40) }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{ width: pt(17), height: pt(17) }}
            fill="none"
            stroke="var(--imsg-received-text)"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>

        <span
          className="imsg-glass rounded-full font-semibold"
          style={{
            padding: `${pt(7)} ${pt(16)}`,
            fontSize: pt(13),
            letterSpacing: "0.08em",
            color: "var(--imsg-received-text)",
          }}
        >
          SELFIE
        </span>

        <span
          className="imsg-glass flex items-center justify-center rounded-full"
          style={{ width: pt(40), height: pt(40) }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{ width: pt(18), height: pt(18) }}
            fill="none"
            stroke="var(--imsg-received-text)"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
          </svg>
        </span>
      </div>

      {/* Cartão com o código */}
      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ padding: `0 ${pt(34)}` }}
      >
        <div
          className="flex w-full flex-col items-center bg-white"
          style={{ borderRadius: pt(26), padding: `${pt(26)} ${pt(20)}` }}
        >
          <QRCodeSVG
            value={perfilUrl(arroba)}
            size={220}
            className="h-auto w-full"
            marginSize={0}
            level="H"
            fgColor="#111111"
            bgColor="#FFFFFF"
            imageSettings={
              MARCA
                ? {
                    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#fff"/><path fill="#111" d="${MARCA.path}"/></svg>`
                    )}`,
                    height: 52,
                    width: 52,
                    excavate: true,
                  }
                : undefined
            }
          />
          <p
            className="w-full truncate text-center font-bold uppercase text-[#111]"
            style={{
              marginTop: pt(14),
              fontSize: pt(21),
              letterSpacing: "0.02em",
            }}
          >
            @{arroba}
          </p>
        </div>

        {/* Três ações */}
        <div
          className="grid w-full grid-cols-3"
          style={{ gap: pt(9), marginTop: pt(14) }}
        >
          {[
            ["Share profile", "M12 15V4m0 0L8 8m4-4 4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"],
            ["Copy link", "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"],
            ["Download", "M12 4v11m0 0 4-4m-4 4-4-4M4 19h16"],
          ].map(([rotulo, d]) => (
            <div
              key={rotulo}
              className="imsg-glass flex flex-col items-center justify-center"
              style={{ borderRadius: pt(14), padding: `${pt(13)} ${pt(4)}`, gap: pt(7) }}
            >
              <svg
                viewBox="0 0 24 24"
                style={{ width: pt(19), height: pt(19) }}
                fill="none"
                stroke="var(--imsg-received-text)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={d} />
              </svg>
              <span
                className="truncate font-medium"
                style={{ fontSize: pt(11), color: "var(--imsg-received-text)" }}
              >
                {rotulo}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Refazer */}
      <div className="flex shrink-0 justify-center" style={{ paddingBottom: pt(30) }}>
        <span
          className="imsg-glass flex items-center rounded-full font-semibold"
          style={{
            gap: pt(8),
            padding: `${pt(12)} ${pt(26)}`,
            fontSize: pt(15),
            color: "var(--imsg-received-text)",
          }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{ width: pt(18), height: pt(18) }}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          Retake
        </span>
      </div>
    </div>
  );
}
