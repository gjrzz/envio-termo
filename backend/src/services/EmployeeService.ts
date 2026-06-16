import path from 'path';
import * as XLSX from 'xlsx';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Dados do colaborador retornados pelo EmployeeService.
 */
export interface EmployeeData {
  fullName: string;
  cpf: string;
  birthDate: string;
  corporateEmail: string;
  personalEmail: string;
  phone: string;
}

/**
 * Aba da planilha de colaboradores que contem os dados atualizados.
 */
const SHEET_NAME = 'Base-15062026';

/**
 * Servico de busca de colaboradores baseado em planilha Excel.
 *
 * A planilha e lida uma unica vez na inicializacao e mantida em memoria.
 * A busca e feita pelo email corporativo.
 */
export class EmployeeService {
  private readonly employees: EmployeeData[];

  constructor() {
    this.employees = this.loadEmployees();

    logger.info(
      `[EMPLOYEE SERVICE] Planilha carregada | Colaboradores: ${this.employees.length}`,
    );
  }

  /**
   * Busca um colaborador pelo email corporativo.
   */
  public getEmployeeByEmail(email: string): EmployeeData {
    const normalizedEmail = email.trim().toLowerCase();

    const employee = this.employees.find(
      (item) => item.corporateEmail.trim().toLowerCase() === normalizedEmail,
    );

    logger.info(
      `[EMPLOYEE SEARCH] Email: ${email} | Encontrado: ${Boolean(employee)}`,
    );

    if (!employee) {
      throw AppError.notFound(
        `Nenhum colaborador encontrado na planilha para o email ${email}`,
      );
    }

    return employee;
  }

  private loadEmployees(): EmployeeData[] {
    const filePath = path.resolve(process.cwd(), env.EMPLOYEE_EXCEL_PATH);

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.readFile(filePath, { cellDates: true });
    } catch (error) {
      logger.error('[EMPLOYEE SERVICE] Falha ao ler a planilha de colaboradores', {
        filePath,
        error,
      });
      throw AppError.badGateway(
        `Nao foi possivel ler o arquivo de colaboradores: ${filePath}`,
      );
    }

    const sheetName = workbook.SheetNames.includes(SHEET_NAME)
      ? SHEET_NAME
      : workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw AppError.badGateway(
        `A planilha de colaboradores nao possui nenhuma aba: ${filePath}`,
      );
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    return rows
      .map((row) => this.mapRow(row))
      .filter((employee): employee is EmployeeData => employee !== null);
  }

  /**
   * Converte uma linha da planilha para o formato EmployeeData.
   * Colunas esperadas: name, cpf, email_func, email_pessoal, telefone,
   * aniversario.
   */
  private mapRow(row: Record<string, unknown>): EmployeeData | null {
    const fullName = this.cellToString(row.name);

    if (!fullName) {
      return null;
    }

    const corporateEmail = this.cellToString(row.email_func);

    if (!corporateEmail) {
      return null;
    }

    return {
      fullName,
      cpf: this.cellToString(row.cpf) ?? '',
      birthDate: this.cellToString(row.aniversario) ?? '',
      corporateEmail,
      personalEmail: this.cellToString(row.email_pessoal) ?? '',
      phone: this.cellToString(row.telefone) ?? '',
    };
  }

  private cellToString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    const text = String(value).trim();

    return text || null;
  }
}

export const employeeService = new EmployeeService();
