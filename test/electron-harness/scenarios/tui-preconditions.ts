/**
 * SCENARIO — the two preconditions that make a TUI measurement mean anything.
 *
 * BOTH WERE PAID FOR BY A VOID RUN. Andy's whole clear/erase matrix was discarded
 * because every row measured a first-run dialog instead of an input box, and because
 * a "reaction" to Ctrl-U turned out to be the same repaint frame a harmless arrow key
 * produces. Neither failure announces itself: both produce a PASSING row. So they
 * belong in the instrument, where they cost one run to find and nothing after.
 *
 *   1. THE SCREEN MUST BE POSITIVELY IDENTIFIED AS A COMPOSER, OR THE MEASUREMENT
 *      IS REFUSED. See `isMeasurableComposer` for why this is not a list of dialogs.
 *   2. A FALSIFIER WITH NO CONTROL PASSES ON EVERYTHING. Any claim that a key did
 *      something must be paired with a key that should do nothing; if the two
 *      reactions are identical, what was seen is a repaint, not an effect.
 *
 * Every non-composer frame below is REAL BYTES, captured by Andy from the installed
 * TUIs with isolated provider homes and quoted rather than invented.
 */
import {
  acquireTerminal, attachTerminal, hasTerminalDraft, disposeTerminal,
  terminalAutomationBlockFor
} from '../../../src/renderer/src/components/terminalPool';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: { report: (payload: unknown) => void };
    cth: Record<string, unknown>;
  }
}

function installBridgeStub(): void {
  const unsub = () => () => { /* nothing subscribed */ };
  window.cth = {
    onPtyData: unsub(), onPtyExit: unsub(), onPtyRelaunch: unsub(),
    writePty: () => { /* no pty */ }, redrawPty: () => { /* no pty */ },
    resizePty: () => { /* no pty */ }, copyToClipboard: () => { /* unused */ },
    readClipboard: () => Promise.resolve(''), readClipboardSync: () => '',
    statAbs: () => Promise.resolve(null), revealPath: () => Promise.resolve()
  };
}

const write = (term: { write: (d: string, cb?: () => void) => void }, data: string): Promise<void> =>
  new Promise((resolve) => term.write(data, () => resolve()));

const clear = '\x1b[2J\x1b[H';

/**
 * NON-COMPOSER SCREENS, REAL BYTES. Which one a fresh start lands on depends on
 * WHICH THING IS FRESH: a fresh cwd with an existing config gives the trust modal;
 * a fresh CONFIG gives onboarding, which is several screens.
 *
 * These are fixtures for the refusal arms. They are deliberately NOT the detector's
 * input - nothing below is matched against this list.
 */
