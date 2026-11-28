/* Bright coded scenes for "Claude Code Projects". Vanilla JS, no library.
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

  /* ---- 1. envelopes go in one wide slot and come out in a pigeonhole each ---- */
  SC.pigeonholes = {
    dur: 12, still: 9.6,
    build(svg) {
      txt(svg, 44, 62, "One conversation, a thread for each task", { "font-size": 32, "font-weight": 700 });
      const SX = 540, X0 = 60, CW = 170, TOP = 220, BOT = 462, COL = [YEL, SKY, LIL, MINT];
      const defs = el("defs", {}, svg);
      el("rect", { x: 0, y: 0, width: 800, height: 181 }, el("clipPath", { id: "mgc-pg-in" }, defs));
      el("rect", { x: X0, y: TOP + 2, width: CW * 4, height: BOT - TOP - 2 }, el("clipPath", { id: "mgc-pg-out" }, defs));
      el("rect", { x: X0, y: 146, width: CW * 4, height: 74, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, X0 + 30, 193, "conversation", { "font-size": 28, "font-weight": 700 });
      el("rect", { x: SX - 150, y: 174, width: 300, height: 18, rx: 9, fill: INK }, svg);
      el("rect", { x: X0, y: TOP, width: CW * 4, height: BOT - TOP, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      [1, 2, 3].forEach((i) => el("path", { d: `M${X0 + CW * i} ${TOP} V${BOT}`, stroke: INK, "stroke-width": 3 }, svg));
      const env = (parent, col) => {
        const g = el("g", {}, parent);
        el("rect", { x: -54, y: -36, width: 108, height: 72, rx: 9, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-54 -32 L0 2 L54 -32", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linejoin": "round" }, g);
        txt(g, 0, 27, "task", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        return g;
      };
      const gin = el("g", { "clip-path": "url(#mgc-pg-in)" }, svg), gout = el("g", { "clip-path": "url(#mgc-pg-out)" }, svg);
      const items = COL.map((c, i) => {
        const cx = X0 + CW * i + CW / 2;
        txt(svg, cx, BOT - 20, "thread", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        const k = el("g", {}, svg);
        el("circle", { r: 16, fill: MINT, stroke: INK, "stroke-width": 3 }, k);
        el("path", { d: "M-7 0 L-2 6 L8 -6", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, k);
        return { a: env(gin, c), b: env(gout, c), k, cx, t0: 0.5 + i * 1.9 };
      });
      const cap = strip(svg, 496, 720);
      return (t) => {
        const out = 1 - seg(t, 11.2, 11.8);
        items.forEach((m, i) => {
          const a = m.t0, pop = ob(seg(t, a, a + 0.35)), drop = seg(t, a + 0.55, a + 1.0);
          tf(m.a, SX, 112 + 110 * drop * drop, cl(pop, 0, 1.2));
          m.a.setAttribute("opacity", t < a ? 0 : 1);
          const e = oc(seg(t, a + 1.05, a + 1.7)), bob = t > 8.6 ? Math.sin(t * 5 + i * 1.6) * 4 * seg(t, 8.6, 9) : 0;
          tf(m.b, m.cx, TOP - 44 + 142 * e + bob);
          m.b.setAttribute("opacity", out);
          const p = ob(seg(t, a + 1.7, a + 2.0));
          tf(m.k, m.cx + 58, TOP + 28, cl(p, 0, 1.3));
          m.k.setAttribute("opacity", (p <= 0.01 ? 0 : 1) * out);
        });
        cap.textContent = t > 8.6 && t < 11.2 ? "Parallel threads, usually in the cloud" : "Claude starts a thread for each task";
      };
    },
  };

  /* ---- 2. four mugs on a shelf: two fill and steam, two stay upside down ---- */
  SC.mugs = {
    dur: 12, still: 9.4,
    build(svg, api) {
      txt(svg, 44, 62, "Who can use Projects today?", { "font-size": 32, "font-weight": 700 });
      const SH = 404, MX = [130, 310, 490, 670], NAME = ["Pro", "Max", "Team", "Enterprise"];
      const LINES = ["Pro: public beta, rolling out gradually", "Max: public beta, rolling out gradually", "Team: not available yet", "Enterprise: not available yet"];
      const defs = el("defs", {}, svg), MUG = "M-58 -122 H58 L46 -16 Q44 0 28 0 H-28 Q-44 0 -46 -16 Z";
      el("path", { d: MUG }, el("clipPath", { id: "mgc-mug" }, defs));
      el("rect", { x: 40, y: SH, width: 720, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const tag = (cx, w, fill, l1, l2) => {
        const g = el("g", {}, svg), h = l2 ? 76 : 50;
        el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 22, fill, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, l2 ? -6 : 8, l1, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        if (l2) txt(g, 0, 22, l2, { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        return g;
      };
      const TA = tag(220, 290, MINT, "public beta", "rolling out gradually"), TB = tag(580, 170, SOFT, "not yet");
      let pinned = -1;
      const mugs = MX.map((x, i) => {
        const up = i < 2, g = el("g", {}, svg), m = el("g", {}, g);
        el("rect", { x: x - 78, y: SH - 138, width: 172, height: 196, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: "M48 -96 H66 a25 25 0 0 1 0 50 H48", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, m);
        el("path", { d: MUG, fill: up ? "#fff" : SOFT }, m);
        const liq = up ? el("rect", { x: -60, y: 0, width: 120, height: 0, fill: YEL, "clip-path": "url(#mgc-mug)" }, m) : null;
        el("path", { d: MUG, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, m);
        const steam = up ? [-18, 18].map((dx) => el("path", { d: `M${dx} 0 c-12 -12 12 -22 0 -34 c-12 -12 12 -22 0 -34`, stroke: LIL, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, g)) : [];
        txt(g, x, SH + 52, NAME[i], { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        button(g, LINES[i], () => { pinned = i; api.poke(); });
        return { m, liq, steam, x, up };
      });
      const cap = strip(svg, 496, 720);
      return (t) => {
        const out = 1 - seg(t, 11.2, 11.8);
        const pa = ob(seg(t, 0.4, 0.8)), pb = ob(seg(t, 6.0, 6.4));
        tf(TA, 220, 132, cl(pa, 0, 1.2)); TA.setAttribute("opacity", (pa <= 0.01 ? 0 : 1) * out);
        tf(TB, 580, 190, cl(pb, 0, 1.2)); TB.setAttribute("opacity", (pb <= 0.01 ? 0 : 1) * out);
        const fill = io(seg(t, 1.2, 5.2)) * out;
        mugs.forEach((k, i) => {
          if (k.up) {
            tf(k.m, k.x, SH);
            const h = 100 * fill; k.liq.setAttribute("y", -h); k.liq.setAttribute("height", h);
            k.steam.forEach((s, j) => {
              const ph = (t * 0.45 + j * 0.5 + i * 0.25) % 1;
              s.setAttribute("transform", `translate(${k.x} ${SH - 136 - 14 * ph})`);
              s.setAttribute("opacity", seg(t, 4.2, 5.2) * out * Math.sin(ph * Math.PI) * 0.9);
            });
          } else {
            const j = Math.sin(seg(t, 6.2 + (i - 2) * 0.3, 6.9 + (i - 2) * 0.3) * Math.PI * 3) * 3;
            k.m.setAttribute("transform", `translate(${k.x} ${SH - 122}) rotate(${j}) scale(1 -1)`);
          }
        });
        cap.textContent = pinned >= 0 ? LINES[pinned] : t > 6 && t < 11.2 ? "Not available on Team or Enterprise plans yet" : "Public beta on Pro and Max plans";
      };
    },
  };

  /* ---- 3. a noticeboard with six headings; thread cards unpin and move across ---- */
  SC.noticeboard = {
    dur: 12, still: 10.7,
    build(svg) {
      txt(svg, 44, 62, "Six groups on the Threads tab", { "font-size": 32, "font-weight": 700 });
      const BX = 30, BW = 740, BY = 92, BH = 362, CWD = BW / 6, CX = (c) => BX + CWD * c + CWD / 2, SY = (s) => 214 + s * 67;
      el("rect", { x: BX, y: BY, width: BW, height: BH, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: BX, y: BY, width: BW, height: 84, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      [1, 2, 3, 4, 5].forEach((i) => el("path", { d: `M${BX + CWD * i} ${BY + 96} V${BY + BH - 12}`, stroke: LIL, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, svg));
      [["Ready for", "review"], ["Waiting", "on you"], ["Working"], ["Landing"], ["Idle"], ["Resolved"]].forEach((h, c) => {
        h.forEach((s, j) => txt(svg, CX(c), BY + (h.length > 1 ? 36 + j * 26 : 50), s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }));
      });
      const COL = [YEL, SKY, LIL, MINT, "#fff", "#fff"], HOME = [[2, 0], [2, 1], [2, 2], [2, 3], [4, 0], [4, 1]];
      /* each card: list of [start, end, col, slot] hops after its place in Working */
      const HOPS = [[[2.0, 3.0, 0, 0]], [[3.6, 4.6, 1, 0]], [[5.2, 6.2, 3, 0], [7.4, 8.4, 5, 0]], [[8.6, 9.2, 2, 0]], [], [[9.5, 10.2, 2, 1]]];
      const cards = COL.map((c, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -50, y: -28, width: 100, height: 56, rx: 8, fill: c, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 17, "thread", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        const pin = el("circle", { cx: 0, cy: -17, r: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        return { g, pin, i };
      });
      const cap = strip(svg, 486, 720);
      return (t) => {
        const out = 1 - seg(t, 11.4, 11.9);
        cards.forEach((k) => {
          let x = CX(HOME[k.i][0]), y = SY(HOME[k.i][1]), lift = 0;
          HOPS[k.i].forEach(([a, b, c, s]) => {
            const p = io(seg(t, a, b)), nx = CX(c), ny = SY(s);
            x += (nx - x) * p; y += (ny - y) * p;
            lift = Math.max(lift, Math.sin(seg(t, a - 0.25, b + 0.15) * Math.PI));
          });
          const pop = ob(seg(t, 0.3 + k.i * 0.15, 0.7 + k.i * 0.15));
          const wob = k.i === 1 && t > 4.7 ? Math.sin((t - 4.7) * 9) * 6 * seg(t, 4.7, 5.0) : 0;
          k.g.setAttribute("transform", `translate(${x} ${y - 14 * lift - 22}) rotate(${wob}) translate(0 22) scale(${cl(pop, 0, 1.2) * (1 + 0.08 * lift)})`);
          k.g.setAttribute("opacity", (pop <= 0.01 ? 0 : 1) * out);
          k.pin.setAttribute("opacity", lift > 0.12 ? 0 : 1);
        });
        cap.textContent = t > 4.6 && t < 11.4 ? "See the threads at once and which of them need you" : "A project is one conversation plus the threads it starts";
      };
    },
  };

  /* ---- 4. one watering can, first one pot, then three: the level drops faster ---- */
  SC.watering = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "The same plan limits, used faster", { "font-size": 32, "font-weight": 700 });
      const CXC = 176, CYC = 262, G = 446, PX = [468, 592, 716], TIP = [356, 250];
      const defs = el("defs", {}, svg);
      el("rect", { x: -88, y: -68, width: 176, height: 136, rx: 16 }, el("clipPath", { id: "mgc-can" }, defs));
      /* toggle */
      const tog = el("g", {}, svg);
      el("rect", { x: 440, y: 90, width: 330, height: 56, rx: 28, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, tog);
      el("rect", { x: 446, y: 96, width: 318, height: 44, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, tog);
      const knob = el("rect", { y: 96, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, tog);
      txt(tog, 538, 125, "single session", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(tog, 697, 125, "project", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      let tnow = 0;
      button(tog, "Switch between a single session and a project", () => api.seek(tnow < 5 ? 5.2 : 0.2));
      /* streams, drawn behind the pots */
      const streams = PX.map((x) => el("path", { d: `M${TIP[0]} ${TIP[1]} Q${(TIP[0] + x) / 2 + 30} ${TIP[1] - 90 - (x - 468) * 0.25} ${x} ${G - 120}`, stroke: SKY, "stroke-width": 6, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "2 16" }, svg));
      el("path", { d: `M30 ${G} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* can */
      const can = el("g", {}, svg);
      el("path", { d: "M-88 -40 C-150 -40 -150 40 -88 40", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, can);
      el("path", { d: "M86 4 L168 -74 L188 -56 L86 52 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, can);
      el("rect", { x: -88, y: -68, width: 176, height: 136, rx: 16, fill: "#fff" }, can);
      const water = el("rect", { x: -88, width: 176, fill: SKY, "clip-path": "url(#mgc-can)" }, can);
      el("rect", { x: -88, y: -68, width: 176, height: 136, rx: 16, fill: "none", stroke: INK, "stroke-width": 3 }, can);
      txt(svg, CXC, G - 44, "plan limits", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const pots = PX.map((x, i) => {
        const g = el("g", {}, svg), plant = el("g", {}, g);
        el("path", { d: "M0 0 V-34 M0 -16 C-26 -16 -30 -40 -30 -40 C-8 -42 0 -30 0 -16 M0 -26 C22 -26 28 -52 28 -52 C8 -52 0 -40 0 -26", stroke: INK, "stroke-width": 3, fill: MINT, "stroke-linejoin": "round", "stroke-linecap": "round" }, plant);
        plant.setAttribute("transform", "translate(0 -84)");
        el("path", { d: "M-40 -70 H40 L30 0 H-30 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("rect", { x: -46, y: -86, width: 92, height: 18, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        const lab = txt(g, 0, 34, i ? "thread" : "session", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        return { g, plant, lab, x };
      });
      const cap = strip(svg, 506, 720);
      return (t) => {
        tnow = t;
        const out = 1 - seg(t, 11.3, 11.9), proj = t >= 5, tilt = io(seg(t, 0.3, 1.0)) * out;
        const level = 1 - 0.1 * seg(t, 1.0, 5.0) - 0.68 * seg(t, 6.0, 11.0) + 0.78 * io(seg(t, 11.3, 11.9));
        const h = 124 * cl(level);
        water.setAttribute("y", 68 - h); water.setAttribute("height", h);
        tf(can, CXC, CYC - 6 * tilt, 1, 14 * tilt);
        const kp = io(seg(t, 5.0, 5.5)) - io(seg(t, 11.5, 12));
        knob.setAttribute("x", 446 + 184 * kp); knob.setAttribute("width", 184 - 50 * kp);
        pots.forEach((p, i) => {
          const inn = i ? oc(seg(t, 5.1 + i * 0.25, 5.8 + i * 0.25)) * out : 1;
          tf(p.g, p.x + (1 - inn) * 120, G);
          p.g.setAttribute("opacity", i ? cl(inn * 1.5) : 1);
          if (!i) p.lab.textContent = proj && t < 11.6 ? "thread" : "session";
          const on = (i ? seg(t, 6.0 + i * 0.2, 6.4 + i * 0.2) : seg(t, 1.0, 1.4)) * out;
          streams[i].setAttribute("opacity", on);
          streams[i].setAttribute("stroke-dashoffset", -t * 60);
          const grow = i ? 0.55 + 0.45 * seg(t, 6.2, 11) : 0.55 + 0.45 * seg(t, 1.2, 9);
          p.plant.setAttribute("transform", `translate(0 -84) scale(${grow})`);
        });
        cap.textContent = proj && t < 11.6 ? "A project uses your limits faster than a single session does" : "A single session";
      };
    },
  };

  /* ---- title card, 16 by 9: three spools, three threads running side by side ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 112, "CONCEPTS", { "font-family": MONO, "font-size": 20, "font-weight": 700, fill: MUTE, "letter-spacing": 3 });
      txt(svg, 64, 200, "Claude Code", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 286, "Projects", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 312 H372", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 370, "What they are and who can use them", { "font-size": 25, "font-weight": 500, fill: MUTE });
      el("rect", { x: 60, y: 408, width: 300, height: 48, rx: 24, fill: SOFT }, svg);
      txt(svg, 210, 439, "Checked 11 Oct 2026", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      [[YEL, 136], [BLUE, 270], [MINT, 404]].forEach(([c, y]) => {
        el("path", { d: `M790 ${y + 14} C740 ${y - 30} 700 ${y + 50} 650 ${y + 10} S590 ${y - 20} 566 ${y + 8}`, stroke: c, "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, svg);
        el("rect", { x: 786, y: y - 34, width: 84, height: 68, fill: c, stroke: INK, "stroke-width": 3 }, svg);
        el("path", { d: `M786 ${y - 17} H870 M786 ${y} H870 M786 ${y + 17} H870`, stroke: INK, "stroke-width": 3 }, svg);
        [y - 50, y + 34].forEach((yy) => el("rect", { x: 770, y: yy, width: 116, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg));
      });
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
