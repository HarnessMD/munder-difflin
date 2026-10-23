import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelPanel } from './PixelPanel';
import { PixelButton } from './PixelButton';
import { Icon } from './Icon';
import type { HarnessConfig } from '@/store/config';
import { ProjectFolderError, ProjectThemeChoice, projectFolderError } from './ProjectThemeChoice';
import type { ProjectThemeId } from '@shared/projectTheme';

export interface HivePickerProps {
  config: HarnessConfig;
  /** Open the CURRENT harness home in-place (no relaunch). */
  onOpenCurrent: () => void;
}

// Set right before a hive SWITCH so App skips this picker once after the relaunch
// changeHome triggers — otherwise the user would land back on the picker for the
// hive they just chose. App.tsx reads + clears it on mount.
const SKIP_KEY = 'cth.skipHivePickerOnce';

function folderName(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

/**
 * HivePicker — the launch-time workspace selector. A "hive" is a harness home
 * folder: its own agents, memory, tasks, and history. On reopen the user can open
 * the hive they were in (fast, in-place), jump to a recent one, browse to an
 * existing folder, or start a new one. Switching to a DIFFERENT home goes through
 * changeHome('fresh'), which tears down services and relaunches against it — so
 * every switch is a clean process restart (cheap here, before any work is live).
 */
export function HivePicker({ config, onOpenCurrent }: HivePickerProps) {
  const current = config.harnessHome;
  const recents = (config.recentHives ?? []).filter((h) => h && h !== current);
  const [busy, setBusy] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  // "create new config…": the folder chosen for a new project, while its floor is picked.
  const [newProject, setNewProject] = useState<string | null>(null);

  // Open a hive. Same folder as the current one → just enter it (no relaunch).
  // A different folder → changeHome('fresh') re-points + relaunches the process.
  const openHive = async (path: string) => {
    if (!path) return;
    if (current && path === current) { onOpenCurrent(); return; }
    setError(undefined);
    setBusy(path);
    try {
      window.localStorage.setItem(SKIP_KEY, '1');
      const res = await window.cth.changeHome(path, 'fresh');
      // Success never returns (the process relaunches). A return means an error.
      if (!res.ok) {
        window.localStorage.removeItem(SKIP_KEY);
        setError(res.error ?? 'Could not open that folder.');
        setBusy(undefined);
      }
    } catch (e) {
      window.localStorage.removeItem(SKIP_KEY);
      setError(e instanceof Error ? e.message : String(e));
      setBusy(undefined);
    }
  };

  const browse = async () => {
    setError(undefined);
    const res = await window.cth.chooseFolder();
    if (res.ok) void openHive(res.path);
    else if (res.error !== 'cancelled') setError(res.error);
  };

  const createNew = async () => {
    setError(undefined);
    const res = await window.cth.chooseFolder();
    if (res.ok) setNewProject(res.path);
    else if (res.error !== 'cancelled') setError(res.error);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--cth-cream-200)',
      backgroundImage:
        `repeating-linear-gradient(45deg, rgba(232, 217, 160, 0.4) 0 1px, transparent 1px 8px)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
      padding: 32
    }}>
      <div style={{ width: newProject ? 520 : 560, maxWidth: '94vw' }}>
        {newProject ? (
          <NewProjectDialog path={newProject} onCancel={() => setNewProject(null)} />
        ) : (
        <PixelPanel variant="dialog" title="SELECT A HARNESS CONFIG" noPadding>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: '19px', color: 'var(--cth-ink-700)' }}>
              A <strong>harness config</strong> is the folder where the app keeps everything for one
              workspace — its settings, your agents and their memory, tasks, triggers, and history.
              Each config is separate and self-contained, so you can run different setups side by side.
              Open the one you were working in, switch to another, or start a new one.
            </p>

            {/* CURRENT — the last-used home, the one-click default. */}
            {current && (
              <div>
                <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 9, color: 'var(--cth-ink-500)', marginBottom: 4 }}>
                  CURRENT
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  background: 'var(--cth-mint-light)', boxShadow: 'inset 0 0 0 2px var(--cth-mint)'
                }}>
                  <Icon name="folder" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 11, lineHeight: '15px' }}>
                      {folderName(current)}
                    </div>
                    <div style={{
                      fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'rtl', textAlign: 'left'
                    }}>{current}</div>
                  </div>
                  <PixelButton variant="primary" size="md" onClick={onOpenCurrent} disabled={!!busy}>
                    open
                  </PixelButton>
                </div>
              </div>
            )}

            {/* RECENTS — other homes this install has opened before. */}
            {recents.length > 0 && (
              <div>
                <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 9, color: 'var(--cth-ink-500)', marginBottom: 4 }}>
                  RECENT
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                  {recents.map((h) => (
                    <button
                      key={h}
                      onClick={() => openHive(h)}
                      disabled={!!busy}
                      title={`Switch to ${h} (reloads the app)`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
                        border: 'none', cursor: busy ? 'default' : 'pointer', textAlign: 'left',
                        opacity: busy && busy !== h ? 0.5 : 1
                      }}
                    >
                      <Icon name="folder" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
                          {folderName(h)}
                        </div>
                        <div style={{
                          fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', direction: 'rtl', textAlign: 'left'
                        }}>{h}</div>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--cth-ink-500)', flexShrink: 0 }}>
                        {busy === h ? 'opening…' : 'switch →'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{
                padding: '6px 10px', background: 'var(--cth-coral-light)',
                boxShadow: 'inset 0 0 0 1px var(--cth-coral)', fontSize: 12, color: 'var(--cth-ink-900)'
              }}>{error}</div>
            )}

            {busy && (
              <div style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>
                Opening {folderName(busy)} — the app will reload…
              </div>
            )}

            {/* OPEN / CREATE — both browse to a folder; "fresh" mode re-points at it
                (bootstrapping an empty one, or reusing existing hive data in place). */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <PixelButton variant="secondary" size="md" onClick={browse} disabled={!!busy}>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Icon name="folder" /> open existing config…
                </span>
              </PixelButton>
              <PixelButton variant="secondary" size="md" onClick={createNew} disabled={!!busy}>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  <Icon name="plus" /> create new config…
                </span>
              </PixelButton>
            </div>
          </div>
        </PixelPanel>
        )}
      </div>
    </div>
  );
}

/** Pam's P2: a new project's floor, picked before the project is created. A click
 *  picks, "create project" acts; The Office is the default. Main refuses a folder
 *  that is not empty before anything changes, and stores the floor for the new home. */
function NewProjectDialog({ path, onCancel }: { path: string; onCancel: () => void }) {
  const { t } = useTranslation();
  const [pick, setPick] = useState<ProjectThemeId>('office');
  const [busy, setBusy] = useState(false);
  const [folderError, setFolderError] = useState<'not-empty' | 'unreadable' | null>(null);
  const [error, setError] = useState<string | undefined>();

  const create = async () => {
    setBusy(true);
    setError(undefined);
    try {
      window.localStorage.setItem(SKIP_KEY, '1');
      const res = await window.cth.changeHome(path, 'fresh', pick);
      // Success never returns (the process relaunches). A return means an error.
      if (!res.ok) {
        window.localStorage.removeItem(SKIP_KEY);
        const refused = projectFolderError(res.error);
        if (refused) setFolderError(refused);
        else setError(res.error ?? 'Could not open that folder.');
        setBusy(false);
      }
    } catch (e) {
      window.localStorage.removeItem(SKIP_KEY);
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  return (
    <PixelPanel variant="dialog" title={t('projectTheme.title')} noPadding>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
        <p style={{ margin: '0 0 6px', fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-700)' }}>
          {t('projectTheme.intro')}
        </p>
        <p dir="ltr" style={{ margin: '0 0 12px', fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-500)', overflowWrap: 'anywhere' }}>
          {t('projectTheme.folder', { path })}
        </p>
        <ProjectThemeChoice pick={pick} onPick={setPick} disabled={busy} />
        {folderError && <div style={{ marginTop: 12 }}><ProjectFolderError error={folderError} /></div>}
        {error && (
          <div style={{
            marginTop: 12, padding: '6px 10px', fontSize: 13, background: 'var(--cth-cream-200)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', color: 'var(--cth-ink-900)'
          }}>{error}</div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <PixelButton variant="ghost" size="md" onClick={onCancel} disabled={busy}>
            {t('common.cancel')}
          </PixelButton>
          {/* A refused folder: the button waits and the line above says why. */}
          <PixelButton variant="primary" size="md" onClick={create} disabled={busy || folderError !== null}>
            {t('projectTheme.create')}
          </PixelButton>
        </div>
      </div>
    </PixelPanel>
  );
}
