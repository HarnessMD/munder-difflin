import { isTerminalReport } from '@shared/terminalReport';
/**
 * A process-wide pool of live xterm terminals, one per ptyId.
 *
 * Why: node-pty keeps no scrollback. If we created/disposed an xterm every time
 * the user switched agents (or toggled fullscreen), the new terminal would be
 * empty and stay blank until the TUI happened to repaint — which is exactly the
 * "terminal vanishes until I drag the splitter" bug.
 *
 * Instead each pty gets ONE Terminal for the app's lifetime. It is opened into a
 * detached host <div> and subscribes to the pty stream once, so its buffer is
 * always populated. A view (the sidebar tab or the fullscreen overlay) simply
 * re-parents that host element into itself when it mounts and detaches it on
 * unmount — the rendered content moves with it, so the terminal is always
 * visible immediately, no repaint required.
 */
import { useEffect, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { arabicJoinRanges } from '@/terminal/arabicJoiner';
import { attachArabicSpacingFix } from '@/terminal/arabicSpacingFix';
import { isArabicTerminalEnabled } from '@/terminal/arabicSetting';
import {
  classifyPathToken, confirmSpacedPath, isPathToken, spacedPathSpans, terminalLinkSpans, terminalPathReference, type PathAction
} from '@shared/terminalPaths';
import { confirmedTerminalLine, createTerminalMouseLinkGate, rangesOverlap } from '@shared/terminalBufferLinks';
import { ownerOfPath } from '@/ide/ownerOfPath';
import {
  createTerminalRecoveryState,
  normalizePtyChunk,
  requestInitialPtyRedraw,
  scheduleWebglRecovery,
  type TerminalRecoveryState
} from './terminalRecovery';
import {
  canAutomateTerminal,
  settleDraft,
  opensInteractiveTerminalUi,
  shouldFollowTerminalOutput,
  terminalAutomationBlock,
  type TerminalAutomationBlock
} from './terminalAutomation';
import { sanitizeTerminalSelection } from './terminalSelection';
import { terminalKeySequence } from './terminalKeys';
import type { CliMissingState } from '@shared/cliMissing';
import type { CliSetupState } from '@shared/cliSetup';
import type { LoginPrompt } from '@shared/cliLogin';
import i18n from '@/i18n';
import { showToast } from './toast';
import { coveredAboveIde, ideChordOpens } from '../ide/ideShortcutRules';
import '@xterm/xterm/css/xterm.css';

export interface TerminalEntry {
  /** The pty this terminal mirrors — needed to poke `resizePty` on a reflow. */
  ptyId: string;
  term: Terminal;
  fit: FitAddon;
  /** The element xterm renders into; views re-parent this in/out of the DOM. */
  host: HTMLDivElement;
  /** xterm is only `open()`ed once its host is first attached to the document. */
  opened: boolean;
  exited: boolean;
  /** I2 (0.5.3): the engine CLI is not installed, so nothing is running in this
   *  pty and the view draws the card over the grid. Null once it runs. */
  cliMissing: CliMissingState | null;
  cliMissingListeners: Set<(s: CliMissingState | null) => void>;
  /** Batch 2: installing, or signing in after the install. */
  cliSetup: CliSetupState | null;
  cliSetupListeners: Set<(s: CliSetupState | null) => void>;
  /** I2 part 2: the CLI's sign in prompt, drawn as a modal over the grid. */
  login: LoginPrompt | null;
  loginListeners: Set<(p: LoginPrompt | null) => void>;
  /** Stream subscriptions to tear down on dispose. */
  unsub: Array<() => void>;
  /** Current consumer callbacks — set by whichever view is mounted. */
  onData?: (chunk: string) => void;
  onPrompt?: (text: string) => void;
  recovery: TerminalRecoveryState;
  needsRendererRepaint: boolean;
  /** A user-opened slash-command picker (for example Codex `/model`) owns the
   * input line. Queue automation waits until the picker closes. */
  automationBlocked: boolean;
  /** Has the running program enabled DEC private mode 2031, terminal theme-change
   *  notifications? A TUI that paints its own colours cannot see the app theme
   *  flip: xterm repaints its own cells, but cells the program coloured
   *  explicitly keep those colours until the program redraws them. 2031 is how it
   *  asks to be told, and we only tell the ones that asked. */
  themeNotify: boolean;
  /** When the picker latch was set — the block expires, see PICKER_BLOCK_MS. */
  automationBlockedAt: number;
  /** True while the user has unsubmitted text in the live TUI prompt. */
  inputDirty: boolean;
  inputDirtyAt: number; // when the draft was last typed into; the screen cannot clear it inside the echo grace
  automationSettleUntil: number;
  /** Our model of the text on the live prompt line. On the ENTRY, not a closure
   * variable: `inputDirty` is derived from it, so anything that clears the
   * prompt (Ctrl-U, a respawn reset) has to clear both or the next keystroke
   * resurrects the deleted text as a phantom draft. */
  lineBuf: string;
  /** Bumped every time this pty is respawned under the same id. Late events from
   * the OLD process carry the generation they were registered under, so they can
   * be recognised and dropped instead of corrupting the replacement. */
  generation: number;
  /** A terminal nobody has opened was sized to the process grid (autosend,
   *  0.5.5), so its screen reads true. An unopened xterm starts at 80 by 24
   *  while the process draws at its own grid, and that screen reads a stuck
   *  input box as empty. */
  gridSized: boolean;
  /** Output held until the grid is known, so no byte is drawn at a wrong size.
   *  Null once flushed. */
  held: string[] | null;
  /** The grid is being asked for now (sizeToProcessGrid). */
  sizing?: boolean;
  webgl?: WebglAddon;
  /** Live Arabic/RTL rendering handles, present only while it is ON. Held so
   *  the mode can be switched off again without disposing the terminal. */
  arabic?: { joiner: number; detachSpacing: () => void };
}

const pool = new Map<string, TerminalEntry>();

import { parseHexColor, oscColorBody, isDarkBackground } from './termColor';

type ThemeMap = Record<string, string>;


/** Tell a running program the terminal's theme changed.
 *
 *  The reply half of DEC mode 2031: `CSI ? 997 ; 1 n` for dark, `; 2 n` for
 *  light. Sent ONLY to programs that enabled 2031, because a program that did not
 *  ask would receive this as unsolicited bytes on its input.
 *
 *  Without it the app theme and the TUI disagree until the agent restarts:
 *  xterm's own cells flip, and everything the program painted explicitly does
 *  not. */
export function notifyThemeChangeAll(theme: 'light' | 'dark'): void {
  const all = [...pool.keys()];
  const told = all.filter((id) => pool.get(id)?.themeNotify);
  console.log(`[theme] -> ${theme}: notified ${told.length}/${all.length} terminal(s)`
    + (told.length ? ` (${told.join(', ')})` : ' — none opted into DEC 2031'));
  for (const ptyId of all) notifyThemeChange(ptyId, theme);
}

function notifyThemeChange(ptyId: string, theme: 'light' | 'dark'): void {
  const entry = pool.get(ptyId);
  if (!entry || entry.exited || !entry.themeNotify) return;
  window.cth.writePty(ptyId, `\x1b[?997;${theme === 'dark' ? 1 : 2}n`, false);
}

/** Get (or lazily create) the persistent terminal for a pty. Theme/font are
 *  only used at creation; an attaching view re-applies its own afterwards. */
export function acquireTerminal(ptyId: string, theme?: ThemeMap, fontSize = 14): TerminalEntry {
  const existing = pool.get(ptyId);
  if (existing) return existing;

  const host = document.createElement('div');
  host.style.width = '100%';
  host.style.height = '100%';

  const term = new Terminal({
    theme,
    // v0.3.4: JetBrains Mono replaces VT323 — the narrow CRT face strained at
    // data density. lineHeight stays 1.0 so TUI box-drawing rows stay joined.
    fontFamily: '"JetBrains Mono", "SF Mono", Menlo, monospace',
    fontSize,
    lineHeight: 1.0,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 100000,
    // Guarantee legible text no matter what colors a running program sets.
    // When a program paints a coloured cell background (e.g. a git-diff add line
    // with a green bg, or a yellow-highlighted line) while leaving the default
    // foreground, the theme's dark ink would otherwise render dark-on-colour and
    // be unreadable on the light/cream theme. xterm auto-adjusts the foreground
    // per cell to keep at least this contrast ratio (WCAG AA = 4.5) against the
    // actual background — so it also rescues low-contrast coloured *text* on the
    // cream paper. Untouched for already-high-contrast cells (the dark theme).
    minimumContrastRatio: 4.5,
    allowProposedApi: true,
    // OSC 8 (for example a displayed filename with a file:// destination)
    // must use our stat/IDE/reveal path, never xterm's default browser opener.
    linkHandler: {
      allowNonHttpProtocols: true,
      activate: (event, uri) => {
        if (!(event.metaKey || event.ctrlKey)) return;
        void activateTerminalUri(ptyId, uri);
      }
    }
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  // Unicode 11 width tables: xterm's default (Unicode 6) counts most emoji as
  // ONE cell wide, but Claude Code positions text with modern widths (emoji =
  // two cells) — the glyph then overflows its single cell and merges with the
  // following text (e.g. "✅FIX-…"). Match the app's idea of character width.
  term.loadAddon(new Unicode11Addon());
  term.unicode.activeVersion = '11';
  registerMarkdownLinkProvider(term, ptyId);
  // NOTE: don't open() yet — xterm needs its host connected to the document to
  // measure correctly. We open on first attach (see attachTerminal).

  const entry: TerminalEntry = {
    ptyId,
    term,
    fit,
    host,
    opened: false,
    exited: false,
    cliMissing: null,
    cliMissingListeners: new Set(),
    cliSetup: null,
    cliSetupListeners: new Set(),
    login: null,
    loginListeners: new Set(),
    unsub: [],
    recovery: createTerminalRecoveryState(),
    needsRendererRepaint: false,
    automationBlocked: false,
    themeNotify: false,
    automationBlockedAt: 0,
    inputDirty: false,
    inputDirtyAt: 0,
    automationSettleUntil: 0,
    lineBuf: '',
    generation: 0,
    gridSized: false,
    held: []
  };

  const mouseLinkGate = createTerminalMouseLinkGate();
  const observeLinkMouse = (event: MouseEvent): void => mouseLinkGate.observe(event);
  for (const type of ['mousedown', 'mouseup', 'mousemove'] as const) {
    // Observe without stopping DOM propagation: xterm's own linkifier must
    // still receive the down/up pair, including while the TUI reports mice.
    host.addEventListener(type, observeLinkMouse, true);
    entry.unsub.push(() => host.removeEventListener(type, observeLinkMouse, true));
  }

  // Subscribe to the pty stream ONCE for the terminal's whole lifetime, so the
  // buffer keeps filling even while this terminal isn't mounted in any view.
  let livePainted = false;
  void window.cth.sleepScreen?.(ptyId).then((screen) => { if (screen && !livePainted) term.write(screen); }).catch(() => {});
  entry.unsub.push(window.cth.onPtyData(ptyId, (rawChunk) => {
    livePainted = true;
    const chunk = normalizePtyChunk(rawChunk);
    if (!chunk) return;
    // The process came after the grid search stopped: look again now.
    if (entry.held && !entry.sizing) void sizeToProcessGrid(entry);
    if (entry.held) { entry.held.push(chunk); entry.onData?.(chunk); return; }
    const active = term.buffer.active;
    const follow = shouldFollowTerminalOutput(active.viewportY, active.baseY);
    term.write(chunk, () => {
      if (follow) {
        try { term.scrollToBottom(); } catch { /* terminal may be detaching */ }
      }
    });
    entry.onData?.(chunk);
  }));
  // A restart does killPty() then spawnPty() under the SAME pty id, so a stale
  // exit from the killed process could in principle latch `exited` on its
  // replacement (which would silently drop every keystroke). It can't: kill()
  // removes the session from the map synchronously (main/pty.ts kill), and the
  // process's own onExit checks it still owns that id before emitting — so the
  // stale event is suppressed in the main process and never reaches here.
  entry.unsub.push(window.cth.onPtyExit(ptyId, ({ exitCode, signal }) => {
    entry.exited = true;
    term.writeln(`\r\n\x1b[2m─ process exited (code ${exitCode}${signal ? `, signal ${signal}` : ''}) ─\x1b[0m`);
  }));
  // A first-time engine-CLI install just finished and the agent is auto
  // restart-and-continuing into THIS same pty (main re-ran the spawn). Re-arm the
  // terminal in place — clear the latched exit (so keystrokes flow again) and wipe
  // the install banner + "process exited" line — so the relaunched CLI's TUI paints
  // onto a clean, typeable grid. Mirrors resetTerminal but works on this closure.
  entry.unsub.push(window.cth.onPtyRelaunch(ptyId, (info) => {
    entry.exited = false;
    setCliMissing(entry, null);
    setCliSetup(entry, null);
    try { term.reset(); } catch { /* not yet open */ }
    // The CLI would not reopen the last session. Its error and the exit
    // line are cleared above; one quiet line says what happened instead.
    if (info?.startedFresh) {
      try { term.writeln(STARTED_FRESH_LINE); } catch { /* not yet open */ }
    }
  }));
  // I2: the engine CLI is not installed. Nothing was spawned, so there is no
  // exit to latch; the card is drawn by the view and the grid stays clean for
  // the installer's output when the person presses Install. A failed install
  // sends the state again with its last lines, and the card comes back.
  entry.unsub.push(window.cth.onPtyCliMissing(ptyId, (state) => {
    entry.exited = false;
    setCliMissing(entry, state);
  }));
  // F3 (founder, 24 Sep 2026): that push reaches only a terminal that already
  // exists. An agent respawned at app start (or a screen opened later) stopped
  // at the card before anyone listened, and its terminal stayed a silent blank
  // grid. Ask main once whether this pty is paused at the card. The push stays
  // authoritative: a state that arrived while this answer was in flight wins.
  void window.cth.cliMissingState?.(ptyId).then((state) => {
    if (state && !entry.cliMissing) { entry.exited = false; setCliMissing(entry, state); }
  }).catch(() => { /* a main without the handler */ });
  // Batch 2: the setup phase, pushed and pulled the same way.
  entry.unsub.push(window.cth.onPtyCliSetup(ptyId, (state) => {
    // A login running in this pty is a live process: the previous one's exit
    // (the installer's, or the agent run that ended signed out) latched
    // `exited`, which swallowed every key typed into the sign in (batch 2).
    if (state?.login === 'running') entry.exited = false;
    setCliSetup(entry, state);
  }));
  void window.cth.cliSetupState?.(ptyId).then((state) => {
    if (state && !entry.cliSetup) setCliSetup(entry, state);
  }).catch(() => { /* a main without the handler */ });
  // I2 part 2: the CLI printed its sign in prompt, or the sign in ended. The
  // modal is drawn by the view; a success says so in a toast and the terminal
  // is the CLI's again.
  entry.unsub.push(window.cth.onPtyLogin(ptyId, (e) => {
    if ('prompt' in e) { setLogin(entry, e.prompt); return; }
    setLogin(entry, null);
    if (e.done.outcome === 'success') showToast(i18n.t('terminal.cliLogin.signedIn'));
  }));

  // ── Copy / paste ──────────────────────────────────────────────────────────
  // With an accelerated renderer there is no DOM text, so the browser's native
  // copy can't see the terminal — the selection lives inside xterm. Wire the
  // usual terminal conventions:
  //   Ctrl/Cmd+C with a selection → copy (without one it stays SIGINT)
  //   Ctrl/Cmd+Shift+C            → copy ;  Ctrl/Cmd+Shift+V → paste
  //   right-click                 → copy the selection, else paste (console style)
  const copySelection = (): boolean => {
    if (!term.hasSelection()) return false;
    // Selections come off the character GRID, so any gutter the CLI painted
    // there (Claude Code renders a blockquote as `▎ text`) is part of the
    // copied cells. Strip it — see terminalSelection.ts.
    const text = sanitizeTerminalSelection(term.getSelection());
    // Still `true` when a rail-only selection sanitizes to nothing: the gesture
    // was a copy and must stay one, or right-click would fall through to paste.
    if (text) void window.cth.copyToClipboard(text);
    return true;
  };
  /** Paste the clipboard into the terminal.
   *
   *  The read is SYNCHRONOUS on purpose. Dictation tools (muesli.works, Wispr
   *  Flow, …) "type" by stashing the clipboard, writing the transcript, sending
   *  the paste key, and restoring the old clipboard immediately after. The async
   *  read this used to do came back a tick or two later — after the restore — so
   *  the terminal pasted the text that had been on the clipboard BEFORE, and the
   *  words the user had just spoken were dropped. Reading inside the keydown
   *  handler closes that window entirely.
   *
   *  Falls back to the async read if the sync bridge is unavailable (an older
   *  preload), so this degrades to the previous behaviour rather than to nothing. */
  const pasteClipboard = (): void => {
    if (entry.exited) return;
    try {
      const text = window.cth.readClipboardSync?.();
      if (typeof text === 'string') { if (text) term.paste(text); return; }
    } catch { /* fall through to the async path */ }
    void window.cth.readClipboard().then((t) => { if (t) term.paste(t); });
  };
  term.attachCustomKeyEventHandler((ev) => {
    if (ev.type !== 'keydown') return true;
    // Keys xterm would encode in a way the TUI cannot read. Checked BEFORE the
    // Ctrl/Cmd gate below, because Shift+Enter holds neither: without this it
    // fell straight through to xterm's default, which sends the same bare CR as
    // Enter, so Shift+Enter submitted the prompt instead of opening a new line
    // (#481). Writing to the pty directly is the same path the OSC colour replies
    // already use.
    const seq = terminalKeySequence(ev);
    if (seq !== null) {
      if (!entry.exited) window.cth.writePty(ptyId, seq);
      ev.preventDefault();
      return false;
    }
    if (!(ev.ctrlKey || ev.metaKey)) return true;
    // The IDE chord (0.5.3). On Windows and Linux it is Ctrl+I, which is Tab to a
    // shell, so the agent would be sent a Tab as the IDE opened over it. Kept
    // from the CLI ONLY when this same keydown really opens the IDE: on macOS
    // Control I stays the terminal's (readline Tab, vim jump forward), and so
    // does the chord while the IDE is open or a modal is up.
    if (ideChordOpens(ev, {
      isOpen: () => storeApi?.getState().ideOpen ?? false,
      open: () => {},
      covered: () => coveredAboveIde(document, window)
    })) return false;
    const key = ev.key.toLowerCase();
    if (key === 'c' && (ev.shiftKey || term.hasSelection())) {
      // Copy-on-Ctrl+C only while a selection exists; clear it after, so a
      // second Ctrl+C still interrupts the agent as usual.
      if (copySelection() && !ev.shiftKey) term.clearSelection();
      ev.preventDefault();
      return false;
    }
    if (key === 'v' && ev.shiftKey) {
      pasteClipboard();
      ev.preventDefault();
      return false;
    }
    return true;
  });
  host.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    if (copySelection()) { term.clearSelection(); return; }
    pasteClipboard();
  });

  // Answer the terminal-colour queries (OSC 10 foreground, OSC 11 background).
  //
  // A TUI that wants to match the terminal asks for its colours with
  // `ESC ] 11 ; ? BEL` and styles itself from the reply. We registered NO OSC
  // handler at all, so the query went unanswered and the app fell back to its own
  // default, which for OpenCode is LIGHT. That is why OpenCode painted near-white
  // panels inside a dark window even with its theme set to `system`, and why it
  // showed up across agents rather than on one engine: any TUI that asks gets the
  // same silence.
  //
  // COLORFGBG (set at spawn) is the older, coarser channel and only carries
  // "light or dark". This carries the ACTUAL colour, so a TUI can match the
  // window rather than guess a side.
  const oscColorReply = (index: 10 | 11) => (data: string): boolean => {
    if (data !== '?') return false;          // only the QUERY form; a SET is not ours to handle
    if (entry.exited) return true;           // swallow it rather than write to a dead pty
    const map = (term.options.theme ?? theme) as ThemeMap | undefined;
    const hex = index === 11 ? map?.background : map?.foreground;
    const rgb = hex && parseHexColor(hex);
    if (!rgb) return false;                  // unknown colour: stay silent rather than lie
    window.cth.writePty(ptyId, `\x1b]${index};${oscColorBody(rgb)}\x1b\\`, false);
    return true;
  };
  term.parser.registerOscHandler(10, oscColorReply(10));
  term.parser.registerOscHandler(11, oscColorReply(11));

  // DEC private mode 2031: the program is asking to be told when the terminal's
  // theme changes. Answering OSC 11 only covers STARTUP; a program that painted
  // its panels from that answer keeps them until something tells it to repaint,
  // which is why flipping the app theme left OpenCode's boxes in the old colours.
  // Return false so xterm still applies the mode itself; we are only listening.
  term.parser.registerCsiHandler({ prefix: '?', final: 'h' }, (params) => {
    if (params.includes(2031)) {
      entry.themeNotify = true;
      // The protocol expects the CURRENT theme the moment a program opts in, not
      // only on the next change. Without this a CLI set to follow the terminal has
      // nothing to go on at startup and falls back to its own default, which is
      // how a light window ended up with black message highlights.
      const bg = (term.options.theme as ThemeMap | undefined)?.background;
      notifyThemeChange(ptyId, bg && !isDarkBackground(bg) ? 'light' : 'dark');
      // Deliberately logged. Whether a TUI opts in is the difference between "the
      // theme fix works" and "we are talking to something that is not listening",
      // and that is not observable from the outside.
      console.log(`[theme] ${ptyId} enabled theme-change notifications (DEC 2031)`);
    }
    return false;
  });
  term.parser.registerCsiHandler({ prefix: '?', final: 'l' }, (params) => {
    if (params.includes(2031)) entry.themeNotify = false;
    return false;
  });

  // Keystrokes → pty. A small line buffer surfaces the last submitted prompt.
  // It lives on the entry (see TerminalEntry.lineBuf) so every prompt-clearing
  // path resets it too.
  term.onData((data) => {
    if (!mouseLinkGate.forward(data)) return;
    if (entry.exited && isTerminalReport(data)) return;
    window.cth.writePty(ptyId, data, !isTerminalReport(data));
    // A lone Escape or Ctrl-C closes interactive pickers. Arrow-key escape
    // sequences must NOT clear the block while the user navigates a picker.
    if (data === '\x1b' || data === '\x03') {
      releasePickerBlock(entry);
      entry.lineBuf = '';
    }
    // The user's own Ctrl-U (kill-line) clears the prompt exactly like ours does.
    if (data === '\x15') entry.lineBuf = '';
    // Bracketed paste is still user-owned draft text; remove only its wrapper so
    // pasted content marks the prompt dirty instead of looking automation-safe.
    const input = data.replace(/\x1b\[200~/g, '').replace(/\x1b\[201~/g, '');
    // A PASTE is never a submit: the TUI drops its newlines into the input box
    // and waits for a real Enter. xterm rewrites pasted newlines to "\r", so
    // without this a five-line paste would look like five submitted messages —
    // and the Enter that actually sends it would then be a sixth. (TELEMETRY.md
    // → message_sent; the paste's own Enter keystroke arrives as its own chunk
    // and is counted there.)
    const pasted = data.includes('\x1b[200~');
    let submitted = false;
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === '\r' || ch === '\n') {
        const t = entry.lineBuf.trim();
        entry.lineBuf = '';
        if (entry.automationBlocked) {
          // Enter chooses an item and closes the current picker.
          releasePickerBlock(entry);
        }
        // NOT an `else`: this Enter is the one that SUBMITTED the command, so it
        // must both close any picker that was already open and latch a new one
        // for the command it just submitted. As an `else if`, a line like
        // `/model sonnet` latched the block and then had no later Enter to clear
        // it — every queued message to that agent was skipped forever.
        if (opensInteractiveTerminalUi(t)) {
          entry.automationBlocked = true;
          entry.automationBlockedAt = Date.now();
        }
        if (t.length >= 2) {
          entry.onPrompt?.(t);
          submitted = true;
        }
      } else if (ch === '\x7f' || ch === '\b') {
        entry.lineBuf = entry.lineBuf.slice(0, -1);
      } else if (ch === '\x1b') {
        break; // skip escape sequences (arrow keys, etc.)
      } else if (ch >= ' ') {
        entry.lineBuf += ch;
      }
    }
    // ONE message per input chunk, at the SUBMIT boundary — not per keystroke
    // (that is what `pty:write` sees, and counting there would meter typing) and
    // not per line inside a paste. This is the only place the renderer can cause
    // an analytics event; it sends a surface name and nothing else.
    if (submitted && !pasted) void window.cth.trackMessageSent('terminal');
    entry.inputDirty = entry.lineBuf.length > 0;
    // Re-stamped on every keystroke: the echo grace runs from the last key.
    if (entry.inputDirty) entry.inputDirtyAt = Date.now();
  });

  pool.set(ptyId, entry);
  void sizeToProcessGrid(entry);
  return entry;
}

/** Write out whatever arrived while the grid was being asked for. */
function flushHeld(entry: TerminalEntry): void {
  const held = entry.held;
  if (!held) return;
  entry.held = null;
  if (held.length) entry.term.write(held.join(''));
}

/** Size a terminal nobody has opened to its process's grid before drawing a
 *  byte, then ask the process for a full frame, so main can read its input box
 *  (autosend, 0.5.5). An opened terminal is sized by its view instead. Never
 *  resized after drawing: the program would not redraw for it. */
async function sizeToProcessGrid(entry: TerminalEntry): Promise<void> {
  if (entry.sizing) return;
  entry.sizing = true;
  try {
    // A restored agent's terminal is made before its process starts: Michael's
    // about 5 s before (Pam, round 6). The search used to stop after 5 s from
    // here, a beat too soon, and his screen stayed 80 by 24 against a 100 by 30
    // process, unreadable, so nothing could see his input box. With nothing
    // printed yet nothing waits on the grid, so the search keeps on (two
    // minutes, then again at the first byte); output already held gets the
    // 5 s it always had.
    const began = Date.now();
    let firstByteAt = 0;
    while (entry.held && !entry.opened && !entry.exited) {
      const live = await window.cth.listPtys().catch(() => []);
      const pty = live.find((p) => p.id === entry.ptyId);
      if (pty?.cols && pty.rows) {
        if (!entry.opened && entry.held) {
          try { entry.term.resize(pty.cols, pty.rows); entry.gridSized = true; } catch { /* keep the default */ }
          flushHeld(entry);
          // Pre-warming already subscribed and asked for the missing startup
          // frame. Share the attach latch: another row-down/row-back redraw on
          // first open makes Codex send its conversation twice more.
          if (entry.gridSized) requestInitialPtyRedraw(entry.recovery, () => window.cth.redrawPty(entry.ptyId));
        }
        return;
      }
      const now = Date.now();
      if (entry.held.length) {
        firstByteAt ||= now;
        if (now - firstByteAt >= GRID_WAIT_HELD_MS) break;
      } else if (now - began >= GRID_WAIT_NO_OUTPUT_MS) {
        return; // still nothing printed: the first byte starts the search again
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    flushHeld(entry);
  } finally {
    entry.sizing = false;
  }
}

/** Output held for the grid is drawn at the default size after this long. */
const GRID_WAIT_HELD_MS = 5_000;
/** A terminal with no output yet looks for its process this long. */
const GRID_WAIT_NO_OUTPUT_MS = 120_000;


/** The terminal is in the pool and its process has not exited. */
export function terminalAlive(ptyId: string): boolean {
  const entry = pool.get(ptyId);
  return !!entry && !entry.exited;
}

/** Type dictated words at the terminal's own prompt, as a paste: xterm wraps
 *  it in bracketed paste, so a TUI takes it as text and never as keys. False
 *  when the terminal is gone or its process exited. */
export function pasteIntoTerminal(ptyId: string, text: string): boolean {
  const entry = pool.get(ptyId);
  if (!entry || entry.exited || !text) return false;
  entry.term.paste(text);
  return true;
}

/** Whether queued automation can safely own this terminal's input line. A PTY
 * without a pooled terminal cannot have a user-opened local picker. */
export function isTerminalAutomationSafe(ptyId: string, now = Date.now()): boolean {
  const entry = pool.get(ptyId);
  if (!entry) return true;
  // Batch 2: the terminal belongs to the card, the installer or the login.
  // A queued message typed there would be read by the wrong program.
  if (entry.cliMissing || entry.cliSetup) return false;
  return canAutomateTerminal(automationStateOf(entry, now), now);
}

/** The rows the terminal is showing right now, as text, bottom row last. Null
 *  when there is nothing true to read: no terminal, an exited one, output still
 *  held, or (with `grid`) a terminal not drawn at that grid. Without `grid`
 *  only an opened terminal is read, as before. */
export function terminalScreenLines(ptyId: string, grid?: { cols: number; rows: number }): string[] | null {
  const entry = pool.get(ptyId);
  if (!entry || entry.exited || entry.held) return null;
  // With a grid, the screen counts only when it is drawn at the process grid:
  // at any other size a stuck input box reads as empty.
  if (grid) {
    if (!entry.opened && !entry.gridSized) return null;
    if (entry.term.cols !== grid.cols || entry.term.rows !== grid.rows) return null;
  } else if (!entry.opened) {
    return null;
  }
  try {
    const buf = entry.term.buffer.active;
    const rows: string[] = [];
    for (let y = buf.baseY; y < buf.baseY + entry.term.rows; y++) {
      rows.push(buf.getLine(y)?.translateToString(true) ?? '');
    }
    return rows;
  } catch {
    return null; // never let a buffer read break delivery
  }
}

/** Main's question while it submits into this pty (autosend): the screen,
 *  when drawn at the process grid, and whether a person's draft or menu holds
 *  the input line. A pty with no pooled terminal has no person's draft. */
export function answerTerminalProbe(req: { ptyId: string; cols: number; rows: number }): { lines: string[] | null; safe: boolean; pooled: boolean } {
  return {
    lines: terminalScreenLines(req.ptyId, { cols: req.cols, rows: req.rows }),
    safe: isTerminalAutomationSafe(req.ptyId),
    pooled: pool.has(req.ptyId)
  };
}

/** Characters a TUI paints around its input line that are not the user's text:
 *  the box the prompt sits in and the prompt marker itself. */
const PROMPT_CHROME = /[─-╿\s>❯$#|]/g;

/** How long after a keystroke the rendered screen is not yet evidence of anything.
 *
 *  `inputDirty` is set the instant a key is pressed, but the character only
 *  reaches xterm's buffer once the PTY echoes it back — a round trip through the
 *  child process. Inside that gap the buffer still shows the OLD line, so a read
 *  of a freshly started draft returns "empty" and would hand the prompt to
 *  automation while the user is mid-word. The screen is only allowed to overrule
 *  the keystroke count once it has had time to catch up. */
const ECHO_GRACE_MS = 1000;

/** Does the terminal's rendered prompt line actually hold text right now?
 *
 *  `inputDirty` is inferred by counting keystrokes, and that model DRIFTS: a TUI
 *  that swallows keys for its own UI (a menu, a confirm) leaves the count above
 *  zero while the visible prompt is empty. Nothing ever corrected it, so the
 *  queue stayed blocked by a draft that did not exist — the "messages never
 *  arrive" bug. xterm already holds the rendered screen, so read it instead of
 *  trusting the count.
 *
 *  Returns null when the screen is not evidence of anything: the terminal has not
 *  been opened, the row is missing, or the last keystroke is too recent for the
 *  echo to have landed. Deliberately only ever used to CLEAR a phantom, never to
 *  invent a draft: "empty" drops the block, while "has text" or "don't know"
 *  falls back to the keystroke model and keeps it. The asymmetry matters because
 *  the two mistakes do not cost the same — a wrong "empty" hands the prompt to
 *  automation and fuses a message onto what the user is writing, where a wrong
 *  "has text" only parks a queued message until the draft expires. */
function promptLineHasText(entry: TerminalEntry, now = Date.now()): boolean | null {
  if (!entry.opened || entry.exited) return null;
  // Too soon after the last keystroke for the echo to have landed — the buffer
  // is showing us the past, so it cannot clear anything.
  if (entry.inputDirtyAt && now - entry.inputDirtyAt < ECHO_GRACE_MS) return null;
  try {
    const buf = entry.term.buffer.active;
    const line = buf.getLine(buf.baseY + buf.cursorY);
    if (!line) return null;
    // `true` trims trailing whitespace cells, which a TUI pads its box with.
    return line.translateToString(true).replace(PROMPT_CHROME, '').length > 0;
  } catch {
    return null; // never let a buffer read break delivery
  }
}

/** Whether the user has unsubmitted text sitting on this terminal's prompt.
 *  Shares its draft detection with the automation gate, so the "typing" badge
 *  reports the same draft the gate is holding delivery for. A draft never expires
 *  in either: the gate holds until the box is empty. */
export function hasTerminalDraft(ptyId: string | undefined, now = Date.now()): boolean {
  if (!ptyId) return false;
  const entry = pool.get(ptyId);
  if (!entry) return false;
  return entry.inputDirty && promptLineHasText(entry, now) !== false;
}

function setLogin(entry: TerminalEntry, p: LoginPrompt | null): void {
  entry.login = p;
  for (const l of entry.loginListeners) l(p);
}

/** The sign in prompt for this pty as React state (I2 part 2), pushed. */
export function useCliLogin(ptyId: string | undefined): LoginPrompt | null {
  const [state, setState] = useState<LoginPrompt | null>(() => (ptyId ? pool.get(ptyId)?.login ?? null : null));
  useEffect(() => {
    if (!ptyId) { setState(null); return; }
    const entry = acquireTerminal(ptyId);
    setState(entry.login);
    entry.loginListeners.add(setState);
    return () => { entry.loginListeners.delete(setState); };
  }, [ptyId]);
  return state;
}

/** The modal's buttons go through main: it holds the link the CLI printed
 *  and the pty the code goes into. dismiss clears the modal here at once. */
export async function actOnLogin(ptyId: string, action: 'open-link' | 'paste' | 'dismiss', text?: string): Promise<{ ok: boolean; error?: string }> {
  if (action === 'dismiss') { const entry = pool.get(ptyId); if (entry) setLogin(entry, null); }
  return window.cth.loginAct(ptyId, action, text);
}

function setCliSetup(entry: TerminalEntry, state: CliSetupState | null): void {
  entry.cliSetup = state;
  for (const l of entry.cliSetupListeners) l(state);
}

/** Batch 2: the setup phase for this pty as React state, pushed. */
export function useCliSetup(ptyId: string | undefined): CliSetupState | null {
  const [state, setState] = useState<CliSetupState | null>(() => (ptyId ? pool.get(ptyId)?.cliSetup ?? null : null));
  useEffect(() => {
    if (!ptyId) { setState(null); return; }
    const entry = acquireTerminal(ptyId);
    setState(entry.cliSetup);
    entry.cliSetupListeners.add(setState);
    return () => { entry.cliSetupListeners.delete(setState); };
  }, [ptyId]);
  return state;
}

/** "Setup complete, start agent". Main discards the login terminal and starts
 *  the agent; the panel goes the moment it answers, or stays with the reason. */
export async function startAgentAfterSetup(ptyId: string, mode?: 'anyway'): Promise<{ ok: boolean; error?: string }> {
  const res = await window.cth.cliSetupStart(ptyId, mode);
  const entry = pool.get(ptyId);
  if (res.ok && entry) setCliSetup(entry, null);
  return res;
}

/** "Set up manually" (batch 4): main opens the manual terminal and pushes the
 *  manual panel. The card goes at once so the terminal is what shows; a
 *  refusal brings it back. */
export async function openManualSetup(ptyId: string): Promise<{ ok: boolean; error?: string }> {
  const entry = pool.get(ptyId);
  const before = entry?.cliMissing ?? null;
  if (entry) setCliMissing(entry, null);
  const res = await window.cth.cliSetupManual(ptyId);
  if (!res.ok && entry && !entry.cliMissing && !entry.cliSetup) setCliMissing(entry, before);
  return res;
}

/** "Sign in again": main runs the login step again in the same terminal. */
export function retrySetupLogin(ptyId: string): Promise<{ ok: boolean; error?: string }> {
  return window.cth.cliSetupLogin(ptyId);
}

function setCliMissing(entry: TerminalEntry, state: CliMissingState | null): void {
  entry.cliMissing = state;
  for (const l of entry.cliMissingListeners) l(state);
}

/** The card's state for this pty as React state (I2). Pushed, not polled: the
 *  card must appear the moment main says the CLI is missing, and go the moment
 *  the person presses the button. */
export function useCliMissing(ptyId: string | undefined): CliMissingState | null {
  const [state, setState] = useState<CliMissingState | null>(() => (ptyId ? pool.get(ptyId)?.cliMissing ?? null : null));
  useEffect(() => {
    if (!ptyId) { setState(null); return; }
    const entry = acquireTerminal(ptyId);
    setState(entry.cliMissing);
    entry.cliMissingListeners.add(setState);
    return () => { entry.cliMissingListeners.delete(setState); };
  }, [ptyId]);
  return state;
}

/** The person pressed the card's button: hide the card so the installer's own
 *  output (or the CLI) is what they see, then ask main. A failure brings the
 *  card back through onPtyCliMissing; a refusal from main is returned. */
export async function installMissingCli(ptyId: string): Promise<{ ok: boolean; error?: string }> {
  const entry = pool.get(ptyId);
  const before = entry?.cliMissing ?? null;
  if (entry) setCliMissing(entry, null);
  const res = await window.cth.installCli(ptyId);
  if (!res.ok && entry && !entry.cliMissing) {
    // Nothing happened (the pause was gone, or main refused): the card comes
    // back rather than leaving a blank grid nobody can type into.
    setCliMissing(entry, before);
  }
  return res;
}

/** `hasTerminalDraft` as React state. The flag lives on a mutable pool entry
 *  that no component subscribes to, so poll it — cheap (one buffer row read) and
 *  a second of lag on a badge is invisible. */
export function useHasTerminalDraft(ptyId: string | undefined): boolean {
  const [dirty, setDirty] = useState(() => hasTerminalDraft(ptyId));
  useEffect(() => {
    // An agent with no pty has no prompt to hold anything — don't run a timer
    // per card for it (the floor renders one card per agent).
    if (!ptyId) { setDirty(false); return; }
    const read = () => setDirty(hasTerminalDraft(ptyId));
    read();
    const iv = setInterval(read, 1000);
    return () => clearInterval(iv);
  }, [ptyId]);
  return dirty;
}

function automationStateOf(entry: TerminalEntry, now = Date.now()) {
  // The screen wins over the keystroke count, but only when it says "empty",
  // and then for good: text typed later by automation is not a person's draft.
  const inputDirty = settleDraft(entry, entry.inputDirty ? promptLineHasText(entry, now) : null);
  return {
    exited: entry.exited,
    pickerOpen: entry.automationBlocked,
    pickerOpenedAt: entry.automationBlocked ? entry.automationBlockedAt : undefined,
    inputDirty,
    inputDirtyAt: inputDirty ? entry.inputDirtyAt : undefined,
    settleUntil: entry.automationSettleUntil
  };
}

/** Drop the picker latch and give the TUI a moment to repaint the freed line. */
function releasePickerBlock(entry: TerminalEntry): void {
  entry.automationBlocked = false;
  entry.automationBlockedAt = 0;
  entry.automationSettleUntil = Date.now() + 500;
}

/** Why queue delivery is currently held back for this pty, or null if it isn't.
 * The composer shows this instead of claiming it is sending. */
export function terminalAutomationBlockFor(
  ptyId: string | undefined,
  now = Date.now()
): TerminalAutomationBlock {
  if (!ptyId) return null;
  const entry = pool.get(ptyId);
  if (!entry) return null;
  return terminalAutomationBlock(automationStateOf(entry, now), now);
}

/** Wipe the TUI prompt's current line and re-arm automation. Ctrl-U is the
 * readline kill-to-start binding every supported CLI's input honors. */
export function clearTerminalDraft(ptyId: string): string {
  const entry = pool.get(ptyId);
  if (!entry) return '';
  // Hand the text back so the caller can park it somewhere the user can find it
  // again. Ctrl-U is not undoable in a TUI, so silently discarding it was data
  // loss every time an abandoned-looking draft turned out to be a real one.
  const discarded = entry.lineBuf;
  void window.cth.writePty(ptyId, '\x15');
  entry.inputDirty = false;
  entry.inputDirtyAt = 0;
  // Reset our model of the line too. Leaving it set made the very next keystroke
  // recompute `inputDirty` from the text we just deleted, so the draft block
  // came straight back and the deleted text corrupted the next parsed command.
  entry.lineBuf = '';
  // NOT cleared: `automationBlocked`. Ctrl-U kills the input line; it does not
  // close an open picker. Clearing the latch here told automation the prompt was
  // free while a picker still owned it, so the queued message was typed into the
  // picker and acknowledged as delivered — the message was lost and the picker
  // got garbage. The latch is released by a real Enter/Esc/Ctrl-C, or it expires.
  // Let the TUI repaint the cleared line before automation types into it.
  entry.automationSettleUntil = Date.now() + 300;
  return discarded;
}

/** Close an open picker by sending Escape, the key that actually closes one.
 *
 *  ONLY ever called from the composer's own button — i.e. because the user asked
 *  for it. Automation must never do this on its own: the menu belongs to the
 *  user, and we cannot see whether Escape actually closed it, so closing one to
 *  make room for a queued message is both rude and unverifiable. */
export function dismissTerminalPicker(ptyId: string): void {
  const entry = pool.get(ptyId);
  if (!entry || entry.exited) return;
  void window.cth.writePty(ptyId, '\x1b');
  releasePickerBlock(entry);
}

/** Give this terminal a WebGL renderer for as long as it is on screen.
 *
 *  The DOM renderer assumes a perfectly monospace font, but VT323 is missing
 *  glyphs (↔, arrows, some box-drawing) and has no real bold — the browser
 *  substitutes fallback glyphs with different advance widths, so box-drawing
 *  tables shear apart and the cursor drifts. WebGL draws every glyph into its
 *  own fixed cell, keeping the grid aligned. NOT the deprecated canvas addon
 *  (its dirty-region tracking garbles scrollback).
 *
 *  It is a LEASE, taken on attach and released on detach (see detachTerminal),
 *  because a browser allows only a limited number of live WebGL contexts —
 *  around 16 in Chromium — and silently discards the oldest when a new one
 *  pushes past the cap. Terminals used to hold their context for the whole
 *  session even while detached, so restoring a team (which opens one terminal
 *  per agent in quick succession) blew the cap and the browser killed a
 *  background terminal's context. Its pty, buffer and subscription all stayed
 *  healthy — only the renderer was dead — which is exactly the reported
 *  "terminal is black and typing does nothing": the keystrokes were delivered
 *  and the replies arrived, with nothing left alive to paint them.
 *
 *  Best-effort: on init failure or context loss, fall back to the DOM renderer
 *  rather than leave a black terminal. */
function leaseWebglRenderer(entry: TerminalEntry): void {
  if (entry.webgl) return;
  // Arabic mode wants the DOM renderer ON PURPOSE: rows become real text nodes,
  // so the browser's own engine does shaping and (with the CSS in
  // design/global.css) bidi — what the WebGL cell painter structurally cannot
  // (xterm.js has no bidi: xtermjs/xterm.js#701). Skipping the lease IS the
  // feature, not a fallback.
  if (isArabicTerminalEnabled()) return;
  try {
    const webgl = new WebglAddon();
    webgl.onContextLoss(() => {
      if (entry.webgl !== webgl) return;
      console.warn('[terminal] webgl context lost — falling back to DOM renderer');
      entry.webgl = undefined;
      entry.needsRendererRepaint = true;
      try { webgl.dispose(); } catch { /* noop */ }
      // Laptop sleep == GPU sleep == WebGL context loss: the likely PRIMARY
      // trigger for the post-wake "can't scroll past a recent point" bug. The
      // renderer swap leaves xterm's cached cell-height (and the viewport
      // scroll-area derived from it) stale, so only part of the intact buffer
      // is scrollable until something forces a re-measure. Heal it here, on the
      // next frame so the (waking) layout has settled. Guarded + idempotent, so
      // it composes safely with the visibilitychange/focus path in the view.
      scheduleWebglRecovery(entry.recovery, requestAnimationFrame, () =>
        repaintTerminalAfterRendererLoss(entry));
    });
    // Set before loadAddon: an immediately-lost context may call the handler
    // during initialization, and it must be recognized as the active renderer.
    entry.webgl = webgl;
    entry.term.loadAddon(webgl);
  } catch (e) {
    try { entry.webgl?.dispose(); } catch { /* noop */ }
    entry.webgl = undefined;
    console.warn('[terminal] webgl renderer unavailable, using DOM renderer:', e);
  }
}

/** Find the live WebGL2 context an addon renderer is drawing into, so teardown
 *  can explicitly release it. @xterm/addon-webgl's dispose() tears down its
 *  renderer and removes its canvases but never calls loseContext(), so the
 *  underlying context lingers past the addon that owned it (xterm/xterm.js#6068).
 *  On a floor where agents are switched repeatedly, each switch disposes one
 *  renderer and leases another, so these orphan contexts pile up until Chromium
 *  hits its live-context cap (~16) and evicts an older one — often the office
 *  floor's own context — blacking out a terminal or the scene. Losing the context
 *  ourselves frees it immediately instead of waiting on GC.
 *
 *  Scoped to THIS terminal's element and matched by an active webgl2 context, so
 *  it can never touch another terminal's or the scene's context. Returns null when
 *  no live webgl2 canvas is present (the DOM renderer is in use, or it is gone). */
function webglContextOf(term: Terminal): WebGL2RenderingContext | null {
  const el = term.element;
  if (!el) return null;
  for (const canvas of Array.from(el.querySelectorAll('canvas'))) {
    let gl: WebGL2RenderingContext | null = null;
    try { gl = canvas.getContext('webgl2'); } catch { gl = null; }
    if (gl && !gl.isContextLost()) return gl;
  }
  return null;
}

/** Release the WebGL lease so an off-screen terminal isn't holding a GPU context
 *  that an on-screen one needs. xterm falls back to the DOM renderer, which is
 *  fine for a terminal nobody is looking at; the next attach takes a fresh
 *  lease. The buffer and pty subscription are untouched. */
function releaseWebglRenderer(entry: TerminalEntry): void {
  const webgl = entry.webgl;
  if (!webgl) return;
  entry.webgl = undefined;
  // Capture the context BEFORE dispose (dispose may detach the canvas), then
  // release it explicitly — dispose() alone leaks it (see webglContextOf).
  const gl = webglContextOf(entry.term);
  try { webgl.dispose(); } catch { /* noop */ }
  try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* noop */ }
  // The DOM renderer that takes over inherits xterm's cached cell metrics, which
  // may be stale by the time this terminal is shown again.
  entry.needsRendererRepaint = true;
}

/** Turn Arabic/RTL rendering ON for one open terminal.
 *
 *  The full recipe is documented in terminal/arabicJoiner.ts: join every Arabic
 *  phrase into one render range, and strip xterm's per-span letter-spacing from
 *  Arabic spans. MUST run after `open()` — registering a joiner on an unopened
 *  terminal throws.
 *
 *  The `cth-bidi` class is what scopes the bidi CSS in design/global.css to this
 *  terminal. PR #213 applied those rules to every .xterm on the page; they are
 *  `!important` and change span layout, so an English user who fell back to the
 *  DOM renderer (a lost WebGL lease) would have had their TUI box-drawing
 *  shifted by a feature they never enabled. */
function enableArabicRendering(entry: TerminalEntry): void {
  if (entry.arabic) return;
  entry.host.classList.add('cth-bidi');
  const joiner = entry.term.registerCharacterJoiner(arabicJoinRanges);
  const detachSpacing = attachArabicSpacingFix(entry.host);
  entry.arabic = { joiner, detachSpacing };
  // Terminals open at boot, often BEFORE webfonts finish loading, so xterm
  // measures Arabic glyphs against fallback metrics and keeps them. When the
  // real fonts land, poke fontFamily (a self-assign) to force a re-measure and
  // full repaint.
  void document.fonts?.ready.then(() => {
    if (entry.exited) return;
    const fam = entry.term.options.fontFamily;
    entry.term.options.fontFamily = fam;
  });
}

/** Exactly undo the above. Every step is reversible, which is the reason the
 *  switch can be live at all — nothing here disposes the terminal. */
function disableArabicRendering(entry: TerminalEntry): void {
  const on = entry.arabic;
  if (!on) return;
  entry.arabic = undefined;
  entry.host.classList.remove('cth-bidi');
  try { entry.term.deregisterCharacterJoiner(on.joiner); } catch { /* already gone */ }
  try { on.detachSpacing(); } catch { /* noop */ }
}

/** Bring every OPEN terminal in line with the current setting.
 *
 *  Called when the app language changes and when the Settings toggle is used.
 *  Without it the setting would only reach terminals opened afterwards, and a
 *  user who switched to Arabic would see the terminals they already had still
 *  rendering unshaped, left-to-right — which reads as the feature not working
 *  rather than as a scoping rule.
 *
 *  It UPGRADES IN PLACE rather than rebuilding. The office scene can be rebuilt
 *  on a language switch (a8292697) because it is derived from state we still
 *  hold; a terminal cannot, because its scrollback exists only in xterm's own
 *  buffer and the pty will not resend it — recreating one would silently eat
 *  the user's history. Dropping the WebGL lease is enough: `releaseWebglRenderer`
 *  hands painting to the DOM renderer with the buffer, the pty subscription and
 *  the scrollback all untouched, and that DOM renderer is precisely what Arabic
 *  mode needs. Going the other way re-leases WebGL on the next attach.
 *
 *  A terminal that has never been opened is skipped: it has no host in the
 *  document and no joiner to register, and `attachTerminal` reads the setting
 *  fresh when it does open. */
export function notifyArabicTerminalChangeAll(): void {
  const want = isArabicTerminalEnabled();
  const open = [...pool.values()].filter((e) => e.opened && !e.exited);
  const changed = open.filter((e) => !!e.arabic !== want);
  for (const entry of changed) {
    if (want) {
      // The GPU cell painter ignores CSS and cannot do bidi, so Arabic mode
      // needs the DOM renderer. Releasing the lease keeps the buffer.
      releaseWebglRenderer(entry);
      enableArabicRendering(entry);
    } else {
      disableArabicRendering(entry);
      // Deliberately NOT re-leasing WebGL here: the lease is taken on attach,
      // and taking one now for an off-screen terminal is the exact GPU-context
      // exhaustion releaseWebglRenderer exists to avoid.
      entry.needsRendererRepaint = true;
    }
    repaintTerminalAfterRendererLoss(entry);
  }
  console.log(`[terminal] arabic -> ${want ? 'on' : 'off'}: `
    + `${changed.length}/${open.length} open terminal(s) switched`);
}

/** Re-parent a pty's terminal into `container`, opening xterm on first attach. */
export function attachTerminal(entry: TerminalEntry, container: HTMLElement): void {
  container.appendChild(entry.host);
  if (!entry.opened) {
    // open() must come first — the WebGL addon can only load onto an opened
    // terminal, and xterm needs its host in the document to measure the cell.
    entry.term.open(entry.host);
    entry.opened = true;
    // The view sizes it now; anything held for the grid is drawn.
    flushHeld(entry);
    // Arabic/RTL terminal support (the full recipe is documented in
    // terminal/arabicJoiner.ts): join every Arabic phrase into one render range,
    // and strip xterm's per-span letter-spacing from Arabic spans. MUST come
    // after open(): registering a joiner on an unopened terminal throws.
    //
    // The `cth-bidi` class is what scopes the bidi CSS in design/global.css to
    // this terminal. The PR applied those rules to every .xterm on the page;
    // they are `!important` and change span layout, so an English user who
    // fell back to the DOM renderer (a lost WebGL lease) would have had their
    // TUI box-drawing shifted by a feature they never enabled.
    if (isArabicTerminalEnabled()) enableArabicRendering(entry);
  }
  leaseWebglRenderer(entry);
  // PTY startup output can arrive before this pooled terminal subscribes.
  // Request one same-size redraw after open/subscription even when fit() later
  // sees unchanged dimensions and therefore emits no resize of its own.
  requestInitialPtyRedraw(entry.recovery, () => window.cth.redrawPty(entry.ptyId));
  if (entry.needsRendererRepaint) {
    scheduleWebglRecovery(entry.recovery, requestAnimationFrame, () =>
      repaintTerminalAfterRendererLoss(entry));
  }
}

/** Take the terminal off screen: drop the WebGL lease and unparent the host.
 *  Everything that makes the terminal a terminal — buffer, scrollback, pty
 *  subscription — stays in the pool, so re-attaching shows it fully rendered. */
export function detachTerminal(entry: TerminalEntry, container: HTMLElement): void {
  // Guard: another view may have already taken the host (React can mount the new
  // owner before the old one's cleanup runs). Releasing the renderer then would
  // blank the terminal that just legitimately claimed it.
  if (entry.host.parentElement !== container) return;
  releaseWebglRenderer(entry);
  container.removeChild(entry.host);
}

function repaintTerminalAfterRendererLoss(entry: TerminalEntry): void {
  if (!entry.opened || !entry.host.isConnected
      || !entry.host.clientWidth || !entry.host.clientHeight) {
    entry.needsRendererRepaint = true;
    return;
  }
  reflowTerminal(entry.ptyId);
  try {
    entry.term.refresh(0, Math.max(0, entry.term.rows - 1));
    // Only NOW is the repaint confirmed. Clearing the marker before the refresh
    // meant a throw here (the renderer still settling) discarded the last record
    // that this terminal needed repainting — so it stayed black until something
    // unrelated happened to resize it, which is why Cmd +/- fixed it only some
    // of the time.
    entry.needsRendererRepaint = false;
  } catch {
    entry.needsRendererRepaint = true;
  }
}

/**
 * Re-measure cell metrics and rebuild the viewport scroll-area for a pooled
 * terminal. Use after a display wake / GPU (WebGL) context loss / DPR change:
 * xterm caches the cell height measured at open() and only recomputes it on a
 * font change or resize. When that cached metric goes stale (sleep/wake), the
 * .xterm-viewport scroll-area height (rows × cellHeight) is wrong, so only PART
 * of the still-intact buffer is scrollable — the user otherwise has to zoom to
 * force a fit() and reveal the rest.
 *
 * Mirrors the document.fonts.ready re-measure in PtyTerminalView: re-applying the
 * SAME font invalidates xterm's cached cell metrics, clearTextureAtlas re-rasters
 * the WebGL glyph atlas at the right size, then fit() recomputes cols/rows and
 * rebuilds the viewport. Preserves scroll position (NO scrollToBottom) so a user
 * reading history isn't yanked down. No-op until the terminal is opened and its
 * host has a real size, so it composes safely with multiple triggers firing
 * together (onContextLoss + visibilitychange + focus) — a cheap reflow twice is
 * harmless; the guards make an early/duplicate call a no-op.
 */
export function reflowTerminal(ptyId: string): void {
  const entry = pool.get(ptyId);
  if (!entry || !entry.opened) return;
  const host = entry.host;
  // Skip while detached or unsized — fitting a 0×0 host makes xterm propose a
  // tiny grid and resize the pty to it (clipped/oversized banner).
  if (!host.isConnected || !host.clientWidth || !host.clientHeight) return;
  try {
    // Re-apply the SAME font options to force xterm's CharSizeService to
    // re-measure the cell against the now-correct (woken) layout, then drop the
    // glyph atlas so it re-rasters at the corrected metrics.
    entry.term.options.fontFamily = entry.term.options.fontFamily;
    entry.term.options.fontSize = entry.term.options.fontSize;
    entry.term.clearTextureAtlas?.();
    const before = { cols: entry.term.cols, rows: entry.term.rows };
    entry.fit.fit();
    // Only poke the pty when the grid actually changed (every resize repaints
    // the TUI and pushes a frame into scrollback).
    if (entry.term.cols !== before.cols || entry.term.rows !== before.rows) {
      window.cth.resizePty(ptyId, entry.term.cols, entry.term.rows);
    }
    entry.term.refresh(0, Math.max(0, entry.term.rows - 1));
  } catch { /* host may not be sized yet */ }
}

/** What the terminal says when a refused resume started the agent fresh: the
 *  words the agent's row uses for the same thing, dim, like the resume line. */
export const STARTED_FRESH_LINE = '\x1b[2m─ started fresh, last session not found ─\x1b[0m';

/**
 * Soft-reset a pooled terminal for an IN-PLACE pty respawn (the same ptyId is
 * reused — e.g. a model change or agent restart). Clears the screen + scrollback
 * and re-arms input while keeping the SAME Terminal, its live data subscription
 * and its DOM attachment, so the mounted view stays visible and typeable across
 * the restart.
 *
 * Why not disposeTerminal here: the view (PtyTerminalView) keys its attach effect
 * on the ptyId, which doesn't change on a restart — so it never re-attaches a
 * replacement terminal. Disposing therefore left a dead, detached pane that
 * swallowed every keystroke. Resetting in place avoids that entirely.
 */
export function resetTerminal(
  ptyId: string,
  opts: { preserveScrollback?: boolean } = {}
): void {
  const entry = pool.get(ptyId);
  if (!entry) return;
  // Re-arm input — a prior exit (or the kill that precedes the respawn) may have
  // latched `exited`, which otherwise makes onData drop keystrokes silently.
  entry.exited = false;
  entry.inputDirty = false;
  entry.inputDirtyAt = 0;
  // The old process's prompt is gone with it — drop our model of that line and
  // any picker it had open, or the replacement inherits a phantom draft and a
  // block that nothing can clear.
  entry.lineBuf = '';
  entry.automationBlocked = false;
  entry.automationBlockedAt = 0;
  // The missing CLI card belonged to the line that is being replaced. A new
  // line whose CLI is also missing gets its own card pushed by the spawn that
  // follows this reset, so nothing is lost by dropping the old one here.
  setCliMissing(entry, null);
  setCliSetup(entry, null);
  try {
    if (opts.preserveScrollback) {
      entry.term.writeln('\r\n\x1b[2m─ resuming existing session ─\x1b[0m');
    } else {
      // Fresh sessions need a clean grid; resume keeps the existing scrollback.
      entry.term.reset();
    }
  } catch { /* not yet open */ }
}

/** Tear down a pty's terminal (call when the agent/pty is gone for good). */
export function disposeTerminal(ptyId: string): void {
  const entry = pool.get(ptyId);
  if (!entry) return;
  entry.unsub.forEach((u) => { try { u(); } catch { /* noop */ } });
  // Release the GPU context the webgl addon leaves behind; dispose() alone leaks
  // it (see webglContextOf). Captured before dispose in case it detaches the canvas.
  const gl = webglContextOf(entry.term);
  try { entry.webgl?.dispose(); } catch { /* noop */ }
  try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* noop */ }
  try { entry.term.dispose(); } catch { /* noop */ }
  entry.host.remove();
  pool.delete(ptyId);
}

// ─── v0.3.4: ⌘-click a path in terminal output ──────────────────────────────
// A custom ILinkProvider (NOT WebLinksAddon, which only matches URLs): detects
// path tokens in the visible buffer line, resolves relative ones against the
// owning agent's cwd, and on Cmd/Ctrl+click verifies existence via the
// metadata-only fs:statAbs IPC before acting.
// Plain click stays with the TUI (matches VS Code's terminal convention).
// The path string is agent output — treated as hostile: it flows only into a
// read-only stat, the existing read pipeline, or a REVEAL (never an "open with
// the default app", which would turn a printed path into an execution), and
// only on an explicit modifier-click.
//
// v0.4.5 widened this from markdown-only to every path token. What each type
// does lives in @shared/terminalPaths, not here — this file only knows how to
// find tokens on a line and how to run the three verdicts.


function resolvePathCandidate(ptyId: string, raw: string): string | null {
  const p = raw; // Already parsed; decoding a file URI must not strip filename characters twice.
  if (!isPathToken(p)) return null;
  if (p.startsWith('~/') || p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p)) return p;
  // relative → resolve against the owning agent's cwd. Async store import keeps
  // this module usable in the node test harness (no zustand/react at load).
  const cwd = storeApi?.getState().agents.find((a) => a.ptyId === ptyId)?.cwd ?? null;
  if (!cwd) return null;
  return `${cwd}/${p.replace(/^\.\//, '')}`;
}

/** Does this path exist whole? For a path with a space: a link is made only of one the disk confirms (founder bug, 3 Nov 2026). Kept a few seconds, as hover asks again and again. */
const existsCache = new Map<string, { at: number; yes: boolean }>();
async function existsWhole(abs: string): Promise<boolean> {
  const hit = existsCache.get(abs);
  if (hit && Date.now() - hit.at < 5000) return hit.yes;
  const res = await window.cth.statAbs(abs).catch(() => null);
  const yes = !!res?.exists;
  if (existsCache.size > 500) existsCache.clear();
  existsCache.set(abs, { at: Date.now(), yes });
  return yes;
}

// The store is loaded lazily via dynamic import (resolved once, cached): a
// static import would drag zustand/react into the node --test transpile of the
// pure automation helpers that share this file's import graph.
interface MdStoreShape {
  getState: () => {
    agents: Array<{ ptyId?: string; cwd: string }>;
    ideOpen: boolean;
    ideProjectRoot?: string | null;
    openFileInIde: (absPath: string, location?: { line: number; column: number }, root?: string) => void;
  };
}
let storeApi: MdStoreShape | null = null;
void import('@/store/store')
  .then((m) => { storeApi = (m as unknown as { useStore: MdStoreShape }).useStore; })
  .catch(() => { /* store unavailable (tests) — link provider stays inert */ });
/** Failure is visible, but never falls back to launching a file or remote URI. */
function pathLinkFailed(): void { showToast(i18n.t('terminal.pathLinkFailed'), { tone: 'bad' }); }

async function openTerminalUrl(url: string): Promise<void> {
  try {
    const res = await window.cth.openExternal?.(url);
    if (!res?.ok) pathLinkFailed();
  } catch { pathLinkFailed(); }
}

async function activateTerminalUri(ptyId: string, uri: string): Promise<void> {
  if (/^https:\/\//i.test(uri)) { await openTerminalUrl(uri.replace(/^https:/i, 'https:')); return; }
  // A label can hide its destination. No arbitrary URI scheme or host is
  // allowed to reach this computer's filesystem.
  const ref = terminalPathReference(uri);
  const abs = ref && resolvePathCandidate(ptyId, ref.path);
  if (!ref || !abs) { pathLinkFailed(); return; }
  await activatePath(abs, classifyPathToken(ref.path), ref.line ? { line: ref.line, column: ref.column ?? 1 } : undefined);
}

/** Stat on every click: hover metadata must not turn a changed/deleted path into an action. */
async function activatePath(abs: string, action: PathAction, location?: { line: number; column: number }): Promise<void> {
  try {
    const hit = await window.cth.statAbs(abs);
    if (!hit?.exists) { pathLinkFailed(); return; }
    const state = storeApi?.getState();
    const hasRoot = !!state && !!ownerOfPath(state.agents, hit.path);
    if (action === 'reveal' || !hit.isFile || !hasRoot) {
      const res = await window.cth.revealPath(hit.path);
      if (!res.ok) pathLinkFailed();
      return;
    }
    state!.openFileInIde(hit.path, location);
  } catch { pathLinkFailed(); }
}

function registerMarkdownLinkProvider(term: Terminal, ptyId: string): void {
  try {
    term.registerLinkProvider({
      async provideLinks(bufferLineNumber, callback) {
        const logical = await confirmedTerminalLine(term.buffer.active, bufferLineNumber - 1, term.cols, (raw) => {
            const ref = terminalPathReference(raw);
            const abs = ref && resolvePathCandidate(ptyId, ref.path);
            return abs ? existsWhole(abs) : Promise.resolve(false);
          });
        const text = logical.text;
        // A URL host need not carry a dot (`https://localhost:3000/x`), so the
        // cheap bail-out has to let `://` through as well.
        // A folder with a space in its name has no dot, so a separator lets the line through too.
        if (!text) { callback(undefined); return; }
        const links: Parameters<typeof callback>[0] = [];

        // Ordering (URLs win overlaps with path tokens) lives in
        // @shared/terminalPaths so it can be unit-tested; this only turns a
        // span into an xterm link and decides what a click does.
        for (const span of terminalLinkSpans(text)) {
          const range = logical.range(span.start, span.end);
          if (!range || bufferLineNumber < range.start.y || bufferLineNumber > range.end.y) continue;
          if (span.kind === 'url') {
            const url = span.token;
            links!.push({
              range, text: url,
              decorations: { underline: true, pointerCursor: true },
              activate: (event: MouseEvent | undefined) => {
                // ⌘/Ctrl+click only, like the path links: a plain click must
                // keep going to the TUI.
                if (event && !(event.metaKey || event.ctrlKey)) return;
                // The URL is agent output. It reaches nothing but the opener,
                // which is https-only and re-checks in the main process.
                void openTerminalUrl(url);
              }
            });
            continue;
          }
          const abs = resolvePathCandidate(ptyId, span.token);
          if (!abs) continue;
          const action = classifyPathToken(span.token);
          links!.push({
            range, text: span.raw,
            decorations: { underline: true, pointerCursor: true },
            activate: (event: MouseEvent | undefined) => {
              // ⌘/Ctrl+click only — a plain click must keep going to the TUI.
              if (event && !(event.metaKey || event.ctrlKey)) return;
              void activatePath(abs, action, span.line ? { line: span.line, column: span.column ?? 1 } : undefined);
            }
          });
        }
        // A path with a space (`/…/Munder Difflin.app`): the plain tokens above saw only its words. Each reading is
        // asked of the disk, longest first, and only one that exists whole is linked; it then takes the place of the
        // word tokens inside it.
        const spaced = spacedPathSpans(text);
        if (!spaced.length) { callback(links && links.length ? links : undefined); return; }
        const absOf = (p: string): string | null => resolvePathCandidate(ptyId, p);
        void Promise.all(spaced.map((sp) => confirmSpacedPath(sp, (p) => { const abs = absOf(p); return abs ? existsWhole(abs) : Promise.resolve(false); })))
          .then((found) => {
            let out = links!;
            for (const hit of found) {
              const abs = hit && absOf(hit.path);
              if (!hit || !abs) continue;
              const range = logical.range(hit.start, hit.end);
              if (!range || bufferLineNumber < range.start.y || bufferLineNumber > range.end.y) continue;
              out = out.filter((l) => !rangesOverlap(l.range, range));
              const action = classifyPathToken(hit.path);
              out.push({
                range, text: hit.path,
                decorations: { underline: true, pointerCursor: true },
                activate: (event: MouseEvent | undefined) => {
                  // ⌘/Ctrl+click only — a plain click must keep going to the TUI.
                  if (event && !(event.metaKey || event.ctrlKey)) return;
                  void activatePath(abs, action, hit.line ? { line: hit.line, column: hit.column ?? 1 } : undefined);
                }
              });
            }
            out.sort((a, b) => a.range.start.y - b.range.start.y || a.range.start.x - b.range.start.x);
            callback(out.length ? out : undefined);
          }, () => callback(links && links.length ? links : undefined));
      }
    });
  } catch (error) { console.warn('[terminal] file links unavailable', error); }
}
