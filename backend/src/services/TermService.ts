import { termRepository } from '../repositories/TermRepository';
import { AppError } from '../utils/AppError';
import type { TermRecord } from '../types/term';

/**
 * Camada de regras de negocio para consulta de Termos de Responsabilidade.
 *
 * Nota: o envio via DocuSign sera reimplementado em uma etapa futura.
 * Por ora este servico apenas gerencia o historico de termos no banco.
 */
export class TermService {
  /**
   * Retorna o historico completo de termos enviados.
   */
  public listTerms(): TermRecord[] {
    return termRepository.findAll();
  }

  /**
   * Retorna os detalhes de um termo pelo ID.
   */
  public getTermById(id: number): TermRecord {
    const term = termRepository.findById(id);

    if (!term) {
      throw AppError.notFound(`Termo com id ${id} nao encontrado`);
    }

    return term;
  }
}

export const termService = new TermService();
