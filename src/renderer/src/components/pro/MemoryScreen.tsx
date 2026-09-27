/**
 * PRO Memory (phase 4 of 0.4.9, decision D5): the workspace's memory as a
 * rotating graph (agents, the topics their notes hold, the message links
 * between them) beside a panel that answers "whose memory", "what kind" and
 * "what do they know about X". Prototype of record: viewMemory() in
 * hive/shared/design/app-v2/prototype.html.
 *
 * WHAT CHANGED FROM PHASE 3. Topics are real notes now (memoryTopics.ts):
 * the four Kinds are the regions of memory.md plus the deliverable folders,
 * not the region headings pretending to be topics. The engine controls and
 * the index folder live in Settings → Memory; this screen only asks whether
 * search by meaning is available. The stage draws from the kit tokens at
 * draw time and restarts its loop when the theme flips, so light and dark
 * both look designed.
 *
 * TWO SEARCHES, HONESTLY LABELLED. `hive:textSearch` is a substring scan of
 * every memory.md and returns which agent each hit came from ("Exact
 * matches"), so it drives the highlight on the graph. `hive:searchMemory`
 * asks the index by meaning ("By meaning") and returns the CLI's text.
 *
 * Agent nodes are their SPRITES (founder, 2 Sep): each character is painted
 * once into an offscreen canvas by the same painter SpritePortrait uses and
 * blitted per frame. Layout and projection: memoryLayout.ts, unchanged.
 *
 * PHASE 5 (founder, 3 Sep): a search used to answer with bare excerpts, and
 * "I could not tell what any hit had to do with the work". So typing a query
 * opens a third view, Results, and each hit is drawn with what it is actually
 * connected to: the tickets that name it or carry its words, the agents on
 * those tickets, and the messages with the orchestrator or the person at one
 * end. A hit connected to nothing says that in words. The joining is
 * shared/memorySearch.ts, pure and unit tested; this file only draws it.
 * Results are selectable and go to any agent on the roster with the person's
 * own prompt in front of them, through the same door the composer uses, so
 * the send lands in that agent's thread with a delivery status instead of
 * disappearing.
 *
 * 0.4.10 (founder, 4 Sep 2026): "the search result should be list and card
 * view, for three different types: tickets, agents, memories. The graph should
 * also have the three nodes and items interconnected. When clicked on a
 * particular item in the graph it should open that in the right sidebar, the
 * content of card needs to be structured and responsive and readable, make the
 * right sidebar drag to resize horizontally."
 *
 * FOUR CHANGES, and the shape of each.
 *
 *   THE THREE TYPES ARE ONE AXIS. shared/memoryGraphModel.ts turns the phase 5
 *   joins inside out and hands back typed records: a ticket the search reached,
 *   an agent it reached, a note it matched. That module is React free and copy
 *   free, so the rules are unit tested and this file is the drawing of them.
 *   The Kind chips (pinned, summaries, recent, deliverables) are a DIFFERENT
 *   axis over the notes themselves and are untouched.
 *
 *   ONE CARD, THREE PLACES. ResultCard draws a MemoryResult. The card grid,
 *   the result list and the right rail all render it, so a node clicked on the
 *   stage and the same thing found by searching can never disagree about what
 *   it is or what it is connected to.
 *
 *   THE STAGE CARRIES ALL THREE. buildGraph's union gained a `task` kind and
 *   two edge kinds: an agent to the tickets it works, a ticket to the memories
 *   whose notes name its id. Tickets and memories get DRAWN GLYPHS rasterised
 *   the way the agent sprites are, never a letter and never a bare dot, and
 *   the glyph sheet is repainted from the kit tokens when the theme flips.
 *
 *   THE RAIL IS DRAGGABLE. pro/Splitter.tsx, ported from the Classic floor's
 *   handle, with arrow keys added and the width kept in localStorage. The
 *   stage measures its wrapper every frame, so there is nothing to invalidate.
 *
 * 0.4.11 (pilot feedback, items 9 to 11): the stage STOPS MOVING. The idle
 * spin is gone and a drag no longer rotates: the layout settles once, a drag
 * on a node moves that node and pins it where it is dropped (moveTo in
 * memoryLayout.ts), a drag on the background pans, and the wheel, a pinch and
 * two buttons zoom about the cursor or the centre (anchorPan). Selecting an
 * agent NODE also selects that agent's WHOSE MEMORY chip, so the topic list
 * follows the click; a background click clears the selection. And every card
 * in the rail ellipsizes or wraps its long tokens, with the full text in a
 * title, so nothing escapes a card's border.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import type { OfficeCharacterName } from '@/scene/office/castRoster';
import { PORTRAIT_W, PORTRAIT_H } from '@/scene/office/castRoster';
import type { HarnessConfig } from '@/store/config';
import { useAppTheme } from '@/design/theme';
import { MarkdownPreview } from '@/markdown/MarkdownPreview';
import { useResolvedGodName } from '@/hooks/useResolvedGodName';
import {
  agentDossier, agentNamed, hitKey, joinHit, selectionMessage,
  type AgentDossier, type HitJoin, type MemoryHit, type MessageLink, type SearchMessage, type SearchTask, type TaskLink
} from '@shared/memorySearch';
import { clampLines } from '@shared/lineClamp';
import {
  MEMORY_RESULT_TYPES, RAIL_DEFAULT, agentResult, classifyResults, clampRail, countResults,
  filterByType, firstFilledType, nodeTypeOf, taskIdOf, taskLayer, ticketResult, topicResult,
  type MemoryResult, type MemoryResultType, type ResultLink
} from '@shared/memoryGraphModel';
import { usePaneNav } from '../professional/paneNav';
import { buildGraph, type GraphData, type GraphEdge, type GraphNode, type MessageLogEntry } from '../memoryGraph/buildGraph';
import { Bar, Btn, CARD_GRID_COLUMNS, Chip, CloseX, CodeBox, FilterChip, SearchBox, SectionH, Seg, Sheet, fmtWhen, proToast, textareaStyle, useAgentById, useNameFor, type ChipTone } from './ui';
import { SpritePortrait } from '../SpritePortrait';
import { ProIcon, type ProIconName } from './icons';
import { Splitter } from './Splitter';
import { useTechnical } from './depth';
import { useFloor } from './InboxScreen';
import { useTaskLedger } from './taskData';
import { AGENT_REACH, TASK_REACH, anchorPan, baseRadius, clampZoom, keepFor, layout3d, moveTo, pick, project, zoomFor, type Layout3, type P3, type Projected } from './memoryLayout';
import {
  DELIVERABLE_DIRS, GRAPH_TOPIC_CAP, MEMORY_KINDS, WING_OF, buildTopics, deliverablePathOf, filterTopics, foldDeliverables, memoryPathOf,
  type DeliverableFile, type MemoryKind, type MemoryTopic
} from './memoryTopics';

type Hit = MemoryHit;
type KindPick = MemoryKind | 'all';
type ViewPick = 'graph' | 'list' | 'results';
/** How the result set is laid out. The types themselves are the other axis
 *  (MemoryResultType), and both persist so a person who prefers cards gets
 *  cards on the next search rather than on the next click. */
type LayoutPick = 'list' | 'cards';

const PAGE = 40;
/** How much of a join one card draws before it defers to a count. A hit that
 *  matched forty cards has told you it is a common word, not forty things. */
const JOIN_CAP = 5;
/** Chips on a card before it defers to a count, for the same reason. */
const LINK_CAP = 6;
const KIND_TONE: Record<MemoryKind, ChipTone> = { pinned: 'accent', summaries: 'info', recent: 'ok', deliverables: 'think' };
const TYPE_TONE: Record<MemoryResultType, ChipTone> = { ticket: 'info', agent: 'accent', memory: 'think' };
const TYPE_ICON: Record<MemoryResultType, ProIconName> = { ticket: 'tasks', agent: 'agents', memory: 'memory' };
const TEXT_FILE = /\.(md|markdown|txt|json|csv|yml|yaml|toml|log)$/i;
const LAYOUT_KEY = 'cth.memoryLayout';
const TYPE_KEY = 'cth.memoryType';
const RAIL_KEY = 'cth.memoryRail';

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return allowed.includes(v as T) ? (v as T) : fallback;
  } catch { return fallback; }
}

function readRail(): number {
  try { return clampRail(Number(window.localStorage.getItem(RAIL_KEY) ?? RAIL_DEFAULT)); } catch { return RAIL_DEFAULT; }
}

function store(key: string, value: string) {
  try { window.localStorage.setItem(key, value); } catch { /* private mode */ }
}

/* ───────────────────────────── data hooks ─────────────────────────────── */

