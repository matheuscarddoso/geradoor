"use client";

import Link from "next/link";
import { Slider } from "dialkit";
import { Switch } from "@/components/ui/switch";
import {
  CORES_MAXIMAS,
  CORES_MINIMAS,
  NOMES_DOS_ESTILOS,
  ajustesDoEstilo,
  type Ajustes,
  type Estilo,
} from "@/lib/vetorizador";
import type { Resultado } from "@/lib/useVetorizador";
import { cn } from "@/lib/utils";

const ESTILOS: Array<{ id: Estilo; rotulo: string; dica: string }> = [
  { id: "automatico", rotulo: "Auto", dica: "Escolhe o estilo e o número de cores olhando a imagem." },
  { id: "logo", rotulo: "Logo", dica: "Poucas cores chapadas e contornos precisos, para marcas e ícones." },
  { id: "ilustracao", rotulo: "Ilustração", dica: "Mais cores e formas menores, para desenhos e artes." },
  { id: "foto", rotulo: "Foto", dica: "Efeito pôster: suaviza o ruído e agrupa os tons." },
  { id: "traco", rotulo: "Traço", dica: "Só a tinta, sem fundo, para desenho, assinatura e carimbo." },
];

const CORES_DO_TRACO = [
  { cor: "#000000", rotulo: "Preto" },
  { cor: "#ffffff", rotulo: "Branco" },
];

interface AjustesDoVetorProps {
  ajustes: Ajustes;
  onAjustes: (ajustes: Ajustes) => void;
  corDoTraco: string;
  onCorDoTraco: (cor: string) => void;
  /** O último resultado, para mostrar o que o automático escolheu. */
  resultado: Resultado | null;
}

function LinhaAutomatica({ automatico, texto, onAutomatico }: { automatico: boolean; texto: string; onAutomatico: () => void }) {
  return (
    <p className="-mt-1 mb-1 flex items-center justify-between gap-3 text-xs text-subtle">
      <span>{texto}</span>
      {!automatico && (
        <button
          type="button"
          onClick={onAutomatico}
          className="shrink-0 underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Voltar ao automático
        </button>
      )}
    </p>
  );
}

/**
 * Os controles da vetorização.
 *
 * O estilo é o ponto de partida: escolher um estilo redefine os controles para
 * os valores dele. Os controles refinam a partir dali. Cores e limiar começam
 * no automático e dizem o que o automático escolheu — mover o controle fixa o
 * valor, e um toque volta ao automático.
 */
