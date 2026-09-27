/**
 * Avatar recipes: the DATA behind every sprite the app draws.
 *
 * A sprite is not an image file. `portraitArt.ts` draws an 18×28 bust and an
 * 18×32 walking figure from a small flat object (skin, face, eyes, hair, one
 * garment, a few colours). The fifteen Office characters are fifteen such
 * objects. This module holds the vocabulary those objects are written in, so
 * three things can agree on it without importing the painter:
 *
 *   - main, which persists the user's custom avatars inside config.json and
 *     must know the shape it is storing (`CustomAvatar`);
 *   - the renderer's picker and editor, which need the option lists;
 *   - the painter itself, whose drawing tables are typed against these unions
 *     so a value added here without a drawing (or the reverse) is a type error.
 *
 * Nothing here touches the DOM, pixi or the store. Everything is plain data
 * and pure functions, which is also what lets node:test load it directly.
 *
 * COMPATIBILITY. The recipe grew in the sprite editor work (face shape, eye
 * style, nose, eye and lip colour, two skins, four new hair styles and
 * fourteen new garments). Every field that predates that is unchanged, and
 * `migrateRecipe` maps the two legacy flags (`heavy`, `lashes`) onto the new
 * fields. The cast renders byte identical through the new path;
 * test/avatar-recipes.test.cjs pins that with hashes captured from v0.4.8.
 */

export type RGB = [number, number, number];

export const SKINS = ['pale', 'light', 'tan', 'brown', 'dark', 'deep'] as const;
export type Skin = typeof SKINS[number];

export const FACES = ['oval', 'round', 'square', 'long', 'heart', 'heavy'] as const;
export type Face = typeof FACES[number];

export const EYES = ['normal', 'wide', 'dot', 'squint', 'happy', 'lashed'] as const;
export type Eyes = typeof EYES[number];

export const BROWS = ['flat', 'angry', 'raised', 'soft', 'thick', 'arched'] as const;
export type Brow = typeof BROWS[number];

export const NOSES = ['small', 'normal', 'long', 'wide'] as const;
export type Nose = typeof NOSES[number];

export const MOUTHS = ['neutral', 'smile', 'frown', 'grin', 'open', 'smirk'] as const;
export type Mouth = typeof MOUTHS[number];

export const FACIALS = ['mustache', 'mustacheSm', 'stubble', 'goatee'] as const;
export type Facial = typeof FACIALS[number];

export const HAIR_STYLES = [
  'styleShort', 'styleFloppy', 'styleFrame', 'styleBun', 'styleCurly', 'styleMessy',
  'styleRecede', 'styleSpiky', 'styleBald', 'styleLong', 'styleAfro', 'styleBuzz', 'styleMohawk'
] as const;
export type HairStyle = typeof HAIR_STYLES[number];

/** Garments in the two catalogues the picker shows. `hoodie` and `turtleneck`
 *  appear in both; the union below is what the painter draws. */
export const GARMENTS_MEN = [
  'suit', 'dressshirt', 'shirt_open', 'polo', 'sweater', 'sweater_v', 'tee', 'hoodie', 'vest', 'blazer_tee', 'turtleneck'
] as const;
export const GARMENTS_WOMEN = [
  'blouse', 'cardigan', 'shirt_w', 'boatneck', 'dress', 'wrap', 'blazer_w', 'stripe_tee', 'hoodie', 'cami', 'turtleneck'
] as const;
export const CLOTHS = [
  'suit', 'dressshirt', 'polo', 'blouse', 'cardigan', 'sweater',
  'shirt_open', 'sweater_v', 'tee', 'hoodie', 'vest', 'blazer_tee', 'turtleneck',
  'shirt_w', 'boatneck', 'dress', 'wrap', 'blazer_w', 'stripe_tee', 'cami'
] as const;
export type Cloth = typeof CLOTHS[number];