function useLog(): MessageLogEntry[] {
  const [log, setLog] = useState<MessageLogEntry[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => window.cth.hiveLog(200).then((l) => { if (alive) setLog(l as MessageLogEntry[]); }).catch(() => undefined);
    load();
    const id = setInterval(load, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return log;
}

/** Every agent's memory.md, re-read a minute apart (topics come from it). */
function useMemories(agents: Agent[]): Record<string, string> {
  const ids = agents.map((a) => a.id).sort().join(',');
  const [mem, setMem] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const load = () => Promise.all(ids.split(',').filter(Boolean).map((id) => window.cth.hiveMemory(id).then((t) => [id, t ?? ''] as const, () => [id, ''] as const)))
      .then((pairs) => { if (alive) setMem(Object.fromEntries(pairs)); });
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [ids]);
  return mem;
}

/** The files under the hive's shared and research folders, two levels deep. */
function useDeliverables(hiveRoot: string | null): DeliverableFile[] {
  const [files, setFiles] = useState<DeliverableFile[]>([]);
  useEffect(() => {
    if (!hiveRoot) return;
    let alive = true;
    const load = async () => {
      const listed: { dir: string; entries: { name: string; isDir: boolean; size: number; mtime: number }[] }[] = [];
      for (const dir of DELIVERABLE_DIRS) {
        const top = await window.cth.listDir(hiveRoot, dir).catch(() => null);
        if (!top || !top.ok) continue;
        listed.push({ dir, entries: top.entries });
        for (const e of top.entries.filter((x) => x.isDir && !x.name.startsWith('.'))) {
          const sub = await window.cth.listDir(hiveRoot, `${dir}/${e.name}`).catch(() => null);
          if (sub && sub.ok) listed.push({ dir: `${dir}/${e.name}`, entries: sub.entries });
        }
      }
      if (alive) setFiles(foldDeliverables(listed));
    };
    void load();
    const t = setInterval(() => { void load(); }, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [hiveRoot]);
  return files;
}

/** Only whether search by meaning can answer; the engine itself is Settings' business. */
function useMeaningSearch(config: HarnessConfig | null): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let alive = true;
    window.cth.memoryStatus().then((s) => { if (alive) setActive(!!s.active); }).catch(() => undefined);
    return () => { alive = false; };
  }, [config?.semanticMemory, config?.embeddingModel]);
  return active;
}

/** One offscreen portrait per character, painted by the sprite painter. */
function usePortraits(agents: Agent[], onReady: () => void): React.MutableRefObject<Map<OfficeCharacterName, HTMLCanvasElement>> {
  const ref = useRef(new Map<OfficeCharacterName, HTMLCanvasElement>());
  const chars = [...new Set(agents.map((a) => a.character))].sort().join(',');
  useEffect(() => {
    let cancelled = false;
    const missing = chars.split(',').filter((c): c is OfficeCharacterName => !!c && !ref.current.has(c as OfficeCharacterName));
    if (missing.length === 0) return;
    void import('@/scene/office/portraitArt').then(({ paintPortrait }) => {
      if (cancelled) return;
      for (const c of missing) {
        const cv = document.createElement('canvas');
        const scale = 3;
        cv.width = PORTRAIT_W * scale; cv.height = PORTRAIT_H * scale;
        const ctx = cv.getContext('2d');
        if (!ctx) continue;
        ctx.imageSmoothingEnabled = false;
        paintPortrait(ctx, c, scale);
        ref.current.set(c, cv);
      }
      onReady();
    }).catch(() => undefined);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chars]);
  return ref;
}

/**
 * The agent and message layer from buildGraph, plus the topics this screen
 * chose, plus the ticket layer.
 *
 * Which tickets and which edges is memoryGraphModel's answer and not this
 * file's: an agent to the tickets it works, and a ticket to the memories whose
 * notes name its id. That is what makes the three kinds one graph rather than
 * three clouds sharing a canvas.
 */
function graphWith(base: GraphData, topics: MemoryTopic[], total: number, tasks: SearchTask[], roster: Agent[]): GraphData {
  const ids = new Set(base.nodes.map((n) => n.id));
  const nodes: GraphNode[] = [...base.nodes];
  const edges: GraphEdge[] = [...base.edges];
  for (const t of topics) {
    nodes.push({ kind: 'topic', id: t.id, label: t.label, weight: Math.max(1, t.weight) });
    for (const agentId of t.agentIds) if (ids.has(agentId)) edges.push({ id: `topic:${agentId}\u0000${t.id}`, kind: 'topic', source: agentId, target: t.id, weight: 1 });
  }
  const layer = taskLayer({ tasks, topics, roster });
  for (const n of layer.nodes) nodes.push({ kind: 'task', id: n.id, taskId: n.taskId, label: n.label, status: n.status, weight: n.weight });
  for (const e of layer.edges) edges.push({ id: e.id, kind: e.kind, source: e.source, target: e.target, weight: e.weight });
  return { nodes, edges, topicShown: topics.length, topicTotal: total, taskShown: layer.shown, taskTotal: layer.total };
}

/* ───────────────────────────── the screen ─────────────────────────────── */

