# Memory Graph Visualization — Spec (Phase 1)

**Feature #8** of the Munder Difflin harness roadmap · author: Jim · branch `feature/memory-graph`
**Status:** awaiting orchestrator sign-off. No component code is written yet — this document is the contract for Phase 2.

---

## 1. Goal

Give Michael (orchestrator) a single glance answer to: *who is talking to whom, and what does the hive collectively know?*

The graph is a new **`graph` tab** in the Command Center (`CommandCenterPanel.tsx`) that draws the hive as a network — agents as nodes, the messages between them as edges, and (optionally) the topics each agent's memory file covers as a second layer. It is a read + navigate surface: click a node to jump into that agent's memory; hover to preview without leaving the graph.

It is **not** a live-animated game world (that is the office floor). It is a calm, static-until-you-touch-it data view, refreshed on a poll like the Activity tab.

---

## 2. Data sources

Everything comes from the existing preload bridge — **no new IPC handlers, no new main-process code.** This keeps the feature inside one renderer file and avoids colliding with other agents editing `src/main/index.ts` / `src/preload/index.ts`.

| Source | Signature (already in `src/preload/index.ts`) | Used for |
|---|---|---|
| Roster | `useStore((s) => s.agents)` → `Agent[]` | Agent nodes (id, name, accent, character, status, isOrchestrator) |
| Registry | `window.cth.hiveRegistry()` → `HiveRegistry` | Fallback roster + `orchestratorId` + lastSeen, if store is thin |
| Message log | `window.cth.hiveLog(200)` → `LogEntry[]` | Message edges (`kind:'message'`, `from`, `to`, `act`, `subject`) |
| Per-agent memory | `window.cth.hiveMemory(id)` → `string` (raw markdown) | Topic nodes + agent↔topic edges |

### 2.1 Shapes we rely on

```ts
// Agent (store) — the primary node payload
{ id: string; name: string; accent: AccentColorName; character: OfficeCharacterName;
  status: StatusKind; isOrchestrator?: boolean }

// LogEntry (hiveLog) — loosely typed; we read the 'message' kind only
{ ts?: number; kind?: string; from?: string; to?: string; act?: MessageAct; subject?: string }

// hiveMemory(id) → the literal contents of agents/<id>/memory.md (markdown text)
```

`hiveLog` already drives the Activity tab's `from → to: subject` feed, so the message-edge data is proven to exist in this exact shape.

### 2.2 Resolving `from`/`to` to nodes

Log entries use agent **ids** (and the literal strings `"broadcast"` and `"human"`). Mapping rules:

- id present in roster → that agent node.
- `"broadcast"` → fan the edge from sender to **every** other agent (thin, dashed) — or, if it clutters, collapse to a single edge into a synthetic `broadcast` pseudo-node. **Decision: collapse to a `broadcast` pseudo-node** (square, ink-300, labelled "broadcast") to keep edge count linear.
- `"human"` / `"orchestrator→human"` escalations → a single synthetic `human` node (distinct shape: double-border square, lemon accent).
- Unknown id → skip the edge (defensive; logged to console once).

---

## 3. Node model

```ts
type GraphNode =
  | { kind: 'agent';  id: string; label: string; accent: AccentColorName;
      status: StatusKind; isOrchestrator: boolean; degree: number }
  | { kind: 'topic';  id: string; label: string; weight: number /* # agents mentioning */ }
  | { kind: 'pseudo'; id: 'broadcast' | 'human'; label: string };
```

- **Agent nodes (primary, always on).** Square tile, filled with the agent's `--cth-<accent>` colour, hard 2px ink-900 offset shadow (DESIGN.md neo-brutalist). Orchestrator is larger (1.4×) and gets a double border. Node size scales gently with **degree** (message count) so the busiest agents read as hubs.
- **Topic nodes (secondary, toggleable — default OFF).** Small cream-200 squares with an ink-700 hairline border, VT323 label. Only shown when the "topics" toggle is on, to avoid overwhelming the default view.
- **Pseudo nodes** (`broadcast`, `human`): ink-300 / lemon, visually subdued, never navigable.

