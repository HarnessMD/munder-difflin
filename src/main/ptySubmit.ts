/**
 * The one door every automated message goes through into an agent's terminal
 * (autosend, 0.5.5): the renderer's queue, the worker seed, god's boot and the
 * main process inbox nudge.
 *
 * Before this the renderer typed with its own chain and the main nudge typed
 * with none, so the two could interleave, and neither knew whether a message
 * was submitted. Here each terminal has ONE serial chain, the proof comes from
 * the hook record main already keeps (HookProofRecord), and every delivery
 * leaves one `pty-submit` line in log.jsonl. The typing itself is the shared
 * typeAndSubmit.
 *
 * The screen and the "is a person typing" answer live in the renderer, which
 * holds the terminals; they are asked for over IPC with a request id and a
 * 300 ms timeout (TerminalProbes). Measured: under 1 ms normally, a clean null
 * from a busy or crashed renderer.
 */
import type { AgentProvider } from '../shared/agentProvider';
import {
  boxHoldsTail,
  inputBoxEmpty,
  inputBoxText,
  PTY_FINAL_WAIT_MS,
  PTY_PROOF_POLL_MS,
  promptOnScreen,
  promptTail,
  submitEncodingFor,
  submitStillPending,
  terminalReadyToReceive,
  typeAndSubmit,
  type SubmitIo,
  type SubmitResult
} from '../shared/providerAutomation';
import type { HookProofRecord } from './hookProof';
import { codexScreenVerdict, codexStillPending } from '../shared/codexScreen';
import { wakeIds } from '../shared/hiveNudge';

export type SubmitSource = 'queue' | 'seed' | 'god-boot' | 'nudge' | 'remote-control';

export interface PtySubmitRequest {
  ptyId: string;
  agentId?: string;
  provider: AgentProvider;
  text: string;
  source: SubmitSource;
  /** Pause the chain this long after the delivery. */
  settleMs?: number;
  /** The text is already in the box: press the key only. */
  pressOnly?: boolean;
  /** The agent was idle when this was sent (false for "Send now" mid turn). */
  idle?: boolean;
  /** A person's words (QueuedMessage.person), for main/founderTurn.ts. */
  person?: boolean;
  /** The queued message this is (QueuedMessage.id): the cross on its row withdraws it. */
  ref?: string;
}

/** The renderer's answer about one terminal. `lines` is null unless the
 *  terminal's grid equals the process grid it was asked with. */
export interface TerminalProbe { lines: string[] | null; safe: boolean; pooled: boolean }

export interface PtyInfo { pid: number; cols: number; rows: number; hasOutput: boolean; startedAt: number }

