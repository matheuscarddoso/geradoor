/**
 * Validação e normalização de nome de usuário do Instagram.
 *
 * Regras da plataforma: 1 a 30 caracteres, apenas letras, números, ponto e
 * sublinhado; não pode começar nem terminar em ponto, nem ter dois pontos
 * seguidos. Sem isso o gerador produziria links que caem em página de erro.
 */

export const MAX_ARROBA = 30;

/**
 * Por que o @ foi recusado.
 *
 * Código, e não frase pronta: o site fala duas línguas, e uma função pura não
 * tem como saber qual delas está na tela. Quem exibe é que traduz.
 */
export type MotivoDoArroba =
  | "vazio"
  | "longo"
  | "caracteres"
  | "ponto-na-ponta"
  | "pontos-seguidos";

export interface ResultadoArroba {
  ok: boolean;
  /** Sem o "@", pronto para montar a URL. */
  usuario?: string;
  motivo?: MotivoDoArroba;
}

export function parseArroba(entrada: string): ResultadoArroba {
  // Aceita colar o perfil inteiro: instagram.com/fulano, @fulano ou fulano.
  const limpo = entrada
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");

  if (!limpo) return { ok: false, motivo: "vazio" };
  if (limpo.length > MAX_ARROBA) {
    return { ok: false, motivo: "longo" };
  }
  if (!/^[A-Za-z0-9._]+$/.test(limpo)) {
    return { ok: false, motivo: "caracteres" };
  }
  if (limpo.startsWith(".") || limpo.endsWith(".")) {
    return { ok: false, motivo: "ponto-na-ponta" };
  }
  if (limpo.includes("..")) {
    return { ok: false, motivo: "pontos-seguidos" };
  }

  return { ok: true, usuario: limpo };
}

export const perfilUrl = (usuario: string) =>
  `https://www.instagram.com/${usuario}`;
