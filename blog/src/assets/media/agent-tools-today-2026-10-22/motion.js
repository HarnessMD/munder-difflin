/* Bright coded scene for "Agent tools today, 22 Oct 2026". Vanilla JS, no library.
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

  /* ---- a stack of shared history; three agent sheets hover above, one presses down as a commit ---- */
  SC.today = {
    w: 1600, h: 1200, dur: 10, still: 9,
    build(svg, api) {
      const A = (o) => Object.assign({ stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" }, o);
      const lp = (a, b, p) => a + (b - a) * p;
      const P = (pts) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      /* stack geometry: slot 0 is the bottom layer */
      const Y0 = 970, SP = 46, TH = 34, MAX = 8, HY = 430, SS = 0.55, SX = [330, 800, 1270];
      const TINT = [MINT, SKY, YEL], SHEET = [SKY, MINT, YEL];
      /* beats, in seconds */
      const T_P0 = 4.4, T_LAND = 5.4, PRESS = 1.8, T_HOLD = 6;

      const inner = el("g", {}, svg);

      /* one slab: a top face in gentle perspective, a front edge, a word on the edge, and marks on the face */
      const slab = (p) => {
        const g = el("g", {}, p), o = { g };
        o.under = el("polygon", { fill: "#fff" }, g);
        o.top = el("polygon", A({}), g);
        o.front = el("polygon", A({}), g);
        o.word = txt(g, 0, 0, "Commit", { "font-size": 26, "font-weight": 700 });
        o.mk = el("g", {}, g);
        const S = { fill: "none", stroke: INK, "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" };
        o.s1 = el("path", Object.assign({ d: "M-230 -28 H-70" }, S), o.mk);
        o.s2 = el("path", Object.assign({ d: "M-260 22 H-130" }, S), o.mk);
        o.dot = el("circle", { cx: 10, cy: -2, r: 0, fill: INK }, o.mk);
        o.ck = el("path", Object.assign({ d: "M110 -2 L145 30 L215 -34" }, S), o.mk);
        return o;
      };
      const draw = (n, p) => { n.setAttribute("stroke-dashoffset", (1 - p).toFixed(3)); n.setAttribute("opacity", p > 0 ? 1 : 0); };
      const place = (o, { cx, cy, s, th, fill, fo, front, uo, wo, m, op }) => {
        o.g.setAttribute("opacity", op.toFixed(3));
        if (op <= 0) return;
        const bx = 300 * s, fx = 380 * s, d = 75 * s;
        const face = P([[cx - bx, cy - d], [cx + bx, cy - d], [cx + fx, cy + d], [cx - fx, cy + d]]);
        o.under.setAttribute("points", face); o.under.setAttribute("opacity", uo.toFixed(3));
        o.top.setAttribute("points", face); o.top.setAttribute("fill", fill); o.top.setAttribute("fill-opacity", fo.toFixed(3));
        o.front.setAttribute("points", P([[cx - fx, cy + d], [cx + fx, cy + d], [cx + fx, cy + d + th], [cx - fx, cy + d + th]]));
        o.front.setAttribute("fill", front); o.front.setAttribute("opacity", th > 1 ? 1 : 0);
        o.word.setAttribute("x", (cx - fx + 28).toFixed(1)); o.word.setAttribute("y", (cy + d + th / 2 + 9).toFixed(1)); o.word.setAttribute("opacity", wo.toFixed(3));
        tf(o.mk, cx.toFixed(1), cy.toFixed(1), s.toFixed(4));
        draw(o.s1, seg(m, 0, 0.3)); draw(o.s2, seg(m, 0.2, 0.5)); draw(o.ck, seg(m, 0.6, 1));
        o.dot.setAttribute("r", (14 * ob(seg(m, 0.45, 0.65))).toFixed(2));
      };

      /* the stack, its label, the three agent sheets, and a fresh sheet for each Commit press */
      const stackG = el("g", {}, inner);
      const pool = Array.from({ length: MAX }, () => slab(stackG));
      const hist = txt(inner, 800, 1140, "Shared history", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      const sheets = [0, 1, 2].map((k) => slab(inner));
      const labels = [0, 1, 2].map((k) => txt(inner, SX[k], 0, `Agent ${k + 1}`, { "text-anchor": "middle", "font-size": 38, "font-weight": 700 }));
      const fresh = slab(inner);

      /* the Commit button and its hint */
      const hint = txt(inner, 1262, 121, "Tap Commit", { "text-anchor": "end", "font-size": 30, "font-weight": 500, fill: MUTE });
      const btn = el("g", {}, inner), face = el("g", {}, btn);
      el("rect", { x: -10, y: -10, width: 250, height: 104, rx: 52, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 8", class: "mg-ring" }, face);
      el("rect", A({ width: 230, height: 84, rx: 42, fill: YEL }), face);
      txt(face, 115, 55, "Commit", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });

      /* press Commit, or Enter or Space on it: a fresh sheet comes in, gets marks, and presses down */
      let extras = 0, pending = false, kick = -99, landAt = -99;
      button(btn, "Commit: press a fresh sheet down onto the shared history", () => {
        if (calm) { extras++; api.redraw(); return; }
        if (pending) extras++;
        pending = true; kick = api.now();
        api.seek(T_HOLD);
      });

      return (t, now = 0) => {
        if (pending && now - kick >= PRESS) { extras++; pending = false; landAt = kick + PRESS; }
        if (!pending && extras && t < 4) extras = 0;
        inner.setAttribute("opacity", (oc(seg(t, 0, 0.3)) * (1 - io(seg(t, 9.4, 9.9)))).toFixed(3));

        /* the stack: history layers rise in, commits sit on top, the oldest layer drops off once the stack is full */
        const landed = t >= T_LAND, L = (landed ? 5 : 4) + extras;
        const pp = pending ? now - kick : -1, dP = pending ? io(seg(pp, 1.1, PRESS)) : 0;
        const shift = pending && L >= MAX ? dP : 0, first = Math.max(0, L - MAX);
        const dip = 8 * Math.sin(Math.PI * seg(t, T_LAND, T_LAND + 0.3)) + 8 * Math.sin(Math.PI * seg(now - landAt, 0, 0.3));
        pool.forEach((o, v) => {
          const j = first + v;
          if (j >= L) { o.g.setAttribute("opacity", 0); return; }
          const intro = j < 4 ? oc(seg(t, 0.1 + 0.12 * j, 0.55 + 0.12 * j)) : 1;
          const cy = Y0 - SP * (v - shift) + dip + 40 * (1 - intro), op = intro * (v === 0 ? 1 - shift : 1);
          if (j < 4) place(o, { cx: 800, cy, s: 1, th: TH, fill: j % 2 ? SOFT : "#DED2FF", fo: 1, front: j % 2 ? "#DCD3EE" : LIL, uo: 1, wo: 0, m: 0, op });
          else { const c = TINT[(j - 4) % 3]; place(o, { cx: 800, cy, s: 1, th: TH, fill: c, fo: 0.55, front: c, uo: 1, wo: 1, m: 1, op }); }
        });
        hist.setAttribute("opacity", io(seg(t, 0.6, 1)));

        /* the agent sheets slide in, get marks; Agent 2 presses down, the others lift away and fade */
        sheets.forEach((o, k) => {
          const pin = seg(t, 1.2 + 0.2 * k, 1.9 + 0.2 * k), m = seg(t, 2.3 + 0.35 * k, 3.3 + 0.35 * k);
          let cy = lp(-160, HY, ob(pin)) + 5 * Math.sin(t * 2.2 + k * 1.7) * seg(t, 2, 2.5), s = SS, th = 0, fo = 0.35, uo = 0, wo = 0;
          let op = seg(pin, 0, 0.25), lo = op;
          if (k === 1) {
            const d = io(seg(t, T_P0, T_LAND));
            if (landed) { op = 0; lo = 0; }
            else { cy = lp(cy, Y0 - SP * 4, d); s = lp(SS, 1, d); th = TH * seg(d, 0.7, 1); fo = lp(0.35, 0.55, d); uo = seg(d, 0.5, 1); wo = seg(d, 0.8, 1); lo = op * (1 - seg(d, 0, 0.35)); }
          } else {
            const l = io(seg(t, 4.9, 5.9));
            cy -= 70 * l; op *= 1 - 0.6 * l; lo *= 1 - 0.3 * l;
          }
          place(o, { cx: SX[k], cy, s, th, fill: SHEET[k], fo, front: SHEET[k], uo, wo, m, op });
          labels[k].setAttribute("y", (cy - 75 * s - 26).toFixed(1));
          labels[k].setAttribute("opacity", lo.toFixed(3));
        });

        /* a fresh sheet for each Commit press */
        if (pending) {
          const c = TINT[(L - 4) % 3], e = ob(seg(pp, 0, 0.5)), cy0 = lp(-160, HY, e) + 5 * Math.sin(now * 2.2);
          place(fresh, { cx: 800, cy: lp(cy0, Y0 - SP * Math.min(L, MAX - 1), dP), s: lp(SS, 1, dP), th: TH * seg(dP, 0.7, 1), fill: c, fo: lp(0.35, 0.55, dP), front: c, uo: seg(dP, 0.5, 1), wo: seg(dP, 0.8, 1), m: seg(pp, 0.45, 1.05), op: seg(pp, 0, 0.12) });
        } else fresh.g.setAttribute("opacity", 0);

        const bo = io(seg(t, 0.8, 1.2));
        btn.setAttribute("opacity", bo); hint.setAttribute("opacity", bo);
        tf(btn, 1290, 66);
        face.setAttribute("transform", `translate(115 42) scale(${(1 - 0.06 * Math.sin(Math.PI * seg(now - kick, 0, 0.2))).toFixed(3)}) translate(-115 -42)`);
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
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, redraw: () => frame() };
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
