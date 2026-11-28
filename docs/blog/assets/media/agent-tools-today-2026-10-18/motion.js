/* Bright coded scenes for "Agent tools today, 18 Oct 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- a backpack stuffed with tool cards beside one small index card, each with a counter that rolls up ---- */
  SC.today = {
    dur: 11, still: 8,
    build(svg, api) {
      el("path", { d: "M60 414 H740", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);

      /* the backpack: back panel, dark opening, tool cards, then the front body that hides their lower half */
      const PX = 230, PB = 412;
      const pack = el("g", {}, svg);
      el("rect", { x: 100, y: 98, width: 260, height: 324, rx: 28, fill: "#fff", "fill-opacity": 0, stroke: BLUE, "stroke-width": 3, class: "mg-ring" }, pack);
      [112, 326].forEach((x) => el("rect", { x, y: 300, width: 22, height: 82, rx: 10, fill: LIL, stroke: INK, "stroke-width": 3 }, pack));
      el("rect", { x: 138, y: 180, width: 184, height: 150, rx: 42, fill: BLUE, stroke: INK, "stroke-width": 3 }, pack);
      el("ellipse", { cx: PX, cy: 216, rx: 88, ry: 14, fill: INK }, pack);
      const layer = el("g", {}, pack);
      const POS = [
        [150, 150, -18], [173, 132, -11], [197, 120, -5], [220, 112, 0], [243, 116, 4], [266, 124, 9], [289, 136, 14], [311, 154, 20],
        [162, 172, -14], [186, 160, -7], [208, 152, -2], [232, 150, 3], [255, 156, 7], [279, 166, 12], [300, 180, 17], [196, 190, -3],
      ];
      const ORDER = [3, 10, 0, 13, 6, 9, 1, 14, 4, 11, 7, 8, 2, 12, 5, 15];
      const CC = [YEL, MINT, LIL, SKY, "#fff", SOFT];
      const cards = POS.map(([x, y, r], i) => {
        const g = el("g", { opacity: 0 }, layer);
        el("rect", { x: -20, y: 0, width: 40, height: 124, rx: 7, fill: CC[i % CC.length], stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -12, y: 12, width: 24, height: 4, rx: 2, fill: INK, opacity: 0.6 }, g);
        el("rect", { x: -12, y: 22, width: 14, height: 4, rx: 2, fill: INK, opacity: 0.3 }, g);
        return { g, x, y, r, i, s: 0.2 + ORDER.indexOf(i) * 0.15 };
      });
      el("path", { d: "M128 222 Q230 240 332 222 L334 374 Q334 412 296 412 L164 412 Q126 412 126 374 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pack);
      el("path", { d: "M140 248 Q230 264 320 248", fill: "none", stroke: INK, "stroke-width": 2, opacity: 0.35, "stroke-dasharray": "7 7", "stroke-linecap": "round" }, pack);
      el("rect", { x: 162, y: 298, width: 136, height: 86, rx: 22, fill: SKY, stroke: INK, "stroke-width": 3 }, pack);
      el("path", { d: "M180 322 H280", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, pack);
      el("rect", { x: 262, y: 322, width: 10, height: 18, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2 }, pack);

      /* one small index card with a few ruled lines */
      const IX = 570;
      const card = el("g", { opacity: 0 }, svg);
      el("rect", { x: -80, y: -104, width: 160, height: 104, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, card);
      el("rect", { x: -64, y: -86, width: 128, height: 4, rx: 2, fill: BLUE }, card);
      [[-70, 92, 0.75], [-54, 120, 0.4], [-38, 108, 0.4], [-22, 72, 0.4]].forEach(([y, w, o]) => el("rect", { x: -64, y, width: w, height: 5, rx: 2.5, fill: INK, opacity: o }, card));

      /* names under each, then a counter that rolls up the context it costs */
      [[PX, "REA", "207 tools"], [IX, "LeanREA", "one SKILL.md"]].forEach(([x, a, b]) => {
        txt(svg, x, 458, a, { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        txt(svg, x, 488, b, { "text-anchor": "middle", "font-size": 20, "font-weight": 600, fill: MUTE });
      });
      const counters = [[PX, YEL, 400.7, 3.2, 6.4], [IX, MINT, 34.5, 3.2, 4.4]].map(([x, c, v, a, b]) => {
        const g = el("g", { opacity: 0 }, svg);
        el("rect", { x: x - 140, y: 506, width: 280, height: 54, rx: 27, fill: c, stroke: INK, "stroke-width": 3 }, g);
        const n = txt(g, x, 543, "0.0k tokens", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
        return { g, n, x, v, a, b };
      });
      const sparks = [[478, 262, YEL], [668, 286, MINT], [636, 222, LIL]].map(([x, y, c], i) => {
        const g = el("g", { opacity: 0 }, svg);
        el("path", { d: "M0 -14 Q0 0 14 0 Q0 0 0 14 Q0 0 -14 0 Q0 0 0 -14 Z", fill: c, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        return { g, x, y, i };
      });
      /* the title goes on top so falling cards pass behind it */
      txt(svg, 400, 66, "Context with every tool loaded", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });

      let last = 0, kick = -99;
      button(pack, "Shake the backpack and drop the tools in again", () => { kick = api.now(); api.seek(cl(last, 3.4, 7)); });
      return (t, now = 0) => {
        last = t;
        const out = 1 - io(seg(t, 10.2, 10.8));
        /* a tap ejects the cards, then drops them back in, while the pack wobbles */
        const lt = now - kick, re = lt >= 0 && lt < 2.7;
        const dt = re ? (lt - 0.3) * 1.35 : t;
        const ej = re && lt < 0.3 ? oc(lt / 0.3) : -1;
        let sq = 0;
        cards.forEach((c) => {
          if (ej >= 0) { tf(c.g, c.x, c.y - 120 * ej, 1, c.r); c.g.setAttribute("opacity", 1 - ej); return; }
          const p = seg(dt, c.s, c.s + 0.55);
          tf(c.g, c.x, c.y + (1 - ob(p)) * -300, 1, c.r + (1 - p) * (c.i % 2 ? 26 : -26));
          c.g.setAttribute("opacity", p > 0 ? out : 0);
          const b = seg(dt, c.s + 0.2, c.s + 0.4);
          if (b > 0 && b < 1) sq += Math.sin(Math.PI * b);
        });
        const w = re ? 8 * Math.sin(lt * 15) * Math.exp(-lt * 2.8) : 0;
        const sy = 1 - 0.03 * Math.min(sq, 1.5), sx = 1 + 0.02 * Math.min(sq, 1.5);
        pack.setAttribute("transform", `translate(${PX} ${PB}) rotate(${w}) scale(${sx} ${sy}) translate(${-PX} ${-PB})`);

        /* the index card floats down like paper and settles with a small hop */
        const p = seg(t, 0.9, 2.2), hop = seg(t, 2.2, 2.5);
        const cy = 410 - 380 * (1 - oc(p)) - 8 * Math.sin(Math.PI * hop);
        tf(card, IX + 30 * Math.sin(p * Math.PI * 3) * (1 - p), cy, 1, -3 + 16 * Math.sin(p * Math.PI * 3 + 0.6) * (1 - p));
        card.setAttribute("opacity", p > 0 ? out : 0);

        counters.forEach((k) => {
          const s = ob(seg(t, 2.8, 3.2));
          k.g.setAttribute("transform", `translate(${k.x} 533) scale(${cl(s, 0, 1.15)}) translate(${-k.x} -533)`);
          k.g.setAttribute("opacity", (s > 0.01 ? 1 : 0) * out);
          k.n.textContent = `${(k.v * oc(seg(t, k.a, k.b))).toFixed(1)}k tokens`;
        });
        sparks.forEach((w) => {
          const s = seg(t, 4.4 + w.i * 0.2, 4.8 + w.i * 0.2) * out;
          tf(w.g, w.x, w.y, ob(s) * (0.85 + 0.15 * Math.sin(t * 2.4 + w.i)), 14 * Math.sin(t + w.i));
          w.g.setAttribute("opacity", s <= 0 ? 0 : 1);
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
