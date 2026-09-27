/**
 * DICTATION AND MEETINGS (0.5.3, F16, founder 23 Sep 2026): the Settings
 * section for the local recognisers. What transcribes on this machine and
 * which engine each job gets, the whisper model (bundled base, optional small
 * download), the push to talk key and the any app switch on macOS, and the
 * vocabulary: the shipped list of names people in tech say, and the user's
 * own words. The engines read the words live; the whisper count shown here
 * is what fits its 224 token prompt, the rest reach Apple's engine whole.
 *
 * Since 0.5.3 every control waits for the page's one Save, which sends the
 * changes through transcribe:setConfig; main then re-arms the keys. Nothing here touches the Groq key, which stays
 * under Voice as the fallback it is.
 */
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { DEFAULT_TRANSCRIBE, cleanCustomWords, type TranscribeConfig, type TranscribeEngine, type TranscribeModel } from '@shared/transcribeConfig';
import { DEFAULT_TRANSCRIBE_VOCABULARY } from '@shared/transcribeVocabulary';
import { systemAudioLine, systemAudioStateKey } from '@shared/systemAudioLine';
import { captureHotkeyLine, meetingHotkeyLine } from '@shared/meetingHotkeyLine';
import { defaultCaptureKey, defaultMeetingKey, defaultPushToTalkKey, isHoldKey } from '@shared/hotkeyName';
import { chordLabel, chordPresets, chordWords, presetFor, type ChordField } from '@shared/hotkeyPresets';
import { Btn } from './pro/ui';
import { usePendingPatch, useSettingsDraft } from './settings/SettingsFrame';

type Status = Awaited<ReturnType<typeof window.cth.transcribeStatus>>;
type AnyAppStatus = Awaited<ReturnType<typeof window.cth.anyAppStatus>>;
type SystemAudioStatus = Awaited<ReturnType<typeof window.cth.systemAudioStatus>>;
type MeetingHotkeyStatus = Awaited<ReturnType<typeof window.cth.meetingHotkeyStatus>>;

const inputStyle: CSSProperties = {
  width: '100%', padding: '6px 8px', background: 'var(--cth-paper-100)', border: 'none',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)', fontFamily: 'var(--cth-font-ui)', fontSize: 12,
  color: 'var(--cth-ink-900)', outline: 'none', borderRadius: 4
};
const labelStyle: CSSProperties = { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--cth-ink-500)' };
const headStyle: CSSProperties = { fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' };
const hintStyle: CSSProperties = { fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' };
const rowStyle: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };
const colStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };

/** `groqFields`: the Groq key and model (Settings draws them, it owns their
 *  draft task). Shown directly under the engine list while Groq is the engine
 *  picked, saved or waiting for Save (founder, 25 Sep: under the dropdown). */
