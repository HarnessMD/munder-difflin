/* Bright coded scenes for "ZCode, explained". Vanilla JS, no library.
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

  const chip = (g, s, a = {}) => {
    const r = el("rect", { y: -22, height: 44, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, g), t = txt(g, 0, 8, s, Object.assign({ "text-anchor": "middle", "font-size": 24, "font-weight": 700 }, a));
    const w = t.getComputedTextLength() + 40; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return { r, t, w };
  };

  const SC = {};

  /* ---- 1. a deck of three cards fans open on a table: desktop, browser, terminal ---- */
  SC.fan = {
    dur: 10.4, still: 5.6,
    build(svg, api) {
      txt(svg, 44, 62, "One repo, three interfaces", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "per the ZCode README", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 756, 62, "tap the deck", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("rect", { x: 40, y: 122, width: 720, height: 376, rx: 40, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const PX = 400, PY = 606, deck = el("g", {}, svg);
      el("rect", { x: 54, y: 136, width: 692, height: 348, rx: 28, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", "stroke-linecap": "round", class: "mg-ring" }, deck);
      const ICON = [
        (g) => { el("rect", { x: -30, y: -374, width: 60, height: 40, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M0 -334 V-322 M-18 -322 H18", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); },
        (g) => { el("rect", { x: -32, y: -374, width: 64, height: 52, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-32 -358 H32", stroke: INK, "stroke-width": 3 }, g); [-22, -12].forEach((x) => el("circle", { cx: x, cy: -366, r: 2.6, fill: INK }, g)); },
        (g) => { el("rect", { x: -32, y: -374, width: 64, height: 52, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-18 -360 L-7 -349 L-18 -338 M0 -336 H18", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); },
      ];
      const cards = [["desktop", YEL], ["browser", SKY], ["terminal", LIL]].map(([name, col], i) => {
        const g = el("g", {}, deck);
        el("rect", { x: -90, y: -455, width: 180, height: 250, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, -414, name, { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
        el("rect", { x: -56, y: -400, width: 112, height: 104, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, g);
        ICON[i](g);
        el("path", { d: "M0 -272 L18 -250 L0 -228 L-18 -250 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        return g;
      });
      let last = 0;
      button(deck, "Fan the deck open, or close it back into one deck", () => api.seek(last > 1.6 && last < 7.8 ? 7.8 : 1.2));
      const cap = strip(svg, 518, 740);
      return (t) => {
        last = t;
        const shut = io(seg(t, 7.8, 8.8));
        let open = 0;
        cards.forEach((g, i) => {
          const o = ob(seg(t, 1.2 + (2 - i) * 0.12, 2.2 + (2 - i) * 0.12)) - shut;
          open = Math.max(open, o);
          g.setAttribute("transform", `translate(${PX + (i - 1) * 3 * (1 - cl(o))} ${PY - (i - 1) * 3 * (1 - cl(o))}) rotate(${(i - 1) * 30 * o})`);
        });
        cap.textContent = open > 0.5 ? "“an AI coding workspace with desktop, browser, and terminal interfaces”" : "One repo: zai-org/ZCode, Apache-2.0";
      };
    },
  };

  /* ---- 2. a radio dial clicks through 20 stops and pauses on three named ones ---- */
  SC.dial = {
    dur: 12.6, still: 11.4,
    build(svg, api) {
      txt(svg, 44, 62, "20 provider templates", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "in zcode-builtin.json, read from GitHub on 8 Oct 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 756, 62, "tap the dial", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const CX = 400, CY = 314, N = 20, NAMED = { 2: ["Z.ai", YEL], 8: ["OpenAI", SKY], 14: ["Anthropic", MINT] };
      const dial = el("g", {}, svg);
      el("circle", { cx: CX, cy: CY, r: 180, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", "stroke-linecap": "round", class: "mg-ring" }, dial);
      el("circle", { cx: CX, cy: CY, r: 170, fill: "#fff", stroke: INK, "stroke-width": 3 }, dial);
      const pt = (k, r) => { const a = (k / N) * 6.2832; return [CX + Math.sin(a) * r, CY - Math.cos(a) * r]; };
      const stops = Array.from({ length: N }, (_, k) => {
        if (NAMED[k]) { const [x, y] = pt(k, 147); return el("circle", { cx: x, cy: y, r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, dial); }
        const [x1, y1] = pt(k, 138), [x2, y2] = pt(k, 156);
        return el("path", { d: `M${x1} ${y1} L${x2} ${y2}`, stroke: LIL, "stroke-width": 5, "stroke-linecap": "round" }, dial);
      });
      const knob = el("g", {}, dial);
      el("circle", { r: 112, fill: SOFT, stroke: INK, "stroke-width": 3 }, knob);
      Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * 6.2832; if (i) el("circle", { cx: Math.sin(a) * 96, cy: -Math.cos(a) * 96, r: 3.5, fill: LIL }, knob); });
      el("path", { d: "M0 -130 L14 -100 H-14 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, knob);
      el("circle", { cx: CX, cy: CY, r: 68, fill: "#fff", stroke: INK, "stroke-width": 3 }, dial);
      txt(dial, CX, CY + 12, "20", { "text-anchor": "middle", "font-size": 64, "font-weight": 700 });
      txt(dial, CX, CY + 40, "stops", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      const tags = Object.keys(NAMED).map((k) => {
        const [x, y] = pt(+k, 147), left = x < CX, g = el("g", {}, svg), c = chip(g, NAMED[k][0]);
        const cx = left ? x - 62 - c.w / 2 : x + 62 + c.w / 2;
        el("path", { d: `M${left ? x - 14 : x + 14} ${y} H${left ? cx + c.w / 2 : cx - c.w / 2}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
        return { g, c, cx, y, k: +k, col: NAMED[k][1] };
      });
      const start = [0], pause = {};
      let tt = 0.8;
      for (let k = 1; k <= N; k++) { start[k] = tt; tt += 0.26; if (NAMED[k]) { pause[k] = tt; tt += 1.5; } }
      const END = tt;
      let last = 0;
      button(dial, "Turn the dial to the next named stop", () => { const ks = Object.keys(pause).map(Number), nx = ks.find((k) => start[k] > last + 0.05); api.seek(start[nx == null ? ks[0] : nx]); });
      const cap = strip(svg, 514, 740);
      return (t) => {
        last = t;
        const back = io(seg(t, 12.0, 12.5));
        let ang = 0;
        for (let k = 1; k <= N; k++) ang += ob(seg(t, start[k], start[k] + 0.22)) * 18;
        knob.setAttribute("transform", `translate(${CX} ${CY}) rotate(${ang * (1 - back)})`);
        stops.forEach((s, k) => {
          const on = t >= start[k === 0 ? N : k] + 0.16 && t < 12.0;
          if (NAMED[k]) s.setAttribute("fill", on ? NAMED[k][1] : "#fff"); else s.setAttribute("stroke", on ? INK : LIL);
        });
        tags.forEach((g) => {
          const on = t >= pause[g.k] - 0.1 && t < 12.0, p = Math.sin(seg(t, pause[g.k] - 0.1, pause[g.k] + 0.3) * Math.PI);
          tf(g.g, g.cx, g.y, 1 + 0.12 * p);
          g.c.r.setAttribute("fill", on ? g.col : "#fff");
        });
        cap.textContent = t >= END && t < 12.0 ? "We found no Ollama entry in that file" : t >= pause[8] - 0.1 && t < 12.0 ? "OpenAI and Anthropic are among the 20 templates" : t >= pause[2] - 0.1 && t < 12.0 ? "The Z.ai Coding Plan template names GLM-5.3 and GLM-5.3-Flash" : "20 stops, one per provider template";
      };
    },
  };

  /* ---- 3. an abacus: one rod per plan, beads slid across for 1, 6 and 14 times Lite usage ---- */
  SC.abacus = {
    dur: 11.6, still: 9,
    build(svg) {
      txt(svg, 44, 62, "Usage as listed, plan by plan", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "GLM Coding Plan on zcode.z.ai, 8 Oct 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const FX = 214, FW = 546, FY = 124, RH = 124, BW = 25, L = FX + 22, R = FX + FW - 22;
      el("rect", { x: FX, y: FY, width: FW, height: RH * 3, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${FX + 3} ${FY + RH} H${FX + FW - 3} M${FX + 3} ${FY + RH * 2} H${FX + FW - 3}`, stroke: SOFT, "stroke-width": 3 }, svg);
      const ROWS = [["Lite", "$12.6 / month", 1, "10,000 credits / week", YEL, 1.0, 0.2], ["Pro", "$56 / month", 6, "6× Lite usage", SKY, 2.4, 0.2], ["Max", "$117.6 / month", 14, "14× Lite usage", LIL, 4.4, 0.16]];
      const rows = ROWS.map(([name, price, n, use, col, t0, gap], r) => {
        const y = FY + r * RH, ry = y + 46;
        txt(svg, 40, y + 50, name, { "font-size": 32, "font-weight": 700 });
        txt(svg, 40, y + 82, price, { "font-size": 20, "font-weight": 500 });
        el("path", { d: `M${FX} ${ry} H${FX + FW}`, stroke: INK, "stroke-width": 3 }, svg);
        const beads = Array.from({ length: 14 }, (_, i) => ({ n: el("rect", { x: -BW / 2 + 1.5, y: -27, width: BW - 3, height: 54, rx: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg), a: L + BW / 2 + i * BW, b: R - BW / 2 - (13 - i) * BW, d: i < n ? t0 + i * gap : null }));
        const lab = txt(svg, L, y + 106, use, { "font-size": 22, "font-weight": 700 });
        return { beads, lab, ry, col, done: t0 + (n - 1) * gap + 0.4 };
      });
      const cap = strip(svg, 516, 740);
      cap.textContent = "The page adds: “Prices and plan benefits may change.”";
      return (t) => {
        const back = io(seg(t, 10.4, 11.3));
        rows.forEach((row) => {
          row.beads.forEach((b) => {
            const k = b.d == null ? 0 : io(seg(t, b.d, b.d + 0.4)) * (1 - back);
            tf(b.n, b.b + (b.a - b.b) * k, row.ry);
            b.n.setAttribute("fill", k > 0.5 ? row.col : "#fff");
          });
          const p = oc(seg(t, row.done, row.done + 0.4)) * (1 - seg(t, 10.3, 10.6));
          row.lab.setAttribute("opacity", p); row.lab.setAttribute("transform", `translate(${-14 * (1 - p)} 0)`);
        });
      };
    },
  };

  /* ---- 4. seven dominoes tip over in turn, SessionStart first, Stop last ---- */
  SC.dominoes = {
    dur: 9.8, still: 3.4,
    build(svg, api) {
      txt(svg, 44, 62, "Seven hook events", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "NOTICE.md lists seven lifecycle events", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 756, 62, "tap the first domino", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const G = 432, DW = 32, DH = 204, D = 68, X0 = 132, n = 7, RAD = Math.PI / 180;
      el("path", { d: `M36 ${G} H764`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const COL = [YEL, SKY, LIL, MINT, BLUE, SKY, YEL];
      const ball = el("circle", { r: 15, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const ds = Array.from({ length: n }, (_, i) => {
        const g = el("g", {}, svg);
        if (!i) el("rect", { x: -DW - 8, y: -DH - 8, width: DW + 16, height: DH + 16, rx: 12, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", "stroke-linecap": "round", class: "mg-ring" }, g);
        el("rect", { x: -DW, y: -DH, width: DW, height: DH, rx: 7, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        for (let j = 0; j <= i; j++) el("circle", { cx: -DW / 2, cy: -DH + 23 + j * 26, r: 5.5, fill: INK }, g);
        return g;
      });
      button(ds[0], "Tip the seven dominoes over again", () => api.seek(0.3));
      [[0, "SessionStart"], [n - 1, "Stop"]].forEach(([i, s]) => {
        const x = X0 + i * D - DW / 2;
        el("path", { d: `M${x} ${G + 10} V${G + 22}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
        txt(svg, x, G + 52, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      });
      const fits = (a, b) => {
        const px = DH * Math.sin(a), py = DH * Math.cos(a), bx = D - DW * Math.cos(b), by = DW * Math.sin(b);
        const along = (px - bx) * Math.sin(b) + (py - by) * Math.cos(b), side = (px - bx) * Math.cos(b) - (py - by) * Math.sin(b);
        if (along <= DH) return side <= 0.3;
        return (bx + DH * Math.sin(b)) * Math.cos(a) - (by + DH * Math.cos(b)) * Math.sin(a) >= -0.3;
      };
      const cap = strip(svg, 516, 740);
      cap.textContent = "From SessionStart to Stop, per NOTICE.md (our translation)";
      return (t) => {
        const up = 1 - io(seg(t, 8.4, 9.4));
        const roll = seg(t, 0.3, 1.0), bx = 30 + (X0 - DW - 16 - 30) * roll * roll - 22 * oc(seg(t, 1.0, 1.8)) * up - 0;
        ball.setAttribute("cx", t > 8.4 ? 30 + (bx - 30) * up : bx); ball.setAttribute("cy", G - 16.5);
        ball.setAttribute("opacity", seg(t, 0.3, 0.45));
        let next = null;
        for (let i = n - 1; i >= 0; i--) {
          const k = seg(t, 1.0 + i * 0.34, 1.9 + i * 0.34);
          let a = 90 * k * k * RAD;
          if (next != null && !fits(a, next)) { let lo = 0, hi = a; for (let j = 0; j < 22; j++) { const m = (lo + hi) / 2; if (fits(m, next)) lo = m; else hi = m; } a = lo; }
          next = a;
          ds[i].setAttribute("transform", `translate(${X0 + i * D} ${G}) rotate(${(a / RAD) * up})`);
        }
      };
    },
  };

  /* ---- title card, 16 by 9: a paper kite on a string ---- */
  SC.hero = {
    w: 960, h: 540, dur: 8, still: 2,
    build(svg) {
      const kg = el("g", { transform: "translate(64 62)" }, svg);
      const kr = el("rect", { x: 0, y: 0, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, kg);
      const kt = txt(kg, 20, 28, "Explainer", { "font-size": 22, "font-weight": 700 });
      kr.setAttribute("width", kt.getComputedTextLength() + 40);
      const title = txt(svg, 58, 262, "ZCode", { "font-size": 150, "font-weight": 700 });
      el("path", { d: `M66 296 H${58 + title.getComputedTextLength() - 8}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 356, "Checked 8 Oct 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const G = 478;
      el("path", { d: `M64 ${G} H896`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const cloud = (x, y, s) => { const g = el("g", { transform: `translate(${x} ${y}) scale(${s})` }, svg); el("path", { d: "M-50 16 a22 22 0 0 1 8 -43 a30 30 0 0 1 56 -8 a24 24 0 0 1 34 51 Z", fill: SOFT, stroke: INK, "stroke-width": 3 / s, "stroke-linejoin": "round" }, g); return g; };
      const c1 = cloud(560, 96, 1), c2 = cloud(868, 268, 0.8);
      const SX = 600, SY = G - 26;
      const string = el("path", { stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      el("rect", { x: SX - 30, y: SY - 26, width: 60, height: 52, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${SX - 30} ${SY - 10} H${SX + 30} M${SX - 30} ${SY + 6} H${SX + 30}`, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: SX - 40, y: SY - 34, width: 80, height: 10, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: SX - 40, y: SY + 24, width: 80, height: 10, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const tail = el("path", { stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg);
      const bows = [BLUE, MINT, LIL].map((c) => { const g = el("g", {}, svg); el("path", { d: "M0 0 L-17 -11 V11 Z M0 0 L17 -11 V11 Z", fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g); return g; });
      const kite = el("g", {}, svg);
      [["M0 -112 L78 -22 L0 -22 Z", YEL], ["M0 -112 L-78 -22 L0 -22 Z", SKY], ["M-78 -22 L0 124 L0 -22 Z", LIL], ["M78 -22 L0 124 L0 -22 Z", MINT]].forEach(([d, c]) => el("path", { d, fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, kite));
      return (t) => {
        const w = (t / 8) * 6.2832, kx = 716 + Math.sin(w) * 10, ky = 178 + Math.sin(w * 2 + 1) * 7, rot = 20 + Math.sin(w + 0.6) * 4, r = (rot * Math.PI) / 180;
        tf(kite, kx, ky, 1, rot);
        const P = (x, y) => [kx + x * Math.cos(r) - y * Math.sin(r), ky + x * Math.sin(r) + y * Math.cos(r)];
        const [bx, by] = P(0, 124), [hx, hy] = P(0, 10);
        string.setAttribute("d", `M${SX + 6} ${SY - 34} Q${SX - 6} ${(SY + hy) / 2 - 10} ${hx} ${hy}`);
        const pts = Array.from({ length: 25 }, (_, i) => { const u = i / 24; return [bx + 30 * u + 80 * u * u + Math.sin(u * 7 - w * 2) * 13 * u, by + 140 * u - 14 * u * u]; });
        tail.setAttribute("d", "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L"));
        bows.forEach((b, i) => { const j = 7 + i * 7, p = pts[j], q = pts[j - 1]; tf(b, p[0], p[1], 1, (Math.atan2(p[1] - q[1], p[0] - q[0]) * 180) / Math.PI + 90); });
        c1.setAttribute("transform", `translate(${560 + Math.sin(w) * 10} 96)`); c2.setAttribute("transform", `translate(${868 - Math.sin(w) * 8} 268) scale(0.8)`);
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
