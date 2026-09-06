import { LOGO_PRESETS } from "@/components/qr/presets";
import { cn } from "@/lib/utils";

/**
 * Marca de uma das plataformas, no tamanho e na cor do texto.
 *
 * O `fill` é `currentColor` de propósito: assim a marca herda a cor de quem a
 * contém e acompanha o tema, em vez de ficar presa à cor oficial — que num
 * cabeçalho monocromático destoaria.
 *
 * 24px, 1,33x a altura do título de 18px — a marca introduz o cabeçalho sem
 * competir com ele.
 */
export function MarcaSvg({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const preset = LOGO_PRESETS.find((item) => item.id === id);
  if (!preset) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      role="img"
      aria-label={preset.label}
      className={cn("h-6 w-6", className)}
    >
      <path fill="currentColor" d={preset.path} />
    </svg>
  );
}
