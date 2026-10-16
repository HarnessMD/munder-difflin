/* Bright coded scenes for "Claude Code Router". Vanilla JS, no library.
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

  const lerp = (a, b, k) => a + (b - a) * k;
  /* a rounded label sized to its words, centred on 0,0 of its group */
  const pill = (g, s, fill, fs = 24) => {
    const r = el("rect", { y: -fs, height: fs * 2, rx: fs, fill, stroke: INK, "stroke-width": 3 }, g), t = txt(g, 0, fs * 0.36, s, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 });
    const w = t.getComputedTextLength() + fs * 1.4; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return w;
  };
  /* a wavy line from x0 to x1 at height y, n waves of height a */
  const wave = (x0, x1, y, a = 8, n = 2) => { const st = (x1 - x0) / (n * 2); let d = `M${x0} ${y}`; for (let i = 0; i < n * 2; i++) d += ` q${st / 2} ${i % 2 ? 2 * a : -2 * a} ${st} 0`; return d; };
  /* keyframes [[t, x, y], ...]; moves between different stops lift in a small arc */
  const kf = (t, K, lift = 0) => {
    if (t <= K[0][0]) return [K[0][1], K[0][2]];
    for (let i = 1; i < K.length; i++) if (t < K[i][0]) { const a = K[i - 1], b = K[i], k = io(seg(t, a[0], b[0])), mv = a[1] !== b[1] || a[2] !== b[2]; return [lerp(a[1], b[1], k), lerp(a[2], b[2], k) - (mv ? lift * Math.sin(Math.PI * k) : 0)]; }
    const L = K[K.length - 1]; return [L[1], L[2]];
  };

  const SC = {};

  /* ---- 1. a switchboard: one Claude Code jack, a patch cord, four provider jacks ---- */
  SC.switchboard = {
    dur: 12, still: 9.2,
    build(svg, api) {
      txt(svg, 44, 62, "What is Claude Code Router?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a provider", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("rect", { x: 40, y: 90, width: 720, height: 394, rx: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 133, "Claude Code Router :3456", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      [[64, 122], [736, 122]].forEach(([x, y]) => { el("circle", { cx: x, cy: y, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg); el("path", { d: `M${x - 4} ${y} H${x + 4}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg); });
      el("rect", { x: 62, y: 156, width: 676, height: 306, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const AX = 168, AY = 318, JX = 516, JY = [200, 270, 340, 410], REST = [330, 432];
      const NAMES = ["OpenRouter", "DeepSeek", "Moonshot", "Mistral"];
      const jack = (g, x, y) => { el("circle", { cx: x, cy: y, r: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, g); el("circle", { cx: x, cy: y, r: 7, fill: INK }, g); };
      txt(svg, AX, AY - 54, "Claude Code", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      el("circle", { cx: AX, cy: AY, r: 29, fill: "none", stroke: MINT, "stroke-width": 6 }, svg);
      jack(svg, AX, AY);
      let user = null, cur = REST.slice();
      const rings = JY.map((y, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: JX - 36, y: y - 32, width: 238, height: 64, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const r = el("circle", { cx: JX, cy: y, r: 29, fill: "none", stroke: MINT, "stroke-width": 6 }, g);
        jack(g, JX, y);
        txt(g, JX + 38, y + 9, NAMES[i], { "font-size": 26, "font-weight": 700 });
        button(g, `${NAMES[i]}: one of the hosted providers the README names`, () => { user = { from: cur.slice(), i, t0: api.now() }; api.poke(); });
        return r;
      });
      const cordO = el("path", { fill: "none", stroke: INK, "stroke-width": 12, "stroke-linecap": "round", "pointer-events": "none" }, svg);
      const cordI = el("path", { fill: "none", stroke: BLUE, "stroke-width": 6, "stroke-linecap": "round", "pointer-events": "none" }, svg);
      const dots = [0, 1, 2].map(() => el("circle", { r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5, "pointer-events": "none" }, svg));
      const plug = (x, y) => { const g = el("g", { "pointer-events": "none" }, svg); el("circle", { r: 15, fill: BLUE, stroke: INK, "stroke-width": 3 }, g); el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g); tf(g, x, y); return g; };
      plug(AX, AY);
      const pb = plug(...REST);
      const K = [[0, ...REST], [1, ...REST], [2, JX, JY[1]], [5.6, JX, JY[1]], [6.6, JX, JY[0]], [10.6, JX, JY[0]], [11.4, ...REST]];
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        let p, on = -1;
        if (user) {
          const k = io(cl((now - user.t0) / 0.6));
          p = [lerp(user.from[0], JX, k), lerp(user.from[1], JY[user.i], k) - 50 * Math.sin(Math.PI * k)];
          if (k >= 1) on = user.i;
        } else {
          p = kf(t, K, 60);
          if (t >= 2 && t < 5.6) on = 1; else if (t >= 6.6 && t < 10.6) on = 0;
        }
        cur = p;
        tf(pb, p[0], p[1]);
        const s = Math.max(28, Math.min(150, (452 - Math.max(AY, p[1])) / 0.75));
        const P = [[AX, AY], [AX + 60, AY + s], [p[0] - 60, p[1] + s], p];
        const d = `M${AX} ${AY} C${P[1][0]} ${P[1][1]} ${P[2][0]} ${P[2][1]} ${p[0]} ${p[1]}`;
        cordO.setAttribute("d", d); cordI.setAttribute("d", d);
        const bz = (u, j) => { const v = 1 - u; return v * v * v * P[0][j] + 3 * v * v * u * P[1][j] + 3 * v * u * u * P[2][j] + u * u * u * P[3][j]; };
        dots.forEach((c, k) => { const u = (((user ? now : t) * 0.42 + k / 3) % 1) * 0.86 + 0.07; c.setAttribute("cx", bz(u, 0)); c.setAttribute("cy", bz(u, 1)); c.setAttribute("opacity", on >= 0 ? 1 : 0); });
        rings.forEach((r, i) => r.setAttribute("opacity", i === on ? 1 : 0));
        cap.textContent = user ? (on >= 0 ? `${NAMES[on]}: one of the hosted providers the README names` : "CCR forwards each one to the provider you set up") : on === 1 ? "Claude Code sends its requests to CCR on your machine" : on === 0 ? "CCR forwards each one to the provider you set up" : "The README: “one stable local endpoint”";
      };
    },
  };

  /* ---- 2. a pinwheel keeps turning when one breeze stops and another starts from the other side ---- */
  SC.pinwheel = {
    dur: 12, still: 9.2,
    build(svg) {
      txt(svg, 44, 62, "How does Claude Code Router work?", { "font-size": 32, "font-weight": 700 });
      const CX = 400, CY = 262, R = 140, G = 480;
      el("path", { d: `M30 ${G} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${CX - 70} ${G} Q${CX} ${G - 34} ${CX + 70} ${G} Z`, fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: CX - 8, y: CY, width: 16, height: G - CY - 14, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const YS = [178, 232, 286, 340, 394];
      const breeze = (side, label, fill) => {
        const g = el("g", {}, svg), x0 = side < 0 ? 40 : 760, x1 = side < 0 ? 244 : 556;
        const lines = YS.map((y, k) => { const sh = k % 2 ? 40 : 0, a = side < 0 ? x0 + sh : x0 - sh; return el("path", { d: wave(a, x1, y, 7, 2), fill: "none", stroke: side < 0 ? BLUE : LIL, "stroke-width": 5, "stroke-linecap": "round", "stroke-dasharray": "44 22" }, g); });
        const leaves = [0, 1, 2].map((k) => { const n = el("path", { d: "M-10 0 Q0 -9 10 0 Q0 9 -10 0 Z", fill: k === 1 ? YEL : MINT, stroke: INK, "stroke-width": 2.5 }, g); return { n, k }; });
        const lab = el("g", { transform: `translate(${side < 0 ? 142 : 658} 128)` }, svg);
        pill(lab, label, fill, 26);
        return { g, lines, leaves, x0, x1, side, box: lab.firstChild, word: lab.lastChild, fill };
      };
      const B = [breeze(-1, "retry", SKY), breeze(1, "fall back", LIL)];
      const wheel = el("g", {}, svg), COL = [YEL, BLUE, MINT, LIL];
      for (let i = 0; i < 4; i++) {
        const b = el("g", { transform: `rotate(${i * 90})` }, wheel);
        el("path", { d: `M0 0 L0 ${-R} C${R * 0.48} ${-R * 0.94} ${R * 0.74} ${-R * 0.52} ${R * 0.64} ${-R * 0.1} Z`, fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, b);
        el("path", { d: `M0 0 L0 ${-R} L${R * 0.3} ${-R * 0.4} Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, b);
      }
      el("circle", { r: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, wheel);
      el("circle", { r: 4, fill: INK }, wheel);
      const b1 = (t) => seg(t, 0.2, 1) * (1 - seg(t, 4.4, 5.2)), b2 = (t) => seg(t, 5.8, 6.6) * (1 - seg(t, 11.2, 11.9));
      const w = (t) => 50 + 330 * Math.max(b1(t), b2(t));
      const AN = [0]; for (let i = 1; i <= 1200; i++) AN.push(AN[i - 1] + w((i - 0.5) / 100) / 100);
      const fit = (Math.round(AN[1200] / 90) * 90) / AN[1200];
      const cap = strip(svg, 508, 740);
      return (t) => {
        const i = Math.floor(cl(t, 0, 11.99) * 100), ang = (AN[i] + (AN[i + 1] - AN[i]) * (t * 100 - i)) * fit;
        tf(wheel, CX, CY, 1, ang);
        [b1(t), b2(t)].forEach((o, j) => {
          const b = B[j];
          const live = o > 0.5;
          b.box.setAttribute("fill", live ? b.fill : SOFT); b.box.setAttribute("stroke", live ? INK : LIL); b.word.setAttribute("fill", live ? INK : MUTE);
          b.lines.forEach((l, k) => { l.setAttribute("stroke-dashoffset", -((t * 120 * o + k * 17) % 66)); l.setAttribute("stroke", o > 0.05 ? (b.side < 0 ? BLUE : LIL) : LIL); l.setAttribute("opacity", o > 0.05 ? 0.4 + 0.6 * o : 0.4); });
          b.leaves.forEach((f) => { const u = (t * 0.55 + f.k / 3) % 1, x = lerp(b.x0, b.x1, u), y = YS[f.k * 2] - 26 + Math.sin(u * 9 + f.k) * 10; tf(f.n, x, y, 1, u * 400 * b.side); f.n.setAttribute("opacity", Math.sin(u * Math.PI) * o); });
        });
        cap.textContent = t >= 4.8 && t < 11.4 ? "Credential pools and key rotation keep requests running" : "Retry, then fall back to models in a set order";
      };
    },
  };

  /* ---- 3. a wind chime hangs from one bar; a breeze touches each provider tube in turn ---- */
  SC.chime = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "Which models and providers can it use?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 102, "tap a tube", { "font-size": 20, fill: MUTE, "font-weight": 500 });
      const X = [122, 233, 344, 456, 567, 678], L = [222, 158, 208, 144, 194, 130], BAR = 180, TOP = 214;
      const NAMES = ["OpenRouter", "DeepSeek", "SiliconFlow", "Moonshot", "Mistral", "Z.AI"], COL = [SKY, LIL, MINT, YEL, BLUE, SKY];
      const YB = [286, 336, 386];
      const bz = YB.map((y, k) => el("path", { d: wave(0, 220 - k * 30, y, 7, 2), fill: "none", stroke: LIL, "stroke-width": 5, "stroke-linecap": "round" }, svg));
      el("path", { d: `M96 142 L400 104 L704 142`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }, svg);
      el("circle", { cx: 400, cy: 96, r: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const strk = el("g", {}, svg);
      el("path", { d: "M0 0 V112", stroke: INK, "stroke-width": 2.5 }, strk);
      el("circle", { cy: 134, r: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, strk);
      let user = null;
      const tubes = X.map((x, i) => {
        const g = el("g", {}, svg), h = TOP - BAR;
        el("rect", { x: -64, y: h - 8, width: 128, height: L[i] + 64, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: `M0 0 V${h}`, stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -21, y: h, width: 42, height: L[i], rx: 10, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M-8 ${h + 16} V${h + L[i] - 16}`, stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round" }, g);
        const arcs = el("g", { transform: `translate(30 ${h + L[i] * 0.42})` }, g);
        [14, 28].forEach((r) => el("path", { d: `M${r * 0.5} ${-r * 0.87} A${r} ${r} 0 0 1 ${r * 0.5} ${r * 0.87}`, fill: "none", stroke: BLUE, "stroke-width": 4, "stroke-linecap": "round" }, arcs));
        txt(g, 0, h + L[i] + 36, NAMES[i], { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        button(g, `${NAMES[i]}: a hosted provider the README names`, () => { user = { i, t0: api.now() }; api.poke(); });
        return { g, arcs, x, deg: 57.3 / (h + L[i] + 36), a: 0.6 + ((x + 300) / 1400) * 5, b: 6.6 + ((800 - x + 300) / 1400) * 4.4 };
      });
      el("rect", { x: 70, y: 142, width: 660, height: 38, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 171, "CCR", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const cap = strip(svg, 508, 740);
      const sw = (s, A) => (s < 0 ? 0 : A * Math.exp(-1.2 * s) * Math.sin(6.2 * s));
      return (t, now) => {
        const hx = t < 6.4 ? lerp(-300, 1100, seg(t, 0.6, 5.6)) : lerp(1100, -300, seg(t, 6.6, 11));
        const dir = t < 6.4 ? 1 : -1;
        bz.forEach((p, k) => { const len = 220 - k * 30, x = dir > 0 ? hx - len : hx; p.setAttribute("transform", `translate(${x} ${Math.sin(t * 3 + k) * 4})`); p.setAttribute("opacity", t < 6.4 ? 1 - seg(t, 5.4, 5.6) : 1 - seg(t, 10.8, 11)); });
        let last = -1;
        tubes.forEach((u, i) => {
          const sA = t - u.a, sB = t - u.b, sU = user && user.i === i ? now - user.t0 : -1;
          const ang = (sw(sA, 24) + sw(sB, -18) + sw(sU, 26)) * u.deg;
          tf(u.g, u.x, BAR, 1, ang);
          const ring = Math.max(sA >= 0 && sA < 1 ? Math.sin((sA / 1) * Math.PI) : 0, sB >= 0 && sB < 1 ? Math.sin(sB * Math.PI) : 0, sU >= 0 && sU < 1 ? Math.sin(sU * Math.PI) : 0);
          u.arcs.setAttribute("opacity", ring);
          if (sA >= 0) last = i;
        });
        strk.setAttribute("transform", `translate(400 ${BAR}) rotate(${Math.sin(t * 2.4) * 3})`);
        cap.textContent = user ? `${NAMES[user.i]}: a hosted provider the README names` : t >= 6.4 && t < 11.4 ? "Or your own endpoint: custom compatible providers" : "Hosted providers, our selection from the README";
      };
    },
  };

  /* ---- 4. a paper boat passes a lock gate that opens part way; two tall flags stay on the bank ---- */
  SC.boat = {
    dur: 12.6, still: 10,
    build(svg) {
      txt(svg, 44, 62, "What are the trade offs?", { "font-size": 32, "font-weight": 700 });
      const WY = 400, GL = 316, GR = 496, LIFT = 112, PT = 196;
      const cloud = (x, y, s) => el("path", { d: "M-60 20 H60 A26 26 0 0 0 44 -22 A34 34 0 0 0 -16 -30 A30 30 0 0 0 -60 20 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", transform: `translate(${x} ${y}) scale(${s})` }, svg);
      const clouds = [cloud(640, 150, 1.1), cloud(150, 196, 0.85)];
      el("rect", { x: 30, y: 368, width: 740, height: 40, rx: 12, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 30, y: WY, width: 740, height: 86, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      const left = el("g", {}, svg);
      const boat = el("g", {}, svg);
      const FL = [[-80, 60, YEL, false], [-56, 120, BLUE, true], [56, 120, LIL, true], [80, 60, MINT, false]];
      const flag = (p, col) => { const g = el("g", {}, p); el("path", { d: "M0 0 V-62", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g); el("path", { d: "M0 -62 L34 -51 L0 -40 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g); return g; };
      const flags = FL.map(([x, h, col, tall]) => {
        const g = el("g", {}, boat);
        el("path", { d: `M0 0 V${-(h - 62)}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        flag(el("g", { transform: `translate(0 ${-(h - 62)})` }, g), col);
        g.setAttribute("transform", `translate(${x} -40)`);
        return { g, x, h, col, tall };
      });
      el("path", { d: "M-46 -40 L0 -100 L46 -40 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, boat);
      el("path", { d: "M-104 -42 H104 L72 0 H-72 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, boat);
      txt(boat, 0, -13, "Claude Code", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      [[110, 432], [250, 456], [660, 440], [520, 462]].forEach(([x, y]) => el("path", { d: wave(x, x + 70, y, 4, 2), fill: "none", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, svg));
      const panel = el("g", {}, svg);
      el("rect", { x: GL, y: PT, width: GR - GL, height: WY - PT + 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, panel);
      [1, 2, 3, 4].forEach((k) => el("path", { d: `M${GL + k * 36} ${PT + 14} V${WY - 6}`, stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, panel));
      [GL - 16, GR].forEach((x) => el("rect", { x, y: PT - 4, width: 16, height: 490 - PT, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: GL - 24, y: 84, width: GR - GL + 48, height: PT - 84, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, (GL + GR) / 2, 152, "gateway", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      const bx = (t) => (t < 3.8 ? lerp(104, 168, oc(seg(t, 0.4, 2.6))) : lerp(168, 640, io(seg(t, 3.8, 8.8))));
      const lift = (t) => io(seg(t, 2.6, 3.6)) - io(seg(t, 11.4, 12.3));
      const BANK = [176, 232];
      const drops = flags.filter((f) => f.tall).map((f, k) => {
        let tc = 99; for (let s = 3.8; s < 9; s += 0.005) if (bx(s) + f.x + 4 >= GL) { tc = s; break; }
        const g = el("g", {}, left), inner = el("g", {}, g);
        el("path", { d: `M0 0 V${-(f.h - 62)}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, inner);
        flag(el("g", { transform: `translate(0 ${-(f.h - 62)})` }, inner), f.col);
        return { f, tc, g, to: BANK[f.x > 0 ? 1 : 0] };
      });
      const cap = strip(svg, 508, 740);
      return (t) => {
        const out = seg(t, 11.6, 12.3), x = bx(t), y = WY + 3 * Math.sin(t * 2.2);
        tf(boat, x, y, 1, Math.sin(t * 1.7) * 1.5);
        boat.setAttribute("opacity", seg(t, 0, 0.4) * (1 - out));
        panel.setAttribute("transform", `translate(0 ${-LIFT * lift(t)})`);
        drops.forEach((d) => {
          const on = t >= d.tc;
          d.f.g.setAttribute("opacity", on ? 0 : 1);
          d.g.setAttribute("opacity", on ? 1 - out : 0);
          if (!on) return;
          const k = seg(t, d.tc, d.tc + 0.8), sx = lerp(GL - 6, d.to, oc(k)), sy = lerp(WY - 40, 386, k * k) - 50 * Math.sin(Math.PI * k);
          tf(d.g, sx, sy, 1, lerp(-40, d.f.x > 0 ? 6 : -6, oc(k)) + (k >= 1 ? Math.sin((t - d.tc) * 2) * 2 : 0));
        });
        clouds.forEach((c, i) => c.setAttribute("transform", `translate(${(i ? 150 : 640) + Math.sin(t * 0.5 + i * 2) * 14} ${i ? 196 : 150}) scale(${i ? 0.85 : 1.1})`));
        cap.textContent = t < 3.8 || t >= 12 ? "Claude Code gains capabilities with each release" : "“a gateway that doesn't forward them breaks the corresponding features”";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 104, "What it is, how it works and how to install it", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 206, "Claude Code", { "font-size": 82, "font-weight": 700 });
      txt(svg, 62, 298, "Router", { "font-size": 82, "font-weight": 700 });
      el("path", { d: "M68 326 H330", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 372, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 409, "Checked 14 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M560 470 C640 480 720 460 700 400 C684 350 616 372 636 418 C656 462 760 420 790 300", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 560, cy: 470, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const p = el("g", { transform: "translate(860 180) rotate(-24)" }, svg);
      el("path", { d: "M0 0 L-190 -56 L-118 18 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
      el("path", { d: "M0 0 L-118 18 L-150 70 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
      el("path", { d: "M-118 18 L-130 44 L-150 70", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
      el("path", { d: "M0 0 L-190 -56 L-150 70", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-opacity": 0 }, p);
      [[620, 150, 15, YEL], [890, 430, 18, MINT], [500, 380, 12, BLUE]].forEach(([x, y, r, col]) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, svg));
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
