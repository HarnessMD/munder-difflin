/* Bright coded scenes for "Goblin Tools Magic ToDo". Vanilla JS, no library.
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
  const bk = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bump = (x) => Math.sin(Math.PI * cl(x));
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* the tap target: a dashed focus ring (hover and focus) and a clear pad that catches taps */
  const target = (svg, x, y, w, h, label, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x, y, width: w, height: h, rx: 36, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x, y, width: w, height: h, rx: 36, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "12 12", class: "mg-ring" }, g);
    button(g, label, fn);
    return g;
  };
  const show = (n, k, dy = 40) => { n.setAttribute("opacity", cl(k)); n.setAttribute("transform", `translate(0 ${dy * (1 - k)})`); };
  const R = (v) => Math.round(v * 10) / 10;

  /* a yellow chili, drawn around 0,0 */
  const chili = (p) => {
    const g = el("g", {}, p);
    el("path", { d: "M-22 -15 C 4 -20, 30 -13, 40 4 C 45 12, 45 20, 41 25 C 32 17, 16 15, -2 15 C -12 15, -20 14, -24 10 C -32 5, -32 -11, -22 -15 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-31 -12 Q -22 -17 -16 -10 L -16 9 Q -22 15 -31 9 Q -36 0 -31 -12 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-31 -1 C -40 -4, -44 -12, -42 -24", stroke: INK, "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, g);
    el("path", { d: "M-31 -1 C -40 -4, -44 -12, -42 -24", stroke: MINT, "stroke-width": 4.5, fill: "none", "stroke-linecap": "round" }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. each chili up the spiciness slider tips the jar and pours more beans, and each bean becomes a step ---- */
  SC.jar = {
    dur: 9, loop: 1.5,
    build(svg, api) {
      const RY = (i) => 330 + i * 108, LW = [330, 270, 360, 300, 240, 340];
      const card = el("g", {}, svg);
      el("rect", { x: 978, y: 238, width: 540, height: 760, rx: 34, fill: LIL }, card);
      el("rect", { x: 960, y: 220, width: 540, height: 760, rx: 34, fill: SOFT, stroke: INK, "stroke-width": 3 }, card);
      const rows = LW.map((w, i) => {
        const box = el("g", {}, card);
        el("rect", { x: -27, y: -27, width: 54, height: 54, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, box);
        const line = el("rect", { x: 1086, y: RY(i) - 12, width: 0, height: 24, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, card);
        return { box, line, w };
      });

      const LY = [900, 740, 580, 420];
      const sl = el("g", {}, svg);
      el("rect", { x: 232, y: 340, width: 60, height: 640, rx: 30, fill: LIL }, sl);
      el("rect", { x: 220, y: 328, width: 60, height: 640, rx: 30, fill: SKY, stroke: INK, "stroke-width": 3 }, sl);
      const chilis = [1, 2, 3].map(() => chili(svg));
      const knob = el("g", {}, svg);
      el("circle", { cx: 7, cy: 7, r: 40, fill: LIL }, knob);
      el("circle", { r: 40, fill: "#fff", stroke: INK, "stroke-width": 3 }, knob);
      el("path", { d: "M-14 -9 H14 M-14 0 H14 M-14 9 H14", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, knob);

      const hit = target(svg, 368, 470, 410, 536, "Replay: slide the spiciness back down and pour again", () => api.replay());
      const jarOut = el("g", {}, hit), jar = el("g", {}, jarOut);
      el("rect", { x: 418, y: 618, width: 320, height: 360, rx: 56, fill: SOFT }, jar);
      el("rect", { x: 440, y: 556, width: 240, height: 64, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, jar);
      el("rect", { x: 400, y: 600, width: 320, height: 360, rx: 56, fill: LIL, stroke: INK, "stroke-width": 3 }, jar);
      el("rect", { x: 428, y: 640, width: 24, height: 190, rx: 12, fill: "#fff" }, jar);
      const lid = el("g", {}, jar);
      el("rect", { x: 425, y: 512, width: 270, height: 56, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, lid);
      el("path", { d: [470, 515, 560, 605, 650].map((x) => `M${x} 526 V554`).join(" "), stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, lid);
      const tag = el("g", {}, jar);
      el("rect", { x: -150, y: -36, width: 300, height: 72, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: -124, cy: 0, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 14, 9, "Spiciness level", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });

      const KN = [1.7, 3.6, 5.5], CNT = [1, 2, 3], ST = [0, 1, 3], A = 24;
      const T = KN.map((m) => m + 0.45), RET = T.map((x, k) => x + 0.55 + CNT[k] * 0.12);
      const ang = (t) => T.reduce((s, x, k) => s + A * (io(seg(t, x, x + 0.4)) - io(seg(t, RET[k], RET[k] + 0.45))), 0);
      const mouth = (a) => { const r = (a * Math.PI) / 180, dx = -80, dy = -408; return [720 + dx * Math.cos(r) - dy * Math.sin(r), 960 + dx * Math.sin(r) + dy * Math.cos(r)]; };
      const layer = el("g", {}, svg), beans = [];
      KN.forEach((m, k) => { for (let j = 0; j < CNT[k]; j++) {
        const L = T[k] + 0.32 + j * 0.12, row = ST[k] + j, P0 = mouth(ang(L)), P2 = [1132, RY(row)];
        const P1 = [(P0[0] + P2[0]) / 2, Math.min(P0[1], P2[1]) - 240];
        const n = el("g", { opacity: 0 }, layer);
        el("ellipse", { rx: 19, ry: 12, fill: MINT, stroke: INK, "stroke-width": 2.5 }, n);
        beans.push({ n, L, row, P0, P1, P2 });
      } });

      return (t) => {
        show(card, oc(seg(t, 0, 0.5)), 40);
        show(sl, oc(seg(t, 0.12, 0.6)), 40);
        let lv = 0; KN.forEach((m) => { lv += bk(seg(t, m, m + 0.55), 1.2); });
        chilis.forEach((c, k) => { const e = ob(seg(t, 0.3 + 0.1 * k, 0.75 + 0.1 * k)), pop = bump(seg(t, KN[k] + 0.3, KN[k] + 0.75)); tf(c, 122, LY[k + 1], Math.max(0, 1.25 * e * (1 + 0.22 * pop)), -8 * pop); });
        tf(knob, 250, LY[0] - 160 * lv, Math.max(0, ob(seg(t, 0.55, 0.95))));
        show(jarOut, oc(seg(t, 0.2, 0.75)), 60);
        const a = ang(t);
        jar.setAttribute("transform", `rotate(${R(a)} 720 960)`);
        lid.setAttribute("transform", `rotate(${R(-2.3 * a)} 425 568)`);
        tf(tag, 560, 770, Math.max(0, ob(seg(t, 0.95, 1.45))));
        rows.forEach((r) => { r.k = 0; r.b = 0; });
        beans.forEach((b) => {
          const p = seg(t, b.L, b.L + 0.55), m = seg(t, b.L + 0.55, b.L + 0.8), u = 1 - p;
          const x = u * u * b.P0[0] + 2 * u * p * b.P1[0] + p * p * b.P2[0], y = u * u * b.P0[1] + 2 * u * p * b.P1[1] + p * p * b.P2[1];
          b.n.setAttribute("opacity", t < b.L || m >= 1 ? 0 : 1);
          tf(b.n, R(x), R(y), (0.6 + 0.4 * oc(seg(t, b.L, b.L + 0.2))) * (1 - m), 400 * p);
          rows[b.row].k = oc(seg(t, b.L + 0.55, b.L + 0.95)); rows[b.row].b = seg(t, b.L + 0.5, b.L + 0.85);
        });
        rows.forEach((r, i) => {
          r.line.setAttribute("width", R(r.w * r.k)); r.line.setAttribute("opacity", r.k > 0.02 ? 1 : 0);
          tf(r.box, 1031, RY(i), Math.max(0, r.b > 0 ? ob(r.b) : 0));
        });
      };
    },
  };

  /* ---- 2. the button sorts a tangle of scribbles into a ticked list ---- */
  SC.notepad = {
    dur: 8, loop: 1.4,
    build(svg, api) {
      const hit = target(svg, 370, 58, 860, 1030, "Replay: tangle the scribbles and sort them again", () => api.replay());
      const pad = el("g", {}, hit);
      el("rect", { x: 418, y: 128, width: 800, height: 770, rx: 30, fill: LIL }, pad);
      el("rect", { x: 400, y: 110, width: 800, height: 770, rx: 30, fill: SOFT, stroke: INK, "stroke-width": 3 }, pad);
      for (let i = 0; i < 8; i++) el("rect", { x: 465 + i * 92, y: 82, width: 26, height: 58, rx: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, pad);
      const RY = [380, 480, 580, 680, 780], LEN = [500, 420, 540, 380, 460], K = 150;
      const CX = [690, 900, 780, 910, 700], CY = [470, 500, 560, 640, 650];
      const tangled = RY.map((_, j) => Array.from({ length: K }, (_, i) => { const s = i / (K - 1), a = 6.2832 * 1.15 * s + 1.3 * j, b = 6.2832 * (6 + j) * s + j; return [CX[j] + 170 * Math.cos(a) + 40 * Math.cos(b), CY[j] + 110 * Math.sin(a) + 34 * Math.sin(b)]; }));
      const boxes = RY.map((y) => { const g = el("g", {}, pad); el("rect", { x: -28, y: -28, width: 56, height: 56, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, g); return g; });
      const fillBox = boxes[0].firstChild;
      const tick = el("path", { d: "M-14 0 L-4 11 L15 -12", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 46, "stroke-dashoffset": 46 }, boxes[0]);
      const lines = RY.map(() => [el("path", { stroke: INK, "stroke-width": 18, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, pad), el("path", { stroke: LIL, "stroke-width": 12, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, pad)]);
      const head = el("g", {}, pad);
      el("rect", { x: -232, y: -38, width: 464, height: 76, rx: 38, fill: YEL, stroke: INK, "stroke-width": 3 }, head);
      txt(head, 0, 15, "Your tasks are:", { "text-anchor": "middle", "font-size": 44, "font-weight": 700 });
      const btn = el("g", {}, hit);
      el("rect", { x: 590, y: 962, width: 420, height: 96, rx: 48, fill: LIL, stroke: INK, "stroke-width": 3 }, btn);
      const face = el("g", {}, btn);
      el("rect", { x: 590, y: 950, width: 420, height: 96, rx: 48, fill: BLUE, stroke: INK, "stroke-width": 3 }, face);
      txt(face, 800, 1009, "Turn into tasks", { "text-anchor": "middle", "font-family": MONO, "font-size": 32, "font-weight": 700 });

      return (t) => {
        show(pad, oc(seg(t, 0, 0.5)), 40);
        const be = ob(seg(t, 0.6, 1.05));
        btn.setAttribute("opacity", cl(be * 3)); btn.setAttribute("transform", `translate(800 1004) scale(${Math.max(0, 0.8 + 0.2 * be)}) translate(-800 -1004)`);
        face.setAttribute("transform", `translate(0 ${R(12 * (io(seg(t, 1.7, 1.92)) - bk(seg(t, 2.0, 2.35), 1.4)))})`);
        lines.forEach((pair, j) => {
          const d0 = oc(seg(t, 0.25 + 0.1 * j, 1.05 + 0.1 * j)), n = Math.max(2, Math.ceil(K * d0));
          const p = seg(t, 2.3 + 0.12 * j, 3.7 + 0.12 * j);
          let d = "";
          for (let i = 0; i < n; i++) {
            const s = i / (K - 1), u = io(cl(p * 1.35 - s * 0.35)), [tx, ty] = tangled[j][i];
            d += (i ? "L" : "M") + R(tx + (590 + s * LEN[j] - tx) * u) + " " + R(ty + (RY[j] - ty) * u);
          }
          pair.forEach((n2) => { n2.setAttribute("d", d); n2.setAttribute("opacity", d0 > 0 ? 1 : 0); });
        });
        boxes.forEach((g, j) => { const k = seg(t, 3.5 + 0.1 * j, 3.85 + 0.1 * j), pop = j ? 0 : bump(seg(t, 5.3, 5.65)); tf(g, 516, RY[j], Math.max(0, k > 0 ? ob(k) * (1 + 0.18 * pop) : 0)); });
        fillBox.setAttribute("fill", t >= 5.3 ? MINT : SKY);
        tick.setAttribute("stroke-dashoffset", R(46 * (1 - oc(seg(t, 5.35, 5.8)))));
        const h = bk(seg(t, 4.4, 5.0), 1.4);
        head.setAttribute("opacity", cl(seg(t, 4.4, 4.6))); tf(head, 702, R(218 - 80 * (1 - h)));
      };
    },
  };

  /* ---- 3. the missing rung of a stepladder is fitted, then the rungs light up ---- */
  SC.stepladder = {
    dur: 8, loop: 1.4,
    build(svg, api) {
      const B = 1040, TP = 300, xl = (y) => 600 + (90 * (B - y)) / (B - TP), xr = (y) => 1000 - (90 * (B - y)) / (B - TP);
      const RYS = [920, 790, 660, 530, 400], GAP = 2;
      const hit = target(svg, 538, 112, 524, 984, "Replay: slide the sky rung out and fit it again", () => api.replay());
      const floor = el("rect", { x: 470, y: 1036, width: 660, height: 26, rx: 13, fill: SOFT }, hit);
      const rail = (f, side, col) => { const x0 = f(1052), x1 = f(282); return el("path", { d: `M${R(x0 - 22)} 1052 H${R(x0 + 22)} L${R(x1 + 22)} 282 H${R(x1 - 22)} Z`, fill: col, stroke: col === YEL ? INK : "none", "stroke-width": 3, "stroke-linejoin": "round" }, side); };
      const shadow = el("g", { transform: "translate(14 10)" }, hit);
      const shW = el("g", {}, shadow);
      el("rect", { x: 640, y: 246, width: 320, height: 52, rx: 12, fill: LIL }, shW);
      const halos = RYS.map((y) => el("rect", { x: R(xl(y) + 10), y: y - 15, width: R(xr(y) - xl(y) - 20), height: 30, rx: 15, fill: MINT }, hit));
      const rungs = RYS.map((y, i) => i === GAP ? null : el("rect", { x: R(xl(y) - 4), y: y - 15, width: R(xr(y) - xl(y) + 8), height: 30, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, hit));
      const gy = RYS[GAP];
      const slot = el("rect", { x: R(xl(gy) + 22), y: gy - 15, width: R(xr(gy) - xl(gy) - 44), height: 30, rx: 8, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 10" }, hit);
      const sky = el("rect", { x: R(xl(gy) - 4), y: gy - 15, width: R(xr(gy) - xl(gy) + 8), height: 30, rx: 8, fill: SKY, stroke: INK, "stroke-width": 3 }, hit);
      const rails = [xl, xr].map((f) => { const g = el("g", {}, hit); rail(f, g, YEL); const x0 = f(1052); el("rect", { x: R(x0 - 28), y: 1034, width: 56, height: 24, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, g); return g; });
      const top = el("rect", { x: 640, y: 246, width: 320, height: 52, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, hit);
      const tag = el("g", {}, hit);
      el("rect", { x: -160, y: -44, width: 320, height: 88, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: -128, cy: 0, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 16, 12, "first draft", { "text-anchor": "middle", "font-family": MONO, "font-size": 36, "font-weight": 700 });

      return (t) => {
        const f = oc(seg(t, 0, 0.4));
        floor.setAttribute("opacity", f); floor.setAttribute("transform", `translate(800 0) scale(${Math.max(0.01, f)} 1) translate(-800 0)`);
        rails.forEach((g, i) => show(g, oc(seg(t, 0.1 + 0.1 * i, 0.6 + 0.1 * i)), 70));
        show(shW, oc(seg(t, 0.1, 0.7)), 70);
        const te = oc(seg(t, 0.3, 0.75)); top.setAttribute("opacity", te); top.setAttribute("transform", `translate(0 ${R(-50 * (1 - te))})`);
        let n = 0;
        rungs.forEach((r, i) => { if (!r) return; const k = ob(seg(t, 0.5 + 0.1 * n, 0.9 + 0.1 * n)); n++; r.setAttribute("opacity", cl(k * 3)); r.setAttribute("transform", `translate(800 ${RYS[i]}) scale(${Math.max(0.01, k)} 1) translate(-800 ${-RYS[i]})`); });
        slot.setAttribute("opacity", cl(seg(t, 0.95, 1.2)) * (1 - seg(t, 2.35, 2.6)));
        const s = seg(t, 1.6, 2.6);
        sky.setAttribute("opacity", cl(s * 8)); sky.setAttribute("transform", `translate(${R(760 * (1 - bk(s, 0.9)))} 0)`);
        halos.forEach((h, i) => { const g = seg(t, 3.0 + 0.3 * i, 3.4 + 0.3 * i), k = g > 0 ? bk(g, 2) : 0; h.setAttribute("opacity", g > 0 ? 1 : 0); h.setAttribute("y", R(RYS[i] - 15 - 13 * k)); h.setAttribute("height", R(30 + 26 * k)); });
        const tg = seg(t, 4.8, 5.4), k = bk(tg, 1.4);
        tag.setAttribute("opacity", cl(tg * 5)); tf(tag, 800, R(202 - 260 * (1 - k)), 1, R(-6 * (1 - oc(seg(t, 4.8, 5.6)))));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, loop: 0,
    build(svg) {
      const chip = el("g", {}, svg);
      el("rect", { x: 96, y: 150, width: 196, height: 60, rx: 30, fill: YEL, stroke: INK, "stroke-width": 3 }, chip);
      txt(chip, 194, 190, "AI tools", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
      const t1 = txt(svg, 90, 340, "Goblin Tools", { "font-size": 118, "font-weight": 700 });
      const t2 = txt(svg, 90, 466, "Magic ToDo", { "font-size": 118, "font-weight": 700 });
      const und = el("path", { d: "M98 512 H600", stroke: YEL, "stroke-width": 16, "stroke-linecap": "round", "stroke-dasharray": 510, "stroke-dashoffset": 510 }, svg);
      const sub = txt(svg, 94, 584, "Break a scary chore into small steps", { "font-size": 40, "font-weight": 500 });
      const chk = txt(svg, 96, 650, "Checked 25 Nov 2026", { "font-family": MONO, "font-size": 24, "font-weight": 500, fill: MUTE });

      const note = el("g", {}, svg);
      el("rect", { x: 1189, y: 134, width: 130, height: 116, rx: 12, fill: LIL }, note);
      el("rect", { x: 1179, y: 124, width: 130, height: 116, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, note);
      [0, 1, 2, 3].forEach((i) => el("rect", { x: 1196 + i * 30, y: 110, width: 12, height: 28, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, note));
      el("path", { d: "M1199 170 H1288 M1199 194 H1270 M1199 218 H1280", stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round" }, note);
      const cardA = el("g", {}, svg);
      el("rect", { x: 996, y: 276, width: 528, height: 112, rx: 24, fill: SOFT }, cardA);
      el("rect", { x: 980, y: 260, width: 528, height: 112, rx: 24, fill: LIL, stroke: INK, "stroke-width": 3 }, cardA);
      txt(cardA, 1244, 326, "The website is free", { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });

      const jar = el("g", {}, svg);
      el("rect", { x: 1202, y: 512, width: 104, height: 96, rx: 24, fill: LIL }, jar);
      el("rect", { x: 1204, y: 482, width: 80, height: 24, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, jar);
      el("rect", { x: 1192, y: 500, width: 104, height: 96, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 3 }, jar);
      const lid = el("rect", { x: 1196, y: 456, width: 96, height: 30, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, jar);
      const cardB = el("g", {}, svg);
      el("rect", { x: 996, y: 626, width: 528, height: 112, rx: 24, fill: LIL }, cardB);
      el("rect", { x: 980, y: 610, width: 528, height: 112, rx: 24, fill: SKY, stroke: INK, "stroke-width": 3 }, cardB);
      txt(cardB, 1244, 675, "The spicier, the more steps", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });

      return (t) => {
        const pop = (n, a, cx, cy) => { const k = ob(seg(t, a, a + 0.5)); n.setAttribute("opacity", cl(k * 3)); n.setAttribute("transform", `translate(${cx} ${cy}) scale(${Math.max(0.01, k)}) translate(${-cx} ${-cy})`); };
        pop(chip, 0.1, 194, 180);
        show(t1, oc(seg(t, 0.25, 0.8)), 40); show(t2, oc(seg(t, 0.37, 0.92)), 40);
        und.setAttribute("stroke-dashoffset", R(510 * (1 - io(seg(t, 0.9, 1.5)))));
        show(sub, oc(seg(t, 0.55, 1.1)), 30); show(chk, oc(seg(t, 0.67, 1.2)), 30);
        pop(note, 1.0, 1244, 182); show(cardA, oc(seg(t, 1.12, 1.65)), 40);
        pop(jar, 1.24, 1244, 530); show(cardB, oc(seg(t, 1.36, 1.9)), 40);
        lid.setAttribute("transform", `translate(0 ${R(-14 * bump(seg(t, 2.1, 2.6)))})`);
      };
    },
  };

  /* ---- player: plays once in view and holds the last frame; a tap rewinds smoothly and plays again ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 1600, H = sc.h || 1200;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let t = calm ? sc.dur : 0, raf = 0, seen = false, last = 0, back = null;
    let draw = () => {};
    const frame = (now) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
      if (back) { if (!back.at) back.at = now; const k = cl((now - back.at) / 1000 / back.len); t = back.from + (back.to - back.from) * io(k); if (k >= 1) back = null; }
      else t = Math.min(sc.dur, t + dt);
      draw(t);
      if (seen && (back || t < sc.dur)) raf = requestAnimationFrame(frame); else { raf = 0; last = 0; }
    };
    const run = () => { if (!raf && seen) { last = 0; raf = requestAnimationFrame(frame); } };
    const api = {
      replay: () => {
        if (calm) { t = sc.dur; draw(t); return; }
        const to = sc.loop || 0; back = { from: t, to, at: 0, len: cl(0.3 + 0.12 * (t - to), 0.45, 1.1) }; run();
      },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.dur : fixed); return; }
    draw(t);
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { run(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); raf = 0; last = 0; }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
