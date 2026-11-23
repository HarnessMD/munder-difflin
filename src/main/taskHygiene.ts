/**
 * The hygiene sweep (v0.4.9 W-A): archive old cards, start the done clock,
 * and cap the board. Runs once at boot and then hourly (startTaskHygiene,
 * armed in index.ts next to the hive router and cleared on teardown). Every
 * decision is in shared/taskHygiene.ts and takes `now`; this file only reads
 * the config, reads the files through the hive, and writes what the plan says.
 *
 * Files, all in the hive root (`<harnessHome>/hive/`):
 *   tasks.json           the live ledger, unchanged in shape
 *   tasks-archive.json   the same shape plus archivedAt / archiveReason /
 *                        archiveNote per card, newest first
 *   board-archive.md     every full copy of board.md taken before the god was
 *                        asked to condense it, under dated headings
 *   hygiene.json         the board latch: when the outstanding ask was sent
 *
 * The board: when the estimate crosses the cap, the FULL text is appended to
 * board-archive.md FIRST, and only then is the god sent one inbox message,
 * through the same door as the heartbeat (hive.send to 'god'). The latch keeps
 * it to one message per crossing; it clears when the board is back under.
 */
import { readConfig } from './config';
import type { HiveManager } from './hive';
import {
  applySweepPlan, boardArchiveEntry, boardAskMessage, boardDecision, isHygieneCard, planSweep, resolveTaskHygiene,
  type HygieneCard
} from '../shared/taskHygiene';

export const TASK_HYGIENE_INTERVAL_MS = 3_600_000;

let timer: ReturnType<typeof setInterval> | null = null;

export interface HygieneRun {
  archived: number;
  stamped: number;
  boardTokens: number;
  boardAsked: boolean;
}

/** One pass. Idempotent: a second run at the same moment archives nothing more
 *  and never sends a second board message. */
export function runTaskHygiene(hive: HiveManager, now = Date.now()): HygieneRun {
  const out: HygieneRun = { archived: 0, stamped: 0, boardTokens: 0, boardAsked: false };
  if (!hive.enabled()) return out;
  const cfg = resolveTaskHygiene(readConfig().taskHygiene);

  // 1. The ledger.
  const ledger = hive.tasks() as { tasks?: unknown };
  const raw = Array.isArray(ledger?.tasks) ? ledger.tasks : [];
  const cards = raw.filter(isHygieneCard) as HygieneCard[];
  const plan = planSweep(cards, cfg, now);
  if (plan.archive.length || plan.stampDone.length) {
    const r = hive.applyTaskHygiene(raw, (archive) => applySweepPlan(raw, archive, plan, new Date(now).toISOString()));
    out.archived = r.archived;
    out.stamped = r.stamped;
  }

  // 2. The board.
  const text = hive.board();
  const state = hive.hygieneState();
  const d = boardDecision(text, cfg, { asked: state.boardAskedAt !== null });
  out.boardTokens = d.tokens;
  if (d.ask) {
    // The copy lands on disk BEFORE the god hears about it, so the full text
    // survives whatever he does next.
    const archivePath = hive.appendBoardArchive(boardArchiveEntry(text, now, d.tokens));
    const msg = boardAskMessage(d.tokens, cfg.boardTokenCap, archivePath);
    hive.send({ to: 'god', act: 'request', subject: msg.subject, body: msg.body }, 'system');
    out.boardAsked = true;
  }
  if (d.next.asked !== (state.boardAskedAt !== null)) {
    hive.setHygieneState({ ...state, boardAskedAt: d.next.asked ? now : null });
  }
  return out;
}

/** Boot, then hourly. Re-arming is safe: the previous timer is cleared first. */
export function startTaskHygiene(hive: HiveManager, intervalMs = TASK_HYGIENE_INTERVAL_MS): void {
  stopTaskHygiene();
  const tick = (): void => {
    try {
      const r = runTaskHygiene(hive);
      if (r.archived || r.stamped || r.boardAsked) console.log('[hygiene]', r);
    } catch (e) {
      console.error('[hygiene]', e);
    }
  };
  tick();
  timer = setInterval(tick, intervalMs);
}

export function stopTaskHygiene(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
