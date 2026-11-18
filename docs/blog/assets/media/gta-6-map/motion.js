/* Bright coded scenes for "GTA 6 map". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", AQUA = "#3FC6C9", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": MONO, "font-size": 30, "font-weight": 700, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const show = (n, k, dx = 0, dy = 14) => { n.setAttribute("opacity", k); n.setAttribute("transform", `translate(${dx * (1 - k)} ${dy * (1 - k)})`); };
  const whenOf = (fn, f) => { for (let t = 0; t < 14; t += 0.02) if (fn(t) >= f - 1e-4) return t; return 14; };
  /* a button that also tracks hover and focus, so the scene can lift it */
  const button = (g, label, fn) => {
    const st = { hot: false, hv: 0 };
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
    g.addEventListener("pointerenter", () => { st.hot = true; }); g.addEventListener("pointerleave", () => { st.hot = false; });
    g.addEventListener("focus", () => { st.hot = true; }); g.addEventListener("blur", () => { st.hot = false; });
    st.ease = () => { st.hv += ((st.hot ? 1 : 0) - st.hv) * 0.2; return st.hv; };
    return st;
  };

  /* ---- transit kit: lines in eight directions, stops, capsules, chips ---- */
  const poly = (pts) => {
    const segs = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); segs.push([L, l]); L += l; }
    const at = (d) => { d = cl(d, 0, L); let i = 0; while (i < segs.length - 1 && d > segs[i][0] + segs[i][1]) i++; const u = segs[i][1] ? (d - segs[i][0]) / segs[i][1] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; };
    const near = (x, y) => { let best = 0, bd = 1e12; for (let i = 0; i <= 800; i++) { const p = at((L * i) / 800), q = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (q < bd) { bd = q; best = i / 800; } } return best; };
    return { d: "M" + pts.map((p) => p[0] + " " + p[1]).join(" L"), L, at, near };
  };
  const rail = (parent, pts, col, w = 28) => {
    const p = poly(pts), g = el("g", { opacity: 0 }, parent);
    const mk = (a) => el("path", Object.assign({ d: p.d, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${p.L} ${p.L + 80}` }, a), g);
    const ls = [mk({ stroke: LIL, "stroke-opacity": 0.34, "stroke-width": w + 11, transform: "translate(9 13)" }), mk({ stroke: INK, "stroke-width": w + 11 }), mk({ stroke: col, "stroke-width": w }), mk({ stroke: "#fff", "stroke-opacity": 0.55, "stroke-width": 4, transform: `translate(0 ${-w * 0.23})` })];
    const pen = el("g", { opacity: 0 }, parent);
    el("circle", { r: w / 2 + 7, fill: "#fff", stroke: INK, "stroke-width": 5.5 }, pen); el("circle", { r: 5, fill: INK }, pen);
    p.g = g;
    p.set = (k) => {
      k = cl(k); g.setAttribute("opacity", k > 0.002 ? 1 : 0);
      ls.forEach((n) => n.setAttribute("stroke-dashoffset", p.L * (1 - k)));
      const q = p.at(p.L * k); tf(pen, q[0], q[1], 1 + 0.12 * Math.sin(k * 40)); pen.setAttribute("opacity", k > 0.002 && k < 0.998 ? 1 : 0);
    };
    return p;
  };
  const ghost = (parent, list) => { const g = el("g", {}, parent); list.forEach((pts) => el("path", { d: poly(pts).d, fill: "none", stroke: SOFT, "stroke-width": 30, "stroke-linecap": "round", "stroke-linejoin": "round" }, g)); return g; };
  const backdrop = (parent, W, H, list, dur) => {
    const dots = el("g", {}, parent);
    for (let y = 60; y < H; y += 120) for (let x = 40; x < W + 40; x += 120) el("circle", { cx: x, cy: y, r: 4, fill: SOFT }, dots);
    const gh = ghost(parent, list);
    return (t) => { const k = io(seg(t, 0, dur * 0.7)); dots.setAttribute("transform", `translate(${-18 * (1 - k)} 0)`); gh.setAttribute("transform", `translate(${-60 * (1 - k)} ${16 * (1 - k)})`); };
  };
  const stopAt = (parent, x, y, o = {}) => {
    const r = o.r || 21, g = el("g", { opacity: 0 }, parent);
    if (o.hit) el("circle", { r: r + 30, fill: "#fff", "fill-opacity": 0 }, g);
    if (o.hit) el("circle", { r: r + 15, fill: "none", stroke: INK, "stroke-width": 4, "stroke-dasharray": "5 9", "stroke-linecap": "round", class: "mg-ring" }, g);
    const disc = el("circle", { r, fill: "#fff", stroke: INK, "stroke-width": 5.5 }, g);
    if (o.n) txt(g, 0, 8.5, o.n, { "text-anchor": "middle", "font-size": 24 }); else el("circle", { r: r * 0.34, fill: INK }, g);
    return { g, x, y, set(k, lift = 0, on = false) { g.setAttribute("opacity", k > 0.01 ? 1 : 0); tf(g, x, y - 7 * lift, Math.max(k, 0.001) * (1 + 0.1 * lift)); disc.setAttribute("fill", on ? YEL : "#fff"); } };
  };
  const pill = (parent, cx, cy, s, o = {}) => {
    const fs = o.fs || 30, w = o.w || s.length * fs * 0.6 + 64, h = o.h || fs + 38, g = el("g", { opacity: 0 }, parent);
    el("rect", { x: -w / 2 + 9, y: -h / 2 + 12, width: w, height: h, rx: h / 2, fill: LIL, "fill-opacity": 0.42 }, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: o.fill || YEL, stroke: INK, "stroke-width": 5.5 }, g);
    el("path", { d: `M${-w / 2 + h / 2} ${-h / 2 + 10} H${w / 2 - h / 2}`, stroke: "#fff", "stroke-opacity": 0.6, "stroke-width": 4, "stroke-linecap": "round" }, g);
    txt(g, 0, fs * 0.35, s, Object.assign({ "text-anchor": "middle", "font-size": fs }, o.text || {}));
    return {
      g, w, h,
      pop(k) { g.setAttribute("opacity", k > 0.01 ? 1 : 0); tf(g, cx, cy, Math.max(ob(k), 0.001)); },
      land(k) { g.setAttribute("opacity", seg(k, 0, 0.2)); tf(g, cx, cy - 90 * (1 - oc(k)), 0.55 + 0.45 * ob(k), -9 * (1 - oc(k))); },
    };
  };
  /* the answer card: a hint until something is tapped, then a ticket that pops */
  const card = (parent, x, y, w, h, hint, api) => {
    const cx = x + w / 2, cy = y + h / 2, hw = hint.length * 15.6 + 124;
    const hg = el("g", { opacity: 0 }, parent);
    el("rect", { x: cx - hw / 2, y: cy - 36, width: hw, height: 72, rx: 36, fill: SOFT }, hg);
    const ring = el("circle", { cx: cx - hw / 2 + 44, cy, r: 13, fill: "none", stroke: INK, "stroke-width": 3 }, hg);
    el("circle", { cx: cx - hw / 2 + 44, cy, r: 13, fill: "#fff", stroke: INK, "stroke-width": 4.5 }, hg);
    txt(hg, cx - hw / 2 + 76, cy + 9, hint, { "font-size": 26, "font-weight": 500, fill: MUTE });
    const g = el("g", { opacity: 0 }, parent);
    el("rect", { x: x + 9, y: y + 13, width: w, height: h, rx: 30, fill: LIL, "fill-opacity": 0.42 }, g);
    el("rect", { x, y, width: w, height: h, rx: 30, fill: "#fff", stroke: INK, "stroke-width": 5.5 }, g);
    el("circle", { cx: x + 44, cy: y + 46, r: 13, fill: YEL, stroke: INK, "stroke-width": 4.5 }, g);
    const KIND = { m: { "font-size": 24, "font-weight": 500, fill: MUTE }, k: { "font-size": 28 }, b: { "font-family": SANS, "font-size": 44 } };
    const rows = [0, 1, 2].map(() => txt(g, x + 74, 0, ""));
    let at = -99, on = false;
    return {
      open(lines, now) {
        const sp = (h - 36) / lines.length;
        rows.forEach((n, i) => { const l = lines[i]; n.textContent = l ? l[0] : ""; if (!l) return; const a = KIND[l[1]]; n.setAttribute("font-family", a["font-family"] || MONO); n.setAttribute("font-size", a["font-size"]); n.setAttribute("font-weight", a["font-weight"] || 700); n.setAttribute("fill", a.fill || INK); n.setAttribute("x", i === 0 ? x + 74 : x + 40); n.setAttribute("y", y + 18 + sp * (i + 0.5) + a["font-size"] * 0.35); const room = w - 80, len = n.getComputedTextLength ? n.getComputedTextLength() : 0; if (len > room) n.setAttribute("font-size", Math.floor((a["font-size"] * room) / len)); });
        at = now; on = true;
      },
      close() { on = false; },
      draw(hk, now) {
        const k = on ? (api.calm ? 1 : seg(now - at, 0, 0.42)) : 0;
        hg.setAttribute("opacity", hk * (1 - cl(k * 3))); hg.setAttribute("transform", `translate(0 ${12 * (1 - hk)})`);
        const pu = (now * 0.7) % 1; ring.setAttribute("r", 13 + 16 * oc(pu)); ring.setAttribute("stroke-opacity", 0.5 * (1 - pu));
        g.setAttribute("opacity", cl(k * 4)); g.setAttribute("transform", `translate(${cx} ${cy}) rotate(${-3 * (1 - oc(k))}) scale(${0.82 + 0.18 * ob(k)}) translate(${-cx} ${-cy})`);
      },
    };
  };
  const HOLD_TAP = 8;

  const SC = {};

  /* ---- 1. two lines, what Rockstar says and what outlets say, meet at Leonida ---- */
  SC.interchange = {
    w: 1600, h: 1200, dur: 8,
    build(svg, api) {
      const bg = backdrop(svg, 1600, 1200, [[[-60, 560], [200, 560], [300, 660], [300, 800]], [[1660, 860], [1480, 860], [1480, 1260]], [[620, -60], [620, 60], [700, 140]]], 8);
      const A = rail(svg, [[330, 240], [840, 240], [1110, 510], [1110, 600]], BLUE);
      const B = rail(svg, [[300, 960], [990, 960], [1270, 680], [1270, 600]], AQUA);
      const kA = (t) => io(seg(t, 0.55, 2.95)), kB = (t) => io(seg(t, 0.95, 3.3));
      const tagA = pill(svg, 235, 240, "Rockstar says", { fill: BLUE }), tagB = pill(svg, 217, 960, "Outlets say", { fill: AQUA });
      const pulse = el("rect", { fill: "none", stroke: LIL, "stroke-width": 8, opacity: 0 }, svg);
      const cap = el("g", { opacity: 0 }, svg);
      el("rect", { x: -161, y: -47, width: 340, height: 120, rx: 60, fill: LIL, "fill-opacity": 0.42 }, cap);
      el("rect", { x: -170, y: -60, width: 340, height: 120, rx: 60, fill: "#fff", stroke: INK, "stroke-width": 6 }, cap);
      txt(cap, 0, 21, "Leonida", { "text-anchor": "middle", "font-family": SANS, "font-size": 62 });
      const S = [
        { r: A, k: kA, x: 610, y: 240, s: "the sunshine state", lx: 610, ly: 186, a: "middle", src: "Rockstar, Only in Leonida", date: "read 19 Nov 2026" },
        { r: A, k: kA, x: 975, y: 375, s: "Vice City, USA", lx: 1030, ly: 362, a: "start", src: "Rockstar's pages", date: "read 19 Nov 2026" },
        { r: B, k: kB, x: 620, y: 960, s: "Florida inspired", lx: 620, ly: 906, a: "middle", src: "Polygon", date: "18 Nov 2026" },
        { r: B, k: kB, x: 1200, y: 750, s: "Miami inspired Vice City", lx: 1150, ly: 745, a: "end", src: "AP", date: "5 Dec 2023" },
      ];
      const chip = pill(svg, 672, 600, "Florida on Rockstar's pages: 0");
      const tip = card(svg, 1020, 64, 520, 204, "tap a stop", api);
      let sel = -1, selAt = 0;
      S.forEach((s, i) => {
        s.when = whenOf(s.k, s.r.near(s.x, s.y));
        s.label = txt(svg, s.lx, s.ly, s.s, { "text-anchor": s.a });
        s.dot = stopAt(svg, s.x, s.y, { hit: true });
        s.st = button(s.dot.g, `${s.s}: ${s.src}, ${s.date}`, () => { sel = i; selAt = api.now(); tip.open([[s.s, "m"], [s.src, "b"], [s.date, "k"]], selAt); api.hold(); });
      });
      return (t, now) => {
        if (sel >= 0 && !api.calm && now - selAt > HOLD_TAP) { sel = -1; tip.close(); api.resume(); }
        bg(t);
        tagA.pop(seg(t, 0.15, 0.6)); tagB.pop(seg(t, 0.27, 0.72));
        A.set(kA(t)); B.set(kB(t));
        S.forEach((s, i) => {
          const tap = sel === i ? Math.sin(seg(now - selAt, 0, 0.5) * Math.PI) * 0.22 : 0;
          s.dot.set(ob(seg(t, s.when, s.when + 0.42)) + tap, s.st.ease(), sel === i);
          show(s.label, oc(seg(t, s.when + 0.09, s.when + 0.5)));
        });
        const ck = seg(t, 3.25, 3.8), sq = 1 - 0.06 * Math.sin(Math.PI * seg(t, 5.0, 5.34)) + 0.07 * Math.sin(Math.PI * seg(t, 5.62, 6.0));
        cap.setAttribute("opacity", ck > 0.01 ? 1 : 0); tf(cap, 1190, 600, Math.max(ob(ck), 0.001) * sq);
        const pk = seg(t, 3.45, 4.4), pw = 340 + 150 * oc(pk), ph = 120 + 150 * oc(pk);
        pulse.setAttribute("x", 1190 - pw / 2); pulse.setAttribute("y", 600 - ph / 2); pulse.setAttribute("width", pw); pulse.setAttribute("height", ph); pulse.setAttribute("rx", ph / 2); pulse.setAttribute("opacity", pk > 0 && pk < 1 ? 0.8 * (1 - pk) : 0);
        chip.land(seg(t, 5.3, 5.8));
        tip.draw(oc(seg(t, 6.3, 6.8)), now);
      };
    },
  };

  /* ---- 2. six regions in page order on one line ---- */
  SC.stops = {
    w: 1600, h: 1200, dur: 8.5,
    build(svg, api) {
      const bg = backdrop(svg, 1600, 1200, [[[1660, 150], [1380, 150], [1220, 310], [1100, 310]], [[820, 1260], [820, 1040], [940, 920], [1660, 920]]], 8.5);
      const title = txt(svg, 100, 160, "Only in Leonida, page order", { "font-family": SANS, "font-size": 66 });
      const bar = el("path", { d: "M104 196 H104", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 100, 258, "a schematic in page order, not geography", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const R = rail(svg, [[120, 510], [380, 510], [580, 710], [860, 710], [1020, 870], [1240, 870], [1490, 620]], LIL, 30);
      const kR = (t) => io(seg(t, 0.7, 4.7));
      const S = [
        { s: "Vice City", x: 210, y: 510, lx: 210, ly: 454, a: "middle", real: "Miami" },
        { s: "Leonida Keys", x: 480, y: 610, lx: 530, ly: 596, a: "start", real: "Florida Keys" },
        { s: "Grassrivers", x: 720, y: 710, lx: 720, ly: 782, a: "middle", real: "Everglades" },
        { s: "Port Gellhorn", x: 940, y: 790, lx: 990, ly: 776, a: "start", real: "none named" },
        { s: "Ambrosia", x: 1130, y: 870, lx: 1130, ly: 942, a: "middle", real: "none named" },
        { s: "Mount Kalaga", x: 1490, y: 620, lx: 1424, ly: 648, a: "end", real: "none named" },
      ];
      const tip = card(svg, 100, 936, 620, 210, "tap a stop", api);
      let sel = -1, selAt = 0;
      S.forEach((s, i) => {
        s.when = i === 5 ? 4.62 : whenOf(kR, R.near(s.x, s.y));
        s.label = txt(svg, s.lx, s.ly, s.s, { "text-anchor": s.a });
        s.dot = stopAt(svg, s.x, s.y, { hit: true, r: 25, n: String(i + 1) });
        s.st = button(s.dot.g, `${s.s}: real place a source names, ${s.real}`, () => { sel = i; selAt = api.now(); tip.open([[s.s, "k"], ["real place a source names", "m"], [s.real, "b"]], selAt); api.hold(); });
      });
      const chip = pill(svg, 1404, 536, "actual hills");
      return (t, now) => {
        if (sel >= 0 && !api.calm && now - selAt > HOLD_TAP) { sel = -1; tip.close(); api.resume(); }
        bg(t);
        show(title, oc(seg(t, 0.1, 0.6)), -30, 0); bar.setAttribute("d", `M104 196 H${104 + 236 * oc(seg(t, 0.4, 0.9))}`); bar.setAttribute("opacity", t > 0.4 ? 1 : 0);
        show(sub, oc(seg(t, 0.36, 0.86)), -30, 0);
        R.set(kR(t));
        S.forEach((s, i) => {
          const tap = sel === i ? Math.sin(seg(now - selAt, 0, 0.5) * Math.PI) * 0.22 : 0;
          const hit = i === 5 ? -0.1 * Math.sin(Math.PI * seg(t, 5.9, 6.25)) : 0;
          s.dot.set(ob(seg(t, s.when, s.when + 0.42)) + tap + hit, s.st.ease(), sel === i);
          show(s.label, oc(seg(t, s.when + 0.09, s.when + 0.5)));
        });
        chip.land(seg(t, 5.6, 6.1));
        tip.draw(oc(seg(t, 6.6, 7.1)), now);
      };
    },
  };

  /* ---- 3. three yardsticks as line lengths ---- */
  SC.yardstick = {
    w: 1600, h: 1200, dur: 9.5,
    build(svg, api) {
      const bg = backdrop(svg, 1600, 1200, [[[1660, 130], [1500, 130], [1420, 210], [1160, 210]], [[-60, 560], [140, 560], [220, 640], [220, 820]]], 9.5);
      const X0 = 330, U = 520, Y1 = 210, Y2 = 430, Y3 = 700;
      const l1 = txt(svg, 100, Y1 + 11, "GTA V", { "font-size": 32 }), l2 = txt(svg, 100, Y2 + 11, "Leonida", { "font-size": 32 });
      const g1 = el("path", { d: `M${X0 + U} ${Y1 + 34} V${Y2 - 38}`, stroke: MUTE, "stroke-width": 3.5, "stroke-dasharray": "3 11", "stroke-linecap": "round", fill: "none" }, svg);
      const g2 = el("path", { d: `M${X0 + 2 * U} ${Y2 + 40} V${Y3 + 44}`, stroke: MUTE, "stroke-width": 3.5, "stroke-dasharray": "3 11", "stroke-linecap": "round", fill: "none" }, svg);
      const gap = el("path", { d: `M1332 ${Y3} H${X0 + 2 * U - 8}`, stroke: MUTE, "stroke-width": 3.5, "stroke-dasharray": "3 11", "stroke-linecap": "round", fill: "none" }, svg);
      const r1 = rail(svg, [[X0, Y1], [X0 + U, Y1]], BLUE);
      const e1 = [stopAt(svg, X0, Y1, { r: 18 }), stopAt(svg, X0 + U, Y1, { r: 18 })];
      const leo = el("g", {}, svg);
      el("rect", { x: X0 - 40, y: Y2 - 48, width: 2 * U + 80, height: 96, rx: 48, fill: "#fff", "fill-opacity": 0 }, leo);
      el("rect", { x: X0 - 34, y: Y2 - 40, width: 2 * U + 68, height: 80, rx: 40, fill: "none", stroke: INK, "stroke-width": 4, "stroke-dasharray": "5 9", "stroke-linecap": "round", class: "mg-ring" }, leo);
      const r2 = rail(leo, [[X0, Y2], [X0 + 2 * U, Y2]], AQUA, 34);
      const e2 = [stopAt(leo, X0, Y2, { r: 20 }), stopAt(leo, X0 + U, Y2, { r: 20 }), stopAt(leo, X0 + 2 * U, Y2, { r: 20 })];
      const twice = pill(svg, 1110, 318, "roughly twice GTA V", { fill: SKY, fs: 28 });
      const parts = [["GTA IV", LIL, 0, 150, 0], ["GTA V", BLUE, 150, 520, 80], ["RDR2", MINT, 670, 300, 160]].map(([s, col, a, len, dx], i) => {
        const g = el("g", {}, svg), r = rail(g, [[X0 + a, Y3], [X0 + a + len, Y3]], col);
        const label = txt(g, X0 + a + len / 2, Y3 - 52, s, { "text-anchor": "middle" });
        const end = i === 0 ? stopAt(g, X0, Y3, { r: 18 }) : i === 2 ? stopAt(g, X0 + a + len, Y3, { r: 18 }) : null;
        return { g, r, label, end, dx, t0: 4.0 + i * 0.12 };
      });
      const caps = [X0 + 150, X0 + 670].map((x) => { const g = el("g", { opacity: 0 }, svg); el("rect", { x: -19, y: -40, width: 38, height: 80, rx: 19, fill: "#fff", stroke: INK, "stroke-width": 5.5 }, g); el("circle", { cy: -15, r: 5, fill: INK }, g); el("circle", { cy: 15, r: 5, fill: INK }, g); return { g, x }; });
      const near = txt(svg, X0 + 485, Y3 + 92, "nearly as large combined", { "text-anchor": "middle" });
      const chip = pill(svg, 1236, 1000, "square miles published: none");
      const tip = card(svg, 100, 912, 580, 176, "tap the Leonida line", api);
      let sel = false, selAt = 0;
      const st = button(leo, "Leonida line. Third yardstick: three times RDR2", () => { sel = true; selAt = api.now(); tip.open([["third yardstick", "m"], ["three times RDR2", "b"]], selAt); api.hold(); });
      return (t, now) => {
        if (sel && !api.calm && now - selAt > HOLD_TAP) { sel = false; tip.close(); api.resume(); }
        bg(t);
        show(l1, oc(seg(t, 0.15, 0.6)), -24, 0); r1.set(oc(seg(t, 0.4, 1.3)));
        e1[0].set(ob(seg(t, 0.35, 0.75))); e1[1].set(ob(seg(t, 1.2, 1.6)));
        show(l2, oc(seg(t, 1.5, 1.95)), -24, 0);
        const k2 = io(seg(t, 1.75, 3.35)); r2.set(k2);
        e2[0].set(ob(seg(t, 1.7, 2.1))); e2[1].set(ob(seg(t, 2.55, 2.95))); e2[2].set(ob(seg(t, 3.3, 3.7)));
        g1.setAttribute("opacity", oc(seg(t, 2.6, 3.0)));
        const tap = sel ? Math.sin(seg(now - selAt, 0, 0.55) * Math.PI) : 0, hv = st.ease();
        leo.setAttribute("transform", `translate(0 ${-6 * hv - 8 * tap})`);
        twice.pop(seg(t, 3.5, 3.95));
        const join = io(seg(t, 5.1, 5.85)), bump = Math.sin(Math.PI * seg(t, 5.85, 6.2)) * -7;
        parts.forEach((p, i) => {
          p.g.setAttribute("transform", `translate(${p.dx * (1 - join) + (i ? bump * i * 0.5 : 0)} 0)`);
          p.r.set(oc(seg(t, p.t0, p.t0 + 0.6))); show(p.label, oc(seg(t, p.t0 + 0.2, p.t0 + 0.6)));
          if (p.end) p.end.set(ob(seg(t, i ? p.t0 + 0.5 : p.t0 - 0.05, i ? p.t0 + 0.9 : p.t0 + 0.35)));
        });
        caps.forEach((c, i) => { const k = seg(t, 5.8 + i * 0.1, 6.22 + i * 0.1); c.g.setAttribute("opacity", k > 0.01 ? 1 : 0); tf(c.g, c.x, Y3, Math.max(ob(k), 0.001)); });
        g2.setAttribute("opacity", oc(seg(t, 6.2, 6.6))); gap.setAttribute("opacity", oc(seg(t, 6.3, 6.7)));
        show(near, oc(seg(t, 6.35, 6.8)));
        chip.land(seg(t, 7.7, 8.2));
        tip.draw(oc(seg(t, 8.5, 9.0)), now);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 4,
    build(svg) {
      const bg = backdrop(svg, 1600, 900, [[[1660, 640], [1500, 640], [1400, 740], [1400, 960]], [[700, -60], [700, 40], [800, 140], [880, 140]]], 4);
      const tag = pill(svg, 183, 104, "Guides", { fs: 28, w: 174, h: 60 });
      const chk = txt(svg, 1504, 114, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 26, "font-weight": 500, fill: MUTE });
      const title = txt(svg, 92, 440, "GTA 6 map", { "font-family": SANS, "font-size": 148 });
      const bar = el("path", { d: "M104 492 H104", stroke: YEL, "stroke-width": 20, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 96, 590, "Leonida, Vice City and how big it is", { "font-family": SANS, "font-size": 40, "font-weight": 500, fill: MUTE });
      const L = [
        { r: rail(svg, [[940, 250], [1050, 250], [1150, 350], [1150, 500]], BLUE), a: 0.5, at: [[940, 250], [1100, 300]] },
        { r: rail(svg, [[1530, 240], [1530, 360], [1390, 500], [1300, 500]], AQUA), a: 0.68, at: [[1530, 240], [1460, 430]] },
        { r: rail(svg, [[940, 790], [1140, 790], [1290, 640], [1290, 500]], MINT), a: 0.86, at: [[940, 790], [1060, 790], [1215, 715]] },
      ];
      L.forEach((l) => { l.k = (t) => io(seg(t, l.a, l.a + 1.7)); l.dots = l.at.map(([x, y]) => { const d = stopAt(svg, x, y); d.when = whenOf(l.k, l.r.near(x, y)); return d; }); });
      const pulse = el("rect", { fill: "none", stroke: LIL, "stroke-width": 8, opacity: 0 }, svg);
      const cap = el("g", { opacity: 0 }, svg);
      el("rect", { x: -151, y: -43, width: 320, height: 112, rx: 56, fill: LIL, "fill-opacity": 0.42 }, cap);
      el("rect", { x: -160, y: -56, width: 320, height: 112, rx: 56, fill: "#fff", stroke: INK, "stroke-width": 6 }, cap);
      txt(cap, 0, 20, "Leonida", { "text-anchor": "middle", "font-family": SANS, "font-size": 58 });
      return (t) => {
        bg(t);
        tag.pop(seg(t, 0.1, 0.55)); show(chk, oc(seg(t, 0.25, 0.7)), 0, -12);
        show(title, oc(seg(t, 0.25, 0.85)), 0, 36);
        bar.setAttribute("d", `M104 492 H${104 + 300 * ob(seg(t, 0.75, 1.3))}`); bar.setAttribute("opacity", t > 0.75 ? 1 : 0);
        show(sub, oc(seg(t, 0.95, 1.45)), 0, 18);
        L.forEach((l) => { l.r.set(l.k(t)); l.dots.forEach((d) => d.set(ob(seg(t, d.when, d.when + 0.42)))); });
        const ck = seg(t, 2.6, 3.15); cap.setAttribute("opacity", ck > 0.01 ? 1 : 0); tf(cap, 1220, 500, Math.max(ob(ck), 0.001));
        const pk = seg(t, 2.8, 3.7), pw = 320 + 140 * oc(pk), ph = 112 + 140 * oc(pk);
        pulse.setAttribute("x", 1220 - pw / 2); pulse.setAttribute("y", 500 - ph / 2); pulse.setAttribute("width", pw); pulse.setAttribute("height", ph); pulse.setAttribute("rx", ph / 2); pulse.setAttribute("opacity", pk > 0 && pk < 1 ? 0.8 * (1 - pk) : 0);
      };
    },
  };

  /* ---- player: the timeline plays once, rests on its final frame, fades and replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const REST = 3.6, FADE = 0.45;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 1600, H = sc.h || 1200, cyc = sc.dur + REST;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    const stage = el("g", {}, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => {
      const now = clock(); let t = sc.dur, a = 1;
      if (!held) { const u = (((now + off) % cyc) + cyc) % cyc; t = Math.min(u, sc.dur); a = Math.min(oc(seg(u, 0, 0.3)), 1 - io(seg(u, cyc - FADE, cyc))); }
      stage.setAttribute("opacity", a); draw(t, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !calm) raf = requestAnimationFrame(tick); };
    const api = { calm, now: clock, hold: () => { held = true; tick(); }, resume: () => { if (calm) return; held = false; off = cyc - FADE - clock(); } };
    draw = sc.build(stage, api);
    if (frozen) { draw(isNaN(fixed) ? sc.dur : fixed, 0); return; }
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
