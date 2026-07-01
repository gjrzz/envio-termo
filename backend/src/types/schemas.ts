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

export type EmailParam = z.infer<typeof emailParamSchema>;
export type IdParam = z.infer<typeof idParamSchema>;

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
  recipientType: z.enum(['personal', 'corporate']).default('personal'),
  sendCopyToOther: z.boolean().default(true),
});

export type GenerateTermBody = z.infer<typeof generateTermSchema>;
