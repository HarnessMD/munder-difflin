/* Bright coded scenes for "Agent Tools Today, 26 Nov 2026". Vanilla JS, no library.
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
  let uid = 0; // a counter for SVG ids

  /* ---- the newsstand, drawn in 1600 by 1200 units; k thickens the lines when it is drawn small ---- */
  const PX = [485, 800, 1115], PW = 270, PH = 332, PB = 730;
  const stand = (root, words, k = 1) => {
    const w3 = 3 * k, w25 = 2.5 * k, line = { stroke: INK, "stroke-width": w3, "stroke-linejoin": "round" };
    const ground = el("rect", { x: 170, y: 998, width: 1260, height: 26, rx: 13, fill: SOFT }, root);
    const posts = el("g", {}, root);
    [296, 1274].forEach((x) => el("rect", Object.assign({ x, y: 300, width: 30, height: 430, rx: 6, fill: YEL }, line), posts));
    const counter = el("g", {}, root);
    el("rect", { x: 278, y: 776, width: 1080, height: 238, rx: 22, fill: SOFT }, counter);
    el("rect", Object.assign({ x: 260, y: 760, width: 1080, height: 238, rx: 22, fill: YEL }, line), counter);
    el("rect", { x: 330, y: 814, width: 940, height: 134, rx: 16, fill: "none", stroke: INK, "stroke-width": w25 }, counter);
    el("rect", Object.assign({ x: 236, y: 728, width: 1128, height: 40, rx: 14, fill: YEL }, line), counter);
    const rail = el("rect", { x: 326, y: 516, width: 948, height: 20, rx: 10, fill: SOFT, stroke: INK, "stroke-width": w25 }, root);
    const awning = el("g", {}, root), n = 9, L0 = 234, R0 = 1366, sw = (R0 - L0) / n;
    let d = `M270 206 H1330 L${R0} 320`;
    for (let i = 0; i < n; i++) { const x0 = R0 - i * sw, x1 = x0 - sw; d += ` Q${(x0 + x1) / 2} 384 ${x1} 320`; }
    el("path", Object.assign({ d: d + " Z", fill: BLUE }, line), awning);
    for (let i = 1; i < n; i++) el("path", { d: `M${270 + (i * 1060) / n} 206 L${L0 + i * sw} 320`, stroke: INK, "stroke-width": w25, "stroke-linecap": "round" }, awning);
    el("rect", Object.assign({ x: 250, y: 172, width: 1100, height: 36, rx: 18, fill: YEL }, line), awning);
    const papers = PX.map((cx, i) => {
      const g = el("g", {}, root), id = `mgclip${++uid}`, p = { g };
      if (words) el("rect", { x: -PW / 2 - 16, y: -PH - 16, width: PW + 32, height: PH + 32, rx: 26, fill: "#fff", "fill-opacity": 0 }, g);
      el("rect", { x: -PW / 2, y: -PH, width: PW, height: PH, rx: 14 }, el("clipPath", { id }, g));
      el("rect", { x: -PW / 2 + 12, y: -PH + 10, width: PW, height: PH, rx: 14, fill: SOFT }, g);
      el("rect", { x: -PW / 2, y: -PH, width: PW, height: PH, rx: 14, fill: LIL }, g);
      p.mint = el("rect", { x: -PW / 2, y: -PH, width: 0, height: PH, fill: MINT, "clip-path": `url(#${id})` }, g);
      el("rect", { x: -PW / 2, y: -PH, width: PW, height: PH, rx: 14, fill: "none", stroke: INK, "stroke-width": w3 }, g);
      el("path", { d: "M-112 -234 H112", stroke: INK, "stroke-width": w25, "stroke-linecap": "round" }, g);
      [[92, 100], [78, 86], [100, 96], [66, 92], [90, 70], [58, 88]].forEach(([a, b], r) => {
        el("rect", { x: -112, y: -206 + r * 27, width: a, height: 11, rx: 5.5, fill: SOFT }, g);
        el("rect", { x: 12, y: -206 + r * 27, width: b, height: 11, rx: 5.5, fill: SOFT }, g);
      });
      if (!words) { el("rect", { x: -86, y: -290, width: 172, height: 26, rx: 13, fill: SOFT, stroke: INK, "stroke-width": w25 }, g); return p; }
      p.wordG = el("g", {}, g);
      p.word = txt(p.wordG, 0, -262, words[i][0], { "text-anchor": "middle", "font-size": 46, "font-weight": 700, opacity: 0.6 });
      el("rect", { x: -PW / 2 - 14, y: -PH - 14, width: PW + 28, height: PH + 28, rx: 24, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "9 9", class: "mg-ring" }, g);
      p.tag = el("g", { opacity: 0 }, g);
      const tp = "M-66 -46 H84 Q102 -46 102 -28 V28 Q102 46 84 46 H-66 L-106 0 Z";
      el("path", { d: tp, transform: "translate(8 8)", fill: LIL }, p.tag);
      el("path", { d: tp, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p.tag);
      el("circle", { cx: -70, cy: 0, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, p.tag);
      txt(p.tag, 18, 13, words[i][1], { "text-anchor": "middle", "font-family": MONO, "font-size": 36, "font-weight": 700 });
      return p;
    });
    const enter = (t) => {
      ground.setAttribute("transform", `translate(800 0) scale(${oc(seg(t, 0, 0.5))} 1) translate(-800 0)`);
      const c = ob(seg(t, 0.1, 0.6)); counter.setAttribute("transform", `translate(0 ${60 * (1 - c)})`); counter.setAttribute("opacity", seg(t, 0.1, 0.3));
      posts.setAttribute("transform", `translate(0 728) scale(1 ${oc(seg(t, 0.25, 0.65))}) translate(0 -728)`);
      const a = ob(seg(t, 0.35, 0.85)); awning.setAttribute("transform", `translate(0 ${-90 * (1 - a)})`); awning.setAttribute("opacity", seg(t, 0.35, 0.55));
      rail.setAttribute("opacity", seg(t, 0.5, 0.75));
    };
    return { enter, papers };
  };
  const PAPERS = [["Cogentic", "25 Nov"], ["GRH Lean", "25 Nov"], ["Hirsch", "24 Nov"]];

  const SC = {};

  /* ---- 1. a breeze passes the rack; each paper lifts and turns mint; a tap shows its date ---- */
  SC.newsstand = {
    w: 1600, h: 1200, dur: 9, still: 9,
    build(svg, api) {
      const S = stand(svg, PAPERS);
      const B0 = 1.9, B1 = 6.4, hx = (t) => -60 + 2260 * io(seg(t, B0, B1));
      const when = PX.map((cx) => { for (let t = B0; t < B1; t += 0.01) if (hx(t) >= cx - PW / 2 + 30) return t; return B1; });
      const streaks = [[598, 0, 300], [652, -130, 380], [704, -50, 250]].map(([y, dx, len]) => {
        const g = el("g", {}, svg), d = `M${-len} 0 C${-len * 0.7} -16 ${-len * 0.35} 16 -24 0 C2 -10 20 -24 10 -38 C2 -48 -16 -42 -14 -28`;
        el("path", { d, stroke: INK, "stroke-width": 17, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        el("path", { d, stroke: SKY, "stroke-width": 11, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return { g, y, dx };
      });
      let pin = -1, pinAt = 0, stopAt = 0, prev = -1, prevAt = -9, pinT = 0, pinLap = 0, from = [1, 1, 1], fromLap = -1, lastT = 0, lastLap = 0;
      const state = (i, t, lap) => {
        const u = t - when[i], f = lap > 0 ? (lap === fromLap ? from[i] : 1) : 0;
        const r = seg(t, 0.2 + i * 0.1, 0.9 + i * 0.1), back = f * (1 - io(r));
        return {
          show: lap > 0 ? 1 : seg(t, 0.7 + i * 0.1, 0.9 + i * 0.1),
          drop: lap > 0 ? 1 : ob(seg(t, 0.7 + i * 0.1, 1.2 + i * 0.1)),
          word: lap > 0 ? 1 : oc(seg(t, 1.25 + i * 0.09, 1.6 + i * 0.09)),
          mint: Math.max(back, io(seg(u, 0.05, 0.55))),
          bright: Math.max(back, oc(seg(u, 0.25, 0.6))),
          lift: 40 * (ob(seg(u, 0, 0.4)) - io(seg(u, 0.5, 1.15))) - 10 * f * Math.sin(Math.PI * r),
          wob: 3 * Math.sin(seg(u, 0, 1.15) * Math.PI * 2) * (1 - seg(u, 0, 1.15)),
          pop: 0.12 * Math.sin(Math.PI * seg(u, 0.25, 0.7)),
        };
      };
      S.papers.forEach((p, i) => button(p.g, `${PAPERS[i][0]}: ${PAPERS[i][1]} on its own page`, () => {
        const now = api.now();
        if (pin === i) { // tap the same paper again: the tag goes and the breeze replays from lilac
          from = PX.map((_, j) => state(j, pinT, pinLap).mint); fromLap = 1; prev = i; prevAt = now; pin = -1;
          api.seek(SC.newsstand.dur + 0.001); return;
        }
        if (pin < 0) { stopAt = now; pinT = lastLap > 0 ? lastT : Math.max(lastT, 1.7); pinLap = lastLap; }
        prev = pin; prevAt = now; pin = i; pinAt = now; api.poke();
      }));
      return (t, now, lap = 0) => {
        if (pin < 0) { lastT = t; lastLap = lap; }
        const tb = pin < 0 ? t : pinT, lb = pin < 0 ? lap : pinLap;
        const ease = (at) => (calm ? 1 : oc(seg(now - at, 0, 0.3)));
        const bf = pin < 0 ? 1 : 1 - ease(stopAt);
        S.enter(lb > 0 ? 9 : tb);
        S.papers.forEach((p, i) => {
          const s = state(i, tb, lb), sel = i === pin ? ease(pinAt) : i === prev ? 1 - ease(prevAt) : 0;
          p.g.setAttribute("transform", `translate(${PX[i]} ${PB - s.lift * bf - 18 * sel - 80 * (1 - s.drop)}) rotate(${s.wob * bf})`);
          p.g.setAttribute("opacity", s.show);
          p.mint.setAttribute("width", PW * s.mint);
          p.word.setAttribute("opacity", s.word * (0.6 + 0.4 * s.bright));
          p.wordG.setAttribute("transform", `translate(0 ${14 * (1 - s.word) - 278}) scale(${1 + s.pop}) translate(0 278)`);
          const tk = i === pin ? (calm ? 1 : seg(now - pinAt - 0.08, 0, 0.45)) : i === prev ? (calm ? 0 : 1 - seg(now - prevAt, 0, 0.25)) : 0;
          p.tag.setAttribute("opacity", cl(tk * 3));
          p.tag.setAttribute("transform", `translate(0 -140) rotate(${-5 - 8 * (1 - oc(tk))}) scale(${0.5 + 0.5 * ob(tk)})`);
        });
        const h = hx(tb), fade = bf * (1 - seg(h, 1700, 2150));
        streaks.forEach((s, j) => { tf(s.g, h + s.dx, s.y + Math.sin(tb * 4 + j * 1.7) * 6); s.g.setAttribute("opacity", fade); });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 104, y: 218, width: 236, height: 62, rx: 31, fill: SOFT }, pill);
      el("rect", { x: 96, y: 210, width: 236, height: 62, rx: 31, fill: YEL, stroke: INK, "stroke-width": 3 }, pill);
      txt(pill, 214, 251, "Daily brief", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      const t1 = txt(svg, 96, 396, "Agent Tools Today,", { "font-size": 88, "font-weight": 700 });
      const t2 = txt(svg, 96, 500, "26 Nov 2026", { "font-size": 88, "font-weight": 700 });
      const l3 = txt(svg, 96, 594, "Cogentic, GRH in Lean, Hirsch", { "font-size": 36, "font-weight": 500, fill: MUTE });
      const chk = el("g", {}, svg);
      el("circle", { cx: 114, cy: 658, r: 17, fill: MINT, stroke: INK, "stroke-width": 2.5 }, chk);
      el("path", { d: "M106 658 l6 6 l10 -12", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, chk);
      const l4 = txt(svg, 144, 667, "Checked 26 Nov", { "font-family": MONO, "font-size": 26, "font-weight": 500, fill: CAP });
      const S = stand(el("g", { transform: "translate(914 191) scale(0.45)" }, svg), null, 2.2);
      const rise = (n, a, b, dy) => { const k = oc(seg(a, b, b + 0.48)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${dy * (1 - k)})`); };
      return (t) => {
        pill.setAttribute("transform", `translate(96 241) scale(${ob(seg(t, 0.1, 0.55))}) translate(-96 -241)`); pill.setAttribute("opacity", seg(t, 0.1, 0.25));
        rise(t1, t, 0.25, 28); rise(t2, t, 0.36, 28);
        const te = t - 0.45; S.enter(te);
        S.papers.forEach((p, i) => { const e = ob(seg(te, 0.7 + i * 0.1, 1.2 + i * 0.1)); p.g.setAttribute("transform", `translate(${PX[i]} ${PB - 80 * (1 - e)})`); p.g.setAttribute("opacity", seg(te, 0.7 + i * 0.1, 0.9 + i * 0.1)); });
        rise(l3, t, 1.4, 18); rise(l4, t, 1.9, 18);
        chk.setAttribute("transform", `translate(114 658) scale(${ob(seg(t, 1.95, 2.4))}) translate(-114 -658)`);
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
    const frame = () => { const now = clock(), T = now + off; draw(held ? sc.still : ((T % sc.dur) + sc.dur) % sc.dur, now, held ? 0 : Math.floor(T / sc.dur)); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = calm; tick(); }, poke: () => { held = calm; tick(); } };
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
