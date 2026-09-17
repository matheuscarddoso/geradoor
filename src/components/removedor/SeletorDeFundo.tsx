"use client";

import { useRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFerramentas } from "@/lib/useTextos";
import { preencher } from "@/lib/textosDasFerramentas";

/** Nulo é transparente. */
export type Fundo = string | null;

interface Opcao {
  id: string;
  rotulo: string;
  cor: Fundo;
}

/**
 * Os fundos que resolvem quase todo uso: transparente para design, branco
 * para marketplace e documento, preto para vitrine escura.
 */
const OPCOES: Opcao[] = [
  { id: "transparente", rotulo: "Transparente", cor: null },
  { id: "branco", rotulo: "Branco", cor: "#ffffff" },
  { id: "preto", rotulo: "Preto", cor: "#000000" },
];

const PERSONALIZADA_PADRAO = "#e8e1d7";

interface SeletorDeFundoProps {
  valor: Fundo;
  onChange: (fundo: Fundo) => void;
  desabilitado?: boolean;
}

/**
 * Grupo de rádio com amostras.
 *
 * É `radiogroup` de verdade — setas movem a escolha, Tab entra e sai do grupo
 * numa parada só —, porque é isso que ele é: uma escolha exclusiva. Um monte
 * de botões soltos daria quatro paradas de Tab para uma decisão.
 */
export function SeletorDeFundo({ valor, onChange, desabilitado }: SeletorDeFundoProps) {
  const f = useFerramentas();
  const seletorDeCor = useRef<HTMLInputElement>(null);
  const botoes = useRef<Array<HTMLButtonElement | null>>([]);

  const ehPredefinida = OPCOES.some((opcao) => opcao.cor === valor);
  const personalizada = !ehPredefinida && valor !== null ? valor : null;
  const indiceAtivo = ehPredefinida
    ? OPCOES.findIndex((opcao) => opcao.cor === valor)
    : OPCOES.length;

  const total = OPCOES.length + 1;

  const selecionarIndice = (indice: number) => {
    const alvo = (indice + total) % total;
    botoes.current[alvo]?.focus();
    if (alvo < OPCOES.length) onChange(OPCOES[alvo].cor);
    else onChange(personalizada ?? PERSONALIZADA_PADRAO);
  };

  const aoTeclar = (evento: React.KeyboardEvent, indice: number) => {
    if (evento.key === "ArrowRight" || evento.key === "ArrowDown") {
      evento.preventDefault();
      selecionarIndice(indice + 1);
    } else if (evento.key === "ArrowLeft" || evento.key === "ArrowUp") {
      evento.preventDefault();
      selecionarIndice(indice - 1);
    }
  };

  const amostra = cn(
    "relative grid h-9 w-9 place-items-center rounded-full",
    "ring-1 ring-inset ring-black/10 dark:ring-white/15",
    "transition-[box-shadow,transform] duration-150 ease-out active:scale-95",
    "focus-visible:outline-none",
    "disabled:cursor-not-allowed disabled:opacity-40"
  );
  // O anel de seleção fica afastado da amostra: colado nela, some contra o
  // branco no claro e contra o preto no escuro.
  const selecionada =
    "shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_3.5px_hsl(var(--foreground))]";
  const focada =
    "focus-visible:shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_3.5px_hsl(var(--ring))]";

  return (
    <div role="radiogroup" aria-label="Fundo" className="flex items-center gap-2.5">
      {OPCOES.map((opcao, indice) => {
        const ativa = indice === indiceAtivo;
        return (
          <button
            key={opcao.id}
            ref={(el) => {
              botoes.current[indice] = el;
            }}
            type="button"
            role="radio"
            aria-checked={ativa}
            aria-label={opcao.rotulo}
            title={opcao.rotulo}
            tabIndex={ativa ? 0 : -1}
            disabled={desabilitado}
            onClick={() => onChange(opcao.cor)}
            onKeyDown={(evento) => aoTeclar(evento, indice)}
            className={cn(amostra, !opcao.cor && "xadrez [background-size:8px_8px]", ativa ? selecionada : focada)}
            style={opcao.cor ? { backgroundColor: opcao.cor } : undefined}
          >
            {ativa && (
              <Check
                aria-hidden="true"
                className={cn(
                  "h-3.5 w-3.5 [stroke-width:2]",
                  opcao.cor === "#000000" ? "text-white" : "text-zinc-900"
                )}
              />
            )}
          </button>
        );
      })}

      {/* Cor livre. O input nativo abre o seletor do sistema, que já tem conta-
          gotas no Chrome e no Safari — nada a reimplementar. Ele é irmão do
          botão, e não filho: HTML não permite controle dentro de botão. Fica
          por baixo dele, do mesmo tamanho, para o seletor abrir ancorado na
          amostra. */}
      <span className="relative grid">
        <input
          ref={seletorDeCor}
          type="color"
          tabIndex={-1}
          aria-hidden="true"
          value={personalizada ?? PERSONALIZADA_PADRAO}
          onChange={(evento) => onChange(evento.target.value)}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        />
        <button
          ref={(el) => {
            botoes.current[OPCOES.length] = el;
          }}
          type="button"
          role="radio"
          aria-checked={indiceAtivo === OPCOES.length}
          aria-label={
            personalizada
              ? preencher(f.removedor.corPersonalizadaCom, { cor: personalizada })
              : f.removedor.corPersonalizada
          }
          title={f.removedor.outraCor}
          tabIndex={indiceAtivo === OPCOES.length ? 0 : -1}
          disabled={desabilitado}
          onClick={() => {
            if (!personalizada) onChange(PERSONALIZADA_PADRAO);
            seletorDeCor.current?.click();
          }}
          onKeyDown={(evento) => aoTeclar(evento, OPCOES.length)}
          className={cn(amostra, indiceAtivo === OPCOES.length ? selecionada : focada)}
          style={{
            background:
              personalizada ??
              "conic-gradient(from 180deg, #f87171, #fbbf24, #a3e635, #34d399, #38bdf8, #818cf8, #e879f9, #f87171)",
          }}
        />
      </span>
    </div>
  );
}
