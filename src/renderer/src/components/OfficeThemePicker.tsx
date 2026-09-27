import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { disposeTerminal } from './terminalPool';
import { ProIcon } from './pro/icons';
import type { ThemeId } from '@/scene/office/themeRegistry';
import { Btn, Panel } from './pro/ui';
import { useConfigValue, useSettingsDraft } from './settings/SettingsFrame';

// TV-show office themes (Phase 1 = the switch flow infra). Only `office` has a
// real map+cast today; the five shows render via the loader's office fallback
// until their content lands (Phase 2). `built: false` shows a "soon" tag and a
// fallback note on switch, but the destructive switch flow still runs so the
// whole pipeline (modal → delete cast → persist → re-seat) is exercisable now.
interface ThemeMeta { id: ThemeId; label: string; blurb: string; built: boolean; swatch: string; }
const THEME_META: ThemeMeta[] = [
  { id: 'office',        label: 'The Office',         blurb: 'Dunder Mifflin — the original floor', built: true,  swatch: '#6b5a4a' },
  { id: 'friends',       label: 'Friends',            blurb: 'Central Perk coffee house',           built: false, swatch: '#9a5a32' },
  { id: 'brooklyn99',    label: 'Brooklyn Nine-Nine', blurb: 'The 99th precinct bullpen',           built: true,  swatch: '#3a5a7a' },
  { id: 'siliconvalley', label: 'Silicon Valley',     blurb: 'The Hacker Hostel',                   built: false, swatch: '#4a6a4a' },
  { id: 'got',           label: 'Game of Thrones',    blurb: 'The Red Keep throne room',            built: false, swatch: '#6a2630' },
  { id: 'hogwarts',      label: 'Harry Potter',       blurb: 'Hogwarts great hall',                 built: false, swatch: '#39305a' },
];

/** Settings "Office Theme" section: an experimental flag toggle + a 6-card
 *  theme picker with the destructive switch flow (report §E). Self-contained so
 *  it stays out of SettingsModal's bulk.
 *
 *  0.5.3, one Save: the flag is staged in the page's draft, and a picked theme
 *  is a draft task (`office:theme`). The confirm still comes at pick time, so
 *  the person knows what Save will do; the agents are archived and the theme
 *  written only when Save runs the task. */
