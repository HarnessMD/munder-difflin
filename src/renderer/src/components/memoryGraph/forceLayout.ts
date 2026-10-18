// Tiny deterministic force-directed layout — Fruchterman–Reingold with mild
// centre gravity. No dependency (d3-force isn't in node_modules and the project
// keeps deps lean); for < 100 nodes a fixed-iteration integrator is plenty.
// See MEMORY_GRAPH_SPEC.md §6.
//
// Deterministic: nodes are seeded on a phyllotaxis spiral by index (no Math.random),
// so the graph doesn't reshuffle between polls. Pinned nodes (dragged) stay fixed
// and the rest relax around them.

export interface LayoutNode {
  id: string;
  /** extra centre-pull multiplier (orchestrator reads as the hub) */
  gravityBias?: number;
}
export interface LayoutEdge {
  source: string;
  target: string;
  /** spring strength multiplier (topic edges pull weaker) */
  strength?: number;
}
export interface LayoutOpts {
  width: number;
  height: number;
  /** fixed positions for dragged/pinned nodes */
  pinned?: Record<string, { x: number; y: number }>;
  iterations?: number;
  padding?: number;
}

export type Positions = Map<string, { x: number; y: number }>;

const GOLDEN_ANGLE = 2.399963229728653; // radians

/** Deterministic seed: phyllotaxis spiral centred in the frame. */
function seed(ids: string[], cx: number, cy: number, radius: number): Positions {
  const pos: Positions = new Map();
  const n = Math.max(1, ids.length);
  ids.forEach((id, i) => {
    const r = radius * Math.sqrt((i + 0.5) / n);
    const a = i * GOLDEN_ANGLE;
    pos.set(id, { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  });
  return pos;
}

export function forceLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  opts: LayoutOpts
): Positions {
  const { width, height } = opts;
  const padding = opts.padding ?? 28;
  const iterations = opts.iterations ?? 320;
  const pinned = opts.pinned ?? {};

  const ids = nodes.map((n) => n.id);
  const cx = width / 2;
  const cy = height / 2;
  const usableR = Math.max(40, Math.min(width, height) / 2 - padding);
  const pos = seed(ids, cx, cy, usableR);

  // honour pins from the start
  for (const id of ids) if (pinned[id]) pos.set(id, { ...pinned[id] });

  if (ids.length <= 1) return pos;

  // Fruchterman–Reingold ideal edge length, scaled down so labels have room.
  const area = width * height;
  const k = Math.sqrt(area / ids.length) * 0.55;
  const k2 = k * k;
  const gravity = 0.045;

  const biasById = new Map(nodes.map((n) => [n.id, n.gravityBias ?? 1]));
  const disp = new Map<string, { x: number; y: number }>(ids.map((id) => [id, { x: 0, y: 0 }]));

  let temp = Math.min(width, height) * 0.12;
  const cool = Math.pow(0.02, 1 / iterations); // temp → ~2% of start by the end

  for (let it = 0; it < iterations; it++) {
    for (const id of ids) { const d = disp.get(id)!; d.x = 0; d.y = 0; }

    // repulsion — every pair pushes apart (O(n²), fine at this scale)
    for (let i = 0; i < ids.length; i++) {
      const pi = pos.get(ids[i])!;
      const di = disp.get(ids[i])!;
      for (let j = i + 1; j < ids.length; j++) {
        const pj = pos.get(ids[j])!;
        let dx = pi.x - pj.x;
        let dy = pi.y - pj.y;
        let dist = Math.hypot(dx, dy);
        if (dist < 0.01) { dx = (i - j) * 0.01 + 0.01; dy = 0.01; dist = Math.hypot(dx, dy); }
        const force = k2 / dist;
        const ux = dx / dist;
        const uy = dy / dist;
        di.x += ux * force; di.y += uy * force;
        const dj = disp.get(ids[j])!;
        dj.x -= ux * force; dj.y -= uy * force;
      }
    }

    // attraction — edges pull their endpoints together
    for (const e of edges) {
      const ps = pos.get(e.source);
      const pt = pos.get(e.target);
      if (!ps || !pt) continue;
      const dx = ps.x - pt.x;
      const dy = ps.y - pt.y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const force = (dist * dist) / k * (e.strength ?? 1);
      const ux = dx / dist;
      const uy = dy / dist;
      const ds = disp.get(e.source)!;
      const dt = disp.get(e.target)!;
      ds.x -= ux * force; ds.y -= uy * force;
      dt.x += ux * force; dt.y += uy * force;
    }

    // mild gravity toward centre keeps disconnected nodes on-screen
    for (const id of ids) {
      const p = pos.get(id)!;
      const d = disp.get(id)!;
      const g = gravity * (biasById.get(id) ?? 1);
      d.x += (cx - p.x) * g;
      d.y += (cy - p.y) * g;
    }

    // integrate (skip pinned), clamp step by temperature, keep in frame
    for (const id of ids) {
      if (pinned[id]) { pos.set(id, { ...pinned[id] }); continue; }
      const p = pos.get(id)!;
      const d = disp.get(id)!;
      const len = Math.hypot(d.x, d.y) || 0.01;
      const step = Math.min(len, temp);
      p.x += (d.x / len) * step;
      p.y += (d.y / len) * step;
      p.x = Math.max(padding, Math.min(width - padding, p.x));
      p.y = Math.max(padding, Math.min(height - padding, p.y));
    }

    temp *= cool;
  }

  return pos;
}
