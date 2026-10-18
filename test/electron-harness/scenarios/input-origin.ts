/**
 * SCENARIO - L0-FUSION stage 4. The half of input provenance that only a REAL xterm
 * can show: the two closing regimes, the drain, the excluded events, the programmatic
 * paste, the self-test, and the mouse-mode mirror.
 *
 * The instrument is the production `terminalPool` with a bridge stub whose `writePty`
 * RECORDS the origin each byte was sent with. That is the exact fact main would receive,
 * read at the exact place it leaves the renderer, so a wrong classification here is a
 * wrong classification in production and not a re-implementation of one.
 *
 * Each arm names the mutant it kills. A test that only demonstrates the right behaviour
 * on the cases it was written from is the shape of every weak test this floor has found.
 */
import {
  acquireTerminal, attachTerminal, disposeTerminal, resetTerminal
} from '../../../src/renderer/src/components/terminalPool';
import {
  inspectInputOrigin, markHumanOrigin, makeNonceCorrelatedProbe, selftestQuery, selftestReply
} from '../../../src/renderer/src/components/inputOrigin';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
    cth: Record<string, unknown>;
  }
}

interface Sent { id: string; data: string; origin: string }
const sent: Sent[] = [];
const reported: unknown[] = [];

function installBridgeStub(): void {
  const unsub = () => () => { /* nothing subscribed */ };
  window.cth = {
    onPtyData: unsub(), onPtyExit: unsub(), onPtyRelaunch: unsub(),
    writePty: (id: string, data: string, origin: string) => { sent.push({ id, data, origin }); return Promise.resolve({ ok: true }); },
    redrawPty: () => { /* no pty */ }, resizePty: () => { /* no pty */ },
    copyToClipboard: () => { /* unused */ },
    readClipboard: () => Promise.resolve(''), readClipboardSync: () => '',
    statAbs: () => Promise.resolve(null), revealPath: () => Promise.resolve(),
    // The mirror, recorded rather than dropped, so the mode arm can read what main would.
    reportTerminalInputState: (_id: string, state: unknown) => { reported.push(state); return Promise.resolve({ ok: true }); }
  };
}

const tick = () => new Promise<void>((r) => { setTimeout(r, 0); });
const sleep = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });
const write = (term: { write: (d: string, cb?: () => void) => void }, data: string): Promise<void> =>
  new Promise((resolve) => term.write(data, () => resolve()));
const lastOrigin = () => sent.length ? sent[sent.length - 1].origin : null;
const key = (ta: HTMLTextAreaElement, k: string, code: number) =>
  ta.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, keyCode: code, which: code, bubbles: true, cancelable: true } as KeyboardEventInit));

