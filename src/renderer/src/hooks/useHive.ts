import { useEffect, useRef } from 'react';
import { useStore, type Agent, type QueuedMessage, type StationKind, type ToolKind } from '@/store/store';
import { startedRowPatch } from './startedRow';
import {
  buildSpawnCommand,
  ASSISTANT_MODEL,
  inferAgentProvider,
  isClaudeProvider,
  tokenizeCommand,
  type HarnessConfig
} from '@/store/config';
import {
  clearCommandForProvider,
  compactionCommandForProvider,
  isCompactionCommand,
  remoteControlCommandForProvider,
  promptTail,
  tailMatches,
  wakeOptionsFor,
  type SubmitResult
} from '../../../shared/providerAutomation';
import { type ContextRule } from '../../../shared/triggers';
import type { AgentProvider } from '../../../shared/agentProvider';
import { bridgeOf, providerPreset } from '../../../shared/agentProvider';
import { isDurableRole, preferredAgentRole, roleForHiveSpawn } from '../../../shared/agentRole';
import { inboxNudgeText, isInboxNudge, wakesReceiver } from '../../../shared/hiveNudge';
import { isHandoffRequest } from '../../../shared/switchClear';
import { isSteer } from '../../../shared/inboxThread';
import { sizeClearReady } from '../../../shared/codexSizeClear';
import { commandWithModel } from '../../../shared/liveModel';
import { effectiveGodCommand } from '../../../shared/godCommand';
import { agentExitOf } from '../../../shared/agentExit';
import { godRunning, refusedBecauseAlive } from '../../../shared/godBoot';
import { resolveGodName } from '../../../shared/godIdentity';
import { resolveResponder } from '../../../shared/responder';
import { RESPONSE_STYLE_TAG, renderResponseStyle } from '../../../shared/responseStyle';
import { acquireTerminal, resetTerminal, isTerminalAutomationSafe, terminalAutomationBlockFor } from '@/components/terminalPool';
import { TURN_END_READING_MS, compactAwaited, decideContextTrigger } from '../../../shared/contextTriggerDecide';
import { canDeliverToAgent, canSendNowMidTurn, deliverWithAcknowledgement, promptSeenSince, STUCK_MAX_AUTO_PRESSES, checkPrecondition, FORCE_COMPACT_CARRY_ON, forceCompactDue, statusAfterDelivery, statusWhenBreakerClears, stuckHeadAction, stuckHeadsReleasedBy } from './queueDelivery';
import { forgetExitedTerminals } from '../../../shared/openQuestion';
import { openQuestions } from '@/store/openQuestions';
import { OFFICE_CAST, DEFAULT_CHARACTER } from '@/scene/office/castRoster';
import { terminalWorkOrderPrompt } from '../../../shared/terminalWorkOrder';

const GOD_ID = 'god';
/** Accent palette for MAIN-spawned (voice-hired) agents — picked deterministically
 *  from the agent id so the same agent always gets the same colour. Mirrors the
 *  AddAgentModal palette. */
const SPAWN_ACCENTS = ['coral', 'mint', 'sky', 'lemon', 'lilac', 'peach'] as const;
const GOD_PTY = `pty-${GOD_ID}`;

const REMOTE_CONTROL_SETTLE_MS = 1500;
// Provider-agnostic PTY-quiescence idle fallback (#2e). A non-Claude bridge that
// fires a 'working' event but never its turn-end signal (Stop / session.idle /
// agent_end) would pin the agent 'working' forever → the idle-only inbox-wake nudge
// never fires → a god stops draining mail and the floor stalls. So a 'working'
// agent whose PTY has emitted NOTHING for this window is treated as turn-done and
// flipped idle. A streaming turn (incl. a long tool) keeps emitting bytes → stays
// working; only true silence drifts it idle. Hook events still win — a fresh
// PreToolUse/Stop refreshes status on the next event. Checked on QUIESCE_POLL_MS.
const QUIESCE_IDLE_MS = 12000;
const QUIESCE_POLL_MS = 4000;
// After a god/agent spawn, hold off the inbox-wake + queue-drain typers for this
// long while the readiness handshake + provider-specific boot sequence runs.
const BOOT_GRACE_MS = 35_000;
// Delay before typing a one-time TUI protocol seed into a fresh worker (3b) —
// long enough for the TUI to finish painting and surface any permission prompt.
// submitToPty additionally waits for the terminal's readiness handshake.
const SEED_BOOT_MS = 12_000;

/** Hive-aware / hooks-bridge engines get standing goals via HookServer
 *  (SessionStart + UserPromptSubmit). Cursor and other no-hook engines need the
 *  goal prepended onto queued PTY deliveries so an Edit Agent save still lands
 *  on the next drain cycle without a restart. */
function usesHookStandingGoal(agent: Agent): boolean {
  const provider = inferAgentProvider(agent.command, agent.provider);
  const preset = providerPreset(provider);
  if (preset.hiveAware) return true;
  return bridgeOf(provider)?.kind === 'hooks';
}

/** Prepend `<goal>…</goal>` for engines that cannot inject via hooks. Reads the
 *  live store field, so a just-saved goal is picked up on the next queue flush. */
function withStandingGoal(agent: Agent, text: string): string {
  const goal = agent.goal?.trim();
  if (!goal || usesHookStandingGoal(agent)) return text;
  if (text.includes('<goal>')) return text;
  return `<goal>\n${goal}\n</goal>\n\n${text}`;
}

/** Prepend the house RESPONSE STYLE brief for the same engines, and for the same
 *  reason: cursor and copilot have no hook bridge, so `additionalContext` (which
 *  carries this to claude/codex/gemini/grok on every prompt) never reaches them.
 *  Rendered by the SHARED renderer, never by a copy of the string here, so the
 *  two delivery paths cannot drift apart. Unlike the goal there is always a
 *  brief: an unset value normalizes to the shipped default. */
function withResponseStyle(agent: Agent, text: string, style: string | undefined): string {
  if (usesHookStandingGoal(agent)) return text;
  if (text.includes(`<${RESPONSE_STYLE_TAG}>`)) return text;
  return `${renderResponseStyle(style)}\n\n${text}`;
}

/** Everything a no-hook engine must carry in front of the text we type, in the
 *  same order the hook channel uses (main/hooks.ts): HOW to answer, then WHAT to
 *  do, then the message itself. One helper so neither submit site can pick up
 *  one of the two and forget the other. */
function withStandingContext(agent: Agent, text: string, style: string | undefined): string {
  // A Custom engine may be a shell, where each typed line runs as a command. This stays on the engines we know.
  if (inferAgentProvider(agent.command, agent.provider) === 'custom') return text;
  return withResponseStyle(agent, withStandingGoal(agent, text), style);
}

// The first thing Michael (god) is told on a fresh spawn — orient him and put
// him to work running the floor. Kept terse and action-oriented.
const INITIAL_GOD_PROMPT = [
  "You're online as Michael, the orchestrator of the hive. Get oriented, then start running the floor:",
  '1. Read your memory.md and drain every message in your inbox.',
  '2. Review board.md + tasks.json and the current roster of agents (active vs archived).',
  '3. Check fleet health: read fleet.json in the hive root for every agent\'s live tokens, cost, status, breaker level, and inbox backlog (`claude agents` will NOT show your hive\'s agents). Flag anyone stalled, over-budget, or breaker-armed.',
  '4. Skim COMMANDS.md (hive root) for the Claude Code commands you can use.',
  'Then begin orchestrating: triage requests, delegate work to the team, and keep everyone unblocked. You are fully autonomous — there is no approval queue, so handle tool-permission prompts in this session yourself (the human can approve them remotely from their phone).'
].join('\n');

/**
 * Type a message into an agent's terminal and submit it.
 *
 * Main does the work (src/main/ptySubmit.ts, autosend 0.5.5): one serial chain
 * per terminal, shared with main's own inbox nudge so the two can never jam
 * their text together; the readiness wait; the bytes each CLI needs (for Claude,
 * small bracketed pastes and CSI u Enter, because the CLI reads any 64 bytes of
 * plain input as a paste and a Return inside a paste is a newline); proof from
 * the CLI's own UserPromptSubmit hook; a key press again, alone, when there is
 * none; and one log.jsonl line per delivery.
 *
 * Throws when the terminal is gone, never became ready, or a write failed
 * (#36: a dead pty must not look delivered). Otherwise returns the outcome.
 */
async function submitToPty(
  ptyId: string,
  text: string,
  provider: AgentProvider,
  opts: { agentId?: string; source: 'queue' | 'seed' | 'god-boot' | 'remote-control'; settleMs?: number; idle?: boolean; pressOnly?: boolean; person?: boolean; ref?: string }
): Promise<SubmitResult> {
  const res = await window.cth.submitToPty({ ptyId, text, provider, ...opts, settleMs: opts.settleMs ?? 250 });
  if (!res?.ok || !res.result) throw new Error(res?.error ?? `pty submit failed: ${ptyId}`);
  if (res.result.outcome !== 'submitted') {
    console.warn(`[queue] ${ptyId}: ${opts.source} delivery ${res.result.outcome} after ${res.result.presses} presses`);
  }
  return res.result;
}

/** A late proof (autosend, 0.5.5): the CLI reported a prompt whose tail
 *  matches a queue head marked stuck, so that message did go after all (a slow
 *  machine, or the person pressed Return in the terminal). Settle it as sent
 *  and let the queue move. */
function releaseStuckByProof(fromAgent: string | undefined, tail: string): void {
  const st = useStore.getState();
  for (const { queueId, messageId } of stuckHeadsReleasedBy(st.messageQueues, fromAgent, tail, Date.now(), tailMatches)) {
    st.settleHumanSend(queueId, messageId, 'delivered');
    st.removeQueuedMessage(queueId, messageId);
  }
}

/** A person's sends that left with no proof, per agent: a late prompt from the CLI still moves one to delivered. */
const unproved = new Map<string, Array<{ queueId: string; messageId: string; tail: string }>>();
const UNPROVED_KEPT = 8;

/** Per terminal, the queued send main is submitting now: pty:began marks it typing (Pam b6g, Home words 1). */
const submitting = new Map<string, { queueId: string; messageId: string }>();

/**
 * Prompts the CLI reported that no row was waiting for, per agent. A hook can reach this window after main has
 * returned on the screen's word and before the send's acknowledge has run (A5). There is no row yet for
 * proveLate to find, so the prompt is kept here for that acknowledge to read.
 */
const promptsSeen = new Map<string, Array<{ tail: string; at: number }>>();
const PROMPTS_SEEN_KEPT = 8;

function keepPrompt(fromAgent: string | undefined, tail: string): void {
  if (!fromAgent) return;
  promptsSeen.set(fromAgent, [...(promptsSeen.get(fromAgent) ?? []), { tail, at: Date.now() }].slice(-PROMPTS_SEEN_KEPT));
}

/** Did the CLI report this send's prompt before its acknowledge ran? A prompt proves one send, so it is used up. */
function provedBeforeAcknowledge(agentId: string, tail: string, since: number): boolean {
  const seen = promptsSeen.get(agentId);
  if (!seen) return false;
  const at = promptSeenSince(seen, tail, since, tailMatches);
  if (at < 0) return false;
  seen.splice(at, 1);
  return true;
}

/** No proof this long after a send, from a CLI that reports its prompts: Not delivered. Proof came 55 to 93 s late under load (Pam, R1). */
const NOT_DELIVERED_AFTER_MS = 180_000;

/**
 * Is this send's prompt in the agent's own session file, typed after `since`? A hook can be lost in a CLI too slow
 * to send it in time (Pam b8r6: none came for 7 minutes, the session holds the prompt), so Not delivered never rests
 * on the hook alone. Read through the History tab's reader, by agent id; nothing of the text leaves this check.
 */
