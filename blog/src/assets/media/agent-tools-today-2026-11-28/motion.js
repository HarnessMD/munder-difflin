/* Bright coded scenes for "Agent Tools Today, 28 Nov 2026". Vanilla JS, no library.
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
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0; // a counter for SVG ids, so ids never repeat
  const RND = { "stroke-linecap": "round", "stroke-linejoin": "round" };
  const line = (d, stroke, w, p) => el("path", Object.assign({ d, fill: "none", stroke, "stroke-width": w }, RND), p);

  /* ---- a teacup drawn around the centre of its saucer, 0,0; set(fill, mint) drives it ---- */
  const BODY = "M-64 -96 H64 C64 -46 46 -8 0 -8 C-46 -8 -64 -46 -64 -96 Z";
  const HANDLE = "M58 -80 C98 -84 98 -32 50 -38";
  const cup = (p, defs, o = {}) => {
    const g = el("g", {}, p), sau = el("g", {}, g), c = el("g", {}, g);
    if (o.saucer) {
      el("ellipse", { cx: 7, cy: 7, rx: 86, ry: 17, fill: SOFT }, sau);
      el("ellipse", { cx: 0, cy: 0, rx: 86, ry: 17, fill: YEL, stroke: INK, "stroke-width": 3 }, sau);
      el("ellipse", { cx: 0, cy: -2, rx: 50, ry: 8, fill: "none", stroke: INK, "stroke-width": 2 }, sau);
    }
    el("path", { d: BODY, fill: SOFT, transform: "translate(7 7)" }, c);
    line(HANDLE, INK, 14, c); line(HANDLE, LIL, 8, c);
    el("path", { d: BODY, fill: LIL }, c);
    let wipe = null;
    if (o.mint) {
      const id = `mg-cup-${++uid}`;
      wipe = el("rect", { x: -80, y: -6, width: 190, height: 4 }, el("clipPath", { id }, defs));
      const m = el("g", { "clip-path": `url(#${id})` }, c);
      line(HANDLE, MINT, 8, m);
      el("path", { d: BODY, fill: MINT }, m);
    }
    el("path", Object.assign({ d: BODY, fill: "none", stroke: INK, "stroke-width": 3 }, RND), c);
    el("ellipse", { cx: 0, cy: -96, rx: 64, ry: 14, fill: SOFT }, c);
    const id2 = `mg-rim-${++uid}`;
    el("ellipse", { cx: 0, cy: -96, rx: 63, ry: 13 }, el("clipPath", { id: id2 }, defs));
    const liq = el("ellipse", { cx: 0, cy: -68, rx: 64, ry: 14, fill: SKY, stroke: INK, "stroke-width": 2, "clip-path": `url(#${id2})` }, c);
    el("ellipse", { cx: 0, cy: -96, rx: 64, ry: 14, fill: "none", stroke: INK, "stroke-width": 3 }, c);
    const set = (f, m) => {
      liq.setAttribute("cy", (-68 - 26.5 * f).toFixed(2));
      if (wipe) { wipe.setAttribute("y", (-6 - 92 * m).toFixed(2)); wipe.setAttribute("height", (4 + 92 * m).toFixed(2)); }
    };
    set(0, 0);
    return { g, sau, c, set };
  };

  /* ---- a blue teapot, spout to the right; it tips around PIV ---- */
  const TIP = [89, -30], PIV = [0, 10];
  const pot = (p) => {
    const g = el("g", {}, p), BD = "M-46 34 C-64 8 -54 -32 0 -32 C54 -32 64 8 46 34 Z";
    el("path", { d: BD, fill: SOFT, transform: "translate(8 8)" }, g);
    line("M-44 -14 C-86 -18 -86 32 -42 24", INK, 14, g); line("M-44 -14 C-86 -18 -86 32 -42 24", BLUE, 8, g);
    el("path", Object.assign({ d: "M40 -4 C60 -6 72 -16 82 -34 L96 -26 C84 -2 70 18 44 22 Z", fill: BLUE, stroke: INK, "stroke-width": 3 }, RND), g);
    el("path", Object.assign({ d: BD, fill: BLUE, stroke: INK, "stroke-width": 3 }, RND), g);
    line("M-36 -6 Q-34 -18 -22 -24", "#fff", 6, g);
    el("rect", { x: -32, y: 31, width: 64, height: 9, rx: 4.5, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
    el("path", Object.assign({ d: "M-28 -30 Q0 -54 28 -30 Z", fill: BLUE, stroke: INK, "stroke-width": 3 }, RND), g);
    el("circle", { cx: 0, cy: -47, r: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
    return g;
  };
  const tipAt = (bx, by, s, deg) => {
    const a = (deg * Math.PI) / 180, x = TIP[0] - PIV[0], y = TIP[1] - PIV[1];
    return [bx + s * (PIV[0] + x * Math.cos(a) - y * Math.sin(a)), by + s * (PIV[1] + x * Math.sin(a) + y * Math.cos(a))];
  };
  const place = (g, bx, by, s, deg) => g.setAttribute("transform", `translate(${bx.toFixed(2)} ${by.toFixed(2)}) scale(${s}) rotate(${deg.toFixed(3)} ${PIV[0]} ${PIV[1]})`);

  /* ---- a sky stream along a curve from the spout to the cup, drawn between u0 and u1 ---- */
  const qb = (a, c, b, u) => [0, 1].map((k) => (1 - u) * (1 - u) * a[k] + 2 * (1 - u) * u * c[k] + u * u * b[k]);
  const flowD = (a, c, b, u0, u1) => { let d = ""; for (let i = 0; i <= 16; i++) { const p = qb(a, c, b, u0 + ((u1 - u0) * i) / 16); d += (i ? " L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); } return d; };
  const stream = (p, w) => {
    const o = line("", INK, w, p), n = line("", SKY, w - 6, p);
    return (d) => [o, n].forEach((x) => { if (d) x.setAttribute("d", d); x.setAttribute("opacity", d ? 1 : 0); });
  };

  const SC = {};

  /* ---- 1. a blue teapot pours into three lilac cups ---- */
  SC.teapot = {
    dur: 9, still: 9,
    build(svg, api) {
      const defs = el("defs", {}, svg);
      const XS = [200, 400, 600], SY = 418, NAME = ["Convex", "DeepCrossAttention", "Kimi"], PTS = ["254", "208", "182"];
      const S = [1.6, 3.45, 5.3], TILT = 40, BY = 170, HOME = [400, 160], END = S[2] + 1.5;
      const T40 = tipAt(0, 0, 1, TILT), BX = XS.map((x) => x - 4 - T40[0]);
      const FLOW = XS.map((x, i) => { const a = [BX[i] + T40[0], BY + T40[1]], b = [x + 8, SY - 92]; return [a, [b[0] + 2, a[1] + 26], b]; });
      let pin = null, built = false, lastT = -1;
      const st = [null, null, null];
      const val = (s, now) => (!s ? 0 : calm ? (s.on ? 1 : 0) : s.on ? ob(seg(now - s.at, 0, 0.5)) : s.from * (1 - io(seg(now - s.at, 0, 0.35))));
      const cups = XS.map((x, i) => {
        const b = el("g", { transform: `translate(${x} ${SY})` }, svg);
        el("rect", { x: -98, y: -130, width: 206, height: 200, rx: 24, fill: "#fff", "fill-opacity": 0 }, b);
        el("rect", { x: -104, y: -132, width: 218, height: 168, rx: 24, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 7", "stroke-linecap": "round", class: "mg-ring" }, b);
        const k = cup(b, defs, { saucer: true, mint: true }), lab = el("g", {}, b);
        const dim = txt(lab, 0, 60, NAME[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700, fill: MUTE });
        const lit = txt(lab, 0, 60, NAME[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700, opacity: 0 });
        button(b, `${NAME[i]}: ${PTS[i]} points on Hacker News`, () => tap(i));
        b.setAttribute("aria-pressed", "false");
        return Object.assign(k, { b, lab, dim, lit });
      });
      const flow = stream(svg, 16);
      const drops = [0, 1].map(() => el("circle", { r: 0, fill: SKY, stroke: INK, "stroke-width": 2 }, svg));
      const P = pot(svg);
      const tags = PTS.map((n) => {
        const g = el("g", { opacity: 0, "pointer-events": "none" }, svg), w = 184, h = w / 2;
        el("rect", { x: -h + 6, y: 18, width: w, height: 54, rx: 14, fill: LIL }, g);
        el("path", Object.assign({ d: `M${-h + 14} 12 H-12 L0 0 L12 12 H${h - 14} Q${h} 12 ${h} 26 V52 Q${h} 66 ${h - 14} 66 H${-h + 14} Q${-h} 66 ${-h} 52 V26 Q${-h} 12 ${-h + 14} 12 Z`, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, RND), g);
        const t = txt(g, 0, 48, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
        el("tspan", {}, t).textContent = n;
        el("tspan", { "font-weight": 500, fill: CAP }, t).textContent = " points";
        return g;
      });
      const mark = () => cups.forEach((c, j) => c.b.setAttribute("aria-pressed", pin && pin.i === j ? "true" : "false"));
      const tap = (i) => {
        const now = api.now();
        if (pin && pin.i === i) { st[i] = { on: false, at: now, from: cl(val(st[i], now)) }; const t0 = pin.t; pin = null; mark(); if (calm) api.poke(); else api.seek(built ? 0 : t0); return; }
        if (!pin) api.poke(); // draw once so lastT is the current time
        const t0 = pin ? pin.t : Math.max(lastT, 0);
        if (pin) st[pin.i] = { on: false, at: now, from: cl(val(st[pin.i], now)) };
        pin = { i, at: now, t: t0 }; st[i] = { on: true, at: now };
        mark(); api.poke();
      };
      const nF = [0, 0, 0], nM = [0, 0, 0], nB = [0, 0, 0], cF = [0, 0, 0], cM = [0, 0, 0], cB = [0, 0, 0];
      let nP = [HOME[0], HOME[1], 0], cP = nP;
      return (t, now) => {
        if (t < lastT) { for (let j = 0; j < 3; j++) { cF[j] = nF[j]; cM[j] = nM[j]; cB[j] = nB[j]; } cP = nP; }
        lastT = t;
        const T = pin ? pin.t : t;
        if (now > 0 && T >= S[0]) built = true;
        const E = built ? 9 : T, rep = built && T < S[0];
        const go = pin ? (calm ? 1 : io(seg(now - pin.at, 0, 0.4))) : 0;
        /* the teapot: glides in, tips over each cup, then rests above the middle one */
        let px, py, th = 0;
        if (T < S[0]) {
          if (rep) { const k = io(seg(T, 0.25, 1.45)); px = lerp(cP[0], BX[0], k); py = lerp(cP[1], BY, k) - 14 * Math.sin(Math.PI * k); th = cP[2] * (1 - io(seg(T, 0, 0.35))); }
          else { const k = oc(seg(T, 0.55, 1.5)); px = lerp(-160, BX[0], k); py = lerp(96, BY, k); }
        } else {
          px = BX[0]; py = BY;
          for (let i = 1; i < 3; i++) { const k = io(seg(T, S[i] - 0.45, S[i])); px += (BX[i] - BX[i - 1]) * k; py -= 12 * Math.sin(Math.PI * k); }
          const h = io(seg(T, END, END + 0.9));
          px = lerp(px, HOME[0], h); py = lerp(py, HOME[1], h) - 10 * Math.sin(Math.PI * h);
          S.forEach((s) => { th = Math.max(th, TILT * io(seg(T, s, s + 0.4)) * (1 - io(seg(T, s + 1.2, s + 1.5)))); });
        }
        th *= 1 - go;
        nP = [px, py, th];
        place(P, px, py, 1, th);
        /* the cups: fill, turn mint, the word brightens, the saucer settles */
        let j = -1;
        cups.forEach((c, i) => {
          let f, m, b;
          if (rep) { const k = io(seg(T, 0.15 + i * 0.1, 1.0 + i * 0.1)); f = cF[i] * (1 - k); m = cM[i] * (1 - k); b = cB[i] * (1 - k); }
          else { f = io(seg(T, S[i] + 0.45, S[i] + 1.3)); m = io(seg(T, S[i] + 0.8, S[i] + 1.45)); b = oc(seg(T, S[i] + 1.3, S[i] + 1.6)); }
          nF[i] = f; nM[i] = m; nB[i] = b;
          c.set(f, m);
          if (!rep && T >= S[i] + 0.3 && T <= S[i] + 1.5) j = i;
          const u = T - (S[i] + 1.32), bo = !rep && u > 0 ? 7 * Math.sin(u * 12) * Math.exp(-u * 4.5) * (1 - go) : 0;
          const a = 0.15 + i * 0.1, ks = oc(seg(E, a, a + 0.5)), kc = ob(seg(E, a + 0.2, a + 0.7)), kl = oc(seg(E, a + 0.6, a + 1.0));
          c.g.setAttribute("transform", `translate(0 ${bo.toFixed(2)})`);
          c.sau.setAttribute("transform", `translate(0 ${(26 * (1 - ks)).toFixed(2)})`); c.sau.setAttribute("opacity", seg(E, a, a + 0.15).toFixed(3));
          const pop = rep ? 0 : Math.sin(Math.PI * seg(T, S[i] + 1.25, S[i] + 1.6));
          c.c.setAttribute("transform", `translate(0 ${(-50 * (1 - kc) - 8).toFixed(2)}) scale(${(1 + 0.06 * pop).toFixed(4)} ${(1 - 0.04 * pop).toFixed(4)}) translate(0 8)`);
          c.c.setAttribute("opacity", seg(E, a + 0.2, a + 0.3).toFixed(3));
          const lp = 1 + 0.08 * (rep ? 0 : Math.sin(Math.PI * seg(T, S[i] + 1.3, S[i] + 1.65)));
          c.lab.setAttribute("opacity", kl.toFixed(3));
          c.lab.setAttribute("transform", `translate(0 ${(14 * (1 - kl) + 52).toFixed(2)}) scale(${lp.toFixed(4)}) translate(0 -52)`);
          c.dim.setAttribute("opacity", (1 - b).toFixed(3)); c.lit.setAttribute("opacity", b.toFixed(3));
        });
        /* the stream, with two drops that hop where it lands; a tap drains it into the cup */
        if (j >= 0) {
          let u1 = oc(seg(T, S[j] + 0.32, S[j] + 0.55)), u0 = io(seg(T, S[j] + 1.2, S[j] + 1.45));
          u1 += (1 - u1) * go; u0 += (1 - u0) * go;
          const [a, c, b] = FLOW[j], on = u1 > 0.97 && u0 < 0.7;
          flow(u1 - u0 > 0.004 ? flowD(a, c, b, u0, u1) : "");
          drops.forEach((d, k) => {
            const ph = ((((T - S[j]) * 2.4 + k * 0.5) % 1) + 1) % 1, sd = k ? 1 : -1;
            d.setAttribute("cx", (b[0] + sd * (6 + 22 * ph)).toFixed(2)); d.setAttribute("cy", (b[1] - 4 - 26 * Math.sin(Math.PI * ph)).toFixed(2));
            const r = on ? 5.5 * (1 - ph) * (1 - go) : 0; d.setAttribute("r", (r > 1.2 ? r : 0).toFixed(2));
          });
        } else { flow(""); drops.forEach((d) => d.setAttribute("r", 0)); }
        /* the tapped cup's tag */
        tags.forEach((g, i) => {
          const pv = val(st[i], now);
          if (pv <= 0.001) { g.setAttribute("opacity", 0); return; }
          const d2 = now - st[i].at, sw = calm || !st[i].on ? 0 : 7 * Math.sin(d2 * 9) * Math.exp(-d2 * 3.5);
          g.setAttribute("opacity", cl(pv * 2).toFixed(3));
          tf(g, XS[i], (490 - 14 * (1 - pv)).toFixed(2), (0.7 + 0.3 * pv).toFixed(4), sw.toFixed(3));
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const defs = el("defs", {}, svg);
      const pill = el("g", {}, svg);
      el("rect", { x: 70, y: 62, width: 176, height: 48, rx: 24, fill: LIL }, pill);
      el("rect", { x: 64, y: 56, width: 176, height: 48, rx: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, pill);
      txt(pill, 152, 87, "Daily brief", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const lines = [
        txt(svg, 62, 200, "Agent Tools Today,", { "font-size": 76, "font-weight": 700 }),
        txt(svg, 62, 284, "28 Nov 2026", { "font-size": 76, "font-weight": 700 }),
        txt(svg, 64, 350, "Convex, DeepCrossAttention, Kimi", { "font-size": 28, "font-weight": 500, fill: MUTE }),
      ];
      const chk = txt(svg, 64, 404, "Checked 28 Nov", { "font-family": MONO, "font-size": 20, "font-weight": 500, fill: CAP });
      const SX = 778, SY = 482, CX = [684, 778, 872], CS = 0.56, PS = 0.72, H = [1.75, 2.8, 3.85], BY = 338;
      const T40 = tipAt(0, 0, PS, 40), BX = CX.map((x) => x - 3 - T40[0]);
      const FLOW = CX.map((x, i) => { const a = [BX[i] + T40[0], BY + T40[1]], b = [x + 4, SY - 52]; return [a, [b[0] + 1, a[1] + 16], b]; });
      const sau = el("g", {}, svg);
      el("ellipse", { cx: SX + 6, cy: SY + 6, rx: 158, ry: 21, fill: SOFT }, sau);
      el("ellipse", { cx: SX, cy: SY, rx: 158, ry: 21, fill: YEL, stroke: INK, "stroke-width": 3 }, sau);
      el("ellipse", { cx: SX, cy: SY - 2, rx: 124, ry: 13, fill: "none", stroke: INK, "stroke-width": 2 }, sau);
      const cups = CX.map((x) => { const w = el("g", {}, svg); return Object.assign(cup(w, defs, {}), { w, x }); });
      const flow = stream(svg, 11);
      const P = pot(svg);
      return (t) => {
        const p = ob(seg(t, 0.1, 0.55));
        pill.setAttribute("transform", `translate(152 80) scale(${p.toFixed(4)}) translate(-152 -80)`); pill.setAttribute("opacity", seg(t, 0.1, 0.25));
        lines.forEach((n, i) => { const k = oc(seg(t, 0.25 + i * 0.11, 0.85 + i * 0.11)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${(26 * (1 - k)).toFixed(2)})`); });
        const ks = oc(seg(t, 0.7, 1.2));
        sau.setAttribute("transform", `translate(0 ${(18 * (1 - ks)).toFixed(2)})`); sau.setAttribute("opacity", seg(t, 0.7, 0.85));
        cups.forEach((c, i) => {
          const a = 0.85 + i * 0.1, k = ob(seg(t, a, a + 0.5));
          c.w.setAttribute("transform", `translate(${c.x} ${(SY - 40 * (1 - k)).toFixed(2)}) scale(${CS})`); c.w.setAttribute("opacity", seg(t, a, a + 0.12));
          c.set(io(seg(t, H[i] + 0.3, H[i] + 0.7)), 0);
        });
        let px = BX[0], py = lerp(300, BY, oc(seg(t, 1.1, 1.7))), th = 0, j = -1;
        for (let i = 1; i < 3; i++) { const k = io(seg(t, H[i] - 0.32, H[i])); px += (BX[i] - BX[i - 1]) * k; py -= 8 * Math.sin(Math.PI * k); }
        H.forEach((h, i) => {
          th = Math.max(th, 40 * io(seg(t, h, h + 0.28)) * (i < 2 ? 1 - io(seg(t, h + 0.62, h + 0.8)) : 1));
          if (t >= h + 0.2 && (i === 2 || t <= h + 0.8)) j = i;
        });
        P.setAttribute("opacity", seg(t, 1.1, 1.3)); place(P, px, py, PS, th);
        if (j >= 0) { const u1 = oc(seg(t, H[j] + 0.22, H[j] + 0.4)), u0 = j < 2 ? io(seg(t, H[j] + 0.6, H[j] + 0.76)) : 0; flow(u1 - u0 > 0.004 ? flowD(...FLOW[j], u0, u1) : ""); }
        else flow("");
        const c = oc(seg(t, 4.6, 5.0));
        chk.setAttribute("opacity", c); chk.setAttribute("transform", `translate(${(-14 * (1 - c)).toFixed(2)} 0)`);
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, started = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { if (!calm) held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && !started) { started = true; off = -clock(); }
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
