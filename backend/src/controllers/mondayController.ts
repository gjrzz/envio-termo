import type { Request, Response } from 'express';
import { mondayService } from '../services/MondayService';
import { employeeProvider } from '../services/employeeProvider';
import { asyncHandler } from '../utils/asyncHandler';
import type { EmailParam } from '../types/schemas';

/**
 * GET /api/monday/debug
 *
 * Rota TEMPORARIA de debug para validar a comunicacao com a API do
 * Monday.com e descobrir as colunas da board configurada (MONDAY_BOARD_ID).
 *
 * Remover esta rota apos validar a integracao com o Monday.com.
 */
export const debugMondayBoard = asyncHandler(async (_req: Request, res: Response) => {
  const result = await mondayService.getBoardDebugInfo();

  res.status(200).json(result);
});

/**
 * GET /api/monday/sample
 *
 * Rota TEMPORARIA de debug que retorna os primeiros 5 itens da board
 * configurada (MONDAY_BOARD_ID) com todos os campos disponiveis, para
 * mapear quais colunas armazenam Nome, CPF, Email, Data de nascimento e
 * Telefone.
 *
 * Remover esta rota apos validar a integracao com o Monday.com.
 */
export const sampleMondayItems = asyncHandler(async (_req: Request, res: Response) => {
  const result = await mondayService.getSampleItems(5);

  res.status(200).json(result);
});

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