---

## 4. Edge model

```ts
type GraphEdge =
  | { kind: 'message'; source: string; target: string; weight: number; lastAct: MessageAct }
  | { kind: 'topic';   source: string /* agentId */; target: string /* topicId */ };
```

### 4.1 Message edges
- One edge per **ordered (from,to) pair**, `weight` = number of messages exchanged (aggregated from the 200-entry log). Thicker line = more traffic (clamped 1–4px).
- Directionality shown with a small arrowhead toward `target` (SVG `marker`). Reciprocal pairs (A→B and B→A) render as one line with arrowheads at both ends.
- Colour by the **most recent** `act` on that pair, using the message-envelope palette already in `MessageEnvelope.tsx` (request/inform/propose/query/agree/refuse/done) so the graph speaks the same visual language as the floor's flying envelopes.

### 4.2 Topic edges (bipartite, agent ↔ topic)
- An edge connects an agent to a topic node when that agent's `memory.md` mentions the topic.
- We deliberately **do not** draw topic↔topic edges. The shared structure (two agents wired to the same topic) already reveals co-occurrence through the layout — adding topic-topic edges would create a hairball. (This is the "topic co-occurrence" requirement, expressed as a bipartite graph rather than a co-occurrence clique — same information, far fewer edges.)

---

## 5. Topic extraction

Memory files are structured markdown (verified against live `agents/*/memory.md`): dated `## <date> — <title>` section headers, `**bold**` key terms, bullet lists. We extract topics cheaply, client-side, with **zero NLP deps**:

1. Collect candidate phrases from each agent's memory text:
   - `## ` / `### ` heading tails (strip leading `YYYY-MM-DD —`).
   - `**bold**` spans.
2. Normalise: lowercase, trim, drop pure dates/numbers, drop stop-phrases, cap length (≤ 40 chars).
3. Count how many **distinct agents** mention each candidate. Keep candidates mentioned by **≥ 2 agents** (shared knowledge is the interesting signal; an agent's solo notes aren't a "hive topic"). This naturally bounds the topic-node count.
4. Cap at the **top N = 24** topics by agent-count to keep the graph legible; surface the cap in the UI ("showing 24 of M topics") — never silently truncate.

This is heuristic, not semantic. **Note:** MemPalace (`window.cth.searchMemory`) is the *semantic* memory; we are intentionally not using it for topic nodes in v1 because it returns ranked snippets for a query, not an enumerable topic set. A v2 could derive topic clusters from MemPalace — listed in §11.

---

## 6. Layout — **force-directed** (chosen)

A spring/charge simulation: edges pull connected nodes together, all nodes repel each other, a mild centring force keeps the whole thing on-screen, and orchestrator gets a small extra gravity toward centre so it reads as the orchestrator hub.

**Why force-directed over the alternatives:**

| Layout | Verdict |
|---|---|
| **Force-directed** ✅ | The relationships are an arbitrary mesh (any agent can message any other; topics wire to multiple agents). Force layout is the only one that makes *clusters* legible — tightly-collaborating agents drift together, isolated agents drift out. It handles both the agent-agent mesh and the bipartite agent-topic layer in one model. Dynamic data (new agents/messages each poll) settles gracefully. |
| Timeline | Rejected. We have timestamps, but the question this tab answers is *structural* (who↔who, who-knows-what), not *temporal*. The Activity tab already serves the chronological view. A timeline also can't express the bipartite topic layer. |
| Radial | Tempting (orchestrator is a natural centre) — but it hard-codes a single hub and flattens agent-agent edges that don't pass through orchestrator. Force-directed gives the same "orchestrator in the middle" read *emergently* (via orchestrator-gravity + orchestrator's high degree) without losing peer-to-peer structure. |

