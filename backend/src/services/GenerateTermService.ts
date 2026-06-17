import { docxGeneratorService, mapAssetType } from './DocxGeneratorService';
import { pdfConverterService } from './PdfConverterService';
import { docuSignService } from './DocuSignService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type {
  GenerateTermInput,
  GenerateTermResult,
  SelectedAsset,
  TermAsset,
} from '../types/generateTerm';

/**
 * Converte o tipo (itemtype do GLPI) para o tipo legivel.
 */
function mapAssetDisplayType(asset: SelectedAsset): string {
  return mapAssetType(asset.type, asset.name);
}

/**
 * Converte SelectedAsset (frontend) para TermAsset (template DOCX).
 */
function selectedAssetToTermAsset(asset: SelectedAsset): TermAsset {
  return {
    type: mapAssetDisplayType(asset),
    name: asset.name,
    inventoryNumber: asset.inventoryNumber,
    serial: asset.serial,
    model: asset.model,
    observations: null,
  };
}

/**
 * Servico orquestrador do fluxo completo de envio do Termo:
 * 1. Gera o DOCX preenchido a partir do template local
 * 2. Envia o DOCX ao DocuSign (que converte para PDF internamente)
 * 3. O colaborador recebe o documento pronto — apenas assina
 *
 * Nenhum campo e editavel pelo signatario. O DocuSign funciona apenas
 * como plataforma de assinatura.
 */
export class GenerateTermService {
  public async execute(input: GenerateTermInput): Promise<GenerateTermResult> {
    const { employee, selectedAssets, recipientType, sendCopyToOther } = input;

    // Determinar email do signer baseado no recipientType
    const signerEmail = recipientType === 'corporate'
      ? employee.corporateEmail
      : employee.personalEmail;

    // Determinar CC (o outro email)
    const ccEmail = recipientType === 'corporate'
      ? employee.personalEmail
      : employee.corporateEmail;

    if (!signerEmail || !signerEmail.trim()) {
      throw new AppError(
        `O email ${recipientType === 'corporate' ? 'corporativo' : 'pessoal'} do colaborador esta vazio. Nao e possivel enviar o termo.`,
        400,
      );
    }

    logger.info(`[TERM GENERATION] === INICIO ===`);
    logger.info(`[TERM GENERATION] Colaborador: ${employee.fullName}`);
    logger.info(`[TERM GENERATION] CPF: ${employee.cpf}`);
    logger.info(`[TERM GENERATION] Email pessoal: ${employee.personalEmail}`);
    logger.info(`[TERM GENERATION] Email corporativo: ${employee.corporateEmail}`);
    logger.info(`[TERM GENERATION] recipientType: ${recipientType}`);
    logger.info(`[TERM GENERATION] Envelope sera enviado para: ${signerEmail}`);
    logger.info(`[TERM GENERATION] Enviar copia (CC): ${sendCopyToOther ? (ccEmail || 'N/A - email vazio') : 'Nao'}`);
    logger.info(`[TERM GENERATION] Ativos selecionados: ${selectedAssets.length}`);

    selectedAssets.forEach((asset, i) => {
      logger.info(`[TERM GENERATION]   Ativo ${i + 1}: ${asset.type} - ${asset.name} | Modelo: ${asset.model ?? '-'} | Serial: ${asset.serial ?? '-'}`);
    });

    // 1. Converter ativos para formato do template DOCX
    const assets: TermAsset[] = selectedAssets.map(selectedAssetToTermAsset);

    // 2. Gerar DOCX preenchido
    const employeeData = {
      fullName: employee.fullName,
      cpf: employee.cpf,
      birthDate: employee.birthDate,
      corporateEmail: employee.corporateEmail,
      personalEmail: employee.personalEmail,
      phone: employee.phone,
    };

    const { buffer: docxBuffer, fileName } = docxGeneratorService.generate(employeeData, assets);

    logger.info(`[DOCX GENERATION] Arquivo gerado: ${fileName} (${docxBuffer.length} bytes)`);

    // 3. Converter DOCX para PDF (documento flat, sem campos editaveis)
    const pdfBuffer = pdfConverterService.convert(docxBuffer, fileName);
    const pdfFileName = fileName.replace(/\.docx$/i, '.pdf');

    logger.info(`[PDF CONVERSION] PDF gerado: ${pdfFileName} (${pdfBuffer.length} bytes)`);

    // 4. Enviar PDF ao DocuSign para assinatura
    const shouldSendCopy = sendCopyToOther && ccEmail && ccEmail.trim() && ccEmail !== signerEmail;

    const result = await docuSignService.sendTermEnvelope({
      recipientName: employee.fullName,
      recipientEmail: signerEmail,
      ccEmail: shouldSendCopy ? ccEmail : undefined,
      docxBuffer: pdfBuffer,
      fileName: pdfFileName,
    });

    logger.info(`[TERM GENERATION] === CONCLUIDO ===`);
    logger.info(`[TERM GENERATION] EnvelopeId: ${result.envelopeId}`);
    logger.info(`[TERM GENERATION] Enviado para: ${result.recipientEmail}`);

    return {
      success: true,
      employee: employeeData,
      assetsCount: selectedAssets.length,
      envelopeId: result.envelopeId,
      status: result.status,
      recipientType,
      recipientEmail: result.recipientEmail,
      recipientName: result.recipientName,
    };
  }
}

export const generateTermService = new GenerateTermService();
