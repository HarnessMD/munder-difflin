/* Bright coded scenes for "OpenCode vs Claude Code". Vanilla JS, no library.
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

  /* a pill that sizes itself to its words, drawn around 0,0 */
  const pill = (p, s, fill, size = 22) => {
    const g = el("g", {}, p), r = el("rect", { y: -23, height: 46, rx: 23, fill, stroke: INK, "stroke-width": 3 }, g);
    const t = txt(g, 0, size * 0.35, s, { "text-anchor": "middle", "font-size": size, "font-weight": 700 });
    const set = (v) => { t.textContent = v; const w = t.getComputedTextLength() + 40; r.setAttribute("x", -w / 2); r.setAttribute("width", w); };
    set(s);
    return { g, r, set };
  };
  const show = (n, k) => n.setAttribute("opacity", k <= 0.01 ? 0 : 1);

  const SC = {};

  /* ---- 1. two parcels: one lid lifts and a tag pops out, the other is taped shut ---- */
  SC.lids = {
    dur: 10, still: 7,
    build(svg, api) {
      txt(svg, 44, 62, "Which one is open source?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a parcel", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const G = 448, BW = 250, BH = 170, LW = 280, LH = 40, LX = 220, RX = 580;
      el("rect", { x: 40, y: G, width: 720, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const mk = (x, name, col, lidCol) => {
        const g = el("g", { transform: `translate(${x} ${G})` }, svg), back = el("g", {}, g), box = el("g", {}, g);
        el("rect", { x: -BW / 2, y: -BH, width: BW, height: BH, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, box);
        txt(box, 0, -BH / 2 + 26, name, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        const over = el("g", {}, g), lid = el("g", {}, g);
        el("rect", { x: -LW / 2, y: -LH, width: LW, height: LH, rx: 12, fill: lidCol, stroke: INK, "stroke-width": 3 }, lid);
        el("rect", { x: -LW / 2 - 8, y: -BH - LH - 8, width: LW + 16, height: BH + LH + 16, rx: 22, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        return { g, back, box, lid, over };
      };
      const A = mk(LX, "OpenCode", YEL, MINT), B = mk(RX, "Claude Code", LIL, LIL);
      const mit = el("g", {}, A.back);
      el("path", { d: "M0 -4 V70", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, mit);
      el("rect", { x: -70, y: -62, width: 140, height: 62, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, mit);
      el("circle", { cx: -44, cy: -31, r: 7, fill: SOFT, stroke: INK, "stroke-width": 3 }, mit);
      txt(mit, 14, -19, "MIT", { "text-anchor": "middle", "font-family": MONO, "font-size": 34, "font-weight": 700 });
      const band = el("rect", { x: -LW / 2 - 5, y: -BH - 31, height: 22, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, B.g);
      const strap = el("rect", { x: -19, y: -BH - LH - 5, width: 38, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, B.g);
      const arr = el("g", {}, B.g);
      el("rect", { x: -138, y: -29, width: 276, height: 58, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, arr);
      txt(arr, 0, 8, "All rights reserved", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const LINES = ["OpenCode is MIT licensed, so the lid comes off", "Claude Code's licence file: “All rights reserved”"];
      let pinned = -1, poked = -99;
      [A, B].forEach((p, i) => button(p.g, LINES[i], () => { pinned = i; poked = api.now(); api.poke(); }));
      const cap = strip(svg, 506, 640);
      return (t, now) => {
        const out = io(seg(t, 9, 9.7)), w = now - poked, live = w >= 0 && w < 0.8 ? Math.sin((w / 0.8) * Math.PI) : 0;
        const open = ob(seg(t, 1, 1.8)) - out, hop = pinned === 0 ? live : 0, shake = pinned === 1 && live ? Math.sin(w * 32) * 3 * live : 0;
        A.lid.setAttribute("transform", `translate(0 ${-BH - 120 * open - 16 * hop}) rotate(${-5 * cl(open) - 4 * hop})`);
        const up = ob(seg(t, 1.7, 2.3)) - out;
        mit.setAttribute("transform", `translate(0 ${-BH + 74 - 104 * up}) rotate(${Math.sin(now * 1.6) * 2 * cl(up)})`);
        B.g.setAttribute("transform", `translate(${RX} ${G}) rotate(${shake})`);
        B.lid.setAttribute("transform", `translate(0 ${-BH})`);
        const k1 = oc(seg(t, 3.4, 4.2)) * (1 - out), k2 = oc(seg(t, 4.1, 4.6)) * (1 - out);
        band.setAttribute("width", Math.max(0.1, (LW + 10) * k1)); show(band, k1);
        strap.setAttribute("height", Math.max(0.1, 96 * k2)); show(strap, k2);
        const d = seg(t, 4.9, 5.3), bounce = Math.sin(seg(t, 5.3, 5.7) * Math.PI) * -10;
        arr.setAttribute("transform", `translate(0 ${-BH - LH - 34 - 170 * (1 - d * d) + bounce}) rotate(${-3 + 8 * (1 - d)})`);
        arr.setAttribute("opacity", seg(t, 4.9, 5.05) * (1 - seg(t, 9, 9.4)));
        cap.textContent = pinned >= 0 ? LINES[pinned] : t >= 1 && t < 3.4 ? "OpenCode is MIT licensed" : t >= 3.4 && t < 6.6 ? LINES[1] : "Both checked on GitHub, 6 Oct 2026";
      };
    },
  };

  /* ---- 2. four jars, one coin for every $10 a month ---- */
  SC.jars = {
    dur: 11.4, still: 8.8,
    build(svg, api) {
      txt(svg, 44, 62, "What it costs a month to start", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a jar", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const G = 436, JW = 124, JH = 250, CW = 90, CH = 21, X = (i) => 130 + i * 180;
      const IT = [
        ["OpenCode", "free models", 0, "Free", "OpenCode's Zen price list marked 12 models as Free"],
        ["OpenCode", "Go", 1, "$10", "OpenCode Go was $10 a month"],
        ["Claude", "Pro", 2, "$20", "Claude Pro: $20 billed monthly"],
        ["Claude", "Max", 10, "from $100", "Claude Max: from $100 a month"],
      ];
      el("path", { d: `M30 ${G + 2} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const key = el("g", { transform: "translate(44 92)" }, svg);
      el("rect", { x: 0, y: -9, width: 46, height: 18, rx: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, key);
      txt(key, 58, 7, "one coin is $10", { "font-size": 20, "font-weight": 500, fill: MUTE });
      let pinned = -1, tcur = 0.8;
      const jars = IT.map(([n1, n2, n, price, line], i) => {
        const x = X(i), g = el("g", {}, svg);
        el("rect", { x: x - JW / 2 - 14, y: G - JH - 62, width: JW + 28, height: JH + 132, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("rect", { x: x - JW / 2, y: G - JH, width: JW, height: JH, rx: 24, fill: SKY, "fill-opacity": 0.22 }, g);
        const start = tcur;
        const cs = Array.from({ length: n }, (_, j) => { const c = el("rect", { x: -CW / 2, y: -CH, width: CW, height: CH, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, g); return { c, y: G - 8 - j * CH, d: start + j * (n > 4 ? 0.16 : 0.3) }; });
        const done = n ? cs[n - 1].d + 0.45 : start + 0.5; tcur = done + 0.35;
        el("rect", { x: x - JW / 2, y: G - JH, width: JW, height: JH, rx: 24, fill: "none", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${x - JW / 2 + 15} ${G - JH + 34} V${G - 44}`, stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round" }, g);
        el("rect", { x: x - 52, y: G - JH - 14, width: 104, height: 20, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const lab = txt(g, x, G - JH - 30, price, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        txt(g, x, G + 36, n1, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        txt(g, x, G + 62, n2, { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        button(g, line, () => { pinned = i; api.poke(); });
        return { x, cs, lab, done, ly: G - JH - 30 };
      });
      const END = tcur + 0.2, cap = strip(svg, 516, 640);
      return (t) => {
        const out = seg(t, 10.6, 11.2);
        let last = -1;
        jars.forEach((s, i) => {
          s.cs.forEach((c) => { const q = seg(t, c.d, c.d + 0.36), b = Math.sin(seg(t, c.d + 0.36, c.d + 0.62) * Math.PI) * -4; tf(c.c, s.x, c.y - (c.y - 172) * (1 - q * q) + b); c.c.setAttribute("opacity", seg(t, c.d, c.d + 0.06) * (1 - out)); });
          const p = ob(seg(t, s.done - 0.15, s.done + 0.25));
          s.lab.setAttribute("transform", `translate(${s.x} ${s.ly}) scale(${cl(p, 0, 1.3)}) translate(${-s.x} ${-s.ly})`);
          s.lab.setAttribute("opacity", (p <= 0.01 ? 0 : 1) * (1 - out));
          if (t >= s.done - 0.15) last = i;
        });
        cap.textContent = pinned >= 0 ? IT[pinned][4] : t >= END && t < 10.6 ? "Free software is not a free model" : last < 0 || t >= 10.6 ? "Monthly prices to start, 6 Oct 2026" : IT[last][4];
      };
    },
  };

  /* ---- 3. a power strip that takes every shape of plug, next to a wall socket that takes one ---- */
  SC.sockets = {
    dur: 11, still: 8.6,
    build(svg) {
      txt(svg, 44, 62, "Which models plug in?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Each plug is a model provider", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const G = 420, SY = G - 62, WX = 598, WY = 310, LX = 722;
      el("rect", { x: 40, y: G, width: 720, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const hole = (x, y) => { el("circle", { cx: x, cy: y, r: 26, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg); el("path", { d: `M${x - 9} ${y - 8} V${y + 8} M${x + 9} ${y - 8} V${y + 8}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg); };
      const led = (x, y) => el("circle", { cx: x, cy: y, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 50, y: G - 108, width: 446, height: 108, rx: 28, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const R = 29, hex = Array.from({ length: 6 }, (_, i) => `${(Math.cos(i * 1.0472) * R * 1.1).toFixed(1)} ${(Math.sin(i * 1.0472) * R * 1.1).toFixed(1)}`).join(" L");
      const HEAD = [
        `M${-R} 0 a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0 Z`,
        `M${-R + 8} ${-R} H${R - 8} a8 8 0 0 1 8 8 V${R - 8} a8 8 0 0 1 -8 8 H${-R + 8} a8 8 0 0 1 -8 -8 V${-R + 8} a8 8 0 0 1 8 -8 Z`,
        `M${hex} Z`,
        `M-9 ${-R} H9 a${R} ${R} 0 0 1 0 ${2 * R} H-9 a${R} ${R} 0 0 1 0 ${-2 * R} Z`,
        `M${-R} ${R} V${-R * 0.2} a${R} ${R} 0 0 1 ${2 * R} 0 V${R} Z`,
      ];
      const COL = [YEL, BLUE, LIL, SKY, MINT];
      const slots = HEAD.map((d, i) => {
        const x = 102 + i * 85.5; hole(x, SY - 6); const l = led(x, G - 17);
        return { x, l, d, land: 1.2 + i * 0.85 };
      });
      el("rect", { x: WX - 62, y: WY - 52, width: 124, height: 122, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      hole(WX, WY); const wl = led(WX, WY + 48);
      const cord = el("path", { stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, svg);
      const rays = el("path", { d: `M${LX} 184 V166 M${LX - 40} 196 L${LX - 50} 182 M${LX + 38} 196 L${LX + 48} 182`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${LX} ${G - 14} V270`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("rect", { x: LX - 34, y: G - 16, width: 68, height: 16, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const shade = el("path", { d: `M${LX - 44} 272 L${LX - 26} 206 H${LX + 26} L${LX + 44} 272 Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      slots.forEach((s, i) => {
        const g = el("g", {}, svg);
        const b = i % 2 ? -18 : 18, h = 92 + ((i * 2) % 5) * 9; el("path", { d: `M0 -22 C0 ${-h * 0.6} ${b} ${-h * 0.5} ${b} ${-h}`, stroke: INK, "stroke-width": 7, "stroke-linecap": "round", fill: "none" }, g);
        el("path", { d: s.d, fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        s.g = g;
      });
      const cp = el("g", {}, svg);
      el("rect", { x: -50, y: -31, width: 100, height: 62, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, cp);
      txt(cp, 0, 8, "Claude", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(svg, 273, G + 62, "OpenCode", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      txt(svg, 660, G + 62, "Claude Code", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const p1 = pill(svg, "75+ providers, local models included", MINT), p2 = pill(svg, "Claude models", YEL);
      const CT = 6.3;
      return (t) => {
        const out = seg(t, 10.2, 10.8);
        slots.forEach((s) => {
          const q = seg(t, s.land - 0.45, s.land), sn = Math.sin(seg(t, s.land, s.land + 0.3) * Math.PI);
          tf(s.g, s.x, SY - 6 - 100 * (1 - q * q), 1 + 0.1 * sn);
          s.g.setAttribute("opacity", seg(t, s.land - 0.45, s.land - 0.3) * (1 - out));
          s.l.setAttribute("fill", t >= s.land && t < 10.2 ? MINT : "#fff");
        });
        const q = seg(t, CT - 0.5, CT), py = WY - 170 * (1 - q * q) * (1 - out) - 170 * out, on = t >= CT && t < 10.2;
        tf(cp, WX, py, 1 + 0.08 * Math.sin(seg(t, CT, CT + 0.3) * Math.PI));
        cp.setAttribute("opacity", seg(t, CT - 0.5, CT - 0.35) * (1 - out));
        cord.setAttribute("d", `M${LX - 34} ${G - 8} C${LX - 80} ${G - 8} ${WX + 110} ${py} ${WX + 50} ${py}`);
        cord.setAttribute("opacity", seg(t, CT - 0.5, CT - 0.35) * (1 - out));
        wl.setAttribute("fill", on ? MINT : "#fff");
        shade.setAttribute("fill", on ? YEL : "#fff"); rays.setAttribute("opacity", on ? ob(seg(t, CT, CT + 0.3)) : 0);
        const a = ob(seg(t, 5.2, 5.6)) * (1 - out), b = ob(seg(t, CT + 0.5, CT + 0.9)) * (1 - out);
        tf(p1.g, 273, G + 108, cl(a, 0, 1.2)); show(p1.g, a);
        tf(p2.g, 660, G + 108, cl(b, 0, 1.2)); show(p2.g, b);
      };
    },
  };

  /* ---- 4. three keys take turns at one padlock ---- */
  SC.keys = {
    dur: 10.4, still: 8.1,
    build(svg, api) {
      txt(svg, 44, 62, "Which login opens OpenCode?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a key", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const KX = 640, KY = 318, TOP = 262, P = 3;
      const K = [
        ["API key", YEL, 1, "An Anthropic API key works: “Manually enter API Key”"],
        ["ChatGPT Plus", SKY, 1, "A ChatGPT Plus or Pro account can log in"],
        ["Claude Pro and Max", LIL, 0, "Claude Pro and Max: “Anthropic explicitly prohibits this”"],
      ];
      const shackle = el("path", { stroke: INK, "stroke-width": 16, fill: "none", "stroke-linecap": "round" }, svg);
      const body = el("rect", { x: KX - 84, y: TOP, width: 168, height: 142, rx: 22, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: KX, cy: KY - 4, r: 15, fill: INK }, svg);
      el("path", { d: `M${KX} ${KY} V${KY + 26}`, stroke: INK, "stroke-width": 11, "stroke-linecap": "round" }, svg);
      txt(svg, KX, TOP + 124, "OpenCode", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const res = pill(svg, "does not fit", "#fff");
      let user = null;
      const keys = K.map(([name, col, ok, line], i) => {
        const y = 176 + i * 112, g = el("g", {}, svg);
        el("rect", { x: 34, y: y - 38, width: 432, height: 76, rx: 24, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("rect", { x: 40, y: y - 30, width: 284, height: 60, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 100, y + 8, name, { "font-size": 22, "font-weight": 700 });
        const m = el("g", {}, g);
        el("circle", { r: 16, fill: ok ? MINT : "#fff", stroke: INK, "stroke-width": 3 }, m);
        el("path", { d: ok ? "M-7 0 L-2 6 L8 -6" : "M-6 -6 L6 6 M6 -6 L-6 6", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, m);
        const k = el("g", { "pointer-events": "none" }, svg);
        el("path", { d: "M-72 0 H-4 M-34 0 V15 M-18 0 V11", stroke: INK, "stroke-width": 16, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, k);
        el("path", { d: "M-72 0 H-4 M-34 0 V15 M-18 0 V11", stroke: col, "stroke-width": 10, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, k);
        el("circle", { cx: -92, r: 26, fill: col, stroke: INK, "stroke-width": 3 }, k);
        el("circle", { cx: -98, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, k);
        button(g, line, () => { user = { i, t0: api.now() }; api.poke(); });
        return { g, k, m, y, ok, line };
      });
      const cap = strip(svg, 512, 700);
      return (t, now) => {
        let lift = 0, act = -1, au = 0;
        const loc = (i) => (user ? (user.i === i ? now - user.t0 : -1) : t - (0.6 + i * P));
        keys.forEach((k, i) => {
          const u = loc(i), go = io(seg(u, 0, 0.7)) - io(seg(u, 2.25, 2.9));
          const tx = k.ok ? KX - 6 : KX - 34, x = 456 + (tx - 456) * go, y = k.y + (KY - k.y) * go;
          let sy = 1, rot = 0, dx = 0;
          if (k.ok) { sy = 1 - 2 * (io(seg(u, 0.75, 1.2)) - io(seg(u, 1.9, 2.25))); if (u > 0) lift = Math.max(lift, ob(seg(u, 1.15, 1.5)) - io(seg(u, 1.9, 2.2))); }
          else if (u > 0.7 && u < 2.25) { dx = Math.sin((u - 0.7) * 26) * 5 * (1 - seg(u, 1.7, 2.25)); rot = Math.sin((u - 0.7) * 26) * 2.5 * (1 - seg(u, 1.7, 2.25)); }
          else if (u >= 2.25 && u < 4.2) rot = 9 * Math.exp(-2.2 * (u - 2.9)) * Math.sin((u - 2.9) * 9) * (u > 2.9 ? 1 : 0);
          k.k.setAttribute("transform", `translate(${x + dx} ${y}) rotate(${rot}) scale(1 ${Math.abs(sy) < 0.12 ? 0.12 * (sy < 0 ? -1 : 1) : sy})`);
          const seen = user ? user.i !== i || u >= (k.ok ? 1.3 : 1) : u >= (k.ok ? 1.3 : 1) && t < 10;
          const mp = user && user.i !== i ? 1 : ob(seg(u, k.ok ? 1.3 : 1, k.ok ? 1.6 : 1.3));
          tf(k.m, 70, k.y, seen ? cl(mp, 0, 1.25) : 0); show(k.m, seen ? 1 : 0);
          if (u >= 0 && u < P) { act = i; au = u; }
        });
        const L = 28 * cl(lift, 0, 1.15);
        shackle.setAttribute("d", `M${KX - 46} ${TOP + 14} V${TOP - 46 - L} a46 46 0 0 1 92 0 V${TOP + 14 - L * 1.5}`);
        body.setAttribute("fill", lift > 0.5 ? MINT : LIL);
        const ok = act >= 0 && keys[act].ok, a0 = ok ? 1.3 : 1, rp = act < 0 ? 0 : ob(seg(au, a0, a0 + 0.3)) * (1 - seg(au, 2.1, 2.3));
        if (act >= 0) { res.set(ok ? "opens" : "does not fit"); res.r.setAttribute("fill", ok ? MINT : "#fff"); }
        tf(res.g, KX, TOP + 186, cl(rp, 0, 1.2)); show(res.g, rp);
        cap.textContent = act >= 0 ? keys[act].line : "Three logins tried on OpenCode, 6 Oct 2026";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 96, "COMPARISON", { "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE, "letter-spacing": 3 });
      txt(svg, 64, 190, "OpenCode vs", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 276, "Claude Code", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 304 H536", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 362, "Licence, price and models compared", { "font-size": 25, "font-weight": 500, fill: MUTE });
      el("rect", { x: 64, y: 400, width: 262, height: 50, rx: 25, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 195, 433, "Checked 6 Oct 2026", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const PX = 752;
      el("path", { d: `M${PX - 150} 462 H${PX + 150}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${PX - 96} 462 q6 -20 12 0 q6 -26 12 0 M${PX + 70} 462 q6 -22 12 0 q6 -16 12 0`, stroke: INK, "stroke-width": 3, fill: MINT, "stroke-linejoin": "round" }, svg);
      el("rect", { x: PX - 9, y: 112, width: 18, height: 350, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: PX, cy: 104, r: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const a = el("g", { transform: `rotate(-4 ${PX} 190)` }, svg);
      el("path", { d: `M${PX + 50} 154 H${PX - 112} L${PX - 150} 190 L${PX - 112} 226 H${PX + 50} Z`, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, a);
      txt(a, PX - 34, 199, "any model", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const b = el("g", { transform: `rotate(3 ${PX} 290)` }, svg);
      el("path", { d: `M${PX - 50} 254 H${PX + 122} L${PX + 160} 290 L${PX + 122} 326 H${PX - 50} Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, b);
      txt(b, PX + 40, 299, "Claude plan", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
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
