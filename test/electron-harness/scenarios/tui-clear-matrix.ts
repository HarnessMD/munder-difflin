/**
 * SCENARIO — L0-TERMMATRIX. Does the candidate clear control actually empty a REAL
 * provider TUI's input box?
 *
 * THE FRAMES BELOW ARE REAL CAPTURES, not hand-written TUI shapes. They were taken
 * from each provider's own binary over a real PTY, in an ALREADY-TRUSTED cwd with
 * the provider's real config, so no consent was given and none was asked. Enter was
 * never sent. A provider whose first screen was not positively a composer was
 * aborted WITHOUT A KEYSTROKE and has no row here — absence is UNKNOWN, never a pass.
 *
 * `antigravity` (agy) WAS such a provider, twice: it opened on "Do you trust the contents
 * of this project?" and the tool, which never answers a dialog, aborted. Its row exists
 * because the HUMAN then trusted one scratch folder by hand (C:/Dunder/_audit/
 * oscar-agy-scratch) and Oscar re-ran the same tool agy-only, four times. The entry below
 * is trial 1 of his raw artifacts, byte-for-byte (C:/Dunder/hive/agents/oscar-mu3300lb/
 * agy-capture-trial-1.json); all four were replayed through THIS scenario before one was
 * committed, and all four met every assertion. Different cwd from the claude/codex rows
 * (C:/PrzEdit): that changes what the banner prints, not how the composer edits a line.
 *
 * Replay is the right instrument rather than a concession: a capture is a FIXTURE and
 * re-runs identically, where a live TUI does not. The predicate reads xterm's buffer,
 * and the screen does not know what produced its bytes.
 *
 * WHAT EACH ROW MUST SHOW, and why it takes two terminals:
 *   A. boot → empty → staged            the marker is ON SCREEN  (hasDraft true)
 *      + afterClear                      the box is EMPTY        (hasDraft false)
 *   B. boot → empty → staged → afterClear → restaged   staged again (hasDraft true)
 *      + afterNoop                       a HARMLESS key changes nothing
 * Both branches are measured FROM A STAGED BASELINE. Measuring the two keys in
 * sequence on one terminal lets the first key's repaint make the second look inert,
 * which is an order artifact that happens to support the conclusion.
 */
