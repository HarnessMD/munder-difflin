/* Bright coded scenes for "DeepSeek V4.1 Flash 1017". Vanilla JS, no library.
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

  const lerp = (a, b, k) => a + (b - a) * k;
  const SW = 6; /* one stroke width for every outline */
  const ring = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": SW, class: "mg-ring" }, g);
  /* a four point sparkle, centred on 0,0 */
  const star = (p, r, fill) => el("path", { d: `M0 ${-r} Q${r * 0.2} ${-r * 0.2} ${r} 0 Q${r * 0.2} ${r * 0.2} 0 ${r} Q${-r * 0.2} ${r * 0.2} ${-r} 0 Q${-r * 0.2} ${-r * 0.2} 0 ${-r} Z`, fill, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, p);

  const SC = {};

  /* ---- 1. two bars race for each benchmark row; buttons switch the row ---- */
  SC.bars = {
    w: 1600, h: 1200, dur: 10, still: 7,
    build(svg, api) {
      txt(svg, 80, 124, "How does DeepSeek V4.1 Flash 1017 score?", { "font-size": 52, "font-weight": 700 });
      const D = [["Terminal-Bench 4.0", 31.2, 42.3], ["DeepSWE v1.1", 74.2, 77.0], ["Automation-Bench", 54.8, 60.5]];
      let sel = 0;
      const chips = D.map((d, i) => {
        const g = el("g", {}, svg), x = 80 + i * 490;
        ring(g, x - 9, 191, 468, 114, 57);
        const r = el("rect", { x, y: 200, width: 450, height: 96, rx: 48, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        txt(g, x + 225, 262, d[0], { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        button(g, `${d[0]}: V4.1 Flash ${d[1]}, V4.1 Flash 1017 ${d[2]}`, () => { sel = i; api.seek(0.4); });
        return r;
      });
      const BASE = 960, SCALE = 5.6, B = [[380, LIL, "V4.1 Flash"], [900, YEL, "V4.1 Flash 1017"]];
      [0, 25, 50, 75, 100].forEach((v) => el("path", { d: `M300 ${BASE - v * SCALE} H1300`, stroke: SOFT, "stroke-width": 4 }, svg));
      el("path", { d: `M260 ${BASE} H1340`, stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, svg);
      const bars = B.map(([x, fill, name]) => {
        const r = el("rect", { x, width: 320, rx: 18, fill, stroke: INK, "stroke-width": SW }, svg);
        const v = txt(svg, x + 160, 0, "", { "text-anchor": "middle", "font-size": 64, "font-weight": 700, "font-family": MONO });
        txt(svg, x + 160, BASE + 64, name, { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
        return { r, v };
      });
      txt(svg, 800, 1120, "DeepSeek's own table on the model card, 17 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      const W = [[0.6, 2.4], [2.6, 4.6]];
      return (t) => {
        const d = D[sel], out = seg(t, 9.3, 9.9);
        chips.forEach((r, i) => { r.setAttribute("fill", i === sel ? YEL : "#fff"); r.parentNode.setAttribute("aria-pressed", i === sel); });
        bars.forEach((b, i) => {
          const k = oc(seg(t, W[i][0], W[i][1])) * (1 - io(out)), val = d[i + 1] * k, h = Math.max(val * SCALE, 0.001);
          b.r.setAttribute("y", BASE - h); b.r.setAttribute("height", h); b.r.setAttribute("opacity", k > 0 ? 1 : 0);
          b.v.setAttribute("y", BASE - h - 26); b.v.textContent = k > 0 ? val.toFixed(1) : ""; b.v.setAttribute("opacity", k > 0 ? 1 : 0);
        });
      };
    },
  };

  /* ---- 2. a receipt printer feeds out the deepseek-flash price; a button switches off peak and peak ---- */
  SC.receipt = {
    w: 1600, h: 1200, dur: 12, still: 9.2,
    build(svg, api) {
      txt(svg, 80, 124, "How much does it cost?", { "font-size": 52, "font-weight": 700 });
      const M = [["Off peak", "$0.15", "$0.60"], ["Peak", "$0.30", "$1.20"]];
      let sel = 0;
      txt(svg, 1084, 340, "deepseek-flash rates", { "font-size": 36, "font-weight": 500, fill: MUTE });
      const chips = M.map((m, i) => {
        const g = el("g", {}, svg), y = 374 + i * 136;
        ring(g, 1071, y - 9, 468, 122, 61);
        const r = el("rect", { x: 1080, y, width: 450, height: 104, rx: 52, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        txt(g, 1305, y + 65, m[0], { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
        button(g, `deepseek-flash at ${m[0].toLowerCase()} rates: ${m[1]} input on a cache miss and ${m[2]} output, per million tokens`, () => { sel = i; api.seek(0.4); });
        return { g, r };
      });
      const SL = 935, PX = 250, PW = 600, PH = 735, CX = PX + PW / 2;
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "ds-slot" }, defs);
      el("rect", { x: 0, y: 0, width: 1600, height: SL }, cp);
      const paper = el("g", {}, el("g", { "clip-path": "url(#ds-slot)" }, svg));
      let d = `M${PX} 18`;
      for (let i = 1; i <= 20; i++) d += ` L${PX + i * 30} ${i % 2 ? 0 : 18}`;
      d += ` V${PH} H${PX} Z`;
      el("path", { d, fill: LIL, transform: "translate(16 0)" }, paper);
      el("path", { d, fill: "#fff", stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, paper);
      const L = (y, s, size, weight, fill = INK) => txt(paper, CX, y, s, { "text-anchor": "middle", "font-size": size, "font-weight": weight, "font-family": MONO, fill });
      const rule = (y) => el("path", { d: `M${PX + 40} ${y} H${PX + PW - 40}`, stroke: LIL, "stroke-width": SW, "stroke-dasharray": "2 16", "stroke-linecap": "round" }, paper);
      L(84, "deepseek-flash", 42, 700);
      const mode = L(138, "", 32, 500, MUTE);
      rule(178);
      L(238, "Input, cache miss", 32, 500);
      const vin = L(318, "", 72, 700);
      L(388, "Output", 32, 500);
      const vout = L(468, "", 72, 700);
      L(538, "per million tokens", 32, 500);
      L(604, "17 Oct 2026", 40, 700);
      rule(650);
      const pr = el("g", {}, svg);
      el("rect", { x: 100, y: SL - 12, width: 1400, height: 205, rx: 40, fill: BLUE, stroke: INK, "stroke-width": SW }, pr);
      el("rect", { x: PX - 24, y: SL - 11, width: PW + 48, height: 22, rx: 11, fill: INK }, pr);
      [1010, 1046, 1082].forEach((y) => el("path", { d: `M${PX} ${y} H${PX + 300}`, stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, pr));
      const led = el("circle", { cx: 880, cy: 1046, r: 15, fill: "#fff", stroke: INK, "stroke-width": SW }, pr);
      el("circle", { cx: 962, cy: 1046, r: 34, fill: YEL, stroke: INK, "stroke-width": SW }, pr);
      el("rect", { x: 1070, y: 990, width: 380, height: 112, rx: 26, fill: "#fff", stroke: INK, "stroke-width": SW }, pr);
      txt(pr, 1260, 1062, "DeepSeek API", { "text-anchor": "middle", "font-size": 44, "font-weight": 700 });
      const T0 = 0.7, ST = 0.62, TG = [150, 255, 340, 405, 490, 555, 625, 735];
      return (t) => {
        const m = M[sel];
        mode.textContent = `${m[0]} rates`; vin.textContent = m[1]; vout.textContent = m[2];
        chips.forEach((c, i) => { c.r.setAttribute("fill", i === sel ? YEL : "#fff"); c.g.setAttribute("aria-pressed", i === sel); });
        let F = 0, busy = false;
        TG.forEach((g, i) => { const a = T0 + i * ST, k = seg(t, a, a + 0.42); if (k > 0 && k < 1) busy = true; F = lerp(F, g, io(k)); });
        const out = seg(t, 11.3, 11.9);
        paper.setAttribute("transform", `translate(0 ${SL - F - 80 * io(out)})`);
        paper.setAttribute("opacity", 1 - out);
        pr.setAttribute("transform", `translate(0 ${busy ? Math.sin(t * 90) * 1.5 : 0})`);
        led.setAttribute("fill", busy ? MINT : "#fff");
      };
    },
  };

  /* ---- 3. a terminal types the setup, then a plug slides into the DeepSeek socket and a light turns green ---- */
  SC.plug = {
    w: 1600, h: 1200, dur: 10, still: 8,
    build(svg, api) {
      txt(svg, 80, 124, "How do you use it in Claude Code?", { "font-size": 52, "font-weight": 700 });
      const term = el("g", {}, svg);
      ring(term, 71, 211, 778, 618, 30);
      el("rect", { x: 96, y: 236, width: 760, height: 600, rx: 24, fill: LIL }, term);
      el("rect", { x: 80, y: 220, width: 760, height: 600, rx: 24, fill: "#fff", stroke: INK, "stroke-width": SW }, term);
      el("path", { d: "M80 300 H840", stroke: INK, "stroke-width": SW }, term);
      [[LIL, 128], [SKY, 174], [MINT, 220]].forEach(([f, x]) => el("circle", { cx: x, cy: 260, r: 16, fill: f, stroke: INK, "stroke-width": 4 }, term));
      const LN = [["ANTHROPIC_BASE_URL=", MUTE], ["  api.deepseek.com/anthropic", INK], ["ANTHROPIC_MODEL=", MUTE], ["  deepseek-flash[1m]", INK], ["$ claude", BLUE]];
      const lines = LN.map(([s, f], i) => txt(term, 120, 380 + i * 86, "", { "font-size": 34, "font-weight": 700, "font-family": MONO, fill: f }));
      const caret = el("rect", { width: 18, height: 38, fill: INK }, term);
      button(term, "Type the Claude Code setup again", () => api.seek(0.3));
      const SX = 1270, SY = 360, SWD = 250, SH = 280;
      el("rect", { x: SX + 14, y: SY + 14, width: SWD, height: SH, rx: 30, fill: SKY }, svg);
      el("rect", { x: SX, y: SY, width: SWD, height: SH, rx: 30, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      [SY + 100, SY + 180].forEach((y) => el("rect", { x: SX - 3, y: y - 14, width: 46, height: 28, rx: 8, fill: INK }, svg));
      txt(svg, SX + SWD / 2, SY + SH + 70, "DeepSeek API", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      const light = el("circle", { cx: SX + SWD / 2, cy: SY - 70, r: 30, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      const glow = el("circle", { cx: SX + SWD / 2, cy: SY - 70, r: 30, fill: "none", stroke: MINT, "stroke-width": 8 }, svg);
      const plug = el("g", {}, svg);
      const cable = el("path", { fill: "none", stroke: INK, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      [SY + 100, SY + 180].forEach((y) => el("rect", { x: 280, y: y - 10, width: 60, height: 20, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 4 }, plug));
      el("rect", { x: 0, y: SY + 40, width: 290, height: 200, rx: 28, fill: YEL, stroke: INK, "stroke-width": SW }, plug);
      txt(plug, 145, SY + 130, "Anthropic", { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
      txt(plug, 145, SY + 180, "format", { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });
      txt(svg, 800, 1060, "From DeepSeek's Claude Code guide, 17 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      const total = LN.reduce((n, l) => n + l[0].length, 0);
      return (t) => {
        const out = seg(t, 9.3, 9.9);
        let n = Math.floor(total * seg(t, 0.4, 4.8)), cx = 120, cy = 380;
        lines.forEach((ln, i) => { const s = LN[i][0], k = Math.max(0, Math.min(s.length, n)); n -= s.length; ln.textContent = s.slice(0, k); if (k > 0) { cx = 120 + k * 20.4; cy = 380 + i * 86; } });
        caret.setAttribute("x", cx + 4); caret.setAttribute("y", cy - 30); caret.setAttribute("opacity", Math.floor(t * 2) % 2 && t > 4.8 ? 0 : 1);
        const k = ob(seg(t, 5.1, 6.1)), px = lerp(860, SX - 340, k) - 60 * io(out);
        plug.setAttribute("transform", `translate(${px} 0)`);
        cable.setAttribute("d", `M840 620 C${880} 700 ${px - 120} ${SY + 260} ${px} ${SY + 140}`);
        const on = t >= 6.1 && out < 1;
        light.setAttribute("fill", on ? MINT : "#fff");
        glow.setAttribute("r", 30 + 26 * seg(t, 6.1, 7.0)); glow.setAttribute("opacity", on ? 1 - seg(t, 6.1, 7.0) : 0);
      };
    },
  };

  /* ---- title image: a stopwatch hand sweeps and the elapsed arc fills ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 4,
    build(svg) {
      txt(svg, 100, 214, "What changed, price and setup", { "font-size": 42, "font-weight": 500, fill: MUTE });
      txt(svg, 90, 370, "DeepSeek V4.1", { "font-size": 112, "font-weight": 700 });
      txt(svg, 90, 512, "Flash 1017", { "font-size": 112, "font-weight": 700 });
      el("path", { d: "M100 562 H560", stroke: YEL, "stroke-width": 18, "stroke-linecap": "round" }, svg);
      el("rect", { x: 92, y: 620, width: 430, height: 80, rx: 40, fill: SOFT, stroke: INK, "stroke-width": SW }, svg);
      txt(svg, 307, 673, "Checked 17 Oct 2026", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      const CX = 1290, CY = 500, R = 230;
      el("rect", { x: CX - 40, y: CY - R - 70, width: 80, height: 56, rx: 14, fill: YEL, stroke: INK, "stroke-width": SW }, svg);
      el("rect", { x: CX - 18, y: CY - R - 20, width: 36, height: 30, fill: INK }, svg);
      el("circle", { cx: CX + 14, cy: CY + 14, r: R, fill: SKY }, svg);
      el("circle", { cx: CX, cy: CY, r: R, fill: "#fff", stroke: INK, "stroke-width": SW }, svg);
      const arc = el("path", { fill: MINT, opacity: 0.85 }, svg);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; el("path", { d: `M${CX + Math.sin(a) * (R - 22)} ${CY - Math.cos(a) * (R - 22)} L${CX + Math.sin(a) * (R - 52)} ${CY - Math.cos(a) * (R - 52)}`, stroke: INK, "stroke-width": i % 3 ? 4 : 8, "stroke-linecap": "round" }, svg); }
      const hand = el("path", { stroke: INK, "stroke-width": 10, "stroke-linecap": "round" }, svg);
      el("circle", { cx: CX, cy: CY, r: 18, fill: YEL, stroke: INK, "stroke-width": SW }, svg);
      const sp = [[1000, 250, 26, YEL], [1560, 330, 20, LIL], [1540, 760, 24, SKY], [1030, 760, 18, MINT]].map(([x, y, r, f]) => { const g = el("g", {}, svg); star(g, r, f); tf(g, x, y); return g; });
      return (t) => {
        const k = io(seg(t, 0.3, 3.2)), a = k * Math.PI * 1.6, r = R - 70;
        const x = CX + Math.sin(a) * r, y = CY - Math.cos(a) * r;
        hand.setAttribute("d", `M${CX} ${CY} L${x} ${y}`);
        arc.setAttribute("d", k > 0.001 ? `M${CX} ${CY} L${CX} ${CY - r} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${x} ${y} Z` : "");
        sp.forEach((g, i) => g.setAttribute("opacity", seg(t, 2.6 + i * 0.25, 3.0 + i * 0.25)));
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
