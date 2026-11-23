/**
 * Circuit breaker — runaway/cost guardrail policy (Lane A #6.6b).
 *
 * Claude Code exposes `--max-turns` but NO dollar ceiling, so we enforce one
 * ourselves. This module owns the POLICY only — trip conditions + the
 * steer → constrain → stop escalation ladder. It has no side effects: it reads
 * signals and returns decisions; the caller (the heartbeat beat in index.ts)
 * performs the enforcement (send a corrective message, notify, kill+archive) and
 * emits BreakerState on the separate `control:breakerState` channel (Seam 2 with
 * Oscar/#7, whose avatar adapter gives breaker level precedence over hook status).
 *
 * Inputs aggregate three sources:
 *   (a) Oscar's usage samples via UsageProvider [Seam 1] — for cost + token velocity;
 *   (b) hook events (repeated identical tool calls, api_error storms) — fed in by
 *       HookServer through recordToolUse/recordError;
 *   (c) file-mtime no-progress — passed per-agent by the beat as `progressing`
 *       (coordination files) and `lastWorkAt` (the agent's own workspace).
 *
 * Velocity is the DIFF of consecutive cumulative samples (Δoutput/Δt), never a
 * single sample treated as an increment.
 *
 * Safe by construction: steer-first, one level per beat (never jump to a kill),
 * de-escalates a level per healthy beat (recovery), and `hardStop` is OFF by
 * default — without it the ladder caps at `constrained` and never kills.
 */

import { createHash } from 'node:crypto';
import type { CircuitBreakerConfig } from './config';
import type { AgentUsageSample } from './usage';
import { workTokens } from './tokenUsage';

export type BreakerLevel = 'healthy' | 'steering' | 'constrained' | 'stopped';

/** Emitted on control:breakerState (Seam 2). One per agent per beat so Oscar's
 *  dashboard/avatars stay live; `level` takes precedence over hook-derived status. */
export interface BreakerState {
  agentId: string;
  level: BreakerLevel;
  reason: string;
  ts: number;
  /** Which signal tripped, as a closed word (0.5.8 metrics, `breaker_action.cause`): the reason text never leaves the
   *  machine, this does. Only while tripping. */
  cause?: BreakerCause;
}

/** The signal that tripped: a loop of identical calls, no progress, spend (token limits, cost cap, token velocity),
 *  or anything else (an error storm). */
export type BreakerCause = 'no_progress' | 'repeat_loop' | 'spend' | 'other';

/** What the beat should do this tick for one agent. `action` fires only when the
 *  level ESCALATES (so a durable steer message isn't re-sent every beat). */
export type BreakerAction = 'none' | 'steer' | 'constrain' | 'stop';

export interface BreakerDecision {
  state: BreakerState;
  action: BreakerAction;
  /** True when level changed since the previous beat (escalation OR recovery). */
  changed: boolean;
}

/** Per-agent input for one beat. */
export interface BreakerInput {
  agentId: string;
  /** Cumulative usage snapshot, or null when unknown (skips cost/velocity trips). */
  sample: AgentUsageSample | null;
  /** Did the agent make coordination progress recently (file-mtime signal)? */
  progressing: boolean;
  /** When the agent's own WORKING DIRECTORY last changed, or omitted when the
   *  caller cannot tell. Coordination and work are different things: an agent
   *  can spend twenty minutes editing files, running a build and committing
   *  without touching a single hive message, and `progressing` answers only
   *  the first question. Optional, so a caller with no workspace notion for an
   *  agent omits it and nothing about that agent changes. */
  lastWorkAt?: number;
  /** 0.5.6: why this agent is over a token limit for its period (its own, or
   *  the office's with this agent the biggest user), from
   *  @shared/tokenLimits `overLimits`. Absent when it is within every limit. */
  limitReason?: string;
}

