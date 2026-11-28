/* Bright coded scenes for "Agent Tools Today, 16 Nov 2026". Vanilla JS, no library.
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

  /* ---- a pinwheel on a blue stick: three lilac blades turn mint at the top; a tap stops the pinwheel and shows that blade's date ---- */
  SC.pinwheel = {
    dur: 18, still: 3,
    build(svg, api) {
      const NAMES = ["Qwen", "Browser", "Open Source"], DATES = ["16 Nov", "16 Nov", "15 Nov"];
      // each word's lines as [text, baseline]; UP lifts the word when the date tag shows, TAG is the tag's top edge
      const LINES = [[["Qwen", 13]], [["Browser", 13]], [["Open", -7], ["Source", 33]]], UP = [18, 18, 22], TAG = [6, 6, 20];
      const CX = 400, CY = 290, LD = 124, SPD = 20, T1 = 3, DUR = 18, FS = 36, DEC = 0.8;
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const rad = (d) => (d * Math.PI) / 180;
      const P = (r, d) => [CX + r * Math.cos(rad(d)), CY + r * Math.sin(rad(d))];
      // blade i points at this angle (degrees, -90 is the top); the pinwheel turns clockwise, 20 degrees a second, one turn per loop
      const ang = (i, t) => -90 + SPD * (t - T1) - 120 * i;
      const fromTop = (d) => { const a = (((d + 90) % 360) + 360) % 360; return Math.min(a, 360 - a); };
      // a soft shadow at the foot of the stick, and three sky breeze swooshes drifting in from the left
      el("ellipse", { cx: CX, cy: 579, rx: 84, ry: 9, fill: SOFT }, svg);
      const breeze = [[34, 170, 96], [62, 214, 70], [30, 256, 84]].map(([x, y, l]) => {
        const g = el("g", {}, svg), d = `M${x} ${y} q${l / 4} -10 ${l / 2} 0 t${l / 2} 0`;
        // drawn in and out with a dash, never faded, so the ink never turns grey
        return [[INK, 9], [SKY, 4]].map(([c, w]) => el("path", { d, fill: "none", stroke: c, "stroke-width": w, "stroke-linecap": "round", pathLength: 100, "stroke-dasharray": "100 120" }, g)).concat(g);
      });
      // the straight blue stick, behind the blades
      el("rect", { x: CX - 9, y: CY, width: 18, height: 290, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${CX - 3} ${CY + 60} V562`, stroke: "#fff", "stroke-width": 3, "stroke-linecap": "round", opacity: 0.7 }, svg);
      // one blade, drawn pointing up from the hub: a wide lilac sail with a pointed leading tip and a folded corner
      const BLADE = "M-20 -20 C-78 -52 -124 -104 -112 -176 C-104 -226 -44 -240 20 -238 Q80 -234 124 -214 C122 -158 84 -50 20 -20 Z";
      const FLAP = "M124 -214 L66 -233 Q80 -196 118 -176 Z";
      const SPARK = [[-108, -42, 12], [108, -50, 9], [90, -78, 7]];
      const star = (r) => { const q = r * 0.18; return `M0 ${-r} Q${q} ${-q} ${r} 0 Q${q} ${q} 0 ${r} Q${-q} ${q} ${-r} 0 Q${-q} ${-q} 0 ${-r} Z`; };
      const MW = { "text-anchor": "middle", "font-family": MONO, "font-size": FS, "font-weight": 700 };
      let tap = () => {};
      const blades = NAMES.map((w, i) => {
        const g = el("g", {}, svg), rot = el("g", {}, g);
        el("path", { d: BLADE, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, rot);
        const mint = el("path", { d: BLADE, fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", opacity: 0 }, rot);
        el("path", { d: "M-70 -214 Q-30 -228 4 -226", fill: "none", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.75 }, rot);
        el("path", { d: FLAP, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, rot);
        el("path", { d: BLADE, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", transform: `translate(0 ${-LD}) scale(1.07) translate(0 ${LD})`, class: "mg-ring" }, rot);
        button(g, `${w}: stop the pinwheel and show ${DATES[i]}`, () => tap(i));
        g.setAttribute("aria-pressed", "false");
        return { g, rot, mint };
      });
      // the yellow hub sits over the blades; three bolts show it turning
      const hub = el("g", {}, svg);
      el("circle", { r: 30, fill: YEL, stroke: INK, "stroke-width": 3 }, hub);
      el("circle", { r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, hub);
      [30, 150, 270].forEach((a) => el("circle", { cx: 20 * Math.cos(rad(a)), cy: 20 * Math.sin(rad(a)), r: 3.5, fill: INK }, hub));
      // the words float above everything and stay upright; taps pass through them to the blade
      const labels = el("g", { "pointer-events": "none" }, svg);
      blades.forEach((b, i) => {
        const lab = el("g", {}, labels), word = el("g", {}, lab), halo = el("g", { opacity: 0 }, word);
        LINES[i].forEach(([s, y]) => txt(halo, 0, y, s, Object.assign({}, MW, { fill: "#fff", stroke: "#fff", "stroke-width": 9, "stroke-linejoin": "round" })));
        LINES[i].forEach(([s, y]) => txt(word, 0, y, s, MW));
        const chip = el("g", { opacity: 0 }, lab);
        el("rect", { x: -50, y: TAG[i], width: 100, height: 28, rx: 14, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
        txt(chip, 0, TAG[i] + 21, DATES[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        const sparks = SPARK.map(([x, y, r]) => {
          const s = el("g", { transform: `translate(${x} ${y}) scale(0)` }, lab);
          el("path", { d: star(r), fill: YEL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, s);
          return s;
        });
        Object.assign(b, { lab, word, halo, chip, sparks });
      });
      // a tap stops the pinwheel (it slows over 0.8 s) and shows that blade's date; the same blade again sets it turning
      let user = null, fade = null, woff = 0, lastT = T1, lastRaw = 0;
      const C = [0, 0, 0];
      const wheelT = (now) => { if (calm) return user.tc; const s = cl(now - user.t0, 0, DEC); return user.tc + s - (s * s) / (2 * DEC); };
      tap = (n) => {
        const now = api.now();
        if (user && user.sel === n) { woff = wheelT(now) - lastRaw; fade = { sel: n, t0: now, from: C[n] }; user = null; }
        else if (user) { fade = { sel: user.sel, t0: now, from: C[user.sel] }; user = Object.assign({}, user, { sel: n, cs: now, cd: 0.1 }); }
        else user = { sel: n, tc: lastT, t0: now, cs: now, cd: 0.3 };
        blades.forEach((b, i) => b.g.setAttribute("aria-pressed", String(!!user && user.sel === i)));
        api.poke();
      };
      return (t, now) => {
        const T = user ? wheelT(now) : calm ? T1 : (((t + woff) % DUR) + DUR) % DUR, tw = calm ? T1 : t;
        lastT = T; lastRaw = t;
        hub.setAttribute("transform", `translate(${CX} ${CY}) rotate(${(SPD * (T - T1)).toFixed(2)})`);
        breeze.forEach(([a, b, g], k) => {
          const p = calm ? 0.5 : (((tw / 3 + k / 3) % 1) + 1) % 1, off = (104 - 208 * p).toFixed(1);
          g.setAttribute("transform", `translate(${(-12 + 28 * p).toFixed(1)} 0)`);
          a.setAttribute("stroke-dashoffset", off); b.setAttribute("stroke-dashoffset", off);
        });
        const tw2 = 0.88 + 0.12 * Math.sin((2 * Math.PI * tw) / 1.5);
        blades.forEach((b, i) => {
          const a = ang(i, T), [x, y] = P(LD, a), h = oc(cl((40 - fromTop(a)) / 8));
          let c = 0;
          if (user && user.sel === i) c = calm ? 1 : oc(seg(now - user.cs, user.cd, user.cd + 0.35));
          else if (fade && fade.sel === i) c = calm ? 0 : fade.from * (1 - seg(now - fade.t0, 0, 0.25));
          C[i] = c;
          b.rot.setAttribute("transform", `translate(${CX} ${CY}) rotate(${(a + 90).toFixed(2)})`);
          b.mint.setAttribute("opacity", h.toFixed(3));
          b.lab.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          b.halo.setAttribute("opacity", h.toFixed(3));
          b.word.setAttribute("transform", `translate(0 ${(-UP[i] * c).toFixed(1)}) scale(${(1 + 0.06 * h).toFixed(3)})`);
          b.chip.setAttribute("opacity", c.toFixed(3));
          b.chip.setAttribute("transform", `translate(0 ${(6 * (1 - c)).toFixed(1)})`);
          b.sparks.forEach((s, k) => s.setAttribute("transform", `translate(${SPARK[k][0]} ${SPARK[k][1]}) scale(${(h * (k % 2 ? 2 - tw2 : tw2)).toFixed(3)})`));
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
