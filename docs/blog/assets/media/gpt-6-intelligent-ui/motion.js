/* Bright coded scenes for "GPT-6 in ChatGPT". Vanilla JS, no library.
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
  /* a pill sized to its text, drawn around 0,0 */
  const pill = (p, s, fill, size = 22, h = 42) => {
    const g = el("g", {}, p), r = el("rect", { y: -h / 2, height: h, rx: h / 2, fill, stroke: INK, "stroke-width": 3 }, g), t = txt(g, 0, size * 0.34, s, { "text-anchor": "middle", "font-size": size, "font-weight": 700 });
    const w = t.getComputedTextLength() + 36; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return g;
  };
  const show = (n, k) => n.setAttribute("opacity", k <= 0.01 ? 0 : 1);

  const SC = {};

  /* ---- 1. six doors in a row: four open on 7 Oct, two more on 8 Oct ---- */
  SC.doors = {
    dur: 11.6, still: 8.6,
    build(svg, api) {
      txt(svg, 44, 62, "Who gets GPT-6, and when", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a door", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const X = [100, 220, 340, 460, 580, 700], TOP = 200, H = 232, FLOOR = TOP + H, DW = 96;
      const T = [
        ["Plus", "Plus: rollout starts 7 Oct 2026, powered by GPT-6 Sol", BLUE],
        ["Pro", "Pro: rollout starts 7 Oct 2026, powered by GPT-6 Sol", SKY],
        ["Business", "Business: rollout starts 7 Oct 2026, powered by GPT-6 Sol", BLUE],
        ["Enterprise", "Enterprise: 7 Oct 2026, depending on workplace admin settings", SKY],
        ["Go", "Go: rollout starts 8 Oct 2026, powered by GPT-6 Luna", MINT],
        ["Free", "Free: rollout starts 8 Oct 2026, powered by GPT-6 Luna", MINT],
      ];
      const OPEN = [1.3, 1.8, 2.3, 2.8, 5.6, 6.1];
      const head = (cx, x0, x1, date, model, fill) => {
        const g = el("g", {}, svg);
        const p = pill(g, date, fill, 22, 42); tf(p, cx, 114);
        txt(g, cx, 168, model, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        el("path", { d: `M${x0} 190 V182 H${x1} V190`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return g;
      };
      const h1 = head(280, 52, 508, "7 Oct 2026", "GPT-6 Sol", YEL), h2 = head(640, 532, 748, "8 Oct 2026", "GPT-6 Luna", LIL);
      el("path", { d: `M30 ${FLOOR + 1.5} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      let pinned = -1;
      const doors = T.map(([name, line, col], i) => {
        const x = X[i], g = el("g", {}, svg), sol = i < 4;
        el("rect", { x: x - DW / 2 - 8, y: TOP - 8, width: DW + 16, height: H + 54, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("rect", { x: x - DW / 2, y: TOP, width: DW, height: H, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", { transform: `translate(${x + 13} ${TOP + 96})` }, g);
        if (sol) {
          for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.2832; el("path", { d: `M${Math.cos(a) * 24} ${Math.sin(a) * 24} L${Math.cos(a) * 31} ${Math.sin(a) * 31}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, ic); }
          el("circle", { r: 17, fill: YEL, stroke: INK, "stroke-width": 3 }, ic);
        } else el("path", { d: "M6 -21 A22 22 0 1 0 6 21 A25.8 25.8 0 0 1 6 -21 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ic);
        txt(g, x + 13, TOP + 166, sol ? "Sol" : "Luna", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        const leaf = el("g", {}, g), ne = { "vector-effect": "non-scaling-stroke" };
        el("rect", Object.assign({ width: DW, height: H, fill: col, stroke: INK, "stroke-width": 3 }, ne), leaf);
        el("rect", Object.assign({ x: 14, y: 16, width: DW - 28, height: 88, rx: 6, fill: "none", stroke: INK, "stroke-width": 2 }, ne), leaf);
        el("rect", Object.assign({ x: 14, y: 128, width: DW - 28, height: 88, rx: 6, fill: "none", stroke: INK, "stroke-width": 2 }, ne), leaf);
        el("circle", Object.assign({ cx: DW - 13, cy: 116, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, ne), leaf);
        txt(g, x, FLOOR + 36, name, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        button(g, line, () => { pinned = i; api.poke(); });
        return { leaf, x };
      });
      const cap = strip(svg, 514, 720);
      return (t) => {
        const out = io(seg(t, 10.6, 11.2));
        const a = ob(seg(t, 0.4, 0.9)), b = ob(seg(t, 4.6, 5.1));
        h1.setAttribute("transform", `translate(0 ${10 * (1 - cl(a))})`); h1.setAttribute("opacity", cl(a * 2) * (1 - out));
        h2.setAttribute("transform", `translate(0 ${10 * (1 - cl(b))})`); h2.setAttribute("opacity", cl(b * 2) * (1 - out));
        doors.forEach((d, i) => {
          const k = cl(ob(seg(t, OPEN[i], OPEN[i] + 0.55)), 0, 1.06) * (1 - out);
          d.leaf.setAttribute("transform", `translate(${d.x - DW / 2} ${TOP}) scale(${1 - 0.76 * k} 1)`);
        });
        cap.textContent = pinned >= 0 ? T[pinned][1] : t < 1.2 || t >= 10.6 ? "Rollout start dates, by OpenAI's schedule" : t < 5.4 ? "7 Oct 2026: Plus, Pro, Business and Enterprise" : "8 Oct 2026: Go and Free, by OpenAI's schedule";
      };
    },
  };

  /* ---- 2. toy blocks leave a box one at a time and stack into an answer card ---- */
  SC.blocks = {
    dur: 11.6, still: 9,
    build(svg, api) {
      txt(svg, 44, 62, "An answer built block by block", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap the box", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const CX = 410, CY = 112, CW = 340, CH = 352, SX = CX + CW / 2, SY = [193, 267, 341, 415], BX = 190;
      el("rect", { x: CX + 10, y: CY + 10, width: CW, height: CH, rx: 26, fill: YEL }, svg);
      el("rect", { x: CX, y: CY, width: CW, height: CH, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, CX + 24, CY + 36, "answer", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const dots = [0, 1, 2].map((i) => el("circle", { cx: CX + CW - 66 + i * 18, cy: CY + 29, r: 5, fill: INK }, svg));
      const done = el("g", {}, svg);
      el("circle", { r: 15, fill: MINT, stroke: INK, "stroke-width": 3 }, done);
      el("path", { d: "M-7 0 L-2 5 L7 -5", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, done);
      SY.forEach((y) => el("rect", { x: SX - 150, y: y - 31, width: 300, height: 62, rx: 14, fill: SOFT, stroke: LIL, "stroke-width": 2, "stroke-dasharray": "4 7", "stroke-linecap": "round" }, svg));
      /* box, back part */
      el("path", { d: `M${BX - 110} 330 L${BX - 150} 286 M${BX + 110} 330 L${BX + 150} 286`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${BX - 110} 330 L${BX - 150} 286 L${BX - 96} 286 L${BX - 70} 330 Z M${BX + 110} 330 L${BX + 150} 286 L${BX + 96} 286 L${BX + 70} 330 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const ART = [
        (g) => el("path", { d: "M-128 -12 H-82 M-128 0 H-82 M-128 12 H-102", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g),
        (g) => [[-128, 14], [-111, 26], [-94, 38]].forEach(([x, h]) => el("rect", { x, y: 18 - h, width: 12, height: h, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g)),
        (g) => { el("rect", { x: -130, y: -15, width: 52, height: 30, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); el("path", { d: "M-120 -6 V6", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); },
        (g) => { el("rect", { x: -132, y: -15, width: 56, height: 30, rx: 15, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); el("circle", { cx: -104, cy: 0, r: 5, fill: INK }, g); },
      ];
      const NAME = ["text", "chart", "form", "button"], COL = [SKY, YEL, LIL, MINT], T0 = (i) => 0.9 + i * 1.7;
      const blocks = NAME.map((s, i) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("rect", { x: -150, y: -31, width: 300, height: 62, rx: 14, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        ART[i](g);
        txt(g, -50, 9, s, { "font-size": 26, "font-weight": 700 });
        return g;
      });
      /* box, front part */
      const box = el("g", {}, svg);
      el("rect", { x: BX - 118, y: 322, width: 236, height: 136, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, box);
      el("rect", { x: BX - 110, y: 330, width: 220, height: 120, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      txt(box, BX, 399, "Intelligent UI", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      button(box, "Replay: the blocks leave the box one at a time", () => api.seek(0.5));
      const cap = strip(svg, 506, 720);
      return (t) => {
        const out = seg(t, 10.7, 11.2), END = T0(3) + 1.5;
        blocks.forEach((g, i) => {
          const a = T0(i), up = oc(seg(t, a, a + 0.5)), fly = io(seg(t, a + 0.55, a + 1.35)), land = Math.sin(seg(t, a + 1.35, a + 1.65) * Math.PI);
          const x = BX + (SX - BX) * fly, y = 372 - 150 * up + (SY[i] - 222) * fly - 46 * Math.sin(Math.PI * fly) + (up >= 1 && fly <= 0 ? Math.sin(t * 9) * 3 : 0);
          const s = (0.62 + 0.06 * up + 0.32 * fly) * (1 + 0.05 * land);
          tf(g, x, y, s, (1 - fly) * (i % 2 ? 5 : -5) * up);
          g.setAttribute("opacity", (t < a ? 0 : 1) * (1 - out));
        });
        const busy = t > 0.6 && t < END;
        dots.forEach((d, i) => d.setAttribute("opacity", busy ? 0.25 + 0.75 * cl(Math.sin(t * 6 - i * 1.1)) : 0));
        const k = ob(seg(t, END, END + 0.4)) * (1 - out);
        tf(done, CX + CW - 40, CY + 29, cl(k, 0, 1.3)); show(done, k);
        cap.textContent = t >= END && t < 10.7 ? "OpenAI says the interface appears progressively" : "Responses can include graphics, tappable buttons, forms, charts";
      };
    },
  };

  /* ---- 3. two drinks dispensers: one opens its tap while it is still being filled ---- */
  SC.taps = {
    dur: 11.6, still: 9.3,
    build(svg) {
      txt(svg, 44, 62, "Answering while still thinking", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "OpenAI's own figure, on questions that need web search", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const F0 = 1, F1 = 6, FILL = 2.6;
      el("rect", { x: 130, y: 122, width: 540, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const mk = (x, name, openAt, id) => {
        const cp = el("clipPath", { id }, svg); el("rect", { x: x - 80, y: 166, width: 160, height: 164, rx: 18 }, cp);
        const inflow = el("rect", { x: x - 59, y: 152, width: 10, height: 0, fill: LIL }, svg);
        el("rect", { x: x - 67, y: 136, width: 26, height: 18, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        const level = el("rect", { x: x - 80, y: 330, width: 160, height: 0, fill: LIL, "clip-path": `url(#${id})` }, svg);
        el("rect", { x: x - 80, y: 166, width: 160, height: 164, rx: 18, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, x + 14, 206, "thinking", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        const stream = el("rect", { x: x - 4, y: 348, width: 8, height: 0, fill: SKY }, svg);
        const water = el("path", { fill: SKY }, svg);
        el("path", { d: `M${x - 42} 376 L${x - 33} 458 H${x + 33} L${x + 42} 376`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
        el("rect", { x: x - 11, y: 330, width: 22, height: 20, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
        const handle = el("g", {}, svg);
        el("rect", { x: 0, y: -5, width: 30, height: 10, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, handle);
        txt(svg, x + 58, 428, "answer", { "font-size": 20, "font-weight": 500, fill: MUTE });
        txt(svg, x, 496, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        return (t, out) => {
          const lv = seg(t, F0, F1) * (1 - out), h = 150 * lv;
          level.setAttribute("y", 330 - h); level.setAttribute("height", h);
          const filling = t > F0 - 0.25 && t < F1 ? 1 : 0;
          inflow.setAttribute("height", filling ? Math.min((t - F0 + 0.25) * 700, 178 - h) : 0);
          const g = seg(t, openAt, openAt + FILL) * (1 - out), top = 455 - 68 * g, hw = 33 + 9 * ((458 - top) / 82);
          water.setAttribute("d", g <= 0 ? "" : `M${x - 33} 456.5 H${x + 33} L${x + hw} ${top} H${x - hw} Z`);
          const pour = t >= openAt && t < openAt + FILL + 0.1 ? 1 : 0;
          stream.setAttribute("height", pour ? Math.min((t - openAt) * 700, top - 348) : 0);
          const hk = io(seg(t, openAt - 0.25, openAt + 0.05)) * (1 - seg(t, openAt + FILL, openAt + FILL + 0.3));
          handle.setAttribute("transform", `translate(${x + 11} 340) rotate(${-70 * hk})`);
        };
      };
      const a = mk(210, "GPT-5.6 Instant", F1, "mg-g6-tank-a");
      const b = mk(590, "GPT-6 Instant", F0 + (F1 - F0) * 0.56, "mg-g6-tank-b");
      const tag = el("g", {}, svg), p = pill(tag, "44% sooner", MINT, 24, 46); tf(p, 0, 0);
      txt(tag, 0, 48, "on average", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      const cap = strip(svg, 520, 720);
      return (t) => {
        const out = seg(t, 10.7, 11.2);
        a(t, out); b(t, out);
        const k = ob(seg(t, 4.1, 4.5)) * (1 - out);
        tf(tag, 400, 250, cl(k, 0, 1.3)); show(tag, k);
        cap.textContent = t < 3.8 || t >= 10.7 ? "OpenAI: ChatGPT can interleave thinking with answering" : "GPT-6 Instant starts answering 44% sooner, on average";
      };
    },
  };

  /* ---- 4. three toy railway tracks; only the Chat lever moves ---- */
  SC.switch = {
    dur: 11.6, still: 8,
    build(svg, api) {
      txt(svg, 44, 62, "The Chat track changes", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a lever", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const ROW = [["Chat", 196], ["Work", 318], ["Codex", 440]], LX = 196, MID = 500;
      const car = (fill, label) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("path", { d: "M-96 -30 H-80 M80 -30 H96", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
        el("rect", { x: -80, y: -78, width: 160, height: 58, rx: 12, fill, stroke: INK, "stroke-width": 3 }, g);
        if (label) txt(g, 0, -40, label, { "text-anchor": "middle", "font-size": label.length > 6 ? 21 : 26, "font-weight": 700 });
        const wh = [-48, 48].map((x) => { const w = el("g", {}, g); el("circle", { r: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, w); el("path", { d: "M-7 0 H7 M0 -7 V7", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, w); return { w, x }; });
        return (x, y, o) => { tf(g, x, y); g.setAttribute("opacity", o); wh.forEach((k) => tf(k.w, k.x, -12, 1, (x / 12) * 57.3)); };
      };
      const poked = [-99, -99, -99], levers = [];
      ROW.forEach(([name, y], i) => {
        txt(svg, 44, y - 14, name, { "font-size": 28, "font-weight": 700 });
        for (let x = 250; x < 770; x += 52) el("rect", { x, y: y + 7, width: 18, height: 9, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
        el("rect", { x: 232, y, width: 538, height: 9, rx: 4.5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
        const g = el("g", { transform: `translate(${LX} ${y + 4})` }, svg);
        el("rect", { x: -36, y: -86, width: 72, height: 104, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const arm = el("g", {}, g);
        el("path", { d: "M0 0 V-58", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, arm);
        const knob = el("circle", { cy: -62, r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, arm);
        el("rect", { x: -24, y: -8, width: 48, height: 20, rx: 8, fill: i ? SOFT : YEL, stroke: INK, "stroke-width": 3 }, g);
        button(g, i ? `${name} lever. It stays put: the models powering ${name} are not changing as part of this release.` : "Chat lever. Replay the change: GPT-6 rolls onto the Chat track.", () => { if (i) { poked[i] = api.now(); api.poke(); } else api.seek(1.5); });
        levers.push({ arm, knob });
      });
      const old = car("#fff", ""), neu = car(YEL, "GPT-6"), work = car(SKY, "same models"), codex = car(LIL, "same models");
      const cap = strip(svg, 506, 720);
      return (t, now) => {
        const out = io(seg(t, 10.6, 11.2)), sw = io(seg(t, 1.8, 2.4)) * (1 - out);
        let msg = "";
        levers.forEach((l, i) => {
          const w = now - poked[i], jig = i && w >= 0 && w < 0.8 ? Math.sin(w * 28) * 7 * (1 - w / 0.8) : 0;
          if (i && w >= 0 && w < 3.5) msg = `${ROW[i][0]}: not changing as part of this release`;
          l.arm.setAttribute("transform", `rotate(${-28 + (i ? 0 : 56 * sw) + jig})`);
          l.knob.setAttribute("fill", !i && sw > 0.5 ? MINT : "#fff");
        });
        const sway = (ph) => Math.sin(now * 0.9 + ph) * 62;
        const ox = MID + sway(0) + 330 * io(seg(t, 2.4, 3.5));
        old((1 - out) * ox + out * (MID + sway(0)), ROW[0][1], t < 10.6 ? 1 - seg(ox, 640, 730) : out);
        const arrive = oc(seg(t, 3.1, 4.5)), nx = MID - 250 * (1 - arrive) + sway(0) * seg(t, 4.5, 5.5);
        neu(nx, ROW[0][1], seg(nx, 280, 340) * (1 - seg(t, 10.6, 10.9)));
        work(MID + 30 + sway(2.1), ROW[1][1], 1);
        codex(MID - 20 + sway(4.4), ROW[2][1], 1);
        cap.textContent = msg || (t < 2.4 || t >= 10.6 ? "This update applies to the Chat experience in ChatGPT" : "The models powering Work and Codex are not changing");
      };
    },
  };

  /* ---- title card, 16 by 9: a paper pinwheel ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 112, "LAUNCH EXPLAINER", { "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE, "letter-spacing": 2 });
      txt(svg, 64, 208, "GPT-6 in ChatGPT", { "font-size": 78, "font-weight": 700 });
      el("path", { d: "M66 240 H560", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 304, "Checked 8 Oct 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const PX = 790, PY = 340, R = 112;
      el("path", { d: `M${PX} ${PY} V500`, stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, svg);
      el("path", { d: "M660 502 H920", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const wheel = el("g", {}, svg);
      [YEL, BLUE, MINT, LIL].forEach((c, i) => {
        const g = el("g", { transform: `rotate(${i * 90})` }, wheel);
        el("path", { d: `M0 0 L${R / 2} ${-R / 2} L${R / 2} 0 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: `M0 0 L0 ${-R} L${R / 2} ${-R / 2} Z`, fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      });
      el("circle", { r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, wheel);
      [[92, 420, SKY], [150, 452, YEL], [214, 418, LIL], [278, 452, MINT], [342, 420, BLUE]].forEach(([x, y, c], i) => el("rect", { x: -11, y: -11, width: 22, height: 22, rx: 5, fill: c, stroke: INK, "stroke-width": 3, transform: `translate(${x} ${y}) rotate(${i * 17 - 20})` }, svg));
      return (t, now) => tf(wheel, PX, PY, 1, 14 + now * 40);
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