const NON_COMPOSER: Record<string, string> = {
  'claude trust': `${clear} Do you trust the files in this folder?\r\n\r\n   Yes, I trust this folder\r\n   Enter to confirm - Esc to cancel\r\n`,
  'codex trust': `${clear} You are running Codex in a new folder.\r\n\r\n   1. Yes, continue\r\n   2. No, quit\r\n`,
  'agy trust': `${clear} Trust this workspace?\r\n\r\n   Yes, I trust this folder\r\n   No\r\n`,
  'claude onboarding theme': `${clear} Choose the text style that looks best with your terminal\r\n\r\n   1. Auto (match terminal)\r\n   2. Dark mode\r\n   3. Light mode\r\n   4. Dark mode (colorblind-friendly)\r\n\r\n To change this later, run /theme\r\n`,
  'claude onboarding login': `${clear} Select login method:\r\n\r\n   1. Claude account with subscription\r\n   2. Anthropic Console account\r\n   3. 3rd-party platform\r\n`,
  'codex sign-in': `${clear} Sign in with ChatGPT to use Codex as part of your paid plan\r\n\r\n   1. Sign in with ChatGPT\r\n   2. Sign in with Device Code\r\n   3. Provide your own API key\r\n\r\n Press enter to continue\r\n`,
  'agy onboarding theme': `${clear} solarized dark\r\n colorblind-friendly dark\r\n tokyo night\r\n`,
  // THE ONE THAT IS DIFFERENT IN KIND. Enter on a trust modal consents to a folder.
  // Enter on this one ACCEPTS A TERMS OF SERVICE AND A DATA-COLLECTION AGREEMENT ON
  // THE HUMAN'S BEHALF. It is the reason the detector must fail closed.
  'agy consent': `${clear} ...to collect and use my Interactions data, subject to the\r\n Google Antigravity CLI Terms of Service and Google Privacy Policy\r\n\r\n [Previous]      [Done]\r\n\r\n Navigate - enter Toggle\r\n`,
  // Claude Code 2.1.283: an already connected resumed Remote Control session opens
  // this dialog when `/remote-control` is typed again. The delivery block recognizes
  // these stable labels rather than treating every unknown dialog as a picker.
  'claude remote-control reconnect': `${clear} Remote Control is already connected\r\n\r\n ❯ 1. Disconnect this session\r\n   2. Show QR code\r\n   3. Continue\r\n`,
  'claude remote-control reconnect qr visible': `${clear} Remote Control is already connected\r\n\r\n ❯ 1. Disconnect this session\r\n   2. Hide QR code\r\n   3. Continue\r\n`,
  'claude remote-control reconnect bordered': `${clear} ┃ ❯ 1. Disconnect this session ┃\r\n┃   2. Show QR code ┃\r\n┃   3. Continue ┃\r\n`,
  // NOT A REAL SCREEN, AND THAT IS ITS ENTIRE PURPOSE. Nobody has enumerated this
  // one, so it is the arm that proves the detector fails CLOSED rather than open.
  'a screen nobody has met': `${clear} Select your region\r\n\r\n   1. United States\r\n   2. European Union\r\n   3. Other\r\n`
};

/** An ordinary prompt box - the thing a measurement is actually entitled to read. */
const composerFrame = (text: string): string => [
  clear,
  '╭──────────────────────────────────────╮\r\n',
  `│ ❯ ${text.padEnd(35, ' ')}│\r\n`,
  '╰──────────────────────────────────────╯\r\n',
  '\x1b[2;1H'
].join('');

/**
 * Is the cursor sitting on something that is POSITIVELY a composer input line?
 *
 * THIS IS AN ALLOWLIST OF ONE SHAPE, NOT A BLOCKLIST OF DIALOGS, AND THE INVERSION
 * IS THE WHOLE POINT. The first version of this function enumerated the trust
 * screens it knew about and measured anything else. Andy's capture showed there are
 * at least four non-composer states rather than one, and which you land on depends
 * on whether the CWD or the CONFIG is fresh - but the count is not the argument.
 * The argument is that A DETECTOR THAT ENUMERATES WHAT TO REFUSE FAILS OPEN ON
 * EVERYTHING IT HAS NOT MET, so the list is always one screen behind the installer.
 *
 * WHAT THAT COSTS IS NOT A VOID ROW. Andy's driver met the Antigravity consent
 * screen, where Enter accepts a Terms of Service and a data-collection agreement on
 * the human's behalf. A blocklist has no entry for a screen nobody has seen, so it
 * would have measured it - and a measurement here means pressing keys.
 *
 * So: refuse by default, and admit only what is recognised. The same asymmetry
 * `promptLineHasText` already uses, where "don't know" keeps the block rather than
 * clearing it - a wrong refusal costs a re-run, a wrong admission presses Enter on
 * a contract.
 */
