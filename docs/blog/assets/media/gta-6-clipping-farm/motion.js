/* Bright coded scenes for "GTA 6 Clipping Farm". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9";
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
  let uid = 0; const nid = (p) => `mgf-${p}-${++uid}`; // a counter, never random, keeps SVG ids unique
  const ring = (p, x, y, w, h, rx = 18) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, p);
  const perf = (g, w, h) => { for (let k = 0; k < 4; k++) el("rect", { x: -w / 2 + 14 + k * ((w - 40) / 3), y: -h / 2 + 7, width: 12, height: 7, rx: 2, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, g); };
  const star = (cx, cy, R, r) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R; d += (i ? "L" : "M") + (cx + Math.cos(a) * q).toFixed(1) + " " + (cy + Math.sin(a) * q).toFixed(1); } return d + "Z"; };

  const SC = {};

  /* ---- 1. clip cards drop into a sieve; only Narrated playthrough falls through ---- */
  SC.sieve = {
    dur: 7.5, still: 7.5,
    build(svg, api) {
      svg = el("g", { transform: "translate(0 -50)" }, svg); // sit the scene on the frame's centre line
      const CW = 130, CH = 80, REST = 290, SAFE = 2, TY = 432;
      const LAB = [["Ending"], ["Cutscene", "compilation"], ["Narrated", "playthrough"], ["Leaked", "footage"]];
      const FILL = [LIL, SKY, MINT, BLUE], X = [165, 301, 437, 573], D = [0.6, 0.85, 1.1, 1.35];
      const defs = el("defs", {}, svg), pid = nid("mesh");
      const pat = el("pattern", { id: pid, width: 12, height: 12, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
      el("rect", { width: 12, height: 12, fill: SKY, "fill-opacity": 0.35 }, pat);
      el("path", { d: "M6 0 V12 M0 6 H12", stroke: BLUE, "stroke-width": 1.6 }, pat);
      // tray, back face first so the card sits inside it
      el("path", { d: "M304 452 H570 L592 476 H282 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const layer = el("g", {}, svg);
      const cards = LAB.map((lines, i) => {
        const g = el("g", {}, layer);
        el("rect", { x: -CW / 2, y: -CH / 2, width: CW, height: CH, rx: 10, fill: FILL[i], stroke: INK, "stroke-width": 3 }, g);
        perf(g, CW, CH);
        lines.forEach((s, j) => txt(g, 0, lines.length === 1 ? 15 : 4 + j * 21, s, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 }));
        return g;
      });
      const sv = el("g", {}, svg);
      el("rect", { x: 8, y: 140, width: 790, height: 222, fill: "#fff", "fill-opacity": 0 }, sv);
      ring(sv, 4, 134, 792, 232);
      el("path", { d: "M716 179 L786 151", stroke: INK, "stroke-width": 16, "stroke-linecap": "round" }, sv);
      el("path", { d: "M716 179 L786 151", stroke: LIL, "stroke-width": 10, "stroke-linecap": "round" }, sv);
      el("circle", { cx: 774, cy: 156, r: 3.5, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, sv);
      el("path", { d: "M40 180 C40 292 58 330 96 330 H644 C682 330 700 292 700 180 L722 180 C722 306 700 352 644 352 H96 C40 352 18 306 18 180 Z", fill: `url(#${pid})`, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, sv);
      el("rect", { x: 12, y: 172, width: 34, height: 14, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, sv);
      el("rect", { x: 694, y: 172, width: 34, height: 14, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, sv);
      button(sv, "Shake the sieve and drop the cards again", () => api.seek(0));
      // tray front face, drawn over the card that lands in it
      el("path", { d: "M282 476 H592 V528 Q592 540 580 540 H294 Q282 540 282 528 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      txt(svg, 437, 516, "Safe to post", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      return (t) => {
        const f0 = 1 - seg(t, 0, 0.5);
        const sh1 = t < 0.6 ? Math.sin(t * 40) * 9 * (1 - seg(t, 0, 0.6)) : 0;
        const e2 = seg(t, 2.3, 3.6), sh2 = Math.sin((t - 2.3) * 30) * 8 * Math.sin(e2 * Math.PI);
        const dx = sh1 + sh2;
        tf(sv, dx, 0);
        cards.forEach((g, i) => {
          let x = X[i] + dx, y = REST, r = 0, o = 1;
          if (t < D[i]) { o = f0; if (i === SAFE) { x = X[i]; y = TY; } }
          else {
            const p = seg(t, D[i], D[i] + 0.5);
            y = -90 + (REST + 90) * p * p - Math.sin(seg(t, D[i] + 0.5, D[i] + 0.8) * Math.PI) * 12;
            r = (i % 2 ? 10 : -10) * (1 - p);
            if (i === SAFE && t > 2.9) {
              const s = io(seg(t, 2.9, 3.7)), f = seg(t, 3.7, 4.2);
              y = REST + 60 * s + (TY - REST - 60) * f * f - Math.sin(seg(t, 4.2, 4.45) * Math.PI) * 8;
              x = X[i] + (t < 3.7 ? dx : 0);
              r = Math.sin(t * 9) * 3 * (1 - seg(t, 3.7, 4.2));
            }
          }
          g.setAttribute("opacity", o);
          tf(g, x, y, 1, r);
        });
      };
    },
  };

  /* ---- 2. a film strip rides a conveyor past six stations ---- */
  SC.conveyor = {
    dur: 12, still: 12,
    build(svg, api) {
      const NM = ["Scout", "Cutter", "Captioner", "Writer", "Tracker", "You"];
      const COL = [YEL, BLUE, SKY, LIL, MINT, SOFT];
      const JOB = ["reads the campaigns and notes each rate, budget, platform and requirement", "cuts clips with ffmpeg from the footage the campaign provides", "turns a transcript of each clip into subtitles", "drafts a hook and a title per platform, with no spoilers", "keeps one sheet: clip, post link, views, approval, payout", "watch every clip, post it from your own account and submit the link"];
      const ICON = [
        (g) => { el("circle", { cx: -5, cy: -5, r: 14, fill: YEL, stroke: INK, "stroke-width": 3.5 }, g); el("path", { d: "M5 5 L19 19", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g); },
        (g) => { el("path", { d: "M-8 8 L14 -20 M8 8 L-14 -20", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g); [-11, 11].forEach((x) => el("circle", { cx: x, cy: 14, r: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, g)); },
        (g) => { el("rect", { x: -24, y: -18, width: 48, height: 36, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-14 3 H14 M-9 10 H9", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); },
        (g) => { const p = el("g", { transform: "rotate(40)" }, g); el("path", { d: "M-6 -24 H6 V12 L0 24 L-6 12 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p); el("path", { d: "M-6 12 H6", stroke: INK, "stroke-width": 2.5 }, p); },
        (g) => { el("rect", { x: -20, y: -20, width: 40, height: 40, rx: 4, fill: MINT, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-20 -6 H20 M-20 7 H20 M-6 -20 V20", stroke: INK, "stroke-width": 2 }, g); },
        (g) => { el("circle", { cx: 0, cy: -16, r: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, g); el("rect", { x: -5, y: -9, width: 10, height: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, g); el("rect", { x: -20, y: 3, width: 40, height: 12, rx: 3, fill: MINT, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-18 22 H18", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); },
      ];
      svg = el("g", { transform: "translate(0 -40)" }, svg); // sit the scene on the frame's centre line
      const S = NM.map((_, i) => 70 + i * 132), A = NM.map((_, i) => 0.7 + i * 1.45), BOX = 246;
      // belt, legs and rollers
      el("path", { d: "M110 474 V540 M690 474 V540 M92 540 H128 M672 540 H708", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("rect", { x: 14, y: 432, width: 772, height: 42, rx: 21, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const rollers = [];
      for (let x = 44; x <= 756; x += 64) { const g = el("g", {}, svg); el("circle", { r: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); el("path", { d: "M-7 0 H7", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g); rollers.push([g, x]); }
      const surf = el("path", { d: "M36 438 H764", stroke: INK, "stroke-width": 2, "stroke-dasharray": "8 14", "stroke-linecap": "round" }, svg);
      // stations, each a button
      let open = -1;
      const st = NM.map((n, i) => {
        const g = el("g", {}, svg), plunger = el("g", {}, svg), box = el("g", {}, g);
        const rod = el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, plunger);
        const head = el("rect", { x: S[i] - 16, width: 32, height: 12, rx: 4, fill: COL[i], stroke: INK, "stroke-width": 3 }, plunger);
        ring(g, -64, -44, 128, 88, 18);
        el("rect", { x: -56, y: -36, width: 112, height: 72, rx: 14, fill: COL[i], stroke: INK, "stroke-width": 3 }, box);
        txt(box, 0, 6, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        tf(g, S[i], BOX);
        button(g, `${n}: ${JOB[i]}`, () => { open = open === i ? -1 : i; api.paint(); });
        return { g, box, rod, head };
      });
      // the film strip; mk(true) is the finished strip leaving at the loop start
      const layer = el("g", {}, svg);
      const mk = () => {
        const g = el("g", {}, layer);
        el("rect", { x: -62, y: -48, width: 124, height: 96, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        for (let k = 0; k < 6; k++) [-43, 36].forEach((y) => el("rect", { x: -54 + k * 20, y, width: 8, height: 7, rx: 1.5, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, g));
        el("path", { d: "M-62 -32 H62 M-62 32 H62", stroke: INK, "stroke-width": 1.5 }, g);
        const mark = (cx, cy, f) => { const m = el("g", {}, g); f(m); return { m, cx, cy }; };
        const marks = [
          mark(44, -24, (m) => el("path", { d: star(44, -24, 7, 3), fill: YEL, stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, m)),
          mark(0, 0, (m) => el("path", { d: "M-62 -9 L-52 0 L-62 9 Z M62 -9 L52 0 L62 9 Z", fill: BLUE, stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, m)),
          mark(-10, 22, (m) => el("rect", { x: -36, y: 19, width: 52, height: 7, rx: 3.5, fill: SKY, stroke: INK, "stroke-width": 1.5 }, m)),
          mark(-17, -23, (m) => el("rect", { x: -40, y: -27, width: 46, height: 8, rx: 4, fill: LIL, stroke: INK, "stroke-width": 1.5 }, m)),
          mark(36, 21, (m) => [[26, 22, 6], [33, 18, 10], [40, 14, 14]].forEach(([x, y, h]) => el("rect", { x, y, width: 5, height: h, fill: MINT, stroke: INK, "stroke-width": 1.2 }, m))),
          mark(0, 0, (m) => { const s = el("g", { transform: "rotate(-4)" }, m); el("rect", { x: -42, y: -12, width: 84, height: 24, rx: 5, fill: MINT, stroke: INK, "stroke-width": 2 }, s); txt(s, 0, 5, "Approved", { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 }); }),
        ];
        return { g, marks };
      };
      const ghost = mk(), strip = mk();
      // the job card that a tap opens
      const pop = el("g", {}, svg), popPath = el("path", { fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pop);
      const icons = ICON.map((f) => { const g = el("g", {}, pop); f(g); return g; });
      const popName = txt(pop, 0, -26, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
      svg.addEventListener("keydown", (e) => { if (e.key === "Escape" && open >= 0) { open = -1; api.paint(); } });
      const xAt = (t) => {
        if (t < A[0]) return -90 + 160 * io(seg(t, 0.1, A[0]));
        for (let i = 0; i < 5; i++) if (t < A[i + 1]) return S[i] + 132 * io(seg(t, A[i] + 0.9, A[i + 1]));
        return S[5];
      };
      const press = (i) => (i < 5 ? [A[i] + 0.15, A[i] + 0.75] : [A[5] + 1.1, A[5] + 1.7]);
      return (t) => {
        const x = xAt(t);
        tf(strip.g, x, 384);
        strip.marks.forEach((k, i) => { const p = press(i), s = ob(seg(t, (p[0] + p[1]) / 2 - 0.02, p[1] + 0.1)); k.m.setAttribute("opacity", s > 0 ? 1 : 0); k.m.setAttribute("transform", `translate(${k.cx} ${k.cy}) scale(${s}) translate(${-k.cx} ${-k.cy})`); });
        const gx = 730 + 220 * io(seg(t, 0, 0.7));
        tf(ghost.g, gx, 384); ghost.g.setAttribute("opacity", 1 - seg(t, 0.35, 0.7));
        surf.setAttribute("stroke-dashoffset", -x);
        rollers.forEach(([g, rx]) => tf(g, rx, 453, 1, (x * 180) / (Math.PI * 12)));
        st.forEach((s, i) => {
          const p = press(i), d = 4 + 38 * Math.sin(Math.PI * seg(t, p[0], p[1]));
          s.rod.setAttribute("d", `M${S[i]} 282 V${286 + d}`); s.head.setAttribute("y", 286 + d);
          const here = t >= A[i] && (i === 5 || t < A[i] + 0.9);
          s.box.setAttribute("transform", `scale(${here ? 1 + 0.05 * ob(seg(t, A[i], A[i] + 0.3)) : 1})`);
        });
        pop.setAttribute("opacity", open >= 0 ? 1 : 0);
        if (open >= 0) {
          const cx = cl(S[open], 92, 708), o = S[open] - cx;
          popPath.setAttribute("d", `M-68 -112 H68 Q80 -112 80 -100 V-24 Q80 -12 68 -12 H${o + 10} L${o} 0 L${o - 10} -12 H-68 Q-80 -12 -80 -24 V-100 Q-80 -112 -68 -112 Z`);
          icons.forEach((g, i) => { g.setAttribute("opacity", i === open ? 1 : 0); g.setAttribute("transform", "translate(0 -72) scale(1.25)"); });
          popName.textContent = NM[open];
          tf(pop, cx, 206);
        }
      };
    },
  };

  /* ---- 3. an hourglass budget pays approved cards into a jar ---- */
  SC.hourglass = {
    dur: 11, still: 11,
    build(svg, api) {
      const HX = 200, HY = 280, JX = 610;
      const defs = el("defs", {}, svg), ct = nid("top"), cb = nid("bot"), cj = nid("jar");
      const GLASS = "M-75 -140 C-75 -60 -12 -40 -10 0 C-12 40 -75 60 -75 140 H75 C75 60 12 40 10 0 C12 -40 75 -60 75 -140 Z";
      el("path", { d: "M-75 -140 C-75 -60 -12 -40 -10 0 L10 0 C12 -40 75 -60 75 -140 Z" }, el("clipPath", { id: ct }, defs));
      el("path", { d: "M-75 140 C-75 60 -12 40 -10 0 L10 0 C12 40 75 60 75 140 Z" }, el("clipPath", { id: cb }, defs));
      const JAR = "M520 250 V410 Q520 440 550 440 H670 Q700 440 700 410 V250";
      el("path", { d: JAR + " Z" }, el("clipPath", { id: cj }, defs));
      el("path", { d: "M40 440 H760", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      txt(svg, HX, 490, "Campaign budget", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      // the hourglass, a button
      const hb = el("g", {}, svg); tf(hb, HX, HY);
      el("rect", { x: -110, y: -172, width: 220, height: 344, fill: "#fff", "fill-opacity": 0 }, hb);
      ring(hb, -118, -178, 236, 356);
      const hg = el("g", {}, hb);
      el("path", { d: "M-88 -140 V140 M88 -140 V140", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, hg);
      el("path", { d: GLASS, fill: "#fff" }, hg);
      const sTop = el("rect", { x: -80, width: 160, fill: YEL, "clip-path": `url(#${ct})` }, hg);
      const sBot = el("rect", { x: -80, width: 160, fill: YEL, "clip-path": `url(#${cb})` }, hg);
      const stream = el("path", { stroke: YEL, "stroke-width": 4, "stroke-linecap": "round", "stroke-dasharray": "5 5" }, hg);
      el("path", { d: GLASS, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, hg);
      el("rect", { x: -100, y: -160, width: 200, height: 20, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, hg);
      el("rect", { x: -100, y: 140, width: 200, height: 20, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, hg);
      button(hb, "Turn the hourglass over to start a new campaign", () => api.seek(0));
      // the jar of paid grains
      el("path", { d: JAR + " Z", fill: "#fff" }, svg);
      const gl = el("g", { "clip-path": `url(#${cj})` }, svg), PER = 22, grains = [];
      for (let r = 0; r < 8; r++) for (let c = 0; c < 11; c++) grains.push({ n: el("circle", { cx: 534 + c * 14.2 + (r % 2 ? 7 : 0), cy: 429 - r * 14, r: 6.5, fill: YEL, stroke: INK, "stroke-width": 1.5 }, gl) });
      const parts = Array.from({ length: 7 }, () => el("circle", { r: 4, fill: YEL, stroke: INK, "stroke-width": 1.2 }, svg));
      el("path", { d: JAR, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("rect", { x: 508, y: 236, width: 204, height: 16, rx: 8, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 566, y: 366, width: 88, height: 42, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, JX, 396, "Paid", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      // the cards
      const KIND = [1, 1, 0, 1, 1], S0 = KIND.map((_, k) => 1.1 + k * 1.55);
      const POUR = [0, 1, 3, 4].map((k) => [S0[k] + 0.55, S0[k] + 1.05]);
      const layer = el("g", {}, svg);
      const cards = KIND.map((ok) => {
        const g = el("g", {}, layer);
        el("rect", { x: -75, y: -40, width: 150, height: 80, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        perf(g, 150, 80);
        const s = el("g", { transform: "translate(0 6) rotate(-5)" }, g);
        el("rect", { x: -58, y: -17, width: 116, height: 34, rx: 8, fill: ok ? MINT : LIL, stroke: INK, "stroke-width": 2.5 }, s);
        txt(s, 0, 8, ok ? "Approved" : "Rejected", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
        return g;
      });
      const REST = [JX, 196, -3], RJ = [405, 392, -6];
      // the tag
      const tag = el("g", {}, svg);
      el("path", { d: "M296 124 Q330 128 346 168", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, tag);
      el("rect", { x: 330, y: 150, width: 186, height: 46, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 346, cy: 173, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      txt(tag, 436, 181, "Budget spent", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      return (t) => {
        const f0 = 1 - seg(t, 0, 0.5);
        // hourglass: turns over first, then drains a quarter per approved card
        const drained = POUR.reduce((a, [p0, p1]) => a + seg(t, p0, p1), 0) / 4;
        let a = 1 - drained, rot = 0, lift = 0;
        if (t < 0.85) { const k = io(seg(t, 0.05, 0.85)); a = 0; rot = 180 * k; lift = -34 * Math.sin(Math.PI * k); }
        tf(hg, 0, lift, 1, rot);
        sTop.setAttribute("y", -125 * a); sTop.setAttribute("height", 125 * a);
        const b = 1 - a; sBot.setAttribute("y", 140 - 122 * b); sBot.setAttribute("height", 122 * b);
        const flowing = t >= 0.85 && POUR.some(([p0, p1]) => t > p0 && t < p1);
        stream.setAttribute("d", `M0 2 V${138 - 122 * b}`); stream.setAttribute("opacity", flowing ? 1 : 0); stream.setAttribute("stroke-dashoffset", -t * 60);
        // grains in the jar
        grains.forEach((g, i) => {
          const j = Math.floor(i / PER), ta = POUR[j][0] + 0.05 + ((i % PER) / PER) * 0.38, k = seg(t, ta, ta + 0.14);
          const on = t < 1 ? f0 : k > 0 ? 1 : 0;
          g.n.setAttribute("opacity", on); g.n.setAttribute("transform", `translate(0 ${t < 1 ? 0 : -30 * (1 - k)})`);
        });
        const pj = POUR.findIndex(([p0, p1]) => t > p0 && t < p1);
        parts.forEach((n, i) => {
          if (pj < 0) { n.setAttribute("opacity", 0); return; }
          const u = t - POUR[pj][0], fr = (u * 2.4 + i / 7) % 1, sy = 430 - 28 * (pj + 1);
          n.setAttribute("opacity", 1); n.setAttribute("cx", 650 + ((i * 37) % 21) - 10); n.setAttribute("cy", 222 + (sy - 222) * fr);
        });
        // cards
        cards.forEach((g, k) => {
          const s = S0[k], ok = KIND[k], last = k === 4;
          let x = JX, y = -100, r = 0, o = 1;
          if (t < s) { if (t < 0.9 && (k === 2 || last)) { [x, y, r] = k === 2 ? RJ : REST; o = f0; } else o = 0; }
          else if (ok) {
            const p = seg(t, s, s + 0.45), tilt = io(seg(t, s + 0.45, s + 0.7)), out = io(seg(t, s + 1.05, s + 1.45));
            y = -100 + 250 * p * p; r = 28 * tilt;
            if (last) { y += (REST[1] - 150) * out; r += (REST[2] - 28) * out; }
            else { x += 330 * out; y -= 60 * out; r -= 18 * out; }
          } else {
            const p = seg(t, s, s + 0.45), q = seg(t, s + 0.45, s + 1.25);
            x = JX + (RJ[0] - JX) * q; y = -100 + 296 * p * p + (RJ[1] - 196) * q - 160 * Math.sin(Math.PI * q); r = RJ[2] * q - 360 * oc(q);
          }
          g.setAttribute("opacity", o); tf(g, x, y, 1, r);
        });
        // Budget spent tag once the top is empty
        const tk = ob(seg(t, 8.6, 9.1)), to = t < 1 ? f0 : seg(t, 8.6, 8.7), sw = 6 * Math.sin((t - 8.6) * 8) * (1 - seg(t, 8.6, 10));
        tag.setAttribute("opacity", to);
        tag.setAttribute("transform", t < 1 ? "" : `translate(296 124) rotate(${t > 8.6 ? sw : 0}) scale(${tk}) translate(-296 -124)`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4, once: true,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 148, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 138, 72, "Use Cases", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 72, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: "#7A6A88" });
      txt(svg, 64, 212, "GTA 6 clipping farm", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 246 H300", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 306, "A few honest accounts and a team of AI agents", { "font-size": 27, "font-weight": 500, fill: "#7A6A88" });
      el("path", { d: "M64 452 H896", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const tiles = ["Scout", "Cutter", "Captioner", "Writer", "Tracker", "You"].map((n, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: 0, y: 0, width: 124, height: 56, rx: 12, fill: [YEL, BLUE, SKY, LIL, MINT, SOFT][i], stroke: INK, "stroke-width": 2 }, g);
        txt(g, 62, 34, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        return g;
      });
      return (t) => tiles.forEach((g, i) => { const a = 0.4 + i * 0.4, k = oc(seg(t, a, a + 0.6)); g.setAttribute("opacity", seg(t, a, a + 0.25)); tf(g, 64 + i * 141.6 - 90 * (1 - k), 390); });
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
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, paint: () => frame() };
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
