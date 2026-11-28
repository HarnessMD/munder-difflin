/* Bright coded scenes for "Agent Tools Today, 11 Nov 2026". Vanilla JS, no library.
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
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let uid = 0;
  const SC = {};

  /* ---- a gumball machine drops the day's three lead items into its tray ---- */
  SC.gumball = {
    dur: 10.9, still: 9.3,
    build(svg, api) {
      const NAMES = ["Sheets", "AlphaProof", "Decider"], COLS = [BLUE, LIL, MINT];
      const MX = 172, GY = 186, GR = 140, CX = 172, CY = 420;
      const FLOOR = 540, R = 68, K0 = 22 / 68, SLOT = [706, 566, 426];
      const C = [0.3, 2.9, 5.5], LAG = 0.4, DROP = 2.3;
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const clip = `mg-gumball-clip-${++uid}`;
      const oq = (x) => 1 - (1 - x) * (1 - x);
      // the floor, the base and its plinth
      el("ellipse", { cx: 420, cy: 572, rx: 384, ry: 9, fill: SOFT }, svg);
      el("path", { d: "M100 340 H244 L270 552 H74 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 150, y: 486, width: 44, height: 26, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      el("path", { d: "M163 499 H181", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 548, width: 220, height: 24, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      // the clear chute, drawn as an ink tube with a white bore
      const TUBE = "M300 330 V470 A48 48 0 0 0 348 518 H352";
      el("path", { d: TUBE, fill: "none", stroke: INK, "stroke-width": 58 }, svg);
      el("path", { d: TUBE, fill: "none", stroke: "#fff", "stroke-width": 52 }, svg);
      // the tray's back, which the chute feeds into
      el("rect", { x: 336, y: 434, width: 448, height: 134, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      // the three labelled gumballs travel in this layer
      const layer = el("g", {}, svg);
      el("path", { d: "M283 354 V448", stroke: SKY, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      // the globe, full of small gumballs
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: clip }, defs);
      el("circle", { cx: MX, cy: GY, r: GR - 1.5 }, cp);
      el("circle", { cx: MX, cy: GY, r: GR, fill: "#fff" }, svg);
      const jig = el("g", {}, el("g", { "clip-path": `url(#${clip})` }, svg));
      let n = 0;
      for (let row = 0; row < 6; row++) {
        const y = 304 - row * 38;
        for (let k = -4; k <= 4; k++) {
          const x = MX + k * 44 + (row % 2 ? 22 : 0);
          if (Math.hypot(x - MX, y - GY) > GR + 6 || y < 96 + Math.abs(x - MX) * 0.35) continue;
          const g = el("g", { transform: `translate(${x} ${y})` }, jig);
          el("circle", { r: 22, fill: COLS[(n++ + row) % 3], stroke: INK, "stroke-width": 2.5 }, g);
          el("circle", { cx: -8, cy: -8, r: 5, fill: "#fff" }, g);
        }
      }
      el("circle", { cx: MX, cy: GY, r: GR, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M61 146 A118 118 0 0 1 122 79", fill: "none", stroke: SKY, "stroke-width": 10, "stroke-linecap": "round" }, svg);
      el("circle", { cx: 142, cy: 72, r: 5, fill: SKY }, svg);
      el("path", { d: "M292 218 A124 124 0 0 1 243 288", fill: "none", stroke: SKY, "stroke-width": 6, "stroke-linecap": "round" }, svg);
      // the collar, the lid and its knob
      el("rect", { x: 84, y: 312, width: 246, height: 28, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: MX, cy: 26, r: 10, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 130, y: 34, width: 84, height: 24, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      // the crank
      el("circle", { cx: CX, cy: CY, r: 40, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const arm = el("g", {}, el("g", { transform: `translate(${CX} ${CY})` }, svg));
      el("rect", { x: -34, y: -9, width: 68, height: 18, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, arm);
      el("circle", { cx: 34, cy: 0, r: 11, fill: LIL, stroke: INK, "stroke-width": 2.5 }, arm);
      el("circle", { cx: CX, cy: CY, r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      // the tray's front lip, over the gumballs' feet
      el("rect", { x: 332, y: 530, width: 456, height: 40, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      // a few sparkles in the open sky
      const STAR = "M0 -1 Q0.14 -0.14 1 0 Q0.14 0.14 0 1 Q-0.14 0.14 -1 0 Q-0.14 -0.14 0 -1 Z";
      const sparks = [[476, 118, 18, YEL], [640, 74, 13, SKY], [744, 208, 15, LIL], [566, 268, 12, MINT]].map(([x, y, s, c]) => {
        const g = el("g", {}, el("g", { transform: `translate(${x} ${y})` }, svg));
        el("path", { d: STAR, fill: c, stroke: INK, "stroke-width": 2.5 / s, "stroke-linejoin": "round", transform: `scale(${s})` }, g);
        return g;
      });
      // the labelled gumballs, drawn full size and shrunk while in the chute
      const balls = NAMES.map((name, i) => {
        const g = el("g", { display: "none" }, layer), spin = el("g", {}, g);
        el("circle", { r: R, fill: COLS[i], stroke: INK, "stroke-width": 3 }, spin);
        el("ellipse", { cx: -26, cy: -40, rx: 13, ry: 7, fill: "#fff", transform: "rotate(-35 -26 -40)" }, spin);
        const tag = el("g", {}, spin), w = name.length * 10.2 + 16;
        el("rect", { x: -w / 2, y: -16, width: w, height: 32, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
        txt(tag, 0, 6, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        const date = el("g", { opacity: 0 }, spin);
        el("rect", { x: -38, y: 9, width: 76, height: 26, rx: 13, fill: YEL, stroke: INK, "stroke-width": 2 }, date);
        txt(date, 0, 27.5, "11 Nov", { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 });
        return { g, spin, tag, date };
      });
      // one drop: fall down the chute, round the bend, roll out growing, rock to a stop upright
      const pose = (i, p) => {
        if (p < 0.24) { const a = seg(p, 0, 0.24); return [300, 322 + 148 * (a * a + a) / 2, K0, 0]; }
        if (p < 0.34) { const b = seg(p, 0.24, 0.34), th = Math.PI * (1 - b / 2); return [348 + 48 * Math.cos(th), 470 + 48 * Math.sin(th), K0, 90 * b]; }
        if (p < 0.88) { const c = seg(p, 0.34, 0.88), k = K0 + (1 - K0) * io(seg(c, 0.06, 0.5)); return [348 + (SLOT[i] - 348) * oq(c), FLOOR - R * k, k, 90 + 270 * oq(c)]; }
        const e = seg(p, 0.88, 1), w = 9 * Math.sin(e * Math.PI * 2) * (1 - e);
        return [SLOT[i] + (w * Math.PI * R) / 180, FLOOR - R, 1, 360 + w];
      };
      // the timeline: three crank turns, three drops, the last one shows its date, then the tray empties
      const timeline = (t) => ({
        p: C.map((c) => seg(t, c + LAG, c + LAG + DROP)),
        v: C.map((c, i) => io(seg(t, 10.1 + 0.12 * i, 10.4 + 0.12 * i))),
        d: [0, 0, seg(t, 8.3, 8.7)],
        crank: C.reduce((a, c) => a + 360 * io(seg(t, c, c + 0.8)), 0),
      });
      let user = null, last = timeline(0);
      const tapped = (now) => {
        const s = calm ? 99 : now - user.t0, { from: f, n } = user, out = f.p[n] > 0 && f.v[n] < 1;
        return {
          p: f.p.map((p, i) => (i === n ? (s < LAG ? (out ? p : 0) : seg(s, LAG, LAG + DROP)) : p > 0 ? Math.min(1, p + s / DROP) : 0)),
          v: f.v.map((v, i) => (i === n ? (s < LAG && out ? v + (1 - v) * io(seg(s, 0, 0.3)) : 0) : v * (1 - io(seg(s, 0, 0.3))))),
          d: f.d.map((d, i) => (i === n ? seg(s, LAG + DROP + 0.1, LAG + DROP + 0.5) : d * (1 - seg(s, 0, 0.25)))),
          crank: f.crank + 360 * io(seg(s, 0, 0.8)),
        };
      };
      const turn = () => {
        const f = { p: last.p.slice(), v: last.v.slice(), d: last.d.slice(), crank: last.crank };
        const idle = f.p.findIndex((p) => p === 0);
        user = { from: f, n: idle >= 0 ? idle : user ? (user.n + 1) % 3 : 0, t0: api.now() };
        api.poke();
      };
      const hit = el("g", {}, svg);
      el("circle", { cx: CX, cy: CY, r: 56, fill: "#fff", "fill-opacity": 0 }, hit);
      el("circle", { cx: CX, cy: CY, r: 56, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, hit);
      button(hit, "Turn the crank to drop the next gumball", turn);
      return (t, now) => {
        const P = user ? tapped(now) : timeline(t); last = P;
        arm.setAttribute("transform", `rotate(${P.crank})`);
        jig.setAttribute("transform", `translate(0 ${-3 * Math.abs(Math.sin((P.crank * Math.PI) / 120))})`);
        const tw = calm ? 9.3 : t;
        sparks.forEach((g, i) => g.setAttribute("transform", `scale(${0.8 + 0.2 * Math.sin(Math.PI * 2 * (tw * 6 / 10.9 + i * 0.27))})`));
        balls.forEach((b, i) => {
          const p = P.p[i], k0 = 1 - P.v[i];
          if (p <= 0 || k0 <= 0.001) { b.g.setAttribute("display", "none"); return; }
          b.g.removeAttribute("display");
          const [x, y, k, r] = pose(i, p);
          b.g.setAttribute("transform", `translate(${x} ${y}) scale(${k * k0})`);
          b.spin.setAttribute("transform", `rotate(${r})`);
          b.tag.setAttribute("transform", `translate(0 ${-12 * P.d[i]})`);
          b.date.setAttribute("opacity", P.d[i]);
        });
        const top = balls[user ? user.n : 2].g;
        if (layer.lastChild !== top) layer.appendChild(top);
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
