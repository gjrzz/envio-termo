import axios, { type AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { MondayColumn, MondayDebugResult, MondaySampleResult } from '../types/monday';
import type { Employee } from '../types/employee';

const MONDAY_API_URL = 'https://api.monday.com/v2';

/**
 * IDs das colunas da board "Consolidado - Contratacoes" mapeadas para os
 * dados do colaborador usados no Termo de Responsabilidade.
 */
const COLUMN_CPF = 'texto84';
const COLUMN_EMAIL_PESSOAL = 'texto5';
const COLUMN_EMAIL_CORPORATIVO = 'text_mkwppmb0';
const COLUMN_TELEFONE =
  'qual_o_telefone_de_contato_do_profissional__apenas_n_mero_considerando_ddd_telefone';

const EMPLOYEE_COLUMN_IDS = [
  COLUMN_CPF,
  COLUMN_EMAIL_PESSOAL,
  COLUMN_EMAIL_CORPORATIVO,
  COLUMN_TELEFONE,
];

/**
 * Tamanho de pagina usado ao percorrer os itens da board em busca de um
 * colaborador pelo email.
 */
const ITEMS_PAGE_SIZE = 100;

/**
 * Numero maximo de paginas percorridas ao buscar um colaborador pelo email,
 * para evitar loops descontrolados em boards muito grandes.
 */
const MAX_ITEMS_PAGES = 20;

interface MondayGraphQLError {
  message: string;
}

interface MondayGraphQLResponse<T> {
  data?: T;
  errors?: MondayGraphQLError[];
}

interface MondayBoardColumnsData {
  boards: Array<{
    id: string;
    name: string;
    columns: MondayColumn[];
  }>;
}

interface MondayItemColumnValueRaw {
  id: string;
  text: string | null;
}

interface MondayItemsPageItem {
  id: string;
  name: string;
  column_values: MondayItemColumnValueRaw[];
}

interface MondayItemsPage {
  cursor: string | null;
  items: MondayItemsPageItem[];
}

interface MondayFirstPageData {
  boards: Array<{
    items_page: MondayItemsPage;
  }>;
}

interface MondayNextPageData {
  next_items_page: MondayItemsPage;
}

interface MondaySampleData {
  boards: Array<{
    id: string;
    name: string;
    columns: MondayColumn[];
    items_page: {
      items: Array<{
        id: string;
        name: string;
        column_values: Array<{
          id: string;
          text: string | null;
          value: string | null;
          type: string;
        }>;
      }>;
    };
  }>;
}

/**
 * Servico de integracao com a API GraphQL (v2) do Monday.com.
 *
 * Responsavel por consultar a board configurada via MONDAY_BOARD_ID,
 * autenticando com MONDAY_API_TOKEN.
 */
export class MondayService {
  private readonly http: AxiosInstance;

  constructor() {
    this.http = axios.create({
      baseURL: MONDAY_API_URL,
      timeout: 15_000,
      headers: {
        Authorization: env.MONDAY_API_TOKEN,
        'Content-Type': 'application/json',
        'API-Version': '2024-01',
      },
    });
  }

  /**
   * Executa uma query/mutation GraphQL na API do Monday.com.
   */
  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    try {
      const response = await this.http.post<MondayGraphQLResponse<T>>('', {
        query,
        variables,
      });

      if (response.data.errors && response.data.errors.length > 0) {
        logger.error('Monday.com retornou erros na resposta GraphQL', {
          errors: response.data.errors,
        });
        throw AppError.badGateway('A API do Monday.com retornou um erro', {
          errors: response.data.errors,
        });
      }

      if (!response.data.data) {
        throw AppError.badGateway('A API do Monday.com retornou uma resposta vazia');
      }

      return response.data.data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error('Falha ao comunicar com a API do Monday.com', this.describeError(error));
      throw AppError.badGateway('Nao foi possivel comunicar com a API do Monday.com');
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
   * Consulta a board configurada (MONDAY_BOARD_ID) e retorna seu id, nome
   * e a lista completa de colunas.
   */
  async getBoardDebugInfo(): Promise<MondayDebugResult> {
    const query = `
      query ($boardId: [ID!]) {
        boards(ids: $boardId) {
          id
          name
          columns {
            id
            title
            type
          }
        }
      }
    `;

    const data = await this.query<MondayBoardColumnsData>(query, {
      boardId: [env.MONDAY_BOARD_ID],
    });

    const board = data.boards[0];

    if (!board) {
      throw AppError.notFound(`Board ${env.MONDAY_BOARD_ID} nao encontrada no Monday.com`);
    }

    return {
      board: { id: board.id, name: board.name },
      columns: board.columns,
    };
  }

  /**
   * Consulta os primeiros itens da board configurada (MONDAY_BOARD_ID),
   * retornando todos os campos (column_values) disponiveis em cada item.
   */
  async getSampleItems(limit = 5): Promise<MondaySampleResult> {
    const query = `
      query ($boardId: [ID!], $limit: Int!) {
        boards(ids: $boardId) {
          id
          name
          columns {
            id
            title
            type
          }
          items_page(limit: $limit) {
            items {
              id
              name
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `;

    const data = await this.query<MondaySampleData>(query, {
      boardId: [env.MONDAY_BOARD_ID],
      limit,
    });

    const board = data.boards[0];

    if (!board) {
      throw AppError.notFound(`Board ${env.MONDAY_BOARD_ID} nao encontrada no Monday.com`);
    }

    const columnTitles = new Map(board.columns.map((column) => [column.id, column]));

    return {
      board: { id: board.id, name: board.name },
      items: board.items_page.items.map((item) => ({
        id: item.id,
        name: item.name,
        columnValues: item.column_values.map((columnValue) => ({
          id: columnValue.id,
          title: columnTitles.get(columnValue.id)?.title ?? columnValue.id,
          type: columnValue.type,
          text: columnValue.text,
          value: columnValue.value,
        })),
      })),
    };
  }

  /**
   * Busca, na board configurada (MONDAY_BOARD_ID), o item cujo email
   * corporativo corresponda ao email informado.
   *
   * O email corporativo e obtido da coluna "Sugestao de E-mail"
   * (text_mkwppmb0) quando preenchida, ou da coluna "Qual o e-mail de
   * contato do profissional?" (texto5) como alternativa.
   */
  async getEmployeeByEmail(email: string): Promise<Employee> {
    const normalizedEmail = email.trim().toLowerCase();

    logger.debug('Buscando colaborador no Monday.com', { email: normalizedEmail });

    let cursor: string | null = null;
    let page = 0;

    do {
      const items = await this.fetchItemsPage(cursor);
      page += 1;

      logger.debug('Pagina de itens do Monday.com carregada', {
        page,
        items: items.items.length,
      });

      for (const item of items.items) {
        const columnValues = new Map(item.column_values.map((column) => [column.id, column.text]));

        const corporateEmail = columnValues.get(COLUMN_EMAIL_CORPORATIVO);
        const personalEmail = columnValues.get(COLUMN_EMAIL_PESSOAL);
        const employeeEmail = corporateEmail?.trim() ? corporateEmail : personalEmail;

        if (employeeEmail?.trim().toLowerCase() === normalizedEmail) {
          logger.info('Colaborador encontrado no Monday.com', {
            itemId: item.id,
            email: normalizedEmail,
          });

          return {
            fullName: item.name,
            cpf: columnValues.get(COLUMN_CPF) ?? null,
            corporateEmail: corporateEmail ?? null,
            personalEmail: personalEmail ?? null,
            phone: columnValues.get(COLUMN_TELEFONE) ?? null,
            birthDate: null,
            company: null,
            location: null,
            username: null,
          };
        }
      }

      cursor = items.cursor;
    } while (cursor && page < MAX_ITEMS_PAGES);

    logger.warn('Colaborador nao encontrado no Monday.com', {
      email: normalizedEmail,
      pagesChecked: page,
    });

    throw AppError.notFound(`Nenhum colaborador encontrado no Monday.com para o email ${email}`);
  }

  /**
   * Busca uma pagina de itens da board configurada (MONDAY_BOARD_ID),
   * trazendo apenas o nome do item e as colunas mapeadas para os dados do
   * colaborador. Quando `cursor` e informado, busca a proxima pagina
   * usando `next_items_page`.
   */
  private async fetchItemsPage(cursor: string | null): Promise<MondayItemsPage> {
    if (!cursor) {
      const query = `
        query ($boardId: [ID!], $limit: Int!, $columnIds: [String!]) {
          boards(ids: $boardId) {
            items_page(limit: $limit) {
              cursor
              items {
                id
                name
                column_values(ids: $columnIds) {
                  id
                  text
                }
              }
            }
          }
        }
      `;

      const data = await this.query<MondayFirstPageData>(query, {
        boardId: [env.MONDAY_BOARD_ID],
        limit: ITEMS_PAGE_SIZE,
        columnIds: EMPLOYEE_COLUMN_IDS,
      });

      const board = data.boards[0];

      if (!board) {
        throw AppError.notFound(`Board ${env.MONDAY_BOARD_ID} nao encontrada no Monday.com`);
      }

      return board.items_page;
    }

    const query = `
      query ($cursor: String!, $limit: Int!, $columnIds: [String!]) {
        next_items_page(limit: $limit, cursor: $cursor) {
          cursor
          items {
            id
            name
            column_values(ids: $columnIds) {
              id
              text
            }
          }
        }
      }
    `;

    const data = await this.query<MondayNextPageData>(query, {
      cursor,
      limit: ITEMS_PAGE_SIZE,
      columnIds: EMPLOYEE_COLUMN_IDS,
    });

    return data.next_items_page;
  }
}

export const mondayService = new MondayService();
