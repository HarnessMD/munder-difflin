/* Bright coded scenes for "Orchestrator.inc vs Munder Difflin". Vanilla JS, no library.
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


  let uid = 0;
  const nid = () => `mgoi${++uid}`;
  const lerp = (a, b, k) => a + (b - a) * k;

  const SC = {};

  /* ---- 1. a mixing bowl pours batter into three muffin cups ---- */
  SC.muffins = {
    dur: 10.2, still: 9.0,
    build(svg, api) {
      const CX = [220, 400, 580], TOP = 420, BOT = 495, P = [[1.6, 2.6], [3.2, 4.2], [4.8, 5.8]];
      const NAMES = ["Worker one", "Worker two", "Worker three"];
      el("rect", { x: 70, y: 520, width: 660, height: 22, rx: 11, fill: SOFT }, svg);
      el("rect", { x: 105, y: 452, width: 590, height: 74, rx: 20, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      const cups = CX.map((cx, i) => {
        const shape = `M${cx - 65} ${TOP} L${cx - 50} ${BOT} H${cx + 50} L${cx + 65} ${TOP} Z`;
        const id = nid(), cp = el("clipPath", { id }, svg); el("path", { d: shape }, cp);
        el("path", { d: shape, fill: "#fff" }, svg);
        const bat = el("rect", { x: cx - 70, y: BOT, width: 140, height: 0, fill: YEL, "clip-path": `url(#${id})` }, svg);
        [-30, 0, 30].forEach((dx) => el("path", { d: `M${cx + dx} ${TOP + 10} L${cx + dx * 0.8} ${BOT - 8}`, stroke: MUTE, "stroke-width": 2, "stroke-linecap": "round" }, svg));
        el("path", { d: shape, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
        const dome = el("path", { d: `M${cx - 66} ${TOP + 1} A66 30 0 0 1 ${cx + 66} ${TOP + 1} Z`, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
        const px = cx - 55, flag = el("g", {}, svg);
        el("path", { d: `M${px} ${TOP - 2} V318`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, flag);
        el("rect", { x: px, y: 318, width: 140, height: 38, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, flag);
        txt(flag, px + 70, 344, NAMES[i], { "text-anchor": "middle", "font-size": 19 });
        const card = el("g", {}, svg);
        el("rect", { x: cx - 78, y: 248, width: 156, height: 44, rx: 12, fill: MINT, stroke: INK, "stroke-width": 2.5 }, card);
        txt(card, cx, 277, "Own worktree", { "text-anchor": "middle", "font-size": 20 });
        return { cx, px, bat, dome, flag, card };
      });
      const sOut = el("path", { stroke: INK, "stroke-width": 16, "stroke-linecap": "round", fill: "none" }, svg);
      const sIn = el("path", { stroke: YEL, "stroke-width": 10, "stroke-linecap": "round", fill: "none" }, svg);
      const bowl = el("g", {}, svg);
      el("ellipse", { cx: 0, cy: 28, rx: 112, ry: 64, fill: "#fff", "fill-opacity": 0 }, bowl);
      el("ellipse", { cx: 0, cy: 30, rx: 114, ry: 66, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, bowl);
      el("path", { d: "M-95 0 A95 78 0 0 0 95 0 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bowl);
      el("ellipse", { cx: 0, cy: 0, rx: 95, ry: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, bowl);
      const goo = el("ellipse", { cx: 0, cy: 1, rx: 78, ry: 9, fill: YEL }, bowl);
      txt(bowl, 0, 46, "Main agent", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      button(bowl, "Main agent bowl: tip it again and refill the cups", () => api.seek(0));
      const A = 62, R = [400, 130, 0], PO = CX.map((cx) => [cx - 95 * Math.cos((A * Math.PI) / 180), 140, A]);
      const KEYS = [[0, R], [0.8, R], [1.6, PO[0]], [2.6, PO[0]], [3.2, PO[1]], [4.2, PO[1]], [4.8, PO[2]], [5.8, PO[2]], [6.8, R]];
      const pose = (t) => {
        for (let i = 1; i < KEYS.length; i++) if (t < KEYS[i][0]) { const [t0, a] = KEYS[i - 1], [t1, b] = KEYS[i], k = io(seg(t, t0, t1)); return a.map((v, j) => lerp(v, b[j], k)); }
        return R;
      };
      return (t) => {
        const [bx, by, ba] = pose(t), r = (ba * Math.PI) / 180, lx = bx + 95 * Math.cos(r), ly = by + 95 * Math.sin(r);
        tf(bowl, bx, by, 1, ba);
        const fade = 1 - seg(t, 9.5, 10);
        let poured = 0, stream = "";
        cups.forEach((c, i) => {
          const [ps, pe] = P[i], f = io(seg(t, ps + 0.2, pe)), surf = BOT - 75 * f;
          c.bat.setAttribute("y", surf); c.bat.setAttribute("height", 75 * f + 2); c.bat.setAttribute("opacity", fade);
          const d = Math.max(0, ob(seg(t, pe - 0.3, pe + 0.15)));
          c.dome.setAttribute("transform", `translate(0 ${TOP}) scale(1 ${d}) translate(0 ${-TOP})`); c.dome.setAttribute("opacity", d > 0.01 ? fade : 0);
          const g = Math.max(0, ob(seg(t, pe + 0.05, pe + 0.45)));
          c.flag.setAttribute("transform", `translate(${c.px} ${TOP}) scale(${g}) translate(${-c.px} ${-TOP})`); c.flag.setAttribute("opacity", g > 0.01 ? fade : 0);
          const k = oc(seg(t, pe + 0.5, pe + 1.1));
          c.card.setAttribute("transform", `translate(0 ${30 * (1 - k)})`); c.card.setAttribute("opacity", k * fade);
          if (t > ps && t < pe) { const h = oc(seg(t, ps, ps + 0.3)), tl = seg(t, pe - 0.25, pe), end = TOP + 4; stream = `M${lx} ${lerp(ly, end, tl)} L${lx} ${lerp(ly, end, h)}`; }
          if (t >= pe) poured++;
        });
        sOut.setAttribute("d", stream || "M0 0"); sIn.setAttribute("d", stream || "M0 0");
        sOut.setAttribute("opacity", stream ? 1 : 0); sIn.setAttribute("opacity", stream ? 1 : 0);
        goo.setAttribute("rx", 78 - 16 * poured * fade); goo.setAttribute("ry", 9 - 1.5 * poured * fade);
      };
    },
  };

  /* ---- 2. a till prints a receipt, one line at a time ---- */
  SC.receipt = {
    dur: 9.6, still: 8.0,
    build(svg, api) {
      const SL = 392, LINES = ["Free, local, $0", "Starter, $20 a month", "Pro, $40 a month", "Cloud only"];
      el("rect", { x: 80, y: 528, width: 640, height: 24, rx: 12, fill: SOFT }, svg);
      const id = nid(), cp = el("clipPath", { id }, svg); el("rect", { x: 0, y: 0, width: 800, height: SL }, cp);
      const clip = el("g", { "clip-path": `url(#${id})` }, svg), paper = el("g", {}, clip);
      let zig = "M250 12"; for (let x = 265; x <= 550; x += 15) zig += ` L${x} ${(x - 250) % 30 ? 0 : 12}`;
      let zb = ""; for (let x = 535; x >= 250; x -= 15) zb += ` L${x} ${(x - 250) % 30 ? 432 : 420}`;
      el("path", { d: `${zig} L550 420${zb} Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, paper);
      el("rect", { x: 238, y: -6, width: 324, height: 420, rx: 14, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, paper);
      LINES.forEach((s, i) => {
        const y = 62 + i * 62;
        if (i === 3) el("rect", { x: 262, y: y - 27, width: 160, height: 38, rx: 10, fill: MINT, stroke: INK, "stroke-width": 2 }, paper);
        txt(paper, i === 3 ? 278 : 272, y, s, { "font-family": MONO, "font-size": 20, "font-weight": 700 });
        if (i < 3) el("path", { d: `M272 ${y + 24} H528`, stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, paper);
      });
      button(paper, "Receipt: tear it off and print a fresh one", () => api.seek(8.6));
      const till = el("g", {}, svg);
      el("rect", { x: 200, y: SL - 6, width: 400, height: 142, rx: 22, fill: BLUE, stroke: INK, "stroke-width": 3 }, till);
      el("rect", { x: 236, y: SL - 8, width: 328, height: 14, rx: 7, fill: INK }, till);
      const KC = ["#fff", YEL, "#fff", SKY, MINT, "#fff", LIL, "#fff", YEL, "#fff"];
      KC.forEach((c, i) => el("rect", { x: 238 + (i % 5) * 66, y: 422 + Math.floor(i / 5) * 46, width: 52, height: 32, rx: 9, fill: c, stroke: INK, "stroke-width": 2 }, till));
      return (t) => {
        let p = 0, busy = 0;
        for (let i = 0; i < 4; i++) { const k = seg(t, 0.8 + i * 1.4, 1.4 + i * 1.4); p += io(k); if (k > 0 && k < 1) busy = 1; }
        const q = io(seg(t, 8.6, 9.3)), top = SL - 34 - 62 * p;
        paper.setAttribute("transform", `translate(${-20 * q} ${top - 260 * q}) rotate(${-8 * q} 400 200)`);
        paper.setAttribute("opacity", 1 - q);
        tf(till, busy ? Math.sin(t * 70) * 1.5 : 0, 0);
      };
    },
  };

  /* ---- 3. a paper boomerang with a failed check flies out and comes back fixed ---- */
  SC.boomerang = {
    dur: 9.5, still: 8.0,
    build(svg, api) {
      const X = [200, 400, 600], Y = 312, COL = [SKY, YEL, MINT], AX = [-110, 360, 110], NAMES = ["Branch one", "Branch two", "Branch three"];
      el("path", { d: "M110 240 H690 L760 440 H40 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M40 440 H760 V460 Q760 472 748 472 H52 Q40 472 40 460 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const tags = NAMES.map((s, i) => {
        const g = el("g", {}, svg);
        const box = el("rect", { x: -78, y: -22, width: 156, height: 44, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const label = txt(g, 0, 7, s, { "text-anchor": "middle", "font-size": 20 });
        tf(g, X[i], 392);
        return { g, box, label };
      });
      const thr = [-99, -99, -99];
      const bs = X.map((x, i) => {
        const g = el("g", {}, svg);
        el("circle", { r: 86, fill: "#fff", "fill-opacity": 0 }, g);
        el("circle", { r: 88, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("path", { d: "M-74 22 Q0 -58 74 22", stroke: INK, "stroke-width": 34, "stroke-linecap": "round", fill: "none" }, g);
        el("path", { d: "M-74 22 Q0 -58 74 22", stroke: COL[i], "stroke-width": 27, "stroke-linecap": "round", fill: "none" }, g);
        el("path", { d: "M-66 19 Q0 -50 66 19", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "4 6", fill: "none" }, g);
        button(g, `${NAMES[i]} boomerang: throw it again`, () => { thr[i] = api.now(); api.poke(); });
        return g;
      });
      const slip = el("g", {}, svg);
      el("rect", { x: -62, y: -22, width: 124, height: 44, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, slip);
      txt(slip, 0, 7, "CI failed", { "text-anchor": "middle", "font-size": 20 });
      el("path", { d: "M-6 -32 V-12 Q-6 -6 0 -6 Q6 -6 6 -12 V-28", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, slip);
      const fly = (i, e) => [X[i] - AX[i] * Math.sin(2 * Math.PI * e) * (i === 1 ? Math.sin(Math.PI * e) : 1), Y - (i === 1 ? 250 : 180) * Math.sin(Math.PI * e), 1080 * e, 1 + 0.18 * Math.sin(Math.PI * e)];
      return (t, now) => {
        const ez = (u) => (1 - Math.cos(Math.PI * u)) / 2;
        let slipAt = null;
        bs.forEach((g, i) => {
          const m = (now - thr[i]) / 2.4;
          let pose = [X[i], Y, 0, 1];
          if (m >= 0 && m < 1) pose = fly(i, ez(m));
          else if (i === 1) {
            const u = seg(t, 1.9, 4.7), land = seg(t, 4.7, 5.0);
            if (u > 0 && u < 1) pose = fly(1, ez(u));
            else if (land > 0 && land < 1) pose = [X[1], Y - 10 * Math.sin(Math.PI * land), 0, 1];
            slipAt = [pose[0], pose[1], 1 - seg(ez(u), 0.2, 0.4)];
          }
          tf(g, pose[0], pose[1], pose[3], pose[2]);
        });
        const drop = ob(seg(t, 0.8, 1.5));
        const [sx, sy, so] = slipAt || [X[1], Y, 1];
        tf(slip, sx, sy - 64 - 360 * (1 - drop));
        slip.setAttribute("opacity", t < 0.8 ? 0 : so * (1 - seg(t, 9.0, 9.3)));
        const fw = seg(t, 5.0, 5.6), bk = seg(t, 9.0, 9.45), tg = tags[1];
        const fixed = bk > 0 ? bk < 0.5 : fw > 0.5, k = bk > 0 ? bk : fw;
        tg.g.setAttribute("transform", `translate(${X[1]} 392) scale(${Math.max(0.02, Math.abs(Math.cos(Math.PI * k)))} 1)`);
        tg.label.textContent = fixed ? "Fixed" : NAMES[1]; tg.box.setAttribute("fill", fixed ? MINT : "#fff");
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3600, still: 2,
    build(svg) {
      el("rect", { x: 64, y: 52, width: 128, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 128, 80, "Versus", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 64, 170, "Orchestrator.inc vs", { "font-size": 64, "font-weight": 700 });
      txt(svg, 64, 246, "Munder Difflin", { "font-size": 64, "font-weight": 700 });
      el("path", { d: "M66 272 H500", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 326, "An honest comparison", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 362, "Checked 6 Nov 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const tile = (x, s, c) => { const g = el("g", {}, svg); el("rect", { x, y: 400, width: 400, height: 96, rx: 20, fill: c, stroke: INK, "stroke-width": 2.5 }, g); txt(g, x + 200, 458, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 }); return g; };
      const a = tile(64, "Orchestrator.inc", SKY), b = tile(496, "Munder Difflin", LIL);
      return (t) => {
        tf(a, -560 * (1 - oc(seg(t, 0.2, 1.1))), 0);
        tf(b, 560 * (1 - oc(seg(t, 0.45, 1.35))), 0);
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
