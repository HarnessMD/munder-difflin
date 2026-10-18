/**
 * SCENARIO - L0-FUSION acquire-time detached attach.
 *
 * The stage's claim in one sentence: input provenance is wired for EVERY acquired
 * terminal, including one that NO VIEW HAS EVER SHOWN, because xterm is opened at
 * acquire time into a host that is not in the document.
 *
 * Before this stage a terminal only opened on first attach, so App.tsx's pre-warmed
 * terminal-per-agent reported `inputOriginAttached: false` and could never become
 * eligible however long it ran. That is the population this arm is about, so the
 * terminal under test is deliberately never attached until the second arm.
 *
 * As in the stage-4 scenario the instrument is the production `terminalPool` with a
 * bridge stub that RECORDS the origin of every `writePty` and every state report - the
 * exact facts main would receive, read where they leave the renderer.
 */
import {
  acquireTerminal, attachTerminal, disposeTerminal
} from '../../../src/renderer/src/components/terminalPool';
import { isInputOriginAttached, inspectInputOrigin } from '../../../src/renderer/src/components/inputOrigin';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
    cth: Record<string, unknown>;
  }
}

interface Sent { id: string; data: string; origin: string }
const sent: Sent[] = [];
const reported: Array<Record<string, unknown>> = [];

function installBridgeStub(): void {
  const unsub = () => () => { /* nothing subscribed */ };
  window.cth = {
    onPtyData: unsub(), onPtyExit: unsub(), onPtyRelaunch: unsub(),
    writePty: (id: string, data: string, origin: string) => { sent.push({ id, data, origin }); return Promise.resolve({ ok: true }); },
    redrawPty: () => { /* no pty */ }, resizePty: () => { /* no pty */ },
    copyToClipboard: () => { /* unused */ },
    readClipboard: () => Promise.resolve(''), readClipboardSync: () => '',
    statAbs: () => Promise.resolve(null), revealPath: () => Promise.resolve(),
    reportTerminalInputState: (_id: string, state: unknown) => {
      reported.push(state as Record<string, unknown>); return Promise.resolve({ ok: true });
    }
  };
}

const tick = () => new Promise<void>((r) => { setTimeout(r, 0); });
const write = (term: { write: (d: string, cb?: () => void) => void }, data: string): Promise<void> =>
  new Promise((resolve) => term.write(data, () => resolve()));
const lastOrigin = () => sent.length ? sent[sent.length - 1].origin : null;
const key = (ta: HTMLTextAreaElement, k: string, code: number) =>
  ta.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, keyCode: code, which: code, bubbles: true, cancelable: true } as KeyboardEventInit));
/** Dispatch a key on xterm's helper textarea IF it has built one, and say whether it did.
 *
 *  THE SCENARIO MUST NOT THROW BEFORE IT HAS REPORTED. Under the lifecycle this scenario
 *  kills - open() deferred to first attach - there is no element and no textarea at all
 *  before a view, so dispatching on it raises a TypeError, the whole run comes back as a
 *  bare `ok:false`, and the test fails at `r.ok` instead of at the named assertion that
 *  says WHICH property was lost. A mutant has to fail loudly in the right place: "the
 *  scenario threw" is not a diagnosis. So every fact is recorded first, and the keystroke
 *  is attempted defensively. (Dwight, follow-up finding 1.) */
const keyIfPossible = (term: { textarea?: HTMLTextAreaElement }, k: string, code: number): boolean => {
  const ta = term.textarea;
  if (!ta) return false;
  key(ta, k, code);
  return true;
};
const settle = async (pred: () => boolean, turns = 300): Promise<void> => {
  for (let i = 0; i < turns && !pred(); i++) await tick();
};

