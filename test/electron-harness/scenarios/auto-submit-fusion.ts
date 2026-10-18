/**
 * SCENARIO - L0-FUSION stage 5.4c. THE FUSED TRANSACTION AGAINST A REAL XTERM.
 *
 * The node suites prove the owner against a world of doubles. What they cannot show is
 * that the facts the owner decides on really ARRIVE from a rendered terminal: that a
 * genuine keydown is classified HUMAN at the place bytes leave the renderer, that a
 * cursor-position reply is not, that the prompt mirror really says "draft", and that the
 * erase oracle really reads the rendered prompt row. This scenario bundles the
 * PRODUCTION pieces on both sides of the IPC line into one page and lets them run:
 *
 *   REAL   AutomaticSubmitOwner, buildOwnerDeps, ScreenReadingBroker   (src/main, pure)
 *   REAL   terminalPool + inputOrigin + xterm: classification, the prompt mirror, the
 *          input-state mirror, the screen-read responder, readScreenForNeedle
 *   REAL   timers. GAP_MS is a real 140ms and the human's key lands inside it.
 *
 *   DOUBLE the PTY PROCESS: a line-editing echo TUI (Ctrl-U kills the line, Enter submits).
 *   DOUBLE `pty.ts`'s ACCOUNTING, which cannot load here (node-pty): a declared-HUMAN
 *          write advances the generation and stamps lastHumanInputAt; PROGRAMMATIC and
 *          CONTROL do not. That is the OwnerPty contract restated in nine lines, and it
 *          is NOT evidence about pty.ts itself - test/input-provenance.test.cjs is.
 *   DOUBLE capacity: ALLOW, with a switch for a late REFUSE.
 *   The IPC hop is a function call. Channel wiring is pinned statically elsewhere.
 *
 * EVERY ARM HAS A PAIRED CONTROL that differs in exactly the fact under test and ends the
 * other way, so no outcome here can be the scenario's own default:
 *   ctl (nobody types -> COMMITTED)         vs  int (a real key in the gap -> INTERFERED)
 *   int (a HUMAN key  -> INTERFERED)        vs  cpr (a CPR reply in the gap -> COMMITTED)
 *   abt (Ctrl-U honoured -> ABORTED)        vs  abn (Ctrl-U ignored -> INTERFERED, no Enter)
 *   ctl (free prompt -> typed)              vs  drf (human draft mirrored -> REFUSED, nothing typed)
 */
import {
  acquireTerminal, attachTerminal, readScreenForNeedle
} from '../../../src/renderer/src/components/terminalPool';
import { AutomaticSubmitOwner, GAP_MS, type SubmitOutcome } from '../../../src/main/automaticSubmit';
import { buildOwnerDeps, ScreenReadingBroker } from '../../../src/main/automaticSubmitWiring';
import { isTerminalPromptState, type TerminalPromptState } from '../../../src/shared/promptState';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
    cth: Record<string, unknown>;
  }
}

interface LogEntry { via: 'OWNER' | 'BRIDGE'; data: string; origin: string }

/** The PTY process double: a line editor that echoes, kills the line on Ctrl-U (unless
 *  told to ignore it), submits on Enter and swallows escape sequences sent TO it. */
class EchoTui {
  line = '';
  submitted: string[] = [];
  ignoreClear = false;
  emit: (chunk: string) => void = () => { /* not attached yet */ };
  onPayload: (() => void) | null = null;
  boot(): void { this.emit('\x1b[2J\x1b[Hecho tui\r\n> '); }
  input(data: string): void {
    const text = data.replace(/\x1b\[20[01]~/g, '');
    if (text.startsWith('\x1b')) return; // a terminal reply (CPR, focus): not line input
    for (const ch of text) {
      if (ch === '\r') { this.submitted.push(this.line); this.line = ''; this.emit('\r\n> '); }
      else if (ch === '\x15') { if (!this.ignoreClear) { this.line = ''; this.emit('\r\x1b[2K> '); } }
      else { this.line += ch; this.emit(ch); }
    }
    if (text.length > 3 && this.onPayload) { const f = this.onPayload; this.onPayload = null; f(); }
  }
}

interface Pty {
  tui: EchoTui; generation: number; lastHumanInputAt: number | undefined;
  inputState: unknown; promptState: TerminalPromptState | undefined; promptBlocks: unknown[];
  log: LogEntry[];
}
const ptys = new Map<string, Pty>();
const pty = (id: string): Pty => {
  let p = ptys.get(id);
  if (!p) {
    p = { tui: new EchoTui(), generation: 0, lastHumanInputAt: undefined, inputState: undefined, promptState: undefined, promptBlocks: [], log: [] };
    ptys.set(id, p);
  }
  return p;
};

let screenReadListener: ((req: { requestId: string; ptyId: string; needle: string }) => void) | null = null;
let screenAnswers = 0;
const broker = new ScreenReadingBroker((ptyId, requestId, needle) => {
  if (!screenReadListener) return false;
  screenReadListener({ requestId, ptyId, needle });
  return true;
});

function installBridgeStub(): void {
  const unsub = () => () => { /* nothing subscribed */ };
  window.cth = {
    onPtyData: (id: string, cb: (chunk: string) => void) => { pty(id).tui.emit = cb; return () => { /* kept */ }; },
    onPtyExit: unsub(), onPtyRelaunch: unsub(),
    // `pty.ts`'s accounting, restated (see the header): HUMAN advances the generation.
    writePty: (id: string, data: string, origin: string) => {
      const p = pty(id);
      p.log.push({ via: 'BRIDGE', data, origin });
      if (origin === 'HUMAN') { p.generation += 1; p.lastHumanInputAt = Date.now(); }
      p.tui.input(data);
      return Promise.resolve({ ok: true });
    },
    redrawPty: () => { /* no pty */ }, resizePty: () => { /* no pty */ },
    copyToClipboard: () => { /* unused */ },
    readClipboard: () => Promise.resolve(''), readClipboardSync: () => '',
    statAbs: () => Promise.resolve(null), revealPath: () => Promise.resolve(),
    reportTerminalInputState: (id: string, state: unknown) => { pty(id).inputState = state; return Promise.resolve({ ok: true }); },
    // Validated exactly as main's handler validates it; a malformed report is dropped.
    reportTerminalPromptState: (id: string, state: unknown) => {
      if (!isTerminalPromptState(state)) return Promise.resolve({ ok: false });
      pty(id).promptState = state; pty(id).promptBlocks.push(state.block);
      return Promise.resolve({ ok: true });
    },
    onScreenReadRequest: (cb: typeof screenReadListener) => { screenReadListener = cb; return () => { screenReadListener = null; }; },
    answerScreenReading: (requestId: string, reading: unknown) => { screenAnswers += 1; broker.answer(requestId, reading); }
  };
}

const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });
/** FLAKY-TIMING (Andy, flaky-170): a poll's deadline is a hang guard, so it is generous - a
 *  mirror that never arrives still fails, at the deadline, and a busy renderer cannot. */
