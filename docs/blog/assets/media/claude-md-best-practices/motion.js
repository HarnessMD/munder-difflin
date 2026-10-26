/* Bright coded scenes for "CLAUDE.md best practices". Vanilla JS, no library.
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  const CAP = "#6B5878";
  const hint = (svg, x, y, s) => txt(svg, x, y, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  const pill = (svg, x, y, w, label, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x, y, width: w, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: x - 6, y: y - 6, width: w + 12, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
    txt(g, x + w / 2, y + 34, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
    button(g, label, fn);
    return g;
  };
  const lift = (on, at, now) => (on ? oc(seg(now - at, 0, 0.35)) : 1 - oc(seg(now - at, 0, 0.35)));

  const SC = {};

  /* ---- 1. four instruction files drop onto a pile, broadest first ---- */
  SC.stack = {
    dur: 7.6, still: 6.6,
    build(svg, api) {
      hint(svg, 774, 50, "tap a sheet");
      const SH = [["Managed", LIL], ["User", SKY], ["Project", MINT], ["Local", YEL]];
      const X0 = 150, Y0 = 300, DX = 36, DY = -62, SW = 340, SHH = 230;
      el("ellipse", { cx: X0 + SW / 2 + 54, cy: Y0 + SHH + 26, rx: 230, ry: 12, fill: SOFT }, svg);
      const sheets = SH.map(([name, col], i) => {
        const x = X0 + DX * i, y = Y0 + DY * i, g = el("g", {}, svg), body = el("g", {}, g);
        el("rect", { x: x - 8, y: y - 8, width: SW + 16, height: SHH + 16, rx: 20, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, body);
        el("rect", { x: x + 6, y: y + 6, width: SW, height: SHH, rx: 14, fill: SOFT }, body);
        el("rect", { x, y, width: SW, height: SHH, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
        [0, 1, 2, 3].forEach((r) => el("path", { d: `M${x + 28} ${y + 40 + r * 30} H${x + 28 + [250, 200, 270, 150][r]}`, stroke: SOFT, "stroke-width": 8, "stroke-linecap": "round" }, body));
        const cw = name.length * 12.5 + 34;
        el("rect", { x: x + 22, y: y + SHH - 48, width: cw, height: 34, rx: 17, fill: col, stroke: INK, "stroke-width": 2.5 }, body);
        txt(body, x + 22 + cw / 2, y + SHH - 24, name, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        const s = { g, body, x, y, up: false, at: -99, cx: x + SW / 2, cy: y + SHH / 2 };
        button(g, `${name} sheet. Lift it`, () => { const now = api.now(); sheets.forEach((o) => { if (o !== s && o.up) { o.up = false; o.at = now; } }); s.up = !s.up; s.at = now; g.setAttribute("aria-pressed", s.up); api.poke(); });
        g.setAttribute("aria-pressed", "false");
        return s;
      });
      const arrow = el("g", {}, svg);
      const top = sheets[3], ay = top.y + 76;
      el("path", { d: `M770 ${ay} H${top.x + SW + 22} M${top.x + SW + 36} ${ay - 12} L${top.x + SW + 22} ${ay} L${top.x + SW + 36} ${ay + 12}`, stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, arrow);
      txt(arrow, (770 + top.x + SW + 22) / 2 + 6, ay - 18, "Read last", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      return (t, now) => {
        const out = seg(t, 7.1, 7.6);
        sheets.forEach((s, i) => {
          const t0 = 0.4 + i * 1.0, k = ob(seg(t, t0, t0 + 0.75)), seen = seg(t, t0, t0 + 0.12);
          const L = lift(s.up, s.at, now);
          const dy = -340 * (1 - k) - 14 * L, dx = -130 * L, r = 4 * (1 - cl(k)) * (i % 2 ? 1 : -1) - 3 * L;
          s.body.setAttribute("transform", `translate(${dx} ${dy}) rotate(${r} ${s.cx} ${s.cy})`);
          s.g.setAttribute("opacity", seen * (1 - out));
        });
        const a = oc(seg(t, 4.5, 5.1));
        arrow.setAttribute("opacity", a * (1 - out)); arrow.setAttribute("transform", `translate(${30 * (1 - a)} 0)`);
      };
    },
  };

  /* ---- 2. a measuring tube fills to the 200 line mark, extras go to trays ---- */
  SC.gauge = {
    dur: 11, still: 9.8,
    build(svg, api) {
      const T = { l: 230, r: 370, top: 70, bot: 512 }, BASE = 497, GAP = 16, NB = 16, NL = 6, MARK = 244;
      el("rect", { x: T.l + 8, y: T.top + 8, width: T.r - T.l, height: T.bot - T.top, rx: 26, fill: SOFT }, svg);
      el("path", { d: `M${T.l} ${T.top} V${T.bot - 26} Q${T.l} ${T.bot} ${T.l + 26} ${T.bot} H${T.r - 26} Q${T.r} ${T.bot} ${T.r} ${T.bot - 26} V${T.top}`, fill: "#fff", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${T.l - 12} ${T.top} H${T.l + 10} M${T.r - 10} ${T.top} H${T.r + 12}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      for (let y = T.bot - 34; y > T.top + 20; y -= 32) el("path", { d: `M${T.r} ${y} H${T.r + (((T.bot - 34 - y) / 32) % 2 ? 10 : 18)}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const W = [96, 72, 88, 60, 100, 80, 68, 92, 76, 98, 64, 86, 74, 94, 70, 84, 90, 66, 80, 96, 72, 62];
      const lines = Array.from({ length: NB + NL }, (_, i) => ({ n: el("rect", { x: 0, y: -4.5, width: W[i], height: 9, rx: 4.5, fill: i < NB ? BLUE : LIL, stroke: INK, "stroke-width": 1.5 }, svg), d: i < NB ? 0.4 + i * 0.17 : 3.4 + (i - NB) * 0.22 }));
      const mark = el("g", {}, svg);
      el("path", { d: `M200 ${MARK} H${T.r + 22}`, stroke: INK, "stroke-width": 12, "stroke-linecap": "round" }, mark);
      el("path", { d: `M200 ${MARK} H${T.r + 22}`, stroke: YEL, "stroke-width": 7, "stroke-linecap": "round" }, mark);
      el("rect", { x: 62, y: MARK - 22, width: 140, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, mark);
      txt(mark, 132, MARK + 8, "200 lines", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      const TR = [["Rules", 112], ["Skills", 244], ["Imports", 376]].map(([name, y]) => {
        el("rect", { x: 528, y: y + 6, width: 170, height: 52, rx: 10, fill: SOFT }, svg);
        el("path", { d: `M520 ${y} V${y + 40} Q520 ${y + 52} 532 ${y + 52} H678 Q690 ${y + 52} 690 ${y + 40} V${y}`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
        txt(svg, 605, y + 88, name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        return y;
      });
      pill(svg, 535, 510, 140, "Tidy", () => api.seek(0));
      return (t) => {
        const settle = io(seg(t, 7.9, 8.7)), gap = GAP - 2 * settle, out = seg(t, 10.4, 11);
        lines.forEach((L, i) => {
          const k = oc(seg(t, L.d, L.d + 0.4)), bounce = Math.sin(seg(t, L.d + 0.4, L.d + 0.65) * Math.PI) * -4;
          let x = T.l + 20, y = i < NB ? BASE - i * gap : BASE - i * GAP - 12, s = 1;
          y = T.top - 10 + (y - T.top + 10) * k + bounce;
          if (i >= NB) {
            const j = i - NB, f0 = 5.4 + j * 0.3, f = io(seg(t, f0, f0 + 0.8));
            const tx = 545 + (j % 2) * 12, ty = TR[Math.floor(j / 2)] + 40 - (j % 2) * 13;
            x = x + (tx - x) * f; y = y + (ty - y) * f - Math.sin(f * Math.PI) * 70; s = 1 - 0.18 * f;
          }
          L.n.setAttribute("transform", `translate(${x} ${y}) scale(${s})`);
          L.n.setAttribute("opacity", seg(t, L.d, L.d + 0.08) * (1 - out));
        });
        const wob = Math.sin(seg(t, 4.8, 5.3) * Math.PI * 3) * 3 * (1 - seg(t, 4.8, 5.3));
        mark.setAttribute("transform", `translate(${wob} 0)`);
      };
    },
  };

  /* ---- 3. a cart takes the agents track when there is no Claude file ---- */
  SC.junction = {
    dur: 10.5, still: 9.6,
    build(svg, api) {
      hint(svg, 774, 50, "tap the switch");
      const J = [330, 330], END = 556;
      const branch = (dy) => `M50 330 H330 C390 ${330 + dy * 40} 410 ${330 + dy * 160} 480 ${330 + dy * 160} H${END}`;
      const rail = (d, g) => [el("path", { d, stroke: INK, "stroke-width": 17, fill: "none", "stroke-linecap": "round" }, g), el("path", { d, stroke: "#fff", "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, g)];
      const mid = el("g", {}, svg), midRail = rail(`M330 330 H${END}`, mid), midLen = END - 330;
      rail(branch(-1), svg); rail(branch(1), svg);
      for (let x = 70; x < 320; x += 30) el("path", { d: `M${x} 341 V346`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const up = el("path", { d: branch(-1), fill: "none" }, svg), dn = el("path", { d: branch(1), fill: "none" }, svg);
      const L = up.getTotalLength(), JD = 280 - 46, STOP = L - 58;
      const card = (y, h, label, col) => {
        const g = el("g", {}, svg);
        el("rect", { x: 566, y: y - h / 2 + 6, width: 200, height: h, rx: 18, fill: SOFT }, g);
        el("rect", { x: 560, y: y - h / 2, width: 200, height: h, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 660, y + 9, label, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        const tick = el("g", {}, g);
        el("circle", { cx: 756, cy: y - h / 2 + 4, r: 18, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tick);
        el("path", { d: `M747 ${y - h / 2 + 4} l6 6 l11 -12`, stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
        return { g, tick };
      };
      const cC = card(170, 84, "Claude file", LIL), cA = card(490, 84, "Agents file", SKY), cB = card(330, 60, "Both", MINT);
      cB.tick.remove();
      const sw = el("g", {}, svg), blade = el("g", {}, sw);
      el("circle", { cx: J[0], cy: J[1], r: 46, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, sw);
      el("rect", { x: J[0] - 6, y: J[1] - 7, width: 58, height: 14, rx: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, blade);
      el("circle", { cx: J[0], cy: J[1], r: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, sw);
      const cart = el("g", {}, svg), body = el("g", {}, cart);
      el("rect", { x: -34, y: -50, width: 68, height: 32, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
      el("path", { d: "M-20 -38 H20", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, body);
      [-18, 18].forEach((x) => el("circle", { cx: x, cy: -15, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, body));
      let user = null, lastS = 0, lastD = 0, lastOp = 1, prevT = 0;
      button(sw, "Track switch. Flip it", () => { user = { to: lastS > 0.5 ? 0 : 1, s: lastS, d: lastD, op: lastOp, at: api.now() }; api.poke(); });
      const pt = (d, s) => { const a = up.getPointAtLength(d), b = dn.getPointAtLength(d); return [a.x + (b.x - a.x) * s, a.y + (b.y - a.y) * s]; };
      return (t, now) => {
        if (t < prevT - 1) user = null; prevT = t;
        const out = seg(t, 10, 10.5);
        let s, d, opC;
        if (user) {
          const u = now - user.at, back = io(seg(u, 0, 0.8)), flip = io(seg(u, 0.8, 1.1)), go = io(seg(u, 1.2, 3));
          const from = Math.min(user.d, JD);
          s = user.s + (user.to - user.s) * flip;
          d = u < 1.2 ? user.d + (from - user.d) * back : from + (STOP - from) * go;
          opC = user.op + (1 - 0.7 * user.to - user.op) * flip;
        } else {
          s = io(seg(t, 3.3, 3.8));
          d = JD * oc(seg(t, 0.5, 2.3)) + (STOP - JD) * io(seg(t, 3.9, 5.8));
          opC = 1 - 0.7 * seg(t, 2.5, 3.3);
        }
        lastS = s; lastD = d; lastOp = opC;
        const [x, y] = pt(d, s), [x2, y2] = pt(Math.min(d + 2, L), s), ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
        cart.setAttribute("transform", `translate(${x} ${y}) rotate(${ang})`);
        cart.setAttribute("opacity", seg(t, 0, 0.3) * (1 - out));
        blade.setAttribute("transform", `rotate(${-34 + 68 * s} ${J[0]} ${J[1]})`);
        sw.setAttribute("aria-pressed", s > 0.5);
        cC.g.setAttribute("opacity", opC + (1 - opC) * out);
        const arr = seg(d, STOP - 12, STOP);
        cC.tick.setAttribute("opacity", arr * (1 - s) * (1 - out)); cA.tick.setAttribute("opacity", arr * s * (1 - out));
        const b = io(seg(t, 6.4, 7.4)), bc = ob(seg(t, 7.2, 7.7));
        midRail.forEach((n) => n.setAttribute("stroke-dasharray", `${midLen * b + 0.01} ${midLen + 40}`));
        mid.setAttribute("opacity", (b > 0 ? 1 : 0) * (1 - out));
        cB.g.setAttribute("opacity", cl(bc) * (1 - out)); cB.g.setAttribute("transform", `translate(${30 * (1 - cl(bc))} 0)`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 8, still: 8,
    build(svg) {
      el("rect", { x: 64, y: 88, width: 110, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 119, 116, "Guide", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 60, 226, "CLAUDE.md", { "font-family": MONO, "font-size": 70, "font-weight": 700 });
      txt(svg, 60, 306, "best practices", { "font-size": 70, "font-weight": 700 });
      txt(svg, 64, 366, "What to write, where it lives, how long", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 408, "Checked 26 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      const S = { x: 606, y: 140, w: 170, h: 260 }, sheet = el("g", {}, svg);
      el("rect", { x: S.x + 9, y: S.y + 9, width: S.w, height: S.h, rx: 14, fill: SOFT }, sheet);
      el("rect", { x: S.x, y: S.y, width: S.w, height: S.h, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, sheet);
      const LW = [118, 92, 126, 78, 104];
      const rules = LW.map((w, i) => el("path", { d: `M${S.x + 24} ${S.y + 44 + i * 36} H${S.x + 24 + w}`, stroke: BLUE, "stroke-width": 8, "stroke-linecap": "round" }, sheet));
      const mk = el("g", {}, svg), y1 = S.y + 44, y2 = S.y + 44 + 4 * 36, bx = S.x + S.w + 26;
      el("path", { d: `M${bx - 8} ${y1} H${bx} V${y2} H${bx - 8}`, stroke: INK, "stroke-width": 11, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, mk);
      el("path", { d: `M${bx - 8} ${y1} H${bx} V${y2} H${bx - 8}`, stroke: YEL, "stroke-width": 6, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, mk);
      txt(mk, bx + 16, (y1 + y2) / 2 - 4, "Under", { "font-size": 22, "font-weight": 700 });
      txt(mk, bx + 16, (y1 + y2) / 2 + 24, "200 lines", { "font-size": 22, "font-weight": 700 });
      return (t) => {
        const k = ob(seg(t, 0.2, 0.9));
        sheet.setAttribute("opacity", seg(t, 0.2, 0.35)); sheet.setAttribute("transform", `translate(0 ${-40 * (1 - k)})`);
        rules.forEach((r, i) => { const q = oc(seg(t, 0.8 + i * 0.18, 1.2 + i * 0.18)); r.setAttribute("stroke-dasharray", `${LW[i] * q + 0.01} 400`); r.setAttribute("opacity", q > 0 ? 1 : 0); });
        const m = oc(seg(t, 1.9, 2.4)); mk.setAttribute("opacity", m); mk.setAttribute("transform", `translate(${16 * (1 - m)} 0)`);
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
