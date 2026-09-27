/**
 * PUCK (7 Sep 2026), redesigned 24 Sep 2026 (founder: "compact and minimal
 * without compromising the details"). Three tabs down a left column: the
 * Stapler's settings, the meetings it has recorded (with the transcript in
 * place), and the screenshots it took.
 *
 * THE SETTINGS TAB is four collapsible groups, each explained by an (i)
 * rather than a paragraph:
 *   General      the look, the behaviour, which buttons the ring offers and
 *                who a capture reaches (the old Actions tab folded in);
 *   Dictation    the engine, dictation into any app, its key, the Groq key;
 *   Meetings     the other side of calls, the meeting key, invisibility,
 *                segment length, language;
 *   Screenshots  the capture key and the remembered region.
 * The dictation, meeting and capture values are the SAME config keys as
 * Settings, Voice and Dictation & Meetings, written through the same door
 * (staplerKit.useTranscribeShared), so the two screens never disagree.
 *
 * ONE SAVE FOR THE WHOLE SCREEN (founder batch 2 #12, 25 Sep 2026: "Save
 * should only happen when clicked on save"). Every change, on any tab, is
 * staged in this screen's draft (Darryl's settings/draftStore, the same one
 * Settings uses) and shown over the live values; "unsaved changes" and Save
 * appear in a footer the way they do in Settings. Save runs the staged tasks:
 * `puck` (one `{ puck: patch }` write that main merges onto the saved
 * object), `transcribe` (through transcribe:setConfig, the door Settings
 * uses), `groqKey`, and one `meeting:<id>` per meeting with edits. Leaving
 * the screen drops what is unsaved, as leaving Settings does.
 *
 * THE WINDOW'S TRUTH IS MAIN'S. Whether the puck is on screen, whether a
 * meeting is recording, whether the transcriber has a key: all read from
 * `puckState` and followed with `onPuckState`, never guessed from the config.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import type { HarnessConfig } from '@/store/config';
import {
  DEFAULT_PUCK_STATE, meetingEditable, normalizeHex, normalizePuckConfig, PUCK_ACTIONS, PUCK_CORNERS, PUCK_EXPRESSIONS, PUCK_SWATCHES,
  PUCK_MEETING_DESCRIPTION_MAX, PUCK_OPACITY, PUCK_SEED_MAX, PUCK_SEGMENT_MINUTES, PUCK_SHAPES, PUCK_SIZE,
  type PuckConfig, type PuckCorner, type PuckMeeting, type PuckScreenshot, type PuckState
} from '@shared/puck';
import type { TranscribeEngine } from '@shared/transcribeConfig';
import { DEFAULT_TRANSCRIBE, cleanCustomWords } from '@shared/transcribeConfig';
import { DEFAULT_TRANSCRIBE_VOCABULARY } from '@shared/transcribeVocabulary';
import { createSettingsDraft, type SettingsDraft } from '../settings/draftStore';
import { SettingsFrameProvider, usePendingPatch, useSettingsDraft } from '../settings/SettingsFrame';
import { defaultCaptureKey, defaultMeetingKey } from '@shared/hotkeyName';
import { ProIcon, type ProIconName } from './icons';
import { Bar, Btn, Chip, ConfirmDialog, Field, FilterChip, Panel, Row, SelectBox, Switch, fmtWhen, proToast, inputStyle, textareaStyle, type ChipTone } from './ui';
import { PuckFace } from './puck/PuckFace';
import { RingButton } from './puck/RingButton';
import { ChordBox, Group, Info, Line, useTranscribeShared } from './puck/staplerKit';
import { saveGroqKey } from '@/voice/keyEntry';
import { isComposingKey } from '@shared/imeGuard';

type Tab = 'settings' | 'meetings' | 'screenshots';
const TABS: { id: Tab; icon: ProIconName }[] = [
  { id: 'settings', icon: 'puck' }, { id: 'meetings', icon: 'doc' }, { id: 'screenshots', icon: 'screenshot' }
];

/** `initialTab` is for the preview harness, which draws every tab at once.
 *  The old `puck` and `actions` tabs are the settings tab now. */
export function PuckScreen({ config, initialTab = 'settings' }: { config: HarnessConfig | null; initialTab?: Tab | 'puck' | 'actions' }) {
  // One draft per visit: made when the screen opens, dropped when it closes.
  const [draft] = useState(createSettingsDraft);
  return (
    <SettingsFrameProvider draft={draft} chrome="inline">
      <PuckBody config={config} initialTab={initialTab} draft={draft} />
    </SettingsFrameProvider>
  );
}

