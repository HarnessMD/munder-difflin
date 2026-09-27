/**
 * THE ASK ME BADGE (0.5.3, feature 5; Teminite, 12 Sep 2026). A question an
 * agent asks the person lands in the Inbox, and somebody watching an agent's
 * screen never sees it arrive. The agent screen's bar now carries a badge while
 * any question waits.
 *
 * The badge counts exactly what the Inbox's Ask Me chat lists, so the number
 * and the place it opens cannot disagree: the caller hands in the tasks that
 * pass `waitsOnHuman` (blocked, with a question nobody answered or dismissed).
 * This rule only splits that list into "asked by the agent on screen" and
 * "asked by somebody else". Pure and import free, so a test takes it directly.
 *
 * The same rule feeds the Ask me section on every agent's Inbox thread
 * (0.5.3, founder requirement 1 of the Pro rail V2), so the bell's "mine"
 * and the section's rows are one list counted two ways.
 */

/** The one field of a humanQA entry the scoping reads besides its state. */
export interface AskEntryLike { q?: unknown; a?: string; dismissedAt?: string; from?: string }

export interface WaitingTaskLike { assignee?: string; humanQA?: readonly AskEntryLike[] }

export interface AskMeBadge {
  /** Questions waiting anywhere on the floor. Zero draws no badge at all. */
  total: number;
  /** How many of them were asked by the agent whose screen this is. */
  mine: number;
}

/** Who a waiting card's open question belongs to (0.5.3, founder 24 Sep:
 *  "ask me shown in the agent's tab is only the questions that that agent has
 *  asked, global ask me shows in Michael's tab"). The orchestrator writes
 *  every ask (PROTOCOL.md, "Asking the human"), so the writer names nobody;
 *  the open entry's `from` names the agent whose question it is when the
 *  orchestrator records it, and a card without one falls back to its
 *  assignee, the agent whose work waits on the answer. Empty means global. */
export function askerOf(w: WaitingTaskLike): string {
  const qa = Array.isArray(w.humanQA) ? w.humanQA : [];
  for (let i = qa.length - 1; i >= 0; i--) {
    const e = qa[i];
    if (e && typeof e.q === 'string' && !e.a && !e.dismissedAt) {
      const from = typeof e.from === 'string' ? e.from.trim() : '';
      if (from) return from;
      break;
    }
  }
  return (w.assignee ?? '').trim();
}

/** Whether a waiting card belongs to this agent. The asker is an agent id on
 *  cards the app writes and a name on cards an orchestrator wrote by hand;
 *  either one is this agent. The orchestrator also owns a global ask: no
 *  asker at all, or "god": he wrote every ask, and the Inbox's Ask Me chat
 *  already names an unassigned card as his. */
export function ownsAsk(w: WaitingTaskLike, agentId: string, agentName?: string, isGod = false): boolean {
  const who = askerOf(w).toLowerCase();
  if (!who) return isGod;
  if (isGod && who === 'god') return true;
  return [agentId, agentName].some((v) => !!v && v.toLowerCase() === who);
}

/** The questions one agent is waiting on the person for, in the order given.
 *  This is what the Ask me section on the agent's Inbox thread lists. */
export function asksFor<T extends WaitingTaskLike>(waiting: readonly T[], agentId: string, agentName?: string, isGod = false): T[] {
  return waiting.filter((w) => ownsAsk(w, agentId, agentName, isGod));
}

export function askMeBadge(waiting: readonly WaitingTaskLike[], agentId: string, agentName?: string, isGod = false): AskMeBadge {
  return { total: waiting.length, mine: asksFor(waiting, agentId, agentName, isGod).length };
}
