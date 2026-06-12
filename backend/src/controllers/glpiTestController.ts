import type { Request, Response } from 'express';
import { glpiService } from '../services/GLPIService';
import { asyncHandler } from '../utils/asyncHandler';
import type {
  GlpiDebugComputerQuery,
  GlpiDebugComputersByContactQuery,
  GlpiDebugUserSearchQuery,
  GlpiDebugUsersQuery,
  IdParam,
} from '../types/schemas';

/**
 * GET /api/glpi/test
 *
 * Rota TEMPORARIA de debug para validar a autenticacao (initSession) com o
 * GLPI usando App-Token e User Token configurados no .env, antes de
 * implementar as demais integracoes.
 *
 * Remover esta rota apos validar a integracao com o GLPI.
 */
export const testGlpiConnection = asyncHandler(async (_req: Request, res: Response) => {
  const result = await glpiService.testConnection();

  res.status(result.success ? 200 : 502).json(result);
});

/**
 * GET /api/glpi/debug/users?email={email}
 *
 * Rota TEMPORARIA de debug para descobrir como localizar um usuario pelo
 * email no GLPI. Testa varios endpoints/estrategias (search/User, /User,
 * search/UserEmail) e retorna a resposta completa de cada tentativa.
 *
 * Remover esta rota apos validar a integracao com o GLPI.
 */
export const debugFindGlpiUserByEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.query as unknown as GlpiDebugUsersQuery;

  const result = await glpiService.debugFindUserByEmail(email);

  res.status(200).json(result);
});

/**
 * GET /api/glpi/debug/user/:id
 *
 * Rota TEMPORARIA de debug que retorna a resposta crua de GET /User/{id}
 * do GLPI, sem filtrar nenhum campo, para identificar como o campo
 * "Nome alternativo" (ex.: login do Azure AD) e representado pela API.
 *
 * Remover esta rota apos validar a integracao com o GLPI.
 */
export const debugGetGlpiUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;

  const result = await glpiService.debugGetUserById(id);

  res.status(200).json(result);
});

/**
 * GET /api/glpi/debug/user-search?query={texto}
 *
 * Rota TEMPORARIA de debug que pesquisa usuarios via search/User pelo
 * campo principal (User.name, o mesmo usado pela busca padrao da
 * interface do GLPI), sem filtrar resultados, retornando a resposta
 * completa para identificar qual propriedade contem o valor pesquisado.
 *
 * Remover esta rota apos validar a integracao com o GLPI.
 */
export const debugSearchGlpiUsers = asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.query as unknown as GlpiDebugUserSearchQuery;

  const result = await glpiService.debugSearchUsers(query);

  res.status(200).json(result);
});

/**
 * GET /api/glpi/debug/computer/:id?value={texto}
 *
 * Rota TEMPORARIA de debug que retorna a resposta crua de GET /Computer/{id}
 * do GLPI, sem filtrar nenhum campo, e localiza automaticamente todos os
 * campos que contenham o valor pesquisado (ex.: "Nome alternativo do
 * usuario" exibido na interface do GLPI).
 *
 * Remover esta rota apos validar a integracao com o GLPI.
 */
export const debugGetGlpiComputerById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params as unknown as IdParam;
  const { value } = req.query as unknown as GlpiDebugComputerQuery;

  const result = await glpiService.debugGetComputerById(id, value);

  res.status(200).json(result);
});

/**
 * GET /api/glpi/debug/computers-by-contact?contact={valor}
 *
 * Rota TEMPORARIA de debug que pesquisa computadores via search/Computer
 * cujo campo "contact" (Nome alternativo do usuario / login do Azure AD)
 * contenha o valor informado, retornando id, nome, contact, serial e
 * numero de patrimonio.
 *
 * Remover esta rota apos validar a integracao com o GLPI.
 */
export const debugFindGlpiComputersByContact = asyncHandler(async (req: Request, res: Response) => {
  const { contact } = req.query as unknown as GlpiDebugComputersByContactQuery;

  const result = await glpiService.debugFindComputersByContact(contact);

  res.status(200).json(result);
});

/**
 * GET /api/glpi/debug/validate-contact?email={email}
 *
 * Rota TEMPORARIA de debug que, a partir de um email corporativo, localiza
 * o usuario no GLPI e testa diferentes transformacoes (firstname+realname,
 * login sem pontos, display name, etc.) para descobrir qual gera
 * exatamente o valor armazenado no campo "contact" dos computadores
 * (ex.: "AnaBarbara@AzureAD").
 *
 * Remover esta rota apos validar a integracao com o GLPI.
 */
export const debugValidateContactGeneration = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.query as unknown as GlpiDebugUsersQuery;

  const result = await glpiService.validateContactGeneration(email);

  res.status(200).json(result);
});
