/* Bright coded scene for "Agent tools today, 23 Oct 2026". Vanilla JS, no library.
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

  /* ---- an agent in a sandbox sends three requests to a policy gate; two pass, one waits for review ---- */
  SC.today = {
    w: 1600, h: 1200, dur: 10, still: 9,
    build(svg, api) {
      const A = (o) => Object.assign({ stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" }, o);
      const lp = (a, b, p) => a + (b - a) * p;
      const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
      const mix = (a, b, p) => { const x = hx(a), y = hx(b); return "#" + x.map((v, i) => Math.round(lp(v, y[i], p)).toString(16).padStart(2, "0")).join(""); };
      /* geometry */
      const AX = 270, AY = 610, GX = 910, GW = 60, WX = 720, PX = 1240, TX = 1470, DH = 100;
      const LANE = [450, 610, 770], NAME = ["File", "Package site", "New host"];
      /* beats, in seconds: each request leaves the agent, reaches the gate, and (for the first two) passes */
      const OUT = [1.0, 2.0, 3.0], T_HOLD = 6;

      const inner = el("g", {}, svg);

      /* the sandbox and the agent */
      const box = el("g", {}, inner);
      el("rect", A({ x: 70, y: 250, width: 400, height: 720, rx: 32, fill: SOFT }), box);
      txt(box, AX, 334, "Sandbox", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
      el("rect", A({ x: AX - 80, y: AY - 80, width: 160, height: 160, rx: 22, fill: BLUE }), box);
      txt(box, AX, AY + 12, "Agent", { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });

      /* the Policy gate: lilac posts with a door in each lane */
      const gate = el("g", {}, inner);
      txt(gate, GX, 336, "Policy", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
      el("rect", A({ x: GX - GW / 2, y: 360, width: GW, height: 500, rx: 14, fill: LIL }), gate);
      const doors = LANE.map((y) => {
        el("rect", { x: GX - GW / 2 + 2, y: y - DH / 2, width: GW - 4, height: DH, fill: "#fff" }, gate);
        return el("rect", A({ x: GX - GW / 2, y: y - DH / 2, width: GW, height: DH, rx: 8, fill: SOFT, "stroke-width": 3 }), gate);
      });

      /* the three request cards, each with a tick; a key for Package site; a label for New host */
      const cards = NAME.map((s) => {
        const g = el("g", {}, inner);
        el("rect", A({ x: -140, y: -42, width: 280, height: 84, rx: 20, fill: SKY }), g);
        txt(g, 0, 11, s, { "text-anchor": "middle", "font-size": 31, "font-weight": 700 });
        return g;
      });
      const ticks = LANE.map((y) => {
        const g = el("g", {}, inner);
        el("circle", A({ cx: 0, cy: 0, r: 34, fill: MINT }), g);
        const p = el("path", { d: "M-15 1 L-4 13 L16 -12", fill: "none", stroke: INK, "stroke-width": 7, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" }, g);
        return { g, p, y };
      });
      const key = el("g", {}, inner);
      el("circle", A({ cx: 0, cy: 0, r: 30, fill: LIL }), key);
      el("circle", A({ cx: -9, cy: 0, r: 9, fill: "#fff", "stroke-width": 3.5 }), key);
      el("path", A({ d: "M0 0 H17 M10 0 V8 M17 0 V9", fill: "none", "stroke-width": 3.5 }), key);
      const wait = el("g", {}, inner);
      const waitBg = el("rect", A({ x: -155, y: -28, width: 310, height: 56, rx: 28, fill: YEL, "stroke-width": 3 }), wait);
      txt(wait, 0, 10, "Waiting for review", { "text-anchor": "middle", "font-size": 28, "font-weight": 600 });

      /* the Approve button and its hint */
      const hint = txt(inner, 1262, 121, "Tap Approve", { "text-anchor": "end", "font-size": 30, "font-weight": 500, fill: MUTE });
      const btn = el("g", {}, inner), face = el("g", {}, btn);
      el("rect", { x: -10, y: -10, width: 250, height: 104, rx: 52, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 8", class: "mg-ring" }, face);
      el("rect", A({ width: 230, height: 84, rx: 42, fill: BLUE }), face);
      txt(face, 115, 55, "Approve", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });

      /* press Approve, or Enter or Space on it: the label turns mint and New host goes through */
      let approved = false, at = -99;
      button(btn, "Approve: let the New host request through the policy gate", () => {
        if (approved) return;
        approved = true;
        if (calm) { at = -99; api.redraw(); return; }
        at = api.now();
        api.seek(T_HOLD);
      });

      return (t, now = 0) => {
        if (approved && !calm && t < 4) approved = false;
        const pa = approved ? (calm ? 9 : now - at) : -1;
        inner.setAttribute("opacity", (oc(seg(t, 0, 0.3)) * (1 - io(seg(t, 9.4, 9.9)))).toFixed(3));
        box.setAttribute("opacity", io(seg(t, 0.1, 0.6)).toFixed(3));
        gate.setAttribute("opacity", io(seg(t, 0.3, 0.8)).toFixed(3));

        cards.forEach((g, k) => {
          const t0 = OUT[k], y = LANE[k];
          const go = oc(seg(t, t0, t0 + 1));
          /* pass: 0 waiting at the gate, 1 through it */
          let open, pass, tk;
          if (k < 2) {
            open = seg(t, t0 + 1.4, t0 + 1.7) * (1 - seg(t, t0 + 2.4, t0 + 2.7));
            pass = io(seg(t, t0 + 1.6, t0 + 2.4));
            tk = seg(t, t0 + 2.4, t0 + 2.9);
          } else {
            open = pa < 0 ? 0 : seg(pa, 0.3, 0.6) * (1 - seg(pa, 1.3, 1.6));
            pass = pa < 0 ? 0 : io(seg(pa, 0.5, 1.3));
            tk = pa < 0 ? 0 : seg(pa, 1.3, 1.8);
          }
          const x = pass > 0 ? lp(WX, PX, pass) : lp(AX, WX, go), cy = pass > 0 ? y : lp(AY, y, oc(seg(t, t0, t0 + 1)));
          const s = lp(0.3, 1, oc(seg(t, t0, t0 + 0.6)));
          tf(g, x.toFixed(1), cy.toFixed(1), s.toFixed(3));
          g.setAttribute("opacity", seg(t, t0, t0 + 0.15).toFixed(3));
          doors[k].setAttribute("height", (DH * (1 - open)).toFixed(1));
          doors[k].setAttribute("opacity", open > 0.97 ? 0 : 1);
          const T = ticks[k];
          tf(T.g, TX, T.y, ob(seg(tk, 0, 0.5)).toFixed(3));
          T.g.setAttribute("opacity", tk > 0 ? 1 : 0);
          T.p.setAttribute("stroke-dashoffset", (1 - seg(tk, 0.3, 1)).toFixed(3));
        });

        /* the key attaches to Package site once it is through */
        const kp = seg(t, 4.7, 5.2);
        tf(key, PX + 140, LANE[1] - 42, ob(kp).toFixed(3), -20 * (1 - kp));
        key.setAttribute("opacity", kp > 0 ? 1 : 0);

        /* New host waits at the gate with a yellow label; Approve turns it mint */
        const wp = seg(t, 4.6, 5.1);
        tf(wait, WX - 15, LANE[2] + 86, ob(wp).toFixed(3));
        wait.setAttribute("opacity", wp > 0 ? 1 : 0);
        waitBg.setAttribute("fill", mix(YEL, MINT, pa < 0 ? 0 : seg(pa, 0, 0.3)));

        const bo = io(seg(t, 0.8, 1.2));
        btn.setAttribute("opacity", bo); hint.setAttribute("opacity", bo);
        tf(btn, 1290, 66);
        face.setAttribute("transform", `translate(115 42) scale(${(1 - 0.06 * Math.sin(Math.PI * seg(now - at, 0, 0.2))).toFixed(3)}) translate(-115 -42)`);
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
