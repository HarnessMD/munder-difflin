/* Bright coded scenes for "Gemini 4 Neon". Vanilla JS, no library.
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
  const bk = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const op = (n, v) => n.setAttribute("opacity", cl(v));
  const pop = (n, cx, cy, k) => { n.setAttribute("transform", `translate(${cx} ${cy}) scale(${Math.max(k, 0.001)}) translate(${-cx} ${-cy})`); n.setAttribute("opacity", k > 0.001 ? 1 : 0); };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, x, y, s, anchor = "middle") => txt(svg, x, y, s, { "text-anchor": anchor, "font-size": 16, fill: MUTE, "font-weight": 500 });
  const width = (n, fs) => { let w = 0; try { w = n.getComputedTextLength(); } catch (e) { w = 0; } return w || n.textContent.length * fs * 0.6; };
  const ring = (a) => Object.assign({ fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", "stroke-linejoin": "round" }, a);
  /* a rounded card sized to its label, with a soft lilac offset shadow; x is the centre, or the left edge with o.left */
  const box = (p, x, y, h, label, fill, a = {}, o = {}) => {
    const fs = a["font-size"] || 24, pad = o.pad || 32, rx = o.rx || 18, g = el("g", {}, p);
    const sh = o.shadow === false ? null : el("rect", { y: y + 8, height: h, rx, fill: LIL }, g);
    const bg = el("rect", { y, height: h, rx, fill, stroke: INK, "stroke-width": 3 }, g);
    const t = txt(g, 0, y + h / 2 + fs * 0.35, label, Object.assign({ "text-anchor": "middle" }, a));
    const W = width(t, fs) + pad * 2, cx = o.left ? x + W / 2 : x;
    t.setAttribute("x", cx); bg.setAttribute("x", cx - W / 2); bg.setAttribute("width", W);
    if (sh) { sh.setAttribute("x", cx - W / 2 + 8); sh.setAttribute("width", W); }
    return { g, t, cx, cy: y + h / 2, W };
  };

  const SC = {};

  /* ---- 1. five beams go into a glass prism, one blue Text beam comes out ---- */
  SC.prism = {
    dur: 9, still: 8.5,
    build(svg, api) {
      const X = [470, 230], END = 712, TRI = "M420 130 L520 330 L320 330 Z";
      hint(svg, 756, 58, "tap the prism", "end");
      const B = [["Text", SKY], ["Image", MINT], ["Video", LIL], ["Audio", YEL], ["PDF", BLUE]];
      const beams = B.map(([name, col], i) => {
        const u = 0.72 - i * 0.1, e = [320 + 100 * u, 330 - 200 * u], s = [180, 150 + i * 45];
        const lab = txt(svg, 158, s[1] + 7, name, { "text-anchor": "end", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        const ln = { x1: s[0], y1: s[1], x2: s[0], y2: s[1], "stroke-linecap": "round" };
        const under = el("line", Object.assign({ stroke: INK, "stroke-width": 9 }, ln), svg);
        const top = el("line", Object.assign({ stroke: col, "stroke-width": 4 }, ln), svg);
        const dot = el("circle", { cx: s[0], cy: s[1], r: 7, fill: col, stroke: INK, "stroke-width": 2.5 }, svg);
        return { lab, under, top, dot, s, e };
      });
      const pg = el("g", {}, svg);
      el("path", ring({ d: "M420 100 L548 346 L292 346 Z" }), pg);
      el("path", { d: TRI, fill: LIL, transform: "translate(8 8)" }, pg);
      el("path", { d: TRI, fill: SOFT }, pg);
      const inner = beams.map((b, i) => el("line", { x1: b.e[0], y1: b.e[1], x2: b.e[0], y2: b.e[1], stroke: B[i][1], "stroke-width": 3.5, "stroke-linecap": "round" }, pg));
      el("path", { d: TRI, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pg);
      el("path", { d: "M432 168 L446 196", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round" }, pg);
      const ou = el("line", { x1: X[0], y1: X[1], x2: X[0], y2: X[1], stroke: INK, "stroke-width": 13, "stroke-linecap": "round" }, svg);
      const ot = el("line", { x1: X[0], y1: X[1], x2: X[0], y2: X[1], stroke: BLUE, "stroke-width": 7.5, "stroke-linecap": "round" }, svg);
      const head = el("path", { d: "M-2 -15 L22 0 L-2 15 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const olab = txt(svg, END + 20, 204, "Text", { "text-anchor": "end", "font-family": MONO, "font-size": 21, "font-weight": 700 });
      const cd = box(svg, 420, 392, 68, "1,048,576 tokens", YEL, { "font-size": 30, "font-weight": 700 });
      let last = 0;
      button(pg, "Prism: send the five beams again", () => api.seek(last >= 5 ? 8.5 : 0));
      return (t) => {
        last = t;
        const fo = 1 - io(seg(t, 8.5, 9));
        beams.forEach((b, i) => {
          const a = 0.5 + i * 0.1, k = oc(seg(t, a, a + 0.9)), lk = oc(seg(t, a - 0.2, a + 0.3));
          const x = b.s[0] + (b.e[0] - b.s[0]) * k, y = b.s[1] + (b.e[1] - b.s[1]) * k;
          [b.under, b.top].forEach((n) => { n.setAttribute("x2", x); n.setAttribute("y2", y); op(n, (k > 0 ? 1 : 0) * fo); });
          tf(b.lab, -16 * (1 - lk), 0); op(b.lab, lk * fo);
          b.dot.setAttribute("r", 7 * ob(seg(t, a - 0.1, a + 0.3))); op(b.dot, fo);
          const ik = io(seg(t, a + 0.8, a + 1.2));
          inner[i].setAttribute("x2", b.e[0] + (X[0] - b.e[0]) * ik); inner[i].setAttribute("y2", b.e[1] + (X[1] - b.e[1]) * ik);
          op(inner[i], (ik > 0 ? 0.95 : 0) * fo);
        });
        const beat = Math.sin(Math.PI * seg(t, 2.1, 2.55));
        pg.setAttribute("transform", `translate(420 263) scale(${1 + 0.07 * beat}) translate(-420 -263)`);
        const ok = oc(seg(t, 2.4, 3.2)), ox = X[0] + (END - X[0]) * ok;
        [ou, ot].forEach((n) => { n.setAttribute("x2", ox); op(n, (ok > 0 ? 1 : 0) * fo); });
        tf(head, ox, X[1], 0.6 + 0.4 * ok); op(head, (ok > 0.02 ? 1 : 0) * fo);
        tf(olab, 0, -12 * (1 - ob(seg(t, 3.1, 3.6)))); op(olab, seg(t, 3.1, 3.3) * fo);
        tf(cd.g, 0, 36 * (1 - ob(seg(t, 3.8, 4.5)))); op(cd.g, seg(t, 3.8, 4.0) * fo);
        pop(cd.t, cd.cx, cd.cy, ob(seg(t, 4.4, 4.9)));
      };
    },
  };

  /* ---- 2. a thermometer of input prices; the Carbon and Argon tag is lifted to $4.00 ---- */
  SC.thermometer = {
    dur: 10, still: 9.4,
    build(svg, api) {
      const Y = (p) => 450 - 75 * p;
      box(svg, 400, 30, 62, "Input per 1M tokens", SKY, { "font-size": 28, "font-weight": 700 });
      hint(svg, 400, 582, "tap the thermometer");
      const th = el("g", {}, svg), BODY = "M376 458 V150 A24 24 0 0 1 424 150 V458 A40 40 0 1 1 376 458 Z";
      el("rect", ring({ x: 354, y: 108, width: 92, height: 440, rx: 46 }), th);
      el("path", { d: BODY, fill: LIL, transform: "translate(8 8)" }, th);
      el("path", { d: BODY, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, th);
      el("circle", { cx: 400, cy: 490, r: 28, fill: BLUE }, th);
      const col = el("rect", { x: 389, width: 22, rx: 11, fill: BLUE }, th);
      [1.5, 2, 3, 4].forEach((p) => el("path", { d: `M380 ${Y(p)} H387 M413 ${Y(p)} H420`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, th));
      el("path", { d: "M389 474 Q393 466 401 466", fill: "none", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, th);
      const tag = (label, s, x, y) => {
        const g = el("g", {}, svg);
        const t = txt(g, 30 * s, 6, label, { "text-anchor": s > 0 ? "start" : "end", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        const W = 30 + width(t, 17) + 16, d = `M0 0 L${16 * s} -19 H${W * s} V19 H${16 * s} Z`;
        [el("path", { d, fill: LIL, transform: "translate(6 6)" }), el("path", { d: `M0 0 H${-26 * s}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }),
          el("path", { d, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }), el("circle", { cx: 16 * s, cy: 0, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 })].forEach((n) => g.insertBefore(n, t));
        tf(g, x, y);
        return { g, t, W, x, y, s };
      };
      const hy = tag("Hydrogen $1.50", -1, 350, Y(1.5)), ca = tag("Carbon and Argon $2.00", 1, 450, Y(2));
      const ne = tag("Neon $3.00", -1, 350, Y(3)), de = tag("From 1 Dec 2026 $4.00", -1, 350, Y(4));
      const cw = width(ca.t, 17) / 22, px = 30 + 17 * cw, pa = { "font-family": MONO, "font-size": 17, "font-weight": 700 };
      ca.t.textContent = "Carbon and Argon";
      const p2 = txt(ca.g, px, 6, "$2.00", pa), p4 = txt(ca.g, px, 6, "$4.00", pa);
      const gh = el("g", {}); svg.insertBefore(gh, ca.g); tf(gh, 450, Y(2));
      el("path", { d: "M0 0 H-26", stroke: LIL, "stroke-width": 2.5, "stroke-dasharray": "4 5", "stroke-linecap": "round" }, gh);
      el("path", { d: `M0 0 L16 -19 H${ca.W} V19 H16 Z`, fill: "#fff", stroke: LIL, "stroke-width": 2.5, "stroke-dasharray": "6 6", "stroke-linejoin": "round" }, gh);
      txt(gh, px, 6, "$2.00", Object.assign({ fill: MUTE }, pa));
      const AX = 450 + ca.W + 26, A0 = Y(2) + 10, A1 = Y(4) + 18;
      const au = el("line", { x1: AX, y1: A0, x2: AX, y2: A0, stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, svg);
      const at = el("line", { x1: AX, y1: A0, x2: AX, y2: A0, stroke: LIL, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const ah = el("path", { d: "M-13 4 L0 -16 L13 4 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      const v = (t) => 3 * bk(seg(t, 1.3, 3.8), 1.2);
      const when = (L) => { for (let t = 1.3; t < 4; t += 0.01) if (v(t) >= L) return t; return 4; };
      const tH = when(1.5), tC = when(2), tN = when(3);
      let last = 0;
      button(th, "Thermometer: run it again", () => api.seek(last >= 6.6 ? 9.4 : 0));
      return (t) => {
        last = t;
        const fo = 1 - io(seg(t, 9.4, 10)), lv = v(t) * fo;
        col.setAttribute("y", Y(lv)); col.setAttribute("height", 490 - Y(lv));
        const ent = (o, i) => { const a = 0.3 + i * 0.1; op(o.g, seg(t, a, a + 0.2) * fo); return 40 * (1 - ob(seg(t, a, a + 0.6))) * o.s; };
        const nod = (tc, amt) => 1 + amt * Math.sin(Math.PI * seg(t, tc, tc + 0.4));
        tf(hy.g, hy.x + ent(hy, 0), hy.y, nod(tH, 0.06));
        tf(ne.g, ne.x + ent(ne, 2), ne.y, nod(tN, 0.14));
        tf(de.g, de.x + ent(de, 3), de.y);
        tf(ca.g, ca.x + ent(ca, 1), ca.y + (Y(4) - Y(2)) * io(seg(t, 4.9, 6.1)), nod(tC, 0.06));
        const ak = oc(seg(t, 4.3, 4.9)), ay = A0 + (A1 - A0) * ak;
        [au, at].forEach((n) => { n.setAttribute("y2", ay); op(n, (ak > 0 ? 1 : 0) * fo); });
        tf(ah, AX, ay); op(ah, (ak > 0.02 ? 1 : 0) * fo);
        op(gh, seg(t, 5.0, 5.4) * fo);
        pop(p2, px + 25, 0, 1 - io(seg(t, 5.8, 6.0)));
        pop(p4, px + 25, 0, ob(seg(t, 5.95, 6.45)));
      };
    },
  };

  /* ---- 3. three tuning forks, small to large; Neon hums ---- */
  const forkPath = (H, R, st) => {
    const r = R - 14, c = 22 + st + R, ys = -c + Math.sqrt(R * R - 49), h = 7;
    return `M-7 -22 V${ys} A${R} ${R} 0 0 1 ${-R} ${-c} V${-H + h} A${h} ${h} 0 0 1 ${-r} ${-H + h} V${-c} A${r} ${r} 0 0 0 ${r} ${-c} V${-H + h} A${h} ${h} 0 0 1 ${R} ${-H + h} V${-c} A${R} ${R} 0 0 1 7 ${ys} V-22 Z`;
  };
  const arcs = (R, my) => { const c = Math.cos(0.61) * R, s = Math.sin(0.61) * R; return `M${c} ${my - s} A${R} ${R} 0 0 1 ${c} ${my + s} M${-c} ${my - s} A${R} ${R} 0 0 0 ${-c} ${my + s}`; };
  SC.tuningfork = {
    dur: 9, still: 8.5,
    build(svg, api) {
      const BASE = 466, F = [["Hydrogen", MINT, 210, 190, 26, 50], ["Neon", LIL, 400, 250, 30, 62], ["Carbon", BLUE, 600, 310, 34, 74]];
      hint(svg, 400, 582, "tap a fork");
      const cd = box(svg, 400, 62, 64, "Balances depth and efficiency", YEL, { "font-size": 25, "font-weight": 700 });
      el("path", { d: "M386 124.5 L400 144 L414 124.5", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, cd.g);
      el("rect", { x: 98, y: BASE + 8, width: 620, height: 18, rx: 9, fill: LIL }, svg);
      el("rect", { x: 90, y: BASE, width: 620, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const pair = (p) => {
        const g = el("g", {}, p), u = el("path", { d: "M0 0", fill: "none", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, g), s = el("path", { d: "M0 0", fill: "none", stroke: SKY, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        return (d, o) => { u.setAttribute("d", d); s.setAttribute("d", d); op(g, o); };
      };
      const taps = F.map(() => -99);
      const forks = F.map(([name, col, x, H, R, st], i) => {
        const g = el("g", {}, svg), hw = R + 30, c = 22 + st + R;
        el("rect", ring({ x: -hw, y: -H - 18, width: hw * 2, height: H + 36, rx: 24 }), g);
        const rg = el("g", {}, g), emit = [0, 1, 2].map(() => pair(rg)), rest = [0, 1, 2].map(() => pair(rg));
        const body = el("g", {}, g), d = forkPath(H, R, st);
        el("path", { d, fill: SOFT, transform: "translate(6 6)" }, body);
        el("path", { d, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        el("path", { d: `M${-R + 7} ${-H + 18} V${-H + 18 + Math.min(52, (H - c) * 0.5)}`, stroke: "#fff", "stroke-width": 3.5, "stroke-linecap": "round" }, body);
        el("rect", { x: -30, y: -22, width: 60, height: 22, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        txt(svg, x, 536, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
        tf(g, x, BASE);
        button(g, `${name} fork: make it hum`, () => { taps[i] = api.now(); api.burst(2.8); });
        return { g, body, emit, rest, R, x, my: -(c + (H - c) / 2) };
      });
      return (t, now) => {
        const fo = 1 - io(seg(t, 8.5, 9));
        forks.forEach((f, i) => {
          const a = 0.3 + i * 0.12, hop = Math.sin(Math.PI * seg(t, a, a + 0.45));
          let dt = now - taps[i];
          if (i === 1 && t >= 1.3 && t - 1.3 < dt) dt = t - 1.3;
          const on = dt >= 0 && dt < 2.6, env = on ? 1 - seg(dt, 1.9, 2.6) : 0;
          const strike = on && !api.calm ? Math.sin(Math.PI * seg(dt, 0, 0.3)) : 0;
          const vib = on && !api.calm ? 0.045 * Math.sin(dt * 2 * Math.PI * 9) * Math.exp(-dt * 1.4) * env : 0;
          tf(f.g, f.x, BASE - 16 * hop, 1 + 0.05 * strike);
          f.body.setAttribute("transform", `scale(${1 + vib} 1)`);
          f.emit.forEach((set, j) => {
            if (!on) return set("M0 0", 0);
            if (api.calm) return set(arcs(f.R + 22 + j * 18, f.my), env);
            const p = dt * 1.25 - j / 3; if (p < 0) return set("M0 0", 0);
            const q = p % 1; set(arcs(f.R + 22 + q * 66, f.my), env * (1 - q) * Math.min(1, q * 5));
          });
          const k = i === 1 ? ob(seg(t, 3.3, 3.9)) : 0, o = i === 1 ? seg(t, 3.3, 3.6) * fo : 0;
          f.rest.forEach((set, j) => set(arcs((f.R + 22 + j * 18) * (0.85 + 0.15 * k), f.my), o));
        });
        tf(cd.g, 0, -28 * (1 - ob(seg(t, 3.9, 4.5)))); op(cd.g, seg(t, 3.9, 4.1) * fo);
        pop(cd.t, cd.cx, cd.cy, ob(seg(t, 4.4, 4.9)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = box(svg, 72, 58, 40, "Concepts", LIL, { "font-family": MONO, "font-size": 18, "font-weight": 700 }, { left: true, pad: 18, rx: 20, shadow: false });
      const title = txt(svg, 66, 186, "Gemini 4 Neon", { "font-size": 88, "font-weight": 700 });
      const ul = el("path", { d: "M72 214 H330", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", "stroke-dasharray": "258 300" }, svg);
      const sub = txt(svg, 70, 268, "Price, API and how it compares", { "font-size": 32, "font-weight": 500 });
      const chk = txt(svg, 72, 308, "Checked 19 Nov 2026", { "font-family": MONO, "font-size": 18, "font-weight": 500, fill: MUTE });
      const line = el("path", { d: "M72 364 H888", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "816 900" }, svg);
      const tags = ["Input $3.00", "Output $15.00", "Caching $0.15"].map((s, i) => {
        const g = el("g", {}, svg), t = txt(g, 0, 95, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        const h = (width(t, 22) + 48) / 2, d = `M${-h + 18} 38 H${h - 18} L${h} 56 V114 H${-h} V56 Z`;
        [el("path", { d, fill: LIL, transform: "translate(7 7)" }), el("path", { d, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }),
          el("circle", { cx: 0, cy: 54, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }), el("circle", { cx: 0, cy: 3, r: 5, fill: "none", stroke: INK, "stroke-width": 2 }),
          el("path", { d: "M0 8 V49", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" })].forEach((n) => g.insertBefore(n, t));
        return { g, x: 210 + i * 270 };
      });
      const per = txt(svg, 888, 512, "per 1M tokens", { "text-anchor": "end", "font-family": MONO, "font-size": 18, "font-weight": 500, fill: MUTE });
      return (t) => {
        const pk = ob(seg(t, 0.2, 0.6)), cx = pill.cx;
        pill.g.setAttribute("transform", `translate(${cx} 78) scale(${pk}) translate(${-cx} -78)`); op(pill.g, seg(t, 0.2, 0.35));
        const tk = oc(seg(t, 0.32, 0.9)); tf(title, 0, 24 * (1 - tk)); op(title, tk);
        const uk = oc(seg(t, 0.8, 1.3)); ul.setAttribute("stroke-dashoffset", 258 * (1 - uk)); op(ul, uk > 0 ? 1 : 0);
        const sk = oc(seg(t, 0.44, 1.0)); tf(sub, 0, 16 * (1 - sk)); op(sub, sk);
        const ck = oc(seg(t, 0.56, 1.1)); tf(chk, 0, 12 * (1 - ck)); op(chk, ck);
        const lk = oc(seg(t, 0.9, 1.6)); line.setAttribute("stroke-dashoffset", 816 * (1 - lk)); op(line, lk > 0 ? 1 : 0);
        tags.forEach((g, i) => {
          const a = 1.4 + i * 0.12, k = ob(seg(t, a, a + 0.8)), u = seg(t, a + 0.3, a + 1.9);
          tf(g.g, g.x + 560 * (1 - k), 364, 1, 11 * Math.sin(u * Math.PI * 3) * Math.pow(1 - u, 2)); op(g.g, seg(t, a, a + 0.15));
        });
        tf(per, 0, 10 * (1 - ob(seg(t, 3.6, 4.1)))); op(per, seg(t, 3.6, 3.8));
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
    /* reduced motion: hold the still; a tap plays one pass back to the still (seek) or a short reply (burst), then holds again */
    let off = 0, raf = 0, seen = false, held = calm, until = 0, busy = 0, first = true;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); if (calm && !held && now >= until) held = true; draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && (!held || clock() < busy)) raf = requestAnimationFrame(tick); };
    const api = {
      calm, now: clock,
      seek: (s) => { off = s - clock(); held = false; until = clock() + (sc.still > s ? sc.still - s : sc.dur - s + sc.still); tick(); },
      burst: (d) => { busy = Math.max(busy, clock() + d); tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (first) { first = false; if (!held) off = -clock(); }
        tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 18px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
