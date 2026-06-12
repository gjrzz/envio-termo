import fs from 'node:fs';
import path from 'node:path';
import docusign from 'docusign-esign';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { generateTermoHtml } from '../utils/templateGenerator';
import type {
  CreateEnvelopeInput,
  CreateEnvelopeResult,
  DocuSignAccessToken,
  EnvelopeStatusResult,
} from '../types/docusign';

/** Escopos solicitados no fluxo JWT Grant. */
const JWT_SCOPES = ['signature', 'impersonation'];

/** Margem de seguranca (em segundos) para renovar o token antes de expirar. */
const TOKEN_EXPIRY_MARGIN_SECONDS = 60;

/**
 * Servico de integracao com a API DocuSign eSignature.
 *
 * Responsavel por autenticar via JWT Grant, criar envelopes de assinatura a
 * partir do Termo de Responsabilidade e consultar o status de envelopes
 * existentes.
 */
export class DocuSignService {
  private apiClient: docusign.ApiClient;
  private cachedToken: DocuSignAccessToken | null = null;

  constructor() {
    this.apiClient = new docusign.ApiClient();
    this.apiClient.setBasePath(env.DOCUSIGN_BASE_PATH);
    this.apiClient.setOAuthBasePath(env.DOCUSIGN_AUTH_SERVER);
  }

  /**
   * Le a chave privada RSA usada para assinar o JWT de autenticacao.
   */
  private readPrivateKey(): Buffer {
    const keyPath = path.resolve(process.cwd(), env.DOCUSIGN_PRIVATE_KEY_PATH);

    if (!fs.existsSync(keyPath)) {
      throw AppError.badGateway(
        `Chave privada do DocuSign nao encontrada em ${keyPath}. Verifique DOCUSIGN_PRIVATE_KEY_PATH.`,
      );
    }

    return fs.readFileSync(keyPath);
  }

  /**
   * Realiza a autenticacao via JWT Grant e retorna um access token valido,
   * reaproveitando o token em cache enquanto nao estiver proximo de expirar.
   */
  public async authenticate(): Promise<DocuSignAccessToken> {
    const now = Date.now();

    if (this.cachedToken && this.cachedToken.expiresAt > now) {
      return this.cachedToken;
    }

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

      return this.cachedToken;
    } catch (error) {
      logger.error('Falha ao autenticar no DocuSign (JWT Grant)', error);
      throw AppError.badGateway(
        'Nao foi possivel autenticar na API do DocuSign. Verifique as credenciais e o consentimento JWT.',
      );
    }
  }

  /**
   * Garante autenticacao e retorna uma instancia de EnvelopesApi pronta
   * para uso.
   */
  private async getEnvelopesApi(): Promise<docusign.EnvelopesApi> {
    await this.authenticate();
    return new docusign.EnvelopesApi(this.apiClient);
  }

  /**
   * Cria e envia um envelope de Termo de Responsabilidade para assinatura
   * do colaborador.
   */
  public async createEnvelope(input: CreateEnvelopeInput): Promise<CreateEnvelopeResult> {
    const envelopesApi = await this.getEnvelopesApi();

    const htmlContent = generateTermoHtml({
      nome: input.nome,
      email: input.email,
      data: input.data,
      equipamentos: input.equipamentos,
    });

    const document = new docusign.Document();
    document.documentBase64 = Buffer.from(htmlContent).toString('base64');
    document.name = 'Termo de Responsabilidade';
    document.fileExtension = 'html';
    document.documentId = '1';

    const signHere = docusign.SignHere.constructFromObject({
      anchorString: '/sn1/',
      anchorUnits: 'pixels',
      anchorXOffset: '20',
      anchorYOffset: '10',
    });

    const signer = docusign.Signer.constructFromObject({
      email: input.email,
      name: input.nome,
      recipientId: '1',
      routingOrder: '1',
      tabs: docusign.Tabs.constructFromObject({
        signHereTabs: [signHere],
      }),
    });

    const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
      emailSubject: `Termo de Responsabilidade - ${input.nome}`,
      emailBlurb: `Ola ${input.nome}, segue o Termo de Responsabilidade referente aos equipamentos corporativos atribuidos a voce. Por favor, revise e assine eletronicamente.`,
      documents: [document],
      recipients: docusign.Recipients.constructFromObject({ signers: [signer] }),
      status: 'sent',
    });

    try {
      const result = await envelopesApi.createEnvelope(env.DOCUSIGN_ACCOUNT_ID, {
        envelopeDefinition,
      });

      if (!result.envelopeId) {
        throw new Error('DocuSign nao retornou um envelopeId');
      }

      return {
        envelopeId: result.envelopeId,
        status: result.status ?? 'sent',
      };
    } catch (error) {
      logger.error('Falha ao criar envelope no DocuSign', error);
      throw AppError.badGateway('Nao foi possivel criar o envelope no DocuSign');
    }
  }

  /**
   * Consulta o status atual de um envelope no DocuSign.
   */
  public async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeStatusResult> {
    const envelopesApi = await this.getEnvelopesApi();

    try {
      const envelope = await envelopesApi.getEnvelope(env.DOCUSIGN_ACCOUNT_ID, envelopeId);

      return {
        envelopeId,
        status: envelope.status ?? 'unknown',
        completedAt: envelope.completedDateTime ?? null,
      };
    } catch (error) {
      logger.error(`Falha ao consultar status do envelope ${envelopeId}`, error);
      throw AppError.badGateway('Nao foi possivel consultar o status do envelope no DocuSign');
    }
  }
}

export const docuSignService = new DocuSignService();
