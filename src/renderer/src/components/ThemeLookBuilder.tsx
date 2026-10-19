// Ported from Prozzta/guppyos 02d0d50b (MIT).
import type { CSSProperties } from 'react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SpritePortrait } from './SpritePortrait';
import type { OfficeCharacterName } from '@/scene/office/cast';
import { LOOK_PARTS, type LookPart } from '@/scene/themes/manifest';
import { bodiesOf, pickBody, pickPreset, resolveLook, draftToLook, setColour, type LookDraft } from '@/scene/themes/looks';
import { lookColumn } from '@/scene/themes/lookArt';
import type { ThemeLooks } from '@/scene/themes/themeCatalog';

export interface ThemeLookBuilderProps {
  looks: ThemeLooks;
  draft: LookDraft;
  onChange: (d: LookDraft) => void;
  /** A premade was picked; `name` is its label (the caller decides whether to use it). */
  onPreset?: (name: string | undefined) => void;
  /** A stable Office-compatible fallback identity for the portrait API. */
  character: OfficeCharacterName;
}

const lab: CSSProperties = { fontSize: 11, color: 'var(--cth-ink-700)', fontWeight: 600 };
const chip = (active: boolean): CSSProperties => ({
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: 4, border: 'none', cursor: 'pointer',
  font: 'inherit', color: 'var(--cth-ink-900)',
  background: active ? 'var(--cth-sky-light)' : 'var(--cth-cream-100)',
  boxShadow: active ? 'inset 0 0 0 1.5px var(--cth-ink-500)' : 'inset 0 0 0 1px var(--cth-ink-100)',
});
const chipName: CSSProperties = { fontSize: 11, lineHeight: '14px', whiteSpace: 'nowrap' };

/** The front frame of the draft, large: the live preview of the floor sprite. */
function FramePreview({ looks, draft, scale }: { looks: ThemeLooks; draft: LookDraft; scale: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { frameWidth: fw, frameHeight: fh, rows } = looks.sprite;
  const r = resolveLook(looks.builder, looks.columns, draftToLook(draft), '');
  const key = [r.body.id, r.colors.skin, r.colors.shirt, r.colors.hair].join('|');
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, g.canvas.width, g.canvas.height);
    g.drawImage(lookColumn(looks, r.body, r.colors), 0, rows.down * fh, fw, fh, 0, 0, fw * scale, fh * scale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, looks, scale]);
  return <canvas ref={ref} width={fw * scale} height={fh * scale} style={{ width: fw * scale, height: fh * scale, imageRendering: 'pixelated', display: 'block' }} />;
}

/** The theme's character builder (Pam's P3): body, colours, presets, with a live
 *  preview. It takes the Character row's place on a pack's floor; Add and Edit
 *  save its draft the same way. Body, swatch and preset names come from the pack
 *  and stay as written there. */
export function ThemeLookBuilder({ looks, draft, onChange, onPreset, character }: ThemeLookBuilderProps) {
  const { t } = useTranslation();
  const b = looks.builder, cols = looks.columns;
  const bodies = bodiesOf(b, cols);
  const body = bodies.find((x) => x.id === draft.bodyId) ?? bodies[0];
  const parts = LOOK_PARTS.filter((p) => body.parts?.[p]);
  const custom = b?.customColours !== false;
  const partLabel: Record<LookPart, string> = { skin: t('looks.skin'), shirt: t('looks.shirt'), hair: t('looks.hair') };

  return (
    <div data-look-builder={looks.themeId} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 8, boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)' }}>
      <div>
        <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px', color: 'var(--cth-ink-700)', textTransform: 'uppercase' }}>
          {t('looks.title', { theme: looks.label })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('looks.sub', { theme: looks.label })}</div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 6,
          background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
        }}>
          <FramePreview looks={looks} draft={draft} scale={3} />
          <SpritePortrait draft={draft} character={character} themeId={looks.themeId} scale={2} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: 1 }}>
          <div style={lab}>{t('looks.body')}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {bodies.map((x) => (
              <button key={x.id} type="button" style={chip(x.id === draft.bodyId)} aria-pressed={x.id === draft.bodyId}
                onClick={() => onChange(pickBody(b, cols, draft, x.id))}>
                <SpritePortrait draft={pickBody(b, cols, draft, x.id)} character={character} themeId={looks.themeId} scale={1.5} />
                <small dir="ltr" style={chipName}>{x.label}</small>
              </button>
            ))}
          </div>
          {parts.length > 0 && (
            <>
              <div style={{ ...lab, marginTop: 4 }}>{t('looks.colours')}</div>
              {parts.map((p) => {
                const sw = Object.entries(b?.swatches?.[p] ?? {});
                return (
                  <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--cth-ink-700)', minWidth: 72 }}>{partLabel[p]}</span>
                    {sw.map(([n, c]) => (
                      <button key={n} type="button" title={n} aria-label={`${partLabel[p]}: ${n}`} aria-pressed={draft.colors[p] === c}
                        onClick={() => onChange(setColour(b, cols, draft, p, c))}
                        style={{ width: 20, height: 20, padding: 0, border: 'none', cursor: 'pointer', background: c,
                          boxShadow: draft.colors[p] === c ? 'inset 0 0 0 1.5px var(--cth-ink-500), 0 0 0 2px var(--cth-ink-900)' : 'inset 0 0 0 1px var(--cth-ink-300)' }} />
                    ))}
                    {custom && (
                      <input type="color" aria-label={`${partLabel[p]}: ${t('looks.custom')}`} title={t('looks.custom')}
                        value={/^#[0-9a-f]{6}$/i.test(draft.colors[p]) ? draft.colors[p] : '#000000'}
                        onChange={(e) => onChange(setColour(b, cols, draft, p, e.target.value))}
                        style={{ width: 28, height: 22, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                    )}
                  </div>
                );
              })}
            </>
          )}
          {!!b?.presets?.length && (
            <>
              <div style={{ ...lab, marginTop: 4 }}>{t('looks.presets')}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {b.presets.map((p) => {
                  const picked = pickPreset(b, cols, draft, p.id);
                  return (
                    <button key={p.id} type="button" style={chip(draft.presetId === p.id)} aria-pressed={draft.presetId === p.id}
                      onClick={() => { onChange(picked.draft); onPreset?.(picked.name); }}>
                      <SpritePortrait draft={picked.draft} character={character} themeId={looks.themeId} scale={1.5} />
                      <small dir="ltr" style={chipName}>{p.label ?? p.id}</small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
