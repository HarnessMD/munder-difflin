/* Bright coded scenes for "Claude routines". Vanilla JS, no library.
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

  const cloudD = "M-110 60 H110 a50 50 0 0 0 8 -99 a62 62 0 0 0 -112 -34 a48 48 0 0 0 -84 30 a52 52 0 0 0 -32 103 Z";
  const pillBox = (g, s, fill, size = 22) => {
    const r = el("rect", { y: -22, height: 44, rx: 22, fill, stroke: INK, "stroke-width": 3 }, g), t = txt(g, 0, 8, s, { "text-anchor": "middle", "font-size": size, "font-weight": 700 });
    const w = t.getComputedTextLength() + 40; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
  };
  const dial = (svg, x, y, r) => {
    el("circle", { cx: x, cy: y, r, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.2832; el("path", { d: `M${x + Math.sin(a) * (r - 13)} ${y - Math.cos(a) * (r - 13)} L${x + Math.sin(a) * (r - 6)} ${y - Math.cos(a) * (r - 6)}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg); }
    el("path", { d: `M${x - 9} ${y - r - 16} H${x + 9} L${x} ${y - r - 3} Z`, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
    const h = el("path", { d: `M0 0 V${-(r - 20)}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
    el("circle", { cx: x, cy: y, r: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
    return (deg) => tf(h, x, y, 1, deg);
  };

  const SC = {};

  /* ---- 1. the laptop shuts, the alarm clock rings, the prompt goes up to the cloud ---- */
  SC.alarm = {
    dur: 11, still: 8.6,
    build(svg, api) {
      txt(svg, 44, 62, "Routines run in the cloud", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap the alarm clock", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const D = 470, CX = 328, CY = 212;
      const rays = el("g", {}, svg);
      [146, 166, 186, 34, 14, -6].forEach((dg) => { const r = (dg * Math.PI) / 180, c = Math.cos(r), q = -Math.sin(r); el("path", { d: `M${CX + 4 + c * 226} ${CY - 14 + q * 150} L${CX + 4 + c * 262} ${CY - 14 + q * 176}`, stroke: YEL, "stroke-width": 8, "stroke-linecap": "round" }, rays); });
      const cloud = el("g", {}, svg);
      el("path", { d: cloudD, fill: "#fff", stroke: INK, "stroke-width": 2.2, "stroke-linejoin": "round" }, cloud);
      const glow = el("path", { d: cloudD, fill: YEL, stroke: INK, "stroke-width": 2.2, "stroke-linejoin": "round" }, cloud);
      el("rect", { x: 30, y: D, width: 740, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      /* laptop, front view */
      const LX = 190;
      const lid = el("g", {}, svg);
      el("rect", { x: -112, y: -150, width: 224, height: 150, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3, "vector-effect": "non-scaling-stroke" }, lid);
      el("rect", { x: -96, y: -134, width: 192, height: 114, rx: 5, fill: SKY, stroke: INK, "stroke-width": 3, "vector-effect": "non-scaling-stroke" }, lid);
      el("path", { d: `M${LX - 136} ${D} L${LX - 116} ${D - 20} H${LX + 116} L${LX + 136} ${D} Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      /* alarm clock */
      const KX = 632, KY = D - 96;
      const clock = el("g", {}, svg);
      el("circle", { r: 96, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, clock);
      el("path", { d: "M-44 60 L-62 92 M44 60 L62 92", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, clock);
      const bells = [-1, 1].map((s) => el("path", { d: "M-30 0 A30 30 0 0 1 30 0 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", transform: `translate(${s * 52} -64) rotate(${s * 38})` }, clock));
      el("path", { d: "M0 -78 V-98", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, clock);
      el("circle", { cy: -100, r: 8, fill: INK }, clock);
      el("circle", { r: 76, fill: MINT, stroke: INK, "stroke-width": 3 }, clock);
      el("circle", { r: 58, fill: "#fff", stroke: INK, "stroke-width": 3 }, clock);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.2832; el("path", { d: `M${Math.sin(a) * 44} ${-Math.cos(a) * 44} L${Math.sin(a) * 50} ${-Math.cos(a) * 50}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, clock); }
      el("path", { d: "M0 0 V-36 M0 0 L24 14", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", fill: "none" }, clock);
      el("circle", { r: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, clock);
      const waves = [-1, 1].map((s) => el("path", { d: `M${s * 92} -92 q${s * 18} 14 ${s * 18} 36 M${s * 108} -108 q${s * 26} 22 ${s * 26} 60`, stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", transform: `translate(${KX} ${KY})` }, svg));
      button(clock, "Ring the alarm clock again", () => api.seek(2.3));
      /* the prompt sheet */
      const paper = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: -62, y: -76, width: 124, height: 152, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, paper);
      txt(paper, 0, -34, "prompt", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      el("path", { d: "M-40 -8 H40 M-40 16 H40 M-40 40 H12", stroke: LIL, "stroke-width": 6, "stroke-linecap": "round" }, paper);
      const cap = strip(svg, 514, 720);
      return (t) => {
        const out = seg(t, 9.8, 10.5);
        const shut = io(seg(t, 0.6, 1.8)) - io(seg(t, 10, 10.8));
        lid.setAttribute("transform", `translate(${LX} ${D - 20}) scale(1 ${1 - 0.9 * shut})`);
        const ring = seg(t, 2.4, 2.6) * (1 - seg(t, 3.9, 4.2));
        tf(clock, KX + Math.sin(t * 46) * 4 * ring, KY, 0.92, Math.sin(t * 38) * 5 * ring);
        bells.forEach((b, i) => { const s = i ? 1 : -1; b.setAttribute("transform", `translate(${s * 52} ${-64 - Math.abs(Math.sin(t * 40 + i)) * 5 * ring}) rotate(${s * 38})`); });
        waves.forEach((w) => w.setAttribute("opacity", ring * (0.5 + 0.5 * Math.abs(Math.sin(t * 9)))));
        const up = io(seg(t, 3.2, 5.4));
        tf(paper, 446 + (CX - 446) * up + Math.sin(up * 9) * 26 * (1 - up), D - 80 + (CY + 18 - D + 80) * up, 1 - 0.14 * up, Math.sin(up * 7) * 9 * (1 - up) - 4 * up);
        paper.setAttribute("opacity", t < 9.8 ? 1 : t < 10.5 ? 1 - out : seg(t, 10.6, 10.95));
        const g = seg(t, 5.2, 5.8) * (1 - out);
        glow.setAttribute("opacity", g);
        tf(cloud, CX, CY, 1.2 + 0.025 * g * Math.sin(t * 4));
        rays.setAttribute("opacity", g * (0.82 + 0.18 * Math.sin(t * 5)));
        cap.textContent = t < 2.3 || t >= 9.8 ? "A routine is a saved prompt" : t < 5.4 ? "It runs on a schedule, an API call or a GitHub event" : "“so they keep working when your laptop is closed”";
      };
    },
  };

  /* ---- 2. three envelopes, one letterbox: each trigger lifts the flag ---- */
  SC.letterbox = {
    dur: 11, still: 9,
    build(svg, api) {
      txt(svg, 44, 62, "What can start a routine?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap an envelope", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const TR = [["Scheduled", YEL, "Scheduled: on a recurring cadence, or once at a future time"], ["API", SKY, "API: when you send an HTTP POST with a bearer token"], ["GitHub", MINT, "GitHub: on repository events such as pull requests or releases"]];
      const EX = 172, EY = [156, 284, 412], SX = 552, SY = 232, LAND = [2.3, 4.9, 7.5], FL = 1.1;
      el("path", { d: "M390 494 H770", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: SX - 22, y: 340, width: 44, height: 154, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const box = el("g", {}, svg);
      el("path", { d: "M-150 110 V10 Q-150 -90 -50 -90 H50 Q150 -90 150 10 V110 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, box);
      el("rect", { x: -96, y: -12, width: 192, height: 24, rx: 12, fill: INK }, box);
      txt(box, 0, 76, "routine", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      const flag = el("g", {}, svg);
      el("path", { d: "M0 0 V-62", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, flag);
      el("rect", { x: 0, y: -66, width: 44, height: 32, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, flag);
      el("circle", { r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, flag);
      const env = (g, w, h, col) => {
        el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h * 0.12, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${-w / 2 + 4} ${-h / 2 + 6} L0 ${-h * 0.04} L${w / 2 - 4} ${-h / 2 + 6}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      };
      let pinned = -1, man = { i: 0, t0: -99 };
      const ticks = TR.map(([name, col, line], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -128, y: -60, width: 256, height: 120, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        env(g, 236, 104, col);
        txt(g, 0, 36, name, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        tf(g, EX, EY[i]);
        button(g, line, () => { pinned = i; man = { i, t0: api.now() }; api.poke(); });
        const k = el("g", { "pointer-events": "none" }, svg);
        el("circle", { r: 17, fill: "#fff", stroke: INK, "stroke-width": 3 }, k);
        el("path", { d: "M-8 0 L-2 6 L8 -6", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, k);
        return k;
      });
      const fly = [0, 1, 2, 3].map(() => el("g", { "pointer-events": "none" }, svg));
      fly.forEach((g, i) => env(g, 110, 66, i < 3 ? TR[i][1] : YEL));
      const place = (g, i, p) => {
        if (p <= 0 || p >= 1) { g.setAttribute("opacity", 0); return; }
        const e = io(p), x = EX + 130 + (SX - EX - 130) * e, y = EY[i] + (SY - EY[i]) * e - 70 * Math.sin(Math.PI * e), sink = seg(p, 0.82, 1);
        g.setAttribute("transform", `translate(${x} ${y}) rotate(${-14 * Math.sin(Math.PI * e)}) scale(${1 - 0.25 * e} ${(1 - 0.25 * e) * (1 - 0.8 * sink)})`);
        g.setAttribute("opacity", seg(p, 0, 0.08) * (1 - sink * sink));
      };
      const cap = strip(svg, 512, 720);
      return (t, now) => {
        const out = seg(t, 10.2, 10.6);
        let u = 0, cur = -1, bump = 0;
        LAND.forEach((L, i) => {
          place(fly[i], i, (t - L + FL) / FL);
          u = Math.max(u, ob(seg(t, L, L + 0.3)) - seg(t, i === 2 ? 9.9 : L + 1.3, i === 2 ? 10.3 : L + 1.7));
          bump = Math.max(bump, Math.sin(seg(t, L - 0.1, L + 0.3) * Math.PI));
          if (t >= L - FL) cur = i;
          const k = ob(seg(t, L, L + 0.3)) * (1 - out), mk = man.i === i ? ob(seg(now - man.t0, FL, FL + 0.3)) * (1 - seg(now - man.t0, 4, 4.3)) : 0, s = Math.max(k, mk);
          tf(ticks[i], EX + 112, EY[i] - 46, cl(s, 0, 1.3)); ticks[i].setAttribute("opacity", s <= 0.01 ? 0 : 1);
        });
        const mt = now - man.t0;
        fly[3].firstChild.setAttribute("fill", TR[man.i][1]);
        place(fly[3], man.i, mt / FL);
        u = Math.max(u, ob(seg(mt, FL, FL + 0.3)) - seg(mt, FL + 1.3, FL + 1.7));
        bump = Math.max(bump, Math.sin(seg(mt, FL - 0.1, FL + 0.3) * Math.PI));
        tf(flag, SX + 150, 306, 1, 90 * (1 - cl(u, 0, 1.15)));
        box.setAttribute("transform", `translate(${SX} ${SY}) scale(${1 + 0.035 * bump} ${1 - 0.03 * bump})`);
        cap.textContent = pinned >= 0 ? TR[pinned][2] : t > 8.7 && t < 10.4 ? "A single routine can combine triggers" : cur < 0 || t >= 10.4 ? "A schedule, an API call or a GitHub event can start a routine" : TR[cur][2];
      };
    },
  };

  /* ---- 3. mugs under a tap: the meter fills, the tap shuts, the next mug waits for the clock ---- */
  SC.mugs = {
    dur: 12, still: 8.5,
    build(svg) {
      txt(svg, 44, 62, "Scheduled runs: 100 per hour", { "font-size": 32, "font-weight": 700 });
      const S = 452, TX = 400, RESET = 9.6;
      const hand = dial(svg, 142, 232, 92);
      /* the tap */
      const stream = el("rect", { x: TX - 7, y: 300, width: 14, height: 0, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      el("rect", { x: TX - 16, y: 250, width: 32, height: 50, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: TX - 56, y: 92, width: 112, height: 22, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: TX - 86, y: 112, width: 172, height: 140, rx: 20, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: TX - 58, y: 138, width: 26, height: 88, rx: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const lever = el("g", {}, svg);
      el("path", { d: "M0 0 H44", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, lever);
      el("circle", { cx: 48, r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, lever);
      const plug = el("rect", { x: TX - 24, y: 294, width: 48, height: 12, rx: 6, fill: INK }, svg);
      /* the meter */
      const MX = 652;
      txt(svg, MX, 180, "100", { "text-anchor": "middle", "font-family": MONO, "font-size": 76, "font-weight": 700 });
      txt(svg, MX, 220, "per hour", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      el("rect", { x: MX - 98, y: 244, width: 196, height: 44, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const cells = [0, 1, 2, 3].map((i) => el("rect", { x: MX - 88 + i * 45, y: 253, width: 41, height: 26, rx: 13, fill: BLUE, stroke: INK, "stroke-width": 2 }, svg));
      txt(svg, MX, 324, "for your account", { "text-anchor": "middle", "font-size": 22, "font-weight": 500, fill: MUTE });
      /* shelf and mugs */
      el("path", { d: `M110 ${S + 14} V${S + 44} L150 ${S + 14} M690 ${S + 14} V${S + 44} L650 ${S + 14}`, stroke: INK, "stroke-width": 3, fill: SOFT, "stroke-linejoin": "round" }, svg);
      const MUG = [[1.2, 2.3, 1.3, 4.1, 5.9], [3.0, 4.1, 3.1, 5.9, 11.2], [4.8, 5.9, 4.9, 99, 11.2], [6.6, 10.9, 9.9, 99, 11.6]];
      const mugs = MUG.map(([a, d, f, d2, off], i) => {
        const g = el("g", {}, svg);
        el("path", { d: "M46 -72 h12 a22 22 0 0 1 0 44 h-12", stroke: INK, "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, g);
        el("path", { d: "M46 -72 h12 a22 22 0 0 1 0 44 h-12", stroke: "#fff", "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, g);
        const body = "M-50 -96 H50 V-14 Q50 0 36 0 H-36 Q-50 0 -50 -14 Z";
        el("path", { d: body, fill: "#fff" }, g);
        const liq = el("rect", { x: -46, width: 92, rx: 8, fill: YEL }, g);
        el("path", { d: body, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-30 -78 V-30", stroke: [LIL, MINT, SKY, LIL][i], "stroke-width": 8, "stroke-linecap": "round" }, g);
        return { g, liq, a, d, f, d2, off };
      });
      el("rect", { x: 30, y: S, width: 740, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const wait = el("g", {}, svg); pillBox(wait, "The run waits", YEL, 24);
      const cap = strip(svg, 514, 720);
      return (t) => {
        hand((360 * (t - RESET)) / 12);
        let pour = 0, level = 1, top = S;
        mugs.forEach((m, i) => {
          const x = 130 + 270 * io(seg(t, m.a - 0.9, m.a)) + 140 * io(seg(t, m.d, m.d + 0.8)) + 138 * io(seg(t, m.d2, m.d2 + 0.8));
          const fill = seg(t, m.f, m.f + 0.9), h = 84 * fill;
          tf(m.g, x, S);
          m.g.setAttribute("opacity", seg(t, m.a - 1.2, m.a - 0.9) * (1 - seg(t, m.off, m.off + 0.3)));
          m.liq.setAttribute("y", -4 - h); m.liq.setAttribute("height", h);
          if (fill > 0 && fill < 1) { pour = 1; top = S - 4 - h; }
          level = i < 3 ? level + fill : level * (1 - seg(t, RESET, RESET + 0.3)) + fill;
        });
        stream.setAttribute("height", pour ? top - 300 : 0); stream.setAttribute("opacity", pour);
        const shut = seg(t, 5.9, 6.3) - seg(t, RESET, RESET + 0.3);
        tf(lever, TX + 16, 274, 1, -62 * shut);
        plug.setAttribute("opacity", shut);
        cells.forEach((c, i) => c.setAttribute("opacity", cl(level - i)));
        const w = ob(seg(t, 6.7, 7)) * (1 - seg(t, RESET, RESET + 0.3));
        tf(wait, 232, 392, cl(w, 0, 1.2)); wait.setAttribute("opacity", w <= 0.01 ? 0 : 1);
        cap.textContent = t > 5.9 && t < RESET ? "Over the limit: the run waits" : "Scheduled runs: 100 per hour, for your account";
      };
    },
  };

  /* ---- 4. two watering cans: one tips once an hour, one once a minute ---- */
  SC.watering = {
    dur: 12, still: 9.3,
    build(svg) {
      txt(svg, 44, 62, "Minimum interval", { "font-size": 32, "font-weight": 700 });
      el("path", { d: "M400 96 V552", stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const G = 470, TIP = [100, -36];
      const can = (col) => {
        const g = el("g", {}, svg);
        el("path", { d: "M-44 -14 Q-84 -12 -82 12 Q-80 34 -44 26", stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, g);
        el("path", { d: "M-28 -34 Q0 -70 28 -34", stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, g);
        el("path", { d: "M40 2 L88 -44 L104 -28 L40 34 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M82 -54 L112 -24", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, g);
        el("rect", { x: -48, y: -36, width: 96, height: 76, rx: 12, fill: col, stroke: INK, "stroke-width": 3 }, g);
        return g;
      };
      const pot = (x) => {
        const g = el("g", {}, svg);
        el("path", { d: "M0 -84 V-138", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
        el("path", { d: "M0 -98 Q-34 -98 -38 -136 Q-6 -138 0 -98 Z M0 -112 Q40 -110 48 -156 Q6 -160 0 -112 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const b = el("g", {}, svg);
        el("path", { d: "M-52 -66 L-40 0 H40 L52 -66 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, b);
        el("rect", { x: -62, y: -88, width: 124, height: 24, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, b);
        tf(b, x, G);
        return (k) => g.setAttribute("transform", `translate(${x} ${G}) rotate(${k * 5}) scale(${1 + 0.06 * k})`);
      };
      const side = (o) => {
        txt(svg, o.cx, 116, o.head, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        txt(svg, o.cx, 142, o.sub, { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
        const hand = dial(svg, o.dx, 238, o.dr);
        const sway = pot(o.px);
        const c = can(o.col);
        const drops = [0, 1, 2].map(() => el("path", { d: "M0 -15 Q12 2 0 11 Q-12 2 0 -15 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg));
        txt(svg, o.cx, 536, o.big, { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
        return (t) => {
          hand(o.hand(t));
          let k = 0, ph = -1;
          o.pours.forEach(([a, b]) => { const q = io(seg(t, a, a + 0.35)) - io(seg(t, b - 0.35, b)); if (q > k) { k = q; ph = seg(t, a + 0.25, b - 0.1); } });
          const ang = o.ang * k, r = (ang * Math.PI) / 180, dx = TIP[0] - o.piv[0], dy = TIP[1] - o.piv[1];
          c.setAttribute("transform", `translate(${o.x} ${o.y}) rotate(${ang} ${o.piv[0]} ${o.piv[1]})`);
          const tx = o.x + o.piv[0] + dx * Math.cos(r) - dy * Math.sin(r), ty = o.y + o.piv[1] + dx * Math.sin(r) + dy * Math.cos(r);
          drops.forEach((d, j) => { const p = ph < 0 ? -1 : (ph * 2.4 + j / 3) % 1; tf(d, tx + 2, ty + 12 + (G - 100 - ty) * p * p); d.setAttribute("opacity", ph <= 0 || ph >= 1 || k < 0.9 ? 0 : Math.sin(p * Math.PI) > 0.15 ? 1 : 0); });
          sway(ph > 0.2 && ph < 1 ? Math.sin(t * 12) * 0.5 : 0);
        };
      };
      /* left: the can hangs from a cloud */
      el("path", { d: "M150 262 V306", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: cloudD, fill: "#fff", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", transform: "translate(150 232) scale(0.62)" }, svg);
      const L = side({ cx: 212, head: "Cloud", sub: "needs no machine on", big: "1 hour", dx: 322, dr: 48, px: 292, col: SKY, x: 150, y: 356, piv: [0, -50], ang: 30, pours: [[8.5, 10.1]], hand: (t) => (360 * (t - 8.5)) / 12 });
      /* right: the can sits on a desk */
      el("path", { d: `M452 ${G} V398 M548 ${G} V398`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("rect", { x: 432, y: 386, width: 136, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const R = side({ cx: 590, head: "Desktop tasks and /loop", sub: "run on your machine", big: "1 minute", dx: 606, dr: 60, px: 676, col: YEL, x: 500, y: 346, piv: [48, 40], ang: 30, pours: [0, 1, 2, 3, 4, 5].map((i) => [i * 2 + 0.5, i * 2 + 1.9]), hand: (t) => (360 * (t - 0.5)) / 2 });
      el("path", { d: `M30 ${G} H380 M420 ${G} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      return (t) => { L(t); R(t); };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 112, "Triggers, cost and limits", { "font-family": MONO, "font-size": 24, "font-weight": 700, fill: MUTE });
      txt(svg, 60, 226, "Claude", { "font-size": 108, "font-weight": 700 });
      txt(svg, 60, 334, "routines", { "font-size": 108, "font-weight": 700 });
      el("path", { d: "M66 368 H470", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 438, "Checked 12 Oct 2026", { "font-size": 30, "font-weight": 500, fill: MUTE });
      /* a tear-off wall calendar with one column ticked, week after week */
      const g = el("g", { transform: "translate(732 276) rotate(4)" }, svg);
      el("rect", { x: -150, y: -176, width: 324, height: 372, rx: 22, fill: LIL }, g);
      el("rect", { x: -162, y: -188, width: 324, height: 372, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
      el("path", { d: "M-162 -112 V-166 Q-162 -188 -140 -188 H140 Q162 -188 162 -166 V-112 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      [-84, 84].forEach((x) => el("circle", { cx: x, cy: -150, r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, g));
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
        const x = -138 + c * 47, y = -92 + r * 52, on = c === 2;
        el("rect", { x, y, width: 39, height: 42, rx: 10, fill: on ? YEL : SOFT, stroke: INK, "stroke-width": on ? 3 : 0 }, g);
        if (on) el("path", { d: `M${x + 11} ${y + 22} L${x + 18} ${y + 29} L${x + 29} ${y + 14}`, stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
      }
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
