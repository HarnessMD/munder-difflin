/**
 * THE AVATAR GALLERY (PRO). Founder feedback item 14c: the Avatar section of
 * the agent sheet is the sheet's wow moment. One place lists every face the
 * office can wear, from the same data Classic's CharacterPicker reads:
 *
 *   - the avatars this install has made (config.avatars, mirrored in the store),
 *   - the fifteen shipped cast members (OFFICE_CAST in castRoster.ts),
 *   - the generated presets (PRESET_COUNT seeds in shared/avatars.ts).
 *
 * Sprites are drawn at an integer multiple of their 18 by 28 source pixels
 * with image-rendering pixelated (SpritePortrait), so nothing ever blurs.
 * A pick calls straight back into the sheet's form state, so the live preview
 * follows the click.
 *
 * Everything renders as ONE grid, four rows until See more, with no heading
 * between the sources: the cast ends and the presets begin mid row, and preset
 * zero sits with the office under the name Darrell.
 *
 * "Create custom avatar" is the FIRST tile and it is PRO native: Classic's
 * SpriteEditor draws its dialog with the pixel kit (PixelPanel, PixelButton)
 * and must not cross the PRO fence (test/pro-fence.test.cjs), so the tile
 * opens an inline creator built on the same underlying recipe machinery
 * instead: randomRecipe from shared/avatars for the face, paintRecipe from
 * portraitArt (loaded lazily, the same way SpritePortrait loads it) for the
 * preview, and window.cth.saveAvatar as the one door that persists. Avatars
 * made here and avatars made in Classic's editor land in the same list.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { SpritePortrait } from '../SpritePortrait';
import { OFFICE_CAST, PORTRAIT_H, PORTRAIT_W, type OfficeCharacterName } from '@/scene/office/castRoster';
import type { AccentColorName } from '@/design/tokens';
import {
  type AvatarRecipe,
  type Wardrobe,
  PRESET_COUNT,
  customAvatarId,
  presetAvatarId,
  randomRecipe
} from '@shared/avatars';
import { Btn, Field, Seg, inputStyle } from './ui';

/** Integer multiple of the 18x28 source frame: 54 by 84 device pixels. */
const TILE_SCALE = 3;
/** The creator's hero preview, larger still and still an integer. */
const PREVIEW_SCALE = 5;
const TILE_MIN = 96;
/** Preset zero wears Darrell's face: seated with the office cast, by name. */
const DARRELL = presetAvatarId(0);
/** Four rows of the sheet's five column grid, the create tile included. */
const VISIBLE_TILES = 20;

export interface AvatarGalleryProps {
  value: OfficeCharacterName;
  accent: AccentColorName;
  /** `displayName` is the name the gallery suggests for the agent: a cast
   *  member's name, a custom avatar's name. Undefined for a preset, so the
   *  agent keeps whatever it was already called. */
  onPick: (character: OfficeCharacterName, displayName?: string) => void;
}

