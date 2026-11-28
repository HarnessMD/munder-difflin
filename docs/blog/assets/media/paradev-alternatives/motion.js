/* Bright coded scenes for "Paradev alternatives". Vanilla JS, no library.
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

  /* ---- 1. a label maker prints Superset, then Paradev covers it; the side tag keeps the CLI name ---- */
  SC.labelmaker = {
    dur: 8, still: 8,
    build(svg, api) {
      const SLOT = 300, PY = 392, REST = [520, 240];
      const box = el("g", {}, svg);
      el("rect", { x: 380, y: 92, width: 330, height: 322, rx: 22, fill: "#fff", "fill-opacity": 0 }, box);
      el("path", { d: "M400 150 L450 110 H690 L640 150 Z", fill: "#fff", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, box);
      el("path", { d: "M640 150 L690 110 V290 L640 330 Z", fill: BLUE, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, box);
      el("rect", { x: 400, y: 150, width: 240, height: 180, rx: 6, fill: YEL, stroke: INK, "stroke-width": 4 }, box);
      el("circle", { cx: 672, cy: 300, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, box);
      const tag = el("g", {}, box);
      el("path", { d: "M672 300 V362", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("rect", { x: 560, y: 362, width: 224, height: 44, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, tag);
      txt(tag, 672, 390, "CLI command superset", { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
      el("rect", { x: 380, y: 92, width: 330, height: 322, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, box);
      const mk = (w, h, label, fill, fs) => {
        const g = el("g", { opacity: 0 }, box);
        el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 8, fill, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, fs * 0.36, label, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 });
        return { g, w, label };
      };
      const s1 = mk(190, 56, "Superset", "#fff", 30), s2 = mk(206, 66, "Paradev", MINT, 36);
      const dev = el("g", {}, svg);
      el("rect", { x: 40, y: 330, width: 262, height: 200, rx: 34, fill: LIL, stroke: INK, "stroke-width": 4 }, dev);
      el("rect", { x: 288, y: 354, width: 20, height: 76, rx: 6, fill: INK }, dev);
      el("rect", { x: 66, y: 352, width: 170, height: 50, rx: 10, fill: SKY, stroke: INK, "stroke-width": 3 }, dev);
      const scr = txt(dev, 80, 385, "", { "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const keys = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) keys.push(el("rect", { x: 66 + c * 36, y: 420 + r * 30, width: 26, height: 20, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, dev));
      const T = [[s1, 0.1, 0.7, 1.8], [s2, 3.0, 3.6, 4.7]];
      let peel = -99;
      button(box, "Peel the Paradev strip off and print it again", () => { if (peel < 0) { peel = api.now(); api.poke(); } });
      return (t, now) => {
        const ps = now - peel, peeling = ps >= 0 && ps < 0.9;
        if (!peeling && peel > 0) { peel = -99; api.seek(2.9); return; }
        const te = peeling ? 6 : t;
        let typing = -1;
        T.forEach(([s, ty, tp, tl], i) => {
          const p = oc(seg(te, tp, tp + 0.9)), f = io(seg(te, tl, tl + 0.9));
          let x = SLOT - s.w / 2 + s.w * p, y = PY, r = 0, op = te >= tp ? 1 : 0;
          if (f > 0) { const sx = SLOT + s.w / 2; x = sx + (REST[0] - sx) * f; y = PY + (REST[1] - PY) * f - 70 * Math.sin(f * Math.PI); r = -8 * Math.sin(f * Math.PI); }
          if (i === 1 && peeling) { const k = io(ps / 0.9); x = REST[0] + 150 * k; y = REST[1] - 170 * k; r = 32 * k; op = 1 - k; }
          tf(s.g, x, y, 1, r); s.g.setAttribute("opacity", op);
          if (te >= ty) typing = i;
          if (te >= ty && te < tp) keys.forEach((n, j) => n.setAttribute("fill", j === Math.floor(te * 9) % 18 ? YEL : "#fff"));
        });
        if (!T.some(([, ty, tp]) => te >= ty && te < tp)) keys.forEach((n) => n.setAttribute("fill", "#fff"));
        const cur = typing < 0 ? null : T[typing];
        scr.textContent = cur ? cur[0].label.slice(0, Math.ceil(cur[0].label.length * seg(te, cur[1], cur[1] + 0.5))) : "";
        const pr = T.some(([, , tp]) => te > tp && te < tp + 0.9);
        dev.setAttribute("transform", `translate(0 ${pr ? Math.sin(now * 60) * 1.5 : 0})`);
        tag.setAttribute("transform", `rotate(${Math.sin(now * 1.6) * 2} 672 300)`);
      };
    },
  };

  /* ---- 2. four measuring spoons pour sand into one bowl ---- */
  SC.spoons = {
    dur: 10.5, still: 10.5,
    build(svg, api) {
      const LAB = ["Free $0", "Pro $20", "Team $60", "Ultra $200"], COL = [SKY, MINT, LIL, BLUE];
      const X = [160, 320, 480, 640], PY = 110, RR = [20, 27, 34, 42], LL = [140, 156, 172, 188], ST = [0.6, 2.8, 5.0, 7.2], RIM = 452;
      el("rect", { x: 80, y: 92, width: 640, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("ellipse", { cx: 400, cy: RIM, rx: 300, ry: 26, fill: "#fff", stroke: INK, "stroke-width": 4 }, svg);
      const sand = el("ellipse", { cx: 400, cy: RIM, rx: 0, ry: 0, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      const grains = Array.from({ length: 24 }, (_, i) => el("circle", { r: 4 + (i % 3), fill: YEL, stroke: INK, "stroke-width": 1.5, opacity: 0 }, svg));
      el("path", { d: `M100 ${RIM} Q106 580 270 582 H530 Q694 580 700 ${RIM} Z`, fill: SKY, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, svg);
      txt(svg, 400, 532, "Per user a month", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      const tipAt = [-99, -99, -99, -99];
      const sp = X.map((x, i) => {
        const g = el("g", {}, svg), R = RR[i], L = LL[i];
        el("rect", { x: -74, y: -14, width: 148, height: L + R + 30, rx: 22, fill: "#fff", "fill-opacity": 0 }, g);
        el("rect", { x: -74, y: -14, width: 148, height: L + R + 30, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, g);
        el("rect", { x: -6, y: 0, width: 12, height: L, rx: 6, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        const mound = el("ellipse", { cx: 0, cy: L, rx: R * 0.85, ry: R * 0.45, fill: YEL, stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: `M${-R} ${L} A${R} ${R} 0 0 0 ${R} ${L} Z`, fill: COL[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -68, y: 34, width: 136, height: 36, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 59, LAB[i], { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        button(g, `Tip the ${LAB[i]} spoon`, () => { tipAt[i] = api.now(); api.poke(); });
        return { g, mound, R, L, x };
      });
      return (t, now) => {
        let level = 0;
        sp.forEach((s, i) => {
          const user = now - tipAt[i], mine = user >= 0 && user < 1.8, u = mine ? user : t - ST[i];
          const on = u >= 0 && u < 1.8, a = on ? io(seg(u, 0, 0.45)) * (1 - io(seg(u, 1.3, 1.8))) : 0, p = on ? seg(u, 0.45, 1.3) : 0;
          level += seg(t, ST[i] + 0.45, ST[i] + 1.3) / 4;
          const th = (i < 2 ? -20 : 20) * a;
          tf(s.g, s.x, PY, 1, th);
          const done = !mine && t > ST[i] + 1.3, m = on ? 1 - 0.85 * p : done ? 0.15 : 1;
          s.mound.setAttribute("transform", `translate(0 ${s.L * (1 - m)}) scale(1 ${m})`);
          const rad = th * Math.PI / 180, ends = [-s.R, s.R].map((rx) => [s.x + rx * Math.cos(rad) - s.L * Math.sin(rad), PY + rx * Math.sin(rad) + s.L * Math.cos(rad)]);
          const lip = ends[0][1] > ends[1][1] ? ends[0] : ends[1];
          for (let j = 0; j < 6; j++) {
            const n = grains[i * 6 + j];
            if (p > 0 && p < 1 && a > 0.6) { const ph = ((u - 0.45) * 1.7 + j / 6) % 1; n.setAttribute("cx", lip[0] + ((j % 3) - 1) * 4); n.setAttribute("cy", lip[1] + (RIM - 6 - lip[1]) * ph * ph); n.setAttribute("opacity", 1); }
            else n.setAttribute("opacity", 0);
          }
        });
        sand.setAttribute("rx", level > 0 ? 50 + 210 * level : 0); sand.setAttribute("ry", level > 0 ? 5 + 19 * level : 0);
        sand.setAttribute("cy", RIM - 4 * level);
      };
    },
  };

  /* ---- 3. two spools unwind into two separate grooves ---- */
  SC.spools = {
    dur: 9, still: 9,
    build(svg, api) {
      el("rect", { x: 180, y: 34, width: 440, height: 64, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 75, "Claude Code worktree flag", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      el("rect", { x: 24, y: 134, width: 752, height: 440, rx: 28, fill: YEL, stroke: INK, "stroke-width": 4 }, svg);
      const CY = [262, 452], CX = 120, NAMES = ["Session one", "Session two"], ST = [[0.6, 4.2], [1.4, 5.0]];
      const rw = [null, null], last = [0, 0];
      const sp = CY.map((cy, i) => {
        el("rect", { x: 196, y: cy - 18, width: 560, height: 36, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        el("rect", { x: 210, y: cy - 68, width: 168, height: 38, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        el("circle", { cx: 226, cy: cy - 49, r: 5, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
        txt(svg, 304, cy - 42, NAMES[i], { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        const under = el("path", { stroke: INK, "stroke-width": 12, fill: "none", "stroke-linecap": "round" }, svg);
        const thread = el("path", { stroke: BLUE, "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, svg);
        const g = el("g", {}, svg);
        el("circle", { cx: CX, cy, r: 74, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, g);
        el("circle", { cx: CX, cy, r: 62, fill: "#fff", stroke: INK, "stroke-width": 3.5 }, g);
        const ring = el("circle", { cx: CX, cy, r: 52, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g);
        const marks = [0, 1, 2].map(() => el("path", { stroke: SKY, "stroke-width": 4, "stroke-linecap": "round" }, g));
        el("circle", { cx: CX, cy, r: 22, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: CX, cy, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        button(g, `Wind the ${NAMES[i]} thread back and unwind it again`, () => { rw[i] = { at: api.now(), k0: last[i] }; api.poke(); });
        return { cy, under, thread, ring, marks };
      });
      return (t, now) => {
        sp.forEach((s, i) => {
          let k = io(seg(t, ST[i][0], ST[i][1]));
          if (rw[i]) { const d = now - rw[i].at; if (d < 1) k = rw[i].k0 * (1 - io(d)); else if (d < 4.6) k = io(seg(d, 1.2, 4.6)); else rw[i] = null; }
          last[i] = k;
          const rr = 52 - 14 * k, end = 210 + 520 * k, d = `M${CX + rr - 2} ${s.cy} H${end}`;
          s.ring.setAttribute("r", rr); s.under.setAttribute("d", d); s.thread.setAttribute("d", d);
          s.marks.forEach((m, j) => { const a = (k * 900 + j * 120) * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a); m.setAttribute("d", `M${CX + c * 27} ${s.cy + sn * 27} L${CX + c * (rr - 6)} ${s.cy + sn * (rr - 6)}`); });
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 12, still: 12,
    build(svg) {
      el("rect", { x: 64, y: 44, width: 152, height: 38, rx: 19, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 140, 70, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 64, 160, "Paradev alternatives", { "font-size": 64, "font-weight": 700 });
      el("path", { d: "M66 184 H560", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 232, "6 tools for running coding agents in parallel", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 268, "Checked 7 Nov 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const tile = (x, y, label, fill) => { const g = el("g", { opacity: 0 }, svg); el("rect", { x, y, width: 250, height: 50, rx: 14, fill, stroke: INK, "stroke-width": 2.5 }, g); txt(g, x + 125, y + 32, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 }); return g; };
      const top = tile(330, 298, "Paradev", "#D9D0E4");
      const names = ["Orca", "Munder Difflin", "Orchestrator.inc", "Emdash Classic", "T3 Code", "Claude Code"], cols = [SKY, YEL, LIL, MINT, BLUE, SOFT];
      const tiles = names.map((n, i) => tile(64 + (i % 3) * 266, 374 + Math.floor(i / 3) * 62, n, cols[i]));
      return (t) => {
        top.setAttribute("opacity", oc(seg(t, 0.2, 0.6)));
        tiles.forEach((g, i) => { const a = 0.8 + i * 0.28, k = ob(seg(t, a, a + 0.5)); g.setAttribute("opacity", seg(t, a, a + 0.2)); g.setAttribute("transform", `translate(0 ${36 * (1 - k)})`); });
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
