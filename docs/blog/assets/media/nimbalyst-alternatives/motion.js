/* Bright coded scenes for "Nimbalyst alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  // shrink a text node to a width, so no label ever overflows its shape
  const fit = (n, w) => { const l = n.getComputedTextLength(); if (l > w) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * w) / l); return n; };
  // the focus ring: hidden until keyboard focus (see motion.css)
  const ring = (p, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "6 7", class: "mg-ring" }, a), p);

  const SC = {};

  /* ---- 1. the session kanban as a whiteboard; tap adds a note to Backlog ---- */
  SC.whiteboard = {
    dur: 10, still: 9.2,
    build(svg, api) {
      const COLS = ["Backlog", "Planning", "Implementing", "Complete"], CX = [130, 310, 490, 670], SY = (k) => 149 + 74 * k;
      const board = el("g", {}, svg);
      ring(board, { x: 26, y: 26, width: 748, height: 522, rx: 22 });
      el("rect", { x: 40, y: 40, width: 720, height: 470, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 4 }, board);
      [220, 400, 580].forEach((x) => el("path", { d: `M${x} 58 V492`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, board));
      el("path", { d: "M58 106 H742", stroke: INK, "stroke-width": 2 }, board);
      COLS.forEach((c, i) => fit(txt(board, CX[i], 86, c, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), 164));
      el("rect", { x: 150, y: 504, width: 500, height: 28, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, board);
      [[440, BLUE], [530, LIL]].forEach(([x, c]) => { el("rect", { x, y: 511, width: 74, height: 14, rx: 7, fill: c, stroke: INK, "stroke-width": 2 }, board); el("path", { d: `M${x + 56} 511 V525`, stroke: INK, "stroke-width": 2 }, board); });
      const layer = el("g", {}, board);
      const note = () => {
        const g = el("g", { opacity: 0 }, layer);
        el("rect", { x: -70, y: -31, width: 140, height: 62, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -20, y: -37, width: 40, height: 12, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, g);
        txt(g, 0, 8, "Session", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        const tick = el("g", { opacity: 0 }, g);
        el("circle", { cx: 57, cy: -24, r: 13, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tick);
        el("path", { d: "M51 -24 l4.5 4.5 l8 -9", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
        return { g, tick };
      };
      // board states: each move takes one note one column to the right
      const S = [[[0, 1, 2], [3], [4], []]];
      const MV = [[4, 2, 3], [3, 1, 2], [0, 0, 1], [3, 2, 3], [0, 1, 2], [1, 0, 1]];
      MV.forEach(([n, a, b]) => { const s = S[S.length - 1].map((c) => c.slice()); s[a].splice(s[a].indexOf(n), 1); s[b].push(n); S.push(s); });
      const T0 = 0.7, STEP = 1.2, MD = 0.8;
      const at = (s, n) => { for (let c = 0; c < 4; c++) { const k = s[c].indexOf(n); if (k >= 0) return [CX[c], SY(k)]; } return [0, 0]; };
      const notes = [0, 1, 2, 3, 4].map(note);
      const done = notes.map((_, n) => { const i = MV.findIndex(([m, , b]) => m === n && b === 3); return i < 0 ? 99 : T0 + i * STEP + MD; });
      const extra = [note(), note()], added = [];
      let lastT = 0;
      button(board, "Add a new note to Backlog", () => { const now = api.now(); if (added.length < extra.length) added.push(now); else added[added.length - 1] = now; api.poke(); });
      return (t, now) => {
        if (t < lastT - 1) added.length = 0;
        lastT = t;
        const i = MV.filter((_, j) => t >= T0 + j * STEP).length;
        const A = S[Math.max(0, i - 1)], B = S[i], k = i === 0 ? 0 : io(seg(t, T0 + (i - 1) * STEP, T0 + (i - 1) * STEP + MD));
        const fade = seg(t, 0, 0.35) * (1 - seg(t, 9.5, 10));
        notes.forEach((nt, n) => {
          const [x0, y0] = at(i === 0 ? B : A, n), [x1, y1] = at(B, n), mov = i > 0 && MV[i - 1][0] === n && k < 1, lift = mov ? Math.sin(Math.PI * k) : 0;
          if (mov && layer.lastChild !== nt.g) layer.appendChild(nt.g);
          tf(nt.g, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - 10 * lift, 1 + 0.08 * lift, 4 * lift);
          nt.g.setAttribute("opacity", fade);
          nt.tick.setAttribute("opacity", t >= done[n] ? 1 : 0);
          nt.tick.setAttribute("transform", `translate(57 -24) scale(${Math.max(0.001, ob(seg(t, done[n], done[n] + 0.4)))}) translate(-57 24)`);
        });
        const base = (i === 0 ? B : A)[0].length + (B[0].length - (i === 0 ? B : A)[0].length) * k;
        extra.forEach((e, n) => {
          const on = n < added.length, p = on ? ob(seg(now - added[n], 0, 0.45)) : 0;
          tf(e.g, CX[0], SY(base + n), Math.max(0.001, p)); e.g.setAttribute("opacity", on ? fade : 0);
        });
      };
    },
  };

  /* ---- 2. a conveyor of task cards, a sorting arm and a tray; tap the belt to send a card ---- */
  SC.conveyor = {
    dur: 9.5, still: 8.4,
    build(svg, api) {
      const sc = this, BASE = 9.5, V = 240, DX = [170, 330, 490], BY = 200, DY = 342, END = 586, GAP = 1.2;
      el("path", { d: "M60 92 H640", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      [60, 640].forEach((x) => el("rect", { x: x - 7, y: 80, width: 14, height: 24, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      DX.forEach((x) => { el("circle", { cx: x, cy: 414, r: 20, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg); el("rect", { x: x - 72, y: 290, width: 144, height: 104, rx: 10, fill: LIL, stroke: INK, "stroke-width": 3 }, svg); });
      el("rect", { x: 652, y: 156, width: 132, height: 92, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 662, y: 166, width: 112, height: 72, rx: 8, fill: "none", stroke: INK, "stroke-width": 2 }, svg);
      fit(txt(svg, 718, 284, "Needs a human", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 }), 134);
      const belt = el("g", {}, svg);
      ring(belt, { x: 6, y: 144, width: 632, height: 112, rx: 20 });
      for (let x = 54; x < 620; x += 60) [151, 239].forEach((y) => el("rect", { x: x - 4, y, width: 8, height: 10, rx: 2, fill: INK }, belt));
      el("rect", { x: -20, y: 160, width: 644, height: 80, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, belt);
      const marks = Array.from({ length: 12 }, () => el("path", { d: "M-5 182 l10 18 l-10 18", stroke: MUTE, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, belt));
      button(belt, "Send another card along the belt", () => add());
      const layer = el("g", { "pointer-events": "none" }, svg);
      const mk = () => { const g = el("g", { opacity: 0 }, layer); el("rect", { x: -38, y: -28, width: 76, height: 56, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); el("path", { d: "M-26 -12 H20 M-26 0 H26 M-26 12 H6", stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round" }, g); return g; };
      const baseCards = [[0.3, 1], [2.4, 0], [3.5, -1], [4.4, 2]].map(([s, d]) => ({ g: mk(), s, d })); // d = desk, -1 = the tray
      const pool = [mk(), mk(), mk()];
      let cards = baseCards.slice(), ds = [], used = 0, lastT = 0;
      const arm = el("g", { "pointer-events": "none" }, svg);
      const rod = el("path", { stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, arm);
      const plate = el("rect", { x: -46, width: 92, height: 12, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 3 }, arm);
      el("rect", { x: -82, y: 68, width: 164, height: 48, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, arm);
      fit(txt(arm, 0, 99, "Routes tasks", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), 146);
      // the arm serves cards in arrival order; a plan is valid only if the arm is always there in time
      const tr = (a, b) => (a === b ? 0 : Math.abs(a - b) / 900 + 0.12);
      const plan = (list) => {
        list.forEach((c) => { c.tx = c.d < 0 ? END : DX[c.d]; c.p = c.s + (c.tx + 40) / V; });
        const q = list.filter((c) => c.d >= 0).sort((a, b) => a.p - b.p), n = [0, 0, 0];
        let free = 0, ax = DX[1], ok = true;
        q.forEach((c) => { c.from = ax; c.mv = free; c.mvEnd = free + tr(ax, c.tx); if (c.mvEnd + 0.15 > c.p) ok = false; c.slot = n[c.d]++; free = c.p + 0.85; ax = c.tx; });
        ds = q; return ok;
      };
      const end = () => Math.max(...cards.map((c) => c.p + (c.d < 0 ? 0.8 : 0.85)));
      const add = () => {
        if (used < pool.length) {
          const t0 = lastT;
          for (let s = t0 + 0.05; s < t0 + 8; s += 0.05) {
            if (cards.some((c) => Math.abs(c.s - s) < GAP)) continue;
            const cnt = [0, 1, 2].map((d) => cards.filter((c) => c.d === d).length);
            for (const d of [0, 1, 2].sort((a, b) => cnt[a] - cnt[b] || a - b)) {
              const c = { g: pool[used], s, d };
              if (plan(cards.concat(c))) { cards.push(c); used++; plan(cards); sc.dur = Math.max(BASE, end() + 1.9); api.seek(t0); return; }
            }
          }
          plan(cards);
        }
        api.poke();
      };
      plan(cards);
      return (t) => {
        if (t < lastT - 0.5 && used) { cards = baseCards.slice(); used = 0; pool.forEach((g) => g.setAttribute("opacity", 0)); plan(cards); sc.dur = BASE; lastT = t; api.seek(t); return; }
        lastT = t;
        const fade = 1 - seg(t, sc.dur - 0.6, sc.dur);
        marks.forEach((m, i) => { const x = ((i * 56 + t * V) % 672) - 30; m.setAttribute("transform", `translate(${x} 0)`); m.setAttribute("opacity", x > 6 && x < 604 ? 0.5 : 0); });
        cards.forEach((c) => {
          if (t < c.s) { c.g.setAttribute("opacity", 0); return; }
          let x = Math.min(c.tx, -40 + V * (t - c.s)), y = BY, s = 1, r = 0;
          if (t >= c.p && c.d < 0) { const k = io(seg(t, c.p, c.p + 0.8)), h = Math.sin(Math.PI * k); x = END + (718 - END) * k; y = BY + 2 * k - 56 * h; s = 1 + 0.25 * h; r = -6 * h; }
          else if (t >= c.p) { const k = io(seg(t, c.p, c.p + 0.55)); x = c.tx + 10 * c.slot * k; y = BY + (DY - BY) * k - 8 * c.slot * k; r = [-3, 4, -5][c.slot % 3] * k; }
          tf(c.g, x, y, s, r); c.g.setAttribute("opacity", fade);
        });
        let ax = DX[1], py = 134;
        ds.forEach((c) => {
          if (t >= c.mv) ax = c.mvEnd > c.mv ? c.from + (c.tx - c.from) * io(seg(t, c.mv, c.mvEnd)) : c.tx;
          if (t >= c.p - 0.15 && t <= c.p + 0.85) py = t < c.p ? 134 + 26 * seg(t, c.p - 0.15, c.p) : t < c.p + 0.55 ? 160 + 142 * io(seg(t, c.p, c.p + 0.55)) : 302 - 168 * io(seg(t, c.p + 0.55, c.p + 0.85));
        });
        tf(arm, ax, 0); rod.setAttribute("d", `M0 116 V${py + 2}`); plate.setAttribute("y", py);
      };
    },
  };

  /* ---- 3. a quilt of the alternatives; a needle runs a blue thread round each patch ---- */
  SC.quilt = {
    dur: 10.8, still: 9.6,
    build(svg, api) {
      const P = 1.5, X0 = 52, Y0 = 68, S = 232, IN = 10, R = 8;
      const LAB = [["Lead agent:", "Orca"], ["Team of agents:", "Munder Difflin"], ["Phone:", "T3 Code"], ["Mac and Linear:", "Paradev"], ["Any OS:", "Emdash Classic"], ["Editors:", "Nimbalyst"]];
      const COL = [YEL, BLUE, LIL, MINT, SKY, YEL];
      el("rect", { x: X0 - 14, y: Y0 - 14, width: 3 * S + 28, height: 2 * S + 28, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: X0 - 7, y: Y0 - 7, width: 3 * S + 14, height: 2 * S + 14, rx: 14, fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "6 6" }, svg);
      const threads = [], starts = [];
      LAB.forEach(([a, b], i) => {
        const x = X0 + (i % 3) * S, y = Y0 + Math.floor(i / 3) * S, g = el("g", {}, svg);
        el("rect", { x, y, width: S, height: S, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: x + 10, y: y + 10, width: S - 20, height: S - 20, rx: 8, fill: "none", stroke: INK, "stroke-width": 1.6, "stroke-dasharray": "7 6" }, g);
        ring(g, { x: x + 4, y: y + 4, width: S - 8, height: S - 8, rx: 6, "stroke-dasharray": "none", "stroke-width": 4 });
        fit(txt(g, x + S / 2, y + S / 2 - 6, a, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), 172);
        fit(txt(g, x + S / 2, y + S / 2 + 28, b, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 }), 172);
        const l = x + IN, tp = y + IN, rr = x + S - IN, bt = y + S - IN;
        const d = `M${l + R} ${tp} H${rr - R} Q${rr} ${tp} ${rr} ${tp + R} V${bt - R} Q${rr} ${bt} ${rr - R} ${bt} H${l + R} Q${l} ${bt} ${l} ${bt - R} V${tp + R} Q${l} ${tp} ${l + R} ${tp}`;
        const under = el("path", { d, fill: "none", stroke: INK, "stroke-width": 7, "stroke-linecap": "round", opacity: 0 }, svg);
        const th = el("path", { d, fill: "none", stroke: BLUE, "stroke-width": 4, "stroke-linecap": "round", opacity: 0 }, svg);
        threads.push({ under, th, L: th.getTotalLength() }); starts.push([l + R, tp]);
        button(g, `${a} ${b}`, () => api.seek(i * P + 0.001));
      });
      const needle = el("g", { "pointer-events": "none" }, svg);
      el("path", { d: "M34 0 L-4 -4.5 H-30 Q-36 0 -30 4.5 H-4 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, needle);
      el("ellipse", { cx: -24, cy: 0, rx: 4, ry: 1.6, fill: "none", stroke: INK, "stroke-width": 1.8 }, needle);
      return (t) => {
        const fade = 1 - seg(t, 10.2, 10.8), cur = Math.min(5, Math.floor(t / P)), u = t - cur * P;
        threads.forEach((h, i) => {
          const k = i < cur ? 1 : i > cur ? 0 : io(seg(u, 0.35, 1.35));
          [h.under, h.th].forEach((n) => { n.setAttribute("stroke-dasharray", `${h.L * k} ${h.L + 10}`); n.setAttribute("opacity", k > 0 ? fade : 0); });
        });
        const h = threads[cur];
        if (u < 0.35) {
          const [x1, y1] = starts[cur], [x0, y0] = cur ? starts[cur - 1] : [x1 - 60, y1 - 40], k = io(seg(u, 0, 0.35)), hop = Math.sin(Math.PI * k);
          needle.setAttribute("transform", `translate(${x0 + (x1 - x0) * k} ${y0 + (y1 - y0) * k - 30 * hop}) scale(${1 + 0.2 * hop}) translate(24 0)`);
        } else {
          const L = h.L * io(seg(u, 0.35, 1.35)), p = h.th.getPointAtLength(L), b = h.th.getPointAtLength(Math.max(0, L - 1));
          const ang = L < 1 ? 0 : (Math.atan2(p.y - b.y, p.x - b.x) * 180) / Math.PI;
          needle.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${ang}) translate(24 0)`);
        }
        needle.setAttribute("opacity", fade);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      el("rect", { x: 64, y: 40, width: 156, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 142, 67, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 }), 132);
      txt(svg, 896, 67, "Checked 14 Nov 2026", { "text-anchor": "end", "font-size": 19, "font-weight": 500, fill: MUTE });
      fit(txt(svg, 64, 170, "Nimbalyst alternatives", { "font-size": 68, "font-weight": 700 }), 832);
      el("path", { d: "M66 196 H286", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      fit(txt(svg, 64, 246, "5 tools like Nimbalyst for parallel agents", { "font-size": 25, "font-weight": 500, fill: MUTE }), 832);
      const NAMES = ["Orca", "Munder Difflin", "T3 Code", "Paradev", "Emdash Classic"], COLS = [YEL, BLUE, LIL, SKY, MINT];
      const lines = el("g", {}, svg);
      el("rect", { x: 380, y: 290, width: 200, height: 50, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 480, 322, "Nimbalyst", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const tiles = NAMES.map((n, i) => {
        const g = el("g", { opacity: 0 }, svg), r = el("rect", { y: 0, height: 46, rx: 11, fill: COLS[i], stroke: INK, "stroke-width": 2.5 }, g);
        const w = Math.max(112, txt(g, 0, 29, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 }).getComputedTextLength() + 34);
        r.setAttribute("x", -w / 2); r.setAttribute("width", w); return { g, w };
      });
      let x = 480 - (tiles.reduce((a, b) => a + b.w, 0) + 24 * (tiles.length - 1)) / 2;
      tiles.forEach((tl) => { tl.cx = x + tl.w / 2; x += tl.w + 24; });
      el("path", { d: `M480 340 V378 M${tiles[0].cx} 378 H${tiles[4].cx} ` + tiles.map((tl) => `M${tl.cx} 378 V412`).join(" "), stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, lines);
      let last = 0, done = false; // plays once, then holds the final frame
      return (t) => {
        if (t < last) done = true; last = t; const T = done ? 4 : t;
        lines.setAttribute("opacity", seg(T, 0.3, 0.9));
        tiles.forEach((tl, i) => { const k = seg(T, 0.6 + i * 0.25, 1.15 + i * 0.25); tf(tl.g, tl.cx, 412 + 26 * (1 - oc(k))); tl.g.setAttribute("opacity", k); });
      };
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
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
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
