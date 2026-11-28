/* Bright coded scenes for "Codex vs ChatGPT". Vanilla JS, no library.
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
  /* each loop opens on the final frame and eases back to the start in R0 seconds, so the loop has no jump */
  const R0 = 0.6;
  const pv = (t, a, b, e = oc) => (t < R0 ? 1 - io(t / R0) : e(seg(t, a, b)));
  const hint = (svg, s) => txt(svg, 756, 52, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  const hitbox = (g, a) => el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a), g);
  const ring = (g, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, a), g);
  /* a tap toggles one thing between 0 and 1; under reduced motion it jumps */
  const flipper = (api, D = 0.6) => {
    let m = null, last = 0;
    return {
      v(auto, now) { last = m ? m.f + (m.to - m.f) * io(seg(now, m.at, m.at + (calm ? 1e-3 : D))) : auto; return last; },
      flip() { m = { f: last, to: last > 0.5 ? 0 : 1, at: api.now() }; api.nudge(); },
    };
  };
  let uid = 0;

  const SC = {};
  const CAP = "#6B5878";
  /* shrink a line of text until it fits a width */
  const fit = (n, w) => { const l = n.getComputedTextLength(); if (l > w) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * w) / l); return n; };

  /* a toolbox tray, 290 by 70, drawn from its top left; what it holds sits in `held`, clipped at the tray floor */
  const tray = (p, col, label, kind, card = true) => {
    const g = el("g", {}, p), id = `mgclip${++uid}`;
    el("rect", { x: -80, y: -240, width: 450, height: 310 }, el("clipPath", { id }, el("defs", {}, g)));
    el("rect", { x: 8, y: -10, width: 274, height: 18, rx: 7, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
    const held = el("g", {}, el("g", { "clip-path": `url(#${id})` }, g));
    if (kind === "chat") {
      const pad = el("g", { transform: "translate(46 -80) rotate(-6)" }, held);
      el("rect", { x: 0, y: 0, width: 86, height: 104, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, pad);
      [0, 1, 2, 3].forEach((i) => el("rect", { x: 14, y: 26 + i * 15, width: [58, 50, 60, 40][i], height: 5, rx: 2.5, fill: SKY }, pad));
      [14, 30, 46, 62, 78].forEach((x) => el("circle", { cx: x, cy: 2, r: 4.5, fill: SOFT, stroke: INK, "stroke-width": 2 }, pad));
      const pen = el("g", { transform: "translate(196 -92) rotate(18)" }, held);
      el("rect", { x: -9, y: -16, width: 18, height: 18, rx: 4, fill: LIL, stroke: INK, "stroke-width": 3 }, pen);
      el("rect", { x: -9, y: 0, width: 18, height: 100, fill: YEL, stroke: INK, "stroke-width": 3 }, pen);
      el("path", { d: "M-9 100 L0 124 L9 100 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pen);
      el("path", { d: "M-3.5 115 L0 124 L3.5 115 Z", fill: INK }, pen);
    } else {
      const w = el("g", { transform: card ? "translate(72 -50) rotate(-30)" : "translate(140 -50) rotate(-60)" }, held);
      el("rect", { x: -9, y: 0, width: 18, height: 112, rx: 9, fill: LIL, stroke: INK, "stroke-width": 3 }, w);
      el("circle", { cx: 0, cy: -10, r: 24, fill: LIL, stroke: INK, "stroke-width": 3 }, w);
      el("rect", { x: -8, y: -38, width: 16, height: 26, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, w);
      el("rect", { x: -12, y: -40, width: 24, height: 6, fill: "#fff" }, w);
      if (card) {
        const c = el("g", { transform: "translate(148 -62)" }, held);
        el("rect", { x: 0, y: 0, width: 120, height: 80, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
        txt(c, 60, 32, "terminal", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      }
    }
    el("rect", { x: 0, y: 0, width: 290, height: 70, rx: 12, fill: col, stroke: INK, "stroke-width": 3 }, g);
    txt(g, 145, 45, label, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
    return { g, held };
  };

  /* ---- 1. a cantilever toolbox: the ChatGPT tray slides out, the Codex tray rises ---- */
  SC.toolbox = {
    dur: 6.2, still: 6.2,
    build(svg, api) {
      hint(svg, "tap the toolbox");
      el("path", { d: "M60 534 H740", stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      const box = el("g", {}, svg);
      hitbox(box, { x: 80, y: 60, width: 600, height: 470 });
      ring(box, { x: 76, y: 56, width: 608, height: 478, rx: 20 });
      const arm = () => [el("path", { stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, box), el("path", { stroke: BLUE, "stroke-width": 3, "stroke-linecap": "round" }, box)];
      const setArm = (a, x1, y1, x2, y2) => a.forEach((n) => n.setAttribute("d", `M${x1} ${y1} L${x2} ${y2}`));
      const cA = [arm(), arm()], gA = [arm(), arm()], codex = tray(box, YEL, "Codex", "codex");
      el("rect", { x: 250, y: 400, width: 310, height: 124, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, box);
      [292, 486].forEach((x) => el("rect", { x, y: 404, width: 32, height: 22, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, box));
      const chat = tray(box, SKY, "ChatGPT", "chat");
      const f = flipper(api, 1.4);
      button(box, "Toolbox: open or close the trays", () => f.flip());
      return (t, now) => {
        const o = f.v(pv(t, 1.0, 3.0, (x) => x), now);
        const k1 = io(cl(o / 0.6)), k2 = io(cl((o - 0.4) / 0.6));
        const x1 = 260 - 160 * k1, y1 = 330 - 150 * k1 - 40 * Math.sin(Math.PI * k1);
        const x2 = 260 + 100 * k2, y2 = 412 - 102 * k2 - 20 * Math.sin(Math.PI * k2);
        tf(chat.g, x1, y1); tf(codex.g, x2, y2);
        tf(chat.held, 0, 112 * (1 - ob(cl((k1 - 0.45) / 0.55))));
        tf(codex.held, 0, 112 * (1 - ob(cl((k2 - 0.45) / 0.55))));
        setArm(gA[0], 280, 420, x1 + 30, y1 + 60); setArm(gA[1], 400, 420, x1 + 150, y1 + 60);
        setArm(cA[0], 430, 470, x2 + 70, y2 + 60); setArm(cA[1], 540, 470, x2 + 180, y2 + 60);
      };
    },
  };

  /* ---- 2. a ladder of plans; the CLI card climbs and settles on Plus ---- */
  SC.ladder = {
    dur: 6.4, still: 6.4,
    build(svg, api) {
      hint(svg, "tap the ladder");
      el("rect", { x: 568, y: -10, width: 250, height: 570, fill: SOFT }, svg);
      el("path", { d: "M568 0 V560", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M30 560 H800", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const LX = (y) => 430 - 0.44 * (y - 70), RW = 130, YS = [480, 380, 280, 180];
      const lad = el("g", {}, svg);
      hitbox(lad, { x: 60, y: 56, width: 512, height: 508 });
      ring(lad, { x: 56, y: 52, width: 520, height: 516, rx: 20 });
      YS.forEach((y) => { const d = `M${LX(y)} ${y} H${LX(y) + RW}`; el("path", { d, stroke: INK, "stroke-width": 14 }, lad); el("path", { d, stroke: YEL, "stroke-width": 8 }, lad); });
      [0, RW].forEach((dx) => { const d = `M${LX(560) + dx} 560 L${LX(70) + dx} 70`; el("path", { d, stroke: INK, "stroke-width": 18, "stroke-linecap": "round" }, lad); el("path", { d, stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, lad); });
      const chips = ["Free $0", "Go $8", "Plus $20", "Pro from $100"].map((s, i) => {
        const y = YS[i], r = el("rect", { y: y - 19, height: 38, rx: 19, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, lad);
        const n = txt(lad, 0, y + 7, s, { "text-anchor": "middle", "font-size": 19 }), w = n.getComputedTextLength() + 34, right = LX(y) - 22;
        r.setAttribute("x", right - w); r.setAttribute("width", w); n.setAttribute("x", right - w / 2);
        return r;
      });
      button(lad, "Ladder: replay the climb", () => api.seek(R0));
      const card = el("g", {}, svg);
      el("rect", { x: -38, y: -46, width: 76, height: 46, rx: 9, fill: MINT, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 0, -15, "CLI", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const spot = [[LX(560) + RW / 2, 558], ...YS.slice(0, 3).map((y) => [LX(y) + RW / 2 + 12, y - 7])], HOPS = [1.0, 2.0, 3.0], H = 0.62;
      return (t) => {
        let x, y, s = 1, r = 0, op = 1;
        if (t < R0) { const top = t < 0.3; [x, y] = spot[top ? 3 : 0]; op = top ? 1 - seg(t, 0, 0.3) : seg(t, 0.3, 0.6); }
        else {
          let j = 0; HOPS.forEach((h) => { if (t >= h + H) j++; });
          [x, y] = spot[j];
          const h = HOPS[j];
          if (j < 3 && t >= h) {
            const u = seg(t, h, h + H), [ax, ay] = spot[j], [bx, by] = spot[j + 1], e = io(u);
            x = ax + (bx - ax) * e; y = ay + (by - ay) * e - 60 * Math.sin(Math.PI * u); r = 10 * Math.sin(2 * Math.PI * u);
          } else if (j > 0) { const v = t - (HOPS[j - 1] + H); s = 1 + 0.12 * Math.exp(-6 * v) * Math.sin(14 * v); }
        }
        card.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${2 - s} ${s})`);
        card.setAttribute("opacity", op);
        const on = t < 0.3 || t >= HOPS[2] + H;
        chips.forEach((c, i) => c.setAttribute("fill", i === 2 && on ? YEL : "#fff"));
      };
    },
  };

  /* ---- 3. a tram map: Codex runs four stops, ChatGPT three, both share Desktop app ---- */
  SC.tram = {
    dur: 8, still: 8,
    build(svg, api) {
      hint(svg, "tap a tram line");
      const along = (P, d) => { for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], L = Math.hypot(bx - ax, by - ay); if (d <= L || i === P.length - 1) { const u = cl(d / L); return [ax + (bx - ax) * u, ay + (by - ay) * u]; } d -= L; } };
      const cum = (P) => P.map((p, i) => P.slice(1, i + 1).reduce((s, q, j) => s + Math.hypot(q[0] - P[j][0], q[1] - P[j][1]), 0));
      const LINES = [
        { name: "Codex", col: YEL, P: [[100, 170], [280, 170], [430, 320], [690, 320]], stops: [0, 1, 2, 3], dr: [0.6, 1.8], show: 2.2, moves: [[2.8, 3.4, 0, 1], [3.8, 4.6, 1, 2], [5.0, 5.8, 2, 3]] },
        { name: "ChatGPT", col: SKY, P: [[180, 470], [280, 470], [430, 320], [580, 170]], stops: [0, 2, 3], dr: [1.1, 2.2], show: 2.3, moves: [[2.6, 3.2, 0, 2], [3.5, 4.1, 2, 3]] },
      ];
      let sel = -1;
      LINES.forEach((l, i) => {
        l.C = cum(l.P); l.L = l.C[l.C.length - 1];
        const d = "M" + l.P.map((p) => p.join(" ")).join(" L"), g = el("g", {}, svg), lj = { fill: "none", "stroke-linejoin": "round", "stroke-linecap": "round", d };
        el("path", Object.assign({ stroke: "#fff", "stroke-opacity": 0, "stroke-width": 44 }, lj), g);
        el("path", Object.assign({ stroke: INK, "stroke-width": 42, class: "mg-ring" }, lj), g);
        el("path", Object.assign({ stroke: "#fff", "stroke-width": 37, class: "mg-ring" }, lj), g);
        l.halo = el("path", Object.assign({ stroke: LIL, "stroke-width": 32 }, lj), g);
        l.ink = el("path", Object.assign({ stroke: INK, "stroke-width": 18, "stroke-dasharray": `${l.L + 2} ${l.L + 2}` }, lj), g);
        l.fill = el("path", Object.assign({ stroke: l.col, "stroke-width": 11, "stroke-dasharray": `${l.L + 2} ${l.L + 2}` }, lj), g);
        button(g, `${l.name} line`, () => { sel = sel === i ? -1 : i; api.nudge(); });
      });
      /* stops and their names, above both lines */
      const NAMES = [["Terminal", 100, 126, "middle"], ["Editor", 280, 126, "middle"], ["Desktop app", 452, 374, "start"], ["Cloud", 690, 364, "middle"], ["Web", 180, 514, "middle"], ["Mobile", 580, 126, "middle"]];
      const STOPS = [[0, 0, 0], [0, 1, 1], [-1, 2, 2], [0, 3, 3], [1, 0, 4], [1, 3, 5]].map(([li, v, ni]) => {
        const [x, y] = li < 0 ? [430, 320] : LINES[li].P[v], g = el("g", {}, svg);
        el("circle", { cx: 0, cy: 0, r: li < 0 ? 16 : 10, fill: "#fff", stroke: INK, "stroke-width": li < 0 ? 4 : 3 }, g);
        const [s, lx, ly, an] = NAMES[ni], n = txt(svg, lx, ly, s, { "text-anchor": an, "font-size": 20 });
        const at = li < 0 ? Math.min(...LINES.map((l) => l.dr[0] + (l.C[2] / l.L) * (l.dr[1] - l.dr[0]))) : LINES[li].dr[0] + (LINES[li].C[v] / LINES[li].L) * (LINES[li].dr[1] - LINES[li].dr[0]);
        return { g, n, x, y, at };
      });
      const trams = LINES.map((l) => {
        const g = el("g", {}, svg);
        el("path", { d: "M-14 -20 L0 -32 L14 -20", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }, g);
        el("rect", { x: -54, y: -20, width: 108, height: 40, rx: 12, fill: l.col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 6, l.name, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return g;
      });
      return (t) => {
        LINES.forEach((l, i) => {
          const k = t < R0 ? 1 - io(t / R0) : io(seg(t, l.dr[0], l.dr[1]));
          [l.ink, l.fill].forEach((n) => n.setAttribute("stroke-dashoffset", (l.L + 2) * (1 - k)));
          l.halo.setAttribute("display", sel === i ? "inline" : "none");
          let d = l.C[l.moves[l.moves.length - 1][3]];
          if (t >= R0) { d = 0; l.moves.forEach(([a, b, p, q]) => { if (t >= a) d = l.C[p] + (l.C[q] - l.C[p]) * io(seg(t, a, b)); }); }
          const [x, y] = along(l.P, d), pop = t < R0 ? 1 : ob(seg(t, l.show, l.show + 0.4));
          trams[i].setAttribute("transform", `translate(${x} ${y}) scale(${Math.max(0.001, pop)})`);
          trams[i].setAttribute("opacity", t < R0 ? 1 - seg(t, 0, 0.3) : t >= l.show ? 1 : 0);
        });
        STOPS.forEach((s) => {
          const k = t < R0 ? 1 - seg(t, 0, R0) : ob(seg(t, s.at, s.at + 0.35));
          s.g.setAttribute("transform", `translate(${s.x} ${s.y}) scale(${Math.max(0.001, k)})`);
          s.n.setAttribute("opacity", cl(k));
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      const pr = el("rect", { x: 64, y: 64, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      const pt = txt(svg, 84, 91, "Comparisons", { "font-size": 18, "font-weight": 700 });
      pr.setAttribute("width", pt.getComputedTextLength() + 40);
      fit(txt(svg, 64, 200, "Codex vs", { "font-size": 76, "font-weight": 700 }), 440);
      fit(txt(svg, 64, 284, "ChatGPT", { "font-size": 76, "font-weight": 700 }), 440);
      el("path", { d: "M66 310 H380", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 366, "Coding agent or assistant?", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 470, "Checked 28 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      const top = tray(svg, SKY, "ChatGPT", "chat"), bot = tray(svg, YEL, "Codex", "codex", false);
      tf(top.g, 548, 186); tf(bot.g, 572, 372);
      el("circle", { cx: 904, cy: 320, r: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 904, 328, "vs", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
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
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, nudge: () => { if (held) frame(); else tick(); } };
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
