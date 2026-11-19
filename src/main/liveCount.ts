
/** How long after a finished turn the live count may take. Claude exports every 5 seconds. */
export const LIVE_WAIT_MS = 2 * 60_000;

export interface LiveObservation {
  now: number;
  /** A live sample (an OTel session) is in hand for this agent. */
  live: boolean;
  /** The last finished turn (a turn hook), 0 for none. */
  turnAt: number;
}

export interface LiveVerdict {
  /** Stop the agent now: its live count never arrived. Said once per agent run. */
  stop: boolean;
}

interface AgentState {
  firstSeen: number;
  liveSeen: boolean;
  stopped: boolean;
  /** The first finished turn of this run; null before one. */
  firstTurn: number | null;
}

export class LiveCountGuard {
  private readonly agents = new Map<string, AgentState>();

  observe(agentId: string, o: LiveObservation): LiveVerdict {
    let s = this.agents.get(agentId);
    if (!s) { s = { firstSeen: o.now, liveSeen: false, stopped: false, firstTurn: null }; this.agents.set(agentId, s); }
    if (o.live) s.liveSeen = true;
    // The clock runs from the FIRST turn of this run: an agent that keeps working never resets it.
    if (s.firstTurn === null && o.turnAt > s.firstSeen) s.firstTurn = o.turnAt;
    const stop = !s.liveSeen && !s.stopped && s.firstTurn !== null && o.now - s.firstTurn >= LIVE_WAIT_MS;
    if (stop) s.stopped = true;
    return { stop };
  }

  /** The agent's process went: its next run starts fresh. */
  forget(agentId: string): void {
    this.agents.delete(agentId);
  }
}
