/**
 * SOURCE CONTROL, the IDE sidebar's third tab (0.4.11 redesign, founder
 * approved 5 Sep 2026).
 *
 * The git rail used to sit ABOVE the file tree and take the top of the
 * column from it. It is now a tab of its own, with the same three views in
 * a segmented control: Changes (the working tree against HEAD), History (the
 * commit graph, at the repo's main root so every worktree branch appears) and
 * Compare (two refs). History and Compare are the panes they always were;
 * only the Changes list is drawn here, from the status the panel already
 * polls. Nothing in this file talks to git.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Seg } from '@/components/pro/ui';
import { HistoryPane, ComparePane } from './GitPanes';
import { FileIcon, gitCodeColor } from './ideIcons';
import { IDE_ROW_CLASS, PaneHeader, SideIconButton, ensureIdeSidebarStyle } from './SidebarChrome';

type GitView = 'changes' | 'history' | 'compare';

export interface SourceControlPaneProps {
  root: string;
  /** The repository's MAIN root, or null until it is known (or when there is no repo). */
  gitRoot: string | null;
  /** null while unknown, false when the workspace is not a repository. */
  isRepo: boolean | null;
  changed: { path: string; code: string }[];
  /** The changed file whose diff is open, if any. */
  activeRel?: string;
  onOpenDiff: (rel: string) => void;
  onRefresh: () => void;
  onOpenRevDiff: (revA: string, revB: string, rel: string, revLabel: string) => void;
}

const splitPath = (p: string): { name: string; folder: string } => {
  const i = p.lastIndexOf('/');
  return i === -1 ? { name: p, folder: '' } : { name: p.slice(i + 1), folder: p.slice(0, i) };
};

export function SourceControlPane({ root, gitRoot, isRepo, changed, activeRel, onOpenDiff, onRefresh, onOpenRevDiff }: SourceControlPaneProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<GitView>('changes');
  ensureIdeSidebarStyle();
  const repo = gitRoot ?? root;

  return (
    <div data-source-control style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div style={{ padding: '8px 8px 4px', flexShrink: 0 }}>
        <Seg<GitView>
          value={view}
          ariaLabel={t('ide.side.gitTitle')}
          onChange={setView}
          options={[
            { value: 'changes', label: t('ide.git.changes') },
            { value: 'history', label: t('ide.git.history') },
            { value: 'compare', label: t('ide.git.compare') }
          ]}
        />
      </div>

      {view === 'changes' && (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
          <PaneHeader
            title={`${t('ide.git.changes')} · ${changed.length}`}
            actions={<SideIconButton name="refresh" title={t('idePanel.refresh')} onClick={onRefresh} />}
          />
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 12 }}>
            {isRepo === false && (
              <div style={noteStyle}>
                <div>{t('gitTab.notARepo')}</div>
                <div style={{ marginTop: 2 }}>{t('gitTab.notARepoHint')}</div>
              </div>
            )}
            {isRepo && changed.length === 0 && <div style={noteStyle}>{t('gitTab.clean')}</div>}
            {changed.map((f) => {
              const { name, folder } = splitPath(f.path);
              const active = activeRel === f.path;
              return (
                <button
                  key={f.path}
                  type="button"
                  className={IDE_ROW_CLASS}
                  data-changed={f.path}
                  onClick={() => onOpenDiff(f.path)}
                  title={f.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, width: '100%', height: 24, padding: '0 8px 0 12px',
                    border: 'none', cursor: 'pointer', textAlign: 'start', font: 'inherit', fontFamily: 'var(--cth-font-ui)', fontSize: 12,
                    background: active ? 'var(--cth-accent-soft, var(--cth-lemon-light))' : 'transparent',
                    color: active ? 'var(--cth-ink-900)' : 'var(--cth-ink-700)', whiteSpace: 'nowrap'
                  }}
                >
                  <span style={{
                    width: 14, textAlign: 'center', flexShrink: 0, fontFamily: 'var(--cth-font-mono)', fontSize: 10, fontWeight: 600,
                    color: gitCodeColor(f.code)
                  }}>{f.code === ' ' ? '·' : f.code}</span>
                  <FileIcon rel={f.path} size={14} />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  {folder && (
                    <span style={{ minWidth: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11, color: 'var(--cth-ink-500)', marginLeft: 'auto' }}>{folder}</span>
                  )}
                </button>
              );
            })}
            {isRepo && changed.length > 0 && <div style={{ ...noteStyle, paddingTop: 10 }}>{t('ide.git.changesHint')}</div>}
          </div>
        </div>
      )}

      {view === 'history' && (
        isRepo === false
          ? <div style={noteStyle}>{t('gitTab.notARepo')}</div>
          : <HistoryPane key={repo} gitRoot={repo} onOpenRevDiff={onOpenRevDiff} />
      )}
      {view === 'compare' && (
        isRepo === false
          ? <div style={noteStyle}>{t('gitTab.notARepo')}</div>
          : <ComparePane key={repo} gitRoot={repo} onOpenRevDiff={onOpenRevDiff} />
      )}
    </div>
  );
}

const noteStyle: React.CSSProperties = {
  padding: '4px 12px 6px', fontFamily: 'var(--cth-font-ui)', fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-500)'
};
