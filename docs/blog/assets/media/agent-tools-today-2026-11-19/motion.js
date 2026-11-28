/* Bright coded scenes for "Agent Tools Today, 19 Nov 2026". Vanilla JS, no library.
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
  const SC = {};

  /* ---- a sundial: a sky shadow sweeps round from the blue pointer; the three lilac tiles turn mint as it reaches them; a tap stops the shadow and shows that tile's date ---- */
  SC.sundial = {
    dur: 9, still: 8.2,
    build(svg, api) {
      const NAMES = ["Astra", "Neon", "MAI"], DATES = ["17 Nov", "18 Nov", "17 Nov"], ANG = [-30, 95, 165];
      // the dial is seen at a slant, so its circle is an ellipse squashed by K; angles are on the dial (0 right, 90 front)
      const CX = 400, CY = 250, RX = 330, RY = 196, K = RY / RX, RT = 205, DEPTH = 24;
      // the shadow grows from the pointer, sweeps from A0 to A1 degrees between S0 and S1, rests, then folds away before the loop
      const DUR = 9, STILL = 8.2, S0 = 1.6, S1 = 7.4, A0 = -70, A1 = 215, DEC = 0.6;
      const TW = 140, TH = 60, FS = 36;
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ob = (x) => 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
      const rad = (d) => (d * Math.PI) / 180;
      const P = (r, d) => [CX + r * Math.cos(rad(d)), CY + r * K * Math.sin(rad(d))];
      const f1 = (v) => v.toFixed(1);
      const LINE = { stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" };
      // the stand: a soft ground shadow, a soft column and plinth, then the yellow dial with its rim, ring and hour ticks
      const stand = el("g", {}, svg);
      el("ellipse", { cx: CX, cy: 554, rx: 196, ry: 12, fill: SOFT }, stand);
      el("rect", Object.assign({ x: 340, y: 440, width: 120, height: 90, fill: SOFT }, LINE), stand);
      [372, 400, 428].forEach((x) => el("path", { d: `M${x} 480 V514`, stroke: LIL, "stroke-width": 4, "stroke-linecap": "round" }, stand));
      el("rect", Object.assign({ x: 290, y: 522, width: 220, height: 30, rx: 10, fill: SOFT }, LINE), stand);
      el("path", Object.assign({ d: `M${CX - RX} ${CY} V${CY + DEPTH} A${RX} ${RY} 0 0 0 ${CX + RX} ${CY + DEPTH} V${CY} Z`, fill: YEL }, LINE), stand);
      el("ellipse", Object.assign({ cx: CX, cy: CY, rx: RX, ry: RY, fill: YEL }, LINE), stand);
      const [hx0, hy0] = P(316, 196), [hx1, hy1] = P(316, 236);
      el("path", { d: `M${f1(hx0)} ${f1(hy0)} A316 ${f1(316 * K)} 0 0 1 ${f1(hx1)} ${f1(hy1)}`, fill: "none", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round" }, stand);
      el("ellipse", { cx: CX, cy: CY, rx: 296, ry: f1(296 * K), fill: "none", stroke: INK, "stroke-width": 2.5 }, stand);
      for (let k = 0; k < 12; k++) {
        const [x0, y0] = P(296, k * 30), [x1, y1] = P(k % 3 ? 308 : 318, k * 30);
        el("path", { d: `M${f1(x0)} ${f1(y0)} L${f1(x1)} ${f1(y1)}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, stand);
      }
      // the sky shadow lies flat on the dial, starting at the foot of the pointer
      const shadow = el("path", { d: "M0 -24 L262 -7 Q276 0 262 7 L0 24 A24 24 0 0 1 0 -24 Z", fill: SKY }, svg);
      // the blue pointer (gnomon): a fin standing on the centre, with its thin back edge showing
      const gno = el("g", {}, svg);
      el("path", Object.assign({ d: `M${CX} ${CY - 115} L${CX + 8} ${CY - 108} L${CX + 8} ${CY + 4} L${CX} ${CY} Z`, fill: BLUE }, LINE), gno);
      el("path", Object.assign({ d: `M${CX} ${CY} L${CX - 105} ${CY} L${CX} ${CY - 115} Z`, fill: BLUE }, LINE), gno);
      el("path", { d: "M315 241 L390 159", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.75 }, gno);
      // three raised lilac tiles; each has a mint face that shows when the shadow reaches it, and a dashed focus ring
      let tap = () => {};
      const R = { x: -TW / 2, width: TW, height: TH, rx: 14, stroke: INK, "stroke-width": 3 };
      const tiles = NAMES.map((w, i) => {
        const [x, y] = P(RT, ANG[i]), g = el("g", {}, svg);
        el("rect", Object.assign({ y: -TH / 2 + 6, fill: LIL }, R), g);
        const mintD = el("rect", Object.assign({ y: -TH / 2 + 6, fill: MINT, opacity: 0 }, R), g);
        el("rect", Object.assign({ y: -TH / 2, fill: LIL }, R), g);
        const mintF = el("rect", Object.assign({ y: -TH / 2, fill: MINT, opacity: 0 }, R), g);
        el("path", { d: `M${-TW / 2 + 16} ${-TH / 2 + 9} H${-TW / 2 + 52}`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.75 }, g);
        el("rect", { x: -TW / 2 - 9, y: -TH / 2 - 9, width: TW + 18, height: TH + 24, rx: 20, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, g);
        button(g, `${w}: stop the shadow and show ${DATES[i]}`, () => tap(i));
        g.setAttribute("aria-pressed", "false");
        return { g, mintD, mintF, x, y };
      });
      // the words and date tags float above everything; taps pass through them to the tile
      const labels = el("g", { "pointer-events": "none" }, svg);
      const MW = { "text-anchor": "middle", "font-family": MONO, "font-size": FS, "font-weight": 700 };
      const TAGP = "M-44 -46 H44 Q56 -46 56 -34 V-20 Q56 -8 44 -8 H9 L0 1 L-9 -8 H-44 Q-56 -8 -56 -20 V-34 Q-56 -46 -44 -46 Z";
      tiles.forEach((b, i) => {
        const lab = el("g", {}, labels), word = el("g", {}, lab), halo = el("g", { opacity: 0 }, word);
        txt(halo, 0, 13, NAMES[i], Object.assign({}, MW, { fill: "#fff", stroke: "#fff", "stroke-width": 10, "stroke-linejoin": "round" }));
        txt(word, 0, 13, NAMES[i], MW);
        const tag = el("g", { opacity: 0 }, lab);
        el("path", { d: TAGP, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tag);
        const tagText = txt(tag, 0, -19, DATES[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
        Object.assign(b, { lab, word, halo, tag, tagText });
      });
      // a tap stops the shadow (it slows over 0.6 s) and shows that tile's date; the same tile again sets it moving
      let user = null, fade = null, woff = 0, lastT = STILL, lastRaw = 0, done = false;
      const C = [0, 0, 0];
      const stopT = (now) => { if (calm) return user.tc; const s = cl(now - user.t0, 0, DEC); return user.tc + s - (s * s) / (2 * DEC); };
      tap = (n) => {
        const now = api.now(); done = true;
        if (user && user.sel === n) { woff = stopT(now) - lastRaw; fade = { sel: n, t0: now, from: C[n] }; user = null; }
        else if (user) { fade = { sel: user.sel, t0: now, from: C[user.sel] }; user = Object.assign({}, user, { sel: n, cs: now, cd: 0.1 }); }
        else user = { sel: n, tc: lastT, t0: now, cs: now, cd: 0.25 };
        tiles.forEach((b, i) => b.g.setAttribute("aria-pressed", String(!!user && user.sel === i)));
        api.poke();
      };
      const sweep = (T) => { const p = seg(T, S0, S1); return A0 + (A1 - A0) * (0.35 * p + (0.65 * (1 - Math.cos(Math.PI * p))) / 2); };
      return (t, now) => {
        let T = user ? stopT(now) : calm ? STILL : t + woff;
        T = ((T % DUR) + DUR) % DUR;
        if (T > 2.2) done = true;
        lastT = T; lastRaw = t;
        // the entrance plays once: stand, then pointer, then tiles 100 ms apart, then the words land last
        const E = done ? 99 : T, s0 = seg(E, 0, 0.6), g0 = seg(E, 0.4, 0.9);
        stand.setAttribute("transform", `translate(${CX} 552) scale(${(0.86 + 0.14 * ob(s0)).toFixed(4)}) translate(${-CX} -552)`);
        stand.setAttribute("opacity", oc(seg(E, 0, 0.25)).toFixed(3));
        gno.setAttribute("transform", `translate(0 ${CY}) scale(1 ${Math.max(0.001, ob(g0)).toFixed(4)}) translate(0 ${-CY})`);
        gno.setAttribute("opacity", g0 > 0 ? 1 : 0);
        const th = sweep(T), L = oc(seg(T, 1.45, 1.95)) * (1 - io(seg(T, 8.45, 8.95))), back = 1 - io(seg(T, 8.4, 8.9));
        shadow.setAttribute("transform", `translate(${CX} ${CY}) scale(1 ${K.toFixed(4)}) rotate(${th.toFixed(2)}) scale(${Math.max(0.001, L).toFixed(4)} 1)`);
        shadow.setAttribute("opacity", L > 0.005 ? 1 : 0);
        tiles.forEach((b, i) => {
          const a = ANG[i], d = seg(E, 0.7 + 0.1 * i, 1.15 + 0.1 * i), w = seg(E, 1 + 0.1 * i, 1.4 + 0.1 * i);
          const m = oc(seg(th, a - 10, a + 4)) * back, pop = 0.08 * Math.sin(Math.PI * seg(th, a - 10, a + 24)) * back;
          let c = 0;
          if (user && user.sel === i) c = calm ? 1 : seg(now - user.cs, user.cd, user.cd + 0.4);
          else if (fade && fade.sel === i) c = calm ? 0 : fade.from * (1 - seg(now - fade.t0, 0, 0.25));
          C[i] = c;
          const at = `translate(${f1(b.x)} ${f1(b.y - 26 * (1 - ob(d)))}) scale(${(1 + pop).toFixed(4)})`;
          b.g.setAttribute("transform", at);
          b.g.setAttribute("opacity", oc(cl(d * 2.5)).toFixed(3));
          b.mintD.setAttribute("opacity", m.toFixed(3));
          b.mintF.setAttribute("opacity", m.toFixed(3));
          b.lab.setAttribute("transform", at);
          b.word.setAttribute("transform", `scale(${((0.5 + 0.5 * ob(w)) * (1 + 0.06 * m)).toFixed(4)})`);
          b.word.setAttribute("opacity", oc(cl(w * 2)).toFixed(3));
          b.halo.setAttribute("opacity", m.toFixed(3));
          b.tag.setAttribute("opacity", oc(cl(c * 2)).toFixed(3));
          b.tag.setAttribute("transform", `translate(0 ${-TH / 2 - 6}) scale(${(0.5 + 0.5 * ob(c)).toFixed(4)})`);
          b.tagText.setAttribute("opacity", oc(seg(c, 0.35, 1)).toFixed(3));
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
