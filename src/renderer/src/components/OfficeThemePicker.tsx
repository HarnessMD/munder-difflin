import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { HarnessConfig } from '@/store/config';
import { useStore } from '@/store/store';
import { disposeTerminal } from './terminalPool';
import { PixelPanel } from './PixelPanel';
import { PixelButton } from './PixelButton';
import { Icon } from './Icon';
import { floorSceneTheme, listThemes } from '@/scene/themes/themeCatalog';

type PickId = NonNullable<HarnessConfig['officeTheme']>;

// TV-show office themes (Phase 1 = the switch flow infra). Only `office` has a
// real map+cast today; the five shows render via the loader's office fallback
// until their content lands (Phase 2). `built: false` shows a "soon" tag and a
// fallback note on switch, but the destructive switch flow still runs so the
// whole pipeline (modal → delete cast → persist → re-seat) is exercisable now.
// Star Hike is a bundled theme pack (themes/starhike): like the office it is
// listed whether or not the TV-show flag is on, with its art credit.
interface ThemeMeta { id: PickId; label: string; blurb: string; built: boolean; swatch: string; always?: boolean; pack?: boolean; }
const THEME_META: ThemeMeta[] = [
  { id: 'office',        label: 'The Office',         blurb: 'Dunder Mifflin — the original floor', built: true,  swatch: '#6b5a4a', always: true },
  { id: 'starhike',      label: 'Star Hike',          blurb: 'The starship bridge',                 built: true,  swatch: '#1f6b66', always: true, pack: true },
  { id: 'friends',       label: 'Friends',            blurb: 'Central Perk coffee house',           built: false, swatch: '#9a5a32' },
  { id: 'brooklyn99',    label: 'Brooklyn Nine-Nine', blurb: 'The 99th precinct bullpen',           built: true,  swatch: '#3a5a7a' },
  { id: 'siliconvalley', label: 'Silicon Valley',     blurb: 'The Hacker Hostel',                   built: false, swatch: '#4a6a4a' },
  { id: 'got',           label: 'Game of Thrones',    blurb: 'The Red Keep throne room',            built: false, swatch: '#6a2630' },
  { id: 'hogwarts',      label: 'Harry Potter',       blurb: 'Hogwarts great hall',                 built: false, swatch: '#39305a' },
];

/** Settings "Office Theme" section: the theme cards (The Office and Star Hike
 *  always; the five TV-show floors while the experimental flag is on), the flag
 *  toggle under them, and the destructive switch flow (report §E).
 *  Self-contained so it stays out of SettingsModal's bulk. */
