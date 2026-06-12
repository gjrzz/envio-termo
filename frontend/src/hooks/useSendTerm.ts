import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendTerm } from '../services/api';

/**
 * Envia o termo de responsabilidade para assinatura via DocuSign e invalida
 * o cache do historico apos a conclusao.
 */
export function useSendTerm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendTerm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
  });
}
