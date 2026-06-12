import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Middleware global de tratamento de erros. Deve ser registrado por ultimo,
 * apos todas as rotas.
 */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados de requisicao invalidos',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, err.details);
    }

    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Erro interno desconhecido';
  logger.error('Erro nao tratado', { message, stack: err instanceof Error ? err.stack : err });

  res.status(500).json({ error: 'Erro interno do servidor' });
};

/**
 * Middleware para rotas nao encontradas (404).
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({ error: `Rota nao encontrada: ${req.method} ${req.originalUrl}` });
};
