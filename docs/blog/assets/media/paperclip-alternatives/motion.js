/* Bright coded scenes for "Paperclip alternatives". Vanilla JS, no library.
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
  const LINE = { stroke: INK, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" };
  const ring = (p, x, y, width, height, rx = 18) => el("rect", { x, y, width, height, rx, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, p);

  /* a paperclip of length L around 0,0: an ink wire with a soft or sky core */
  const clipD = (L) => { const H = L / 2; return `M-10 ${-H + 40} V${H - 44} A10 10 0 0 0 10 ${H - 44} V${-H + 18} A18 18 0 0 0 -26 ${-H + 18} V${H - 26} A26 26 0 0 0 26 ${H - 26} V${-H + 30}`; };
  const clip = (p, L, fill) => { const d = clipD(L); el("path", Object.assign({ d, "stroke-width": 9 }, LINE), p); el("path", Object.assign({ d, "stroke-width": 4.5 }, LINE, { stroke: fill }), p); };
  const tag = (p, x, y, w, label, fill) => {
    el("rect", { x: x - w / 2, y, width: w, height: 52, rx: 12, fill, stroke: INK, "stroke-width": 2.5 }, p);
    el("circle", { cx: x, cy: y + 10, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, p);
    txt(p, x, y + 41, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
  };

  const SC = {};

  /* ---- 1. paperclips hook into a small org chart ---- */
  SC.paperclips = {
    dur: 7, still: 7,
    build(svg, api) {
      const top = el("g", {}, svg);
      clip(top, 170, SKY);
      el("path", Object.assign({ d: "M30 -62 Q78 -78 110 -38", "stroke-width": 2.5 }, LINE), top);
      tag(top, 110, -44, 112, "Goal", YEL);
      const bar = el("g", {}, svg);
      clip(bar, 500, SOFT);
      const hit = [-99, -99, -99], amp = [18, 10, -18];
      const lows = [["CEO", LIL, 220], ["CTO", MINT, 400], ["Engineer", BLUE, 580]].map(([s, col, x], i) => {
        const g = el("g", {}, svg);
        ring(g, x - 80, 222, 160, 240, 20);
        const sw = el("g", {}, g), c = el("g", { transform: "translate(0 75)" }, sw);
        clip(c, 150, SKY);
        el("path", Object.assign({ d: "M0 146 V172", "stroke-width": 2.5 }, LINE), sw);
        tag(sw, 0, 168, 136, s, col);
        button(g, `${s}: unhook the clip`, () => { hit[i] = api.now(); api.poke(); });
        return { sw, x };
      });
      const card = el("g", {}, svg);
      el("rect", { x: 196, y: 490, width: 408, height: 60, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, card);
      txt(card, 400, 529, "Org charts and budgets", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      return (t, now) => {
        const k0 = ob(seg(t, 0.2, 0.9));
        tf(top, 400, 140 - 240 * (1 - k0)); top.setAttribute("opacity", seg(t, 0.2, 0.35));
        const k1 = ob(seg(t, 0.9, 1.5));
        tf(bar, 400, 228 - 260 * (1 - k1), 1, 90); bar.setAttribute("opacity", seg(t, 0.9, 1.05));
        lows.forEach((c, i) => {
          const a = 1.6 + i * 0.45, k = oc(seg(t, a, a + 0.4)), u = t - a - 0.4, s = now - hit[i];
          let rot = u > 0 && u < 3 ? amp[i] * 0.6 * Math.exp(-2.4 * u) * Math.sin(8 * u) : 0, dy = -140 * (1 - k), op = seg(t, a, a + 0.12);
          if (s >= 0 && s < 3.4) {
            const q = oc(seg(s, 0, 0.35)), back = io(seg(s, 0.45, 0.85)), w = s - 0.85;
            dy = 38 * q * (1 - back); op = 1;
            rot = s < 0.85 ? amp[i] * q : amp[i] * Math.exp(-2.2 * w) * Math.cos(7 * w);
          }
          tf(c.sw, c.x, 232 + dy, 1, rot); c.sw.setAttribute("opacity", op);
        });
        const kc = oc(seg(t, 3.4, 4)); card.setAttribute("opacity", kc); card.setAttribute("transform", `translate(0 ${18 * (1 - kc)})`);
      };
    },
  };

  /* ---- 2. a crayon box gains a fifth crayon ---- */
  const crayon = (p, cy, fill, label) => {
    const g = el("g", {}, p);
    el("path", { d: `M560 ${cy - 20} L592 ${cy - 11} L612 ${cy - 4} Q618 ${cy} 612 ${cy + 4} L592 ${cy + 11} L560 ${cy + 20} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("rect", { x: 186, y: cy - 20, width: 376, height: 40, rx: 8, fill, stroke: INK, "stroke-width": 2.5 }, g);
    el("rect", { x: 250, y: cy - 20, width: 250, height: 40, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
    el("path", Object.assign({ d: `M222 ${cy - 20} V${cy + 20} M528 ${cy - 20} V${cy + 20}`, "stroke-width": 2 }, LINE), g);
    txt(g, 375, cy + 7, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
    return g;
  };
  SC.crayons = {
    dur: 7, still: 7,
    build(svg, api) {
      const box = el("g", {}, svg);
      ring(box, 126, 32, 548, 530, 26);
      el("rect", { x: 140, y: 46, width: 520, height: 100, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      txt(box, 400, 108, "Paperclip Runner", { "text-anchor": "middle", "font-family": MONO, "font-size": 34, "font-weight": 700 });
      el("rect", { x: 140, y: 158, width: 520, height: 390, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, box);
      [220, 580].forEach((x) => el("rect", { x: x - 22, y: 141, width: 44, height: 20, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, box));
      for (let i = 0; i < 5; i++) el("rect", { x: 166, y: 185 + i * 64, width: 468, height: 54, rx: 14, fill: SOFT }, box);
      txt(box, 400, 526, "v2026.1106.0", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700, fill: MUTE });
      const four = [["Claude", BLUE], ["Codex", MINT], ["OpenCode", LIL], ["Pi", YEL]].map(([s, c], i) => crayon(box, 212 + i * 64, c, s));
      const sky = crayon(box, 468, SKY, "GitHub Copilot");
      let hit = -99;
      button(box, "Paperclip Runner box: lift the GitHub Copilot crayon out and slide it in again", () => { hit = api.now(); api.poke(); });
      return (t, now) => {
        const kb = ob(seg(t, 0, 0.6));
        box.setAttribute("opacity", seg(t, 0, 0.2)); box.setAttribute("transform", `translate(400 300) scale(${0.92 + 0.08 * kb}) translate(-400 -300)`);
        four.forEach((g, i) => { const a = 0.5 + i * 0.22, k = ob(seg(t, a, a + 0.4)); g.setAttribute("opacity", seg(t, a, a + 0.1)); g.setAttribute("transform", `translate(0 ${-26 * (1 - k)})`); });
        const s = now - hit, on = s >= 0 && s < 1.7;
        let x = 470 * (1 - oc(seg(t, 2.2, 3.2))), y = 0;
        if (on) { x = s < 0.65 ? 470 * io(seg(s, 0, 0.5)) : 470 * (1 - oc(seg(s, 0.65, 1.6))); y = -18 * Math.sin(Math.PI * seg(s, 0, 0.5)); }
        sky.setAttribute("opacity", on || t >= 2.2 ? 1 : 0);
        sky.setAttribute("transform", `translate(${x} ${y})`);
      };
    },
  };

  /* ---- 3. three coin stacks rise beside the price cards ---- */
  const coin = (p) => {
    const g = el("g", {}, p);
    el("path", { d: "M-72 0 V16 A72 20 0 0 0 72 16 V0 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("ellipse", { rx: 72, ry: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
    el("ellipse", { rx: 50, ry: 12, fill: "none", stroke: SKY, "stroke-width": 3 }, g);
    return g;
  };
  SC.coins = {
    dur: 7.5, still: 7.5,
    build(svg, api) {
      const hit = [-99, -99, -99], root = el("g", { transform: "translate(0 -76)" }, svg);
      const stacks = [[160, 2, "Free", "$0", YEL], [400, 5, "Starter", "$20 a month", MINT], [640, 9, "Pro", "$40 a month", LIL]].map(([x, n, a, b, col], i) => {
        const g = el("g", {}, root);
        ring(g, x - 96, 196, 192, 236, 22);
        const coins = Array.from({ length: n }, (_, j) => ({ n: coin(g), y: 384 - j * 16 }));
        const card = el("g", {}, root);
        el("rect", { x: x - 100, y: 446, width: 200, height: 92, rx: 18, fill: col, stroke: INK, "stroke-width": 2.5 }, card);
        txt(card, x, 484, a, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        txt(card, x, 520, b, { "text-anchor": "middle", "font-size": 22, "font-weight": 500 });
        button(g, `${a} ${b}: drop the coins and stack them again`, () => { hit[i] = api.now(); api.poke(); });
        return { coins, card, x, a: 0.4 + i * 1.3 };
      });
      const note = el("g", {}, root);
      el("rect", { x: 75, y: 274, width: 170, height: 76, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, note);
      txt(note, 160, 306, "Unlimited", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(note, 160, 334, "local agents", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      return (t, now) => {
        let freeTop = 0;
        stacks.forEach((st, i) => {
          const s = now - hit[i], on = s >= 0 && s < 2.6;
          st.coins.forEach((c, j) => {
            const a = st.a + j * 0.12, k = ob(seg(t, a, a + 0.3));
            let x = 0, y = c.y + 30 * (1 - k), op = seg(t, a, a + 0.08);
            if (on) {
              const px = (j % 2 ? 1 : -1) * (10 + 9 * j), py = 384 - (j % 3) * 5;
              const d = io(seg(s, j * 0.02, 0.35 + j * 0.02)), r = ob(seg(s, 0.8 + j * 0.12, 1.1 + j * 0.12)), m = d * (1 - r);
              x = px * m; y = c.y + (py - c.y) * m; op = 1;
            }
            tf(c.n, st.x + x, y); c.n.setAttribute("opacity", op);
            if (i === 0 && j === st.coins.length - 1) freeTop = y - c.y;
          });
          const kc = oc(seg(t, st.a - 0.2, st.a + 0.3));
          st.card.setAttribute("opacity", kc); st.card.setAttribute("transform", `translate(0 ${16 * (1 - kc)})`);
        });
        const kn = ob(seg(t, 1.05, 1.45));
        note.setAttribute("opacity", seg(t, 1.05, 1.15));
        note.setAttribute("transform", `translate(0 ${freeTop}) translate(160 350) scale(${0.6 + 0.4 * kn}) translate(-160 -350)`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      el("rect", { x: 56, y: 60, width: 172, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 142, 88, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      txt(svg, 56, 200, "Paperclip", { "font-size": 66, "font-weight": 700 });
      txt(svg, 56, 276, "alternatives", { "font-size": 66, "font-weight": 700 });
      el("path", { d: "M58 304 H392", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 56, 360, "6 tools for running a team of AI agents", { "font-size": 22, "font-weight": 500, fill: MUTE });
      txt(svg, 56, 470, "Checked 9 Nov 2026", { "font-size": 20, "font-weight": 600, fill: MUTE });
      const pc = el("g", {}, svg);
      el("rect", { x: 623, y: 70, width: 200, height: 56, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, pc);
      txt(pc, 723, 105, "Paperclip", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE });
      const tiles = [["AionUi", SKY], ["Munder Difflin", YEL], ["LobeHub", MINT], ["Orchestrator.inc", LIL], ["Omnigent", BLUE], ["Herdr", SKY]].map(([s, col], i) => {
        const g = el("g", {}, svg), cx = i % 2 ? 826 : 620, y = 168 + Math.floor(i / 2) * 84;
        el("rect", { x: cx - 95, y, width: 190, height: 60, rx: 14, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, cx, y + 37, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return g;
      });
      return (t) => {
        const kp = ob(seg(t, 0.1, 0.5));
        pc.setAttribute("opacity", seg(t, 0.1, 0.2)); pc.setAttribute("transform", `translate(723 98) scale(${0.8 + 0.2 * kp}) translate(-723 -98)`);
        tiles.forEach((g, i) => { const a = 0.45 + i * 0.22, k = ob(seg(t, a, a + 0.45)); g.setAttribute("opacity", seg(t, a, a + 0.12)); g.setAttribute("transform", `translate(0 ${-30 * (1 - k)})`); });
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
