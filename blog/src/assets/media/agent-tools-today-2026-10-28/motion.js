/* Bright coded scene for "Agent Tools Today, 28 Oct 2026". Vanilla JS, no library.
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
  /* each loop opens on the final frame and eases back to the start in R0 seconds, so the loop has no jump */
  const R0 = 0.6;
  const pv = (t, a, b, e = oc) => (t < R0 ? 1 - io(t / R0) : e(seg(t, a, b)));
  const hint = (svg, s) => txt(svg, 756, 52, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  const hitbox = (g, a) => el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a), g);
  const ring = (g, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, a), g);
  /* a tap toggles one thing between 0 and 1; under reduced motion it jumps */
  const flipper = (api, D = 0.6) => {
    let m = null, last = 0;
    return {
      v(auto, now) { last = m ? m.f + (m.to - m.f) * io(seg(now, m.at, m.at + (calm ? 1e-3 : D))) : auto; return last; },
      flip() { m = { f: last, to: last > 0.5 ? 0 : 1, at: api.now() }; api.nudge(); },
    };
  };
  let uid = 0;

  const SC = {};

  /* ---- a three drawer cabinet, seen from the side; each drawer opens on a card and its tag ---- */
  SC.today = {
    dur: 7.4, still: 7.4,
    build(svg, api) {
      hint(svg, "tap a drawer");
      const CX = 60, CW = 320, TOP = 84, ROW = 150, EXT = 306, defs = el("defs", {}, svg);
      el("path", { d: "M40 562 H760", stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      el("rect", { x: CX + 24, y: 546, width: 34, height: 14, rx: 4, fill: INK }, svg);
      el("rect", { x: CX + CW - 58, y: 546, width: 34, height: 14, rx: 4, fill: INK }, svg);
      el("rect", { x: CX, y: TOP - 8, width: CW, height: 3 * ROW + 20, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: CX - 12, y: TOP - 20, width: CW + 24, height: 18, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const items = [["OpenCode 2.2.0", "Desktop plugins", LIL], ["Entire", "Trails", MINT], ["Hallmark", "Design skill", SKY]];
      const rows = items.map(([name, tag, col], i) => {
        const y0 = TOP + 6 + i * ROW, id = `mgclip${++uid}`;
        el("rect", { x: CX + 18, y: y0 + 6, width: CW - 36, height: 126, rx: 9, fill: "none", stroke: INK, "stroke-width": 2 }, svg);
        el("rect", { x: CX + CW + 1, y: 0, width: 800, height: y0 + 138 }, el("clipPath", { id }, defs));
        const g = el("g", {}, svg);
        hitbox(g, { x: CX, y: y0 - 4, width: CW + EXT + 54, height: 146 });
        ring(g, { x: CX - 8, y: y0 - 8, width: CW + EXT + 64, height: 154, rx: 14 });
        const body = el("g", {}, el("g", { "clip-path": `url(#${id})` }, g)), card = el("g", {}, body);
        el("rect", { x: CX + 30, y: y0 + 6, width: 270, height: 120, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
        txt(card, CX + 48, y0 + 42, name, { "font-family": MONO, "font-size": 24, "font-weight": 700 });
        const chip = el("rect", { x: CX + 48, y: y0 + 52, height: 28, rx: 14, fill: col, stroke: INK, "stroke-width": 2 }, card);
        const ct = txt(card, 0, y0 + 71.5, tag, { "text-anchor": "middle", "font-size": 16 });
        const w = ct.getComputedTextLength() + 30; chip.setAttribute("width", w); ct.setAttribute("x", CX + 48 + w / 2);
        el("rect", { x: CX + 14, y: y0 + 88, width: CW - 16, height: 50, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, body);
        const front = el("g", {}, g);
        el("rect", { x: CX + CW - 4, y: y0, width: 20, height: 138, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, front);
        el("rect", { x: CX + CW + 16, y: y0 + 54, width: 14, height: 30, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, front);
        const f = flipper(api, 0.8);
        button(g, `Drawer: ${name}, ${tag}`, () => f.flip());
        return { body, card, front, f, a: 1.0 + i * 1.7 };
      });
      return (t, now) => rows.forEach((r) => {
        const o = r.f.v(pv(t, r.a, r.a + 1.0, ob), now), k = ob(cl((o - 0.5) / 0.5));
        tf(r.body, EXT * o, 0); tf(r.front, EXT * o, 0); tf(r.card, 0, 90 * (1 - cl(k, 0, 1.1)));
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
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, nudge: () => { if (held) frame(); else tick(); } };
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
