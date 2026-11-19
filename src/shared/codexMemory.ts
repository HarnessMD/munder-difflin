/**
 * CODEX'S OWN MEMORIES IN SEARCH (opt in per agent, off by default).
 *
 * Every agent's memory.md is mined into MemPalace, Codex agents included. What Codex CLI remembers by itself is
 * not: it lives in the agent's own CODEX_HOME (`<agent dir>/.codex`, see installCodexHooks in main/hive.ts), and
 * that folder is kept out of mining and out of the hive's git history on purpose (transcripts, an 80 MB logs
 * database, the 7.5 GB history of 0.4.x; main/hive.ts above ensureMineIgnore).
 *
 * WHAT IS COPIED. Codex CLI 0.164 keeps its memories in `.codex/memories_1.sqlite`. That file has no table named
 * `memories`: its tables are `stage1_outputs`, `jobs`, `consolidation_progress` and sqlx's migrations. A row of
 * `stage1_outputs` is one session's extracted memory: `raw_memory` is the memory, `rollout_summary` is a summary of
 * the session itself. Only `raw_memory` is copied, with the session's date. The summary, the jobs and every other
 * file in `.codex` stay where they are.
 *
 * WHERE IT GOES. A file of its own beside memory.md, `codex-memory.md`, rewritten on every mine pass, so memory.md's
 * cap, its archive and the agent's own writing are untouched. The mine stage indexes it like the other memory
 * files (main/palaceScope.ts) and the hive's git history leaves it out like memory.md (shared/hiveRepo.ts).
 *
 * WHY OFF BY DEFAULT. A Codex memory can hold a person's or a customer's details, which memory.md's rules keep out.
 * So a person turns it on for one agent at a time, in Settings, Memory and Knowledge, and the switch is drawn for
 * Codex agents only. Off copies nothing and removes the file.
 *
 * Pure: no file, no Electron. The reading and the writing are main/codexMemory.ts.
 */

/** The file the copy is written to, in the top level of the agent's folder. */
export const CODEX_MEMORY_FILE = 'codex-memory.md';
/** Codex CLI's memory database, inside the agent's CODEX_HOME. */
export const CODEX_MEMORY_DB = 'memories_1.sqlite';
/** The newest rows a copy holds at most. */
export const CODEX_MEMORY_MAX_ROWS = 200;
/** One memory's text, at most, in characters. */
export const CODEX_MEMORY_MAX_CHARS = 4000;
/** The whole file, at most, in characters. MemPalace skips a file of more than 500 chunks of about 700 new
 *  characters each (miner.py MAX_CHUNKS_PER_FILE, read at 3.3.5), so the copy stays well under that. */
export const CODEX_MEMORY_MAX_FILE_CHARS = 256 * 1024;

/** One memory, as read from a row of `stage1_outputs`. */
export interface CodexMemoryRow {
  threadId: string;
  /** `source_updated_at`: when the session the memory came from last changed. Seconds or milliseconds. */
  updatedAt: number;
  text: string;
}

/** The agent ids the copy is on for (`config.agentCodexMemoryOn`), as read: only non empty strings, once each. */
export function codexMemoryOnList(on: unknown): string[] {
  if (!Array.isArray(on)) return [];
  return [...new Set(on.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

/** Whether one agent's Codex memories are copied. Off unless its own switch says on. */
export function codexMemoryOnFor(on: unknown, agentId: string): boolean {
  return codexMemoryOnList(on).includes(agentId);
}

/** The list after one agent's switch moves. */
export function withCodexMemory(on: unknown, agentId: string, next: boolean): string[] {
  const rest = codexMemoryOnList(on).filter((id) => id !== agentId);
  return next ? [...rest, agentId] : rest;
}

/** A row's date as YYYY-MM-DD (UTC), or null when the number is not a time. */
function dayOf(at: number): string | null {
  if (!Number.isFinite(at) || at <= 0) return null;
  const ms = at < 1e12 ? at * 1000 : at;
  const d = new Date(ms);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : null;
}

/**
 * The file's text for these rows, newest first, or null when there is nothing to copy. The same rows always give
 * the same text, so a pass that finds nothing new writes nothing and the miner does not file it again.
 * `clean` runs over each memory before it is written (main passes redactSecrets).
 */
export function codexMemoryMarkdown(
  agentId: string,
  rows: readonly CodexMemoryRow[],
  clean: (text: string) => string = (s) => s
): string | null {
  const head = [
    `# Codex memories of ${agentId}`,
    '',
    `Copied by Munder Difflin from this agent's Codex built in memory (the raw_memory of each session in .codex/${CODEX_MEMORY_DB}).`,
    'Written again on every mine pass, so an edit here is lost. Turned on per agent in Settings, Memory and Knowledge.',
    '',
  ].join('\n');
  let out = head;
  let kept = 0;
  const sorted = [...rows].sort((a, b) => (b.updatedAt - a.updatedAt) || (a.threadId < b.threadId ? 1 : a.threadId > b.threadId ? -1 : 0));
  for (const row of sorted.slice(0, CODEX_MEMORY_MAX_ROWS)) {
    let text = clean(String(row.text ?? '')).trim();
    if (!text) continue;
    if (text.length > CODEX_MEMORY_MAX_CHARS) text = `${text.slice(0, CODEX_MEMORY_MAX_CHARS).trimEnd()}\n\n(cut at ${CODEX_MEMORY_MAX_CHARS} characters)`;
    const day = dayOf(row.updatedAt);
    const block = `\n## ${day ?? 'Undated'}, session ${row.threadId || 'unknown'}\n\n${text}\n`;
    if (out.length + block.length > CODEX_MEMORY_MAX_FILE_CHARS) break;
    out += block;
    kept += 1;
  }
  return kept ? out : null;
}
