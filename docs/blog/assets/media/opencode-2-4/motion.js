/* Bright coded scenes for "OpenCode 2.4: built in browser, automations and upgrade notes". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 24, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const iob = (x) => { const c = 1.7; x = cl(x); return x < 0.5 ? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2 : (Math.pow(2 * x - 2, 2) * ((c + 1) * (x * 2 - 2) + c) + 2) / 2; };
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let uid = 0; const nid = (s) => `mg-${s}-${++uid}`; // a counter, so ids never need randomness
  const R = 0.45; // each loop opens by fading the finished frame out, so the replay never jumps
  const play = (t, dur) => (t < R ? [dur, 1 - io(t / R)] : [t, 1]);
  const enter = (n, k, dx, dy, cx, cy, s0 = 1) => {
    const e = ob(k), s = s0 + (1 - s0) * e;
    n.setAttribute("opacity", cl(k * 2.5));
    n.setAttribute("transform", `translate(${dx * (1 - e)} ${dy * (1 - e)}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
  };
  const card = (p, x, y, w, h, fill, shade, rx = 16) => {
    if (shade) el("rect", { x: x + 9, y: y + 9, width: w, height: h, rx, fill: shade }, p);
    return el("rect", { x, y, width: w, height: h, rx, fill, stroke: INK, "stroke-width": 3 }, p);
  };
  const hit = (g, x, y, w, h, label, fn) => {
    el("rect", { x, y, width: w, height: h, rx: 26, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x, y, width: w, height: h, rx: 26, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 8", "stroke-linecap": "round", class: "mg-ring" }, g);
    button(g, label, fn);
  };

  const SC = {};

  /* ---- 1. a periscope looks at two signed in tabs ---- */
  SC.periscope = {
    dur: 10, still: 10,
    build(svg, api) {
      const root = el("g", {}, svg), P = [400, 380], CALM = 7.1, Y = 236;
      const ang = (x, y) => { const a = (Math.atan2(y - P[1], x - P[0]) * 180) / Math.PI; return a < 0 ? a + 360 : a; };
      const A = ang(278, 205), B = ang(522, 205);
      const cardG = el("g", {}, root);
      card(cardG, 140, 36, 520, 226, SOFT, LIL, 22);
      const tabs = [[168, SKY], [412, MINT]].map(([x, col]) => {
        const g = el("g", {}, root), lift = el("g", {}, g), cx = x + 110;
        el("rect", { x, y: 116, width: 220, height: 124, rx: 12, fill: col, stroke: INK, "stroke-width": 3 }, lift);
        el("path", { d: `M${x + 16} 118 Q${x + 25} 118 ${x + 27} 110 L${x + 29} 105 Q${x + 31} 98 ${x + 39} 98 H${x + 119} Q${x + 127} 98 ${x + 129} 105 L${x + 131} 110 Q${x + 133} 118 ${x + 144} 118`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, lift);
        el("rect", { x: x + 24, y: 136, width: 150, height: 12, rx: 6, fill: "#fff" }, lift);
        el("rect", { x: x + 24, y: 158, width: 100, height: 12, rx: 6, fill: "#fff" }, lift);
        const tag = el("g", {}, lift);
        el("rect", { x: cx - 80, y: 184, width: 160, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, tag);
        mono(tag, cx, 212, "signed in", { "text-anchor": "middle", "font-size": 22 });
        return { g, lift, tag, cx };
      });
      const label = mono(root, 400, 82, "same pages", { "text-anchor": "middle", "font-size": 26 });
      const sight = el("path", { fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-dasharray": "0.5 10", "stroke-linecap": "round" }, root);
      const dot = el("circle", { r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, root);
      const box = el("g", {}, root);
      card(box, 270, 478, 260, 88, BLUE, LIL, 14);
      el("path", { d: "M282 502 H518", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, box);
      const cid = nid("scope"), cp = el("clipPath", { id: cid }, el("defs", {}, svg));
      el("rect", { x: 0, y: 0, width: 800, height: 478.5 }, cp);
      const btn = el("g", {}, root);
      let sw = null, lastT = 0, theta = 180;
      hit(btn, 286, 274, 228, 200, "Swing the periscope to the other tab", () => {
        const to = Math.abs(theta - A) < Math.abs(theta - B) ? B : A;
        sw = { from: theta, to, at: api.calm ? -99 : api.now() };
        if (api.calm) api.redraw(); else if (lastT > CALM) api.seek(CALM); else api.poke();
      });
      const scope = el("g", {}, el("g", { "clip-path": `url(#${cid})` }, btn));
      el("rect", { x: 356, y: 380, width: 88, height: 230, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, scope);
      mono(scope, 400, 454, "agent", { "text-anchor": "middle", "font-size": 22 });
      const head = el("g", {}, scope);
      el("rect", { x: -14, y: -26, width: 100, height: 52, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, head);
      el("ellipse", { cx: 88, cy: 0, rx: 11, ry: 22, fill: SKY, stroke: INK, "stroke-width": 3 }, head);
      el("circle", { cx: P[0], cy: P[1], r: 34, fill: YEL, stroke: INK, "stroke-width": 3 }, scope);
      return (t0, now) => {
        if (t0 < R && lastT >= R) sw = null;
        lastT = t0;
        const [t, a] = play(t0, 10);
        root.setAttribute("opacity", a);
        enter(cardG, seg(t, 0.5, 1.1), 0, 16, 400, 150, 0.92);
        enter(box, seg(t, 0.84, 1.3), 0, 30, 400, 522, 0.9);
        const rise = ob(seg(t, 1.3, 2.4)), drop = 210 * (1 - rise);
        tf(scope, 0, drop);
        let th = 180 + (A - 180) * io(seg(t, 2.6, 3.4)) + (B - A) * iob(seg(t, 4.5, 5.4));
        if (sw) th = sw.from + (sw.to - sw.from) * iob(seg(now - sw.at, 0, 0.9));
        theta = th;
        head.setAttribute("transform", `translate(${P[0]} ${P[1]}) rotate(${th})`);
        const r = (th * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
        const sv = Math.max(seg(t, 3.3, 3.6), sw ? seg(t, 2.2, 2.5) : 0) * cl((-s - 0.4) / 0.2);
        let ex = -999;
        if (s < -0.3) {
          const lx = P[0] + c * 104, ly = P[1] + s * 104 + drop;
          ex = lx + (c * (Y - ly)) / s;
          sight.setAttribute("d", `M${lx} ${ly} L${ex} ${Y}`);
          dot.setAttribute("cx", ex); dot.setAttribute("cy", Y);
        }
        sight.setAttribute("opacity", sv); dot.setAttribute("opacity", sv);
        tabs.forEach((b, i) => {
          enter(b.g, seg(t, 0.62 + 0.1 * i, 1.12 + 0.1 * i), 0, 20, b.cx, 178, 0.9);
          tf(b.lift, 0, -6 * sv * cl(1 - Math.abs(ex - b.cx) / 140));
          enter(b.tag, seg(t, [3.5, 5.5][i], [4.1, 6.1][i]), 0, -40, b.cx, 205, 0.85);
        });
        enter(label, seg(t, 6.4, 7.0), 0, -18, 400, 74, 0.8);
      };
    },
  };

  /* ---- 2. an alarm clock rings and three kinds of work pop up ---- */
  SC.alarmclock = {
    dur: 10, still: 10,
    build(svg, api) {
      const root = el("g", { transform: "translate(0 -24)" }, svg), CALM = 6.4;
      const shelf = el("g", {}, root);
      el("rect", { x: 59, y: 457, width: 700, height: 28, rx: 8, fill: LIL }, shelf);
      el("path", { d: "M150 476 V534 L208 476 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shelf);
      el("path", { d: "M650 476 V534 L592 476 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shelf);
      card(shelf, 50, 448, 700, 28, SOFT, null, 8);
      const arcP = (cx, cy, r, a0, a1) => { const p = (d) => [cx + r * Math.cos((d * Math.PI) / 180), cy + r * Math.sin((d * Math.PI) / 180)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`; };
      const waves = [[156, 204, 200, 250], [304, 204, 290, 340]].flatMap(([cx, cy, a0, a1]) => [[58, SKY], [78, LIL]].map(([r, col]) => ({ n: el("path", { fill: "none", stroke: col, "stroke-width": 5, "stroke-linecap": "round" }, root), cx, cy, r, a0, a1 })));
      const clockO = el("g", { transform: "translate(230 448)" }, root), pop = el("g", {}, clockO), rock = el("g", {}, pop), body = el("g", { transform: "translate(0 -148)" }, rock);
      const bells = [-1, 1].map((d) => { const g = el("g", {}, body); el("path", { d: "M-40 8 A40 40 0 0 1 40 8 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g); return { g, d }; });
      const ham = el("g", {}, body);
      el("path", { d: "M0 0 V-24", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, ham);
      el("circle", { cx: 0, cy: -30, r: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, ham);
      [-1, 1].forEach((d) => { el("path", { d: `M${56 * d} 92 L${76 * d} 138`, stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, body); el("circle", { cx: 78 * d, cy: 140, r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, body); });
      el("circle", { r: 112, fill: YEL, stroke: INK, "stroke-width": 3 }, body);
      el("circle", { r: 90, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
      for (let i = 0; i < 12; i++) { if (i === 4 || i === 8) continue; const q = (i * Math.PI) / 6, r0 = i % 3 ? 76 : 68; el("path", { d: `M${Math.sin(q) * r0} ${-Math.cos(q) * r0} L${Math.sin(q) * 82} ${-Math.cos(q) * 82}`, stroke: INK, "stroke-width": i % 3 ? 3 : 5, "stroke-linecap": "round" }, body); }
      const name = mono(body, 0, 52, "automation", { "text-anchor": "middle", "font-size": 20 });
      const hour = el("path", { d: "M0 6 V-46", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, body);
      const minute = el("path", { d: "M0 8 V-70", stroke: INK, "stroke-width": 5.5, "stroke-linecap": "round" }, body);
      el("circle", { r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, body);
      const cards = [["prompt", BLUE], ["script", LIL], ["shell command", MINT]].map(([s, col], i) => {
        const g = el("g", {}, root), y = 122 + i * 86;
        card(g, 520, y, 240, 66, col, SOFT, 16);
        mono(g, 640, y + 42, s, { "text-anchor": "middle", "font-size": 24 });
        return { g, y };
      });
      const swO = el("g", {}, root), sw = el("g", {}, swO);
      let stopped = false, tStop = 0, flipAt = -99, lastT = 0;
      hit(sw, 356, 282, 132, 178, "Stop the clock", () => {
        stopped = !stopped; flipAt = api.calm ? -99 : api.now();
        if (stopped) tStop = lastT < R ? 0 : lastT;
        sw.setAttribute("aria-pressed", String(stopped));
        if (api.calm) api.redraw(); else if (stopped) api.poke(); else api.seek(Math.min(tStop, CALM));
      });
      sw.setAttribute("aria-pressed", "false");
      card(sw, 372, 298, 100, 148, SKY, null, 16);
      el("circle", { cx: 422, cy: 350, r: 17, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sw);
      const lever = el("g", {}, sw);
      el("path", { d: "M0 0 V-40", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, lever);
      el("circle", { cx: 0, cy: -42, r: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, lever);
      const off = mono(sw, 422, 430, "off", { "text-anchor": "middle", "font-size": 26 });
      return (t0, now) => {
        const tt = stopped ? tStop : t0; lastT = tt;
        const [t, a] = play(tt, 10);
        root.setAttribute("opacity", a);
        const sf = stopped ? 1 - seg(now - flipAt, 0, 0.3) : 1;
        enter(shelf, seg(t, 0.5, 1.0), 0, 20, 400, 470, 0.96);
        enter(pop, seg(t, 0.6, 1.1), 0, 0, 0, 0, 0.6);
        enter(name, seg(t, 0.9, 1.3), 0, 10, 0, 45, 0.8);
        enter(swO, seg(t, 0.72, 1.2), 0, 22, 422, 446, 0.9);
        let m = -108, hop = 0;
        for (let k = 0; k < 9; k++) { const tk = 1.4 + k * 0.27; m += 12 * ob(seg(t, tk, tk + 0.14)); if (t >= tk) hop = (k % 2 ? -1 : 1) * Math.sin(Math.PI * seg(t, tk, tk + 0.16)); }
        if (t >= 6) { const j = Math.floor((t - 6) / 0.5 + 1e-6), tk = 6 + j * 0.5; hop = (j % 2 ? -1 : 1) * 0.7 * Math.sin(Math.PI * seg(t, tk, tk + 0.16)); }
        hour.setAttribute("transform", `rotate(${-12 + 12 * io(seg(t, 1.4, 3.6))})`);
        minute.setAttribute("transform", `rotate(${m})`);
        const ring = seg(t, 3.85, 4.0) * (1 - seg(t, 5.0, 5.5)) * sf;
        rock.setAttribute("transform", `rotate(${hop * 1.4 * sf + Math.sin(t * 52) * 3.2 * ring})`);
        bells.forEach((b) => b.g.setAttribute("transform", `translate(${74 * b.d} -96) rotate(${35 * b.d + Math.sin(t * 70 + b.d) * 7 * ring})`));
        ham.setAttribute("transform", `translate(0 -110) rotate(${Math.sin(t * 70) * 16 * ring})`);
        waves.forEach((w, i) => { w.n.setAttribute("d", arcP(w.cx, w.cy, w.r + 6 * Math.sin(t * 18 + i), w.a0, w.a1)); w.n.setAttribute("opacity", ring); });
        cards.forEach((c, i) => enter(c.g, seg(t, 4.3 + 0.3 * i, 4.8 + 0.3 * i), 0, 34, 640, c.y + 33, 0.5));
        enter(off, seg(t, 5.9, 6.4), 0, -16, 422, 420, 0.7);
        const k = ob(seg(now - flipAt, 0, 0.35));
        lever.setAttribute("transform", `translate(422 350) rotate(${stopped ? 20 + 140 * k : 160 - 140 * k})`);
      };
    },
  };

  /* ---- 3. a zoetrope spins a paper plane into finished strips ---- */
  SC.zoetrope = {
    dur: 10, still: 10,
    build(svg, api) {
      const root = el("g", {}, svg), sh = el("g", { transform: "translate(0 22)" }, root), CALM = 7.3;
      const CX = 290, RX = 160, RY = 28, TOP = 170, RIM = 186, BAND = 276, BOT = 350, N = 10;
      const tube = (y0, y1) => `M${CX - RX} ${y0} A${RX} ${RY} 0 0 0 ${CX + RX} ${y0} V${y1} A${RX} ${RY} 0 0 1 ${CX - RX} ${y1} Z`;
      const front = (yc, x) => yc + RY * Math.sqrt(Math.max(0, 1 - ((x - CX) / RX) ** 2));
      const cardG = el("g", {}, sh);
      card(cardG, 500, 50, 270, 68, BLUE, LIL, 16);
      mono(cardG, 635, 93, "generate_video", { "text-anchor": "middle", "font-size": 24 });
      const folderO = el("g", {}, sh), folder = el("g", {}, folderO);
      const back = "M520 490 V334 Q520 324 530 324 H584 Q590 324 593 329 L600 340 H750 Q760 340 760 350 V490 Q760 500 750 500 H530 Q520 500 520 490 Z";
      el("path", { d: back, fill: LIL, transform: "translate(9 9)" }, folder);
      el("path", { d: back, fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, folder);
      const LAND = [[588, 358, -9], [640, 350, 2], [692, 360, 10]], GO = [2.5, 3.7, 4.9];
      const strips = LAND.map(() => {
        const g = el("g", {}, folder);
        el("rect", { x: -23, y: -58, width: 46, height: 116, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        for (let i = 0; i < 6; i++) [-20, 16].forEach((x) => el("rect", { x, y: -52 + i * 19, width: 4, height: 8, rx: 1, fill: SKY }, g));
        for (let i = 0; i < 3; i++) {
          const y = -50 + i * 36;
          el("rect", { x: -12, y, width: 24, height: 28, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, g);
          el("path", { d: `M8 ${y + 14} L-7 ${y + 8} L-3 ${y + 14} L-7 ${y + 20} Z`, fill: YEL, stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, g);
        }
        return g;
      });
      el("rect", { x: 520, y: 384, width: 240, height: 116, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, folder);
      const label = mono(sh, 640, 456, "workspace", { "text-anchor": "middle", "font-size": 24 });
      const drumO = el("g", {}, sh), drum = el("g", {}, drumO);
      let spins = [], lastT = 0;
      hit(drum, 110, 124, 360, 276, "Spin the zoetrope once more", () => {
        if (api.calm) return;
        spins = spins.concat(api.now()).slice(-3);
        if (lastT > CALM) api.seek(CALM); else api.poke();
      });
      el("ellipse", { cx: CX + 9, cy: 465, rx: 112, ry: 20, fill: LIL }, drum);
      el("path", { d: "M178 440 A112 20 0 0 0 402 440 V456 A112 20 0 0 1 178 456 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, drum);
      el("ellipse", { cx: CX, cy: 440, rx: 112, ry: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, drum);
      el("rect", { x: 280, y: 372, width: 20, height: 70, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, drum);
      el("ellipse", { cx: CX, cy: TOP, rx: RX, ry: RY, fill: SOFT, stroke: INK, "stroke-width": 3 }, drum);
      el("path", { d: tube(TOP, RIM), fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, drum);
      el("path", { d: tube(RIM, BAND), fill: "#fff" }, drum);
      const bid = nid("band"), cp = el("clipPath", { id: bid }, el("defs", {}, svg));
      el("path", { d: tube(RIM, BAND) }, cp);
      const win = el("g", { "clip-path": `url(#${bid})` }, drum), fly = el("g", {}, win);
      const lines = el("path", { d: "M-66 -6 H-44 M-74 8 H-50", fill: "none", stroke: SKY, "stroke-width": 4, "stroke-linecap": "round" }, fly);
      el("path", { d: "M32 0 L-30 -15 L-14 2 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, fly);
      el("path", { d: "M32 0 L-14 2 L-24 15 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, fly);
      const slats = Array.from({ length: N }, () => el("path", { fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, win));
      el("path", { d: tube(RIM, BAND), fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, drum);
      el("path", { d: tube(BAND, BOT), fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, drum);
      const d1 = (u) => (u <= 0 || u >= 1 ? 0 : u < 0.5 ? 12 * u * u : 12 * (1 - u) * (1 - u));
      return (t0, now) => {
        if (t0 < R && lastT >= R) spins = [];
        lastT = t0;
        const [t, a] = play(t0, 10);
        root.setAttribute("opacity", a);
        enter(drumO, seg(t, 0.5, 1.05), 0, 24, 290, 476, 0.85);
        enter(cardG, seg(t, 0.62, 1.1), 40, 0, 635, 84, 0.9);
        enter(folderO, seg(t, 0.74, 1.24), 0, 26, 640, 500, 0.9);
        const u = seg(t, 1.2, 6.6);
        let phi = Math.PI / 10 + 6 * Math.PI * io(u), sp = (6 * Math.PI * d1(u)) / 5.4;
        spins.forEach((s) => { const v = seg(now - s, 0, 1.8); phi += 2 * Math.PI * io(v); sp += (2 * Math.PI * d1(v)) / 1.8; });
        const amp = cl(sp / 4.5);
        slats.forEach((p, k) => {
          const q = phi + (k * 2 * Math.PI) / N, c = Math.cos(q);
          if (c <= 0.03) { p.setAttribute("d", "M0 0"); p.setAttribute("opacity", 0); return; }
          const x = CX + RX * Math.sin(q), hw = 11 * c, x0 = x - hw, x1 = x + hw;
          p.setAttribute("opacity", 1);
          p.setAttribute("d", `M${x0} ${front(RIM, x0) - 4} L${x1} ${front(RIM, x1) - 4} L${x1} ${front(BAND, x1) + 4} L${x0} ${front(BAND, x0) + 4} Z`);
        });
        tf(fly, 289 + 30 * amp * Math.sin(phi * 0.9), 259 - 12 * amp * Math.sin(phi * 1.8), 1, -14 * amp * Math.cos(phi * 1.8));
        lines.setAttribute("opacity", amp);
        let bump = 0;
        strips.forEach((g, i) => {
          const k = seg(t, GO[i], GO[i] + 1.0), e = io(k), [fx, fy, fr] = LAND[i], w0 = (1 - e) * (1 - e), w1 = 2 * (1 - e) * e, w2 = e * e;
          tf(g, w0 * 290 + w1 * 450 + w2 * fx, w0 * 172 + w1 * 20 + w2 * fy, 0.5 + 0.5 * oc(k), -20 + (fr + 20) * e);
          g.setAttribute("opacity", cl(k * 6));
          bump += Math.sin(Math.PI * seg(t, GO[i] + 0.92, GO[i] + 1.3));
        });
        tf(folder, 0, 5 * bump);
        enter(label, seg(t, 6.8, 7.3), 0, -18, 640, 448, 0.75);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 40, width: 136, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      mono(svg, 132, 68, "Version", { "text-anchor": "middle", "font-size": 20 });
      mono(svg, 896, 68, "Checked 24 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 60, 184, "OpenCode 2.4", { "font-size": 88, "font-weight": 700 });
      el("path", { d: "M66 212 H300", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 266, "A browser the agent can drive, and automations on a schedule", { "font-size": 25, "font-weight": 500, fill: MUTE });
      card(svg, 64, 382, 400, 96, LIL, SOFT, 18);
      mono(svg, 264, 440, "v2.4.0: 23 Nov 2026", { "text-anchor": "middle", "font-size": 24 });
      card(svg, 496, 382, 400, 96, SKY, SOFT, 18);
      mono(svg, 696, 440, "Latest on npm: 2.4.1", { "text-anchor": "middle", "font-size": 24 });
      // a small sky periscope on the lilac tile
      el("rect", { x: 240, y: 316, width: 24, height: 66, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 240, y: 298, width: 58, height: 28, rx: 9, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      el("ellipse", { cx: 298, cy: 312, rx: 5, ry: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);      // a small yellow alarm clock on the sky tile
      [-1, 1].forEach((d) => {
        el("path", { d: "M-12 3 A12 12 0 0 1 12 3 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${696 + 20 * d} 318) rotate(${32 * d})` }, svg);
        el("path", { d: `M${696 + 14 * d} 366 L${696 + 21 * d} 380`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, svg);
      });
      el("circle", { cx: 696, cy: 344, r: 28, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      el("circle", { cx: 696, cy: 344, r: 20, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      el("path", { d: "M696 344 V329 M696 344 L705 349", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
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
    let off = 0, raf = 0, seen = false, held = calm, started = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { calm, now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, redraw: frame };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (!started) { started = true; off = -clock(); } tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
