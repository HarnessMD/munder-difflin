/* Bright coded scenes for "Gemini CLI vs Claude Code". Vanilla JS, no library.
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

  const SC = {};

  /* ---- 1. a calendar page tears off; three cards move board, two stay pinned ---- */
  SC.calendar = {
    dur: 11.6, still: 9.4,
    build(svg) {
      txt(svg, 44, 62, "Google's notice: who moves, who stays", { "font-size": 32, "font-weight": 700 });
      /* wall calendar */
      el("rect", { x: 36, y: 122, width: 164, height: 182, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M36 160 V138 a16 16 0 0 1 16 -16 H184 a16 16 0 0 1 16 16 V160 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      [78, 158].forEach((x) => el("rect", { x: x - 6, y: 108, width: 12, height: 30, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      el("path", { d: "M62 204 H174 M62 232 H174 M62 260 H140", stroke: SOFT, "stroke-width": 8, "stroke-linecap": "round" }, svg);
      const page = el("g", {}, svg);
      el("rect", { x: -70, y: 0, width: 140, height: 130, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, page);
      txt(page, 0, 30, "JUN", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700, fill: MUTE });
      txt(page, 0, 90, "18", { "text-anchor": "middle", "font-size": 64, "font-weight": 700 });
      txt(page, 0, 118, "2026", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700, fill: MUTE });
      /* two boards */
      const B1 = 222, B2 = 518, BW = 256, CW = 232, CH = 46, Y0 = 176, STEP = 58;
      [[B1, "Gemini CLI"], [B2, "Antigravity CLI"]].forEach(([x, name]) => {
        el("rect", { x, y: 122, width: BW - (x === B2 ? 4 : 0), height: 348, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, x + (BW - (x === B2 ? 4 : 0)) / 2, 157, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      });
      const X1 = B1 + 12, X2 = B2 + 10;
      [0, 1, 2].forEach((i) => [X1, X2].forEach((x) => el("rect", { x, y: Y0 + i * STEP, width: CW, height: CH, rx: 12, fill: "#fff", "fill-opacity": 0.6, stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "5 6" }, svg)));
      const arrow = el("path", { d: "M484 257 H508 M499 247 L510 257 L499 267", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const CARDS = [["free of charge", YEL, 1], ["Google AI Pro", SKY, 1], ["Ultra", LIL, 1], ["paid API key", MINT, 0], ["Code Assist licence", MINT, 0]];
      const cards = CARDS.map(([s, col, moves], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: 0, y: 0, width: CW, height: CH, rx: 12, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, CW / 2, 31, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        const pin = el("circle", { cx: CW / 2, cy: 0, r: 7, fill: moves ? "#fff" : INK, stroke: INK, "stroke-width": 3 }, g);
        return { g, pin, moves, y: Y0 + i * STEP, a: 3.2 + i * 0.95 };
      });
      const cap = strip(svg, 508, 720);
      return (t) => {
        const back = io(seg(t, 10.6, 11.3));
        const p = seg(t, 1.5, 2.9), e = io(p), wig = t > 1.1 && t < 1.5 ? Math.sin(t * 40) * 3 : 0;
        page.setAttribute("transform", `translate(${118 + Math.sin(p * 6.2832) * 24 * (1 - p)} ${166 + 176 * e}) rotate(${wig + Math.sin(p * 7.5) * 13 * (1 - p) - 7 * e})`);
        page.setAttribute("opacity", seg(t, 0, 0.3) * (1 - seg(t, 10.6, 11)));
        cards.forEach((c) => {
          const m = c.moves ? io(seg(t, c.a, c.a + 0.8)) - back : 0;
          const hop = c.moves ? Math.sin(cl(m) * Math.PI) * -16 : 0;
          const nod = c.moves ? 0 : Math.sin(seg(t, 6.4, 7) * Math.PI) * 0.06;
          c.g.setAttribute("transform", `translate(${X1 + (X2 - X1) * m + CW / 2} ${c.y + hop + CH / 2}) rotate(${Math.sin(cl(m) * Math.PI) * 4}) scale(${1 + nod}) translate(${-CW / 2} ${-CH / 2})`);
        });
        arrow.setAttribute("opacity", 0.25 + 0.75 * seg(t, 2.9, 3.2) * (1 - back));
        cap.textContent = t < 3 || t > 10.6 ? "The notice set the date: 18 Jun 2026" : t < 6.3 ? "Free, Google AI Pro and Ultra: now via Antigravity CLI" : "Paid API keys and Code Assist licences stay";
      };
    },
  };

  /* ---- 2. a dripping tap with a tally, next to a bucket that arrives full ---- */
  SC.bucket = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "Two ways to pay", { "font-size": 32, "font-weight": 700 });
      el("path", { d: "M424 104 V566", stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round", "stroke-dasharray": "2 12" }, svg);
      txt(svg, 190, 118, "Gemini CLI", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      txt(svg, 600, 118, "Claude Code", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      let uid = 0;
      const pail = (p, cx, top, w1, w2, h, col) => {
        const id = "mgb" + Math.random().toString(36).slice(2, 7) + uid++, d = `M${cx - w1 / 2} ${top} H${cx + w1 / 2} L${cx + w2 / 2} ${top + h} H${cx - w2 / 2} Z`;
        el("path", { d: `M${cx - w1 / 2 + 6} ${top} Q${cx} ${top - h * 0.62} ${cx + w1 / 2 - 6} ${top}`, stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, p);
        const cp = el("clipPath", { id }, p); el("path", { d }, cp);
        el("path", { d, fill: "#fff" }, p);
        const w = el("rect", { x: cx - w1 / 2, width: w1, y: top, height: h, fill: col, "clip-path": `url(#${id})` }, p);
        const s = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "clip-path": `url(#${id})` }, p);
        el("path", { d, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
        el("rect", { x: cx - w1 / 2 - 8, y: top - 7, width: w1 + 16, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, p);
        return (lv) => { const y = top + 7 + (h - 7) * (1 - lv); w.setAttribute("y", y); w.setAttribute("height", top + h - y); s.setAttribute("d", `M${cx - w1 / 2} ${y} H${cx + w1 / 2}`); return y; };
      };
      /* left: tap, bucket, tally */
      el("rect", { x: 40, y: 142, width: 16, height: 66, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M56 162 H178 a26 26 0 0 1 26 26 V216 H174 V192 H56 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M120 162 V144", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("rect", { x: 92, y: 132, width: 56, height: 16, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const setL = pail(svg, 190, 296, 190, 140, 126, SKY);
      const DROP = "M0 -13 C7 -3 9 2 9 6 A9 9 0 0 1 -9 6 C-9 2 -7 -3 0 -13 Z";
      const N = 8, A = (i) => 1.2 + i * 1.05, FALL = 0.45;
      const drops = Array.from({ length: N }, () => el("path", { d: DROP, fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg));
      const xdrop = el("path", { d: DROP, fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", opacity: 0 }, svg);
      el("rect", { x: 60, y: 440, width: 260, height: 50, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const MAX = 15, tally = Array.from({ length: MAX }, (_, i) => {
        const gx = 86 + Math.floor(i / 5) * 78, j = i % 5;
        return el("path", { d: j < 4 ? `M${gx + j * 13} 452 V478` : `M${gx - 9} 475 L${gx + 48} 455`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      });
      txt(svg, 190, 528, "pay per token", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(svg, 190, 556, "on a paid Gemini API key", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      let extra = [];
      const btn = el("g", { transform: "translate(326 214)" }, svg);
      el("rect", { x: -76, y: -29, width: 152, height: 58, rx: 29, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, btn);
      el("rect", { x: -70, y: -23, width: 140, height: 46, rx: 23, fill: MINT, stroke: INK, "stroke-width": 3 }, btn);
      txt(btn, 0, 7, "add a drop", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      button(btn, "Add one more drop and one more tally mark", () => { if (extra.length < MAX - N) extra.push(api.now()); api.poke(); });
      /* right: the bucket that arrives full */
      const R = el("g", {}, svg);
      const setR = pail(R, 600, 250, 240, 176, 172, BLUE);
      el("path", { d: "M487 276 H713", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 8", "stroke-linecap": "round" }, R);
      el("rect", { x: 546, y: 322, width: 108, height: 58, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, R);
      txt(R, 600, 363, "Pro", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      el("rect", { x: 498, y: 440, width: 204, height: 50, rx: 25, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 600, 472, "flat monthly plan", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 600, 528, "Pro: $20 a month", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(svg, 600, 556, "billed monthly", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      return (t, now) => {
        const out = seg(t, 11.3, 11.9);
        let n = 0; for (let i = 0; i < N; i++) if (t >= A(i) + FALL) n++;
        const xn = extra.filter((x) => now - x >= FALL).length, shown = Math.round(n * (out < 0.5 ? 1 : 0)) + xn;
        const surf = setL(cl(0.1 + 0.05 * (n * (1 - out) + xn), 0, 0.9));
        drops.forEach((d, i) => { const q = seg(t, A(i), A(i) + FALL), grow = seg(t, A(i) - 0.5, A(i)); d.setAttribute("transform", `translate(190 ${232 + (surf - 232) * q * q}) scale(${grow})`); d.setAttribute("opacity", grow > 0 && q < 1 ? 1 : 0); });
        const live = extra.find((x) => now - x >= 0 && now - x < FALL);
        if (live != null) { const q = (now - live) / FALL; xdrop.setAttribute("transform", `translate(190 ${232 + (surf - 232) * q * q})`); xdrop.setAttribute("opacity", 1); } else xdrop.setAttribute("opacity", 0);
        tally.forEach((k, i) => k.setAttribute("opacity", i < shown ? 1 : 0.1));
        R.setAttribute("transform", `translate(${420 * (1 - ob(seg(t, 0.2, 1.1))) + 420 * io(out)} 0)`);
        setR(0.84 - 0.5 * seg(t, 1.8, 10.4));
      };
    },
  };

  /* ---- 3. two shelves of four books, one model name on each spine ---- */
  SC.books = {
    dur: 11.4, still: 9,
    build(svg, api) {
      txt(svg, 44, 62, "Each lists its own maker's models", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a book", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const G = 438, BW = 64;
      const SH = [
        [208, "Gemini CLI", 0.5, 22, [["gemini-3-pro-preview", 330, SKY, "one of two picks under Gemini 3"], ["gemini-3-flash-preview", 330, YEL, "one of two picks under Gemini 3"], ["gemini-2.5-pro", 262, MINT, "one of two picks under Gemini 2.5"], ["gemini-2.5-flash", 290, LIL, "one of two picks under Gemini 2.5"]]],
        [592, "Claude Code", 3.2, 30, [["fable", 236, LIL, "an alias in Claude Code's model docs"], ["opus", 290, YEL, "resolves to Opus 5.5 on the Anthropic API"], ["sonnet", 262, SKY, "resolves to Sonnet 5.5 on the Anthropic API"], ["haiku", 214, MINT, "an alias in Claude Code's model docs"]]],
      ];
      let pinned = null;
      const all = [];
      SH.forEach(([x, name, t0, fs, books]) => {
        el("rect", { x: x - 178, y: G, width: 356, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        [-1, 1].forEach((s) => el("path", { d: `M${x + s * 140} ${G} V${G - 110} Q${x + s * 172} ${G - 110} ${x + s * 172} ${G} Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg));
        txt(svg, x, G + 52, name, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        books.forEach(([s, h, col, line], i) => {
          const bx = x - 136 + 2 + i * 68, g = el("g", {}, svg);
          el("rect", { x: -4, y: -h - 4, width: BW + 8, height: h + 4, rx: 10, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
          el("rect", { x: 0, y: -h, width: BW, height: h, rx: 7, fill: col, stroke: INK, "stroke-width": 3 }, g);
          el("path", { d: `M0 ${-h + 13} H${BW} M0 -13 H${BW}`, stroke: INK, "stroke-width": 2.5 }, g);
          txt(g, 0, 0, s, { "text-anchor": "middle", "font-family": MONO, "font-size": fs, "font-weight": 700, transform: `translate(${BW / 2 + fs * 0.3} ${-h / 2}) rotate(-90)` });
          const b = { g, bx, a: t0 + i * 0.55, s, line, tip: 0, t0: -9 };
          button(g, `${s}: ${line}`, () => { all.forEach((o) => { if (o !== b && o.tip) { o.tip = 0; o.t0 = api.now(); } }); b.tip = b.tip ? 0 : 1; b.t0 = api.now(); pinned = b.tip ? b : null; api.poke(); });
          all.push(b);
        });
      });
      const cap = strip(svg, 512, 720);
      return (t, now) => {
        const out = seg(t, 10.7, 11.2);
        let last = null;
        all.forEach((b) => {
          const q = seg(t, b.a, b.a + 0.5), k = cl((now - b.t0) / 0.25), tip = b.tip ? k : 1 - k, land = Math.sin(seg(t, b.a + 0.5, b.a + 0.8) * Math.PI) * 3;
          b.g.setAttribute("transform", `translate(${b.bx + BW / 2} ${G - 360 * (1 - oc(q)) - 16 * tip}) rotate(${-5 * tip + land * (1 - q >= 0 ? 0.4 : 0)}) translate(${-BW / 2} 0)`);
          b.g.setAttribute("opacity", seg(t, b.a, b.a + 0.12) * (1 - out));
          if (t >= b.a + 0.3) last = b;
        });
        cap.textContent = pinned ? `${pinned.s}: ${pinned.line}` : !last || t >= 10.7 || t > 6 ? "Four model names from each tool's model docs" : last.s;
      };
    },
  };

  /* ---- 4. two umbrellas leave the stand and open, three panels each ---- */
  SC.umbrellas = {
    dur: 12, still: 9.2,
    build(svg) {
      txt(svg, 44, 62, "Our view: who each one suits", { "font-size": 32, "font-weight": 700 });
      const LEN = 336;
      const brolly = (cols, labels) => {
        const g = el("g", {}, svg);
        el("path", { d: `M0 -18 V${LEN} q0 24 -19 24 q-17 0 -17 -17`, stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, g);
        const ps = cols.map((c) => el("path", { fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g));
        const ls = labels.map((lines) => { const lg = el("g", {}, g); lines.forEach((s, j) => txt(lg, 0, j * 25, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 })); return { lg, n: lines.length }; });
        return (x, y, rot, o) => {
          const w = 13 + 161 * o, yb = 196 - 46 * o, s = 26 * o, a = w * 0.28, f = (v) => v.toFixed(1);
          const rib = (px) => `Q${f(px * 0.85)} ${f(yb * 0.35)} 0 0`;
          ps[0].setAttribute("d", `M0 0 C${f(-w * 0.55)} 0 ${f(-w)} ${f(yb * 0.45)} ${f(-w)} ${f(yb)} Q${f(-(w + a) / 2)} ${f(yb - s)} ${f(-a)} ${f(yb)} ${rib(-a)} Z`);
          ps[1].setAttribute("d", `M0 0 Q${f(-a * 0.85)} ${f(yb * 0.35)} ${f(-a)} ${f(yb)} Q0 ${f(yb - s)} ${f(a)} ${f(yb)} ${rib(a)} Z`);
          ps[2].setAttribute("d", `M0 0 C${f(w * 0.55)} 0 ${f(w)} ${f(yb * 0.45)} ${f(w)} ${f(yb)} Q${f((w + a) / 2)} ${f(yb - s)} ${f(a)} ${f(yb)} ${rib(a)} Z`);
          ls.forEach((l, i) => { l.lg.setAttribute("transform", `translate(${(i - 1) * w * 0.6} ${yb * (i === 1 ? 0.68 : 0.66) - (l.n - 1) * 12})`); l.lg.setAttribute("opacity", seg(o, 0.8, 1)); });
          g.setAttribute("transform", `translate(${x} ${y}) rotate(${rot} 0 ${LEN})`);
        };
      };
      const U = [
        { d: brolly([YEL, SKY, MINT], [["Apache", "2.0"], ["paid", "API key"], ["work", "licence"]]), hx: 386, hr: -4, x: 212, a: 0.8 },
        { d: brolly([LIL, YEL, SKY], [["monthly", "plan"], ["web"], ["desktop", "app"]]), hx: 414, hr: 4, x: 588, a: 3.9 },
      ];
      /* the stand sits in front of the furled umbrellas */
      el("rect", { x: 346, y: 392, width: 108, height: 128, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M346 432 H454 M346 480 H454", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 336, y: 382, width: 128, height: 20, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      const names = [txt(svg, 212, 548, "Gemini CLI", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 }), txt(svg, 588, 548, "Claude Code", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 })];
      return (t) => {
        const back = io(seg(t, 11, 11.7)), shut = io(seg(t, 10.5, 11));
        U.forEach((u, i) => {
          const m = cl(io(seg(t, u.a, u.a + 1)) - back), o = cl(ob(seg(t, u.a + 1.1, u.a + 1.9)) - shut, 0, 1.03);
          const sway = Math.sin(t * 1.3 + i * 2) * 1.4 * cl(o);
          u.d(u.hx + (u.x - u.hx) * m, 160 - 24 * m - 70 * Math.sin(m * Math.PI), u.hr * (1 - m) + sway, o);
          names[i].setAttribute("opacity", 0.25 + 0.75 * cl(o));
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 112, "COMPARISONS", { "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE, "letter-spacing": 3 });
      txt(svg, 64, 208, "Gemini CLI vs", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 296, "Claude Code", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 324 H490", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 386, "Checked 7 Oct 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const kite = (x, y, r, col, bows, tail) => {
        el("path", { d: tail, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg);
        bows.forEach(([bx, by, br, c]) => el("path", { d: "M0 0 L-15 -10 V10 Z M0 0 L15 -10 V10 Z", fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", transform: `translate(${bx} ${by}) rotate(${br})` }, svg));
        const g = el("g", { transform: `translate(${x} ${y}) rotate(${r})` }, svg);
        el("path", { d: "M0 -92 L64 -14 L0 96 L-64 -14 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M0 -92 V96 M-64 -14 H64", stroke: INK, "stroke-width": 3 }, g);
      };
      kite(672, 176, 24, SKY, [[612, 318, 30, YEL], [604, 392, -24, MINT], [632, 456, 20, LIL]], "M633 264 Q596 300 612 318 Q632 356 604 392 Q590 430 632 456 Q650 470 640 496");
      kite(826, 286, -16, LIL, [[832, 422, -12, SKY], [868, 470, 28, YEL]], "M852 378 Q822 400 832 422 Q846 452 868 470 Q884 484 874 506");
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
