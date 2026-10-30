/* Bright coded scenes for "What is Instinct AI?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const ring = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, g);
  const measure = (svg, s, a) => { const n = txt(svg, 0, -99, s, a), w = n.getComputedTextLength(); n.remove(); return w; };
  /* a toggle that eases over half a second, or snaps under reduced motion */
  const flip = (s, now) => { const p = RM ? 1 : seg(now - s.at, 0, 0.5); return s.on ? p : 1 - p; };
  const squashY = (n, cy, sy) => n.setAttribute("transform", `translate(0 ${cy}) scale(1 ${Math.max(sy, 0.001)}) translate(0 ${-cy})`);
  const squashX = (n, cx, sx) => n.setAttribute("transform", `translate(${cx} 0) scale(${Math.max(sx, 0.001)} 1) translate(${-cx} 0)`);
  const tickPath = (p, x, y, s = 1) => el("path", { d: `M${x - 7 * s} ${y} l${5 * s} ${5 * s} l${10 * s} ${-11 * s}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, p);

  const SC = {};

  /* ---- 1. three messages fold into done cards ---- */
  SC.bubbles = {
    dur: 8, still: 7,
    build(svg, api) {
      const root = el("g", {}, svg);
      el("rect", { x: 240, y: 28, width: 320, height: 544, rx: 46, fill: "#fff", stroke: INK, "stroke-width": 3 }, root);
      el("rect", { x: 360, y: 48, width: 80, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2 }, root);
      el("rect", { x: 264, y: 496, width: 272, height: 44, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 2 }, root);
      const R = 528, MSG = ["Book a train home", "Order groceries", "Send flowers"];
      let touched = false;
      const msgs = MSG.map((s, i) => {
        const cy = 170 + i * 110, g = el("g", {}, root);
        const bw = measure(svg, s, { "font-size": 22 }) + 44, bx = R - bw, by = cy - 30;
        const bub = el("g", {}, g);
        el("path", { d: `M${bx + 24} ${by} H${R - 24} Q${R} ${by} ${R} ${by + 24} V${by + 54} Q${R} ${by + 60} ${R - 6} ${by + 60} H${bx + 24} Q${bx} ${by + 60} ${bx} ${by + 36} V${by + 24} Q${bx} ${by} ${bx + 24} ${by} Z`, fill: BLUE, stroke: INK, "stroke-width": 3 }, bub);
        txt(bub, R - 22, cy + 8, s, { "font-size": 22, "text-anchor": "end" });
        const cw = measure(svg, s, { "font-size": 19 }) + 76, cx = R - cw;
        const card = el("g", {}, g);
        el("rect", { x: cx, y: cy - 24, width: cw, height: 48, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
        el("circle", { cx: cx + 26, cy, r: 14, fill: MINT, stroke: INK, "stroke-width": 2 }, card);
        tickPath(card, cx + 26, cy + 1, 0.8);
        txt(card, cx + 50, cy + 7, s, { "font-size": 19 });
        ring(g, bx - 8, by - 8, bw + 16, 76, 28);
        const st = { on: false, at: -99 };
        button(g, s, () => { touched = true; st.on = !st.on; st.at = api.now(); api.poke(); });
        return { g, bub, card, cy, st };
      });
      return (t, now) => {
        const T = touched ? 7 : t;
        root.setAttribute("opacity", 1 - seg(T, 7.6, 8));
        msgs.forEach((m, i) => {
          const a = 0.4 + i, f = 3.4 + i * 0.6, app = ob(seg(T, a, a + 0.45));
          const k = touched ? 1 - flip(m.st, now) : io(seg(T, f, f + 0.6));
          m.g.setAttribute("opacity", seg(T, a, a + 0.15));
          m.g.setAttribute("transform", `translate(0 ${24 * (1 - app)})`);
          squashY(m.bub, m.cy, k < 0.5 ? 1 - 2 * k : 0);
          squashY(m.card, m.cy, k < 0.5 ? 0 : 2 * k - 1);
        });
      };
    },
  };

  /* ---- 2. a private beta guest list on a clipboard ---- */
  SC.guestlist = {
    dur: 7, still: 6,
    build(svg, api) {
      const root = el("g", {}, svg);
      const C = 290, board = el("g", {}, root);
      el("rect", { x: 130, y: 64, width: 320, height: 490, rx: 26, fill: BLUE, stroke: INK, "stroke-width": 3 }, board);
      const paper = el("g", {}, board);
      el("rect", { x: 154, y: 112, width: 272, height: 418, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, paper);
      const p1 = el("g", {}, paper), p2 = el("g", {}, paper);
      const title = el("g", {}, p1);
      txt(title, C, 180, "Private beta", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      el("path", { d: `M${C - 96} 200 H${C + 96}`, stroke: YEL, "stroke-width": 8, "stroke-linecap": "round" }, title);
      const rows = [["Invited", true], ["Invited", true], ["Waiting", false]].map(([s, ok], i) => {
        const y = 270 + i * 80, g = el("g", {}, p1);
        const box = el("rect", { x: 186, y: y - 22, width: 40, height: 40, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const tk = ok ? tickPath(g, 206, y, 1.2) : null;
        txt(g, 246, y + 10, s, { "font-size": 30 });
        el("path", { d: `M186 ${y + 36} H394`, stroke: SOFT, "stroke-width": 3, "stroke-linecap": "round" }, g);
        return { g, box, tk, ok };
      });
      txt(p2, C, 300, "Price not", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      txt(p2, C, 352, "published", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      el("path", { d: `M${C - 90} 380 H${C + 90}`, stroke: LIL, "stroke-width": 8, "stroke-linecap": "round" }, p2);
      el("rect", { x: 230, y: 40, width: 120, height: 50, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, board);
      el("rect", { x: 266, y: 54, width: 48, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2 }, board);
      ring(board, 118, 28, 344, 538, 32);
      const note = el("g", {}, root);
      el("rect", { x: 0, y: 0, width: 190, height: 110, rx: 10, fill: SKY, stroke: INK, "stroke-width": 3 }, note);
      el("rect", { x: 65, y: -12, width: 60, height: 22, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2 }, note);
      txt(note, 95, 66, "18 or older", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const st = { on: false, at: -99 };
      let touched = false;
      button(board, "Private beta guest list", () => { touched = true; st.on = !st.on; st.at = api.now(); api.poke(); });
      return (t, now) => {
        const T = touched ? 6 : t;
        root.setAttribute("opacity", 1 - seg(T, 6.6, 7));
        const d = ob(seg(T, 0.1, 0.9));
        board.setAttribute("transform", `translate(0 ${-60 * (1 - d)})`); board.setAttribute("opacity", seg(T, 0.1, 0.3));
        p1.setAttribute("opacity", 1);
        title.setAttribute("opacity", seg(T, 0.9, 1.3));
        rows.forEach((r, i) => {
          const a = 1.3 + i * 0.5, k = oc(seg(T, a, a + 0.4));
          r.g.setAttribute("opacity", k); r.g.setAttribute("transform", `translate(${30 * (1 - k)} 0)`);
          if (r.ok) { const p = ob(seg(T, a + 0.4, a + 0.75)); r.box.setAttribute("fill", p > 0.05 ? MINT : "#fff"); r.tk.setAttribute("opacity", p > 0.05 ? 1 : 0); r.tk.setAttribute("transform", `translate(206 ${270 + i * 80}) scale(${cl(p, 0, 1.3)}) translate(-206 ${-(270 + i * 80)})`); }
          else { const w = seg(T, 3.0, 3.6); r.box.setAttribute("transform", `rotate(${Math.sin(w * Math.PI * 4) * 8 * (1 - w)} 206 ${270 + i * 80})`); }
        });
        const n = oc(seg(T, 3.4, 4.1));
        note.setAttribute("opacity", seg(T, 3.4, 3.6)); note.setAttribute("transform", `translate(${500 + 80 * (1 - n)} 170) rotate(${4 + 10 * (1 - n)})`);
        const f = touched ? flip(st, now) : 0;
        squashX(paper, C, Math.abs(Math.cos(f * Math.PI)));
        p1.setAttribute("display", f < 0.5 ? "inline" : "none"); p2.setAttribute("display", f < 0.5 ? "none" : "inline");
      };
    },
  };

  /* ---- 3. a mixing desk: one slider up, one held down ---- */
  SC.mixer = {
    dur: 7, still: 6,
    build(svg, api) {
      const root = el("g", {}, svg);
      el("rect", { x: 70, y: 20, width: 660, height: 476, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, root);
      const TOP = 170, BOT = 320, LY = [108, 376];
      const ch = [
        { c: 230, name: "Your messages and use", lamp: "Used to train models", up: true, col: YEL },
        { c: 570, name: "Google Workspace data", lamp: "Not used to train", up: false, col: MINT },
      ];
      let sel = -1, selAt = -99, touched = false;
      ch.forEach((s, i) => {
        const g = el("g", {}, root), ly = LY[i], lt = s.up ? 66 : 432;
        el("rect", { x: s.c - 8, y: TOP - 10, width: 16, height: BOT - TOP + 20, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        s.fill = el("rect", { x: s.c - 8, y: BOT, width: 16, height: 10, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g);
        for (let k = 0; k <= 4; k++) { const y = TOP + (k * (BOT - TOP)) / 4; el("path", { d: `M${s.c - 54} ${y} H${s.c - 34} M${s.c + 34} ${y} H${s.c + 54}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g); }
        s.rays = el("g", { opacity: 0 }, g);
        for (let k = 0; k < 8; k++) { const a = ((k + 0.5) / 8) * Math.PI * 2; el("path", { d: `M${s.c + Math.cos(a) * 24} ${ly + Math.sin(a) * 24} L${s.c + Math.cos(a) * 32} ${ly + Math.sin(a) * 32}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, s.rays); }
        s.bulb = el("circle", { cx: s.c, cy: ly, r: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        txt(g, s.c, lt, s.lamp, { "text-anchor": "middle", "font-size": 22 });
        txt(g, s.c, 474, s.name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        s.knob = el("g", {}, g);
        el("rect", { x: -38, y: -16, width: 76, height: 32, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, s.knob);
        el("path", { d: "M-22 0 H22", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, s.knob);
        ring(g, s.c - 150, 32, 300, 456, 22);
        button(g, `${s.name}: ${s.lamp}`, () => { touched = true; sel = i; selAt = api.now(); api.poke(); });
      });
      const card = el("g", {}, svg);
      el("rect", { x: 110, y: 508, width: 580, height: 84, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
      txt(card, 400, 542, "Privacy policy, read 30 Oct 2026", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      const line = txt(card, 400, 574, "", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      return (t, now) => {
        const T = touched ? 6 : t;
        root.setAttribute("opacity", 1 - seg(T, 6.6, 7));
        ch.forEach((s, i) => {
          const v = s.up ? io(seg(T, 1.0, 3.0)) : 0, y = BOT - (BOT - TOP) * v;
          tf(s.knob, s.c, y); s.fill.setAttribute("y", y); s.fill.setAttribute("height", BOT + 10 - y);
          const lit = s.up ? seg(T, 2.9, 3.1) : seg(T, 3.5, 3.7), pop = ob(lit);
          s.bulb.setAttribute("fill", lit > 0.5 ? s.col : "#fff");
          s.rays.setAttribute("opacity", lit > 0.5 ? 1 : 0);
          s.rays.setAttribute("transform", `translate(${s.c} ${LY[i]}) scale(${0.6 + 0.4 * cl(pop, 0, 1.2)}) translate(${-s.c} ${-LY[i]})`);
        });
        const k = sel < 0 ? 0 : RM ? 1 : oc(seg(now - selAt, 0, 0.35));
        card.setAttribute("opacity", k); card.setAttribute("transform", `translate(0 ${16 * (1 - k)})`);
        line.textContent = sel < 0 ? "" : ch[sel].lamp;
      };
    },
  };

  /* ---- 4. six mailboxes, six ways in ---- */
  SC.mailboxes = {
    dur: 8, still: 7,
    build(svg, api) {
      const root = el("g", {}, svg);
      const BOX = [
        ["Poke", ["Text"], "No price in list", SKY, YEL],
        ["Munder Difflin", ["Desktop", "and Slack"], "Free, open source", YEL, BLUE],
        ["Folk", ["iMessage"], "Free, Pro $8.33 a month", LIL, YEL],
        ["Martin", ["SMS and", "phone"], "From $21 a month", MINT, LIL],
        ["Comma", ["Signal and", "Telegram"], "Free to start, open source", BLUE, YEL],
        ["Maverick", ["iMessage"], "Free beta, Pro €27 a month", SKY, LIL],
      ];
      const G = 352;
      el("path", { d: `M30 ${G} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, root);
      let sel = -1, selAt = -99, touched = false;
      const boxes = BOX.map(([name, tag, price, body, flag], i) => {
        const cx = 72 + i * 125, g = el("g", {}, root), up = el("g", {}, g);
        const nm = name.split(" ");
        nm.forEach((w, j) => txt(up, cx, 150 - (nm.length - 1 - j) * 22, w, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 }));
        el("rect", { x: cx - 7, y: 262, width: 14, height: G - 262, fill: "#fff", stroke: INK, "stroke-width": 3 }, up);
        const fl = el("g", {}, up);
        el("path", { d: `M0 0 V-40`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, fl);
        el("path", { d: "M0 -40 H22 L16 -32 L22 -24 H0 Z", fill: flag, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, fl);
        el("path", { d: `M${cx - 36} 264 V212 A36 36 0 0 1 ${cx + 36} 212 V264 Z`, fill: body, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, up);
        el("path", { d: `M${cx - 16} 214 H${cx + 16}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, up);
        el("circle", { cx: cx + 36, cy: 238, r: 4, fill: INK }, up);
        const tg = el("g", {}, g), tb = el("rect", { x: cx - 56, y: 372, width: 112, height: 60, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tg);
        tag.forEach((w, j) => txt(tg, cx, 408 + (j - (tag.length - 1) / 2) * 21, w, { "text-anchor": "middle", "font-size": 17, "font-weight": 600 }));
        ring(g, cx - 61, 108, 122, 330, 18);
        button(g, `${name}: ${tag.join(" ")}. ${price}`, () => { touched = true; sel = i; selAt = api.now(); api.poke(); });
        return { cx, up, fl, tg, tb, g };
      });
      const card = el("g", {}, svg);
      el("rect", { x: 100, y: 478, width: 600, height: 72, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, card);
      const line = txt(card, 400, 522, "", { "text-anchor": "middle", "font-size": 24 });
      const ln = el("tspan", { "font-family": MONO, "font-weight": 700 }, line), lp = el("tspan", { "font-weight": 500, dx: 14 }, line);
      return (t, now) => {
        const T = touched ? 7 : t;
        root.setAttribute("opacity", 1 - seg(T, 7.6, 8));
        boxes.forEach((b, i) => {
          const a = 0.2 + i * 0.15, k = ob(seg(T, a, a + 0.5));
          b.up.setAttribute("opacity", seg(T, a, a + 0.1));
          b.up.setAttribute("transform", `translate(0 ${G}) scale(1 ${Math.max(k, 0.001)}) translate(0 ${-G})`);
          const f = 1.6 + i * 0.55, r = ob(seg(T, f, f + 0.45));
          b.fl.setAttribute("transform", `translate(${b.cx + 40} 248) rotate(${90 - 90 * r})`);
          const q = oc(seg(T, f + 0.1, f + 0.45));
          b.tg.setAttribute("opacity", q); b.tg.setAttribute("transform", `translate(0 ${-14 * (1 - q)})`);
          b.tb.setAttribute("fill", i === sel ? YEL : "#fff");
        });
        const k = sel < 0 ? 0 : RM ? 1 : oc(seg(now - selAt, 0, 0.35));
        card.setAttribute("opacity", k); card.setAttribute("transform", `translate(0 ${16 * (1 - k)})`);
        if (sel >= 0) { ln.textContent = BOX[sel][0]; lp.textContent = BOX[sel][2]; }
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 84, width: 132, height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 130, 110, "Concepts", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 64, 222, "What is", { "font-size": 76, "font-weight": 700 });
      txt(svg, 64, 306, "Instinct AI?", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 334 H420", stroke: LIL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 392, "Private beta, plus 6 alternatives", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 446, "Checked 30 Oct 2026", { "font-family": MONO, "font-size": 18, "font-weight": 500, fill: MUTE });
      const bub = (x, y, w, col, right) => {
        const h = 70, r = 26, g = el("g", {}, svg);
        const d = right
          ? `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - 6} Q${x + w} ${y + h} ${x + w - 6} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`
          : `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + 6} Q${x} ${y + h} ${x} ${y + h - 6} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
        el("path", { d, fill: col, stroke: INK, "stroke-width": 3 }, g);
        return g;
      };
      bub(640, 136, 210, LIL, false);
      [0, 1, 2].forEach((k) => el("circle", { cx: 690 + k * 26, cy: 171, r: 7, fill: INK }, svg));
      bub(660, 238, 236, BLUE, true);
      el("rect", { x: 688, y: 262, width: 150, height: 10, rx: 5, fill: "#fff" }, svg);
      el("rect", { x: 688, y: 282, width: 96, height: 10, rx: 5, fill: "#fff" }, svg);
      bub(640, 340, 196, SKY, false);
      el("circle", { cx: 680, cy: 375, r: 16, fill: MINT, stroke: INK, "stroke-width": 2.5 }, svg);
      tickPath(svg, 680, 376, 0.9);
      el("rect", { x: 708, y: 370, width: 100, height: 10, rx: 5, fill: "#fff" }, svg);
      return () => {};
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = RM;
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
