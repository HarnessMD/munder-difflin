/* Bright coded scenes for "How to remove vocals from a song with Audacity's free AI effects". Vanilla JS, no library.
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
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, s) => txt(svg, 756, 46, s, { "text-anchor": "end", "font-size": 18, fill: MUTE, "font-weight": 500 });
  /* a state is a flat object of numbers and number arrays; a tap mid play blends from where it was, so the replay never jumps */
  const mixS = (a, b, k) => { const o = {}; for (const key in b) { const y = b[key], x = a[key]; o[key] = Array.isArray(y) ? y.map((v, i) => lerp(x[i], v, k)) : lerp(x, y, k); } return o; };
  const blend = (S, W) => {
    let snap = null, cur = null;
    const f = (t) => { let s = S(t); if (snap) { if (t > W) snap = null; else s = mixS(snap, s, io(seg(t, 0, W))); } cur = s; return s; };
    f.grab = () => { snap = cur; };
    return f;
  };

  const SC = {};

  /* ---- 1. a record spins, then splits into four rings; time 0 equals the final frame so the loop is seamless ---- */
  SC.vinyl = {
    dur: 9, still: 9,
    build(svg, api) {
      const C = [400, 312], RL = 78, RO = 200, BW = (RO - RL) / 4, RF = 85, WF = 22;
      const RINGS = [["Drums", YEL, 150, 168], ["Bass", LIL, 650, 168], ["Vocals", SKY, 150, 456], ["Other Instruments", MINT, 650, 456]];
      hint(svg, "Tap the record");
      const hit = el("g", {}, svg);
      el("rect", { x: 34, y: 62, width: 732, height: 516, rx: 30, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, hit);
      const shL = el("g", {}, hit), bandL = el("g", {}, hit);
      const rings = RINGS.map(([name, col], i) => {
        const sh = el("circle", { fill: "none", stroke: LIL }, shL);
        const g = el("g", {}, bandL);
        const base = el("circle", { fill: "none", stroke: BLUE }, g);
        const paint = el("circle", { fill: "none", stroke: col, transform: "rotate(-90)" }, g);
        const gro = [0, 1].map(() => el("circle", { fill: "none", stroke: "#fff", "stroke-width": 1.4 }, g));
        const o1 = el("circle", { fill: "none", stroke: INK, "stroke-width": 3 }, g), o2 = el("circle", { fill: "none", stroke: INK, "stroke-width": 2.5 }, g);
        const lab = el("g", {}, g), words = name.split(" ");
        words.forEach((w, j) => txt(lab, 0, (words.length === 1 ? 8 : -6 + j * 26), w, { "text-anchor": "middle", "font-family": MONO, "font-size": words.length === 1 ? 21 : 18, "font-weight": 700 }));
        return { sh, g, base, paint, gro, o1, o2, lab };
      });
      el("circle", { cx: C[0] + 8, cy: C[1] + 8, r: RL, fill: LIL }, shL);
      const label = el("g", {}, hit);
      el("circle", { r: RL, fill: SOFT, stroke: INK, "stroke-width": 3 }, label);
      el("circle", { r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, label);
      txt(label, 0, -22, "Music", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      txt(label, 0, 36, "Separation", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      const sheen = el("g", {}, hit);
      [[118, -150, -110], [176, 20, 62]].forEach(([r, a0, a1]) => { const p = (a) => [C[0] + r * Math.cos(a * Math.PI / 180), C[1] + r * Math.sin(a * Math.PI / 180)], s = p(a0), e = p(a1); el("path", { d: `M${s[0]} ${s[1]} A${r} ${r} 0 0 1 ${e[0]} ${e[1]}`, fill: "none", stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round", "stroke-opacity": 0.6 }, sheen); });
      const S = (t) => {
        const s = { x: [], y: [], r: [], w: [], c: [], lb: [], k: [], rot: 0, gr: 0 };
        RINGS.forEach(([, , fx, fy], i) => {
          const ji = 1.2 + (3 - i) * 0.1, si = 4.8 + i * 0.1;
          const m = t < 3 ? 1 - io(seg(t, ji, ji + 1)) : io(seg(t, si, si + 1));
          s.x.push(lerp(C[0], fx, m)); s.y.push(lerp(C[1], fy, m));
          s.r.push(lerp(RO - BW * (i + 0.5), RF, m)); s.w.push(lerp(BW, WF, m));
          s.c.push(t < 3 ? 1 - oc(seg(t, 0.8 + i * 0.08, 1.3 + i * 0.08)) : oc(seg(t, si + 0.7, si + 1.2)));
          s.lb.push(t < 3 ? 1 - seg(t, 0.5 + i * 0.06, 0.8 + i * 0.06) : ob(seg(t, 6.3 + i * 0.1, 6.8 + i * 0.1)));
          s.k.push(t < 3 ? 1 : 1 + 0.07 * Math.sin(Math.PI * seg(t, si + 0.85, si + 1.25)));
        });
        s.rot = t < 2.4 ? 0 : 720 * io(seg(t, 2.4, 4.7));
        s.gr = t < 3 ? seg(t, 2.0, 2.4) : 1 - seg(t, 4.7, 5.0);
        return s;
      };
      const state = blend(S, 2.3);
      button(hit, "Music Separation: tap to join the rings and split the record again", () => { state.grab(); api.seek(0); });
      return (t) => {
        const s = state(t);
        rings.forEach((n, i) => {
          const r = s.r[i], w = s.w[i], L = 2 * Math.PI * r;
          n.sh.setAttribute("cx", s.x[i] + 8); n.sh.setAttribute("cy", s.y[i] + 8); n.sh.setAttribute("r", r); n.sh.setAttribute("stroke-width", w + 3);
          [n.base, n.paint].forEach((c) => { c.setAttribute("r", r); c.setAttribute("stroke-width", w); });
          n.paint.setAttribute("stroke-dasharray", `${L * cl(s.c[i])} ${L + 1}`); n.paint.setAttribute("opacity", s.c[i] > 0.002 ? 1 : 0);
          n.base.setAttribute("opacity", s.c[i] > 0.998 ? 0 : 1);
          n.gro.forEach((c, j) => { c.setAttribute("r", r + (j ? 1 : -1) * w / 4); c.setAttribute("stroke-opacity", 0.5 * s.gr); });
          n.o1.setAttribute("r", r + w / 2); n.o2.setAttribute("r", Math.max(1, r - w / 2));
          const lb = s.lb[i]; n.lab.setAttribute("opacity", cl(lb)); n.lab.setAttribute("transform", `scale(${0.6 + 0.4 * Math.max(0, lb)})`);
          tf(n.g, s.x[i], s.y[i], s.k[i]);
        });
        tf(label, C[0], C[1], 1, s.rot);
        sheen.setAttribute("transform", `rotate(${s.rot * 1.0 + 0} ${C[0]} ${C[1]})`); sheen.setAttribute("opacity", s.gr);
      };
    },
  };

  /* ---- 2. a mixing desk: Apply, two faders rise, Vocals slides down ---- */
  SC.faders = {
    dur: 9, still: 9,
    build(svg, api) {
      hint(svg, "Tap the desk");
      const hit = el("g", {}, svg);
      el("rect", { x: 46, y: 80, width: 712, height: 474, rx: 38, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, hit);
      el("rect", { x: 72, y: 108, width: 670, height: 430, rx: 28, fill: LIL }, hit);
      el("rect", { x: 60, y: 96, width: 670, height: 430, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, hit);
      el("path", { d: "M370 140 V482", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, hit);
      /* the Apply button on its lilac base */
      el("rect", { x: 104, y: 280, width: 220, height: 96, rx: 20, fill: LIL, stroke: INK, "stroke-width": 3 }, hit);
      const apply = el("g", {}, hit);
      el("rect", { x: 104, y: 266, width: 220, height: 96, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 3 }, apply);
      txt(apply, 214, 323, "Apply", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
      const TOP = 170, BOT = 372, X = [440, 585];
      const fad = ["Vocals", "Instrumental"].map((name, i) => {
        const x = X[i];
        for (let k = 0; k <= 8; k++) el("path", { d: `M${x - 48} ${TOP + (k * (BOT - TOP)) / 8} h16`, stroke: MUTE, "stroke-width": 2, "stroke-linecap": "round" }, hit);
        el("rect", { x: x - 8, y: TOP - 22, width: 16, height: BOT - TOP + 44, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, hit);
        const lvl = el("rect", { x: x - 5, width: 10, rx: 5, fill: LIL }, hit);
        const knob = el("g", {}, hit);
        el("rect", { x: -36, y: -18, width: 72, height: 36, rx: 9, fill: LIL, stroke: INK, "stroke-width": 3 }, knob);
        el("path", { d: "M-22 0 H22", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, knob);
        const lab = txt(hit, x, 452, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        return { x, lvl, knob, lab };
      });
      const halo = el("circle", { cx: 704, cy: 445, r: 20, fill: MINT }, hit);
      el("circle", { cx: 704, cy: 445, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, hit);
      const lamp = el("circle", { cx: 704, cy: 445, r: 9.5, fill: MINT }, hit);
      const blink = (u) => 0.5 + 0.5 * Math.cos((2 * Math.PI * u) / 0.8);
      const S = (t) => {
        const v0 = t < 2.6 ? io(seg(t, 0.4, 1.3)) * (1 - io(seg(t, 1.5, 2.1))) : ob(seg(t, 3.1, 4.1)) * (1 - io(seg(t, 4.8, 6.0)));
        const v1 = t < 2.6 ? 1 - io(seg(t, 1.58, 2.18)) : ob(seg(t, 3.2, 4.2));
        const lb = [0, 1].map((i) => (t < 2.6 ? 1 - seg(t, 1.4 + i * 0.08, 1.8 + i * 0.08) : ob(seg(t, 4.0 + i * 0.1, 4.45 + i * 0.1))));
        const light = t < 2.6 ? blink(t) * (1 - seg(t, 1.3, 1.6)) : t < 4.8 ? 0 : t < 8 ? blink(t - 4.8) : 1;
        const press = t < 2.4 ? 0 : Math.max(-0.2, oc(seg(t, 2.4, 2.6)) - ob(seg(t, 2.85, 3.15)));
        return { v: [v0, v1], lb, light, press };
      };
      const state = blend(S, 2.2);
      button(hit, "Mixing desk: tap to slide the Vocals fader back up and play it again", () => { state.grab(); api.seek(0); });
      return (t) => {
        const s = state(t);
        fad.forEach((f, i) => {
          const y = lerp(BOT, TOP, s.v[i]);
          tf(f.knob, f.x, y); f.lvl.setAttribute("y", Math.min(y, BOT + 18)); f.lvl.setAttribute("height", Math.max(0, BOT + 18 - y));
          f.lab.setAttribute("opacity", cl(s.lb[i])); f.lab.setAttribute("transform", `translate(0 ${12 * (1 - s.lb[i])})`);
        });
        lamp.setAttribute("opacity", cl(s.light)); halo.setAttribute("opacity", 0.4 * cl(s.light));
        apply.setAttribute("transform", `translate(0 ${12 * s.press})`);
      };
    },
  };

  /* ---- 3. a speedometer over three chips: CPU low, GPU and NPU high ---- */
  SC.speedometer = {
    dur: 9, still: 9,
    build(svg, api) {
      hint(svg, "Tap a chip");
      const C = [400, 282], A0 = 150, SW = 240;
      const ang = (v) => A0 + SW * v, pt = (r, a) => [C[0] + r * Math.cos(a * Math.PI / 180), C[1] + r * Math.sin(a * Math.PI / 180)];
      const arc = (r, a0, a1) => { const s = pt(r, a0), e = pt(r, a1); return `M${s[0]} ${s[1]} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${e[0]} ${e[1]}`; };
      el("circle", { cx: C[0] + 12, cy: C[1] + 12, r: 196, fill: LIL }, svg);
      el("circle", { cx: C[0], cy: C[1], r: 196, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: arc(160, A0, A0 + SW), stroke: BLUE, "stroke-width": 26, fill: "none" }, svg);
      el("path", { d: arc(173, A0, A0 + SW), stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      el("path", { d: arc(147, A0, A0 + SW), stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      [A0, A0 + SW].forEach((a) => { const s = pt(147, a), e = pt(173, a); el("path", { d: `M${s[0]} ${s[1]} L${e[0]} ${e[1]}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg); });
      const ticks = Array.from({ length: 13 }, (_, j) => { const a = ang(j / 12), s = pt(116, a), e = pt(j % 3 ? 128 : 136, a); return el("path", { d: `M${s[0]} ${s[1]} L${e[0]} ${e[1]}`, "stroke-width": j % 3 ? 3 : 4, "stroke-linecap": "round" }, svg); });
      const pill = el("g", {}, svg);
      el("rect", { x: -62, y: -27, width: 124, height: 54, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, pill);
      const read = txt(pill, 0, 11, "GPU", { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });
      const needle = el("g", {}, svg);
      el("path", { d: "M-22 0 L0 -9 L140 0 L0 9 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, needle);
      el("circle", { cx: C[0], cy: C[1], r: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: C[0], cy: C[1], r: 7, fill: YEL, stroke: INK, "stroke-width": 2 }, svg);
      const NAMES = ["CPU", "GPU", "NPU"], COLS = [MINT, SKY, LIL], VAL = [0.18, 0.86, 0.8];
      let man = null, cur = null;
      const chips = NAMES.map((name, i) => {
        const cx = 220 + i * 180, g = el("g", {}, svg);
        el("rect", { x: -91, y: -47, width: 182, height: 94, rx: 26, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7" }, g);
        const glow = el("rect", { x: -88, y: -44, width: 176, height: 88, rx: 26, fill: COLS[i] }, g);
        const body = el("g", {}, g);
        el("rect", { x: -75, y: -31, width: 150, height: 62, rx: 18, fill: COLS[i], stroke: INK, "stroke-width": 3 }, body);
        txt(body, 0, 9, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
        tf(g, cx, 544);
        button(g, `${name}: move the needle to this setting`, () => { man = { s: cur, i, at: api.now() }; api.poke(); });
        return { glow, body };
      });
      const SEQ = [[0, 1], [0.4, 0], [2.6, 2], [4.6, 0], [5.6, 1]];
      const step = (a, p, i, u) => {
        const up = VAL[i] > a.v;
        return {
          v: lerp(a.v, VAL[i], (up ? ob : io)(seg(u, 0.1, 1.0))),
          g: [0, 1, 2].map((j) => lerp(a.g[j], j === i ? 1 : 0, oc(seg(u, 0, 0.3)))),
          rd: u < 0.2 ? p : i, ro: u < 0.2 ? a.ro * (1 - seg(u, 0, 0.2)) : ob(seg(u, 0.8, 1.2)), pop: Math.sin(Math.PI * seg(u, 0, 0.4)) * (i === p ? 0 : 1), pi: i,
        };
      };
      const rest = (i) => ({ v: VAL[i], g: [0, 1, 2].map((j) => (j === i ? 1 : 0)), rd: i, ro: 1, pop: 0, pi: i });
      const S = (t) => { let k = 0; SEQ.forEach(([T], j) => { if (t >= T) k = j; }); if (k === 0) return rest(1); const p = SEQ[k - 1][1]; return step(rest(p), p, SEQ[k][1], t - SEQ[k][0]); };
      return (t, now) => {
        const s = man && man.s ? step(man.s, Math.round(man.s.rd), man.i, now - man.at) : S(t);
        cur = s;
        tf(needle, C[0], C[1], 1, ang(s.v));
        ticks.forEach((n, j) => n.setAttribute("stroke", s.v >= j / 12 - 0.001 ? INK : MUTE));
        read.textContent = NAMES[Math.round(s.rd)];
        pill.setAttribute("opacity", cl(s.ro)); tf(pill, C[0], C[1] + 100, 0.7 + 0.3 * Math.max(0, s.ro));
        chips.forEach((c, j) => {
          const g = cl(s.g[j]), pop = j === s.pi ? s.pop : 0;
          c.glow.setAttribute("opacity", 0.45 * g); c.glow.setAttribute("transform", `scale(${0.9 + 0.1 * g + 0.04 * pop})`);
          c.body.setAttribute("transform", `translate(0 ${-6 * g}) scale(${1 + 0.05 * pop})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3, still: 3,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: -68, y: -21, width: 136, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 7, "AI tools", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const under = el("path", { stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", fill: "none" }, svg);
      const title = txt(svg, 64, 164, "Remove vocals in Audacity", { "font-size": 58, "font-weight": 700 });
      let len = title.getComputedTextLength ? title.getComputedTextLength() : 800;
      if (len > 830) { title.setAttribute("font-size", (58 * 830) / len); len = 830; }
      const line = txt(svg, 64, 244, "Split a song into vocals and instrumental tracks inside Audacity", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const chk = txt(svg, 64, 288, "Checked 27 Nov 2026", { "font-family": MONO, "font-size": 19, "font-weight": 500, fill: CAP });
      const tile = (x, w, col, words, icon) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 10, y: 332, width: w, height: 170, rx: 22, fill: LIL }, g);
        el("rect", { x, y: 322, width: w, height: 170, rx: 22, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g), run = icon(ic); tf(ic, x + w / 2, 384);
        const lab = txt(g, x + w / 2, 462, words, { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        return { g, run, lab };
      };
      const rec = (g) => {
        const r = el("g", {}, g);
        el("circle", { r: 40, fill: BLUE, stroke: INK, "stroke-width": 3 }, r);
        [32, 24].forEach((q) => el("circle", { r: q, fill: "none", stroke: "#fff", "stroke-width": 1.5, "stroke-opacity": 0.55 }, r));
        el("path", { d: "M-22 -26 A34 34 0 0 1 8 -33", fill: "none", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", "stroke-opacity": 0.6 }, r);
        el("circle", { r: 13, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, r);
        el("circle", { r: 3, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, r);
        return (k) => r.setAttribute("transform", `rotate(${-200 * (1 - k)})`);
      };
      const fader = (g) => {
        [-30, -15, 0, 15, 30].forEach((y) => el("path", { d: `M-40 ${y} h12`, stroke: MUTE, "stroke-width": 2, "stroke-linecap": "round" }, g));
        el("rect", { x: -7, y: -44, width: 14, height: 88, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const kn = el("g", {}, g);
        el("rect", { x: -28, y: -14, width: 56, height: 28, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, kn);
        el("path", { d: "M-16 0 H16", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, kn);
        return (k) => kn.setAttribute("transform", `translate(0 ${lerp(28, -14, k)})`);
      };
      const tiles = [tile(64, 386, LIL, "Windows: Audacity 3.7.1", rec), tile(474, 422, MINT, "Mac: Audacity 3.7.4, pre release", fader)];
      return (t) => {
        const a = ob(seg(t, 0, 0.5)); tf(pill, 132, 70, 0.6 + 0.4 * a); pill.setAttribute("opacity", cl(a * 2));
        const b = oc(seg(t, 0.1, 0.6)); title.setAttribute("opacity", b); title.setAttribute("transform", `translate(0 ${18 * (1 - b)})`);
        under.setAttribute("d", `M66 184 H${66 + Math.max(1, (len - 4) * oc(seg(t, 0.35, 0.95)))}`);
        [line, chk].forEach((n, i) => { const k = oc(seg(t, 0.3 + i * 0.1, 0.8 + i * 0.1)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${14 * (1 - k)})`); });
        tiles.forEach((p, i) => {
          const k = ob(seg(t, 0.6 + i * 0.1, 1.15 + i * 0.1)); p.g.setAttribute("opacity", cl(k * 2)); p.g.setAttribute("transform", `translate(0 ${30 * (1 - k)})`);
          p.run(oc(seg(t, 0.9 + i * 0.1, 1.6 + i * 0.1)));
          const l = ob(seg(t, 1.4 + i * 0.1, 1.9 + i * 0.1)); p.lab.setAttribute("opacity", cl(l)); p.lab.setAttribute("transform", `translate(0 ${10 * (1 - l)})`);
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
