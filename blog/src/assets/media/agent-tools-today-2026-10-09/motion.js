/* Bright coded scene for "Agent Tools Today, 9 Oct 2026". Vanilla JS, no library.
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

  /* ---- the day at a glance: a blue pocket knife unfolds four tools, one per job Google gives the Gemini agent ---- */
  const JOBS = [
    ["answers questions", "Job 1 of 4: it answers questions", 268, 0, -150, 130, 264],
    ["knowledge work", "Job 2 of 4: it handles knowledge work", 268, 0, -85, 286, 168],
    ["images and media", "Job 3 of 4: it creates images and media", 532, 180, 265, 514, 168],
    ["writes and runs code", "Job 4 of 4: it writes and runs code", 532, 180, 330, 658, 264],
  ];
  const TOOL = [
    (g) => { // magnifying glass
      el("rect", { x: 0, y: -6, width: 140, height: 12, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
      el("circle", { cx: 164, cy: 0, r: 26, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
      el("path", { d: "M150 -8 A16 16 0 0 1 164 -15", fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round" }, g);
    },
    (g) => { // pen
      el("rect", { x: 0, y: -9, width: 150, height: 18, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
      el("path", { d: "M150 -9 L190 0 L150 9 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      el("path", { d: "M168 0 H190", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
      el("path", { d: "M128 -9 V9", stroke: INK, "stroke-width": 3 }, g);
    },
    (g) => { // paintbrush
      el("rect", { x: 0, y: -7, width: 122, height: 14, rx: 6, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
      el("path", { d: "M144 -11 C160 -18 178 -10 190 0 C178 10 160 18 144 11 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      el("rect", { x: 120, y: -11, width: 26, height: 22, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
    },
    (g) => { // screwdriver
      el("path", { d: "M92 -4 H164 L178 -9 H190 V9 H178 L164 4 H92 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      el("rect", { x: 0, y: -11, width: 96, height: 22, rx: 9, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
      [28, 48, 68].forEach((x) => el("path", { d: `M${x} -5 V5`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g));
    },
  ];
  SC.today = {
    dur: 12, still: 9.5,
    build(svg, api) {
      const PY = 410, GAP = 1.6, K = 1.15;
      txt(svg, 400, 78, "Gemini agent", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      txt(svg, 400, 110, "four jobs, tap a tool", { "text-anchor": "middle", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const tip = strip(svg, 522, 720);
      el("ellipse", { cx: 400, cy: 478, rx: 220, ry: 10, fill: SOFT }, svg);
      const tools = el("g", {}, svg), front = el("g", { transform: `translate(400 ${PY}) scale(${K}) translate(-400 -400)` }, svg);
      // the knife body, drawn over the folded tools
      el("circle", { cx: 572, cy: 400, r: 16, fill: "none", stroke: INK, "stroke-width": 3 }, front);
      el("rect", { x: 245, y: 362, width: 310, height: 76, rx: 38, fill: BLUE, stroke: INK, "stroke-width": 3 }, front);
      el("rect", { x: 352, y: 388, width: 96, height: 24, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, front);
      [285, 515].forEach((x) => el("circle", { cx: x, cy: 400, r: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, front));
      let pinned = -1;
      const ps = JOBS.map(([name, line, px, a0, a1, lx, ly], i) => {
        const g = el("g", {}, tools);
        const arm = el("g", {}, g); TOOL[i](arm);
        const lab = el("g", { opacity: 0 }, g);
        const w = name.length * 10.6 + 30;
        el("rect", { x: lx - w / 2, y: ly - 27, width: w, height: 40, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2, class: "mg-ring" }, lab);
        txt(lab, lx, ly, name, { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
        button(g, line, () => { pinned = i; api.poke(); });
        return { g, arm, lab, px, a0, a1, T: 1 + i * GAP };
      });
      return (t) => {
        let last = -1;
        const back = io(seg(t, 11.2, 11.9));
        ps.forEach((p, i) => {
          const s = t - p.T, open = s < 0 ? 0 : ob(seg(s, 0, 0.9)) * (1 - back);
          const nudge = pinned === i && s >= 0.9 && back === 0 ? (i < 2 ? -6 : 6) : 0;
          p.arm.setAttribute("transform", `translate(${p.px} ${PY}) rotate(${p.a0 + (p.a1 - p.a0) * open + nudge}) scale(${K})`);
          p.arm.setAttribute("opacity", s < 0 || back >= 1 ? 0 : 1);
          p.lab.setAttribute("opacity", seg(s, 0.7, 1.2) * (1 - seg(t, 11.0, 11.3)));
          p.g.style.pointerEvents = s >= 0.9 && back === 0 ? "auto" : "none";
          if (s >= 0.9) last = i;
        });
        const show = pinned >= 0 ? pinned : last;
        tip.textContent = show < 0 || (pinned < 0 && back > 0) ? "Google Cloud calls it a “single, universal agent for work”" : JOBS[show][1];
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('600 18px "Space Grotesk"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
