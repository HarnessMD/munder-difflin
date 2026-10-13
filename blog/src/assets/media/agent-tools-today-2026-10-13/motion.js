/* Bright coded scenes for "Agent tools today, 13 Oct 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- a kite: the model is the kite, and each line of its listing ties on as a paper bow on the tail ---- */
  SC.today = {
    dur: 12, still: 9.5,
    build(svg, api) {
      const KX = 187, KY = 190, TILT = -14, DX = 290, DY = 197, WAVES = 1.5625, S = [0.2, 0.52, 0.84], BOW = [BLUE, MINT, LIL];
      const rot = (x, y, a) => { const r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };
      const LEN = Math.hypot(DX, DY), NX = DY / LEN, NY = -DX / LEN;
      const tip0 = rot(0, 180, TILT), P0 = [KX + tip0[0], KY + tip0[1]];
      /* a point on the tail: s runs from 0 at the kite to 1 at the loose end; the bows sit where the wave crosses zero */
      const tail = (s, bx, by, sx, sy, ph, a) => {
        const r = cl(s / 0.34), w = 12 * r * r * (3 - 2 * r) * a * Math.sin(Math.PI * 2 * WAVES * (s - 0.2) - ph), k = 1 - 0.75 * s;
        return [bx + sx * k + DX * s + NX * w, by + sy * k + DY * s + NY * w];
      };
      /* soft clouds and a few streaks of wind */
      const clouds = [[652, 306, 1.35], [690, 78, 0.8], [286, 524, 0.95]].map(([x, y, s]) => {
        const g = el("g", {}, svg);
        [[-38, 2, 24], [-6, -16, 32], [32, -2, 25]].forEach(([cx, cy, r]) => el("circle", { cx, cy, r, fill: SOFT }, g));
        el("rect", { x: -62, y: 2, width: 119, height: 25, rx: 12.5, fill: SOFT }, g);
        return { g, x, y, s };
      });
      const wind = [[36, 104, 40], [36, 268, 46], [392, 262, 50], [172, 442, 44]].map(([x, y, w]) => ({ x, y, n: el("path", { d: `M0 0 H${w}`, stroke: SKY, "stroke-width": 3, "stroke-linecap": "round" }, svg) }));
      /* the reel at the ground end of the line */
      const reel = el("g", { transform: "translate(96 524) rotate(-18)" }, svg);
      el("rect", { x: -20, y: -19, width: 40, height: 38, fill: SKY, stroke: INK, "stroke-width": 3 }, reel);
      [-9, 0, 9].forEach((y) => el("path", { d: `M-20 ${y} H20`, stroke: INK, "stroke-width": 2 }, reel));
      el("rect", { x: -31, y: -29, width: 62, height: 11, rx: 5.5, fill: BLUE, stroke: INK, "stroke-width": 3 }, reel);
      el("rect", { x: -31, y: 18, width: 62, height: 11, rx: 5.5, fill: BLUE, stroke: INK, "stroke-width": 3 }, reel);
      const rp = rot(20, -6, -18), RX = 96 + rp[0], RY = 524 + rp[1];
      /* everything that flies */
      const fly = el("g", {}, svg);
      const tailP = el("path", { fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round" }, fly);
      let t0 = -99;
      const kite = el("g", {}, fly);
      el("polygon", { points: "0,-164 132,-30 0,198 -132,-30", fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", "stroke-linejoin": "round", class: "mg-ring" }, kite);
      el("polygon", { points: "0,-148 118,-28 0,180 -118,-28", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, kite);
      el("path", { d: "M0 -148 V180 M-118 -28 H118", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, kite);
      el("circle", { cy: -28, r: 6, fill: INK }, kite);
      button(kite, "Send a gust of wind", () => { t0 = api.now(); api.poke(); });
      const line = el("path", { fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, fly);
      const cord = el("path", { fill: "none", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, fly);
      /* the name tag tied to the kite */
      const tag = el("g", {}, fly);
      const tagBody = el("path", { fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      const tagText = txt(tag, 46, 12, "Muse Wonder", { "font-size": 34, "font-weight": 700 });
      const TW = 46 + tagText.getComputedTextLength() + 24;
      tagBody.setAttribute("d", `M-8 0 L18 -33 H${TW - 8} a8 8 0 0 1 8 8 V25 a8 8 0 0 1 -8 8 H18 Z`);
      el("circle", { cx: 20, r: 5, fill: INK }, tag);
      /* three paper bows and the label beside each */
      const bows = S.map((s, i) => {
        const g = el("g", {}, fly);
        el("path", { d: "M0 0 L-13 -27 Q0 -33 13 -27 Z M0 0 L-13 27 Q0 33 13 27 Z", fill: BOW[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { r: 5.5, fill: INK }, g);
        return g;
      });
      const labels = ["1M context", "$4.00 input", "$20.00 output"].map((s, i) => {
        const b = tail(S[i], P0[0], P0[1], 0, 0, 0, 1);
        const g = el("g", {}, fly);
        const r = el("rect", { x: 0, y: -23, height: 46, rx: 23, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const t = txt(g, 18, 10, s, { "font-size": 28, "font-weight": 700 });
        r.setAttribute("width", t.getComputedTextLength() + 36);
        return { g, x: b[0] + 46, y: b[1] - 22 };
      });
      return (t, now) => {
        const dt = now - t0, gust = dt >= 0 && dt < 2.4 ? Math.sin((Math.PI * dt) / 2.4) : 0;
        const k = oc(seg(t, 0, 1.9)), rx = -46 * (1 - k), ry = 165 * (1 - k);
        fly.setAttribute("opacity", seg(t, 0, 0.3) * (1 - seg(t, 11.5, 11.95)));
        clouds.forEach((c, i) => tf(c.g, c.x + 8 * Math.sin((t * Math.PI) / 6 + i * 2), c.y, c.s));
        wind.forEach((w, i) => { const p = (t / 2 + i * 0.27) % 1; tf(w.n, w.x + 36 * p, w.y); w.n.setAttribute("opacity", Math.sin(Math.PI * p)); });
        /* the kite rises, then sways */
        const ang = TILT + 2 * Math.sin(t * 1.3 + 1) + 3.5 * gust * Math.sin(now * 8);
        const cx = KX + rx + 3 * Math.sin(t * 1.1), cy = KY + ry + 4 * Math.sin(t * 1.7) - 10 * gust;
        kite.setAttribute("transform", `translate(${cx} ${cy}) rotate(${ang})`);
        const tip = rot(0, 180, ang), eye = rot(0, -28, ang), cor = rot(118, -28, ang);
        const ex = cx + eye[0], ey = cy + eye[1];
        line.setAttribute("d", `M${ex} ${ey} Q${(ex + RX) / 2 + 24} ${(ey + RY) / 2 + 12} ${RX} ${RY}`);
        /* the tail unrolls behind it */
        const bx = P0[0] + rx, by = P0[1] + ry, sx = cx + tip[0] - bx, sy = cy + tip[1] - by;
        const ph = 0.45 * Math.sin((Math.PI * 2 * t) / 3.4) + 0.5 * gust * Math.sin(now * 13), a = 1 + 0.25 * gust;
        const f = 0.12 + 0.88 * io(seg(t, 0.5, 2.1));
        let d = "";
        for (let i = 0; i <= 44; i++) { const p = tail((f * i) / 44, bx, by, sx, sy, ph, a); d += (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }
        tailP.setAttribute("d", d);
        /* the tag */
        const hx = cx + cor[0] + 52, hy = cy + cor[1] + 12, kt = seg(t, 1.7, 2.2);
        tag.setAttribute("transform", `translate(${hx} ${hy}) rotate(${4 + 2 * Math.sin(t * 1.5) + 4 * gust * Math.sin(now * 9)}) scale(${0.5 + 0.5 * ob(kt)}) translate(-20 0)`);
        tag.setAttribute("opacity", kt <= 0 ? 0 : 1);
        cord.setAttribute("d", `M${cx + cor[0]} ${cy + cor[1]} Q${hx - 24} ${hy + 10} ${hx} ${hy}`);
        cord.setAttribute("opacity", kt <= 0 ? 0 : 1);
        /* bows tie on one after another, each label follows its bow */
        bows.forEach((b, i) => {
          const tb = 2.6 + i * 1.5, kb = seg(t, tb, tb + 0.45);
          const p = tail(S[i], bx, by, sx, sy, ph, a), q = tail(S[i] + 0.02, bx, by, sx, sy, ph, a);
          const dir = (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
          tf(b, p[0], p[1], ob(kb), dir - 50 * (1 - oc(kb)) + 10 * gust * Math.sin(now * 11 + i));
          b.setAttribute("opacity", kb <= 0 ? 0 : 1);
        });
        labels.forEach((c, i) => {
          const kl = seg(t, 2.95 + i * 1.5, 3.35 + i * 1.5);
          tf(c.g, c.x, c.y, 0.6 + 0.4 * ob(kl));
          c.g.setAttribute("opacity", kl <= 0 ? 0 : 1);
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
