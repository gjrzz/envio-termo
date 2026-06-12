import type { EquipmentItem } from './term';

/**
 * Token de acesso OAuth obtido via JWT Grant.
 */
export interface DocuSignAccessToken {
  accessToken: string;
  expiresAt: number;
}

/**
 * Dados necessarios para criar um envelope de Termo de Responsabilidade.
 */
export interface CreateEnvelopeInput {
  nome: string;
  email: string;
  data: string;
  equipamentos: EquipmentItem[];
}

/**
 * Resultado da criacao de um envelope no DocuSign.
 */
export interface CreateEnvelopeResult {
  envelopeId: string;
  status: string;
}

/**
 * Status atual de um envelope no DocuSign.
 */
export interface EnvelopeStatusResult {
  envelopeId: string;
  status: string;
  completedAt: string | null;
}