/** Garments that take a tie colour. */
export const HAS_TIE: ReadonlySet<Cloth> = new Set<Cloth>(['suit', 'dressshirt', 'vest']);
/** Garments with a second colour (trim, inner layer, stripes). */
export const HAS_C2: ReadonlySet<Cloth> = new Set<Cloth>(['polo', 'cardigan', 'tee', 'blazer_tee', 'blazer_w', 'stripe_tee', 'sweater_v']);

/** English labels for tooltips. Screen copy goes through i18n; these are the
 *  hover titles on option tiles, where the picture is the label. */
export const GARMENT_LABELS: Record<Cloth, string> = {
  suit: 'Suit', dressshirt: 'Dress shirt', polo: 'Polo', blouse: 'Blouse', cardigan: 'Cardigan', sweater: 'Crew sweater',
  shirt_open: 'Open collar shirt', sweater_v: 'V-neck sweater', tee: 'T-shirt', hoodie: 'Hoodie', vest: 'Waistcoat',
  blazer_tee: 'Blazer over tee', turtleneck: 'Turtleneck', shirt_w: 'Button shirt', boatneck: 'Boat neck top',
  dress: 'Dress', wrap: 'Wrap top', blazer_w: 'Blazer over cami', stripe_tee: 'Striped tee', cami: 'Camisole'
};
export const HAIR_LABELS: Record<HairStyle, string> = {
  styleShort: 'Short', styleFloppy: 'Floppy', styleFrame: 'Framed', styleBun: 'Bun', styleCurly: 'Curly', styleMessy: 'Messy',
  styleRecede: 'Receding', styleSpiky: 'Spiky', styleBald: 'Bald', styleLong: 'Long', styleAfro: 'Afro', styleBuzz: 'Buzz cut', styleMohawk: 'Mohawk'
};

export interface HairArgs {
  part?: 'L' | 'R';
  recede?: number;
  length?: number;
  vol?: number;
}

/** One sprite, fully described. Optional fields have the defaults
 *  `migrateRecipe` fills; the legacy flags are read only by that function. */
export interface AvatarRecipe {
  skin: Skin;
  face?: Face;
  eyes?: Eyes;
  /** Pupil colour. Unset draws the cast's dark pupil. */
  eyec?: RGB;
  brow?: Brow;
  nose?: Nose;
  mouth?: Mouth;
  /** Lip colour. Unset draws the cast's muted rose. */
  mouthc?: RGB;
  blush?: boolean;
  facial?: Facial;
  glasses?: boolean;
  hair: HairStyle;
  hairc: RGB;
  hairargs?: HairArgs;
  cloth: Cloth;
  c1: RGB;
  c2?: RGB;
  tie?: RGB;
  pants?: RGB;
  /** Legacy (pre editor): heavier build. Now `face: 'heavy'`. */
  heavy?: boolean;
  /** Legacy (pre editor): lashed eyes. Now `eyes: 'lashed'`. */
  lashes?: boolean;
}

/** A user made avatar. Stored in config.json under `avatars` and referenced
 *  from an agent by `character: 'custom:<id>'`. */
export interface CustomAvatar {
  id: string;
  name: string;
  recipe: AvatarRecipe;
  createdAt: string;
  updatedAt: string;
}

export const CUSTOM_PREFIX = 'custom:';
export const PRESET_PREFIX = 'preset:';
export type CustomAvatarId = `custom:${string}`;
export type PresetAvatarId = `preset:${number}`;

export function isCustomAvatarId(id: string): id is CustomAvatarId { return id.startsWith(CUSTOM_PREFIX); }
export function isPresetAvatarId(id: string): id is PresetAvatarId { return id.startsWith(PRESET_PREFIX); }
export function customAvatarId(id: string): CustomAvatarId { return `${CUSTOM_PREFIX}${id}`; }
export function presetAvatarId(n: number): PresetAvatarId { return `${PRESET_PREFIX}${n}`; }
/** The number after `preset:`, or null when the id is not a valid preset. */
export function presetIndexOf(id: string): number | null {
  if (!isPresetAvatarId(id)) return null;
  const n = Number(id.slice(PRESET_PREFIX.length));
  return Number.isInteger(n) && n >= 0 && n < PRESET_COUNT ? n : null;
}

