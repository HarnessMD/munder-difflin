/* Bright coded scenes for "Cline alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const SW = 4;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 32, "font-weight": 700, fill: INK }, a), p); n.textContent = s; return n; };
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
  /* shrink a label to fit a width, never below 30 */
  const fit = (n, w, min = 30) => { let s = +n.getAttribute("font-size"); while (n.getComputedTextLength() > w && s > min) { s -= 1; n.setAttribute("font-size", s); } return n; };
  /* break words into lines no wider than w */
  const wrap = (p, x, y, s, w, lh, a = {}) => {
    const probe = txt(p, x, y, "", a), lines = []; let line = "";
    s.split(" ").forEach((word) => { const next = line ? line + " " + word : word; probe.textContent = next; if (probe.getComputedTextLength() > w && line) { lines.push(line); line = word; } else line = next; });
    if (line) lines.push(line); probe.remove();
    return lines.map((l, i) => txt(p, x, y + i * lh, l, a));
  };
  const rr = (p, x, y, w, h, r, a = {}) => el("rect", Object.assign({ x, y, width: w, height: h, rx: r, stroke: INK, "stroke-width": SW }, a), p);

  const SC = {};

  /* ---- 1. a garden rack of seed packets ---- */
  const PICKS = [
    ["Kilo Code", "the closest swap", YEL, LIL],
    ["Munder Difflin", "splitting one job across several agents", BLUE, YEL],
    ["OpenCode", "a terminal agent with an open licence", MINT, BLUE],
    ["Codex", "people who already pay for ChatGPT", LIL, YEL],
    ["Claude Code", "people on an Anthropic plan", SKY, LIL],
    ["Cursor", "the editor and Cursor's own models on one bill", YEL, BLUE],
  ];
  const SKIPS = [["Roo Code", "archived"], ["Continue", "no longer actively maintained"]];
  const leaf = (p, x, y, dir, ink, fill) => el("path", { d: `M${x} ${y} q ${20 * dir} -3 ${27 * dir} -21 q ${-21 * dir} -1 ${-27 * dir} 21 Z`, fill, stroke: ink, "stroke-width": SW, "stroke-linejoin": "round" }, p);
  const flower = (p, cx, base, petal, faded) => {
    const ink = faded ? MUTE : INK;
    el("path", { d: `M${cx - 74} ${base} H${cx + 74}`, stroke: ink, "stroke-width": SW, "stroke-linecap": "round" }, p);
    const g = el("g", {}, p);
    if (!faded) {
      el("path", { d: `M${cx} ${base} V${base - 42}`, stroke: ink, "stroke-width": SW, "stroke-linecap": "round" }, g);
      leaf(g, cx, base - 12, 1, ink, MINT); leaf(g, cx, base - 20, -1, ink, MINT);
      for (let k = 0; k < 6; k++) { const a = (k * 60 * Math.PI) / 180; el("circle", { cx: cx + Math.cos(a) * 14, cy: base - 52 + Math.sin(a) * 14, r: 10, fill: petal, stroke: ink, "stroke-width": SW }, g); }
      el("circle", { cx, cy: base - 52, r: 9, fill: "#fff", stroke: ink, "stroke-width": SW }, g);
    } else {
      el("path", { d: `M${cx} ${base} Q${cx} ${base - 44} ${cx + 26} ${base - 34}`, stroke: ink, "stroke-width": SW, fill: "none", "stroke-linecap": "round" }, g);
      leaf(g, cx, base - 10, -1, ink, SOFT);
      for (let k = 0; k < 5; k++) { const a = ((k * 72 + 20) * Math.PI) / 180; el("circle", { cx: cx + 32 + Math.cos(a) * 11, cy: base - 24 + Math.sin(a) * 11, r: 8, fill: SOFT, stroke: ink, "stroke-width": SW }, g); }
    }
    return g;
  };
  const packet = (p, w, h, num, name, line, col, petal, faded) => {
    const g = el("g", {}, p), ink = faded ? MUTE : INK;
    rr(g, 0, 0, w, h, 20, Object.assign({ fill: faded ? SOFT : col, stroke: ink }, faded ? { "stroke-dasharray": "16 11" } : {}));
    el("path", { d: `M0 58 H${w}`, stroke: ink, "stroke-width": SW }, g);
    const z0 = faded ? 22 : 72; let d = `M${z0} 40`;
    for (let x = z0, up = true; x + 18 <= w - 20; x += 18, up = !up) d += ` L${x + 18} ${up ? 18 : 40}`;
    el("path", { d, stroke: ink, "stroke-width": SW, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
    if (!faded) { el("circle", { cx: 38, cy: 29, r: 22, fill: "#fff", stroke: ink, "stroke-width": SW }, g); txt(g, 38, 40, String(num), { "text-anchor": "middle", "font-size": 30 }); }
    fit(txt(g, w / 2, 113, name, { "text-anchor": "middle", "font-size": 38, fill: ink }), w - 36);
    rr(g, 22, 132, w - 44, 98, 14, { fill: "#fff", stroke: ink });
    const fl = flower(g, w / 2, 216, petal, faded);
    if (!faded) {
      const bf = el("g", {}, g);
      txt(bf, w / 2, 278, "Best for", { "text-anchor": "middle", "font-family": MONO, "font-size": 30 });
      const n = wrap(bf, w / 2, 318, line, w - 40, 38, { "text-anchor": "middle", "font-size": 30, "font-weight": 500 }).length;
      bf.setAttribute("transform", `translate(0 ${(3 - n) * 19})`);
    } else { const ls = wrap(g, w / 2, 0, line, w - 36, 42, { "text-anchor": "middle", "font-size": 32, fill: MUTE }); ls.forEach((n, j) => n.setAttribute("y", 336 - (ls.length - 1) * 21 + j * 42)); }
    return { g, fl, pivot: [w / 2, 216] };
  };
  SC.shelf = {
    w: 1600, h: 1200, dur: 11, still: 8.6,
    build(svg) {
      txt(svg, 60, 116, "Six Cline alternatives, by job", { "font-size": 52 });
      txt(svg, 1388, 116, "Skip", { "text-anchor": "middle", "font-size": 44, fill: MUTE });
      const rack = (x0, x1) => {
        [x0, x1 - 26].forEach((x) => rr(svg, x, 160, 26, 980, 10, { fill: SOFT }));
        [604, 1096].forEach((y) => rr(svg, x0 - 4, y, x1 - x0 + 8, 26, 10, { fill: SOFT }));
      };
      rack(64, 1144); rack(1236, 1540);
      const items = [];
      PICKS.forEach(([n, l, c, pt], i) => {
        const pk = packet(svg, 320, 420, i + 1, n, l, c, pt, false);
        items.push(Object.assign(pk, { x: 100 + (i % 3) * 342, y: i < 3 ? 180 : 672, at: 0.3 + i * 0.62, from: "top" }));
      });
      SKIPS.forEach(([n, l], i) => {
        const pk = packet(svg, 240, 420, 0, n, l, SOFT, SOFT, true);
        items.push(Object.assign(pk, { x: 1268, y: i ? 672 : 180, at: 4.4 + i * 0.6, from: "side" }));
      });
      return (t) => {
        const out = io(seg(t, 10.2, 11));
        items.forEach((it, i) => {
          const k = seg(t, it.at, it.at + (it.from === "top" ? 0.75 : 1));
          const hop = it.from === "top" ? -14 * Math.sin(seg(t, it.at + 0.75, it.at + 1.05) * Math.PI) : 0;
          const sc = it.from === "top" ? 0.86 + 0.14 * oc(k) : 1, W = it.from === "top" ? 320 : 240;
          const dx = it.from === "side" ? 160 * (1 - oc(k)) : (W / 2) * (1 - sc), dy = it.from === "top" ? -30 * (1 - oc(k)) + hop + 420 * (1 - sc) : 0;
          it.g.setAttribute("transform", `translate(${it.x + dx} ${it.y + dy + 30 * out}) scale(${sc})`);
          it.g.setAttribute("opacity", cl(k * 4) * (1 - out));
          if (it.from === "top") { const sw = Math.sin(t * 2.2 + i * 1.3) * 7 * seg(t, it.at + 0.6, it.at + 1.4); it.fl.setAttribute("transform", `rotate(${sw} ${it.pivot[0]} ${it.pivot[1]})`); }
        });
      };
    },
  };

  /* ---- 2. a passport: tap a name to stamp where it runs ---- */
  const WHERE = [
    ["Cline", ["VS Code", "JetBrains", "CLI", "Desktop app", "SDK"]],
    ["Kilo Code", ["VS Code", "JetBrains", "CLI", "Web"]],
    ["Munder Difflin", ["Your own computer"]],
    ["OpenCode", ["Terminal", "Desktop app (beta)"]],
    ["Codex", ["Terminal", "IDE extension", "Desktop app", "Web"]],
    ["Claude Code", ["Terminal", "IDE", "Desktop app", "Web"]],
    ["Cursor", ["Desktop editor", "CLI", "Cloud agents"]],
  ];
  const SPOTS = {
    1: [[1156, 650, 1.3, -3]],
    2: [[990, 560, 1.08, -4], [1316, 800, 1.08, 4]],
    3: [[985, 500, 1, -4], [1327, 500, 1, 3], [1156, 820, 1, -2]],
    4: [[985, 500, 1, -4], [1327, 500, 1, 3], [985, 820, 1, 3], [1327, 820, 1, -3]],
    5: [[985, 465, 0.82, -4], [1327, 465, 0.82, 3], [985, 675, 0.82, 3], [1327, 675, 0.82, -3], [1156, 885, 0.82, -2]],
  };
  SC.map = {
    w: 1600, h: 1200, dur: 18.2, still: 4.8,
    build(svg, api) {
      const P = 2.6;
      txt(svg, 60, 116, "Where it runs", { "font-size": 52 });
      txt(svg, 1540, 112, "Tap a name", { "text-anchor": "end", "font-size": 34, "font-weight": 500, fill: MUTE });
      rr(svg, 64, 156, 1472, 984, 30, { fill: BLUE });
      rr(svg, 90, 176, 1420, 944, 22, { fill: "#fff" });
      el("path", { d: "M800 176 V1120", stroke: INK, "stroke-width": SW }, svg);
      el("path", { d: "M124 332 H768", stroke: MUTE, "stroke-width": SW, "stroke-dasharray": "4 12", "stroke-linecap": "round" }, svg);
      let sel = null, selAt = 0;
      const pick = (i) => { sel = i; selAt = api.now(); api.poke(); };
      const rows = WHERE.map(([name, places], i) => {
        const cy = i === 0 ? 262 : 286 + i * 120, g = el("g", {}, svg);
        const bg = rr(g, 124, cy - 46, 644, 92, 46, { fill: SOFT, stroke: SOFT });
        rr(g, 116, cy - 54, 660, 108, 54, { fill: "none", class: "mg-ring", "stroke-dasharray": "6 8" });
        txt(g, 164, cy + 14, name, { "font-size": 40 });
        const arrow = el("path", { d: `M708 ${cy - 16} L726 ${cy} L708 ${cy + 16}`, stroke: INK, "stroke-width": SW, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        button(g, `${name}: ${places.join(", ")}`, () => pick(i));
        g.addEventListener("keydown", (e) => {
          const s = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
          if (s) { e.preventDefault(); const j = (i + s + WHERE.length) % WHERE.length; rows[j].g.focus(); pick(j); }
        });
        return { g, bg, arrow };
      });
      const head = txt(svg, 1153, 290, "", { "text-anchor": "middle", "font-size": 50 });
      el("path", { d: "M900 326 H1406", stroke: MUTE, "stroke-width": SW, "stroke-dasharray": "4 12", "stroke-linecap": "round" }, svg);
      txt(svg, 1153, 1066, "Checked 19 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      const COLS = [SKY, MINT, LIL, YEL];
      const sets = WHERE.map(([, places]) => {
        const g = el("g", { opacity: 0 }, svg);
        const stamps = places.map((pl, k) => {
          const [x, y, s, r] = SPOTS[places.length][k], sg = el("g", {}, g);
          rr(sg, -150, -112, 300, 224, 28, { fill: COLS[k % 4] });
          rr(sg, -134, -96, 268, 192, 18, { fill: "none", "stroke-dasharray": "10 9" });
          const lines = wrap(sg, 0, 0, pl, 220, 44, { "text-anchor": "middle", "font-size": 38 });
          lines.forEach((n, j) => n.setAttribute("y", 13 - (lines.length - 1) * 22 + j * 44));
          return { g: sg, x, y, s, r };
        });
        return { g, stamps };
      });
      return (t, now) => {
        let i, s, out = 0;
        if (sel != null) { i = sel; s = Math.min(now - selAt, 2.2); }
        else { i = Math.floor(t / P) % WHERE.length; s = t % P; out = seg(s, P - 0.3, P); }
        rows.forEach((r, j) => { const on = j === i; r.bg.setAttribute("fill", on ? YEL : SOFT); r.bg.setAttribute("stroke", on ? INK : SOFT); r.arrow.setAttribute("opacity", on ? 1 : 0); });
        head.textContent = WHERE[i][0];
        head.setAttribute("opacity", oc(seg(s, 0, 0.2)) * (1 - out));
        sets.forEach((st, j) => {
          st.g.setAttribute("opacity", j === i ? 1 - out : 0);
          if (j !== i) return;
          st.stamps.forEach((sp, k) => { const a = 0.2 + k * 0.22, q = seg(s, a, a + 0.24); tf(sp.g, sp.x, sp.y, sp.s * (1 + 0.32 * (1 - oc(q))), sp.r); sp.g.setAttribute("opacity", q > 0 ? cl(q * 3) : 0); });
        });
      };
    },
  };

  /* ---- 3. two clocks that stopped, one that keeps ticking ---- */
  const CLOCKS = [
    { x: 290, name: "Roo Code", l1: "archived", l2: "last push 15 May 2026", ring: LIL, stop: 2, tilt: 4, h0: 300, m0: 0, s0: 0 },
    { x: 800, name: "Continue", l1: "final 2.0.0 release", l2: "read only", ring: BLUE, stop: 4, tilt: -5, h0: 70, m0: 180, s0: 120 },
    { x: 1310, name: "Cline", l1: "a good agent", l2: "Apache 2.0", ring: YEL, stop: 99, tilt: 0, h0: 40, m0: 330, s0: 240 },
  ];
  SC.clock = {
    w: 1600, h: 1200, dur: 12, still: 9.2,
    build(svg) {
      const CY = 500, R = 198, NY = 196;
      txt(svg, 60, 116, "Two projects that stopped", { "font-size": 52 });
      const hand = (p, a) => { const g = el("g", {}, p); el("rect", a, g); return g; };
      const cs = CLOCKS.map((c) => {
        const g = el("g", {}, svg);
        el("path", { d: `M${c.x - 78} ${CY - R + 26} L${c.x} ${NY} L${c.x + 78} ${CY - R + 26}`, stroke: INK, "stroke-width": SW, fill: "none", "stroke-linejoin": "round" }, g);
        el("circle", { cx: c.x, cy: CY, r: R, fill: c.ring, stroke: INK, "stroke-width": SW }, g);
        const face = el("circle", { cx: c.x, cy: CY, r: 162, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        for (let k = 0; k < 12; k++) { const a = (k * 30 * Math.PI) / 180, r0 = k % 3 ? 130 : 112; el("path", { d: `M${c.x + Math.sin(a) * r0} ${CY - Math.cos(a) * r0} L${c.x + Math.sin(a) * 144} ${CY - Math.cos(a) * 144}`, stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, g); }
        const hh = hand(g, { x: -9, y: -92, width: 18, height: 106, rx: 9, fill: INK });
        const mh = hand(g, { x: -6, y: -126, width: 12, height: 140, rx: 6, fill: INK });
        const sh = el("g", {}, g); el("path", { d: "M0 26 V-138", stroke: BLUE, "stroke-width": SW, "stroke-linecap": "round" }, sh);
        el("circle", { cx: c.x, cy: CY, r: 14, fill: YEL, stroke: INK, "stroke-width": SW }, g);
        el("circle", { cx: c.x, cy: NY, r: 11, fill: INK }, svg);
        tf(hh, c.x, CY, 1, c.h0); tf(mh, c.x, CY, 1, c.m0);
        txt(svg, c.x, 806, c.name, { "text-anchor": "middle", "font-size": 48 });
        const l1 = txt(svg, c.x, 862, c.l1, { "text-anchor": "middle", "font-size": 34, "font-weight": 500 });
        const l2 = txt(svg, c.x, 910, c.l2, { "text-anchor": "middle", "font-size": 34, "font-weight": 500, fill: MUTE });
        return { c, g, face, sh, l1, l2 };
      });
      const waves = [[1, 1], [-1, 1]].map(([sx]) => { const g = el("g", {}, svg); [44, 74].forEach((r) => el("path", { d: `M${sx * r * Math.cos(1.05)} ${-r * Math.sin(1.05)} A${r} ${r} 0 0 ${sx > 0 ? 1 : 0} ${sx * r * Math.cos(0.35)} ${-r * Math.sin(0.35)}`, stroke: INK, "stroke-width": SW, fill: "none", "stroke-linecap": "round" }, g)); return { g, sx }; });
      rr(svg, 250, 1004, 1100, 96, 48, { fill: SOFT, stroke: SOFT });
      txt(svg, 800, 1064, "Both still show up in lists; neither is actively maintained.", { "text-anchor": "middle", "font-size": 34, "font-weight": 500 });
      return (t) => {
        const back = io(seg(t, 11.3, 12));
        cs.forEach(({ c, g, face, sh, l1, l2 }) => {
          const stopped = t >= c.stop, f = t - Math.floor(t);
          let a = c.s0 + 30 * (Math.floor(t) + ob(seg(f, 0, 0.22)));
          if (stopped) { const d = t - c.stop; a = c.s0 + 30 * c.stop + Math.sin(d * 38) * 12 * Math.exp(-d * 4.5); }
          tf(sh, c.x, CY, 1, a);
          const k = stopped ? ob(seg(t, c.stop + 0.3, c.stop + 1.1)) * (1 - back) : 0;
          g.setAttribute("transform", `rotate(${c.tilt * k} ${c.x} ${NY})`);
          face.setAttribute("fill", stopped && back < 0.5 ? SOFT : "#fff");
          if (c.stop < 99) { const o = stopped ? oc(seg(t, c.stop, c.stop + 0.6)) * (1 - back) : 0; l1.setAttribute("opacity", o); l2.setAttribute("opacity", o); }
        });
        const f = t - Math.floor(t), p = oc(seg(f, 0, 0.35));
        waves.forEach((w) => { tf(w.g, 1310 + w.sx * 142, CY - 142, 0.8 + 0.3 * p); w.g.setAttribute("opacity", f < 0.75 ? 1 : 0); });
      };
    },
  };

  /* ---- title card, 16 by 9: two dice, six picks and two to skip ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 1, still: 0,
    build(svg) {
      rr(svg, 100, 190, 560, 64, 32, { fill: SOFT, stroke: SOFT });
      txt(svg, 380, 233, "6 picks and 2 names to skip", { "text-anchor": "middle", "font-family": MONO, "font-size": 30 });
      txt(svg, 94, 420, "Cline", { "font-size": 150 });
      txt(svg, 94, 566, "alternatives", { "font-size": 150 });
      el("path", { d: "M104 612 H640", stroke: YEL, "stroke-width": 20, "stroke-linecap": "round" }, svg);
      txt(svg, 100, 700, "Checked 19 Oct 2026", { "font-size": 42, "font-weight": 500, fill: MUTE });
      const die = (cx, cy, s, r, fill, back, ink, pips, pip) => {
        const g = el("g", {}, svg);
        rr(g, -s / 2 + 18, -s / 2 + 18, s, s, s * 0.16, { fill: back, stroke: ink });
        rr(g, -s / 2, -s / 2, s, s, s * 0.16, { fill, stroke: ink });
        pips.forEach(([x, y]) => el("circle", { cx: x * s, cy: y * s, r: s * 0.075, fill: pip }, g));
        tf(g, cx, cy, 1, r);
      };
      el("ellipse", { cx: 1270, cy: 612, rx: 150, ry: 20, fill: SOFT }, svg);
      el("ellipse", { cx: 1400, cy: 822, rx: 110, ry: 16, fill: SOFT }, svg);
      die(1280, 400, 290, -12, YEL, BLUE, INK, [[-0.24, -0.27], [-0.24, 0], [-0.24, 0.27], [0.24, -0.27], [0.24, 0], [0.24, 0.27]], INK);
      die(1400, 704, 180, 16, SOFT, "#fff", MUTE, [[-0.22, -0.22], [0.22, 0.22]], MUTE);
      [[1086, 236, 1046, 214], [1108, 200, 1080, 164], [1146, 184, 1138, 142], [1462, 196, 1488, 160], [1494, 232, 1532, 214]].forEach(([x1, y1, x2, y2]) => el("path", { d: `M${x1} ${y1} L${x2} ${y2}`, stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, svg));
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
