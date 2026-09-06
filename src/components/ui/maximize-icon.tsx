"use client";

// Ícone da marca. Vem do "maximize" do Lucide, com os quatro cantos se
// afastando no hover.
//
// Único ajuste em relação ao original: o import sai de "motion/react" para
// "framer-motion", que é o pacote já usado no projeto. A API é a mesma, e
// translateX/translateY constam da lista de transforms do framer-motion.

import type { Transition } from "framer-motion";
import { motion, useAnimation, useReducedMotion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface MaximizeIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

const DEFAULT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 22,
};

/**
 * Deslocamento de cada canto, em unidades do viewBox de 24.
 *
 * Eram 2, o que a 18px na navbar virava 1,5px de movimento real — perto de
 * invisível. 3 unidades dão 2,25px, que já se lê sem virar sacudida.
 */
const TRAVEL = 3;

interface MaximizeIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const MaximizeIcon = forwardRef<MaximizeIconHandle, MaximizeIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);
    // Faltava respeitar prefers-reduced-motion: a logo se mexia mesmo para
    // quem pediu o contrário no sistema.
    const reduzirMovimento = useReducedMotion();

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start(reduzirMovimento ? "normal" : "animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start(reduzirMovimento ? "normal" : "animate");
        }
      },
      [controls, onMouseEnter, reduzirMovimento]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave]
    );

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.path
            animate={controls}
            d="M8 3H5a2 2 0 0 0-2 2v3"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateX: "0%", translateY: "0%" },
              animate: {
                translateX: `${-TRAVEL}px`,
                translateY: `${-TRAVEL}px`,
              },
            }}
          />

          <motion.path
            animate={controls}
            d="M21 8V5a2 2 0 0 0-2-2h-3"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateX: "0%", translateY: "0%" },
              animate: {
                translateX: `${TRAVEL}px`,
                translateY: `${-TRAVEL}px`,
              },
            }}
          />

          <motion.path
            animate={controls}
            d="M3 16v3a2 2 0 0 0 2 2h3"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateX: "0%", translateY: "0%" },
              animate: {
                translateX: `${-TRAVEL}px`,
                translateY: `${TRAVEL}px`,
              },
            }}
          />

          <motion.path
            animate={controls}
            d="M16 21h3a2 2 0 0 0 2-2v-3"
            transition={DEFAULT_TRANSITION}
            variants={{
              normal: { translateX: "0%", translateY: "0%" },
              animate: {
                translateX: `${TRAVEL}px`,
                translateY: `${TRAVEL}px`,
              },
            }}
          />
        </svg>
      </div>
    );
  }
);

MaximizeIcon.displayName = "MaximizeIcon";

export { MaximizeIcon };
