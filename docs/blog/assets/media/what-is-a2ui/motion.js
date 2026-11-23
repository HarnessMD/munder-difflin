/* Bright coded scenes for "What is A2UI?". Vanilla JS, no library.
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
  const ring = (g, x, y, w, h, rx) => {
    el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0 }, g);
    return el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, g);
  };
  const chip = (p, cx, cy, w, label, fill, size = 26) => {
    el("rect", { x: cx - w / 2, y: cy - 23, width: w, height: 46, rx: 23, fill, stroke: INK, "stroke-width": 3 }, p);
    return txt(p, cx, cy + size * 0.35, label, { "text-anchor": "middle", "font-size": size, "font-weight": 700 });
  };
  const tag = (p, label, w) => {
    const g = el("g", {}, p), h = w / 2;
    el("path", { d: `M${-h} -22 H${h - 22} L${h} 0 L${h - 22} 22 H${-h} Z`, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("circle", { cx: h - 18, cy: 0, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    txt(g, -12, 7, label, { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
    return g;
  };

  const SC = {};

  /* ---- 1. a zipper closes between the agent and the app, then tags cross both ways ---- */
  SC.zipper = {
    dur: 8, still: 7.95,
    build(svg, api) {
      const X = 400, TOP = 140, N = 20, STEP = 18, BOT = TOP + (N - 1) * STEP, S0 = BOT + 18, S1 = 118;
      const gap = (y, s) => (y < s ? Math.min(100, (s - y) * 0.36) : 0);
      chip(svg, 250, 72, 124, "Agent", LIL);
      chip(svg, 550, 72, 104, "App", SKY);
      const card = el("g", {}, svg);
      el("rect", { x: 584, y: 228, width: 192, height: 104, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      txt(card, 680, 264, "Flight picker", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      el("rect", { x: 602, y: 282, width: 156, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 2 }, card);
      el("rect", { x: 602, y: 304, width: 100, height: 14, rx: 7, fill: SKY, stroke: INK, "stroke-width": 2 }, card);
      const tapes = [-1, 1].map(() => [el("path", { fill: "none", stroke: INK, "stroke-width": 50, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg), el("path", { fill: "none", stroke: "#fff", "stroke-width": 45, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg)]);
      el("rect", { x: X - 22, y: BOT + 12, width: 44, height: 14, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const teeth = [];
      for (let i = 0; i < N; i++) [-1, 1].forEach((side) => teeth.push({ side, y: TOP + i * STEP + (side > 0 ? 9 : 0), n: el("rect", { x: -12, y: -6, width: 24, height: 12, rx: 3, fill: BLUE, stroke: INK, "stroke-width": 2 }, svg) }));
      const pull = el("g", {}, svg);
      ring(pull, -38, -36, 76, 118, 18);
      el("rect", { x: -26, y: -24, width: 52, height: 40, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, pull);
      el("rect", { x: -14, y: 10, width: 28, height: 60, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, pull);
      el("rect", { x: -6, y: 50, width: 12, height: 10, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, pull);
      el("circle", { cx: 0, cy: 6, r: 4, fill: INK }, pull);
      button(pull, "Pull tab: replay the zipper", () => api.seek(0));
      const check = tag(svg, "Check availability", 240), avail = tag(svg, "Available", 164);
      txt(svg, 40, 576, "Tap the pull tab", { "font-size": 17, "font-weight": 500, fill: MUTE });
      return (t) => {
        const s = S0 - (S0 - S1) * io(seg(t, 0.6, 2.6));
        tapes.forEach(([a, b], k) => {
          const side = k ? 1 : -1; let d = "";
          for (let y = TOP - 22; y <= BOT + 22; y += 9) { const x = X + side * (39 + gap(y, s)); d += (d ? " L" : "M") + x.toFixed(1) + " " + y; }
          a.setAttribute("d", d); b.setAttribute("d", d);
        });
        teeth.forEach((th) => tf(th.n, X + th.side * (9 + gap(th.y, s)), th.y));
        tf(pull, X, s);
        const c = io(seg(t, 2.9, 4.4)), a = io(seg(t, 4.8, 6.3));
        tf(check, 620 - 448 * c, 404 - 22 * Math.sin(Math.PI * c)); check.setAttribute("opacity", seg(t, 2.6, 2.9));
        tf(avail, 180 + 430 * a, 470 - 22 * Math.sin(Math.PI * a)); avail.setAttribute("opacity", seg(t, 4.5, 4.8));
      };
    },
  };

  /* ---- 2. a pegboard of registered components, and one that is not ---- */
  const TOOLS = [
    (g) => { el("rect", { x: -44, y: -17, width: 88, height: 34, rx: 17, fill: YEL, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-18 0 H18", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); },
    (g) => { el("rect", { x: -46, y: -33, width: 92, height: 66, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); el("rect", { x: -36, y: -24, width: 72, height: 14, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2 }, g); el("path", { d: "M-34 4 H30 M-34 18 H12", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); },
    (g) => { el("rect", { x: -46, y: -33, width: 92, height: 66, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); [[-30, 2, MINT], [-8, -16, SKY], [14, -6, BLUE]].forEach(([x, y, f]) => el("rect", { x, y, width: 15, height: 22 - y, fill: f, stroke: INK, "stroke-width": 2 }, g)); el("path", { d: "M-36 24 H36", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); },
    (g) => { el("rect", { x: -46, y: -33, width: 92, height: 66, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); el("rect", { x: -36, y: -25, width: 72, height: 12, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2 }, g); for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) el("rect", { x: -36 + c * 19, y: -6 + r * 12, width: 15, height: 9, rx: 2, fill: r === 1 && c === 2 ? YEL : "#fff", stroke: INK, "stroke-width": 1.6 }, g); },
  ];
  SC.pegboard = {
    dur: 10, still: 9.95,
    build(svg, api) {
      el("rect", { x: 30, y: 84, width: 470, height: 436, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      for (let y = 110; y <= 500; y += 30) for (let x = 55; x <= 475; x += 30) el("circle", { cx: x, cy: y, r: 2.6, fill: INK }, svg);
      const names = ["Button", "Card", "Chart", "Date picker"], at = [[115, 140], [265, 140], [415, 140], [175, 320]], MAP = [355, 320];
      let pick = 2;
      at.forEach(([x, y], i) => {
        const g = el("g", {}, svg);
        ring(g, x - 70, y - 14, 140, 138, 14);
        el("circle", { cx: x, cy: y, r: 5, fill: INK }, g);
        el("path", { d: `M${x} ${y} V${y + 14} Q${x} ${y + 21} ${x + 8} ${y + 17}`, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
        txt(g, x, y + 112, names[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        button(g, `${names[i]} hook: lift the ${names[i]} onto the screen`, () => { pick = i; api.seek(7.6); });
      });
      const map = el("g", {}, svg);
      el("path", { d: `M${MAP[0] - 46} ${MAP[1] + 26} L${MAP[0] - 15} ${MAP[1] + 19} L${MAP[0] + 15} ${MAP[1] + 26} L${MAP[0] + 46} ${MAP[1] + 19} V${MAP[1] + 78} L${MAP[0] + 15} ${MAP[1] + 85} L${MAP[0] - 15} ${MAP[1] + 78} L${MAP[0] - 46} ${MAP[1] + 85} Z M${MAP[0] - 15} ${MAP[1] + 19} V${MAP[1] + 78} M${MAP[0] + 15} ${MAP[1] + 26} V${MAP[1] + 85}`, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 6", "stroke-linejoin": "round" }, map);
      txt(map, MAP[0], MAP[1] + 112, "Map", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
      const nr = txt(map, MAP[0], MAP[1] + 140, "Not registered", { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
      el("rect", { x: 548, y: 168, width: 224, height: 172, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 562, y: 182, width: 196, height: 144, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      el("path", { d: "M660 340 V370 M616 374 H704", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      txt(svg, 660, 420, "Tap a hook", { "text-anchor": "middle", "font-size": 17, "font-weight": 500, fill: MUTE });
      const tools = TOOLS.map((f) => { const g = el("g", { "pointer-events": "none" }, svg); f(g); return g; });
      const note = el("g", { "pointer-events": "none" }, svg);
      el("path", { d: "M-54 -56 H54 V-24 H9 L0 -13 L-9 -24 H-54 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, note);
      txt(note, 0, -33, "Agent", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const key = (tm) => [[0.4, [900, 140]], [1.2, at[0]], [1.8, at[0]], [2.4, at[1]], [3.0, at[1]], [3.6, at[2]], [4.2, at[2]], [4.8, at[3]], [5.4, at[3]], [6.0, MAP], [7.6, MAP], [8.2, at[pick]]].reduce((acc, [k, p], i, arr) => {
        if (i === 0) return tm <= k ? p : acc;
        const [k0, p0] = arr[i - 1]; if (tm < k0) return acc;
        const u = io(seg(tm, k0, k)); return [p0[0] + (p[0] - p0[0]) * u, p0[1] + (p[1] - p0[1]) * u];
      }, [900, 140]);
      return (t) => {
        const [nx, ny] = key(t); tf(note, nx, ny);
        tools.forEach((g, i) => {
          const [x, y] = at[i], cx = x, cy = y + 52, near = Math.abs(nx - x) < 4 && Math.abs(ny - y) < 4 ? 1 : 0;
          if (i === pick) { const k = io(seg(t, 8.3, 9.2)); tf(g, cx + (660 - cx) * k, cy + (254 - cy) * k - 60 * Math.sin(Math.PI * k), 1 + 0.3 * k); }
          else tf(g, cx, cy, 1 + 0.07 * near);
        });
        nr.setAttribute("opacity", seg(t, 6.0, 6.3));
        map.setAttribute("opacity", 1 - 0.55 * oc(seg(t, 6.8, 7.6)));
      };
    },
  };

  /* ---- 3. a slide projector shows an A2UI screen inside an MCP Apps host ---- */
  SC.projector = {
    dur: 8, still: 7.95,
    build(svg, api) {
      el("rect", { x: 360, y: 70, width: 410, height: 400, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      chip(svg, 474, 72, 196, "MCP Apps host", SOFT, 21);
      const beam = el("path", { d: "M252 425 L432 142 H728 V438 H432 Z", fill: SKY, opacity: 0 }, svg);
      const form = el("g", {}, svg);
      el("rect", { x: 445, y: 155, width: 270, height: 270, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, form);
      el("rect", { x: 465, y: 175, width: 230, height: 22, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2 }, form);
      [215, 265].forEach((y) => el("rect", { x: 465, y, width: 230, height: 36, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2 }, form));
      const btn = el("g", {}, form);
      ring(btn, 457, 322, 162, 68, 34);
      const face = el("g", {}, btn);
      el("rect", { x: 465, y: 330, width: 146, height: 52, rx: 26, fill: BLUE, stroke: INK, "stroke-width": 3 }, face);
      txt(face, 538, 363, "Confirm", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      button(btn, "Confirm", () => api.seek(4.35));
      const tick = el("g", {}, form);
      el("circle", { cx: 0, cy: 0, r: 24, fill: MINT, stroke: INK, "stroke-width": 3 }, tick);
      el("path", { d: "M-11 1 L-3 9 L12 -8", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      const card = el("g", {}, svg);
      el("rect", { x: 49, y: 318, width: 172, height: 64, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 135, 356, "A2UI screen", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      el("rect", { x: 40, y: 372, width: 190, height: 96, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M62 372 H208", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      el("path", { d: "M64 424 H124 M64 444 H124", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      [[58, 468], [190, 468]].forEach(([x, y]) => el("rect", { x, y, width: 22, height: 12, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      const lamp = el("circle", { cx: 200, cy: 400, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 226, y: 404, width: 22, height: 42, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 252, cy: 425, r: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 252, cy: 425, r: 11, fill: SKY, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 565, 512, "Tap Confirm", { "text-anchor": "middle", "font-size": 17, "font-weight": 500, fill: MUTE });
      return (t) => {
        const c = ob(seg(t, 0.3, 1.4)); tf(card, 0, -150 * (1 - c)); card.setAttribute("opacity", seg(t, 0.3, 0.6));
        lamp.setAttribute("fill", t >= 1.6 ? YEL : "#fff");
        beam.setAttribute("opacity", 0.3 * oc(seg(t, 1.6, 2.4)));
        const f = oc(seg(t, 2.2, 3.0)); form.setAttribute("opacity", f); form.setAttribute("transform", `translate(580 290) scale(${0.7 + 0.3 * f}) translate(-580 -290)`);
        const p = Math.sin(Math.PI * seg(t, 4.4, 4.7)); face.setAttribute("transform", `translate(538 356) scale(${1 - 0.07 * p}) translate(-538 -356)`);
        const k = seg(t, 4.7, 5.2); tf(tick, 668, 356, k > 0 ? ob(k) : 0.001); tick.setAttribute("opacity", k > 0 ? 1 : 0);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 2.4, still: 2.4,
    build(svg) {
      chip(svg, 136, 86, 144, "Explainer", SOFT, 20);
      txt(svg, 64, 214, "What is A2UI?", { "font-size": 90, "font-weight": 700 });
      el("path", { d: "M66 242 H460", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 298, "Google's A2UI 1.0, explained", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 340, "Checked 12 Nov 2026", { "font-family": MONO, "font-size": 20, "font-weight": 500, fill: MUTE });
      const tiles = [["Agent", LIL], ["A2UI", YEL], ["Your app", BLUE]].map(([s, f], i) => {
        const g = el("g", {}, svg), x = 64 + i * 272;
        el("rect", { x, y: 392, width: 196, height: 82, rx: 18, fill: f, stroke: INK, "stroke-width": 3 }, g);
        txt(g, x + 98, 443, s, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        return g;
      });
      const arrows = [0, 1].map((i) => { const x = 64 + i * 272 + 196; return el("path", { d: `M${x + 14} 433 H${x + 62} M${x + 50} 421 L${x + 62} 433 L${x + 50} 445`, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg); });
      return (t) => {
        tiles.forEach((g, i) => { const k = seg(t, 0.2 + i * 0.25, 1.0 + i * 0.25); tf(g, 520 * (1 - oc(k)), 0); g.setAttribute("opacity", cl(k * 3)); });
        arrows.forEach((a, j) => a.setAttribute("opacity", seg(t, 1.5 + j * 0.15, 1.9 + j * 0.15)));
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
