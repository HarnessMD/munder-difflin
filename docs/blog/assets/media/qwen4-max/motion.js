/* Bright coded scenes for "Qwen4-Max". Vanilla JS, no library.
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
  const wid = (n) => { try { return n.getComputedTextLength(); } catch (e) { return n.textContent.length * 12; } };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  // a see-through hit area that is also the dashed focus ring
  const hitbox = (svg, x, y, w, h, r = 24) => { const g = el("g", {}, svg); el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, g); return g; };

  const SC = {};

  /* ---- 1. an accordion stretches open to 1M tokens ---- */
  SC.accordion = {
    dur: 9, still: 9,
    build(svg, api) {
      const X0 = 120, X1 = 680, BH = 46, BOT = 500, OPEN = 240, SHUT = 22, N = 10;
      el("ellipse", { cx: 400, cy: 566, rx: 300, ry: 12, fill: SOFT }, svg);
      el("rect", { x: 250, y: 36, width: 300, height: 68, rx: 34, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const count = txt(svg, 400, 83, "", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      const bel = el("path", { fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const folds = el("path", { fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      el("rect", { x: X0, y: BOT, width: X1 - X0, height: BH, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 0; i < 7; i++) el("circle", { cx: 190 + i * 70, cy: BOT + 23, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      const top = el("g", {}, svg);
      el("rect", { x: X0, y: 0, width: X1 - X0, height: BH, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, top);
      el("path", { d: `M${X0 + 28} 23 H${X1 - 28}`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 12", "stroke-linecap": "round" }, top);
      const tags = ["2.4T backbone", "71B active", "Native vision"].map((s) => {
        const g = el("g", {}, svg), r = el("rect", { x: 0, y: 0, height: 40, rx: 10, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
        const n = txt(g, 0, 27, s, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 }), w = wid(n) + 30;
        r.setAttribute("width", w); n.setAttribute("x", w / 2); return { g, w };
      });
      let x = 400 - (tags.reduce((a, b) => a + b.w, 0) + 36) / 2;
      tags.forEach((tg) => { tg.x = x; x += tg.w + 18; });
      const hit = hitbox(svg, 96, 146, 608, 434);
      let sq = 0, on = false;
      button(hit, "Squeeze the accordion shut and open it again", () => { sq = api.now(); on = true; api.poke(); });
      return (t, now) => {
        const s = now - sq;
        if (on && s >= 2.6) { on = false; api.seek(6); return; }
        const p = on ? 1 - io(seg(s, 0, 1)) + io(seg(s, 1.4, 2.6)) : io(seg(t, 0.6, 3.4));
        const h = SHUT + (OPEN - SHUT) * p, ty = BOT - h - BH;
        const ys = Array.from({ length: N + 1 }, (_, i) => BOT - (h * i) / N), ins = (i) => (i % 2 ? 26 : 8);
        bel.setAttribute("d", ys.map((y, i) => `${i ? "L" : "M"}${X0 + 14 + ins(i)} ${y}`).join(" ") + " " + ys.map((y, i) => [X1 - 14 - ins(i), y]).reverse().map(([a, b]) => `L${a} ${b}`).join(" ") + " Z");
        folds.setAttribute("d", ys.slice(1, N).map((y, j) => `M${X0 + 14 + ins(j + 1)} ${y} H${X1 - 14 - ins(j + 1)}`).join(" "));
        tf(top, 0, ty);
        const v = Math.round(p * 1000);
        count.textContent = v >= 1000 ? "1M tokens" : v <= 0 ? "0 tokens" : `${v}K tokens`;
        tags.forEach((tg, i) => {
          const T = 3.9 + i * 0.45, k = on ? 1 : seg(t, T, T + 0.4), hop = on ? 0 : Math.sin(seg(t, T + 0.4, T + 0.65) * Math.PI) * 10;
          tf(tg.g, tg.x, ty - 44 - 60 * (1 - k * k) - hop);
          tg.g.setAttribute("opacity", on ? 1 : seg(t, T, T + 0.12));
        });
      };
    },
  };

  /* ---- 2. a price tag rides down a slide ---- */
  SC.slide = {
    dur: 8, still: 8,
    build(svg, api) {
      el("path", { d: "M50 548 H750", stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      const d = "M156 206 C290 206 250 470 360 470 H580";
      const path = el("path", { d, fill: "none", stroke: "none" }, svg), L = path.getTotalLength(), P = (f) => path.getPointAtLength(L * cl(f));
      const near = (x) => { let best = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const q = Math.abs(P(i / 400).x - x); if (q < bd) { bd = q; best = i / 400; } } return best; };
      const f0 = near(200), f1 = near(470);
      [0.45, 0.93].forEach((f) => { const p = P(f); el("path", { d: `M${p.x} ${p.y + 12} V548`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg); });
      [64, 120].forEach((x) => el("path", { d: `M${x} 206 V548`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, svg));
      for (let y = 250; y < 548; y += 50) el("path", { d: `M64 ${y} H120`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("rect", { x: 52, y: 198, width: 116, height: 16, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d, fill: "none", stroke: INK, "stroke-width": 34, "stroke-linecap": "round" }, svg);
      el("path", { d, fill: "none", stroke: BLUE, "stroke-width": 27, "stroke-linecap": "round" }, svg);
      el("path", { d, fill: "none", stroke: SKY, "stroke-width": 4, "stroke-linecap": "round", transform: "translate(0 -6)" }, svg);
      const A = "$4.43 per task", B = "$1.67 per task";
      const tag = el("g", {}, svg), inner = el("g", {}, tag);
      const tr = el("rect", { y: -71, height: 54, rx: 12, stroke: INK, "stroke-width": 3 }, inner);
      const tt = txt(inner, 10, -36, B, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const tw = wid(tt) + 60; tt.textContent = A; const tw2 = Math.max(tw, wid(tt) + 60);
      tr.setAttribute("x", -tw2 / 2); tr.setAttribute("width", tw2);
      el("circle", { cx: -tw2 / 2 + 18, cy: -44, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, inner);
      const end = P(f1), lab = txt(svg, 0, 0, "Qwen's own figure", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const lw = wid(lab), lx = end.x + tw2 / 2 + 16;
      if (lx + lw <= 780) { lab.setAttribute("x", lx); lab.setAttribute("y", end.y - 37); } else { lab.setAttribute("text-anchor", "middle"); lab.setAttribute("x", end.x); lab.setAttribute("y", end.y + 50); }
      const hit = hitbox(svg, 36, 120, 570, 440);
      const card = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: 440, y: 52, width: 316, height: 164, rx: 20, fill: SKY, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 470, 106, "Input $1.50", { "font-size": 30, "font-weight": 700 });
      txt(card, 470, 152, "Output $4.50", { "font-size": 30, "font-weight": 700 });
      txt(card, 470, 190, "per 1M tokens", { "font-size": 21, "font-weight": 500 });
      let open = false, tOn = -99;
      button(hit, "Show the price per 1M tokens", () => { open = !open; tOn = api.now(); hit.setAttribute("aria-pressed", open); api.poke(); });
      hit.setAttribute("aria-pressed", "false");
      return (t, now) => {
        const f = f0 + (f1 - f0) * io(seg(t, 1, 3.4)), p = P(f), a = P(f + 0.004), b = P(f - 0.004);
        tf(tag, p.x, p.y, 1, (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI);
        const sw = t >= 3.55, s = t < 1 ? ob(seg(t, 0.1, 0.6)) : 1 + 0.12 * Math.sin(seg(t, 3.4, 3.8) * Math.PI);
        inner.setAttribute("transform", `scale(${s})`); inner.setAttribute("opacity", t < 0.1 ? 0 : 1);
        tr.setAttribute("fill", sw ? MINT : YEL); tt.textContent = sw ? B : A;
        const k = oc(seg(t, 3.9, 4.5)); lab.setAttribute("opacity", k); lab.setAttribute("transform", `translate(${-12 * (1 - k)} 0)`);
        const c = open ? ob(seg(now - tOn, 0, 0.4)) : 1 - oc(seg(now - tOn, 0, 0.25));
        tf(card, 598 * (1 - c), 134 * (1 - c), Math.max(c, 0.001)); card.setAttribute("opacity", cl(c * 3));
      };
    },
  };

  /* ---- 3. a mailbox takes an envelope and answers with a card ---- */
  SC.mailbox = {
    dur: 8, still: 8,
    build(svg, api) {
      el("path", { d: "M110 566 H690", stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      el("rect", { x: 378, y: 500, width: 44, height: 64, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 295, y: 300, width: 210, height: 130, fill: SOFT }, svg);
      const card = el("g", {}, svg);
      el("rect", { x: -115, y: 0, width: 230, height: 74, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 0, 48, "qwen4-max", { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });
      const env = (s) => {
        const g = el("g", {}, svg);
        el("rect", { width: 190, height: 104, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M6 8 L95 58 L184 8", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        el("rect", { x: 18, y: 64, width: 154, height: 30, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, 95, 85, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        return g;
      };
      const E1 = env("Claude Code"), E2 = env("Qwen Code");
      el("path", { d: "M250 510 V270 Q250 200 320 200 H480 Q550 200 550 270 V510 Z M295 300 V430 H505 V300 Z", fill: SKY, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round", "fill-rule": "evenodd" }, svg);
      el("path", { d: "M306 224 H494", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, svg);
      el("rect", { x: 305, y: 446, width: 190, height: 46, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 400, 478, "QwenCloud", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      const drop = (g, k, hop) => tf(g, 305, -130 + 444 * k * k - hop);
      const hit = hitbox(svg, 232, 184, 336, 334, 28);
      let ev = 0, on = false;
      button(hit, "Send a second envelope from Qwen Code", () => { ev = api.now(); on = true; api.poke(); });
      return (t, now) => {
        const s = now - ev;
        if (on && s >= 4.2) { on = false; api.seek(4.5); return; }
        drop(E1, on ? 1 : seg(t, 0.5, 1.6), on ? 0 : Math.sin(seg(t, 1.6, 1.9) * Math.PI) * 12);
        E1.setAttribute("opacity", on || t >= 0.5 ? 1 : 0);
        if (on) { drop(E2, seg(s, 0.3, 1.4), Math.sin(seg(s, 1.4, 1.7) * Math.PI) * 12); E2.setAttribute("opacity", s < 0.3 ? 0 : 1 - seg(s, 3.6, 4.2)); }
        else E2.setAttribute("opacity", 0);
        const c = on ? (s < 1.9 ? 1 - io(seg(s, 0, 0.4)) : ob(seg(s, 1.9, 2.6))) : ob(seg(t, 2.3, 3));
        tf(card, 400, 218 - 122 * c); card.setAttribute("opacity", c > 0.005 ? 1 : 0);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4, once: true,
    build(svg) {
      const pill = el("rect", { x: 64, y: 44, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      pill.setAttribute("width", wid(txt(svg, 86, 73, "Concepts", { "font-size": 20, "font-weight": 700 })) + 44);
      txt(svg, 896, 73, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 60, 214, "Qwen4-Max", { "font-size": 104, "font-weight": 700 });
      el("path", { d: "M68 248 H290", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 64, 314, "", { "font-size": 25, "font-weight": 500, fill: MUTE });
      [["Price, specs and how to use it in ", 0], ["Claude Code", 1], [" and ", 0], ["Qwen Code", 1]].forEach(([s, m]) => { el("tspan", m ? { "font-family": MONO, "font-size": 23, "word-spacing": -6 } : {}, sub).textContent = s; });
      const sw = wid(sub); if (sw > 832) sub.setAttribute("transform", `translate(64 314) scale(${832 / sw}) translate(-64 -314)`);
      el("path", { d: "M64 458 H896", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      let x = 64;
      const tiles = [["1M context", SKY], ["$1.50 input", MINT], ["$4.50 output", LIL], ["Token Plan", YEL]].map(([s, c]) => {
        const g = el("g", {}, svg), r = el("rect", { x: 0, y: 402, height: 52, rx: 12, fill: c, stroke: INK, "stroke-width": 2.5 }, g);
        const n = txt(g, 0, 436, s, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), w = wid(n) + 40;
        r.setAttribute("width", w); n.setAttribute("x", w / 2);
        const o = { g, x, w }; x += w + 20; return o;
      });
      return (t) => tiles.forEach((tl, i) => {
        const k = seg(t, 0.3 + i * 0.6, 1.1 + i * 0.6), from = 896 - tl.w;
        tf(tl.g, from + (tl.x - from) * oc(k), 0); tl.g.setAttribute("opacity", cl(k * 4));
      });
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
    let off = 0, raf = 0, seen = false, held = calm, begun = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    const pos = () => { const r = clock() + off; return sc.once ? Math.min(r, sc.dur) : ((r % sc.dur) + sc.dur) % sc.dur; };
    let draw = () => {};
    const frame = () => draw(held ? sc.still : pos(), clock());
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && !(sc.once && clock() + off >= sc.dur)) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && sc.once && !begun) { begun = true; off = -clock(); }
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
