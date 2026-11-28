/* Bright coded scenes for "Agent Relay alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const fit = (n, max) => { try { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * max) / w); } catch (e) { /* not laid out */ } return n; };
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

  const SC = {};

  /* ---- 1. a lilac switchboard: a blue patch cord joins two jacks on one channel ---- */
  SC.switchboard = {
    dur: 7, still: 7,
    build(svg, api) {
      const NAMES = ["Claude Code", "Codex", "Grok", "Pi"], X = [180, 327, 473, 620], LY = 232, JY = 360;
      const PAIRS = [[0, 1], [1, 2], [2, 3]];
      let pair = 0;
      el("rect", { x: 70, y: 92, width: 660, height: 400, rx: 30, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 250, y: 120, width: 300, height: 64, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      fit(txt(svg, 400, 163, "One channel", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 }), 270);
      const lamps = X.map((x) => ({ glow: el("circle", { cx: x, cy: LY, r: 18, fill: "none", stroke: MINT, "stroke-width": 5, opacity: 0 }, svg), bulb: el("circle", { cx: x, cy: LY, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg) }));
      X.forEach((x, i) => {
        el("rect", { x: x - 67, y: 266, width: 134, height: 38, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
        fit(txt(svg, x, 291, NAMES[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 }), 120);
        const g = el("g", {}, svg);
        el("circle", { cx: x, cy: JY, r: 44, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("circle", { cx: x, cy: JY, r: 30, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: x, cy: JY, r: 11, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        button(g, `${NAMES[i]} jack: move the cord to the next pair`, () => { pair = (pair + 1) % PAIRS.length; api.seek(0); });
      });
      const top = el("g", { "pointer-events": "none" }, svg);
      const cordO = el("path", { fill: "none", stroke: INK, "stroke-width": 13, "stroke-linecap": "round" }, top);
      const cordI = el("path", { fill: "none", stroke: BLUE, "stroke-width": 7, "stroke-linecap": "round" }, top);
      const plug = () => { const g = el("g", {}, top); el("circle", { r: 17, fill: BLUE, stroke: INK, "stroke-width": 3 }, g); el("circle", { r: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, g); return g; };
      const pa = plug(), pb = plug();
      return (t) => {
        const [a, b] = PAIRS[pair], ax = X[a], bx = X[b];
        const lift = oc(seg(t, 0.6, 1.0)), move = io(seg(t, 1.0, 2.6)), drop = oc(seg(t, 2.6, 3.0)), up = lift * (1 - drop);
        const px = ax + (bx - ax) * move, py = JY - 16 * up - 12 * Math.sin(Math.PI * move);
        tf(pa, ax, JY); tf(pb, px, py, 1 + 0.35 * up);
        const dx = Math.abs(px - ax), d = `M${ax} ${JY} Q${(ax + px) / 2} ${Math.max(JY, py) + dx * 0.85} ${px} ${py}`;
        cordO.setAttribute("d", d); cordI.setAttribute("d", d);
        const lit = t >= 3 && (t >= 6.6 || ((t - 3) / 0.8) % 1 < 0.62);
        lamps.forEach((l, i) => { const on = lit && (i === a || i === b); l.bulb.setAttribute("fill", on ? MINT : "#fff"); l.glow.setAttribute("opacity", on ? 1 : 0); });
      };
    },
  };

  /* ---- 2. three blue postboxes: a yellow envelope travels to the next inbox ---- */
  SC.postbox = {
    dur: 7.5, still: 7.5,
    build(svg, api) {
      const X = [200, 400, 600], NAMES = ["Frontend", "Backend", "Docs"], TOP = 282, SY = 322, SH = 472, FY = 358;
      const ROUTES = [[0, 1], [1, 2]];
      let r = 0;
      el("rect", { x: 300, y: 44, width: 200, height: 66, rx: 18, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 400, 89, "Inbox", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
      el("rect", { x: 64, y: SH, width: 672, height: 30, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      [150, 650].forEach((x) => el("path", { d: `M${x - 22} ${SH + 30} L${x} ${SH + 62} L${x + 22} ${SH + 30}`, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg));
      const route = el("path", { fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "2 12", "stroke-linecap": "round" }, svg);
      const flags = X.map((x, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: x - 90, y: TOP - 44, width: 180, height: SH - TOP + 52, rx: 30, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("rect", { x: x - 70, y: TOP + 8, width: 140, height: SH - TOP - 8, rx: 22, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${x - 80} ${TOP + 24} V${TOP + 14} Q${x - 80} ${TOP - 30} ${x} ${TOP - 30} Q${x + 80} ${TOP - 30} ${x + 80} ${TOP + 14} V${TOP + 24} Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("rect", { x: x - 48, y: SY - 8, width: 96, height: 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: x - 58, y: 376, width: 116, height: 42, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        fit(txt(g, x, 404, NAMES[i], { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), 104);
        const f = el("g", {}, g);
        el("path", { d: "M0 0 V-44", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, f);
        el("rect", { x: 0, y: -46, width: 26, height: 18, rx: 3, fill: MINT, stroke: INK, "stroke-width": 2.5 }, f);
        el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, f);
        button(g, `${NAMES[i]} postbox: send another envelope down the row`, () => { r = (r + 1) % ROUTES.length; api.seek(0); });
        return { f, x };
      });
      const cid = `mgclip${++uid}`;
      const clip = el("clipPath", { id: cid }, el("defs", {}, svg));
      el("rect", { x: 0, y: -200, width: 800, height: SY + 200 }, clip);
      const env = el("g", {}, el("g", { "clip-path": `url(#${cid})`, "pointer-events": "none" }, svg));
      el("rect", { x: -38, y: -25, width: 76, height: 50, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, env);
      el("path", { d: "M-33 -20 L0 5 L33 -20", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, env);
      return (t) => {
        const [a, b] = ROUTES[r], ax = X[a], bx = X[b], mx = (ax + bx) / 2, hy = SY - 70;
        route.setAttribute("d", `M${ax} ${SY - 12} V${hy} Q${mx} ${hy - 180} ${bx} ${hy} V${SY - 12}`);
        let x = ax, y = SY + 30 - 100 * io(seg(t, 0.4, 1.3)), rot = 0;
        if (t >= 1.4) { const u = io(seg(t, 1.4, 3.6)); x = (1 - u) ** 2 * ax + 2 * u * (1 - u) * mx + u * u * bx; y = hy - 360 * u * (1 - u); rot = 22 * (2 * u - 1) * Math.sin(Math.PI * u); }
        if (t >= 3.7) y = hy + 100 * seg(t, 3.7, 4.4) ** 2;
        tf(env, x, y, 1, rot);
        flags.forEach((fl, i) => { const k = i === b ? ob(seg(t, 4.4, 5.0)) : 0; fl.f.setAttribute("transform", `translate(${fl.x + 76} ${FY}) rotate(${90 * (1 - k)})`); });
      };
    },
  };

  /* ---- 3. a split flap departure board flips its rows one at a time ---- */
  SC.trainboard = {
    dur: 7, still: 7,
    build(svg, api) {
      const ROWS = [["People and agents", "Rowboat"], ["Team of agents", "Munder Difflin"], ["Inboxes", "Agent Mail"], ["All Claude", "agent teams"], ["Coordinator", "Orca"], ["Many tools", "Agent Relay"]];
      const CH = [YEL, BLUE, LIL, SKY, MINT, YEL];
      const board = el("g", {}, svg);
      el("rect", { x: 30, y: 28, width: 740, height: 544, rx: 34, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, board);
      el("rect", { x: 44, y: 42, width: 712, height: 516, rx: 26, fill: SOFT, stroke: INK, "stroke-width": 3 }, board);
      fit(txt(board, 400, 102, "Pick your tool", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 }), 600);
      const tiles = [];
      ROWS.forEach((row, i) => {
        const y = 130 + i * 68, cy = y + 28;
        [[72, 328, 118, 22], [416, 312, 436, 24]].forEach(([x, w, tx, fs], c) => {
          el("rect", { x, y, width: w, height: 56, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2 }, board);
          el("path", { d: `M${x} ${cy} h10 M${x + w - 10} ${cy} h10`, stroke: INK, "stroke-width": 2 }, board);
          tiles.push({ n: txt(board, tx, cy + fs * 0.36, "", { "font-family": MONO, "font-size": fs, "font-weight": 700 }), i, c, cy });
        });
        el("circle", { cx: 96, cy, r: 10, fill: CH[i], stroke: INK, "stroke-width": 2 }, board);
      });
      button(board, "Departure board: flip every row again", () => api.seek(0));
      const S = 0.15;
      return (t) => {
        tiles.forEach((tl) => {
          const st = 0.6 + tl.i * 0.62, k = Math.floor((t - st) / S), u = (t - st) / S - k;
          const word = (j) => (j < 0 ? "" : ROWS[j >= 3 ? tl.i : (tl.i + j + 1) % ROWS.length][tl.c]);
          let s = 1, show;
          if (t < st) show = "";
          else if (k >= 4) show = ROWS[tl.i][tl.c];
          else { show = word(u < 0.5 ? k - 1 : k); s = Math.max(0.04, Math.abs(Math.cos(Math.PI * u))); }
          if (tl.n.textContent !== show) tl.n.textContent = show;
          tl.n.setAttribute("transform", `translate(0 ${tl.cy * (1 - s)}) scale(1 ${s})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3, still: 3,
    build(svg) {
      el("rect", { x: 56, y: 44, width: 184, height: 46, rx: 23, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      fit(txt(svg, 148, 74.5, "Alternatives", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), 160);
      txt(svg, 904, 74, "Checked 14 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      fit(txt(svg, 56, 178, "Agent Relay alternatives", { "font-size": 60, "font-weight": 700 }), 848);
      el("path", { d: "M60 204 H300", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      fit(txt(svg, 56, 250, "5 tools like Agent Relay for agents that talk to each other", { "font-size": 24, "font-weight": 500, fill: MUTE }), 848);
      const NAMES = ["Rowboat", "Munder Difflin", "Agent Mail", "Claude Code agent teams", "Orca"], COL = [YEL, BLUE, LIL, SKY, MINT];
      const W = NAMES.map((s) => s.length * 9.6 + 32), GAP = 18, total = W.reduce((p, q) => p + q, 0) + GAP * 4;
      let x = 480 - total / 2;
      const kids = NAMES.map((s, i) => {
        const cx = x + W[i] / 2, line = el("path", { d: `M480 338 C480 386 ${cx} 386 ${cx} 432`, fill: "none", stroke: INK, "stroke-width": 2 }, svg);
        const g = el("g", {}, svg);
        el("rect", { x, y: 432, width: W[i], height: 44, rx: 12, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, cx, 460, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        x += W[i] + GAP;
        return { g, line };
      });
      el("rect", { x: 370, y: 290, width: 220, height: 48, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 480, 321, "Agent Relay", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      return (t) => kids.forEach((k, i) => { const p = seg(t, 0.3 + i * 0.25, 0.9 + i * 0.25); tf(k.g, 0, 36 * (1 - ob(p))); k.g.setAttribute("opacity", cl(p * 2)); k.line.setAttribute("opacity", cl(p * 1.6)); });
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
