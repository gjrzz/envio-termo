import { useMutation } from '@tanstack/react-query';
import { generateTerm } from '../services/api';

/**
 * Gera o DOCX do Termo de Responsabilidade e salva localmente.
 */
export function useGenerateTerm() {
  return useMutation({
    mutationFn: generateTerm,
  });
}