const LEVELS: BreakerLevel[] = ['healthy', 'steering', 'constrained', 'stopped'];
const rank = (l: BreakerLevel): number => LEVELS.indexOf(l);
const actionFor = (l: BreakerLevel): BreakerAction =>
  l === 'steering' ? 'steer' : l === 'constrained' ? 'constrain' : l === 'stopped' ? 'stop' : 'none';

const DEFAULTS = {
  enabled: true,
  hardStop: false,
  repeatedToolLimit: 8,
  errorStormLimit: 5,
  tokenVelocityPerMin: 60_000 // output tokens/min — coarse backstop, deliberately high
};

/** Safety cap on the PreCompact exemption: if PostCompact never arrives (crash,
 *  or a Claude build that doesn't emit it), the Δoutput trips re-arm on their own. */
const COMPACT_GRACE_MS = 5 * 60_000;
/** Trailing grace after PostCompact: the compaction burst lands in the NEXT
 *  beat's cumulative diff, so the exemption must outlive the compaction itself. */
const POST_COMPACT_GRACE_MS = 90_000;
/** How recent a DISTINCT tool call must be to count as progress for the
 *  no-progress arm. Mirrors the beat's file-mtime progress window (300s). */
const PROGRESS_TOOL_WINDOW_MS = 300_000;
/** Consecutive tripping beats the no-progress arm needs before it fires — a
 *  one-beat blip (inbox ack, statusline burst) never steers on its own. */
const NO_PROGRESS_BEATS = 2;
/** How long a loop or an error storm that has gone quiet still stands (0.5.6).
 *  While it stands the level is held: not raised, because nothing new has
 *  happened, and not lowered, because one quiet beat does not prove the loop
 *  is over. After it the count starts again. The progress window, because it
 *  answers the same question over the same span: is this still going on. */
const STALE_EVIDENCE_MS = PROGRESS_TOOL_WINDOW_MS;
/** The same message is not sent to the same agent twice inside this (0.5.6).
 *  A signal that trips, clears and trips again went healthy in between, so
 *  each trip was a "first" steer: four in fifteen minutes on a live floor. */
const RESEND_COOLDOWN_MS = 10 * 60_000;

interface AgentBreakerState {
  level: BreakerLevel;
  reason: string;
  lastSample: AgentUsageSample | null;
  /** Consecutive identical tool calls (same name+input). */
  repeatKey: string | null;
  repeatCount: number;
  /** Consecutive api_error / retry events with no intervening progress. */
  errorCount: number;
  /** Δoutput-based trips are exempt until this instant (compaction in flight,
   *  set on PreCompact; PostCompact shortens it to a trailing grace). */
  compactingUntil: number;
  /** When the last DISTINCT (name+input) tool call ran. A varied tool stream is
   *  work — background workflows / interactive sessions whose output lands
   *  outside the hive files (git, Jira) must not read as "no progress". A true
   *  single-call loop never refreshes this; an alternating loop that would is
   *  still backstopped by the velocity trip. */
  lastDistinctToolAt: number;
  /** When a human last submitted a prompt to this agent (UserPromptSubmit).
   *  A live conversation is work that touches neither hive files nor tools —
   *  prose in, prose out — so the no-progress arm reads it via this third
   *  progress clock (#376). A clock, not an exemption: it expires on its own,
   *  and a runaway loop (one prompt, then many tool calls) never refreshes it. */
  lastUserPromptAt: number;
  /** Consecutive beats the no-progress condition held (debounce counter). */
  noProgressBeats: number;
  /** When the no-progress condition last held, so a count left over from an
   *  episode that ended does not carry into the next one. */
  lastNoProgressAt: number;
  /** When the latest identical tool call ran, and the repeat count the loop
   *  arm last tripped on. The count only says what the LAST calls were, and it
   *  stays true for as long as the agent does nothing: an agent that obeyed a
   *  steer by stopping read as looping on every beat after, was constrained
   *  thirty seconds later for doing what it was told, and stayed pinned. So
   *  the arm trips on a NEW identical call only (count above `loopJudged`). */
  lastRepeatAt: number;
  loopJudged: number;
  /** The same two for the error storm. */
  lastErrorAt: number;
  errorJudged: number;
  /** The beat that stored `lastSample`. */
  lastSampleAt: number;
  /** When a steer and a constrain message last went out (resend cooldown).
   *  Never sent is minus infinity, not 0: a beat can be handed any clock. */
  lastSteerAt: number;
  lastConstrainAt: number;
}

