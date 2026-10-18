/**
 * SCENARIO — can a rendered screen answer "the input box is empty AND nothing was
 * submitted"? This is the observation `L0-TERMMATRIX` is blocked on.
 *
 * WHAT IS REAL HERE, because the answer is only worth what the instrument is:
 *   - a real Chromium renderer and a real layout engine
 *   - the REAL `terminalPool.ts` — `acquireTerminal`, `attachTerminal` and the
 *     `hasTerminalDraft` predicate under test, imported, not reimplemented
 *   - a real `@xterm/xterm` Terminal, really `open()`ed, so `entry.opened` is true
 *     and `buffer.active` holds a parsed screen rather than a plausible stub
 *   - the real keystroke path: `term.input()` fires the production `onData`
 *     handler, which is what maintains `lineBuf` and `inputDirty`
 *
 * WHAT IS SUBSTITUTED, and why it is the environment rather than the subject:
 *   - `window.cth`, the preload bridge. It is by definition the boundary between
 *     renderer and main, and the renderer cannot be loaded without one. Nothing
 *     under test reads it: `promptLineHasText` reads xterm's buffer, and the bytes
 *     that buffer holds are written here directly. No production file is modified
 *     and no production-only hook exists to make this observable.
 *   - the PTY. There is no child process, so nothing is echoed back; the TUI frames
 *     below are written straight into the terminal. That is the same stream a PTY
 *     would deliver, which is the point — the predicate reads the screen, and the
 *     screen does not know what produced it.
 *
 * WHAT THIS THEREFORE DOES AND DOES NOT SHOW. It shows the INSTRUMENT works: the
 * predicate can be driven to both answers, and to its "don't know", against a real
 * rendered screen. It does not show that any particular provider's TUI paints a box
 * this parser reads correctly — that is the matrix itself, and it needs real
 * captured output per provider, fed through this same path.
 */
import {
  acquireTerminal, attachTerminal, hasTerminalDraft, disposeTerminal
} from '../../../src/renderer/src/components/terminalPool';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
    cth: Record<string, unknown>;
  }
}

/** The preload surface `terminalPool` touches. Inert, and recorded so a scenario
 *  cannot quietly depend on main doing something. */
function installBridgeStub(): { writes: string[] } {
  const writes: string[] = [];
  const unsub = () => () => { /* no subscription to tear down */ };
  window.cth = {
    onPtyData: unsub(),
    onPtyExit: unsub(),
    onPtyRelaunch: unsub(),
    writePty: (_id: string, data: string) => { writes.push(data); },
    redrawPty: () => { /* no pty to redraw */ },
    resizePty: () => { /* no pty to resize */ },
    copyToClipboard: () => { /* not exercised */ },
    readClipboard: () => Promise.resolve(''),
    readClipboardSync: () => '',
    statAbs: () => Promise.resolve(null),
    revealPath: () => Promise.resolve()
  };
  return { writes };
}

/** A TUI input box exactly like the ones these agents paint: a boxed prompt line,
 *  `PROMPT_CHROME` characters, and optionally the user's text inside it. */
function promptFrame(text: string): string {
  const inner = text.padEnd(38, ' ');
  return [
    '\x1b[2J\x1b[H',
    '╭──────────────────────────────────────╮\r\n',
    `│ ❯ ${inner}│\r\n`,
    '╰──────────────────────────────────────╯\r\n',
    // Park the cursor back on the prompt row: `promptLineHasText` reads
    // `baseY + cursorY`, so where the cursor sits IS which line is the prompt.
    '\x1b[2;1H'
  ].join('');
}

const write = (term: { write: (d: string, cb?: () => void) => void }, data: string): Promise<void> =>
  new Promise((resolve) => term.write(data, () => resolve()));

const ECHO_GRACE_MS = 1000;

window.__harnessRun = async () => {
  const result: Record<string, unknown> = {};
  try {
    const { writes } = installBridgeStub();
    const root = document.getElementById('root')!;

    // ── The state Andy is stuck in: a terminal that was never rendered ──────────
    const detached = acquireTerminal('never-opened');
    detached.term.input('hello');
    const past = Date.now() + ECHO_GRACE_MS + 50;
    result.unopened = {
      opened: detached.opened,
      everAttached: detached.everAttached,
      // No rendered screen, so the screen cannot clear anything and the predicate
      // falls back to the keystroke model. This is the reading that cannot
      // distinguish an empty box from a full one.
      hasDraft: hasTerminalDraft('never-opened', past)
    };

    // ── The same question, with a real rendered screen ──────────────────────────
    const entry = acquireTerminal('rendered');
    attachTerminal(entry, root);
    result.opened = entry.opened;
    result.cols = entry.term.cols;
    result.rows = entry.term.rows;

    // (1) THE PHANTOM DRAFT. The user pressed keys, so the keystroke model says
    // dirty; the TUI swallowed them for its own UI, so the box is empty. This is
    // the "box is empty AND nothing was submitted" reading.
    entry.term.input('hello');
    await write(entry.term, promptFrame(''));
    const now1 = Date.now() + ECHO_GRACE_MS + 50;
    result.emptyBox = {
      inputDirty: entry.inputDirty,
      promptRow: readPromptRow(entry),
      hasDraft: hasTerminalDraft('rendered', now1)
    };

    // (2) A REAL DRAFT. Same keystrokes, but the box shows them.
    await write(entry.term, promptFrame('write the report'));
    const now2 = Date.now() + ECHO_GRACE_MS + 50;
    result.filledBox = {
      inputDirty: entry.inputDirty,
      promptRow: readPromptRow(entry),
      hasDraft: hasTerminalDraft('rendered', now2)
    };

    // (3) THE ECHO WINDOW. Immediately after a keystroke the screen is showing the
    // past, so it is not evidence and must not be allowed to clear the block.
    entry.term.input('x');
    await write(entry.term, promptFrame(''));
    result.insideEchoGrace = { hasDraft: hasTerminalDraft('rendered', Date.now()) };

    result.bridgeWrites = writes.length;
    disposeTerminal('never-opened');
    disposeTerminal('rendered');
    window.harness.report({ ok: true, ...result });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack || e), partial: result });
  }
};

/** The exact row the predicate reads, returned so a failure shows what was on
 *  screen rather than only that a boolean disagreed. */
function readPromptRow(entry: { term: { buffer: { active: any } } }): string | null {
  const buf = entry.term.buffer.active;
  const line = buf.getLine(buf.baseY + buf.cursorY);
  return line ? line.translateToString(true) : null;
}
