import { useQuery } from '@tanstack/react-query';
import { getMondayEmployee } from '../services/api';

/**
 * Busca os dados do colaborador (nome, CPF, email e telefone) no
 * Monday.com. A consulta so e executada quando um email valido e informado.
 */
export function useMondayEmployee(email: string | null) {
  return useQuery({
    queryKey: ['monday-employee', email],
    queryFn: () => getMondayEmployee(email as string),
    enabled: Boolean(email),
    retry: false,
  });
}