export class CircuitBreaker {
  private agents = new Map<string, AgentBreakerState>();

  constructor(private getConfig: () => CircuitBreakerConfig & { costCapUsd?: number; agentTokenCaps?: Record<string, number> }) {}

  private cfg() {
    const c = this.getConfig() ?? {};
    return {
      enabled: c.enabled ?? DEFAULTS.enabled,
      hardStop: c.hardStop ?? DEFAULTS.hardStop,
      repeatedToolLimit: c.repeatedToolLimit ?? DEFAULTS.repeatedToolLimit,
      errorStormLimit: c.errorStormLimit ?? DEFAULTS.errorStormLimit,
      tokenVelocityPerMin: c.tokenVelocityPerMin ?? DEFAULTS.tokenVelocityPerMin,
      costCapUsd: c.costCapUsd,
      agentTokenCaps: c.agentTokenCaps
    };
  }

  private get(agentId: string): AgentBreakerState {
    let s = this.agents.get(agentId);
    if (!s) {
      s = {
        level: 'healthy', reason: '', lastSample: null, repeatKey: null, repeatCount: 0,
        errorCount: 0, compactingUntil: 0, lastDistinctToolAt: 0, lastUserPromptAt: 0,
        noProgressBeats: 0, lastNoProgressAt: 0, lastRepeatAt: 0, loopJudged: 0,
        lastErrorAt: 0, errorJudged: 0, lastSampleAt: 0,
        lastSteerAt: Number.NEGATIVE_INFINITY, lastConstrainAt: Number.NEGATIVE_INFINITY
      };
      this.agents.set(agentId, s);
    }
    return s;
  }

  /** Drop all state for an agent (call on archive/kill so it can't leak/zombie). */
  forget(agentId: string): void {
    this.agents.delete(agentId);
  }

  /** Current breaker level for an agent (for the live fleet snapshot). */
  levelFor(agentId: string): BreakerLevel {
    return this.agents.get(agentId)?.level ?? 'healthy';
  }

  // ── event-driven inputs (fed by HookServer) ──────────────────────────────

  /** A tool call ran. A NEW (name+input) key counts as forward progress (resets
   *  the repeat + error counters and stamps the distinct-tool clock the
   *  no-progress arm reads); the SAME key in a row is the loop signal. */
  recordToolUse(agentId: string, toolName: string | undefined, toolInput: unknown, now = Date.now()): void {
    const s = this.get(agentId);
    const key = this.toolKey(toolName, toolInput);
    s.lastRepeatAt = now;
    if (key === s.repeatKey) {
      s.repeatCount += 1;
    } else {
      s.repeatKey = key;
      s.repeatCount = 1;
      s.loopJudged = 0;
      s.errorCount = 0; // a distinct tool call = progress; clear the error storm
      s.errorJudged = 0;
      s.lastDistinctToolAt = now;
    }
  }

  /** An api_error / retry occurred (no forward progress). */
  recordError(agentId: string, now = Date.now()): void {
    const s = this.get(agentId);
    s.errorCount += 1;
    s.lastErrorAt = now;
  }

  /** A human submitted a prompt to this agent (UserPromptSubmit hook). Stamps
   *  the conversation progress clock the no-progress arm reads (#376). Only
   *  that arm gains a way to see this work — the loop, error-storm, velocity
   *  and cap arms are unchanged. */
  recordUserPrompt(agentId: string, now = Date.now()): void {
    this.get(agentId).lastUserPromptAt = now;
  }

