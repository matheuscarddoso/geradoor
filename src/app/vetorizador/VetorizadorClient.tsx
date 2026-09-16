"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Code, Download, ImageUp, Info, Loader, Lock, RotateCcw, Spline } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/AppShell";
import { AjustesDoVetor } from "@/components/vetorizador/AjustesDoVetor";
import { ComparadorDoVetor } from "@/components/vetorizador/ComparadorDoVetor";
import { baixar } from "@/lib/baixarArquivo";
import { focoEmCampo } from "@/lib/atalhos";
import {
  AJUSTES_INICIAIS,
  TIPOS_ACEITOS,
  formatarBytes,
  formatarNumero,
  nomeDoVetor,
  type Ajustes,
} from "@/lib/vetorizador";
import { ArquivoRecusado, useVetorizador, type Estado, type Resultado } from "@/lib/useVetorizador";
import { cn } from "@/lib/utils";
import { useFerramentas, useIdioma } from "@/lib/useTextos";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Espera depois do último ajuste antes de vetorizar de novo. Arrastar um
 * controle dispara dezenas de mudanças; só a parada vira vetorização.
 */
const ESPERA_DO_AJUSTE_MS = 250;

function primeiraImagem(itens: FileList | DataTransferItemList | null | undefined): File | null {
  if (!itens) return null;
  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    const arquivo = item instanceof File ? item : item.kind === "file" ? item.getAsFile() : null;
    if (arquivo?.type.startsWith("image/")) return arquivo;
  }
  return null;
}

/**
 * O cabeçalho vem de fora porque a mesma ferramenta atende buscas diferentes:
 * /vetorizador, /png-para-svg e /jpg-para-svg compartilham o motor e têm cada
 * um o seu próprio título e a sua própria promessa.
 */