window.__harnessRun = async () => {
  const result: Record<string, unknown> = {};
  try {
    installBridgeStub();
    const root = document.getElementById('root')!;

    // ── ARM 1. Acquire ONLY. This terminal is never attached in this arm. ──────
    // KILLS THE MUTANT that opens on first attach instead of at acquire: with that
    // lifecycle nothing below exists - no element, no textarea, no listeners - so
    // `openedAtAcquire` is false, the self-test never runs, and a keystroke is
    // impossible. Every field in this arm is read while the host is OUT of the document.
    const entry = acquireTerminal('unviewed');
    result.openedAtAcquire = entry.opened;
    result.hostDetachedAtAcquire = entry.host.isConnected === false;
    result.provenanceAttachedAtAcquire = isInputOriginAttached('unviewed');
    result.hasTextareaAtAcquire = !!entry.term.textarea;

    // The self-test runs to completion on a terminal that is still detached.
    await settle(() => entry.inputSelfTest !== 'unknown');
    result.selfTestWhileDetached = entry.inputSelfTest;
    result.selfTestLeakedBytes = sent.length;               // NOT ONE BYTE on the wire
    result.stillDetachedAfterSelfTest = entry.host.isConnected === false;

    // What MAIN was told about a terminal no view has ever shown. This is the fact the
    // eligibility predicate consumes, so it is the one that matters for the stage.
    await settle(() => reported.some((r) => r.selfTest === 'pass'));
    const last = reported[reported.length - 1] ?? {};
    result.reportedAttached = last.inputOriginAttached;
    result.reportedSelfTest = last.selfTest;
    result.reportCount = reported.length;

    // A real keystroke on the detached textarea still classifies HUMAN...
    sent.length = 0;
    result.detachedKeyDispatched = keyIfPossible(entry.term, 'ArrowRight', 39);
    result.detachedKeyOrigin = lastOrigin();
    result.detachedKeyData = sent.length ? sent[sent.length - 1].data : null;

    // ...and a protocol reply while detached is still CONTROL, not a human byte.
    // The keystroke above opened the same-tick human window, and it closes in a
    // microtask, so we let it close FIRST and record that it really did. Without this
    // the reply would ride that still-open window and read HUMAN - correctly, since a
    // byte emitted inside a live human dispatch is human by construction. Measuring
    // CONTROL only means anything once the window is shut, which is why the production
    // self-test also closes it before its own control half.
    await tick();
    result.windowClosedBeforeReply = isInputOriginAttached('unviewed')
      && inspectInputOrigin('unviewed')?.sameTick === false;
    sent.length = 0;
    await write(entry.term, '\x1b[6n');
    result.detachedReplyOrigin = lastOrigin();

    // ── ARM 2. Now attach it. The open guard must hold. ───────────────────────
    // KILLS THE MUTANT that relaxes the `opened` guard (or re-opens on attach): a second
    // open() recreates term.element and ORPHANS the provenance listeners, with no error
    // and no symptom except that human input silently stops being seen. The identity
    // check and the single-emission count below are what that mutant breaks.
    const elementBefore = entry.term.element;
    const genBefore = entry.generation;
    const unsubBefore = entry.unsub.length;
    attachTerminal(entry, root);
    result.elementSameAfterAttach = entry.term.element === elementBefore;
    result.generationUnchangedByAttach = entry.generation === genBefore;
    result.noExtraListenerOnAttach = entry.unsub.length === unsubBefore;
    result.hostConnectedAfterAttach = entry.host.isConnected === true;

    sent.length = 0;
    result.attachedKeyDispatched = keyIfPossible(entry.term, 'ArrowRight', 39);
    result.attachedKeyOrigin = lastOrigin();
    result.attachedKeyEmissions = sent.length;   // exactly 1: no duplicated listener

    // ── OBSERVATION, NOT AN ASSERTION: the grid this terminal proposes. ──────
    // The accepted cost of opening detached is one column: xterm's Viewport measures the
    // scrollbar ONCE in its constructor (Viewport.ts:70), so a detached-opened terminal
    // keeps the 15px fallback for life where an attached-opened one measures the real bar.
    // Recorded here as a number for the record, NOT asserted - the delta is the platform's
    // scrollbar width and this must not become a Windows-only test. NO CONTROL IS TAKEN
    // HERE, and deliberately so: after this stage EVERY pooled terminal opens detached at
    // acquire, so the pool can no longer produce an attached-opened control at all. The
    // controlled side-by-side measurement that priced this column lives in the
    // detached-open scenario, which was written against the pre-stage lifecycle.
    const sized = document.createElement('div');
    sized.style.width = '640px'; sized.style.height = '240px';
    root.appendChild(sized);
    attachTerminal(entry, sized);
    try { entry.fit.fit(); } catch { /* unsized */ }
    result.colsAfterFit = entry.term.cols;
    result.rowsAfterFit = entry.term.rows;

    disposeTerminal('unviewed');
    window.harness.report({ ok: true, ...result });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack || e), partial: result });
  }
};
