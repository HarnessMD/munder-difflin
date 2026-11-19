// Ported from Prozzta/guppyos 02d0d50b (MIT).
// An agent's look in a theme pack: the durable record (per theme, beside the
// Office `character`/`accent`, which it never replaces), how a stored look is
// resolved against the pack's builder (anything unknown falls back to the
// pack's defaults without touching what is stored), the builder's draft
// steps, and what a portrait paints. Pure: no React, no canvas.

import { LOOK_PARTS, OFFICE_THEME_ID, type BuilderBody, type BuilderPreset, type BuilderSpec, type LookColors, type LookPart, type SpriteRendererSpec } from './manifest';
import { normColour, originalColors } from './recolor';

/** One agent's look in one theme (stored in Agent.appearanceByTheme[themeId]). */
export interface ThemeLook {
  bodyId: string;
  colors: LookColors;
  /** The premade it was made from (seat affinity, the builder's selection). */
  presetId?: string;
  /** 'preset': still the premade's look; 'custom': chosen or changed by hand;
   *  'captain-default': the pack's orchestrator seed look, given to any orchestrator with no stored look in
   *  that pack (a new project's, or an existing one switched to the pack; the seed NAME stays creation-only). */
  source: 'preset' | 'custom' | 'captain-default';
  version: 1;
}

export type LooksByTheme = Record<string, ThemeLook>;

/** The fields of an agent the look path reads. */
export interface LookSubject {
  id: string;
  appearanceByTheme?: LooksByTheme;
}

/** A look ready to draw: the body, every part's colour, and the preset. */
export interface ResolvedLook {
  body: BuilderBody;
  colors: Partial<LookColors>;
  presetId?: string;
  /** False when the stored look was missing or had to fall back somewhere. */
  exact: boolean;
}

const SOURCES = new Set(['preset', 'custom', 'captain-default']);

/** A stored look as it is on disk (any shape) -> a ThemeLook, or null. Only the
 *  shape is checked here; the pack's options are checked by resolveLook. */
export function readLook(v: unknown): ThemeLook | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.bodyId !== 'string' || !o.bodyId || o.bodyId.length > 40) return null;
  const c = (o.colors && typeof o.colors === 'object' ? o.colors : {}) as Record<string, unknown>;
  const colors = {} as LookColors;
  for (const p of LOOK_PARTS) colors[p] = typeof c[p] === 'string' ? (c[p] as string).slice(0, 16) : '';
  return {
    bodyId: o.bodyId, colors,
    ...(typeof o.presetId === 'string' && o.presetId && o.presetId.length <= 40 ? { presetId: o.presetId } : {}),
    source: SOURCES.has(o.source as string) ? (o.source as ThemeLook['source']) : 'custom',
    version: 1,
  };
}

/** The bodies a pack offers; a pack without a builder offers every sheet column. */
export function bodiesOf(builder: BuilderSpec | undefined, columns: number): BuilderBody[] {
  if (builder?.bodies?.length) return builder.bodies;
  return Array.from({ length: Math.max(1, columns) }, (_, i) => ({ id: `column-${i}`, label: `Body ${i + 1}`, column: i }));
}

