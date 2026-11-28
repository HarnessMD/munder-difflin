/* Bright coded scenes for "Agent tools today, 1 Nov 2026". Vanilla JS, no library.
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  const SC = {};

  /* ---- a pop up book lies open and three cards rise out of the fold ---- */
  SC.popup = {
    dur: 11, still: 8,
    build(svg, api) {
      const LEAF = [
        ["M400 118 Q260 90 102 86 L22 536 Q220 536 400 566 Z", BLUE],
        ["M400 110 Q260 84 110 82 L32 522 Q220 524 400 552 Z", "#fff"],
        ["M400 102 Q260 76 116 76 L40 508 Q220 510 400 538 Z", SOFT],
      ];
      [false, true].forEach((mirror) => {
        const g = el("g", mirror ? { transform: "translate(800 0) scale(-1 1)" } : {}, svg);
        LEAF.forEach(([d, fill]) => el("path", { d, fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g));
      });
      el("path", { d: "M400 102 V538", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);

      const W = 480, H = 116;
      const CARDS = [
        { title: "ChatGPT share link", tag: "Fixed 26 Oct", fill: YEL, base: 138, sc: 0.88 },
        { title: "Prospero", tag: "Native harness", fill: SKY, base: 273, sc: 0.94 },
        { title: "Orkas", tag: "Desktop agent team", fill: MINT, base: 415, sc: 1 },
      ];
      const TIMES = [0.7, 2.9, 5.1], RISE = 0.9, FOLD = 9.4;
      let manual = null;
      const cards = CARDS.map((c, i) => {
        const g = el("g", {}, svg), w = W * c.sc, h = H * c.sc;
        const shade = el("rect", { fill: LIL }, g);
        const hinges = [-1, 1].map((side) => {
          const x = 400 + side * w * 0.3;
          return { x, n: el("path", { fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g) };
        });
        const body = el("rect", { fill: c.fill, stroke: INK, "stroke-width": 3, rx: 12 }, g);
        const face = el("g", {}, g);
        txt(face, 0, -H + 46, c.title, { "text-anchor": "middle", "font-family": MONO, "font-size": 34, "font-weight": 700 });
        const cw = c.tag.length * 11.4 + 36;
        el("rect", { x: -cw / 2, y: -H + 60, width: cw, height: 36, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2 }, face);
        txt(face, 0, -H + 85, c.tag, { "text-anchor": "middle", "font-size": 20 });
        const ring = el("rect", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 7", rx: 17, class: "mg-ring" }, g);
        const hit = el("rect", { x: 400 - w / 2 - 8, width: w + 16, fill: "#fff", "fill-opacity": 0 }, g);
        const card = { ...c, g, w, h, shade, hinges, body, face, ring, hit, k: 0 };
        button(g, `${c.title}: ${c.tag}`, () => {
          const now = api.now();
          if (!manual) manual = cards.map((o) => ({ from: o.k, to: o.k > 0.01 ? 1 : 0, at: now }));
          const m = manual[i];
          m.from = card.k; m.to = m.to >= 0.5 ? 0 : 1; m.at = now;
          api.poke();
        });
        return card;
      });
      const place = (c, k) => {
        c.k = k;
        const s = 0.09 + 0.91 * k, xs = 1 - 0.05 * (1 - cl(k)), w = c.w * xs, ch = c.h * s, x = 400 - w / 2, y = c.base - ch, lift = cl(k), ht = 6 + 14 * lift;
        c.body.setAttribute("x", x); c.body.setAttribute("y", y); c.body.setAttribute("width", w); c.body.setAttribute("height", ch);
        c.ring.setAttribute("x", x - 7); c.ring.setAttribute("y", y - 7); c.ring.setAttribute("width", w + 14); c.ring.setAttribute("height", ch + 14);
        const top = Math.min(y, c.base - 50);
        c.hit.setAttribute("y", top); c.hit.setAttribute("height", c.base + 22 - top);
        c.shade.setAttribute("x", 400 - w / 2 + 6); c.shade.setAttribute("y", c.base - 2); c.shade.setAttribute("width", w - 12); c.shade.setAttribute("height", 2 + 8 * lift);
        c.hinges.forEach((n) => n.n.setAttribute("d", `M${n.x - 22} ${c.base} H${n.x + 22} L${n.x + 30} ${c.base + ht} H${n.x - 30} Z`));
        c.face.setAttribute("transform", `translate(400 ${c.base}) scale(${c.sc * xs} ${c.sc * s})`);
        c.face.setAttribute("opacity", seg(s, 0.12, 0.34));
        c.g.setAttribute("aria-pressed", String(k > 0.5));
      };
      return (t, now) => {
        cards.forEach((c, i) => {
          if (manual) {
            const m = manual[i], e = calm ? 1 : seg(now, m.at, m.at + 0.7);
            place(c, m.from + (m.to - m.from) * (m.to > m.from ? ob(e) : io(e)));
          } else {
            const f = FOLD + (2 - i) * 0.2;
            place(c, ob(seg(t, TIMES[i], TIMES[i] + RISE)) * (1 - io(seg(t, f, f + 0.8))));
          }
        });
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