function PuckBody({ config, initialTab, draft }: { config: HarnessConfig | null; initialTab: Tab | 'puck' | 'actions'; draft: SettingsDraft }) {
  const { t, i18n } = useTranslation();
  const hasGroqKey = useStore((s) => s.hasGroqKey);
  const [tab, setTab] = useState<Tab>(initialTab === 'puck' || initialTab === 'actions' ? 'settings' : initialTab);
  const [state, setState] = useState<PuckState>(DEFAULT_PUCK_STATE);
  // WHO A CAPTURE WOULD REACH, by name, and it is main's answer, not ours. This
  // screen can list agents but cannot know which have a live terminal, so its
  // own guess could promise an agent the send then declines to use. Until the
  // first state arrives the orchestrator's live name stands in, which is the
  // fallback main itself uses.
  const godName = useResolvedGodName();
  const recipient = state.recipient || godName;
  const liveCfg = useMemo(() => normalizePuckConfig(config?.puck), [config?.puck]);
  // The Stapler's own settings, staged: the screen shows saved + unsaved.
  const { view: cfg, change: save } = usePendingPatch<PuckConfig>('puck', liveCfg, async (patch) => {
    await window.cth.updateConfig({ puck: patch });
  });

  useEffect(() => {
    void window.cth.puckState().then(setState);
    return window.cth.onPuckState(setState);
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)', background: 'var(--cth-cream-50)' }}>
      <Bar title={t('pro.puck.title')} sub={t('pro.puck.lead')}>
        <Chip tone={state.shown ? 'ok' : 'muted'}>{state.shown ? t('pro.puck.status.on') : t('pro.puck.status.off')}</Chip>
        {state.recording && <Chip tone="bad">{state.recording.kind === 'meeting' ? t('pro.puck.recording.meeting') : t('pro.puck.recording.message')}</Chip>}
        <Switch on={cfg.enabled} label={t('pro.puck.show')} onChange={(next) => save({ enabled: next })} />
      </Bar>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <nav aria-label={t('pro.puck.title')} style={{ width: 200, flexShrink: 0, padding: 10, borderRight: '1px solid var(--cth-ink-300)', display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--cth-cream-100)' }}>
          {TABS.map((x) => (
            <button
              key={x.id} type="button" onClick={() => setTab(x.id)} aria-current={tab === x.id ? 'page' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, border: '1px solid transparent', cursor: 'pointer', textAlign: 'start',
                font: 'inherit', fontSize: 13, fontWeight: tab === x.id ? 600 : 500, color: 'var(--cth-ink-900)',
                background: tab === x.id ? 'var(--cth-cream-50)' : 'transparent', borderColor: tab === x.id ? 'var(--cth-ink-300)' : 'transparent'
              }}
            >
              <ProIcon name={x.icon} size={15} style={{ opacity: 0.85 }} />
              <span style={{ flex: 1 }}>{t(`pro.puck.tabs.${x.id}`)}</span>
            </button>
          ))}
        </nav>
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', padding: 16 }}>
          {!cfg.enabled && tab === 'settings' && (
            <div role="note" style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-200)', fontSize: 12.5, color: 'var(--cth-ink-700)' }}>
              {t('pro.puck.notShown')}
            </div>
          )}
          {tab === 'settings' && <SettingsTab cfg={cfg} save={save} hasGroqKey={hasGroqKey} recipient={recipient} config={config} />}
          {tab === 'meetings' && <MeetingsTab state={state} hasGroqKey={hasGroqKey} locale={i18n.language} />}
          {tab === 'screenshots' && <ScreenshotsTab locale={i18n.language} recipient={recipient} />}
        </div>
      </div>
      <SaveFooter draft={draft} />
    </div>
  );
}

/**
 * "unsaved changes" and Save, like the Settings footer (founder batch 2 #12:
 * "whenever something changes along with the text Unsaved changes and a
 * button to save should appear like in the settings section"). Drawn only
 * while something is staged or a save has just reported. Discard puts every
 * field back to what is saved.
 */
function SaveFooter({ draft }: { draft: SettingsDraft }) {
  const { t } = useTranslation();
  useSyncExternalStore(draft.subscribe, draft.version);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const dirty = draft.dirty();
  if (!dirty && !note) return null;
  const saveAll = async (): Promise<void> => {
    setBusy(true); setNote(null);
    try {
      // Every Stapler change is a task (its own door in main); there are no
      // bare config fields, so the field write is skipped when it is empty.
      const r = await draft.commit({}, async (patch) => { if (Object.keys(patch).length) await window.cth.updateConfig(patch); });
      if (!r.ok) { setNote({ text: t('settings.frame.partlySaved', { error: r.errors[0].message }), bad: true }); return; }
      setNote({ text: t('settings.saved'), bad: false });
      setTimeout(() => setNote(null), 1800);
    } finally { setBusy(false); }
  };
  return (
    <div data-stapler-footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
      {note && <span data-save-note={note.bad ? 'bad' : 'ok'} style={{ fontSize: 12, color: note.bad ? 'var(--cth-coral)' : 'var(--cth-mint)' }}>{note.text}</span>}
      {dirty && !note && <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.unsavedChanges')}</span>}
      {dirty && <Btn onClick={() => { draft.reset(); setNote(null); }} disabled={busy}>{t('pro.puck.discard')}</Btn>}
      <Btn kind="primary" onClick={() => void saveAll()} disabled={busy || !dirty}>{busy ? t('settings.saving') : t('common.save')}</Btn>
    </div>
  );
}

/* ---- the settings tab ---------------------------------------------------- */

function SettingsTab({ cfg, save, hasGroqKey, recipient, config }: {
  cfg: PuckConfig; save: (p: Partial<PuckConfig>) => void; hasGroqKey: boolean; recipient: string; config: HarnessConfig | null;
}) {
  const { t } = useTranslation();
  const shared = useTranscribeShared(config);
  // The preview follows a typed face before it is committed.
  const [seedDraft, setSeedDraft] = useState(cfg.seed);
  useEffect(() => setSeedDraft(cfg.seed), [cfg.seed]);
  const live = { ...cfg, seed: seedDraft.trim() || cfg.seed };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 16, alignItems: 'start', maxWidth: 920 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <Group id="general" defaultOpen icon={<ProIcon name="puck" size={16} />} title={t('pro.puck.groups.general')} info={t('pro.puck.groups.generalInfo')}>
          <PuckTab cfg={cfg} save={save} seedDraft={seedDraft} setSeedDraft={setSeedDraft} live={live} />
          <ActionsTab cfg={cfg} save={save} recipient={recipient} />
        </Group>
        <Group id="dictation" icon={<RingButton action="message" size={22} />} title={t('pro.puck.groups.dictation')} info={t('pro.puck.groups.sharedInfo')}>
          <DictationGroup shared={shared} hasGroqKey={hasGroqKey} />
        </Group>
        <Group id="meetings" icon={<RingButton action="meeting" size={22} />} title={t('pro.puck.groups.meetings')} info={t('pro.puck.groups.sharedInfo')}>
          <MeetingsGroup cfg={cfg} save={save} shared={shared} />
        </Group>
        <Group id="screenshots" icon={<RingButton action="screenshot" size={22} />} title={t('pro.puck.groups.screenshots')} info={t('pro.puck.groups.sharedInfo')}>
          <ScreenshotsGroup cfg={cfg} save={save} shared={shared} />
        </Group>
      </div>
      <Panel title={t('pro.puck.preview')} style={{ position: 'sticky', top: 0 }}>
        <div style={{ display: 'grid', placeItems: 'center', height: 190, borderRadius: 8, background: 'linear-gradient(160deg, #c9d7dd 0%, #e9d9c8 100%)' }}>
          <div style={{ opacity: cfg.opacity / 100 }}>
            <PuckFace look={live} size={cfg.size} animate="always" />
          </div>
        </div>
      </Panel>
    </div>
  );
}

/* ---- general: the puck itself ------------------------------------------- */

/** A word a person did not have to think of. Readable on purpose, so the
 *  seed in the field still looks like a name and can be typed again. */