export interface PtySubmitDeps {
  /** A short file instruction for a provider that cannot paste long text.
   * Stable on retries; hook and screen proof must match what is actually typed. */
  messageText?: (req: PtySubmitRequest) => string;
  write: (ptyId: string, data: string) => { ok: boolean; error?: string };
  info: (ptyId: string) => PtyInfo | null;
  /** Ask the renderer. Resolves null on a timeout; `undefined` when there is
   *  no window at all to ask (then nobody can be typing, and nothing is read). */
  probe: (ptyId: string, grid: { cols: number; rows: number }) => Promise<TerminalProbe | null | undefined>;
  proof: HookProofRecord;
  claudeVersion: (ptyId: string) => Promise<readonly number[] | null>;
  /** A question is open or a person's decision is pending for this agent (B5). */
  inputHeld?: (agentId: string | undefined) => boolean;
  /** Why `inputHeld` holds this agent, for the log line of the held send (Kevin, O50). */
  holdReason?: (agentId: string | undefined) => string;
  log: (entry: Record<string, unknown>) => void;
  /** When the agent's own session file was last written, or null when it has none: a queued send's second proof
   *  that the CLI has started, for a SessionStart the CLI cancelled. */
  sessionWrittenAt?: (agentId: string | undefined) => number | null;
  /** The agent's session file shows a turn begun since `since` and not ended (main/sessionTurn.ts): a queued send
   *  waits for its end, with or without hooks. */
  turnOpen?: (agentId: string | undefined, since: number) => boolean | 'not-found';
  /** Told once per submit, at its first byte: from here the text is typed, and Home's receipt says Sent, not
   *  Queued (Pam b6g, Home words 1). Every hold before it types nothing and tells nothing. */
  began?: (req: PtySubmitRequest) => void;
  /** Codex agents here run a launch prompt as their first turn (hive.ts gives each one) and fire SessionStart only
   *  with it: a queued send or a wake waits for that turn's Stop (codexLaunchOpen). Unset, Codex is typed into as before. */
  codexLaunchTurn?: boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export const READY_TIMEOUT_MS = 30_000;
export const READY_POLL_MS = 100;
/** Claude with an unreadable screen: ready this long after SessionStart. */
export const SESSION_START_SETTLE_MS = 500;
export const PROBE_TIMEOUT_MS = 300;
/**
 * A Claude screen we can read that shows no input box yet keeps a delivery waiting this long, past READY_TIMEOUT_MS.
 * On a loaded computer a resumed session takes about 40 s to draw the box, and everything typed before that lands in
 * it together: /remote-control took the person's first message as its session name (task force 058, A3).
 */
export const READY_BOX_LIMIT_MS = 120_000;
/**
 * A queued send whose SessionStart has not come: the box drawn with the same text this long readies it, when the
 * session file has not been written either. The CLI cancels hooks under load (Pam b8r6), and a lost SessionStart
 * must not hold a send for good. Half the box limit, so one wait can still type.
 */
export const BOX_STABLE_MS = 60_000;
/** A send held by an open turn is logged when the hold starts and this often after, so a stuck hold shows. */
export const OPEN_TURN_LOG_MS = 120_000;
/** A queued send's box check before typing (Kevin, A3): this long, then the send is held for the next pass. */
export const TYPE_BOX_WAIT_MS = 30_000;
/** After /remote-control: how long its menu has to come up. */
export const REMOTE_MENU_WAIT_MS = 12_000;
const REMOTE_MENU_RE = /Esc to continue/;
/**
 * A queued send waits while the agent's compaction runs (hookProof.ts compactRunningSince), at most this long
 * from its PreCompact: a CLI that dies mid compaction sends no end, and its queue must move again. God's own took 91 s
 * (log.jsonl 21:08:37 to 21:10:08 IST, 11 Nov).
 */
export const COMPACT_HOLD_MAX_MS = 10 * 60_000;
/** Codex holds this long in a row are logged once more, as stuck. */
export const CODEX_HOLD_ALERT_MS = 5 * 60_000;
/** A Codex launch turn not begun (no SessionStart or prompt from this process) holds a queued send this long from the
 *  start, then it is typed as before: a Codex with no launch prompt, or whose hooks do not reach us, would wait for good. */
export const CODEX_LAUNCH_WAIT_MS = 120_000;

export class PtySubmitter {
  private chains = new Map<string, Promise<unknown>>();
  private readyPids = new Map<string, number>();
  /** The process each terminal's last text was typed into (gate G4). */
  private typedPids = new Map<string, number>();
  /** When each terminal's last text was typed: a prompt since then is that text taken (F30). */
  private typedAts = new Map<string, number>();
  /** Per terminal, the last text that ended with no proof, while it may still sit in the box (R7). `withdrawn`: its
   *  row was crossed out, so it never gets an Enter; the next send still waits while it is in the box. */
  private unproved = new Map<string, { pid: number; text: string; key: string; typedAt: number; pressed: boolean; withdrawn?: boolean }>();
  /** The queued messages main has been handed and has not finished, by QueuedMessage.id. */
  private flying = new Map<string, PtySubmitRequest>();
  /** Those whose row was crossed out while main had them: never typed from then on, and never pressed. */
  private withdrawnRefs = new Set<string>();
  /** Per terminal, the last queued message typed into it and how it ended: a cross on its row afterwards, while
   *  the words may still sit in the box (stuck, moved), keeps every Enter off them. */
  private lastTyped = new Map<string, { ref: string; pid: number; text: string; key: string; typedAt: number; outcome: SubmitResult['outcome'] }>();
  /** The last outcome logged per terminal: a run of `held` logs once (G6). */
  private lastLogged = new Map<string, string>();
  /** Per terminal: since when this process has drawn its box with the same text (BOX_STABLE_MS). */
  private boxSince = new Map<string, { pid: number; text: string; since: number }>();
  /** Per terminal: the process a queued Claude send readied on, with PR 795's proof of its session. */
  private queueReadyPids = new Map<string, number>();
  /** Per terminal: when its open turn hold was last logged (OPEN_TURN_LOG_MS). */
  private openTurnLogged = new Map<string, number>();
  /** Per terminal: when its Codex launch turn hold was last logged (OPEN_TURN_LOG_MS). */
  private launchLogged = new Map<string, number>();
  /** When the last `held` line in a run was logged per terminal (G6, heldRepeat). */
  private heldLoggedAt = new Map<string, number>();
  /** Codex terminals whose screen is not the prompt: why, since when, and in
   *  which process (a restart under the same id starts afresh). */
  private codexHeld = new Map<string, { reason: string; since: number; alerted: boolean; pid: number | null }>();
  private now: () => number;
  private sleep: (ms: number) => Promise<void>;

