/**
 * Representa a sessao autenticada retornada pelo endpoint initSession do GLPI.
 */
export interface GlpiSession {
  session_token: string;
}

/**
 * Resultado de uma busca (search) no GLPI.
 */
export interface GlpiSearchResponse {
  totalcount: number;
  count: number;
  data: Record<string, GlpiSearchRow>[];
}

export type GlpiSearchRow = string | number | null;

/**
 * Colaborador identificado a partir do email corporativo. Nao corresponde a
 * um usuario do GLPI (glpi_users) - e derivado diretamente do email, pois a
 * associacao de ativos e feita pelo campo "contact" dos computadores (ver
 * AssignedAssetsResult).
 */
export interface GlpiUser {
  fullName: string;
  email: string;
}

/**
 * Ativo (equipamento) do GLPI normalizado para uso interno da aplicacao.
 */
export interface GlpiAsset {
  id: number;
  itemtype: string;
  name: string;
  serial: string | null;
  inventoryNumber: string | null;
  model: string | null;
  contact: string | null;
}

/**
 * Resposta consolidada com o usuario e os ativos atribuidos a ele.
 */
export interface AssignedAssetsResult {
  user: GlpiUser;
  assets: GlpiAsset[];
}

/**
 * Resultado do teste de conexao/autenticacao com o GLPI (rota de debug
 * GET /api/glpi/test).
 */
export interface GlpiConnectionTestResult {
  success: boolean;
  sessionToken: string | null;
  message: string;
  details?: unknown;
}

/**
 * Resultado de uma tentativa individual de busca de usuario, usado pela
 * rota de debug GET /api/glpi/debug/users.
 */
export interface GlpiDebugAttempt {
  label: string;
  endpoint: string;
  query: Record<string, string>;
  success: boolean;
  totalcount?: number;
  count?: number;
  data?: unknown;
  error?: unknown;
}

/**
 * Resultado consolidado da rota de debug GET /api/glpi/debug/users.
 */
export interface GlpiUserDebugResult {
  email: string;
  sessionToken: string;
  attempts: GlpiDebugAttempt[];
}

/**
 * Resultado da rota de debug GET /api/glpi/debug/user/:id, com a resposta
 * crua do endpoint GET /User/{id} do GLPI, sem nenhuma filtragem de campos.
 */
export interface GlpiUserRawDebugResult {
  id: number;
  endpoint: string;
  data: unknown;
}

/**
 * Resultado da rota de debug GET /api/glpi/debug/user-search, com a busca
 * de usuarios via search/User pelo campo principal (User.name).
 */
export interface GlpiUserSearchDebugResult {
  query: string;
  sessionToken: string;
  fieldMap: Record<string, string>;
  attempt: GlpiDebugAttempt;
}

/**
 * Representa um campo encontrado durante a busca recursiva por um valor
 * especifico dentro da resposta de GET /Computer/{id}.
 */
export interface GlpiFieldMatch {
  path: string;
  value: unknown;
}

/**
 * Resultado da rota de debug GET /api/glpi/debug/computer/:id, com a
 * resposta crua do endpoint GET /Computer/{id} do GLPI e os campos que
 * contem o valor pesquisado (ex.: "Nome alternativo do usuario").
 */
export interface GlpiComputerRawDebugResult {
  id: number;
  endpoint: string;
  searchValue: string;
  matches: GlpiFieldMatch[];
  data: unknown;
}

/**
 * Resumo de um computador retornado pela rota de debug
 * GET /api/glpi/debug/computers-by-contact.
 */
export interface GlpiComputerSummary {
  id: number;
  name: string;
  contact: string | null;
  serial: string | null;
  inventoryNumber: string | null;
  model: string | null;
}

/**
 * Resultado da rota de debug GET /api/glpi/debug/computers-by-contact, com
 * a busca de computadores pelo campo "contact" (Nome alternativo do
 * usuario / login do Azure AD).
 */
export interface GlpiComputerByContactResult {
  contact: string;
  endpoint: string;
  query: Record<string, string>;
  contactFieldId: string;
  count: number;
  totalcount?: number;
  computers: GlpiComputerSummary[];
  raw: unknown;
}

/**
 * Resultado de uma estrategia de geracao do valor "Nome alternativo do
 * usuario" (ex.: "AnaBarbara@AzureAD") a partir dos dados do usuario no
 * GLPI, usado pela rota de debug GET /api/glpi/debug/validate-contact.
 */
export interface GlpiContactCandidate {
  strategy: string;
  description: string;
  generatedValue: string;
  matchFound: boolean;
  matchedComputers: GlpiComputerSummary[];
}

/**
 * Resultado da rota de debug GET /api/glpi/debug/validate-contact, que
 * testa diferentes transformacoes dos dados do usuario para descobrir qual
 * gera exatamente o valor armazenado no campo "contact" dos computadores.
 */
export interface GlpiValidateContactResult {
  email: string;
  user: {
    id: number;
    login: string;
    firstname: string | null;
    realname: string | null;
  } | null;
  candidates: GlpiContactCandidate[];
}
