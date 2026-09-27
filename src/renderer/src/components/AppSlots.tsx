/**
 * THE TWO APP-LEVEL SLOTS.
 *
 * The rail solved company-wide NAVIGATION. What it does not solve is a surface
 * that has to outlive pane selection, and three of the Teams screens are exactly
 * that: the connection chip (D12), the approval toast (D10) and the fingerprint
 * warning (D13) are properties of THIS MACHINE, not of whatever pane is open.
 *
 * Mounted per pane they would each be broken in the same way. A toast that only
 * renders while its own pane is selected is invisible exactly when it matters —
 * you are told an agent wants network access only if you were already looking at
 * the request queue. A key-change dialog that requires you to be on the roster is
 * not a security dialog, it is a decoration on a screen you were already reading.
 *
 * So: TWO SLOTS, NOT THREE FEATURES. Everything app-level goes through one of
 * them, and the rule about which is the whole of the API.
 *
 *   chrome  — persistent, small, lives in the title bar, never blocks anything.
 *   overlay — covers the app: modal (demands an answer) or transient (informs).
 *
 * Both render in BOTH SKINS. They sit above the skin switch on purpose: a key
 * change is not less urgent because you prefer the office floor.
 */
import type { ReactNode } from 'react';

/**
 * Persistent chrome. Sits in the title bar next to the window controls.
 *
 * `cth-titlebar-nodrag` is not optional — the title bar is a drag region, so
 * without it the chip is a button you cannot press, only drag the window by.
 */
export function AppChromeSlot({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <span
      className="cth-titlebar-nodrag"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      {children}
    </span>
  );
}

export interface AppOverlaySlotProps {
  /** Demands an answer before the app is usable. At most one, and it wins. */
  modal?: ReactNode;
  /**
   * Everything that informs and can be ignored, HIGHEST PRIORITY FIRST.
   *
   * Each one self-gates and renders null when it has nothing to say, exactly as
   * they all did when they mounted themselves. What they no longer do is choose
   * where they land.
   */
  transients?: ReactNode[];
}

/**
 * The app-level overlay layer.
 *
 * TWO RULES, AND THEY ARE WHY THIS IS A SLOT AND NOT A DIV. Both exist because
 * each surface only knows about itself, so neither rule could live in any of
 * them — it has to be decided in the one place that sees them all.
 *
 *   1. A MODAL OUTRANKS A TRANSIENT and suppresses every one of them. Two
 *      overlays racing is how a security dialog ends up under a toast about a
 *      network request.
 *
 *   2. TWO TRANSIENTS MAY NOT OCCUPY THE SAME PIXELS. Three of them anchored
 *      themselves to `right: 16, bottom: 16` independently — the approval toast,
 *      the update offer and the completion toast — so whichever had the higher
 *      z-index simply covered the others. They were not competing for attention,
 *      they were deleting each other.
 *
 * IT STACKS RATHER THAN SUPPRESSES, and that is a deliberate choice between the
 * two ways to satisfy rule 2. Suppression needs a priority, and a priority means
 * something is hidden — and an approval request CAN EXPIRE, so hiding it behind
 * a dismissible update offer loses it rather than delaying it. Stacked, nothing
 * is lost and the ordering only decides who is nearest the corner.
 *
 * Order is closest-to-corner first, which is the most reachable spot: the
 * approval (it expires), then the completion notice (it self-dismisses), then
 * the update offer (it waits indefinitely and costs nothing to reach late).
 *
 * `z-index: 900` puts the layer over Settings (300), the edit modal (500) and
 * the release drop (600), and under the quit warning (1000), which is the one
 * thing that should still be able to interrupt it.
 *
 * The layer itself does not take pointer events; what renders in it does (see
 * `.cth-app-overlay` in global.css). Without that split a corner toast would
 * arrive wrapped in a full-screen click eater and freeze the app while showing.
 *
 * FULL APP-WIDE TOAST STACKING — ordering by urgency, collapsing a backlog,
 * capping how many show at once — is separate work, carded as
 * `app-toast-stacking`. This is the interim rule that keeps them from covering
 * each other in the meantime, and it is where that work lands.
 */
export function AppOverlaySlot({ modal, transients }: AppOverlaySlotProps) {
  const shown = transients?.filter(Boolean) ?? [];
  if (!modal && shown.length === 0) return null;
  return (
    <div className="cth-app-overlay">
      {modal ?? <div className="cth-app-overlay-transients">{shown}</div>}
    </div>
  );
}
