"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Copy, Download, ImageUp, Info, Loader, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shell/AppShell";
import { AjustesDoRecorte } from "@/components/removedor/AjustesDoRecorte";
import { Comparador } from "@/components/removedor/Comparador";
import { SeletorDeFundo, type Fundo } from "@/components/removedor/SeletorDeFundo";
import { baixar } from "@/lib/baixarArquivo";
import { focoEmCampo } from "@/lib/atalhos";
import { ajustarTamanho, reconhecerAtalhoDoPincel, type Ferramenta, type Traco } from "@/lib/pincel";
import { useHistorico } from "@/lib/useHistorico";
import { useTamanhosDoPincel } from "@/lib/useTamanhosDoPincel";
import {
  TIPOS_ACEITOS,
  formatarDuracao,
  formatarMegabytes,
  nomeDoRecorte,
} from "@/lib/removedorDeFundo";
import {
  ArquivoRecusado,
  recorteSobreCor,
  useRemovedorDeFundo,
  type Estado,
} from "@/lib/useRemovedorDeFundo";
import { cn } from "@/lib/utils";
import { useFerramentas } from "@/lib/useTextos";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** O primeiro arquivo de imagem de uma lista, seja de um drop ou de um colar. */
function primeiraImagem(itens: FileList | DataTransferItemList | null | undefined): File | null {
  if (!itens) return null;
  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    const arquivo = item instanceof File ? item : item.kind === "file" ? item.getAsFile() : null;
    if (arquivo?.type.startsWith("image/")) return arquivo;
  }
  return null;
}

