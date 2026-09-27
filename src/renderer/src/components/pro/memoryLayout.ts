/**
 * The PRO Memory graph's 3D layout and projection. Pure and deterministic,
 * so test/pro-memory can prove that the same graph lands in the same place
 * every poll (a graph that jumps every five seconds is unreadable) and that
 * every node projects inside the stage.
 *
 * Node and edge model: components/memoryGraph/buildGraph.ts, which gained a
 * third real kind in 0.4.10 (the spec's data model is renderer agnostic,
 * MEMORY_GRAPH_SPEC.md §"Rendering").
 * Layout: agents on an ellipse with a z-wave so rotation shows depth, the
 * two pseudo nodes above and below, TICKETS on a wider outer ellipse of their
 * own, and topics seeded at the centroid of the agents that share them and
 * relaxed for a fixed number of iterations in which ONLY TOPICS MOVE (an agent
 * or a ticket that drifted would break the one shape the eye has learnt).
 * Projection: yaw, then pitch, then a perspective divide; the scale factor is
 * the single depth cue (radius, alpha, label size) exactly as the prototype
 * draws it.
 *
 * WHY TICKETS GET A RING AND NOT THE RELAXATION. A ticket belongs to one agent
 * and is named by a handful of notes, so a centroid seed would pile the whole
 * ledger onto two or three agents. A ring keyed on the ticket's own index is
 * deterministic, spreads the ledger evenly, and leaves the memories free to
 * settle between the people who hold them and the work they came out of.
 */
import type { GraphData, GraphNode } from '../memoryGraph/buildGraph';

export interface P3 { x: number; y: number; z: number }
export type Layout3 = Map<string, P3>;

export const FOCAL = 520;

/** The half width of the agent ellipse, and of the ticket ellipse outside it.
 *  The stage divides by these to decide how far to zoom out, so a graph with
 *  tickets on it is not a graph with its outer ring off the edge. */
export const AGENT_REACH = 300;
export const TASK_REACH = 470;

export function layout3d(graph: GraphData, opts: { iterations?: number } = {}): Layout3 {
  const out: Layout3 = new Map();
  const agents = graph.nodes.filter((n): n is Extract<GraphNode, { kind: 'agent' }> => n.kind === 'agent');
  const topics = graph.nodes.filter((n): n is Extract<GraphNode, { kind: 'topic' }> => n.kind === 'topic');
  const tasks = graph.nodes.filter((n): n is Extract<GraphNode, { kind: 'task' }> => n.kind === 'task');
  const pseudo = graph.nodes.filter((n): n is Extract<GraphNode, { kind: 'pseudo' }> => n.kind === 'pseudo');

  agents.forEach((a, i) => {
    const th = (i / Math.max(1, agents.length)) * Math.PI * 2;
    out.set(a.id, { x: Math.cos(th) * 300, y: Math.sin(th) * 190, z: Math.sin(th * 2 + 1) * 150 });
  });
  // The ticket ring: wider than the agents, started a half step round so a
  // ticket never sits directly behind the person who holds it.
  tasks.forEach((k, i) => {
    const th = ((i + 0.5) / Math.max(1, tasks.length)) * Math.PI * 2;
    out.set(k.id, { x: Math.cos(th) * 470, y: Math.sin(th) * 300, z: Math.cos(th * 2 + 0.6) * 200 });
  });
  for (const p of pseudo) out.set(p.id, p.id === 'human' ? { x: 0, y: -270, z: 40 } : { x: 0, y: 270, z: -40 });

  // topic → what it is tied to. `topic` edges run agent to topic (buildGraph)
  // and `mention` edges run ticket to topic (memoryGraphModel), so the topic is
  // the target of both and a memory settles between the people who hold it and
  // the work that named it.
  const linked = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.kind !== 'topic' && e.kind !== 'mention') continue;
    const fromId = e.source, topicId = e.target;
    const arr = linked.get(topicId) ?? [];
    if (out.has(fromId)) arr.push(fromId);
    linked.set(topicId, arr);
  }

  topics.forEach((t, i) => {
    const owners = (linked.get(t.id) ?? []).map((id) => out.get(id)!).filter(Boolean);
    const cx = owners.length ? owners.reduce((s, p) => s + p.x, 0) / owners.length : 0;
    const cy = owners.length ? owners.reduce((s, p) => s + p.y, 0) / owners.length : 0;
    const j = ((i * 7919) % 360) * Math.PI / 180;
    out.set(t.id, { x: cx * 0.7 + Math.cos(j) * 120, y: cy * 0.7 + Math.sin(j) * 95, z: Math.cos(j * 3) * 170 });
  });

  const iterations = opts.iterations ?? 160;
  const all = graph.nodes.map((n) => n.id);
  for (let it = 0; it < iterations; it++) {
    for (const t of topics) {
      const p = out.get(t.id)!;
      for (const ownerId of linked.get(t.id) ?? []) {
        const o = out.get(ownerId)!;
        p.x += (o.x - p.x) * 0.02; p.y += (o.y - p.y) * 0.02; p.z += (o.z - p.z) * 0.02;
      }
      for (const otherId of all) {
        if (otherId === t.id) continue;
        const o = out.get(otherId)!;
        const isTopic = otherId.startsWith('topic:');
        const min = isTopic ? 95 : 150;
        const dx = p.x - o.x, dy = p.y - o.y, dz = p.z - o.z;
        const d = Math.hypot(dx, dy, dz) || 1;
        if (d < min) { const k = (min - d) / d * 0.5; p.x += dx * k; p.y += dy * k; p.z += dz * k; }
      }
    }
  }
  return out;
}

