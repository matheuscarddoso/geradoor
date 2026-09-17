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
import { ChevronsLeftRight } from "lucide-react";
import { CamadaDoRecorte } from "./CamadaDoRecorte";
import type { Ferramenta, Traco } from "@/lib/pincel";
import { cn } from "@/lib/utils";

/** Curva do iOS, a mesma de `ease-ios` no Tailwind do projeto. */
const EASE_IOS = [0.32, 0.72, 0, 1] as const;
const PASSO_TECLADO = 5;
/** Metade dos 32 px do puxador, mais a sombra. */
const RAIO_DO_PUXADOR = 18;

interface ComparadorProps {
  original: string;
  /** PNG transparente. Nulo enquanto o modelo não terminou. */
  recorte: string | null;
  largura: number;
  altura: number;
  /** Cor atrás do recorte; nulo é transparente, com o xadrez. */
  fundo: string | null;
  processando: boolean;
  nome: string;
  /** Ajustes de pincel já feitos. */
  tracos: readonly Traco[];
  /** Com uma ferramenta, a comparação dá lugar à pintura. */
  ferramenta: Ferramenta | null;
  /** Diâmetro do pincel em pixels de tela. */
  diametroDoPincel: number;
  magico: boolean;
  processandoMagia: boolean;
  onTraco: (traco: Traco) => void;
}

/**
 * A foto e o recorte sobrepostos, com uma divisória que se arrasta.
 *
 * O original fica por cima, cortado por `clip-path` à esquerda da divisória;
 * o recorte, por baixo, aparece à direita. As duas camadas ocupam exatamente a
 * mesma caixa — é o que faz a borda do objeto não "pular" ao cruzar a linha,
 * que é justamente o que se quer comparar.
 *
 * A caixa tem o tamanho de `object-fit: contain` calculado com unidades de
 * container query, e não com `object-contain` na imagem: com `object-contain`
 * a imagem ocupa a área toda e sobra faixa vazia nas laterais, onde a
 * divisória passaria por cima de nada.
 */
