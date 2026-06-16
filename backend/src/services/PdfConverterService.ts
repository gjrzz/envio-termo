import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Servico de conversao DOCX para PDF utilizando Microsoft Word via
 * PowerShell COM automation.
 *
 * Requisito: Microsoft Word instalado na maquina.
 */
export class PdfConverterService {
  /**
   * Converte um buffer DOCX em buffer PDF usando o Microsoft Word
   * instalado na maquina, via PowerShell COM automation.
   *
   * O processo:
   * 1. Salva o DOCX em arquivo temporario
   * 2. Executa PowerShell que abre o DOCX no Word e exporta como PDF
   * 3. Le o PDF gerado
   * 4. Remove os arquivos temporarios
   */
  public convert(docxBuffer: Buffer, fileName: string): Buffer {
    const tmpDir = os.tmpdir();
    const baseName = fileName.replace(/\.docx$/i, '');
    const docxPath = path.join(tmpDir, `${baseName}_${Date.now()}.docx`);
    const pdfPath = docxPath.replace(/\.docx$/i, '.pdf');

    logger.info(`[PDF CONVERSION] Iniciando conversao: ${fileName}`);
    logger.info(`[PDF CONVERSION] DOCX temp: ${docxPath}`);
    logger.info(`[PDF CONVERSION] PDF destino: ${pdfPath}`);

    try {
      // 1. Salvar DOCX temporario
      fs.writeFileSync(docxPath, docxBuffer);

      // 2. Converter via PowerShell + Word COM
      const psScript = `
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Open('${docxPath.replace(/\\/g, '\\\\')}')
  $doc.SaveAs([ref]'${pdfPath.replace(/\\/g, '\\\\')}', [ref]17)
  $doc.Close([ref]0)
} finally {
  $word.Quit([ref]0)
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
`.trim();

      execSync(
        `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`,
        { timeout: 30_000, windowsHide: true },
      );

      // 3. Ler PDF gerado
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF nao foi gerado em ${pdfPath}`);
      }

      const pdfBuffer = fs.readFileSync(pdfPath);

      logger.info(`[PDF CONVERSION] PDF gerado com sucesso: ${pdfBuffer.length} bytes`);

      return pdfBuffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('[PDF CONVERSION] Falha na conversao DOCX -> PDF', { error: message });
      throw AppError.badGateway(`Falha ao converter DOCX para PDF: ${message}`);
    } finally {
      // 4. Limpar temporarios
      try { fs.unlinkSync(docxPath); } catch { /* ignore */ }
      try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }
    }
  }
}

export const pdfConverterService = new PdfConverterService();
