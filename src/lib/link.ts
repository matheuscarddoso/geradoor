/**
 * Validação de link para o encurtador.
 *
 * Módulo sem dependências de propósito: roda igual no formulário do cliente e
 * na rota da API, para que os dois nunca divirjam sobre o que é um link.
 *
 * O `new URL()` sozinho não serve. Depois que a página prefixa "https://",
 * ele aceita "abc", "..." e "a" como endereços válidos.
 */

export interface LinkResult {
  ok: boolean;
  /** Endereço normalizado, presente apenas quando ok. */
  url?: string;
  /** Mensagem exibível ao usuário, presente apenas quando falha. */
  reason?: string;
}

/** Limite convencional de URL, e o mesmo teto aceito pelo banco. */
export const MAX_URL_LENGTH = 2048;

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/i;

function isIpv4(host: string): boolean {
  const match = host.match(IPV4);
  if (!match) return false;
  return match.slice(1).every((octet) => {
    const value = Number(octet);
    return value >= 0 && value <= 255 && String(value) === String(Number(octet));
  });
}

/**
 * Aceita IPv4, IPv6 entre colchetes, localhost e nomes com TLD real.
 * "abc" e "..." caem aqui — é o buraco que o new URL() deixava passar.
 */
function isValidHostname(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true;
  if (isIpv4(hostname)) return true;

  const host = hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
  if (host.toLowerCase() === "localhost") return true;

  const labels = host.split(".");
  if (labels.length < 2) return false;
  if (!labels.every((label) => LABEL.test(label))) return false;

  return TLD.test(labels[labels.length - 1]);
}

/**
 * Normaliza e valida. Prefixa https:// quando não há esquema, como antes.
 */
export function parseLink(input: string): LinkResult {
  const raw = input.trim();

  if (!raw) return { ok: false, reason: "Informe um link" };
  if (raw.length > MAX_URL_LENGTH) {
    return { ok: false, reason: "Link longo demais" };
  }
  if (/\s/.test(raw)) {
    return { ok: false, reason: "O link não pode conter espaços" };
  }

  // Um esquema explícito diferente de http/https precisa ser recusado com a
  // razão certa, e não virar "https://javascript:alert(1)" ao ser prefixado.
  //
  // "exemplo.com:8080" não é esquema, é porta — e ponto é caractere válido em
  // nome de esquema, então só o formato não distingue os dois. O que distingue
  // é o que vem depois dos dois-pontos: porta é numérica, esquema não é.
  const explicitScheme = raw.match(/^([a-z][a-z0-9+.-]*):(\/\/)?(.?)/i);
  if (explicitScheme) {
    const scheme = explicitScheme[1].toLowerCase();
    const hasSlashes = Boolean(explicitScheme[2]);
    const startsWithDigit = /\d/.test(explicitScheme[3]);
    const isScheme = hasSlashes || !startsWithDigit;

    if (isScheme && scheme !== "http" && scheme !== "https") {
      return { ok: false, reason: "Use um endereço http:// ou https://" };
    }
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "Esse link não é válido" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "Use um endereço http:// ou https://" };
  }

  // "https://google.com@evil.com" aponta para evil.com mas parece o Google.
  // Num encurtador isso é phishing pronto, então credencial embutida cai fora.
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "O link não pode conter usuário ou senha" };
  }

  if (!isValidHostname(parsed.hostname)) {
    return { ok: false, reason: "Informe um domínio válido, como exemplo.com" };
  }

  if (parsed.href.length > MAX_URL_LENGTH) {
    return { ok: false, reason: "Link longo demais" };
  }

  return { ok: true, url: parsed.href };
}

/** Atalho para uso em schema. */
export function isValidLink(input: string): boolean {
  return parseLink(input).ok;
}
