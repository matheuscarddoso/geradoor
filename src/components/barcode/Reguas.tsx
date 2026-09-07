"use client";

import { memo, useMemo } from "react";
import { caixaEnvolvente, type Codigo, type Pagina } from "@/lib/barcodeLayout";
import {
  deMm,
  formatarNaUnidade,
  passoDaRegua,
  paraMm,
  type Unidade,
} from "@/lib/unidades";

/** Espessura da régua, em pixels de tela. */
export const REGUA_PX = 22;

interface Props {
  pagina: Pagina;
  /** Pixels de tela por milímetro. */
  escala: number;
  unidade: Unidade;
  /** Código selecionado, para a régua marcar a extensão dele. */
  selecionado: Codigo | null;
}

/**
 * Réguas de topo e de lado, com a extensão do que está selecionado marcada.
 *
 * O passo entre marcas é escolhido pelo zoom, não fixo: no zoom baixo uma
 * marca por milímetro viraria uma faixa cinza, e no zoom alto uma marca por
 * centímetro deixaria de ajudar a mirar. O destaque da seleção é o que faz a
 * régua servir para conferir medida em vez de só decorar a borda.
 */
function ReguasBase({ pagina, escala, unidade, selecionado }: Props) {
  const envolvente = selecionado ? caixaEnvolvente(selecionado) : null;

  const marcas = useMemo(() => {
    const passo = passoDaRegua(unidade, escala);
    const montar = (tamanhoMm: number) => {
      const lista: Array<{ mm: number; rotulo: string }> = [];
      const limite = deMm(tamanhoMm, unidade);
      for (let valor = 0; valor <= limite + 1e-9; valor += passo) {
        const mm = paraMm(valor, unidade);
        lista.push({ mm, rotulo: String(formatarNaUnidade(mm, unidade)) });
      }
      return lista;
    };
    return { horizontal: montar(pagina.largura), vertical: montar(pagina.altura) };
  }, [pagina.largura, pagina.altura, unidade, escala]);

  const largura = pagina.largura * escala;
  const altura = pagina.altura * escala;

  return (
    <>
      {/* Canto morto entre as duas réguas. */}
      <div
        aria-hidden
        className="sticky left-0 top-0 z-20 shrink-0 border-b border-e border-border bg-background"
        style={{ width: REGUA_PX, height: REGUA_PX, gridArea: "canto" }}
      >
        <span className="grid h-full w-full place-items-center text-[8px] leading-none text-muted-foreground">
          {unidade}
        </span>
      </div>

      <div
        aria-hidden
        className="relative shrink-0 overflow-hidden border-b border-border bg-background"
        style={{ width: largura, height: REGUA_PX, gridArea: "topo" }}
      >
        {envolvente && (
          <div
            className="absolute inset-y-0 bg-foreground/10"
            style={{ left: envolvente.x * escala, width: envolvente.largura * escala }}
          />
        )}
        {marcas.horizontal.map(({ mm, rotulo }) => (
          <div key={mm} className="absolute bottom-0 top-0" style={{ left: mm * escala }}>
            <div className="absolute bottom-0 h-1.5 w-px bg-border" />
            <span className="absolute bottom-2 start-1 whitespace-nowrap text-[8px] leading-none text-muted-foreground">
              {rotulo}
            </span>
          </div>
        ))}
      </div>

      <div
        aria-hidden
        className="relative shrink-0 overflow-hidden border-e border-border bg-background"
        style={{ width: REGUA_PX, height: altura, gridArea: "lado" }}
      >
        {envolvente && (
          <div
            className="absolute inset-x-0 bg-foreground/10"
            style={{ top: envolvente.y * escala, height: envolvente.altura * escala }}
          />
        )}
        {marcas.vertical.map(({ mm, rotulo }) => (
          <div key={mm} className="absolute start-0 end-0" style={{ top: mm * escala }}>
            <div className="absolute end-0 h-px w-1.5 bg-border" />
            {/* Girado para o número acompanhar a régua sem alargar a faixa. */}
            <span
              className="absolute end-2 top-1 origin-top-right -rotate-90 whitespace-nowrap text-[8px] leading-none text-muted-foreground"
              style={{ transformOrigin: "100% 0" }}
            >
              {rotulo}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

export const Reguas = memo(ReguasBase);
