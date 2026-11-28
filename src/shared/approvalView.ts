/**
 * An open guardrail approval as the ASK ME Approvals card shows it. Main's own copy
 * of the request (main/approvals.ts, over IPC), never anything from tasks.json,
 * which agents can write. Import free, so a test reads it directly.
 */
export interface ApprovalView {
  id: string;
  agent_id: string;
  agent_name: string;
  rule_id: string;
  /** The rule's principle or message. */
  reason: string;
  tool: string;
  /** Exactly what Approve lets run once: the command, or the input as JSON. */
  call: string;
  cwd: string | null;
  asked_at: string;
  /** When the request is dropped unanswered. */
  expires_at: string;
}

/** Only well formed rows reach the card, oldest first: the one that has waited
 *  longest is the one to answer. */
export function approvalsToShow(list: unknown): ApprovalView[] {
  if (!Array.isArray(list)) return [];
  const ok = list.filter((v): v is ApprovalView => {
    const x = v as ApprovalView;
    return !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.agent_id === 'string'
      && typeof x.call === 'string' && typeof x.tool === 'string' && typeof x.asked_at === 'string'
      && typeof x.expires_at === 'string';
  });
  return [...ok].sort((a, b) => a.asked_at.localeCompare(b.asked_at));
}
