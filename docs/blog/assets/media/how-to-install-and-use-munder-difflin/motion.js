/* Bright coded scenes for "How to Install Munder Difflin 0.5.6". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame.

   TO ADD A SCENE: write SC.NAME = { dur, still, build(svg, api) { ...; return (t, now) => {} } } just above
   the line marked "ADD NEW SCENES ABOVE THIS LINE". Change nothing else in this file.
   - The drawing is 800 by 600 units (shown 1600 by 1200). dur is the loop in seconds, still is the frame for NAME.png.
   - build draws everything once and returns the frame function: t is the loop time, now never wraps (idle motion).
   - api.seek(s) jumps the loop to second s (a replay). api.now() is the clock. api.poke() redraws after a tap.
   - Helpers: el, txt, head (heading plus tap hint), strip and say (the caption line), button (tap and keyboard),
     pill, star, fit, mv (marks a group that moves, for the measurement tests), seg, io, oc, bk, land, lerp, tf. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
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
  const lerp = (a, b, k) => a + (b - a) * k;
  /* ease that lands a little past the mark and settles; c sets how far past */
  const bk = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const land = (k, c = 2.2) => cl(bk(k, c), 0, 1.5);
  /* scene heading on the left, the tap hint on the right; the heading shrinks if the two would touch */
  const head = (svg, s, hint) => {
    const a = txt(svg, 44, 62, s, { "font-size": 32, "font-weight": 700 });
    const b = txt(svg, 756, 60, hint, { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
    const room = 756 - b.getComputedTextLength() - 28 - 44, w = a.getComputedTextLength();
    if (w > room) a.setAttribute("font-size", Math.floor((32 * room) / w));
  };
  const star = (p, x, y, r, fill) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, p);
  /* shrink a label until it fits the room it has */
  const fit = (n, room) => { const w = n.getComputedTextLength(), f = parseFloat(n.getAttribute("font-size")); if (w > room) n.setAttribute("font-size", Math.floor((f * room * 10) / w) / 10); return n; };
  /* set the caption strip, at 20 unless the line is too long for the strip */
  const say = (n, s, room = 690) => { if (n._s === s) return; n._s = s; n.textContent = s; n.setAttribute("font-size", 20); fit(n, room); };
  /* a status pill sized to its word, with or without a tick */
  const pill = (p, s, fill, tick) => {
    const g = el("g", {}, p), r = el("rect", { y: -18, height: 36, rx: 18, fill, stroke: INK, "stroke-width": 2.5 }, g);
    const w = txt(g, tick ? 12 : 0, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }).getComputedTextLength() + (tick ? 54 : 34);
    r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    if (tick) el("path", { d: `M${-w / 2 + 15} 1 l6 6 l10 -13`, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };
  /* mark a group as moving, so the measurement tests can see when it crosses a label */
  const mv = (g) => { g.setAttribute("data-mv", ""); return g; };

  const SC = {};

  /* ---- title card, 16 by 9: a shelf going up, with a spirit level on it and a screw left over ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 2.6,
    build(svg) {
      txt(svg, 66, 92, "From zero to a working office", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const L = ["Install", "Munder Difflin", "0.5.6"].map((s, i) => txt(svg, 62, 170 + i * 78, s, { "font-size": 76, "font-weight": 700 }));
      const w = L[1].getComputedTextLength();
      if (w > 500) L.forEach((n) => n.setAttribute("font-size", Math.floor((76 * 500) / w)));
      el("path", { d: `M68 356 H${Math.round(56 + L[2].getComputedTextLength())}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const pt = txt(svg, 0, 427, "Beginner's guide", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 }), pw = Math.round(pt.getComputedTextLength() + 64);
      svg.insertBefore(el("rect", { x: 62, y: 390, width: pw, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }), pt);
      pt.setAttribute("x", 62 + pw / 2);
      el("path", { d: "M70 494 C190 468 300 518 420 490 S560 492 620 478", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 494, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const c = el("g", { transform: "translate(748 300)" }, svg);
      /* the pencil line on the wall, the brackets and the plank */
      el("path", { d: "M-168 40 H168", stroke: LIL, "stroke-width": 4, "stroke-linecap": "round", "stroke-dasharray": "1 13" }, c);
      [-1, 1].forEach((s) => {
        el("path", { d: `M${s * 104} 66 V140 L${s * 34} 66 Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, c);
        el("circle", { cx: s * 93, cy: 84, r: 4, fill: INK }, c);
        el("circle", { cx: s * 93, cy: 108, r: 4, fill: INK }, c);
      });
      el("rect", { x: -156, y: 42, width: 312, height: 26, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, c);
      /* the spirit level */
      const lv = el("g", { transform: "translate(-10 0)" }, c);
      el("rect", { x: -124, y: -16, width: 236, height: 58, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, lv);
      el("path", { d: "M-100 -16 V42 M88 -16 V42", stroke: INK, "stroke-width": 3 }, lv);
      el("rect", { x: -48, y: 0, width: 84, height: 26, rx: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, lv);
      const bubble = el("ellipse", { cy: 13, rx: 10, ry: 8, fill: MINT, stroke: INK, "stroke-width": 2.5 }, lv);
      el("path", { d: "M-19 0 V26 M7 0 V26", stroke: INK, "stroke-width": 2.5 }, lv);
      [-76, 62].forEach((x) => { el("circle", { cx: x, cy: 13, r: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, lv); el("circle", { cx: x, cy: 13, r: 3.5, fill: MINT, stroke: INK, "stroke-width": 2 }, lv); });
      /* the screws that were left over, and the hex key that came in the box */
      const screw = (x, y, r) => {
        const g = el("g", { transform: `translate(${x} ${y}) rotate(${r})` }, c);
        el("rect", { x: -11, y: -5, width: 30, height: 10, rx: 2, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-3 -5 V5 M4 -5 V5 M11 -5 V5", stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: -19, y: -10, width: 8, height: 20, rx: 3, fill: INK }, g);
      };
      screw(-74, -22, 0); screw(-128, -62, -38);
      const key = el("g", { transform: "translate(-62 -112) rotate(-16)" }, c);
      el("path", { d: "M-34 -46 V26 H36", fill: "none", stroke: INK, "stroke-width": 17, "stroke-linecap": "round", "stroke-linejoin": "round" }, key);
      el("path", { d: "M-34 -46 V26 H36", fill: "none", stroke: SKY, "stroke-width": 11, "stroke-linecap": "round", "stroke-linejoin": "round" }, key);
      /* the screwdriver, on the last screw */
      const drv = el("g", { transform: "translate(-7 0)" }, c);
      el("rect", { x: 131, y: -70, width: 8, height: 112, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, drv);
      el("rect", { x: 124, y: -80, width: 22, height: 13, rx: 3, fill: YEL, stroke: INK, "stroke-width": 2.5 }, drv);
      el("rect", { x: 115, y: -168, width: 40, height: 90, rx: 16, fill: LIL, stroke: INK, "stroke-width": 3 }, drv);
      const grip = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, drv);
      const turn = el("path", { d: "M100 -108 q-13 14 2 30 M170 -138 q13 14 -2 30", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, drv);
      star(svg, 606, 150, 15, YEL); star(svg, 886, 466, 17, MINT); star(svg, 598, 404, 12, SKY);
      return (t) => {
        bubble.setAttribute("cx", (-6 + 15 * Math.exp(-1.1 * t) * Math.cos(4.2 * t)).toFixed(2));
        const k = (t * 0.9) % 1;
        grip.setAttribute("d", [0, 1, 2].map((j) => `M${(123 + ((j + k) % 3) * 8).toFixed(1)} -152 V-96`).join(" "));
        turn.setAttribute("transform", `translate(0 ${(3 * Math.sin(t * 5)).toFixed(2)})`);
      };
    },
  };

  /* ---- office: a job slip lands on the front desk, is torn in three, and one piece comes back as a decision ---- */
  SC.office = {
    dur: 14, still: 12,
    build(svg, api) {
      head(svg, "What is Munder Difflin?", "tap the front desk");
      const BX = [118, 306, 494, 682], COL = [SKY, LIL, MINT, BLUE], SY = 172, FX = 400, FY = 354;
      const pp = (v, L) => L - Math.abs((((v % (2 * L)) + 2 * L) % (2 * L)) - L);
      el("path", { d: "M60 130 V108 H306 M494 108 H740 V130", fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "1 9" }, svg);
      txt(svg, 400, 116, "other agents", { "text-anchor": "middle", "font-size": 24, "font-weight": 700, fill: MUTE });
      el("path", { d: "M44 492 H756", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* a filing cabinet and a water cooler, because it is an office */
      el("rect", { x: 62, y: 376, width: 108, height: 116, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M62 434 H170", stroke: INK, "stroke-width": 3 }, svg);
      [398, 456].forEach((y) => el("rect", { x: 98, y, width: 36, height: 10, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", { x: 662, y: 318, width: 52, height: 86, rx: 16, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      const bub = [0, 1].map(() => el("circle", { fill: "#fff", stroke: INK, "stroke-width": 2 }, svg));
      el("rect", { x: 652, y: 398, width: 72, height: 94, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 678, y: 420, width: 20, height: 12, rx: 3, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M670 452 H706", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      /* the back row: four desks on a step, each with a screen */
      el("rect", { x: 30, y: 270, width: 740, height: 20, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const desks = BX.map((x, i) => {
        el("rect", { x: x - 62, y: 228, width: 124, height: 43, fill: COL[i], stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: x - 74, y: 216, width: 148, height: 13, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: x - 46, y: 243, width: 92, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        const bar = el("rect", { x: x - 43, y: 246, width: 0, height: 8, rx: 4, fill: MINT }, svg);
        const mon = el("g", {}, svg);
        el("rect", { x: -7, y: -2, width: 14, height: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, mon);
        el("rect", { x: -50, y: -72, width: 100, height: 72, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, mon);
        /* the desk with no work has found the screensaver */
        const saver = i === 3 ? el("rect", { width: 18, height: 18, rx: 5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, mon) : null;
        el("rect", { x: x - 26, y: 210, width: 52, height: 7, rx: 3, fill: INK }, svg);
        const tick = el("g", {}, svg);
        el("circle", { r: 13, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tick);
        el("path", { d: "M-6 0 l4.5 5 l8 -10", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
        return { x, bar, mon, saver, tick };
      });
      /* the front desk */
      const front = el("g", {}, svg);
      el("rect", { x: 192, y: 296, width: 416, height: 204, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, front);
      el("rect", { x: 220, y: 434, width: 360, height: 58, fill: YEL, stroke: INK, "stroke-width": 3 }, front);
      el("rect", { x: 200, y: 420, width: 400, height: 15, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
      txt(front, 400, 473, "your orchestrator", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
      const fmon = el("g", {}, front);
      el("rect", { x: -9, y: -2, width: 18, height: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, fmon);
      el("rect", { x: -100, y: -100, width: 200, height: 100, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, fmon);
      el("rect", { x: 364, y: 414, width: 72, height: 7, rx: 3, fill: INK }, front);
      button(front, "Send another job to the front desk", () => api.seek(0.3));
      /* the slips */
      const J = mv(el("g", { "pointer-events": "none" }, svg));
      el("rect", { x: -62, y: -36, width: 124, height: 72, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 3 }, J);
      const jt = txt(J, 0, 9, "your job", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      const perf = el("path", { d: "M-21 -30 V30 M21 -30 V30", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "2 7" }, J);
      const S = [SKY, LIL, MINT].map((c) => {
        const g = mv(el("g", { "pointer-events": "none" }, svg));
        const r = el("rect", { x: -20, y: -36, width: 40, height: 72, rx: 6, fill: c, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-10 -16 H10 M-10 -2 H10 M-10 12 H4", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return { g, r, c };
      });
      const D = mv(el("g", { "pointer-events": "none" }, svg));
      el("rect", { x: -80, y: -40, width: 160, height: 80, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, D);
      txt(D, 0, -5, "needs your", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(D, 0, 24, "decision", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const sp = el("g", { "pointer-events": "none" }, svg); star(sp, 0, 0, 14, "#fff");
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 13.2, 13.7), vis = 1 - out;
        bub.forEach((c, j) => {
          const p = (now * 0.3 + j / 2) % 1;
          c.setAttribute("cx", (688 + 8 * Math.sin(p * 6 + j * 2.4)).toFixed(1)); c.setAttribute("cy", (392 - 56 * p).toFixed(1));
          c.setAttribute("r", (2.5 + 3.5 * p).toFixed(1)); c.setAttribute("opacity", (cl(p * 6) * (1 - p * p)).toFixed(2));
        });
        /* the job arrives and is torn in three */
        const h = io(seg(t, 1.2, 2.1)), shake = t > 2.7 && t < 3 ? 3 * Math.sin(t * 70) : 0;
        tf(J, (lerp(116, FX, h) + shake).toFixed(2), (lerp(338, FY, h) - 40 * Math.sin(Math.PI * h)).toFixed(2), land(seg(t, 0.25, 0.65), 2).toFixed(3), ((1 - h) * -4 + 10 * Math.sin(Math.PI * h)).toFixed(2));
        J.setAttribute("opacity", (1 - seg(t, 3, 3.1)).toFixed(2));
        jt.setAttribute("opacity", (1 - seg(t, 2.25, 2.45)).toFixed(2));
        perf.setAttribute("opacity", seg(t, 2.45, 2.65).toFixed(2));
        S.forEach((s, i) => {
          const a = 3.6 + 0.4 * i, k = io(seg(t, a, a + 0.9)), fan = oc(seg(t, 3, 3.4)), stuck = i === 1 && t > 6.6;
          tf(s.g, lerp(FX + (i - 1) * lerp(41, 58, fan), BX[i], k).toFixed(2), (lerp(FY, SY, k) - 34 * Math.sin(Math.PI * k)).toFixed(2), lerp(1, 0.8, k).toFixed(3), ((i - 1) * 7 * fan * (1 - k) + (stuck ? 5 * Math.sin(t * 13) : 0)).toFixed(2));
          s.r.setAttribute("fill", stuck ? YEL : s.c);
          s.g.setAttribute("opacity", t < 3 ? 0 : i === 1 ? (1 - seg(t, 8.8, 8.95)).toFixed(2) : vis.toFixed(2));
        });
        desks.forEach((d, i) => {
          const tau = t - (4.5 + 0.4 * i);
          d.mon.setAttribute("transform", `translate(${d.x} 208) rotate(${(i < 3 && tau > 0 ? 4 * Math.exp(-6 * tau) * Math.sin(18 * tau) : 0).toFixed(2)})`);
          const p = i === 0 ? io(seg(t, 4.7, 7)) : i === 1 ? 0.55 * oc(seg(t, 5.1, 6.4)) : i === 2 ? io(seg(t, 5.5, 8.2)) : 0;
          d.bar.setAttribute("width", (86 * p * vis).toFixed(1));
          d.bar.setAttribute("fill", i === 1 && t > 6.6 ? YEL : MINT);
          const T = i === 0 ? 7 : i === 2 ? 8.2 : 99;
          tf(d.tick, d.x + 50, 136, (land(seg(t, T, T + 0.4), 2.4) * vis).toFixed(3));
          if (d.saver) { d.saver.setAttribute("x", (-41 + pp(now * 30 + 22, 64)).toFixed(1)); d.saver.setAttribute("y", (-64 + pp(now * 23 + 9, 38)).toFixed(1)); }
        });
        /* one piece comes back */
        const e = io(seg(t, 8.8, 9.8)), tau = t - 9.8, w1 = t - 2.1, wob = (v) => (v > 0 ? Math.exp(-6 * v) * Math.sin(17 * v) : 0);
        tf(D, lerp(BX[1], FX, e).toFixed(2), (lerp(SY, FY, e) - 30 * Math.sin(Math.PI * e)).toFixed(2), (lerp(0.22, 1, e) * (1 + (tau > 0 ? 0.1 * Math.exp(-5 * tau) * Math.sin(15 * tau) : 0) + 0.02 * seg(t, 10.6, 11.4) * Math.sin(now * 3))).toFixed(4), ((1 - e) * -12 + 3 * wob(tau)).toFixed(2));
        D.setAttribute("opacity", t >= 8.8 ? vis.toFixed(2) : 0);
        fmon.setAttribute("transform", `translate(400 404) rotate(${(2.2 * (wob(w1) + wob(tau))).toFixed(2)})`);
        tf(sp, 532, 316, (land(seg(t, 9.8, 10.3), 2.6) * vis * (1 + 0.12 * Math.sin(now * 3))).toFixed(3), (now * 20).toFixed(1));
        say(cap, t < 1.2 || out > 0 ? "A small office of AI workers" : t < 2.6 ? "You brief one orchestrator" : t < 3.6 ? "He splits it into pieces" : t < 8.8 ? "He hands the pieces to other agents" : "Only the decisions come back to you", 700);
      };
    },
  };

  /* ---- rooms: a house plan where every room is a folder; a new room is built and the agent's desk goes only there ---- */
  SC.rooms = {
    dur: 14, still: 12,
    build(svg, api) {
      head(svg, "What can it touch on your computer?", "tap a room");
      const R = [
        { n: "Documents", x: 44, y: 96, w: 236, h: 180, c: SKY, dx: 226, dy: 226 },
        { n: "Photos", x: 280, y: 96, w: 238, h: 180, c: YEL, dx: 466, dy: 226 },
        { n: "Projects", x: 518, y: 96, w: 238, h: 180, c: SKY, dx: 704, dy: 226 },
        { n: "Downloads", x: 44, y: 276, w: 256, h: 214, c: YEL, dx: 246, dy: 408 },
      ];
      const NX = 300, NY = 276, NW = 456, NH = 214, FOLD = "M0 -11 H11 L16 -6 H30 V11 H0 Z", NEW = "M300 490 H756 V276";
      const given = [false, false, false, false], gt = [-99, -99, -99, -99];
      R.forEach((r) => {
        el("rect", { x: r.x, y: r.y, width: r.w, height: r.h, fill: SOFT }, svg);
        r.fl = el("rect", { x: r.x, y: r.y, width: r.w, height: r.h, fill: r.c, opacity: 0 }, svg);
        r.in = el("g", {}, svg);
      });
      /* the plot where the new room will go: hatched, until it has a floor */
      const hatch = el("path", { d: [0, 1, 2, 3, 4, 5, 6].map((k) => `M${318 + 48 * k} 480 l136 -136`).join(" "), stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "6 9" }, svg);
      const nfl = el("rect", { x: NX, y: NY, width: NW, height: NH, fill: MINT, opacity: 0 }, svg);
      const sheet = (p, x, y, r) => {
        const g = el("g", { transform: `translate(${x} ${y}) rotate(${r})` }, p);
        el("rect", { x: -19, y: -25, width: 38, height: 50, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-11 -12 H11 M-11 -2 H11 M-11 8 H5", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
        return g;
      };
      /* Documents: two tidy stacks. Photos: two prints. Projects: two folders. */
      [88, 146].forEach((x) => [8, 4, 0].forEach((o) => sheet(R[0].in, x + o, 224 - o, 0)));
      [[330, 224, -7], [390, 218, 5]].forEach(([x, y, r]) => {
        const g = el("g", { transform: `translate(${x} ${y}) rotate(${r})` }, R[1].in);
        el("rect", { x: -27, y: -23, width: 54, height: 46, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -20, y: -16, width: 40, height: 26, fill: SKY, stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: "M-20 10 L-7 -5 L2 4 L8 -2 L20 10 Z", fill: MINT, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
        el("circle", { cx: 11, cy: -8, r: 4, fill: YEL, stroke: INK, "stroke-width": 2 }, g);
      });
      [[540, LIL], [598, MINT]].forEach(([x, c]) => el("path", { d: "M0 -18 H16 L23 -11 H46 V20 H0 Z", fill: c, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} 222)` }, R[2].in));
      /* Downloads: a heap, and it keeps growing */
      [[-32, -18, -22], [26, -22, 14], [-8, 4, 38], [32, 16, -9], [-34, 22, 8], [4, -30, -31], [-18, 28, -47], [30, -4, 62], [0, 6, -4]].forEach(([dx, dy, r]) => sheet(R[3].in, 122 + dx, 410 + dy, r));
      const drops = [[14, -14, 21, 3.2], [-24, 2, -15, 7], [20, 22, 33, 10.4]].map(([dx, dy, r, at]) => ({ g: sheet(R[3].in, 0, 0, 0), x: 122 + dx, y: 410 + dy, r, at }));
      /* walls: the plot for the new room is dotted until it is built */
      el("path", { d: NEW, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 10" }, svg);
      const nw = el("path", { d: NEW, fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "670 670" }, svg);
      el("path", { d: "M44 96 H756 V276 H44 Z M280 96 V276 M518 96 V276 M44 276 V490 H300 V276", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const door = (p, gap, leaf) => { el("path", { d: gap, stroke: "#fff", "stroke-width": 8 }, p); el("path", { d: leaf, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, p); };
      door(svg, "M280 156 V192", "M280 192 H244 A36 36 0 0 1 280 156");
      door(svg, "M518 156 V192", "M518 192 H482 A36 36 0 0 1 518 156");
      const nd = el("g", {}, svg); door(nd, "M300 438 V478", "M300 478 H340 A40 40 0 0 0 300 438");
      /* each room is labelled as a folder */
      R.forEach((r) => {
        r.ic = el("path", { d: FOLD, fill: "#fff", stroke: MUTE, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${r.x + 18} ${r.y + 34})` }, svg);
        r.tx = txt(svg, r.x + 56, r.y + 43, r.n, { "font-size": 25, "font-weight": 700, fill: MUTE });
      });
      const plus = el("g", {}, svg);
      el("circle", { r: 36, fill: "#fff", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, plus);
      el("path", { d: "M-15 0 H15 M0 -15 V15", stroke: LIL, "stroke-width": 6, "stroke-linecap": "round" }, plus);
      const nl = el("g", {}, svg);
      const ni = el("path", { d: FOLD, fill: "#fff", stroke: MUTE, "stroke-width": 2.5, "stroke-linejoin": "round", transform: "translate(0 -9)" }, nl);
      const nt = txt(nl, 40, 0, "new empty folder", { "font-size": 26, "font-weight": 700, fill: MUTE });
      const files = [[356, 6, -5], [414, 7.2, 3], [472, 8.4, -2]].map(([x, at, r]) => ({ g: mv(sheet(svg, 0, 0, 0)), x, at, r }));
      /* a desk seen from above, with a small terminal on it */
      const desk = () => {
        const g = mv(el("g", { "pointer-events": "none" }, svg));
        el("rect", { x: -14, y: 14, width: 28, height: 24, rx: 9, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -42, y: -24, width: 84, height: 46, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -22, y: -16, width: 44, height: 30, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -22, y: -16, width: 44, height: 9, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-14 -2 l5 4 l-5 4", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return { g, cur: el("path", { d: "M-3 6 H8", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g) };
      };
      R.forEach((r) => (r.desk = desk()));
      const ad = desk(), tag = mv(pill(svg, "agent works here", YEL));
      tag.setAttribute("pointer-events", "none");
      R.forEach((r, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: r.x + 9, y: r.y + 9, width: r.w - 18, height: r.h - 18, rx: 10, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        button(g, `Give the agent the ${r.n} folder`, () => { given[i] = !given[i]; gt[i] = api.now(); api.poke(); });
      });
      const ng = el("g", {}, svg);
      el("rect", { x: NX + 9, y: NY + 9, width: NW - 18, height: NH - 18, rx: 10, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, ng);
      button(ng, "Make the new empty folder again", () => api.seek(1.2));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 13.2, 13.7), vis = 1 - out, blink = Math.sin(now * 6) > 0 ? 1 : 0;
        /* the new room is built */
        const built = io(seg(t, 1.6, 2.5)) * (1 - io(out));
        nw.setAttribute("stroke-dashoffset", (670 * (1 - built)).toFixed(1));
        nw.setAttribute("opacity", built > 0.002 ? 1 : 0);
        nfl.setAttribute("opacity", (seg(t, 2.2, 2.9) * vis).toFixed(2));
        hatch.setAttribute("opacity", (1 - seg(t, 1.9, 2.3) * (1 - seg(t, 13.5, 13.8))).toFixed(2));
        nd.setAttribute("opacity", (seg(t, 2.6, 2.9) * vis).toFixed(2));
        const made = t >= 2.4 && t < 13.4;
        tf(nl, 320, 320, (1 + 0.1 * Math.sin(Math.PI * seg(t, 2.4, 2.85))).toFixed(3));
        nt.setAttribute("fill", made ? INK : MUTE); ni.setAttribute("stroke", made ? INK : MUTE);
        tf(plus, 528, 412, ((1 - oc(seg(t, 1.5, 1.9)) + oc(seg(t, 13.4, 13.8))) * (1 + 0.05 * Math.sin(now * 3))).toFixed(3));
        /* the desk moves in, and work starts */
        const dk = seg(t, 3.6, 4.2);
        tf(ad.g, 630, (380 - 30 * (1 - oc(dk))).toFixed(2), (lerp(1.5, 1, cl(bk(dk, 2), 0, 1.3)) * (dk > 0 ? vis : 0)).toFixed(3), ((1 - oc(dk)) * -10).toFixed(2));
        ad.cur.setAttribute("opacity", blink);
        const tk = seg(t, 4.5, 4.95);
        tf(tag, 630, 448, (land(tk) * vis).toFixed(3), ((1 - oc(tk)) * -8).toFixed(2));
        files.forEach((f) => tf(f.g, f.x, 400, (land(seg(t, f.at, f.at + 0.4), 2.4) * vis).toFixed(3), f.r));
        drops.forEach((d) => {
          const k = seg(t, d.at, d.at + 0.45), w = t - d.at - 0.45;
          tf(d.g, d.x, d.y, (k > 0 ? lerp(1.7, 1, cl(bk(k, 1.6), 0, 1.2)) * vis : 0).toFixed(3), (d.r + (1 - oc(k)) * 40 + (w > 0 ? 6 * Math.exp(-5 * w) * Math.sin(15 * w) : 0)).toFixed(2));
        });
        /* any room you tap is given to the agent as well */
        let fresh = false;
        R.forEach((r, i) => {
          const w = now - gt[i], g = given[i] ? oc(seg(w, 0, 0.45)) : 1 - oc(seg(w, 0, 0.35));
          r.fl.setAttribute("opacity", g.toFixed(2));
          r.in.setAttribute("opacity", lerp(0.42, 1, g).toFixed(2));
          r.tx.setAttribute("fill", g > 0.5 ? INK : MUTE); r.ic.setAttribute("stroke", g > 0.5 ? INK : MUTE);
          tf(r.desk.g, r.dx, r.dy, (given[i] ? land(seg(w, 0.12, 0.6), 2.2) : 1 - seg(w, 0, 0.2)).toFixed(3), (given[i] ? (1 - oc(seg(w, 0.12, 0.6))) * -10 : 0).toFixed(2));
          r.desk.cur.setAttribute("opacity", blink);
          if (given[i] && w < 4.5) fresh = true;
        });
        say(cap, fresh ? "Agents work inside the folders you give them" : t < 1.6 || out > 0 ? "You choose the folders" : t < 3.6 ? "For your first job, make a new empty folder" : "An agent works only in the folders you give it", 700);
      };
    },
  };

  /* ---- engine: three cards on a table, one per thing you might pay for; each turns over to show its engine ---- */
  SC.engine = {
    dur: 14, still: 11.5,
    build(svg, api) {
      head(svg, "Which AI engine should you pick?", "tap a card");
      const X = [150, 400, 650], CY = 284, COL = [YEL, SKY, MINT], REST = [-2.5, 1.5, -1.5], F = [2, 4, 6], HOLD = 4.5;
      const PAY = ["Claude", "ChatGPT", "nothing"], WITH = [["with a Claude", "subscription"], ["with a ChatGPT", "subscription"], ["if you pay", "for nothing"]];
      const mid = (a) => Object.assign({ "text-anchor": "middle" }, a);
      const mats = X.map(() => el("rect", { x: -114, y: -176, width: 228, height: 352, rx: 24, fill: SOFT }, svg));
      const cards = X.map((x, i) => {
        const g = mv(el("g", {}, svg));
        el("rect", { x: -111, y: -173, width: 222, height: 346, rx: 22, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const fr = el("g", {}, g), ba = el("g", {}, g);
        /* the side that asks */
        el("rect", { x: -106, y: -168, width: 212, height: 336, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, fr);
        el("circle", { cx: -78, cy: -140, r: 11, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, fr);
        el("circle", { cx: 78, cy: 140, r: 11, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, fr);
        txt(fr, 0, -18, "You pay for", mid({ "font-size": 25, "font-weight": 500 }));
        const pw = fit(txt(fr, 0, 34, PAY[i], mid({ "font-size": 46, "font-weight": 700 })), 184).getComputedTextLength();
        el("path", { d: `M${(-pw / 2 + 4).toFixed(1)} 58 H${(pw / 2 - 4).toFixed(1)}`, stroke: COL[i], "stroke-width": 10, "stroke-linecap": "round" }, fr);
        /* the side that answers */
        el("rect", { x: -106, y: -168, width: 212, height: 336, rx: 18, fill: COL[i], stroke: INK, "stroke-width": 3 }, ba);
        el("circle", { cx: -78, cy: -140, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, ba);
        el("circle", { cx: 78, cy: 140, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, ba);
        txt(ba, 0, -64, "use", mid({ "font-size": 22, "font-weight": 500 }));
        fit(txt(ba, 0, -22, ["Claude Code", "Codex", "Antigravity"][i], mid({ "font-size": 32, "font-weight": 700 })), 188);
        el("path", { d: "M-74 8 H74", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, ba);
        WITH[i].forEach((s, j) => txt(ba, 0, 56 + j * 30, s, mid({ "font-size": 22, "font-weight": 600 })));
        return { g, fr, ba };
      });
      const st = X.map(() => ({ a: 0, m: null }));
      cards.forEach((c, i) => button(c.g, `Turn over the card for ${PAY[i]}`, () => {
        const back = Math.cos(Math.PI * st[i].a) < 0;
        st[i].m = { at: api.now(), a0: back ? 1 : 0, a1: back ? 0 : 1 };
        api.poke();
      }));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const end = seg(t, 12.9, 13.1);
        cards.forEach((c, i) => {
          const s = st[i], kin = seg(t, 0.1 + 0.18 * i, 0.6 + 0.18 * i), ku = seg(t, F[i], F[i] + (i === 2 ? 1.5 : 0.8)), kd = seg(t, 13.1 + 0.1 * i, 13.6 + 0.1 * i);
          /* the card that costs nothing turns over once more than it needs to, and lands crooked */
          let a = (i === 2 ? 3 : 1) * io(ku) - io(kd), lift = (i === 2 ? 1.4 : 1) * Math.sin(Math.PI * ku) + Math.sin(Math.PI * kd), crook = i === 2 ? 5 * io(seg(t, 6.7, 7.5)) * (1 - cl(bk(seg(t, 8.1, 8.55), 1.8), 0, 1.2)) : 0;
          if (s.m) {
            const w = now - s.m.at, goal = Math.cos(Math.PI * a) < 0 ? 1 : 0;
            if (w < HOLD) { const k = seg(w, 0, 0.6); a = lerp(s.m.a0, s.m.a1, io(k)); lift = Math.sin(Math.PI * k); crook = 0; }
            else if (goal === s.m.a1 || w > HOLD + 0.6) s.m = null;
            else { const k = seg(w - HOLD, 0, 0.6); a = lerp(s.m.a1, goal, io(k)); lift = Math.sin(Math.PI * k); crook = 0; }
          }
          s.a = a;
          const cs = Math.cos(Math.PI * a), back = cs < 0, sx = Math.max(Math.abs(cs), 0.02), sc = 1 + 0.07 * lift;
          const rot = REST[i] + (1 - oc(kin)) * (i % 2 ? 3 : -3) + crook + 0.6 * Math.sin(now * 1.1 + i * 2.1) * seg(t, 8.8, 9.6) * (1 - end);
          const y = CY + 26 * (1 - oc(kin)) - 16 * lift;
          c.g.setAttribute("transform", `translate(${X[i]} ${y.toFixed(2)}) rotate(${rot.toFixed(2)}) scale(${(sx * sc).toFixed(4)} ${sc.toFixed(4)})`);
          c.fr.setAttribute("opacity", back ? 0 : 1); c.ba.setAttribute("opacity", back ? 1 : 0);
          mats[i].setAttribute("transform", `translate(${X[i]} ${(CY + 26 * (1 - oc(kin))).toFixed(2)}) rotate(${REST[i]}) scale(${(1 + 0.03 * lift).toFixed(4)})`);
        });
        say(cap, t < 2 || t > 13.1 ? "What you already pay for usually decides it" : t < 4 ? "You pay for Claude: use Claude Code" : t < 6 ? "You pay for ChatGPT: use Codex" : t < 8.7 ? "You pay for nothing: use Antigravity" : "You need exactly one to start", 700);
      };
    },
  };

  /* ---- terminal: a light text window above a row of keys; three lines are typed and each one is sent with Enter ---- */
  SC.terminal = {
    dur: 14, still: 12.2,
    build(svg, api) {
      head(svg, "Install an engine and sign in", "tap the terminal");
      const CMD = ["npm install -g @openai/codex", "codex", "codex --version"];
      const X0 = 92, BY = [160, 228, 296, 362], TY = [0.7, 5.7, 9.5], TD = [2, 0.5, 1.1], ENT = [2.9, 6.4, 10.8], PR = [0, 5.45, 9.25, 11.7];
      const replay = () => api.seek(0.3);
      const tickDot = (p, r) => {
        const g = el("g", {}, p);
        el("circle", { r, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: `M${(-0.46 * r).toFixed(1)} ${(0.04 * r).toFixed(1)} l${(0.34 * r).toFixed(1)} ${(0.36 * r).toFixed(1)} l${(0.6 * r).toFixed(1)} ${(-0.76 * r).toFixed(1)}`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return g;
      };
      /* the keys: seven plain ones and Enter */
      const keys = [0, 1, 2, 3, 4, 5, 6].map((k) => el("rect", { x: 44 + 78 * k, y: 404, width: 68, height: 64, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      const ek = el("g", {}, svg);
      el("rect", { x: 590, y: 404, width: 166, height: 64, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, ek);
      txt(ek, 652, 445, "Enter", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      el("path", { d: "M728 424 V438 H702 M710 430 l-8 8 l8 8", fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, ek);
      ek.classList.add("mg-hit"); ek.addEventListener("click", replay);
      /* the window: a white title bar and a soft page, ink type */
      const term = el("g", {}, svg);
      el("rect", { x: 37, y: 85, width: 726, height: 306, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, term);
      el("rect", { x: 44, y: 92, width: 712, height: 292, rx: 14, fill: "#fff" }, term);
      el("path", { d: "M44 130 H756 V370 a14 14 0 0 1 -14 14 H58 a14 14 0 0 1 -14 -14 Z", fill: SOFT }, term);
      el("path", { d: "M44 130 H756", stroke: INK, "stroke-width": 3 }, term);
      el("rect", { x: 44, y: 92, width: 712, height: 292, rx: 14, fill: "none", stroke: INK, "stroke-width": 3 }, term);
      [LIL, YEL, MINT].forEach((c, i) => el("circle", { cx: 68 + 20 * i, cy: 111, r: 6, fill: c, stroke: INK, "stroke-width": 2.5 }, term));
      txt(term, 400, 118, "Terminal", { "text-anchor": "middle", "font-size": 20, fill: MUTE });
      const chev = BY.map((y) => el("path", { d: `M70 ${y - 14} l8 7 l-8 7`, fill: "none", stroke: BLUE, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, term));
      const body = el("g", {}, term);
      const line = CMD.map((s, i) => { const n = txt(body, X0, BY[i], s, { "font-family": MONO, "font-size": 22, "font-weight": 700 }); n.style.whiteSpace = "pre"; return n; });
      const CW = line[0].getComputedTextLength() / CMD[0].length;
      const cur = el("rect", { y: -19, width: 12, height: 24, rx: 2, fill: INK }, term);
      /* what each line prints: a progress bar, a wait for the browser, a version */
      const bar = el("g", {}, body);
      const blk = Array.from({ length: 12 }, (_, j) => el("rect", { x: X0 + 29 * j, y: 176, width: 24, height: 16, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, bar));
      const wait = [0, 1, 2].map((j) => el("circle", { cx: 98 + 16 * j, cy: 252, r: 4.5, fill: INK }, body));
      const arrow = el("path", { fill: "none", stroke: BLUE, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, body);
      const ahead = el("path", { d: "M-9 -8 L0 0 L-9 8", fill: "none", stroke: BLUE, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, body);
      const ver = [0, 1, 2].map(() => el("rect", { x: -7.5, y: -9, width: 15, height: 18, rx: 4, fill: INK }, body));
      const vdot = [0, 1].map((j) => el("circle", { cx: X0 + 20 + 25 * j, cy: 327, r: 2.3, fill: INK }, body));
      const vt = txt(body, 202, 327, "a version number", { "font-size": 20 });
      const tk = [0, 1, 2].map(() => tickDot(body, 11));
      /* the browser that the second line opens */
      const B = mv(el("g", { "pointer-events": "none" }, svg));
      el("rect", { x: -108, y: -98, width: 216, height: 196, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, B);
      el("path", { d: "M-108 -64 H108", stroke: INK, "stroke-width": 3 }, B);
      [0, 1, 2].forEach((j) => el("circle", { cx: -90 + 16 * j, cy: -81, r: 5, fill: SOFT, stroke: INK, "stroke-width": 2 }, B));
      el("rect", { x: -36, y: -91, width: 128, height: 20, rx: 10, fill: SOFT }, B);
      txt(B, 0, -16, "Sign in", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const sb = el("g", {}, B);
      el("rect", { x: -62, y: -20, width: 124, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, sb);
      el("path", { d: "M-16 0 H14 M6 -8 l8 8 l-8 8", fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, sb);
      const bt = tickDot(B, 24);
      button(term, "Run the three terminal steps again", replay);
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 13.2, 13.7), vis = 1 - out, on = Math.sin(now * 6) >= 0 ? 1 : 0;
        body.setAttribute("opacity", vis.toFixed(2));
        /* typing: one key goes down for each letter, then Enter */
        let row = -1, col = 0, typing = false, key = -1, ph = 0;
        CMD.forEach((s, i) => {
          const k = seg(t, TY[i], TY[i] + TD[i]), n = Math.min(s.length, Math.floor(k * s.length + 1e-6)), shown = s.slice(0, n);
          if (line[i]._s !== shown) { line[i]._s = shown; line[i].textContent = shown; }
          if (t >= PR[i] && t < ENT[i] + 0.1) { row = i; col = n; if (k > 0 && k < 1) { typing = true; key = (n * 3 + i * 2 + 1) % 7; ph = k * s.length - n; } }
        });
        if (t >= PR[3] && t < 13.2) { row = 3; col = 0; }
        if (t >= 13.7) { row = 0; col = 0; }
        chev.forEach((c, i) => c.setAttribute("opacity", t >= PR[i] ? (i ? vis.toFixed(2) : 1) : 0));
        cur.setAttribute("transform", `translate(${(X0 + col * CW + (col ? 3 : 0)).toFixed(1)} ${BY[Math.max(row, 0)]})`);
        cur.setAttribute("opacity", row < 0 ? 0 : typing ? 1 : on);
        keys.forEach((r, k) => { const p = k === key ? Math.sin(Math.PI * ph) : 0; r.setAttribute("y", (404 + 5 * p).toFixed(2)); r.setAttribute("fill", p > 0.25 ? LIL : "#fff"); });
        const ep = Math.max(...ENT.map((e) => Math.sin(Math.PI * seg(t, e - 0.04, e + 0.26))));
        ek.setAttribute("transform", `translate(${(673 * 0.04 * ep).toFixed(2)} ${(6 * ep + 436 * 0.04 * ep).toFixed(2)}) scale(${(1 - 0.04 * ep).toFixed(4)})`);
        /* line one: the bar rushes to the last block, loses one, then finishes */
        const nb = t < 3.1 ? 0 : t < 3.85 ? Math.floor(11 * oc(seg(t, 3.1, 3.8)) + 0.001) : t < 4.45 ? 11 : t < 5.05 ? 10 : 12;
        bar.setAttribute("opacity", t >= ENT[0] + 0.15 ? 1 : 0);
        bar.setAttribute("transform", `translate(${(t > 4.45 && t < 4.8 ? 2.5 * Math.sin((t - 4.45) * 55) * (1 - seg(t, 4.45, 4.8)) : 0).toFixed(2)} 0)`);
        blk.forEach((r, j) => r.setAttribute("fill", j < nb ? MINT : "#fff"));
        tf(tk[0], 452, 184, land(seg(t, 5.1, 5.5), 2.4).toFixed(3));
        /* line two: the browser slides in, you sign in there */
        const ak = io(seg(t, 6.55, 7)), ax = lerp(180, 520, ak), waiting = t >= ENT[1] + 0.15 && t < 8.7;
        arrow.setAttribute("d", `M180 221 H${ax.toFixed(1)}`); arrow.setAttribute("opacity", ak > 0.02 ? 1 : 0);
        ahead.setAttribute("transform", `translate(${(ax + 3).toFixed(1)} 221)`); ahead.setAttribute("opacity", ak > 0.06 ? 1 : 0);
        wait.forEach((c, j) => c.setAttribute("opacity", waiting ? (0.25 + 0.75 * Math.max(0, Math.sin(now * 5 - j * 0.9))).toFixed(2) : 0));
        tf(tk[1], 103, 252, land(seg(t, 8.7, 9.1), 2.4).toFixed(3));
        const bi = seg(t, 6.95, 7.6);
        tf(B, (640 + 70 * (1 - cl(bk(bi, 1.3), 0, 1.2)) + 70 * io(out)).toFixed(2), 262, lerp(0.9, 1, oc(bi)).toFixed(3), ((1 - oc(bi)) * 4).toFixed(2));
        B.setAttribute("opacity", (seg(bi, 0, 0.35) * (1 - seg(out, 0.3, 0.9))).toFixed(2));
        tf(sb, 0, 42, ((1 - 0.08 * Math.sin(Math.PI * seg(t, 8.05, 8.35))) * (1 - seg(t, 8.4, 8.55))).toFixed(3));
        tf(bt, 0, 42, (land(seg(t, 8.5, 8.9), 2.6) * (1 + 0.04 * seg(t, 9.6, 10.2) * Math.sin(now * 3))).toFixed(3));
        /* line three: a version number, drawn as blocks */
        ver.forEach((r, j) => tf(r, X0 + 7.5 + 25 * j, 320, land(seg(t, 11 + 0.1 * j, 11.25 + 0.1 * j), 2.2).toFixed(3)));
        vdot.forEach((c, j) => c.setAttribute("opacity", t >= 11.12 + 0.1 * j ? 1 : 0));
        tf(tk[2], 181, 320, land(seg(t, 11.35, 11.75), 2.4).toFixed(3));
        vt.setAttribute("opacity", seg(t, 11.4, 11.6).toFixed(2));
        say(cap, t < TY[0] || out > 0 ? "Open a terminal, paste one block, press Enter" : t < PR[1] ? "Install the engine" : t < PR[2] ? "Run it once to sign in" : t < 11.3 ? "Then ask for its version to check" : "A version number means you are done with the terminal", 700);
      };
    },
  };

  /* ---- download: the download page has one button per system; each lets go of its file, which comes down on a parachute ---- */
  SC.download = {
    dur: 14, still: 12.2,
    build(svg, api) {
      head(svg, "Get the file for your system", "tap a button");
      const SYS = ["macOS", "Windows", "Linux"], COL = [SKY, LIL, MINT], BX = [132, 394, 668], FX = [132, 322, 668], START = [1, 4.4, 8.6], LEN = [2.7, 3.6, 2.7];
      const LINE = ["A universal .dmg for macOS", "A setup .exe or a portable .exe for Windows", "An .AppImage for Linux"];
      const YH = 248, YF = 346, YP = 374, YR = 416, PH = 256, PR = 422, tap = [null, null, null], mid = { "text-anchor": "middle" };
      const bo = (x) => { const n = 7.5625, d = 2.75; return x < 1 / d ? n * x * x : x < 2 / d ? n * (x -= 1.5 / d) * x + 0.75 : x < 2.5 / d ? n * (x -= 2.25 / d) * x + 0.9375 : n * (x -= 2.625 / d) * x + 0.984375; };
      /* the ground, with a landing pad for each system */
      el("path", { d: "M44 490 H756", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      [[46, 172], [238, 312], [582, 172]].forEach(([x, w], i) => el("rect", { x, y: 472, width: w, height: 18, rx: 6, fill: COL[i], stroke: INK, "stroke-width": 3 }, svg));
      const file = (p, w, h, c, a, b) => {
        const g = el("g", {}, p), f = 18;
        el("path", { d: `M${-w} ${-h} H${w - f} L${w} ${-h + f} V${h} H${-w} Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: `M${w - f} ${-h} V${-h + f} H${w} Z`, fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        if (a) txt(g, 0, -h + 42, a, Object.assign({ "font-size": 19 }, mid));
        fit(txt(g, 0, a ? -h + 74 : -h + 63, b, Object.assign({ "font-family": MONO, "font-size": a ? 30 : 23, "font-weight": 700 }, mid)), 2 * w - 22);
        el("path", { d: h > 52 ? `M${-w + 18} ${h - 20} H${w - 18} M${-w + 18} ${h - 9} H${w - 52}` : `M${-w + 18} ${h - 10} H${w - 18}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return g;
      };
      const guide = [132, 322, 478, 668].map((x) => {
        const g = el("g", {}, svg);
        el("path", { d: `M${x} 322 V446`, stroke: LIL, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-dasharray": "1 10" }, g);
        el("path", { d: `M${x - 10} 446 l10 10 l10 -10`, fill: "none", stroke: LIL, "stroke-width": 3.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return g;
      });
      const rigs = [["universal", ".dmg"], ["setup", ".exe"], [null, ".AppImage"]].map(([a, b], i) => {
        const g = mv(el("g", { "pointer-events": "none" }, svg));
        const str = el("path", { fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
        const can = el("g", {}, g);
        el("path", { d: "M-75 0 C-75 -36 -42 -54 0 -54 C42 -54 75 -36 75 0 Q56 -11 37.5 0 Q19 -11 0 0 Q-19 -11 -37.5 0 Q-56 -11 -75 0 Z", fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, can);
        el("path", { d: "M0 -54 Q-24 -32 -37.5 0 M0 -54 V0 M0 -54 Q24 -32 37.5 0", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, can);
        return { g, str, can, f: file(g, 75, 56, COL[i], a, b) };
      });
      /* the portable one has a carry handle, and no parachute */
      const port = mv(el("g", { "pointer-events": "none" }, svg)), HANDLE = "M-16 -50 V-58 a7 7 0 0 1 7 -7 H9 a7 7 0 0 1 7 7 V-50";
      el("path", { d: HANDLE, fill: "none", stroke: INK, "stroke-width": 10, "stroke-linecap": "round" }, port);
      el("path", { d: HANDLE, fill: "none", stroke: YEL, "stroke-width": 4.5, "stroke-linecap": "round" }, port);
      file(port, 59, 50, LIL, "portable", ".exe");
      /* the download page */
      el("rect", { x: 44, y: 92, width: 712, height: 94, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M44 124 H756", stroke: INK, "stroke-width": 3 }, svg);
      [LIL, YEL, MINT].forEach((c, i) => el("circle", { cx: 68 + 19 * i, cy: 108, r: 5.5, fill: c, stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", { x: 262, y: 96, width: 276, height: 24, rx: 12, fill: SOFT }, svg);
      txt(svg, 400, 114, "harnessmd.com/download", Object.assign({ "font-family": MONO, "font-size": 17, "font-weight": 700 }, mid));
      [132, 322, 478, 668].forEach((x) => el("rect", { x: x - 7, y: 182, width: 14, height: 20, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg));
      const btn = SYS.map((s, i) => {
        const g = el("g", {}, svg), x = BX[i];
        el("rect", { x: x - 81, y: 128, width: 162, height: 54, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const f = el("g", {}, g);
        el("rect", { x: x - 76, y: 133, width: 152, height: 42, rx: 12, fill: COL[i], stroke: INK, "stroke-width": 3 }, f);
        el("path", { d: `M${x - 57} 144 V158 M${x - 63} 153 l6 6 l6 -6 M${x - 65} 165 H${x - 49}`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, f);
        txt(f, x + 13, 162, s, Object.assign({ "font-size": 23, "font-weight": 700 }, mid));
        button(g, `Drop the ${s} file again`, () => { tap[i] = api.now(); api.poke(); });
        return f;
      });
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const wrap = t >= 13.2;
        if (wrap) tap.fill(null);
        let hot = -1;
        rigs.forEach((R, i) => {
          const lc = t - START[i];
          if (tap[i] !== null && now - tap[i] >= LEN[i] && lc >= LEN[i]) tap[i] = null;
          const c = tap[i] !== null ? now - tap[i] : wrap ? (t < 13.55 ? 99 : -1) : lc;
          if (tap[i] !== null && c < 3.6) hot = i;
          const a = (wrap ? (t < 13.55 ? 1 - seg(t, 13.2, 13.5) : seg(t, 13.6, 13.95)) : 1) * (tap[i] !== null ? seg(c, 0, 0.18) : 1);
          const hop = wrap && t >= 13.55 ? -8 * (1 - oc(seg(t, 13.6, 13.95))) : 0;
          /* let go, fall, open, float, land */
          let y = YH, s = 0, sw = 0, q = 0;
          if (c > 0.2 && c < 0.65) { const k = (c - 0.2) / 0.45; y = lerp(YH, YF, k * k); }
          else if (c >= 0.65) {
            s = land(seg(c, 0.65, 1), 2);
            y = c < 0.95 ? lerp(YF, YP, oc((c - 0.65) / 0.3)) : lerp(YP, YR, io(seg(c, 0.95, 2.2)));
            sw = Math.sin((c - 0.65) * 4.4) * (1 - seg(c, 1.4, 2.2));
            if (c > 2.2) q = Math.exp(-7 * (c - 2.2)) * Math.cos(18 * (c - 2.2));
          }
          const idle = seg(c, 2.4, 3.2), dx = 2.5 * idle * Math.sin(now * 1.3 + i * 2), sy = s * (1 + 0.04 * idle * Math.sin(now * 2.2 + i * 1.7));
          R.g.setAttribute("transform", `translate(${(FX[i] + 7 * sw).toFixed(2)} ${(y + hop).toFixed(2)}) rotate(${(5 * sw).toFixed(2)})`);
          R.g.setAttribute("opacity", a.toFixed(2));
          R.f.setAttribute("transform", `translate(0 56) scale(${(1 + 0.04 * q).toFixed(4)} ${(1 - 0.06 * q).toFixed(4)}) translate(0 -56)`);
          if (s < 0.02) { R.can.setAttribute("display", "none"); R.str.setAttribute("display", "none"); }
          else {
            R.can.removeAttribute("display"); R.str.removeAttribute("display");
            R.can.setAttribute("transform", `translate(${dx.toFixed(2)} -106) scale(${s.toFixed(4)} ${sy.toFixed(4)})`);
            R.str.setAttribute("d", [[-75, -46], [-37.5, -46], [37.5, 46], [75, 46]].map(([u, v]) => `M${(u * s + dx).toFixed(1)} -106 L${v} -56`).join(" "));
          }
          btn[i].setAttribute("transform", `translate(0 ${(4.5 * Math.sin(Math.PI * seg(c, 0, 0.3))).toFixed(2)})`);
          const gv = wrap ? (t < 13.55 ? 0 : seg(t, 13.6, 13.95)) : 1, fade = (j, cc) => guide[j].setAttribute("opacity", (gv * (1 - seg(cc, 0.05, 0.4))).toFixed(2));
          if (i === 1) { fade(1, c); fade(2, c - 1.3); } else fade(i ? 3 : 0, c);
          if (i === 1) {
            const k = seg(c - 1.3, 0, 1);
            tf(port, 478, (lerp(PH, PR, bo(k)) + hop).toFixed(2), 1, (k > 0 && k < 1 ? 9 * Math.sin(k * 10) * (1 - k) : 0).toFixed(2));
            port.setAttribute("opacity", a.toFixed(2));
          }
        });
        say(cap, hot >= 0 ? LINE[hot] : t < START[0] || wrap ? "Get the file for your system from the download page" : t < START[1] ? LINE[0] : t < START[2] ? LINE[1] : t < 11.4 ? LINE[2] : "One file per system", 700);
      };
    },
  };

  /* ---- signin: two windows; the browser shows a code and a copy of it is carried across to the app ---- */
  SC.signin = {
    dur: 14, still: 12.2,
    build(svg, api) {
      head(svg, "Sign in to continue", "tap the app window");
      const AX = 222, FY = 306, mid = { "text-anchor": "middle" };
      const tickDot = (p, r) => {
        const g = el("g", {}, p);
        el("circle", { r, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: `M${(-0.46 * r).toFixed(1)} ${(0.04 * r).toFixed(1)} l${(0.34 * r).toFixed(1)} ${(0.36 * r).toFixed(1)} l${(0.6 * r).toFixed(1)} ${(-0.76 * r).toFixed(1)}`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return g;
      };
      /* the code is never letters: six boxes, a dot in each */
      const chip = (p) => {
        const g = el("g", {}, p), d = [];
        for (let j = 0; j < 6; j++) {
          const b = el("g", { transform: `translate(${-95 + 38 * j} 0)` }, g);
          el("rect", { x: -16, y: -20, width: 32, height: 40, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b);
          el("circle", { r: 5, fill: INK }, b);
          d.push(b);
        }
        return { g, d };
      };
      const ring = (p, w, h) => { const r = el("rect", { fill: "none", stroke: BLUE, "stroke-width": 3, opacity: 0 }, p); r._w = w; r._h = h; return r; };
      const pulse = (r, x, y, k) => {
        const d = 13 * oc(k);
        r.setAttribute("x", (x - r._w / 2 - d).toFixed(1)); r.setAttribute("y", (y - r._h / 2 - d).toFixed(1));
        r.setAttribute("width", (r._w + 2 * d).toFixed(1)); r.setAttribute("height", (r._h + 2 * d).toFixed(1)); r.setAttribute("rx", (r._h / 2 + d).toFixed(1));
        r.setAttribute("opacity", k > 0 && k < 1 ? (0.85 * (1 - k)).toFixed(2) : 0);
      };
      /* where the browser will be: it is not open yet */
      const ph = el("g", {}, svg);
      el("rect", { x: 420, y: 128, width: 336, height: 328, rx: 14, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 10" }, ph);
      el("circle", { cx: 588, cy: 292, r: 48, fill: LIL, "fill-opacity": 0.3, stroke: LIL, "stroke-width": 3 }, ph);
      el("path", { d: "M540 292 H636 M588 244 C560 268 560 316 588 340 M588 244 C616 268 616 316 588 340", fill: "none", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, ph);
      el("path", { d: "M420 164 H756", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 10" }, ph);
      el("rect", { x: 498, y: 376, width: 180, height: 16, rx: 8, fill: LIL, "fill-opacity": 0.3 }, ph);
      el("rect", { x: 528, y: 404, width: 120, height: 16, rx: 8, fill: LIL, "fill-opacity": 0.3 }, ph);
      /* the app window: step one of the four */
      const app = el("g", {}, svg);
      el("rect", { x: 37, y: 85, width: 370, height: 412, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, app);
      el("rect", { x: 44, y: 92, width: 356, height: 398, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, app);
      el("path", { d: "M44 124 H400", stroke: INK, "stroke-width": 3 }, app);
      [LIL, YEL, MINT].forEach((c, i) => el("circle", { cx: 68 + 19 * i, cy: 108, r: 5.5, fill: c, stroke: INK, "stroke-width": 2.5 }, app));
      const step = [0, 1, 2, 3].map((j) => el("circle", { cx: 316 + 20 * j, cy: 108, r: 6, fill: j ? "#fff" : YEL, stroke: INK, "stroke-width": 2.5 }, app));
      const r1 = ring(app, 308, 52), b1 = el("g", {}, app);
      el("rect", { x: -154, y: -26, width: 308, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, b1);
      fit(txt(b1, 0, 8, "Open browser to sign in", Object.assign({ "font-size": 22, "font-weight": 700 }, mid)), 272);
      const lab = txt(app, 70, 262, "Code from the browser", { "font-size": 20, fill: MUTE });
      el("rect", { x: 68, y: 276, width: 308, height: 60, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, app);
      const ghost = el("g", {}, app);
      for (let j = 0; j < 6; j++) el("rect", { x: AX - 111 + 38 * j, y: FY - 20, width: 32, height: 40, rx: 7, fill: "none", stroke: LIL, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "1 7" }, ghost);
      const r2 = ring(app, 220, 50), b2 = el("g", {}, app);
      const b2r = el("rect", { x: -110, y: -25, width: 220, height: 50, rx: 25, fill: SOFT, stroke: INK, "stroke-width": 3 }, b2);
      const b2t = txt(b2, 0, 8, "Use this code", Object.assign({ "font-size": 22, "font-weight": 700, fill: MUTE }, mid));
      const done = pill(app, "You are signed in", MINT, true);
      const sp = el("g", { "pointer-events": "none" }, svg); star(sp, 0, 0, 15, YEL);
      button(app, "Watch the sign in again", () => api.seek(0.3));
      /* the browser: more tabs than anyone needs, and the code */
      const B = mv(el("g", { "pointer-events": "none" }, svg));
      el("rect", { x: -168, y: -164, width: 336, height: 328, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, B);
      el("path", { d: "M-168 -128 V-150 a14 14 0 0 1 14 -14 H154 a14 14 0 0 1 14 14 V-128 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, B);
      const tabs = Array.from({ length: 9 }, (_, j) => ({ r: el("rect", { y: -154, height: 26, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, B), c: el("circle", { cy: -141, r: 3.5, fill: [BLUE, MINT, LIL, SKY][j % 4] }, B) }));
      const nt = el("rect", { y: -154, height: 26, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2 }, B);
      el("rect", { x: -150, y: -118, width: 300, height: 22, rx: 11, fill: SOFT }, B);
      const bt = tickDot(B, 17);
      txt(B, 0, -30, "copy the code", Object.assign({ "font-size": 21, fill: MUTE }, mid));
      const sel = el("rect", { x: -121, y: -14, width: 242, height: 56, rx: 10, fill: SKY, opacity: 0 }, B);
      const code = chip(B); code.g.setAttribute("transform", "translate(0 14)");
      el("rect", { x: -100, y: 72, width: 200, height: 14, rx: 7, fill: SOFT }, B);
      el("rect", { x: -70, y: 98, width: 140, height: 14, rx: 7, fill: SOFT }, B);
      const T = chip(svg); mv(T.g); T.g.setAttribute("pointer-events", "none");
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 13.2, 13.7), vis = 1 - out, live = t < 13.2;
        /* press Open browser to sign in */
        tf(b1, AX, 176, (1 - 0.05 * Math.sin(Math.PI * seg(t, 1.3, 1.65)) + (t < 1.3 ? 0.015 * Math.sin(now * 4) : 0)).toFixed(4));
        pulse(r1, AX, 176, seg(t, 1.45, 2.05));
        /* the browser opens where the outline was, and one more tab squeezes in */
        const bo = seg(t, 1.8, 2.45), bs = cl(bk(bo, 1.5), 0, 1.2) * (1 - io(out));
        tf(B, 588, 292, bs.toFixed(4), ((1 - oc(bo)) * -4).toFixed(2));
        B.setAttribute("opacity", bs > 0.02 ? 1 : 0);
        ph.setAttribute("opacity", cl(1 - seg(t, 1.8, 2.1) + seg(t, 13.45, 13.7)).toFixed(2));
        const pitch = lerp(35, 25.2, io(seg(t, 2.35, 3.05)));
        tabs.forEach((o, j) => { o.r.setAttribute("x", (-159 + j * pitch).toFixed(1)); o.r.setAttribute("width", (pitch - 3).toFixed(1)); o.c.setAttribute("cx", (-160.5 + (j + 0.5) * pitch).toFixed(1)); });
        nt.setAttribute("x", (-159 + 9 * pitch).toFixed(1)); nt.setAttribute("width", Math.max(0.1, 317 - 9 * pitch).toFixed(1)); nt.setAttribute("opacity", pitch < 34.6 ? 1 : 0);
        tf(bt, 0, -72, land(seg(t, 2.85, 3.25), 2.4).toFixed(3));
        code.d.forEach((b, j) => tf(b, -95 + 38 * j, 0, land(seg(t, 3.25 + 0.1 * j, 3.55 + 0.1 * j), 2.2).toFixed(3)));
        sel.setAttribute("opacity", (0.9 * seg(t, 4.45, 4.75) * (1 - seg(t, 6.5, 6.9))).toFixed(2));
        /* a copy of the code lifts out, goes across and drops into the field */
        const k = seg(t, 5.1, 6.3), up = oc(seg(t, 4.85, 5.1)) * (1 - io(seg(t, 6.15, 6.4))), tau = t - 6.4;
        tf(T.g, lerp(588, AX, io(k)).toFixed(2), (FY - 11 * up).toFixed(2), (1 + 0.07 * up + (tau > 0 ? 0.05 * Math.exp(-7 * tau) * Math.sin(18 * tau) : 0)).toFixed(4));
        T.g.setAttribute("opacity", t >= 4.85 ? vis.toFixed(2) : 0);
        ghost.setAttribute("opacity", cl(1 - seg(t, 6, 6.3) + out).toFixed(2));
        lab.setAttribute("fill", t >= 5.1 && live ? INK : MUTE);
        /* press Use this code */
        const ready = t >= 6.55 && live;
        b2r.setAttribute("fill", ready ? YEL : SOFT); b2t.setAttribute("fill", ready ? INK : MUTE);
        tf(b2, AX, 389, (1 + 0.06 * Math.sin(Math.PI * seg(t, 6.55, 6.9)) - 0.05 * Math.sin(Math.PI * seg(t, 7.7, 8.05))).toFixed(4));
        pulse(r2, AX, 389, seg(t, 7.85, 8.45));
        const dk = seg(t, 8.45, 8.9);
        tf(done, 210, 452, (land(dk, 2.2) * vis).toFixed(3), ((1 - oc(dk)) * -6).toFixed(2));
        step[0].setAttribute("fill", t >= 8.45 && live ? MINT : YEL);
        tf(sp, 364, 452, (land(seg(t, 8.8, 9.25), 2.6) * vis * (1 + 0.12 * Math.sin(now * 3))).toFixed(3), (now * 20).toFixed(1));
        say(cap, t < 1.3 || out > 0 ? "The browser never opens by itself" : t < 2.9 ? "Press Open browser to sign in" : t < 5.1 ? "Copy the code from the browser" : t < 7.4 ? "Paste it into Code from the browser" : t < 8.45 ? "Press Use this code" : "Sign in takes two windows", 700);
      };
    },
  };

  /* ---- fork: a mini golf lane that splits in three, one branch per button; the ball takes the free one and circles the hole first ---- */
  SC.fork = {
    dur: 14, still: 9.2,
    build(svg, api) {
      head(svg, "Run your agents like a company", "tap a branch");
      const LY = [180, 304, 428], HX = 556, FK = 178, A0 = -2.2;
      const BTN = ["Continue with the free version", "I have a licence key", "Get PRO"];
      const DEST = [["Classic view"], ["paste a key"], ["checkout in", "your browser"]];
      const LINE = ["Continue with the free version opens the Classic view", "I have a licence key lets you paste a key", "Get PRO opens the checkout in your browser"];
      const lane = (i) => `M190 304 C250 304 250 ${LY[i]} 310 ${LY[i]} H${HX}`;
      let pick = 0, lastT = 0, held = false;
      /* rough grass, a bunker and a star around the course */
      [[138, 178], [166, 246], [236, 474], [694, 362], [472, 494], [724, 246]].forEach(([x, y]) => el("path", { d: `M${x - 7} ${y} l-3 -11 M${x} ${y} v-14 M${x + 7} ${y} l3 -11`, fill: "none", stroke: MINT, "stroke-width": 3.5, "stroke-linecap": "round" }, svg));
      el("path", { d: "M50 454 C40 422 82 406 112 416 C150 404 176 432 160 460 C148 488 68 488 50 454 Z", fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [[84, 440], [112, 456], [136, 438], [96, 468], [140, 464]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 2, fill: INK }, svg));
      /* the felt: every lane is drawn twice, ink under mint, so the edge stays one even line */
      const felt = "M64 304 H190 " + [0, 1, 2].map(lane).join(" ");
      el("path", { d: felt, fill: "none", stroke: INK, "stroke-width": 56, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      el("path", { d: felt, fill: "none", stroke: MINT, "stroke-width": 50, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      LY.forEach((y) => el("circle", { cx: HX, cy: y, r: 13, fill: INK }, svg));
      el("rect", { x: 78, y: 287, width: 38, height: 34, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 44, 366, "after setup", { "font-size": 20, fill: MUTE });
      /* one button over each branch; the branch and its button are one tap target */
      const B = BTN.map((s, i) => {
        const g = el("g", {}, svg);
        el("path", { d: lane(i), fill: "none", stroke: "#fff", "stroke-opacity": 0, "stroke-width": 56, "stroke-linecap": "round" }, g);
        const f = el("g", {}, g), t = fit(txt(f, 0, 7, s, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 }), 286);
        const w = Math.round(t.getComputedTextLength() + 38);
        const r = el("rect", { x: -w / 2, y: -20, width: w, height: 40, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 });
        f.insertBefore(r, t);
        f.insertBefore(el("rect", { x: -w / 2 - 5, y: -25, width: w + 10, height: 50, rx: 25, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }), r);
        const pr = el("rect", { fill: "none", stroke: BLUE, "stroke-width": 3, opacity: 0 }, g);
        button(g, `Take the branch ${s}`, () => { pick = i; held = true; api.seek(3.4); });
        return { f, r, pr, w, cx: 318 + w / 2, y: LY[i] - 42 };
      });
      const D = DEST.map((L, i) => L.map((s, j) => txt(svg, 604, LY[i] + (L.length > 1 ? -5 + 24 * j : 7), s, { "font-size": 20, "font-weight": 700, fill: MUTE })));
      const disc = [0, 1, 2].map((i) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("circle", { r: 16, fill: i ? LIL : MINT, stroke: INK, "stroke-width": 2.5 }, g);
        if (i) el("circle", { r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        else el("path", { d: "M-7 1 l5 5 l9 -11", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return g;
      });
      /* the putter, and the ball */
      const put = mv(el("g", { "pointer-events": "none" }, svg));
      el("path", { d: "M0 0 V190", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, put);
      el("rect", { x: -6, y: -4, width: 12, height: 56, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2.5 }, put);
      el("rect", { x: -10, y: 186, width: 24, height: 27, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, put);
      const ball = mv(el("g", { "pointer-events": "none" }, svg));
      el("circle", { r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, ball);
      const sp = el("g", { "pointer-events": "none" }, svg); star(sp, 0, 0, 13, YEL);
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        if (t < lastT - 1 && !held) pick = 0;
        held = false; lastT = t;
        const live = t < 13.2, out = seg(t, 13.2, 13.5), P = pick, Y = LY[P];
        /* the putt */
        const th = t < 0.75 ? 5 * io(seg(t, 0.3, 0.75)) : t < 0.9 ? lerp(5, -2, Math.pow(seg(t, 0.75, 0.9), 2)) : -2 * (1 - oc(seg(t, 0.9, 1.5)));
        tf(put, 62, 104, 1, th.toFixed(2));
        let x = 96, y = 304 + (t < 0.3 ? 0.6 * Math.sin(now * 5) : 0), s = 1, o = 1;
        if (live && t >= 0.88) {
          /* it rolls to the split, stops, and leans toward two branches before it picks */
          const h2 = Math.sin(Math.PI * seg(t, 2.1, 2.7)), h1 = Math.sin(Math.PI * seg(t, 2.8, 3.35));
          x = lerp(96, FK, oc(seg(t, 0.88, 1.9))) + 9 * h2 + 15 * h1; y = 304 + 8 * h2;
          const g = seg(t, 4, 5.9);
          if (g > 0) {
            const BL = P === 1 ? 120 : 181, d = (1 - Math.pow(1 - io(g), 1.6)) * (12 + BL + 237);
            if (d <= 12) x = FK + d;
            else if (d <= 12 + BL) { const q = (d - 12) / BL; x = 190 + 180 * q - 180 * q * q + 120 * q * q * q; y = 304 + (Y - 304) * (3 * q * q - 2 * q * q * q); }
            else { const q = (d - 12 - BL) / 237; x = lerp(310, HX + 16 * Math.cos(A0), q); y = Y + 16 * Math.sin(A0) * io(seg(q, 0.55, 1)); }
          }
          /* round the rim once, then in */
          const k = seg(t, 5.9, 7);
          if (k > 0) { const a = A0 + 2.6 * Math.PI * (1 - Math.pow(1 - k, 1.8)), r = 16 * (1 - Math.pow(k, 2.5)); x = HX + r * Math.cos(a); y = Y + r * Math.sin(a); s = 1 - 0.4 * Math.pow(k, 3); o = 1 - seg(k, 0.82, 1); }
        }
        if (!live) o = seg(t, 13.5, 13.9);
        tf(ball, x.toFixed(2), y.toFixed(2), s.toFixed(3)); ball.setAttribute("opacity", o.toFixed(2));
        let say2 = 0;
        B.forEach((b, i) => {
          const a = 9.9 + 1.6 * (i - 1), pv = live && P === 0 && i > 0 && t >= a && t < a + 1.5;
          if (pv) say2 = i;
          const on = (live && i === P && t >= 3.5) || pv;
          b.r.setAttribute("fill", on ? (i ? LIL : YEL) : "#fff");
          tf(b.f, b.cx, b.y, (1 + 0.05 * Math.sin(Math.PI * seg(t, 0.1 + 0.14 * i, 0.5 + 0.14 * i)) - (i === P ? 0.05 * Math.sin(Math.PI * seg(t, 3.5, 3.85)) : 0) + (P === 0 && i > 0 ? 0.05 * Math.sin(Math.PI * seg(t, a, a + 0.4)) : 0)).toFixed(4));
          const k = i === P ? seg(t, 3.65, 4.25) : 0, e = 13 * oc(k);
          b.pr.setAttribute("x", (b.cx - b.w / 2 - e).toFixed(1)); b.pr.setAttribute("y", (b.y - 20 - e).toFixed(1));
          b.pr.setAttribute("width", (b.w + 2 * e).toFixed(1)); b.pr.setAttribute("height", (40 + 2 * e).toFixed(1)); b.pr.setAttribute("rx", (20 + e).toFixed(1));
          b.pr.setAttribute("opacity", k > 0 && k < 1 ? (0.85 * (1 - k)).toFixed(2) : 0);
          D[i].forEach((n) => n.setAttribute("fill", (live && i === P && t >= 7) || pv ? INK : MUTE));
          tf(disc[i], HX, LY[i], (i === P ? land(seg(t, 6.95, 7.35), 2.2) * (1 - out) : 0).toFixed(3));
        });
        tf(sp, 748, 150, (P === 0 ? land(seg(t, 7.3, 7.75), 2.6) * (1 - out) * (1 + 0.12 * Math.sin(now * 3)) : 0).toFixed(3), (now * 20).toFixed(1));
        say(cap, !live || t < 2 ? "The first screen after setup" : t < 3.5 ? "The screen that stops people" : say2 ? LINE[say2] : P === 0 && t < 7 ? "Without a licence, press Continue with the free version" : LINE[P], 700);
      };
    },
  };

  /* ---- ide: the editor window; an agent adds two lines, Changes marks them, and the switch shows the file as code, split or preview ---- */
  SC.ide = {
    dur: 14, still: 11.6,
    build(svg, api) {
      head(svg, "What is the IDE button for?", "tap the switch");
      const mid = { "text-anchor": "middle" }, PX = 224, PR = 756, PW = PR - PX, TOP = 169.5, BOT = 488.5;
      const LN = (j) => 194 + 25 * j, FY = (j) => 196 + 37 * j, X0 = PX + 48, TW = [360, 236];
      let uv = -1, ut = 0, v0 = 0, last = 0;
      /* the window: title bar, tool row, file list at the side */
      el("rect", { x: 44, y: 92, width: 712, height: 398, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M44 124 H756 M44 168 H756 M${PX} 168 V490`, stroke: INK, "stroke-width": 3 }, svg);
      [LIL, YEL, MINT].forEach((c, i) => el("circle", { cx: 68 + 19 * i, cy: 108, r: 5.5, fill: c, stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", { x: 132, y: 97, width: 54, height: 22, rx: 11, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 159, 113.5, "IDE", Object.assign({ "font-size": 16, "font-weight": 700 }, mid));
      el("rect", { x: 262, y: 96, width: 276, height: 24, rx: 12, fill: SOFT }, svg);
      fit(txt(svg, 400, 114, "an agent's working folder", Object.assign({ "font-size": 17 }, mid)), 250);
      let tx = 58;
      const tabs = ["Changes", "History", "Compare"].map((s) => {
        const g = el("g", {}, svg), t = txt(g, 0, 152.5, s, Object.assign({ "font-size": 18, "font-weight": 700 }, mid)), w = Math.round(t.getComputedTextLength() + 26);
        const r = el("rect", { x: tx, y: 131, width: w, height: 30, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }), o = { g, r, cx: tx + w / 2 };
        g.insertBefore(r, t); t.setAttribute("x", o.cx); tx += w + 8;
        return o;
      });
      /* the switch: three words, and a yellow knob under the one in use */
      const SW = ["code", "split", "preview"], swg = el("g", {}, svg);
      const swbg = el("rect", { y: 131, height: 30, rx: 15, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, swg), knob = el("rect", { y: 131, height: 30, rx: 15, fill: YEL, stroke: INK, "stroke-width": 2.5 }, swg);
      let sx = 0;
      const S3 = SW.map((s) => { const g = el("g", {}, swg), t = txt(g, 0, 152.5, s, Object.assign({ "font-size": 18, "font-weight": 700 }, mid)), w = Math.round(t.getComputedTextLength() + 28), o = { g, t, w, x: sx }; sx += w; return o; });
      swbg.setAttribute("x", 744 - sx); swbg.setAttribute("width", sx);
      S3.forEach((o, i) => {
        o.x += 744 - sx; o.t.setAttribute("x", o.x + o.w / 2);
        o.g.insertBefore(el("rect", { x: o.x - 4, y: 127, width: o.w + 8, height: 38, rx: 19, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }), o.t);
        button(o.g, `Show the file as ${SW[i]}`, () => { v0 = last; uv = i; ut = api.now(); api.poke(); });
      });
      el("rect", { x: 52, y: FY(2) - 16, width: 164, height: 32, rx: 8, fill: SOFT }, svg);
      [84, 62, 96, 54, 78, 70].forEach((w, j) => {
        const g = el("g", { transform: `translate(${j ? 84 : 72} ${FY(j)})` }, svg);
        if (!j) el("path", { d: "M-9 -7 H-2 L1 -4 H9 V7 H-9 Z", fill: YEL, stroke: INK, "stroke-width": 2.2, "stroke-linejoin": "round" }, g);
        else if (j === 4) { el("rect", { x: -8, y: -7, width: 16, height: 14, rx: 2, fill: SKY, stroke: INK, "stroke-width": 2.2 }, g); el("path", { d: "M-6 5 l5 -6 l4 4 l2 -2 l3 4", fill: "none", stroke: INK, "stroke-width": 1.8, "stroke-linejoin": "round" }, g); }
        else el("path", { d: "M-7 -9 H2 L7 -4 V9 H-7 Z", fill: "#fff", stroke: INK, "stroke-width": 2.2, "stroke-linejoin": "round" }, g);
        el("rect", { x: 18, y: -5, width: w, height: 10, rx: 5, fill: MUTE, "fill-opacity": j === 2 ? 0.85 : 0.4 }, g);
      });
      const dot = el("circle", { r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 62, y: 438, width: 144, height: 36, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M82 456 h14 M89 449 v14", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      txt(svg, 106, 462.5, "New file", { "font-size": 18, "font-weight": 700 });
      /* the pane: code on the left of the divider, the formatted preview on the right of it */
      const defs = el("defs", {}, svg);
      const cc = el("rect", { x: PX + 1.5, y: TOP, height: BOT - TOP }, el("clipPath", { id: "mg-ide-code" }, defs)), cp = el("rect", { y: TOP, height: BOT - TOP }, el("clipPath", { id: "mg-ide-prev" }, defs));
      const C = el("g", { "clip-path": "url(#mg-ide-code)" }, svg), V = el("g", { "clip-path": "url(#mg-ide-prev)" }, svg);
      el("rect", { x: PX + 1.5, y: TOP, width: 32, height: BOT - TOP, fill: SOFT }, C);
      const band = [9, 10].map((j) => el("rect", { x: PX + 33.5, y: LN(j) - 12.5, width: PW, height: 25, fill: MINT, "fill-opacity": 0.4, opacity: 0 }, C));
      const mark = [9, 10].map((j) => el("rect", { x: PX + 4, y: LN(j) - 10, width: 6, height: 20, rx: 3, fill: MINT, stroke: INK, "stroke-width": 2, opacity: 0 }, C));
      for (let j = 0; j < 11; j++) el("rect", { x: PX + 15, y: LN(j) - 2, width: 12, height: 4, rx: 2, fill: MUTE, "fill-opacity": 0.45 }, C);
      const bar = (x, j, w, fill, op, h = 10) => el("rect", { x, y: LN(j) - h / 2, width: w, height: h, rx: h / 2, fill, "fill-opacity": op }, C);
      el("rect", { x: X0, y: LN(0) - 6, width: 12, height: 12, rx: 3, fill: LIL }, C); bar(X0 + 20, 0, 150, INK, 0.9, 12);
      bar(X0, 2, 400, MUTE, 0.5); bar(X0, 3, 330, MUTE, 0.5);
      [190, 250, 160].forEach((w, i) => { el("rect", { x: X0, y: LN(5 + i) - 2, width: 9, height: 4, rx: 2, fill: BLUE }, C); bar(X0 + 18, 5 + i, w, MUTE, 0.5); });
      const typed = [bar(X0, 9, 0, INK, 0.75), bar(X0, 10, 0, INK, 0.75)];
      const cur = el("rect", { width: 3, height: 20, fill: INK }, C);
      const pvH = el("rect", { y: 184, height: 20, rx: 10, fill: INK }, V);
      const pvP = [232, 254].map((y) => el("rect", { y, height: 10, rx: 5, fill: MUTE, "fill-opacity": 0.5 }, V));
      const pvL = [298, 324, 350].map((y) => ({ d: el("circle", { cy: y + 5, r: 5, fill: BLUE }, V), b: el("rect", { y, height: 10, rx: 5, fill: MUTE, "fill-opacity": 0.5 }, V) }));
      const pvN = [398, 420].map((y) => el("rect", { y, height: 10, rx: 5, fill: INK, "fill-opacity": 0.75 }, V));
      const div = el("path", { stroke: INK, "stroke-width": 3 }, svg);
      /* the scroll bar: it is a long report */
      el("rect", { x: 740, y: 178, width: 8, height: 302, rx: 4, fill: LIL, "fill-opacity": 0.3 }, svg);
      const thumb = el("rect", { x: 740, y: 181, width: 8, rx: 4, fill: MUTE }, svg);
      const cap = strip(svg, 508, 740);
      const auto = (t) => (t < 7.6 ? io(seg(t, 5.2, 5.85)) : t < 9.8 ? 1 + io(seg(t, 7.6, 8.25)) : t < 13.2 ? 2 - io(seg(t, 9.8, 10.45)) : 1 - io(seg(t, 13.2, 13.7)));
      return (t, now) => {
        const live = t < 13.2, out = seg(t, 13.2, 13.5);
        let v = auto(t);
        if (uv >= 0) { const c = now - ut; if (c >= 5.6) uv = -1; else v = c < 5 ? lerp(v0, uv, io(seg(c, 0, 0.45))) : lerp(uv, v, io(seg(c, 5, 5.6))); }
        last = v;
        const dx = PR - (v / 2) * PW, x = dx + 24, av = Math.max(0, PR - dx - 58);
        cc.setAttribute("width", Math.max(0, dx - PX - 1.5).toFixed(1));
        cp.setAttribute("x", dx.toFixed(1)); cp.setAttribute("width", Math.max(0, PR - 1.5 - dx).toFixed(1));
        div.setAttribute("d", `M${dx.toFixed(1)} 168 V${(dx > PR - 14 ? 476 + Math.sqrt(196 - Math.pow(dx - PR + 14, 2)) : 490).toFixed(1)}`);
        const a = Math.min(1, Math.floor(v)), f = v - a;
        knob.setAttribute("x", lerp(S3[a].x, S3[a + 1].x, f).toFixed(1)); knob.setAttribute("width", lerp(S3[a].w, S3[a + 1].w, f).toFixed(1));
        /* the agent types two more lines, and the file in the list gets its dot */
        const ty = [seg(t, 0.9, 1.7), seg(t, 1.8, 2.4)].map((k) => (Math.round(k * 12) / 12) * (1 - out)), ci = t >= 1.8 ? 1 : 0;
        typed.forEach((n, i) => n.setAttribute("width", (TW[i] * ty[i]).toFixed(1)));
        cur.setAttribute("x", (X0 + TW[ci] * ty[ci] + 4).toFixed(1)); cur.setAttribute("y", LN(9 + ci) - 10);
        cur.setAttribute("opacity", Math.sin(now * 6) > -0.2 ? 1 : 0);
        tf(dot, 204, FY(2), (land(seg(t, 0.95, 1.35), 2.4) * (1 - out)).toFixed(3));
        thumb.setAttribute("height", (15 - 2 * (ty[0] + ty[1])).toFixed(1));
        /* Changes lights up and marks the two new lines */
        tabs[0].r.setAttribute("fill", live && t >= 3.2 ? YEL : "#fff");
        tabs[0].g.setAttribute("transform", `translate(${tabs[0].cx} 146) scale(${(1 + 0.09 * Math.sin(Math.PI * seg(t, 3.2, 3.6))).toFixed(4)}) translate(${-tabs[0].cx} -146)`);
        band.forEach((n, i) => { const k = (seg(t, 3.5 + 0.2 * i, 3.8 + 0.2 * i) * (1 - out)).toFixed(2); n.setAttribute("opacity", k); mark[i].setAttribute("opacity", k); });
        /* the preview keeps its own layout, whatever room it has */
        pvH.setAttribute("x", x.toFixed(1)); pvH.setAttribute("width", (0.62 * av).toFixed(1));
        pvP.forEach((n, i) => { n.setAttribute("x", x.toFixed(1)); n.setAttribute("width", ([1, 0.78][i] * av).toFixed(1)); });
        pvL.forEach((o, i) => { o.d.setAttribute("cx", (x + 6).toFixed(1)); o.b.setAttribute("x", (x + 22).toFixed(1)); o.b.setAttribute("width", ([0.55, 0.72, 0.45][i] * Math.max(0, av - 22)).toFixed(1)); });
        pvN.forEach((n, i) => { n.setAttribute("x", x.toFixed(1)); n.setAttribute("width", ([0.9, 0.58][i] * av * ty[i]).toFixed(1)); });
        say(cap, uv >= 0 || (t >= 5.2 && t < 9.8) ? "Preview Markdown as code, split or preview" : !live || t < 0.9 ? "The IDE button opens a code editor on an agent's working folder" : t < 3.2 ? "See what an agent just did without leaving the office" : t < 5.2 ? "See what the agent changed: Changes, History and Compare" : "Read the report in preview next to the files it describes", 700);
      };
    },
  };

  /* ---- fixes: four stepping stones over a stream, one per fix, each a bigger restart than the last; the pebble stops on the first that works ---- */
  SC.fixes = {
    dur: 14, still: 11.6,
    build(svg, api) {
      head(svg, "What do you do when an install fails?", "tap a stone");
      const mid = { "text-anchor": "middle" }, T0 = 0.9, GAP = 2, B0 = [68, 356];
      const ST = [[176, 344, 56, 36], [312, 326, 60, 39], [456, 308, 64, 42], [608, 290, 68, 45]];
      const NAME = [["Check again"], ["restart", "the agent"], ["reopen", "the app"], ["restart the", "computer"]];
      const STEP = ["Press Check again or Try again", "Close that agent and start it again", "Quit Munder Difflin completely and open it again", "Restart the computer"];
      const LP = ST.map(([x, y, rx]) => [x - rx + 22, y + 2]);
      const tick = (p) => el("path", { d: "M-6 1 l4.5 4.5 l8 -10", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, p);
      let goal = 2, lastT = 0, held = false;
      /* the stream: ripples, lily pads, and a bank on each side */
      const rip = [[150, 250], [268, 244], [392, 232], [512, 224], [150, 446], [304, 458], [566, 442], [644, 474], [440, 482]].map(([x, y]) => ({ x, y, n: el("path", { d: "M-16 0 q8 -7 16 0 t16 0", fill: "none", stroke: SKY, "stroke-width": 3.5, "stroke-linecap": "round" }, svg) }));
      const pad = [[230, 470, 15], [376, 448, 13], [506, 458, 17], [708, 462, 14]].map(([x, y, r]) => ({ x, y, n: el("path", { d: `M0 0 L${r} 0 A${r} ${r} 0 1 1 ${(r * 0.8).toFixed(1)} ${(-r * 0.6).toFixed(1)} Z`, fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg) }));
      el("path", { d: "M36 336 C32 304 76 290 94 310 C112 330 108 392 88 408 C68 424 42 412 36 386 Z", fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M696 300 C702 266 750 262 764 298 C772 330 768 390 748 406 C726 420 700 398 694 364 Z", fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      [[54, 330], [84, 394], [722, 302], [746, 378], [718, 352]].forEach(([x, y]) => el("path", { d: `M${x - 5} ${y} l-2 -8 M${x} ${y} v-10 M${x + 5} ${y} l2 -8`, fill: "none", stroke: INK, "stroke-width": 2.2, "stroke-linecap": "round" }, svg));
      /* the stones: the same restart arrow on each, a size bigger every time, around the thing it restarts */
      const S = ST.map(([x, y, rx, ry], k) => {
        const g = el("g", {}, svg), R = [18, 20, 22, 25][k];
        el("ellipse", { cx: x, cy: y, rx: rx + 10, ry: ry + 8, fill: "none", stroke: SKY, "stroke-width": 3 }, g);
        const rp = el("ellipse", { cx: x, cy: y, fill: "none", stroke: SKY, "stroke-width": 3, opacity: 0 }, g);
        el("ellipse", { cx: x, cy: y, rx: rx + 5, ry: ry + 5, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const e = el("ellipse", { cx: x, cy: y, rx, ry, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const io2 = el("g", { transform: `translate(${x + 15} ${y})` }, g), sp = el("g", {}, io2), ic = el("g", { transform: `scale(${1.15 + 0.05 * k})` }, io2), ex = (R * 0.5).toFixed(1), ey = (-R * 0.866).toFixed(1);
        el("path", { d: `M${R} 0 A${R} ${R} 0 1 1 ${ex} ${ey} M${ex} ${ey} l-3 -6.3 M${ex} ${ey} l-7 0.6`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, sp);
        if (k === 0) el("rect", { x: -9, y: -5, width: 18, height: 10, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.2 }, ic);
        if (k === 1) { el("rect", { x: -10, y: -8, width: 20, height: 16, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.2 }, ic); el("path", { d: "M-5 -3 l4 3 l-4 3 M1 4 h5", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, ic); }
        if (k === 2) { el("rect", { x: -12, y: -9, width: 24, height: 18, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2.2 }, ic); el("path", { d: "M-12 -3 H12", stroke: INK, "stroke-width": 2.2 }, ic); }
        if (k === 3) { el("rect", { x: -14, y: -12, width: 28, height: 19, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2.2 }, ic); el("path", { d: "M0 7 V12 M-8 12.5 H8", stroke: INK, "stroke-width": 2.2, "stroke-linecap": "round" }, ic); }
        NAME[k].forEach((s, j) => txt(svg, x, y + ry + 28 + 23 * j, s, Object.assign({ "font-size": 20, "font-weight": 700 }, mid)));
        button(g, `Hop as far as ${NAME[k].join(" ")}`, () => { goal = k; held = true; api.seek(0.7); });
        return { e, sp, rp, rx, ry, bx: x + 0.707 * rx, by: y - 0.707 * ry };
      });
      S.forEach((s) => {
        s.bd = el("g", { "pointer-events": "none" }, svg);
        s.no = el("g", {}, s.bd); el("circle", { r: 11, fill: LIL, stroke: INK, "stroke-width": 2.5 }, s.no); el("path", { d: "M-4 -4 L4 4 M4 -4 L-4 4", stroke: INK, "stroke-width": 2.8, "stroke-linecap": "round" }, s.no);
        s.ok = el("g", {}, s.bd); el("circle", { r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, s.ok); tick(s.ok).setAttribute("transform", "scale(0.85)");
      });
      /* the install that failed: a crooked card with a broken bar */
      const card = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: -108, y: -56, width: 216, height: 112, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      txt(card, -88, -14, "Install", { "font-size": 24, "font-weight": 700 });
      el("rect", { x: -88, y: 10, width: 96, height: 18, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, card);
      const brk = el("g", {}, card); el("rect", { x: 0, y: -9, width: 76, height: 18, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, brk);
      const mend = el("rect", { x: -88, y: 10, width: 176, height: 18, rx: 6, fill: MINT, stroke: INK, "stroke-width": 2.5, opacity: 0 }, card);
      const warn = el("g", {}, card); el("circle", { r: 14, fill: YEL, stroke: INK, "stroke-width": 2.5 }, warn); el("path", { d: "M0 -7 V2", stroke: INK, "stroke-width": 3.2, "stroke-linecap": "round" }, warn); el("circle", { cy: 7.5, r: 2, fill: INK }, warn);
      const okm = el("g", {}, card); el("circle", { r: 14, fill: MINT, stroke: INK, "stroke-width": 2.5 }, okm); tick(okm);
      /* past the far bank: the last resort */
      const bub = el("g", { transform: "translate(650 154)", "pointer-events": "none" }, svg);
      el("rect", { x: -114, y: -50, width: 228, height: 100, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, bub);
      el("path", { d: "M40 48 L58 80 L76 48", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, bub);
      txt(bub, 0, -12, "Still stuck?", Object.assign({ "font-size": 20, fill: MUTE }, mid));
      fit(txt(bub, 0, 20, "Ask your orchestrator", Object.assign({ "font-size": 20, "font-weight": 700 }, mid)), 204);
      const sh = el("ellipse", { rx: 10, ry: 4, fill: INK, opacity: 0.16, "pointer-events": "none" }, svg);
      const peb = mv(el("g", { "pointer-events": "none" }, svg));
      el("circle", { r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, peb); el("circle", { cx: -3.5, cy: -3.5, r: 2.5, fill: "#fff" }, peb);
      const sp = el("g", { "pointer-events": "none" }, svg); star(sp, 0, 0, 12, YEL);
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        if (t < lastT - 1 && !held) goal = 2;
        held = false; lastT = t;
        const live = t < 13.2, out = seg(t, 13.2, 13.5), Vg = T0 + GAP * goal + 1.35;
        rip.forEach((o, i) => tf(o.n, (o.x + 4 * Math.sin(now * 0.8 + i * 1.7)).toFixed(2), o.y));
        pad.forEach((o, i) => tf(o.n, (o.x + 5 * Math.sin(now * 0.4 + i * 2)).toFixed(2), (o.y + 2 * Math.cos(now * 0.5 + i)).toFixed(2), 1, (20 * i + 8 * Math.sin(now * 0.3 + i)).toFixed(1)));
        /* the pebble: one hop per stone, as far as the stone that works */
        let px = B0[0], py = B0[1], lift = 0, tl = -1, po = 1;
        for (let k = 0; k <= goal; k++) {
          const h = T0 + GAP * k; if (t < h) break;
          const a = k ? LP[k - 1] : B0, q = seg(t, h, h + 0.5), e = 0.5 * q + 0.5 * io(q);
          px = lerp(a[0], LP[k][0], e); py = lerp(a[1], LP[k][1], e); lift = 4 * q * (1 - q); tl = t - h - 0.5;
        }
        if (!live) { po = t < 13.5 ? 1 - out : seg(t, 13.55, 13.9); if (t >= 13.5) { px = B0[0]; py = B0[1]; lift = 0; tl = -1; } }
        const sq = tl > 0 ? 0.2 * Math.exp(-9 * tl) * Math.cos(20 * tl) : 0, bob = tl > 1 ? 1.2 * Math.sin(now * 2.2) : 0, ps = 1 + 0.22 * lift;
        peb.setAttribute("transform", `translate(${px.toFixed(2)} ${(py - 42 * lift + bob + 11 * sq).toFixed(2)}) scale(${(ps * (1 + 0.5 * sq)).toFixed(4)} ${(ps * (1 - sq)).toFixed(4)})`);
        peb.setAttribute("opacity", po.toFixed(2));
        tf(sh, px.toFixed(2), (py + 10).toFixed(2), (1 - 0.45 * lift).toFixed(3)); sh.setAttribute("opacity", (0.16 * po).toFixed(3));
        S.forEach((s, k) => {
          const h = T0 + GAP * k, used = k <= goal, v = h + 1.35, r = used ? seg(t, h + 0.5, h + 1.25) : 0;
          s.e.setAttribute("fill", used && live && t >= v ? (k === goal ? MINT : SOFT) : "#fff");
          s.sp.setAttribute("transform", `rotate(${used ? (360 * io(seg(t, h + 0.6, h + 1.3))).toFixed(1) : 0})`);
          s.rp.setAttribute("rx", (s.rx + 10 + 20 * oc(r)).toFixed(1)); s.rp.setAttribute("ry", (s.ry + 8 + 14 * oc(r)).toFixed(1)); s.rp.setAttribute("opacity", r > 0 && r < 1 ? (0.9 * (1 - r)).toFixed(2) : 0);
          tf(s.bd, s.bx.toFixed(1), s.by.toFixed(1), (used ? land(seg(t, v, v + 0.4), 2.4) * (1 - out) : 0).toFixed(3));
          s.no.setAttribute("opacity", k === goal ? 0 : 1); s.ok.setAttribute("opacity", k === goal ? 1 : 0);
        });
        /* each try lifts the broken half of the bar; only the last one holds */
        let th = -5 + 0.5 * Math.sin(now * 1.6), ph = 10;
        for (let k = 0; k < goal; k++) { const a = seg(t, T0 + GAP * k + 0.6, T0 + GAP * k + 1.55); if (a > 0 && a < 1) { ph = 10 - 7 * Math.sin(Math.PI * a); th = -5 + 1.8 * Math.sin(a * Math.PI * 4) * (1 - a); } }
        if (t >= Vg - 0.75) { ph = 10 * (1 - io(seg(t, Vg - 0.75, Vg - 0.05))); if (t >= Vg) th = -5 * (1 - land(seg(t, Vg, Vg + 0.6), 1.8)); }
        const bk2 = io(out), fixed = live && t >= Vg;
        tf(card, 160, 158, 1, lerp(th, -5, bk2).toFixed(2)); tf(brk, 12, 19, 1, lerp(ph, 10, bk2).toFixed(2));
        mend.setAttribute("opacity", (seg(t, Vg, Vg + 0.25) * (1 - out)).toFixed(2));
        tf(warn, 78, -24, (fixed ? 0 : (1 + 0.07 * Math.sin(now * 5)) * (live ? 1 : seg(t, 13.3, 13.6))).toFixed(3));
        tf(okm, 78, -24, (land(seg(t, Vg, Vg + 0.4), 2.4) * (1 - out)).toFixed(3));
        tf(sp, 284, 100, (land(seg(t, Vg + 0.3, Vg + 0.75), 2.6) * (1 - out) * (1 + 0.12 * Math.sin(now * 3))).toFixed(3), (now * 20).toFixed(1));
        say(cap, !live || t < T0 ? "When an install fails, work up four steps" : t >= Vg ? "Stop at the first step that fixes it" : STEP[Math.min(goal, Math.floor((t - T0) / GAP))], 700);
      };
    },
  };

  /* ==== ADD NEW SCENES ABOVE THIS LINE ==== */

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
