/* Bright coded scenes for "Agent tools today, 2 Nov 2026". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- 1. three cards on a washing line, swinging in a light breeze ---- */
  SC.washing = {
    dur: 8, still: 8,
    build(svg, api) {
      const TAU = Math.PI * 2, X0 = 40, X1 = 760, Y0 = 140, SAG = 160;
      const lineY = (x) => { const u = (x - X0) / (X1 - X0); return Y0 + SAG * u * (1 - u); };
      // ground and posts
      el("rect", { x: 16, y: 536, width: 768, height: 16, rx: 8, fill: SOFT }, svg);
      [X0, X1].forEach((x) => {
        el("rect", { x: x - 13, y: 132, width: 26, height: 412, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: x - 20, y: 122, width: 40, height: 16, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      });
      // breeze
      const gusts = [[78, 0], [108, 0.36], [486, 0.68]].map(([y, ph]) => ({ y, ph, n: el("path", { d: "M0 0 q16 -9 32 0 t32 0 t32 0", stroke: SKY, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, svg) }));
      // the line
      el("path", { d: `M${X0} ${Y0} Q400 ${Y0 + SAG / 2} ${X1} ${Y0}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg);
      [X0, X1].forEach((x) => el("circle", { cx: x, cy: Y0, r: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      // the cards
      const CARDS = [
        { name: ["ChatGPT and", "Codex"], tag: ["One", "allowance"], back: YEL, chip: SKY, x: 160, n: 2, ph: 0.9 },
        { name: ["Memdoor"], tag: ["Five small", "models"], back: BLUE, chip: MINT, x: 400, n: 3, ph: 1.9 },
        { name: ["T3 Code"], tag: ["3,094 stars", "in a day"], back: LIL, chip: YEL, x: 640, n: 2, ph: 3.7 },
      ];
      const W = 180, H = 260, TOP = 14;
      const cards = CARDS.map((c) => {
        const g = el("g", {}, svg);
        el("rect", { x: -W / 2 - 8, y: TOP - 8, width: W + 16, height: H + 16, rx: 22, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 6", class: "mg-ring" }, g);
        el("rect", { x: -W / 2 + 9, y: TOP + 9, width: W, height: H, rx: 16, fill: c.back }, g);
        el("rect", { x: -W / 2, y: TOP, width: W, height: H, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const ny = c.name.length > 1 ? 74 : 88;
        c.name.forEach((s, i) => txt(g, 0, ny + i * 30, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 }));
        el("rect", { x: -W / 2 + 14, y: 150, width: W - 28, height: 106, rx: 16, fill: c.chip, stroke: INK, "stroke-width": 2.5 }, g);
        c.tag.forEach((s, i) => txt(g, 0, 196 + i * 30, s, { "text-anchor": "middle", "font-size": 22, "font-weight": 600 }));
        // wooden peg over the line
        el("rect", { x: -9, y: -24, width: 18, height: 54, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M0 -16 V22", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
        el("circle", { cx: 0, cy: 0, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        const card = { g, c, y: lineY(c.x), kick: -99 };
        button(g, `${c.name.join(" ")}: ${c.tag.join(" ")}`, () => { card.kick = api.now(); api.poke(); });
        return card;
      });
      return (t, now) => {
        cards.forEach((k) => {
          const s = now - k.kick, extra = s >= 0 && s < 6 ? 8 * Math.exp(-0.9 * s) * Math.sin((TAU * s) / 1.5) : 0;
          tf(k.g, k.c.x, k.y, 1, 3.5 * Math.sin((TAU * k.c.n * t) / 8 + k.c.ph) + extra);
        });
        gusts.forEach((q) => {
          const u = (t / 8 + q.ph) % 1;
          tf(q.n, 90 + 520 * u, q.y);
          q.n.setAttribute("opacity", Math.sin(Math.PI * u).toFixed(3));
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