export interface Projected { sx: number; sy: number; s: number; z: number }

/** The layout is authored in a ~600px world; the stage may be larger or
 *  smaller. One factor, from the stage's shorter side, so the graph fills a
 *  wide screen and still fits a narrow one. `reach` is the half width of the
 *  widest ring on the stage: pass TASK_REACH once tickets are drawn or the
 *  outer ring hangs off the edge. */
export function zoomFor(w: number, h: number, reach: number = AGENT_REACH): number {
  const spread = Math.max(1, reach / AGENT_REACH);
  return Math.max(0.5, Math.min(1.4, Math.min(w / (880 * spread), h / (700 * spread))));
}

/** Yaw about Y (`rot`), pitch about X (`tilt`), then perspective. */
export function project(p: P3, rot: number, tilt: number, w: number, h: number, zoom = 1): Projected {
  const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
  const x = p.x * cr - p.z * sr, z = p.x * sr + p.z * cr;
  const y = p.y * ct - z * st, z2 = p.y * st + z * ct;
  const s = FOCAL / (FOCAL + z2);
  return { sx: w / 2 + x * s * zoom, sy: h / 2 + y * s * zoom, s, z: z2 };
}

/* ── 0.4.11 (pilot item 9): the stage stands still and the person moves ──
 * The layout settles once (layout3d is already deterministic); what moves is
 * the VIEW (zoom, pan) and any NODE the person drags. All three are pure
 * arithmetic here so the tests can prove them without a canvas. */

/** How far the person can zoom, as a factor over the fit zoom. */
export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 4;

export function clampZoom(z: number): number {
  return Number.isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) : 1;
}

/** The pan that keeps the stage point at (ax, ay), measured from the centre,
 *  still while the zoom moves `from` to `to`. Every projected offset from the
 *  centre scales by exactly to/from, so the fix is exact for every node at
 *  once, whatever its depth. */
export function anchorPan(panX: number, panY: number, from: number, to: number, ax: number, ay: number): { panX: number; panY: number } {
  const r = to / from;
  return { panX: ax - (ax - panX) * r, panY: ay - (ay - panY) * r };
}

/** Move a world point so it projects to (sx, sy), holding its depth, so a
 *  dragged node follows the pointer and stays the size it was. This is
 *  project() run backwards with the view-space depth held constant. */
export function moveTo(p: P3, rot: number, tilt: number, w: number, h: number, zoom: number, sx: number, sy: number): P3 {
  const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
  const z1 = p.x * sr + p.z * cr;
  const z2 = p.y * st + z1 * ct;
  const s = FOCAL / (FOCAL + z2);
  const vx = (sx - w / 2) / (s * zoom), vy = (sy - h / 2) / (s * zoom);
  const y = vy * ct + z2 * st, nz1 = z2 * ct - vy * st;
  return { x: vx * cr + nz1 * sr, y, z: nz1 * cr - vx * sr };
}

/** Base radius per node kind, before the depth scale. A ticket carries a drawn
 *  glyph rather than a dot, so it needs a floor big enough to read it. */
export function baseRadius(n: GraphNode): number {
  if (n.kind === 'agent') return (n.isGod ? 18 : 14) + Math.min(n.degree, 10) * 0.6;
  if (n.kind === 'task') return 11 + Math.min(n.weight, 6) * 0.8;
  if (n.kind === 'topic') return 9 + Math.min(n.weight, 8) * 0.9;
  return 9;
}

/** Nearest node under the pointer, within its projected radius (+ slack). */
export function pick(nodes: { id: string; p: Projected; r: number }[], x: number, y: number): string | null {
  let best: string | null = null, bd = Infinity;
  for (const n of nodes) {
    const d = Math.hypot(n.p.sx - x, n.p.sy - y);
    if (d < Math.max(10, n.r * n.p.s + 4) && d < bd) { bd = d; best = n.id; }
  }
  return best;
}

/** Which nodes a "whose memory" choice keeps: the agent, every topic it
 *  shares, every agent on those topics (the prototype's rule), and, since
 *  0.4.10, the tickets it works plus every memory those tickets name. A filter
 *  that dropped the person's own tickets would answer a narrower question than
 *  the one the chip asks. */
export function keepFor(graph: GraphData, agentId: string | null): Set<string> | null {
  if (!agentId) return null;
  const keep = new Set<string>([agentId, 'human', 'broadcast']);
  const topicsOf = new Set<string>();
  for (const e of graph.edges) {
    if (e.kind !== 'topic') continue;
    if (e.source === agentId) topicsOf.add(e.target);
  }
  for (const tId of topicsOf) keep.add(tId);
  for (const e of graph.edges) {
    if (e.kind !== 'topic') continue;
    if (topicsOf.has(e.target)) keep.add(e.source);
  }
  const tasksOf = new Set<string>();
  for (const e of graph.edges) {
    if (e.kind !== 'task') continue;
    if (e.source === agentId) tasksOf.add(e.target);
    if (e.target === agentId) tasksOf.add(e.source);
  }
  for (const kId of tasksOf) keep.add(kId);
  for (const e of graph.edges) {
    if (e.kind !== 'mention') continue;
    if (tasksOf.has(e.source)) keep.add(e.target);
    if (topicsOf.has(e.target)) keep.add(e.source);
  }
  for (const e of graph.edges) {
    if (e.kind !== 'message') continue;
    if (e.source === agentId) keep.add(e.target);
    if (e.target === agentId) keep.add(e.source);
  }
  return keep;
}
