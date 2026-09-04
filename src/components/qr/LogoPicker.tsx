"use client";

import React, { useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ImagePlus, Trash2, Loader } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_LOGO_TYPES,
  LogoImageError,
  normalizeLogo,
  rasterizeSvgMarkup,
} from "@/lib/image";
import { LOGO_PRESETS, presetMarkup, type LogoPreset } from "./presets";

export interface LogoConfig {
  /** Data URL PNG, ou null quando não há logo. */
  src: string | null;
  /** Lado do logo como fração do lado do QR. */
  scale: number;
  /** Limpa os módulos atrás do logo em vez de sobrepô-los. */
  excavate: boolean;
  /** Preset selecionado, para marcar o chip ativo. */
  presetId: string | null;
}

export const DEFAULT_LOGO: LogoConfig = {
  src: null,
  scale: 0.22,
  excavate: true,
  presetId: null,
};

/**
 * Limite superior do tamanho do logo.
 *
 * Mesmo com correção de erro nível H (recupera ~30% dos módulos), passar de
 * 30% da área faz leitores começarem a falhar. O slider não deixa chegar lá.
 */
const MIN_SCALE = 0.12;
const MAX_SCALE = 0.3;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

interface LogoPickerProps {
  value: LogoConfig;
  onChange: (next: LogoConfig) => void;
  disabled?: boolean;
}

const LogoPicker: React.FC<LogoPickerProps> = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  const handleToggle = (next: boolean) => {
    setOpen(next);
    // Desligar preserva a escolha do logo, só para de aplicá-lo — reabrir
    // devolve o estado anterior em vez de obrigar a escolher de novo.
    if (!next) onChange({ ...value, src: null, presetId: null });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setLoadingPreset("upload");
      const src = await normalizeLogo(file);
      onChange({ ...value, src, presetId: null });
    } catch (error) {
      toast.error(
        error instanceof LogoImageError
          ? error.message
          : "Não foi possível carregar a imagem"
      );
    } finally {
      setLoadingPreset(null);
    }
  };

  const handlePreset = async (preset: LogoPreset) => {
    if (value.presetId === preset.id) {
      onChange({ ...value, src: null, presetId: null });
      return;
    }
    try {
      setLoadingPreset(preset.id);
      const src = await rasterizeSvgMarkup(presetMarkup(preset));
      onChange({ ...value, src, presetId: preset.id });
    } catch {
      toast.error("Não foi possível aplicar este ícone");
    } finally {
      setLoadingPreset(null);
    }
  };

  const clear = () => onChange({ ...value, src: null, presetId: null });

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-background/60">
      <div className="flex items-center justify-between gap-3 px-3.5 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <ImagePlus className="w-4 h-4 shrink-0 text-zinc-400" />
          <div className="min-w-0">
            <p className="text-sm font-medium tracking-tight leading-none">
              Logo no centro
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
              Sua marca dentro do código
            </p>
          </div>
        </div>
        <Switch
          checked={open}
          onCheckedChange={handleToggle}
          disabled={disabled}
          aria-label="Ativar logo no centro do QR Code"
        />
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="logo-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.24,
              ease: EASE_OUT,
              opacity: { duration: reduceMotion ? 0 : 0.16 },
            }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-3.5 pt-1 space-y-4 border-t border-zinc-200 dark:border-zinc-800">
              {/* Upload + preview */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "relative h-14 w-14 shrink-0 rounded-lg border border-dashed",
                    "border-zinc-300 dark:border-zinc-700 grid place-items-center",
                    "transition-colors duration-150 overflow-hidden",
                    "hover:border-zinc-400 dark:hover:border-zinc-600",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  )}
                  aria-label="Enviar imagem do logo"
                >
                  {value.src ? (
                    <motion.img
                      key={value.src}
                      src={value.src}
                      alt=""
                      initial={
                        reduceMotion
                          ? false
                          : { opacity: 0, transform: "scale(0.94)" }
                      }
                      animate={{ opacity: 1, transform: "scale(1)" }}
                      transition={{ duration: 0.18, ease: EASE_OUT }}
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <ImagePlus className="w-4 h-4 text-zinc-400" />
                  )}

                  {loadingPreset === "upload" && (
                    <span className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                      <Loader className="w-3.5 h-3.5 animate-spin" />
                    </span>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    PNG, JPG, WEBP ou SVG.
                    <br />
                    Até 4 MB.
                  </p>
                </div>

                <AnimatePresence>
                  {value.src && (
                    <motion.button
                      type="button"
                      onClick={clear}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, ease: EASE_OUT }}
                      className="shrink-0 p-2 rounded-md text-zinc-400 transition-colors duration-150 hover:text-zinc-700 dark:hover:text-zinc-200"
                      aria-label="Remover logo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_LOGO_TYPES.join(",")}
                  className="sr-only"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    // Permite reenviar o mesmo arquivo depois de remover.
                    e.target.value = "";
                  }}
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5">
                {LOGO_PRESETS.map((preset, index) => {
                  const active = value.presetId === preset.id;
                  return (
                    <motion.button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePreset(preset)}
                      initial={
                        reduceMotion
                          ? false
                          : { opacity: 0, transform: "translateY(4px)" }
                      }
                      animate={{ opacity: 1, transform: "translateY(0px)" }}
                      transition={{
                        duration: 0.2,
                        ease: EASE_OUT,
                        delay: reduceMotion ? 0 : index * 0.03,
                      }}
                      title={preset.label}
                      aria-label={preset.label}
                      aria-pressed={active}
                      className={cn(
                        "relative h-9 w-9 rounded-lg grid place-items-center",
                        "border transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                        active
                          ? "border-zinc-900 dark:border-zinc-100"
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className={cn(
                          "w-[18px] h-[18px] transition-opacity duration-150",
                          active ? "opacity-100" : "opacity-55"
                        )}
                        aria-hidden="true"
                      >
                        <path fill={preset.color} d={preset.path} />
                      </svg>
                      {loadingPreset === preset.id && (
                        <span className="absolute inset-0 grid place-items-center rounded-lg bg-background/70">
                          <Loader className="w-3 h-3 animate-spin" />
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Ajustes — só fazem sentido com logo aplicado */}
              <AnimatePresence initial={false}>
                {value.src && (
                  <motion.div
                    key="logo-settings"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.22,
                      ease: EASE_OUT,
                      opacity: { duration: reduceMotion ? 0 : 0.15 },
                    }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3.5 pt-0.5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="logo-scale"
                            className="text-xs text-zinc-500 dark:text-zinc-400"
                          >
                            Tamanho
                          </label>
                          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                            {Math.round(value.scale * 100)}%
                          </span>
                        </div>
                        <Slider
                          id="logo-scale"
                          min={MIN_SCALE * 100}
                          max={MAX_SCALE * 100}
                          step={1}
                          value={[value.scale * 100]}
                          onValueChange={([next]) =>
                            onChange({ ...value, scale: next / 100 })
                          }
                          aria-label="Tamanho do logo"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <label
                          htmlFor="logo-excavate"
                          className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug"
                        >
                          Limpar fundo atrás do logo
                        </label>
                        <Switch
                          id="logo-excavate"
                          checked={value.excavate}
                          onCheckedChange={(excavate) =>
                            onChange({ ...value, excavate })
                          }
                          aria-label="Limpar fundo atrás do logo"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LogoPicker;
