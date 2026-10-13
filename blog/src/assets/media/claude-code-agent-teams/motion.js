/* Bright coded scenes for "Claude Code agent teams". Vanilla JS, no library.
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  const pulse = (t, a, d = 0.35) => Math.sin(seg(t, a, a + d) * Math.PI);
  const TEAM = [BLUE, LIL, MINT, SKY];

  const SC = {};

  /* ---- 1. a rowing boat from above: the steering oar turns first, then each side oar pulls at its own pace ---- */
  SC.oars = {
    dur: 12, still: 9.45,
    build(svg) {
      txt(svg, 44, 62, "One lead, several teammates", { "font-size": 32, "font-weight": 700 });
      const water = el("g", {}, svg);
      [[166, 0], [202, 40], [398, 20], [434, 60]].forEach(([y, o]) => { for (let x = -80; x < 960; x += 80) el("path", { d: `M${x + o} ${y} q10 -8 20 0 t20 0`, stroke: SKY, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, water); });
      el("path", { d: "M150 300 Q150 245 220 245 L580 245 Q680 250 720 300 Q680 350 580 355 L220 355 Q150 355 150 300 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M168 300 Q168 261 224 261 L578 261 Q664 265 696 300 Q664 335 578 339 L224 339 Q168 339 168 300 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const SEAT = [[280, 245, 0], [390, 355, 180], [500, 245, 0], [610, 352, 180]];
      const thw = SEAT.map(([x], i) => { const g = el("g", {}, svg); el("rect", { x: -10, y: -39, width: 20, height: 78, rx: 8, fill: TEAM[i], stroke: INK, "stroke-width": 3 }, g); tf(g, x, 300); return g; });
      const note = el("g", {}, svg);
      el("rect", { x: -17, y: -13, width: 34, height: 26, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, note);
      el("path", { d: "M-9 -3 H9 M-9 5 H3", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, note);
      const oar = (L, col) => {
        const g = el("g", {}, svg);
        el("path", { d: `M0 30 V${-L + 30}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
        el("rect", { x: -11, y: -L, width: 22, height: 42, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        return g;
      };
      const steer = oar(98, YEL), side = SEAT.map((s, i) => oar(112, TEAM[i]));
      el("rect", { x: 40, y: 206, width: 88, height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 84, 233, "lead", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      SEAT.forEach(([x, y, r]) => txt(svg, x, r ? 502 : 116, "teammate", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 }));
      const T0 = [2.3, 3.0, 3.7, 4.4], PER = [1.5, 1.9, 1.25, 1.7];
      const HOPS = [[5.0, 0, 1], [6.0, 2, 3], [7.0, 1, 2], [8.0, 3, 2], [9.0, 1, 0], [10.0, 2, 3]];
      const cap = strip(svg, 524, 720);
      return (t) => {
        const out = 1 - seg(t, 10.8, 11.6);
        const S = t < 2.3 ? 0 : t < 4.6 ? Math.pow(t - 2.3, 2) / 4.6 : t < 10.8 ? 1.15 + (t - 4.6) : 7.35 + Math.min(t - 10.8, 0.8) - Math.pow(Math.min(t - 10.8, 0.8), 2) / 1.6;
        water.setAttribute("transform", `translate(${-((S * 240 / 7.75) % 80)} 0)`);
        tf(steer, 150, 300, 1, -90 + 20 * Math.sin(seg(t, 0.6, 2.2) * 6.2832) + 6 * Math.sin(t * 1.5708) * seg(t, 2.2, 3) * out);
        side.forEach((g, i) => {
          const [x, y, r] = SEAT[i], a = 26 * seg(t, T0[i], T0[i] + 0.8) * out * Math.sin(((t - T0[i]) / PER[i]) * 6.2832);
          tf(g, x, y, 1, r + (r ? -a : a));
        });
        let on = 0, nx = 0; const bump = [0, 0, 0, 0];
        HOPS.forEach(([a, i, j]) => {
          const p = seg(t, a, a + 0.9);
          if (t >= a && t <= a + 0.9) { on = Math.min(seg(t, a, a + 0.12), 1 - seg(t, a + 0.78, a + 0.9)); nx = SEAT[i][0] + (SEAT[j][0] - SEAT[i][0]) * io(p); }
          bump[j] += pulse(t, a + 0.8); bump[i] += pulse(t, a - 0.1, 0.3);
        });
        note.setAttribute("opacity", on); tf(note, nx, 300);
        thw.forEach((g, i) => tf(g, SEAT[i][0], 300, 1 + 0.16 * cl(bump[i])));
        cap.textContent = t < 2.3 ? "One session acts as the team lead" : t < 5 ? "Teammates work independently, each in its own context window" : "Teammates communicate directly with each other";
      };
    },
  };

  /* ---- 2. two switchboards: on one every cable runs up to the main plug, on the other cables hop between plugs too ---- */
  SC.switchboard = {
    dur: 12, still: 8.75,
    build(svg, api) {
      txt(svg, 44, 62, "Who talks to whom", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a board", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const TY = 244, RY = 352, PAIRS = [[0, 1], [2, 3], [1, 2], [0, 2], [1, 3], [0, 3]];
      const dot = () => { const d = el("circle", { r: 9, fill: YEL, stroke: INK, "stroke-width": 3, opacity: 0, "pointer-events": "none" }, svg); return d; };
      const board = (bx, name, top, team, label, at) => {
        const g = el("g", {}, svg), cx = bx + 172.5, xs = [0, 1, 2, 3].map((i) => bx + 60 + i * 75);
        el("rect", { x: bx - 7, y: 99, width: 359, height: 392, rx: 30, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("rect", { x: bx, y: 106, width: 345, height: 378, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        for (let r = 0; r < (team ? 7 : 5); r++) for (let c = 0; c < 8; c++) el("circle", { cx: bx + 41.25 + c * 37.5, cy: 236 + r * 37, r: 5, fill: "#fff" }, g);
        txt(g, cx, 150, name, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        txt(g, cx, 200, top, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        const glow = [], arcs = [];
        if (team) PAIRS.forEach(([i, j]) => {
          const d = `M${xs[i]} ${RY + 16} Q${(xs[i] + xs[j]) / 2} ${RY + 16 + 56 * (j - i)} ${xs[j]} ${RY + 16}`;
          glow.push(el("path", { d, stroke: YEL, "stroke-width": 11, fill: "none", "stroke-linecap": "round", opacity: 0 }, g));
        });
        if (team) PAIRS.forEach(([i, j]) => arcs.push(el("path", { d: `M${xs[i]} ${RY + 16} Q${(xs[i] + xs[j]) / 2} ${RY + 16 + 56 * (j - i)} ${xs[j]} ${RY + 16}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g)));
        const up = xs.map((x) => el("path", { d: `M${x} ${RY - 16} C${x} ${RY - 62} ${cx} ${TY + 78} ${cx} ${TY + 22}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g));
        const plug = (x, y, r, col) => { const p = el("g", {}, g); el("circle", { r, fill: col, stroke: INK, "stroke-width": 3 }, p); el("circle", { r: r * 0.3, fill: INK }, p); tf(p, x, y); return p; };
        const head = plug(cx, TY, 22, YEL), outer = xs.map((x, i) => plug(x, RY, 16, TEAM[i]));
        if (!team) { txt(g, cx, 420, "results return", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE }); txt(g, cx, 446, "to the caller", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE }); }
        button(g, label, () => api.seek(at));
        return { cx, xs, glow, arcs, up, head, outer };
      };
      const A = board(40, "Subagents", "main agent", false, "Subagents return a result to the caller. Replay.", 1.2);
      const B = board(415, "Agent teams", "lead", true, "Teammates message each other directly. Replay.", 5.3);
      const dA = dot(), dB = dot();
      const along = (d, path, p) => { const L = path.getTotalLength(), q = path.getPointAtLength(L * p); d.setAttribute("cx", q.x); d.setAttribute("cy", q.y); };
      const cap = strip(svg, 512, 720);
      return (t) => {
        let oa = 0, hb = 0; const ba = [0, 0, 0, 0], bb = [0, 0, 0, 0];
        A.up.forEach((p, i) => { const a = 1.5 + i * 0.9; if (t >= a && t <= a + 0.7) { oa = 1; along(dA, p, io(seg(t, a, a + 0.7))); } ba[i] = pulse(t, a - 0.15, 0.3); hb += pulse(t, a + 0.62); });
        dA.setAttribute("opacity", oa);
        A.outer.forEach((p, i) => tf(p, A.xs[i], RY, 1 + 0.2 * ba[i]));
        tf(A.head, A.cx, TY, 1 + 0.16 * cl(hb));
        let ob2 = 0;
        PAIRS.forEach(([i, j], k) => {
          const a = 5.6 + k * 0.85, live = t >= a && t <= a + 0.85;
          B.glow[k].setAttribute("opacity", live ? Math.min(seg(t, a, a + 0.12), 1 - seg(t, a + 0.73, a + 0.85)) : 0);
          if (live) { ob2 = 1; along(dB, B.arcs[k], io(seg(t, a + 0.05, a + 0.75))); }
          bb[i] += pulse(t, a - 0.05, 0.3); bb[j] += pulse(t, a + 0.62, 0.3);
        });
        dB.setAttribute("opacity", ob2);
        B.outer.forEach((p, i) => tf(p, B.xs[i], RY, 1 + 0.2 * cl(bb[i])));
        cap.textContent = t < 5.3 ? "Subagents return a result to the caller" : "Teammates message each other directly";
      };
    },
  };

  /* ---- 3. a kitchen pass: order tickets slide along the rail, and one waits for the ticket it depends on ---- */
  SC.tickets = {
    dur: 13.2, still: 7.5,
    build(svg) {
      txt(svg, 44, 62, "A task moves through three states", { "font-size": 32, "font-weight": 700 });
      [["pending", 137], ["in progress", 351], ["completed", 614]].forEach(([s, x]) => txt(svg, x, 120, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 }));
      [244, 457].forEach((x) => el("path", { d: `M${x} 170 V424`, stroke: LIL, "stroke-width": 3, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, svg));
      el("rect", { x: 30, y: 452, width: 740, height: 24, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const bell = el("g", {}, svg), ding = el("path", { d: "M-50 -30 q-8 -12 0 -24 M50 -30 q8 -12 0 -24 M-62 -24 q-12 -18 0 -36 M62 -24 q12 -18 0 -36", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, bell);
      el("rect", { x: -42, y: -8, width: 84, height: 12, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, bell);
      el("path", { d: "M-34 -8 a34 32 0 0 1 68 0 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bell);
      el("circle", { cx: 0, cy: -44, r: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, bell);
      const zig = "M-46 0 H46 V200 " + Array.from({ length: 8 }, (_, k) => `l-11.5 ${k % 2 ? -10 : 10}`).join(" ") + " Z";
      const hang = el("g", {}, svg);
      const ticket = (name, col, dep) => {
        const g = el("g", {}, hang);
        el("path", { d: zig, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("rect", { x: -34, y: 24, width: 68, height: 14, rx: 7, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 76, name, { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
        if (dep) { txt(g, 0, 106, "depends", { "text-anchor": "middle", "font-size": 17, "font-weight": 600 }); txt(g, 0, 127, dep, { "text-anchor": "middle", "font-size": 17, "font-weight": 600 }); }
        else el("path", { d: "M-30 98 H30 M-30 114 H12 M-30 130 H24", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, g);
        const st = el("g", {}, g);
        el("circle", { r: 21, fill: MINT, stroke: INK, "stroke-width": 3 }, st);
        el("path", { d: "M-9 0 L-3 7 L9 -7", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, st);
        return { g, st };
      };
      const T1 = ticket("task 1", SKY), T2 = ticket("task 2", YEL), T3 = ticket("task 3", LIL, "on task 2");
      el("rect", { x: 30, y: 143, width: 740, height: 14, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const cap = strip(svg, 518, 720);
      const path = (t, x0, hops) => { let x = x0, r = 0; hops.forEach(([a, to]) => { const p = seg(t, a, a + 0.8), from = x; x = from + (to - from) * io(p); r += -Math.sin(p * Math.PI) * 5 + Math.exp(-5 * seg(t, a + 0.8, a + 1.6)) * Math.sin(seg(t, a + 0.8, a + 1.6) * 12) * 3 * (t > a + 0.8 ? 1 : 0); }); return [x, r]; };
      const put = (T, x, r, o, done, s = 1) => { T.g.setAttribute("transform", `translate(${x} 150) rotate(${r}) scale(1 ${s})`); T.g.setAttribute("opacity", o); const p = ob(seg(t0, done, done + 0.35)); tf(T.st, 0, 166, cl(p, 0, 1.3)); T.st.setAttribute("opacity", p <= 0.01 ? 0 : 1); };
      let t0 = 0;
      return (t) => {
        t0 = t;
        const gone = t >= 12.5, fade = gone ? seg(t, 12.7, 13.1) : 1 - seg(t, 12.1, 12.5);
        const a = gone ? [189, 0] : path(t, 189, [[1.0, 403], [4.6, 718]]), b = gone ? [85, 0] : path(t, 85, [[2.2, 299], [8.0, 614]]), c = path(t, 85, [[9.2, 299], [10.6, 510]]);
        put(T1, a[0], a[1], fade, gone ? 99 : 5.4); put(T2, b[0], b[1], fade, gone ? 99 : 8.8);
        const w = pulse(t, 6.2, 0.9) * Math.sin((t - 6.2) * 28) * 6;
        put(T3, c[0] + w, c[1], gone ? 0 : seg(t, 3.4, 3.6) * (1 - seg(t, 12.1, 12.5)), 11.4, 0.2 + 0.8 * oc(seg(t, 3.4, 3.9)));
        const d = cl(pulse(t, 5.4, 0.5) + pulse(t, 8.8, 0.5) + pulse(t, 11.4, 0.5));
        tf(bell, 700, 452, 1, Math.sin(t * 40) * 4 * d); ding.setAttribute("opacity", d);
        cap.textContent = t < 3.4 || t >= 12.1 ? "Tasks have three states: pending, in progress and completed" : t < 8.8 ? "Task 3 depends on task 2, so it waits in pending" : "Task 2 is completed, so task 3 is unblocked";
      };
    },
  };

  /* ---- 4. a wall of meters: each teammate bolted on is one more needle, and the shared bar fills faster ---- */
  SC.meters = {
    dur: 12, still: 9.5,
    build(svg, api) {
      txt(svg, 44, 62, "More teammates, more tokens", { "font-size": 32, "font-weight": 700 });
      const X = (i) => 95 + i * 122, MY = 208, COL = [YEL, BLUE, LIL, MINT, SKY, BLUE], RATE = [0, 0.37, 0.29, 0.44, 0.33, 0.26], START = [0, 2.0, 3.6, 5.2];
      el("rect", { x: 30, y: MY - 9, width: 740, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 1; i < 6; i++) el("rect", { x: X(i) - 54, y: MY - 54, width: 108, height: 108, rx: 18, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 8", "stroke-linecap": "round" }, svg);
      const ms = COL.map((col, i) => {
        const g = el("g", {}, svg), body = el("g", {}, g);
        el("rect", { x: -54, y: -54, width: 108, height: 108, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, body);
        [[-42, -42], [42, -42], [-42, 42], [42, 42]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, body));
        el("circle", { r: 41, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
        for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.2832; el("path", { d: `M${Math.sin(a) * 30} ${-Math.cos(a) * 30} L${Math.sin(a) * 35} ${-Math.cos(a) * 35}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, body); }
        const nd = el("path", { d: "M0 7 V-25", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, body);
        el("circle", { r: 5, fill: col, stroke: INK, "stroke-width": 3 }, body);
        const lab = txt(g, 0, 86, i ? "teammate" : "lead", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        tf(g, X(i), MY);
        return { g, body, nd, lab };
      });
      txt(svg, 44, 384, "total tokens", { "font-size": 22, "font-weight": 700 });
      const count = txt(svg, 756, 384, "", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      const cells = Array.from({ length: 24 }, (_, k) => el("rect", { x: 44 + k * 29.75, y: 400, width: 24, height: 38, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg));
      txt(svg, 44, 478, "Costs page: \u201croughly proportional to team size\u201d", { "font-size": 20, "font-weight": 500, fill: MUTE });
      let pinned = -1, acc = 0, last = 0, auto = 0, shown = 0; const born = [0, 0, 0, 0, 0, 0];
      const btn = el("g", {}, svg);
      el("rect", { x: 534, y: 30, width: 228, height: 52, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, btn);
      el("rect", { x: 540, y: 36, width: 216, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, btn);
      txt(btn, 648, 63, "+ add a teammate", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      button(btn, "Add a teammate", () => {
        const now = api.now();
        if (pinned < 0) { pinned = auto; for (let k = 1; k <= pinned; k++) born[k] = now - 1; acc = shown; }
        pinned = (pinned + 1) % 6; if (pinned) born[pinned] = now; last = now; api.poke();
      });
      const cap = strip(svg, 516, 720);
      return (t, now = 0) => {
        let n = 0, lit, T = t;
        if (pinned < 0) {
          const u = Math.min(t, 10.8), gone = 1 - seg(t, 10.8, 11.3);
          for (let k = 1; k < 6; k++) { const a = START[k], p = a === undefined ? 0 : cl(ob(seg(t, a, a + 0.4)), 0, 1.07) * gone; ms[k].body.setAttribute("transform", `scale(${p})`); ms[k].g.setAttribute("opacity", cl(p * 2.5)); if (a !== undefined && t >= a && t < 10.8) n++; }
          lit = ((u + Math.max(0, u - 2) + Math.max(0, u - 3.6) + Math.max(0, u - 5.2)) * 24 / 32.4) * (1 - seg(t, 11.3, 11.8));
          auto = n; shown = lit;
        } else {
          n = pinned; T = now;
          acc += cl(now - last, 0, 0.1) * (1 + n) * 1.5; last = now; if (acc >= 25) acc = 0; lit = acc;
          for (let k = 1; k < 6; k++) { const p = k <= n ? cl(ob(seg(now, born[k], born[k] + 0.4)), 0, 1.07) : 0; ms[k].body.setAttribute("transform", `scale(${p})`); ms[k].g.setAttribute("opacity", cl(p * 2.5)); }
        }
        const step = T / 0.5, fr = step - Math.floor(step);
        ms[0].nd.setAttribute("transform", `rotate(${30 * (Math.floor(step) + oc(seg(fr, 0, 0.5)))})`);
        for (let k = 1; k < 6; k++) ms[k].nd.setAttribute("transform", `rotate(${360 * RATE[k] * (T + k * 1.3)})`);
        cells.forEach((c, k) => c.setAttribute("fill", k < Math.floor(lit) ? YEL : "#fff"));
        count.textContent = n ? `1 lead + ${n} teammate${n > 1 ? "s" : ""}` : "1 lead";
        cap.textContent = n ? "Token usage scales with the number of active teammates" : "A single session: one lead, no teammates yet";
      };
    },
  };

  /* ---- title card, 16 by 9: one large kite and three small ones on one reel ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 1.5,
    build(svg) {
      el("rect", { x: 64, y: 78, width: 168, height: 44, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 148, 109, "Explainer", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      txt(svg, 64, 222, "Claude Code", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 308, "agent teams", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 336 H486", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 398, "Checked 8 Oct 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const REEL = [872, 470], K = [[770, 152, 70, YEL, 0], [622, 262, 40, BLUE, 1.3], [872, 300, 40, LIL, 2.6], [716, 372, 36, MINT, 3.9]];
      const lines = K.map(() => el("path", { stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg));
      const kites = K.map(([x, y, s, col]) => {
        const g = el("g", {}, svg), n = s > 50 ? 3 : 2;
        let d = `M0 ${1.15 * s}`; for (let k = 0; k < n; k++) d += ` q${k % 2 ? -12 : 12} 13 0 26`;
        el("path", { d, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g);
        for (let k = 1; k <= n; k++) el("path", { d: `M0 0 L-11 -7 V7 Z M0 0 L11 -7 V7 Z`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", transform: `translate(0 ${1.15 * s + k * 26})` }, g);
        el("path", { d: `M0 ${-s} L${0.72 * s} ${-0.12 * s} L0 ${1.15 * s} L${-0.72 * s} ${-0.12 * s} Z`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: `M0 ${-s} V${1.15 * s} M${-0.72 * s} ${-0.12 * s} H${0.72 * s}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        return g;
      });
      const reel = el("g", { transform: `translate(${REEL[0]} ${REEL[1]})` }, svg);
      el("path", { d: "M-30 0 H30", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, reel);
      el("rect", { x: -18, y: -13, width: 36, height: 26, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, reel);
      el("path", { d: "M-7 -13 V13 M7 -13 V13", stroke: INK, "stroke-width": 3 }, reel);
      return (t) => {
        K.forEach(([x, y, s, col, ph], i) => {
          const a = (t / 6) * 6.2832 + ph, kx = x + 7 * Math.sin(a), ky = y + 5 * Math.cos(a * 2), r = 5 * Math.sin(a + 0.8) + (i % 2 ? 8 : -8);
          tf(kites[i], kx, ky, 1, r);
          lines[i].setAttribute("d", `M${kx} ${ky} Q${(kx + REEL[0]) / 2 - 30} ${(ky + REEL[1]) / 2 + 40} ${REEL[0]} ${REEL[1] - 13}`);
        });
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
