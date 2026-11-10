/* Bright coded scenes for "Agent Tools Today, 10 Nov 2026". Vanilla JS, no library.
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
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const SC = {};

  /* ---- a jukebox lifts the day's three lead records onto its turntable ---- */
  SC.jukebox = {
    dur: 10, still: 8.8,
    build(svg, api) {
      const NAMES = ["Fable 5.2", "Nerfed?", "Agents tab"], COLS = [BLUE, LIL, MINT];
      const TX = 400, TY = 222, SY = 476, SLOT = [225, 400, 575], SS = 0.62, R = 132;
      const BODY = "M100 572 V200 A300 178 0 0 1 700 200 V572 Q700 584 688 584 H112 Q100 584 100 572 Z";
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      // the floor, the cabinet, its lamps and two bubble tubes
      el("ellipse", { cx: 400, cy: 588, rx: 330, ry: 10, fill: SOFT }, svg);
      el("path", { d: BODY, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      [[368, SKY], [400, MINT], [432, LIL]].forEach(([x, c]) => el("circle", { cx: x, cy: 43, r: 8, fill: c, stroke: INK, "stroke-width": 2.5 }, svg));
      const bubbles = [];
      [112, 672].forEach((x, side) => {
        el("rect", { x, y: 214, width: 16, height: 350, rx: 8, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
        for (let j = 0; j < 3; j++) bubbles.push([el("circle", { cx: x + 8, cy: 556, r: 4, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, svg), j * 111 + side * 55]);
      });
      // the glass window with the turntable
      el("path", { d: "M140 372 V215 A260 152 0 0 1 660 215 V372 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("circle", { cx: TX, cy: TY, r: 142, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: TX, cy: TY, r: 112, fill: "none", stroke: "#fff", "stroke-width": 4 }, svg);
      el("circle", { cx: TX, cy: TY, r: 18, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      el("circle", { cx: TX, cy: TY, r: 5, fill: INK }, svg);
      // the rack, one slot per record
      el("rect", { x: 136, y: 386, width: 528, height: 180, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      SLOT.forEach((x) => el("circle", { cx: x, cy: SY, r: R * SS, fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 8" }, svg));
      // the records, drawn at turntable size and shrunk into the rack
      const layer = el("g", {}, svg);
      const recs = NAMES.map((name, i) => {
        const g = el("g", {}, layer), disc = el("g", {}, g);
        el("circle", { r: R, fill: COLS[i], stroke: INK, "stroke-width": 3 }, disc);
        [116, 100].forEach((r) => el("circle", { r, fill: "none", stroke: "#fff", "stroke-width": 2.5 }, disc));
        el("path", { d: "M-66 -86 A108 108 0 0 1 20 -106", fill: "none", stroke: "#fff", "stroke-width": 9, "stroke-linecap": "round" }, disc);
        el("circle", { r: 74, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, disc);
        const label = txt(disc, 0, 8, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        const date = el("g", { opacity: 0 }, disc);
        el("rect", { x: -42, y: 15, width: 84, height: 28, rx: 14, fill: YEL, stroke: INK, "stroke-width": 2 }, date);
        txt(date, 0, 35, "10 Nov", { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return { g, disc, label, date };
      });
      // the timeline: each record lifts, lands with a turn, and goes back; the last one shows its date
      const L = [[0.4, 1.3, 2.6, 3.3], [3.3, 4.2, 5.5, 6.2], [6.2, 7.1, 9.2, 9.9]];
      const timeline = (t) => ({
        p: L.map(([a, b, c, d]) => io(seg(t, a, b)) - io(seg(t, c, d))),
        rot: L.map(([, b]) => 360 * oc(seg(t, b - 0.15, b + 0.75))),
        d: [0, 0, seg(t, 7.9, 8.3) - seg(t, 9, 9.25)],
      });
      let user = null, last = timeline(0);
      const tapped = (now) => {
        const s = calm ? 99 : now - user.t0, { from: f, n, w, end } = user;
        return {
          p: f.p.map((p, i) => (i === n ? p + (1 - p) * io(seg(s, w, w + 0.8)) : p * (1 - io(seg(s, 0, 0.6))))),
          rot: f.rot.map((r, i) => (i === n ? r + (end - r) * oc(seg(s, w + 0.65, w + 1.5)) : r + (Math.round(r / 360) * 360 - r) * io(seg(s, 0, 0.6)))),
          d: f.d.map((d, i) => (i === n ? d + (1 - d) * seg(s, w + 1.3, w + 1.6) : d * (1 - seg(s, 0, 0.2)))),
        };
      };
      const swap = () => {
        const f = { p: last.p.slice(), rot: last.rot.slice(), d: last.d.slice() };
        const top = f.p.indexOf(Math.max(...f.p));
        const n = user ? (user.n + 1) % 3 : f.p[top] > 0.01 ? (top + 1) % 3 : 0;
        const w = f.p.some((p, i) => i !== n && p > 0.05) ? 0.5 : 0;
        user = { from: f, n, w, end: 360 * (Math.floor(f.rot[n] / 360) + 1), t0: api.now() };
        api.poke();
      };
      const hit = el("g", {}, svg);
      el("path", { d: BODY, fill: "#fff", "fill-opacity": 0 }, hit);
      el("path", { d: "M88 580 V200 A312 190 0 0 1 712 200 V580 Q712 596 696 596 H104 Q88 596 88 580 Z", fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, hit);
      button(hit, "Swap in the next record", swap);
      return (t, now) => {
        const P = user ? tapped(now) : timeline(t); last = P;
        const bt = calm ? 8.8 : t;
        bubbles.forEach(([b, o]) => b.setAttribute("cy", 556 - ((bt * 33.4 + o) % 334)));
        recs.map((r, i) => {
          const p = cl(P.p[i]), a = (p * Math.PI) / 2, k = SS + (1 - SS) * p;
          const x = SLOT[i] + (TX - SLOT[i]) * (1 - Math.cos(a)), y = SY + (TY - SY) * Math.sin(a);
          r.g.setAttribute("transform", `translate(${x} ${y}) scale(${k})`);
          r.disc.setAttribute("transform", `rotate(${P.rot[i]})`);
          r.label.setAttribute("y", 8 - 9 * P.d[i]);
          r.date.setAttribute("opacity", P.d[i]);
          return [p, r.g];
        }).sort((a, b) => a[0] - b[0]).forEach(([, g]) => layer.appendChild(g));
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
