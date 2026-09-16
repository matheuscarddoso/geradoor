"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleMinus, CirclePlus, Redo2, Undo2, type LucideIcon } from "lucide-react";
import { Slider } from "dialkit";
import { Switch } from "@/components/ui/switch";
import { TAMANHO_MAXIMO, TAMANHO_MINIMO, type Ferramenta } from "@/lib/pincel";
import { cn } from "@/lib/utils";
import { useFerramentas } from "@/lib/useTextos";
import type { Ferramentas } from "@/lib/textosDasFerramentas";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * As duas ferramentas do pincel, montadas do dicionário.
 *
 * Função e não constante de módulo: rótulo e dica dependem do idioma, que só
 * se conhece dentro do componente.
 */
function ferramentas(f: Ferramentas): Array<{
  id: Ferramenta;
  rotulo: string;
  tecla: string;
  icone: LucideIcon;
  dica: string;
  dicaMagica: string;
}> {
  return [
    {
      id: "apagar",
      rotulo: f.removedor.apagar,
      tecla: "E",
      icone: CircleMinus,
      dica: f.removedor.pincelTirar,
      dicaMagica: f.removedor.magicoTirar,
    },
    {
      id: "restaurar",
      rotulo: f.removedor.restaurar,
      tecla: "R",
      icone: CirclePlus,
      dica: f.removedor.pincelDevolver,
      dicaMagica: f.removedor.magicoDevolver,
    },
  ];
}

function Tecla({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="apenas-mouse rounded border border-border px-1 font-sans text-[11px] leading-4 text-subtle">
      {children}
    </kbd>
  );
}

interface AjustesDoRecorteProps {
  ferramenta: Ferramenta | null;
  onFerramenta: (ferramenta: Ferramenta | null) => void;
  /** Tamanho da ferramenta ativa, em pixels de tela. */
  tamanho: number;
  onTamanho: (tamanho: number) => void;
  podeDesfazer: boolean;
  podeRefazer: boolean;
  onDesfazer: () => void;
  onRefazer: () => void;
  magico: boolean;
  onMagico: (ligado: boolean) => void;
  mac: boolean;
}

/**
 * Ferramentas de ajuste do recorte.
 *
 * As duas ferramentas são botões de alternância, e não um grupo de rádio:
 * "nenhuma" é um estado de verdade — é o de comparar antes e depois —, e
 * clicar na ferramenta ativa é o jeito natural de voltar a ele.
 */
export function AjustesDoRecorte({
  ferramenta,
  onFerramenta,
  tamanho,
  onTamanho,
  podeDesfazer,
  podeRefazer,
  onDesfazer,
  onRefazer,
  magico,
  onMagico,
  mac,
}: AjustesDoRecorteProps) {
  const f = useFerramentas();
  const FERRAMENTAS = ferramentas(f);
  const reduzirMovimento = useReducedMotion();
  const ativa = FERRAMENTAS.find((f) => f.id === ferramenta);
  const comando = mac ? "⌘" : "Ctrl+";

  const botaoDeHistorico = cn(
    "grid h-8 w-8 place-items-center rounded-lg text-subtle transition-colors duration-150",
    "hover:bg-muted hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
    "disabled:pointer-events-none disabled:opacity-35"
  );

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium leading-none tracking-tight">Ajustar recorte</p>
        <div className="-me-1.5 flex items-center">
          <button
            type="button"
            onClick={onDesfazer}
            disabled={!podeDesfazer}
            aria-label="Desfazer"
            title={`Desfazer (${comando}Z)`}
            data-touch-target
            className={botaoDeHistorico}
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRefazer}
            disabled={!podeRefazer}
            aria-label="Refazer"
            title={`Refazer (${mac ? "⇧⌘Z" : "Ctrl+Y"})`}
            data-touch-target
            className={botaoDeHistorico}
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted/60 p-1">
        {FERRAMENTAS.map(({ id, rotulo, tecla, icone: Icone }) => {
          const selecionada = ferramenta === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selecionada}
              onClick={() => onFerramenta(selecionada ? null : id)}
              className={cn(
                "flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm transition-[background-color,color,box-shadow] duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                selecionada
                  ? "bg-background font-medium text-foreground shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.08)] dark:bg-zinc-800 dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.08)]"
                  : "text-subtle hover:text-foreground"
              )}
            >
              <Icone className="h-4 w-4 shrink-0" />
              {rotulo}
              <Tecla>{tecla}</Tecla>
            </button>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {ativa && (
          <motion.div
            key="pincel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduzirMovimento ? 0 : 0.22,
              ease: EASE_OUT,
              opacity: { duration: reduzirMovimento ? 0 : 0.15 },
            }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              {/* O `.dialkit-root` declara as medidas do slider; sem ele o
                  controle renderiza sem tamanho (ver LogoScaleSlider). */}
              <div className="dialkit-root">
                <Slider
                  label={`Tamanho do pincel`}
                  value={tamanho}
                  onChange={onTamanho}
                  min={TAMANHO_MINIMO}
                  max={TAMANHO_MAXIMO}
                  step={1}
                  unit="px"
                />
              </div>
              <div className="mt-3.5 flex items-center justify-between gap-3">
                <label htmlFor="pincel-magico" className="min-w-0">
                  <span className="block text-sm font-medium leading-none tracking-tight">{f.removedor.pincelMagico}</span>
                  <span className="mt-1 block text-xs text-subtle">
                    Recorta o elemento inteiro. Cada pincelada conta como um recorte.
                  </span>
                </label>
                <Switch id="pincel-magico" checked={magico} onCheckedChange={onMagico} />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-subtle">
                {magico ? ativa.dicaMagica : ativa.dica}
                <span className="apenas-mouse">
                  {" "}
                  <Tecla>[</Tecla> e <Tecla>]</Tecla> mudam o tamanho.
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
