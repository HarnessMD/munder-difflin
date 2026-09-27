/**
 * TASKS: the ledger (hive/tasks.json) as a board, a list or cards, with a
 * search and filter chips. Prototype of record: hive/shared/design/app-v2/
 * prototype.html (v2). A READ surface with two writes: a card opens the sheet
 * (TaskSheet, through the store's openTaskDetail like every other caller), and
 * "New task" seeds the dispatch box on the orchestrator's screen, because the
 * god is the ledger's writer and new work enters through him, never as a card
 * the orchestrator never heard about (same rule as TasksKanban).
 *
 * 0.4.9 W-A: the Archived chip swaps the source for the archive ledger
 * (hive/tasks-archive.json), read only, each card saying when and why it
 * left. Live cards past the stale threshold carry a Stale chip, and an open
 * question that has waited past the nag threshold says how long, both from
 * the same rules the hourly sweep runs (shared/taskHygiene.ts).
 *
 * The view choice persists in localStorage (`cth.tasksView`, plan 4.2).
 *
 * THE BOARD MOVES CARDS (founder, 3 Sep 2026), and it still does not write the
 * ledger. A drag stages the move locally, the card redraws in its new column
 * at once, and a bar at the bottom lists every change that is waiting. Send
 * hands the orchestrator ONE message saying what the human moved; he owns
 * hive/tasks.json and makes the change, and the next poll shows it landed.
 * That is the same rule the New task button follows, for the same reason: two
 * writers on one file is how a ledger gets corrupted, and a card the
 * orchestrator never heard about is a card nobody is working on.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { askNagDays, staleDays } from '@shared/taskHygiene';
import { movesMessage, neighbourStatus, stageMove, stagedStatus, type Staged, type StagedMove } from '@shared/boardMoves';
import { openQuestion, waitsOnHuman, type HiveTask } from '../TasksKanban';
import { usePaneNav } from '../professional/paneNav';
import { Bar, Btn, CARD_GRID_COLUMNS, Chip, FilterChip, Portrait, SearchBox, Seg, proToast, useAgentById, useNameFor, fmtWhen } from './ui';
import { ProIcon } from './icons';
import { columnDrop } from './boardDrop';
import { filterTasks, useTaskArchive, useTaskHygiene, useTaskLedger, type TaskFilter } from './taskData';
import { DATE_WINDOWS, type DateWindow } from '@shared/taskTimes';

export type TasksView = 'board' | 'list' | 'cards';
const VIEW_KEY = 'cth.tasksView';
const VIEWS: TasksView[] = ['board', 'list', 'cards'];

function readView(): TasksView {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    return VIEWS.includes(v as TasksView) ? (v as TasksView) : 'board';
  } catch { return 'board'; }
}

// The date control is remembered for the session only: a fresh launch opens
// on All time, so no card is ever hidden by a choice made days ago.
const WINDOW_KEY = 'cth.tasksWindow';
function readWindow(): DateWindow {
  try {
    const v = sessionStorage.getItem(WINDOW_KEY);
    return DATE_WINDOWS.includes(v as DateWindow) ? (v as DateWindow) : 'all';
  } catch { return 'all'; }
}

type Status = HiveTask['status'];
const STATUSES: Status[] = ['todo', 'doing', 'blocked', 'done'];


export const STATUS_TONE: Record<Status, 'outline' | 'ok' | 'bad' | 'muted'> = { todo: 'outline', doing: 'ok', blocked: 'bad', done: 'muted' };
const STATUS_LINE: Record<Status, string> = {
  todo: 'var(--cth-status-thinking)', doing: 'var(--cth-status-working)', blocked: 'var(--cth-status-blocked)', done: 'var(--cth-ink-300)'
};

export function TasksScreen() {
  const { t } = useTranslation();
  const nav = usePaneNav();
  const { tasks } = useTaskLedger();
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const agents = useStore((s) => s.agents);
  const nameFor = useNameFor();
  const [view, setView] = useState<TasksView>(readView);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [query, setQuery] = useState('');
  const [dateWindow, setDateWindowState] = useState<DateWindow>(readWindow);
  const setDateWindow = (w: DateWindow): void => {
    setDateWindowState(w);
    try { sessionStorage.setItem(WINDOW_KEY, w); } catch { /* per session nicety only */ }
  };
  const [staged, setStaged] = useState<Staged>({});
  const [sending, setSending] = useState(false);
  const archivedView = filter === 'archived';
  const { tasks: archive } = useTaskArchive(archivedView);

  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* private mode */ } }, [view]);

  const all = tasks ?? [];
  // The Archived chip swaps the SOURCE; the search still applies over it.
  const source = archivedView ? (archive ?? []) : all;
  const shown = useMemo(() => filterTasks(source, filter, query, waitsOnHuman, dateWindow), [source, filter, query, dateWindow]);
  // Only agents that hold a card get a chip: a row of every agent on the floor
  // is a roster, not a filter.
  const assignees = useMemo(() => {
    const ids = new Set(all.map((x) => x.assignee).filter((x): x is string => !!x));
    return [...ids].map((id) => ({ id, name: nameFor(id) ?? id }));
  }, [all, nameFor]);

  const doing = all.filter((x) => x.status === 'doing').length;
  const blocked = all.filter((x) => x.status === 'blocked').length;
  const loading = archivedView ? archive === null : tasks === null;
  // Archived cards are read only: no sheet, no moves, no answers.
  const onOpen = archivedView ? undefined : openTaskDetail;

  const newTask = () => {
    const st = useStore.getState();
    const god = st.agents.find((a) => a.isGod);
    if (!god) return;
    st.select(god.id);
    st.requestDispatchSeed('Task: \nContext: \n');
    st.requestCommandCenterTab('floor');
    nav.go(`agent:${god.id}`);
  };

  /* ---- moving cards ------------------------------------------------------
   * A move is staged, never written. The archive is read only and a card
   * already sitting in the column it was dropped on is not a move. */
  const god = agents.find((a) => a.isGod);
  const moves = useMemo(() => Object.values(staged), [staged]);
  const move = (task: HiveTask, to: Status) => {
    if (archivedView || task.status === to) return;
    setStaged((s) => stageMove(s, task, to));
  };
  const nudge = (task: HiveTask, dir: -1 | 1) => {
    const next = neighbourStatus(stagedStatus(task, staged), dir);
    if (next) move(task, next);
  };
  const send = async () => {
    if (!god || moves.length === 0) return;
    setSending(true);
    useStore.getState().enqueueMessage(god.id, movesMessage(moves), { fromHuman: true });
    void window.cth.trackMessageSent?.('composer');
    setStaged({});
    setSending(false);
    proToast(t('pro.tasks.staged.sent', { god: god.name }), { tone: 'ok' });
  };

  const sub = archivedView
    ? (archive ? t('pro.tasks.archivedSub', { count: archive.length }) : undefined)
    : (tasks ? t('pro.tasks.sub', { doing, blocked }) : undefined);

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <Bar title={t('pro.nav.tasks')} sub={sub}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', minWidth: 0, scrollbarWidth: 'none' }}>
          <FilterChip on={filter === 'all'} onClick={() => setFilter('all')}>{t('pro.tasks.filter.all')}</FilterChip>
          <FilterChip on={filter === 'asks'} onClick={() => setFilter('asks')}>{t('pro.tasks.filter.asks')}</FilterChip>
          <FilterChip on={filter === 'unassigned'} onClick={() => setFilter('unassigned')}>{t('pro.tasks.filter.unassigned')}</FilterChip>
          {assignees.map((a) => (
            <FilterChip key={a.id} on={filter === `agent:${a.id}`} onClick={() => setFilter(`agent:${a.id}`)}>{a.name}</FilterChip>
          ))}
          <FilterChip on={archivedView} onClick={() => setFilter('archived')}>{t('pro.tasks.filter.archived')}</FilterChip>
        </div>
        {/* A different axis from the who/what chips: when, behind a thin divider. */}
        <i aria-hidden style={{ width: 1, alignSelf: 'stretch', margin: '4px 2px', background: 'var(--cth-ink-300)' }} />
        <div data-date-window style={{ flexShrink: 0 }}>
          <Seg
            value={dateWindow}
            onChange={setDateWindow}
            ariaLabel={t('pro.tasks.window.label')}
            options={DATE_WINDOWS.map((w) => ({ value: w, label: t(`pro.tasks.window.${w}`) }))}
          />
        </div>
        <SearchBox value={query} onChange={setQuery} placeholder={t('pro.tasks.search')} />
        <Seg
          value={view}
          onChange={setView}
          ariaLabel={t('pro.tasks.view.label')}
          options={VIEWS.map((v) => ({ value: v, label: t(`pro.tasks.view.${v}`) }))}
        />
        {agents.some((a) => a.isGod) && (
          <Btn kind="primary" onClick={newTask}><ProIcon name="plus" size={14} />{t('pro.tasks.new')}</Btn>
        )}
      </Bar>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 18 }}>
        {loading ? (
          <Empty>{t('pro.tasks.loading')}</Empty>
        ) : source.length === 0 ? (
          <Empty>{archivedView ? t('pro.tasks.archiveEmpty') : t('pro.tasks.empty')}</Empty>
        ) : view === 'board' ? (
          <Board tasks={shown} windowed={dateWindow !== 'all'} onOpen={onOpen} staged={staged} onMove={archivedView ? undefined : move} onNudge={archivedView ? undefined : nudge} />
        ) : view === 'list' ? (
          <List tasks={shown} onOpen={onOpen} archived={archivedView} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: CARD_GRID_COLUMNS, gap: 12 }}>
            {shown.map((x) => <TaskCard key={x.id} task={x} showStatus onOpen={onOpen ? () => onOpen(x.id) : undefined} />)}
            {shown.length === 0 && <Empty>{t('pro.tasks.nothingMatches')}</Empty>}
          </div>
        )}
      </div>

      {moves.length > 0 && (
        <SaveBar
          moves={moves} god={god?.name} sending={sending}
          onUndo={(id) => setStaged((s) => { const n = { ...s }; delete n[id]; return n; })}
          onDiscard={() => setStaged({})}
          onSend={() => { void send(); }}
        />
      )}
    </div>
  );
}

