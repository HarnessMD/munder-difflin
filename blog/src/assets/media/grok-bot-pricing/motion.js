/* Bright coded scenes for "Grok Bot pricing". Vanilla JS, no library.
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
  let uid = 0; const nid = (p) => `mg-${p}-${++uid}`;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- 1. a yellow till prints the plan receipt, one line at a time ---- */
  SC.till = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const SLOT = 400, PX = 180, PW = 440, L = PX + 24, R = PX + PW - 58, TOOTH = 8;
      const all = el("g", {}, svg);
      const cid = nid("slot");
      el("rect", { x: 0, y: 0, width: 800, height: SLOT }, el("clipPath", { id: cid }, el("defs", {}, svg)));
      const shade = el("rect", { x: PX + 8, width: PW, rx: 6, fill: SOFT }, all);
      const paper = el("path", { fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, all);
      const edge = (top) => { let d = `M${PX} ${SLOT} V${top + TOOTH}`; for (let i = 1; i <= 22; i++) d += ` L${PX + (i * PW) / 22} ${top + (i % 2 ? 0 : TOOTH)}`; return `${d} V${SLOT} Z`; };
      const ink = el("g", {}, el("g", { "clip-path": `url(#${cid})` }, all));
      const dots = (y) => el("path", { d: `M${PX + 24} ${y} H${PX + PW - 24}`, stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "0.5 9", "stroke-linecap": "round" }, ink);
      txt(ink, 400, 58, "Grok Bot plans, 16 Nov 2026", { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
      dots(84);
      const rows = [["Premium", "$30 / month", 130], ["Super", "$100 / month", 178], ["Ultra", "$200 / month", 226], ["Teams and Enterprise:", "included", 300]];
      const ticks = rows.map(([a, b, y]) => {
        txt(ink, L, y, a, { "font-family": MONO, "font-size": 19, "font-weight": 500 });
        txt(ink, R, y, b, { "text-anchor": "end", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        const g = el("g", { opacity: 0 }, ink), d = "M-9 0 L-3 7 L10 -8";
        el("path", { d, stroke: INK, "stroke-width": 10, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        el("path", { d, stroke: MINT, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return { g, x: R + 30, y: y - 7 };
      });
      dots(258);

      const till = el("g", {}, all);
      el("rect", { x: 56, y: SLOT - 16, width: 688, height: 194, rx: 26, fill: "#fff", "fill-opacity": 0 }, till);
      el("rect", { x: 56, y: SLOT - 16, width: 688, height: 194, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, till);
      el("rect", { x: 90, y: SLOT, width: 620, height: 120, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, till);
      el("rect", { x: 70, y: SLOT + 118, width: 660, height: 44, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, till);
      el("rect", { x: 360, y: SLOT + 134, width: 80, height: 12, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, till);
      const fills = ["#fff", SKY, "#fff", LIL, "#fff", MINT, "#fff", BLUE];
      const keys = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) keys.push(el("circle", { cx: 140 + c * 36, cy: SLOT + 28 + r * 30, r: 11, fill: fills[(r * 3 + c) % 8], stroke: INK, "stroke-width": 2 }, till));
      [SKY, LIL, MINT].forEach((f, r) => el("rect", { x: 470, y: SLOT + 18 + r * 30, width: 190, height: 20, rx: 10, fill: f, stroke: INK, "stroke-width": 2 }, till));
      el("path", { d: `M170 ${SLOT} H630`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, till);
      button(till, "Print the receipt again", () => api.seek(0));

      const feeds = [[0.3, 1.2, 0, 96], [1.6, 2.3, 96, 146], [2.9, 3.6, 146, 194], [4.2, 4.9, 194, 242], [5.5, 6.6, 242, 352]];
      const press = [3, 10, 13, 20, 6];
      return (t) => {
        let len = 0, on = -1;
        feeds.forEach(([a, b, from, to], i) => { if (t >= a) { len = from + (to - from) * io(seg(t, a, b)); if (t < b) on = i; } });
        const top = SLOT - len;
        paper.setAttribute("d", edge(top)); paper.setAttribute("opacity", len > 1 ? 1 : 0);
        shade.setAttribute("y", top + 14); shade.setAttribute("height", Math.max(0, len - 14));
        ink.setAttribute("transform", `translate(0 ${top})`);
        ticks.forEach((k, i) => { const a = feeds[i + 1][1], p = Math.max(0, ob(seg(t, a, a + 0.4))); tf(k.g, k.x, k.y, p); k.g.setAttribute("opacity", t > a ? 1 : 0); });
        keys.forEach((k, i) => k.setAttribute("transform", on >= 0 && press[on] === i ? "translate(0 3)" : ""));
        all.setAttribute("transform", on >= 0 ? `translate(0 ${Math.sin(t * 70) * 1.2})` : "");
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4.5, still: 4.5,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 118, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 123, 72, "Pricing", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 72, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      const title = txt(svg, 64, 180, "", { "font-size": 74, "font-weight": 700 });
      el("tspan", { "font-family": MONO, "word-spacing": -22 }, title).textContent = "Grok Bot";
      el("tspan", {}, title).textContent = " pricing";
      el("path", { d: "M66 208 H250", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 258, "What each plan costs in Nov 2026", { "font-size": 26, "font-weight": 500, fill: MUTE });
      el("path", { d: "M40 312 H920", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const tags = [["Premium $30", SKY, 190], ["Super $100", LIL, 480], ["Ultra $200", MINT, 770]].map(([s, c, x], i) => {
        const g = el("g", {}, svg);
        el("path", { d: "M-112 58 L-88 30 H88 L112 58 V122 Q112 134 100 134 H-100 Q-112 134 -112 122 Z", fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cy: 46, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M0 0 V40", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
        el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, 0, 102, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
        return { g, x, a: 0.3 + i * 0.75 };
      });
      txt(svg, 480, 492, "a month, x.ai, 16 Nov 2026", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 500, fill: MUTE });
      return (t) => tags.forEach((g) => {
        const u = seg(t, g.a, g.a + 0.8), s = t - g.a - 0.8, x = 1110 + (g.x - 1110) * oc(u);
        const rot = s < 0 ? -12 * Math.pow(1 - u, 2) * (u > 0 ? 1 : 0) : 10 * Math.exp(-2.6 * s) * Math.sin(9 * s) * (1 - seg(s, 1.4, 2));
        tf(g.g, x, 312, 1, rot);
      });
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