export function Comparador({
  original,
  recorte,
  largura,
  altura,
  fundo,
  processando,
  nome,
  tracos,
  ferramenta,
  diametroDoPincel,
  magico,
  processandoMagia,
  onTraco,
}: ComparadorProps) {
  const f = useFerramentas();
  const reduzirMovimento = useReducedMotion();
  const caixaRef = useRef<HTMLDivElement>(null);
  const animacao = useRef<AnimationPlaybackControls | null>(null);
  const arrastando = useRef(false);

  /** Percentual da largura em que está a divisória. 100 mostra só o original. */
  const posicao = useMotionValue(100);
  const [valorAria, setValorAria] = useState(100);
  useMotionValueEvent(posicao, "change", (valor) => setValorAria(Math.round(valor)));

  const recorteOriginal = useTransform(posicao, (p) => `inset(0 ${100 - p}% 0 0)`);
  const esquerda = useTransform(posicao, (p) => `${p}%`);
  // A linha vai até a borda, mas o puxador para a meio corpo dela: com a
  // divisória em 0% ou 100% ele ficaria cortado ao meio pelo overflow da caixa.
  const esquerdaDoPuxador = useTransform(
    posicao,
    (p) => `clamp(${RAIO_DO_PUXADOR}px, ${p}%, calc(100% - ${RAIO_DO_PUXADOR}px))`
  );
  const opacidadeAntes = useTransform(posicao, [4, 16], [0, 1]);
  const opacidadeDepois = useTransform(posicao, [84, 96], [1, 0]);

  // A revelação: quando o recorte chega, a divisória corre da direita até o
  // meio e o resultado entra no lugar da foto. Mostra o que mudou em vez de
  // só trocar uma imagem pela outra.
  useEffect(() => {
    animacao.current?.stop();
    if (!recorte) {
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
  }, [recorte, reduzirMovimento, posicao]);

  // Entrar na pintura recolhe a divisória: o original por cima atrapalharia
  // ver o que o pincel faz. Sair devolve a comparação no meio, já com os
  // ajustes, que é a primeira coisa que se quer conferir depois de pintar.
  const editando = recorte !== null && ferramenta !== null;
  const editandoAntes = useRef(editando);
  useEffect(() => {
    if (editandoAntes.current === editando) return;
    editandoAntes.current = editando;
    animacao.current?.stop();
    const destino = editando ? 0 : 50;
    if (reduzirMovimento) posicao.set(destino);
    else animacao.current = animate(posicao, destino, { duration: 0.45, ease: EASE_IOS });
  }, [editando, reduzirMovimento, posicao]);

  const posicionarPeloPonteiro = (clientX: number) => {
    const caixa = caixaRef.current?.getBoundingClientRect();
    if (!caixa || caixa.width === 0) return;
    const p = ((clientX - caixa.left) / caixa.width) * 100;
    posicao.set(Math.min(100, Math.max(0, p)));
  };

  const interativo = recorte !== null;
  const comparando = interativo && !editando;
  const proporcao = largura / altura;

  return (
    <div
      ref={caixaRef}
      className={cn(
        "relative select-none overflow-hidden rounded-lg",
        // pan-y deixa o dedo rolar a página na vertical; só o gesto horizontal
        // vira arrasto da divisória.
        comparando && "cursor-ew-resize [touch-action:pan-y]"
      )}
      style={{
        width: `min(100cqw, ${proporcao * 100}cqh)`,
        aspectRatio: `${largura} / ${altura}`,
      }}
      onPointerDown={(evento) => {
        if (!comparando || evento.button !== 0) return;
        animacao.current?.stop();
        arrastando.current = true;
        evento.currentTarget.setPointerCapture(evento.pointerId);
        posicionarPeloPonteiro(evento.clientX);
      }}
      onPointerMove={(evento) => {
        if (arrastando.current) posicionarPeloPonteiro(evento.clientX);
      }}
      onPointerUp={() => (arrastando.current = false)}
      onPointerCancel={() => (arrastando.current = false)}
    >
      {/* Fundo escolhido. Só existe depois do recorte: antes, a foto opaca
          cobriria tudo, e um PNG com transparência mostraria uma cor que a
          pessoa ainda não escolheu. */}
      {interativo && (
        <div
          aria-hidden="true"
          className={cn("absolute inset-0 transition-colors duration-200", !fundo && "xadrez")}
          style={fundo ? { backgroundColor: fundo } : undefined}
        />
      )}

      {/* No restaurar, a foto original aparece apagada por baixo: é o mapa do
          que dá para trazer de volta. No apagar ela some, para o que sobrou
          de fundo ficar evidente contra o xadrez. */}
      {interativo && (
        // eslint-disable-next-line @next/next/no-img-element -- object URL gerado no cliente
        <img
          src={original}
          alt=""
          aria-hidden="true"
          draggable={false}
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-200",
            ferramenta === "restaurar" ? "opacity-35" : "opacity-0"
          )}
        />
      )}

      {recorte && (
        <CamadaDoRecorte
          recorte={recorte}
          original={original}
          largura={largura}
          altura={altura}
          tracos={tracos}
          ferramenta={editando ? ferramenta : null}
          diametro={diametroDoPincel}
          magico={magico}
          processandoMagia={processandoMagia}
          onTraco={onTraco}
          descricao={preencher(f.removedor.semOFundo, { nome })}
        />
      )}

      <motion.img
        src={original}
        alt={interativo ? `${nome}, original` : nome}
        draggable={false}
        style={{ clipPath: recorteOriginal }}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {processando && <div aria-hidden="true" className="varredura absolute inset-0" />}

      {comparando && (
        <>
          <motion.span
            aria-hidden="true"
            style={{ opacity: opacidadeAntes }}
            className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-md"
          >
            Antes
          </motion.span>
          <motion.span
            aria-hidden="true"
            style={{ opacity: opacidadeDepois }}
            className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-md"
          >
            Depois
          </motion.span>

          <motion.div
            aria-hidden="true"
            style={{ left: esquerda }}
            className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-white shadow-[0_0_0_0.5px_rgb(0_0_0/0.15),0_0_12px_rgb(0_0_0/0.25)]"
          />
          <motion.div
            style={{ left: esquerdaDoPuxador }}
            className="pointer-events-none absolute top-1/2"
          >
            <div
              role="slider"
              tabIndex={0}
              aria-label={f.removedor.compararOriginal}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={valorAria}
              aria-valuetext={preencher(f.removedor.doOriginalAMostra, { valor: valorAria })}
              data-touch-target
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
                "pointer-events-auto absolute left-1/2 top-1/2 grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full",
                "bg-white text-zinc-900 shadow-[0_1px_2px_rgb(0_0_0/0.2),0_6px_16px_rgb(0_0_0/0.18)]",
                "transition-transform duration-150 ease-out active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              )}
            >
              <ChevronsLeftRight className="h-4 w-4" />
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
