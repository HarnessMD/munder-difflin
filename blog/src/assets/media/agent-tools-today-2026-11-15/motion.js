/* Bright coded scenes for "Agent Tools Today, 15 Nov 2026". Vanilla JS, no library.
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

  /* ---- a blue water wheel in a sky stream: three lilac paddles turn mint at the top; a tap stops the wheel and shows the date ---- */
  SC.watermill = {
    dur: 18, still: 3,
    build(svg, api) {
      const WORDS = ["Teamwork", "GLM", "Lovable"], DATE = "14 Nov";
      const CX = 400, CY = 290, RIM = 175, PR = 190, SPD = 20, T1 = 3, DUR = 18, FS = 40, DEC = 0.8, WAVE = 456;
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const rad = (d) => (d * Math.PI) / 180;
      const P = (r, d) => [CX + r * Math.cos(rad(d)), CY + r * Math.sin(rad(d))];
      // paddle i sits at this angle (degrees, -90 is the top); the wheel turns anticlockwise, 20 degrees a second, one turn per loop
      const ang = (i, t) => -90 + SPD * (T1 - t) + 120 * i;
      const fromTop = (d) => { const a = (((d + 90) % 360) + 360) % 360; return Math.min(a, 360 - a); };
      // the stream: light sky water with a wavy ink edge and a few ink ripples, flowing right
      const stream = el("g", {}, svg);
      let wd = `M-160 ${WAVE}`;
      for (let k = 0; k < 15; k++) wd += " q20 -7 40 0 t40 0";
      const water = el("path", { d: `${wd} V640 H-160 Z`, fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, stream);
      const RIP = [[30, 502, 56], [220, 534, 44], [120, 574, 64], [330, 558, 40], [400, 496, 48]];
      const ripples = el("g", {}, stream);
      [-480, 0, 480].forEach((dx) => RIP.forEach(([x, y, l]) => el("path", { d: `M${x + dx} ${y} q${l / 4} -5 ${l / 2} 0 t${l / 2} 0`, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, ripples)));
      // the wheel: blue spokes and rim in ink lines, rim joints, a yellow hub with three bolts
      const wheel = el("g", {}, svg);
      el("circle", { cx: CX, cy: CY, r: 112, fill: "none", stroke: INK, "stroke-width": 3 }, wheel);
      const SP = [0, 1, 2, 3, 4, 5].map((k) => -30 + 60 * k);
      [[INK, 14], [BLUE, 8]].forEach(([c, w]) => SP.forEach((a) => {
        const [x1, y1] = P(28, a), [x2, y2] = P(RIM, a);
        el("line", { x1, y1, x2, y2, stroke: c, "stroke-width": w, "stroke-linecap": "round" }, wheel);
      }));
      el("circle", { cx: CX, cy: CY, r: RIM, fill: "none", stroke: INK, "stroke-width": 22 }, wheel);
      el("circle", { cx: CX, cy: CY, r: RIM, fill: "none", stroke: BLUE, "stroke-width": 16 }, wheel);
      for (let k = 0; k < 12; k++) {
        const [x1, y1] = P(RIM - 8, -15 + 30 * k), [x2, y2] = P(RIM + 8, -15 + 30 * k);
        el("line", { x1, y1, x2, y2, stroke: INK, "stroke-width": 3 }, wheel);
      }
      el("circle", { cx: CX, cy: CY, r: 34, fill: YEL, stroke: INK, "stroke-width": 3 }, wheel);
      el("circle", { cx: CX, cy: CY, r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, wheel);
      [30, 150, 270].forEach((a) => { const [x, y] = P(22, a); el("circle", { cx: x, cy: y, r: 3.5, fill: INK }, wheel); });
      // three upright lilac paddles; the word stays level as the wheel turns
      const SPARK = [[-142, -40, 12], [142, -48, 9], [96, -72, 7]];
      const star = (r) => { const q = r * 0.18; return `M0 ${-r} Q${q} ${-q} ${r} 0 Q${q} ${q} 0 ${r} Q${-q} ${q} ${-r} 0 Q${-q} ${-q} 0 ${-r} Z`; };
      const MW = { "text-anchor": "middle", "font-family": MONO, "font-size": FS, "font-weight": 700 };
      let tap = () => {};
      const pads = WORDS.map((w, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -120, y: -52, width: 240, height: 104, rx: 18, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        const mint = el("rect", { x: -120, y: -52, width: 240, height: 104, rx: 18, fill: MINT, stroke: INK, "stroke-width": 3, opacity: 0 }, g);
        el("path", { d: "M-100 -43 H-20", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.75 }, g);
        const word = el("g", {}, g);
        const halo = txt(word, 0, 14, w, Object.assign({}, MW, { fill: "#fff", stroke: "#fff", "stroke-width": 9, "stroke-linejoin": "round", opacity: 0 }));
        txt(word, 0, 14, w, MW);
        const chip = el("g", { opacity: 0 }, g);
        el("rect", { x: -52, y: 10, width: 104, height: 28, rx: 14, fill: YEL, stroke: INK, "stroke-width": 2.5 }, chip);
        txt(chip, 0, 31, DATE, { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        const sparks = SPARK.map(([x, y, r]) => {
          const s = el("g", { transform: `translate(${x} ${y}) scale(0)` }, g);
          el("path", { d: star(r), fill: YEL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, s);
          return s;
        });
        el("rect", { x: -129, y: -61, width: 258, height: 122, rx: 26, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, g);
        button(g, `${w}: stop the wheel and show ${DATE}`, () => tap(i));
        g.setAttribute("aria-pressed", "false");
        return { g, mint, halo, word, chip, sparks };
      });
      // a tap stops the wheel (it slows over 0.8 s) and shows the date on that paddle; the same paddle again turns it on
      let user = null, fade = null, woff = 0, lastT = T1, lastRaw = 0;
      const C = [0, 0, 0];
      const wheelT = (now) => { if (calm) return user.tc; const s = cl(now - user.t0, 0, DEC); return user.tc + s - (s * s) / (2 * DEC); };
      tap = (n) => {
        const now = api.now();
        if (user && user.sel === n) { woff = wheelT(now) - lastRaw; fade = { sel: n, t0: now, from: C[n] }; user = null; }
        else if (user) { fade = { sel: user.sel, t0: now, from: C[user.sel] }; user = Object.assign({}, user, { sel: n, cs: now, cd: 0.1 }); }
        else user = { sel: n, tc: lastT, t0: now, cs: now, cd: 0.3 };
        pads.forEach((p, i) => p.g.setAttribute("aria-pressed", String(!!user && user.sel === i)));
        api.poke();
      };
      return (t, now) => {
        const T = user ? wheelT(now) : calm ? T1 : (((t + woff) % DUR) + DUR) % DUR, tw = calm ? T1 : t;
        lastT = T; lastRaw = t;
        wheel.setAttribute("transform", `rotate(${(-SPD * T).toFixed(2)} ${CX} ${CY})`);
        const o = (tw / DUR) * 480;
        ripples.setAttribute("transform", `translate(${(o % 480).toFixed(1)} 0)`);
        water.setAttribute("transform", `translate(${((o % 80) - 80).toFixed(1)} 0)`);
        const tw2 = 0.88 + 0.12 * Math.sin((2 * Math.PI * tw) / 1.5);
        pads.forEach((p, i) => {
          const a = ang(i, T), [x, y] = P(PR, a), h = oc(cl((44 - fromTop(a)) / 12));
          let c = 0;
          if (user && user.sel === i) c = calm ? 1 : oc(seg(now - user.cs, user.cd, user.cd + 0.35));
          else if (fade && fade.sel === i) c = calm ? 0 : fade.from * (1 - seg(now - fade.t0, 0, 0.25));
          C[i] = c;
          p.g.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
          p.mint.setAttribute("opacity", h.toFixed(3));
          p.halo.setAttribute("opacity", h.toFixed(3));
          p.word.setAttribute("transform", `translate(0 ${(-15 * c).toFixed(1)}) scale(${(1 + 0.1 * h).toFixed(3)})`);
          p.chip.setAttribute("opacity", c.toFixed(3));
          p.chip.setAttribute("transform", `translate(0 ${(6 * (1 - c)).toFixed(1)})`);
          p.sparks.forEach((s, k) => s.setAttribute("transform", `translate(${SPARK[k][0]} ${SPARK[k][1]}) scale(${(h * (k % 2 ? 2 - tw2 : tw2)).toFixed(3)})`));
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
