/* Bright coded scenes for "Claude Cowork vs Claude Code". Vanilla JS, no library.
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

  const spring = (x) => (x <= 0 ? 0 : 1 - Math.exp(-4 * x) * Math.cos(8 * x));
  const SC = {};

  /* ---- 1. one post, two arms: each swings round to point at its own kind of work ---- */
  SC.signpost = {
    dur: 10.5, still: 7.5,
    build(svg, api) {
      txt(svg, 44, 62, "One engine, two jobs", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap an arm", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const G = 462, PX = 400;
      el("path", { d: `M${PX - 96} ${G} H${PX + 96}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const post = el("g", {}, svg);
      el("rect", { x: -9, y: -326, width: 18, height: 326, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, post);
      el("circle", { cy: -336, r: 13, fill: LIL, stroke: INK, "stroke-width": 3 }, post);
      const dyn = el("g", {}, svg);
      const LINES = ["Cowork: research, analysis, document creation", "Claude Code: writing, debugging and shipping code"];
      let pinned = -1;
      const arm = (dir, y, col, name, i) => {
        const g = el("g", {}, dyn), d = dir;
        el("rect", { x: d < 0 ? -272 : -28, y: -38, width: 300, height: 76, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: `M${-20 * d} -30 H${226 * d} L${262 * d} 0 L${226 * d} 30 H${-20 * d} Z`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, 122 * d, 11, name, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        el("circle", { r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        button(g, LINES[i], () => { pinned = i; api.poke(); });
        return { g, y, d };
      };
      const A = arm(-1, 190, YEL, "Cowork", 0), B = arm(1, 270, SKY, "Claude Code", 1);
      /* left: a stack of paper and a spreadsheet */
      const sheet = (x, y, rot) => {
        const g = el("g", {}, dyn), s = el("g", { transform: `rotate(${rot})` }, g);
        el("rect", { x: -42, y: -52, width: 84, height: 104, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, s);
        el("path", { d: "M-24 -28 H24 M-24 -8 H24 M-24 12 H24 M-24 32 H4", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, s);
        return { g, x, y };
      };
      const papers = [sheet(104, 404, -11), sheet(116, 398, -3), sheet(128, 392, 5)];
      const grid = el("g", {}, dyn);
      el("rect", { x: -52, y: -58, width: 104, height: 116, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, grid);
      el("path", { d: "M-52 -30 V-48 Q-52 -58 -42 -58 H42 Q52 -58 52 -48 V-30 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, grid);
      el("path", { d: "M-52 0 H52 M-52 29 H52 M-17 -30 V58 M18 -30 V58", stroke: INK, "stroke-width": 2.5 }, grid);
      el("rect", { x: -17, y: 0, width: 35, height: 29, fill: YEL, stroke: INK, "stroke-width": 2.5 }, grid);
      const lab1 = txt(dyn, 172, 494, "non-coding knowledge work", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      /* right: a terminal window, white, with a blinking cursor */
      const term = el("g", {}, dyn);
      el("rect", { x: -105, y: -62, width: 210, height: 124, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, term);
      el("path", { d: "M-105 -30 H105", stroke: INK, "stroke-width": 3 }, term);
      [YEL, MINT, BLUE].forEach((c, i) => el("circle", { cx: -84 + i * 20, cy: -46, r: 6, fill: c, stroke: INK, "stroke-width": 2 }, term));
      el("path", { d: "M-84 -4 L-70 9 L-84 22", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, term);
      const typed = txt(term, -56, 17, "", { "font-family": MONO, "font-size": 24, "font-weight": 700 });
      const cur = el("rect", { y: -6, width: 13, height: 30, rx: 3, fill: BLUE }, term);
      const lab2 = txt(dyn, 640, 494, "software engineering", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      const cap = strip(svg, 520, 720);
      const WORD = "claude";
      return (t, now) => {
        dyn.setAttribute("opacity", 1 - seg(t, 9.7, 10.2));
        tf(post, PX, G);
        [[A, 0.9], [B, 3.5]].forEach(([a, t0]) => {
          a.g.setAttribute("transform", `translate(${PX} ${a.y}) rotate(${-a.d * 96 * (1 - spring((t - t0) * 0.9))})`);
          a.g.setAttribute("opacity", seg(t, t0 - 0.25, t0));
        });
        papers.forEach((p, i) => { const k = ob(seg(t, 2.0 + i * 0.22, 2.35 + i * 0.22)); tf(p.g, p.x, p.y + 30 * (1 - cl(k)), cl(k, 0, 1.2)); p.g.setAttribute("opacity", k <= 0.01 ? 0 : 1); });
        const gk = ob(seg(t, 2.75, 3.15)); tf(grid, 236, 392, cl(gk, 0, 1.2)); grid.setAttribute("opacity", gk <= 0.01 ? 0 : 1);
        lab1.setAttribute("opacity", seg(t, 3.0, 3.3));
        const tk = ob(seg(t, 4.6, 5.0)); tf(term, 640, 394, cl(tk, 0, 1.2)); term.setAttribute("opacity", tk <= 0.01 ? 0 : 1);
        const n = Math.round(seg(t, 5.3, 6.2) * WORD.length);
        typed.textContent = WORD.slice(0, n);
        cur.setAttribute("x", -54 + n * 14.4 + 3);
        cur.setAttribute("opacity", Math.floor(now * 2.2) % 2 === 0 ? 1 : 0.15);
        lab2.setAttribute("opacity", seg(t, 5.0, 5.3));
        cap.textContent = pinned >= 0 ? LINES[pinned] : t < 0.9 || t >= 9.7 ? "Same architecture, different front door" : t < 3.5 ? "Cowork is built for non-coding knowledge work" : t < 6.6 ? "Claude Code is built for software engineering" : "Same architecture, different front door";
      };
    },
  };

  /* ---- 2. two electric kettles: one sits on a cloud and plugs into it, one sits on a desk ---- */
  SC.kettles = {
    dur: 11.5, still: 8.6,
    build(svg) {
      txt(svg, 44, 62, "Where the work runs", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Same kettle, different socket", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const Y = 322;
      const kettle = (parent, col, flip) => {
        const g = el("g", {}, parent), k = el("g", { transform: `scale(${flip ? -1 : 1} 1)` }, g);
        const steam = [-78, -62, -46].map((x) => ({ n: el("path", { d: "M0 0 q-9 -9 0 -18 q9 -9 0 -18 q-9 -9 0 -18", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, k), x }));
        el("rect", { x: -56, y: -13, width: 112, height: 13, rx: 6.5, fill: SOFT, stroke: INK, "stroke-width": 3 }, k);
        el("path", { d: "M36 -106 Q88 -110 84 -64 Q80 -28 42 -32", stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, k);
        el("path", { d: "M-33 -120 L-64 -108 L-37 -90 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, k);
        el("path", { d: "M-46 -13 L-36 -122 Q0 -136 36 -122 L46 -13 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, k);
        el("circle", { cy: -136, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, k);
        el("rect", { x: -12, y: -102, width: 24, height: 72, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, k);
        el("rect", { x: -8, y: -72, width: 16, height: 38, rx: 8, fill: SKY }, k);
        const bub = [0, 1].map(() => el("circle", { r: 3, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, k));
        const lamp = el("circle", { cx: 34, cy: -6.5, r: 4, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, k);
        return { g, steam, bub, lamp };
      };
      const socket = (p, x, y) => { el("rect", { x: x - 17, y: y - 17, width: 34, height: 34, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, p); el("path", { d: `M${x - 6} ${y - 5} V${y + 5} M${x + 6} ${y - 5} V${y + 5}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, p); };
      const lead = (p) => { const cord = el("path", { stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, p), plug = el("g", {}, p); el("rect", { x: -15, y: -12, width: 30, height: 24, rx: 8, fill: INK }, plug); return { cord, plug }; };

      /* Cowork: the kettle rides a cloud */
      const L = el("g", {}, svg);
      el("path", { d: "M-90 68 H96 a36 36 0 0 0 8 -71 a52 52 0 0 0 -92 -30 a46 46 0 0 0 -80 14 a44 44 0 0 0 -22 87 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, L);
      socket(L, 64, 30);
      const lk = kettle(L, LIL, false), ll = lead(L);
      /* Claude Code: the kettle stands on a desk */
      const R = el("g", {}, svg);
      el("path", { d: "M-112 16 V96 M112 16 V96", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, R);
      el("rect", { x: 14, y: 16, width: 98, height: 52, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, R);
      el("rect", { x: -130, y: 0, width: 260, height: 17, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, R);
      socket(R, 63, 42);
      const rk = kettle(R, MINT, true), rl = lead(R);
      txt(svg, 215, 474, "Cowork", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(svg, 215, 502, "on Anthropic's servers", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 585, 474, "Claude Code in a terminal", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(svg, 585, 502, "the project folder on your machine", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      const cap = strip(svg, 524, 720);
      const run = (u, ld, t, t0, sx, sy, kx, ky) => {
        const out = 1 - seg(t, 10.6, 11.1), p = io(seg(t, t0, t0 + 0.5)) * out, on = p > 0.98 ? 1 : 0, boil = seg(t, t0 + 1.5, t0 + 2.1) * out;
        const ex = sx + 62 * (1 - p), ey = sy - 12 * (1 - p);
        ld.cord.setAttribute("d", `M${kx + 54} ${ky - 7} C${kx + 150} ${ky - 7} ${ex + 78} ${ey + 4} ${ex + 13} ${ey}`);
        tf(ld.plug, ex, ey);
        u.lamp.setAttribute("fill", on ? YEL : "#fff");
        u.bub.forEach((b, j) => { const q = (t * 1.3 + j * 0.5) % 1; b.setAttribute("cx", (j ? 3 : -3)); b.setAttribute("cy", -40 - 26 * q); b.setAttribute("opacity", on ? Math.sin(q * Math.PI) : 0); });
        u.steam.forEach((s, j) => { const q = (t * 0.6 + j / 3) % 1; s.n.setAttribute("transform", `translate(${s.x} ${-124 - 24 * q})`); s.n.setAttribute("opacity", boil * Math.sin(q * Math.PI)); });
        u.g.setAttribute("transform", `translate(${kx} ${ky}) rotate(${on && boil < 1 ? Math.sin(t * 24) * 0.9 : 0})`);
      };
      return (t, now) => {
        L.setAttribute("transform", `translate(215 ${Y + 31 + Math.sin(now * 1.4) * 4})`);
        R.setAttribute("transform", `translate(585 ${Y})`);
        run(lk, ll, t, 1.2, 64, 30, 0, -31);
        run(rk, rl, t, 3.9, 63, 42, 0, 0);
        cap.textContent = t < 1.2 || t >= 10.6 ? "Cowork runs in the Claude app, Claude Code where you write code" : t < 3.9 ? "Cowork: “runs on Anthropic's servers, in an isolated environment”" : t < 6.6 ? "Claude Code in a terminal works on your machine" : "Pro and Max: “On October 6, 2026, new Cowork tasks run in the cloud”";
      };
    },
  };

  /* ---- 3. twenty thin coins a side, one plank with a spirit level, and a billing switch ---- */
  SC.coins = {
    dur: 11, still: 8,
    build(svg, api) {
      txt(svg, 44, 62, "Both start at Claude Pro", { "font-size": 32, "font-weight": 700 });
      const G = 440, CH = 10, N = 20, XS = [250, 550];
      el("path", { d: `M60 ${G + 1.5} H740`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      txt(svg, XS[0], G + 36, "Cowork", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(svg, XS[1], G + 36, "Claude Code", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const coins = [];
      XS.forEach((x, s) => { for (let j = 0; j < N; j++) coins.push({ n: el("rect", { x: -60, y: -CH, width: 120, height: CH, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2 }, svg), x, s, j, d: 0.5 + j * 0.15 + s * 0.07 }); });
      const PT = 4.1, plank = el("g", {}, svg);
      el("rect", { x: -236, y: -34, width: 472, height: 34, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, plank);
      txt(plank, -216, -10, "Claude Pro", { "font-size": 20, "font-weight": 700 });
      el("rect", { x: -36, y: -27, width: 72, height: 20, rx: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, plank);
      el("path", { d: "M-11 -27 V-7 M11 -27 V-7", stroke: INK, "stroke-width": 2 }, plank);
      const bubble = el("circle", { cy: -17, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, plank);
      const tag = el("g", {}, svg);
      const price = txt(tag, 0, -92, "$20", { "text-anchor": "middle", "font-size": 64, "font-weight": 700 });
      const sub = txt(tag, 0, -54, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 500, fill: MUTE });
      /* the switch */
      const sw = el("g", { transform: "translate(400 532)" }, svg);
      el("rect", { x: -206, y: -31, width: 412, height: 62, rx: 31, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, sw);
      el("rect", { x: -200, y: -25, width: 400, height: 50, rx: 25, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, sw);
      const knob = el("rect", { y: -20, width: 190, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, sw);
      txt(sw, -100, 7, "billed monthly", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(sw, 100, 7, "annual", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      let to = 0, from = 0, t0 = -9;
      sw.setAttribute("aria-pressed", "false");
      button(sw, "Billing: switch between monthly and annual", () => { from = to; to = 1 - to; t0 = api.now(); sw.setAttribute("aria-pressed", to ? "true" : "false"); api.poke(); });
      return (t, now) => {
        const a = from + (to - from) * io(cl((now - t0) / 0.5)), out = seg(t, 10.3, 10.8);
        coins.forEach((c) => {
          const q = seg(t, c.d, c.d + 0.3), b = Math.sin(seg(t, c.d + 0.3, c.d + 0.5) * Math.PI) * -3, gone = c.j >= N - 3 ? a : 0;
          tf(c.n, c.x + (c.s ? 1 : -1) * 70 * gone, G - c.j * CH - 230 * (1 - q * q) + b - 26 * gone, 1, (c.s ? 1 : -1) * 30 * gone);
          c.n.setAttribute("opacity", seg(t, c.d, c.d + 0.06) * (1 - out) * (1 - gone));
        });
        const top = G - CH * (N - 3 * a);
        const q = seg(t, PT, PT + 0.45), land = seg(t, PT + 0.45, PT + 1.5), wob = q >= 1 ? Math.exp(-4 * land) * Math.sin(land * 15) : 0;
        tf(plank, 400, top - 260 * (1 - q * q), 1, wob * 3.5 + (1 - q) * -10);
        plank.setAttribute("opacity", seg(t, PT, PT + 0.1) * (1 - out));
        bubble.setAttribute("cx", cl(-wob * 22 + (1 - q) * 20, -26, 26));
        const p = ob(seg(t, PT + 0.8, PT + 1.2));
        tf(tag, 400, top + 14 * (1 - cl(p)), 1);
        tag.setAttribute("opacity", (p <= 0.01 ? 0 : 1) * (1 - out));
        price.textContent = a > 0.5 ? "$17" : "$20";
        sub.textContent = a > 0.5 ? "a month on an annual subscription" : "a month, if billed monthly";
        knob.setAttribute("x", -195 + 200 * a);
      };
    },
  };

  /* ---- 4. a picket fence rises round three folders; a parcel comes in by the gate; one folder stays outside ---- */
  SC.fence = {
    dur: 11, still: 8,
    build(svg, api) {
      txt(svg, 44, 62, "Only the folders you choose", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 100, "tap the folder outside", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const BY = 234, FY = 440, BL = 130, BR = 510, FL = 64, FR = 576, BH = 56, FH = 70;
      el("path", { d: `M${BL} ${BY} H${BR} L${FR} ${FY} H${FL} Z`, fill: SOFT, stroke: "none" }, svg);
      const yard = el("g", {}, svg);
      const rails = [];
      const rail = (p, x1, y1, x2, y2, at) => rails.push({ n: el("path", { d: `M${x1} ${y1} L${x2} ${y2}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, p), at });
      const pick = [];
      const picket = (p, x, y, w, h, at) => { const g = el("g", {}, p); el("path", { d: `M${-w} 0 V${-(h - w * 1.3)} L0 ${-h} L${w} ${-(h - w * 1.3)} V0 Z`, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g); pick.push({ g, x, y, at }); };
      /* back run */
      rail(yard, BL, BY - BH * 0.3, BR, BY - BH * 0.3, 0.5); rail(yard, BL, BY - BH * 0.72, BR, BY - BH * 0.72, 0.5);
      for (let i = 0; i < 18; i++) picket(yard, 137 + i * 21.5, BY, 7.5, BH, 0.4 + i * 0.045);
      /* the two sides, drawn far to near */
      [[BL, FL], [BR, FR]].forEach(([b, f]) => {
        const e = b + (f - b) * 0.86, ey = BY + (FY - BY) * 0.86, eh = BH + (FH - BH) * 0.86; rail(yard, b, BY - BH * 0.3, e, ey - eh * 0.3, 1.6); rail(yard, b, BY - BH * 0.72, e, ey - eh * 0.72, 1.6);
        for (let i = 1; i <= 5; i++) { const k = i / 6; picket(yard, b + (f - b) * k, BY + (FY - BY) * k, 5.5, BH + (FH - BH) * k, 1.25 + i * 0.09); }
      });
      /* three folders inside */
      const folder = (p, col, dash) => {
        const a = { fill: col, stroke: dash ? MUTE : INK, "stroke-width": 3, "stroke-linejoin": "round" };
        if (dash) a["stroke-dasharray"] = "7 6";
        el("path", { d: "M-46 -8 V-60 Q-46 -68 -38 -68 H-14 L-4 -56 H38 Q46 -56 46 -48 V-8 Z", ...a }, p);
        el("rect", { x: -46, y: -46, width: 92, height: 46, rx: 8, ...a }, p);
      };
      const inside = [[196, YEL], [320, BLUE], [444, LIL]].map(([x, col]) => { const g = el("g", {}, svg); folder(g, col, false); return { g, x }; });
      const parcel = el("g", {}, svg);
      el("rect", { x: -30, y: -50, width: 60, height: 50, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, parcel);
      el("path", { d: "M-30 -34 H30", stroke: INK, "stroke-width": 3 }, parcel);
      el("rect", { x: -9, y: -42, width: 18, height: 16, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, parcel);
      /* front run, with a gate in the middle */
      const front = el("g", {}, svg);
      [[FL, 268], [372, FR]].forEach(([a, b]) => { rail(front, a, FY - FH * 0.3, b, FY - FH * 0.3, 1.9); rail(front, a, FY - FH * 0.72, b, FY - FH * 0.72, 1.9); });
      for (let i = 0; i < 8; i++) { picket(front, 76 + i * 24, FY, 8.5, FH, 1.9 + i * 0.05); picket(front, 396 + i * 24, FY, 8.5, FH, 1.9 + i * 0.05); }
      const posts = [268, 372].map((x) => { const g = el("g", {}, front); el("rect", { x: -7, y: -84, width: 14, height: 84, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g); el("circle", { cy: -90, r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g); return { g, x }; });
      const gate = el("g", {}, front), grail = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, gate);
      const gpick = [24, 48, 72].map((x) => ({ x, n: el("path", { d: `M-8.5 0 V${-(FH - 11)} L0 ${-FH} L8.5 ${-(FH - 11)} V0 Z`, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, gate) }));
      /* the one left outside */
      const outG = el("g", {}, svg), outF = el("g", {}, outG);
      el("rect", { x: -70, y: -88, width: 140, height: 136, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, outG);
      folder(outF, SOFT, true);
      txt(outG, 0, 34, "not chosen", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      let poked = -99;
      button(outG, "A folder you did not choose. Claude can't reach anything else.", () => { poked = api.now(); api.poke(); });
      const cap = strip(svg, 520, 720);
      return (t, now) => {
        const out = 1 - seg(t, 10.2, 10.7);
        rails.forEach((r) => r.n.setAttribute("opacity", seg(t, r.at, r.at + 0.4) * out));
        pick.forEach((p) => { const k = ob(seg(t, p.at, p.at + 0.35)) * out; p.g.setAttribute("transform", `translate(${p.x} ${p.y}) scale(1 ${Math.max(k, 0.001)})`); p.g.setAttribute("opacity", k <= 0.01 ? 0 : 1); });
        posts.forEach((p) => { const k = ob(seg(t, 2.3, 2.65)) * out; p.g.setAttribute("transform", `translate(${p.x} ${FY}) scale(1 ${Math.max(k, 0.001)})`); p.g.setAttribute("opacity", k <= 0.01 ? 0 : 1); });
        const gk = ob(seg(t, 2.45, 2.8)) * out, open = io(seg(t, 3.5, 4.0));
        const ga = 0.94 - 1.6 * open, gb = 0.42 * open, gx = (x) => 275 + x * ga, gy = (x) => FY + x * gb;
        grail.setAttribute("d", [0.3, 0.72].map((r) => `M275 ${FY - FH * r} L${gx(82)} ${gy(82) - FH * r}`).join(" "));
        gpick.forEach((k) => k.n.setAttribute("transform", `translate(${gx(k.x)} ${gy(k.x)}) scale(1 ${Math.max(gk, 0.001)})`));
        gate.setAttribute("opacity", gk <= 0.01 ? 0 : 1);
        const m = io(seg(t, 4.2, 5.3)), sq = Math.sin(seg(t, 5.3, 5.65) * Math.PI) * 0.12;
        parcel.setAttribute("transform", `translate(320 ${510 - 108 * m}) scale(${(1 - 0.12 * m) * (1 + sq)} ${(1 - 0.12 * m) * (1 - sq)})`);
        parcel.setAttribute("opacity", seg(t, 4.2, 4.4) * out);
        const hop = Math.sin(seg(t, 5.3, 5.8) * Math.PI);
        inside.forEach((f, i) => { const k = ob(seg(t, 0.1 + i * 0.1, 0.5 + i * 0.1)); tf(f.g, f.x, 342 - (i === 1 ? 10 * hop : 0), cl(k, 0, 1.2)); });
        const w = now - poked, shake = w >= 0 && w < 0.8 ? Math.sin(w * 32) * 6 * (1 - w / 0.8) : 0;
        tf(outG, 684, 338, 1.2); tf(outF, shake, 0, 1, shake * 0.8);
        cap.textContent = w >= 0 && w < 3.5 ? "“Claude can't reach anything else.”" : t < 4.2 || t >= 10.2 ? "“You choose the folders and tools.”" : "Cowork reads, edits and creates files “in folders you specify”";
      };
    },
  };

  /* ---- title card, 16 by 9: one ring, two keys ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 112, "COMPARISONS", { "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE, "letter-spacing": 3 });
      txt(svg, 64, 200, "Claude Cowork", { "font-size": 74, "font-weight": 700 });
      txt(svg, 64, 286, "vs Claude Code", { "font-size": 74, "font-weight": 700 });
      el("path", { d: "M68 314 H560", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 374, "Which one do you need?", { "font-size": 28, "font-weight": 500, fill: MUTE });
      const pill = el("rect", { x: 64, y: 410, height: 50, rx: 25, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const pt = txt(svg, 88, 443, "Checked 6 Oct 2026", { "font-size": 22, "font-weight": 700 });
      pill.setAttribute("width", pt.getComputedTextLength() + 48);
      const RX = 764, RY = 150;
      const key = (dx, rot, col, art) => {
        const g = el("g", { transform: `translate(${RX + dx} ${RY + 28}) rotate(${rot})` }, svg);
        el("path", { d: "M-11 70 H11 V232 L0 246 L-11 232 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M11 168 H32 V186 H22 V200 H36 V218 H11", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cy: 40, r: 44, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        art(el("g", { transform: "translate(0 48)" }, g));
      };
      key(-34, 20, YEL, (g) => { el("rect", { x: -17, y: -20, width: 34, height: 42, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); el("path", { d: "M-9 -8 H9 M-9 1 H9 M-9 10 H3", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g); });
      key(34, -20, SKY, (g) => { el("rect", { x: -24, y: -18, width: 48, height: 38, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); el("path", { d: "M-13 -7 L-4 1 L-13 9 M2 10 H13", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); });
      el("circle", { cx: RX, cy: RY, r: 44, fill: "none", stroke: INK, "stroke-width": 6 }, svg);
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
