import path from 'path';
import * as XLSX from 'xlsx';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';
import type { Employee, EmployeeProvider } from '../../types/employee';

/**
 * Aba da planilha de colaboradores que contem os dados atualizados.
 */
const SHEET_NAME = 'Base-15062026';

/**
 * Origem de dados de colaboradores baseada em uma planilha Excel local
 * (backend/data/colaboradores.xlsx, configuravel via EMPLOYEE_EXCEL_PATH).
 *
 * A planilha e lida uma unica vez na inicializacao do backend e mantida em
 * memoria para evitar releitura em disco a cada requisicao.
 */
export class ExcelEmployeeProvider implements EmployeeProvider {
  private readonly employees: Employee[];

  constructor() {
    this.employees = this.loadEmployees();

    logger.info(
      `[EXCEL PROVIDER]\nPlanilha carregada\nQuantidade de colaboradores: ${this.employees.length}`,
    );
  }

  async getEmployeeByEmail(email: string): Promise<Employee> {
    const normalizedEmail = email.trim().toLowerCase();

    let employee = this.employees.find(
      (item) => item.corporateEmail?.trim().toLowerCase() === normalizedEmail,
    );

    if (!employee) {
      employee = this.employees.find(
        (item) => item.personalEmail?.trim().toLowerCase() === normalizedEmail,
      );
    }

    logger.info(
      `[EXCEL SEARCH]\nEmail pesquisado: ${email}\nEncontrado: ${Boolean(employee)}`,
    );

    if (!employee) {
      throw AppError.notFound(`Nenhum colaborador encontrado na planilha para o email ${email}`);
    }

    return employee;
  }

  private loadEmployees(): Employee[] {
    const filePath = path.resolve(process.cwd(), env.EMPLOYEE_EXCEL_PATH);

    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.readFile(filePath, { cellDates: true });
    } catch (error) {
      logger.error('Falha ao ler a planilha de colaboradores', { filePath, error });
      throw AppError.badGateway(`Nao foi possivel ler o arquivo de colaboradores: ${filePath}`);
    }

    const sheetName = workbook.SheetNames.includes(SHEET_NAME)
      ? SHEET_NAME
      : workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      throw AppError.badGateway(`A planilha de colaboradores nao possui nenhuma aba: ${filePath}`);
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    return rows
      .map((row) => this.mapRow(row))
      .filter((employee): employee is Employee => employee !== null);
  }

  /**
   * Converte uma linha da planilha (chaves = cabecalhos: name, cpf,
   * email_func, email_pessoal, telefone, aniversario, empresa, praca,
   * username) para o formato Employee.
   */
  private mapRow(row: Record<string, unknown>): Employee | null {
    const fullName = this.cellToString(row.name);

    if (!fullName) {
      return null;
    }

    return {
      fullName,
      cpf: this.cellToString(row.cpf),
      corporateEmail: this.cellToString(row.email_func),
      personalEmail: this.cellToString(row.email_pessoal),
      phone: this.cellToString(row.telefone),
      birthDate: this.cellToString(row.aniversario),
      company: this.cellToString(row.empresa),
      location: this.cellToString(row.praca),
      username: this.cellToString(row.username),
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
