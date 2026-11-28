/* Bright coded scenes for "Agent tools today, 4 Nov 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- 1. a toaster pops up the day's three lead items, one slice after another ---- */
  SC.toaster = {
    dur: 9.4, still: 6,
    build(svg, api) {
      const X = [200, 400, 600], TOP = 330, UP = 76, DOWN = 306, POP = [0.9, 2.3, 3.7], SINK = 7.8;
      const SL = [["Postman"], ["Astra", "critique"], ["Claude", "Code"]], TAG = ["1,084 points", "922 points", "2.1.318"], TC = [LIL, SKY, MINT];
      el("ellipse", { cx: 400, cy: 562, rx: 340, ry: 16, fill: SOFT }, svg);
      const heat = X.map((x) => el("path", { d: `M${x} ${TOP - 14} q8 -10 0 -20 q-8 -10 0 -20 q8 -10 0 -20`, stroke: SKY, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, svg));
      X.forEach((x) => el("rect", { x: x - 94, y: TOP - 8, width: 188, height: 14, rx: 7, fill: INK }, svg));
      const defs = el("defs", {}, svg), clip = el("clipPath", { id: "mg-toaster-clip" }, defs);
      el("rect", { x: 0, y: 0, width: 800, height: 520 }, clip);
      const layer = el("g", { "clip-path": "url(#mg-toaster-clip)" }, svg);
      const burst = X.map((x) => [-1, 0, 1].map((d, j) => el("path", { d: "M0 0 V-16", stroke: [MINT, YEL, LIL][j], "stroke-width": 5, "stroke-linecap": "round", transform: `translate(${x + d * 112} ${TOP - 18}) rotate(${d * 35})` }, svg)));
      const press = [-99, -99, -99], kept = [false, false, false];
      let lastT = 0;
      const slices = X.map((x, i) => {
        const g = el("g", {}, layer);
        el("path", { d: "M-86 270 V64 C-102 30 -72 -2 -40 6 Q0 -6 40 6 C72 -2 102 30 86 64 V270 Z", fill: YEL, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-72 264 V70 C-84 42 -62 20 -38 24 Q0 14 38 24 C62 20 84 42 72 70 V264 Z", fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: "M-98 280 V60 C-114 18 -76 -16 -40 -6 Q0 -18 40 -6 C76 -16 114 18 98 60 V280", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, g);
        SL[i].forEach((s, j) => txt(g, 0, (SL[i].length === 1 ? 84 : 70) + j * 30, s, { "text-anchor": "middle", "font-size": 27, "font-weight": 700 }));
        el("rect", { x: -64, y: 120, width: 128, height: 34, rx: 17, fill: TC[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 143, TAG[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 });
        [[-40, 190], [26, 206], [-12, 232], [44, 176]].forEach(([cx, cy]) => el("circle", { cx, cy, r: 4, fill: SOFT }, g));
        button(g, `${SL[i].join(" ")}, ${TAG[i]}`, () => { if (lastT >= SINK - 0.3) api.seek(6); press[i] = api.now(); kept[i] = true; api.poke(); });
        return g;
      });
      el("rect", { x: 70, y: TOP, width: 660, height: 210, rx: 46, fill: BLUE, stroke: INK, "stroke-width": 4 }, svg);
      el("path", { d: "M112 356 H330", stroke: SKY, "stroke-width": 7, "stroke-linecap": "round" }, svg);
      el("rect", { x: 230, y: 388, width: 340, height: 114, rx: 26, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      [0, 1, 2].forEach((j) => el("path", { d: `M${280 + j * 120} 420 V470`, stroke: LIL, "stroke-width": 8, "stroke-linecap": "round" }, svg));
      el("circle", { cx: 150, cy: 445, r: 34, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const dial = el("path", { d: "M150 445 V420", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("rect", { x: 644, y: 372, width: 12, height: 138, rx: 6, fill: INK }, svg);
      const lever = el("rect", { x: 620, y: -13, width: 60, height: 26, rx: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const lamp = el("circle", { cx: 690, cy: 360, r: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      [[120, 540], [620, 540]].forEach(([x, y]) => el("rect", { x, y: y - 4, width: 60, height: 18, rx: 8, fill: INK }, svg));
      const tapK = (s) => (s < 0.3 ? 1 - io(s / 0.3) : s < 0.55 ? 0 : ob(seg(s, 0.55, 1.2)));
      return (t, now) => {
        lastT = t;
        const sink = io(seg(t, SINK, SINK + 0.8));
        if (t >= SINK) kept.fill(false);
        let sum = 0;
        slices.forEach((g, i) => {
          let k = ob(seg(t, POP[i], POP[i] + 0.7)) * (1 - sink);
          if (kept[i]) k = Math.max(k, 1);
          const s = now - press[i];
          if (s >= 0 && s < 1.2) k = s < 0.3 ? k * tapK(s) : tapK(s);
          sum += cl(k);
          g.setAttribute("transform", `translate(${X[i]} ${DOWN + (UP - DOWN) * k})`);
          const b = seg(t, POP[i] + 0.1, POP[i] + 0.6), bs = s >= 0 && s < 1.2 ? seg(s, 0.6, 1.1) : 0, bb = Math.max(b > 0 && b < 1 ? b : 0, bs > 0 && bs < 1 ? bs : 0);
          burst[i].forEach((p, j) => { const d = j - 1; p.setAttribute("transform", `translate(${X[i] + d * 112} ${TOP - 18 - 26 * oc(bb)}) rotate(${d * 35})`); p.setAttribute("opacity", bb > 0 ? 1 - bb : 0); });
        });
        const lv = sum / 3;
        lever.setAttribute("transform", `translate(0 ${496 - 112 * lv})`);
        dial.setAttribute("transform", `rotate(${-120 + 240 * lv} 150 445)`);
        lamp.setAttribute("fill", lv > 0.97 ? MINT : SOFT);
        const h = Math.max(1 - seg(t, 0.5, 0.9), seg(t, SINK + 0.8, SINK + 1.2));
        heat.forEach((p, i) => { const w = (now * 0.9 + i * 0.33) % 1; p.setAttribute("opacity", h * Math.sin(w * Math.PI) * 0.9); p.setAttribute("transform", `translate(0 ${-14 * w})`); });
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
