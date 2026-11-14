/* Bright coded scenes for "Eigent alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", GREY = "#D9D0E4";
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
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, p);

  const SC = {};

  /* ---- 1. one task on a loom: every agent is a thread, one shuttle crosses them all ---- */
  SC.loom = {
    dur: 8.4, still: 8.4,
    build(svg, api) {
      const XS = [230, 315, 400, 485, 570], ROW = 30, BOT = 466, L0 = 204, L1 = 596, LX = 145, RX = 655, PD = 1.2;
      const RY = [0, 1, 2, 3].map((r) => BOT - ROW * r - ROW / 2), S = [0, 1, 2, 3].map((r) => 0.7 + r * 1.6);
      el("path", { d: "M332 84 V114 M468 84 V114", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 293, y: 35, width: 228, height: 54, rx: 14, fill: YEL }, svg);
      el("rect", { x: 286, y: 28, width: 228, height: 54, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 65, "One task", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      const loom = el("g", {}, svg);
      ring(loom, 34, 96, 732, 482, 24);
      const fr = { fill: LIL, stroke: INK, "stroke-width": 3 };
      [60, 714].forEach((x) => { el("rect", Object.assign({ x, y: 104, width: 26, height: 452, rx: 8 }, fr), loom); el("rect", Object.assign({ x: x - 16, y: 548, width: 58, height: 16, rx: 8 }, fr), loom); });
      const threads = XS.map(() => { const g = el("g", {}, loom); return [el("path", { stroke: INK, "stroke-width": 9, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g), el("path", { stroke: BLUE, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g)]; });
      el("rect", Object.assign({ x: 46, y: 112, width: 708, height: 28, rx: 10 }, fr), loom);
      el("rect", Object.assign({ x: 46, y: 466, width: 708, height: 28, rx: 10 }, fr), loom);
      [[73, 126], [727, 126], [73, 480], [727, 480]].forEach(([cx, cy]) => el("circle", { cx, cy, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, loom));
      const weave = el("g", {}, loom);
      const rows = [0, 1, 2, 3].map((r) => {
        const y = BOT - ROW * (r + 1), rect = el("rect", { x: L0, y, width: 0, height: ROW, fill: MINT, stroke: INK, "stroke-width": 2 }, weave);
        const segs = XS.map((x, j) => ((r + j) % 2 === 0 ? el("rect", { x: x - 4, y: y + 6, width: 8, height: ROW - 12, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 1.5 }, weave) : null));
        return { rect, segs };
      });
      XS.forEach((x) => { el("rect", { x: x - 37, y: 158, width: 74, height: 34, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, loom); txt(loom, x, 181, "Agent", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 }); });
      const sh = el("g", {}, loom);
      el("path", { d: "M-46 0 Q-26 -15 0 -15 Q26 -15 46 0 Q26 15 0 15 Q-26 15 -46 0 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, sh);
      el("rect", { x: -16, y: -5, width: 32, height: 10, rx: 5, fill: MINT, stroke: INK, "stroke-width": 2 }, sh);
      button(loom, "Loom: send the shuttle across again", () => api.seek(0.5));
      return (t) => {
        let sx = LX, sy = RY[3] + (RY[0] - RY[3]) * io(seg(t, 0.1, S[0] - 0.05)), act = -1;
        const span = [];
        for (let r = 0; r < 4; r++) {
          const s = S[r], e = s + PD, ltr = r % 2 === 0;
          if (t < s) { span[r] = null; continue; }
          const p = io(seg(t, s, e)), x = ltr ? LX + (RX - LX) * p : RX - (RX - LX) * p, c = cl(x, L0, L1);
          sx = x; sy = RY[r];
          if (t < e) act = r; else if (r < 3) sy = RY[r] + (RY[r + 1] - RY[r]) * io(seg(t, e + 0.05, S[r + 1] - 0.05));
          span[r] = ltr ? [L0, c] : [c, L1];
        }
        const old = t < 0.6;
        weave.setAttribute("opacity", old ? 1 - seg(t, 0, 0.5) : 1);
        rows.forEach((row, r) => {
          const sp = old ? [L0, L1] : span[r], w = sp ? sp[1] - sp[0] : 0;
          row.rect.setAttribute("x", sp ? sp[0] : L0); row.rect.setAttribute("width", w); row.rect.setAttribute("opacity", w > 0.5 ? 1 : 0);
          row.segs.forEach((n, j) => { if (n) n.setAttribute("opacity", sp && sp[0] <= XS[j] - 4 && sp[1] >= XS[j] + 4 ? 1 : 0); });
        });
        threads.forEach((pp, j) => {
          const x = XS[j], near = act >= 0 ? cl(1 - Math.abs(sx - x) / 50) : 0, dx = 10 * near * ((j + act) % 2 ? 1 : -1);
          const d = near > 0 ? `M${x} 140 L${x + dx} ${sy} L${x} 466` : `M${x} 140 V466`;
          pp.forEach((p) => p.setAttribute("d", d));
        });
        tf(sh, sx, sy);
      };
    },
  };

  /* ---- 2. credits as tokens: Plus and Pro jars fill to their lines, the Free jar stays open ---- */
  SC.tokenjar = {
    dur: 7, still: 7,
    build(svg, api) {
      const DUR = 7, SH = 420, RH = 24, COLS = [-70, -42, -14, 14, 42, 70];
      el("rect", { x: 34, y: SH, width: 732, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const shape = (cx, w, h) => { const x0 = cx - w / 2, x1 = cx + w / 2, y0 = SH - h, r = 26; return { x0, x1, y0, d: `M${x0} ${y0} V${SH - r} Q${x0} ${SH} ${x0 + r} ${SH} H${x1 - r} Q${x1} ${SH} ${x1} ${SH - r} V${y0}` }; };
      const back = (g, j) => {
        el("path", { d: j.d + " Z", fill: SKY, "fill-opacity": 0.3 }, g);
        el("path", { d: `M${j.x0 + 18} ${j.y0 + 30} V${SH - 50}`, stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round", opacity: 0.8 }, g);
      };
      const front = (g, j, w) => {
        el("path", { d: j.d, fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        el("rect", { x: j.x0 - 9, y: j.y0 - 14, width: w + 18, height: 16, rx: 8, fill: SKY, "fill-opacity": 0.55, stroke: INK, "stroke-width": 3.5 }, g);
      };
      const label = (g, cx, w, a, b) => {
        el("rect", { x: cx - w / 2, y: 450, width: w, height: 76, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, cx, 481, a, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        txt(g, cx, 510, b, { "text-anchor": "middle", "font-size": 17, "font-weight": 500 });
      };
      const jar = (cx, rowsN, a, b, n0, gap) => {
        const g = el("g", {}, svg), w = 190, j = shape(cx, w, 290);
        ring(g, cx - 124, 96, 248, 442, 20);
        back(g, j);
        const toks = Array.from({ length: rowsN * 6 }, (_, i) => {
          const row = Math.floor(i / 6), n = el("g", {}, g);
          el("circle", { r: 13, fill: YEL, stroke: INK, "stroke-width": 2.5 }, n);
          el("circle", { r: 6, fill: "none", stroke: INK, "stroke-width": 1.5 }, n);
          return { n, x: cx + COLS[i % 6] + (row % 2 ? 4 : -4), y: SH - 17 - row * RH, d: n0 + i * gap };
        });
        const ly = SH - 8 - rowsN * RH;
        const line = el("path", { d: `M${j.x0 - 12} ${ly} H${j.x1 + 12}`, stroke: INK, "stroke-width": 3, "stroke-dasharray": "9 7", "stroke-linecap": "round" }, g);
        front(g, j, w);
        label(g, cx, 228, a, b);
        const J = { off: null }, last = toks[toks.length - 1].d + 0.5;
        button(g, `${a}, ${b}: empty the jar and fill it again`, () => { J.off = api.now(); api.poke(); });
        return (t, now) => {
          const jt = J.off == null ? t : (now - J.off) % DUR;
          toks.forEach((k) => {
            let y = k.y, op = 1, s = 1;
            if (jt < 0.6) { const q = seg(jt, 0, 0.45); op = 1 - q; s = 1 - 0.5 * q; y = k.y - 20 * q; }
            else { const f = seg(jt, k.d, k.d + 0.5); y = 40 + (k.y - 40) * f * f - 5 * Math.sin(seg(jt, k.d + 0.5, k.d + 0.72) * Math.PI); op = seg(jt, k.d, k.d + 0.08); }
            tf(k.n, k.x, y, s); k.n.setAttribute("opacity", op);
          });
          const full = jt >= last;
          line.setAttribute("stroke-dasharray", full ? "none" : "9 7"); line.setAttribute("stroke-width", full ? 4 : 3);
        };
      };
      const plus = jar(168, 2, "Plus", "2,000 credits a month", 0.7, 0.3);
      const pro = jar(418, 10, "Pro", "10,000 credits a month", 0.7, 0.062);
      const free = el("g", {}, svg), fj = shape(664, 100, 150);
      back(free, fj);
      front(free, fj, 100);
      el("rect", { x: 538, y: 402, width: 56, height: 18, rx: 8, fill: SKY, "fill-opacity": 0.55, stroke: INK, "stroke-width": 3 }, free);
      label(free, 664, 196, "Free", "with your own keys");
      return (t, now) => { plus(t, now); pro(t, now); };
    },
  };

  /* ---- 3. a pegboard of tags, one per tool ---- */
  SC.pegboard = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      el("rect", { x: 24, y: 22, width: 752, height: 556, rx: 22, fill: SKY, "fill-opacity": 0.3, stroke: INK, "stroke-width": 3 }, svg);
      for (let r = 0; r < 15; r++) for (let c = 0; c < 20; c++) el("circle", { cx: 58 + c * 36, cy: 48 + r * 36, r: 3, fill: INK, opacity: 0.4 }, svg);
      el("rect", { x: 257, y: 55, width: 300, height: 58, rx: 14, fill: YEL }, svg);
      el("rect", { x: 250, y: 48, width: 300, height: 58, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 88, "Pick your tool", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      const TAGS = [["Closest app:", "AionUi"], ["Team of agents:", "Munder Difflin"], ["Group chat:", "Rowboat"], ["Pay for Claude:", "Claude Cowork"], ["Python:", "CrewAI"], ["Credits and models:", "Eigent"]];
      const tags = TAGS.map(([a, b], i) => {
        const cx = 150 + (i % 3) * 250, hy = i < 3 ? 194 : 416, g = el("g", {}, svg);
        const halo = el("rect", { x: -117, y: -27, width: 234, height: 142, rx: 22, fill: MINT }, g);
        ring(g, -124, -34, 248, 156, 26);
        el("rect", { x: -108, y: -18, width: 216, height: 124, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("circle", { r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 46, a, { "text-anchor": "middle", "font-size": 18, "font-weight": 500 });
        txt(g, 0, 82, b, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        el("path", { d: `M${cx} ${hy - 30} V${hy + 1}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
        el("circle", { cx, cy: hy - 30, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        const T = { g, halo, cx, hy, kick: -99 };
        button(g, `${a} ${b}`, () => { T.kick = api.now(); api.poke(); });
        return T;
      });
      const swing = (u) => (u < 0 || u > 2.2 ? 0 : 8 * Math.sin(u * 2 * Math.PI * 1.4) * Math.exp(-2.3 * u));
      return (t, now) => {
        tags.forEach((T, i) => {
          const s = 0.7 + i, k = now - T.kick, kicked = k >= 0 && k < 2.2;
          const glow = kicked ? 1 : t < s ? 1 - seg(t, 0, 0.45) : oc(seg(t, s + 0.1, s + 0.5));
          tf(T.g, T.cx, T.hy, 1, kicked ? swing(k) : swing(t - s)); T.halo.setAttribute("opacity", glow);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 168, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 148, 72, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 72, "Checked 14 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 180, "Eigent alternatives", { "font-size": 72, "font-weight": 700 });
      el("path", { d: "M66 208 H300", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 262, "5 tools like Eigent for teams of AI agents", { "font-size": 26, "font-weight": 500, fill: MUTE });
      el("rect", { x: 390, y: 318, width: 180, height: 50, rx: 12, fill: GREY, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 480, 351, "Eigent", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      const ALT = [["AionUi", SKY], ["Munder Difflin", YEL], ["Rowboat", LIL], ["Claude Cowork", MINT], ["CrewAI", BLUE]];
      const tiles = ALT.map(([name, col], i) => {
        const cx = 140 + i * 170;
        const line = el("path", { d: `M480 368 V400 H${cx} V432`, stroke: INK, "stroke-width": 2, fill: "none", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": 1 }, svg);
        const g = el("g", {}, svg);
        el("rect", { x: cx - 80, y: 432, width: 160, height: 46, rx: 12, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, cx, 461, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        return { line, g, s: 0.6 + i * 0.28 };
      });
      return (t) => {
        tiles.forEach((T) => {
          const k = ob(seg(t, T.s, T.s + 0.6));
          T.line.setAttribute("stroke-dashoffset", 1 - seg(t, T.s - 0.1, T.s + 0.4));
          T.g.setAttribute("transform", `translate(0 ${40 * (1 - k)})`); T.g.setAttribute("opacity", seg(t, T.s, T.s + 0.2));
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
