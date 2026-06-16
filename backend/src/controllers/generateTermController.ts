import type { Request, Response } from 'express';
import { generateTermService } from '../services/GenerateTermService';
import { asyncHandler } from '../utils/asyncHandler';
import type { GenerateTermBody } from '../types/schemas';

/**
 * POST /api/terms/generate
 *
 * Envia o Termo de Responsabilidade via DocuSign utilizando o template
 * configurado, preenchendo automaticamente as tabs com os dados do
 * colaborador e dos equipamentos selecionados pelo usuario na interface.
 */
export const generateTerm = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as GenerateTermBody;

  const result = await generateTermService.execute({
    employee: body.employee,
    selectedAssets: body.selectedAssets,
  });

  res.status(201).json(result);
});