export function MemoryScreen({ config }: { config: HarnessConfig | null }) {
  const { t } = useTranslation();
  const nav = usePaneNav();
  const technical = useTechnical();
  const agents = useStore((s) => s.agents);
  const agentById = useAgentById();
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const home = useMemo(() => window.cth.harnessHomeSync?.() ?? null, []);
  const hiveRoot = home ? `${home.replace(/[\\/]+$/, '')}/hive` : null;
  const log = useLog();
  const memories = useMemories(agents);
  const files = useDeliverables(hiveRoot);
  const meaning = useMeaningSearch(config);
  // Phase 5's two extra sources. Both are already polled elsewhere in PRO and
  // both are read only here: the ledger belongs to the orchestrator and the
  // message store belongs to the routing layer.
  const { tasks: ledger } = useTaskLedger(15_000);
  const floor = useFloor();
  const godName = useResolvedGodName();

  const [q, setQ] = useState('');
  const [whose, setWhose] = useState<string | null>(null);
  const [kind, setKind] = useState<KindPick>('all');
  const [sel, setSel] = useState<string | null>(null);
  const [view, setView] = useState<ViewPick>('graph');
  const [hits, setHits] = useState<Hit[]>([]);
  const [byMeaning, setByMeaning] = useState<{ ok: boolean; output: string; error?: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [note, setNote] = useState<MemoryTopic | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [sendOpen, setSendOpen] = useState(false);
  // 0.4.10: the two axes over a result set and the width of the rail. All
  // three are remembered, because they are a preference about how a person
  // reads and not a step in a task.
  const [rtype, setRtype] = useState<MemoryResultType>(() => readStored(TYPE_KEY, MEMORY_RESULT_TYPES, 'ticket'));
  const [pane, setPane] = useState<LayoutPick>(() => readStored<LayoutPick>(LAYOUT_KEY, ['list', 'cards'], 'list'));
  const [railW, setRailW] = useState<number>(readRail);
  useEffect(() => { store(TYPE_KEY, rtype); }, [rtype]);
  useEffect(() => { store(LAYOUT_KEY, pane); }, [pane]);
  useEffect(() => { store(RAIL_KEY, String(railW)); }, [railW]);

  const topics = useMemo(() => buildTopics(memories, files), [memories, files]);
  const listed = useMemo(() => filterTopics(topics, { kind, whose, q }), [topics, kind, whose, q]);
  const topicById = useMemo(() => new Map(topics.map((x) => [x.id, x])), [topics]);
  useEffect(() => { setShown(PAGE); }, [kind, whose, q]);

  const base = useMemo(() => buildGraph(agents, log), [agents, log]);
  const graph = useMemo(() => graphWith(base, listed.slice(0, GRAPH_TOPIC_CAP), listed.length, ledger ?? [], agents), [base, listed, ledger, agents]);
  const structKey = graph.nodes.map((n) => n.id).join(',') + '|' + graph.edges.map((e) => e.id).join(',');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => layout3d(graph), [structKey]);
  const keep = useMemo(() => keepFor(graph, whose), [graph, whose]);

  // text search: debounced, both doors, hits highlight agents on the graph
  useEffect(() => {
    const query = q.trim();
    if (!query) { setHits([]); setByMeaning(null); setSearching(false); return; }
    setSearching(true);
    const id = setTimeout(() => {
      Promise.all([
        window.cth.textSearch(query).then((r) => (r.ok ? r.results : [])).catch(() => [] as Hit[]),
        meaning ? window.cth.searchMemory(query, whose ?? undefined).catch((e: Error) => ({ ok: false, output: '', error: e.message })) : Promise.resolve(null)
      ]).then(([tx, pal]) => { setHits(tx); setByMeaning(pal); setSearching(false); });
    }, 300);
    return () => clearTimeout(id);
  }, [q, whose, meaning]);

  const hitAgents = useMemo(() => new Set(hits.map((h) => h.source.split('/')[0]).filter((id) => agents.some((a) => a.id === id))), [hits, agents]);
  const shownHits = useMemo(() => hits.filter((h) => !whose || h.source.startsWith(whose + '/')), [hits, whose]);

  /* ---- phase 5: what each hit is connected to ---------------------------
   * The join is arithmetic over three lists (shared/memorySearch.ts). Nothing
   * below decides what counts as a connection; it only draws what came back,
   * including the reason each link exists. */
  const joins = useMemo(
    () => shownHits.map((h) => ({ hit: h, join: joinHit({ hit: h, query: q, tasks: ledger ?? [], messages: floor, roster: agents }) })),
    [shownHits, q, ledger, floor, agents]
  );
  const named = useMemo(() => agentNamed(q, agents), [q, agents]);
  const dossier = useMemo(() => (named ? agentDossier(named.id, ledger ?? [], floor) : null), [named, ledger, floor]);
  const pickedHits = useMemo(() => shownHits.filter((h) => picked.includes(hitKey(h))), [shownHits, picked]);
  const togglePick = useCallback((h: Hit) => {
    const key = hitKey(h);
    setPicked((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));
  }, []);

  // Typing a query opens Results, and emptying it hands the stage back. Only
  // on the EDGE, so a person who deliberately switches to the graph mid-query
  // is not dragged out of it on the next keystroke.
  const hadQuery = useRef(false);
  useEffect(() => {
    const on = q.trim().length > 0;
    if (on !== hadQuery.current) {
      hadQuery.current = on;
      setView((v) => (on ? 'results' : v === 'results' ? 'graph' : v));
      if (!on) setPicked([]);
    }
  }, [q]);

  const sendPicked = (agentId: string, prompt: string) => {
    const to = agents.find((a) => a.id === agentId);
    if (!to || pickedHits.length === 0) return;
    setSendOpen(false);
    // `fromHuman` is what records the send in the durable sent log, so it
    // appears in that agent's thread with a delivery status. Without it the
    // person sends from here and sees nothing anywhere.
    useStore.getState().enqueueMessage(to.id, selectionMessage(pickedHits, q, prompt), { fromHuman: true });
    void window.cth.trackMessageSent?.('composer');
    setPicked([]);
    proToast(t('pro.memory.sentTo', { count: pickedHits.length, name: to.name }), { tone: 'ok' });
  };

  /* ---- 0.4.10: the same joins, sorted into the three types ---------------
   * classifyResults turns the per hit joins into ticket, agent and memory
   * records. It is the only place that decides what a result IS, so the list,
   * the cards and the rail all read one answer. */
  const results = useMemo(
    () => classifyResults({ joins, tasks: ledger ?? [], roster: agents, notes: memories }),
    [joins, ledger, agents, memories]
  );
  const counts = useMemo(() => countResults(results), [results]);
  const typed = useMemo(() => filterByType(results, rtype), [results, rtype]);
  // A filter left on an empty type makes the person prove the search worked,
  // so a result set with nothing under the chosen type moves to the first type
  // that has something. A set that is empty outright leaves the preference
  // alone: there is nothing to move to and the person keeps what they picked.
  useEffect(() => {
    if (results.length === 0) return;
    setRtype((k) => (counts[k] > 0 ? k : firstFilledType(counts)));
  }, [results, counts]);

  const topicsOf = useCallback((agentId: string) => topics.filter((x) => x.agentIds.includes(agentId)).length, [topics]);
  const selKind = sel ? nodeTypeOf(sel, agents) : null;
  const selTopic = sel ? topicById.get(sel) ?? null : null;
  const selAgent = sel && selKind === 'agent' ? agentById(sel) : undefined;
  const selTaskId = sel ? taskIdOf(sel) : null;
  const selTask = selTaskId ? (ledger ?? []).find((x) => x.id === selTaskId) ?? null : null;

  /* A chip on a card names another node. Clicking it selects that node, which
   * is the same thing clicking it on the stage does, so the rail is a place
   * you can walk the graph from as well as a place it reports to. */
  const openLink = useCallback((link: ResultLink) => {
    if (link.type === 'memory' && link.id.startsWith('hit:')) return;
    setSel(link.id);
  }, []);

  /* Item 10 (pilot): a click on the stage answers in the rail, and for an
   * AGENT the rail's card alone is not the answer: the WHOSE MEMORY chip is
   * how the topic list follows a person, so selecting an agent node selects
   * that chip too. A background click clears the selection and leaves the
   * filter alone: dropping the filter is the chip's own job. */
  const selectNode = useCallback((id: string | null) => {
    setSel(id);
    if (id && nodeTypeOf(id, agents) === 'agent') setWhose(id);
  }, [agents]);

  const kindTitle = (k: MemoryKind) => technical ? `${t(`pro.memory.kindHint.${k}`)} · ${WING_OF[k]}` : t(`pro.memory.kindHint.${k}`);
  const pathOf = (x: MemoryTopic) => x.file ? `hive/${x.file.rel}` : `hive/agents/${x.notes[0].agentId}/memory.md:${x.notes[0].line}`;
  const openSettings = () => window.dispatchEvent(new CustomEvent('cth:open-settings', { detail: { section: 'Memory & Knowledge' } }));

  const topicRow = (x: MemoryTopic) => (
    <button key={x.id} type="button" onClick={() => setSel(x.id)} style={{ textAlign: 'start', display: 'flex', flexDirection: 'column', gap: 3, padding: '8px 10px', borderRadius: 8, font: 'inherit', cursor: 'pointer', color: 'inherit', minWidth: 0,
      border: '1px solid ' + (sel === x.id ? 'var(--cth-accent-line)' : 'var(--cth-ink-300)'), background: sel === x.id ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span title={x.label} style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.label}</span>
        <Chip tone={KIND_TONE[x.kind]} title={kindTitle(x.kind)}>{t(`pro.memory.kind.${x.kind}`)}</Chip>
      </span>
      {x.text !== x.label && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.4, overflow: 'hidden', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{x.text}</span>}
      <span style={{ fontSize: 11, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {x.agentIds.length ? x.agentIds.map((id) => agentById(id)?.name ?? id).join(', ') : t('pro.memory.noOwner')}
      </span>
      {technical && <span title={pathOf(x)} style={{ fontSize: 10.5, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pathOf(x)}</span>}
    </button>
  );

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <Bar title={t('pro.memory.title')} sub={t('pro.memory.sub', { topics: topics.length, agents: agents.length })}>
        <SearchBox value={q} onChange={setQ} placeholder={t('pro.memory.search')} style={{ flex: '0 1 280px', minWidth: 120 }} />
        <Seg value={view} ariaLabel={t('pro.memory.view')} onChange={setView} options={[{ value: 'graph', label: t('pro.memory.graph') }, { value: 'list', label: t('pro.memory.list') }, { value: 'results', label: t('pro.memory.resultsView') }]} />
        <Btn onClick={openSettings} title={t('pro.memory.settingsHint')}>{t('pro.menu.settings')}</Btn>
      </Bar>
      {/* Three columns: the stage, the drag handle, the rail. The rail's width
          is state, so the grid is what actually resizes and the stage's own
          measurement on the next frame picks the change up. */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `minmax(0, 1fr) 8px ${railW}px` }}>
        {view === 'results' ? (
          <ResultsPane
            q={q} onQuery={setQ} searching={searching} joins={joins} named={named} dossier={dossier}
            godName={godName} picked={picked} count={pickedHits.length} onPick={togglePick} onClearPicked={() => setPicked([])}
            onSend={() => setSendOpen(true)} onOpenAgent={(id) => nav.go(`agent:${id}`)} technical={technical}
            results={typed} counts={counts} type={rtype} onType={setRtype} pane={pane} onPane={setPane}
            sel={sel} onSelect={setSel} onOpenLink={openLink} onOpenTicket={(id) => openTaskDetail(id)}
          />
        ) : view === 'graph' ? (
          <GraphStage graph={graph} layout={layout} keep={keep} hitAgents={hitAgents} sel={sel} onSelect={selectNode} agents={agents} />
        ) : (
          <div style={{ overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {listed.length === 0 && <div style={{ color: 'var(--cth-ink-500)', fontSize: 13, textAlign: 'center', padding: 40 }}>{t(kind === 'deliverables' ? 'pro.memory.noDeliverables' : 'pro.memory.noTopics')}</div>}
            {listed.slice(0, shown).map(topicRow)}
            {listed.length > shown && <Btn size="sm" onClick={() => setShown(shown + PAGE)}>{t('pro.memory.showMore', { count: Math.min(PAGE, listed.length - shown) })}</Btn>}
          </div>
        )}
        <Splitter
          width={railW} onChange={setRailW} reset={RAIL_DEFAULT}
          label={t('pro.memory.railLabel')} title={t('pro.memory.railHint')}
        />
        <aside style={{ borderLeft: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <SectionH>{t('pro.memory.whose')}</SectionH>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <FilterChip on={whose === null} onClick={() => setWhose(null)}>{t('pro.memory.everyone')}</FilterChip>
            {agents.map((a) => (
              <FilterChip key={a.id} on={whose === a.id} onClick={() => { setWhose(whose === a.id ? null : a.id); setSel(null); }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><SpritePortrait character={a.character} size={16} />{a.name}</span>
              </FilterChip>
            ))}
          </div>

          <SectionH>{t('pro.memory.kindLabel')}</SectionH>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="radiogroup" aria-label={t('pro.memory.kindLabel')}>
            <FilterChip on={kind === 'all'} onClick={() => setKind('all')}>{t('pro.memory.kind.all')}</FilterChip>
            {MEMORY_KINDS.map((k) => (
              <span key={k} title={kindTitle(k)} style={{ display: 'inline-flex' }}>
                <FilterChip on={kind === k} onClick={() => { setKind(kind === k ? 'all' : k); setSel(null); }}>{t(`pro.memory.kind.${k}`)}</FilterChip>
              </span>
            ))}
          </div>

          {/* WHAT IS SELECTED, drawn by the one card component the result
              grid uses, so the stage and the search can never describe the
              same thing two different ways. Each type adds only the doors that
              belong to it underneath. */}
          {selTopic && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <ResultCard
                result={topicResult(selTopic, agents, ledger ?? [])} dense on
                lead={<Chip tone={KIND_TONE[selTopic.kind]} title={kindTitle(selTopic.kind)}>{t(`pro.memory.kind.${selTopic.kind}`)}</Chip>}
                onOpenLink={openLink}
              />
              {technical && <code style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', overflowWrap: 'anywhere' }}>{pathOf(selTopic)}</code>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn size="sm" kind="primary" onClick={() => setNote(selTopic)}>{t('pro.memory.openNote')}</Btn>
                <Btn size="sm" onClick={() => setQ(selTopic.label)}>{t('pro.memory.searchThis')}</Btn>
                <Btn size="sm" kind="ghost" onClick={() => setSel(null)}>{t('pro.memory.clear')}</Btn>
              </div>
            </div>
          )}

          {selTask && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <ResultCard result={ticketResult(selTask, agents)} dense on onOpenLink={openLink} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Btn size="sm" kind="primary" onClick={() => openTaskDetail(selTask.id)}>{t('pro.memory.openTicket')}</Btn>
                <Btn size="sm" onClick={() => setQ(selTask.id)}>{t('pro.memory.searchThis')}</Btn>
                <Btn size="sm" kind="ghost" onClick={() => setSel(null)}>{t('pro.memory.clear')}</Btn>
              </div>
            </div>
          )}

          {selAgent && (() => {
            const a = selAgent;
            const text = memories[a.id] ?? '';
            const held = (ledger ?? []).filter((x) => x.assignee === a.id);
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                <ResultCard
                  result={agentResult(a, held.map((x) => ({ type: 'ticket' as const, id: `task:${x.id}`, label: x.title || x.id })), topics.filter((x) => x.agentIds.includes(a.id)).slice(0, LINK_CAP).map((x) => ({ type: 'memory' as const, id: x.id, label: x.label })), text)}
                  dense on lead={<SpritePortrait character={a.character} size={28} />} onOpenLink={openLink}
                />
                <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', overflowWrap: 'anywhere' }}>{t('pro.memory.agentLine', { topics: topicsOf(a.id), kb: (new Blob([text]).size / 1024).toFixed(1) })}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Btn size="sm" onClick={() => setWhose(a.id)}>{t('pro.memory.only', { name: a.name })}</Btn>
                  <Btn size="sm" onClick={() => nav.go(`agent:${a.id}`)}>{t('pro.memory.openAgent')}</Btn>
                  <Btn size="sm" kind="ghost" onClick={() => setSel(null)}>{t('pro.memory.clear')}</Btn>
                </div>
              </div>
            );
          })()}

          {q.trim() && (
            <>
              {/* The result view owns the hit list once it is open. Two copies
                  of the same rows, one of them without the join, is the
                  screen answering the same question twice. */}
              {view !== 'results' && (
                <>
                  <SectionH>{searching ? t('pro.memory.searching') : t('pro.memory.exact', { count: shownHits.length })}</SectionH>
                  {shownHits.map((h, i) => {
                    const a = agentById(h.source.split('/')[0]);
                    return (
                      <button key={i} type="button" onClick={() => a && setSel(a.id)} style={{ textAlign: 'start', display: 'flex', flexDirection: 'column', gap: 4, padding: 10, borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', font: 'inherit', cursor: a ? 'pointer' : 'default', color: 'inherit', minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{a && <SpritePortrait character={a.character} size={16} />}<span title={a ? a.name : h.source} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a ? a.name : h.source}</span>{technical && a && <span title={h.source} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--cth-font-mono)' }}>{h.source}</span>}</span>
                        <span style={{ fontSize: 12.5, color: 'var(--cth-ink-900)', lineHeight: 1.4, overflowWrap: 'anywhere' }}>{h.excerpt}</span>
                      </button>
                    );
                  })}
                  {!searching && shownHits.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t('pro.memory.noHits')}</div>}
                </>
              )}
              {byMeaning && (
                <>
                  <SectionH>{t('pro.memory.byMeaning')}</SectionH>
                  {byMeaning.ok ? <CodeBox>{byMeaning.output.trim() || t('pro.memory.noMeaning')}</CodeBox> : <div style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }}>{byMeaning.error ?? t('memoryPanel.searchFailed')}</div>}
                </>
              )}
            </>
          )}

          <SectionH right={<span style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)' }}>{listed.length}</span>}>
            {kind === 'all' ? t('pro.memory.topics') : t(`pro.memory.kind.${kind}`)}
          </SectionH>
          {listed.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t(kind === 'deliverables' ? 'pro.memory.noDeliverables' : 'pro.memory.noTopics')}</div>}
          {listed.slice(0, shown).map(topicRow)}
          {listed.length > shown && <Btn size="sm" onClick={() => setShown(shown + PAGE)}>{t('pro.memory.showMore', { count: Math.min(PAGE, listed.length - shown) })}</Btn>}
        </aside>
      </div>
      {note && home && hiveRoot && <NoteSheet topic={note} home={home} hiveRoot={hiveRoot} onClose={() => setNote(null)} onOpenAgent={(id) => { setNote(null); nav.go(`agent:${id}`); }} />}
      {sendOpen && <SendSheet count={pickedHits.length} agents={agents} onClose={() => setSendOpen(false)} onSend={sendPicked} />}
    </div>
  );
}