export default function VetorizadorClient({
  titulo = "Vetorizador",
  descricao = "Transforme uma imagem em SVG: as formas são redesenhadas como curvas, nítidas em qualquer tamanho.",
}: {
  titulo?: string;
  descricao?: string;
} = {}) {
  const f = useFerramentas();
  const { estado, carregar, vetorizar, limpar } = useVetorizador();
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIAIS);
  const [corDoTraco, setCorDoTraco] = useState("#000000");
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const [mac, setMac] = useState(true);
  const entradaRef = useRef<HTMLInputElement>(null);
  const profundidadeDoArraste = useRef(0);
  /** A primeira vetorização de uma imagem sai sem esperar. */
  const imediata = useRef(false);

  const imagem = estado.fase === "vetorizando" || estado.fase === "pronto" || estado.fase === "erro" ? estado.imagem : null;

  const receber = useCallback(
    async (arquivo: File | null) => {
      if (!arquivo) return;
      try {
        imediata.current = true;
        await carregar(arquivo);
      } catch (erro) {
        toast.error(erro instanceof ArquivoRecusado ? erro.message : f.comum.naoFoiPossivelAbrir);
      }
    },
    [carregar]
  );

  // Imagem nova ou ajuste novo: vetoriza, com espera para ajustes em sequência.
  useEffect(() => {
    if (!imagem) return;
    const espera = imediata.current ? 0 : ESPERA_DO_AJUSTE_MS;
    imediata.current = false;
    const temporizador = setTimeout(() => void vetorizar(ajustes, corDoTraco), espera);
    return () => clearTimeout(temporizador);
  }, [imagem, ajustes, corDoTraco, vetorizar]);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const aoColar = (evento: ClipboardEvent) => {
      if (focoEmCampo(evento.target)) return;
      const arquivo = primeiraImagem(evento.clipboardData?.items);
      if (!arquivo) return;
      evento.preventDefault();
      void receber(arquivo);
    };
    document.addEventListener("paste", aoColar);
    return () => document.removeEventListener("paste", aoColar);
  }, [receber]);

  const abrirSeletor = () => entradaRef.current?.click();
  const resultado = "resultado" in estado ? estado.resultado : null;

  const aoBaixar = () => {
    if (!resultado || !imagem) return;
    baixar(new Blob([resultado.svg], { type: "image/svg+xml" }), nomeDoVetor(imagem.nome));
  };

  const aoCopiar = async () => {
    if (!resultado) return;
    try {
      await navigator.clipboard.writeText(resultado.svg);
      toast.success(f.vetorizador.codigoCopiado);
    } catch {
      toast.error("Seu navegador não deixou copiar. Use Baixar SVG.");
    }
  };

  const temImagem = estado.fase !== "vazio";

  return (
    <div
      className={cn(
        "grid w-full grid-cols-1",
        "md:h-full md:min-h-[620px] md:grid-cols-[minmax(0,1fr)_minmax(0,58%)] md:grid-rows-[1fr_auto_auto_1fr]"
      )}
      onDragEnter={(evento) => {
        if (!evento.dataTransfer.types.includes("Files")) return;
        evento.preventDefault();
        profundidadeDoArraste.current++;
        setArrastandoArquivo(true);
      }}
      onDragOver={(evento) => {
        if (!evento.dataTransfer.types.includes("Files")) return;
        evento.preventDefault();
        evento.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        profundidadeDoArraste.current = Math.max(0, profundidadeDoArraste.current - 1);
        if (profundidadeDoArraste.current === 0) setArrastandoArquivo(false);
      }}
      onDrop={(evento) => {
        evento.preventDefault();
        profundidadeDoArraste.current = 0;
        setArrastandoArquivo(false);
        const arquivo = primeiraImagem(evento.dataTransfer.files);
        if (arquivo) void receber(arquivo);
        else toast.error("Solte um arquivo de imagem");
      }}
    >
      <input
        ref={entradaRef}
        type="file"
        accept={TIPOS_ACEITOS.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(evento) => {
          void receber(evento.target.files?.[0] ?? null);
          evento.target.value = "";
        }}
      />

      <div className="px-6 pt-10 sm:px-10 md:col-start-1 md:row-start-2 md:pt-0">
        <div className="w-full max-w-md">
          <PageHeader title={titulo} description={descricao} />
        </div>
      </div>

      {/* Palco */}
      <div className="px-3 pb-2 sm:px-6 md:col-start-2 md:row-span-4 md:row-start-1 md:py-3 md:pe-3 md:ps-0">
        <div
          className={cn(
            "relative h-[min(72vh,520px)] overflow-hidden rounded-2xl bg-muted/50 md:h-full",
            "transition-shadow duration-200",
            arrastandoArquivo && "shadow-[inset_0_0_0_1.5px_hsl(var(--foreground)/0.35)]"
          )}
        >
          {imagem ? (
            <>
              <div className="absolute inset-4 grid place-items-center [container-type:size] sm:inset-8 md:inset-10">
                <ComparadorDoVetor
                  original={imagem.url}
                  vetor={resultado?.url ?? null}
                  largura={imagem.original.largura}
                  altura={imagem.original.altura}
                  processando={estado.fase === "vetorizando" && !resultado}
                  nome={imagem.nome}
                />
              </div>
              <StatusDoPalco estado={estado} />
            </>
          ) : estado.fase === "preparando" ? (
            <div className="absolute inset-0 grid place-items-center">
              <span className="flex items-center gap-2 text-sm text-subtle">
                <Loader className="h-4 w-4 animate-spin" />{f.vetorizador.abrindoImagem}</span>
            </div>
          ) : (
            <ConviteParaSoltar mac={mac} arrastando={arrastandoArquivo} onEscolher={abrirSeletor} />
          )}

          <AnimatePresence>
            {temImagem && arrastandoArquivo && (
              <motion.div
                key="soltar-para-trocar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
                className="pointer-events-none absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm"
              >
                <p className="text-base font-medium">{f.comum.solteParaTrocar}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Controles */}
      <div className="px-6 pb-10 pt-6 sm:px-10 md:col-start-1 md:row-start-3 md:pb-0 md:pt-0">
        <div className="w-full max-w-md">
          {imagem ? (
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-2 pe-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- object URL gerado no cliente */}
                <img src={imagem.url} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5 dark:ring-white/10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={imagem.nome}>
                    {imagem.nome}
                  </p>
                  <p className="mt-0.5 text-xs tabular-nums text-subtle">
                    {imagem.original.largura} × {imagem.original.altura} · {formatarBytes(imagem.bytes)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={abrirSeletor}>
                  Trocar
                </Button>
              </div>

              <AjustesDoVetor
                ajustes={ajustes}
                onAjustes={setAjustes}
                corDoTraco={corDoTraco}
                onCorDoTraco={setCorDoTraco}
                resultado={resultado}
              />

              {resultado?.simplificado && estado.fase === "pronto" && (
                <p role="status" className="-mt-2 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-subtle">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Com esses ajustes o SVG ficaria pesado demais para abrir. Reduzi as cores e o detalhe até ele ficar leve.
                </p>
              )}

              {estado.fase === "erro" && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{estado.mensagem}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void vetorizar(ajustes, corDoTraco)}>
                      <RotateCcw />
                      Tentar de novo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={abrirSeletor}>{f.comum.escolherOutra}</Button>
                  </div>
                </div>
              )}

              {resultado && <Estatisticas resultado={resultado} />}

              <div className="flex gap-2">
                <Button className="flex-1" onClick={aoBaixar} disabled={!resultado}>
                  <Download />{f.vetorizador.baixarSvg}</Button>
                <Button variant="secondary" onClick={() => void aoCopiar()} disabled={!resultado} aria-label={f.vetorizador.copiarCodigoSvg}>
                  <Code />{f.vetorizador.copiarCodigo}</Button>
              </div>

              <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-subtle">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  Vetorizado no seu aparelho. A imagem não é enviada a lugar nenhum.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    limpar();
                    setAjustes(AJUSTES_INICIAIS);
                  }}
                  className="shrink-0 text-xs text-subtle underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  Limpar
                </button>
              </div>
            </div>
          ) : (
            <Apresentacao onEscolher={abrirSeletor} />
          )}
        </div>
      </div>
    </div>
  );
}

