/* Bright coded scenes for "Emdash alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its final frame, "?mgstill=<seconds>" on that moment. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const TAN = "#D2B48C", GREY = "#DDD8E3", WHITE = "#fff";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  let uid = 0;
  const nid = (p) => `mg-${p}-${++uid}`;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  /* the six alternatives, in the post's order, with one colour each */
  const NAMES = ["Orca", "Munder Difflin", "Orchestrator.inc", "T3 Code", "Worktrunk", "Claude Code"];
  const COLS = [YEL, BLUE, LIL, SKY, MINT, WHITE];

  const SC = {};

  /* ---- 1. a sticker peels back on a laptop lid ---- */
  SC.stickers = {
    dur: 8, still: 8,
    build(svg, api) {
      const defs = el("defs", {}, svg);
      el("rect", { x: 112, y: 546, width: 576, height: 32, rx: 16, fill: WHITE, stroke: INK, "stroke-width": 3 }, svg);
      const lid = el("g", {}, svg);
      el("rect", { x: 40, y: 22, width: 720, height: 526, rx: 34, fill: SOFT, stroke: INK, "stroke-width": 4 }, lid);
      el("rect", { x: 30, y: 12, width: 740, height: 546, rx: 42, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, lid);
      const W = 300, H = 260, R = 28;
      const make = (fill, lines) => {
        const g = el("g", {}, lid), face = el("g", {}, g);
        el("rect", { width: W, height: H, rx: R, fill, stroke: INK, "stroke-width": 4 }, face);
        lines.forEach(([s, y, a]) => txt(face, W / 2, y, s, Object.assign({ "text-anchor": "middle" }, a)));
        return { g, face };
      };
      const at = (g, cx, cy, r) => g.setAttribute("transform", `translate(${cx} ${cy}) rotate(${r}) translate(${-W / 2} ${-H / 2})`);
      const under = make(LIL, [["Emdash Classic", 124, { "font-family": MONO, "font-size": 30, "font-weight": 700 }], ["Fixes only", 172, { "font-size": 30, "font-weight": 600 }]]);
      const top = make(YEL, [["Emdash", 150, { "font-family": MONO, "font-size": 58, "font-weight": 700 }]]);
      const next = make(MINT, [["Emdash 2.0", 124, { "font-family": MONO, "font-size": 38, "font-weight": 700 }], ["Early access", 174, { "font-size": 30, "font-weight": 600 }]]);
      const fly = el("g", {}, lid); fly.appendChild(top.g); lid.appendChild(next.g);
      at(under.g, 230, 262, -5); at(top.g, 230, 262, -5);
      /* the fold line runs across the corner; the part past it flips over as the white back of the sticker */
      const hyp = Math.hypot(W, H), nx = W / hyp, ny = H / hyp;
      const BOX = [[-8, -8], [W + 8, -8], [W + 8, H + 8], [-8, H + 8]];
      const s0 = (W + 8) * nx + (H + 8) * ny + 1;
      const half = (keep, s) => {
        const out = [], f = (q) => keep * (q[0] * nx + q[1] * ny - s);
        BOX.forEach((a, i) => {
          const b = BOX[(i + 1) % 4], fa = f(a), fb = f(b);
          if (fa <= 0) out.push(a);
          if ((fa <= 0) !== (fb <= 0)) { const k = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
        });
        return out.map((p) => p[0].toFixed(2) + "," + p[1].toFixed(2)).join(" ");
      };
      const cs = nid("stick"), cf = nid("flap");
      const polyS = el("polygon", {}, el("clipPath", { id: cs }, defs)), polyF = el("polygon", {}, el("clipPath", { id: cf }, defs));
      top.face.setAttribute("clip-path", `url(#${cs})`);
      const lift = el("g", {}, top.g);
      const flap = el("rect", { width: W, height: H, rx: R, fill: WHITE, stroke: INK, "stroke-width": 4, "clip-path": `url(#${cf})` }, lift);
      button(lid, "Peel the top sticker again", () => api.seek(0));
      return (t) => {
        const s = s0 + (0.4 * s0 - s0) * io(seg(t, 0.6, 2.4)), f = io(seg(t, 2.5, 3.2));
        polyS.setAttribute("points", half(1, s)); polyF.setAttribute("points", half(-1, s));
        flap.setAttribute("transform", `matrix(${1 - 2 * nx * nx} ${-2 * nx * ny} ${-2 * nx * ny} ${1 - 2 * ny * ny} ${2 * s * nx} ${2 * s * ny})`);
        fly.setAttribute("transform", `translate(${-150 * f} ${-260 * f}) rotate(${-14 * f} 230 262)`); fly.setAttribute("opacity", 1 - seg(t, 2.8, 3.2));
        const k = oc(seg(t, 3.4, 4.3));
        at(next.g, 990 - 418 * k, 330, 16 - 12 * k); next.g.setAttribute("opacity", t < 3.4 ? 0 : 1);
      };
    },
  };

  /* ---- 2. six marbles roll down a wall run into six labelled grooves ---- */
  SC.marbles = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const r = 30, REST = 18, HALF = 24;
      const runs = [{ a: [40, 96], b: [716, 166], gx: [140, 370, 600] }, { a: [776, 384], b: [34, 512], gx: [600, 384, 168] }];
      runs.forEach((R) => {
        const dx = R.b[0] - R.a[0], dy = R.b[1] - R.a[1], L = Math.hypot(dx, dy);
        R.u = [dx / L, dy / L]; R.n = R.u[0] > 0 ? [R.u[1], -R.u[0]] : [-R.u[1], R.u[0]];
        R.y = (x) => R.a[1] + ((x - R.a[0]) * dy) / dx;
      });
      /* boards with notches */
      runs.forEach((R) => {
        let d = `M${R.a[0]} ${R.a[1]}`;
        R.gx.forEach((x) => { const y = R.y(x); d += ` L${x - R.u[0] * HALF} ${y - R.u[1] * HALF} A30 30 0 0 ${R.u[0] > 0 ? 0 : 1} ${x + R.u[0] * HALF} ${y + R.u[1] * HALF}`; });
        d += ` L${R.b[0]} ${R.b[1]} L${R.b[0]} ${R.b[1] + 26} L${R.a[0]} ${R.a[1] + 26} Z`;
        el("path", { d, fill: WHITE, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, svg);
        el("path", { d: `M${R.a[0] + 10 * Math.sign(R.u[0])} ${R.a[1] + 19 + 10 * R.u[1]} L${R.b[0] - 10 * Math.sign(R.u[0])} ${R.b[1] + 19 - 10 * R.u[1]}`, stroke: TAN, "stroke-width": 2.5, "stroke-dasharray": "70 16 34 20", "stroke-linecap": "round" }, svg);
      });
      el("rect", { x: 778, y: 316, width: 14, height: 94, rx: 5, fill: WHITE, stroke: INK, "stroke-width": 3 }, svg);
      /* labels hang under each groove */
      const grooves = [];
      runs.forEach((R) => R.gx.forEach((x) => grooves.push({ R, s: [x, R.y(x)] })));
      grooves.forEach((g, i) => txt(svg, g.s[0], g.s[1] + 64, NAMES[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 }));
      /* the path a marble centre follows */
      const [R1, R2] = runs, off = (R, p) => [p[0] + R.n[0] * r, p[1] + R.n[1] * r];
      const c0 = off(R1, R1.a), c1 = off(R1, R1.b), land = off(R2, [740, R2.y(740)]), c2 = off(R2, R2.b);
      const path = el("path", { d: `M${c0} L${c1} Q${c1[0] + 22} ${c1[1] + 2} ${land} L${c2}`, fill: "none", stroke: "none" }, svg);
      const LEN = path.getTotalLength(), P = (d) => path.getPointAtLength(cl(d, 0, LEN));
      const D = grooves.map((g) => { const c = off(g.R, g.s); let best = 0, bd = 1e9; for (let d = 0; d <= LEN; d += 1) { const p = P(d), q = (p.x - c[0]) ** 2 + (p.y - c[1]) ** 2; if (q < bd) { bd = q; best = d; } } return best; });
      const RESTC = grooves.map((g) => [g.s[0] + g.R.n[0] * REST, g.s[1] + g.R.n[1] * REST]);
      const DMAX = Math.max(...D), x0 = c0[0];
      const T = (i) => 0.55 + 1.05 * Math.sqrt(D[i] / DMAX), DROP = 0.32, SETTLE = 0.45;
      const start = (i) => 0.3 + (5 - i) * 1.0;
      const lifts = [], LIFT = 0.85;
      let pinned = false;
      const marbles = COLS.map((c, i) => {
        const g = el("g", {}, svg);
        el("circle", { r: 42, fill: WHITE, "fill-opacity": 0 }, g);
        el("circle", { r: 39, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, g);
        el("circle", { r, fill: c, stroke: INK, "stroke-width": 3.5 }, g);
        const spin = el("g", {}, g);
        el("path", { d: "M-18 6 C-9 -12 8 16 19 -5", stroke: c === WHITE ? SKY : WHITE, "stroke-width": 5.5, fill: "none", "stroke-linecap": "round" }, spin);
        el("ellipse", { cx: -11, cy: -12, rx: 8, ry: 5, fill: WHITE, transform: "rotate(-35 -11 -12)" }, g);
        button(g, `${NAMES[i]}: roll this marble again`, () => { pinned = true; lifts[i] = api.now(); api.poke(); });
        return { g, spin };
      });
      const up = (d) => { const a = P(d - 1), b = P(d + 1), tx = b.x - a.x, ty = b.y - a.y, m = Math.hypot(tx, ty) || 1; let n = [ty / m, -tx / m]; if (n[1] > 0) n = [-n[0], -n[1]]; return n; };
      const roll = (i, u, hop) => {
        if (u < 0) return null;
        if (u < DROP) { const p = P(0), k = u / DROP; return [p.x, p.y - 36 * (1 - k * k), 0, cl(u / 0.08)]; }
        const v = u - DROP, tr = T(i);
        let d, sink = 0;
        if (v < tr) { const k = v / tr; d = D[i] * (k * k + io(k)) / 2; }
        else { const w = seg(v - tr, 0, SETTLE); d = D[i] + 7 * Math.sin(w * Math.PI * 2) * (1 - w); sink = ob(cl(w * 1.6)); }
        const p = P(d), n = up(d);
        let h = 0;
        if (hop) D.forEach((dj, j) => { if (j !== i && lifts[j] == null) { const x = d - dj; if (Math.abs(x) < 62) h = Math.max(h, Math.sqrt(62 * 62 - x * x) - (r - REST)); } });
        const lift = h - (r - REST) * sink;
        return [p.x + n[0] * lift, p.y + n[1] * lift, ((p.x - x0) / r) * 57.3, 1];
      };
      const rest = (i) => [RESTC[i][0], RESTC[i][1], ((P(D[i]).x - x0) / r) * 57.3, 1];
      const done = (i) => DROP + T(i) + SETTLE;
      return (t, now) => {
        let busy = false;
        marbles.forEach((m, i) => {
          let s = null;
          if (lifts[i] != null) {
            const u = now - lifts[i];
            if (u >= LIFT + done(i)) lifts[i] = null;
            else if (u < LIFT) {
              const a = rest(i), b = [P(0).x, P(0).y - 36], k = io(u / LIFT), cx = (a[0] + b[0]) / 2, cy = Math.max(-30, Math.min(a[1], b[1]) - 150);
              s = [(1 - k) ** 2 * a[0] + 2 * (1 - k) * k * cx + k * k * b[0], (1 - k) ** 2 * a[1] + 2 * (1 - k) * k * cy + k * k * b[1], a[2] * (1 - k), 1];
            } else s = roll(i, u - LIFT, true);
            if (lifts[i] != null) busy = true;
          }
          if (!s) s = pinned ? rest(i) : t - start(i) >= done(i) ? rest(i) : roll(i, t - start(i), false);
          if (!s) { m.g.setAttribute("opacity", 0); return; }
          tf(m.g, s[0], s[1]); m.spin.setAttribute("transform", `rotate(${s[2]})`); m.g.setAttribute("opacity", s[3]);
        });
        if (pinned && !busy) api.rest();
      };
    },
  };

  /* ---- 3. a jug fills two cells of an ice cube tray ---- */
  SC.icetray = {
    dur: 10, still: 10,
    build(svg, api) {
      el("path", { d: "M258 0 V36", stroke: INK, "stroke-width": 2.5 }, svg);
      el("polygon", { points: "232,42 262,10 568,10 568,74 262,74", fill: YEL, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, svg);
      el("circle", { cx: 258, cy: 42, r: 7, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 418, 51, "Claude Code worktree", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      const defs = el("defs", {}, svg);
      const tray = el("g", {}, svg);
      el("rect", { x: 38, y: 316, width: 724, height: 240, rx: 32, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, tray);
      const WELLS = [[82, 390], [410, 718]], TOP = 330, BOT = 520, FULL = 354;
      const well = ([a, b]) => `M${a} ${TOP} V${BOT - 20} Q${a} ${BOT} ${a + 20} ${BOT} H${b - 20} Q${b} ${BOT} ${b} ${BOT - 20} V${TOP} Z`;
      const water = WELLS.map((w) => {
        const id = nid("well"); el("path", { d: well(w) }, el("clipPath", { id }, defs));
        const g = el("g", { "clip-path": `url(#${id})` }, tray);
        el("rect", { x: w[0], y: TOP - 40, width: w[1] - w[0], height: BOT - TOP + 60, fill: WHITE }, g);
        const body = el("rect", { x: w[0] - 4, width: w[1] - w[0] + 8, height: 300, fill: SKY }, g);
        const line = el("path", { stroke: INK, "stroke-width": 3 }, g);
        return { body, line, w };
      });
      const [a1, b1] = WELLS[0], [a2, b2] = WELLS[1];
      el("path", { d: `M50 352 Q50 ${TOP} 72 ${TOP} H${a1} V${BOT - 20} Q${a1} ${BOT} ${a1 + 20} ${BOT} H${b1 - 20} Q${b1} ${BOT} ${b1} ${BOT - 20} V${TOP} H${a2} V${BOT - 20} Q${a2} ${BOT} ${a2 + 20} ${BOT} H${b2 - 20} Q${b2} ${BOT} ${b2} ${BOT - 20} V${TOP} H728 Q750 ${TOP} 750 352 V520 Q750 542 728 542 H72 Q50 542 50 520 Z`, fill: LIL, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, tray);
      txt(svg, (a1 + b1) / 2, 588, "Session one", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      txt(svg, (a2 + b2) / 2, 588, "Session two", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      const SY = 150;
      const streamI = el("path", { stroke: INK, "stroke-width": 17, "stroke-linecap": "round", fill: "none" }, svg);
      const streamO = el("path", { stroke: SKY, "stroke-width": 10, "stroke-linecap": "round", fill: "none" }, svg);
      const drops = [0, 1].map(() => el("circle", { r: 6, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg));
      const move = el("g", {}, svg), rot = el("g", {}, move);
      el("path", { d: "M126 42 C182 42 182 128 122 124", stroke: INK, "stroke-width": 18, fill: "none", "stroke-linecap": "round" }, rot);
      el("path", { d: "M126 42 C182 42 182 128 122 124", stroke: BLUE, "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, rot);
      el("path", { d: "M0 0 L22 10 H130 L124 150 Q123 160 113 160 H33 Q23 160 22 150 L16 34 Z", fill: BLUE, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, rot);
      el("path", { d: "M34 40 V128", stroke: WHITE, "stroke-width": 7, "stroke-linecap": "round", opacity: 0.8 }, rot);
      const X = WELLS.map(([a, b]) => (a + b) / 2), POUR = [[1.2, 3.4], [4.8, 7.0]];
      button(tray, "Empty the tray and fill it again", () => api.seek(0));
      return (t) => {
        const drain = 1 - io(seg(t, 0.15, 0.75));
        tray.setAttribute("transform", `rotate(${Math.sin(seg(t, 0.1, 0.8) * Math.PI * 3) * 1.6 * (1 - seg(t, 0.1, 0.8))} 400 440)`);
        const lv = POUR.map(([p0, p1]) => (t < 1 ? drain : seg(t, p0 + 0.15, p1 + 0.1)));
        water.forEach((w, i) => {
          const y = BOT - lv[i] * (BOT - FULL);
          w.body.setAttribute("y", y); w.line.setAttribute("d", `M${w.w[0]} ${y} H${w.w[1]}`); w.line.setAttribute("opacity", lv[i] > 0.02 ? 1 : 0);
        });
        const MID = 316, sx = MID + (X[0] - MID) * io(seg(t, 0.1, 0.9)) + (X[1] - X[0]) * io(seg(t, 3.7, 4.5)) + (MID - X[1]) * io(seg(t, 7.3, 8.1));
        const ang = -34 * (io(seg(t, 0.9, 1.3)) - io(seg(t, 3.3, 3.7)) + io(seg(t, 4.5, 4.9)) - io(seg(t, 6.9, 7.3)));
        tf(move, sx, SY); rot.setAttribute("transform", `rotate(${ang})`);
        let on = false;
        POUR.forEach(([p0, p1], i) => {
          const hd = oc(seg(t, p0, p0 + 0.2)), tl = io(seg(t, p1, p1 + 0.2));
          if (hd <= tl) return;
          on = true;
          const wy = BOT - lv[i] * (BOT - FULL), y0 = SY + 10 + (wy - SY - 10) * tl, y1 = SY + 10 + (wy - SY - 10) * hd;
          const d = `M${X[i]} ${y0} V${y1}`;
          streamI.setAttribute("d", d); streamO.setAttribute("d", d);
          drops.forEach((n, j) => { const f = (t * 2.4 + j * 0.5) % 1, side = j ? 1 : -1; n.setAttribute("cx", X[i] + side * (14 + 30 * f)); n.setAttribute("cy", wy - 6 - 34 * Math.sin(Math.PI * f)); n.setAttribute("opacity", hd >= 1 && tl <= 0 ? 1 : 0); });
        });
        streamI.setAttribute("opacity", on ? 1 : 0); streamO.setAttribute("opacity", on ? 1 : 0);
        if (!on) drops.forEach((n) => n.setAttribute("opacity", 0));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.4, still: 3.4,
    build(svg) {
      el("rect", { x: 64, y: 58, width: 176, height: 46, rx: 23, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 152, 89, "Alternatives", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      txt(svg, 62, 200, "Emdash", { "font-size": 78, "font-weight": 700 });
      txt(svg, 62, 286, "alternatives", { "font-size": 78, "font-weight": 700 });
      el("path", { d: "M66 314 H440", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 376, "6 tools for parallel coding agents", { "font-size": 27, "font-weight": 500, fill: MUTE });
      el("rect", { x: 64, y: 436, width: 248, height: 46, rx: 23, fill: SOFT }, svg);
      txt(svg, 188, 466, "Checked 6 Nov 2026", { "text-anchor": "middle", "font-size": 21, "font-weight": 600, fill: MUTE });
      el("rect", { x: 628, y: 50, width: 282, height: 58, rx: 14, fill: GREY, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 769, 88, "Emdash", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      el("path", { d: "M658 108 V465", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const tiles = NAMES.map((n, i) => {
        const y = 132 + i * 62, arm = el("path", { d: `M658 ${y + 23} H688`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
        const g = el("g", {}, svg);
        el("rect", { x: 688, y, width: 236, height: 46, rx: 12, fill: COLS[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 704, y + 30, n, { "font-family": MONO, "font-size": 19, "font-weight": 700 });
        return { g, arm };
      });
      return (t) => tiles.forEach(({ g, arm }, i) => {
        const k = seg(t, 0.4 + i * 0.3, 1.0 + i * 0.3);
        g.setAttribute("transform", `translate(${280 * (1 - ob(k))} 0)`); g.setAttribute("opacity", cl(k * 3));
        arm.setAttribute("opacity", cl(k * 3));
      });
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, rest: () => { held = true; } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
