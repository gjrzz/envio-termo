import { useQuery } from '@tanstack/react-query';
import { getAssignedAssets } from '../services/api';

/**
 * Busca o colaborador e os equipamentos atribuidos a ele no GLPI.
 * A consulta so e executada quando um email valido e informado.
 */
export function useAssignedAssets(email: string | null) {
  return useQuery({
    queryKey: ['assigned-assets', email],
    queryFn: () => getAssignedAssets(email as string),
    enabled: Boolean(email),
    retry: false,
  });
}
