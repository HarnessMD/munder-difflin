/* Bright coded scenes for "Munder Difflin 0.5.10". Vanilla JS, no library.
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

  /* ---- shared drawings ---- */
  // a desk lamp, base centre at ox,oy; returns a setter for how lit it is, 0 to 1
  const lamp = (p, ox, oy, s = 1) => {
    const g = el("g", { transform: `translate(${ox} ${oy}) scale(${s})` }, p);
    const glow = el("circle", { cx: 40, cy: -100, r: 42, fill: YEL, opacity: 0 }, g);
    const cone = el("path", { d: "M21 -94 L59 -94 L85 0 L-5 0 Z", fill: YEL, opacity: 0 }, g);
    el("rect", { x: -16, y: -12, width: 32, height: 12, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g);
    el("path", { d: "M0 -12 V-74 L36 -118", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    el("circle", { cx: 0, cy: -74, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    const bulb = el("circle", { cx: 40, cy: -93, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
    const shade = el("path", { d: "M31 -122 L49 -122 L59 -94 L21 -94 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    return (k) => { glow.setAttribute("opacity", 0.22 * k); cone.setAttribute("opacity", 0.4 * k); shade.setAttribute("fill", k > 0.5 ? YEL : SOFT); bulb.setAttribute("fill", k > 0.25 ? YEL : "#fff"); };
  };
  const CLOUD = "M-110 75 Q-150 75 -150 35 Q-150 -5 -108 -8 Q-100 -70 -40 -72 Q-5 -110 45 -80 Q110 -90 118 -25 Q152 -15 150 30 Q148 75 105 75 Z";
  const flick = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * (0.55 + 0.45 * Math.abs(Math.sin(k * 23))));

  const SC = {};

  /* ---- 1. five desks; only the orchestrator's lamp is lit until a message arrives ---- */
  SC.lamps = {
    dur: 7, still: 7,
    build(svg, api) {
      const X = [96, 248, 400, 552, 704], TOP = 330;
      el("path", { d: "M28 440 H772", stroke: SOFT, "stroke-width": 18, "stroke-linecap": "round" }, svg);
      const woke = X.map(() => -1);
      const desks = X.map((x, i) => {
        const g = el("g", {}, svg);
        if (i) el("rect", { x: x - 74, y: 182, width: 148, height: 230, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
        const light = lamp(g, x - 29, TOP);
        el("rect", { x: x - 70, y: TOP, width: 140, height: 16, rx: 5, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        [-53, 53].forEach((dx) => el("rect", { x: x + dx - 5, y: TOP + 16, width: 10, height: 90, rx: 2, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        [-40, 40].forEach((dx) => el("path", { d: `M${x + dx} ${TOP + 16} V${TOP + 32}`, stroke: INK, "stroke-width": 2.5 }, g));
        const card = el("g", {}, g);
        const face = el("rect", { x: -70, y: -19, width: 140, height: 38, rx: 10, fill: i ? SOFT : MINT, stroke: INK, "stroke-width": 2.5 }, card);
        const word = txt(card, 0, 6, i ? "Sleeping" : "Orchestrator", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        if (i) button(g, `Desk ${i + 1}, sleeping. Wake it`, () => { if (woke[i] < 0) { woke[i] = api.now(); g.setAttribute("aria-label", `Desk ${i + 1}, waking up`); api.poke(); } });
        return { light, card, face, word };
      });
      const env = el("g", {}, svg);
      el("rect", { x: -20, y: -14, width: 40, height: 28, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, env);
      el("path", { d: "M-20 -14 L0 3 L20 -14", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }, env);
      const wake = (s) => [seg(s, 0, 0.4), seg(s, 0.45, 1.15)];
      return (t, now) => {
        const fx = oc(seg(t, 0.6, 2.2)), dy = seg(t, 2.2, 2.6);
        tf(env, -40 + 490 * fx, 110 - 18 * Math.sin(fx * Math.PI) + 206 * dy * dy, 1, fx < 1 ? -10 * Math.sin(fx * Math.PI) : 0);
        desks.forEach((d, i) => {
          let f = 1, k = 1;
          if (i) {
            const a = i === 2 ? wake(t - 2.75) : [0, 0], u = woke[i] >= 0 ? wake(now - woke[i]) : [0, 0];
            f = Math.max(a[0], u[0]); k = Math.max(a[1], u[1]);
          }
          d.light(flick(k));
          const on = f >= 0.5;
          d.word.textContent = i === 0 ? "Orchestrator" : on ? "Waking up" : "Sleeping";
          d.face.setAttribute("fill", i === 0 ? MINT : on ? SKY : SOFT);
          d.card.setAttribute("transform", `translate(${X[i]} 381) scale(1 ${i === 0 ? 1 : Math.max(0.02, Math.abs(Math.cos(f * Math.PI)))})`);
        });
      };
    },
  };

  /* ---- 2. an agent tile moves from the Main Office into the Cloud Office ---- */
  SC.cloudmove = {
    dur: 7, still: 7,
    build(svg, api) {
      el("rect", { x: 50, y: 190, width: 240, height: 220, rx: 24, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 170, 240, "Main Office", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      el("rect", { x: 112, y: 284, width: 116, height: 56, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 6" }, svg);
      const arc = "M290 300 C335 196 445 196 500 304";
      el("path", { d: arc, stroke: SOFT, "stroke-width": 20, fill: "none", "stroke-linecap": "round" }, svg);
      el("path", { d: arc, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-dasharray": "2 11", "stroke-linecap": "round" }, svg);
      const path = el("path", { d: "M170 312 L290 300 C335 196 445 196 500 304 L620 290", fill: "none", stroke: "none" }, svg);
      const L = path.getTotalLength();
      const sheet = el("g", {}, svg);
      el("path", { d: "M-60 -36 H44 L60 -20 V36 H-60 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, sheet);
      el("path", { d: "M44 -36 V-20 H60", fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, sheet);
      txt(sheet, -2, 0, "Checking", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      el("rect", { x: -44, y: 13, width: 88, height: 10, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, sheet);
      const bar = el("rect", { x: -44, y: 13, width: 0, height: 10, rx: 5, fill: BLUE }, sheet);
      const cloud = el("g", {}, svg);
      el("path", { d: CLOUD, transform: "scale(1.1)", fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, cloud);
      el("path", { d: CLOUD, fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, cloud);
      txt(cloud, 0, 50, "Cloud Office", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const tile = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: -58, y: -28, width: 116, height: 56, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, tile);
      txt(tile, 0, 8, "Agent", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      let mv = null, cur = 0;
      button(cloud, "Cloud Office. Send the agent back to Main Office", () => { mv = { from: cur, to: cur > 0.5 ? 0 : 1, at: api.now() }; api.poke(); });
      return (t, now) => {
        const b = 5 * Math.sin((t / 7) * Math.PI * 4);
        tf(cloud, 620, 300 + b);
        let p, k, sh, settle;
        if (mv) { const s = now - mv.at; k = io(seg(s, 0.15, 2.4)); p = mv.from + (mv.to - mv.from) * k; sh = 1; settle = seg(s, 2.4, 2.9); }
        else { k = seg(t, 0.9, 3.5); p = io(k); sh = oc(seg(t, 0.4, 0.8)); settle = seg(t, 3.5, 4); }
        cur = p;
        const pt = path.getPointAtLength(L * p);
        tf(tile, pt.x, pt.y + b * seg(p, 0.85, 1), 1 + 0.07 * Math.sin(settle * Math.PI));
        sheet.setAttribute("opacity", sh); tf(sheet, 380, 386, 0.8 + 0.2 * sh);
        bar.setAttribute("width", 88 * k);
      };
    },
  };

  /* ---- 3. five fix groups rise out of a toolbox ---- */
  SC.toolbox = {
    dur: 8, still: 8,
    build(svg, api) {
      const NAMES = ["Engines", "Browser", "Webhooks", "Windows", "Around the app"], OFF = [-24, 18, -10, 24, -16];
      const T = NAMES.map((_, i) => 1.3 + i * 0.9);
      const tags = NAMES.map((s, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -150, y: -25, width: 300, height: 50, rx: 25, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: -124, cy: 0, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, -106, 8.5, s, { "font-size": 24, "font-weight": 700 });
        const tick = el("g", {}, g);
        el("circle", { r: 15, fill: "#fff", stroke: INK, "stroke-width": 2 }, tick);
        el("path", { d: "M-7 0 L-2 6 L8 -6", stroke: BLUE, "stroke-width": 4.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
        return { g, tick, slot: 82 + i * 64 };
      });
      const box = el("g", {}, svg);
      el("rect", { x: 236, y: 372, width: 328, height: 182, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, box);
      el("rect", { x: 250, y: 432, width: 300, height: 108, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      el("path", { d: "M250 470 H550", stroke: INK, "stroke-width": 2.5 }, box);
      el("rect", { x: 384, y: 458, width: 32, height: 24, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, box);
      const lid = el("g", {}, box);
      el("path", { d: "M360 410 V394 Q360 386 368 386 H432 Q440 386 440 394 V410", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, lid);
      el("rect", { x: 250, y: 410, width: 300, height: 22, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, lid);
      el("circle", { cx: 254, cy: 432, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, box);
      let man = null, lastT = 0;
      button(box, "Toolbox. Lift the next tag", () => {
        const now = api.now();
        if (!man) man = T.map((s) => (lastT >= s ? -1e9 : null));
        const nxt = man.indexOf(null);
        if (nxt < 0) { man = man.map(() => null); man[0] = now; } else man[nxt] = now;
        api.poke();
      });
      return (t, now) => {
        lastT = t;
        const k = man ? 1 : io(seg(t, 0.3, 1));
        lid.setAttribute("transform", `rotate(${-120 * k} 254 432)`);
        tags.forEach((g, i) => {
          const s0 = man ? (man[i] == null ? 1e9 : man[i]) : T[i], c = man ? now : t;
          const r = ob(seg(c, s0, s0 + 0.7)), tk = ob(seg(c, s0 + 0.55, s0 + 0.85));
          tf(g.g, 400 + OFF[i] * r, 490 + (g.slot - 490) * r);
          tf(g.tick, 120, 0, tk);
          g.tick.setAttribute("opacity", tk > 0 ? 1 : 0);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3, still: 3,
    build(svg) {
      el("rect", { x: 64, y: 52, width: 124, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 126, 80, "Release", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 80, "17 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 214, "Munder Difflin", { "font-family": MONO, "font-size": 62, "font-weight": 700 });
      txt(svg, 64, 290, "0.5.10", { "font-family": MONO, "font-size": 62, "font-weight": 700 });
      el("path", { d: "M68 322 H250", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 384, "Sleeping agents and the Cloud Office", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const c = el("g", { transform: "translate(780 178) scale(0.5)" }, svg);
      el("path", { d: CLOUD, fill: SKY, stroke: INK, "stroke-width": 6, "stroke-linejoin": "round" }, c);
      el("path", { d: "M780 232 V334", stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      el("path", { d: "M780 232 V334", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, svg);
      el("rect", { x: 750, y: 266, width: 60, height: 34, rx: 9, fill: MINT, stroke: INK, "stroke-width": 2.5 }, svg);
      [662, 750, 838].forEach((x, i) => lamp(svg, x, 438, 0.8)(i ? 0 : 1));
      el("rect", { x: 646, y: 438, width: 268, height: 14, rx: 5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      return () => {};
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
