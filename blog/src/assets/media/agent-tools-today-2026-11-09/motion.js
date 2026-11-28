/* Bright coded scenes for "Agent Tools Today, 9 Nov 2026". Vanilla JS, no library.
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
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const SC = {};

  /* ---- a desk rolodex turns and stops on the day's three lead items ---- */
  SC.rolodex = {
    dur: 8, still: 7.9,
    build(svg, api) {
      const N = 12, CW = 380, CH = 318, R1 = 330, AX = 400, AY = 440, LIFT = 100, ARM = 244;
      const NAMES = ["Git Graph", "Hello Pi", "Goldman"], COLS = [BLUE, LIL, MINT];
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      // the desk and the stand
      el("ellipse", { cx: AX, cy: 562, rx: 310, ry: 16, fill: SOFT }, svg);
      [-1, 1].forEach((s) => el("rect", { x: AX + s * ARM - 13, y: AY, width: 26, height: 70, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: 130, y: 496, width: 540, height: 58, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: AX - ARM, y: AY - 8, width: ARM * 2, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      [-1, 1].forEach((s) => { el("circle", { cx: AX + s * ARM, cy: AY, r: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, svg); el("circle", { cx: AX + s * ARM, cy: AY, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg); });
      // the cards, drawn flat and tilted about the axle with one matrix each
      const layer = el("g", {}, svg);
      const cards = Array.from({ length: N }, (_, i) => {
        const g = el("g", {}, layer);
        el("rect", { x: 0, y: 0, width: CW, height: CH, rx: 18, fill: COLS[i % 3], stroke: INK, "stroke-width": 3 }, g);
        [120, CW - 120].forEach((x) => el("rect", { x: x - 22, y: CH - 34, width: 44, height: 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        const face = el("g", {}, g);
        [100, 140, 180, 220].forEach((y) => el("path", { d: `M28 ${y} H${CW - 28}`, stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round" }, face));
        if (i < 3) txt(face, 28, 46, NAMES[i], { "font-family": MONO, "font-size": 30, "font-weight": 700 });
        const date = el("g", { opacity: 0 }, face);
        el("rect", { x: CW - 134, y: 18, width: 108, height: 38, rx: 19, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, date);
        txt(date, CW - 80, 44, "9 Nov", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { g, face, date };
      });
      // angle of a card about the axle, d cards away from the front: behind leans back, passed hangs forward
      const wrap = (d) => { d = ((d % N) + N) % N; return d >= N / 2 ? d - N : d; };
      const norm = (d) => (d >= 0 ? (d <= 1 ? -16 * d : -16 - (d - 1) * 7) : d >= -1 ? -104 * d : 104 + (-d - 1) * 1.5);
      const fan = (d) => (d >= 0 ? norm(d) : d >= -1 ? -34 * d : d >= -2 ? 34 + (-d - 1) * 15 : d >= -3 ? 49 + (-d - 2) * 58 : norm(d));
      // the timeline: unfan, a full turn to Git Graph, a stop on Hello Pi, a stop on Goldman, then fan out
      const timeline = (t) => ({
        p: 2 + 10 * io(seg(t, 0.5, 2)) + io(seg(t, 2.8, 3.5)) + io(seg(t, 4.3, 5)),
        S: 1 - io(seg(t, 0, 0.5)) + io(seg(t, 5.8, 6.6)),
        tip: [2, 3.5, 5].reduce((a, s) => a + Math.sin(Math.PI * seg(t, s, s + 0.5)), 0) * 12,
        dated: -1, dk: 0,
      });
      let user = null, last = timeline(0);
      const tapped = (now) => {
        const s = now - user.t0, k = calm ? 1 : seg(s, 0, 0.8);
        return { p: user.b + io(k), S: user.S * (1 - k), tip: calm ? 0 : 12 * Math.sin(Math.PI * seg(s, 0.8, 1.3)), dated: (((user.b + 1) % N) + N) % N, dk: calm ? 1 : seg(s, 0.5, 0.8) };
      };
      const hit = el("g", {}, svg);
      el("rect", { x: AX - 226, y: 82, width: 452, height: 378, rx: 26, fill: "#fff", "fill-opacity": 0 }, hit);
      el("rect", { x: AX - 226, y: 82, width: 452, height: 378, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, hit);
      button(hit, "Turn the rolodex to the next card", () => { user = { b: user ? user.b + 1 : Math.round(last.p), t0: api.now(), S: last.S }; api.poke(); });
      return (t, now) => {
        const P = user ? tapped(now) : timeline(t); last = P;
        cards.map((c, i) => {
          const d = wrap(i - P.p), ph = (norm(d) + (fan(d) - norm(d)) * P.S + P.tip * cl(1 - Math.abs(d))) * Math.PI / 180;
          const co = Math.cos(ph), si = Math.sin(ph), sx = 1 + 0.1 * si, lift = si < 0 ? -si * LIFT : 0;
          c.g.setAttribute("transform", `matrix(${sx} 0 0 ${co} ${AX - (CW / 2) * sx} ${AY - R1 * co - lift})`);
          c.face.setAttribute("opacity", co > 0.02 ? 1 : 0);
          c.date.setAttribute("opacity", i === P.dated ? P.dk : 0);
          return [si, c.g];
        }).sort((a, b) => a[0] - b[0]).forEach(([, g]) => layer.appendChild(g));
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