async function promptInSession(agentId: string, tail: string, since: number): Promise<boolean> {
  try {
    const page = await window.cth.historyPage({ agentId, limit: 150 });
    return page.ok && page.items.some((i) => i.kind === 'user' && i.at !== null && i.at >= since - 2_000 && !i.truncated && tailMatches(promptTail(i.text), tail));
  } catch {
    return false;
  }
}

/** Say Not delivered on a send still unproved after NOT_DELIVERED_AFTER_MS, unless its session holds the prompt.
 *  It stays unproved: a late prompt moves it on. */
function notDeliveredLater(agentId: string, queueId: string, messageId: string, tail: string, typedAt: number): void {
  const sentStill = (): boolean => !!unproved.get(agentId)?.some((r) => r.messageId === messageId)
    && useStore.getState().sentLog[queueId]?.find((e) => e.id === messageId)?.status === 'sent';
  setTimeout(() => {
    if (!sentStill()) return;
    void promptInSession(agentId, tail, typedAt).then((inSession) => {
      if (!sentStill()) return;
      if (inSession) {
        const left = (unproved.get(agentId) ?? []).filter((r) => r.messageId !== messageId);
        if (left.length) unproved.set(agentId, left);
        else unproved.delete(agentId);
      }
      useStore.getState().settleHumanSend(queueId, messageId, inSession ? 'delivered' : 'failed');
    });
  }, NOT_DELIVERED_AFTER_MS);
}

/** Settle the rows this late prompt proves. False when it proved none. */
function proveLate(fromAgent: string | undefined, tail: string): boolean {
  const rows = fromAgent ? unproved.get(fromAgent) : undefined;
  if (!fromAgent || !rows) return false;
  const st = useStore.getState();
  const left = rows.filter((r) => {
    if (!tailMatches(tail, r.tail)) return true;
    st.settleHumanSend(r.queueId, r.messageId, 'delivered');
    return false;
  });
  if (left.length) unproved.set(fromAgent, left);
  else unproved.delete(fromAgent);
  return left.length < rows.length;
}

/** Wrap a user message as an enrich task for the assistant. The assistant's
 *  system prompt has the full instructions; this just frames the one task. */
function enrichTaskPrompt(text: string): string {
  return [
    `ENRICH TASK: ${text}`,
    '',
    '(Identify the relevant project, cd in, gather READ-ONLY context, then send the improved,',
    'self-contained prompt to Michael via an outbox message with "to":"god". Do not do the task yourself.)'
  ].join('\n');
}

/** Tool name → where the avatar walks + what it carries. */
const TOOL_STATION: Record<string, { station: StationKind; carry?: ToolKind }> = {
  Read: { station: 'shelf', carry: 'Read' },
  Edit: { station: 'desk', carry: 'Edit' },
  Write: { station: 'desk', carry: 'Write' },
  Bash: { station: 'terminal', carry: 'Bash' },
  Grep: { station: 'shelf', carry: 'Grep' },
  Glob: { station: 'shelf', carry: 'Glob' },
  WebFetch: { station: 'web', carry: 'WebFetch' },
  WebSearch: { station: 'web', carry: 'WebSearch' },
  TodoWrite: { station: 'board', carry: 'TodoWrite' },
  // #5A — delegating to a sub-agent reads as "handing off at the outbox".
  Task: { station: 'mailbox', carry: 'TodoWrite' }
};

/** Resolve a tool name to its station/glyph. Falls back: any `mcp__*` tool →
 *  the MCP station (previously these silently sat at the desk, #5A gap); anything
 *  else → the desk. */
function stationForTool(tool: string): { station: StationKind; carry?: ToolKind } {
  if (TOOL_STATION[tool]) return TOOL_STATION[tool];
  if (tool.startsWith('mcp__')) return { station: 'mcp', carry: 'MCP' };
  // Heuristic fallback for non-Claude tool names (Antigravity sends run_command,
  // ListDir, write_file, … — its hook names differ from Claude's exact tags).
  // Match write/edit BEFORE read so "write_file" → desk, not shelf.
  const t = tool.toLowerCase();
  if (/command|bash|shell|exec|terminal|run_/.test(t)) return { station: 'terminal', carry: 'Bash' };
  if (/web|fetch|browser|http|url/.test(t)) return { station: 'web', carry: 'WebFetch' };
  if (/write|edit|create|patch|replace|apply/.test(t)) return { station: 'desk', carry: 'Write' };
  if (/read|list|view|dir|glob|grep|search|find|file|cat|\bls\b/.test(t)) return { station: 'shelf', carry: 'Read' };
  return { station: 'desk' };
}

/**
 * The renderer-side glue for the hive:
 *   1. spawns the god agent into Michael's room when none is running,
 *   2. drives avatar state from real Claude Code hook events, and
 *   3. wakes idle agents that have unread inbox messages so collaboration
 *      doesn't stall while an agent sits at its prompt.
 */
/** Which agents have a multiple choice question open (0.5.3 bug 19): store/openQuestions.ts. */