export function AvatarGallery({ value, accent, onPick }: AvatarGalleryProps) {
  const { t } = useTranslation();
  const avatars = useStore((s) => s.avatars);
  const setAvatars = useStore((s) => s.setAvatars);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  /** Persist a shuffled recipe through the same door Classic's editor uses
   *  (main validates, merges against disk and broadcasts), then wear it. */
  const saveNew = async (name: string, recipe: AvatarRecipe): Promise<void> => {
    const api = (window as { cth?: typeof window.cth }).cth;
    if (!api?.saveAvatar) { setCreating(false); return; }
    const before = new Set(avatars.map((a) => a.id));
    const cfg = await api.saveAvatar({ name, recipe });
    const list = cfg.avatars ?? [];
    setAvatars(list);
    const saved = list.find((a) => !before.has(a.id));
    if (saved) onPick(customAvatarId(saved.id), saved.name);
    setCreating(false);
  };

  if (creating) {
    return <AvatarCreator onSave={saveNew} onCancel={() => setCreating(false)} />;
  }

  /* ONE grid, no sections and no headings (founder, 5 Sep 2026): create
     leads, this install's avatars follow, the office cast flows on from the
     same row, and the presets start exactly where the office people end. The
     word preset appears in a tile's name and nowhere else. Four rows show
     until See more; the sheet's grid runs five columns, so four rows is the
     create tile plus nineteen faces. */
  const tiles: ReactNode[] = [
    <CreateTile
      key="create"
      label={t('pro.sheet.gallery.createCustom')}
      title={t('pro.sheet.gallery.createCustomHint')}
      onClick={() => setCreating(true)}
    />,
    ...avatars.map((a) => {
      const id = customAvatarId(a.id);
      return (
        <AvatarTile
          key={a.id}
          character={id}
          label={a.name}
          title={a.name}
          accent={accent}
          on={value === id}
          onClick={() => onPick(id, a.name)}
        />
      );
    }),
    ...OFFICE_CAST.map((c) => (
      <AvatarTile
        key={c.name}
        character={c.name}
        label={c.displayName}
        title={c.blurb}
        accent={accent}
        on={value === c.name}
        onClick={() => onPick(c.name, c.displayName)}
      />
    )),
    // The first preset is DARRELL (founder, 5 Sep 2026): he sits with the
    // office, named like the rest, and the numbered presets start after him.
    <AvatarTile
      key={DARRELL}
      character={DARRELL}
      label="Darrell"
      title="Darrell"
      accent={accent}
      on={value === DARRELL}
      onClick={() => onPick(DARRELL, 'Darrell')}
    />,
    ...Array.from({ length: PRESET_COUNT - 1 }, (_, i) => {
      const n = i + 1;
      const id = presetAvatarId(n);
      const label = t('pro.sheet.gallery.presetName', { n });
      return (
        <AvatarTile
          key={id}
          character={id}
          label={label}
          title={label}
          accent={accent}
          on={value === id}
          onClick={() => onPick(id)}
        />
      );
    })
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <GallerySection>
        {expanded ? tiles : tiles.slice(0, VISIBLE_TILES)}
      </GallerySection>
      {!expanded && tiles.length > VISIBLE_TILES && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Btn size="sm" onClick={() => setExpanded(true)}>{t('pro.sheet.gallery.seeMore')}</Btn>
        </div>
      )}
    </div>
  );
}

/* ---- the grid --------------------------------------------------------------- */

