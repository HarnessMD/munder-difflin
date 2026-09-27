import { lazy, Suspense, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SpritePortrait } from './SpritePortrait';
import { useStore } from '@/store/store';
import { OFFICE_CAST, DEFAULT_CHARACTER, CAST_BY_NAME, type OfficeCharacterName } from '@/scene/office/castRoster';
import type { AccentColorName } from '@/design/tokens';
import {
  type AvatarRecipe,
  type CustomAvatar,
  PRESET_COUNT,
  customAvatarId,
  isPresetAvatarId,
  presetAvatarId,
  presetRecipe,
  randomRecipe
} from '@shared/avatars';

// Lazy on purpose: the editor imports the painter statically, and this picker
// sits inside the Add-Agent modal. Nobody pays for the editor until they open it.
const SpriteEditor = lazy(() => import('./SpriteEditor').then((m) => ({ default: m.SpriteEditor })));

export interface CharacterPickerProps {
  value: OfficeCharacterName;
  /** `displayName` is the name the picker suggests for the agent: a cast
   *  member's name, a custom avatar's name. Undefined for a preset, so the
   *  agent keeps whatever it was already called. */
  onPick: (character: OfficeCharacterName, displayName?: string) => void;
  accent: AccentColorName;
  /** Pixels per sprite pixel on the tiles. */
  scale?: number;
  /** The preview harness has no store; it passes the list in. */
  avatars?: CustomAvatar[];
}

type Editing =
  | { mode: 'create'; recipe: AvatarRecipe }
  | { mode: 'edit'; avatar: CustomAvatar };

/**
 * The character picker: the fifteen cast members, then the avatars this
 * install has made, then the generated presets. One component for Add Agent
 * and Edit Agent, so the two never drift again.
 *
 * Saving and deleting go through main (window.cth.saveAvatar / deleteAvatar),
 * which validates and merges against the config on disk and then notifies
 * every window; the store mirror is refreshed here too so this picker does not
 * wait for that round trip.
 */
