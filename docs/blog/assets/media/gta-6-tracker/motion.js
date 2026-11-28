/* Radar sweep scenes for "GTA 6 tracker". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", NAVY = "#22305E", AQUA = "#3FC6C9";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const ios = (x) => (1 - Math.cos(Math.PI * x)) / 2;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const at = (c, s) => `translate(${c[0]} ${c[1]}) scale(${Math.max(0.001, s)}) translate(${-c[0]} ${-c[1]})`;
  const pol = (c, r, a) => [c[0] + r * Math.sin((a * Math.PI) / 180), c[1] - r * Math.cos((a * Math.PI) / 180)];
  const f1 = (v) => v.toFixed(1);
  let count = 0;
  const uid = () => "mgr" + ++count;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* hover or focus, eased over 200 ms; returns 0 to 1 */
  const hover = (g) => {
    const h = { on: 0, t: -9 }, sec = () => performance.now() / 1000;
    const set = (v) => () => { if (h.on !== v) { h.on = v; h.t = sec(); } };
    g.addEventListener("pointerenter", set(1)); g.addEventListener("pointerleave", set(0));
    g.addEventListener("focus", set(1)); g.addEventListener("blur", set(0));
    return () => { const k = oc(cl((sec() - h.t) / 0.2)); return h.on ? k : 1 - k; };
  };
  /* loop tail fade, and a tap that fades the scene out and runs it again */
  const replay = (api, D) => {
    const s = { ping: -99, pend: false };
    s.tap = () => { s.ping = api.now(); s.pend = true; api.poke(); };
    s.vis = (t, now) => {
      if (s.pend && now - s.ping >= 0.3) { s.pend = false; api.seek(0); return -1; }
      return (1 - seg(t, D - 0.4, D)) * (s.pend ? 1 - seg(now - s.ping, 0, 0.3) : 1);
    };
    return s;
  };

  /* ---- shared parts: modular grid, scope, beam, blip, leader, label card ---- */
  const grid = (svg, W, H) => {
    let d = "";
    for (let x = 100; x < W; x += 100) d += `M${x} 0V${H}`;
    for (let y = 100; y < H; y += 100) d += `M0 ${y}H${W}`;
    return el("path", { d, stroke: SOFT, "stroke-width": 1.5, fill: "none" }, svg);
  };
  const scope = (parent, c, R) => {
    const [cx, cy] = c, g = el("g", {}, parent);
    const sh = el("circle", { cx: cx + 8, cy: cy + 10, r: R, fill: LIL }, g);
    const glow = el("circle", { cx, cy, r: R + 8, fill: "none", stroke: AQUA, "stroke-width": 8, opacity: 0 }, g);
    const face = el("g", {}, g);
    el("circle", { cx, cy, r: R, fill: "#fff", stroke: INK, "stroke-width": 3 }, face);
    const rings = [1 / 3, 2 / 3].map((f) => el("circle", { cx, cy, r: R * f, fill: "none", stroke: NAVY, "stroke-width": 1.5 }, face));
    const cross = el("path", { d: `M${cx - R + 16} ${cy} H${cx + R - 16} M${cx} ${cy - R + 16} V${cy + R - 16}`, stroke: NAVY, "stroke-width": 1.5, "stroke-dasharray": "1 7", "stroke-linecap": "round" }, face);
    let d = "";
    for (let a = 0; a < 360; a += 10) { const p = pol(c, R - 4, a), q = pol(c, R - (a % 30 ? 9 : 15), a); d += `M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`; }
    const ticks = el("path", { d, stroke: NAVY, "stroke-width": 2, "stroke-linecap": "round" }, face);
    const id = uid(), cp = el("clipPath", { id }, g);
    el("circle", { cx, cy, r: R - 1.5 }, cp);
    el("circle", { cx, cy, r: R + 16, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 7", "stroke-linecap": "round", class: "mg-ring" }, g);
    const enter = (t, t0 = 0, h = 0, m = 0) => {
      face.setAttribute("transform", at(c, 0.86 + 0.14 * ob(seg(t, t0 + 0.05, t0 + 0.6))));
      face.setAttribute("opacity", seg(t, t0, t0 + 0.25));
      const s = oc(seg(t, t0 + 0.2, t0 + 0.8));
      sh.setAttribute("transform", `translate(${-8 * (1 - s) + 3 * h} ${-10 * (1 - s) + 4 * h})`);
      sh.setAttribute("opacity", seg(t, t0 + 0.15, t0 + 0.4));
      glow.setAttribute("opacity", 0.4 * h);
      rings.forEach((r, i) => { const q = ob(seg(t, t0 + 0.25 + i * 0.1, t0 + 0.75 + i * 0.1)); r.setAttribute("transform", at(c, q * (1 - 0.4 * m))); r.setAttribute("opacity", 0.5 * cl(q * 3) * (1 - m)); });
      cross.setAttribute("opacity", 0.7 * seg(t, t0 + 0.5, t0 + 0.9) * (1 - m));
      ticks.setAttribute("opacity", seg(t, t0 + 0.45, t0 + 0.9) * (1 - m));
    };
    return { g, face, id, enter };
  };
  /* the beam: stacked wedges make a tail that fades behind a bright leading edge */
  const beam = (parent, c, R, clip, hand) => {
    const g = el("g", { "clip-path": `url(#${clip})`, opacity: 0 }, parent), rot = el("g", {}, g);
    for (let i = 1; i <= 56; i++) { const p = pol(c, R, -i); el("path", { d: `M${c[0]} ${c[1]} L${f1(p[0])} ${f1(p[1])} A${R} ${R} 0 0 1 ${c[0]} ${c[1] - R} Z`, fill: AQUA, opacity: 0.024 }, rot); }
    el("path", { d: `M${c[0]} ${c[1]} V${c[1] - R}`, stroke: AQUA, "stroke-width": 4, "stroke-linecap": "round" }, rot);
    if (hand) el("path", { d: `M${c[0]} ${c[1]} V${c[1] - R * 0.58}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, rot);
    return (a, op) => { rot.setAttribute("transform", `rotate(${f1(a)} ${c[0]} ${c[1]})`); g.setAttribute("opacity", op); };
  };
  const blip = (parent, p, r = 9, fill = MINT, glowCol = MINT) => {
    const [x, y] = p, g = el("g", {}, parent);
    const halo = el("circle", { cx: x, cy: y, r: r + 9, fill: glowCol, opacity: 0 }, g);
    const fl = el("circle", { cx: x, cy: y, r, fill: "none", stroke: glowCol, "stroke-width": 4, opacity: 0 }, g);
    const dot = el("g", {}, g);
    const body = el("circle", { r, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, dot);
    const hi = el("circle", { cx: -r * 0.32, cy: -r * 0.36, r: r * 0.26, fill: "#fff", opacity: 0 }, dot);
    return (s, pre = 1, h = 0) => {
      const on = s >= 0, pop = on ? ob(seg(s, 0, 0.3)) : 0;
      body.setAttribute("fill", on ? fill : "#fff"); hi.setAttribute("opacity", on && fill !== "#fff" ? 0.9 : 0);
      tf(dot, x, y, (on ? 0.7 + 0.3 * pop + 0.3 * Math.sin(seg(s, 0, 0.5) * Math.PI) : 0.6) * (1 + 0.2 * h));
      dot.setAttribute("opacity", on ? 1 : 0.5 * pre);
      const f = seg(s, 0, 0.8);
      fl.setAttribute("r", r + 32 * oc(f)); fl.setAttribute("opacity", on ? 1 - f : 0); fl.setAttribute("stroke-width", 5 - 3 * f);
      halo.setAttribute("opacity", (on ? Math.max(0.28, 0.6 * (1 - seg(s, 0, 1.2))) : 0) + 0.3 * h * pre);
    };
  };
  /* a callout line: 45 degrees off the blip, then level into the card */
  const leader = (parent, p, ex, ey, dash) => {
    const dy = ey - p[1], sx = ex > p[0] ? 1 : -1, sy = dy > 0 ? 1 : -1, flat = Math.abs(dy) < 6;
    const a = flat ? [p[0] + sx * 14, p[1]] : [p[0] + sx * 10, p[1] + sy * 10], b = [p[0] + sx * Math.abs(dy), ey];
    const pts = flat ? [a, [ex, ey]] : [a, b, [ex, ey]];
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const line = el("path", { d: "M" + pts.map((q) => `${f1(q[0])} ${f1(q[1])}`).join("L"), stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0 }, parent);
    if (dash) line.setAttribute("stroke-dasharray", "7 7");
    return (k) => { if (!dash) line.setAttribute("stroke-dasharray", `${f1(L * k)} ${f1(L + 6)}`); line.setAttribute("opacity", dash ? cl(k) : k > 0.01 ? 1 : 0); };
  };
  /* label card in the mono face; x is the left edge (or right edge, or middle), y the middle */
  const card = (parent, x, y, s, o = {}) => {
    const fs = o.fs || 15.5, h = o.h || 34, w = Math.round(s.length * fs * 0.6) + 24, rx = o.pill ? h / 2 : 7;
    const x0 = o.right ? x - w : o.mid ? x - w / 2 : x, ox = o.right ? w : o.mid || o.pill ? w / 2 : 0;
    const g = el("g", { opacity: 0 }, parent);
    el("rect", { x: 4, y: -h / 2 + 5, width: w, height: h, rx, fill: LIL }, g);
    const top = el("g", {}, g);
    el("rect", Object.assign({ x: 0, y: -h / 2, width: w, height: h, rx, fill: o.fill || "#fff", stroke: INK, "stroke-width": 2.5 }, o.dash ? { "stroke-dasharray": "7 5" } : {}), top);
    const tx = txt(top, 12, fs * 0.36, "", { "font-family": MONO, "font-size": fs, "font-weight": 700 });
    if (o.b) { el("tspan", {}, tx).textContent = s.slice(0, o.b); el("tspan", { "font-weight": 500 }, tx).textContent = s.slice(o.b); } else tx.textContent = s;
    return { w, x0, set(k, dx = 0, dy = 0, rot = 0, lift = 0) {
      g.setAttribute("opacity", cl(k * 4));
      g.setAttribute("transform", `translate(${f1(x0 + dx)} ${f1(y + dy)}) translate(${ox} 0) rotate(${f1(rot)}) scale(${(0.5 + 0.5 * k).toFixed(3)}) translate(${-ox} 0)`);
      top.setAttribute("transform", `translate(${f1(-1.5 * lift)} ${f1(-3 * lift)})`);
    } };
  };
  const pinger = (svg, c, R) => {
    const n = el("circle", { cx: c[0], cy: c[1], r: 1, fill: "none", stroke: AQUA, opacity: 0, "pointer-events": "none" }, svg);
    return (d) => { const k = seg(d, 0, 0.9); n.setAttribute("r", f1(10 + (R + 14) * oc(k))); n.setAttribute("stroke-width", f1(7 - 5 * k)); n.setAttribute("opacity", d >= 0 && d < 0.9 ? 1 - seg(d, 0.35, 0.9) : 0); };
  };
  const hitAt = (A, a) => { for (let t = 0; t < 12; t += 0.01) if (A(t) >= a) return t; return 12; };

  const SC = {};

  /* ---- 1. six sources on one scope; the status page has no row for the game ---- */
  SC.sweep = {
    dur: 10.6, still: 8,
    build(svg, api) {
      const C = [392, 300], R = 178, rp = replay(api, 10.6);
      const gr = grid(svg, 800, 600), all = el("g", {}, svg);
      const S = scope(all, C, R), bm = beam(S.g, C, R, S.id);
      el("circle", { cx: C[0], cy: C[1], r: 6, fill: NAVY, stroke: INK, "stroke-width": 2.5 }, S.g);
      const A = (t) => 352 * ios(seg(t, 1, 6));
      const src = [["Newswire", 40, 95, 590, 150], ["PlayStation status", 85, 125, 590, 262], ["Xbox status", 128, 105, 590, 420], ["Investor releases", 205, 120, 24, 470], ["Steam", 258, 110, 24, 350], ["Rockstar status", 312, 115, 24, 145]];
      const lines = el("g", {}, all), cards = el("g", {}, all);
      const items = src.map(([s, a, r, x, y]) => {
        const p = pol(C, r, a), cd = card(cards, x, y, s), left = x < 300;
        return { hit: hitAt(A, a), b: blip(S.g, p), lead: leader(lines, p, left ? cd.x0 + cd.w : x, y), cd, left };
      });
      const mark = el("circle", { cx: pol(C, 115, 312)[0], cy: pol(C, 115, 312)[1], r: 18, fill: "none", stroke: YEL, "stroke-width": 4, opacity: 0 }, S.g);
      const chip = card(cards, 24, 101, "GTA VI row not found", { fill: YEL, pill: true });
      const ping = pinger(svg, C, R), hv = hover(S.g);
      button(S.g, "Ping the scope and sweep again", rp.tap);
      return (t, now) => {
        const v = rp.vis(t, now); if (v < 0) return;
        all.setAttribute("opacity", v); gr.setAttribute("opacity", oc(seg(t, 0, 0.5)));
        S.enter(t, 0, hv()); bm(A(t), seg(t, 0.8, 1.1));
        const dip = 3 * Math.sin(Math.PI * seg(t, 6.25, 6.6));
        items.forEach((it, i) => {
          const s = t - it.hit;
          it.b(s, seg(t, 0.5 + i * 0.08, 0.9 + i * 0.08));
          it.lead(oc(seg(s, 0.05, 0.35)));
          it.cd.set(ob(seg(s, 0.24, 0.64)), 0, i === 5 ? dip : 0);
        });
        const k = ob(seg(t, 6.6, 7.05));
        chip.set(k, 0, -20 * (1 - k), -7 * (1 - k));
        mark.setAttribute("opacity", seg(t, 6.6, 6.8)); mark.setAttribute("r", f1(10 + 9 * ob(seg(t, 6.6, 7.1))));
        ping(now - rp.ping);
      };
    },
  };

  /* ---- 2. a ping goes out, three answers come back: new, same, nothing ---- */
  SC.echo = {
    dur: 10.6, still: 8,
    build(svg, api) {
      const C = [270, 300], R = 190, rp = replay(api, 10.6);
      const gr = grid(svg, 800, 600), all = el("g", {}, svg);
      const S = scope(all, C, R), wave = el("g", { "clip-path": `url(#${S.id})` }, S.g);
      const tp = [0.9, 2.7, 4.5];
      const rows = [["200 new item", 50, 130, 160, "fetch"], ["304 same as yesterday", 100, 150, 300, "skip"], ["no reply: unknown", 215, 130, 500, "link it"]];
      const pings = tp.map(() => el("circle", { cx: C[0], cy: C[1], r: 1, fill: "none", stroke: AQUA, opacity: 0 }, wave));
      let pin = -1, pinT = -9;
      const items = rows.map(([s, a, r, y, rule], i) => {
        const p = pol(C, r, a), back = i < 2;
        const path = back ? el("path", { d: `M${f1(p[0])} ${f1(p[1])} L${C[0]} ${C[1]}`, stroke: AQUA, "stroke-width": 2.5, "stroke-dasharray": "2 7", "stroke-linecap": "round", opacity: 0 }, wave) : null;
        const ring = back ? el("circle", { cx: p[0], cy: p[1], r: 1, fill: "none", stroke: MINT, "stroke-width": 5, opacity: 0 }, wave) : null;
        const g = el("g", {}, all);
        const lead = leader(g, p, 500, y, !back);
        el("circle", { cx: p[0], cy: p[1], r: 26, fill: "#fff", "fill-opacity": 0 }, g);
        el("circle", { cx: p[0], cy: p[1], r: 24, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 7", "stroke-linecap": "round", class: "mg-ring" }, g);
        const b = back ? blip(g, p, 10) : blip(g, p, 10, "#fff", LIL);
        const cd = card(g, 500, y, s, { b: i < 2 ? 3 : 9, dash: !back });
        const rl = card(g, 500 + cd.w + 12, y, rule, { fill: SKY, pill: true });
        const run = back ? el("circle", { r: 6.5, fill: MINT, stroke: INK, "stroke-width": 2.5, opacity: 0 }, all) : null;
        button(g, `${s}. Tap for its rule: ${rule}`, () => { pin = i; pinT = api.now(); api.poke(); });
        return { p, r, back, path, ring, lead, b, cd, rl, run, hv: hover(g), hit: tp[i] + 1 - Math.cbrt(1 - r / R) };
      });
      const hub = el("circle", { r: 7, fill: NAVY, stroke: INK, "stroke-width": 2.5 }, all);
      const chip = card(all, 524, 204, "Last modified 2045", { fill: YEL, pill: true });
      return (t, now) => {
        const v = rp.vis(t, now);
        all.setAttribute("opacity", v); gr.setAttribute("opacity", oc(seg(t, 0, 0.5)));
        S.enter(t);
        let pulse = 0;
        pings.forEach((n, i) => {
          const k = seg(t, tp[i], tp[i] + 1), on = t >= tp[i] && k < 1;
          n.setAttribute("r", f1(8 + (R - 8) * oc(k))); n.setAttribute("stroke-width", f1(6 - 4 * k)); n.setAttribute("opacity", on ? 1 - seg(k, 0.6, 1) : 0);
          pulse += Math.sin(Math.PI * seg(t, tp[i] - 0.18, tp[i] + 0.22));
        });
        const dip = 3 * Math.sin(Math.PI * seg(t, 6.55, 6.9));
        items.forEach((it, i) => {
          const s = t - it.hit, h = it.hv(), force = pin === i ? oc(seg(now - pinT, 0, 0.25)) : 0;
          it.b(s, seg(t, 0.5 + i * 0.1, 0.9 + i * 0.1), h);
          let c0 = it.back ? 0.78 : tp[2] + 1.15 - it.hit;
          if (it.back) {
            const e = io(seg(s, 0.1, 0.72)), live = s > 0.1 && s < 0.72;
            it.ring.setAttribute("r", f1(it.r * e)); it.ring.setAttribute("opacity", s > 0.1 ? 0.9 * (1 - seg(s, 0.5, 0.8)) : 0);
            it.path.setAttribute("opacity", seg(s, 0.6, 0.9));
            tf(it.run, it.p[0] + (C[0] - it.p[0]) * e, it.p[1] + (C[1] - it.p[1]) * e); it.run.setAttribute("opacity", live ? 1 : 0);
            pulse += Math.sin(Math.PI * seg(s, 0.66, 1.0));
          }
          it.lead(Math.max(oc(seg(s, c0 - 0.2, c0 + 0.1)), force));
          it.cd.set(Math.max(ob(seg(s, c0, c0 + 0.4)), force), 0, i === 0 ? dip : 0, 0, h);
          it.rl.set(pin === i ? ob(seg(now - pinT, 0.05, 0.4)) : 0);
        });
        tf(hub, C[0], C[1], (1 + 0.45 * pulse) * ob(seg(t, 0.4, 0.8)));
        const k = ob(seg(t, 6.9, 7.35));
        chip.set(k, 0, -20 * (1 - k), -7 * (1 - k));
      };
    },
  };

  /* ---- 3. the scope becomes a clock; the brief is out before you look up ---- */
  SC.dawn = {
    dur: 10.6, still: 8,
    build(svg, api) {
      const C = [230, 280], R = 170, rp = replay(api, 10.6);
      const gr = grid(svg, 800, 600), all = el("g", {}, svg);
      const sun = el("g", {}, all);
      el("circle", { r: 48, fill: YEL, stroke: INK, "stroke-width": 3 }, sun);
      el("path", { d: "M-30 -14 A33 33 0 0 1 -8 -32", stroke: "#fff", "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, sun);
      const S = scope(all, C, R);
      const hours = Array.from({ length: 12 }, (_, i) => el("path", { stroke: INK, "stroke-width": i % 3 ? 3 : 4.5, "stroke-linecap": "round", opacity: 0 }, S.face));
      const bm = beam(S.g, C, R, S.id, true);
      el("circle", { cx: C[0], cy: C[1], r: 9, fill: INK }, S.g); el("circle", { cx: C[0], cy: C[1], r: 3, fill: "#fff" }, S.g);
      const A = (t) => 210 * ios(seg(t, 1.5, 4.8));
      const steps = [["Fetch", 50, 100, 170], ["Diff", 100, 105, 298], ["Write brief", 140, 100, 395]];
      const lines = el("g", {}, all), cards = el("g", {}, all);
      const sent = el("g", { opacity: 0 }, cards);
      el("rect", { x: 5, y: -22, width: 280, height: 56, rx: 10, fill: LIL }, sent);
      el("rect", { x: 0, y: -28, width: 280, height: 56, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sent);
      el("circle", { cx: 30, cy: 0, r: 13, fill: MINT, stroke: INK, "stroke-width": 2.5 }, sent);
      const tick = el("path", { d: "M23.5 0.5 L28.5 5.5 L37 -4.5", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, sent);
      txt(sent, 54, 7.5, "Sent to your channel", { "font-size": 21 });
      const items = steps.map(([s, a, r, y]) => { const p = pol(C, r, a); return { hit: hitAt(A, a), b: blip(S.g, p, 10), lead: leader(lines, p, 470, y), cd: card(cards, 470, y, s, { fs: 17 }) }; });
      const seven = card(cards, 122, 462, "07:00", { fs: 19, h: 38, mid: true });
      const chip = card(cards, 596, 556, "You: still playing", { fill: YEL, pill: true });
      const ping = pinger(svg, C, R), hv = hover(S.g);
      button(S.g, "Run the morning again", rp.tap);
      return (t, now) => {
        const v = rp.vis(t, now); if (v < 0) return;
        all.setAttribute("opacity", v); gr.setAttribute("opacity", oc(seg(t, 0, 0.5)));
        const m = io(seg(t, 0.9, 1.5));
        S.enter(t, 0, hv(), m);
        hours.forEach((n, i) => {
          const k = ob(seg(t, 0.95 + i * 0.06, 1.3 + i * 0.06)), p = pol(C, R - 9, i * 30), q = pol(C, R - 9 - (i % 3 ? 13 : 24) * k, i * 30);
          n.setAttribute("d", `M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`); n.setAttribute("opacity", cl(k * 4));
        });
        bm(A(t), seg(t, 1.2, 1.5));
        const sk = oc(seg(t, 4.2, 5.5));
        tf(sun, 150 - 44 * sk, 200 - 62 * sk); sun.setAttribute("opacity", seg(t, 4.2, 4.4));
        items.forEach((it, i) => {
          const s = t - it.hit;
          it.b(s, seg(t, 1.0 + i * 0.1, 1.4 + i * 0.1));
          it.lead(oc(seg(s, 0.05, 0.35)));
          it.cd.set(ob(seg(s, 0.24, 0.64)));
        });
        seven.set(ob(seg(t, 4.85, 5.25)));
        const sl = oc(seg(t, 5.6, 6.2)), dip = 3 * Math.sin(Math.PI * seg(t, 6.6, 6.95));
        sent.setAttribute("transform", `translate(${f1(470 - 54 * (1 - sl))} ${f1(498 + dip)})`); sent.setAttribute("opacity", cl(sl * 3));
        tick.setAttribute("stroke-dasharray", `${f1(21 * seg(t, 6.05, 6.35))} 30`); tick.setAttribute("opacity", t > 6.05 ? 1 : 0);
        const k = ob(seg(t, 6.95, 7.4));
        chip.set(k, 0, -20 * (1 - k), -7 * (1 - k));
        ping(now - rp.ping);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 7, still: 4,
    build(svg, api) {
      const C = [615, 215], R = 135, rp = replay(api, 7);
      const gr = grid(svg, 800, 450), all = el("g", {}, svg);
      const pill = el("g", {}, all);
      el("rect", { x: -46, y: -16, width: 92, height: 32, rx: 16, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 5.5, "Guides", { "text-anchor": "middle", "font-size": 16, "font-weight": 700 });
      const chk = txt(all, 752, 58, "Checked 19 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 14, "font-weight": 500, fill: MUTE });
      const t1 = txt(all, 46, 170, "GTA 6", { "font-size": 88, "font-weight": 700, "letter-spacing": -2.5 });
      const t2 = txt(all, 46, 254, "tracker", { "font-size": 88, "font-weight": 700, "letter-spacing": -2.5 });
      const ul = el("path", { d: "M54 286 H54", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, all);
      const s1 = txt(all, 48, 336, "News, servers and sales", { "font-size": 22, "font-weight": 500, fill: MUTE });
      const s2 = txt(all, 48, 365, "in one morning brief", { "font-size": 22, "font-weight": 500, fill: MUTE });
      const S = scope(all, C, R), bm = beam(S.g, C, R, S.id);
      el("circle", { cx: C[0], cy: C[1], r: 5.5, fill: NAVY, stroke: INK, "stroke-width": 2.5 }, S.g);
      const A = (t) => 335 * ios(seg(t, 0.9, 3));
      const src = [["Newswire", 655, 143, 0], ["Status", 690, 243, 0], ["Stores", 600, 293, 0], ["Earnings", 530, 173, 1]];
      const cards = el("g", {}, all);
      const items = src.map(([s, x, y, left]) => {
        const a = (Math.atan2(x - C[0], C[1] - y) * 180 / Math.PI + 360) % 360;
        return { hit: hitAt(A, a), b: blip(S.g, [x, y], 8), cd: card(cards, left ? x - 15 : x + 15, y, s, { fs: 13, h: 27, right: !!left }) };
      });
      const brief = card(cards, 622, 394, "Brief at 07:00", { fs: 14.5, h: 38 });
      const slide = (n, a, b, y0) => { const k = oc(seg(api.t, a, b)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${f1(y0 * (1 - k))})`); };
      return (t, now) => {
        api.t = t;
        all.setAttribute("opacity", rp.vis(t, now)); gr.setAttribute("opacity", oc(seg(t, 0, 0.5)));
        tf(pill, 94, 52, 0.5 + 0.5 * ob(seg(t, 0.05, 0.42))); pill.setAttribute("opacity", seg(t, 0.05, 0.2));
        chk.setAttribute("opacity", seg(t, 0.2, 0.6));
        slide(t1, 0.12, 0.62, 26); slide(t2, 0.22, 0.72, 26);
        ul.setAttribute("d", `M54 286 H${f1(54 + 124 * ob(seg(t, 0.6, 1.05)))}`); ul.setAttribute("opacity", t > 0.6 ? 1 : 0);
        slide(s1, 0.7, 1.1, 14); slide(s2, 0.8, 1.2, 14);
        S.enter(t, 0.2); bm(A(t), seg(t, 0.75, 1));
        items.forEach((it, i) => { const s = t - it.hit; it.b(s, seg(t, 0.6 + i * 0.08, 0.9 + i * 0.08)); it.cd.set(ob(seg(s, 0.08, 0.42))); });
        const k = ob(seg(t, 3.2, 3.62));
        brief.set(k, 0, -14 * (1 - k), -5 * (1 - k));
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
  const fonts = document.fonts && document.fonts.load ? Promise.all(['700 32px "Space Grotesk"', '600 20px "Space Grotesk"', '500 20px "Space Grotesk"', '700 20px "JetBrains Mono"', '500 20px "JetBrains Mono"'].map((f) => document.fonts.load(f))).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
