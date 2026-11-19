// The custom avatars the renderer currently knows about.
//
// A tiny module on purpose: the painter (portraitArt.ts) reads it to resolve a
// `custom:<id>` character into a recipe, castRoster.ts reads it to give that
// character a display name and an accent for the floor, and SpritePortrait
// subscribes so a portrait repaints when the avatar under it is edited. None of
// those callers should have to import the store, and the store must not import
// the painter, so the list lives here and everyone meets in the middle.
//
// Filled by the store's `setAvatars` (App mirrors config.avatars into it on
// load and on every config change). Never persisted from here.

import { type CustomAvatar, normalizeCustomAvatar } from '@shared/avatars';

let list: readonly CustomAvatar[] = [];
const byId = new Map<string, CustomAvatar>();
let version = 0;
const listeners = new Set<() => void>();

/** Replace the list. Anything that fails `normalizeCustomAvatar` is dropped,
 *  so a config written by a newer or a broken build cannot crash a picker.
 *  Returns what was kept. */
export function setCustomAvatars(next: unknown): readonly CustomAvatar[] {
  const clean: CustomAvatar[] = [];
  if (Array.isArray(next)) {
    for (const raw of next) {
      const a = normalizeCustomAvatar(raw);
      if (a && !clean.some((c) => c.id === a.id)) clean.push(a);
    }
  }
  list = clean;
  byId.clear();
  for (const a of clean) byId.set(a.id, a);
  version++;
  for (const l of listeners) l();
  return list;
}

export function customAvatars(): readonly CustomAvatar[] { return list; }

/** By bare id (no `custom:` prefix). */
export function getCustomAvatar(id: string): CustomAvatar | undefined { return byId.get(id); }

/** Bumps on every `setCustomAvatars`. The value `useSyncExternalStore` reads. */
export function avatarsVersion(): number { return version; }

export function subscribeAvatars(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