const SHUFFLE_WORDS = [
  'comet', 'pebble', 'lantern', 'otter', 'maple', 'ember', 'harbour', 'juniper', 'marble', 'nimbus', 'orchid', 'quill',
  'saffron', 'tundra', 'velvet', 'willow', 'zephyr', 'cobalt', 'dune', 'fjord', 'glacier', 'heron', 'indigo', 'kestrel'
];
function shuffleSeed(): string {
  const r = new Uint32Array(2);
  crypto.getRandomValues(r);
  return `${SHUFFLE_WORDS[r[0] % SHUFFLE_WORDS.length]} ${10 + (r[1] % 90)}`;
}

function PuckTab({ cfg, save, seedDraft, setSeedDraft, live }: {
  cfg: PuckConfig; save: (p: Partial<PuckConfig>) => void; seedDraft: string; setSeedDraft: (s: string) => void; live: PuckConfig;
}) {
  const { t } = useTranslation();
  // The custom colour: a hex typed into a field. It applies the moment the
  // draft is a colour (so typing shows the creature change), and on Enter or
  // blur the field settles on the normal form; a draft that is no colour then
  // reverts to what is saved.
  const [hexDraft, setHexDraft] = useState(cfg.color);
  useEffect(() => { setHexDraft(cfg.color); }, [cfg.color]);
  const typeHex = (raw: string) => {
    setHexDraft(raw);
    const h = normalizeHex(raw);
    if (h && h !== cfg.color && raw.replace(/^#/, '').trim().length === 6) save({ color: h });
  };
  const commitHex = () => {
    const h = normalizeHex(hexDraft);
    if (!h) { setHexDraft(cfg.color); return; }
    setHexDraft(h);
    if (h !== cfg.color) save({ color: h });
  };
  const commitSeed = () => {
    const next = seedDraft.trim().slice(0, PUCK_SEED_MAX);
    if (next && next !== cfg.seed) save({ seed: next });
    else if (!next) setSeedDraft(cfg.seed);
  };
  const custom = !PUCK_SWATCHES.some((s) => s.hex === cfg.color);
  const radio = (on: boolean): React.CSSProperties => ({
    padding: 2, borderRadius: 999, cursor: 'pointer', lineHeight: 0,
    border: `1px solid ${on ? 'var(--cth-sky)' : 'var(--cth-ink-300)'}`, background: on ? 'var(--cth-sky-light)' : 'transparent'
  });
  return (
    <>
      <Line label={t('pro.puck.face')} info={t('pro.puck.faceHint')}>
        <input
          type="text" value={seedDraft} maxLength={PUCK_SEED_MAX} placeholder={t('pro.puck.seedPlaceholder')} aria-label={t('pro.puck.face')}
          spellCheck={false} autoComplete="off"
          onChange={(e) => setSeedDraft(e.target.value)}
          onBlur={commitSeed}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitSeed(); } }}
          style={{ ...inputStyle, width: 180 }}
        />
        <Btn size="sm" onClick={() => { const s = shuffleSeed(); setSeedDraft(s); save({ seed: s }); }}>{t('pro.puck.shuffle')}</Btn>
      </Line>
      <Line label={t('pro.puck.shape')} info={t('pro.puck.shapeHint')}>
        <span role="radiogroup" aria-label={t('pro.puck.shape')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PUCK_SHAPES.map((s) => (
            <button
              key={s} type="button" role="radio" aria-checked={cfg.shape === s} title={t(`pro.puck.shapes.${s}`)} aria-label={t(`pro.puck.shapes.${s}`)}
              onClick={() => save({ shape: s })} style={radio(cfg.shape === s)}
            >
              <PuckFace look={{ ...live, shape: s }} size={30} shadow={false} />
            </button>
          ))}
        </span>
      </Line>
      <Line label={t('pro.puck.expression')} info={`${t('pro.puck.expressionHint')} ${t('pro.puck.credit')}`}>
        <span role="radiogroup" aria-label={t('pro.puck.expression')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PUCK_EXPRESSIONS.map((x) => (
            <button
              key={x} type="button" role="radio" aria-checked={cfg.expression === x} title={t(`pro.puck.expressions.${x}`)} aria-label={t(`pro.puck.expressions.${x}`)}
              onClick={() => save({ expression: x })} style={radio(cfg.expression === x)}
            >
              <PuckFace look={{ ...live, expression: x }} size={30} shadow={false} />
            </button>
          ))}
        </span>
      </Line>
      <Line label={t('pro.puck.color')} info={`${t('pro.puck.colorHint')} ${t('pro.puck.customColorHint')}`} stack>
        <span style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['pastel', 'vibrant'] as const).map((group) => (
            <span key={group} role="radiogroup" aria-label={t(`pro.puck.${group}`)} style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {PUCK_SWATCHES.filter((s) => s.group === group).map((s) => {
                // The dot is the body colour itself, so the row shows
                // exactly what the creature will wear.
                const on = cfg.color === s.hex;
                return (
                  <button
                    key={s.id} type="button" role="radio" aria-checked={on} title={t(`pro.puck.colors.${s.id}`)} aria-label={t(`pro.puck.colors.${s.id}`)}
                    onClick={() => save({ color: s.hex })}
                    style={{ width: 24, height: 24, borderRadius: 999, cursor: 'pointer', background: s.hex, border: `1px solid ${on ? 'var(--cth-sky)' : 'var(--cth-ink-300)'}`, boxShadow: on ? '0 0 0 3px var(--cth-sky-light)' : 'none' }}
                  />
                );
              })}
            </span>
          ))}
          {/* The custom colour as a dot like the swatches, lit when the
              saved colour is not one of them. */}
          <span
            aria-hidden
            style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, background: normalizeHex(hexDraft) ?? cfg.color, border: `1px solid ${custom ? 'var(--cth-sky)' : 'var(--cth-ink-300)'}`, boxShadow: custom ? '0 0 0 3px var(--cth-sky-light)' : 'none' }}
          />
          <input
            id="puck-hex" type="text" value={hexDraft} maxLength={7} spellCheck={false} autoComplete="off" aria-label={t('pro.puck.customColor')}
            onChange={(e) => typeHex(e.target.value)}
            onBlur={commitHex}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitHex(); } }}
            style={{ ...inputStyle, width: 90, fontFamily: 'var(--cth-font-mono)' }}
          />
        </span>
      </Line>
      <Line label={t('pro.puck.size')} info={t('pro.puck.sizeHint', { px: cfg.size })}>
        <input type="range" min={PUCK_SIZE.min} max={PUCK_SIZE.max} step={4} value={cfg.size} aria-label={t('pro.puck.size')}
          onChange={(e) => save({ size: Number(e.target.value) })} style={{ width: 200 }} />
      </Line>
      <Line label={t('pro.puck.opacity')} info={t('pro.puck.opacityHint', { pct: cfg.opacity })}>
        <input type="range" min={PUCK_OPACITY.min} max={PUCK_OPACITY.max} step={5} value={cfg.opacity} aria-label={t('pro.puck.opacity')}
          onChange={(e) => save({ opacity: Number(e.target.value) })} style={{ width: 200 }} />
      </Line>
      <Line label={t('pro.puck.alwaysOnTop')} info={t('pro.puck.alwaysOnTopHint')}>
        <Switch on={cfg.alwaysOnTop} label={t('pro.puck.alwaysOnTop')} onChange={(next) => save({ alwaysOnTop: next })} />
      </Line>
      <Line label={t('pro.puck.snap')} info={t('pro.puck.snapHint')}>
        <Switch on={cfg.snapToEdges} label={t('pro.puck.snap')} onChange={(next) => save({ snapToEdges: next })} />
      </Line>
      <Line label={t('pro.puck.corner')} info={t('pro.puck.cornerHint')}>
        <SelectBox<PuckCorner> value={cfg.corner} ariaLabel={t('pro.puck.corner')} options={PUCK_CORNERS.map((c) => ({ value: c, label: t(`pro.puck.corners.${c}`) }))} onChange={(c) => save({ corner: c })} style={{ width: 150 }} />
      </Line>
      {/* An action, not a setting (founder, 26 Sep 2026: "reset position
          button should not require saving"). It moves the Stapler at the
          click and writes the new place itself; it sat in the corner row,
          which waits for Save, and read as part of it. */}
      <Line label={t('pro.puck.position')} info={t('pro.puck.positionHint')}>
        <Btn size="sm" dataAttrs={{ 'data-reset-position': '' }} onClick={() => { void window.cth.puckResetPosition().then(() => proToast(t('pro.puck.positionReset'))); }}>{t('pro.puck.resetPosition')}</Btn>
      </Line>
    </>
  );
}

