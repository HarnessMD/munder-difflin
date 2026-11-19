/**
 * THE START LOADER STAYS UP UNTIL THE APP HAS ITS DATA.
 *
 * The loader ("booting the hive…", #cth-splash in index.html) sat inside #root, so React's
 * first render replaced it, long before any screen had data: the founder's RC4 opened on the
 * orchestrator's screen with a blank terminal and a grey Session dot. Now main.tsx lifts it out
 * of #root before that render (holdBootSplash), over everything, and it leaves once, when the
 * first of these happens:
 *   - the shell's gate says its first data is in (BootSplashGate, App.tsx), or
 *   - App draws a door instead of the shell (the onboarding, the hive picker): a door has what
 *     it needs to draw, or
 *   - the root's crash box is drawn (RootBoundary), or
 *   - the ceiling, 10 s after the page started, so it never hangs: the app shows as before.
 * It fades out after the frame under it has painted, so the empty app never flashes.
 *
 * THE SHELL'S FIRST DATA, four one way facts (noteSplashFact), fed by BootSplashGate.tsx and the screens:
 *   roster        the agent list: roster.json (read when the store loads) reconciled with the terminals main has
 *                 running (App's listPtys read; store/bootGate.ts markReconciled)
 *   orchestrator  the orchestrator's row is up: his name read from the registry and his terminal found running or
 *                 started (godStatus has left 'booting'). His program printing is NOT waited for: a resume of a
 *                 long session prints minutes later, and his terminal says it is starting instead of a blank pane
 *   board         the first read of the task ledger (tasks.json, the board's cards in the sidebar) landed or failed
 *   screen        the shell is up (noted by BootSplashGate at once)
 *
 * The markup, its words and the brand logo swap in main.tsx are unchanged; only where the
 * element lives and how it leaves.
 */

/** No start waits longer than this for its data; then the app shows as it is. */
export const SPLASH_CEILING_MS = 10_000;
/** How long the fade takes. */
export const SPLASH_FADE_MS = 220;
/** Above every layer the app draws (the highest is 1000). */
const SPLASH_Z = '100000';

export type SplashRelease = 'ready' | 'door' | 'error' | 'ceiling';
export type SplashFact = 'roster' | 'orchestrator' | 'board' | 'screen';
export const SPLASH_FACTS: readonly SplashFact[] = ['roster', 'orchestrator', 'board', 'screen'];

let el: HTMLElement | null = null;
let releasedBy: SplashRelease | null = null;
let ceiling: ReturnType<typeof setTimeout> | null = null;
let watch: MutationObserver | null = null;
/** Blank holds on screen now (App's waits for its records: nothing to show yet). */
let holds = 0;
/** The shell is on screen and its gate decides. */
let shellClaimed = false;
const facts = new Set<SplashFact>();

/** main.tsx, before React's first render: take the loader out of #root, so the render does not
 *  replace it, put it over the window, and start the ceiling. */
export function holdBootSplash(doc: Document = document, ceilingMs = SPLASH_CEILING_MS): void {
  if (el || releasedBy) return;
  const splash = doc.getElementById('cth-splash');
  if (!splash) return;
  el = splash;
  splash.style.zIndex = SPLASH_Z;
  doc.body.appendChild(splash);
  ceiling = setTimeout(() => releaseBootSplash('ceiling'), ceilingMs);
  // The root's crash box ("Reload the window") must not wait under the loader.
  const root = doc.getElementById('root');
  const MO = (doc.defaultView as (Window & typeof globalThis) | null)?.MutationObserver;
  if (root && MO) {
    watch = new MO(() => { if (root.querySelector('[data-error-boundary="app"]')) releaseBootSplash('error'); });
    watch.observe(root, { childList: true, subtree: true });
  }
}

/** Take the loader away, once. It fades after two animation frames, so what is under it has
 *  painted first. */
export function releaseBootSplash(why: SplashRelease): void {
  if (!el || releasedBy) return;
  releasedBy = why;
  if (ceiling !== null) { clearTimeout(ceiling); ceiling = null; }
  watch?.disconnect();
  watch = null;
  const splash = el;
  const win = splash.ownerDocument.defaultView;
  const frame = (fn: () => void): void => {
    if (win && typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(() => fn());
    else setTimeout(fn, 16);
  };
  const still = !!win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  frame(() => frame(() => {
    splash.style.pointerEvents = 'none';
    if (still) { splash.remove(); return; }
    splash.style.transition = `opacity ${SPLASH_FADE_MS}ms ease-out`;
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), SPLASH_FADE_MS + 40);
  }));
}

/** Why the loader left; null while it is up (or was never held). */
export function bootSplashReleasedBy(): SplashRelease | null {
  return releasedBy;
}

/** Whether the loader is still over the window. */
export function bootSplashHeld(): boolean {
  return !!el && !releasedBy;
}

/** A blank hold came on screen (App is still waiting for its records). */
export function holdForRecords(): () => void {
  holds++;
  return () => { holds--; };
}

/** The shell came on screen: from here its gate decides. */
export function claimForShell(): void {
  shellClaimed = true;
  releaseIfReady();
}

/** One of the shell's first data is in. Kept from before the shell is up, so a fact that came early counts. */
export function noteSplashFact(fact: SplashFact): void {
  if (facts.has(fact)) return;
  facts.add(fact);
  releaseIfReady();
}

/** The facts still missing, for a test or a look in the console. */
export function splashWaitingFor(): SplashFact[] {
  return SPLASH_FACTS.filter((f) => !facts.has(f));
}

function releaseIfReady(): void {
  if (shellClaimed && splashWaitingFor().length === 0) releaseBootSplash('ready');
}

/** App, after each commit: with no blank hold and no shell on screen, App is drawing a door,
 *  which has its data, so the loader goes. Children's layout effects have run by then. */
export function releaseIfDoor(): void {
  if (!bootSplashHeld() || holds > 0 || shellClaimed) return;
  releaseBootSplash('door');
}

/** Test seam. Nothing in the app calls this. */
export function _resetBootSplashForTests(): void {
  if (ceiling !== null) clearTimeout(ceiling);
  watch?.disconnect();
  el = null;
  releasedBy = null;
  ceiling = null;
  watch = null;
  holds = 0;
  shellClaimed = false;
  facts.clear();
}
