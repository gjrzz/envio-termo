/**
 * Equipamento selecionado pelo usuario para constar no termo.
 */
export interface EquipmentItem {
  id: number;
  itemtype: string;
  name: string;
  serial: string | null;
  inventoryNumber: string | null;
}

/**
 * Registro de termo persistido no banco de dados.
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
 * Representacao "crua" de um termo, exatamente como armazenado no SQLite
 * (coluna `equipamentos` como JSON serializado em texto).
 */
export interface TermRow {
  id: number;
  nome: string;
  email: string;
  equipamentos: string;
  envelopeId: string | null;
  status: string;
  createdAt: string;
}

/**
 * Payload de entrada para criacao/envio de um novo termo.
 */
export interface SendTermInput {
  nome: string;
  email: string;
  equipamentos: EquipmentItem[];
}
