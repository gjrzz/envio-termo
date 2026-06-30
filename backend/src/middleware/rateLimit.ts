import type { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Limpar entradas expiradas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Cria um middleware de rate limiting baseado em IP.
 *
 * @param maxAttempts Numero maximo de tentativas no intervalo
 * @param windowMs Janela de tempo em milissegundos
 */
export function rateLimit(maxAttempts: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();

    let entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(ip, entry);
    }

    entry.count += 1;

    if (entry.count > maxAttempts) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);

      res.status(429).json({
        error: `Muitas tentativas de login. Tente novamente em ${retryAfterSeconds} segundos.`,
      });
      return;
    }

    next();
  };
}