/* ---- general: the ring's buttons and who a capture reaches -------------- */

function ActionsTab({ cfg, save, recipient }: { cfg: PuckConfig; save: (p: Partial<PuckConfig>) => void; recipient: string }) {
  const { t } = useTranslation();
  return (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase', color: 'var(--cth-ink-500)', marginTop: 4 }}>
        {t('pro.puck.groups.ring')}<Info text={t('pro.puck.actionsLead')} />
      </span>
      {/* Every row leads with the button as it is on the ring (founder, 9 Sep
          2026), so the list reads against the Stapler the person is looking
          at, not against a set of generic icons. */}
      {PUCK_ACTIONS.map((a) => (
        <Row
          key={a}
          style={{ padding: '2px 0' }}
          icon={<RingButton action={a} size={24} />}
          title={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>{t(`pro.puck.action.${a}`)}{a === 'computerUse' && <Chip tone="muted">{t('pro.puck.comingSoon')}</Chip>}<Info text={t(`pro.puck.action.${a}Hint`, { recipient })} /></span>}
          right={<Switch on={cfg.actions[a]} label={t(`pro.puck.action.${a}`)} onChange={(next) => save({ actions: { ...cfg.actions, [a]: next } })} />}
        />
      ))}
      <SendToField cfg={cfg} save={save} />
    </>
  );
}

/* ---- dictation, meetings, screenshots: shared with Settings -------------- */

type Shared = ReturnType<typeof useTranscribeShared>;

function DictationGroup({ shared, hasGroqKey }: { shared: Shared; hasGroqKey: boolean }) {
  const { t } = useTranslation();
  const { cfg, status, anyApp, save, platform } = shared;
  const engines: { value: TranscribeEngine; label: string; disabled?: boolean }[] = [
    { value: 'auto', label: t('settings.transcribe.engineAuto') },
    { value: 'apple', label: t('settings.transcribe.engineApple'), disabled: !!status && !status.engines.apple },
    { value: 'whisper', label: t('settings.transcribe.engineWhisper'), disabled: !!status && !status.engines.whisper },
    { value: 'groq', label: t('settings.transcribe.engineGroq'), disabled: !!status && !status.engines.groq }
  ];
  return (
    <>
      <Line label={t('settings.transcribe.engine')} info={t('settings.transcribe.engineHint')}>
        <SelectBox<TranscribeEngine> value={cfg.engine} ariaLabel={t('settings.transcribe.engine')} options={engines} onChange={(v) => { void save({ engine: v }); }} style={{ maxWidth: 220 }} />
      </Line>
      {platform === 'darwin' && (
        <>
          <Line label={t('settings.transcribe.anyApp')} info={t('settings.transcribe.anyAppDesc')}>
            {anyApp && !anyApp.available
              ? <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('settings.transcribe.notGranted')}</span>
              : <Switch on={cfg.anyApp} label={t('settings.transcribe.anyApp')} onChange={(next) => { void save({ anyApp: next }); }} />}
          </Line>
          <Line label={t('settings.transcribe.pushToTalkKey')} info={t('settings.transcribe.pushToTalkHint')}>
            <ChordBox field="pushToTalk" platform={platform} stored={cfg.pushToTalkKey} fallback={DEFAULT_TRANSCRIBE.pushToTalkKey} ariaLabel={t('settings.transcribe.pushToTalkKey')}
              onPick={(v) => { if (v !== cfg.pushToTalkKey) void save({ pushToTalkKey: v }); }} />
          </Line>
        </>
      )}
      <VocabularyLines shared={shared} />
      <GroqKeyField hasGroqKey={hasGroqKey} />
    </>
  );
}

/** The vocabulary, here as in Settings, Dictation & Meetings (founder batch 2
 *  #12: "Add the vocabulary section in the Stapler settings screen aswell").
 *  The same two fields, config.transcribe.defaultVocabulary and customWords,
 *  staged with the rest of this screen and written through the same door. */