export function TranscribeSettings({ config, groqFields }: { config: HarnessConfig; groqFields?: ReactNode }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status | null>(null);
  const [anyApp, setAnyApp] = useState<AnyAppStatus | null>(null);
  const [sysAudio, setSysAudio] = useState<SystemAudioStatus | null>(null);
  const [hotkey, setHotkey] = useState<MeetingHotkeyStatus | null>(null);
  const [capture, setCapture] = useState<MeetingHotkeyStatus | null>(null);
  const [wordsText, setWordsText] = useState((config.transcribe?.customWords ?? []).join('\n'));
  const [note, setNote] = useState('');
  const [download, setDownload] = useState<{ received: number; total: number | null } | null>(null);

  const refreshSysAudio = useCallback(async () => {
    if (!window.cth.systemAudioStatus) return;
    try { setSysAudio(await window.cth.systemAudioStatus()); } catch { setSysAudio(null); }
    if (window.cth.meetingHotkeyStatus) { try { setHotkey(await window.cth.meetingHotkeyStatus()); } catch { setHotkey(null); } }
    if (window.cth.captureHotkeyStatus) { try { setCapture(await window.cth.captureHotkeyStatus()); } catch { setCapture(null); } }
  }, []);
  const refresh = useCallback(async () => {
    try { setStatus(await window.cth.transcribeStatus()); } catch { setStatus(null); }
    if (window.cth.anyAppStatus) { try { setAnyApp(await window.cth.anyAppStatus()); } catch { setAnyApp(null); } }
    await refreshSysAudio();
  }, [refreshSysAudio]);
  useEffect(() => { void refresh(); }, [refresh]);
  // The other side's state follows the machine while this section is open:
  // a monitor that appears when PipeWire starts, a grant given in System
  // Settings, without reopening anything. One cheap call every three seconds.
  useEffect(() => { const id = setInterval(() => { void refreshSysAudio(); }, 3000); return () => clearInterval(id); }, [refreshSysAudio]);
  useEffect(() => window.cth.onTranscribeDownloadProgress?.((p) => setDownload({ received: p.received, total: p.total })) ?? undefined, []);

  // 0.5.3, one Save: a change here is a patch over the LIVE config.transcribe
  // (the Stapler writes it too, and every untouched field keeps following it).
  // The footer Save sends the patch through transcribeSetConfig, which re-arms
  // the dictation, meeting and capture keys and records `chosen`.
  const page = useSettingsDraft();
  const live = config.transcribe ?? DEFAULT_TRANSCRIBE;
  const { view: cfg, pending, change: save } = usePendingPatch<TranscribeConfig>('transcribe', live, async (patch) => {
    const r = await window.cth.transcribeSetConfig(patch);
    setStatus(r.status);
    if (window.cth.anyAppStatus) { try { setAnyApp(await window.cth.anyAppStatus()); } catch { /* keep */ } }
    await refreshSysAudio();
  });
  const waiting = Object.keys(pending).length > 0;
  // Only the model download holds the controls now; every change waits for Save.
  const busy = download !== null;
  // The words box follows the live list unless an edit to it is waiting.
  useEffect(() => { if (!('customWords' in pending)) setWordsText(live.customWords.join('\n')); }, [live.customWords]); // eslint-disable-line react-hooks/exhaustive-deps
  const onWords = (text: string) => {
    setWordsText(text);
    save({ customWords: cleanCustomWords(text) });
  };

  const fetchSmall = async () => {
    setDownload({ received: 0, total: null });
    const r = await window.cth.transcribeDownloadModel('small');
    setDownload(null);
    if (r.ok) { save({ model: 'small' }); }
    else setNote(t('settings.transcribe.downloadFailed', { error: r.error }));
  };

  const engineName = (e: 'apple' | 'whisper' | 'groq' | null): string =>
    e === 'apple' ? t('settings.transcribe.engineApple') : e === 'whisper' ? t('settings.transcribe.engineWhisper') : e === 'groq' ? t('settings.transcribe.engineGroq') : t('settings.transcribe.engineNone');
  const isMac = status?.platform === 'darwin';
  // The chord lists are per platform; before the status is read the helper's
  // own answer, then this renderer's, decide which.
  const platform = status?.platform ?? hotkey?.platform ?? window.cth.platform ?? 'darwin';
  const smallInstalled = status?.model.installed.small ?? false;
  const percent = download && download.total ? Math.round(100 * download.received / download.total) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* What runs here */}
      <div style={colStyle}>
        <span style={headStyle}>{t('settings.transcribe.title')}</span>
        <span style={hintStyle}>{t('settings.transcribe.blurb')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 12, rowGap: 4, fontSize: 12 }}>
        <span style={labelStyle}>{t('settings.transcribe.dictationUses')}</span>
        <span data-transcribe-dictation-engine>{engineName(status?.chosen.dictation ?? null)}</span>
        <span style={labelStyle}>{t('settings.transcribe.meetingsUse')}</span>
        <span data-transcribe-meeting-engine>{engineName(status?.chosen.meeting ?? null)}</span>
      </div>

      {/* Engine */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 320 }}>
        <span style={labelStyle}>{t('settings.transcribe.engine')}</span>
        <select value={cfg.engine} disabled={busy} onChange={(e) => save({ engine: e.target.value as TranscribeEngine })} style={inputStyle} data-transcribe-engine>
          <option value="auto">{t('settings.transcribe.engineAuto')}</option>
          <option value="apple" disabled={!status?.engines.apple}>{t('settings.transcribe.engineApple')}{status && !status.engines.apple ? ` (${t('settings.transcribe.needsMac26')})` : ''}</option>
          <option value="whisper" disabled={!status?.engines.whisper}>{t('settings.transcribe.engineWhisper')}</option>
          {/* Always selectable (batch 3): picking Groq is what shows its key
              and model below, so a missing key cannot lock the choice. */}
          <option value="groq">{t('settings.transcribe.engineGroq')}{status && !status.engines.groq ? ` (${t('settings.transcribe.needsGroqKey')})` : ''}</option>
        </select>
        <span style={hintStyle}>{t('settings.transcribe.engineHint')}</span>
      </label>
      {cfg.engine === 'groq' && groqFields}

      {/* Model */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={labelStyle}>{t('settings.transcribe.model')}</span>
        <div style={rowStyle}>
          <div style={colStyle}>
            <span style={headStyle}>{t('settings.transcribe.modelBase')}</span>
            <span style={hintStyle}>{t('settings.transcribe.modelBaseDesc')}</span>
          </div>
          <Btn size="sm" kind={cfg.model === 'base' ? 'primary' : 'default'} disabled={busy || cfg.model === 'base'} onClick={() => save({ model: 'base' })}>
            {cfg.model === 'base' ? t('settings.transcribe.inUse') : t('settings.transcribe.use')}
          </Btn>
        </div>
        <div style={rowStyle}>
          <div style={colStyle}>
            <span style={headStyle}>{t('settings.transcribe.modelSmall')}</span>
            <span style={hintStyle}>{t('settings.transcribe.modelSmallDesc')}</span>
          </div>
          {smallInstalled ? (
            <Btn size="sm" kind={cfg.model === 'small' ? 'primary' : 'default'} disabled={busy || cfg.model === 'small'} onClick={() => save({ model: 'small' as TranscribeModel })}>
              {cfg.model === 'small' ? t('settings.transcribe.inUse') : t('settings.transcribe.use')}
            </Btn>
          ) : download ? (
            <span style={hintStyle} data-transcribe-download>{percent === null ? t('settings.transcribe.downloading') : t('settings.transcribe.downloadingPct', { pct: percent })}</span>
          ) : (
            <Btn size="sm" disabled={busy} onClick={() => void fetchSmall()}>{t('settings.transcribe.download')}</Btn>
          )}
        </div>
      </div>

      {/* The other side of calls (F16, PR 5) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={rowStyle}>
          <div style={colStyle}>
            <span style={headStyle}>{t('settings.transcribe.meetingSystemAudio')}</span>
            <span style={hintStyle}>{t('settings.transcribe.meetingSystemAudioDesc')}</span>
          </div>
          <Btn size="sm" kind={cfg.meetingSystemAudio ? 'primary' : 'default'} disabled={busy} onClick={() => save({ meetingSystemAudio: !cfg.meetingSystemAudio })} data-system-audio-switch>
            {cfg.meetingSystemAudio ? t('common.on') : t('common.off')}
          </Btn>
        </div>
        {sysAudio && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <span data-system-audio-state={systemAudioStateKey(sysAudio)}>{systemAudioLine(t, sysAudio)}</span>
            {sysAudio.platform === 'darwin' && sysAudio.available && !sysAudio.granted && (
              <>
                <Btn size="sm" onClick={() => { void window.cth.systemAudioRequest().then(refreshSysAudio); }}>{t('settings.transcribe.allow')}</Btn>
                <Btn size="sm" kind="ghost" onClick={() => { void window.cth.systemAudioOpenSettings(); }}>{t('settings.transcribe.openSystemSettings')}</Btn>
              </>
            )}
          </div>
        )}
      </div>

      {/* The meeting chord (F16, founder 23 Sep) */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 320 }}>
        <span style={labelStyle}>{t('settings.transcribe.meetingKey')}</span>
        <ChordSelect
          field="meeting" platform={platform} stored={cfg.meetingKey} fallback={hotkey?.defaultKey ?? defaultMeetingKey(platform)} disabled={busy}
          onPick={(v, isDefault) => { const stored = isDefault ? '' : v; if (stored !== cfg.meetingKey) save({ meetingKey: stored }); }}
          data="data-meeting-key"
        />
        <span style={hintStyle}>{t('settings.transcribe.meetingKeyHint')}</span>
        {(() => {
          const line = meetingHotkeyLine(t, hotkey);
          return line.text ? <span data-meeting-key-state={hotkey?.armed ? 'armed' : hotkey?.reason ?? ''} style={{ ...hintStyle, color: line.bad ? 'var(--cth-status-blocked)' : hintStyle.color }}>{line.text}</span> : null;
        })()}
      </label>

      {/* The capture chord (I6, founder 23 Sep): Control+Shift+5 Mac, Control+Shift+PrintScreen Windows and Linux */}
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 320 }}>
        <span style={labelStyle}>{t('settings.transcribe.captureKey')}</span>
        <ChordSelect
          field="capture" platform={platform} stored={cfg.captureKey} fallback={capture?.defaultKey ?? defaultCaptureKey(platform)} disabled={busy}
          onPick={(v, isDefault) => { const stored = isDefault ? '' : v; if (stored !== cfg.captureKey) save({ captureKey: stored }); }}
          data="data-capture-key"
        />
        <span style={hintStyle}>{t('settings.transcribe.captureKeyHint')}</span>
        {(() => {
          const line = captureHotkeyLine(t, capture);
          return line.text ? <span data-capture-key-state={capture?.armed ? 'armed' : capture?.reason ?? ''} style={{ ...hintStyle, color: line.bad ? 'var(--cth-status-blocked)' : hintStyle.color }}>{line.text}</span> : null;
        })()}
      </label>

      {/* Any app dictation: macOS, and Windows and Linux X11 from 23 Sep (F16).
          The row shows why the switch is off when it is: this window is a
          floor (the main floor owns the key), no helper in this build, or a
          Wayland session. */}
      {(isMac || anyApp) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={rowStyle}>
            <div style={colStyle}>
              <span style={headStyle}>{t('settings.transcribe.anyApp')}</span>
              <span style={hintStyle}>{t('settings.transcribe.anyAppDesc')}</span>
              {anyApp && !anyApp.available && anyApp.reason && (
                <span style={{ ...hintStyle, color: 'var(--cth-coral)' }} data-transcribe-anyapp-reason={anyApp.reason}>
                  {anyApp.reason === 'floor' ? t('settings.transcribe.anyAppReasonFloor') : anyApp.reason === 'wayland' ? t('settings.transcribe.anyAppReasonWayland') : t('settings.transcribe.anyAppReasonNoHelper')}
                </span>
              )}
              {anyApp?.available && anyApp.transcriber && anyApp.transcriber !== 'apple' && (
                <span style={hintStyle} data-transcribe-anyapp-engine={anyApp.transcriber}>{t('settings.transcribe.anyAppEngineFile', { engine: anyApp.transcriber })}</span>
              )}
            </div>
            <Btn size="sm" kind={cfg.anyApp ? 'primary' : 'default'} disabled={busy || !(anyApp?.available ?? false)} onClick={() => save({ anyApp: !cfg.anyApp })}>
              {cfg.anyApp ? t('common.on') : t('common.off')}
            </Btn>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 320 }}>
            <span style={labelStyle}>{t('settings.transcribe.pushToTalkKey')}</span>
            <ChordSelect
              field="pushToTalk" platform={platform} stored={cfg.pushToTalkKey} fallback={defaultPushToTalkKey(platform)} disabled={busy}
              onPick={(v) => { if (v !== cfg.pushToTalkKey) save({ pushToTalkKey: v }); }}
              data="data-transcribe-key"
            />
            <span style={hintStyle}>{t('settings.transcribe.pushToTalkHint')}</span>
          </label>
          {/* Start and stop sounds (0.5.3, founder 24 Sep): played by the Stapler. */}
          <div style={rowStyle}>
            <div style={colStyle}>
              <span style={headStyle}>{t('settings.transcribe.dictationSounds')}</span>
              <span style={hintStyle}>{t('settings.transcribe.dictationSoundsDesc')}</span>
            </div>
            <Btn size="sm" kind={cfg.dictationSounds ? 'primary' : 'default'} disabled={busy} onClick={() => save({ dictationSounds: !cfg.dictationSounds })} dataAttrs={{ 'data-dictation-sounds': cfg.dictationSounds ? 'on' : 'off' }}>
              {cfg.dictationSounds ? t('common.on') : t('common.off')}
            </Btn>
          </div>
          {anyApp && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', fontSize: 12 }}>
              <span data-transcribe-perm-mic>
                {t('settings.transcribe.permMic')}: {anyApp.permissions?.mic === 'authorized' ? t('settings.transcribe.granted') : t('settings.transcribe.notGranted')}
              </span>
              {anyApp.permissions?.mic !== 'authorized' && (
                <Btn size="sm" onClick={() => { void window.cth.anyAppRequestMic().then(refresh); }}>{t('settings.transcribe.allow')}</Btn>
              )}
              <span data-transcribe-perm-ax>
                {t('settings.transcribe.permAccessibility')}: {anyApp.permissions?.accessibility ? t('settings.transcribe.granted') : t('settings.transcribe.notGranted')}
              </span>
              {!anyApp.permissions?.accessibility && (
                <Btn size="sm" onClick={() => { void window.cth.anyAppRequestAccessibility().then(refresh); }}>{t('settings.transcribe.allow')}</Btn>
              )}
              <Btn size="sm" kind="ghost" onClick={() => { void window.cth.anyAppOpenSettings('accessibility'); }}>{t('settings.transcribe.openSystemSettings')}</Btn>
              {anyApp.permissions?.accessibility && (
                <Btn size="sm" kind="ghost" onClick={() => { void window.cth.anyAppTestPaste(); }}>{t('settings.transcribe.testPaste')}</Btn>
              )}
            </div>
          )}
        </div>
      )}

      {/* Vocabulary */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={rowStyle}>
          <div style={colStyle}>
            <span style={headStyle}>{t('settings.transcribe.vocabulary')}</span>
            <span style={hintStyle}>{t('settings.transcribe.vocabularyDesc', { count: DEFAULT_TRANSCRIBE_VOCABULARY.length })}</span>
          </div>
          <Btn size="sm" kind={cfg.defaultVocabulary ? 'primary' : 'default'} disabled={busy} onClick={() => save({ defaultVocabulary: !cfg.defaultVocabulary })}>
            {cfg.defaultVocabulary ? t('common.on') : t('common.off')}
          </Btn>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={labelStyle}>{t('settings.transcribe.customWords')}</span>
          <textarea
            value={wordsText}
            onChange={(e) => onWords(e.target.value)}
            placeholder={t('settings.transcribe.customWordsPlaceholder')}
            rows={5}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--cth-font-mono)', lineHeight: '18px' }}
            data-transcribe-words
          />
          <span style={hintStyle} data-transcribe-words-count>
            {status ? t('settings.transcribe.wordsCount', { total: status.words.total, custom: status.words.custom, whisper: status.words.whisperKept }) : ''}
          </span>
        </label>
      </div>

      {(note || (waiting && page)) && <span style={hintStyle} data-transcribe-note>{note || t('settings.frame.onSave')}</span>}
    </div>
  );
}

