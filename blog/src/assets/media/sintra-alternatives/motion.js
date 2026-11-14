/* Bright coded scenes for "Sintra alternatives". Vanilla JS, no library.
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
  const bo = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) { x -= 1.5 / d; return n * x * x + 0.75; } if (x < 2.5 / d) { x -= 2.25 / d; return n * x * x + 0.9375; } x -= 2.625 / d; return n * x * x + 0.984375; };
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- 1. a pale mint café board of 12 helpers; a yellow marker underlines one row at a time ---- */
  SC.chalkboard = {
    dur: 11, still: 11,
    build(svg, api) {
      const PALE = "#DDF5EA";
      const ROWS = [["Buddy", "Business development"], ["Cassie", "Support"], ["Commet", "eCommerce"], ["Dexter", "Data"], ["Emmie", "Email"], ["Gigi", "Coach"], ["Penn", "Copy"], ["Scouty", "Hiring"], ["Seomi", "SEO"], ["Soshie", "Social"], ["Vizzy", "Assistant"], ["Milli", "Sales"]];
      const T0 = 1.2, S = 0.75;
      const board = el("g", {}, svg);
      el("rect", { x: 18, y: 18, width: 764, height: 564, rx: 22, fill: PALE, stroke: INK, "stroke-width": 4 }, board);
      el("rect", { x: 32, y: 32, width: 736, height: 536, rx: 14, fill: "none", stroke: INK, "stroke-width": 1.5 }, board);
      el("rect", { x: 7, y: 7, width: 786, height: 586, rx: 30, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, board);
      txt(board, 400, 98, "Sintra's 12 helpers", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      el("path", { d: "M72 128 H728", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "1 9", "stroke-linecap": "round" }, board);
      const under = el("g", {}, board);
      const rows = ROWS.map(([name, job], i) => {
        const x = i < 6 ? 60 : 492, y = 186 + (i % 6) * 64;
        const line = el("path", { stroke: YEL, "stroke-width": 9, "stroke-linecap": "round", fill: "none", opacity: 0 }, under);
        txt(board, x, y, name, { "font-family": MONO, "font-size": 26, "font-weight": 700 });
        const j = txt(board, x + 112, y, job, { "font-size": 26, "font-weight": 500 });
        return { line, x0: x - 2, x1: x + 112 + j.getComputedTextLength() + 2, y: y + 20 };
      });
      const mk = el("g", {}, board), mkIn = el("g", { transform: "rotate(-5) scale(0.8)" }, mk);
      el("rect", { x: 66, y: -12, width: 24, height: 24, rx: 7, fill: LIL, stroke: INK, "stroke-width": 3 }, mkIn);
      el("path", { d: "M1 0 L15 -8 V8 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, mkIn);
      el("rect", { x: 13, y: -11, width: 58, height: 22, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, mkIn);
      const rowAt = (t) => (t < T0 ? -1 : Math.min(11, Math.floor((t - T0) / S)));
      const REST = [-110, rows[0].y];
      let last = 0, pos = REST.slice(), jump = null;
      button(board, "Sintra's 12 helpers: tap to move the line to the next name", () => {
        const cur = rowAt(last), nx = (cur + 1) % 12;
        jump = { i: nx, from: pos.slice(), prev: cur };
        api.seek(T0 + nx * S + 0.001);
      });
      return (t) => {
        last = t;
        const i = rowAt(t);
        rows.forEach((R) => R.line.setAttribute("opacity", 0));
        let p;
        if (i < 0) p = lerp(REST, [rows[0].x0, rows[0].y], io(seg(t, 0.2, T0)));
        else {
          const u = (t - T0 - i * S) / S, R = rows[i];
          if (jump && (jump.i !== i || u > 0.3)) jump = null;
          const from = jump ? jump.from : i ? [rows[i - 1].x1, rows[i - 1].y] : [R.x0, R.y], prev = jump ? jump.prev : i - 1;
          if (prev >= 0 && prev !== i && u < 0.25) { const P = rows[prev]; P.line.setAttribute("d", `M${P.x0} ${P.y} H${P.x1}`); P.line.setAttribute("opacity", 1 - seg(u, 0, 0.25)); }
          const k1 = io(seg(u, 0, 0.18)), k2 = io(seg(u, 0.18, 0.25)), d = io(seg(u, 0.25, 0.8)), x = R.x0 + (R.x1 - R.x0) * d;
          if (d > 0) { R.line.setAttribute("d", `M${R.x0} ${R.y} H${x}`); R.line.setAttribute("opacity", 1); }
          p = u < 0.25 ? [from[0] + (R.x0 - from[0]) * k1, from[1] + (R.y - from[1]) * k2] : [x, R.y];
        }
        pos = p;
        tf(mk, p[0], p[1]);
      };
    },
  };

  /* ---- 2. a blue price gun stamps three tags onto a shelf; a credits token drops beside each ---- */
  SC.pricegun = {
    dur: 8, still: 8,
    build(svg, api) {
      const TAGS = [["One month", "$48.50", ""], ["3 months", "$23.60", "a month"], ["12 months", "$15.60", "a month"]];
      const ST = [1.3, 2.9, 4.5], HOME = [620, 250];
      const shelf = el("g", {}, svg);
      el("rect", { x: 6, y: 290, width: 788, height: 292, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, shelf);
      [110, 690].forEach((x) => el("path", { d: `M${x - 20} 498 H${x + 20} L${x + 5} 556 H${x - 5} Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shelf));
      el("path", { d: "M16 330 L44 304 H756 L784 330 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, shelf);
      el("rect", { x: 16, y: 330, width: 768, height: 170, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, shelf);
      const tags = TAGS.map(([a, b, c], i) => {
        const cx = 108 + i * 246, g = el("g", { opacity: 0 }, shelf);
        el("rect", { x: cx - 75, y: 345, width: 150, height: 130, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        txt(g, cx, c ? 382 : 394, a, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        txt(g, cx, c ? 428 : 446, b, { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
        if (c) txt(g, cx, 460, c, { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
        const tok = el("g", { opacity: 0 }, shelf);
        el("circle", { r: 38, fill: MINT, stroke: INK, "stroke-width": 3 }, tok);
        txt(tok, 0, 0, "250", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        txt(tok, 0, 20, "credits", { "text-anchor": "middle", "font-size": 15, "font-weight": 600 });
        const burst = el("g", { opacity: 0 }, svg);
        const rays = [200, 235, 305, 340].map(() => el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, burst));
        return { g, tok, burst, rays, cx, s: ST[i] };
      });
      const gun = el("g", {}, svg);
      const trig = el("path", { d: "M26 -92 Q30 -124 62 -138", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, gun);
      el("path", { d: "M44 -92 L104 -184 Q112 -196 124 -188 L140 -176 Q150 -168 142 -156 L96 -92 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, gun);
      const roll = el("g", {}, gun);
      el("circle", { r: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, roll);
      el("circle", { r: 8, fill: SKY, stroke: INK, "stroke-width": 2 }, roll);
      el("path", { d: "M0 -8 V-20", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, roll);
      el("path", { d: "M-14 -34 H14 L8 0 H-8 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, gun);
      el("rect", { x: -60, y: -92, width: 170, height: 60, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 3 }, gun);
      el("rect", { x: -46, y: -79, width: 64, height: 30, rx: 8, fill: SKY, stroke: INK, "stroke-width": 2 }, gun);
      const KX = [[0, HOME[0]], [1.0, 108], [1.7, 108], [2.5, 354], [3.3, 354], [4.1, 600], [4.9, 600], [5.8, HOME[0]]];
      const KY = [[0, HOME[1]], [1.0, 296], [4.9, 296], [5.8, HOME[1]]];
      const key = (K, t) => { for (let j = 1; j < K.length; j++) if (t <= K[j][0]) return K[j - 1][1] + (K[j][1] - K[j - 1][1]) * io(seg(t, K[j - 1][0], K[j][0])); return K[K.length - 1][1]; };
      let gp = HOME.slice(), from = null;
      button(shelf, "Sintra plan tags: tap to restamp them in order", () => { from = gp.slice(); api.seek(0.001); });
      return (t) => {
        if (from && t > 1.0) from = null;
        let x = key(KX, t), y = key(KY, t);
        if (from && t <= 1.0) { const k = io(seg(t, 0, 1.0)); x = from[0] + (108 - from[0]) * k; y = from[1] + (296 - from[1]) * k; }
        let dip = 0, sq = 0, turn = 0;
        tags.forEach((T) => {
          const c = seg(t, T.s - 0.12, T.s + 0.22), b = Math.sin(Math.PI * c);
          dip += b * 40; sq += b; turn += io(c) * 120;
          const on = t >= T.s, k = ob(seg(t, T.s, T.s + 0.3)), sc = 0.7 + 0.3 * k;
          T.g.setAttribute("opacity", on ? 1 : 0);
          T.g.setAttribute("transform", `translate(${T.cx} 410) scale(${sc}) translate(${-T.cx} -410)`);
          const D = T.s + 0.2, f = seg(t, D, D + 0.6);
          T.tok.setAttribute("opacity", t >= D ? 1 : 0);
          tf(T.tok, T.cx + 123, -60 + 472 * bo(f));
          const r = seg(t, T.s, T.s + 0.35);
          T.burst.setAttribute("opacity", r > 0 && r < 1 ? 1 - r : 0);
          T.rays.forEach((n, j) => { const a = ([200, 235, 305, 340][j] * Math.PI) / 180, r0 = 22 + 10 * r, r1 = r0 + 14; n.setAttribute("d", `M${T.cx + Math.cos(a) * r0} ${336 + Math.sin(a) * r0} L${T.cx + Math.cos(a) * r1} ${336 + Math.sin(a) * r1}`); });
        });
        gp = [x, y];
        tf(gun, x, y + dip);
        trig.setAttribute("transform", `rotate(${16 * sq} 26 -92)`);
        roll.setAttribute("transform", `translate(-26 -112) rotate(${turn})`);
      };
    },
  };

  /* ---- 3. a lilac sandwich board lists the picks one line at a time ---- */
  SC.sandwichboard = {
    dur: 7.8, still: 7.8,
    build(svg, api) {
      const LINES = [["Named cast:", "Marblism"], ["Team of agents:", "Munder Difflin"], ["Slack and calls:", "Lindy"], ["Claude plan:", "Claude Cowork"], ["Enterprise:", "Relevance AI"], ["Stay on:", "Sintra"]];
      const T0 = 0.3, GAP = 1.1, PALE = "#E8E0FF", Y = (i) => 186 + i * 54;
      const btn = el("g", {}, svg);
      el("rect", { x: 40, y: 8, width: 720, height: 588, rx: 28, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, btn);
      const flip = el("g", {}, btn);
      el("path", { d: "M118 500 L84 584 H114 L148 500 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, flip);
      el("path", { d: "M682 500 L716 584 H686 L652 500 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, flip);
      el("path", { d: "M136 30 H664 L704 516 H96 Z", fill: LIL, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, flip);
      el("path", { d: "M160 54 H640 L674 492 H126 Z", fill: PALE, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, flip);
      el("rect", { x: 368, y: 18, width: 64, height: 22, rx: 11, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, flip);
      txt(flip, 400, 114, "Pick your helper", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      el("path", { d: "M196 140 H604", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "1 9", "stroke-linecap": "round" }, flip);
      const lines = LINES.map(([a, b], i) => {
        const g = el("g", { opacity: 0 }, flip), n = txt(g, 196, Y(i), "", { "font-size": 26, "font-weight": 500 });
        el("tspan", {}, n).textContent = a;
        el("tspan", { dx: 10, "font-family": MONO, "font-weight": 700 }, n).textContent = b;
        return g;
      });
      const arrow = el("g", {}, flip);
      el("path", { d: "M-18 -6 H0 V-15 L16 0 L0 15 V6 H-18 Z", fill: BLUE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, arrow);
      const AX = 166, AY = (i) => Y(i) - 9;
      let prevN = 6, shown = 6;
      button(btn, "Pick your helper: tap to flip the board to the first line again", () => { prevN = shown; api.seek(0.001); });
      return (t) => {
        if (t >= T0 + 5 * GAP + 0.5) prevN = 6;
        const sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * seg(t, 0, 0.6))));
        flip.setAttribute("transform", `translate(400 0) scale(${sx} 1) translate(-400 0)`);
        if (t < T0) {
          shown = prevN;
          lines.forEach((g, i) => { g.setAttribute("opacity", i < prevN ? 1 : 0); g.setAttribute("transform", ""); });
          arrow.setAttribute("opacity", prevN ? 1 : 0); tf(arrow, AX, AY(Math.max(0, prevN - 1)));
          return;
        }
        const cur = Math.min(5, Math.floor((t - T0) / GAP));
        shown = cur + 1;
        lines.forEach((g, i) => { const k = oc(seg(t, T0 + i * GAP, T0 + i * GAP + 0.4)); g.setAttribute("opacity", i <= cur ? k : 0); g.setAttribute("transform", `translate(${24 * (1 - k)} 0)`); });
        const m = io(seg(t, T0 + cur * GAP, T0 + cur * GAP + 0.4)), y0 = cur ? AY(cur - 1) : AY(0) - 34;
        arrow.setAttribute("opacity", cur ? 1 : seg(t, T0, T0 + 0.2));
        tf(arrow, AX, y0 + (AY(cur) - y0) * m);
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
      txt(svg, 64, 180, "Sintra alternatives", { "font-size": 72, "font-weight": 700 });
      el("path", { d: "M66 208 H300", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 262, "5 tools like Sintra for small business", { "font-size": 26, "font-weight": 500, fill: MUTE });
      el("rect", { x: 390, y: 318, width: 180, height: 50, rx: 12, fill: GREY, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 480, 351, "Sintra", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      const ALT = [["Marblism", SKY], ["Munder Difflin", YEL], ["Lindy", LIL], ["Claude Cowork", MINT], ["Relevance AI", BLUE]];
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
