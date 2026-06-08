// node:sqlite is built-in to Node.js 24+
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as typeof import('node:sqlite');
import path from 'path';
import { config } from '../config';

export type Db = InstanceType<typeof DatabaseSync>;

let db: Db;

export function getDb(): Db {
  if (!db) {
    const dbPath = path.isAbsolute(config.dbPath)
      ? config.dbPath
      : path.join(process.cwd(), config.dbPath);

    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      path        TEXT NOT NULL UNIQUE,
      language    TEXT,
      imports     TEXT DEFAULT '[]',
      exports     TEXT DEFAULT '[]',
      size        INTEGER,
      last_modified INTEGER,
      indexed_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS memory (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id          TEXT PRIMARY KEY,
      prompt      TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'running',
      tool_calls  TEXT DEFAULT '[]',
      result      TEXT,
      error       TEXT,
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      finished_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id          TEXT PRIMARY KEY,
      task_id     TEXT NOT NULL,
      type        TEXT NOT NULL,
      payload     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
      resolved_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_approvals_task ON approvals(task_id);
  `);
}
