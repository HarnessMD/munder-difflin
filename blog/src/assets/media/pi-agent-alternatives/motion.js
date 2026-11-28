/* Bright coded scenes for "Pi agent alternatives". Vanilla JS, no library.
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

  const GREY = "#D9D4DF", CAP = "#6B5878";
  const hint = (svg, x, y, s, anchor = "end") => txt(svg, x, y, s, { "text-anchor": anchor, "font-size": 16, fill: MUTE, "font-weight": 500 });
  const pill = (svg, x, y, w, label, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x, y, width: w, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: x - 6, y: y - 6, width: w + 12, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
    txt(g, x + w / 2, y + 34, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
    button(g, label, fn);
    return g;
  };
  /* a name in the mono font, split onto two centred lines when it has a space */
  const name2 = (g, x, y, name, size, a = {}) => {
    const parts = name.split(" "), gap = size + 3;
    parts.forEach((p, j) => txt(g, x, y + (j - (parts.length - 1) / 2) * gap + size * 0.36, p, Object.assign({ "text-anchor": "middle", "font-family": MONO, "font-size": size, "font-weight": 700 }, a)));
  };
  const PICKS = ["OpenCode", "Munder Difflin", "Claude Code", "Codex CLI", "Hermes Agent", "Goose", "Crush"];
  const BEST = ["More in the box, any model", "A team of agents, Pi included", "Permission modes, Claude models", "You already pay for ChatGPT", "Chat apps and schedules", "Code and workflows, desktop app", "Swap models mid session"];

  const SC = {};

  /* ---- 1. seven keys slide onto a ring that already holds the Pi key ---- */
  SC.keyring = {
    dur: 11.4, still: 9.5,
    build(svg, api) {
      hint(svg, 774, 50, "tap a key");
      const C = [400, 300], R = 150, E = 240;
      const at = (deg, r = R) => { const a = (deg * Math.PI) / 180; return [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]; };
      el("ellipse", { cx: 400, cy: 572, rx: 170, ry: 12, fill: SOFT }, svg);
      el("rect", { x: 348, y: 20, width: 104, height: 22, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      [370, 430].forEach((x) => el("circle", { cx: x, cy: 31, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg));
      el("path", { d: "M400 42 V150", stroke: INK, "stroke-width": 8, "stroke-linecap": "round", fill: "none" }, svg);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: INK, "stroke-width": 13 }, svg);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: SOFT, "stroke-width": 6 }, svg);
      const forced = PICKS.map(() => null).concat([null]);
      const key = (fill, name, br, size, i) => {
        const g = el("g", {}, svg), blade = el("g", {}, g), bow = el("g", {}, g);
        el("path", { d: `M${br - 8} -8 H${br + 50} L${br + 58} -1 V3 H${br + 48} V11 H${br + 40} V3 H${br + 31} V12 H${br + 23} V3 H${br - 8} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, blade);
        el("circle", { r: br + 7, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", class: "mg-ring" }, bow);
        el("circle", { r: br, fill, stroke: INK, "stroke-width": 3 }, bow);
        name2(bow, 0, 0, name, size);
        button(g, `Lift the ${name} key`, () => { forced[i] = api.now(); api.poke(); });
        return { g, blade };
      };
      const place = (k, deg, lift, s, out) => {
        const [x, y] = at(deg, R + lift);
        k.g.setAttribute("transform", `translate(${x} ${y}) scale(${s})`);
        k.blade.setAttribute("transform", `rotate(${deg + (out ? 0 : 180)})`);
      };
      const pi = key(GREY, "Pi", 34, 24, 7);
      const keys = PICKS.map((n, i) => key(i % 2 ? LIL : BLUE, n, 44, 15, i));
      const lifted = (i, now) => { if (forced[i] == null) return 0; const u = now - forced[i]; return oc(seg(u, 0, 0.25)) * (1 - io(seg(u, 1.3, 1.7))); };
      return (t, now) => {
        const lp = lifted(7, now);
        place(pi, -90, -22 * lp, 1 + 0.08 * lp, false);
        keys.forEach((k, i) => {
          const a = 0.6 + i * 0.95, m = io(seg(t, a, a + 0.85)), slot = -45 + 45 * i;
          const ap = oc(seg(t, a - 0.2, a + 0.1)), gone = io(seg(t, 10.3 + (6 - i) * 0.05, 10.8 + (6 - i) * 0.05)), lv = lifted(i, now);
          place(k, E + (slot - E) * m, 26 * lv + 40 * gone, (0.6 + 0.4 * ap) * (1 + 0.1 * lv), true);
          k.g.setAttribute("opacity", ap * (1 - gone));
        });
      };
    },
  };

  /* ---- 2. the Pi kit box opens on three empty slots ---- */
  SC.kit = {
    dur: 10.5, still: 8.4,
    build(svg, api) {
      pill(svg, 646, 34, 112, "Open", () => api.seek(0));
      hint(svg, 758, 114, "tap Open");
      const X = 110, Wd = 420, HY = 210, TH = 130;
      el("ellipse", { cx: X + Wd / 2, cy: 512, rx: 240, ry: 14, fill: SOFT }, svg);
      const back = el("g", {}, svg);
      el("rect", { x: X, y: HY, width: Wd, height: TH, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const labels = ["Subagents", "Plan mode", "Permissions"].map((s, i) => {
        const x = X + 12 + i * 136;
        el("rect", { x, y: HY + 17, width: 124, height: 96, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "8 7" }, svg);
        return txt(svg, x + 62, HY + 71, s, { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      });
      el("rect", { x: X, y: HY + TH, width: Wd, height: 160, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, X + Wd / 2, HY + TH + 112, "Pi", { "text-anchor": "middle", "font-family": MONO, "font-size": 76, "font-weight": 700 });
      el("rect", { x: X + Wd / 2 - 22, y: HY + TH - 6, width: 44, height: 22, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      const front = el("g", {}, svg);
      const lid = el("g", {}, front);
      const face = el("rect", { x: X - 4, y: HY, width: Wd + 8, height: TH, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, lid);
      const top = el("rect", { x: X + 24, width: Wd - 48, rx: 10, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, lid);
      const tag = el("g", {}, svg), tagIn = el("g", {}, tag);
      el("path", { d: "M20 43 C4 43 -10 32 -16 14", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tagIn);
      el("path", { d: "M28 0 H164 Q170 0 170 6 V80 Q170 86 164 86 H28 L0 58 V28 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tagIn);
      el("circle", { cx: 20, cy: 43, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tagIn);
      txt(tagIn, 99, 38, "Add with", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(tagIn, 99, 64, "extensions", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      return (t) => {
        const th = 115 * ob(seg(t, 0.6, 1.6)) * (1 - io(seg(t, 9.3, 10.1))), c = Math.cos((th * Math.PI) / 180);
        const hh = Math.max(Math.abs(c) * TH, 6);
        face.setAttribute("y", c >= 0 ? HY : HY - hh); face.setAttribute("height", hh); face.setAttribute("rx", Math.min(8, hh / 2));
        top.setAttribute("y", HY + 22 * c); top.setAttribute("height", Math.max(TH - 44, 0) * Math.max(c, 0.01));
        (c >= 0 ? front : back).appendChild(lid);
        face.setAttribute("fill", c >= 0 ? "#fff" : "#E9E3F2"); top.setAttribute("opacity", c > 0.3 ? 1 : 0);
        labels.forEach((n, i) => { const k = ob(seg(t, 1.7 + i * 0.45, 2.1 + i * 0.45)); n.setAttribute("opacity", cl(k * 2) * (1 - seg(t, 9.1, 9.4))); n.setAttribute("transform", `translate(0 ${10 * (1 - k)})`); });
        const d = seg(t, 3.4, 4.1), y = -160 + (232 + 160) * ob(d) - 34 * seg(t, 8.9, 9.3);
        const k = seg(t, 4.0, 5.6), ang = 18 * (1 - k) * Math.exp(-2.5 * k) * Math.cos(9 * k) * (d >= 1 ? 1 : 0);
        tag.setAttribute("transform", `translate(588 ${y})`);
        tagIn.setAttribute("transform", `rotate(${ang} 20 43)`);
        tag.setAttribute("opacity", d <= 0 ? 0 : 1 - seg(t, 8.9, 9.3));
      };
    },
  };

  /* ---- 3. a selector dial steps through the seven stops ---- */
  SC.dial = {
    dur: 11.6, still: 10,
    build(svg, api) {
      el("rect", { x: 30, y: 24, width: 740, height: 552, rx: 28, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      hint(svg, 744, 64, "tap the dial");
      const C = [400, 252], ST = [-210, -170, -130, -90, -50, -10, 30];
      const at = (deg, r) => { const a = (deg * Math.PI) / 180; return [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r]; };
      const dots = ST.map((d, i) => {
        const [x, y] = at(d, 134), [lx, ly] = at(d, 160), cx = Math.cos((d * Math.PI) / 180);
        const anchor = Math.abs(cx) < 0.2 ? "middle" : cx < 0 ? "end" : "start";
        txt(svg, lx, ly + 7, PICKS[i], { "text-anchor": anchor, "font-family": MONO, "font-size": 18, "font-weight": 700 });
        return el("circle", { cx: x, cy: y, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      });
      const g = el("g", {}, svg), knob = el("g", {}, g);
      el("circle", { cx: C[0], cy: C[1], r: 118, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", class: "mg-ring" }, g);
      el("circle", { r: 108, fill: YEL, stroke: INK, "stroke-width": 3 }, knob);
      for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; el("path", { d: `M${Math.cos(a) * 96} ${Math.sin(a) * 96} L${Math.cos(a) * 106} ${Math.sin(a) * 106}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, knob); }
      el("circle", { r: 74, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, knob);
      el("path", { d: "M-18 0 H62", stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, knob);
      el("circle", { r: 13, fill: SKY, stroke: INK, "stroke-width": 2.5 }, knob);
      el("path", { d: "M122 0 L104 -10 L104 10 Z", fill: INK, "stroke-linejoin": "round", stroke: INK, "stroke-width": 2 }, knob);
      el("rect", { x: 130, y: 418, width: 540, height: 118, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      const body = el("g", {}, svg);
      const nm = txt(body, 400, 466, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      const ln = txt(body, 400, 508, "", { "text-anchor": "middle", "font-size": 21, "font-weight": 500 });
      el("tspan", { "font-weight": 700 }, ln).textContent = "Best for: ";
      const lnT = el("tspan", {}, ln);
      const auto = (t) => { let a = ST[0]; for (let i = 0; i < 6; i++) { const T = 1.0 + i * 1.35; a += 40 * ob(seg(t, T, T + 0.5)); } return a - 240 * io(seg(t, 10.4, 11.2)); };
      let man = null, shown = -1, changed = -99, lastA = ST[0];
      const idx = (a) => cl(Math.round((a - ST[0]) / 40), 0, 6);
      button(g, "Dial on OpenCode. Step to the next stop", () => {
        const from = lastA, nx = (idx(from) + 1) % 7;
        man = { from, to: ST[nx], at: api.now(), wrap: nx === 0 }; api.poke();
      });
      return (t, now) => {
        let a = auto(t);
        if (man) { const u = seg(now - man.at, 0, man.wrap ? 0.8 : 0.5); a = man.from + (man.to - man.from) * (man.wrap ? io(u) : ob(u)); }
        lastA = a;
        knob.setAttribute("transform", `translate(${C[0]} ${C[1]}) rotate(${a})`);
        const s = idx(a);
        if (s !== shown) {
          if (shown !== -1) changed = now;
          shown = s; nm.textContent = PICKS[s]; lnT.textContent = BEST[s];
          g.setAttribute("aria-label", `Dial on ${PICKS[s]}, best for ${BEST[s]}. Step to the next stop`);
        }
        dots.forEach((d, i) => { d.setAttribute("fill", i === s ? MINT : "#fff"); d.setAttribute("r", i === s ? 11 : 8); });
        const f = 0.3 + 0.7 * oc(seg(now - changed, 0, 0.3));
        body.setAttribute("opacity", f); body.setAttribute("transform", `translate(0 ${8 * (1 - f)})`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      el("rect", { x: 64, y: 48, width: 168, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 148, 76, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 62, 172, "Pi agent alternatives", { "font-size": 72, "font-weight": 700 });
      txt(svg, 64, 224, "7 coding agents to try", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 262, "Checked 26 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      const TW = 116, gap = 11, x0 = (960 - (7 * TW + 6 * gap)) / 2, cx = (i) => x0 + i * (TW + gap) + TW / 2;
      const lines = el("path", { d: `M480 366 V392 M${cx(0)} 392 H${cx(6)} ` + PICKS.map((_, i) => `M${cx(i)} 392 V418`).join(" "), fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round", "stroke-dasharray": "2 8" }, svg);
      const pi = el("g", {}, svg);
      el("rect", { x: 425, y: 308, width: 110, height: 58, rx: 14, fill: GREY, stroke: INK, "stroke-width": 3 }, pi);
      txt(pi, 480, 347, "Pi", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
      const FILL = [YEL, BLUE, LIL, SKY, MINT, YEL, BLUE];
      const tiles = PICKS.map((name, i) => {
        const g = el("g", {}, svg), x = x0 + i * (TW + gap);
        el("rect", { x, y: 420, width: TW, height: 72, rx: 14, fill: FILL[i], stroke: INK, "stroke-width": 2.5 }, g);
        name2(g, x + TW / 2, 456, name, 17);
        return g;
      });
      return (t) => {
        const c0 = oc(seg(t, 0.1, 0.6));
        pi.setAttribute("opacity", c0); pi.setAttribute("transform", `translate(0 ${-16 * (1 - c0)})`);
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