const MIRROR_DEADLINE_MS = 30_000;
async function until(what: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (what()) return true; await sleep(20); }
  return what();
}
/** A GENUINE KEYDOWN on the terminal's own textarea. xterm turns a printable keydown into
 *  data by itself; a keypress as well would type the character twice (measured). */
function pressKey(ta: HTMLTextAreaElement, ch: string): void {
  const code = ch.toUpperCase().charCodeAt(0);
  ta.dispatchEvent(new KeyboardEvent('keydown', { key: ch, code: `Key${ch.toUpperCase()}`, keyCode: code, which: code, bubbles: true, cancelable: true } as KeyboardEventInit));
}

let lateRefuse = false;
const owner = new AutomaticSubmitOwner(buildOwnerDeps({
  pty: {
    write: (id, data, origin) => { const p = pty(id); p.log.push({ via: 'OWNER', data, origin }); p.tui.input(data); return { ok: true }; },
    incarnation: (id) => (ptys.has(id) ? 1 : undefined),
    humanInputGeneration: (id) => ptys.get(id)?.generation,
    lastHumanInputAt: (id) => ptys.get(id)?.lastHumanInputAt,
    hasOutput: (id) => (ptys.has(id) ? true : undefined),
    inputState: (id) => ptys.get(id)?.inputState as never,
    promptState: (id) => ptys.get(id)?.promptState
  },
  capacity: {
    admit: (_agentId, workClass) => ({ verdict: 'ALLOW', reason: 'AVAILABLE', poolKey: 'pool', state: null, workClass, limitEpochAt: null, grantId: null }) as never,
    revalidate: () => (lateRefuse ? { verdict: 'REFUSE', reason: 'LIMITED' } : { verdict: 'ALLOW', reason: 'AVAILABLE' }) as never,
    confirmLaunch: () => { /* nothing to confirm */ },
    cancelGrant: () => { /* nothing to cancel */ },
    holdGrant: () => { /* nothing to hold */ }
  },
  ptyForAgent: (agentId) => agentId.replace(/^agent-/, ''),
  providerForPty: () => 'claude',
  requestScreenReading: (ptyId, needle) => broker.request(ptyId, needle)
}));

const root = () => document.getElementById('root')!;
async function open(id: string): Promise<{ ta: HTMLTextAreaElement; rowText: () => string; ready: boolean }> {
  const entry = acquireTerminal(id);
  attachTerminal(entry, root());
  pty(id).tui.boot();
  // Both mirrors must have ARRIVED through the production path before anything is asked.
  const ready = await until(() => pty(id).inputState !== undefined && pty(id).promptState !== undefined && entry.inputSelfTest !== 'unknown', MIRROR_DEADLINE_MS);
  pty(id).log.length = 0; // the self-test's own bytes are not part of any arm
  const rowText = () => {
    const buf = entry.term.buffer.active;
    return buf.getLine(buf.baseY + buf.cursorY)?.translateToString(true) ?? '';
  };
  return { ta: entry.term.textarea!, rowText, ready };
}
const submit = (id: string, requestId: string, text: string, admissionClass: 'CAPACITY_GATED' | 'USER_RELEASED' = 'CAPACITY_GATED'): Promise<SubmitOutcome> =>
  owner.submit({ requestId, agentId: `agent-${id}`, admissionClass, text, settleMs: 0 });
