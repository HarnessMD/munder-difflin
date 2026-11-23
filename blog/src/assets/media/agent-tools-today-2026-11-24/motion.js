/* Bright coded scenes for "Agent Tools Today, 24 Nov 2026". Vanilla JS, no library.
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
  const sio = (x) => 0.5 - Math.cos(Math.PI * x) / 2;
  const CALM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;
  const nid = (s) => `mg-atd-${s}-${++uid}`; // a counter for SVG ids

  /* ---- shared drawing ---- */
  // a yellow windmill with four blue sails, drawn around its hub at 0,0; the tower stands on y = 207
  const windmill = (p) => {
    const g = el("g", {}, p);
    const ground = el("path", { d: "M-150 209 H150", stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, g);
    const tower = el("g", {}, g);
    el("path", { d: "M-46 24 H46 L70 207 H-70 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tower);
    el("rect", { x: -13, y: 76, width: 26, height: 36, rx: 13, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tower);
    el("path", { d: "M-13 96 H13", stroke: INK, "stroke-width": 2 }, tower);
    el("path", { d: "M-21 207 V172 Q-21 150 0 150 Q21 150 21 172 V207", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tower);
    el("path", { d: "M-58 30 C-58 -18 -32 -40 0 -40 C32 -40 58 -18 58 30 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tower);
    const rot = el("g", {}, g);
    const sails = [0, 1, 2, 3].map((k) => {
      const arm = el("g", { transform: `rotate(${k * 90})` }, rot), s = el("g", {}, arm);
      el("rect", { x: 40, y: 2, width: 142, height: 34, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, s);
      el("path", { d: "M75.5 3 V35 M111 3 V35 M146.5 3 V35 M41 19 H181", stroke: INK, "stroke-width": 1.75 }, s);
      el("path", { d: "M12 0 H186", stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round" }, s);
      return s;
    });
    const hub = el("g", {}, g);
    el("circle", { r: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, hub);
    el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, hub);
    return { g, ground, tower, rot, sails, hub };
  };
  // entrance from t0: the ground line grows, the tower pops up from it, the hub pops, the sails unfurl one by one
  const grow = (w, T, t0) => {
    const kg = oc(seg(T, t0, t0 + 0.55));
    w.ground.setAttribute("transform", `scale(${kg} 1)`); w.ground.setAttribute("opacity", kg > 0.01 ? 1 : 0);
    const e = ob(seg(T, t0 + 0.05, t0 + 0.65));
    w.tower.setAttribute("transform", `translate(0 207) scale(${0.9 + 0.1 * e} ${e}) translate(0 -207)`); w.tower.setAttribute("opacity", seg(T, t0 + 0.05, t0 + 0.2));
    w.hub.setAttribute("transform", `scale(${ob(seg(T, t0 + 0.35, t0 + 0.75))})`);
    w.sails.forEach((s, k) => { const u = seg(T, t0 + 0.45 + k * 0.09, t0 + 0.95 + k * 0.09); s.setAttribute("transform", `scale(${ob(u)} 1)`); s.setAttribute("opacity", u > 0 ? 1 : 0); });
  };

  const SC = {};
  const NAMES = ["GLM 5.4", "OpenCode", "Shirudo"], DATE = "23 Nov";

  /* ---- 1. the sails sweep past three tiles and light them; tap a tile to stop the sails and read its date ---- */
  SC.windmill = {
    dur: 10, still: 9,
    build(svg, api) {
      const HX = 400, HY = 205, STILL = 9, XS = [160, 400, 640], TY = 474, TW = 200, TH = 64, S0 = 137.5;
      const root = el("g", {}, svg);
      const wm = windmill(root); tf(wm.g, HX, HY);
      // the sails turn counterclockwise: ease in from 1.3 s, steady, ease out to rest at 8.4 s, half a turn in all
      const V = 180 / 5.8;
      const turn = (T) => T <= 1.3 ? 0 : T <= 2.5 ? (V * (T - 1.3) ** 2) / 2.4 : T <= 7 ? V * (T - 1.9) : T <= 8.4 ? V * (5.1 + (T - 7) - (T - 7) ** 2 / 2.8) : 180;
      const when = (a) => { for (let T = 0; T < 9; T += 0.005) if (turn(T) >= a) return T; return 99; };
      // every moment a sail points at a tile on its way round
      const sweeps = XS.map((x) => {
        const th = (Math.atan2(TY - HY, x - HX) * 180) / Math.PI, out = [];
        for (let k = 0; k < 4; k++) for (let m = -1; m <= 1; m++) { const a = S0 + 90 * k - (th + 360 * m); if (a > 0 && a <= 180) out.push(when(a)); }
        return out.sort((a, b) => a - b);
      });
      let pin = -1, pinFrom = STILL, pinTo = STILL, pinAt = 0, tagI = -1, tagOn = false, tagAt = -9, lastT = STILL;
      const press = (i) => {
        const now = api.now();
        if (pin === i) { pin = -1; tagOn = false; tagAt = now; api.seek(lastT); }
        else { if (pin < 0) { pinFrom = lastT; pinTo = cl(lastT + 0.3, 1.7, STILL); pinAt = now; } pin = i; tagI = i; tagOn = true; tagAt = now; api.poke(); }
        tiles.forEach((tl, j) => tl.g.setAttribute("aria-pressed", String(pin === j)));
      };
      const tiles = XS.map((x, i) => {
        const g = el("g", { "aria-pressed": "false" }, root), id = nid("tile");
        const cp = el("clipPath", { id }, g);
        el("rect", { x: -TW / 2, y: -TH / 2, width: TW, height: TH, rx: 16 }, cp);
        el("rect", { x: -TW / 2 + 6, y: -TH / 2 + 6, width: TW, height: TH, rx: 16, fill: LIL }, g);
        el("rect", { x: -TW / 2, y: -TH / 2, width: TW, height: TH, rx: 16, fill: LIL }, g);
        const wipe = el("rect", { x: -TW / 2, y: -TH / 2, width: 0, height: TH, fill: MINT, "clip-path": `url(#${id})` }, g);
        el("rect", { x: -TW / 2, y: -TH / 2, width: TW, height: TH, rx: 16, fill: "none", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -TW / 2 - 9, y: -TH / 2 - 9, width: TW + 18, height: TH + 18, rx: 24, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 7", class: "mg-ring" }, g);
        const word = el("g", {}, g);
        const n = txt(word, 0, 8.5, NAMES[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700, fill: MUTE });
        const ring = el("rect", { fill: "none", stroke: MINT, opacity: 0 }, root);
        button(g, `${NAMES[i]}, dated ${DATE}`, () => press(i));
        return { g, wipe, word, n, ring };
      });
      const tag = el("g", { opacity: 0 }, svg);
      el("rect", { x: -55, y: 5, width: 120, height: 44, rx: 14, fill: LIL }, tag);
      el("rect", { x: -60, y: 0, width: 120, height: 44, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 0, 30, DATE, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      return (t, now) => {
        let T = CALM ? STILL : t;
        if (pin >= 0) T = CALM ? pinTo : pinFrom + (pinTo - pinFrom) * oc(seg(now - pinAt, 0, 0.7));
        lastT = T;
        root.setAttribute("opacity", 1 - io(seg(T, 9.35, 9.95)));
        grow(wm, T, 0);
        wm.rot.setAttribute("transform", `rotate(${S0 - turn(T)})`);
        tiles.forEach((tl, i) => {
          const kb = seg(T, 0.75 + i * 0.1, 1.25 + i * 0.1), e = ob(kb), first = sweeps[i][0];
          const p = seg(T, first - 0.05, first + 0.3), lit = p >= 0.5;
          let pop = 0;
          sweeps[i].forEach((s, j) => { const q = seg(T, s, s + 0.5); if (s < 7 && q > 0 && q < 1) pop = Math.max(pop, (j ? 0.35 : 1) * Math.sin(Math.PI * oc(q))); });
          tf(tl.g, XS[i], TY - 26 * (1 - e), (0.92 + 0.08 * e) * (1 + 0.1 * pop));
          tl.g.setAttribute("opacity", seg(kb, 0, 0.25));
          tl.wipe.setAttribute("width", TW * oc(p));
          const kw = oc(seg(T, 1.05 + i * 0.1, 1.45 + i * 0.1)), wp = Math.sin(Math.PI * seg(T, first + 0.1, first + 0.5));
          tl.word.setAttribute("opacity", kw);
          tl.word.setAttribute("transform", `translate(0 ${10 * (1 - kw)}) scale(${1 + 0.08 * wp})`);
          tl.n.setAttribute("fill", lit ? INK : MUTE);
          const q = seg(T, first + 0.05, first + 0.6);
          const d = 4 + 12 * oc(q);
          for (const [k, v] of Object.entries({ x: XS[i] - TW / 2 - d, y: TY - TH / 2 - d, width: TW + 2 * d, height: TH + 2 * d, rx: 16 + d, "stroke-width": 1.5 + 3 * (1 - q), opacity: q > 0 && q < 1 ? 1 - q * q : 0 })) tl.ring.setAttribute(k, v);
        });
        if (tagI >= 0) {
          const k = CALM ? (tagOn ? 1 : 0) : tagOn ? ob(seg(now - tagAt, 0, 0.4)) : 1 - io(seg(now - tagAt, 0, 0.25));
          tf(tag, XS[tagI], 520, 0.7 + 0.3 * k); tag.setAttribute("opacity", cl(k * 1.5));
        }
      };
    },
  };

  /* ---- title card, 16 by 9: the windmill turns slowly and settles beside three cards ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const R = el("g", { transform: "translate(0 30)" }, svg);
      const pill = el("g", {}, R);
      el("rect", { x: -78, y: -20, width: 156, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 7, "Daily Brief", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      const lines = [
        txt(R, 64, 206, "Agent Tools", { "font-size": 80, "font-weight": 700 }),
        txt(R, 64, 290, "Today", { "font-size": 80, "font-weight": 700 }),
        txt(R, 64, 348, "24 Nov 2026", { "font-size": 30, "font-weight": 700 }),
        txt(R, 64, 392, "GLM 5.4, OpenCode and Shirudo", { "font-size": 23, "font-weight": 500, fill: MUTE }),
      ];
      const wm = windmill(R);
      const cards = NAMES.map((s, i) => {
        const g = el("g", {}, R), y = 186 + i * 62;
        el("rect", { x: 792, y: y + 6, width: 160, height: 48, rx: 12, fill: SOFT }, g);
        el("rect", { x: 786, y, width: 160, height: 48, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
        return { g, n: txt(g, 866, y + 31, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700, fill: MUTE }), y: y + 24 };
      });
      return (t) => {
        const T = CALM ? 6 : t;
        tf(pill, 142, 92, 0.6 + 0.4 * ob(seg(T, 0, 0.45))); pill.setAttribute("opacity", seg(T, 0, 0.15));
        lines.forEach((n, i) => { const k = oc(seg(T, 0.12 + i * 0.09, 0.62 + i * 0.09)); n.setAttribute("transform", `translate(0 ${22 * (1 - k)})`); n.setAttribute("opacity", k); });
        tf(wm.g, 652, 228, 0.62);
        grow(wm, T, 0.5);
        wm.rot.setAttribute("transform", `rotate(${45 - 94 * sio(seg(T, 1.1, 4.6)) + 4 * io(seg(T, 4.6, 5.3))})`);
        cards.forEach((c, i) => {
          const k = ob(seg(T, 0.8 + i * 0.1, 1.3 + i * 0.1)), w = seg(T, 4.3 + i * 0.12, 4.8 + i * 0.12);
          tf(c.g, 40 * (1 - k), 0); c.g.setAttribute("opacity", seg(T, 0.8 + i * 0.1, 0.95 + i * 0.1));
          c.n.setAttribute("fill", w > 0.3 ? INK : MUTE);
          const s = 1 + 0.1 * (w > 0 && w < 1 ? Math.sin(Math.PI * oc(w)) : 0);
          c.n.setAttribute("transform", `translate(866 ${c.y}) scale(${s}) translate(-866 ${-c.y})`);
        });
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
