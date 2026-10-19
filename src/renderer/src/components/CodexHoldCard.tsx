// The Settings list is adapted from Prozzta/guppyos 02d0d50b CodexLayerNotice.tsx (MIT).
import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { CodexHoldView } from '../../../preload';
import { PixelButton } from './PixelButton';
import { acquireTerminal, resetTerminal } from './terminalPool';
import { useStore, type Agent } from '@/store/store';
import { buildSpawnCommand, inferAgentProvider, tokenizeCommand } from '@/store/config';
import { roleForHiveSpawn } from '@shared/agentRole';

type HoldItem = CodexHoldView['layers'][number]['items'][number];
/** The words each row gets: codexLayer.kind.<kind>. */
type HoldKind = 'config' | 'hooks' | 'setting' | 'rules' | 'agents' | 'hookFiles' | 'unreadable' | 'doesNotParse';
const KIND_ORDER: HoldKind[] = ['config', 'hooks', 'setting', 'rules', 'agents', 'hookFiles', 'unreadable', 'doesNotParse'];

export interface HoldRow { kind: HoldKind; names: string[]; more: number }
/** One `.codex` folder Codex would load from, its rows, and the files found there
 *  (for Settings). `unread`: nothing in it could be checked. */
export interface HoldFolder { folder: string; rows: HoldRow[]; files: string[]; more: number; unread?: boolean }

const isUnder = (file: string, dir: string): boolean =>
  file === dir || file.startsWith(dir + '/') || file.startsWith(dir + '\\');
const baseName = (p: string): string => p.split(/[\\/]/).filter(Boolean).pop() ?? p;
const detailNames = (detail: string | undefined): string[] =>
  (detail ?? '').split(',').map((s) => s.trim()).filter(Boolean);

/** An item's row: by what main found and the folder holding it. A file held in the
 *  `.codex` folder itself (hooks.json, config.toml) names its hooks; one held in
 *  `.codex/hooks` is a hook file. `confinement` never reaches the card. */
function kindOf(item: HoldItem, rel: string): HoldKind | null {
  switch (item.what) {
    case 'mcp-servers': return 'config';
    case 'hooks': return item.more === undefined && !/[\\/]/.test(rel) && rel !== 'hooks' ? 'hooks' : 'hookFiles';
    case 'setting': return 'setting';
    case 'rules': return 'rules';
    case 'agents': return 'agents';
    case 'unreadable': return 'unreadable';
    case 'does-not-parse': return 'doesNotParse';
    default: return null;
  }
}

/** The names a row shows in code type: server, hook or setting names as main gives
 *  them, else the file's own name. */
function namesOf(item: HoldItem, kind: HoldKind, rel: string): string[] {
  const fallback = [rel || baseName(item.file)];
  if (kind === 'config' || kind === 'hooks' || kind === 'setting') {
    const names = detailNames(item.detail);
    return names.length ? names : fallback;
  }
  return kind === 'unreadable' || kind === 'doesNotParse' ? fallback : [baseName(item.file)];
}

/** Pure: the hold as the card lists it (Pam's P8, community card). Each file goes
 *  under the folder it loads from: a worktree's own `.codex`, then its main
 *  checkout's for hooks. One row per kind per folder; "and N more" stays with its
 *  kind. What could not be checked shows as the project folder with no files. */
export function codexHoldFolders(hold: CodexHoldView): HoldFolder[] {
  const out: HoldFolder[] = [];
  const at = (folder: string): HoldFolder => {
    let f = out.find((x) => x.folder === folder);
    if (!f) { f = { folder, rows: [], files: [], more: 0 }; out.push(f); }
    return f;
  };
  for (const layer of hold.layers) {
    at(layer.dotCodex);
    if (layer.hooksFrom) at(layer.hooksFrom);
    for (const item of layer.items) {
      const folder = layer.hooksFrom && isUnder(item.file, layer.hooksFrom) ? layer.hooksFrom : layer.dotCodex;
      const rel = isUnder(item.file, folder) ? item.file.slice(folder.length + 1) : baseName(item.file);
      const kind = kindOf(item, rel);
      if (!kind) continue;
      const f = at(folder);
      let row = f.rows.find((r) => r.kind === kind);
      if (!row) { row = { kind, names: [], more: 0 }; f.rows.push(row); }
      if (item.more !== undefined) { row.more += item.more; f.more += item.more; continue; }
      for (const n of namesOf(item, kind, rel)) if (!row.names.includes(n)) row.names.push(n);
      const file = rel || baseName(item.file);
      if (!f.files.includes(file)) f.files.push(file);
    }
  }
  for (const f of out) f.rows.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  const listed = out.filter((f) => f.rows.length > 0);
  // What could not be checked counts too: the project folder, saying so.
  if (hold.unknown.length && !listed.some((f) => f.folder === hold.folder)) listed.push({ folder: hold.folder, rows: [], files: [], more: 0, unread: true });
  return listed;
}

