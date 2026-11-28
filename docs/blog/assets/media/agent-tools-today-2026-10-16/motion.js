/* Bright coded scenes for "Agent tools today, 16 Oct 2026". Vanilla JS, no library.
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

  /* a four point paper star centred on 0,0 */
  const star = (p, x, y, r, fill) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, p);
  /* three short strokes that flash when a piece pops up; d is the side (-1 left, 1 right) */
  const burst = (p, x, y, d, col) => {
    const g = el("g", { transform: `translate(${x} ${y})` }, p);
    [[-60, 22], [-25, 26], [10, 20]].forEach(([a, l]) => {
      const r = ((d < 0 ? -90 + a : -90 - a) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      el("path", { d: `M${(c * 10).toFixed(1)} ${(s * 10).toFixed(1)} L${(c * (10 + l)).toFixed(1)} ${(s * (10 + l)).toFixed(1)}`, stroke: col, "stroke-width": 4, "stroke-linecap": "round" }, g);
    });
    return g;
  };

  const SC = {};

  /* ---- a pop-up book: the model rises from the fold as a card, and three tabs of its card unfold in front ---- */
  SC.today = {
    dur: 12, still: 9.5,
    build(svg, api) {
      const SX = 400;
      /* one half of the open book, drawn to the right of the spine at x = 0 */
      const COVER = "M0 318 Q166 286 334 300 L366 560 Q186 546 0 572 Z";
      const PAGE2 = "M0 312 Q163 281 326 296 L358 553 Q184 538 0 564 Z";
      const PAGE = "M0 306 Q160 276 318 292 L350 546 Q180 530 0 556 Z";
      const half = (g) => {
        el("path", { d: COVER, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: PAGE2, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: PAGE, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      };
      /* soft paper stars around the book */
      const twinkle = [[78, 92, 22, YEL], [112, 232, 13, SKY], [724, 84, 17, MINT], [700, 226, 21, LIL]].map(([x, y, r, c], i) => {
        const g = el("g", {}, svg);
        star(g, 0, 0, r, c);
        return { g, x, y, i };
      });
      const book = el("g", { transform: "translate(0 -8)" }, svg);
      el("rect", { x: 22, y: 40, width: 756, height: 544, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 8", class: "mg-ring" }, book);
      half(el("g", { transform: `translate(${SX} 0)` }, book));
      /* the left half swings over the spine as the book opens; its outside is the plain cover */
      const left = el("g", {}, book);
      const inside = el("g", {}, left);
      half(inside);
      const outside = el("g", {}, left);
      el("path", { d: COVER, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, outside);
      el("path", { d: "M22 336 Q170 306 314 318 L340 540 Q184 528 22 552 Z", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, outside);
      star(outside, 178, 430, 34, YEL);
      /* back layer: a scalloped paper sky that stands up behind the card */
      /* each piece is glued to the page by a flat strip that stays down while the piece stands up */
      const strip = (fill, l, r, b, d) => el("path", { d: `M${l - d} ${b + d} H${r + d} L${r} ${b} H${l} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, book);
      const PB = 318, PL = 130, PR = 670;
      const panelFold = strip(LIL, PL, PR, PB, 14);
      const panel = el("g", {}, book);
      let pd = `M${PL} ${PB} V112`;
      for (let x = PL; x < PR; x += 90) pd += " a45 45 0 0 1 90 0";
      el("path", { d: `${pd} V${PB} Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, panel);
      star(panel, 204, 146, 24, YEL); star(panel, 596, 150, 19, MINT); star(panel, 482, 142, 14, SKY); star(panel, 330, 176, 11, LIL);
      /* the card that rises from the fold */
      const CB = 364, CH = 150;
      const cardFold = el("path", { fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, book);
      const card = el("g", {}, book);
      const cardBody = el("rect", { y: CB - CH, height: CH, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      const cardLine = el("rect", { y: CB - CH + 12, height: CH - 24, rx: 10, fill: "none", stroke: INK, "stroke-width": 2 }, card);
      const name = txt(card, SX, CB - CH / 2 + 16, "Muse Spark Open", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });
      const CW = Math.max(420, name.getComputedTextLength() + 84), CL = SX - CW / 2, CR = SX + CW / 2;
      [cardBody, cardLine].forEach((r, i) => { r.setAttribute("x", CL + i * 12); r.setAttribute("width", CW - i * 24); });
      cardFold.setAttribute("d", `M${CL - 16} ${CB + 16} H${CR + 16} L${CR} ${CB} H${CL} Z`);
      const cardPop = [burst(book, CL - 6, CB - CH - 6, -1, SKY), burst(book, CR + 6, CB - CH - 6, 1, MINT)];
      /* three tabs that unfold in front of it */
      const TB = 500, TH = 106, TX = [190, 400, 610], TC = [MINT, LIL, SKY];
      const TABS = [["816B", "total"], ["42B", "active"], ["1M", "token context"]];
      const tabs = TABS.map(([n, w], i) => {
        const fold = el("path", { fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, book);
        const g = el("g", {}, book);
        const body = el("rect", { y: TB - TH, height: TH, rx: 16, fill: TC[i], stroke: INK, "stroke-width": 3 }, g);
        const a = txt(g, TX[i], TB - TH + 50, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 40, "font-weight": 700 });
        const b = txt(g, TX[i], TB - 18, w, { "text-anchor": "middle", "font-size": 24, "font-weight": 600 });
        return { g, fold, body, x: TX[i], w: Math.max(170, Math.max(a.getComputedTextLength(), b.getComputedTextLength()) + 34) };
      });
      tabs.forEach((k, i) => {
        const TW = k.w;
        k.body.setAttribute("x", k.x - TW / 2); k.body.setAttribute("width", TW);
        k.fold.setAttribute("d", `M${k.x - TW / 2 - 12} ${TB + 13} H${k.x + TW / 2 + 12} L${k.x + TW / 2} ${TB} H${k.x - TW / 2} Z`);
        k.pop = burst(book, k.x + TW / 2 + 4, TB - TH - 4, 1, [YEL, MINT, LIL][i]);
      });
      let last = 0;
      button(book, "Fold the pop-up book shut and open it again", () => { if (last > 5.4 && last < 10.6) api.seek(10.6); });
      /* rise from 0 to 1 with a small overshoot, then fold back down */
      const up = (t, a, f) => (t < f ? cl(ob(seg(t, a, a + 0.55)), 0, 1.2) : 1 - io(seg(t, f, f + 0.32)));
      const stand = (g, fold, s, x, b, r = 0) => {
        g.setAttribute("transform", `translate(${x} ${b}) rotate(${r}) scale(1 ${Math.max(s, 0.001)}) translate(${-x} ${-b})`);
        g.setAttribute("opacity", s <= 0.02 ? 0 : 1);
        fold.setAttribute("opacity", cl(s * 4));
      };
      const flash = (g, t, a) => { const k = seg(t, a, a + 0.5); g.setAttribute("opacity", k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0); };
      return (t, now) => {
        last = t;
        /* the cover swings open, and shuts again at the end of the loop */
        const k = io(seg(t, 0.25, 1.35)) - io(seg(t, 11.35, 11.95)), sx = Math.cos(Math.PI * k);
        left.setAttribute("transform", `translate(${SX} ${-38 * Math.sin(Math.PI * k)}) scale(${sx} 1)`);
        inside.setAttribute("opacity", sx < 0 ? 1 : 0);
        outside.setAttribute("opacity", sx < 0 ? 0 : 1);
        stand(panel, panelFold, up(t, 1.0, 11.1), SX, PB);
        stand(card, cardFold, up(t, 1.7, 11.0), SX, CB, t > 2.4 && t < 11 ? 0.7 * Math.sin((t - 2.4) * 1.3) : 0);
        cardPop.forEach((g) => flash(g, t, 2.05));
        tabs.forEach((m, i) => {
          const a = 3.2 + i * 0.8, s = up(t, a, 10.85 - i * 0.12);
          stand(m.g, m.fold, s, m.x, TB, t > a + 0.6 && t < 10.8 ? 0.8 * Math.sin((t - a) * 1.6 + i) : 0);
          flash(m.pop, t, a + 0.3);
        });
        twinkle.forEach((w) => {
          const s = seg(t, 1.9 + w.i * 0.25, 2.3 + w.i * 0.25) * (1 - seg(t, 11, 11.3));
          tf(w.g, w.x, w.y, ob(s) * (0.85 + 0.15 * Math.sin(t * 2.2 + w.i * 1.7)), 12 * Math.sin(t * 0.9 + w.i));
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
