/**
 * WakeFiling: the app files a wake's mail when the turn that read it ends (0.5.6).
 *
 * The inbox wake carries the messages themselves (shared/hiveNudge.ts), so the
 * agent no longer opens its inbox or moves files to `inbox/.done/`. This class
 * remembers which message ids each TYPED wake printed in full, and hands them
 * to the mover when the agent's turn ends.
 *
 * Every wake goes through the one submit door in main (ptySubmit.ts): the
 * renderer's queue by `pty:submit`, the worker watchdog directly. Both report
 * here with the text that was typed and the submitter's outcome, and the ids
 * are read back from that text (wakeIds), so:
 *  - a wake that was queued and never typed files nothing;
 *  - a wake a person was typing over (`held`) files nothing;
 *  - a wake still in the input box (`stuck`) files nothing until it is
 *    submitted: a later press of the key, or the CLI's own UserPromptSubmit
 *    with our text at its end;
 *  - a message the wake only named by path is never filed here. It stays the
 *    agent's to read and file. So does all the mail of an engine with no
 *    hooks (Cursor): its wake lists every id as the agent's to file.
 *
 * The turn end is the agent's own hook: `Stop`, or `PostInvocation` for
 * Antigravity, whose Stop fires only when the process exits. For a CLI that
 * sends neither (a person interrupted the turn, a bridge with no turn end
 * event), `noteQuiet` is the same evidence the app's idle status rests on: a
 * terminal with no output for WAKE_QUIET_MS, and no turn open in the hooks.
 *
 * It also answers "which mail has no wake carried yet" (pending), so a second
 * wake never prints a message the agent already has in front of it.
 *
 * No electron import: unit-testable (mirrors WorkerWakeWatchdog).
 */
import { wakeIds } from '../shared/hiveNudge';
import { promptTail, type SubmitResult } from '../shared/providerAutomation';

/** No terminal output for this long reads as a finished turn (renderer
 *  QUIESCE_IDLE_MS, WORKER_WAKE_IDLE_MS). */
export const WAKE_QUIET_MS = 12_000;
/** How long a turn the hooks show open, with no hook since, is left alone
 *  (WORKER_WAKE_OPEN_TURN_MS). */
export const WAKE_OPEN_TURN_MS = 15 * 60_000;

/** Hook events that show a turn (workerWake.isTurnHook, plus Antigravity's). */
const TURN_HOOKS: ReadonlySet<string> = new Set([
  'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'Stop', 'StopFailure',
  'SubagentStart', 'SubagentStop', 'PreInvocation', 'PostInvocation'
]);

/** One typed wake. */
interface TypedWake {
  /** Printed in full: filed at the turn end. */
  filed: string[];
  /** Every id it named, by path included. */
  named: string[];
  typedAt: number;
  /** The submitter had proof the CLI took it (outcome `submitted`). */
  proved: boolean;
  /** promptTail of the text, to recognise it in a late UserPromptSubmit. */
  tail: string;
}

export interface WakeFilingDeps {
  /** Move these messages from the agent's inbox to inbox/.done. */
  file: (agentId: string, ids: string[]) => void;
  /** A UserPromptSubmit from this agent at or after `sinceMs` ending in `tail`. */
  promptSeen: (agentId: string, sinceMs: number, tail: string) => boolean;
  now?: () => number;
}

export class WakeFiling {
  /** agentId → wakes submitted and not yet filed. */
  private awaiting = new Map<string, TypedWake[]>();
  /** agentId → the wake typed and still in its input box (outcome `stuck`). */
  private inBox = new Map<string, TypedWake>();
  /** agentId → ids named by a wake the CLI provably took: not printed again. */
  private named = new Map<string, Set<string>>();
  /** agentId → when its last turn ended. */
  private turnEndAt = new Map<string, number>();
  /** agentId → its last turn hook. */
  private lastHook = new Map<string, { at: number; event: string }>();
  /** agentId → wakes with no proof that a SessionStart or another prompt let go, for WAKE_OPEN_TURN_MS. A later
   *  prompt with the wake's text takes it back: Codex runs its launch prompt first and fires SessionStart with
   *  it, so a wake typed while it starts is sent after both (Kevin, pam-mvuzkmp3, 2 Nov 19:16). */
  private dropped = new Map<string, TypedWake[]>();
  /** agentId → wakes typed with no proof by their turn's end (trigger-prompt-058, god, 9 Nov 2026). Not filed: nothing
   *  says they were taken. Not printed again by any wake either: they may have gone in with their prompt's hook lost,
   *  and mail is never typed twice into an agent that took it. Shown to the person (unconfirmed), sent again only on
   *  their word (retry); a later prompt with the wake's text files them (takeBack). */
  private doubt = new Map<string, TypedWake[]>();
  private now: () => number;

