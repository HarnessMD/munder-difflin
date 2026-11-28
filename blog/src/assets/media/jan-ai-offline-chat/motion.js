/* Bright coded scenes for "How to run a free AI chat offline on your laptop with Jan". Vanilla JS, no library.
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
  const ob = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bump = (x) => Math.sin(Math.PI * cl(x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const fade = (n, k, dx = 0, dy = 0) => { n.setAttribute("opacity", k); n.setAttribute("transform", `translate(${dx} ${dy})`); };
  const ink = (w = 3) => ({ stroke: INK, "stroke-width": w, "stroke-linejoin": "round" });
  const RING = { fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 8" };
  let uid = 0; // a counter for clip ids, so two scenes on one page never share one
  const clip = (svg, name, shape, a) => {
    const id = `mg-${name}-${++uid}`, d = svg.querySelector("defs") || svg.insertBefore(el("defs"), svg.firstChild);
    el(shape, a, el("clipPath", { id }, d));
    return `url(#${id})`;
  };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hintAt = (h, k) => { h.setAttribute("opacity", k); h.setAttribute("transform", `translate(0 ${10 * (1 - k)})`); };

  /* ---- a sandglass drawn around 0,0, 392 tall; returns a setter for the sand ---- */
  const BULB = "M-84 -174 C-84 -96 -12 -44 -10 0 C-12 44 -84 96 -84 174 H84 C84 96 12 44 10 0 C12 -44 84 -96 84 -174 Z";
  const sandglass = (svg, g, col) => {
    el("path", { d: BULB, fill: col }, g);
    const sand = el("g", { "clip-path": clip(svg, "bulb", "path", { d: BULB }) }, g);
    const top = el("rect", { x: -90, width: 180, fill: YEL }, sand);
    const dip = el("path", { fill: col }, sand);
    const lip = el("path", { fill: YEL }, sand);
    const bot = el("rect", { x: -90, width: 180, fill: YEL }, sand);
    const mound = el("path", { fill: YEL }, sand);
    const stream = el("path", { stroke: YEL, "stroke-width": 5, "stroke-linecap": "round", fill: "none" }, sand);
    el("path", { d: BULB, fill: "none", ...ink(3) }, g);
    for (const s of [1, -1]) { // point symmetric, so a half turn looks the same
      el("path", { d: `M${-60 * s} ${-152 * s} C${-58 * s} ${-118 * s} ${-42 * s} ${-92 * s} ${-28 * s} ${-74 * s}`, stroke: "#fff", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, g);
      el("rect", { x: s > 0 ? 88 : -98, y: -174, width: 10, height: 348, rx: 4, fill: col, ...ink(2.5) }, g);
      el("rect", { x: -104, y: s > 0 ? 174 : -196, width: 208, height: 22, rx: 8, fill: col, ...ink(3) }, g);
    }
    // top sand from tA to tB, bottom sand from bA down with a mound mh tall, lp: a bulge under the top sand, st: stream, dp: funnel dip
    return (tA, tB, bA, mh, lp, st, dp) => {
      top.setAttribute("y", tA); top.setAttribute("height", Math.max(0, tB - tA));
      dip.setAttribute("d", `M-40 ${tA - 0.5} Q0 ${tA + 2 * dp} 40 ${tA - 0.5} Z`);
      lip.setAttribute("d", `M-72 ${tB - 0.5} Q0 ${tB + 2 * lp} 72 ${tB - 0.5} Z`);
      bot.setAttribute("y", bA); bot.setAttribute("height", Math.max(0, 174 - bA));
      mound.setAttribute("d", `M-72 ${bA + 0.5} Q0 ${bA - 2 * mh} 72 ${bA + 0.5} Z`);
      stream.setAttribute("d", `M0 -8 V${bA - mh}`); stream.setAttribute("opacity", st);
    };
  };

  const SC = {};

  /* ---- 1. the sand runs past the three system needs ---- */
  SC.sandglass = {
    dur: 9, still: 9,
    build(svg, api) {
      const CX = 250, CY = 300, FLIP = 1.2, ROT = 2.15, RUN0 = 2.55, RUN1 = 7.3;
      const TAGS = ["8GB minimum", "16GB recommended", "10GB free space minimum"], TICK = [168, 222, 276], TY = [184, 262, 340];
      const hint = txt(svg, 756, 62, "tap the sandglass", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      const stand = el("g", {}, svg);
      el("rect", { x: 148, y: 522, width: 44, height: 20, rx: 6, fill: SOFT, ...ink(3) }, stand);
      el("rect", { x: 308, y: 522, width: 44, height: 20, rx: 6, fill: SOFT, ...ink(3) }, stand);
      el("rect", { x: 116, y: 496, width: 268, height: 32, rx: 12, fill: SOFT, ...ink(3) }, stand);
      const gl = el("g", {}, svg);
      el("rect", { x: -128, y: -226, width: 256, height: 452, rx: 32, ...RING }, gl);
      const sand = sandglass(svg, gl, SKY);
      const pr = (t) => { const s = seg(t, RUN0, RUN1); return (s + io(s)) / 2; };
      // the top sand surface sits at y 150 + 146p at rest; each tag lights when it passes that tag's dot
      const when = TICK.map((y) => { const f = (y - 150) / 146; let t = RUN0; while (t < RUN1 && pr(t) < f) t += 0.01; return t; });
      const tags = TAGS.map((s, i) => {
        const lead = el("path", { d: `M364 ${TICK[i]} L410 ${TY[i]}`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 8", "stroke-linecap": "round", fill: "none" }, svg);
        const dot = el("circle", { cx: 356, cy: TICK[i], r: 7, fill: "#fff", ...ink(2.5) }, svg);
        const g = el("g", {}, svg);
        const blue = el("rect", { y: -26, height: 52, rx: 16, fill: BLUE, ...ink(3) }, g);
        const mint = el("rect", { y: -26, height: 52, rx: 16, fill: MINT, ...ink(3), opacity: 0 }, g);
        const label = txt(g, 0, 8, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        const w = Math.max(150, label.getComputedTextLength() + 44);
        for (const r of [blue, mint]) { r.setAttribute("x", -w / 2); r.setAttribute("width", w); }
        return { lead, dot, g, mint, cx: 418 + w / 2 };
      });
      let relit = false, touched = false;
      button(gl, "Flip the sandglass and run the sand again", () => {
        touched = true;
        if (api.calm) return api.seek(RUN0);
        const p = api.pos();
        if (p < RUN0) { if (!relit) api.scrub(RUN0, 0.35); return; }
        relit = true;
        if (p < RUN1) api.scrub(RUN1, 0.6, FLIP); else api.seek(FLIP);
      });
      return (t) => {
        const e = (a, b) => (relit ? 1 : oc(seg(t, a, b)));
        fade(stand, e(0, 0.45), 0, 22 * (1 - e(0, 0.45)));
        const kg = relit ? 1 : ob(seg(t, 0.12, 0.7));
        const dy = relit ? -56 * oc(seg(t, FLIP, FLIP + 0.3)) + 56 * ob(seg(t, ROT, RUN0), 0.9) : 0;
        const ang = relit && t < ROT ? 180 * ob(seg(t, FLIP + 0.2, ROT), 1.1) : 0;
        tf(gl, CX, CY + dy, 0.86 + 0.14 * kg, ang); gl.setAttribute("opacity", relit ? 1 : cl(seg(t, 0.12, 0.3)));
        if (relit && t < ROT) sand(-174, -174, 74, 16, 0, 0, 0);
        else if (relit && t < RUN0) { const k = oc(seg(t, ROT, ROT + 0.34)); sand(lerp(-174, -150, k), lerp(-74, -4, k), 174, 0, 16 * (1 - k), 0, 0); }
        else { const p = pr(t); sand(-150 + 146 * p, -4, 174 - 100 * p, 16 * cl(p * 5), 0, cl(p * 30) * cl((1 - p) * 30), 9 * bump(p)); }
        tags.forEach((g, i) => {
          const kd = e(0.7 + 0.1 * i, 1.0 + 0.1 * i), k = e(0.85 + 0.1 * i, 1.35 + 0.1 * i);
          const lit = t < RUN0 ? (relit ? 1 - oc(seg(t, FLIP + 0.1, FLIP + 0.7)) : 0) : oc(seg(t, when[i], when[i] + 0.3));
          g.lead.setAttribute("opacity", kd); g.dot.setAttribute("opacity", kd); g.dot.setAttribute("fill", lit > 0.5 ? MINT : "#fff");
          g.mint.setAttribute("opacity", lit);
          tf(g.g, g.cx + 48 * (1 - k), TY[i], 1 + (t >= RUN0 ? 0.08 * bump(seg(t, when[i], when[i] + 0.4)) : 0)); g.g.setAttribute("opacity", k);
        });
        hintAt(hint, touched ? 1 : oc(seg(t, 7.6, 8.1)));
      };
    },
  };

  /* ---- 2. three jars rise out of a picnic basket ---- */
  SC.picnicbasket = {
    dur: 9, still: 9,
    build(svg, api) {
      const CLOSED = 1.2;
      const hint = txt(svg, 400, 64, "tap the basket", { "text-anchor": "middle", "font-size": 18, "font-weight": 500, fill: MUTE });
      const wrap = el("g", {}, svg);
      el("rect", { x: 86, y: 348, width: 628, height: 230, rx: 28, ...RING }, wrap);
      const jarG = el("g", { "clip-path": clip(svg, "jars", "rect", { x: 0, y: 0, width: 800, height: 540 }) }, wrap);
      const JARS = [[220, MINT, "Fits", "Small"], [400, SKY, "May be slow", "Balanced"], [580, LIL, "Won't fit", "Large"]];
      let band, bow, rtext;
      const jars = JARS.map(([x, col, lab, tg], i) => {
        const g = el("g", {}, jarG);
        el("rect", { x: -60, y: -216, width: 120, height: 20, rx: 4, fill: col, ...ink(3) }, g);
        el("rect", { x: -85, y: -200, width: 170, height: 200, rx: 28, fill: col, ...ink(3) }, g);
        el("path", { d: "M-70 -184 V-146", stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round" }, g);
        el("rect", { x: -68, y: -242, width: 136, height: 30, rx: 9, fill: "#fff", ...ink(3) }, g);
        for (let k = -2; k <= 2; k++) el("path", { d: `M${k * 22} -236 V-218`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        txt(g, 0, -104, lab, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        if (i === 0) {
          band = el("rect", { x: -85, y: -64, width: 170, height: 34, fill: BLUE, ...ink(2.5) }, g);
          rtext = txt(g, 20, -41.2, "Recommended", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
          bow = el("g", {}, g);
          el("path", { d: "M-2 3 L-13 27 L-5 25 Z", fill: BLUE, ...ink(2.5) }, bow);
          el("path", { d: "M2 3 L13 27 L5 25 Z", fill: BLUE, ...ink(2.5) }, bow);
          el("path", { d: "M0 0 C-8 -20 -26 -19 -24 -4 C-23 9 -9 7 0 0 Z", fill: BLUE, ...ink(2.5) }, bow);
          el("path", { d: "M0 0 C8 -20 26 -19 24 -4 C23 9 9 7 0 0 Z", fill: BLUE, ...ink(2.5) }, bow);
          el("circle", { r: 6.5, fill: BLUE, ...ink(2.5) }, bow);
        }
        const tag = el("g", {}, g);
        el("path", { d: "M-16 -203 L0 -189 L16 -203", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, tag);
        el("rect", { x: -60, y: -190, width: 120, height: 34, rx: 8, fill: SOFT, ...ink(2.5) }, tag);
        el("circle", { cx: -46, cy: -173, r: 4, fill: "#fff", ...ink(2) }, tag);
        txt(tag, 8, -166.5, tg, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        return { g, tag, x };
      });
      const BODY = "M110 400 H690 L664 554 Q662 562 654 562 H146 Q138 562 136 554 Z";
      el("path", { d: BODY, fill: YEL }, wrap);
      const weave = el("g", { "clip-path": clip(svg, "weave", "path", { d: BODY }) }, wrap);
      [442, 484, 526].forEach((y) => el("path", { d: `M90 ${y} H710`, stroke: INK, "stroke-width": 2.5 }, weave));
      for (let r = 0; r < 4; r++) for (let x = 130 + (r % 2) * 24; x < 690; x += 48) el("path", { d: `M${x} ${412 + r * 42} V${430 + r * 42}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, weave);
      el("path", { d: BODY, fill: "none", ...ink(3) }, wrap);
      el("rect", { x: 98, y: 386, width: 604, height: 24, rx: 12, fill: YEL, ...ink(3) }, wrap);
      const lid = (sx) => {
        const g = el("g", {}, wrap);
        el("rect", { x: sx > 0 ? 0 : -298, y: -26, width: 298, height: 26, rx: 9, fill: YEL, ...ink(3) }, g);
        el("path", { d: `M${sx * 12} -13 H${sx * 286}`, stroke: INK, "stroke-width": 2.5 }, g);
        for (let x = 30; x < 280; x += 32) {
          el("path", { d: `M${sx * x} -22 V-17`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
          el("path", { d: `M${sx * (x + 16)} -9 V-4`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        }
        return g;
      };
      const lidL = lid(1), lidR = lid(-1);
      let touched = false;
      button(wrap, "Close the lid and lift the jars again", () => {
        touched = true;
        if (api.calm) return api.seek(CLOSED);
        const p = api.pos();
        if (p > CLOSED + 0.05) api.scrub(CLOSED, cl(0.5 + (p - CLOSED) * 0.12, 0.5, 1.3));
      });
      return (t) => {
        const kb = ob(seg(t, 0, 0.6));
        wrap.setAttribute("transform", `translate(400 470) scale(${0.88 + 0.12 * kb}) translate(-400 -470)`); wrap.setAttribute("opacity", cl(seg(t, 0, 0.2)));
        const a = -98 * ob(seg(t, 1.3, 2.1), 1.2);
        lidL.setAttribute("transform", `translate(102 388) rotate(${a})`); lidR.setAttribute("transform", `translate(698 388) rotate(${-a})`);
        jars.forEach((j, i) => {
          const k = ob(seg(t, 2.0 + 0.42 * i, 2.85 + 0.42 * i), 1.2);
          tf(j.g, j.x, 410 + 252 * (1 - k));
          const s = t - (3.9 + 0.1 * i), sw = api.scrubbing() ? 0 : s < 0 ? 24 : 24 * Math.exp(-3 * s) * Math.cos(7.5 * s) * (1 - seg(s, 1.0, 1.8));
          j.tag.setAttribute("opacity", oc(seg(s, 0, 0.2))); j.tag.setAttribute("transform", `rotate(${sw} 0 -203)`);
        });
        const kr = io(seg(t, 5.3, 6.0)); band.setAttribute("width", 170 * kr); band.setAttribute("opacity", kr > 0.01 ? 1 : 0);
        const kw = ob(seg(t, 6.0, 6.4)); bow.setAttribute("transform", `translate(-60 -47) scale(${kw})`); bow.setAttribute("opacity", kw > 0.01 ? 1 : 0);
        const kl = oc(seg(t, 6.3, 6.8)); fade(rtext, kl, 12 * (1 - kl), 0);
        hintAt(hint, touched ? 1 : oc(seg(t, 7.0, 7.5)));
      };
    },
  };

  /* ---- 3. a snow globe keeps the chat going with the wifi gone ---- */
  SC.snowglobe = {
    dur: 9, still: 9,
    build(svg, api) {
      const REPLAY = 1.6, X = 400, Y = 262, R = 186, RI = 172, WX = 676, WY = 178;
      const hint = txt(svg, 44, 62, "tap the globe", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const arc = (r) => `M${WX - r * 0.7071} ${WY - r * 0.7071} A${r} ${r} 0 0 1 ${WX + r * 0.7071} ${WY - r * 0.7071}`;
      const wifi = [0, 26, 52, 78].map((r) => {
        const solid = el("g", {}, svg), gh = el("g", {}, svg);
        if (!r) {
          el("circle", { cx: WX, cy: WY, r: 10, fill: SKY, ...ink(3) }, solid);
          el("circle", { cx: WX, cy: WY, r: 10, fill: "none", stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "3 5" }, gh);
        } else {
          el("path", { d: arc(r), fill: "none", stroke: INK, "stroke-width": 17, "stroke-linecap": "round" }, solid);
          el("path", { d: arc(r), fill: "none", stroke: SKY, "stroke-width": 11, "stroke-linecap": "round" }, solid);
          el("path", { d: arc(r), fill: "none", stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "3 8", "stroke-linecap": "round" }, gh);
        }
        return { solid, gh };
      });
      const gw = el("g", {}, svg);
      el("rect", { x: 196, y: 58, width: 408, height: 492, rx: 40, ...RING }, gw);
      const globe = el("g", {}, gw);
      el("circle", { cx: X, cy: Y, r: R, fill: SOFT, ...ink(3) }, globe);
      el("circle", { cx: X, cy: Y, r: RI, fill: "#fff" }, globe);
      const inside = el("g", { "clip-path": clip(svg, "globe", "circle", { cx: X, cy: Y, r: RI }) }, globe);
      el("ellipse", { cx: X, cy: 462, rx: 214, ry: 72, fill: MINT, ...ink(2.5) }, inside);
      const glow = el("rect", { x: 282, y: 138, width: 236, height: 144, rx: 36, fill: YEL, opacity: 0 }, inside);
      const laptop = el("g", {}, inside);
      el("rect", { x: 336, y: 296, width: 128, height: 82, rx: 9, fill: LIL, ...ink(3) }, laptop);
      el("rect", { x: 348, y: 308, width: 104, height: 58, rx: 5, fill: "#fff", ...ink(2.5) }, laptop);
      el("path", { d: "M318 378 H482 L494 390 Q496 394 490 394 H310 Q304 394 306 390 Z", fill: LIL, ...ink(3) }, laptop);
      const bub = el("g", {}, inside);
      el("path", { d: "M322 154 H478 Q500 154 500 176 V244 Q500 266 478 266 H418 L398 292 L392 266 H322 Q300 266 300 244 V176 Q300 154 322 154 Z", fill: YEL, ...ink(3) }, bub);
      const bars = [[180, 152], [206, 118], [232, 136]].map(([y, w]) => ({ n: el("rect", { x: 324, y, width: 0, height: 12, rx: 6, fill: "#fff", ...ink(2) }, bub), w }));
      const caret = el("rect", { y: 228, width: 5, height: 20, rx: 1.5, fill: INK }, bub);
      const flakes = [];
      for (let i = 1; flakes.length < 22 && i < 400; i++) {
        const x = 236 + ((i * 0.6180339) % 1) * 328, y = 104 + ((i * 0.7548777 + 0.3) % 1) * 290;
        if ((x - X) ** 2 + (y - Y) ** 2 > 156 ** 2) continue;
        if (x > 276 && x < 524 && y > 132 && y < 298) continue;
        if (x > 300 && x < 500 && y > 290) continue;
        if (((x - X) / 214) ** 2 + ((y - 462) / 72) ** 2 < 1.15) continue;
        const n = flakes.length, r = 4 + (n % 3) * 1.5;
        flakes.push({ x, y, d: 1.7 + (n % 7) * 0.36 + Math.floor(n / 7) * 0.13, ph: n * 1.9, y0: Y - RI - 14 - (n % 4) * 16, n: el("circle", { r, fill: MINT }, inside) });
      }
      el("path", { d: "M252 196 Q268 146 312 116", stroke: SOFT, "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, globe);
      el("circle", { cx: X, cy: Y, r: R, fill: "none", ...ink(3) }, globe);
      const base = el("g", {}, gw);
      el("rect", { x: 266, y: 424, width: 268, height: 26, rx: 10, fill: BLUE, ...ink(3) }, base);
      el("path", { d: "M246 448 H554 L586 518 Q590 532 576 532 H224 Q210 532 214 518 Z", fill: BLUE, ...ink(3) }, base);
      txt(base, X, 499, "private, offline", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      let shakeAt = -1, touched = false;
      button(gw, "Shake the snow and bring the wifi symbol back", () => {
        touched = true;
        if (api.calm) return api.seek(REPLAY);
        shakeAt = api.now(); api.scrub(REPLAY, 1.1);
      });
      return (t, now) => {
        const s = shakeAt < 0 ? 1 : cl((now - shakeAt) / 1.1);
        gw.setAttribute("transform", `rotate(${s < 1 ? 6 * Math.sin(s * Math.PI * 7) * (1 - s) * (1 - s) : 0} 400 532)`);
        const kb = oc(seg(t, 0, 0.5)); fade(base, kb, 0, 26 * (1 - kb));
        const kg = ob(seg(t, 0.1, 0.7));
        globe.setAttribute("transform", `translate(400 448) scale(${0.9 + 0.1 * kg}) translate(-400 -448)`); globe.setAttribute("opacity", cl(seg(t, 0.1, 0.26)));
        const kl = ob(seg(t, 0.45, 0.9)); fade(laptop, cl(seg(t, 0.45, 0.6)), 0, 24 * (1 - kl));
        const kq = ob(seg(t, 0.75, 1.15)) + 0.06 * bump(seg(t, 6.4, 6.8));
        bub.setAttribute("transform", `translate(398 292) scale(${kq}) translate(-398 -292)`); bub.setAttribute("opacity", cl(seg(t, 0.75, 0.85)));
        const ws = [152 * oc(seg(t, 1.0, 1.35)), 118 * oc(seg(t, 1.1, 1.45)), 136 * io(seg(t, 4.6, 6.4))];
        bars.forEach((b, i) => { b.n.setAttribute("width", ws[i]); b.n.setAttribute("opacity", ws[i] > 1 ? 1 : 0); });
        const back = api.scrubbing(); // a rewind skips the blink and the pulse, so nothing flickers
        caret.setAttribute("x", 330 + ws[2]); caret.setAttribute("opacity", !back && t > 4.3 && t < 6.75 && Math.floor(t * 4) % 2 === 0 ? 1 : 0);
        const puls = back ? 0 : 0.5 - 0.5 * Math.cos(4 * Math.PI * seg(t, 3.4, 5.8));
        glow.setAttribute("opacity", 0.42 * oc(seg(t, 1.0, 1.6)) + 0.14 * puls);
        glow.setAttribute("transform", `translate(400 210) scale(${1 + 0.08 * puls}) translate(-400 -210)`);
        flakes.forEach((f) => {
          const k = oc(seg(t, f.d, f.d + 3));
          let x = f.x + 14 * Math.sin(f.ph + k * 5) * (1 - k);
          if (s < 1) x += 16 * Math.sin(now * 10 + f.ph) * (1 - s);
          f.n.setAttribute("cx", x); f.n.setAttribute("cy", lerp(f.y0, f.y, k));
        });
        wifi.forEach((p, j) => {
          const ka = ob(seg(t, 0.5 + 0.08 * j, 0.9 + 0.08 * j)), off = oc(seg(t, 2.4 + 0.2 * (3 - j), 3.1 + 0.2 * (3 - j)));
          p.solid.setAttribute("opacity", cl(ka) * (1 - off)); p.gh.setAttribute("opacity", off);
          p.solid.setAttribute("transform", `translate(${WX} ${WY}) scale(${0.6 + 0.4 * ka}) translate(${-WX} ${-WY})`);
        });
        hintAt(hint, touched ? 1 : oc(seg(t, 7.2, 7.6)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  const miniGlass = (svg, g) => {
    const B = "M-25 -36 C-25 -18 -4 -10 -3 0 C-4 10 -25 18 -25 36 H25 C25 18 4 10 3 0 C4 -10 25 -18 25 -36 Z";
    el("path", { d: B, fill: BLUE }, g);
    const s = el("g", { "clip-path": clip(svg, "mini", "path", { d: B }) }, g);
    el("rect", { x: -30, y: -17, width: 60, height: 18, fill: YEL }, s);
    el("path", { d: "M-30 37 V27 Q0 10 30 27 V37 Z", fill: YEL }, s);
    el("path", { d: "M0 -1 V20", stroke: YEL, "stroke-width": 2.5, "stroke-linecap": "round" }, s);
    el("path", { d: B, fill: "none", ...ink(2.5) }, g);
    for (const k of [1, -1]) {
      el("rect", { x: k > 0 ? 28 : -32, y: -36, width: 4, height: 72, rx: 2, fill: BLUE, ...ink(2) }, g);
      el("rect", { x: -36, y: k > 0 ? 36 : -44, width: 72, height: 8, rx: 3, fill: BLUE, ...ink(2.5) }, g);
    }
  };
  const miniGlobe = (svg, g) => {
    el("circle", { cx: 0, cy: -10, r: 34, fill: SKY, ...ink(2.5) }, g);
    el("path", { d: "M-14 -26 H14 Q18 -26 18 -22 V-10 Q18 -6 14 -6 H2 L-4 2 L-5 -6 H-14 Q-18 -6 -18 -10 V-22 Q-18 -26 -14 -26 Z", fill: YEL, ...ink(2) }, g);
    [[-22, -24], [22, -16], [-13, 9], [16, 9], [2, -36]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 3.4, fill: MINT, ...ink(1.5) }, g));
    el("path", { d: "M-26 20 H26 L32 36 Q33 40 29 40 H-29 Q-33 40 -32 36 Z", fill: BLUE, ...ink(2.5) }, g);
  };
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      const pill = el("g", {}, svg);
      const pr = el("rect", { y: -21, height: 42, rx: 21, fill: SKY, ...ink(2.5) }, pill);
      const pt = txt(pill, 0, 7, "AI tools", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
      const pw = pt.getComputedTextLength() + 44; pr.setAttribute("x", -pw / 2); pr.setAttribute("width", pw);
      const PX = 64 + pw / 2, PY = 128;
      const under = el("path", { stroke: YEL, "stroke-width": 16, "stroke-linecap": "round", fill: "none" }, svg);
      const title = txt(svg, 64, 248, "Jan, wifi off", { "font-size": 84, "font-weight": 700 });
      const UL = title.getComputedTextLength() - 12;
      under.setAttribute("d", `M70 266 H${70 + UL}`); under.setAttribute("stroke-dasharray", `${UL} ${UL + 40}`);
      const line = txt(svg, 64, 330, "A free AI chat on your own laptop", { "font-size": 28, "font-weight": 500, fill: MUTE });
      const chk = txt(svg, 64, 470, "Checked 28 Nov 2026", { "font-family": MONO, "font-size": 18, "font-weight": 500, fill: CAP });
      const tiles = [[50, LIL, ["8GB minimum,", "16GB recommended"], miniGlass], [276, MINT, ["Local is", "the default"], miniGlobe]].map(([y, col, lines, icon]) => {
        const g = el("g", {}, svg);
        el("rect", { x: 600, y, width: 300, height: 214, rx: 24, fill: col, ...ink(3) }, g);
        const ic = el("g", {}, g); icon(svg, ic);
        const tx = el("g", {}, g);
        lines.forEach((s, k) => txt(tx, 750, y + (lines.length > 1 ? 162 + k * 30 : 176), s, { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 }));
        return { g, ic, tx, cy: y + 107, iy: y + 70 };
      });
      return (t) => {
        const kp = ob(seg(t, 0, 0.45)); tf(pill, PX, PY, 0.7 + 0.3 * kp); pill.setAttribute("opacity", cl(seg(t, 0, 0.15)));
        const kt = oc(seg(t, 0.12, 0.62)); fade(title, kt, 0, 26 * (1 - kt));
        under.setAttribute("stroke-dashoffset", UL * (1 - io(seg(t, 0.5, 1.1))));
        const kl = oc(seg(t, 0.7, 1.15)); fade(line, kl, 0, 16 * (1 - kl));
        tiles.forEach((p, i) => {
          const a = 0.9 + 0.12 * i, k = ob(seg(t, a, a + 0.5));
          p.g.setAttribute("opacity", cl(seg(t, a, a + 0.15)));
          p.g.setAttribute("transform", `translate(750 ${p.cy}) scale(${0.9 + 0.1 * k}) translate(-750 ${-p.cy})`);
          tf(p.ic, 750, p.iy, ob(seg(t, a + 0.35, a + 0.8)));
          const kx = oc(seg(t, a + 0.55, a + 0.95)); fade(p.tx, kx, 0, 10 * (1 - kx));
        });
        const kc = oc(seg(t, 2.1, 2.6)); fade(chk, kc, 0, 10 * (1 - kc));
      };
    },
  };

  /* ---- player: plays once in view and rests on the calm final frame; a tap rewinds or replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let pos = calm ? sc.still : 0, raf = 0, seen = false, last = 0, rw = null, alt = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => {
      const now = clock();
      if (rw) { const k = (now - rw.at) / rw.len; if (k >= 1) { pos = rw.then; rw = null; } else pos = lerp(rw.from, rw.to, io(k)); }
      else if (!calm) pos = Math.min(sc.dur, pos + Math.max(0, now - last));
      last = now;
      draw(pos, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && (rw || pos < sc.dur)) raf = requestAnimationFrame(tick); };
    const api = {
      calm, now: clock, pos: () => pos, scrubbing: () => !!rw,
      // reduced motion: a tap swaps between two still frames, nothing moves
      seek: (s) => { if (calm) { alt = !alt; pos = alt ? s : sc.still; draw(pos, clock()); return; } rw = null; pos = s; last = clock(); tick(); },
      scrub: (to, len, then = to) => { if (calm) return api.seek(then); rw = { from: pos, to, then, at: clock(), len }; last = clock(); tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { last = clock(); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 18px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
