/* Bright coded scenes for "Agent tools today, 19 Oct 2026". Vanilla JS, no library.
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

  /* ---- a drawbridge: a git push parcel waits, Sphinx asks one question, the answer lowers the bridge ---- */
  SC.today = {
    w: 1600, h: 1200, dur: 10, still: 7.7,
    build(svg, api) {
      const SW = 4, TAU = Math.PI * 2;
      const A = (o) => Object.assign({ stroke: INK, "stroke-width": SW, "stroke-linejoin": "round", "stroke-linecap": "round" }, o);
      const GY = 880, GL = 590, GR = 1010, LEAF = 432, CX = 800;
      const T_ANS = 4.2, T_B0 = 4.8, T_B1 = 6.1, T_R0 = 6.7, T_R1 = 8.7;
      const XS = -200, X0 = 330, X1 = 1350, WR = 29, RA = 76;

      /* sky: a sun and two clouds */
      const sun = el("g", {}, svg);
      el("circle", A({ r: 50, fill: YEL }), sun);
      for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; el("path", A({ d: `M${70 * Math.cos(a)} ${70 * Math.sin(a)} L${92 * Math.cos(a)} ${92 * Math.sin(a)}`, fill: "none" }), sun); }
      const clouds = [[190, 490, 0, 1], [610, 470, 4, 0.85], [1430, 150, 2, 1]].map(([x, y, k, z]) => {
        const g = el("g", {}, svg), m = (v) => (v * z).toFixed(1);
        el("path", A({ d: `M${m(-96)} ${m(34)} A${m(30)} ${m(30)} 0 0 1 ${m(-70)} ${m(-14)} A${m(44)} ${m(44)} 0 0 1 ${m(4)} ${m(-40)} A${m(40)} ${m(40)} 0 0 1 ${m(72)} ${m(-6)} A${m(22)} ${m(22)} 0 0 1 ${m(96)} ${m(34)} Z`, fill: SOFT }), g);
        return { g, x, y, k };
      });

      /* the moat under the gap */
      const water = el("path", A({ fill: SKY }), svg);

      /* two banks with a strip of grass and a few stones */
      [[60, GL], [GR, 1540]].forEach(([a, b]) => {
        el("path", A({ d: `M${a} ${GY} H${b} V1120 Q${b} 1140 ${b - 20} 1140 H${a + 20} Q${a} 1140 ${a} 1120 Z`, fill: SOFT }), svg);
        el("rect", A({ x: a, y: GY, width: b - a, height: 30, fill: MINT }), svg);
      });
      [[110, 960, 96], [250, 1050, 120], [420, 975, 84], [470, 1062, 74], [1090, 990, 90], [1250, 1060, 120], [1400, 970, 96]].forEach(([x, y, w]) =>
        el("rect", A({ x, y, width: w, height: 44, rx: 20, fill: LIL }), svg));

      /* the tower that winds the chain */
      const PYX = 1060, PYY = 440;
      el("rect", A({ x: PYX - 22, y: PYY, width: 44, height: GY - PYY, rx: 10, fill: LIL }), svg);
      const chain = el("path", A({ fill: "none", "stroke-dasharray": "14 9" }), svg);
      const pulley = el("g", {}, svg);
      el("circle", A({ r: 26, fill: YEL }), pulley);
      el("path", A({ d: "M-14 0 H14 M0 -14 V14", fill: "none" }), pulley);
      tf(pulley, PYX, PYY);

      /* the bridge leaf, hinged on the far bank */
      const leaf = el("g", {}, svg);
      el("rect", A({ x: -LEAF, y: 0, width: LEAF, height: 34, rx: 8, fill: BLUE }), leaf);
      for (let x = -LEAF + 54; x < 0; x += 54) el("path", A({ d: `M${x} 0 V34`, fill: "none" }), leaf);
      el("circle", A({ cx: GR, cy: GY + 17, r: 13, fill: YEL }), svg);

      /* the flag on the far side */
      const FX = 1522, FY0 = 470, FY1 = 580, FX1 = 1250;
      el("rect", A({ x: FX - 8, y: 456, width: 16, height: GY - 456, rx: 6, fill: SOFT }), svg);
      el("circle", A({ cx: FX, cy: 446, r: 16, fill: YEL }), svg);
      const cloth = el("path", A({ fill: MINT }), svg);
      txt(svg, (FX - 8 + FX1) / 2, 537, "origin/main", { "text-anchor": "middle", "font-family": MONO, "font-size": 32, "font-weight": 700 });

      /* dust where the leaf lands */
      const dust = [[548, 866], [596, 852], [640, 868]].map(([x, y]) => ({ c: el("circle", A({ cx: x, cy: y, r: 0, fill: SOFT, opacity: 0 }), svg) }));

      /* the parcel on two wheels */
      const parcel = el("g", {}, svg);
      const speed = [0, 1, 2].map(() => el("path", A({ fill: "none", opacity: 0 }), parcel));
      const body = el("g", {}, parcel);
      el("rect", A({ x: -148, y: -270, width: 296, height: 212, rx: 16, fill: YEL }), body);
      el("path", A({ d: "M-148 -224 H148", fill: "none" }), body);
      el("rect", A({ x: -24, y: -270, width: 48, height: 46, fill: BLUE }), body);
      el("rect", A({ x: -118, y: -192, width: 236, height: 88, rx: 14, fill: SOFT }), body);
      txt(body, 0, -134, "git push", { "text-anchor": "middle", "font-family": MONO, "font-size": 40, "font-weight": 700 });
      const wheels = [-88, 88].map((x) => {
        const w = el("g", {}, parcel);
        el("circle", A({ r: WR, fill: SOFT }), w);
        el("path", A({ d: "M-17 0 H17 M0 -17 V17", fill: "none" }), w);
        return { w, x };
      });

      /* sparkles when the parcel arrives */
      const sparks = [[1166, 560, YEL], [1140, 700, LIL], [1385, 408, SKY]].map(([x, y, c], i) => {
        const g = el("g", { opacity: 0 }, svg);
        el("path", A({ d: "M0 -26 Q0 0 26 0 Q0 0 0 26 Q0 0 -26 0 Q0 0 0 -26 Z", fill: c }), g);
        return { g, x, y, i };
      });

      /* the question card from Sphinx: tap it, or press Enter or Space, to answer */
      const card = el("g", { opacity: 0 }, svg);
      const cin = el("g", {}, card);
      el("rect", { x: 284, y: 66, width: 1032, height: 330, rx: 40, fill: "none", stroke: BLUE, "stroke-width": SW, class: "mg-ring" }, cin);
      el("rect", A({ x: 300, y: 82, width: 1000, height: 298, rx: 28, fill: SOFT }), cin);
      el("rect", A({ x: 334, y: 110, width: 170, height: 56, rx: 28, fill: LIL }), cin);
      txt(cin, 419, 149, "Sphinx", { "text-anchor": "middle", "font-family": MONO, "font-size": 32, "font-weight": 700 });
      txt(cin, CX, 252, "What happens on the retry?", { "text-anchor": "middle", "font-size": 58, "font-weight": 700 });
      const slot = el("rect", A({ x: -160, y: -32, width: 320, height: 64, rx: 32, fill: "none", stroke: MUTE, "stroke-dasharray": "12 12" }), cin);
      const pill = el("g", { opacity: 0 }, cin);
      el("rect", A({ x: -158, y: -32, width: 316, height: 64, rx: 32, fill: MINT }), pill);
      el("circle", A({ cx: -118, cy: 0, r: 20, fill: SOFT }), pill);
      const chk = el("path", A({ d: "M-128 0 L-120 8 L-106 -8", fill: "none", "stroke-dasharray": 40, "stroke-dashoffset": 40 }), pill);
      txt(pill, -86, 12, "Understood", { "font-size": 34, "font-weight": 700 });

      let last = 0, lastNow = -99, kick = -99;
      button(card, "Answer the question and lower the bridge", () => {
        const playing = api.now() - lastNow < 0.25;
        kick = api.now();
        if (!playing || last < T_ANS || last > T_R1) api.seek(T_ANS);
      });

      return (t, now = 0) => {
        last = t; lastNow = now;
        const out = 1 - io(seg(t, 9.4, 9.85));

        /* sky and water move gently, in step with the loop */
        tf(sun, 170, 190, 1, t * 4.5);
        clouds.forEach((c) => tf(c.g, c.x + 12 * Math.sin((TAU * t) / 10 + c.k), c.y));
        let d = `M${GL - 6} 1140`;
        for (let x = GL - 6; x <= GR + 6; x += 12) d += ` L${x} ${(1016 + 7 * Math.sin(x / 34 - (TAU * t * 4) / 10)).toFixed(1)}`;
        water.setAttribute("d", d + ` L${GR + 6} 1140 Z`);

        /* the bridge: up, then a drop with a small bounce, then back up for the next loop */
        let th = RA;
        if (t >= T_B0 && t < T_B1) { const p = seg(t, T_B0, T_B1); th = RA * (1 - p * p); }
        else if (t >= T_B1 && t < 9.3) { const u = t - T_B1; th = 6 * Math.abs(Math.sin(u * 9)) * Math.exp(-u * 6); }
        else if (t >= 9.3) th = RA * io(seg(t, 9.3, 10));
        leaf.setAttribute("transform", `translate(${GR} ${GY}) rotate(${th})`);
        const r = (th * Math.PI) / 180, tx = GR - LEAF * Math.cos(r), ty = GY - LEAF * Math.sin(r);
        chain.setAttribute("d", `M${PYX} ${PYY} L${tx.toFixed(1)} ${ty.toFixed(1)}`);
        tf(pulley, PYX, PYY, 1, th * 4);
        dust.forEach((k, i) => {
          const p = seg(t, T_B1 + i * 0.05, T_B1 + 0.6 + i * 0.05);
          k.c.setAttribute("r", (20 * Math.sin(Math.PI * p)).toFixed(1));
          k.c.setAttribute("opacity", p > 0 && p < 1 ? 1 : 0);
        });

        /* the flag waves */
        const a = 7 * Math.sin((TAU * t * 8) / 10) + 5 * seg(t, T_R1, 9) * Math.sin((TAU * t * 16) / 10) * out;
        const x0 = FX - 8, w3 = (FX1 - x0) / 3;
        cloth.setAttribute("d", `M${x0} ${FY0} C${x0 + w3} ${FY0 - a} ${x0 + 2 * w3} ${FY0 + a} ${FX1} ${FY0} L${FX1} ${FY1} C${x0 + 2 * w3} ${FY1 + a} ${x0 + w3} ${FY1 - a} ${x0} ${FY1} Z`);

        /* the parcel rolls in, waits with small hops, then crosses */
        const pin = seg(t, 0, 1), pr = seg(t, T_R0, T_R1);
        const px = t < T_R0 ? XS + (X0 - XS) * oc(pin) : X0 + (X1 - X0) * io(pr);
        let tilt = 0, hop = 0;
        if (t < 1) tilt = 5 * Math.sin(Math.PI * pin);
        else if (t < T_R0) { const u = t - 1; tilt = 3 * Math.sin(u * 12) * Math.exp(-u * 5); }
        else if (t < T_R1) tilt = -5 * Math.sin(TAU * pr);
        else { const u = t - T_R1; tilt = 4 * Math.sin(u * 12) * Math.exp(-u * 5); }
        if (t > 1.8 && t < T_B0) hop = 14 * Math.sin(Math.PI * seg(((t - 1.8) % 0.8) / 0.8, 0, 0.3));
        [GL - 12, GR].forEach((s) => wheels.forEach((w) => { hop += 5 * Math.exp(-Math.pow((px + w.x - s) / 14, 2)); }));
        tf(parcel, px, GY - hop);
        body.setAttribute("transform", `rotate(${tilt.toFixed(2)} 0 -58)`);
        wheels.forEach((w) => tf(w.w, w.x, -WR, 1, ((px - XS) / WR) * (180 / Math.PI)));
        parcel.setAttribute("opacity", out);
        const v = t >= T_R0 && t < T_R1 ? Math.sin(Math.PI * pr) : 0;
        speed.forEach((n, i) => {
          const y = [-118, -170, -222][i], x = -172 - i * 10, len = 70 * v;
          n.setAttribute("d", `M${x} ${y} H${(x - len).toFixed(1)}`);
          n.setAttribute("opacity", v > 0.3 ? 1 : 0);
        });

        sparks.forEach((s) => {
          const p = seg(t, T_R1 + s.i * 0.12, T_R1 + 0.3 + s.i * 0.12);
          tf(s.g, s.x, s.y, ob(p) * out * (0.9 + 0.1 * Math.sin(t * 6 + s.i)), 12 * Math.sin(t * 2 + s.i));
          s.g.setAttribute("opacity", p > 0 ? 1 : 0);
        });

        /* the card drops in, bobs, takes the answer */
        const pc = seg(t, 1, 1.6), lt = now - kick, sq = lt >= 0 && lt < 0.35 ? Math.sin((Math.PI * lt) / 0.35) : 0;
        const cs = (0.7 + 0.3 * ob(pc)) * (1 - 0.03 * sq), by = 5 * Math.sin((TAU * t * 4) / 10);
        card.setAttribute("transform", `translate(${CX} ${231 + by}) scale(${cs}) translate(${-CX} -231)`);
        card.setAttribute("opacity", (pc > 0 ? Math.min(1, pc * 3) : 0) * out);
        const ps = seg(t, T_ANS, T_ANS + 0.4);
        const pulse = 1 + 0.04 * Math.max(0, Math.sin((TAU * t * 8) / 10));
        slot.setAttribute("transform", `translate(${CX} 322) scale(${ps > 0 ? 1 : pulse})`);
        slot.setAttribute("opacity", ps > 0 ? 0 : 1);
        pill.setAttribute("transform", `translate(${CX} 322) scale(${cl(ob(ps), 0, 1.2)})`);
        pill.setAttribute("opacity", ps > 0 ? 1 : 0);
        chk.setAttribute("stroke-dashoffset", (40 * (1 - seg(t, T_ANS + 0.25, T_ANS + 0.55))).toFixed(1));
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
