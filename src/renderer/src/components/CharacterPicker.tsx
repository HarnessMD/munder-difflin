import { useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SpritePortrait } from './SpritePortrait';
import { useStore } from '@/store/store';
import { OFFICE_CAST, type OfficeCharacterName } from '@/scene/office/castRoster';
import type { AccentColorName } from '@/design/tokens';
import { type CustomAvatar, PRESET_COUNT, customAvatarId, isPresetAvatarId, presetAvatarId } from '@shared/avatars';

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

/**
 * The character picker: the fifteen cast members, then the custom avatars in
 * this install's config, then the generated presets. One component for Add
 * Agent and Edit Agent, so the two never drift again.
 */
export function CharacterPicker({ value, onPick, accent, scale = 2, avatars: avatarsProp }: CharacterPickerProps) {
  const { t } = useTranslation();
  const storeAvatars = useStore((s) => s.avatars);
  const avatars = avatarsProp ?? storeAvatars;
  const [presetsOpen, setPresetsOpen] = useState(() => isPresetAvatarId(value));

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

      {avatars.length > 0 && <Group title={t('avatars.picker.yours')}>
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
            />
          );
        })}
      </Group>}

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
            />
          );
        })}
      </Group>

    </div>
  );
}

// ─── pieces ──────────────────────────────────────────────────────────────────

const linkBtn: CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-700)', textDecoration: 'underline'
};

function Group({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{title}</span>
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
}

/** One selectable sprite. The markup and the tokens are the ones the two
 *  modals used for the cast, so the cast looks exactly as it did. */
function Tile({ active, accent, scale, character, label, title, onClick }: TileProps) {
  const boxW = Math.round(18 * scale) + 8, boxH = Math.round(28 * scale);
  return (
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
        <SpritePortrait character={character} scale={scale} />
      </div>
      <span style={{
        fontSize: scale >= 2 ? 11 : 10, color: 'var(--cth-ink-700)', maxWidth: boxW + 4,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>{label}</span>
    </button>
  );
}