  /** Compaction started (PreCompact hook). Exempt the Δoutput-based trips —
   *  compaction burns output tokens while touching no coordination file, which
   *  is exactly the false-positive shape of upstream issue #109 (the harness's
   *  own auto-compact mission tripping its own breaker on idle agents). */
  recordCompactStart(agentId: string, now = Date.now()): void {
    this.get(agentId).compactingUntil = now + COMPACT_GRACE_MS;
  }

  /** Compaction finished (PostCompact, or any SessionStart). Shortens the
   *  exemption to a trailing grace — the burst still lands in the next beat's
   *  cumulative diff. A no-op when no compaction is in flight, so a plain
   *  session start never grants an exemption. */
  recordCompactEnd(agentId: string, now = Date.now()): void {
    const s = this.get(agentId);
    if (s.compactingUntil > now) s.compactingUntil = now + POST_COMPACT_GRACE_MS;
  }

  private toolKey(toolName: string | undefined, toolInput: unknown): string {
    // Truncating replacer: a Write/Edit tool_input carries the whole file body
    // (up to MBs), and this runs synchronously inside the hook reply path on
    // EVERY PostToolUse — serializing it all only to keep a short key was a
    // multi-MB transient allocation per large write. Capping each string field
    // bounds the work.
    //
    // The key is a HASH of that capped serialization, not a slice of it (#377):
    // the old `inp.slice(0, 200)` collided on Bash commands sharing a long
    // identical preamble (absolute paths, a cd, an interpreter invocation) —
    // nine DIFFERENT measurements in a row read as nine identical calls and
    // constrained the agent. The per-string cap is 4096 so late-differing
    // inputs still reach the hash with something to distinguish; a cap of 250
    // would make two commands first differing at char 312 hash identically.
    // Genuinely identical calls still key identically, so every real loop
    // caught before is still caught.
    let inp = '';
    try {
      inp = JSON.stringify(toolInput, (_k, v) =>
        typeof v === 'string' && v.length > 4096 ? v.slice(0, 4096) : v) ?? '';
    } catch { inp = String(toolInput); }
    return `${toolName ?? '?'}:${createHash('sha256').update(inp).digest('hex')}`;
  }

  // ── periodic evaluation (called by the heartbeat beat) ────────────────────

  /** Evaluate every agent for this beat and return a decision per agent. The
   *  caller emits each state (keeps the dashboard live) and enforces `action`
   *  when present. */
  tick(inputs: BreakerInput[], nowMs: number): BreakerDecision[] {
    const cfg = this.cfg();
    const decisions: BreakerDecision[] = [];
    if (!cfg.enabled) {
      // Breaker off: report healthy for everyone, take no action.
      for (const { agentId } of inputs) {
        const s = this.get(agentId);
        const changed = s.level !== 'healthy';
        s.level = 'healthy'; s.reason = '';
        decisions.push({ state: { agentId, level: 'healthy', reason: '', ts: nowMs }, action: 'none', changed });
      }
      return decisions;
    }

    // Cost cap is floor-wide: sum cumulative usd, blame the single biggest spender
    // so one runaway doesn't trip the whole floor.
    let topSpender: string | null = null;
    if (typeof cfg.costCapUsd === 'number' && cfg.costCapUsd > 0) {
      let total = 0; let max = -1;
      for (const i of inputs) {
        const usd = i.sample?.usd ?? 0;
        total += usd;
        if (usd > max) { max = usd; topSpender = i.agentId; }
      }
      if (total <= cfg.costCapUsd) topSpender = null; // under cap — nobody blamed
    }

    // The token limits per period (shared/tokenLimits): the beat marks who is
    // over (`limitReason`) and `evaluate` trips on it. Each agent's own cap with
    // no period (`agentTokenCaps`, the token cap editor) is checked there too.

    for (const input of inputs) {
      const s = this.get(input.agentId);
      const trip = this.evaluate(
        input, s, cfg, nowMs,
        input.agentId === topSpender, cfg.costCapUsd
      );
      // remember the cumulative baseline for next beat's velocity diff
      if (input.sample) { s.lastSample = input.sample; s.lastSampleAt = nowMs; }

      const ceiling: BreakerLevel = cfg.hardStop ? 'stopped' : 'constrained';
      let target = s.level;
      if (trip.tripping) {
        target = LEVELS[Math.min(rank(s.level) + 1, rank(ceiling))];
      } else if (!trip.holding) {
        target = LEVELS[Math.max(rank(s.level) - 1, 0)]; // recover one level
      }
      const changed = target !== s.level;
      const escalated = rank(target) > rank(s.level);
      s.level = target;
      s.reason = trip.tripping ? trip.reason : (changed ? 'recovering — signals cleared' : s.reason);

      // The level always moves; the MESSAGE is not repeated inside the cooldown.
      // A stop is a kill, not a message, and is never held back.
      let action: BreakerAction = escalated ? actionFor(target) : 'none';
      if (action === 'steer') {
        if (nowMs - s.lastSteerAt < RESEND_COOLDOWN_MS) action = 'none'; else s.lastSteerAt = nowMs;
      } else if (action === 'constrain') {
        if (nowMs - s.lastConstrainAt < RESEND_COOLDOWN_MS) action = 'none'; else s.lastConstrainAt = nowMs;
      }

      decisions.push({
        state: { agentId: input.agentId, level: target, reason: s.reason, ts: nowMs, ...(trip.tripping && trip.cause ? { cause: trip.cause } : {}) },
        action,
        changed
      });
    }
    return decisions;
  }

