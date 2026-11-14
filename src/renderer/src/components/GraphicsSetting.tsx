// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * Settings, General, Environment: the Graphics row (Pam's P6). Auto, GPU or CPU
 * only, staged like every row there and written by the footer Save. Main applies
 * the mode at startup, so a saved change waits for a restart: the row says so and
 * offers one, asking first when agents are running (a restart stops them). The
 * line under it names what really draws the app (the WebGL renderer a floor got,
 * and Chromium's compositing in main), never the setting's wish: a GPU pick that
 * fell back to the processor says so. Words are keyed by kind; main sends none.
 */
import type { CSSProperties, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import {
  DEFAULT_GRAPHICS_MODE, GRAPHICS_MODES, renderingState,
  type GraphicsMode, type GraphicsStatusView
} from '@shared/graphicsMode';
import { currentRendererName } from '../scene/graphicsProbe';

/** How often open Settings re-reads main's status (one call, no WebGL context). */
export const GRAPHICS_REFRESH_MS = 10_000;

/** Whether the saved mode waits for a restart (it differs from the one this run started with). */
export function restartPending(s: Pick<GraphicsStatusView, 'applied' | 'stored'> | null): boolean {
  return !!s && s.applied !== s.stored;
}

/** Main's graphics status while Settings is open, read again every 10 s so a
 *  GPU fallback in the middle of a run shows. The setter takes Save's answer. */
export function useGraphicsStatus(): [GraphicsStatusView | null, (s: GraphicsStatusView) => void] {
  const [status, setStatus] = useState<GraphicsStatusView | null>(null);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      void window.cth.graphicsStatus().then((s) => { if (live) setStatus(s); }).catch(() => { /* the line stays as it is */ });
    };
    refresh();
    const timer = window.setInterval(refresh, GRAPHICS_REFRESH_MS);
    return () => { live = false; window.clearInterval(timer); };
  }, []);
  return [status, setStatus];
}

const MODE_KEY: Record<GraphicsMode, string> = { auto: 'graphics.auto', gpu: 'graphics.gpu', cpu: 'graphics.cpu' };

const line: CSSProperties = { marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--cth-ink-700)' };
const tag: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px',
  color: 'var(--cth-ink-900)', background: 'var(--cth-lemon-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', whiteSpace: 'nowrap',
};

export function GraphicsSetting({ status, pick, onPick, notSaved }: {
  status: GraphicsStatusView | null;
  /** The staged mode, or null when none is staged. */
  pick: GraphicsMode | null;
  onPick: (mode: GraphicsMode | null) => void;
  /** The last Save did not keep the pick: main read back another mode, or the call failed. */
  notSaved: boolean;
}) {
  const { t } = useTranslation();
  // The renderer a floor got, else a throwaway canvas's: read once as Settings opens.
  const [renderer] = useState(currentRendererName);
  // Running agents when restart was pressed and some were running; null when not asking.
  const [confirming, setConfirming] = useState<number | null>(null);
  const stored = status?.stored ?? DEFAULT_GRAPHICS_MODE;
  const shown = pick ?? stored;

  let what: ReactNode = null;
  if (status) {
    const r = renderingState(renderer, status);
    what = r.kind === 'gpu' ? (r.name ? <span dir="ltr">{r.name} (GPU)</span> : t('graphics.onGpuNoName'))
      : r.kind === 'cpu' ? t('graphics.onCpu')
      : r.kind === 'fallback' ? t('graphics.onCpuFallback')
      : t('graphics.unknown');
  }
  const [before, after] = t('graphics.drawing', { what: '\u0001' }).split('\u0001');

  const restart = async () => {
    // Count the running agents now, not when Settings opened (a failed read keeps the last count).
    // With none running there is nothing to stop, so the restart happens at once (Pam).
    const fresh = await window.cth.graphicsStatus().catch(() => null);
    const running = fresh?.runningAgents ?? status?.runningAgents ?? 0;
    if (running > 0) { setConfirming(running); return; }
    void window.cth.restartForGraphics();
  };

  return (
    <div data-graphics-setting="">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>{t('settings.general.graphics')}</span>
          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{t('settings.general.graphicsDesc')}</span>
        </div>
        <div role="radiogroup" aria-label={t('settings.general.graphics')} style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {GRAPHICS_MODES.map((m) => (
            <PixelButton
              key={m}
              variant={shown === m ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => { setConfirming(null); onPick(m === stored ? null : m); }}
            >
              {t(MODE_KEY[m])}
            </PixelButton>
          ))}
        </div>
      </div>
      {what !== null && (
        <div data-graphics-indicator="" style={{ marginTop: 6, fontFamily: 'var(--cth-font-mono)', fontSize: 12, lineHeight: '18px', color: 'var(--cth-ink-700)' }}>
          {before}{what}{after}
        </div>
      )}
      {restartPending(status) && (
        <div data-graphics-restart="" style={line}>
          <span>{confirming !== null ? t('graphics.confirm', { count: confirming }) : t('graphics.restartNeeded', { mode: t(MODE_KEY[stored]) })}</span>
          {confirming !== null ? (
            <>
              <PixelButton variant="primary" size="sm" onClick={() => void window.cth.restartForGraphics()}>{t('graphics.restart')}</PixelButton>
              <PixelButton variant="secondary" size="sm" onClick={() => setConfirming(null)}>{t('graphics.later')}</PixelButton>
            </>
          ) : (
            <PixelButton variant="secondary" size="sm" onClick={() => void restart()}>{t('graphics.restartNow')}</PixelButton>
          )}
        </div>
      )}
      {notSaved && (
        <div role="status" style={line}>
          <span style={tag}>{t('settings.general.graphics')}</span>
          <span>{t('graphics.saveFailed')}</span>
        </div>
      )}
    </div>
  );
}
