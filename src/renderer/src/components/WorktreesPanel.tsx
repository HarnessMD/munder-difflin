/**
 * The worktree list (0.5.3, feature 24, the founder's request): every folder the
 * app made for an isolated agent or a temp, with its project, branch, age, size
 * and what it still holds, and a guarded delete.
 *
 * It lives in Settings, General, above the Danger Zone, because Settings is ONE
 * form drawn by both skins (pro/settings/chrome.ts), so one panel reaches Classic
 * and PRO without a fork.
 *
 * THREE SPEEDS, on purpose. The list is read from the disk and arrives at once.
 * What each row holds needs git (about 200 ms a row on a real floor) and its size
 * needs the disk (about a second for a gigabyte), so both are asked row by row,
 * a few at a time, and each row fills in when its answer lands. Nothing a person
 * can click waits for a size.
 *
 * The delete asks main twice over: main checks again where the folder is, whether
 * an agent is running in it and what it holds, whatever this component believes
 * (main/worktreeAdmin.ts). `confirmed` is sent only when the warning on screen
 * named the work that will be lost.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Btn } from './pro/ui';
import { settingsChrome, type SettingsChromeKind } from './pro/settings/chrome';
import {
  sortWorktreeRows, worktreeAgeLine, worktreeHoldsWork, worktreeSizeLabel, worktreeWorkLines,
  type WorktreeRow, type WorktreeWork
} from '@shared/worktreeList';

/** "1.1 GB" read left to right wherever it lands. In an Arabic line the digits
 *  and the unit are two runs and swap ("GB 1.1") unless they are isolated. */
const ltr = (label: string) => `\u2066${label}\u2069`;

/** Rows asked about at once. Each is a git status in a full checkout. */
const PARALLEL = 3;

/** Facts joined by a middle dot. Each is its own isolated run, so an English
 *  branch name or "3.5 GB" inside an Arabic line cannot reorder its neighbours. */
function Bits({ bits }: { bits: Array<string | null | undefined> }) {
  const shown = bits.filter((b): b is string => !!b);
  return <>{shown.map((b, i) => (
    <span key={i}>{i > 0 && ' · '}<span style={{ unicodeBidi: 'isolate' }}>{b}</span></span>
  ))}</>;
}

