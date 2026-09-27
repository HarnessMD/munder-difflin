/**
 * Watches a fresh CLI's output for its sign in prompt (0.5.3, I2 part 2).
 *
 * One window of recent plain text per pty. When it reads a prompt the modal
 * can draw (shared/cliLogin.ts), it says so once; when the text after the
 * prompt says the sign in ended, it says that and stops. Only a pty that was
 * registered with its provider is watched, and only for a while after its
 * start: a sign in happens at the start of a session, and a link with a code
 * like string in an agent's ordinary work an hour later is not one.
 *
 * Electron free so it runs under node --test; main hands it the pty output
 * and sends what it emits over `pty:login:<id>`.
 */
import type { AgentProvider } from '../shared/agentProvider';
import { detectLoginOutcome, detectLoginPrompt, sameLoginPrompt, stripAnsi, type LoginEvent, type LoginPrompt } from '../shared/cliLogin';

interface Watched {
  provider: AgentProvider;
  since: number;
  window: string;
  /** What is on screen now, or null. */
  prompt: LoginPrompt | null;
  /** Output since the prompt, for the outcome. */
  after: string;
  ended: boolean;
}

const WINDOW_MAX = 6000;
/** A sign in happens before the CLI's first prompt. The watcher stops at the
 *  first thing that proves the person is past it (a line submitted to the
 *  pty, a hook event from the agent) and, as the outer bound, after this. */
export const WATCH_MS = 5 * 60 * 1000;

export class CliLoginWatcher {
  private ptys = new Map<string, Watched>();
  constructor(private readonly emit: (id: string, e: LoginEvent) => void, private readonly now: () => number = Date.now) {}

  /** A CLI just started (or restarted) in this pty. */
  track(id: string, provider: AgentProvider): void {
    this.ptys.set(id, { provider, since: this.now(), window: '', prompt: null, after: '', ended: false });
  }
  forget(id: string): void { this.ptys.delete(id); }
  /** What the modal shows for this pty now, for the actions. */
  current(id: string): LoginPrompt | null { return this.ptys.get(id)?.prompt ?? null; }
  /** The person closed the modal: the same ask is not shown again. */
  dismiss(id: string): void { const w = this.ptys.get(id); if (w) { w.prompt = null; w.ended = true; } }
  /** The CLI is past its sign in: a line was submitted to it (the person is
   *  at its prompt), or it sent a hook event (it is working). Nothing after
   *  this is a sign in, whatever it looks like. */
  pastLogin(id: string): void { const w = this.ptys.get(id); if (w && !w.prompt) { w.ended = true; } }
  /** For a test: whether this pty is still being read. */
  watching(id: string): boolean { const w = this.ptys.get(id); return !!w && !w.ended; }

  observe(id: string, data: string): void {
    const w = this.ptys.get(id);
    if (!w || w.ended) return;
    if (this.now() - w.since > WATCH_MS) { this.ptys.delete(id); return; }
    const plain = stripAnsi(data);
    w.window = (w.window + plain).slice(-WINDOW_MAX);
    if (w.prompt) {
      w.after = (w.after + plain).slice(-WINDOW_MAX);
      const done = detectLoginOutcome(w.after);
      if (done) {
        w.prompt = null; w.ended = done.outcome === 'success'; w.after = '';
        this.emit(id, { done });
      }
      return;
    }
    // A prompt is judged on whole lines: a link cut mid chunk is not a link yet.
    if (!plain.includes('\n')) return;
    const p = detectLoginPrompt(w.provider, w.window);
    if (p && !sameLoginPrompt(p, w.prompt)) {
      w.prompt = p; w.after = '';
      this.emit(id, { prompt: p });
    }
  }
}
