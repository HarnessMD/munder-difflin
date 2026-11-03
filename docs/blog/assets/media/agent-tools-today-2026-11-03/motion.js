/* Bright coded scenes for "Agent tools today, 3 Nov 2026". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- a small cabinet whose three drawers slide out one after another ---- */
  SC.drawers = {
    dur: 10, still: 7,
    build(svg, api) {
      const X0 = 190, W = 420, H = 118, PX = -78, PY = 52;
      const ROWS = [["Astra", "Edits weights", YEL], ["Claude Code", "2.1.317", LIL], ["Momentic Mo", "269 bugs found", MINT]];
      el("path", { d: "M110 550 H730", stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      [196, 576].forEach((x) => el("rect", { x, y: 520, width: 28, height: 26, rx: 5, fill: INK }, svg));
      el("path", { d: "M170 104 L230 64 H690 L630 104 Z", fill: SOFT, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M630 104 L690 64 V488 L630 528 Z", fill: BLUE, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 170, y: 104, width: 460, height: 424, rx: 6, fill: SKY, stroke: INK, "stroke-width": 4 }, svg);
      const ys = [124, 258, 392];
      ys.forEach((y) => el("rect", { x: X0, y, width: W, height: H, rx: 8, fill: INK }, svg));
      const taps = [-99, -99, -99];
      const drawers = ROWS.map(([name, tag, col], i) => ({ name, tag, col, i, y: ys[i] })).reverse().map((d) => {
        const g = el("g", {}, svg);
        const top = el("path", { fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const side = el("path", { fill: d.col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const front = el("g", {}, g);
        el("rect", { x: X0 - 7, y: d.y - 7, width: W + 14, height: H + 14, rx: 13, fill: "none", stroke: INK, "stroke-width": 3, class: "mg-ring" }, front);
        el("rect", { x: X0, y: d.y, width: W, height: H, rx: 8, fill: d.col, stroke: INK, "stroke-width": 4 }, front);
        txt(front, X0 + 26, d.y + 54, d.name, { "font-family": MONO, "font-size": 28, "font-weight": 700 });
        el("rect", { x: X0 + W - 188, y: d.y + 22, width: 168, height: 42, rx: 21, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, front);
        txt(front, X0 + W - 104, d.y + 50, d.tag, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        el("rect", { x: X0 + W / 2 - 40, y: d.y + 84, width: 80, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
        button(g, `${d.name}: ${d.tag}`, () => { taps[d.i] = api.now(); api.poke(); });
        return Object.assign(d, { top, side, front });
      });
      return (t, now) => {
        const shut = io(seg(t, 8.4, 9.3));
        drawers.forEach((d) => {
          const a = 0.8 + d.i * 1.4, tl = ob(seg(t, a, a + 0.8)) * (1 - shut);
          const s = now - taps[d.i], user = s >= 0 && s < 4 ? ob(seg(s, 0, 0.7)) * (1 - io(seg(s, 3.2, 4))) : 0;
          const nudge = tl > 0.95 && s >= 0 && s < 0.5 ? Math.sin(seg(s, 0, 0.5) * Math.PI) * 0.18 : 0;
          const k = Math.max(tl, user) + nudge, ox = PX * k, oy = PY * k, x1 = X0 + W, y = d.y;
          d.front.setAttribute("transform", `translate(${ox} ${oy})`);
          const vis = k > 0.01 ? 1 : 0;
          d.top.setAttribute("opacity", vis); d.side.setAttribute("opacity", vis);
          d.top.setAttribute("d", `M${X0 + ox} ${y + oy} H${x1 + ox} L${x1} ${y} H${X0} Z`);
          d.side.setAttribute("d", `M${x1 + ox} ${y + oy} L${x1} ${y} V${y + H} L${x1 + ox} ${y + H + oy} Z`);
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