/** A process unique id for a new custom avatar. Time first so a list sorted by
 *  id is also sorted by creation. */
export function newCustomAvatarId(now = Date.now()): string {
  return `${now.toString(36)}${Math.floor(Math.random() * 0xffffff).toString(36).padStart(5, '0')}`;
}

/** How many custom avatars one install may keep. Each is a few hundred bytes
 *  of JSON in config.json; the cap is there so a runaway caller cannot grow
 *  the file without bound, not because anyone is expected to reach it. */
export const MAX_CUSTOM_AVATARS = 48;
/** Longest avatar name. It doubles as the agent name the picker fills in. */
export const MAX_AVATAR_NAME = 24;
const ID_RE = /^[a-z0-9]{4,40}$/;

/** Trim, collapse whitespace and cut to MAX_AVATAR_NAME. Empty when nothing
 *  usable is left, so a caller can substitute its own default. */
export function sanitizeAvatarName(v: unknown): string {
  if (typeof v !== 'string') return '';
  return v.replace(/\s+/g, ' ').trim().slice(0, MAX_AVATAR_NAME).trim();
}

/** Accept one stored or wire avatar. Null when the id, the name or the recipe
 *  is unusable; the timestamps are repaired rather than rejected. */
export function normalizeCustomAvatar(input: unknown, now = new Date().toISOString()): CustomAvatar | null {
  if (!input || typeof input !== 'object') return null;
  const a = input as Record<string, unknown>;
  if (typeof a.id !== 'string' || !ID_RE.test(a.id)) return null;
  const name = sanitizeAvatarName(a.name);
  if (!name) return null;
  const recipe = normalizeRecipe(a.recipe);
  if (!recipe) return null;
  const iso = (v: unknown): string => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : now);
  return { id: a.id, name, recipe, createdAt: iso(a.createdAt), updatedAt: iso(a.updatedAt) };
}

// ─── validation ─────────────────────────────────────────────────────────────
const isRgb = (v: unknown): v is RGB =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 255);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);
const rgbOf = (v: unknown): RGB | undefined => (isRgb(v) ? [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])] : undefined);

/** Accept anything that came off disk or over the wire and return a recipe the
 *  painter can draw, or null when the four load bearing fields are missing or
 *  unknown. Unknown optional values are dropped rather than failing the whole
 *  recipe, so a config written by a newer build still draws something close. */
export function normalizeRecipe(input: unknown): AvatarRecipe | null {
  if (!input || typeof input !== 'object') return null;
  const r = input as Record<string, unknown>;
  if (!oneOf(SKINS, r.skin) || !oneOf(HAIR_STYLES, r.hair) || !oneOf(CLOTHS, r.cloth)) return null;
  const hairc = rgbOf(r.hairc), c1 = rgbOf(r.c1);
  if (!hairc || !c1) return null;
  const out: AvatarRecipe = { skin: r.skin, hair: r.hair, hairc, cloth: r.cloth, c1 };
  if (oneOf(FACES, r.face)) out.face = r.face;
  if (oneOf(EYES, r.eyes)) out.eyes = r.eyes;
  if (oneOf(BROWS, r.brow)) out.brow = r.brow;
  if (oneOf(NOSES, r.nose)) out.nose = r.nose;
  if (oneOf(MOUTHS, r.mouth)) out.mouth = r.mouth;
  if (oneOf(FACIALS, r.facial)) out.facial = r.facial;
  const eyec = rgbOf(r.eyec); if (eyec) out.eyec = eyec;
  const mouthc = rgbOf(r.mouthc); if (mouthc) out.mouthc = mouthc;
  const c2 = rgbOf(r.c2); if (c2) out.c2 = c2;
  const tie = rgbOf(r.tie); if (tie) out.tie = tie;
  const pants = rgbOf(r.pants); if (pants) out.pants = pants;
  if (r.blush === true) out.blush = true;
  if (r.glasses === true) out.glasses = true;
  if (r.heavy === true) out.heavy = true;
  if (r.lashes === true) out.lashes = true;
  if (r.hairargs && typeof r.hairargs === 'object') {
    const a = r.hairargs as Record<string, unknown>;
    const ha: HairArgs = {};
    if (a.part === 'L' || a.part === 'R') ha.part = a.part;
    if (typeof a.recede === 'number' && Number.isFinite(a.recede)) ha.recede = a.recede;
    if (typeof a.length === 'number' && Number.isFinite(a.length)) ha.length = Math.max(0, Math.min(31, Math.round(a.length)));
    if (typeof a.vol === 'number' && Number.isFinite(a.vol)) ha.vol = Math.max(0, Math.min(3, Math.round(a.vol)));
    if (Object.keys(ha).length) out.hairargs = ha;
  }
  return migrateRecipe(out);
}

