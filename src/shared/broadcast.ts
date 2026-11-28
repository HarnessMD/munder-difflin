/**
 * Broadcast fan-out target selection.
 *
 * Kept as a pure function (and out of `hive.ts`) so the rule is testable on its
 * own, the way `queueDelivery` / `codexRemote` are.
 */

import { isLive } from './agentLive';

/** The subset of a registry agent that fan-out actually looks at. */
export interface BroadcastCandidate {
  /** Michael's prep assistant — send-only, drains no inbox. */
  isAssistant?: boolean;
  /** PTY tab closed; the record is retained but the agent is not live. */
  archived?: boolean;
  /** No terminal and nobody chose that (0.5.8, agentLive.ts): not live either. */
  stopped?: boolean;
  /** The operator has this agent 1:1 and god has been told to leave it alone —
   *  mail landing in its inbox is the dispatch the hold exists to stop. */
  onHold?: boolean;
}

/**
 * The agents a `to: 'broadcast'` message fans out to.
 *
 * Excluded: the sender itself, the send-only prep assistant (direct mail to it
 * would rot unread), archived agents (no live PTY), and held agents (the
 * operator's "1:1 with the human" claim — routing around them is exactly what
 * setAgentHold patches fleet.json early to achieve).
 *
 * NOT excluded: providers without a hook/proxy bridge. Fan-out used to gate on
 * `canReceiveInbox`, which meant an agent on a hookless provider — `custom`,
 * i.e. any CLI the presets don't know — silently never heard a broadcast, even
 * though a DIRECT message to that same agent was delivered fine. That asymmetry
 * was the bug: `deliver` already routes a hookless target through
 * `emitTerminalHandoff` (a terminal work order) and only bounces to the god when
 * the renderer is unavailable. Fan-out now selects the same agents direct mail
 * can reach, and that existing per-target path decides HOW each one is served.
 *
 * The trade-off this accepts: with the renderer down, a broadcast to N hookless
 * agents produces N bounces to the god instead of silence. That is the same
 * behaviour N direct messages already produce, and it is the loud failure —
 * nothing is dropped without the god being told.
 */
export function selectBroadcastTargets(
  agents: Record<string, BroadcastCandidate | undefined>,
  fromId: string
): string[] {
  return Object.keys(agents).filter((id) => {
    const agent = agents[id];
    if (!agent) return false;
    if (id === fromId) return false;
    if (agent.isAssistant) return false;
    if (!isLive(agent)) return false;
    if (agent.onHold) return false;
    return true;
  });
}

/**
 * The agents a broadcast skipped ONLY because the operator holds them. Held
 * agents are left out rather than queued: queued mail would reach them mid 1:1
 * through the Stop hook drain. So nothing is dropped in silence, the router
 * writes one log.jsonl line per such broadcast (kind 'broadcast-skip-held',
 * the message id and these ids, never the text).
 */
export function heldBroadcastSkips(
  agents: Record<string, BroadcastCandidate | undefined>,
  fromId: string
): string[] {
  return Object.keys(agents).filter((id) => {
    const agent = agents[id];
    return !!agent && id !== fromId && !agent.isAssistant && isLive(agent) && !!agent.onHold;
  });
}