  constructor(private deps: PtySubmitDeps) {
    this.now = deps.now ?? Date.now;
    this.sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  /**
   * Codex only, and only on a readable screen: is it the chat prompt
   * (codexScreen.ts)? A hold is logged when its reason changes, and once more
   * when holds have run CODEX_HOLD_ALERT_MS, so a Codex release that changed
   * its prompt shows up in the log instead of as a silent stall.
   */
  private codexScreenOk(req: PtySubmitRequest, p: TerminalProbe, mode: 'type' | 'press'): boolean {
    if (req.provider !== 'codex' || !p.lines) return true;
    const v = codexScreenVerdict(p.lines, mode, req.text);
    const pid = this.deps.info(req.ptyId)?.pid ?? null;
    const before = this.codexHeld.get(req.ptyId);
    const held = before && before.pid === pid ? before : undefined;
    if (v.ok) { this.codexHeld.delete(req.ptyId); return true; }
    const now = this.now();
    if (!held || held.reason !== v.reason) {
      this.codexHeld.set(req.ptyId, { reason: v.reason, since: held?.since ?? now, alerted: held?.alerted ?? false, pid });
      this.deps.log({ kind: 'codex-screen-held', agentId: req.agentId ?? null, ptyId: req.ptyId, source: req.source, mode, reason: v.reason });
    } else if (!held.alerted && now - held.since >= CODEX_HOLD_ALERT_MS) {
      held.alerted = true;
      this.deps.log({ kind: 'codex-screen-stuck', agentId: req.agentId ?? null, ptyId: req.ptyId, source: req.source, reason: v.reason, heldMs: now - held.since });
    }
    return false;
  }

  /** Queue a delivery on this terminal's chain. Rejects when the terminal is
   *  gone, never became ready, or a write failed; otherwise resolves with what
   *  happened. A failure never stalls the chain for the next caller. */
  submit(req: PtySubmitRequest): Promise<SubmitResult> {
    const ref = req.ref;
    if (ref) this.flying.set(ref, req);
    const prev = this.chains.get(req.ptyId) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(() => this.run(req)).finally(() => {
      if (ref && this.flying.get(ref) === req) { this.flying.delete(ref); this.withdrawnRefs.delete(ref); }
    });
    this.chains.set(req.ptyId, next);
    void next.catch(() => undefined).then(() => { if (this.chains.get(req.ptyId) === next) this.chains.delete(req.ptyId); });
    return next;
  }

  /**
   * THE CROSS ON A QUEUED ROW (founder, 12 Nov 2026: "pressing the cross on a queued message sends that
   * message"). The window takes the row off its list; a send it had already handed here went on: waiting for the
   * agent to be ready (up to READY_BOX_LIMIT_MS), for its input box (TYPE_BOX_WAIT_MS) or for a person's draft, then
   * typed and pressed. From now on it is never typed, and never pressed: a send not yet typed ends `held`, reason
   * `withdrawn`. Words of it already in the box (typed before the cross, or a row left stuck there) get no Enter from
   * here again, and the next send waits while they are there (earlierSendClear), so the two never go as one prompt.
   * True when this computer's submitter had it in hand or in a box.
   */
  withdraw(ref: string): boolean {
    if (!ref) return false;
    let had = false;
    if (this.flying.has(ref)) { this.withdrawnRefs.add(ref); had = true; }
    for (const [ptyId, last] of this.lastTyped) {
      // Taken by the CLI already, or never typed: nothing of it is in a box.
      if (last.ref !== ref || last.outcome === 'submitted' || last.outcome === 'held') continue;
      had = true;
      const left = this.unproved.get(ptyId);
      if (left && left.text === last.text) left.withdrawn = true;
      else this.unproved.set(ptyId, { pid: last.pid, text: last.text, key: last.key, typedAt: last.typedAt, pressed: false, withdrawn: true });
    }
    return had;
  }

  private isWithdrawn(req: PtySubmitRequest): boolean {
    return !!req.ref && this.withdrawnRefs.has(req.ref);
  }

  /** A withdrawn send ends here, logged once, `held` so the window does nothing more with it. */
  private withdrawnEnd(req: PtySubmitRequest, extra: { presses?: number; ms?: number; left?: boolean } = {}): SubmitResult {
    this.deps.log({ kind: 'pty-submit', agentId: req.agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, chars: req.text.length, pressOnly: req.pressOnly === true, presses: extra.presses ?? 0, proof: 'none', outcome: 'held', reason: 'withdrawn', ...(extra.left ? { left: true } : {}), ms: extra.ms ?? 0 });
    return { outcome: 'held', proof: 'none', presses: extra.presses ?? 0, ms: extra.ms ?? 0, reason: 'withdrawn' };
  }

  /**
   * G6: a run of `held` for one reason logs once, as each pass of the drain asks again. A new reason logs, and so does
   * the same one again after OPEN_TURN_LOG_MS, so a stuck hold shows (Kevin, O50: a Send now held for the reason
   * before it left no line at all). True when this one is not logged.
   */
  private heldRepeat(ptyId: string, reason: string): boolean {
    const key = `held:${reason}`;
    const at = this.heldLoggedAt.get(ptyId);
    const repeat = this.lastLogged.get(ptyId) === key && at !== undefined && this.now() - at < OPEN_TURN_LOG_MS;
    this.lastLogged.set(ptyId, key);
    if (!repeat) this.heldLoggedAt.set(ptyId, this.now());
    return repeat;
  }

  private async run(req: PtySubmitRequest): Promise<SubmitResult> {
    // Crossed out while it waited on this terminal's chain.
    if (this.isWithdrawn(req)) return this.withdrawnEnd(req);
    const originalText = req.text;
    if (this.deps.messageText) req = { ...req, text: this.deps.messageText(req) };
    // G4. A press only request is for text in a particular process's box. That
    // process exited or was replaced (a restart under the same id): the box is
    // gone, so say so and let the caller type the message again.
    if (req.pressOnly) {
      const now = this.deps.info(req.ptyId);
      if (!now || this.typedPids.get(req.ptyId) !== now.pid) {
        // F30. Unless the agent's own prompt shows it went in before that process
        // ended, with the proof late or lost to the caller: typing it again would
        // run the same request twice.
        const typedAt = this.typedAts.get(req.ptyId);
        if (typedAt !== undefined && this.deps.proof.promptSeen(req.agentId, typedAt, promptTail(req.text))) {
          this.deps.log({ kind: 'pty-submit', agentId: req.agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, pressOnly: true, presses: 0, proof: 'hook', outcome: 'submitted', ms: 0 });
          return { outcome: 'submitted', proof: 'hook', presses: 0, ms: 0 };
        }
        this.deps.log({ kind: 'pty-submit', agentId: req.agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, pressOnly: true, presses: 0, proof: 'none', outcome: 'gone', ms: 0 });
        return { outcome: 'gone', proof: 'none', presses: 0, ms: 0 };
      }
    }
    const readiness = await this.waitReady(req);
    // Crossed out while it waited for the agent to be ready.
    if (this.isWithdrawn(req)) return this.withdrawnEnd(req);
    const info = this.deps.info(req.ptyId);
    if (!info) throw new Error(`pty gone: ${req.ptyId}`);
    const grid = { cols: info.cols, rows: info.rows };
    const version = req.provider === 'claude' ? await this.deps.claudeVersion(req.ptyId).catch(() => null) : null;
    const encoding = submitEncodingFor(req.provider, req.text, version);
    const idle = req.idle !== false;
    const proof = this.deps.proof;
    const agentId = req.agentId;
    const probe = () => this.deps.probe(req.ptyId, grid).catch(() => null);
    // A compaction is running: anything typed now reaches the agent as the output of its /compact, never as
    // a request, and stops the compaction (god, 11 Nov, 22:55:50 and 22:56:06 IST). Held until it ends, Send now and
    // a second /compact included; the receipt stays Queued.
    if (this.compactRunning(req, info)) {
      if (!this.heldRepeat(req.ptyId, 'compacting')) this.deps.log({ kind: 'pty-submit', agentId: agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, chars: req.text.length, readiness, presses: 0, proof: 'none', outcome: 'held', reason: 'compacting', ms: 0 });
      return { outcome: 'held', proof: 'none', presses: 0, ms: 0, reason: 'compacting' };
    }
    // The agent is in a turn by its own session file: typed now, the CLI queues the send and one reply answers both
    // (with no hooks the app had the agent idle). It waits for the turn's end or an interrupt, with no
    // time limit; a new process starts with no turn open. The receipt stays Queued.
    // Not Send now (idle false): the person chose to send into the turn, and Claude's own queue holds it.
    // Held here it did nothing at all (god, 22:09:29 IST).
    const turn = needsBox(req) && !req.pressOnly && idle ? this.turnOpen(req, info) : false;
    // The tail read held no prompt: the turn reads as closed and the send goes on, logged so that a send typed into
    // an open turn this way can be told apart (Kevin).
    if (turn === 'not-found') this.deps.log({ kind: 'pty-submit', agentId: agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, note: 'open-turn: not found in tail' });
    if (turn === true) {
      const last = this.openTurnLogged.get(req.ptyId);
      if (last === undefined || this.now() - last >= OPEN_TURN_LOG_MS) {
        this.openTurnLogged.set(req.ptyId, this.now());
        this.deps.log({ kind: 'pty-submit', agentId: agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, chars: req.text.length, readiness, presses: 0, proof: 'none', outcome: 'held', reason: 'open-turn', ms: 0 });
      }
      return { outcome: 'held', proof: 'none', presses: 0, ms: 0 };
    }
    this.openTurnLogged.delete(req.ptyId);
    // Codex keeps what is typed while its launch turn runs and puts it back in its box when the turn ends, unsent: the
    // queue then held on its own text for good (Kevin, b6k). A queued send waits for that turn's Stop.
    if (this.codexLaunchOpen(req, info)) {
      const last = this.launchLogged.get(req.ptyId);
      if (last === undefined || this.now() - last >= OPEN_TURN_LOG_MS) {
        this.launchLogged.set(req.ptyId, this.now());
        this.deps.log({ kind: 'pty-submit', agentId: agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, chars: req.text.length, readiness, presses: 0, proof: 'none', outcome: 'held', reason: 'launch-turn', ms: 0 });
      }
      return { outcome: 'held', proof: 'none', presses: 0, ms: 0 };
    }
    this.launchLogged.delete(req.ptyId);
    if (req.provider === 'claude' && !req.pressOnly && req.source !== 'remote-control') await this.leaveLateMenu(req, grid);
    const noBox = needsBox(req) && !req.pressOnly ? await this.boxBeforeTyping(req, grid) : null;
    if (noBox) {
      if (!this.heldRepeat(req.ptyId, noBox)) this.deps.log({ kind: 'pty-submit', agentId: agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, chars: req.text.length, readiness, presses: 0, proof: 'none', outcome: 'held', reason: noBox, ms: 0 });
      return { outcome: 'held', proof: 'none', presses: 0, ms: 0, ...(noBox === 'prompt-pending' ? { reason: noBox } : {}) };
    }
    if (!req.pressOnly && !(await this.earlierSendClear(req, info, grid))) {
      if (!this.heldRepeat(req.ptyId, 'earlier-in-box')) this.deps.log({ kind: 'pty-submit', agentId: agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, chars: req.text.length, readiness, presses: 0, proof: 'none', outcome: 'held', reason: 'earlier-in-box', ms: 0 });
      return { outcome: 'held', proof: 'none', presses: 0, ms: 0, behind: true };
    }
    let began = false;
    // Why the typing was held, when it is: said in the log line (Kevin, O50).
    let heldWhy = 'not-safe';
    // A PROMPT THAT ASKS THE PERSON (trigger-prompt-058, god, 9 Nov 2026): the screen says it when it can be read
    // (promptOnScreen); a screen that cannot be read (no window, not drawn at the process grid) leaves it to the
    // agent's hooks (HookProofRecord.askOpen: a permission or a question opened and not answered).
    const asking = (p: TerminalProbe | null | undefined): boolean => {
      const lines = p?.lines ?? null;
      return lines ? promptOnScreen(lines) : proof.askOpen(agentId);
    };
    const io: SubmitIo = {
      write: async (data) => {
        if (!began) { began = true; try { this.deps.began?.(req); } catch { /* the receipt's word only */ } }
        const res = this.deps.write(req.ptyId, data);
        if (!res.ok) throw new Error(res.error ?? `pty write failed: ${req.ptyId}`);
      },
      screen: async () => (await probe())?.lines ?? null,
      sleep: this.sleep,
      now: this.now,
      // G2: alive only once a turn event arrived from this terminal's process.
      // A fresh agent's first message gets no blind retries: the safe side.
      hookChannel: () => proof.activitySeen(agentId, info.startedAt),
      promptSeen: (since, tail) => proof.promptSeen(agentId, since, tail),
      activitySeen: (since) => proof.activitySeen(agentId, since),
      eventSeen: (since, events) => proof.eventSeen(agentId, since, events),
      // A6. Typing waits for an answer: no answer is "not now". No window at
      // all means nobody can be typing. B5: an open question or a pending
      // decision holds it too, checked again before every press.
      safeToType: async () => {
        // Crossed out while it waited for its box, a draft or a menu: nothing of it is typed.
        if (this.isWithdrawn(req)) { heldWhy = 'withdrawn'; return false; }
        heldWhy = this.deps.holdReason?.(agentId) ?? 'input-held';
        if (this.deps.inputHeld?.(agentId)) return false;
        const p = await probe();
        // No window (Claude in the office): the agent's hooks are the only word on a prompt that asks the person.
        if (p === undefined) { if (!asking(p)) return true; heldWhy = 'prompt-pending'; return false; }
        heldWhy = p === null ? 'screen-unread' : !p.safe ? 'draft-or-menu' : 'codex-screen';
        if (!(p !== null && p.safe && this.codexScreenOk(req, p, 'type'))) return false;
        // A prompt that asks the person (a permission, a question): never typed into (trigger-prompt-058).
        if (asking(p)) { heldWhy = 'prompt-pending'; return false; }
        return true;
      },
      // A press on a busy renderer is skipped; the retry comes later.
      safeToPress: async () => {
        // Crossed out after it was typed: its words get no Enter.
        if (this.isWithdrawn(req)) return false;
        if (this.deps.inputHeld?.(agentId)) return false;
        const p = await probe();
        // No Enter into a prompt that asks the person, ever: it would answer it (trigger-prompt-058).
        if (asking(p)) return false;
        if (p === undefined) return true;
        if (p === null || !p.safe) return false;
        // A press alone, a beat after a stuck delivery, presses only on our own
        // text: the box may since hold a person's. Codex checks its composer
        // below; a terminal never opened holds no person's text.
        if (req.pressOnly && req.provider !== 'codex' && p.pooled && !(p.lines && submitStillPending(p.lines, req.text) === true)) return false;
        return this.codexScreenOk(req, p, 'press');
      },
      ...(req.provider === 'codex' ? { stillPending: codexStillPending } : {})
    };
    // Our own text already at the end of Codex's composer (typed by an earlier pass, put back there by Codex): one
    // Return on it, never typed again and never held on (Kevin, b6k). Its proof settles it, once.
    const inBox = !req.pressOnly && req.provider === 'codex' && await this.codexHoldsOwn(req, probe);
    if (inBox) req = { ...req, pressOnly: true };
    // Only a wake is typed again when it leaves the box unpressed: a nudge, or
    // any text that ends as one (the renderer's idle nudge goes as 'queue').
    const ids = wakeIds(originalText);
    const wake = req.source === 'nudge' || ids.filed.length > 0 || ids.yours.length > 0;
    const result = await typeAndSubmit(io, { text: req.text, encoding, idle, pressOnly: req.pressOnly, wake });
    // Crossed out while main had it. Not typed (safeToType said so): it ends here. Typed before the cross, or
    // a press only pass on words already there: no Enter from here again, and the next send waits while they are in
    // the box. Unless the CLI took it before the cross reached here: then it went, and the outcome says so.
    if (this.isWithdrawn(req) && result.outcome !== 'submitted') {
      const left = began || req.pressOnly === true;
      if (left) this.unproved.set(req.ptyId, { pid: info.pid, text: req.text, key: encoding.key, typedAt: this.now() - result.ms, pressed: false, withdrawn: true });
      return this.withdrawnEnd(req, { presses: result.presses, ms: result.ms, left });
    }
    if (!req.pressOnly && result.outcome !== 'held') {
      if (req.ref) this.lastTyped.set(req.ptyId, { ref: req.ref, pid: info.pid, text: req.text, key: encoding.key, typedAt: this.now() - result.ms, outcome: result.outcome });
      else this.lastTyped.delete(req.ptyId);
    } else if (req.pressOnly && req.ref && this.lastTyped.get(req.ptyId)?.ref === req.ref) {
      this.lastTyped.get(req.ptyId)!.outcome = result.outcome;
    }
    if (!req.pressOnly && result.outcome !== 'held') {
      this.typedPids.set(req.ptyId, info.pid);
      this.typedAts.set(req.ptyId, this.now() - result.ms);
      if (result.outcome === 'unconfirmed' && !encoding.slash) this.unproved.set(req.ptyId, { pid: info.pid, text: req.text, key: encoding.key, typedAt: this.now() - result.ms, pressed: false });
      else this.unproved.delete(req.ptyId);
    }
    // Never the text, never the tail. A draft or a hold is retried on every
    // drain pass: its first `held` is logged, the rest until the outcome
    // changes are not (G6).
    const repeatHeld = result.outcome === 'held' && this.heldRepeat(req.ptyId, heldWhy);
    if (result.outcome !== 'held') this.lastLogged.set(req.ptyId, result.outcome);
    if (!repeatHeld) this.deps.log({
      kind: 'pty-submit',
      agentId: agentId ?? null,
      ptyId: req.ptyId,
      provider: req.provider,
      source: req.source,
      chars: req.text.length,
      bracketed: encoding.bracketed,
      pastes: encoding.pastes,
      key: encoding.key === '\r' ? 'cr' : 'csi-u',
      slash: encoding.slash,
      pressOnly: req.pressOnly === true,
      idle,
      readiness,
      presses: result.presses,
      proof: result.proof,
      outcome: result.outcome,
      ...(result.outcome === 'held' ? { reason: heldWhy } : {}),
      ...(result.left ? { left: true } : {}),
      ...(inBox ? { inBox: true } : {}),
      ms: result.ms
    });
    if (req.source === 'remote-control' && result.outcome !== 'held') await this.leaveRemoteMenu(req, grid);
    if (req.settleMs && result.outcome !== 'held') await this.sleep(req.settleMs);
    // A hold says why, as the log does.
    return result.outcome === 'held' ? { ...result, reason: heldWhy } : result;
  }

  /**
   * Every queued send to Claude, not only the first: its input box is on the
   * screen before anything is typed. A box seen once for this process (`known`)
   * says nothing about now: a menu, a dialog or a session still connecting
   * takes the keys, and Enter then picks in it (Stanley, A3 runs 1, 2 and 7:
   * box seen for /remote-control, no menu seen, the send lost with no proof).
   * False when a screen that can be read shows no box for TYPE_BOX_WAIT_MS: the
   * send is held for the next pass. A screen that cannot be read types at
   * once, as before.
   */
  private async boxBeforeTyping(req: PtySubmitRequest, grid: { cols: number; rows: number }): Promise<'no-box' | 'prompt-pending' | null> {
    const started = this.now();
    for (;;) {
      const p = await this.deps.probe(req.ptyId, grid).catch(() => null);
      // No window, or a screen that cannot be read now (a busy renderer, a grid
      // in flight, a window that does not hold this terminal): the box was seen
      // for this process before (waitReady), so it types at once, as before.
      // Only a screen read without a box waits (Kevin, PR 778).
      if (!p?.lines) return null;
      // A prompt that asks the person hides the box: held at once, and said so (trigger-prompt-058).
      if (promptOnScreen(p.lines)) return 'prompt-pending';
      if (inputBoxText(p.lines) !== null) return null;
      if (this.now() - started >= TYPE_BOX_WAIT_MS) return 'no-box';
      await this.sleep(READY_POLL_MS);
    }
  }

  /**
   * R7 (Pam, round 6). A send that ended with no proof can still sit in the
   * input box, and the next one was typed onto it: one Enter sent both as one
   * prompt with no break. Before typing, that text, when the screen shows it
   * still there, gets one Enter. False while it stays: nothing is typed onto
   * it, and the queue tries again on its next pass. A screen that cannot be
   * read, or a box without it, types as before.
   */
  private async earlierSendClear(req: PtySubmitRequest, info: PtyInfo, grid: { cols: number; rows: number }): Promise<boolean> {
    const left = this.unproved.get(req.ptyId);
    if (!left) return true;
    if (left.pid !== info.pid) { this.unproved.delete(req.ptyId); return true; }
    const inBox = async (): Promise<boolean | null> => {
      const lines = (await this.deps.probe(req.ptyId, grid).catch(() => null))?.lines;
      return lines ? submitStillPending(lines, left.text) : null;
    };
    // Never typed onto text in the box (Pam b8r6, cycle 6: B went in after A, one prompt). The earlier send is
    // let go only when its CLI reported it, or the box is seen empty; with no window, nobody can see a box.
    if (this.deps.proof.promptSeen(req.agentId, left.typedAt, promptTail(left.text))) { this.unproved.delete(req.ptyId); return true; }
    const seen = await this.deps.probe(req.ptyId, grid).catch(() => null);
    if (seen === undefined) { this.unproved.delete(req.ptyId); return true; }
    const raw = seen?.lines ? inputBoxText(seen.lines) : null;
    if (raw !== null && inputBoxEmpty(raw)) { this.unproved.delete(req.ptyId); return true; }
    // Something else in the box, or a box that cannot be read: held. Ours gets its one Enter below.
    if (raw === null || !boxHoldsTail(raw, left.text, 'in')) return false;
    // Crossed out: never pressed; the next send waits until the person clears it or the CLI takes it.
    if (left.pressed || left.withdrawn || this.deps.inputHeld?.(req.agentId)) return false;
    const p = await this.deps.probe(req.ptyId, grid).catch(() => null);
    if (p && !p.safe) return false;
    const res = this.deps.write(req.ptyId, left.key);
    if (!res.ok) return false;
    left.pressed = true;
    const pressedAt = this.now();
    const tail = promptTail(left.text);
    while (this.now() - pressedAt < PTY_FINAL_WAIT_MS) {
      await this.sleep(PTY_PROOF_POLL_MS);
      const hook = this.deps.proof.promptSeen(req.agentId, left.typedAt, tail);
      if (hook || (await inBox()) === false) {
        this.unproved.delete(req.ptyId);
        this.deps.log({ kind: 'pty-submit', agentId: req.agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, earlier: true, pressOnly: true, presses: 1, proof: hook ? 'hook' : 'screen', outcome: 'submitted', ms: this.now() - pressedAt });
        return true;
      }
    }
    this.deps.log({ kind: 'pty-submit', agentId: req.agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, earlier: true, pressOnly: true, presses: 1, proof: 'none', outcome: 'stuck', ms: this.now() - pressedAt });
    return false;
  }

  /**
   * Wait until the terminal can take input (A9). Claude: its input box is on a
   * readable screen, or, when the screen cannot be read, SessionStart arrived
   * 500 ms ago (never for a queued send, see needsBox). The bracketed paste mode switch is NOT a signal: it comes 0.3
   * to 0.5 s after start and the box 0.85 to 3.4 s. Other providers keep the
   * old rule (first output plus a settle). Known ready per process id. At the
   * 30 s limit a terminal that has printed anything is taken as ready, as
   * before this change, rather than never delivering; a Claude screen we can
   * read and that has no box yet gets until READY_BOX_LIMIT_MS first. The
   * /remote-control command is typed only at a box it has seen: it is a
   * convenience, and on anything else it swallows what comes after it.
   */
  private async waitReady(req: PtySubmitRequest): Promise<string> {
    const started = this.now();
    // A queued send to Claude waits for the box like /remote-control does, and
    // is never typed on SessionStart or at the 30 s limit: Claude is still
    // starting then and drops the keys (Kevin, A3; Pam, round 6, row 1).
    const boxOnly = req.source === 'remote-control' || needsBox(req);
    let why: string | null = null;
    for (;;) {
      const info = this.deps.info(req.ptyId);
      if (!info) throw new Error(`PTY exited before becoming ready: ${req.ptyId}`);
      // /remote-control readies on the box alone, with no proof of the session. A queued send after it is not
      // known until it has readied on that proof itself (Stanley, round 9; a dead box as in A3 run 8).
      if (this.readyPids.get(req.ptyId) === info.pid && (!needsBox(req) || this.queueReadyPids.get(req.ptyId) === info.pid)) return 'known';
      const elapsed = this.now() - started;
      why = await this.readyNow(req, info, elapsed);
      if (why && why !== NO_SESSION && why !== UNREADABLE) {
        this.readyPids.set(req.ptyId, info.pid);
        if (needsBox(req)) this.queueReadyPids.set(req.ptyId, info.pid);
        return why;
      }
      if (boxOnly && elapsed >= READY_BOX_LIMIT_MS) {
        this.deps.log({ kind: 'pty-submit', agentId: req.agentId ?? null, ptyId: req.ptyId, provider: req.provider, source: req.source, readiness: why === NO_SESSION || why === UNREADABLE ? why : 'no-box', outcome: 'not-typed', ms: elapsed });
        throw new Error(`no input box within ${READY_BOX_LIMIT_MS}ms: ${req.ptyId}`);
      }
      if (elapsed >= READY_TIMEOUT_MS && (boxOnly || (elapsed < READY_BOX_LIMIT_MS && await this.boxStillDue(req, info)))) {
        await this.sleep(READY_POLL_MS);
        continue;
      }
      if (elapsed >= READY_TIMEOUT_MS) {
        if (info.hasOutput) { this.readyPids.set(req.ptyId, info.pid); return 'timeout'; }
        throw new Error(`PTY did not become ready within ${READY_TIMEOUT_MS}ms: ${req.ptyId}`);
      }
      await this.sleep(READY_POLL_MS);
    }
  }

  private async readyNow(req: PtySubmitRequest, info: PtyInfo, elapsed: number): Promise<string | null> {
    if (req.provider !== 'claude') {
      return terminalReadyToReceive(info.hasOutput, elapsed, req.provider) ? 'settle' : null;
    }
    const p = await this.deps.probe(req.ptyId, { cols: info.cols, rows: info.rows }).catch(() => null);
    if (p?.lines) {
      const text = inputBoxText(p.lines);
      if (text !== null) {
        // The box alone is not the prompt: in A3 run 8 (Stanley, b8) the CLI drew it, took no keys and wrote
        // nothing to its session for four minutes. In every run delivered, the session had started first.
        // SessionStart can be lost, so two other proofs stand in for it, and the log names the one that readied.
        if (needsBox(req) && !(this.deps.proof.lastEventAt(req.agentId, 'SessionStart') >= info.startedAt)) {
          if (this.sessionWritten(req, info)) return 'session-file';
          return this.boxStableFor(req.ptyId, info.pid, text) >= BOX_STABLE_MS ? 'box-stable' : NO_SESSION;
        }
        return 'box';
      }
      this.boxSince.delete(req.ptyId);
      // The /remote-control menu left up: ready, so leaveLateMenu closes it and the box comes back.
      return needsBox(req) && p.lines.some((l) => REMOTE_MENU_RE.test(l)) ? 'menu' : null;
    }
    // A window whose screen cannot be read is not ready for /remote-control or a queued send: nothing is typed
    // blind there, and at READY_BOX_LIMIT_MS the log says unreadable, not no-box (Kevin). No window at all keeps
    // today's rule: nobody can draw a screen to wait for. That is the office too, whose Slack requests go as
    // remote-control (PR 789).
    if (p !== undefined && (req.source === 'remote-control' || needsBox(req))) return UNREADABLE;
    const at = this.deps.proof.lastEventAt(req.agentId, 'SessionStart');
    if (at >= info.startedAt) return this.now() - at >= SESSION_START_SETTLE_MS ? 'session-start' : null;
    // No window and no SessionStart: a queued send or /remote-control takes the session file instead.
    return (needsBox(req) || req.source === 'remote-control') && this.sessionWritten(req, info) ? 'session-file' : null;
  }

  /**
   * A queued send or a wake to Codex while its launch turn has not ended: begun (SessionStart or a prompt from this
   * process) and no Stop yet, held with no time limit like an open turn; not begun, held for CODEX_LAUNCH_WAIT_MS
   * from the start. The wake watchdog types a wake again after a hold. Other nudges (a work order, a clear) are
   * not held: their callers do not try again.
   */
  private codexLaunchOpen(req: PtySubmitRequest, info: PtyInfo): boolean {
    if (!this.deps.codexLaunchTurn || req.provider !== 'codex' || req.pressOnly) return false;
    if (req.source !== 'queue' && !(req.source === 'nudge' && isWakeText(req.text))) return false;
    const proof = this.deps.proof;
    if (proof.eventSeen(req.agentId, info.startedAt, ['Stop', 'StopFailure'])) return false;
    if (proof.eventSeen(req.agentId, info.startedAt, ['SessionStart', 'UserPromptSubmit'])) return true;
    return this.now() - info.startedAt < CODEX_LAUNCH_WAIT_MS;
  }

  /** Codex's composer ends with this text, at its prompt with nothing over it: Return may be pressed on it. */
  private async codexHoldsOwn(req: PtySubmitRequest, probe: () => Promise<TerminalProbe | null | undefined>): Promise<boolean> {
    const p = await probe();
    return !!p?.lines && p.safe && codexScreenVerdict(p.lines, 'press', req.text).ok;
  }

  /** A queued send, or a wake (both typed again after a hold, as codexLaunchOpen's), while this process's CLI is
   *  compacting by its hooks. */
  private compactRunning(req: PtySubmitRequest, info: PtyInfo): boolean {
    if (req.source !== 'queue' && !(req.source === 'nudge' && isWakeText(req.text))) return false;
    return this.deps.proof.compactRunningSince(req.agentId, info.startedAt, COMPACT_HOLD_MAX_MS) > 0;
  }

  private turnOpen(req: PtySubmitRequest, info: PtyInfo): boolean | 'not-found' {
    try { return this.deps.turnOpen?.(req.agentId, info.startedAt) ?? false; } catch { return false; }
  }

  /** The agent's session file has been written since this process started. */
  private sessionWritten(req: PtySubmitRequest, info: PtyInfo): boolean {
    let at: number | null | undefined;
    try { at = this.deps.sessionWrittenAt?.(req.agentId); } catch { at = null; }
    return typeof at === 'number' && at >= info.startedAt;
  }

  /** How long this process has drawn its box with this text, 0 the first time it is seen so. */
  private boxStableFor(ptyId: string, pid: number, text: string): number {
    const now = this.now();
    const b = this.boxSince.get(ptyId);
    if (!b || b.pid !== pid || b.text !== text) { this.boxSince.set(ptyId, { pid, text, since: now }); return 0; }
    return now - b.since;
  }

  private async boxStillDue(req: PtySubmitRequest, info: PtyInfo): Promise<boolean> {
    if (req.provider !== 'claude') return false;
    const p = await this.deps.probe(req.ptyId, { cols: info.cols, rows: info.rows }).catch(() => null);
    return !!p?.lines && inputBoxText(p.lines) === null;
  }

  /**
   * On a session already connected /remote-control opens a menu ("Enter to select · Esc to continue"), and the next
   * message would be pasted into it and lost. One Esc, once the menu is up: pressed before that it does nothing, and
   * a second one at an empty box opens Claude's rewind. A session it connects just now opens no menu.
   */
  private async leaveRemoteMenu(req: PtySubmitRequest, grid: { cols: number; rows: number }): Promise<void> {
    const started = this.now();
    let readable = false;
    while (this.now() - started < REMOTE_MENU_WAIT_MS) {
      const p = await this.deps.probe(req.ptyId, grid).catch(() => null);
      // No window at all (the office): no menu can be seen, and an Esc there
      // would stop the turn the send just began.
      if (p === undefined) return;
      const lines = p?.lines;
      if (lines) readable = true;
      if (lines?.some((l) => REMOTE_MENU_RE.test(l))) {
        this.deps.write(req.ptyId, '\x1b');
        this.deps.log({ kind: 'remote-control-menu', agentId: req.agentId ?? null, ptyId: req.ptyId, ms: this.now() - started });
        return;
      }
      await this.sleep(READY_POLL_MS);
    }
    // Nothing could be read: Esc in the dark, which at an empty box does nothing.
    if (!readable) this.deps.write(req.ptyId, '\x1b');
  }

  /**
   * The menu can come up after the wait above on a slow machine, and the next
   * message would be pasted into it and lost (Creed, 54076318). Whatever is
   * typed checks first: the menu on screen gets one Esc, and the text waits
   * until it has closed. No menu, nothing is pressed.
   */
  private async leaveLateMenu(req: PtySubmitRequest, grid: { cols: number; rows: number }): Promise<void> {
    const lines = (await this.deps.probe(req.ptyId, grid).catch(() => null))?.lines;
    if (!lines?.some((l) => REMOTE_MENU_RE.test(l))) return;
    const started = this.now();
    this.deps.write(req.ptyId, '\x1b');
    this.deps.log({ kind: 'remote-control-menu', agentId: req.agentId ?? null, ptyId: req.ptyId, late: true, source: req.source });
    while (this.now() - started < REMOTE_MENU_WAIT_MS) {
      await this.sleep(READY_POLL_MS);
      const now = (await this.deps.probe(req.ptyId, grid).catch(() => null))?.lines;
      if (!now?.some((l) => REMOTE_MENU_RE.test(l))) return;
    }
  }
}

/** A queued send to Claude is typed only at an input box it can see. */
/** Not ready: the box is drawn, but this process's CLI has not reported SessionStart yet. */
const NO_SESSION = 'no-session';
/** Not ready: there is a window, but its screen of this terminal cannot be read. */
const UNREADABLE = 'unreadable';

function isWakeText(text: string): boolean {
  const ids = wakeIds(text);
  return ids.filed.length > 0 || ids.yours.length > 0;
}

function needsBox(req: PtySubmitRequest): boolean {
  return req.provider === 'claude' && req.source === 'queue';
}

/** Requests to the renderer, matched to replies by id, each with a timeout. A
 *  late reply to an expired id is dropped. */
export class TerminalProbes {
  private seq = 0;
  private pending = new Map<number, (v: TerminalProbe | null) => void>();

