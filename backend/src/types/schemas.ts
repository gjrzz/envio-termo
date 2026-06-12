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

export type SendTermBody = z.infer<typeof sendTermSchema>;
export type EmailParam = z.infer<typeof emailParamSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
