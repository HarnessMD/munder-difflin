/* Bright coded scenes for "Agent Tools Today, 14 Nov 2026". Vanilla JS, no library.
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
  let uid = 0;
  const SC = {};

  /* ---- a blue typewriter: mint keys press in turn, three words type letter by letter on a lilac sheet ---- */
  SC.typewriter = {
    dur: 12, still: 9,
    build(svg, api) {
      const WORDS = ["Llama", "OpenCode", "Outage"], DATE = "13 Nov";
      const FS = 46, ADV = FS * 0.6, LH = 62, YT = 206, TOP = 56, MX = 220, C0 = 130, KT = 0.22;
      const PX0 = 190, PX1 = 610, PH = 440, CLIPY = 372;
      const A = [0.6, 2.8, 5.7], R = [1.9, 4.75], FADE = 10.2, HOME = 10.6;
      const PY = (i) => YT - TOP - i * LH, CEND = C0 - WORDS[2].length * ADV;
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const clip = `mg-typewriter-clip-${++uid}`;
      el("rect", { x: -20, y: -20, width: 840, height: CLIPY + 20 }, el("clipPath", { id: clip }, el("defs", {}, svg)));
      // floor shadow and two little feet
      el("ellipse", { cx: 400, cy: 586, rx: 300, ry: 8, fill: SOFT }, svg);
      [[150, 214], [586, 650]].forEach(([a, b]) => el("rect", { x: a, y: 562, width: b - a, height: 20, rx: 7, fill: LIL, stroke: INK, "stroke-width": 3 }, svg));
      // the lilac sheet and its three lines, clipped where it rolls under the platen
      const sheet = el("g", {}, el("g", { "clip-path": `url(#${clip})` }, svg));
      el("rect", { x: PX0, y: 0, width: PX1 - PX0, height: PH, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, sheet);
      let tap = () => {};
      const lines = WORDS.map((w, i) => {
        const base = TOP + i * LH, g = el("g", {}, sheet), wd = w.length * ADV;
        const hl = el("rect", { x: MX - 10, y: base - 42, width: wd + 20, height: 54, rx: 12, fill: YEL, opacity: 0 }, g);
        const letters = [...w].map((ch, k) => txt(g, MX + k * ADV, base, ch, { "font-family": MONO, "font-size": FS, "font-weight": 700, opacity: 0 }));
        const date = el("g", { opacity: 0 }, g), dx = MX + wd + 18;
        el("rect", { x: dx, y: base - 36, width: 104, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, date);
        txt(date, dx + 52, base - 8.5, DATE, { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
        const hit = el("g", {}, g);
        el("rect", { x: PX0 + 6, y: base - 46, width: PX1 - PX0 - 12, height: LH, fill: "#fff", "fill-opacity": 0 }, hit);
        el("rect", { x: PX0 + 10, y: base - 44, width: PX1 - PX0 - 20, height: LH - 4, rx: 12, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, hit);
        button(hit, `Slide the carriage back to ${w} and show ${DATE}`, () => tap(i));
        hit.setAttribute("aria-pressed", "false");
        return { letters, hl, date, hit };
      });
      // the carriage: return lever, sky platen and yellow knobs; it slides with the sheet
      const car = el("g", {}, svg);
      el("rect", { x: 140, y: 384, width: 520, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      svg.appendChild(car);
      el("path", { d: "M188 358 C172 340 168 324 160 314", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, car);
      el("circle", { cx: 158, cy: 310, r: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, car);
      el("rect", { x: 176, y: 350, width: 448, height: 44, rx: 22, fill: SKY, stroke: INK, "stroke-width": 3 }, car);
      el("path", { d: "M198 359 H602", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.8 }, car);
      [160, 640].forEach((x) => {
        el("circle", { cx: x, cy: 372, r: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, car);
        el("circle", { cx: x, cy: 372, r: 7, fill: "none", stroke: INK, "stroke-width": 2.5 }, car);
      });
      // the body: a blue rounded wedge with three rows of mint keys and a space bar
      el("path", { d: "M176 396 H624 Q640 396 643 410 L686 556 Q690 572 674 572 H126 Q110 572 114 556 L157 410 Q160 396 176 396 Z", fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M182 406 H618", stroke: SKY, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const KEY = {}, keys = [];
      ["qwertyuiop", "asdfghjkl", "zxcvbnm"].forEach((row, r) => [...row].forEach((ch, j) => {
        const x = 400 + (j - (row.length - 1) / 2) * 38 + r * 10, y = 436 + r * 36;
        el("circle", { cx: x, cy: y + 5, r: 13, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
        const cap = el("g", {}, svg);
        el("circle", { cx: x, cy: y, r: 13, fill: MINT, stroke: INK, "stroke-width": 2.5 }, cap);
        el("path", { d: `M${x - 7} ${y - 4} Q${x - 5} ${y - 8} ${x + 1} ${y - 8}`, fill: "none", stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.85 }, cap);
        KEY[ch] = keys.length; keys.push(cap);
      }));
      el("rect", { x: 316, y: 541, width: 168, height: 16, rx: 8, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 316, y: 536, width: 168, height: 16, rx: 8, fill: MINT, stroke: INK, "stroke-width": 2.5 }, svg);
      // every letter is one keystroke: its key dips, the letter lands, the carriage steps left
      const strikes = [];
      WORDS.forEach((w, i) => [...w].forEach((ch, k) => strikes.push({ t: A[i] + k * KT, key: KEY[ch.toLowerCase()] })));
      const bump = (s) => (s < 0 || s > 0.18 ? 0 : s < 0.05 ? s / 0.05 : 1 - (s - 0.05) / 0.13);
      // the timeline: type a line, return the carriage and feed the sheet, hold, then clear and roll home
      const timeline = (t) => {
        const out = seg(t, FADE, FADE + 0.4), home = io(seg(t, HOME, HOME + 0.8));
        let c = C0;
        WORDS.forEach((w, i) => {
          if (t < A[i]) return;
          let s = 0;
          for (let k = 0; k < w.length; k++) s += oc(seg(t, A[i] + k * KT + 0.05, A[i] + k * KT + 0.15));
          c = C0 - ADV * s * (1 - (i < 2 ? io(seg(t, R[i], R[i] + 0.6)) : home));
        });
        const p = keys.map(() => 0);
        strikes.forEach((st) => { p[st.key] = Math.max(p[st.key], bump(t - st.t)); });
        return {
          c,
          py: PY(0) - LH * (io(seg(t, R[0], R[0] + 0.4)) + io(seg(t, R[1], R[1] + 0.4))) + 2 * LH * home,
          L: WORDS.map((w, i) => [...w].map((_, k) => { const v = oc(seg(t, A[i] + k * KT, A[i] + k * KT + 0.1)); return { o: v * (1 - out), y: -6 * (1 - v) }; })),
          hl: [0, 0, 0], d: [0, 0, 0], p,
        };
      };
      let user = null, last = timeline(0);
      const snap = (S) => ({ c: S.c, py: S.py, L: S.L.map((r) => r.map((q) => ({ o: q.o, y: q.y }))), hl: S.hl.slice(), d: S.d.slice(), p: S.p.slice() });
      // a tap rolls the sheet so that line sits at the type point, returns the carriage and shows the date
      const tapped = (now) => {
        const s = calm ? 99 : now - user.t0, f = user.from, n = user.sel;
        const m = io(seg(s, 0, 0.75)), a = seg(s, 0, 0.25), off = seg(s, 0, 0.2);
        return {
          c: f.c + ((n < 0 ? CEND : C0) - f.c) * m,
          py: f.py + ((n < 0 ? PY(2) : PY(n)) - f.py) * m,
          L: f.L.map((r) => r.map((q) => ({ o: q.o + (1 - q.o) * a, y: q.y * (1 - a) }))),
          hl: f.hl.map((v, i) => (i === n ? v + (1 - v) * oc(seg(s, 0.55, 0.85)) : v * (1 - off))),
          d: f.d.map((v, i) => (i === n ? v + (1 - v) * oc(seg(s, 0.65, 1)) : v * (1 - off))),
          p: f.p.map((v) => v * (1 - seg(s, 0, 0.1))),
        };
      };
      tap = (n) => {
        const sel = user && user.sel === n ? -1 : n;
        user = { from: snap(last), sel, t0: api.now() };
        lines.forEach((ln, i) => ln.hit.setAttribute("aria-pressed", String(i === sel)));
        api.poke();
      };
      return (t, now) => {
        const S = user ? tapped(now) : timeline(t); last = S;
        car.setAttribute("transform", `translate(${S.c.toFixed(1)} 0)`);
        sheet.setAttribute("transform", `translate(${S.c.toFixed(1)} ${S.py.toFixed(1)})`);
        lines.forEach((ln, i) => {
          ln.letters.forEach((n, k) => { const q = S.L[i][k]; n.setAttribute("opacity", q.o.toFixed(3)); n.setAttribute("transform", `translate(0 ${q.y.toFixed(1)})`); });
          ln.hl.setAttribute("opacity", (0.95 * S.hl[i]).toFixed(3));
          ln.date.setAttribute("opacity", S.d[i].toFixed(3));
          ln.date.setAttribute("transform", `translate(${(-10 * (1 - S.d[i])).toFixed(1)} 0)`);
        });
        keys.forEach((k, j) => k.setAttribute("transform", `translate(0 ${(4 * S.p[j]).toFixed(1)})`));
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