  /** `send` delivers the request and returns false when there is no window. */
  request(send: (id: number) => boolean, timeoutMs = PROBE_TIMEOUT_MS): Promise<TerminalProbe | null | undefined> {
    const id = ++this.seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.pending.delete(id); resolve(null); }, timeoutMs);
      this.pending.set(id, (v) => { clearTimeout(timer); resolve(v); });
      let sent = false;
      try { sent = send(id); } catch { sent = false; }
      if (!sent) { clearTimeout(timer); this.pending.delete(id); resolve(undefined); }
    });
  }

  reply(id: unknown, value: unknown): void {
    if (typeof id !== 'number') return;
    const done = this.pending.get(id);
    if (!done) return;
    this.pending.delete(id);
    done(validProbe(value));
  }

  size(): number { return this.pending.size; }
}

function validProbe(v: unknown): TerminalProbe | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const lines = Array.isArray(o.lines) && o.lines.every((l) => typeof l === 'string') ? (o.lines as string[]) : null;
  return { lines, safe: o.safe === true, pooled: o.pooled === true };
}

/** The main inbox nudge's memory of its last delivery to one terminal. */
export interface NudgeState { typedAt: number; outcome: SubmitResult['outcome']; pressOnlyPasses: number }
export const NUDGE_MAX_PRESS_ONLY = 3;

/**
 * What the next nudge beat does. After a nudge that ended stuck, typing the
 * text again would fuse it onto the stuck one, so the beat presses the key
 * alone, at most three times (A7), then waits for the person. Any hook from
 * the agent since that nudge means it moved on: type as normal.
 */
export function nextNudgeAction(state: NudgeState | undefined, activitySince: (ms: number) => boolean): 'type' | 'press' | 'wait' {
  if (!state || state.outcome !== 'stuck') return 'type';
  if (activitySince(state.typedAt)) return 'type';
  return state.pressOnlyPasses < NUDGE_MAX_PRESS_ONLY ? 'press' : 'wait';
}