  constructor(private deps: WakeFilingDeps) {
    this.now = deps.now ?? Date.now;
  }

  /**
   * Something went through the submitter for this agent. `text` is what was
   * typed (or, for a press of the key alone, what the caller believes is in
   * the box: it is not read then, the wake remembered from the typing is
   * used). A text that is not a wake matters only when a wake is in the box.
   */
  noteTyped(agentId: string | undefined, text: string, result: Pick<SubmitResult, 'outcome' | 'ms'>, pressOnly = false): void {
    if (!agentId) return;
    const box = this.inBox.get(agentId);
    if (pressOnly) {
      if (!box) return;
      if (result.outcome === 'gone') {
        // The process that held the text is gone, and the box with it.
        this.inBox.delete(agentId);
      } else if (result.outcome === 'submitted' || result.outcome === 'unconfirmed') {
        this.submitted(agentId, { ...box, typedAt: this.now() - result.ms, proved: result.outcome === 'submitted' });
      }
      return;
    }
    if (result.outcome === 'held' || result.outcome === 'gone') return;
    const ids = wakeIds(text);
    if (!ids.filed.length && !ids.yours.length && !box) return;
    const wake: TypedWake = {
      filed: ids.filed,
      named: [...ids.filed, ...ids.yours],
      typedAt: this.now() - result.ms,
      proved: result.outcome === 'submitted',
      tail: promptTail(text)
    };
    // Typed after a wake that is still in the box (another wake, or any other
    // message): the two are one prompt now, and the wake goes when it goes.
    if (box) {
      wake.filed = [...new Set([...box.filed, ...wake.filed])];
      wake.named = [...new Set([...box.named, ...wake.named])];
    }
    if (result.outcome === 'stuck') { this.inBox.set(agentId, wake); return; }
    this.submitted(agentId, wake);
  }

  /** The submitter is done with this wake: its mail waits for the turn end.
   *  Only a wake the CLI provably took counts as carried (pending). One with
   *  no proof, or still in the box, does not, so the watchdog's stall rule can
   *  type that mail again if no turn ever shows. */
  private submitted(agentId: string, wake: TypedWake): void {
    this.inBox.delete(agentId);
    if (wake.proved) this.name(agentId, wake.named);
    const list = this.awaiting.get(agentId) ?? [];
    list.push(wake);
    this.awaiting.set(agentId, list);
    // The turn ended before the submitter came back with its outcome (proof by
    // the screen alone can take seconds): file now, not at the next turn's end.
    if ((this.turnEndAt.get(agentId) ?? 0) >= wake.typedAt) this.release(agentId);
  }

  private name(agentId: string, ids: readonly string[]): void {
    let set = this.named.get(agentId);
    if (!set) { set = new Set(); this.named.set(agentId, set); }
    for (const id of ids) set.add(id);
  }

