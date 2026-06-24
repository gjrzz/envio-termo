/**
 * Ativo normalizado para o Termo de Responsabilidade, com tipo legivel e
 * campos adicionais (model, observations) que nao existiam no formato
 * anterior (GlpiAsset).
 */
export interface TermAsset {
  type: string;
  name: string;
  inventoryNumber: string | null;
  serial: string | null;
  model: string | null;
  observations: string | null;
}

/**
 * Ativo selecionado pelo usuario na interface, enviado no payload do
 * POST /api/terms/generate.
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
 * Dados do colaborador enviados pelo frontend no payload de geracao.
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
 * Resultado da geracao de um termo via POST /api/terms/generate.
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
