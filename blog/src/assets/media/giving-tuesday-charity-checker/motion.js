/* Bright coded scenes for "Giving Tuesday 2026: Check a Charity Before You Give, With AI Agents". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0; // counter for SVG ids, never random
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size = 22, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, cx, cy, sx, sy = sx, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, a) => el(a.rx != null && a.width == null ? "ellipse" : "rect", Object.assign({ fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "8 8", class: "mg-ring" }, a), p);
  const tickMark = (p, col) => {
    const g = el("g", {}, p), d = "M-19 1 L-6 14 L20 -15";
    el("path", { d, stroke: INK, "stroke-width": 15, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    el("path", { d, stroke: col, "stroke-width": 9, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };
  const coin = (p, r = 18) => {
    const g = el("g", {}, p), R = r * 0.76;
    el("circle", { r, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { r: r * 0.5, fill: "none", stroke: INK, "stroke-width": 2 }, g);
    el("path", { d: `M${-0.94 * R} ${-0.34 * R} A${R} ${R} 0 0 1 ${-0.34 * R} ${-0.94 * R}`, stroke: "#fff", "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. a donation jar: Name is checked and flips to Registered, then coins drop in ---- */
  SC.donationjar = {
    dur: 8.5, from: 1.3, rw: 0.8,
    build(svg, api) {
      const floor = el("ellipse", { cx: 400, cy: 532, rx: 210, ry: 18, fill: SOFT }, svg);
      const jar = el("g", {}, svg);
      const body = "M312 150 V170 Q255 180 255 232 V466 Q255 504 293 504 H507 Q545 504 545 466 V232 Q545 180 488 170 V150 Z";
      el("path", { d: body, fill: SOFT, transform: "translate(14 14)" }, jar);
      el("path", { d: body, fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, jar);
      el("rect", { x: 268, y: 238, width: 12, height: 128, rx: 6, fill: "#fff" }, jar);
      const coins = [[338, 479], [382, 481], [426, 479], [470, 480], [404, 444]].map(([x, y]) => ({ n: coin(jar, 20), x, y }));
      const label = el("g", {}, jar);
      el("rect", { x: 290, y: 292, width: 220, height: 80, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, label);
      const word = mono(label, 400, 343, "Name", 30, { "text-anchor": "middle" });
      const tick = tickMark(jar, MINT);
      el("rect", { x: 288, y: 116, width: 224, height: 42, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, jar);
      el("rect", { x: 356, y: 131, width: 88, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, jar);
      ring(jar, { x: 232, y: 96, width: 340, height: 436, rx: 30 });
      button(jar, "Donation jar. Tap to flip the label back to Name and run the check again", api.again);
      const mag = el("g", {}, svg);
      el("path", { d: "M34 34 L80 80", stroke: INK, "stroke-width": 26, "stroke-linecap": "round" }, mag);
      el("path", { d: "M34 34 L80 80", stroke: BLUE, "stroke-width": 20, "stroke-linecap": "round" }, mag);
      el("circle", { r: 46, fill: "none", stroke: INK, "stroke-width": 18 }, mag);
      el("circle", { r: 46, fill: "none", stroke: BLUE, "stroke-width": 12 }, mag);
      el("path", { d: "M-27 -9 A28 28 0 0 1 -9 -27", stroke: "#fff", "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, mag);
      return (t, b) => {
        const gone = 1 - io(seg(b, 0, 0.45)), flipBack = 1 - io(seg(b, 0.1, 0.95));
        const kj = ob(seg(t, 0, 0.75)), fade = seg(t, 0, 0.3);
        tf(jar, 0, 46 * (1 - kj)); jar.setAttribute("opacity", fade); floor.setAttribute("opacity", fade);
        const kl = ob(seg(t, 0.5, 1.05)), f = seg(t, 4.25, 4.95) * flipBack;
        const sy = f < 0.5 ? 1 - io(f * 2) : ob((f - 0.5) * 2);
        word.textContent = f < 0.5 ? "Name" : "Registered";
        about(label, 400, 332, 0.6 + 0.4 * kl, (0.6 + 0.4 * kl) * sy); label.setAttribute("opacity", seg(t, 0.5, 0.68));
        const m1 = oc(seg(t, 1.3, 1.9)), m2 = io(seg(t, 1.9, 3.3)), m3 = io(seg(t, 3.3, 4.1));
        const mx = 170 + 140 * m1 + 200 * m2 + 140 * m3, my = 332 + Math.sin(m2 * Math.PI * 2) * 9 + 88 * m3;
        tf(mag, mx, my, 1, -10 * m3); mag.setAttribute("opacity", seg(t, 1.3, 1.6) * gone);
        const kt = ob(seg(t, 3.65, 4.15)) * gone;
        tf(tick, 506, 296 - 34 * (1 - seg(t, 3.65, 4.0)), 1.15 * kt); tick.setAttribute("opacity", seg(t, 3.65, 3.75));
        coins.forEach((c, i) => {
          const d = 5.0 + i * 0.28, p = seg(t, d, d + 0.72), y = -30 + (c.y + 30) * p * p, x = 400 + (c.x - 400) * io(seg(p, 0.5, 1));
          const bounce = Math.sin(seg(t, d + 0.72, d + 0.98) * Math.PI) * -9;
          tf(c.n, x, y + bounce, 1, p * 260); c.n.setAttribute("opacity", (p > 0 ? 1 : 0) * gone);
        });
      };
    },
  };

  /* ---- 2. a file cabinet: the top drawer opens and three folders rise ---- */
  SC.filecabinet = {
    dur: 8.5, from: 0.8, rw: 1.0,
    build(svg, api) {
      const cid = `mgclip${++uid}`;
      el("rect", { x: 0, y: 0, width: 800, height: 457 }, el("clipPath", { id: cid }, el("defs", {}, svg)));
      const floor = el("ellipse", { cx: 400, cy: 572, rx: 220, ry: 16, fill: SOFT }, svg);
      const cab = el("g", {}, svg);
      el("rect", { x: 284, y: 364, width: 260, height: 210, rx: 14, fill: SOFT }, cab);
      el("rect", { x: 270, y: 350, width: 260, height: 210, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, cab);
      const inner = el("path", { fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, cab);
      const front = (y) => { const g = el("g", {}, cab); el("rect", { x: 284, y, width: 232, height: 88, rx: 8, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g); el("rect", { x: 368, y: y + 32, width: 64, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g); return g; };
      front(460);
      const files = el("g", { "clip-path": `url(#${cid})` }, cab);
      const NAMES = [["Bank record"], ["Receipt"], ["Written", "acknowledgment", "$250 or more"]], FX = [150, 400, 650];
      const folders = NAMES.map((lines, i) => {
        const g = el("g", {}, files);
        let tab = null;
        if (i === 2) { tab = el("g", {}, g); el("rect", { x: -40, y: -78, width: 150, height: 62, rx: 10, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tab); mono(tab, 35, -42, "January 31", 20, { "text-anchor": "middle" }); }
        el("rect", { x: -104, y: -40, width: 58, height: 30, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -110, y: -22, width: 220, height: 160, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -110, y: 0, width: 220, height: 138, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        lines.forEach((s, j) => mono(g, -92, 38 + j * 26, s, 20));
        const tk = tickMark(g, BLUE);
        return { g, tab, tk };
      });
      const top = front(362);
      ring(cab, { x: 252, y: 332, width: 306, height: 256, rx: 24 });
      button(cab, "File cabinet. Tap to close the drawer and open it again", api.again);
      return (t, b) => {
        const gone = 1 - io(seg(b, 0, 0.3)), sink = 1 - io(seg(b, 0, 0.6)), shut = 1 - io(seg(b, 0.55, 1));
        const kc = ob(seg(t, 0, 0.75)), fade = seg(t, 0, 0.3);
        tf(cab, 0, 46 * (1 - kc)); cab.setAttribute("opacity", fade); floor.setAttribute("opacity", fade);
        const kd = ob(seg(t, 0.8, 1.45)) * shut, s = 1 + 0.08 * kd, fy = 406 + 30 * kd - 44 * s;
        about(top, 400, 406, s, s, 0, 30 * kd);
        inner.setAttribute("d", `M286 362 H514 L${400 + 116 * s} ${fy} H${400 - 116 * s} Z`); inner.setAttribute("opacity", kd > 0.01 ? 1 : 0);
        folders.forEach((F, i) => {
          const st = 1.5 + i * 0.7, k1 = oc(seg(t, st, st + 0.6)) * sink, k2 = io(seg(t, st + 0.5, st + 1.2)) * sink;
          const x = 400 + (FX[i] - 400) * k2, y = 450 - 210 * k1 - 90 * k2;
          tf(F.g, x, y, 1, Math.sin(k2 * Math.PI) * (1 - i) * 6); F.g.setAttribute("opacity", k1 > 0.002 ? 1 : 0);
          const kk = ob(seg(t, 4.85 + i * 0.3, 5.3 + i * 0.3)) * gone;
          tf(F.tk, 80, 108 - 26 * (1 - seg(t, 4.85 + i * 0.3, 5.15 + i * 0.3)), kk); F.tk.setAttribute("opacity", seg(t, 4.85 + i * 0.3, 4.95 + i * 0.3));
          if (F.tab) tf(F.tab, 0, 60 * (1 - ob(seg(t, 4.2, 4.7)) * gone));
        });
      };
    },
  };

  /* ---- 3. a piggy bank: coins roll out into three trays under one Budget ---- */
  SC.piggybank = {
    dur: 9, from: 2.0, rw: 1.1,
    build(svg, api) {
      const ROWS = ["Hunger", "Reading", "Parks"], TY = [128, 256, 384];
      const trays = ROWS.map((name, i) => { const g = el("g", {}, svg), T = TY[i]; el("rect", { x: 444, y: T + 20, width: 312, height: 32, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); return { g, T }; });
      const coins = Array.from({ length: 9 }, (_, i) => { const r = i % 3, j = Math.floor(i / 3), T = TY[r]; return { n: coin(svg, 18), d: 2.0 + i * 0.3, x: 700 - j * 44, y: T + 34, T }; });
      trays.forEach((tr, i) => {
        const g = (tr.f = el("g", {}, svg)), T = tr.T;
        el("rect", { x: 442, y: T + 52, width: 340, height: 60, rx: 12, fill: SOFT }, g);
        el("rect", { x: 430, y: T + 40, width: 340, height: 60, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        tr.lab = mono(g, 456, T + 79, ROWS[i], 22);
        tr.tk = tickMark(g, MINT);
      });
      const floor = el("ellipse", { cx: 236, cy: 500, rx: 190, ry: 16, fill: SOFT }, svg);
      const pig = el("g", {}, svg), shape = el("g", {}, pig);
      el("ellipse", { cx: 244, cy: 374, rx: 150, ry: 104, fill: SOFT }, shape);
      [118, 170, 262, 314].forEach((x) => el("rect", { x, y: 420, width: 36, height: 74, rx: 12, fill: LIL, stroke: INK, "stroke-width": 3 }, shape));
      el("path", { d: "M268 272 Q272 236 298 228 Q306 252 304 276 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shape);
      el("path", { d: "M298 282 Q306 244 334 238 Q338 264 330 290 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shape);
      el("path", { d: "M82 346 C60 338 54 312 70 309 C86 306 86 326 70 327", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, shape);
      el("ellipse", { cx: 230, cy: 360, rx: 150, ry: 104, fill: LIL, stroke: INK, "stroke-width": 3 }, shape);
      el("ellipse", { cx: 384, cy: 352, rx: 17, ry: 34, fill: LIL, stroke: INK, "stroke-width": 3 }, shape);
      el("path", { d: "M118 330 Q132 298 168 284", stroke: "#fff", "stroke-width": 8, fill: "none", "stroke-linecap": "round" }, shape);
      el("rect", { x: 196, y: 263, width: 70, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, shape);
      ring(pig, { cx: 232, cy: 370, rx: 182, ry: 158 });
      button(pig, "Piggy bank. Tap to roll the coins back in", api.again);
      const string = el("path", { stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const tag = el("g", {}, svg);
      el("rect", { x: 126, y: 104, width: 168, height: 68, rx: 14, fill: SOFT }, tag);
      el("rect", { x: 116, y: 94, width: 168, height: 68, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 138, cy: 128, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 212, 138, "Budget", 28, { "text-anchor": "middle" });
      const P = (c, u) => { const a = [230, 286], b = [232, 140], cc = [c.x - 84, c.T - 64], d = [c.x, c.y], v = 1 - u; const f = (k) => v * v * v * a[k] + 3 * v * v * u * b[k] + 3 * v * u * u * cc[k] + u * u * u * d[k]; return [f(0), f(1)]; };
      return (t, b) => {
        const gone = 1 - io(seg(b, 0, 0.3)), fade = seg(t, 0, 0.3);
        const kp = ob(seg(t, 0, 0.75)); tf(pig, 0, 46 * (1 - kp)); pig.setAttribute("opacity", fade); floor.setAttribute("opacity", fade);
        let bump = 0;
        coins.forEach((c, i) => {
          const back = 1 - io(seg(b, i * 0.025, 0.75 + i * 0.025)), raw = seg(t, c.d, c.d + 0.9), p = raw * back, u = 1 - (1 - p) * (1 - p);
          const [x, y] = P(c, u), land = raw >= 1 && back >= 1 ? Math.sin(seg(t, c.d + 0.9, c.d + 1.15) * Math.PI) * -8 : 0;
          tf(c.n, x, y + land, 1, 540 * u); c.n.setAttribute("opacity", p > 0 ? 1 : 0);
          bump = Math.max(bump, Math.sin(seg(t, c.d, c.d + 0.24) * Math.PI));
        });
        about(shape, 230, 494, 1 + 0.03 * bump, 1 - 0.04 * bump);
        trays.forEach((tr, i) => {
          const k = oc(seg(t, 0.35 + i * 0.1, 0.95 + i * 0.1)); [tr.g, tr.f].forEach((n) => { tf(n, 130 * (1 - k), 0); n.setAttribute("opacity", seg(t, 0.35 + i * 0.1, 0.6 + i * 0.1)); });
          const kl = oc(seg(t, 0.75 + i * 0.1, 1.15 + i * 0.1)); tr.lab.setAttribute("opacity", kl); tr.lab.setAttribute("transform", `translate(0 ${10 * (1 - kl)})`);
          const s0 = 5.0 + i * 0.3, kk = ob(seg(t, s0, s0 + 0.45)) * gone;
          tf(tr.tk, 740, tr.T + 70 - 26 * (1 - seg(t, s0, s0 + 0.3)), kk); tr.tk.setAttribute("opacity", seg(t, s0, s0 + 0.1));
        });
        const kT = ob(seg(t, 0.95, 1.55)), dy = -150 * (1 - kT), u = Math.max(0, t - 1.3), sw = 9 * Math.exp(-2.6 * u) * Math.sin(8 * u);
        tag.setAttribute("transform", `translate(0 ${dy}) rotate(${sw} 138 128)`); tag.setAttribute("opacity", seg(t, 0.95, 1.2)); string.setAttribute("opacity", seg(t, 1.0, 1.3));
        string.setAttribute("d", `M138 ${128 + dy} Q108 ${198 + dy * 0.5} 172 268`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, from: 0, rw: 0.5,
    build(svg) {
      const chip = el("g", {}, svg);
      el("rect", { x: 64, y: 44, width: 156, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
      mono(chip, 142, 72, "Use Cases", 19, { "text-anchor": "middle" });
      const checked = mono(svg, 896, 72, "Checked 28 Nov 2026", 18, { "text-anchor": "end", "font-weight": 500, fill: MUTE });
      const title = txt(svg, 60, 172, "Giving Tuesday 2026", { "font-size": 72, "font-weight": 700 });
      const sub = txt(svg, 64, 234, "Check a charity before you give", { "font-size": 32, "font-weight": 500, fill: MUTE });
      const card = (x, col, lines) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 10, y: 394, width: 388, height: 100, rx: 18, fill: SOFT }, g);
        el("rect", { x, y: 384, width: 388, height: 100, rx: 18, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        lines.forEach((s, j) => mono(g, x + 194, (lines.length === 1 ? 443 : 428) + j * 31, s, 24, { "text-anchor": "middle" }));
        return g;
      };
      const cards = [card(64, YEL, ["Tuesday, 1 Dec 2026"]), card(508, LIL, ["$250 or more needs a", "written acknowledgment"])];
      const jar = el("g", {}, svg);
      el("path", { d: "M-28 -96 V-88 Q-44 -84 -44 -68 V-12 Q-44 0 -32 0 H32 Q44 0 44 -12 V-68 Q44 -84 28 -88 V-96 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, jar);
      el("rect", { x: -36, y: -70, width: 7, height: 38, rx: 3.5, fill: "#fff" }, jar);
      [[-13, -14], [13, -14]].forEach(([x, y]) => tf(coin(jar, 11), x, y));
      const drop = coin(jar, 11);
      el("rect", { x: -34, y: -112, width: 68, height: 20, rx: 7, fill: MINT, stroke: INK, "stroke-width": 2.5 }, jar);
      el("rect", { x: -15, y: -106, width: 30, height: 7, rx: 3.5, fill: SOFT, stroke: INK, "stroke-width": 2 }, jar);
      const cab = el("g", {}, svg);
      el("rect", { x: -44, y: -108, width: 88, height: 108, rx: 8, fill: SKY, stroke: INK, "stroke-width": 2.5 }, cab);
      [-99, -51].forEach((y) => { el("rect", { x: -35, y, width: 70, height: 42, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, cab); el("rect", { x: -13, y: y + 16, width: 26, height: 10, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2 }, cab); });
      return (t) => {
        const kc = ob(seg(t, 0.1, 0.55)); about(chip, 142, 65, 0.5 + 0.5 * kc); chip.setAttribute("opacity", seg(t, 0.1, 0.25));
        [title, sub].forEach((n, i) => { const k = oc(seg(t, 0.25 + i * 0.12, 0.85 + i * 0.12)); n.setAttribute("transform", `translate(0 ${26 * (1 - k)})`); n.setAttribute("opacity", k); });
        cards.forEach((g, i) => { const k = oc(seg(t, 0.6 + i * 0.1, 1.2 + i * 0.1)); g.setAttribute("transform", `translate(0 ${34 * (1 - k)})`); g.setAttribute("opacity", seg(t, 0.6 + i * 0.1, 0.9 + i * 0.1)); });
        [[jar, 258], [cab, 702]].forEach(([g, x], i) => { const k = ob(seg(t, 1.0 + i * 0.1, 1.6 + i * 0.1)); tf(g, x, 384 - 50 * (1 - k)); g.setAttribute("opacity", seg(t, 1.0 + i * 0.1, 1.2 + i * 0.1)); });
        const p = seg(t, 2.0, 2.6); tf(drop, 0, -190 + 154 * p * p, 1, 200 * p); drop.setAttribute("opacity", p > 0 ? 1 : 0);
        const kd = oc(seg(t, 2.6, 3.1)); checked.setAttribute("opacity", kd); checked.setAttribute("transform", `translate(${18 * (1 - kd)} 0)`);
      };
    },
  };

  /* ---- player: plays once in view, holds the calm final frame; a tap rewinds and replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let pos = 0, back = -1, last = 0, raf = 0, seen = false, held = calm;
    const clock = () => performance.now() / 1000;
    let draw = () => {};
    const frame = () => {
      const now = clock(), dt = cl(now - last, 0, 0.05); last = now;
      if (back >= 0) { back += dt / sc.rw; if (back >= 1) { back = -1; pos = sc.from; } }
      else if (!held) pos = Math.min(pos + dt, sc.dur);
      draw(held ? sc.dur : pos, back < 0 ? 0 : back);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && (back >= 0 || pos < sc.dur)) raf = requestAnimationFrame(tick); };
    const api = {
      again: () => {
        if (frozen || back >= 0) return;
        if (held) { held = false; pos = sc.dur; }
        if (pos <= sc.from) return;
        back = 0; last = clock(); tick();
      },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.dur : cl(fixed, 0, sc.dur), 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { last = clock(); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
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
