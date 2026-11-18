/* Slot machine reel scenes for "GTA 6 business ideas". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", AQUA = "#3FC6C9", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const md = (a, n) => ((a % n) + n) % n;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const bez = (x1, y1, x2, y2) => { // cubic bezier as a function, for the reel stop curve
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (s) => ((ax * s + bx) * s + cx) * s, Y = (s) => ((ay * s + by) * s + cy) * s, dX = (s) => (3 * ax * s + 2 * bx) * s + cx;
    return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let s = x; for (let i = 0; i < 8; i++) { const d = dX(s); if (Math.abs(d) < 1e-6) break; s -= (X(s) - x) / d; } return Y(cl(s)); };
  };
  const STOP = bez(0.3, 0.9, 0.35, 1.08);
  /* a reel: a small wind up against the spin, then a long decel that overshoots a little and settles */
  const spin = (t, s, e, rows) => -0.3 * Math.sin(Math.PI * seg(t, s - 0.26, s)) + rows * STOP(seg(t, s, e));
  const vel = (f, t) => (f(t) - f(t - 0.016)) / 0.016;
  let uid = 0;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
    const on = () => { g._hot = 1; }, offf = () => { g._hot = 0; };
    g.addEventListener("pointerenter", on); g.addEventListener("pointerleave", offf); g.addEventListener("focus", on); g.addEventListener("blur", offf);
  };
  const warm = (g) => (g._hv = (g._hv || 0) + ((g._hot || 0) - (g._hv || 0)) * 0.22); // eased hover and focus lift
  const strip = (svg, y, s, w = 420, cx = 400) => {
    el("rect", { x: cx - w / 2, y, width: w, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 1 }, svg);
    return txt(svg, cx, y + 26, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 500 });
  };
  const sunburst = (par, cx, cy, fill = SOFT, R = 1100, n = 12) => {
    const g = el("g", {}, par), w = Math.PI / n;
    for (let i = 0; i < n; i++) { const a = i * 2 * w; el("path", { d: `M0 0 L${(Math.cos(a) * R).toFixed(1)} ${(Math.sin(a) * R).toFixed(1)} L${(Math.cos(a + w) * R).toFixed(1)} ${(Math.sin(a + w) * R).toFixed(1)} Z`, fill }, g); }
    return (now) => g.setAttribute("transform", `translate(${cx} ${cy}) rotate(${(8 + now * 2.2) % 360})`);
  };
  const candy = (svg) => { // yellow and lilac candy stripes
    const id = "mgp" + (++uid), d = el("defs", {}, svg), p = el("pattern", { id, width: 24, height: 24, patternUnits: "userSpaceOnUse", patternTransform: "rotate(35)" }, d);
    el("rect", { width: 24, height: 24, fill: YEL }, p); el("rect", { width: 12, height: 24, fill: LIL }, p);
    return `url(#${id})`;
  };
  const shape = (g, kind, r, col, sw = 2.5) => {
    const a = { fill: col, stroke: INK, "stroke-width": sw, "stroke-linejoin": "round" };
    if (kind === "circle") return el("circle", Object.assign({ r: r * 0.9 }, a), g);
    if (kind === "square") return el("rect", Object.assign({ x: -r * 0.82, y: -r * 0.82, width: r * 1.64, height: r * 1.64, rx: r * 0.3 }, a), g);
    if (kind === "tri") return el("path", Object.assign({ d: `M0 ${-r} L${r} ${r * 0.8} L${-r} ${r * 0.8} Z` }, a), g);
    return el("path", Object.assign({ d: `M0 ${-r} L${r} 0 L0 ${r} L${-r} 0 Z` }, a), g);
  };
  const SH = { d: ["diamond", BLUE], c: ["circle", AQUA], t: ["tri", LIL], s: ["square", SKY] };
  /* one reel: faces wrap around; off counts rows moved down; the strip blurs with its speed */
  const reel = (par, cx, cy, w, rowH, faces, o = {}) => {
    const rows = o.rows || 3, sl = o.sliver == null ? 6 : o.sliver, fs = o.fs || 22, N = faces.length, hh = (rows * rowH) / 2 + sl, id = "mgr" + (++uid), sw = o.sw || 2.5, gap = o.gap || 12;
    const g = el("g", {}, par), box = { x: cx - w / 2, y: cy - hh, width: w, height: hh * 2, rx: o.rx || 12 };
    el("rect", box, el("clipPath", { id: id + "c" }, g));
    const fb = el("feGaussianBlur", { stdDeviation: "0 0" }, el("filter", { id: id + "f", filterUnits: "userSpaceOnUse", x: box.x - 4, y: box.y - 50, width: w + 8, height: hh * 2 + 100 }, g));
    el("rect", Object.assign({ fill: "#fff" }, box), g);
    const win = el("g", { "clip-path": `url(#${id}c)` }, g), run = el("g", {}, win);
    const tiles = faces.map((fc) => {
      const tg = el("g", {}, run), tw = w - gap, th = rowH - gap;
      const r = el("rect", { x: -tw / 2, y: -th / 2, width: tw, height: th, rx: o.trx || 11, fill: fc.fill || "#fff", stroke: INK, "stroke-width": sw }, tg);
      if (fc.dash) r.setAttribute("stroke-dasharray", "7 6");
      if (fc.t) txt(tg, 0, fs * 0.35, fc.t, { "text-anchor": "middle", "font-size": fs, "font-weight": 700, "font-family": o.mono ? MONO : SANS });
      else shape(tg, SH[fc.s][0], th * 0.27, SH[fc.s][1], sw);
      return tg;
    });
    const veil = rows > 1 ? [el("rect", { x: box.x, y: box.y, width: w, height: hh - rowH / 2, fill: "#fff", opacity: 0.42 }, win), el("rect", { x: box.x, y: cy + rowH / 2, width: w, height: hh - rowH / 2, fill: "#fff", opacity: 0.42 }, win)] : [];
    const lock = el("rect", Object.assign({ fill: "#fff", opacity: 0 }, box), win);
    const rim = el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": o.rim || 3 }, box), g);
    return {
      veil, lock, rim,
      set(off, sp = 0) {
        tiles.forEach((tg, i) => { const p = md(i + off + N / 2, N) - N / 2; tg.setAttribute("transform", `translate(${cx} ${(cy + p * rowH).toFixed(2)})`); tg.setAttribute("visibility", Math.abs(p) > rows / 2 + 1 ? "hidden" : "visible"); });
        const sd = Math.min(o.blur || 10, Math.abs(sp) * 0.5 * (rowH / 78));
        if (sd > 0.7) { fb.setAttribute("stdDeviation", `0 ${sd.toFixed(1)}`); run.setAttribute("filter", `url(#${id}f)`); } else run.removeAttribute("filter");
      },
    };
  };
  const burst = (par, cx, cy, n, R) => {
    const ns = Array.from({ length: n }, (_, i) => (i % 2 ? el("circle", { r: 5.5, fill: [YEL, BLUE, LIL, MINT][i % 4], stroke: INK, "stroke-width": 1.5 }, par) : el("rect", { x: -5, y: -5, width: 10, height: 10, rx: 2, fill: [MINT, YEL, SKY, LIL][(i >> 1) % 4], stroke: INK, "stroke-width": 1.5 }, par)));
    return (k) => ns.forEach((m, i) => { const a = (i / n) * 6.283 + 0.4, r = R * oc(k) * (0.62 + 0.38 * (((i * 7) % 5) / 4)); m.setAttribute("transform", `translate(${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r * 0.72 + 30 * k * k).toFixed(1)}) rotate(${(k * 260 + i * 40).toFixed(0)})`); m.setAttribute("opacity", k <= 0 || k >= 1 ? 0 : 1 - k * k); });
  };
  const lamp = (par, x, y, r) => { // a round lamp that turns mint with a tick
    const g = el("g", {}, par), c = el("circle", { r, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    const tk = el("path", { d: `M${-r * 0.45} ${r * 0.02} L${-r * 0.1} ${r * 0.4} L${r * 0.48} ${-r * 0.36}`, stroke: INK, "stroke-width": Math.max(2, r * 0.2), fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return (k) => { const on = k > 0.02; c.setAttribute("fill", on ? MINT : "#fff"); tk.setAttribute("opacity", on ? 1 : 0); tf(g, x, y, on ? 0.7 + 0.3 * ob(cl(k)) : 1); };
  };
  const WORDS = [{ t: "Your words", fill: YEL }, { t: "Your design", fill: SKY }, { t: "Your time", fill: MINT }], NOT = { t: "Not yours", fill: LIL, dash: 1 };

  const SC = {};

  /* ---- 1. three reels land on what is yours; Not yours never lands ---- */
  SC.reels = {
    dur: 9, still: 8.98,
    build(svg, api) {
      const sun = sunburst(svg, 370, 310), stripes = candy(svg);
      const cab = el("g", {}, svg);
      el("rect", { x: 80, y: 140, width: 600, height: 390, rx: 28, fill: LIL }, cab);
      el("path", { d: "M300 100 V132 M440 100 V132", stroke: INK, "stroke-width": 3 }, cab);
      el("rect", { x: 70, y: 130, width: 600, height: 390, rx: 28, fill: "#fff", stroke: INK, "stroke-width": 3 }, cab);
      el("rect", { x: 90, y: 146, width: 560, height: 24, rx: 12, fill: stripes, stroke: INK, "stroke-width": 2.5 }, cab);
      el("rect", { x: 96, y: 186, width: 548, height: 260, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, cab);
      const X = [190, 370, 550], CY = 316;
      const order = [[WORDS[0], { s: "d" }, { s: "c" }, NOT, { s: "t" }, { s: "s" }], [WORDS[1], { s: "c" }, { s: "t" }, NOT, { s: "s" }, { s: "d" }], [WORDS[2], { s: "t" }, { s: "s" }, { s: "d" }, { s: "c" }, NOT]];
      const rs = X.map((x, i) => reel(cab, x, CY, 168, 78, order[i]));
      el("path", { d: "M80 302 L103 316 L80 330 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, cab);
      el("path", { d: "M660 302 L637 316 L660 330 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, cab);
      const lamps = X.map((x) => lamp(cab, x, 484, 15));
      /* the light above the reels */
      const sign = el("g", {}, svg), rays = el("g", {}, sign);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283 + 0.26, c = Math.cos(a), s = Math.sin(a); if (s < 0.3) el("path", { d: `M${(c * 186).toFixed(1)} ${(s * 50).toFixed(1)} L${(c * 206).toFixed(1)} ${(s * 64).toFixed(1)}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, rays); }
      el("rect", { x: -159, y: -26, width: 330, height: 64, rx: 32, fill: LIL }, sign);
      const plate = el("rect", { x: -165, y: -32, width: 330, height: 64, rx: 32, fill: YEL, stroke: INK, "stroke-width": 3 }, sign);
      const word = txt(sign, 0, 12, "Yours to sell", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      const pop = burst(svg, 370, 70, 16, 190);
      /* the lever */
      el("rect", { x: 668, y: 322, width: 34, height: 86, rx: 12, fill: LIL, stroke: INK, "stroke-width": 3 }, cab);
      const lev = el("g", {}, svg);
      el("rect", { x: 696, y: 170, width: 90, height: 250, fill: "#fff", "fill-opacity": 0 }, lev);
      const arm = el("path", { d: "", stroke: INK, "stroke-width": 7, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, lev);
      const knob = el("g", {}, lev);
      el("circle", { r: 33, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, knob);
      el("circle", { cx: 3, cy: 4, r: 23, fill: LIL }, knob);
      el("circle", { r: 23, fill: AQUA, stroke: INK, "stroke-width": 3 }, knob);
      el("path", { d: "M-12 -8 Q-8 -15 0 -16", stroke: "#fff", "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, knob);
      button(lev, "Lever. Spin the reels again", () => api.seek(0.12));
      strip(svg, 548, "Tap the lever to spin again", 400);
      const S = [0.66, 0.78, 0.9], E = [3.0, 3.9, 5.5], ROWS = [24, 30, 42];
      const offs = S.map((s, i) => (t) => spin(t, s, E[i], ROWS[i]));
      return (t, now) => {
        sun(now);
        let nud = 0;
        rs.forEach((r, i) => { r.set(offs[i](t), vel(offs[i], t)); lamps[i](t < S[i] ? 1 - seg(t, 0.06 + i * 0.07, 0.3 + i * 0.07) : seg(t, E[i], E[i] + 0.4)); nud += 3 * Math.sin(Math.PI * seg(t, E[i] - 0.02, E[i] + 0.16)); });
        cab.setAttribute("transform", `translate(0 ${nud.toFixed(2)})`);
        const pull = -0.1 * Math.sin(Math.PI * seg(t, 0.14, 0.38)) + io(seg(t, 0.38, 0.62)) - ob(seg(t, 0.72, 1.25)), hv = warm(lev), ky = 222 + 128 * pull - 5 * hv;
        arm.setAttribute("d", `M700 365 H738 V${ky.toFixed(1)}`); tf(knob, 738, ky + nud * 0, 1 + 0.07 * hv);
        const lit = t < 1 ? 1 - seg(t, 0, 0.28) : seg(t, 6.0, 6.45), on = lit > 0.05;
        plate.setAttribute("fill", on ? YEL : "#fff"); word.setAttribute("fill", on ? INK : MUTE);
        rays.setAttribute("opacity", on ? lit : 0); rays.setAttribute("transform", `scale(${0.86 + 0.14 * ob(lit)})`);
        tf(sign, 370, 70, 1 + 0.12 * (ob(lit) - lit), t > 6 ? -3 * Math.sin(Math.PI * lit) : 0);
        pop(seg(t, 6.05, 7.4));
      };
    },
  };

  /* ---- 2. the paytable: nine payers light up, Rockstar stays dark ---- */
  SC.paytable = {
    dur: 9, still: 8.98,
    build(svg, api) {
      const sun = sunburst(svg, 400, 320), stripes = candy(svg);
      el("rect", { x: 50, y: 132, width: 720, height: 396, rx: 26, fill: LIL }, svg);
      el("rect", { x: 40, y: 122, width: 720, height: 396, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      [[64, 180], [556, 180]].forEach(([x, w]) => el("rect", { x, y: 54, width: w, height: 24, rx: 12, fill: stripes, stroke: INK, "stroke-width": 2.5 }, svg));
      el("path", { d: "M330 96 V124 M470 96 V124", stroke: INK, "stroke-width": 3 }, svg);
      const sign = el("g", {}, svg);
      el("rect", { x: -134, y: -31, width: 280, height: 74, rx: 37, fill: LIL }, sign);
      el("rect", { x: -140, y: -37, width: 280, height: 74, rx: 37, fill: YEL, stroke: INK, "stroke-width": 3 }, sign);
      txt(sign, 0, 14, "Who pays", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      const bulbs = Array.from({ length: 14 }, (_, i) => el("circle", { cx: 88 + i * 48, cy: 122, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      const NAMES = ["Retailer", "Owner", "Buyer", "Brand", "Creator", "Advertiser", "Streamer", "Member", "Server owner", "Rockstar"];
      const KIND = [["d", BLUE], ["c", AQUA], ["t", LIL], ["s", SKY], ["c", MINT], ["d", LIL], ["s", AQUA], ["t", BLUE], ["c", SKY]];
      const W = 328, H = 62;
      const rows = NAMES.map((name, i) => {
        const dark = i === 9, x = i < 5 ? 62 : 410, y = 146 + (i % 5) * 73, g = el("g", {}, svg), inn = el("g", {}, g);
        el("rect", { x: -W / 2 - 5, y: -H / 2 - 5, width: W + 10, height: H + 10, rx: 22, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, inn);
        const sh = el("rect", { x: -W / 2 + 4, y: -H / 2 + 5, width: W, height: H, rx: 18, fill: LIL, opacity: 0 }, inn);
        const bg = el("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, inn);
        if (dark) bg.setAttribute("stroke-dasharray", "8 7");
        const glow = el("circle", { cx: -W / 2 + 34, r: 19, fill: YEL, opacity: 0 }, inn);
        const bulb = el("circle", { cx: -W / 2 + 34, r: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, inn);
        if (dark) bulb.setAttribute("stroke-dasharray", "4 4");
        const label = txt(inn, -W / 2 + 60, 8, name, { "font-family": MONO, "font-size": 23, "font-weight": 700, fill: MUTE });
        let syms = [], chip = null;
        if (dark) {
          chip = el("g", {}, inn);
          el("rect", { x: -60, y: -17, width: 120, height: 34, rx: 17, fill: LIL, stroke: INK, "stroke-width": 2 }, chip);
          txt(chip, 0, 5.5, "stays dark", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        } else syms = [0, 1, 2].map((j) => { const px = W / 2 - 76 + j * 27; const ph = el("circle", { cx: px, r: 8, fill: "none", stroke: MUTE, "stroke-width": 1.5, "stroke-dasharray": "3 3" }, inn); const s = el("g", {}, inn); shape(s, SH[KIND[i][0]][0], 10, KIND[i][1], 2); return { s, px, ph }; });
        const row = { g, inn, sh, bg, glow, bulb, label, syms, chip, cx: x + W / 2, cy: y + H / 2, at: 0.95 + i * 0.44, hit: -9, dark };
        button(g, dark ? "Rockstar. This row stays dark" : `${name}. Light this row again`, () => { row.hit = api.now(); api.poke(); });
        return row;
      });
      strip(svg, 546, "Tap a row to light it again", 400);
      return (t, now) => {
        sun(now);
        const ph = Math.floor(now * 3.2);
        bulbs.forEach((b, i) => b.setAttribute("fill", (i + ph) % 3 === 0 ? YEL : (i + ph) % 3 === 1 ? "#fff" : LIL));
        tf(sign, 400, 66, 1, Math.sin(now * 1.6) * 0.8);
        rows.forEach((r, i) => {
          const u = now - r.hit, hv = warm(r.g);
          if (r.dark) {
            const a = t - 5.05, sh = (a > 0 && a < 0.8 ? Math.sin(a * 42) * 5 * (1 - a / 0.8) : 0) + (u >= 0 && u < 0.6 ? Math.sin(u * 42) * 6 * (1 - u / 0.6) : 0);
            const flick = (a > 0 && a < 0.1) || (a > 0.26 && a < 0.34) || (u > 0 && u < 0.1) || (u > 0.24 && u < 0.32);
            r.bulb.setAttribute("fill", flick ? SOFT : "#fff");
            const c = t < 1 ? 1 - seg(t, 0.1, 0.36) : seg(t, 6.05, 6.5);
            r.chip.setAttribute("opacity", c <= 0 ? 0 : 1); tf(r.chip, W / 2 - 74, -34 * (1 - oc(c)), c <= 0 ? 1 : 0.5 + 0.5 * ob(c), -8 * (1 - c));
            tf(r.inn, r.cx + sh, r.cy - 2 * hv);
            return;
          }
          let k = t < r.at ? 1 - seg(t, 0.08 + i * 0.045, 0.32 + i * 0.045) : seg(t, r.at, r.at + 0.55);
          if (u >= 0 && u < 0.95) k = u < 0.2 ? 1 - u / 0.2 : seg(u, 0.26, 0.85);
          const on = k > 0.12;
          r.bg.setAttribute("fill", on ? YEL : "#fff"); r.label.setAttribute("fill", on ? INK : MUTE);
          r.bulb.setAttribute("fill", on ? MINT : "#fff");
          r.glow.setAttribute("opacity", on ? 0.5 * Math.sin(Math.PI * k) : 0); r.glow.setAttribute("r", 14 + 14 * k);
          r.sh.setAttribute("opacity", on ? oc(k) : 0);
          r.syms.forEach((s, j) => { const q = seg(k, 0.3 + j * 0.16, 0.68 + j * 0.16); s.s.setAttribute("opacity", on && q > 0 ? 1 : 0); s.ph.setAttribute("opacity", on && q > 0.5 ? 0 : 1); tf(s.s, s.px, 0, ob(q), 90 * (1 - q)); });
          tf(r.inn, r.cx, r.cy - 2 * hv - (on ? 3 * oc(k) : 0), on ? 1 + 0.07 * (ob(k) - k) * 2.4 : 1);
        });
      };
    },
  };

  /* ---- 3. agents spin their reels; the Send reel waits for You ---- */
  SC.holds = {
    dur: 10, still: 9.98, wait: 5.2,
    build(svg, api) {
      const sun = sunburst(svg, 330, 310), stripes = candy(svg);
      const cab = el("g", {}, svg);
      el("rect", { x: 70, y: 64, width: 500, height: 478, rx: 28, fill: LIL }, cab);
      el("rect", { x: 60, y: 54, width: 500, height: 478, rx: 28, fill: "#fff", stroke: INK, "stroke-width": 3 }, cab);
      el("rect", { x: 80, y: 70, width: 460, height: 24, rx: 12, fill: stripes, stroke: INK, "stroke-width": 2.5 }, cab);
      el("path", { d: "M84 400 H536", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, cab);
      const Y = [158, 250, 342, 464], NAME = ["Research", "Draft", "Check", "Send"], FILL = [YEL, SKY, MINT, YEL], COL = [BLUE, LIL, AQUA];
      const ord = [["d", "c", "t", "s"], ["c", "t", "s", "d"], ["t", "s", "d", "c"], ["s", "d", "c", "t"]];
      const rs = Y.map((y, i) => reel(cab, 335, y, 300, 80, [{ t: NAME[i], fill: FILL[i] }].concat(ord[i].map((s) => ({ s }))), { rows: 1, sliver: 3, fs: 31, gap: 16 }));
      const lamps = [0, 1, 2].map((i) => lamp(cab, 522, Y[i], 16));
      const agents = COL.map((c, i) => {
        const g = el("g", {}, cab);
        el("ellipse", { cx: 0, cy: 33, rx: 22, ry: 5, fill: SOFT }, g);
        const b = el("g", {}, g);
        el("rect", { x: -19, y: 2, width: 38, height: 30, rx: 13, fill: c, stroke: INK, "stroke-width": 2.5 }, b);
        el("circle", { cy: -12, r: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b);
        el("circle", { cx: -1, cy: -12, r: 2.2, fill: INK }, b); el("circle", { cx: 9, cy: -12, r: 2.2, fill: INK }, b);
        const arm = el("path", { d: "M17 15 L35 12", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, b);
        return { g, b, arm };
      });
      /* the You button */
      const you = el("g", {}, svg), pulse = el("circle", { r: 40, fill: "none", stroke: LIL, "stroke-width": 4, opacity: 0 }, you);
      el("circle", { r: 48, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, you);
      const base = el("circle", { cy: 7, r: 37, fill: LIL, stroke: INK, "stroke-width": 3 }, you), cap = el("g", {}, you);
      el("circle", { r: 37, fill: YEL, stroke: INK, "stroke-width": 3 }, cap);
      el("path", { d: "M-22 -18 Q-14 -28 -2 -29", stroke: "#fff", "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, cap);
      txt(cap, 0, 9, "You", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      button(you, "You. Press to send", () => api.go());
      /* the light */
      el("path", { d: "M487 464 H576", stroke: INK, "stroke-width": 3, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, svg);
      const light = el("g", {}, svg), rays = el("g", {}, light);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 + 0.3, c = Math.cos(a), s = Math.sin(a); if (c > -0.5) el("path", { d: `M${(c * 102).toFixed(1)} ${(s * 44).toFixed(1)} L${(c * 115).toFixed(1)} ${(s * 56).toFixed(1)}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, rays); }
      el("rect", { x: -84, y: -25, width: 180, height: 62, rx: 31, fill: LIL }, light);
      const plate = el("rect", { x: -90, y: -31, width: 180, height: 62, rx: 31, fill: "#fff", stroke: INK, "stroke-width": 3 }, light);
      const word = txt(light, 0, 9, "Approved", { "text-anchor": "middle", "font-family": MONO, "font-size": 25, "font-weight": 700 });
      const pop = burst(svg, 668, 464, 14, 140);
      strip(svg, 552, "Tap the You button to send", 400, 400);
      const S = [0.62, 0.78, 0.94, 5.5], E = [2.4, 3.2, 4.2, 7.0], ROWS = [15, 20, 25, 15];
      const offs = S.map((s, i) => (t) => spin(t, s, E[i], ROWS[i]));
      return (t, now) => {
        sun(now);
        let nud = 0;
        rs.forEach((r, i) => { r.set(offs[i](t), vel(offs[i], t)); nud += 3 * Math.sin(Math.PI * seg(t, E[i] - 0.02, E[i] + 0.16)); });
        cab.setAttribute("transform", `translate(0 ${nud.toFixed(2)})`);
        lamps.forEach((l, i) => l(t < S[i] ? 1 - seg(t, 0.05 + i * 0.07, 0.3 + i * 0.07) : seg(t, E[i], E[i] + 0.4)));
        agents.forEach((a, i) => {
          const busy = t > S[i] && t < E[i], hop = -13 * Math.sin(Math.PI * seg(t, E[i], E[i] + 0.42)), lean = busy ? Math.sin(t * 15 + i) * 2 : 0;
          tf(a.g, 126, Y[i] - 4); tf(a.b, 0, hop + lean * 0.6, 1, busy ? 4 : 0);
          a.arm.setAttribute("transform", `rotate(${busy ? -8 + Math.sin(t * 15 + i) * 16 : t >= E[i] ? -38 * ob(seg(t, E[i], E[i] + 0.4)) : 0} 17 15)`);
        });
        const locked = t < 1 ? seg(t, 0.1, 0.4) : 1 - seg(t, 5.3, 5.6);
        rs[3].lock.setAttribute("opacity", 0.5 * locked); rs[3].rim.setAttribute("stroke-dasharray", locked > 0.5 ? "9 7" : "none");
        const wt = seg(t, 4.5, 4.9) * (1 - seg(t, 5.2, 5.32)), ph = (now * 0.85) % 1, hv = warm(you);
        pulse.setAttribute("r", 40 + 24 * ph); pulse.setAttribute("opacity", wt * (1 - ph));
        const press = io(seg(t, 5.2, 5.36)) - ob(seg(t, 5.5, 5.95));
        tf(you, 126, 462 + nud); tf(cap, 0, 7 * press - 3 * hv - 2.5 * wt * Math.abs(Math.sin(now * 3.4)), 1 + 0.04 * hv);
        base.setAttribute("opacity", 1);
        const lit = t < 1 ? 1 - seg(t, 0, 0.28) : seg(t, 7.25, 7.7), on = lit > 0.05;
        plate.setAttribute("fill", on ? MINT : "#fff"); word.setAttribute("fill", on ? INK : MUTE);
        rays.setAttribute("opacity", on ? lit : 0); rays.setAttribute("transform", `scale(${0.84 + 0.16 * ob(lit)})`);
        tf(light, 668, 464, 1 + 0.14 * (ob(lit) - lit), t > 7 ? -4 * Math.sin(Math.PI * lit) : 0);
        pop(seg(t, 7.3, 8.6));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 6, still: 5.98,
    build(svg) {
      const stripes = candy(svg), id = "mgh" + (++uid);
      el("circle", { cx: 612, cy: 262, r: 172 }, el("clipPath", { id }, svg));
      const disc = el("g", { "clip-path": `url(#${id})` }, svg);
      el("circle", { cx: 612, cy: 262, r: 172, fill: SOFT }, disc);
      const sun = sunburst(disc, 612, 262, YEL, 400, 12);
      el("rect", { x: 48, y: 40, width: 128, height: 36, rx: 18, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 112, 63.5, "Use Cases", { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 });
      txt(svg, 752, 63, "Checked 19 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 14, "font-weight": 500, fill: MUTE });
      txt(svg, 46, 178, "GTA 6", { "font-size": 54, "font-weight": 700 });
      txt(svg, 46, 240, "business ideas", { "font-size": 54, "font-weight": 700 });
      el("path", { d: "M52 268 H196", stroke: YEL, "stroke-width": 11, "stroke-linecap": "round" }, svg);
      txt(svg, 48, 318, "9 real ways to profit,", { "font-size": 21, "font-weight": 500, fill: MUTE });
      txt(svg, 48, 346, "and the agents that do the prep", { "font-size": 21, "font-weight": 500, fill: MUTE });
      const cab = el("g", {}, svg);
      el("rect", { x: 469, y: 157, width: 300, height: 232, rx: 20, fill: LIL }, cab);
      el("rect", { x: 462, y: 150, width: 300, height: 232, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, cab);
      el("rect", { x: 476, y: 161, width: 272, height: 15, rx: 7.5, fill: stripes, stroke: INK, "stroke-width": 2 }, cab);
      el("rect", { x: 470, y: 186, width: 284, height: 152, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cab);
      const X = [521, 612, 703];
      const order = [[WORDS[0], { s: "d" }, { s: "c" }, NOT, { s: "t" }, { s: "s" }], [WORDS[1], { s: "c" }, { s: "t" }, NOT, { s: "s" }, { s: "d" }], [WORDS[2], { s: "t" }, { s: "s" }, NOT, { s: "d" }, { s: "c" }]];
      const rs = X.map((x, i) => reel(cab, x, 262, 87, 44, order[i], { fs: 11, mono: 1, gap: 6, sw: 2, rim: 2.5, sliver: 4, rx: 8, trx: 7, blur: 6 }));
      el("path", { d: "M459 254 L473 262 L459 270 Z", fill: YEL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, cab);
      el("path", { d: "M765 254 L751 262 L765 270 Z", fill: YEL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, cab);
      const lamps = X.map((x) => lamp(cab, x, 360, 9));
      el("rect", { x: 760, y: 284, width: 14, height: 40, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2.5 }, cab);
      const arm = el("path", { d: "", stroke: INK, "stroke-width": 4.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const knob = el("circle", { r: 10, fill: AQUA, stroke: INK, "stroke-width": 2.5 }, svg);
      const S = [0.66, 0.78, 0.9], E = [2.4, 3.1, 4.3], ROWS = [18, 24, 36];
      const offs = S.map((s, i) => (t) => spin(t, s, E[i], ROWS[i]));
      return (t, now) => {
        sun(now);
        let nud = 0;
        rs.forEach((r, i) => { r.set(offs[i](t), vel(offs[i], t)); lamps[i](t < S[i] ? 1 - seg(t, 0.06 + i * 0.07, 0.3 + i * 0.07) : seg(t, E[i], E[i] + 0.4)); nud += 2 * Math.sin(Math.PI * seg(t, E[i] - 0.02, E[i] + 0.16)); });
        cab.setAttribute("transform", `translate(0 ${nud.toFixed(2)})`);
        const pull = -0.1 * Math.sin(Math.PI * seg(t, 0.14, 0.38)) + io(seg(t, 0.38, 0.62)) - ob(seg(t, 0.72, 1.25)), ky = 212 + 60 * pull;
        arm.setAttribute("d", `M772 304 H782 V${ky.toFixed(1)}`); knob.setAttribute("cx", 782); knob.setAttribute("cy", ky);
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
    const gated = sc.wait != null;
    let off = 0, raf = 0, seen = false, held = calm, armed = gated, begun = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => {
      const now = clock();
      if (held) { draw(sc.still, now); return; }
      let t = now + off;
      if (t >= sc.dur || t < 0) { off -= sc.dur * Math.floor(t / sc.dur); t = now + off; armed = gated; } // loop, and arm the gate again
      if (armed && t > sc.wait) { off = sc.wait - now; t = sc.wait; } // a gated scene waits here for its button
      draw(t, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = {
      now: clock,
      seek: (s) => { off = s - clock(); held = false; armed = gated && s < sc.wait; tick(); },
      poke: () => { held = false; tick(); },
      go: () => { if (held) off = sc.wait - clock(); held = false; armed = false; tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (!begun) { begun = true; off = -clock(); } // the timeline starts when the scene is first seen
        tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
