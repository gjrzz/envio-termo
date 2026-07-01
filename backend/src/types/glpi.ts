/**
 * Colaborador identificado a partir do email corporativo.
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
  status: string | null;
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
 * Valor de uma celula na resposta de busca do GLPI.
 */
export type GlpiSearchRow = string | number | null;
