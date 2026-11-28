/* Bright coded scenes for "How to remove a photo background free with BgSub, in your browser". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", WHITE = "#fff";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  // scale and rotate n about (cx, cy), then shift it by dx, dy
  const about = (n, cx, cy, s = 1, dx = 0, dy = 0, r = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${Math.max(s, 0.001)}) translate(${-cx} ${-cy})`);
  const show = (n, o) => n.setAttribute("opacity", cl(o));
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  // a card with a soft offset shadow (lilac, or soft on a lilac card) and a crisp ink outline
  const card = (p, x, y, w, h, rx, fill, off = 14, sh = LIL) => { if (off) el("rect", { x: x + off, y: y + off, width: w, height: h, rx, fill: sh }, p); return el("rect", { x, y, width: w, height: h, rx, fill, stroke: INK, "stroke-width": 3 }, p); };
  const hint = (svg, s) => txt(svg, 80, 96, s, { "font-family": MONO, "font-size": 28, "font-weight": 500, fill: MUTE });
  const pad = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: WHITE, "fill-opacity": 0 }, g);
  const ring = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 10", "stroke-linecap": "round", class: "mg-ring" }, g);
  let uid = 0; // a counter for SVG ids, so ids are the same on every load
  // the ten corners of a five point star, top point first
  const starPts = (cx, cy, R, r) => Array.from({ length: 10 }, (_, i) => { const a = ((-90 + i * 36) * Math.PI) / 180, q = i % 2 ? r : R; return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; });
  const pathOf = (pts, close = true) => "M" + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L") + (close ? " Z" : "");
  const STROKE = { stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" };

  const SC = {};

  /* ---- 1. a magic lantern projects the loading message, then the first opening note ---- */
  SC.magiclantern = {
    w: 1600, h: 1200, dur: 9, still: 9,
    build(svg, api) {
      const hn = hint(svg, "tap the lantern");
      const beam = el("path", { fill: SKY }, svg);
      // the soft white table
      const tbl = el("g", {}, svg);
      card(tbl, 100, 820, 660, 38, 12, SOFT, 10);
      [152, 672].forEach((x) => el("rect", { x, y: 858, width: 36, height: 200, rx: 8, fill: SOFT, ...STROKE }, tbl));
      el("rect", { x: 188, y: 968, width: 484, height: 22, rx: 8, fill: SOFT, ...STROKE }, tbl);
      // the yellow lantern
      const lan = el("g", {}, svg); pad(lan, 196, 376, 508, 462, 40);
      const li = el("g", {}, lan);
      el("rect", { x: 330, y: 446, width: 80, height: 124, rx: 8, fill: YEL, ...STROKE }, li);
      [488, 514].forEach((y) => el("path", { d: `M350 ${y} H390`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, li));
      el("rect", { x: 304, y: 420, width: 132, height: 34, rx: 12, fill: YEL, ...STROKE }, li);
      el("circle", { cx: 370, cy: 406, r: 13, fill: YEL, ...STROKE }, li);
      card(li, 220, 560, 300, 240, 24, YEL, 14);
      el("rect", { x: 252, y: 592, width: 236, height: 176, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, li);
      const win = el("circle", { cx: 370, cy: 680, r: 50, fill: WHITE, ...STROKE }, li);
      [[274, 614], [466, 614], [274, 746], [466, 746]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 6, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, li));
      [250, 446].forEach((x) => el("rect", { x, y: 798, width: 44, height: 24, rx: 8, fill: YEL, ...STROKE }, li));
      el("rect", { x: 520, y: 628, width: 116, height: 84, rx: 10, fill: YEL, ...STROKE }, li);
      el("rect", { x: 596, y: 616, width: 26, height: 108, rx: 8, fill: YEL, ...STROKE }, li);
      const halo = el("ellipse", { cx: 650, cy: 670, rx: 40, ry: 72, fill: "none", stroke: SKY, "stroke-width": 12 }, li);
      el("ellipse", { cx: 648, cy: 670, rx: 22, ry: 50, fill: BLUE, ...STROKE }, li);
      const glint = el("ellipse", { cx: 643, cy: 650, rx: 6, ry: 15, fill: WHITE }, li);
      ring(lan, 196, 376, 508, 462, 40);
      button(lan, "Lantern: dim it and run the loading again", () => api.rewind(1.0, 1.0));
      // the lilac panel on the wall
      const pan = el("g", {}, svg);
      card(pan, 880, 300, 620, 380, 30, LIL, 16, SOFT);
      const big = { "text-anchor": "middle", "font-size": 56, "font-weight": 700 };
      const t1 = el("g", {}, pan), t2 = el("g", {}, pan);
      const l1 = ["Please wait", "the program", "loading"].map((s, i) => txt(t1, 1190, 432 + i * 70, s, big));
      const l2 = ["Only the first", "opening requires", "loading"].map((s, i) => txt(t2, 1190, 432 + i * 70, s, big));
      // the mint bar below it
      const bar = el("g", {}, svg);
      card(bar, 880, 730, 620, 56, 28, WHITE, 10, SOFT);
      const fill = el("rect", { x: 890, y: 740, width: 36, height: 36, rx: 18, fill: MINT, stroke: INK, "stroke-width": 2.5 }, bar);
      return (t) => {
        const tk = oc(seg(t, 0, 0.5)); show(tbl, tk); tf(tbl, 0, 40 * (1 - tk));
        show(li, oc(seg(t, 0.1, 0.35))); about(li, 444, 820, 0.85 + 0.15 * ob(seg(t, 0.1, 0.8)));
        show(hn, oc(seg(t, 0.4, 0.9)));
        const lit = seg(t, 1.2, 1.6);
        show(halo, lit > 0 ? 1 : 0); about(halo, 650, 670, 0.5 + 0.5 * ob(lit)); show(glint, oc(seg(t, 1.25, 1.45)));
        win.setAttribute("fill", lit > 0.3 ? SKY : WHITE);
        const b = oc(seg(t, 1.5, 2.3)), fx = lerp(650, 900, b);
        beam.setAttribute("d", `M650 628 L${fx} ${lerp(628, 316, b)} L${fx} ${lerp(712, 664, b)} L650 712 Z`); show(beam, b > 0 ? 1 : 0);
        show(pan, oc(seg(t, 2.0, 2.2)));
        about(pan, 880, 490, (0.55 + 0.45 * ob(seg(t, 2.0, 2.6))) * (1 + 0.045 * bump(t, 6.1, 6.6)));
        l1.forEach((n, i) => { const k = oc(seg(t, 2.45 + i * 0.1, 2.85 + i * 0.1)); show(n, k); tf(n, 0, 24 * (1 - k)); });
        const o = io(seg(t, 6.1, 6.4)); show(t1, 1 - o); tf(t1, 0, -34 * o);
        l2.forEach((n, i) => { const k = oc(seg(t, 6.35 + i * 0.1, 6.75 + i * 0.1)); show(n, k); tf(n, 0, 28 * (1 - k)); });
        const bk = oc(seg(t, 2.6, 3.0)); show(bar, bk); about(bar, 1190, 758, 1 + 0.04 * bump(t, 6.05, 6.4), 0, 24 * (1 - bk));
        const f = io(seg(t, 3.1, 6.1)); fill.setAttribute("width", 36 + 564 * f); show(fill, f > 0 ? 1 : 0);
      };
    },
  };

  /* ---- 2. a cookie cutter lifts a star, Erase takes the crumb, Restore brings the tip back ---- */
  SC.cookiecutter = {
    w: 1600, h: 1200, dur: 9.5, still: 9.5,
    build(svg, api) {
      const hn = hint(svg, "tap the cutter");
      const R = 150, r = 66, S = starPts(0, 0, R, r), A = S[0];
      const P1 = mix(A, S[1], 0.5), P2 = mix(A, S[9], 0.5), Q1 = mix(A, S[1], 0.62), Q2 = mix(A, S[9], 0.62), M = mix(P1, P2, 0.5);
      const body = pathOf([P1, ...S.slice(1), P2]), tipD = pathOf([A, Q1, Q2]);
      const B = [420, 780], RST = [420, 300], D = [1180, 500];
      // the soft white dough and the hole the cutter leaves
      const dough = el("g", {}, svg); card(dough, 120, 560, 600, 440, 48, SOFT, 16);
      const hole = el("path", { d: pathOf(starPts(B[0], B[1], R, r)), fill: WHITE, ...STROKE }, dough);
      // the two buttons
      const btn = (x, w, label, col) => {
        const g = el("g", {}, svg), gi = el("g", {}, g);
        const halo = el("rect", { x, y: 880, width: w, height: 100, rx: 50, fill: "none", stroke: col, "stroke-width": 8 }, gi);
        card(gi, x, 880, w, 100, 50, WHITE, 10);
        const lit = el("rect", { x, y: 880, width: w, height: 100, rx: 50, fill: col, ...STROKE }, gi);
        const word = mono(gi, x + w / 2, 944, label, 42, { fill: MUTE });
        return { g, gi, halo, lit, word, cx: x + w / 2 };
      };
      const er = btn(900, 270, "Erase", BLUE), rs = btn(1210, 290, "Restore", MINT);
      const press = (b, t, at) => {
        about(b.gi, b.cx, 930, 1 - 0.07 * bump(t, at - 0.13, at + 0.17));
        const on = t >= at; show(b.lit, on ? 1 : 0); b.word.setAttribute("fill", on ? INK : MUTE);
        const h = seg(t, at, at + 0.62); show(b.halo, h > 0 && h < 1 ? 1 : 0); b.halo.setAttribute("stroke-width", 10 * (1 - h)); about(b.halo, b.cx, 930, 1 + 0.3 * oc(h));
      };
      // the soft white star, with a lilac crumb on one point and its top tip missing
      const st = el("g", {}, svg), shB = el("g", {}, st);
      el("path", { d: body, fill: LIL }, shB); const shTip = el("path", { d: tipD, fill: LIL }, shB);
      el("path", { d: body, fill: SOFT, ...STROKE }, st);
      const ghost = el("path", { d: pathOf([P1, A, P2], false), fill: "none", ...STROKE, "stroke-dasharray": "9 10", "stroke-linecap": "round" }, st);
      const tip = el("g", {}, st);
      el("path", { d: tipD, fill: SOFT }, tip);
      el("path", { d: pathOf([Q1, A, Q2], false), fill: "none", ...STROKE, "stroke-linecap": "round" }, tip);
      const crumb = el("g", {}, st);
      el("circle", { cx: 92, cy: 128, r: 19, fill: LIL, stroke: INK, "stroke-width": 2.5 }, crumb);
      el("circle", { cx: 112, cy: 112, r: 11, fill: LIL, stroke: INK, "stroke-width": 2.5 }, crumb);
      const bits = [[1, 0.25], [0.2, 1], [0.95, -0.6]].map(([dx, dy]) => ({ dx, dy, n: el("circle", { r: 7, fill: LIL, stroke: INK, "stroke-width": 2 }, st) }));
      // the yellow cutter
      const cu = el("g", {}, svg);
      const cuSh = el("path", { d: pathOf(S), fill: "none", stroke: LIL, "stroke-width": 30, "stroke-linejoin": "round" }, cu);
      el("path", { d: pathOf(S), fill: "none", stroke: INK, "stroke-width": 30, "stroke-linejoin": "round" }, cu);
      el("path", { d: pathOf(S), fill: "none", stroke: YEL, "stroke-width": 24, "stroke-linejoin": "round" }, cu);
      el("circle", { r: 205, fill: WHITE, "fill-opacity": 0 }, cu);
      el("circle", { r: 198, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 10", "stroke-linecap": "round", class: "mg-ring" }, cu);
      button(cu, "Cutter: press the dough and lift the star again", () => api.rewind(0.95, 1.1));
      return (t) => {
        const dk = oc(seg(t, 0, 0.55)); show(dough, dk); tf(dough, 0, 40 * (1 - dk));
        [er, rs].forEach((b, i) => { const k = oc(seg(t, 0.25 + i * 0.1, 0.75 + i * 0.1)); show(b.g, k); tf(b.g, 0, 30 * (1 - k)); });
        show(hn, oc(seg(t, 0.45, 0.95)));
        // the star path: lifted out of the dough, carried right, set down
        const u1 = io(seg(t, 2.1, 2.6)), u2 = io(seg(t, 2.6, 3.6)), u3 = seg(t, 3.6, 4.0), u4 = io(seg(t, 3.7, 4.7));
        const tp = mix([B[0], B[1] - 160 * u1], D, u2); tp[1] -= 70 * Math.sin(Math.PI * u2);
        const ts = 1 + 0.08 * u1 + 0.17 * u2, to = 28 * u1 - 14 * ob(u3);
        const cut = t >= 1.75;
        show(st, cut ? 1 : 0); show(hole, cut ? 1 : 0);
        tf(st, tp[0], tp[1], ts); shB.setAttribute("transform", `translate(${to / ts} ${to / ts})`);
        // the cutter: drops in, presses, carries the star, goes back to rest
        let cx, cy, cs, co;
        if (t < 1.6) { const d1 = io(seg(t, 1.0, 1.6)), p = mix(RST, B, d1); cx = p[0]; cy = p[1] - 30 * Math.sin(Math.PI * d1); cs = (0.7 + 0.3 * ob(seg(t, 0.1, 0.8))) * (1 + 0.06 * Math.sin(Math.PI * d1)); co = 28 * (1 - d1); }
        else if (t < 2.1) { cx = B[0]; cy = B[1]; cs = t < 1.75 ? 1 - 0.05 * oc(seg(t, 1.6, 1.75)) : 0.95 + 0.05 * ob(seg(t, 1.75, 2.05)); co = 0; }
        else if (t < 3.7) { cx = tp[0]; cy = tp[1]; cs = ts; co = 28 * u1; }
        else { const p = mix(D, RST, u4); cx = p[0]; cy = p[1] - 80 * Math.sin(Math.PI * u4); cs = lerp(1.25, 1, u4) + 0.08 * Math.sin(Math.PI * u4); co = 28 + 12 * Math.sin(Math.PI * u4); }
        show(cu, oc(seg(t, 0.1, 0.3))); tf(cu, cx, cy, cs); cuSh.setAttribute("transform", `translate(${co / cs} ${co / cs})`);
        // Erase lights up and the crumb goes
        press(er, t, 4.98);
        const c = seg(t, 5.05, 5.45), csz = c < 0.3 ? 1 + 0.25 * oc(c / 0.3) : 1.25 * (1 - oc((c - 0.3) / 0.7));
        show(crumb, csz > 0.01 ? 1 : 0); about(crumb, 100, 122, csz);
        const bk = seg(t, 5.15, 5.6);
        bits.forEach((b) => { show(b.n, bk > 0 && bk < 1 ? 1 : 0); b.n.setAttribute("transform", `translate(${100 + b.dx * 90 * oc(bk)} ${122 + b.dy * 90 * oc(bk)}) scale(${Math.max(1 - bk, 0.001)})`); });
        // Restore lights up and the tip fills back in
        press(rs, t, 6.08);
        const tk = seg(t, 6.25, 6.85);
        [tip, shTip].forEach((n) => { show(n, tk > 0 ? 1 : 0); about(n, M[0], M[1], ob(tk)); });
        show(ghost, 1 - seg(t, 6.25, 6.5));
      };
    },
  };

  /* ---- 3. a brush dips into three wells and the backdrop behind the star changes ---- */
  SC.paintpalette = {
    w: 1600, h: 1200, dur: 9, still: 9,
    build(svg, api) {
      const hn = hint(svg, "tap the palette");
      const defs = el("defs", {}, svg), id = (s) => `mg${s}${++uid}`;
      const gid = id("grad"), gr = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: 0, "stop-color": SKY }, gr); el("stop", { offset: 1, "stop-color": LIL }, gr);
      const fid = id("frame"); el("rect", { x: 900, y: 200, width: 600, height: 520, rx: 30 }, el("clipPath", { id: fid }, defs));
      const wipes = [0, 1, 2].map(() => { const cid = id("wipe"); return { cid, r: el("rect", { x: 890, y: 190, width: 0, height: 540 }, el("clipPath", { id: cid }, defs)) }; });
      // the backdrop behind the star
      const bd = el("g", {}, svg), bdi = el("g", { transform: "translate(0 60)" }, bd);
      el("rect", { x: 916, y: 216, width: 600, height: 520, rx: 30, fill: LIL }, bdi);
      el("rect", { x: 900, y: 200, width: 600, height: 520, rx: 30, fill: WHITE }, bdi);
      const inner = el("g", { "clip-path": `url(#${fid})` }, bdi);
      const layer = (i) => el("g", { "clip-path": `url(#${wipes[i].cid})` }, inner);
      el("rect", { x: 900, y: 200, width: 600, height: 520, fill: BLUE }, layer(0));
      el("rect", { x: 900, y: 200, width: 600, height: 520, fill: `url(#${gid})` }, layer(1));
      const L3 = layer(2); el("rect", { x: 900, y: 200, width: 600, height: 520, fill: WHITE }, L3);
      const hill = el("path", { d: "M880 760 V612 C1010 470 1170 452 1300 540 C1380 594 1450 604 1520 586 V760 Z", fill: MINT, ...STROKE }, L3);
      el("rect", { x: 900, y: 200, width: 600, height: 520, rx: 30, fill: "none", ...STROKE }, bdi);
      const star = el("path", { d: pathOf(starPts(1200, 440, 140, 62)), fill: SOFT, ...STROKE }, bdi);
      // the soft white palette with its three wells
      const pal = el("g", {}, svg);
      const PD = "M745.8 940.7 A360 250 0 1 0 650 996.5 A62 62 0 0 1 745.8 940.7 Z";
      el("path", { d: PD, fill: LIL, transform: "translate(16 16)" }, pal);
      el("path", { d: PD, fill: SOFT, ...STROKE }, pal);
      const WL = [[250, 724, BLUE, BLUE, "Pure"], [470, 680, `url(#${gid})`, LIL, "Gradient"], [690, 724, MINT, MINT, "Image"]];
      const wells = WL.map(([x, y, f, rc, s]) => {
        const g = el("g", {}, pal);
        const rip = el("circle", { cx: x, cy: y, r: 66, fill: "none", stroke: rc, "stroke-width": 8 }, g);
        el("circle", { cx: x, cy: y, r: 66, fill: f, ...STROKE }, g);
        el("ellipse", { cx: x - 24, cy: y - 26, rx: 15, ry: 8, fill: WHITE, transform: `rotate(-30 ${x - 24} ${y - 26})` }, g);
        return { g, rip, lab: mono(pal, x, y + 114, s, 34), x, y };
      });
      el("ellipse", { cx: 470, cy: 780, rx: 382, ry: 272, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 10", "stroke-linecap": "round", class: "mg-ring" }, pal);
      button(pal, "Palette: dip the brush again", () => api.rewind(1.0, 1.2));
      // the yellow brush, its tip at 0,0
      const br = el("g", {}, svg);
      el("path", { d: "M-18 -142 L-11 -404 Q0 -420 11 -404 L18 -142 Z", fill: YEL, ...STROKE }, br);
      const bristle = el("path", { d: "M0 0 C-20 -18 -26 -56 -22 -90 H22 C26 -56 20 -18 0 0 Z", fill: SOFT, ...STROKE }, br);
      el("rect", { x: -24, y: -146, width: 48, height: 56, rx: 8, fill: SOFT, ...STROKE }, br);
      [-128, -110].forEach((y) => el("path", { d: `M-24 ${y} H24`, stroke: INK, "stroke-width": 2.5 }, br));
      const R0 = [600, 470], hov = (i) => [WL[i][0] + 4, WL[i][1] - 120], dip = (i) => [WL[i][0] + 4, WL[i][1] + 2];
      const DIP = [1.8, 3.3, 4.8];
      const KF = [[1.0, R0], [1.5, hov(0)], [1.8, dip(0)], [2.1, hov(0)], [3.0, hov(1)], [3.3, dip(1)], [3.6, hov(1)], [4.5, hov(2)], [4.8, dip(2)], [5.1, hov(2)], [6.0, hov(2)], [6.8, R0]];
      const at = (t) => { if (t <= KF[0][0]) return KF[0][1]; for (let i = 1; i < KF.length; i++) if (t <= KF[i][0]) { const [t0, a] = KF[i - 1], [t1, b] = KF[i]; return mix(a, b, io((t - t0) / (t1 - t0))); } return KF[KF.length - 1][1]; };
      return (t) => {
        const pk = oc(seg(t, 0, 0.6)); show(pal, pk); tf(pal, 0, 40 * (1 - pk));
        wells.forEach((w, i) => {
          show(w.g, oc(seg(t, 0.15 + i * 0.1, 0.3 + i * 0.1))); about(w.g, w.x, w.y, 0.3 + 0.7 * ob(seg(t, 0.15 + i * 0.1, 0.65 + i * 0.1)));
          const lk = oc(seg(t, 0.5 + i * 0.1, 0.9 + i * 0.1)); show(w.lab, lk); about(w.lab, w.x, w.y + 102, 1 + 0.15 * bump(t, DIP[i], DIP[i] + 0.4), 0, 20 * (1 - lk));
          const rk = seg(t, DIP[i], DIP[i] + 0.55); show(w.rip, rk > 0 && rk < 1 ? 1 : 0); w.rip.setAttribute("stroke-width", 10 * (1 - rk)); about(w.rip, w.x, w.y, 1 + 0.4 * oc(rk));
        });
        const bk = oc(seg(t, 0.1, 0.7)); show(bd, bk); tf(bd, 60 * (1 - bk), 0);
        const pulse = bump(t, 2.8, 3.15) + bump(t, 4.3, 4.65) + bump(t, 6.1, 6.45);
        about(star, 1200, 440, (0.4 + 0.6 * ob(seg(t, 0.35, 0.95))) * (1 + 0.06 * pulse));
        [[2.0, 2.8], [3.5, 4.3], [5.0, 5.8]].forEach(([a, b], i) => wipes[i].r.setAttribute("width", 620 * io(seg(t, a, b))));
        hill.setAttribute("transform", `translate(0 ${170 * (1 - ob(seg(t, 5.3, 6.1)))})`);
        const brk = oc(seg(t, 0.55, 1.0)), p = at(t);
        show(br, brk); tf(br, p[0], p[1] - 80 * (1 - brk), 1, 24);
        bristle.setAttribute("fill", t >= DIP[2] ? MINT : t >= DIP[1] ? `url(#${gid})` : t >= DIP[0] ? BLUE : SOFT);
        show(hn, oc(seg(t, 0.6, 1.1)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 4, still: 4,
    build(svg) {
      const parts = [];
      const up = (g, at) => parts.push((t) => { const k = oc(seg(t, at, at + 0.6)); show(g, k); tf(g, 0, 28 * (1 - k)); });
      const pop = (g, at, cx, cy) => parts.push((t) => { show(g, oc(seg(t, at, at + 0.2))); about(g, cx, cy, 0.4 + 0.6 * ob(seg(t, at, at + 0.6))); });
      const chip = el("g", {}, svg);
      el("rect", { x: 100, y: 104, width: 214, height: 62, rx: 31, fill: SKY, ...STROKE }, chip);
      mono(chip, 207, 146, "AI tools", 30); up(chip, 0);
      const big = { "font-size": 92, "font-weight": 700 };
      ["Remove a photo", "background", "with BgSub"].forEach((s, i) => up(txt(svg, 98, 290 + i * 102, s, big), 0.1 + i * 0.08));
      const last = svg.lastChild, len = last.getComputedTextLength ? last.getComputedTextLength() : 500;
      const bar = el("path", { d: "M104 530 H104", stroke: YEL, "stroke-width": 18, "stroke-linecap": "round", fill: "none" }, svg);
      parts.push((t) => { const k = io(seg(t, 0.4, 1.0)); bar.setAttribute("d", `M104 530 H${104 + (len - 4) * k}`); show(bar, k > 0 ? 1 : 0); });
      svg.insertBefore(bar, last);
      up(txt(svg, 102, 618, "Free by its own FAQ, all in the browser", { "font-size": 38, "font-weight": 600 }), 0.5);
      up(txt(svg, 104, 700, "Checked 28 Nov 2026", { "font-family": MONO, "font-size": 26, "font-weight": 500, fill: MUTE }), 0.6);
      // a small blue cookie cutter over a lilac tile
      const cc = el("g", {}, svg), S = pathOf(starPts(1250, 178, 76, 34));
      el("path", { d: S, fill: "none", stroke: INK, "stroke-width": 19, "stroke-linejoin": "round" }, cc);
      el("path", { d: S, fill: "none", stroke: BLUE, "stroke-width": 13, "stroke-linejoin": "round" }, cc);
      pop(cc, 0.7, 1250, 178);
      const c1 = el("g", {}, svg); card(c1, 1010, 290, 480, 130, 26, LIL, 14, SOFT); up(c1, 0.8);
      up(mono(svg, 1250, 367, "Up to 4096 x 4096", 34), 1.2);
      // a small yellow paint palette over a mint tile
      const pp = el("g", {}, svg);
      el("ellipse", { cx: 1250, cy: 540, rx: 112, ry: 70, fill: YEL, ...STROKE }, pp);
      [[1194, 528, BLUE], [1250, 506, LIL], [1306, 528, MINT]].forEach(([x, y, f]) => el("circle", { cx: x, cy: y, r: 19, fill: f, stroke: INK, "stroke-width": 2.5 }, pp));
      el("circle", { cx: 1250, cy: 576, r: 14, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, pp);
      pop(pp, 0.9, 1250, 540);
      const c2 = el("g", {}, svg); card(c2, 1010, 640, 480, 130, 26, MINT, 14); up(c2, 1.0);
      up(mono(svg, 1250, 717, "One photo at a time", 34), 1.4);
      return (t) => parts.forEach((f) => f(t));
    },
  };

  /* ---- player: plays once from 0 to dur when in view, holds the calm final frame, a tap replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let raf = 0, seen = false, started = false, run = false, paused = false, from = 0, at = 0, rw = null;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    const time = () => {
      if (calm) return sc.still;
      if (!run) return from;
      const now = clock();
      if (rw) { const k = seg(now, rw.at, rw.at + rw.d); if (k < 1) return lerp(rw.a, rw.b, io(k)); from = rw.b; at = rw.at + rw.d; rw = null; }
      return Math.min(sc.dur, from + now - at);
    };
    let draw = () => {};
    const frame = () => { const t = time(); draw(t, clock()); return run && (!!rw || t < sc.dur); };
    const tick = () => { cancelAnimationFrame(raf); const more = frame(); if (seen && more && !calm) raf = requestAnimationFrame(tick); };
    const api = {
      calm, now: clock, t: time,
      play: (s) => { if (!calm) { from = s; at = clock(); rw = null; run = true; } tick(); },
      // a smooth replay: ease the timeline back to `to` over d seconds, then play on from there
      rewind: (to, d) => { if (!calm) { rw = { a: Math.min(time(), sc.dur), b: to, at: clock(), d }; run = true; } tick(); },
      poke: () => tick(),
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (!started) { started = true; api.play(0); } else { if (paused) { at = clock(); run = true; paused = false; } tick(); }
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else { cancelAnimationFrame(raf); if (run) { from = time(); rw = null; run = false; paused = true; } }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
