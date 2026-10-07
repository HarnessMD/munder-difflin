/* Bright coded scenes for "Codex vs Cursor". Vanilla JS, no library.
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

  const GREY = "#7A6A88";
  const chip = (p, s, fill, a = {}) => {
    const g = el("g", {}, p), r = el("rect", { y: -19, height: 38, rx: 19, fill, stroke: INK, "stroke-width": 2.5 }, g);
    const t = txt(g, 0, 7, s, Object.assign({ "text-anchor": "middle", "font-size": 20, "font-weight": 700 }, a));
    const w = t.getComputedTextLength() + 36; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return g;
  };
  const show = (n, k) => n.setAttribute("opacity", k <= 0.01 ? 0 : 1);

  const SC = {};

  /* ---- 1. two chests of drawers: six drawers open for Codex, then three for Cursor ---- */
  SC.drawers = {
    dur: 11.8, still: 9.6,
    build(svg) {
      txt(svg, 44, 62, "Where you can use each one", { "font-size": 32, "font-weight": 700 });
      const chest = (x, name) => {
        txt(svg, x + 140, 134, name, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        el("path", { d: `M${x + 26} 468 V484 M${x + 254} 468 V484`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg);
        el("rect", { x, y: 148, width: 280, height: 320, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      };
      chest(70, "Codex"); chest(450, "Cursor");
      const drawer = (x, y, h, label, col, t0, big) => {
        el("rect", { x: x + 12, y, width: 256, height: h, rx: 10, fill: "#fff", stroke: GREY, "stroke-opacity": 0.35, "stroke-width": 2 }, svg);
        const g = el("g", {}, svg);
        const face = el("rect", { x: -128, y: -h / 2, width: 256, height: h, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const l = txt(g, -108, big ? 10 : 7, label, { "font-size": big ? 30 : 21, "font-weight": 700 });
        el("circle", { cx: 100, cy: 0, r: big ? 11 : 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        return { g, face, l, col, t0, x: x + 140, y: y + h / 2 };
      };
      const D = ["desktop app", "mobile app", "web", "CLI", "IDE extension", "Cloud"].map((s, i) => drawer(70, 156 + i * 52, 44, s, YEL, 0.6 + i * 0.75));
      D.push(drawer(450, 156, 148, "editor", SKY, 5.9, true), drawer(450, 312, 70, "CLI", SKY, 6.8), drawer(450, 390, 70, "cloud agents", SKY, 7.6));
      const cap = strip(svg, 508, 660);
      return (t) => {
        const out = io(seg(t, 10.7, 11.4));
        D.forEach((d) => {
          const k = ob(seg(t, d.t0, d.t0 + 0.45)) * (1 - out), on = seg(t, d.t0, d.t0 + 0.12) * (1 - out);
          d.g.setAttribute("transform", `translate(${d.x} ${d.y + 5 * k}) scale(${1 + 0.035 * k})`);
          d.face.setAttribute("fill", on > 0.5 ? d.col : "#fff");
          d.l.setAttribute("opacity", on);
        });
        cap.textContent = t < 5.7 || t >= 10.7 ? "Six places to use Codex, per OpenAI's Codex docs" : "Cursor is the editor, plus a CLI and cloud agents";
      };
    },
  };

  /* ---- 2. a glass greenhouse opens its door; a shed closes its shutters and bars the door ---- */
  SC.greenhouse = {
    dur: 11.6, still: 8.6,
    build(svg, api) {
      txt(svg, 44, 62, "Open code, closed code", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap the shed", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const G = 396;
      el("path", { d: `M40 ${G} H760`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* greenhouse */
      const plant = (x, col, n) => {
        const g = el("g", {}, svg);
        el("path", { d: "M0 -30 V-84", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        [[-15, -58, -35], [15, -70, 35], [-13, -90, -30], [13, -102, 30], [0, -114, 0]].slice(0, n).forEach(([dx, dy, r]) => el("ellipse", { cx: dx, cy: dy, rx: 15, ry: 9, fill: MINT, stroke: INK, "stroke-width": 2.5, transform: `rotate(${r} ${dx} ${dy})` }, g));
        el("path", { d: "M-19 -32 H19 L14 0 H-14 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        return { g, x };
      };
            el("path", { d: `M112 ${G} V226 L220 132 L328 226 V${G} Z`, fill: SKY, "fill-opacity": 0.3, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: `M100 226 H340 M112 312 H186 M254 312 H328 M166 226 V179 M274 226 V179 M220 132 V226 M186 ${G} V226 M254 ${G} V226`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, svg);
      const plants = [plant(149, YEL, 5), plant(291, LIL, 4)];
      el("rect", { x: 190, y: 280, width: 60, height: G - 280, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const mid = plant(224, BLUE, 3);
      const door = el("g", {}, svg);
      el("rect", { x: 0, y: 0, width: 60, height: G - 280, fill: "#fff", stroke: INK, "stroke-width": 3 }, door);
      el("rect", { x: 0, y: 0, width: 60, height: G - 280, fill: SKY, "fill-opacity": 0.3 }, door);
      el("path", { d: "M0 58 H60", stroke: INK, "stroke-width": 2.5 }, door);
      el("circle", { cx: 48, cy: 72, r: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, door);
      txt(svg, 220, 436, "Codex CLI", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const c1 = chip(svg, "Apache-2.0", MINT, { "font-family": MONO });
      /* shed */
      const shed = el("g", {}, svg), body = el("g", {}, shed);
      el("rect", { x: -116, y: -272, width: 232, height: 278, rx: 18, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, shed);
      el("rect", { x: -100, y: -170, width: 200, height: 170, fill: SOFT, stroke: INK, "stroke-width": 3 }, body);
      el("path", { d: "M-60 -168 V-3 M-20 -168 V-3 M20 -168 V-3 M60 -168 V-3", stroke: GREY, "stroke-opacity": 0.35, "stroke-width": 2 }, body);
      el("path", { d: "M-120 -170 L0 -264 L120 -170 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
      el("rect", { x: -78, y: -128, width: 62, height: 62, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
      el("path", { d: "M-47 -128 V-66 M-78 -97 H-16", stroke: INK, "stroke-width": 2.5 }, body);
      const leaf = (hx, dir) => {
        const g = el("g", {}, body);
        el("rect", { x: dir > 0 ? 0 : -31, y: -128, width: 31, height: 62, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: [-112, -97, -82].map((y) => `M${dir > 0 ? 6 : -25} ${y} h19`).join(" "), stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return { g, hx };
      };
      const leaves = [leaf(-78, 1), leaf(-16, -1)];
      el("rect", { x: 14, y: -112, width: 60, height: 112, fill: SKY, stroke: INK, "stroke-width": 3 }, body);
      el("path", { d: "M34 -112 V0 M54 -112 V0", stroke: INK, "stroke-opacity": 0.25, "stroke-width": 2 }, body);
      const bar = el("g", {}, body);
      el("rect", { x: -44, y: -9, width: 88, height: 18, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, bar);
      [[6, -68], [70, -68]].forEach(([x, y]) => el("path", { d: `M${x} ${y} v22 h12 v-22`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, body));
      txt(svg, 580, 436, "Cursor", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const c2 = chip(svg, "proprietary", LIL);
      const cap = strip(svg, 510, 700);
      let poked = -99;
      button(shed, "The shed stays shut. Cursor's terms say you may not reverse engineer it.", () => { poked = api.now(); api.poke(); });
      return (t, now) => {
        const out = io(seg(t, 10.6, 11.3)), w = now - poked, shake = w >= 0 && w < 0.9 ? Math.sin(w * 30) * 2.2 * (1 - w / 0.9) : 0;
        const open = io(seg(t, 0.5, 1.5)) * (1 - out);
        door.setAttribute("transform", `translate(190 280) skewY(${-14 * open}) scale(${1 - 0.72 * open} 1)`);
        [...plants, mid].forEach((p, i) => { const k = ob(seg(t, 1.5 + i * 0.35, 2.1 + i * 0.35)) * (1 - out); tf(p.g, p.x, G - 3, (0.5 + 0.4 * k) * (i === 2 ? 0.85 : 1), Math.sin(now * 1.6 + i * 2) * 2 * k); });
        const k1 = ob(seg(t, 2.9, 3.3)) * (1 - out); tf(c1, 220, 468, cl(k1, 0, 1.2)); show(c1, k1);
        tf(shed, 580, G, 1, shake);
        const shut = io(seg(t, 4.3, 5.2)) * (1 - out);
        leaves.forEach((l) => l.g.setAttribute("transform", `translate(${l.hx} 0) scale(${0.18 + 0.82 * shut} 1)`));
        const b = oc(seg(t, 5.6, 6.2)) * (1 - out);
        bar.setAttribute("transform", `translate(${44 + 150 * (1 - b)} -57)`); bar.setAttribute("opacity", cl(b * 4));
        const k2 = ob(seg(t, 6.6, 7)) * (1 - out); tf(c2, 580, 468, cl(k2, 0, 1.2)); show(c2, k2);
        cap.textContent = w >= 0 && w < 3.5 ? "Cursor's terms: you may not reverse engineer it" : t < 4.1 || t >= 10.6 ? "GitHub lists openai/codex under Apache-2.0" : "Cursor's terms keep ownership with Anysphere";
      };
    },
  };

  /* ---- 3. two staircases meet in the middle; a plank lies level on the two $20 steps ---- */
  SC.stairs = {
    dur: 12.4, still: 10,
    build(svg, api) {
      txt(svg, 44, 62, "The monthly price steps", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "tap a step", { "font-size": 20, fill: MUTE, "font-weight": 500 });
      const G = 440, W = 84, HT = { 0: 44, 8: 88, 20: 134, 60: 190, 100: 240, 200: 296 };
      const ST = [
        [342, 0, "Free", YEL, "Codex Free: the free plan"], [258, 8, "$8", YEL, "Codex Go: $8 a month"], [174, 20, "$20", YEL, "Codex Plus: $20 a month"], [90, 100, "$100", YEL, "Codex Pro: from $100 a month"],
        [458, 0, "Free", SKY, "Cursor Hobby: free, limited Agent requests"], [542, 20, "$20", SKY, "Cursor Individual: $20 a month"], [626, 60, "$60", SKY, "Cursor Pro Plus: $60 a month"], [710, 200, "$200", SKY, "Cursor Ultra: $200 a month"],
      ];
      let pinned = -1;
      const steps = ST.map(([x, p, label, col, line], i) => {
        const h = HT[p], g = el("g", {}, svg);
        const r = el("rect", { x: x - W / 2, width: W, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const lg = el("g", {}, g);
        if (p === 100) txt(lg, x, 26, "from", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        txt(lg, x, p === 100 ? 52 : 31, label, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        el("rect", { x: x - W / 2 + 6, y: G - h + 6, width: W - 12, height: h - 12, rx: 8, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", class: "mg-ring" }, g);
        button(g, line, () => { pinned = i; api.poke(); });
        return { r, lg, h, t0: 0.5 + i * 0.75 + (i > 3 ? 0.5 : 0) };
      });
      el("path", { d: `M30 ${G} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      txt(svg, 216, G + 40, "Codex", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      txt(svg, 584, G + 40, "Cursor", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const PT = 7.6, plank = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: -222, y: -24, width: 444, height: 24, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, plank);
      const both = txt(svg, 358, G - HT[20] - 42, "both list $20 a month", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const cap = strip(svg, 508, 700);
      return (t) => {
        const out = io(seg(t, 11.5, 12.2));
        let last = -1;
        steps.forEach((s, i) => {
          const k = cl(ob(seg(t, s.t0, s.t0 + 0.55)), 0, 1.06) * (1 - out), h = Math.max(s.h * k, 0.01);
          s.r.setAttribute("y", G - h); s.r.setAttribute("height", h); show(s.r, k);
          s.lg.setAttribute("transform", `translate(0 ${G - h})`); s.lg.setAttribute("opacity", seg(k, 0.85, 1));
          if (t >= s.t0) last = i;
        });
        const q = seg(t, PT, PT + 0.5), land = seg(t, PT + 0.5, PT + 1.2), wob = q >= 1 ? Math.exp(-5 * land) * Math.sin(land * 16) : 0;
        tf(plank, 358, G - HT[20] - 1.5 - 140 * (1 - q * q), 1, wob * 2 + (1 - q) * -5);
        plank.setAttribute("opacity", seg(t, PT, PT + 0.1) * (1 - out));
        const bp = ob(seg(t, PT + 0.7, PT + 1.1)) * (1 - out);
        both.setAttribute("opacity", cl(bp * 3)); both.setAttribute("transform", `translate(0 ${10 * (1 - cl(bp, 0, 1.2))})`);
        cap.textContent = pinned >= 0 ? ST[pinned][4] : t > PT + 0.6 && t < 11.5 ? "Both vendors listed a $20 a month plan" : last < 0 || t >= 11.5 ? "Monthly prices, checked 7 Oct 2026" : ST[last][4];
      };
    },
  };

  /* ---- 4. a small book slides over a shelf of books and slots into the gap ---- */
  SC.shelf = {
    dur: 11.4, still: 8.4,
    build(svg) {
      txt(svg, 44, 62, "Codex fits inside Cursor", { "font-size": 32, "font-weight": 700 });
      const B = 420, GAPX = 373;
      el("path", { d: `M150 ${B + 44} l0 26 l34 -26 Z M650 ${B + 44} l0 26 l-34 -26 Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 70, y: B, width: 660, height: 46, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, B + 32, "Cursor", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      el("path", { d: `M92 ${B} V${B - 120} M708 ${B} V${B - 120}`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      el("rect", { x: GAPX - 30, y: B - 200, width: 60, height: 200, rx: 6, fill: "#fff", stroke: GREY, "stroke-opacity": 0.35, "stroke-width": 2, "stroke-dasharray": "5 6" }, svg);
      const book = (x, w, h, col) => {
        const g = el("g", {}, svg);
        el("rect", { x: -w / 2, y: -h, width: w, height: h, rx: 6, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${-w / 2} ${-h + 24} H${w / 2} M${-w / 2} -24 H${w / 2}`, stroke: INK, "stroke-width": 2.5 }, g);
        return { g, x: x + w / 2, side: x < GAPX ? -1 : 1 };
      };
      let x = 137; const books = [];
      [[52, 172, SKY], [44, 150, LIL], [60, 190, BLUE], [48, 164, SOFT], [56, 182, LIL], [46, 156, SKY], [62, 190, SOFT], [50, 170, BLUE], [44, 146, MINT]].forEach(([w, h, c], i) => { if (i === 4) x += 64; books.push(book(x, w, h, c)); x += w; });
      const tag = el("g", {}, svg);
      el("path", { d: "M0 0 V-34", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, tag);
      const tg = chip(tag, "Codex sidebar", MINT); tg.setAttribute("transform", "translate(0 -52)");
      const cx = el("g", {}, svg);
      el("rect", { x: -30, y: -100, width: 60, height: 200, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, cx);
      txt(cx, 0, 0, "Codex extension", { "text-anchor": "middle", "font-size": 20, "font-weight": 700, transform: "rotate(-90) translate(0 7)" });
      const cap = strip(svg, 508, 700);
      return (t) => {
        const out = io(seg(t, 10.4, 11.1));
        const a = oc(seg(t, 0.5, 2.3)), b = io(seg(t, 2.3, 3.3)), c = seg(t, 3.5, 4), drop = c * c;
        const land = seg(t, 4, 4.5), sq = Math.sin(land * Math.PI);
        const px = -130 + (245 + 130) * a + (GAPX - 245) * b, py = 200 + 12 * b - 28 * Math.sin(Math.PI * b) + (B - 100 - 212) * drop;
        cx.setAttribute("transform", `translate(${px + (-200 - px) * out} ${py - 60 * out}) rotate(${90 - 90 * b})`);
        cx.setAttribute("opacity", 1 - seg(out, 0.6, 1));
        books.forEach((k) => tf(k.g, k.x + k.side * 5 * sq, B, 1, k.side * 1.6 * sq));
        const tp = ob(seg(t, 4.8, 5.3)) * (1 - seg(t, 10.2, 10.5));
        tag.setAttribute("transform", `translate(${GAPX} ${B - 200 + 30 * (1 - cl(tp, 0, 1.15))})`); show(tag, tp);
        cap.textContent = t < 4.6 || t >= 10.4 ? "OpenAI's README names VS Code, Cursor and Windsurf" : "OpenAI's IDE extension page lists Cursor too";
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 92, "COMPARISONS", { "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE, "letter-spacing": 3 });
      txt(svg, 64, 180, "Codex vs Cursor", { "font-size": 84, "font-weight": 700 });
      el("path", { d: "M66 210 H690", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 268, "Checked 7 Oct 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      /* a game of table tennis */
      el("rect", { x: 150, y: 448, width: 660, height: 22, rx: 11, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M250 470 V500 M710 470 V500", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      el("rect", { x: 474, y: 398, width: 12, height: 50, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M300 446 Q400 250 540 446 Q630 310 686 348", stroke: MUTE, "stroke-width": 3, fill: "none", "stroke-dasharray": "2 12", "stroke-linecap": "round" }, svg);
      const bat = (x, y, r, col) => {
        const g = el("g", { transform: `translate(${x} ${y}) rotate(${r})` }, svg);
        el("rect", { x: -11, y: 40, width: 22, height: 62, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("ellipse", { rx: 52, ry: 58, fill: col, stroke: INK, "stroke-width": 3 }, g);
      };
      bat(190, 350, -28, YEL); bat(800, 350, 28, BLUE);
      el("circle", { cx: 704, cy: 354, r: 15, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
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
