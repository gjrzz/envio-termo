import axios, { type AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { AssignedAssetsResult, GlpiAsset, GlpiSearchRow } from '../types/glpi';

const SESSION_TTL_MS = 10 * 60 * 1000;

/**
 * Servico de integracao com a API REST do GLPI.
 *
 * Responsavel por autenticar (initSession) e consultar os ativos
 * (equipamentos) atribuidos a colaboradores pelo campo "contact".
 */
export class GLPIService {
  private readonly http: AxiosInstance;
  private sessionToken: string | null = null;
  private sessionExpiresAt = 0;

  constructor() {
    this.http = axios.create({
      baseURL: env.GLPI_API_URL,
      timeout: 15_000,
      headers: {
        'App-Token': env.GLPI_APP_TOKEN,
        'Content-Type': 'application/json',
      },
    });
  }

  private async ensureSession(): Promise<string> {
    const now = Date.now();

    if (this.sessionToken && now < this.sessionExpiresAt) {
      return this.sessionToken;
    }

    try {
      const response = await this.http.get<{ session_token: string }>('/initSession', {
        headers: { Authorization: `user_token ${env.GLPI_USER_TOKEN}` },
      });

      this.sessionToken = response.data.session_token;
      this.sessionExpiresAt = now + SESSION_TTL_MS;

      return this.sessionToken;
    } catch (error) {
      logger.error('Falha ao iniciar sessao no GLPI', this.describeError(error));
      throw AppError.badGateway('Nao foi possivel autenticar na API do GLPI');
    }
  }

  private describeError(error: unknown): unknown {
    if (error instanceof AxiosError) {
      return {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      };
    }
    return error;
  }

  private normalizeNamePart(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private capitalize(value: string): string {
    if (!value) return value;
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  /**
   * Gera o valor do campo "contact" (Nome alternativo do usuario / login do
   * Azure AD) a partir do email corporativo.
   * Ex.: "ana.barbara@empresa.com" -> "AnaBarbara@AzureAD".
   */
  private generateContactFromEmail(email: string): string {
    const localPart = email.split('@')[0] ?? '';

    const name = localPart
      .split(/[.\-_]/)
      .filter(Boolean)
      .map((part) => this.capitalize(this.normalizeNamePart(part)))
      .join('');

    return `${name}@AzureAD`;
  }

  /**
   * Descobre dinamicamente os IDs dos campos relevantes do itemtype.
   */
  private async getAssetFieldIds(sessionToken: string, itemtype: string): Promise<{
    contactFieldId: string;
    idFieldId: string;
    nameFieldId: string;
    serialFieldId: string | null;
    otherserialFieldId: string | null;
    modelFieldId: string | null;
    statusFieldId: string | null;
  }> {
    const optionsResponse = await this.http.get<Record<string, { table?: string; field?: string }>>(
      `/listSearchOptions/${itemtype}`,
      { headers: { 'Session-Token': sessionToken } },
    );

    const options = optionsResponse.data;
    const table = `glpi_${itemtype.toLowerCase()}s`;
    const modelTable = `glpi_${itemtype.toLowerCase()}models`;

    const findFieldId = (targetTable: string, field: string): string | null => {
      for (const [id, option] of Object.entries(options)) {
        if (option && typeof option === 'object' && option.table === targetTable && option.field === field) {
          return id;
        }
      }
      return null;
    };

    const contactFieldId = findFieldId(table, 'contact');

    if (!contactFieldId) {
      throw AppError.badGateway(`Nao foi possivel localizar o campo "contact" em listSearchOptions/${itemtype}`);
    }

    return {
      contactFieldId,
      idFieldId: findFieldId(table, 'id') ?? '2',
      nameFieldId: findFieldId(table, 'name') ?? '1',
      serialFieldId: findFieldId(table, 'serial'),
      otherserialFieldId: findFieldId(table, 'otherserial'),
      modelFieldId: findFieldId(modelTable, 'name'),
      statusFieldId: findFieldId('glpi_states', 'completename'),
    };
  }

  /**
   * Pesquisa um itemtype por contact e normaliza para GlpiAsset[].
   */
  private async searchAssetsByContact(sessionToken: string, itemtype: string, contact: string): Promise<GlpiAsset[]> {
    const fieldIds = await this.getAssetFieldIds(sessionToken, itemtype);
    const { contactFieldId, idFieldId, nameFieldId, serialFieldId, otherserialFieldId, modelFieldId, statusFieldId } = fieldIds;

    const params = new URLSearchParams();
    params.append('criteria[0][field]', contactFieldId);
    params.append('criteria[0][searchtype]', 'contains');
    params.append('criteria[0][value]', contact);

    let displayIdx = 0;
    params.append(`forcedisplay[${displayIdx++}]`, idFieldId);
    params.append(`forcedisplay[${displayIdx++}]`, nameFieldId);
    params.append(`forcedisplay[${displayIdx++}]`, contactFieldId);
    if (serialFieldId) params.append(`forcedisplay[${displayIdx++}]`, serialFieldId);
    if (otherserialFieldId) params.append(`forcedisplay[${displayIdx++}]`, otherserialFieldId);
    if (modelFieldId) params.append(`forcedisplay[${displayIdx++}]`, modelFieldId);
    if (statusFieldId) params.append(`forcedisplay[${displayIdx++}]`, statusFieldId);

    const response = await this.http.get<{
      data?: Record<string, GlpiSearchRow>[];
    }>(`/search/${itemtype}`, { params, headers: { 'Session-Token': sessionToken } });

    const rows = response.data.data ?? [];

    return rows.map((row) => ({
      id: Number(row[idFieldId]),
      itemtype,
      name: String(row[nameFieldId] ?? ''),
      serial: serialFieldId && row[serialFieldId] != null ? String(row[serialFieldId]) : null,
      inventoryNumber: otherserialFieldId && row[otherserialFieldId] != null ? String(row[otherserialFieldId]) : null,
      model: modelFieldId && row[modelFieldId] != null ? String(row[modelFieldId]) : null,
      status: statusFieldId && row[statusFieldId] != null ? String(row[statusFieldId]) : null,
      contact: row[contactFieldId] != null ? String(row[contactFieldId]) : null,
    }));
  }

  /**
   * Busca os equipamentos atribuidos a um colaborador a partir do seu email
   * corporativo, pesquisando pelo campo "contact" em todos os itemtypes
   * relevantes (Computer, Monitor, Peripheral, Phone, Printer).
   */
  public async getAssignedAssets(email: string): Promise<AssignedAssetsResult> {
    const contact = this.generateContactFromEmail(email);
    const sessionToken = await this.ensureSession();

    const itemtypes = ['Computer', 'Monitor', 'Peripheral', 'Phone', 'Printer'];

    const results = await Promise.allSettled(
      itemtypes.map((itemtype) => this.searchAssetsByContact(sessionToken, itemtype, contact)),
    );

    const assets: GlpiAsset[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        assets.push(...result.value);
      } else {
        logger.warn(`Falha ao buscar ativos do tipo ${itemtypes[index]} por contact`, this.describeError(result.reason));
      }
    });

    logger.info(`[GLPI] Email: ${email} | Contact: ${contact} | Equipamentos: ${assets.length}`);

    const localPart = email.split('@')[0] ?? '';
    const fullName = localPart
      .split(/[.\-_]/)
      .filter(Boolean)
      .map((part) => this.capitalize(this.normalizeNamePart(part)))
      .join(' ');

    return {
      user: { fullName: fullName || email, email },
      assets,
    };
  }
}

export const glpiService = new GLPIService();
