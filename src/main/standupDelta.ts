import { createHash } from 'node:crypto';

/**
 * TE0 — the standup delta gate.
 *
 * WHAT IS ACTUALLY EXPENSIVE. The scheduler's ops-standup costs nothing in main:
 * `fire()` writes one small JSON file into god's inbox. The bill arrives in the
 * RENDERER, where the inbox-wake loop (useHive.ts, effect #3) notices an inbox id
 * it has not nudged for and queues a nudge that effect #4 types into god's PTY
 * once he is idle. That typed nudge is a full model turn over god's whole session
 * prefix — measured at ~0.63M token units per no-change standup, rising as the
 * session grows. Suppressing the dispatch suppresses the turn with nothing else to
 * change: no new inbox id means the wake loop has nothing fresh to nudge about.
 *
 * So this module answers one question, deterministically and locally, with no
 * model in the loop: HAS THE FLOOR ACTUALLY CHANGED SINCE THE LAST STANDUP?
 *
 * ─── RULE 1: NOTHING THE STANDUP ITSELF DISTURBS MAY BE AN INPUT ───
 *
 * LOAD-BEARING. Get this wrong and the gate is decorative.
 *
 * The obvious half is prose. god is the sole scribe of `board.md` and appends a
 * STANDUP line to it on EVERY standup, no-change ones included (the six that
 * motivated TE0 are board.md:123-128, all "No change: 22/22 done, floor idle"),
 * and the same goes for a task card's `notes` and `result`. Hash any of it and
 * each standup moves the fingerprint the NEXT standup compares against.
 *
 * THE HALF THAT IS EASY TO MISS, AND DID GET MISSED HERE ONCE: coordination
 * FILE MTIMES. The first version of this module hashed each agent's newest
 * coordination mtime, which looks like a pure observation of the floor and is
 * not. Dispatching the standup writes a message into god's inbox — that is the
 * gate's own action moving an input. god then handles it: inbox/.done moves,
 * memory.md moves, the outbox moves. The standup also asks every working agent
 * to summarise and compact, which moves THEIR memory.md and outbox. The harness
 * and the prep assistant write on their own timers. So the next tick always saw
 * a delta, always dispatched, and suppressed nothing — a gate that looked
 * finished and was permanently open.
 *
 * THE RULE, stated so it survives the next edit: AN INPUT THE OBSERVATION ITSELF
 * PERTURBS CANNOT MEASURE CHANGE. Mtimes are therefore not floor inputs at all —
 * not god's, not any agent's — and no amount of excluding god alone would have
 * fixed it, because the compaction request moves the workers' files too.
 *
 * What is left is content-level and moves only when real work does: who exists,
 * whether they are on hold, their breaker level, whether they own a live
 * terminal, how much ACTIONABLE (non-system) mail they hold, the task ledger's
 * {id, status, assignee}, and the queued-spawn and crash counts. The scheduler's
 * own message is excluded from the mail count by SYSTEM_SENDERS at the call
 * site, so the dispatch cannot inflate its own signal. god is included on the
 * same terms as everyone else: his breaker, hold, terminal and real mail are
 * floor facts, and none of them move because a standup happened.
 *
 * A cost worth naming: an agent working hard while changing none of the above
 * reads as "unchanged". That is acceptable — the standup exists to catch blocks
 * and unowned work, which are all content-level. STALLS ARE NOT THIS MODULE'S
 * JOB: the floor has a purpose-built quiet/stall detector (the heartbeat), and
 * the owner ruled that stall detection stays there rather than being rebuilt
 * inside the gate. See RULE 3.
 *
 * ─── RULE 2: FAIL OPEN ───
 *
 * Every path that cannot prove "nothing changed" must DISPATCH. Missing baseline,
 * gate disabled, unreadable state, forced by the operator — all dispatch. The
 * cost of a wrong dispatch is one standup we did not need; the cost of a wrong
 * suppression is an unattended floor. Those are not the same mistake, so they do
 * not get the same default.
 *
 * ─── RULE 3: NO PERIODIC FALLBACK ───
 *
 * There is deliberately NO maximum age. A provably unchanged floor may go
 * INDEFINITELY without a standup. That is the point of TE0 rather than an
 * oversight, and it is an owner ruling: "Do NOT run a standup merely because a
 * maximum age has elapsed... Do not add a periodic 12h or 24h fallback."
 *
 * An earlier revision of this file had a 24h expiry and argued for it in these
 * comments. The argument was that a frozen board is not proof that nothing needs
 * review. That is true, but it is an argument for a STALL DETECTOR, and answering
 * it here would have built a second one beside the heartbeat — two controls
 * owning one question, which is exactly the failure this codebase already paid
 * for once, when compact-maintenance and the context trigger both owned
 * compaction. A periodic fallback also stops meaning anything as the period
 * approaches the cadence: at the live 6h cadence a 6h max-age suppresses nothing
 * at all, so the knob only ever looked like a safety net.
 *
 * The structural consequence, and the reason it stays gone: `decideStandup` TAKES
 * NO CLOCK. It cannot dispatch on elapsed time because it cannot observe elapsed
 * time. Reintroducing an age-based reason is therefore not a one-line change to a
 * comparison — it requires widening the signature, which is asserted against.
 */

