/* Bright coded scenes for "What is last30days? The research skill for AI agents". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size = 22, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* dashed focus ring: hidden until hover or keyboard focus (see motion.css) */
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 7", class: "mg-ring" }, p);
  /* a pill label drawn around 0,0, sized to its text, with an offset shadow */
  const pill = (p, s, fill, size, shadow) => {
    const g = el("g", {}, p);
    const sh = el("rect", { fill: shadow }, g), bg = el("rect", { fill, stroke: INK, "stroke-width": 3 }, g);
    const t = mono(g, 0, size * 0.36, s, size, { "text-anchor": "middle" });
    const len = t.getComputedTextLength() || s.length * size * 0.6, w = Math.ceil(len + size * 2), h = Math.round(size * 2.1);
    [[sh, 6], [bg, 0]].forEach(([r, d]) => { r.setAttribute("x", -w / 2 + d); r.setAttribute("y", -h / 2 + d); r.setAttribute("width", w); r.setAttribute("height", h); r.setAttribute("rx", h / 2); });
    g.w = w;
    return g;
  };

  const SC = {};

  /* ---- 1. a month calendar lights its last 30 squares ---- */
  SC.calendar = {
    dur: 8,
    build(svg, api) {
      const X = 150, Y = 56, CW = 500, CH = 412, HH = 84, SW = 54, SH = 48, G = 10, FIRST = 3, N = 30, LIT = 1.3, STEP = 0.1, RING = LIT + N * STEP + 0.25;
      const cal = el("g", {}, svg);
      ring(cal, X - 16, Y - 36, CW + 46, CH + 68, 32);
      el("rect", { x: X + 14, y: Y + 14, width: CW, height: CH, rx: 24, fill: LIL }, cal);
      el("rect", { x: X, y: Y, width: CW, height: CH, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 3 }, cal);
      el("path", { d: `M${X} ${Y + HH} V${Y + 24} Q${X} ${Y} ${X + 24} ${Y} H${X + CW - 24} Q${X + CW} ${Y} ${X + CW} ${Y + 24} V${Y + HH} Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, cal);
      [X + 96, X + CW - 96].forEach((x) => el("rect", { x: x - 9, y: Y - 22, width: 18, height: 46, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, cal));
      const head = txt(cal, 400, Y + 56, "last 30 days", { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
      const gx = 400 - (7 * SW + 6 * G) / 2, gy = Y + HH + 24;
      const sq = Array.from({ length: 35 }, (_, i) => {
        const r = Math.floor(i / 7), c = i % 7, g = el("g", {}, cal);
        el("rect", { x: -SW / 2, y: -SH / 2, width: SW, height: SH, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const lit = el("rect", { x: -SW / 2, y: -SH / 2, width: SW, height: SH, rx: 10, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        return { g, lit, x: gx + c * (SW + G) + SW / 2, y: gy + r * (SH + G) + SH / 2, d: 0.25 + (r + c) * 0.06, n: i - FIRST };
      });
      const nw = sq[FIRST + N - 1], hal = el("g", {}, cal);
      const circs = [[INK, 13], [LIL, 7]].map(([c, w]) => el("circle", { r: 43, fill: "none", stroke: c, "stroke-width": w, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, hal));
      const tag = pill(svg, "one brief", MINT, 24, LIL);
      button(cal, "Clear the squares and light them again", () => api.replay(1.28, 0.9));
      return (t, now, k) => {
        const e = oc(seg(t, 0, 0.8));
        tf(cal, 0, 36 * (1 - e)); cal.setAttribute("opacity", cl(e * 1.4));
        head.setAttribute("opacity", oc(seg(t, 0.3, 0.75)));
        sq.forEach((s) => {
          const a = ob(seg(t, s.d, s.d + 0.4));
          tf(s.g, s.x, s.y, 0.5 + 0.5 * a); s.g.setAttribute("opacity", seg(t, s.d, s.d + 0.15));
          let L = s.n >= 0 && s.n < N ? ob(seg(t, LIT + s.n * STEP, LIT + s.n * STEP + 0.36)) : 0;
          if (k > 0 && L > 0) { const d = ((N - 1 - s.n) / (N - 1)) * 0.5; L *= 1 - io(seg(k, d, d + 0.4)); }
          s.lit.setAttribute("transform", `scale(${Math.max(L, 0.001)})`); s.lit.setAttribute("opacity", L > 0.02 ? 1 : 0);
        });
        const rk = seg(t, RING, RING + 0.6), fade = k > 0 ? 1 - oc(seg(k, 0, 0.35)) : 1;
        tf(hal, nw.x, nw.y, 0.6 + 0.4 * ob(rk), -90);
        circs.forEach((c) => c.setAttribute("stroke-dashoffset", 1 - oc(seg(t, RING, RING + 0.45))));
        hal.setAttribute("opacity", rk > 0 ? fade : 0);
        const g = ob(seg(t, 5.4, 6)), tfade = k > 0 ? 1 - oc(seg(k, 0, 0.4)) : 1;
        tf(tag, 400, 528 + 22 * (1 - g), 0.7 + 0.3 * g); tag.setAttribute("opacity", seg(t, 5.4, 5.65) * tfade);
      };
    },
  };

  /* ---- 2. a notebook opens and writes one brief ---- */
  SC.notebook = {
    dur: 9,
    build(svg, api) {
      const SP = 360, PX = 362, PW = 270, PY = 96, PH = 404, BX = SP - 4, BW = PW + 14, BY = PY - 6, BH = PH + 12;
      const flip = (n, s) => n.setAttribute("transform", `translate(${SP} 0) scale(${Math.abs(s) < 0.002 ? (s < 0 ? -0.002 : 0.002) : s} 1) translate(${-SP} 0)`);
      const NSS = {};
      const book = el("g", {}, svg);
      ring(book, 62, 70, 694, 456, 28);
      const coverSh = el("rect", { x: SP + 12, y: BY + 12, width: BW - 4, height: BH, rx: 16, fill: SOFT }, book);
      el("rect", { x: BX + 12, y: BY + 12, width: BW, height: BH, rx: 16, fill: SOFT }, book);
      const tabs = ["Reddit", "X", "YouTube"].map((s, i) => {
        const g = el("g", {}, book), y = 138 + i * 58;
        el("rect", { x: 600, y, width: 140, height: 44, rx: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, 690, y + 29, s, 19, { "text-anchor": "middle" });
        return g;
      });
      el("rect", { x: BX, y: BY, width: BW, height: BH, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, book);
      const coverIn = el("rect", Object.assign({ x: SP, y: BY, width: BW - 4, height: BH, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, NSS), book);
      const leftPage = el("rect", { x: SP - 2 - PW, y: PY, width: PW, height: PH, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, book);
      el("rect", { x: PX, y: PY, width: PW, height: PH, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, book);
      const flipFront = el("rect", Object.assign({ x: PX, y: PY, width: PW, height: PH, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, NSS), book);
      const ink = el("g", {}, book);
      const head = txt(ink, PX + 30, PY + 60, "one brief", { "font-size": 34, "font-weight": 700 });
      const lines = [192, 168, 200, 144, 184, 160, 112, 152].map((w, i) => {
        let d = `M${PX + 30} ${PY + 104 + i * 28}`;
        for (let x = 0, j = 0; x < w; x += 16, j++) d += ` q8 ${j % 2 ? 5 : -5} 16 0`;
        return el("path", { d, fill: "none", stroke: BLUE, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" }, ink);
      });
      const stamp = el("g", {}, ink);
      el("rect", { x: -112, y: -27, width: 224, height: 54, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -104, y: -19, width: 208, height: 38, rx: 6, fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "5 4" }, stamp);
      mono(stamp, 0, 7, "cited by source", 20, { "text-anchor": "middle" });
      const flipBack = el("rect", Object.assign({ x: PX, y: PY, width: PW, height: PH, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, NSS), book);
      const coverOut = el("g", {}, book);
      el("rect", Object.assign({ x: SP, y: BY, width: BW - 4, height: BH, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, NSS), coverOut);
      el("rect", Object.assign({ x: SP + 70, y: 170, width: 140, height: 60, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, NSS), coverOut);
      let turns = 0;
      button(book, "Turn to a clean page and write it again", () => { if (api.clearing()) return; turns++; api.replay(2.25, 1); });
      return (t, now, k) => {
        const e = oc(seg(t, 0, 0.7)), o = io(seg(t, 0.9, 1.9)), sx = Math.cos(Math.PI * o);
        const bump = Math.sin(Math.PI * seg(t, 6.2, 6.45)) * 4;
        tf(book, -140 * (1 - o), 40 * (1 - e) + bump); book.setAttribute("opacity", cl(e * 1.4));
        flip(coverOut, sx); flip(coverIn, sx); flip(coverSh, sx);
        coverOut.setAttribute("opacity", sx >= 0 ? 1 : 0); coverIn.setAttribute("opacity", sx < 0 ? 1 : 0); coverSh.setAttribute("opacity", sx < 0 ? 1 : 0);
        tabs.forEach((g, i) => { const a = ob(seg(t, 1.5 + i * 0.1, 2 + i * 0.1)); g.setAttribute("transform", `translate(${-100 * (1 - a)} 0)`); });
        const hk = oc(seg(t, 2.3, 2.75));
        head.setAttribute("opacity", hk); head.setAttribute("transform", `translate(0 ${12 * (1 - hk)})`);
        lines.forEach((p, i) => { const a = io(seg(t, 2.75 + i * 0.36, 3.2 + i * 0.36)); p.setAttribute("stroke-dashoffset", 1 - a); p.setAttribute("opacity", a > 0 ? 1 : 0); });
        const s = seg(t, 6, 6.55);
        tf(stamp, PX + PW / 2, PY + PH - 50, 1.7 - 0.7 * ob(s), -5 + 8 * (1 - oc(s)));
        stamp.setAttribute("opacity", cl(s * 5));
        leftPage.setAttribute("opacity", (k > 0 ? turns > 1 : turns > 0) ? 1 : 0);
        if (k > 0) {
          const f = Math.cos(Math.PI * io(k));
          flip(flipFront, f); flip(ink, f); flip(flipBack, f);
          flipFront.setAttribute("opacity", f > 0 ? 1 : 0); ink.setAttribute("opacity", f > 0 ? 1 : 0); flipBack.setAttribute("opacity", f > 0 ? 0 : 1);
        } else {
          flipFront.setAttribute("opacity", 0); flipBack.setAttribute("opacity", 0); ink.removeAttribute("transform"); ink.setAttribute("opacity", 1);
        }
      };
    },
  };

  /* ---- 3. binoculars sweep four zero config sources ---- */
  SC.binoculars = {
    dur: 9,
    build(svg, api) {
      const NAMES = ["Reddit", "Hacker News", "Polymarket", "GitHub"], CX = [124, 308, 492, 676], CW = 156, CH = 144, CY = 434, BYC = 240, BS = 1.2;
      const beam = el("path", { fill: SOFT }, svg);
      const cards = CX.map((cx, i) => {
        const g = el("g", {}, svg);
        const glow = el("rect", { x: -CW / 2 - 9, y: -CH / 2 - 9, width: CW + 18, height: CH + 18, rx: 26, fill: MINT }, g);
        ring(g, -CW / 2 - 13, -CH / 2 - 13, CW + 26, CH + 26, 28);
        el("rect", { x: -CW / 2, y: -CH / 2, width: CW, height: CH, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        mono(g, 0, -CH / 2 + 42, NAMES[i], 19, { "text-anchor": "middle" });
        [0, 1, 2].forEach((j) => el("rect", { x: -CW / 2 + 20, y: -CH / 2 + 70 + j * 20, width: [112, 88, 100][(i + j) % 3], height: 9, rx: 4.5, fill: j === 1 ? SKY : LIL }, g));
        return { g, glow, cx };
      });
      const bino = el("g", {}, svg);
      el("rect", { x: -12, y: -30, width: 24, height: 44, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, bino);
      el("circle", { cx: 0, cy: -44, r: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, bino);
      [-34, 34].forEach((x) => el("rect", { x: x - 17, y: -64, width: 34, height: 26, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, bino));
      [-34, 34].forEach((x) => el("rect", { x: x - 26, y: -42, width: 52, height: 82, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, bino));
      [-34, 34].forEach((x) => {
        el("ellipse", { cx: x, cy: 40, rx: 23, ry: 10, fill: SKY, stroke: INK, "stroke-width": 3 }, bino);
        el("path", { d: `M${x - 13} 38 Q${x - 5} 33.5 ${x + 5} 34.5`, stroke: "#fff", "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, bino);
      });
      const tag = pill(svg, "zero config", YEL, 24, LIL);
      const MOVES = [[1.9, 2.8, CX[0], CX[1]], [3.2, 4.1, CX[1], CX[2]], [4.5, 5.4, CX[2], CX[3]]];
      const sweep = (t) => { let x = CX[0]; MOVES.forEach(([a, b, x0, x1]) => { if (t >= a) x = lerp(x0, x1, io(seg(t, a, b))); }); return x; };
      const lit = CX.map((cx) => { for (let t = 1.1; t < 9; t += 0.01) if (Math.abs(sweep(t) - cx) < 44) return t; return 9; });
      let lastX = CX[0], lk = null;
      cards.forEach((c, i) => button(c.g, `Look at ${NAMES[i]} again`, () => { lk = { x0: lastX, x1: CX[i], at: api.now(), i }; api.kick(1.7); }));
      return (t, now) => {
        cards.forEach((c, i) => {
          const d = 0.15 + i * 0.1, a = ob(seg(t, d, d + 0.55)), gk = ob(seg(t, lit[i], lit[i] + 0.45));
          const p = lk && lk.i === i ? Math.sin(Math.PI * seg(now, lk.at + 0.7, lk.at + 1.3)) : 0;
          tf(c.g, c.cx, CY + 34 * (1 - a), 1 + 0.04 * p); c.g.setAttribute("opacity", seg(t, d, d + 0.2));
          tf(c.glow, 0, 0, 0.8 + 0.2 * gk + 0.06 * p); c.glow.setAttribute("opacity", gk > 0.01 ? 1 : 0);
        });
        let x = sweep(t), rot = cl((sweep(t + 0.02) - sweep(t - 0.02)) * 0.75, -9, 9);
        if (lk) { const m = seg(now, lk.at, lk.at + 0.95); x = lerp(lk.x0, lk.x1, io(m)); rot = Math.sin(Math.PI * m) * 9 * Math.sign(lk.x1 - lk.x0); }
        lastX = x;
        const y = BYC - 150 * (1 - ob(seg(t, 0.6, 1.3))), land = Math.sin(Math.PI * seg(t, 5.35, 5.75)) * 0.05;
        tf(bino, x, y, BS * (1 + land), rot); bino.setAttribute("opacity", seg(t, 0.6, 0.8));
        const r = (rot * Math.PI) / 180, P = (dx) => `${x + BS * (dx * Math.cos(r) - 48 * Math.sin(r))} ${y + BS * (dx * Math.sin(r) + 48 * Math.cos(r))}`, bot = CY - CH / 2 - 4;
        beam.setAttribute("d", `M${P(-52)} L${P(52)} L${x + 92} ${bot} L${x - 92} ${bot} Z`);
        beam.setAttribute("opacity", seg(t, 1.15, 1.45));
        const g = ob(seg(t, 5.9, 6.5));
        tf(tag, 400, 100 - 20 * (1 - g), 0.6 + 0.4 * g); tag.setAttribute("opacity", seg(t, 5.9, 6.1));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6,
    build(svg) {
      const tag = pill(svg, "Explainer", YEL, 20, LIL);
      const title = txt(svg, 62, 188, "What is last30days?", { "font-size": 80, "font-weight": 700 });
      const tw = title.getComputedTextLength(); if (tw > 836) title.setAttribute("font-size", Math.floor((80 * 836) / tw));
      const sub = txt(svg, 64, 242, "The research skill for AI agents", { "font-size": 32, "font-weight": 500, fill: MUTE });
      const chk = txt(svg, 64, 284, "Checked 25 Nov 2026", { "font-family": MONO, "font-size": 19, "font-weight": 500, fill: CAP });
      const tile = (x, w, fill, s) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 8, y: 388, width: w, height: 100, rx: 20, fill: LIL }, g);
        el("rect", { x, y: 380, width: w, height: 100, rx: 20, fill, stroke: INK, "stroke-width": 3 }, g);
        const l = mono(svg, x + 28, 442, s, 30);
        return [g, l];
      };
      const [t1, l1] = tile(64, 316, LIL, "MIT licence"), [t2, l2] = tile(412, 484, SKY, "v4.6.0, 22 Nov 2026");
      const strip = el("g", {}, svg);
      el("rect", { x: 0, y: 0, width: 176, height: 58, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, strip);
      [36, 140].forEach((x) => el("rect", { x: x - 7, y: -14, width: 14, height: 28, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, strip));
      for (let j = 0; j < 6; j++) el("rect", { x: 15 + j * 26, y: 24, width: 18, height: 18, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, strip);
      const nb = el("g", {}, svg);
      el("rect", { x: 0, y: 0, width: 70, height: 86, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, nb);
      for (let j = 0; j < 5; j++) el("circle", { cx: 0, cy: 12 + j * 15, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, nb);
      [26, 42, 58].forEach((y, j) => el("path", { d: `M18 ${y} H${[54, 48, 40][j]}`, stroke: BLUE, "stroke-width": 4, "stroke-linecap": "round" }, nb));
      const rise = (n, d, dy = 22) => { const a = seg(globalT, d, d + 0.55); n.setAttribute("transform", `translate(0 ${dy * (1 - oc(a))})`); n.setAttribute("opacity", cl(a * 2)); };
      let globalT = 0;
      return (t) => {
        globalT = t;
        const p = ob(seg(t, 0.1, 0.6));
        tf(tag, 64 + tag.w / 2, 74, 0.6 + 0.4 * p); tag.setAttribute("opacity", seg(t, 0.1, 0.25));
        rise(title, 0.2); rise(sub, 0.3); rise(chk, 0.4);
        const s = ob(seg(t, 0.6, 1.15)); tf(strip, 92, 326 - 30 * (1 - s)); strip.setAttribute("opacity", seg(t, 0.6, 0.75));
        rise(t1, 0.7);
        const n = ob(seg(t, 0.8, 1.35)); tf(nb, 446, 300 - 30 * (1 - n), 1, -6); nb.setAttribute("opacity", seg(t, 0.8, 0.95));
        rise(t2, 0.9); rise(l1, 1.4, 12); rise(l2, 1.5, 12);
      };
    },
  };

  /* ---- player: plays once in view and rests on the final frame; a tap clears and replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wall = () => performance.now() / 1000;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, END = sc.dur;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let head = calm ? END : 0, t0 = 0, run = false, want = !calm, seen = false, raf = 0, until = 0, clr = null;
    const pos = () => (run ? Math.min(END, head + wall() - t0) : head);
    const go = (s) => { head = s; t0 = wall(); run = true; want = true; };
    let draw = () => {};
    const frame = () => {
      const now = wall();
      if (clr) { const k = (now - clr.at) / clr.len; if (k < 1) { draw(clr.t, now, Math.max(k, 0.0001)); return true; } go(clr.from); clr = null; }
      const t = pos();
      if (run && t >= END) { head = END; run = false; want = false; }
      draw(t, now, 0);
      return run || now < until;
    };
    const tick = () => { cancelAnimationFrame(raf); if (frame() && seen) raf = requestAnimationFrame(tick); };
    const api = {
      now: wall,
      clearing: () => !!clr,
      replay: (from, len) => { if (clr) return; const t = pos(); run = false; head = t; clr = { at: wall(), len, t, from }; tick(); },
      kick: (s) => { until = Math.max(until, wall() + s); tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? END : fixed, 0, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (want && !run && !clr) go(head); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { if (run) { head = pos(); run = false; } cancelAnimationFrame(raf); }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