  /** Pure trip evaluation for one agent given its signals + remembered baseline. */
  private evaluate(
    input: BreakerInput,
    s: AgentBreakerState,
    cfg: ReturnType<CircuitBreaker['cfg']>,
    nowMs: number,
    isTopSpender: boolean,
    costCapUsd: number | undefined
  ): { tripping: boolean; reason: string; holding?: boolean; cause?: BreakerCause } {
    // `holding`: a loop or an error storm that tripped, has not grown since,
    // and has not been quiet long enough to call over. The level stays where
    // it is. The other arms are still read, so a hold never hides a new trip.
    let holding = false;
    // (b) repeated identical tool calls. Trips on a NEW identical call only
    // (see `loopJudged`): the same count read twice is the same evidence.
    if (s.repeatCount >= cfg.repeatedToolLimit) {
      if (s.repeatCount > s.loopJudged) {
        s.loopJudged = s.repeatCount;
        return { tripping: true, reason: `looping: ${s.repeatCount}× identical tool call (${s.repeatKey?.split(':')[0] ?? '?'})` , cause: 'repeat_loop' };
      }
      if (nowMs - s.lastRepeatAt < STALE_EVIDENCE_MS) holding = true;
      else { s.repeatCount = 0; s.loopJudged = 0; } // the loop stopped; the count starts again
    }
    // (b) api_error storm. The same rule: a new error trips, a quiet storm is
    // held, and one that has been quiet for the window is over.
    if (s.errorCount >= cfg.errorStormLimit) {
      if (s.errorCount > s.errorJudged) {
        s.errorJudged = s.errorCount;
        return { tripping: true, reason: `error storm: ${s.errorCount} consecutive api errors/retries` , cause: 'other' };
      }
      if (nowMs - s.lastErrorAt < STALE_EVIDENCE_MS) holding = true;
      else { s.errorCount = 0; s.errorJudged = 0; }
    }
    // (a) 0.5.6: a token limit for a period (a day, a week). The beat counted
    // it, in work tokens: cache reads left out (#189), since context re-read on
    // every request would make any limit a timer on session length.
    if (input.limitReason) return { tripping: true, reason: input.limitReason , cause: 'spend' };
    // (a) the agent's own token cap (the token cap editor): its work tokens
    // over the cap, cache reads left out for the same reason (#189).
    const perAgentCap = cfg.agentTokenCaps?.[input.agentId];
    if (typeof perAgentCap === 'number' && perAgentCap > 0 && input.sample) {
      const work = workTokens(input.sample);
      if (work > perAgentCap) {
        return { tripping: true, reason: `token limit: ${work.toLocaleString()} work tokens over the agent cap of ${perAgentCap.toLocaleString()}`, cause: 'spend' };
      }
    }
    // (a) cost cap — floor total over cap, this agent is the biggest spender
    if (isTopSpender && typeof costCapUsd === 'number') {
      return { tripping: true, reason: `cost cap: floor total over $${costCapUsd} (top spender $${(input.sample?.usd ?? 0).toFixed(2)})` , cause: 'spend' };
    }
    // (a) token-velocity spike — diff cumulative output across consecutive beats.
    // Skipped entirely while a compaction is in flight (+ trailing grace): a
    // /compact burns output tokens with no coordination writes, which is the
    // false-positive shape of issue #109 — the auto-compact mission tripping
    // the breaker on idle agents.
    if (input.sample && s.lastSample && nowMs >= s.compactingUntil) {
      const dOut = input.sample.output - s.lastSample.output;
      // Per minute over the time the tokens had to arrive in: never less than
      // the gap between the two beats. A sample's `ts` is when its last usage
      // report landed, and two reports a few seconds apart on either side of a
      // beat made an ordinary turn read as several times its real rate.
      const dMin = Math.max(input.sample.ts - s.lastSample.ts, nowMs - s.lastSampleAt) / 60_000;
      if (dOut > 0 && dMin > 0) {
        const velocity = dOut / dMin;
        if (velocity > cfg.tokenVelocityPerMin) {
          return { tripping: true, reason: `token velocity ${Math.round(velocity)}/min > ${cfg.tokenVelocityPerMin}/min` , cause: 'spend' };
        }
        // (c) no-progress: burning output tokens while not coordinating. A recent
        // DISTINCT tool call counts as progress too — background workflows and
        // interactive sessions do real work that never touches the hive files
        // (a single-call loop never refreshes that clock, and the loop/velocity
        // arms above still backstop). A recent HUMAN PROMPT is the third leg
        // (#376): a live conversation is prose in, prose out — neither hive
        // files nor tool spans — and steering into it delivers a breaker
        // message while the operator is typing. Same window as the other legs;
        // a runaway loop is one prompt then many tool calls, so this clock
        // goes stale exactly when it should. Debounced: fires only after
        // NO_PROGRESS_BEATS consecutive beats, so a one-beat blip never steers.
        const toolActive = nowMs - s.lastDistinctToolAt < PROGRESS_TOOL_WINDOW_MS;
        // A recently-changed working directory is progress too. The question
        // this arm asks is "is this agent doing anything"; until now it asked
        // "is this agent COORDINATING". The paths behind `progressing` are the
        // inbox, the outbox and memory.md - every one of them messaging or
        // memory, none of them where work lands. An agent that edits, builds
        // and commits touches none of them and reads as wedged. Same window as
        // the tool clock, because it answers the same question over the same
        // span of time.
        const workActive = typeof input.lastWorkAt === 'number' && input.lastWorkAt > 0
          && nowMs - input.lastWorkAt < PROGRESS_TOOL_WINDOW_MS;
        // #425: a live human conversation is progress too, on the same window.
        const humanActive = nowMs - s.lastUserPromptAt < PROGRESS_TOOL_WINDOW_MS;
        if (!input.progressing && !toolActive && !workActive && !humanActive) {
          // Beats close together. One left from an episode that ended is not
          // the first half of the next: without this the debounce was spent
          // for good after the first trip.
          if (nowMs - s.lastNoProgressAt > PROGRESS_TOOL_WINDOW_MS) s.noProgressBeats = 0;
          s.lastNoProgressAt = nowMs;
          s.noProgressBeats += 1;
          if (s.noProgressBeats >= NO_PROGRESS_BEATS) {
            return { tripping: true, reason: 'no-progress: generating tokens without coordinating (stale log/files)' , cause: 'no_progress' };
          }
        } else {
          s.noProgressBeats = 0;
        }
      }
    }
    return { tripping: false, reason: '', holding };
  }
}