/* ───────────────────────────── the result view ────────────────────────── */

const cardStyle = {
  display: 'flex', flexDirection: 'column' as const, gap: 8, padding: 12, borderRadius: 'var(--cth-radius-lg)',
  border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', minWidth: 0
};
const subHead = { fontSize: 11, fontWeight: 600, letterSpacing: 0.3, textTransform: 'uppercase' as const, color: 'var(--cth-ink-500)' };

/**
 * The result view. Three of the founder's four 0.4.9 asks live in this
 * component: the query is editable HERE rather than only in the title bar
 * (5.2), the hint that more detail filters better sits under that field as a
 * line of text and not a toast (5.2), and the results carry a checkbox with a
 * visible count and a way out of the selection (5.4).
 *
 * 0.4.10 adds the two axes the founder asked for. TYPE is what a result is,
 * one of three, decided by memoryGraphModel and never here. LAYOUT is how the
 * set is drawn, a list of rows or a grid of cards, and it is the same grid
 * pattern the Tasks cards use so the two screens read as one product.
 *
 * The memory type keeps HitCard for its LIST row, because that row is the
 * phase 5 evidence card: the checkbox that feeds the send, the tickets, the
 * agents on them and the desk messages, each with the reason it is there. The
 * card grid and the right rail both draw ResultCard instead, which is the
 * summary of exactly the same record.
 */
