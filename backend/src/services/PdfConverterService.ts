import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import os from 'node:os';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Servico de conversao DOCX para PDF utilizando LibreOffice em modo
 * headless.
 *
 * Requisito: LibreOffice instalado na maquina (Ubuntu: `sudo apt install libreoffice-writer`).
 */
export class PdfConverterService {
  /**
   * Converte um buffer DOCX em buffer PDF usando LibreOffice headless.
   *
   * O processo:
   * 1. Salva o DOCX em arquivo temporario
   * 2. Executa `soffice --headless --convert-to pdf`
   * 3. Le o PDF gerado
   * 4. Remove os arquivos temporarios
   */
  public convert(docxBuffer: Buffer, fileName: string): Buffer {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'termo-pdf-'));
    const baseName = fileName.replace(/\.docx$/i, '');
    const docxPath = path.join(tmpDir, `${baseName}.docx`);
    const pdfPath = path.join(tmpDir, `${baseName}.pdf`);

    logger.info(`[PDF CONVERSION] Iniciando conversao: ${fileName}`);
    logger.info(`[PDF CONVERSION] DOCX temp: ${docxPath}`);
    logger.info(`[PDF CONVERSION] PDF destino: ${pdfPath}`);

    try {
      // 1. Salvar DOCX temporario
      fs.writeFileSync(docxPath, docxBuffer);

      // 2. Converter via LibreOffice headless
      execSync(
        `soffice --headless --norestore --convert-to pdf --outdir "${tmpDir}" "${docxPath}"`,
        { timeout: 60_000, stdio: 'pipe' },
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
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    }
  }
}

export const pdfConverterService = new PdfConverterService();