export function CharacterPicker({ value, onPick, accent, scale = 2, avatars: avatarsProp }: CharacterPickerProps) {
  const { t } = useTranslation();
  const storeAvatars = useStore((s) => s.avatars);
  const setAvatars = useStore((s) => s.setAvatars);
  const avatars = avatarsProp ?? storeAvatars;
  const [editing, setEditing] = useState<Editing | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(() => isPresetAvatarId(value));
  const api = (window as { cth?: typeof window.cth }).cth;

  const save = async (name: string, recipe: AvatarRecipe): Promise<void> => {
    if (!editing) return;
    if (!api?.saveAvatar) { setEditing(null); return; }
    const before = new Set(avatars.map((a) => a.id));
    const cfg = editing.mode === 'edit'
      ? await api.saveAvatar({ id: editing.avatar.id, name, recipe })
      : await api.saveAvatar({ name, recipe });
    const list = cfg.avatars ?? [];
    setAvatars(list);
    const saved = editing.mode === 'edit'
      ? list.find((a) => a.id === editing.avatar.id)
      : list.find((a) => !before.has(a.id));
    if (saved) onPick(customAvatarId(saved.id), saved.name);
    setEditing(null);
  };

  const remove = async (): Promise<void> => {
    if (!editing || editing.mode !== 'edit') return;
    if (api?.deleteAvatar) {
      const cfg = await api.deleteAvatar(editing.avatar.id);
      setAvatars(cfg.avatars ?? []);
    }
    if (value === customAvatarId(editing.avatar.id)) onPick(DEFAULT_CHARACTER, CAST_BY_NAME[DEFAULT_CHARACTER].displayName);
    setEditing(null);
  };

  const tileProps = { accent, scale };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Group title={t('avatars.picker.cast')}>
        {OFFICE_CAST.map((c) => (
          <Tile
            key={c.name}
            {...tileProps}
            active={value === c.name}
            character={c.name}
            label={c.displayName}
            title={c.blurb}
            onClick={() => onPick(c.name, c.displayName)}
          />
        ))}
      </Group>

      <Group title={t('avatars.picker.yours')} hint={avatars.length === 0 ? t('avatars.picker.empty') : undefined}>
        {avatars.map((a) => {
          const id = customAvatarId(a.id);
          return (
            <Tile
              key={a.id}
              {...tileProps}
              active={value === id}
              character={id}
              label={a.name}
              title={a.name}
              onClick={() => onPick(id, a.name)}
              corner={{ icon: 'edit', title: t('avatars.picker.edit', { name: a.name }), onClick: () => setEditing({ mode: 'edit', avatar: a }) }}
            />
          );
        })}
        <NewTile scale={scale} label={t('avatars.picker.new')} title={t('avatars.picker.newHint')}
          onClick={() => setEditing({ mode: 'create', recipe: randomRecipe(Date.now() % 0x7fffffff) })} />
      </Group>

      <Group
        title={t('avatars.picker.presets')}
        right={
          <button type="button" onClick={() => setPresetsOpen((o) => !o)} style={linkBtn}>
            {presetsOpen ? t('avatars.picker.hidePresets') : t('avatars.picker.showPresets', { count: PRESET_COUNT })}
          </button>
        }
      >
        {presetsOpen && Array.from({ length: PRESET_COUNT }, (_, n) => {
          const id = presetAvatarId(n);
          const label = t('avatars.picker.preset', { n: n + 1 });
          return (
            <Tile
              key={id}
              {...tileProps}
              active={value === id}
              character={id}
              label={label}
              title={label}
              onClick={() => onPick(id)}
              corner={{ icon: 'edit', title: t('avatars.picker.customise'), onClick: () => setEditing({ mode: 'create', recipe: presetRecipe(n) }) }}
            />
          );
        })}
      </Group>

      {editing && (
        <Suspense fallback={null}>
          <SpriteEditor
            mode={editing.mode}
            accent={accent}
            initialName={editing.mode === 'edit' ? editing.avatar.name : ''}
            initialRecipe={editing.mode === 'edit' ? editing.avatar.recipe : editing.recipe}
            onSave={save}
            onDelete={editing.mode === 'edit' ? remove : undefined}
            onClose={() => setEditing(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

// ─── pieces ──────────────────────────────────────────────────────────────────

/** The two glyphs this picker draws itself: the pencil on a custom avatar's
 *  corner and the plus on the "make one" tile. They are the same 16 by 16
 *  pixel paths as components/Icon's `edit` and `plus`, inlined so the picker,
 *  which the PRO agent sheet mounts too, does not pull the Classic icon
 *  library across the PRO fence (test/pro-fence.test.cjs). Same box, same
 *  crisp edges, same currentColor fill, so Classic renders exactly as before. */
const GLYPH_PATHS = {
  plus: 'M7 2h2v5h5v2H9v5H7V9H2V7h5V2z',
  edit: 'M13 1h2v1h-2zM1 2h10v1h-10zM12 2h2v1h-2zM1 3h1v1h-1zM11 3h2v1h-2zM1 4h1v1h-1zM10 4h2v1h-2zM1 5h1v1h-1zM9 5h2v1h-2zM1 6h1v1h-1zM3 6h5v1h-5zM9 6h1v1h-1zM1 7h1v1h-1zM10 7h1v1h-1zM1 8h1v1h-1zM10 8h1v1h-1zM1 9h1v1h-1zM3 9h5v1h-5zM10 9h1v1h-1zM1 10h1v1h-1zM10 10h1v1h-1zM1 11h1v1h-1zM10 11h1v1h-1zM1 12h1v1h-1zM3 12h5v1h-5zM10 12h1v1h-1zM1 13h1v1h-1zM10 13h1v1h-1zM1 14h1v1h-1zM10 14h1v1h-1zM1 15h10v1h-10z'
} as const;

function Glyph({ name }: { name: keyof typeof GLYPH_PATHS }) {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} shapeRendering="crispEdges" style={{ display: 'inline-block' }} aria-hidden>
      <path d={GLYPH_PATHS[name]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

const linkBtn: CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-700)', textDecoration: 'underline'
};

function Group({ title, hint, right, children }: { title: string; hint?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{title}</span>
        {hint && <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{hint}</span>}
        {right && <span style={{ marginInlineStart: 'auto' }}>{right}</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

interface TileProps {
  active: boolean;
  accent: AccentColorName;
  scale: number;
  character: OfficeCharacterName;
  label: string;
  title: string;
  onClick: () => void;
  corner?: { icon: 'edit'; title: string; onClick: () => void };
}

/** One selectable sprite. The markup and the tokens are the ones the two
 *  modals used for the cast, so the cast looks exactly as it did. */
function Tile({ active, accent, scale, character, label, title, onClick, corner }: TileProps) {
  const boxW = Math.round(18 * scale) + 8, boxH = Math.round(28 * scale);
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onClick}
        title={title}
        style={{
          padding: 4,
          background: active ? `var(--cth-${accent}-light)` : 'var(--cth-cream-100)',
          boxShadow: active ? 'inset 0 0 0 1.5px var(--cth-ink-500)' : 'inset 0 0 0 1px var(--cth-ink-100)',
          cursor: 'pointer', border: 'none', width: boxW + 12,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
        }}
      >
        <div style={{ width: boxW, height: boxH, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', overflow: 'hidden' }}>
          <SpritePortrait character={character} scale={scale} forceSprite />
        </div>
        <span style={{
          fontSize: scale >= 2 ? 11 : 10, color: 'var(--cth-ink-700)', maxWidth: boxW + 4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{label}</span>
      </button>
      {corner && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); corner.onClick(); }}
          title={corner.title}
          aria-label={corner.title}
          style={{
            position: 'absolute', top: 2, insetInlineEnd: 2, width: 18, height: 18, padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--cth-paper-100)', border: 'none', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
            color: 'var(--cth-ink-700)', cursor: 'pointer'
          }}
        >
          <Glyph name={corner.icon} />
        </button>
      )}
    </div>
  );
}

/** The dashed "make one" tile at the end of the user's row. */
function NewTile({ scale, label, title, onClick }: { scale: number; label: string; title: string; onClick: () => void }) {
  const boxW = Math.round(18 * scale) + 8, boxH = Math.round(28 * scale);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: 4, width: boxW + 12, cursor: 'pointer', border: 'none',
        background: 'var(--cth-paper-100)',
        boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
      }}
    >
      <div style={{ width: boxW, height: boxH, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cth-ink-500)' }}>
        <Glyph name="plus" />
      </div>
      <span style={{ fontSize: scale >= 2 ? 11 : 10, color: 'var(--cth-ink-700)', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}
