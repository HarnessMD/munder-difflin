/* Bright coded scenes for "DeepSeek Harness alternatives". Vanilla JS, no library.
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

  const SC = {};

  /* ---- 1. a roller repaints a bench behind a wet paint card ---- */
  SC.paint = {
    dur: 9.5, still: 9.4,
    build(svg, api) {
      el("path", { d: "M40 578 H760", stroke: SOFT, "stroke-width": 8, "stroke-linecap": "round" }, svg);
      const bench = el("g", {}, svg);
      el("rect", { x: 106, y: 146, width: 588, height: 300, rx: 22, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 7", class: "mg-ring" }, bench);
      [[166, 160], [614, 160]].forEach(([x, y]) => el("rect", { x, y, width: 20, height: 150, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, bench));
      [170, 226].forEach((y) => el("rect", { x: 140, y, width: 520, height: 40, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, bench));
      [[164, 330], [614, 330]].forEach(([x, y]) => el("rect", { x, y, width: 22, height: 104, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, bench));
      const defs = el("defs", {}, svg), clip = el("clipPath", { id: "mgPaintWet" }, defs);
      const wipe = el("rect", { x: 120, y: 280, width: 0, height: 120 }, clip);
      const seatOld = el("rect", { x: 120, y: 298, width: 560, height: 36, rx: 9, fill: YEL }, bench);
      const wet = el("g", { "clip-path": "url(#mgPaintWet)" }, bench);
      const seatNew = el("rect", { x: 120, y: 298, width: 560, height: 36, rx: 9, fill: BLUE }, wet);
      const drips = [250, 410, 545].map((x) => el("path", { d: "", fill: BLUE }, wet));
      [[180, 260], [470, 540]].forEach(([a, b]) => el("path", { d: `M${a} 308 H${b}`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.8 }, wet));
      el("rect", { x: 120, y: 298, width: 560, height: 36, rx: 9, fill: "none", stroke: INK, "stroke-width": 3 }, bench);
      let coat = 0, again = false;
      button(bench, "Bench: send the roller across again", () => { coat++; again = true; api.seek(0.6); });
      const cols = () => [coat === 0 ? YEL : coat % 2 ? BLUE : LIL, coat % 2 ? LIL : BLUE];
      const roller = el("g", {}, svg);
      el("path", { d: "M40 -18 H56 V-64 L18 -100", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, roller);
      el("path", { d: "M18 -100 L-10 -128", stroke: INK, "stroke-width": 18, "stroke-linecap": "round" }, roller);
      el("path", { d: "M18 -100 L-10 -128", stroke: LIL, "stroke-width": 11, "stroke-linecap": "round" }, roller);
      const drum = el("rect", { x: -40, y: -34, width: 80, height: 34, rx: 15, fill: BLUE, stroke: INK, "stroke-width": 3 }, roller);
      el("path", { d: "M-28 -24 H22", stroke: "#fff", "stroke-width": 3.5, "stroke-linecap": "round", opacity: 0.7 }, roller);
      const card = el("g", {}, svg);
      el("rect", { x: 394, y: 536, width: 12, height: 42, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      el("rect", { x: 218, y: 404, width: 380, height: 140, rx: 16, fill: SOFT }, card);
      el("rect", { x: 210, y: 396, width: 380, height: 140, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      txt(card, 400, 442, "Wet paint", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      txt(card, 400, 478, "Developer preview", { "text-anchor": "middle", "font-size": 22, "font-weight": 500, fill: MUTE });
      const line2 = txt(card, 400, 514, "Compatibility breaking changes", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      return (t) => {
        const [from, to] = cols();
        seatOld.setAttribute("fill", from); seatNew.setAttribute("fill", to); drum.setAttribute("fill", to);
        drips.forEach((d) => d.setAttribute("fill", to));
        const down = oc(seg(t, 0.6, 1.2)), p = io(seg(t, 1.2, 5.2)), up = io(seg(t, 5.2, 5.9));
        const edge = 120 + 560 * p;
        wipe.setAttribute("width", edge - 120);
        drips.forEach((d, i) => { const x = [250, 410, 545][i], k = oc(seg(t, 1.2 + 4 * ((x - 120) / 560) + 0.2, 1.2 + 4 * ((x - 120) / 560) + 1.4)), h = 4 + 18 * k; d.setAttribute("d", `M${x - 6} 332 V${332 + h} a6 6 0 0 0 12 0 V332 Z`); });
        const x = edge + 40 * up, y = 298 - 70 * (1 - down) - 56 * up;
        tf(roller, x, y); roller.setAttribute("opacity", seg(t, 0.4, 0.8));
        const k = again ? 1 : oc(seg(t, 6.0, 6.6));
        line2.setAttribute("opacity", k); line2.setAttribute("transform", `translate(0 ${10 * (1 - k)})`);
      };
    },
  };

  /* ---- 2. a desk lamp, bright at peak and dim off peak ---- */
  SC.lamp = {
    dur: 10, still: 9.9,
    build(svg, api) {
      const beam = el("path", { d: "M-60 66 L60 66 L120 330 L-120 330 Z", fill: YEL }, svg);
      const glow = el("circle", { r: 54, fill: YEL }, svg);
      el("rect", { x: 0, y: 520, width: 800, height: 80, fill: "#fff" }, svg);
      el("path", { d: "M40 520 H760", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const lamp = el("g", {}, svg);
      el("path", { d: "M200 498 L150 340 L262 214", stroke: INK, "stroke-width": 9, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, lamp);
      el("path", { d: "M200 498 L150 340 L262 214", stroke: BLUE, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, lamp);
      el("ellipse", { cx: 200, cy: 506, rx: 92, ry: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, lamp);
      [[150, 340], [200, 498]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, lamp));
      const head = el("g", { transform: "translate(286 200) rotate(-24)" }, lamp);
      const bulb = el("circle", { cx: 0, cy: 62, r: 17, fill: YEL, stroke: INK, "stroke-width": 3 }, head);
      el("path", { d: "M-20 -6 H20 L62 62 H-62 Z", fill: BLUE, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, head);
      el("circle", { cx: 0, cy: -6, r: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, head);
      const a = -24 * Math.PI / 180, wp = (x, y) => [286 + x * Math.cos(a) - y * Math.sin(a), 200 + x * Math.sin(a) + y * Math.cos(a)];
      beam.setAttribute("transform", "translate(286 200) rotate(-24)");
      const [bx, by] = wp(0, 62); glow.setAttribute("cx", bx); glow.setAttribute("cy", by);
      const [cx, cy] = wp(44, 40);
      const cord = el("path", { d: "", stroke: INK, "stroke-width": 2.5 }, svg);
      const pull = el("g", {}, svg);
      el("circle", { r: 30, fill: "#fff", "fill-opacity": 0 }, pull);
      el("circle", { r: 24, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, pull);
      el("circle", { r: 10, fill: LIL, stroke: INK, "stroke-width": 3 }, pull);
      let lastT = 0;
      button(pull, "Pull cord: switch between peak and off peak", () => api.seek(lastT < 4.5 || lastT >= 9.4 ? 4.2 : 8.8));
      el("rect", { x: 448, y: 168, width: 330, height: 280, rx: 20, fill: YEL }, svg);
      el("rect", { x: 436, y: 156, width: 330, height: 280, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 601, 204, "Flash output, per 1M tokens", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      el("path", { d: "M460 226 H742", stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const band = el("rect", { x: 456, y: 0, width: 290, height: 70, rx: 16, fill: SOFT }, svg);
      const peak = txt(svg, 478, 300, "Peak $1.20", { "font-size": 36, "font-weight": 700 });
      const off = txt(svg, 478, 390, "Off peak $0.60", { "font-size": 36, "font-weight": 700 });
      return (t) => {
        lastT = t;
        const b = 1 - io(seg(t, 4.5, 5.1)) + io(seg(t, 9.1, 9.7));
        const tug = Math.sin(seg(t, 4.2, 4.6) * Math.PI) + Math.sin(seg(t, 8.8, 9.2) * Math.PI);
        const end = cy + 92 + 22 * tug;
        cord.setAttribute("d", `M${cx} ${cy} V${end}`); tf(pull, cx, end + 10);
        beam.setAttribute("opacity", 0.12 + 0.38 * b); glow.setAttribute("opacity", 0.55 * b);
        bulb.setAttribute("fill", b > 0.5 ? YEL : SOFT);
        band.setAttribute("y", 252 + 90 * (1 - io(b)));
        peak.setAttribute("fill", b > 0.5 ? INK : MUTE); off.setAttribute("fill", b > 0.5 ? MUTE : INK);
      };
    },
  };

  /* ---- 3. six keys on one ring, each tag flips to what it opens ---- */
  SC.keyring = {
    dur: 14, still: 13.9,
    build(svg, api) {
      const C = [400, 300], R = 52, TW = 220, TH = 72;
      const K = [["Claude Code", ["Claude models"], YEL], ["Munder Difflin", ["Models from", "its engines"], BLUE], ["Codex CLI", ["OpenAI models", "or an API key"], LIL], ["OpenCode", ["75+ providers"], SKY], ["Qwen Code", ["Any compatible API"], MINT], ["Pi", ["15+ providers"], YEL]];
      const pos = [[140, 140], [660, 140], [140, 300], [660, 300], [140, 460], [660, 460]];
      const flipAt = K.map((_, i) => 1.0 + i * 1.35), backAt = K.map((_, i) => 9.8 + i * 0.12);
      const tapAt = K.map(() => -99);
      const keys = K.map(([name, back, col], i) => {
        const [x, y] = pos[i], left = x < 400, hx = left ? x + TW / 2 - 16 : x - TW / 2 + 16;
        const ang = Math.atan2(y - C[1], hx - C[0]);
        const g = el("g", {}, svg);
        const str = el("path", { d: "", stroke: INK, "stroke-width": 2, fill: "none" }, g);
        const key = el("g", {}, g);
        el("rect", { x: 10, y: -6, width: 62, height: 12, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, key);
        el("path", { d: "M52 6 V14 H58 V6 M64 6 V12", stroke: INK, "stroke-width": 3, fill: "#fff", "stroke-linejoin": "round" }, key);
        const bow = el("circle", { r: 15, fill: col, stroke: INK, "stroke-width": 3 }, key);
        el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, key);
        const tag = el("g", {}, g);
        el("rect", { x: -TW / 2 - 6, y: -TH / 2 - 6, width: TW + 12, height: TH + 12, rx: 16, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 7", class: "mg-ring" }, tag);
        const card = el("g", {}, tag);
        const face = el("rect", { x: -TW / 2, y: -TH / 2, width: TW, height: TH, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
        el("circle", { cx: left ? TW / 2 - 16 : -TW / 2 + 16, cy: 0, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
        const tx = left ? -12 : 12;
        const front = txt(card, tx, 7, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        const backG = el("g", {}, card);
        back.forEach((s, j) => txt(backG, tx, (back.length === 1 ? 7 : -5) + j * 24, s, { "text-anchor": "middle", "font-size": 19, "font-weight": 600 }));
        const cap = txt(g, x, y + TH / 2 + 26, back.join(" "), { "text-anchor": "middle", "font-size": 16, "font-weight": 500, fill: CAP });
        tf(tag, x, y);
        button(g, `${name}: ${back.join(" ")}`, () => { tapAt[i] = api.now(); api.poke(); });
        return { key, bow, str, card, face, front, backG, cap, ang, hx, y, col };
      });
      const ring = el("g", {}, svg);
      el("circle", { cx: 0, cy: 0, r: R, fill: "none", stroke: INK, "stroke-width": 9 }, ring);
      el("circle", { cx: 0, cy: 0, r: R, fill: "none", stroke: SOFT, "stroke-width": 4 }, ring);
      el("path", { d: `M${R - 9} -4 L${R + 9} 4`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, ring);
      el("circle", { cx: 0, cy: -R, r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, ring);
      return (t, now) => {
        tf(ring, C[0], C[1], 1, 360 * io(seg(t, 0.6, 9.6)));
        keys.forEach((k, i) => {
          let p = seg(t, flipAt[i], flipAt[i] + 0.4) - seg(t, backAt[i], backAt[i] + 0.4);
          const s = now - tapAt[i];
          if (s >= 0 && s < 3) { const u = io(seg(s, 0, 0.35)) - io(seg(s, 2.6, 2.95)); p = p > 0.5 ? 1 - u : u; }
          const sway = Math.sin(t * 2.2 + i) * 3 * (1 - seg(t, 10, 11)), a = k.ang + sway * Math.PI / 180;
          const bx = C[0] + Math.cos(a) * R, by = C[1] + Math.sin(a) * R;
          tf(k.key, bx, by, 1, a * 180 / Math.PI);
          const ex = bx + Math.cos(a) * 66, ey = by + Math.sin(a) * 66;
          k.str.setAttribute("d", `M${ex} ${ey} Q${(ex + k.hx) / 2} ${(ey + k.y) / 2 + 14} ${k.hx} ${k.y}`);
          const sc = Math.abs(Math.cos(p * Math.PI)), showBack = p > 0.5;
          k.card.setAttribute("transform", `scale(1 ${Math.max(sc, 0.02)})`);
          k.front.setAttribute("opacity", showBack ? 0 : 1); k.backG.setAttribute("opacity", showBack ? 1 : 0);
          k.face.setAttribute("fill", showBack ? k.col : "#fff");
          k.bow.setAttribute("fill", showBack || t >= flipAt[i] ? k.col : "#fff");
          const c = oc(seg(t, 10.6, 11.2)); k.cap.setAttribute("opacity", c); k.cap.setAttribute("transform", `translate(0 ${8 * (1 - c)})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 3.9,
    build(svg) {
      el("rect", { x: 64, y: 50, width: 150, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 139, 76, "Alternatives", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      txt(svg, 896, 76, "Checked 2 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 16, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 168, "DeepSeek Harness", { "font-size": 66, "font-weight": 700 });
      txt(svg, 64, 240, "alternatives", { "font-size": 66, "font-weight": 700 });
      el("path", { d: "M66 262 H440", stroke: YEL, "stroke-width": 13, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 310, "6 picks by why you are leaving", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const top = el("g", {}, svg);
      el("rect", { x: 340, y: 342, width: 280, height: 46, rx: 12, fill: SOFT, stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "6 5" }, top);
      txt(top, 480, 371, "DeepSeek Harness", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700, fill: MUTE });
      const names = ["Claude Code", "Munder Difflin", "Codex CLI", "OpenCode", "Qwen Code", "Pi"], cols = [YEL, BLUE, LIL, SKY, MINT, YEL];
      const TW = 138, G = 10, x0 = (960 - (6 * TW + 5 * G)) / 2;
      const wires = el("path", { d: `M480 388 V414 M${x0 + TW / 2} 414 H${x0 + 5 * (TW + G) + TW / 2}` + names.map((_, i) => ` M${x0 + i * (TW + G) + TW / 2} 414 V444`).join(""), stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, svg);
      const tiles = names.map((n, i) => {
        const g = el("g", {}, svg), x = x0 + i * (TW + G);
        el("rect", { x, y: 444, width: TW, height: 50, rx: 12, fill: cols[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x + TW / 2, 474, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 14.5, "font-weight": 700 });
        return g;
      });
      return (t) => {
        wires.setAttribute("opacity", oc(seg(t, 0.2, 0.6)));
        tiles.forEach((g, i) => { const k = ob(seg(t, 0.4 + i * 0.25, 0.9 + i * 0.25)); g.setAttribute("transform", `translate(0 ${40 * (1 - k)})`); g.setAttribute("opacity", seg(t, 0.4 + i * 0.25, 0.7 + i * 0.25)); });
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