const ownerWrites = (id: string) => pty(id).log.filter((e) => e.via === 'OWNER').map((e) => e.data);

window.__harnessRun = async () => {
  const result: Record<string, unknown> = { gapMs: GAP_MS };
  try {
    installBridgeStub();

    // ── ctl: nobody types. The baseline every other arm is measured against. ──────────
    {
      const t = await open('ctl');
      const outcome = await submit('ctl', 'r-ctl', 'control message one');
      result.ctl = { ready: t.ready, outcome, ownerWrites: ownerWrites('ctl'), submitted: pty('ctl').tui.submitted,
        promptBlocksBefore: pty('ctl').promptBlocks.slice(), inputState: pty('ctl').inputState };
    }

    // ── int: A GENUINE KEY IN THE GAP. ────────────────────────────────────────────────
    {
      const t = await open('int');
      pty('int').tui.onPayload = () => { setTimeout(() => pressKey(t.ta, 'x'), 30); };
      const outcome = await submit('int', 'r-int', 'interfered message two');
      await sleep(50);
      const writesAtOutcome = ownerWrites('int');
      const again = await submit('int', 'r-int-2', 'a later automatic message');
      const manual = await submit('int', 'r-int-3', 'a later send-now message', 'USER_RELEASED');
      const lineBeforeResolve = pty('int').tui.line;
      // There is no default resolution: a bare "resolved" is refused and the hold stays.
      const bare = (owner.resolveInterference as (p: string, how?: unknown) => boolean)('int');
      const stillHeld = owner.inhibition('int') !== null;
      const resolved = owner.resolveInterference('int', 'SEND_AGAIN');
      const afterResolve = await submit('int', 'r-int-4', 'after the human resolved');
      result.int = {
        ready: t.ready, outcome, writesAtOutcome,
        humanBytes: pty('int').log.filter((e) => e.via === 'BRIDGE' && e.origin === 'HUMAN').map((e) => e.data),
        promptRow: t.rowText(), oracle: readScreenForNeedle('int', 'interfered message two'),
        submitted: pty('int').tui.submitted, again, manual, bare, stillHeld, resolved,
        lineBeforeResolve, lineAfterResolve: pty('int').tui.line,
        afterResolve, ownerWritesAtEnd: ownerWrites('int'),
        inhibitedAtEnd: owner.inhibition('int') !== null
      };
    }

    // ── cpr: A CURSOR-POSITION REPLY IN THE GAP is the terminal talking, not a person. ─
    {
      const t = await open('cpr');
      pty('cpr').tui.onPayload = () => { setTimeout(() => pty('cpr').tui.emit('\x1b[6n'), 30); };
      const outcome = await submit('cpr', 'r-cpr', 'cpr message three');
      const log = pty('cpr').log;
      const payloadAt = log.findIndex((e) => e.via === 'OWNER' && e.data.includes('cpr message three'));
      const enterAt = log.findIndex((e) => e.via === 'OWNER' && e.data === '\r');
      const replyAt = log.findIndex((e) => e.via === 'BRIDGE' && /^\x1b\[\d+;\d+R$/.test(e.data));
      result.cpr = { ready: t.ready, outcome, payloadAt, replyAt, enterAt, replyOrigin: replyAt >= 0 ? log[replyAt].origin : null,
        submitted: pty('cpr').tui.submitted, generation: pty('cpr').generation };
    }

    // ── abt / abn: a late refusal. The erase is VERIFIED ON THE RENDERED SCREEN. ──────
    for (const id of ['abt', 'abn']) {
      const t = await open(id);
      pty(id).tui.ignoreClear = id === 'abn';
      const answersBefore = screenAnswers;
      pty(id).tui.onPayload = () => { lateRefuse = true; };
      const outcome = await submit(id, `r-${id}`, `late refusal ${id} four`);
      lateRefuse = false;
      result[id] = { ready: t.ready, outcome, ownerWrites: ownerWrites(id), submitted: pty(id).tui.submitted,
        promptRow: t.rowText(), oracle: readScreenForNeedle(id, `late refusal ${id} four`),
        screenAnswers: screenAnswers - answersBefore, inhibited: owner.inhibition(id) !== null };
    }

    // ── drf: THE PROMPT MIRROR, END TO END. A human's draft refuses automatic typing. ─
    {
      const t = await open('drf');
      pressKey(t.ta, 'h'); pressKey(t.ta, 'i');
      const mirrored = await until(() => pty('drf').promptState?.block === 'draft', MIRROR_DEADLINE_MS);
      await sleep(1_700); // past HUMAN_QUIET_MS, so the DRAFT - not recency - is what refuses
      const outcome = await submit('drf', 'r-drf', 'must not be typed five');
      result.drf = { ready: t.ready, mirrored, promptBlocks: pty('drf').promptBlocks, outcome,
        ownerWrites: ownerWrites('drf'), line: pty('drf').tui.line, promptRow: t.rowText() };
    }

    window.harness.report({ ok: true, ...result });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack || e), partial: result });
  }
};
