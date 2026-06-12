import type { Request, Response } from 'express';
import { termService } from '../services/TermService';
import { asyncHandler } from '../utils/asyncHandler';
import type { IdParam, SendTermBody } from '../types/schemas';

/**
 * POST /api/terms/send
 *
 * Cria o envelope no DocuSign com os equipamentos selecionados e registra
 * o termo no historico.
 */
export const sendTerm = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as SendTermBody;

  const term = await termService.sendTerm(body);

  res.status(201).json(term);
});

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
 * Retorna os detalhes de um termo especifico, atualizando o status junto
 * ao DocuSign quando aplicavel.
 */
export const getTermById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;

  const term = await termService.getTermById(id);

  res.status(200).json(term);
});
