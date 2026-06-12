import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

type RequestPart = 'body' | 'params' | 'query';

/**
 * Cria um middleware que valida e substitui `req[part]` pelo resultado
 * parseado do schema Zod informado. Erros de validacao sao encaminhados
 * para o middleware global de tratamento de erros.
 */
export const validate = (schema: ZodSchema, part: RequestPart = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[part]);
      req[part] = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };
};
