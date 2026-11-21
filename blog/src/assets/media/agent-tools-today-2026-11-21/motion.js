/* Bright coded scenes for "Agent Tools Today, 21 Nov 2026". Vanilla JS, no library.
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
  const sio = (x) => 0.5 - Math.cos(Math.PI * x) / 2;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- shared drawings ---- */
  // a sky wave ribbon with wavy edges; the inner group slides sideways one wavelength at a time
  const ribbon = (p, W, yT, yB, A, lam) => {
    const outer = el("g", {}, p), inner = el("g", {}, outer);
    const x0 = -2 * lam, n = Math.ceil((W + 4 * lam) / (lam / 2)), x1 = x0 + (n * lam) / 2;
    let d = `M${x0} ${yT} Q${x0 + lam / 4} ${yT - A} ${x0 + lam / 2} ${yT}`;
    for (let k = 2; k <= n; k++) d += ` T${x0 + (k * lam) / 2} ${yT}`;
    d += ` L${x1} ${yB} Q${x1 - lam / 4} ${yB + A * 0.8} ${x1 - lam / 2} ${yB}`;
    for (let k = n - 2; k >= 0; k--) d += ` T${x0 + (k * lam) / 2} ${yB}`;
    el("path", { d: d + " Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, inner);
    return { outer, inner, lam };
  };
  // a yellow sailboat with one blue sail, drawn around its waterline at 0,0
  const boat = (p) => {
    const g = el("g", {}, p);
    el("path", { d: "M-10 -30 V-204", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
    el("path", { d: "M-8 -204 L26 -196 L-8 -188 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-4 -180 Q54 -116 76 -44 H-4 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-92 -30 H92 L68 14 H-68 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    [-46, -12, 22].forEach((x) => el("circle", { cx: x, cy: -18, r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
    return g;
  };
  const cloud = (p) => {
    const g = el("g", {}, p);
    [[0, 0, 20], [28, -12, 28], [58, 0, 20]].forEach(([x, y, r]) => el("circle", { cx: x, cy: y, r, fill: SOFT }, g));
    el("rect", { x: 0, y: 0, width: 58, height: 20, fill: SOFT }, g);
    return g;
  };
  // a can buoy with a top mark, drawn around its waterline at 0,0
  const buoy = (p) => {
    const g = el("g", {}, p);
    el("path", { d: "M0 -56 V-78", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
    el("circle", { cy: -84, r: 9, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
    const body = el("rect", { x: -28, y: -58, width: 56, height: 72, rx: 16, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: -26.5, y: -38, width: 53, height: 12, fill: "#fff" }, g);
    el("path", { d: "M-26.5 -38 H26.5 M-26.5 -26 H26.5", stroke: INK, "stroke-width": 2 }, g);
    return { g, body };
  };

  const SC = {};
  const XS = [140, 350, 560], NAMES = ["Inkling", "Claude Code", "DreamCoder"], DATE = "20 Nov";

  /* ---- 1. a sailboat drifts past three buoys; tap a buoy to stop the boat and read its date ---- */
  SC.sailboat = {
    dur: 10, still: 9,
    build(svg, api) {
      const W = 800, BOY = 322, BY = 452, LY = 514, STILL = 9;
      const root = el("g", {}, svg);
      const sun = el("g", {}, root); el("circle", { r: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, sun);
      const clouds = [[286, 92], [540, 60]].map(([x, y]) => ({ g: cloud(root), x, y }));
      const boatG = boat(root);
      const r1 = ribbon(root, W, BOY, BOY + 24, 5, 72);
      const marks = [[40, 400], [248, 396], [456, 402], [690, 398]].map(([x, y]) => ({ n: el("path", { d: "M-18 0 q9 -7 18 0 t18 0", stroke: SKY, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, root), x, y }));
      const bs = XS.map(() => buoy(root));
      const r2 = ribbon(root, W, BY - 4, BY + 18, 4, 64);
      const rips = XS.map(() => el("ellipse", { rx: 30, ry: 7, fill: "none", stroke: MINT, "stroke-width": 3, opacity: 0 }, root));
      const labs = NAMES.map((s) => { const g = el("g", {}, root); return { g, n: txt(g, 0, 8, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE }) }; });
      const tag = el("g", { opacity: 0 }, svg);
      el("rect", { x: -50, y: 5, width: 108, height: 42, rx: 12, fill: LIL }, tag);
      el("rect", { x: -54, y: 0, width: 108, height: 42, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 0, 28, DATE, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const boatX = (t) => -120 + 796 * sio(seg(t, 0.5, 7));
      const passT = XS.map((x) => { let t = 0; while (t < 7 && boatX(t) < x) t += 0.005; return t; });
      let pin = -1, pinFrom = STILL, pinTo = STILL, pinAt = 0, tagI = -1, tagOn = false, tagAt = -9, lastT = STILL;
      const press = (i) => {
        const now = api.now();
        if (pin === i) { pin = -1; tagOn = false; tagAt = now; api.seek(lastT); }
        else { if (pin < 0) { pinFrom = lastT; pinTo = cl(lastT, 1.5, STILL); pinAt = now; } pin = i; tagI = i; tagOn = true; tagAt = now; api.poke(); }
        hits.forEach((h, j) => h.setAttribute("aria-pressed", String(pin === j)));
      };
      const hits = XS.map((x, i) => {
        const g = el("g", { "aria-pressed": "false" }, svg);
        el("rect", { x: x - 94, y: BY - 96, width: 188, height: 172, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, g);
        button(g, `${NAMES[i]}, dated ${DATE}`, () => press(i));
        return g;
      });
      return (t, now) => {
        const N = CALM ? 0 : now;
        let T = CALM ? STILL : t;
        if (pin >= 0) T = pinFrom + (pinTo - pinFrom) * (CALM ? 1 : io(seg(now - pinAt, 0, 0.6)));
        lastT = T;
        root.setAttribute("opacity", 1 - io(seg(T, 9.35, 9.95)));
        tf(sun, 80, 64, 0.4 + 0.6 * ob(seg(T, 0.05, 0.6))); sun.setAttribute("opacity", seg(T, 0.05, 0.2));
        clouds.forEach((c, i) => { const k = oc(seg(T, 0.15 + i * 0.1, 0.8 + i * 0.1)); tf(c.g, c.x - 24 * (1 - k) + 14 * seg(T, 0, 10), c.y, i ? 0.85 : 1); c.g.setAttribute("opacity", k); });
        [r1, r2].forEach((r, i) => { const k = oc(seg(T, i * 0.1, 0.6 + i * 0.1)); tf(r.outer, 0, 22 * (1 - k)); r.outer.setAttribute("opacity", k); tf(r.inner, -((N * (i ? 9 : 13)) % r.lam), 0); });
        marks.forEach((m, i) => { tf(m.n, m.x + 6 * Math.sin(N * 0.9 + i * 1.7), m.y); m.n.setAttribute("opacity", oc(seg(T, 0.3 + i * 0.06, 0.8 + i * 0.06))); });
        const amp = 1 - io(seg(T, 6, 7.2));
        tf(boatG, boatX(T), BOY + 2.5 * Math.sin(N * 1.5) * amp, 1, 1.8 * Math.sin(N * 1.15) * amp);
        XS.forEach((x, i) => {
          const kb = seg(T, 0.35 + i * 0.1, 0.9 + i * 0.1), e = ob(kb), on = T >= passT[i], p = seg(T, passT[i], passT[i] + 0.6), pop = p > 0 && p < 1 ? Math.sin(Math.PI * oc(p)) : 0;
          bs[i].body.setAttribute("fill", on ? MINT : LIL);
          tf(bs[i].g, x, BY + 20 * (1 - e) + 2 * Math.sin(N * (1.6 + 0.2 * i)), (0.5 + 0.5 * e) * (1 + 0.14 * pop), 2.5 * Math.sin(N * (1.2 + 0.17 * i)));
          bs[i].g.setAttribute("opacity", seg(kb, 0, 0.25));
          const kl = oc(seg(T, 0.8 + i * 0.1, 1.25 + i * 0.1));
          labs[i].n.setAttribute("fill", on ? INK : MUTE);
          tf(labs[i].g, x, LY - 8 + 14 * (1 - kl), 1 + 0.1 * pop); labs[i].g.setAttribute("opacity", kl);
          const q = oc(p);
          rips[i].setAttribute("cx", x); rips[i].setAttribute("cy", BY + 7); rips[i].setAttribute("rx", 30 + 56 * q); rips[i].setAttribute("ry", 7 + 8 * q);
          rips[i].setAttribute("opacity", p > 0 && p < 1 ? 1 - p : 0);
        });
        if (tagI >= 0) {
          const k = CALM ? (tagOn ? 1 : 0) : tagOn ? ob(seg(now - tagAt, 0, 0.38)) : 1 - io(seg(now - tagAt, 0, 0.25));
          tf(tag, XS[tagI], 534, 0.7 + 0.3 * k); tag.setAttribute("opacity", cl(k * 1.5));
        }
      };
    },
  };

  /* ---- title card, 16 by 9: the same boat drifts in and settles beside three cards ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: -78, y: -20, width: 156, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 7, "Daily Brief", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      const lines = [
        txt(svg, 64, 206, "Agent Tools", { "font-size": 80, "font-weight": 700 }),
        txt(svg, 64, 290, "Today", { "font-size": 80, "font-weight": 700 }),
        txt(svg, 64, 348, "21 Nov 2026", { "font-size": 30, "font-weight": 700 }),
        txt(svg, 64, 392, "Inkling, Claude Code and DreamCoder", { "font-size": 23, "font-weight": 500, fill: MUTE }),
      ];
      const cards = NAMES.map((s, i) => {
        const g = el("g", {}, svg), y = 234 + i * 64;
        el("rect", { x: 778, y: y + 6, width: 164, height: 50, rx: 12, fill: LIL }, g);
        el("rect", { x: 772, y, width: 164, height: 50, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        return { g, n: txt(g, 854, y + 32, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700, fill: MUTE }), y: y + 25 };
      });
      const boatG = boat(svg);
      const rs = [ribbon(svg, 960, 446, 470, 5, 76), ribbon(svg, 960, 500, 522, 4, 64)];
      return (t, now) => {
        const N = CALM ? 0 : now, T = CALM ? 6 : t;
        tf(pill, 142, 92, 0.6 + 0.4 * ob(seg(T, 0, 0.45))); pill.setAttribute("opacity", seg(T, 0, 0.15));
        lines.forEach((n, i) => { const k = oc(seg(T, 0.12 + i * 0.09, 0.62 + i * 0.09)); n.setAttribute("transform", `translate(0 ${22 * (1 - k)})`); n.setAttribute("opacity", k); });
        rs.forEach((r, i) => { const k = oc(seg(T, 0.25 + i * 0.1, 0.85 + i * 0.1)); tf(r.outer, 0, 20 * (1 - k)); r.outer.setAttribute("opacity", k); tf(r.inner, -((N * (i ? 9 : 13)) % r.lam), 0); });
        const u = seg(T, 0.9, 4.4), amp = 1 - io(seg(T, 4.2, 5.2));
        tf(boatG, 560 + 90 * (sio(u) + 0.08 * Math.sin(Math.PI * seg(u, 0.75, 1))), 446 + 2.5 * Math.sin(N * 1.5) * amp, 1, 1.8 * Math.sin(N * 1.15) * amp);
        boatG.setAttribute("opacity", oc(seg(u, 0, 0.3)));
        cards.forEach((c, i) => {
          const k = ob(seg(T, 0.7 + i * 0.1, 1.2 + i * 0.1)), w = seg(T, 4.1 + i * 0.1, 4.6 + i * 0.1), on = w > 0;
          tf(c.g, 40 * (1 - k), 0); c.g.setAttribute("opacity", seg(T, 0.7 + i * 0.1, 0.85 + i * 0.1));
          c.n.setAttribute("fill", on ? INK : MUTE);
          const s = 1 + 0.1 * (w > 0 && w < 1 ? Math.sin(Math.PI * oc(w)) : 0);
          c.n.setAttribute("transform", `translate(854 ${c.y}) scale(${s}) translate(-854 ${-c.y})`);
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