function VocabularyLines({ shared }: { shared: Shared }) {
  const { t } = useTranslation();
  const { cfg, status, save } = shared;
  const [text, setText] = useState(cfg.customWords.join('\n'));
  // The box follows the list (a save elsewhere, a Discard) unless what is in
  // it already says the same words.
  const words = cfg.customWords.join('\n');
  useEffect(() => { setText((cur) => (cleanCustomWords(cur).join('\n') === words ? cur : words)); }, [words]);
  return (
    <>
      <Line label={t('settings.transcribe.vocabulary')} info={t('settings.transcribe.vocabularyDesc', { count: DEFAULT_TRANSCRIBE_VOCABULARY.length })}>
        <Switch on={cfg.defaultVocabulary} label={t('settings.transcribe.vocabulary')} onChange={(next) => save({ defaultVocabulary: next })} />
      </Line>
      <Line label={t('settings.transcribe.customWords')} info={t('pro.puck.customWordsInfo')} stack>
        <textarea
          value={text} rows={4} data-stapler-words
          onChange={(e) => { setText(e.target.value); save({ customWords: cleanCustomWords(e.target.value) }); }}
          placeholder={t('settings.transcribe.customWordsPlaceholder')} aria-label={t('settings.transcribe.customWords')}
          style={{ ...textareaStyle, width: '100%', fontFamily: 'var(--cth-font-mono)', fontSize: 12 }}
        />
        {status && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('settings.transcribe.wordsCount', { total: status.words.total, custom: status.words.custom, whisper: status.words.whisperKept })}</span>}
      </Line>
    </>
  );
}

function MeetingsGroup({ cfg, save, shared }: { cfg: PuckConfig; save: (p: Partial<PuckConfig>) => void; shared: Shared }) {
  const { t } = useTranslation();
  const tr = shared.cfg;
  return (
    <>
      <Line label={t('settings.transcribe.meetingSystemAudio')} info={t('settings.transcribe.meetingSystemAudioDesc')}>
        <Switch on={tr.meetingSystemAudio} label={t('settings.transcribe.meetingSystemAudio')} onChange={(next) => { void shared.save({ meetingSystemAudio: next }); }} />
      </Line>
      <Line label={t('settings.transcribe.meetingKey')} info={t('settings.transcribe.meetingKeyHint')}>
        <ChordBox field="meeting" platform={shared.platform} stored={tr.meetingKey} fallback={defaultMeetingKey(shared.platform)} ariaLabel={t('settings.transcribe.meetingKey')}
          onPick={(v, isDefault) => { const stored = isDefault ? '' : v; if (stored !== tr.meetingKey) void shared.save({ meetingKey: stored }); }} />
      </Line>
      <Line label={t('pro.puck.invisibleWhileRecording')} info={t('pro.puck.invisibleWhileRecordingHint')}>
        <Switch on={cfg.invisibleWhileRecording} label={t('pro.puck.invisibleWhileRecording')} onChange={(next) => save({ invisibleWhileRecording: next })} />
      </Line>
      <Line label={t('pro.puck.segment')} info={t('pro.puck.segmentHint')}>
        <SelectBox<string>
          value={String(cfg.segmentMinutes)} ariaLabel={t('pro.puck.segment')} style={{ maxWidth: 140 }}
          options={[2, 5, 10, 15, 20].filter((n) => n >= PUCK_SEGMENT_MINUTES.min && n <= PUCK_SEGMENT_MINUTES.max).map((n) => ({ value: String(n), label: t('pro.puck.minutes', { n }) }))}
          onChange={(v) => save({ segmentMinutes: Number(v) })}
        />
      </Line>
      <Line label={t('pro.puck.language')} info={t('pro.puck.languageHint')}>
        <input key={cfg.language} defaultValue={cfg.language} placeholder="en" maxLength={8} aria-label={t('pro.puck.language')} style={{ ...inputStyle, width: 80 }}
          onBlur={(e) => { const v = e.target.value.trim(); if (v !== cfg.language) save({ language: v }); }} />
      </Line>
    </>
  );
}

function ScreenshotsGroup({ cfg, save, shared }: { cfg: PuckConfig; save: (p: Partial<PuckConfig>) => void; shared: Shared }) {
  const { t } = useTranslation();
  const r = cfg.captureRegion;
  return (
    <>
      <Line label={t('settings.transcribe.captureKey')} info={t('settings.transcribe.captureKeyHint')}>
        <ChordBox field="capture" platform={shared.platform} stored={shared.cfg.captureKey} fallback={defaultCaptureKey(shared.platform)} ariaLabel={t('settings.transcribe.captureKey')}
          onPick={(v, isDefault) => { const stored = isDefault ? '' : v; if (stored !== shared.cfg.captureKey) void shared.save({ captureKey: stored }); }} />
      </Line>
      <Line label={t('pro.puck.region')}>
        <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>{r ? t('pro.puck.regionLine', { w: r.width, h: r.height, x: r.x, y: r.y }) : t('pro.puck.regionNone')}</span>
        {r && <Btn size="sm" onClick={() => save({ captureRegion: null })}>{t('pro.puck.regionForget')}</Btn>}
      </Line>
    </>
  );
}

/**
 * The Groq key, right where transcription is explained (founder, 9 Sep 2026:
 * "add the input area for groq keys in the stapler actions transcription
 * section... user should be able to add the keys here and also see if the
 * keys are already added there").
 *
 * NOT A FIFTH WAY TO STORE A KEY. Saving goes through voice/keyEntry, the one
 * rule for where the key lives: it is the SAME key Settings, Voice and the
 * two microphone cards write (config.groqApiKey, which the Stapler's
 * transcriber reads in main), so a key pasted here lights the microphone up
 * everywhere at once. Only presence reaches the store; the text is handed to
 * main and forgotten, nothing here logs it or keeps it. The already-saved
 * display is AiEnginesSettings' shape: a check on the label and a masked
 * placeholder, so this screen agrees with the rest of the app.
 */
