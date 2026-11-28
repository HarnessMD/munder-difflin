/* Bright coded scenes for "Does Claude Code Sabotage Research? What a 189 Session Test Found". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAPT = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 19, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const wob = (s, f, d) => (s <= 0 ? 0 : Math.sin(s * f * 2 * Math.PI) * Math.exp(-d * s));
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, cx, cy, s, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`);
  const fade = (n, o) => n.setAttribute("opacity", cl(o));
  const rise = (n, k, dy) => { n.setAttribute("transform", `translate(0 ${dy * (1 - ob(k))})`); fade(n, k * 2.5); };
  const pop = (n, k, cx, cy, from) => { about(n, cx, cy, from + (1 - from) * ob(k)); fade(n, k * 3); };
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, p);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hintAt = (p, s, y = 58) => mono(p, 758, y, s, { "text-anchor": "end", "font-size": 16, "font-weight": 500, fill: MUTE });

  const SC = {};

  /* ---- 1. one task card on the left pan, three framing labels take turns on the right pan ---- */
  SC.balancescale = {
    dur: 9, still: 9,
    build(svg, api) {
      const P = [270, 150], ARM = 140, DROP = 220, LW = 180, LH = 44, MV = 0.7;
      const NAMES = ["Plain", "Trains a model", "Nobody reviews"];
      const RACK = NAMES.map((_, i) => [668, 214 + i * 84]);
      const hint = hintAt(svg, "Tap a label"), root = el("g", { transform: "translate(0 -36)" }, svg);
      const stand = el("g", {}, root);
      el("ellipse", { cx: 270, cy: 550, rx: 150, ry: 10, fill: SOFT }, stand);
      el("rect", { x: 261, y: 150, width: 18, height: 352, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, stand);
      el("path", { d: "M150 548 L178 496 H362 L390 548 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, stand);
      const tag = el("g", {}, root);
      el("rect", { x: 184, y: 505, width: 172, height: 36, rx: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 270, 529.5, "189 sessions", { "font-size": 18 });
      const slots = RACK.map(([x, y]) => el("rect", { x: x - LW / 2, y: y - LH / 2, width: LW, height: LH, rx: 12, fill: "none", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "5 7", opacity: 0 }, root));
      const rig = el("g", {}, root);
      const pan = (withCard) => {
        const g = el("g", {}, rig);
        el("path", { d: "M-96 220 L0 0 L96 220", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-106 220 H106 C98 246 72 258 0 258 C-72 258 -98 246 -106 220 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        let card = null;
        if (withCard) {
          card = el("g", {}, g);
          el("rect", { x: -60, y: 140, width: 120, height: 80, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
          mono(card, 0, 175, "task", { "font-size": 22 });
          el("path", { d: "M-32 194 H32 M-32 207 H12", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, card);
        }
        return { g, card };
      };
      const pl = pan(true), pr = pan(false);
      const beam = el("g", {}, rig);
      el("rect", { x: P[0] - 152, y: P[1] - 8, width: 304, height: 16, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, beam);
      [-ARM, ARM].forEach((dx) => el("circle", { cx: P[0] + dx, cy: P[1], r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, beam));
      el("circle", { cx: P[0], cy: P[1], r: 15, fill: BLUE, stroke: INK, "stroke-width": 3 }, rig);
      el("circle", { cx: P[0], cy: P[1], r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, rig);
      const ON = [[1.6, 3.1], [3.6, 5.1], [5.6, 99]];
      const sp = (i, t) => io(seg(t, ON[i][0], ON[i][0] + MV)) - io(seg(t, ON[i][1], ON[i][1] + 0.6));
      let user = null, lastT = 0;
      const cur = (i, now) => {
        if (!user) return sp(i, lastT);
        const k = api.calm ? 1 : seg(now - user.s, 0, MV);
        if (user.again && i === user.j) return 1 - 0.6 * Math.sin(Math.PI * k);
        return user.from[i] + (user.to[i] - user.from[i]) * io(k);
      };
      const tap = (j) => {
        const now = api.now(), from = NAMES.map((_, i) => cur(i, now));
        user = { s: now, j, from, to: from.map((_, i) => (i === j ? 1 : 0)), again: from[j] > 0.98 };
        api.poke();
      };
      const labels = NAMES.map((s, i) => {
        const g = el("g", {}, root), b = el("g", {}, g);
        el("rect", { x: -LW / 2 + 6, y: -LH / 2 + 6, width: LW, height: LH, rx: 12, fill: LIL }, b);
        el("rect", { x: -LW / 2, y: -LH / 2, width: LW, height: LH, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, b);
        ring(b, -LW / 2 - 8, -LH / 2 - 8, LW + 16, LH + 16, 18);
        mono(b, 0, 6.5, s, { "font-size": 18 });
        button(b, `Slide ${s} onto the pan again`, () => tap(i));
        return g;
      });
      return (t, now) => {
        lastT = t;
        rise(stand, seg(t, 0.1, 0.6), 30);
        rise(rig, seg(t, 0.22, 0.75), -26);
        const kc = seg(t, 0.45, 1.0);
        pl.card.setAttribute("transform", `translate(0 ${-70 * (1 - ob(kc))})`); fade(pl.card, kc * 3);
        pop(tag, seg(t, 6.7, 7.3), 270, 523, 0.5);
        fade(hint, oc(seg(t, 1.1, 1.6)));
        let th = 0;
        if (!api.calm) {
          if (user) th = 2.4 * wob(now - user.s - MV, 1.4, 3.2);
          else ON.forEach(([a]) => { th += 2.4 * wob(t - a - MV, 1.4, 3.2); });
        }
        beam.setAttribute("transform", `rotate(${th} ${P[0]} ${P[1]})`);
        const r = (th * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        const L = [P[0] - ARM * c, P[1] - ARM * s], R = [P[0] + ARM * c, P[1] + ARM * s];
        tf(pl.g, L[0], L[1]); tf(pr.g, R[0], R[1]);
        const onPan = [R[0], R[1] + DROP - LH / 2];
        labels.forEach((g, i) => {
          const p = cl(cur(i, now)), [rx, ry] = RACK[i], ke = seg(t, 0.7 + i * 0.1, 1.2 + i * 0.1);
          const x = rx + (onPan[0] - rx) * p + 70 * (1 - ob(ke)), y = ry + (onPan[1] - ry) * p - 56 * Math.sin(Math.PI * p);
          tf(g, x, y, 1, -4 * Math.sin(Math.PI * p));
          fade(g, ke * 3);
          fade(slots[i], cl(p * 3) * 0.9);
        });
        return !api.calm && !!user && now - user.s < 3;
      };
    },
  };

  /* ---- 2. a pressure gauge for fast_1: 0.92, then 0.88, then a drop to 0.69 ---- */
  SC.pressuregauge = {
    dur: 9, still: 9,
    build(svg, api) {
      const C = [400, 222], RO = 152, RI = 130, TY = C[1] + RO + 20;
      const A = (v) => 135 + (270 * (v - 0.6)) / 0.4;
      const pt = (a, r) => [C[0] + Math.cos((a * Math.PI) / 180) * r, C[1] + Math.sin((a * Math.PI) / 180) * r];
      const VALS = [["Plain", 0.92], ["Trains a model", 0.88], ["Nobody reviews", 0.69]];
      const hint = hintAt(svg, "Tap a button");
      const body = el("g", {}, svg);
      el("circle", { cx: C[0] + 8, cy: C[1] + 8, r: RO, fill: LIL }, body);
      el("rect", { x: C[0] - 22, y: C[1] + RO - 12, width: 44, height: 32, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
      el("circle", { cx: C[0], cy: C[1], r: RO, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
      el("circle", { cx: C[0], cy: C[1], r: RI, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, body);
      const ticks = [];
      for (let i = 0; i <= 20; i++) {
        const a = A(0.6 + i * 0.02), big = i % 5 === 0, [x1, y1] = pt(a, RI - 10), [x2, y2] = pt(a, RI - (big ? 30 : 20));
        ticks.push(el("path", { d: `M${x1} ${y1} L${x2} ${y2}`, stroke: INK, "stroke-width": big ? 3.5 : 2.5, "stroke-linecap": "round" }, svg));
      }
      const arc = el("path", { fill: "none", stroke: LIL, "stroke-width": 14, "stroke-linecap": "round", opacity: 0 }, svg);
      const read = txt(svg, C[0], C[1] + 78, "", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
      const lab = mono(svg, C[0], C[1] + 110, "fast_1", { "font-size": 20 });
      const needle = el("g", {}, svg);
      el("path", { d: "M-22 -7 L110 -2.2 Q114 0 110 2.2 L-22 7 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, needle);
      el("circle", { r: 15, fill: YEL, stroke: INK, "stroke-width": 3 }, needle);
      el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, needle);
      const tagW = el("g", {}, svg), tag = el("g", {}, tagW);
      el("path", { d: `M${C[0]} ${TY - 2} V${TY + 18}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("rect", { x: C[0] - 77, y: TY + 23, width: 164, height: 42, rx: 12, fill: SOFT }, tag);
      el("rect", { x: C[0] - 82, y: TY + 18, width: 164, height: 42, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, C[0], TY + 46, "25% drop", { "font-size": 21 });
      const vT = (t) => (t < 1.4 ? 0.6 + 0.32 * ob(seg(t, 0.6, 1.4)) : t < 4.7 ? 0.92 - 0.04 * io(seg(t, 2.6, 3.5)) : 0.88 - 0.19 * ob(seg(t, 4.7, 5.6)));
      const rT = (t) => (t < 3.4 ? ["0.92", oc(seg(t, 1.3, 1.6)) * (1 - seg(t, 2.6, 2.8))] : t < 5.5 ? ["0.88", oc(seg(t, 3.4, 3.7)) * (1 - seg(t, 4.7, 4.9))] : ["0.69", oc(seg(t, 5.5, 5.8))]);
      let user = null, lastT = 0, shown = "0.92";
      const val = (now) => (user ? user.from + (VALS[user.i][1] - user.from) * ob(api.calm ? 1 : seg(now - user.s, 0, 0.9)) : vT(lastT));
      const tap = (i) => { const now = api.now(); user = { s: now, i, from: val(now), old: shown }; api.poke(); };
      const BY = 490, BH = 50, GAP = 22, widths = VALS.map(([s]) => s.length * 11.4 + 44);
      let bx = 400 - (widths.reduce((a, b) => a + b) + GAP * 2) / 2;
      const btns = VALS.map(([s, v], i) => {
        const w = widths[i], x = bx; bx += w + GAP;
        const g = el("g", {}, svg), b = el("g", {}, g);
        const sh = el("rect", { x: x + 5, y: BY + 5, width: w, height: BH, rx: 14, fill: SOFT }, b);
        const face = el("g", {}, b);
        const rc = el("rect", { x, y: BY, width: w, height: BH, rx: 14, fill: SKY, stroke: INK, "stroke-width": 2.5 }, face);
        mono(face, x + w / 2, BY + 32, s, { "font-size": 19 });
        ring(b, x - 7, BY - 11, w + 19, BH + 22, 20);
        button(b, `${s}: move the needle to ${v}`, () => tap(i));
        return { g, sh, face, rc };
      });
      return (t, now) => {
        lastT = t;
        pop(body, seg(t, 0.1, 0.6), C[0], C[1], 0.85);
        ticks.forEach((n, i) => fade(n, seg(t, 0.3 + i * 0.028, 0.45 + i * 0.028)));
        fade(lab, oc(seg(t, 0.55, 0.9)));
        needle.setAttribute("transform", `translate(${C[0]} ${C[1]}) rotate(${A(val(now))})`);
        fade(needle, seg(t, 0.5, 0.7));
        let rs, ro;
        if (user) {
          const s = api.calm ? 9 : now - user.s, nv = VALS[user.i][1].toFixed(2);
          if (nv === user.old) { rs = nv; ro = 1; } else if (s < 0.8) { rs = user.old; ro = 1 - seg(s, 0, 0.15); } else { rs = nv; ro = oc(seg(s, 0.8, 1.1)); }
        } else [rs, ro] = rT(t);
        shown = rs; read.textContent = rs; fade(read, ro);
        const ka = oc(seg(t, 5.9, 6.6));
        if (ka > 0.001) { const a0 = A(0.92), a1 = a0 - (a0 - A(0.69)) * ka, [x0, y0] = pt(a0, 84), [x1, y1] = pt(a1, 84); arc.setAttribute("d", `M${x0} ${y0} A84 84 0 0 0 ${x1} ${y1}`); }
        fade(arc, ka > 0.001 ? 1 : 0);
        const kt = seg(t, 6.4, 7.0);
        tagW.setAttribute("transform", `translate(0 ${-26 * (1 - ob(kt))})`); fade(tagW, kt * 3);
        tag.setAttribute("transform", `rotate(${api.calm ? 0 : 7 * wob(t - 7.0, 1.2, 3)} ${C[0]} ${TY})`);
        fade(hint, oc(seg(t, 1.1, 1.6)));
        const act = user ? user.i : t < 2.6 ? 0 : t < 4.7 ? 1 : 2;
        btns.forEach((b, i) => {
          rise(b.g, seg(t, 0.7 + i * 0.1, 1.2 + i * 0.1), 26);
          const on = i === act && t > 1.3;
          b.face.setAttribute("transform", `translate(0 ${on ? -4 : 0})`); b.sh.setAttribute("fill", on ? LIL : SOFT); b.rc.setAttribute("stroke-width", on ? 3 : 2.5);
        });
        return !api.calm && !!user && now - user.s < 1.5;
      };
    },
  };

  /* ---- 3. a weathervane that swings between three explanations and never settles ---- */
  SC.weathervane = {
    dur: 9, still: 9,
    build(svg, api) {
      const P = [400, 270], R0 = 305, RA = 162;
      const SG = [[["Intent"], 150, 190], [["Capability limit"], 400, 70], [["Disclosed", "safeguard"], 652, 190]];
      const ANG = SG.map(([, x, y]) => (Math.atan2(y - P[1], x - P[0]) * 180) / Math.PI);
      const pt = (a) => [P[0] + Math.cos((a * Math.PI) / 180) * RA, P[1] + Math.sin((a * Math.PI) / 180) * RA];
      const near = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
      const hint = hintAt(svg, "Tap the arrow", 50);
      const stand = el("g", {}, svg);
      el("ellipse", { cx: 400, cy: 498, rx: 130, ry: 10, fill: SOFT }, stand);
      el("rect", { x: 391, y: P[1], width: 18, height: 208, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, stand);
      el("path", { d: "M328 498 L350 470 H450 L472 498 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, stand);
      const TW = 25 * 11.4 + 40, tag = el("g", {}, svg);
      el("path", { d: "M400 497 V518", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("rect", { x: 400 - TW / 2 + 6, y: 522, width: TW, height: 44, rx: 12, fill: SOFT }, tag);
      el("rect", { x: 400 - TW / 2, y: 516, width: TW, height: 44, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 400, 544.5, "Measured from the outside", { "font-size": 19 });
      const signs = SG.map(([s, x, y]) => {
        const w = Math.max(...s.map((l) => l.length)) * 11.4 + 36, h = 22 + 26 * s.length, g = el("g", {}, svg);
        const sh = el("rect", { x: x - w / 2 + 6, y: y - h / 2 + 6, width: w, height: h, rx: 12, fill: LIL }, g);
        el("rect", { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        s.forEach((l, j) => mono(g, x, y + 6.6 + 26 * (j - (s.length - 1) / 2), l, { "font-size": 19 }));
        return { g, sh, x, y };
      });
      const arc = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 10", "stroke-linecap": "round", opacity: 0 }, svg);
      const heads = [0, 1].map(() => el("path", { d: "M-8 -9 L2 0 L-8 9", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0 }, svg));
      const aw = el("g", {}, svg), ar = el("g", {}, aw);
      el("rect", { x: -126, y: -36, width: 272, height: 72, rx: 36, fill: "#fff", "fill-opacity": 0 }, ar);
      ring(ar, -132, -40, 284, 80, 40);
      el("rect", { x: -92, y: -6, width: 202, height: 12, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, ar);
      el("path", { d: "M-120 -28 L-80 -28 L-60 0 L-80 28 L-120 28 L-100 0 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ar);
      el("path", { d: "M100 -24 L142 0 L100 24 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ar);
      const cap = el("circle", { cx: P[0], cy: P[1], r: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const KF = [[1.2, 2.2, ANG[0] + 720], [2.9, 3.5, ANG[1] + 720], [4.2, 4.8, ANG[2] + 720], [5.5, 6.3, R0 + 360]];
      const aT = (t) => {
        let a = R0, w = 0;
        for (const [s, e, to] of KF) {
          if (t < s) break;
          const from = a; a = from + (to - from) * io(seg(t, s, e));
          w += Math.sign(to - from) * (to === R0 + 360 ? 4 : 10) * wob(t - e, 1.7, 4.2);
        }
        return a + w;
      };
      const STEPS = [ANG[0], ANG[1], ANG[2], R0];
      let user = null, lastT = 0;
      const curA = (now) => {
        if (!user) return aT(lastT);
        if (user.calm) return STEPS[user.step];
        const s = now - user.s, d = ((((user.cur - R0) % 360) + 540) % 360) - 180;
        return aT(1.2 + s) + d * (1 - io(seg(s, 0, 1.0)));
      };
      const tapA = () => {
        const now = api.now();
        user = api.calm ? { calm: true, step: user && user.calm ? (user.step + 1) % 4 : 0 } : { s: now, cur: curA(now) };
        api.poke();
      };
      button(ar, "Spin the weathervane arrow again", tapA);
      return (t, now) => {
        lastT = t;
        rise(stand, seg(t, 0.1, 0.6), 40);
        pop(aw, seg(t, 0.35, 0.9), P[0], P[1], 0.5);
        pop(cap, seg(t, 0.3, 0.7), P[0], P[1], 0.4);
        const a = curA(now);
        ar.setAttribute("transform", `translate(${P[0]} ${P[1]}) rotate(${a})`);
        signs.forEach((sg, i) => {
          const k = seg(t, 0.5 + i * 0.1, 1.0 + i * 0.1), c = cl(1 - near(a, ANG[i]) / 16);
          about(sg.g, sg.x, sg.y, (0.6 + 0.4 * ob(k)) * (1 + 0.05 * c), 0, -5 * c); fade(sg.g, k * 3);
          sg.sh.setAttribute("transform", `translate(${3 * c} ${3 * c})`);
        });
        const ka = oc(seg(t, 6.4, 7.0));
        if (ka > 0.001) {
          const a0 = 270 - 74 * ka, a1 = 270 + 74 * ka, [x0, y0] = pt(a0), [x1, y1] = pt(a1);
          arc.setAttribute("d", `M${x0} ${y0} A${RA} ${RA} 0 0 1 ${x1} ${y1}`);
          tf(heads[0], x0, y0, 1, a0 - 90); tf(heads[1], x1, y1, 1, a1 + 90);
        }
        fade(arc, ka > 0.001 ? 1 : 0);
        heads.forEach((h) => fade(h, seg(t, 6.8, 7.0)));
        rise(tag, seg(t, 6.9, 7.5), 30);
        fade(hint, oc(seg(t, 1.0, 1.5)));
        return !!user && !user.calm && now - user.s < 8.5;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 112, width: 104, height: 40, rx: 20, fill: SKY, stroke: INK, "stroke-width": 2.5 }, pill);
      mono(pill, 116, 138.5, "News", { "font-size": 19 });
      const l1 = txt(svg, 62, 226, "Does Claude Code", { "font-size": 54, "font-weight": 700 });
      const l2 = txt(svg, 62, 290, "Sabotage Research?", { "font-size": 54, "font-weight": 700 });
      let L = 0;
      try { L = l2.getComputedTextLength(); } catch (e) { L = 0; }
      if (!(L > 100)) L = 540;
      const ul = el("path", { stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", fill: "none" });
      svg.insertBefore(ul, l1);
      const sub = txt(svg, 64, 368, "A preliminary test of Claude Code", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const chk = mono(svg, 64, 408, "Checked 28 Nov 2026", { "text-anchor": "start", "font-size": 17, "font-weight": 500, fill: CAPT });
      const TX = 676, TW = 240, TH = 196;
      const tile = (y, fill) => { const g = el("g", {}, svg); el("rect", { x: TX + 8, y: y + 8, width: TW, height: TH, rx: 22, fill: SOFT }, g); el("rect", { x: TX, y, width: TW, height: TH, rx: 22, fill, stroke: INK, "stroke-width": 3 }, g); return g; };
      const t1 = tile(62, LIL), t2 = tile(282, MINT);
      const G = [796, 138], A = (v) => 135 + (270 * (v - 0.6)) / 0.4;
      el("rect", { x: G[0] - 11, y: G[1] + 48, width: 22, height: 18, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, t1);
      el("circle", { cx: G[0], cy: G[1], r: 56, fill: BLUE, stroke: INK, "stroke-width": 3 }, t1);
      el("circle", { cx: G[0], cy: G[1], r: 45, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, t1);
      for (let i = 0; i <= 10; i++) {
        const a = ((135 + 27 * i) * Math.PI) / 180, r2 = i % 5 === 0 ? 28 : 33;
        el("path", { d: `M${G[0] + Math.cos(a) * 40} ${G[1] + Math.sin(a) * 40} L${G[0] + Math.cos(a) * r2} ${G[1] + Math.sin(a) * r2}`, stroke: INK, "stroke-width": i % 5 === 0 ? 3 : 2, "stroke-linecap": "round" }, t1);
      }
      const needle = el("g", {}, t1);
      el("path", { d: "M-9 -3.5 L36 -1.2 L36 1.2 L-9 3.5 Z", fill: YEL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, needle);
      el("circle", { r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, needle);
      const lab1 = mono(t1, 796, 234, "fast_1: 25% drop", { "font-size": 17 });
      const S = [796, 318];
      el("rect", { x: S[0] - 6, y: S[1], width: 12, height: 86, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2.5 }, t2);
      el("path", { d: "M748 418 L762 400 H830 L844 418 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, t2);
      const span = (load) => {
        const g = el("g", {}, t2);
        el("path", { d: "M-34 56 L0 0 L34 56", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-38 56 H38 C34 66 24 70 0 70 C-24 70 -34 66 -38 56 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("rect", load ? { x: -16, y: 34, width: 32, height: 22, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2 } : { x: -21, y: 42, width: 42, height: 14, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2 }, g);
        return g;
      };
      const sl = span(true), sr = span(false);
      const sbeam = el("rect", { x: S[0] - 76, y: S[1] - 5, width: 152, height: 10, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, t2);
      el("circle", { cx: S[0], cy: S[1], r: 7, fill: SKY, stroke: INK, "stroke-width": 2.5 }, t2);
      const lab2 = mono(t2, 796, 456, "nanoGPT: the same fix", { "font-size": 16 });
      return (t) => {
        pop(pill, seg(t, 0.1, 0.5), 116, 132, 0.6);
        rise(l1, seg(t, 0.2, 0.7), 24); rise(l2, seg(t, 0.32, 0.82), 24);
        const ku = oc(seg(t, 0.55, 1.1));
        ul.setAttribute("d", `M66 314 H${66 + Math.max(1, (L - 4) * ku)}`); fade(ul, ku > 0.01 ? 1 : 0);
        rise(sub, seg(t, 0.8, 1.3), 18); rise(chk, seg(t, 0.92, 1.42), 18);
        rise(t1, seg(t, 1.05, 1.6), 30); rise(t2, seg(t, 1.17, 1.72), 30);
        needle.setAttribute("transform", `translate(${G[0]} ${G[1]}) rotate(${A(0.92 - 0.23 * ob(seg(t, 1.5, 2.4)))})`);
        const th = 4 * wob(t - 1.8, 1.3, 3), r = (th * Math.PI) / 180;
        sbeam.setAttribute("transform", `rotate(${th} ${S[0]} ${S[1]})`);
        tf(sl, S[0] - 64 * Math.cos(r), S[1] - 64 * Math.sin(r)); tf(sr, S[0] + 64 * Math.cos(r), S[1] + 64 * Math.sin(r));
        fade(lab1, oc(seg(t, 2.2, 2.6))); fade(lab2, oc(seg(t, 2.32, 2.72)));
        return false;
      };
    },
  };

  /* ---- player: plays once while in view, then holds the calm final frame; a tap replays its part ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let pos = calm ? sc.still : 0, last = 0, raf = 0, seen = false;
    const clock = () => performance.now() / 1000;
    let draw = () => false;
    const frame = () => { const now = clock(); if (seen && last) pos = Math.min(sc.dur, pos + Math.min(0.1, now - last)); last = now; return draw(pos, now); };
    const tick = () => { cancelAnimationFrame(raf); const busy = frame(); if (seen && (busy || pos < sc.dur)) raf = requestAnimationFrame(tick); else last = 0; };
    const api = { calm, now: clock, seek: (s) => { pos = calm ? sc.still : cl(s, 0, sc.dur); tick(); }, poke: () => tick() };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : cl(fixed, 0, sc.dur), 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); last = 0; }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 16px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
