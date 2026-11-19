/* Arcade high score HUD scenes for "GTA 6 review scores". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", NAVY = "#22305E", AQUA = "#3FC6C9";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 15, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bump = (k) => (k <= 0 || k >= 1 ? 0 : Math.sin(Math.PI * k) * (1 - k) * 1.7);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const tf2 = (n, x, y, sx, sy, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${sx} ${sy})`);
  const show = (n, o) => n.setAttribute("opacity", o);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let uid = 0;

  /* ---- shared arcade kit ---- */
  // every scene draws into one stage group; hover and focus lift lives in a style element inside the SVG
  const stage = (svg) => {
    el("style", {}, svg).textContent = ".mg-lift{transition:transform .22s cubic-bezier(.34,1.56,.64,1)}.mg-hit:focus-visible .mg-lift{transform:translateY(-4px)}@media (hover:hover){.mg-hit:hover .mg-lift{transform:translateY(-4px)}}@media (prefers-reduced-motion:reduce){.mg-lift{transition:none}}";
    return el("g", {}, svg);
  };
  // slow drifting pixel dust, the far layer
  const dust = (p, H, pts) => {
    const g = el("g", {}, p), a = pts.map(([x, y], i) => ({ n: el("rect", { width: 8 + (i % 3) * 6, height: 8 + (i % 3) * 6, fill: SOFT }, g), x, y, v: 5 + (i % 4) * 3 }));
    return (now) => a.forEach((d) => d.n.setAttribute("transform", `translate(${d.x} ${((d.y - now * d.v) % H + H) % H})`));
  };
  // chunky pixel digits: 5 by 7 cells, ink outline, soft offset shadow
  const GLY = { 0: "01110100011000110001100011000101110", 1: "00100011000010000100001000010001110", 2: "01110100010000100010001000100011111", 3: "11110000010000101110000010000111110", 4: "00010001100101010010111110001000010", 5: "11111100001111000001000011000101110", 6: "00110010001000011110100011000101110", 7: "11111000010001000100010000100001000", 8: "01110100011000101110100011000101110", 9: "01110100011000101111000010001001100" };
  const pix = (p, c, fill, o = {}) => {
    const g = el("g", {}, p), ow = o.ow == null ? Math.max(1.2, c * 0.3) : o.ow, sd = o.sd == null ? c * 0.6 : o.sd;
    let cur = null, col = fill;
    const paint = () => {
      while (g.firstChild) g.removeChild(g.firstChild);
      const s = cur, w = s.length * 6 * c - c, x0 = o.anchor === "end" ? -w : o.anchor === "mid" ? -w / 2 : 0;
      const layers = [];
      if (sd) layers.push(el("g", { fill: o.shadow || LIL, stroke: o.shadow || LIL, "stroke-width": ow * 2, transform: `translate(${sd} ${sd})` }, g));
      if (ow) layers.push(el("g", { fill: INK, stroke: INK, "stroke-width": ow * 2, "stroke-linejoin": "miter" }, g));
      layers.push(el("g", { fill: col, stroke: col, "stroke-width": 0.4 }, g));
      [...s].forEach((ch, i) => { const b = GLY[ch]; if (!b) return; for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) { if (b[y * 5 + x] !== "1") continue; let n = 1; while (x + n < 5 && b[y * 5 + x + n] === "1") n++; layers.forEach((L) => el("rect", { x: x0 + i * 6 * c + x * c, y: y * c, width: n * c, height: c }, L)); x += n - 1; } });
    };
    return { g, set(v, f) { v = String(v); if (v === cur && (f || col) === col) return; cur = v; col = f || col; paint(); } };
  };
  const star = (p, r, fill) => { const a = r * 0.24; return el("path", { d: `M0 ${-r} Q${a} ${-a} ${r} 0 Q${a} ${a} 0 ${r} Q${-a} ${a} ${-r} 0 Q${-a} ${-a} 0 ${-r} Z`, fill, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, p); };
  // star sparks in yellow, aqua and lilac; k runs 0 to 1, gone at both ends
  const burst = (p, n = 9) => {
    const g = el("g", { "pointer-events": "none" }, p), a = Array.from({ length: n }, (_, i) => star(g, 7 + (i % 3) * 3, [YEL, AQUA, LIL][i % 3]));
    return (k, cx, cy, R) => a.forEach((s, i) => {
      if (k <= 0 || k >= 0.92) { show(s, 0); return; }
      const ang = (i / n) * 6.283 + 0.5, r = R * (0.3 + 0.7 * oc(k)) * (0.75 + ((i * 37) % 10) / 20);
      show(s, 1); tf(s, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r * 0.85, Math.sin(Math.PI * Math.pow(k, 0.7)) * 1.1, k * 160 + i * 30);
    });
  };
  // a star that stays: pops in, then twinkles slowly
  const twinkle = (p, x, y, r, fill, at, ph) => { const s = star(p, r, fill); return (t, now) => { const k = ob(seg(t, at, at + 0.4)); tf(s, x, y, Math.max(0, k) * (1 + 0.1 * Math.sin(now * 2.2 + ph)), Math.sin(now * 1.1 + ph) * 10); }; };
  const blink = (now, per = 1.1) => ((now % per) + per) % per < per * 0.62;
  const card = (p, x, y, w, h, rx, fill, a = {}) => { el("rect", { x: x + (a.off || 7), y: y + (a.off || 7), width: w, height: h, rx, fill: a.shadow || LIL }, p); return el("rect", { x, y, width: w, height: h, rx, fill, stroke: a.stroke || INK, "stroke-width": a.sw || 3 }, p); };
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: AQUA, "stroke-width": 3.5, class: "mg-ring" }, p);

  const SC = {};

  /* ---- 1. two player panels: a weighted meter and a simple average meter ---- */
  SC.weights = {
    dur: 12.5, still: 8,
    build(svg, api) {
      const root = stage(svg), drift = dust(root, 600, [[14, 12], [392, 8], [772, 250], [10, 330], [60, 520], [726, 560], [236, 548], [560, 562], [118, 478], [700, 470]]);
      const PW = 352, PH = 410, PY = 34, PX = [36, 412], FLOOR = 344;
      const DEF = [
        { tag: "1P", name: "METACRITIC", col: YEL, label: "WEIGHTED",
          tok: [[38, 34, YEL], [106, 28, BLUE], [72, 22, LIL], [126, 16, SKY], [20, 14, MINT], [101, 12, AQUA], [46, 12, YEL]], rest: [310, 316, 266, 274, 264, 246, 240], gap: 0.42 },
        { tag: "2P", name: "OPENCRITIC", col: SKY, label: "SIMPLE AVERAGE",
          tok: [[21, 18, SKY], [57, 18, SKY], [93, 18, SKY], [129, 18, SKY], [39, 18, SKY], [75, 18, SKY], [111, 18, SKY], [57, 18, SKY], [93, 18, SKY]], rest: [326, 326, 326, 326, 295, 295, 295, 264, 264], gap: 0.33 },
      ];
      let solo = -1, soloEnd = -1;
      const panels = DEF.map((d, pi) => {
        const outer = el("g", {}, root), g = el("g", { class: "mg-lift" }, outer);
        el("rect", { x: 9, y: 9, width: PW, height: PH, rx: 22, fill: LIL }, g);
        el("rect", { width: PW, height: PH, rx: 22, fill: "#fff" }, g);
        el("path", { d: `M0 64 V22 Q0 0 22 0 H${PW - 22} Q${PW} 0 ${PW} 22 V64 Z`, fill: SOFT }, g);
        el("path", { d: `M0 64 H${PW}`, stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { width: PW, height: PH, rx: 22, fill: "none", stroke: INK, "stroke-width": 3 }, g);
        ring(g, -7, -7, PW + 14, PH + 14, 28);
        const chip = el("g", {}, g);
        el("rect", { x: -27, y: -18, width: 54, height: 36, rx: 10, fill: d.col, stroke: INK, "stroke-width": 2.5 }, chip);
        mono(chip, 0, 7, d.tag, { "text-anchor": "middle", "font-size": 20 });
        const name = mono(g, 86, 40, d.name, { "font-size": 22 });
        // the meter: an open hopper, a gauge strip and a pixel read out
        const meter = el("g", {}, g);
        el("path", { d: `M186 ${FLOOR} H334`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, meter);
        el("path", { d: `M30 118 V${FLOOR - 12} Q30 ${FLOOR} 42 ${FLOOR} H168 Q180 ${FLOOR} 180 ${FLOOR - 12} V118`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, meter);
        el("path", { d: "M20 118 H30 M180 118 H190", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, meter);
        el("rect", { x: 200, y: 118, width: 18, height: 226, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, meter);
        const fill = el("rect", { x: 204, y: 340, width: 10, height: 0, rx: 5, fill: d.col }, meter);
        [0, 1, 2, 3, 4].forEach((i) => el("path", { d: `M222 ${340 - i * 54.5} h${i % 2 ? 5 : 9}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, meter));
        const lab = el("g", {}, g);
        el("rect", { x: -76, y: -15, width: 152, height: 30, rx: 15, fill: d.col, stroke: INK, "stroke-width": 2.5 }, lab);
        mono(lab, 0, 5.5, d.label, { "text-anchor": "middle" });
        const toks = d.tok.map(([x, r, c], i) => {
          const n = el("g", {}, g);
          el("circle", { r, fill: c, stroke: INK, "stroke-width": 2.5 }, n);
          el("path", { d: `M${-r * 0.55} ${-r * 0.2} A${r * 0.6} ${r * 0.6} 0 0 1 ${-r * 0.1} ${-r * 0.58}`, stroke: "#fff", "stroke-width": Math.max(2, r * 0.14), fill: "none", "stroke-linecap": "round" }, n);
          const a = 1.9 + i * d.gap;
          return { n, x: 30 + x, r, a, land: a + 0.6, y0: 70 + r + 6, y1: d.rest[i] };
        });
        const wsum = toks.reduce((s, k) => s + k.r * k.r, 0);
        const numG = el("g", {}, g), num = pix(numG, 8, YEL, { anchor: "mid" });
        const sparks = burst(g);
        let extra = null;
        if (pi === 0) {
          extra = el("g", {}, g);
          el("rect", { x: -53, y: -27, width: 112, height: 60, rx: 10, fill: NAVY, opacity: 0.18 }, extra);
          el("rect", { x: -56, y: -30, width: 112, height: 60, rx: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, extra);
          mono(extra, 0, -5, "WEIGHTS:", { "text-anchor": "middle" }); mono(extra, 0, 16, "CLASSIFIED", { "text-anchor": "middle" });
        } else {
          extra = el("g", {}, g);
          el("rect", { x: -52, y: -16, width: 104, height: 32, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 5" }, extra);
          mono(extra, 0, 5, "UNSCORED", { "text-anchor": "middle", "font-size": 14 });
        }
        button(outer, `${d.tag} ${d.name}: replay the tokens into the ${d.label} meter`, () => { solo = pi; soloEnd = api.now() + SC.weights.dur - 1.8; api.seek(1.75); });
        return { outer, chip, name, meter, lab, fill, toks, wsum, num, numG, sparks, extra, d };
      });
      const banner = el("g", {}, root);
      el("rect", { x: -193, y: -19, width: 400, height: 52, rx: 26, fill: LIL }, banner);
      el("rect", { x: -200, y: -26, width: 400, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, banner);
      txt(banner, 0, 9, "Both meters stop at 99", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
      const bsp = burst(root, 8), tw = [twinkle(root, 162, 498, 11, AQUA, 6.9, 0), twinkle(root, 640, 492, 13, LIL, 7.0, 2), twinkle(root, 668, 520, 8, YEL, 7.1, 4)];
      const prompt = mono(root, 400, 566, "TAP A PANEL", { "text-anchor": "middle", "font-size": 15, fill: MUTE, "letter-spacing": 2 });
      return (t, now) => {
        const on = now < soloEnd, tg = on ? SC.weights.still : t;
        drift(now);
        show(root, 1 - seg(t, SC.weights.dur - 0.35, SC.weights.dur));
        panels.forEach((p, pi) => {
          const tt = on && pi !== solo ? SC.weights.still : t, dir = pi ? 1 : -1;
          const inn = oc(seg(tg, 0.05, 0.5)), split = ob(seg(tg, 0.75, 1.3));
          tf(p.outer, PX[pi] - dir * 12 * (1 - split), PY + 26 * (1 - inn)); show(p.outer, seg(tg, 0.05, 0.3));
          tf(p.chip, 45, 32, Math.max(0, ob(seg(tg, 1.2 + pi * 0.1, 1.5 + pi * 0.1))));
          const nk = oc(seg(tg, 1.3 + pi * 0.1, 1.65 + pi * 0.1)); show(p.name, nk); p.name.setAttribute("transform", `translate(${-14 * (1 - nk)} 0)`);
          const mk = oc(seg(tg, 1.4 + pi * 0.08, 1.8 + pi * 0.08)); show(p.meter, mk); p.meter.setAttribute("transform", `translate(0 ${16 * (1 - mk)})`);
          tf(p.lab, 105, 372, Math.max(0, ob(seg(tg, 1.55 + pi * 0.08, 1.9 + pi * 0.08))));
          let w = 0;
          p.toks.forEach((k) => {
            const pop = Math.max(0, ob(seg(tt, k.a, k.a + 0.22))), f = seg(tt, k.a + 0.26, k.land), q = seg(tt, k.land, k.land + 0.4);
            const sq = Math.sin(Math.PI * q) * (1 - q) * 0.34, y = k.y0 + (k.y1 - k.y0) * f * f;
            tf2(k.n, k.x, y + k.r * sq, pop * (1 + sq * 0.7), pop * (1 - sq)); show(k.n, tt >= k.a ? 1 : 0);
            w += k.r * k.r * oc(seg(tt, k.land, k.land + 0.35));
          });
          const v = Math.round((99 * w) / p.wsum), last = p.toks[p.toks.length - 1].land + 0.35;
          p.num.set(String(v).padStart(2, "0"));
          const pk = seg(tt, last, last + 0.5);
          tf(p.numG, 284, 132 - 6 * bump(pk), 1 + 0.2 * bump(pk)); show(p.numG, mk);
          p.fill.setAttribute("height", 218 * v / 100); p.fill.setAttribute("y", 340 - 218 * v / 100);
          p.sparks(seg(tt, last, last + 0.9), 284, 160, 74);
          if (pi === 0) {
            const k = Math.max(0, ob(seg(tt, 3.1, 3.45))), fl = tt > 3.45 && tt < 5.5 && Math.floor((tt - 3.45) / 0.17) % 2 === 1;
            tf(p.extra, 288, 270, k, -6 + 10 * (1 - k)); show(p.extra, tt < 3.1 ? 0 : fl ? 0.3 : 1);
          } else {
            const a = seg(tt, 3.75, 4.15), b = seg(tt, 4.15, 4.95), c = seg(tt, 4.95, 5.3);
            let x = 138, y = 78 + 28 * a * a, r = -10 * a;
            if (b > 0) { const e = oc(b) * 0.55 + b * 0.45; x = 138 + 144 * e; y = 106 + 222 * b - 300 * b * (1 - b); r = -10 + 370 * b; }
            if (c > 0) y -= 12 * Math.sin(Math.PI * c) * (1 - c);
            tf(p.extra, x, y, 1, r); show(p.extra, seg(tt, 3.75, 3.85));
          }
        });
        const bk = seg(tg, 6.3, 6.75);
        tf(banner, 400, 498 + 24 * (1 - oc(bk)), 0.6 + 0.4 * Math.max(0, ob(bk))); show(banner, seg(tg, 6.3, 6.45));
        bsp(seg(tg, 6.6, 7.5), 400, 498, 250);
        tw.forEach((f) => f(tg, now));
        show(prompt, tg < 7.2 ? 0 : blink(now) ? 1 : 0.18);
      };
    },
  };

  /* ---- 2. a square runner collects three power ups and hops three blocks ---- */
  SC.powerups = {
    dur: 13.5, still: 9,
    build(svg, api) {
      const root = stage(svg), drift = dust(root, 600, [[60, 128], [300, 196], [560, 118], [716, 214], [96, 392], [330, 372], [560, 400], [748, 380], [50, 556], [400, 566], [716, 560], [20, 240]]);
      const G1 = 300, G2 = 500, R = 76, HOP = 92;
      const ITEMS = [
        { x: 215, g: G1, up: 1, label: "WORLD DETAIL", by: "IGN", col: YEL },
        { x: 415, g: G1, up: 1, label: "FREEDOM", by: "TheSixthAxis", col: SKY },
        { x: 615, g: G1, up: 1, label: "PRESENTATION", by: "Push Square", col: MINT },
        { x: 205, g: G2, up: 0, label: "30 FPS TARGET", by: "Rockstar Newswire", col: LIL },
        { x: 405, g: G2, up: 0, label: "SLOW STRETCHES", by: "ScreenHub", col: BLUE },
        { x: 605, g: G2, up: 0, label: "FAMILIAR CORE", by: "SECTOR.sk", col: LIL },
      ];
      const ease1 = (u) => u - (0.6 * Math.sin(6.2832 * u)) / 6.2832;
      const x1 = (t) => 70 + 800 * ease1(seg(t, 1.5, 4.3));
      const x2 = (t) => -60 + 776 * (1 - Math.pow(1 - seg(t, 4.5, 7.9), 1.7));
      const find = (fn, v, a, b) => { for (let t = a; t < b; t += 0.01) if (fn(t) >= v) return t; return b; };
      ITEMS.forEach((it) => { it.at = it.up ? find(x1, it.x - 30, 1.5, 4.3) : find(x2, it.x + R, 4.5, 7.9); });
      // HUD
      const CELLS = [{ x: 40, w: 206, n: 85, label: "POSITIVE", col: MINT }, { x: 262, w: 117, n: 25, label: "MIXED", col: YEL }, { x: 395, w: 146, n: 25, label: "NEGATIVE", col: LIL }].map((c, i) => {
        const g = el("g", {}, root);
        card(g, 0, 0, c.w, 56, 14, "#fff", { off: 5, sw: 2.5 });
        const ng = el("g", { transform: `translate(${16 + c.n} 10.5)` }, g), num = pix(ng, 5, c.col, { anchor: "end", sd: 0, ow: 1.6 });
        mono(g, 16 + c.n + 12, 34.5, c.label, { "font-size": 16 });
        return { g, num, c };
      });
      const p1 = mono(root, 760, 52, "TAP A POWER UP", { "text-anchor": "end", "font-size": 14, fill: MUTE, "letter-spacing": 1 }), p2 = mono(root, 760, 73, "OR A BLOCK", { "text-anchor": "end", "font-size": 14, fill: MUTE, "letter-spacing": 1 });
      // lanes, with ground ticks that scroll under the runner
      const lanes = [G1, G2].map((y) => {
        const g = el("g", {}, root);
        el("rect", { x: 24, y, width: 752, height: 16, rx: 8, fill: SOFT }, g);
        const ticks = el("path", { d: `M40 ${y + 9} H760`, stroke: LIL, "stroke-width": 3, "stroke-dasharray": "12 22", "stroke-linecap": "round" }, g);
        const line = el("path", { d: `M24 ${y} H776`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        return { g, ticks, line, y };
      });
      const clouds = [[90, 138], [372, 116], [640, 150], [150, 384], [470, 398], [730, 374]].map(([x, y], i) => { const g = el("g", { fill: LIL, opacity: 0.2 }, root); el("rect", { y: 12, width: 64 + (i % 2) * 16, height: 14 }, g); el("rect", { x: 14, width: 30 + (i % 2) * 10, height: 12 }, g); return { g, x, y }; });
      let pinned = -1, pinAt = 0;
      const items = ITEMS.map((it, i) => {
        const outer = el("g", {}, root), g = el("g", { class: "mg-lift" }, outer), top = it.up ? -102 : -58;
        el("rect", { x: -80, y: top, width: 160, height: 56 - top, fill: "#fff", "fill-opacity": 0 }, g);
        ring(g, -80, top, 160, 56 - top, 16);
        const body = el("g", {}, g), halo = el("circle", { r: 22, fill: "none", stroke: it.col, "stroke-width": 4, opacity: 0 }, g);
        let badge = null;
        if (it.up) {
          el("circle", { cx: 4, cy: 4, r: 22, fill: LIL }, body);
          el("circle", { r: 22, fill: it.col, stroke: INK, "stroke-width": 3 }, body);
          const s = star(body, 13, "#fff"); s.setAttribute("stroke-width", 2.5);
          badge = el("g", {}, g);
          el("circle", { r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, badge);
          el("path", { d: "M-5 0 L-1.5 3.8 L5.5 -4", stroke: INK, "stroke-width": 2.8, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, badge);
        } else {
          el("rect", { x: -18, y: -39, width: 46, height: 44, rx: 7, fill: NAVY, opacity: 0.16 }, body);
          el("rect", { x: -23, y: -44, width: 46, height: 44, rx: 7, fill: it.col, stroke: INK, "stroke-width": 3 }, body);
          el("path", { d: "M-15 -35 H-3", stroke: "#fff", "stroke-width": 3.5, "stroke-linecap": "round" }, body);
          el("path", { d: "M-23 -22 H23 M0 -22 V0 M-10 -44 V-22", stroke: INK, "stroke-width": 2, opacity: 0.55 }, body);
        }
        mono(g, 0, 42, it.label, { "text-anchor": "middle", "font-size": 17 });
        button(outer, `${it.label}: ${it.by}`, () => { pinned = i; pinAt = api.now(); api.poke(); });
        return { outer, body, halo, badge, it };
      });
      // the runner: a square with two dot eyes, ghosts trail behind it
      const ghosts = [0, 1, 2].map((i) => el("rect", { x: -17 + i * 2, y: -34 + i * 2, width: 34 - i * 4, height: 34 - i * 4, rx: 6, fill: LIL, "pointer-events": "none" }, root));
      const shade = el("ellipse", { rx: 22, ry: 5, fill: NAVY, opacity: 0.18, "pointer-events": "none" }, root);
      const run = el("g", { "pointer-events": "none" }, root);
      el("rect", { x: -20, y: -40, width: 40, height: 40, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, run);
      el("path", { d: "M-12 -32 H-3", stroke: "#fff", "stroke-width": 3.5, "stroke-linecap": "round" }, run);
      el("circle", { cx: 3, cy: -24, r: 2.8, fill: INK }, run); el("circle", { cx: 12.5, cy: -24, r: 2.8, fill: INK }, run);
      const pose = (t) => {
        if (t < 4.4) {
          const d = seg(t, 1.0, 1.4), x = x1(t), moving = t > 1.5 && t < 4.3;
          return { x, g: G1, y: -150 * (1 - d * d) - (moving ? Math.abs(Math.sin((x - 70) * 0.085)) * 7 : 0), sq: bump(seg(t, 1.4, 1.75)) * 0.2, lean: moving ? 7 : 0, vis: t >= 1.0 };
        }
        const x = x2(t); let y = 0, sq = 0;
        ITEMS.forEach((it) => { if (it.up) return; const dd = (x - it.x) / R; if (Math.abs(dd) < 1) y = -HOP * (1 - dd * dd); else if (dd < -1 && dd > -1.25) sq = Math.max(sq, 0.16 * Math.sin(Math.PI * (dd + 1.25) / 0.25)); sq = Math.max(sq, bump(seg(t, it.at, it.at + 0.3)) * 0.16); });
        const fin = seg(t, 8.0, 8.5); y -= 40 * Math.sin(Math.PI * fin); sq = Math.max(sq, bump(seg(t, 8.5, 8.8)) * 0.16);
        return { x, g: G2, y, sq, lean: y < -4 ? -4 : t < 7.6 ? 6 : 0, vis: t >= 4.5 };
      };
      const sparks = burst(root), cs = ITEMS.filter((i) => i.up).map(() => burst(root, 6));
      // outlet bubble
      const bub = el("g", { "pointer-events": "none", opacity: 0 }, root), bsh = el("rect", { height: 38, rx: 19, fill: LIL }, bub), btip = el("path", { fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, bub), brc = el("rect", { height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 2.5 }, bub), bcov = el("path", { stroke: YEL, "stroke-width": 4 }, bub), btx = mono(bub, 0, 0, "", { "text-anchor": "middle", "font-size": 16 });
      return (t, now) => {
        drift(now);
        show(root, 1 - seg(t, SC.powerups.dur - 0.35, SC.powerups.dur));
        const P = pose(t), trav = t < 4.4 ? x1(t) : 900 + x2(t);
        lanes.forEach((l, i) => { const k = oc(seg(t, 0.25 + i * 0.12, 0.85 + i * 0.12)); l.line.setAttribute("d", `M24 ${l.y} H${24 + 752 * k}`); show(l.g, seg(t, 0.25 + i * 0.12, 0.4 + i * 0.12)); l.ticks.setAttribute("stroke-dashoffset", trav * 0.45); });
        clouds.forEach((c, i) => { c.g.setAttribute("transform", `translate(${(((c.x - trav * (0.1 + (i % 3) * 0.04)) % 980) + 980) % 980 - 90} ${c.y})`); show(c.g, 0.2 * seg(t, 0.3 + i * 0.08, 0.7 + i * 0.08)); });
        // HUD counters
        let pos = 0; items.forEach((m) => { if (m.it.up) pos += 50 * oc(seg(t, m.it.at, m.it.at + 0.55)); });
        const bl = items.filter((m) => !m.it.up).map((m) => m.it.at);
        CELLS.forEach((c, i) => {
          const k = Math.max(0, ob(seg(t, 0.1 + i * 0.1, 0.5 + i * 0.1)));
          let sh = 0, pu = 0;
          if (i === 0) items.forEach((m) => { if (m.it.up) pu = Math.max(pu, bump(seg(t, m.it.at, m.it.at + 0.4))); });
          else [i === 1 ? bl[0] : bl[1], bl[2], 8.5].forEach((a) => { const q = seg(t, a, a + 0.55); if (q > 0 && q < 1) sh = Math.sin(q * 18.85) * 5 * (1 - q); });
          tf(c.g, c.c.x + sh, 30 - 40 * (1 - k) - 5 * pu, 1); show(c.g, seg(t, 0.1 + i * 0.1, 0.22 + i * 0.1));
          c.num.set(i === 0 ? Math.round(pos) : 0);
        });
        items.forEach((m, i) => {
          const it = m.it, k = Math.max(0, ob(seg(t, 0.5 + i * 0.09, 0.85 + i * 0.09)));
          tf(m.outer, it.x, it.g, k); show(m.outer, t < 0.5 + i * 0.09 ? 0 : 1);
          if (it.up) {
            const c = seg(t, it.at, it.at + 0.45), got = t >= it.at, rise = 46 * ob(c), bob = got ? Math.sin(now * 2 + i) * 2 : Math.sin(now * 3 + i * 2) * 4;
            tf2(m.body, 0, -24 - rise + bob, 1 + 0.25 * bump(c), 1 + 0.25 * bump(c), got ? 360 * oc(c) : 0);
            tf(m.badge, 20, -24 - rise - 18 + bob, Math.max(0, ob(seg(t, it.at + 0.3, it.at + 0.6))));
            const h = seg(t, it.at, it.at + 0.5); m.halo.setAttribute("cy", -24); m.halo.setAttribute("r", 22 + 34 * oc(h)); show(m.halo, h > 0 && h < 1 ? 1 - h : 0);
            cs[i](seg(t, it.at, it.at + 0.7), it.x, it.g - 60, 58);
          } else {
            const q = seg(t, it.at, it.at + 0.4); tf2(m.body, 0, 0, 1 + 0.06 * bump(q), 1 - 0.1 * bump(q));
          }
        });
        tf2(run, P.x, P.g + P.y, 1 + P.sq * 0.8, 1 - P.sq, P.lean); show(run, P.vis ? 1 : 0);
        tf2(shade, P.x, P.g + 6, cl(1 + P.y / 220, 0.4, 1), 1); show(shade, P.vis && P.y > -140 ? 0.18 : 0);
        ghosts.forEach((gh, i) => { const Q = pose(t - 0.05 * (i + 1)), far = Math.abs(Q.x - P.x) + Math.abs(Q.y - P.y); tf(gh, Q.x - 2, Q.g + Q.y, 1, Q.lean); show(gh, Q.vis && P.vis && Q.g === P.g && far > 3 ? 0.42 - i * 0.12 : 0); });
        sparks(seg(t, 8.2, 9), 716, G2 - 40, 78);
        const pr = t > 8.8; show(p1, pr ? (blink(now) ? 1 : 0.18) : seg(t, 0.6, 0.9) * 0.18); show(p2, pr ? (blink(now) ? 1 : 0.18) : seg(t, 0.6, 0.9) * 0.18);
        if (pinned >= 0) {
          const it = ITEMS[pinned], w = it.by.length * 9.7 + 40, cx = cl(it.x, 24 + w / 2, 776 - w / 2), ty = it.up ? 184 : 440, k = Math.max(0, ob(seg(now - pinAt, 0, 0.3)));
          bsh.setAttribute("x", -w / 2 + 5); bsh.setAttribute("y", -53); bsh.setAttribute("width", w); brc.setAttribute("x", -w / 2); brc.setAttribute("y", -58); brc.setAttribute("width", w);
          const px = it.x - cx; btip.setAttribute("d", `M${px - 10} -21 L${px} -6 L${px + 10} -21 Z`); bcov.setAttribute("d", `M${px - 8} -20.3 H${px + 8}`);
          btx.textContent = it.by; btx.setAttribute("y", -33.5);
          tf(bub, cx, ty + 6 * (1 - k), k); show(bub, 1);
        } else show(bub, 0);
      };
    },
  };

  /* ---- 3. the high scores table, filled from the bottom row up ---- */
  SC.hiscore = {
    dur: 12.5, still: 8,
    build(svg, api) {
      const root = stage(svg), drift = dust(root, 600, [[24, 56], [38, 300], [20, 520], [762, 120], [768, 380], [756, 560], [44, 170], [770, 250]]);
      const ROWS = [
        { name: "GTA VI", mc: 99, oc: 99, n: 150, col: YEL, at: 3.3 },
        { name: "OCARINA", mc: 99, oc: null, n: 22, col: SKY, at: 1.9 },
        { name: "RDR2", mc: 97, oc: 95, n: 99, col: MINT, at: 1.4 },
        { name: "GTA V", mc: 97, oc: 92, n: 58, col: LIL, at: 0.9 },
      ];
      const scr = el("g", {}, root), id = `mgp${++uid}`;
      const pat = el("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, el("defs", {}, svg));
      el("rect", { width: 6, height: 1.5, fill: NAVY, opacity: 0.07 }, pat);
      el("rect", { x: 79, y: 37, width: 660, height: 544, rx: 26, fill: LIL }, scr);
      el("rect", { x: 70, y: 28, width: 660, height: 544, rx: 26, fill: SOFT }, scr);
      el("rect", { x: 70, y: 28, width: 660, height: 544, rx: 26, fill: `url(#${id})`, stroke: NAVY, "stroke-width": 3 }, scr);
      const title = txt(scr, 400, 84, "HIGH SCORES", { "text-anchor": "middle", "font-size": 40, "font-weight": 700, fill: NAVY, "letter-spacing": 3 });
      const tw = [twinkle(scr, 232, 74, 13, YEL, 0.5, 0), twinkle(scr, 204, 96, 8, AQUA, 0.6, 2), twinkle(scr, 568, 74, 13, LIL, 0.56, 3), twinkle(scr, 598, 94, 8, YEL, 0.66, 5)];
      const heads = el("g", {}, scr);
      mono(heads, 116, 119, "RANK", { "font-size": 13, fill: NAVY, "letter-spacing": 1.5 }); mono(heads, 684, 119, "SCORE", { "text-anchor": "end", "font-size": 13, fill: NAVY, "letter-spacing": 1.5 });
      const slot = el("rect", { x: 100, y: 136, width: 600, height: 86, rx: 16, fill: "none", stroke: NAVY, "stroke-width": 2.5, "stroke-dasharray": "9 9" }, scr);
      const flip = ROWS.map(() => ({ on: false, at: -9 }));
      const rows = ROWS.map((r, i) => {
        const outer = el("g", {}, scr), lift = el("g", { class: "mg-lift" }, outer), g = el("g", {}, lift);
        el("rect", { x: 6, y: 6, width: 600, height: 86, rx: 16, fill: LIL }, g);
        const bg = el("rect", { width: 600, height: 86, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const rk = el("rect", { x: 16, y: 21, width: 44, height: 44, rx: 11, fill: r.col, stroke: INK, "stroke-width": 2.5 }, g);
        pix(el("g", { transform: "translate(38 29)" }, g), 4, INK, { anchor: "mid", sd: 0, ow: 0 }).set(i + 1);
        mono(g, 78, 43, r.name, { "font-size": 28 });
        const cnt = mono(g, 78, 68, "", { "font-size": 15, "font-weight": 500, fill: MUTE });
        const chip = el("g", {}, g), cbg = el("rect", { x: 328, y: 29, width: 120, height: 28, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2 }, chip), ctx = mono(chip, 388, 48, "METACRITIC", { "text-anchor": "middle", "font-size": 13 });
        const sg = el("g", {}, g), sc = pix(sg, 7, r.col, { anchor: "mid" });
        const rg = ring(lift, -7, -7, 614, 100, 22);
        if (r.oc != null) button(outer, `${r.name}: flip between the Metacritic score ${r.mc} and the OpenCritic score ${r.oc}`, () => { flip[i].on = !flip[i].on; flip[i].at = api.now(); if (api.t() > SC.hiscore.still) api.seek(SC.hiscore.still); else api.poke(); });
        else rg.remove();
        return { outer, g, bg, rk, cnt, cbg, ctx, sc, sg, r };
      });
      const sparks = burst(scr, 11), sp2 = burst(scr, 6);
      const prompt = mono(scr, 400, 552, "TAP GTA V, RDR2 OR GTA VI", { "text-anchor": "middle", "font-size": 14, fill: NAVY, "letter-spacing": 1.5 });
      const HIT = 3.66;
      return (t, now) => {
        drift(now);
        show(root, 1 - seg(t, SC.hiscore.dur - 0.35, SC.hiscore.dur));
        const k0 = oc(seg(t, 0, 0.45)), shake = seg(t, HIT, HIT + 0.5), sy = shake > 0 && shake < 1 ? Math.sin(shake * 15.7) * 7 * (1 - shake) : 0;
        scr.setAttribute("transform", `translate(0 ${24 * (1 - k0) + sy * 0.35})`); show(scr, seg(t, 0, 0.3));
        show(title, t < 0.9 ? (Math.floor(t / 0.15) % 2 ? 0.2 : 1) : 1);
        tw.forEach((f) => f(t, now));
        show(heads, oc(seg(t, 0.5, 0.8)));
        show(slot, t < HIT ? oc(seg(t, 0.6, 0.9)) * (0.45 + 0.55 * (blink(t, 0.6) ? 1 : 0.4)) : 0);
        rows.forEach((m, i) => {
          const r = m.r, y = 136 + i * 98, f = flip[i], fk = io(seg(now - f.at, 0, 0.5)), showOc = f.on ? fk > 0.5 : fk <= 0.5 && f.at > 0;
          let dx = 0, dy = 0, sx = 1, syy = 1, op = 1;
          if (i === 0) {
            const d = seg(t, r.at, HIT), q = seg(t, HIT, HIT + 0.45);
            dy = -190 * (1 - d * d * d) - 0; op = seg(t, r.at, r.at + 0.1);
            const s = Math.sin(Math.PI * q) * (1 - q) * 0.3; syy = 1 - s; sx = 1 + s * 0.25; dy += 86 * s;
          } else {
            const k = seg(t, r.at, r.at + 0.42); dx = 90 * (1 - ob(k)); op = seg(t, r.at, r.at + 0.14); dy = sy * (1.3 - i * 0.25);
          }
          m.outer.setAttribute("transform", `translate(${100 + dx - 300 * (sx - 1)} ${y + dy}) scale(${sx} ${syy})`); show(m.outer, op);
          const fs = fk > 0 && fk < 1 ? Math.max(0.04, Math.abs(Math.cos(Math.PI * fk))) : 1;
          m.g.setAttribute("transform", `translate(0 ${43 * (1 - fs)}) scale(1 ${fs})`);
          const land = i === 0 ? HIT + 0.05 : r.at + 0.1, ck = seg(t, land, land + (i === 0 ? 0.95 : 0.5)), val = showOc ? r.oc : Math.round(r.mc * oc(ck));
          const done = i === 0 ? land + 0.95 : land + 0.5, pk = bump(seg(t, done, done + 0.5));
          let fill = "#fff", scol = r.col;
          if (i === 0) { const b = t >= done && (t > done + 2.6 || Math.floor((t - done) / 0.22) % 2 === 0); fill = b ? YEL : "#fff"; scol = b ? "#fff" : YEL; }
          m.bg.setAttribute("fill", fill); m.rk.setAttribute("fill", i === 0 && fill === YEL ? "#fff" : r.col);
          m.sc.set(String(val).padStart(2, "0"), scol);
          tf(m.sg, 535, 18.5 + 24.5 - 24.5 * (1 + 0.22 * pk), 1 + 0.22 * pk);
          m.cbg.setAttribute("fill", showOc ? SKY : i === 0 && fill === YEL ? "#fff" : SOFT); m.ctx.textContent = showOc ? "OPENCRITIC" : "METACRITIC";
          const ca = i === 0 ? 5.3 : r.at + 0.35, cn = i === 0 ? Math.round(r.n * oc(seg(t, ca, ca + 0.9))) : r.n;
          m.cnt.textContent = `${cn} REVIEWS`; show(m.cnt, showOc ? 0 : oc(seg(t, ca, ca + 0.25)));
          m.cnt.setAttribute("fill", i === 0 && fill === YEL ? INK : MUTE);
        });
        sparks(seg(t, 4.66, 5.6), 635, 179, 96); sp2(seg(t, 6.2, 6.9), 150, 200, 54);
        show(prompt, t < 7 ? 0 : blink(now) ? 1 : 0.2);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 9.5, still: 5,
    build(svg) {
      const root = stage(svg), drift = dust(root, 540, [[372, 28], [604, 96], [36, 470], [300, 468], [560, 492], [912, 486], [598, 318], [24, 150], [470, 120], [760, 490]]);
      const pill = el("g", {}, root);
      el("rect", { x: -52, y: -20, width: 104, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 7, "News", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const chk = mono(root, 896, 71, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      const l1 = txt(root, 62, 222, "GTA 6 review", { "font-size": 80, "font-weight": 700, "letter-spacing": -1.5 }), l2 = txt(root, 62, 306, "scores", { "font-size": 80, "font-weight": 700, "letter-spacing": -1.5 });
      const ul = el("path", { d: "M68 338 H68", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, root);
      const sub = txt(root, 64, 400, "Metacritic, OpenCritic and what critics said", { "font-size": 24, "font-weight": 500, fill: MUTE });
      const pan = el("g", {}, root);
      el("rect", { x: -113, y: -147, width: 244, height: 312, rx: 22, fill: LIL }, pan);
      el("rect", { x: -122, y: -156, width: 244, height: 312, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, pan);
      mono(pan, 0, -108, "HIGH SCORES", { "text-anchor": "middle", "font-size": 22, "letter-spacing": 1 });
      el("path", { d: "M-92 -88 H92", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, pan);
      const ng = el("g", {}, pan), num = pix(ng, 13, YEL, { anchor: "mid" });
      const tag = el("g", {}, pan);
      el("rect", { x: -94, y: -15, width: 196, height: 40, rx: 20, fill: NAVY, opacity: 0.16 }, tag);
      el("rect", { x: -98, y: -20, width: 196, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 0, 6.5, "NEW HIGH SCORE", { "text-anchor": "middle", "font-size": 18 });
      const sparks = burst(root, 11), tw = [twinkle(root, 634, 150, 15, YEL, 3.2, 0), twinkle(root, 912, 300, 10, AQUA, 3.3, 2), twinkle(root, 622, 196, 8, LIL, 3.4, 4), twinkle(root, 902, 132, 9, LIL, 3.5, 1)];
      return (t, now) => {
        drift(now);
        show(root, 1 - seg(t, SC.hero.dur - 0.35, SC.hero.dur));
        tf(pill, 116, 64, Math.max(0, ob(seg(t, 0.1, 0.45))));
        show(chk, oc(seg(t, 0.2, 0.6)));
        [l1, l2, sub].forEach((n, i) => { const a = [0.3, 0.42, 0.95][i], k = oc(seg(t, a, a + 0.5)); show(n, k); n.setAttribute("transform", `translate(0 ${26 * (1 - k)})`); });
        const u = io(seg(t, 0.8, 1.3)); ul.setAttribute("d", `M68 338 H${68 + 190 * u}`); show(ul, u > 0 ? 1 : 0);
        const pk = seg(t, 0.5, 0.95); tf(pan, 774, 288 + 30 * (1 - oc(pk)), 0.8 + 0.2 * Math.max(0, ob(pk))); show(pan, seg(t, 0.5, 0.65));
        const ck = seg(t, 1.1, 2.9), v = Math.round(99 * (1 - Math.pow(1 - ck, 2.4))), b = bump(seg(t, 2.9, 3.4));
        num.set(String(v).padStart(2, "0"));
        tf(ng, 0, -52 + 45.5 - 45.5 * (1 + 0.16 * b) - 4 * b, 1 + 0.16 * b);
        sparks(seg(t, 2.9, 3.8), 774, 272, 150);
        const tk = seg(t, 3.15, 3.5), fl = t > 3.5 && t < 4.6 ? Math.floor((t - 3.5) / 0.18) % 2 === 1 : t >= 4.6 && !blink(now, 1.4);
        tf(tag, -2, 110, Math.max(0, ob(tk)), -3 * (1 - tk)); show(tag, t < 3.15 ? 0 : fl ? 0.25 : 1);
        tw.forEach((f) => f(t, now));
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
    const time = (now) => (held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur);
    const frame = () => { const now = clock(); draw(time(now), now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, t: () => time(clock()), seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
