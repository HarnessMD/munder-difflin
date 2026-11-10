/* Bright coded scenes for "Claude Fable 5.2". Vanilla JS, no library.
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
  /* dashed focus ring that doubles as the tap area */
  const ring = (p, a) => el("rect", Object.assign({ rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, a), p);
  /* a two state switch; eases over half a second, snaps when motion is reduced or frozen */
  const toggle = (api) => {
    let on = false, t0 = -9;
    return {
      flip: () => { on = !on; t0 = api.now(); api.redraw(); },
      on: () => on,
      v: (now) => { const k = api.calm() ? 1 : io(cl((now - t0) / 0.5)); return on ? k : 1 - k; },
    };
  };

  /* a white mug standing on y = 0, centred on x = 0, with an optional blue lid and mint card */
  const HANDLE = "M88 -150 H108 Q142 -150 142 -116 V-94 Q142 -60 108 -60 H88";
  const mug = (p, name, o = {}) => {
    const g = el("g", {}, p);
    if (o.hit) ring(g, { x: -122, y: -330, width: 290, height: 352 });
    el("path", { d: HANDLE, fill: "none", stroke: INK, "stroke-width": 24, "stroke-linejoin": "round" }, g);
    el("path", { d: HANDLE, fill: "none", stroke: "#fff", "stroke-width": 18, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-95 -190 V-26 Q-95 0 -69 0 H69 Q95 0 95 -26 V-190 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    txt(g, 0, -118, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
    let lid = null, card = null;
    if (o.lid != null) {
      lid = el("g", {}, g);
      el("rect", { x: -24, y: -50, width: 48, height: 20, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, lid);
      el("rect", { x: -108, y: -34, width: 216, height: 36, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, lid);
      if (o.lid) txt(lid, 0, -8, o.lid, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
    }
    if (o.card != null) {
      card = el("g", {}, g);
      const r = el("rect", { y: -62, height: 62, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, card);
      let w = 150;
      if (o.card) w = txt(card, 0, -23, o.card, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }).getComputedTextLength() + 36;
      r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    }
    return { g, lid, card };
  };

  const SC = {};

  /* ---- 1. two identical mugs: one gets a safeguards lid, the other an apply for access card ---- */
  SC.mugs = {
    dur: 9, still: 7,
    build(svg, api) {
      const T = 384;
      el("rect", { x: 40, y: T, width: 720, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const all = el("g", {}, svg);
      const sa = toggle(api), sb = toggle(api);
      const A = mug(all, "Fable 5.2", { lid: "safeguards", hit: 1 }), B = mug(all, "Mythos 5.2", { card: "apply for access", hit: 1 });
      button(A.g, "Fable 5.2 mug. Press to lift or lower its safeguards lid.", sa.flip);
      button(B.g, "Mythos 5.2 mug. Press to lift or lower its apply for access card.", sb.flip);
      const br = el("path", { d: `M136 ${T + 44} V${T + 58} H682 V${T + 44}`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round", pathLength: 1, "stroke-dasharray": "1 1" }, all);
      const say = txt(all, 409, T + 114, "same underlying model", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
      return (t, now) => {
        all.setAttribute("opacity", 1 - seg(t, 8.2, 8.8));
        tf(A.g, -160 + 390 * ob(seg(t, 0.2, 1.1)), T);
        tf(B.g, 960 - 430 * ob(seg(t, 0.45, 1.35)), T);
        const d = seg(t, 1.7, 2.2), bump = Math.sin(seg(t, 2.2, 2.5) * Math.PI) * 12, la = sa.v(now);
        tf(A.lid, 0, -190 - 320 * (1 - d * d) - bump - 74 * la, 1, -7 * la);
        A.lid.setAttribute("opacity", d > 0 ? 1 : 0);
        const k = ob(seg(t, 2.8, 3.3)), lb = sb.v(now);
        tf(B.card, -12, -40 * lb, 0.6 + 0.4 * k, -2 - 2 * lb);
        B.card.setAttribute("opacity", cl(k * 3));
        const b = seg(t, 3.8, 4.5);
        br.setAttribute("stroke-dashoffset", 1 - b); br.setAttribute("opacity", b > 0 ? 1 : 0);
        say.setAttribute("opacity", seg(t, 4.3, 4.8));
      };
    },
  };

  /* ---- 2. a light menu board fills in line by line; a mint chalk underline marks one price row ---- */
  SC.menu = {
    dur: 10, still: 8,
    build(svg, api) {
      const sw = toggle(api);
      const b = el("g", {}, svg);
      ring(b, { x: 56, y: 40, width: 688, height: 524, rx: 28 });
      el("rect", { x: 70, y: 54, width: 660, height: 470, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, b);
      el("rect", { x: 88, y: 72, width: 624, height: 434, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2 }, b);
      el("rect", { x: 230, y: 518, width: 340, height: 20, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, b);
      el("rect", { x: 470, y: 504, width: 48, height: 16, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, b);
      button(b, "Menu board. Press to move the underline between the standard and fast mode prices.", sw.flip);
      const X = 116, XP = 154, MAXW = 712 - 24 - XP;
      const lines = el("g", {}, b);
      const L = [
        ["Fable 5.2", X, 156, { "font-family": MONO, "font-size": 48, "font-weight": 700, fill: BLUE }],
        ["Standard: $8 input, $40 output", XP, 262, { "font-size": 32, "font-weight": 600 }],
        ["Fast mode: $16 input, $80 output", XP, 354, { "font-size": 32, "font-weight": 600 }],
        ["per million tokens, 9 Nov 2026", X, 452, { "font-size": 24, "font-weight": 500, fill: MUTE }],
      ];
      const dots = [], N = L.map(([s, x, y, a], i) => {
        if (i === 1 || i === 2) dots[i] = el("path", { d: `M${X} ${y - 11} h22`, stroke: MINT, "stroke-width": 8, "stroke-linecap": "round" }, lines);
        return txt(lines, x, y, s, a);
      });
      const mx = Math.max(N[1].getComputedTextLength(), N[2].getComputedTextLength());
      if (mx > MAXW) [N[1], N[2]].forEach((n) => n.setAttribute("font-size", ((32 * MAXW) / mx).toFixed(2)));
      const tw = N[0].getComputedTextLength(), ws = N[1].getComputedTextLength(), wf = N[2].getComputedTextLength();
      const bu = el("path", { d: `M${X} 180 q${tw / 2} 5 ${tw} -1`, fill: "none", stroke: BLUE, "stroke-width": 6, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, lines);
      const mu = el("path", { fill: "none", stroke: MINT, "stroke-width": 10, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, lines);
      return (t, now) => {
        lines.setAttribute("opacity", 1 - seg(t, 9.3, 9.9));
        [[0.5, 1.3], [1.9, 3.0], [3.4, 4.5], [4.9, 5.7]].forEach(([a, z], i) => {
          const k = seg(t, a, z), s = L[i][0];
          N[i].textContent = s.slice(0, Math.round(s.length * k));
          if (dots[i]) dots[i].setAttribute("opacity", k > 0 ? 1 : 0);
        });
        const u = seg(t, 1.3, 1.7);
        bu.setAttribute("stroke-dashoffset", 1 - u); bu.setAttribute("opacity", u > 0 ? 1 : 0);
        const v = sw.v(now), m = Math.max(seg(t, 6.1, 6.7), sw.on() || v > 0 ? seg(t, 1.9, 3.0) : 0), y = 280 + 92 * v, w = ws + (wf - ws) * v;
        mu.setAttribute("d", `M${XP} ${y} q${w / 2} 6 ${w} 0`);
        mu.setAttribute("stroke-dashoffset", 1 - m); mu.setAttribute("opacity", m > 0 ? 1 : 0);
      };
    },
  };

  /* ---- 3. a yellow seesaw: the harder job block lands on Fable 5.2 and tips it down ---- */
  SC.seesaw = {
    dur: 9, still: 6.6,
    build(svg, api) {
      const sw = toggle(api);
      const G = 470, PX = 400, PY = 378, L = 300, H = 18;
      const A0 = ((Math.asin((G - PY) / Math.hypot(L, H)) - Math.atan2(H, L)) * 180) / Math.PI;
      el("rect", { x: 40, y: G, width: 720, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${PX} ${PY + 10} L${PX + 64} ${G + 1.5} H${PX - 64} Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const pk = el("g", {}, svg);
      el("rect", { x: -L, y: -H, width: 2 * L, height: 2 * H, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, pk);
      ["M-124 -6 h46", "M-64 7 h30", "M60 -6 h40", "M90 7 h26"].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, pk));
      el("circle", { r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, pk);
      txt(pk, -200, 8, "Opus 5.5", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      txt(pk, 200, 8, "Fable 5.2", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const tag = el("g", {}, pk);
      el("path", { d: "M0 0 V-46", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, tag);
      el("path", { d: "M-86 -44 V-96 H52 L78 -70 L52 -44 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 58, cy: -70, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, -17, -62, "start here", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const bk = el("g", {}, pk);
      ring(bk, { x: -102, y: -116, width: 204, height: 132, rx: 18 });
      el("rect", { x: -88, y: -100, width: 176, height: 100, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, bk);
      txt(bk, 0, -41, "harder job", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      button(bk, "Harder job block. Press to lift it off the Fable 5.2 end or drop it back on.", sw.flip);
      return (t, now) => {
        const up = Math.max(sw.v(now), io(seg(t, 8.0, 8.6)));
        const f = seg(t, 1.3, 1.85), p = io(seg(t, 1.85, 2.9));
        tf(pk, PX, PY, 1, -A0 + 2 * A0 * p * (1 - up));
        tf(tag, -200, -18, Math.max(0.001, ob(seg(t, 0.3, 0.8))));
        tf(bk, 200, -18 - 340 * (1 - f * f) - 150 * up, 1, -4 * up);
        bk.setAttribute("opacity", f > 0 ? 1 - seg(t, 8.3, 8.7) : 0);
      };
    },
  };

  /* ---- title card, 16 by 9: the two mugs from the first scene, small ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 4.6,
    build(svg) {
      const kg = el("g", { transform: "translate(64 54)" }, svg);
      const kr = el("rect", { x: 0, y: 0, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, kg);
      const kt = txt(kg, 20, 28, "Launch", { "font-size": 22, "font-weight": 700 });
      kr.setAttribute("width", kt.getComputedTextLength() + 40);
      const title = txt(svg, 60, 182, "Claude Fable 5.2", { "font-size": 88, "font-weight": 700 });
      el("path", { d: `M66 210 H${60 + title.getComputedTextLength() - 6}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 262, "Price, fast mode and when to pick it", { "font-size": 32, "font-weight": 500 });
      txt(svg, 64, 302, "Checked 10 Nov 2026", { "font-size": 24, "font-weight": 500, fill: MUTE });
      const T = 494;
      el("rect", { x: 40, y: T, width: 880, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const A = mug(svg, "Fable 5.2", { lid: "" }), B = mug(svg, "Mythos 5.2", { card: "" });
      tf(A.lid, 0, -190); tf(B.card, -12, 0, 1, -2);
      return (t) => {
        const out = 1 - seg(t, 5.4, 5.9);
        [[A, 170, 0.3], [B, 400, 0.6]].forEach(([m, x, s]) => { const k = oc(seg(t, s, s + 0.7)); tf(m.g, x, T + 30 * (1 - k), 0.6); m.g.setAttribute("opacity", Math.min(k, out)); });
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, fz = isNaN(fixed) ? sc.still : fixed;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(frozen ? fz : held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && !frozen) raf = requestAnimationFrame(tick); };
    const api = { now: clock, calm: () => held || frozen, redraw: tick, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(fz, 0); return; }
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
