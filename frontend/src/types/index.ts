/**
 * Colaborador identificado a partir do email corporativo informado na busca.
 */
export interface GlpiUser {
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
  model: string | null;
  status: string | null;
  contact: string | null;
}

/**
 * Resposta da consulta de equipamentos atribuidos a um colaborador.
 */
export interface AssignedAssetsResult {
  user: GlpiUser;
  assets: GlpiAsset[];
}

/**
 * Dados do colaborador obtidos a partir da board do Monday.com.
 */
export interface MondayEmployee {
  fullName: string;
  cpf: string | null;
  corporateEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  birthDate: string | null;
  company: string | null;
  location: string | null;
  username: string | null;
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

/**
 * Ativo selecionado pelo usuario enviado no payload de geracao do termo.
 */
export interface SelectedAsset {
  id: number;
  type: string;
  name: string;
  inventoryNumber: string | null;
  serial: string | null;
  model: string | null;
  contact: string | null;
}

/**
 * Dados do colaborador enviados no payload de geracao do termo.
 */
export interface GenerateTermEmployee {
  fullName: string;
  cpf: string;
  birthDate: string;
  corporateEmail: string;
  personalEmail: string;
  phone: string;
}

/**
 * Payload do POST /api/terms/generate.
 */
export interface GenerateTermInput {
  employee: GenerateTermEmployee;
  selectedAssets: SelectedAsset[];
  recipientType: 'personal' | 'corporate';
  sendCopyToOther: boolean;
}

/**
 * Resultado da geracao de um termo retornado pelo backend.
 */
export interface GenerateTermResult {
  success: true;
  employee: GenerateTermEmployee;
  assetsCount: number;
  envelopeId: string;
  status: string;
  recipientType: 'personal' | 'corporate';
  recipientEmail: string;
  recipientName: string;
}