  /** Feed every hook event (from HookServer). A turn end files the mail. */
  noteHook(agentId: string | undefined, event: string | undefined, source?: string): void {
    if (!agentId || !event) return;
    const at = this.now();
    if (event === 'UserPromptSubmit') {
      // A wake left in the box went after all: a slow machine, or the person
      // pressed Return. Only with our text at the prompt's end; a person who
      // cleared the box and typed something else did not send it.
      const box = this.inBox.get(agentId);
      if (box && this.deps.promptSeen(agentId, box.typedAt, box.tail)) this.submitted(agentId, { ...box, typedAt: at, proved: true });
      this.takeBack(agentId, at);
      // A wake with no proof is taken by a prompt that carries its text, and
      // by nothing else. A person's own prompt in between did not send it (the
      // Enter was lost and the box cleared, or never held it): dropped here, so
      // its mail is not filed at this turn's end and the next wake prints it.
      const waits = this.awaiting.get(agentId);
      if (waits?.some((w) => !w.proved)) {
        const kept = waits.filter((w) => w.proved || this.deps.promptSeen(agentId, w.typedAt, w.tail));
        this.drop(agentId, waits.filter((w) => !kept.includes(w)));
        // The prompt with its text: taken.
        for (const w of kept) if (!w.proved) { w.proved = true; this.name(agentId, w.named); }
        if (kept.length) this.awaiting.set(agentId, kept); else this.awaiting.delete(agentId);
      }
    }
    // A compact fires SessionStart too, in the same process: its box is as it was.
    if (event === 'SessionStart' && source !== 'compact') {
      // A new session has an empty box, and a wake with no proof never reached it (a dialog took its Enter and
      // the engine restarted, F7). Dropped, or the next turn end would file mail nobody read.
      const box = this.inBox.get(agentId);
      if (box) this.drop(agentId, [box]);
      this.inBox.delete(agentId);
      const waits = this.awaiting.get(agentId);
      if (waits?.some((w) => !w.proved)) {
        const kept = waits.filter((w) => w.proved);
        this.drop(agentId, waits.filter((w) => !w.proved));
        if (kept.length) this.awaiting.set(agentId, kept); else this.awaiting.delete(agentId);
      }
    }
    if (!TURN_HOOKS.has(event)) return;
    this.lastHook.set(agentId, { at, event });
    // A wake with no proof is taken only by a prompt: a UserPromptSubmit with its text (above), or the prompt event
    // of an engine whose prompts carry no text (Antigravity's PreInvocation). A tool, a subagent or a Stop after it
    // is not: an Enter that answered a dialog lets the agent work again, and its own text was lost
    // (trigger-prompt-058, god, 9 Nov 2026: a trigger's mail filed as settled though it never ran).
    if (event === 'PreInvocation') {
      for (const w of this.awaiting.get(agentId) ?? []) {
        if (!w.proved) { w.proved = true; this.name(agentId, w.named); }
      }
    }
    if (event === 'Stop' || event === 'PostInvocation') {
      this.turnEndAt.set(agentId, at);
      this.release(agentId);
    }
  }

  private drop(agentId: string, wakes: TypedWake[]): void {
    if (!wakes.length) return;
    this.dropped.set(agentId, [...(this.dropped.get(agentId) ?? []), ...wakes]);
  }

  /** A prompt carries a dropped or unconfirmed wake's text: it was taken after all, and the turn's end files it. */
  private takeBack(agentId: string, at: number): void {
    const list = (this.dropped.get(agentId) ?? []).filter((w) => at - w.typedAt < WAKE_OPEN_TURN_MS);
    const doubted = this.doubt.get(agentId) ?? [];
    const seen = (w: TypedWake): boolean => this.deps.promptSeen(agentId, w.typedAt, w.tail);
    const taken = [...list.filter(seen), ...doubted.filter(seen)];
    const left = list.filter((w) => !taken.includes(w));
    if (left.length) this.dropped.set(agentId, left); else this.dropped.delete(agentId);
    const doubtLeft = doubted.filter((w) => !taken.includes(w));
    if (doubtLeft.length) this.doubt.set(agentId, doubtLeft); else this.doubt.delete(agentId);
    if (!taken.length) return;
    const waits = this.awaiting.get(agentId) ?? [];
    for (const w of taken) { waits.push({ ...w, typedAt: at, proved: true }); this.name(agentId, w.named); }
    this.awaiting.set(agentId, waits);
  }

  /**
   * The turn end for a CLI that sent no Stop. `lastOutputAt` is the agent's
   * terminal. Files only a wake the CLI provably took, and never while the
   * hooks show a turn open or a turn that failed (StopFailure: the model never
   * answered, so the mail stays pending).
   */
  noteQuiet(agentId: string, lastOutputAt: number): void {
    const waits = this.awaiting.get(agentId);
    if (!waits?.length || !waits.every((w) => w.proved)) return;
    const now = this.now();
    if (lastOutputAt <= 0 || now - lastOutputAt < WAKE_QUIET_MS) return;
    const first = Math.min(...waits.map((w) => w.typedAt));
    if (now - Math.max(...waits.map((w) => w.typedAt)) < WAKE_QUIET_MS) return;
    const hook = this.lastHook.get(agentId);
    if (hook && hook.at >= first) {
      if (hook.event === 'StopFailure') return;
      if (now - hook.at < WAKE_OPEN_TURN_MS) return;
    }
    this.release(agentId);
  }

