/* Bright coded scenes for "LobeHub alternatives". Vanilla JS, no library.
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
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, x, y, w, h, r = 24) => el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, p);

  const SC = {};

  /* ---- 1. a LobeHub scarf moves along a coat rack ---- */
  SC.coatrack = {
    dur: 7.2, still: 7.2,
    build(svg, api) {
      const HX = [250, 400, 550], TAGS = ["Web", "Desktop", "Mobile"], P = 2.4, M = 0.9;
      const rack = el("g", {}, svg);
      ring(rack, 84, 50, 632, 502);
      el("rect", { x: 136, y: 160, width: 26, height: 324, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, rack);
      el("rect", { x: 638, y: 160, width: 26, height: 324, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, rack);
      el("rect", { x: 120, y: 148, width: 560, height: 28, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, rack);
      el("rect", { x: 100, y: 478, width: 600, height: 58, rx: 22, fill: MINT, stroke: INK, "stroke-width": 3 }, rack);
      el("rect", { x: 316, y: 488, width: 168, height: 38, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, rack);
      txt(rack, 400, 514, "Self host", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const lamps = HX.map((x, i) => {
        el("path", { d: `M${x} 140 V148`, stroke: INK, "stroke-width": 3 }, rack);
        el("path", { d: `M${x} 176 V212 Q${x} 230 ${x + 14} 230 Q${x + 26} 230 ${x + 26} 216`, stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, rack);
        el("rect", { x: x - 62, y: 66, width: 124, height: 74, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, rack);
        const halo = el("circle", { cx: x, cy: 88, r: 12, fill: YEL, opacity: 0 }, rack);
        el("circle", { cx: x, cy: 88, r: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, rack);
        const bulb = el("circle", { cx: x, cy: 88, r: 9, fill: YEL, stroke: INK, "stroke-width": 2.5, opacity: 0 }, rack);
        el("rect", { x: x - 5, y: 97, width: 10, height: 6, rx: 2, fill: INK }, rack);
        txt(rack, x, 129, TAGS[i], { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        return { halo, bulb };
      });
      const scarf = el("g", {}, rack), sw = el("g", {}, scarf);
      const back = el("g", { transform: "rotate(4)" }, sw);
      el("rect", { x: -40, y: -4, width: 38, height: 180, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, back);
      [140, 156].forEach((y) => el("rect", { x: -38.5, y, width: 35, height: 7, fill: SKY }, back));
      [-34, -26, -18, -10].forEach((x) => el("path", { d: `M${x} 176 V187`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, back));
      el("rect", { x: 0, y: -4, width: 40, height: 200, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, sw);
      [154, 170].forEach((y) => el("rect", { x: 1.5, y, width: 37, height: 7, fill: SKY }, sw));
      [8, 16, 24, 32].forEach((x) => el("path", { d: `M${x} 196 V208`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, sw));
      el("path", { d: "M-42 16 Q-42 -18 0 -18 Q42 -18 42 16 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, sw);
      el("rect", { x: -48, y: 62, width: 96, height: 34, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, sw);
      txt(sw, 0, 85, "LobeHub", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      let last = 0;
      button(rack, "Move the LobeHub scarf to the next hook", () => api.seek(((Math.floor(last / P) + 1) % 3) * P + 0.001));
      return (t) => {
        last = t;
        const n = Math.floor(t / P), i = n % 3, u = t - n * P, from = (i + 2) % 3, k = io(seg(u, 0, M));
        const dir = HX[i] > HX[from] ? 1 : -1;
        const sway = u < M ? -8 * dir * Math.sin(Math.PI * k) : 7 * dir * Math.sin((u - M) * 7) * Math.exp(-(u - M) * 2.6);
        tf(scarf, lerp(HX[from], HX[i], k) + 6, 224 - 34 * Math.sin(Math.PI * k));
        sw.setAttribute("transform", `rotate(${sway})`);
        lamps.forEach((l, j) => {
          const v = j === i ? seg(u, M - 0.15, M + 0.15) : j === from ? 1 - seg(u, 0, 0.3) : 0;
          l.bulb.setAttribute("opacity", v); l.halo.setAttribute("opacity", 0.55 * v); l.halo.setAttribute("r", 10 + 10 * ob(v));
        });
      };
    },
  };

  /* ---- 2. cookies leave an Apache 2.0 jar, the license tag swings ---- */
  const cookie = (p) => {
    const g = el("g", {}, p);
    el("circle", { r: 24, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
    [[-9, -6], [7, -10], [3, 8], [-7, 10], [11, 4]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 3, fill: INK }, g));
    return g;
  };
  SC.cookiejar = {
    dur: 9, still: 9,
    build(svg, api) {
      el("path", { d: "M588 430 L612 406 H780 L756 430 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M756 430 L780 406 V506 L756 530 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 588, y: 430, width: 168, height: 100, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 598, y: 462, width: 148, height: 38, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 672, 487, "derivative work", { "text-anchor": "middle", "font-size": 15, "font-weight": 700 });
      const D = "M260 214 H428 V236 Q464 240 464 280 V486 Q464 530 420 530 H268 Q224 530 224 486 V280 Q224 240 260 236 Z";
      const jar = el("g", {}, svg);
      ring(jar, 6, 146, 472, 404);
      el("path", { d: D, fill: SKY, "fill-opacity": 0.4 }, jar);
      [[270, 502], [322, 502], [374, 502], [426, 502], [296, 458], [348, 458], [400, 458]].forEach(([x, y]) => tf(cookie(jar), x, y));
      const A = cookie(jar), B = cookie(jar);
      const extra = Array.from({ length: 4 }, () => { const c = cookie(jar); c.setAttribute("opacity", 0); return c; });
      el("path", { d: D, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, jar);
      el("path", { d: "M244 296 V410", stroke: "#fff", "stroke-width": 9, "stroke-linecap": "round", opacity: 0.9 }, jar);
      el("rect", { x: 254, y: 448, width: 180, height: 52, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, jar);
      txt(jar, 344, 483, "Apache 2.0", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const lid = el("g", {}, jar);
      el("rect", { x: 316, y: 160, width: 56, height: 24, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, lid);
      el("rect", { x: 240, y: 178, width: 208, height: 38, rx: 12, fill: LIL, stroke: INK, "stroke-width": 3 }, lid);
      const tag = el("g", {}, jar);
      const halo = el("rect", { x: 4, y: 210, width: 214, height: 64, rx: 18, fill: YEL, opacity: 0 }, tag);
      el("path", { d: "M238 204 L196 238", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("rect", { x: 14, y: 220, width: 194, height: 44, rx: 10, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tag);
      el("circle", { cx: 196, cy: 242, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      txt(tag, 102, 247, "commercial license", { "text-anchor": "middle", "font-size": 15, "font-weight": 700 });
      el("circle", { cx: 238, cy: 204, r: 4, fill: INK }, jar);
      let taps = [], count = 0;
      button(jar, "Lift another cookie out of the jar", () => { taps.push({ at: api.now(), n: count++ }); if (taps.length > 4) taps.shift(); api.poke(); });
      return (t, now) => {
        taps = taps.filter((p) => now - p.at < 2.8);
        let tapLid = 0;
        extra.forEach((c) => c.setAttribute("opacity", 0));
        taps.forEach((p) => {
          const s = now - p.at, c = extra[p.n % 4], r = io(seg(s, 0.2, 1.1)), f = oc(seg(s, 1.1, 2.6));
          tapLid = Math.max(tapLid, oc(seg(s, 0, 0.35)) * (1 - io(seg(s, 1.6, 2.1))));
          tf(c, lerp(lerp(372, 400, r), 400 + [0, 24, 48][p.n % 3], f), lerp(414, 150, r) - 110 * f);
          c.setAttribute("opacity", s < 0.2 ? seg(s, 0, 0.2) : 1 - seg(s, 2.1, 2.7));
        });
        const lk = Math.max(tapLid, oc(seg(t, 0.5, 1.0)) * (1 - io(seg(t, 5.0, 5.6))));
        lid.setAttribute("transform", `rotate(${-50 * lk} 240 216)`);
        const fade = seg(t, 0, 0.4);
        if (t < 2) { const r = io(seg(t, 1.0, 2.0)); tf(A, lerp(320, 400, r), lerp(414, 150, r)); }
        else { const r = io(seg(t, 2.0, 2.8)); tf(A, lerp(400, 540, r), lerp(150, 84, r) + Math.sin((t - 2.8) * 2.2) * 4 * seg(t, 2.8, 3.4)); }
        if (t < 3.8) { const r = io(seg(t, 2.8, 3.8)); tf(B, lerp(372, 400, r), lerp(414, 150, r)); }
        else { const r = io(seg(t, 3.8, 5.6)); tf(B, lerp(400, 672, r), lerp(150, 360, r) - 60 * Math.sin(Math.PI * r) + Math.sin((t - 5.6) * 2.4) * 4 * seg(t, 5.6, 6.2)); }
        A.setAttribute("opacity", fade); B.setAttribute("opacity", fade);
        const s = t - 4.6, ang = s > 0 ? 10 * Math.sin(s * 6.9) * Math.exp(-s * 1.1) : 0;
        tag.setAttribute("transform", `rotate(${ang} 238 204)`);
        halo.setAttribute("opacity", 0.5 * oc(seg(t, 4.8, 5.6)) * (0.85 + 0.15 * Math.sin(t * 4)));
      };
    },
  };

  /* ---- 3. five books between mint bookends ---- */
  SC.bookends = {
    dur: 10, still: 10,
    build(svg, api) {
      const BK = [["LibreChat", 300, LIL], ["Munder Difflin", 318, BLUE], ["Open WebUI", 292, LIL], ["Cherry Studio", 312, BLUE], ["Jan", 286, LIL]];
      const ORDER = [1, 2, 3, 4, 0], P = 2, W = 86, X0 = 161, BASE = 500;
      el("path", { d: "M342 66 L400 32 L458 66", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }, svg);
      el("circle", { cx: 400, cy: 30, r: 5, fill: INK }, svg);
      el("rect", { x: 316, y: 64, width: 168, height: 56, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 102, "Pick one", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      el("rect", { x: 80, y: 500, width: 640, height: 24, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M112 500 V276 Q112 262 126 262 H136 Q150 262 150 276 V486 H176 V500 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M688 500 V276 Q688 262 674 262 H664 Q650 262 650 276 V486 H624 V500 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const books = BK.map(([name, h, col], i) => {
        const x = X0 + i * 98, cx = x + W / 2, top = BASE - h;
        const sh = el("ellipse", { cx, cy: 512, rx: 50, ry: 7, fill: LIL, opacity: 0 }, svg);
        const g = el("g", {}, svg);
        el("rect", { x: x - 5, y: top - 6, width: W + 10, height: h + 12, rx: 12, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("rect", { x, y: top, width: W, height: h, rx: 8, fill: col, stroke: INK, "stroke-width": 3 }, g);
        [top + 22, BASE - 22].forEach((y) => el("path", { d: `M${x + 2} ${y} H${x + W - 2}`, stroke: INK, "stroke-width": 2.5 }, g));
        const s = el("g", { transform: `translate(${cx} ${top + h / 2}) rotate(-90)` }, g);
        txt(s, 0, 8, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        button(g, `${name}: slide this book forward`, () => api.seek(ORDER.indexOf(i) * P + 0.001));
        return { g, sh, cx };
      });
      return (t) => {
        const n = Math.floor(t / P), j = n % 5, u = t - n * P, cur = ORDER[j], prev = ORDER[(j + 4) % 5];
        books.forEach((b, i) => {
          const f = i === cur ? oc(seg(u, 0.4, 0.9)) : i === prev ? 1 - io(seg(u, 0, 0.4)) : 0;
          b.g.setAttribute("transform", `translate(${b.cx} ${BASE + 14 * f}) scale(${1 + 0.08 * f}) translate(${-b.cx} ${-BASE})`);
          b.sh.setAttribute("opacity", 0.6 * f);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3, still: 3,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 164, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 146, 72, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 72, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 180, "LobeHub alternatives", { "font-size": 66, "font-weight": 700 });
      el("path", { d: "M66 208 H330", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 258, "5 AI workspaces like LobeHub", { "font-size": 26, "font-weight": 500, fill: MUTE });
      el("rect", { x: 390, y: 304, width: 180, height: 50, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 480, 336, "LobeHub", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const NAMES = [["LibreChat", YEL], ["Munder Difflin", BLUE], ["Open WebUI", LIL], ["Cherry Studio", SKY], ["Jan", MINT]];
      const TW = 156, G = 12, X = 480 - (5 * TW + 4 * G) / 2, C = NAMES.map((_, i) => X + i * (TW + G) + TW / 2);
      const line = { stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" };
      const lines = el("g", { opacity: 0 }, svg);
      el("path", Object.assign({ d: `M480 354 V392 M${C[0]} 392 H${C[4]}` }, line), lines);
      C.forEach((cx) => el("path", Object.assign({ d: `M${cx} 392 V430` }, line), lines));
      const tiles = NAMES.map(([name, col], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: C[i] - TW / 2, y: 430, width: TW, height: 48, rx: 12, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, C[i], 460, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        return g;
      });
      return (t) => {
        tiles.forEach((g, i) => { const k = seg(t, 0.4 + i * 0.2, 1.0 + i * 0.2); g.setAttribute("transform", `translate(0 ${48 * (1 - oc(k))})`); g.setAttribute("opacity", k); });
        lines.setAttribute("opacity", seg(t, 1.6, 2.2));
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, fin = (s) => Math.min(s, sc.dur - 0.001);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? fin(sc.still) : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(fin(isNaN(fixed) ? sc.still : fixed), 0); return; }
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
