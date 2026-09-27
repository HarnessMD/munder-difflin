/**
 * The orchestrator nickname (0.4.9, API-CONTRACT Amendment 6). One rule and
 * one normaliser, shared by main (the relay claim, the roster resolver), the
 * renderer (the field's live check) and the tests, so the three cannot
 * disagree about what is a name and what is the same name.
 *
 * The relay stores the word as typed (`bossName`) and enforces uniqueness on
 * the key (`bossNameKey`); the key here is the same recipe the relay uses:
 * NFKC, lower case, inner whitespace collapsed, trimmed.
 */

export const BOSS_NAME_MIN = 2;
export const BOSS_NAME_MAX = 24;

/** First and last a letter or digit; inside, letters, digits, spaces,
 *  periods and apostrophes. Unicode letters are letters. */
const SHAPE = /^[\p{L}\p{N}](?:[\p{L}\p{N} .']*[\p{L}\p{N}])?$/u;

export type BossNameProblem = 'empty' | 'short' | 'long' | 'chars';

/** The uniqueness key: what "the same name" means. */
export function bossNameKey(raw: string): string {
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** The word the relay is sent: trimmed, otherwise as typed. */
export function validateBossName(raw: string): { ok: true; name: string } | { ok: false; problem: BossNameProblem } {
  const name = (raw ?? '').trim();
  if (!name) return { ok: false, problem: 'empty' };
  const length = [...name].length;
  if (length < BOSS_NAME_MIN) return { ok: false, problem: 'short' };
  if (length > BOSS_NAME_MAX) return { ok: false, problem: 'long' };
  if (!SHAPE.test(name)) return { ok: false, problem: 'chars' };
  return { ok: true, name };
}

/** Two names that the relay would refuse to hold side by side. */
export function sameBossName(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return bossNameKey(a) === bossNameKey(b);
}

/** The person on the roster who already holds this name, if any. Rows without
 *  a nickname never match, and the caller's own row is skipped by id. */
export function bossNameHolder<T extends { id?: string; name: string; bossName?: string | null; isSelf?: boolean }>(
  name: string, rows: T[], selfId?: string | null
): T | null {
  const key = bossNameKey(name);
  if (!key) return null;
  for (const r of rows) {
    if (r.isSelf || (selfId && r.id === selfId)) continue;
    if (r.bossName && bossNameKey(r.bossName) === key) return r;
  }
  return null;
}
