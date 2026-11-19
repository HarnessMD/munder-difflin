/**
 * Codex's own memories into the agent's codex-memory.md, for the mine pass. What is copied and why:
 * shared/codexMemory.ts.
 *
 * READ ONLY. Codex's database is never opened where it lies. It is in write ahead log mode, and SQLite cannot
 * open such a file read only unless its shared memory file is already there (`unable to open database file` on an
 * agent that is not running), while opening it for writing would make the files Codex owns. So the database and
 * its log are copied, byte for byte, into a private temp folder, the copy is read, and the folder is removed. A
 * copy taken while Codex writes can come out torn: then the read fails, the file already written stays as it was,
 * and the next pass tries again.
 *
 * The SQLite library is passed in. The app passes better-sqlite3, which is built for Electron's Node; the tests
 * pass Node's own node:sqlite. No electron import.
 */
import { copyFileSync, lstatSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CODEX_MEMORY_DB, CODEX_MEMORY_FILE, CODEX_MEMORY_MAX_ROWS, codexMemoryMarkdown, type CodexMemoryRow
} from '../shared/codexMemory';

/** What the reader needs of a SQLite connection: better-sqlite3 and node:sqlite both have it. */
export interface SqliteReader {
  prepare(sql: string): { all(...params: unknown[]): unknown[] };
  close(): void;
}
export type OpenSqlite = (path: string) => SqliteReader;

/** A regular file, asked without following a link. */
function isFile(path: string): boolean {
  try { return lstatSync(path).isFile(); } catch { return false; }
}

/**
 * The newest memories in `<codexHome>/memories_1.sqlite`: the `raw_memory` of `stage1_outputs`, and nothing else
 * from the file. An empty list when there is no database or no such table (Codex has not made one yet, or a
 * version without it). Throws when the copy cannot be read, so the caller keeps what it wrote before.
 */
export function readCodexMemories(codexHome: string, open: OpenSqlite, max = CODEX_MEMORY_MAX_ROWS): CodexMemoryRow[] {
  const db = join(codexHome, CODEX_MEMORY_DB);
  if (!isFile(db)) return [];
  const dir = mkdtempSync(join(tmpdir(), 'md-codex-memory-'));
  try {
    const copy = join(dir, CODEX_MEMORY_DB);
    copyFileSync(db, copy);
    if (isFile(`${db}-wal`)) copyFileSync(`${db}-wal`, `${copy}-wal`);
    const conn = open(copy);
    try {
      const table = conn.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'stage1_outputs'").all();
      if (!table.length) return [];
      const rows = conn.prepare(
        'SELECT thread_id, source_updated_at, raw_memory FROM stage1_outputs'
        + " WHERE raw_memory IS NOT NULL AND trim(raw_memory) <> ''"
        + ' ORDER BY source_updated_at DESC, thread_id DESC LIMIT ?'
      ).all(max) as Array<{ thread_id?: unknown; source_updated_at?: unknown; raw_memory?: unknown }>;
      return rows.map((r) => ({
        threadId: typeof r.thread_id === 'string' ? r.thread_id : String(r.thread_id ?? ''),
        updatedAt: Number(r.source_updated_at ?? 0),
        text: typeof r.raw_memory === 'string' ? r.raw_memory : String(r.raw_memory ?? ''),
      }));
    } finally {
      conn.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Remove `<agentDir>/codex-memory.md`. A link with the name is removed itself, never what it leads to. */
export function removeCodexMemory(agentDir: string): boolean {
  const path = join(agentDir, CODEX_MEMORY_FILE);
  try { lstatSync(path); } catch { return false; } // nothing has the name
  try { unlinkSync(path); return true; } catch { rmSync(path, { recursive: true, force: true }); return true; }
}

export type CodexMemorySync = 'written' | 'unchanged' | 'removed' | 'none';

/**
 * Bring `<agentDir>/codex-memory.md` in step with the switch. On: the newest memories, written only when the text
 * changed, so the miner files it again only then. Off, or on with nothing to copy: the file is removed. Throws
 * only when Codex's database cannot be read; the file is then left as it was.
 */
export function syncCodexMemory(
  agentDir: string,
  agentId: string,
  on: boolean,
  open: OpenSqlite,
  clean?: (text: string) => string
): CodexMemorySync {
  if (!on) return removeCodexMemory(agentDir) ? 'removed' : 'none';
  const text = codexMemoryMarkdown(agentId, readCodexMemories(join(agentDir, '.codex'), open), clean);
  if (text === null) return removeCodexMemory(agentDir) ? 'removed' : 'none';
  const path = join(agentDir, CODEX_MEMORY_FILE);
  if (isFile(path)) {
    try { if (readFileSync(path, 'utf8') === text) return 'unchanged'; } catch { /* unreadable: write it again */ }
  } else {
    removeCodexMemory(agentDir); // a link or a folder with the name is not written through
  }
  writeFileSync(path, text, 'utf8');
  return 'written';
}
