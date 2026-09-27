import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelPanel } from './PixelPanel';
import { PixelButton } from './PixelButton';
import type { AccentColorName } from '@/design/tokens';
import { paintRecipe, paintSceneFrame, SKIN_SWATCHES, PORTRAIT_W, PORTRAIT_H, SCENE_W, SCENE_H } from '@/scene/office/portraitArt';
import {
  type AvatarRecipe, type Brow, type Cloth, type Eyes, type Face, type Facial, type HairStyle, type Mouth, type Nose, type RGB, type Skin, type Wardrobe,
  BROWS, CLOTHS, CLOTH_COLOURS, EYES, EYE_COLOURS, FACES, FACIALS, GARMENTS_MEN, GARMENTS_WOMEN, GARMENT_LABELS, HAIR_COLOURS, HAIR_LABELS,
  HAIR_STYLES, HAS_C2, HAS_TIE, LIP_COLOURS, MAX_AVATAR_NAME, MOUTHS, NOSES, PRESET_COUNT, SKINS, TIE_COLOURS, TROUSER_COLOURS,
  hexToRgb, migrateRecipe, presetRecipe, randomRecipe, recipeKey, rgbToHex, wardrobeOf
} from '@shared/avatars';

export interface SpriteEditorProps {
  mode: 'create' | 'edit';
  initialName?: string;
  initialRecipe: AvatarRecipe;
  accent?: AccentColorName;
  onSave: (name: string, recipe: AvatarRecipe) => Promise<void> | void;
  /** Edit mode only. */
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
  /** Render in the flow instead of as a fixed overlay (the preview harness). */
  inline?: boolean;
}

// English hover titles for the picture tiles, the same convention as the
// garment and hair labels in shared/avatars.ts: the picture is the label.
const FACE_TITLES: Record<Face, string> = { oval: 'Oval', round: 'Round', square: 'Square', long: 'Long', heart: 'Heart', heavy: 'Heavy' };
const EYE_TITLES: Record<Eyes, string> = { normal: 'Normal', wide: 'Wide', dot: 'Dot', squint: 'Squint', happy: 'Happy', lashed: 'Lashed' };
const BROW_TITLES: Record<Brow, string> = { flat: 'Flat', angry: 'Angry', raised: 'Raised', soft: 'Soft', thick: 'Thick', arched: 'Arched' };
const NOSE_TITLES: Record<Nose, string> = { small: 'Small', normal: 'Normal', long: 'Long', wide: 'Wide' };
const MOUTH_TITLES: Record<Mouth, string> = { neutral: 'Neutral', smile: 'Smile', frown: 'Frown', grin: 'Grin', open: 'Open', smirk: 'Smirk' };
const FACIAL_TITLES: Record<Facial, string> = { mustache: 'Moustache', mustacheSm: 'Small moustache', stubble: 'Stubble', goatee: 'Goatee' };

/**
 * The sprite editor. A recipe on the left (the card and the walking figure,
 * live), every option on the right as a picture of THIS avatar with that one
 * thing changed, so a choice is seen rather than read. Nothing here touches
 * config: `onSave` gets the name and the recipe and the caller persists.
 */
