/* Bright coded scenes for "GTA 6 day off work". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame ("&mgopen" adds the tapped state, for checks). */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", AQUA = "#3FC6C9", SOFT = "#F1ECF9", MUTE = "#7A6A88", NAVY = "#22305E";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  /* a damped spring written out by hand: 0 at rest, overshoots 1, settles on 1 */
  const spring = (x, w = 13, z = 0.55) => { if (x <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + ((z * w) / wd) * Math.sin(wd * x)); };
  /* the shake a landing card gives the phone */
  const thud = (x, a) => (x <= 0 ? 0 : a * Math.exp(-6 * x) * Math.sin(20 * x));
  const hop = (x, d) => (x <= 0 || x >= d ? 0 : Math.sin((Math.PI * x) / d));
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)}) scale(${s.toFixed(3)})`);
  /* a button that also reports a 0 to 1 hover or focus lift */
  const button = (g, label, fn, api) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
    const h = { on: false, at: -9 };
    const set = (v) => () => { if (h.on !== v) { h.on = v; h.at = api.now(); api.redraw(); } };
    g.addEventListener("pointerenter", set(true)); g.addEventListener("pointerleave", set(false));
    g.addEventListener("focus", set(true)); g.addEventListener("blur", set(false));
    return (now) => { const k = api.calm ? 1 : oc(cl((now - h.at) / 0.2)); return h.on ? k : 1 - k; };
  };

  /* ---- glyphs for the app tiles, drawn around 0,0 in a 24 box ---- */
  const G = {
    cal: "M-9 -7 H9 V9 H-9 Z M-9 -2 H9 M-4 -10 V-6 M4 -10 V-6",
    sun: "M5 0 A5 5 0 1 1 -5 0 A5 5 0 1 1 5 0 M0 -11 V-9 M0 9 V11 M-11 0 H-9 M9 0 H11 M-8 -8 L-6.5 -6.5 M6.5 6.5 L8 8 M-8 8 L-6.5 6.5 M6.5 -6.5 L8 -8",
    cross: "M-3 -9 H3 V-3 H9 V3 H3 V9 H-3 V3 H-9 V-3 H-3 Z",
    eye: "M-11 0 Q0 -10 11 0 Q0 10 -11 0 Z M3 0 A3 3 0 1 1 -3 0 A3 3 0 1 1 3 0",
    plane: "M-10 -1 L10 -9 L3 10 L-1 2 Z M-1 2 L10 -9",
    people: "M-1 -5 A4 4 0 1 1 -9 -5 A4 4 0 1 1 -1 -5 M-12 9 Q-12 1 -5 1 Q2 1 2 9 M10 -4 A3.4 3.4 0 1 1 3.2 -4 A3.4 3.4 0 1 1 10 -4 M6 2 Q12 2 12 9",
    note: "M-7 -10 H3 L8 -5 V10 H-7 Z M-3 -2 H4 M-3 3 H4",
    list: "M-10 -6 L-8 -4 L-4 -8 M0 -6 H10 M-10 4 L-8 6 L-4 2 M0 4 H10",
    check: "M-8 0 L-2 6 L9 -7",
    moon: "M7 6 A10 10 0 1 1 -3 -10 A8 8 0 0 0 7 6 Z",
    chart: "M-10 10 H10 M-6 6 V0 M0 6 V-8 M6 6 V-3",
    search: "M4 -2 A6 6 0 1 1 -8 -2 A6 6 0 1 1 4 -2 M3 3 L9 9",
    reply: "M-10 -8 H10 V5 H-2 L-7 10 V5 H-10 Z",
    lock: "M-7 -1 H7 V9 H-7 Z M-4 -1 V-5 A4 4 0 0 1 4 -5 V-1",
  };
  const glyph = (p, name, s = 1) => el("path", { d: G[name], stroke: INK, "stroke-width": 2.4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", transform: `scale(${s})` }, p);

  /* ---- a notification card, drawn around its centre so it can tilt and scale ---- */
  const card = (p, o) => {
    const w = o.w, h = o.h, x = -w / 2, y = -h / 2, s = o.tile || 38, rx = o.rx || 18, g = el("g", {}, p);
    const sh = el("rect", { x: x + 5, y: y + 6, width: w, height: h, rx, fill: LIL, opacity: 0.5 }, g);
    const ring = o.ring === false ? null : el("rect", { x: x - 6, y: y - 6, width: w + 12, height: h + 12, rx: rx + 5, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, g);
    const bg = el("rect", { x, y, width: w, height: h, rx, fill: o.fill || "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    if (o.fill) el("path", { d: `M${x + 22} ${y + 6} H${x + w - 22}`, stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.6 }, g);
    const ic = el("g", {}, g);
    let tx = x + 26 + s;
    if (o.dot) { el("circle", { cx: x + 23, cy: 0, r: 7.5, fill: o.col, stroke: INK, "stroke-width": 2 }, ic); tx = x + 40; }
    else {
      ic.setAttribute("transform", `translate(${x + 14 + s / 2} 0)`);
      el("rect", { x: -s / 2, y: -s / 2, width: s, height: s, rx: s * 0.3, fill: o.col, stroke: INK, "stroke-width": 2 }, ic);
      glyph(ic, o.glyph, s / 38);
    }
    const t = txt(g, tx, (o.tag ? -11 : 0) + o.size * 0.35, "", { "font-size": o.size, "font-weight": o.bold ? 700 : 600 });
    (Array.isArray(o.title) ? o.title : [[o.title]]).forEach(([str, b]) => { const n = el("tspan", b ? { "font-weight": 700 } : {}, t); n.textContent = str; });
    return { g, sh, ring, bg, ic, w, h, tx };
  };

  /* ---- the phone: white body, soft screen, ink outline; the shadow is its own layer ---- */
  const phoneShadow = (p, x, y, w, h) => el("rect", { x: x + 10, y: y + 12, width: w, height: h, rx: 48, fill: LIL, opacity: 0.5 }, p);
  const phone = (p, x, y, w, h, lock) => {
    el("rect", { x: x + w - 2, y: y + 128, width: 7, height: 56, rx: 3.5, fill: INK }, p);
    el("rect", { x, y, width: w, height: h, rx: 48, fill: "#fff", stroke: INK, "stroke-width": 3 }, p);
    el("rect", { x: x + 12, y: y + 12, width: w - 24, height: h - 24, rx: 37, fill: SOFT, stroke: INK, "stroke-width": 2 }, p);
    el("path", { d: `M${x + 27} ${y + 78} V${y + 56} Q${x + 27} ${y + 27} ${x + 56} ${y + 27} H${x + 84}`, stroke: "#fff", "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, p);
    el("rect", { x: x + w / 2 - 36, y: y + 24, width: 72, height: 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, p);
    el("circle", { cx: x + w / 2 + 22, cy: y + 32, r: 2.6, fill: INK }, p);
    el("rect", { x: x + w / 2 - 52, y: y + h - 32, width: 104, height: 6, rx: 3, fill: LIL }, p);
    if (lock) [x + 58, x + w - 58].forEach((cx) => el("circle", { cx, cy: y + h - 64, r: 19, fill: "#fff", stroke: INK, "stroke-width": 2 }, p));
  };
  const padlock = (p) => {
    const g = el("g", {}, p);
    el("path", { d: "M-8 -4 V-11 A8 8 0 0 1 8 -11 V-4", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g);
    el("rect", { x: -13, y: -4, width: 26, height: 21, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
    el("circle", { cx: 0, cy: 6, r: 2.6, fill: INK }, g);
    return g;
  };

  /* ---- the tiny geometric mascot: round head, two dots, a rounded body ---- */
  const mascot = (p, col) => {
    const g = el("g", {}, p);
    const shadow = el("ellipse", { cx: 0, cy: 50, rx: 34, ry: 6, fill: LIL, opacity: 0.45 }, g);
    const fig = el("g", {}, g), line = { stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" };
    const legs = el("path", Object.assign({ d: "M-10 36 V49 M10 36 V49" }, line), fig);
    const armL = el("path", Object.assign({ d: "M-20 8 L-33 22" }, line), fig), armR = el("path", Object.assign({ d: "M20 8 L33 22" }, line), fig);
    el("rect", { x: -22, y: -4, width: 44, height: 42, rx: 15, fill: col, stroke: INK, "stroke-width": 2.5 }, fig);
    el("path", { d: "M-12 3 H2", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.6 }, fig);
    const head = el("g", {}, fig);
    el("circle", { cx: 0, cy: -24, r: 21, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, head);
    const eyes = el("g", {}, head);
    el("circle", { cx: -7, cy: 0, r: 2.7, fill: INK }, eyes); el("circle", { cx: 7, cy: 0, r: 2.7, fill: INK }, eyes);
    const look = (dx, dy, big, now) => { const blink = (now + 1.3) % 3.7 < 0.12 ? 0.15 : 1; eyes.setAttribute("transform", `translate(${dx} ${dy - 24}) scale(${big} ${big * blink})`); };
    const arms = (k) => { armL.setAttribute("transform", `rotate(${90 * k} -20 8)`); armR.setAttribute("transform", `rotate(${-90 * k} 20 8)`); };
    look(0, 0, 1, 0);
    return { g, fig, head, legs, armL, armR, shadow, look, arms };
  };
  /* the mascot on a beanbag with a plain game pad; returns its per frame update */
  const gamer = (p, x, y, s) => {
    const g = el("g", {}, p); tf(g, x, y, s);
    el("ellipse", { cx: 6, cy: 62, rx: 62, ry: 7, fill: LIL, opacity: 0.45 }, g);
    el("path", { d: "M-56 44 Q-60 4 -22 6 Q0 -2 26 8 Q62 10 58 44 Q56 62 0 62 Q-54 62 -56 44 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-40 22 Q-30 14 -18 16", stroke: "#fff", "stroke-width": 3, fill: "none", "stroke-linecap": "round", opacity: 0.6 }, g);
    const m = mascot(g, BLUE); m.shadow.setAttribute("opacity", 0);
    m.legs.setAttribute("d", "M-10 36 L-24 52 M10 36 L24 52");
    m.armL.setAttribute("d", "M-20 8 Q-32 22 -19 25"); m.armR.setAttribute("d", "M20 8 Q32 22 19 25");
    const pad = el("g", {}, m.fig);
    el("rect", { x: -23, y: -11, width: 46, height: 22, rx: 11, fill: MINT, stroke: INK, "stroke-width": 2.5 }, pad);
    el("path", { d: "M-15 0 H-7 M-11 -4 V4", stroke: INK, "stroke-width": 2.2, "stroke-linecap": "round" }, pad);
    el("circle", { cx: 8, cy: 2, r: 2.2, fill: INK }, pad); el("circle", { cx: 14, cy: -3, r: 2.2, fill: INK }, pad);
    return (now, glance = 0) => {
      tf(m.fig, 0, -10 + Math.sin(now * 2.2) * 1.2, 1, 0);
      m.head.setAttribute("transform", `rotate(${(Math.sin(now * 1.6) * 4 * (1 - glance) - 6 * glance).toFixed(2)} 0 -4)`);
      m.look(lerp(0, -5, glance), lerp(4, 0, glance), 1, now);
      tf(pad, 0, 25, 1, Math.sin(now * 9) * 3 * (1 - glance));
    };
  };

  /* ---- backdrop: a soft disc, a slow dotted ring and small shapes that drift at their own depth ---- */
  const backdrop = (svg, cx, cy, r, bits) => {
    const far = el("circle", { cx, cy, r, fill: SOFT }, svg);
    const ring = el("circle", { cx, cy, r: r + 24, fill: "none", stroke: LIL, "stroke-width": 2.5, "stroke-dasharray": "1 13", "stroke-linecap": "round" }, svg);
    const ns = bits.map(([, , kind, col]) => {
      const g = el("g", {}, svg);
      if (kind === 0) el("circle", { r: 9, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
      else if (kind === 1) el("rect", { x: -9, y: -9, width: 18, height: 18, rx: 5, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
      else { el("path", { d: "M-9 0 H9 M0 -9 V9", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, g); el("path", { d: "M-9 0 H9 M0 -9 V9", stroke: col, "stroke-width": 3.5, "stroke-linecap": "round" }, g); }
      return g;
    });
    return (now, bump = 0) => {
      far.setAttribute("transform", `translate(0 ${(-bump * 0.35).toFixed(2)})`);
      ring.setAttribute("transform", `rotate(${(now * 1.5).toFixed(2)} ${cx} ${cy})`);
      ns.forEach((g, i) => { const b = bits[i], d = b[4]; tf(g, b[0] + Math.sin(now * 0.5 + i * 1.7) * 7 * d, b[1] + Math.cos(now * 0.4 + i * 2.3) * 9 * d - bump * d * 0.6, 0.7 + d * 0.4, 12 + Math.sin(now * 0.3 + i) * 14); });
    };
  };

  const SC = {};
  const PX = 208, PY = 16, PW = 384, PH = 568;

  /* ---- 1. the lock screen: three numbers stack, then the manager lands on top ---- */
  SC.lockscreen = {
    dur: 10.6, still: 8,
    build(svg, api) {
      const T = 8, A = [0.9, 1.9, 2.9, 5.05];
      const bg = backdrop(svg, 400, 300, 250, [[86, 118, 0, SKY, 1], [124, 462, 2, AQUA, 0.6], [712, 108, 1, MINT, 0.8], [722, 268, 2, LIL, 0.5], [66, 296, 1, YEL, 0.5]]);
      const rig = el("g", {}, svg);
      phoneShadow(rig, PX, PY, PW, PH);
      const m = mascot(rig, BLUE);
      phone(rig, PX, PY, PW, PH, true);
      const lock = padlock(rig);
      const sparks = [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]].map(() => el("path", { d: "M0 0 H15", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, rig));
      const stack = el("g", {}, rig);
      el("rect", { x: PX + 16, y: 118, width: PW - 32, height: 352, rx: 26, fill: "#fff", "fill-opacity": 0, stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, stack);
      const D = [
        { col: SKY, glyph: "cal", title: [["PTO requests up "], ["13%", 1]] },
        { col: MINT, glyph: "sun", title: [["18%", 1], [" plan the day off"]] },
        { col: LIL, glyph: "cross", title: [["50%", 1], [" plan to call in sick"]] },
        { col: "#fff", glyph: "eye", title: "Your manager: noticed", fill: YEL, bold: 1, size: 21, w: 348, h: 78 },
      ];
      const cards = D.map((d) => card(stack, Object.assign({ w: 336, h: 72, size: 19, ring: false }, d)));
      let fanAt = -1, fanned = api.open;
      const hov = button(stack, "Fan the notification cards out and drop them in again", () => {
        if (api.calm) { fanned = !fanned; api.redraw(); return; }
        if (fanAt < 0) { fanAt = api.now(); api.poke(); }
      }, api);
      return (t, now) => {
        let s = -1;
        if (fanAt >= 0) { s = now - fanAt; if (s > 2.05) { fanAt = -1; api.seek(0.5); return; } t = T; }
        const out = seg(t, 10.05, 10.6), lift = hov(now);
        const bump = thud(t - A[0] - 0.1, 3) + thud(t - A[1] - 0.1, 3) + thud(t - A[2] - 0.1, 3) + thud(t - A[3] - 0.12, 11) - 7 * io(seg(t, 4.35, 4.95)) * (1 - seg(t, 5.05, 5.17));
        bg(now, bump);
        rig.setAttribute("transform", `translate(0 ${bump.toFixed(2)})`);
        tf(lock, 400, 84, 1, thud(t - A[3] - 0.14, 16));
        cards.forEach((c, i) => {
          const x = t - A[i], last = i === 3, k = spring(x, last ? 15 : 13, last ? 0.42 : 0.55);
          let slot = 0; for (let j = i + 1; j < 4; j++) slot += spring(t - A[j] - 0.03 * (j - i), 12, 0.62);
          let cx = 400, cy = 168 + slot * 84 - (last ? 3 : 0) - 150 * (1 - k) - lift * (3 + (3 - i)) - 46 * io(out);
          let r = last ? -8 * (1 - k) - 1.5 : 0, op = seg(x, 0, 0.14) * (1 - out);
          if (s >= 0 || fanned) {
            const n = 3 - i, f = fanned ? 1 : ob(seg(s, 0.04 + n * 0.07, 0.62 + n * 0.07)), a = 6 + n * 27, rad = (a * Math.PI) / 180;
            cx = lerp(cx, 232 + 236 * Math.cos(rad), f); cy = lerp(cy, 540 - 236 * Math.sin(rad), f); r = lerp(r, -a, f);
            cy -= 90 * io(seg(s, 1.35 + i * 0.05, 1.85 + i * 0.05)); op *= 1 - seg(s, 1.5 + i * 0.05, 1.9 + i * 0.05);
          }
          tf(c.g, cx, cy, 0.9 + 0.1 * cl(k), r); c.g.setAttribute("opacity", op.toFixed(3));
        });
        const hit = seg(t, A[3] + 0.1, A[3] + 0.42);
        sparks.forEach((p, i) => { const sx = i < 3 ? -1 : 1, sy = (i % 3) - 1; tf(p, 400 + sx * (204 + 16 * oc(hit)), 166 + sy * (22 + 10 * oc(hit)), 1, sx > 0 ? sy * 30 : 180 - sy * 30); p.setAttribute("opacity", hit > 0 && hit < 1 ? 1 - hit * hit : 0); });
        /* the mascot peeks out, sees the last card, and pulls back to half hidden */
        const peek = ob(seg(t, 3.5, 4.0)), hide = io(seg(t, 5.8, 6.35)), gone = io(seg(t, 10.0, 10.5));
        const startle = seg(t, A[3] + 0.12, A[3] + 0.22) * (1 - seg(t, 5.7, 6.0));
        tf(m.g, 556 + 86 * peek - 27 * hide - 50 * gone, 452 - 9 * hop(t - A[3] - 0.12, 0.35), 1, 9 * peek * (1 - hide) - 4 * hide * (1 - gone));
        m.look(-3.5 * (1 - gone), -3 * startle, 1 + 0.55 * startle, now);
      };
    },
  };

  /* ---- 2. the request: four proofs stack up, the approval lands last; tap a card for its line ---- */
  SC.request = {
    dur: 11.2, still: 8.5,
    build(svg, api) {
      const T = 8.5, A = [0.8, 1.7, 2.6, 3.5, 5.6], X = 40;
      const bg = backdrop(svg, 400, 300, 250, [[80, 104, 1, SKY, 0.9], [706, 140, 0, YEL, 1], [724, 420, 2, AQUA, 0.6], [60, 280, 2, LIL, 0.5], [690, 290, 1, LIL, 0.5]]);
      const m = mascot(svg, LIL);
      const conf = el("g", {}, svg);
      const paper = el("g", {}, m.fig);
      el("rect", { x: -9, y: -12, width: 18, height: 24, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.2 }, paper);
      el("path", { d: "M-4 -5 H4 M-4 0 H4 M-4 5 H1", stroke: INK, "stroke-width": 1.8, "stroke-linecap": "round" }, paper);
      const rig = el("g", {}, svg);
      phoneShadow(rig, PX, PY, PW, PH); phone(rig, PX, PY, PW, PH, false);
      const stack = el("g", {}, rig);
      const D = [
        { col: BLUE, glyph: "plane", title: "Leave request sent", more: "Friday 20 November, full day" },
        { col: LIL, glyph: "people", title: "Cover agreed", more: "Who takes anything urgent, by name" },
        { col: SKY, glyph: "note", title: "Handover note shared", more: "Where everything lives" },
        { col: YEL, glyph: "list", title: "Done list attached", more: "Finished, and what waits until Monday" },
        { col: "#fff", glyph: "check", title: "Manager: Approved. Enjoy", more: "Annual leave or a personal day", fill: MINT, bold: 1, size: 20, w: 348, h: 72 },
      ];
      let open = api.open ? 2 : -1, openAt = 0, prev = -1, prevAt = 0;
      const toggle = (i) => { const n = api.now(); prev = open; prevAt = n; if (open === i) open = -1; else { open = i; openAt = n; } if (api.calm) api.redraw(); else api.poke(); };
      const cards = D.map((d, i) => {
        const c = card(stack, Object.assign({ w: 336, h: 66, size: 19.5 }, d));
        c.rule = el("path", { d: `M${-c.w / 2 + 18} ${c.h / 2 - 1} H${c.w / 2 - 18}`, stroke: INK, "stroke-width": 1.6, "stroke-dasharray": "1 7", "stroke-linecap": "round", opacity: 0 }, c.g);
        c.more = txt(c.g, -c.w / 2 + 18, c.h / 2 + 23, d.more, { "font-family": MONO, "font-size": 13, "font-weight": 500, fill: NAVY, opacity: 0 });
        if (i < 4) { c.tick = el("g", {}, c.g); el("circle", { r: 12, fill: MINT, stroke: INK, "stroke-width": 2 }, c.tick); el("path", { d: "M-5 0 L-1.5 3.5 L5 -4", stroke: INK, "stroke-width": 2.4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, c.tick); }
        c.hov = button(c.g, `${d.title}. It adds: ${d.more}`, () => toggle(i), api);
        return c;
      });
      /* confetti: fixed launch values, no random numbers */
      const COL = [YEL, BLUE, MINT, SKY, LIL, AQUA];
      const bitsC = Array.from({ length: 12 }, (_, n) => {
        const g = n % 3 === 0 ? el("circle", { r: 4.5, fill: COL[n % 6], stroke: INK, "stroke-width": 1.6 }, conf) : el("rect", { x: -5.5, y: -3, width: 11, height: 6, rx: 1.5, fill: COL[n % 6], stroke: INK, "stroke-width": 1.6 }, conf);
        const vx = (n - 5.5) * 11 - 4, vy = -(190 + 10 * ((n * 7) % 5)), land = (-vy + Math.sqrt(vy * vy + 1000 * (112 + 6 * (n % 3)))) / 500;
        return { g, vx, vy, land };
      });
      return (t, now) => {
        const ex = cards.map((c, i) => (i === open ? (api.calm ? 1 : oc(cl((now - openAt) / 0.36))) : i === prev ? (api.calm ? 0 : 1 - oc(cl((now - prevAt) / 0.28))) : 0));
        if (open >= 0 || (prev >= 0 && now - prevAt < 0.3)) t = T;
        else if (prev >= 0) { prev = -1; if (!api.calm) { api.seek(T); return; } }
        const out = seg(t, 10.65, 11.2);
        const bump = A.reduce((v, a, i) => v + thud(t - a - 0.1, i === 4 ? 10 : 2.5), 0) - 6 * io(seg(t, 4.9, 5.5)) * (1 - seg(t, 5.6, 5.72));
        bg(now, bump);
        rig.setAttribute("transform", `translate(0 ${bump.toFixed(2)})`);
        cards.forEach((c, i) => {
          const x = t - A[i], last = i === 4, k = spring(x, last ? 15 : 13, last ? 0.42 : 0.55), e = ex[i];
          let slot = 0, push = 0;
          for (let j = i + 1; j < 5; j++) { slot += spring(t - A[j] - 0.03 * (j - i), 12, 0.62); push += ex[j]; }
          const cy = 130 + slot * 80 + push * X - (last ? 3 : 0) - 150 * (1 - k) - c.hov(now) * 3 - 46 * io(out);
          tf(c.g, 400, cy, 0.9 + 0.1 * cl(k), last ? -8 * (1 - k) : 0);
          c.g.setAttribute("opacity", (seg(x, 0, 0.14) * (1 - out)).toFixed(3));
          const hh = c.h + X * e;
          c.bg.setAttribute("height", hh); c.sh.setAttribute("height", hh); c.ring.setAttribute("height", hh + 12);
          c.rule.setAttribute("opacity", e); c.more.setAttribute("opacity", seg(e, 0.45, 1)); c.more.setAttribute("y", c.h / 2 + 15 + 8 * e);
          if (c.tick) tf(c.tick, c.w / 2 - 28, 0, ob(seg(x, 0.36, 0.62)), -40 * (1 - oc(seg(x, 0.36, 0.62))));
        });
        /* the mascot waits with its request, leans in on the beat, then jumps on Approved */
        const lean = io(seg(t, 4.2, 4.8)) * (1 - seg(t, 5.6, 5.75)), up = ob(seg(t, 5.74, 6.02)) * (1 - io(seg(t, 10.3, 10.8)));
        const hops = hop(t - A[0] - 0.14, 0.3) + hop(t - A[1] - 0.14, 0.3) + hop(t - A[2] - 0.14, 0.3) + hop(t - A[3] - 0.14, 0.3);
        const jump = hop(t - 5.72, 0.52), crouch = hop(t - 5.56, 0.16);
        tf(m.g, 112, 470, 1, 0);
        tf(m.fig, 4 * lean, -5 * hops - 34 * jump + 3 * crouch + Math.sin(t * 12) * 1.2 * lean, 1, 5 * lean);
        m.shadow.setAttribute("transform", `scale(${(1 - 0.35 * jump).toFixed(3)} 1)`);
        m.arms(up); m.look(3.5, -1 - 2 * up, 1 + 0.3 * lean, now);
        tf(paper, lerp(34, 39, up), lerp(23, -12, up), 1, lerp(12, -14, up));
        bitsC.forEach((b, n) => {
          const sN = t - 5.8 - n * 0.012, q = Math.min(Math.max(sN, 0), b.land);
          tf(b.g, 118 + b.vx * q, 402 + b.vy * q + 250 * q * q, 1, n * 47 + q * 320);
          b.g.setAttribute("opacity", sN > 0 ? 1 - out : 0);
        });
      };
    },
  };

  /* ---- 3. game day: drafts slide in quietly under the banner and wait; tap to see each draft ---- */
  SC.gameday = {
    dur: 10.8, still: 8,
    build(svg, api) {
      const T = 8, A = [1.2, 2.2, 3.2, 5.4], SIDE = [-1, 1, -1], AT = [[104, 196], [696, 250], [104, 372]];
      const bg = backdrop(svg, 400, 300, 250, [[98, 84, 0, YEL, 0.9], [712, 96, 2, AQUA, 0.7], [66, 286, 2, LIL, 0.5], [108, 508, 1, MINT, 0.8], [742, 352, 0, SKY, 0.5]]);
      const play = gamer(svg, 694, 470, 1);
      const sheets = [["chart", MINT], ["search", BLUE], ["reply", LIL]].map(([gl, col], i) => {
        const g = el("g", {}, svg), W = 160, H = 124;
        el("rect", { x: -W / 2 + 5, y: -H / 2 + 6, width: W, height: H, rx: 14, fill: LIL, opacity: 0.5 }, g);
        el("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "9 6", "stroke-linecap": "round" }, g);
        const ic = el("g", { transform: "translate(-55 -37)" }, g);
        el("rect", { x: -13, y: -13, width: 26, height: 26, rx: 8, fill: col, stroke: INK, "stroke-width": 2 }, ic); glyph(ic, gl, 0.7);
        el("rect", { x: -32, y: -42, width: 76, height: 10, rx: 5, fill: LIL, opacity: 0.6 }, g);
        if (i === 0) { [[-52, 26, MINT], [-28, 44, SKY], [-4, 34, LIL], [20, 56, YEL]].forEach(([x, h, c]) => el("rect", { x, y: 46 - h, width: 18, height: h, rx: 4, fill: c, stroke: INK, "stroke-width": 2 }, g)); el("path", { d: "M-62 46 H62", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g); }
        if (i === 1) [[-6, 104], [16, 84], [38, 96]].forEach(([y, w]) => { el("circle", { cx: -60, cy: y, r: 4.5, fill: BLUE, stroke: INK, "stroke-width": 1.6 }, g); el("rect", { x: -46, y: y - 5, width: w, height: 10, rx: 5, fill: LIL, opacity: 0.6 }, g); });
        if (i === 2) { el("rect", { x: -66, y: -14, width: 96, height: 26, rx: 13, fill: SKY, stroke: INK, "stroke-width": 2 }, g); el("rect", { x: -30, y: 22, width: 96, height: 26, rx: 13, fill: MINT, stroke: INK, "stroke-width": 2 }, g); }
        const link = el("path", { d: "", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "1 8", "stroke-linecap": "round" }, svg);
        return { g, link };
      });
      const rig = el("g", {}, svg);
      phoneShadow(rig, PX, PY, PW, PH); phone(rig, PX, PY, PW, PH, true);
      const banner = el("g", {}, rig);
      el("rect", { x: -96, y: -23, width: 192, height: 46, rx: 23, fill: "#fff", stroke: INK, "stroke-width": 2 }, banner);
      const moon = el("g", { transform: "translate(-66 0)" }, banner);
      el("circle", { r: 15, fill: LIL, stroke: INK, "stroke-width": 2 }, moon); glyph(moon, "moon", 0.72);
      txt(banner, -40, 7, "Game day", { "font-size": 20 });
      const stack = el("g", {}, rig);
      el("rect", { x: PX + 16, y: 132, width: PW - 32, height: 372, rx: 26, fill: "#fff", "fill-opacity": 0, stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, stack);
      const D = [
        { col: MINT, glyph: "chart", title: "Report drafted", tag: 1 },
        { col: BLUE, glyph: "search", title: "Research ready", tag: 1 },
        { col: LIL, glyph: "reply", title: "Replies drafted", tag: 1 },
        { col: "#fff", glyph: "lock", title: "Nothing sent without you", fill: YEL, bold: 1, size: 19.5, w: 348, h: 64 },
      ];
      const cards = D.map((d) => {
        const c = card(stack, Object.assign({ w: 336, h: 82, size: 20, ring: false }, d));
        if (d.tag) {
          c.tag = el("g", {}, c.g);
          el("rect", { x: 0, y: -12, width: 150, height: 24, rx: 12, fill: SKY, stroke: INK, "stroke-width": 1.6 }, c.tag);
          c.dot = el("circle", { cx: 13, cy: 0, r: 4, fill: "#fff", stroke: INK, "stroke-width": 1.6 }, c.tag);
          txt(c.tag, 24, 4.5, "Waiting for you", { "font-family": MONO, "font-size": 12.5, "font-weight": 700 });
        }
        return c;
      });
      let fan = api.open, fanAt = -9;
      const hov = button(stack, "Fan the cards out to show each draft", () => { fan = !fan; fanAt = api.now(); if (api.calm) api.redraw(); else api.poke(); }, api);
      return (t, now) => {
        const fk = api.calm ? 1 : cl((now - fanAt) / 0.8), f = fan ? fk : 1 - fk;
        if (fan || fk < 1) t = T; else if (fanAt > 0) { fanAt = -9; if (!api.calm) { api.seek(T); return; } }
        const out = seg(t, 10.25, 10.8), lift = hov(now);
        const bump = thud(t - A[3] - 0.12, 4);
        bg(now, bump);
        rig.setAttribute("transform", `translate(0 ${bump.toFixed(2)})`);
        tf(banner, 400, 96, 1, 0);
        moon.setAttribute("transform", `translate(-66 0) rotate(${(Math.sin(now * 0.9) * 10).toFixed(2)})`);
        cards.forEach((c, i) => {
          const x = t - A[i];
          if (i < 3) {
            const k = oc(seg(x, 0, 0.62)), e = (fan ? ob : io)(seg(f, i * 0.13, 0.74 + i * 0.13));
            tf(c.g, 400 + 150 * (1 - k) + SIDE[i] * 6 * e + 60 * io(out), 184 + i * 92 - lift * 3, 0.96 + 0.04 * k, 0);
            c.g.setAttribute("opacity", (seg(x, 0, 0.3) * (1 - out)).toFixed(3));
            tf(c.tag, c.tx, 16, ob(seg(x, 0.5, 0.8)), 0);
            c.dot.setAttribute("r", (4 + 0.9 * Math.sin(now * 3 + i)).toFixed(2));
            const sh = sheets[i], y0 = 184 + i * 92, sx = lerp(400 + SIDE[i] * 96, AT[i][0], e), sy = lerp(y0, AT[i][1], e);
            tf(sh.g, sx, sy + Math.sin(now * 1.4 + i * 2) * 2.5 * e, 0.6 + 0.4 * e, SIDE[i] * -5 * e);
            sh.g.setAttribute("opacity", seg(e, 0, 0.25));
            sh.link.setAttribute("d", `M${400 + SIDE[i] * 196} ${y0} L${sx - SIDE[i] * 84} ${lerp(y0, sy, 0.8).toFixed(1)}`);
            sh.link.setAttribute("opacity", seg(e, 0.7, 1));
          } else {
            const k = spring(x, 14, 0.5);
            tf(c.g, 400, 456 + 80 * (1 - k) - lift * 3 - 2 * io(seg(t, 4.7, 5.3)) * (1 - seg(x, 0, 0.1)), 0.9 + 0.1 * cl(k), 0);
            c.g.setAttribute("opacity", (seg(x, 0, 0.14) * (1 - out)).toFixed(3));
            c.ic.setAttribute("transform", `translate(${-c.w / 2 + 33} 0) rotate(${thud(x - 0.5, 16).toFixed(2)})`);
          }
        });
        play(now, io(seg(t, 5.9, 6.2)) * (1 - io(seg(t, 6.9, 7.3))));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 7, still: 4,
    build(svg) {
      const A = [0.6, 1.3, 2.0], X = 472, Y = 96, W = 300;
      const bg = backdrop(svg, 622, 300, 196, [[404, 96, 0, SKY, 0.8], [446, 250, 2, AQUA, 0.5], [300, 404, 1, MINT, 0.6], [60, 404, 2, LIL, 0.5]]);
      el("rect", { x: 48, y: 41, width: 106, height: 38, rx: 19, fill: LIL, opacity: 0.5 }, svg);
      el("rect", { x: 44, y: 36, width: 106, height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 97, 61.5, "Guides", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 756, 61, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 17, "font-weight": 500, fill: MUTE });
      txt(svg, 42, 184, "GTA 6 day", { "font-size": 70, "font-weight": 700 });
      txt(svg, 42, 258, "off work", { "font-size": 70, "font-weight": 700 });
      el("path", { d: "M48 288 H196", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 44, 340, "Skip the excuse. Book it honestly", { "font-size": 21.5, "font-weight": 500, fill: MUTE });
      const play = gamer(svg, 424, 392, 0.8);
      const rig = el("g", {}, svg);
      phoneShadow(rig, X, Y, W, 470); phone(rig, X, Y, W, 470, false);
      const D = [
        { col: MINT, title: [["Leave request: "], ["approved", 1]] },
        { col: BLUE, title: [["Queue: "], ["prepped by agents", 1]] },
        { col: "#fff", title: "You: playing", fill: YEL, bold: 1, size: 19.5 },
      ];
      const cards = D.map((d) => card(rig, Object.assign({ w: 264, h: 64, size: 16.5, dot: 1, rx: 18, ring: false }, d)));
      return (t, now) => {
        const out = seg(t, 6.5, 7), bump = thud(t - A[0] - 0.1, 2) + thud(t - A[1] - 0.1, 2) + thud(t - A[2] - 0.1, 5);
        bg(now, bump);
        rig.setAttribute("transform", `translate(0 ${bump.toFixed(2)})`);
        cards.forEach((c, i) => {
          const x = t - A[i], k = spring(x, 12, 0.48);
          let slot = 0; for (let j = i + 1; j < 3; j++) slot += spring(t - A[j] - 0.03 * (j - i), 12, 0.62);
          tf(c.g, X + W / 2, 186 + slot * 76 - 120 * (1 - k) - 40 * io(out), 0.9 + 0.1 * cl(k), i === 2 ? -6 * (1 - k) : 0);
          c.g.setAttribute("opacity", (seg(x, 0, 0.14) * (1 - out)).toFixed(3));
        });
        play(now, 0);
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
    const frame = () => { const now = clock(); if (frozen) draw(isNaN(fixed) ? sc.still : fixed, 0); else draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, held ? 0 : now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && !frozen) raf = requestAnimationFrame(tick); };
    const api = { calm: calm || frozen, open: frozen && q.has("mgopen"), now: clock, redraw: () => frame(), seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { frame(); return; }
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
