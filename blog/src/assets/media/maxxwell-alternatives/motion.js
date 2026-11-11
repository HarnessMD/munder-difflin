/* Bright coded scenes for "Maxxwell alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0;
  const nid = (p) => `mg-mx-${p}-${++uid}`;
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
  const D2R = Math.PI / 180;

  /* ---- a gear outline: n teeth on pitch radius r, teeth h above and below it ---- */
  const gearPath = (n, r, h) => {
    const p = (2 * Math.PI) / n, pts = [];
    for (let i = 0; i < n; i++) for (const [f, rr] of [[-0.5, r - h], [-0.27, r - h], [-0.15, r + h], [0.15, r + h], [0.27, r - h]]) pts.push(`${(Math.cos((i + f) * p) * rr).toFixed(1)} ${(Math.sin((i + f) * p) * rr).toFixed(1)}`);
    return `M${pts.join(" L")} Z`;
  };

  const SC = {};

  /* ---- 1. one orchestrator gear turns three agent gears ---- */
  SC.gears = {
    dur: 12, still: 12,
    build(svg, api) {
      const C = [268, 300], R1 = 140, R2 = 70, D = 212, K = R1 / R2, P2 = 360 / 12;
      const big = el("g", {}, svg);
      el("path", { d: gearPath(24, R1, 9), fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, big);
      for (let i = 0; i < 6; i++) el("circle", { cx: Math.cos((i * Math.PI) / 3) * 112, cy: Math.sin((i * Math.PI) / 3) * 112, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, big);
      el("circle", { cx: C[0], cy: C[1], r: 92, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, C[0], C[1] + 8, "Orchestrator", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const gears = [["Claude Code", YEL, -50], ["Codex", LIL, 0], ["Cursor Agent", MINT, 50]].map(([name, col, deg]) => {
        const x = C[0] + Math.cos(deg * D2R) * D, y = C[1] + Math.sin(deg * D2R) * D;
        const shadow = el("circle", { cx: x, cy: y, r: 79, fill: SOFT, opacity: 0 }, svg);
        const g = el("g", {}, svg), lift = el("g", {}, g);
        tf(g, x, y);
        el("circle", { r: 94, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, lift);
        const rot = el("g", {}, lift);
        el("path", { d: gearPath(12, R2, 9), fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, rot);
        for (let i = 0; i < 3; i++) el("circle", { cx: Math.cos((i * 2 * Math.PI) / 3) * 40, cy: Math.sin((i * 2 * Math.PI) / 3) * 40, r: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, rot);
        el("circle", { r: 17, fill: "#fff", stroke: INK, "stroke-width": 3 }, lift);
        const tw = name.length * 12 + 34;
        el("rect", { x: 98, y: -24, width: tw, height: 48, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 98 + tw / 2, 7, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { name, g, lift, rot, shadow, c: deg + 180 - P2 / 2 + K * deg, at: -99 };
      });
      gears.forEach((s) => button(s.g, `${s.name} gear: lift it off and let it spin on its own`, () => { if (api.now() - s.at > 2.2) s.at = api.now(); api.poke(); }));
      return (t, now) => {
        const th = (t / 12) * 360;
        tf(big, C[0], C[1], 1, th);
        gears.forEach((s) => {
          const e = now - s.at, on = e >= 0 && e < 2.2;
          const up = !on ? 0 : e < 1.6 ? oc(seg(e, 0, 0.35)) : e < 1.9 ? 1 - seg(e, 1.6, 1.9) ** 2 : -0.25 * Math.sin(seg(e, 1.9, 2.2) * Math.PI);
          const spin = on ? -720 * io(seg(e, 0.25, 1.65)) : 0;
          s.rot.setAttribute("transform", `rotate(${s.c - K * th + spin})`);
          tf(s.lift, 0, -16 * up, 1 + 0.1 * up);
          const u = Math.max(0, up);
          s.shadow.setAttribute("opacity", u); s.shadow.setAttribute("transform", `translate(${8 * u} ${12 * u})`);
        });
      };
    },
  };

  /* ---- 2. three balls on a tilted board: two land, one needs you ---- */
  SC.pinball = {
    dur: 9, still: 8,
    build(svg, api) {
      const board = el("g", {}, svg);
      el("path", { d: "M160 32 H640 L701 568 H99 Z", fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", "stroke-linejoin": "round" }, board);
      el("path", { d: "M170 44 H630 L688 556 H112 Z", fill: SOFT, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, board);
      [325, 375, 425, 475].forEach((x) => el("path", { d: `M${x} 60 V104`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, board));
      const bump = (x, y, r, col) => { el("circle", { cx: x, cy: y, r, fill: col, stroke: INK, "stroke-width": 3 }, board); el("circle", { cx: x, cy: y, r: r * 0.42, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, board); };
      bump(350, 215, 28, LIL); bump(530, 262, 32, SKY); bump(598, 142, 18, LIL); bump(218, 140, 18, SKY);
      const cup = (cx, top, bot, w) => el("path", { d: `M${cx - w / 2} ${top} V${bot - 22} Q${cx - w / 2} ${bot} ${cx - w / 2 + 22} ${bot} H${cx + w / 2 - 22} Q${cx + w / 2} ${bot} ${cx + w / 2} ${bot - 22} V${top}`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, board);
      cup(220, 326, 386, 104); cup(400, 428, 486, 104);
      const tag = (cx, cy, w, label, col) => { const g = el("g", {}, board); el("rect", { x: -w / 2, y: -19, width: w, height: 38, rx: 19, fill: col, stroke: INK, "stroke-width": 2.5 }, g); txt(g, 0, 7.5, label, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }); tf(g, cx, cy); return { g, cx, cy }; };
      const landed = tag(220, 418, 112, "Landed", MINT), needs = tag(400, 518, 140, "Needs you", YEL);
      const P = [
        ["M350 82 C 330 130 250 150 236 215 C 228 262 206 300 202 369", 0.6, 2.1],
        ["M400 82 C 398 130 320 140 290 175 C 262 210 244 300 238 369", 0.95, 2.5],
        ["M450 82 C 450 150 480 213 530 213 A 49 49 0 0 1 530 311 A 49 49 0 0 1 530 213 A 49 49 0 0 1 579 262 A 49 49 0 0 1 530 311 C 490 311 400 380 400 469", 1.3, 4.9],
      ].map(([d, a, b]) => { const p = el("path", { d, fill: "none", stroke: "none" }, board); return { p, L: p.getTotalLength(), a, b }; });
      const balls = P.map(() => {
        const g = el("g", {}, board);
        el("circle", { r: 15, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        el("ellipse", { cx: -5, cy: -6, rx: 6, ry: 4, fill: SKY, transform: "rotate(-30 -5 -6)" }, g);
        el("circle", { cx: -7, cy: -7.5, r: 2, fill: "#fff" }, g);
        return g;
      });
      button(board, "Pinball board: send all three balls back to the top", () => api.seek(0));
      return (t) => {
        const fin = oc(seg(t, 0, 0.45)), out = 1 - seg(t, 8.55, 8.95);
        P.forEach((q, i) => {
          const k = io(seg(t, q.a, q.b)), pt = q.p.getPointAtLength(q.L * k), hop = Math.sin(seg(t, q.b, q.b + 0.3) * Math.PI) * 7;
          tf(balls[i], pt.x, pt.y - hop, 0.6 + 0.4 * fin);
          balls[i].setAttribute("opacity", Math.min(fin, out));
        });
        const pop = (s) => Math.sin(seg(t, s, s + 0.35) * Math.PI) * 0.12;
        tf(landed.g, landed.cx, landed.cy, 1 + pop(P[0].b) + pop(P[1].b));
        tf(needs.g, needs.cx, needs.cy, 1 + pop(P[2].b));
      };
    },
  };

  /* ---- 3. five spinning tops, each with a paper flag that turns over ---- */
  SC.spinningtop = {
    dur: 6, still: 6,
    build(svg, api) {
      const T = [["Orca", "MIT", YEL], ["Munder Difflin", "Open source", BLUE], ["Paradev", "MIT", LIL], ["AionUi", "Apache 2.0", SKY], ["Agent Deck", "MIT", MINT]];
      const BODY = "M-56 -92 C -56 -54 -16 -30 0 0 C 16 -30 56 -54 56 -92 Z", FY = -242;
      const tops = T.map(([name, lic, col], i) => {
        const g = el("g", {}, svg);
        tf(g, 88 + i * 156, 452);
        el("rect", { x: -74, y: -312, width: 148, height: 324, rx: 20, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, g);
        el("ellipse", { cx: 0, cy: 2, rx: 46, ry: 9, fill: SOFT }, g);
        const whirl = el("ellipse", { cx: 0, cy: 2, rx: 32, ry: 6, fill: "none", stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "16 12", "stroke-linecap": "round" }, g);
        const wob = el("g", {}, g), id = nid("top");
        el("path", { d: BODY }, el("clipPath", { id }, wob));
        el("path", { d: BODY, fill: col }, wob);
        const sg = el("g", { "clip-path": `url(#${id})` }, wob);
        const stripes = [0, 1, 2, 3].map(() => [el("path", { fill: "none", stroke: INK, "stroke-width": 11, "stroke-linecap": "round" }, sg), el("path", { fill: "none", stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round" }, sg)]);
        el("path", { d: BODY, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, wob);
        el("ellipse", { cx: 0, cy: -92, rx: 56, ry: 13, fill: col, stroke: INK, "stroke-width": 3 }, wob);
        el("path", { d: "M0 -124 V-292", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, wob);
        el("circle", { cx: 0, cy: -296, r: 5.5, fill: col, stroke: INK, "stroke-width": 2.5 }, wob);
        el("rect", { x: -8, y: -128, width: 16, height: 36, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, wob);
        const flag = el("g", {}, wob);
        const face = (s) => {
          const f = el("g", {}, flag), ls = s.length > 8 ? s.split(" ") : [s];
          el("rect", { x: -66, y: FY - 42, width: 132, height: 84, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, f);
          ls.forEach((l, j) => txt(f, 0, FY + 7.5 + (j - (ls.length - 1) / 2) * 27, l, { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 }));
          return f;
        };
        const front = face(name), back = face(lic);
        return { g, wob, whirl, stripes, flag, front, back, from: 0, to: 0, at: -99, ph: i * 0.9, name };
      });
      const kk = (s, now) => s.from + (s.to - s.from) * io(seg(now - s.at, 0, 0.6));
      tops.forEach((s) => {
        s.g.setAttribute("aria-pressed", "false");
        button(s.g, `${s.name} top: turn its flag over to show its licence`, () => { const now = api.now(); s.from = kk(s, now); s.to = 1 - s.to; s.at = now; s.g.setAttribute("aria-pressed", s.to ? "true" : "false"); api.poke(); });
      });
      return (t, now) => {
        tops.forEach((s) => {
          s.wob.setAttribute("transform", `rotate(${2.5 * Math.sin((2 * Math.PI * t) / 3 + s.ph)})`);
          const th = 2 * Math.PI * t + s.ph;
          s.stripes.forEach((pair, j) => {
            const f = th + (j * Math.PI) / 2, sn = Math.sin(f), cs = Math.cos(f), d = `M${(56 * sn).toFixed(1)} ${(-92 + 13 * cs).toFixed(1)} Q${(44 * sn).toFixed(1)} ${(-48 + 6 * cs).toFixed(1)} 0 0`;
            pair.forEach((n) => { n.setAttribute("d", d); n.setAttribute("opacity", cs > 0 ? 1 : 0); });
          });
          s.whirl.setAttribute("stroke-dashoffset", (-t * 56).toFixed(1));
          const sx = Math.cos(Math.PI * kk(s, now));
          s.flag.setAttribute("transform", `translate(0 ${FY}) scale(${Math.max(Math.abs(sx), 0.02)} 1) translate(0 ${-FY})`);
          s.front.setAttribute("opacity", sx >= 0 ? 1 : 0); s.back.setAttribute("opacity", sx < 0 ? 1 : 0);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.2, still: 3.2,
    build(svg) {
      el("rect", { x: 64, y: 62, width: 168, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 148, 90, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 60, 196, "Maxxwell", { "font-size": 76, "font-weight": 700 });
      txt(svg, 60, 278, "alternatives", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 306 H470", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 362, "5 tools for running many", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 398, "coding agents at once", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 478, "Checked 11 Nov 2026", { "font-size": 19, "font-weight": 500, fill: CAP });
      el("rect", { x: 640, y: 62, width: 260, height: 58, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 770, 99, "Maxxwell", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700, fill: MUTE });
      const ys = [0, 1, 2, 3, 4].map((i) => 170 + i * 64), L = ys[4] - 120;
      const trunk = el("path", { d: `M664 120 V${ys[4]}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": `${L} ${L}` }, svg);
      const tiles = [["Orca", YEL], ["Munder Difflin", BLUE], ["Paradev", LIL], ["AionUi", SKY], ["Agent Deck", MINT]].map(([name, col], i) => {
        const tick = el("path", { d: `M664 ${ys[i]} H692`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
        const g = el("g", {}, svg);
        el("rect", { x: 692, y: ys[i] - 24, width: 208, height: 48, rx: 12, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 796, ys[i] + 7, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { g, tick, a: 0.35 + i * 0.3 };
      });
      return (t) => {
        trunk.setAttribute("stroke-dashoffset", (L * (1 - io(seg(t, 0.3, 1.9)))).toFixed(1));
        tiles.forEach((s) => { const k = ob(seg(t, s.a, s.a + 0.55)), o = seg(t, s.a, s.a + 0.25); s.g.setAttribute("transform", `translate(${48 * (1 - k)} 0)`); s.g.setAttribute("opacity", o); s.tick.setAttribute("opacity", o); });
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
