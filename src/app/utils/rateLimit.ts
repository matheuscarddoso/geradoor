const rateLimitCache = new Map<string, { count: number; timestamp: number }>();

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

/**
 * Remove entradas cuja janela já passou.
 *
 * Sem isto o Map só crescia: uma chave por IP, para sempre. Varremos de forma
 * amortizada (a cada N chamadas) para não pagar O(n) em toda requisição.
 */
let callsSinceSweep = 0;
const SWEEP_EVERY = 500;

function sweepExpired(now: number, windowMs: number) {
  for (const [key, entry] of rateLimitCache) {
    if (now - entry.timestamp > windowMs) rateLimitCache.delete(key);
  }
}

export function rateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();

  if (++callsSinceSweep >= SWEEP_EVERY) {
    callsSinceSweep = 0;
    sweepExpired(now, options.windowMs);
  }

  const cacheEntry = rateLimitCache.get(key);

  if (!cacheEntry) {
    rateLimitCache.set(key, { count: 1, timestamp: now });
    return { allowed: true };
  }

  const { count, timestamp } = cacheEntry;

  if (now - timestamp > options.windowMs) {
    rateLimitCache.set(key, { count: 1, timestamp: now });
    return { allowed: true };
  }

  if (count < options.limit) {
    rateLimitCache.set(key, { count: count + 1, timestamp });
    return { allowed: true };
  }

  return { allowed: false };
}
