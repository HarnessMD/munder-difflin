/* Bright coded scenes for "agent-desktop alternatives". Vanilla JS, no library.
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
  const rr = (x, y, w, h, r) => `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  const lerp = (a, b, k) => a + (b - a) * k;

  const SC = {};

  /* ---- 1. a paper stencil; a sponge dabs three labels through the cut outs ---- */
  SC.stencil = {
    dur: 9, still: 9,
    build(svg, api) {
      el("rect", { x: 162, y: 82, width: 500, height: 460, rx: 10, fill: SOFT }, svg);
      el("rect", { x: 150, y: 70, width: 500, height: 460, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const CUT = [["Button", 220, 35, LIL, 165], ["Text field", 340, 12, SKY, 270], ["Menu", 260, 12, MINT, 375]].map(([s, w, r, c, y]) => ({ s, w, r, c, y, x: 400 - w / 2, h: 70 }));
      const paints = CUT.map((k) => {
        const g = el("g", {}, svg);
        el("path", { d: rr(k.x, k.y, k.w, k.h, k.r), fill: k.c }, g);
        txt(g, 400, k.y + 45, k.s, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        return g;
      });
      const st = el("g", {}, svg);
      el("rect", { x: 190, y: 110, width: 420, height: 380, rx: 16, fill: "#fff", "fill-opacity": 0 }, st);
      el("path", { d: rr(190, 110, 420, 380, 16) + " " + CUT.map((k) => rr(k.x, k.y, k.w, k.h, k.r)).join(" "), fill: YEL, stroke: INK, "stroke-width": 3, "fill-rule": "evenodd", "stroke-linejoin": "round" }, st);
      [[214, 134], [586, 134], [214, 466], [586, 466]].forEach(([cx, cy]) => el("circle", { cx, cy, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, st));
      el("rect", { x: 178, y: 98, width: 444, height: 404, rx: 24, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, st);
      button(st, "Lift the stencil and dab the labels again", () => api.seek(0));
      const sp = el("g", {}, svg), body = el("g", {}, sp);
      el("rect", { x: -65, y: -40, width: 130, height: 80, rx: 22, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
      [[-36, -16, 6], [-8, 10, 5], [22, -14, 5], [40, 14, 6], [-40, 18, 4], [10, -22, 3.5]].forEach(([cx, cy, r]) => el("circle", { cx, cy, r, fill: "#fff" }, body));
      const REST = [700, 470], DAB = CUT.map((_, i) => 2.2 + i * 1.3);
      const hover = CUT.map((k) => [400, k.y + 35 - 70]);
      const legs = [[1.6, 2.1, REST, hover[0]], [DAB[0] + 0.45, DAB[1] - 0.05, hover[0], hover[1]], [DAB[1] + 0.45, DAB[2] - 0.05, hover[1], hover[2]], [DAB[2] + 0.45, 6.1, hover[2], REST]];
      return (t) => {
        const lift = oc(seg(t, 0, 0.6)) * (1 - io(seg(t, 1.1, 1.6)));
        st.setAttribute("transform", `translate(${40 * lift} ${-80 * lift}) rotate(${-6 * lift} 610 110)`);
        paints.forEach((g, i) => {
          const cy = CUT[i].y + 35, hit = DAB[i] + 0.18;
          const o = t < hit ? 1 - seg(t, 0.6, 1.0) : 1, s = t < hit ? 1 : 0.8 + 0.2 * ob(seg(t, hit, hit + 0.35));
          g.setAttribute("opacity", o); g.setAttribute("transform", `translate(400 ${cy}) scale(${s}) translate(-400 ${-cy})`);
        });
        let [x, y] = REST;
        for (const [a, b, p, q] of legs) { if (t >= a) { const k = io(seg(t, a, b)); x = lerp(p[0], q[0], k); y = lerp(p[1], q[1], k); } }
        let sq = 0;
        DAB.forEach((d) => { const k = seg(t, d, d + 0.4); if (k > 0 && k < 1) { const s = Math.sin(Math.PI * k); y += 70 * s; sq = Math.max(sq, seg(s, 0.7, 1)); } });
        tf(sp, x, y);
        body.setAttribute("transform", `scale(${1 + 0.08 * sq} ${1 - 0.14 * sq})`);
      };
    },
  };

  /* ---- 2. an abacus; each bead that slides changes the card ---- */
  SC.abacus = {
    dur: 9, still: 9,
    build(svg, api) {
      const ab = el("g", {}, svg);
      el("rect", { x: 150, y: 56, width: 500, height: 310, rx: 22, fill: "#fff", "fill-opacity": 0 }, ab);
      el("path", { d: "M206 330 L190 362 M594 330 L610 362", stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, ab);
      el("rect", { x: 150, y: 56, width: 500, height: 280, rx: 22, fill: BLUE, stroke: INK, "stroke-width": 3 }, ab);
      el("rect", { x: 176, y: 82, width: 448, height: 228, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, ab);
      const RODS = [128, 196, 264], RIGHT = [596, 546, 496, 446], LEFT = 204;
      const bead = (cx, cy, fill) => { const g = el("g", {}, ab); el("ellipse", { cx: 0, cy: 0, rx: 25, ry: 24, fill, stroke: INK, "stroke-width": 3 }, g); el("ellipse", { cx: -8, cy: -10, rx: 7, ry: 4, fill: "#fff" }, g); tf(g, cx, cy); return g; };
      const moving = RODS.map((y, r) => {
        el("path", { d: `M176 ${y} H624`, stroke: INK, "stroke-width": 3 }, ab);
        const col = r === 1 ? LIL : YEL;
        RIGHT.slice(0, 3).forEach((x) => bead(x, y, col));
        return bead(RIGHT[3], y, col);
      });
      el("rect", { x: 140, y: 46, width: 520, height: 326, rx: 28, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, ab);
      button(ab, "Slide both beads back and replay", () => api.seek(0));
      const card = el("g", {}, svg);
      el("rect", { x: 170, y: 412, width: 480, height: 136, rx: 18, fill: SOFT }, card);
      el("rect", { x: 160, y: 402, width: 480, height: 136, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      const blank = el("g", {}, card);
      el("rect", { x: 200, y: 436, width: 300, height: 22, rx: 11, fill: SOFT }, blank);
      el("rect", { x: 200, y: 482, width: 200, height: 18, rx: 9, fill: SOFT }, blank);
      const full = el("g", {}, card);
      const dot = el("circle", { cx: 202, cy: 448, r: 13, fill: YEL, stroke: INK, "stroke-width": 2.5 }, full);
      const name = txt(full, 228, 457, "", { "font-family": MONO, "font-size": 26, "font-weight": 700 });
      const line = txt(full, 228, 506, "", { "font-size": 25, "font-weight": 500 });
      const STATES = [null, ["agent-desktop", "Apache 2.0, free", YEL], ["Claude Code computer use", "Pro $17 a month, yearly", LIL]];
      const FLIPS = [[0.1, 0], [2.1, 1], [5.5, 2]];
      return (t) => {
        const back = io(seg(t, 0, 0.7));
        const L = [t < 1.2 ? 1 - back : oc(seg(t, 1.2, 2.1)), t < 4.6 ? 1 - back : oc(seg(t, 4.6, 5.5)), 0];
        moving.forEach((g, r) => tf(g, lerp(RIGHT[3], LEFT, L[r]), RODS[r]));
        let state = 2, sy = 1;
        FLIPS.forEach(([a, s]) => { const k = seg(t, a, a + 0.5); if (k >= 0.5) state = s; if (k > 0 && k < 1) sy = Math.max(0.02, Math.abs(Math.cos(Math.PI * k))); });
        card.setAttribute("transform", `translate(0 470) scale(1 ${sy}) translate(0 -470)`);
        const S = STATES[state];
        blank.setAttribute("opacity", S ? 0 : 1); full.setAttribute("opacity", S ? 1 : 0);
        if (S) { name.textContent = S[0]; line.textContent = S[1]; dot.setAttribute("fill", S[2]); }
      };
    },
  };

  /* ---- 3. a snow globe; shaking it changes the tiny screen ---- */
  SC.snowglobe = {
    dur: 8, still: 8,
    build(svg, api) {
      const C = [400, 250], R = 180, id = "mgsg" + Math.random().toString(36).slice(2, 8);
      const cp = el("clipPath", { id }, el("defs", {}, svg));
      el("circle", { cx: C[0], cy: C[1], r: R - 2 }, cp);
      el("ellipse", { cx: 400, cy: 540, rx: 210, ry: 18, fill: SOFT }, svg);
      const g = el("g", {}, svg);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: SKY, stroke: INK, "stroke-width": 4 }, g);
      const inner = el("g", { "clip-path": `url(#${id})` }, g);
      el("ellipse", { cx: 400, cy: 425, rx: 200, ry: 55, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, inner);
      el("path", { d: "M314 330 V384 M486 330 V384", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, inner);
      el("rect", { x: 300, y: 318, width: 200, height: 14, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, inner);
      el("rect", { x: 388, y: 296, width: 24, height: 24, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, inner);
      el("rect", { x: 270, y: 190, width: 260, height: 110, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, inner);
      el("rect", { x: 284, y: 202, width: 232, height: 86, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, inner);
      const screen = txt(inner, 400, 252, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
      const flakes = Array.from({ length: 38 }, (_, i) => {
        let rx, ry; const k = Math.floor(i / 4);
        if (i % 4 === 0) { rx = 310 + ((k * 53) % 180); ry = 318; }
        else if (i % 4 === 1) { rx = 286 + ((k * 67) % 228); ry = 190; }
        else { rx = 240 + ((i * 73) % 320); ry = 425 - 55 * Math.sqrt(1 - ((rx - 400) / 200) ** 2); }
        const r = 3 + (i % 3) * 1.5;
        return { n: el("circle", { r, fill: "#fff" }, inner), rx, ry: ry - r + 1, o: 40 + ((i * 37) % 130), ph: i * 2.39, d: (i % 7) * 0.16 };
      });
      inner.appendChild(screen);
      el("path", { d: "M268 140 A160 160 0 0 1 350 92", stroke: "#fff", "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, g);
      el("path", { d: "M268 398 H532 Q546 398 550 412 L582 512 Q586 526 572 526 H228 Q214 526 218 512 L250 412 Q254 398 268 398 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      el("rect", { x: 244, y: 448, width: 312, height: 24, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
      el("path", { d: `M${C[0] - 196} ${C[1]} A196 196 0 1 1 ${C[0] + 196} ${C[1]} L590 530 H210 Z`, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", "stroke-linejoin": "round", class: "mg-ring" }, g);
      button(g, "Shake the snow globe again", () => api.seek(0));
      return (t) => {
        const sh = t > 0.6 && t < 2.6 ? Math.sin((t - 0.6) * 20) * (1 - seg(t, 0.6, 2.6)) : 0;
        g.setAttribute("transform", `translate(${10 * sh} 0) rotate(${7 * sh} 400 526)`);
        const up = oc(seg(t, 0.6, 1.3));
        flakes.forEach((f, i) => {
          const m = up * (1 - io(seg(t, 2.8 + f.d, 5.2 + f.d))), a = f.ph + 2.4 * t;
          const ox = 400 + Math.cos(a) * f.o, oy = 250 + Math.sin(a) * f.o * 0.8;
          f.n.setAttribute("cx", lerp(f.rx, ox, m)); f.n.setAttribute("cy", lerp(f.ry, oy, m));
        });
        screen.textContent = t < 1.9 ? "Space: macOS VM" : "Space: Linux";
        screen.setAttribute("opacity", seg(t, 0, 0.4) * Math.abs(Math.cos(Math.PI * seg(t, 1.6, 2.2))));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.6, still: 3.6, once: true,
    build(svg) {
      el("rect", { x: 64, y: 40, width: 176, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 152, 67, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 67, "Checked 4 Nov 2026", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 150, "agent-desktop", { "font-size": 62, "font-weight": 700 });
      txt(svg, 64, 216, "alternatives", { "font-size": 62, "font-weight": 700 });
      el("path", { d: "M66 240 H420", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 288, "6 picks by why you are leaving", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const top = el("g", {}, svg);
      el("rect", { x: 64, y: 312, width: 240, height: 44, rx: 12, fill: SOFT, stroke: MUTE, "stroke-width": 2 }, top);
      txt(top, 184, 340, "agent-desktop", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700, fill: MUTE });
      const PICKS = ["Claude Code computer use", "Munder Difflin", "Codex computer use", "Playwright MCP", "Browser Use", "Cua"], FILLS = [YEL, SKY, LIL, MINT, YEL, SKY];
      const tiles = PICKS.map((s, i) => {
        const x = 64 + (i % 3) * 284, y = 378 + Math.floor(i / 3) * 58, g = el("g", {}, svg);
        el("rect", { x, y, width: 264, height: 44, rx: 12, fill: FILLS[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x + 132, y + 28, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        return g;
      });
      return (t) => {
        const k0 = oc(seg(t, 0.1, 0.5)); top.setAttribute("opacity", k0); top.setAttribute("transform", `translate(0 ${-12 * (1 - k0)})`);
        tiles.forEach((g, i) => { const a = 0.6 + i * 0.3, k = ob(seg(t, a, a + 0.6)); g.setAttribute("opacity", seg(t, a, a + 0.2)); g.setAttribute("transform", `translate(0 ${-30 * (1 - k)})`); });
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
    const at = (now) => (sc.once ? Math.min(now + off, sc.dur) : (((now + off) % sc.dur) + sc.dur) % sc.dur);
    const frame = () => { const now = clock(); draw(held ? sc.still : at(now), now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && !(sc.once && clock() + off >= sc.dur)) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && sc.once && !fig.dataset.ran) { fig.dataset.ran = 1; off = -clock(); }
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
