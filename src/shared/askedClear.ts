/**
 * The orchestrator clears an agent (0.5.6). Its last resort.
 *
 * The orchestrator sees each agent's context fill (`ctx NN%`) on every turn.
 * When one stays near full and its work suffers, or the person asks, it writes
 * one JSON file into the hive's clear-requests/ folder. Main checks the ask,
 * files it under .done/ or .failed/ with the reason, and an accepted ask takes
 * the road a Codex file too large takes (codexSizeClear.ts): at the agent's
 * next idle moment with nothing queued, the hand off request
 * (switchClear.askedHandoffRequestText), then the engine's clear behind it
 * through the same gate, so it waits for an open sub agent and is never typed
 * over a person's draft. What the agent knew is saved to its last-session.md
 * first (lastSession.ts). The setting for a switch of work plays no part.
 *
 * REFUSED: the orchestrator itself, an agent the floor does not know or has
 * archived, one with no terminal, an engine that cannot be cleared, an ask
 * already open for the agent, and a second ask within ASKED_CLEAR_GAP_MS.
 *
 * No electron import, no fs import: main, the window and the tests share it.
 */
import type { SwitchPhase, TypedKind } from './switchClear';

/** The folder in the hive root the orchestrator writes its asks into. */
export const CLEAR_REQUESTS_DIR = 'clear-requests';

/** One accepted ask per agent in this long. */
export const ASKED_CLEAR_GAP_MS = 30 * 60_000;

/** The largest request file read. */
export const CLEAR_REQUEST_MAX_BYTES = 64 * 1024;

/** An agent id as the hive writes them. */
const AGENT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export type ParsedClearRequest = { ok: true; agent: string; reason: string } | { ok: false; error: string };

/** Read one request. The agent is its "agent" field, else the file's name. */
export function parseClearRequest(raw: unknown, fileName: string): ParsedClearRequest {
  const o = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : null) as { agent?: unknown; reason?: unknown } | null;
  if (!o) return { ok: false, error: 'The file is not a JSON object.' };
  const fromName = fileName.replace(/\.json$/i, '');
  const agent = typeof o.agent === 'string' && o.agent.trim() ? o.agent.trim() : fromName;
  if (!AGENT_ID.test(agent)) return { ok: false, error: 'Name the agent by its id in "agent".' };
  const reason = typeof o.reason === 'string' ? o.reason.replace(/\s+/g, ' ').trim().slice(0, 300) : '';
  return { ok: true, agent, reason };
}

/** What main knows of the agent when an ask arrives. */
export interface AskFacts {
  isGod: boolean;
  /** In the registry and not archived. */
  known: boolean;
  /** It has a live terminal. */
  live: boolean;
  /** The engine has a clear command, and hooks the app hears a turn end from. */
  canClear: boolean;
}

/** What main knows when the window asks for the hand off request. */
export interface AskedHandoffFacts {
  phase: SwitchPhase;
  openBackground: number;
  canClear: boolean;
}

/** The outcomes of the submit door (providerAutomation SubmitOutcome). */
type Outcome = 'submitted' | 'unconfirmed' | 'stuck' | 'held' | 'gone';

export class AskedClear {
  /** Agents with an accepted ask whose clear has not been typed yet. */
  private open = new Set<string>();
  /** When each agent's last ask was accepted. */
  private askedAt = new Map<string, number>();

  constructor(private now: () => number = Date.now) {}

  /** Why this ask is refused, in words the orchestrator reads, or null. */
  refusal(agentId: string, f: AskFacts): string | null {
    if (f.isGod) return 'You cannot clear yourself.';
    if (!f.known) return 'No agent on the floor has this id.';
    if (!f.live) return 'This agent has no terminal open.';
    if (!f.canClear) return 'This agent\'s engine cannot be cleared by the app.';
    if (this.open.has(agentId)) return 'A clear for this agent is already waiting.';
    const last = this.askedAt.get(agentId);
    if (last !== undefined && this.now() - last < ASKED_CLEAR_GAP_MS) return 'This agent was cleared on your ask less than 30 minutes ago.';
    return null;
  }

  /** Accept an ask. Call only when `refusal` answered null. */
  ask(agentId: string): void {
    this.open.add(agentId);
    this.askedAt.set(agentId, this.now());
  }

  due(agentId: string): boolean {
    return this.open.has(agentId);
  }

  /** The agents with an ask still waiting. */
  waiting(): string[] {
    return [...this.open];
  }

  /** May main hand out the hand off request now? As for a file too large:
   *  no hand off already out, and no sub agent open. */
  handoffDue(agentId: string, f: AskedHandoffFacts): boolean {
    if (!this.open.has(agentId) || !f.canClear) return false;
    if (f.phase === 'asked') return false;
    return f.openBackground === 0;
  }

  /** Something went through the submit door. True, once, when it was the
   *  clear for a waiting ask. */
  noteTyped(agentId: string | undefined, kind: TypedKind, outcome: Outcome, pressOnly = false): boolean {
    if (!agentId || pressOnly || kind !== 'clear' || outcome === 'held' || outcome === 'gone') return false;
    return this.open.delete(agentId);
  }

  /** The agent's terminal closed: its waiting ask goes; the 30 minutes stay. */
  forget(agentId: string): void {
    this.open.delete(agentId);
  }
}
