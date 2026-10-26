/* Bright coded scenes for "Codex alternatives". Vanilla JS, no library.
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

  const GREY = "#D9D4DF", GREY2 = "#C9C1D3";
  let uid = 0;
  const clip = (svg, tag, a) => { const id = `mgclip${++uid}`, c = el("clipPath", { id }, svg); el(tag, a, c); return `url(#${id})`; };
  const hint = (svg, x, y, s, anchor = "end") => txt(svg, x, y, s, { "text-anchor": anchor, "font-size": 16, fill: MUTE, "font-weight": 500 });
  const pill = (svg, x, y, w, label, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x, y, width: w, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: x - 6, y: y - 6, width: w + 12, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
    txt(g, x + w / 2, y + 34, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
    button(g, label, fn);
    return g;
  };
  const PICKS = ["Claude Code", "Munder Difflin", "Copilot CLI", "OpenCode", "Goose", "Cline", "Cursor"];

  const SC = {};

  /* ---- 1. a signpost turns while seven arrow boards slide out ---- */
  SC.signpost = {
    dur: 11, still: 9,
    build(svg, api) {
      pill(svg, 646, 34, 112, "Turn", () => api.seek(0));
      hint(svg, 758, 114, "tap Turn to replay");
      el("ellipse", { cx: 400, cy: 568, rx: 150, ry: 14, fill: SOFT }, svg);
      const W = 236, cR = clip(svg, "rect", { x: 404, y: 0, width: 396, height: 600 }), cL = clip(svg, "rect", { x: 0, y: 0, width: 396, height: 600 });
      const boards = PICKS.map((name, i) => {
        const right = i % 2 === 0, y = 146 + i * 58, wrap = el("g", { "clip-path": right ? cR : cL }, svg), g = el("g", {}, wrap);
        const d = right ? `M0 0 H${W - 24} L${W} 22 L${W - 24} 44 H0 Z` : `M0 0 H${24 - W} L${-W} 22 L${24 - W} 44 H0 Z`;
        el("path", { d, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, right ? 22 : -22, 29, name, { "text-anchor": right ? "start" : "end", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        return { g, right, y, x: right ? 404 : 396 };
      });
      el("rect", { x: 390, y: 100, width: 20, height: 470, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const top = el("g", {}, svg);
      const face = el("rect", { x: 290, y: 48, width: 220, height: 62, rx: 12, fill: GREY, stroke: INK, "stroke-width": 3, "vector-effect": "non-scaling-stroke" }, top);
      const word = txt(top, 400, 90, "Codex", { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });
      return (t) => {
        const c = Math.cos(io(seg(t, 0.4, 7.6)) * Math.PI * 2), s = Math.sign(c || 1) * Math.max(Math.abs(c), 0.03);
        top.setAttribute("transform", `translate(400 0) scale(${s} 1) translate(-400 0)`);
        word.setAttribute("opacity", c > 0 ? 1 : 0); face.setAttribute("fill", c > 0 ? GREY : GREY2);
        boards.forEach((b, i) => {
          const a = 1.0 + i * 0.8, k = ob(seg(t, a, a + 0.6)), r = io(seg(t, 9.8 + (6 - i) * 0.06, 10.5 + (6 - i) * 0.06)), v = k * (1 - r);
          b.g.setAttribute("transform", `translate(${b.x + (b.right ? -1 : 1) * W * (1 - v)} ${b.y})`);
        });
      };
    },
  };

  /* ---- 2. an hourglass drains onto the Plus card ---- */
  SC.hourglass = {
    dur: 11, still: 9,
    build(svg, api) {
      el("rect", { x: 270, y: 20, width: 260, height: 48, rx: 24, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 52, "Five hour window", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const tag = el("g", {}, svg);
      el("path", { d: "M400 470 V502", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("rect", { x: 225, y: 500, width: 350, height: 48, rx: 12, fill: GREY, stroke: INK, "stroke-width": 2.5 }, tag);
      el("circle", { cx: 246, cy: 524, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      txt(tag, 412, 531, "Weekly limits may also apply", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      el("rect", { x: 230, y: 406, width: 340, height: 64, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 447, "Plus, $20 a month", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const G = el("g", {}, svg);
      el("rect", { x: -100, y: -161, width: 200, height: 22, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, G);
      el("rect", { x: -100, y: 139, width: 200, height: 22, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, G);
      [-90, 80].forEach((x) => el("rect", { x, y: -139, width: 10, height: 278, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, G));
      const P = "M-66 -139 C-66 -60 -10 -26 -6 0 C-10 26 -66 60 -66 139 H66 C66 60 10 26 6 0 C10 -26 66 -60 66 -139 Z";
      el("path", { d: P, fill: SKY, "fill-opacity": 0.18 }, G);
      const cT = clip(G, "path", { d: "M-66 -139 C-66 -60 -10 -26 -6 0 H6 C10 -26 66 -60 66 -139 Z" });
      const cB = clip(G, "path", { d: "M-66 139 C-66 60 -10 26 -6 0 H6 C10 26 66 60 66 139 Z" });
      const topSand = el("rect", { x: -70, width: 140, fill: BLUE, "clip-path": cT }, G);
      const pile = el("path", { fill: BLUE, "clip-path": cB }, G);
      const stream = el("path", { stroke: BLUE, "stroke-width": 4, "stroke-linecap": "round" }, G);
      el("path", { d: P, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, G);
      el("path", { d: "M-50 -122 C-50 -86 -38 -66 -26 -52", fill: "none", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round", opacity: 0.85 }, G);
      pill(svg, 630, 214, 120, "Flip", () => api.seek(9.8));
      hint(svg, 690, 300, "tap Flip", "middle");
      return (t) => {
        const d = seg(t, 0.6, 6.8), s = -139 * (1 - d), b = 139 * (1 - d);
        topSand.setAttribute("y", s); topSand.setAttribute("height", -s);
        pile.setAttribute("d", d <= 0 ? "M0 0" : `M-70 ${b + 8} Q0 ${b - 12} 70 ${b + 8} V140 H-70 Z`);
        stream.setAttribute("d", `M0 -2 V${b}`); stream.setAttribute("opacity", d > 0 && d < 1 ? 1 : 0);
        tf(G, 400, 245, 1, 180 * io(seg(t, 9.8, 10.8)));
        const k = seg(t, 5.8, 7.6), ang = -40 * (1 - k) * Math.exp(-2.5 * k) * Math.cos(10 * k);
        tag.setAttribute("transform", `rotate(${ang} 400 470)`);
        tag.setAttribute("opacity", k <= 0 ? 0 : oc(seg(t, 5.8, 6.1)) * (1 - seg(t, 9.6, 9.9)));
      };
    },
  };

  /* ---- 3. one socket on the Codex adapter, many on the OpenCode strip ---- */
  SC.adapter = {
    dur: 10, still: 7,
    build(svg, api) {
      hint(svg, 756, 60, "tap a socket");
      svg = el("g", { transform: "translate(0 30)" }, svg);
      const socket = (g, x, y) => {
        const face = el("circle", { cx: x, cy: y, r: 30, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: x - 13, y: y - 13, width: 7, height: 20, rx: 3, fill: INK }, g);
        el("rect", { x: x + 6, y: y - 13, width: 7, height: 20, rx: 3, fill: INK }, g);
        el("circle", { cx: x, cy: y + 16, r: 3.5, fill: INK }, g);
        return face;
      };
      el("path", { d: "M272 300 C238 300 250 410 250 460 S210 560 120 590", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      [108, 152].forEach((x) => el("rect", { x, y: 184, width: 10, height: 28, rx: 2, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", { x: 50, y: 208, width: 170, height: 164, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 135, 248, "Codex", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      socket(svg, 135, 298).setAttribute("fill", SOFT);
      txt(svg, 135, 356, "OpenAI", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      const tag = el("g", {}, svg);
      el("rect", { x: 395, y: 124, width: 260, height: 48, rx: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, tag);
      txt(tag, 525, 156, "75+ LLM providers", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      txt(svg, 274, 226, "OpenCode", { "font-family": MONO, "font-size": 24, "font-weight": 700 });
      el("rect", { x: 272, y: 242, width: 508, height: 96, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const forced = [null, null, null, null];
      const socks = ["Claude", "GPT", "Gemini", "Local models"].map((name, i) => {
        const x = 335 + i * 130, g = el("g", {}, svg);
        el("circle", { cx: x, cy: 290, r: 44, fill: "#fff", "fill-opacity": 0 }, g);
        const glow = el("circle", { cx: x, cy: 290, r: 42, fill: SKY }, g);
        const face = socket(g, x, 290);
        el("circle", { cx: x, cy: 290, r: 39, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", class: "mg-ring" }, g);
        txt(svg, x, 382, name, { "text-anchor": "middle", "font-size": 19, "font-weight": 600 });
        button(g, `Light the ${name} socket`, () => { forced[i] = api.now(); api.poke(); });
        return { g, glow, face, x };
      });
      return (t, now) => {
        const k0 = oc(seg(t, 0.3, 0.9));
        tag.setAttribute("opacity", k0); tag.setAttribute("transform", `translate(0 ${-18 * (1 - k0)})`);
        socks.forEach((s, i) => {
          const a = 1.0 + i * 0.9;
          let v = ob(seg(t, a, a + 0.4)) * (1 - seg(t, 8.8, 9.3));
          if (forced[i] != null) v = Math.max(v, ob(seg(now - forced[i], 0, 0.4)));
          s.face.setAttribute("fill", v > 0.5 ? BLUE : "#fff");
          s.glow.setAttribute("opacity", cl(v) * 0.75);
          s.glow.setAttribute("r", 30 + 12 * cl(v, 0, 1.2));
        });
      };
    },
  };

  /* ---- 4. seven lockers open one by one ---- */
  SC.lockers = {
    dur: 13, still: 10,
    build(svg, api) {
      hint(svg, 774, 50, "tap a locker");
      const BEST = [
        [["closest", "swap", "from", "another", "lab"], "the closest swap from another lab"],
        [["research,", "writing,", "ops and", "code"], "research, writing, ops and code"],
        [["GitHub", "issues"], "work that starts from GitHub issues"],
        [["open", "source,", "any", "model"], "an open source terminal agent on any model"],
        [["code and", "other", "work"], "one agent for code and other work"],
        [["open", "source,", "in your", "editor"], "an open source agent in your editor"],
        [["editor", "first,", "one bill"], "an editor first setup on one bill"],
      ];
      el("rect", { x: 16, y: 446, width: 768, height: 12, rx: 6, fill: SOFT }, svg);
      const forced = PICKS.map(() => null);
      let pinned = -1;
      const lockers = PICKS.map((name, i) => {
        const x = 26 + i * 108, g = el("g", {}, svg);
        el("rect", { x, y: 76, width: 100, height: 370, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: x - 5, y: 71, width: 110, height: 380, rx: 12, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const parts = name.split(" ");
        parts.forEach((p, j) => txt(g, x + 50, (parts.length === 1 ? 113 : 103) + j * 20, p, { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 }));
        el("path", { d: `M${x} 140 H${x + 100}`, stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: x + 7, y: 148, width: 86, height: 290, rx: 4, fill: SOFT }, g);
        el("rect", { x: x + 13, y: 168, width: 76, height: 250, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 2 }, g);
        txt(g, x + 51, 194, "Best for", { "text-anchor": "middle", "font-size": 13, "font-weight": 700 });
        BEST[i][0].forEach((l, j) => txt(g, x + 51, 228 + j * 24, l, { "text-anchor": "middle", "font-size": 14, "font-weight": 600 }));
        const door = el("g", {}, g), ns = { "vector-effect": "non-scaling-stroke" };
        const panel = el("rect", Object.assign({ x: 0, y: 0, width: 86, height: 290, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, ns), door);
        const bits = el("g", {}, door);
        [22, 34, 46].forEach((y) => el("path", Object.assign({ d: `M20 ${y} H66`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, ns), bits));
        el("rect", Object.assign({ x: 68, y: 128, width: 8, height: 34, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2 }, ns), bits);
        button(g, `Open the ${name} locker: best for ${BEST[i][1]}`, () => { forced[i] = api.now(); pinned = i; api.poke(); });
        return { door, panel, bits, x };
      });
      el("rect", { x: 40, y: 484, width: 720, height: 50, rx: 25, fill: SOFT }, svg);
      const cap = txt(svg, 400, 516, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      const capName = el("tspan", { "font-family": MONO, "font-weight": 700 }, cap), capLine = el("tspan", {}, cap);
      return (t, now) => {
        let last = -1;
        lockers.forEach((L, i) => {
          const a = 0.8 + i * 0.95, k = oc(seg(t, a, a + 0.7)), c = io(seg(t, 11.2 + i * 0.08, 11.9 + i * 0.08));
          let v = k * (1 - c);
          if (forced[i] != null) v = Math.max(v, oc(seg(now - forced[i], 0, 0.7)));
          if (t >= a && c === 0) last = i;
          L.door.setAttribute("transform", `translate(${L.x + 7} 148) scale(${1 - 0.94 * v} 1)`);
          L.panel.setAttribute("fill", v > 0.5 ? "#E9E3F2" : "#fff"); L.bits.setAttribute("opacity", 1 - seg(v, 0.6, 0.85));
        });
        const show = pinned >= 0 ? pinned : last;
        capName.textContent = show < 0 ? "" : PICKS[show];
        capLine.textContent = show < 0 ? "" : `: ${BEST[show][1]}`;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      el("rect", { x: 64, y: 48, width: 168, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 148, 76, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 62, 176, "Codex alternatives", { "font-size": 80, "font-weight": 700 });
      txt(svg, 64, 228, "7 picks beyond OpenAI's agent", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 266, "Checked 26 Oct 2026", { "font-size": 18, "font-weight": 500, fill: "#6B5878" });
      const TW = 116, gap = 11, x0 = (960 - (7 * TW + 6 * gap)) / 2, cx = (i) => x0 + i * (TW + gap) + TW / 2;
      const lines = el("path", { d: `M480 366 V392 M${cx(0)} 392 H${cx(6)} ` + PICKS.map((_, i) => `M${cx(i)} 392 V418`).join(" "), fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "2 8" }, svg);
      const codex = el("g", {}, svg);
      el("rect", { x: 395, y: 308, width: 170, height: 58, rx: 14, fill: GREY, stroke: INK, "stroke-width": 3 }, codex);
      txt(codex, 480, 347, "Codex", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      const FILL = [YEL, BLUE, LIL, SKY, MINT, YEL, BLUE];
      const tiles = PICKS.map((name, i) => {
        const g = el("g", {}, svg), x = x0 + i * (TW + gap);
        el("rect", { x, y: 420, width: TW, height: 72, rx: 14, fill: FILL[i], stroke: INK, "stroke-width": 2.5 }, g);
        const parts = name.split(" ");
        parts.forEach((p, j) => txt(g, x + TW / 2, (parts.length === 1 ? 462 : 452) + j * 21, p, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 }));
        return g;
      });
      return (t) => {
        const c0 = oc(seg(t, 0.1, 0.6));
        codex.setAttribute("opacity", c0); codex.setAttribute("transform", `translate(0 ${-16 * (1 - c0)})`);
        lines.setAttribute("opacity", seg(t, 0.5, 0.9));
        tiles.forEach((g, i) => { const k = ob(seg(t, 0.7 + i * 0.22, 1.3 + i * 0.22)); g.setAttribute("opacity", cl(k * 2)); g.setAttribute("transform", `translate(${90 * (1 - k)} 0)`); });
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