export function useHive(config: HarnessConfig | null): void {
  // Per-agent dedup for the inbox-wake nudge: every inbox message id we have
  // already nudged this agent about. A SET, not a high-water mark.
  //
  // This used to hold one string — the lexicographically largest id in the inbox,
  // read as "the newest". Message ids are usually `<timestamp>-<rand>`, so that
  // held, but an agent may set its own `id` in the outbox JSON and the hive keeps
  // it verbatim (hive.ts normalize: `partial.id ?? ...`). One such id in god's
  // inbox — `dev15-progress-canvas-v4` — sorts above EVERY `2026-*` timestamp and
  // never drains, so the "newest" id was frozen on it: Michael was nudged once per
  // app launch and then never again, however much real mail piled up behind it.
  // Tracking the ids we have seen has no such ordering assumption, and it keeps
  // the property the high-water mark was there for: draining removes ids from the
  // INBOX without adding anything new, so a drain still produces no nudge.
  //
  // Note what this set does NOT do: it never shrinks. Ids accumulate for the life
  // of the window (a restart clears it), because forgetting an id we have already
  // nudged for would re-nudge the moment that message reappeared in a listing. The
  // cost is a few tens of bytes per message, which for a 24/7 floor is real but
  // negligible next to a stalled agent. Evicting ids that have left the inbox would
  // bound it exactly; deliberately not done here to keep this fix minimal.
  const nudged = useRef<Record<string, Set<string>>>({});
  // Per-agent context size at the last auto-/compact queued. See the latch note
  // in the context-trigger effect: an idle agent's token count is frozen, so
  // without this the pressure gate re-fires on the identical number every cycle.
  const lastCompactUsed = useRef<Record<string, number>>({});
  // When a compact was typed into each agent, until its CLI says it ended (PostCompact, SessionStart). One
  // need, one compact: the turn end road queues no other meanwhile (contextTriggerDecide.ts compactAwaited).
  const compactTypedAt = useRef<Record<string, number>>({});
  // Per-agent timestamp of the last queued-message we submitted. Guards against
  // re-sending the next message before the agent's hooks have flipped it to
  // 'working' (there's a short window where it still reads 'idle' right after we
  // type into it). One message per cooldown keeps delivery strictly one-by-one.
  const lastFlush = useRef<Record<string, number>>({});
  // Queue-drain delivery tracking (#36): a message now stays IN the queue until
  // its PTY write chain resolves, so `inFlightSends` (message ids mid-write)
  // stops a store-update burst from double-sending the head, and `sendFailures`
  // bounds retries — after MAX_SEND_ATTEMPTS failed writes the message is
  // dropped WITH a console.warn instead of being silently destroyed.
  const inFlightSends = useRef<Set<string>>(new Set());
  const queueInFlight = useRef<Set<string>>(new Set());
  const sendFailures = useRef<Record<string, number>>({});
  // In-flight spawn guard so a re-render / StrictMode double-mount can't spawn
  // Michael twice (the window between the listPtys check and spawnPty is racy).
  const godSpawning = useRef(false);
  // Per-agent timestamp until which auto-typers (inbox-wake #3, queue-drain #4)
  // must leave the agent alone — set while its boot sequence is typing so nothing
  // collides with /remote-control + the orientation prompt.
  const bootGraceUntil = useRef<Record<string, number>>({});
  // Agents whose one-time TUI protocol seed (Crush, seedDelivery:'type-into-tui')
  // has already been typed — guards effect #3b against re-seeding. (ondev-b)
  const seeded = useRef<Set<string>>(new Set());
  const seenTerminalHandoffs = useRef<Set<string>>(new Set());
  // Per-pty timestamp guarding auto-revive (effect #7) against a double-respawn
  // when power-resume + screen-unlock arrive back-to-back: an id revived (or
  // mid-revive) within REVIVE_DEBOUNCE_MS is skipped. Set BEFORE the async spawn
  // so a re-entrant event can't race a second respawn for the same id.
  const reviving = useRef<Record<string, number>>({});
  // Reactive so the assistant bootstrap (effect #1b) re-runs once Michael is ready.
  const godStatus = useStore((s) => s.godStatus);
  // Per-pty `lastOutputAt`, refreshed by the quiescence sweep (#2e) and read by
  // the queue drain (#4) so it can tell a terminal parked at its prompt from one
  // mid-turn. Kept here rather than fetched again in #4 — #2e already polls
  // listPtys on exactly the cadence the drain needs, and one reading keeps the
  // two loops from disagreeing about whether an agent is quiet.
  const ptyLastOutput = useRef<Record<string, number>>({});
    /** How long this terminal has been silent, or null when we have no reading
   *  (never polled, PTY gone, or it has emitted nothing at all). canDeliverToAgent
   *  fails closed on null — unmeasured silence is not evidence of silence.
   *  Hook-level (not effect-local) because both the drain effect and the
   *  context-trigger effect gate delivery through the same check. */
  const ptyQuietMs = (ptyId: string, now: number): number | null => {
    const last = ptyLastOutput.current[ptyId];
    return typeof last === 'number' && last > 0 ? now - last : null;
  };
  // #5C/#7C.4 — latest circuit-breaker level per agent. When 'constrained'/
  // 'stopped' the avatar is pinned to 'looping' and hook events must NOT flip it
  // back to 'working' (the flicker the spec calls out); only a genuine Stop clears it.
  const breakerLevel = useRef<Record<string, string>>({});
  // The LIVE house response style. Both typing paths below run inside intervals
  // whose effect deps are `[config?.onboardingComplete]`, so reading `config`
  // out of those closures would pin whatever was saved when the interval
  // started, and a Settings edit would not reach cursor/copilot until a restart.
  // App re-renders on every config write (onConfigChanged), so rewriting the ref
  // on each render is what makes "edit it and the next message carries it" true.
  const responseStyle = useRef<string | undefined>(undefined);
  responseStyle.current = config?.responseStyle;
  // The LIVE compact rule, the person's own saved one (0.5.6). A turn end reads
  // it from a listener that was set up once, so it is a ref rewritten on every
  // render, like the style above. Never a default: no saved rule, no compact.
  const compactRule = useRef<ContextRule | undefined>(undefined);
  compactRule.current = config?.contextTrigger?.compact;
  // Set by the context trigger effect (#6). The hook listener (#2) calls it
  // when an agent's turn ends, and the context gauge (#2d) calls it with
  // `late` when a token count lands just after. Null until #6 is up.
  const compactAtTurnEnd = useRef<((agentId: string, late?: boolean) => void) | null>(null);
  // Clear on a switch of work (0.5.6, shared/switchClear.ts). Per agent, the
  // clear command the drain (#4) queued behind a hand off request. Set when the
  // request is typed, gone when the clear is typed or dropped. Main holds the
  // rest of the state (the work, the session clock, open sub agents); a window
  // reload loses only this. The queued clear carries its own mark
  // (QueuedMessage.switchClear), which the reload keeps, so the drain still
  // asks main before it types that clear.
  const switchClears = useRef<Record<string, string>>({});
  /** Is that clear still in the agent's queue? While it is, no compact is
   *  queued for the agent. A clear that left the queue any other way (a person
   *  removed it, three failed sends) ends the wait here. */
  const switchClearPending = (agentId: string): boolean => {
    const clear = switchClears.current[agentId];
    if (!clear) return false;
    if ((useStore.getState().messageQueues[agentId] ?? []).some((m) => m.text === clear)) return true;
    delete switchClears.current[agentId];
    return false;
  };
  // Per agent, a hand off request that was typed and is still in the input
  // box: the queue item it stands at, the wake it stood in for, and its tail.
  const handoffInBox = useRef<Record<string, { itemId: string; wake: string; tail: string }>>({});
  /** The hand off request went in. Its clear goes to the back of the queue,
   *  then the wake it stood in for, so the order is hand off, clear, wake. The
   *  queue types the clear when the hand off turn has ended, at an idle prompt
   *  like any message, and asks main first (hive:switchClearGate). A Codex
   *  file too large has no wake to follow: an empty one is not queued (the
   *  store drops empty text). */
  const queueSwitchClear = (a: Agent, wake = ''): void => {
    const clear = clearCommandForProvider(inferAgentProvider(a.command, a.provider));
    const { enqueueMessage } = useStore.getState();
    if (clear) { switchClears.current[a.id] = clear; enqueueMessage(a.id, clear, { switchClear: true }); }
    enqueueMessage(a.id, wake, { precondition: 'inbox-nonempty' });
  };
  // A Codex conversation file past 100 MB (0.5.6, shared/codexSizeClear.ts).
  // The agents main last said were too large: tried on main's word and again at
  // each turn end, until main says no hand off is due.
  const codexSizeDue = useRef<Set<string>>(new Set());
  // Of those, the agents the orchestrator asked to clear (shared/askedClear.ts):
  // the same road on any engine that can be cleared.
  const askedClearDue = useRef<Set<string>>(new Set());
  /** At the next idle moment (no turn open, nothing queued), queue the hand off
   *  request main writes, and the clear behind it as a switch of work does. The
   *  drain types both at an idle prompt; the clear asks main's gate first. */
  const queueCodexSizeClear = async (agentId: string): Promise<void> => {
    const ready = (): Agent | undefined => {
      const { agents, messageQueues } = useStore.getState();
      const a = agents.find((x) => x.id === agentId);
      if (!a?.ptyId || a.sleeping || a.status === 'sleeping') return undefined;
      const idle = canDeliverToAgent(a.status, ptyQuietMs(a.ptyId, Date.now()), QUIESCE_IDLE_MS, openQuestions.isOpen(a.id), !!a.exit);
      return sizeClearReady({ provider: inferAgentProvider(a.command, a.provider), idle, queued: (messageQueues[a.id] ?? []).length, asked: askedClearDue.current.has(a.id) }) ? a : undefined;
    };
    if (!ready()) return;
    const handoff = await window.cth.hiveCodexSizeClearText(agentId).catch(() => null);
    if (!handoff) { codexSizeDue.current.delete(agentId); askedClearDue.current.delete(agentId); return; }
    // Still idle with nothing queued after the ask: else the next turn end.
    const a = ready();
    if (!a) return;
    useStore.getState().enqueueMessage(a.id, handoff);
    queueSwitchClear(a);
  };

  // 0) Heal roster `description` from hive `role` when the floor caption was
  //    overwritten by a status string ("on standby") after hire.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    void window.cth.hiveRegistry().then((reg) => {
      const roles: Record<string, string> = {};
      for (const [id, entry] of Object.entries(reg.agents ?? {})) {
        if (typeof entry.role === 'string' && entry.role.trim()) roles[id] = entry.role.trim();
      }
      useStore.getState().syncDescriptionsFromRoles(roles);
      const { agents, archivedAgents } = useStore.getState();
      for (const a of [...agents, ...archivedAgents]) {
        const next = preferredAgentRole(a.description, roles[a.id], !!a.isGod);
        if (isDurableRole(next) && next !== roles[a.id]) {
          void window.cth.hivePatchAgentRole(a.id, next);
        }
      }
    }).catch(() => { /* hive not ready yet */ });
  }, [config?.onboardingComplete]);

  // Sleep is owned by main; opening a terminal never asks for a start.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    let stopped = false;
    const read = () => { void window.cth.hiveRegistry().then((reg) => {
      if (stopped) return;
      for (const row of useStore.getState().agents) {
        const fact = reg.agents[row.id] as { sleeping?: boolean; waking?: boolean } | undefined;
        const asleep = fact?.sleeping === true;
        const waking = fact?.waking === true;
        if (row.sleeping !== asleep || !!row.waking !== waking) useStore.getState().updateAgent(row.id, {
          sleeping: asleep, waking, ...(asleep ? { exit: undefined, status: 'sleeping', action: 'Sleeping' } : row.status === 'sleeping' ? { status: 'idle', action: 'idle' } : {})
        });
      }
    }).catch(() => {}); };
    read();
    const timer = setInterval(read, 2000);
    return () => { stopped = true; clearInterval(timer); };
  }, [config?.onboardingComplete]);

  // 1) Bootstrap the god agent (source of truth = live PTYs, to dodge restarts).
  useEffect(() => {
    if (!config?.onboardingComplete || !config.harnessHome) return;
    let cancelled = false;
    useStore.getState().setGodStatus('booting');
    const t = setTimeout(async () => {
      if (cancelled) return;
      // A listing that FAILED is not an empty floor (shared/godBoot.ts). It used to
      // be read as "he is not running": his row was removed, a second spawn was
      // refused by main as a duplicate, and the floor said "failed" with no
      // orchestrator row while he was alive. 'unknown' falls through to the spawn
      // attempt below, where main's own refusal settles it, and his row is not
      // touched until a spawn has actually worked.
      const listing = await window.cth.listPtys().then(
        (l) => ({ answered: true, ids: l.map((p) => p.id) }),
        () => ({ answered: false, ids: [] as string[] })
      );
      if (godRunning(listing, GOD_PTY) === 'yes') { // already running — keep restored entry
        if (!cancelled) useStore.getState().setGodStatus('ready');
        return;
      }
      // Dev switch (main: `--no-god`): a UI check must not spend money on an
      // orchestrator it will never talk to. `ready` with no god on the floor
      // is the honest state: nothing is booting, nothing failed.
      if (await window.cth.devNoGod?.().catch(() => false)) {
        if (!cancelled) useStore.getState().setGodStatus('ready');
        return;
      }
      // Synchronous guard (no await between check and set) → exactly one spawn.
      if (cancelled || godSpawning.current) return;
      godSpawning.current = true;
      // A prior rename (Edit Agent panel → renameAgent() → hive.ts's renameAgent())
      // persists straight into registry.json, so read it back here rather than
      // hardcoding DEFAULT_GOD_NAME below — otherwise a custom name reverts on
      // every respawn even though the registry still has it right.
      const reg = await window.cth.hiveRegistry().catch(() => null);
      const godName = resolveGodName(reg?.agents?.[GOD_ID]?.name);

      const godProvider = config.godProvider ?? 'claude';
      const godModel = config.godModel;
      // A hand edited line wins over the derived one (0.5.3 bug 20).
      const command = effectiveGodCommand(config.godCommand, buildSpawnCommand(config, godModel, godProvider), godProvider);
      const [exe, ...args] = tokenizeCommand(command.trim());
      const res = await window.cth.spawnPty({
        id: GOD_PTY,
        cwd: config.harnessHome!,
        command: exe,
        provider: godProvider,
        args,
        cols: 100,
        rows: 30,
        // Restore Michael's prior conversation across an app restart. His session
        // id lives in the hive registry (recorded from his hooks), so the main
        // process attaches `--resume <id>`; a missing transcript falls back to a
        // fresh session. Without this the most important context on the floor —
        // the orchestrator's — was lost on every restart.
        resume: true,
        hive: { id: GOD_ID, name: godName, provider: godProvider, cwd: config.harnessHome!, isGod: true, role: 'orchestrator (god)' }
      });
      if (cancelled) { godSpawning.current = false; return; }
      const god: Agent = {
        id: GOD_ID,
        name: godName,
        character: 'michael',
        accent: 'lemon',
        description: 'Runs the office, sorts requests, and asks you only about critical calls.',
        project: 'hive',
        tmuxTarget: '',
        cwd: config.harnessHome!,
        status: 'idle',
        action: '',
        progress: 0,
        currentStation: 'desk',
        ptyId: GOD_PTY,
        command: command.trim(),
        provider: godProvider,
        model: godModel,
        isGod: true,
        recentTextTs: Date.now()
      };
      if (!res.ok) {
        godSpawning.current = false;
        // Main refusing a duplicate is proof he is ALIVE, whatever the listing
        // said. His restored row stays; if there is none, he gets one. No boot
        // sequence is typed into a session that is already running.
        if (refusedBecauseAlive(res.error)) {
          if (!useStore.getState().agents.some((a) => a.id === GOD_ID)) useStore.getState().addAgent(god, { keepSelection: useStore.getState().selectedId !== null });
          useStore.getState().setGodStatus('ready');
          return;
        }
        useStore.getState().setGodStatus('failed');
        return;
      }
      // Clear any stale restored ROW, and only the row: a message the person
      // parked for Michael before quitting stays in his queue and drains once he
      // is back and idle, like every other agent's (0.5.2; without keepQueue the
      // store dropped it here, persisted, before the row below was re-added).
      // AFTER the spawn worked, never before: see the listing above.
      // He takes the selection back only if he had it: his start is no reason to move anyone else's.
      // With nobody selected he takes it, as before: keepSelection keeps a null now.
      const selectedBefore = useStore.getState().selectedId;
      const godWasSelected = selectedBefore === GOD_ID;
      useStore.getState().removeAgent(GOD_ID, { keepQueue: true });
      useStore.getState().addAgent(god, { keepSelection: selectedBefore !== null && !godWasSelected });
      useStore.getState().setGodStatus('ready');

      // Kick Michael off once his TUI is up. Always re-enable remote control so
      // the human can approve permission prompts from their phone (best-effort — a
      // failed/unknown slash command just prints to his terminal and is harmless).
      // Then, ONLY on a genuinely fresh spawn, hand him the orientation prompt —
      // a RESUMED Michael already has his full context and must not be re-oriented
      // mid-thread (that would reset the floor's situational awareness). Both go
      // through the per-pty submit chain, so they're strictly sequential and can't
      // jam together; the boot-grace window keeps the inbox-wake/drain loops off
      // Michael until he's settled. The live-PTY branch above skips this entirely.
      const resumedGod = res.resumed === true;
      bootGraceUntil.current[GOD_ID] = Date.now() + BOOT_GRACE_MS;
      void (async () => {
        try {
          const remoteCommand = remoteControlCommandForProvider(godProvider, godName);
          if (remoteCommand) {
            // settleMs pauses the chain ~1.5s after /remote-control before the
            // orientation prompt (fresh spawns only) is submitted next. Main types it only at a
            // box it has seen and leaves the menu it can open (ptySubmit.ts). With no box in
            // time it is not typed, and the rest still goes.
            await submitToPty(GOD_PTY, remoteCommand, godProvider, { agentId: GOD_ID, source: 'remote-control', settleMs: REMOTE_CONTROL_SETTLE_MS }).catch(() => undefined);
          }
          if (!cancelled && !resumedGod) {
            // A type-into-tui god (Crush) can't ride its hive protocol on argv, so the
            // main process hands it back as seedPrompt — type it FIRST (identity), then
            // the orientation kick. Serialized by main's per-terminal chain so they can't jam. (ondev-b)
            if (res.seedPrompt) await submitToPty(GOD_PTY, res.seedPrompt, godProvider, { agentId: GOD_ID, source: 'god-boot' });
            await submitToPty(GOD_PTY, INITIAL_GOD_PROMPT, godProvider, { agentId: GOD_ID, source: 'god-boot' });
          }
        } catch { /* PTY may have died during startup */ }
        finally { bootGraceUntil.current[GOD_ID] = 0; }
      })();
    }, 1200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [config?.onboardingComplete, config?.harnessHome]);

  // 2) Drive avatars from real hook events emitted by each agent's shim.
  useEffect(() => {
    return window.cth.onHiveHookEvent((e) => {
      if (!e.agentId) return;
      const { updateAgent, agents } = useStore.getState();
      const self = agents.find((a) => a.id === e.agentId);
      if (!self) return;
      // A hook event is proof of life: whatever died has been replaced.
      if (self.exit) updateAgent(e.agentId, { exit: undefined });
      // Breaker precedence (#5C): a constrained/stopped agent stays 'looping'
      // regardless of in-flight tool/prompt/compact events.
      const blevel = breakerLevel.current[e.agentId];
      const breakerArmed = blevel === 'constrained' || blevel === 'stopped';
      // 0.5.3 bug 19. Fed BEFORE the status chain and outside the breaker guard:
      // the drains ask this tracker directly, so a breaker pinned agent, whose
      // status never leaves 'looping', is held too.
      const question = openQuestions.note(e.agentId, e.event, e.tool);
      // The compact typed into it ended, or a new session began: its need is met.
      if (e.event === 'PostCompact' || e.event === 'SessionStart') delete compactTypedAt.current[e.agentId];
      // Hook events are the authoritative status source for real agents (the
      // pty-stream parser only refines the on-floor action/station).
      if (question === 'open') {
        // A menu is on screen and waiting for a person. Not `working`: the
        // quiescence fallback would turn the menu's silence into `idle`, and
        // `idle` is what lets the drain type. Same split as a permission prompt:
        // only the orchestrator escalates to the human.
        if (!breakerArmed) updateAgent(e.agentId, { status: self.isGod ? 'blocked' : 'waiting', action: 'asking a question', carrying: undefined });
      } else if (e.event === 'PreCompact') {
        // #5C — agent entered /compact; show it's boxing up context, not frozen.
        if (!breakerArmed) updateAgent(e.agentId, { status: 'compacting', action: 'compacting context', carrying: undefined });
      } else if (e.event === 'PostCompact') {
        if (!breakerArmed) updateAgent(e.agentId, { status: 'working', action: 'resumed', carrying: undefined });
      } else if (e.event === 'PreToolUse' && e.tool) {
        const m = stationForTool(e.tool);
        if (!breakerArmed) updateAgent(e.agentId, { status: 'working', currentStation: m.station, carrying: m.carry, action: `using ${e.tool}` });
        useStore.getState().bumpToolCount(e.agentId); // usage proxy for the command center
      } else if (e.event === 'PostToolUse' || e.event === 'UserPromptSubmit') {
        if (e.event === 'UserPromptSubmit' && e.promptTail) {
          releaseStuckByProof(e.agentId, e.promptTail);
          if (!proveLate(e.agentId, e.promptTail)) keepPrompt(e.agentId, e.promptTail);
        }
        // 0.5.6: a hand off request that sat in the input box went after all.
        const boxed = handoffInBox.current[e.agentId];
        if (boxed && e.event === 'UserPromptSubmit' && e.promptTail && tailMatches(e.promptTail, boxed.tail)) {
          delete handoffInBox.current[e.agentId];
          queueSwitchClear(self, boxed.wake);
        }
        // A turn is in progress (prompt submitted / tool just finished) — keep
        // it working so it doesn't flicker idle between tool calls.
        if (!breakerArmed) updateAgent(e.agentId, { status: 'working' });
      } else if (e.event === 'PreInvocation') {
        // Antigravity (agy): the model is being called — it's thinking/working.
        if (!breakerArmed) updateAgent(e.agentId, { status: 'working', action: 'thinking' });
      } else if (e.event === 'PostInvocation') {
        // agy's per-turn boundary. Unlike Claude, agy's Stop fires only on process
        // EXIT, so without this an agy worker would never register as idle and the
        // inbox-wake nudge (idle-only) could never reach it — its mail would sit
        // undrained. Treat it as idle; a follow-up tool/turn re-sets working.
        if (!breakerArmed) updateAgent(e.agentId, { status: 'idle', action: 'idle', carrying: undefined });
        compactAtTurnEnd.current?.(e.agentId);
      } else if (e.event === 'Stop' || e.event === 'SubagentStop') {
        // A blocked Stop means the agent is being re-engaged to process its
        // inbox — it's NOT idle, so keep it working until it genuinely stops.
        if (e.blocked) {
          if (!breakerArmed) updateAgent(e.agentId, { status: 'working', action: 'reading inbox', carrying: undefined });
        } else {
          // A genuine stop clears any breaker override — the run is over.
          breakerLevel.current[e.agentId] = 'healthy';
          updateAgent(e.agentId, { status: 'idle', action: 'idle', carrying: undefined });
          // 0.5.6: the turn ended. An agent at or over its token bar gets its
          // compact queued now (effect 6). Stop only: a subagent finishing is
          // not the end of the agent's own turn.
          if (e.event === 'Stop') compactAtTurnEnd.current?.(e.agentId);
          // A Codex file main said is too large: this turn end may be the moment.
          if (e.event === 'Stop' && codexSizeDue.current.has(e.agentId)) void queueCodexSizeClear(e.agentId);
        }
      } else if (e.event === 'Notification' && !breakerArmed) {
        // Claude Code fires Notification for two very different situations:
        //   1. it genuinely needs the human (a permission / approval prompt), or
        //   2. the prompt has merely gone idle ("Claude is waiting for your
        //      input") — i.e. the agent answered and has nothing queued.
        // Only (1) is a real "needs you". Treating (2) as blocked made Michael
        // march to the door with a red "!" right after finishing, so detect the
        // idle case and let him linger on the floor instead.
        const msg = (e.message ?? '').toLowerCase();
        const idleWaiting = !msg
          || msg.includes('waiting for your input')
          || msg.includes('is idle')
          || msg.includes('waiting for input');
        const needsHuman = msg.includes('permission')
          || msg.includes('approve')
          || msg.includes('confirm')
          || msg.includes('needs your');
        if (needsHuman && !idleWaiting) {
          // Only the god agent escalates to the human; sub-agents are autonomous
          // and read as "waiting" (parked on god, not on you).
          updateAgent(e.agentId, { status: self.isGod ? 'blocked' : 'waiting' });
        } else if (!openQuestions.isOpen(e.agentId)) {
          // Idle notification — responded, nothing to do. Linger, don't flag.
          // Not while a question is open: the same Notification fires for a menu
          // nobody has answered, and that agent is waiting, not idle.
          updateAgent(e.agentId, { status: 'idle', action: 'idle', carrying: undefined });
        }
      }
    });
  }, []);

  // Main has typed the first byte of the send it is submitting there: from now Home says Sent, not Queued.
  useEffect(() => window.cth.onPtyBegan?.((ptyId) => {
    const s = submitting.get(ptyId);
    if (s) useStore.getState().setQueuedMessageTyping(s.queueId, s.messageId);
  }), []);

  // A steer is proved when main has written the hook reply that carries it. Until then it says sent.
  useEffect(() => window.cth.onSteerLanded?.((e) => {
    const st = useStore.getState();
    const row = (st.sentLog[e.agentId] ?? []).find((r) => isSteer(r.id) && r.status === 'sent' && tailMatches(e.tail, promptTail(r.text)));
    if (row) st.settleHumanSend(e.agentId, row.id, 'delivered', Date.now());
  }), []);

  // 2b) Consume circuit-breaker state (#7C.4/#5C). Lane A's breaker policy (#6)
  //     pushes BreakerState on `control:breakerState`; this gives it PRECEDENCE
  //     over hook-derived status: a constrained/stopped agent is pinned to
  //     'looping' (see the breakerArmed guard above) until it genuinely Stops.
  useEffect(() => {
    return window.cth.onBreakerState((s) => {
      breakerLevel.current[s.agentId] = s.level;
      const { updateAgent, agents } = useStore.getState();
      if (!agents.some((a) => a.id === s.agentId)) return;
      if (s.level === 'constrained' || s.level === 'stopped') {
        updateAgent(s.agentId, { status: 'looping', action: s.reason || 'breaker armed', carrying: undefined });
        return;
      }
      // 'healthy'/'steering' clear the pin, and take `looping` off with it: an
      // agent that stopped sends no hook event to do so (queueDelivery.ts).
      const self = agents.find((a) => a.id === s.agentId);
      const cleared = statusWhenBreakerClears(self?.status ?? '', !!self?.exit);
      if (cleared) updateAgent(s.agentId, cleared);
    });
  }, []);

  // 2c) Context gauge backfill: poll each live agent's current context size
  //     (tokens) from its session transcript — only until the status line
  //     (effect 2d) has delivered exact numbers for that agent.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    const poll = async () => {
      const { agents, updateAgent } = useStore.getState();
      for (const a of agents) {
        if (!a.ptyId) continue;
        // The status line pushes exact numbers after every response (effect
        // 2d) — this transcript poll only backfills agents whose status line
        // hasn't fired yet (e.g. freshly restored, no response so far).
        if (a.contextLimit !== undefined) continue;
        try {
          const ctx = await window.cth.agentContext(a.id);
          if (ctx === null) continue;
          // After a window reload the store has no window size, and the sidebar
          // shows no context line without one (Pam, round 8). Main kept the last
          // real size; a guess is never stored, as 200k would misread a 1M window.
          const known = (await window.cth.agentContextLimit?.(a.id).catch(() => null)) ?? null;
          const hinted = /1m/i.test(a.model ?? '') ? 1_000_000 : 200_000;
          const limit = known ?? Math.max(hinted, ctx > 200_000 ? 1_000_000 : 0);
          const progress = Math.max(0, Math.min(8, Math.round((ctx / limit) * 8)));
          updateAgent(a.id, known ? { contextTokens: ctx, contextLimit: known, progress } : { contextTokens: ctx, progress });
        } catch { /* ignore — try again next tick */ }
      }
    };
    const t = setTimeout(poll, 3000); // first fill shortly after boot
    const iv = setInterval(poll, 15000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [config?.onboardingComplete]);

  // 2d) Push-based context gauge: the status-line shim forwards the session's
  //     EXACT context accounting (tokens + real window size) after every
  //     response — no probing, no transcript guesswork.
  // 0.5.3 feature 18: an agent's process ended on its own. The row says so and
  // offers Restart in its details panel. Status goes to idle so the dot and the
  // active count stop claiming work that is no longer happening.
  useEffect(() => {
    return window.cth.onHiveAgentExited?.(({ agentId, exitCode, signal, printMode }) => {
      if (!agentId) return;
      // A print mode run (Copilot -p) that exited 0 finished its task (batch 2).
      const exit = agentExitOf(exitCode, signal, Date.now(), printMode === true);
      useStore.getState().updateAgent(agentId, { exit, status: 'idle', action: exit.verdict, carrying: undefined });
      openQuestions.forget(agentId);
    });
  }, []);

  // The CLI would not reopen this agent's session, so main started it
  // again with none. Not a death: no Crashed row, only the words a Restart that
  // found no session already uses.
  useEffect(() => {
    return window.cth.onHiveAgentStartedFresh?.(({ agentId }) => {
      if (!agentId) return;
      useStore.getState().updateAgent(agentId, { exit: undefined, status: 'idle', action: 'started fresh, last session not found', carrying: undefined });
      openQuestions.forget(agentId);
    });
  }, []);

  useEffect(() => {
    // 0.5.3 bug 2(a): the model the agent is actually running, told to us when it
    // changes. The sidebar is a pure function of the store's `model`, so this is
    // what makes a `/model` inside the CLI show up. The saved command is rewritten
    // with it so the next restore comes back on the same model.
    return window.cth.onHiveModelUpdate(({ agentId, model }) => {
      if (!agentId || typeof model !== 'string' || !model.trim()) return;
      const a = useStore.getState().agents.find((x) => x.id === agentId);
      if (!a || a.model === model) return;
      const provider = inferAgentProvider(a.command, a.provider);
      useStore.getState().updateAgent(agentId, { model, command: commandWithModel(a.command, model, provider) || a.command });
    });
  }, []);

  useEffect(() => {
    return window.cth.onHiveContextUpdate(({ agentId, tokens, limit }) => {
      // Defense-in-depth: the main process already filters limit > 0, but the
      // renderer must not trust IPC blindly — limit 0 would put NaN progress
      // into the store (NaN survives the Math.min/max clamp).
      if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(tokens)) return;
      const progress = Math.max(0, Math.min(8, Math.round((tokens / limit) * 8)));
      useStore.getState().updateAgent(agentId, { contextTokens: tokens, contextLimit: limit, progress });
      // 0.5.6: this count can land a moment after the Stop hook. If the agent's
      // turn just ended, the bar is checked again with it (effect 6).
      compactAtTurnEnd.current?.(agentId, true);
    });
  }, []);

  // 2e) Non-Claude providers cannot drain hive inbox. Direct hive mail to them
  //     arrives here as a terminal work order and is queued through the same
  //     idle-only PTY drain as human-composed messages.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    return window.cth.onHiveTerminalHandoff((msg) => {
      if (seenTerminalHandoffs.current.has(msg.id)) return;
      const { agents, enqueueMessage, messageQueues } = useStore.getState();
      const target = agents.find((a) => a.id === msg.to);
      if (target?.ptyId) {
        const marker = `Message: ${msg.id}`;
        if ((messageQueues[target.id] ?? []).some((queued) => queued.text.includes(marker))) return;
        seenTerminalHandoffs.current.add(msg.id);
        enqueueMessage(target.id, terminalWorkOrderPrompt(msg));
        return;
      }
      seenTerminalHandoffs.current.add(msg.id);
      enqueueMessage(
        GOD_ID,
        [
          `Terminal handoff failed for ${msg.to}: ${msg.subject}`,
          '',
          `Message ${msg.id} from ${msg.from} could not be queued because ${msg.to} has no live PTY. Route it manually or respawn the agent.`
        ].join('\n')
      );
    });
  }, [config?.onboardingComplete]);

  // 2e) PROVIDER-AGNOSTIC PTY-QUIESCENCE IDLE FALLBACK (the linchpin that makes
  //     canReceiveInbox:true safe for the not yet live tested OpenCode/Crush/pi bridges).
  //     Hook events are the authoritative status source, but a bridge whose turn-end
  //     signal (Stop/session.idle/agent_end) doesn't fire leaves the agent pinned
  //     'working' — and BOTH delivery paths (#3 nudge, #4 queue-drain) are idle-gated,
  //     so the agent silently stops draining mail. usePtyParser has a 4s idle drift,
  //     but it's Claude-TUI-tuned AND only runs for the mounted terminal — a
  //     backgrounded god gets none. This is the floor-wide, provider-agnostic backstop:
  //     it reads each live PTY's lastOutputAt (already tracked in the main process) and
  //     flips any 'working' agent quiet for QUIESCE_IDLE_MS to idle so the nudge can
  //     drain it. Safe because a genuinely-working agent (incl. a long streaming tool)
  //     keeps emitting bytes; a false idle self-corrects on the next hook event.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    const iv = setInterval(async () => {
      // A listing that FAILED and a floor with no terminals both used to arrive
      // here as an empty list. They are opposite facts, and the open question
      // holds below must only be dropped on the second one.
      let listed = true;
      const ptys = await window.cth.listPtys().catch(() => { listed = false; return []; });
      const lastOut: Record<string, number> = {};
      for (const p of ptys) lastOut[p.id] = p.lastOutputAt;
      // Publish BEFORE the early return and before the 'working' filter below,
      // so the drain (#4) also gets a reading for breaker-pinned agents — and so
      // a vanished PTY clears its entry instead of leaving a stale one.
      ptyLastOutput.current = lastOut;
      // A terminal that has exited takes its open question with it (B19 follow
      // up). SessionStart clears the flag on a respawn, but an agent that died
      // with a menu up and is never respawned would otherwise keep it. Before the
      // early return: no live terminals at all is exactly when every flag is stale.
      // ONLY ON A LISTING THAT ANSWERED. Dropping a hold is the dangerous
      // direction: it is what lets a delivery press Return into a menu. One
      // failed poll must not be able to do that, so a failure forgets nothing
      // and the next poll, four seconds on, decides.
      forgetExitedTerminals(openQuestions, useStore.getState().agents, { listed, liveIds: new Set(Object.keys(lastOut)) });
      if (!ptys.length) return;
      const now = Date.now();
      const { agents, updateAgent } = useStore.getState();
      for (const a of agents) {
        if (!a.ptyId || a.status !== 'working') continue;
        // Never fight the breaker pin (a constrained/stopped agent stays 'looping')
        // or a still-booting agent (its boot sequence is mid-type).
        const bl = breakerLevel.current[a.id];
        if (bl === 'constrained' || bl === 'stopped') continue;
        if ((bootGraceUntil.current[a.id] ?? 0) > now) continue;
        const last = lastOut[a.ptyId];
        if (typeof last === 'number' && last > 0 && now - last > QUIESCE_IDLE_MS) {
          updateAgent(a.id, { status: 'idle', action: 'idle', carrying: undefined });
        }
      }
    }, QUIESCE_POLL_MS);
    return () => clearInterval(iv);
  }, [config?.onboardingComplete]);

  // 3) Wake agents holding unread inbox messages. The assistant is send-only
  //    (it never receives inbox mail), so it's excluded.
  //
  //    QUEUES the nudge rather than typing it. This loop used to write straight
  //    into the terminal, which made it the one automatic writer that could land
  //    on top of whatever the user was typing — its text fused onto the user's
  //    half-written line and the pair got submitted as one garbled prompt. Going
  //    through the queue means effect #4 owns every decision about when a
  //    terminal may be typed into: idle, off cooldown, past boot grace, delivery
  //    not paused, and no user draft in the way. One gate, one place, and this
  //    loop stops needing prompt logic of its own. /compact (effect #6) has
  //    always worked this way.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    const iv = setInterval(async () => {
      const agents = useStore.getState().agents.filter((a) => a.ptyId);
      for (const a of agents) {
        try {
          // A held agent is the operator's 1:1: no machine wake for it, so a
          // nudge can never fuse onto whatever the human is typing. The inbox
          // itself is untouched — the mail waits for the hold to lift.
          if (a.onHold) continue;
          const inbox = await window.cth.hiveInbox(a.id);
          // Nudge on any id we have not nudged for yet (#130's per-id Set).
          // Draining shrinks the set and introduces nothing new, so this POLL
          // stays quiet; a genuinely new message fires regardless of how its id
          // happens to sort.
          //
          // That reasoning covers the poll only — it does NOT survive the gap
          // between enqueue and delivery, which is why the nudge carries an
          // 'inbox-nonempty' precondition that the drain re-checks before typing.
          // Without it: mail lands and queues a nudge, the already-awake agent
          // drains the whole inbox in that same turn, and the nudge is typed into
          // an empty inbox afterwards — a wasted turn, and the most expensive one
          // on the floor when the agent is god.
          const seen = nudged.current[a.id] ?? (nudged.current[a.id] = new Set());
          const fresh = inbox.filter((m) => m.id && !seen.has(m.id));
          // 26 Oct 2026: a note wakes like any message. Only the app's own
          // notes about a temp wait for the next wake, 30 minutes at most
          // (wakesReceiver). So only mail that wakes queues a nudge.
          //
          // The queue keeps one nudge pending per agent (see enqueueMessage).
          // While one waits, this mail is left unmarked: the wake carries the
          // messages now, so an id marked here with no wake of its own would
          // never be shown to the agent. The waiting wake is written when it
          // is typed and takes this mail with it; if it was typed a moment
          // too early, the next poll queues one for what it missed.
          const waiting = (useStore.getState().messageQueues[a.id] ?? []).some((q) => isInboxNudge(q.text));
          if (!waiting && fresh.some((m) => wakesReceiver(m))) {
            // The absolute inbox path names the file of a message too long to
            // type (#559); a failed lookup still queues the nudge without it.
            const inboxPath = await window.cth.hiveInboxPath(a.id).catch(() => null);
            // The messages themselves, waiting notes included. This copy is
            // what the queue shows; the drain asks main for the text again at
            // the moment it types (hive:wakeText), so what the agent reads is
            // the mail pending then.
            useStore.getState().enqueueMessage(
              a.id,
              inboxNudgeText(fresh, inboxPath, wakeOptionsFor(inferAgentProvider(a.command, a.provider))),
              { precondition: 'inbox-nonempty' }
            );
            for (const m of fresh) seen.add(m.id);
          }
        } catch { /* ignore */ }
      }
    }, 4000);
    return () => clearInterval(iv);
  }, [config?.onboardingComplete]);

  // 3b) Seed a fresh "type-into-tui" worker (Crush) with the hive protocol. Its
  //     bare TUI rejects a positional seed (Cobra reads it as a subcommand →
  //     `Unknown command`), so the main process spawns it bare and hands the
  //     protocol back as `seedPrompt`; we TYPE it as the worker's first turn after a
  //     boot-grace (TUI finished painting), ONCE per agent. Routed through the SAME
  //     per-pty submit chain + boot-grace as the inbox-wake nudge so the seed and a
  //     nudge can never jam onto one line. (god-as-Crush is seeded in its own boot
  //     sequence above; this covers workers.) (ondev-b)
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    const iv = setInterval(() => {
      const { agents, updateAgent } = useStore.getState();
      for (const a of agents) {
        if (a.sleeping || !a.ptyId || a.isGod || !a.seedPrompt || seeded.current.has(a.id)) continue;
        seeded.current.add(a.id);
        const ptyId = a.ptyId;
        const seed = a.seedPrompt;
        // Hold the nudge/quiesce typers off this agent until the seed lands + settles.
        bootGraceUntil.current[a.id] = Date.now() + BOOT_GRACE_MS;
        // Clear the record now so it isn't re-seen (the ref also guards) or persisted.
        updateAgent(a.id, { seedPrompt: undefined });
        setTimeout(() => {
          // Permission-prompt safety (#5): if the worker surfaced an approval /
          // needs-human prompt while its TUI booted ('waiting'/'blocked'), the
          // seed's trailing Enter would confirm it. Put the seed back and let a
          // later tick retry once the prompt clears; if the agent vanished
          // (killed mid-boot), don't type into its orphaned pty at all.
          const live = useStore.getState().agents.find((x) => x.id === a.id);
          if (!live) return;
          if (live.status === 'waiting' || live.status === 'blocked') {
            seeded.current.delete(a.id);
            useStore.getState().updateAgent(a.id, { seedPrompt: seed });
            return;
          }
          submitToPty(
            ptyId,
            withStandingContext(live, seed, responseStyle.current),
            inferAgentProvider(live.command, live.provider),
            { agentId: live.id, source: 'seed' }
          )
            .catch(() => { /* pty may have died */ });
        }, SEED_BOOT_MS);
      }
    }, 1500);
    return () => clearInterval(iv);
  }, [config?.onboardingComplete]);

  // 4) Drain each agent's queued messages to its terminal, one at a time, the
  //    moment the agent goes idle. This is what lets the user keep sending
  //    messages while the agent's "cloud terminal" is mid-run: the messages
  //    park in the store and get typed in (and submitted) as soon as it's free.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    const FLUSH_COOLDOWN_MS = 4500;
    // A message that fails this many PTY writes (dead/crashed pty that the store
    // still thinks is idle) is dropped WITH a console.warn — bounded so the drain
    // never spins forever on a corpse, loud so the loss is diagnosable. (#113)
    const MAX_SEND_ATTEMPTS = 3;
    // Held across a re-run of this effect: a drain started before it is still typing, and a new set would let the
    // next pass type the same head again (Creed, 54076318: one message typed twice 2 s apart after a restart).
    const inFlight = queueInFlight.current;
    const sendFailures: Record<string, number> = {};
    // Force compact: the queued compacts Escape was pressed for, by message
    // id, so one is pressed for once and gets its carry on once delivered.
    const forced = new Map<string, number>();

    // Stop a busy agent's turn so its waiting compact runs (forceCompactDue).
    // Marked before the first await, so the next pass cannot press again; a
    // guard that holds it unmarks it, and a later pass tries again.
    const pressForCompact = async (a: Agent, head: QueuedMessage): Promise<void> => {
      forced.set(head.id, Date.now());
      const ptyId = a.ptyId;
      const control = await window.cth.controlSnapshot(a.id).catch(() => null);
      const now = Date.now();
      const held = !ptyId || !control || control.paused || control.halted || control.autoDeliveryPaused
        || (bootGraceUntil.current[a.id] ?? 0) >= now
        // A draft the person is writing, or a menu they opened: Escape is theirs.
        || !isTerminalAutomationSafe(ptyId, now)
        || useStore.getState().messageQueues[a.id]?.[0]?.id !== head.id;
      if (held) { forced.delete(head.id); return; }
      void window.cth.writePty(ptyId, '\x1b');
    };


    // Send the front of `srcId`'s queue into `target`'s pty (verbatim or wrapped),
    // gated on the target being idle, free of interactive menus, and off
    // cooldown. The queue item is acknowledged only after BOTH PTY writes
    // succeed; failures stay visible and retry automatically (bounded by
    // MAX_SEND_ATTEMPTS so the drain never spins forever on a corpse).
    const dispatch = async (
      srcId: string,
      target: Agent | undefined,
      wrap?: (m: QueuedMessage) => string
    ): Promise<{ sent: boolean; message?: QueuedMessage }> => {
      const { messageQueues, removeQueuedMessage } = useStore.getState();
      const next = messageQueues[srcId]?.[0];
      if (!next || !target?.ptyId) return { sent: false };
      // A person has the head open in the queue's inline editor (5 Sep 2026). Typing it now would send the half-rewritten original, so
      // the drain waits. The flag cannot starve the queue: it is released on
      // save, cancel and composer unmount, and persistQueues strips it so no
      // stored copy survives a dead renderer.
      if (next.editing) return { sent: false };
      const now = Date.now();
      // "Send now" into a CLI that takes input mid-turn (founder, 25 Sep 2026)
      // skips the idle gate and the cooldown: the CLI's own queue holds it.
      const jump = next.now === true && canSendNowMidTurn(target.status, inferAgentProvider(target.command, target.provider), openQuestions.isOpen(target.id));
      // Idle, or breaker-pinned with a terminal that has genuinely gone quiet.
      // This gate is a don't-type-mid-stream safety check, so `manual` does NOT
      // bypass it — "send now" releases the auto-delivery PAUSE below, not this.
      if (!jump && !canDeliverToAgent(target.status, ptyQuietMs(target.ptyId, now), QUIESCE_IDLE_MS, openQuestions.isOpen(target.id), !!target.exit)) {
        return { sent: false };
      }
      const control = await window.cth.controlSnapshot(target.id);
      // The pause gate holds everything EXCEPT messages the user explicitly
      // released with "send now" (m.manual) — otherwise a paused floor leaves
      // the queue with no escape hatch at all. Idle/draft/picker safety below
      // still applies to manual messages; only the pause is bypassed.
      if (control?.autoDeliveryPaused && !next.manual) return { sent: false };
      // Hold queued messages until the target finishes its boot sequence.
      if ((bootGraceUntil.current[target.id] ?? 0) >= now) return { sent: false };
      // The user owns the prompt: a draft they are writing, or a menu they
      // opened, holds delivery. A draft holds until the box is empty, at any age:
      // typing after it would send the two as one prompt (Pam b8 row 6). A menu
      // expires after half an hour. Automation never erases the user's text and
      // never closes the user's menu.
      // A draft holds the whole queue untyped, so Home says Queued, not Sent; no timer, it is the person's text.
      useStore.getState().setQueueDraft(srcId, terminalAutomationBlockFor(target.ptyId, now) === 'draft');
      if (!isTerminalAutomationSafe(target.ptyId, now)) return { sent: false };
      // A head stuck in the input box (autosend, 0.5.5) is never typed again:
      // the key alone, at most three automatic passes, then the person decides
      // from the row (Press Return, Type again). The queue holds behind it.
      const stuck = next.stuck;
      if (stuck && stuckHeadAction(stuck, now - (lastFlush.current[target.id] ?? 0), FLUSH_COOLDOWN_MS) === 'wait') return { sent: false };
      if (!jump && !stuck && now - (lastFlush.current[target.id] ?? 0) < FLUSH_COOLDOWN_MS) return { sent: false };
      // Last gate before we type: re-check the message's delivery-time
      // precondition. A queue item is decided at enqueue time and delivered an
      // arbitrary interval later, and the inbox nudge is only worth sending if
      // there is still something in the inbox — the agent routinely drains it in
      // the very turn the nudge was queued from. Stale ones are DROPPED, not
      // deferred, so they cannot park at the queue head and starve the rest.
      // Not for a stuck head: its text is already in the box.
      if (!stuck && await checkPrecondition(next, () => window.cth.hiveInbox(srcId)) === 'drop') {
        removeQueuedMessage(srcId, next.id);
        return { sent: false };
      }
      // 0.5.6: the wake carries the mail, so its text is written NOW, as it is
      // typed, not when it was queued: main gives every pending message no
      // earlier wake has carried (mail that came since is in, mail the agent
      // already has in front of it is out). Null means there is none, and the
      // nudge is dropped like the stale one above. A failed ask types the
      // queued text. Not for a stuck head: its text is already in the box.
      let wake: string | null | undefined;
      if (!stuck && next.precondition === 'inbox-nonempty' && isInboxNudge(next.text)) {
        wake = await window.cth.hiveWakeText(srcId).catch(() => undefined);
        if (wake === null) {
          removeQueuedMessage(srcId, next.id);
          return { sent: false };
        }
      }
      // 0.5.6, clear on a switch of work. Main may hand back a hand off request
      // in place of the wake: the wake is for other work than the agent is on,
      // and its session is old enough (shared/switchClear.ts).
      const handoff = typeof wake === 'string' && isHandoffRequest(wake);
      // Typed afresh (the process that held it in its box is gone): what was
      // remembered about the box no longer holds.
      if (!stuck && handoffInBox.current[target.id]?.itemId === next.id) delete handoffInBox.current[target.id];
      // And this head may be the clear queued behind such a request. Main says
      // whether it goes: held while a sub agent is open, with no ceiling, and
      // dropped when the switch has ended (a wake went in first). Known by its
      // own mark as well as by this window's note, which a reload empties: a
      // clear typed unasked could land after a wake the watchdog typed.
      if (!stuck && (next.switchClear || switchClears.current[target.id] === next.text)) {
        const gate = await window.cth.hiveSwitchClearGate(target.id).catch(() => 'hold' as const);
        if (gate === 'hold') return { sent: false };
        if (gate === 'drop') {
          delete switchClears.current[target.id];
          removeQueuedMessage(srcId, next.id);
          return { sent: false };
        }
      }
      // Crossed out while this pass waited on the calls above. Nothing awaits from here to the hand over to
      // main, so a cross after this check reaches main after the send does, and main drops it (pty:withdraw).
      if (!useStore.getState().messageQueues[srcId]?.some((m) => m.id === next.id)) return { sent: false };
      const flightKey = `${srcId}:${next.id}`;
      if (inFlight.has(flightKey)) return { sent: false };
      inFlight.add(flightKey);
      lastFlush.current[target.id] = now;
      // `instruction` (when present) is the authoritative text to type into
      // the PTY; UI/card surfaces continue to show the readable `text`.
      const typed = withStandingContext(target, wrap ? wrap(next) : (wake ?? next.instruction ?? next.text), responseStyle.current);
      const typedAt = Date.now();
      submitting.set(target.ptyId!, { queueId: srcId, messageId: next.id });
      try {
        const sent = await deliverWithAcknowledgement(
          () => submitToPty(
            target.ptyId!,
            typed,
            inferAgentProvider(target.command, target.provider),
            { agentId: target.id, source: 'queue', idle: !jump, pressOnly: !!stuck, ref: next.id, ...(next.person ? { person: true } : {}) }
          ),
          (hookProved) => {
            const proved = hookProved || provedBeforeAcknowledge(target.id, promptTail(typed), typedAt);
            // Settle BEFORE the queue drops the message. The thread reads the
            // sent log, and a message that left the queue with nothing recorded
            // in its place is exactly the disappearance being fixed (founder,
            // 3 Sep 2026); it is only ever a person's send that has a row here.
            useStore.getState().settleHumanSend(srcId, next.id, proved ? 'delivered' : 'sent', typedAt);
            if (!proved && useStore.getState().sentLog[srcId]?.some((e) => e.id === next.id)) {
              unproved.set(target.id, [...(unproved.get(target.id) ?? []), { queueId: srcId, messageId: next.id, tail: promptTail(typed) }].slice(-UNPROVED_KEPT));
            }
            removeQueuedMessage(srcId, next.id);
            // An engine whose CLI reports its prompts: with no prompt by then, the person is told it was not
            // delivered, never left on Sent for good (Pam, round 6; Stanley, A3 x1). A late prompt still proves it.
            if (!proved && !wakeOptionsFor(inferAgentProvider(target.command, target.provider)).selfFile) notDeliveredLater(target.id, srcId, next.id, promptTail(typed), typedAt);
            // Zero the gauge on a DELIVERED /clear — the new session's context
            // isn't known until statusLine fires after the first post-clear
            // response, so leaving it at the old value shows a stale-full bar.
            // The clear on a switch of work is zeroed the same way, whatever
            // the engine calls its clear command.
            const switchCleared = switchClears.current[target.id] === next.text;
            if (switchCleared) delete switchClears.current[target.id];
            if (next.text.trim().toLowerCase() === '/clear' || switchCleared) {
              useStore.getState().updateAgent(target.id, {
                contextTokens: 0,
                contextLimit: undefined,
                progress: 0
              });
            }
          }
        );
        // A person was typing in that terminal when main came to type: nothing
        // was typed and nothing failed. The next pass tries again.
        // Held behind an earlier send still in the box: never typed, so the receipt says Queued, not Sent (Kevin, PR 778).
        useStore.getState().setQueuedMessageBehind(srcId, next.id, sent === 'behind');
        if (sent === 'held' || sent === 'behind') return { sent: false };
        // The process that held the text exited or was replaced (G4): its box
        // is gone. Clear the mark; the next pass types the message again.
        // F30: not a person's message. It may have gone in with no proof reaching
        // anyone, and typing it again ran a person's request twice after a Restart.
        // Its row asks instead (StuckQueueNotice); a prompt with its tail still releases it.
        if (sent === 'gone' && next.person && stuck) {
          const { pressNow: _pressed, ...kept } = stuck;
          useStore.getState().setQueuedMessageStuck(srcId, next.id, { ...kept, presses: STUCK_MAX_AUTO_PRESSES, boxGone: true });
          return { sent: false };
        }
        if (sent === 'gone') {
          useStore.getState().setQueuedMessageStuck(srcId, next.id, null);
          return { sent: false };
        }
        // Typed and pressed, and the agent moved with no prompt taken (trigger-prompt-058): the Enter may have
        // answered something on its screen, or the prompt's hook was lost. Never typed again by itself, and no press
        // either: the row asks (Type again), the queue holds behind it, and a prompt with its tail still releases it.
        if (sent === 'moved') {
          useStore.getState().setQueuedMessageTyping(srcId, next.id);
          useStore.getState().setQueuedMessageStuck(srcId, next.id, {
            agentId: target.id, typedAt, tail: promptTail(typed), presses: STUCK_MAX_AUTO_PRESSES, moved: true
          });
          return { sent: false };
        }
        // Still in the input box after every press: mark the head and hold the
        // queue. A later hook with this tail releases it (see the hook listener).
        if (sent === 'stuck') {
          // Typed, so the receipt says Sent: this is its mark.
          useStore.getState().setQueuedMessageTyping(srcId, next.id);
          useStore.getState().setQueuedMessageStuck(srcId, next.id, {
            agentId: target.id,
            typedAt: stuck?.typedAt ?? now,
            tail: stuck?.tail ?? promptTail(typed),
            presses: stuck ? stuck.presses + (stuck.pressNow ? 0 : 1) : 0
          });
          // A hand off request left in the box: remembered, so its clear and
          // the wake are queued when it goes (a later press, or a late proof).
          if (handoff) handoffInBox.current[target.id] = { itemId: next.id, wake: next.text, tail: promptTail(typed) };
          return { sent: false };
        }
        if (sent) {
          delete sendFailures[next.id];
          // A compact went in, the app's or the person's: no other is queued until it ends.
          if (isCompactionCommand(next.text)) compactTypedAt.current[target.id] = Date.now();
          // 0.5.6: what went in was a hand off request, now or from the box.
          const boxed = handoffInBox.current[target.id]?.itemId === next.id ? handoffInBox.current[target.id] : undefined;
          if (boxed) delete handoffInBox.current[target.id];
          if (handoff || boxed) queueSwitchClear(target, boxed?.wake ?? next.text);
          // 0.5.3 bug 7: we just started a turn in this agent and we are the one
          // party that knows it. Say so now rather than wait for a hook that a
          // hookless engine never sends (queueDelivery.ts statusAfterDelivery).
          const bl = breakerLevel.current[target.id];
          const mark = statusAfterDelivery(next.instruction ?? next.text, bl === 'constrained' || bl === 'stopped', !!target.exit);
          if (mark) useStore.getState().updateAgent(target.id, mark);
          return { sent: true, message: next };
        }
        // Failed write (dead/crashed pty the store still thinks is idle): retry
        // on the next cooldown-spaced flush, but only MAX_SEND_ATTEMPTS times —
        // then drop LOUDLY so the loss is diagnosable. (#113/#36)
        const attempts = (sendFailures[next.id] ?? 0) + 1;
        sendFailures[next.id] = attempts;
        if (attempts >= MAX_SEND_ATTEMPTS) {
          delete sendFailures[next.id];
          useStore.getState().settleHumanSend(srcId, next.id, 'failed');
          removeQueuedMessage(srcId, next.id);
          console.warn(
            `[queue-drain] dropping message ${next.id} for ${target.id} after ${attempts} failed pty writes ` +
            `("${next.text.slice(0, 80)}${next.text.length > 80 ? '…' : ''}")`
          );
        }
        return { sent: false };
      } finally {
        inFlight.delete(flightKey);
        if (submitting.get(target.ptyId!)?.messageId === next.id) submitting.delete(target.ptyId!);
      }
    };

    // Promote a genuine Slack-origin work item to a stamped kanban card the first
    // time it's dispatched to the office. The card carries slack:{channel,thread_ts}
    // (origin thread) so the main-process done-observer can post its one summary
    // reply in-thread once the card later reaches 'done'. ADDITIVE + idempotent +
    // best-effort: a failure here never affects the dispatch that already happened,
    // and only dispatched work items land here (slash commands/acks never do).
    type SlackTaskCard = Parameters<typeof window.cth.hiveAddTask>[0];
    const ensureSlackCard = async (m: QueuedMessage): Promise<void> => {
      const slack = m.slack;
      if (!slack) return;
      try {
        const raw = await window.cth.hiveTasks();
        const existing: SlackTaskCard[] =
          raw && typeof raw === 'object' && Array.isArray((raw as { tasks?: unknown }).tasks)
            ? (raw as { tasks: SlackTaskCard[] }).tasks
            : [];
        const id = `slack-${slack.thread_ts}-${m.id}`;
        if (existing.some((t) => t.id === id)) return; // already promoted — no dup
        const title = m.text.length > 80 ? `${m.text.slice(0, 79)}…` : m.text;
        const card: SlackTaskCard = {
          id,
          title,
          description: m.text,
          status: 'todo',
          dependsOn: [],
          priority: 1,
          createdAt: new Date().toISOString(),
          slack
        };
        await window.cth.hiveAddTask(card);
      } catch { /* best-effort: card promotion must never sink dispatch */ }
    };

    const flush = () => {
      const { agents, messageQueues } = useStore.getState();
      const byId = (id: string) => agents.find((a) => a.id === id);
      const now = Date.now();

      for (const [id, at] of forced) if (now - at > 60 * 60_000) forced.delete(id);
      for (const a of agents) {
        // Same gate as dispatch() — this pre-filter runs first, so relaxing only
        // the one inside dispatch would have changed nothing.
        if (!messageQueues[a.id]?.length) continue;
        const head = messageQueues[a.id][0];
        if (forceCompactDue({
          force: compactRule.current?.force === true, head, isCompact: isCompactionCommand(head.text),
          status: a.status, provider: inferAgentProvider(a.command, a.provider),
          questionOpen: openQuestions.isOpen(a.id), pressed: forced.has(head.id), now
        })) void pressForCompact(a, head);
        // A "send now" head goes to a CLI that takes input mid-turn at once.
        const jump = messageQueues[a.id][0].now === true && canSendNowMidTurn(a.status, inferAgentProvider(a.command, a.provider), openQuestions.isOpen(a.id));
        if (!a.ptyId || (!jump && !canDeliverToAgent(a.status, ptyQuietMs(a.ptyId, now), QUIESCE_IDLE_MS, openQuestions.isOpen(a.id), !!a.exit))) continue;
                void dispatch(a.id, a).then(({ sent, message }) => {
          if (sent && message?.slack) void ensureSlackCard(message);
          // Write the compact latch only once delivery genuinely happened — see
          // the comment in fire() above.
          if (sent && message?.compactUsed !== undefined) {
            lastCompactUsed.current[a.id] = message.compactUsed;
          }
          // A forced compact stopped the agent's turn: once it is in, the
          // agent is told to carry on, ahead of anything else waiting.
          if (sent && message && forced.delete(message.id)) {
            useStore.getState().enqueueMessage(a.id, FORCE_COMPACT_CARRY_ON, { front: true });
          }
        });
      }
    };

    // Run on every store change (status flips, new queue items) — debounced so a
    // burst of pty-stream updates coalesces — plus a periodic backstop.
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (debounce) return;
      debounce = setTimeout(() => { debounce = null; flush(); }, 200);
    };
    const unsub = useStore.subscribe(schedule);
    const iv = setInterval(flush, 3000);
    schedule();
    return () => { unsub(); if (debounce) clearTimeout(debounce); clearInterval(iv); };
  }, [config?.onboardingComplete]);

  // 5) Pipe inbound Slack messages into the responder's queue (0.5.2, founder
  //    ruling, Option A: one responder for every inbound channel). Main emits
  //    this event for EVERY Slack message and sends the configured id along;
  //    it is resolved here against the agents that are actually running, and
  //    anything else (unset, archived, the assistant, an unknown id) falls
  //    back to Michael, never to nowhere. Main applies the same rule, from
  //    the same shared module. Enqueueing lands the
  //    text in that agent's queue exactly as if the user had typed it, effect
  //    #4 drains it to the PTY, and the card gets the thread. The gated
  //    "received" post is main's, so there is no slackReply here.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    return window.cth.onSlackMessage((msg) => {
      const hasFiles = Array.isArray(msg.files) && msg.files.length > 0;
      if (!msg?.text?.trim() && !hasFiles) return;
      let text = msg.text.trim();
      // Local paths so the agent can Read the attachments directly.
      if (hasFiles) {
        const fileLines = msg.files!.map((f) => `${f.path} (${f.name})`).join('\n');
        text = text ? `${text}\n\nAttached files:\n${fileLines}` : `Attached files:\n${fileLines}`;
      }
      const slack = { channel: msg.channel, thread_ts: msg.thread_ts };
      // The raw text drives the human facing card; the preamble, built by main
      // per message, goes only into the working instruction. 0.5.6: main sends
      // two, and who takes the message picks: the orchestrator's (route it,
      // hand it over) or the chosen agent's (it is yours, answer it yourself).
      // What came with the message (the thread so far, the messages it points
      // to) rides in the instruction too, never on the card.
      const active = useStore.getState().agents.filter((a) => !a.archived && !a.isAssistant).map((a) => a.id);
      const to = resolveResponder(msg.responder, active, GOD_ID);
      const preamble = to === GOD_ID ? msg.autonomyPreamble : (msg.agentPreamble ?? msg.autonomyPreamble);
      const body = msg.context ? `${text}\n\n${msg.context}` : text;
      const instruction = preamble ? `${preamble}${body}` : undefined;
      useStore.getState().enqueueMessage(to, text, { slack, instruction });
    });
  }, [config?.onboardingComplete]);

  // 5b) Pipe hive tasks addressed to non-Claude agents (e.g. Codex) into their
  //     terminal queues. When main routes a message to a non-claude provider it
  //     emits 'hive:enqueueToAgent' instead of bouncing; we enqueue the raw
  //     task text here so effect #4 types it into the REPL when the agent idles.
  //     No inbox nudge, no /compact — just the verbatim subject+body text.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    return window.cth.onHiveEnqueue?.((msg) => {
      if (!msg?.targetId || !msg?.text?.trim()) return;
      useStore.getState().enqueueMessage(msg.targetId, msg.text.trim());
    });
  }, [config?.onboardingComplete]);

  // 5b) MAIN-initiated roster changes (rt-5 voice spawn/kill). The renderer store is
  //     only mutated by renderer-initiated hires (AddAgentModal); a voice hire/kill
  //     runs in MAIN (spawnAgentCore / teardownPty, owner=null) and would otherwise
  //     be invisible on the floor. Main broadcasts; we build/archive the card here.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    const offSpawn = window.cth.onHiveAgentSpawned?.((rec) => {
      if (!rec?.id) return;
      // Already carded: a row that is down takes the terminal main started (startedRow.ts); one that is up is this window's own start.
      const listed = useStore.getState().agents.find((a) => a.id === rec.id);
      if (listed) {
        const patch = startedRowPatch(listed, rec);
        if (patch) useStore.getState().updateAgent(rec.id, patch);
        return;
      }
      // An explicit character wins; otherwise infer it from the name, which is
      // what makes "spawn one called Meredith" land on the Meredith avatar with
      // nothing else asked for. The explicit field covers what inference cannot
      // express: an agent named something else that should still look like a
      // particular character. Unknown values fall through to the inference rather
      // than breaking the card.
      const castMember = (q?: string) =>
        q ? OFFICE_CAST.find((m) => m.name === q || m.displayName.toLowerCase() === q)?.name : undefined;
      const character =
        castMember(rec.character?.trim().toLowerCase()) ??
        castMember((rec.name || rec.id).toLowerCase()) ??
        DEFAULT_CHARACTER;
      // Accent is otherwise hashed from the worker id, which is stable but not
      // choosable. An unrecognised accent keeps the hash.
      const askedAccent = SPAWN_ACCENTS.find((a) => a === rec.accent?.trim().toLowerCase());
      let h = 0;
      for (const ch of rec.id) h = (h + ch.charCodeAt(0)) % SPAWN_ACCENTS.length;
      const project = (rec.cwd || '').split(/[\\/]/).filter(Boolean).pop() || 'hive';
      const agent: Agent = {
        id: rec.id,
        name: rec.name || rec.id,
        character,
        accent: askedAccent ?? SPAWN_ACCENTS[h],
        description: rec.role || 'a fresh harness',
        project,
        tmuxTarget: '',
        cwd: rec.cwd,
        status: 'idle',
        action: 'starting up',
        progress: 0,
        currentStation: 'desk',
        ptyId: rec.ptyId ?? rec.id,
        command: rec.command,
        // The model main actually started the worker on (0.5.3 bug 7). Without it
        // the row reads "CLI default" for a worker running a named model.
        model: rec.model,
        provider: rec.provider as Agent['provider'],
        isGod: false,
        recentTextTs: Date.now()
      };
      useStore.getState().addAgent(agent, { keepSelection: true });
    });
    const offArchive = window.cth.onHiveAgentArchived?.((e) => {
      if (e?.id) useStore.getState().archiveAgent(e.id);
    });
    return () => { offSpawn?.(); offArchive?.(); };
  }, [config?.onboardingComplete]);

  // 5c) v0.3.4 voice bridge: main stages queue insertions (clear_context) and
  //     pushes them here, so delivery rides EVERY existing gate — idle-only,
  //     boot grace, draft/picker safety, auto-delivery pause. Main owns the
  //     confirm policy; this is just the enqueue.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    return window.cth.onRealtimeEnqueue?.((evt) => {
      if (!evt?.agentId || typeof evt.text !== 'string' || !evt.text.trim()) return;
      const { agents, enqueueMessage } = useStore.getState();
      if (!agents.some((a) => a.id === evt.agentId)) return;
      enqueueMessage(evt.agentId, evt.text.trim());
    });
  }, [config?.onboardingComplete]);

  // 6) CONTEXT TRIGGERS (compact / clear). Main decides WHEN — cadence, and which
  //    half of the rule fired — and pushes `{action, rule}`; this decides WHO, then
  //    queues the provider's own command so the drain (#4) delivers it only at an
  //    idle prompt, never jamming a working terminal.
  //
  //    THE PRESSURE GATE. main/config.ts has long DOCUMENTED that auto-compact
  //    "only compacts agents whose context has filled past a threshold (30% for
  //    ~250k windows, 20% for ~1M windows)". No such check was ever implemented:
  //    every live agent with a resolvable command got compacted on every tick,
  //    hourly, however empty its window was. This makes the documented behaviour
  //    real — `rule.minContextPct`, or `minContextPctLargeWindow` once the window
  //    is >= LARGE_CONTEXT_WINDOW, must be met before an agent is interrupted.
  //    (The shipped bars are now 60/40, twice the stale doc's numbers; see
  //    DEFAULT_CONTEXT_TRIGGER. The doc comment in config.ts is still stale.)
  //
  //    Dedupe generalises to both actions: keyed on the command's own verb, so a
  //    queued `/compact` blocks a second compact without blocking a `/clear`.
  //
  //    COMPACT BY TOKENS (0.5.6). An agent that reports a token count is no
  //    longer compacted on the timer. Its compact is queued when its turn ends
  //    at or over its bar in tokens (shared/contextBar.ts): no time gap, and the
  //    same gate, dedupe and latch as below. The timer is the fallback for an
  //    engine that reports no count, and it skips every agent the turn end owns.
  useEffect(() => {
    if (!config?.onboardingComplete) return;

    // `only` is the one agent whose turn just ended. Absent, this is the timer
    // and every agent is looked at. `asked`: an agent asked for this compact
    // (compact-requests/), so the bar is the asker's, not checked here.
    // WHO gets the command is decided in src/shared/contextTriggerDecide.ts,
    // in this order.
    const queueContext = (action: 'compact' | 'clear', rule: ContextRule, only?: string, asked = false): Promise<void> => {
      return Promise.resolve().then(() => {
        const { agents, messageQueues, enqueueMessage } = useStore.getState();
        const now = Date.now();
        const sends = decideContextTrigger({
          action, rule, agents, only, asked,
          quietMs: (ptyId) => ptyQuietMs(ptyId, now),
          quiesceMs: QUIESCE_IDLE_MS,
          questionOpen: (id) => openQuestions.isOpen(id),
          queued: (id) => (messageQueues[id] ?? []).map((m) => m.text),
          lastCompactUsed: lastCompactUsed.current,
          // No compact while the clear on a switch of work is queued for it.
          holdCompact: switchClearPending,
          // Nor while the last one typed has not ended.
          compactPending: (id) => compactAwaited(compactTypedAt.current[id], now)
        });
        // The latch is written at successful DELIVERY (see the flush() dispatch
        // callback below), not here: compactUsed rides on the queued message so
        // the delivery site knows which count to latch. Force compact puts it
        // ahead of everything waiting (forceCompactDue).
        for (const s of sends) {
          enqueueMessage(s.agentId, s.command, s.compactUsed === undefined ? undefined : { compactUsed: s.compactUsed, ...(s.front ? { front: true } : {}) });
        }
      });
    };

    // The timer road. Main sends the person's own rule with the event.
    const fire = (action: 'compact' | 'clear', rule: ContextRule): void => { void queueContext(action, rule); };

    // The turn end road. The rule is the person's own saved one, from the live
    // config, never a default. `late` is a token count that landed after the
    // turn ended: it counts only inside TURN_END_READING_MS, and only while no
    // compact has been queued for that turn end. One turn end, one compact.
    const endedAt: Record<string, number> = {};
    compactAtTurnEnd.current = (agentId, late) => {
      const rule = compactRule.current;
      if (!rule?.enabled) return;
      const now = Date.now();
      if (late && now - (endedAt[agentId] ?? 0) > TURN_END_READING_MS) return;
      // Marked before the decision: a late
      // count that lands meanwhile still finds its turn end. Once a compact is
      // queued the mark goes, and the queue's own dedupe stops a second one.
      if (!late) endedAt[agentId] = now;
      void queueContext('compact', rule, agentId).then(() => {
        if ((useStore.getState().messageQueues[agentId] ?? []).some((m) => isCompactionCommand(m.text))) delete endedAt[agentId];
      });
    };

    // The typed `onContextTrigger` arrives with the main-process/preload change
    // that emits it; access it defensively so this lands independently of that.
    const off = (window.cth as unknown as {
      onContextTrigger?: (
        cb: (p: { action: 'compact' | 'clear'; rule: ContextRule }) => void
      ) => () => void;
    }).onContextTrigger?.((p) => {
      if (!p?.rule) return;
      fire(p.action === 'clear' ? 'clear' : 'compact', p.rule);
    });

    // The asked road. Main says so each beat until the compact goes
    // in, so an agent that is busy now gets it at a later idle prompt. The
    // person's own saved rule gives the focus text, even when their own
    // compact is off: the ask is the reason. No saved rule yet, the next beat.
    const offAsked = window.cth.onCompactAsked?.(({ agentId }) => {
      const rule = compactRule.current;
      if (!rule || typeof agentId !== 'string' || !agentId) return;
      void queueContext('compact', rule, agentId, true);
    });

    return () => { off?.(); offAsked?.(); compactAtTurnEnd.current = null; };
  }, [config?.onboardingComplete]);

  // 6c) A CODEX FILE TOO LARGE (0.5.6, shared/codexSizeClear.ts). Main stats
  //     each Codex agent's conversation file and says so while one is past
  //     100 MB, whatever the clear on a switch of work is set to. This window
  //     acts only for its own agents (queueCodexSizeClear finds none else).
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    return window.cth.onCodexSizeClear(({ agentId, asked }) => {
      if (typeof agentId !== 'string' || !agentId) return;
      codexSizeDue.current.add(agentId);
      if (asked === true) askedClearDue.current.add(agentId);
      void queueCodexSizeClear(agentId);
    });
  }, [config?.onboardingComplete]);

  // 7) Auto-revive wedged PTYs after the Mac sleeps/locks. Kevin's main-process
  //    keepalive catches up its schedules on wake and DETECTS terminals that were
  //    live before sleep but went silent after resume — it reports those ids on
  //    `power:resume`. We respawn EXACTLY those, resuming each agent's prior CLI
  //    session (--resume) so the terminal self-heals instead of the user clicking
  //    "Restart & Continue". This reuses the same resume-spawn flow as that button
  //    (CommandCenterPanel.restartWithModel) and restoreTeam's worktree handling.
  //    Pure addition: an empty `dead[]` is a no-op; healthy PTYs are never touched.
  useEffect(() => {
    if (!config?.onboardingComplete) return;
    // Skip an id we revived (or are mid-reviving) within this window — coalesces
    // a resume + unlock that arrive back-to-back (main also coalesces on its side).
    const REVIVE_DEBOUNCE_MS = 8000;

    const revive = async (deadId: string): Promise<void> => {
      const now = Date.now();
      if (now - (reviving.current[deadId] ?? 0) < REVIVE_DEBOUNCE_MS) return;
      reviving.current[deadId] = now; // claim BEFORE any await so re-entry can't double-spawn
      // Only respawn a PTY we actually own; never touch an unknown/healthy id.
      const a = useStore.getState().agents.find((x) => x.ptyId === deadId);
      if (!a) return;
      try {
        const cfg = await window.cth.getConfig();
        // Isolated agents run inside their worktree (a.cwd is the base repo); re-enter
        // it if it still exists, else fall back to the base cwd — same as restoreTeam.
        let cwd = a.cwd;
        if (a.worktreePath && (await window.cth.gitIsRepo(a.worktreePath))) cwd = a.worktreePath;
        // 'revive': the process died on its own while the machine slept and we are
        // about to start it again in the same folder. Without this main removed
        // that folder, uncommitted work and all, a line before the respawn.
        await window.cth.killPty(deadId, 'revive');
        // Soft-reset the pooled xterm in place (no-op if none): re-arm input and
        // clear the stale frame so the revived TUI paints clean — like the button.
        resetTerminal(deadId);
        const provider = inferAgentProvider(a.command, a.provider);
        // Prefer the agent's exact recorded command (same model/flags); fall back to
        // a rebuilt one only if it predates the persisted `command` field.
        // On the model last seen running (0.5.3 bug 2), same rule as the restore.
        const command = commandWithModel(a.command, a.model, provider) || buildSpawnCommand(cfg, a.model, provider);
        const [exe, ...args] = tokenizeCommand(command);
        const hive = a.isGod
          ? { id: a.id, name: a.name, cwd, provider, isGod: true, role: roleForHiveSpawn(a) }
          : a.isAssistant
          ? { id: a.id, name: a.name, cwd, provider, isAssistant: true, role: roleForHiveSpawn(a) }
          : { id: a.id, name: a.name, cwd, provider, role: roleForHiveSpawn(a) };
        // Spawn at the terminal's real grid so the TUI's absolute cursor moves land
        // in the right cells (a size mismatch scatters the redraw).
        const entry = acquireTerminal(deadId);
        let cols = 100, rows = 30;
        try { entry.fit.fit(); cols = entry.term.cols; rows = entry.term.rows; } catch { /* host not sized yet */ }
        const res = await window.cth.spawnPty({
          id: deadId,
          cwd,
          command: exe,
          provider,
          args,
          cols,
          rows,
          // The worktree (if any) already exists on disk — re-enter it, do NOT
          // re-isolate (that conflicts on the existing path/branch).
          isolate: false,
          // Reattach the agent's prior session so no context is lost on revive.
          resume: true,
          hive
        });
        if (res.ok) {
          reviving.current[deadId] = Date.now(); // re-stamp so the debounce covers the spawn
          useStore.getState().updateAgent(a.id, { status: 'idle', action: 'revived after sleep' });
        } else {
          delete reviving.current[deadId]; // let a later power:resume retry it
          console.error('[autorevive] respawn failed for', a.id, res.error);
        }
      } catch (err) {
        delete reviving.current[deadId];
        console.error('[autorevive] respawn threw for', deadId, err);
      }
    };

    return window.cth.onPowerResume?.((e) => {
      const dead = Array.isArray(e?.dead) ? e.dead : [];
      if (!dead.length) return; // healthy wake — nothing wedged, no-op
      for (const id of dead) void revive(id);
    });
  }, [config?.onboardingComplete]);
}
