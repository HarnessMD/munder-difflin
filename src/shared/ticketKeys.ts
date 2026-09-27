/**
 * TICKET KEYS (0.5.3, founder on rc.4: "The ticket ID that gets created by the
 * agents should be three capital letter text-number ex: V53-299, MTK-122").
 *
 * The harness assigns them, not the prompt, so every writer gets the same
 * answer: an agent editing tasks.json by hand, Slack, a webhook and the UI.
 *
 *   - Each hive has a prefix: three capital letters or digits, a letter first
 *     (^[A-Z][A-Z0-9]{2}$), derived from the hive folder name the first time
 *     (MunderDifflin -> MDF, v053 -> V53) and editable afterwards.
 *   - A counter beside it, `{"ticket": {"prefix": "V53", "next": 300}}` in
 *     tasks.json, written in the same atomic write as the cards. It never goes
 *     back: the next number is also at least one past the highest key already
 *     on the live board or in the archive, so a counter lost with a hand
 *     written file (an agent that rewrote tasks.json without the `ticket` key)
 *     or a crash between two files can never hand out a key twice.
 *   - A card whose id is empty or not a key gets PREFIX-N; the id it had moves
 *     to `alias`, so a dependsOn, blockedBy or humanQA naming the old id still
 *     resolves (resolveTask, by id OR alias). The old id to key mapping is
 *     remembered, so an agent writing its old copy back gets the same key.
 *   - A card whose id already is a key keeps it. Existing cards are never
 *     migrated wholesale: only cards written from now on get keys.
 *
 * Pure: main (hive.ts) and the renderer share it, and the tests drive it.
 */

export const TICKET_KEY_RE = /^[A-Z][A-Z0-9]{2}-\d+$/;
export const TICKET_PREFIX_RE = /^[A-Z][A-Z0-9]{2}$/;
/** How many old id to key pairs are remembered. */
export const ALIAS_MEMORY = 500;

export interface TicketMeta {
  prefix: string;
  next: number;
  /** Old id -> key, newest last, capped at ALIAS_MEMORY. */
  aliases?: Record<string, string>;
}

type RawTask = Record<string, unknown>;
const isRaw = (v: unknown): v is RawTask => !!v && typeof v === 'object' && !Array.isArray(v);

export function isTicketKey(id: unknown): id is string {
  return typeof id === 'string' && TICKET_KEY_RE.test(id);
}

export function isTicketPrefix(p: unknown): p is string {
  return typeof p === 'string' && TICKET_PREFIX_RE.test(p);
}

/**
 * Three characters from a folder name. A name with a number keeps its first
 * letter and the number's last two digits (v053 -> V53, hive-2026 -> H26);
 * otherwise the capitals of its words (MunderDifflin -> MD), then the
 * consonants after them (last word first), then anything, padded with X (MunderDifflin -> MDF,
 * acme -> ACM). A name with no letter at all is TSK.
 */
export function derivePrefix(folderName: string): string {
  const name = (folderName || '').replace(/[^A-Za-z0-9]+/g, ' ').trim();
  const firstLetter = name.match(/[A-Za-z]/)?.[0]?.toUpperCase();
  if (!firstLetter) return 'TSK';
  const digits = name.replace(/[^0-9]/g, '');
  if (digits.length >= 2) return `${firstLetter}${digits.slice(-2)}`;
  // Words: split on spaces and on a lower to upper change (camelCase).
  const words = name.split(/\s+|(?<=[a-z0-9])(?=[A-Z])/).filter((w) => /[A-Za-z]/.test(w));
  let out = words.map((w) => (w.match(/[A-Za-z]/)?.[0] ?? '').toUpperCase()).join('');
  if (out.length < 3) {
    // The last word first: MunderDifflin -> MD + F (Difflin), not N (Munder).
    const rest = [...words].reverse().map((w) => w.replace(/^[^A-Za-z]*[A-Za-z]/, '')).join('').toUpperCase();
    for (const c of rest.replace(/[^BCDFGHJKLMNPQRSTVWXZ]/g, '')) { if (out.length >= 3) break; out += c; }
    for (const c of rest.replace(/[^A-Z0-9]/g, '')) { if (out.length >= 3) break; out += c; }
  }
  out = (out + 'XXX').slice(0, 3);
  return isTicketPrefix(out) ? out : 'TSK';
}

