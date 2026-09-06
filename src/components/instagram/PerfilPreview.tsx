"use client";

import { LOGO_PRESETS } from "@/components/qr/presets";

/**
 * Prévia do perfil do Instagram dentro do PhoneFrame.
 *
 * Dimensionada em cqw sobre a tela do aparelho, como a do WhatsApp: 100cqw
 * equivale aos 393pt de largura do iPhone, então tudo acompanha o frame.
 */

const pt = (v: number) => `${(v / 393) * 100}cqw`;
const MARCA = LOGO_PRESETS.find((p) => p.id === "instagram");

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
        style={{ padding: `${pt(16)} ${pt(22)} 0`, height: pt(54) }}
      >
        <span
          className="font-semibold"
          style={{ fontSize: pt(15), color: "var(--imsg-received-text)" }}
        >
          9:41
        </span>
      </div>

      {/* Topo: marca */}
      <div
        className="flex shrink-0 items-center justify-center"
        style={{ paddingBottom: pt(14) }}
      >
        {MARCA && (
          <svg viewBox="0 0 24 24" style={{ width: pt(26), height: pt(26) }} aria-hidden="true">
            <path fill="var(--imsg-received-text)" d={MARCA.path} />
          </svg>
        )}
      </div>

      <div style={{ paddingInline: pt(18) }}>
        {/* Avatar e números */}
        <div className="flex items-center" style={{ gap: pt(22) }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar estático do preview */}
          <img
            src="/contato-avatar.webp"
            alt=""
            className="shrink-0 rounded-full object-cover"
            style={{ width: pt(84), height: pt(84) }}
          />
          <div className="flex flex-1 justify-around">
            {[
              ["128", "posts"],
              ["4.821", "seguidores"],
              ["312", "seguindo"],
            ].map(([n, r]) => (
              <div key={r} className="text-center">
                <p
                  className="font-semibold"
                  style={{ fontSize: pt(16), color: "var(--imsg-received-text)" }}
                >
                  {n}
                </p>
                <p style={{ fontSize: pt(12), color: "var(--imsg-secondary)" }}>{r}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Arroba */}
        <p
          className="truncate font-semibold"
          style={{
            marginTop: pt(14),
            fontSize: pt(15),
            color: "var(--imsg-received-text)",
          }}
        >
          @{arroba}
        </p>
        <p
          style={{ marginTop: pt(4), fontSize: pt(14), color: "var(--imsg-secondary)" }}
        >
          Toque no link para abrir o perfil
        </p>

        {/* Ações */}
        <div className="flex" style={{ gap: pt(8), marginTop: pt(16) }}>
          <span
            className="flex flex-1 items-center justify-center font-semibold"
            style={{
              height: pt(34),
              borderRadius: pt(9),
              fontSize: pt(14),
              background: "var(--imsg-sent)",
              color: "#fff",
            }}
          >
            Seguir
          </span>
          <span
            className="flex flex-1 items-center justify-center font-semibold"
            style={{
              height: pt(34),
              borderRadius: pt(9),
              fontSize: pt(14),
              background: "var(--imsg-received)",
              color: "var(--imsg-received-text)",
            }}
          >
            Mensagem
          </span>
        </div>

        {/* Grade de publicações */}
        <div
          className="grid grid-cols-3"
          style={{ gap: pt(3), marginTop: pt(18) }}
        >
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1",
                background: "var(--imsg-received)",
                opacity: 1 - i * 0.06,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
