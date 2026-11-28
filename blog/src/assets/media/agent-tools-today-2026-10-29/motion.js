/* Bright coded scenes for "Agent Tools Today, 29 Oct 2026". Vanilla JS, no library.
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
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- today: three cards pinned to a cork board, one at a time ---- */
  SC.today = {
    dur: 7, still: 7,
    build(svg, api) {
      el("rect", { x: 28, y: 28, width: 744, height: 544, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 52, y: 52, width: 696, height: 496, rx: 16, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      let seed = 11; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
      for (let i = 0; i < 120; i++) el("circle", { cx: 68 + rnd() * 664, cy: 68 + rnd() * 464, r: 1.4 + rnd() * 1.8, fill: "#fff" }, svg);
      const CARDS = [
        ["Gemini 4", "Carbon", "Early access", SKY, BLUE, -3],
        ["Copilot", "connectors", "26 services", LIL, MINT, 2],
        ["OpenCode", "2.2.1", "Goal mode", MINT, LIL, -2],
      ];
      const X = [186, 400, 614], Y = 306, A = (i) => 0.5 + i * 1.15;
      let touched = false;
      const cards = CARDS.map(([a, b, tag, chip, pc, r0], i) => {
        const slot = el("g", { opacity: 0, transform: `translate(${X[i]} ${Y}) rotate(${r0})` }, svg);
        el("rect", { x: -98, y: -118, width: 196, height: 236, rx: 14, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 8" }, slot);
        el("circle", { cx: 0, cy: -92, r: 3, fill: INK }, slot);
        const g = el("g", {}, svg);
        const sh = el("rect", { x: -98, y: -118, width: 196, height: 236, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -98, y: -118, width: 196, height: 236, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -108, y: -128, width: 216, height: 256, rx: 20, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, g);
        txt(g, 0, -12, a, { "text-anchor": "middle", "font-family": MONO, "font-size": 25, "font-weight": 700 });
        txt(g, 0, 22, b, { "text-anchor": "middle", "font-family": MONO, "font-size": 25, "font-weight": 700 });
        el("rect", { x: -76, y: 54, width: 152, height: 40, rx: 20, fill: chip, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 81, tag, { "text-anchor": "middle", "font-size": 19, "font-weight": 600 });
        const pin = el("g", {}, g);
        const needle = el("path", { d: "M0 4 V28", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, pin);
        el("circle", { r: 14, fill: pc, stroke: INK, "stroke-width": 3 }, pin);
        el("circle", { cx: -4, cy: -4, r: 4, fill: "#fff" }, pin);
        const st = { up: false, at: -99, from: 0, k: 0 };
        button(g, `${a} ${b}, ${tag}`, () => {
          st.from = st.k; st.up = !st.up; st.at = api.now(); touched = true;
          g.setAttribute("aria-pressed", String(st.up));
          if (st.up) svg.appendChild(g);
          if (api.calm) api.redraw(); else api.poke();
        });
        g.setAttribute("aria-pressed", "false");
        return { slot, g, sh, pin, needle, st, r0, x: X[i] };
      });
      return (t, now) => {
        if (touched) t = SC.today.dur;
        cards.forEach((c, i) => {
          const a0 = A(i), d = oc(seg(t, a0, a0 + 0.45)), p = seg(t, a0 + 0.4, a0 + 0.8);
          c.g.setAttribute("visibility", t >= a0 ? "visible" : "hidden");
          const s = c.st, u = api.calm ? 1 : seg(now - s.at, 0, 0.4);
          s.k = s.up ? s.from + (1 - s.from) * oc(u) : s.from * (1 - ob(u));
          const k = s.k, kk = cl(k), bump = Math.sin(seg(t, a0 + 0.72, a0 + 0.95) * Math.PI) * 0.02;
          tf(c.g, c.x, Y - 50 * (1 - d) - 30 * k, 1 + 0.05 * (1 - d) + 0.04 * k - bump, c.r0 * (1 - kk));
          c.sh.setAttribute("transform", `translate(${6 * kk} ${10 * kk})`);
          c.slot.setAttribute("opacity", kk > 0.35 ? 1 : 0);
          const fall = 1 - ob(p);
          c.pin.setAttribute("transform", `translate(0 ${-92 - 56 * fall - 64 * kk}) rotate(${22 * kk})`);
          c.pin.setAttribute("opacity", p > 0 ? 1 : 0);
          c.needle.setAttribute("opacity", kk > 0.05 || p < 1 ? 1 : 0);
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
    const api = {
      now: clock, calm: calm || frozen,
      seek: (s) => { off = s - clock(); held = false; tick(); },
      poke: () => { held = false; tick(); },
      redraw: () => { if (frozen) draw(isNaN(fixed) ? sc.still : fixed, clock()); else tick(); },
    };
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