/** The number of a key under this prefix, else 0. */
function numberUnder(prefix: string, id: unknown): number {
  if (!isTicketKey(id) || !id.startsWith(`${prefix}-`)) return 0;
  return Number(id.slice(prefix.length + 1)) || 0;
}

/** Read `ticket` from a tasks.json object, or derive a fresh one. */
export function readTicketMeta(file: unknown, folderName: string): TicketMeta {
  const raw = isRaw(file) && isRaw(file.ticket) ? file.ticket : null;
  const prefix = raw && isTicketPrefix(raw.prefix) ? raw.prefix : derivePrefix(folderName);
  const next = raw && typeof raw.next === 'number' && Number.isFinite(raw.next) && raw.next >= 1 ? Math.floor(raw.next) : 1;
  const aliases: Record<string, string> = {};
  if (raw && isRaw(raw.aliases)) for (const [k, v] of Object.entries(raw.aliases)) if (isTicketKey(v)) aliases[k] = v;
  return { prefix, next, aliases };
}

/**
 * Give every card that needs one a key, against the live cards and the archive
 * (so a number is never reused). Returns the cards, the meta to write beside
 * them, and whether anything changed. Cards are returned in the same order;
 * only `id` and `alias` are touched.
 */
export function assignTicketKeys(tasks: unknown, meta: TicketMeta, archive: unknown = []): { tasks: unknown[]; meta: TicketMeta; changed: boolean } {
  const list = Array.isArray(tasks) ? tasks : [];
  const archived = Array.isArray(archive) ? archive : [];
  const aliases: Record<string, string> = { ...(meta.aliases ?? {}) };
  let next = Math.max(1, meta.next);
  for (const t of [...list, ...archived]) if (isRaw(t)) next = Math.max(next, numberUnder(meta.prefix, t.id) + 1);
  const taken = new Set<string>();
  for (const t of list) if (isRaw(t) && isTicketKey(t.id)) taken.add(t.id);
  let changed = next !== meta.next;
  const out = list.map((t) => {
    if (!isRaw(t) || isTicketKey(t.id)) return t;
    const old = typeof t.id === 'string' ? t.id.trim() : '';
    let key = old && aliases[old] && !taken.has(aliases[old]) ? aliases[old] : '';
    if (!key) { key = `${meta.prefix}-${next}`; next += 1; }
    taken.add(key);
    if (old) {
      delete aliases[old];
      aliases[old] = key;
    }
    changed = true;
    const card: RawTask = { ...t, id: key };
    if (old && !(typeof t.alias === 'string' && t.alias)) card.alias = old;
    return card;
  });
  const names = Object.keys(aliases);
  for (const k of names.slice(0, Math.max(0, names.length - ALIAS_MEMORY))) delete aliases[k];
  return { tasks: out, meta: { prefix: meta.prefix, next, aliases }, changed };
}

/** The card a reference names: its key, or the id it had before (`alias`). */
export function resolveTask<T extends { id?: unknown; alias?: unknown }>(tasks: readonly T[], ref: string): T | undefined {
  if (!ref) return undefined;
  return tasks.find((t) => t.id === ref) ?? tasks.find((t) => t.alias === ref);
}

/** The key a reference resolves to, or the reference itself when no card has it. */
export function canonicalTaskId(tasks: readonly { id?: unknown; alias?: unknown }[], ref: string): string {
  const hit = resolveTask(tasks, ref);
  return hit && typeof hit.id === 'string' ? hit.id : ref;
}
