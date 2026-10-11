/* Bright coded scenes for "Agent tools today, 11 Oct 2026". Vanilla JS, no library.
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

  /* ---- a paper strip music box: the strip is the program, the comb plays in groups, one line of notes comes out ---- */
  SC.today = {
    dur: 12, still: 9,
    build(svg, api) {
      const GC = [BLUE, LIL, SKY], SY = 320, SP = 132;
      const PAT = [[[0, 3], [1], [2, 4]], [[1, 4], [0, 2], [3]], [[2], [0, 4], [1, 3]]];
      const id = "mgc" + Math.random().toString(36).slice(2, 8);
      const defs = el("defs", {}, svg);
      el("rect", { x: 38, y: 262, width: 250, height: 116 }, el("clipPath", { id: id + "a" }, defs));
      /* faint guides from each label to its part */
      const guides = ["M410 146 V180", "M160 378 V452", "M640 352 V452"].map((d) => el("path", { d, stroke: LIL, "stroke-width": 2, "stroke-linecap": "round", opacity: 0 }, svg));
      /* the strip */
      const paper = el("g", {}, svg);
      const sheet = el("rect", { x: 36, y: 264, width: 260, height: 112, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, paper);
      const holesG = el("g", { "clip-path": `url(#${id}a)` }, paper);
      const cluster = [0, 1, 2].map(() => {
        const g = el("g", {}, holesG);
        const dots = [0, 1, 2].map((c) => [0, 1, 2, 3, 4].map((r) => el("circle", { cx: (c - 1) * 26, cy: SY - 38 + r * 19, r: 7, stroke: INK, "stroke-width": 2 }, g)));
        return { g, dots };
      });
      /* the line the notes ride on */
      el("path", { d: "M536 330 H766", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const notesG = el("g", {}, svg);
      const notes = [0, 1, 2, 3].map(() => {
        const g = el("g", {}, notesG);
        el("path", { d: "M11 -4 V-58 Q30 -50 26 -30", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g);
        const h = el("ellipse", { rx: 14, ry: 10, fill: MINT, stroke: INK, "stroke-width": 3, transform: "rotate(-20)" }, g);
        return { g, h };
      });
      /* the box */
      const box = el("g", {}, svg);
      el("rect", { x: 300, y: 446, width: 44, height: 20, rx: 6, fill: INK }, box);
      el("rect", { x: 476, y: 446, width: 44, height: 20, rx: 6, fill: INK }, box);
      el("rect", { x: 280, y: 180, width: 260, height: 270, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      el("rect", { x: 298, y: 200, width: 224, height: 122, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, box);
      el("rect", { x: 306, y: 208, width: 208, height: 14, rx: 5, fill: INK }, box);
      const teeth = Array.from({ length: 12 }, (_, i) => {
        const g = Math.floor(i / 4);
        return { g, m: i % 4, n: el("rect", { x: 309 + i * 16 + g * 5, y: 220, width: 11, height: 88 - i * 4, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2 }, box) };
      });
      const crank = el("g", {}, box);
      el("circle", { r: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, crank);
      el("path", { d: "M0 0 H38", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, crank);
      el("circle", { r: 6, fill: INK }, crank);
      el("circle", { cx: 38, r: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, crank);
      /* the three labels */
      let sel = -1, t0 = -99;
      const chips = [["a program", 160, 478], ["many agents in phases", 410, 120], ["results combined", 640, 478]].map(([s, x, y], i) => {
        const g = el("g", {}, svg);
        const ring = el("rect", { y: -32, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        const r = el("rect", { y: -26, height: 52, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const t = txt(g, 0, 8, s, { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
        const w = t.getComputedTextLength() + 44;
        r.setAttribute("x", -w / 2); r.setAttribute("width", w); ring.setAttribute("x", -w / 2 - 6); ring.setAttribute("width", w + 12);
        button(g, s, () => { sel = i; t0 = api.now(); api.poke(); });
        return { g, r, x, y };
      });
      return (t, now) => {
        const out = 1 - seg(t, 11.4, 11.9), hot = now - t0 >= 0 && now - t0 < 2.6 ? sel : -1;
        const n = Math.floor(t / 2), p = (t / 2) % 1;
        /* strip: three clusters of holes slide right, one cluster per phase */
        sheet.setAttribute("fill", hot === 0 ? YEL : "#fff");
        cluster.forEach((c, j) => {
          const g = (n + j) % 3;
          const cx = 250 + SP * (p - j);
          c.g.setAttribute("transform", `translate(${cx} 0)`);
          c.dots.forEach((col, ci) => col.forEach((d, r) => { const on = PAT[g][ci].includes(r) && cx + (ci - 1) * 26 > 54; d.setAttribute("opacity", on ? 1 : 0); d.setAttribute("fill", GC[g]); }));
        });
        /* comb: one group of four teeth plays per cluster */
        teeth.forEach((th) => {
          const a = 0.12 + th.m * 0.14, mine = th.g === n % 3;
          const lit = hot === 1 ? 1 : mine ? seg(p, a, a + 0.06) * (1 - seg(p, 0.9, 0.98)) : 0;
          const hop = hot === 1 ? Math.abs(Math.sin(now * 9 + th.m + th.g)) : mine ? Math.sin(seg(p, a, a + 0.22) * Math.PI) : 0;
          th.n.setAttribute("fill", lit > 0.5 ? GC[th.g] : SOFT);
          th.n.setAttribute("transform", `translate(0 ${6 * hop})`);
        });
        crank.setAttribute("transform", `translate(410 386) rotate(${t * 180})`);
        /* notes leave on one line */
        notes.forEach((nt, i) => {
          const x = 524 + 66 * ((t % 1) + i), bob = Math.sin(t * Math.PI * 2 + i * 1.6) * 3, big = hot === 2 ? 1.18 + 0.1 * Math.sin(now * 10 + i) : 1;
          nt.g.setAttribute("transform", `translate(${x} ${320 + bob}) scale(${big * ob(seg(x, 546, 574)) * (1 - seg(x, 722, 748))})`);
          nt.h.setAttribute("fill", hot === 2 ? YEL : MINT);
        });
        chips.forEach((c, i) => {
          const k = seg(t, 1 + i * 2, 1.4 + i * 2);
          tf(c.g, c.x, c.y, (0.6 + 0.4 * ob(k)) * (hot === i ? 1.06 : 1));
          c.g.setAttribute("opacity", k <= 0 ? 0 : out);
          guides[i].setAttribute("opacity", k * out);
          c.r.setAttribute("fill", hot === i ? YEL : "#fff");
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
