"use client";

import { useFerramentas } from "@/lib/useTextos";
import { preencher } from "@/lib/textosDasFerramentas";

import { useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from "framer-motion";
import { ChevronsLeftRight, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_IOS = [0.32, 0.72, 0, 1] as const;
const PASSO_TECLADO = 5;
const RAIO_DO_PUXADOR = 18;

/**
 * Níveis de zoom. Até 8× porque é onde a diferença entre pixel e curva salta
 * aos olhos. Não mais: a camada ampliada de uma caixa de 900 px a 8× já tem
 * 7200 px de lado, e o navegador rasteriza o que aparece dela.
 */
const NIVEIS = [1, 2, 4, 8] as const;

interface ComparadorDoVetorProps {
  original: string;
  /** O SVG. Nulo enquanto a primeira vetorização não terminou. */
  vetor: string | null;
  largura: number;
  altura: number;
  processando: boolean;
  nome: string;
}

/**
 * A imagem e o SVG sobrepostos, com divisória e zoom.
 *
 * Mesma gramática do comparador do removedor de fundo — original à esquerda da
 * divisória, resultado à direita, as duas camadas na mesma caixa —, com uma
 * coisa a mais: zoom. Vetorizar é trocar pixel por curva, e é no zoom que isso
 * se vê. A original ampliada fica pixelada de propósito (`image-rendering:
 * pixelated`); o SVG, desenhado pelo navegador na escala da tela, continua
 * nítido.
 *
 * Com zoom 1, arrastar em qualquer ponto move a divisória. Ampliado, arrastar
 * move a imagem, e a divisória só se move pelo puxador.
 */
export function ComparadorDoVetor({ original, vetor, largura, altura, processando, nome }: ComparadorDoVetorProps) {
  const f = useFerramentas();
  const reduzirMovimento = useReducedMotion();
  const caixaRef = useRef<HTMLDivElement>(null);
  const animacao = useRef<AnimationPlaybackControls | null>(null);
  const arrasto = useRef<{ tipo: "divisoria" | "imagem"; x: number; y: number; px: number; py: number } | null>(null);

  const posicao = useMotionValue(100);
  const [valorAria, setValorAria] = useState(100);
  useMotionValueEvent(posicao, "change", (valor) => setValorAria(Math.round(valor)));

  const [zoom, setZoom] = useState(1);
  // A escala também é motion value: a transformação é recalculada quando
  // qualquer um dos três muda, sem depender de o deslocamento mudar junto.
  const escala = useMotionValue(1);
  const deslocX = useMotionValue(0);
  const deslocY = useMotionValue(0);
  const transformacao = useTransform(
    [deslocX, deslocY, escala],
    ([x, y, e]: number[]) => `translate(${x}px, ${y}px) scale(${e})`
  );

  const recorteOriginal = useTransform(posicao, (p) => `inset(0 ${100 - p}% 0 0)`);
  const esquerda = useTransform(posicao, (p) => `${p}%`);
  const esquerdaDoPuxador = useTransform(
    posicao,
    (p) => `clamp(${RAIO_DO_PUXADOR}px, ${p}%, calc(100% - ${RAIO_DO_PUXADOR}px))`
  );
  const opacidadeAntes = useTransform(posicao, [4, 16], [0, 1]);
  const opacidadeDepois = useTransform(posicao, [84, 96], [1, 0]);

  // A primeira vetorização de uma imagem revela o resultado com a divisória
  // correndo até o meio. As seguintes, de ajuste, só trocam o SVG no lugar:
  // a pessoa está comparando, e a divisória fica onde ela deixou.
  const temVetor = vetor !== null;
  useEffect(() => {
    animacao.current?.stop();
    if (!temVetor) {
      posicao.set(100);
      return;
    }
    if (reduzirMovimento) {
      posicao.set(50);
      return;
    }
    posicao.set(100);
    animacao.current = animate(posicao, 50, { duration: 1.1, ease: EASE_IOS, delay: 0.08 });
    return () => animacao.current?.stop();
  }, [temVetor, reduzirMovimento, posicao]);

  // Imagem nova volta ao zoom inteiro.
  useEffect(() => {
    setZoom(1);
    escala.set(1);
    deslocX.set(0);
    deslocY.set(0);
  }, [original, escala, deslocX, deslocY]);

  /** Mantém a imagem cobrindo a caixa: não dá para arrastar para o vazio. */
  const limitarDeslocamento = (x: number, y: number, nivel: number) => {
    const caixa = caixaRef.current?.getBoundingClientRect();
    if (!caixa) return { x: 0, y: 0 };
    return {
      x: Math.min(0, Math.max(caixa.width * (1 - nivel), x)),
      y: Math.min(0, Math.max(caixa.height * (1 - nivel), y)),
    };
  };

  /** Muda o zoom mantendo fixo o ponto da tela em (cx, cy), relativo à caixa. */
  const aplicarZoom = (nivel: number, cx?: number, cy?: number) => {
    const caixa = caixaRef.current?.getBoundingClientRect();
    if (!caixa) return;
    const px = cx ?? caixa.width / 2;
    const py = cy ?? caixa.height / 2;
    const fator = nivel / zoom;
    const { x, y } = limitarDeslocamento(px - (px - deslocX.get()) * fator, py - (py - deslocY.get()) * fator, nivel);
    setZoom(nivel);
    escala.set(nivel);
    deslocX.set(x);
    deslocY.set(y);
  };

  const indice = NIVEIS.indexOf(zoom as (typeof NIVEIS)[number]);
  const ampliar = () => indice < NIVEIS.length - 1 && aplicarZoom(NIVEIS[indice + 1]);
  const reduzir = () => indice > 0 && aplicarZoom(NIVEIS[indice - 1]);

  // ⌘/Ctrl + roda do mouse e pinça do trackpad (que chega como roda com Ctrl).
  // Listener nativo, e não onWheel: o do React é passivo e não pode impedir o
  // zoom da página inteira.
  const zoomRef = useRef(aplicarZoom);
  zoomRef.current = aplicarZoom;
  const nivelRef = useRef(zoom);
  nivelRef.current = zoom;
  useEffect(() => {
    const caixa = caixaRef.current;
    if (!caixa || !temVetor) return;
    const aoRolar = (evento: WheelEvent) => {
      if (!evento.ctrlKey && !evento.metaKey) return;
      evento.preventDefault();
      const i = NIVEIS.indexOf(nivelRef.current as (typeof NIVEIS)[number]);
      const proximo = evento.deltaY < 0 ? NIVEIS[Math.min(NIVEIS.length - 1, i + 1)] : NIVEIS[Math.max(0, i - 1)];
      if (proximo === nivelRef.current) return;
      const retangulo = caixa.getBoundingClientRect();
      zoomRef.current(proximo, evento.clientX - retangulo.left, evento.clientY - retangulo.top);
    };
    caixa.addEventListener("wheel", aoRolar, { passive: false });
    return () => caixa.removeEventListener("wheel", aoRolar);
  }, [temVetor]);

  const posicionarDivisoria = (clientX: number) => {
    const caixa = caixaRef.current?.getBoundingClientRect();
    if (!caixa || caixa.width === 0) return;
    posicao.set(Math.min(100, Math.max(0, ((clientX - caixa.left) / caixa.width) * 100)));
  };

  const interativo = temVetor;
  const ampliado = zoom > 1;
  const proporcao = largura / altura;

  // Sem will-change: com ele o navegador rasteriza a camada uma vez e só
  // estica o bitmap no zoom, e o SVG ampliado sairia borrado — justamente o
  // que o zoom existe para mostrar que não acontece.
  const camada = "pointer-events-none absolute left-0 top-0 h-full w-full origin-top-left";

  return (
    <div
      ref={caixaRef}
      className={cn(
        "relative select-none overflow-hidden rounded-lg",
        interativo && !ampliado && "cursor-ew-resize [touch-action:pan-y]",
        interativo && ampliado && "cursor-grab [touch-action:none] active:cursor-grabbing"
      )}
      style={{ width: `min(100cqw, ${proporcao * 100}cqh)`, aspectRatio: `${largura} / ${altura}` }}
      onPointerDown={(evento) => {
        if (!interativo || evento.button !== 0) return;
        animacao.current?.stop();
        evento.currentTarget.setPointerCapture(evento.pointerId);
        arrasto.current = {
          tipo: ampliado ? "imagem" : "divisoria",
          x: evento.clientX,
          y: evento.clientY,
          px: deslocX.get(),
          py: deslocY.get(),
        };
        if (!ampliado) posicionarDivisoria(evento.clientX);
      }}
      onPointerMove={(evento) => {
        const a = arrasto.current;
        if (!a) return;
        if (a.tipo === "divisoria") {
          posicionarDivisoria(evento.clientX);
          return;
        }
        const { x, y } = limitarDeslocamento(a.px + evento.clientX - a.x, a.py + evento.clientY - a.y, zoom);
        deslocX.set(x);
        deslocY.set(y);
      }}
      onPointerUp={() => (arrasto.current = null)}
      onPointerCancel={() => (arrasto.current = null)}
      onDoubleClick={(evento) => {
        if (!interativo) return;
        const caixa = evento.currentTarget.getBoundingClientRect();
        aplicarZoom(ampliado ? 1 : 4, evento.clientX - caixa.left, evento.clientY - caixa.top);
      }}
    >
      {interativo && <div aria-hidden="true" className="xadrez absolute inset-0" />}

      {vetor && (
        <motion.div style={{ transform: transformacao }} className={camada}>
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL gerado no cliente */}
          <img src={vetor} alt={`${nome}, vetorizado`} draggable={false} className="h-full w-full" />
        </motion.div>
      )}

      <motion.div style={{ clipPath: interativo ? recorteOriginal : undefined }} className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div style={{ transform: transformacao }} className={camada}>
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL gerado no cliente */}
          <img
            src={original}
            alt={interativo ? `${nome}, original` : nome}
            draggable={false}
            className={cn("h-full w-full", ampliado && "[image-rendering:pixelated]")}
          />
        </motion.div>
      </motion.div>

      {processando && <div aria-hidden="true" className="varredura absolute inset-0" />}

      {interativo && (
        <>
          <motion.span
            aria-hidden="true"
            style={{ opacity: opacidadeAntes }}
            className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-md"
          >{f.vetorizador.imagem}</motion.span>
          <motion.span
            aria-hidden="true"
            style={{ opacity: opacidadeDepois }}
            className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-md"
          >
            SVG
          </motion.span>

          <motion.div
            aria-hidden="true"
            style={{ left: esquerda }}
            className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.15),0_0_12px_rgb(0_0_0/0.25)]"
          />
          <motion.div style={{ left: esquerdaDoPuxador }} className="pointer-events-none absolute top-1/2">
            <div
              role="slider"
              tabIndex={0}
              aria-label={f.vetorizador.compararSvg}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={valorAria}
              aria-valuetext={preencher(f.vetorizador.daImagemAMostra, { valor: valorAria })}
              data-touch-target
              onPointerDown={(evento) => {
                // O puxador sempre move a divisória, mesmo com zoom.
                if (evento.button !== 0) return;
                evento.stopPropagation();
                animacao.current?.stop();
                caixaRef.current?.setPointerCapture(evento.pointerId);
                arrasto.current = { tipo: "divisoria", x: evento.clientX, y: evento.clientY, px: 0, py: 0 };
              }}
              onKeyDown={(evento) => {
                const atual = posicao.get();
                const destino =
                  evento.key === "ArrowLeft" || evento.key === "ArrowDown"
                    ? atual - PASSO_TECLADO
                    : evento.key === "ArrowRight" || evento.key === "ArrowUp"
                      ? atual + PASSO_TECLADO
                      : evento.key === "Home"
                        ? 0
                        : evento.key === "End"
                          ? 100
                          : null;
                if (destino === null) return;
                evento.preventDefault();
                animacao.current?.stop();
                posicao.set(Math.min(100, Math.max(0, destino)));
              }}
              className={cn(
                "pointer-events-auto absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full",
                "bg-white text-zinc-900 shadow-[0_1px_2px_rgb(0_0_0/0.2),0_6px_16px_rgb(0_0_0/0.18)]",
                "transition-transform duration-150 ease-out active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              )}
            >
              <ChevronsLeftRight className="h-4 w-4" />
            </div>
          </motion.div>

          {/* Zoom */}
          <div
            className="absolute bottom-3 right-3 flex items-center rounded-full bg-black/55 p-0.5 text-white backdrop-blur-md"
            onPointerDown={(evento) => evento.stopPropagation()}
            onDoubleClick={(evento) => evento.stopPropagation()}
          >
            <button
              type="button"
              onClick={reduzir}
              disabled={indice <= 0}
              aria-label="Diminuir zoom"
              data-touch-target
              className="grid h-7 w-7 place-items-center rounded-full transition-colors duration-150 hover:bg-white/15 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => aplicarZoom(1)}
              aria-label="Zoom inteiro"
              className="min-w-[3rem] rounded-full px-1 text-center text-xs font-medium tabular-nums transition-colors duration-150 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              {zoom * 100}%
            </button>
            <button
              type="button"
              onClick={ampliar}
              disabled={indice >= NIVEIS.length - 1}
              aria-label="Aumentar zoom"
              data-touch-target
              className="grid h-7 w-7 place-items-center rounded-full transition-colors duration-150 hover:bg-white/15 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
