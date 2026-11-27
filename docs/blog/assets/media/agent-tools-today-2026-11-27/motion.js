/* Bright coded scenes for "Agent Tools Today, 27 Nov 2026". Vanilla JS, no library.
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
  const si = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0; // a counter for SVG ids, so ids never repeat

  /* ---- a bunting kit: two yellow poles, a blue string that sags between them ---- */
  const kit = (svg, o) => {
    const { X0, X1, TOP, SAG, GROUND, PWD, FR } = o;
    const baseY = (x) => { const s = cl((x - X0) / (X1 - X0)); return TOP + 4 * SAG * s * (1 - s); };
    const slope = (x) => (4 * SAG * (1 - 2 * (x - X0) / (X1 - X0))) / (X1 - X0);
    const ground = el("rect", { x: X0 - o.GPAD, y: GROUND - 4, width: X1 - X0 + 2 * o.GPAD, height: o.GH, rx: o.GH / 2, fill: SOFT }, svg);
    const poles = [X0, X1].map((x) => {
      const g = el("g", {}, svg), y = TOP - PWD / 2 - 2, h = GROUND - y + 6;
      el("rect", { x: x - PWD / 2 + 6, y: y + 6, width: PWD, height: h, rx: PWD / 2, fill: SOFT }, g);
      el("circle", { cx: x + 6, cy: TOP - FR - 4 + 6, r: FR, fill: SOFT }, g);
      el("rect", { x: x - PWD / 2, y, width: PWD, height: h, rx: PWD / 2, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
      el("circle", { cx: x, cy: TOP - FR - 4, r: FR, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
      return g;
    });
    const strip = () => el("path", { fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
    return { baseY, slope, ground, poles, strip };
  };
  const stringPath = (outer, inner, X0, X1, y, k) => {
    let d = "", len = 0, px = 0, py = 0;
    for (let i = 0; i <= 85; i++) { const x = X0 + ((X1 - X0) * i) / 85, yy = y(x); d += (i ? " L" : "M") + x.toFixed(1) + " " + yy.toFixed(1); if (i) len += Math.hypot(x - px, yy - py); px = x; py = yy; }
    [outer, inner].forEach((n) => { n.setAttribute("d", d); n.setAttribute("stroke-dasharray", `${len.toFixed(1)} ${len.toFixed(1)}`); n.setAttribute("stroke-dashoffset", (len * (1 - k)).toFixed(1)); n.setAttribute("opacity", k > 0 ? 1 : 0); });
  };
  const growPole = (g, GROUND, k, op) => { g.setAttribute("transform", `translate(0 ${GROUND}) scale(1 ${k}) translate(0 ${-GROUND})`); g.setAttribute("opacity", op); };

  const SC = {};

  /* ---- 1. a sky breeze runs along three lilac pennants ---- */
  SC.bunting = {
    dur: 9, still: 9,
    build(svg, api) {
      const X0 = 60, X1 = 740, TOP = 112, SAG = 50, GROUND = 512, PW = 176, PR = 118, PH = 186;
      const K = kit(svg, { X0, X1, TOP, SAG, GROUND, PWD: 20, FR: 14, GPAD: 36, GH: 16 });
      const B0 = 2.2, B1 = 6.2, B2 = 7.0, GX0 = 30, GX1 = 700, LAG = 60;
      const gxAt = (T) => GX0 + (GX1 - GX0) * si(seg(T, B0, B1));
      const PEN = [["Workspace", "MCP"], ["Crush"], ["Browser", "Use"]], NAME = ["Workspace MCP", "Crush", "Browser Use"], DATE = ["24 Nov", "26 Nov", "26 Nov"];
      const xs = [0.2, 0.5, 0.8].map((s) => X0 + (X1 - X0) * s);
      const tp = xs.map((x) => { for (let T = B0; T < B1; T += 0.01) if (gxAt(T) - LAG >= x) return T; return B1; });
      const defs = el("defs", {}, svg);
      const shape = `M${-PW / 2} 0 H${PW / 2} V${PR} L0 ${PH} L${-PW / 2} ${PR} Z`;
      const ring = `M${-PW / 2 - 10} -10 H${PW / 2 + 10} V${PR + 5} L0 ${PH + 16} L${-PW / 2 - 10} ${PR + 5} Z`;
      const st = [null, null, null];
      let pin = null;
      const val = (s, now) => (!s ? 0 : calm ? (s.on ? 1 : 0) : s.on ? ob(seg(now - s.at, 0, 0.5)) : s.from * (1 - io(seg(now - s.at, 0, 0.35))));
      const pens = xs.map((x, i) => {
        const g = el("g", {}, svg);
        el("path", { d: shape, fill: SOFT, transform: "translate(7 7)" }, g);
        el("path", { d: shape, fill: LIL }, g);
        const cid = `mg-wipe-${++uid}`, cp = el("clipPath", { id: cid }, defs);
        const wipe = el("rect", { x: -PW / 2 - 4, y: -8, width: 0, height: PH + 16 }, cp);
        el("path", { d: shape, fill: MINT, "clip-path": `url(#${cid})` }, g);
        el("path", { d: shape, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: ring, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 7", "stroke-linecap": "round", "stroke-linejoin": "round", class: "mg-ring" }, g);
        const words = el("g", {}, g), y0 = PEN[i].length > 1 ? 52 : 70;
        PEN[i].forEach((s, j) => txt(words, 0, y0 + j * 34, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 }));
        button(g, `${NAME[i]}: dated ${DATE[i]} on its own page`, () => tap(i));
        g.setAttribute("aria-pressed", "false");
        return { g, wipe, words };
      });
      const sOut = K.strip(), sIn = K.strip();
      sOut.setAttribute("stroke", INK); sOut.setAttribute("stroke-width", 9);
      sIn.setAttribute("stroke", BLUE); sIn.setAttribute("stroke-width", 5);
      const gust = el("g", {}, svg);
      const gl = [[10, INK], [5.5, SKY], [9, INK], [4.5, SKY]].map(([w, c]) => el("path", { fill: "none", stroke: c, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, gust));
      const gustD = (gx, len, off) => {
        let d = "";
        for (let i = 0; i <= 16; i++) { const x = gx - len + (len * i) / 16, y = K.baseY(x) - off + 5 * Math.sin((x - gx) / 24); d += (i ? " L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }
        return d + " q 18 -2 18 -16 q 0 -12 -12 -12 q -10 0 -9 10";
      };
      const tags = DATE.map((s) => {
        const g = el("g", { opacity: 0 }, svg);
        el("path", { d: "M0 2 V26", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("rect", { x: -60 + 5, y: 26 + 5, width: 120, height: 54, rx: 12, fill: LIL }, g);
        el("rect", { x: -60, y: 26, width: 120, height: 54, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        el("circle", { cx: 0, cy: 37, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, 0, 69, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        return g;
      });
      let built = false, lastT = -1, gNow = 0, carryG = 0;
      const mNow = [0, 0, 0], carry = [0, 0, 0];
      const mark = () => pens.forEach((p, j) => p.g.setAttribute("aria-pressed", pin && pin.i === j ? "true" : "false"));
      const tap = (i) => {
        const now = api.now(); built = true;
        if (pin && pin.i === i) { st[i] = { on: false, at: now, from: cl(val(st[i], now)) }; pin = null; mark(); if (calm) api.poke(); else api.seek(0); return; }
        const t0 = pin ? pin.t : Math.max(lastT, 1.2);
        if (pin) st[pin.i] = { on: false, at: now, from: cl(val(st[pin.i], now)) };
        pin = { i, at: now, t: t0 }; st[i] = { on: true, at: now };
        mark(); api.poke();
      };
      return (t, now) => {
        if (now > 0 && t >= 2.1) built = true;
        if (t < lastT) { for (let j = 0; j < 3; j++) carry[j] = mNow[j]; carryG = gNow; }
        lastT = t;
        const T = pin ? pin.t : t, E = built ? 9 : T;
        const go = pin ? 1 - (calm ? 1 : io(seg(now - pin.at, 0, 0.4))) : 1;
        let gx = GX1, len = 70, gop = 0, amp = 0;
        if (T < B0) gop = built ? carryG * (1 - io(seg(T, 0.2, 1.0))) : 0;
        else { gx = gxAt(T); len = 170 - 100 * io(seg(T, B1, B2)); gop = oc(seg(T, B0, B0 + 0.35)); amp = 10 * oc(seg(T, B0, B0 + 0.4)) * (1 - io(seg(T, B1 - 0.3, B2))); }
        gNow = gop * go; amp *= go;
        const xc = gx - LAG, dy = (x) => (amp ? -amp * Math.exp(-(((x - xc) / 60) ** 2)) * Math.cos((x - xc) / 17) : 0);
        K.ground.setAttribute("opacity", oc(seg(E, 0, 0.4)));
        K.poles.forEach((g, j) => growPole(g, GROUND, ob(seg(E, 0.1 + j * 0.1, 0.65 + j * 0.1)), seg(E, 0.1 + j * 0.1, 0.2 + j * 0.1)));
        stringPath(sOut, sIn, X0, X1, (x) => K.baseY(x) + dy(x), io(seg(E, 0.55, 1.25)));
        pens.forEach((p, i) => {
          const x = xs[i], pv = val(st[i], now);
          let m = T < B0 ? (built ? carry[i] * (1 - io(seg(T, 0.2, 1.0))) : 0) : oc(seg(T, tp[i] - 0.12, tp[i] + 0.32));
          m = Math.max(m, cl(pv)); mNow[i] = m;
          const L = ob(seg(T, tp[i] - 0.18, tp[i] + 0.38)) * (1 - io(seg(T, tp[i] + 0.5, tp[i] + 1.4))) * go + 0.35 * pv;
          const drop = ob(seg(E, 1.05 + i * 0.11, 1.6 + i * 0.11)), op = seg(E, 1.05 + i * 0.11, 1.2 + i * 0.11);
          const rs = (dy(x + 4) - dy(x - 4)) / 8, rot = (Math.atan(K.slope(x) + rs) * 180) / Math.PI - 12 * L, sy = 1 - 0.22 * L;
          const ay = K.baseY(x) + dy(x) - 46 * (1 - drop);
          p.g.setAttribute("transform", `translate(${x.toFixed(2)} ${ay.toFixed(2)}) rotate(${rot.toFixed(3)}) scale(1 ${sy.toFixed(4)})`);
          p.g.setAttribute("opacity", op);
          p.wipe.setAttribute("width", ((PW + 8) * cl(m)).toFixed(2));
          const lab = oc(seg(E, 1.62 + i * 0.09, 1.98 + i * 0.09)), pop = 1 + 0.08 * Math.sin(Math.PI * seg(T, tp[i], tp[i] + 0.45)) * go;
          p.words.setAttribute("opacity", lab * (0.62 + 0.38 * cl(m)));
          p.words.setAttribute("transform", `translate(0 ${60 + 8 * (1 - lab)}) scale(${pop.toFixed(4)} ${(pop / sy).toFixed(4)}) translate(0 -60)`);
          const tg = tags[i];
          if (pv <= 0.001) { tg.setAttribute("opacity", 0); return; }
          const th = (rot * Math.PI) / 180, bx = x - PH * sy * Math.sin(th), by = ay + PH * sy * Math.cos(th);
          const d2 = now - st[i].at, sw = calm || !st[i].on ? 0 : 8 * Math.sin(d2 * 9) * Math.exp(-d2 * 3.5);
          tg.setAttribute("opacity", cl(pv * 2));
          tf(tg, bx.toFixed(2), (by - 14 * (1 - pv)).toFixed(2), (0.7 + 0.3 * pv).toFixed(4), sw.toFixed(3));
        });
        gust.setAttribute("opacity", gNow);
        if (gNow > 0.001) { const a = gustD(gx, len, 40), b = gustD(gx - 26, len * 0.7, 64); gl[0].setAttribute("d", a); gl[1].setAttribute("d", a); gl[2].setAttribute("d", b); gl[3].setAttribute("d", b); }
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 70, y: 62, width: 176, height: 48, rx: 24, fill: LIL }, pill);
      el("rect", { x: 64, y: 56, width: 176, height: 48, rx: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, pill);
      txt(pill, 152, 87, "Daily brief", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const lines = [
        txt(svg, 62, 200, "Agent Tools Today,", { "font-size": 76, "font-weight": 700 }),
        txt(svg, 62, 284, "27 Nov 2026", { "font-size": 76, "font-weight": 700 }),
        txt(svg, 64, 350, "Workspace MCP, Crush, Browser Use", { "font-size": 28, "font-weight": 500, fill: MUTE }),
      ];
      const chk = txt(svg, 64, 404, "Checked 27 Nov", { "font-family": MONO, "font-size": 20, "font-weight": 500, fill: CAP });
      const X0 = 624, X1 = 900, TOP = 318, SAG = 26, GROUND = 470;
      const K = kit(svg, { X0, X1, TOP, SAG, GROUND, PWD: 16, FR: 11, GPAD: 28, GH: 12 });
      const xs = [0.2, 0.5, 0.8].map((s) => X0 + (X1 - X0) * s);
      const pens = xs.map(() => {
        const g = el("g", {}, svg), d = "M-31 0 H31 L0 78 Z";
        el("path", { d, fill: SOFT, transform: "translate(5 5)" }, g);
        el("path", { d, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        return g;
      });
      const sOut = K.strip(), sIn = K.strip();
      sOut.setAttribute("stroke", INK); sOut.setAttribute("stroke-width", 8);
      sIn.setAttribute("stroke", BLUE); sIn.setAttribute("stroke-width", 4);
      return (t) => {
        const p = ob(seg(t, 0.1, 0.55));
        pill.setAttribute("transform", `translate(152 80) scale(${p.toFixed(4)}) translate(-152 -80)`); pill.setAttribute("opacity", seg(t, 0.1, 0.25));
        lines.forEach((n, i) => { const k = oc(seg(t, 0.25 + i * 0.11, 0.85 + i * 0.11)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${(26 * (1 - k)).toFixed(2)})`); });
        K.ground.setAttribute("opacity", oc(seg(t, 0.7, 1.0)));
        K.poles.forEach((g, j) => growPole(g, GROUND, ob(seg(t, 0.8 + j * 0.1, 1.3 + j * 0.1)), seg(t, 0.8 + j * 0.1, 0.9 + j * 0.1)));
        stringPath(sOut, sIn, X0, X1, K.baseY, io(seg(t, 1.2, 1.75)));
        pens.forEach((g, i) => {
          const a = 1.6 + i * 0.09, drop = ob(seg(t, a, a + 0.5)), u = Math.max(0, t - a - 0.5);
          const sway = 6 * Math.sin(u * 3) * Math.exp(-u * 1.2) * (1 - seg(t, 4, 4.8));
          const rot = (Math.atan(K.slope(xs[i])) * 180) / Math.PI + sway;
          g.setAttribute("transform", `translate(${xs[i].toFixed(2)} ${(K.baseY(xs[i]) - 30 * (1 - drop)).toFixed(2)}) rotate(${rot.toFixed(3)})`);
          g.setAttribute("opacity", seg(t, a, a + 0.12));
        });
        const c = oc(seg(t, 2.3, 2.75));
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
