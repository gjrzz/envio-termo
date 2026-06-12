import { db } from '../config/database';
import type { EquipmentItem, TermRecord, TermRow } from '../types/term';

interface CreateTermData {
  nome: string;
  email: string;
  equipamentos: EquipmentItem[];
  envelopeId: string | null;
  status: string;
}

/**
 * Camada de acesso a dados da tabela `termos` (SQLite).
 */
export class TermRepository {
  private mapRow(row: TermRow): TermRecord {
    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      equipamentos: JSON.parse(row.equipamentos) as EquipmentItem[],
      envelopeId: row.envelopeId,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  /**
   * Insere um novo termo e retorna o registro criado.
   */
  public create(data: CreateTermData): TermRecord {
    const statement = db.prepare(
      `INSERT INTO termos (nome, email, equipamentos, envelopeId, status)
       VALUES (?, ?, ?, ?, ?)`,
    );

    const result = statement.run(
      data.nome,
      data.email,
      JSON.stringify(data.equipamentos),
      data.envelopeId,
      data.status,
    );

    const created = this.findById(Number(result.lastInsertRowid));

    if (!created) {
      throw new Error('Falha ao recuperar o termo recem-criado');
    }

    return created;
  }

  /**
   * Retorna todos os termos ordenados do mais recente para o mais antigo.
   */
  public findAll(): TermRecord[] {
    const rows = db
      .prepare('SELECT * FROM termos ORDER BY createdAt DESC, id DESC')
      .all() as unknown as TermRow[];

    return rows.map((row) => this.mapRow(row));
  }

  /**
   * Busca um termo pelo seu identificador.
   */
  public findById(id: number): TermRecord | null {
    const row = db.prepare('SELECT * FROM termos WHERE id = ?').get(id) as
      | TermRow
      | undefined;

    return row ? this.mapRow(row) : null;
  }

  /**
   * Atualiza o status (e opcionalmente o envelopeId) de um termo existente.
   */
  public updateStatus(id: number, status: string, envelopeId?: string | null): void {
    if (envelopeId !== undefined) {
      db.prepare('UPDATE termos SET status = ?, envelopeId = ? WHERE id = ?').run(
        status,
        envelopeId,
        id,
      );
      return;
    }

    db.prepare('UPDATE termos SET status = ? WHERE id = ?').run(status, id);
  }
}

export const termRepository = new TermRepository();