/** Fill the defaults and fold the legacy flags into the fields that replaced
 *  them. Idempotent. The painter calls this on every recipe it draws, so the
 *  cast recipes can keep their short original form. */
export function migrateRecipe(r: AvatarRecipe): AvatarRecipe {
  const o: AvatarRecipe = { ...r };
  if (!o.face) o.face = o.heavy ? 'heavy' : 'oval';
  if (!o.eyes) o.eyes = o.lashes ? 'lashed' : 'normal';
  if (!o.brow) o.brow = 'flat';
  if (!o.nose) o.nose = 'normal';
  if (!o.mouth) o.mouth = 'neutral';
  o.heavy = o.face === 'heavy';
  o.lashes = o.eyes === 'lashed';
  return o;
}

/** A stable string for a recipe, used as a cache key by the painter. Two
 *  recipes that draw the same pixels have the same key; the field order is
 *  fixed here rather than taken from the object. */
export function recipeKey(r: AvatarRecipe): string {
  const m = migrateRecipe(r);
  const c = (v: RGB | undefined) => (v ? v.join('.') : '');
  const a = m.hairargs ?? {};
  return [
    m.skin, m.face, m.eyes, c(m.eyec), m.brow, m.nose, m.mouth, c(m.mouthc), m.blush ? 1 : 0, m.facial ?? '', m.glasses ? 1 : 0,
    m.hair, c(m.hairc), a.part ?? '', a.recede ?? '', a.length ?? '', a.vol ?? '',
    m.cloth, c(m.c1), c(m.c2), c(m.tie), c(m.pants)
  ].join('|');
}

// ─── palettes the editor offers ─────────────────────────────────────────────
export const HAIR_COLOURS: Record<string, RGB> = {
  black: [24, 18, 22], espresso: [42, 32, 24], darkBrown: [64, 48, 28], brown: [92, 60, 34], chestnut: [120, 76, 42],
  auburn: [154, 82, 46], ginger: [196, 98, 44], honey: [186, 154, 90], blonde: [196, 162, 110], platinum: [224, 206, 170],
  grey: [170, 166, 156], white: [226, 222, 214], blue: [70, 90, 170], pink: [214, 120, 170], green: [70, 140, 100]
};
export const CLOTH_COLOURS: Record<string, RGB> = {
  charcoal: [58, 63, 74], navy: [46, 58, 96], slate: [110, 140, 180], sky: [172, 196, 224], teal: [60, 130, 130],
  forest: [70, 110, 80], olive: [126, 130, 96], mustard: [184, 155, 62], sand: [150, 120, 86], rust: [176, 65, 58],
  wine: [122, 60, 74], plum: [150, 146, 170], rose: [236, 174, 192], magenta: [212, 90, 158], coral: [176, 86, 74],
  brown: [120, 78, 52], tan: [150, 120, 86], cream: [235, 233, 226], white: [244, 242, 238], black: [40, 40, 50]
};
export const TIE_COLOURS: RGB[] = [[170, 58, 58], [120, 130, 150], [120, 82, 46], [40, 40, 50], [60, 100, 160], [120, 78, 52], [200, 160, 60]];
export const EYE_COLOURS: RGB[] = [[46, 38, 42], [60, 90, 140], [70, 110, 70], [110, 70, 40]];
export const LIP_COLOURS: RGB[] = [[158, 86, 80], [190, 40, 60], [120, 60, 70]];
export const TROUSER_COLOURS: RGB[] = [[54, 56, 70], [40, 40, 50], [90, 80, 70], [120, 130, 150], [70, 90, 120]];

