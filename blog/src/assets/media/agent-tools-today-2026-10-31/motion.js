/* Bright coded scenes for "Agent tools today, 31 Oct 2026". Vanilla JS, no library.
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
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- a small shopfront whose three roller shutters roll up one at a time ---- */
  SC.shutters = {
    dur: 8.5, still: 6.5,
    build(svg, api) {
      const BAYS = [
        { x: 76, fill: LIL, name: ["Claude Code", "extension"], tag: "Check Cursor", at: [0.6, 1.8] },
        { x: 297, fill: SKY, name: ["Claude Code", "2.1.316"], tag: "Subagent effort", at: [2.0, 3.2] },
        { x: 518, fill: MINT, name: ["OpenCode", "2.2.3"], tag: "Claude Agent", at: [3.4, 4.6] },
      ];
      const W = 206, TOP = 180, H = 330, SLAT = 22, TRAVEL = H - 16;

      /* the shop: wall, roof edge, striped awning, pavement */
      el("rect", { x: 60, y: 36, width: 680, height: 504, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 44, y: 24, width: 712, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 0; i < 14; i++) el("path", { d: `M${50 + i * 50} 38 H${100 + i * 50} V108 a25 25 0 0 1 -50 0 Z`, fill: i % 2 ? "#fff" : BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 24, y: 540, width: 752, height: 26, rx: 13, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);

      const cur = [0, 0, 0];
      const bays = BAYS.map((b, i) => {
        const g = el("g", {}, svg), cx = b.x + W / 2;
        el("rect", { x: b.x, y: 146, width: W, height: 364, fill: "#fff", "fill-opacity": 0 }, g);
        el("rect", { x: b.x, y: TOP, width: W, height: H, fill: SOFT }, g);

        /* the card behind the shutter, hung on two strings */
        el("path", { d: `M${cx - 58} ${TOP} V280 M${cx + 58} ${TOP} V280`, stroke: INK, "stroke-width": 2.5 }, g);
        const card = el("g", {}, g);
        el("rect", { x: b.x + 8, y: 250, width: W - 16, height: 190, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
        b.name.forEach((s, j) => txt(card, cx, 305 + j * 36, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 25, "font-weight": 700 }));
        const tag = el("g", {}, card);
        el("rect", { x: -85, y: -20, width: 170, height: 40, rx: 20, fill: b.fill, stroke: INK, "stroke-width": 2.5 }, tag);
        txt(tag, 0, 6.5, b.tag, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });

        /* the shutter, slats clipped to the opening */
        const clip = el("clipPath", { id: `shutter-clip-${i}` }, svg);
        el("rect", { x: b.x, y: TOP, width: W, height: H }, clip);
        const clipped = el("g", { "clip-path": `url(#shutter-clip-${i})` }, g), shutter = el("g", {}, clipped);
        for (let s = 0; s < H / SLAT; s++) el("rect", { x: b.x, y: TOP + s * SLAT, width: W, height: SLAT, fill: b.fill, stroke: INK, "stroke-width": 2 }, shutter);
        el("rect", { x: cx - 28, y: TOP + H - 12, width: 56, height: 8, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, shutter);

        /* the frame and the box the shutter rolls into */
        el("rect", { x: b.x, y: TOP, width: W, height: H, fill: "none", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: b.x, y: 146, width: W, height: 34, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const hub = el("g", {}, g);
        el("circle", { r: 9, fill: b.fill, stroke: INK, "stroke-width": 2.5 }, hub);
        el("path", { d: "M-5 0 H5", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, hub);
        el("rect", { x: b.x - 6, y: 140, width: W + 12, height: 376, rx: 12, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "6 6", class: "mg-ring" }, g);

        button(g, `Roller shutter over ${b.name.join(" ")}, tag ${b.tag}`, () => tap(i));
        return { g, card, tag, shutter, hub, cx, at: b.at };
      });

      /* before any tap the timeline drives; after one, each shutter keeps the state it was given */
      let man = null, last = [6.5, 0];
      const auto = (t, i) => io(seg(t, bays[i].at[0], bays[i].at[1])) * (1 - io(seg(t, 7.6, 8.4)));
      const pos = (t, now, i) => (man ? man[i].from + (man[i].to - man[i].from) * io(seg(now, man[i].at, man[i].at + 0.7)) : auto(t, i));
      const paint = (t, now) => {
        last = [t, now];
        bays.forEach((b, i) => {
          const k = pos(t, now, i);
          cur[i] = k;
          b.shutter.setAttribute("transform", `translate(0 ${-TRAVEL * k})`);
          tf(b.hub, b.cx, 163, 1, k * 900);
          b.card.setAttribute("transform", `translate(0 ${14 * (1 - k)})`);
          tf(b.tag, b.cx, 386, cl(ob(seg(k, 0.55, 1)), 0, 1.06));
          b.g.setAttribute("aria-pressed", k >= 0.5 ? "true" : "false");
        });
      };
      function tap(i) {
        const now = api.now(), snap = calm || frozen;
        if (!man) man = cur.map((k) => ({ from: k, to: k >= 0.5 ? 1 : 0, at: now }));
        man[i] = { from: cur[i], to: man[i].to >= 0.5 ? 0 : 1, at: now };
        if (snap) { man.forEach((m) => { m.from = m.to; }); paint(last[0], now); }
        else api.poke();
      }
      return paint;
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
