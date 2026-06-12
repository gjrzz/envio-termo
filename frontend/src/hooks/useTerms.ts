import { useQuery } from '@tanstack/react-query';
import { listTerms } from '../services/api';

/**
 * Lista o historico de termos enviados, usado na tela de Historico.
 */
export function useTerms() {
  return useQuery({
    queryKey: ['terms'],
    queryFn: listTerms,
  });
}
