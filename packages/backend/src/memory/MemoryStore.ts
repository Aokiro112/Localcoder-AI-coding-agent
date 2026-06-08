import { getDb } from '../db/database';

const MEMORY_KEYS = [
  'projectName',
  'framework',
  'language',
  'codingConventions',
  'userPreferences',
  'description',
  'testCommand',
  'buildCommand',
  'devCommand',
] as const;

export type MemoryKey = typeof MEMORY_KEYS[number] | string;

export class MemoryStore {
  set(key: MemoryKey, value: string): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO memory (key, value, updated_at) VALUES (?, ?, unixepoch())
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=unixepoch()`
    ).run(key, value);
  }

  get(key: MemoryKey): string | null {
    const db = getDb();
    const row = db.prepare('SELECT value FROM memory WHERE key=?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  }

  getAll(): Record<string, string> {
    const db = getDb();
    const rows = db.prepare('SELECT key, value FROM memory').all() as {
      key: string;
      value: string;
    }[];
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  delete(key: MemoryKey): void {
    const db = getDb();
    db.prepare('DELETE FROM memory WHERE key=?').run(key);
  }

  buildContextString(): string {
    const all = this.getAll();
    if (Object.keys(all).length === 0) return '';

    const lines = ['## Project Memory'];
    for (const [key, value] of Object.entries(all)) {
      lines.push(`- **${key}**: ${value}`);
    }
    return lines.join('\n');
  }
}
