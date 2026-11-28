/* Bright coded scenes for "Agent Tools Today, 8 Nov 2026". Vanilla JS, no library.
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
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- three flashcards flip up from a plain desk; tap one to see its date ---- */
  SC.flashcards = {
    dur: 6.5, still: 6.5,
    build(svg, api) {
      const TOP = 388, CW = 196, CH = 290;
      // the desk: a plain top and two legs
      el("rect", { x: 90, y: TOP + 52, width: 22, height: 70, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 688, y: TOP + 52, width: 22, height: 70, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 50, y: TOP, width: 700, height: 56, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M74 ${TOP + 16} H726`, stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round" }, svg);
      const DATA = [["Orca", "forks", BLUE, 168, -3], ["Qwen", "Code", LIL, 400, 1.5], ["Agent", "memory", MINT, 632, -2]];
      const fast = calm || frozen;
      let last = 0, render = () => {};
      const cards = DATA.map(([a, b, col, x, rest], i) => {
        const pos = el("g", {}, svg), g = el("g", {}, pos);
        el("rect", { x: -CW / 2 - 9, y: -CH - 9, width: CW + 18, height: CH + 18, rx: 24, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
        const flip = el("g", {}, g);
        const front = el("g", {}, flip);
        el("rect", { x: -CW / 2, y: -CH, width: CW, height: CH, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, front);
        txt(front, 0, -CH / 2 - 8, a, { "text-anchor": "middle", "font-family": MONO, "font-size": 38, "font-weight": 700 });
        txt(front, 0, -CH / 2 + 40, b, { "text-anchor": "middle", "font-family": MONO, "font-size": 38, "font-weight": 700 });
        const back = el("g", { opacity: 0 }, flip);
        el("rect", { x: -CW / 2, y: -CH, width: CW, height: CH, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, back);
        [-CH + 60, -60].forEach((y) => el("path", { d: `M${-CW / 2 + 24} ${y} H${CW / 2 - 24}`, stroke: col, "stroke-width": 5, "stroke-linecap": "round" }, back));
        txt(back, 0, -CH / 2 + 16, "7 Nov", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });
        const c = { pos, g, flip, front, back, x, rest, start: 0.4 + i * 0.75, over: false, at: -99 };
        button(pos, `${a} ${b}. Flip to see the date`, () => {
          c.over = !c.over; c.at = api.now(); pos.setAttribute("aria-pressed", c.over ? "true" : "false");
          if (fast) render(last, api.now()); else api.poke();
        });
        pos.setAttribute("aria-pressed", "false");
        return c;
      });
      render = (t, now) => {
        last = t;
        cards.forEach((c) => {
          const k = seg(t, c.start, c.start + 0.6), sy = k <= 0 ? 0.001 : cl(ob(k), 0.001, 1.08);
          const w = seg(t, c.start + 0.5, c.start + 1.9), wob = k > 0 ? 7 * Math.sin(w * Math.PI * 3) * Math.pow(1 - w, 2) : 0;
          c.pos.setAttribute("transform", `translate(${c.x} ${TOP + 4}) rotate(${c.rest * oc(k) + wob})`);
          c.g.setAttribute("transform", `scale(1 ${sy})`);
          c.g.setAttribute("opacity", k > 0 ? 1 : 0);
          const f = fast ? 1 : seg(now - c.at, 0, 0.5), half = f < 0.5, showBack = half ? !c.over : c.over;
          c.flip.setAttribute("transform", `scale(${cl(Math.abs(Math.cos(Math.PI * f)), 0.02, 1)} 1)`);
          c.front.setAttribute("opacity", showBack ? 0 : 1); c.back.setAttribute("opacity", showBack ? 1 : 0);
        });
      };
      return render;
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
