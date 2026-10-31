/* Bright coded scenes for "Gemini 4 Carbon". Vanilla JS, no library.
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
  // a transparent hit area plus a dashed focus ring, both the same box
  const hitbox = (g, x, y, w, h, r = 20) => {
    el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
  };
  const chip = (p, label, fill, w) => {
    const g = el("g", {}, p);
    el("rect", { x: -w / 2, y: -21, width: w, height: 42, rx: 21, fill, stroke: INK, "stroke-width": 2.5 }, g);
    txt(g, 0, 8, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
    return g;
  };

  const SC = {};

  /* ---- 1. two blocks drop onto a two step podium ---- */
  SC.podium = {
    dur: 8, still: 5,
    build(svg, api) {
      const stage = el("g", {}, svg);
      el("path", { d: "M80 500 H720", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, stage);
      el("rect", { x: 130, y: 380, width: 260, height: 120, fill: SOFT, stroke: INK, "stroke-width": 3 }, stage);
      el("rect", { x: 390, y: 260, width: 260, height: 240, fill: SOFT, stroke: INK, "stroke-width": 3 }, stage);
      const blocks = [
        { x: 160, top: 270, fill: SKY, name: "Argon", tag: "Open now", tagFill: MINT, tagW: 150, fall: 0.6 },
        { x: 420, top: 150, fill: LIL, name: "Carbon", tag: "Early access", tagFill: YEL, tagW: 190, fall: 2.2 },
      ].map((b) => {
        const g = el("g", {}, stage);
        el("rect", { x: b.x, y: b.top, width: 200, height: 110, rx: 14, fill: b.fill, stroke: INK, "stroke-width": 3 }, g);
        txt(g, b.x + 100, b.top + 67, b.name, { "text-anchor": "middle", "font-family": MONO, "font-size": 34, "font-weight": 700 });
        const tag = chip(stage, b.tag, b.tagFill, b.tagW);
        return Object.assign(b, { g, tag });
      });
      const hit = el("g", {}, svg);
      hitbox(hit, 70, 70, 660, 450);
      button(hit, "Replay the blocks dropping onto the podium", () => api.seek(0));
      return (t) => {
        const out = 1 - seg(t, 7.4, 8);
        blocks.forEach((b) => {
          const k = seg(t, b.fall, b.fall + 0.6), land = Math.sin(Math.PI * seg(t, b.fall + 0.6, b.fall + 0.9));
          const dy = -(b.top + 140) * (1 - k * k), cx = b.x + 100, by = b.top + 110;
          b.g.setAttribute("transform", `translate(0 ${dy}) translate(${cx} ${by}) scale(${1 + 0.08 * land} ${1 - 0.12 * land}) translate(${-cx} ${-by})`);
          b.g.setAttribute("opacity", t < b.fall ? 0 : out);
          const p = seg(t, b.fall + 0.9, b.fall + 1.3);
          tf(b.tag, cx, b.top - 44, 0.4 + 0.6 * ob(p));
          b.tag.setAttribute("opacity", p <= 0 ? 0 : Math.min(cl(p * 3), out));
        });
      };
    },
  };

  /* ---- 2. three ticket stubs tear off in rollout order ---- */
  SC.ticket = {
    dur: 8, still: 5.5,
    build(svg, api) {
      el("rect", { x: 40, y: 112, width: 720, height: 40, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const stubs = [
        { lines: ["Cyber", "defenders"], fill: YEL, tick: true },
        { lines: ["Trusted", "partners"], fill: SKY },
        { lines: ["Developers"], fill: LIL },
      ].map((s, i) => {
        const x = 65 + i * 240, g = el("g", {}, svg);
        el("path", { d: `M${x + 30} 156 V164 M${x + 160} 156 V164`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
        const card = el("g", {}, g);
        el("path", { d: "M0 0 H190 V136 A16 16 0 0 0 190 168 V290 H0 V168 A16 16 0 0 0 0 136 Z", fill: s.fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, card);
        el("path", { d: "M14 14 H176", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 7", "stroke-linecap": "round" }, card);
        el("path", { d: "M18 152 H172", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, card);
        s.lines.forEach((l, j) => txt(card, 95, (s.lines.length === 1 ? 92 : 74) + j * 36, l, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 }));
        const stamp = el("g", {}, card);
        if (s.tick) {
          el("circle", { r: 44, fill: MINT, stroke: INK, "stroke-width": 3 }, stamp);
          el("path", { d: "M-20 2 L-6 16 L20 -14", stroke: INK, "stroke-width": 7, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, stamp);
        } else {
          el("rect", { x: -64, y: -26, width: 128, height: 52, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 5" }, stamp);
          txt(stamp, 0, 9, "Later", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        }
        hitbox(g, x - 14, 160, 218, 400);
        const st = { x, card, stamp, at: 0.8 + i * 1.2, ov: null, k: 0, rot: i === 1 ? 2 : i === 0 ? -3 : 4 };
        button(g, `${s.lines.join(" ")}: tear off or put back`, () => {
          const now = api.now(); st.ov = { from: st.k, to: st.k < 0.5 ? 1 : 0, at: now }; api.poke();
        });
        return st;
      });
      return (t, now) => {
        stubs.forEach((s) => {
          let k;
          if (s.ov) k = s.ov.from + (s.ov.to - s.ov.from) * (api.calm ? 1 : oc(seg(now - s.ov.at, 0, 0.55)));
          else k = oc(seg(t, s.at, s.at + 0.7)) * (1 - io(seg(t, 7.3, 7.9)));
          s.k = k;
          s.card.setAttribute("transform", `translate(${s.x} ${166 + 70 * k}) rotate(${s.rot * k} 95 0)`);
          const p = seg(k, 0.55, 1);
          tf(s.stamp, 95, 222, p <= 0 ? 0.001 : 0.3 + 0.7 * ob(p), -8);
          s.stamp.setAttribute("opacity", cl(p * 3));
        });
      };
    },
  };

  /* ---- 3. a balance scale tips as two weights land ---- */
  SC.scale = {
    dur: 8, still: 5.5,
    build(svg, api) {
      const P = [400, 120], HALF = 210, HANG = 190;
      const g = el("g", {}, svg);
      el("path", { d: "M394 120 H406 V440 H394 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      el("path", { d: "M330 470 L350 440 H450 L470 470 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      const beam = el("g", {}, g);
      el("rect", { x: -HALF - 6, y: -7, width: 2 * HALF + 12, height: 14, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, beam);
      const pans = [
        { name: "Argon", pct: "0.7%", fill: SKY, side: -1, land: 1.1 },
        { name: "Carbon", pct: "0.0%", fill: LIL, side: 1, land: 2.5 },
      ].map((w) => {
        const pan = el("g", {}, g);
        el("path", { d: `M0 ${-HANG} L-110 0 M0 ${-HANG} L110 0`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, pan);
        el("circle", { cx: 0, cy: -HANG, r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pan);
        const wt = el("g", {}, pan);
        el("path", { d: "M-14 -96 A14 14 0 0 1 14 -96", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, wt);
        el("path", { d: "M-45 -96 H45 L65 -8 Q66 0 58 0 H-58 Q-66 0 -65 -8 Z", fill: w.fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, wt);
        txt(wt, 0, -60, w.name, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        txt(wt, 0, -20, w.pct, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        el("path", { d: "M-110 0 Q0 34 110 0 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pan);
        return Object.assign(w, { pan, wt });
      });
      el("circle", { cx: P[0], cy: P[1], r: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
      const card = el("g", {}, svg);
      el("rect", { x: 230, y: 500, width: 340, height: 60, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 400, 539, "Prompt injection", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      hitbox(g, 60, 24, 680, 462);
      button(g, "Drop the weights onto the scale again", () => api.seek(0));
      const sp = (x) => (x <= 0 ? 0 : 1 - Math.exp(-3.5 * x) * Math.cos(8 * x));
      return (t) => {
        const out = io(seg(t, 7.3, 7.9));
        const a = (-13 * sp(t - pans[0].land) + 3 * sp(t - pans[1].land)) * (1 - out), r = (a * Math.PI) / 180;
        beam.setAttribute("transform", `translate(${P[0]} ${P[1]}) rotate(${a})`);
        pans.forEach((w) => {
          const ex = P[0] + w.side * HALF * Math.cos(r), ey = P[1] + w.side * HALF * Math.sin(r);
          w.pan.setAttribute("transform", `translate(${ex} ${ey + HANG})`);
          const k = seg(t, w.land - 0.5, w.land);
          w.wt.setAttribute("transform", `translate(0 ${-420 * (1 - k * k) - 40 * out})`);
          w.wt.setAttribute("opacity", t < w.land - 0.5 ? 0 : 1 - out);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 64, width: 150, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 139, 93, "Concepts", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      txt(svg, 64, 214, "Gemini 4", { "font-size": 88, "font-weight": 700 });
      txt(svg, 64, 306, "Carbon", { "font-size": 88, "font-weight": 700 });
      el("path", { d: "M66 334 H330", stroke: LIL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 392, "Early access, Argon's price", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 452, "Checked 29 Oct 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      el("path", { d: "M540 470 H910", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 560, y: 380, width: 160, height: 90, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 720, y: 270, width: 160, height: 200, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      [[575, 300, SKY, "Argon"], [735, 190, LIL, "Carbon"]].forEach(([x, y, f, n]) => {
        el("rect", { x, y, width: 130, height: 80, rx: 12, fill: f, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, x + 65, y + 50, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      });
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
    let off = 0, raf = 0, seen = false, started = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    // reduced motion: replays keep the still frame, toggles snap instead of easing
    const api = { calm, now: clock, seek: (s) => { off = s - clock(); if (!calm) held = false; tick(); }, poke: () => { if (calm) { frame(); setTimeout(frame, 0); return; } held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (!started) { started = true; off = -clock(); } tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
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
