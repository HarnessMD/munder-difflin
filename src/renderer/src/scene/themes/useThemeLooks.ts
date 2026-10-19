// Ported from Prozzta/guppyos 02d0d50b (MIT).
import { useEffect, useState } from 'react';
import { OFFICE_THEME_ID } from './manifest';
import { loadThemeLooks, type ThemeLooks } from './themeCatalog';

/** The theme's looks: null for the office or an unusable pack (Office art is
 *  shown), undefined while a pack is still loading (nothing is shown yet, so
 *  a card never flashes the wrong character). */
export function useThemeLooks(themeId: string): ThemeLooks | null | undefined {
  const [state, setState] = useState<{ id: string; looks: ThemeLooks | null } | null>(null);
  useEffect(() => {
    let live = true;
    if (themeId === OFFICE_THEME_ID) return;
    loadThemeLooks(themeId).then((l) => { if (live) setState({ id: themeId, looks: l }); }, () => { if (live) setState({ id: themeId, looks: null }); });
    return () => { live = false; };
  }, [themeId]);
  if (themeId === OFFICE_THEME_ID) return null;
  return state && state.id === themeId ? state.looks : undefined;
}
