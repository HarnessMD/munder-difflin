/* Bright coded scene for "Agent tools today, 30 Oct 2026". Vanilla JS, no library.
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

  /* ---- three envelopes drop into a mail sorting rack ---- */
  SC.sorter = {
    dur: 8.5, still: 7,
    build(svg, api) {
      const X0 = 48, DW = 16, S = (704 - 4 * DW) / 3, EW = 196, EH = 250, TOP = 270, OUT = 180;
      const MAIL = [
        ["Mistral", "Large 4", "Weights out", SKY],
        ["Claude Code", "2.1.314", "Write guard", LIL],
        ["Herdr", "", "Desktop app", MINT],
      ];
      const root = el("g", { transform: "translate(0 -64)" }, svg);
      const grain = (d, p) => el("path", { d, stroke: "#fff", "stroke-opacity": 0.6, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, p);
      el("ellipse", { cx: 400, cy: 560, rx: 370, ry: 10, fill: SOFT }, root);
      el("rect", { x: X0 + 8, y: 216, width: 688, height: 316, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, root);
      for (let i = 0; i < 4; i++) {
        const x = X0 + i * (S + DW);
        el("rect", { x, y: 196, width: DW, height: 336, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, root);
        grain(`M${x + 8} 214 V300 M${x + 8} 330 V440`, root);
      }
      const layer = el("g", {}, root);
      el("rect", { x: 40, y: 454, width: 720, height: 78, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, root);
      grain("M72 476 C200 468 330 486 460 476 S660 468 728 478", root);
      grain("M120 506 C260 498 380 514 520 506 S640 500 690 506", root);
      el("ellipse", { cx: 600, cy: 492, rx: 14, ry: 5, fill: "none", stroke: "#fff", "stroke-opacity": 0.6, "stroke-width": 2.5 }, root);
      el("rect", { x: 28, y: 526, width: 744, height: 20, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, root);
      const env = MAIL.map(([a, b, tag, col], i) => {
        const g = el("g", {}, layer);
        el("rect", { x: -8, y: -8, width: EW + 16, height: EH + 16, rx: 16, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, g);
        el("rect", { width: EW, height: EH, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M4 5 L${EW / 2} 52 L${EW - 4} 5`, stroke: MUTE, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        const name = { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 };
        if (b) { txt(g, EW / 2, 92, a, name); txt(g, EW / 2, 120, b, name); } else txt(g, EW / 2, 106, a, name);
        const chip = el("rect", { y: 138, height: 34, rx: 17, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        const tt = txt(g, EW / 2, 161, tag, { "text-anchor": "middle", "font-size": 19, "font-weight": 600 });
        const w = (tt.getComputedTextLength() || 110) + 32;
        chip.setAttribute("x", EW / 2 - w / 2); chip.setAttribute("width", w);
        const st = { out: false, at: -99 };
        button(g, `${b ? a + " " + b : a}, ${tag}`, () => {
          st.out = !st.out; st.at = api.calm ? -99 : api.now(); g.setAttribute("aria-pressed", st.out);
          if (api.calm) api.redraw(); else api.poke();
        });
        g.setAttribute("aria-pressed", "false");
        return { g, st, x: X0 + DW + i * (S + DW) + (S - EW) / 2, d: 0.5 + i * 1.4, r: [-7, 6, -5][i] };
      });
      return (t, now) => {
        const fade = 1 - seg(t, 7.6, 8.2);
        env.forEach((e) => {
          const k = seg(t, e.d, e.d + 0.75), bump = Math.sin(seg(t, e.d + 0.75, e.d + 1.05) * Math.PI);
          const p = io(seg(now - e.st.at, 0, 0.55)), slide = e.st.out ? -OUT * p : -OUT * (1 - p);
          const y = TOP - 620 * (1 - k * k) - 14 * bump + slide, r = e.r * (1 - k) + e.r * 0.25 * bump;
          e.g.setAttribute("transform", `translate(${e.x + EW / 2} ${y + EH / 2}) rotate(${r}) translate(${-EW / 2} ${-EH / 2})`);
          e.g.setAttribute("opacity", t < e.d ? 0 : fade);
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
    const api = { calm, redraw: () => frame(), now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
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
