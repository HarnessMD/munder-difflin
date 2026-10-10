/* Bright coded scene for "Agent Tools Today, 10 Oct 2026". Vanilla JS, no library.
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

  /* ---- the day at a glance: a ball (untrusted code) keeps bouncing under a glass cake dome, three policy labels ---- */
  const POL = [
    ["filesystem policy", "Kind 1 of 3 in the MXC README: filesystem policy", YEL, 232],
    ["network policy", "Kind 2 of 3 in the MXC README: network policy", MINT, 316],
    ["UI policy", "Kind 3 of 3 in the MXC README: UI policy", LIL, 400],
  ];
  SC.today = {
    dur: 12, still: 10,
    build(svg, api) {
      const CX = 250, FLOOR = 446, R = 24, LX = 492, LW = 264;
      txt(svg, 400, 78, "MXC SDK v1.0.0", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      txt(svg, 400, 110, "three kinds of policy, tap a label", { "text-anchor": "middle", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const tip = strip(svg, 522, 720);
      // the plate
      el("ellipse", { cx: CX, cy: FLOOR + 22, rx: 150, ry: 8, fill: SOFT }, svg);
      el("rect", { x: CX - 190, y: FLOOR, width: 380, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, CX, FLOOR + 52, "the ball: untrusted code", { "text-anchor": "middle", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const shadow = el("ellipse", { cx: CX, cy: FLOOR - 3, rx: 22, ry: 4, fill: LIL, opacity: 0.5 }, svg);
      const ball = el("g", {}, svg);
      el("circle", { r: R, fill: BLUE, stroke: INK, "stroke-width": 3 }, ball);
      el("path", { d: "M-13 -8 A16 16 0 0 1 -2 -16", fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round" }, ball);
      // the dome
      const dome = el("g", {}, svg);
      const glass = el("path", { d: `M${CX - 150} ${FLOOR} V${FLOOR - 100} A150 150 0 0 1 ${CX + 150} ${FLOOR - 100} V${FLOOR} Z`, fill: SKY, "fill-opacity": 0.22, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, dome);
      el("path", { d: `M${CX - 118} ${FLOOR - 60} V${FLOOR - 100} A118 118 0 0 1 ${CX - 70} ${FLOOR - 194}`, fill: "none", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round" }, dome);
      el("circle", { cx: CX, cy: FLOOR - 264, r: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, dome);
      let pinned = -1;
      const ps = POL.map(([name, line, col, y], i) => {
        const g = el("g", { opacity: 0 }, svg);
        el("path", { d: `M${CX + 158} ${y} H${LX - 8}`, stroke: LIL, "stroke-width": 3, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, g);
        const pill = el("g", {}, g);
        el("rect", { x: LX, y: y - 28, width: LW, height: 56, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, pill);
        el("rect", { x: LX - 5, y: y - 33, width: LW + 10, height: 66, rx: 21, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, pill);
        el("circle", { cx: LX + 30, cy: y, r: 11, fill: col, stroke: INK, "stroke-width": 3 }, pill);
        txt(pill, LX + 54, y + 8, name, { "font-size": 22, "font-weight": 600 });
        button(g, line, () => { pinned = i; api.poke(); });
        return { g, pill, col, T: 5.4 + i * 1.4 };
      });
      return (t) => {
        // ball: rolls in from the left, then keeps bouncing between the glass walls
        const inX = oc(seg(t, 0, 3)), s = Math.max(0, t - 3);
        const x = -40 + (CX + 40) * inX + (t > 3 ? 92 * Math.sin(s * 1.9) : 0);
        const ph = (t / 0.62) % 1, up = 4 * ph * (1 - ph);
        const y = FLOOR - R - 2 - 138 * up;
        const sq = 1 - 0.16 * (1 - seg(up, 0, 0.18));
        ball.setAttribute("transform", `translate(${x} ${y + R * (1 - sq)}) scale(${2 - sq} ${sq})`);
        const vis = seg(t, 0, 0.3) * (1 - seg(t, 11.5, 11.9));
        ball.setAttribute("opacity", vis);
        shadow.setAttribute("cx", x); shadow.setAttribute("rx", 22 - 10 * up);
        shadow.setAttribute("opacity", 0.5 * vis * seg(x, CX - 190, CX - 160));
        // dome: lowers over the ball, lifts away at the end of the loop
        const down = bo(seg(t, 3.2, 4.4)), away = io(seg(t, 11.1, 11.8));
        dome.setAttribute("transform", `translate(0 ${-50 * (1 - down) - 50 * away})`);
        dome.setAttribute("opacity", seg(t, 3.2, 3.6) * (1 - away));
        let last = -1;
        ps.forEach((p, i) => {
          const a = seg(t, p.T, p.T + 0.5), out = 1 - seg(t, 10.9, 11.2);
          p.g.setAttribute("opacity", a * out);
          p.pill.setAttribute("transform", `translate(${24 * (1 - ob(a))} 0)`);
          p.g.style.pointerEvents = a >= 1 && out === 1 ? "auto" : "none";
          if (a >= 1 && out === 1) last = i;
        });
        if (last < 0 && t < 5) pinned = -1;
        const show = pinned >= 0 && last >= 0 ? pinned : last;
        glass.setAttribute("fill", pinned >= 0 && last >= 0 ? POL[pinned][2] : SKY);
        glass.setAttribute("fill-opacity", pinned >= 0 && last >= 0 ? 0.32 : 0.22);
        tip.textContent = show < 0 ? "The README calls MXC a “sandboxed code execution system”" : POL[show][1];
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
