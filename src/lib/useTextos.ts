"use client";

import { usePathname } from "next/navigation";
import { idiomaDoCaminho, type Idioma } from "./idioma";
import { TEXTOS, type Dicionario } from "./textos";
import { FERRAMENTAS } from "./textosDasFerramentas";

/**
 * O idioma da página atual, no cliente.
 *
 * Sai do caminho, e não de um provider: o caminho já carrega a informação, e um
 * contexto a mais seria uma segunda fonte para a mesma verdade — do tipo que um
 * dia discorda da primeira.
 */
export function useIdioma(): Idioma {
  return idiomaDoCaminho(usePathname());
}

/** O dicionário da página atual. */
export function useTextos(): Dicionario {
  return TEXTOS[useIdioma()];
}

/** O dicionário das ferramentas, no idioma da página atual. */
export function useFerramentas() {
  return FERRAMENTAS[useIdioma()];
}
