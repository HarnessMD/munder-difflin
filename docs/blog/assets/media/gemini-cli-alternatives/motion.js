/* Bright coded scenes for "Gemini CLI alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
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
  /* a two sided card: p runs 0 (front) to 1 (back); it squeezes on one axis and swaps faces half way */
  const flipTo = (g, front, back, p, cx, cy, axis) => {
    const s = Math.max(0.03, Math.abs(Math.cos(Math.PI * p)));
    g.setAttribute("transform", axis === "x" ? `translate(${cx} 0) scale(${s} 1) translate(${-cx} 0)` : `translate(0 ${cy}) scale(1 ${s}) translate(0 ${-cy})`);
    front.setAttribute("display", p < 0.5 ? "inline" : "none"); back.setAttribute("display", p < 0.5 ? "none" : "inline");
  };
  /* a tap flips from whatever face shows now; the tap then owns that card */
  const tapFlip = () => {
    const st = { o: null, last: 0 };
    st.p = (auto, now) => { st.last = st.o ? st.o.from + (st.o.to - st.o.from) * io(seg(now - st.o.at, 0, 0.6)) : auto; return st.last; };
    st.tap = (now) => { const cur = Math.round(st.last); st.o = { from: cur, to: 1 - cur, at: now }; };
    return st;
  };
  const PICKS = [["Antigravity CLI", "Plan $0", YEL], ["Munder Difflin", "Free and open source", BLUE], ["Claude Code", "Pro from $17", LIL], ["Codex CLI", "Plus $20", SKY], ["OpenCode", "MIT", MINT], ["Qwen Code", "Apache 2.0", YEL]];

  const SC = {};

  /* ---- 1. a shop door sign swings, then flips to its other side ---- */
  SC.door = {
    dur: 10, still: 8.5,
    build(svg, api) {
      el("path", { d: "M70 552 H730", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("rect", { x: 196, y: 30, width: 408, height: 522, rx: 10, fill: SKY, stroke: INK, "stroke-width": 4 }, svg);
      el("rect", { x: 236, y: 438, width: 150, height: 90, rx: 8, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 414, y: 438, width: 150, height: 90, rx: 8, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 572, cy: 412, r: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const swing = el("g", {}, svg), card = el("g", {}, swing);
      el("path", { d: "M400 96 L292 172 M400 96 L508 172", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, card);
      el("rect", { x: 210, y: 160, width: 380, height: 232, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, card);
      const front = el("g", {}, card), back = el("g", {}, card);
      el("rect", { x: 220, y: 170, width: 360, height: 212, rx: 18, fill: YEL, stroke: INK, "stroke-width": 4 }, front);
      txt(front, 400, 230, "Gemini CLI", { "text-anchor": "middle", "font-family": MONO, "font-size": 36, "font-weight": 700 });
      el("path", { d: "M276 258 H524", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, front);
      txt(front, 400, 304, "Free and Google AI Pro:", { "text-anchor": "middle", "font-size": 24 });
      txt(front, 400, 340, "moved to Antigravity CLI", { "text-anchor": "middle", "font-size": 24 });
      el("rect", { x: 220, y: 170, width: 360, height: 212, rx: 18, fill: MINT, stroke: INK, "stroke-width": 4 }, back);
      txt(back, 400, 226, "Code Assist Standard", { "text-anchor": "middle", "font-size": 26 });
      txt(back, 400, 262, "and Enterprise:", { "text-anchor": "middle", "font-size": 26 });
      txt(back, 400, 342, "open", { "text-anchor": "middle", "font-size": 62, "font-weight": 700 });
      el("circle", { cx: 400, cy: 96, r: 7, fill: INK }, svg);
      const flip = tapFlip();
      button(card, "Flip the sign", () => { flip.tap(api.now()); api.poke(); });
      return (t, now) => {
        const ring = (s, a) => (s > 0 ? a * Math.exp(-1.1 * s) * Math.sin(s * 4.4) : 0);
        const tapAt = flip.o ? now - flip.o.at : -1;
        const a = ring(t, 9) + (flip.o ? ring(tapAt - 0.5, 5) : ring(t - 4.2, 5));
        swing.setAttribute("transform", `rotate(${a} 400 96)`);
        flipTo(card, front, back, flip.p(io(seg(t, 3.4, 4.2)) - io(seg(t, 9.2, 9.9)), now), 400, 0, "x");
      };
    },
  };

  /* ---- 2. a faucet fills two glasses and passes over the third ---- */
  SC.faucet = {
    dur: 10, still: 8.6,
    build(svg, api) {
      const X = [150, 400, 650], TOP = 300, BOT = 470, FULL = 140, uid = "mgf" + (SC._n = (SC._n || 0) + 1);
      el("rect", { x: 40, y: 140, width: 720, height: 12, rx: 6, fill: SOFT }, svg);
      el("rect", { x: 30, y: BOT, width: 740, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const stream = el("rect", { x: -7, width: 14, rx: 7, fill: SKY }, svg);
      const drops = [0, 1, 2].map(() => el("circle", { r: 5, fill: SKY, stroke: INK, "stroke-width": 1.5 }, svg));
      const LAB = [["Standard,", "1,500 requests a day"], ["Enterprise,", "2,000 requests a day"], ["Free"]];
      const water = X.map((cx, i) => {
        const shape = `M${cx - 60} ${TOP} L${cx - 48} ${BOT} H${cx + 48} L${cx + 60} ${TOP}`;
        const cp = el("clipPath", { id: `${uid}${i}` }, svg); el("path", { d: shape + " Z" }, cp);
        const w = el("g", { "clip-path": `url(#${uid}${i})` }, svg);
        const body = el("rect", { x: cx - 62, width: 124, height: 180, fill: SKY }, w);
        const top = el("rect", { x: cx - 62, width: 124, height: 6, fill: BLUE }, w);
        el("path", { d: shape, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
        el("path", { d: `M${cx - 40} ${TOP + 22} L${cx - 34} ${BOT - 26}`, stroke: SOFT, "stroke-width": 6, "stroke-linecap": "round" }, svg);
        txt(svg, cx, 530, LAB[i][0], { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
        if (LAB[i][1]) txt(svg, cx, 560, LAB[i][1], { "text-anchor": "middle", "font-size": 19, "font-weight": 500, fill: MUTE });
        return (lv) => { const y = BOT - FULL * lv; body.setAttribute("y", y); top.setAttribute("y", y); body.setAttribute("opacity", lv > 0.01 ? 1 : 0); top.setAttribute("opacity", lv > 0.01 ? 1 : 0); return y; };
      });
      const tap = el("g", {}, svg);
      el("rect", { x: -34, y: 22, width: 136, height: 132, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, tap);
      el("path", { d: "M58 128 V72 Q58 40 28 40 Q0 40 0 70 V110", stroke: INK, "stroke-width": 21, fill: "none", "stroke-linecap": "round" }, tap);
      el("path", { d: "M58 128 V72 Q58 40 28 40 Q0 40 0 70 V110", stroke: BLUE, "stroke-width": 13, fill: "none", "stroke-linecap": "round" }, tap);
      el("rect", { x: -12, y: 106, width: 24, height: 16, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 3 }, tap);
      el("rect", { x: 36, y: 126, width: 44, height: 14, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 3 }, tap);
      const lever = el("g", {}, tap);
      el("path", { d: "M58 90 L86 76", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, lever);
      el("circle", { cx: 88, cy: 75, r: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, lever);
      button(tap, "Pour again", () => api.seek(0.6));
      const POUR = [[1.45, 3.3], [4.25, 6.1]];
      return (t) => {
        let hx = 400 - 250 * io(seg(t, 0.6, 1.4)) + 250 * io(seg(t, 3.4, 4.2)) + 250 * io(seg(t, 6.2, 7)) - 250 * io(seg(t, 9.2, 9.9));
        tap.setAttribute("transform", `translate(${hx} 0)`);
        const drain = 1 - seg(t, 9.2, 9.8);
        const wl = POUR.map(([a, b], i) => water[i](oc(seg(t, a + 0.15, b)) * drain));
        water[2](0);
        let on = -1; POUR.forEach(([a, b], i) => { if (t >= a && t <= b + 0.2) on = i; });
        const open = on < 0 ? 0 : seg(t, POUR[on][0] - 0.2, POUR[on][0]) * (1 - seg(t, POUR[on][1], POUR[on][1] + 0.2));
        lever.setAttribute("transform", `rotate(${-24 * open} 58 90)`);
        if (on < 0) { stream.setAttribute("opacity", 0); drops.forEach((d) => d.setAttribute("opacity", 0)); return; }
        const [a, b] = POUR[on], y0 = 122, y1 = wl[on], top = y0 + (y1 - y0) * seg(t, b, b + 0.2), bot = y0 + (y1 - y0) * seg(t, a, a + 0.2);
        stream.setAttribute("opacity", 1); stream.setAttribute("x", X[on] - 7); stream.setAttribute("y", top); stream.setAttribute("height", Math.max(0, bot - top));
        drops.forEach((d, i) => { const ph = (t * 3 + i / 3) % 1, live = t > a + 0.2 && t < b; d.setAttribute("cx", X[on] + (i - 1) * 22 * ph); d.setAttribute("cy", y1 - 26 * Math.sin(ph * Math.PI)); d.setAttribute("opacity", live ? 1 - ph : 0); });
      };
    },
  };

  /* ---- 3. six fridge magnets slide on, then flip to show a second line ---- */
  SC.magnets = {
    dur: 10, still: 8.8,
    build(svg, api) {
      el("rect", { x: 110, y: 12, width: 580, height: 576, rx: 30, fill: SOFT, stroke: INK, "stroke-width": 4 }, svg);
      el("rect", { x: 636, y: 190, width: 18, height: 220, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const X = 170, W = 400, H = 72, cx = X + W / 2;
      const mags = PICKS.map(([name, line, col], i) => {
        const y = 36 + i * 90, cy = y + H / 2, g = el("g", {}, svg), f = el("g", {}, g);
        el("rect", { x: X - 7, y: y - 7, width: W + 14, height: H + 14, rx: 24, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        const front = el("g", {}, f), back = el("g", {}, f);
        el("rect", { x: X, y, width: W, height: H, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, front);
        txt(front, cx, cy + 9, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
        el("rect", { x: X, y, width: W, height: H, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, back);
        el("circle", { cx: X + 30, cy, r: 10, fill: col, stroke: INK, "stroke-width": 2.5 }, back);
        txt(back, cx, cy - 7, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        txt(back, cx, cy + 22, line, { "text-anchor": "middle", "font-size": 21, "font-weight": 600 });
        const st = tapFlip();
        button(g, `${name}: ${line}`, () => { st.tap(api.now()); api.poke(); });
        return { g, f, front, back, cy, st, i };
      });
      return (t, now) => {
        const fade = 1 - seg(t, 9.4, 9.9);
        mags.forEach((m) => {
          const s = 0.2 + m.i * 0.28, k = ob(seg(t, s, s + 0.6));
          m.g.setAttribute("transform", `translate(${-640 * (1 - k)} 0) rotate(${-6 * (1 - k)} ${cx} ${m.cy})`);
          m.g.setAttribute("opacity", fade);
          const a = 2.6 + m.i * 0.55;
          flipTo(m.f, m.front, m.back, m.st.p(io(seg(t, a, a + 0.45)), now), cx, m.cy, "y");
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 24, still: 3.6,
    build(svg) {
      el("rect", { x: 64, y: 50, width: 164, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 146, 77, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 62, 170, "Gemini CLI alternatives", { "font-size": 62, "font-weight": 700 });
      txt(svg, 64, 228, "6 picks now the free tier has moved", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 264, "Checked 4 Nov 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      const gem = el("g", {}, svg);
      el("rect", { x: 64, y: 304, width: 170, height: 48, rx: 12, fill: SOFT, stroke: MUTE, "stroke-width": 2.5 }, gem);
      txt(gem, 149, 335, "Gemini CLI", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700, fill: MUTE });
      let x = 64; const Y = 424, tiles = PICKS.map(([name, , col]) => { const w = name.length * 9 + 28, c = x + w / 2; x += w + 12; return { name, col, w, c }; });
      const wire = el("path", { d: `M149 352 V392 M${tiles[0].c} 392 H${tiles[5].c} ${tiles.map((tl) => `M${tl.c} 392 V${Y}`).join(" ")}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const gs = tiles.map((tl) => {
        const g = el("g", {}, svg);
        el("rect", { x: tl.c - tl.w / 2, y: Y, width: tl.w, height: 50, rx: 12, fill: tl.col, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, tl.c, Y + 31, tl.name, { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 });
        return g;
      });
      return (t) => {
        gem.setAttribute("opacity", oc(seg(t, 0, 0.3)));
        wire.setAttribute("opacity", oc(seg(t, 0.25, 0.55)));
        gs.forEach((g, i) => { const s = 0.5 + i * 0.3, k = ob(seg(t, s, s + 0.55)); g.setAttribute("transform", `translate(0 ${70 * (1 - k)})`); g.setAttribute("opacity", seg(t, s, s + 0.2)); });
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