export function OfficeThemePicker({ config }: { config: HarnessConfig }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(!!config.tvShowOffices);
  const [current, setCurrent] = useState<PickId>(config.officeTheme ?? 'office');
  const [pending, setPending] = useState<PickId | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const archiveAgent = useStore((s) => s.archiveAgent);
  const setOfficeTheme = useStore((s) => s.setOfficeTheme);

  // A pack's card shows only while the pack is usable; its credit comes from its theme.json.
  const packs = new Map(listThemes().filter((x) => !x.builtIn).map((x) => [x.id, x]));
  const cards = THEME_META.filter((x) => (x.always || enabled) && (!x.pack || packs.has(x.id)));
  // The floor actually drawn: a hidden TV-show theme shows the office.
  const shown = floorSceneTheme(current, enabled);

  const toggleFlag = async () => {
    const next = !enabled;
    setEnabled(next);
    setNote('');
    try {
      await window.cth.updateConfig({ tvShowOffices: next });
      // Flag off → a TV-show theme shows the office; flag on → restore the
      // persisted theme. A pack shows either way.
      setOfficeTheme(floorSceneTheme(current, next));
    } catch {
      setEnabled(!next); // revert optimistic toggle on failure
    }
  };

  const nonGodAgents = () =>
    useStore.getState().agents.filter((a) => !a.isGod && !a.isAssistant);

  const onSelect = (id: PickId) => {
    setNote('');
    if (busy || id === shown) return;                   // no-op on the floor already shown
    if (nonGodAgents().length === 0) { void applyTheme(id); return; } // god-only → instant
    setPending(id);                                     // workers exist → confirm modal
  };

  const applyTheme = async (id: PickId) => {
    setBusy(true);
    try {
      // Tear down every non-god agent through the EXISTING lifecycle (kill PTY →
      // dispose terminal → archive). god + the prep assistant carry over; god's
      // PTY is never touched. If a PTY won't die, abort the switch (surface the
      // error, don't persist the new theme) rather than leave a half-switched floor.
      const victims = nonGodAgents();
      for (const a of victims) {
        if (a.ptyId) {
          await window.cth.killPty(a.ptyId);
          disposeTerminal(a.ptyId);
        }
      }
      for (const a of victims) archiveAgent(a.id);
      await window.cth.updateConfig({ officeTheme: id });
      setCurrent(id);
      setOfficeTheme(floorSceneTheme(id, enabled)); // → OfficeFloor rebuilds the scene on the new map/cast
      const meta = THEME_META.find((t) => t.id === id);
      if (meta && !meta.built) setNote(t('officeTheme.notBuiltYet', { label: meta.label }));
    } catch (e) {
      setNote(t('officeTheme.switchAborted', { error: e instanceof Error ? e.message : String(e) }));
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

      {/* Theme cards: The Office and Star Hike always, the TV-show floors while the flag is on */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
        {cards.map((theme) => {
          const isCurrent = theme.id === shown;
          const credit = packs.get(theme.id)?.credit;
          const card: CSSProperties = {
            display: 'flex', alignItems: 'center', gap: 8, textAlign: 'start',
            padding: 8, cursor: busy ? 'default' : 'pointer', minWidth: 0, width: '100%',
            background: isCurrent ? 'var(--cth-paper-100)' : 'transparent',
            boxShadow: isCurrent
              ? 'inset 0 0 0 1.5px var(--cth-ink-500)'
              : 'inset 0 0 0 1px var(--cth-ink-300)',
            opacity: busy && !isCurrent ? 0.6 : 1,
          };
          const swatch = (
            <span style={{
              width: 28, height: 28, flexShrink: 0, background: theme.swatch,
              boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)',
            }} />
          );
          const text = (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {theme.label}
                </span>
                {isCurrent && (
                  <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-mint)', textTransform: 'uppercase' }}>
                    {t('officeTheme.current')}
                  </span>
                )}
                {!theme.built && !isCurrent && (
                  <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 7, color: 'var(--cth-ink-500)', textTransform: 'uppercase' }}>
                    {t('officeTheme.soon')}
                  </span>
                )}
              </span>
              <span dir="ltr" style={{ fontSize: 11, lineHeight: '14px', color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {theme.blurb}
              </span>
            </>
          );
          if (!credit) {
            return (
              <button key={theme.id} onClick={() => onSelect(theme.id)} disabled={busy} style={card}>
                {swatch}
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>{text}</span>
              </button>
            );
          }
          // A link cannot sit inside a button: this card is a box holding the pick button and the credit.
          return (
            <div key={theme.id} style={{ ...card, cursor: 'default' }} data-theme-card={theme.id}>
              {swatch}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <button
                  onClick={() => onSelect(theme.id)}
                  disabled={busy}
                  style={{
                    all: 'unset', display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0,
                    cursor: busy ? 'default' : 'pointer',
                  }}
                >
                  {text}
                </button>
                <a
                  href={credit.url}
                  dir="ltr"
                  onClick={(e) => { e.preventDefault(); void window.cth.openExternal(credit.url); }}
                  style={{
                    fontSize: 11, lineHeight: '14px', color: 'var(--cth-ink-500)', textDecoration: 'underline',
                    textUnderlineOffset: 2, whiteSpace: 'nowrap', alignSelf: 'flex-start', cursor: 'pointer',
                  }}
                >
                  {credit.text}
                </a>
              </span>
            </div>
          );
        })}
      </div>

      {note && (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--cth-ink-500)' }}>{note}</div>
      )}

      {/* Experimental feature flag: adds the TV-show floors to the cards above */}
      <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
            {t('officeTheme.tvShow')} <span style={{ color: 'var(--cth-ink-500)' }}>({t('officeTheme.experimental')})</span>
          </span>
          <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
            {t('officeTheme.desc')}
          </span>
        </div>
        <PixelButton variant={enabled ? 'primary' : 'secondary'} size="sm" onClick={toggleFlag}>
          {enabled ? t('common.on') : t('common.off')}
        </PixelButton>
      </div>

      {pending && pendingMeta && (
        <ThemeSwitchConfirmModal
          label={pendingMeta.label}
          agents={nonGodAgents()}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => void applyTheme(pending)}
        />
      )}
    </div>
  );
}

interface VictimAgent { id: string; status?: string; }

/** Destructive confirm for a theme switch with live workers (report §E copy). */
function ThemeSwitchConfirmModal({
  label, agents, busy, onCancel, onConfirm,
}: {
  label: string;
  agents: VictimAgent[];
  busy: boolean;
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
        <PixelPanel variant="dialog" title={t('officeTheme.confirmTitle', { label: label.toUpperCase() })} noPadding>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, flexShrink: 0,
                background: 'var(--cth-coral-light)',
                boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="bell" />
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
              <PixelButton variant="secondary" size="md" onClick={onCancel} disabled={busy}>
                {t('common.cancel')}
              </PixelButton>
              <PixelButton variant="destructive" size="md" onClick={onConfirm} disabled={busy}>
                {busy ? t('officeTheme.switching') : t('officeTheme.deleteSwitch', { count: n })}
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
}
