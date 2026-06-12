/**
 * Colaborador localizado no GLPI.
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
 * Ativo (equipamento) atribuido ao colaborador no GLPI.
 */
export interface GlpiAsset {
  id: number;
  itemtype: string;
  name: string;
  serial: string | null;
  inventoryNumber: string | null;
}

/**
 * Resposta da consulta de equipamentos atribuidos a um colaborador.
 */
export interface AssignedAssetsResult {
  user: GlpiUser;
  assets: GlpiAsset[];
}

/**
 * Equipamento selecionado para constar no Termo de Responsabilidade.
 */
export interface EquipmentItem {
  id: number;
  itemtype: string;
  name: string;
  serial: string | null;
  inventoryNumber: string | null;
}

/**
 * Payload enviado ao backend para criar/enviar um termo.
 */
export interface SendTermInput {
  nome: string;
  email: string;
  equipamentos: EquipmentItem[];
}

/**
 * Registro de termo retornado pelo backend.
 */
export interface TermRecord {
  id: number;
  nome: string;
  email: string;
  equipamentos: EquipmentItem[];
  envelopeId: string | null;
  status: string;
  createdAt: string;
}
