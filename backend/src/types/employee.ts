/**
 * Dados do colaborador usados para preencher o Termo de Responsabilidade,
 * independente da origem (Monday.com, planilha Excel, etc.).
 */
export interface Employee {
  fullName: string;
  cpf: string | null;
  corporateEmail: string | null;
  personalEmail: string | null;
  phone: string | null;
  birthDate: string | null;
  company: string | null;
  location: string | null;
  username: string | null;
}

/**
 * Contrato implementado por cada origem de dados de colaboradores
 * (Monday.com, planilha Excel, etc.), permitindo alternar a fonte via
 * variavel de ambiente sem alterar os consumidores (controller/frontend).
 */
export interface EmployeeProvider {
  getEmployeeByEmail(email: string): Promise<Employee>;
}
