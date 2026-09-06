"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Conversa do WhatsApp no iOS, para rodar dentro do PhoneFrame.
 *
 * Tudo é dimensionado em `cqw` sobre o container da tela: 100cqw equivale aos
 * 393pt de largura do aparelho, então cada medida abaixo é o valor real em
 * pontos convertido. É isso que mantém a proporção em qualquer tamanho de
 * frame, em vez de px fixo que quebra ao redimensionar.
 *
 * As medidas vieram da captura de referência, não de estimativa: avatar de
 * 36pt, header terminando a 97pt do topo (54 de barra de status + 43 de
 * navegação) e balões com raio de 9pt — bem mais fechado que os 18pt do
 * iMessage, que é o que mais denuncia um mockup trocado.
 */

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Converte pontos do aparelho em cqw da tela. */
const pt = (value: number) => `${(value / 393) * 100}cqw`;

const BackIcon = () => (
  <svg viewBox="0 0 12 20" fill="none" aria-hidden="true" style={{ width: pt(11), height: pt(19) }}>
    <path d="M10.5 1.5 2 10l8.5 8.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Câmera de vídeo do header: retângulo arredondado mais a cunha lateral. */
const VideoIcon = () => (
  <svg viewBox="0 0 28 18" fill="none" aria-hidden="true" style={{ width: pt(24), height: pt(15.5) }}>
    <rect x="1" y="1" width="17.6" height="16" rx="4.4" stroke="currentColor" strokeWidth="1.9" />
    <path d="M20.2 6.4 25.4 2.7c.7-.5 1.6 0 1.6.8v12c0 .8-.9 1.3-1.6.8l-5.2-3.7V6.4Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ width: pt(20), height: pt(20) }}>
    <path
      d="M5.2 1.7c.6-.6 1.6-.5 2.1.2l1.6 2.3c.4.6.3 1.4-.2 1.9l-.9.9c-.3.3-.4.7-.2 1a11 11 0 0 0 4.4 4.4c.3.2.7.1 1-.2l.9-.9c.5-.5 1.3-.6 1.9-.2l2.3 1.6c.7.5.8 1.5.2 2.1l-1 1c-.9.9-2.2 1.2-3.4.8A17.4 17.4 0 0 1 3.4 6.1c-.4-1.2-.1-2.5.8-3.4l1-1Z"
      fill="currentColor"
    />
  </svg>
);

/** Contorno de contato, quando não há foto. */
const AvatarPlaceholder = () => (
  <svg viewBox="0 0 36 36" aria-hidden="true" className="h-full w-full">
    <circle cx="18" cy="18" r="18" fill="var(--wa-avatar-bg)" />
    <circle cx="18" cy="14" r="6.2" fill="var(--wa-avatar-fg)" />
    <path d="M18 22.4c-5.4 0-9.8 3.4-9.8 7.6a18 18 0 0 0 19.6 0c0-4.2-4.4-7.6-9.8-7.6Z" fill="var(--wa-avatar-fg)" />
  </svg>
);

/** Rabinho do balão: fica no canto SUPERIOR, ao contrário do iMessage. */
const BubbleTail = () => (
  <svg
    viewBox="0 0 8 13"
    aria-hidden="true"
    className="absolute"
    style={{ top: 0, right: pt(-7.2), width: pt(8), height: pt(13) }}
  >
    <path d="M5.188 0H0v12.193L6.467 3.568C7.526 2.156 6.958 0 5.188 0z" fill="var(--wa-sent)" />
  </svg>
);

/** Dois vistos de leitura. */
const ReadTicks = () => (
  <svg viewBox="0 0 16 11" fill="none" aria-hidden="true" style={{ width: pt(15), height: pt(10) }}>
    <path d="M1 6.1 3.6 8.8 9.4 1.9" stroke="var(--wa-tick)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.4 6.1 9 8.8l5.8-6.9" stroke="var(--wa-tick)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Sinal, wi-fi e bateria da barra de status. */
const StatusIcons = () => (
  <div className="flex items-center" style={{ gap: pt(5), color: "var(--wa-header-text)" }}>
    <svg viewBox="0 0 18 12" fill="currentColor" aria-hidden="true" style={{ width: pt(17), height: pt(11) }}>
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0" width="3" height="12" rx="1" />
    </svg>
    <svg viewBox="0 0 16 12" fill="currentColor" aria-hidden="true" style={{ width: pt(16), height: pt(12) }}>
      <path d="M8 11.2 5.9 8.9a3 3 0 0 1 4.2 0L8 11.2Zm-4-4.4L2.4 5A8.1 8.1 0 0 1 13.6 5L12 6.8a5.8 5.8 0 0 0-8 0Zm2 2.2L4.4 7.4a5 5 0 0 1 7.2 0L10 9a2.9 2.9 0 0 0-4 0Z" />
    </svg>
    <svg viewBox="0 0 27 13" fill="none" aria-hidden="true" style={{ width: pt(27), height: pt(13) }}>
      <rect x="0.6" y="0.6" width="22.5" height="11.8" rx="3.6" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.1" />
      <rect x="2.2" y="2.2" width="19.3" height="8.6" rx="2.3" fill="currentColor" />
      <path d="M24.8 4.4v4.2c1-.4 1.6-1.1 1.6-2.1s-.6-1.7-1.6-2.1Z" fill="currentColor" fillOpacity="0.4" />
    </svg>
  </div>
);

/** Adesivo, câmera e microfone da barra de digitação. */
const StickerIcon = () => (
  <svg viewBox="0 0 22 22" fill="none" aria-hidden="true" style={{ width: pt(21), height: pt(21) }}>
    <path d="M11 1c5.5 0 10 4.5 10 10 0 .6-.6 1-1.2 1-4.8 0-7.8 2.6-7.8 8 0 .6-.4 1.2-1 1.2C5.5 21 1 16.5 1 11S5.5 1 11 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 24 20" fill="none" aria-hidden="true" style={{ width: pt(24), height: pt(20) }}>
    <path d="M2.6 5h3.1l1.5-2.4c.2-.4.6-.6 1-.6h7.6c.4 0 .8.2 1 .6L18.3 5h3.1c.9 0 1.6.7 1.6 1.6v9.8c0 .9-.7 1.6-1.6 1.6H2.6c-.9 0-1.6-.7-1.6-1.6V6.6C1 5.7 1.7 5 2.6 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    <circle cx="12" cy="11.2" r="4.1" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const MicIcon = () => (
  <svg viewBox="0 0 16 22" fill="none" aria-hidden="true" style={{ width: pt(16), height: pt(22) }}>
    <rect x="4.4" y="1" width="7.2" height="12.2" rx="3.6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M1 10.4v1.2a7 7 0 0 0 14 0v-1.2M8 18.6V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

interface WhatsappChatPreviewProps {
  phone: string;
  message: string;
  className?: string;
}

/** Número claramente fictício, no formato brasileiro de celular. */
const PLACEHOLDER_PHONE = "+55 11 99999-9999";

const WhatsappChatPreview: React.FC<WhatsappChatPreviewProps> = ({ phone, message, className }) => {
  const reduceMotion = useReducedMotion();
  const temMensagem = message.trim().length > 0;

  return (
    <div className={cn("wa relative flex h-full w-full flex-col", className)}>
      {/* O papel de parede fica na camada de baixo, atrás de tudo. */}
      <div className="wa-wallpaper absolute inset-0" aria-hidden="true" />

      <header className="wa-header relative z-10 shrink-0">
        <div
          className="flex items-center justify-between"
          style={{ padding: `${pt(15)} ${pt(22)} 0`, height: pt(54) }}
        >
          <span
            className="font-semibold"
            style={{ fontSize: pt(15), color: "var(--wa-header-text)", letterSpacing: "-0.01em" }}
          >
            9:41
          </span>
          <StatusIcons />
        </div>

        <div
          className="flex items-center"
          style={{ height: pt(43), padding: `0 ${pt(14)} 0 ${pt(11)}`, gap: pt(6), color: "var(--wa-icon)" }}
        >
          <BackIcon />

          <span className="shrink-0 overflow-hidden rounded-full" style={{ width: pt(36), height: pt(36) }}>
            <AvatarPlaceholder />
          </span>

          <div className="min-w-0 flex-1" style={{ paddingLeft: pt(3) }}>
            <p
              className="truncate font-semibold"
              style={{
                fontSize: pt(16),
                lineHeight: 1.15,
                color: "var(--wa-header-text)",
                letterSpacing: "-0.01em",
              }}
            >
              {phone.trim() || PLACEHOLDER_PHONE}
            </p>
            <p style={{ fontSize: pt(12), lineHeight: 1.3, color: "var(--wa-meta)" }}>online</p>
          </div>

          <div className="flex shrink-0 items-center" style={{ gap: pt(20) }}>
            <VideoIcon />
            <PhoneIcon />
          </div>
        </div>
      </header>

      {/* As mensagens ficam ancoradas embaixo, como numa conversa de verdade. */}
      <div
        className="relative z-0 flex min-h-0 flex-1 flex-col justify-end"
        style={{ padding: `${pt(10)} ${pt(9)} ${pt(8)}`, gap: pt(6) }}
      >
        <span
          className="wa-datepill mx-auto"
          style={{
            fontSize: pt(12),
            padding: `${pt(4)} ${pt(11)}`,
            borderRadius: pt(8),
            letterSpacing: "0.01em",
          }}
        >
          HOJE
        </span>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={temMensagem ? "mensagem" : "vazio"}
            layout={!reduceMotion}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.96) translateY(6px)" }}
            animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
            exit={{ opacity: 0, transform: "scale(0.97)" }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: EASE_OUT }}
            className="wa-bubble relative ml-auto"
            style={{
              maxWidth: "78%",
              padding: `${pt(6)} ${pt(9)} ${pt(7)}`,
              borderRadius: pt(9),
              borderTopRightRadius: 0,
              fontSize: pt(16),
              lineHeight: 1.32,
              letterSpacing: "-0.01em",
              opacity: temMensagem ? 1 : 0.55,
            }}
          >
            <BubbleTail />
            {temMensagem ? message : "Sua mensagem aparece aqui"}
            {/* Espaçador invisível: reserva, na última linha, o lugar da hora e
                dos vistos, que ficam posicionados por cima. É como o próprio
                WhatsApp resolve — sem ele o texto passa por baixo do horário. */}
            <span className="inline-block" style={{ width: pt(58), height: pt(1) }} aria-hidden="true" />
            <span
              className="absolute flex items-center"
              style={{ right: pt(9), bottom: pt(6), gap: pt(3) }}
            >
              <span style={{ fontSize: pt(11), color: "var(--wa-bubble-meta)", letterSpacing: 0 }}>
                9:41
              </span>
              <ReadTicks />
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="wa-inputbar relative z-10 shrink-0">
        <div
          className="flex items-center"
          style={{ height: pt(52), padding: `0 ${pt(12)}`, gap: pt(11), color: "var(--wa-icon)" }}
        >
          <svg viewBox="0 0 22 22" fill="none" aria-hidden="true" style={{ width: pt(22), height: pt(22) }}>
            <path d="M11 2v18M2 11h18" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>

          <span
            className="wa-field flex flex-1 items-center justify-end"
            style={{ height: pt(34), borderRadius: pt(17), padding: `0 ${pt(9)}` }}
          >
            <StickerIcon />
          </span>

          <CameraIcon />
          <MicIcon />
        </div>

        <div className="flex justify-center" style={{ paddingBottom: pt(9) }}>
          <span
            className="rounded-full"
            style={{ width: pt(139), height: pt(5), background: "var(--wa-home-indicator)" }}
          />
        </div>
      </div>
    </div>
  );
};

export default WhatsappChatPreview;