const mono: CSSProperties = { fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, overflowWrap: 'anywhere' };
const tagStyle: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px',
  color: 'var(--cth-ink-900)', background: 'var(--cth-peach-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
  whiteSpace: 'nowrap', display: 'inline-block', fontWeight: 400,
};
const groupStyle: CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px',
  background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
};
const bodyText: CSSProperties = { margin: 0, fontSize: 12.5, lineHeight: 1.45, color: 'var(--cth-ink-700)' };

function FolderGroup({ folder }: { folder: HoldFolder }) {
  const { t } = useTranslation();
  return (
    <div style={groupStyle}>
      <div dir="ltr" style={mono}>{folder.folder}</div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5, lineHeight: 1.5 }}>
        {folder.unread && (
          <li style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>{t('codexLayer.unreadable')}</li>
        )}
        {folder.rows.map((row) => (
          <li key={row.kind} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {row.names.length > 0 && (
              <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <code dir="ltr" style={{ ...mono, color: 'var(--cth-ink-900)' }}>{row.names.join(', ')}</code>
                <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t(`codexLayer.kind.${row.kind}`)}</span>
              </span>
            )}
            {row.more > 0 && (
              <span style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>{t('codexLayer.more', { count: row.more })}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface CodexHoldCardProps {
  hold: CodexHoldView;
  /** The agent's name as the person gave it. */
  agent: string;
  busy?: boolean;
  /** Why the last Allow did not take, worded by the caller. */
  error?: string | null;
  onAllow: () => void;
  onNotNow: () => void;
}

/** A Codex start main held (Kevin's R3, Pam's P8): what the folder would load
 *  unreviewed, and the person's OK. No red: the state is the "not started" tag. */
export function CodexHoldCard({ hold, agent, busy, error, onAllow, onNotNow }: CodexHoldCardProps) {
  const { t } = useTranslation();
  const folders = codexHoldFolders(hold);
  return (
    <div role="status" data-codex-hold={hold.folderKey} style={{
      display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
      background: 'var(--cth-cream-50)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 14, fontWeight: 600, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
        <span style={tagStyle}>{t('codexLayer.tag')}</span>
        <span>{t('codexLayer.title', { agent })}</span>
      </div>
      <p style={bodyText}>{t('codexLayer.body', { agent })}</p>
      {folders.map((f) => <FolderGroup key={f.folder} folder={f} />)}
      <p style={bodyText}>{t('codexLayer.trust')}</p>
      {error && <div role="status" style={{ fontSize: 12, color: 'var(--cth-ink-700)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <PixelButton variant="primary" size="sm" disabled={busy} onClick={onAllow}>
          {t(folders.length > 1 ? 'codexLayer.allowAll' : 'codexLayer.allow')}
        </PixelButton>
        <PixelButton variant="ghost" size="sm" disabled={busy} onClick={onNotNow}>
          {t('codexLayer.notNow')}
        </PixelButton>
      </div>
    </div>
  );
}

/** The held starts, kept current from main. */
export function useCodexHolds(): CodexHoldView[] {
  const [holds, setHolds] = useState<CodexHoldView[]>([]);
  useEffect(() => {
    let alive = true;
    void window.cth.codexHolds().then((h) => { if (alive) setHolds(Array.isArray(h) ? h : []); }).catch(() => { /* none */ });
    const off = window.cth.onCodexHolds((h) => setHolds(Array.isArray(h) ? h : []));
    return () => { alive = false; off(); };
  }, []);
  return holds;
}

/** Starts a held agent again in its own pane once its folder is allowed: the
 *  revive's spawn (its worktree if still there, its recorded command, its prior
 *  session). Held again, main pushes the hold and the card comes back. */
async function startHeldAgent(a: Agent): Promise<{ ok: boolean; error?: string }> {
  if (!a.ptyId) return { ok: false };
  const cfg = await window.cth.getConfig();
  let cwd = a.cwd;
  if (a.worktreePath && (await window.cth.gitIsRepo(a.worktreePath))) cwd = a.worktreePath;
  const provider = inferAgentProvider(a.command, a.provider);
  const command = (a.command ?? '').trim() || buildSpawnCommand(cfg, a.model, provider);
  const [exe, ...args] = tokenizeCommand(command);
  const role = roleForHiveSpawn(a);
  const hive = a.isGod
    ? { id: a.id, name: a.name, cwd, provider, isGod: true, role }
    : a.isAssistant
    ? { id: a.id, name: a.name, cwd, provider, isAssistant: true, role }
    : { id: a.id, name: a.name, cwd, provider, role };
  resetTerminal(a.ptyId);
  const entry = acquireTerminal(a.ptyId);
  let cols = 100, rows = 30;
  try { entry.fit.fit(); cols = entry.term.cols; rows = entry.term.rows; } catch { /* host not sized yet */ }
  const res = await window.cth.spawnPty({ id: a.ptyId, cwd, command: exe, provider, args, cols, rows, isolate: false, resume: true, hive });
  if (res.ok) useStore.getState().updateAgent(a.id, { status: 'idle', action: 'starting up' });
  return res;
}

/** The card in a held agent's own terminal pane (a revive, a restored row), over
 *  the terminal, as Pro draws it. Allow records the folder, then starts the agent
 *  again here; not now puts the hold off. */
export function CodexHoldPane({ ptyId }: { ptyId: string }) {
  const { t } = useTranslation();
  const holds = useCodexHolds();
  const agent = useStore((s) => s.agents.find((a) => a.ptyId === ptyId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hold = agent ? [...holds].reverse().find((h) => h.agentId === agent.id) : undefined;
  if (!agent || !hold) return null;
  const allow = async () => {
    setBusy(true);
    setError(null);
    const r = await window.cth.codexHoldAllow(hold.folderKey).catch(() => ({ ok: false, error: 'not-saved' }));
    if (!r.ok && r.error === 'not-saved') { setError(t('settings.agentsModels.saveFailed')); setBusy(false); return; }
    await startHeldAgent(agent).catch(() => undefined);
    setBusy(false);
  };
  return (
    <div style={{
      position: 'absolute', inset: 0, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, background: 'var(--cth-paper-100)',
    }}>
      <div style={{ maxWidth: 520, width: '100%', margin: 'auto' }}>
        <CodexHoldCard
          hold={hold}
          agent={agent.name}
          busy={busy}
          error={error}
          onAllow={() => void allow()}
          onNotNow={() => void window.cth.codexHoldDismiss(hold.at).catch(() => undefined)}
        />
      </div>
    </div>
  );
}

/** A waiting row: the folder the OK is kept under, with every held folder under it. */
interface WaitingRow { key: string; folders: HoldFolder[] }
function waitingRows(holds: readonly CodexHoldView[]): WaitingRow[] {
  const rows: WaitingRow[] = [];
  for (const h of holds) {
    let row = rows.find((r) => r.key === h.folderKey);
    if (!row) { row = { key: h.folderKey, folders: [] }; rows.push(row); }
    for (const f of codexHoldFolders(h)) if (!row.folders.some((x) => x.folder === f.folder)) row.folders.push(f);
  }
  return rows;
}

const listRow: CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 10px',
  background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
};
const headStyle: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
  color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10,
};
const descStyle: CSSProperties = { fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)', marginBottom: 10 };

/** Settings, Agents & Models: held starts waiting for an OK (a start with no card
 *  to ask on), then the folders allowed, each withdrawable. Allow here starts
 *  nothing; withdraw holds the folder again from an agent's next start. */
export function CodexFoldersSetting() {
  const { t } = useTranslation();
  const holds = useCodexHolds();
  const [allowed, setAllowed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const loadAllowed = () => window.cth.codexAllowedFolders()
    .then((k) => setAllowed(Array.isArray(k) ? k : []))
    .catch(() => { /* keep the last list */ });
  useEffect(() => { void loadAllowed(); }, []);

  const act = async (call: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    const r = await call().catch(() => ({ ok: false, error: 'not-saved' }));
    setFailed(!r.ok && r.error === 'not-saved');
    await loadAllowed();
    setBusy(false);
  };
  const waiting = waitingRows(holds);

  return (
    <div>
      {waiting.length > 0 && (
        <>
          <div style={headStyle}>{t('settings.codexFolders.waitingTitle')}</div>
          <div style={descStyle}>{t('settings.codexFolders.waitingDesc')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {waiting.map((w) => (
              <div key={w.key} style={{ ...listRow, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span dir="ltr" style={mono}>{w.key}</span>
                  {w.folders.map((f) => (
                    <div key={f.folder} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {!(w.folders.length === 1 && f.folder === w.key) && (
                        <span dir="ltr" style={{ ...mono, fontSize: 11, color: 'var(--cth-ink-500)' }}>{f.folder}</span>
                      )}
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 10px', fontSize: 12, color: 'var(--cth-ink-700)' }}>
                        {f.unread || (!f.files.length && !f.more)
                          ? <span>{t('codexLayer.unreadable')}</span>
                          : f.files.map((file) => <span key={file} dir="ltr" style={mono}>{file}</span>)}
                        {f.more > 0 && <span>{t('codexLayer.more', { count: f.more })}</span>}
                      </span>
                    </div>
                  ))}
                </div>
                <PixelButton variant="primary" size="sm" disabled={busy} onClick={() => void act(() => window.cth.codexHoldAllow(w.key))}>
                  {t('settings.codexFolders.allow')}
                </PixelButton>
              </div>
            ))}
          </div>
          <div style={{ height: 16 }} />
        </>
      )}

      <div style={headStyle}>{t('settings.codexFolders.title')}</div>
      <div style={descStyle}>{t('settings.codexFolders.desc')}</div>
      {allowed.length === 0 ? (
        <div style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>{t('settings.codexFolders.empty')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allowed.map((k) => (
            <div key={k} style={listRow}>
              <span dir="ltr" style={{ ...mono, minWidth: 0 }}>{k}</span>
              <PixelButton variant="secondary" size="sm" disabled={busy} onClick={() => void act(() => window.cth.codexWithdrawFolder(k))}>
                {t('settings.codexFolders.withdraw')}
              </PixelButton>
            </div>
          ))}
        </div>
      )}
      {failed && <div role="status" style={{ marginTop: 8, fontSize: 12, color: 'var(--cth-ink-700)' }}>{t('settings.agentsModels.saveFailed')}</div>}
    </div>
  );
}
