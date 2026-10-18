/**
 * SCENARIO — does this harness support the READS that C2.11 #14 requires?
 *
 * WHY THIS IS NOT #14 EVIDENCE, AND MUST NEVER BE CITED AS ANY. #14 is about a
 * weekly-blocked capacity strip: exactly one subordinate five-hour token, no meter
 * or progress semantics, no positive-capacity colour, an inseparable named blocker.
 * THAT COMPONENT DOES NOT EXIST - there is no capacity strip in the renderer, and
 * building one is L0-UI, which is held. So #14 cannot be observed by any harness
 * today, and the reason is the absent subject rather than a missing instrument.
 *
 * What this scenario does instead is prove the INSTRUMENT on a component that really
 * exists, so that when the strip is built the evidence is one scenario away rather
 * than an open question. Each read below is one of #14's, taken against the real
 * terminal surface:
 *   - DOM presence and cardinality
 *   - COMPUTED style, which needs a layout engine and is the reason jsdom was excluded
 *   - the ACCESSIBILITY TREE as the platform computes it, not the markup
 *   - a duplicate rendered-token scan over visible text
 *   - real RESPONSIVE behaviour, by resizing the real window
 */
import { acquireTerminal, attachTerminal, disposeTerminal } from '../../../src/renderer/src/components/terminalPool';

declare global {
  interface Window {
    __harnessRun: () => Promise<void>;
    harness: {
      report: (payload: unknown) => void;
      resize: (w: number, h: number) => Promise<{ size: [number, number] }>;
      axTree: () => Promise<Array<{ role: string | null; name: string | null; ignored: boolean }> | { error: string }>;
    };
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

/** Every visible token on screen, for the duplicate scan #14 asks for. */
function visibleTokens(root: HTMLElement): string[] {
  return (root.innerText || '').split(/\s+/u).filter(Boolean);
}

window.__harnessRun = async () => {
  const result: Record<string, unknown> = {};
  try {
    installBridgeStub();
    const root = document.getElementById('root')!;
    const entry = acquireTerminal('caps');
    attachTerminal(entry, root);
    await write(entry.term, 'REMAINING 42%\r\nblocked by Weekly\r\n');

    // ── DOM: presence and cardinality ─────────────────────────────────────────
    const screens = root.querySelectorAll('.xterm-screen');
    result.dom = {
      xtermMounted: root.querySelectorAll('.xterm').length,
      screens: screens.length,
      rows: root.querySelectorAll('.xterm-rows > div').length
    };

    // ── COMPUTED STYLE: a real layout engine, real px, real resolved colour ────
    // The FONT lives on `.xterm`, not on `.xterm-screen` - reading the wrong
    // element returns the document default and looks like a real answer.
    const screen = screens[0] as HTMLElement;
    const styled = root.querySelector('.xterm') as HTMLElement;
    const cs = getComputedStyle(styled);
    const box = screen.getBoundingClientRect();
    result.computedStyle = {
      fontFamily: cs.fontFamily,
      // Resolved to px by the engine rather than echoed back as authored.
      fontSizePx: cs.fontSize,
      colorIsResolvedRgb: /^rgb/u.test(getComputedStyle(root).color),
      laidOut: box.width > 0 && box.height > 0,
      width: Math.round(box.width)
    };

    // ── ACCESSIBILITY TREE, as the platform computes it ───────────────────────
    const ax = await window.harness.axTree();
    result.accessibility = Array.isArray(ax)
      ? { available: true, nodes: ax.length, roles: [...new Set(ax.map((n) => n.role).filter(Boolean))].slice(0, 12) }
      : { available: false, ...ax };

    // ── DUPLICATE RENDERED TOKEN SCAN, AND A TRAP WORTH RECORDING ─────────────
    // A scan over `innerText` returns NOTHING here, and not because there is
    // nothing on screen: xterm's WebGL renderer paints into a <canvas>, so the
    // rendered text is not in the DOM at all. A #14 duplicate-token scan written
    // against `innerText` would therefore report "no duplicates" for a canvas
    // surface however many times a token was actually drawn - a clean pass for the
    // wrong reason, which is the worst kind. Both sources are reported so the
    // difference is visible rather than inferred.
    const domTokens = visibleTokens(root);
    const axNames = Array.isArray(ax)
      ? ax.flatMap((n) => (n.name ? n.name.split(/\s+/u) : [])).filter(Boolean)
      : [];
    const tally = (list: string[]) => {
      const counts = new Map<string, number>();
      for (const t of list) counts.set(t, (counts.get(t) ?? 0) + 1);
      return counts;
    };
    const axCounts = tally(axNames);
    result.duplicateScan = {
      domTokens: domTokens.length,
      accessibleTokens: axNames.length,
      // The reading a #14 scan would actually use for a canvas surface.
      weeklyOccurrencesAccessible: axCounts.get('Weekly') ?? 0,
      domTextIsEmptyBecauseCanvas: domTokens.length === 0 && screens.length > 0
    };

    // ── RESPONSIVE: resize the REAL window and re-measure ─────────────────────
    const before = entry.term.cols;
    await window.harness.resize(520, 700);
    entry.fit.fit();
    const after = entry.term.cols;
    result.responsive = { colsAtFullWidth: before, colsAtMinWidth: after, reflowed: after < before };

    disposeTerminal('caps');
    window.harness.report({ ok: true, ...result });
  } catch (e) {
    window.harness.report({ ok: false, error: String((e as Error)?.stack || e), partial: result });
  }
};
