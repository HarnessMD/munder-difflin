/* Bright coded scenes for "GTA 6 streaming setup". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", AQUA = "#3FC6C9", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const iob = (x) => { const c = 1.70158 * 1.525; return x < 0.5 ? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2 : (Math.pow(2 * x - 2, 2) * ((c + 1) * (x * 2 - 2) + c) + 2) / 2; };
  const bump = (x) => Math.sin(cl(x) * Math.PI) * (1 - 0.35 * cl(x));
  const frac = (x) => ((x % 1) + 1) % 1;
  const tf = (n, x, y, s = 1, r = 0, sx = 1) => n.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)}) scale(${(s * sx).toFixed(4)} ${s.toFixed(4)})`);
  const op = (n, v) => n.setAttribute("opacity", cl(v).toFixed(3));
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let uid = 0;
  /* a value that eases to its target; `now` is the scene clock */
  const tween = (v0, d = 0.35, ease = oc) => { let a = v0, b = v0, at = -99; const get = (now) => a + (b - a) * ease(seg(now - at, 0, d)); return { get, set: (v, now) => { a = get(now); b = v; at = now; } }; };
  const hover = (g, api) => {
    const tw = tween(0, 0.24), set = (v) => () => { tw.set(v, api.t()); api.nudge(); };
    g.addEventListener("pointerenter", set(1)); g.addEventListener("pointerleave", set(0)); g.addEventListener("focus", set(1)); g.addEventListener("blur", set(0));
    return tw;
  };
  /* a white card with an even ink outline and a lilac offset shadow, centred on 0,0 */
  const card = (p, w, h, o = {}) => {
    const g = el("g", {}, p), rx = o.rx == null ? 12 : o.rx;
    el("rect", { x: -w / 2 + 4, y: -h / 2 + 5, width: w, height: h, rx, fill: LIL }, g);
    const body = el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx, fill: o.fill || "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    return { g, body };
  };
  const ring = (g, w, h, rx = 16) => el("rect", { x: -w / 2 - 7, y: -h / 2 - 7, width: w + 18, height: h + 19, rx, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 7", "stroke-linecap": "round", class: "mg-ring" }, g);

  /* ---- the shared daylight stage: soft sky, bar sun, lilac grid floor. Returns (now, rise) ---- */
  const stage = (p, o) => {
    const W = o.W || 800, H = o.H || 600, hz = o.hz, cx = o.cx || W / 2, [sx, sy, r] = o.sun, x0 = o.x0 || 0, y0 = o.y0 || 0, sp = o.sp || 110;
    const g = el("g", {}, p);
    const sk = "mgs" + (++uid), sg = el("linearGradient", { id: sk, x1: 0, y1: 0, x2: 0, y2: 1 }, g);
    el("stop", { offset: 0, "stop-color": SOFT }, sg); el("stop", { offset: 1, "stop-color": "#fff" }, sg);
    el("rect", { x: x0, y: y0, width: W - x0, height: hz - y0, fill: `url(#${sk})` }, g);
    const clouds = (o.clouds || []).map(([x, y, w]) => {
      const c = el("g", {}, g);
      el("rect", { x: 0, y: 0, width: w, height: 8, rx: 4, fill: "#fff", stroke: LIL, "stroke-width": 1.5 }, c);
      el("rect", { x: w * 0.22, y: 13, width: w * 0.62, height: 8, rx: 4, fill: "#fff", stroke: LIL, "stroke-width": 1.5 }, c);
      return { c, x, y };
    });
    const sun = el("g", {}, g);
    el("circle", { cx: sx, cy: sy, r: r + 15, fill: "none", stroke: LIL, "stroke-width": 2, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, sun);
    el("circle", { cx: sx + 6, cy: sy + 6, r, fill: LIL }, sun);
    const id = "mgc" + (++uid), cp = el("clipPath", { id }, sun); el("circle", { cx: sx, cy: sy, r }, cp);
    const disc = el("g", { "clip-path": `url(#${id})` }, sun);
    el("rect", { x: sx - r, y: sy - r, width: 2 * r, height: 2 * r, fill: YEL }, disc);
    const top = sy + r * (o.g0 == null ? -0.5 : o.g0), bot = sy + r, NG = 8, step = (bot - top) / NG;
    const gaps = Array.from({ length: NG }, () => el("rect", { x: sx - r, width: 2 * r, fill: "#fff" }, disc));
    (o.mts || []).forEach(([x, w, h]) => {
      el("path", { d: `M${x} ${hz} L${x + w * 0.34} ${hz - h} L${x + w * 0.52} ${hz - h * 0.58} L${x + w * 0.7} ${hz - h * 0.86} L${x + w} ${hz} Z`, fill: SOFT, stroke: LIL, "stroke-width": 2, "stroke-linejoin": "round" }, g);
    });
    el("rect", { x: x0, y: hz, width: W - x0, height: H - hz, fill: "#fff" }, g);
    const vg = "mgv" + (++uid), lg = el("linearGradient", { id: vg, gradientUnits: "userSpaceOnUse", x1: 0, y1: hz, x2: 0, y2: hz + (H - hz) * 0.45 }, g);
    el("stop", { offset: 0, "stop-color": LIL, "stop-opacity": 0.05 }, lg); el("stop", { offset: 1, "stop-color": LIL, "stop-opacity": 0.7 }, lg);
    const d = []; for (let i = -16; i <= 16; i++) d.push(`M${cx} ${hz} L${cx + (i + (o.half ? 0.5 : 0)) * sp + 0.01} ${H}`);
    el("path", { d: d.join(" "), stroke: `url(#${vg})`, "stroke-width": 1.6, fill: "none" }, g);
    const hl = Array.from({ length: 12 }, () => el("line", { x1: x0, x2: W, stroke: LIL }, g));
    el("line", { x1: x0, x2: W, y1: hz, y2: hz, stroke: LIL, "stroke-width": 2.5 }, g);
    const speed = o.speed == null ? 0.4 : o.speed;
    return (now, rise = 1) => {
      const ph = frac(now * speed), gp = frac(now * 0.11);
      hl.forEach((l, i) => {
        const y = hz + (H - hz) / (i + 1 - ph), k = (y - hz) / (H - hz);
        l.setAttribute("y1", y.toFixed(2)); l.setAttribute("y2", y.toFixed(2));
        l.setAttribute("stroke-opacity", cl(k * 2.2, 0, 0.75).toFixed(3)); l.setAttribute("stroke-width", (1 + 1.4 * cl(k)).toFixed(2));
      });
      gaps.forEach((n, i) => { const y = top + (i + gp) * step, k = (y - top) / (bot - top); n.setAttribute("y", y.toFixed(2)); n.setAttribute("height", (step * 0.62 * k).toFixed(2)); });
      sun.setAttribute("transform", `translate(0 ${((1 - rise) * (hz - sy + r + 24)).toFixed(2)})`);
      clouds.forEach((c, i) => c.c.setAttribute("transform", `translate(${(c.x + Math.sin(now * 0.22 + i * 2.1) * 16).toFixed(2)} ${c.y})`));
    };
  };

  const SC = {};

  /* ---- 1. three lanes light up in turn; a sign rises at the horizon ---- */
  SC.lanes = {
    dur: 11.5, still: 8,
    build(svg, api) {
      const HZ = 240, CX = 400, H = 600, STILL = 8;
      const bg = stage(svg, { hz: HZ, sun: [400, 178, 128], g0: -0.78, half: true, mts: [[18, 200, 50], [596, 180, 40]], clouds: [[64, 64, 112], [622, 108, 92]] });
      const P = (xb, f) => [CX + (xb - CX) * f, HZ + (H - HZ) * f];
      const LANES = [[["PS5"], ["YouTube", "and Twitch"], SKY, 150], [["Xbox"], ["Twitch"], MINT, 150], [["Capture card", "and PC"], ["Most", "services"], LIL, 178]];
      const root = el("g", {}, svg), tintL = el("g", {}, root), chevL = el("g", {}, root), signL = el("g", {}, root), cardL = el("g", {}, root);
      [235, 565].forEach((xb) => { const a = P(xb, 1), b = P(xb, 0.03); el("path", { d: `M${a} L${b}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "14 10", "stroke-linecap": "round", opacity: 0.55 }, tintL); });
      let pick = -1;
      const lanes = LANES.map(([src, dst, col, sw], i) => {
        const xb = CX + (i - 1) * 330, xl = xb - 165, xr = xb + 165;
        const gid = "mgg" + (++uid), lg = el("linearGradient", { id: gid, gradientUnits: "userSpaceOnUse", x1: 0, y1: HZ, x2: 0, y2: H }, tintL);
        el("stop", { offset: 0, "stop-color": col, "stop-opacity": 0.12 }, lg); el("stop", { offset: 1, "stop-color": col, "stop-opacity": 0.8 }, lg);
        const tint = el("polygon", { fill: `url(#${gid})` }, tintL);
        const chev = Array.from({ length: 5 }, () => { const c = el("g", {}, chevL), a = { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }; return { c, a: el("path", Object.assign({ stroke: INK }, a), c), b: el("path", Object.assign({ stroke: col }, a), c) }; });
        const g = el("g", {}, cardL);
        el("polygon", { points: [P(xl, 1), P(xr, 1), P(xr, 0.2), P(xl, 0.2)].map((q) => q.join(",")).join(" "), fill: "#fff", "fill-opacity": 0 }, g);
        const sG = el("g", {}, g), s = card(sG, sw, 64); ring(sG, sw, 64, 18);
        if (src.length === 1) txt(sG, 0, 10, src[0], { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        else src.forEach((w, j) => txt(sG, 0, -4 + j * 23, w, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }));
        const dG = el("g", {}, g); card(dG, 126, 58, { rx: 10 });
        dst.forEach((w, j) => mono(dG, 0, (dst.length === 1 ? 5.5 : -4.5) + j * 19, w, { "font-size": 15 }));
        const L = { xb, xl, xr, col, tint, chev, sG, dG, body: s.body, dim: tween(0), sel: tween(0), hot: hover(g, api) };
        button(g, `${src.join(" ")} to ${dst.join(" ")}`, () => {
          pick = pick === i ? -1 : i;
          lanes.forEach((q, j) => { q.dim.set(pick >= 0 && pick !== j ? 1 : 0, api.t()); q.sel.set(pick === j ? 1 : 0, api.t()); });
          if (pick < 0) api.seek(STILL); else api.poke();
        });
        return L;
      });
      const cid = "mgc" + (++uid), cp = el("clipPath", { id: cid }, signL); el("rect", { x: 0, y: 0, width: 800, height: HZ }, cp);
      const signC = el("g", { "clip-path": `url(#${cid})` }, signL), sign = el("g", {}, signC);
      el("path", { d: "M-82 20 V52 M82 20 V52", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, sign);
      card(sign, 244, 52, { rx: 12 });
      txt(sign, 0, 9, "Pick one lane", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      return (t0, now) => {
        bg(now);
        const t = pick >= 0 ? STILL : t0;
        op(root, 1 - seg(t, 10.9, 11.4));
        lanes.forEach((L, i) => {
          const T = 0.9 + i * 1.5, sweep = oc(seg(t, T, T + 0.75)), lit = t >= T + 0.05, litD = seg(t, T + 0.5, T + 0.7);
          const dim = L.dim.get(now), sel = L.sel.get(now), hot = L.hot.get(now), ft = 1 - 0.97 * sweep;
          L.tint.setAttribute("points", [P(L.xl, 1), P(L.xr, 1), P(L.xr, ft), P(L.xl, ft)].map((q) => q.map((v) => v.toFixed(1)).join(",")).join(" "));
          op(L.tint, (sweep > 0 ? 0.8 + 0.2 * sel : 0) * (1 - 0.86 * dim));
          const e1 = oc(seg(t, 0.15 + i * 0.1, 0.65 + i * 0.1)), e2 = oc(seg(t, 0.4 + i * 0.1, 0.9 + i * 0.1));
          const a = P(L.xb, 0.82), b = P(L.xb, 0.42);
          tf(L.sG, a[0], a[1] + 18 * (1 - e1) - 5 * hot - 5 * sel, 1 + 0.12 * bump(seg(t, T, T + 0.45)) + 0.04 * sel, Math.sin(hot * Math.PI) * -2);
          op(L.sG, e1 * (1 - 0.62 * dim)); L.body.setAttribute("fill", lit ? L.col : "#fff");
          tf(L.dG, b[0], b[1] + 14 * (1 - e2) - 4 * hot - 3 * sel, 1 + 0.14 * bump(seg(t, T + 0.5, T + 0.95)), Math.sin(hot * Math.PI) * 2);
          op(L.dG, e2 * (0.42 + 0.58 * litD) * (1 - 0.62 * dim));
          L.chev.forEach((c, j) => {
            const near = j < 2, u = frac(now * 0.42 + (near ? j / 2 : (j - 2) / 3) + i * 0.17), f = near ? 0.735 - u * 0.215 : 0.335 - u * 0.275, q = P(L.xb, f);
            const d = "M" + [P(L.xb - 38, f), [q[0], q[1] - 30 * f], P(L.xb + 38, f)].map((v) => v[0].toFixed(1) + " " + v[1].toFixed(1)).join(" L");
            c.a.setAttribute("d", d); c.b.setAttribute("d", d); c.a.setAttribute("stroke-width", (12 * f).toFixed(2)); c.b.setAttribute("stroke-width", (6 * f).toFixed(2));
            op(c.c, Math.sin(u * Math.PI) * seg(t, T + 0.2 + (near ? 0 : 0.3), T + 0.6 + (near ? 0 : 0.3)) * (1 - dim));
          });
        });
        const k = seg(t, 5.9, 6.6), w = t > 6.2 ? Math.sin((t - 6.2) * 9) * 3.2 * Math.exp(-(t - 6.2) * 2.6) : 0;
        sign.setAttribute("transform", `translate(400 ${(HZ - 52 + 110 * (1 - ob(k))).toFixed(2)}) rotate(${w.toFixed(2)} 0 52)`);
      };
    },
  };

  /* ---- 2. HDCP flips off and the signal runs through the chain ---- */
  SC.signal = {
    dur: 11.5, still: 8,
    build(svg, api) {
      const HZ = 172, STILL = 8;
      const bg = stage(svg, { hz: HZ, sun: [400, 122, 100], g0: -0.62, mts: [[70, 210, 46], [552, 190, 38]], clouds: [[52, 56, 104], [642, 84, 92]] });
      const root = el("g", {}, svg), wireL = el("g", {}, root), boxL = el("g", {}, root), pulseL = el("g", {}, root);
      const WIRES = [[200, 340, 300, 340, 2.1, 2.9], [490, 340, 615, 340, 3.05, 3.85], [395, 372, 395, 440, 3.05, 3.75], [460, 472, 523, 472, 3.95, 4.5], [627, 472, 674, 472, 4.65, 5.1]];
      const wires = WIRES.map(([x1, y1, x2, y2, a, b]) => {
        const d = `M${x1} ${y1} L${x2} ${y2}`, len = Math.hypot(x2 - x1, y2 - y1);
        el("path", { d, stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, wireL);
        el("path", { d, stroke: "#fff", "stroke-width": 4.5, "stroke-linecap": "round" }, wireL);
        const lit = el("path", { d, stroke: AQUA, "stroke-width": 4.5, "stroke-linecap": "round" }, wireL);
        const flow = el("path", { d, stroke: "#fff", "stroke-width": 2, "stroke-dasharray": "3 11", "stroke-linecap": "round" }, wireL);
        const p = el("g", {}, pulseL);
        el("circle", { r: 11, fill: YEL, stroke: INK, "stroke-width": 2.5 }, p); el("circle", { cx: -3, cy: -3, r: 3, fill: "#fff" }, p);
        return { x1, y1, x2, y2, a, b, len, lit, flow, p };
      });
      const conn = el("path", { d: "M120 262 V306", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 7", "stroke-linecap": "round" }, wireL);
      const mk = (x, y, w, h, label, col, at, extra) => {
        const g = el("g", {}, boxL);
        const sh = el("ellipse", { cx: x + 4, cy: y + h / 2 + 13, rx: w * 0.5, ry: 6, fill: LIL, opacity: 0.4 }, g);
        const inner = el("g", {}, g); if (extra) extra(inner, w, h);
        const c = card(inner, w, h); txt(inner, 0, 7.5, label, { "text-anchor": "middle", "font-size": label === "OBS" ? 21 : 22, "font-weight": 700, "font-family": label === "OBS" ? MONO : SANS });
        return { g, inner, body: c.body, x, y, col, at, sh };
      };
      const legs = (g, w, h) => el("path", { d: `M${-w / 4} ${h / 2} l-8 12 M${w / 4} ${h / 2} l8 12`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
      const ports = (g, w) => { el("rect", { x: -w / 2 - 7, y: -9, width: 12, height: 18, rx: 3, fill: INK }, g); el("rect", { x: w / 2 - 5, y: -9, width: 12, height: 18, rx: 3, fill: INK }, g); el("rect", { x: -9, y: 22, width: 18, height: 16, rx: 3, fill: INK }, g); };
      const base = (g, w, h) => el("path", { d: `M0 ${h / 2} v9 M-26 ${h / 2 + 10} h52`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
      const boxes = [mk(120, 340, 160, 64, "Console", YEL, 2.0), mk(395, 340, 190, 64, "Capture card", LIL, 2.9, ports), mk(680, 340, 130, 64, "TV", SKY, 3.85, legs), mk(395, 472, 130, 64, "PC", BLUE, 3.75, base), mk(575, 472, 104, 56, "OBS", MINT, 4.5)];
      /* the Live tag */
      const live = el("g", {}, boxL), liveIn = el("g", {}, live), TAG = "M-52 0 L-32 -25 H44 Q52 -25 52 -17 V17 Q52 25 44 25 H-32 Z";
      el("path", { d: TAG, fill: LIL, transform: "translate(4 5)" }, liveIn);
      const tag = el("path", { d: TAG, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, liveIn);
      const dot = el("circle", { cx: -24, cy: 0, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, liveIn);
      txt(liveIn, 14, 7.5, "Live", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      /* the HDCP switch */
      const sw = el("g", {}, boxL), swIn = el("g", {}, sw);
      card(swIn, 204, 58, { rx: 16 }); ring(swIn, 204, 58, 22);
      mono(swIn, -88, 6.5, "HDCP", { "font-size": 19, "text-anchor": "start" });
      const track = el("rect", { x: -22, y: -15, width: 58, height: 30, rx: 15, fill: LIL, stroke: INK, "stroke-width": 2.5 }, swIn);
      const knob = el("circle", { cy: 0, r: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, swIn);
      const state = txt(swIn, 49, 7.5, "On", { "font-size": 22, "font-weight": 700 });
      let on = false; const onK = tween(0, 0.4, io), hot = hover(sw, api); let stamp = 0;
      button(sw, "HDCP switch", () => {
        on = !on; sw.setAttribute("aria-pressed", on ? "true" : "false");
        if (on) { onK.set(1, api.t()); stamp = api.t(); api.poke(); } else { onK.set(0, -99); api.seek(1.2); }
      });
      sw.setAttribute("aria-pressed", "false");
      /* the last label */
      const lab = el("g", {}, root); card(lab, 336, 48, { fill: YEL, rx: 24 });
      mono(lab, 0, 7, "HDCP off, capture on", { "font-size": 20 });
      return (t0, now) => {
        bg(now);
        const t = on ? STILL : t0, k = onK.get(now), h = hot.get(now), blocked = k > 0.5;
        op(root, 1 - seg(t, 10.9, 11.4));
        const ent = (j) => oc(seg(t, 0.1 + j * 0.09, 0.6 + j * 0.09));
        /* switch */
        const flip = iob(seg(t, 1.3, 1.85)), pos = (1 - flip) + flip * k, e0 = ent(0);
        tf(sw, 142, 230 + 16 * (1 - e0) - 4 * h, 1 + 0.07 * bump(seg(t, 1.55, 1.95)), Math.sin(h * Math.PI) * -1.5); op(sw, e0);
        knob.setAttribute("cx", (-7 + 28 * pos).toFixed(2)); track.setAttribute("fill", pos > 0.5 ? LIL : SOFT); state.textContent = pos > 0.5 ? "On" : "Off";
        op(conn, seg(t, 0.5, 0.9));
        /* blocked pulse while HDCP is on */
        const u = api.calm ? 0.56 : frac((now - stamp) / 1.8), shake = blocked && u > 0.55 && u < 0.9 ? Math.sin((u - 0.55) * 60) * 4 * (1 - (u - 0.55) / 0.35) : 0;
        boxes.forEach((b, j) => {
          const e = ent(j + 1), lit = t >= b.at && (j === 0 || !blocked), down = j > 1 ? k : 0;
          tf(b.g, b.x + (j === 1 ? shake : 0), b.y + 16 * (1 - e)); op(b.g, e * (1 - 0.6 * down));
          tf(b.inner, 0, 0, 1 + 0.11 * bump(seg(t, b.at, b.at + 0.45)));
          b.body.setAttribute("fill", lit ? b.col : "#fff");
        });
        const e6 = ent(6), lv = t >= 5.1 && !blocked;
        tf(live, 724, 472 + 16 * (1 - e6)); op(live, e6 * (1 - 0.6 * k));
        tf(liveIn, 0, 0, 1 + 0.2 * bump(seg(t, 5.1, 5.6)), -6 * bump(seg(t, 5.1, 5.6)));
        tag.setAttribute("fill", lv ? AQUA : "#fff"); dot.setAttribute("fill", lv && Math.sin(now * 5) > -0.3 ? YEL : "#fff");
        wires.forEach((w, j) => {
          const p = seg(t, w.a, w.b), q = io(p), lit = blocked ? 0 : q;
          op(wireL.children[j * 4], 1); w.lit.setAttribute("stroke-dasharray", `${(w.len * lit).toFixed(1)} ${w.len + 20}`); op(w.lit, lit > 0 ? 1 - k : 0);
          w.flow.setAttribute("stroke-dashoffset", (-now * 26).toFixed(1)); op(w.flow, p >= 1 && !blocked ? 0.9 : 0);
          let px = w.x1 + (w.x2 - w.x1) * q, py = w.y1 + (w.y2 - w.y1) * q, s = p > 0 && p < 1 ? 0.6 + 0.4 * Math.sin(p * Math.PI) + 0.25 : 0;
          if (k > 0) { s = 0; if (j === 0) { const g2 = io(seg(u, 0, 0.55)); px = w.x1 + (w.x2 - w.x1) * g2; s = (u < 0.55 ? 1 : 1 - seg(u, 0.55, 0.68)) * oc(seg(u, 0, 0.08)) * k; } }
          tf(w.p, px, py, s); op(w.p, s > 0 ? 1 : 0);
        });
        const lk = seg(t, 6.1, 6.65);
        tf(lab, 400, 556 + 26 * (1 - oc(lk)), 0.55 + 0.45 * ob(lk), -5 * (1 - oc(lk))); op(lab, seg(t, 6.1, 6.25) * (1 - k));
      };
    },
  };

  /* ---- 3. five drafts rise from the timestamp strip and wait at the gate ---- */
  SC.crew = {
    dur: 12.5, still: 9,
    build(svg, api) {
      const HZ = 150, H = 600, STILL = 9, SPEED = -0.25;
      const bg = stage(svg, { hz: HZ, sun: [400, 112, 92], g0: -0.62, speed: SPEED, mts: [[60, 210, 44], [548, 196, 36]], clouds: [[58, 48, 104], [640, 72, 92]] });
      const P = (xb, f) => [400 + (xb - 400) * f, HZ + (H - HZ) * f];
      const stripL = el("g", {}, svg), root = el("g", {}, svg);
      el("polygon", { points: [P(292, 1), P(508, 1), P(508, 0.02), P(292, 0.02)].map((q) => q.join(",")).join(" "), fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, stripL);
      const STAMPS = ["00:00", "12:40", "27:15", "42:10", "58:30", "1:14:05", "1:31:20", "1:47:45"];
      const marks = Array.from({ length: 9 }, () => { const g = el("g", {}, stripL); el("path", { d: "M-108 22 H108", stroke: LIL, "stroke-width": 3 }, g); el("path", { d: "M-108 -6 h16 M108 -6 h-16", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g); return { g, t: mono(g, 0, 4, "", { "font-size": 34 }) }; });
      /* gate */
      const gate = el("g", {}, root);
      [40, 760].forEach((x) => { el("rect", { x: x - 3, y: 205, width: 14, height: 64, rx: 5, fill: LIL }, gate); el("rect", { x: x - 7, y: 200, width: 14, height: 64, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, gate); });
      el("rect", { x: 44, y: 224, width: 720, height: 16, rx: 8, fill: LIL }, gate);
      el("rect", { x: 40, y: 219, width: 720, height: 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, gate);
      for (let i = 0; i < 8; i++) if (i !== 3 && i !== 4) el("rect", { x: 66 + i * 88, y: 221.5, width: 44, height: 11, fill: YEL }, gate);
      el("rect", { x: 40, y: 219, width: 720, height: 16, rx: 8, fill: "none", stroke: INK, "stroke-width": 2.5 }, gate);
      const plaque = el("g", {}, gate); card(plaque, 204, 46, { rx: 12 });
      txt(plaque, 0, 8, "You approve", { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
      /* cards */
      const CARDS = [[["Schedule", "posts"], ["One per", "platform"], SKY], [["Titles"], ["Three per", "stream,", "no plot"], LIL], [["Cut list"], ["Start and", "end times,", "cutscenes", "dropped"], YEL], [["Chapters"], ["First at", "00:00, at", "least three"], MINT], [["Weekly", "report"], ["Your numbers", "against the", "Affiliate", "list"], AQUA]];
      const CW = 128, CH = 100, CY = 316;
      const order = [0, 4, 1, 3, 2].map((i) => el("g", {}, root)), slots = [0, 4, 1, 3, 2];
      const cards = CARDS.map(([name, sample, col], i) => {
        const g = order[slots.indexOf(i)], inner = el("g", {}, g), x = 400 + (i - 2) * 140;
        const c = card(inner, CW, CH, { rx: 14 }); ring(inner, CW, CH, 20);
        const front = el("g", {}, inner), back = el("g", {}, inner);
        name.forEach((w, j) => txt(front, 0, (name.length === 1 ? 9 : -3) + j * 24, w, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }));
        sample.forEach((w, j) => mono(back, 0, 5 - (sample.length - 1) * 9 + j * 18, w, { "font-size": 13, "font-weight": 500 }));
        const badge = el("g", {}, front), bc = el("circle", { r: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, badge);
        const spin = el("circle", { r: 7, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "5 6", "stroke-linecap": "round" }, badge);
        const tick = el("path", { d: "M-6.5 0.5 L-2 5 L6.5 -4.5", stroke: INK, "stroke-width": 3.2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "20 20" }, badge);
        const C = { g, inner, body: c.body, front, back, badge, bc, spin, tick, x, col, flipped: false, flip: tween(0, 0.55, io), hot: hover(g, api) };
        button(g, `${name.join(" ")}: ${sample.join(" ")}`, () => {
          C.flipped = !C.flipped; C.flip.set(C.flipped ? 1 : 0, api.t());
          if (cards.some((q) => q.flipped)) api.poke(); else api.seek(STILL);
        });
        return C;
      });
      const lab = el("g", {}, root); card(lab, 328, 48, { fill: YEL, rx: 24 });
      mono(lab, 0, 7, "Nothing posts itself", { "font-size": 20 });
      return (t0, now) => {
        bg(now);
        const t = cards.some((q) => q.flipped) ? STILL : t0;
        op(root, 1 - seg(t, 11.9, 12.4));
        const Pn = now * -SPEED / 0.3, n0 = Math.floor(Pn);
        marks.forEach((m, j) => {
          const n = n0 - j + 1, z = 0.72 + (Pn - n) * 0.3, y = HZ + (H - HZ) / Math.max(z, 0.2);
          m.t.textContent = STAMPS[((n % 8) + 8) % 8];
          tf(m.g, 400, y, 1 / Math.max(z, 0.2)); op(m.g, cl((z - 1.12) / 0.1) * cl((3.4 - z) / 0.8));
        });
        const ge = seg(t, 0.15, 0.75); let pb = 0;
        gate.setAttribute("transform", `translate(0 ${(-46 * (1 - ob(ge))).toFixed(2)})`); op(gate, seg(t, 0.15, 0.4));
        cards.forEach((c, i) => {
          const T = 1 + i * 0.5, r = seg(t, T, T + 0.7), K = 4.4 + i * 0.45, tk = seg(t, K, K + 0.4), f = c.flip.get(now), h = c.hot.get(now);
          const m = ob(r), hop = bump(seg(t, K, K + 0.45));
          pb = Math.max(pb, hop);
          tf(c.g, 400 + (c.x - 400) * m, 478 + (CY - 478) * m - 9 * hop - 5 * h, (0.25 + 0.75 * oc(r)) * (1 + 0.07 * Math.sin(f * Math.PI)), (i - 2) * -9 * (1 - oc(r)) + Math.sin(h * Math.PI) * (i % 2 ? 2 : -2));
          op(c.g, seg(t, T, T + 0.15));
          const sx = Math.max(0.02, Math.abs(Math.cos(f * Math.PI))), face = f < 0.5;
          c.inner.setAttribute("transform", `scale(${sx.toFixed(3)} 1)`);
          c.front.setAttribute("display", face ? "inline" : "none"); c.back.setAttribute("display", face ? "none" : "inline");
          c.body.setAttribute("fill", !face ? SOFT : tk > 0 ? c.col : "#fff");
          tf(c.badge, CW / 2 - 12, -CH / 2 + 8, 1 + 0.4 * bump(tk));
          c.bc.setAttribute("fill", tk > 0 ? MINT : "#fff");
          c.spin.setAttribute("transform", `rotate(${(now * 150) % 360})`); op(c.spin, tk > 0 ? 0 : 1);
          c.tick.setAttribute("stroke-dashoffset", (20 * (1 - oc(seg(tk, 0.15, 0.9)))).toFixed(2)); op(c.tick, tk > 0.15 ? 1 : 0);
        });
        tf(plaque, 400, 214, 1 + 0.07 * pb);
        const lk = seg(t, 7.2, 7.75);
        tf(lab, 400, 560 + 26 * (1 - oc(lk)), 0.55 + 0.45 * ob(lk), 5 * (1 - oc(lk))); op(lab, seg(t, 7.2, 7.35));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4, once: true,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: -76, y: -21, width: 152, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 7, "Use Cases", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const chk = mono(svg, 902, 70, "Checked 19 Nov 2026", { "font-size": 17, "font-weight": 500, fill: MUTE, "text-anchor": "end" });
      const t1 = txt(svg, 62, 0, "GTA 6", { "font-size": 70, "font-weight": 700 }), t2 = txt(svg, 62, 0, "streaming setup", { "font-size": 70, "font-weight": 700 });
      const ul = el("path", { d: "M68 330 H68", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const s1 = txt(svg, 64, 0, "Overlays, rules and an AI agent", { "font-size": 25, "font-weight": 500, fill: MUTE }), s2 = txt(svg, 64, 0, "crew off camera", { "font-size": 25, "font-weight": 500, fill: MUTE });
      /* the horizon panel */
      const PX = 640, PY = 104, PW = 262, PH = 356, panel = el("g", {}, svg);
      el("rect", { x: PX + 8, y: PY + 9, width: PW, height: PH, rx: 24, fill: LIL }, panel);
      const cid = "mgc" + (++uid), cp = el("clipPath", { id: cid }, panel); el("rect", { x: PX, y: PY, width: PW, height: PH, rx: 24 }, cp);
      const view = el("g", { "clip-path": `url(#${cid})` }, panel);
      el("rect", { x: PX, y: PY, width: PW, height: PH, fill: "#fff" }, view);
      const bg = stage(view, { W: PX + PW, H: PY + PH, x0: PX, y0: PY, hz: 318, cx: PX + PW / 2, sun: [PX + PW / 2, 262, 84], g0: -0.45, sp: 46, speed: 0.4, mts: [[PX - 20, 120, 34], [PX + 170, 120, 28]], clouds: [[PX + 158, PY + 30, 70]] });
      el("rect", { x: PX, y: PY, width: PW, height: PH, rx: 24, fill: "none", stroke: INK, "stroke-width": 3 }, panel);
      const chip = el("g", {}, svg);
      el("rect", { x: -44 + 3, y: -18 + 4, width: 88, height: 36, rx: 18, fill: LIL }, chip);
      el("rect", { x: -44, y: -18, width: 88, height: 36, rx: 18, fill: AQUA, stroke: INK, "stroke-width": 2.5 }, chip);
      const dot = el("circle", { cx: -26, cy: 0, r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, chip);
      mono(chip, 10, 6, "LIVE", { "font-size": 17 });
      return (t, now) => {
        const rise = (a, b) => oc(seg(t, a, b));
        tf(pill, 140, 72, 0.6 + 0.4 * ob(seg(t, 0.05, 0.5))); op(pill, seg(t, 0.05, 0.2));
        op(chk, rise(0.5, 1));
        [[t1, 218, 0.2], [t2, 298, 0.32]].forEach(([n, y, a]) => { n.setAttribute("y", (y + 26 * (1 - rise(a, a + 0.55))).toFixed(2)); op(n, seg(t, a, a + 0.3)); });
        ul.setAttribute("d", `M68 330 H${(68 + 212 * oc(seg(t, 0.8, 1.35))).toFixed(1)}`); op(ul, t > 0.8 ? 1 : 0);
        [[s1, 386, 1.0], [s2, 420, 1.1]].forEach(([n, y, a]) => { n.setAttribute("y", (y + 16 * (1 - rise(a, a + 0.5))).toFixed(2)); op(n, seg(t, a, a + 0.3)); });
        const pk = seg(t, 0.35, 0.95);
        panel.setAttribute("transform", `translate(0 ${(30 * (1 - ob(pk))).toFixed(2)})`); op(panel, seg(t, 0.35, 0.6));
        const sr = seg(t, 0.9, 2.3);
        bg(now, 0.02 + 0.98 * (1 + 0.06 * Math.sin(sr * Math.PI) * sr) * oc(sr) / (1 + 0 * sr));
        const ck = seg(t, 2.6, 3.05), blink = t < 2.6 ? 0 : t < 2.72 ? 1 : t < 2.84 ? 0.25 : 1;
        tf(chip, PX + 62, PY + 36 + 30 * (1 - ob(seg(t, 0.35, 0.95))), 0.5 + 0.5 * ob(ck), -8 * (1 - oc(ck))); op(chip, blink);
        dot.setAttribute("fill", t >= 3.05 && Math.sin(now * 4.5) > 0.2 ? "#fff" : YEL);
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
    let off = 0, raf = 0, seen = false, held = calm || frozen;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { if (held) return draw(sc.still, 0); const now = clock(), t = now + off; draw(sc.once ? Math.min(Math.max(t, 0), sc.dur) : ((t % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    /* reduced motion: taps still change the picture, in one step, with no timeline running */
    const api = { calm: calm || frozen, now: clock, t: () => (held ? -99 : clock()), seek: (s) => { if (held) return frame(); off = s - clock(); tick(); }, poke: () => tick(), nudge: () => { if (held) frame(); } };
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
