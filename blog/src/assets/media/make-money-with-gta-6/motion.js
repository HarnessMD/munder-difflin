/* Bright coded scenes for "How to make money from GTA 6". Vanilla JS, no library.
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
  const hint = (svg, s) => txt(svg, 44, 60, s, { "font-size": 18, "font-weight": 500, fill: MUTE });
  // shrink a text line until it fits a width
  const fit = (n, max) => { try { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", ((parseFloat(n.getAttribute("font-size")) * max) / w).toFixed(2)); } catch (e) { /* not laid out */ } };

  const SC = {};

  /* ---- 1. a signpost turns to show its two arms; the lit arm swaps on each turn ---- */
  SC.signpost = {
    dur: 8, still: 8,
    build(svg, api) {
      hint(svg, "Tap the post");
      const W = 318, ARMS = [
        { title: "Allowed", lines: ["Narrated Let's Play", "Cutscenes in a longer playthrough"], y: 122, d: -1 },
        { title: "Removed", lines: ["Endings", "Cutscene compilations", "Isolated cinematics", "Footage before release"], y: 290, d: 1 },
      ];
      const post = el("g", {}, svg);
      el("rect", { x: 26, y: 78, width: 748, height: 500, rx: 24, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, post);
      const NSS = { "vector-effect": "non-scaling-stroke" };
      const arms = ARMS.map((a) => {
        const h = 76 + a.lines.length * 28, cx = 10 + W / 2, mid = a.y + h / 2, g = el("g", {}, post);
        const shape = `M10 ${a.y} H${10 + W} L${42 + W} ${mid} L${10 + W} ${a.y + h} H10 Z`;
        const halo = el("path", Object.assign({ d: shape, fill: "none", stroke: YEL, "stroke-width": 16, "stroke-linejoin": "round" }, NSS), g);
        const board = el("path", Object.assign({ d: shape, fill: "#fff", stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, NSS), g);
        const rays = el("path", Object.assign({ d: `M${50 + W} ${mid - 18} l12 -10 M${52 + W} ${mid} h15 M${50 + W} ${mid + 18} l12 10`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, NSS), g);
        el("path", Object.assign({ d: `M${cx - 54} ${a.y + 56} H${cx + 54}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, NSS), g);
        const texts = [txt(g, cx, a.y + 42, a.title, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 })];
        a.lines.forEach((s, i) => texts.push(txt(g, cx, a.y + 84 + i * 28, s, { "text-anchor": "middle", "font-size": 18, "font-weight": 500 })));
        texts.forEach((n) => fit(n, W - 30));
        return { g, halo, board, rays, texts, cx, mid };
      });
      el("rect", { x: 386, y: 96, width: 28, height: 456, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3.5 }, post);
      const shine = el("rect", { x: 396, y: 110, width: 7, height: 430, rx: 3.5, fill: "#fff", opacity: 0.75 }, post);
      el("circle", { cx: 400, cy: 92, r: 17, fill: YEL, stroke: INK, "stroke-width": 3.5 }, post);
      arms.forEach((a) => el("circle", { cx: 400, cy: a.mid, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, post));
      el("path", { d: "M292 560 Q400 506 508 560 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, post);
      el("path", { d: "M80 560 H720", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, post);
      let user = null, lastTh = 180;
      button(post, "Signpost: turn it and light the other arm", () => { const k = Math.round(lastTh / 180); user = { a: lastTh, b: (k + 1) * 180, at: api.now() }; api.poke(); });
      // degrees: 180 shows Removed lit on the left, 360 shows Allowed lit on the left
      const auto = (t) => (t < 4.6 ? 180 + 180 * io(seg(t, 0.4, 2.8)) : 360 + 180 * io(seg(t, 4.6, 7)));
      return (t, now) => {
        const th = user ? user.a + (user.b - user.a) * io(seg(now - user.at, 0, 2)) : auto(t);
        lastTh = th;
        const r = (th * Math.PI) / 180, c = Math.cos(r), k = Math.round(th / 180), lit = k % 2 === 0 ? 0 : 1, glow = 1 - seg(Math.abs(th - k * 180), 3, 40);
        shine.setAttribute("x", 396 + 8 * Math.sin(r));
        arms.forEach((a, i) => {
          const sx = ARMS[i].d * c, sg = sx < 0 ? -1 : 1, on = i === lit ? glow : 0;
          a.g.setAttribute("transform", `translate(400 0) scale(${Math.abs(sx) < 0.03 ? 0.03 * sg : sx} 1)`);
          a.g.setAttribute("opacity", Math.abs(sx) < 0.04 ? 0 : 1);
          a.texts.forEach((n) => n.setAttribute("transform", `translate(${a.cx} 0) scale(${sg} 1) translate(${-a.cx} 0)`));
          a.board.setAttribute("fill", on > 0.5 ? YEL : "#fff");
          a.halo.setAttribute("opacity", on);
          a.rays.setAttribute("opacity", on);
        });
      };
    },
  };

  /* ---- 2. a vending machine: an Approved coin releases a card, a Not approved coin rolls back out ---- */
  const PAYER = [
    (g) => { // a budget jar: the campaign budget
      el("rect", { x: -10, y: -16, width: 20, height: 6, rx: 2, fill: LIL, stroke: INK, "stroke-width": 2 }, g);
      el("path", { d: "M-9 -10 H9 Q13 -10 13 -6 V11 Q13 15 9 15 H-9 Q-13 15 -13 11 V-6 Q-13 -10 -9 -10 Z", fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
      [[-5, 9], [5, 9], [0, 1]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 4.5, fill: YEL, stroke: INK, "stroke-width": 1.5 }, g));
    },
    (g) => { // a video frame carrying an ad: a share of ad revenue
      el("rect", { x: -15, y: -13, width: 30, height: 22, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2 }, g);
      el("rect", { x: 0, y: -9, width: 11, height: 7, rx: 1.5, fill: YEL, stroke: INK, "stroke-width": 1.5 }, g);
      el("path", { d: "M-12 15 H12", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
      el("circle", { cx: -3, cy: 15, r: 3, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, g);
    },
    (g) => { // a page carrying an ad block: ads on pages you own
      el("rect", { x: -13, y: -16, width: 26, height: 32, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
      el("path", { d: "M-13 -9 H13 M-8 -3 H8 M-8 2 H4", stroke: INK, "stroke-width": 1.8, "stroke-linecap": "round" }, g);
      el("rect", { x: -8, y: 7, width: 16, height: 5, rx: 1, fill: YEL, stroke: INK, "stroke-width": 1.5 }, g);
    },
    (g) => { // headphones: the streamer who hires you
      el("path", { d: "M-12 3 V0 A12 12 0 0 1 12 0 V3", fill: "none", stroke: INK, "stroke-width": 3 }, g);
      [-16, 9].forEach((x) => el("rect", { x, y: -1, width: 7, height: 13, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2 }, g));
      el("path", { d: "M-12 12 Q-9 17 -2 16", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
      el("circle", { cx: 0, cy: 16, r: 2.5, fill: MINT, stroke: INK, "stroke-width": 1.5 }, g);
    },
  ];
  SC.vending = {
    dur: 8, still: 8,
    build(svg, api) {
      const NAMES = ["Clipping", "Channels", "Guide site", "Editing", "Streaming", "Community"];
      const COL = [YEL, BLUE, LIL, SKY, MINT, SOFT], PAY = [0, 1, 2, 3, 1, 2], AUTO = 3, CX = [152, 276, 400], TOP = [120, 272];
      hint(svg, "Tap a slot");
      el("path", { d: "M40 560 H780", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      [96, 540].forEach((x) => el("rect", { x, y: 538, width: 44, height: 22, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: 60, y: 84, width: 560, height: 464, rx: 28, fill: BLUE, stroke: INK, "stroke-width": 4 }, svg);
      el("rect", { x: 92, y: 112, width: 368, height: 316, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      [264, 418].forEach((y) => el("path", { d: `M100 ${y} H452`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg));
      let user = null;
      const cells = NAMES.map((n, i) => {
        const cx = CX[i % 3], top = TOP[Math.floor(i / 3)], g = el("g", {}, svg);
        el("rect", { x: cx - 58, y: top - 4, width: 116, height: 142, rx: 12, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        const card = el("rect", { x: cx - 30, y: top + 6, width: 60, height: 72, rx: 8, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: `M${cx - 18} ${top + 24} H${cx + 18} M${cx - 18} ${top + 34} H${cx + 8}`, stroke: MUTE, "stroke-width": 2, "stroke-linecap": "round" }, g);
        const coil = el("path", { d: `M${cx - 35} ${top + 90} q5 -9 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0`, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        const plate = el("rect", { x: cx - 54, y: top + 102, width: 108, height: 28, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, cx, top + 121, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 });
        button(g, `${n}: release its card to see who pays for it`, () => { const now = api.now(); user = { slot: i, prev: user ? user.slot : AUTO, at: now }; api.poke(); });
        return { card, coil, plate, cx, top };
      });
      const fall = el("rect", { width: 60, height: 72, rx: 8, stroke: INK, "stroke-width": 2.5, opacity: 0 }, svg);
      // the pickup tray and the six cards it can hold
      el("rect", { x: 120, y: 440, width: 312, height: 96, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const faces = NAMES.map((n, i) => {
        const g = el("g", { opacity: 0 }, svg);
        el("rect", { x: -112, y: -30, width: 224, height: 60, rx: 12, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        el("circle", { cx: -78, cy: 0, r: 22, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        PAYER[PAY[i]](el("g", { transform: "translate(-78 0)" }, g));
        txt(g, 22, 6, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        return g;
      });
      el("rect", { x: 120, y: 508, width: 312, height: 28, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      // the coin panel: slot, a window that keeps the accepted coin, a lamp, a return cup
      el("rect", { x: 474, y: 112, width: 124, height: 418, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 506, y: 134, width: 60, height: 30, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M520 149 H552", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("rect", { x: 492, y: 188, width: 88, height: 112, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const lamp = el("circle", { cx: 536, cy: 336, r: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 498, y: 440, width: 76, height: 58, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M506 470 H566", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const coin = (no) => {
        const g = el("g", { opacity: 0 }, svg);
        el("circle", { r: 46, fill: no ? SOFT : YEL, stroke: INK, "stroke-width": 3 }, g);
        if (no) { txt(g, 0, -3, "Not", { "text-anchor": "middle", "font-size": 15, "font-weight": 700 }); txt(g, 0, 15, "approved", { "text-anchor": "middle", "font-size": 15, "font-weight": 700 }); }
        else txt(g, 0, 5, "Approved", { "text-anchor": "middle", "font-size": 15, "font-weight": 700 });
        return g;
      };
      const coinA = coin(false), coinN = coin(true);
      const SLOT = [536, 149], WIN = [536, 244], REST = [700, 512];
      const fly = (g, t, a) => { // in from the right, over the slot, then into it
        const p = io(seg(t, a, a + 0.75)), s = seg(t, a + 0.75, a + 1.1);
        g.setAttribute("opacity", seg(t, a, a + 0.2) * (1 - seg(s, 0.6, 1)));
        tf(g, 712 + (SLOT[0] - 712) * p, 156 + (SLOT[1] - 156) * p - 46 * Math.sin(Math.PI * p), 1 - 0.85 * s);
      };
      const inWin = (k) => tf(coinA, WIN[0], WIN[1] - 40 * (1 - ob(k)), 0.82);
      const rolled = (p) => { const q = oc(p); tf(coinN, 536 + (REST[0] - 536) * q, 470 + (REST[1] - 470) * q * q - 30 * Math.sin(Math.PI * cl(p * 1.4)), 0.4 + 0.6 * cl(p * 3), -360 + 360 * q); };
      const release = (i, u, op = 1) => { // u: seconds since this slot started its release
        cells.forEach((c, j) => { c.coil.setAttribute("transform", j === i && u >= 0 ? `translate(${-10 * ((seg(u, 0, 0.5) * 2) % 1)} 0)` : ""); c.plate.setAttribute("fill", j === i && u >= 0 ? YEL : "#fff"); });
        const c = cells[i], bump = Math.sin(Math.PI * seg(u, 0.2, 0.5));
        c.card.setAttribute("transform", `translate(${c.cx} ${c.top + 42}) scale(${1 + 0.1 * bump}) translate(${-c.cx} ${-c.top - 42})`);
        const p = seg(u, 0.5, 1);
        fall.setAttribute("fill", COL[i]); fall.setAttribute("x", c.cx - 30); fall.setAttribute("y", c.top + 6 + (350 - c.top - 6) * p * p);
        fall.setAttribute("opacity", u > 0.5 && u < 1 ? 1 - seg(p, 0.7, 1) : 0);
        const q = seg(u, 1, 1.45);
        faces[i].setAttribute("opacity", op * seg(q, 0, 0.3));
        tf(faces[i], 276, 474 + 40 * (1 - ob(q)));
      };
      return (t, now) => {
        faces.forEach((f) => f.setAttribute("opacity", 0));
        cells.forEach((c) => c.card.removeAttribute("transform"));
        if (user) {
          const u = now - user.at;
          coinA.setAttribute("opacity", 1); inWin(1);
          coinN.setAttribute("opacity", 1); rolled(1);
          if (user.prev !== user.slot && u < 0.3) { faces[user.prev].setAttribute("opacity", 1 - seg(u, 0, 0.25)); tf(faces[user.prev], 276, 474 + 30 * seg(u, 0, 0.25)); }
          release(user.slot, u);
          lamp.setAttribute("fill", u >= 0 && u < 1.6 ? MINT : "#fff");
          return;
        }
        const f0 = 1 - seg(t, 0, 0.4);
        if (t < 0.4) {
          release(AUTO, 9, f0);
          coinA.setAttribute("opacity", f0); inWin(1);
          coinN.setAttribute("opacity", f0); rolled(1);
          lamp.setAttribute("fill", "#fff");
          return;
        }
        if (t < 1.7) fly(coinA, t, 0.5);
        else { coinA.setAttribute("opacity", 1); inWin(seg(t, 1.7, 2.2)); }
        lamp.setAttribute("fill", t > 1.8 && t < 4 ? MINT : "#fff");
        release(AUTO, t - 2.3);
        if (t < 5.9) { fly(coinN, t, 4.3); if (t < 4.3) coinN.setAttribute("opacity", 0); }
        else { coinN.setAttribute("opacity", 1); rolled(seg(t, 5.9, 7.1)); }
      };
    },
  };

  /* ---- 3. a tool belt: five pouches lift their cards in turn, then the You approve buckle clicks shut ---- */
  const JOB = [
    (g) => { // Research: a magnifier over notes
      el("path", { d: "M-14 -12 H4 M-14 -5 H0 M-14 2 H-2", stroke: MUTE, "stroke-width": 2, "stroke-linecap": "round" }, g);
      el("circle", { cx: 2, cy: -2, r: 10, fill: "none", stroke: INK, "stroke-width": 3 }, g);
      el("path", { d: "M9 5 L17 13", stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round" }, g);
    },
    (g) => { // Cutting: scissors
      el("path", { d: "M-5 6 L11 -16 M5 6 L-11 -16", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
      [-8, 8].forEach((x) => el("circle", { cx: x, cy: 11, r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g));
      el("circle", { cx: 0, cy: -3, r: 2, fill: INK }, g);
    },
    (g) => { // Captions: a frame with two caption bars
      el("rect", { x: -17, y: -14, width: 34, height: 28, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g);
      el("rect", { x: -12, y: 1, width: 24, height: 4, rx: 2, fill: INK }, g);
      el("rect", { x: -8, y: 8, width: 16, height: 3.5, rx: 1.75, fill: INK }, g);
    },
    (g) => { // Titles: a bold T
      el("path", { d: "M-14 -14 H14 V-5 H5 V15 H-5 V-5 H-14 Z", fill: BLUE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    },
    (g) => { // Tracking: a sheet with ticked rows
      el("rect", { x: -14, y: -17, width: 28, height: 34, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
      [-8, 1, 10].forEach((y) => { el("path", { d: `M-9 ${y} l3 3 l5 -6`, fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, g); el("path", { d: `M3 ${y} H9`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g); });
    },
  ];
  SC.toolbelt = {
    dur: 8.4, still: 8.4,
    build(svg, api) {
      const NAMES = ["Research", "Cutting", "Captions", "Titles", "Tracking"], COL = [YEL, SKY, LIL, MINT, SOFT];
      const X = [92, 200, 308, 416, 524], L = NAMES.map((_, i) => 0.7 + 0.85 * i), SHUT = [5.1, 5.45];
      hint(svg, "Tap a pouch");
      el("rect", { x: -20, y: 300, width: 616, height: 44, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M0 309 H590 M0 335 H590", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "6 6" }, svg);
      el("path", { d: "M594 306 H616 Q634 322 616 338 H594 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      let sel = -1, selAt = -9, prev = -1, prevAt = -9, pinned = false;
      const pouches = NAMES.map((n, i) => {
        const g = el("g", { transform: `translate(${X[i]} 0)` }, svg);
        el("rect", { x: -52, y: 92, width: 104, height: 388, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        const card = el("g", {}, g);
        const halo = el("rect", { x: -43, y: -7, width: 86, height: 106, rx: 15, fill: "none", stroke: YEL, "stroke-width": 8, opacity: 0 }, card);
        el("rect", { x: -36, y: 0, width: 72, height: 92, rx: 10, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, card);
        el("circle", { cx: 0, cy: 44, r: 26, fill: "#fff", stroke: INK, "stroke-width": 2 }, card);
        const icon = el("g", {}, card); JOB[i](icon);
        const check = el("g", {}, card);
        el("circle", { cx: 32, cy: 4, r: 10, fill: MINT, stroke: INK, "stroke-width": 2 }, check);
        el("path", { d: "M27 4 l3.5 3.5 l6 -7", fill: "none", stroke: INK, "stroke-width": 2.2, "stroke-linecap": "round", "stroke-linejoin": "round" }, check);
        el("path", { d: "M-48 322 H48 V448 Q48 470 26 470 H-26 Q-48 470 -48 448 Z", fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const flap = el("g", {}, g);
        el("path", { d: "M-48 326 H48 V364 Q0 388 -48 364 Z", fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, flap);
        el("circle", { cx: 0, cy: 370, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, flap);
        el("rect", { x: -44, y: 412, width: 88, height: 30, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, 0, 432, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 });
        button(g, `${n} pouch: show its one job`, () => { const now = api.now(); prev = sel; prevAt = now; sel = sel === i ? -1 : i; selAt = now; pinned = true; api.poke(); });
        return { card, halo, icon, check, flap };
      });
      const buck = el("g", {}, svg);
      el("rect", { x: 750, y: 300, width: 90, height: 44, fill: BLUE, stroke: INK, "stroke-width": 3 }, buck);
      el("path", { d: "M756 309 H840 M756 335 H840", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "6 6" }, buck);
      el("rect", { x: 604, y: 280, width: 152, height: 84, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3.5 }, buck);
      const plate = el("rect", { x: 616, y: 294, width: 128, height: 56, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2 }, buck);
      txt(buck, 680, 328, "You approve", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
      const burst = el("path", { d: "M598 270 l-12 -12 M680 266 v-18 M762 270 l12 -12 M598 374 l-12 12 M762 374 l12 12", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", opacity: 0 }, svg);
      return (t, now) => {
        const te = pinned ? 8.4 : t, f0 = te < 0.45 ? 1 - io(seg(te, 0, 0.45)) : -1;
        pouches.forEach((p, i) => {
          const up = f0 >= 0 ? f0 : ob(seg(te, L[i], L[i] + 0.6)), k = i === sel ? oc(seg(now - selAt, 0, 0.4)) : i === prev ? 1 - oc(seg(now - prevAt, 0, 0.3)) : 0;
          p.card.setAttribute("transform", `translate(0 ${306 - 190 * up - 18 * k}) translate(0 46) scale(${1 + 0.18 * k}) translate(0 -46)`);
          p.halo.setAttribute("opacity", k);
          p.icon.setAttribute("transform", `translate(0 44) rotate(${k * 9 * Math.sin(now * 6)}) scale(${1 + 0.15 * k})`);
          p.check.setAttribute("opacity", f0 >= 0 ? f0 : seg(te, L[i] + 0.6, L[i] + 0.8));
          p.flap.setAttribute("transform", `translate(0 326) scale(1 ${1 - 1.4 * cl(up)}) translate(0 -326)`);
        });
        const shut = f0 >= 0 ? f0 : io(seg(te, SHUT[0], SHUT[1])), click = f0 < 0 ? seg(te, SHUT[1], SHUT[1] + 0.6) : 1;
        buck.setAttribute("transform", `translate(${44 * (1 - shut)} 0)`);
        plate.setAttribute("fill", shut > 0.98 ? MINT : "#fff");
        burst.setAttribute("opacity", click > 0 && click < 1 ? 1 - click : 0);
      };
    },
  };

  /* ---- title card, 16 by 9, plays once ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.4, still: 3.4, once: true,
    build(svg) {
      el("rect", { x: 64, y: 40, width: 148, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 138, 68, "Use Cases", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 68, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      fit(txt(svg, 64, 168, "Make money from GTA 6", { "font-size": 66, "font-weight": 700 }), 832);
      el("path", { d: "M66 196 H280", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 250, "6 hustles and the AI agent workflow for each", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const F = [YEL, BLUE, LIL, SKY, MINT, SOFT], RY = [300, 370, 440], HUB = [380, 370, 200, 50];
      const lines = [0, 1, 2, 3, 4, 5].map((i) => { const left = i < 3, y = RY[i % 3] + 25, x0 = left ? 284 : 676, x1 = left ? HUB[0] : HUB[0] + HUB[2]; return el("path", { d: `M${x0} ${y} L${x1} ${HUB[1] + 25}`, stroke: INK, "stroke-width": 1.5, "stroke-linecap": "round", opacity: 0 }, svg); });
      const hub = el("g", {}, svg);
      el("rect", { x: -100, y: -25, width: 200, height: 50, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, hub);
      txt(hub, 0, 7, "You approve", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const tiles = ["Clipping", "Channels", "Guide site", "Editing", "Streaming", "Community"].map((n, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: 0, y: 0, width: 220, height: 50, rx: 14, fill: F[i], stroke: INK, "stroke-width": 2 }, g);
        txt(g, 110, 32, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return g;
      });
      return (t) => {
        const h = ob(seg(t, 0.1, 0.5));
        hub.setAttribute("opacity", seg(t, 0.1, 0.3)); tf(hub, 480, 395, 0.6 + 0.4 * h);
        tiles.forEach((g, i) => {
          const a = 0.4 + i * 0.3, k = oc(seg(t, a, a + 0.6)), left = i < 3;
          g.setAttribute("opacity", seg(t, a, a + 0.25));
          tf(g, (left ? 64 : 676) + (left ? -80 : 80) * (1 - k), RY[i % 3]);
          lines[i].setAttribute("opacity", seg(t, a + 0.45, a + 0.75));
        });
      };
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
    const at = () => { const u = clock() + off; return sc.once ? cl(u, 0, sc.dur) : ((u % sc.dur) + sc.dur) % sc.dur; };
    const frame = () => { draw(held ? sc.still : at(), clock()); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && !(sc.once && clock() + off >= sc.dur)) raf = requestAnimationFrame(tick); };
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