import {
  acquireTerminal, attachTerminal, hasTerminalDraft, disposeTerminal, readScreenForNeedle
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

const ECHO_GRACE_MS = 1000;

/** xterm's own view of the modes this design depends on. `mouseTrackingMode` is
 *  the one that decides L0-FUSION 9.3 dimension 5; `bracketedPasteMode` is
 *  dimension 6; `sendFocusMode` matters because focus reports reach the SAME
 *  public onData a keystroke does, and are NOT human text. */
function readModes(e: { term: { modes: { mouseTrackingMode: string; bracketedPasteMode: boolean; sendFocusMode: boolean } } }): {
  mouseTrackingMode: string; bracketedPasteMode: boolean; sendFocusMode: boolean;
} {
  const m = e.term.modes;
  return {
    mouseTrackingMode: m.mouseTrackingMode,
    bracketedPasteMode: m.bracketedPasteMode,
    sendFocusMode: m.sendFocusMode
  };
}

/** Real per-provider captures. Deltas, in capture order: replaying them in
 *  sequence reconstructs the screen, because a terminal is a state machine. */
const CAPTURES: Record<string, {
  mark: string; boot: string; empty: string; staged: string;
  afterClear: string; restaged: string; afterNoop: string;
}> = {
  claude: {
    mark: "ZQS44JHAQZ",
    boot: "\u001b[2J\u001b[m\u001b[H\u001b]0;C:\\nvm4w\\nodejs\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe\u0007\u001b[?25h\u001b]0;claude\u0007\u001b[?2004h\u001b[?2031h\u001b[?1004h\u001b[?9001l\u001b[?25l\u001b]11;?\u0007\u001b[>0q\u001b[?u\u001b[>4m\u001b[?1004l\u001b[?2031l\u001b[?2004l\u001b[?2004h\u001b[?2031h\u001b[?1004h\u001b[?9001l\u001b]0;✳ Claude Code\u0007\u001b[38;2;215;119;87m ▐\u001b[48;2;0;0;0m▛███▛█\u001b[m   \u001b[1m\u001b[97mClaude\u001b[m \u001b[1m\u001b[97mCode\u001b[m \u001b[38;2;102;102;102mv2.1.270\u001b[m\u001b[K\u001b[38;2;215;119;87m\r\n▝▜\u001b[48;2;0;0;0m█████\u001b[49m█▀\u001b[m  \u001b[38;2;102;102;102mOpus\u001b[m \u001b[38;2;102;102;102m5\u001b[m \u001b[38;2;102;102;102m(1M\u001b[m \u001b[38;2;102;102;102mcontext)\u001b[m \u001b[38;2;102;102;102mwith\u001b[m \u001b[38;2;102;102;102mhigh\u001b[m \u001b[38;2;102;102;102meffort\u001b[m \u001b[38;2;102;102;102m·\u001b[m \u001b[38;2;102;102;102mClaude\u001b[m \u001b[38;2;102;102;102mMax\u001b[m\u001b[K\u001b[38;2;215;119;87m\r\n \u001b[m \u001b[38;2;215;119;87m▝▝\u001b[m \u001b[38;2;215;119;87m▝▝\u001b[m    \u001b[38;2;102;102;102mC:\\PrzEdit\u001b[m\u001b[K\r\n\u001b[K\u001b[38;2;215;119;87m\r\n▎\u001b[m \u001b[1m\u001b[97mAuto\u001b[m \u001b[1m\u001b[97mmode\u001b[m \u001b[1m\u001b[97mis\u001b[m \u001b[1m\u001b[97mnow\u001b[m \u001b[1m\u001b[97mClaude\u001b[m \u001b[1m\u001b[97mCode's\u001b[m \u001b[1m\u001b[97mdefault\u001b[m \u001b[1m\u001b[97mpermission\u001b[m \u001b[1m\u001b[97mmode.\u001b[m\u001b[K\u001b[38;2;215;119;87m\r\n▎\u001b[m \u001b[38;2;102;102;102mAuto\u001b[m \u001b[38;2;102;102;102mmode\u001b[m \u001b[38;2;102;102;102mlets\u001b[m \u001b[38;2;102;102;102mClaude\u001b[m \u001b[38;2;102;102;102mhandle\u001b[m \u001b[38;2;102;102;102mpermission\u001b[m \u001b[38;2;102;102;102mprompts\u001b[m \u001b[38;2;102;102;102mautomatically.\u001b[m \u001b[38;2;102;102;102mClaude\u001b[m \u001b[38;2;102;102;102mchecks\u001b[m \u001b[38;2;102;102;102meach\u001b[m \u001b[38;2;102;102;102mtool\u001b[m \u001b[38;2;102;102;102mcall\u001b[m \u001b[38;2;102;102;102mfor\u001b[m   \u001b[38;2;215;119;87m\r\n▎\u001b[m \u001b[38;2;102;102;102mrisky\u001b[m \u001b[38;2;102;102;102mactions\u001b[m \u001b[38;2;102;102;102mand\u001b[m \u001b[38;2;102;102;102mprompt\u001b[m \u001b[38;2;102;102;102minjection\u001b[m \u001b[38;2;102;102;102mbefore\u001b[m \u001b[38;2;102;102;102mexecuting,\u001b[m \u001b[38;2;102;102;102mruns\u001b[m \u001b[38;2;102;102;102mthe\u001b[m \u001b[38;2;102;102;102mones\u001b[m \u001b[38;2;102;102;102mit\u001b[m \u001b[38;2;102;102;102massesses\u001b[m \u001b[38;2;102;102;102mas\u001b[m \u001b[38;2;102;102;102mlower-risk,\u001b[m \u001b[38;2;102;102;102mand\u001b[m \u001b[38;2;215;119;87m\r\n▎\u001b[m \u001b[38;2;102;102;102mblocks\u001b[m \u001b[38;2;102;102;102mthe\u001b[m \u001b[38;2;102;102;102mrest.\u001b[m\u001b[K\u001b[38;2;215;119;87m\r\n▎\u001b[m \u001b[38;2;102;102;102mhttps://code.claude.com/docs/en/permission-modes\u001b[m\u001b[K\r\n\u001b[K\u001b[38;2;153;153;153m\r\n────────────────────────────────────────────────────────────────────────────────────────────────────\u001b[m\r\n❯ Try \"fix lint errors\"\u001b[K\u001b[38;2;153;153;153m\r\n────────────────────────────────────────────────────────────────────────────────────────────────────\u001b[m\r\n  \u001b[38;2;150;108;30m⏵⏵\u001b[m \u001b[38;2;150;108;30mauto\u001b[m \u001b[38;2;150;108;30mmode\u001b[m \u001b[38;2;150;108;30mon\u001b[38;2;102;102;102m (shift+tab\u001b[m \u001b[38;2;102;102;102mto\u001b[m \u001b[38;2;102;102;102mcycle)\u001b[m \u001b[38;2;102;102;102m·\u001b[m \u001b[38;2;102;102;102m←\u001b[m \u001b[38;2;102;102;102mfor\u001b[m \u001b[38;2;102;102;102magents\u001b[m\u001b[29X\u001b[38;2;102;102;102m\u001b[29C●\u001b[m \u001b[38;2;102;102;102mhigh\u001b[m \u001b[38;2;102;102;102m·\u001b[m \u001b[38;2;102;102;102m/effort\u001b[m  \r\n\u001b[83X\u001b[38;2;150;108;30m\u001b[83C/rc\u001b[m \u001b[38;2;150;108;30mconnecting…\u001b[m  \u001b[12;3H\u001b[?25h\u001b[25l\u001b[>0q\u001b[15;84H\u001b[12X\u001b[38;2;44;122;57m\u001b[12C/rc\u001b[12;3H\u001b[?25h\u001b[m",
    empty: "",
    staged: "\u001b[25lZQS44JHAQZ\u001b[K\u001b[38;2;153;153;153m\u001b[13;3H──────────────────────────────────────────────────────────────────────────────────────────────────\u001b[38;2;150;108;30m\u001b[14;3H⏵⏵\u001b[m \u001b[38;2;150;108;30mauto\u001b[m \u001b[38;2;150;108;30mmode\u001b[m \u001b[38;2;150;108;30mon\u001b[38;2;102;102;102m (shift+tab\u001b[m \u001b[38;2;102;102;102mto\u001b[m \u001b[38;2;102;102;102mcycle)\u001b[m\u001b[15X\u001b[15C\u001b[29X\u001b[38;2;102;102;102m\u001b[29C●\u001b[m \u001b[38;2;102;102;102mhigh\u001b[m \u001b[38;2;102;102;102m·\u001b[m \u001b[38;2;102;102;102m/effort\u001b[m  \u001b[12;13H\u001b[?25h",
    afterClear: "\u001b[25l\u001b[12;3HTry \"fix lint errors\"\u001b[74X\u001b[38;2;153;153;153m\u001b[13;3H───────────────────────────────────────────────────────────────────────────────────────────────\u001b[38;2;150;108;30m\u001b[14;3H⏵⏵\u001b[m \u001b[38;2;150;108;30mauto\u001b[m \u001b[38;2;150;108;30mmode\u001b[m \u001b[38;2;150;108;30mon\u001b[38;2;102;102;102m (shift+tab\u001b[m \u001b[38;2;102;102;102mto\u001b[m \u001b[38;2;102;102;102mcycle) · ← for agents\u001b[m\u001b[17X\u001b[38;2;102;102;102m\u001b[17CCtrl+Y to paste deleted tex\u001b[12;3H\u001b[?25h\u001b[m",
    restaged: "\u001b[25lZQS44JHAQZ\u001b[K\u001b[38;2;153;153;153m\u001b[13;3H──────────────────────────────────────────────────────────────────────────────────────────────────\u001b[38;2;150;108;30m\u001b[14;3H⏵⏵\u001b[m \u001b[38;2;150;108;30mauto\u001b[m \u001b[38;2;150;108;30mmode\u001b[m \u001b[38;2;150;108;30mon\u001b[38;2;102;102;102m (shift+tab\u001b[m \u001b[38;2;102;102;102mto\u001b[m \u001b[38;2;102;102;102mcycle)\u001b[m\u001b[15X\u001b[15C\u001b[17X\u001b[38;2;102;102;102m\u001b[17CCtrl+Y to paste deleted text\u001b[m  \u001b[12;13H\u001b[?25h",
    afterNoop: ""
  },
  codex: {
    mark: "ZQTYUG8NQZ",
    boot: "\u001b[?2004h\u001b[?1004l\u001b[?2026h\u001b[2J\u001b[m\u001b[H\u001b]0;C:\\nvm4w\\nodejs\\node.exe\u0007\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l╭───────────────────────────────────────╮\u001b[K\r\n│ >_ \u001b[1m\u001b[97mOpenAI Codex\u001b[m (v0.154.0)            │\u001b[K\r\n│                                       │\u001b[K\r\n│ model:     \u001b[3mloading\u001b[23m   \u001b[36m/model\u001b[m to change │\u001b[K\r\n│ directory: C:\\PrzEdit                 │\u001b[K\r\n╰───────────────────────────────────────╯\u001b[K\r\n\u001b[K\r\n\u001b[K\u001b[1m\u001b[97m\r\n›\u001b[m Ask Codex to do anything\u001b[K\r\n\u001b[K\r\n  ? for shortcuts\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\u001b[9;3H\u001b[?25h\u001b[25l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[H╭\u001b[9;3H\u001b[?25h\u001b[25l\u001b[?2026h\u001b[H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l╭\u001b[9;3H\u001b[?25h\u001b[25l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[H╭\u001b[9;3H\u001b[?25h\u001b[25l\u001b[?2026h\u001b[H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b]10;?\u001b\\\u001b]11;?\u001b\\╭\u001b[9;3H\u001b]0;PrzEdit\u0007\u001b[?25h\u001b[25l\u001b[?2026h\u001b[38;2;246;226;183m\u001b[11;3Hgpt-6-astra default\u001b[m · \u001b[38;2;171;223;167mC:\\PrzEdit\u001b[H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l\u001b[m╭\u001b[9;3H\u001b[?25h\u001b[25l\u001b[?2026h\u001b[H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l╭\u001b[9;3H\u001b[?25h\u001b]0;⠹ PrzEdit\u0007\u001b]0;⠸ PrzEdit\u0007\u001b[25l\u001b[?2026h\u001b[H\u001b[K\r\n╭────────────────────────────────────────────────╮\u001b[K\r\n│ >_ \u001b[1m\u001b[97mOpenAI Codex\u001b[m (v0.154.0)                     │\u001b[K\r\n│                                                │\u001b[K\r\n│ model:     gpt-6-astra high   \u001b[36m/model\u001b[m to change │\u001b[K\r\n│ directory: C:\\PrzEdit                          │\u001b[K\r\n╰────────────────────────────────────────────────╯\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\u001b[8;1H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[H╭────────────────────────────────────────────────╮\u001b[K\r\n│ >_ \u001b[1m\u001b[97mOpenAI Codex\u001b[m (v0.154.0)                     │\u001b[K\r\n│                                                │\u001b[K\r\n│ model:     gpt-6-astra high   \u001b[36m/model\u001b[m to change │\u001b[K\r\n│ directory: C:\\PrzEdit                          │\u001b[K\r\n╰────────────────────────────────────────────────╯\u001b[K\r\n\u001b[K\r\n  \u001b[1m\u001b[97mTip:\u001b[m Try the \u001b[1m\u001b[97mDesktop app\u001b[m. Run 'codex app' or visit https://chatgpt.com/codex?app-landing-page=true\r\n\u001b[K\r\n\u001b[K\u001b[1m\u001b[97m\r\n›\u001b[m Ask Codex to do anything\u001b[K\r\n\u001b[K\r\n  \u001b[38;2;246;226;183mgpt-6-astra high\u001b[m · \u001b[38;2;171;223;167mC:\\PrzEdit\u001b[m\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\u001b[11;3H\u001b[?25h\u001b]0;⠼ PrzEdit\u0007\u001b]0;⠴ PrzEdit\u0007\u001b[25l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[9;1H \u001b[11;3H\u001b[?25h\u001b[25l\u001b[?2026h\u001b[9;1H\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\u001b[1m\u001b[97m\r\n›\u001b[m Ask Codex to do anything\u001b[K\r\n\u001b[K\r\n  \u001b[38;2;246;226;183mgpt-6-astra high\u001b[m · \u001b[38;2;171;223;167mC:\\PrzEdit\u001b[m\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\u001b[8;1H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l\r\n\u001b[K\r\n• You have 1 usage limit reset available. Run /usage to use one.\u001b[K\r\n\u001b[K\u001b[33m\r\n⚠ Heads up, you have less than 25% of your weekly limit left. Run /status for a breakdown.\u001b[m\u001b[K\r\n\u001b[K\u001b[33m\r\n⚠ Heads up, you have less than 50% of your 5h limit left. Run /status for a breakdown.\u001b[m\u001b[K\r\n\u001b[K\u001b[17;3H\u001b[?25h\u001b]0;⠦ PrzEdit\u0007\u001b]0;PrzEdit\u0007\u001b[25l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[15;1H \u001b[17;3H\u001b[?25h\u001b[25l\u001b[?2026h\u001b[0 q\u001b[?2026l\u001b[15;1H \u001b[17;3H\u001b[?25h\u001b[25l\u001b[?2026h\u001b[15;1H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l \u001b[17;3H\u001b[?25h",
    empty: "",
    staged: "\u001b[25l\u001b[?2026hZQTYUG8NQZ\u001b[K\u001b[15;1H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l \u001b[17;13H\u001b[?25h",
    afterClear: "\u001b[25l\u001b[?2026h\u001b[17;3HAsk Codex to do anything\u001b[15;1H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l \u001b[17;3H\u001b[?25h",
    restaged: "\u001b[25l\u001b[?2026hZQTYUG8NQZ\u001b[K\u001b[15;1H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l \u001b[17;13H\u001b[?25h",
    afterNoop: "\u001b[25l\u001b[?2026h\u001b[15;1H\u001b[?25h\u001b[25l\u001b[0 q\u001b[?2026l \u001b[17;13H\u001b[?25h"
  },
  antigravity: {
    mark: "ZQSSSW5FQZ",
    boot: "\u001b[?2026$p\u001b[?2027$p\u001b[>4m\u001b[?5W\u001b[?2004h\u001b[>4;2m\u001b[>1u\u001b[?u\u001b[2J\u001b[m\u001b[H\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\r\n\u001b]0;C:\\Users\\FiercePC\\AppData\\Local\\agy\\bin\\agy.exe\u0007\u001b[H\u001b[K\r\n     \u2584\u2580\u2580\u2584\u001b[K\r\n    \u2580\u2580\u2580\u2580\u2580\u2580\u001b[K\r\n   \u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u001b[K\r\n  \u2584\u2580\u2580    \u2580\u2580\u2584\u001b[K\r\n \u2584\u2580\u2580      \u2580\u2580\u2584\u001b[K\r\n\u001b[K\r\n Welcome to the Antigravity CLI. You are currently not signed in.\u001b[K\r\n\u001b[K\r\n \u28f7  Signing in...\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\u001b[100C\u001b[>4m\u001b[<1u\u001b[>4;2m\u001b[>1u\u001b[?u\u001b[0 q\u001b[H\u001b[K\r\n      \u2584\u2580\u2580\u2584        \u001b[1m\u001b[97mAntigravity CLI 1.2.7\u001b[m\u001b[K\r\n     \u2580\u2580\u2580\u2580\u2580\u2580       agyuser00@example.com\u001b[K\r\n    \u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580      C:/Dunder/_audit/oscar-agy-scratch\u001b[K\r\n   \u2584\u2580\u2580    \u2580\u2580\u2584\u001b[K\r\n  \u2584\u2580\u2580      \u2580\u2580\u2584\u001b[K\r\n\u001b[K\r\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n>\u001b[K\r\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n? for shortcuts\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\r\n\u001b[K\u001b[9;3H\u001b[?25h\u001b[25l\u001b[4;17H  Gemini 3.8 Flash (Medium)\u001b[K\u001b[5;17H  C:/Dunder/_audit/oscar-agy-scratch\u001b[K\u001b[6;17H\u001b[K\n\u001b[K\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u001b[9;17H\u001b[K\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u001b[11;17H\u001b[59X\u001b[59CGemini 3.8 Flash \u00b7 medium\u001b[9;3H\u001b[?25h\u001b[25l\u001b[3;40H (Google AI Pro)\u001b[9;3H\u001b[?25h",
    empty: "",
    staged: "Z\u001b[25l\r> ZQS\u001b[71X\r\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n                                                                           G\u001b[9;6H\u001b[?25hSSW5FQZ",
    afterClear: "\u001b[25l\r> \u001b[K\r\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n? for shortcuts                                                            Gemini 3.8 Flash \u00b7 medium\u001b[9;3H\u001b[?25h",
    restaged: "\u001b[25l\r> Z\u001b[73X\r\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\r\n                                                                           G\u001b[9;4H\u001b[?25hQSSSW5FQZ",
    afterNoop: ""
  }
};

/** The row the production predicate reads: baseY + cursorY. Where the cursor sits
 *  IS which line is the prompt, so this is the prompt line and not a guess. */
function promptRow(entry: { term: { buffer: { active: any } } }): string {
  const buf = entry.term.buffer.active;
  const line = buf.getLine(buf.baseY + buf.cursorY);
  return line ? line.translateToString(true) : '';
}

/** The whole screen, so a failure shows what was rendered and not only a boolean. */
function screen(entry: { term: { buffer: { active: any }; rows: number } }): string[] {
  const buf = entry.term.buffer.active;
  const out: string[] = [];
  for (let y = 0; y < entry.term.rows; y += 1) {
    const line = buf.getLine(buf.baseY + y);
    const s = line ? line.translateToString(true) : '';
    if (s.trim()) out.push(s);
  }
  return out;
}

window.__harnessRun = async () => {
  const result: Record<string, unknown> = { providers: {} };
  try {
    installBridgeStub();
    const root = document.getElementById('root')!;

    for (const [name, cap] of Object.entries(CAPTURES)) {
      // ---- branch A: staged, then the candidate clear
      const a = acquireTerminal('A-' + name);
      attachTerminal(a, root);
      await write(a.term, cap.boot);
      // L0-FUSION 9.3 dimension 5: can this TUI generate mouse-origin terminal
      // input at all? Read from xterm's OWN public `modes`, never from a regex of
      // mine over the DECSET bytes - `modes.mouseTrackingMode` is derived from
      // `coreMouseService.activeProtocol` (browser/public/Terminal.ts:108-113), so
      // asking the terminal is asking the thing that actually decides.
      const modesAtBoot = readModes(a);
      await write(a.term, cap.empty);
      await write(a.term, cap.staged);
      const stagedNow = Date.now() + ECHO_GRACE_MS + 50;
      const stagedScreen = screen(a);
      const stagedHasDraft = hasTerminalDraft('A-' + name, stagedNow);
      const stagedShowsMark = stagedScreen.some((l) => l.includes(cap.mark));
      const stagedPromptRow = promptRow(a);
      // L0-FUSION stage 5.4c: THE PRODUCTION ERASE ORACLE on the same rendered screen.
      // `promptRow` / `screen` above are this scenario's own reading; this is the function
      // main's submit owner actually asks, read beside them so the two can be compared.
      const stagedOracle = readScreenForNeedle('A-' + name, cap.mark);

      await write(a.term, cap.afterClear);
      const clearedNow = Date.now() + ECHO_GRACE_MS + 50;
      const clearedScreen = screen(a);
      const clearedHasDraft = hasTerminalDraft('A-' + name, clearedNow);
      const clearedShowsMark = clearedScreen.some((l) => l.includes(cap.mark));
      const clearedPromptRow = promptRow(a);
      const clearedOracle = readScreenForNeedle('A-' + name, cap.mark);

      // ---- branch B: staged again, then a harmless key
      const b = acquireTerminal('B-' + name);
      attachTerminal(b, root);
      await write(b.term, cap.boot);
      await write(b.term, cap.empty);
      await write(b.term, cap.staged);
      await write(b.term, cap.afterClear);
      await write(b.term, cap.restaged);
      const reNow = Date.now() + ECHO_GRACE_MS + 50;
      const reHasDraft = hasTerminalDraft('B-' + name, reNow);
      const reShowsMark = screen(b).some((l) => l.includes(cap.mark));

      await write(b.term, cap.afterNoop);
      const noopNow = Date.now() + ECHO_GRACE_MS + 50;
      const noopScreen = screen(b);
      const noopHasDraft = hasTerminalDraft('B-' + name, noopNow);
      const noopShowsMark = noopScreen.some((l) => l.includes(cap.mark));
      const noopPromptRow = promptRow(b);
      const noopOracle = readScreenForNeedle('B-' + name, cap.mark);
      const absentOracle = readScreenForNeedle('B-' + name, 'NEVER-STAGED-' + cap.mark);
      const emptyNeedleOracle = readScreenForNeedle('B-' + name, '');
      // Read again at the end: a mode set later would be just as fatal as one set
      // at boot, and a single reading cannot tell "never" from "not yet".
      const modesAtEnd = readModes(a);

      (result.providers as Record<string, unknown>)[name] = {
        opened: a.opened && b.opened,
        oracle: { staged: stagedOracle, afterClear: clearedOracle, afterNoop: noopOracle, absent: absentOracle, emptyNeedle: emptyNeedleOracle,
          stagedScreenCount: stagedScreen.filter((l) => l.includes(cap.mark)).length },
        modes: { atBoot: modesAtBoot, atEnd: modesAtEnd },
        staged: { hasDraft: stagedHasDraft, showsMark: stagedShowsMark, onPromptRow: stagedPromptRow.includes(cap.mark), promptRow: stagedPromptRow, screen: stagedScreen.slice(-6) },
        afterClear: { hasDraft: clearedHasDraft, showsMark: clearedShowsMark, onPromptRow: clearedPromptRow.includes(cap.mark), promptRow: clearedPromptRow, screen: clearedScreen.slice(-6) },
        restaged: { hasDraft: reHasDraft, showsMark: reShowsMark },
        afterNoop: { hasDraft: noopHasDraft, showsMark: noopShowsMark, onPromptRow: noopPromptRow.includes(cap.mark), promptRow: noopPromptRow, screen: noopScreen.slice(-6) }
      };
      disposeTerminal('A-' + name);
      disposeTerminal('B-' + name);
    }
    window.harness.report({ ok: true, ...result });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack || e), partial: result });
  }
};