export function WorktreesPanel({ chrome }: { chrome: SettingsChromeKind }) {
  const { t } = useTranslation();
  const { sectionHead, card, errorText } = settingsChrome(chrome);
  const [rows, setRows] = useState<WorktreeRow[] | null>(null);
  /** undefined = not asked yet, null = not a worktree. */
  const [work, setWork] = useState<Record<string, WorktreeWork | null>>({});
  const [sizes, setSizes] = useState<Record<string, number | null>>({});
  const [asking, setAsking] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  /** Bumped by every load, so answers for an older list are dropped. */
  const run = useRef(0);

  const load = useCallback(() => {
    const api = window.cth;
    if (!api?.listOwnedWorktrees) { setRows([]); return; }
    const mine = ++run.current;
    setWork({}); setSizes({}); setErrors({}); setAsking(null);
    api.listOwnedWorktrees().then(async (list) => {
      if (mine !== run.current) return;
      const sorted = sortWorktreeRows(list);
      setRows(sorted);
      const queue = [...sorted];
      const worker = async () => {
        for (let r = queue.shift(); r; r = queue.shift()) {
          const path = r.path;
          const w = await api.worktreeWork(path).catch(() => null);
          if (mine !== run.current) return;
          setWork((m) => ({ ...m, [path]: w }));
          const s = await api.worktreeSize(path).catch(() => null);
          if (mine !== run.current) return;
          setSizes((m) => ({ ...m, [path]: s }));
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
    }).catch(() => { if (mine === run.current) setRows([]); });
  }, []);

  useEffect(() => { load(); return () => { run.current++; }; }, [load]);

  const remove = async (row: WorktreeRow, confirmed: boolean) => {
    setBusy(row.path);
    setErrors((m) => ({ ...m, [row.path]: '' }));
    try {
      const res = await window.cth.removeOwnedWorktree(row.path, confirmed);
      if (res.ok) {
        setRows((list) => (list ?? []).filter((r) => r.path !== row.path));
        setAsking(null);
      } else if (res.code === 'needs-confirm') {
        // It holds work the warning did not name (the row was stale, or not yet
        // read). Show what main found and ask again.
        if (res.work) setWork((m) => ({ ...m, [row.path]: res.work as WorktreeWork }));
        setAsking(row.path);
      } else if (res.code === 'live') {
        setRows((list) => (list ?? []).map((r) => (r.path === row.path ? { ...r, live: true } : r)));
        setAsking(null);
      } else {
        setErrors((m) => ({ ...m, [row.path]: res.code === 'git-failed' ? t('settings.worktrees.refused.gitFailed', { error: res.error }) : t('settings.worktrees.refused.notOurs') }));
        setAsking(null);
      }
    } catch (e) {
      setErrors((m) => ({ ...m, [row.path]: String(e) }));
    } finally { setBusy(null); }
  };

  const measured = (rows ?? []).filter((r) => typeof sizes[r.path] === 'number');
  const total = measured.reduce((n, r) => n + (sizes[r.path] as number), 0);
  const count = rows?.length ?? 0;
  const muted = { fontSize: 12, lineHeight: '18px', color: 'var(--cth-ink-500)' } as const;

  return (
    <div data-worktrees-panel style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ ...sectionHead, marginBottom: 0, flex: '1 1 auto' }}>{t('settings.worktrees.title')}</div>
        <Btn size="sm" onClick={load}>{t('settings.worktrees.refresh')}</Btn>
      </div>
      <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-700)' }}>{t('settings.worktrees.desc')}</p>
      {rows === null && <div style={muted}>{t('settings.worktrees.loading')}</div>}
      {rows !== null && count === 0 && <div style={muted}>{t('settings.worktrees.empty')}</div>}
      {count > 0 && (
        <div data-worktrees-total style={muted}>
          <Bits bits={[
            t(count === 1 ? 'settings.worktrees.totalOne' : 'settings.worktrees.totalMany', { count }),
            measured.length === count
              ? t('settings.worktrees.totalSize', { size: ltr(worktreeSizeLabel(total)) })
              : t('settings.worktrees.totalSoFar', { size: ltr(worktreeSizeLabel(total)), done: measured.length, count })
          ]} />
        </div>
      )}
      {(rows ?? []).map((row) => {
        const w = work[row.path];
        const size = sizes[row.path];
        const age = worktreeAgeLine(row.createdAt, Date.now());
        const isAsking = asking === row.path;
        const notWorktree = !row.projectRoot || w === null;
        const risky = !!w && worktreeHoldsWork(w);
        return (
          <div key={row.path} data-worktree-row={row.name} style={{ ...card(false), display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div title={row.path} style={{ fontSize: 13, lineHeight: '20px', fontWeight: 600, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</div>
                <div style={{ ...muted, overflowWrap: 'anywhere' }}>
                  <Bits bits={[
                    row.projectRoot ? row.projectRoot.split(/[\\/]/).filter(Boolean).pop() : null,
                    row.projectRoot ? (row.branch ?? t('settings.worktrees.detached')) : null,
                    age ? t(`settings.worktrees.${age.key}`, { count: age.count }) : null
                  ]} />
                </div>
              </div>
              <div data-worktree-size style={{ ...muted, flex: '0 0 auto', minWidth: 64, textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                {size === undefined ? t('settings.worktrees.measuring') : size === null ? '' : ltr(worktreeSizeLabel(size))}
              </div>
              <div style={{ flex: '0 0 auto' }}>
                <Btn
                  size="sm" kind="danger"
                  disabled={row.live || notWorktree || busy !== null || isAsking}
                  title={row.live ? t('settings.worktrees.liveHint') : notWorktree ? t('settings.worktrees.notWorktreeHint') : undefined}
                  onClick={() => setAsking(row.path)}
                >
                  {t('settings.worktrees.delete')}
                </Btn>
              </div>
            </div>
            <div data-worktree-state style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 12, lineHeight: '18px' }}>
              {row.live && <span style={{ color: 'var(--cth-ink-900)', fontWeight: 600 }}>{t('settings.worktrees.live')}</span>}
              {notWorktree
                ? <span style={{ color: 'var(--cth-ink-500)' }}>{t('settings.worktrees.notWorktree')}</span>
                : w === undefined
                  ? <span style={{ color: 'var(--cth-ink-500)' }}>{t('settings.worktrees.checking')}</span>
                  : worktreeWorkLines(w).map((l) => (
                    <span key={l.key} style={{ color: l.risky ? 'var(--cth-status-blocked)' : 'var(--cth-ink-500)' }}>
                      {t(`settings.worktrees.${l.key}`, { count: l.count, base: l.base })}
                    </span>
                  ))}
            </div>
            {isAsking && (
              <div data-worktree-confirm style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid var(--cth-ink-300)' }}>
                <div style={{ fontSize: 13, lineHeight: '20px', color: 'var(--cth-ink-900)' }}>
                  {w === undefined
                    ? t('settings.worktrees.confirmUnread')
                    : !risky
                      ? t('settings.worktrees.confirmClean')
                      : !w?.known
                        ? t('settings.worktrees.confirmUnknown')
                        : [
                          w.uncommitted > 0 ? t(w.uncommitted === 1 ? 'settings.worktrees.loseOne' : 'settings.worktrees.loseMany', { count: w.uncommitted }) : null,
                          w.unmerged > 0 ? t(w.unmerged === 1 ? 'settings.worktrees.keepOne' : 'settings.worktrees.keepMany', { count: w.unmerged, branch: row.branch ?? t('settings.worktrees.detached') }) : null
                        ].filter(Boolean).join(' ')}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Btn size="sm" kind="danger" disabled={busy !== null} onClick={() => void remove(row, risky)}>
                    {busy === row.path ? t('settings.worktrees.deleting') : risky ? t('settings.worktrees.deleteAnyway') : t('settings.worktrees.deleteFolder')}
                  </Btn>
                  <Btn size="sm" disabled={busy !== null} onClick={() => setAsking(null)}>{t('settings.worktrees.keep')}</Btn>
                </div>
              </div>
            )}
            {errors[row.path] && <div style={errorText}>{errors[row.path]}</div>}
          </div>
        );
      })}
    </div>
  );
}
