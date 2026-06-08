import { getDb } from '../db/database';

export interface IndexedFile {
  path: string;
  language: string | null;
  imports: string[];
  exports: string[];
  size: number;
  lastModified: number;
}

export class IndexStore {
  upsertFile(file: IndexedFile): void {
    const db = getDb();
    db.prepare(
      `INSERT INTO files (path, language, imports, exports, size, last_modified, indexed_at)
       VALUES (?, ?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(path) DO UPDATE SET
         language=excluded.language,
         imports=excluded.imports,
         exports=excluded.exports,
         size=excluded.size,
         last_modified=excluded.last_modified,
         indexed_at=unixepoch()`
    ).run(
      file.path,
      file.language,
      JSON.stringify(file.imports),
      JSON.stringify(file.exports),
      file.size,
      file.lastModified,
    );
  }

  removeFile(filePath: string): void {
    getDb().prepare('DELETE FROM files WHERE path=?').run(filePath);
  }

  getAllFiles(): IndexedFile[] {
    const rows = getDb()
      .prepare('SELECT * FROM files ORDER BY path')
      .all() as {
        path: string;
        language: string | null;
        imports: string;
        exports: string;
        size: number;
        last_modified: number;
      }[];

    return rows.map((r) => ({
      path: r.path,
      language: r.language,
      imports: JSON.parse(r.imports) as string[],
      exports: JSON.parse(r.exports) as string[],
      size: r.size,
      lastModified: r.last_modified,
    }));
  }

  searchFiles(query: string): IndexedFile[] {
    const rows = getDb()
      .prepare(`SELECT * FROM files WHERE path LIKE ? LIMIT 50`)
      .all(`%${query}%`) as {
        path: string;
        language: string | null;
        imports: string;
        exports: string;
        size: number;
        last_modified: number;
      }[];

    return rows.map((r) => ({
      path: r.path,
      language: r.language,
      imports: JSON.parse(r.imports) as string[],
      exports: JSON.parse(r.exports) as string[],
      size: r.size,
      lastModified: r.last_modified,
    }));
  }

  clear(): void {
    getDb().prepare('DELETE FROM files').run();
  }

  count(): number {
    const row = getDb().prepare('SELECT COUNT(*) as c FROM files').get() as { c: number };
    return row.c;
  }
}
