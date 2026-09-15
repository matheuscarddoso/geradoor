"use client";

import { useCallback, useEffect, useState } from "react";
import { TAMANHOS_INICIAIS, limitarTamanho, type Ferramenta } from "@/lib/pincel";

const CHAVE = "geradoor:removedor:tamanhos-do-pincel";
const CHAVE_MAGICO = "geradoor:removedor:pincel-magico";

/**
 * Tamanho do pincel de cada ferramenta, lembrado entre visitas.
 *
 * Preferência de quem usa, não dado: vive no navegador. A leitura é num
 * efeito, e não no estado inicial, porque o HTML vem do servidor sem saber de
 * localStorage — ler durante a renderização daria uma marcação diferente e
 * quebraria a hidratação. Toda leitura e escrita passa por try/catch: em
 * janela anônima ou com dados de site bloqueados, o acesso lança.
 */
export function useTamanhosDoPincel() {
  const [tamanhos, setTamanhos] = useState<Record<Ferramenta, number>>(TAMANHOS_INICIAIS);
  // Ligado de início: é o que resolve o caso que motiva o ajuste — devolver
  // uma flor sem trazer as folhas junto. Quem prefere à mão desliga uma vez.
  const [magico, setMagico] = useState(true);

  useEffect(() => {
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Partial<Record<Ferramenta, unknown>> | null;
      if (!salvo || typeof salvo !== "object") return;
      setTamanhos({
        apagar: typeof salvo.apagar === "number" ? limitarTamanho(salvo.apagar) : TAMANHOS_INICIAIS.apagar,
        restaurar: typeof salvo.restaurar === "number" ? limitarTamanho(salvo.restaurar) : TAMANHOS_INICIAIS.restaurar,
      });
    } catch {
      // Sem armazenamento, os tamanhos iniciais servem.
    }
    try {
      const salvo = localStorage.getItem(CHAVE_MAGICO);
      if (salvo === "false") setMagico(false);
    } catch {
      // Idem.
    }
  }, []);

  const definirMagico = useCallback((ligado: boolean) => {
    setMagico(ligado);
    try {
      localStorage.setItem(CHAVE_MAGICO, String(ligado));
    } catch {
      // Sem persistência a escolha ainda vale nesta sessão.
    }
  }, []);

  const definir = useCallback((ferramenta: Ferramenta, tamanho: number | ((atual: number) => number)) => {
    setTamanhos((atuais) => {
      const proximo = limitarTamanho(typeof tamanho === "function" ? tamanho(atuais[ferramenta]) : tamanho);
      if (proximo === atuais[ferramenta]) return atuais;
      const novos = { ...atuais, [ferramenta]: proximo };
      try {
        localStorage.setItem(CHAVE, JSON.stringify(novos));
      } catch {
        // Sem persistência o tamanho ainda vale nesta sessão.
      }
      return novos;
    });
  }, []);

  return { tamanhos, definir, magico, definirMagico };
}