**Implementation:** a tiny hand-rolled simulation (~50 lines: Coulomb repulsion + Hooke spring + centre gravity + velocity damping), run for a fixed number of ticks on data change, then frozen. **No new dependency** — `d3-force` is *not* in `node_modules` (only `commit-graph`, which is git-specific), and the project keeps its dependency list deliberately lean. For < 100 nodes a fixed-iteration integrator is more than adequate and avoids a dep that would need orchestrator's approval. Nodes are also **draggable** (drag pins a node; the sim relaxes the rest around it). Layout seeding is deterministic (seeded by node index, not `Math.random`) so the graph doesn't jump between refreshes.

---

## 7. Rendering — **SVG (React)** (chosen) ⚠️ key decision for sign-off

Render the graph as inline SVG inside the panel: `<line>`/`<polyline>` edges with `<marker>` arrowheads, `<rect>` nodes (square = on-aesthetic), `<text>` labels in VT323/Pixelify. A thin HTML overlay handles the hover tooltip.

**Why SVG over Pixi.js for *this* surface:**

| | SVG (chosen) | Pixi.js |
|---|---|---|
| Scale fit | Perfect for < 100 nodes / < 200 edges (our actual size) | Built for 1000s of sprites — overkill here |
| Interaction | **Native DOM** `onClick`/`onMouseEnter` per node → zero hit-testing code | Manual `eventMode`/hit-area wiring on every object |
| Text labels | Crisp, free, reflowable `<text>` | `Text`/`BitmapText` objects, manual layout, blurry under camera zoom |
| Theming | `--cth-cream/ink` CSS vars used directly | Must convert tokens to `0x` numbers (`hexToNumber`), no live CSS theming |
| Lifecycle | None — React owns the DOM | `Application` create/`Ticker`/`safeDestroy` teardown (see `OfficeFloor.tsx`'s 700+ lines of lifecycle care) |
| Tooltips | Plain HTML overlay | Needs an HTML overlay *anyway* |
| Aesthetic | Square nodes + hard offset shadows + pixel fonts → fully on-brand | Same look achievable, more code |

The office floor uses Pixi because it is a continuously-animating tilemap game world with a moving camera and dozens of walking sprites — the right tool there. The memory graph is a small, mostly-static, interaction-and-text-heavy data view — SVG is the right tool here. SVG does **not** compromise the pixel aesthetic: square `<rect>` nodes, stepped (non-bezier) edges, hard `filter`/duplicate-rect offset shadows, and the VT323/Pixelify fonts keep it visually identical in spirit to the rest of the app.

> **This is the one decision I'd most like orchestrator to confirm.** If hive-wide consistency ("everything visual is Pixi") outweighs the engineering simplicity, I'll switch to Pixi — the data model, layout, and interactions in this spec are renderer-agnostic and unchanged either way. My recommendation is SVG.

---

## 8. Interactions

| Gesture | Behaviour |
|---|---|
| **Click agent node** | Jump to that agent's memory: lift `tab` + a `selectedMemoryAgent` up so `CommandCenterPanel` switches to the `memory` tab with that agent pre-selected in `MemoryTab`. (Small refactor: `MemoryTab` gains an optional controlled `who`/`onWho`; default behaviour unchanged.) |
| **Hover node** | HTML tooltip near cursor: agent → name, status badge, degree, and the **first ~200 chars of their memory** (lazy-fetched & cached per id via `hiveMemory`); topic → label + which agents mention it. |
| **Hover edge** | Tooltip: `from → to`, message count, last act + last subject. |
| **Drag node** | Repositions & pins it; sim relaxes others around it. |
| **Toggle: Topics** | Show/hide the topic layer (default off). |
| **Toggle: Filter by act** | Optional chips to show only e.g. `query`/`refuse` edges (helps spot blockers). v1: nice-to-have, behind the same toggle row. |
| **Refresh** | Auto-poll every 5s (same cadence as Activity tab) + a manual refresh button. Re-runs extraction + a few sim ticks; pinned/dragged nodes stay put. |
| **Empty state** | "No messages yet — the hive is quiet." when the log has no `message` entries. |

Tooltips and the navigate-to-memory hook are the two requirements called out in the dispatch; both are covered above.

---

## 9. Visual design (DESIGN.md tokens)

- Container: `PixelPanel` (`variant="inset"`), same `Section`/`Scroll` primitives already used by the other tabs.
- Canvas background: `--cth-paper-100`; a faint 32px dotted grid (echoes the tile grid) in `--cth-ink-100`.
- Agent node fill: `--cth-<accent>`; border `--cth-ink-900` 2px; offset shadow `2px 2px 0 --cth-ink-900`. Orchestrator: 1.4× size + double border.
- Status: a 1px ring in the `status-<kind>` colour (idle/thinking/working/blocked/success) so liveness reads at a glance.
- Topic node: `--cth-cream-200` fill, `--cth-ink-700` hairline, VT323 label `--cth-ink-700`.
- Edges: message palette per act (mirror `MessageEnvelope.tsx`); topic edges = ink-300 dashed.
- Labels: Pixelify Sans 12–13px for agent names; VT323 for topics/paths. Never bold (DESIGN.md rule — emphasise with colour).
- Legend: a compact key (node kinds, act colours) in a corner, collapsible.

---

## 10. Component architecture (Phase 2 plan)

New files (Phase 2 only — not now):

```
src/renderer/src/components/MemoryGraphPanel.tsx     // the tab body: data load, toggles, tooltip, SVG
src/renderer/src/components/memoryGraph/
    buildGraph.ts     // (Agent[], LogEntry[], Record<id,memoryText>) → { nodes, edges }
    extractTopics.ts  // memory markdown → topic candidates (§5)
    forceLayout.ts    // tiny deterministic force simulation → positions (§6)
```

Wiring into `CommandCenterPanel.tsx` (per shared-file discipline — additive only):
1. Add `'graph'` to the `CCTab` union.
2. Add one `TABS` entry: `{ key: 'graph', label: 'graph', icon: 'mcp' }` (reuse an existing `IconName` — `mcp` reads as a network/node glyph; no new icon needed).
3. Add `{tab === 'graph' && <MemoryGraphPanel orchestratorId={agent.id} onJumpToMemory={...} />}` as a **self-contained block** alongside the other `tab === …` lines. No reordering of existing tabs or unrelated reformatting.

The data-loading logic mirrors `ActivityTab` (poll `hiveLog` on a 5s interval) and `MemoryTab` (`hiveMemory(id)` per agent), so it reuses proven patterns.

---

## 11. Edge cases, performance, non-goals

- **Scale:** caps — top 24 topics, 200-entry log window — keep nodes < ~100 and edges < ~200; SVG handles this with no perceptible cost. Any cap that drops data is surfaced in the UI, never silent.
- **Self-loops** (agent messaging itself, or orchestrator→orchestrator) are dropped.
- **Memory fetch cost:** topic extraction needs every agent's memory text. Fetch lazily and cache by id; only refetch when the topics layer is enabled, so the default (agents-only) view does N=0 memory reads beyond what hover needs.
- **Stability:** deterministic seeding + pinned dragged nodes → the graph doesn't reshuffle on every poll.
- **Worktree caveat:** this runs in the Electron renderer; it cannot be exercised by a full GUI run from the worktree. The Phase 2 bar is a clean `npm run typecheck` + `npm run build` (per dispatch).
- **Non-goals (v1):** time-scrubbing/playback; editing memory from the graph; semantic (MemPalace-derived) topic clustering; persisting layout across app restarts. All candidate v2 follow-ups.

---

## 12. Open questions for orchestrator

1. **Renderer: SVG vs Pixi** (§7) — I recommend SVG; confirm or tell me to use Pixi for hive-wide visual consistency.
2. **Topic layer default** — I propose default **OFF** (agents+messages is the cleaner first impression). OK?
3. **`broadcast`/`human` pseudo-nodes** (§2.2) — acceptable, or prefer fan-out / hide entirely?
4. **`MemoryTab` controlled-prop refactor** (§8) needed for click-to-navigate — confirm a tiny additive change to `MemoryTab`'s signature is fine (it's a shared file).

On sign-off I'll proceed to Phase 2 exactly as scoped in §10.
