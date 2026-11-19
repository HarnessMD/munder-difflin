/**
 * THE KIT'S WIRING. The Halloween micro interactions on moments the app
 * already has:
 *
 *    9  Ignite      Send is a candle: a wick on its top edge and a flame on
 *                   hover and focus;
 *   13  BooCopied   a ghost pops from behind a copy button;
 *   24  keycap and settle   a shortcut keycap presses, a sheet settles as
 *                   it opens;
 *   10  WebTick     strands spin out of a checkbox as it is ticked.
 *
 * Every export returns null, or its children untouched, unless the season
 * is Halloween, so the general look is byte for byte what it was. Nothing
 * here starts a timer or a frame loop: motion is CSS in kit.css, restarted
 * by a key or an attribute when something real happens, and nothing runs
 * while the app is idle (the one loop, the Send flame, is bound to the
 * pointer). The numbers are kitPlan.ts; the art is pieces/, which only
 * draws: every box that moves is one of this file's own wrappers, or a
 * piece's own part box that the piece's contract hands to the caller.
 */
import { useRef, type ReactNode } from 'react';
import { useSeason } from '@/design/season';
import { spun } from './kitPlan';
import { Flame, Ghost, WebStrands, Wick } from './pieces';
import './kit.css';

/** A hook wrapper with a plain name, so each export reads as one question. */
export function halloween(): boolean {
  return useSeason() === 'halloween';
}

/** The value a prop had on the last render, undefined on the first. */
function usePrev<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  const prev = ref.current;
  ref.current = value;
  return prev;
}

export function useKitOn(): boolean {
  return halloween();
}
/* ── 9, ignite ───────────────────────────────────────────────────────────── */
/** Children of the Send button, which carries `data-cth-ignite` and is
 *  positioned. Nothing with the season off. */
export function Ignite() {
  const on = halloween();
  if (!on) return null;
  return (
    <>
      <span className="cth-ki-wick"><Wick /></span>
      <span className="cth-ki-flame"><i className="cth-ki-fire"><Flame height={11} /></i></span>
    </>
  );
}

/* ── 13, boo ─────────────────────────────────────────────────────────────── */
/** A child of a copy button that is positioned and isolated (its own
 *  stacking context, so the ghost sits behind the label and in front of the
 *  page), mounted while `copied` is true. */
export function BooCopied() {
  const on = halloween();
  if (!on) return null;
  return <span className="cth-kg" aria-hidden><Ghost face="boo" size={16} /></span>;
}

/* ── 24, the summoning palette ───────────────────────────────────────────── */
/** Attributes for a shortcut keycap: it presses once each time `open` turns
 *  on. The caller keys the element by `open` so the press restarts. */
export function keycap(on: boolean, open: boolean): { 'data-cth-keycap'?: string } {
  if (!on) return {};
  return { 'data-cth-keycap': open ? '1' : '0' };
}
/** The class for a sheet or popover that settles as it opens. */
export function settle(on: boolean): string | undefined {
  return on ? 'cth-kk-sheet' : undefined;
}

/* ── 10, the web spun checkbox ───────────────────────────────────────────── */
/** Around a native checkbox: three strands spin out of its top left corner
 *  when it goes from unticked to ticked. The tick is the browser's own. */
export function WebTick({ on: ticked, children }: { on: boolean; children: ReactNode }) {
  const on = halloween();
  const prev = usePrev(ticked);
  const spins = useRef(0);
  if (spun(prev, ticked)) spins.current += 1;
  if (!on) return <>{children}</>;
  return (
    <span className="cth-kn">
      {children}
      {spins.current > 0 && ticked && <span key={spins.current} className="cth-kn-strands" aria-hidden><WebStrands size={18} /></span>}
    </span>
  );
}