/**
 * A CHORD, PICKED FROM A LIST (founder, 24 Sep 2026: "typing the key stroke
 * names is an antipattern"). 10 to 12 presets per field and platform
 * (shared/hotkeyPresets.ts), each drawn as its symbols and its plain words,
 * the default marked. A stored chord that is not a preset stays on screen as
 * its own row, marked custom, so nothing the person set is hidden or lost
 * until they pick something else.
 */
function ChordSelect({ field, platform, stored, fallback, disabled, onPick, data }: {
  field: ChordField;
  platform: string;
  /** What config.json holds; empty means the field's default. */
  stored: string;
  fallback: string;
  disabled: boolean;
  onPick: (chord: string, isDefault: boolean) => void;
  data: `data-${string}`;
}) {
  const { t } = useTranslation();
  const presets = chordPresets(field, platform);
  const current = stored.trim() || fallback;
  const preset = presetFor(field, platform, current);
  const custom = preset ? null : current;
  const row = (chord: string): string => {
    const label = isHoldKey(chord)
      ? t('settings.transcribe.chordHold', { key: chordLabel(chord, platform), words: chordWords(chord, platform) })
      : `${chordLabel(chord, platform)}   ${chordWords(chord, platform)}`;
    return presetFor(field, platform, fallback) === chord ? `${label}   ${t('settings.transcribe.chordDefault')}` : label;
  };
  return (
    <select
      value={preset ?? `custom:${custom}`}
      disabled={disabled}
      onChange={(e) => { const v = e.target.value; if (v.startsWith('custom:')) return; onPick(v, presetFor(field, platform, fallback) === v); }}
      style={{ ...inputStyle, fontFamily: 'var(--cth-font-ui)' }}
      {...{ [data]: '' }}
    >
      {custom && <option value={`custom:${custom}`}>{t('settings.transcribe.chordCustom', { chord: chordLabel(custom, platform) })}</option>}
      {presets.map((chord) => <option key={chord} value={chord}>{row(chord)}</option>)}
    </select>
  );
}
