/* Bright coded scenes for "Mistral Large 4 vs Claude Opus 5.5". Vanilla JS, no library.
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

  /* ---- a taxi meter, 280 by 200, drawn from its top left corner ---- */
  const meter = (p, color, label) => {
    const g = el("g", {}, p);
    el("rect", { x: 100, y: -26, width: 80, height: 32, rx: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: 0, y: 0, width: 280, height: 200, rx: 24, fill: color, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: 22, y: 24, width: 236, height: 96, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
    const val = txt(g, 140, 91, "$0.00", { "text-anchor": "middle", "font-family": MONO, "font-size": 52, "font-weight": 700 });
    [0, 1, 2].forEach((i) => el("circle", { cx: 46 + i * 40, cy: 160, r: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
    const wheel = el("g", {}, g);
    el("circle", { r: 21, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, wheel);
    el("path", { d: "M-13 0 H13 M0 -13 V13", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, wheel);
    txt(g, 140, 248, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
    const set = (s, a = 0) => { val.textContent = s; tf(wheel, 228, 160, 1, a); };
    set("$0.00");
    return { g, set };
  };

  const SC = {};

  /* ---- 1. two lanes of a running track ---- */
  SC.track = {
    dur: 6.5, still: 6.5,
    build(svg, api) {
      txt(svg, 44, 62, "Coding Agent Index", { "font-size": 32, "font-weight": 700 });
      const X0 = 90, PX = 7.5, xv = (v) => X0 + v * PX;
      const LANES = [
        ["Claude Opus 5.5", BLUE, 62, "Artificial Analysis, 28 Oct 2026", 4.2],
        ["Mistral Large 4", LIL, 48, "Mistral's post, 29 Oct 2026", 3.6],
      ];
      let pinned = -1;
      const tip = strip(svg, 524, 720);
      const lanes = LANES.map(([name, col, val, src, end], i) => {
        const y = 110 + i * 160, g = el("g", {}, svg), cy = y + 92;
        el("rect", { x: 34, y: y - 8, width: 732, height: 146, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
        el("rect", { x: 44, y, width: 712, height: 130, rx: 20, fill: SOFT }, g);
        txt(g, 72, y + 44, name, { "font-family": MONO, "font-size": 22, "font-weight": 700 });
        const band = el("path", { d: "", stroke: "#fff", "stroke-width": 26, "stroke-linecap": "round", fill: "none" }, g);
        const dash = el("path", { d: "", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 12", "stroke-linecap": "round", fill: "none" }, g);
        const trail = el("path", { d: "", stroke: col, "stroke-width": 12, "stroke-linecap": "round", fill: "none" }, g);
        const mk = el("g", {}, g);
        el("circle", { r: 22, fill: col, stroke: INK, "stroke-width": 3 }, mk);
        el("circle", { r: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, mk);
        const chip = el("rect", { x: 0, y: cy - 22, width: 58, height: 44, rx: 14, fill: "#fff" }, g);
        const num = txt(g, 0, cy + 11, "", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        button(g, `${name}, ${val}: ${src}`, () => { pinned = i; api.poke(); });
        return { band, dash, trail, mk, chip, num, cy, val, end, src, d: i * 0.15 };
      });
      el("path", { d: `M${xv(0)} 462 H${xv(84)}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      for (let v = 0; v <= 80; v += 10) el("path", { d: `M${xv(v)} 455 V469`, stroke: INK, "stroke-width": v % 50 === 0 ? 3 : 2, "stroke-linecap": "round" }, svg);
      const pins = lanes.map((l) => el("path", { d: `M${xv(l.val)} 462 V462`, stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "3 6" }, svg));
      return (t) => {
        lanes.forEach((l, i) => {
          const k = io(seg(t, 0.2 + l.d, 1.3 + l.d)), xe = X0 + (xv(84) - X0) * k;
          const lane = `M${X0} ${l.cy} H${Math.max(X0 + 0.01, xe)}`;
          l.band.setAttribute("d", lane); l.dash.setAttribute("d", lane);
          l.band.setAttribute("opacity", k > 0 ? 1 : 0); l.dash.setAttribute("opacity", k > 0 ? 1 : 0);
          const r = oc(seg(t, 1.3, l.end)), v = l.val * r, x = xv(v), stop = t >= l.end;
          l.trail.setAttribute("d", `M${X0} ${l.cy} H${Math.max(X0 + 0.01, x)}`);
          const pop = ob(seg(t, l.end, l.end + 0.4));
          tf(l.mk, x, l.cy, (k > 0.05 ? 1 : 0) * (stop ? 1 + 0.18 * Math.sin(pop * Math.PI) : 1));
          l.num.setAttribute("x", x + 59); l.chip.setAttribute("x", x + 30); l.chip.setAttribute("opacity", t >= 1.3 ? 1 : 0);
          l.num.textContent = t >= 1.3 ? String(Math.round(v)) : "";
          l.num.setAttribute("font-size", stop ? 32 : 26);
          const g = oc(seg(t, l.end, l.end + 0.6));
          pins[i].setAttribute("d", `M${xv(l.val)} ${l.cy + 24} V${l.cy + 24 + (462 - l.cy - 24) * g}`);
          pins[i].setAttribute("opacity", g);
        });
        tip.setAttribute("fill", pinned < 0 ? MUTE : INK);
        tip.textContent = pinned < 0 ? "Tapping a lane shows its source" : LANES[pinned][3];
      };
    },
  };

  /* ---- 2. two taxi meters, one million tokens ---- */
  SC.meter = {
    dur: 7.5, still: 7.5,
    build(svg, api) {
      const MODES = [["1M output tokens", 2.1, 20], ["1M input tokens", 0.7, 4]];
      let mode = 0;
      el("rect", { x: 190, y: 40, width: 420, height: 68, rx: 34, fill: "#fff" }, svg);
      const bar = el("rect", { x: 190, y: 40, width: 68, height: 68, rx: 34, fill: SKY }, svg);
      el("rect", { x: 190, y: 40, width: 420, height: 68, rx: 34, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      const count = txt(svg, 400, 84, MODES[0][0], { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      const left = meter(svg, LIL, "Mistral Large 4"), right = meter(svg, BLUE, "Claude Opus 5.5");
      tf(left.g, 90, 186); tf(right.g, 430, 186);
      const sw = el("g", {}, svg);
      el("rect", { x: 270, y: 478, width: 260, height: 72, rx: 36, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, sw);
      el("rect", { x: 280, y: 486, width: 240, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, sw);
      const knob = el("rect", { x: 285, y: 491, width: 115, height: 46, rx: 23, fill: YEL, stroke: INK, "stroke-width": 2 }, sw);
      txt(sw, 342, 521, "output", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
      txt(sw, 458, 521, "input", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
      const label = () => { sw.setAttribute("aria-label", mode ? "Showing input tokens. Switch to output tokens" : "Showing output tokens. Switch to input tokens"); sw.setAttribute("aria-pressed", mode ? "true" : "false"); };
      button(sw, "", () => { mode = 1 - mode; label(); api.seek(0.01); });
      label();
      const money = (v, end, done) => (done && Number.isInteger(end) ? `$${end}` : `$${v.toFixed(2)}`);
      return (t) => {
        const [name, a, b] = MODES[mode];
        count.textContent = name;
        bar.setAttribute("width", 68 + 352 * io(seg(t, 0.2, 1.2)));
        knob.setAttribute("x", mode ? 400 : 285);
        const ka = oc(seg(t, 1.3, 3.0)), kb = seg(t, 1.3, 5.8), kbe = 1 - Math.pow(1 - kb, 1.6);
        left.set(money(a * ka, a, ka >= 1), ka * 900);
        right.set(money(b * kbe, b, kb >= 1), kbe * 2520);
      };
    },
  };

  /* ---- 3. two shelves: one book leaves, one stays behind glass ---- */
  SC.library = {
    dur: 7.5, still: 7.5,
    build(svg, api) {
      const shelf = (x, name) => {
        txt(svg, x + 150, 96, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      };
      shelf(50, "Mistral Large 4"); shelf(450, "Claude Opus 5.5");
      // the reading card sits behind the right shelf until it slides out
      const card = el("g", {}, svg);
      el("rect", { x: 530, y: 0, width: 140, height: 104, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      [24, 46, 68].forEach((y, i) => el("rect", { x: 548, y, width: [96, 80, 100][i], height: 10, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, card));
      const tagB = el("g", {}, card);
      el("rect", { x: 610, y: 82, width: 76, height: 40, rx: 12, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tagB);
      txt(tagB, 648, 110, "API", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const books = [];
      [50, 450].forEach((x, s) => {
        el("rect", { x, y: 120, width: 300, height: 212, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x, y: 300, width: 300, height: 16, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
        [[x + 40, 30, 116, SKY], [x + 74, 30, 132, MINT], [x + 214, 30, 106, s ? LIL : BLUE]].forEach(([bx, w, h, c]) => el("rect", { x: bx, y: 300 - h, width: w, height: h, rx: 4, fill: c, stroke: INK, "stroke-width": 2.5 }, svg));
      });
      el("path", { d: "M540 332 H660", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      // the thick books, drawn around their centre
      const book = (col) => { const g = el("g", {}, svg); el("rect", { x: -40, y: -76, width: 80, height: 152, rx: 6, fill: col, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-40 -50 H40 M-40 50 H40", stroke: INK, "stroke-width": 2.5 }, g); el("rect", { x: -20, y: -18, width: 40, height: 36, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, g); return g; };
      // tote bag, back then book then front
      const tote = el("g", {}, svg);
      const handle = el("path", { d: "M160 432 Q160 380 200 380 Q240 380 240 432", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, tote);
      const bookA = book(LIL), bookB = book(BLUE);
      const front = el("g", {}, svg);
      el("path", { d: "M118 432 H282 L270 560 H130 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, front);
      const tagA = el("g", {}, svg);
      el("path", { d: "M240 420 L304 446", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tagA);
      el("rect", { x: 292, y: 440, width: 132, height: 42, rx: 12, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tagA);
      txt(tagA, 358, 468, "Download", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const glass = el("g", {}, svg);
      el("rect", { x: 462, y: 132, width: 276, height: 166, rx: 8, fill: "none", stroke: INK, "stroke-width": 2.5 }, glass);
      const shine = el("path", { d: "M500 280 L560 150 M530 280 L590 150", stroke: SKY, "stroke-width": 7, "stroke-linecap": "round" }, glass);
      const hit = el("g", {}, svg);
      el("rect", { x: 10, y: 10, width: 780, height: 580, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, hit);
      button(hit, "Replay the shelves", () => api.seek(0.01));
      return (t) => {
        // left: lift, then drop into the tote
        const lift = io(seg(t, 0.8, 1.4)), drop = seg(t, 1.4, 2.3), dd = drop * drop;
        const ax = 200, ay = 224 - 22 * lift + (462 - 224 + 22) * dd;
        tf(bookA, ax + 40 * Math.sin(drop * Math.PI), ay, 1 + 0.05 * lift * (1 - drop), 14 * Math.sin(drop * Math.PI));
        const land = seg(t, 2.3, 2.8), sq = Math.sin(land * Math.PI) * (1 - land);
        front.setAttribute("transform", `translate(200 560) scale(${1 + 0.06 * sq} ${1 - 0.08 * sq}) translate(-200 -560)`);
        handle.setAttribute("transform", `translate(0 ${10 * sq})`);
        const sw = seg(t, 2.3, 4.3);
        tagA.setAttribute("transform", `rotate(${Math.sin(sw * Math.PI * 4) * 14 * (1 - sw)} 240 420)`);
        // right: the book presses on the glass, then the card slides out
        const nudge = Math.sin(seg(t, 3.0, 3.7) * Math.PI);
        tf(bookB, 600 + 5 * Math.sin(seg(t, 3.0, 3.7) * Math.PI * 4), 224, 1 + 0.06 * nudge);
        shine.setAttribute("transform", `translate(${120 * io(seg(t, 3.1, 3.9))} 0)`);
        const out = ob(seg(t, 3.9, 4.9));
        card.setAttribute("transform", `translate(0 ${220 + 186 * out})`);
        const tp = ob(seg(t, 4.8, 5.3));
        tagB.setAttribute("transform", `translate(648 102) scale(${tp}) translate(-648 -102)`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 60, y: 60, width: 168, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 144, 87, "Comparisons", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 60, 182, "Mistral Large 4", { "font-size": 60, "font-weight": 700 });
      txt(svg, 60, 248, "vs", { "font-size": 60, "font-weight": 700, fill: MUTE });
      txt(svg, 60, 314, "Claude Opus 5.5", { "font-size": 60, "font-weight": 700 });
      el("path", { d: "M62 340 H300", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 60, 396, "Open weights or top scores", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 60, 480, "Checked 29 Oct 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const a = meter(svg, LIL, "Mistral Large 4"), b = meter(svg, BLUE, "Claude Opus 5.5");
      a.set("$2.10", 0); b.set("$20", 0);
      a.g.setAttribute("transform", "translate(560 210) scale(0.62)");
      b.g.setAttribute("transform", "translate(752 210) scale(0.62)");
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
    // with reduced motion an interaction redraws the still frame instead of playing
    const api = { now: clock, seek: (s) => { if (calm) return frame(); off = s - clock(); held = false; tick(); }, poke: () => { if (calm) return frame(); held = false; tick(); } };
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
