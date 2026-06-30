import type { NextFunction, Request, Response } from 'express';
import { authService } from '../services/AuthService';

/**
 * Middleware de autenticacao. Verifica o token JWT enviado no header
 * Authorization (Bearer <token>) e injeta `req.userId` na requisicao.
 */
export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next({ statusCode: 401, message: 'Token de autenticacao nao informado' });
    return;
  }

  const token = header.slice(7);

  try {
    const { userId } = authService.verifyToken(token);
    (req as any).userId = userId;
    next();
  } catch (error) {
    next(error);
  }
};