function isMeasurableComposer(screen: string, cursorRow: string): boolean {
  // A composer offers a place to TYPE: a prompt marker on the row the cursor is on.
  // A chooser offers a place to PICK, and puts the cursor on a list item.
  const marker = /[❯>$#▌]/u;
  if (!marker.test(cursorRow)) return false;
  // And that row belongs to an input region rather than being prose that happens to
  // contain a bracket: either boxed, or the marker leads the line.
  const boxed = /[│┃|]/u.test(cursorRow);
  const leads = /^\s*[❯>$#▌]/u.test(cursorRow);
  if (!boxed && !leads) return false;
  // A composer is a single input affordance. A screen that also presents a numbered
  // or bracketed choice is asking a question, whatever else is on it.
  if (/^\s*\d+\.\s+\S/mu.test(screen)) return false;
  if (/\[\s*(Done|Previous|Next|Continue|Cancel)\s*\]/iu.test(screen)) return false;
  return true;
}

function screenOf(entry: { term: { rows: number; buffer: { active: any } } }): { full: string; cursorRow: string } {
  const buf = entry.term.buffer.active;
  const rows: string[] = [];
  for (let y = 0; y < entry.term.rows; y++) {
    const line = buf.getLine(buf.baseY + y);
    if (line) rows.push(line.translateToString(true));
  }
  const cur = buf.getLine(buf.baseY + buf.cursorY);
  return { full: rows.join('\n'), cursorRow: cur ? cur.translateToString(true) : '' };
}

window.__harnessRun = async () => {
  const result: Record<string, unknown> = {};
  try {
    installBridgeStub();
    const root = document.getElementById('root')!;
    const entry = acquireTerminal('tui');
    attachTerminal(entry, root);

    // ── 1. Every non-composer state must be REFUSED, named or not ─────────────
    const refusals: Record<string, unknown> = {};
    for (const [name, frame] of Object.entries(NON_COMPOSER)) {
      await write(entry.term, frame);
      const { full, cursorRow } = screenOf(entry);
      refusals[name] = {
        measurable: isMeasurableComposer(full, cursorRow),
        // What a measurement WOULD have reported had it not refused. Recorded so
        // the cost of skipping the precondition is visible rather than argued.
        naiveHasDraft: hasTerminalDraft('tui', Date.now() + 5_000),
        // AND THE PRODUCTION GAP: nothing in the app knows a modal owns the screen.
        // `opensInteractiveTerminalUi` matches what the USER TYPED against a set of
        // bare slash-commands; these screens are opened by the PROGRAM, so no input
        // passes through that check and the picker block cannot latch.
        automationBlock: terminalAutomationBlockFor('tui', Date.now() + 5_000) ?? null
      };
    }
    result.nonComposer = refusals;

    // ── And a real composer must still be measurable, empty or full ───────────
    await write(entry.term, composerFrame(''));
    const empty = screenOf(entry);
    await write(entry.term, composerFrame('write the report'));
    const filled = screenOf(entry);
    result.composer = {
      emptyMeasurable: isMeasurableComposer(empty.full, empty.cursorRow),
      filledMeasurable: isMeasurableComposer(filled.full, filled.cursorRow)
    };

    // ── 2. The control ────────────────────────────────────────────────────────
    const REPAINT = '\x1b[2;1H\x1b[K│ ❯ │';
    /**
     * EACH REACTION IS MEASURED FROM THE SAME BASELINE, and that is not fussiness.
     * Measuring them in sequence made the SECOND key look inert - the first had
     * already applied the repaint, so the screen no longer moved. Read carelessly
     * that says "the arrow did nothing, so Ctrl-U's change was real", which is the
     * exact wrong conclusion the control exists to prevent. An order artifact that
     * happens to support the conclusion is worse than no control at all.
     */
    const reactionTo = async (key: string) => {
      await write(entry.term, composerFrame(''));
      const before = screenOf(entry).full;
      entry.term.input(key);
      await write(entry.term, REPAINT); // what this TUI emits for ANY key
      const after = screenOf(entry).full;
      return { changed: after !== before, screen: after };
    };
    const ctrlU = await reactionTo('\x15');
    const arrow = await reactionTo('\x1b[C'); // right arrow: should do nothing
    result.control = {
      ctrlUChanged: ctrlU.changed,
      arrowChanged: arrow.changed,
      identicalReaction: ctrlU.screen === arrow.screen,
      verdict: ctrlU.screen === arrow.screen ? 'REPAINT_NOT_EFFECT' : 'REAL_EFFECT'
    };

    disposeTerminal('tui');
    window.harness.report({ ok: true, ...result });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack || e), partial: result });
  }
};
