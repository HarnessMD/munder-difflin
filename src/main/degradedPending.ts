/**
 * NEEDS A FIX NOTICES KEPT UNTIL A FLOOR READS THEM (0.5.8; god, 7 Nov 2026, after Kevin's live run of the Claude
 * guard: the agent was stopped while the window sat at the sign in door, so the person never saw why).
 *
 * Main pushes `hive:degraded` once, to whatever window is listening. Each notice is also kept here until a floor takes
 * it: the floor's DegradedToast takes what is waiting when it mounts and again on
 * every push, so a notice is shown once, by whichever floor is up, and cleared as it is taken. A notice raised again
 * while one like it waits is kept once. At most MAX_PENDING wait; the oldest go first.
 */

export interface DegradedNotice { agentId: string; name: string; reason: string; message: string }

export const MAX_PENDING = 10;

export class PendingNotices {
  private list: DegradedNotice[] = [];

  add(n: DegradedNotice): void {
    if (this.list.some((x) => x.agentId === n.agentId && x.reason === n.reason && x.message === n.message)) return;
    this.list.push({ agentId: n.agentId, name: n.name, reason: n.reason, message: n.message });
    if (this.list.length > MAX_PENDING) this.list = this.list.slice(-MAX_PENDING);
  }

  /** Everything waiting, oldest first; nothing waits after. */
  take(): DegradedNotice[] {
    const out = this.list;
    this.list = [];
    return out;
  }
}
