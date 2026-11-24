/* Bright coded scenes for "What is Claude Ship?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", WHITE = "#fff";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const lab = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 22, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const back = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const ob = (x) => back(x);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const land = (x) => (x < 0.8 ? io(x / 0.8) : 1 - 0.035 * Math.sin((Math.PI * (x - 0.8)) / 0.2));
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  // entrance pose: k runs 0 to 1 (a little past 1 for an overshoot), scaled about cx,cy and slid in by dx,dy
  const S = (n, k, cx, cy, dy = 0, s0 = 1, dx = 0) => {
    const s = s0 + (1 - s0) * k;
    n.setAttribute("opacity", cl(k * 1.5));
    n.setAttribute("transform", `translate(${cx + dx * (1 - k)} ${cy + dy * (1 - k)}) scale(${s}) translate(${-cx} ${-cy})`);
  };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (g, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: WHITE, "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 7" }, g);
  const hint = (svg, api, s) => api.live && txt(svg, 770, 50, s, { "text-anchor": "end", "font-size": 17, "font-weight": 500, fill: MUTE });
  const water = (p, y, h, fill) => el("rect", { x: 30, y, width: 740, height: h, rx: 28, fill, stroke: INK, "stroke-width": 3 }, p);
  const waves = (p, pts, col = WHITE) => pts.map(([x, y]) => el("path", { d: `M${x} ${y} q12 -9 24 0 t24 0`, stroke: col, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, p));
  const drift = (ws, t) => ws.forEach((w, i) => w.setAttribute("transform", `translate(${7 * Math.sin(t * 0.9 + i * 1.7)} 0)`));

  /* ---- shared drawings, each around its waterline centre ---- */
  const tug = (p, col) => { // bow to the right, with a soft fender for pushing
    const g = el("g", {}, p), w = { stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" };
    el("rect", Object.assign({ x: -27, y: -82, width: 15, height: 26, rx: 3, fill: col }, w), g);
    el("rect", { x: -27, y: -82, width: 15, height: 8, rx: 2, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
    el("rect", Object.assign({ x: -40, y: -58, width: 52, height: 40, rx: 6, fill: col }, w), g);
    [-32, -12].forEach((x) => el("rect", { x, y: -50, width: 13, height: 13, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g));
    el("path", Object.assign({ d: "M-60 -20 H48 Q60 -20 62 -12 L54 6 Q51 14 42 14 H-48 Q-57 14 -59 6 Z", fill: col }, w), g);
    el("path", { d: "M-56 -4 H56", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
    el("rect", { x: 56, y: -22, width: 12, height: 26, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
    return g;
  };
  const buoy = (p, pole) => { // a yellow can buoy with a soft white pole
    const g = el("g", {}, p);
    el("rect", { x: -4, y: -58 - pole, width: 8, height: pole, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
    el("circle", { cx: 0, cy: -64 - pole, r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
    el("path", { d: "M-46 4 Q-48 -44 -18 -60 H18 Q48 -44 46 4 Q0 20 -46 4 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-43 -20 Q0 -10 43 -20", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. a tugboat nudges the parcel past three harbour markers to the dock ---- */
  SC.tugboat = {
    dur: 9, still: 9,
    build(root, api) {
      const svg = el("g", { transform: "translate(0 -40)" }, root);
      const WL = 455, X0 = 250, X1 = 574, T0 = 1.9, T1 = 6.9, E = 0.5, MX = [300, 430, 560], NAMES = ["Review", "Fixes", "Approval"];
      const sea = el("g", {}, svg); water(sea, 300, 230, SKY);
      const wv = waves(sea, [[90, 350], [180, 506], [460, 512], [620, 508], [700, 350]]);
      const marks = MX.map((x, i) => {
        const body = el("g", {}, svg);
        el("ellipse", { cx: x, cy: 330, rx: 26, ry: 7, fill: MINT, stroke: INK, "stroke-width": 2.5 }, body);
        el("path", { d: `M${x - 18} 330 L${x - 11} 234 H${x + 11} L${x + 18} 330 Z`, fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        el("path", { d: `M${x - 15} 290 H${x + 15}`, stroke: INK, "stroke-width": 2.5 }, body);
        el("rect", { x: x - 15, y: 206, width: 30, height: 28, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, body);
        el("path", { d: `M${x - 19} 206 L${x} 190 L${x + 19} 206 Z`, fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, body);
        const rays = el("g", {}, body);
        [[-1, 0, 24, 36], [1, 0, 24, 36], [-0.7, -0.7, 30, 42], [0.7, -0.7, 30, 42]].forEach(([dx, dy, a, b]) => el("path", { d: `M${x + dx * a} ${220 + dy * a} L${x + dx * b} ${220 + dy * b}`, stroke: BLUE, "stroke-width": 4, "stroke-linecap": "round" }, rays));
        el("circle", { cx: x, cy: 220, r: 8, fill: WHITE, stroke: INK, "stroke-width": 2 }, body);
        const lamp = el("circle", { cx: x, cy: 220, r: 8, fill: BLUE, stroke: INK, "stroke-width": 2 }, body);
        const rip = el("circle", { cx: x, cy: 220, r: 12, fill: "none", stroke: BLUE, "stroke-width": 3 }, body);
        const name = lab(svg, x, 172, NAMES[i]);
        return { body, lamp, rays, rip, name, x };
      });
      const dockW = el("g", {}, svg), dock = el("g", {}, dockW);
      el("rect", { x: 664, y: 400, width: 104, height: 24, rx: 6, fill: SOFT }, dock);
      [668, 730].forEach((x) => el("rect", { x, y: 416, width: 16, height: 74, rx: 3, fill: LIL, stroke: INK, "stroke-width": 3 }, dock));
      el("rect", { x: 656, y: 392, width: 104, height: 24, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, dock);
      el("rect", { x: 712, y: 376, width: 16, height: 18, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2.5 }, dock);
      const boat = el("g", {}, svg);
      const tg = el("g", { transform: "translate(-148 0)" }, boat), wake = el("g", {}, tg), tugIn = el("g", {}, tg);
      [0, 1].forEach((i) => el("path", { d: `M${-66 - i * 20} ${6 - i * 3} q-12 -8 -24 0`, stroke: WHITE, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, wake));
      tug(tugIn, YEL);
      const pc = el("g", {}, boat);
      el("path", { d: "M-84 6 q14 -8 28 0 t28 0 t28 0 t28 0 t28 0 t28 0", stroke: WHITE, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, pc);
      el("rect", { x: -80, y: -86, width: 160, height: 86, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, pc);
      el("path", { d: "M-80 -64 H80", stroke: INK, "stroke-width": 2.5 }, pc);
      el("rect", { x: -12, y: -86, width: 24, height: 22, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pc);
      lab(pc, 0, -25, "Pull request", { "font-size": 19 });
      const splash = el("g", {}, svg);
      [[-1, 14], [1, 22]].forEach(([s, h]) => el("path", { d: `M0 0 q${s * 10} ${-h * 0.6} ${s * 6} ${-h}`, stroke: WHITE, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, splash));
      ring(tg, -76, -98, 156, 124, 18);
      let again = false;
      const replay = () => { again = true; api.seek(E - 0.6); };
      button(tg, "Tap the tugboat to send the parcel round again", replay);
      hint(root, api, "Tap the tugboat");
      const PX = (t) => X0 + (X1 - X0) * io(seg(t, T0, T1)) - 360 * (1 - oc(seg(t, E, E + 1))) + 4 * Math.sin(Math.PI * seg(t, T1 - 0.2, T1 + 0.3));
      const when = MX.map((m) => { for (let t = T0; t < T1; t += 0.01) if (PX(t) >= m) return t; return T1; });
      return (t) => {
        const st = (a, d = 0.45) => (again ? 1 : oc(seg(t, a, a + d))), pp = (a, d = 0.55) => (again ? 1 : ob(seg(t, a, a + d)));
        const rk = again && t < E ? seg(t, E - 0.6, E) : -1, amp = 1 - seg(t, 7, 8.2);
        drift(wv, t);
        S(sea, st(0), 400, 415, 18);
        marks.forEach((m, i) => {
          S(m.body, pp(0.15 + i * 0.12), m.x, 330, 30, 0.6);
          S(m.name, st(0.75 + i * 0.1, 0.4), m.x, 165, -14);
          const w = when[i], lv = rk >= 0 ? 1 - oc(rk) : oc(seg(t, w, w + 0.3)), sc = rk >= 0 ? 1 : 0.6 + 0.4 * ob(seg(t, w, w + 0.4)), rr = seg(t, w, w + 0.8);
          m.lamp.setAttribute("opacity", lv); m.rays.setAttribute("opacity", lv);
          m.lamp.setAttribute("transform", `translate(${m.x} 220) scale(${sc}) translate(${-m.x} -220)`);
          m.rays.setAttribute("transform", `translate(${m.x} 220) scale(${sc}) translate(${-m.x} -220)`);
          m.rip.setAttribute("r", 12 + 30 * oc(rr)); m.rip.setAttribute("opacity", rk < 0 && rr > 0 && rr < 1 ? 1 - rr : 0);
        });
        S(dockW, st(0.5), 708, 430, 24);
        dock.setAttribute("transform", `translate(${3 * Math.sin(Math.PI * seg(t, T1 - 0.05, T1 + 0.4))} 0)`);
        let bx = PX(t), by = 2.5 * Math.sin(t * 2.6) * amp, bo = 1;
        if (rk >= 0) { bx = X1; bo = 1 - oc(rk); by += 14 * rk; }
        tf(boat, bx, WL + by); boat.setAttribute("opacity", bo);
        tugIn.setAttribute("transform", `rotate(${1.6 * Math.sin(t * 2.6 + 0.8) * amp})`);
        pc.setAttribute("transform", `translate(0 ${2 * Math.sin(t * 2.6 + 1.6) * amp})`);
        wake.setAttribute("opacity", rk >= 0 ? 0 : cl((PX(t + 0.04) - PX(t)) / 0.04 / 110));
        const sk = seg(t, T1 - 0.05, T1 + 0.65);
        tf(splash, X1 + 82, WL - 18, 0.6 + 0.6 * oc(sk)); splash.setAttribute("opacity", rk < 0 && sk > 0 && sk < 1 ? 1 - sk : 0);
      };
    },
  };

  /* ---- 2. the policy card decides when the gangway can lower ---- */
  SC.gangway = {
    dur: 9.5, still: 9.5,
    build(root, api) {
      const svg = el("g", { transform: "translate(0 -40)" }, root);
      const HX = 374, HY = 322, UP = -72, DOWN = 6.9;
      const sea = el("g", {}, svg); water(sea, 432, 128, SOFT);
      const wv = waves(sea, [[70, 500], [210, 522], [396, 488], [560, 508], [690, 500]], LIL);
      const dock = el("g", {}, svg);
      el("rect", { x: 48, y: 338, width: 340, height: 26, rx: 6, fill: SOFT }, dock);
      [64, 204, 350].forEach((x) => el("rect", { x, y: 356, width: 18, height: 120, rx: 3, fill: MINT, stroke: INK, "stroke-width": 3 }, dock));
      el("rect", { x: 40, y: 330, width: 340, height: 26, rx: 6, fill: MINT, stroke: INK, "stroke-width": 3 }, dock);
      const sign = el("g", {}, svg);
      el("rect", { x: 53, y: 157, width: 180, height: 62, rx: 12, fill: LIL }, sign);
      [74, 188].forEach((x) => el("rect", { x, y: 206, width: 10, height: 126, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, sign));
      el("rect", { x: 46, y: 150, width: 180, height: 62, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, sign);
      const signL = lab(svg, 136, 188, "Branch rules", { "font-size": 20 });
      const ship = el("g", {}, svg);
      el("rect", { x: 650, y: 222, width: 40, height: 50, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 3 }, ship);
      el("rect", { x: 650, y: 222, width: 40, height: 14, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, ship);
      el("rect", { x: 598, y: 268, width: 136, height: 86, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, ship);
      [614, 654, 694].forEach((x) => el("rect", { x, y: 286, width: 26, height: 22, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, ship));
      el("path", { d: "M448 352 H770 L756 442 H474 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ship);
      [520, 566, 612, 658, 704].forEach((x) => el("circle", { cx: x, cy: 394, r: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, ship));
      const pk = el("g", {}, svg), pkIn = el("g", {}, pk);
      [10, 92, 174].forEach((x) => el("path", { d: `M${x} -10 V-28`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, pkIn));
      el("path", { d: "M4 -28 H180", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, pkIn);
      el("rect", { x: -6, y: -11, width: 192, height: 22, rx: 7, fill: SKY, stroke: INK, "stroke-width": 3 }, pkIn);
      const mL = lab(pkIn, 92, 7, "Merge", { "font-size": 19 });
      el("circle", { cx: 0, cy: 0, r: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, pkIn);
      const btn = el("g", {}, svg), cardW = el("g", {}, btn);
      el("rect", { x: 252, y: 312, width: 56, height: 18, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cardW);
      const card = el("g", {}, cardW);
      el("rect", { x: -41, y: -59, width: 96, height: 130, rx: 12, fill: SOFT }, card);
      const face = el("rect", { x: -48, y: -66, width: 96, height: 130, rx: 12, fill: LIL, stroke: INK, "stroke-width": 3 }, card);
      const cardL = lab(card, 0, -26, "Policy");
      const tick = el("g", {}, card);
      el("path", { d: "M-18 0 L-5 13 L20 -14", stroke: INK, "stroke-width": 13, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      el("path", { d: "M-18 0 L-5 13 L20 -14", stroke: BLUE, "stroke-width": 7, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      ring(btn, 220, 176, 120, 162, 18);
      let user = null, cur = { f: 0, g: 0 };
      const flip = () => { user = { to: cur.f >= 0.5 ? 0 : 1, f: cur.f, g: cur.g, at: api.now() }; api.run(1.8); };
      button(btn, "Tap the card to flip it", flip);
      hint(root, api, "Tap the card");
      return (t, now) => {
        const st = (a, d = 0.45) => oc(seg(t, a, a + d)), pp = (a, d = 0.55) => ob(seg(t, a, a + d));
        drift(wv, t);
        S(sea, st(0), 400, 496, 16);
        S(dock, st(0.1), 206, 400, 24);
        S(ship, st(0.25, 0.9), 610, 352, 0, 1, 260);
        S(sign, pp(0.4), 136, 330, 20, 0.7);
        S(cardW, pp(0.55), 280, 330, 20, 0.6);
        S(pk, st(0.7), HX, HY, 0, 0.5);
        S(signL, st(0.95, 0.4), 136, 182, -12);
        cardL.setAttribute("opacity", st(1.05, 0.35));
        mL.setAttribute("opacity", st(1.15, 0.35));
        let f, g;
        if (user) {
          const e = api.calm ? 9 : now - user.at;
          f = user.f + (user.to - user.f) * back(seg(e, 0, 0.6), 1);
          g = user.to ? user.g + (1 - user.g) * land(seg(e, 0.5, 1.6)) : user.g * (1 - io(seg(e, 0.35, 1.3)));
        } else {
          f = back(seg(t, 1.6, 2.2), 1) - back(seg(t, 4.6, 5.2), 1) + back(seg(t, 6.8, 7.4), 1);
          g = land(seg(t, 2.4, 3.6)) - io(seg(t, 5.1, 6.1)) + land(seg(t, 7.4, 8.6));
        }
        cur = { f, g };
        const on = f >= 0.5, sx = Math.max(0.001, Math.abs(1 - 2 * f));
        face.setAttribute("fill", on ? YEL : LIL);
        card.setAttribute("transform", `translate(280 252) scale(${sx} 1)`);
        tick.setAttribute("transform", `translate(0 26) scale(${on ? Math.max(0.001, 2 * f - 1) : 0.001})`);
        tick.setAttribute("opacity", on ? 1 : 0);
        pkIn.setAttribute("transform", `translate(${HX} ${HY}) rotate(${UP + (DOWN - UP) * g})`);
      };
    },
  };

  /* ---- 3. PR Steward sails to its spend cap and stops ---- */
  SC.buoy = {
    dur: 9, still: 9,
    build(root, api) {
      const svg = el("g", { transform: "translate(0 -40)" }, root);
      const WL = 440, B0 = 160, B1 = 468, T0 = 1.6, T1 = 6.4, BX = 650;
      const sea = el("g", {}, svg); water(sea, 300, 230, SKY);
      const wv = waves(sea, [[90, 350], [260, 350], [400, 506], [560, 510], [700, 504]]);
      const bw = el("g", {}, svg), by = el("g", { transform: `translate(${BX} ${WL})` }, bw), bIn = el("g", {}, by);
      buoy(bIn, 140);
      const flag = el("path", { d: "M4 0 H66 L52 19 L66 38 H4 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, bIn);
      const capL = lab(svg, BX, WL - 226, "Spend cap");
      ring(by, -66, -252, 144, 280, 22);
      const bt = el("g", {}, svg), wk = el("g", {}, bt), bI = el("g", {}, bt);
      [0, 1].forEach((i) => el("path", { d: `M${-112 - i * 20} ${2 - i * 3} q-12 -8 -24 0`, stroke: WHITE, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, wk));
      el("rect", { x: -86, y: -66, width: 62, height: 44, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, bI);
      [-78, -52].forEach((x) => el("rect", { x, y: -57, width: 18, height: 14, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, bI));
      el("rect", { x: 4, y: -114, width: 66, height: 92, rx: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, bI);
      el("rect", { x: 14, y: -106, width: 46, height: 76, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, bI);
      const coins = Array.from({ length: 6 }, (_, i) => el("rect", { x: 17, y: -42 - i * 11, width: 40, height: 10, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, bI));
      el("path", { d: "M-104 -24 H92 Q110 -24 112 -14 L100 8 Q96 16 86 16 H-90 Q-100 16 -103 6 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bI);
      const nm = lab(bI, -2, 3, "PR Steward", { "font-size": 19 });
      const splash = el("g", {}, svg);
      [[-1, 14], [1, 22]].forEach(([s, h]) => el("path", { d: `M0 0 q${s * 10} ${-h * 0.6} ${s * 6} ${-h}`, stroke: WHITE, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, splash));
      let again = false;
      const replay = () => { again = true; api.seek(T0 - 1); };
      button(by, "Tap the buoy to reset the counter and send the boat again", replay);
      hint(root, api, "Tap the buoy");
      const P = (t) => io(seg(t, T0, T1));
      const BXt = (t) => B0 + (B1 - B0) * P(t) - 300 * (1 - oc(seg(t, 0.35, 1.3)));
      const cw = coins.map((_, i) => { for (let t = T0; t < T1; t += 0.01) if (P(t) >= (i + 0.8) / 6) return t; return T1; });
      return (t) => {
        const st = (a, d = 0.45) => (again ? 1 : oc(seg(t, a, a + d))), pp = (a, d = 0.55) => (again ? 1 : ob(seg(t, a, a + d)));
        const rk = again && t < T0 ? seg(t, T0 - 1, T0) : -1, amp = 1 - seg(t, 7, 8.2);
        drift(wv, t);
        S(sea, st(0), 400, 415, 18);
        S(bw, pp(0.2), BX, WL, 30, 0.5);
        S(capL, st(1, 0.4), BX, WL - 232, -14);
        nm.setAttribute("opacity", st(1.1, 0.4));
        let x = rk >= 0 ? B1 + (B0 - B1) * io(rk) : BXt(t);
        const pitch = rk >= 0 ? 0 : 2.5 * Math.sin(Math.PI * seg(t, T1 - 0.25, T1 + 0.45));
        tf(bt, x, WL + 2.5 * Math.sin(t * 2.5) * amp);
        bI.setAttribute("transform", `rotate(${pitch + 1.4 * Math.sin(t * 2.5 + 0.9) * amp} 0 0)`);
        wk.setAttribute("opacity", rk >= 0 ? 0 : cl((BXt(t + 0.04) - BXt(t)) / 0.04 / 110));
        coins.forEach((c, i) => {
          if (rk >= 0) { const q = seg(rk, (5 - i) * 0.07, (5 - i) * 0.07 + 0.35); c.setAttribute("opacity", 1 - q); c.setAttribute("transform", `translate(0 ${-30 * oc(q)})`); return; }
          const k = seg(t, cw[i], cw[i] + 0.35);
          c.setAttribute("opacity", cl(k * 4)); c.setAttribute("transform", `translate(0 ${-26 * (1 - ob(k))})`);
        });
        let fr = oc(seg(t, 6.7, 7.4)), fu = back(seg(t, 6.85, 7.5), 1.4);
        if (rk >= 0) { fr = 1 - io(rk); fu = 1 - oc(seg(rk, 0, 0.6)); }
        const flut = 5 * Math.sin(t * 8) * seg(t, 7.2, 7.5) * (1 - seg(t, 7.5, 8.4));
        flag.setAttribute("transform", `translate(0 ${-110 - 82 * fr}) skewY(${rk >= 0 ? 0 : flut}) scale(${Math.max(0.001, fu)} 1)`);
        flag.setAttribute("opacity", fu > 0.01 ? 1 : 0);
        bIn.setAttribute("transform", `translate(0 ${2 * Math.sin(t * 2.2 + 1) * amp}) rotate(${1.5 * Math.sin(t * 2.2) * amp})`);
        const sk = seg(t, T1 - 0.3, T1 + 0.45);
        tf(splash, B1 + 116, WL - 12, 0.6 + 0.6 * oc(sk)); splash.setAttribute("opacity", rk < 0 && sk > 0 && sk < 1 ? 1 - sk : 0);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 70, y: 48, width: 150, height: 42, rx: 21, fill: LIL }, pill);
      el("rect", { x: 64, y: 42, width: 150, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      lab(pill, 139, 70, "Explainer", { "font-size": 20 });
      const chk = txt(svg, 896, 70, "Checked 24 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 19, "font-weight": 500, fill: MUTE });
      const title = txt(svg, 64, 190, "What is Claude Ship?", { "font-size": 70, "font-weight": 700 });
      const ul = el("path", { d: "M66 216 H300", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 64, 266, "Anthropic's pull request agents: review, fixes, approval", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const tile = (x, fill, shade, label) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 8, y: 316, width: 400, height: 184, rx: 22, fill: shade }, g);
        el("rect", { x, y: 308, width: 400, height: 184, rx: 22, fill, stroke: INK, "stroke-width": 2.5 }, g);
        const ic = el("g", {}, g);
        const tx = lab(g, x + 200, 462, label, { "font-size": 22 });
        return { g, ic, tx, x };
      };
      const A = tile(64, LIL, SOFT, "Launched 23 Nov 2026"), B = tile(496, SKY, LIL, "Team and Enterprise plans");
      const icA = el("g", {}, A.ic), icB = el("g", {}, B.ic);
      tug(icA, BLUE); buoy(icB, 46);
      [[A, 24], [B, 18]].forEach(([T, y]) => el("path", { d: `M${T.x + 140} ${404 + y} q12 -8 24 0 t24 0 t24 0 t24 0 t24 0`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, T.ic));
      return (t) => {
        const st = (a, d = 0.5) => oc(seg(t, a, a + d)), pp = (a, d = 0.55) => ob(seg(t, a, a + d)), amp = 1 - seg(t, 3.4, 5);
        S(pill, pp(0.1), 139, 63, 0, 0.6);
        S(chk, st(0.25), 800, 64, 10);
        S(title, st(0.35, 0.6), 64, 170, 24);
        const u = oc(seg(t, 0.8, 1.3));
        ul.setAttribute("d", `M66 216 H${66 + 234 * u}`); ul.setAttribute("opacity", u > 0.01 ? 1 : 0);
        S(sub, st(0.9), 64, 258, 14);
        S(A.g, pp(1.2, 0.6), 264, 492, 30, 0.92);
        S(B.g, pp(1.32, 0.6), 696, 492, 30, 0.92);
        S(A.ic, pp(1.6), 264, 420, 0, 0.5);
        S(B.ic, pp(1.72), 696, 420, 0, 0.5);
        tf(icA, 264, 408 + 3 * Math.sin(t * 2.6) * amp, 0.9, 1.5 * Math.sin(t * 2.6 + 0.8) * amp);
        tf(icB, 696, 410 + 3 * Math.sin(t * 2.6 + 1.2) * amp, 0.78, 1.5 * Math.sin(t * 2.6 + 2) * amp);
        S(A.tx, st(1.95, 0.45), 264, 455, 12);
        S(B.tx, st(2.07, 0.45), 696, 455, 12);
      };
    },
  };

  /* ---- player: plays once in view, then rests on its calm final frame; a tap replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let t = calm ? sc.still : 0, last = 0, raf = 0, seen = false, playing = !calm, busy = 0;
    const clock = () => performance.now() / 1000;
    let draw = () => {};
    const tick = () => {
      cancelAnimationFrame(raf);
      const now = clock(), dt = Math.min(0.05, Math.max(0, now - last)); last = now;
      if (playing) { t += dt; if (t >= sc.dur) { t = sc.dur; playing = false; } }
      draw(t, now);
      if (seen && (playing || now < busy)) raf = requestAnimationFrame(tick);
    };
    const kick = () => { last = clock(); tick(); };
    const api = {
      calm, live: !frozen, now: clock,
      seek: (s) => { t = calm ? sc.still : s; playing = !calm; kick(); },
      run: (s) => { busy = clock() + (calm ? 0 : s); kick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { kick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    kick();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
