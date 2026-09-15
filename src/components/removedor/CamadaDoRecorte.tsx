"use client";

import { useEffect, useRef, useState } from "react";
import { carimbos, comPonto, pontoNaImagem, type Ferramenta, type Traco } from "@/lib/pincel";
import { desenharMarcaDoTraco, desenharRecorteEditado, desenharTraco } from "@/lib/pincelCanvas";
import { cn } from "@/lib/utils";

/**
 * Densidade máxima do canvas. Acima de 2x o olho não distingue borda de pincel,
 * e uma tela 3x numa imagem grande quadruplicaria a memória à toa.
 */
const DENSIDADE_MAXIMA = 2;

/** A imagem decodificada, pronta para o canvas desenhar sem esperar. */
function useImagem(url: string): HTMLImageElement | null {
  const [imagem, setImagem] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let ativo = true;
    const elemento = new Image();
    elemento.decoding = "async";
    elemento.src = url;
    elemento
      .decode()
      .then(() => ativo && setImagem(elemento))
      .catch(() => ativo && setImagem(null));
    return () => {
      ativo = false;
    };
  }, [url]);
  return imagem;
}

interface CamadaDoRecorteProps {
  /** PNG recortado, sem ajustes. */
  recorte: string;
  /** Foto original, de onde o restaurar tira a cor. */
  original: string;
  largura: number;
  altura: number;
  tracos: readonly Traco[];
  /** Nula quando ninguém está pintando: a camada só exibe. */
  ferramenta: Ferramenta | null;
  /** Diâmetro do pincel em pixels de tela. */
  diametro: number;
  /** Pincel mágico: o traço marca o elemento, e quem aplica é quem recebe o traço. */
  magico: boolean;
  /** Um traço mágico está sendo processado: a marca pulsa e novos traços esperam. */
  processandoMagia: boolean;
  onTraco: (traco: Traco) => void;
  descricao: string;
}

/**
 * O recorte com os ajustes de pincel, desenhado num canvas do tamanho da tela.
 *
 * Duas formas de desenhar, de propósito:
 * - Redesenho completo quando mudam os traços (desfazer, refazer), o tamanho
 *   da tela ou as imagens. Dezenas de traços levam poucos milissegundos.
 * - Incremental durante a pincelada: só os carimbos novos entram. Redesenhar
 *   tudo a cada movimento do ponteiro faria o pincel pesar mais quanto mais
 *   se pinta, que é justamente quando a pessoa está no detalhe.
 */