export function OfficeThemePicker({ config }: { config: HarnessConfig }) {
  const { t } = useTranslation();
  const page = useSettingsDraft();
  const [enabled, stageEnabled] = useConfigValue(config, 'tvShowOffices', false);
  const [current, setCurrent] = useState<ThemeId>((config.officeTheme as ThemeId) ?? 'office');
  const [pending, setPending] = useState<ThemeId | null>(null);
  /** The theme Save will switch to, if one is waiting. */
  const [chosen, setChosen] = useState<ThemeId | null>(null);
  const waiting = chosen && page?.hasTask('office:theme') ? chosen : null;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const archiveAgent = useStore((s) => s.archiveAgent);
  const setOfficeTheme = useStore((s) => s.setOfficeTheme);

  const toggleFlag = () => {
    const next = !enabled;
    setNote('');
    stageEnabled(next);
    // Flag off → the office renders regardless of the saved theme; flag on →
    // restore the persisted theme. Mirrored to the floor once Save wrote it.
    page?.setTask('office:flag', next === !!config.tvShowOffices ? null : async () => { setOfficeTheme(next ? current : 'office'); });
    if (!page) setOfficeTheme(next ? current : 'office');
  };

  const nonGodAgents = () =>
    useStore.getState().agents.filter((a) => !a.isGod && !a.isAssistant);

  const onSelect = (id: ThemeId) => {
    setNote('');
    if (busy) return;
    if (id === current) { setChosen(null); page?.setTask('office:theme', null); return; } // back to the current theme: nothing waits
    if (nonGodAgents().length === 0) { choose(id); return; } // god-only → no confirm
    setPending(id);                                     // workers exist → confirm modal
  };

  /** The confirmed pick waits for Save (or, outside Settings, runs now). */
  const choose = (id: ThemeId) => {
    setPending(null);
    if (!page) { void applyTheme(id); return; }
    setChosen(id);
    page.setTask('office:theme', () => applyTheme(id, true));
  };

  /** `strict`: run as a Save task, so a failure throws and the task stays in
   *  the draft for another Save, instead of only showing a note. */
  const applyTheme = async (id: ThemeId, strict = false) => {
    setBusy(true);
    try {
      // Tear down every non-god agent through the EXISTING lifecycle (kill PTY →
      // dispose terminal → archive). god + the prep assistant carry over; god's
      // PTY is never touched. If a PTY won't die, abort the switch (surface the
      // error, don't persist the new theme) rather than leave a half-switched floor.
      const victims = nonGodAgents();
      for (const a of victims) {
        if (a.ptyId) {
          // 'sweep': the person chose a theme, not to discard what each agent
          // had not committed. A dirty worktree is kept and listed in Settings.
          await window.cth.killPty(a.ptyId, 'sweep');
          disposeTerminal(a.ptyId);
        }
      }
      for (const a of victims) archiveAgent(a.id);
      await window.cth.updateConfig({ officeTheme: id });
      setCurrent(id);
      setChosen(null);
      setOfficeTheme(id); // → OfficeFloor rebuilds the scene on the new map/cast
      const meta = THEME_META.find((t) => t.id === id);
      if (meta && !meta.built) setNote(t('officeTheme.notBuiltYet', { label: meta.label }));
    } catch (e) {
      setNote(t('officeTheme.switchAborted', { error: e instanceof Error ? e.message : String(e) }));
      if (strict) throw e;
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const pendingMeta = pending ? THEME_META.find((t) => t.id === pending) : null;

  return (
    <div>
      <div style={{
        fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
        color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10
      }}>
        {t('officeTheme.title')}
      </div>

      {/* Experimental feature flag */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
            {t('officeTheme.tvShow')} <span style={{ color: 'var(--cth-ink-500)' }}>({t('officeTheme.experimental')})</span>
          </span>
          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
            {t('officeTheme.desc')}
          </span>
        </div>
        <Btn kind={enabled ? 'primary' : 'default'} size="sm" onClick={toggleFlag}>
          {enabled ? t('common.on') : t('common.off')}
        </Btn>
      </div>

      {/* Theme picker grid (only when the flag is on) */}
      {enabled && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {THEME_META.map((theme) => {
            const isCurrent = theme.id === current;
            const isWaiting = theme.id === waiting;
            return (
              <button
                key={theme.id}
                onClick={() => onSelect(theme.id)}
                disabled={busy}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                  padding: 8, cursor: busy ? 'default' : 'pointer',
                  background: isCurrent || isWaiting ? 'var(--cth-paper-100)' : 'transparent',
                  boxShadow: isCurrent || isWaiting
                    ? 'inset 0 0 0 1.5px var(--cth-ink-500)'
                    : 'inset 0 0 0 1px var(--cth-ink-300)',
                  opacity: busy && !isCurrent ? 0.6 : 1,
                }}
              >
                <span style={{
                  width: 28, height: 28, flexShrink: 0, background: theme.swatch,
                  boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)',
                }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {theme.label}
                    </span>
                    {isCurrent && (
                      <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-mint)', textTransform: 'uppercase' }}>
                        {t('officeTheme.current')}
                      </span>
                    )}
                    {isWaiting && (
                      <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-700)', textTransform: 'uppercase' }} data-theme-waiting>
                        {t('officeTheme.onSave')}
                      </span>
                    )}
                    {!theme.built && !isCurrent && !isWaiting && (
                      <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-500)', textTransform: 'uppercase' }}>
                        {t('officeTheme.soon')}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, lineHeight: '14px', color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {theme.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {enabled && note && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--cth-ink-500)' }}>{note}</div>
      )}

      {pending && pendingMeta && (
        <ThemeSwitchConfirmModal
          label={pendingMeta.label}
          agents={nonGodAgents()}
          busy={busy}
          onSave={!!page}
          onCancel={() => setPending(null)}
          onConfirm={() => choose(pending)}
        />
      )}
    </div>
  );
}

interface VictimAgent { id: string; status?: string; }

/** Destructive confirm for a theme switch with live workers (report §E copy). */
function ThemeSwitchConfirmModal({
  label, agents, busy, onSave, onCancel, onConfirm,
}: {
  label: string;
  agents: VictimAgent[];
  busy: boolean;
  /** Inside Settings the switch waits for the page's Save; the button says so. */
  onSave: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const n = agents.length;
  const working = agents.filter((a) => a.status && !['idle', 'success', 'error'].includes(a.status)).length;
  const godName = useStore.getState().agents.find((a) => a.isGod)?.name ?? 'the orchestrator';

  return (
    <div
      onClick={busy ? undefined : onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26, 19, 32, 0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: 480, maxWidth: '92vw' }}>
        <Panel title={t('officeTheme.confirmTitle', { label: label.toUpperCase() })} noPadding>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, flexShrink: 0,
                background: 'var(--cth-coral-light)',
                boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ProIcon name="bell" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: 'var(--cth-font-display)', fontSize: 12, lineHeight: '20px',
                  color: 'var(--cth-ink-900)', marginBottom: 4,
                }}>
                  {t('officeTheme.startsFreshCast')}
                </div>
                <div style={{ fontSize: 15, lineHeight: '22px', color: 'var(--cth-ink-700)' }}>
                  {n === 1
                    ? t('officeTheme.deleteCount', { count: n })
                    : t('officeTheme.deleteCountPlural', { count: n })}{' '}
                  {t('officeTheme.onlyCarries', { god: godName })}
                  {working > 0 && (
                    <span style={{ display: 'block', marginTop: 6, color: 'var(--cth-coral)' }}>
                      ⚠ {working === 1
                        ? t('officeTheme.stillWorking', { count: working })
                        : t('officeTheme.stillWorkingPlural', { count: working })}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)', marginTop: 8 }}>
                  {t('officeTheme.cantUndo')}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Btn onClick={onCancel} disabled={busy}>
                {t('common.cancel')}
              </Btn>
              <Btn kind="danger" onClick={onConfirm} disabled={busy}>
                {busy ? t('officeTheme.switching') : onSave ? t('officeTheme.deleteOnSave', { count: n }) : t('officeTheme.deleteSwitch', { count: n })}
              </Btn>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
