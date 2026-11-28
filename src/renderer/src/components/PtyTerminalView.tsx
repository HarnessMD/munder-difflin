import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import '@xterm/xterm/css/xterm.css';
import { Icon } from './Icon';
import { acquireTerminal, attachTerminal, detachTerminal, reflowTerminal, useCliLogin, useCliMissing, type TerminalEntry } from './terminalPool';
import { createPtyResizeCoalescer, type PtyResizeCoalescer } from './ptyResizeCoalescer';
import { CliMissingCard } from './CliMissingCard';
import { CodexFolderCard, useCodexCard } from './CodexFolderCard';
import { CliLoginModal } from './CliLoginModal';
import { SleepOverlay } from './SleepOverlay';
import {
  DEFAULT_TERMINAL_FONT_SIZE,
  MAX_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_FONT_SIZE,
  getTerminalFontSize,
  setTerminalFontSize,
  useTerminalFontSize
} from './terminalFontSize';
import { useAppTheme } from '@/design/theme';
import { useStore } from '@/store/store';
import { xtermTheme } from '@/design/surfaceTheme';

// Zoom lives in ./terminalFontSize so anything outside the terminal (the message
// composer) can scale with it too; these aliases keep the call sites below short.
const DEFAULT_FONT_SIZE = DEFAULT_TERMINAL_FONT_SIZE;
const MIN_FONT_SIZE = MIN_TERMINAL_FONT_SIZE;
const MAX_FONT_SIZE = MAX_TERMINAL_FONT_SIZE;

// One per pty, outside the component, so a view that remounts mid drag does
// not lose the size it was settling.
const resizeCoalescers = new Map<string, PtyResizeCoalescer>();
function resizeCoalescerFor(ptyId: string): PtyResizeCoalescer {
  let c = resizeCoalescers.get(ptyId);
  if (!c) {
    c = createPtyResizeCoalescer((g) => { window.cth.resizePty(ptyId, g.cols, g.rows); });
    resizeCoalescers.set(ptyId, c);
  }
  return c;
}

/** Is the person scrolled up, reading history, rather than at the newest
 *  output? A tab that comes back keeps that place. */
function readingHistory(term: { buffer: { active: { viewportY: number; baseY: number } } }): boolean {
  try {
    const buf = term.buffer.active;
    return buf.viewportY < buf.baseY;
  } catch {
    return false;
  }
}

// v0.3.4: the terminal follows the APP-WIDE theme (design/theme.ts, toggled in
// the title bar) instead of keeping its own light/dark switch — one theme for
// chrome, terminal, and (via config.terminalTheme) each agent's TUI palette.
type PtyTheme = 'light' | 'dark';

const zoomBtnStyle: CSSProperties = {
  width: 18,
  height: 18,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--cth-font-ui)',
  fontSize: 12,
  lineHeight: 1,
  color: 'var(--cth-ink-700)',
  background: 'var(--cth-paper-100)',
  border: '1px solid var(--cth-ink-300)',
  cursor: 'pointer',
  padding: 0
};

// The palette now comes from design/surfaceTheme.ts. The two hand-maintained
// literal maps that used to live here are gone: the surface half is READ back off
// the resolved --cth-* tokens, so it is correct for both themes and cannot drift
// from tokens.css again. The sixteen ANSI slots stay a table, keyed by theme.

export interface PtyTerminalViewProps {
  ptyId: string;
  /** Forwarded to the renderer-side onData hook so the parent can also tap
   *  the stream for regex parsing (avatar state inference). */
  onStreamData?: (chunk: string) => void;
  /** Fires with the trimmed text whenever the user submits a line (Enter). */
  onUserPrompt?: (text: string) => void;
  /** When provided, render an expand/minimize button in the header. */
  onToggleFullscreen?: () => void;
  fullscreen?: boolean;
  /** Edge-to-edge mode for the sidebar tab: no outer chrome/border. */
  embedded?: boolean;
  /** The agent's engine. Only Grok changes anything: see ansiForProvider. */
  provider?: string;
  /** False while the view sits under a tab that is not shown. The
   *  terminal then leaves the page: no renderer, nothing painted. The view stays
   *  mounted, so its stream taps stay as they are; true again puts it back at once, painted. */
  shown?: boolean;
}

