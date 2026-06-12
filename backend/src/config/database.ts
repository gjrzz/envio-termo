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
}

migrate();

logger.info(`Banco de dados SQLite inicializado em ${databasePath}`);
