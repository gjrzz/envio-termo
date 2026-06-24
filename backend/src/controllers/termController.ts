import type { Request, Response } from 'express';
import { termService } from '../services/TermService';
import { asyncHandler } from '../utils/asyncHandler';
import type { IdParam } from '../types/schemas';

/**
 * GET /api/terms
 *
 * Lista o historico de termos enviados.
 */
export const listTerms = asyncHandler(async (_req: Request, res: Response) => {
  const terms = termService.listTerms();

  res.status(200).json(terms);
});

/**
 * GET /api/terms/:id
 *
 * Retorna os detalhes de um termo especifico.
 */
export const getTermById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;

  const term = termService.getTermById(id);

  res.status(200).json(term);
});
