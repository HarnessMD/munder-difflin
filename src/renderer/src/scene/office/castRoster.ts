// The Office cast — ROSTER METADATA ONLY. No pixi, no canvas, no sprite art.
//
// WHY THIS FILE EXISTS, SEPARATE FROM cast.ts. The roster (names, display names,
// shirt colours, blurbs, the default character) is part of the AGENT MODEL: the
// store, useHive and the add/edit-agent modals all need it, and they need it in
// every skin. `cast.ts` cannot serve them, because it imports `Texture` from
// pixi.js and the procedural portrait painter at module top level — so a single
// value import of OFFICE_CAST from a modal was enough to pull the entire sprite
// and WebGL stack into the startup graph, in the Professional skin too, where
// there is no floor and nothing ever draws a sprite.
//
// Splitting the data out costs nothing (it is plain objects) and lets
// `design/skin.ts` keep its promise that scene/office does not load in
// Professional. cast.ts re-exports everything here, so scene code that wants
// both the roster and the frames can keep importing from cast.ts alone.
//
// THREE KINDS OF CHARACTER. A `character` on an agent is one of:
//   - a built-in name ('michael' … 'meredith'): the shipped cast below;
//   - `custom:<id>`: an avatar the user made in the sprite editor, kept in
//     config.json and mirrored into avatarRegistry.ts;
//   - `preset:<n>`: one of the generated presets (src/shared/avatars.ts).
// `castMemberFor` turns any of the three into the same CastMember shape the
// floor and the pickers already consume, so nothing downstream has to know
// which kind it holds.

import {
  type CustomAvatarId,
  type PresetAvatarId,
  CUSTOM_PREFIX,
  isCustomAvatarId,
  presetIndexOf,
  presetRecipe,
  rgbToHex
} from '@shared/avatars';
import { getCustomAvatar } from './avatarRegistry';

/** The cast that ships with the app. Closed on purpose: portraitArt's
 *  CAST_RECIPES is keyed on this, so adding a name here fails the build until
 *  its recipe exists. */
export type BuiltinCharacterName =
  | 'michael' | 'jim' | 'pam' | 'dwight' | 'kevin' | 'angela'
  | 'oscar' | 'stanley' | 'phyllis' | 'andy' | 'kelly' | 'ryan'
  | 'toby' | 'creed' | 'meredith';

/** Anything an agent's `character` field may hold. See the header. */
export type OfficeCharacterName = BuiltinCharacterName | CustomAvatarId | PresetAvatarId;

export interface CastMember {
  name: OfficeCharacterName;
  displayName: string;
  /** Signature accent color (hex) — used for the in-scene selection glow. */
  shirt: string;
  /** Blurb shown when this character is picked / has no description yet. */
  blurb: string;
}

/** Selectable roster, in display order. Built-ins only: custom avatars and
 *  presets are listed by the picker from their own sources. */
export const OFFICE_CAST: CastMember[] = [
  { name: 'michael',  displayName: 'Michael',  shirt: '#5a6b8c', blurb: "World's best boss" },
  { name: 'jim',      displayName: 'Jim',      shirt: '#6fa8dc', blurb: 'Salesman, prankster' },
  { name: 'pam',      displayName: 'Pam',      shirt: '#9caf88', blurb: 'Receptionist, artist' },
  { name: 'dwight',   displayName: 'Dwight',   shirt: '#b89b3e', blurb: 'Assistant (to the) RM' },
  { name: 'kevin',    displayName: 'Kevin',    shirt: '#4a7ab5', blurb: 'Accounting' },
  { name: 'angela',   displayName: 'Angela',   shirt: '#8a86a6', blurb: 'Head of accounting' },
  { name: 'oscar',    displayName: 'Oscar',    shirt: '#7a4b6b', blurb: 'Accountant' },
  { name: 'stanley',  displayName: 'Stanley',  shirt: '#8c5a4b', blurb: 'Sales, crossword' },
  { name: 'phyllis',  displayName: 'Phyllis',  shirt: '#b08bbf', blurb: 'Sales' },
  { name: 'andy',     displayName: 'Andy',     shirt: '#6fae6f', blurb: 'Cornell, a cappella' },
  { name: 'kelly',    displayName: 'Kelly',    shirt: '#d16ba5', blurb: 'Customer service' },
  { name: 'ryan',     displayName: 'Ryan',     shirt: '#3a3a44', blurb: 'The temp' },
  { name: 'toby',     displayName: 'Toby',     shirt: '#9a8c5a', blurb: 'Human resources' },
  { name: 'creed',    displayName: 'Creed',    shirt: '#6b7a4b', blurb: 'Quality assurance' },
  { name: 'meredith', displayName: 'Meredith', shirt: '#b5544a', blurb: 'Supplier relations' },
];

export const CAST_BY_NAME: Record<BuiltinCharacterName, CastMember> =
  Object.fromEntries(OFFICE_CAST.map((c) => [c.name, c])) as Record<BuiltinCharacterName, CastMember>;

/** Always a built-in: it is what an unknown or deleted character falls back to. */
export const DEFAULT_CHARACTER: BuiltinCharacterName = 'jim';

export function isBuiltinCharacter(name: string): name is BuiltinCharacterName {
  return Object.prototype.hasOwnProperty.call(CAST_BY_NAME, name);
}

/** The roster entry for any character the app can draw: a built-in, a custom
 *  avatar that is currently registered, or a preset. Undefined for a name
 *  nothing can draw (a deleted avatar, a typo), which callers treat exactly as
 *  they treated an unknown built-in: fall back to DEFAULT_CHARACTER. */
export function castMemberFor(name: string): CastMember | undefined {
  if (isBuiltinCharacter(name)) return CAST_BY_NAME[name];
  if (isCustomAvatarId(name)) {
    const a = getCustomAvatar(name.slice(CUSTOM_PREFIX.length));
    return a ? { name, displayName: a.name, shirt: rgbToHex(a.recipe.c1), blurb: a.name } : undefined;
  }
  const p = presetIndexOf(name);
  if (p !== null) {
    return { name: name as PresetAvatarId, displayName: `Preset ${p + 1}`, shirt: rgbToHex(presetRecipe(p).c1), blurb: `Preset ${p + 1}` };
  }
  return undefined;
}

export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/** Portrait frame size, in source pixels. Lives HERE rather than in portraitArt
 *  so a component can size its canvas without importing the painter: SpritePortrait
 *  needs these two numbers synchronously at render, but only needs the painting
 *  code in the Office skin, where it loads it dynamically. portraitArt re-exports
 *  them, so its own callers are unaffected. */
export const PORTRAIT_W = 18;
export const PORTRAIT_H = 28;
