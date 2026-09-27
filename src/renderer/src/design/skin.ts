/**
 * App-wide SKIN (Teams) — the second axis beside light/dark.
 *
 * `theme.ts` answers "light or dark". This answers "Office or Professional",
 * and the two are independent: all four combinations are valid and each is
 * remembered separately.
 *
 * The renderer is styled entirely through the `--cth-*` tokens, so a skin is a
 * token swap exactly like the theme is: this module stamps `data-cth-skin` on
 * <html> and tokens.css carries the Professional overrides, keyed on
 * `:root[data-cth-skin='professional']` and, for the dark pairing,
 * `:root[data-cth-skin='professional'][data-cth-theme='dark']`.
 *
 * THE RULE THAT MAKES THIS CHEAP: a skin swaps token VALUES, never token NAMES.
 * `--cth-cream-100` is still the default panel fill in Professional, it is just
 * a different colour. Rename one token and every component that reads it breaks,
 * which is the difference between a week of work and a rewrite.
 *
 * PRO (`professional`) IS THE DEFAULT since 2 Sep 2026 (founder ruling). A
 * stored choice still wins: an install that picked Classic keeps Classic, and
 * nobody is migrated by a build. In the UI the two values are called Classic
 * and PRO; the stored strings stay `office` / `professional` so no install's
 * saved preference changes meaning.
 *
 * Shared subscribable module — the same pattern as theme.ts, deliberately its
 * sibling and not its replacement: components read it with `useAppSkin()`.
 */
import { useSyncExternalStore } from 'react';

export type AppSkin = 'office' | 'professional';

const LS_KEY = 'cth.skin';
/** The DEFAULT VIEW (0.4.11, founder 6 Sep 2026: "a setting in the general
 *  part of the settings that allows users to set a default view, Classic or
 *  PRO, available just for PRO users"). It is the view the office OPENS in.
 *  The titlebar switch still changes the view for the session and stays the
 *  one writer of `cth.skin`; this key is a boot cache of `config.defaultView`,
 *  which App.tsx mirrors here whenever the config changes, so `load()` can
 *  answer before the config has arrived and the first paint is already right. */
const LS_DEFAULT_KEY = 'cth.skin.default';

function loadDefault(): AppSkin | null {
  try {
    const v = window.localStorage.getItem(LS_DEFAULT_KEY);
    if (v === 'office' || v === 'professional') return v;
  } catch { /* noop */ }
  return null;
}

function load(): AppSkin {
  // A set default view wins at launch over the view last used.
  const preset = loadDefault();
  if (preset) return preset;
  try {
    const v = window.localStorage.getItem(LS_KEY);
    if (v === 'office' || v === 'professional') return v;
  } catch { /* noop */ }
  return 'professional';
}

let skin: AppSkin = load();
let defaultSkin: AppSkin | null = loadDefault();
const subscribers = new Set<() => void>();
const defaultSubscribers = new Set<() => void>();

export function defaultAppSkin(): AppSkin | null {
  return defaultSkin;
}

/** Record the view the office opens in. Deliberately does NOT change the
 *  current view: the switch in the titlebar owns that. */
export function setDefaultAppSkin(next: AppSkin | null): void {
  if (next === defaultSkin) return;
  defaultSkin = next;
  try {
    if (next) window.localStorage.setItem(LS_DEFAULT_KEY, next);
    else window.localStorage.removeItem(LS_DEFAULT_KEY);
  } catch { /* noop */ }
  defaultSubscribers.forEach((fn) => fn());
}

export function useDefaultAppSkin(): AppSkin | null {
  return useSyncExternalStore(
    (onChange) => {
      defaultSubscribers.add(onChange);
      return () => defaultSubscribers.delete(onChange);
    },
    () => defaultSkin
  );
}

function apply(): void {
  try { document.documentElement.dataset.cthSkin = skin; } catch { /* SSR/tests */ }
}
apply();

export function appSkin(): AppSkin {
  return skin;
}

export function setAppSkin(next: AppSkin): void {
  if (next === skin) return;
  skin = next;
  try { window.localStorage.setItem(LS_KEY, next); } catch { /* noop */ }
  apply();
  subscribers.forEach((fn) => fn());
}

export function toggleAppSkin(): AppSkin {
  const next: AppSkin = skin === 'professional' ? 'office' : 'professional';
  setAppSkin(next);
  return next;
}

export function useAppSkin(): AppSkin {
  return useSyncExternalStore(
    (onChange) => {
      subscribers.add(onChange);
      return () => subscribers.delete(onChange);
    },
    () => skin
  );
}
