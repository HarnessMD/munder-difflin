/**
 * WHAT THE TICKET TIP SAYS (0.5.3 rc.4, founder 25 Sep 2026: "When we hover on
 * the ticket on the sidebar it should show the ticket details in the
 * tooltip.")
 *
 * The facts, pure so a test takes them directly; the words and the tip are
 * pro/ProSidebar.tsx (showTicketTip), in the same rail tip the live action
 * line opens.
 *   head   the ticket key, its status and its priority;
 *   lines  the title in full; the description, its first six lines and then
 *          an ellipsis; who it is assigned to; how long ago it was made; how
 *          many cards it waits on; and, only while it is blocked, the newest
 *          question still open for the person.
 */

export interface TicketLike {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  status: string;
  /** The ledger's 1 to 5, or a label a person wrote on the card ("P0"). */
  priority?: number | string;
  createdAt?: string;
  dependsOn?: readonly string[];
  humanQA?: readonly { q?: string; a?: string; dismissedAt?: string }[];
}

export type TicketPriority = { kind: 'level'; level: number } | { kind: 'label'; label: string } | null;

export interface TicketTipFacts {
  key: string;
  status: string;
  priority: TicketPriority;
  title: string;
  description: string | null;
  assignee: string | null;
  createdAt: number | null;
  dependsOn: number;
  question: string | null;
}

/** How much of the description the tip shows. */
export const TICKET_TIP_LINES = 6;
/** A description with no line breaks can still be long: cut it here too. */
export const TICKET_TIP_CHARS = 480;

export function clipDescription(text: string | undefined): string | null {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  while (lines.length && !lines[0].trim()) lines.shift();
  if (!lines.length) return null;
  let out = lines.slice(0, TICKET_TIP_LINES).join('\n');
  let cut = lines.length > TICKET_TIP_LINES;
  if (out.length > TICKET_TIP_CHARS) { out = out.slice(0, TICKET_TIP_CHARS).trimEnd(); cut = true; }
  return cut ? `${out}…` : out;
}

function priorityOf(p: TicketLike['priority']): TicketPriority {
  if (typeof p === 'number' && Number.isFinite(p)) return { kind: 'level', level: Math.max(1, Math.min(5, Math.round(p))) };
  if (typeof p === 'string' && p.trim()) return { kind: 'label', label: p.trim() };
  return null;
}

/** The newest question on the card nobody has answered or dismissed. */
function openAsk(t: TicketLike): string | null {
  const qa = Array.isArray(t.humanQA) ? t.humanQA : [];
  for (let i = qa.length - 1; i >= 0; i--) {
    const e = qa[i];
    if (e && typeof e.q === 'string' && e.q.trim() && !e.a && !e.dismissedAt) return e.q.trim();
  }
  return null;
}

export function ticketTipFacts(t: TicketLike): TicketTipFacts {
  const created = t.createdAt ? Date.parse(t.createdAt) : NaN;
  return {
    key: t.id,
    status: t.status,
    priority: priorityOf(t.priority),
    title: t.title,
    description: clipDescription(t.description),
    assignee: t.assignee?.trim() || null,
    createdAt: Number.isFinite(created) ? created : null,
    dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.length : 0,
    question: t.status === 'blocked' ? openAsk(t) : null
  };
}
