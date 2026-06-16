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

interface TemplateInfo {
  templateId: string;
  name: string;
  description: string | null;
}

/**
 * Servico de integracao com a API DocuSign eSignature via JWT Grant.
 *
 * Responsavel por autenticar, obter informacoes da conta e listar templates.
 */
export class DocuSignService {
  private apiClient: docusign.ApiClient;
  private cachedToken: CachedToken | null = null;

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
   * Realiza a autenticacao via JWT Grant e retorna um access token valido.
   * Reutiliza o token em cache enquanto nao estiver proximo de expirar.
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.cachedToken && this.cachedToken.expiresAt > now) {
      logger.debug('[DOCUSIGN AUTH] Reutilizando token em cache');
      return this.cachedToken.accessToken;
    }

    logger.info('[DOCUSIGN AUTH] Iniciando autenticacao JWT Grant');
    logger.info(`[DOCUSIGN AUTH] Integration Key: ${env.DOCUSIGN_INTEGRATION_KEY.slice(0, 8)}...`);
    logger.info(`[DOCUSIGN AUTH] User ID: ${env.DOCUSIGN_USER_ID.slice(0, 8)}...`);
    logger.info(`[DOCUSIGN AUTH] Auth Server: ${env.DOCUSIGN_AUTH_SERVER}`);

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

  /**
   * Obtem informacoes da conta DocuSign (accountId, accountName, baseUri)
   * usando o token de acesso e o endpoint UserInfo.
   */
  public async getAccountInfo(): Promise<AccountInfo> {
    const accessToken = await this.getAccessToken();

    logger.info('[DOCUSIGN ACCOUNT] Obtendo informacoes da conta');

    try {
      const userInfo = await this.apiClient.getUserInfo(accessToken);

      const account = userInfo.accounts.find((acc) => acc.accountId === env.DOCUSIGN_ACCOUNT_ID)
        ?? userInfo.accounts[0];

      if (!account) {
        throw new Error('Nenhuma conta encontrada no UserInfo');
      }

      logger.info(
        `[DOCUSIGN ACCOUNT] Conta encontrada | ID: ${account.accountId} | Nome: ${account.accountName} | Base URI: ${account.baseUri}`,
      );

      // Atualizar basePath para o baseUri real da conta
      const basePath = `${account.baseUri}/restapi`;
      this.apiClient.setBasePath(basePath);
      logger.info(`[DOCUSIGN ACCOUNT] BasePath atualizado: ${basePath}`);

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
   * Lista os templates disponiveis na conta DocuSign.
   */
  public async listTemplates(): Promise<TemplateInfo[]> {
    await this.getAccessToken();
    const accountInfo = await this.getAccountInfo();

    logger.info(`[DOCUSIGN TEMPLATES] Listando templates da conta ${accountInfo.accountId}`);

    try {
      const templatesApi = new docusign.TemplatesApi(this.apiClient);
      const result = await templatesApi.listTemplates(accountInfo.accountId);

      const templates: TemplateInfo[] = (result.envelopeTemplates ?? []).map((tpl) => ({
        templateId: tpl.templateId ?? '',
        name: tpl.name ?? '',
        description: tpl.description ?? null,
      }));

      logger.info(
        `[DOCUSIGN TEMPLATES] ${templates.length} template(s) encontrado(s)`,
      );

      templates.forEach((tpl) => {
        logger.info(`[DOCUSIGN TEMPLATES]   - ${tpl.name} (${tpl.templateId})`);
      });

      return templates;
    } catch (error: unknown) {
      // 404 = nenhum template na conta (normal para sandbox nova)
      const status = (error as { response?: { status?: number } }).response?.status;

      if (status === 404) {
        logger.info('[DOCUSIGN TEMPLATES] Nenhum template encontrado na conta (404)');
        return [];
      }

      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error('[DOCUSIGN TEMPLATES] Falha ao listar templates', { error: message });
      throw AppError.badGateway(`Falha ao listar templates do DocuSign: ${message}`);
    }
  }

  /**
   * Obtem os detalhes completos de um template: recipients e suas tabs.
   * Salva o resultado em logs/docusign-template-details.json.
   */
  public async getTemplateDetails(templateId: string): Promise<unknown> {
    await this.getAccessToken();
    const accountInfo = await this.getAccountInfo();

    logger.info(`[DOCUSIGN TEMPLATE DETAILS] Buscando template: ${templateId}`);

    const templatesApi = new docusign.TemplatesApi(this.apiClient);

    try {
      // 1. Obter info basica do template
      const templateInfo = await templatesApi.get(accountInfo.accountId, templateId, {
        include: 'recipients',
      });

      logger.info(`[DOCUSIGN TEMPLATE DETAILS] Nome: ${templateInfo.name}`);
      logger.info(`[DOCUSIGN TEMPLATE DETAILS] Descricao: ${templateInfo.description ?? '(nenhuma)'}`);

      // 2. Listar recipients
      const recipients = await templatesApi.listRecipients(accountInfo.accountId, templateId);

      const allRecipients = [
        ...(recipients.signers ?? []),
        ...(recipients.carbonCopies ?? []),
        ...(recipients.certifiedDeliveries ?? []),
      ];

      logger.info(`[DOCUSIGN TEMPLATE DETAILS] Recipients: ${allRecipients.length}`);

      allRecipients.forEach((r) => {
        logger.info(`[DOCUSIGN TEMPLATE DETAILS]   - recipientId=${r.recipientId} | roleName=${r.roleName} | routingOrder=${r.routingOrder}`);
      });

      // 3. Para cada recipient, listar suas tabs
      const recipientDetails = [];

      for (const recipient of allRecipients) {
        const recipientId = recipient.recipientId ?? '1';

        logger.info(`[DOCUSIGN TEMPLATE DETAILS] Buscando tabs do recipient ${recipientId} (${recipient.roleName})...`);

        const tabs = await templatesApi.listTabs(accountInfo.accountId, templateId, recipientId);

        const allTabs: Array<{ tabLabel: string; tabType: string; required: string; recipientId: string }> = [];

        for (const [tabType, tabArray] of Object.entries(tabs)) {
          if (Array.isArray(tabArray)) {
            for (const tab of tabArray) {
              allTabs.push({
                tabLabel: tab.tabLabel ?? tab.name ?? '(sem label)',
                tabType,
                required: tab.required ?? 'false',
                recipientId: tab.recipientId ?? recipientId,
              });
            }
          }
        }

        logger.info(`[DOCUSIGN TEMPLATE DETAILS]   Tabs encontradas: ${allTabs.length}`);

        allTabs.forEach((t) => {
          logger.info(`[DOCUSIGN TEMPLATE DETAILS]     - [${t.tabType}] label="${t.tabLabel}" required=${t.required}`);
        });

        recipientDetails.push({
          recipientId: recipient.recipientId,
          roleName: recipient.roleName,
          routingOrder: recipient.routingOrder,
          name: recipient.name,
          email: recipient.email,
          tabs: allTabs,
        });
      }

      // 4. Montar resultado completo
      const result = {
        templateId,
        name: templateInfo.name,
        description: templateInfo.description,
        recipients: recipientDetails,
      };

      // 5. Salvar em arquivo
      const logsDir = path.resolve(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const outputPath = path.join(logsDir, 'docusign-template-details.json');
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

      logger.info(`[DOCUSIGN TEMPLATE DETAILS] Resultado salvo em: ${outputPath}`);

      return result;
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: { errorCode?: string; message?: string } }; message?: string };
      const message = axiosErr.response?.data?.message ?? axiosErr.message ?? 'Erro desconhecido';
      const errorCode = axiosErr.response?.data?.errorCode;

      logger.error('[DOCUSIGN TEMPLATE DETAILS] Falha ao obter detalhes do template', {
        error: message,
        errorCode,
        status: axiosErr.response?.status,
      });

      throw AppError.badGateway(
        `Falha ao obter detalhes do template: ${errorCode ? `[${errorCode}] ` : ''}${message}`,
      );
    }
  }

  /**
   * Envia um envelope de teste com um documento HTML simples.
   * Usado para validar o envio real de envelopes em producao.
   */
  public async sendTestEnvelope(recipientName: string, recipientEmail: string): Promise<{
    envelopeId: string;
    status: string;
    recipientEmail: string;
  }> {
    const accountInfo = await this.getAccountInfo();

    logger.info(`[DOCUSIGN ENVELOPE] === INICIANDO ENVIO DE TESTE ===`);
    logger.info(`[DOCUSIGN ENVELOPE] Account ID: ${accountInfo.accountId}`);
    logger.info(`[DOCUSIGN ENVELOPE] Destinatario: ${recipientName} <${recipientEmail}>`);

    // Documento HTML simples
    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
<h1 style="text-align:center;color:#0f4c81;">Teste de Integracao DocuSign</h1>
<hr style="border:1px solid #0f4c81;"/>
<p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
<p><strong>Destinatario:</strong> ${recipientName}</p>
<p><strong>Email:</strong> ${recipientEmail}</p>
<p><strong>Conta:</strong> ${accountInfo.accountName} (${accountInfo.accountId})</p>
<br/>
<p>Este documento foi gerado automaticamente para validar a integracao entre o sistema de Termos de Responsabilidade e a API DocuSign eSignature em ambiente de producao.</p>
<br/><br/>
<p>Assine abaixo para confirmar:</p>
<br/><br/>
<p>/sn1/</p>
</body></html>`;

    logger.info('[DOCUSIGN ENVELOPE] Documento HTML gerado em memoria');

    // Montar envelope - payload minimo e direto
    const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
      emailSubject: `Teste de Integracao - ${recipientName}`,
      documents: [
        {
          documentBase64: Buffer.from(htmlContent).toString('base64'),
          name: 'Teste Integracao DocuSign',
          fileExtension: 'html',
          documentId: '1',
        },
      ],
      recipients: {
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
                  anchorXOffset: '20',
                  anchorYOffset: '-10',
                },
              ],
            },
          },
        ],
      },
      status: 'sent',
    });

    logger.info('[DOCUSIGN ENVELOPE] Payload montado | status=sent');

    try {
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const result = await envelopesApi.createEnvelope(accountInfo.accountId, {
        envelopeDefinition,
      });

      if (!result.envelopeId) {
        throw new Error('DocuSign nao retornou um envelopeId');
      }

      logger.info(`[DOCUSIGN ENVELOPE] === ENVELOPE ENVIADO COM SUCESSO ===`);
      logger.info(`[DOCUSIGN ENVELOPE] EnvelopeId: ${result.envelopeId}`);
      logger.info(`[DOCUSIGN ENVELOPE] Status: ${result.status}`);
      logger.info(`[DOCUSIGN ENVELOPE] Destinatario: ${recipientEmail}`);

      return {
        envelopeId: result.envelopeId,
        status: result.status ?? 'sent',
        recipientEmail,
      };
    } catch (error: unknown) {
      const axiosErr = error as { response?: { status?: number; data?: { errorCode?: string; message?: string } }; message?: string };
      const message = axiosErr.response?.data?.message ?? axiosErr.message ?? 'Erro desconhecido';
      const errorCode = axiosErr.response?.data?.errorCode;

      logger.error('[DOCUSIGN ENVELOPE] === FALHA NO ENVIO ===', {
        error: message,
        errorCode,
        status: axiosErr.response?.status,
        responseData: axiosErr.response?.data,
      });

      throw AppError.badGateway(
        `Falha ao enviar envelope: ${errorCode ? `[${errorCode}] ` : ''}${message}`,
      );
    }
  }

  /**
   * Cria e envia um envelope de Termo de Responsabilidade com um documento
   * DOCX preenchido. O DocuSign recebe o DOCX ja completo e o converte
   * internamente para PDF. O colaborador apenas assina — nenhum campo e
   * editavel.
   *
   * Nao utiliza template DocuSign, textTabs nem prefillTabs.
   * Utiliza apenas: document (DOCX) + signer + signHereTab (anchor).
   */
  public async sendTermEnvelope(input: {
    recipientName: string;
    recipientEmail: string;
    docxBuffer: Buffer;
    fileName: string;
  }): Promise<{
    envelopeId: string;
    status: string;
    recipientEmail: string;
    recipientName: string;
  }> {
    const { recipientName, recipientEmail: originalEmail, docxBuffer, fileName } = input;

    // Override de email para testes
    const recipientEmail = env.DOCUSIGN_OVERRIDE_RECIPIENT_EMAIL || originalEmail;

    logger.info(`[DOCUSIGN TERM] === INICIANDO ENVIO DE TERMO ===`);
    logger.info(`[DOCUSIGN TERM] Colaborador: ${recipientName}`);
    logger.info(`[DOCUSIGN TERM] Email original: ${originalEmail}`);
    logger.info(`[DOCUSIGN TERM] Email destino: ${recipientEmail}${env.DOCUSIGN_OVERRIDE_RECIPIENT_EMAIL ? ' (OVERRIDE ATIVO)' : ''}`);
    logger.info(`[DOCUSIGN TERM] Documento: ${fileName} (${docxBuffer.length} bytes)`);

    const accountInfo = await this.getAccountInfo();

    // Montar envelope com PDF preenchido (sem template, sem textTabs)
    // O PDF e flat — nenhum campo editavel, apenas assinatura
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
      recipients: {
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
                  anchorXOffset: '20',
                  anchorYOffset: '-10',
                },
              ],
            },
          },
        ],
      },
      status: 'sent',
    });

    logger.info(`[DOCUSIGN TERM] Envelope montado | status=sent | documento DOCX direto`);

    try {
      const envelopesApi = new docusign.EnvelopesApi(this.apiClient);
      const result = await envelopesApi.createEnvelope(accountInfo.accountId, {
        envelopeDefinition,
      });

      if (!result.envelopeId) {
        throw new Error('DocuSign nao retornou um envelopeId');
      }

      logger.info(`[DOCUSIGN TERM] === TERMO ENVIADO COM SUCESSO ===`);
      logger.info(`[DOCUSIGN TERM] EnvelopeId: ${result.envelopeId}`);
      logger.info(`[DOCUSIGN TERM] Status: ${result.status}`);
      logger.info(`[DOCUSIGN TERM] Destinatario: ${recipientName} <${recipientEmail}>`);

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

      logger.error('[DOCUSIGN TERM] === FALHA NO ENVIO DO TERMO ===', {
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