/** A stable pick for an agent with no look: a hash of its id. */
export function hashPick<T>(id: string, list: T[]): T {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

/** Is `c` a colour this pack lets `part` take? */
export function colourAllowed(builder: BuilderSpec | undefined, part: LookPart, c: string, body?: BuilderBody): boolean {
  const n = normColour(c);
  if (!n) return false;
  if (builder?.customColours !== false) return true;
  const sw = Object.values(builder.swatches?.[part] ?? {});
  return sw.includes(n) || body?.parts?.[part]?.main === n;
}

/** Resolve an agent's look in a theme. Anything missing or unknown falls back
 *  (body: the pack default, else the first body; colour: the preset's, the
 *  pack default, else the body's own); nothing stored is changed. */
export function resolveLook(builder: BuilderSpec | undefined, columns: number, stored: ThemeLook | null | undefined, agentId: string): ResolvedLook {
  const bodies = bodiesOf(builder, columns);
  const fallbackBody = bodies.find((b) => b.id === builder?.defaults?.bodyId) ?? bodies[0];
  if (!stored) {
    const body = hashPick(agentId, bodies);
    return { body, colors: fill(builder, body, {}, undefined), exact: false };
  }
  let exact = true;
  let body = bodies.find((b) => b.id === stored.bodyId);
  if (!body) { body = fallbackBody; exact = false; }
  const preset = stored.presetId ? builder?.presets?.find((p) => p.id === stored.presetId) : undefined;
  if (stored.presetId && !preset) exact = false;
  const picked: Partial<LookColors> = {};
  for (const p of LOOK_PARTS) {
    if (!body.parts?.[p]) continue;
    const c = stored.colors?.[p];
    if (c && colourAllowed(builder, p, c, body)) picked[p] = normColour(c)!;
    else exact = false;
  }
  return { body, colors: fill(builder, body, picked, preset), ...(preset ? { presetId: preset.id } : {}), exact };
}

function fill(builder: BuilderSpec | undefined, body: BuilderBody, picked: Partial<LookColors>, preset: BuilderPreset | undefined): Partial<LookColors> {
  const own = originalColors(body), out: Partial<LookColors> = {};
  for (const p of LOOK_PARTS) {
    if (!body.parts?.[p]) continue;
    out[p] = picked[p] ?? preset?.colors?.[p] ?? builder?.defaults?.colors?.[p] ?? own[p];
  }
  return out;
}

/** The agent's preset in a theme, if it is still one of the pack's. */
export function presetIdOf(builder: BuilderSpec | undefined, agent: LookSubject, themeId: string): string | undefined {
  const id = agent.appearanceByTheme?.[themeId]?.presetId;
  return id && builder?.presets?.some((p) => p.id === id) ? id : undefined;
}

/** Store `look` for `themeId`, keeping every other theme's look. */
export function withLook(all: LooksByTheme | undefined, themeId: string, look: ThemeLook): LooksByTheme {
  return { ...(all ?? {}), [themeId]: look };
}

// ─── The builder's draft ────────────────────────────────────────────────────

export interface LookDraft {
  bodyId: string;
  colors: LookColors;
  presetId?: string;
  source: ThemeLook['source'];
}

const complete = (c: Partial<LookColors>): LookColors =>
  ({ skin: c.skin ?? '', shirt: c.shirt ?? '', hair: c.hair ?? '' });

/** A draft from a saved look, else (Edit of an agent with no look yet: pass
 *  its id) the look it is shown with now, else (Add) the pack's default. */
export function startDraft(builder: BuilderSpec | undefined, columns: number, saved?: ThemeLook | null, agentId?: string): LookDraft {
  const r = resolveLook(builder, columns, saved ?? null, agentId ?? '');
  const shown = !!saved || agentId !== undefined;
  const body = shown ? r.body : (bodiesOf(builder, columns).find((b) => b.id === builder?.defaults?.bodyId) ?? r.body);
  const colors = shown ? r.colors : fill(builder, body, {}, undefined);
  return { bodyId: body.id, colors: complete(colors), ...(r.presetId ? { presetId: r.presetId } : {}), source: saved?.source ?? 'custom' };
}

/** Pick a body: a different body is a different character, so the preset goes. */
export function pickBody(builder: BuilderSpec | undefined, columns: number, d: LookDraft, bodyId: string): LookDraft {
  const body = bodiesOf(builder, columns).find((b) => b.id === bodyId);
  if (!body || body.id === d.bodyId) return d;
  // keep what was chosen; a part still in the old body's own colour takes the new body's
  const prev = bodiesOf(builder, columns).find((b) => b.id === d.bodyId);
  const prevOwn = prev ? originalColors(prev) : {};
  const keep: Partial<LookColors> = {};
  for (const p of LOOK_PARTS) {
    const c = d.colors[p];
    if (body.parts?.[p] && c && c !== prevOwn[p] && colourAllowed(builder, p, c, body)) keep[p] = c;
  }
  return { bodyId: body.id, colors: complete(fill(builder, body, keep, undefined)), source: 'custom' };
}

/** Set one part's colour. The preset stays (it is still that character, in a
 *  different colour, and keeps its seat); the look is now custom. */
export function setColour(builder: BuilderSpec | undefined, columns: number, d: LookDraft, part: LookPart, c: string): LookDraft {
  const body = bodiesOf(builder, columns).find((b) => b.id === d.bodyId);
  const n = normColour(c);
  if (!body?.parts?.[part] || !n || !colourAllowed(builder, part, n, body) || d.colors[part] === n) return d;
  return { ...d, colors: { ...d.colors, [part]: n }, source: 'custom' };
}

/** Pick a premade: its body and colours. `name` is its label; Add takes it as the agent's name, as the Office cast picker does. */
export function pickPreset(builder: BuilderSpec | undefined, columns: number, d: LookDraft, presetId: string): { draft: LookDraft; name?: string } {
  const preset = builder?.presets?.find((p) => p.id === presetId);
  if (!preset) return { draft: d };
  const bodies = bodiesOf(builder, columns);
  const body = bodies.find((b) => b.id === preset.bodyId) ?? bodies.find((b) => b.id === d.bodyId) ?? bodies[0];
  return {
    draft: { bodyId: body.id, colors: complete(fill(builder, body, {}, preset)), presetId: preset.id, source: 'preset' },
    ...(preset.label ? { name: preset.label } : {}),
  };
}

/** A look asked for by a spawn request ({ presetId?, bodyId?, colors? }),
 *  applied in builder order (preset, then body, then colours) over the pack's
 *  default. Unknown values are skipped; null when nothing usable was asked. */
export function lookFromRequest(builder: BuilderSpec | undefined, raw: unknown): ThemeLook | null {
  if (!builder || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>, columns = builder.bodies?.length || 1;
  let d = startDraft(builder, columns), used = false;
  if (typeof o.presetId === 'string' && builder.presets?.some((p) => p.id === o.presetId)) { d = pickPreset(builder, columns, d, o.presetId).draft; used = true; }
  if (typeof o.bodyId === 'string' && bodiesOf(builder, columns).some((b) => b.id === o.bodyId)) { d = pickBody(builder, columns, d, o.bodyId); used = true; }
  const c = o.colors && typeof o.colors === 'object' ? (o.colors as Record<string, unknown>) : {};
  for (const p of LOOK_PARTS) if (typeof c[p] === 'string') {
    const next = setColour(builder, columns, d, p, c[p] as string);
    if (next !== d) { d = next; used = true; }
  }
  return used ? draftToLook(d) : null;
}

/** The look an orchestrator gets on a pack floor while it has none stored there: the pack's orchestrator seed
 *  (projectDefaults.orchestrator.appearance), marked 'captain-default'. Null when a look is stored or the seed is unusable. */
export function orchestratorDefaultLook(builder: BuilderSpec | undefined, stored: unknown, seedAppearance: unknown): ThemeLook | null {
  if (readLook(stored)) return null;
  const look = lookFromRequest(builder, seedAppearance);
  return look ? { ...look, source: 'captain-default' } : null;
}

/** The durable record of a draft. */
export function draftToLook(d: LookDraft): ThemeLook {
  return { bodyId: d.bodyId, colors: { ...d.colors }, ...(d.presetId ? { presetId: d.presetId } : {}), source: d.source, version: 1 };
}

// ─── Portraits ──────────────────────────────────────────────────────────────

/** What a portrait shows. */
export type PortraitPlan =
  | { kind: 'office'; character: string }
  | { kind: 'pack'; themeId: string; body: BuilderBody; colors: Partial<LookColors>; row: number;
      /** [x, y, w, h] in the frame, and where the body's frame is in the sheet. */
      crop: [number, number, number, number]; sx: number; sy: number };

/** A pack's portrait inputs (the manifest's builder and sprite metadata, and the sheet's columns). */
export interface PortraitPack {
  themeId: string;
  builder?: BuilderSpec;
  sprite: SpriteRendererSpec;
  columns: number;
}

/** The default crop: a box of the portrait's size at the frame's bottom centre. */
export function defaultCrop(fw: number, fh: number, pw: number, ph: number): [number, number, number, number] {
  const w = Math.min(fw, pw), h = Math.min(fh, ph);
  return [Math.floor((fw - w) / 2), fh - h, w, h];
}

/** Who a portrait is of. An agent (its stored look in the active theme), a
 *  draft (the builder's live preview), the pack's sample (onboarding), or an
 *  Office character (the Office pickers). */
export type PortraitSubject =
  | { agent: LookSubject & { character: string } }
  | { draft: LookDraft; character: string }
  | { sample: true; character: string }
  | { character: string };

/** One route for every portrait: the Office paints the Office character exactly
 *  as before; a pack paints the agent's recoloured front frame, cropped. */
export function portraitPlan(themeId: string, pack: PortraitPack | null, subject: PortraitSubject, size: { w: number; h: number }): PortraitPlan {
  const character = 'agent' in subject ? subject.agent.character : subject.character;
  if (themeId === OFFICE_THEME_ID || !pack || pack.themeId !== themeId || (!('agent' in subject) && !('draft' in subject) && !('sample' in subject)))
    return { kind: 'office', character };
  const b = pack.builder;
  let r: ResolvedLook;
  if ('agent' in subject) r = resolveLook(b, pack.columns, readLook(subject.agent.appearanceByTheme?.[themeId]), subject.agent.id);
  else if ('draft' in subject) r = resolveLook(b, pack.columns, draftToLook(subject.draft), '');
  else if (b?.sample) {
    const s = b.sample;
    r = resolveLook(b, pack.columns, { bodyId: s.bodyId, colors: complete(s.colors ?? {}), ...(s.presetId ? { presetId: s.presetId } : {}), source: 'custom', version: 1 }, 'sample');
  } else {
    const d = startDraft(b, pack.columns);
    r = resolveLook(b, pack.columns, draftToLook(d), '');
  }
  const { frameWidth: fw, frameHeight: fh } = pack.sprite;
  const row = r.body.portrait?.row ?? pack.sprite.rows.down;
  return {
    kind: 'pack', themeId, body: r.body, colors: r.colors, row,
    crop: r.body.portrait?.crop ?? defaultCrop(fw, fh, size.w, size.h),
    sx: r.body.column * fw, sy: row * fh,
  };
}

/** Where the crop lands in a w×h canvas: scaled to fit (whole source pixels
 *  stay square), centred, standing on the bottom edge. */
export function portraitPlacement(crop: [number, number, number, number], w: number, h: number): { dx: number; dy: number; dw: number; dh: number } {
  const f = Math.min(w / crop[2], h / crop[3]);
  const dw = Math.round(crop[2] * f), dh = Math.round(crop[3] * f);
  return { dx: Math.floor((w - dw) / 2), dy: h - dh, dw, dh };
}
