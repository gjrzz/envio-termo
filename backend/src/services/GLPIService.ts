import axios, { type AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type {
  AssignedAssetsResult,
  GlpiAsset,
  GlpiComputerByContactResult,
  GlpiComputerRawDebugResult,
  GlpiComputerSummary,
  GlpiConnectionTestResult,
  GlpiContactCandidate,
  GlpiDebugAttempt,
  GlpiFieldMatch,
  GlpiSearchRow,
  GlpiUserDebugResult,
  GlpiUserRawDebugResult,
  GlpiUserSearchDebugResult,
  GlpiValidateContactResult,
} from '../types/glpi';

/**
 * Tempo de vida (em ms) considerado seguro para reutilizar uma sessao do
 * GLPI antes de solicitar uma nova.
 */
const SESSION_TTL_MS = 10 * 60 * 1000;

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

  private describeError(error: unknown): unknown {
    if (error instanceof AxiosError) {
      return {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        code: error.code,
      };
    }

    return error;
  }

  /**
   * Mascara um token sensivel para uso em logs, mantendo apenas os
   * primeiros e ultimos caracteres visiveis.
   */
  private maskToken(token: string): string {
    if (token.length <= 8) {
      return '*'.repeat(token.length);
    }

    return `${token.slice(0, 4)}...${token.slice(-4)} (${token.length} chars)`;
  }

  /**
   * Monta uma mensagem de erro amigavel a partir de uma falha de
   * comunicacao com o GLPI, tratando o formato de erro padrao da API
   * (`["codigo_do_erro", "mensagem"]`).
   */
  private buildErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      if (error.response) {
        const data = error.response.data as unknown;

        if (Array.isArray(data) && data.length >= 2) {
          return `GLPI retornou o erro "${data[0]}": ${data[1]}`;
        }

        if (data && typeof data === 'object' && 'message' in data) {
          return String((data as { message: unknown }).message);
        }

        return `GLPI respondeu com status HTTP ${error.response.status}`;
      }

      if (error.request) {
        return `Nao foi possivel conectar a ${env.GLPI_API_URL}. Verifique a URL configurada (GLPI_API_URL) e a conectividade de rede/firewall.`;
      }

      return error.message;
    }

    return error instanceof Error ? error.message : 'Erro desconhecido ao conectar no GLPI';
  }

  /**
   * Rota de debug: testa a autenticacao no GLPI chamando diretamente o
   * endpoint /initSession com App-Token e User Token, sem reaproveitar ou
   * afetar o cache de sessao usado pelas demais operacoes.
   */
  public async testConnection(): Promise<GlpiConnectionTestResult> {
    const url = `${env.GLPI_API_URL}/initSession`;

    logger.info('[GLPI TEST] Iniciando teste de autenticacao no GLPI', {
      url,
      appToken: this.maskToken(env.GLPI_APP_TOKEN),
      userToken: this.maskToken(env.GLPI_USER_TOKEN),
    });

    try {
      logger.debug('[GLPI TEST] Enviando requisicao GET /initSession', {
        headers: {
          'App-Token': this.maskToken(env.GLPI_APP_TOKEN),
          Authorization: `user_token ${this.maskToken(env.GLPI_USER_TOKEN)}`,
        },
      });

      const response = await this.http.get<{ session_token: string }>('/initSession', {
        headers: {
          Authorization: `user_token ${env.GLPI_USER_TOKEN}`,
        },
      });

      logger.info('[GLPI TEST] initSession respondeu com sucesso', {
        httpStatus: response.status,
        sessionToken: this.maskToken(response.data.session_token),
      });

      return {
        success: true,
        sessionToken: response.data.session_token,
        message: 'Autenticacao no GLPI realizada com sucesso.',
      };
    } catch (error) {
      const details = this.describeError(error);
      const message = this.buildErrorMessage(error);

      logger.error('[GLPI TEST] Falha ao autenticar no GLPI', { message, details });

      return {
        success: false,
        sessionToken: null,
        message,
        details,
      };
    }
  }

  /**
   * Executa uma tentativa de busca para a rota de debug, registrando em
   * log o endpoint, a query enviada e a quantidade de registros
   * encontrados, sem lancar excecao em caso de falha (o erro e retornado
   * dentro do proprio resultado).
   */
  private async runDebugAttempt(
    sessionToken: string,
    label: string,
    endpoint: string,
    params: URLSearchParams,
  ): Promise<GlpiDebugAttempt> {
    const query = Object.fromEntries(params.entries());

    logger.info(`[GLPI DEBUG] ${label}`, { endpoint, query });

    try {
      const response = await this.http.get(endpoint, {
        params,
        headers: { 'Session-Token': sessionToken },
      });

      const data = response.data as unknown;
      let count: number | undefined;
      let totalcount: number | undefined;

      if (Array.isArray(data)) {
        count = data.length;
      } else if (data && typeof data === 'object' && 'data' in data) {
        const searchResponse = data as { data?: unknown[]; count?: number; totalcount?: number };
        count = searchResponse.data?.length ?? searchResponse.count;
        totalcount = searchResponse.totalcount;
      } else if (data && typeof data === 'object') {
        count = Object.keys(data).length;
      }

      logger.info(`[GLPI DEBUG] ${label} -> ${count ?? 'desconhecido'} registro(s) encontrado(s)`, {
        endpoint,
        totalcount,
        count,
      });

      return { label, endpoint, query, success: true, totalcount, count, data };
    } catch (error) {
      const details = this.describeError(error);

      logger.warn(`[GLPI DEBUG] ${label} -> falhou`, { endpoint, query, ...((details as object) ?? {}) });

      return { label, endpoint, query, success: false, error: details };
    }
  }

  /**
   * Rota de debug: tenta localizar um usuario pelo email utilizando
   * diferentes endpoints/estrategias do GLPI (search/User, /User,
   * search/UserEmail), retornando a resposta completa de cada tentativa
   * para inspecao manual dos campos disponiveis.
   */
  public async debugFindUserByEmail(email: string): Promise<GlpiUserDebugResult> {
    const sessionToken = await this.ensureSession();

    logger.info('[GLPI DEBUG] Iniciando busca de usuario por email', { email });

    const attempts: GlpiDebugAttempt[] = [];

    // Tentativa 1: search/User filtrando pelo campo de email configurado (searchtype=equals)
    const equalsParams = new URLSearchParams();
    equalsParams.append('criteria[0][field]', String(env.GLPI_SEARCH_FIELD_EMAIL));
    equalsParams.append('criteria[0][searchtype]', 'equals');
    equalsParams.append('criteria[0][value]', email);
    equalsParams.append('forcedisplay[0]', '1');
    equalsParams.append('forcedisplay[1]', '2');
    equalsParams.append('forcedisplay[2]', String(env.GLPI_SEARCH_FIELD_EMAIL));
    equalsParams.append('forcedisplay[3]', '9');
    equalsParams.append('forcedisplay[4]', '34');

    attempts.push(
      await this.runDebugAttempt(
        sessionToken,
        `search/User (criteria[field]=${env.GLPI_SEARCH_FIELD_EMAIL}, searchtype=equals)`,
        '/search/User',
        equalsParams,
      ),
    );

    // Tentativa 2: search/User com searchtype=contains (mais permissivo)
    const containsParams = new URLSearchParams();
    containsParams.append('criteria[0][field]', String(env.GLPI_SEARCH_FIELD_EMAIL));
    containsParams.append('criteria[0][searchtype]', 'contains');
    containsParams.append('criteria[0][value]', email);
    containsParams.append('forcedisplay[0]', '1');
    containsParams.append('forcedisplay[1]', '2');
    containsParams.append('forcedisplay[2]', String(env.GLPI_SEARCH_FIELD_EMAIL));
    containsParams.append('forcedisplay[3]', '9');
    containsParams.append('forcedisplay[4]', '34');

    attempts.push(
      await this.runDebugAttempt(
        sessionToken,
        `search/User (criteria[field]=${env.GLPI_SEARCH_FIELD_EMAIL}, searchtype=contains)`,
        '/search/User',
        containsParams,
      ),
    );

    // Tentativa 3: GET /User (getItems) filtrando pelo login (name), para o caso
    // de o login do usuario ser o proprio email corporativo
    const userItemsParams = new URLSearchParams();
    userItemsParams.append('searchText[name]', email);
    userItemsParams.append('range', '0-9');

    attempts.push(
      await this.runDebugAttempt(
        sessionToken,
        'GET /User (searchText[name])',
        '/User',
        userItemsParams,
      ),
    );

    // Tentativa 4: search/UserEmail - tabela dedicada de emails do usuario
    // (glpi_useremails). O numero do campo pode variar entre instalacoes;
    // o resultado ajuda a identificar o search option correto.
    const userEmailParams = new URLSearchParams();
    userEmailParams.append('criteria[0][field]', String(env.GLPI_SEARCH_FIELD_EMAIL));
    userEmailParams.append('criteria[0][searchtype]', 'equals');
    userEmailParams.append('criteria[0][value]', email);
    userEmailParams.append('forcedisplay[0]', '1');
    userEmailParams.append('forcedisplay[1]', '2');
    userEmailParams.append('forcedisplay[2]', '3');
    userEmailParams.append('forcedisplay[3]', '4');
    userEmailParams.append('forcedisplay[4]', '5');

    attempts.push(
      await this.runDebugAttempt(
        sessionToken,
        'search/UserEmail (criteria[field]=' + env.GLPI_SEARCH_FIELD_EMAIL + ', searchtype=equals)',
        '/search/UserEmail',
        userEmailParams,
      ),
    );

    // Tentativa 5: listSearchOptions/User - lista todos os campos pesquisaveis
    // do itemtype User com seus respectivos IDs, para identificar o campo
    // correto que representa o email do usuario.
    attempts.push(
      await this.runDebugAttempt(
        sessionToken,
        'GET /listSearchOptions/User',
        '/listSearchOptions/User',
        new URLSearchParams(),
      ),
    );

    return { email, sessionToken, attempts };
  }

  /**
   * Rota de debug: busca o usuario completo pelo ID em GET /User/{id},
   * retornando a resposta crua da API sem filtrar nenhum campo, para
   * identificar como o "Nome alternativo" (ex.: login do Azure AD) e
   * representado pela API do GLPI.
   */
  public async debugGetUserById(id: number): Promise<GlpiUserRawDebugResult> {
    const sessionToken = await this.ensureSession();
    const endpoint = `/User/${id}`;

    logger.info('[GLPI DEBUG] Buscando usuario completo por ID', { endpoint, id });

    try {
      const response = await this.http.get(endpoint, {
        headers: { 'Session-Token': sessionToken },
      });

      logger.info('[GLPI DEBUG] GET /User/{id} respondeu com sucesso', {
        endpoint,
        httpStatus: response.status,
      });

      return { id, endpoint, data: response.data };
    } catch (error) {
      const details = this.describeError(error);

      logger.error('[GLPI DEBUG] Falha ao buscar usuario por ID', { endpoint, ...((details as object) ?? {}) });

      throw AppError.badGateway(`Falha ao buscar o usuario ${id} no GLPI`);
    }
  }

  /**
   * Rota de debug: pesquisa usuarios via search/User pelo campo principal
   * (User.name, field=1 - o mesmo campo usado pela busca padrao da
   * interface do GLPI), sem aplicar nenhum filtro adicional, retornando a
   * resposta completa para identificar qual propriedade contem o valor
   * pesquisado.
   */
  public async debugSearchUsers(query: string): Promise<GlpiUserSearchDebugResult> {
    const sessionToken = await this.ensureSession();

    const params = new URLSearchParams();
    params.append('criteria[0][field]', '1');
    params.append('criteria[0][searchtype]', 'contains');
    params.append('criteria[0][value]', query);
    params.append('forcedisplay[0]', '1');
    params.append('forcedisplay[1]', '2');
    params.append('forcedisplay[2]', '9');
    params.append('forcedisplay[3]', '34');
    params.append('forcedisplay[4]', '5');
    params.append('forcedisplay[5]', '28');

    const attempt = await this.runDebugAttempt(
      sessionToken,
      `search/User (criteria[field]=1 "User.name", searchtype=contains, value=${query})`,
      '/search/User',
      params,
    );

    return {
      query,
      sessionToken,
      fieldMap: {
        '1': 'User.name (login - campo principal usado pela busca padrao do GLPI)',
        '2': 'User.id',
        '9': 'User.firstname (nome)',
        '34': 'User.realname (sobrenome)',
        '5': 'User.UserEmail.email (e-mail)',
        '28': 'User.sync_field (campo de sincronizacao / possivel "Nome alternativo")',
      },
      attempt,
    };
  }

  /**
   * Percorre recursivamente um objeto/array em busca de valores primitivos
   * que contenham (case-insensitive) o valor pesquisado, retornando o
   * caminho exato de cada propriedade encontrada (ex.: "data.networkports[0].mac").
   */
  private findFieldPaths(node: unknown, searchValue: string, path: string): GlpiFieldMatch[] {
    const matches: GlpiFieldMatch[] = [];
    const needle = searchValue.toLowerCase();

    if (Array.isArray(node)) {
      node.forEach((item, index) => {
        matches.push(...this.findFieldPaths(item, searchValue, `${path}[${index}]`));
      });
    } else if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        const childPath = path ? `${path}.${key}` : key;
        matches.push(...this.findFieldPaths(value, searchValue, childPath));
      }
    } else if (typeof node === 'string' || typeof node === 'number') {
      if (String(node).toLowerCase().includes(needle)) {
        matches.push({ path, value: node });
      }
    }

    return matches;
  }

  /**
   * Rota de debug: busca o computador completo pelo ID em GET /Computer/{id},
   * retornando a resposta crua da API sem filtrar nenhum campo, e localiza
   * automaticamente todos os campos que contenham o valor pesquisado (ex.:
   * "Nome alternativo do usuario" exibido na interface do GLPI).
   */
  public async debugGetComputerById(id: number, searchValue: string): Promise<GlpiComputerRawDebugResult> {
    const sessionToken = await this.ensureSession();
    const endpoint = `/Computer/${id}`;

    logger.info('[GLPI DEBUG] Buscando computador completo por ID', { endpoint, id, searchValue });

    try {
      const response = await this.http.get(endpoint, {
        headers: { 'Session-Token': sessionToken },
      });

      const matches = this.findFieldPaths(response.data, searchValue, 'data');

      logger.info(`[GLPI DEBUG] GET /Computer/{id} -> ${matches.length} campo(s) com o valor pesquisado`, {
        endpoint,
        httpStatus: response.status,
        searchValue,
        matches,
      });

      return { id, endpoint, searchValue, matches, data: response.data };
    } catch (error) {
      logger.error('[GLPI DEBUG] Falha ao buscar computador por ID', {
        endpoint,
        ...((this.describeError(error) as object) ?? {}),
      });

      throw AppError.badGateway(`Falha ao buscar o computador ${id} no GLPI`);
    }
  }

  /**
   * Descobre dinamicamente, via listSearchOptions/{itemtype}, os IDs dos
   * campos relevantes do itemtype informado (contact, id, name, serial,
   * otherserial), evitando depender de numeros fixos que podem variar
   * entre instalacoes do GLPI.
   *
   * Assume a convencao padrao do GLPI de que a tabela do itemtype e
   * "glpi_<itemtype em minusculas>s" (ex.: Computer -> glpi_computers,
   * Monitor -> glpi_monitors, Peripheral -> glpi_peripherals).
   */
  private async getAssetFieldIds(sessionToken: string, itemtype: string): Promise<{
    contactFieldId: string;
    idFieldId: string;
    nameFieldId: string;
    serialFieldId: string | null;
    otherserialFieldId: string | null;
  }> {
    const optionsResponse = await this.http.get<Record<string, { table?: string; field?: string }>>(
      `/listSearchOptions/${itemtype}`,
      { headers: { 'Session-Token': sessionToken } },
    );

    const options = optionsResponse.data;
    const table = `glpi_${itemtype.toLowerCase()}s`;

    const findFieldId = (field: string): string | null => {
      for (const [id, option] of Object.entries(options)) {
        if (option && typeof option === 'object' && option.table === table && option.field === field) {
          return id;
        }
      }

      return null;
    };

    const contactFieldId = findFieldId('contact');

    if (!contactFieldId) {
      throw AppError.badGateway(`Nao foi possivel localizar o campo "contact" em listSearchOptions/${itemtype}`);
    }

    return {
      contactFieldId,
      idFieldId: findFieldId('id') ?? '2',
      nameFieldId: findFieldId('name') ?? '1',
      serialFieldId: findFieldId('serial'),
      otherserialFieldId: findFieldId('otherserial'),
    };
  }

  /**
   * Pesquisa itens via search/{itemtype} filtrando pelo campo "contact",
   * retornando os resultados normalizados (id, name, contact, serial,
   * inventoryNumber) junto com a query enviada e a resposta crua.
   */
  private async searchItemsByContact(
    sessionToken: string,
    itemtype: string,
    fieldIds: Awaited<ReturnType<GLPIService['getAssetFieldIds']>>,
    contactValue: string,
    searchtype: 'contains' | 'equals',
  ): Promise<{
    computers: GlpiComputerSummary[];
    totalcount?: number;
    count?: number;
    query: Record<string, string>;
    raw: unknown;
  }> {
    const { contactFieldId, idFieldId, nameFieldId, serialFieldId, otherserialFieldId } = fieldIds;

    const params = new URLSearchParams();
    params.append('criteria[0][field]', contactFieldId);
    params.append('criteria[0][searchtype]', searchtype);
    params.append('criteria[0][value]', contactValue);
    params.append('forcedisplay[0]', idFieldId);
    params.append('forcedisplay[1]', nameFieldId);
    params.append('forcedisplay[2]', contactFieldId);

    if (serialFieldId) {
      params.append('forcedisplay[3]', serialFieldId);
    }

    if (otherserialFieldId) {
      params.append('forcedisplay[4]', otherserialFieldId);
    }

    const query = Object.fromEntries(params.entries());

    const response = await this.http.get<{
      totalcount?: number;
      count?: number;
      data?: Record<string, GlpiSearchRow>[];
    }>(`/search/${itemtype}`, { params, headers: { 'Session-Token': sessionToken } });

    const rows = response.data.data ?? [];

    const computers: GlpiComputerSummary[] = rows.map((row) => ({
      id: Number(row[idFieldId]),
      name: String(row[nameFieldId] ?? ''),
      contact: row[contactFieldId] != null ? String(row[contactFieldId]) : null,
      serial: serialFieldId && row[serialFieldId] != null ? String(row[serialFieldId]) : null,
      inventoryNumber:
        otherserialFieldId && row[otherserialFieldId] != null ? String(row[otherserialFieldId]) : null,
    }));

    return { computers, totalcount: response.data.totalcount, count: response.data.count, query, raw: response.data };
  }

  /**
   * Rota de debug: pesquisa computadores cujo campo "contact"
   * (Nome alternativo do usuario / login do Azure AD) contenha o valor
   * informado, usando search/Computer. O ID do campo "contact" e
   * descoberto dinamicamente via listSearchOptions/Computer.
   */
  public async debugFindComputersByContact(contact: string): Promise<GlpiComputerByContactResult> {
    const sessionToken = await this.ensureSession();

    try {
      const fieldIds = await this.getAssetFieldIds(sessionToken, 'Computer');

      logger.info('[GLPI DEBUG] Buscando computadores por contact', {
        endpoint: '/search/Computer',
        contact,
        fieldIds,
      });

      const result = await this.searchItemsByContact(sessionToken, 'Computer', fieldIds, contact, 'contains');

      logger.info(`[GLPI DEBUG] Busca por contact -> ${result.computers.length} computador(es) encontrado(s)`, {
        endpoint: '/search/Computer',
        totalcount: result.totalcount,
        count: result.count,
      });

      return {
        contact,
        endpoint: '/search/Computer',
        query: result.query,
        contactFieldId: fieldIds.contactFieldId,
        count: result.count ?? result.computers.length,
        totalcount: result.totalcount,
        computers: result.computers,
        raw: result.raw,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('[GLPI DEBUG] Falha ao buscar computadores por contact', this.describeError(error));
      throw AppError.badGateway('Falha ao buscar computadores por "contact" no GLPI');
    }
  }

  /**
   * Remove acentos/diacriticos e caracteres nao alfanumericos de um texto,
   * usado para normalizar nomes antes de gerar candidatos ao valor
   * "Nome alternativo do usuario" (ex.: "Bárbara" -> "Barbara").
   */
  private normalizeNamePart(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  private capitalize(value: string): string {
    if (!value) {
      return value;
    }

    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  }

  /**
   * Rota de debug: a partir de um email corporativo, localiza o usuario no
   * GLPI e testa diferentes transformacoes dos seus dados (firstname,
   * realname, login) para descobrir qual gera exatamente o valor
   * armazenado no campo "contact" dos computadores (ex.:
   * "AnaBarbara@AzureAD"), confirmando se a regra de geracao e
   * deterministica.
   */
  public async validateContactGeneration(email: string): Promise<GlpiValidateContactResult> {
    const sessionToken = await this.ensureSession();

    const userParams = new URLSearchParams();
    userParams.append('criteria[0][field]', String(env.GLPI_SEARCH_FIELD_EMAIL));
    userParams.append('criteria[0][searchtype]', 'contains');
    userParams.append('criteria[0][value]', email);
    userParams.append('forcedisplay[0]', '1');
    userParams.append('forcedisplay[1]', '2');
    userParams.append('forcedisplay[2]', '9');
    userParams.append('forcedisplay[3]', '34');

    logger.info('[GLPI VALIDATE] Buscando usuario por email', {
      endpoint: '/search/User',
      query: Object.fromEntries(userParams.entries()),
    });

    const userResponse = await this.http.get<{ data?: Record<string, GlpiSearchRow>[] }>('/search/User', {
      params: userParams,
      headers: { 'Session-Token': sessionToken },
    });

    const row = userResponse.data.data?.[0];

    let user: GlpiValidateContactResult['user'] = null;
    const strategies: { strategy: string; description: string; base: string | null }[] = [];

    // Estrategias baseadas no email informado, geradas mesmo que o email
    // nao corresponda a um usuario cadastrado no GLPI (o campo "contact"
    // dos computadores e um campo livre, sem vinculo com glpi_users).
    const localPart = email.split('@')[0] ?? '';
    const localParts = localPart.split(/[.\-_]/).filter(Boolean);

    if (localParts.length >= 2) {
      strategies.push({
        strategy: 'email_local_part_capitalized',
        description: 'parte local do email (ex.: "ana.barbara") dividida e capitalizada: "AnaBarbara"',
        base: localParts.map((part) => this.capitalize(this.normalizeNamePart(part))).join(''),
      });

      strategies.push({
        strategy: 'email_local_part_capitalized_reversed',
        description: 'partes da parte local do email capitalizadas e invertidas: "BarbaraAna"',
        base: [...localParts].reverse().map((part) => this.capitalize(this.normalizeNamePart(part))).join(''),
      });
    }

    if (localPart) {
      strategies.push({
        strategy: 'email_local_part_no_separators',
        description: 'parte local do email sem pontos/hifens/underscores, sem alterar capitalizacao',
        base: this.normalizeNamePart(localPart),
      });
    }

    if (!row) {
      logger.warn('[GLPI VALIDATE] Nenhum usuario encontrado no GLPI para o email informado - testando apenas estrategias baseadas no email', {
        email,
      });
    } else {
      const login = String(row['1'] ?? '');
      const id = Number(row['2']);
      const firstname = row['9'] != null ? String(row['9']) : null;
      const realname = row['34'] != null ? String(row['34']) : null;

      user = { id, login, firstname, realname };

      logger.info('[GLPI VALIDATE] Usuario encontrado no GLPI', { email, id, login, firstname, realname });

      if (firstname && realname) {
        strategies.push({
          strategy: 'firstname_realname',
          description: 'firstname + realname do usuario GLPI (sem espacos/acentos), capitalizado',
          base: `${this.capitalize(this.normalizeNamePart(firstname))}${this.capitalize(this.normalizeNamePart(realname))}`,
        });

        strategies.push({
          strategy: 'realname_firstname',
          description: 'realname + firstname do usuario GLPI (sem espacos/acentos), capitalizado',
          base: `${this.capitalize(this.normalizeNamePart(realname))}${this.capitalize(this.normalizeNamePart(firstname))}`,
        });
      }

      const loginParts = login.split(/[.\-_]/).filter(Boolean);

      if (loginParts.length >= 2) {
        strategies.push({
          strategy: 'login_parts_capitalized',
          description: 'login GLPI (ex.: "ana.barbara") dividido em partes e capitalizado: "AnaBarbara"',
          base: loginParts.map((part) => this.capitalize(this.normalizeNamePart(part))).join(''),
        });

        strategies.push({
          strategy: 'login_parts_capitalized_reversed',
          description: 'partes do login GLPI capitalizadas e invertidas: "BarbaraAna"',
          base: [...loginParts].reverse().map((part) => this.capitalize(this.normalizeNamePart(part))).join(''),
        });
      }

      if (login) {
        strategies.push({
          strategy: 'login_no_separators',
          description: 'login GLPI sem pontos/hifens/underscores, sem alterar capitalizacao',
          base: this.normalizeNamePart(login),
        });
      }
    }

    const fieldIds = await this.getAssetFieldIds(sessionToken, 'Computer');
    const candidates: GlpiContactCandidate[] = [];

    for (const { strategy, description, base } of strategies) {
      if (!base) {
        continue;
      }

      const generatedValue = `${base}@AzureAD`;

      logger.info(`[GLPI VALIDATE] Testando estrategia "${strategy}"`, {
        endpoint: '/search/Computer',
        generatedValue,
      });

      const result = await this.searchItemsByContact(sessionToken, 'Computer', fieldIds, generatedValue, 'equals');
      const matchFound = result.computers.length > 0;

      logger.info(
        `[GLPI VALIDATE] Estrategia "${strategy}" -> ${matchFound ? 'CORRESPONDENCIA ENCONTRADA' : 'sem correspondencia'}`,
        { generatedValue, matchFound, count: result.computers.length },
      );

      candidates.push({ strategy, description, generatedValue, matchFound, matchedComputers: result.computers });
    }

    return {
      email,
      user,
      candidates,
    };
  }

  /**
   * Gera o valor do campo "contact" (Nome alternativo do usuario / login do
   * Azure AD, ex.: "AnaBarbara@AzureAD") a partir do email corporativo.
   *
   * Regra deterministica validada com colaboradores reais (rota de debug
   * /api/glpi/debug/validate-contact): a parte local do email e dividida por
   * ".", "-" ou "_", cada parte tem os acentos removidos e e capitalizada, e
   * o resultado e concatenado com o sufixo "@AzureAD".
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
   * Pesquisa um itemtype por contact (campo "Nome alternativo do usuario")
   * e normaliza os resultados para o formato GlpiAsset.
   */
  private async searchAssetsByContact(sessionToken: string, itemtype: string, contact: string): Promise<GlpiAsset[]> {
    const fieldIds = await this.getAssetFieldIds(sessionToken, itemtype);
    const result = await this.searchItemsByContact(sessionToken, itemtype, fieldIds, contact, 'contains');

    return result.computers.map((item) => ({
      id: item.id,
      itemtype,
      name: item.name,
      serial: item.serial,
      inventoryNumber: item.inventoryNumber,
      contact: item.contact,
    }));
  }

  /**
   * Busca os equipamentos atribuidos a um colaborador a partir do seu email
   * corporativo.
   *
   * IMPORTANTE: neste GLPI a associacao real entre ativos e colaboradores
   * NAO e feita pela tabela glpi_users / campo users_id. Ela e feita pelo
   * campo livre "contact" ("Nome alternativo do usuario", field ID 7),
   * presente em Computer, Monitor, Peripheral, Phone e Printer, preenchido
   * pela sincronizacao com o Azure AD no formato "NomeSobrenome@AzureAD".
   * Por isso o valor de "contact" e gerado deterministicamente a partir do
   * email (generateContactFromEmail) e usado diretamente em
   * /search/{itemtype} (campo "contact", searchtype=contains), para cada
   * itemtype, em paralelo.
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
      const itemtype = itemtypes[index];

      if (result.status === 'fulfilled') {
        assets.push(...result.value);
      } else {
        logger.warn(`Falha ao buscar ativos do tipo ${itemtype} por contact`, this.describeError(result.reason));
      }
    });

    logger.info(
      `[GLPI CONTACT SEARCH]\nEmail: ${email}\nContact gerado: ${contact}\nEquipamentos encontrados: ${assets.length}`,
    );

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
