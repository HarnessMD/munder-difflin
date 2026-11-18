/* Halftone Dossier coded scenes for "GTA 6 characters". Vanilla JS, no library.
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
  const bk = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const show = (n, k, dy = 14) => { n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${dy * (1 - k)})`); };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let calm = false, uidN = 0;
  const uid = (p) => `mg6c-${p}-${++uidN}`;

  /* ---- Halftone Dossier kit: paper, dots, cards that flip, figures, misregistered type, stamps ---- */
  const paper = (svg, W, H, soft) => {
    const defs = el("defs", {}, svg);
    const pat = (col, step, r, op, rot = 30) => { const id = uid("p"), p = el("pattern", { id, width: step, height: step, patternUnits: "userSpaceOnUse", patternTransform: `rotate(${rot})` }, defs); el("circle", { cx: step / 2, cy: step / 2, r, fill: col, "fill-opacity": op }, p); return `url(#${id})`; };
    const clip = (x, y, w, h, rx) => { const id = uid("c"), c = el("clipPath", { id }, defs); el("rect", { x, y, width: w, height: h, rx }, c); return `url(#${id})`; };
    if (soft) el("rect", { width: W, height: H, fill: SOFT }, svg);
    const far = el("g", {}, svg), mid = el("g", {}, svg), stage = el("g", {}, svg);
    return { pat, clip, far, mid, stage, tex: pat(LIL, 7, 1.1, 0.24), texW: pat("#fff", 6, 1.2, 0.38) };
  };
  const blob = (p, cx, cy, R, col, op = 0.5, step = 13, mr = 4.8) => {
    const g = el("g", { opacity: op }, p), n = Math.ceil(R / step), ca = Math.cos(0.52), sa = Math.sin(0.52);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const x = (i * ca - j * sa) * step, y = (i * sa + j * ca) * step, d = Math.hypot(x, y) / R;
      if (d < 1) { const r = mr * Math.pow(1 - d, 0.7); if (r > 0.5) el("circle", { cx: (cx + x).toFixed(1), cy: (cy + y).toFixed(1), r: r.toFixed(2), fill: col }, g); }
    }
    return g;
  };
  const flipper = () => {
    let target = 0, from = 0, at = -9;
    const val = (now) => (calm ? target : from + (target - from) * io(cl((now - at) / 0.6)));
    return { val, toggle: (now) => { from = val(now); target = target ? 0 : 1; at = now; }, reset: () => { target = 0; from = 0; at = -9; } };
  };
  const card = (parent, w, h, P, o = {}) => {
    const g = el("g", {}, parent), lift = el("g", { class: "mg-lift" }, g), rx = o.rx || 10;
    const box = (p, a) => el("rect", Object.assign({ x: -w / 2, y: -h / 2, width: w, height: h, rx }, a), p);
    box(lift, { fill: "#fff", "fill-opacity": 0 });
    const fl = el("g", {}, lift);
    box(fl, { fill: o.shadow || LIL, transform: `translate(${o.sx || 5} ${o.sy || 6})` });
    const face = (fill, tex) => { const f = el("g", {}, fl); box(f, { fill, stroke: INK, "stroke-width": 1.5 }); box(f, { fill: tex }); return f; };
    const front = face(o.front || "#fff", P.tex), back = face(o.back || "#fff", o.back ? P.texW : P.tex);
    el("rect", { x: -w / 2 - 7, y: -h / 2 - 7, width: w + 14, height: h + 14, rx: rx + 6, fill: "none", stroke: BLUE, "stroke-width": 3, class: "mg-ring" }, lift);
    const set = (deg) => {
      const a = (deg * Math.PI) / 180, c = Math.cos(a);
      fl.setAttribute("transform", `skewY(${(4 * Math.sin(2 * a)).toFixed(2)}) scale(${Math.max(Math.abs(c), 0.012).toFixed(4)} 1)`);
      front.setAttribute("display", c >= 0 ? "inline" : "none"); back.setAttribute("display", c >= 0 ? "none" : "inline");
    };
    set(0);
    return { g, lift, fl, front, back, set, u: flipper() };
  };
  // a plain figure: circle head, block body. Drawn around 0,0 with the body's base at y = 24.
  const fig = (p, col, s = 1) => {
    const g = el("g", {}, p), sw = 1.5 / s;
    el("rect", { x: -32, y: -28, width: 64, height: 60, rx: 9, fill: col, stroke: INK, "stroke-width": sw }, g);
    el("circle", { cx: 0, cy: -46, r: 19, fill: col, stroke: INK, "stroke-width": sw }, g);
    return g;
  };
  // a photo panel with a figure standing in it; returns the figure so it can pop
  const portrait = (p, P, x, y, w, h, bg, col, s) => {
    el("rect", { x, y, width: w, height: h, rx: 7, fill: bg }, p);
    el("rect", { x, y, width: w, height: h, rx: 7, fill: P.texW }, p);
    const c = el("g", { "clip-path": P.clip(x, y, w, h, 7) }, p), f = fig(c, col, s), fx = x + w / 2, fy = y + h - 22 * s;
    el("rect", { x, y, width: w, height: h, rx: 7, fill: "none", stroke: INK, "stroke-width": 1.5 }, p);
    const pop = (k) => tf(f, fx, fy + (1 - k) * h * 0.9, s);
    pop(1);
    return pop;
  };
  // misregistered type: a flat ink layer under the ink text, offset by `off`
  const mis = (p, x, y, s, a, col, off = 2) => {
    const g = el("g", {}, p), under = txt(g, x, y, s, Object.assign({}, a, { fill: col }));
    txt(g, x, y, s, a);
    const set = (m) => under.setAttribute("transform", `translate(${off * m} ${off * m})`);
    set(1);
    return { g, set };
  };
  const clipPin = (p, x, y, s = 1) => el("path", { d: "M0 12 V34 a8 8 0 0 0 16 0 V4 a5.5 5.5 0 0 0 -11 0 V30 a2.5 2.5 0 0 0 5 0 V10", transform: `translate(${x} ${y}) scale(${s})`, fill: "none", stroke: INK, "stroke-width": 1.5 / s * 1.2, "stroke-linecap": "round" }, p);
  const rules = (p, x, y, ws) => ws.forEach((w, i) => el("path", { d: `M${x} ${y + i * 15} h${w}`, stroke: LIL, "stroke-opacity": 0.55, "stroke-width": 5, "stroke-linecap": "round" }, p));
  // a rubber stamp. The returned function draws it at time t for a landing that starts at t0 and gives back the jolt.
  const stamp = (parent, P, x, y, w, h, rot, label, col, size) => {
    const ghost = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 9, fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "3 6", "stroke-linecap": "round", transform: `translate(${x} ${y}) rotate(${rot})`, opacity: 0 }, parent);
    const tg = el("g", { transform: `translate(${x} ${y}) rotate(${rot})` }, parent), N = 14;
    const ticks = Array.from({ length: N }, (_, i) => { const a = (i / N) * 6.2832 + 0.22; return { n: el("path", { d: "M0 0 h13", stroke: INK, "stroke-width": 1.5, "stroke-linecap": "round" }, tg), a, c: Math.cos(a), s: Math.sin(a) }; });
    const g = el("g", { opacity: 0 }, parent);
    el("rect", { x: -w / 2 + 4, y: -h / 2 + 5, width: w, height: h, rx: 9, fill: INK, "fill-opacity": 0.14 }, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 9, fill: col, stroke: INK, "stroke-width": 1.5 }, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 9, fill: P.texW }, g);
    el("rect", { x: -w / 2 + 6, y: -h / 2 + 6, width: w - 12, height: h - 12, rx: 5, fill: "none", stroke: INK, "stroke-width": 1.25 }, g);
    txt(g, 0, size * 0.35, label, { "text-anchor": "middle", "font-size": size, "font-weight": 700, "letter-spacing": "0.4" });
    return (t, t0) => {
      const p = seg(t, t0, t0 + 0.3), q = seg(t, t0 + 0.3, t0 + 0.95), fall = p * p * p, hit = p >= 1 ? 1 : 0;
      const wob = hit * (1 - q) * (1 - q) * Math.cos(q * 11), sc = 2.3 - 1.3 * fall;
      g.setAttribute("transform", `translate(${x} ${y - 80 * (1 - fall)}) rotate(${rot + 11 * (1 - fall)}) scale(${sc * (1 + 0.1 * wob)} ${sc * (1 - 0.14 * wob)})`);
      g.setAttribute("opacity", cl(p * 5));
      ghost.setAttribute("opacity", hit ? 0 : 0.7 * oc(seg(t, t0 - 0.7, t0 - 0.3)));
      const b = seg(t, t0 + 0.3, t0 + 0.8), o = hit && b < 1 ? 1 - b * b : 0, e = oc(b);
      ticks.forEach((k) => { k.n.setAttribute("transform", `translate(${k.c * (w / 2 + 8 + 20 * e)} ${k.s * (h / 2 + 8 + 20 * e)}) rotate(${(k.a * 180) / Math.PI})`); k.n.setAttribute("opacity", o); });
      return wob;
    };
  };

  const SC = {};

  /* ---- 1. the two leads: two dossier cards slide in, flip to Lead, a yellow stamp lands ---- */
  SC.leads = {
    dur: 9.5, still: 8,
    build(svg, api) {
      const P = paper(svg, 800, 600, true), S = P.stage;
      const b1 = blob(P.far, 70, 560, 250, LIL, 0.5), b2 = blob(P.mid, 760, 40, 200, BLUE, 0.3);
      const D = [{ n: ["Jason", "Duval"], x: 226, r: -3, dir: -1, pc: SKY, fc: BLUE }, { n: ["Lucia", "Caminos"], x: 574, r: 3, dir: 1, pc: MINT, fc: LIL }];
      const cards = D.map((d) => {
        const c = card(S, 288, 384, P), f = c.front, b = c.back;
        c.pop = portrait(f, P, -124, -172, 248, 172, d.pc, d.fc, 1.7);
        c.lines = d.n.map((s, j) => mis(f, -124, 58 + j * 56, s, { "font-size": 56, "font-weight": 700 }, d.fc));
        rules(f, -124, 148, [150, 92]);
        el("path", { d: "M112 150 a11 11 0 1 0 3 12 M112 141 v9 h-9", fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, f);
        txt(b, -124, -146, d.n.join(" "), { "font-family": MONO, "font-size": 18, "font-weight": 700 });
        tf(fig(b, d.fc, 0.4), 106, -152, 0.4);
        el("path", { d: "M-124 -126 H124", stroke: INK, "stroke-width": 1.5, "stroke-linecap": "round" }, b);
        mis(b, 0, 40, "Lead", { "font-size": 104, "font-weight": 700, "text-anchor": "middle" }, d.fc, 3);
        rules(b, -124, 82, [248, 180]);
        clipPin(c.fl, d.dir < 0 ? -104 : 34, -214);
        button(c.g, `Flip the ${d.n.join(" ")} card`, () => { c.u.toggle(api.now()); api.poke(); });
        return c;
      });
      const st = stamp(S, P, 400, 478, 348, 88, -5, "Two leads", YEL, 52);
      let last = 0;
      return (t, now) => {
        if (t < last) cards.forEach((c) => c.u.reset()); last = t;
        const ex = io(seg(t, 8.9, 9.5)), jolt = st(t, 4.7), drift = oc(seg(t, 0, 1.6));
        S.setAttribute("opacity", 1 - ex);
        b1.setAttribute("transform", `translate(${-30 * (1 - drift) + Math.sin(now * 0.4) * 4} ${20 * (1 - drift)})`);
        b2.setAttribute("transform", `translate(${50 * (1 - drift)} ${-30 * (1 - drift) + Math.cos(now * 0.33) * 5})`);
        cards.forEach((c, i) => {
          const d = D[i], s0 = i * 0.12, k = seg(t, 0.2 + s0, 1.1 + s0);
          const ant = Math.sin(Math.PI * seg(t, 2.5 + i * 0.16, 2.9 + i * 0.16));
          const a = io(seg(t, 2.9 + i * 0.16, 3.65 + i * 0.16)) + c.u.val(now), up = Math.sin(Math.PI * (a % 1));
          tf(c.g, d.x + d.dir * 560 * (1 - bk(k, 0.9)), 278 + jolt * 5 + ex * 18, 1 - 0.04 * ant + 0.06 * up, d.r + d.dir * 13 * (1 - oc(k)) + jolt * d.dir * 0.8);
          c.set(a * 180);
          c.pop(bk(seg(t, 0.85 + s0, 1.35 + s0), 1.2));
          c.lines.forEach((l, j) => { show(l.g, oc(seg(t, 1.1 + s0 + j * 0.1, 1.5 + s0 + j * 0.1))); l.set(bk(seg(t, 1.65 + s0 + j * 0.08, 2.05 + s0 + j * 0.08), 2.4)); });
        });
      };
    },
  };

  /* ---- 2. the People list: eight cards deal onto a grid, the counter ticks to 8, Real Dimez splits in two ---- */
  SC.roster = {
    dur: 10, still: 8.6,
    build(svg, api) {
      const P = paper(svg, 800, 600, true), S = P.stage;
      const b1 = blob(P.far, 780, 590, 260, LIL, 0.5), b2 = blob(P.mid, 30, 40, 190, BLUE, 0.28);
      const NAMES = [["Jason", "Duval"], ["Lucia", "Caminos"], ["Cal", "Hampton"], ["Boobie", "Ike"], ["Dre'Quan", "Priest"], ["Real", "Dimez"], ["Raul", "Bautista"], ["Brian", "Heder"]];
      const COLS = [BLUE, LIL, MINT, YEL, AQUA, SKY, LIL, BLUE], DUO = 5, T0 = 0.35, STEP = 0.17;
      const cg = el("g", {}, S), cpat = P.pat(BLUE, 5, 1.75, 1);
      const num = [{ fill: YEL, stroke: INK, "stroke-width": 1.5, transform: "translate(5 5)" }, { fill: "#fff" }, { fill: cpat, stroke: INK, "stroke-width": 1.5 }].map((a) => txt(cg, 0, 0, "0", Object.assign({ "text-anchor": "middle", "font-size": 104, "font-weight": 700, "stroke-linejoin": "round" }, a)));
      const cards = NAMES.map((n, i) => {
        const c = card(S, 172, 196, P, { rx: 9, back: COLS[i], sx: 4, sy: 5 }), f = c.front, b = c.back;
        c.x = 121 + (i % 4) * 186; c.y = 254 + (i >> 2) * 208;
        portrait(f, P, -74, -86, 148, 88, SOFT, COLS[i], 0.82);
        n.forEach((s, j) => mis(f, -74, 36 + j * 28, s, { "font-size": 25, "font-weight": 700 }, COLS[i], 1.6));
        txt(f, 74, 88, `0${i + 1}`, { "text-anchor": "end", "font-family": MONO, "font-size": 14, "font-weight": 500, fill: MUTE });
        mis(b, 0, 14, String(i + 1), { "font-size": 88, "font-weight": 700, "text-anchor": "middle" }, "#fff", 3);
        txt(b, 0, 64, n.join(" "), { "text-anchor": "middle", "font-family": MONO, "font-size": 14, "font-weight": 700 });
        if (i === DUO) {
          c.pair = el("g", {}, c.lift);
          c.minis = [[-1, LIL], [1, YEL]].map(([dir, col]) => {
            const m = el("g", {}, c.pair);
            el("rect", { x: -35, y: -52, width: 78, height: 112, rx: 8, fill: LIL }, m);
            el("rect", { x: -39, y: -56, width: 78, height: 112, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, m);
            el("rect", { x: -39, y: -56, width: 78, height: 112, rx: 8, fill: P.tex }, m);
            portrait(m, P, -30, -47, 60, 94, SOFT, col, 0.62);
            return { m, dir };
          });
          c.clip = clipPin(c.pair, -8, -101, 0.8);
          c.label = mis(c.pair, 0, 80, "Real Dimez", { "font-size": 25, "font-weight": 700, "text-anchor": "middle" }, SKY, 1.6);
        }
        button(c.g, i === DUO ? "Flip the Real Dimez card: one entry, two people" : `Flip the ${n.join(" ")} card`, () => { c.u.toggle(api.now()); api.poke(); });
        return c;
      });
      const st = stamp(S, P, 488, 82, 536, 70, -2, "8 entries, 9 people, no guesses", LIL, 28);
      let last = 0;
      return (t, now) => {
        if (t < last) cards.forEach((c) => c.u.reset()); last = t;
        const ex = io(seg(t, 9.4, 10)), jolt = st(t, 5.5), drift = oc(seg(t, 0, 1.8));
        S.setAttribute("opacity", 1 - ex);
        b1.setAttribute("transform", `translate(${40 * (1 - drift) + Math.sin(now * 0.4) * 4} ${30 * (1 - drift)})`);
        b2.setAttribute("transform", `translate(${-40 * (1 - drift)} ${-20 * (1 - drift) + Math.cos(now * 0.33) * 5})`);
        let n = 0, tick = -9;
        cards.forEach((c, i) => {
          const t0 = T0 + i * STEP, k = seg(t, t0, t0 + 0.62), e = oc(k), land = t0 + 0.42;
          if (t >= land) { n++; tick = land; }
          const arc = Math.sin(Math.PI * k) * -46, u = c.u.val(now);
          let up = Math.sin(Math.PI * (u % 1));
          if (i === DUO) {
            const ant = Math.sin(Math.PI * seg(t, 2.75, 3.15)), base = io(seg(t, 3.15, 4.35)), s = Math.abs(base - u), o = cl((s - 0.5) * 2);
            c.set(cl(s * 2) * 90); up = Math.sin(Math.PI * cl(s * 2) * 0.5) * (1 - o) + 0.9 * ant;
            c.fl.setAttribute("display", s < 0.5 ? "inline" : "none"); c.pair.setAttribute("display", s < 0.5 ? "none" : "inline");
            const sp = bk(o, 2.2);
            c.minis.forEach((m) => m.m.setAttribute("transform", `translate(${m.dir * (6 + 36 * sp) - 2} ${-34 - 8 * Math.sin(Math.PI * o)}) rotate(${m.dir * 5 * sp}) scale(${Math.max(Math.sin((cl(o * 1.6) * Math.PI) / 2), 0.012)} 1)`));
            show(c.label.g, oc(seg(o, 0.45, 0.95)), 10); c.clip.setAttribute("opacity", seg(o, 0.6, 0.9));
          } else c.set(u * 180);
          tf(c.g, 880 + (c.x - 880) * e, -130 + (c.y + 130) * e + arc + jolt * 3 + ex * 16, (0.72 + 0.28 * bk(k, 1.6)) * (1 + 0.07 * up), (1 - e) * (38 - i * 5) + (i % 2 ? 1 : -1) * 0.9 * e);
          c.g.setAttribute("opacity", cl(k * 6));
        });
        num.forEach((x) => { x.textContent = String(n); });
        tf(cg, 86, 124, 1 + 0.22 * (1 - oc(seg(t, tick, tick + 0.26))) * (n ? 1 : 0), -4);
        cg.setAttribute("opacity", oc(seg(t, 0.05, 0.4)));
      };
    },
  };

  /* ---- 3. four sources: two get the highlighter, two get the ink bars, the stamp says when ---- */
  SC.redact = {
    dur: 9.5, still: 8,
    build(svg, api) {
      const P = paper(svg, 800, 600, true), S = P.stage;
      const b1 = blob(P.far, 760, 560, 250, LIL, 0.5), b2 = blob(P.mid, 40, 60, 190, MINT, 0.42);
      const ROWS = ["People page", "Trailer posts", "Review text", "Full cast lists"], Y = [-92, -22, 48, 118], TX = -150;
      const sheet = el("g", {}, S), lift = el("g", { class: "mg-lift" }, sheet), under = el("g", {}, lift);
      el("rect", { x: -250, y: -222, width: 500, height: 444, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 1.5, transform: "rotate(4) translate(10 2)" }, under);
      el("rect", { x: -244, y: -215, width: 500, height: 444, rx: 10, fill: LIL }, lift);
      el("rect", { x: 236, y: -160, width: 46, height: 92, rx: 8, fill: MINT, stroke: INK, "stroke-width": 1.5 }, lift);
      el("rect", { x: 236, y: -56, width: 38, height: 70, rx: 8, fill: SKY, stroke: INK, "stroke-width": 1.5 }, lift);
      el("rect", { x: -250, y: -222, width: 500, height: 444, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, lift);
      el("rect", { x: -250, y: -222, width: 500, height: 444, rx: 10, fill: P.tex }, lift);
      el("rect", { x: -258, y: -230, width: 516, height: 460, rx: 16, fill: "none", stroke: BLUE, "stroke-width": 3, class: "mg-ring" }, lift);
      clipPin(lift, -214, -252, 1.1);
      const head = el("g", {}, lift);
      txt(head, -150, -170, "four sources", { "font-family": MONO, "font-size": 18, "font-weight": 700, fill: MUTE });
      el("path", { d: "M-212 -150 H212", stroke: INK, "stroke-width": 1.5, "stroke-linecap": "round" }, head);
      [0, 1, 2].forEach((i) => el("circle", { cx: 176 + i * 16, cy: -176, r: 5, fill: [YEL, BLUE, MINT][i], stroke: INK, "stroke-width": 1.25 }, head));
      const rows = ROWS.map((s, i) => {
        const g = el("g", {}, lift), hi = i < 2 ? el("rect", { x: TX - 9, y: Y[i] - 37, width: 0, height: 49, rx: 4, fill: YEL, transform: `rotate(-0.7 ${TX} ${Y[i]})` }, g) : null;
        txt(g, -212, Y[i] - 5, `0${i + 1}`, { "font-family": MONO, "font-size": 17, "font-weight": 500, fill: MUTE });
        const label = i < 2 ? mis(g, TX, Y[i], s, { "font-size": 41, "font-weight": 700 }, i ? SKY : LIL, 2) : { g: txt(g, TX, Y[i], s, { "font-size": 41, "font-weight": 700 }) };
        let w = 0; try { w = (label.g.tagName === "text" ? label.g : label.g.lastChild).getComputedTextLength(); } catch (e) { w = 0; }
        if (!w) w = s.length * 22.5;
        return { g, hi, w: w + 18, label };
      });
      const bars = [2, 3].map((i) => {
        const g = el("g", {}, lift), r1 = el("rect", { x: TX - 9, width: rows[i].w, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 1.5 }, g), r2 = el("rect", { x: TX - 9, width: rows[i].w, rx: 4, fill: P.texW }, g);
        return { g, r1, r2, y: Y[i] - 12.5 };
      });
      const pen = el("g", { opacity: 0 }, lift), pb = el("g", { transform: "rotate(-52)" }, pen);
      el("path", { d: "M0 0 L9 -9 H20 V9 H9 Z", fill: YEL, stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, pb);
      el("rect", { x: 20, y: -13, width: 74, height: 26, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, pb);
      el("rect", { x: 30, y: -13, width: 16, height: 26, fill: YEL, stroke: INK, "stroke-width": 1.5 }, pb);
      const st = stamp(S, P, 528, 498, 424, 72, -4, "Read after the credits", MINT, 31);
      const u = flipper();
      button(sheet, "Lift the ink bars to show which two sources to skip", () => { u.toggle(api.now()); api.poke(); });
      let last = 0;
      return (t, now) => {
        if (t < last) u.reset(); last = t;
        const ex = io(seg(t, 8.9, 9.5)), jolt = st(t, 5.5), drift = oc(seg(t, 0, 1.6)), k = seg(t, 0.15, 1.0);
        S.setAttribute("opacity", 1 - ex);
        b1.setAttribute("transform", `translate(${40 * (1 - drift) + Math.sin(now * 0.4) * 4} ${24 * (1 - drift)})`);
        b2.setAttribute("transform", `translate(${-40 * (1 - drift)} ${-24 * (1 - drift) + Math.cos(now * 0.33) * 5})`);
        tf(sheet, 366, 284 + 470 * (1 - bk(k, 0.9)) + jolt * 5 + ex * 18, 1, -1.5 + 10 * (1 - oc(k)) + jolt * 0.5);
        under.setAttribute("transform", `rotate(${-6 * (1 - oc(seg(t, 0.5, 1.3)))})`);
        show(head, oc(seg(t, 0.8, 1.15)), 8);
        rows.forEach((r, i) => { const a = oc(seg(t, 1.0 + i * 0.11, 1.4 + i * 0.11)); r.g.setAttribute("opacity", a); r.g.setAttribute("transform", `translate(${-22 * (1 - a)} 0)`); if (r.label.set) r.label.set(bk(seg(t, 1.6 + i * 0.1, 2.0 + i * 0.1), 2.4)); });
        const sw = [io(seg(t, 2.1, 2.75)), io(seg(t, 2.95, 3.6))];
        rows[0].hi.setAttribute("width", rows[0].w * sw[0]); rows[1].hi.setAttribute("width", rows[1].w * sw[1]);
        const on = sw[1] > 0 ? 1 : 0, hop = io(seg(t, 2.75, 2.95));
        const px = on ? TX - 9 + rows[1].w * sw[1] : TX - 9 + rows[0].w * sw[0] * (1 - hop), py = on ? Y[1] : Y[0] + (Y[1] - Y[0]) * hop - 26 * Math.sin(Math.PI * hop);
        const pin = oc(seg(t, 1.8, 2.1)), pout = io(seg(t, 3.6, 3.95));
        pen.setAttribute("opacity", pin * (1 - pout)); pen.setAttribute("transform", `translate(${px + 40 * pout} ${py - 12 - 40 * (1 - pin) - 50 * pout})`);
        const uv = io(cl(u.val(now)));
        bars.forEach((b, i) => {
          const a = seg(t, 4.0 + i * 0.24, 4.55 + i * 0.24), h = 49 - 42 * uv, y = b.y - h / 2 - 9 * Math.sin(Math.PI * uv);
          [b.r1, b.r2].forEach((r) => { r.setAttribute("height", h); r.setAttribute("y", y); });
          b.r2.setAttribute("opacity", 1 - uv);
          b.g.setAttribute("transform", `translate(${640 * (1 - bk(a, 1.1))} 0)`); b.g.setAttribute("opacity", a > 0 ? 1 : 0);
        });
      };
    },
  };

  /* ---- title card, 16 by 9: plays once, no interaction ---- */
  SC.hero = {
    w: 800, h: 450, dur: 4.5, still: 4.5, once: true,
    build(svg) {
      const P = paper(svg, 800, 450, false), S = P.stage;
      const b1 = blob(P.far, 664, 232, 215, LIL, 0.42);
      const pill = el("g", {}, S);
      el("rect", { x: -54, y: -19, width: 108, height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 1.5 }, pill);
      txt(pill, 0, 6.5, "Guides", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      const chk = txt(S, 760, 60, "Checked 19 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 16, "font-weight": 500, fill: MUTE });
      const lines = ["GTA 6", "characters"].map((s, i) => mis(S, 38, 172 + i * 84, s, { "font-size": 82, "font-weight": 700, "letter-spacing": "-1" }, LIL, 3));
      const ul = el("path", { d: "M44 290 H44", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, S);
      const sub = txt(S, 40, 344, "Jason, Lucia and the cast, no spoilers", { "font-size": 22, "font-weight": 500, fill: MUTE });
      const D = [{ x: 584, y: 186, r: -7, pc: SKY, fc: BLUE }, { x: 704, y: 212, r: 6, pc: MINT, fc: LIL }];
      const cards = D.map((d, i) => {
        const c = card(S, 140, 196, P, { rx: 9, front: SOFT, back: d.fc, shadow: LIL, sx: 4, sy: 5 });
        portrait(c.front, P, -58, -86, 116, 104, d.pc, d.fc, 0.95);
        rules(c.front, -58, 40, [116, 84, 100]);
        el("circle", { r: 26, fill: "#fff", "fill-opacity": 0.5, stroke: INK, "stroke-width": 1.5 }, c.back);
        clipPin(c.fl, i ? 30 : -50, -120, 0.9);
        return c;
      });
      const st = stamp(S, P, 648, 338, 262, 64, -7, "NO SPOILERS", YEL, 30);
      return (t) => {
        const jolt = st(t, 2.5), drift = oc(seg(t, 0, 1.8));
        b1.setAttribute("transform", `translate(${40 * (1 - drift)} ${10 * (1 - drift)})`); b1.setAttribute("opacity", 0.42 * oc(seg(t, 0, 0.8)));
        tf(pill, 94, 54, bk(seg(t, 0.1, 0.5), 2.2)); pill.setAttribute("opacity", seg(t, 0.1, 0.25));
        chk.setAttribute("opacity", oc(seg(t, 0.4, 0.8)));
        lines.forEach((l, i) => { show(l.g, oc(seg(t, 0.25 + i * 0.12, 0.75 + i * 0.12)), 26); l.set(bk(seg(t, 0.9 + i * 0.1, 1.3 + i * 0.1), 2.4)); });
        ul.setAttribute("d", `M44 290 H${44 + 150 * io(seg(t, 0.8, 1.25))}`); ul.setAttribute("opacity", t > 0.8 ? 1 : 0);
        show(sub, oc(seg(t, 1.0, 1.4)), 10);
        cards.forEach((c, i) => {
          const d = D[i], k = seg(t, 1.05 + i * 0.16, 1.9 + i * 0.16), e = io(k);
          tf(c.g, d.x + 70 * (1 - oc(k)), d.y + 46 * (1 - oc(k)) + jolt * 4, 0.7 + 0.3 * bk(k, 1.8) + 0.06 * Math.sin(Math.PI * e), d.r * oc(k) + jolt * (i ? 1 : -1));
          c.set(180 * (1 - e)); c.g.setAttribute("opacity", cl(k * 6));
        });
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, ran = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : sc.once ? cl(now + off, 0, sc.still) : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { if (calm) frame(); else { held = false; tick(); } } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (sc.once && !ran) { ran = true; off = -clock(); } tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"'), document.fonts.load('700 52px "Space Grotesk"', "Two leads NO SPOILERS")]).then(() => document.fonts.ready).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
