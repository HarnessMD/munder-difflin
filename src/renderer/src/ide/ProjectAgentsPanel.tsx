/**
 * THE PROJECT'S AGENTS (task force 0.5.8 round 2, item 5; Pam's mock,
 * hive/shared/design/project-ide). The right hand column of the IDE when it
 * was opened on a project: the project's own folder on top, then one card per
 * agent working on it, temps marked as temps.
 *
 * - Open files moves the IDE's file tree into that agent's folder. The top
 *   card moves it back to the project.
 * - Compare lists what that agent changed since its branch started (its base,
 *   written down beside the worktree, core/worktreeBase.ts), with what is not
 *   committed, and opens one file side by side.
 * - A folder with no git shows who works in which folder, and offers to ask
 *   the orchestrator to set git up. The app never runs `git init` itself.
 *
 * Everything is read through calls the app already had (git:worktrees,
 * worktrees:list and worktrees:work, git:compareRefs, git:status); nothing is
 * written.
 */
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import { normPath, projectAgentCards, type ProjectAgentCard } from '@shared/projectAgents';
import type { WorktreeWork } from '@shared/worktreeList';
import { IdeIcon } from './ideIcons';

const LINE = '1px solid var(--cth-ink-300)';
const WINDOWS = typeof navigator !== 'undefined' && /Win/i.test(navigator.platform);
/** The states an agent is at work in, for a card's Working chip. */
const WORKING_STATES: ReadonlySet<string> = new Set(['thinking', 'working', 'compacting', 'looping']);

const chip = (on: boolean): CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', height: 18, padding: '0 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 600,
  border: LINE, background: on ? 'var(--cth-accent-soft, var(--cth-lemon-light))' : 'transparent', color: 'var(--cth-ink-700)', whiteSpace: 'nowrap'
});
const btn: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 8px', borderRadius: 6, border: LINE,
  background: 'var(--cth-cream-50)', color: 'var(--cth-ink-900)', font: 'inherit', fontSize: 11.5, cursor: 'pointer'
};

export interface CompareOpen { cwd: string; rev: string; rel: string; label: string }

interface CompareState { status: 'loading' | 'ready' | 'error'; base: string; rev: string; files: { rel: string; committed: boolean }[]; error?: string }

const folderName = (p: string): string => p.replace(/\\/g, '/').replace(/\/$/, '').split('/').pop() ?? p;