/** One agent's contribution to the fingerprint. Every field is a floor input that
 *  moves on its own; none of it is written by the standup that reads it. */
export interface AgentFloorState {
  id: string;
  onHold: boolean;
  /** Circuit-breaker level. An agent tripping to constrained/stopped between two
   *  standups is exactly the kind of change a standup exists to catch. */
  breaker: string;
  hasLivePty: boolean;
  /** Unread mail EXCLUDING the scheduler's own noise — see SYSTEM_SENDERS at the
   *  call site. Counting our own beats here would be the Rule 1 mistake again. */
  actionableInbox: number;
}

/** A task card reduced to the three fields that mean something changed. NOT
 *  `notes`, NOT `result`, NOT `title` — see Rule 1. */
export interface TaskFloorState {
  id: string;
  status: string;
  assignee: string;
}

/** The complete input surface of the fingerprint. Deliberately small and closed:
 *  a future field is a deliberate edit here, not something that leaks in. */
export interface FloorState {
  agents: AgentFloorState[];
  tasks: TaskFloorState[];
  spawnRequests: number;
  crashes: number;
  /** What the collector could NOT read, by short label. Non-empty means the floor
   *  was only partly observed.
   *
   *  This exists because the first version swallowed read errors into zeros, and a
   *  zero is indistinguishable from a genuinely empty inbox. Two consecutive
   *  failures to read the same directory therefore produced two IDENTICAL
   *  fingerprints and the gate SUPPRESSED — silence caused by a broken observation
   *  read as silence on the floor. An unobserved floor is an unknown floor, and
   *  `decideStandup` dispatches on it. */
  unknown: string[];
}

/** Per-mission gate settings. Absent ⇒ off ⇒ today's unconditional dispatch.
 *
 *  One field, and that is the whole knob. There is no `maxAgeMs` — see RULE 3. */
export interface DeltaGate {
  enabled: boolean;
}

export type StandupReason =
  | 'gate-off'      // no gate configured — behave exactly as before TE0
  | 'forced'        // operator pressed run-now
  | 'state-unknown' // the floor could not be fully read — never suppress on that
  | 'no-baseline'   // nothing to compare against yet
  | 'delta'         // the floor moved
  | 'no-delta';     // the only outcome that suppresses a model turn — and it may
                    // now repeat indefinitely, by design (RULE 3)

export interface StandupDecision {
  dispatch: boolean;
  reason: StandupReason;
  /** Always present, including on a skip: the caller stores it as the next
   *  comparison baseline only when it dispatches, but logs it either way. */
  fingerprint: string;
}

