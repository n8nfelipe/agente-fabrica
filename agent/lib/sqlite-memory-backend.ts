import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import {
  MemoryDocumentConflictError,
  type MemoryDocumentBackend,
} from "eve/memory/file";

type MemoryRow = { content: string; version: number };

let database: DatabaseSync | undefined;

function getDatabase() {
  if (!database) {
    const directory = join(process.cwd(), ".eve");
    mkdirSync(directory, { recursive: true });
    database = new DatabaseSync(join(directory, "memory.sqlite"), { timeout: 5_000 });
    database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS memory_documents (
        key TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        version INTEGER NOT NULL
      );
    `);
  }

  return database;
}

export function sqliteMemoryBackend(): MemoryDocumentBackend {
  return {
    async read({ key, signal }) {
      signal.throwIfAborted();
      const row = getDatabase()
        .prepare("SELECT content, version FROM memory_documents WHERE key = ?")
        .get(key) as MemoryRow | undefined;

      return row ? { content: row.content, version: String(row.version) } : null;
    },
    async write({ key, content, expectedVersion, signal }) {
      signal.throwIfAborted();
      const db = getDatabase();
      db.exec("BEGIN IMMEDIATE");

      try {
        const current = db
          .prepare("SELECT version FROM memory_documents WHERE key = ?")
          .get(key) as Pick<MemoryRow, "version"> | undefined;

        if ((current ? String(current.version) : null) !== expectedVersion) {
          throw new MemoryDocumentConflictError(key);
        }

        const version = (current?.version ?? 0) + 1;
        db.prepare(`
          INSERT INTO memory_documents (key, content, version) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET content = excluded.content, version = excluded.version
        `).run(key, content, version);
        db.exec("COMMIT");

        return { content, version: String(version) };
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };
}
