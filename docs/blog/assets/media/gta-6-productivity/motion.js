/* Kanban Fly Board scenes for "GTA 6 launch week productivity". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", AQUA = "#3FC6C9", NAVY = "#22305E";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 16, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const oe = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bump = (x) => Math.sin(Math.PI * cl(x));
  const PI = Math.PI;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* hover and focus state: the inner group lifts or wobbles, eased with a small overshoot */
  const hover = (g, inner, css) => {
    inner.style.transformBox = "fill-box"; inner.style.transformOrigin = "center";
    inner.style.transition = matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : "transform 0.24s cubic-bezier(0.34, 1.56, 0.64, 1)";
    const on = () => { inner.style.transform = css; }, off = () => { inner.style.transform = ""; };
    g.addEventListener("pointerenter", on); g.addEventListener("pointerleave", off); g.addEventListener("focus", on); g.addEventListener("blur", off);
  };

  /* ---- shared board parts ---- */
  const board = (p, x, y, w, h) => {
    el("rect", { x: x + 8, y: y + 9, width: w, height: h, rx: 26, fill: LIL }, p);
    el("rect", { x, y, width: w, height: h, rx: 26, fill: SOFT, stroke: INK, "stroke-width": 3 }, p);
  };
  const column = (p, cx, y, h, name, dot, w = 228, fs = 20) => {
    el("rect", { x: cx - w / 2, y, width: w, height: h, rx: 18, fill: "#fff", "fill-opacity": 0.82 }, p);
    el("circle", { cx: cx - w / 2 + 22, cy: y + 30, r: 7, fill: dot, stroke: INK, "stroke-width": 2.5 }, p);
    return mono(p, cx - w / 2 + 38, y + 37, name, { "font-size": fs });
  };
  const ghost = (p, cx, cy, w = 204, h = 62) => el("rect", { x: cx - w / 2, y: cy - h / 2, width: w, height: h, rx: 12, fill: "none", stroke: LIL, "stroke-width": 2.5, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, p);
  const check = (p, x, y, r = 11) => {
    const g = el("g", {}, p);
    el("circle", { r, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
    el("path", { d: `M${-r * 0.42} ${r * 0.04} L${-r * 0.1} ${r * 0.38} L${r * 0.46} ${-r * 0.32}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    tf(g, x, y); return g;
  };
  const card = (p, w, h, label, chip, o = {}) => {
    const g = el("g", {}, p), inn = el("g", {}, g);
    const sh = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 12, fill: LIL }, inn);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, inn);
    if (o.ring) el("rect", { x: -w / 2 - 7, y: -h / 2 - 7, width: w + 14, height: h + 14, rx: 18, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, inn);
    const small = h < 50;
    el("rect", { x: -w / 2 + (small ? 10 : 14), y: o.top ? h / 2 - 19 : -h / 2 + (small ? 9 : 11), width: small ? 24 : 30, height: 9, rx: 4.5, fill: chip, stroke: INK, "stroke-width": 2 }, inn);
    if (label) mono(inn, -w / 2 + 14, o.top ? -h / 2 + 27 : h / 2 - 14, label, { "font-size": o.fs || 16 });
    else {
      el("rect", { x: -w / 2 + (small ? 10 : 14), y: h / 2 - (small ? 17 : 24), width: w * 0.5, height: 8, rx: 4, fill: LIL, "fill-opacity": 0.45 }, inn);
      if (!small) el("rect", { x: -w / 2 + 14 + w * 0.5 + 8, y: h / 2 - 24, width: w * 0.18, height: 8, rx: 4, fill: LIL, "fill-opacity": 0.28 }, inn);
    }
    const ax = w / 2 - (small ? 15 : 20), ay = -h / 2 + (small ? 14 : 18);
    if (!small) { // the owner: a round head with two dots
      el("circle", { cx: ax, cy: ay, r: 9.5, fill: o.face || SKY, stroke: INK, "stroke-width": 2 }, inn);
      el("circle", { cx: ax - 3.2, cy: ay - 0.5, r: 1.4, fill: INK }, inn); el("circle", { cx: ax + 3.2, cy: ay - 0.5, r: 1.4, fill: INK }, inn);
    }
    const badge = check(inn, ax, ay, small ? 8.5 : 11.5); badge.setAttribute("opacity", 0);
    return { g, inn, sh, badge, ax, ay, moves: [], r: 0 };
  };
  const setBadge = (c, k) => { c.badge.setAttribute("opacity", k > 0 ? 1 : 0); tf(c.badge, c.ax, c.ay, ob(cl(k))); };
  /* where a card is at time t: dealt in, then a list of flights, slides and shifts */
  const pose = (c, t) => {
    let x = c.x, y = c.y, r = c.r, s = 1, lift = 0, op = 1;
    if (c.deal != null) { const k = seg(t, c.deal, c.deal + 0.5); op = seg(t, c.deal, c.deal + 0.14); y -= 36 * (1 - ob(k)); r += 7 * (1 - oc(k)) * (c.i % 2 ? 1 : -1); s *= 0.9 + 0.1 * oc(k); }
    if (c.show != null) op = seg(t, c.show, c.show + 0.16);
    for (const m of c.moves) {
      const pre = m.kind === "fly" ? 0.22 : 0; if (t < m.at - pre) break;
      const k = seg(t, m.at, m.at + m.dur), dx = m.to[0] - x, dy = m.to[1] - y, L = Math.hypot(dx, dy) || 1, sg = dx < 0 ? -1 : 1;
      const u = seg(t, m.at + m.dur, m.at + m.dur + 0.42), b = Math.sin(u * PI * 2) * (1 - u);
      if (m.kind === "fly") {
        const a = oc(seg(t, m.at - 0.22, m.at)) * (1 - seg(t, m.at, m.at + 0.16)), e = io(k), h = Math.sin(PI * e);
        x += dx * e - (dx / L) * 9 * a; y += dy * e - (dy / L) * 9 * a - (m.arc == null ? 46 : m.arc) * h + 5 * b;
        r += (m.tilt || 4) * h * sg - 2.5 * a * sg + (m.dr || 0) * e; s *= (1 + 0.06 * h - 0.04 * a) * (m.s0 ? m.s0 + (1 - m.s0) * e : 1); lift = Math.max(lift, h);
      } else if (m.kind === "slide") {
        const e = io(k); x += dx * e + (dx / L) * 6 * b; y += dy * e + (dy / L) * 6 * b; lift = Math.max(lift, 0.35 * Math.sin(PI * e)); r += (m.dr || 0) * e;
      } else { const e = oe(k); x += dx * e; y += dy * e; }
    }
    return { x, y, r, s, lift, op };
  };
  const put = (c, q) => { tf(c.g, q.x, q.y, q.s, q.r); c.sh.setAttribute("transform", `translate(${4 + 5 * q.lift} ${5 + 9 * q.lift})`); c.sh.setAttribute("fill-opacity", 1 - 0.35 * q.lift); c.g.setAttribute("opacity", q.op); };
  /* stationery props, drawn around 0,0 */
  const pencil = (p) => {
    const g = el("g", {}, p), a = { stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" };
    el("rect", Object.assign({ x: -86, y: -9, width: 16, height: 18, rx: 5, fill: LIL }, a), g);
    el("rect", Object.assign({ x: -72, y: -9, width: 13, height: 18, fill: SKY }, a), g);
    el("rect", Object.assign({ x: -59, y: -9, width: 96, height: 18, fill: YEL }, a), g);
    el("path", { d: "M-52 -3 H30", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", "stroke-opacity": 0.7 }, g);
    el("path", Object.assign({ d: "M37 -9 L64 0 L37 9 Z", fill: "#fff" }, a), g);
    el("path", { d: "M55 -3 L64 0 L55 3 Z", fill: INK, stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, g);
    return g;
  };
  const clip = (p) => { const g = el("g", {}, p); el("path", { d: "M0 6 V-22 a8 8 0 0 1 16 0 V12 a13 13 0 0 1 -26 0 V-14", stroke: NAVY, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g); return g; };
  const pill = (p, w, h, s, fs) => {
    const g = el("g", {}, p);
    el("rect", { x: -w / 2 + 5, y: -h / 2 + 6, width: w, height: h, rx: h / 2, fill: LIL }, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    txt(g, 0, fs * 0.35, s, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 });
    return g;
  };
  const sparks = (p, n, col) => Array.from({ length: n }, () => el("path", { d: "M0 0 H12", stroke: col || INK, "stroke-width": 3, "stroke-linecap": "round" }, p));
  const burst = (ls, x, y, k, r0 = 16, r1 = 44) => ls.forEach((n, i) => { const a = (i / ls.length) * 360 + 14, r = r0 + (r1 - r0) * oc(k); n.setAttribute("transform", `translate(${x} ${y}) rotate(${a}) translate(${r} 0) scale(${1 - 0.5 * k} 1)`); n.setAttribute("opacity", k <= 0 || k >= 1 ? 0 : 1 - k * k); });
  const XS = [158, 400, 642];

  const SC = {};

  /* ---- 1. the freeze: safe cards fly to Queued, scary ones slide under a frost lid ---- */
  SC.freeze = {
    dur: 11.6, still: 8.6,
    build(svg, api) {
      const btn = el("g", {}, svg), inn = el("g", {}, btn);
      el("rect", { x: 17, y: 101, width: 774, height: 484, rx: 34, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, btn);
      board(inn, 28, 112, 744, 458);
      [["Backlog", LIL], ["Queued", MINT], ["Frozen", SKY]].forEach(([n, c], i) => column(inn, XS[i], 126, 430, n, c));
      const row = (i) => 216 + i * 72;
      for (let i = 0; i < 5; i++) ghost(inn, XS[0], row(i));
      const pc = clip(inn); tf(pc, 728, 118, 1, 14);
      const dyn = el("g", {}, inn);
      const defs = [["Write docs", MINT, 1, 0, SKY], ["Database migration", LIL, 2, 0, LIL], ["Fix flaky test", YEL, 1, 1, MINT], ["Pricing change", BLUE, 2, 1, YEL], ["Research brief", SKY, 1, 2, LIL]];
      const cards = defs.map(([label, chip, col, slot, face], i) => {
        const c = card(dyn, 204, 62, label, chip, { face }); c.i = i; c.x = XS[0]; c.y = row(i); c.deal = 0.3 + i * 0.1; c.frozen = col === 2;
        const at = 1.9 + i * 0.72;
        for (let j = 0; j < i; j++) c.moves.push({ kind: "shift", at: 1.9 + j * 0.72 + 0.3 + (i - j) * 0.05, dur: 0.45, to: [XS[0], row(i - j - 1)] });
        c.moves.push(col === 1 ? { kind: "fly", at, dur: 0.68, to: [XS[1], row(slot)], arc: 52 } : { kind: "slide", at, dur: 0.85, to: [XS[2], row(slot)] });
        return c;
      });
      /* the frost lid, hinged on its top edge */
      const lid = el("g", {}, dyn), LW = 220, LH = 156;
      el("rect", { x: -LW / 2, y: 0, width: LW, height: LH, rx: 16, fill: SKY, "fill-opacity": 0.36, stroke: INK, "stroke-width": 3 }, lid);
      el("path", { d: "M-30 30 L-12 12 M-12 34 L10 12", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", "stroke-opacity": 0.9 }, lid);
      el("rect", { x: -26, y: LH - 9, width: 52, height: 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, lid);
      const flakes = [[LW / 2 - 8, 6, 17], [-LW / 2 + 6, LH - 10, 13], [LW / 2 - 30, LH + 2, 10]].map(([x, y, r]) => {
        const g = el("g", {}, dyn);
        el("circle", { r, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        for (let a = 0; a < 3; a++) el("path", { d: `M${-r * 0.62} 0 H${r * 0.62}`, stroke: NAVY, "stroke-width": 2.5, "stroke-linecap": "round", transform: `rotate(${a * 60})` }, g);
        return { g, x: XS[2] + x, y: 178 + y };
      });
      const ban = el("g", {}, svg), bin = el("g", {}, ban);
      el("path", { d: "M-196 -31 V-240 M196 -31 V-240", stroke: NAVY, "stroke-width": 2.5 }, bin);
      el("rect", { x: -265, y: -25, width: 540, height: 62, rx: 16, fill: LIL }, bin);
      el("rect", { x: -270, y: -31, width: 540, height: 62, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, bin);
      [-196, 196].forEach((x) => el("circle", { cx: x, cy: -31, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, bin));
      txt(bin, 0, 11, "Nov 19, nothing scary ships", { "text-anchor": "middle", "font-size": 31, "font-weight": 700 });
      button(btn, "Deal the cards again", () => api.seek(0));
      hover(btn, inn, "translateY(-4px)");
      return (t, now) => {
        const fade = 1 - io(seg(t, 11.1, 11.55));
        dyn.setAttribute("opacity", fade); ban.setAttribute("opacity", fade);
        const thunk = 4 * bump(seg(t, 6.28, 6.6));
        cards.forEach((c) => { const q = pose(c, t); if (c.frozen) q.y += thunk; put(c, q); });
        const k = seg(t, 5.9, 6.5);
        lid.setAttribute("transform", `translate(${XS[2]} ${178 + thunk * 0.6}) scale(1 ${Math.max(0.001, ob(k))})`); lid.setAttribute("opacity", seg(t, 5.9, 6.0));
        flakes.forEach((f, i) => { const p = seg(t, 6.5 + i * 0.12, 6.95 + i * 0.12); tf(f.g, f.x, f.y, ob(p), -90 * (1 - oc(p)) + Math.sin(now * 0.8 + i) * 6); f.g.setAttribute("opacity", p > 0 ? 1 : 0); });
        const d = seg(t, 7.3, 7.95), u = seg(t, 7.3, 8.5);
        tf(bin, 400, -70 + 128 * ob(d), 1, 5 * (1 - u) * Math.cos(u * 11)); bin.setAttribute("opacity", d > 0 ? 1 : 0);
        tf(pc, 728, 118 + Math.sin(now * 1.1) * 1.5, 1, 14 + Math.sin(now * 0.9) * 2);
      };
    },
  };

  /* ---- 2. the chain: a blocked card waits, then moves by itself ---- */
  SC.chain = {
    dur: 11.6, still: 8.6,
    build(svg, api) {
      board(svg, 28, 30, 744, 452);
      [["To do", LIL], ["Doing", YEL], ["Done", MINT]].forEach(([n, c], i) => column(svg, XS[i], 44, 424, n, c));
      const A0 = [XS[0], 184], B0 = [XS[1], 294], A1 = [XS[1], 222], B1 = [XS[2], 294];
      ghost(svg, A0[0], A0[1]); ghost(svg, A1[0], A1[1]); ghost(svg, B0[0], B0[1]);
      const pc = clip(svg); tf(pc, 728, 36, 1, 14);
      const dyn = el("g", {}, svg);
      const fill = [[XS[0], 256, SKY, 0], [XS[0], 328, BLUE, 0], [XS[1], 150, AQUA, 0], [XS[2], 150, MINT, 1], [XS[2], 222, LIL, 1]].map(([x, y, chip, done], i) => {
        const c = card(dyn, 204, 62, "", chip, { face: [LIL, YEL, SKY, MINT, SKY][i] }); c.i = i; c.x = x; c.y = y; c.deal = 0.2 + i * 0.09; if (done) setBadge(c, 1); return c;
      });
      const tag = el("g", {}, dyn), tin = el("g", {}, tag);
      el("rect", { x: -107, y: -13, width: 222, height: 32, rx: 16, fill: NAVY, "fill-opacity": 0.22 }, tin);
      el("rect", { x: -111, y: -16, width: 222, height: 32, rx: 16, fill: LIL, stroke: INK, "stroke-width": 2.5 }, tin);
      mono(tin, 0, 5, "Blocked by Fix login bug", { "text-anchor": "middle", "font-size": 14 });
      const cA = card(dyn, 204, 62, "Changelog", LIL, { face: YEL, ring: 1, fs: 17 }); cA.i = 1; cA.x = A0[0]; cA.y = A0[1]; cA.deal = 0.65;
      const cB = card(dyn, 204, 62, "Fix login bug", YEL, { face: MINT, ring: 1, fs: 17 }); cB.i = 0; cB.x = B0[0]; cB.y = B0[1]; cB.deal = 0.75;
      cB.moves.push({ kind: "fly", at: 4.5, dur: 0.72, to: B1, arc: 56 });
      cA.moves.push({ kind: "fly", at: 5.75, dur: 0.72, to: A1, arc: 50 });
      const N = 7, links = Array.from({ length: N }, (_, i) => el("ellipse", { rx: i % 2 ? 8 : 10, ry: i % 2 ? 4 : 6, fill: i % 2 ? SKY : "#fff", stroke: INK, "stroke-width": 3 }, dyn));
      const sp = sparks(dyn, 7);
      const shake = (t) => bump(seg(t, 2.1, 2.9)) ** 2 + bump(seg(t, 3.2, 4.1)) ** 2;
      const pa = (t) => { const q = pose(cA, t), e = shake(t); q.x += Math.sin(t * 58) * 3.2 * e; q.r += Math.sin(t * 47) * 2.2 * e; return q; };
      const ends = (t) => { const a = pa(t), b = pose(cB, t); return [a.x + 102, a.y + 8, b.x - 102, b.y - 6, a, b]; };
      let snap = 4.7; for (let s = 4.4; s < 5.3; s += 0.01) { const e = ends(s); if (Math.hypot(e[2] - e[0], e[3] - e[1]) > 150) { snap = s; break; } }
      const es = ends(snap), mid = [(es[0] + es[2]) / 2, (es[1] + es[3]) / 2];
      const last = pill(svg, 548, 58, "Blocked cards wait, nobody pings", 27);
      const ask = () => api.seek(1.1);
      button(cA.g, "Changelog waits on Fix login bug", ask); hover(cA.g, cA.inn, "translateY(-5px) rotate(-1.5deg)");
      button(cB.g, "Fix login bug, the card Changelog waits on", ask); hover(cB.g, cB.inn, "translateY(-5px) rotate(1.5deg)");
      return (t, now) => {
        const fade = 1 - io(seg(t, 11.1, 11.55));
        dyn.setAttribute("opacity", fade);
        fill.forEach((c) => put(c, pose(c, t)));
        const [ax, ay, bx, by, qa, qb] = ends(t);
        put(cA, qa); put(cB, qb);
        setBadge(cB, seg(t, 5.3, 5.65));
        const e = shake(t), tp = seg(t, 1.75, 2.15), fall = seg(t, 6.15, 6.75), fu = seg(t, 6.15, 7.2);
        tf(tag, A0[0] + Math.sin(t * 58 + 1) * 1.6 * e, 124 + (A0[1] - 124) * ob(fall), ob(tp), -5 * oc(fall) + 4 * (1 - fu) * Math.sin(fu * 14) * (fall > 0 ? 1 : 0) + Math.sin(t * 41) * 1.2 * e);
        tag.setAttribute("opacity", tp > 0 ? 1 : 0);
        const tau = t - snap;
        links.forEach((n, i) => {
          const born = seg(t, 1.2 + i * 0.07, 1.42 + i * 0.07); let x, y, r, op = born > 0 ? 1 : 0, s = ob(born);
          if (tau < 0) {
            const u = i / (N - 1), d = Math.hypot(bx - ax, by - ay), sag = Math.sqrt(Math.max(0, 118 * 118 - d * d)) * 0.42;
            x = ax + (bx - ax) * u - sag * 4 * u * (1 - u) * 0.5; y = ay + (by - ay) * u + sag * 4 * u * (1 - u) * 0.35;
            r = Math.atan2(by - ay + sag * 1.4 * (1 - 2 * u), bx - ax - sag * 2 * (1 - 2 * u)) * 180 / PI;
          } else if (i === 3) { x = mid[0] + 60 * tau; y = mid[1] - 90 * tau + 260 * tau * tau; r = tau * 500; op = 1 - seg(tau, 0.25, 0.7); }
          else {
            const side = i < 3, k = side ? i : N - 1 - i, ox = side ? ax : bx, oy = side ? ay : by;
            const phi = Math.atan2(side ? es[2] - es[0] : es[0] - es[2], side ? es[3] - es[1] : es[1] - es[3]);
            const th = phi * Math.exp(-2.6 * tau) * Math.cos(7.5 * tau) + Math.sin(now * 1.3 + (side ? 0 : 2)) * 0.05;
            x = ox + Math.sin(th) * 16 * k; y = oy + Math.cos(th) * 16 * k; r = 90 - th * 180 / PI;
          }
          tf(n, x, y, s, r); n.setAttribute("opacity", op);
        });
        burst(sp, mid[0], mid[1], seg(tau, 0, 0.42));
        const lk = seg(t, 7.3, 7.85), lu = seg(t, 7.3, 8.4);
        tf(last, 400, 538 + 40 * (1 - ob(lk)), 0.7 + 0.3 * ob(lk), -4 * (1 - lu) * Math.cos(lu * 10)); last.setAttribute("opacity", seg(t, 7.3, 7.42) * fade);
        tf(pc, 728, 36 + Math.sin(now * 1.1) * 1.5, 1, 14 + Math.sin(now * 0.9) * 2);
      };
    },
  };

  /* ---- 3. the batch: drafts stack up, one stamp clears the stack, twice a day ---- */
  SC.batch = {
    dur: 12.4, still: 9.3,
    build(svg, api) {
      board(svg, 28, 118, 744, 452);
      const CA = 380, CB = 634, LBL = ["Status note", "Changelog", "Triage", "Meeting summary"], CH = [SKY, LIL, YEL, MINT], FC = [MINT, YEL, SKY, LIL];
      column(svg, CA, 132, 424, "Needs approval", YEL, 244); column(svg, CB, 132, 424, "Sent", MINT, 244);
      const sy = (i) => 214 + i * 44, ty = (i) => 212 + i * 68, TR = [142, 232];
      for (let i = 0; i < 4; i++) ghost(svg, CB, ty(i), 208, 60);
      /* the drafts tray */
      [[-5, 4], [4, -3], [-1, 0]].forEach(([r, d], i) => { const g = el("g", { transform: `translate(${TR[0] + d} ${TR[1] - 8 - i * 5}) rotate(${r})` }, svg); el("rect", { x: -58, y: -40, width: 116, height: 80, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); el("rect", { x: -44, y: -26, width: 52, height: 8, rx: 4, fill: LIL, "fill-opacity": 0.45 }, g); });
      const dyn = el("g", {}, svg);
      const mk = (set) => LBL.map((label, i) => {
        const c = card(dyn, 208, 60, label, CH[i], { face: FC[(i + set) % 4], fs: 17, top: 1 }); c.i = i; c.x = TR[0]; c.y = TR[1] - 6;
        const at = set ? 6.35 + i * 0.3 : 1.0 + i * 0.5; c.show = at - 0.2;
        c.moves.push({ kind: "fly", at, dur: set ? 0.55 : 0.62, to: [CA, sy(i)], arc: 60, s0: 0.5, dr: i % 2 ? 1.6 : -1.6 });
        if (!set) c.moves.push({ kind: "fly", at: 4.62 + (3 - i) * 0.13, dur: 0.64, to: [CB, ty(i)], arc: 54, dr: i % 2 ? -1.6 : 1.6 });
        return c;
      });
      const one = mk(0), two = mk(1);
      el("path", { d: `M${TR[0] - 74} ${TR[1] + 14} V${TR[1] + 44} Q${TR[0] - 74} ${TR[1] + 56} ${TR[0] - 62} ${TR[1] + 56} H${TR[0] + 62} Q${TR[0] + 74} ${TR[1] + 56} ${TR[0] + 74} ${TR[1] + 44} V${TR[1] + 14} Z`, fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      el("path", { d: `M${TR[0] - 22} ${TR[1] + 35} H${TR[0] + 22}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const pen = pencil(svg);
      /* the clock tile */
      const tile = el("g", {}, svg);
      el("rect", { x: -139, y: -28, width: 288, height: 66, rx: 18, fill: LIL }, tile);
      const face = el("rect", { x: -144, y: -34, width: 288, height: 66, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, tile);
      el("circle", { cx: -106, cy: -1, r: 21, fill: "#fff", stroke: INK, "stroke-width": 3 }, tile);
      [0, 90, 180, 270].forEach((a) => el("path", { d: "M0 -17 V-14", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", transform: `translate(-106 -1) rotate(${a})` }, tile));
      const hm = el("path", { d: "M0 0 V-15", stroke: NAVY, "stroke-width": 2.5, "stroke-linecap": "round" }, tile), hh = el("path", { d: "M0 0 V-10", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, tile);
      el("circle", { cx: -106, cy: -1, r: 3, fill: INK }, tile);
      const tl = mono(tile, -72, 6, "Morning window", { "font-size": 19 });
      const last = pill(svg, 312, 58, "Two windows a day", 27);
      const sp = sparks(svg, 9);
      /* the stamp: the one control */
      const btn = el("g", {}, svg), R = [142, 500], H = [396, 232], T = [396, 322];
      el("rect", { x: R[0] - 66, y: R[1] - 96, width: 132, height: 122, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, btn);
      el("rect", { x: R[0] - 50, y: R[1] + 3, width: 108, height: 20, rx: 8, fill: LIL }, btn);
      el("rect", { x: R[0] - 54, y: R[1] - 2, width: 108, height: 20, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, btn);
      el("rect", { x: R[0] - 44, y: R[1] + 3, width: 88, height: 9, rx: 4.5, fill: MINT, stroke: INK, "stroke-width": 2 }, btn);
      const st = el("g", {}, btn), sin = el("g", {}, st);
      el("rect", { x: -13, y: -50, width: 26, height: 34, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sin);
      el("circle", { cx: 0, cy: -60, r: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, sin);
      el("path", { d: "M-9 -68 a12 12 0 0 1 12 -4", stroke: "#fff", "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, sin);
      el("rect", { x: -36, y: -24, width: 72, height: 18, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, sin);
      el("rect", { x: -40, y: -8, width: 80, height: 9, rx: 4, fill: MINT, stroke: INK, "stroke-width": 2.5 }, sin);
      button(btn, "Approve the stack again", () => api.seek(3.15));
      hover(btn, sin, "translateY(-7px) rotate(-9deg)");
      return (t, now) => {
        const fade = 1 - io(seg(t, 11.9, 12.35));
        dyn.setAttribute("opacity", fade);
        const hit = 4.12, press = 5 * bump(seg(t, hit, hit + 0.26));
        one.forEach((c, i) => { const q = pose(c, t); if (t < 4.6) q.y += press * (1 - i * 0.12); put(c, q); setBadge(c, seg(t, hit + 0.02 + i * 0.05, hit + 0.34 + i * 0.05)); });
        two.forEach((c) => put(c, pose(c, t)));
        /* stamp path: squat, arc up, slam, hold, home */
        const sq = bump(seg(t, 3.3, 3.52)), up = io(seg(t, 3.5, 4.0)), dn = seg(t, 4.0, hit), back = io(seg(t, 4.42, 5.05)), bu = seg(t, 5.05, 5.45);
        let x = R[0] + (H[0] - R[0]) * up, y = R[1] + (H[1] - R[1]) * up - 70 * Math.sin(PI * up), s = 1 + 0.7 * up, r = -14 * Math.sin(PI * up);
        y += (T[1] - H[1]) * dn * dn * dn;
        if (back > 0) { x = T[0] + (R[0] - T[0]) * back; y = T[1] + (R[1] - T[1]) * back - 80 * Math.sin(PI * back); s = 1.7 - 0.7 * back; r = 12 * Math.sin(PI * back); }
        y += 4 * Math.sin(bu * PI * 2) * (1 - bu);
        const squash = 1 - 0.1 * sq - 0.2 * bump(seg(t, hit, hit + 0.3));
        st.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s * (2 - squash)} ${s * squash})`);
        burst(sp, T[0], T[1] - 4, seg(t, hit, hit + 0.45), 70, 122);
        /* clock and tile */
        const open = t >= 3.15 && t < 5.5, sw = io(seg(t, 5.5, 6.3)), pre = seg(t, 0, 3.15);
        const pop = 0.07 * bump(seg(t, 3.15, 3.5)) + 0.06 * bump(seg(t, 5.85, 6.2));
        tf(tile, 180, 62, 1 + pop, -2 * bump(seg(t, 3.15, 3.5)));
        face.setAttribute("fill", open ? YEL : "#fff");
        hh.setAttribute("transform", `translate(-106 -1) rotate(${300 + 30 * pre + 150 * sw})`); hm.setAttribute("transform", `translate(-106 -1) rotate(${360 * pre + 1800 * sw})`);
        const o1 = seg(t, 5.72, 5.86), o2 = seg(t, 5.86, 6.08);
        tl.textContent = t < 5.86 ? "Morning window" : "Afternoon window";
        tl.setAttribute("opacity", t < 5.86 ? 1 - o1 : o2); tl.setAttribute("transform", `translate(0 ${t < 5.86 ? -9 * o1 : 9 * (1 - oc(o2))})`);
        const lk = seg(t, 8.3, 8.85), lu = seg(t, 8.3, 9.25);
        tf(last, 610, 62 - 40 * (1 - ob(lk)), 0.7 + 0.3 * ob(lk), 4 * (1 - lu) * Math.cos(lu * 10)); last.setAttribute("opacity", seg(t, 8.3, 8.42) * fade);
        tf(pen, 142, 372 + Math.sin(now * 1.2) * 2, 0.9, -16 + Math.sin(now * 0.8) * 2.5);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 9, still: 4.6,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 122, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      mono(svg, 125, 70.5, "Guides", { "text-anchor": "middle", "font-size": 18 });
      mono(svg, 896, 70.5, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 168, "GTA 6 launch week", { "font-size": 74, "font-weight": 700 });
      txt(svg, 62, 246, "productivity", { "font-size": 74, "font-weight": 700 });
      el("path", { d: "M68 272 H288", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 322, "How teams keep shipping while everyone plays", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const pen = pencil(svg), pc = clip(svg);
      el("rect", { x: 71, y: 354, width: 832, height: 172, rx: 22, fill: LIL }, svg);
      el("rect", { x: 64, y: 346, width: 832, height: 172, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const CX = [207, 480, 753], slot = (c, i) => [CX[c] - 63.5 + (i % 2) * 127, 433 + Math.floor(i / 2) * 50];
      [["Queued", SKY], ["Doing", YEL], ["Approved", MINT]].forEach(([n, c], i) => column(svg, CX[i], 355, 154, n, c, 262, 17));
      for (let c = 0; c < 3; c++) for (let i = 0; i < 4; i++) { const [x, y] = slot(c, i); if (!(c < 2 && i === 0) && !(c < 2 && i === 3)) ghost(svg, x, y, 119, 42); }
      const lay = el("g", {}, svg);
      [[0, LIL], [1, AQUA]].forEach(([c, chip]) => { const k = card(lay, 119, 42, "", chip); const [x, y] = slot(c, 0); k.x = x; k.y = y; k.i = c; put(k, pose(k, 0)); });
      const movers = [[1, 1, YEL], [1, 2, SKY], [0, 1, LIL], [0, 2, BLUE]].map(([c, i, chip], n) => {
        const k = card(lay, 119, 42, "", chip), [x, y] = slot(c, i); k.x = x; k.y = y; k.i = n;
        k.moves.push({ kind: "fly", at: 1.0 + n * 0.62, dur: 0.66, to: slot(2, n), arc: 40 + n * 6, tilt: 5 });
        k.moves.push({ kind: "slide", at: 7.5 + (3 - n) * 0.12, dur: 0.8, to: [x, y] });
        k.land = 1.0 + n * 0.62 + 0.66; return k;
      });
      return (t, now) => {
        movers.forEach((k) => { put(k, pose(k, t)); setBadge(k, t > 7.4 ? 1 - seg(t, 7.4, 7.5) : seg(t, k.land - 0.05, k.land + 0.3)); });
        tf(pen, 826, 196 + Math.sin(now * 1.1) * 3, 1.15, -38 + Math.sin(now * 0.7) * 2);
        tf(pc, 842, 338 + Math.sin(now * 1.3) * 1.2, 1, 12);
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
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, held ? 0 : now); };
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
