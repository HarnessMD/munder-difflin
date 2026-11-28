/* Bright coded scenes for "App Store Rejection Checklist". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
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
  const line = (w = 3) => ({ stroke: INK, "stroke-width": w, "stroke-linejoin": "round" });
  const hit = (g, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, g);
  const ring = (g, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "12 10", class: "mg-ring" }, g);
  // entrance helpers: k runs from 0 to 1
  const pop = (n, k, cx, cy, from = 0.6) => { n.setAttribute("transform", `translate(${cx} ${cy}) scale(${from + (1 - from) * ob(k)}) translate(${-cx} ${-cy})`); n.setAttribute("opacity", cl(k * 3)); };
  const rise = (n, k, dy = 40, dx = 0) => { const e = oc(k); n.setAttribute("transform", `translate(${dx * (1 - e)} ${dy * (1 - e)})`); n.setAttribute("opacity", e); };
  const grow = (n, k, ox, oy, across = true) => { const e = oc(k); n.setAttribute("transform", `translate(${ox} ${oy}) scale(${across ? e : 1} ${across ? 1 : e}) translate(${-ox} ${-oy})`); n.setAttribute("opacity", k > 0 ? 1 : 0); };

  const SC = {};

  /* ---- 1. a luggage scanner tags each app card BLOCKED or CLEAR ---- */
  SC.scanner = {
    dur: 9, still: 9,
    build(stage, api) {
      const root = el("g", { transform: "translate(0 -80)" }, stage);
      const AUTO = [1.6, 4.2], PLAT = ["iOS", "Android"], VER = [["BLOCKED", LIL], ["CLEAR", MINT], ["CLEAR", MINT], ["BLOCKED", LIL]];
      let P = AUTO.slice();
      api.onReset(() => { P = AUTO.slice(); });
      const shadow = el("rect", { x: 490, y: 320, width: 460, height: 580, rx: 40, fill: SOFT }, root);
      const ground = el("rect", { x: 140, y: 1040, width: 1320, height: 26, rx: 13, fill: SOFT }, root);
      const belt = el("g", {}, root);
      [200, 1400].forEach((x) => el("rect", Object.assign({ x: x - 15, y: 836, width: 30, height: 210, rx: 10, fill: SOFT }, line()), belt));
      el("rect", Object.assign({ x: 70, y: 786, width: 1460, height: 58, rx: 29, fill: SKY }, line()), belt);
      const dash = el("path", { d: "M112 815 H1488", stroke: INK, "stroke-width": 3, "stroke-dasharray": "14 36", "stroke-linecap": "round" }, belt);
      const tunnel = el("rect", { x: 520, y: 490, width: 360, height: 296, fill: SOFT }, root);
      const cards = el("g", {}, root);
      const pool = Array.from({ length: 5 }, () => {
        const g = el("g", { opacity: 0 }, cards), c = { g, i: -1 };
        el("rect", Object.assign({ x: -110, y: -250, width: 220, height: 250, rx: 24, fill: SOFT }, line()), g);
        c.plat = txt(g, 0, -178, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 40, "font-weight": 700 });
        el("rect", Object.assign({ x: -70, y: -146, width: 140, height: 16, rx: 8, fill: "#fff" }, line(2.5)), g);
        el("rect", Object.assign({ x: -70, y: -120, width: 96, height: 16, rx: 8, fill: "#fff" }, line(2.5)), g);
        c.tag = el("g", { opacity: 0 }, g);
        c.shape = el("path", Object.assign({ d: "M-86 -36 H94 Q110 -36 110 -20 V20 Q110 36 94 36 H-86 L-112 0 Z", fill: LIL }, line()), c.tag);
        el("circle", Object.assign({ cx: -84, cy: 0, r: 8, fill: "#fff" }, line(2.5)), c.tag);
        c.word = txt(c.tag, 14, 12, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 34, "font-weight": 700 });
        return c;
      });
      const bar = el("rect", Object.assign({ x: -8, y: 504, width: 16, height: 272, rx: 8, fill: BLUE, opacity: 0 }, line(2.5)), root);
      const scan = el("g", {}, root);
      hit(scan, 446, 276, 508, 628, 56);
      const body = el("g", {}, scan);
      [500, 860].forEach((x) => el("rect", Object.assign({ x, y: 870, width: 40, height: 176, rx: 10, fill: SOFT }, line()), body));
      el("path", Object.assign({ d: "M470 340 Q470 300 510 300 H890 Q930 300 930 340 V840 Q930 880 890 880 H510 Q470 880 470 840 Z M520 512 Q520 490 542 490 H858 Q880 490 880 512 V844 H520 Z", fill: YEL, "fill-rule": "evenodd" }, line()), body);
      const screen = el("g", {}, body);
      el("rect", Object.assign({ x: 524, y: 338, width: 352, height: 114, rx: 22, fill: BLUE }, line()), screen);
      txt(screen, 700, 408, "critical risk", { "text-anchor": "middle", "font-family": MONO, "font-size": 38, "font-weight": 700 });
      ring(scan, 446, 276, 508, 628, 56);
      button(scan, "Send the next card through the scanner", () => {
        const T = api.user(); P = P.filter((p) => p <= T);
        const at = Math.max(T, P.length ? P[P.length - 1] + 2.4 : 1.5);
        if (at - T < 2.5) P.push(at);
        api.kick();
      });
      return (t) => {
        grow(ground, seg(t, 0, 0.5), 800, 0);
        rise(belt, seg(t, 0.1, 0.6), 50);
        const hk = seg(t, 0.25, 0.85);
        [body, shadow, tunnel].forEach((n) => pop(n, hk, 700, 880, 0.7));
        let pulse = 0;
        P.forEach((p, i) => { if (VER[i % 4][0] === "BLOCKED") pulse += Math.sin(Math.PI * seg(t - p, 1.35, 1.85)); });
        const sk = seg(t, 0.6, 1.0);
        screen.setAttribute("transform", `translate(700 395) scale(${(0.6 + 0.4 * ob(sk)) * (1 + 0.1 * pulse)}) translate(-700 -395)`);
        screen.setAttribute("opacity", cl(sk * 3));
        const n = P.length;
        const E = (i) => (i === 0 ? seg(t, 0.9, 1.5) : i - 1 < n ? seg(t - P[i - 1], 1.6, 2.4) : 0);
        const A = (i, a, b) => (i < n ? io(seg(t - P[i], a, b)) : 0);
        let dist = 390 * oc(seg(t, 0.9, 1.5));
        P.forEach((p) => { dist += 450 * io(seg(t - p, 0, 1)) + 390 * io(seg(t - p, 1.6, 2.4)); });
        dash.setAttribute("stroke-dashoffset", -dist);
        let bo = 0, bx = 540;
        P.forEach((p) => { const s = t - p; if (s >= 1 && s <= 1.6) { bo = seg(s, 1, 1.1) * (1 - seg(s, 1.5, 1.6)); bx = 540 + 320 * io(seg(s, 1.05, 1.5)); } });
        bar.setAttribute("opacity", bo); bar.setAttribute("transform", `translate(${bx} 0)`);
        pool.forEach((c) => { c.used = false; });
        for (let i = Math.max(0, n - 4); i <= n; i++) {
          const e = E(i), d = A(i + 2, 1.6, 2.4);
          if (e <= 0 || d >= 1) continue;
          const x = -140 + 390 * oc(e) + 450 * A(i, 0, 1) + 390 * A(i, 1.6, 2.4) + 280 * A(i + 1, 1.6, 2.4) + 400 * d;
          const c = pool[i % 5]; c.used = true;
          if (c.i !== i) { c.i = i; c.plat.textContent = PLAT[i % 2]; c.word.textContent = VER[i % 4][0]; c.shape.setAttribute("fill", VER[i % 4][1]); }
          tf(c.g, x, 786); c.g.setAttribute("opacity", 1 - d);
          const k = i < n ? seg(t - P[i], 2.25, 2.85) : 0;
          c.tag.setAttribute("opacity", cl(k * 5));
          tf(c.tag, 0, -58 - 300 * (1 - ob(k)), 1, -6 + 10 * (1 - oc(k)));
        }
        pool.forEach((c) => { if (!c.used) c.g.setAttribute("opacity", 0); });
      };
    },
  };

  /* ---- 2. a signal box lights one verdict at a time ---- */
  SC.signalbox = {
    dur: 9.5, still: 9.5,
    build(stage, api) {
      const root = el("g", {}, stage);
      const LY = [250, 465, 680, 895], CX = 520;
      const V = [["BLOCKED", LIL], ["CLEAR", MINT], ["NOT CHECKED", SKY], ["Rule pack STALE", BLUE]];
      const AUTO = [[1.5, 0], [2.8, 1], [4.1, 2], [5.4, 3], [6.7, 1]];
      let EV = AUTO.slice();
      api.onReset(() => { EV = AUTO.slice(); });
      const ground = el("rect", { x: 300, y: 1076, width: 1000, height: 26, rx: 13, fill: SOFT }, root);
      const post = el("rect", Object.assign({ x: 498, y: 996, width: 44, height: 88, rx: 8, fill: SOFT }, line()), root);
      const plates = V.map(([w], j) => {
        const g = el("g", {}, root);
        el("path", { d: `M636 ${LY[j]} H700`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        el("rect", Object.assign({ x: 700, y: LY[j] - 46, width: 500, height: 92, rx: 20, fill: SOFT }, line()), g);
        txt(g, 736, LY[j] + 15, w, { "font-family": MONO, "font-size": 44, "font-weight": 700 });
        return g;
      });
      const note = el("g", {}, root);
      el("path", { d: `M776 ${LY[1] + 46} V${LY[1] + 63}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, note);
      el("rect", Object.assign({ x: 740, y: LY[1] + 63, width: 340, height: 60, rx: 14, fill: SOFT }, line(2.5)), note);
      txt(note, 910, LY[1] + 104, "Not an approval", { "text-anchor": "middle", "font-family": MONO, "font-size": 32, "font-weight": 500 });
      const boxG = el("g", {}, root);
      hit(boxG, 376, 80, 288, 950, 48);
      const body = el("g", {}, boxG);
      el("rect", { x: 420, y: 150, width: 240, height: 870, rx: 36, fill: SOFT }, body);
      el("rect", Object.assign({ x: 440, y: 104, width: 160, height: 40, rx: 14, fill: YEL }, line()), body);
      el("rect", Object.assign({ x: 400, y: 130, width: 240, height: 870, rx: 36, fill: YEL }, line()), body);
      const glow = el("circle", { cx: CX, cy: 0, r: 114, fill: SOFT, opacity: 0 }, body);
      const lamps = LY.map((y, j) => {
        const g = el("g", {}, body);
        el("circle", Object.assign({ cx: CX, cy: y, r: 88, fill: "#fff" }, line()), g);
        el("circle", { cx: CX, cy: y, r: 70, fill: SOFT }, g);
        const disc = el("circle", Object.assign({ cx: CX, cy: y, r: 24, fill: V[j][1] }, line(2.5)), g);
        el("circle", Object.assign({ cx: CX, cy: y, r: 70, fill: "none" }, line()), g);
        const rays = el("g", { opacity: 0 }, g);
        for (let a = 0; a < 8; a++) { const r = (a * Math.PI) / 4 + Math.PI / 8, c = Math.cos(r), s = Math.sin(r); el("path", { d: `M${CX + c * 95} ${y + s * 95} L${CX + c * 110} ${y + s * 110}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, rays); }
        return { g, disc, rays, y };
      });
      ring(boxG, 376, 80, 288, 950, 48);
      button(boxG, "Light the next verdict", () => {
        const T = api.user(); EV = EV.filter((e) => e[0] <= T);
        const j = EV.length ? (EV[EV.length - 1][1] + 1) % 4 : 0;
        EV.push([Math.max(T, 1.2), j]);
        api.kick();
      });
      return (t) => {
        grow(ground, seg(t, 0, 0.5), 800, 0);
        rise(post, seg(t, 0.1, 0.5), 30);
        pop(body, seg(t, 0.15, 0.75), CX, 1000, 0.75);
        const lit = [0, 0, 0, 0];
        let gy = EV.length ? LY[EV[0][1]] : LY[0];
        EV.forEach(([te, j], m) => {
          const nx = EV[m + 1], on = ob(seg(t, te, te + 0.45)), off = nx ? 1 - oc(seg(t, nx[0], nx[0] + 0.25)) : 1;
          lit[j] = Math.max(lit[j], on * off);
          if (m > 0) gy += (LY[j] - gy) * io(seg(t, te, te + 0.4));
        });
        const gk = EV.length ? seg(t, EV[0][0], EV[0][0] + 0.45) : 0;
        glow.setAttribute("cy", gy); glow.setAttribute("opacity", cl(gk * 3));
        glow.setAttribute("transform", `translate(${CX} ${gy}) scale(${0.5 + 0.5 * ob(gk)}) translate(${-CX} ${-gy})`);
        lamps.forEach((L, j) => {
          pop(L.g, seg(t, 0.5 + j * 0.1, 0.9 + j * 0.1), CX, L.y, 0.4);
          const k = lit[j];
          L.disc.setAttribute("r", cl(24 + 46 * k, 24, 76));
          L.rays.setAttribute("opacity", cl(k));
          L.rays.setAttribute("transform", `translate(${CX} ${L.y}) scale(${0.7 + 0.3 * k}) translate(${-CX} ${-L.y})`);
          const pk = seg(t, 0.8 + j * 0.1, 1.3 + j * 0.1), e = oc(pk);
          plates[j].setAttribute("transform", `translate(${70 * (1 - e) + 16 * cl(k)} 0)`);
          plates[j].setAttribute("opacity", e);
        });
        pop(note, seg(t, 7.4, 7.95), 910, LY[1] + 93, 0.5);
      };
    },
  };

  /* ---- 3. a flip chart of rejection causes, ticked line by line ---- */
  SC.flipchart = {
    dur: 9, still: 9,
    build(stage, api) {
      const root = el("g", {}, stage);
      const R1 = ["demo account", "privacy declaration", "permission reason", "account deletion"], R2 = ["digital goods", "app shell", "near identical apps"];
      const RY = [320, 460, 600, 740], TOP = 186;
      const AUTO = [4.3];
      let F = AUTO.slice();
      api.onReset(() => { F = AUTO.slice(); });
      const ground = el("rect", { x: 220, y: 1112, width: 1100, height: 26, rx: 13, fill: SOFT }, root);
      const chart = el("g", {}, root);
      hit(chart, 244, 96, 1080, 1030, 44);
      const legs = el("g", {}, chart);
      [[730, 900, 730, 1092], [420, 900, 340, 1108], [1040, 900, 1120, 1108]].forEach(([a, b, c, d]) => {
        const p = `M${a} ${b} L${c} ${d}`;
        el("path", { d: p, stroke: INK, "stroke-width": 34, "stroke-linecap": "round" }, legs);
        el("path", { d: p, stroke: BLUE, "stroke-width": 27, "stroke-linecap": "round" }, legs);
      });
      const board = el("g", {}, chart);
      el("rect", { x: 310, y: 180, width: 880, height: 740, rx: 26, fill: SOFT }, board);
      el("rect", Object.assign({ x: 290, y: 160, width: 880, height: 740, rx: 26, fill: YEL }, line()), board);
      el("rect", Object.assign({ x: 262, y: 892, width: 936, height: 36, rx: 16, fill: BLUE }, line()), board);
      const page = (rows) => {
        const g = el("g", {}, chart);
        el("rect", Object.assign({ x: 330, y: 176, width: 800, height: 690, rx: 16, fill: SOFT }, line()), g);
        return { g, rows: rows.map((s, i) => {
          const y = RY[i], r = el("g", {}, g), box = el("g", {}, r);
          el("rect", Object.assign({ x: 380, y: y - 36, width: 72, height: 72, rx: 14, fill: "#fff" }, line()), box);
          const d = `M394 ${y + 2} L410 ${y + 18} L440 ${y - 18}`, k = { d, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 100, "stroke-dasharray": 100, "stroke-dashoffset": 100 };
          const t1 = el("path", Object.assign({ stroke: INK, "stroke-width": 17 }, k), box), t2 = el("path", Object.assign({ stroke: MINT, "stroke-width": 10 }, k), box);
          txt(r, 490, y + 16, s, { "font-family": MONO, "font-size": 46, "font-weight": 500 });
          return { r, box, ticks: [t1, t2], y };
        }) };
      };
      const p2 = page(R2), p1 = page(R1);
      const clamp = el("rect", Object.assign({ x: 266, y: 134, width: 928, height: 52, rx: 22, fill: BLUE }, line()), chart);
      const tab = el("g", {}, chart);
      el("rect", { x: 1124, y: 228, width: 180, height: 320, rx: 20, fill: SOFT }, tab);
      el("rect", Object.assign({ x: 1110, y: 214, width: 180, height: 320, rx: 20, fill: LIL }, line()), tab);
      ["2.1", "5.1.1", "3.1.1", "4.2", "4.3"].forEach((s, i) => txt(tab, 1200, 276 + i * 58, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 42, "font-weight": 700, fill: SKY, stroke: INK, "stroke-width": 7, "stroke-linejoin": "round", "paint-order": "stroke" }));
      ring(chart, 244, 96, 1080, 870, 44);
      button(chart, "Flip the page", () => {
        const T = api.user(); F = F.filter((f) => f <= T);
        const at = Math.max(T, F.length ? F[F.length - 1] + 0.9 : 1.2);
        if (at - T < 1) F.push(at);
        api.kick();
      });
      const tick = (rows, base, t) => rows.forEach((R, i) => {
        const a = base + i * 0.55, k = oc(seg(t, a, a + 0.42));
        R.ticks.forEach((n) => { n.setAttribute("stroke-dashoffset", 100 * (1 - k)); n.setAttribute("opacity", k > 0 ? 1 : 0); });
        const s = 1 + 0.14 * Math.sin(Math.PI * seg(t, a + 0.3, a + 0.62));
        R.box.setAttribute("transform", `translate(416 ${R.y}) scale(${s}) translate(-416 ${-R.y})`);
      });
      return (t) => {
        grow(ground, seg(t, 0, 0.5), 800, 0);
        grow(legs, seg(t, 0.1, 0.6), 0, 900, false);
        pop(board, seg(t, 0.2, 0.8), 730, 900, 0.75);
        rise(clamp, seg(t, 0.35, 0.75), -40);
        let s1 = 1, base1 = 2.0, base2 = 99, on = 1;
        F.forEach((f) => { if (t < f) return; on = 3 - on; const k = io(seg(t, f, f + 0.8)); s1 = on === 2 ? 1 - k : k; if (on === 2) base2 = f + 1.2; else base1 = f + 1.2; });
        const S = s1 * oc(seg(t, 0.55, 1.0));
        p1.g.setAttribute("transform", `translate(0 ${TOP}) scale(1 ${Math.max(S, 0.001)}) translate(0 ${-TOP})`);
        p1.g.setAttribute("opacity", S < 0.02 ? 0 : 1);
        p2.g.setAttribute("opacity", S < 0.999 && t > 1.2 ? 1 : 0);
        const vis = cl((S - 0.3) / 0.5);
        p1.rows.forEach((R, i) => { rise(R.r, seg(t, 0.85 + i * 0.1, 1.35 + i * 0.1), 0, -40); R.r.setAttribute("opacity", R.r.getAttribute("opacity") * vis); });
        tick(p1.rows, base1, t); tick(p2.rows, base2, t);
        const k = seg(t, 1.3, 1.9);
        tab.setAttribute("transform", `translate(${240 * (1 - oc(k))} 0) rotate(${12 * (1 - ob(k))} 1200 374)`);
        tab.setAttribute("opacity", cl(k * 4));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 6,
    build(stage) {
      const root = el("g", {}, stage);
      const chip = el("g", {}, root);
      el("rect", Object.assign({ x: 110, y: 128, width: 170, height: 58, rx: 29, fill: SKY }, line()), chip);
      txt(chip, 195, 168, "Guides", { "text-anchor": "middle", "font-size": 32, "font-weight": 600 });
      const title = ["App Store", "Rejection", "Checklist"].map((s, i) => txt(root, 106, 300 + i * 112, s, { "font-size": 108, "font-weight": 700 }));
      const bar = el("rect", { x: 112, y: 556, width: 470, height: 18, rx: 9, fill: YEL }, root);
      const sub = txt(root, 110, 646, "Catch it before review", { "font-size": 44, "font-weight": 500, fill: MUTE });
      const when = txt(root, 110, 712, "Checked 27 Nov 2026", { "font-family": MONO, "font-size": 28, "font-weight": 500, fill: CAP });
      // a small yellow flip chart on a blue stand
      const fc = el("g", {}, root);
      [[955, 404, 955, 492], [905, 404, 882, 500], [1005, 404, 1028, 500]].forEach(([a, b, c, d]) => {
        const p = `M${a} ${b} L${c} ${d}`;
        el("path", { d: p, stroke: INK, "stroke-width": 16, "stroke-linecap": "round" }, fc);
        el("path", { d: p, stroke: BLUE, "stroke-width": 10.5, "stroke-linecap": "round" }, fc);
      });
      el("rect", { x: 873, y: 240, width: 180, height: 170, rx: 14, fill: SOFT }, fc);
      el("rect", Object.assign({ x: 865, y: 232, width: 180, height: 170, rx: 14, fill: YEL }, line()), fc);
      el("rect", Object.assign({ x: 879, y: 246, width: 152, height: 142, rx: 8, fill: SOFT }, line(2.5)), fc);
      const mticks = [282, 318, 354].map((y, i) => {
        el("rect", Object.assign({ x: 891, y: y - 11, width: 22, height: 22, rx: 5, fill: "#fff" }, line(2.5)), fc);
        el("rect", Object.assign({ x: 925, y: y - 6, width: [86, 70, 78][i], height: 12, rx: 6, fill: "#fff" }, line(2.5)), fc);
        const d = `M895 ${y} L900 ${y + 6} L910 ${y - 6}`, k = { d, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 100, "stroke-dasharray": 100, "stroke-dashoffset": 100 };
        return [el("path", Object.assign({ stroke: INK, "stroke-width": 8 }, k), fc), el("path", Object.assign({ stroke: MINT, "stroke-width": 4.5 }, k), fc)];
      });
      el("rect", Object.assign({ x: 857, y: 220, width: 196, height: 20, rx: 8, fill: BLUE }, line(2.5)), fc);
      el("rect", Object.assign({ x: 857, y: 396, width: 196, height: 16, rx: 7, fill: BLUE }, line(2.5)), fc);
      // a small sky luggage scanner
      const sc = el("g", {}, root);
      el("rect", { x: 1278, y: 270, width: 150, height: 238, rx: 22, fill: SOFT }, sc);
      [1219, 1471].forEach((x) => el("rect", Object.assign({ x: x - 7, y: 474, width: 14, height: 34, rx: 4, fill: SOFT }, line(2.5)), sc));
      el("rect", Object.assign({ x: 1190, y: 456, width: 310, height: 24, rx: 12, fill: BLUE }, line()), sc);
      el("rect", { x: 1290, y: 352, width: 110, height: 104, fill: SOFT }, sc);
      el("rect", Object.assign({ x: 1318, y: 390, width: 54, height: 66, rx: 8, fill: "#fff" }, line(2.5)), sc);
      el("rect", { x: 1328, y: 404, width: 34, height: 8, rx: 4, fill: SOFT }, sc);
      el("path", Object.assign({ d: "M1270 284 Q1270 262 1292 262 H1398 Q1420 262 1420 284 V478 Q1420 500 1398 500 H1292 Q1270 500 1270 478 Z M1290 360 Q1290 352 1298 352 H1392 Q1400 352 1400 360 V480 H1290 Z", fill: SKY, "fill-rule": "evenodd" }, line()), sc);
      el("rect", Object.assign({ x: 1292, y: 282, width: 106, height: 50, rx: 10, fill: BLUE }, line(2.5)), sc);
      el("rect", { x: 1306, y: 296, width: 78, height: 8, rx: 4, fill: SOFT }, sc);
      el("rect", { x: 1306, y: 312, width: 52, height: 8, rx: 4, fill: SOFT }, sc);
      // two fact cards
      const cards = [[955, LIL, ["Eight common", "causes"]], [1345, MINT, ["CLEAR:", "Not an approval"]]].map(([cx, c, ls]) => {
        const g = el("g", {}, root);
        el("rect", { x: cx - 163, y: 564, width: 350, height: 170, rx: 24, fill: SOFT }, g);
        el("rect", Object.assign({ x: cx - 175, y: 552, width: 350, height: 170, rx: 24, fill: c }, line()), g);
        const w = el("g", {}, g);
        ls.forEach((s, i) => txt(w, cx, 624 + i * 44, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 }));
        return { g, w, cx };
      });
      return (t) => {
        pop(chip, seg(t, 0, 0.45), 195, 157, 0.5);
        title.forEach((n, i) => rise(n, seg(t, 0.12 + i * 0.1, 0.67 + i * 0.1), 36));
        grow(bar, seg(t, 0.55, 0.95), 112, 0);
        rise(sub, seg(t, 0.7, 1.2), 24); rise(when, seg(t, 0.8, 1.3), 24);
        pop(fc, seg(t, 0.95, 1.5), 955, 500, 0.6); pop(sc, seg(t, 1.05, 1.6), 1345, 500, 0.6);
        mticks.forEach((p, i) => { const k = oc(seg(t, 1.5 + i * 0.12, 1.8 + i * 0.12)); p.forEach((n) => { n.setAttribute("stroke-dashoffset", 100 * (1 - k)); n.setAttribute("opacity", k > 0 ? 1 : 0); }); });
        cards.forEach((C, i) => { rise(C.g, seg(t, 1.3 + i * 0.12, 1.8 + i * 0.12), 40); pop(C.w, seg(t, 1.7 + i * 0.12, 2.1 + i * 0.12), C.cx, 640, 0.6); });
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HOLD = 2.6, FADE = 0.6, IDLE = 9; // the final frame holds, fades out and replays; a tap holds it for IDLE seconds
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 1600, H = sc.h || 1200;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    const stage = el("g", {}, svg), resets = [];
    img.replaceWith(svg);
    let raf = 0, seen = false, a0 = -1, user = false, ub = 0, last = 0;
    const clock = () => performance.now() / 1000;
    const autoT = (now) => (a0 < 0 ? 0 : Math.min((now - a0) % (sc.dur + HOLD), sc.dur));
    const sceneT = (now) => (user ? now + ub : calm ? sc.still : autoT(now));
    let draw = () => {};
    const frame = () => {
      const now = clock();
      if (calm) { draw(user ? now + ub + 60 : sc.still, now); return; }
      if (user && now - last > IDLE + FADE) { user = false; a0 = now; resets.forEach((f) => f()); }
      const fade = user ? cl((now - last - IDLE) / FADE) : a0 < 0 ? 0 : cl(((now - a0) % (sc.dur + HOLD) - sc.dur - HOLD + FADE) / FADE);
      stage.setAttribute("opacity", 1 - io(fade));
      draw(sceneT(now), now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !calm) raf = requestAnimationFrame(tick); };
    const api = {
      user: () => { const now = clock(); if (!user) { ub = sceneT(now) - now; user = true; } last = now; return now + ub; },
      kick: () => tick(),
      onReset: (f) => resets.push(f),
    };
    draw = sc.build(stage, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (a0 < 0) a0 = clock(); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
