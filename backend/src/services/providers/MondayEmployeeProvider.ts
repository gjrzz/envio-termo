import { mondayService } from '../MondayService';
import { logger } from '../../utils/logger';
import type { Employee, EmployeeProvider } from '../../types/employee';

/**
 * Origem de dados de colaboradores baseada na board do Monday.com
 * (ver MondayService).
 */
export class MondayEmployeeProvider implements EmployeeProvider {
  async getEmployeeByEmail(email: string): Promise<Employee> {
    try {
      const employee = await mondayService.getEmployeeByEmail(email);

      logger.info(
        `[EMPLOYEE PROVIDER]\nProvider: monday\nEmail pesquisado: ${email}\nEncontrado: true`,
      );

      return employee;
    } catch (error) {
      logger.info(
        `[EMPLOYEE PROVIDER]\nProvider: monday\nEmail pesquisado: ${email}\nEncontrado: false`,
      );

      throw error;
    }
  }
}

export const mondayEmployeeProvider = new MondayEmployeeProvider();
