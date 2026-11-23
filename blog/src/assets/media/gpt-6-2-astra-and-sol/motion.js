/* Bright coded scenes for "GPT-6.2 Astra and Sol". Vanilla JS, no library.
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
  let uid = 0;
  const nid = (p) => `mg-${p}-${++uid}`;
  /* the whole scene is one button: tap, click, Enter or Space replays from the start */
  const replay = (svg, api, W = 800, H = 600) => {
    const g = el("g", {}, svg);
    el("rect", { width: W, height: H, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x: 6, y: 6, width: W - 12, height: H - 12, rx: 14, fill: "none", stroke: BLUE, "stroke-width": 4, class: "mg-ring" }, g);
    button(g, "Replay the animation", () => api.seek(0));
  };
  const pill = (p, s, size, fill) => {
    const g = el("g", {}, p), w = s.length * size * 0.61 + 22;
    el("rect", { x: -w / 2, y: -size + 1, width: w, height: size + 13, rx: (size + 13) / 2, fill, stroke: INK, "stroke-width": 2 }, g);
    txt(g, 0, 1, s, { "text-anchor": "middle", "font-family": MONO, "font-size": size, "font-weight": 700 });
    return g;
  };

  const SC = {};

  /* ---- 1. a blue and grey orrery turns; the two GPT 6.2 planets glow ---- */
  SC.orrery = {
    dur: 10, still: 9.95,
    build(svg, api) {
      const cx = 400, cy = 300, K = 0.36;
      const P = [["GPT 6.2 Astra", 118, 135, 19, true], ["GPT 6.2 Sol", 178, 45, 19, true], ["GPT 6.1 Terra", 238, 215, 16, false], ["GPT 6 Luna", 298, 315, 14, false]];
      P.forEach(([, r]) => {
        el("ellipse", { cx, cy, rx: r, ry: r * K, fill: "none", stroke: SOFT, "stroke-width": 7 }, svg);
        el("ellipse", { cx, cy, rx: r, ry: r * K, fill: "none", stroke: MUTE, "stroke-width": 1.5, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, svg);
      });
      el("path", { d: `M${cx} ${cy} V478`, stroke: INK, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${cx} ${cy} V478`, stroke: MUTE, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      el("path", { d: "M304 478 V492 A96 22 0 0 0 496 492 V478", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("ellipse", { cx, cy: 478, rx: 96, ry: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const arms = el("g", {}, svg), hub = el("g", {}, svg), planets = el("g", {}, svg), labels = el("g", {}, svg);
      el("circle", { cx, cy, r: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, hub);
      el("circle", { cx: cx - 5, cy: cy - 5, r: 4, fill: "#fff" }, hub);
      const items = P.map(([name, r, a, pr, hot]) => {
        const arm = el("path", { stroke: MUTE, "stroke-width": 3.5, "stroke-linecap": "round" }, arms);
        const g = el("g", {}, planets);
        const halo = hot ? el("circle", { r: pr + 9, fill: YEL, opacity: 0 }, g) : null;
        el("circle", { r: pr, fill: hot ? BLUE : SKY, stroke: INK, "stroke-width": 3 }, g);
        const glow = hot ? el("circle", { r: pr, fill: YEL, stroke: INK, "stroke-width": 3, opacity: 0 }, g) : null;
        el("circle", { cx: -pr * 0.35, cy: -pr * 0.35, r: pr * 0.22, fill: "#fff" }, g);
        const lab = pill(labels, name, 17, "#fff");
        return { r, a, pr, hot, arm, g, halo, glow, lab };
      });
      const card = el("g", { opacity: 0 }, svg);
      el("rect", { x: 230, y: 34, width: 340, height: 66, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 400, 77, "New on 17 Nov 2026", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
      replay(svg, api);
      return (t, now) => {
        const turn = -80 * (1 - io(seg(t, 0, 6.4))), g = oc(seg(t, 6.3, 7.1));
        items.forEach((p) => {
          const a = ((p.a + turn) * Math.PI) / 180, x = cx + Math.cos(a) * p.r, y = cy + Math.sin(a) * p.r * K;
          p.arm.setAttribute("d", `M${cx} ${cy} L${x.toFixed(1)} ${y.toFixed(1)}`);
          tf(p.g, x, y);
          tf(p.lab, x, y + p.pr + 24);
          if (p.hot) { p.glow.setAttribute("opacity", g); p.halo.setAttribute("opacity", 0.45 * g); p.halo.setAttribute("r", p.pr + 9 + 3 * Math.sin(now * 3) * g); }
        });
        const d = ob(seg(t, 7.0, 7.8));
        tf(card, 0, -150 * (1 - d)); card.setAttribute("opacity", t >= 7.0 ? 1 : 0);
      };
    },
  };

  /* ---- 2. a kitchen balance with two price tags; Astra sinks ---- */
  SC.scale = {
    dur: 9, still: 8.95,
    build(svg, api) {
      const px = 400, py = 345, HALF = 210, STEM = 34;
      el("rect", { x: 386, y: py, width: 28, height: 60, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 150, y: 396, width: 500, height: 78, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M190 435 H610", stroke: "#fff", "stroke-width": 10, "stroke-linecap": "round" }, svg);
      for (let i = -3; i <= 3; i++) { const a = ((i * 5 - 90) * Math.PI) / 180, r1 = 108, r2 = i ? 116 : 122; el("path", { d: `M${px + Math.cos(a) * r1} ${py + Math.sin(a) * r1} L${px + Math.cos(a) * r2} ${py + Math.sin(a) * r2}`, stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round" }, svg); }
      const stems = [0, 1].map(() => el("path", { stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg));
      const beam = el("g", {}, svg);
      el("path", { d: "M0 0 V-100", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, beam);
      el("circle", { cx: 0, cy: -100, r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, beam);
      el("rect", { x: -HALF - 6, y: -8, width: 2 * HALF + 12, height: 16, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, beam);
      el("circle", { cx: px, cy: py, r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const plates = [0, 1].map(() => { const g = el("g", {}, svg); el("rect", { x: -112, y: -7, width: 224, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); return g; });
      const tags = [["GPT 6.2 Astra", "$8 in", "$40 out", LIL, 0.3], ["GPT 6.2 Sol", "$2 in", "$10 out", SKY, 0.8]].map(([name, a, b, col, at]) => {
        const g = el("g", { opacity: 0 }, svg);
        el("path", { d: "M-100 0 V-132 L-72 -160 H72 L100 -132 V0 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cx: 0, cy: -138, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, -102, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        txt(g, 0, -60, a, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        txt(g, 0, -22, b, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        return { g, at };
      });
      const lab = el("g", { opacity: 0 }, svg);
      el("rect", { x: -200, y: -26, width: 400, height: 52, rx: 26, fill: MINT, stroke: INK, "stroke-width": 3 }, lab);
      txt(lab, 0, 8, "per 1M tokens, 18 Nov 2026", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      replay(svg, api);
      return (t) => {
        const deg = 8 * ob(seg(t, 2.2, 3.8)) + 2 * Math.sin(seg(t, 1.0, 1.5) * Math.PI) - 2 * Math.sin(seg(t, 1.5, 2.0) * Math.PI);
        const r = (deg * Math.PI) / 180;
        beam.setAttribute("transform", `translate(${px} ${py}) rotate(${-deg})`);
        [-1, 1].forEach((s, i) => {
          const ex = px + s * HALF * Math.cos(r), ey = py - s * HALF * Math.sin(r);
          stems[i].setAttribute("d", `M${ex} ${ey} V${ey - STEM}`);
          tf(plates[i], ex, ey - STEM);
          const k = seg(t, tags[i].at, tags[i].at + 0.7);
          tf(tags[i].g, ex, ey - STEM - 7 - 300 * (1 - ob(k)));
          tags[i].g.setAttribute("opacity", t >= tags[i].at ? 1 : 0);
        });
        const m = seg(t, 4.2, 4.8);
        tf(lab, 400, 524, 0.4 + 0.6 * ob(m)); lab.setAttribute("opacity", t >= 4.2 ? 1 : 0);
      };
    },
  };

  /* ---- 3. two measuring cups fill to their default context ---- */
  SC.measuringcup = {
    dur: 10, still: 9.95,
    build(svg, api) {
      const BOT = 490, TOP = 190, FULL = 205, H = BOT - FULL;
      const hw = (y) => 112 - (20 * (y - TOP)) / (BOT - TOP);
      const cups = [[230, "GPT 6.2 Astra", 0.272, "272,000 tokens", -1, 0.5, 3.6], [570, "GPT 6.2 Sol", 0.5, "500,000 tokens", 1, 1.0, 4.6]].map(([cx, name, v, label, side, a, b]) => {
        const shape = `M${cx - 112} ${TOP} L${cx - 94} ${BOT - 16} Q${cx - 92} ${BOT + 2} ${cx - 74} ${BOT + 2} H${cx + 74} Q${cx + 92} ${BOT + 2} ${cx + 94} ${BOT - 16} L${cx + 112} ${TOP}`;
        el("ellipse", { cx, cy: BOT + 8, rx: 128, ry: 10, fill: SOFT }, svg);
        const hd = `M${cx + side * (hw(232) + 1)} 232 C${cx + side * 180} 232 ${cx + side * 180} 404 ${cx + side * (hw(404) + 1)} 404`;
        el("path", { d: hd, stroke: INK, "stroke-width": 17, fill: "none" }, svg);
        el("path", { d: hd, stroke: "#fff", "stroke-width": 9, fill: "none" }, svg);
        el("path", { d: shape + " Z", fill: SKY, "fill-opacity": 0.14 }, svg);
        const id = nid("cup"), clip = el("clipPath", { id }, svg);
        el("path", { d: shape + " Z" }, clip);
        const liq = el("path", { fill: BLUE, stroke: SKY, "stroke-width": 5, "clip-path": `url(#${id})` }, svg);
        el("path", { d: `M${cx + 80} 224 L${cx + 66} 452`, stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round", opacity: 0.85 }, svg);
        for (let k = 1; k <= 9; k++) { const y = BOT - (k * H) / 10, x0 = cx - hw(y) + 5; el("path", { d: `M${x0} ${y} H${x0 + (k === 5 ? 26 : 15)}`, stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round" }, svg); }
        const ly = BOT - v * H;
        const line = el("path", { d: `M${cx - hw(ly) + 6} ${ly} H${cx + hw(ly) - 6}`, stroke: MUTE, "stroke-width": 3, "stroke-dasharray": "10 6" }, svg);
        const lab = txt(svg, cx, ly - 14, label, { "text-anchor": "middle", "font-size": 21, "font-weight": 700, fill: MUTE, stroke: "#fff", "stroke-width": 7, "stroke-linejoin": "round", "paint-order": "stroke" });
        el("path", { d: shape, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
        el("path", { d: `M${cx - side * 112} ${TOP} l${-side * 14} -9`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
        txt(svg, cx, 548, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        return { cx, v, a, b, liq, line, lab };
      });
      const dot = el("g", { opacity: 0 }, svg);
      el("path", { d: `M70 ${FULL} H730`, stroke: INK, "stroke-width": 3.5, "stroke-dasharray": "0.5 11", "stroke-linecap": "round" }, dot);
      const note = txt(dot, 400, 158, "up to 1 million with ", { "text-anchor": "middle", "font-size": 22, "font-weight": 600 });
      const mono = el("tspan", { "font-family": MONO, "font-weight": 700 }, note); mono.textContent = "model_context_window";
      replay(svg, api);
      const wave = (cx, top, A, ph) => { let d = `M${cx - 130} ${BOT + 10} V${top.toFixed(1)}`; for (let x = -130; x <= 130; x += 10) d += ` L${cx + x} ${(top + A * Math.sin(ph + x * 0.05)).toFixed(1)}`; return d + ` V${BOT + 10} Z`; };
      return (t) => {
        cups.forEach((c) => {
          const k = oc(seg(t, c.a, c.b)), top = BOT + 4 - (c.v * H + 4) * k;
          c.liq.setAttribute("d", wave(c.cx, top, 6 * Math.sin(Math.PI * k), t * 5));
          const on = k > 0.985;
          c.line.setAttribute("stroke", on ? INK : MUTE); c.lab.setAttribute("fill", on ? INK : MUTE);
        });
        dot.setAttribute("opacity", oc(seg(t, 5.2, 6.2)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0.99,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 124, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 126, 73, "Launch", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      txt(svg, 896, 73, "Checked 18 Nov 2026", { "text-anchor": "end", "font-size": 21, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 186, "GPT 6.2 Astra and Sol", { "font-size": 70, "font-weight": 700 });
      el("path", { d: "M68 214 H236", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 266, "OpenAI's new pair of models", { "font-size": 26, "font-weight": 500, fill: MUTE });
      [[64, LIL, "GPT 6.2 Astra", "$8 in per 1M tokens", "star"], [496, SKY, "GPT 6.2 Sol", "$2 in per 1M tokens", "sun"]].forEach(([x, col, name, price, icon]) => {
        el("rect", { x, y: 306, width: 400, height: 180, rx: 24, fill: col, stroke: INK, "stroke-width": 3 }, svg);
        const ix = x + 54, iy = 356;
        if (icon === "star") {
          let d = "";
          for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, r = i % 2 ? 9 : 21; d += `${i ? "L" : "M"}${(ix + Math.cos(a) * r).toFixed(1)} ${(iy + Math.sin(a) * r).toFixed(1)} `; }
          el("path", { d: d + "Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
        } else {
          for (let i = 0; i < 8; i++) { const a = (i * 45 * Math.PI) / 180, d = `M${ix + Math.cos(a) * 18} ${iy + Math.sin(a) * 18} L${ix + Math.cos(a) * 24} ${iy + Math.sin(a) * 24}`; el("path", { d, stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, svg); el("path", { d, stroke: YEL, "stroke-width": 3.5, "stroke-linecap": "round" }, svg); }
          el("circle", { cx: ix, cy: iy, r: 13, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
        }
        txt(svg, x + 36, 428, name, { "font-family": MONO, "font-size": 30, "font-weight": 700 });
        txt(svg, x + 36, 466, price, { "font-size": 24, "font-weight": 600 });
      });
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