/** Nothing from the program yet. A resume of a long session can take minutes to print its first byte, and
 *  until then the pane was blank (the founder's RC4). Read from the terminal itself: nothing held for the grid, and
 *  the screen untouched (no history, the cursor home, the first row empty). */
export function noOutputYet(entry: TerminalEntry): boolean {
  if (entry.exited || (entry.held?.length ?? 0) > 0) return false;
  const b = entry.term.buffer?.active;
  if (!b || b.baseY > 0 || b.cursorX > 0 || b.cursorY > 0) return false;
  const first = b.getLine?.(0);
  return !first || first.translateToString(true) === '';
}

export function PtyTerminalView({ ptyId, onStreamData, onUserPrompt, onToggleFullscreen, fullscreen, embedded, provider, shown = true }: PtyTerminalViewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onStreamDataRef = useRef(onStreamData);
  onStreamDataRef.current = onStreamData;
  const onUserPromptRef = useRef(onUserPrompt);
  onUserPromptRef.current = onUserPrompt;
  const fontSize = useTerminalFontSize();
  const fontSizeRef = useRef(fontSize);
  // I2: the engine CLI is not installed; the card sits over the grid until the
  // person presses its button and the installer (or the CLI) paints below.
  const cliMissing = useCliMissing(ptyId);
  // R3 (P8): a hive Codex start held until the person allows the folder's own Codex settings.
  const codexCard = useCodexCard(ptyId);
  const heldAgentName = useStore((s) => s.agents.find((a) => a.ptyId === ptyId)?.name ?? '');
  const login = useCliLogin(ptyId);
  const ptyTheme: PtyTheme = useAppTheme();
  // Rebuilt whenever the theme moves. xterm cannot read CSS, so this is read
  // from the resolved tokens at the moment it is needed, after theme.ts has
  // stamped <html>, which it does synchronously before notifying.
  const termTheme = xtermTheme(ptyTheme, provider);
  const ptyThemeRef = useRef(ptyTheme);
  ptyThemeRef.current = ptyTheme;
  // The attach effect runs on [ptyId] only, so it needs the CURRENT theme
  // without taking it as a dependency, otherwise every theme flip
  // would tear the terminal down and re-attach it, losing scrollback position.
  const termThemeRef = useRef(termTheme);
  termThemeRef.current = termTheme;
  /** The pty this mount has already put on screen: showing it again is a tab
   *  coming back, not a new view. */
  const shownBefore = useRef<string | null>(null);
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const { t } = useTranslation();
  // "Starting <name>'s session…" over a pane whose program has printed nothing yet, gone at its first output.
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    const entry = acquireTerminal(ptyId, termThemeRef.current, fontSizeRef.current);
    const quiet = noOutputYet(entry);
    setStarting(quiet);
    if (!quiet || typeof entry.term.onWriteParsed !== 'function') return;
    const first = entry.term.onWriteParsed(() => { setStarting(false); first.dispose(); });
    return () => { first.dispose(); };
  }, [ptyId]);

  // The stream taps belong to the mounted view, shown or not: the agent
  // screen's parser reads every chunk while its Inbox tab is up.
  useEffect(() => {
    const entry = acquireTerminal(ptyId, termThemeRef.current, fontSizeRef.current);
    const onData = (chunk: string) => onStreamDataRef.current?.(chunk);
    const onPrompt = (text: string) => onUserPromptRef.current?.(text);
    entry.onData = onData;
    entry.onPrompt = onPrompt;
    return () => {
      if (entry.onData === onData) entry.onData = undefined;
      if (entry.onPrompt === onPrompt) entry.onPrompt = undefined;
    };
  }, [ptyId]);

  // Attach this view to the pty's persistent terminal. The terminal and its
  // buffer live in the pool across mounts, so re-parenting its host element
  // here shows the already-rendered content immediately — no blank pane while
  // switching agents or toggling fullscreen.
  //
  // Only while shown. Under a hidden tab the host was kept on the
  // page under visibility: hidden with its WebGL renderer, and xterm paints
  // whatever is on the page: a hidden terminal drew every chunk its agent
  // printed. Off the page xterm pauses its renderer and the lease is released;
  // the buffer, the scrollback and the stream are untouched.
  useEffect(() => {
    const container = hostRef.current;
    if (!container || !shown) return;
    const entry = acquireTerminal(ptyId, termThemeRef.current, fontSizeRef.current);
    // A tab coming back keeps the person's place in the history; anything
    // else lands on the newest output, as before.
    const back = shownBefore.current === ptyId;
    shownBefore.current = ptyId;
    entry.term.options.theme = termThemeRef.current;
    entry.term.options.fontSize = fontSizeRef.current;
    attachTerminal(entry, container);
    const firstPlace = back && readingHistory(entry.term) ? 'keep' : 'end';

    // Snap to bottom immediately on re-attach before fit settles
    if (firstPlace === 'end') {
      try { entry.term.scrollToBottom(); } catch { /* not yet open */ }
    }

    // `place` is 'end' only for the initial attach (switching agents /
    // toggling fullscreen) so we land on the most recent output. Re-parenting
    // the pooled terminal resets its viewport to the top otherwise. A tab
    // coming back to someone reading history passes 'keep', which
    // re-syncs the viewport at that place. Later resize-driven fits pass false
    // so they don't yank a user who has scrolled up back down to the bottom.
    // Tracks the first fit that actually ran against a real (non-zero) host, so
    // the ResizeObserver below can snap to the bottom on the FIRST effective fit
    // even when the initial rAF/timeout fits no-op (terminal mounted under an
    // inactive tab whose host has no size yet).
    let initialFitDone = false;
    const tryFit = (place: 'end' | 'keep' | false = false) => {
      // Never fit while the host has no real size. Fitting a 0×0 host makes
      // xterm propose a tiny grid and resize the pty to it, so the boot banner
      // renders oversized/clipped and only "fixes" on a later manual resize.
      // Wait for real dimensions — the ResizeObserver drives the first fit.
      if (!container.clientWidth || !container.clientHeight) return;
      try {
        const before = { cols: entry.term.cols, rows: entry.term.rows };
        entry.fit.fit();
        // Only poke the pty when the grid ACTUALLY changed: every resize makes
        // the Claude TUI repaint its whole screen, and each repaint pushes the
        // previous frame into scrollback — the attach-time refit cascade (rAF,
        // 60ms, 240ms, font-load) used to stack the boot banner three times
        // before the user ever typed anything. The FIRST real fit is always
        // sent, changed or not: the pty may have been spawned (or respawned
        // under the same id) at a placeholder grid since this xterm was last
        // measured, and main keeps the ask for a pty that is not there yet
        // (PtyManager.resize), so the process starts at the pane's true width
        // (0.5.3, founder 24 Sep: Claude Code drawn at 70% of the pane).
        // Later changes are settled first (ptyResizeCoalescer.ts): a drag or
        // the box under the terminal growing and shrinking would otherwise
        // make Codex draw its whole conversation again on every tick.
        const resizes = resizeCoalescerFor(ptyId);
        if (!initialFitDone) {
          resizes.cancel();
          window.cth.resizePty(ptyId, entry.term.cols, entry.term.rows);
        } else if (entry.term.cols !== before.cols || entry.term.rows !== before.rows) {
          resizes.request(before, { cols: entry.term.cols, rows: entry.term.rows });
        }
        entry.term.refresh(0, Math.max(0, entry.term.rows - 1));
        initialFitDone = true;
      } catch { /* host may not be sized yet */ }
      if (place === 'keep') {
        // The same re-sync as below without moving: one line down and back.
        // Taken only while reading history, so there is a line below.
        try { entry.term.scrollLines(1); entry.term.scrollLines(-1); } catch { /* noop */ }
      } else if (place === 'end') {
        try {
          // Re-parenting the pooled terminal resets the DOM viewport's
          // scrollTop to 0 while xterm's internal scroll state stays at the
          // bottom — the screen still LOOKS right, but the user's first wheel
          // reads the stale scrollTop≈0 and yanks the view to the top of
          // history. A bare scrollToBottom() can't repair this (the buffer is
          // already at the bottom internally → no state change → no viewport
          // re-sync). Writing the DOM scrollTop from out here is no good
          // either: it races with xterm's ignore-next-scroll-event flag
          // (scroll events coalesce), which can leave the scrollbar pinned at
          // max while the buffer sits ABOVE the bottom — then wheeling down is
          // dead (scrollTop can't exceed max → no event → no re-sync).
          // Instead force a REAL position change through xterm's own state
          // machine: one line up, then back to the bottom. Its Viewport then
          // re-syncs the DOM scrollTop itself, atomically with its flag.
          entry.term.scrollLines(-1);
          entry.term.scrollToBottom();
        } catch { /* noop */ }
      }
    };
    // Fit once layout has settled and again once the web font has loaded —
    // these are the initial-attach fits, so snap to the bottom. They no-op
    // until the host has a real size, so a terminal mounted under an inactive
    // tab simply waits for the ResizeObserver below to fire the first fit.
    requestAnimationFrame(() => requestAnimationFrame(() => tryFit(firstPlace)));
    const retries = [setTimeout(() => tryFit(firstPlace), 60), setTimeout(() => tryFit(firstPlace), 240)];
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          // xterm measures the character cell ONCE at open(); if VT323 hadn't
          // loaded yet, that cached cell is the fallback font's size, so every
          // fit() proposes the wrong column count and the WebGL glyph atlas is
          // rastered at the wrong metrics — the banner renders oversized until a
          // manual resize. Re-applying the font + clearing the texture atlas
          // forces a re-measure / re-raster with the real font, then we refit.
          try {
            const fam = entry.term.options.fontFamily;
            entry.term.options.fontFamily = fam;
            entry.term.options.fontSize = fontSizeRef.current;
            entry.term.clearTextureAtlas?.();
          } catch { /* noop */ }
          tryFit(firstPlace);
        })
        .catch(() => { /* noop */ });
    }

    // The ResizeObserver is the authoritative trigger: it fires when the host
    // first gets a real size (e.g. its tab becomes visible) and on every later
    // resize. Snap to the bottom on the first effective fit, then never again
    // (so a user who scrolled up to read history isn't yanked back down).
    const ro = new ResizeObserver(() => tryFit(initialFitDone ? false : firstPlace));
    ro.observe(container);
    const onWinResize = () => tryFit(false);
    window.addEventListener('resize', onWinResize);

    // Self-heal after a display wake. Closing the laptop lid sleeps the GPU,
    // which loses the WebGL context and leaves xterm's cached cell-height (and
    // the viewport scroll-area derived from it) stale — the full buffer is still
    // there but only part is scrollable until a re-measure (the user otherwise
    // has to zoom to force a fit). The ResizeObserver/resize listeners DON'T fire
    // on lid-open because the window's pixel size is unchanged, so we re-fit
    // explicitly when the page becomes visible / regains focus. reflowTerminal
    // re-measures + refits WITHOUT scrolling, so a user reading history isn't
    // yanked to the bottom. rAF lets the waking layout settle first; if the host
    // is still unsized the reflow no-ops and the next focus/visibility catches it.
    const onWake = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      requestAnimationFrame(() => reflowTerminal(ptyId));
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);

    return () => {
      retries.forEach(clearTimeout);
      // A settled size still pending reaches the pty now, not never; then the
      // entry goes, so the map does not keep one per pty for the app's life.
      resizeCoalescers.get(ptyId)?.flush();
      resizeCoalescers.delete(ptyId);
      ro.disconnect();
      window.removeEventListener('resize', onWinResize);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      // Detach (but DON'T dispose) the terminal — it keeps running in the pool.
      // detachTerminal also releases the WebGL lease, so a terminal nobody is
      // looking at stops holding a GPU context that an on-screen one needs.
      detachTerminal(entry, container);
    };
  }, [ptyId, shown]);

  // Apply theme changes to the pooled terminal (persistence lives in
  // design/theme.ts; the title bar toggle owns it).
  useEffect(() => {
    acquireTerminal(ptyId, termTheme, fontSizeRef.current).term.options.theme = termTheme;
  }, [ptyTheme, ptyId, provider]);

  // Apply font-size (zoom) changes to the pooled terminal and re-fit cols/rows.
  useEffect(() => {
    fontSizeRef.current = fontSize;
    // Hidden: the terminal is off the page, so a fit measures
    // nothing and the grid it would send is whatever the terminal last had (a
    // terminal never opened has xterm's 80 by 24). Showing it applies this size
    // and fits it.
    if (!shownRef.current) return;
    const entry = acquireTerminal(ptyId, termThemeRef.current, fontSize);
    entry.term.options.fontSize = fontSize;
    // An unsized host fits to 2 by 1; the ResizeObserver above fits it for
    // real once it has a size, so never send that grid to the pty.
    const host = hostRef.current;
    if (!host || !host.clientWidth || !host.clientHeight) return;
    try {
      entry.fit.fit();
      // The zoom's grid is the newest: a drag or queue change still settling
      // would otherwise reach the pty after it with an older size.
      resizeCoalescers.get(ptyId)?.cancel();
      window.cth.resizePty(ptyId, entry.term.cols, entry.term.rows);
    } catch { /* host may not be sized yet */ }
  }, [fontSize, ptyId]);

  // Drag-and-drop a file (image, etc.) onto the terminal → inject its absolute
  // path into the pty, exactly like a native terminal's drag-drop. Claude Code
  // detects an image path in the prompt and attaches it. Without this, Electron
  // would treat the drop as navigation and load the file:// URL over the app.
  const onDragOver = (e: React.DragEvent) => {
    // Must preventDefault on dragover too — otherwise `drop` never fires and the
    // window navigates to the dropped file. Only claim it when files are present
    // so text/selection drags fall through to xterm's own handling.
    if (e.dataTransfer?.types?.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };
  const onDrop = (e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length === 0) return; // not a file drop — let xterm handle it
    e.preventDefault();
    const paths = files
      .map((f) => window.cth.pathForFile(f))
      .filter(Boolean)
      // SECURITY: a dropped filename is attacker-controllable; inject it as an
      // INERT single shell token in the NATIVE backslash-escaped style (what macOS
      // Terminal/iTerm emit on drag-drop, and the format Claude Code recognizes to
      // attach a dropped file). (1) Strip ALL control chars first - newline/CR
      // would be delivered as Enter by writePty and AUTO-SUBMIT the line; ESC would
      // inject raw terminal escape sequences. (2) Backslash-escape the backslash
      // itself and every shell metacharacter that could act on Enter (space $ ` " '
      // ; | & < > ( ) { } [ ] * ? ! ~ #) so the path stays one literal token.
      // (String.fromCharCode keeps backslashes/control chars out of this source.)
      .map((p) => {
        const BS = String.fromCharCode(92);
        const CTRL = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + ']', 'g');
        // Backslash is FIRST in the set so escaping each ORIGINAL char exactly once
        // turns a literal backslash into a pair (never forming a new escape).
        const SPECIAL = new Set(
          (BS + ' $' + String.fromCharCode(96) + String.fromCharCode(34) + String.fromCharCode(39) + ';|&<>(){}[]*?!~#')
            .split('').map((c) => c.charCodeAt(0))
        );
        return p.replace(CTRL, '').split('')
          .map((ch) => (SPECIAL.has(ch.charCodeAt(0)) ? BS + ch : ch)).join('');
      });
    if (paths.length === 0) return;
    // Trailing space separates consecutive drops and lets the user keep typing.
    void window.cth.writePty(ptyId, paths.join(' ') + ' ');
  };

  const zoom = (delta: number) => setTerminalFontSize(getTerminalFontSize() + delta);
  const resetZoom = () => setTerminalFontSize(DEFAULT_FONT_SIZE);

  // Keyboard zoom: Cmd/Ctrl + '=' / '-' / '0'
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); zoom(1); }
      else if (e.key === '-' || e.key === '_') { e.preventDefault(); zoom(-1); }
      else if (e.key === '0') { e.preventDefault(); resetZoom(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{
      background: 'var(--cth-paper-100)',
      boxShadow: embedded ? 'none' : 'var(--cth-panel-border-terminal)',
      padding: embedded ? 0 : 8,
      height: '100%',
      width: '100%',
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontFamily: 'var(--cth-font-ui)',
        fontSize: 12,
        color: 'var(--cth-ink-500)',
        borderBottom: '1px dashed var(--cth-ink-300)',
        paddingBottom: 4,
        marginBottom: 4,
        paddingLeft: embedded ? 8 : 0,
        paddingRight: embedded ? 8 : 0,
        paddingTop: embedded ? 6 : 0
      }}>
        <span style={{
          width: 8, height: 8, background: 'var(--cth-mint)',
          boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
          animation: 'cth-pulse 1200ms steps(2, end) infinite'
        }} />
        live · pty {ptyId}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* v0.3.4: the theme + enter-fullscreen buttons moved to the TITLE BAR
              (top right) — more accessible, and the theme now darkens the whole
              app. Only the EXIT affordance stays here, in fullscreen. */}
          <button
            onClick={() => zoom(-1)}
            disabled={fontSize <= MIN_FONT_SIZE}
            title="Zoom out (Cmd -)"
            style={zoomBtnStyle}
          >−</button>
          <button
            onClick={resetZoom}
            title="Reset zoom (Cmd 0)"
            style={{ ...zoomBtnStyle, width: 'auto', padding: '0 4px', minWidth: 28 }}
          >{fontSize}px</button>
          <button
            onClick={() => zoom(1)}
            disabled={fontSize >= MAX_FONT_SIZE}
            title="Zoom in (Cmd +)"
            style={zoomBtnStyle}
          >+</button>
          {fullscreen && onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title="Exit focus mode (Esc)"
              style={{ ...zoomBtnStyle, width: 22, height: 22, marginLeft: 4 }}
            >
              <Icon name="minimize" />
            </button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div ref={hostRef} onDragOver={onDragOver} onDrop={onDrop} style={{
          flex: 1, minHeight: 0,
          padding: embedded ? '0 8px 8px' : 0
        }} />
        {starting && heldAgentName && !cliMissing && !login && (
          <div data-terminal-starting style={{
            position: 'absolute', top: embedded ? 6 : 2, insetInlineStart: embedded ? 12 : 4, pointerEvents: 'none',
            fontFamily: 'var(--cth-font-mono)', fontSize: 12.5, lineHeight: '18px', color: 'var(--cth-ink-500)'
          }}>{t('terminal.starting', { name: heldAgentName })}</div>
        )}
        {cliMissing && <CliMissingCard ptyId={ptyId} state={cliMissing} />}
        {!cliMissing && codexCard.state && <CodexFolderCard ptyId={ptyId} agentName={heldAgentName} state={codexCard.state} onAllow={codexCard.keep} onStarted={codexCard.drop} onNotNow={codexCard.drop} />}
        {!cliMissing && login && <CliLoginModal ptyId={ptyId} prompt={login} />}
        {!cliMissing && !login && <SleepOverlay ptyId={ptyId} />}
      </div>
    </div>
  );
}
