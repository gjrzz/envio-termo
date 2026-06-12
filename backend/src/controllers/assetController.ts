import type { Request, Response } from 'express';
import { glpiService } from '../services/GLPIService';
import { asyncHandler } from '../utils/asyncHandler';
import type { EmailParam } from '../types/schemas';

/**
 * GET /api/users/:email/assets
 *
 * Retorna o colaborador correspondente ao email informado e os equipamentos
 * atribuidos a ele no GLPI.
 */
export const getAssignedAssets = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.params as unknown as EmailParam;

  const result = await glpiService.getAssignedAssets(email);

  res.status(200).json(result);
});
