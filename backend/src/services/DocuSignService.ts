import fs from 'node:fs';
import path from 'node:path';
import docusign from 'docusign-esign';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/** Escopos solicitados no fluxo JWT Grant. */
const JWT_SCOPES = ['signature', 'impersonation'];

/** Margem de seguranca (em segundos) para renovar o token antes de expirar. */
const TOKEN_EXPIRY_MARGIN_SECONDS = 60;

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

interface AccountInfo {
  accountId: string;
  accountName: string;
  baseUri: string;
}

/**
 * Servico de integracao com a API DocuSign eSignature via JWT Grant.
 *
 * Responsavel por autenticar, obter informacoes da conta e enviar
 * envelopes de Termos de Responsabilidade.
 */
export class DocuSignService {
  private apiClient: docusign.ApiClient;
  private cachedToken: CachedToken | null = null;

  constructor() {
    this.apiClient = new docusign.ApiClient();
    this.apiClient.setBasePath(env.DOCUSIGN_BASE_PATH);
    this.apiClient.setOAuthBasePath(env.DOCUSIGN_AUTH_SERVER);
  }

  private readPrivateKey(): Buffer {
    const keyPath = path.resolve(process.cwd(), env.DOCUSIGN_PRIVATE_KEY_PATH);

    if (!fs.existsSync(keyPath)) {
      throw AppError.badGateway(
        `Chave privada do DocuSign nao encontrada em ${keyPath}. Verifique DOCUSIGN_PRIVATE_KEY_PATH.`,
      );
    }

    return fs.readFileSync(keyPath);
  }

  public async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.cachedToken && this.cachedToken.expiresAt > now) {
      return this.cachedToken.accessToken;
    }

    logger.info('[DOCUSIGN AUTH] Iniciando autenticacao JWT Grant');

    try {
      const privateKey = this.readPrivateKey();

      const response = await this.apiClient.requestJWTUserToken(
        env.DOCUSIGN_INTEGRATION_KEY,
        env.DOCUSIGN_USER_ID,
        JWT_SCOPES,
        privateKey,
        3600,
      );

      const { access_token: accessToken, expires_in: expiresIn } = response.body;

      this.cachedToken = {
        accessToken,
        expiresAt: now + (expiresIn - TOKEN_EXPIRY_MARGIN_SECONDS) * 1000,
      };

      this.apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);

      logger.info(`[DOCUSIGN AUTH] Token obtido com sucesso | Expira em: ${expiresIn}s`);

      return accessToken;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('[DOCUSIGN AUTH] Falha ao autenticar via JWT Grant', { error: message });
      throw AppError.badGateway(
        `Nao foi possivel autenticar na API do DocuSign. Verifique as credenciais e o consentimento JWT. Erro: ${message}`,
      );
    }
  }

  public async getAccountInfo(): Promise<AccountInfo> {
    const accessToken = await this.getAccessToken();

    try {
      const userInfo = await this.apiClient.getUserInfo(accessToken);

      const account = userInfo.accounts.find((acc) => acc.accountId === env.DOCUSIGN_ACCOUNT_ID)
        ?? userInfo.accounts[0];

      if (!account) {
        throw new Error('Nenhuma conta encontrada no UserInfo');
      }

      const basePath = `${account.baseUri}/restapi`;
      this.apiClient.setBasePath(basePath);

      return {
        accountId: account.accountId,
        accountName: account.accountName,
        baseUri: account.baseUri,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('[DOCUSIGN ACCOUNT] Falha ao obter informacoes da conta', { error: message });
      throw AppError.badGateway(`Falha ao obter informacoes da conta DocuSign: ${message}`);
    }
  }

  /**
   * Cria e envia um envelope de Termo de Responsabilidade com um PDF
   * preenchido. O colaborador apenas assina — nenhum campo e editavel.
   */
  public async sendTermEnvelope(input: {
    recipientName: string;
    recipientEmail: string;
    ccEmail?: string;
    docxBuffer: Buffer;
    fileName: string;
  }): Promise<{
    envelopeId: string;
    status: string;
    recipientEmail: string;
    recipientName: string;
  }> {
    const { recipientName, recipientEmail, ccEmail, docxBuffer, fileName } = input;

    logger.info(`[DOCUSIGN TERM] Enviando termo para ${recipientName} <${recipientEmail}>`);

    const accountInfo = await this.getAccountInfo();

    const recipients: Record<string, unknown[]> = {
      signers: [
        {
          email: recipientEmail,
          name: recipientName,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [
              {
                anchorString: '/sn1/',
                anchorUnits: 'pixels',
                anchorXOffset: '0',
                anchorYOffset: '0',
              },
            ],
          },
        },
      ],
    };

    if (ccEmail) {
      recipients.carbonCopies = [
        {
          email: ccEmail,
          name: recipientName,
          recipientId: '2',
          routingOrder: '2',
        },
      ];
    }

    const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
      emailSubject: `Termo de Responsabilidade - ${recipientName}`,
      documents: [
        {
          documentBase64: docxBuffer.toString('base64'),
          name: 'Termo de Responsabilidade',
          fileExtension: fileName.endsWith('.pdf') ? 'pdf' : 'docx',
          documentId: '1',
          transformPdfFields: 'false',
        },
      ],
      recipients,
      status: 'sent',
    });

    try {
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const result = await envelopesApi.createEnvelope(accountInfo.accountId, {
        envelopeDefinition,
      });

      if (!result.envelopeId) {
        throw new Error('DocuSign nao retornou um envelopeId');
      }

      logger.info(`[DOCUSIGN TERM] Termo enviado | EnvelopeId: ${result.envelopeId}`);

      return {
        envelopeId: result.envelopeId,
        status: result.status ?? 'sent',
        recipientEmail,
        recipientName,
      };
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: { errorCode?: string; message?: string } }; message?: string };
      const message = axiosErr.response?.data?.message ?? axiosErr.message ?? 'Erro desconhecido';
      const errorCode = axiosErr.response?.data?.errorCode;

      logger.error('[DOCUSIGN TERM] Falha no envio do termo', {
        error: message,
        errorCode,
        status: axiosErr.response?.status,
      });

      throw AppError.badGateway(
        `Falha ao enviar termo via DocuSign: ${errorCode ? `[${errorCode}] ` : ''}${message}`,
      );
    }
  }
}

export const docuSignService = new DocuSignService();