export function SpriteEditor({ mode, initialName = '', initialRecipe, accent = 'sky', onSave, onDelete, onClose, inline = false }: SpriteEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [recipe, setRecipeState] = useState<AvatarRecipe>(() => migrateRecipe(initialRecipe));
  const [wardrobe, setWardrobe] = useState<Wardrobe>(() => wardrobeOf(initialRecipe.cloth));
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRecipe = (patch: Partial<AvatarRecipe>) => setRecipeState((r) => migrateRecipe({ ...r, ...patch }));
  const setGarment = (cloth: Cloth) => setRecipeState((r) => {
    const next: AvatarRecipe = { ...r, cloth };
    if (!HAS_C2.has(cloth)) delete next.c2;
    if (!HAS_TIE.has(cloth)) delete next.tie;
    return migrateRecipe(next);
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const save = async () => {
    setBusy(true); setError(null);
    try {
      await onSave(name.trim(), recipe);
    } catch {
      setError(t('avatars.editor.saveFailed'));
      setBusy(false);
    }
  };
  const del = async () => {
    if (!onDelete) return;
    setBusy(true); setError(null);
    try { await onDelete(); } catch { setError(t('avatars.editor.saveFailed')); setBusy(false); }
  };

  const garments = wardrobe === 'men' ? GARMENTS_MEN : GARMENTS_WOMEN;
  const noFacial = !recipe.facial;

  const panel = (
    <PixelPanel variant="dialog" title={mode === 'edit' ? t('avatars.editor.titleEdit') : t('avatars.editor.title')} accent={accent}
      style={{ width: inline ? '100%' : 'min(940px, 94vw)', height: inline ? '100%' : 'min(660px, 88vh)', display: 'flex', flexDirection: 'column' }}
      noPadding>
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* ── left: the avatar, live ─────────────────────────────────── */}
        <div style={{
          width: 236, flex: '0 0 auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12,
          boxShadow: 'inset -1px 0 0 var(--cth-ink-100)', overflowY: 'auto'
        }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={capStyle}>{t('avatars.editor.name')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('avatars.editor.namePlaceholder')}
              maxLength={MAX_AVATAR_NAME}
              style={inputStyle}
              autoFocus={mode === 'create'}
            />
          </label>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <span style={capStyle}>{t('avatars.editor.preview')}</span>
              <div style={previewBox}><RecipeCanvas recipe={recipe} scale={5} /></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              <span style={capStyle}>{t('avatars.editor.onTheFloor')}</span>
              <div style={previewBox}><WalkPreview recipe={recipe} scale={2} /></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <PixelButton size="sm" variant="secondary" onClick={() => setRecipeState(randomRecipe(Date.now() % 0x7fffffff, wardrobe))}>
              {t('avatars.editor.randomise')}
            </PixelButton>
            <PixelButton size="sm" variant="secondary" onClick={() => setPresetsOpen((o) => !o)}>
              {t('avatars.editor.presets')}
            </PixelButton>
          </div>
          {presetsOpen && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {Array.from({ length: PRESET_COUNT }, (_, n) => (
                <OptionTile key={n} active={false} accent={accent} title={t('avatars.picker.preset', { n: n + 1 })}
                  onClick={() => { const r = presetRecipe(n); setRecipeState(r); setWardrobe(wardrobeOf(r.cloth)); }}>
                  <RecipeCanvas recipe={presetRecipe(n)} scale={1.5} />
                </OptionTile>
              ))}
            </div>
          )}
        </div>

        {/* ── right: every option, as this avatar ───────────────────── */}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Section label={t('avatars.editor.skin')}>
            {SKINS.map((s) => (
              <Swatch key={s} rgb={SKIN_SWATCHES[s]} active={recipe.skin === s} title={s} onClick={() => setRecipe({ skin: s as Skin })} />
            ))}
          </Section>
          <Pictures label={t('avatars.editor.faceShape')} accent={accent} recipe={recipe} options={FACES} titles={FACE_TITLES}
            value={recipe.face ?? 'oval'} variant={(face) => ({ face })} onPick={(face) => setRecipe({ face })} />
          <Pictures label={t('avatars.editor.eyes')} accent={accent} recipe={recipe} options={EYES} titles={EYE_TITLES}
            value={recipe.eyes ?? 'normal'} variant={(eyes) => ({ eyes })} onPick={(eyes) => setRecipe({ eyes })} />
          <Section label={t('avatars.editor.eyeColour')}>
            {EYE_COLOURS.map((c, i) => (
              <Swatch key={i} rgb={c} active={sameRgb(recipe.eyec ?? EYE_COLOURS[0], c)} title={rgbToHex(c)}
                onClick={() => setRecipeState((r) => { const n = { ...r }; if (i === 0) delete n.eyec; else n.eyec = c; return n; })} />
            ))}
          </Section>
          <Pictures label={t('avatars.editor.brows')} accent={accent} recipe={recipe} options={BROWS} titles={BROW_TITLES}
            value={recipe.brow ?? 'flat'} variant={(brow) => ({ brow })} onPick={(brow) => setRecipe({ brow })} />
          <Pictures label={t('avatars.editor.nose')} accent={accent} recipe={recipe} options={NOSES} titles={NOSE_TITLES}
            value={recipe.nose ?? 'normal'} variant={(nose) => ({ nose })} onPick={(nose) => setRecipe({ nose })} />
          <Pictures label={t('avatars.editor.mouth')} accent={accent} recipe={recipe} options={MOUTHS} titles={MOUTH_TITLES}
            value={recipe.mouth ?? 'neutral'} variant={(mouth) => ({ mouth })} onPick={(mouth) => setRecipe({ mouth })} />
          <Section label={t('avatars.editor.lipColour')}>
            {LIP_COLOURS.map((c, i) => (
              <Swatch key={i} rgb={c} active={sameRgb(recipe.mouthc ?? LIP_COLOURS[0], c)} title={rgbToHex(c)}
                onClick={() => setRecipeState((r) => { const n = { ...r }; if (i === 0) delete n.mouthc; else n.mouthc = c; return n; })} />
            ))}
          </Section>
          <Section label={t('avatars.editor.extras')}>
            <Toggle on={!!recipe.blush} label={t('avatars.editor.blush')} onClick={() => setRecipe({ blush: !recipe.blush })} />
            <Toggle on={!!recipe.glasses} label={t('avatars.editor.glasses')} onClick={() => setRecipe({ glasses: !recipe.glasses })} />
          </Section>
          <Section label={t('avatars.editor.facialHair')}>
            <OptionTile active={noFacial} accent={accent} title={t('avatars.editor.none')}
              onClick={() => setRecipeState((r) => { const n = { ...r }; delete n.facial; return n; })}>
              <RecipeCanvas recipe={{ ...recipe, facial: undefined }} scale={2} />
            </OptionTile>
            {FACIALS.map((f) => (
              <OptionTile key={f} active={recipe.facial === f} accent={accent} title={FACIAL_TITLES[f]} onClick={() => setRecipe({ facial: f })}>
                <RecipeCanvas recipe={{ ...recipe, facial: f }} scale={2} />
              </OptionTile>
            ))}
          </Section>
          <Pictures label={t('avatars.editor.hair')} accent={accent} recipe={recipe} options={HAIR_STYLES} titles={HAIR_LABELS}
            value={recipe.hair} variant={(hair) => ({ hair })} onPick={(hair) => setRecipe({ hair: hair as HairStyle })} />
          <Section label={t('avatars.editor.hairColour')}>
            {Object.entries(HAIR_COLOURS).map(([k, c]) => (
              <Swatch key={k} rgb={c} active={sameRgb(recipe.hairc, c)} title={k} onClick={() => setRecipe({ hairc: c })} />
            ))}
            <HexInput label={t('avatars.editor.hex')} value={recipe.hairc} onChange={(c) => setRecipe({ hairc: c })} />
          </Section>
          <Section label={t('avatars.editor.wardrobe')}>
            <Toggle on={wardrobe === 'men'} label={t('avatars.editor.men')} onClick={() => setWardrobe('men')} />
            <Toggle on={wardrobe === 'women'} label={t('avatars.editor.women')} onClick={() => setWardrobe('women')} />
          </Section>
          <Section label={t('avatars.editor.garment')}>
            {garments.map((g) => (
              <OptionTile key={g} active={recipe.cloth === g} accent={accent} title={GARMENT_LABELS[g]} onClick={() => setGarment(g)}>
                <RecipeCanvas recipe={{ ...recipe, cloth: g }} scale={2} />
              </OptionTile>
            ))}
          </Section>
          <Section label={t('avatars.editor.colour')}>
            {Object.entries(CLOTH_COLOURS).map(([k, c]) => (
              <Swatch key={k} rgb={c} active={sameRgb(recipe.c1, c)} title={k} onClick={() => setRecipe({ c1: c })} />
            ))}
            <HexInput label={t('avatars.editor.hex')} value={recipe.c1} onChange={(c) => setRecipe({ c1: c })} />
          </Section>
          {HAS_C2.has(recipe.cloth) && (
            <Section label={t('avatars.editor.secondColour')}>
              {Object.entries(CLOTH_COLOURS).map(([k, c]) => (
                <Swatch key={k} rgb={c} active={!!recipe.c2 && sameRgb(recipe.c2, c)} title={k} onClick={() => setRecipe({ c2: c })} />
              ))}
              <HexInput label={t('avatars.editor.hex')} value={recipe.c2 ?? CLOTH_COLOURS.cream} onChange={(c) => setRecipe({ c2: c })} />
            </Section>
          )}
          {HAS_TIE.has(recipe.cloth) && (
            <Section label={t('avatars.editor.tie')}>
              <Toggle on={!recipe.tie} label={t('avatars.editor.noTie')}
                onClick={() => setRecipeState((r) => { const n = { ...r }; delete n.tie; return n; })} />
              {TIE_COLOURS.map((c, i) => (
                <Swatch key={i} rgb={c} active={!!recipe.tie && sameRgb(recipe.tie, c)} title={rgbToHex(c)} onClick={() => setRecipe({ tie: c })} />
              ))}
            </Section>
          )}
          <Section label={t('avatars.editor.trousers')}>
            {TROUSER_COLOURS.map((c, i) => (
              <Swatch key={i} rgb={c} active={sameRgb(recipe.pants ?? TROUSER_COLOURS[0], c)} title={rgbToHex(c)}
                onClick={() => setRecipeState((r) => { const n = { ...r }; if (i === 0) delete n.pants; else n.pants = c; return n; })} />
            ))}
          </Section>
        </div>
      </div>

      {/* ── footer ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        boxShadow: 'inset 0 1px 0 var(--cth-ink-100)'
      }}>
        {mode === 'edit' && onDelete && (
          confirmDelete
            ? (
              <>
                <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-700)' }}>{t('avatars.editor.deleteConfirm')}</span>
                <PixelButton size="sm" variant="destructive" onClick={() => { void del(); }} disabled={busy}>{t('avatars.editor.delete')}</PixelButton>
                <PixelButton size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>{t('avatars.editor.cancel')}</PixelButton>
              </>
            )
            : <PixelButton size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} disabled={busy}>{t('avatars.editor.delete')}</PixelButton>
        )}
        {error && <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-status-blocked)' }}>{error}</span>}
        <span style={{ flex: 1 }} />
        <PixelButton size="md" variant="ghost" onClick={onClose} disabled={busy}>{t('avatars.editor.cancel')}</PixelButton>
        <PixelButton size="md" variant="primary" onClick={() => { void save(); }} disabled={busy}>{t('avatars.editor.save')}</PixelButton>
      </div>
    </PixelPanel>
  );

  if (inline) return <div style={{ width: '100%', height: '100%' }}>{panel}</div>;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(20, 18, 24, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}
    >
      {panel}
    </div>
  );
}

// ─── canvases ────────────────────────────────────────────────────────────────
/** One recipe, painted. Redraws only when the recipe's content changes. */
export function RecipeCanvas({ recipe, scale, frame }: { recipe: AvatarRecipe; scale: number; frame?: { phase: 0 | 1 | 2; back: boolean } }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const key = useMemo(() => recipeKey(recipe), [recipe]);
  const isScene = !!frame;
  const w = Math.round((isScene ? SCENE_W : PORTRAIT_W) * scale);
  const h = Math.round((isScene ? SCENE_H : PORTRAIT_H) * scale);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    if (frame) paintSceneFrame(ctx, recipe, frame.phase, frame.back, scale);
    else paintRecipe(ctx, recipe, scale);
  }, [key, scale, frame?.phase, frame?.back]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={w} height={h} style={{ width: w, height: h, imageRendering: 'pixelated', display: 'block' }} />;
}

/** The walking figure, front and back, stepping. */
function WalkPreview({ recipe, scale }: { recipe: AvatarRecipe; scale: number }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  useEffect(() => {
    const seq: (0 | 1 | 2)[] = [0, 1, 0, 2];
    let i = 0;
    const id = setInterval(() => { i = (i + 1) % seq.length; setPhase(seq[i]); }, 220);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
      <RecipeCanvas recipe={recipe} scale={scale} frame={{ phase, back: false }} />
      <RecipeCanvas recipe={recipe} scale={scale} frame={{ phase, back: true }} />
    </div>
  );
}

// ─── option groups ───────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={capStyle}>{label}</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

/** A row of picture tiles: this avatar, with one field set to each option. */
function Pictures<T extends string>({ label, accent, recipe, options, titles, value, variant, onPick }: {
  label: string; accent: AccentColorName; recipe: AvatarRecipe; options: readonly T[]; titles: Record<T, string>;
  value: T; variant: (opt: T) => Partial<AvatarRecipe>; onPick: (opt: T) => void;
}) {
  return (
    <Section label={label}>
      {options.map((opt) => (
        <OptionTile key={opt} active={value === opt} accent={accent} title={titles[opt]} onClick={() => onPick(opt)}>
          <RecipeCanvas recipe={{ ...recipe, ...variant(opt) }} scale={2} />
        </OptionTile>
      ))}
    </Section>
  );
}

function OptionTile({ active, accent, title, onClick, children }: { active: boolean; accent: AccentColorName; title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        padding: 3, border: 'none', cursor: 'pointer',
        background: active ? `var(--cth-${accent}-light)` : 'var(--cth-cream-100)',
        boxShadow: active ? 'inset 0 0 0 1.5px var(--cth-ink-500)' : 'inset 0 0 0 1px var(--cth-ink-100)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
      }}
    >
      {children}
    </button>
  );
}

function Swatch({ rgb, active, title, onClick }: { rgb: RGB; active: boolean; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      style={{
        width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer',
        background: rgbToHex(rgb),
        boxShadow: active ? 'inset 0 0 0 2px var(--cth-paper-100), 0 0 0 1.5px var(--cth-ink-900)' : 'inset 0 0 0 1px var(--cth-ink-300)'
      }}
    />
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: '3px 8px 1px', border: 'none', cursor: 'pointer',
        background: on ? 'var(--cth-ink-900)' : 'var(--cth-cream-100)',
        color: on ? 'var(--cth-paper-100)' : 'var(--cth-ink-900)',
        boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--cth-ink-300)',
        fontFamily: 'var(--cth-font-ui)', fontSize: 12
      }}
    >
      {label}
    </button>
  );
}

/** A six digit hex field beside the swatches, for a colour the palette lacks. */
function HexInput({ label, value, onChange }: { label: string; value: RGB; onChange: (c: RGB) => void }) {
  const [text, setText] = useState(rgbToHex(value));
  const current = rgbToHex(value);
  useEffect(() => { setText(current); }, [current]);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginInlineStart: 6 }}>
      <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{label}</span>
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); const c = hexToRgb(e.target.value); if (c) onChange(c); }}
        spellCheck={false}
        style={{ ...inputStyle, width: 82, fontFamily: 'var(--cth-font-mono)', fontSize: 12, padding: '3px 6px 2px' }}
      />
    </label>
  );
}

const sameRgb = (a: RGB, b: RGB) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

const capStyle: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
  color: 'var(--cth-ink-700)', textTransform: 'uppercase'
};
const inputStyle: CSSProperties = {
  width: '100%', padding: '6px 8px 4px', boxSizing: 'border-box',
  background: 'var(--cth-paper-100)', border: 'none',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
  fontFamily: 'var(--cth-font-ui)', fontSize: 16, color: 'var(--cth-ink-900)', outline: 'none'
};
const previewBox: CSSProperties = {
  padding: 6, background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
};