function GroqKeyField({ hasGroqKey }: { hasGroqKey: boolean }) {
  const { t } = useTranslation();
  const page = useSettingsDraft();
  const [draft, setDraft] = useState('');
  // The key waits for the screen's Save like everything else here (founder
  // batch 2 #12). The typed text lives only in this field and in the task
  // that sends it; nothing else keeps it.
  const waiting = !!page?.hasTask('groqKey');
  useEffect(() => { if (!waiting) setDraft(''); }, [waiting]);
  const type = (v: string): void => {
    setDraft(v);
    if (!page) return;
    const key = v.trim();
    page.setTask('groqKey', key ? async () => {
      const r = await saveGroqKey(key);
      if (!r.ok) throw new Error(t('settings.voice.couldNotSave'));
    } : null);
  };
  return (
    <Field
      label={hasGroqKey ? `${t('settings.voice.groqKey')} ${t('aiEngines.setCheck')}` : t('settings.voice.groqKey')}
      hint={hasGroqKey ? t('pro.puck.keyOk') : t('pro.puck.keyMissing')}
    >
      <div data-groq-key-entry style={{ display: 'flex', gap: 8, alignItems: 'center', maxWidth: 480 }}>
        <input
          type="password"
          value={draft}
          onChange={(e) => type(e.target.value)}
          onKeyDown={(e) => { if (isComposingKey(e)) return; if (e.key === 'Enter') e.preventDefault(); }}
          placeholder={waiting && !draft ? t('pro.puck.keyWaiting') : hasGroqKey ? t('aiEngines.keyStoredPlaceholder') : t('settings.voice.groqPlaceholder')}
          aria-label={t('settings.voice.groqKey')}
          autoComplete="off"
          style={{ ...inputStyle, flex: 1, minWidth: 0 }}
        />
      </div>
    </Field>
  );
}

/** WHO A CAPTURE REACHES (founder, 9 Sep 2026). Until 0.5.2 every screenshot,
 *  spoken message and transcript went to the orchestrator and nothing said so.
 *  The list is the agents that are RUNNING, read from the same store the floor
 *  draws, because an agent with no terminal cannot read its inbox. A stored
 *  choice that is no longer running is kept, not silently rewritten, and the
 *  line under the box says where captures go until it is back: main resolves
 *  the same way at send time (shared/responder resolveResponder). */
function SendToField({ cfg, save }: { cfg: PuckConfig; save: (p: Partial<PuckConfig>) => void }) {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const choices = agents.filter((a) => !a.isGod && !a.archived);
  const chosen = choices.find((a) => a.id === cfg.sendTo) ?? null;
  const orphaned = cfg.sendTo !== '' && !chosen;
  // A name where one is known. Every other line on this screen prints a name,
  // and these two printed the raw agent id.
  const goneName = agents.find((a) => a.id === cfg.sendTo)?.name || cfg.sendTo;
  return (
    <Field
      label={t('pro.puck.sendTo')}
      hint={orphaned ? t('pro.puck.sendToGone', { name: goneName }) : t('pro.puck.sendToHint')}
    >
      <SelectBox<string>
        value={cfg.sendTo} ariaLabel={t('pro.puck.sendTo')}
        options={[
          { value: '', label: t('pro.puck.sendToOrchestrator') },
          ...choices.map((a) => ({ value: a.id, label: a.name })),
          ...(orphaned ? [{ value: cfg.sendTo, label: t('pro.puck.sendToGoneOption', { name: goneName }) }] : [])
        ]}
        onChange={(v) => save({ sendTo: v })}
      />
    </Field>
  );
}

/* ---- meetings ---------------------------------------------------------------------- */

function MeetingsTab({ state, hasGroqKey, locale }: { state: PuckState; hasGroqKey: boolean; locale: string }) {
  const { t } = useTranslation();
  const [list, setList] = useState<PuckMeeting[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  // The transcript as saved, with the meeting it belongs to, so a switch to
  // another meeting never shows the last one's words for a frame.
  const [text, setText] = useState<{ id: string; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // The filter the founder asked for (9 Sep 2026): the words, and the days to
  // stay between. Main does the matching, over the title AND the transcript,
  // because a person remembers one or the other and should not have to know
  // which we keep. Held in one object so every reload asks with the same
  // question the boxes are showing.
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const filtering = q.trim() !== '' || from !== '' || to !== '';
  const filterRef = useRef({ q, from, to });
  filterRef.current = { q, from, to };
  const load = () => { void window.cth.puckMeetings(filterRef.current).then(setList); };
  useEffect(() => { load(); return window.cth.onPuckMeetingsChanged(() => load()); }, []);
  useEffect(() => { load(); }, [state.recording]);
  useEffect(() => { load(); }, [q, from, to]);
  useEffect(() => {
    if (!open) { setText(null); return; }
    void window.cth.puckMeetingTranscript({ id: open }).then((r) => setText({ id: open, text: r.ok ? r.text : '' }));
  }, [open, list]);

  const current = list.find((m) => m.id === open) ?? null;
  const tone = (s: PuckMeeting['status']): ChipTone => (s === 'done' ? 'ok' : s === 'failed' ? 'bad' : s === 'recording' ? 'accent' : 'muted');
  const transcribed = (m: PuckMeeting) => m.segments.filter((s) => s.transcribed).length;

  // The audio rule, said where the meetings are, the way the screenshots tab
  // says its own (founder, 9 Sep 2026). A deletion a person cannot see coming
  // reads as lost work, and this one is easy to misread as losing the meeting,
  // so the line says in the same breath that the transcript is kept.
  const retention = (
    <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t('pro.puck.meetings.retention')}</p>
  );

  // The bar stays up while a filter is on, even with nothing to show: an empty
  // state that hides the search box leaves the person with no way back.
  const bar = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('pro.puck.meetings.searchLabel')}
        aria-label={t('pro.puck.meetings.searchLabel')} style={{ ...inputStyle, flex: '1 1 200px', minWidth: 160 }}
      />
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label={t('pro.puck.meetings.fromLabel')} title={t('pro.puck.meetings.fromLabel')} style={{ ...inputStyle, width: 150 }} />
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label={t('pro.puck.meetings.toLabel')} title={t('pro.puck.meetings.toLabel')} style={{ ...inputStyle, width: 150 }} />
      {filtering && <Btn size="sm" onClick={() => { setQ(''); setFrom(''); setTo(''); }}>{t('pro.puck.meetings.clear')}</Btn>}
    </div>
  );

  if (list.length === 0 && !filtering) {
    return <Empty icon="video" title={t('pro.puck.meetings.empty')} lead={t('pro.puck.meetings.emptyLead')} />;
  }
  if (list.length === 0) {
    return <div>{retention}{bar}<div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)', padding: 12 }}>{t('pro.puck.meetings.noMatch')}</div></div>;
  }
  return (
    <div>
      {retention}
      {bar}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {list.map((m) => (
          <Row
            key={m.id}
            selected={open === m.id}
            onClick={() => setOpen(m.id)}
            icon={<ProIcon name={m.status === 'recording' ? 'stop' : 'doc'} size={16} />}
            title={m.title}
            sub={m.hit
              ? `${fmtWhen(m.startedAt, locale)} · ${m.hit}`
              : `${fmtWhen(m.startedAt, locale)} · ${t('pro.puck.meetings.duration', { min: Math.max(1, Math.round(m.durationMs / 60000)) })}`}
            right={<Chip tone={tone(m.status)}>{t(`pro.puck.meetings.status.${m.status}`)}</Chip>}
          />
        ))}
      </div>
      {current ? (
        <Panel
          title={current.title}
          right={<span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('pro.puck.meetings.segments', { done: transcribed(current), total: current.segments.length })}</span>}
        >
          {/* Keyed by id, so another meeting opens with its own words and
              its own unsaved edits (they are kept per meeting until Save). */}
          <MeetingEditor
            key={current.id} meeting={current} text={text?.id === current.id ? text.text : null} state={state} locale={locale} hasGroqKey={hasGroqKey}
            onDelete={() => setConfirmDelete(current.id)}
          />
        </Panel>
      ) : (
        <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)', padding: 12 }}>{t('pro.puck.meetings.pick')}</div>
      )}
      {confirmDelete && (
        <ConfirmDialog
          title={t('pro.puck.meetings.deleteTitle')} body={t('pro.puck.meetings.deleteBody')} confirmLabel={t('pro.puck.meetings.delete')} danger
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => {
            const id = confirmDelete;
            setConfirmDelete(null);
            void window.cth.puckMeetingDelete({ id }).then((r) => { if (!r.ok) proToast(r.error ?? '', { tone: 'bad' }); if (open === id) setOpen(null); load(); });
          }}
        />
      )}
      </div>
    </div>
  );
}

