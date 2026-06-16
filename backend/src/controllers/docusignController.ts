import type { Request, Response } from 'express';
import { docuSignService } from '../services/DocuSignService';
import { asyncHandler } from '../utils/asyncHandler';
import type { TestEnvelopeBody } from '../types/schemas';

/**
 * GET /api/docusign/health
 *
 * Valida a autenticacao JWT e retorna informacoes da conta DocuSign.
 */
export const docusignHealth = asyncHandler(async (_req: Request, res: Response) => {
  const accountInfo = await docuSignService.getAccountInfo();

  const environment = accountInfo.baseUri.includes('demo') ? 'sandbox' : 'production';

  res.status(200).json({
    authenticated: true,
    accountId: accountInfo.accountId,
    accountName: accountInfo.accountName,
    baseUri: accountInfo.baseUri,
    environment,
  });
});

/**
 * GET /api/docusign/templates
 *
 * Lista os templates disponiveis na conta DocuSign.
 */
export const docusignTemplates = asyncHandler(async (_req: Request, res: Response) => {
  const templates = await docuSignService.listTemplates();

  res.status(200).json(templates);
});

/**
 * GET /api/docusign/templates/:id
 *
 * Retorna os detalhes completos de um template (recipients + tabs).
 */
export const docusignTemplateDetails = asyncHandler(async (req: Request, res: Response) => {
  const templateId = req.params.id;

  if (!templateId) {
    res.status(400).json({ error: 'Template ID é obrigatório' });
    return;
  }

  const details = await docuSignService.getTemplateDetails(templateId);

  res.status(200).json(details);
});

/**
 * POST /api/docusign/test-envelope
 *
 * Envia um envelope de teste para validar o fluxo completo de envio.
 */
export const docusignTestEnvelope = asyncHandler(async (req: Request, res: Response) => {
  const { recipientName, recipientEmail } = req.body as TestEnvelopeBody;

  const result = await docuSignService.sendTestEnvelope(recipientName, recipientEmail);

  res.status(201).json(result);
});
