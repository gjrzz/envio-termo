import { docuSignService } from './DocuSignService';
import { termRepository } from '../repositories/TermRepository';
import { AppError } from '../utils/AppError';
import type { SendTermInput, TermRecord } from '../types/term';

/** Status de envelope considerados finais, que nao precisam ser revalidados. */
const TERMINAL_STATUSES = new Set(['completed', 'declined', 'voided']);

/**
 * Camada de regras de negocio para criacao e consulta de Termos de
 * Responsabilidade, orquestrando o repositorio e o servico DocuSign.
 */
export class TermService {
  /**
   * Formata a data atual no padrao dd/mm/aaaa para uso no documento.
   */
  private formatCurrentDate(): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date());
  }

  /**
   * Cria o envelope no DocuSign para os equipamentos selecionados e persiste
   * o registro do termo no banco de dados.
   */
  public async sendTerm(input: SendTermInput): Promise<TermRecord> {
    const issueDate = this.formatCurrentDate();

    const envelope = await docuSignService.createEnvelope({
      nome: input.nome,
      email: input.email,
      data: issueDate,
      equipamentos: input.equipamentos,
    });

    return termRepository.create({
      nome: input.nome,
      email: input.email,
      equipamentos: input.equipamentos,
      envelopeId: envelope.envelopeId,
      status: envelope.status,
    });
  }

  /**
   * Retorna o historico completo de termos enviados.
   */
  public listTerms(): TermRecord[] {
    return termRepository.findAll();
  }

  /**
   * Retorna os detalhes de um termo, atualizando o status junto ao DocuSign
   * caso o envelope ainda nao tenha um status final.
   */
  public async getTermById(id: number): Promise<TermRecord> {
    const term = termRepository.findById(id);

    if (!term) {
      throw AppError.notFound(`Termo com id ${id} nao encontrado`);
    }

    if (term.envelopeId && !TERMINAL_STATUSES.has(term.status)) {
      const envelopeStatus = await docuSignService.getEnvelopeStatus(term.envelopeId);

      if (envelopeStatus.status !== term.status) {
        termRepository.updateStatus(term.id, envelopeStatus.status);
        return { ...term, status: envelopeStatus.status };
      }
    }

    return term;
  }
}

export const termService = new TermService();
