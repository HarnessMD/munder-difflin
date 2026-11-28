/* Bright coded scenes for "Codex vs Claude Code usage limits". Vanilla JS, no library.
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

  const SC = {};

  /* ---- 1. four measuring jugs; the water wobbles between a low mark and a high mark ---- */
  SC.jugs = {
    dur: 12, still: 9.4,
    build(svg, api) {
      txt(svg, 40, 64, "Plus, local messages per five hours, OpenAI’s estimates", { "font-size": 26, "font-weight": 700 });
      const J = [["GPT-6 Astra", "5", "45", SKY], ["GPT-6.1 Sol", "15", "160", LIL], ["GPT-6 Sol", "15", "150", MINT], ["GPT-6 Luna", "350", "3,000", BLUE]];
      const T = 122, B = 430, HW = 46, CX = [142, 326, 510, 694];
      const Y = (s) => B - 14 - (Math.log10(parseFloat(s.replace(",", ""))) / 3.6) * 270;
      el("path", { d: `M30 ${B + 2} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      let pinned = -1;
      const jugs = J.map(([name, lo, hi, col], i) => {
        const c = CX[i], g = el("g", {}, svg), ylo = Y(lo), yhi = Y(hi);
        el("rect", { x: c - 112, y: T - 22, width: 198, height: B - T + 70, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        const body = `M${c - HW} ${T} V${B - 18} Q${c - HW} ${B} ${c - HW + 18} ${B} H${c + HW - 18} Q${c + HW} ${B} ${c + HW} ${B - 18} V${T}`;
        const cp = el("clipPath", { id: "mgjug" + i }, g); el("path", { d: body + " Z" }, cp);
        el("path", { d: `M${c + HW} ${T + 46} h20 q16 0 16 16 v104 q0 16 -16 16 h-20`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, g);
        el("path", { d: body + " Z", fill: "#fff" }, g);
        const water = el("path", { fill: col, "clip-path": `url(#mgjug${i})` }, g);
        el("path", { d: `M${c - HW - 10} ${T - 8} L${c - HW} ${T + 6} ` + body.slice(1).replace(/^[^V]*/, "") + ` `, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        el("path", { d: `M${c - HW} ${ylo} h30 M${c - HW} ${yhi} h30`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        txt(g, c - HW - 10, ylo + 7, lo, { "text-anchor": "end", "font-size": 21, "font-weight": 700 });
        txt(g, c - HW - 10, yhi + 7, hi, { "text-anchor": "end", "font-size": 21, "font-weight": 700 });
        txt(g, c - 6, B + 36, name, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        button(g, `Plus, ${name}: ${lo} to ${hi} local messages per five hours`, () => { pinned = i; api.poke(); });
        return { c, water, ylo, yhi, a: 0.5 + i * 1.2 };
      });
      const cap = strip(svg, 496, 720);
      return (t, now) => {
        const out = io(seg(t, 11.0, 11.7));
        jugs.forEach((j, i) => {
          const mid = (j.ylo + j.yhi) / 2, half = (j.ylo - j.yhi) / 2, up = oc(seg(t, j.a, j.a + 1.1));
          const sw = seg(t, j.a + 0.9, j.a + 1.6) * Math.sin((t - j.a - 0.9) * (1.5 + i * 0.17)) * half * 0.9;
          const lv = B + (mid - sw - B) * up * (1 - out);
          let d = `M${j.c - HW} ${B + 4}`;
          for (let x = -HW; x <= HW; x += 4) d += ` L${j.c + x} ${(lv + Math.sin(x * 0.12 + now * 3.2 + i) * 2.6).toFixed(1)}`;
          j.water.setAttribute("d", d + ` L${j.c + HW} ${B + 4} Z`);
        });
        cap.textContent = pinned >= 0 ? `Plus, ${J[pinned][0]}: ${J[pinned][1]} to ${J[pinned][2]} local messages per five hours` : "OpenAI publishes estimates that move with the model and the task";
      };
    },
  };

  /* ---- 2. two sand timers: the small one keeps flipping, the large one drains the whole time ---- */
  SC.timers = {
    dur: 13, still: 9.2,
    build(svg) {
      txt(svg, 40, 64, "Claude Code on Pro and Max has two limits", { "font-size": 30, "font-weight": 700 });
      const G = 446;
      el("path", { d: `M30 ${G + 2} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const mk = (x, w, h, col) => {
        const g = el("g", {}, svg), cy = G - 16 - h;
        el("path", { d: `M${-w} ${-h} H${w} L6 0 L${w} ${h} H${-w} L-6 0 Z`, fill: "#fff" }, g);
        const top = el("path", { fill: YEL }, g), bot = el("path", { fill: YEL }, g);
        const fall = el("path", { d: `M0 0 V${h - 2}`, stroke: YEL, "stroke-width": 4, "stroke-linecap": "round" }, g);
        el("path", { d: `M${-w} ${-h} H${w} L6 0 L${w} ${h} H${-w} L-6 0 Z`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        [-h - 16, h].forEach((y) => el("rect", { x: -w - 14, y, width: 2 * w + 28, height: 16, rx: 8, fill: col, stroke: INK, "stroke-width": 3 }, g));
        return (f, rot, run, op, up = 0) => {
          const s = Math.sqrt(cl(f)), a = 6 / w;
          top.setAttribute("d", s <= a ? "" : `M${-w * s} ${-h * s} H${w * s} L6 0 H-6 Z`);
          bot.setAttribute("d", s >= 0.999 ? "" : `M${-w} ${h} H${w} L${w * Math.max(s, a)} ${h * Math.max(s, a)} H${-w * Math.max(s, a)} Z`);
          top.setAttribute("opacity", op); bot.setAttribute("opacity", op);
          fall.setAttribute("opacity", run && f > 0.01 && f < 0.995 ? op : 0);
          g.setAttribute("transform", `translate(${x} ${cy - up}) rotate(${rot})`);
        };
      };
      const small = mk(232, 62, 84, SKY), large = mk(548, 108, 146, LIL);
      txt(svg, 232, G + 40, "five hour session limit", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      txt(svg, 548, G + 40, "weekly limit", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const cap = strip(svg, 508, 560);
      cap.textContent = "Anthropic puts no number on either";
      const C = 2.6;
      return (t) => {
        const u = t % C, k = seg(u, 2.0, C);
        small(1 - seg(u, 0, 2.0), 180 * io(k), k <= 0, 1, Math.sin(k * Math.PI) * 36);
        large(1 - 0.8 * (t / 13), 0, true, seg(t, 0, 0.4) * (1 - seg(t, 12.5, 12.9)));
      };
    },
  };

  /* ---- 3. two covered dials; a cloth lifts off each and the needle swings up ---- */
  SC.dials = {
    dur: 10.4, still: 7.6,
    build(svg, api) {
      txt(svg, 40, 64, "Read your own meter", { "font-size": 32, "font-weight": 700 });
      const CY = 292, R = 122, rad = (d) => (d * Math.PI) / 180;
      const pt = (r, d) => `${(Math.sin(rad(d)) * r).toFixed(1)} ${(-Math.cos(rad(d)) * r).toFixed(1)}`;
      const arc = (r, a, b) => `M${pt(r, a)} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${pt(r, b)}`;
      const mk = (x, cmd, who, rim, cloth, end, t0) => {
        const g = el("g", { transform: `translate(${x} ${CY})` }, svg);
        el("circle", { r: R + 24, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("circle", { r: R + 12, fill: rim, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { r: R - 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: arc(86, -125, 125), stroke: SOFT, "stroke-width": 20, fill: "none", "stroke-linecap": "round" }, g);
        const left = el("path", { stroke: MINT, "stroke-width": 20, fill: "none", "stroke-linecap": "round" }, g);
        for (let a = -125; a <= 125; a += 25) el("path", { d: `M${pt(56, a)} L${pt(66, a)}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        const needle = el("path", { d: "M0 14 V-92", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, g);
        el("circle", { r: 13, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        const c = el("g", {}, g);
        el("path", { d: "M-150 -70 Q-150 -150 0 -156 Q150 -150 150 -70 L158 150 Q118 132 79 152 Q40 132 0 152 Q-40 132 -79 152 Q-118 132 -158 150 Z", fill: cloth, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, c);
        el("path", { d: "M-70 -120 Q-86 0 -80 120 M0 -128 Q-8 0 0 122 M70 -120 Q86 0 80 120", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round", "stroke-opacity": 0.35 }, c);
        txt(svg, x, CY + 204, cmd, { "text-anchor": "middle", "font-family": MONO, "font-size": 32, "font-weight": 700 });
        txt(svg, x, CY + 238, who, { "text-anchor": "middle", "font-size": 22, "font-weight": 500, fill: MUTE });
        let pk = -99;
        button(g, `${cmd} in ${who}`, () => { pk = api.now(); api.poke(); });
        return (t, now) => {
          const w = now - pk, mine = w >= 0 && w < 3;
          const back = mine ? 0 : io(seg(t, 9.4, 10));
          const lift = mine ? io(seg(w, 0.35, 1.15)) : io(seg(t, t0, t0 + 0.9)) - back;
          const sw = mine ? ob(seg(w, 1.1, 2.0)) : ob(seg(t, t0 + 0.8, t0 + 1.8)) * (1 - back);
          const a = -125 + (end + 125) * sw + Math.sin(now * 2.1 + x) * 1.6 * cl(sw);
          needle.setAttribute("transform", `rotate(${a})`);
          left.setAttribute("d", a > -124 ? arc(86, -125, a) : "");
          c.setAttribute("transform", `translate(0 ${-250 * lift}) rotate(${-7 * lift})`);
          c.setAttribute("opacity", 1 - seg(lift, 0.45, 0.95));
        };
      };
      const A = mk(214, "/status", "Codex CLI", SKY, LIL, 48, 1.0), Bd = mk(586, "/usage", "Claude Code", YEL, BLUE, -18, 3.8);
      return (t, now) => { A(t, now); Bd(t, now); };
    },
  };

  /* ---- 4. a suitcase that will not close until the bulky things come out or shrink ---- */
  SC.suitcase = {
    dur: 12.4, still: 9.8,
    build(svg, api) {
      txt(svg, 40, 64, "How do you stretch a plan?", { "font-size": 32, "font-weight": 700 });
      const F = 468, L = 224, Rr = 576, RIM = 292;
      el("path", { d: `M30 ${F + 2} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const lid = el("g", {}, svg);
      el("rect", { x: L, y: -170, width: Rr - L, height: 170, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, lid);
      el("path", { d: `M${L + 30} -116 H${Rr - 30} M${L + 30} -60 H${Rr - 30}`, stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "2 10" }, lid);
      const sc = el("g", {}, svg);
      el("rect", { x: L - 8, y: RIM - 8, width: Rr - L + 16, height: F - RIM + 16, rx: 30, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, sc);
      el("rect", { x: L, y: RIM, width: Rr - L, height: F - RIM - 8, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, sc);
      [L + 46, Rr - 46 - 28].forEach((x) => el("rect", { x, y: F - 9, width: 28, height: 10, rx: 4, fill: INK }, sc));
      const BW = 164, block = (lines, col, mono) => {
        const g = el("g", {}, svg), r = el("rect", { x: -BW / 2, width: BW, rx: 14, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const ts = lines.map((s) => txt(g, 0, 0, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700, "font-family": mono ? MONO : SANS }));
        return { g, set: (x, bot, h, rot = 0) => { r.setAttribute("y", -h); r.setAttribute("height", h); ts.forEach((n, i) => n.setAttribute("y", -h / 2 + 7 + (i - (ts.length - 1) / 2) * 26)); g.setAttribute("transform", `translate(${x} ${bot}) rotate(${rot})`); } };
      };
      const XL = L + 8 + BW / 2, XR = Rr - 8 - BW / 2, BOT = F - 16;
      const ag = block(["AGENTS.md"], MINT, true), cm = block(["CLAUDE.md"], YEL, true);
      const sm = block(["source", "material"], SKY), mc = block(["MCP", "servers"], LIL);
      const front = el("rect", { x: L, y: RIM, width: Rr - L, height: F - RIM - 8, rx: 22, fill: "none", stroke: INK, "stroke-width": 3, "pointer-events": "none" }, svg);
      const shut = el("g", { "pointer-events": "none" }, svg);
      el("path", { d: `M364 ${RIM - 26} V${RIM - 40} Q364 ${RIM - 56} 380 ${RIM - 56} H420 Q436 ${RIM - 56} 436 ${RIM - 40} V${RIM - 26}`, stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, shut);
      el("rect", { x: L - 6, y: RIM - 28, width: Rr - L + 12, height: 40, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, shut);
      [L + 52, Rr - 52 - 26].forEach((x) => el("rect", { x, y: RIM - 4, width: 26, height: 30, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, shut));
      button(sc, "Pack the suitcase again", () => api.seek(0.2));
      const cap = strip(svg, 504, 600);
      const BIG = 160, SMALL = 56, TOPH = 96;
      return (t) => {
        const out = seg(t, 11.6, 12.2), rs = 1 - out;
        const hop = (a, x0, x1) => { const p = seg(t, a, a + 1.1) * rs, up = io(cl(p / 0.4)), mv = io(cl((p - 0.35) / 0.65)); return [x0 + (x1 - x0) * mv, (BOT - BIG) + (214 - (BOT - BIG)) * up * (1 - mv) + (F - (BOT - BIG)) * mv - (1 - mv) * 0 - Math.sin(mv * Math.PI) * 40, Math.sin(mv * Math.PI) * (x1 < x0 ? -10 : 10)]; };
        const s1 = hop(1.9, XL, 116), s2 = hop(3.4, XR, 684);
        const h1 = BIG - (BIG - SMALL) * io(seg(t, 5.0, 5.7)) * rs, h2 = BIG - (BIG - SMALL) * io(seg(t, 6.2, 6.9)) * rs;
        ag.set(XL, BOT, h1); cm.set(XR, BOT, h2);
        sm.set(s1[0], s1[1], TOPH, s1[2]); mc.set(s2[0], s2[1], TOPH, s2[2]);
        const tryIt = t < 1.8 ? Math.abs(Math.sin(t * 3.5)) * 0.2 * seg(t, 0.2, 0.5) : 0;
        const close = seg(t, 7.4, 7.9) * rs, sy = 1 - tryIt - close * close;
        lid.setAttribute("transform", `translate(0 ${RIM + 2}) scale(1 ${Math.max(sy, 0.001)})`);
        lid.setAttribute("opacity", sy < 0.04 ? 0 : 1);
        const land = seg(t, 7.85, 8.3), b = Math.sin(land * Math.PI) * 6 * (1 - land);
        shut.setAttribute("opacity", close >= 0.96 && out < 0.5 ? 1 : 0);
        shut.setAttribute("transform", `translate(0 ${-b})`);
        cap.textContent = t < 1.9 || t >= 11.6 ? "The same advice from both vendors’ own tips" : t < 3.4 ? "limit source material" : t < 5.0 ? "limit the number of MCP servers you use" : t < 6.2 ? "reduce the size of your AGENTS.md" : t < 7.4 ? "aim to keep CLAUDE.md under 200 lines" : "Send less context per message";
        front.setAttribute("opacity", 1);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 54, width: 188, height: 42, rx: 21, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 158, 83, "Comparisons", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      txt(svg, 62, 184, "Codex vs Claude Code", { "font-size": 72, "font-weight": 700 });
      txt(svg, 62, 268, "usage limits", { "font-size": 72, "font-weight": 700 });
      el("path", { d: "M66 294 H476", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 350, "Checked 10 Oct 2026", { "font-size": 25, "font-weight": 500, fill: MUTE });
      /* a tape measure pulled out, with no numbers on it */
      el("rect", { x: 78, y: 430, width: 700, height: 34, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 0; i < 44; i++) { const x = 96 + i * 14.5; el("path", { d: `M${x} 430 v${i % 4 === 0 ? 20 : 11}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg); }
      el("path", { d: "M78 422 V474 H64", stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      el("rect", { x: 742, y: 352, width: 154, height: 132, rx: 34, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 826, cy: 412, r: 34, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 826, cy: 412, r: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 790, y: 340, width: 52, height: 14, rx: 7, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
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