export function AjustesDoVetor({ ajustes, onAjustes, corDoTraco, onCorDoTraco, resultado }: AjustesDoVetorProps) {
  const alterar = (parcial: Partial<Ajustes>) => onAjustes({ ...ajustes, ...parcial });
  const estiloAtual = ESTILOS.find((e) => e.id === ajustes.estilo) ?? ESTILOS[0];
  const traco = ajustes.estilo === "traco";
  const coresMostradas = ajustes.cores === "auto" ? (resultado?.cores ?? 8) : ajustes.cores;
  const limiarMostrado = ajustes.limiar === "auto" ? (resultado?.limiar ?? 128) : ajustes.limiar;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-3 text-sm font-medium leading-none tracking-tight">Estilo</p>
        {/* Colunas do tamanho do rótulo, repartindo a sobra: "Ilustração" não
            cabe num quinto da largura no celular, e cortado não se lê. */}
        <div role="radiogroup" aria-label="Estilo" className="grid grid-cols-[repeat(5,minmax(max-content,1fr))] gap-1 rounded-xl bg-muted/60 p-1">
          {ESTILOS.map(({ id, rotulo }) => {
            const selecionado = ajustes.estilo === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selecionado}
                onClick={() => onAjustes(ajustesDoEstilo(id, ajustes.fundoTransparente))}
                className={cn(
                  "h-9 whitespace-nowrap rounded-lg px-2 text-[13px] transition-[background-color,color,box-shadow] duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                  selecionado
                    ? "bg-background font-medium text-foreground shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.08)] dark:bg-zinc-800 dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.08)]"
                    : "text-subtle hover:text-foreground"
                )}
              >
                {rotulo}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-subtle">
          {estiloAtual.dica}
          {ajustes.estilo === "automatico" && resultado && ` Tratando como ${NOMES_DOS_ESTILOS[resultado.estilo].toLowerCase()}.`}
        </p>
      </div>

      {/* O `.dialkit-root` declara as medidas dos sliders (ver LogoScaleSlider). */}
      <div className="dialkit-root flex flex-col gap-2">
        {traco ? (
          <>
            <Slider
              label="Limiar"
              value={limiarMostrado}
              onChange={(limiar) => alterar({ limiar })}
              min={0}
              max={255}
              step={1}
            />
            <LinhaAutomatica
              automatico={ajustes.limiar === "auto"}
              texto={ajustes.limiar === "auto" ? "Automático: separa a tinta do papel sozinho." : "Mais alto pega tons mais claros como tinta."}
              onAutomatico={() => alterar({ limiar: "auto" })}
            />
          </>
        ) : (
          <>
            <Slider
              label="Cores"
              value={coresMostradas}
              onChange={(cores) => alterar({ cores })}
              min={CORES_MINIMAS}
              max={CORES_MAXIMAS}
              step={1}
            />
            <LinhaAutomatica
              automatico={ajustes.cores === "auto"}
              texto={
                ajustes.cores === "auto"
                  ? resultado
                    ? `Automático: ${resultado.cores} ${resultado.cores === 1 ? "cor" : "cores"}.`
                    : "Automático."
                  : "Menos cores deixam o arquivo menor e mais limpo."
              }
              onAutomatico={() => alterar({ cores: "auto" })}
            />
          </>
        )}
        <Slider label="Detalhe" value={ajustes.detalhe} onChange={(detalhe) => alterar({ detalhe })} min={0} max={100} step={1} unit="%" />
        <Slider label="Suavidade" value={ajustes.suavidade} onChange={(suavidade) => alterar({ suavidade })} min={0} max={100} step={1} unit="%" />
      </div>

      {traco ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium leading-none tracking-tight">Cor do traço</span>
          <div role="radiogroup" aria-label="Cor do traço" className="flex items-center gap-2">
            {CORES_DO_TRACO.map(({ cor, rotulo }) => (
              <button
                key={cor}
                type="button"
                role="radio"
                aria-checked={corDoTraco === cor}
                aria-label={rotulo}
                title={rotulo}
                onClick={() => onCorDoTraco(cor)}
                className={cn(
                  "h-7 w-7 rounded-full ring-1 ring-inset ring-black/10 transition-shadow duration-150 dark:ring-white/15",
                  "focus-visible:outline-none",
                  corDoTraco === cor && "shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_3.5px_hsl(var(--foreground))]"
                )}
                style={{ backgroundColor: cor }}
              />
            ))}
            <label
              title="Outra cor"
              className={cn(
                "relative h-7 w-7 cursor-pointer overflow-hidden rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15",
                !CORES_DO_TRACO.some((c) => c.cor === corDoTraco) &&
                  "shadow-[0_0_0_2px_hsl(var(--background)),0_0_0_3.5px_hsl(var(--foreground))]"
              )}
              style={{
                background: CORES_DO_TRACO.some((c) => c.cor === corDoTraco)
                  ? "conic-gradient(from 180deg, #f87171, #fbbf24, #a3e635, #34d399, #38bdf8, #818cf8, #e879f9, #f87171)"
                  : corDoTraco,
              }}
            >
              <span className="sr-only">Outra cor</span>
              <input
                type="color"
                value={corDoTraco}
                onChange={(evento) => onCorDoTraco(evento.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="fundo-transparente" className="min-w-0">
              <span className="block text-sm font-medium leading-none tracking-tight">Fundo transparente</span>
              <span className="mt-1 block text-xs text-subtle">Tira o fundo liso que encosta nas bordas.</span>
            </label>
            <Switch
              id="fundo-transparente"
              checked={ajustes.fundoTransparente}
              onCheckedChange={(fundoTransparente) => alterar({ fundoTransparente })}
            />
          </div>
          {ajustes.fundoTransparente && resultado?.fundo === "sem-fundo-liso" && (
            <p className="mt-2 text-xs leading-relaxed text-subtle">
              Não encontrei um fundo de cor única nas bordas. Para tirar o fundo de uma foto, passe antes pelo{" "}
              <Link href="/removedor-de-fundo" className="font-medium text-foreground underline underline-offset-4">
                Removedor de fundo
              </Link>{" "}
              e traga o PNG para cá.
            </p>
          )}
          {ajustes.fundoTransparente && resultado?.fundo === "ja-transparente" && (
            <p className="mt-2 text-xs leading-relaxed text-subtle">Esta imagem já tem o fundo transparente.</p>
          )}
        </div>
      )}
    </div>
  );
}
