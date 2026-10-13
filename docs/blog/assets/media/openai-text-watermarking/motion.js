/* Bright coded scenes for "OpenAI text watermarking". Vanilla JS, no library.
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

  /* ---- shared bits: a grey word pill, a measured chip, a key, a "no" mark ---- */
  const GREY = "#E4DCEE";
  const wide = (n, s) => { let w = 0; try { w = n.getComputedTextLength(); } catch (e) { w = 0; } return w || s.length * parseFloat(n.getAttribute("font-size")) * 0.56; };
  const word = (p, cx, cy, w, h) => { const g = el("g", {}, p), r = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: GREY }, g); tf(g, cx, cy); return { g, r, cx, cy }; };
  const paint = (p, kind) => { // 0 plain, 1 carries the pattern, 2 swapped
    p.r.setAttribute("fill", kind === 1 ? YEL : kind === 2 ? "#fff" : GREY);
    p.r.setAttribute("stroke", kind ? INK : "none"); p.r.setAttribute("stroke-width", 2.5);
    p.r.setAttribute("stroke-dasharray", kind === 2 ? "4 5" : "none");
  };
  const chip = (p, cx, y, s, fill) => {
    const g = el("g", {}, p), r = el("rect", { y, height: 40, rx: 20, fill, stroke: INK, "stroke-width": 2.5 }, g), n = txt(g, cx, y + 27, s, { "text-anchor": "middle", "font-size": 20 });
    const fit = (str) => { n.textContent = str; const w = wide(n, str) + 36; r.setAttribute("x", cx - w / 2); r.setAttribute("width", w); };
    fit(s); return { g, r, n, fit };
  };
  const key = (g, fill) => {
    el("path", { d: "M-2 0 H30 M17 0 V10 M26 0 V7", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, g);
    el("circle", { cx: -15, cy: 0, r: 13, fill, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cx: -15, cy: 0, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
  };
  const nope = (g, r, w = 3) => { el("circle", { r, fill: "none", stroke: MUTE, "stroke-width": w }, g); el("path", { d: `M${-r * 0.7} ${-r * 0.7} L${r * 0.7} ${r * 0.7}`, stroke: MUTE, "stroke-width": w, "stroke-linecap": "round" }, g); };
  const para = (svg, x0, x1, y0, rows, pitch, h, cut) => { // a ragged paragraph of word pills
    const out = []; let x = x0, row = 0;
    for (let i = 0; i < 200; i++) {
      const w = 44 + ((i * i * 7 + i * 3) % 9) * 9;
      if (x + w > x1) { row++; x = x0; }
      if (row >= rows || (row === rows - 1 && x > cut)) break;
      const p = word(svg, x + w / 2, y0 + row * pitch, w, h); p.mark = (i * 5 + row) % 3 === 0; out.push(p); x += w + 10;
    }
    return out;
  };

  const SC = {};

  /* ---- 1. a key slides over a plain paragraph and a pattern of word choices lights up ---- */
  SC.grain = {
    dur: 11, still: 8.2,
    build(svg) {
      txt(svg, 44, 62, "What is OpenAI text watermarking?", { "font-size": 32, "font-weight": 700 });
      el("rect", { x: 72, y: 108, width: 680, height: 212, rx: 26, fill: SKY }, svg);
      el("rect", { x: 60, y: 96, width: 680, height: 212, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const pills = para(svg, 88, 712, 133, 4, 46, 30, 430);
      const scan = el("g", {}, svg);
      el("rect", { x: -38, y: 84, width: 76, height: 238, rx: 22, fill: SKY, "fill-opacity": 0.3, stroke: INK, "stroke-width": 3 }, scan);
      el("path", { d: "M0 322 V336", stroke: INK, "stroke-width": 3 }, scan);
      el("circle", { cx: 0, cy: 358, r: 24, fill: LIL, stroke: INK, "stroke-width": 3 }, scan);
      const kg = el("g", {}, scan); key(kg, YEL); tf(kg, -1, 358, 0.62);
      const add = txt(svg, 400, 416, "does not add", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      const nots = ["hidden characters", "invisible spaces", "unusual punctuation"].map((s) => {
        const g = el("g", {}, svg), r = el("rect", { y: -20, height: 40, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 5" }, g), ic = el("g", {}, g), n = txt(g, 0, 7, s, { "font-size": 20 });
        nope(ic, 9, 2.5); const w = wide(n, s) + 54; r.setAttribute("x", -w / 2); r.setAttribute("width", w); tf(ic, -w / 2 + 21, 0); n.setAttribute("x", -w / 2 + 38);
        return { g, w };
      });
      let nx = 400 - (nots.reduce((a, c) => a + c.w, 0) + 24) / 2;
      nots.forEach((c) => { c.x = nx + c.w / 2; nx += c.w + 12; });
      const cap = strip(svg, 508, 620);
      return (t) => {
        const sx = -70 + 738 * io(seg(t, 2.2, 6.4)), out = 1 - seg(t, 10, 10.7);
        tf(scan, sx, 0); scan.setAttribute("opacity", out);
        pills.forEach((p, i) => {
          const a = ob(seg(t, 0.2 + i * 0.05, 0.5 + i * 0.05)), k = p.mark ? cl((sx + 38 - p.cx) / 40) : 0;
          tf(p.g, p.cx, p.cy, a * (1 + 0.18 * Math.sin(k * Math.PI))); paint(p, k > 0 ? 1 : 0);
          p.g.setAttribute("opacity", a > 0 ? out : 0);
        });
        nots.forEach((c, i) => { const k = ob(seg(t, 6.5 + i * 0.35, 6.95 + i * 0.35)); tf(c.g, c.x, 450, 0.6 + 0.4 * k); c.g.setAttribute("opacity", seg(t, 6.5 + i * 0.35, 6.7 + i * 0.35) * out); });
        add.setAttribute("opacity", seg(t, 6.3, 6.6) * out);
        cap.textContent = t < 2 ? "A model writes one token at a time" : t < 6.5 ? "A detector with the same key looks for the pattern" : "It is part of the wording itself.";
      };
    },
  };

  /* ---- 2. three lamps: one you switch on yourself, one on a timer, one with no switch at all ---- */
  SC.switches = {
    dur: 10.5, still: 7.6,
    build(svg, api) {
      txt(svg, 44, 62, "Who gets the watermark, and when?", { "font-size": 32, "font-weight": 700 });
      el("path", { d: "M40 96 H760", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const X = [140, 400, 660], BY = 182;
      const lamps = X.map((cx, i) => {
        const g = el("g", {}, svg), rays = el("g", { opacity: 0 }, g);
        el("path", { d: `M${cx} 96 V${BY - 50}`, stroke: INK, "stroke-width": 3 }, g);
        for (let j = 0; j < 7; j++) { const a = ((15 + j * 25) * Math.PI) / 180; el("path", { d: `M${cx + Math.cos(a) * 46} ${BY + Math.sin(a) * 46} L${cx + Math.cos(a) * 60} ${BY + Math.sin(a) * 60}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": i === 1 ? "3 6" : "none" }, rays); }
        el("circle", { cx, cy: BY, r: 34, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const glow = el("circle", { cx, cy: BY, r: 34, fill: YEL, "fill-opacity": 0, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: cx - 15, y: BY - 52, width: 30, height: 22, rx: 6, fill: INK }, g);
        el("path", { d: `M${cx - 12} ${BY + 8} q6 -20 12 0 q6 -20 12 0`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, g);
        return { g, rays, glow, cx };
      });
      const PY = 262, plates = X.map((cx) => { const g = el("g", {}, svg); el("rect", { x: cx - 54, y: PY, width: 108, height: 116, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, g); return g; });
      // the API: a rocker the reader can flip
      el("rect", { x: X[0] - 62, y: PY - 8, width: 124, height: 132, rx: 24, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, plates[0]);
      el("rect", { x: X[0] - 17, y: PY + 20, width: 34, height: 76, rx: 17, fill: "#fff", stroke: INK, "stroke-width": 3 }, plates[0]);
      const knob = el("circle", { cx: X[0], r: 17, fill: GREY, stroke: INK, "stroke-width": 3 }, plates[0]);
      // the EU: a timer dial that runs on its own
      el("circle", { cx: X[1], cy: PY + 58, r: 34, fill: "#fff", stroke: INK, "stroke-width": 3 }, plates[1]);
      for (let j = 0; j < 4; j++) el("path", { d: "M0 -26 V-20", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", transform: `translate(${X[1]} ${PY + 58}) rotate(${j * 90})` }, plates[1]);
      const hand = el("path", { d: "M0 0 V-19", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, plates[1]);
      el("circle", { cx: X[1], cy: PY + 58, r: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, plates[1]);
      // outside the EU: a blank plate, two screws and no switch
      el("rect", { x: X[2] - 17, y: PY + 28, width: 34, height: 60, rx: 17, fill: "none", stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "5 6" }, plates[2]);
      [PY + 14, PY + 102].forEach((y) => { el("circle", { cx: X[2], cy: y, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, plates[2]); });
      const T = [["OpenAI API,", "worldwide", "for select models", "From 5 Oct 2026"], ["ChatGPT and Codex", "in the EU", "eligible text output", "across all plans"], ["ChatGPT and Codex", "outside the EU", "rollout is EU only", "No date given"]];
      T.forEach((r, i) => {
        txt(svg, X[i], 412, r[0], { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }); txt(svg, X[i], 439, r[1], { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        txt(svg, X[i], 524, r[2], { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE }); txt(svg, X[i], 550, r[3], { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      });
      const c0 = chip(svg, X[0], 454, "Off by default", "#fff");
      chip(svg, X[1], 454, "Over the coming weeks", SKY);
      chip(svg, X[2], 454, "Not included", SOFT);
      let user = null, uT = -9, cur = false, shown = null;
      button(plates[0], "OpenAI API switch. Opt in, off by default.", () => { user = !cur; uT = api.now(); api.poke(); });
      return (t, now) => {
        let k;
        if (user != null) { const q = ob(seg(now, uT, uT + 0.4)); k = user ? q : 1 - q; } else k = ob(seg(t, 1.8, 2.25)) - io(seg(t, 9.6, 10.1));
        cur = user != null ? user : t >= 1.95 && t < 9.85;
        knob.setAttribute("cy", PY + 79 - 42 * k); knob.setAttribute("fill", cur ? YEL : GREY);
        lamps[0].glow.setAttribute("fill-opacity", cl(k)); lamps[0].rays.setAttribute("opacity", cl(k));
        if (shown !== cur) { shown = cur; c0.fit(cur ? "Opt in" : "Off by default"); c0.r.setAttribute("fill", cur ? YEL : "#fff"); plates[0].setAttribute("aria-pressed", cur ? "true" : "false"); }
        const e = 0.6 * oc(seg(t, 3, 7)) * (1 - seg(t, 9.6, 10.1)) * (0.88 + 0.12 * Math.sin(now * 3));
        lamps[1].glow.setAttribute("fill-opacity", e); lamps[1].rays.setAttribute("opacity", e * 1.4);
        hand.setAttribute("transform", `translate(${X[1]} ${PY + 58}) rotate(${t * 60})`);
        lamps.forEach((l, i) => l.g.setAttribute("transform", `rotate(${Math.sin(now * 1.3 + i * 2) * 1.6} ${l.cx} 96)`));
        const w = seg(t, 5, 5.7); plates[2].setAttribute("transform", `translate(${Math.sin(w * Math.PI * 5) * (1 - w) * 6} 0)`);
      };
    },
  };

  /* ---- 3. a needle that swings up as the passage grows and falls back as words are swapped ---- */
  SC.signal = {
    dur: 14, still: 11.6,
    build(svg, api) {
      txt(svg, 44, 62, "How reliable is the detection?", { "font-size": 32, "font-weight": 700 });
      const sheet = el("g", {}, svg), card = el("rect", { x: 60, y: 94, width: 680, height: 76, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, sheet);
      const WS = [[52, 68, 44, 60, 72, 48, 56, 64, 40, 64], [64, 48, 60, 40, 72, 56, 44, 68, 52, 64]], RANK = { 3: 0, 14: 1, 8: 2, 11: 3, 17: 4 }, pills = [];
      WS.forEach((ws, row) => { let x = 80; ws.forEach((w, col) => { const i = row * 10 + col, p = word(sheet, x + w / 2, 132 + row * 54, w, 36); p.row = row; p.col = col; p.mark = (i * 3 + row) % 5 < 3; p.rank = i in RANK ? RANK[i] : -1; p.ut = null; p.s = 0; pills.push(p); x += w + 8; }); });
      const G = [240, 418], R = 124, LEN = Math.PI * R, arc = `M${G[0] - R} ${G[1]} A${R} ${R} 0 0 1 ${G[0] + R} ${G[1]}`;
      el("path", { d: arc, stroke: SOFT, "stroke-width": 26, fill: "none", "stroke-linecap": "round" }, svg);
      const prog = el("path", { d: arc, stroke: YEL, "stroke-width": 26, fill: "none", "stroke-linecap": "round" }, svg);
      el("path", { d: `M${G[0] - R + 13} ${G[1]} A${R - 13} ${R - 13} 0 0 1 ${G[0] + R - 13} ${G[1]}`, stroke: INK, "stroke-width": 2, fill: "none", "stroke-dasharray": "2 10", "stroke-linecap": "round" }, svg);
      const needle = el("path", { d: "M0 0 H-98", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("circle", { cx: G[0], cy: G[1], r: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, G[0] - R, 462, "weaker", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, G[0] + R, 462, "stronger", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      const read = el("g", {}, svg), ls = [290, 316, 342].map((y) => txt(read, 452, y, "", { "font-size": 20 }));
      const big = txt(read, 450, 406, "", { "font-size": 54, "font-weight": 700 });
      txt(read, 452, 438, "Detection rate", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const L = [["200 token passages", "content such as psychology", "About 80%"], ["400 token passages", "content such as psychology", "About 95%"], ["400 token passages,", "unedited", "About 92%"], ["Same passages,", "10% of words replaced", "with synonyms", "66%"], ["Same passages,", "25% of words replaced", "17%"]];
      const SX = 180, SW = 440, SY = 520, VAL = [92, 66, 17], CNT = [0, 2, 5], NAMES = ["unedited", "10% replaced", "25% replaced"];
      el("path", { d: `M${SX} ${SY} H${SX + SW}`, stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      const fill = el("path", { d: `M${SX} ${SY} H${SX}`, stroke: YEL, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      NAMES.forEach((s, i) => { el("circle", { cx: SX + (SW * i) / 2, cy: SY, r: 5, fill: INK }, svg); txt(svg, SX + (SW * i) / 2, 566, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE }); });
      const hit = el("rect", { x: SX - 24, y: SY - 26, width: SW + 48, height: 52, fill: "#fff", "fill-opacity": 0 }, svg); hit.style.cursor = "pointer";
      const knob = el("g", { role: "slider", tabindex: "0", "aria-label": "How many words were replaced", "aria-valuemin": 0, "aria-valuemax": 2, class: "mg-hit" }, svg);
      el("circle", { r: 34, fill: "#fff", "fill-opacity": 0 }, knob);
      el("circle", { r: 21, fill: "#fff", stroke: INK, "stroke-width": 3 }, knob);
      el("path", { d: "M-6 -6 L-12 0 L-6 6 M6 -6 L12 0 L6 6", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, knob);
      let user = null, uT = -9, vFrom = 0, kFrom = 0, val = 0, kPos = 0, shown = -1;
      const go = (s) => { if (s === user) return; const now = api.now(); pills.forEach((p) => { if (p.rank < 0) return; p.ut = p.rank < CNT[s] ? (p.s > 0.5 ? now - 1 : p.ut == null ? now : p.ut) : null; }); vFrom = val; kFrom = kPos; user = s; uT = now; api.poke(); };
      const pick = (e) => { const r = svg.getBoundingClientRect(); go(Math.round(cl((((e.clientX - r.left) / r.width) * 800 - SX) / SW) * 2)); };
      let down = false;
      knob.addEventListener("pointerdown", (e) => { down = true; knob.setPointerCapture(e.pointerId); pick(e); });
      knob.addEventListener("pointermove", (e) => { if (down) pick(e); });
      knob.addEventListener("pointerup", () => { down = false; });
      hit.addEventListener("pointerdown", pick);
      knob.addEventListener("keydown", (e) => { const s = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0; if (s) { e.preventDefault(); go(cl((user == null ? 0 : user) + s, 0, 2)); } });
      return (t, now) => {
        const auto = user == null; let v, kp, st;
        if (auto) {
          v = 80 * ob(seg(t, 1.3, 2.1)) + 15 * ob(seg(t, 3.7, 4.5)) - 3 * io(seg(t, 5.6, 6.2)) - 26 * ob(seg(t, 7.8, 8.5)) - 49 * ob(seg(t, 10, 10.7)) - 17 * io(seg(t, 13.1, 13.8));
          kp = io(seg(t, 7.6, 8.1)) + io(seg(t, 9.8, 10.3)) - 2 * io(seg(t, 13.1, 13.8));
          st = t < 3.5 ? 0 : t < 5.8 ? 1 : t < 7.75 ? 2 : t < 9.95 ? 3 : 4;
        } else { v = vFrom + (VAL[user] - vFrom) * ob(seg(now, uT, uT + 0.55)); kp = kFrom + (user - kFrom) * oc(seg(now, uT, uT + 0.3)); st = 2 + user; }
        val = v; kPos = kp; v = cl(v, 0, 100);
        const gone = auto ? 1 - seg(t, 13.1, 13.7) : 1;
        card.setAttribute("height", auto ? 76 + 54 * ob(seg(t, 2.8, 3.3)) : 130);
        const f = auto ? Math.abs(Math.cos(seg(t, 5.5, 6.1) * Math.PI)) : 1; sheet.setAttribute("transform", `translate(0 159) scale(1 ${Math.max(f, 0.02)}) translate(0 -159)`);
        pills.forEach((p) => {
          const d = p.row ? 3 + p.col * 0.06 : 0.3 + p.col * 0.07, a = auto ? ob(seg(t, d, d + 0.35)) : 1, n = p.rank; let s = 0;
          if (n >= 0) s = auto ? (n < 2 ? seg(t, 7.7 + n * 0.15, 8.1 + n * 0.15) : seg(t, 9.9 + (n - 2) * 0.12, 10.3 + (n - 2) * 0.12)) : p.ut == null ? 0 : seg(now, p.ut, p.ut + 0.4);
          p.s = s; paint(p, s > 0.5 ? 2 : p.mark ? 1 : 0);
          p.g.setAttribute("transform", `translate(${p.cx} ${p.cy}) scale(${a} ${a * Math.max(Math.abs(Math.cos(s * Math.PI)), 0.05)})`); p.g.setAttribute("opacity", a > 0 ? gone : 0);
        });
        prog.setAttribute("stroke-dasharray", `${(LEN * v) / 100} 999`); prog.setAttribute("opacity", v > 0.5 ? 1 : 0);
        needle.setAttribute("transform", `translate(${G[0]} ${G[1]}) rotate(${(180 * v) / 100})`);
        if (shown !== st) { shown = st; const r = L[st], sm = r.slice(0, -1); ls.forEach((n, i) => { const j = i - (3 - sm.length), head = j === 0; n.textContent = j < 0 ? "" : sm[j]; n.setAttribute("font-size", head ? 22 : 20); n.setAttribute("font-weight", head ? 700 : 500); n.setAttribute("fill", head ? INK : MUTE); }); big.textContent = r[r.length - 1]; knob.setAttribute("aria-valuenow", Math.max(st - 2, 0)); knob.setAttribute("aria-valuetext", `${NAMES[Math.max(st - 2, 0)]}, detection ${r[r.length - 1]}`); }
        read.setAttribute("opacity", auto ? seg(t, 1.2, 1.6) * gone : 1);
        tf(knob, SX + (SW * kp) / 2, SY); fill.setAttribute("d", `M${SX} ${SY} H${SX + (SW * kp) / 2}`);
      };
    },
  };

  /* ---- 4. a "proof" stamp on a rail bounces off five tags and leaves no mark on any of them ---- */
  SC.stamp = {
    dur: 12.6, still: 10.8,
    build(svg) {
      txt(svg, 44, 62, "What does a watermark not prove?", { "font-size": 32, "font-weight": 700 });
      const X = (i) => 96 + i * 152, T = (i) => 1 + i * 1.8, RY = 94, HOV = 262, HIT = 292, S = 1.1, TALL = 130 * S;
      const N = [["Not human", "effort."], ["Not", "ownership."], ["Not", "identity."], ["Not", "accuracy."], ["No watermark", "is not proof", "of a human."]];
      el("path", { d: `M40 ${RY} H760`, stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      el("path", { d: `M40 ${RY} H760`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const tags = N.map((lines, i) => {
        const g = el("g", {}, svg), no = el("g", {}, g), lab = el("g", {}, svg);
        el("rect", { x: -60, y: -52, width: 120, height: 104, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("circle", { r: 32, fill: SOFT, stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "5 6" }, g);
        g.appendChild(no); nope(no, 32, 4);
        lines.forEach((s, j) => txt(lab, X(i), 438 + j * 26, s, { "text-anchor": "middle", "font-size": 20 }));
        return { g, no, lab };
      });
      const rod = el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const cart = el("rect", { x: -24, y: RY - 13, width: 48, height: 26, rx: 9, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const boing = el("g", {}, svg);
      [-1, 1].forEach((d) => [-16, 0, 16].forEach((a) => el("path", { d: "M66 0 H80", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", transform: `scale(${d} 1) rotate(${a})` }, boing)));
      const st = el("g", {}, svg);
      el("rect", { x: -11, y: -88, width: 22, height: 42, fill: BLUE, stroke: INK, "stroke-width": 3 }, st);
      el("circle", { cx: 0, cy: -106, r: 24, fill: BLUE, stroke: INK, "stroke-width": 3 }, st);
      el("rect", { x: -46, y: -12, width: 92, height: 12, rx: 4, fill: INK }, st);
      el("rect", { x: -52, y: -50, width: 104, height: 40, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, st);
      txt(st, 0, -23, "proof", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      strip(svg, 524, 700).textContent = "It does not prove who wrote a text, or that a person did not.";
      const spring = (k) => 1 - Math.cos(k * 7.854) * Math.pow(1 - k, 3);
      return (t) => {
        let x = X(0), y = HOV, rot = 0, bz = 0; const gone = 1 - seg(t, 11.8, 12.3);
        for (let i = 1; i < 5; i++) x += 152 * io(seg(t, T(i) - 0.75, T(i) - 0.1));
        x += (400 - X(4)) * io(seg(t, 9.5, 10.2)) + (X(0) - 400) * io(seg(t, 11.8, 12.5));
        tags.forEach((g, i) => {
          const a = T(i), dn = seg(t, a, a + 0.3), up = seg(t, a + 0.3, a + 1), sh = seg(t, a + 0.3, a + 0.9);
          if (t >= a && t < a + 1) { y = HOV + (HIT - HOV) * (up > 0 ? 1 - spring(up) : dn * dn); rot = Math.sin(up * Math.PI * 3) * (1 - up) * 7; bz = Math.sin(seg(t, a + 0.28, a + 0.62) * Math.PI); }
          tf(g.g, X(i) + Math.sin(sh * Math.PI * 5) * (1 - sh) * 7, 348);
          const k = ob(seg(t, a + 0.4, a + 0.75)); tf(g.no, 0, 0, k); g.no.setAttribute("opacity", k > 0 ? gone : 0);
          const o = oc(seg(t, a + 0.45, a + 0.8)); g.lab.setAttribute("opacity", o * gone); g.lab.setAttribute("transform", `translate(0 ${8 * (1 - o)})`);
        });
        tf(st, x, y, S, rot); tf(cart, x, 0); tf(boing, x, HIT - 28); boing.setAttribute("opacity", bz);
        const r = (rot * Math.PI) / 180; rod.setAttribute("d", `M${x} ${RY} L${x + Math.sin(r) * TALL} ${y - Math.cos(r) * TALL}`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 150, "OpenAI text", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 236, "watermarking", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 262 H560", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 318, "textGrain, who gets it, limits", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const SXH = 772;
      para(svg, 64, 896, 410, 2, 50, 34, 900).forEach((p) => paint(p, p.mark && p.cx < SXH ? 1 : 0));
      el("rect", { x: SXH - 42, y: 374, width: 84, height: 122, rx: 22, fill: SKY, "fill-opacity": 0.3, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${SXH} 336 V374`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const k = el("g", {}, svg); key(k, LIL); k.setAttribute("transform", `translate(${SXH} 250) rotate(90) scale(3)`);
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
