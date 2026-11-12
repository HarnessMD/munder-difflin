/* Bright coded scenes for "Gemini Decisions API vs OpenAI Decisions API". Vanilla JS, no library.
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
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

  const SC = {};

  /* ---- 1. five input beams enter a glass prism, three slim answer beams come out ---- */
  SC.prism = {
    dur: 8, still: 8,
    build(svg, api) {
      const IN = [["text", BLUE], ["images", MINT], ["audio", BLUE], ["video", MINT], ["PDF", BLUE]];
      const OUT = [["yes or no", YEL], ["choice", LIL], ["score", SKY]];
      const lf = (y) => [285 + (115 * (450 - y)) / 300, y], rf = (y) => [400 + (115 * (y - 150)) / 300, y];
      el("ellipse", { cx: 400, cy: 474, rx: 150, ry: 12, fill: SOFT }, svg);
      const beam = (a, b, col, w) => ({
        a, b,
        under: el("line", { x1: a[0], y1: a[1], x2: a[0], y2: a[1], stroke: INK, "stroke-width": w + 6, "stroke-linecap": "round" }, svg),
        top: el("line", { x1: a[0], y1: a[1], x2: a[0], y2: a[1], stroke: col, "stroke-width": w, "stroke-linecap": "round" }, svg),
        dot: el("circle", { r: w * 0.3, fill: "#fff", opacity: 0 }, svg),
      });
      const ins = IN.map(([s, col], i) => {
        const y = 150 + i * 75, b = beam([150, y], lf(250 + i * 25), col, 11);
        b.lab = txt(svg, 134, y + 9, s, { "text-anchor": "end", "font-size": 26 });
        return b;
      });
      const outs = OUT.map(([s, col], j) => {
        const y = 175 + j * 125, b = beam(rf(255 + j * 45), [630, y], col, 5);
        b.lab = txt(svg, 646, y + 9, s, { "font-size": 26 });
        return b;
      });
      const tri = (s) => `M0 ${-200 * s} L${115 * s} ${100 * s} L${-115 * s} ${100 * s} Z`;
      const glass = el("g", {}, svg);
      el("path", { d: tri(1.16), fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", "stroke-linejoin": "round", class: "mg-ring" }, glass);
      el("path", { d: tri(1), fill: SOFT }, glass);
      const flash = el("path", { d: tri(1), fill: "#fff", opacity: 0 }, glass);
      el("path", { d: "M-9 -120 L-70 40", stroke: "#fff", "stroke-width": 8, "stroke-linecap": "round" }, glass);
      el("path", { d: "M16 -128 L26 -100", stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round" }, glass);
      const from = [lf(300)[0] - 400, -50];
      const rays = OUT.map(([, col], j) => {
        const to = [rf(255 + j * 45)[0] - 400, 255 + j * 45 - 350], g = el("g", { opacity: 0 }, glass);
        el("line", { x1: from[0], y1: from[1], x2: to[0], y2: to[1], stroke: INK, "stroke-width": 9, "stroke-linecap": "round", opacity: 0.35 }, g);
        el("line", { x1: from[0], y1: from[1], x2: to[0], y2: to[1], stroke: col, "stroke-width": 5, "stroke-linecap": "round" }, g);
        return g;
      });
      el("path", { d: tri(1), fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, glass);
      button(glass, "Prism: replay the beams", () => api.seek(0));
      const grow = (b, k) => { const [x, y] = lerp(b.a, b.b, k); for (const n of [b.under, b.top]) { n.setAttribute("x2", x); n.setAttribute("y2", y); n.setAttribute("opacity", k > 0 ? 1 : 0); } };
      const run = (b, on, f) => { const [x, y] = lerp(b.a, b.b, f); b.dot.setAttribute("cx", x); b.dot.setAttribute("cy", y); b.dot.setAttribute("opacity", on ? Math.sin(Math.PI * f) : 0); };
      return (t) => {
        tf(glass, 400, 350, 0.88 + 0.12 * ob(seg(t, 0, 0.5)));
        ins.forEach((b, i) => {
          grow(b, oc(seg(t, 0.5 + i * 0.3, 1.2 + i * 0.3)));
          const o = oc(seg(t, 0.4 + i * 0.3, 0.8 + i * 0.3));
          b.lab.setAttribute("opacity", o); b.lab.setAttribute("transform", `translate(${-14 * (1 - o)} 0)`);
          run(b, t > 1.2 + i * 0.3, (t * 0.7 + i * 0.37) % 1);
        });
        const f = seg(t, 2.4, 3);
        flash.setAttribute("opacity", 0.85 * Math.sin(Math.PI * f));
        rays.forEach((r) => r.setAttribute("opacity", oc(seg(t, 2.4, 2.9))));
        outs.forEach((b, j) => {
          grow(b, oc(seg(t, 3 + j * 0.35, 3.7 + j * 0.35)));
          const o = oc(seg(t, 3.4 + j * 0.35, 3.8 + j * 0.35));
          b.lab.setAttribute("opacity", o); b.lab.setAttribute("transform", `translate(${14 * (1 - o)} 0)`);
          run(b, t > 3.7 + j * 0.35, (t * 0.9 + j * 0.29) % 1);
        });
      };
    },
  };

  /* ---- 2. slips drop into two ballot boxes; OpenAI stops at 400, Gemini counts on to 1,000 ---- */
  SC.ballot = {
    dur: 10, still: 10,
    build(svg, api) {
      const W = ["predicate", "choice", "score"], SX = [230, 400, 570], SY = 104, SR = [-4, 3, -3], RATE = 140, D = 10;
      const fmt = (n) => (n >= 1000 ? `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, "0")}` : String(n));
      const slip = (g, w) => {
        el("rect", { x: -74, y: -26, width: 148, height: 52, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 8, w, { "text-anchor": "middle", "font-size": 22 });
      };
      const boxes = [["OpenAI", 200, 400, 0.8], ["Gemini", 600, 1000, 1.2]].map(([name, cx, cap, first], j) => {
        const end = first + 0.6 + cap / RATE, n = Math.floor((end - 0.6 - first) / 0.8) + 1;
        const g = el("g", {}, svg);
        el("rect", { x: cx - 152, y: 262, width: 304, height: 284, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("ellipse", { cx, cy: 526, rx: 138, ry: 10, fill: SOFT }, g);
        const body = el("g", {}, g);
        el("rect", { x: cx - 120, y: 300, width: 240, height: 216, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
        el("rect", { x: cx - 136, y: 276, width: 272, height: 30, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, body);
        el("rect", { x: cx - 62, y: 285, width: 124, height: 12, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2.5 }, body);
        txt(body, cx, 358, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 32, "font-weight": 700 });
        const disp = el("g", {}, body);
        const panel = el("rect", { x: -94, y: -38, width: 188, height: 76, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, disp);
        const num = txt(disp, 0, 16, "0", { "text-anchor": "middle", "font-family": MONO, "font-size": 46, "font-weight": 700 });
        const b = { j, cx, cap, first, end, n, body, disp, panel, num, t0: null };
        button(g, `${name} box: restart its count`, () => { b.t0 = api.now(); api.poke(); });
        return b;
      });
      boxes.forEach((b) => { b.fly = W.map((w) => { const f = el("g", { opacity: 0 }, svg); slip(f, w); return f; }); });
      W.forEach((w, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -68, y: -18, width: 148, height: 52, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2 }, g);
        slip(g, w); tf(g, SX[i], SY, 1, SR[i]);
      });
      const place = (f, w, cx, p) => {
        const x = SX[w] + (cx - SX[w]) * io(p), y = SY + (291 - SY) * p;
        const s = 1 - 0.3 * p, sy = s * (1 - 0.9 * seg(p, 0.72, 1));
        f.setAttribute("transform", `translate(${x} ${y}) rotate(${SR[w] * (1 - p)}) scale(${s} ${sy})`);
        f.setAttribute("opacity", 1 - seg(p, 0.9, 1));
      };
      return (t, now) => {
        boxes.forEach((b) => {
          const lt = b.t0 == null ? t : (((now - b.t0) % D) + D) % D;
          b.num.textContent = fmt(Math.round(b.cap * seg(lt, b.first + 0.6, b.end)));
          b.panel.setAttribute("fill", lt >= b.end ? YEL : SOFT);
          tf(b.disp, b.cx, 424, 1 + 0.12 * Math.sin(Math.PI * seg(lt, b.end, b.end + 0.35)));
          let jig = 0;
          const shown = [false, false, false];
          for (let k = 0; k < b.n; k++) {
            const d = b.first + 0.8 * k, p = (lt - d) / 0.6, land = lt - d - 0.6, w = (2 * k + b.j) % 3;
            if (p >= 0 && p < 1) { shown[w] = true; place(b.fly[w], w, b.cx, p); }
            if (land >= 0 && land < 0.2) jig = 4 * Math.sin((Math.PI * land) / 0.2);
          }
          b.fly.forEach((f, w) => { if (!shown[w]) f.setAttribute("opacity", 0); });
          b.body.setAttribute("transform", `translate(0 ${jig})`);
        });
      };
    },
  };

  /* ---- 3. two tollbooths: input cars stop and pay, output cars roll through the open lane ---- */
  SC.tollbooth = {
    dur: 8, still: 8,
    build(svg, api) {
      const BX = 442, PV = 534, STOP = 468, D = 8;
      const car = (label, col) => {
        const g = el("g", {}, svg);
        el("rect", { x: -52, y: -21, width: 104, height: 42, rx: 14, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: 31, y: -14, width: 10, height: 28, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        txt(g, -9, 6, label, { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
        return g;
      };
      const bands = [["Gemini", 36, 0, [0.2917, 0.7917], [LIL, SKY]], ["OpenAI", 330, -0.4, [0.2583, 0.7583], [SKY, LIL]]].map(([name, Y, off, offs, cols]) => {
        el("rect", { x: 0, y: Y + 50, width: 800, height: 60, fill: SOFT }, svg);
        el("rect", { x: 0, y: Y + 160, width: 800, height: 60, fill: SOFT }, svg);
        [50, 110, 160, 220].forEach((d) => el("path", { d: `M0 ${Y + d} H800`, stroke: INK, "stroke-width": 2.5 }, svg));
        el("rect", { x: BX - 165, y: Y, width: 330, height: 40, rx: 9, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
        el("path", { d: `M${BX - 7} ${Y + 43} H${BX + 7} L${BX} ${Y + 49} Z`, fill: INK }, svg);
        txt(svg, BX, Y + 27, "$0.10 per 1M input tokens", { "text-anchor": "middle", "font-size": 20 });
        el("rect", { x: 168, y: Y + 114, width: 46, height: 34, rx: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
        el("path", { d: `M184 ${Y + 151} H198 L191 ${Y + 157} Z`, fill: INK }, svg);
        txt(svg, 191, Y + 139, "0", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
        const booth = el("g", {}, svg);
        el("rect", { x: BX - 82, y: Y + 108, width: 164, height: 54, rx: 12, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, booth);
        el("rect", { x: BX - 76, y: Y + 114, width: 152, height: 42, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, booth);
        const win = el("rect", { x: BX + 10, y: Y + 114, width: 44, height: 8, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2 }, booth);
        txt(booth, BX, Y + 145, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        const inCar = car("input", BLUE), outCars = cols.map((c) => car("output", c));
        const arm = el("g", {}, svg);
        el("rect", { x: -4, y: -4, width: 60, height: 8, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, arm);
        [20, 38].forEach((x) => el("path", { d: `M${x} -4 V4`, stroke: INK, "stroke-width": 2.5 }, arm));
        el("circle", { cx: PV, cy: Y + 112, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        const coin = el("circle", { r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5, opacity: 0 }, svg);
        const b = { Y, off, offs, inCar, outCars, arm, coin, win, tap: -1e9 };
        button(booth, `${name} booth: lift the barrier again`, () => { b.tap = api.now(); api.poke(); });
        return b;
      });
      return (t, now) => {
        bands.forEach((b) => {
          const u = (((t + b.off) % D) + D) % D, Y = b.Y;
          const x = u < 0.7 ? STOP : u < 2.2 ? STOP + 440 * seg(u, 0.7, 2.2) ** 2 : u < 3.6 ? -120 : -80 + (STOP + 80) * oc(seg(u, 3.6, 5.6));
          tf(b.inCar, x, Y + 80);
          b.outCars.forEach((c, i) => tf(c, -80 + ((u / D + b.offs[i]) % 1) * 960, Y + 190));
          const s = now - b.tap, tap = s >= 0 && s < 1.6 ? io(seg(s, 0, 0.4)) - io(seg(s, 1.2, 1.6)) : 0;
          const lift = Math.max(io(seg(u, 0.2, 0.7)) - io(seg(u, 1.6, 2.1)), tap);
          b.arm.setAttribute("transform", `translate(${PV} ${Y + 112}) rotate(${-90 + 90 * lift})`);
          const p = seg(u, 5.9, 6.5);
          b.coin.setAttribute("opacity", p > 0 && p < 1 ? 1 : 0);
          b.coin.setAttribute("cx", STOP + 30 + (BX + 32 - STOP - 30) * p);
          b.coin.setAttribute("cy", Y + 80 + 38 * p - 30 * Math.sin(Math.PI * p));
          b.win.setAttribute("fill", u >= 6.5 || u < 0.7 ? MINT : SKY);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 2.4, still: 2.4,
    build(svg) {
      el("rect", { x: 64, y: 50, width: 120, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 124, 77, "Versus", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 77, "Checked 12 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 18, "font-weight": 500, fill: CAP });
      txt(svg, 64, 166, "Gemini Decisions API vs", { "font-size": 56, "font-weight": 700 });
      txt(svg, 64, 232, "OpenAI Decisions API", { "font-size": 56, "font-weight": 700 });
      el("path", { d: "M66 258 H420", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 308, "Price, inputs and limits side by side", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const card = (x, col, a) => {
        const g = el("g", {}, svg);
        el("rect", { x, y: 352, width: 360, height: 136, rx: 24, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, x + 180, 412, a, { "text-anchor": "middle", "font-family": MONO, "font-size": 40, "font-weight": 700 });
        txt(g, x + 180, 455, "Decisions API", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 500 });
        return g;
      };
      const L = card(64, BLUE, "Gemini"), R = card(536, LIL, "OpenAI");
      const vs = el("g", {}, svg);
      el("circle", { r: 38, fill: YEL, stroke: INK, "stroke-width": 3 }, vs);
      txt(vs, 0, 10, "vs", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      return (t, now) => {
        const u = Math.max(t, Math.min(now, 2.4));
        L.setAttribute("transform", `translate(${-460 * (1 - oc(seg(u, 0.2, 1.1)))} 0)`);
        R.setAttribute("transform", `translate(${460 * (1 - oc(seg(u, 0.35, 1.25)))} 0)`);
        tf(vs, 480, 420, ob(seg(u, 1.2, 1.7)));
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
