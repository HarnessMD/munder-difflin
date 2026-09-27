/**
 * THE STAPLER PANEL'S SMALL PARTS (0.5.3 settings redesign, founder 24 Sep:
 * "compact and minimal without compromising the details ... expandable
 * sections and tooltips for explanation").
 *
 *   Group       a collapsible section. Its open state is a per viewer
 *               convenience kept in localStorage, never config.
 *   Info        the (i) that carries what used to be a paragraph under a
 *               field: a native tooltip, and the same words for a screen
 *               reader.
 *   Line        one setting on one line: label, (i), control on the right.
 *   ChordBox    a hotkey picked from the shared preset list, drawn in the
 *               PRO select. The rules (which chords, which is the default,
 *               how a custom one shows) are shared/hotkeyPresets.ts, the
 *               same ones Settings, Dictation & Meetings uses.
 *   useTranscribeShared  the values this panel shares with Settings, Voice
 *               and Dictation & Meetings: read from the live config (every
 *               write is pushed to every window as config:changed) with this
 *               screen's unsaved changes laid over them, and written on the
 *               screen's one Save through transcribe:setConfig, the one door
 *               Settings uses. So a saved change on either screen shows on
 *               the other.
 *
 * Local on purpose: the settings frame is building its own collapsible and
 * tooltip primitives; when they land these become thin wrappers over them.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { DEFAULT_TRANSCRIBE, type TranscribeConfig } from '@shared/transcribeConfig';
import { usePendingPatch } from '../../settings/SettingsFrame';
import { chordLabel, chordPresets, chordWords, presetFor, type ChordField } from '@shared/hotkeyPresets';
import { ProIcon } from '../icons';
import { SelectBox } from '../ui';

const LS_PREFIX = 'cth.staplerGroup.';

export function Group({ id, icon, title, info, defaultOpen = false, children }: {
  id: string; icon?: ReactNode; title: string; info?: string; defaultOpen?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    try { const v = window.localStorage.getItem(LS_PREFIX + id); return v === null ? defaultOpen : v === '1'; } catch { return defaultOpen; }
  });
  const flip = () => {
    const next = !open;
    setOpen(next);
    try { window.localStorage.setItem(LS_PREFIX + id, next ? '1' : '0'); } catch { /* a convenience only */ }
  };
  return (
    <section data-stapler-group={id} style={{ border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-50)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px' }}>
        <button
          type="button" aria-expanded={open} onClick={flip}
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', font: 'inherit', color: 'var(--cth-ink-900)', textAlign: 'start' }}
        >
          {icon}
          <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
          <span style={{ flex: 1 }} />
          <ProIcon name={open ? 'chevronUp' : 'chevronDown'} size={14} style={{ opacity: 0.7 }} />
        </button>
        {info && <Info text={info} />}
      </div>
      {open && (
        <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'inset 0 1px 0 var(--cth-ink-300)', paddingTop: 10 }}>
          {children}
        </div>
      )}
    </section>
  );
}

export function Info({ text }: { text: string }) {
  return (
    <span
      role="img" aria-label={text} title={text} tabIndex={0} data-stapler-info
      style={{
        display: 'inline-grid', placeItems: 'center', width: 15, height: 15, borderRadius: 999, flexShrink: 0, cursor: 'help',
        border: '1px solid var(--cth-ink-300)', color: 'var(--cth-ink-500)', fontSize: 10, fontWeight: 600, lineHeight: 1, fontStyle: 'italic'
      }}
    >i</span>
  );
}

export function Line({ label, info, children, stack }: { label: string; info?: string; children: ReactNode; stack?: boolean }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexDirection: stack ? 'column' : 'row', alignItems: stack ? 'stretch' : 'center', gap: stack ? 6 : 10, minWidth: 0, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--cth-ink-900)', flex: stack ? undefined : '1 1 160px', minWidth: 0 }}>
        {label}{info && <Info text={info} />}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: stack ? 'wrap' : 'nowrap', minWidth: 0, justifyContent: stack ? 'flex-start' : 'flex-end' }}>{children}</span>
    </div>
  );
}

export function ChordBox({ field, platform, stored, fallback, ariaLabel, onPick }: {
  field: ChordField; platform: string; stored: string; fallback: string; ariaLabel: string;
  onPick: (chord: string, isDefault: boolean) => void;
}) {
  const { t } = useTranslation();
  const current = stored.trim() || fallback;
  const preset = presetFor(field, platform, current);
  const def = presetFor(field, platform, fallback);
  const options = [
    ...(preset ? [] : [{ value: `custom:${current}`, label: t('settings.transcribe.chordCustom', { chord: chordLabel(current, platform) }) }]),
    ...chordPresets(field, platform).map((c) => ({
      value: c,
      label: `${chordLabel(c, platform)}  ${chordWords(c, platform)}${def === c ? `  ${t('settings.transcribe.chordDefault')}` : ''}`
    }))
  ];
  return (
    <SelectBox<string>
      value={preset ?? `custom:${current}`} ariaLabel={ariaLabel} options={options} style={{ maxWidth: 320 }}
      onChange={(v) => { if (!v.startsWith('custom:')) onPick(v, def === v); }}
    />
  );
}

type TranscribeStatus = Awaited<ReturnType<typeof window.cth.transcribeStatus>>;
type AnyAppStatus = Awaited<ReturnType<typeof window.cth.anyAppStatus>>;

export function useTranscribeShared(config: HarnessConfig | null) {
  const live: TranscribeConfig = config?.transcribe ?? DEFAULT_TRANSCRIBE;
  const [status, setStatus] = useState<TranscribeStatus | null>(null);
  const [anyApp, setAnyApp] = useState<AnyAppStatus | null>(null);
  useEffect(() => {
    let on = true;
    void window.cth.transcribeStatus?.().then((s) => { if (on) setStatus(s); }).catch(() => { /* status is a nicety */ });
    void window.cth.anyAppStatus?.().then((s) => { if (on) setAnyApp(s); }).catch(() => { /* not on this platform */ });
    return () => { on = false; };
  }, []);
  // Staged until the screen's Save, which sends the patch as the task
  // 'transcribe' (a failure stays staged and is named in the footer).
  const { view: cfg, change: save } = usePendingPatch<TranscribeConfig>('transcribe', live, async (patch) => {
    const r = await window.cth.transcribeSetConfig(patch);
    setStatus(r.status);
    if (window.cth.anyAppStatus) { try { setAnyApp(await window.cth.anyAppStatus()); } catch { /* keep */ } }
  });
  const platform = status?.platform ?? window.cth.platform ?? 'darwin';
  return { cfg, status, anyApp, save, platform };
}