function ResultsPane({
  q, onQuery, searching, joins, named, dossier, godName, picked, count, onPick, onClearPicked, onSend, onOpenAgent, technical,
  results, counts, type, onType, pane, onPane, sel, onSelect, onOpenLink, onOpenTicket
}: {
  q: string; onQuery: (v: string) => void; searching: boolean;
  joins: { hit: MemoryHit; join: HitJoin }[];
  named: { id: string; name: string } | null; dossier: AgentDossier | null;
  godName: string; picked: string[];
  /** What would actually be sent, which is what the chip must say. A pick
   *  whose row the Whose filter has hidden is not in the send, so counting
   *  the raw keys would promise one thing and do another. */
  count: number;
  onPick: (h: MemoryHit) => void; onClearPicked: () => void;
  onSend: () => void; onOpenAgent: (id: string) => void; technical: boolean;
  results: MemoryResult[]; counts: Record<MemoryResultType, number>;
  type: MemoryResultType; onType: (v: MemoryResultType) => void;
  pane: LayoutPick; onPane: (v: LayoutPick) => void;
  sel: string | null; onSelect: (id: string | null) => void;
  onOpenLink: (link: ResultLink) => void; onOpenTicket: (id: string) => void;
}) {
  const { t } = useTranslation();
  const byKey = useMemo(() => new Map(joins.map((j) => [hitKey(j.hit), j])), [joins]);
  const total = counts.ticket + counts.agent + counts.memory;
  return (
    <div style={{ overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <SectionH>{t('pro.memory.editQuery')}</SectionH>
        <SearchBox value={q} onChange={onQuery} placeholder={t('pro.memory.search')} style={{ width: '100%' }} />
        <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t('pro.memory.detailHint')}</span>
      </div>

      {count > 0 && (
        <div style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Chip tone="accent">{t('pro.memory.selected', { count })}</Chip>
          <span style={{ flex: 1 }} />
          <Btn size="sm" kind="primary" onClick={onSend}><ProIcon name="send" size={13} />{t('pro.memory.sendPicked')}</Btn>
          <Btn size="sm" kind="ghost" onClick={onClearPicked}>{t('pro.memory.clearPicked')}</Btn>
        </div>
      )}

      {named && dossier && <AgentAnswer agentId={named.id} name={named.name} dossier={dossier} onOpenAgent={onOpenAgent} />}

      {/* With nothing typed there are no results to count, and "0 results for
          nothing" is a sentence about the person rather than the workspace.
          The field above it and the hint under it are the whole state. */}
      {q.trim() !== '' && (
        <>
          <SectionH right={<Seg value={pane} ariaLabel={t('pro.memory.layout')} onChange={onPane} options={[{ value: 'list', label: t('pro.memory.list') }, { value: 'cards', label: t('pro.memory.cards') }]} />}>
            {searching ? t('pro.memory.searching') : t('pro.memory.results', { count: total, q })}
          </SectionH>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="radiogroup" aria-label={t('pro.memory.typeLabel')}>
            {MEMORY_RESULT_TYPES.map((k) => (
              <FilterChip key={k} on={type === k} onClick={() => onType(k)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <ProIcon name={TYPE_ICON[k]} size={12} />{t(`pro.memory.type.${k}`)}
                  <span style={{ fontFamily: 'var(--cth-font-mono)', opacity: 0.75 }}>{counts[k]}</span>
                </span>
              </FilterChip>
            ))}
          </div>
          {!searching && total === 0 && <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t('pro.memory.noHits')}</div>}
          {!searching && total > 0 && results.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t('pro.memory.noneOfType')}</div>}

          {/* The Tasks screen's grid, verbatim, so a card is the same size
              object on both screens and both reflow at the same width. */}
          <div style={pane === 'cards'
            ? { display: 'grid', gridTemplateColumns: CARD_GRID_COLUMNS, gap: 12, alignItems: 'start' }
            : { display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            {results.map((r) => {
              const hit = pane === 'list' && r.type === 'memory' ? byKey.get(r.ref) : undefined;
              return hit ? (
                <HitCard
                  key={r.id} hit={hit.hit} join={hit.join} godName={godName} technical={technical}
                  on={picked.includes(r.ref)} onPick={() => onPick(hit.hit)} onOpenAgent={onOpenAgent}
                />
              ) : (
                <ResultCard
                  key={r.id} result={r} on={sel === r.id} dense={pane === 'list'}
                  onOpen={r.type === 'ticket' ? () => onOpenTicket(r.ref) : r.id.startsWith('hit:') ? undefined : () => onSelect(r.id)}
                  onOpenLink={onOpenLink}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * ONE RESULT, drawn the same way wherever it appears.
 *
 * The founder asked for card content that is "structured and responsive and
 * readable", which comes apart into four rules:
 *
 *   STRUCTURED. A fixed running order, so the eye learns it once: what it is
 *   (a type chip), what it is called (the title), where it came from (the
 *   subtitle, monospaced, because it is an id or a path), what it says (the
 *   excerpt) and what it is joined to (the chips).
 *
 *   RESPONSIVE. Nothing has a fixed width, every row is `minWidth: 0` so a
 *   long token cannot push the grid column wider, and the title truncates with
 *   an ellipsis while the body wraps anywhere.
 *
 *   READABLE. The excerpt is clamped in the SOURCE by clampLines, not painted
 *   short by the browser, so a four hundred line note costs four lines of DOM
 *   and the card can say how many lines it is holding back.
 *
 *   HONEST. A result joined to nothing says so in words. It never draws an
 *   empty row of chips and leaves the person to work out why.
 */
function ResultCard({ result, on, dense, lead, onOpen, onOpenLink }: {
  result: MemoryResult;
  on?: boolean;
  /** List rows have the full width, so they can hold more of the note. */
  dense?: boolean;
  lead?: React.ReactNode;
  onOpen?: () => void;
  onOpenLink: (link: ResultLink) => void;
}) {
  const { t } = useTranslation();
  const cut = clampLines(result.excerpt, dense ? { maxLines: 6, maxChars: 420 } : { maxLines: 3, maxChars: 200 });
  const shownLinks = result.links.slice(0, LINK_CAP);
  return (
    <div style={{ ...cardStyle, border: '1px solid ' + (on ? 'var(--cth-accent-line)' : 'var(--cth-ink-300)'), background: on ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
        {lead}
        {onOpen ? (
          <button type="button" onClick={onOpen} title={`${result.title || result.subtitle} · ${t('pro.memory.openResult')}`} style={{
            flex: 1, minWidth: 0, textAlign: 'start', border: 'none', background: 'transparent', padding: 0, font: 'inherit',
            fontSize: 13, fontWeight: 600, color: 'var(--cth-ink-900)', cursor: 'pointer',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>{result.title || result.subtitle}</button>
        ) : (
          <b title={result.title || result.subtitle} style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title || result.subtitle}</b>
        )}
        {result.status && <Chip tone="muted">{t(`pro.tasks.status.${result.status}`)}</Chip>}
        <Chip tone={TYPE_TONE[result.type]}>{t(`pro.memory.type.${result.type}`)}</Chip>
      </div>

      {result.subtitle && result.subtitle !== result.title && (
        <span title={result.subtitle} style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.subtitle}</span>
      )}

      {cut.text && (
        <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cth-ink-700)', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
          {cut.text}{cut.clipped ? '…' : ''}
        </p>
      )}
      {cut.hiddenLines > 0 && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{cut.hiddenLines === 1 ? t('pro.memory.moreLinesOne') : t('pro.memory.moreLines', { count: cut.hiddenLines })}</span>}

      {result.links.length === 0 ? (
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t('pro.memory.noConnections')}</span>
      ) : (
        <>
          <span style={subHead}>{t('pro.memory.connected', { count: result.links.length })}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
            {shownLinks.map((link) => (
              <button
                key={link.id} type="button" onClick={() => onOpenLink(link)} title={`${link.label} · ${t(`pro.memory.type.${link.type}`)}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%', minWidth: 0,
                  border: '1px solid var(--cth-ink-300)', borderRadius: 'var(--cth-radius-md)', padding: '2px 8px',
                  background: 'transparent', font: 'inherit', fontSize: 12, color: 'var(--cth-ink-900)', cursor: 'pointer'
                }}
              >
                <ProIcon name={TYPE_ICON[link.type]} size={12} />
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.label}</span>
              </button>
            ))}
            {result.links.length > LINK_CAP && (
              <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', alignSelf: 'center' }}>{t('pro.memory.moreConnected', { count: result.links.length - LINK_CAP })}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** One hit, and everything the join proved it is connected to. */
function HitCard({ hit, join, godName, technical, on, onPick, onOpenAgent }: {
  hit: MemoryHit; join: HitJoin; godName: string; technical: boolean; on: boolean; onPick: () => void; onOpenAgent: (id: string) => void;
}) {
  const { t } = useTranslation();
  const agentById = useAgentById();
  const owner = join.agentId ? agentById(join.agentId) : undefined;
  const people = join.agentIds.map(agentById).filter((a): a is Agent => !!a);
  return (
    <div style={{ ...cardStyle, border: '1px solid ' + (on ? 'var(--cth-accent-line)' : 'var(--cth-ink-300)'), background: on ? 'var(--cth-accent-soft)' : 'var(--cth-cream-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <input type="checkbox" checked={on} onChange={onPick} aria-label={t('pro.memory.pick')} style={{ width: 15, height: 15, margin: 0, accentColor: 'var(--cth-accent)', cursor: 'pointer' }} />
        {owner && <SpritePortrait character={owner.character} size={28} />}
        <b title={owner ? owner.name : hit.source} style={{ minWidth: 0, fontSize: 12.5, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner ? owner.name : hit.source}</b>
        {technical && <span title={hit.source} style={{ minWidth: 0, fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hit.source}</span>}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cth-ink-900)', overflowWrap: 'anywhere' }}>{hit.excerpt}</p>

      {join.empty ? (
        <span style={{ fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t('pro.memory.noJoin')}</span>
      ) : (
        <>
          <span style={subHead}>{t('pro.memory.tickets')}</span>
          {join.tasks.length === 0
            ? <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.memory.noTicketYet')}</span>
            : join.tasks.slice(0, JOIN_CAP).map((link) => <TicketRow key={link.task.id} link={link} />)}
          {join.tasks.length > JOIN_CAP && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.memory.moreTickets', { count: join.tasks.length - JOIN_CAP })}</span>}

          {people.length > 0 && (
            <>
              <span style={subHead}>{t('pro.memory.onTickets')}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {people.map((a) => (
                  <button key={a.id} type="button" onClick={() => onOpenAgent(a.id)} title={t('pro.memory.openAgent')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid var(--cth-ink-300)', borderRadius: 8, padding: '2px 8px 2px 3px', background: 'transparent', font: 'inherit', fontSize: 12, color: 'var(--cth-ink-900)', cursor: 'pointer' }}>
                    <SpritePortrait character={a.character} size={18} />{a.name}
                  </button>
                ))}
              </div>
            </>
          )}

          <span style={subHead}>{t('pro.memory.desk', { god: godName })}</span>
          {join.messages.length === 0
            ? <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.memory.noDeskYet', { god: godName })}</span>
            : join.messages.slice(0, JOIN_CAP).map((link) => <MessageRow key={link.message.id} link={link} />)}
          {join.messages.length > JOIN_CAP && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.memory.moreMessages', { count: join.messages.length - JOIN_CAP })}</span>}
        </>
      )}
    </div>
  );
}

const VIA_TONE: Record<TaskLink['via'], ChipTone> = { named: 'accent', words: 'muted' };

/** A ticket the hit touches, with the REASON it is here next to it. The card
 *  opens the same task sheet every other PRO surface opens. */
function TicketRow({ link }: { link: TaskLink }) {
  const { t } = useTranslation();
  const openTaskDetail = useStore((s) => s.openTaskDetail);
  const { task, via } = link;
  return (
    <button type="button" onClick={() => openTaskDetail(task.id)} title={t('pro.memory.openTicket')}
      style={{ textAlign: 'start', display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', font: 'inherit', color: 'inherit', cursor: 'pointer', minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
        <span title={task.title} style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
        <Chip tone={VIA_TONE[via]}>{t(via === 'named' ? 'pro.memory.viaNamed' : 'pro.memory.viaWords')}</Chip>
      </span>
      <span title={task.id} style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.id}</span>
    </button>
  );
}

/** One message with the orchestrator or the person at an end. */
function MessageRow({ link }: { link: MessageLink }) {
  const { t, i18n } = useTranslation();
  const nameFor = useNameFor();
  const m: SearchMessage = link.message;
  const label = (party: string) => (party === 'human' ? t('pro.you') : nameFor(party) ?? party);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', minWidth: 0 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--cth-ink-500)' }}>
        <b style={{ color: 'var(--cth-ink-700)' }}>{label(m.from)}</b>
        <span>→ {label(m.to)}</span>
        <Chip tone={VIA_TONE[link.via]}>{t(link.via === 'named' ? 'pro.memory.viaNamed' : 'pro.memory.viaWords')}</Chip>
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--cth-font-mono)' }}>{fmtWhen(m.created_at, i18n.language)}</span>
      </span>
      {m.subject && <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--cth-ink-900)', overflowWrap: 'anywhere' }}>{m.subject}</span>}
      <span style={{ fontSize: 12, color: 'var(--cth-ink-700)', lineHeight: 1.45, overflow: 'hidden', overflowWrap: 'anywhere', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{m.body}</span>
    </div>
  );
}

/**
 * 5.3: the query is an agent's name, so the honest answer is that agent's own
 * work. Matched on word boundaries against the roster (agentNamed), never on
 * a substring, so this card appears because the person meant it.
 */
function AgentAnswer({ agentId, name, dossier, onOpenAgent }: { agentId: string; name: string; dossier: AgentDossier; onOpenAgent: (id: string) => void }) {
  const { t } = useTranslation();
  const agentById = useAgentById();
  const agent = agentById(agentId);
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {agent && <SpritePortrait character={agent.character} size={28} />}
        <b style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--cth-ink-900)' }}>{t('pro.memory.agentMatch', { name })}</b>
        <Btn size="sm" onClick={() => onOpenAgent(agentId)}>{t('pro.memory.openAgent')}</Btn>
      </div>
      <span style={subHead}>{t('pro.memory.agentTickets')}</span>
      {dossier.tasks.length === 0
        ? <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.memory.agentNoTickets')}</span>
        : dossier.tasks.slice(0, JOIN_CAP).map((task) => <TicketRow key={task.id} link={{ task, via: 'named' }} />)}
      {dossier.tasks.length > JOIN_CAP && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.memory.moreTickets', { count: dossier.tasks.length - JOIN_CAP })}</span>}
      <span style={subHead}>{t('pro.memory.agentMessages')}</span>
      {dossier.messages.length === 0
        ? <span style={{ fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.memory.agentNoMessages')}</span>
        : dossier.messages.slice(0, JOIN_CAP).map((message) => <MessageRow key={message.id} link={{ message, via: 'named' }} />)}
      {dossier.messages.length > JOIN_CAP && <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.memory.moreMessages', { count: dossier.messages.length - JOIN_CAP })}</span>}
    </div>
  );
}

/**
 * 5.4's second half: the picked results go to ANY agent on the roster, with
 * the person's own words in front of them. The target list is the live roster
 * drawn as sprites, so there is no way to address something that is not
 * there, and Send is dead until a target is chosen.
 */
function SendSheet({ count, agents, onClose, onSend }: { count: number; agents: Agent[]; onClose: () => void; onSend: (agentId: string, prompt: string) => void }) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<string | null>(agents.find((a) => a.isGod)?.id ?? null);
  const [prompt, setPrompt] = useState('');
  return (
    <Sheet onClose={onClose} width={560}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 12px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, flex: 1, color: 'var(--cth-ink-900)' }}>{t('pro.memory.sendTitle', { count })}</h2>
        <CloseX onClick={onClose} title={t('common.close')} />
      </div>
      <div style={{ overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionH>{t('pro.memory.sendTo')}</SectionH>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {agents.map((a) => (
              <FilterChip key={a.id} on={target === a.id} onClick={() => setTarget(a.id)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><SpritePortrait character={a.character} size={16} />{a.name}</span>
              </FilterChip>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SectionH>{t('pro.memory.sendPrompt')}</SectionH>
          <textarea
            value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label={t('pro.memory.sendPrompt')}
            placeholder={t('pro.memory.sendPromptPlaceholder')} style={textareaStyle}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)', flexWrap: 'wrap' }}>
        <Btn kind="primary" disabled={!target || count === 0} onClick={() => { if (target) onSend(target, prompt); }}>
          <ProIcon name="send" size={13} />{t('pro.memory.sendNow')}
        </Btn>
        <span style={{ flex: 1 }} />
        <Btn kind="ghost" onClick={onClose}>{t('common.close')}</Btn>
      </div>
    </Sheet>
  );
}

/* ───────────────────────────── the note sheet ─────────────────────────── */

/**
 * "Open the source note": the same door the Classic Command Center's MEMORY
 * FILE tab uses (hive:memory, already loaded into the topic's notes), shown
 * in place, plus fs:revealPath to show the real file in the OS file browser.
 * A deliverable that is text is read through the root-confined fs:readFile;
 * anything else is revealed only.
 */
function NoteSheet({ topic, home, hiveRoot, onClose, onOpenAgent }: { topic: MemoryTopic; home: string; hiveRoot: string; onClose: () => void; onOpenAgent: (id: string) => void }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const agentById = useAgentById();
  const [fileText, setFileText] = useState<string | null>(null);
  const file = topic.file;
  const abs = file ? deliverablePathOf(home, file.rel) : memoryPathOf(home, topic.notes[0].agentId);
  useEffect(() => {
    if (!file || !TEXT_FILE.test(file.name)) return;
    let alive = true;
    window.cth.readFile(hiveRoot, file.rel).then((r) => { if (alive && r.ok) setFileText(r.content); }).catch(() => undefined);
    return () => { alive = false; };
  }, [file, hiveRoot]);
  const reveal = () => {
    window.cth.revealPath(abs).then((r) => { if (!r.ok) proToast(t('pro.memory.revealFailed'), { tone: 'bad' }); }).catch(() => proToast(t('pro.memory.revealFailed'), { tone: 'bad' }));
  };
  const owners = topic.notes.length ? [...new Set(topic.notes.map((n) => n.agentId))] : topic.agentIds;
  return (
    <Sheet onClose={onClose} width={720}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 12px 18px', borderBottom: '1px solid var(--cth-ink-300)' }}>
        <Chip tone={KIND_TONE[topic.kind]}>{t(`pro.memory.kind.${topic.kind}`)}</Chip>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, flex: 1, color: 'var(--cth-ink-900)', overflowWrap: 'anywhere' }}>{topic.label}</h2>
        <CloseX onClick={onClose} title={t('common.close')} />
      </div>
      <div style={{ overflow: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {technical && <code style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-mono)', overflowWrap: 'anywhere' }}>{abs}</code>}
        {file ? (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--cth-ink-700)', overflowWrap: 'anywhere' }}>{t('pro.memory.fileLine', { path: file.rel, kb: (file.size / 1024).toFixed(1) })}</div>
            {fileText !== null && (/\.(md|markdown)$/i.test(file.name) ? <MarkdownPreview source={fileText} variant="card" /> : <CodeBox style={{ maxHeight: 420 }}>{fileText}</CodeBox>)}
          </>
        ) : topic.notes.map((n, i) => {
          const a = agentById(n.agentId);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--cth-ink-900)' }}>
                {a && <SpritePortrait character={a.character} size={28} />}
                <b>{a?.name ?? n.agentId}</b>
                <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.memory.noteLine', { line: n.line })}</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--cth-ink-900)' }}><MarkdownPreview source={n.body} variant="card" /></div>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '12px 18px', borderTop: '1px solid var(--cth-ink-300)', flexWrap: 'wrap' }}>
        <Btn kind="primary" onClick={reveal}>{t('pro.memory.reveal')}</Btn>
        {owners.length === 1 && agentById(owners[0]) && <Btn onClick={() => onOpenAgent(owners[0])}>{t('pro.memory.openAgent')}</Btn>}
        <span style={{ flex: 1 }} />
        <Btn kind="ghost" onClick={onClose}>{t('common.close')}</Btn>
      </div>
    </Sheet>
  );
}

/* ───────────────────────────── the canvas ─────────────────────────────── */

/**
 * THE TWO GLYPHS THE NON AGENT NODES WEAR (0.4.10).
 *
 * An agent node is its character sprite, and has been since phase 3. A ticket
 * and a memory had nothing: they were flat filled circles that the legend had
 * to name. So each gets a DRAWN MARK, never a letter and never an initial:
 *
 *   ticket   a stub with a notch bitten out of the top and the bottom edge,
 *            and a perforation down the middle, which is what a ticket looks
 *            like at any size on any surface anyone has ever printed one on.
 *   memory   a page with the top right corner folded back and two ruled
 *            lines, which is a note and not a document icon.
 *
 * They are painted ONCE into an offscreen canvas the same way usePortraits
 * paints the sprites, and blitted per frame. Unlike a sprite they are painted
 * in the kit's colours, so the sheet is repainted when the theme flips; the
 * effect that draws the stage restarts on the same flip, so the first frame
 * after a switch is already in the new palette.
 */
type GlyphName = 'ticket' | 'memory';
const GLYPH_PX = 96;

function paintGlyph(ctx: CanvasRenderingContext2D, name: GlyphName, ink: string, fill: string) {
  const u = GLYPH_PX / 24;
  ctx.save();
  ctx.scale(u, u);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;
  ctx.fillStyle = fill;
  if (name === 'ticket') {
    const p = new Path2D('M4 8h16v3a1.6 1.6 0 000 3.2V18H4v-3.8a1.6 1.6 0 000-3.2z');
    ctx.fill(p); ctx.stroke(p);
    ctx.beginPath();
    ctx.setLineDash([1.6, 1.6]);
    ctx.moveTo(14.5, 8.6); ctx.lineTo(14.5, 17.4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(6.4, 11.4); ctx.lineTo(11.6, 11.4);
    ctx.moveTo(6.4, 14.6); ctx.lineTo(10.2, 14.6);
    ctx.stroke();
  } else {
    const p = new Path2D('M6 4h8.5L19 8.5V20H6z');
    ctx.fill(p); ctx.stroke(p);
    ctx.beginPath();
    ctx.moveTo(14.5, 4); ctx.lineTo(14.5, 8.5); ctx.lineTo(19, 8.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8.6, 12.4); ctx.lineTo(16.4, 12.4);
    ctx.moveTo(8.6, 15.8); ctx.lineTo(13.8, 15.8);
    ctx.stroke();
  }
  ctx.restore();
}

/** One offscreen canvas per glyph, repainted whenever the palette moves. */
function useGlyphs(theme: string, onReady: () => void): React.MutableRefObject<Map<GlyphName, HTMLCanvasElement>> {
  const ref = useRef(new Map<GlyphName, HTMLCanvasElement>());
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const col = (k: string) => cs.getPropertyValue(k).trim();
    const paint: [GlyphName, string, string][] = [
      ['ticket', col('--cth-ink-900') || col('--cth-ink-700'), col('--cth-mint-light') || col('--cth-cream-200')],
      ['memory', col('--cth-ink-900') || col('--cth-ink-700'), col('--cth-lemon-light') || col('--cth-cream-200')]
    ];
    for (const [name, ink, fill] of paint) {
      const cv = ref.current.get(name) ?? document.createElement('canvas');
      cv.width = GLYPH_PX; cv.height = GLYPH_PX;
      const ctx = cv.getContext('2d');
      if (!ctx) continue;
      ctx.clearRect(0, 0, GLYPH_PX, GLYPH_PX);
      paintGlyph(ctx, name, ink, fill);
      ref.current.set(name, cv);
    }
    onReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return ref;
}

interface StageProps { graph: GraphData; layout: Layout3; keep: Set<string> | null; hitAgents: Set<string>; sel: string | null; onSelect: (id: string | null) => void; agents: Agent[] }

function GraphStage({ graph, layout, keep, hitAgents, sel, onSelect, agents }: StageProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [, bump] = useState(0);
  const portraits = usePortraits(agents, () => bump((n) => n + 1));
  const glyphs = useGlyphs(theme, () => bump((n) => n + 1));
  // Everything the frame loop reads lives in one ref: a render must never
  // restart the loop, and the loop must never read a stale closure.
  //
  // 0.4.11 (pilot item 9): the stage STANDS STILL. The layout settles once in
  // layout3d and the view angle is fixed, so `rot` and `tilt` never change.
  // What moves is what the person moves: `pins` holds every node a drag has
  // placed, `view` holds the zoom and the pan, and the two drag records tell
  // a node drag from a background pan from a plain click.
  const st = useRef({
    rot: 0, tilt: 0.35, hover: null as string | null,
    view: { zoom: 1, zoomTarget: 1, panX: 0, panY: 0 },
    pins: new Map<string, P3>(),
    nodeDrag: null as null | { id: string; dx: number; dy: number; sx: number; sy: number; moved: boolean },
    panDrag: null as null | { x: number; y: number; panX: number; panY: number; moved: boolean },
    graph, layout, keep, hitAgents, sel, projected: [] as { id: string; p: Projected; r: number }[]
  });
  st.current.graph = graph; st.current.layout = layout; st.current.keep = keep; st.current.hitAgents = hitAgents; st.current.sel = sel;
  const charOf = useMemo(() => new Map(agents.map((a) => [a.id, a.character] as const)), [agents]);
  const accentOf = useMemo(() => new Map(agents.map((a) => [a.id, a.accent] as const)), [agents]);

  // The loop reads every colour from the kit tokens on each frame, the way
  // the terminal reads its theme (design/surfaceTheme.ts), and `theme` in
  // the deps restarts it on a flip so the first frame after the switch is
  // already in the new palette.
  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return;
    let raf = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = () => {
      const s = st.current;
      const dpr = window.devicePixelRatio || 1;
      const W = wrap.clientWidth, H = wrap.clientHeight;
      if (W === 0 || H === 0) { raf = requestAnimationFrame(draw); return; }
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const cs = getComputedStyle(document.documentElement);
      const col = (k: string) => cs.getPropertyValue(k).trim();
      const font = col('--cth-font-ui') || 'Inter, sans-serif';

      // The idle spin is gone (pilot item 9): the graph settles once and then
      // holds still, so it can be read. The only motion this loop makes on its
      // own is easing the zoom buttons toward their target, anchored on the
      // centre; reduced motion turns that glide into a jump.
      const v = s.view;
      if (v.zoom !== v.zoomTarget) {
        const next = reduced ? v.zoomTarget : v.zoom + (v.zoomTarget - v.zoom) * 0.25;
        const k2 = Math.abs(next - v.zoomTarget) < 0.003 ? v.zoomTarget : next;
        const pan = anchorPan(v.panX, v.panY, v.zoom, k2, 0, 0);
        v.panX = pan.panX; v.panY = pan.panY; v.zoom = k2;
      }
      // The ticket ring is wider than the agent ring, so a stage carrying
      // tickets has to pull back or the outer ring hangs off the edge.
      const zoom = zoomFor(W, H, s.graph.nodes.some((n) => n.kind === 'task') ? TASK_REACH : AGENT_REACH) * v.zoom;
      const nodes = s.graph.nodes.map((n) => {
        const p3 = s.pins.get(n.id) ?? s.layout.get(n.id) ?? { x: 0, y: 0, z: 0 };
        const p = project(p3, s.rot, s.tilt, W, H, zoom);
        p.sx += v.panX; p.sy += v.panY;
        return { n, id: n.id, p, r: baseRadius(n) * Math.sqrt(zoom) };
      });
      const byId = new Map(nodes.map((x) => [x.id, x]));
      s.projected = nodes;
      const shown = (id: string) => !s.keep || s.keep.has(id);
      const active = s.sel ?? s.hover;

      // edges
      for (const e of s.graph.edges) {
        const a = byId.get(e.source), b = byId.get(e.target);
        if (!a || !b) continue;
        const vis = shown(a.id) && shown(b.id);
        const dim = Math.min(a.p.s, b.p.s);
        const touches = active !== null && (a.id === active || b.id === active);
        // Four kinds of tie, four readings. Messages stay the dashed accent
        // text they have always been; an agent to a ticket is the solid mint
        // of the ticket glyph; a ticket to the memory that names it is the
        // lemon of the memory glyph, dotted, because it is a citation and not
        // a piece of work.
        ctx.strokeStyle = touches ? col('--cth-accent')
          : e.kind === 'message' ? col('--cth-accent-text')
            : e.kind === 'task' ? col('--cth-mint')
              : e.kind === 'mention' ? col('--cth-lemon')
                : col('--cth-ink-500');
        ctx.globalAlpha = !vis ? 0.05 : touches ? 0.9 : e.kind === 'message' ? 0.18 + dim * 0.35 : e.kind === 'task' ? 0.3 + dim * 0.4 : e.kind === 'mention' ? 0.25 + dim * 0.35 : 0.1 + dim * 0.25;
        ctx.lineWidth = touches ? 1.6 : e.kind === 'message' ? 1 + Math.min(e.weight, 4) * 0.25 : e.kind === 'task' ? 1.1 : 0.8;
        ctx.setLineDash(!touches && e.kind === 'message' ? [3, 4] : !touches && e.kind === 'mention' ? [1.5, 3] : []);
        ctx.beginPath(); ctx.moveTo(a.p.sx, a.p.sy); ctx.lineTo(b.p.sx, b.p.sy); ctx.stroke();
      }
      ctx.setLineDash([]); ctx.globalAlpha = 1;

      // nodes, far to near
      for (const x of [...nodes].sort((p, q) => q.p.z - p.p.z)) {
        const { n, p } = x;
        const r = x.r * p.s;
        const vis = shown(n.id);
        const isActive = active === n.id;
        const hit = n.kind === 'agent' && s.hitAgents.has(n.id);
        ctx.globalAlpha = !vis ? 0.08 : 0.35 + p.s * 0.6;
        if (n.kind === 'agent') {
          const accent = accentOf.get(n.id) ?? 'sky';
          ctx.fillStyle = col(`--cth-${accent}-light`) || col('--cth-cream-200');
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
          const img = portraits.current.get(charOf.get(n.id) as OfficeCharacterName);
          if (img && vis) {
            ctx.save(); ctx.beginPath(); ctx.arc(p.sx, p.sy, r - 1, 0, Math.PI * 2); ctx.clip();
            // Pilot item 15: the offscreen sprite is painted at an integer
            // multiple of its frame; from there DOWN to a node-sized fraction
            // a smooth resample keeps every feature, where nearest neighbour
            // dropped whole sprite rows and mangled the face. The save above
            // scopes both flags to this one blit.
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            const ih = r * 1.9, iw = ih * (PORTRAIT_W / PORTRAIT_H);
            ctx.drawImage(img, p.sx - iw / 2, p.sy - ih / 2 + r * 0.15, iw, ih);
            ctx.restore();
          }
          ctx.lineWidth = isActive ? 2.5 : hit ? 2.5 : 1.5;
          ctx.strokeStyle = isActive || hit ? col('--cth-accent') : col(`--cth-${accent}`);
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.stroke();
          if (hit) { ctx.globalAlpha = 0.35; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(p.sx, p.sy, r + 4, 0, Math.PI * 2); ctx.stroke(); }
        } else if (n.kind === 'task' || n.kind === 'topic') {
          // The other two real kinds. A tinted disc so the node still reads as
          // a node at any depth, then its own drawn mark blitted inside it, the
          // way an agent's sprite is. Never a letter: the mark IS the type.
          const tone = n.kind === 'task' ? 'mint' : 'lemon';
          ctx.fillStyle = col(`--cth-${tone}-light`) || col('--cth-cream-200');
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
          const mark = glyphs.current.get(n.kind === 'task' ? 'ticket' : 'memory');
          if (mark && vis) {
            const side = r * 1.75;
            ctx.drawImage(mark, p.sx - side / 2, p.sy - side / 2, side, side);
          }
          ctx.lineWidth = isActive ? 2.5 : 1.2;
          ctx.strokeStyle = isActive ? col('--cth-accent') : col(`--cth-${tone}`);
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.fillStyle = col('--cth-ink-500');
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
          if (isActive) { ctx.strokeStyle = col('--cth-accent'); ctx.lineWidth = 2; ctx.stroke(); }
        }
        if (vis && ((n.kind !== 'topic' && n.kind !== 'task') || p.s > 0.85 || isActive)) {
          ctx.globalAlpha = Math.min(1, 0.45 + p.s * 0.7);
          ctx.fillStyle = col('--cth-ink-900');
          ctx.font = `${n.kind === 'agent' ? '600 ' : ''}${Math.round(9 + p.s * 3)}px ${font}`;
          ctx.textAlign = 'center';
          const label = n.kind === 'pseudo' && n.id === 'human' ? t('pro.memory.you') : n.label;
          ctx.fillText(label.length > 28 ? label.slice(0, 27) + '…' : label, p.sx, p.sy + r + 12);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    // The wheel is a NATIVE listener because React registers wheel passively
    // on the root, and a passive listener cannot preventDefault the pinch.
    // Plain wheel zooms too: the stage scrolls nothing, so the wheel is free.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = st.current, v = s.view;
      const rect = cv.getBoundingClientRect();
      const k2 = clampZoom(v.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)));
      const pan = anchorPan(v.panX, v.panY, v.zoom, k2, e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2);
      v.panX = pan.panX; v.panY = pan.panY; v.zoom = k2; v.zoomTarget = k2;
    };
    cv.addEventListener('wheel', onWheel, { passive: false });
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); cv.removeEventListener('wheel', onWheel); };
  }, [accentOf, charOf, glyphs, portraits, t, theme]);

  // The zoom buttons ease (the loop animates zoomTarget); Fit snaps the view
  // back to the framing the stage opened with, pins left where they were put.
  const zoomBy = (f: number) => { const v = st.current.view; v.zoomTarget = clampZoom(v.zoomTarget * f); };
  const fitView = () => { const v = st.current.view; v.zoom = 1; v.zoomTarget = 1; v.panX = 0; v.panY = 0; };

  // A press on a NODE starts a node drag (the node follows the pointer and
  // stays pinned where it is dropped); a press on the BACKGROUND starts a pan.
  // Under the 3px threshold either one is a click: a node click selects, a
  // background click clears the selection.
  const onDown = (e: React.MouseEvent) => {
    const s = st.current;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const id = pick(s.projected, x, y);
    if (id) {
      const hit = s.projected.find((n) => n.id === id);
      s.nodeDrag = { id, dx: (hit?.p.sx ?? x) - x, dy: (hit?.p.sy ?? y) - y, sx: x, sy: y, moved: false };
    } else {
      s.panDrag = { x: e.clientX, y: e.clientY, panX: s.view.panX, panY: s.view.panY, moved: false };
    }
  };
  const onMove = (e: React.MouseEvent) => {
    const s = st.current;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    if (s.nodeDrag) {
      const d = s.nodeDrag;
      if (Math.abs(x - d.sx) + Math.abs(y - d.sy) > 3) d.moved = true;
      if (d.moved) {
        const v = s.view;
        const zoom = zoomFor(rect.width, rect.height, s.graph.nodes.some((n) => n.kind === 'task') ? TASK_REACH : AGENT_REACH) * v.zoom;
        const p3 = s.pins.get(d.id) ?? s.layout.get(d.id);
        if (p3) s.pins.set(d.id, moveTo(p3, s.rot, s.tilt, rect.width, rect.height, zoom, x + d.dx - v.panX, y + d.dy - v.panY));
        el.style.cursor = 'grabbing';
      }
      return;
    }
    if (s.panDrag) {
      const dx = e.clientX - s.panDrag.x, dy = e.clientY - s.panDrag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) s.panDrag.moved = true;
      s.view.panX = s.panDrag.panX + dx; s.view.panY = s.panDrag.panY + dy;
      el.style.cursor = 'grabbing';
      return;
    }
    s.hover = pick(s.projected, x, y);
    el.style.cursor = s.hover ? 'pointer' : 'grab';
  };
  const onUp = () => {
    const s = st.current;
    const nd = s.nodeDrag, pd = s.panDrag;
    s.nodeDrag = null; s.panDrag = null;
    if (nd && !nd.moved) onSelect(nd.id !== sel ? nd.id : null);
    else if (pd && !pd.moved) onSelect(null);
  };
  const onLeave = () => { st.current.hover = null; st.current.nodeDrag = null; st.current.panDrag = null; };

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 0, overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 40%, var(--cth-cream-100), var(--cth-cream-50) 70%)' }}>
      <canvas ref={canvasRef} role="img" aria-label={t('pro.memory.graphAria')} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onLeave} style={{ display: 'block', cursor: 'grab' }} />
      {/* The visible half of item 9's zoom: buttons for the person whose mouse
          has no wheel and whose trackpad does not pinch, plus the way back. */}
      <div style={{ position: 'absolute', right: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn size="sm" onClick={() => zoomBy(1.25)} title={t('pro.memory.zoomIn')} style={{ width: 26, padding: 0 }}>+</Btn>
        <Btn size="sm" onClick={() => zoomBy(0.8)} title={t('pro.memory.zoomOut')} style={{ width: 26, padding: 0 }}>-</Btn>
        <Btn size="sm" onClick={fitView} title={t('pro.memory.fitHint')}>{t('pro.memory.fit')}</Btn>
      </div>
      <div style={{ position: 'absolute', left: 12, bottom: 10, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 11, color: 'var(--cth-ink-500)', pointerEvents: 'none' }}>
        <Legend swatch="var(--cth-sky)">{t('pro.memory.legendAgent')}</Legend>
        <Legend swatch="var(--cth-mint)">{t('pro.memory.legendTicket')}</Legend>
        <Legend swatch="var(--cth-lemon)">{t('pro.memory.legendTopic')}</Legend>
        <Legend swatch="var(--cth-ink-500)">{t('pro.memory.you')}</Legend>
        <span>{t('pro.memory.legendHint')}</span>
      </div>
      <div style={{ position: 'absolute', right: 12, bottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, fontSize: 11, color: 'var(--cth-ink-500)', pointerEvents: 'none' }}>
        {graph.topicTotal > graph.topicShown && <span>{t('memoryGraph.topicsShown', { shown: graph.topicShown, total: graph.topicTotal })}</span>}
        {(graph.taskTotal ?? 0) > (graph.taskShown ?? 0) && <span>{t('pro.memory.ticketsShown', { shown: graph.taskShown ?? 0, total: graph.taskTotal ?? 0 })}</span>}
      </div>
      {graph.nodes.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--cth-ink-500)', fontSize: 13, pointerEvents: 'none' }}>{t('pro.memory.empty')}</div>
      )}
    </div>
  );
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: swatch }} />{children}</span>;
}