export function rgbToHex(c: RGB): string {
  return '#' + c.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
}
export function hexToRgb(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// ─── the seeded generator, and the built in presets ─────────────────────────
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
const pickVal = (r: () => number, obj: Record<string, RGB>): RGB => obj[pick(r, Object.keys(obj))];
const NATURAL_HAIR = ['black', 'espresso', 'darkBrown', 'brown', 'chestnut', 'auburn', 'ginger', 'honey', 'blonde', 'platinum', 'grey', 'white'];

export type Wardrobe = 'men' | 'women';

/** A complete recipe from a seed. The same seed always gives the same recipe,
 *  which is what makes the preset table below a table of numbers rather than
 *  a table of objects. Natural hair colours nine times in ten. */
export function randomRecipe(seed: number, group?: Wardrobe): AvatarRecipe {
  const r = rng(seed);
  const g: Wardrobe = group ?? pick(r, ['men', 'women'] as const);
  const hair = pick(r, HAIR_STYLES);
  const hairargs: HairArgs = {};
  if (hair === 'styleShort' || hair === 'styleRecede') { hairargs.part = pick(r, ['L', 'R'] as const); if (r() < 0.3) hairargs.recede = 1; }
  if (hair === 'styleFrame') { hairargs.length = 16 + Math.floor(r() * 5); hairargs.vol = Math.floor(r() * 3); }
  if (hair === 'styleMessy') hairargs.length = 9 + Math.floor(r() * 7);
  if (hair === 'styleLong') hairargs.length = 21 + Math.floor(r() * 5);
  const cloth = pick(r, g === 'men' ? GARMENTS_MEN : GARMENTS_WOMEN);
  const o: AvatarRecipe = {
    skin: pick(r, SKINS),
    hairc: r() < 0.9 ? HAIR_COLOURS[pick(r, NATURAL_HAIR)] : pickVal(r, HAIR_COLOURS),
    hair,
    hairargs,
    cloth,
    c1: pickVal(r, CLOTH_COLOURS),
    face: pick(r, FACES),
    eyes: g === 'women' && r() < 0.6 ? 'lashed' : pick(r, EYES),
    brow: pick(r, BROWS),
    nose: pick(r, NOSES),
    mouth: pick(r, MOUTHS),
    blush: g === 'women' ? r() < 0.4 : r() < 0.1,
    glasses: r() < 0.25
  };
  if (HAS_C2.has(cloth)) o.c2 = pickVal(r, CLOTH_COLOURS);
  if (HAS_TIE.has(cloth) && r() < 0.7) o.tie = pick(r, TIE_COLOURS);
  if (g === 'men' && r() < 0.3) o.facial = pick(r, FACIALS);
  if (r() < 0.15) o.eyec = pick(r, EYE_COLOURS.slice(1));
  if (g === 'women' && r() < 0.25) o.mouthc = LIP_COLOURS[1];
  if (Object.keys(hairargs).length === 0) delete o.hairargs;
  return migrateRecipe(o);
}

/** The presets the kit ships with: twelve from each wardrobe, interleaved.
 *  Seeds, not objects, so the table cannot drift from the generator. */
export const PRESET_SEED_BASE = 1000;
export const PRESET_COUNT = 24;
export function presetRecipe(n: number): AvatarRecipe {
  const i = Math.max(0, Math.min(PRESET_COUNT - 1, Math.floor(n)));
  return randomRecipe(PRESET_SEED_BASE + i, i % 2 === 0 ? 'men' : 'women');
}

/** The wardrobe a garment belongs to, for the editor's tab to open on. */
export function wardrobeOf(cloth: Cloth): Wardrobe {
  return (GARMENTS_WOMEN as readonly string[]).includes(cloth) && !(GARMENTS_MEN as readonly string[]).includes(cloth) ? 'women' : 'men';
}
