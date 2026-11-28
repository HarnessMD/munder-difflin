/* Bright coded scenes for "Riemann Hypothesis proof with Claude, checked in Lean". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bump = (x) => Math.sin(Math.PI * cl(x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* a card with a soft offset shadow and a crisp ink outline */
  const card = (p, x, y, w, h, rx, fill, shade = LIL, off = 10, sw = 3) => {
    el("rect", { x: x + off, y: y + off, width: w, height: h, rx, fill: shade }, p);
    return el("rect", { x, y, width: w, height: h, rx, fill, stroke: INK, "stroke-width": sw }, p);
  };
  const isPrime = (n) => { if (n < 2) return false; for (let d = 2; d * d <= n; d++) if (n % d === 0) return false; return true; };

  /* smooth replays: a tap, or the loop starting over, eases from what is on screen into the timeline */
  const mix = (a, b, k) => (typeof a === "number" ? lerp(a, b, k) : Array.isArray(a) ? a.map((v, i) => mix(v, b[i], k)) : Object.keys(a).reduce((o, key) => ((o[key] = mix(a[key], b[key], k)), o), {}));
  const replayer = (api, S, R, D = 0.7) => {
    let from = null, at = 0, last = -1, shown = null, again = false;
    return {
      replay() { from = shown; at = api.now(); again = true; last = R; api.seek(R); },
      at(t, now) {
        if (t + 0.5 < last && shown) { from = shown; at = now; again = false; }
        last = t;
        const s = S(t, again), k = from ? io(seg(now - at, 0, D)) : 1;
        if (k >= 1) from = null;
        return (shown = from ? mix(from, s, k) : s);
      },
    };
  };

  /* a blue telescope on a soft white tripod, drawn pointing up around its pivot; outlines stay 3 px at any scale */
  const telescope = (svg, s) => {
    const k = 3 / s, g = el("g", {}, svg);
    el("circle", { cx: 0, cy: -24, r: 300, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": k, "stroke-dasharray": `${4 * k / 3} ${12 * k / 3}`, class: "mg-ring" }, g);
    const body = el("g", {}, g);
    const leg = (d) => { el("path", { d, stroke: INK, "stroke-width": 16 + 2 * k, "stroke-linecap": "round", fill: "none" }, body); el("path", { d, stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round", fill: "none" }, body); };
    leg("M0 24 L0 214"); leg("M0 24 L-114 208"); leg("M0 24 L114 208");
    el("rect", { x: -46, y: -6, width: 92, height: 42, rx: 13, fill: SOFT, stroke: INK, "stroke-width": k }, body);
    const tube = el("g", {}, body);
    el("rect", { x: -17, y: 12, width: 34, height: 54, rx: 8, fill: SOFT, stroke: INK, "stroke-width": k }, tube);
    el("rect", { x: -38, y: -232, width: 76, height: 256, rx: 14, fill: BLUE, stroke: INK, "stroke-width": k }, tube);
    el("rect", { x: -38, y: -150, width: 76, height: 20, fill: SOFT, stroke: INK, "stroke-width": k * 0.85 }, tube);
    el("path", { d: "M36 -160 H48 M36 -100 H48", stroke: INK, "stroke-width": k }, tube);
    el("rect", { x: 46, y: -182, width: 26, height: 96, rx: 10, fill: BLUE, stroke: INK, "stroke-width": k * 0.85 }, tube);
    el("rect", { x: -50, y: -268, width: 100, height: 58, rx: 13, fill: BLUE, stroke: INK, "stroke-width": k }, tube);
    el("ellipse", { cx: 0, cy: -268, rx: 44, ry: 9, fill: SKY, stroke: INK, "stroke-width": k }, tube);
    el("circle", { r: 15, fill: SOFT, stroke: INK, "stroke-width": k }, body);
    return { g, body, tube };
  };

  /* a row of soft white tiles swept by the telescope; the prime numbered ones light yellow as it passes */
  const sweepRow = (svg, o) => {
    const X = o.cx - (o.n * o.tw + (o.n - 1) * o.gap) / 2, bot = o.ty + o.th;
    const cx = (i) => X + o.tw / 2 + i * (o.tw + o.gap);
    const prime = Array.from({ length: o.n }, (_, i) => isPrime(i + 2));
    const beam = el("path", { fill: SKY, opacity: 0 }, svg);
    const tiles = prime.map(() => {
      const g = el("g", {}, svg), w = o.tw, h = o.th;
      el("rect", { x: -w / 2 + 7, y: -h / 2 + 7, width: w, height: h, rx: 10, fill: LIL }, g);
      el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
      return { g, lit: el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3, opacity: 0 }, g) };
    });
    const T = telescope(svg, o.s);
    const X0 = cx(0) - o.tw * 0.3, X1 = cx(o.n - 1) + o.tw * 0.3, [a0, a1, b0, b1, c0, c1] = o.times;
    const aim = (t) => (t < b0 ? lerp(o.cx, X0, io(seg(t, a0, a1))) : t < c0 ? lerp(X0, X1, io(seg(t, b0, b1))) : lerp(X1, o.cx, io(seg(t, c0, c1))));
    const pass = prime.map((_, i) => { for (let t = b0; t < b1; t += 0.005) if (aim(t) >= cx(i)) return t; return b1; });
    return {
      T,
      state(t) {
        const p = aim(t), on = oc(seg(t, b0 - 0.2, b0 + 0.05)) * (1 - seg(t, b1 - 0.15, b1 + 0.15));
        return {
          p, beam: on, tel: ob(seg(t, o.tel, o.tel + 0.6)),
          tin: prime.map((_, i) => ob(seg(t, o.tin + i * o.step, o.tin + 0.4 + i * o.step))),
          lit: prime.map((pr, i) => (pr ? oc(seg(t, pass[i], pass[i] + 0.2)) : 0)),
          pop: prime.map((pr, i) => (pr ? bump(seg(t, pass[i], pass[i] + 0.42)) : 0)),
          lift: prime.map((_, i) => on * Math.max(0, 1 - Math.abs(p - cx(i)) / (o.tw * 0.85))),
        };
      },
      draw(st) {
        tiles.forEach((n, i) => { tf(n.g, cx(i), o.ty + o.th / 2 + 34 * (1 - st.tin[i]) - 12 * st.lift[i], 1 + 0.16 * st.pop[i]); n.g.setAttribute("opacity", cl(st.tin[i] * 1.6)); n.lit.setAttribute("opacity", cl(st.lit[i])); });
        const a = Math.atan2(st.p - o.px, o.py - bot), drop = 90 * (1 - st.tel), c = Math.cos(a), sn = Math.sin(a);
        tf(T.g, o.px, o.py, o.s); tf(T.body, 0, drop); T.body.setAttribute("opacity", cl(st.tel * 2)); tf(T.tube, 0, 0, 1, (a * 180) / Math.PI);
        const L = 268 * o.s, hw = 30 * o.s, fx = o.px + sn * L, fy = o.py + drop * o.s - c * L;
        beam.setAttribute("d", `M${fx - hw * c} ${fy - hw * sn} L${st.p - o.bw} ${bot} H${st.p + o.bw} L${fx + hw * c} ${fy + hw * sn} Z`);
        beam.setAttribute("opacity", 0.5 * st.beam);
      },
    };
  };

  const SC = {};

  /* ---- 1. a telescope sweeps a row of tiles; the prime ones light up under a lilac sign ---- */
  SC.telescope = {
    w: 1600, h: 1200, dur: 9, still: 9,
    build(svg, api) {
      const sign = el("g", {}, svg);
      card(sign, -290, -62, 580, 124, 24, LIL, SOFT, 12);
      const word = mono(sign, 0, 18, "prime numbers", 54);
      const row = sweepRow(svg, { n: 20, tw: 60, gap: 10, cx: 800, ty: 384, th: 96, px: 800, py: 862, s: 1, bw: 36, tin: 0.1, step: 0.06, tel: 0.25, times: [0.9, 1.75, 1.8, 6.6, 6.7, 7.5] });
      const S = (t, again) => Object.assign(row.state(t), { sign: again ? 1 : ob(seg(t, 6.9, 7.45)), word: again ? 1 : oc(seg(t, 7.25, 7.65)) });
      const rp = replayer(api, S, 1.7);
      button(row.T.g, "Sweep the row again", () => rp.replay());
      return (t, now) => {
        const s = rp.at(t, now);
        tf(sign, 800, 214 - 70 * (1 - s.sign)); sign.setAttribute("opacity", cl(s.sign * 2));
        word.setAttribute("opacity", s.word); word.setAttribute("transform", `translate(0 ${10 * (1 - s.word)})`);
        row.draw(s);
      };
    },
  };

  /* ---- 2. three beacons on a rail: two checks pass, the Lean kernel still runs ---- */
  SC.beacon = {
    w: 1600, h: 1200, dur: 9, still: 9,
    build(svg, api) {
      const XS = [400, 800, 1200], RY = 836, NAMES = ["175,187 modules", "nanoda", "Lean kernel"], T = [1.5, 2.9, 4.3], PB = (9 - 4.3) / 4;
      const rail = el("g", {}, svg);
      card(rail, 160, RY, 1280, 40, 20, SOFT, LIL, 10);
      const tag = el("g", {}, svg), tagD = "M-152 -45 H152 Q170 -45 170 -27 V27 Q170 45 152 45 H22 L0 75 L-22 45 H-152 Q-170 45 -170 27 V-27 Q-170 -45 -152 -45 Z";
      el("path", { d: tagD, fill: SOFT, transform: "translate(10 10)" }, tag);
      el("path", { d: tagD, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      mono(tag, 0, 12, "still running", 34);
      let rp;
      const bs = XS.map((x, i) => {
        const g = el("g", { transform: `translate(${x} ${RY})` }, svg), body = el("g", {}, g), col = i < 2 ? MINT : SKY;
        el("rect", { x: -132, y: -472, width: 264, height: 500, rx: 36, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 3, "stroke-dasharray": "4 12", class: "mg-ring" }, g);
        el("rect", { x: -82, y: -44, width: 164, height: 44, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
        el("rect", { x: -22, y: -232, width: 44, height: 192, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
        const lamp = el("g", {}, body), rays = el("g", {}, lamp);
        const rl = [-160, -125, -90, -55, -20].map((d) => {
          const a = (d * Math.PI) / 180, ink = el("path", { stroke: INK, "stroke-width": 16, "stroke-linecap": "round" }, rays), c = el("path", { stroke: col, "stroke-width": 10, "stroke-linecap": "round" }, rays);
          return { a, ink, c };
        });
        el("rect", { x: -98, y: -264, width: 196, height: 38, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, lamp);
        const dome = "M-80 -262 V-330 A80 80 0 0 1 80 -330 V-262 Z";
        el("path", { d: dome, fill: SOFT, stroke: INK, "stroke-width": 3 }, lamp);
        const glow = el("path", { d: dome, fill: col, stroke: INK, "stroke-width": 3, opacity: 0 }, lamp);
        const shine = el("path", { d: "M-54 -298 V-332 A56 56 0 0 1 -36 -374", stroke: "#fff", "stroke-width": 9, "stroke-linecap": "round", fill: "none", opacity: 0 }, lamp);
        const tick = i < 2 ? el("path", { d: "M-30 -328 L-8 -304 L34 -352", stroke: INK, "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, lamp) : null;
        el("circle", { cy: -418, r: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, lamp);
        const lab = el("g", {}, svg), w = Math.max(210, NAMES[i].length * 20.4 + 64);
        card(lab, -w / 2, -34, w, 68, 18, "#fff", LIL, 8);
        mono(lab, 0, 12, NAMES[i], 34);
        button(g, "Replay the checks in order", () => rp.replay());
        return { x, body, lamp, rl, glow, shine, tick, lab };
      });
      const blink = (t) => (t < T[2] ? 0 : oc(seg(t, T[2], T[2] + 0.2)) * (0.5 + 0.5 * Math.cos((2 * Math.PI * (t - T[2])) / PB)));
      const S = (t, again) => ({
        rail: oc(seg(t, 0.05, 0.6)),
        rise: XS.map((_, i) => ob(seg(t, 0.25 + i * 0.1, 0.75 + i * 0.1))),
        lab: XS.map((_, i) => oc(seg(t, 0.55 + i * 0.1, 0.95 + i * 0.1))),
        lamp: [oc(seg(t, T[0], T[0] + 0.22)), oc(seg(t, T[1], T[1] + 0.22)), blink(t)],
        pop: T.map((s) => bump(seg(t, s, s + 0.45))),
        ray: [ob(seg(t, T[0] + 0.05, T[0] + 0.5)), ob(seg(t, T[1] + 0.05, T[1] + 0.5)), blink(t)],
        chk: [oc(seg(t, T[0] + 0.2, T[0] + 0.5)), oc(seg(t, T[1] + 0.2, T[1] + 0.5)), 0],
        tag: again ? 1 : ob(seg(t, 5.0, 5.55)),
        wig: again || t < 5 ? 0 : 6 * Math.sin((t - 5) * 9) * Math.exp(-(t - 5) * 2.6),
      });
      rp = replayer(api, S, 1.2);
      return (t, now) => {
        const s = rp.at(t, now);
        rail.setAttribute("transform", `translate(800 ${RY + 20}) scale(${cl(s.rail, 0.001)} 1) translate(-800 ${-RY - 20})`); rail.setAttribute("opacity", cl(s.rail * 3));
        bs.forEach((b, i) => {
          tf(b.body, 0, 70 * (1 - s.rise[i])); b.body.setAttribute("opacity", cl(s.rise[i] * 2));
          b.lamp.setAttribute("transform", `translate(0 -330) scale(${1 + 0.14 * s.pop[i]}) translate(0 330)`);
          b.glow.setAttribute("opacity", cl(s.lamp[i])); b.shine.setAttribute("opacity", 0.9 * cl(s.lamp[i]));
          b.rl.forEach((r) => { const r0 = 100, r1 = 100 + 50 * cl(s.ray[i], 0, 1.2), d = `M${Math.cos(r.a) * r0} ${-330 + Math.sin(r.a) * r0} L${Math.cos(r.a) * r1} ${-330 + Math.sin(r.a) * r1}`; r.ink.setAttribute("d", d); r.c.setAttribute("d", d); });
          b.rl[0].ink.parentNode.setAttribute("opacity", cl(s.ray[i] * 3));
          if (b.tick) b.tick.setAttribute("stroke-dashoffset", 1 - cl(s.chk[i]));
          tf(b.lab, b.x, 942 + 18 * (1 - s.lab[i])); b.lab.setAttribute("opacity", cl(s.lab[i]));
        });
        tag.setAttribute("transform", `translate(1200 ${258 - 90 * (1 - s.tag)}) rotate(${s.wig} 0 75)`); tag.setAttribute("opacity", cl(s.tag * 2));
      };
    },
  };

  /* ---- 3. a balance scale with two proofs that sways and settles level ---- */
  SC.scale = {
    w: 1600, h: 1200, dur: 8, still: 8,
    build(svg, api) {
      const P = [800, 330], HALF = 450;
      const g = el("g", {}, svg);
      el("rect", { x: 104, y: 120, width: 1392, height: 950, rx: 44, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 3, "stroke-dasharray": "4 12", class: "mg-ring" }, g);
      const stand = el("g", {}, g);
      el("path", { d: "M612 1042 L676 974 H924 L988 1042 Z", fill: LIL, transform: "translate(10 10)" }, stand);
      el("path", { d: "M612 1042 L676 974 H924 L988 1042 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, stand);
      el("rect", { x: 776, y: 330, width: 48, height: 646, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, stand);
      const arc = (r, a) => [P[0] + r * Math.sin((a * Math.PI) / 180), P[1] - r * Math.cos((a * Math.PI) / 180)];
      const [d0x, d0y] = arc(184, -24), [d1x, d1y] = arc(184, 24), dial = `M${d0x} ${d0y} A184 184 0 0 1 ${d1x} ${d1y}`;
      el("path", { d: dial, stroke: INK, "stroke-width": 24, "stroke-linecap": "round", fill: "none" }, stand);
      el("path", { d: dial, stroke: SOFT, "stroke-width": 18, "stroke-linecap": "round", fill: "none" }, stand);
      el("path", { d: `M800 ${P[1] - 172} V${P[1] - 196}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, stand);
      const pans = [[BLUE, "Alpöge", MINT, "with Claude"], [LIL, "Masullo", YEL, "all human"]].map(([cc, name, tc, tagTxt]) => {
        const p = el("g", {}, g);
        el("path", { d: "M0 0 L-200 372 M0 0 L200 372", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", fill: "none" }, p);
        card(p, -170, 170, 340, 214, 22, cc, SOFT, 12);
        mono(p, 0, 256, name, 56);
        const tg = el("g", {}, p), w = tagTxt.length * 19.2 + 56;
        el("rect", { x: -w / 2, y: -30, width: w, height: 60, rx: 30, fill: tc, stroke: INK, "stroke-width": 3 }, tg);
        mono(tg, 0, 11, tagTxt, 32);
        el("path", { d: "M-212 372 H212 Q204 436 0 438 Q-204 436 -212 372 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, p);
        return { p, tg };
      });
      const beam = el("g", {}, g);
      el("path", { d: "M0 -10 V-158", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, beam);
      el("circle", { cy: -160, r: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, beam);
      el("rect", { x: -484, y: -16, width: 968, height: 32, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, beam);
      [-HALF, HALF].forEach((x) => el("circle", { cx: x, r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, beam));
      el("circle", { r: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, beam);
      el("circle", { r: 6, fill: INK }, beam);
      const sway = (t) => { const u = t - 1.25; return u <= 0 ? 0 : -8 * Math.exp(-0.62 * u) * Math.sin((2 * Math.PI * u) / 2) * (1 - io(seg(u, 3.8, 5))); };
      const S = (t, again) => ({ base: oc(seg(t, 0, 0.5)), beam: ob(seg(t, 0.2, 0.7)), pans: [ob(seg(t, 0.45, 1.0)), ob(seg(t, 0.57, 1.12))], ang: sway(t), tags: again ? [1, 1] : [ob(seg(t, 6.0, 6.45)), ob(seg(t, 6.12, 6.57))] });
      const rp = replayer(api, S, 1.2);
      button(g, "Make the scale sway again", () => rp.replay());
      return (t, now) => {
        const s = rp.at(t, now), a = (s.ang * Math.PI) / 180, sc = 0.6 + 0.4 * s.beam;
        tf(stand, 0, 50 * (1 - s.base)); stand.setAttribute("opacity", cl(s.base));
        tf(beam, P[0], P[1], sc, s.ang); beam.setAttribute("opacity", cl(s.beam * 2));
        pans.forEach((n, i) => {
          const sd = i ? 1 : -1, ex = P[0] + sd * HALF * sc * Math.cos(a), ey = P[1] + sd * HALF * sc * Math.sin(a);
          tf(n.p, ex, ey - 160 * (1 - s.pans[i])); n.p.setAttribute("opacity", cl(s.pans[i] * 2));
          tf(n.tg, 0, 318, Math.max(0.001, s.tags[i])); n.tg.setAttribute("opacity", cl(s.tags[i] * 2));
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 7, still: 7,
    build(svg, api) {
      const pill = el("g", {}, svg);
      el("rect", { x: -108, y: -29, width: 216, height: 58, rx: 29, fill: LIL, stroke: INK, "stroke-width": 3 }, pill);
      mono(pill, 0, 10, "Concepts", 30);
      const t1 = txt(svg, 96, 312, "Riemann Hypothesis", { "font-size": 84, "font-weight": 700 });
      const t2 = txt(svg, 96, 408, "proof", { "font-size": 84, "font-weight": 700 });
      const ul = el("path", { d: "M100 444 H330", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1, "stroke-dashoffset": 1 }, svg);
      const sub = txt(svg, 96, 512, "Made with Claude, checked in Lean", { "font-size": 40, "font-weight": 500, fill: MUTE });
      const when = txt(svg, 96, 566, "Checked 22 Nov 2026", { "font-family": MONO, "font-size": 28, "font-weight": 500, fill: CAP });
      let x = 96;
      const cards = ["17 million lines", "Lean", "20 Nov 2026"].map((s) => {
        const w = Math.max(170, s.length * 20.4 + 56), g = el("g", {}, svg), cx = x + w / 2;
        card(g, -w / 2, -55, w, 110, 20, MINT, LIL, 10);
        const label = mono(g, 0, 12, s, 34);
        x += w + 24;
        return { g, cx, label };
      });
      const row = sweepRow(svg, { n: 8, tw: 48, gap: 10, cx: 1272, ty: 232, th: 90, px: 1272, py: 646, s: 0.75, bw: 32, tin: 0.35, step: 0.07, tel: 0.45, times: [1.0, 1.5, 1.6, 4.1, 4.25, 4.9] });
      const S = (t, again) => Object.assign(row.state(t), {
        head: [0.1, 0.2, 0.3, 0.4, 0.5].map((d) => oc(seg(t, d, d + 0.45))), ul: oc(seg(t, 0.6, 1.0)),
        card: cards.map((_, i) => (again ? 1 : ob(seg(t, 4.5 + i * 0.12, 5.0 + i * 0.12)))),
        label: cards.map((_, i) => (again ? 1 : oc(seg(t, 4.85 + i * 0.12, 5.2 + i * 0.12)))),
      });
      const rp = replayer(api, S, 1.5);
      button(row.T.g, "Sweep the row again", () => rp.replay());
      return (t, now) => {
        const s = rp.at(t, now);
        tf(pill, 204, 160, 0.6 + 0.4 * ob(s.head[0])); pill.setAttribute("opacity", cl(s.head[0] * 2));
        [t1, t2, sub, when].forEach((n, i) => { n.setAttribute("opacity", s.head[i + 1]); n.setAttribute("transform", `translate(0 ${28 * (1 - s.head[i + 1])})`); });
        ul.setAttribute("stroke-dashoffset", 1 - s.ul);
        cards.forEach((c, i) => { tf(c.g, c.cx, 702 + 40 * (1 - s.card[i]), 0.85 + 0.15 * s.card[i]); c.g.setAttribute("opacity", cl(s.card[i] * 2)); c.label.setAttribute("opacity", s.label[i]); });
        row.draw(s);
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
