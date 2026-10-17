// Built-in character names and the one place that maps older saved names onto them.
//
// The default cast is a set of generic, original figures. Agents saved by an older
// build carry the names of the roster that shipped before it; `normalizeCharacter`
// maps those onto today's names so a saved floor keeps a face instead of falling
// through to the default.

export type CharacterName =
  | 'ada' | 'ben' | 'cleo' | 'dax' | 'eli' | 'fern' | 'gus' | 'hana'
  | 'ivo' | 'jules' | 'kira' | 'leo' | 'maya' | 'nico' | 'otto';

export const CHARACTER_NAMES: readonly CharacterName[] = [
  'ada', 'ben', 'cleo', 'dax', 'eli', 'fern', 'gus', 'hana',
  'ivo', 'jules', 'kira', 'leo', 'maya', 'nico', 'otto',
];

/** Used when an agent has no (or an unknown) character. */
export const DEFAULT_CHARACTER: CharacterName = 'ben';
/** The orchestrator's default face: the suit-and-tie figure. */
export const ORCHESTRATOR_CHARACTER: CharacterName = 'ivo';

const KNOWN: ReadonlySet<string> = new Set(CHARACTER_NAMES);

/** Names saved by earlier builds -> the figure that replaced them. */
const LEGACY: Readonly<Record<string, CharacterName>> = {
  michael: 'ivo', jim: 'ben', pam: 'fern', dwight: 'jules', kevin: 'otto',
  angela: 'kira', oscar: 'ada', stanley: 'gus', phyllis: 'maya', andy: 'nico',
  kelly: 'hana', ryan: 'leo', toby: 'eli', creed: 'dax', meredith: 'cleo',
};

/** Current name for a saved/typed character, or null when it is not one of ours. */
export function resolveCharacter(name: string | null | undefined): CharacterName | null {
  const q = (name ?? '').trim().toLowerCase();
  if (KNOWN.has(q)) return q as CharacterName;
  return LEGACY[q] ?? null;
}

/** Like resolveCharacter, but always returns something drawable. */
export function normalizeCharacter(name: string | null | undefined): CharacterName {
  return resolveCharacter(name) ?? DEFAULT_CHARACTER;
}

/** Legacy spellings, for callers that key a table by name and need the aliases too. */
export const LEGACY_CHARACTER_ALIASES: Readonly<Record<string, CharacterName>> = LEGACY;
