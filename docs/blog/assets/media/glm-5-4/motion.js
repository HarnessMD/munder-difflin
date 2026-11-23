/* Bright coded scenes for "GLM-5.4: Z.ai's first loop transformer model, explained". Vanilla JS, no library.
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
  const ring = (p, a) => el(a.rx != null && a.cx != null ? "ellipse" : "rect", Object.assign({ fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, a), p);
  const flip = (n, cy, k) => n.setAttribute("transform", `translate(0 ${cy}) scale(1 ${Math.max(0.02, Math.abs(Math.cos(k * Math.PI)))}) translate(0 ${-cy})`);

  const SC = {};

  /* ---- 1. a toy car laps the track twice: the same 28 layers, a first pass and a second pass ---- */
  SC.racetrack = {
    dur: 10, still: 9.6,
    build(svg, api) {
      const cx = 400, cy = 336, rx = 290, ry = 170, d = 0.138;
      const ban = el("g", {}, svg);
      el("path", { d: "M290 46 H246 L260 66 L246 86 H290 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ban);
      el("path", { d: "M510 46 H554 L540 66 L554 86 H510 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ban);
      el("rect", { x: 276, y: 30, width: 248, height: 60, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, ban);
      txt(ban, 400, 71, "28 layers", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      const g = el("g", {}, svg);
      ring(g, { cx, cy, rx: rx + 66, ry: ry + 64 });
      for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2 + 0.07, px = cx + (rx + 46) * Math.cos(a), py = cy + (ry + 44) * Math.sin(a); el("rect", { x: px - 6, y: py - 11, width: 12, height: 22, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2 }, g); }
      el("ellipse", { cx, cy, rx, ry, fill: "none", stroke: INK, "stroke-width": 60 }, g);
      el("ellipse", { cx, cy, rx, ry, fill: "#fff", stroke: LIL, "stroke-width": 54 }, g);
      el("ellipse", { cx, cy, rx, ry, fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-dasharray": "14 16", "stroke-linecap": "round" }, g);
      el("rect", { x: 391, y: 478, width: 18, height: 56, fill: MINT, stroke: INK, "stroke-width": 2 }, g);
      for (let r = 0; r < 7; r++) for (let c = 0; c < 2; c++) if ((r + c) % 2 === 0) el("rect", { x: 392 + c * 8, y: 479 + r * (54 / 7), width: 8, height: 54 / 7, fill: "#fff" }, g);
      el("ellipse", { cx: 318, cy: 422, rx: 24, ry: 8, fill: SOFT, stroke: INK, "stroke-width": 2 }, g);
      el("path", { d: "M318 420 V250", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
      const flag = el("g", {}, g);
      el("rect", { x: 321, y: 252, width: 222, height: 74, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, flag);
      const ft = txt(flag, 432, 300, "first pass", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      const car = el("g", {}, g);
      [[-24, -19], [10, -19], [-24, 13], [10, 13]].forEach(([x, y]) => el("rect", { x, y, width: 14, height: 6, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2 }, car));
      el("rect", { x: -30, y: -14, width: 60, height: 28, rx: 11, fill: SKY, stroke: INK, "stroke-width": 3 }, car);
      el("rect", { x: -12, y: -9, width: 20, height: 18, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, car);
      el("circle", { cx: 24, cy: -7, r: 3, fill: YEL, stroke: INK, "stroke-width": 1.5 }, car);
      el("circle", { cx: 24, cy: 7, r: 3, fill: YEL, stroke: INK, "stroke-width": 1.5 }, car);
      button(g, "Run both laps again", () => api.seek(0));
      return (t) => {
        const th = Math.PI / 2 - d + (4 * Math.PI + 2 * d) * io(seg(t, 0.6, 7.8));
        tf(car, cx + rx * Math.cos(th), cy + ry * Math.sin(th), 1, (Math.atan2(ry * Math.cos(th), -rx * Math.sin(th)) * 180) / Math.PI);
        const k = seg(t, 3.95, 4.45);
        ft.textContent = k >= 0.5 ? "second pass" : "first pass";
        flip(flag, 289, k);
      };
    },
  };

  /* ---- 2. a metronome swings fast off peak and slower at peak; a needle on a dial follows ---- */
  SC.metronome = {
    dur: 12, still: 10.8,
    build(svg, api) {
      const F1 = 2, F2 = 2 / 3, A = 30;
      const P = (t) => { const u = cl(t - 5.5, 0, 1); return F1 * Math.min(t, 5.5) + F1 * u + ((F2 - F1) * u * u) / 2 + F2 * Math.max(t - 6.5, 0); };
      const card = el("g", {}, svg);
      el("rect", { x: 100, y: 34, width: 600, height: 86, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, card);
      const ct = txt(card, 400, 89, "up to 200 tokens/s off peak", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      const g = el("g", {}, svg);
      ring(g, { x: 40, y: 146, width: 720, height: 430, rx: 24 });
      el("rect", { x: 160, y: 514, width: 220, height: 30, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
      el("path", { d: "M186 516 L236 176 H304 L354 516 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      el("path", { d: "M228 474 L252 220 H288 L312 474 Z", fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
      for (let i = 0; i < 8; i++) el("path", { d: `M262 ${236 + i * 26} H278`, stroke: MUTE, "stroke-width": 2, "stroke-linecap": "round" }, g);
      el("circle", { cx: 270, cy: 172, r: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
      const arm = el("g", {}, g);
      el("path", { d: "M270 452 V196", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, arm);
      el("rect", { x: 252, y: 266, width: 36, height: 30, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, arm);
      el("circle", { cx: 270, cy: 452, r: 10, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
      const DX = 590, DY = 524;
      el("path", { d: `M${DX - 150} ${DY} A150 150 0 0 1 ${DX + 150} ${DY} Z`, fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI, c = Math.cos(a), s = Math.sin(a); el("path", { d: `M${DX + c * 134} ${DY + s * 134} L${DX + c * 116} ${DY + s * 116}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); }
      const needle = el("g", {}, g);
      el("path", { d: `M${DX - 8} ${DY} L${DX} ${DY - 118} L${DX + 8} ${DY} Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, needle);
      el("rect", { x: DX - 166, y: DY, width: 332, height: 20, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
      el("circle", { cx: DX, cy: DY, r: 13, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
      let last = 0;
      button(g, "Switch between the off peak and the at peak speed", () => { const f = P(last) % 1; api.seek(last < 6 ? 6.5 + (13 + f - P(6.5)) / F2 : (1 + f) / F1); });
      return (t) => {
        last = t;
        const ang = A * Math.sin(2 * Math.PI * P(t));
        arm.setAttribute("transform", `rotate(${ang} 270 452)`);
        needle.setAttribute("transform", `rotate(${ang * 2.4} ${DX} ${DY})`);
        const k = seg(t, 5.5, 6.1);
        ct.textContent = k >= 0.5 ? "70 to 80 tokens/s at peak" : "up to 200 tokens/s off peak";
        flip(card, 77, k);
      };
    },
  };

  /* ---- 3. five garden gates: three open now, two still latched ---- */
  SC.gate = {
    dur: 9, still: 8.6,
    build(svg, api) {
      const G = [["GLM Coding", "Plan", BLUE, "Open now", MINT, 1], ["ZCode", "", BLUE, "Open now", MINT, 1], ["Z.ai Chat", "", BLUE, "Open now", MINT, 1], ["API", "", LIL, "Coming soon", YEL, 0], ["Open", "weights", LIL, "Planned", SKY, 0]];
      const T = [0.8, 1.6, 2.4, 3.4, 4.2];
      el("rect", { x: -10, y: 458, width: 820, height: 62, fill: MINT }, svg);
      el("path", { d: "M-10 458 H810 M-10 520 H810", stroke: INK, "stroke-width": 3 }, svg);
      const hits = G.map(() => -99);
      const ns = { fill: SOFT, stroke: INK, "stroke-width": 2, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round" };
      const gates = G.map(([l1, l2, sc, tag, tc, open], i) => {
        const c = 96 + i * 152, g = el("g", {}, svg);
        ring(g, { x: c - 72, y: 102, width: 144, height: 374, rx: 16 });
        el("rect", { x: c - 68, y: 112, width: 136, height: 74, rx: 14, fill: sc, stroke: INK, "stroke-width": 3 }, g);
        const st = { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 };
        if (l2) { txt(g, c, 144, l1, st); txt(g, c, 168, l2, st); } else txt(g, c, 156, l1, st);
        const str = el("path", { stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
        const tg = el("g", {}, g), tgi = el("g", {}, tg);
        el("rect", { x: c - 64, y: 0, width: 128, height: 36, rx: 18, fill: tc, stroke: INK, "stroke-width": 2.5 }, tgi);
        txt(tgi, c, 24, tag, { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
        [c - 64, c + 52].forEach((x) => { el("rect", { x, y: 284, width: 12, height: 182, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g); el("circle", { cx: x + 6, cy: 282, r: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g); });
        const leaf = el("g", {}, g);
        el("rect", { x: 0, y: 22, width: 104, height: 10, rx: 3, ...ns }, leaf);
        el("rect", { x: 0, y: 112, width: 104, height: 10, rx: 3, ...ns }, leaf);
        [6, 27, 48, 69, 90].forEach((x) => el("path", { d: `M${x} 12 L${x + 4} 0 L${x + 8} 12 V140 H${x} Z`, ...ns }, leaf));
        if (!open) el("rect", { x: c + 38, y: 362, width: 24, height: 12, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        button(g, `${l1}${l2 ? " " + l2 : ""}: ${tag}`, () => { hits[i] = api.now(); api.poke(); });
        return { c, str, tg, tgi, leaf, open };
      });
      return (t, now) => {
        gates.forEach((q, i) => {
          const dt = now - hits[i], h = dt >= 0 && dt < 1.4;
          let sx, pop;
          if (q.open) {
            let o = ob(seg(t, T[i], T[i] + 0.9));
            if (h) o *= 1 - Math.sin(Math.PI * seg(dt, 0, 1.1));
            sx = 1 - 0.8 * o; pop = seg(t, T[i] + 0.5, T[i] + 0.9);
          } else {
            const r = h ? seg(dt, 0, 0.7) : seg(t, T[i], T[i] + 0.7);
            sx = 1 - 0.08 * Math.abs(Math.sin(r * 3 * Math.PI)) * (1 - r); pop = seg(t, T[i] + 0.3, T[i] + 0.7);
          }
          q.leaf.setAttribute("transform", `translate(${q.c - 52} 300) scale(${sx} 1)`);
          const lift = h ? -10 * Math.sin(Math.PI * seg(dt, 0, 0.8)) : 0, y = 202 + lift, s = 0.6 + 0.4 * ob(pop);
          q.tg.setAttribute("transform", `translate(0 ${y})`);
          q.tgi.setAttribute("transform", `translate(${q.c} 18) scale(${s}) translate(${-q.c} -18)`);
          q.tg.setAttribute("opacity", cl(pop * 3));
          q.str.setAttribute("d", `M${q.c} 186 V${y + 2}`);
          q.str.setAttribute("opacity", cl(pop * 3));
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 124, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 126, 72, "Launch", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      txt(svg, 896, 72, "Checked 24 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 60, 214, "GLM 5.4", { "font-size": 112, "font-weight": 700 });
      el("path", { d: "M68 246 H236", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 302, "Z.ai's first loop transformer model", { "font-size": 30, "font-weight": 500, fill: MUTE });
      el("rect", { x: 64, y: 352, width: 400, height: 136, rx: 22, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const lp = el("g", { transform: "translate(110 392)" }, svg);
      el("path", { d: "M0 -18 A18 18 0 1 1 -15.6 -9", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, lp);
      el("path", { d: "M-13.4 2.2 L-15.6 -9 L-25.8 -4.8", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, lp);
      txt(svg, 88, 460, "28 layers, run twice", { "font-size": 30, "font-weight": 700 });
      el("rect", { x: 496, y: 352, width: 400, height: 136, rx: 22, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 9 : 21; return `${(542 + Math.cos(a) * r).toFixed(1)} ${(394 + Math.sin(a) * r).toFixed(1)}`; });
      el("path", { d: `M${pts.join(" L")} Z`, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      txt(svg, 520, 460, "API coming soon", { "font-size": 30, "font-weight": 700 });
      return () => {};
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
