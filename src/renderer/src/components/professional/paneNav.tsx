/**
 * PANE-TO-PANE NAVIGATION.
 *
 * Section 7's layout shows ONE pane at a time and the rail is what changes it.
 * That was enough while every pane was a leaf, and it stopped being enough the
 * moment the Teams surface landed: the roster (D7) opens a teammate drawer (D8)
 * which offers "message them", and that is D11, WHICH IS ITS OWN PANE. A pane
 * asking for another pane had no way to ask — `setPane` is local state inside
 * ProfessionalLayout and `onSelect` reaches rail rows only — so D11 could be
 * rendered and could not be reached.
 *
 * The fix is a context rather than more props, for one reason: `extraPanes` is
 * `Record<string, ReactNode>`, so the nodes are CREATED in App.tsx, outside the
 * layout. Props would have to be threaded from a place that does not own the
 * state. Context is read where the node is RENDERED, which is inside the
 * layout, so a pane three components deep can navigate without anything above
 * it knowing that it can.
 *
 * IT THROWS WHEN THERE IS NO PROVIDER, and that is deliberate. The failure this
 * exists to prevent is a navigation that silently does nothing — exactly the
 * defect above, reintroduced quietly. A missing provider is a wiring mistake and
 * should be loud at first render, not a dead button someone reports in a month.
 * The preview harness renders these components outside the layout on purpose, so
 * it supplies its own provider.
 */
import { createContext, useContext } from 'react';
import type { PaneId } from './railState';

export interface PaneNav {
  /** The pane showing right now. */
  readonly current: PaneId;
  /** Show another pane. Same ids the rail and `extraPanes` are keyed by. */
  go(pane: PaneId): void;
}

const PaneNavContext = createContext<PaneNav | null>(null);

export const PaneNavProvider = PaneNavContext.Provider;
/** The same nav, or null outside a provider: for a control that lives in
 *  both skins (Settings is a Classic modal too) and simply hides its link
 *  where there is no pane to go to. */
export function useOptionalPaneNav(): PaneNav | null {
  return useContext(PaneNavContext);
}

export function usePaneNav(): PaneNav {
  const nav = useContext(PaneNavContext);
  if (!nav) {
    throw new Error(
      'usePaneNav() outside a PaneNavProvider. A pane tried to navigate and ' +
      'nothing was listening, which would have been a button that does nothing. ' +
      'Render this inside ProfessionalLayout, or supply a provider (the preview ' +
      'harness does).'
    );
  }
  return nav;
}
