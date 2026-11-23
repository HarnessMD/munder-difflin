// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * Settings, Agents & Models: the project Codex folders the person allowed for
 * hive Codex agents. Withdraw takes one OK back from
 * each agent's next start; a running agent is not stopped. Above them, when any
 * wait, the folders a start with no card (a temp, a voice hire) is held on,
 * each with what Codex would load there; allow keeps the OK
 * and moves the row to the allowed list, and starts nothing. Main sends no
 * change event for that list, so it is read again every few seconds. Folder
 * and file names are shown as found and never translated.
 */
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CodexWaitingFolder } from '@shared/codexFolders';
import { PixelButton } from './PixelButton';

const POLL_MS = 5000;

const heading: CSSProperties = { fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px', color: 'var(--cth-ink-500)', textTransform: 'uppercase' };
const desc: CSSProperties = { fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' };
const row: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 10px',
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', background: 'var(--cth-cream-100)',
};
const mono: CSSProperties = { fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-900)', overflowWrap: 'anywhere', minWidth: 0 };

export function CodexFoldersSection() {
  const { t } = useTranslation();
  const [folders, setFolders] = useState<string[] | null>(null);
  const [waiting, setWaiting] = useState<CodexWaitingFolder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [refused, setRefused] = useState<{ folder: string; error: string } | null>(null);

  const readAllowed = () => window.cth.codexAllowedFolders().then(setFolders, () => setFolders((f) => f ?? []));
  const readWaiting = () => window.cth.codexWaitingFolders().then((w) => setWaiting(Array.isArray(w) ? w : []), () => { /* keep the last answer */ });

  useEffect(() => {
    let live = true;
    void window.cth.codexAllowedFolders().then((f) => { if (live) setFolders(f); }, () => { if (live) setFolders([]); });
    const read = () => { void window.cth.codexWaitingFolders().then((w) => { if (live) setWaiting(Array.isArray(w) ? w : []); }, () => { /* keep the last answer */ }); };
    read();
    const timer = setInterval(read, POLL_MS);
    return () => { live = false; clearInterval(timer); };
  }, []);

  const withdraw = async (folder: string) => {
    setBusy(folder);
    try { setFolders(await window.cth.codexWithdrawFolder(folder)); } catch { /* the list stays as it was */ }
    setBusy(null);
  };
  const allow = async (folder: string) => {
    setBusy(folder); setRefused(null);
    try {
      const r = await window.cth.codexAllowWaitingFolder(folder);
      // 'not-waiting': the row was already gone; reading the lists again drops it.
      if (!r.ok && r.error !== 'not-waiting') setRefused({ folder, error: r.error ?? 'refused' });
    } catch (e) {
      setRefused({ folder, error: e instanceof Error ? e.message : String(e) });
    }
    await Promise.all([readWaiting(), readAllowed()]);
    setBusy(null);
  };

  return (
    <div data-codex-folders style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {waiting.length > 0 && (
        <div data-codex-waiting style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          <div style={heading}>{t('settings.codexFolders.waitingTitle')}</div>
          <span style={desc}>{t('settings.codexFolders.waitingDesc')}</span>
          {waiting.map((w) => (
            <div key={w.folder} style={{ ...row, alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <span dir="ltr" style={mono}>{w.folder}</span>
                {w.loads.map((e) => (
                  // The entry's own folder only when it is not the key itself, as in a temp's worktree.
                  <div key={e.folder} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    {!(w.loads.length === 1 && e.folder === w.folder) && (
                      <span dir="ltr" style={{ ...mono, fontSize: 11, color: 'var(--cth-ink-500)', marginTop: 2 }}>{e.folder}</span>
                    )}
                    <span dir="ltr" style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', fontSize: 11.5, color: 'var(--cth-ink-700)' }}>
                      {e.files.length
                        ? e.files.map((f) => <span key={f} style={{ fontFamily: 'var(--cth-font-mono)', overflowWrap: 'anywhere' }}>{f}</span>)
                        : <span dir="auto">{t('codexLayer.unreadable')}</span>}
                      {e.more > 0 && <span dir="auto">{t('codexLayer.more', { count: e.more })}</span>}
                    </span>
                  </div>
                ))}
                {refused?.folder === w.folder && <span style={{ fontSize: 12, color: 'var(--cth-ink-900)' }}>{refused.error}</span>}
              </div>
              <PixelButton variant="primary" size="sm" disabled={busy !== null} onClick={() => void allow(w.folder)} dataAttrs={{ 'data-codex-allow-waiting': 'true' }}>
                {t('settings.codexFolders.allow')}
              </PixelButton>
            </div>
          ))}
        </div>
      )}
      <div style={heading}>{t('settings.codexFolders.title')}</div>
      <span style={desc}>{t('settings.codexFolders.desc')}</span>
      {folders && folders.length === 0 && <span style={desc}>{t('settings.codexFolders.empty')}</span>}
      {folders?.map((f) => (
        <div key={f} style={row}>
          <span dir="ltr" style={mono}>{f}</span>
          <PixelButton variant="secondary" size="sm" disabled={busy !== null} onClick={() => void withdraw(f)}>{t('settings.codexFolders.withdraw')}</PixelButton>
        </div>
      ))}
    </div>
  );
}
