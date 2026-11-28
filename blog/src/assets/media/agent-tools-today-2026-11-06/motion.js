/* Bright coded scenes for "Agent Tools Today, 6 Nov 2026". Vanilla JS, no library.
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

  /* ---- 1. three drink coasters slide onto a table, each spins a quarter turn as it lands ---- */
  SC.coasters = {
    dur: 8, still: 7.9,
    build(svg, api) {
      el("rect", { x: 92, y: 380, width: 26, height: 130, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 682, y: 380, width: 26, height: 130, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 40, y: 360, width: 720, height: 34, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 40, y: 90, width: 720, height: 286, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const C = [["Claude Code", "email", BLUE], ["Astra", "report", LIL], ["Crush", "subagents", MINT]];
      const X = [170, 400, 630], Y = 226, R = 100, start = [0.5, 2.1, 3.7];
      const flip = [0, 0, 0], at = [-99, -99, -99];
      const cs = C.map(([a, b, col], i) => {
        const g = el("g", {}, svg), edge = el("circle", { cy: 9, r: R, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const spin = el("g", {}, g), body = el("g", {}, spin);
        el("circle", { r: R, fill: col, stroke: INK, "stroke-width": 3 }, body);
        const front = el("g", {}, body), back = el("g", { transform: "scale(-1 1)" }, body);
        el("circle", { r: 90, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 8", "stroke-linecap": "round" }, front);
        txt(front, 0, 0, a, { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
        txt(front, 0, 28, b, { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
        el("circle", { r: 90, fill: "#fff", stroke: INK, "stroke-width": 2 }, back);
        txt(back, 0, 12, "5 Nov", { "text-anchor": "middle", "font-family": MONO, "font-size": 34, "font-weight": 700 });
        el("circle", { r: 114, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 7" }, g);
        button(g, `Coaster ${i + 1}: ${a} ${b}. Flip to see the date on its back`, () => { flip[i] = 1 - flip[i]; at[i] = api.now(); g.setAttribute("aria-pressed", flip[i] ? "true" : "false"); api.paint(); });
        g.setAttribute("aria-pressed", "false");
        return { g, edge, spin, body, front, back };
      });
      return (t, now) => {
        cs.forEach((c, i) => {
          const s = start[i], k = oc(seg(t, s, s + 1)), spin = ob(seg(t, s + 0.55, s + 1.25));
          const y = -130 + (Y + 130) * k, r = -90 * (1 - spin);
          tf(c.g, X[i], y); c.spin.setAttribute("transform", `rotate(${r})`);
          c.g.setAttribute("opacity", t < s ? 0 : 1);
          const p = api.calm ? 1 : io(seg(now - at[i], 0, 0.5)), f = flip[i] ? p : 1 - p, sx = Math.cos(Math.PI * f);
          const fx = Math.max(Math.abs(sx), 0.02) * (sx < 0 ? -1 : 1);
          c.body.setAttribute("transform", `scale(${fx} 1)`); c.edge.setAttribute("transform", `scale(${Math.abs(fx)} 1)`);
          c.front.setAttribute("opacity", sx >= 0 ? 1 : 0); c.back.setAttribute("opacity", sx < 0 ? 1 : 0);
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
    let off = 0, raf = 0, seen = false, held = calm || frozen;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? (frozen && !isNaN(fixed) ? fixed : sc.still) : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, calm, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); },
      paint: () => { const end = clock() + 0.6, f = () => { frame(); if (clock() < end) requestAnimationFrame(f); }; f(); } };
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