export default function RemovedorDeFundoClient({
  titulo = "Removedor de fundo de imagem",
  descricao = "Remova o fundo de qualquer foto em segundos e baixe em PNG transparente, na resolução original. Grátis, sem cadastro e sem marca d'água.",
}: { titulo?: string; descricao?: string } = {}) {
  const f = useFerramentas();
  const { estado, processar, tentarDeNovo, limpar, aplicarTracos, pincelMagico } = useRemovedorDeFundo();
  const [fundo, setFundo] = useState<Fundo>(null);
  const [ferramenta, setFerramenta] = useState<Ferramenta | null>(null);
  const { tamanhos, definir: definirTamanho, magico, definirMagico } = useTamanhosDoPincel();
  const [processandoMagia, setProcessandoMagia] = useState(false);
  const historico = useHistorico<readonly Traco[]>([]);
  const { redefinir: redefinirTracos, aplicar: aplicarTraco, desfazer, refazer, podeDesfazer, podeRefazer } = historico;
  const tracos = historico.estado;
  /** O último PNG com ajustes, para baixar e copiar não repintarem à toa. */
  const ajusteEmCache = useRef<{ tracos: readonly Traco[]; blob: Blob } | null>(null);
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false);
  const [exportando, setExportando] = useState<"baixar" | "copiar" | null>(null);
  const [mac, setMac] = useState(true);
  const entradaRef = useRef<HTMLInputElement>(null);
  /** Contador de dragenter/dragleave: os filhos disparam os dois a cada passagem. */
  const profundidadeDoArraste = useRef(0);

  const receber = useCallback(
    async (arquivo: File | null) => {
      if (!arquivo) return;
      try {
        await processar(arquivo);
      } catch (erro) {
        toast.error(
          erro instanceof ArquivoRecusado ? erro.message : f.comum.naoFoiPossivelAbrir
        );
      }
    },
    [processar, f.comum.naoFoiPossivelAbrir]
  );

  // Colar de qualquer lugar da página: é o jeito mais rápido de trazer um
  // print, e quem usa ⌘⇧4 no Mac já tem a imagem na área de transferência.
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

  const pronto = estado.fase === "pronto" ? estado : null;

  // Recorte novo começa sem ajustes e sem ferramenta: traços de outra imagem
  // não fazem sentido sobre esta.
  const urlDoRecorte = pronto?.recorte.url ?? null;
  useEffect(() => {
    redefinirTracos([]);
    setFerramenta(null);
    ajusteEmCache.current = null;
  }, [urlDoRecorte, redefinirTracos]);

  const concluirTraco = useCallback(
    async (traco: Traco) => {
      if (!magico) {
        aplicarTraco((atuais) => [...atuais, traco]);
        return;
      }
      setProcessandoMagia(true);
      try {
        const { traco: aplicado, aviso } = await pincelMagico(traco, tracos);
        aplicarTraco((atuais) => [...atuais, aplicado]);
        if (aviso) toast.info(aviso);
      } finally {
        setProcessandoMagia(false);
      }
    },
    [aplicarTraco, magico, pincelMagico, tracos]
  );

  // Atalhos do pincel. Só existem com um recorte pronto para ajustar.
  useEffect(() => {
    if (!urlDoRecorte) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      const atalho = reconhecerAtalhoDoPincel({
        key: evento.key,
        metaKey: evento.metaKey,
        ctrlKey: evento.ctrlKey,
        shiftKey: evento.shiftKey,
        altKey: evento.altKey,
        emCampo: focoEmCampo(evento.target),
      });
      if (!atalho) return;

      switch (atalho) {
        case "apagar":
        case "restaurar":
          setFerramenta((atual) => (atual === atalho ? null : atalho));
          break;
        case "diminuir":
        case "aumentar":
          // Sem ferramenta não há pincel para mudar; a tecla segue adiante.
          if (!ferramenta) return;
          definirTamanho(ferramenta, (atual) => ajustarTamanho(atual, atalho === "aumentar" ? 1 : -1));
          break;
        case "desfazer":
          if (!podeDesfazer) return;
          desfazer();
          break;
        case "refazer":
          if (!podeRefazer) return;
          refazer();
          break;
        case "sair":
          // Escape sem ferramenta ativa pertence a quem mais estiver ouvindo.
          if (!ferramenta) return;
          setFerramenta(null);
          break;
      }
      evento.preventDefault();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [urlDoRecorte, ferramenta, podeDesfazer, podeRefazer, desfazer, refazer, definirTamanho]);

  /** O recorte com os ajustes, em resolução cheia. Repinta só se os traços mudaram. */
  const recorteAjustado = async (): Promise<Blob> => {
    const emCache = ajusteEmCache.current;
    if (emCache && emCache.tracos === tracos) return emCache.blob;
    const blob = await aplicarTracos(tracos);
    ajusteEmCache.current = { tracos, blob };
    return blob;
  };

  const gerarArquivo = async (): Promise<Blob> => {
    if (!pronto) throw new Error(f.removedor.semRecorte);
    const base = await recorteAjustado();
    return fundo ? recorteSobreCor(base, fundo) : base;
  };

  const aoBaixar = async () => {
    if (!pronto) return;
    setExportando("baixar");
    try {
      baixar(await gerarArquivo(), nomeDoRecorte(pronto.imagem.nome));
    } catch {
      toast.error(f.removedor.naoGerouPng);
    } finally {
      setExportando(null);
    }
  };

  const aoCopiar = async () => {
    if (!pronto) return;
    setExportando("copiar");
    try {
      // A promessa vai direto no ClipboardItem, sem await antes: o Safari só
      // aceita escrever na área de transferência dentro do gesto do clique, e
      // um await no meio já o encerra.
      await navigator.clipboard.write([new ClipboardItem({ "image/png": gerarArquivo() })]);
      toast.success(f.removedor.imagemCopiada);
    } catch {
      toast.error(f.removedor.naoCopiou);
    } finally {
      setExportando(null);
    }
  };

  const temImagem = estado.fase !== "vazio" && estado.imagem !== null;

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
          // Permite escolher o mesmo arquivo de novo depois de limpar.
          evento.target.value = "";
        }}
      />

      {/* Cabeçalho. No celular vem antes do palco; no desktop fica na coluna
          da esquerda, centralizado na vertical junto com os controles. */}
      <div className="px-6 pt-10 sm:px-10 md:col-start-1 md:row-start-2 md:pt-0">
        <div className="w-full max-w-md">
          <PageHeader
            title={titulo}
            description={descricao}
          />
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
          {temImagem ? (
            <Palco
              estado={estado}
              fundo={fundo}
              tracos={tracos}
              ferramenta={ferramenta}
              diametroDoPincel={ferramenta ? tamanhos[ferramenta] : 0}
              magico={magico}
              processandoMagia={processandoMagia}
              onTraco={concluirTraco}
              onSairDaFerramenta={() => setFerramenta(null)}
            />
          ) : (
            <ConviteParaSoltar mac={mac} arrastando={arrastandoArquivo} onEscolher={abrirSeletor} />
          )}

          {/* Com imagem na tela, soltar outra troca. O aviso cobre o palco para
              não parecer que a imagem nova vai para dentro da antiga. */}
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
          {temImagem ? (
            <Controles
              estado={estado}
              fundo={fundo}
              onFundo={setFundo}
              exportando={exportando}
              onBaixar={aoBaixar}
              onCopiar={aoCopiar}
              onTrocar={abrirSeletor}
              onTentarDeNovo={() => void tentarDeNovo()}
              onLimpar={limpar}
              ajustes={
                <AjustesDoRecorte
                  ferramenta={ferramenta}
                  onFerramenta={setFerramenta}
                  tamanho={ferramenta ? tamanhos[ferramenta] : 0}
                  onTamanho={(tamanho) => ferramenta && definirTamanho(ferramenta, tamanho)}
                  podeDesfazer={podeDesfazer}
                  podeRefazer={podeRefazer}
                  onDesfazer={desfazer}
                  onRefazer={refazer}
                  magico={magico}
                  onMagico={definirMagico}
                  mac={mac}
                />
              }
            />
          ) : (
            <Apresentacao onEscolher={abrirSeletor} />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Palco
   ------------------------------------------------------------------------- */

function ConviteParaSoltar({
  mac,
  arrastando,
  onEscolher,
}: {
  mac: boolean;
  arrastando: boolean;
  onEscolher: () => void;
}) {
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
      {/* Duas folhas: a foto atrás, o recorte na frente, sobre o xadrez. O
          desenho explica a ferramenta antes de qualquer texto. */}
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
            "absolute left-0 top-2 h-[88px] w-[72px] -rotate-6 rounded-xl bg-gradient-to-br from-zinc-300 to-zinc-400",
            "shadow-[0_1px_2px_rgb(0_0_0/0.08)] ring-1 ring-black/5 transition-transform duration-300 ease-ios dark:from-zinc-700 dark:to-zinc-800 dark:ring-white/10",
            "group-hover:-rotate-[9deg] group-hover:-translate-x-0.5",
            arrastando && "-translate-x-1 -rotate-12"
          )}
        />
        <span
          className={cn(
            "xadrez absolute right-0 top-0 grid h-[96px] w-[80px] rotate-3 place-items-center overflow-hidden rounded-xl [background-size:10px_10px]",
            "shadow-[0_1px_2px_rgb(0_0_0/0.06),0_8px_24px_-6px_rgb(0_0_0/0.18)] ring-1 ring-black/5 transition-transform duration-300 ease-ios dark:ring-white/10",
            "group-hover:rotate-6 group-hover:translate-x-0.5",
            arrastando && "translate-x-1 rotate-[8deg]"
          )}
        >
          <ImageUp className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
        </span>
      </span>

      <span>
        <span className="block text-lg font-medium tracking-tight">
          {arrastando ? f.comum.podeSoltar : f.comum.solteAqui}
        </span>
        <span className="mt-1.5 block text-sm text-subtle">
          {f.comum.ouClique}
          <span className="apenas-mouse"> · {mac ? "⌘" : "Ctrl"}{f.comum.paraColar}</span>
        </span>
      </span>

      <span className="absolute inset-x-0 bottom-5 text-xs text-subtle">
        {f.removedor.formatos}
      </span>
    </button>
  );
}