  private release(agentId: string): void {
    const waits = this.awaiting.get(agentId);
    if (!waits?.length) return;
    this.awaiting.delete(agentId);
    // Filed only with proof the CLI took it (trigger-prompt-058). A wake with none is unconfirmed: not filed, and not
    // printed again by itself either (it may have gone in with its hook lost). The person is shown it and decides.
    const unproved = waits.filter((w) => !w.proved);
    if (unproved.length) {
      for (const w of unproved) this.name(agentId, w.named);
      this.doubt.set(agentId, [...(this.doubt.get(agentId) ?? []), ...unproved]);
    }
    const ids = [...new Set(waits.filter((w) => w.proved).flatMap((w) => w.filed))];
    if (!ids.length) return;
    try { this.deps.file(agentId, ids); } catch { /* best effort: the mail stays in the inbox */ }
  }

  /** The agents with a submitted wake not filed yet (for the quiet check). */
  waiting(): string[] {
    return [...this.awaiting.keys()];
  }

  /**
   * The mail in this inbox that no wake has carried yet. Ids that have left
   * the inbox are forgotten here, so the memory stays as small as the inbox.
   */
  pending<T extends { id?: unknown }>(agentId: string, inbox: readonly T[]): T[] {
    const named = this.named.get(agentId);
    if (!named?.size) return [...inbox];
    const live = new Set(inbox.map((m) => m.id));
    for (const id of [...named]) if (!live.has(id)) named.delete(id);
    return inbox.filter((m) => !(typeof m.id === 'string' && named.has(m.id)));
  }

  /**
   * The mail of this inbox that a wake typed with no proof it was taken (trigger-prompt-058): shown to the person,
   * never typed again by itself. Mail that left the inbox (the agent filed it, it was answered) is forgotten here.
   */
  unconfirmed<T extends { id?: unknown }>(agentId: string, inbox: readonly T[]): T[] {
    const list = this.doubt.get(agentId);
    if (!list?.length) return [];
    const live = new Set(inbox.map((m) => m.id));
    const kept = list.filter((w) => w.filed.some((id) => live.has(id)));
    if (kept.length) this.doubt.set(agentId, kept); else this.doubt.delete(agentId);
    const ids = new Set(kept.flatMap((w) => w.filed));
    return inbox.filter((m) => typeof m.id === 'string' && ids.has(m.id));
  }

  /**
   * The person's word on unconfirmed mail (all of it, or the wakes that carried `ids`): the next wake prints it again,
   * once. Returns the ids let go. Never called by a timer: retries are the person's, so they are bounded by them.
   */
  retry(agentId: string, ids?: readonly string[]): string[] {
    const list = this.doubt.get(agentId) ?? [];
    const pick = ids ? new Set(ids) : null;
    const again = list.filter((w) => !pick || w.filed.some((id) => pick.has(id)));
    if (!again.length) return [];
    const left = list.filter((w) => !again.includes(w));
    if (left.length) this.doubt.set(agentId, left); else this.doubt.delete(agentId);
    const named = this.named.get(agentId);
    const freed = [...new Set(again.flatMap((w) => w.named))];
    for (const id of freed) named?.delete(id);
    return [...new Set(again.flatMap((w) => w.filed))];
  }

  /** Forget an agent (its terminal closed). Nothing is filed: mail a turn
   *  never finished with stays pending for whoever takes the mailbox next. */
  forget(agentId: string): void {
    this.awaiting.delete(agentId);
    this.doubt.delete(agentId);
    this.inBox.delete(agentId);
    this.dropped.delete(agentId);
    this.named.delete(agentId);
    this.turnEndAt.delete(agentId);
    this.lastHook.delete(agentId);
  }
}
