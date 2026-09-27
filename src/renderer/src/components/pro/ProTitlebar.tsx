/**
 * THE PRO TITLEBAR (0.4.9 phase 6, plan Part 2 G7). Prototype of record:
 * hive/shared/design/app-v2/prototype.html `.titlebar` (v3) and its
 * `#tb-depth` segment. App.tsx draws this under PRO and its own cream
 * titlebar under Classic; nothing here is shared with the Classic bar but the
 * facts.
 *
 *   version      quiet, mono, far left. It IS the update control: with
 *                nothing pending a click checks; with a release pending the
 *                chip beside it says what a click does (restart, update,
 *                download). One state machine for both skins
 *                (components/updateBadgeState.ts).
 *   Connected    the team relay state from `useTeamsMode()`: live is
 *                Connected with a mint dot, degraded is Reconnecting with a
 *                peach one, solo draws nothing. Click opens the Team screen
 *                through the shell's one door (proNavigate).
 *   sun / moon   the theme, drawn as where a click GOES: a moon while the app
 *                is light, a sun while it is dark.
 *   gear         raises `cth:open-settings`, which ProShell answers with the
 *                Settings page.
 *   Classic | PRO   ModeSwitch, already PRO built.
 *
 * WHAT LEFT. "auto mode on" is not chrome (Part 3 of the plan: that fact is
 * Michael's Budget & breaker tab), and the fullscreen focus terminal has no
 * job in PRO, where the agent screen is the focus.
 *
 * SIMPLE | TECHNICAL LEFT TOO (founder, 3 Sep 2026). It was a second door to
 * `config.audience` and the titlebar is not where a person changes who they
 * are; Settings → General keeps the one switch.
 */
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { clampPercent } from '@shared/updateState';
import { useUpdateBadge, type UpdateBadgeState } from '../updateBadgeState';
import { useTeamsMode } from '../team/teamsMode';
import { TEAM_PANE } from '../team/teamsSeam';
import { ModeSwitch } from './ModeSwitch';
import { proNavigate } from './proNav';
import { Btn, Chip, IconBtn, SectionH, Sheet, StatusDot, proToast } from './ui';

export interface ProTitlebarProps {
  theme: string;
  onToggleTheme: () => void;
  appVersion: string;
  /** The app's chrome slot (AppSlots.tsx), which App.tsx owns for both skins. */
  chrome?: ReactNode;
}

export function ProTitlebar({ theme, onToggleTheme, appVersion, chrome }: ProTitlebarProps) {
  const { t } = useTranslation();
  const dark = theme === 'dark';
  return (
    <div
      className="cth-titlebar-drag"
      style={{
        height: 38, minHeight: 38, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 12px 0 96px', background: 'var(--cth-cream-50)', borderBottom: '1px solid var(--cth-ink-300)',
        fontFamily: 'var(--cth-font-ui)', fontSize: 12, color: 'var(--cth-ink-500)', userSelect: 'none'
      }}
    >
      <span className="cth-titlebar-nodrag" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
        <VersionChip appVersion={appVersion} />
      </span>
      <span style={{ flex: 1 }} />
      <span className="cth-titlebar-nodrag" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {chrome}
        <IconBtn name={dark ? 'sun' : 'moon'} title={dark ? t('pro.chrome.themeLight') : t('pro.chrome.themeDark')} onClick={onToggleTheme} />
        <IconBtn name="settings" title={t('pro.chrome.settings')} onClick={() => window.dispatchEvent(new CustomEvent('cth:open-settings'))} />
        <ModeSwitch />
      </span>
    </div>
  );
}

/* ---- Connected ------------------------------------------------------------- */

/** The chrome slot's occupant under PRO. Solo draws nothing: telling someone
 *  with no team that they are Connected claims a team that does not exist. */
export function ProConnectionChip() {
  const { t } = useTranslation();
  const mode = useTeamsMode();
  if (mode !== 'live' && mode !== 'degraded') return null;
  const live = mode === 'live';
  return (
    <Chip
      tone="outline"
      style={{ border: 'none', padding: '0 4px', fontSize: 11.5, gap: 6, color: 'var(--cth-ink-500)' }}
      title={t('pro.chrome.connectionTip')}
      ariaLabel={live ? t('pro.chrome.connected') : t('pro.chrome.reconnecting')}
      onClick={() => proNavigate(TEAM_PANE)}
    >
      <StatusDot status={live ? 'success' : 'waiting'} />
      {live ? t('pro.chrome.connected') : t('pro.chrome.reconnecting')}
    </Chip>
  );
}

/* ---- the version, which is the update control ------------------------------ */

const MONO: React.CSSProperties = { fontFamily: 'var(--cth-font-mono)', fontSize: 11 };

function VersionChip({ appVersion }: { appVersion: string }) {
  const { t } = useTranslation();
  const u = useUpdateBadge();
  const label = updateLabel(u, t);
  const tone = u.view.tone === 'ready' ? 'accent' : u.view.tone === 'warn' ? 'bad' : 'muted';
  const click = u.interactive ? () => { void u.click(); } : undefined;

  // The Classic badge pops a card under itself for this; in PRO a positive
  // "checked, you are current" is a toast, and it self dismisses like one.
  useEffect(() => {
    if (u.checkedOk) proToast(t('pro.chrome.latestToast', { version: u.version }), { tone: 'ok' });
  }, [u.checkedOk]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Chip
          tone="outline"
          style={{ ...MONO, border: 'none', padding: '0 2px', color: 'var(--cth-ink-500)' }}
          title={label ? undefined : u.view.title}
          ariaLabel={t('pro.chrome.version', { version: appVersion })}
          onClick={label ? undefined : click}
        >
          v{appVersion}
        </Chip>
        {label && (
          <Chip tone={tone} title={u.view.title} style={MONO} onClick={click}>
            {label}
          </Chip>
        )}
      </span>
      {u.started && <StartedSheet version={u.started} steps={u.steps} onClose={u.dismissStarted} />}
    </>
  );
}

/** The chip's words, from the view the state machine produced. `title`
 *  stays the machine's own sentence: it is the one place the updater's
 *  verbatim error is ever surfaced. */
function updateLabel(u: UpdateBadgeState, t: (k: string, o?: Record<string, unknown>) => string): string | null {
  const { view, status } = u;
  if (view.label === null) return null;
  if (view.tone === 'busy') {
    return status?.state === 'downloading'
      ? t('pro.chrome.update.downloading', { pct: clampPercent(status.percent) })
      : t('pro.chrome.update.checking');
  }
  if (view.tone === 'warn') return t('pro.chrome.update.failed');
  if (view.tone === 'ready' && u.pending) {
    const key = view.action === 'restart' ? 'restart' : view.action === 'download' ? 'update' : 'download';
    return t(`pro.chrome.update.${key}`, { version: u.pending });
  }
  return t('pro.chrome.update.latest');
}

/** After a manual download starts: the file is in the browser, here is what
 *  to do with it, for this OS. The steps are the shared module's. */
function StartedSheet({ version, steps, onClose }: { version: string; steps: { os: string; steps: string[] }; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Sheet onClose={onClose} width={460} zIndex={950}>
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('pro.chrome.startedTitle', { version })}</h2>
        <div style={{ fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.5 }}>{t('pro.chrome.startedBody')}</div>
        <SectionH>{t('pro.chrome.startedOn', { os: steps.os })}</SectionH>
        <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {steps.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <Btn kind="primary" onClick={onClose}>{t('pro.chrome.gotIt')}</Btn>
        </div>
      </div>
    </Sheet>
  );
}
