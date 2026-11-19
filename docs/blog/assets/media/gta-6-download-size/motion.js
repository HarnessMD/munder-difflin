/* Isometric infographic scenes for "GTA 6 download size". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", NAVY = "#22305E", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 40, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r}) scale(${s.toFixed(4)})`);
  const op = (n, v) => n.setAttribute("opacity", cl(v).toFixed(3));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* a value that eases to its target with a small overshoot, driven by the wall clock */
  const tween = (dur = 0.5, ease = ob) => { let a = 0, b = 0, t0 = -99; return { to(v, now) { a = this.at(now); b = v; t0 = now; }, at(now) { return lerp(a, b, calm ? 1 : ease(seg(now - t0, 0, dur))); }, target() { return b; } }; };

  /* ---- colour: three tones of one hue (top light, left mid, right dark) ---- */
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, "0")).join(""); };
  const tone = (c) => ({ top: mix(c, "#FFFFFF", 0.52), left: c, right: mix(c, NAVY, 0.27) });
  const T = { sky: tone(SKY), blue: tone(BLUE), lil: tone(LIL), mint: tone(MINT), plate: { top: "#FFFFFF", left: mix(LIL, "#FFFFFF", 0.42), right: LIL } };
  const GRID = mix(LIL, "#FFFFFF", 0.5);

  /* ---- isometric projection, 30 degree axes; o = { x, y, s } ---- */
  const CS = Math.cos(Math.PI / 6);
  const pr = (o, x, y, z) => [o.x + (x - y) * o.s * CS, o.y + (x + y) * o.s * 0.5 - z * o.s];
  const pts = (o, a) => a.map((p) => { const q = pr(o, p[0], p[1], p[2]); return q[0].toFixed(1) + "," + q[1].toFixed(1); }).join(" ");
  const mkBox = (p, hue, sw = 2.8) => {
    const g = el("g", {}, p), a = { stroke: INK, "stroke-width": sw, "stroke-linejoin": "round" };
    const L = el("polygon", Object.assign({ fill: hue.left }, a), g), R = el("polygon", Object.assign({ fill: hue.right }, a), g), Tp = el("polygon", Object.assign({ fill: hue.top }, a), g);
    return {
      g,
      set(o, x, y, z, w, d, h) {
        if (h < 0.004) { g.setAttribute("display", "none"); return; }
        g.removeAttribute("display");
        Tp.setAttribute("points", pts(o, [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]]));
        L.setAttribute("points", pts(o, [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]));
        R.setAttribute("points", pts(o, [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]));
      },
    };
  };
  const mkShade = (p, o2 = 0.42) => { const n = el("polygon", { fill: LIL, opacity: o2 }, p); return { n, set(o, x, y, w, d) { n.setAttribute("points", pts(o, [[x, y, 0], [x + w, y, 0], [x + w, y + d, 0], [x, y + d, 0]])); } }; };
  const mkPlate = (p, gridOn = true) => {
    const sh = el("polygon", { fill: LIL, opacity: 0.36, transform: "translate(0 28)" }, p);
    const box = mkBox(p, T.plate, 3), grid = el("path", { stroke: GRID, "stroke-width": 1.6, fill: "none" }, p);
    return {
      set(o, w, d, th = 0.42) {
        sh.setAttribute("points", pts(o, [[0, 0, -th], [w, 0, -th], [w, d, -th], [0, d, -th]]));
        box.set(o, 0, 0, -th, w, d, th);
        if (!gridOn) return;
        let s = "";
        const ln = (a, b) => { const A = pr(o, a[0], a[1], 0), B = pr(o, b[0], b[1], 0); s += `M${A[0].toFixed(1)} ${A[1].toFixed(1)}L${B[0].toFixed(1)} ${B[1].toFixed(1)}`; };
        for (let i = 1; i < w - 0.05; i++) ln([i, 0], [i, d]);
        for (let j = 1; j < d - 0.05; j++) ln([0, j], [w, j]);
        grid.setAttribute("d", s);
      },
    };
  };

  /* ---- page furniture: soft ground with a 30 degree grid, labels, leaders, chips ---- */
  const ground = (svg, W, H, fill, cx, cy, r) => {
    el("rect", { width: W, height: H, fill }, svg);
    const id = "mgd" + (++uid), defs = el("defs", {}, svg), rg = el("radialGradient", { id, gradientUnits: "userSpaceOnUse", cx, cy, r }, defs);
    el("stop", { offset: 0, "stop-color": "#fff", "stop-opacity": 1 }, rg); el("stop", { offset: 0.55, "stop-color": "#fff", "stop-opacity": 0.75 }, rg); el("stop", { offset: 1, "stop-color": "#fff", "stop-opacity": 0 }, rg);
    const mk = el("mask", { id: id + "m", maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H }, defs);
    el("rect", { width: W, height: H, fill: `url(#${id})` }, mk);
    const k = Math.tan(Math.PI / 6), step = 66; let d = "";
    for (let y = -W * k; y < H + W * k; y += step) d += `M0 ${y.toFixed(1)}L${W} ${(y + W * k).toFixed(1)}M0 ${(y + W * k).toFixed(1)}L${W} ${y.toFixed(1)}`;
    const wrap = el("g", { mask: `url(#${id}m)` }, svg);
    return el("path", { d, stroke: LIL, "stroke-opacity": 0.34, "stroke-width": 1.6, fill: "none" }, wrap);
  };
  const mw = (s, fs) => s.length * fs * 0.6;
  const chip = (p, label, fs = 30, fill = YEL, pad = 30) => {
    const g = el("g", {}, p), w = mw(label, fs) + pad * 2, h = fs * 2.3;
    el("rect", { x: -w / 2 + 7, y: -h / 2 + 9, width: w, height: h, rx: h / 2, fill: LIL, opacity: 0.55 }, g);
    const r = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill, stroke: INK, "stroke-width": 3 }, g);
    const t = txt(g, 0, fs * 0.35, label, { "text-anchor": "middle", "font-family": MONO, "font-size": fs, "font-weight": 700 });
    return { g, r, t, w, h };
  };
  const leader = (p) => {
    const path = el("path", { stroke: INK, "stroke-width": 2.6, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1 }, p), dot = el("circle", { r: 6.5, fill: INK }, p);
    return {
      path,
      set(ps, k) {
        path.setAttribute("d", "M" + ps.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L"));
        path.setAttribute("stroke-dasharray", k >= 1 ? "none" : "1 1"); path.setAttribute("stroke-dashoffset", (1 - k).toFixed(3));
        op(path, k <= 0 ? 0 : 1); tf(dot, ps[0][0], ps[0][1], cl(ob(seg(k, 0, 0.5)), 0, 1.3)); op(dot, k <= 0 ? 0 : 1);
      },
    };
  };
  const heading = (svg, title, hint) => {
    txt(svg, 64, 118, title, { "font-size": 62, "font-weight": 700 });
    el("path", { d: "M68 150 H212", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
    if (hint) txt(svg, 1536, 104, hint, { "text-anchor": "end", "font-family": MONO, "font-size": 25, "font-weight": 500, fill: MUTE });
  };
  /* the loop ends by letting the whole stage sink and fade, so the replay starts clean */
  const leave = (root, t, dur) => { const x = io(seg(t, dur - 0.7, dur - 0.05)); op(root, 1 - x); root.setAttribute("transform", `translate(0 ${(22 * x).toFixed(1)})`); };

  const SC = {};

  /* ---- 1. footprint: 212 GB on a 512GB plate, tap for a 1TB plate ---- */
  SC.footprint = {
    dur: 10.6, still: 8.4,
    build(svg, api) {
      ground(svg, 1600, 1200, SOFT, 800, 640, 900);
      heading(svg, "Share of the drive", "Tapping the plate swaps it");
      const root = el("g", {}, svg), O = { x: 800, y: 400, s: 44 }, TW = 8, TD = 5, TH = 3;
      const hit = el("g", {}, root), stage = el("g", {}, hit), lift = el("g", { class: "mg-lift" }, stage);
      const plate = mkPlate(lift), shade = mkShade(lift);
      const cells = [];
      for (let i = 0; i < TW; i++) for (let j = 0; j < TD; j++) cells.push({ i, j });
      cells.sort((a, b) => a.i + a.j - (b.i + b.j) || a.i - b.i);
      cells.forEach((c) => { c.box = mkBox(lift, (c.i + c.j) % 2 ? T.blue : T.sky, 1.5); });
      const hull = el("polygon", { fill: "none", stroke: INK, "stroke-width": 3.4, "stroke-linejoin": "round" }, lift);
      const ridge = el("path", { fill: "none", stroke: INK, "stroke-width": 3.4, "stroke-linecap": "round" }, lift);
      const ring = el("polygon", { fill: "none", stroke: BLUE, "stroke-width": 7, "stroke-linejoin": "round", "stroke-dasharray": "4 16", "stroke-linecap": "round", class: "mg-ring" }, hit);
      /* labels */
      const pl = leader(root), plA = txt(root, 120, 1000, "512GB Series S", { "font-family": MONO, "font-size": 34, "font-weight": 700 }), plB = txt(root, 120, 1000, "1TB", { "font-family": MONO, "font-size": 34, "font-weight": 700 });
      const tl = leader(root), tlT = txt(root, 1078, 318, "212 GB", { "font-size": 56, "font-weight": 700 });
      const marks = [0, 1, 2, 3, 4].map((i) => {
        const g = el("g", {}, root), d = "M0 -17 L30 0 L0 17 L-30 0 Z";
        el("path", { d, fill: LIL, opacity: 0.5, transform: "translate(4 6)" }, g);
        el("path", { d, fill: "#fff", stroke: INK, "stroke-width": 2.6, "stroke-linejoin": "round" }, g);
        const f = el("path", { d, fill: i % 2 ? T.sky.left : BLUE, stroke: INK, "stroke-width": 2.6, "stroke-linejoin": "round" }, g);
        return { g, f, x: 1250 + (i - 2) * 76 };
      });
      const cp = chip(root, "41 percent of the drive", 30), cpB = txt(cp.g, 0, 10.5, "a smaller share", { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });
      let mode = 0, pFrom = 0, tSwap = -99, userT = -1;
      const pNow = (now) => lerp(pFrom, mode, io(calm ? 1 : seg(now - tSwap, 0, 0.9)));
      const swap = (to, now) => { pFrom = pNow(now); mode = to; tSwap = now; };
      button(hit, "Swap the 512GB Series S plate for a 1TB plate", () => { const now = api.now(); swap(1 - mode, now); userT = now; api.hold(); });
      return (t, now) => {
        if (userT > 0 && now - userT > 7) { userT = -1; if (mode) swap(0, now); api.seek(SC.footprint.dur - 0.7); return; }
        const sw = calm ? 1 : seg(now - tSwap, 0, 0.9), p = pNow(now), hop = pFrom !== mode ? Math.sin(Math.PI * sw) * 0.55 : 0, n = 10 + 4 * p;
        stage.setAttribute("transform", `translate(0 ${(70 * (1 - ob(seg(t, 0.1, 0.8)))).toFixed(1)})`); op(stage, seg(t, 0.1, 0.4));
        plate.set(O, n, n);
        shade.set(O, TW, 0, 1.15 * oc(seg(t, 2.9, 4.2)) * (1 - hop), TD); op(shade.n, 0.42 * seg(t, 2.9, 3.3));
        cells.forEach((c) => { const d0 = 1.2 + (c.i + c.j) * 0.2; c.box.set(O, c.i, c.j, hop, 1, 1, TH * ob(seg(t, d0, d0 + 0.7))); });
        const z0 = hop, z1 = hop + TH;
        hull.setAttribute("points", pts(O, [[0, 0, z1], [TW, 0, z1], [TW, 0, z0], [TW, TD, z0], [0, TD, z0], [0, TD, z1]]));
        const c = pr(O, TW, TD, z1), a1 = pr(O, TW, 0, z1), a2 = pr(O, 0, TD, z1), a3 = pr(O, TW, TD, z0);
        ridge.setAttribute("d", `M${c[0]} ${c[1]}L${a1[0]} ${a1[1]}M${c[0]} ${c[1]}L${a2[0]} ${a2[1]}M${c[0]} ${c[1]}L${a3[0]} ${a3[1]}`);
        op(hull, seg(t, 4.0, 4.35)); op(ridge, seg(t, 4.0, 4.35));
        ring.setAttribute("points", pts(O, [[-0.7, -0.7, 0], [n + 0.7, -0.7, 0], [n + 0.7, n + 0.7, 0], [-0.7, n + 0.7, 0]]));
        const e = pr(O, n / 2, n, -0.42);
        pl.set([e, [e[0], 988], [426, 988]], oc(seg(t, 0.8, 1.3)));
        const lk = oc(seg(t, 1.1, 1.5)); op(plA, lk * (1 - seg(p, 0.3, 0.5))); op(plB, lk * seg(p, 0.5, 0.7));
        plA.setAttribute("transform", `translate(${(-24 * (1 - lk)).toFixed(1)} 0)`);
        const q = pr(O, 6.2, 1, z1);
        tl.set([q, [q[0], 300], [1060, 300]], oc(seg(t, 4.3, 4.8)));
        const tk = seg(t, 4.65, 5.05); op(tlT, tk); tlT.setAttribute("transform", `translate(${(26 * (1 - oc(tk))).toFixed(1)} 0)`);
        marks.forEach((m, i) => {
          const k = seg(t, 5.2 + i * 0.09, 5.55 + i * 0.09); tf(m.g, m.x, 1086, k <= 0 ? 0.001 : ob(k)); op(m.g, k * 4);
          op(m.f, (i === 0 ? 1 : i === 1 ? 1 - seg(p, 0.4, 0.6) : 0) * seg(t, 7.0 + i * 0.14, 7.25 + i * 0.14));
        });
        const ck = seg(t, 6.4, 6.95); tf(cp.g, 1250, 985 - 70 * (1 - oc(ck)), ck <= 0 ? 0.001 : 0.7 + 0.3 * ob(ck)); op(cp.g, seg(t, 6.4, 6.6));
        op(cp.t, 1 - seg(p, 0.3, 0.5)); op(cpB, seg(p, 0.5, 0.7));
        leave(root, t, SC.footprint.dur);
      };
    },
  };

  /* ---- 2. towers: four speeds, four download times, one hour per block ---- */
  SC.towers = {
    dur: 10.8, still: 8.6,
    build(svg, api) {
      ground(svg, 1600, 1200, SOFT, 640, 700, 900);
      heading(svg, "Download time", "Tapping a tower lifts it");
      const root = el("g", {}, svg), O = { x: 300, y: 640, s: 56 }, UNIT = 480 / 56 / 1131, HB = 60 * UNIT;
      const stage = el("g", {}, root), plate = mkPlate(stage);
      const D = [
        { l: "25 Mbps", time: "18 h 51 min", min: 1131, hue: T.sky, x: 0.8, t0: 0.9, row: 266 },
        { l: "100 Mbps", time: "4 h 43 min", min: 283, hue: T.blue, x: 3.9, t0: 3.2, row: 445 },
        { l: "500 Mbps", time: "57 min", min: 57, hue: T.lil, x: 7.0, t0: 4.2, row: 620 },
        { l: "1,000 Mbps", time: "28 min", min: 28, hue: T.mint, x: 10.1, t0: 5.0, row: 795 },
      ];
      let sel = -1, userT = -1;
      D.forEach((d, i) => {
        d.nb = Math.ceil(d.min / 60); d.h = d.min * UNIT; d.done = d.t0 + (d.nb - 1) * 0.09 + 0.45; d.lv = tween(0.5); d.hi = tween(0.4); d.dim = tween(0.3, oc);
        const g = el("g", {}, root); d.g = g;
        d.foot = mkShade(g, 0.5); d.shade = mkShade(g);
        const lf = el("g", { class: "mg-lift" }, g);
        d.boxes = Array.from({ length: d.nb }, (_, k) => ({ box: mkBox(lf, d.hue, 2.2), h: k < d.nb - 1 ? HB : d.h - HB * (d.nb - 1) }));
        d.hull = el("polygon", { fill: "none", stroke: INK, "stroke-width": 3.2, "stroke-linejoin": "round" }, lf);
        d.ring = el("polygon", { fill: "none", stroke: BLUE, "stroke-width": 7, "stroke-linejoin": "round", "stroke-dasharray": "4 16", "stroke-linecap": "round", class: "mg-ring" }, g);
        d.ld = leader(g);
        d.lab = el("g", {}, g);
        el("rect", { x: 1026, y: d.row - 58, width: 500, height: 152, rx: 26, fill: "#fff", "fill-opacity": 0 }, d.lab);
        el("rect", { x: 1026, y: d.row - 58, width: 500, height: 152, rx: 26, fill: "none", stroke: BLUE, "stroke-width": 5, "stroke-dasharray": "4 14", "stroke-linecap": "round", class: "mg-ring" }, d.lab);
        d.mb = txt(d.lab, 1046, d.row - 16, d.l, { "font-family": MONO, "font-size": 30, "font-weight": 700, fill: NAVY });
        d.pill = el("rect", { x: 1034, y: d.row - 2, width: 10, height: 60, rx: 30, fill: YEL, stroke: INK, "stroke-width": 3 }, d.lab);
        d.tm = txt(d.lab, 1050, d.row + 44, d.time, { "font-size": 52, "font-weight": 700 });
        d.tw = d.tm.getComputedTextLength ? d.tm.getComputedTextLength() : d.time.length * 27;
        d.marks = Array.from({ length: d.nb }, (_, k) => { const f = k < d.nb - 1 ? 1 : (d.min - 60 * (d.nb - 1)) / 60; return el("rect", { x: 1048 + k * 23.5, y: d.row + 64, width: Math.max(5, 17 * f), height: 17, rx: 4, fill: d.hue.left, stroke: INK, "stroke-width": 2 }, d.lab); });
        button(g, `${d.l}: ${d.time}`, () => { const now = api.now(); sel = sel === i ? -1 : i; D.forEach((q, j) => { q.lv.to(sel === j ? 1 : 0, now); q.hi.to(sel === j ? 1 : 0, now); q.dim.to(sel >= 0 && sel !== j ? 1 : 0, now); }); userT = now; api.hold(); });
      });
      const cp = chip(root, "Arithmetic, not a measurement", 28);
      return (t, now) => {
        if (userT > 0 && now - userT > 7) { userT = -1; sel = -1; D.forEach((q) => { q.lv.to(0, now); q.hi.to(0, now); q.dim.to(0, now); }); api.seek(SC.towers.dur - 0.7); return; }
        stage.setAttribute("transform", `translate(0 ${(70 * (1 - ob(seg(t, 0.1, 0.8)))).toFixed(1)})`); op(stage, seg(t, 0.1, 0.4));
        plate.set(O, 13, 4);
        D.forEach((d) => {
          const lv = d.lv.at(now) * 0.75, hi = d.hi.at(now), grown = seg(t, d.t0, d.done);
          d.foot.set(O, d.x, 1, 2, 2); op(d.foot.n, 0.5 * seg(t, d.t0, d.t0 + 0.2));
          d.shade.set(O, d.x + 2, 1, (0.3 + 0.6 * d.h / (1131 * UNIT)) * oc(grown), 2); op(d.shade.n, 0.42 * seg(t, d.t0, d.t0 + 0.3) * (1 - 0.6 * cl(lv)));
          let z = lv;
          d.boxes.forEach((b, k) => { const ts = d.t0 + k * 0.09, u = seg(t, ts, ts + 0.45); b.box.set(O, d.x, 1, z + 2.4 * (1 - ob(u)), 2, 2, u <= 0 ? 0 : b.h); op(b.box.g, seg(t, ts, ts + 0.14)); z += b.h; });
          const z0 = lv, z1 = lv + d.h, hx = [[d.x, 1, z1], [d.x + 2, 1, z1], [d.x + 2, 1, z0], [d.x + 2, 3, z0], [d.x, 3, z0], [d.x, 3, z1]];
          d.hull.setAttribute("points", pts(O, hx)); op(d.hull, seg(t, d.done - 0.05, d.done + 0.2));
          const m = 0.28; d.ring.setAttribute("points", pts(O, [[d.x - m, 1 - m, z1], [d.x + 2 + m, 1 - m, z1], [d.x + 2 + m, 1 - m, z0], [d.x + 2 + m, 3 + m, z0], [d.x - m, 3 + m, z0], [d.x - m, 3 + m, z1]]));
          const top = pr(O, d.x + 1, 2, z1), k = oc(seg(t, d.done, d.done + 0.45));
          d.ld.set(Math.abs(top[1] - d.row) < 40 ? [top, [1020, top[1]]] : [top, [top[0], d.row], [1020, d.row]], k);
          d.ld.path.setAttribute("stroke-width", (2.6 + 1.6 * cl(hi)).toFixed(2));
          const a = seg(t, d.done + 0.3, d.done + 0.6), b2 = seg(t, d.done + 0.4, d.done + 0.75);
          op(d.mb, a); d.mb.setAttribute("transform", `translate(${(22 * (1 - oc(a))).toFixed(1)} 0)`);
          op(d.tm, b2); d.tm.setAttribute("transform", `translate(${(22 * (1 - oc(b2))).toFixed(1)} 0)`);
          d.pill.setAttribute("width", (10 + (d.tw + 22) * cl(hi, 0, 1.08)).toFixed(1)); op(d.pill, hi * 3);
          d.marks.forEach((r, j) => { const q = seg(t, d.done + 0.55 + j * 0.035, d.done + 0.8 + j * 0.035); op(r, q); r.setAttribute("transform", `translate(0 ${(10 * (1 - oc(q))).toFixed(1)})`); });
          op(d.lab, 1 - 0.62 * d.dim.at(now));
        });
        const ck = seg(t, 6.9, 7.45); tf(cp.g, 1250, 1016 - 70 * (1 - oc(ck)), ck <= 0 ? 0.001 : 0.7 + 0.3 * ob(ck)); op(cp.g, seg(t, 6.9, 7.1));
        leave(root, t, SC.towers.dur);
      };
    },
  };

  /* ---- 3. clearout: three blocks leave for two shelves, 212 GB drops in ---- */
  SC.clearout = {
    dur: 11.6, still: 9.2,
    build(svg, api) {
      ground(svg, 1600, 1200, SOFT, 760, 640, 950);
      heading(svg, "Cleared space", "Tapping a block lifts it");
      const root = el("g", {}, svg), S = 44, OP = { x: 400, y: 640, s: S }, SH = [{ o: { x: 1060, y: 300, s: S }, w: 7.2, d: 4.6, name: "Game library", lx: 980, ly: 612, ey: 484 }, { o: { x: 1250, y: 720, s: S }, w: 3.6, d: 3.6, name: "USB drive", lx: 1250, ly: 978, ey: 902 }];
      const stage = el("g", {}, root), plate = mkPlate(stage), land = mkShade(stage, 0.4);
      SH.forEach((s, i) => {
        s.g = el("g", {}, root);
        s.plate = mkPlate(s.g, false);
        s.ld = leader(root);
        s.pill = el("rect", { x: s.lx - mw(s.name, 30) / 2 - 20, y: s.ly - 34, width: mw(s.name, 30) + 40, height: 50, rx: 25, fill: YEL, stroke: INK, "stroke-width": 3 }, root);
        s.t = txt(root, s.lx, s.ly, s.name, { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });
        s.hi = tween(0.4);
      });
      const big = el("g", {}, root), bigBox = mkBox(big, T.sky, 3), bigLd = leader(root), bigChip = chip(root, "212 GB", 38);
      const trail = el("path", { fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "3 13", "stroke-linecap": "round" }, root), spark = el("circle", { r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, root);
      const IT = [
        { name: "Finished game", hue: T.blue, w: 3, d: 4, h: 2.2, a: [0.6, 0.6], sh: 0, b: [0.3, 0.3], la: [-81, -126], lb: [0, -122], t0: 1.8 },
        { name: "Unused add ons", hue: T.lil, w: 2.5, d: 2.5, h: 1.4, a: [4.6, 1.0], sh: 0, b: [4.2, 1.05], la: [163, -146], lb: [215, -39], t0: 3.2 },
        { name: "Old clips", hue: T.mint, w: 2, d: 2, h: 1, a: [1.2, 5.4], sh: 1, b: [0.8, 0.8], la: [-110, -85], lb: [205, -15], t0: 4.6 },
      ];
      let sel = -1, userT = -1, tSel = -99;
      IT.forEach((it, i) => {
        it.s0 = mkShade(stage); it.s1 = mkShade(SH[it.sh].g);
        it.lv = tween(0.5);
      });
      IT.forEach((it, i) => {
        const g = el("g", {}, root); it.g = g;
        const lf = el("g", { class: "mg-lift" }, g);
        it.box = mkBox(lf, it.hue, 3);
        it.ring = el("polygon", { fill: "none", stroke: BLUE, "stroke-width": 7, "stroke-linejoin": "round", "stroke-dasharray": "4 16", "stroke-linecap": "round", class: "mg-ring" }, g);
        it.ld = leader(g);
        it.tag = chip(g, it.name, 26, "#fff", 20);
        button(g, `${it.name}: ${SH[it.sh].name}`, () => { const now = api.now(); sel = sel === i ? -1 : i; tSel = now; IT.forEach((q, j) => q.lv.to(sel === j ? 1 : 0, now)); SH.forEach((s, j) => s.hi.to(sel >= 0 && IT[sel].sh === j ? 1 : 0, now)); userT = now; api.hold(); });
      });
      const marks = IT.map((it, i) => {
        const g = el("g", {}, root), d = "M0 -17 L30 0 L0 17 L-30 0 Z";
        el("path", { d, fill: LIL, opacity: 0.5, transform: "translate(4 6)" }, g);
        el("path", { d, fill: "#fff", stroke: INK, "stroke-width": 2.6, "stroke-linejoin": "round" }, g);
        const f = el("path", { d, fill: it.hue.left, stroke: INK, "stroke-width": 2.6, "stroke-linejoin": "round" }, g);
        return { g, f, x: 400 + (i - 1) * 76 };
      });
      const bez = (A, B, u) => { const M = [(A[0] + B[0]) / 2, Math.min(A[1], B[1]) - 150]; return [(1 - u) * (1 - u) * A[0] + 2 * u * (1 - u) * M[0] + u * u * B[0], (1 - u) * (1 - u) * A[1] + 2 * u * (1 - u) * M[1] + u * u * B[1], M]; };
      return (t, now) => {
        if (userT > 0 && now - userT > 7) { userT = -1; sel = -1; IT.forEach((q) => q.lv.to(0, now)); SH.forEach((s) => s.hi.to(0, now)); api.seek(SC.clearout.dur - 0.7); return; }
        const bump = 7 * Math.sin(Math.PI * seg(t, 6.75, 7.0));
        stage.setAttribute("transform", `translate(0 ${(70 * (1 - ob(seg(t, 0.1, 0.8))) + bump).toFixed(1)})`); op(stage, seg(t, 0.1, 0.4));
        plate.set(OP, 8, 8);
        SH.forEach((s, i) => {
          const k = seg(t, 0.3 + i * 0.12, 1.0 + i * 0.12), hi = s.hi.at(now);
          s.g.setAttribute("transform", `translate(0 ${(60 * (1 - ob(k))).toFixed(1)})`); op(s.g, k * 3);
          s.plate.set(s.o, s.w, s.d, 0.36);
          s.ld.set([[s.lx, s.ey], [s.lx, s.ly - 38]], oc(seg(t, 1.0 + i * 0.12, 1.4 + i * 0.12)));
          const a = seg(t, 1.25 + i * 0.12, 1.6 + i * 0.12); op(s.t, a); s.t.setAttribute("transform", `translate(0 ${(14 * (1 - oc(a))).toFixed(1)})`);
          op(s.pill, hi * 3); s.pill.setAttribute("transform", `translate(${s.lx} ${s.ly - 9}) scale(${(0.6 + 0.4 * cl(hi, 0, 1.1)).toFixed(3)}) translate(${-s.lx} ${-(s.ly - 9)})`);
        });
        /* the 212 GB block */
        const fall = seg(t, 6.3, 6.75), sq = 1 - 0.07 * Math.sin(Math.PI * seg(t, 6.75, 7.05)), bz = 9 * (1 - fall * fall);
        land.set(OP, 1.5, 1.5, 5, 5); op(land.n, 0.45 * seg(t, 5.9, 6.6));
        bigBox.set(OP, 1.5, 1.5, bz, 5, 5, fall <= 0 ? 0 : 5.5 * sq); op(big, seg(t, 6.3, 6.45)); big.setAttribute("transform", `translate(0 ${bump.toFixed(1)})`);
        const bt = pr(OP, 4, 4, 5.5), ck = seg(t, 7.5, 8.05);
        bigLd.set([bt, [bt[0], 432]], oc(seg(t, 7.2, 7.6)));
        tf(bigChip.g, 400, 388 - 60 * (1 - oc(ck)), ck <= 0 ? 0.001 : 0.7 + 0.3 * ob(ck)); op(bigChip.g, seg(t, 7.5, 7.7));
        /* the three blocks */
        IT.forEach((it, i) => {
          const s = SH[it.sh], d0 = 0.5 + i * 0.12, dr = seg(t, d0, d0 + 0.5), u = io(seg(t, it.t0 + 0.4, it.t0 + 1.3)), lv = it.lv.at(now);
          const ant = 1 - 0.09 * Math.sin(Math.PI * seg(t, it.t0 - 0.22, it.t0));
          const z = 2.6 * (1 - ob(dr)) + 1.3 * (ob(seg(t, it.t0, it.t0 + 0.45)) - io(seg(t, it.t0 + 1.2, it.t0 + 1.6))) + 0.8 * lv + 0.05 * Math.sin(Math.PI * seg(t, it.t0 + 1.6, it.t0 + 1.85));
          const A = pr(OP, it.a[0], it.a[1], 0), B = pr(s.o, it.b[0], it.b[1], 0), o = { x: lerp(A[0], B[0], u), y: lerp(A[1], B[1], u) - 80 * Math.sin(Math.PI * u), s: S };
          it.box.set(o, 0, 0, z, it.w, it.d, dr <= 0 ? 0 : it.h * ant); op(it.g, seg(t, d0, d0 + 0.15));
          it.s0.set(OP, it.a[0] + it.w, it.a[1], 0.45, it.d); op(it.s0.n, 0.42 * seg(t, d0 + 0.2, d0 + 0.5) * (1 - seg(t, it.t0, it.t0 + 0.5)));
          it.s1.set(s.o, it.b[0] + it.w, it.b[1], 0.42, it.d); op(it.s1.n, 0.42 * seg(t, it.t0 + 1.2, it.t0 + 1.6) * (1 - 0.5 * cl(lv)));
          const m = 0.3, z1 = z + it.h;
          it.ring.setAttribute("points", pts(o, [[-m, -m, z1], [it.w + m, -m, z1], [it.w + m, -m, z], [it.w + m, it.d + m, z], [-m, it.d + m, z], [-m, it.d + m, z1]]));
          const c = pr(o, it.w / 2, it.d / 2, z1), lp = [c[0] + lerp(it.la[0], it.lb[0], u), c[1] + lerp(it.la[1], it.lb[1], u)], lk = seg(t, d0 + 0.45, d0 + 0.85);
          it.ld.set([c, lp], oc(lk)); tf(it.tag.g, lp[0], lp[1], lk <= 0 ? 0.001 : 0.75 + 0.25 * ob(seg(t, d0 + 0.6, d0 + 0.95))); op(it.tag.g, seg(t, d0 + 0.6, d0 + 0.8));
          const mk = seg(t, 1.3 + i * 0.09, 1.65 + i * 0.09); tf(marks[i].g, marks[i].x, 1090, mk <= 0 ? 0.001 : ob(mk)); op(marks[i].g, mk * 4);
          const fk = seg(t, it.t0 + 1.5, it.t0 + 1.85); op(marks[i].f, fk * 3); marks[i].f.setAttribute("transform", `scale(${(fk <= 0 ? 0.001 : ob(fk)).toFixed(3)})`);
        });
        /* which shelf it went to: a dashed trail and a spark that runs along it */
        if (sel >= 0) {
          const it = IT[sel], s = SH[it.sh], A = pr(OP, it.a[0] + it.w / 2, it.a[1] + it.d / 2, 5.5), B = pr(s.o, it.b[0] + it.w / 2, it.b[1] + it.d / 2, it.h + 0.8), k = calm ? 1 : seg(now - tSel, 0.05, 0.8), P = bez(A, B, io(k));
          trail.setAttribute("d", `M${A[0].toFixed(1)} ${A[1].toFixed(1)}Q${P[2][0].toFixed(1)} ${P[2][1].toFixed(1)} ${B[0].toFixed(1)} ${B[1].toFixed(1)}`); op(trail, calm ? 1 : seg(now - tSel, 0, 0.3));
          tf(spark, P[0], P[1], 1); op(spark, k >= 1 ? 0 : 1);
        } else { op(trail, 0); op(spark, 0); }
        leave(root, t, SC.clearout.dur);
      };
    },
  };

  /* ---- title card, 16 by 9, on white ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 8, still: 4,
    build(svg) {
      ground(svg, 1600, 900, "#FFFFFF", 1250, 560, 520);
      const pill = el("g", {}, svg);
      el("rect", { x: 87, y: 73, width: 176, height: 60, rx: 30, fill: LIL, opacity: 0.5 }, pill);
      el("rect", { x: 80, y: 64, width: 176, height: 60, rx: 30, fill: YEL, stroke: INK, "stroke-width": 3 }, pill);
      txt(pill, 168, 105, "Guides", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      const chk = txt(svg, 1520, 106, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 28, "font-weight": 500, fill: MUTE });
      const l1 = txt(svg, 78, 340, "GTA 6", { "font-size": 128, "font-weight": 700, "letter-spacing": -2 }), l2 = txt(svg, 78, 474, "download size", { "font-size": 128, "font-weight": 700, "letter-spacing": -2 });
      const ul = el("path", { d: "M86 530 H386", stroke: YEL, "stroke-width": 18, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, svg);
      const sub = txt(svg, 80, 624, "How many GB, and how long it takes", { "font-size": 40, "font-weight": 500, fill: MUTE });
      const root = el("g", {}, svg), O = { x: 1250, y: 478, s: 52 }, stage = el("g", {}, root), plate = mkPlate(stage);
      const side = [{ b: mkBox(root, T.lil, 2.8), x: 4.5, y: 0.5, h: 0.7, s: mkShade(stage) }];
      const shade = mkShade(stage);
      const N = 5, HB = 0.9, tower = Array.from({ length: N }, (_, k) => mkBox(root, k % 2 ? T.blue : T.sky, 2.8));
      const front = [{ b: mkBox(root, T.mint, 2.8), x: 0.5, y: 4.5, h: 0.5, s: mkShade(stage) }];
      const ld = leader(root), cp = chip(root, "212 GB", 40);
      const SM = side.concat(front);
      return (t) => {
        const a = seg(t, 0.15, 0.6); op(pill, a * 2); tf(pill, 0, -18 * (1 - oc(a)), 1);
        op(chk, seg(t, 0.3, 0.8));
        [l1, l2].forEach((n, i) => { const k = seg(t, 0.3 + i * 0.12, 0.9 + i * 0.12); op(n, k * 1.6); n.setAttribute("transform", `translate(0 ${(46 * (1 - oc(k))).toFixed(1)})`); });
        const uk = oc(seg(t, 1.0, 1.5)); ul.setAttribute("stroke-dashoffset", (1 - uk).toFixed(3)); ul.setAttribute("stroke-dasharray", uk >= 1 ? "none" : "1 1"); op(ul, uk <= 0 ? 0 : 1);
        const sk = seg(t, 1.2, 1.7); op(sub, sk); sub.setAttribute("transform", `translate(0 ${(20 * (1 - oc(sk))).toFixed(1)})`);
        stage.setAttribute("transform", `translate(0 ${(70 * (1 - ob(seg(t, 0.3, 1.0)))).toFixed(1)})`); op(stage, seg(t, 0.3, 0.6));
        plate.set(O, 6, 6);
        SM.forEach((m, i) => { const u = seg(t, 1.0 + i * 0.14, 1.5 + i * 0.14); m.b.set(O, m.x, m.y, 2.2 * (1 - ob(u)), 1, 1, u <= 0 ? 0 : m.h); op(m.b.g, u * 4); m.s.set(O, m.x + 1, m.y, 0.3, 1); op(m.s.n, 0.42 * u); });
        shade.set(O, 4.5, 1.5, 0.9 * oc(seg(t, 1.3, 2.7)), 3); op(shade.n, 0.42 * seg(t, 1.3, 1.6));
        tower.forEach((b, k) => { const ts = 1.3 + k * 0.26, u = seg(t, ts, ts + 0.5); b.set(O, 1.5, 1.5, k * HB + 3 * (1 - ob(u)), 3, 3, u <= 0 ? 0 : HB); op(b.g, seg(t, ts, ts + 0.14)); });
        const top = pr(O, 3, 3, N * HB), ck = seg(t, 3.1, 3.65);
        ld.set([top, [top[0], 262]], oc(seg(t, 2.85, 3.2)));
        tf(cp.g, 1250, 218 - 60 * (1 - oc(ck)), ck <= 0 ? 0.001 : 0.7 + 0.3 * ob(ck)); op(cp.g, seg(t, 3.1, 3.3));
        leave(root, t, SC.hero.dur);
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 1600, H = sc.h || 1200;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, live = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && (!held || live)) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; live = false; tick(); }, poke: () => { held = false; live = false; tick(); }, hold: () => { held = true; live = !calm; tick(); } };
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
