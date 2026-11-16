/* Bright coded scenes for "GTA 6 YouTube channel ideas". Vanilla JS, no library.
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

  const SC = {};

  /* ---- 1. a radio dial needle tunes through six stations ---- */
  SC.radio = {
    dur: 8.4, still: 8.4,
    build(svg, api) {
      const NAMES = ["News", "Map", "Mission", "Comparisons", "Tips", "Places"];
      const X = [185, 269, 353, 437, 521, 605], RY = [222, 318], A = NAMES.map((_, i) => 0.7 + 1.15 * i);
      hint(svg, "Tap the dial");
      const radio = el("g", {}, svg);
      el("rect", { x: 76, y: 136, width: 648, height: 434, rx: 50, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, radio);
      const hd = "M252 152 V126 Q252 100 278 100 H522 Q548 100 548 126 V152";
      el("path", { d: hd, stroke: INK, "stroke-width": 16, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, radio);
      el("path", { d: hd, stroke: LIL, "stroke-width": 9, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, radio);
      el("path", { d: "M642 152 L712 52", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, radio);
      el("circle", { cx: 712, cy: 52, r: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, radio);
      [150, 578].forEach((x) => el("rect", { x, y: 526, width: 72, height: 28, rx: 9, fill: LIL, stroke: INK, "stroke-width": 3 }, radio));
      el("rect", { x: 90, y: 150, width: 620, height: 390, rx: 40, fill: BLUE, stroke: INK, "stroke-width": 4 }, radio);
      // the dial window: a scale, six lamps, six station names in two rows
      el("rect", { x: 130, y: 182, width: 540, height: 176, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, radio);
      el("path", { d: "M152 270 H648", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, radio);
      for (let x = 164; x <= 640; x += 21) el("path", { d: `M${x} 263 V277`, stroke: MUTE, "stroke-width": 1.5 }, radio);
      const pills = NAMES.map((n, i) => {
        const lamp = el("circle", { cx: X[i], cy: 270, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2 }, radio);
        const g = el("g", {}, radio), w = n.length * 11.4 + 26;
        const halo = el("rect", { x: -w / 2 - 6, y: -21, width: w + 12, height: 42, rx: 21, fill: "none", stroke: YEL, "stroke-width": 7 }, g);
        const pill = el("rect", { x: -w / 2, y: -17, width: w, height: 34, rx: 17, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        const label = txt(g, 0, 7, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        tf(g, X[i], RY[i % 2]);
        return { g, halo, pill, label, lamp };
      });
      const needle = el("g", {}, radio);
      el("path", { d: "M0 250 V290", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, needle);
      // speaker and tuning knob
      el("rect", { x: 150, y: 384, width: 250, height: 126, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, radio);
      const dots = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) dots.push({ r, n: el("circle", { cx: 174 + c * 25.25, cy: 408 + r * 26, r: 5, fill: BLUE }, radio) });
      const knob = el("g", {}, radio);
      el("circle", { r: 56, fill: YEL, stroke: INK, "stroke-width": 3 }, knob);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; el("path", { d: `M${Math.cos(a) * 44} ${Math.sin(a) * 44} L${Math.cos(a) * 52} ${Math.sin(a) * 52}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, knob); }
      el("circle", { r: 34, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, knob);
      el("path", { d: "M0 -10 V-26", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, knob);
      let user = null, lastX = X[5], shown = 5;
      button(radio, "Radio dial: move the needle to the next station", () => { user = { from: lastX, to: (shown + 1) % 6, at: api.now() }; api.poke(); });
      const autoX = (t) => { if (t < A[0]) return X[5] + (X[0] - X[5]) * io(seg(t, 0, A[0])); let x = X[0]; for (let i = 1; i < 6; i++) x += (X[i] - X[i - 1]) * io(seg(t, A[i] - 0.55, A[i])); return x; };
      return (t, now) => {
        let x, cur, since, seen, glow = 1;
        if (user) { const u = now - user.at; x = user.from + (X[user.to] - user.from) * io(seg(u, 0, 0.5)); cur = user.to; since = u - 0.5; seen = () => true; glow = seg(u, 0.4, 0.5); }
        else if (t < A[0]) { const f = t < 0.35; x = autoX(t); cur = 5; since = 9; seen = () => f; glow = 1 - seg(t, 0, 0.35); }
        else { x = autoX(t); cur = 0; for (let i = 1; i < 6; i++) if (t >= A[i]) cur = i; since = t - A[cur]; seen = (i) => t >= A[i]; }
        lastX = x; shown = cur;
        tf(needle, x, 0);
        tf(knob, 560, 447, 1, -150 + (300 * (x - X[0])) / (X[5] - X[0]));
        pills.forEach((p, i) => {
          const on = i === cur && glow > 0, vis = seen(i), pop = on && since >= 0 ? Math.sin(seg(since, 0, 0.4) * Math.PI) : 0;
          p.pill.setAttribute("fill", on ? YEL : vis ? SOFT : "#fff");
          p.label.setAttribute("fill", on || vis ? INK : MUTE);
          p.lamp.setAttribute("fill", on ? YEL : vis ? MINT : "#fff");
          p.halo.setAttribute("opacity", on ? glow : 0);
          p.halo.setAttribute("stroke-width", 6 + 2.5 * Math.sin(now * 5));
          tf(p.g, X[i], RY[i % 2], 1 + 0.1 * pop);
        });
        dots.forEach((d) => { const s = since - d.r * 0.07; d.n.setAttribute("r", 5 + 2.5 * (s >= 0 ? Math.sin(seg(s, 0, 0.5) * Math.PI) : 0)); });
      };
    },
  };

  /* ---- 2. a kite climbs past a knot, takes one of two routes, meets the Review flag ---- */
  SC.kite = {
    dur: 7.5, still: 7.5,
    build(svg, api) {
      const T1 = [0.5, 1.7], T2 = [1.9, 4.9], COL = [SKY, LIL];
      const TRUNK = "M400 548 V432", BR = ["M400 432 C215 404 175 190 400 150", "M400 432 C585 404 625 190 400 150"];
      hint(svg, "Tap the kite");
      const tracks = [TRUNK, ...BR].map((d) => el("path", { d, stroke: SOFT, "stroke-width": 14, fill: "none", "stroke-linecap": "round" }, svg));
      [TRUNK, ...BR].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 2, fill: "none", "stroke-dasharray": "2 9", "stroke-linecap": "round" }, svg));
      const trunk = el("path", { d: TRUNK, stroke: INK, "stroke-width": 3, fill: "none" }, svg);
      const brs = BR.map((d) => el("path", { d, stroke: INK, "stroke-width": 3, fill: "none" }, svg));
      const Lt = trunk.getTotalLength(), Lb = brs.map((p) => p.getTotalLength());
      // spool
      const spool = el("g", { transform: "translate(400 566)" }, svg);
      el("rect", { x: -38, y: -12, width: 76, height: 24, rx: 4, fill: LIL, stroke: INK, "stroke-width": 3 }, spool);
      el("path", { d: "M-30 -5 H30 M-30 1 H30 M-30 7 H30", stroke: INK, "stroke-width": 1.5 }, spool);
      [-50, 36].forEach((x) => el("rect", { x, y: -20, width: 14, height: 40, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, spool));
      // knot and its label
      el("path", { d: "M407 438 L432 462", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const knotTag = el("g", {}, svg);
      const knotPill = el("rect", { x: 0, y: -18, width: 204, height: 36, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, knotTag);
      txt(knotTag, 102, 7, "1,000 subscribers", { "text-anchor": "middle", "font-size": 19 });
      const knot = el("circle", { cx: 400, cy: 432, r: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      // the two route labels
      [[46, "4,000", "watch hours"], [590, "10 million", "Shorts views"]].forEach(([x, a, b], i) => {
        el("rect", { x, y: 266, width: 164, height: 66, rx: 22, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, svg);
        txt(svg, x + 82, 294, a, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        txt(svg, x + 82, 320, b, { "text-anchor": "middle", "font-size": 19 });
      });
      // the Review flag where both routes meet
      el("path", { d: "M400 150 V46", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("circle", { cx: 400, cy: 44, r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      const flag = el("path", { fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      txt(svg, 466, 83, "Review", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      // the kite
      const kite = el("g", {}, svg), body = el("g", {}, kite);
      el("circle", { r: 46, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, kite);
      const tail = el("path", { fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, body);
      const bows = [LIL, MINT, SKY].map((c) => el("path", { d: "M0 0 L-9 -5 V5 Z M0 0 L9 -5 V5 Z", fill: c, stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, body));
      [["M0 -36 L-26 -4 L0 -4 Z", YEL], ["M0 -36 L26 -4 L0 -4 Z", BLUE], ["M-26 -4 L0 32 L0 -4 Z", BLUE], ["M26 -4 L0 32 L0 -4 Z", YEL]].forEach(([d, c]) => el("path", { d, fill: c }, body));
      el("path", { d: "M0 -36 L26 -4 L0 32 L-26 -4 Z M0 -36 V32 M-26 -4 H26", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
      let side = 0, user = null, lastB = 0, lastP = 0, onBranch = false;
      button(kite, "Kite: switch which path it follows", () => {
        if (onBranch) user = { at: api.now(), from: lastB, p0: lastP };
        side = 1 - side; api.poke();
      });
      const dash = (p, L, k) => { p.setAttribute("stroke-dasharray", `${L * k} ${L + 20}`); p.setAttribute("opacity", k > 0.002 ? 1 : 0); };
      return (t, now) => {
        let pt, pb, b = side, op = 1, f = 1;
        if (user) {
          const u = now - user.at, bd = 0.2 + 0.6 * user.p0;
          pt = 1;
          if (u < bd) { b = user.from; pb = user.p0 * (1 - io(u / bd)); }
          else pb = io(seg(T2[0] + u - bd, T2[0], T2[1]));
        } else if (t < 0.6) {
          // loop seam: the finished climb fades out, the kite comes back at the spool
          if (t < 0.3) { pt = 1; pb = 1; f = 1 - seg(t, 0, 0.3); op = f; } else { pt = 0; pb = 0; op = seg(t, 0.35, 0.6); }
        } else { pt = io(seg(t, T1[0], T1[1])); pb = io(seg(t, T2[0], T2[1])); }
        onBranch = !!user || t >= T2[0]; lastB = b; lastP = pb;
        const up = pt >= 1 && (pb > 0 || !!user || t >= T2[0] || t < 0.3);
        dash(trunk, Lt, pt); brs.forEach((p, i) => dash(p, Lb[i], i === b && up ? pb : 0));
        [trunk, ...brs].forEach((p) => p.setAttribute("stroke-opacity", f));
        tracks.forEach((p, i) => p.setAttribute("stroke", i > 0 && i - 1 === b && up ? COL[b] : SOFT));
        let x, y, tilt = 0;
        if (up) {
          const L = Lb[b] * pb, P = brs[b].getPointAtLength(L), a = brs[b].getPointAtLength(Math.max(0, L - 2)), c = brs[b].getPointAtLength(Math.min(Lb[b], L + 2));
          x = P.x; y = P.y; tilt = cl((Math.atan2(c.y - a.y, c.x - a.x) * 180 / Math.PI + 90) * 0.3, -18, 18);
        } else { x = 400; y = 548 - (548 - 432) * pt; }
        kite.setAttribute("opacity", op); tf(kite, x, y);
        body.setAttribute("transform", `rotate(${tilt + 4 * Math.sin(now * 2)})`);
        const pts = [[0, 32]];
        for (let i = 1; i <= 5; i++) pts.push([Math.sin(now * 3 + i * 0.9) * i * 2.4, 32 + i * 16]);
        tail.setAttribute("d", "M" + pts.map((p) => p.join(" ")).join(" L"));
        [2, 4, 5].forEach((j, i) => bows[i].setAttribute("transform", `translate(${pts[j][0]} ${pts[j][1]})`));
        const passed = pt >= 1, kp = passed && !user && t >= T1[1] ? Math.sin(seg(t, T1[1], T1[1] + 0.4) * Math.PI) : 0;
        knotPill.setAttribute("fill", passed ? YEL : "#fff");
        knotTag.setAttribute("transform", `translate(432 474) scale(${1 + 0.08 * kp})`);
        knot.setAttribute("r", 9 + 4 * kp);
        const arrived = up && pb >= 1, w = 6 * Math.sin(now * 3);
        flag.setAttribute("d", `M402 48 Q466 ${48 + w} 530 48 V100 Q466 ${100 + w} 402 100 Z`);
        flag.setAttribute("fill", arrived ? MINT : "#fff");
      };
    },
  };

  /* ---- 3. five agent books slide onto a shelf, the You approve bookend holds them ---- */
  const JOB = [
    (g) => { // News watcher: a newspaper
      el("rect", { x: -17, y: -14, width: 34, height: 28, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
      el("rect", { x: -11, y: -8, width: 11, height: 9, rx: 1.5, fill: YEL, stroke: INK, "stroke-width": 1.5 }, g);
      el("path", { d: "M4 -7 H11 M4 -1 H11 M-11 7 H11", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
    },
    (g) => { // Script writer: a pencil on a written line
      el("path", { d: "M-18 16 Q-13 11 -8 16 T2 16", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
      const p = el("g", { transform: "translate(4 -2) rotate(40)" }, g);
      el("rect", { x: -5, y: -18, width: 10, height: 24, rx: 2, fill: YEL, stroke: INK, "stroke-width": 2 }, p);
      el("path", { d: "M-5 6 L0 15 L5 6 Z", fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, p);
    },
    (g) => { // Editor: a film strip
      el("rect", { x: -19, y: -13, width: 38, height: 26, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
      for (let i = 0; i < 4; i++) { el("rect", { x: -15 + i * 9, y: -10, width: 4, height: 4, fill: "#fff" }, g); el("rect", { x: -15 + i * 9, y: 6, width: 4, height: 4, fill: "#fff" }, g); }
      el("path", { d: "M0 -4 V4", stroke: INK, "stroke-width": 2 }, g);
    },
    (g) => { // Titles: a bold T
      el("path", { d: "M-15 -15 H15 V-6 H5 V16 H-5 V-6 H-15 Z", fill: BLUE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    },
    (g) => { // Analyst: rising bars
      [[-15, 10, SKY], [-4, 18, MINT], [7, 27, YEL]].forEach(([x, h, c]) => el("rect", { x, y: 14 - h, width: 9, height: h, rx: 1.5, fill: c, stroke: INK, "stroke-width": 2 }, g));
      el("path", { d: "M-18 15 H18", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
    },
  ];
  SC.bookshelf = {
    dur: 8.5, still: 8.5,
    build(svg, api) {
      const B = [["News", "watcher"], ["Script", "writer"], ["Editor"], ["Titles"], ["Analyst"]];
      const NAME = B.map((l) => l.join(" ")), H = [250, 232, 262, 226, 244], C = [YEL, BLUE, LIL, SKY, MINT];
      const X = B.map((_, i) => 76 + i * 108), S = B.map((_, i) => 0.6 + 0.7 * i);
      hint(svg, "Tap a book");
      [140, 660].forEach((x) => el("path", { d: `M${x - 24} 462 V516 L${x + 30} 462 Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg));
      el("rect", { x: 40, y: 440, width: 720, height: 22, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const end = el("g", {}, svg);
      el("path", { d: "M724 440 V378 L754 440 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, end);
      el("rect", { x: 618, y: 246, width: 106, height: 194, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, end);
      txt(end, 671, 312, "You", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      txt(end, 671, 338, "approve", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      el("circle", { cx: 671, cy: 390, r: 19, fill: MINT, stroke: INK, "stroke-width": 2.5 }, end);
      el("path", { d: "M662 390 L668 396 L680 383", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, end);
      let sel = -1, selAt = -9, prev = -1, prevAt = -9, pinned = false;
      const tap = (i) => { const now = api.now(); prev = sel; prevAt = now; sel = sel === i ? -1 : i; selAt = now; pinned = true; api.poke(); };
      const tipK = (i, now) => (i === sel ? oc(seg(now - selAt, 0, 0.45)) : i === prev ? 1 - oc(seg(now - prevAt, 0, 0.35)) : 0);
      const books = B.map((lines, i) => {
        const h = H[i], g = el("g", {}, svg), spine = el("g", {}, g);
        el("rect", { x: -5, y: -h - 5, width: 110, height: h + 10, rx: 12, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("rect", { x: 0, y: -h, width: 100, height: h, rx: 8, fill: C[i], stroke: INK, "stroke-width": 3 }, spine);
        el("path", { d: `M10 ${-h + 18} H90 M10 -20 H90`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, spine);
        const lab = el("g", {}, spine);
        el("rect", { x: 6, y: -h + 34, width: 88, height: lines.length * 26 + 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, lab);
        lines.forEach((s, j) => txt(lab, 50, -h + 62 + j * 26, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 }));
        // the cover that shows once the book tips forward
        const cover = el("g", { opacity: 0 }, g);
        el("rect", { x: -75, y: 0, width: 150, height: 126, rx: 12, fill: C[i], stroke: INK, "stroke-width": 3 }, cover);
        el("circle", { cx: 0, cy: 42, r: 29, fill: "#fff", stroke: INK, "stroke-width": 2 }, cover);
        JOB[i](el("g", { transform: "translate(0 42)" }, cover));
        el("rect", { x: -68, y: 82, width: 136, height: 34, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, cover);
        txt(cover, 0, 105, NAME[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        button(g, `${NAME[i]}: tip the book forward to show its one job`, () => tap(i));
        return { g, spine, cover, lab };
      });
      return (t, now) => {
        const te = pinned ? 8.5 : t, reset = te < 0.5, f0 = 1 - seg(te, 0, 0.45), straight = ob(seg(te, 4.8, 5.3));
        books.forEach((b, i) => {
          let x = X[i], op = 1, lean = 0;
          if (reset) op = f0;
          else if (te < S[i]) op = 0;
          else { x = 820 + (X[i] - 820) * oc(seg(te, S[i], S[i] + 0.6)); lean = 3 * seg(te, S[i] + 0.6, S[i] + 1) * (1 - straight); }
          const k = tipK(i, now);
          b.g.setAttribute("opacity", op); b.g.setAttribute("transform", `translate(${x} 440)`);
          b.spine.setAttribute("transform", `rotate(${lean} 100 0) scale(1 ${1 - 0.9 * k})`); b.lab.setAttribute("opacity", cl(1 - 2 * k));
          b.cover.setAttribute("opacity", k > 0.01 ? 1 : 0); b.cover.setAttribute("transform", `translate(50 22) scale(1 ${Math.max(k, 0.001)})`);
        });
        end.setAttribute("opacity", reset ? f0 : te < 4.3 ? 0 : 1);
        end.setAttribute("transform", `translate(${reset ? 0 : 260 * (1 - oc(seg(te, 4.3, 4.9)))} 0)`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.4, still: 3.4, once: true,
    build(svg) {
      el("rect", { x: 64, y: 40, width: 148, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 138, 68, "Use Cases", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 68, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 162, "GTA 6 YouTube", { "font-size": 68, "font-weight": 700 });
      txt(svg, 64, 236, "channel ideas", { "font-size": 68, "font-weight": 700 });
      el("path", { d: "M66 262 H280", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 314, "6 content channels an AI agent team can help run", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const F = [YEL, BLUE, LIL, SKY, MINT, SOFT];
      const tiles = ["News", "Map", "Mission", "Comparisons", "Tips", "Places"].map((n, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: 0, y: 0, width: 264, height: 52, rx: 14, fill: F[i], stroke: INK, "stroke-width": 2 }, g);
        txt(g, 132, 33, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return g;
      });
      return (t) => tiles.forEach((g, i) => { const a = 0.3 + i * 0.3, k = oc(seg(t, a, a + 0.6)); g.setAttribute("opacity", seg(t, a, a + 0.25)); tf(g, 64 + (i % 3) * 284 - 70 * (1 - k), 352 + Math.floor(i / 3) * 68); });
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
