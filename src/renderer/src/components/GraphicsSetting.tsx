// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * Settings, General, Graphics:
 * Auto, GPU or CPU only, as three buttons. A staged
 * setting: Save writes it (window.cth.setGraphicsMode) and main applies it
 * from the next start, so after a Save that changes it the row says so and
 * offers a restart, which asks first when agents are running. The line under
 * it names what is ACTUALLY drawing (shared/graphicsMode.ts renderingState):
 * the graphics card by name, or the processor, and says so when it fell back.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GRAPHICS_MODES, renderingState, type GraphicsMode, type GraphicsStatusView, type RenderingState } from '@shared/graphicsMode';
import { currentRendererName } from '@/scene/graphicsProbe';
import { PixelButton } from './PixelButton';
import { useSettingsDraft } from './settings/SettingsFrame';

/** How often the open row re-reads main's status (one IPC call, no WebGL context). */
const REFRESH_MS = 10_000;

export function GraphicsSetting() {
  const { t } = useTranslation();
  const page = useSettingsDraft();
  const [status, setStatus] = useState<GraphicsStatusView | null>(null);
  const [renderer, setRenderer] = useState<string | null>(null);
  /** The mode Save will write, if one waits. */
  const [staged, setStaged] = useState<GraphicsMode | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Chromium's compositing is read fresh each time, so a fallback mid run shows; the renderer once.
    const refresh = () => { void window.cth.graphicsStatus().then(setStatus).catch(() => { /* the line stays as it is */ }); };
    refresh();
    setRenderer(currentRendererName());
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  const stored = status?.stored ?? 'auto';
  const shown = staged && page?.hasTask('graphics:mode') ? staged : stored;
  const label = (m: GraphicsMode) => t(`graphics.${m}`);

  const choose = (mode: GraphicsMode) => {
    setFailed(false);
    setConfirming(false);
    if (mode === stored) { setStaged(null); page?.setTask('graphics:mode', null); return; }
    const save = async () => {
      try { setStatus(await window.cth.setGraphicsMode(mode)); setStaged(null); }
      catch (e) { setFailed(true); throw e; }
    };
    if (!page) { void save().catch(() => {}); return; }
    setStaged(mode);
    page.setTask('graphics:mode', save);
  };

  const restart = async () => {
    if (!confirming) {
      // Count the running agents now, not when the row opened; a failed read asks first too.
      const fresh = await window.cth.graphicsStatus().catch(() => null);
      if (fresh) setStatus(fresh);
      if (!fresh || fresh.runningAgents > 0) { setConfirming(true); return; }
    }
    void window.cth.graphicsRestart();
  };

  const state: RenderingState | null = status ? renderingState(renderer, status) : null;
  const what = !state ? null
    : state.kind === 'gpu' ? (state.name ? <span dir="ltr">{state.name} (GPU)</span> : t('graphics.onGpuNoName'))
    : state.kind === 'cpu' ? t('graphics.onCpu')
    : state.kind === 'fallback' ? t('graphics.onCpuFallback')
    : t('graphics.unknown');
  const [before, after] = t('graphics.drawing', { what: '\u0001' }).split('\u0001');
  const restartPending = !!status && status.applied !== status.stored;

  return (
    <div data-graphics-setting style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.graphics')}</span>
          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{t('settings.general.graphicsDesc')}</span>
        </div>
        <div aria-label={t('settings.general.graphics')} style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
          {GRAPHICS_MODES.map((m) => (
            <PixelButton key={m} variant={shown === m ? 'primary' : 'secondary'} size="sm" dataAttrs={{ 'data-graphics-mode': m }} onClick={() => choose(m)}>
              {label(m)}
            </PixelButton>
          ))}
        </div>
      </div>
      {what !== null && (
        <span data-graphics-indicator style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' }}>{before}{what}{after}</span>
      )}
      {restartPending && !staged && (
        <div data-graphics-restart style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--cth-ink-900)', flexWrap: 'wrap' }}>
          <span>{confirming && status ? t('graphics.confirm', { count: status.runningAgents }) : t('graphics.restartNeeded', { mode: label(stored) })}</span>
          <PixelButton size="sm" variant={confirming ? 'primary' : 'secondary'} onClick={() => void restart()}>{confirming ? t('graphics.restart') : t('graphics.restartNow')}</PixelButton>
          {confirming && <PixelButton variant="secondary" size="sm" onClick={() => setConfirming(false)}>{t('graphics.later')}</PixelButton>}
        </div>
      )}
      {failed && (
        <div role="alert" style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, color: 'var(--cth-ink-900)' }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, lineHeight: '18px', padding: '0 7px', background: 'var(--cth-peach-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)' }}>
            {t('settings.general.graphics')}
          </span>
          <span>{t('graphics.saveFailed')}</span>
        </div>
      )}
    </div>
  );
}