window.__harnessRun = async () => {
  const result: Record<string, unknown> = {};
  try {
    installBridgeStub();
    const root = document.getElementById('root')!;
    const entry = acquireTerminal('io');
    attachTerminal(entry, root);
    const term = entry.term;
    const ta = term.textarea!;
    result.opened = entry.opened;
    // Let the startup self-test run to completion before measuring anything; it swallows
    // its own bytes, so `sent` must still be empty afterwards.
    for (let i = 0; i < 20 && entry.inputSelfTest === 'unknown'; i++) await tick();
    result.selfTest = entry.inputSelfTest;
    result.selfTestLeakedBytes = sent.length;
    sent.length = 0;

    // ARM 1 - keyboard, same tick. Kills: "no capture listener / listener after xterm's".
    key(ta, 'ArrowRight', 39);
    result.keyboard = { origin: lastOrigin(), data: sent[sent.length - 1]?.data };
    await tick();
    result.keyboardWindowClosed = inspectInputOrigin('io')?.sameTick === false;

    // ARM 2 - programmatic input with no DOM event. Kills: "tag everything xterm emits".
    // `term.input()` and `term.paste()` both flag wasUserInput=true INSIDE xterm; the
    // design says that flag is not ours to trust, and the classifier must say CONTROL.
    sent.length = 0; term.input('prog'); result.programmaticInput = lastOrigin();
    sent.length = 0; term.paste('pasted'); result.programmaticPaste = lastOrigin();

    // ARM 3 - the SAME action, marked at code we own, is HUMAN. Kills: "mark is a no-op".
    sent.length = 0; markHumanOrigin('io', 'paste-async'); term.paste('user');
    result.markedPaste = lastOrigin();

    // ARM 4 - a terminal protocol reply is CONTROL even right after a keystroke. Kills:
    // "the keyboard window leaks into write() processing".
    key(ta, 'ArrowRight', 39); await tick(); sent.length = 0;
    await write(term, '\x1b[6n');
    result.dsrReply = { origin: lastOrigin(), data: sent[sent.length - 1]?.data };

    // ARM 5 - focus is EXCLUDED. A focus report emitted inside a focus dispatch must
    // read CONTROL. Kills: "listen to every event inside term.element".
    sent.length = 0;
    ta.addEventListener('focus', () => { term.input('\x1b[I', false); }, { once: true });
    ta.dispatchEvent(new FocusEvent('focus'));
    result.focusReport = lastOrigin();

    // ARM 5b - BLOCKER 1: a protocol reply INSIDE a held window is CONTROL and does NOT
    // extend the drain. Open held with a composition event, then write a DSR; xterm's CPR
    // reply lands while held is open. Before the fix classifyOutbound returned HUMAN for
    // every held byte and rearmHold reset the timer, so a cursor-polling TUI held the
    // window open forever. Now: ESC-prefixed reply -> CONTROL, no rearm.
    sent.length = 0;
    ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    result.heldOpenBeforeReply = inspectInputOrigin('io')?.held === true;
    await write(term, '[6n');
    result.replyInHeld = lastOrigin();                 // must be CONTROL, not HUMAN
    // A printable composition byte right after must still be HUMAN: the reply neither
    // stole the window nor, by not rearming, is the only thing keeping it open.
    term.input('x', false);
    result.humanAfterReplyInHeld = lastOrigin();

    // ARM 6 - a REAL IME through xterm's CompositionHelper (Dwight 23.2: the old arm
    // used manual term.input()). compositionstart opens our held window; xterm emits the
    // composed text on a setTimeout(0); the emitted byte must classify HUMAN. This drives
    // the actual DOM pipeline - compositionstart/update/end - not an injected byte.
    ta.focus();
    ta.value = '';
    ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    ta.value = 'あ';
    ta.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'あ', bubbles: true }));
    await tick();                       // xterm schedules compositionPosition.end (setTimeout 0)
    sent.length = 0;
    ta.dispatchEvent(new CompositionEvent('compositionend', { data: 'あ', bubbles: true }));
    for (let i = 0; i < 20 && sent.length === 0; i++) await sleep(5);   // _finalizeComposition emits on setTimeout(0)
    result.realImeData = sent.map((x) => x.data).join('');
    result.realImeOrigin = lastOrigin();
    const imeEmittedAt = Date.now();

    // ARM 7 - BOTH sides of the 50 ms boundary, with LITERALS, not the imported constant
    // (Dwight 23.2: importing HELD_DRAIN_MS made the test's own wait move with the boundary,
    // so it proved eventual expiry, not that 50 is what holds). The held window was just
    // rearmed by the IME emission. The bracket [25, 145] ms is deliberately loose against
    // timer jitter while pinning both directions independent of the constant: raise it past
    // 145 and the upper read fails; drop it below 25 and the lower read does. inspect() is a
    // pure read and does not itself rearm the drain.
    // FLAKY-TIMING: the reads used to be sleeps measured from the IME emit, so a starved renderer
    // woke past 50 ms and read "drained" at "~25 ms". Now the window is (re)opened synchronously and
    // the two reads are timers scheduled in the SAME TICK as its drain timer: expired timers run in
    // due-time order however late the renderer wakes, so +25 always reads before the +50 drain and
    // +145 always after it. The literals still pin both directions of the constant.
    void imeEmittedAt;
    await sleep(60);                                        // let the IME's held window drain first
    ta.dispatchEvent(new Event('input', { bubbles: true })); // opens held NOW: drain due at +HELD_DRAIN_MS
    const readAt = (ms: number) => new Promise<boolean | undefined>((r) => { setTimeout(() => r(inspectInputOrigin('io')?.held), ms); });
    const at25 = readAt(25), at145 = readAt(145);
    result.heldAt25 = await at25;      // < 50 -> still held
    result.heldAt145 = await at145;    // > 50 -> drained

    // ARM 8 - the mouse-mode MIRROR follows the TUI and comes back. Kills: "one-shot at
    // arm time". Read from xterm's own modes, forwarded to (the stub of) main.
    reported.length = 0;
    await write(term, '\x1b[?1000h'); await tick();
    const onReport = reported[reported.length - 1] as { mouseTrackingMode?: string } | undefined;
    await write(term, '\x1b[?1000l'); await tick();
    const offReport = reported[reported.length - 1] as { mouseTrackingMode?: string } | undefined;
    result.mirror = {
      afterOn: onReport?.mouseTrackingMode, afterOff: offReport?.mouseTrackingMode,
      xtermNow: term.modes.mouseTrackingMode, reports: reported.length
    };

    // ARM 9 - BLOCKER 4 (Dwight 23.3): a same-id respawn re-establishes provenance.
    // resetTerminal mirrors the relaunch path. After it the entry must reset to 'unknown'
    // and re-run the self-test back to 'pass', and send a FRESH report - not sit on the
    // old cached state while main's new session is NO_STATE.
    const reportsBefore = reported.length;
    resetTerminal('io');
    result.selfTestResetImmediate = entry.inputSelfTest;          // synchronously back to 'unknown'
    for (let i = 0; i < 40 && entry.inputSelfTest === 'unknown'; i++) await tick();
    result.selfTestAfterReset = entry.inputSelfTest;              // proven again
    const afterReset = reported.slice(reportsBefore);
    result.reportsAfterReset = afterReset.length;
    result.lastReportSelfTest = (afterReset[afterReset.length - 1] as { selfTest?: string } | undefined)?.selfTest;

    // ARM 10 - BLOCKER 4 retry half: a report main REJECTS is retried on backoff and the
    // cache is set only on ACK. Reject the next report once, then change state; the retry
    // (100ms) must land the state that the first, rejected attempt carried.
    let failsLeft = 1;
    const realReport = window.cth.reportTerminalInputState as (id: string, st: unknown) => Promise<{ ok: boolean }>;
    const recordedOk: unknown[] = [];
    window.cth.reportTerminalInputState = (id: string, st: unknown) => {
      if (failsLeft > 0) { failsLeft--; return Promise.resolve({ ok: false, error: 'no pty (simulated)' }); }
      recordedOk.push(st); return realReport(id, st);
    };
    await write(term, '[?1000h');   // mouse mode -> new state -> first report REJECTED
    // The 100 ms retry fires and is accepted. FLAKY-TIMING: poll for it (5 s deadline) instead of a
    // fixed 400 ms; a retry that never comes still fails, at the deadline.
    for (let i = 0; i < 250 && !recordedOk.some((st) => (st as { mouseTrackingMode?: string }).mouseTrackingMode === 'vt200'); i++) await sleep(20);
    window.cth.reportTerminalInputState = realReport;
    result.retryLanded = recordedOk.some((st) => (st as { mouseTrackingMode?: string }).mouseTrackingMode === 'vt200');
    await write(term, '[?1000l');

    // ── The five mutant-killing arms this replacement adds (Dwight 24.1 / 24.3) ──────
    // Each NAMES the defective variant it kills and is written so it FAILS against that
    // variant; a green arm here is only meaningful because its mutant is red.

    // ARM 11 - GAP A (Dwight 24.1): held AND same-tick open at once. A real human arrow
    // dispatched while a held (IME) window is open must classify HUMAN. classifyOutbound
    // checks sameTick BEFORE held, so the ESC-prefixed arrow is the human's key, not a
    // reply. KILLS THE BRANCH-SWAP MUTANT: swap the two branches and held is consulted
    // first, where isTerminalReply sees the leading ESC and returns CONTROL - this fails.
    await sleep(60);                                             // let any prior held drain first
    ta.dispatchEvent(new Event('input', { bubbles: true }));    // opens the held window (no xterm composition)
    result.gapA_heldOpen = inspectInputOrigin('io')?.held === true;
    sent.length = 0;
    key(ta, 'ArrowRight', 39);                                  // opens same-tick; xterm emits ESC[C
    result.gapA_arrowData = sent[sent.length - 1]?.data;
    result.gapA_arrowOrigin = lastOrigin();                     // HUMAN (only if sameTick is checked first)
    result.gapA_heldStillOpen = inspectInputOrigin('io')?.held === true;   // both were open at emit

    // ARM 12 - GAP B (Dwight 24.1): a protocol reply inside held returns CONTROL and MUST
    // NOT rearm the drain. Open held at T; at ~T+30 inject a CPR reply; then poll PAST the
    // ORIGINAL 50ms drain but before a reply-rearm drain (~T+80) would elapse. The window
    // must already be closed. KILLS THE REARM MUTANT: a variant that rearms after returning
    // CONTROL keeps the window open at the poll, so gapB_heldAfterOriginalDrain reads true.
    await sleep(60);                                            // ensure the Gap-A held window has drained
    // FLAKY-TIMING: the reply and the poll are timers scheduled in the SAME TICK that opens held at T,
    // so they run in due-time order against its +50 drain whatever the load: the reply at +30 is
    // always inside the window, and the read at +66 is always after the original drain and before a
    // reply-rearmed one (+80).
    ta.dispatchEvent(new Event('input', { bubbles: true }));   // open held at T
    const replied = new Promise<void>((r) => { setTimeout(() => {
      sent.length = 0;
      term.input('\x1b[6;5R', false);                          // a CPR reply INSIDE held, at T+30
      result.gapB_replyOrigin = lastOrigin();                  // CONTROL
      result.gapB_heldRightAfterReply = inspectInputOrigin('io')?.held === true;  // still true: original drain not yet
      r();
    }, 30); });
    const polled = new Promise<void>((r) => { setTimeout(() => {
      result.gapB_heldAfterOriginalDrain = inspectInputOrigin('io')?.held;       // MUST be false (no rearm)
      r();
    }, 66); });
    await replied; await polled;

    // ARM 13 - BLOCKER 2 overlap (Dwight 24.3), CONVERGENCE SANITY (not a standalone
    // mutant-killer - the reused-id arm below is): fire two resets back-to-back so the first
    // incarnation is superseded mid-flight, and confirm the entry still converges to the
    // LATEST incarnation's pass rather than wedging. It cannot by itself catch a late stale
    // publish, which lands ~SELFTEST_TIMEOUT_MS later; ARM 14 is the deterministic proof that
    // a superseded/disposed run cannot report.
    resetTerminal('io');
    const genAfterFirstReset = entry.generation;
    resetTerminal('io');                                       // supersede the first run immediately
    result.overlap_genBumped = entry.generation > genAfterFirstReset;
    result.overlap_immediate = entry.inputSelfTest;           // 'unknown': the latest run just started
    for (let i = 0; i < 80 && entry.inputSelfTest === 'unknown'; i++) await tick();
    result.overlap_converged = entry.inputSelfTest;           // 'pass' from the latest run

    // ARM 14 - BLOCKER 2 reused-id fail-open (Dwight 24.3): a disposed terminal's OUTSTANDING
    // report retry must never fire - or a reused ptyId inherits its stale 'eligible' evidence.
    // Acquire a second id, force a report REJECT so a retry is scheduled, dispose before the
    // 100ms backoff, and assert the retry never calls the bridge again for that id. KILLS THE
    // MUTANT where disposeTerminal leaves the entry un-exited and the generation unbumped.
    const entry2 = acquireTerminal('io2');
    attachTerminal(entry2, root);
    for (let i = 0; i < 60 && entry2.inputSelfTest === 'unknown'; i++) await tick();
    const baseReport = window.cth.reportTerminalInputState as (id: string, st: unknown) => Promise<{ ok: boolean }>;
    const io2Calls: string[] = [];
    window.cth.reportTerminalInputState = (id: string, _st: unknown) => {
      io2Calls.push(id);
      return Promise.resolve({ ok: false, error: 'reject-always (simulated)' });   // force a retry to be scheduled
    };
    await write(entry2.term, '\x1b[?1000h');                   // new state -> report -> rejected -> retry scheduled
    await tick();
    result.disposed_hadPendingReport = io2Calls.length > 0;    // sanity: a report really went out first
    disposeTerminal('io2');                                     // ends the incarnation: exited + generation bump
    const io2CallsAtDispose = io2Calls.length;
    await sleep(350);                                           // the 100ms + 250ms retries would fire under the mutant
    result.disposed_retryCallsAfterDispose = io2Calls.length - io2CallsAtDispose;   // MUST be 0
    window.cth.reportTerminalInputState = baseReport;          // restore the recording stub

    // ARM 15 - BLOCKER 1 real-xterm adversarial (god fix-round-3; human requirement): a FOREIGN
    // reply must FAIL token correlation against REAL xterm, not merely in a byte-by-byte pure
    // test. Install the PRODUCTION nonce probe with a known nonce, then drive REAL xterm to emit
    // foreign replies - a genuine CPR (from a foreign DSR) and a DECRQM reply for a DIFFERENT
    // nonce - and then OUR own nonce query. Only OUR reply carries the token, so only it is
    // consumed; the foreign replies fail the exact-match and reach the pty. No same-parse
    // adjacency is used. KILLS THE SHAPE-ONLY MUTANT: a probe matching any CPR/$y would swallow
    // the foreign CPR or the foreign $y, so they would NOT reach the pty.
    const advNonce = 424242;
    const advExpected = selftestReply(advNonce);
    let advProbeOrigin: string | undefined;
    entry.inputOriginProbe = makeNonceCorrelatedProbe(advExpected, (o) => { advProbeOrigin = o; });
    sent.length = 0;
    await write(term, '[6n');                    // foreign DSR -> REAL CPR -> fails token -> flows
    await write(term, selftestQuery(222222));         // foreign DECRQM (different nonce) -> ESC[222222;0$y -> fails token -> flows
    await write(term, selftestQuery(advNonce));        // OUR query -> xterm echoes ESC[424242;0$y -> matches -> consumed
    result.adv_foreignCprReachedPty = sent.some((x) => /^\[\d+;\d+R$/.test(x.data) && x.origin === 'CONTROL');
    result.adv_foreignYReachedPty = sent.some((x) => x.data === '[222222;0$y' && x.origin === 'CONTROL');
    result.adv_ourReplyConsumed = advProbeOrigin === 'CONTROL' && !sent.some((x) => x.data === advExpected);
    entry.inputOriginProbe = undefined;

    disposeTerminal('io');
    window.harness.report({ ok: true, ...result });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack || e), partial: result });
  }
};
