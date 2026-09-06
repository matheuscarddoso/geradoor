/**
 * Validação e normalização de nome de usuário do Instagram.
 *
 * Regras da plataforma: 1 a 30 caracteres, apenas letras, números, ponto e
 * sublinhado; não pode começar nem terminar em ponto, nem ter dois pontos
 * seguidos. Sem isso o gerador produziria links que caem em página de erro.
 */

export const MAX_ARROBA = 30;

export interface ResultadoArroba {
  ok: boolean;
  /** Sem o "@", pronto para montar a URL. */
  usuario?: string;
  /** Mensagem exibível quando falha. */
  motivo?: string;
}

export function parseArroba(entrada: string): ResultadoArroba {
  // Aceita colar o perfil inteiro: instagram.com/fulano, @fulano ou fulano.
  const limpo = entrada
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");

  if (!limpo) return { ok: false, motivo: "Informe o @ do perfil" };
  if (limpo.length > MAX_ARROBA) {
    return { ok: false, motivo: `No máximo ${MAX_ARROBA} caracteres` };
  }
  if (!/^[A-Za-z0-9._]+$/.test(limpo)) {
    return { ok: false, motivo: "Use apenas letras, números, ponto e _" };
  }
  if (limpo.startsWith(".") || limpo.endsWith(".")) {
    return { ok: false, motivo: "Não pode começar nem terminar com ponto" };
  }
  if (limpo.includes("..")) {
    return { ok: false, motivo: "Não pode ter dois pontos seguidos" };
  }

  return { ok: true, usuario: limpo };
}

export const perfilUrl = (usuario: string) =>
  `https://www.instagram.com/${usuario}`;
