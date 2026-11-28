/* Bright coded scenes for "Hermes Agent alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const SW = 4;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 36, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
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
  // a pill with centred text, sized to the text
  const chip = (p, cx, cy, s, fill, size = 34, a = {}) => {
    const g = el("g", {}, p), r = el("rect", { fill, stroke: INK, "stroke-width": SW }, g);
    const t = txt(g, cx, cy + size * 0.35, s, Object.assign({ "text-anchor": "middle", "font-size": size, "font-weight": 700 }, a));
    const w = t.getComputedTextLength() + size * 1.3, h = size * 1.8;
    r.setAttribute("x", cx - w / 2); r.setAttribute("y", cy - h / 2); r.setAttribute("width", w); r.setAttribute("height", h); r.setAttribute("rx", h / 2);
    return g;
  };

  const SC = {};

  /* ---- 1. a bento box fills one name at a time ---- */
  SC.bento = {
    w: 1600, h: 1200, dur: 11, still: 8.6,
    build(svg, api) {
      txt(svg, 60, 128, "Seven alternatives", { "font-size": 68, "font-weight": 700 });
      const sticks = el("g", {}, svg);
      [[0, YEL], [40, MINT]].forEach(([dy, c]) => el("path", { d: `M0 ${dy - 13} L560 ${dy - 7} Q568 ${dy} 560 ${dy + 7} L0 ${dy + 13} Q-10 ${dy} 0 ${dy - 13} Z`, fill: c, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, sticks));
      tf(sticks, 960, 84, 1, 3);
      const B = { x: 60, y: 300, w: 1480, h: 840 }, pad = 30, gap = 22, RW = 360;
      el("rect", { x: B.x, y: B.y, width: B.w, height: B.h, rx: 44, fill: LIL, stroke: INK, "stroke-width": SW }, svg);
      const iy = B.y + pad, ih = B.h - pad * 2, lx = B.x + pad, rx = B.x + B.w - pad - RW, lw = rx - 30 - lx;
      const cw = (lw - gap * 2) / 3, ch = (ih - gap) / 2;
      const bracket = (x0, x1, label, fill) => {
        el("path", { d: `M${x0 + 6} 284 V240 H${x1 - 6} V284`, fill: "none", stroke: INK, "stroke-width": SW, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
        chip(svg, (x0 + x1) / 2, 240, label, fill, 34);
      };
      bracket(lx, lx + lw, "free and open source", MINT);
      bracket(rx, rx + RW, "hosted", BLUE);
      const ITEMS = [
        ["OpenClaw", "MIT", YEL], ["Munder|Difflin", "MIT", MINT], ["NanoClaw", "MIT", SKY],
        ["ZeroClaw", "MIT or Apache 2.0", SKY], ["nanobot", "MIT", YEL], ["Goose", "Apache 2.0", MINT],
        ["Claude", "Proprietary", BLUE],
      ];
      const parts = ITEMS.map(([name, lic, col], i) => {
        const big = i === 6;
        const x = big ? rx : lx + (i % 3) * (cw + gap), y = big ? iy : iy + Math.floor(i / 3) * (ch + gap), w = big ? RW : cw, h = big ? ih : ch;
        const cx = x + w / 2, cy = y + h / 2, pw = big ? 290 : 270, ph = big ? 520 : 210;
        const g = el("g", {}, svg);
        el("rect", { x, y, width: w, height: h, rx: 24, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        el("rect", { x: x - 9, y: y - 9, width: w + 18, height: h + 18, rx: 30, fill: "none", stroke: INK, "stroke-width": SW, "stroke-dasharray": "6 8", class: "mg-ring" }, g);
        const ly = big ? cy + 215 : cy + 62;
        const licT = txt(g, cx, ly, lic, { "text-anchor": "middle", "font-size": 32, "font-weight": 600, fill: MUTE, opacity: 0 });
        const piece = el("g", {}, g);
        el("rect", { x: -pw / 2, y: -ph / 2, width: pw, height: ph, rx: 36, fill: col, stroke: INK, "stroke-width": SW }, piece);
        [[-pw / 2 + 36, -ph / 2 + 32], [-pw / 2 + 64, -ph / 2 + 26], [-pw / 2 + 52, -ph / 2 + 52]].forEach(([dx, dy]) => el("ellipse", { cx: dx, cy: dy, rx: 10, ry: 6.5, fill: "#fff", stroke: INK, "stroke-width": SW }, piece));
        const lines = name.split("|");
        lines.forEach((s, j) => txt(piece, 0, 15 + (j - (lines.length - 1) / 2) * 50, s, { "text-anchor": "middle", "font-size": big ? 48 : 42, "font-weight": 700 }));
        const st = { on: false, at: -9 };
        button(g, `${lines.join(" ")}: ${lic}`, () => { st.on = !st.on; st.at = api.now(); api.poke(); });
        return { piece, licT, cx, cy, lift: big ? 130 : 112, st, d: 0.5 + i * 0.85 };
      });
      return (t, now) => {
        const out = io(seg(t, 9.9, 10.7));
        parts.forEach((p) => {
          const k = seg(t, p.d, p.d + 0.6), drop = ob(k);
          const m = oc(seg(now - p.st.at, 0, 0.35)), lift = p.st.on ? m : 1 - m;
          p.licT.setAttribute("opacity", lift); tf(p.piece, p.cx, p.cy - 260 * (1 - drop) - p.lift * lift - 40 * out, 1, -5 * lift);
          p.piece.setAttribute("opacity", k <= 0 ? 0 : Math.min(1, k * 4) * (1 - out));
        });
      };
    },
  };

  /* ---- 2. a lift call panel: pick a floor, see who runs there ---- */
  SC.lift = {
    w: 1600, h: 1200, dur: 10.5, still: 2.4,
    build(svg, api) {
      const P = 3.5;
      txt(svg, 60, 128, "Pick by whose computer does the work", { "font-size": 58, "font-weight": 700 });
      // lift doors behind the cards
      el("rect", { x: 780, y: 190, width: 760, height: 950, rx: 28, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      el("rect", { x: 806, y: 216, width: 342, height: 924, rx: 10, fill: SOFT, stroke: INK, "stroke-width": SW }, svg);
      el("rect", { x: 1172, y: 216, width: 342, height: 924, rx: 10, fill: SOFT, stroke: INK, "stroke-width": SW }, svg);
      const FL = [
        ["your computer", ["OpenClaw", "Munder Difflin", "NanoClaw", "ZeroClaw", "Goose", "Hermes Agent", "nanobot"]],
        ["a server", ["Hermes Agent", "nanobot"]],
        ["Anthropic's servers", ["Claude"]],
      ];
      const DOTC = [YEL, MINT, SKY, LIL, BLUE];
      const clip = el("clipPath", { id: "mg-lift-clip" }, el("defs", {}, svg));
      el("rect", { x: 744, y: 0, width: 900, height: 1200 }, clip);
      const deck = el("g", { "clip-path": "url(#mg-lift-clip)" }, svg);
      const cards = FL.map(([label, picks]) => {
        const h = 150 + picks.length * 106 + 20, oy = Math.round(678 - h / 2) - 250, g = el("g", {}, deck), gi = el("g", { transform: `translate(0 ${oy})` }, g);
        el("rect", { x: 830, y: 250, width: 660, height: h, rx: 30, fill: "#fff", stroke: INK, "stroke-width": SW }, gi);
        chip(gi, 1160, 326, label, YEL, 40);
        el("path", { d: "M870 392 H1450", stroke: INK, "stroke-width": SW, "stroke-dasharray": "2 12", "stroke-linecap": "round" }, gi);
        picks.forEach((s, j) => {
          const y = 410 + j * 106;
          el("rect", { x: 880, y: y + 26, width: 44, height: 44, rx: 12, fill: DOTC[j % 5], stroke: INK, "stroke-width": SW }, gi);
          txt(gi, 952, y + 64, s, { "font-size": 46, "font-weight": 700 });
        });
        return g;
      });
      // the call panel
      el("rect", { x: 60, y: 190, width: 660, height: 950, rx: 36, fill: SOFT, stroke: INK, "stroke-width": SW }, svg);
      [[96, 226], [684, 226], [96, 1104], [684, 1104]].forEach(([x, y]) => { el("circle", { cx: x, cy: y, r: 10, fill: "#fff", stroke: INK, "stroke-width": SW }, svg); el("path", { d: `M${x - 5} ${y} H${x + 5}`, stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, svg); });
      el("rect", { x: 150, y: 250, width: 480, height: 120, rx: 22, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      const lamps = [0, 1, 2].map((i) => el("circle", { cx: 440 + i * 56, cy: 310, r: 16, fill: "#fff", stroke: INK, "stroke-width": SW }, svg));
      const arrowClip = el("clipPath", { id: "mg-lift-arrow" }, el("defs", {}, svg));
      el("rect", { x: 170, y: 262, width: 200, height: 96 }, arrowClip);
      const aw = el("g", { "clip-path": "url(#mg-lift-arrow)" }, svg), arrow = el("path", { d: "M0 -30 L34 10 H14 V30 H-14 V10 H-34 Z", fill: BLUE, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, aw);
      const ICON = [
        (g) => { el("rect", { x: -32, y: -28, width: 64, height: 42, rx: 6, fill: "#fff", stroke: INK, "stroke-width": SW }, g); el("path", { d: "M-42 22 H42 L36 30 H-36 Z", fill: "#fff", stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, g); },
        (g) => { [-24, 4].forEach((y) => { el("rect", { x: -32, y, width: 64, height: 24, rx: 5, fill: "#fff", stroke: INK, "stroke-width": SW }, g); el("circle", { cx: 18, cy: y + 12, r: 4, fill: INK }, g); el("path", { d: `M-20 ${y + 12} H2`, stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, g); }); },
        (g) => { el("path", { d: "M-30 20 Q-46 20 -46 6 Q-46 -10 -28 -10 Q-24 -30 -2 -30 Q20 -30 24 -10 Q44 -10 44 6 Q44 20 28 20 Z", fill: "#fff", stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, g); },
      ];
      const btns = FL.map(([label], i) => {
        const cy = 520 + i * 220, g = el("g", {}, svg);
        el("rect", { x: 92, y: cy - 92, width: 596, height: 184, rx: 30, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": SW, "stroke-dasharray": "6 8", class: "mg-ring" }, g);
        const glow = el("circle", { cx: 180, cy, r: 84, fill: YEL, "fill-opacity": 0.4 }, g);
        const face = el("g", {}, g), disc = el("circle", { r: 64, fill: "#fff", stroke: INK, "stroke-width": SW }, face);
        ICON[i](el("g", {}, face));
        tf(face, 180, cy);
        txt(g, 276, cy + 13, label, { "font-size": 37, "font-weight": 700 });
        button(g, `${label}: ${FL[i][1].join(", ")}`, () => api.seek(i * P + 0.01));
        return { glow, face, disc, cy };
      });
      txt(svg, 390, 1078, "Tap a button to change floors.", { "text-anchor": "middle", "font-size": 31, "font-weight": 500, fill: MUTE });
      return (t) => {
        const i = Math.floor(t / P) % 3, u = (t % P) / P, prev = (i + 2) % 3;
        btns.forEach((b, j) => {
          const on = j === i, press = on ? Math.sin(Math.PI * seg(u, 0, 0.09)) : 0;
          b.disc.setAttribute("fill", on ? YEL : "#fff"); b.glow.setAttribute("fill-opacity", on ? 0.4 * oc(seg(u, 0.03, 0.12)) : 0);
          tf(b.face, 180, b.cy, 1 - 0.1 * press);
        });
        lamps.forEach((l, j) => l.setAttribute("fill", j === i ? YEL : "#fff"));
        const up = i > prev, m = io(seg(u, 0.02, 0.3));
        tf(arrow, 270, 310 + (up ? 1 : -1) * (90 - 90 * m), 1, up ? 0 : 180);
        cards.forEach((c, j) => {
          const k = j === i ? oc(seg(u, 0.1, 0.26)) * (1 - io(seg(u, 0.88, 1))) : 0;
          c.setAttribute("transform", `translate(${-760 * (1 - k)} 0)`); c.setAttribute("opacity", k <= 0 ? 0 : 1);
        });
      };
    },
  };

  /* ---- 3. two taps: the software pours free, the model fills its own glass ---- */
  SC.taps = {
    w: 1600, h: 1200, dur: 10, still: 6.5,
    build(svg) {
      txt(svg, 60, 128, "The software costs nothing", { "font-size": 68, "font-weight": 700 });
      el("rect", { x: 60, y: 180, width: 1480, height: 600, rx: 28, fill: SOFT }, svg);
      for (let x = 160; x < 1540; x += 100) el("path", { d: `M${x} 180 V780`, stroke: "#fff", "stroke-width": SW }, svg);
      for (let y = 280; y < 780; y += 100) el("path", { d: `M60 ${y} H1540`, stroke: "#fff", "stroke-width": SW }, svg);
      el("rect", { x: 60, y: 180, width: 1480, height: 600, rx: 28, fill: "none", stroke: INK, "stroke-width": SW }, svg);
      // counter and basin
      el("path", { d: "M230 800 V1060 Q230 1120 290 1120 H1310 Q1370 1120 1370 1060 V800", fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      el("rect", { x: 60, y: 760, width: 1480, height: 56, rx: 14, fill: YEL, stroke: INK, "stroke-width": SW }, svg);
      el("ellipse", { cx: 800, cy: 1098, rx: 38, ry: 9, fill: SOFT, stroke: INK, "stroke-width": SW }, svg);
      const G = [
        { cx: 470, wt: 300, wb: 256, top: 640, bot: 1090, tap: 300, label: "software", col: MINT, sw: 40, fill: [0.7, 3.0], full: 1, sticker: ["free"], fs: 66 },
        { cx: 1130, wt: 420, wb: 372, top: 640, bot: 1090, tap: 960, label: "model", col: LIL, sw: 16, fill: [1.4, 6.2], full: 0.8, sticker: ["your API key,", "your plan", "or a local model"], fs: 34 },
      ];
      const defs = el("defs", {}, svg);
      const run = G.map((g, gi) => {
        const L = g.cx - g.wt / 2, R = g.cx + g.wt / 2, l = g.cx - g.wb / 2, r = g.cx + g.wb / 2;
        const shape = `M${L} ${g.top} L${l} ${g.bot - 22} Q${l} ${g.bot} ${l + 22} ${g.bot} H${r - 22} Q${r} ${g.bot} ${r} ${g.bot - 22} L${R} ${g.top} Z`;
        const cp = el("clipPath", { id: `mg-glass-${gi}` }, defs); el("path", { d: shape }, cp);
        el("path", { d: shape, fill: "#fff" }, svg);
        const wg = el("g", { "clip-path": `url(#mg-glass-${gi})` }, svg);
        const water = el("rect", { x: L - 10, width: g.wt + 20, y: g.bot, height: 0, fill: SKY }, wg);
        const bubbles = Array.from({ length: 7 }, (_, j) => el("circle", { r: 7 + (j % 3) * 3, fill: "#fff" }, wg));
        // the tap
        const ny = 470, nx = g.cx;
        const stream = el("rect", { x: nx - g.sw / 2, y: ny, width: g.sw, height: 0, rx: g.sw / 2, fill: SKY, stroke: INK, "stroke-width": SW }, svg);
        el("rect", { x: g.tap - 46, y: 330, width: 92, height: 120, rx: 22, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
        el("path", { d: `M${g.tap} 366 H${nx + 6} Q${nx + 34} 366 ${nx + 34} 394 V470 H${nx - 34} V418 H${g.tap} Z`, fill: "#fff", stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, svg);
        el("rect", { x: nx - 40, y: 458, width: 80, height: 24, rx: 8, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
        const hx = g.tap + 70;
        el("rect", { x: hx - 12, y: 300, width: 24, height: 68, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
        const lever = el("g", {}, svg);
        el("rect", { x: -16, y: -18, width: 150, height: 36, rx: 18, fill: g.col, stroke: INK, "stroke-width": SW }, lever);
        el("circle", { r: 26, fill: g.col, stroke: INK, "stroke-width": SW }, lever);
        chip(svg, hx + 160, 240, g.label, g.col, 40);
        // glass outline and sticker
        el("path", { d: shape, fill: "none", stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, svg);
        el("path", { d: `M${L + 24} ${g.top + 40} L${l + 26} ${g.bot - 60}`, stroke: "#fff", "stroke-width": SW * 2, "stroke-linecap": "round", opacity: 0.9 }, svg);
        const sh = g.sticker.length * g.fs * 1.25 + 44, sw = g.sticker.length > 1 ? 350 : 210, sy = 880 - sh / 2;
        el("rect", { x: g.cx - sw / 2, y: sy, width: sw, height: sh, rx: 22, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
        g.sticker.forEach((s, j) => txt(svg, g.cx, sy + 22 + g.fs * 0.95 + j * g.fs * 1.25, s, { "text-anchor": "middle", "font-size": g.fs, "font-weight": 700 }));
        const drops = Array.from({ length: gi ? 3 : 6 }, () => el("circle", { r: gi ? 9 : 12, fill: SKY, stroke: INK, "stroke-width": SW }, svg));
        const spill = gi ? [] : Array.from({ length: 4 }, () => el("ellipse", { rx: 11, ry: 15, fill: SKY, stroke: INK, "stroke-width": SW }, svg));
        return { g, water, bubbles, stream, lever, hx, drops, spill, ny, L, R };
      });
      return (t) => {
        run.forEach((o, gi) => {
          const g = o.g, open = seg(t, g.fill[0] - 0.5, g.fill[0] - 0.1) * (1 - seg(t, 8.0, 8.3));
          tf(o.lever, o.hx, 300, 1, 180 + 32 * open);
          const span = g.bot - g.top - 30, lv = g.full * oc(seg(t, g.fill[0], g.fill[1])) * (1 - io(seg(t, 8.4, 9.6)));
          const surf = g.bot - span * lv;
          o.water.setAttribute("y", surf); o.water.setAttribute("height", g.bot - surf + 10);
          const on = t > g.fill[0] - 0.15 && t < 8.3, head = Math.min(surf, o.ny + (t - (g.fill[0] - 0.15)) * 2600);
          const tail = t < 8.0 ? o.ny : o.ny + (t - 8.0) * 2600;
          o.stream.setAttribute("y", tail); o.stream.setAttribute("height", on ? Math.max(0, head - tail) : 0);
          o.bubbles.forEach((b, j) => {
            const ph = (t * (0.5 + (j % 3) * 0.17) + j * 0.37) % 1, by = g.bot - 20 - ph * (g.bot - surf - 20);
            b.setAttribute("cx", g.cx - g.wb / 2 + 40 + ((j * 71) % (g.wb - 80))); b.setAttribute("cy", by);
            b.setAttribute("opacity", lv > 0.05 && by > surf + 12 ? 1 : 0);
          });
          o.drops.forEach((d, j) => {
            const ph = (t * 1.6 + j / o.drops.length) % 1, side = j % 2 ? 1 : -1, dx = side * (30 + j * 9) * ph;
            d.setAttribute("cx", g.cx + dx); d.setAttribute("cy", surf - 70 * ph + 120 * ph * ph);
            d.setAttribute("r", (gi ? 9 : 12) * (1 - 0.6 * ph)); d.setAttribute("opacity", on && head >= surf - 1 && ph < 0.85 ? 1 : 0);
          });
          o.spill.forEach((s, j) => {
            const ph = (t * 0.9 + j * 0.25) % 1, side = j % 2 ? 1 : -1, x = side > 0 ? o.R + 6 - 22 * ph : o.L - 6 + 22 * ph;
            s.setAttribute("cx", x); s.setAttribute("cy", g.top + 6 + ph * (g.bot - g.top - 10));
            s.setAttribute("opacity", lv > 0.99 && on && ph < 0.92 ? 1 : 0);
          });
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 1, still: 0,
    build(svg) {
      txt(svg, 84, 196, "7 picks for chat, code and cloud", { "font-family": MONO, "font-size": 34, "font-weight": 700, fill: MUTE });
      txt(svg, 78, 360, "Hermes Agent", { "font-size": 132, "font-weight": 700 });
      txt(svg, 78, 512, "alternatives", { "font-size": 132, "font-weight": 700 });
      el("rect", { x: 84, y: 548, width: 760, height: 20, rx: 10, fill: YEL }, svg);
      const ck = el("g", {}, svg); el("circle", { r: 24, fill: MINT, stroke: INK, "stroke-width": SW }, ck); el("path", { d: "M-11 1 L-3 9 L12 -8", fill: "none", stroke: INK, "stroke-width": SW, "stroke-linecap": "round", "stroke-linejoin": "round" }, ck); tf(ck, 108, 650);
      txt(svg, 150, 664, "Checked 19 Oct 2026", { "font-size": 40, "font-weight": 600 });
      const trail = "M90 800 C420 860 700 760 900 760 C1080 760 1150 700 1110 640 C1070 580 990 620 1010 680 C1030 740 1120 700 1168 616";
      el("path", { d: trail, stroke: SOFT, "stroke-width": 26, fill: "none", "stroke-linecap": "round" }, svg);
      el("path", { d: trail, stroke: INK, "stroke-width": SW, fill: "none", "stroke-dasharray": "2 16", "stroke-linecap": "round" }, svg);
      const plane = el("g", {}, svg);
      el("path", { d: "M170 0 L-150 -110 L-40 4 Z", fill: SKY, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, plane);
      el("path", { d: "M170 0 L-40 4 L-90 92 Z", fill: BLUE, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, plane);
      el("path", { d: "M170 0 L-40 4 L-150 40 Z", fill: "#fff", stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, plane);
      tf(plane, 1320, 470, 1.25, -28);
      const star = (x, y, s, c) => { const g = el("g", {}, svg); el("path", { d: "M0 -22 Q4 -4 22 0 Q4 4 0 22 Q-4 4 -22 0 Q-4 -4 0 -22 Z", fill: c, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, g); tf(g, x, y, s); };
      star(1470, 190, 1.4, YEL); star(1160, 230, 1, LIL); star(1500, 690, 1.1, MINT); star(1300, 790, 0.9, YEL);
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
