/* Bright coded scene for "Agent tools today, 5 Nov 2026". Vanilla JS, no library.
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

  /* ---- a toy xylophone: three bars, a mallet taps each in turn ---- */
  SC.xylophone = {
    dur: 7, still: 6.6,
    build(svg, api) {
      const BARS = [["Conductor joins Meta", BLUE, 680], ["OpenAI to buy Pierre", LIL, 630], ["Gemini training", MINT, 580]];
      const CY = [130, 270, 410], BH = 100, TX = 380, HX = 605, REST = [470, 548], T = [1.3, 2.5, 3.7];
      const railX = (side, y) => side < 0 ? 110 + 40 * (y - 60) / 420 : 690 - 40 * (y - 60) / 420;
      [-1, 1].forEach((s) => {
        const d = `M${railX(s, 60)} 60 L${railX(s, 480)} 480`;
        el("path", { d, stroke: INK, "stroke-width": 32, "stroke-linecap": "round" }, svg);
        el("path", { d, stroke: YEL, "stroke-width": 26, "stroke-linecap": "round" }, svg);
      });
      const taps = [-99, -99, -99];
      const bars = BARS.map(([label, col, w], i) => {
        const g = el("g", {}, svg), x = 400 - w / 2, y = CY[i] - BH / 2;
        el("rect", { x: x - 8, y: y - 8, width: w + 16, height: BH + 16, rx: 22, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, g);
        el("rect", { x, y, width: w, height: BH, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, g);
        [-1, 1].forEach((s) => el("circle", { cx: railX(s, CY[i]), cy: CY[i], r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        txt(g, TX, CY[i] + 11, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });
        const ring = el("g", {}, svg), cx = x - 8, arcs = [16, 28, 40].map((r) => {
          const a = 50 * Math.PI / 180, px = cx - r * Math.cos(a), py = r * Math.sin(a);
          return el("path", { d: `M${px} ${CY[i] - py} A${r} ${r} 0 0 0 ${px} ${CY[i] + py}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", opacity: 0 }, ring);
        });
        button(g, label, () => { taps[i] = api.now(); api.poke(); });
        return { g, arcs };
      });
      const mallet = el("g", {}, svg);
      el("rect", { x: 20, y: -6, width: 158, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, mallet);
      el("circle", { r: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, mallet);
      const bounce = (s) => (s < 0 || s > 0.9 ? 0 : 9 * Math.exp(-5 * s) * Math.sin(16 * s));
      const hitL = (s) => (s < -0.22 || s > 0.35 ? 1 : s < 0 ? 1 - Math.pow(seg(s, -0.22, 0), 2) : oc(seg(s, 0, 0.35)));
      return (t, now) => {
        let x, y, L;
        if (t < 1) { const k = io(seg(t, 0.3, 1)); x = REST[0] + (HX - REST[0]) * k; y = REST[1] + (CY[0] - REST[1]) * k; L = k; }
        else if (t < 4.1) { x = HX; y = CY[0] + (CY[1] - CY[0]) * io(seg(t, T[0] + 0.35, T[1] - 0.25)) + (CY[2] - CY[1]) * io(seg(t, T[1] + 0.35, T[2] - 0.25)); L = T.reduce((m, h) => m * hitL(t - h), 1); }
        else { const k = io(seg(t, 4.1, 4.9)); x = HX + (REST[0] - HX) * k; y = CY[2] + (REST[1] - CY[2]) * k; L = 1 - k; }
        mallet.setAttribute("transform", `translate(${x} ${y}) rotate(${28 * L} 175 0)`);
        bars.forEach((b, i) => {
          const s1 = t - T[i], s2 = now - taps[i], s = s2 >= 0 && s2 < 0.9 ? s2 : s1;
          b.g.setAttribute("transform", `translate(0 ${bounce(s1) + bounce(s2)})`);
          b.arcs.forEach((a, j) => a.setAttribute("opacity", s < 0 ? 0 : seg(s, j * 0.08, j * 0.08 + 0.1) * (1 - seg(s, 0.4, 0.9))));
        });
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