/** When this meeting's audio went, or null while any of it is still on disk.
 *  The latest stamp of the segments that were swept: a long meeting is swept
 *  segment by segment as each one's own day runs out, and the person only
 *  needs to know the recordings are gone. */
function audioGoneAt(m: PuckMeeting): string | null {
  const gone = m.segments.map((s) => s.audioDeletedAt).filter((x): x is string => !!x);
  if (!gone.length) return null;
  return gone.sort().slice(-1)[0];
}

interface MeetingEdit { title: string; description: string; text: string }

/**
 * ONE MEETING, EDITABLE (founder batch 2 #8, 25 Sep 2026: "The meeting notes
 * ... should be editable and scrollable ... a section at the top after
 * meeting title and ID ... select available agents to send the meeting
 * transcriptions to").
 *
 * The name, the description and the transcript are one pending patch,
 * `meeting:<id>`, in the screen's draft: the footer Save writes whichever
 * changed through puck:meetingSave (the audio is never touched). The
 * transcript cannot be edited while words are still landing in it.
 *
 * Send puts one message in each chosen agent's inbox through the normal hive
 * path (puck:meetingSendTo): the description or prompt, then the transcript,
 * pasted when it is short and as its path when it is long
 * (shared/puck meetingMessage). It sends what is saved, so it waits for Save.
 */