function Board({ tasks, windowed, onOpen, staged, onMove, onNudge }: {
  tasks: HiveTask[]; onOpen?: (id: string) => void; staged: Staged;
  /** A date window is on: an empty column says so instead of "Nothing here". */
  windowed?: boolean;
  /** Absent on the archive, which is read only. */
  onMove?: (task: HiveTask, to: Status) => void;
  onNudge?: (task: HiveTask, dir: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const [over, setOver] = useState<Status | null>(null);
  const byId = useMemo(() => new Map(tasks.map((x) => [x.id, x])), [tasks]);
  // Founder on rc.4: a card dropped ANYWHERE in a column lands there, and the
  // whole column lights up while a drag is over it. The columns stretch to the
  // board's full height (alignItems 'stretch', the grid at least the height of
  // the screen), so the drop zone reaches the bottom even under a short or
  // empty column; the handlers are boardDrop's, on the whole column.
  return (
    <div data-task-board style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(200px, 1fr))', gap: 12, minHeight: '100%', alignItems: 'stretch' }}>
      {STATUSES.map((s) => {
        const col = tasks.filter((x) => stagedStatus(x, staged) === s);
        const hot = over === s;
        const dnd = onMove ? columnDrop<Status, HiveTask>(s, { find: (id) => byId.get(id), move: onMove, setOver }) : null;
        return (
          <div
            key={s}
            data-task-column={s}
            data-drop-hot={hot ? '1' : undefined}
            onDragOver={dnd?.onDragOver}
            onDragLeave={dnd?.onDragLeave}
            onDrop={dnd?.onDrop}
            style={{
              display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, minHeight: 120, padding: 4, borderRadius: 10,
              // The only thing a drop target changes is its ground and a 1px
              // ring; a column does not grow a thicker edge on one side.
              border: `1px solid ${hot ? 'var(--cth-accent)' : 'transparent'}`,
              background: hot ? 'var(--cth-accent-soft)' : 'transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', fontSize: 12, fontWeight: 600, color: 'var(--cth-ink-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_LINE[s] }} />
              {t(`pro.tasks.status.${s}`)}
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--cth-font-mono)', fontWeight: 500, color: 'var(--cth-ink-500)' }}>{col.length}</span>
            </div>
            {col.map((x) => (
              <TaskCard
                key={x.id} task={x} onOpen={onOpen ? () => onOpen(x.id) : undefined}
                moved={!!staged[x.id]}
                onDragStart={onMove ? (e) => { e.dataTransfer.setData('text/plain', x.id); e.dataTransfer.effectAllowed = 'move'; } : undefined}
                onNudge={onNudge ? (dir) => onNudge(x, dir) : undefined}
              />
            ))}
            {col.length === 0 && <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--cth-ink-300)' }}>{t(windowed ? 'pro.tasks.nothingInWindow' : 'pro.tasks.nothingHere')}</div>}
          </div>
        );
      })}
    </div>
  );
}

/**
 * WHAT HAS MOVED AND NOT BEEN SENT. It appears the moment a card lands in a
 * new column and lists every change, each one undoable on its own, because a
 * bar that only says "3 changes" makes a person guess which three.
 */
function SaveBar({ moves, god, sending, onUndo, onDiscard, onSend }: {
  moves: StagedMove[]; god?: string; sending: boolean; onUndo: (id: string) => void; onDiscard: () => void; onSend: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div role="region" aria-label={t('pro.tasks.staged.region')} style={{
      flexShrink: 0, borderTop: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)',
      padding: '10px 18px 12px', display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <b style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cth-ink-900)' }}>
          {moves.length === 1 ? t('pro.tasks.staged.one') : t('pro.tasks.staged.many', { count: moves.length })}
        </b>
        <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>
          {god ? t('pro.tasks.staged.hint', { god }) : t('pro.tasks.staged.noGod')}
        </span>
        <span style={{ flex: 1 }} />
        <Btn kind="ghost" size="sm" onClick={onDiscard}>{t('pro.tasks.staged.discard')}</Btn>
        <Btn kind="primary" size="sm" disabled={!god || sending} onClick={onSend}>
          <ProIcon name="send" size={13} />{god ? t('pro.tasks.staged.send', { god }) : t('pro.tasks.staged.sendNoGod')}
        </Btn>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 96, overflowY: 'auto' }}>
        {moves.map((m) => (
          <span key={m.id} title={m.title} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 340, padding: '3px 6px 3px 8px', borderRadius: 8,
            border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', fontSize: 11.5, color: 'var(--cth-ink-900)'
          }}>
            <b title={m.id} style={{ fontFamily: 'var(--cth-font-mono)', fontWeight: 500, color: 'var(--cth-ink-500)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.id}</b>
            <span style={{ color: 'var(--cth-ink-500)', flexShrink: 0 }}>{t(`pro.tasks.status.${m.from}`)}</span>
            <ProIcon name="arrowRight" size={12} />
            <span style={{ fontWeight: 600, flexShrink: 0 }}>{t(`pro.tasks.status.${m.to}`)}</span>
            <button type="button" onClick={() => onUndo(m.id)} aria-label={t('pro.tasks.unstage')} title={t('pro.tasks.unstage')} style={{
              width: 16, height: 16, padding: 0, flexShrink: 0, display: 'inline-grid', placeItems: 'center', borderRadius: 999,
              border: '1px solid var(--cth-ink-300)', background: 'transparent', color: 'var(--cth-ink-500)', cursor: 'pointer'
            }}>
              <ProIcon name="close" size={10} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function List({ tasks, onOpen, archived }: { tasks: HiveTask[]; onOpen?: (id: string) => void; archived: boolean }) {
  const { t, i18n } = useTranslation();
  const nameFor = useNameFor();
  const agentById = useAgentById();
  const hygiene = useTaskHygiene();
  const now = Date.now();
  const th = { textAlign: 'left' as const, fontSize: 11, fontWeight: 600, color: 'var(--cth-ink-500)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', padding: '8px 10px', borderBottom: '1px solid var(--cth-ink-300)', whiteSpace: 'nowrap' as const };
  const td = { padding: '9px 10px', borderBottom: '1px solid var(--cth-ink-100)', fontSize: 13, color: 'var(--cth-ink-900)', verticalAlign: 'middle' as const };
  const columns = archived ? 7 : 6;
  return (
    <div style={{ overflowX: 'auto', background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={th}>{t('pro.tasks.col.id')}</th>
            <th style={{ ...th, width: '45%' }}>{t('pro.tasks.col.title')}</th>
            <th style={th}>{t('pro.tasks.col.status')}</th>
            <th style={th}>{t('pro.tasks.col.assignee')}</th>
            <th style={th}>{t('pro.tasks.col.priority')}</th>
            <th style={th}>{t('pro.tasks.col.created')}</th>
            {archived && <th style={th}>{t('pro.tasks.col.archived')}</th>}
          </tr>
        </thead>
        <tbody>
          {tasks.map((x) => {
            const a = agentById(x.assignee);
            const stale = archived ? null : staleDays(x, hygiene, now);
            const nag = archived ? null : askNagDays(x, hygiene, now);
            return (
              <tr key={x.id} onClick={onOpen ? () => onOpen(x.id) : undefined} style={{ cursor: onOpen ? 'pointer' : 'default' }}
                onMouseEnter={(e) => { if (onOpen) e.currentTarget.style.background = 'var(--cth-cream-200)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <td title={x.id} style={{ ...td, fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.id}</td>
                <td style={td}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
                    <span style={{ overflowWrap: 'anywhere', minWidth: 0 }}>{x.title}</span>
                    {nag !== null
                      ? <Chip tone="warn">{t('pro.tasks.askOpenDays', { count: nag })}</Chip>
                      : waitsOnHuman(x) && <Chip tone="warn">{t('pro.tasks.asksYou')}</Chip>}
                    {stale !== null && <Chip tone="info" title={t('pro.tasks.staleTitle', { count: stale })}>{t('pro.tasks.stale')}</Chip>}
                  </span>
                </td>
                <td style={td}><Chip tone={STATUS_TONE[x.status]}>{t(`pro.tasks.status.${x.status}`)}</Chip></td>
                <td title={x.assignee ? nameFor(x.assignee) : undefined} style={{ ...td, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {x.assignee
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>{a && <Portrait agent={a} size={22} />}<span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{nameFor(x.assignee)}</span></span>
                    : <Chip>{t('pro.tasks.unassigned')}</Chip>}
                </td>
                <td style={td}><Priority level={x.priority} /></td>
                <td style={{ ...td, fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{fmtWhen(x.createdAt, i18n.language)}</td>
                {archived && (
                  <td style={{ ...td, fontSize: 12, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {x.archivedAt && x.archiveReason
                      ? <ArchivedLine task={x} />
                      : null}
                  </td>
                )}
              </tr>
            );
          })}
          {tasks.length === 0 && (
            <tr><td colSpan={columns} style={{ ...td, textAlign: 'center', color: 'var(--cth-ink-300)' }}>{t('pro.tasks.nothingMatches')}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/** When and why a card left the live ledger, from the archive's own fields. */
function ArchivedLine({ task }: { task: HiveTask }) {
  const { t, i18n } = useTranslation();
  if (!task.archivedAt || !task.archiveReason) return null;
  return (
    <span>
      {t('pro.tasks.archivedOn', { when: fmtWhen(task.archivedAt, i18n.language) })}
      {' · '}
      {t(`pro.tasks.archiveReason.${task.archiveReason}`)}
    </span>
  );
}

/**
 * A card. Clickable (a button that opens the sheet) when `onOpen` is given;
 * a plain read only card, with its archive line, when it is not.
 *
 * ON THE BOARD it is also draggable, and `onNudge` is the same move from the
 * keyboard: focus a card, press left or right. A board a person can only
 * operate with a mouse is a board half this app's users cannot operate.
 */
export function TaskCard({ task, showStatus, onOpen, moved, onDragStart, onNudge }: {
  task: HiveTask; showStatus?: boolean; onOpen?: () => void;
  /** Staged: moved on screen, not sent to the orchestrator yet. */
  moved?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onNudge?: (dir: -1 | 1) => void;
}) {
  const { t } = useTranslation();
  const agentById = useAgentById();
  const hygiene = useTaskHygiene();
  const a = agentById(task.assignee);
  const ask = openQuestion(task);
  const archived = !!task.archivedAt;
  const now = Date.now();
  const stale = archived ? null : staleDays(task, hygiene, now);
  const nag = archived ? null : askNagDays(task, hygiene, now);
  const shell = {
    display: 'flex', flexDirection: 'column' as const, gap: 8, padding: 12, textAlign: 'left' as const, cursor: onOpen ? 'pointer' : 'default', font: 'inherit', width: '100%', boxSizing: 'border-box' as const,
    // One even 1px border (founder, 2 Sep 2026: no card ever carries a thicker
    // edge on one side). Status is the column on the board and a chip elsewhere.
    // A staged card takes the accent on all four edges, never a stripe.
    background: 'var(--cth-cream-100)', border: `1px solid ${moved ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`, borderRadius: 10, color: 'var(--cth-ink-900)'
  };
  const body = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)' }}>
        <span title={task.id} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.id}</span>
        <span style={{ flex: 1 }} />
        {moved && <Chip tone="accent">{t('pro.tasks.moved')}</Chip>}
        {showStatus && <Chip tone={STATUS_TONE[task.status]}>{t(`pro.tasks.status.${task.status}`)}</Chip>}
      </div>
      <div style={{ fontSize: 13, lineHeight: '18px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere', width: '100%' }}>{task.title}</div>
      {archived && (
        <div style={{ fontSize: 11, lineHeight: '14px', color: 'var(--cth-ink-500)', width: '100%' }}><ArchivedLine task={task} /></div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', flexWrap: 'wrap' }}>
        <Priority level={task.priority} />
        {task.dependsOn.length > 0 && <Chip>{t('pro.tasks.after', { count: task.dependsOn.length })}</Chip>}
        {nag !== null
          ? <Chip tone="warn">{t('pro.tasks.askOpenDays', { count: nag })}</Chip>
          : ask && <Chip tone="warn">{t('pro.tasks.asksYou')}</Chip>}
        {stale !== null && <Chip tone="info" title={t('pro.tasks.staleTitle', { count: stale })}>{t('pro.tasks.stale')}</Chip>}
        <span style={{ flex: 1 }} />
        {a
          ? <Portrait agent={a} size={22} />
          : task.assignee
            ? <Chip title={task.assignee} style={{ maxWidth: '100%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', lineHeight: '18px' }}>{task.assignee}</Chip>
            : <Chip>{t('pro.tasks.unassigned')}</Chip>}
      </div>
    </>
  );
  if (!onOpen) return <div style={shell}>{body}</div>;
  return (
    <button
      type="button" onClick={onOpen} style={shell}
      draggable={!!onDragStart} onDragStart={onDragStart}
      title={onNudge ? t('pro.tasks.dragHint') : undefined}
      onKeyDown={onNudge ? (e) => {
        const dir = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : null;
        if (dir === null) return;
        e.preventDefault();
        onNudge(dir);
      } : undefined}
    >
      {body}
    </button>
  );
}

/** 1 = lowest, 5 = highest, warmer as it climbs; the ledger's own scale. */
export function Priority({ level }: { level: number }) {
  const { t } = useTranslation();
  const lv = Math.max(1, Math.min(5, Math.round(level)));
  const color = lv >= 4 ? 'var(--cth-status-blocked)' : lv === 3 ? 'var(--cth-status-waiting)' : 'var(--cth-status-working)';
  return (
    <span title={t('pro.tasks.priority', { level: lv })} aria-label={t('pro.tasks.priority', { level: lv })} style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end', height: 10 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} style={{ width: 3, height: 4 + i, borderRadius: 1, background: i <= lv ? color : 'var(--cth-cream-300)' }} />
      ))}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--cth-ink-500)', gridColumn: '1 / -1' }}>{children}</div>;
}
