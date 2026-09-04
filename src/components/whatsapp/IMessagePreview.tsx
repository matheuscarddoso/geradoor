"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Tela do app Mensagens do iOS, para rodar dentro do PhoneFrame.
 *
 * Tudo é dimensionado em `cqw` sobre o container da tela: 100cqw equivale aos
 * 393pt de largura do aparelho, então cada medida abaixo é o valor real em
 * pontos convertido. É isso que mantém a proporção correta em qualquer
 * tamanho de frame, em vez de px fixo que quebra ao redimensionar.
 *
 * O conteúdo corre de cima para baixo, e não ancorado no rodapé como num chat
 * real, porque o frame mostra apenas a metade superior do aparelho.
 */

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Converte pontos do aparelho em cqw da tela. */
const pt = (value: number) => `${(value / 393) * 100}cqw`;

const BackIcon = () => (
  <svg viewBox="0 0 12 20" fill="none" aria-hidden="true" style={{ width: pt(11), height: pt(18) }}>
    <path d="M10.5 1.5 2 10l8.5 8.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const FaceTimeIcon = () => (
  <svg viewBox="0 0 28 18" fill="none" aria-hidden="true" style={{ width: pt(21), height: pt(13.5) }}>
    <rect x="1" y="1" width="17.5" height="16" rx="4.6" stroke="currentColor" strokeWidth="2" />
    <path d="M20.4 6.6 25.6 3c.6-.4 1.4 0 1.4.8v12.4c0 .8-.8 1.2-1.4.8l-5.2-3.6V6.6Z" fill="currentColor" />
  </svg>
);

const NameChevron = () => (
  <svg viewBox="0 0 7 11" fill="none" aria-hidden="true" style={{ width: pt(6), height: pt(10) }}>
    <path d="M1.2 1.2 5.5 5.5l-4.3 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Sinal, wi-fi e bateria da barra de status. */
const StatusIcons = () => (
  <div className="flex items-center" style={{ gap: pt(5), color: "var(--imsg-received-text)" }}>
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

interface IMessagePreviewProps {
  phone: string;
  message: string;
  className?: string;
}

/** Número claramente fictício, no formato brasileiro de celular. */
const PLACEHOLDER_PHONE = "+55 11 99999-9999";

const IMessagePreview: React.FC<IMessagePreviewProps> = ({ phone, message, className }) => {
  const reduceMotion = useReducedMotion();
  const hasMessage = message.trim().length > 0;

  const bubbleBase: React.CSSProperties = {
    maxWidth: "74%",
    padding: `${pt(7)} ${pt(13)} ${pt(8)}`,
    borderRadius: pt(18),
    fontSize: pt(16),
    lineHeight: 1.3,
    letterSpacing: "-0.01em",
  };

  return (
    <div className={cn("imsg relative flex h-full w-full flex-col", className)}>
      {/* Dissolve a conversa ao passar sob a barra de status e os controles */}
      <div
        className="imsg-scroll-edge pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: pt(46) }}
        aria-hidden="true"
      />

      {/* Barra de status. A altura livra a Dynamic Island, que fica no PNG. */}
      <div
        className="relative z-20 flex shrink-0 items-center justify-between"
        style={{ padding: `${pt(16)} ${pt(22)} 0`, height: pt(54) }}
      >
        <span
          className="font-semibold"
          style={{ fontSize: pt(15), color: "var(--imsg-received-text)", letterSpacing: "-0.01em" }}
        >
          9:41
        </span>
        <StatusIcons />
      </div>

      {/* Controles flutuantes do iOS 26.
          Medidas lidas na captura da Apple com régua em pt, não por detecção
          automática: a sombra desses botões é muito difusa e um detector de
          componentes conexos a soma ao elemento, inflando tudo em ~40%.
          Botão 45pt, avatar 57pt, pill 28pt de altura sobrepondo o avatar
          em apenas 2pt. */}
      <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: pt(66) }}>
        <span
          className="imsg-glass absolute flex items-center justify-center rounded-full"
          style={{
            left: pt(15),
            width: pt(45),
            height: pt(45),
            color: "var(--imsg-received-text)",
          }}
        >
          <BackIcon />
        </span>

        <span
          className="imsg-glass absolute flex items-center justify-center rounded-full"
          style={{
            right: pt(15),
            width: pt(45),
            height: pt(45),
            color: "var(--imsg-received-text)",
          }}
        >
          <FaceTimeIcon />
        </span>

        <div className="flex flex-col items-center" style={{ paddingTop: pt(3) }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- avatar estático do preview */}
          <img
            src="/contato-avatar.webp"
            alt=""
            className="rounded-full object-cover"
            style={{
              width: pt(57),
              height: pt(57),
              boxShadow: "0 1px 5px rgba(0,0,0,0.16)",
            }}
          />
          <span
            className="imsg-glass flex max-w-[78%] items-center rounded-full"
            style={{
              marginTop: pt(-2),
              gap: pt(3),
              padding: `${pt(5)} ${pt(9)} ${pt(6)} ${pt(12)}`,
            }}
          >
            <span
              className="truncate font-semibold"
              style={{
                fontSize: pt(14),
                lineHeight: 1.2,
                color: "var(--imsg-received-text)",
                letterSpacing: "-0.01em",
              }}
            >
              {phone.trim() || PLACEHOLDER_PHONE}
            </span>
            <span className="shrink-0 opacity-45" style={{ color: "var(--imsg-received-text)" }}>
              <NameChevron />
            </span>
          </span>
        </div>
      </div>

      {/* Conversa — corre do topo, porque o frame corta a metade de baixo.
          O padding superior livra os controles flutuantes. */}
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        style={{ padding: `${pt(178)} ${pt(14)} 0`, gap: pt(5) }}
      >
        <div className="text-center" style={{ paddingBottom: pt(6) }}>
          <p style={{ fontSize: pt(12), color: "var(--imsg-secondary)", lineHeight: 1.35 }}>
            WhatsApp
          </p>
          <p
            className="font-medium"
            style={{ fontSize: pt(12), color: "var(--imsg-secondary)", lineHeight: 1.35 }}
          >
            hoje 9:41
          </p>
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {hasMessage ? (
            <motion.div
              key="mensagem"
              layout={!reduceMotion}
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "scale(0.94) translateY(6px)" }}
              animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
              exit={{ opacity: 0, transform: "scale(0.96)" }}
              transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: EASE_OUT }}
              className="imsg-bubble imsg-bubble--sent"
              style={bubbleBase}
            >
              {message}
            </motion.div>
          ) : (
            <motion.div
              key="vazio"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="imsg-bubble imsg-bubble--sent"
              style={{ ...bubbleBase, opacity: 0.42 }}
            >
              Sua mensagem aparece aqui
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {hasMessage && (
            <motion.p
              key="entregue"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT, delay: 0.08 }}
              className="text-right font-medium"
              style={{ fontSize: pt(11), color: "var(--imsg-secondary)", letterSpacing: "0.01em" }}
            >
              Entregue
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default IMessagePreview;
