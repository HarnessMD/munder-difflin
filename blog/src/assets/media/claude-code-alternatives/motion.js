/* Bright coded scenes for "Claude Code alternatives". Vanilla JS, no library.
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

  /* ---- seven peg shapes, drawn around 0,0 ---- */
  const poly = (pts) => "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L") + " Z";
  const ring = (n, r, r2, rot) => Array.from({ length: n }, (_, i) => { const a = rot + (i / n) * 6.2832, q = r2 && i % 2 ? r2 : r; return [Math.cos(a) * q, Math.sin(a) * q]; });
  const SHAPES = [
    (r) => `M${-r} 0 a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`,
    (r) => poly(ring(4, r * 1.2, 0, 0.7854)),
    (r) => poly([[0, -r], [r, r * 0.8], [-r, r * 0.8]]),
    (r) => poly(ring(4, r * 1.08, 0, 0)),
    (r) => poly(ring(6, r * 1.05, 0, 0)),
    (r) => poly(ring(10, r * 1.15, r * 0.6, -1.5708)),
    (r) => { const a = r * 0.38; return poly([[-a, -r], [a, -r], [a, -a], [r, -a], [r, a], [a, a], [a, r], [-a, r], [-a, a], [-r, a], [-r, -a], [-a, -a]]); },
  ];
  const PEGCOL = [YEL, BLUE, LIL, SKY, MINT, YEL, LIL];
  const lock = (g, open, fill) => {
    el("path", { d: open ? "M-14 -2 V-24 a14 14 0 0 1 28 0 V-16" : "M-14 -2 V-16 a14 14 0 0 1 28 0 V-2", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, g);
    el("rect", { x: -25, y: -4, width: 50, height: 40, rx: 9, fill, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: "M0 12 V21", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
  };

  const SC = {};

  /* ---- 1. four reasons drop on a balance and tip it away from "stay" ---- */
  SC.tipping = {
    dur: 11.4, still: 9.2,
    build(svg, api) {
      txt(svg, 44, 62, "Four reasons people look elsewhere", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 100, "tap a weight", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const PX = 400, PY = 190, ARM = 232, DROP = 150;
      el("path", { d: `M${PX} ${PY} V448`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      el("rect", { x: PX - 90, y: 440, width: 180, height: 20, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const beam = el("path", { stroke: INK, "stroke-width": 8, "stroke-linecap": "round", fill: "none" }, svg);
      el("circle", { cx: PX, cy: PY, r: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const pan = () => {
        const g = el("g", {}, svg);
        el("path", { d: `M0 0 L-100 ${DROP} M0 0 L100 ${DROP}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, g);
        el("rect", { x: -108, y: DROP, width: 216, height: 13, rx: 6.5, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("circle", { r: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        return g;
      };
      const left = pan(), right = pan();
      el("rect", { x: -80, y: DROP - 92, width: 160, height: 92, rx: 18, fill: MINT, stroke: INK, "stroke-width": 3 }, left);
      txt(left, 0, DROP - 35, "stay", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      const LINES = ["Price: Claude Pro, $20 if billed monthly", "Licence: its licence file says “All rights reserved”", "Model choice: it is built around Claude models", "Or wanting an editor"];
      const ART = [
        (g) => txt(g, 0, 10, "$20", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 }),
        (g) => { const k = el("g", { transform: "translate(0 -3) scale(0.72)" }, g); lock(k, false, "#fff"); },
        (g) => [-24, 0, 24].forEach((x, i) => el("circle", { cx: x, cy: 0, r: 9, fill: i === 0 ? INK : "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": i === 0 ? "" : "3 4" }, g)),
        (g) => { el("rect", { x: -28, y: -19, width: 56, height: 38, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); el("path", { d: "M-28 -8 H28 M-18 2 H6 M-18 10 H16", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g); },
      ];
      const COL = [YEL, LIL, BLUE, SKY], SLOT = [[-48, -33], [48, -33], [-48, -101], [48, -101]], NAME = ["Price", "Licence", "Model choice", "An editor"];
      let pinned = -1;
      const tiles = SLOT.map(([sx, sy], i) => {
        const g = el("g", {}, right);
        el("rect", { x: -50, y: -37, width: 100, height: 74, rx: 20, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("rect", { x: -45, y: -32, width: 90, height: 64, rx: 16, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        ART[i](g);
        button(g, `${NAME[i]}. ${LINES[i]}`, () => { pinned = i; api.poke(); });
        return { g, sx, sy: DROP + sy, land: 1.5 + i * 1.75 };
      });
      const cap = strip(svg, 500, 720);
      const spring = (x) => (x <= 0 ? 0 : 1 - Math.exp(-4.2 * x) * Math.cos(8.5 * x));
      return (t) => {
        const back = io(seg(t, 10.4, 11.2));
        let a = -9, last = -1;
        tiles.forEach((w, i) => { a += 4.5 * spring(t - w.land); if (t >= w.land) last = i; });
        a -= 18 * back;
        const r = (a * Math.PI) / 180, dx = Math.cos(r) * ARM, dy = Math.sin(r) * ARM;
        beam.setAttribute("d", `M${PX - dx} ${PY - dy} L${PX + dx} ${PY + dy}`);
        tf(left, PX - dx, PY - dy); tf(right, PX + dx, PY + dy);
        tiles.forEach((w, i) => {
          const q = seg(t, w.land - 0.42, w.land), fall = -(w.sy + PY - 96) * (1 - q * q) * 0.75;
          const sq = Math.sin(seg(t, w.land, w.land + 0.3) * Math.PI) * 0.1;
          w.g.setAttribute("transform", `translate(${w.sx} ${w.sy + fall + 32 * sq}) scale(${1 + sq} ${1 - sq})`);
          w.g.setAttribute("opacity", seg(t, w.land - 0.42, w.land - 0.3) * (1 - seg(t, 10.2, 10.6)));
        });
        cap.textContent = pinned >= 0 ? LINES[pinned] : t > 8.4 && t < 10.4 ? "If none of that bothers you, stay: it is a good tool." : last < 0 || t >= 10.4 ? "Four reasons: price, licence, model choice, or an editor" : LINES[last];
      };
    },
  };

  /* ---- 2. two cards slide on top of each other; only the locks refuse to match ---- */
  SC.twins = {
    dur: 11, still: 7,
    build(svg) {
      txt(svg, 44, 62, "Lay one over the other", { "font-size": 32, "font-weight": 700 });
      const CW = 340, CH = 292, CY = 138;
      const card = (name, right) => {
        const g = el("g", {}, svg);
        el("rect", { x: 10, y: 10, width: CW, height: CH, rx: 26, fill: YEL }, g);
        el("rect", { x: 0, y: 0, width: CW, height: CH, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        txt(g, right ? CW - 6 : 6, -14, name, { "text-anchor": right ? "end" : "start", "font-size": 24, "font-weight": 700 });
        el("rect", { x: 26, y: 26, width: 60, height: 46, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M40 40 L50 49 L40 58 M56 59 H72", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        txt(g, 106, 58, "Terminal", { "font-size": 24 });
        el("path", { d: `M24 92 H${CW - 24} M24 172 H${CW - 24}`, stroke: SOFT, "stroke-width": 3, "stroke-linecap": "round" }, g);
        el("path", { d: "M28 132 L46 110 H86 V154 H46 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cx: 50, cy: 132, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 106, 141, "$20 a month", { "font-size": 24 });
        txt(g, 26, 204, "Licence", { "font-size": 20, "font-weight": 500, fill: MUTE });
        el("circle", { cx: CW / 2, cy: 228, r: 44, fill: SOFT, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", "stroke-linecap": "round" }, g);
        return g;
      };
      const A = card("Claude Code", false), B = card("Codex CLI", true);
      const ticks = [48, 132].map((y) => { const g = el("g", {}, svg); el("circle", { r: 17, fill: MINT, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-8 0 L-2 6 L8 -6", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); return { g, y: CY + y }; });
      const mk = (open, fill, label) => { const g = el("g", {}, svg), ic = el("g", {}, g); lock(ic, open, fill); const l = txt(g, 0, 74, label, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 }); return { g, ic, l }; };
      const LA = mk(false, LIL, "Proprietary"), LB = mk(true, MINT, "Apache 2.0");
      const cap = strip(svg, 500, 720);
      return (t) => {
        const m = io(seg(t, 2.3, 3.5)) - io(seg(t, 9.6, 10.6)), s = ob(seg(t, 5.2, 5.9)) - io(seg(t, 8.9, 9.5));
        const ax = 40 + 190 * m, bx = 420 - 190 * m, pop = ob(seg(t, 0.1, 0.6));
        A.setAttribute("transform", `translate(${ax} ${CY})`); B.setAttribute("transform", `translate(${bx} ${CY})`);
        const bump = seg(m, 0.72, 1), jig = bump >= 1 && s < 0.05 ? Math.sin(t * 34) * 4 : 0;
        const lx = ax + CW / 2 - 31 * bump - jig, rx = bx + CW / 2 + 31 * bump + jig, ly = CY + 222;
        tf(LA.g, lx + (112 - lx) * s, ly - 70 * s, (0.85 + 0.15 * pop) * (1 + 0.25 * s), -jig * 1.5);
        tf(LB.g, rx + (688 - rx) * s, ly - 70 * s, (0.85 + 0.15 * pop) * (1 + 0.25 * s), jig * 1.5);
        const lo = cl(s * 3);
        LA.l.setAttribute("opacity", lo); LB.l.setAttribute("opacity", lo);
        ticks.forEach((k, i) => { const p = ob(seg(t, 3.7 + i * 0.6, 4.1 + i * 0.6)) * (1 - seg(t, 9.3, 9.6)); tf(k.g, 230 + CW - 44, k.y, cl(p, 0, 1.3)); k.g.setAttribute("opacity", p <= 0.01 ? 0 : 1); });
        cap.textContent = t < 3.5 || t > 9.6 ? "Both are terminal agents made by a model lab" : t < 5.2 ? "The first plan that lists each CLI costs $20 a month" : "The licence is the real difference";
      };
    },
  };

  /* ---- 3. coin stacks for each starting price, and a plank that sits level on the three $20 ones ---- */
  SC.coins = {
    dur: 11.6, still: 9,
    build(svg, api) {
      txt(svg, 44, 62, "What it costs a month to start", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "tap a stack", { "font-size": 20, fill: MUTE, "font-weight": 500 });
      const G = 430, CWD = 88, CHT = 26, X = (i) => 64 + i * 131;
      const IT = [
        ["OpenCode", "free models", 0, "Free", "OpenCode includes free models"],
        ["OpenCode", "Go", 1, "$10", "OpenCode Go was $10 a month"],
        ["Claude", "Pro", 2, "$20", "Claude Pro: $20 if billed monthly"],
        ["ChatGPT", "Plus", 2, "$20", "ChatGPT Plus was $20 a month"],
        ["Cursor", "Individual", 2, "$20", "Cursor Individual was $20 a month"],
        ["Claude", "Max", 10, "from $100", "Claude Max: from $100 a month"],
      ];
      el("path", { d: `M16 ${G + 2} H784`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      let pinned = -1, tcur = 0.7;
      const stacks = IT.map(([n1, n2, n, price, line], i) => {
        const x = X(i), g = el("g", {}, svg);
        el("rect", { x: x - 62, y: G - Math.max(n, 1) * CHT - 44, width: 124, height: Math.max(n, 1) * CHT + 110, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        if (!n) el("rect", { x: x - CWD / 2, y: G - CHT, width: CWD, height: CHT, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", "stroke-linecap": "round" }, g);
        const start = tcur;
        const cs = Array.from({ length: n }, (_, j) => { const c = el("rect", { x: -CWD / 2, y: -CHT, width: CWD, height: CHT, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, g); return { c, y: G - j * CHT, d: start + j * (n > 4 ? 0.13 : 0.2) }; });
        const done = n ? cs[n - 1].d + 0.4 : start + 0.3; tcur = done + 0.25;
        const lab = txt(g, x, G - Math.max(n, 1) * CHT - 14, price, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        txt(g, x, G + 34, n1, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        txt(g, x, G + 58, n2, { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        button(g, line, () => { pinned = i; api.poke(); });
        return { x, cs, lab, done, n, ly: G - Math.max(n, 1) * CHT - 14 };
      });
      const PT = tcur + 0.3, plank = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: -182, y: -30, width: 364, height: 30, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, plank);
      const three = txt(svg, X(3), G - 2 * CHT - 44, "three cost exactly $20", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const cap = strip(svg, 512, 720);
      return (t) => {
        const out = seg(t, 10.8, 11.4);
        stacks.forEach((s) => {
          s.cs.forEach((c) => { const q = seg(t, c.d, c.d + 0.32), b = Math.sin(seg(t, c.d + 0.32, c.d + 0.6) * Math.PI) * -5; tf(c.c, s.x, c.y - 250 * (1 - q * q) + b); c.c.setAttribute("opacity", seg(t, c.d, c.d + 0.08) * (1 - out)); });
          const p = ob(seg(t, s.done - 0.1, s.done + 0.3));
          const hide = s.n === 2 ? 1 - seg(t, PT - 0.1, PT + 0.15) : 1;
          s.lab.setAttribute("transform", `translate(${s.x} ${s.ly}) scale(${cl(p, 0, 1.3)}) translate(${-s.x} ${-s.ly})`);
          s.lab.setAttribute("opacity", (p <= 0.01 ? 0 : 1) * hide * (1 - out));
        });
        const q = seg(t, PT, PT + 0.45), land = seg(t, PT + 0.45, PT + 1.1), wob = Math.exp(-5 * land) * Math.sin(land * 16) * (q >= 1 ? 1 : 0);
        tf(plank, X(3), G - 2 * CHT - 2 - 300 * (1 - q * q), 1, wob * 4 + (1 - q) * -12);
        plank.setAttribute("opacity", seg(t, PT, PT + 0.1) * (1 - out));
        const tp = ob(seg(t, PT + 0.6, PT + 1));
        three.setAttribute("opacity", (tp <= 0.01 ? 0 : 1) * (1 - out));
        three.setAttribute("transform", `translate(0 ${10 * (1 - cl(tp, 0, 1.2))})`);
        let last = -1; stacks.forEach((s, i) => { if (t >= s.done - 0.1) last = i; });
        cap.textContent = pinned >= 0 ? IT[pinned][4] : t > PT + 0.5 && t < 10.8 ? "Three steps cost exactly $20, Claude Pro included" : last < 0 || t >= 10.8 ? "Prices checked 5 Oct 2026" : IT[last][4];
      };
    },
  };

  /* ---- 4. a shape sorter: each reason is a peg that only fits one tool ---- */
  SC.pegs = {
    dur: 11.6, still: 9.9,
    build(svg, api) {
      txt(svg, 44, 62, "Pick by the reason you are leaving", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a tile", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const PICK = [
        ["Codex CLI", "You want the same workflow, different lab", "Codex CLI"],
        ["Munder Difflin", "You want to keep Claude Code and add others", "Munder Difflin"],
        ["OpenCode", "You want any model, local ones included", "OpenCode"],
        ["Cursor", "You want an editor", "Cursor, or Cline if you are staying in VS Code"],
        ["Gemini CLI", "You already pay for Gemini API access", "Gemini CLI"],
        ["Pi", "You want to build your own harness", "Pi"],
        ["Aider", "You want every change in git", "Aider"],
      ];
      const POS = [[110, 142], [303, 142], [497, 142], [690, 142], [207, 290], [400, 290], [593, 290]], TW = 156, TH = 92, R = 28, TRAY = [400, 468];
      let pinned = -1;
      const tiles = PICK.map(([name, why, pick], i) => {
        const [x, y] = POS[i], g = el("g", {}, svg), box = el("g", {}, g);
        el("rect", { x: -TW / 2 - 6, y: -TH / 2 - 6, width: TW + 12, height: TH + 46, rx: 24, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("rect", { x: -TW / 2, y: -TH / 2, width: TW, height: TH, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, box);
        el("path", { d: SHAPES[i](R), fill: SOFT, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", "stroke-linecap": "round", "stroke-linejoin": "round" }, box);
        txt(g, 0, TH / 2 + 28, name, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
        tf(g, x, y);
        button(g, `${why}: ${pick}`, () => { pinned = i; api.poke(); });
        return { box, x, y, t0: 0.5 + i * 1.25 };
      });
      el("rect", { x: TRAY[0] - 78, y: TRAY[1] + 12, width: 156, height: 26, rx: 13, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const pegs = PICK.map((_, i) => el("path", { d: SHAPES[i](R), fill: PEGCOL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "pointer-events": "none" }, svg));
      const cap = strip(svg, 536, 740);
      return (t) => {
        const out = seg(t, 10.9, 11.5);
        let cur = -1;
        tiles.forEach((k, i) => {
          const a = k.t0, land = a + 1.05, pop = ob(seg(t, a, a + 0.3)), p = io(seg(t, a + 0.6, land)), snap = Math.sin(seg(t, land, land + 0.35) * Math.PI);
          const x = TRAY[0] + (k.x - TRAY[0]) * p, y = TRAY[1] - 22 + (k.y - TRAY[1] + 22) * p - 70 * Math.sin(Math.PI * p) + (p <= 0 ? Math.sin(t * 7) * 3 : 0);
          tf(pegs[i], x, y, cl(pop, 0, 1.4) * (1.3 - 0.3 * p) * (1 + 0.14 * snap), p > 0 && p < 1 ? Math.sin(p * Math.PI) * 24 : 0);
          pegs[i].setAttribute("opacity", (t < a ? 0 : 1) * (1 - out));
          k.box.setAttribute("transform", `scale(${1 + 0.07 * snap})`);
          if (t >= a) cur = i;
        });
        const show = pinned >= 0 ? pinned : cur;
        cap.textContent = show < 0 || (pinned < 0 && t >= 10.9) ? "Seven reasons, seven shapes" : `${PICK[show][1]}: ${PICK[show][2]}`;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 150, "Claude Code", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 236, "alternatives", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 262 H500", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 318, "7 coding agents to switch to", { "font-size": 25, "font-weight": 500, fill: MUTE });
      el("rect", { x: 56, y: 372, width: 848, height: 112, rx: 30, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      SHAPES.forEach((f, i) => { const x = 120 + i * 120, up = i === 3; if (up) el("path", { d: f(30), fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", "stroke-linecap": "round", "stroke-linejoin": "round", transform: `translate(${x} 428)` }, svg); el("path", { d: f(30), fill: PEGCOL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", transform: `translate(${x} ${up ? 330 : 428}) rotate(${up ? 14 : 0})` }, svg); });
      return () => {};
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
