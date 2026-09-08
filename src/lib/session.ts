/**
 * Sessão de admin assinada.
 *
 * Antes, o cookie carregava o próprio ADMIN_TOKEN: o secret do servidor
 * trafegava no browser, era idêntico para todo mundo, nunca expirava do lado
 * do servidor e o logout só apagava a cópia local. Aqui o ADMIN_TOKEN vira
 * chave de assinatura e nunca sai do servidor.
 *
 * Formato: base64url(JSON payload) + "." + base64url(HMAC-SHA256)
 * Implementado sobre Web Crypto para rodar no edge runtime do middleware.
 */

const encoder = new TextEncoder();

export const SESSION_COOKIE = "admin_token";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas — igual ao anterior

interface SessionPayload {
  /** Emissão, em segundos desde a época. */
  iat: number;
  /** Expiração, em segundos desde a época. */
  exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(signature));
}

/**
 * Compara duas strings em tempo constante.
 *
 * Sai sempre pelo mesmo caminho independentemente de onde os bytes divergem,
 * para não vazar por timing quanto do valor esperado o atacante já acertou.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // O comprimento em si não é segredo, mas o loop precisa de tamanho fixo.
  let mismatch = aBytes.length === bBytes.length ? 0 : 1;
  const length = Math.max(aBytes.length, bBytes.length);
  for (let i = 0; i < length; i++) {
    mismatch |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return mismatch === 0;
}

/**
 * Emite um cookie de sessão assinado.
 *
 * A validade é parâmetro porque não existe um prazo certo para toda sessão: o
 * painel de admin dura o turno de trabalho, e o acesso da gráfica dura meses,
 * porque quem entra lá é uma pessoa só, numa máquina só, e ser mandado para a
 * tela de senha toda semana é o que faz alguém colar a senha num papel ao lado
 * do monitor.
 */
export async function createSessionToken(
  secret: string,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    iat: now,
    exp: now + maxAgeSeconds,
  };
  const encoded = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(secret, encoded);
  return `${encoded}.${signature}`;
}

/**
 * Verifica assinatura e expiração. Retorna false para qualquer entrada
 * malformada — nunca lança, para não transformar cookie inválido em 500.
 */
export async function verifySessionToken(
  secret: string | undefined,
  token: string | undefined
): Promise<boolean> {
  if (!secret || !token) return false;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return false;

  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  let expected: string;
  try {
    expected = await sign(secret, encoded);
  } catch {
    return false;
  }
  if (!timingSafeEqual(signature, expected)) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encoded))
    ) as SessionPayload;
    if (typeof payload.exp !== "number") return false;
    return Math.floor(Date.now() / 1000) < payload.exp;
  } catch {
    return false;
  }
}
