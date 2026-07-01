import axios, { type AxiosInstance, AxiosError } from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
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

const ITEMS_PAGE_SIZE = 100;
const MAX_ITEMS_PAGES = 20;

interface MondayGraphQLError {
  message: string;
}

interface MondayGraphQLResponse<T> {
  data?: T;
  errors?: MondayGraphQLError[];
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
   * Busca, na board configurada (MONDAY_BOARD_ID), o item cujo email
   * corporativo corresponda ao email informado.
   */
  async getEmployeeByEmail(email: string): Promise<Employee> {
    const normalizedEmail = email.trim().toLowerCase();

    logger.debug('Buscando colaborador no Monday.com', { email: normalizedEmail });

    let cursor: string | null = null;
    let page = 0;

    do {
      const items = await this.fetchItemsPage(cursor);
      page += 1;

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

    throw AppError.notFound(`Nenhum colaborador encontrado no Monday.com para o email ${email}`);
  }

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