function MeetingEditor({ meeting, text, state, locale, hasGroqKey, onDelete }: {
  meeting: PuckMeeting; text: string | null; state: PuckState; locale: string; hasGroqKey: boolean; onDelete: () => void;
}) {
  const { t } = useTranslation();
  const live: MeetingEdit = { title: meeting.title, description: meeting.description ?? '', text: text ?? '' };
  const { view, pending, change } = usePendingPatch<MeetingEdit>(`meeting:${meeting.id}`, live, async (patch) => {
    const r = await window.cth.puckMeetingSave({ id: meeting.id, ...patch });
    if (!r.ok) throw new Error(r.error ?? t('pro.sheet.failed'));
  });
  const unsaved = Object.keys(pending).length > 0;
  const editable = meetingEditable(meeting.status) && text !== null;
  const gone = audioGoneAt(meeting);
  // Who can be sent to: main's list of agents a capture can reach right now,
  // the orchestrator first. The Stapler's own pick starts ticked.
  const recipients = state.recipients ?? [];
  const [to, setTo] = useState<string[]>(() => (state.recipientId ? [state.recipientId] : []));
  const reachable = recipients.filter((r) => to.includes(r.id)).map((r) => r.id);
  const [sending, setSending] = useState(false);
  const send = async (): Promise<void> => {
    setSending(true);
    try {
      const r = await window.cth.puckMeetingSendTo({ id: meeting.id, to: reachable });
      if (r.sent.length) proToast(t('pro.puck.meetings.sentTo', { names: r.sent.join(', ') }), { tone: 'ok' });
      if (!r.ok) proToast(r.error ?? t('pro.puck.meetings.sendFailed', { n: r.failed.length }), { tone: 'bad' });
    } finally { setSending(false); }
  };
  const label = { fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' as const, color: 'var(--cth-ink-500)' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input
        value={view.title} onChange={(e) => change({ title: e.target.value })} maxLength={120}
        aria-label={t('pro.puck.meetings.renameLabel')} placeholder={t('pro.puck.meetings.renameLabel')}
        style={{ ...inputStyle, fontWeight: 600 }}
      />
      <div style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span>{t('pro.puck.meetings.idLine')} <code style={{ fontFamily: 'var(--cth-font-mono)' }} data-meeting-id>{meeting.id}</code></span>
        <span>{fmtWhen(meeting.startedAt, locale)}</span>
      </div>
      {/* The audio for this meeting has been swept. Said here, on the meeting
          itself, because "Show folder" opens a folder that no longer has the
          recordings in it. */}
      {gone && <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.puck.meetings.audioDeleted', { when: fmtWhen(gone, locale) })}</div>}

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-meeting-description>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('pro.puck.meetings.descriptionHead')}</span>
        <textarea
          value={view.description} rows={3} maxLength={PUCK_MEETING_DESCRIPTION_MAX}
          onChange={(e) => change({ description: e.target.value })}
          placeholder={t('pro.puck.meetings.descriptionPlaceholder')}
          style={{ ...textareaStyle, minHeight: 64 }}
        />
      </label>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Btn size="sm" onClick={() => { void window.cth.puckReveal(meeting.dir); }}><ProIcon name="folder" size={13} />{t('pro.puck.meetings.reveal')}</Btn>
        {(meeting.status === 'pending' || meeting.status === 'failed') && hasGroqKey && (
          <Btn size="sm" onClick={() => {
            void window.cth.puckMeetingTranscribe({ id: meeting.id }).then((r) => proToast(r.ok ? t('pro.puck.meetings.queued', { n: r.queued }) : (r.error ?? ''), { tone: r.ok ? 'neutral' : 'bad' }));
          }}><ProIcon name="play" size={13} />{t('pro.puck.meetings.transcribe')}</Btn>
        )}
        <Btn size="sm" kind="danger" disabled={meeting.status === 'recording'} onClick={onDelete}><ProIcon name="trash" size={13} />{t('pro.puck.meetings.delete')}</Btn>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={label}>{t('pro.puck.meetings.transcriptHead')}</span>
        <textarea
          value={view.text} readOnly={!editable} data-meeting-transcript
          onChange={(e) => change({ text: e.target.value })}
          placeholder={t('pro.puck.meetings.noText')}
          style={{ ...textareaStyle, height: 'min(52vh, 460px)', minHeight: 180, overflow: 'auto', resize: 'vertical', fontSize: 13, opacity: editable ? 1 : 0.8 }}
        />
        {!meetingEditable(meeting.status) && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.puck.meetings.stillWriting')}</span>}
      </label>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }} data-meeting-send>
        <span style={label}>{t('pro.puck.meetings.sendToHead')}</span>
        <div role="group" aria-label={t('pro.puck.meetings.sendToHead')} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {recipients.map((r) => (
            <FilterChip key={r.id} on={to.includes(r.id)} onClick={() => setTo((cur) => (cur.includes(r.id) ? cur.filter((x) => x !== r.id) : [...cur, r.id]))}>{r.name}</FilterChip>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Btn size="sm" kind="primary" disabled={sending || unsaved || reachable.length === 0 || meeting.status === 'recording'} onClick={() => { void send(); }}>
            <ProIcon name="send" size={13} />{t('pro.puck.meetings.sendN', { n: reachable.length })}
          </Btn>
          <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{unsaved ? t('pro.puck.meetings.saveFirst') : t('pro.puck.meetings.sendHint')}</span>
        </div>
      </div>
    </div>
  );
}

/* ---- screenshots ------------------------------------------------------------------ */

function ScreenshotsTab({ locale, recipient }: { locale: string; recipient: string }) {
  const { t } = useTranslation();
  const [list, setList] = useState<PuckScreenshot[]>([]);
  const [note, setNote] = useState<Record<string, string>>({});
  const load = () => { void window.cth.puckScreenshots().then(setList); };
  useEffect(() => { load(); }, []);

  if (list.length === 0) {
    return <Empty icon="screenshot" title={t('pro.puck.screenshots.empty')} lead={t('pro.puck.screenshots.emptyLead')} />;
  }
  return (
    <div>
    {/* The rule, said where the captures are (founder, 9 Sep 2026). A deletion
        a person cannot see coming reads as lost work. */}
    <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t('pro.puck.screenshots.retention')}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
      {list.map((s) => (
        <Panel key={s.path} noPadding>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {s.thumb ? <img src={s.thumb} alt="" style={{ display: 'block', width: '100%', aspectRatio: s.width && s.height ? `${s.width} / ${s.height}` : undefined, objectFit: 'cover', borderBottom: '1px solid var(--cth-ink-300)' }} /> : null}
            <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--cth-ink-500)' }}>
                <span style={{ flex: 1 }}>{fmtWhen(s.takenAt, locale)} · {s.width}×{s.height}</span>
                <Chip tone={s.sentAt ? 'ok' : 'muted'}>{s.sentAt ? t('pro.puck.screenshots.sent', { when: fmtWhen(s.sentAt, locale) }) : t('pro.puck.screenshots.notSent')}</Chip>
              </div>
              {/* A tombstone: the image is gone, the record of it is not,
                  because the message that named the file still exists in an
                  agent's inbox. */}
              {s.deletedAt && (
                <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.puck.screenshots.deletedWhen', { when: fmtWhen(s.deletedAt, locale) })}</div>
              )}
              {s.note && <div style={{ fontSize: 12.5, color: 'var(--cth-ink-700)', whiteSpace: 'pre-wrap' }}>{s.note}</div>}
              {!s.sentAt && !s.deletedAt && (
                <input
                  value={note[s.path] ?? ''} placeholder={t('pro.puck.screenshots.noteLabel')} aria-label={t('pro.puck.screenshots.noteLabel')} style={inputStyle}
                  onChange={(e) => setNote((n) => ({ ...n, [s.path]: e.target.value }))}
                />
              )}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {!s.deletedAt && <Btn size="sm" kind="primary" onClick={() => {
                  void window.cth.puckSend({ note: note[s.path] ?? '', screenshot: s.path }).then((r) => { proToast(r.ok ? t('pro.puck.meetings.sent', { recipient: r.to }) : r.error, { tone: r.ok ? 'ok' : 'bad' }); load(); });
                }}><ProIcon name="send" size={13} />{t('pro.puck.screenshots.send', { recipient })}</Btn>}
                {!s.deletedAt && <Btn size="sm" onClick={() => { void window.cth.puckReveal(s.path); }}><ProIcon name="folder" size={13} />{t('pro.puck.screenshots.reveal')}</Btn>}
                <Btn size="sm" kind="danger" onClick={() => { void window.cth.puckScreenshotDelete(s.path).then((r) => { if (!r.ok) proToast(r.error ?? '', { tone: 'bad' }); load(); }); }}><ProIcon name="trash" size={13} />{s.deletedAt ? t('pro.puck.screenshots.forget') : t('pro.puck.screenshots.delete')}</Btn>
              </div>
            </div>
          </div>
        </Panel>
      ))}
    </div>
    </div>
  );
}

function Empty({ icon, title, lead }: { icon: ProIconName; title: string; lead: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '48px 20px', color: 'var(--cth-ink-500)', textAlign: 'center' }}>
      <ProIcon name={icon} size={28} style={{ opacity: 0.6 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{title}</div>
      <div style={{ fontSize: 12.5, maxWidth: 420 }}>{lead}</div>
    </div>
  );
}
