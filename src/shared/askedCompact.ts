/**
 * Any agent asks the app to compact an agent.
 *
 * fleet.json carries each agent's context fill (`contextPct`). An agent that
 * sees one at or over the bar, the orchestrator or any other, writes one JSON
 * file into the hive's compact-requests/ folder: {"agent": "<id>", "reason"}.
 * Main checks the ask and files it under .done/ or .failed/ with the reason,
 * the way clear-requests/ does (askedClear.ts). An accepted ask is handed to
 * the window each beat until the engine's own compact goes in: the window
 * queues it at the agent's next idle prompt, through the same gate, dedupe
 * and latch as the compact at a turn end, with the person's focus text. A
 * compact is not a clear: nothing is wiped, so the orchestrator may be asked
 * too, and an agent may ask for itself.
 *
 * REFUSED: an agent the floor does not know or has archived, one with no
 * terminal, an engine with no compact command, an ask already waiting for the
 * agent, and a second ask within ASKED_COMPACT_GAP_MS.
 *
 * No electron import, no fs import: main, the window and the tests share it.
 */

/** The folder in the hive root agents write their asks into. */
export const COMPACT_REQUESTS_DIR = 'compact-requests';

/** One accepted ask per agent in this long. */
export const ASKED_COMPACT_GAP_MS = 10 * 60_000;

/** What main knows of the agent when an ask arrives. */
export interface CompactAskFacts {
  /** In the registry and not archived. */
  known: boolean;
  /** It has a live terminal. */
  live: boolean;
  /** The engine has a compact command the app can type. */
  canCompact: boolean;
}

/** The outcomes of the submit door (providerAutomation SubmitOutcome). */
type Outcome = 'submitted' | 'unconfirmed' | 'stuck' | 'held' | 'gone';

export class AskedCompact {
  /** Agents with an accepted ask whose compact has not been typed yet. */
  private open = new Set<string>();
  /** When each agent's last ask was accepted. */
  private askedAt = new Map<string, number>();

  constructor(private now: () => number = Date.now) {}

  /** Why this ask is refused, in words the asking agent reads, or null. */
  refusal(agentId: string, f: CompactAskFacts): string | null {
    if (!f.known) return 'No agent on the floor has this id.';
    if (!f.live) return 'This agent has no terminal open.';
    if (!f.canCompact) return 'This agent\'s engine has no compact command the app can type.';
    if (this.open.has(agentId)) return 'A compact for this agent is already waiting.';
    const last = this.askedAt.get(agentId);
    if (last !== undefined && this.now() - last < ASKED_COMPACT_GAP_MS) return 'This agent was compacted on an ask less than 10 minutes ago.';
    return null;
  }

  /** Accept an ask. Call only when `refusal` answered null. */
  ask(agentId: string): void {
    this.open.add(agentId);
    this.askedAt.set(agentId, this.now());
  }

  /** The agents with an ask still waiting. */
  waiting(): string[] {
    return [...this.open];
  }

  /** Something went through the submit door. True, once, when it was a
   *  compact for an agent with an ask waiting. Any compact counts: one from
   *  the turn end does the same job. */
  noteTyped(agentId: string | undefined, isCompact: boolean, outcome: Outcome, pressOnly = false): boolean {
    if (!agentId || pressOnly || !isCompact || outcome === 'held' || outcome === 'gone') return false;
    return this.open.delete(agentId);
  }

  /** The agent's terminal closed: its waiting ask goes; the 10 minutes stay. */
  forget(agentId: string): void {
    this.open.delete(agentId);
  }
}
