/* Bright coded scenes for "Roo Code alternatives". Vanilla JS, no library.
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

  const flipper = () => { let user = null, cur = 0; return { get: (t0, now) => { cur = user ? user.from + (user.to - user.from) * io(seg(now - user.at, 0, 0.6)) : t0; return cur; }, tap: (now) => { user = { from: cur, to: cur > 0.5 ? 0 : 1, at: now }; } }; };
  const fit = (n, w) => { try { if (n.getComputedTextLength() > w) { n.setAttribute("textLength", w); n.setAttribute("lengthAdjust", "spacingAndGlyphs"); } } catch (e) {} return n; };

  const SC = {};

  /* ---- 1. the candle goes out and the card turns over ---- */
  SC.candle = {
    dur: 10, still: 9.8,
    build(svg, api) {
      const glow = el("circle", { cx: 240, cy: 214, r: 70, fill: YEL, opacity: 0.25 }, svg);
      el("ellipse", { cx: 240, cy: 482, rx: 150, ry: 30, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("ellipse", { cx: 240, cy: 474, rx: 96, ry: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M195 268 V466 Q240 482 285 466 V268", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("ellipse", { cx: 240, cy: 268, rx: 45, ry: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M212 278 V318 Q218 328 224 318 V280", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M240 266 V246", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const smoke = el("path", { d: "M240 244 C222 214 258 190 240 160 S222 104 244 70", fill: "none", stroke: MUTE, "stroke-width": 3.5, "stroke-linecap": "round", pathLength: 100, "stroke-dasharray": "100 100" }, svg);
      const flame = el("g", {}, svg);
      el("path", { d: "M0 -58 Q24 -20 20 2 Q16 22 0 22 Q-16 22 -20 2 Q-24 -20 0 -58 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, flame);
      el("path", { d: "M0 -22 Q9 -6 8 4 Q6 12 0 12 Q-6 12 -8 4 Q-9 -6 0 -22 Z", fill: "#fff" }, flame);
      const card = el("g", {}, svg);
      el("rect", { x: -164, y: -124, width: 338, height: 258, rx: 30, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, card);
      const inner = el("g", {}, card);
      el("rect", { x: -140, y: -100, width: 300, height: 220, rx: 22, fill: LIL, stroke: INK, "stroke-width": 3 }, inner);
      el("rect", { x: -150, y: -110, width: 300, height: 220, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, inner);
      const front = el("g", {}, inner);
      txt(front, 0, 14, "Roo Code", { "text-anchor": "middle", "font-family": MONO, "font-size": 40, "font-weight": 700 });
      const back = el("g", {}, inner);
      txt(back, 0, -50, "Shut down,", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      txt(back, 0, -12, "15 May 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      el("path", { d: "M-100 14 H100", stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, back);
      txt(back, 0, 50, "Final release", { "text-anchor": "middle", "font-size": 22, "font-weight": 500, fill: MUTE });
      txt(back, 0, 86, "v3.54.0", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
      tf(card, 570, 290);
      txt(svg, 570, 470, "tap the card", { "text-anchor": "middle", "font-size": 16, "font-weight": 500, fill: MUTE });
      const fl = flipper();
      button(card, "Roo Code card. Back: Shut down, 15 May 2026. Final release v3.54.0", () => { fl.tap(api.now()); api.poke(); });
      return (t, now) => {
        const s = 1 - io(seg(t, 1.6, 4.2));
        flame.setAttribute("transform", `translate(240 246) scale(${s * (1 + 0.05 * Math.sin(t * 13))} ${s * (1 + 0.07 * Math.sin(t * 9))}) translate(0 -22)`);
        flame.setAttribute("opacity", s > 0.03 ? 1 : 0);
        glow.setAttribute("r", 70 * s); glow.setAttribute("opacity", 0.25 * s);
        const sm = seg(t, 4.0, 5.8);
        smoke.setAttribute("stroke-dashoffset", 100 * (1 - oc(sm)));
        smoke.setAttribute("opacity", sm <= 0 ? 0 : 0.9 - 0.6 * seg(t, 5.8, 8.5));
        smoke.setAttribute("transform", `translate(${4 * Math.sin(t * 1.5) * sm} ${-5 * seg(t, 4, 10)})`);
        const f = fl.get(io(seg(t, 6, 7.1)), now), c = Math.cos(Math.PI * f);
        inner.setAttribute("transform", `scale(${Math.max(Math.abs(c), 0.01)} 1)`);
        front.setAttribute("opacity", c >= 0 ? 1 : 0); back.setAttribute("opacity", c < 0 ? 1 : 0);
      };
    },
  };

  /* ---- 2. coats drop onto a rail of hooks, one hook stays empty ---- */
  SC.hooks = {
    dur: 9.5, still: 9.3,
    build(svg, api) {
      const NAMES = [["ZooCode"], ["Munder", "Difflin"], ["Cline"], ["Kilo Code"], ["Roomote"], ["Claude Code"]];
      const RUNS = [["VS Code,", "JetBrains", "beta"], ["Your", "computer"], ["VS Code,", "JetBrains,", "CLI,", "desktop"], ["VS Code,", "JetBrains,", "CLI"], ["Your own", "infrastructure,", "or hosted"], ["Terminal,", "IDE,", "desktop,", "browser"]];
      const COL = [YEL, BLUE, LIL, SKY, MINT, YEL];
      const X = (i) => 70 + i * 110, HY = 166;
      el("rect", { x: 22, y: 100, width: 756, height: 36, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M50 112 H190 M250 124 H410 M470 112 H630 M680 124 H756", stroke: INK, "stroke-width": 2, "stroke-opacity": 0.3, "stroke-linecap": "round" }, svg);
      for (let i = 0; i < 7; i++) {
        const x = X(i);
        el("path", { d: `M${x} 134 V160 Q${x} 176 ${x + 13} 171`, stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, svg);
        el("circle", { cx: x, cy: 124, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      }
      const tag = (g, faded) => {
        el("rect", { x: -52, y: 0, width: 104, height: 114, rx: 9, fill: "#fff", stroke: faded ? MUTE : INK, "stroke-width": 2.5, "stroke-dasharray": faded ? "5 5" : "none" }, g);
        el("circle", { cx: 0, cy: 12, r: 4, fill: "#fff", stroke: faded ? MUTE : INK, "stroke-width": 2 }, g);
      };
      const lines = (g, arr, a) => arr.map((s, k) => fit(txt(g, 0, 67 - (arr.length - 1) * (a.lh / 2) + k * a.lh, s, Object.assign({ "text-anchor": "middle" }, a.attrs)), 94));
      const coats = NAMES.map((nm, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -55, y: -8, width: 110, height: 304, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
        el("path", { d: "M0 0 V12", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        el("path", { d: "M-14 10 Q0 20 14 10 L44 26 Q48 28 48 34 L50 150 Q50 156 44 156 H-44 Q-50 156 -50 150 L-48 34 Q-48 28 -44 26 Z", fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-14 10 L0 46 L14 10 M0 46 V156", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }, g);
        [72, 100, 128].forEach((y) => el("circle", { cx: 7, cy: y, r: 3.2, fill: INK }, g));
        el("path", { d: "M0 150 V178", stroke: INK, "stroke-width": 2 }, g);
        const tg = el("g", {}, g), inner = el("g", {}, tg);
        tag(inner, false);
        const front = el("g", {}, inner), back = el("g", {}, inner);
        lines(front, nm, { lh: 20, attrs: { "font-family": MONO, "font-size": 14, "font-weight": 700 } });
        lines(back, RUNS[i], { lh: 18, attrs: { "font-size": 13, "font-weight": 500 } });
        const fl = flipper();
        button(g, `${nm.join(" ")}: ${RUNS[i].join(" ")}`, () => { fl.tap(api.now()); api.poke(); });
        return { g, tg, inner, front, back, fl, d: 0.5 + i * 0.9 };
      });
      const empty = el("g", {}, svg);
      el("path", { d: "M0 0 V176", stroke: MUTE, "stroke-width": 2 }, empty);
      const et = el("g", { opacity: 0.6 }, empty);
      tag(et, true);
      txt(et, 0, 57, "Roo Code,", { "text-anchor": "middle", "font-family": MONO, "font-size": 14, "font-weight": 700, fill: MUTE });
      txt(et, 0, 77, "Archived", { "text-anchor": "middle", "font-size": 14, "font-weight": 600, fill: MUTE });
      txt(svg, 400, 548, "tap a coat", { "text-anchor": "middle", "font-size": 16, "font-weight": 500, fill: MUTE });
      const swing = (u) => (u > 0 ? 10 * Math.exp(-u * 3) * Math.sin(u * 10) : 0);
      return (t, now) => {
        coats.forEach((c, i) => {
          const k = seg(t, c.d, c.d + 0.55), u = t - c.d - 0.55;
          tf(c.g, X(i), HY - 260 * (1 - ob(k)), 1, swing(u) * 0.3);
          c.g.setAttribute("opacity", seg(t, c.d, c.d + 0.1));
          c.tg.setAttribute("transform", `translate(0 178) rotate(${swing(u - 0.1)})`);
          const cs = Math.cos(Math.PI * c.fl.get(0, now));
          c.inner.setAttribute("transform", `scale(${Math.max(Math.abs(cs), 0.01)} 1)`);
          c.front.setAttribute("opacity", cs >= 0 ? 1 : 0); c.back.setAttribute("opacity", cs < 0 ? 1 : 0);
        });
        const e = seg(t, 6.0, 6.8);
        tf(empty, X(6), 168); empty.setAttribute("opacity", e);
        et.setAttribute("transform", `translate(0 176) rotate(${swing(t - 6.4) * 0.6})`);
      };
    },
  };

  /* ---- 3. chairs fill in around a long table ---- */
  SC.chairs = {
    dur: 12, still: 11.8,
    build(svg, api) {
      const TB = { x: 150, y: 215, w: 500, h: 170 };
      const spots = [];
      [200, 300, 400, 500, 600].forEach((x) => { spots.push([x, 192, 0, 0]); spots.push([x, 408, 180, 0]); });
      [250, 350, 450, 550].forEach((x) => { spots.push([x, 192, 0, 1]); spots.push([x, 408, 180, 1]); });
      [265, 335].forEach((y) => { spots.push([122, y, -90, 1]); spots.push([678, y, 90, 1]); });
      for (let x = 175; x <= 625; x += 50) { spots.push([x, 146, 0, 2]); spots.push([x, 454, 180, 2]); }
      const PC = [BLUE, LIL, MINT], cnt = [0, 0, 0];
      const table = el("g", {}, svg);
      el("rect", { x: TB.x - 12, y: TB.y - 12, width: TB.w + 24, height: TB.h + 24, rx: 30, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, table);
      el("rect", { x: TB.x, y: TB.y, width: TB.w, height: TB.h, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, table);
      el("path", { d: "M178 236 H330 M470 236 H620 M178 366 H300 M500 366 H620", stroke: INK, "stroke-width": 2, "stroke-opacity": 0.3, "stroke-linecap": "round" }, table);
      const card = el("g", {}, table);
      el("rect", { x: -134, y: -44, width: 280, height: 100, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, card);
      el("rect", { x: -140, y: -50, width: 280, height: 100, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      const l1 = txt(card, 0, -10, "", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const l2 = txt(card, 0, 30, "", { "text-anchor": "middle", "font-size": 28, "font-weight": 700, fill: MUTE });
      const TIERS = [["Up to 10 users", "Free"], ["11 to 50 users", "$249 a month"], ["51 to 100 users", "$499 a month"]];
      const chairs = spots.map(([x, y, r, ph]) => {
        const g = el("g", {}, svg);
        el("rect", { x: -16, y: -22, width: 32, height: 9, rx: 4.5, fill: PC[ph], stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: -14, y: -11, width: 28, height: 24, rx: 6, fill: PC[ph], stroke: INK, "stroke-width": 2.5 }, g);
        const d = ph === 0 ? 0.4 + cnt[0]++ * 0.28 : ph === 1 ? 4.2 + cnt[1]++ * 0.15 : 7.2 + cnt[2]++ * 0.1;
        const dx = r === -90 ? -220 : r === 90 ? 220 : 0, dy = r === 0 ? -240 : r === 180 ? 240 : 0;
        return { g, x, y, r, ph, d, dx, dy };
      });
      const sw2 = chairs.filter((c) => c.ph === 1)[0].d + 0.45, sw3 = chairs.filter((c) => c.ph === 2)[0].d + 0.45;
      tf(card, 400, 300);
      txt(svg, 756, 48, "tap the table", { "text-anchor": "end", "font-size": 16, "font-weight": 500, fill: MUTE });
      let lastT = 0, clr = null;
      button(table, "Long table. Up to 10 users, Free. 11 to 50 users, $249 a month. 51 to 100 users, $499 a month. Clear the extra chairs and count again.", () => { clr = { at: api.now(), t: lastT }; api.seek(3.6); });
      return (t, now) => {
        lastT = t;
        const back = clr && now - clr.at < 0.6 ? 1 - io(seg(now - clr.at, 0, 0.5)) : -1;
        chairs.forEach((c) => {
          let k = oc(seg(t, c.d, c.d + 0.45)), op = seg(t, c.d, c.d + 0.1);
          if (back >= 0 && c.ph > 0 && clr.t >= c.d + 0.45) { k = back; op = back; }
          tf(c.g, c.x + c.dx * (1 - k), c.y + c.dy * (1 - k), 1, c.r); c.g.setAttribute("opacity", op);
        });
        const tier = t >= sw3 ? 2 : t >= sw2 ? 1 : 0, sw = [0.2, sw2, sw3][tier];
        l1.textContent = TIERS[tier][0]; l2.textContent = TIERS[tier][1];
        const p = Math.sin(Math.PI * seg(t, sw, sw + 0.35));
        tf(card, 400, 300, 1 + 0.08 * p);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.6, still: 3.5,
    build(svg) {
      el("rect", { x: 64, y: 52, width: 150, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 139, 79, "Alternatives", { "text-anchor": "middle", "font-size": 18, "font-weight": 600 });
      txt(svg, 64, 172, "Roo Code alternatives", { "font-size": 66, "font-weight": 700 });
      el("path", { d: "M66 198 H430", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 248, "6 picks now that Roo Code is shut down", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 284, "Checked 4 Nov 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });
      el("rect", { x: 400, y: 318, width: 160, height: 44, rx: 12, fill: SOFT, stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "5 5" }, svg);
      txt(svg, 480, 346, "Roo Code", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700, fill: MUTE });
      const NAMES = ["ZooCode", "Munder Difflin", "Cline", "Kilo Code", "Roomote", "Claude Code"], COL = [YEL, BLUE, LIL, SKY, MINT, YEL];
      const tiles = NAMES.map((s, i) => {
        const x = 40 + i * 148, cx = x + 70;
        const ln = el("path", { d: `M480 362 C480 400 ${cx} 392 ${cx} 432`, stroke: MUTE, "stroke-width": 2, fill: "none", "stroke-dasharray": "3 6", "stroke-linecap": "round" }, svg);
        const g = el("g", {}, svg);
        el("rect", { x, y: 432, width: 140, height: 52, rx: 12, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, cx, 463, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 14, "font-weight": 700 });
        return { g, ln, d: 0.5 + i * 0.3 };
      });
      return (t) => tiles.forEach((o) => { const k = seg(t, o.d, o.d + 0.5); o.g.setAttribute("transform", `translate(0 ${40 * (1 - ob(k))})`); o.g.setAttribute("opacity", seg(t, o.d, o.d + 0.15)); o.ln.setAttribute("opacity", seg(t, o.d, o.d + 0.3)); });
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
