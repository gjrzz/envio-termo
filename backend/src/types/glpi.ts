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
 * Usuario do GLPI normalizado para uso interno da aplicacao.
 */
export interface GlpiUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
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
}

/**
 * Resposta consolidada com o usuario e os ativos atribuidos a ele.
 */
export interface AssignedAssetsResult {
  user: GlpiUser;
  assets: GlpiAsset[];
}
