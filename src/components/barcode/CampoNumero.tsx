"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  rotulo: string;
  valor: number;
  aoMudar: (valor: number) => void;
  /** Quanto um pixel de arrasto vale. */
  passo?: number;
  min?: number;
  max?: number;
  /** Casas decimais mostradas e gravadas. */
  casas?: number;
  /** Unidade impressa à direita do campo. */
  unidade?: string;
  /**
   * Nome acessível, quando o rótulo curto se repete na tela.
   *
   * Há dois campos "díg." no painel — os dígitos da numeração e os do texto
   * legível —, e para quem navega por leitor de tela os dois se chamariam
   * igual sem isto.
   */
  rotuloAcessivel?: string;
  /**
   * Marca o campo como inválido.
   *
   * A conferência lista o motivo, mas ela fica no fim de um painel rolável: o
   * campo tem que dizer por si que o valor dele é o problema, ou o operador
   * lê "o número final é menor que o inicial" sem saber qual dos dois mexer.
   */
  invalido?: boolean;
  disabled?: boolean;
  className?: string;
  /** Começo do arrasto no rótulo, para o histórico coalescer o gesto. */
  aoIniciarGesto?: () => void;
  /** Fim do arrasto, ou da edição digitada. */
  aoTerminarGesto?: () => void;
}

const arredondar = (valor: number, casas: number) => Number(valor.toFixed(casas));

/**
 * Campo numérico que também aceita arrasto horizontal sobre o rótulo.
 *
 * Posicionar código de barras é ajuste de décimo de milímetro, e chegar lá
 * digitando número é lento: o operador quer empurrar a caixa e ver onde ela
 * encosta. Arrastar dá esse retorno contínuo, e o campo continua aceitando o
 * valor exato quando ele já sabe qual é. Shift multiplica por dez, Alt divide.
 */
export function CampoNumero({
  rotulo,
  valor,
  aoMudar,
  passo = 0.1,
  min = -Infinity,
  max = Infinity,
  casas = 2,
  unidade,
  rotuloAcessivel,
  invalido,
  disabled,
  className,
  aoIniciarGesto,
  aoTerminarGesto,
}: Props) {
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const arrasto = useRef<{ x: number; inicial: number } | null>(null);

  // Enquanto o campo não está sendo editado, ele espelha o valor de fora —
  // é o que faz o número andar sozinho quando o operador arrasta a caixa na
  // folha em vez de mexer aqui.
  // `NaN` chega quando o campo governa vários itens que divergem: mostrar
  // vazio é o único jeito honesto — qualquer número afirmaria algo falso sobre
  // parte da seleção. Digitar por cima iguala todos.
  const divergente = !Number.isFinite(valor);
  const exibido = rascunho ?? (divergente ? "" : String(arredondar(valor, casas)));

  const aplicar = (bruto: number) => {
    if (!Number.isFinite(bruto)) return;
    aoMudar(arredondar(Math.min(max, Math.max(min, bruto)), casas));
  };

  // O gesto de arrasto assina a janela e precisa da versão mais recente de
  // `aplicar`, que fecha sobre `aoMudar` — uma arrow inline no pai, com
  // identidade nova a cada render. Pela ref, o efeito depende só do que
  // realmente governa o gesto, sem reassinar a janela no meio dele.
  const aplicarRef = useRef(aplicar);
  aplicarRef.current = aplicar;
  const aoTerminarGestoRef = useRef(aoTerminarGesto);
  aoTerminarGestoRef.current = aoTerminarGesto;

  useEffect(() => {
    if (!arrastando) return;
    const mover = (evento: PointerEvent) => {
      const inicio = arrasto.current;
      if (!inicio) return;
      const fator = evento.shiftKey ? 10 : evento.altKey ? 0.1 : 1;
      aplicarRef.current(inicio.inicial + (evento.clientX - inicio.x) * passo * fator);
    };
    const soltar = () => {
      arrasto.current = null;
      setArrastando(false);
      aoTerminarGestoRef.current?.();
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, [arrastando, passo]);

  return (
    <div
      className={cn(
        "flex h-8 items-center gap-2 rounded-md border border-input bg-background pe-2 ps-2 transition-colors duration-150",
        "focus-within:border-foreground/40",
        invalido &&
          "border-destructive/70 focus-within:border-destructive dark:border-destructive/60",
        disabled && "pointer-events-none opacity-50",
        className
      )}
    >
      <span
        onPointerDown={(evento) => {
          if (disabled || divergente) return;
          evento.preventDefault();
          arrasto.current = { x: evento.clientX, inicial: valor };
          setArrastando(true);
          aoIniciarGesto?.();
        }}
        aria-hidden
        className={cn(
          "select-none text-[11px] leading-none text-muted-foreground",
          "cursor-ew-resize hover:text-foreground",
          arrastando && "text-foreground"
        )}
        title="Arraste para ajustar. Shift para 10×, Alt para 0,1×."
      >
        {rotulo}
      </span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={rotuloAcessivel ?? `${rotulo}${unidade ? ` em ${unidade}` : ""}`}
        aria-invalid={invalido || undefined}
        value={exibido}
        placeholder={divergente ? "—" : undefined}
        disabled={disabled}
        // Selecionar tudo ao focar: num campo de ajuste, quem clica quer
        // trocar o número, não posicionar o cursor no meio dele.
        onFocus={(evento) => evento.currentTarget.select()}
        onChange={(evento) => setRascunho(evento.target.value)}
        onBlur={() => {
          if (rascunho !== null) {
            aoIniciarGesto?.();
            aplicar(Number(rascunho.replace(",", ".")));
            aoTerminarGesto?.();
          }
          setRascunho(null);
        }}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") evento.currentTarget.blur();
          if (evento.key === "Escape") {
            setRascunho(null);
            evento.currentTarget.blur();
          }
          if (evento.key === "ArrowUp" || evento.key === "ArrowDown") {
            evento.preventDefault();
            if (divergente) return;
            const fator = evento.shiftKey ? 10 : 1;
            aoIniciarGesto?.();
            aplicar(valor + (evento.key === "ArrowUp" ? 1 : -1) * passo * fator);
            aoTerminarGesto?.();
            setRascunho(null);
          }
        }}
        className="w-full min-w-0 bg-transparent text-right font-mono text-xs tabular-nums outline-none"
      />
      {unidade && (
        <span aria-hidden className="shrink-0 select-none text-[10px] text-muted-foreground">
          {unidade}
        </span>
      )}
    </div>
  );
}
