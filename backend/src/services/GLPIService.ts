import axios, { type AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { AssignedAssetsResult, GlpiAsset, GlpiUser } from '../types/glpi';

/**
 * Tempo de vida (em ms) considerado seguro para reutilizar uma sessao do
 * GLPI antes de solicitar uma nova.
 */
const SESSION_TTL_MS = 10 * 60 * 1000;

/**
 * Representacao "crua" de um usuario retornado pelo endpoint
 * GET /apirest.php/User/{id} do GLPI.
 */
interface RawGlpiUser {
  id: number;
  name: string;
  firstname?: string | null;
  realname?: string | null;
}

/**
 * Representacao "crua" de um ativo (Computer, Monitor, Peripheral, Phone...)
 * retornado pelos endpoints getItems do GLPI.
 */
interface RawGlpiAsset {
  id: number;
  name: string;
  serial?: string | null;
  otherserial?: string | null;
}

/**
 * Servico de integracao com a API REST do GLPI.
 *
 * Responsavel por autenticar (initSession), localizar usuarios pelo email
 * corporativo e consultar os ativos (equipamentos) atribuidos a eles.
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

  /**
   * Garante que existe uma sessao valida com o GLPI, autenticando novamente
   * caso necessario.
   */
  private async ensureSession(): Promise<string> {
    const now = Date.now();

    if (this.sessionToken && now < this.sessionExpiresAt) {
      return this.sessionToken;
    }

    try {
      const response = await this.http.get<{ session_token: string }>('/initSession', {
        headers: {
          Authorization: `user_token ${env.GLPI_USER_TOKEN}`,
        },
      });

      this.sessionToken = response.data.session_token;
      this.sessionExpiresAt = now + SESSION_TTL_MS;

      return this.sessionToken;
    } catch (error) {
      logger.error('Falha ao iniciar sessao no GLPI', this.describeError(error));
      throw AppError.badGateway('Nao foi possivel autenticar na API do GLPI');
    }
  }

  /**
   * Invalida a sessao em cache, forcando uma nova autenticacao na proxima
   * requisicao.
   */
  private invalidateSession(): void {
    this.sessionToken = null;
    this.sessionExpiresAt = 0;
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

  /**
   * Executa uma requisicao autenticada contra a API do GLPI, renovando a
   * sessao automaticamente caso o token tenha expirado (401).
   */
  private async request<T>(
    path: string,
    params?: Record<string, unknown> | URLSearchParams,
  ): Promise<T> {
    const sessionToken = await this.ensureSession();

    try {
      const response = await this.http.get<T>(path, {
        params,
        headers: { 'Session-Token': sessionToken },
      });

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        this.invalidateSession();
        const retryToken = await this.ensureSession();

        const retryResponse = await this.http.get<T>(path, {
          params,
          headers: { 'Session-Token': retryToken },
        });

        return retryResponse.data;
      }

      logger.error(`Falha na requisicao GLPI: ${path}`, this.describeError(error));
      throw AppError.badGateway('Falha ao comunicar com a API do GLPI');
    }
  }

  /**
   * Localiza um usuario no GLPI a partir do email corporativo.
   *
   * Utiliza o endpoint de busca (search/User) filtrando pelo campo de email
   * configurado em GLPI_SEARCH_FIELD_EMAIL, e em seguida carrega os dados
   * completos do usuario via GET /User/{id}.
   */
  public async getUserByEmail(email: string): Promise<GlpiUser | null> {
    const searchParams = new URLSearchParams();
    searchParams.append('criteria[0][field]', String(env.GLPI_SEARCH_FIELD_EMAIL));
    searchParams.append('criteria[0][searchtype]', 'equals');
    searchParams.append('criteria[0][value]', email);
    searchParams.append('forcedisplay[0]', '2');
    searchParams.append('forcedisplay[1]', String(env.GLPI_SEARCH_FIELD_EMAIL));

    const result = await this.request<{ data: Record<string, string | number>[] }>(
      '/search/User',
      searchParams,
    );

    const row = result.data?.[0];

    if (!row) {
      return null;
    }

    const userId = Number(row['2']);
    const matchedEmail = String(row[String(env.GLPI_SEARCH_FIELD_EMAIL)] ?? email);

    const rawUser = await this.request<RawGlpiUser>(`/User/${userId}`);

    const firstName = rawUser.firstname?.trim() ?? '';
    const lastName = rawUser.realname?.trim() ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || rawUser.name;

    return {
      id: rawUser.id,
      username: rawUser.name,
      firstName,
      lastName,
      fullName,
      email: matchedEmail,
    };
  }

  /**
   * Retorna todos os ativos (equipamentos) atribuidos diretamente a um
   * usuario, percorrendo os itemtypes configurados em GLPI_ASSET_TYPES
   * (ex.: Computer, Monitor, Peripheral, Phone).
   */
  public async getUserAssets(userId: number): Promise<GlpiAsset[]> {
    const results = await Promise.allSettled(
      env.GLPI_ASSET_TYPES.map((itemtype) => this.fetchAssetsByType(itemtype, userId)),
    );

    const assets: GlpiAsset[] = [];

    results.forEach((result, index) => {
      const itemtype = env.GLPI_ASSET_TYPES[index];

      if (result.status === 'fulfilled') {
        assets.push(...result.value);
      } else {
        logger.warn(
          `Falha ao buscar ativos do tipo ${itemtype} para o usuario ${userId}`,
          this.describeError(result.reason),
        );
      }
    });

    return assets;
  }

  private async fetchAssetsByType(itemtype: string, userId: number): Promise<GlpiAsset[]> {
    const items = await this.request<RawGlpiAsset[]>(`/${itemtype}`, {
      'searchText[users_id]': userId,
      range: '0-199',
    });

    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item) => ({
      id: item.id,
      itemtype,
      name: item.name,
      serial: item.serial ?? null,
      inventoryNumber: item.otherserial ?? null,
    }));
  }

  /**
   * Localiza um usuario pelo email e retorna, junto com seus dados, a lista
   * consolidada de ativos atribuidos a ele.
   */
  public async getAssignedAssets(email: string): Promise<AssignedAssetsResult> {
    const user = await this.getUserByEmail(email);

    if (!user) {
      throw AppError.notFound(`Nenhum colaborador encontrado no GLPI para o email "${email}"`);
    }

    const assets = await this.getUserAssets(user.id);

    return { user, assets };
  }
}

export const glpiService = new GLPIService();
