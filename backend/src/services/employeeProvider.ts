import { env } from '../config/env';
import type { EmployeeProvider } from '../types/employee';
import { mondayEmployeeProvider } from './providers/MondayEmployeeProvider';
import { ExcelEmployeeProvider } from './providers/ExcelEmployeeProvider';

/**
 * Origem de dados de colaboradores selecionada via EMPLOYEE_PROVIDER
 * (monday | excel), usada pelo controller sem que ele precise saber qual
 * implementacao esta ativa.
 *
 * Quando EMPLOYEE_PROVIDER=excel, a planilha e lida uma unica vez aqui (na
 * inicializacao do backend) e mantida em memoria pelo ExcelEmployeeProvider.
 */
export const employeeProvider: EmployeeProvider =
  env.EMPLOYEE_PROVIDER === 'excel' ? new ExcelEmployeeProvider() : mondayEmployeeProvider;