export function ProjectAgentsPanel({ project, root, onOpenFiles, onCompareFile }: {
  /** The project's own folder. */
  project: string;
  /** Where the IDE's tree is now: the project, or one agent's folder. */
  root: string | null;
  onOpenFiles: (target: { agent: Agent | null; cwd: string }) => void;
  onCompareFile: (open: CompareOpen) => void;
}) {
  const { t } = useTranslation();
  const godName = useResolvedGodName();
  const agents = useStore((s) => s.agents);
  const [isRepo, setIsRepo] = useState<boolean | null>(null);
  const [trees, setTrees] = useState<{ path: string; branch: string | null }[]>([]);
  const [owned, setOwned] = useState<{ path: string; name: string; live: boolean }[]>([]);
  const [work, setWork] = useState<Record<string, WorktreeWork | null>>({});
  const [rootChanged, setRootChanged] = useState<number | null>(null);
  const [compare, setCompare] = useState<Record<string, CompareState>>({});
  const [asked, setAsked] = useState(false);
  const [nonce, setNonce] = useState(0);

  // The repo's worktrees and the app's own folders: read when the project
  // opens and on Refresh.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const repo = await window.cth.gitIsRepo(project).catch(() => false);
      if (!alive) return;
      setIsRepo(repo);
      const [wt, rows] = await Promise.all([
        repo ? window.cth.gitWorktrees(project).catch(() => ({ error: 'git' })) : Promise.resolve([]),
        window.cth.listOwnedWorktrees().catch(() => [])
      ]);
      if (!alive) return;
      const list = Array.isArray(wt) ? wt.map((w) => ({ path: w.path, branch: w.branch })) : [];
      setTrees(list);
      setOwned(rows.map((r) => ({ path: r.path, name: r.name, live: r.live })));
      if (repo) {
        const st = await window.cth.gitStatus(project).catch(() => ({ error: 'git' }));
        if (alive) setRootChanged('error' in st ? null : st.staged.length + st.unstaged.length + st.untracked.length);
      }
    })();
    return () => { alive = false; };
  }, [project, nonce]);

  const cards = useMemo(() => projectAgentCards({
    root: project,
    worktrees: trees,
    owned,
    agents: agents.map((a) => ({ id: a.id, name: a.name, cwd: a.cwd, worktreePath: a.worktreePath, working: WORKING_STATES.has(a.status) })),
    windows: WINDOWS
  }), [project, trees, owned, agents]);

  // What each worktree holds: asked one card at a time, so none holds up the list.
  const cardPaths = cards.filter((c) => c.ownWorktree).map((c) => c.path).join('\n');
  useEffect(() => {
    let alive = true;
    for (const p of cardPaths ? cardPaths.split('\n') : []) {
      void window.cth.worktreeWork(p).then((w) => { if (alive) setWork((m) => ({ ...m, [p]: w })); }, () => undefined);
    }
    return () => { alive = false; };
  }, [cardPaths, nonce]);

  const rootBranch = trees.find((w) => normPath(w.path, WINDOWS) === normPath(project, WINDOWS))?.branch ?? null;

  const runCompare = useCallback(async (card: ProjectAgentCard) => {
    const base = work[card.path]?.base ?? rootBranch;
    if (compare[card.key]?.status === 'ready') { setCompare((m) => { const n = { ...m }; delete n[card.key]; return n; }); return; }
    if (!base) { setCompare((m) => ({ ...m, [card.key]: { status: 'error', base: '', rev: '', files: [], error: t('projectIde.noBase') } })); return; }
    setCompare((m) => ({ ...m, [card.key]: { status: 'loading', base, rev: base, files: [] } }));
    const [cmp, st] = await Promise.all([
      window.cth.gitCompareRefs(card.path, base, 'HEAD', 'three').catch(() => ({ error: 'git' })),
      window.cth.gitStatus(card.path).catch(() => ({ error: 'git' }))
    ]);
    if ('error' in cmp) { setCompare((m) => ({ ...m, [card.key]: { status: 'error', base, rev: base, files: [], error: cmp.error } })); return; }
    const files = new Map<string, boolean>();
    for (const f of cmp.files) files.set(f.path, true);
    if (!('error' in st)) {
      for (const e of [...st.staged, ...st.unstaged]) files.set(e.path, false);
      for (const p of st.untracked) files.set(p, false);
    }
    // The agent's own changes: from where its branch left the base, not the base's tip.
    const rev = cmp.mergeBase ?? base;
    setCompare((m) => ({ ...m, [card.key]: { status: 'ready', base, rev, files: [...files].map(([rel, committed]) => ({ rel, committed })).sort((a, b) => a.rel.localeCompare(b.rel)) } }));
  }, [work, rootBranch, compare, t]);

  const askForGit = useCallback(() => {
    const s = useStore.getState();
    const god = s.agents.find((a) => a.isGod);
    if (!god) return;
    s.enqueueMessage(god.id, t('projectIde.askGitText', { path: project }), { fromHuman: true });
    setAsked(true);
  }, [project, t]);

  const atRoot = !!root && normPath(root, WINDOWS) === normPath(project, WINDOWS);
  const godThere = agents.some((a) => a.isGod);

  return (
    <aside data-ide-project-agents style={{ width: 300, flexShrink: 0, minHeight: 0, overflowY: 'auto', borderInlineStart: LINE, background: 'var(--cth-cream-50)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px 6px' }}>
        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{t('projectIde.title')}</span>
        <button type="button" onClick={() => setNonce((n) => n + 1)} title={t('projectIde.refresh')} aria-label={t('projectIde.refresh')} style={{ ...btn, border: 'none', background: 'transparent', padding: 0, width: 24, justifyContent: 'center' }}><IdeIcon name="refresh" size={13} /></button>
      </div>

      {/* The project's own folder: the way back from an agent's folder. */}
      <section data-project-card="root" style={{ margin: '0 10px 8px', padding: 10, border: LINE, borderRadius: 8, background: atRoot ? 'var(--cth-surface-active, var(--cth-cream-200))' : 'transparent' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IdeIcon name="folder" size={13} style={{ color: 'var(--cth-ink-500)' }} />
          <span style={{ fontWeight: 600, fontSize: 12.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folderName(project)}</span>
          {rootBranch ? <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{rootBranch}</span> : null}
        </div>
        {isRepo && rootChanged !== null ? <div style={{ fontSize: 11.5, color: 'var(--cth-ink-700)', marginTop: 4 }}>{t('projectIde.uncommitted', { count: rootChanged })}</div> : null}
        {!atRoot ? <button type="button" data-project-back onClick={() => onOpenFiles({ agent: null, cwd: project })} style={{ ...btn, marginTop: 8 }}>{t('projectIde.backToProject')}</button> : null}
      </section>

      {isRepo === false ? (
        <div data-project-nogit style={{ margin: '0 10px 8px', fontSize: 11.5, color: 'var(--cth-ink-700)', lineHeight: 1.45 }}>
          <p style={{ margin: '0 0 6px' }}>{t('projectIde.noGit')}</p>
          {godThere ? (asked
            ? <span>{t('projectIde.askedGit', { name: godName })}</span>
            : <button type="button" data-project-ask-git onClick={askForGit} style={btn}>{t('projectIde.askGit', { name: godName })}</button>) : null}
        </div>
      ) : null}

      {cards.length === 0 && isRepo !== null ? <p style={{ margin: '0 12px', fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('projectIde.noAgents')}</p> : null}

      {cards.map((c) => {
        const w = c.ownWorktree ? work[c.path] : undefined;
        const agent = c.agentId ? agents.find((a) => a.id === c.agentId) ?? null : null;
        const here = !!root && normPath(root, WINDOWS) === normPath(c.path, WINDOWS);
        const cmp = compare[c.key];
        return (
          <section key={c.key} data-project-card={c.agentId ?? c.name} style={{ margin: '0 10px 8px', padding: 10, border: LINE, borderRadius: 8, background: here ? 'var(--cth-surface-active, var(--cth-cream-200))' : 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 12.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              {c.temp ? <span data-chip="temp" style={chip(false)}>{t('projectIde.temp')}</span> : null}
              <span style={{ flex: 1 }} />
              <span data-chip="state" style={chip(c.working)}>{c.working ? t('projectIde.working') : t('projectIde.idle')}</span>
            </div>
            {c.branch ? <div style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', marginTop: 3 }}>{c.branch}</div> : null}
            {isRepo === false ? <div style={{ fontSize: 11.5, color: 'var(--cth-ink-700)', marginTop: 3 }}>{c.folderRel ? t('projectIde.worksIn', { folder: c.folderRel }) : t('projectIde.wholeFolder')}</div> : null}
            {w ? (
              <div style={{ fontSize: 11.5, color: 'var(--cth-ink-700)', marginTop: 4, display: 'grid', gap: 1 }}>
                {w.known ? <>
                  <span>{t('projectIde.uncommitted', { count: w.uncommitted })}</span>
                  <span>{t('projectIde.unmerged', { count: w.unmerged, base: w.base ?? rootBranch ?? '' })}</span>
                </> : <span>{t('projectIde.unknown')}</span>}
              </div>
            ) : null}
            {c.ownWorktree ? (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button type="button" data-project-open onClick={() => onOpenFiles({ agent, cwd: c.path })} disabled={here} style={{ ...btn, opacity: here ? 0.55 : 1, cursor: here ? 'default' : 'pointer' }}>{here ? t('projectIde.showing') : t('projectIde.openFiles')}</button>
                <button type="button" data-project-compare aria-expanded={!!cmp} onClick={() => { void runCompare(c); }} style={btn}>{t('projectIde.compare')}</button>
              </div>
            ) : null}
            {cmp ? (
              <div data-project-compare-list style={{ marginTop: 8, fontSize: 11.5 }}>
                {cmp.status === 'loading' ? <span style={{ color: 'var(--cth-ink-500)' }}>{t('projectIde.comparing')}</span> : null}
                {cmp.status === 'error' ? <span style={{ color: 'var(--cth-coral)' }}>{cmp.error}</span> : null}
                {cmp.status === 'ready' ? <>
                  <div style={{ color: 'var(--cth-ink-500)', marginBottom: 4 }}>{cmp.files.length ? t('projectIde.changedSince', { base: cmp.base }) : t('projectIde.nothingSince', { base: cmp.base })}</div>
                  {cmp.files.map((f) => (
                    <button key={f.rel} type="button" data-compare-file={f.rel}
                      onClick={() => onCompareFile({ cwd: c.path, rev: cmp.rev, rel: f.rel, label: t('projectIde.compareLabel', { name: c.name, base: cmp.base }) })}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '3px 4px', border: 'none', background: 'transparent', font: 'inherit', fontSize: 11.5, textAlign: 'start', cursor: 'pointer', borderRadius: 4, color: 'var(--cth-ink-900)' }}>
                      <span style={{ fontFamily: 'var(--cth-font-mono)', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.rel}</span>
                      {!f.committed ? <span style={{ fontSize: 10.5, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{t('projectIde.notCommitted')}</span> : null}
                    </button>
                  ))}
                </> : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </aside>
  );
}
