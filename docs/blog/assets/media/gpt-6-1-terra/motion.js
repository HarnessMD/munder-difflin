/* Bright coded scenes for "GPT-6.1 Terra". Vanilla JS, no library.
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

  /* ---- the three Terra icons (a picture, a plain arrow pointer, a pencil), each drawn around 0,0 ---- */
  const ICONS = [
    (g) => {
      el("rect", { x: -26, y: -20, width: 52, height: 40, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
      el("circle", { cx: 11, cy: -7, r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
      el("path", { d: "M-24 18 L-8 1 L3 12 L11 5 L24 18 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    },
    (g) => {
      el("path", { d: "M-11 -23 L-11 15 L-1 6 L6 21 L13 18 L6 3 L19 3 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    },
    (g) => {
      const p = el("g", { transform: "rotate(-45)" }, g);
      el("rect", { x: -32, y: -8, width: 10, height: 16, rx: 3, fill: LIL, stroke: INK, "stroke-width": 3 }, p);
      el("rect", { x: -22, y: -8, width: 36, height: 16, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
      el("path", { d: "M14 -8 L30 0 L14 8 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
      el("path", { d: "M25 -2.5 L30 0 L25 2.5 Z", fill: INK, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, p);
    },
  ];

  /* ---- a price tag, centred on 0,0, with a punched hole on the left ---- */
  const tagShape = (g, w, h, fill) => {
    const L = -w / 2, R = w / 2, T = -h / 2, B = h / 2, n = Math.min(h / 2, 34);
    el("path", { d: `M${L} 0 L${L + n} ${T} H${R - 14} Q${R} ${T} ${R} ${T + 14} V${B - 14} Q${R} ${B} ${R - 14} ${B} H${L + n} Z`, fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("circle", { cx: L + n * 0.85, cy: 0, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    return L + n * 0.85 + 18;
  };

  const SC = {};

  /* ---- 1. the GPT-6 lineup, tall to short; Terra lifts and gets its tag ---- */
  SC.lineup = {
    dur: 9, still: 8.9,
    build(svg, api) {
      const BOX = [["Astra", 340, LIL], ["Sol", 280, BLUE], ["Terra", 210, SKY], ["Luna", 140, SOFT]];
      const base = 470, w = 120, gap = 50, x0 = 85, LIFT = 28;
      el("path", { d: "M60 470 H740", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const boxes = BOX.map(([name, h, col], i) => {
        const x = x0 + i * (w + gap), g = el("g", {}, svg);
        if (i === 2) el("rect", { x: x - 9, y: base - h - 9, width: w + 18, height: h + 18, rx: 22, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, g);
        const r = el("rect", { x, y: base - h, width: w, height: h, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(svg, x + w / 2, 512, name, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        return { g, r, h, d: 0.1 + i * 0.15 };
      });
      button(boxes[2].g, "Terra: replay the lift", () => api.seek(1.2));
      const cx = x0 + 2 * (w + gap) + w / 2;
      const tag = el("g", {}, svg);
      const tx = tagShape(tag, 160, 80, YEL);
      txt(tag, tx + 2, -6, "Fast and", { "font-size": 21, "font-weight": 700 });
      txt(tag, tx + 2, 21, "efficient", { "font-size": 21, "font-weight": 700 });
      const icons = ICONS.map((f, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -32, y: -32, width: 64, height: 64, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const ic = el("g", { transform: "scale(0.8)" }, g); f(ic);
        return { g, y: 130 + i * 76 };
      });
      return (t) => {
        boxes.forEach((b, i) => {
          const k = Math.max(0, ob(seg(t, b.d, b.d + 0.6))), hh = b.h * k;
          b.r.setAttribute("height", hh); b.r.setAttribute("y", base - hh); b.r.setAttribute("rx", Math.min(16, hh / 2));
          b.r.setAttribute("opacity", k > 0 ? 1 : 0);
        });
        const lift = ob(seg(t, 1.4, 2.1));
        boxes[2].g.setAttribute("transform", `translate(0 ${-LIFT * lift})`);
        const top = base - 210 - LIFT * lift - 44, d = ob(seg(t, 2.2, 2.9));
        tf(tag, cx, -60 + (top + 60) * d, 1, -3 * d);
        tag.setAttribute("opacity", t >= 2.2 ? 1 : 0);
        icons.forEach((n, i) => { const k = ob(seg(t, 3.0 + i * 0.25, 3.45 + i * 0.25)); tf(n.g, 655, n.y, Math.max(0, k)); n.g.setAttribute("opacity", k > 0 ? 1 : 0); });
      };
    },
  };

  /* ---- 2. old price tag, new price tag in front ---- */
  SC.tags = {
    dur: 9, still: 8.9,
    build(svg, api) {
      const mk = (name, a, b, fill) => {
        const g = el("g", {}, svg), x = tagShape(g, 400, 230, fill);
        txt(g, x, -50, name, { "font-family": MONO, "font-size": 30, "font-weight": 700 });
        txt(g, x, 18, a, { "font-family": MONO, "font-size": 42, "font-weight": 700 });
        txt(g, x, 76, b, { "font-family": MONO, "font-size": 42, "font-weight": 700 });
        return g;
      };
      const old = mk("GPT-5.6 Terra", "$2 in", "$12 out", "#fff");
      const neu = mk("GPT-6.1 Terra", "$1 in", "$5 out", YEL);
      const P0 = [300, 232, 1, -5], P1 = [512, 392, 0.8, 4];
      const lab = el("g", {}, svg);
      el("rect", { x: -98, y: -24, width: 196, height: 48, rx: 24, fill: MINT, stroke: INK, "stroke-width": 2.5 }, lab);
      txt(lab, 0, 8, "per 1M tokens", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      const hit = el("g", {}, svg);
      el("rect", { x: -172, y: -104, width: 344, height: 208, rx: 20, fill: "#fff", "fill-opacity": 0 }, hit);
      el("rect", { x: -182, y: -114, width: 364, height: 228, rx: 26, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, hit);
      tf(hit, P1[0], P1[1], 1, P1[3]);
      let flip = 0, flipAt = -99, user = false;
      button(hit, "Flip between the two price tags", () => { user = true; flip = 1 - flip; flipAt = api.now(); api.poke(); });
      const lerp = (A, B, s) => A.map((v, i) => v + (B[i] - v) * s);
      return (t, now) => {
        const tt = user ? 9 : t;
        const k = io(seg(now - flipAt, 0, 0.7)), s = flip ? k : 1 - k;
        const a = lerp(P0, P1, s), b = lerp(P1, P0, s), arc = Math.sin(Math.PI * s) * 40;
        const pop = Math.max(0, ob(seg(tt, 0.2, 0.8)));
        tf(old, a[0], a[1] + (s > 0.5 ? -arc : arc * 0.3), a[2] * pop, a[3]); old.setAttribute("opacity", pop > 0 ? 1 : 0);
        const slide = oc(seg(tt, 1.4, 2.4));
        tf(neu, b[0] + 460 * (1 - slide), b[1] + (s > 0.5 ? arc * 0.3 : -arc), b[2], b[3] + 10 * (1 - slide));
        neu.setAttribute("opacity", tt >= 1.4 ? 1 : 0);
        if (s > 0.5) svg.insertBefore(old, lab); else svg.insertBefore(neu, lab);
        const l = Math.max(0, ob(seg(tt, 3.0, 3.5)));
        tf(lab, 236, 524, l); lab.setAttribute("opacity", l > 0 ? 1 : 0);
      };
    },
  };

  /* ---- 3. the reasoning effort dial ---- */
  SC.dial = {
    dur: 10, still: 9.9,
    build(svg, api) {
      const C = [400, 360], R = 150, A = [150, 198, 246, 294, 342, 390], N = ["none", "low", "medium", "high", "xhigh", "max"];
      const rad = (d) => (d * Math.PI) / 180, P = (d, r) => [C[0] + Math.cos(rad(d)) * r, C[1] + Math.sin(rad(d)) * r];
      el("rect", { x: 90, y: 60, width: 620, height: 480, rx: 28, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const dial = el("g", { role: "slider", tabindex: "0", "aria-label": "Reasoning effort dial", "aria-valuemin": 0, "aria-valuemax": 5, class: "mg-hit" }, svg);
      el("circle", { cx: C[0], cy: C[1], r: 205, fill: "#fff", "fill-opacity": 0 }, dial);
      el("circle", { cx: C[0], cy: C[1], r: 176, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, dial);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: SOFT, stroke: INK, "stroke-width": 3 }, dial);
      const [ax, ay] = P(A[0], 112), [bx, by] = P(A[5], 112);
      el("path", { d: `M${ax} ${ay} A112 112 0 1 1 ${bx} ${by}`, fill: "none", stroke: "#fff", "stroke-width": 14, "stroke-linecap": "round" }, dial);
      const anchor = ["end", "end", "middle", "middle", "start", "start"];
      const glow = el("rect", { rx: 18, fill: YEL, stroke: INK, "stroke-width": 2.5 }, dial);
      const halo = el("circle", { r: 18, fill: "none", stroke: YEL, "stroke-width": 5 }, dial);
      const dots = A.map((d, i) => {
        const [x, y] = P(d, R), [lx, ly] = P(d, i === 2 || i === 3 ? 206 : 192);
        txt(dial, lx, ly + 8, N[i], { "text-anchor": anchor[i], "font-family": MONO, "font-size": 24, "font-weight": 700 });
        return el("circle", { cx: x, cy: y, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, dial);
      });
      const ml = dial.querySelectorAll("text")[2], mb = ml.getBBox();
      glow.setAttribute("x", mb.x - 12); glow.setAttribute("y", mb.y - 5); glow.setAttribute("width", mb.width + 24); glow.setAttribute("height", mb.height + 10);
      dial.insertBefore(glow, ml);
      const [hx, hy] = P(A[2], R); halo.setAttribute("cx", hx); halo.setAttribute("cy", hy);
      const def = txt(dial, mb.x + mb.width / 2, mb.y - 18, "default", { "text-anchor": "middle", "font-size": 18, "font-weight": 500, fill: MUTE });
      const needle = el("g", {}, dial);
      el("path", { d: "M0 -10 L116 0 L0 10 Z", fill: INK, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, needle);
      el("circle", { r: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, needle);
      let ui = null, from = A[2], at = -99, cur = A[2];
      const move = (i) => { from = cur; ui = (i + 6) % 6; at = api.now(); api.poke(); };
      dial.addEventListener("click", () => move((ui == null ? 2 : ui) + 1));
      dial.addEventListener("keydown", (e) => {
        const i = ui == null ? 2 : ui;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); move(Math.min(5, i + 1)); }
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); move(Math.max(0, i - 1)); }
        else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); move(i + 1); }
      });
      return (t, now) => {
        cur = ui != null ? from + (A[ui] - from) * io(seg(now - at, 0, 0.5)) : A[2] + (A[5] - A[2]) * (io(seg(t, 2.5, 4.5)) - io(seg(t, 5.5, 7.5)));
        tf(needle, C[0], C[1], 1, cur);
        const g = ui != null ? 1 : oc(seg(t, 0.6, 1.3));
        glow.setAttribute("opacity", g); def.setAttribute("opacity", g);
        halo.setAttribute("opacity", g); halo.setAttribute("r", 17 + 3 * Math.sin(now * 3) * g);
        let near = 0; A.forEach((d, i) => { if (Math.abs(d - cur) < Math.abs(A[near] - cur)) near = i; });
        dots.forEach((n, i) => n.setAttribute("fill", i === 2 && g > 0.5 ? YEL : i === near && Math.abs(A[i] - cur) < 6 ? BLUE : "#fff"));
        dial.setAttribute("aria-valuenow", near); dial.setAttribute("aria-valuetext", N[near]);
      };
    },
  };

  /* ---- 4. switch the Codex CLI to Terra ---- */
  SC.switch = {
    dur: 10, still: 9.9,
    build(svg, api) {
      const X = 70, Y = 60, W = 660, H = 260;
      el("rect", { x: X, y: Y, width: W, height: H, rx: 20, fill: "#fff" }, svg);
      el("path", { d: `M${X} ${Y + 50} V${Y + 20} Q${X} ${Y} ${X + 20} ${Y} H${X + W - 20} Q${X + W} ${Y} ${X + W} ${Y + 20} V${Y + 50} Z`, fill: SOFT }, svg);
      el("path", { d: `M${X} ${Y + 50} H${X + W}`, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: X, y: Y, width: W, height: H, rx: 20, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      [102, 126, 150].forEach((x) => el("circle", { cx: x, cy: Y + 25, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg));
      const chip = el("rect", { x: 560, y: 70, width: 150, height: 30, rx: 15, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      const ph = el("rect", { x: 595, y: 81, width: 80, height: 8, rx: 4, fill: LIL }, svg);
      const cn = txt(svg, 635, 92, "6.1 Terra", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      txt(svg, 108, 200, "$", { "font-family": MONO, "font-size": 30, "font-weight": 700, fill: MUTE });
      const CMD = "codex -m gpt-6.1-terra";
      const line = txt(svg, 145, 200, CMD, { "font-family": MONO, "font-size": 30, "font-weight": 700 });
      const cw = line.getComputedTextLength() / CMD.length || 18;
      const caret = el("rect", { y: 174, width: 15, height: 34, rx: 2, fill: BLUE }, svg);
      const card = el("g", {}, svg);
      el("rect", { x: 150, y: 370, width: 500, height: 80, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      const tick = el("circle", { cx: 200, cy: 410, r: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      const mark = el("path", { d: "M189 411 L197 419 L212 402", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 32 }, card);
      txt(card, 240, 418, "Codex CLI 0.159.0 or later", { "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const rb = el("g", {}, svg);
      el("rect", { x: 595, y: 485, width: 140, height: 54, rx: 27, fill: SKY, stroke: INK, "stroke-width": 3 }, rb);
      el("rect", { x: 589, y: 479, width: 152, height: 66, rx: 33, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 6", class: "mg-ring" }, rb);
      txt(rb, 665, 519, "Replay", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      button(rb, "Replay", () => api.seek(0.01));
      return (t, now) => {
        const n = Math.round(CMD.length * seg(t, 0.6, 3.4));
        line.textContent = CMD.slice(0, n);
        caret.setAttribute("x", 145 + cw * n + 2);
        caret.setAttribute("opacity", t < 3.4 || Math.floor(now * 2) % 2 === 0 ? 1 : 0);
        const c = oc(seg(t, 4.0, 4.6));
        card.setAttribute("opacity", c); card.setAttribute("transform", `translate(0 ${30 * (1 - c)})`);
        const k = seg(t, 4.8, 5.3);
        tick.setAttribute("fill", k > 0.2 ? MINT : "#fff"); tick.setAttribute("transform", `rotate(0) translate(200 410) scale(${1 + 0.18 * Math.sin(Math.PI * k)}) translate(-200 -410)`);
        mark.setAttribute("stroke-dashoffset", 32 * (1 - k));
        const m = io(seg(t, 5.6, 6.2));
        ph.setAttribute("opacity", 1 - m); ph.setAttribute("transform", `translate(0 ${-8 * m})`);
        cn.setAttribute("opacity", m); cn.setAttribute("transform", `translate(0 ${10 * (1 - m)})`);
        chip.setAttribute("fill", m > 0.5 ? YEL : "#fff");
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 70, width: 132, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 130, 97, "Concepts", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 62, 210, "GPT-6.1 Terra", { "font-family": MONO, "font-size": 64, "font-weight": 700 });
      el("path", { d: "M66 238 H520", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 300, "Price, specs and Codex setup", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 470, "Checked 27 Oct 2026", { "font-size": 20, "font-weight": 500, fill: CAP });
      el("rect", { x: 620, y: 60, width: 140, height: 320, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      ICONS.forEach((f, i) => { const g = el("g", {}, svg); f(g); tf(g, 690, 125 + i * 95, 1.25); });
      const tag = el("g", {}, svg), x = tagShape(tag, 260, 64, YEL);
      txt(tag, x - 2, 9, "$1 in, $5 out", { "font-family": MONO, "font-size": 25, "font-weight": 700 });
      tf(tag, 790, 445, 1, -5);
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
