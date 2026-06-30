import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { env } from './env';
import { logger } from '../utils/logger';

const databasePath = path.resolve(process.cwd(), env.DATABASE_PATH);
const databaseDir = path.dirname(databasePath);

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

export const db = new DatabaseSync(databasePath);

db.exec('PRAGMA journal_mode = WAL');

function migrate(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS termos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      equipamentos TEXT NOT NULL,
      envelopeId TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      avatar TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Adicionar coluna avatar se a tabela ja existia sem ela
  try {
    db.exec('ALTER TABLE users ADD COLUMN avatar TEXT');
  } catch {
    // Coluna ja existe — ignorar
  }
}

migrate();

logger.info(`Banco de dados SQLite inicializado em ${databasePath}`);
