/* Bright coded scenes for "T3 Code alternatives". Vanilla JS, no library.
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
  let uid = 0;

  const SC = {};

  /* ---- 1. a TV remote lying flat; its buttons light up in turn ---- */
  SC.remote = {
    dur: 10, still: 8,
    build(svg, api) {
      const NAMES = ["Claude Code", "Codex", "Cursor", "Grok Build", "OpenCode", "Antigravity", "fx"];
      const LIT = [YEL, MINT, LIL, YEL, MINT, LIL, YEL];
      const R = el("g", { transform: "rotate(-4 400 305)" }, svg);
      el("rect", { x: 64, y: 174, width: 670, height: 280, rx: 70, fill: BLUE }, R);
      el("rect", { x: 50, y: 160, width: 670, height: 280, rx: 70, fill: SKY, stroke: INK, "stroke-width": 4 }, R);
      el("rect", { x: 700, y: 252, width: 22, height: 96, rx: 9, fill: INK }, R);
      const waves = [22, 38, 54].map((r) => el("path", { d: `M${728 + r * 0.64} ${300 - r * 0.77} A${r} ${r} 0 0 1 ${728 + r * 0.64} ${300 + r * 0.77}`, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, R));
      txt(R, 100, 222, "T3 Code", { "font-family": MONO, "font-size": 30, "font-weight": 700 });
      el("path", { d: "M262 212 H660", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, R);
      const slots = [[92, 248], [246, 248], [400, 248], [554, 248], [207, 336], [361, 336], [547, 366]];
      const taps = NAMES.map(() => -99);
      const btns = NAMES.map((name, i) => {
        const [x, y] = slots[i], round = name === "fx", g = el("g", {}, R);
        const halo = round ? el("circle", { cx: x, cy: y, r: 32, fill: LIT[i] }, g) : el("rect", { x, y, width: 140, height: 60, rx: 30, fill: LIT[i] }, g);
        const press = el("g", {}, g);
        if (round) el("circle", { cx: x, cy: y, r: 40, fill: "none", stroke: INK, "stroke-width": 3, class: "mg-ring" }, press);
        else el("rect", { x: x - 7, y: y - 7, width: 154, height: 74, rx: 37, fill: "none", stroke: INK, "stroke-width": 3, class: "mg-ring" }, press);
        const face = round ? el("circle", { cx: x, cy: y, r: 32, fill: "#fff", stroke: INK, "stroke-width": 3 }, press) : el("rect", { x, y, width: 140, height: 60, rx: 30, fill: "#fff", stroke: INK, "stroke-width": 3 }, press);
        txt(press, round ? x : x + 70, round ? y + 7 : y + 37, name, { "text-anchor": "middle", "font-family": MONO, "font-size": round ? 22 : 18, "font-weight": 700 });
        button(g, name, () => { taps[i] = api.now(); api.poke(); });
        return { halo, face, press, x, y, round, i };
      });
      return (t, now) => {
        const all = seg(t, 6.4, 6.7) * (1 - seg(t, 9.2, 9.7));
        let ping = 0;
        btns.forEach((b) => {
          const a = 0.6 + b.i * 0.8, pulse = seg(t, a, a + 0.12) * (1 - seg(t, a + 0.75, a + 1)), s = now - taps[b.i];
          const user = s >= 0 && s < 1.6 ? 1 - seg(s, 1, 1.6) : 0, hit = (t >= a && t < a + 0.25) || (s >= 0 && s < 0.25) ? 1 : 0;
          const L = Math.max(pulse, all, user);
          ping = Math.max(ping, pulse, user);
          b.face.setAttribute("fill", L > 0.5 ? LIT[b.i] : "#fff");
          const grow = 9 * L + (L > 0.05 ? 2 * Math.sin(now * 6) : 0);
          if (b.round) b.halo.setAttribute("r", 32 + grow); else { b.halo.setAttribute("x", b.x - grow); b.halo.setAttribute("y", b.y - grow); b.halo.setAttribute("width", 140 + grow * 2); b.halo.setAttribute("height", 60 + grow * 2); b.halo.setAttribute("rx", 30 + grow); }
          b.halo.setAttribute("opacity", L > 0.05 ? 1 : 0);
          b.press.setAttribute("transform", `translate(0 ${3 * hit})`);
        });
        waves.forEach((w, j) => w.setAttribute("opacity", ping > 0.1 && (((now * 2.5 - j * 0.3) % 1) + 1) % 1 < 0.7 ? 1 : 0));
      };
    },
  };

  /* ---- 2. two hourglasses: the right one drains the 5 hour limit faster ---- */
  SC.hourglass = {
    dur: 9.2, still: 4.4,
    build(svg, api) {
      const card = (y, w, s, col, size) => { el("rect", { x: 400 - w / 2, y, width: w, height: 56, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, svg); txt(svg, 400, y + 37, s, { "text-anchor": "middle", "font-size": size, "font-weight": 700 }); };
      card(34, 250, "5 hour limit", YEL, 26);
      card(506, 380, "Weekly limits not affected", MINT, 23);
      const GLASS = "M-52 -110 C-52 -46 -9 -26 -9 0 C-9 26 -52 46 -52 110 H52 C52 46 9 26 9 0 C9 -26 52 -46 52 -110 Z";
      const make = (cx, label, col, from, to, stream, speed) => {
        const outer = el("g", {}, svg);
        el("rect", { x: cx - 98, y: 156, width: 196, height: 340, rx: 26, fill: "none", stroke: INK, "stroke-width": 3, class: "mg-ring" }, outer);
        const g = el("g", {}, outer), id = `mghg${++uid}`;
        el("clipPath", { id }, g).appendChild(el("path", { d: GLASS }));
        el("path", { d: GLASS, fill: "#fff" }, g);
        const sand = el("g", { "clip-path": `url(#${id})` }, g);
        const top = el("rect", { x: -60, width: 120, fill: YEL }, sand);
        const fall = el("rect", { x: -stream / 2, width: stream, fill: YEL }, sand);
        const grains = [0, 1, 2].map(() => el("circle", { r: stream / 2 + 1.5, fill: YEL, stroke: INK, "stroke-width": 1.5 }, sand));
        const pile = el("path", { fill: YEL }, sand);
        el("path", { d: GLASS, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, g);
        [-1, 1].forEach((sx) => el("rect", { x: sx * 66 - 4, y: -112, width: 8, height: 224, rx: 3, fill: col, stroke: INK, "stroke-width": 2.5 }, g));
        [-128, 110].forEach((y) => el("rect", { x: -80, y, width: 160, height: 18, rx: 7, fill: col, stroke: INK, "stroke-width": 3 }, g));
        txt(outer, cx, 474, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
        button(outer, `${label}: tap to flip both`, () => api.seek(8.3));
        return { g, cx, from, to, top, fall, grains, pile, speed };
      };
      const hs = [make(240, "Claude Code", LIL, 0.6, 8.2, 4, 0.7), make(560, "Agent SDK", BLUE, 0.6, 4.0, 8, 1.9)];
      return (t, now) => {
        const rot = 180 * io(seg(t, 8.3, 9.1));
        hs.forEach((h) => {
          tf(h.g, h.cx, 300, 1, rot);
          const f = seg(t, h.from, h.to), yt = -98 + 94 * f, yb = 110 - 92 * f, bump = 16 * cl(f * 5);
          h.top.setAttribute("y", yt); h.top.setAttribute("height", Math.max(0, -4 - yt));
          h.pile.setAttribute("d", `M-60 112 V${yb + bump / 2} Q0 ${yb - bump} 60 ${yb + bump / 2} V112 Z`);
          const run = f > 0 && f < 1;
          h.fall.setAttribute("y", -6); h.fall.setAttribute("height", run ? Math.max(0, yb - bump / 2 + 6) : 0);
          h.grains.forEach((n, j) => { const u = (now * h.speed + j / 3) % 1; n.setAttribute("cx", 0); n.setAttribute("cy", -4 + u * (yb - bump / 2 + 4)); n.setAttribute("opacity", run ? 1 : 0); });
        });
      };
    },
  };

  /* ---- 3. six dominoes tip over one by one, each landing with its note ---- */
  SC.dominoes = {
    dur: 9, still: 6.5,
    build(svg, api) {
      const D = [
        [["Claude Code", "desktop"], ["Claude", "first"], YEL],
        [["Munder", "Difflin"], ["Agents for", "all kinds", "of work"], BLUE],
        [["Codex app"], ["Codex", "first"], LIL],
        [["Orca"], ["Any CLI", "agent"], SKY],
        [["Conductor"], ["Cloud work", "goes on", "with the", "app closed"], MINT],
        [["OpenCode", "desktop"], ["Local", "models"], YEL],
      ];
      const FLOOR = 360;
      el("path", { d: `M20 ${FLOOR + 6} H780`, stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      const taps = D.map(() => -99);
      const items = D.map(([name, note, col], i) => {
        const m = 103 + i * 126, px = m - 41, t0 = 0.8 + i * 0.55;
        name.forEach((s, j) => txt(svg, m, 398 + j * 23, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 }));
        const cardG = el("g", {}, svg);
        el("rect", { x: m - 58, y: 180, width: 116, height: 82, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cardG);
        const lh = note.length > 3 ? 18 : 22, fs = note.length > 3 ? 15 : 17;
        note.forEach((s, j) => txt(cardG, m, 227 - (note.length - 1) * lh / 2 + j * lh, s, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 }));
        const g = el("g", {}, svg);
        el("rect", { x: -51, y: -89, width: 58, height: 96, rx: 13, fill: "none", stroke: INK, "stroke-width": 3, class: "mg-ring" }, g);
        el("rect", { x: -44, y: -82, width: 44, height: 82, rx: 8, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-37 -41 H-7", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        [[-22, -61], [-31, -20], [-13, -20]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 4, fill: INK }, g));
        button(g, `${name.join(" ")}: ${note.join(" ")}`, () => { taps[i] = api.now(); api.poke(); });
        return { g, cardG, m, px, t0, land: t0 + 0.55, i };
      });
      return (t, now) => {
        const up = io(seg(t, 7.6, 8.4)), fade = 1 - seg(t, 7.4, 7.7);
        items.forEach((d) => {
          const fallK = seg(t, d.t0, d.land), base = 90 * fallK * fallK * (1 - up);
          let ang = base, userK = 1;
          const s = now - taps[d.i];
          if (s >= 0 && s < 2.8) {
            if (base > 45) {
              const r = 1 - io(seg(s, 0, 0.5)), f2 = seg(s, 1.8, 2.35);
              ang = s < 1.8 ? 90 * r : 90 * f2 * f2;
              userK = s < 1.8 ? 1 - seg(s, 0, 0.25) : ob(seg(s, 2.35, 2.7));
            } else ang = base - 7 * Math.sin(seg(s, 0, 0.6) * Math.PI * 2);
          }
          tf(d.g, d.px, FLOOR, 1, ang);
          const k = ob(seg(t, d.land, d.land + 0.35)) * fade * userK;
          d.cardG.setAttribute("opacity", cl(k * 1.5));
          d.cardG.setAttribute("transform", `translate(${d.m} 262) scale(${0.6 + 0.4 * k}) translate(${-d.m} -262)`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 8, still: 7.5,
    build(svg) {
      el("rect", { x: 64, y: 92, width: 170, height: 44, rx: 22, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 149, 121, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 64, 222, "T3 Code", { "font-size": 70, "font-weight": 700 });
      txt(svg, 64, 300, "alternatives", { "font-size": 70, "font-weight": 700 });
      el("path", { d: "M66 326 H470", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 382, "6 picks by why you are leaving", { "font-size": 26, "font-weight": 500 });
      txt(svg, 64, 424, "Checked 3 Nov 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      el("rect", { x: 600, y: 52, width: 296, height: 56, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6" }, svg);
      txt(svg, 748, 88, "T3 Code", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700, fill: MUTE });
      const NAMES = ["Claude Code desktop", "Munder Difflin", "Codex app", "Orca", "Conductor", "OpenCode desktop"];
      const COLS = [YEL, BLUE, LIL, SKY, MINT, YEL];
      const tiles = NAMES.map((s, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: 600, y: 128 + i * 62, width: 296, height: 50, rx: 12, fill: COLS[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 620, 160 + i * 62, s, { "font-family": MONO, "font-size": 19, "font-weight": 700 });
        return g;
      });
      return (t) => tiles.forEach((g, i) => { const k = oc(seg(t, 0.4 + i * 0.25, 0.95 + i * 0.25)) * (1 - seg(t, 7.8, 8)); g.setAttribute("transform", `translate(${340 * (1 - k)} 0)`); g.setAttribute("opacity", k); });
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
