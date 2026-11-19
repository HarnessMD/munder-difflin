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

/**
 * AN API'S ERROR, NOT A SIGN IN (0.5.10, founder on RC13, 17 Nov). A Gemini agent that woke from sleep printed Google's
 * "UNAUTHENTICATED (code 401): Request had invalid authentication credentials. Expected OAuth 2 access token, login
 * cookie or other valid authentication credential. See https://developers.google.com/identity/sign-in/web/devconsole-project."
 * Its "login cookie" is a sign in word and the line has a link, so the generic reading offered Google's help page as
 * a sign in, while the CLI refreshed its token by itself and kept working. An error from a model's API is the CLI's
 * business: it retries, refreshes, or says how to sign in again in words of its own, which are read as before.
 *
 * So the generic reading is done again with every API error line left out (withoutApiErrors): an error's words are
 * no sign in context, for that reading or for one after it (Antigravity's link after a 401 is read by its own recipe,
 * not the generic reading, which the error's "login" would have let in first). Then its link is judged (apiErrorAsk):
 * a help page, or the rest of an error line a terminal broke onto the next row, is no sign in. A real sign in that
 * comes after an error has its words and its link on lines of their own, and reads as before. A provider's own
 * recipe is never second guessed: it reads its own sign in pages only.
 */
/** Google's and gRPC's status names, as an API prints them: upper case only, so ordinary words are not read. */
const API_STATUS = /\b(UNAUTHENTICATED|PERMISSION_DENIED|RESOURCE_EXHAUSTED|INVALID_ARGUMENT|FAILED_PRECONDITION|DEADLINE_EXCEEDED)\b/;
/** An HTTP error status where an API writes one: `code 401`, `(code 401)`, `"code": 401`, `status: 403`, `HTTP/1.1 401`,
 *  `error 429`, or a status with its reason (`401 Unauthorized`), and the words APIs answer a bad credential with. */
const API_ERROR = new RegExp([
  '\\b(?:code|status|http(?:/\\d(?:\\.\\d)?)?|error)["\']?[\\s:=(]*[45]\\d\\d\\b',
  '\\b[45]\\d\\d\\s+(?:unauthori[sz]ed|forbidden|too many requests|bad request|not found|internal server error|service unavailable|bad gateway|gateway timeout)\\b',
  '\\bapi error\\b',
  '\\binvalid authentication credentials?\\b',
  '\\brequest had invalid\\b'
].join('|'), 'i');
/** A help page, never a sign in page: a docs, developers, support or help site, or a `/docs/` path. No provider's
 *  sign in host (LOGIN_HOSTS) is one. */
function helpPage(url: string): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  const host = u.hostname.toLowerCase();
  return /^(developers|docs|support|help)\./.test(host) || host === 'cloud.google.com' || host === 'ai.google.dev' || /\/docs?\//i.test(u.pathname);
}
const errorLine = (line: string): boolean => API_STATUS.test(line) || API_ERROR.test(line);
/** The window with every API error line left blank, the rows kept. */
export function withoutApiErrors(window: string): string {
  return window.split('\n').map((l) => (errorLine(l) ? '' : l)).join('\n');
}

/** What the watcher offers for this window, or null: a provider's own recipe as read; the generic reading only on
 *  the window without its API errors, and only when its link is no help page or broken off error line. */
export function readLoginAsk(provider: AgentProvider, window: string): LoginPrompt | null {
  const p = detectLoginPrompt(provider, window, { local: true });
  if (!p || p.recipe === 'provider') return p;
  const g = detectLoginPrompt(provider, withoutApiErrors(window), { local: true });
  if (!g) return null;
  if (g.recipe === 'generic' && apiErrorAsk(window, g)) return null;
  return g;
}

/** Whether the generic reading's ask is an API's error: its link is a help page, or sits on an error line, or is
 *  the rest of one a terminal broke onto the next row (the row is the link alone after an error line that stops
 *  mid sentence, or "See" and the link after any error line). With no link, its line is an error line. A link on a
 *  row of its own after a whole sentence ("Token expired (401). Please sign in again.") is still read as a sign in. */
export function apiErrorAsk(window: string, prompt: LoginPrompt): boolean {
  if (prompt.recipe !== 'generic') return false;
  if (!prompt.url) return errorLine(prompt.line);
  if (helpPage(prompt.url)) return true;
  const lines = window.split('\n').map((l) => l.trim());
  let at = -1;
  for (let i = lines.length - 1; i >= 0 && at < 0; i--) if (lines[i].includes(prompt.url)) at = i;
  if (at < 0) return errorLine(prompt.line);
  if (errorLine(lines[at])) return true;
  let before = at - 1;
  while (before >= 0 && lines[before] === '') before--;
  if (before < 0 || !errorLine(lines[before])) return false;
  const lead = lines[at].slice(0, lines[at].indexOf(prompt.url)).trim();
  if (/^see:?$/i.test(lead)) return true;
  return lead === '' && !/[.:!?]$/.test(lines[before]);
}

/** Hook events that mean the agent is at work, so past any sign in: it took a prompt, ran a tool, ended a turn.
 *  Not SessionStart or Status, which a CLI may send before its sign in is done. */
export const WORK_EVENTS: ReadonlySet<string> = new Set(['UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop']);

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
  /** The agent is at work (a WORK_EVENTS hook): whatever it printed was no sign in it needed, or one it finished
   *  without a word the outcome reads (a token it refreshed by itself). An ask still on screen closes quietly, the
   *  same "done" main's closeLoginModal sends, and nothing after is read. */
  agentWorking(id: string): void {
    const w = this.ptys.get(id);
    if (!w) return;
    const open = w.prompt;
    w.prompt = null; w.ended = true; w.after = '';
    if (open) this.emit(id, { done: { outcome: 'failure', line: '' } });
  }
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
    // A CLI on this computer: its localhost callback is its own.
    // An API's error is no sign in (readLoginAsk); this computer's word ({ local: true }) is given inside.
    const p = readLoginAsk(w.provider, w.window);
    if (p && !sameLoginPrompt(p, w.prompt)) {
      w.prompt = p; w.after = '';
      this.emit(id, { prompt: p });
    }
  }
}
