/* Bright coded scenes for "Agent Tools Today, 13 Nov 2026". Vanilla JS, no library.
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
  let uid = 0;
  const SC = {};

  /* ---- a blue abacus: each row's beads slide right in turn and its word lights up ---- */
  SC.abacus = {
    dur: 12, still: 8,
    build(svg, api) {
      const NAMES = ["Hydrogen", "Edge0", "IPO"];
      const X0 = 40, X1 = 760, Y0 = 34, BAR = 24, ROW = 150, IN0 = X0 + BAR, IN1 = X1 - BAR, TOP = Y0 + BAR;
      const NB = 5, GAP = 54, RX = 25, RY = 22, L0 = IN0 + 16 + RX, R0 = IN1 - 16 - RX - GAP * (NB - 1), SHIFT = R0 - L0;
      const WX = 92, FS = 48, A = [0.6, 2.8, 5.0, 7.2];
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const shade = `mg-abacus-shade-${++uid}`;
      const defs = el("defs", {}, svg);
      const lg = el("linearGradient", { id: shade, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: 0, "stop-color": "#fff", "stop-opacity": 0.35 }, lg);
      el("stop", { offset: 0.5, "stop-color": "#fff", "stop-opacity": 0 }, lg);
      // floor shadow and two little feet
      el("ellipse", { cx: 400, cy: 560, rx: 330, ry: 8, fill: SOFT }, svg);
      [[110, 170], [630, 690]].forEach(([a, b]) => el("rect", { x: a, y: Y0 + 488, width: b - a, height: 30, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg));
      // three rows: a word, its highlight, its date chip, a rod and five beads
      let tap = () => {};
      const rows = NAMES.map((name, i) => {
        const top = TOP + ROW * i, rod = top + 112;
        const g = el("g", {}, svg);
        const hl = el("rect", { x: 0, y: 0, height: 56, rx: 14, fill: YEL, "fill-opacity": 0 }, g);
        const word = txt(g, WX, top + 61, name, { "font-size": FS, "font-weight": 700 });
        let w = 0; try { w = word.getComputedTextLength(); } catch (e) { w = 0; }
        if (!(w > 0)) w = FS * 0.62 * name.length;
        hl.setAttribute("width", w + 28);
        const date = el("g", { opacity: 0 }, g);
        const dx = WX + w + 22;
        el("rect", { x: dx, y: top + 26, width: 112, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, date);
        txt(date, dx + 56, top + 54.5, "12 Nov", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        el("rect", { x: IN0 - 6, y: rod - 4, width: IN1 - IN0 + 12, height: 8, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        const beads = Array.from({ length: NB }, (_, j) => {
          const b = el("g", {}, g);
          el("ellipse", { rx: RX, ry: RY, fill: (i + j) % 2 ? MINT : LIL, stroke: INK, "stroke-width": 3 }, b);
          el("ellipse", { rx: RX - 3, ry: RY - 3, fill: `url(#${shade})` }, b);
          el("path", { d: `M${-RX + 10} -9 Q-6 -16 6 -15`, fill: "none", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.8 }, b);
          return b;
        });
        const hit = el("g", {}, g);
        el("rect", { x: IN0, y: top, width: IN1 - IN0, height: ROW, fill: "#fff", "fill-opacity": 0 }, hit);
        el("rect", { x: IN0 + 8, y: top + 6, width: IN1 - IN0 - 16, height: ROW - 12, rx: 14, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, hit);
        button(hit, `Slide back the ${name} beads and show 12 Nov`, () => tap(i));
        hit.setAttribute("aria-pressed", "false");
        return { top, rod, hl, date, beads, hit };
      });
      // the frame: a blue band with a white window, rods tucked under it, yellow pegs at the rod ends
      const r = (x, y, w, h, k) => `M${x + k} ${y} H${x + w - k} Q${x + w} ${y} ${x + w} ${y + k} V${y + h - k} Q${x + w} ${y + h} ${x + w - k} ${y + h} H${x + k} Q${x} ${y + h} ${x} ${y + h - k} V${y + k} Q${x} ${y} ${x + k} ${y} Z`;
      el("path", { d: r(X0, Y0, X1 - X0, 3 * ROW + 2 * BAR, 18) + r(IN0, TOP, IN1 - IN0, 3 * ROW, 8), fill: BLUE, stroke: INK, "stroke-width": 3, "fill-rule": "evenodd" }, svg);
      el("path", { d: `M${X0 + 16} ${Y0 + 9} H${X1 - 16}`, stroke: SKY, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      rows.forEach((w) => [X0 + BAR / 2, X1 - BAR / 2].forEach((x) => el("circle", { cx: x, cy: w.rod, r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg)));
      // bead j's share of a slide: rightmost first going right, leftmost first going left
      const ease = (q, j, right) => { const o = (right ? NB - 1 - j : j) * 0.08; return oc(seg(q, o, o + 0.68)); };
      // the timeline: rows slide right one at a time, each word lights up, hold, then all slide home
      const timeline = (t) => {
        const back = seg(t, 9.8, 11), fade = seg(t, 9.6, 10);
        return rows.map((_, i) => {
          const q = seg(t, A[i], A[i] + 1.2);
          return {
            b: Array.from({ length: NB }, (_, j) => ease(q, j, true) * (1 - ease(back, j, false))),
            hs: oc(seg(t, A[i] + 0.7, A[i] + 1.15)),
            ho: (0.75 - 0.4 * seg(t, A[i + 1], A[i + 1] + 0.4)) * (1 - fade),
            d: 0,
          };
        });
      };
      let user = null, last = timeline(0);
      const tapped = (now) => user.map((u, i) => {
        const s = calm ? 99 : now - u.t0, f = u.from, T = u.open ? 0 : 1, q = seg(s, 0, 0.9);
        return {
          b: f.b.map((v, j) => v + (T - v) * ease(q, j, T === 1)),
          hs: f.hs + (1 - f.hs) * oc(seg(s, 0, 0.4)),
          ho: f.ho + ((u.open ? 0.75 : 0.35) - f.ho) * seg(s, 0, 0.3),
          d: f.d + ((u.open ? 1 : 0) - f.d) * oc(u.open ? seg(s, 0.55, 0.9) : seg(s, 0, 0.3)),
        };
      });
      const snap = (P) => ({ b: P.b.slice(), hs: P.hs, ho: P.ho, d: P.d });
      tap = (n) => {
        const now = api.now();
        if (!user) user = last.map((P) => ({ from: snap(P), open: false, t0: now }));
        user[n] = { from: snap(last[n]), open: !user[n].open, t0: now };
        rows.forEach((w, i) => w.hit.setAttribute("aria-pressed", String(user[i].open)));
        api.poke();
      };
      return (t, now) => {
        const S = user ? tapped(now) : timeline(t); last = S;
        rows.forEach((w, i) => {
          const P = S[i];
          w.hl.setAttribute("transform", `translate(${WX - 14} ${w.top + 18}) scale(${Math.max(P.hs, 0.001)} 1)`);
          w.hl.setAttribute("fill-opacity", (P.ho * cl(P.hs * 20)).toFixed(3));
          w.date.setAttribute("opacity", P.d.toFixed(3));
          w.date.setAttribute("transform", `translate(${-10 * (1 - P.d)} 0)`);
          w.beads.forEach((b, j) => b.setAttribute("transform", `translate(${(L0 + GAP * j + SHIFT * P.b[j]).toFixed(1)} ${w.rod})`));
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
