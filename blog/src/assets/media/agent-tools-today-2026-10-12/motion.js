/* Bright coded scenes for "Agent tools today, 12 Oct 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- one doorbell, three push buttons: every way in rings the same bell ---- */
  SC.today = {
    dur: 12, still: 9.4,
    build(svg, api) {
      const BX = [150, 400, 650], BY = 404, COL = [BLUE, LIL, MINT], NAMES = ["ribbon", "command-line tool", "MCP server"], PRESS = [3.4, 5.9, 8.4];
      const chip = (s, x, y) => {
        const g = el("g", {}, svg);
        const ring = el("rect", { y: -32, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        const r = el("rect", { y: -26, height: 52, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const t = txt(g, 0, 8, s, { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
        const w = t.getComputedTextLength() + 44;
        r.setAttribute("x", -w / 2); r.setAttribute("width", w); ring.setAttribute("x", -w / 2 - 6); ring.setAttribute("width", w + 12);
        return { g, r, x, y };
      };
      /* faint guide from the top label to the bell */
      const guide = el("path", { d: "M400 94 V112", stroke: LIL, "stroke-width": 2, "stroke-linecap": "round", opacity: 0 }, svg);
      /* wires */
      const WIRE = ["M150 356 V342 Q150 326 166 326 H384 Q400 326 400 310 V300", "M400 356 V300", "M650 356 V342 Q650 326 634 326 H416 Q400 326 400 310 V300"];
      const wires = WIRE.map((d) => { const n = el("path", { d, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg); return { n, len: n.getTotalLength() }; });
      /* the bell on its plate */
      el("rect", { x: 300, y: 112, width: 200, height: 188, rx: 30, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const arcs = [-1, 1].map((s) => [0, 1].map((k) => el("path", { d: `M${400 + s * (122 + k * 24)} ${178 - k * 14} Q${400 + s * (140 + k * 28)} 206 ${400 + s * (122 + k * 24)} ${234 + k * 14}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", opacity: 0 }, svg)));
      const clap = el("g", {}, svg);
      el("path", { d: "M0 96 V128", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, clap);
      el("circle", { cy: 130, r: 11, fill: INK }, clap);
      const bell = el("g", {}, svg);
      el("path", { d: "M0 6 C-16 6 -22 16 -24 30 C-30 56 -34 84 -60 104 H60 C34 84 30 56 24 30 C22 16 16 6 0 6 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bell);
      el("rect", { x: -68, y: 100, width: 136, height: 16, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, bell);
      el("circle", { r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, bell);
      /* travelling pulses, one per wire */
      const dots = COL.map((c) => el("circle", { r: 9, fill: c, stroke: INK, "stroke-width": 3, opacity: 0 }, svg));
      /* buttons with their labels */
      let sel = -1, t0 = -99;
      const btns = BX.map((x, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: x - 48, y: BY - 48, width: 96, height: 96, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: x, cy: BY + 7, r: 30, fill: INK }, g);
        const cap = el("circle", { cx: x, cy: BY, r: 30, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        const c = chip(NAMES[i], x, 500); g.appendChild(c.g);
        button(g, NAMES[i], () => { sel = i; t0 = api.now(); api.poke(); });
        return { cap, c };
      });
      const top = chip("422 commands", 400, 66);
      return (t, now) => {
        const out = 1 - seg(t, 11.4, 11.9);
        /* seconds since each button was last pressed, by the loop or by a tap */
        const E = PRESS.map((p, i) => { const a = t - p, b = sel === i ? now - t0 : -1; return a >= 0 && a < 2.4 ? (b >= 0 && b < a ? b : a) : b >= 0 && b < 2.4 ? b : -1; });
        let ring = -1;
        E.forEach((e, i) => {
          const down = e < 0 ? 0 : seg(e, 0, 0.12) * (1 - seg(e, 1.1, 1.35)), hot = e >= 0;
          btns[i].cap.setAttribute("cy", BY + 7 * down);
          const k = seg(t, 0.5 + i * 0.6, 0.9 + i * 0.6);
          tf(btns[i].c.g, btns[i].c.x, btns[i].c.y, (0.6 + 0.4 * ob(k)) * (hot ? 1.05 : 1));
          btns[i].c.g.setAttribute("opacity", k <= 0 ? 0 : out);
          btns[i].c.r.setAttribute("fill", hot ? YEL : "#fff");
          const p = e < 0 ? 0 : seg(e, 0.2, 0.7), pt = wires[i].n.getPointAtLength(wires[i].len * io(p));
          dots[i].setAttribute("cx", pt.x); dots[i].setAttribute("cy", pt.y);
          dots[i].setAttribute("opacity", p > 0 && p < 1 ? 1 : 0);
          if (e >= 0.7 && (ring < 0 || e - 0.7 < ring)) ring = e - 0.7;
        });
        const amp = ring < 0 ? 0 : Math.exp(-1.6 * ring) * (1 - seg(ring, 1.4, 1.7)), sw = Math.sin(ring * 16) * amp;
        bell.setAttribute("transform", `translate(400 134) rotate(${11 * sw})`);
        clap.setAttribute("transform", `translate(400 134) rotate(${-17 * sw})`);
        arcs.forEach((pair) => pair.forEach((a, k) => a.setAttribute("opacity", ring < 0 ? 0 : seg(ring, k * 0.12, 0.1 + k * 0.12) * (1 - seg(ring, 1.1, 1.6)))));
        const k = seg(t, 2.3, 2.7);
        tf(top.g, top.x, top.y, 0.6 + 0.4 * ob(k));
        top.g.setAttribute("opacity", k <= 0 ? 0 : out);
        top.r.setAttribute("fill", ring >= 0 && ring < 1.4 ? YEL : "#fff");
        guide.setAttribute("opacity", k * out);
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