/** One line of `<hive>/standup-skips.jsonl`.
 *
 *  NOT `log.jsonl`, and that is a decision rather than a preference: log.jsonl's
 *  mtime is an INPUT to isFloorQuiet(), so recording every skip there would keep
 *  the floor looking permanently busy and quietly disable the heartbeat's
 *  re-engage. The heartbeat is disabled in the live config today, which is
 *  precisely what would have let that ship unnoticed. */
export interface StandupSkipRecord {
  ts: number;
  kind: 'standup-skipped';
  missionId: string;
  fingerprint: string;
  reason: StandupReason;
  sinceLastDispatchMs: number | null;
}

/** Reduce a raw tasks.json payload to the ledger the fingerprint hashes.
 *
 *  This is where Rule 1 is enforced for tasks, so it is exported and tested
 *  directly rather than inlined at the call site: prose fields must be dropped
 *  HERE, before anything can hash them. Accepts the array form and the
 *  `{tasks:[...]}`/`{cards:[...]}` wrappers the hive has used. */
export function projectTasks(raw: unknown): TaskFloorState[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { tasks?: unknown })?.tasks)
      ? (raw as { tasks: unknown[] }).tasks
      : Array.isArray((raw as { cards?: unknown })?.cards)
        ? (raw as { cards: unknown[] }).cards
        : [];
  const out: TaskFloorState[] = [];
  for (const t of list) {
    if (!t || typeof t !== 'object') continue;
    const c = t as Record<string, unknown>;
    out.push({
      id: String(c.id ?? ''),
      status: String(c.status ?? ''),
      assignee: String(c.assignee ?? '')
    });
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** Canonical text for hashing.
 *
 *  Nested ARRAYS, not objects: an array's order is written here, so the digest
 *  cannot drift because a key was renamed or because V8 handed back a different
 *  insertion order. Collections are sorted by id so "same floor, different
 *  readdir order" is the same fingerprint. */
export function canonicalize(state: FloorState): string {
  const agents = [...state.agents]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((a) => [
      a.id,
      a.onHold ? 1 : 0,
      a.breaker,
      a.hasLivePty ? 1 : 0,
      a.actionableInbox
    ]);
  const tasks = [...state.tasks]
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((t) => [t.id, t.status, t.assignee]);
  return JSON.stringify(['te0/1', agents, tasks, state.spawnRequests, state.crashes]);
}

/** sha256 of the canonical form. Hex, so it is greppable in the skip log. */
export function fingerprintFloor(state: FloorState): string {
  return createHash('sha256').update(canonicalize(state), 'utf8').digest('hex');
}

/**
 * The whole decision. Pure: no clock, no filesystem, no Electron — `now` and the
 * state are handed in, so every branch is reachable from a unit test.
 *
 * Order matters. `gate-off` and `forced` come before any comparison so neither
 * can be defeated by a hashing bug, and `no-baseline` precedes the comparison so
 * a first run (or a cleared config) always dispatches.
 *
 * NOTE THE ABSENT PARAMETERS. There is no `now` and no `lastDispatchAt`, because
 * after RULE 3 there is nothing left for a clock to decide. Every dispatch reason
 * is a fact about the floor or about the operator; none is a fact about the
 * calendar. Keeping the clock out of the signature is what makes that permanent.
 */
export function decideStandup(input: {
  state: FloorState;
  gate?: DeltaGate;
  lastFingerprint?: string;
  forced?: boolean;
}): StandupDecision {
  const fingerprint = fingerprintFloor(input.state);
  if (!input.gate?.enabled) return { dispatch: true, reason: 'gate-off', fingerprint };
  if (input.forced) return { dispatch: true, reason: 'forced', fingerprint };
  // Before any comparison: a floor we could not fully read is not a floor we can
  // prove unchanged. Two failed reads in a row hash identically, so without this
  // a persistent read error would suppress every standup indefinitely.
  if (input.state.unknown.length) return { dispatch: true, reason: 'state-unknown', fingerprint };
  if (!input.lastFingerprint) return { dispatch: true, reason: 'no-baseline', fingerprint };
  if (input.lastFingerprint !== fingerprint) return { dispatch: true, reason: 'delta', fingerprint };
  // Nothing follows this line. A floor that is readable, gated, un-forced, has a
  // baseline and still matches it is a floor nobody needs to be woken about — for
  // as long as that stays true, however long that is. RULE 3.
  return { dispatch: false, reason: 'no-delta', fingerprint };
}

/** Everything one scheduler tick touches, injected.
 *
 *  The decision function alone could never have caught the mtime bug: the defect
 *  was in what the COLLECTOR fed it, and in the fact that dispatching changed the
 *  next collection. Proving the gate works therefore needs a test that drives real
 *  ticks — dispatch, apply the effects a dispatch actually has, tick again — and
 *  that is only possible if the tick's effects are behind an interface. Hence this
 *  seam: `fire()` in index.ts supplies the real implementations, a test supplies a
 *  fake floor it can mutate between ticks. */
export interface StandupTickDeps {
  /** The PERSISTED mission, re-read each tick (never the armed closure's copy). */
  readMission: () => {
    deltaGate?: DeltaGate;
    lastDeltaFingerprint?: string;
    lastDispatchAt?: number;
  };
  collect: () => FloorState;
  now: () => number;
  send: () => void;
  recordSkip: (record: StandupSkipRecord) => void;
  /** Always called, dispatch or skip: `lastFiredAt` is the timer's clock. */
  stamp: (patch: {
    lastFiredAt: number;
    lastDeltaFingerprint?: string;
    lastDispatchAt?: number;
  }) => void;
}

/** One scheduler tick: decide, do exactly one of send/record-skip, then stamp.
 *
 *  The ordering is the contract. Exactly one of `send` and `recordSkip` runs, and
 *  `stamp` runs unconditionally afterwards — a skipped tick still has to advance
 *  `lastFiredAt` or syncMissions re-arms with a zero delay and spins the mission.
 *  Only a real dispatch advances the baseline and `lastDispatchAt`; advancing
 *  either on a skip would make the floor look freshly reviewed when no one has
 *  reviewed it.
 *
 *  `lastDispatchAt` OUTLIVES the max-age reason it was first added for, and that
 *  is deliberate rather than leftover: `skipRecord` still reads it to report
 *  `sinceLastDispatchMs`. It no longer gates anything — the decision cannot see
 *  it — but it is the only way an operator can answer "how long has this floor
 *  been quiet", and under RULE 3 that span is unbounded, so the question matters
 *  MORE than it did when a 24h ceiling answered it. Diagnostics, not control. */
export function runStandupTick(
  missionId: string,
  deps: StandupTickDeps,
  forced = false
): StandupDecision {
  const m = deps.readMission();
  const now = deps.now();
  const decision = decideStandup({
    state: deps.collect(),
    gate: m.deltaGate,
    lastFingerprint: m.lastDeltaFingerprint,
    forced
  });
  if (decision.dispatch) deps.send();
  else deps.recordSkip(skipRecord(missionId, decision, now, m.lastDispatchAt));
  deps.stamp(
    decision.dispatch
      ? { lastFiredAt: now, lastDeltaFingerprint: decision.fingerprint, lastDispatchAt: now }
      : { lastFiredAt: now }
  );
  return decision;
}

/** Build the durable record of a suppressed standup. */
export function skipRecord(
  missionId: string,
  decision: StandupDecision,
  now: number,
  lastDispatchAt?: number
): StandupSkipRecord {
  return {
    ts: now,
    kind: 'standup-skipped',
    missionId,
    fingerprint: decision.fingerprint,
    reason: decision.reason,
    sinceLastDispatchMs: lastDispatchAt ? now - lastDispatchAt : null
  };
}
