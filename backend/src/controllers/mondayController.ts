import type { Request, Response } from 'express';
import { employeeProvider } from '../services/employeeProvider';
import { asyncHandler } from '../utils/asyncHandler';
import type { EmailParam } from '../types/schemas';

/**
 * GET /api/monday/employee/:email
 *
 * Localiza o colaborador cujo email corporativo ou pessoal corresponda ao
 * informado, retornando os dados usados no Termo de Responsabilidade
 * (nome, CPF, emails e telefone). A origem dos dados (Monday.com ou
 * planilha Excel) e definida pela variavel de ambiente EMPLOYEE_PROVIDER.
 */
export const getMondayEmployeeByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.params as unknown as EmailParam;

  const result = await employeeProvider.getEmployeeByEmail(email);

  res.status(200).json(result);
});
