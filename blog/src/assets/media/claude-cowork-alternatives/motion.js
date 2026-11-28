/* Bright coded scenes for "Claude Cowork alternatives". Vanilla JS, no library.
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

  const CAP = "#6B5878";
  const name = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 700 }, a));
  const fit = (n, w) => { const L = n.getComputedTextLength(); if (L > w) n.setAttribute("font-size", parseFloat(n.getAttribute("font-size")) * w / L); };
  const pill = (p, x, y, s, fill, fs = 18, h = 40) => {
    const g = el("g", {}, p);
    const r = el("rect", { x, y, height: h, rx: h / 2, fill, stroke: INK, "stroke-width": 2.5 }, g);
    const t = name(g, x + 16, y + h / 2 + fs * 0.36, s, { "font-size": fs });
    const w = t.getComputedTextLength() + 32; r.setAttribute("width", w);
    return { g, w };
  };
  const lines = (p, cx, y, s, fs, w, gap) => { const ws = s.split(" "), y0 = ws.length > 1 ? y - gap / 2 : y; ws.forEach((wd, i) => fit(name(p, cx, y0 + i * gap, wd, { "text-anchor": "middle", "font-size": fs }), w)); };
  let uid = 0;

  /* ---- small icons, each drawn around 0,0 in about 64 by 56 ---- */
  const ART = {
    laptop(g) {
      el("rect", { x: -24, y: -24, width: 48, height: 34, rx: 4, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
      el("path", { d: "M-32 12 H32 L27 21 H-27 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    },
    desks(g) {
      [[-28, -14], [4, -14], [-28, 14], [4, 14]].forEach(([x, y]) => {
        el("rect", { x: x + 7, y: y - 10, width: 10, height: 7, rx: 1.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x, y: y - 2, width: 24, height: 12, rx: 2.5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
      });
    },
    cloud(g) {
      el("path", { d: "M-20 18 H22 A14 14 0 0 0 24 -10 A18 18 0 0 0 -10 -14 A13 13 0 0 0 -22 -2 A10 10 0 0 0 -20 18 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    },
    terminal(g) {
      el("rect", { x: -30, y: -24, width: 60, height: 46, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
      el("path", { d: "M-30 -12 H30", stroke: INK, "stroke-width": 2.5 }, g);
      [[-22, MINT], [-14, YEL], [-6, SKY]].forEach(([x, c]) => el("circle", { cx: x, cy: -18, r: 2.6, fill: c, stroke: INK, "stroke-width": 1.5 }, g));
      el("path", { d: "M-20 -2 L-11 5 L-20 12 M-4 13 H12", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    },
    bubble(g) {
      el("path", { d: "M-26 -22 H26 Q32 -22 32 -16 V6 Q32 12 26 12 H-4 L-16 24 V12 H-26 Q-32 12 -32 6 V-16 Q-32 -22 -26 -22 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      [-12, 0, 12].forEach((x) => el("circle", { cx: x, cy: -5, r: 3.2, fill: INK }, g));
    },
    server(g) {
      el("rect", { x: -22, y: -26, width: 44, height: 52, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
      [-9, 8].forEach((y) => el("path", { d: `M-22 ${y} H22`, stroke: INK, "stroke-width": 2.5 }, g));
      [-17, 0, 17].forEach((y) => { el("path", { d: `M-14 ${y} H2`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g); el("circle", { cx: 12, cy: y, r: 3, fill: MINT, stroke: INK, "stroke-width": 1.5 }, g); });
    },
  };

  const SC = {};

  /* ---- 1. six cards drop onto a shelf; Claude Cowork stands apart ---- */
  SC.lineup = {
    dur: 7, still: 7,
    build(svg, api) {
      const NAMES = ["Hob", "Munder Difflin", "ChatGPT Work", "Goose", "OpenClaw", "Hermes Agent"];
      const DRAW = [ART.laptop, ART.desks, ART.cloud, ART.terminal, ART.bubble, ART.server];
      const CW = 90, CH = 196, GAP = 7, X0 = 194, SY = 386, TOP = SY - CH;
      el("rect", { x: 28, y: SY, width: 128, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 36, y: TOP, width: 112, height: CH, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      lines(svg, 92, TOP + 104, "Claude Cowork", 17, 96, 24);
      el("path", { d: `M172 ${TOP - 14} V${SY + 54}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, svg);
      const shelf = el("g", {}, svg);
      el("rect", { x: 184, y: TOP - 40, width: 604, height: CH + 116, rx: 20, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, shelf);
      [250, 712].forEach((x) => el("path", { d: `M${x} ${SY + 16} V${SY + 58} L${x + 34} ${SY + 16}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" }, shelf));
      const cards = NAMES.map((n, i) => {
        const x = X0 + i * (CW + GAP), g = el("g", {}, shelf);
        el("rect", { x, y: TOP, width: CW, height: CH, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g); DRAW[i](ic);
        lines(g, x + CW / 2, TOP + 152, n, 16, CW - 12, 22);
        return { g, ic, cx: x + CW / 2, d: 0.4 + i * 0.5 };
      });
      el("rect", { x: 182, y: SY, width: 600, height: 16, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, shelf);
      button(shelf, "Replay the drop", () => api.seek(0));
      return (t) => {
        cards.forEach((c) => {
          const p = seg(t, c.d, c.d + 0.45), land = Math.sin(seg(t, c.d + 0.45, c.d + 0.75) * Math.PI);
          c.g.setAttribute("opacity", t < c.d ? 0 : 1);
          c.g.setAttribute("transform", `translate(0 ${-460 * (1 - p * p) - 12 * land})`);
          const k = seg(t, c.d + 0.45, c.d + 0.85);
          tf(c.ic, c.cx, TOP + 64, k <= 0 ? 0.001 : ob(k));
        });
      };
    },
  };

  /* ---- 2. where the work runs: vendor cloud or your hardware ---- */
  SC.where = {
    dur: 10, still: 10,
    build(svg, api) {
      const id = `mgc${++uid}`, TX = 62, TW = 676, SEG = 150;
      el("rect", { x: 30, y: 30, width: 740, height: 540, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M54 266 H746", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, svg);
      txt(svg, TX, 82, "Vendor cloud", { "font-size": 24, "font-weight": 700 });
      txt(svg, TX, 318, "Your hardware", { "font-size": 24, "font-weight": 700 });
      const big = el("g", {}, svg); ART.cloud(big); tf(big, 640, 128, 1.9);
      const clip = el("clipPath", { id }, el("defs", {}, svg));
      [208, 520].forEach((y) => el("rect", { x: TX, y, width: TW, height: 18, rx: 9 }, clip));
      const bar = (y, col) => {
        el("rect", { x: TX, y, width: TW, height: 18, rx: 9, fill: SOFT }, svg);
        const g = el("g", { "clip-path": `url(#${id})` }, svg);
        const s = el("rect", { y, width: SEG, height: 18, rx: 9, fill: col }, g);
        el("rect", { x: TX, y, width: TW, height: 18, rx: 9, fill: "none", stroke: INK, "stroke-width": 2.5 }, svg);
        return { g, s };
      };
      const pos = (t) => TX - SEG + (((t * 260) % (TW + SEG)) + TW + SEG) % (TW + SEG);
      const cloudBar = bar(208, BLUE), hwBar = bar(520, MINT);
      const tags = [];
      const slide = (p, x, y, s, fill, d, dy) => { const g = el("g", {}, svg), tg = pill(g, x, y, s, fill); tags.push({ g, d, dy }); return tg.w; };
      const w1 = slide(svg, TX, 116, "Claude Cowork", SKY, 0.4, -36);
      slide(svg, TX + w1 + 16, 116, "ChatGPT Work", SKY, 0.65, -36);
      const lap = el("g", {}, svg); tf(lap, 142, 444);
      el("rect", { x: -86, y: -102, width: 172, height: 134, rx: 18, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, lap);
      const lid = el("g", {}, lap);
      el("rect", { x: -62, y: -86, width: 124, height: 86, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, lid);
      const screen = el("rect", { x: -52, y: -76, width: 104, height: 66, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2 }, lid);
      el("path", { d: "M-76 0 H76 L68 16 H-68 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, lap);
      const hx = 252, wa = slide(svg, hx, 352, "Hob", YEL, 1.1, 36), wb = slide(svg, hx, 406, "Goose", YEL, 1.6, 36);
      const c2 = hx + Math.max(wa, wb) + 16;
      slide(svg, c2, 352, "Munder Difflin", YEL, 1.35, 36); slide(svg, c2 + 0, 406, "OpenClaw", YEL, 1.85, 36);
      const srv = el("g", {}, svg); ART.server(srv); tf(srv, 652, 372, 1.25);
      const hm = el("g", {}, svg); const hw = pill(hm, 0, 0, "Hermes Agent", YEL).w; hm.remove();
      slide(svg, 652 - hw / 2, 420, "Hermes Agent", YEL, 2.2, 36);
      const shut = el("g", {}, svg);
      el("rect", { x: 82, y: 474, width: 120, height: 30, rx: 15, fill: SOFT, stroke: INK, "stroke-width": 2 }, shut);
      txt(shut, 142, 494, "Laptop closed", { "text-anchor": "middle", "font-size": 15, "font-weight": 600, fill: CAP });
      let user = null, at = 0, hold = pos(4.6);
      const shutAmt = (t, now) => user == null ? io(seg(t, 4.6, 5.3)) : user ? io(seg(now - at, 0, 0.6)) : 1 - io(seg(now - at, 0, 0.6));
      let last = 0;
      button(lap, "Open or close the laptop lid", () => { user = !(last > 0.5); at = api.now(); api.poke(); });
      return (t, now) => {
        tags.forEach((g) => { const k = oc(seg(t, g.d, g.d + 0.5)); g.g.setAttribute("opacity", k); g.g.setAttribute("transform", `translate(0 ${g.dy * (1 - k)})`); });
        const k = shutAmt(t, now); last = k;
        lid.setAttribute("transform", `scale(1 ${1 - 0.9 * k})`); screen.setAttribute("opacity", k < 0.5 ? 1 : 0);
        const clock = user == null ? t : now;
        cloudBar.s.setAttribute("x", pos(t)); cloudBar.g.setAttribute("opacity", seg(t, 0.4, 0.8));
        if (k < 0.5) { if (user != null || t < 4.6) hold = pos(clock); }
        else if (user == null) hold = pos(4.6);
        hwBar.s.setAttribute("x", hold); hwBar.g.setAttribute("opacity", k < 0.5 ? seg(t, 1.1, 1.5) : 0);
        const s = seg(k, 0.75, 1); shut.setAttribute("opacity", s); shut.setAttribute("transform", `translate(142 489) scale(${0.6 + 0.4 * ob(s)}) translate(-142 -489)`);
      };
    },
  };

  /* ---- 3. price tags on a rail ---- */
  SC.tags = {
    dur: 7, still: 7,
    build(svg, api) {
      const RY = 176;
      el("path", { d: `M28 ${RY} H772`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      [28, 772].forEach((x) => el("circle", { cx: x, cy: RY, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      const shape = (x, y, w, h) => `M${x + 22} ${y} H${x + w - 22} L${x + w} ${y + 22} V${y + h - 14} Q${x + w} ${y + h} ${x + w - 14} ${y + h} H${x + 14} Q${x} ${y + h} ${x} ${y + h - 14} V${y + 22} Z`;
      const all = [];
      const tag = (x, w, h, fill, label, draw, d, amp) => {
        const cx = x + w / 2, y = RY + 44, g = el("g", {}, svg);
        el("path", { d: `M${cx} ${RY} V${y + 15}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("path", { d: shape(x - 6, y - 6, w + 12, h + 12), fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, g);
        el("path", { d: shape(x, y, w, h), fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cx, cy: y + 22, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        draw(g, cx, y);
        const o = { g, cx, d, amp, tap: -99 };
        button(g, label, () => { o.tap = api.now(); api.poke(); });
        all.push(o);
      };
      const BIG = 136, SM = 76;
      [["Claude Pro", LIL], ["ChatGPT Plus", SKY]].forEach(([n, c], i) => tag(34 + i * (BIG + 14), BIG, 230, c, `${n}, $20 a month`, (g, cx, y) => {
        lines(g, cx, y + 92, n, 22, BIG - 16, 28);
        el("path", { d: `M${cx - 48} ${y + 140} H${cx + 48}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, g);
        fit(name(g, cx, y + 184, "$20 a month", { "text-anchor": "middle", "font-size": 17 }), BIG - 16);
      }, 0.15, 12));
      const FREE = ["Hob", "Munder Difflin", "Goose", "OpenClaw", "Hermes Agent"], FX = 346;
      FREE.forEach((n, i) => tag(FX + i * (SM + 7), SM, 160, YEL, `${n}, Free`, (g, cx, y) => {
        lines(g, cx, y + 66, n, 14, SM - 10, 19);
        name(g, cx, y + 132, "Free", { "text-anchor": "middle", "font-size": 22 });
      }, 1.2 + i * 0.35, 40));
      const lab = el("g", {}, svg), LX = FX + (5 * SM + 28) / 2;
      const lr = el("rect", { y: 418, height: 42, rx: 21, fill: MINT, stroke: INK, "stroke-width": 2.5 }, lab);
      const lt = txt(lab, LX, 446, "Bring a model", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const lw = lt.getComputedTextLength() + 40; lr.setAttribute("x", LX - lw / 2); lr.setAttribute("width", lw);
      return (t, now) => {
        all.forEach((o) => {
          const s = t - o.d, u = now - o.tap;
          let a = s < 0 ? o.amp : o.amp * Math.exp(-3.2 * s) * Math.cos(7 * s);
          if (u >= 0 && u < 4) a += 20 * Math.exp(-2.4 * u) * Math.sin(7.5 * u);
          o.g.setAttribute("opacity", o.amp > 20 ? seg(t, o.d - 0.05, o.d + 0.12) : 1);
          o.g.setAttribute("transform", `rotate(${a} ${o.cx} ${RY})`);
        });
        const k = seg(t, 3.4, 3.8);
        lab.setAttribute("opacity", k > 0 ? 1 : 0);
        lab.setAttribute("transform", `translate(${LX} 439) scale(${k <= 0 ? 0.001 : ob(k)}) translate(${-LX} -439)`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      const pr = el("rect", { x: 64, y: 78, height: 42, rx: 21, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const pt = txt(svg, 86, 106, "Comparisons", { "font-size": 20, "font-weight": 700 });
      pr.setAttribute("width", pt.getComputedTextLength() + 44);
      txt(svg, 62, 212, "Claude Cowork", { "font-size": 62, "font-weight": 700 });
      txt(svg, 62, 292, "alternatives", { "font-size": 62, "font-weight": 700 });
      el("path", { d: "M66 316 H430", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 378, "Six agents for office work", { "font-size": 28, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 446, "Checked 27 Oct 2026", { "font-size": 20, "font-weight": 600, fill: CAP });
      const CX = 562, CY = 258;
      el("rect", { x: CX, y: CY - 52, width: 100, height: 100, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      lines(svg, CX + 50, CY + 6, "Claude Cowork", 18, 86, 26);
      el("path", { d: `M${CX + 110} ${CY} H${CX + 136} M${CX + 126} ${CY - 10} L${CX + 138} ${CY} L${CX + 126} ${CY + 10}`, stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const PX = 828, PY = 408, fills = [YEL, LIL, "#fff", "#fff", "#fff", "#fff"];
      fills.forEach((f, i) => {
        const a = -30 + i * 12, g = el("g", { transform: `rotate(${a} ${PX} ${PY})` }, svg);
        el("rect", { x: PX - 26, y: PY - 187, width: 52, height: 74, rx: 9, fill: f, stroke: INK, "stroke-width": 3 }, g);
      });
      return () => {};
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