function GallerySection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {title && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{title}</span>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${TILE_MIN}px, 1fr))`, gap: 10 }}>{children}</div>
    </div>
  );
}

/** One selectable face. Selected reads as a 1px accent border, the accent's
 *  light fill and a check chip in the corner. Never initials, always the
 *  sprite, large and crisp. */
function AvatarTile({ character, label, title, accent, on, onClick }: {
  character: OfficeCharacterName;
  label: string;
  title: string;
  accent: AccentColorName;
  on: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="pro-avatar-tile"
      onClick={onClick}
      title={title}
      aria-pressed={on}
      style={{
        position: 'relative', padding: '12px 6px 8px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0,
        borderRadius: 'var(--cth-radius-lg, 10px)',
        border: `1px solid ${on ? `var(--cth-${accent})` : 'var(--cth-ink-300)'}`,
        background: on ? `var(--cth-${accent}-light)` : 'var(--cth-cream-100)'
      }}
    >
      <span style={{ height: PORTRAIT_H * TILE_SCALE, maxWidth: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
        <SpritePortrait character={character} scale={TILE_SCALE} forceSprite />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--cth-ink-700)', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {on && (
        <span
          title={t('pro.sheet.gallery.selected')}
          aria-hidden
          style={{
            position: 'absolute', top: 6, insetInlineEnd: 6, height: 18, minWidth: 18, padding: '0 4px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box',
            borderRadius: 'var(--cth-radius-pill, 999px)',
            border: `1px solid var(--cth-${accent})`, background: 'var(--cth-cream-50)',
            color: 'var(--cth-ink-900)', fontSize: 11, fontWeight: 700, lineHeight: 1
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}

/** The first tile: make a face nobody else has. */
function CreateTile({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="pro-avatar-tile"
      onClick={onClick}
      title={title}
      style={{
        padding: '12px 6px 8px', cursor: 'pointer', minWidth: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        borderRadius: 'var(--cth-radius-lg, 10px)',
        border: '1px dashed var(--cth-ink-300)', background: 'var(--cth-cream-100)'
      }}
    >
      <span style={{ height: PORTRAIT_H * TILE_SCALE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cth-accent-text)' }}>
        <PlusGlyph size={28} />
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--cth-accent-text)', textAlign: 'center', lineHeight: 1.3 }}>{label}</span>
    </button>
  );
}

/** The same 16 by 16 pixel plus as components/Icon's, inlined (the way
 *  CharacterPicker inlines it) so PRO never imports the Classic icon set. */
const PLUS_PATH = 'M7 2h2v5h5v2H9v5H7V9H2V7h5V2z';
function PlusGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" style={{ display: 'inline-block' }} aria-hidden>
      <path d={PLUS_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

/* ---- the inline creator ----------------------------------------------------- */

type WardrobePick = 'any' | Wardrobe;

/** PRO's custom avatar creator: shuffle whole faces from the shared recipe
 *  generator until one lands, name it, save it. Inline in the Avatar section
 *  rather than a second modal, so Esc and the backdrop keep meaning what they
 *  mean for the sheet. Trait by trait fine tuning stays in Classic's sprite
 *  editor, which edits the very same saved list. */
function AvatarCreator({ onSave, onCancel }: {
  onSave: (name: string, recipe: AvatarRecipe) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [recipe, setRecipe] = useState<AvatarRecipe>(() => randomRecipe(Date.now() % 0x7fffffff));
  const [wardrobe, setWardrobe] = useState<WardrobePick>('any');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shuffle = (w: WardrobePick = wardrobe) => {
    const seed = (Date.now() + Math.floor(Math.random() * 0xffffff)) % 0x7fffffff;
    setRecipe(randomRecipe(seed, w === 'any' ? undefined : w));
  };
  const pickWardrobe = (w: WardrobePick) => { setWardrobe(w); shuffle(w); };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave(name.trim(), recipe);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : t('pro.sheet.creator.errSave'));
    }
  };

  return (
    <div style={{
      border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-xl, 12px)',
      background: 'var(--cth-cream-100)', padding: 14, display: 'flex', gap: 16, flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '10px 18px 0', borderRadius: 'var(--cth-radius-lg, 10px)',
          border: '1px solid var(--cth-ink-100)', background: 'var(--cth-cream-50)'
        }}>
          <RecipePortrait recipe={recipe} scale={PREVIEW_SCALE} />
        </span>
        <Btn size="sm" onClick={() => shuffle()} disabled={busy}>{t('pro.sheet.creator.shuffle')}</Btn>
      </div>

      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: 1.5 }}>{t('pro.sheet.creator.sub')}</span>
        <Field label={t('pro.sheet.creator.wardrobe')}>
          <Seg<WardrobePick>
            ariaLabel={t('pro.sheet.creator.wardrobe')}
            value={wardrobe}
            onChange={pickWardrobe}
            options={[
              { value: 'any', label: t('pro.sheet.creator.wardrobeAny') },
              { value: 'men', label: t('pro.sheet.creator.wardrobeMen') },
              { value: 'women', label: t('pro.sheet.creator.wardrobeWomen') }
            ]}
          />
        </Field>
        <Field label={t('pro.sheet.name')} hint={t('pro.sheet.creator.classicHint')}>
          <input
            aria-label={t('pro.sheet.name')}
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            placeholder={t('pro.sheet.creator.namePlaceholder')}
            style={inputStyle}
          />
        </Field>
        {error && <span role="alert" style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }}>{error}</span>}
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <Btn size="sm" kind="primary" onClick={() => { void save(); }} disabled={busy}>
            {busy ? t('pro.sheet.creator.saving') : t('pro.sheet.creator.save')}
          </Btn>
          <Btn size="sm" onClick={onCancel} disabled={busy}>{t('pro.dialog.cancel')}</Btn>
        </div>
      </div>
    </div>
  );
}

/** A recipe that has no name yet, painted the way SpritePortrait paints a
 *  saved character: the painter fetched lazily, smoothing off, integer box. */
function RecipePortrait({ recipe, scale }: { recipe: AvatarRecipe; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let cancelled = false;
    ctx.imageSmoothingEnabled = false;
    void import('@/scene/office/portraitArt')
      .then(({ paintRecipe }) => {
        if (cancelled) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        paintRecipe(ctx, recipe, scale);
      })
      .catch(() => { /* chunk load race */ });
    return () => { cancelled = true; };
  }, [recipe, scale]);
  const w = PORTRAIT_W * scale;
  const h = PORTRAIT_H * scale;
  return <canvas ref={canvasRef} width={w} height={h} style={{ width: w, height: h, imageRendering: 'pixelated' }} />;
}

/* ---- hover lift ------------------------------------------------------------- */
// One rule, the AgentsScreen card pattern: transform and shadow only, and
// global.css already zeroes transitions under prefers-reduced-motion.
const style = document.createElement('style');
style.textContent = '.pro-avatar-tile{transition:transform 90ms,box-shadow 90ms}.pro-avatar-tile:hover{transform:translateY(-2px);box-shadow:var(--cth-shadow-hard)}';
if (typeof document !== 'undefined' && !document.getElementById('pro-avatar-gallery-style')) {
  style.id = 'pro-avatar-gallery-style';
  document.head.appendChild(style);
}