function Estatisticas({ resultado }: { resultado: Resultado }) {
  const f = useFerramentas();
  const idioma = useIdioma();
  const itens = [
    { rotulo: f.vetorizador.cores, valor: formatarNumero(resultado.cores, idioma) },
    { rotulo: f.vetorizador.formas, valor: formatarNumero(resultado.caminhos, idioma) },
    { rotulo: f.vetorizador.arquivo, valor: formatarBytes(resultado.bytes) },
    { rotulo: f.vetorizador.fidelidade, valor: `${Math.round(resultado.fidelidade * 100)}%` },
  ];
  return (
    <dl className="grid grid-cols-4 gap-2 rounded-xl bg-muted/60 p-3">
      {itens.map(({ rotulo, valor }) => (
        <div key={rotulo} className="min-w-0">
          <dt className="text-[11px] text-subtle">{rotulo}</dt>
          <dd className="mt-0.5 truncate text-sm font-medium tabular-nums">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function StatusDoPalco({ estado }: { estado: Estado }) {
  const reduzirMovimento = useReducedMotion();
  const primeira = estado.fase === "vetorizando" && !estado.resultado;
  const ajustando = estado.fase === "vetorizando" && Boolean(estado.resultado);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
      <AnimatePresence initial={false}>
        {(primeira || ajustando) && (
          <motion.div
            key="vetorizando"
            initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className={cn(
              "flex items-center gap-2 rounded-full bg-background/85 px-3.5 py-1.5 text-sm backdrop-blur-xl",
              "shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_8px_24px_-8px_rgb(0_0_0/0.25)] dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.1),0_8px_24px_-8px_rgb(0_0_0/0.6)]"
            )}
          >
            <Loader className="h-3.5 w-3.5 animate-spin" />
            {primeira ? "Vetorizando" : "Atualizando"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ConviteParaSoltar({ mac, arrastando, onEscolher }: { mac: boolean; arrastando: boolean; onEscolher: () => void }) {
  const f = useFerramentas();
  return (
    <button
      type="button"
      onClick={onEscolher}
      className={cn(
        "group absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-400"
      )}
    >
      {/* Um quadrado de pixels atrás e a mesma forma em curva na frente: o
          desenho diz o que a ferramenta faz antes do texto. */}
      <span
        aria-hidden="true"
        className={cn(
          "relative h-[104px] w-[132px] transition-transform duration-300 ease-ios",
          "group-hover:-translate-y-0.5",
          arrastando && "-translate-y-1 scale-[1.03]"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-2 h-[88px] w-[72px] -rotate-6 overflow-hidden rounded-xl bg-zinc-300 ring-1 ring-black/5 transition-transform duration-300 ease-ios dark:bg-zinc-700 dark:ring-white/10",
            "[background-image:linear-gradient(90deg,rgb(0_0_0/0.06)_1px,transparent_1px),linear-gradient(rgb(0_0_0/0.06)_1px,transparent_1px)] [background-size:8px_8px]",
            "group-hover:-translate-x-0.5 group-hover:-rotate-[9deg]",
            arrastando && "-translate-x-1 -rotate-12"
          )}
        />
        <span
          className={cn(
            "absolute right-0 top-0 grid h-[96px] w-[80px] rotate-3 place-items-center rounded-xl bg-background",
            "shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-6px_rgb(0_0_0/0.18)] ring-1 ring-black/5 transition-transform duration-300 ease-ios dark:ring-white/10",
            "group-hover:translate-x-0.5 group-hover:rotate-6",
            arrastando && "translate-x-1 rotate-[8deg]"
          )}
        >
          <Spline className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
        </span>
      </span>

      <span>
        <span className="block text-lg font-medium tracking-tight">{arrastando ? f.comum.podeSoltar : f.comum.solteAqui}</span>
        <span className="mt-1.5 block text-sm text-subtle">
          {f.comum.ouClique}
          <span className="apenas-mouse"> · {mac ? "⌘" : "Ctrl"}{f.comum.paraColar}</span>
        </span>
      </span>

      <span className="absolute inset-x-0 bottom-5 text-xs text-subtle">{f.vetorizador.formatos}</span>
    </button>
  );
}

function Apresentacao({ onEscolher }: { onEscolher: () => void }) {
  const f = useFerramentas();
  return (
    <div>
      <Button className="w-full" onClick={onEscolher}>
        <ImageUp />
        {f.comum.escolherImagem}
      </Button>

      <dl className="mt-8 grid gap-4 text-sm">
        {[
          {
            titulo: f.vetorizador.curvasDeVerdade,
            texto: f.vetorizador.curvasDeVerdadeTexto,
          },
          {
            titulo: f.vetorizador.fielAImagem,
            texto: f.vetorizador.fielAImagemTexto,
          },
          {
            titulo: f.vetorizador.nadaSai,
            texto: f.vetorizador.nadaSaiTexto,
          },
        ].map(({ titulo, texto }) => (
          <div key={titulo} className="border-t border-border pt-4">
            <dt className="font-medium">{titulo}</dt>
            <dd className="mt-1 leading-relaxed text-subtle">{texto}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