function Palco({
  estado,
  fundo,
  tracos,
  ferramenta,
  diametroDoPincel,
  magico,
  processandoMagia,
  onTraco,
  onSairDaFerramenta,
}: {
  estado: Estado;
  fundo: Fundo;
  tracos: readonly Traco[];
  ferramenta: Ferramenta | null;
  diametroDoPincel: number;
  magico: boolean;
  processandoMagia: boolean;
  onTraco: (traco: Traco) => void;
  onSairDaFerramenta: () => void;
}) {
  const f = useFerramentas();
  const reduzirMovimento = useReducedMotion();
  if (estado.fase === "vazio" || !estado.imagem) return null;
  const { imagem } = estado;
  const editando = estado.fase === "pronto" && ferramenta !== null;

  return (
    <>
      {/* A área útil é um container de tamanho: o comparador calcula a caixa
          da imagem com cqw e cqh a partir dela. */}
      <div className="absolute inset-4 grid place-items-center [container-type:size] sm:inset-8 md:inset-10">
        <Comparador
          original={imagem.url}
          recorte={estado.fase === "pronto" ? estado.recorte.url : null}
          largura={imagem.trabalho.largura}
          altura={imagem.trabalho.altura}
          fundo={fundo}
          processando={estado.fase === "preparando" || estado.fase === "processando"}
          nome={imagem.nome}
          tracos={tracos}
          ferramenta={estado.fase === "pronto" ? ferramenta : null}
          diametroDoPincel={diametroDoPincel}
          magico={magico}
          processandoMagia={processandoMagia}
          onTraco={onTraco}
        />
      </div>

      {/* Com a divisória recolhida, esta pílula é o que diz que a imagem
          virou tela de pintura — e, no toque, onde não há Escape, a saída. */}
      <AnimatePresence>
        {editando && (
          <motion.div
            key="pintando"
            initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(-6px)" }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="absolute inset-x-0 top-4 flex justify-center px-4"
          >
            <div
              className={cn(
                "flex items-center gap-3 rounded-full bg-background/85 py-1 pe-1 ps-3.5 text-sm backdrop-blur-xl",
                "shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_8px_24px_-8px_rgb(0_0_0/0.25)] dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.1),0_8px_24px_-8px_rgb(0_0_0/0.6)]"
              )}
            >
              <span className="flex items-center gap-2 font-medium">
                {processandoMagia && <Loader className="h-3.5 w-3.5 animate-spin" />}
                {processandoMagia
                  ? "Recortando o elemento"
                  : `${ferramenta === "apagar" ? "Apagando" : "Restaurando"}${magico ? " com o pincel mágico" : ""}`}
              </span>
              {!processandoMagia && <span className="apenas-mouse text-xs text-subtle">{f.comum.escParaSair}</span>}
              <button
                type="button"
                onClick={onSairDaFerramenta}
                data-touch-target
                className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                Concluir
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4"
      >
        <AnimatePresence mode="wait" initial={false}>
          <StatusDoPalco key={estado.fase} estado={estado} />
        </AnimatePresence>
      </div>
    </>
  );
}

function StatusDoPalco({ estado }: { estado: Estado }) {
  const reduzirMovimento = useReducedMotion();

  let conteudo: React.ReactNode = null;
  if (estado.fase === "preparando") {
    conteudo = (
      <span className="flex items-center gap-2">
        <Loader className="h-3.5 w-3.5 animate-spin" />
        Carregando o modo leve
      </span>
    );
  } else if (estado.fase === "processando") {
    conteudo = (
      <span className="flex items-center gap-2">
        <Loader className="h-3.5 w-3.5 animate-spin" />
        Removendo o fundo
      </span>
    );
  } else {
    return null;
  }

  return (
    <motion.div
      initial={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px) scale(0.98)" }}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      exit={reduzirMovimento ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px) scale(0.98)" }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className={cn(
        "rounded-2xl bg-background/85 px-3.5 py-2.5 text-sm backdrop-blur-xl",
        "shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_8px_24px_-8px_rgb(0_0_0/0.25)] dark:shadow-[0_0_0_0.5px_rgb(255_255_255/0.1),0_8px_24px_-8px_rgb(0_0_0/0.6)]"
      )}
    >
      {conteudo}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------
   Coluna da esquerda
   ------------------------------------------------------------------------- */

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
            titulo: f.removedor.contornoPreciso,
            texto: f.removedor.contornoPrecisoTexto,
          },
          {
            titulo: f.removedor.resolucaoOriginal,
            texto: f.removedor.resolucaoOriginalTexto,
          },
          {
            titulo: f.removedor.nadaGuardado,
            texto: f.removedor.nadaGuardadoTexto,
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

function Controles({
  estado,
  fundo,
  onFundo,
  exportando,
  onBaixar,
  onCopiar,
  onTrocar,
  onTentarDeNovo,
  onLimpar,
  ajustes,
}: {
  ajustes: React.ReactNode;
  estado: Estado;
  fundo: Fundo;
  onFundo: (fundo: Fundo) => void;
  exportando: "baixar" | "copiar" | null;
  onBaixar: () => void;
  onCopiar: () => void;
  onTrocar: () => void;
  onTentarDeNovo: () => void;
  onLimpar: () => void;
}) {
  const f = useFerramentas();
  if (estado.fase === "vazio" || !estado.imagem) return null;
  const { imagem } = estado;
  const pronto = estado.fase === "pronto";

  return (
    <div className="flex flex-col gap-6">
      {/* Arquivo */}
      <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-2 pe-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- object URL gerado no cliente */}
        <img
          src={imagem.url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5 dark:ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={imagem.nome}>
            {imagem.nome}
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-subtle">
            {imagem.trabalho.largura} × {imagem.trabalho.altura} · {formatarMegabytes(imagem.bytes)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onTrocar}>
          Trocar
        </Button>
      </div>

      {imagem.reduzida && (
        <p className="-mt-3 text-xs leading-relaxed text-subtle">
          A original tem {imagem.original.largura} × {imagem.original.altura}. Este navegador não
          processa imagens desse tamanho, então reduzimos ao máximo que ele aceita. Num computador,
          ela sai na resolução original.
        </p>
      )}

      {estado.fase === "pronto" && estado.aviso && (
        <p role="status" className="-mt-2 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-subtle">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {estado.aviso}
        </p>
      )}

      {estado.fase === "erro" ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{estado.mensagem}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={onTentarDeNovo}>
              <RotateCcw />
              Tentar de novo
            </Button>
            <Button size="sm" variant="ghost" onClick={onTrocar}>
              Escolher outra
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p className="mb-3 text-sm font-medium leading-none tracking-tight">{f.comum.fundo}</p>
            <SeletorDeFundo valor={fundo} onChange={onFundo} />
          </div>

          {/* Ajustar só existe com o recorte pronto: pintar sobre a varredura
              em andamento seria pintar sobre algo que ainda vai mudar. */}
          {pronto && ajustes}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={onBaixar} disabled={!pronto || exportando !== null}>
              {exportando === "baixar" ? <Loader className="animate-spin" /> : <Download />}
              Baixar PNG
            </Button>
            <Button
              variant="secondary"
              onClick={onCopiar}
              disabled={!pronto || exportando !== null}
              aria-label="Copiar imagem"
            >
              {exportando === "copiar" ? <Loader className="animate-spin" /> : <Copy />}
              Copiar
            </Button>
          </div>
        </>
      )}

      <Rodape estado={estado} onLimpar={onLimpar} />
    </div>
  );
}

/**
 * Quanto o recorte levou e onde ele foi feito.
 *
 * Diz a verdade sobre o caminho da imagem: no modo normal ela passa pelo
 * servidor e é descartada; no modo leve ela não sai do aparelho. Prometer
 * "nada é enviado" nos dois casos seria mentir em um deles.
 */
function Rodape({ estado, onLimpar }: { estado: Estado; onLimpar: () => void }) {
  let texto = "Processada na hora e descartada. Não salvamos nenhuma cópia.";
  if (estado.fase === "pronto") {
    texto =
      estado.modo === "nuvem"
        ? `Recortado em ${formatarDuracao(estado.duracaoMs)}. A imagem não fica guardada.`
        : `Recortado no modo leve em ${formatarDuracao(estado.duracaoMs)}, sem sair do aparelho.`;
  }

  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
      <p className="flex items-start gap-2 text-xs leading-relaxed text-subtle">
        <Lock className="mt-0.5 h-3 w-3 shrink-0" />
        {texto}
      </p>
      <button
        type="button"
        onClick={onLimpar}
        className="shrink-0 text-xs text-subtle underline-offset-4 transition-colors duration-150 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        Limpar
      </button>
    </div>
  );
}
