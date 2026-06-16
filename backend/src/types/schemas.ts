import { z } from 'zod';

/**
 * Valida o parametro de rota `:email`, usado para localizar o colaborador
 * no GLPI.
 */
export const emailParamSchema = z.object({
  email: z.string().email('Informe um email valido'),
});

/**
 * Valida o parametro de rota `:id`, usado para localizar um termo no banco.
 */
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('O id deve ser um numero positivo'),
});

/**
 * Equipamento selecionado pelo usuario na tela de resultado.
 */
export const equipmentItemSchema = z.object({
  id: z.number().int(),
  itemtype: z.string().min(1),
  name: z.string().min(1),
  serial: z.string().nullable(),
  inventoryNumber: z.string().nullable(),
});

/**
 * Payload de criacao/envio de um Termo de Responsabilidade.
 */
export const sendTermSchema = z.object({
  nome: z.string().min(1, 'O nome do colaborador e obrigatorio'),
  email: z.string().email('Informe um email valido'),
  equipamentos: z
    .array(equipmentItemSchema)
    .min(1, 'Selecione ao menos um equipamento para o termo'),
});

/**
 * Valida o query param `email` da rota de debug
 * GET /api/glpi/debug/users.
 */
export const glpiDebugUsersQuerySchema = z.object({
  email: z.string().email('Informe um email valido'),
});

/**
 * Valida o query param `query` da rota de debug
 * GET /api/glpi/debug/user-search.
 */
export const glpiDebugUserSearchQuerySchema = z.object({
  query: z.string().min(1, 'Informe um texto de busca'),
});

/**
 * Valida o query param `value` da rota de debug
 * GET /api/glpi/debug/computer/:id.
 */
export const glpiDebugComputerQuerySchema = z.object({
  value: z.string().min(1, 'Informe o valor a ser pesquisado'),
});

/**
 * Valida o query param `contact` da rota de debug
 * GET /api/glpi/debug/computers-by-contact.
 */
export const glpiDebugComputersByContactQuerySchema = z.object({
  contact: z.string().min(1, 'Informe o valor do campo contact'),
});

export type SendTermBody = z.infer<typeof sendTermSchema>;
export type EmailParam = z.infer<typeof emailParamSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type GlpiDebugUsersQuery = z.infer<typeof glpiDebugUsersQuerySchema>;
export type GlpiDebugUserSearchQuery = z.infer<typeof glpiDebugUserSearchQuerySchema>;
export type GlpiDebugComputerQuery = z.infer<typeof glpiDebugComputerQuerySchema>;
export type GlpiDebugComputersByContactQuery = z.infer<typeof glpiDebugComputersByContactQuerySchema>;

/**
 * Ativo selecionado pelo usuario no payload de geracao do termo.
 */
export const selectedAssetSchema = z.object({
  id: z.number().int(),
  type: z.string().min(1),
  name: z.string().min(1),
  inventoryNumber: z.string().nullable(),
  serial: z.string().nullable(),
  model: z.string().nullable(),
  contact: z.string().nullable(),
});

/**
 * Dados do colaborador enviados no payload de geracao do termo.
 */
export const generateTermEmployeeSchema = z.object({
  fullName: z.string().min(1, 'O nome do colaborador e obrigatorio'),
  cpf: z.string(),
  birthDate: z.string(),
  corporateEmail: z.string(),
  personalEmail: z.string(),
  phone: z.string(),
});

/**
 * Payload de POST /api/terms/generate.
 */
export const generateTermSchema = z.object({
  employee: generateTermEmployeeSchema,
  selectedAssets: z
    .array(selectedAssetSchema)
    .min(1, 'Selecione ao menos um equipamento para o termo'),
});

export type GenerateTermBody = z.infer<typeof generateTermSchema>;

/**
 * Payload de POST /api/docusign/test-envelope.
 */
export const testEnvelopeSchema = z.object({
  recipientName: z.string().min(1, 'O nome do destinatario e obrigatorio'),
  recipientEmail: z.string().email('Informe um email valido'),
});

export type TestEnvelopeBody = z.infer<typeof testEnvelopeSchema>;
