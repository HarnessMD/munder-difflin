/**
 * The memory index (0.4.11, founder 6 Sep 2026: "temporary agents should be
 * able to fetch context from any agent's memories").
 *
 * A temp starts from nothing: a fresh worktree, an empty memory.md, and an
 * objective. What the rest of the floor already knows sits in each agent's
 * `agents/<id>/memory.md`, readable by every agent since the hive root is on
 * their allowed directories, but nothing ever told a temp those files existed
 * or which ones were worth opening. So main writes ONE index at every temp
 * spawn, `<root>/memory-index.md`, and the temp's brief opens with a [CONTEXT]
 * block that says: read the index, read the memories that match the ask,
 * search the palace and the knowledge graph when they are on, then start.
 *
 * No electron import: hive.ts supplies the rows (it owns the registry and the
 * agent folders), index.ts calls these two functions on the spawn path, and
 * test/pro-0411-slack-temps.test.cjs drives them on a temp directory.
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface MemoryIndexRow {
  id: string;
  name: string;
  role?: string;
  cwd?: string;
  /** Absolute path of the agent's memory.md. Listed even when the file does not
   *  exist yet, so the temp can tell "never wrote anything" from "gone". */
  path: string;
  bytes: number;
  updatedAt?: string;
  /** Only the seed header: nothing appended, nothing worth a read. */
  empty: boolean;
  /** The agent's terminal is closed; its notes remain. */
  archived: boolean;
}

export const MEMORY_INDEX_FILE = 'memory-index.md';

/** Rows an agent should open first come first: agents with real notes before
 *  empty ones, active before archived, then the most recently updated. */
function orderRows(rows: MemoryIndexRow[]): MemoryIndexRow[] {
  return rows.slice().sort((a, b) => {
    if (a.empty !== b.empty) return a.empty ? 1 : -1;
    if (a.archived !== b.archived) return a.archived ? 1 : -1;
    const ta = a.updatedAt ?? '';
    const tb = b.updatedAt ?? '';
    if (ta !== tb) return ta < tb ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Minute precision is enough to judge freshness and keeps the line short. */
function fmtWhen(iso?: string): string {
  if (!iso) return 'never written';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 'unknown';
  return `updated ${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** Write `<root>/memory-index.md` and return its path. Written to a temp name
 *  and renamed, so a temp that reads it mid write never sees half a file. The
 *  layout is plain text an agent reads top to bottom, no table and no bullet
 *  characters: one header line per agent, the path on the next line. */
export function writeMemoryIndex(root: string, rows: MemoryIndexRow[], now: Date = new Date()): string {
  const path = join(root, MEMORY_INDEX_FILE);
  const ordered = orderRows(rows);
  const withNotes = ordered.filter((r) => !r.empty).length;
  const lines: string[] = [
    '# Memory index',
    '',
    `Written ${now.toISOString()} by the harness when a temp was spawned. ${ordered.length} agent${ordered.length === 1 ? '' : 's'} have been on this floor, ${withNotes} with notes worth reading.`,
    'Each entry is one agent: id, display name, role in brackets, state, size and last update on the first line, the absolute path of its memory file on the second.',
    'Read the memory of every agent your task names and of every agent whose role matches it. An entry marked empty holds only the seed header. Read only: you write to your own memory.md alone.',
    ''
  ];
  for (const r of ordered) {
    const state = r.empty ? 'empty' : r.archived ? 'archived' : 'active';
    const role = r.role ? ` (${r.role})` : '';
    lines.push(`${r.id}  ${r.name}${role}  ${state}  ${fmtBytes(r.bytes)}  ${fmtWhen(r.updatedAt)}`);
    lines.push(`  ${r.path}`);
    lines.push('');
  }
  if (ordered.length === 0) lines.push('No agent has been registered on this floor yet.', '');
  mkdirSync(root, { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, lines.join('\n'), 'utf8');
  renameSync(tmp, path);
  return path;
}

/** The [CONTEXT] block that opens a temp's brief. Steps are numbered in the
 *  order the plan fixed: the index, the matching memories, the palace when it
 *  is set, the knowledge graph when it is on, then the request. `kg` is the
 *  full search command line to run, already resolved for this machine. */
export function memoryContextBlock(root: string, indexPath: string, palace: boolean, kg?: string): string {
  const steps: string[] = [
    `Read ${indexPath}. It lists every agent that has been on this floor with the absolute path of its memory file, its role, and whether it holds anything.`,
    `Read the memory.md of every agent the request names and of every agent whose role matches the request. They live under ${join(root, 'agents')}/<id>/memory.md. Read only: you write to your own memory.md alone.`
  ];
  if (palace) steps.push('Run `mempalace search "<the request in a few words>"` to recall what the whole team remembers about it, across every agent.');
  if (kg && kg.trim()) steps.push(`Run ${kg.trim()} for company facts, house style and internal process that bear on the request.`);
  steps.push('Then start on the request below. Do not skip the reading: a temp that starts cold repeats work the floor already did.');
  return [
    '[CONTEXT] Before you start, gather what the team already knows.',
    ...steps.map((s, i) => `${i + 1}. ${s}`)
  ].join('\n');
}
