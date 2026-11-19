import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { hiveFolderName } from '@shared/hivePaths';
import { PixelPanel } from './PixelPanel';
import { PixelButton } from './PixelButton';
import { Icon } from './Icon';
import type { HarnessConfig } from '@/store/config';

export interface NewFloorPickerProps {
  config: HarnessConfig;
  onClose: () => void;
}

type Probe = { path: string; state: 'free' | 'current' | 'held' | 'missing'; lock?: { pid: number; since: string } };

/**
 * NewFloorPicker (0.5.3, B21, founder 23 Sep 2026): "New Floor" asks where to
 * start instead of opening a second window of the same floor. The choice is a
 * folder: one of the remembered hives, an existing folder on disk, or a new
 * one (the OS dialog can create it; main lays the hive inside). The floor
 * this window is on is listed but cannot be picked (it is open here), and a
 * folder another live floor holds says so (B23, the floor lock). Main opens
 * the chosen folder in a floor of its own; this modal only picks.
 */
export function NewFloorPicker({ config, onClose }: NewFloorPickerProps) {
  const { t } = useTranslation();
  const current = config.harnessHome ?? null;
  const recents = (config.recentHives ?? []).filter((h) => !!h);
  const [probes, setProbes] = useState<Record<string, Probe>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const paths = [...(current ? [current] : []), ...recents];
    if (paths.length === 0) return;
    void window.cth.floorProbe(paths).then((list) => {
      if (!live) return;
      const next: Record<string, Probe> = {};
      for (const p of list) next[p.path] = p;
      setProbes(next);
    }).catch(() => undefined);
    return () => { live = false; };
    // The lists come from config, which does not change while the modal is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const open = async (path: string) => {
    if (!path || busy) return;
    setError(null);
    setBusy(path);
    try {
      const r = await window.cth.floorOpen({ harnessHome: path });
      if (r.ok) { onClose(); return; }
      setError(refusalText(t, r.refusal, r.lock, r.detail));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  };

  const browse = async () => {
    setError(null);
    const res = await window.cth.chooseFolder();
    if (res.ok) void open(res.path);
    else if (res.error !== 'cancelled') setError(res.error);
  };

  const stateLabel = (path: string): string => {
    const p = probes[path];
    if (!p) return '';
    if (p.state === 'current') return t('newFloor.openHere');
    if (p.state === 'held') return t('newFloor.openElsewhere', { pid: p.lock?.pid ?? '?' });
    if (p.state === 'missing') return t('newFloor.missing');
    return t('newFloor.free');
  };
  const pickable = (path: string): boolean => {
    const p = probes[path];
    return !p || p.state === 'free';
  };

  const rows = [...(current ? [current] : []), ...recents.filter((h) => h !== current)];

  return (
    <div
      onClick={() => { if (!busy) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(26, 19, 32, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 900
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 560, maxWidth: '94vw' }}>
        <PixelPanel variant="dialog" title={t('newFloor.title')} noPadding>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: '19px', color: 'var(--cth-ink-700)' }}>
              {t('newFloor.blurb')}
            </p>

            {rows.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 9, color: 'var(--cth-ink-500)', marginBottom: 4 }}>
                  {t('newFloor.remembered')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                  {rows.map((h) => {
                    const can = pickable(h);
                    return (
                      <button
                        key={h}
                        onClick={() => { if (can) void open(h); }}
                        disabled={!!busy || !can}
                        title={h}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                          background: h === current ? 'var(--cth-mint-light)' : 'var(--cth-paper-100)',
                          boxShadow: `inset 0 0 0 1px ${h === current ? 'var(--cth-mint)' : 'var(--cth-ink-300)'}`,
                          border: 'none', cursor: can && !busy ? 'pointer' : 'default', textAlign: 'left',
                          opacity: (busy && busy !== h) || !can ? 0.6 : 1
                        }}
                      >
                        <Icon name="folder" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
                            {hiveFolderName(h)}
                          </div>
                          <div style={{
                            fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'rtl', textAlign: 'left'
                          }}>{h}</div>
                        </div>
                        <span style={{ fontSize: 11, color: can ? 'var(--cth-ink-500)' : 'var(--cth-coral)', flexShrink: 0 }} data-floor-state={probes[h]?.state ?? 'unknown'}>
                          {busy === h ? t('newFloor.opening') : stateLabel(h)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                padding: '6px 10px', background: 'var(--cth-coral-light)',
                boxShadow: 'inset 0 0 0 1px var(--cth-coral)', fontSize: 12, color: 'var(--cth-ink-900)'
              }} data-floor-error>{error}</div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <PixelButton variant="secondary" size="md" onClick={onClose} disabled={!!busy}>
                {t('common.cancel')}
              </PixelButton>
              <PixelButton variant="secondary" size="md" onClick={browse} disabled={!!busy}>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Icon name="folder" /> {t('newFloor.openExisting')}
                </span>
              </PixelButton>
              <PixelButton variant="primary" size="md" onClick={browse} disabled={!!busy}>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Icon name="plus" /> {t('newFloor.createNew')}
                </span>
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}

function refusalText(t: (k: string, o?: Record<string, unknown>) => string, refusal: string, lock?: { pid: number; since: string }, detail?: string): string {
  switch (refusal) {
    case 'current': return t('newFloor.errCurrent');
    case 'held': return t('newFloor.errHeld', { pid: lock?.pid ?? '?' });
    case 'same-data-dir': return t('newFloor.errSameData');
    case 'no-spawner': return t('newFloor.errNoSpawner');
    case 'mkdir-failed': return t('newFloor.errMkdir', { detail: detail ?? '' });
    case 'spawn-failed': return t('newFloor.errSpawn', { detail: detail ?? '' });
    default: return t('newFloor.errInvalid');
  }
}
