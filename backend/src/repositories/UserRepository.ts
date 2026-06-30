import { db } from '../config/database';
import type { UserRecord } from '../types/user';

/**
 * Camada de acesso a dados da tabela `users` (SQLite).
 */
export class UserRepository {
  public create(name: string, email: string, hashedPassword: string): UserRecord {
    const statement = db.prepare(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    );

    const result = statement.run(name, email, hashedPassword);
    const created = this.findById(Number(result.lastInsertRowid));

    if (!created) {
      throw new Error('Falha ao recuperar o usuario recem-criado');
    }

    return created;
  }

  public findAll(): UserRecord[] {
    return db.prepare('SELECT * FROM users ORDER BY name ASC').all() as unknown as UserRecord[];
  }

  public findById(id: number): UserRecord | null {
    return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as UserRecord) ?? null;
  }

  public findByEmail(email: string): UserRecord | null {
    return (db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as UserRecord) ?? null;
  }

  public update(id: number, name: string, email: string): void {
    db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, id);
  }

  public updatePassword(id: number, hashedPassword: string): void {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
  }

  public updateAvatar(id: number, avatar: string | null): void {
    db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, id);
  }

  public delete(id: number): void {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  public count(): number {
    const row = db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number };
    return row.total;
  }
}

export const userRepository = new UserRepository();
