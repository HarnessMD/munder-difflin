/**
 * guardrail.json: the rules file, at `<hive>/policy/guardrail.json`.
 *
 * A rule is a principle (a sentence) with an optional BACKSTOP: the check the hook
 * server runs on every tool call. A backstop can `block` the call, `ask` the operator,
 * or only `log` what it would have done. With no file, nothing is evaluated and
 * nothing is logged.
 *
 * The engine reads the backstops through `toEngineRules`. This module only reads and
 * validates; nothing here writes the file.
 */
import { closeSync, constants, fstatSync, lstatSync, openSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import type { PolicyRule } from './policy';
import type { BackstopDoes, Backstop, GuardrailRule, GuardrailFile } from '../shared/guardrail';

export const GUARDRAIL_FILE = 'guardrail.json';

/** The keys a backstop may match on. Every present key must match (AND). */
export const MATCHERS = [
  'tool',
  'path_glob',
  'path_not_glob',
  'command_matches',
  'command_not_matches',
] as const;

export type { BackstopDoes, Backstop, GuardrailRule, GuardrailFile } from '../shared/guardrail';

const DOES: readonly BackstopDoes[] = ['block', 'ask', 'log'];

/** Every problem with the file's shape, as "<rule id>: <what>". Empty when valid.
 *  The engine's own checks (regexes, matcher values) still run when it loads. */
export function validateGuardrail(g: unknown): string[] {
  if (!g || typeof g !== 'object' || Array.isArray(g)) return ['the file must be a JSON object with a "rules" array'];
  const f = g as Partial<GuardrailFile>;
  const out: string[] = [];
  if (f.version !== 1) out.push(`version must be 1, got ${JSON.stringify(f.version)}`);
  if (typeof f.rev !== 'number' || !Number.isInteger(f.rev) || f.rev < 0) out.push('rev must be a whole number');
  if (f.defaults !== undefined) {
    const oe = (f.defaults as { on_error?: unknown })?.on_error;
    if (oe !== undefined && oe !== 'allow' && oe !== 'deny') out.push('defaults.on_error must be allow or deny');
  }
  if (!Array.isArray(f.rules)) return [...out, '"rules" must be an array'];
  const seen = new Set<string>();
  for (const r of f.rules as unknown[]) {
    const rule = (r ?? {}) as Partial<GuardrailRule>;
    const id = typeof rule.id === 'string' && rule.id.trim() ? rule.id : '(no id)';
    const bad = (what: string) => out.push(`${id}: ${what}`);
    if (id === '(no id)') bad('id must be a non-empty string');
    else if (seen.has(id)) bad('duplicate id');
    seen.add(id);
    if (typeof rule.principle !== 'string' || !rule.principle.trim()) bad('principle must be a non-empty sentence');
    const a = rule.agents;
    if (a !== 'all' && !(Array.isArray(a) && a.every((x) => typeof x === 'string' && x))) bad('agents must be "all" or a list of agent ids');
    if (rule.backstop === undefined) continue;
    const b = rule.backstop as Partial<Backstop>;
    if (!b || typeof b !== 'object') { bad('backstop must be an object'); continue; }
    if (typeof b.on !== 'boolean') bad('backstop.on must be true or false');
    if (!DOES.includes(b.does as BackstopDoes)) bad(`backstop.does must be block, ask or log, got ${JSON.stringify(b.does)}`);
    if (b.on_error !== undefined && b.on_error !== 'allow' && b.on_error !== 'deny') bad('backstop.on_error must be allow or deny');
    if (b.message !== undefined && typeof b.message !== 'string') bad('backstop.message must be text');
    if (!b.match || typeof b.match !== 'object' || Array.isArray(b.match)) { bad('backstop.match must be an object'); continue; }
    const keys = Object.keys(b.match);
    if (!keys.length) bad('backstop.match is empty: it would fire on every tool call');
    const unknown = keys.find((k) => !(MATCHERS as readonly string[]).includes(k));
    if (unknown) bad(`unknown matcher "${unknown}" (known: ${MATCHERS.join(', ')})`);
  }
  return out;
}

/** The backstops that are on, as the engine's rules, in file order. `block` is a live
 *  deny, `ask` a live ask, `log` a dry_run rule (recorded, never applied). */
export function toEngineRules(g: GuardrailFile): PolicyRule[] {
  const out: PolicyRule[] = [];
  for (const r of g.rules) {
    const b = r.backstop;
    if (!b || !b.on) continue;
    out.push({
      id: r.id,
      decision: b.does === 'ask' ? 'ask' : 'deny',
      mode: b.does === 'log' ? 'dry_run' : 'live',
      reason: b.message?.trim() ? b.message : r.principle,
      match: b.match,
      ...(b.on_error ? { on_error: b.on_error } : {}),
      ...(r.agents !== 'all' ? { agents: [...r.agents] } : {}),
    });
  }
  return out;
}

export type GuardrailRead = { ok: true; file: GuardrailFile } | { ok: false; error: string };

/** Read guardrail.json: the file, or why it cannot be used. Never throws. */
export function readGuardrail(path: string): GuardrailRead {
  let text: string;
  try { text = readFileSync(path, 'utf8'); } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  return parseGuardrail(text);
}

/**
 * The exact bytes of guardrail.json, never through a symbolic link. While the guardrail
 * is not loaded the policy folder is writable by every agent, so the folder or the file
 * may be a link an agent planted to a file of its choosing. `text: null` with no error
 * means there is no file. Never throws.
 */
export function readGuardrailBytes(path: string): { text: string | null; error: string | null } {
  try {
    if (lstatSync(dirname(path)).isSymbolicLink()) return { text: null, error: 'the policy folder is a symbolic link' };
  } catch { return { text: null, error: null }; }
  let st;
  try { st = lstatSync(path); } catch { return { text: null, error: null }; }
  if (st.isSymbolicLink()) return { text: null, error: `${GUARDRAIL_FILE} is a symbolic link` };
  if (!st.isFile()) return { text: null, error: `${GUARDRAIL_FILE} is not a regular file` };
  let fd: number | null = null;
  try {
    // O_NOFOLLOW: a link swapped in after the lstat is refused, not followed.
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    // A hard link is a regular file to lstat, but another name for it may sit in an
    // agent's own folder, where the agent can write it after the operator approves.
    const opened = fstatSync(fd);
    if (!opened.isFile()) return { text: null, error: `${GUARDRAIL_FILE} is not a regular file` };
    if (opened.nlink !== 1) return { text: null, error: `${GUARDRAIL_FILE} has other names (hard links)` };
    // The fingerprint is taken of the text, so the text must be the bytes: a file that is
    // not valid UTF-8 would be read with replacement characters, and two such files
    // could share a fingerprint.
    const raw = readFileSync(fd);
    const text = raw.toString('utf8');
    if (!Buffer.from(text, 'utf8').equals(raw)) return { text: null, error: `${GUARDRAIL_FILE} is not valid UTF-8` };
    return { text, error: null };
  } catch (e) {
    return { text: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

/** Parse and validate the text of a guardrail.json. Never throws. */
export function parseGuardrail(text: string): GuardrailRead {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const problems = validateGuardrail(parsed);
  return problems.length ? { ok: false, error: problems.join('; ') } : { ok: true, file: parsed as GuardrailFile };
}

/**
 * The fingerprint the app config keeps of the guardrail.json the operator last saved or
 * accepted (`guardrailApproved`): a SHA-256 of the exact bytes. The hive is writable by
 * every agent while the guardrail is not loaded, so the engine loads the file only when
 * it is byte for byte the one the operator approved.
 */
export function guardrailHash(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
