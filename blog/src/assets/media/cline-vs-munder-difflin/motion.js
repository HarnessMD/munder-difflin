/* Bright coded scenes for "Cline vs Munder Difflin". Vanilla JS, no library.
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
  /* a quadratic curve point, k from 0 to 1 */
  const qp = (a, c, b, k) => [(1 - k) * (1 - k) * a[0] + 2 * (1 - k) * k * c[0] + k * k * b[0], (1 - k) * (1 - k) * a[1] + 2 * (1 - k) * k * c[1] + k * k * b[1]];
  const qd = (a, c, b) => `M${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
  /* a cable that draws itself in: pathLength 1, dashoffset from 1 to 0 */
  const cable = (p, d, col = INK) => el("path", { d, fill: "none", stroke: col, "stroke-width": SW, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }, p);
  const desk = (p, x, y, w, h, label, size = 36) => {
    const g = el("g", {}, p);
    el("rect", { x: x + 12, y: y + 12, width: w, height: h, rx: 28, fill: SOFT }, g);
    const r = el("rect", { x, y, width: w, height: h, rx: 28, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
    txt(g, x + w / 2, y + h / 2 + size * 0.36, label, { "text-anchor": "middle", "font-size": size, "font-weight": 700 });
    return { g, r };
  };

  /* ---- 1. one Cline block feeds four tiles; tap a tile to mark it ---- */
  SC.sockets = {
    w: 1600, h: 1200, dur: 10, still: 8,
    build(svg, api) {
      txt(svg, 80, 124, "What is Cline?", { "font-size": 52, "font-weight": 700 });
      txt(svg, 80, 184, "One agent engine, several places to use it", { "font-size": 32, "font-weight": 500, fill: MUTE });
      const C = [800, 640];
      const T = [["VS Code", "extension", 120, 300, BLUE], ["Terminal", "npm i -g cline", 1100, 300, SKY], ["Desktop", "macOS and Windows", 120, 860, MINT], ["SDK", "@cline/sdk", 1100, 860, LIL]];
      let pick = -1;
      const cables = T.map(([, , x, y]) => {
        const end = [x < 800 ? x + 380 : x, y + 85], mid = [(C[0] + end[0]) / 2, end[1]];
        return cable(svg, qd(C, mid, end));
      });
      const tiles = T.map(([name, sub, x, y, col], i) => {
        const g = el("g", {}, svg);
        ring(g, x - 10, y - 10, 400, 190, 38);
        el("rect", { x: x + 12, y: y + 12, width: 380, height: 170, rx: 30, fill: SOFT }, g);
        const r = el("rect", { x, y, width: 380, height: 170, rx: 30, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        txt(g, x + 190, y + 80, name, { "text-anchor": "middle", "font-size": 44, "font-weight": 700 });
        txt(g, x + 190, y + 130, sub, { "text-anchor": "middle", "font-size": 26, "font-weight": 500, "font-family": MONO });
        const s = el("g", {}, g); star(s, 26, YEL);
        button(g, `${name}: ${sub}`, () => { pick = i; api.seek(7.2); });
        return { r, s, col, x, y };
      });
      const hub = el("g", {}, svg);
      el("rect", { x: 640, y: 560, width: 320, height: 160, rx: 36, fill: YEL, stroke: INK, "stroke-width": SW }, hub);
      txt(hub, 800, 658, "Cline", { "text-anchor": "middle", "font-size": 60, "font-weight": 700 });
      txt(svg, 800, 1130, "From Cline's README on GitHub, 17 Oct 2026", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      return (t) => {
        const out = 1 - io(seg(t, 9.3, 9.9)), pop = ob(seg(t, 0.1, 0.8));
        tf(hub, 800 * (1 - pop), 640 * (1 - pop), Math.max(pop, 0.001));
        tiles.forEach((d, i) => {
          const a = 1 + i * 1.3, k = oc(seg(t, a, a + 0.9)) * out, lit = t > a + 0.9 && out > 0.5;
          cables[i].setAttribute("stroke-dashoffset", 1 - k);
          d.r.setAttribute("fill", lit ? d.col : "#fff");
          const on = pick === i && t > 7.2 && out > 0.5, sk = on ? ob(seg(t, 7.2, 7.7)) : 0;
          tf(d.s, d.x + 372, d.y + 8, Math.max(sk, 0.001), 20 * sk);
          d.r.parentNode.setAttribute("aria-pressed", pick === i);
        });
      };
    },
  };

  /* ---- 2. an orchestrator desk sends task cards to three agent desks; a button starts a new job ---- */
  SC.office = {
    w: 1600, h: 1200, dur: 10, still: 8,
    build(svg, api) {
      txt(svg, 80, 124, "What is Munder Difflin?", { "font-size": 52, "font-weight": 700 });
      txt(svg, 80, 184, "One orchestrator splits the job between coding agents", { "font-size": 32, "font-weight": 500, fill: MUTE });
      const O = [800, 400], A = [["Claude Code", 120], ["Codex", 620], ["Gemini CLI", 1120]];
      const paths = A.map(([, x]) => { const end = [x + 180, 830], mid = [x + 180, 560]; return { a: O, c: mid, b: end }; });
      paths.forEach((p) => el("path", { d: qd(p.a, p.c, p.b), fill: "none", stroke: SOFT, "stroke-width": 14, "stroke-linecap": "round" }, svg));
      const o = desk(svg, 560, 270, 480, 140, "orchestrator", 44);
      o.r.setAttribute("fill", LIL);
      const desks = A.map(([name, x]) => {
        const d = desk(svg, x, 830, 360, 170, name, 40);
        const led = el("circle", { cx: x + 320, cy: 870, r: 16, fill: "#fff", stroke: INK, "stroke-width": SW }, d.g);
        return led;
      });
      const cards = A.map(() => {
        const g = el("g", {}, svg);
        el("rect", { x: -50, y: -34, width: 100, height: 68, rx: 12, fill: YEL, stroke: INK, "stroke-width": SW }, g);
        el("path", { d: "M-28 -8 H28 M-28 12 H12", stroke: INK, "stroke-width": SW, "stroke-linecap": "round" }, g);
        return g;
      });
      const b = el("g", {}, svg);
      ring(b, 1171, 81, 358, 114, 57);
      const br = el("rect", { x: 1180, y: 90, width: 340, height: 96, rx: 48, fill: "#fff", stroke: INK, "stroke-width": SW }, b);
      txt(b, 1350, 150, "New job", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      button(b, "Start a new job: the orchestrator sends a card to each agent", () => api.seek(0.3));
      txt(svg, 800, 1110, "Each agent runs on its own engine, which you install and sign in to", { "text-anchor": "middle", "font-size": 30, "font-weight": 500, fill: MUTE });
      return (t) => {
        const out = 1 - io(seg(t, 9.3, 9.9));
        br.setAttribute("fill", t < 1 ? YEL : "#fff");
        cards.forEach((g, i) => {
          const a = 1 + i * 1.4, k = io(seg(t, a, a + 1.6)), p = paths[i], [x, y] = qp(p.a, p.c, p.b, k);
          const vis = t > a - 0.2 && out > 0.01;
          tf(g, x, y - 20 * Math.sin(Math.PI * k), vis ? out : 0.001, 0);
          desks[i].setAttribute("fill", k >= 1 && out > 0.5 ? MINT : "#fff");
        });
      };
    },
  };

  /* ---- 3. a path splits at a signpost; two chips choose the branch ---- */
  SC.fork = {
    w: 1600, h: 1200, dur: 10, still: 3.4,
    build(svg, api) {
      txt(svg, 80, 124, "Which one should you pick?", { "font-size": 52, "font-weight": 700 });
      const S = [800, 1010], F = [800, 640], L = [330, 330], R = [1270, 330];
      const trunk = cable(svg, `M${S[0]} ${S[1]} L${F[0]} ${F[1]}`, SOFT); trunk.setAttribute("stroke-width", 22);
      const lb = cable(svg, qd(F, [330, 640], L), SOFT); lb.setAttribute("stroke-width", 22);
      const rb = cable(svg, qd(F, [1270, 640], R), SOFT); rb.setAttribute("stroke-width", 22);
      const tl = desk(svg, 130, 210, 400, 130, "Cline", 48), tr = desk(svg, 1070, 210, 400, 130, "Munder Difflin", 44);
      /* the signpost */
      el("path", { d: "M800 640 V340", stroke: INK, "stroke-width": SW + 4, "stroke-linecap": "round" }, svg);
      const board = (pts, label, tx, fill) => {
        el("path", { d: pts, fill, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" }, svg);
        return txt(svg, tx, 0, label, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      };
      board("M780 432 H440 L400 472 L440 512 H780 Z", "one agent, many places", 600, SKY).setAttribute("y", 482);
      board("M820 352 H1160 L1200 392 L1160 432 H820 Z", "many agents, one job", 1000, MINT).setAttribute("y", 402);
      const dot = el("g", {}, svg);
      el("circle", { r: 30, fill: YEL, stroke: INK, "stroke-width": SW }, dot);
      let sel = 0;
      const chips = [["One agent is enough", 230], ["I want a team", 1010]].map(([label, x], i) => {
        const g = el("g", {}, svg);
        ring(g, x - 9, 1061, 378, 104, 52);
        const r = el("rect", { x, y: 1070, width: 360, height: 86, rx: 43, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        txt(g, x + 180, 1124, label, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        button(g, `${label}: go to ${i ? "Munder Difflin" : "Cline"}`, () => { sel = i; api.seek(3.6); });
        return r;
      });
      return (t) => {
        const out = 1 - io(seg(t, 9.3, 9.9));
        trunk.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 0, 0.8)));
        lb.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 0.6, 1.4)));
        rb.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 0.6, 1.4)));
        const up = io(seg(t, 1, 3)), go = io(seg(t, 4, 6.4));
        let x = lerp(S[0], F[0], up), y = lerp(S[1], F[1], up);
        if (go > 0) [x, y] = sel ? qp(F, [1270, 640], [1270, 370], go) : qp(F, [330, 640], [330, 370], go);
        tf(dot, x, y, Math.max(out, 0.001));
        const arrived = go >= 1 && out > 0.5;
        tl.r.setAttribute("fill", arrived && sel === 0 ? SKY : "#fff");
        tr.r.setAttribute("fill", arrived && sel === 1 ? MINT : "#fff");
        chips.forEach((r, i) => { r.setAttribute("fill", i === sel && t > 3.6 ? YEL : "#fff"); r.parentNode.setAttribute("aria-pressed", i === sel); });
      };
    },
  };

  /* ---- title card: one engine with many front ends, beside one office with many agents ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 4,
    build(svg) {
      txt(svg, 800, 120, "Cline vs Munder Difflin", { "text-anchor": "middle", "font-size": 64, "font-weight": 700 });
      el("path", { d: "M800 200 V820", stroke: SOFT, "stroke-width": 8, "stroke-linecap": "round" }, svg);
      const left = el("g", {}, svg), right = el("g", {}, svg);
      /* left: one Cline block, four tiles */
      const LT = [["VS Code", 90, BLUE], ["Terminal", 260, SKY], ["Desktop", 430, MINT], ["SDK", 600, LIL]];
      const lc = LT.map(([, x]) => cable(left, qd([395, 420], [x + 70, 470], [x + 70, 600])));
      el("rect", { x: 255, y: 320, width: 280, height: 120, rx: 30, fill: YEL, stroke: INK, "stroke-width": SW }, left);
      txt(left, 395, 396, "Cline", { "text-anchor": "middle", "font-size": 50, "font-weight": 700 });
      const lt = LT.map(([name, x, col]) => {
        const g = el("g", {}, left);
        el("rect", { x, y: 600, width: 140, height: 96, rx: 20, fill: col, stroke: INK, "stroke-width": SW }, g);
        txt(g, x + 70, 658, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        return g;
      });
      txt(left, 395, 780, "one agent, many places", { "text-anchor": "middle", "font-size": 32, "font-weight": 500, fill: MUTE });
      /* right: one orchestrator, three agents */
      const RT = [["Claude Code", 870], ["Codex", 1080], ["Gemini CLI", 1290]];
      const rc = RT.map(([, x]) => cable(right, qd([1185, 420], [x + 90, 470], [x + 90, 600])));
      el("rect", { x: 1010, y: 320, width: 350, height: 120, rx: 30, fill: LIL, stroke: INK, "stroke-width": SW }, right);
      txt(right, 1185, 396, "Munder Difflin", { "text-anchor": "middle", "font-size": 44, "font-weight": 700 });
      const rt = RT.map(([name, x]) => {
        const g = el("g", {}, right);
        el("rect", { x, y: 600, width: 180, height: 96, rx: 20, fill: "#fff", stroke: INK, "stroke-width": SW }, g);
        txt(g, x + 90, 658, name, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        return g;
      });
      txt(right, 1185, 780, "many agents, one job", { "text-anchor": "middle", "font-size": 32, "font-weight": 500, fill: MUTE });
      return (t) => {
        const out = 1 - io(seg(t, 5.4, 5.9));
        [lc, rc].forEach((cs) => cs.forEach((c, i) => c.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 0.5 + i * 0.3, 1.4 + i * 0.3)) * out)));
        lt.concat(rt).forEach((g, i) => { const k = ob(seg(t, 1.2 + (i % 4) * 0.3, 1.8 + (i % 4) * 0.3)) * out; g.setAttribute("opacity", k > 0.02 ? 1 : 0); g.style.transformOrigin = "center"; g.style.transformBox = "fill-box"; g.style.transform = `scale(${Math.max(k, 0.001)})`; });
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
