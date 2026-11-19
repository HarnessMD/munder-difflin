/**
 * USAGE LIMITS IN WORDS, for agents (founder ask, 26 Oct 2026; limits-bar BRIEF.md, last section).
 *
 * Two shapes of one snapshot (shared/usageLimits.ts, the store Stanley's main/usageLimits.ts keeps):
 *   limitsText     the table `md-limits` prints, one block per engine;
 *   limitsSummary  the one line god's live roster carries each turn.
 * Both say each reading's age and each window's reset as a time from now, so
 * an office in another time zone reads the same words. Nothing is guessed: an
 * engine with no reading says so, and one the app could not read on its last
 * ask (`failed`) gives its older figures as the last ones, with their age,
 * never as current (Stanley, PR 675, the same words as the panel). Pure: no
 * fs, no electron.
 */
import { limitsView, limitWindowName, windowGroups, type EngineLimits, type LimitEngine, type LimitWindow, type UsageLimitsSnapshot } from './usageLimits';

/** At or above this a window is near its limit: pick another engine for new work. */
export const LIMIT_NEAR_PERCENT = 80;

const ENGINE_NAME: Readonly<Record<LimitEngine, string>> = {
  claude: 'Claude Code', codex: 'Codex', antigravity: 'Antigravity', grok: 'Grok Build', opencode: 'OpenCode'
};

const STATE_WORDS: Readonly<Record<Exclude<EngineLimits['state'], 'ok'>, string>> = {
  'no-reading': 'no reading yet (Claude Code reports after an agent\'s reply)',
  'not-available': 'not available (reports no limits)',
  'not-installed': 'not installed here'
};

/** A span as "45s", "12m", "3h 5m", "2d 4h". */
export function span(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 90) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** Whole percent as the panel shows it: above 0 and under 1 is 1, above 99 and under 100 is 99. */
function wholePct(n: number): number {
  if (n > 0 && n < 1) return 1;
  if (n > 99 && n < 100) return 99;
  return Math.round(n);
}

/** "<1%" for a use above 0 and under 1, so a little use never reads as none. */
function pct(n: number): string {
  return n > 0 && n < 1 ? '<1%' : `${wholePct(n)}%`;
}

/** "resets in 2h 10m", "reset since this reading", or "" when the engine gave no time. */
function reset(w: LimitWindow, now: number): string {
  if (w.resetsAt === null) return '';
  return w.resetsAt <= now ? 'reset since this reading' : `resets in ${span(w.resetsAt - now)}`;
}

/** Near by the figure shown, so 79.6 printed as 80% says NEAR LIMIT too. */
function near(w: LimitWindow, now: number): boolean {
  return wholePct(w.usedPercent) >= LIMIT_NEAR_PERCENT && !(w.resetsAt !== null && w.resetsAt <= now);
}

/** An agent's name from its id, for "from <name>"; nothing known leaves the id. */
export type AgentNameOf = (id: string) => string | null | undefined;

/** The table `md-limits` prints. `where` names the office ("this computer"). */
export function limitsText(snap: UsageLimitsSnapshot, where: string, now: number = snap.readAt, nameOf?: AgentNameOf): string {
  const lines = [`Usage limits on ${where}. Each engine's own numbers as last seen here; nothing is guessed.`];
  for (const e of limitsView(snap).engines) {
    const name = ENGINE_NAME[e.engine] ?? e.engine;
    const old = e.failed && e.state === 'ok' && e.asOf !== null;
    if (e.failed && !old && e.state !== 'not-installed') { lines.push(`${name}: could not read it just now.`); continue; }
    if (e.state !== 'ok') { lines.push(`${name}: ${STATE_WORDS[e.state]}`); continue; }
    const from = e.fromAgent ? `from ${nameOf?.(e.fromAgent) || e.fromAgent}` : '';
    const about = [old || e.asOf === null ? '' : `as of ${span(now - e.asOf)} ago`, e.plan ? `plan ${e.plan}` : '', from]
      .filter(Boolean).join(', ');
    lines.push(old
      ? `${name}: could not read it just now. The last figures were ${span(now - (e.asOf as number))} ago${about ? ` (${about})` : ''}:`
      : `${name}${about ? ` (${about})` : ''}:`);
    for (const g of windowGroups(e)) {
      for (const w of g.windows) {
        const bits = [`${g.group ? `${g.group}, ` : ''}${limitWindowName(w)}`, `${pct(w.usedPercent)} used`, reset(w, now), near(w, now) ? 'NEAR LIMIT' : '']
          .filter(Boolean);
        lines.push(`  ${bits.join('  ')}`);
      }
    }
  }
  lines.push(`At ${LIMIT_NEAR_PERCENT}% or more a window is near its limit: give new work to an agent on another engine, or wait for the reset.`);
  return lines.join('\n');
}

/** The one line in god's live roster. Engines that are not installed are left out. Null with nothing to say. */
export function limitsSummary(snap: UsageLimitsSnapshot, now: number = snap.readAt): string | null {
  const parts: string[] = [];
  let anyNear = false;
  for (const e of limitsView(snap).engines) {
    if (e.state === 'not-installed') continue;
    const name = ENGINE_NAME[e.engine] ?? e.engine;
    const old = e.failed && e.state === 'ok' && e.asOf !== null;
    if (e.failed && !old) { parts.push(`${name} could not be read just now`); continue; }
    if (e.state !== 'ok') { parts.push(`${name} ${e.state === 'no-reading' ? 'no reading yet' : 'not available'}`); continue; }
    const ws = windowGroups(e).map((g) => (g.group ? `${g.group} ` : '') + g.windows.map((w) => {
      const n = near(w, now);
      anyNear ||= n;
      return `${w.kind === '5h' ? '5h' : w.kind === 'weekly' ? 'wk' : limitWindowName(w)} ${pct(w.usedPercent)}${n ? ' NEAR LIMIT' : ''}`;
    }).join(' '));
    const age = e.asOf !== null ? span(now - e.asOf) : '';
    parts.push(old
      ? `${name} could not be read just now, last figures ${age} ago: ${ws.join(', ')}`
      : `${name} ${ws.join(', ')}${age ? ` (${age} ago)` : ''}`);
  }
  if (!parts.length) return null;
  return `[LIMITS] ${parts.join('; ')}.`
    + (anyNear ? ' Give new work on a NEAR LIMIT engine to an agent on another engine.' : '')
    + ' `md-limits` shows resets and detail.';
}

/** What the broker's `GET /limits` answers (`md-limits`): the snapshot, where it was read, and its table. */
export function limitsAnswer(snap: UsageLimitsSnapshot, where: string, nameOf?: AgentNameOf): UsageLimitsSnapshot & { where: string; text: string } {
  return { ...limitsView(snap), where, text: limitsText(snap, where, snap.readAt, nameOf) };
}
