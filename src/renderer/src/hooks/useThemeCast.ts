import { useState, useEffect } from 'react';
import { useStore } from '@/store/store';
import { getTheme, type ThemeCast } from '@/scene/office/themeRegistry';
import { loadTheme } from '@/scene/office/themeLoader';
import { CAST, DEFAULT_CHARACTER, type CastMember } from '@/scene/office/cast';

export interface CurrentCastInfo {
  themeId: string;
  cast: ThemeCast | null;
  roster: CastMember[];
  defaultCharacter: string;
}

/**
 * Returns the currently active theme's cast and roster, updating automatically
 * when officeTheme changes or when the theme finishes loading.
 */
export function useThemeCast(): CurrentCastInfo {
  const officeTheme = useStore((s) => s.officeTheme);
  const [cast, setCast] = useState<ThemeCast | null>(() => getTheme(officeTheme)?.cast ?? null);

  useEffect(() => {
    let cancelled = false;
    const existing = getTheme(officeTheme)?.cast;
    if (existing) {
      setCast(existing);
      return;
    }

    void loadTheme(officeTheme).then((theme) => {
      if (!cancelled && theme?.cast) {
        setCast(theme.cast);
      }
    }).catch(() => {
      // Fallback if load fails
      if (!cancelled) setCast(null);
    });

    return () => { cancelled = true; };
  }, [officeTheme]);

  const roster: CastMember[] = cast?.byName
    ? Object.values(cast.byName)
    : CAST;

  const defaultCharacter = cast?.defaultCharacter ?? DEFAULT_CHARACTER;

  return {
    themeId: officeTheme,
    cast,
    roster,
    defaultCharacter
  };
}
