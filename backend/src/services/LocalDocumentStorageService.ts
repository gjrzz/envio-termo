import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Resultado da gravacao local de um documento.
 */
export interface LocalStorageResult {
  fileName: string;
  filePath: string;
  saved: boolean;
}

/**
 * Servico de armazenamento local de documentos gerados.
 *
 * Salva os DOCX na pasta configurada em GENERATED_TERMS_PATH, que deve
 * apontar para uma pasta sincronizada pelo OneDrive (ex.:
 * C:\Users\usuario\OneDrive\TermosPendentes).
 *
 * O Power Automate monitora essa pasta e envia os documentos para
 * assinatura via DocuSign.
 */
export class LocalDocumentStorageService {
  private readonly folderPath: string;

  constructor() {
    this.folderPath = env.GENERATED_TERMS_PATH;

    logger.info(
      `[DOCUMENT PATH] GENERATED_TERMS_PATH: ${env.GENERATED_TERMS_PATH} | PATH UTILIZADO: ${this.folderPath}`,
    );

    this.ensureFolder();
  }

  /**
   * Verifica se a pasta de destino existe e a cria caso nao exista.
   */
  private ensureFolder(): void {
    if (!fs.existsSync(this.folderPath)) {
      fs.mkdirSync(this.folderPath, { recursive: true });
      logger.info(`[LOCAL STORAGE] Pasta criada: ${this.folderPath}`);
    }
  }

  /**
   * Salva o buffer do documento na pasta configurada.
   */
  public save(buffer: Buffer, fileName: string): LocalStorageResult {
    this.ensureFolder();

    const filePath = path.join(this.folderPath, fileName);

    logger.info(
      `[DOCUMENT PATH] Salvando arquivo | GENERATED_TERMS_PATH: ${this.folderPath} | PATH UTILIZADO: ${filePath}`,
    );

    try {
      fs.writeFileSync(filePath, buffer);

      logger.info(`[LOCAL STORAGE] Arquivo salvo com sucesso | Destino: ${filePath}`);

      return { fileName, filePath, saved: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';

      logger.error('[LOCAL STORAGE] Falha ao salvar arquivo', {
        fileName,
        filePath,
        error: message,
      });

      throw AppError.badGateway(
        `Falha ao salvar o arquivo ${fileName} em ${this.folderPath}: ${message}`,
      );
    }
  }
}

export const localDocumentStorageService = new LocalDocumentStorageService();