export function CamadaDoRecorte({
  recorte,
  original,
  largura,
  altura,
  tracos,
  ferramenta,
  diametro,
  magico,
  processandoMagia,
  onTraco,
  descricao,
}: CamadaDoRecorteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const marcaRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const imagemRecorte = useImagem(recorte);
  const imagemOriginal = useImagem(original);
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });

  /** Traço em andamento e quantos carimbos dele já estão no canvas. */
  const emAndamento = useRef<{ traco: Traco; desenhados: number; ponteiro: number; magico: boolean } | null>(null);

  // Máscaras dos traços mágicos, decodificadas. Guardadas em Blob no
  // histórico; aqui viram bitmap só enquanto o traço existe.
  const [mascaras, setMascaras] = useState<ReadonlyMap<Blob, ImageBitmap>>(new Map());
  useEffect(() => {
    let ativo = true;
    const necessarias = tracos.flatMap((t) => (t.magia ? [t.magia.mascara] : []));
    const faltando = necessarias.filter((blob) => !mascaras.has(blob));
    const sobrando = [...mascaras.keys()].filter((blob) => !necessarias.includes(blob));
    if (faltando.length === 0 && sobrando.length === 0) return;

    void Promise.all(faltando.map(async (blob) => [blob, await createImageBitmap(blob)] as const)).then((novas) => {
      if (!ativo) {
        novas.forEach(([, bitmap]) => bitmap.close());
        return;
      }
      setMascaras((atuais) => {
        const proximas = new Map(atuais);
        // Traço desfeito e fora do refazer não volta: o bitmap é liberado.
        for (const blob of sobrando) {
          proximas.get(blob)?.close();
          proximas.delete(blob);
        }
        for (const [blob, bitmap] of novas) proximas.set(blob, bitmap);
        return proximas;
      });
    });
    return () => {
      ativo = false;
    };
  }, [tracos, mascaras]);

  // Tamanho real do canvas acompanha a caixa na tela.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observador = new ResizeObserver(([entrada]) => {
      const densidade = Math.min(DENSIDADE_MAXIMA, window.devicePixelRatio || 1);
      setTamanho({
        largura: Math.max(1, Math.round(entrada.contentRect.width * densidade)),
        altura: Math.max(1, Math.round(entrada.contentRect.height * densidade)),
      });
    });
    observador.observe(canvas);
    return () => observador.disconnect();
  }, []);

  // Redesenho completo.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagemRecorte || !imagemOriginal || tamanho.largura === 0) return;
    if (canvas.width !== tamanho.largura) canvas.width = tamanho.largura;
    if (canvas.height !== tamanho.altura) canvas.height = tamanho.altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    desenharRecorteEditado(ctx, imagemRecorte, imagemOriginal, tracos, { largura, altura }, tamanho.largura / largura, mascaras);

    const marca = marcaRef.current;
    if (marca && (marca.width !== tamanho.largura || marca.height !== tamanho.altura)) {
      marca.width = tamanho.largura;
      marca.height = tamanho.altura;
    }
  }, [imagemRecorte, imagemOriginal, tracos, tamanho, largura, altura, mascaras]);

  // Terminou de processar o traço mágico (aplicado ou recusado): a marca sai.
  useEffect(() => {
    if (processandoMagia) return;
    const marca = marcaRef.current;
    marca?.getContext("2d")?.clearRect(0, 0, marca.width, marca.height);
  }, [processandoMagia]);

  // Liberar a memória dos canvas ao sair, sem esperar o coletor.
  useEffect(() => {
    const canvas = canvasRef.current;
    const marca = marcaRef.current;
    return () => {
      if (canvas) canvas.width = canvas.height = 0;
      if (marca) marca.width = marca.height = 0;
    };
  }, []);

  const moverCursor = (evento: React.PointerEvent) => {
    const cursor = cursorRef.current;
    const canvas = canvasRef.current;
    if (!cursor || !canvas) return;
    // No toque não há o que mostrar antes do dedo: o círculo só atrapalharia.
    if (evento.pointerType === "touch") {
      cursor.style.opacity = "0";
      return;
    }
    const caixa = canvas.getBoundingClientRect();
    cursor.style.transform = `translate(${evento.clientX - caixa.left - diametro / 2}px, ${evento.clientY - caixa.top - diametro / 2}px)`;
    cursor.style.opacity = "1";
  };

  const desenharPendente = () => {
    const atual = emAndamento.current;
    if (!atual) return;
    // O traço mágico só marca: quem decide o que aplicar é a segmentação.
    const alvo = atual.magico ? marcaRef.current : canvasRef.current;
    const ctx = alvo?.getContext("2d");
    if (!alvo || !ctx) return;
    const escala = alvo.width / largura;
    if (atual.magico) desenharMarcaDoTraco(ctx, atual.traco, escala, atual.desenhados);
    else if (imagemOriginal) desenharTraco(ctx, atual.traco, escala, imagemOriginal, { largura, altura }, atual.desenhados);
    atual.desenhados = carimbos(atual.traco).length;
  };

  const acrescentar = (evento: React.PointerEvent<HTMLCanvasElement>) => {
    const atual = emAndamento.current;
    if (!atual) return;
    const caixa = evento.currentTarget.getBoundingClientRect();
    // Os eventos agrupados trazem os pontos que o navegador juntou entre dois
    // quadros: sem eles, um mouse rápido desenha polígono em vez de curva.
    const nativo = evento.nativeEvent;
    const eventos = typeof nativo.getCoalescedEvents === "function" ? nativo.getCoalescedEvents() : [nativo];
    for (const e of eventos.length > 0 ? eventos : [nativo]) {
      atual.traco = comPonto(atual.traco, pontoNaImagem({ x: e.clientX, y: e.clientY }, caixa, { largura, altura }));
    }
    desenharPendente();
  };

  const concluir = () => {
    const atual = emAndamento.current;
    emAndamento.current = null;
    if (atual && atual.traco.pontos.length > 0) onTraco(atual.traco);
  };

  const pintando = ferramenta !== null;

  return (
    <>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={descricao}
        className={cn(
          "absolute inset-0 h-full w-full",
          // Pintando, o dedo desenha em vez de rolar a página, e o cursor do
          // sistema dá lugar ao círculo do tamanho do pincel.
          pintando && "cursor-none [touch-action:none]",
          processandoMagia && "cursor-wait"
        )}
        onPointerDown={(evento) => {
          if (!pintando || !ferramenta || (evento.pointerType === "mouse" && evento.button !== 0)) return;
          // Um traço mágico por vez: o próximo espera o anterior voltar, senão
          // a ordem dos ajustes dependeria de qual resposta chega primeiro.
          if (processandoMagia) return;
          evento.preventDefault();
          evento.currentTarget.setPointerCapture(evento.pointerId);
          const caixa = evento.currentTarget.getBoundingClientRect();
          const ponto = pontoNaImagem({ x: evento.clientX, y: evento.clientY }, caixa, { largura, altura });
          emAndamento.current = {
            // Raio convertido para pixels da imagem agora: o traço fica com
            // o tamanho que tinha na tela quando foi feito.
            traco: { ferramenta, raio: (diametro / 2) * (largura / caixa.width), pontos: [ponto] },
            desenhados: 0,
            ponteiro: evento.pointerId,
            magico,
          };
          desenharPendente();
          moverCursor(evento);
        }}
        onPointerMove={(evento) => {
          if (!pintando) return;
          moverCursor(evento);
          if (emAndamento.current?.ponteiro === evento.pointerId) acrescentar(evento);
        }}
        onPointerUp={concluir}
        onPointerCancel={concluir}
        onPointerLeave={() => {
          if (cursorRef.current) cursorRef.current.style.opacity = "0";
        }}
      />

      {/* Marca do traço mágico. A transparência é do canvas inteiro, e não da
          tinta: assim os círculos sobrepostos do traço não escurecem onde se
          cruzam. Pulsa enquanto a segmentação não volta. */}
      <canvas
        ref={marcaRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full opacity-45",
          processandoMagia && "animate-pulse"
        )}
      />

      {pintando && (
        <div
          ref={cursorRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 rounded-full opacity-0 transition-opacity duration-100"
          style={{
            width: diametro,
            height: diametro,
            // Anel duplo, branco por fora e preto por dentro: aparece sobre
            // cabelo escuro, sobre pele clara e sobre o xadrez.
            boxShadow: "0 0 0 1px rgb(255 255 255 / 0.95), inset 0 0 0 1px rgb(0 0 0 / 0.55)",
          }}
        />
      )}
    </>
  );
}
