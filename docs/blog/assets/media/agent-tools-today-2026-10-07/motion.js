/* Bright coded scene for "Agent Tools Today, 7 Oct 2026". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bo = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  const SC = {};

  /* ---- the day at a glance: five plant pots land on a shelf, largest first, a plant grows in each and a paper tag swings down ---- */
  const LAUNCH = [
    [["Mistral Large 4"], "Public preview: 1 trillion parameters, per Mistral's post", YEL],
    [["EmbeddingGemma 2"], "Apache 2.0: 740 million parameters, on Google's figures", BLUE],
    [["OpenAI", "Decisions API"], "Public beta: POST /v1/decisions returns typed answers", LIL],
    [["Claude Code", "v2.1.292"], "It adds --marketplace <source> to claude plugin install", SKY],
    [["Gemini CLI", "v0.63.0"], "The notes list fixes, one for an endless sign in loop", MINT],
  ];
  const LEAF = [[[-40, 0.72], [-19, 0.93], [1, 1], [21, 0.88], [41, 0.68]], [[-34, 0.74], [-11, 1], [13, 0.92], [36, 0.7]], [[-28, 0.8], [0, 1], [28, 0.78]], [[-24, 0.85], [4, 1], [30, 0.75]], [[-22, 0.9], [22, 1]]];
  SC.today = {
    dur: 12, still: 9.5,
    build(svg, api) {
      const SY = 318, GAP = 1.5, W = [200, 150, 110, 78, 52], H = [150, 114, 84, 60, 40], CX = [140, 337, 489, 605, 692], LONG = [22, 106, 22, 106, 22];
      txt(svg, 756, 76, "Top 5 launches", { "text-anchor": "end", "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 108, "tap a pot", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const tip = strip(svg, 522, 720);
      el("rect", { x: 30, y: SY, width: 740, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      let pinned = -1;
      const ps = LAUNCH.map(([lines, line, col], i) => {
        const name = lines.join(" "), w = W[i], h = H[i], rh = Math.max(9, h * 0.17), a = w * 0.43, b = w * 0.31, r = Math.min(8, w * 0.1);
        const g = el("g", {}, svg), tag = el("g", { opacity: 0 }, g), pot = el("g", { opacity: 0 }, g), plant = el("g", {}, pot);
        // paper tag on a string, hung under the shelf
        const len = LONG[i], th = 26 + lines.length * 21;
        el("path", { d: `M0 12 V${len + 12}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, tag);
        const paper = el("path", { fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
        const dot = el("circle", { cy: len + 22, r: 4, fill: col, stroke: INK, "stroke-width": 2.5 }, tag);
        const ts = lines.map((s, k) => txt(tag, 0, len + 47 + k * 21, s, { "text-anchor": "middle", "font-size": 17, "font-weight": 600 }));
        const tw = Math.max(...ts.map((n, k) => (n.getComputedTextLength && n.getComputedTextLength()) || lines[k].length * 10)) + 28;
        const off = cl(CX[i], 34 + tw / 2, 766 - tw / 2) - CX[i], L = off - tw / 2, R = off + tw / 2, T = len + 12;
        paper.setAttribute("d", `M${L + 12} ${T} H${R - 12} L${R} ${T + 12} V${T + th} H${L} V${T + 12} Z`);
        ts.forEach((n) => n.setAttribute("x", off)); dot.setAttribute("cx", 0);
        // plant, then the pot in front of it
        const LL = h * 0.66;
        LEAF[i].forEach(([ang, k]) => { const l = LL * k, v = l * 0.17; el("path", { d: `M0 0 C${v} ${-l * 0.3} ${v} ${-l * 0.75} 0 ${-l} C${-v} ${-l * 0.75} ${-v} ${-l * 0.3} 0 0 Z`, fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", transform: `rotate(${ang})` }, plant); });
        const body = el("g", {}, pot);
        el("rect", { x: -w / 2 - 7, y: -h - 7, width: w + 14, height: h + 14, rx: 12, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, body);
        el("path", { d: `M${-a} ${-h + rh} H${a} L${b} ${-r} Q${b} 0 ${b - r} 0 H${-b + r} Q${-b} 0 ${-b} ${-r} Z`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        el("rect", { x: -w / 2, y: -h, width: w, height: rh, rx: Math.min(5, rh / 2), fill: col, stroke: INK, "stroke-width": 3 }, body);
        const fs = cl(h * 0.3, 16, 40);
        txt(body, 0, -(h - rh) / 2 + fs * 0.36, String(i + 1), { "text-anchor": "middle", "font-size": fs, "font-weight": 700 });
        button(g, `${name}: ${line}`, () => { pinned = i; api.poke(); });
        return { g, tag, pot, plant, body, h, T: 0.4 + i * GAP };
      });
      return (t, now) => {
        let last = -1;
        const gone = 1 - seg(t, 11.3, 11.9);
        ps.forEach((p, i) => {
          const s = t - p.T, x = CX[i];
          if (s < 0) { p.pot.setAttribute("opacity", 0); p.tag.setAttribute("opacity", 0); return; }
          const land = s >= 0.3 ? Math.sin(seg(s, 0.3, 0.6) * Math.PI) * 0.09 : 0;
          tf(p.pot, x, SY - 80 * (1 - bo(seg(s, 0, 0.55))));
          p.pot.setAttribute("opacity", seg(s, 0, 0.15) * gone);
          p.body.setAttribute("transform", `scale(${1 + land} ${1 - land})`);
          const grow = ob(seg(s, 0.6, 1.25));
          p.plant.setAttribute("transform", `translate(0 ${-p.h + 4}) rotate(${Math.sin(now * 1.3 + i * 1.7) * 2 * grow}) scale(${Math.max(0.001, grow)})`);
          const k = seg(s, 0.95, 1.5), sw = ob(k);
          p.tag.setAttribute("transform", `translate(${x} ${SY}) rotate(${-34 * (1 - sw) + (k >= 1 ? Math.sin(now * 1.6 + i) * 1.2 : 0)})`);
          p.tag.setAttribute("opacity", seg(s, 0.95, 1.1) * gone);
          if (s >= 0.55) last = i;
        });
        const show = pinned >= 0 ? pinned : last;
        tip.textContent = show < 0 || (pinned < 0 && gone < 1) ? "five launches, in the order of the list below" : LAUNCH[show][1];
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('600 17px "Space Grotesk"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
