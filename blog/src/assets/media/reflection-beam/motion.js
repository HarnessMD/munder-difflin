/* Bright coded scenes for "Reflection AI Beam". Vanilla JS, no library.
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  const GREY = "#D9D0E4";
  /* a wall of small lamps, and the n lamps nearest a point (with a little jitter so the patch looks organic) */
  const wall = (svg, cols, n, x0, y0, px, py, r) => Array.from({ length: n }, (_, i) => {
    const x = x0 + (i % cols) * px, y = y0 + Math.floor(i / cols) * py;
    return { n: el("circle", { cx: x, cy: y, r, fill: SOFT, stroke: GREY, "stroke-width": 1.5 }, svg), x, y };
  });
  const patch = (lamps, x, y, n, salt) => lamps.map((l, i) => ({ l, d: Math.hypot(l.x - x, l.y - y) + (((i * 7919 + salt * 104729) % 97) / 97) * 9 })).sort((a, b) => a.d - b.d).slice(0, n).map((o) => o.l);

  const SC = {};

  /* ---- 1. a sealed parcel slides in: announced, with a tag and a sign up slip, but not open ---- */
  SC.parcel = {
    dur: 9, still: 6.5,
    build(svg, api) {
      txt(svg, 44, 62, "Announced on 5 October 2026", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap the parcel", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const slip = el("g", {}, svg);
      el("rect", { width: 236, height: 100, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, slip);
      txt(slip, 118, 34, "early access sign up", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("rect", { x: 16, y: 50, width: 204, height: 36, rx: 10, fill: SOFT }, slip);
      txt(slip, 30, 75, "email address", { "font-size": 20, "font-weight": 500, fill: MUTE });
      el("rect", { x: 40, y: 440, width: 728, height: 20, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const par = el("g", {}, svg);
      el("rect", { x: -158, y: -258, width: 340, height: 256, rx: 22, fill: LIL }, par);
      el("rect", { x: -170, y: -270, width: 340, height: 270, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, par);
      el("path", { d: "M-170 -214 H170", stroke: INK, "stroke-width": 3 }, par);
      el("rect", { x: -30, y: -242, width: 60, height: 56, rx: 8, fill: SKY, stroke: INK, "stroke-width": 3 }, par);
      txt(par, -144, -118, "Beam", { "font-size": 56, "font-weight": 700 });
      const lock = el("g", { transform: "translate(104 -128)" }, par);
      const shackle = el("path", { d: "M-15 -8 V-24 Q-15 -42 0 -42 Q15 -42 15 -24 V-8", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, lock);
      el("rect", { x: -26, y: -10, width: 52, height: 42, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, lock);
      el("circle", { cx: 0, cy: 8, r: 5, fill: INK }, lock); el("path", { d: "M0 10 V20", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, lock);
      let sx = -146;
      const stamps = [["open weight", -3], ["text-only", 2.5]].map(([s, rot]) => {
        const g = el("g", {}, par), r = el("rect", { y: -20, height: 40, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g), t = txt(g, 0, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        const w = t.getComputedTextLength() + 30; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
        const o = { g, x: sx + w / 2, rot }; sx += w + 12; return o;
      });
      const tag = el("g", {}, svg);
      el("path", { d: "M0 0 Q12 46 48 60", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, tag);
      const tr = el("rect", { x: 30, y: 16, height: 88, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 48, cy: 60, r: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 66, 52, "Reflection says", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const tq = txt(tag, 66, 84, "“later this month”", { "font-size": 22, "font-weight": 700 });
      tr.setAttribute("width", Math.max(tq.getComputedTextLength(), 150) + 54);
      const hit = el("rect", { x: -176, y: -276, width: 352, height: 282, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, par);
      const cap = strip(svg, 506, 600);
      let poked = -99;
      button(par, "The parcel is sealed. You cannot download it yet.", () => { poked = api.now(); api.poke(); });
      return (t, now) => {
        const w = now - poked, shake = w >= 0 && w < 0.9 ? Math.sin(w * 30) * 4 * (1 - w / 0.9) : 0;
        const slide = ob(seg(t, 0.3, 1.2)), sq = Math.sin(seg(t, 0.95, 1.3) * Math.PI) * 0.04;
        par.setAttribute("transform", `translate(${-200 + 520 * slide} 440) rotate(${shake}) scale(${1 - sq} ${1 + sq})`);
        stamps.forEach((s, i) => { const k = seg(t, 1.7 + i * 0.6, 2.0 + i * 0.6); s.g.setAttribute("opacity", k <= 0 ? 0 : 1); tf(s.g, s.x, -52, 2.2 - 1.2 * ob(k), s.rot); });
        const lk = ob(seg(t, 3.0, 3.4));
        shackle.setAttribute("transform", `translate(0 ${-13 * (1 - lk) + (shake ? Math.abs(shake) * -1.2 : 0)})`);
        const tt = t - 3.7;
        tag.setAttribute("opacity", tt < 0 ? 0 : seg(tt, 0, 0.15));
        tag.setAttribute("transform", `translate(490 178) rotate(${(tt < 0 ? -26 : -26 * Math.exp(-2.4 * tt) * Math.cos(7 * tt)) + Math.sin(now * 1.5) * 1.2 + shake * 1.5})`);
        tf(slip, 256 + 264 * ob(seg(t, 4.7, 5.3)), 340);
        slip.setAttribute("opacity", t < 4.7 ? 0 : 1);
        cap.textContent = w >= 0 && w < 3 ? "You cannot download it yet." : "As of 6 Oct 2026 there are no weights to download";
      };
    },
  };

  /* ---- 2. a wall of 501 lamps; a different patch of 23 lights for each token ---- */
  SC.lamps = {
    dur: 12.4, still: 10.8,
    build(svg) {
      txt(svg, 44, 62, "501 billion total, 23 billion active", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "Reflection says", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const X0 = 66.5, Y0 = 104, PX = 23, PY = 19;
      const L = wall(svg, 30, 501, X0, Y0, PX, PY, 7);
      const words = ["the", "parameters", "activated", "per", "token"], S = (i) => 0.8 + i * 2.2;
      const seeds = [[5, 4], [22, 11], [11, 13], [25, 3], [15, 7]].map(([c, r]) => [X0 + c * PX, Y0 + r * PY]);
      const cls = seeds.map(([x, y], i) => patch(L, x, y, 23, i + 1));
      const all = [...new Set(cls.flat())];
      const chips = words.map((s) => {
        const g = el("g", {}, svg), r = el("rect", { y: -23, height: 46, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, g), t = txt(g, 0, 7, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        const w = t.getComputedTextLength() + 34; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
        return { g, r, w };
      });
      let x = 400 - (chips.reduce((a, c) => a + c.w, 0) + 14 * 4) / 2;
      chips.forEach((c) => { c.x = x + c.w / 2; x += c.w + 14; });
      const key = (cx, fill, stroke, s) => { const c = el("circle", { cy: 533, r: 9, fill, stroke, "stroke-width": 2 }, svg), t = txt(svg, 0, 540, s, { "font-size": 20, "font-weight": 500 }); return { c, t, w: 28 + t.getComputedTextLength() }; };
      const k1 = key(0, SOFT, GREY, "501 lamps, 1 billion parameters each"), k2 = key(0, YEL, INK, "23 active per token");
      let kx = 400 - (k1.w + k2.w + 40) / 2;
      [k1, k2].forEach((k) => { k.c.setAttribute("cx", kx + 9); k.t.setAttribute("x", kx + 28); kx += k.w + 40; });
      const dot = el("circle", { r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      return (t) => {
        const end = seg(t, 11.7, 12.1), lit = new Map();
        cls.forEach((c, i) => c.forEach((l, j) => {
          const a = S(i) + 0.5 + (j / 23) * 0.3, k = ob(seg(t, a, a + 0.3)) * (1 - (i < 4 ? seg(t, S(i + 1) + 0.35, S(i + 1) + 0.7) : end));
          if (k > (lit.get(l) || 0)) lit.set(l, k);
        }));
        all.forEach((l) => { const k = lit.get(l) || 0, on = k > 0.3; l.n.setAttribute("r", 7 + 2 * k); l.n.setAttribute("fill", on ? YEL : SOFT); l.n.setAttribute("stroke", on ? INK : GREY); l.n.setAttribute("stroke-width", on ? 2 : 1.5); });
        let cur = -1; words.forEach((_, i) => { if (t >= S(i)) cur = i; });
        chips.forEach((c, i) => { const k = seg(t, S(i), S(i) + 0.35); tf(c.g, c.x, 462, 0.6 + 0.4 * ob(k)); c.g.setAttribute("opacity", k <= 0 ? 0 : 1 - end); c.r.setAttribute("fill", i === cur ? YEL : "#fff"); });
        const m = cur < 0 ? 0 : seg(t, S(cur) + 0.1, S(cur) + 0.55);
        if (cur >= 0 && m > 0 && m < 1) { const e = io(m), [sx, sy] = seeds[cur]; dot.setAttribute("cx", chips[cur].x + (sx - chips[cur].x) * e); dot.setAttribute("cy", 436 + (sy - 436) * e); dot.setAttribute("opacity", 1); } else dot.setAttribute("opacity", 0);
      };
    },
  };

  /* ---- 3. four balloons, one benchmark at a time ---- */
  SC.balloons = {
    dur: 15.6, still: 1.8,
    build(svg, api) {
      const M = [["Beam", YEL], ["GLM 5.2", BLUE], ["Qwen 3.8 Max", LIL], ["Kimi K3", SKY]];
      const B = [["SWE Bench Pro v1", ["65.5", "62.1", "67.7", null]], ["Terminal Bench v2.1", ["80.1", "81.0", "86.6", "88.3"]], ["DeepSWE v1.1", ["44.4", "44.0", "51.0", "68.0"]], ["MCP Atlas", ["78.7", "77.8", "84.5", "82.3"]], ["HLE no tools", ["36.2", "40.5", "43.6", "46.9"]], ["GPQA Diamond", ["90.5", "91.2", "92.6", "93.5"]]];
      const X = [160, 320, 480, 640], G = 450, P = 2.6;
      const at = (b, i) => { const v = B[b][1][i]; return v == null ? { y: G - 62, nr: 1 } : { y: G - parseFloat(v) * 2.6, nr: 0 }; };
      const lead = B.map(([, v]) => v.reduce((m, s, i) => (s != null && (m < 0 || parseFloat(s) > parseFloat(v[m])) ? i : m), -1));
      txt(svg, 44, 62, "Reflection's own figures", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Our selection of six rows. We did not run them. NR means not reported.", { "font-size": 20, "font-weight": 500, fill: MUTE });
      el("path", { d: `M70 ${G} H730`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const bal = M.map(([name, col], i) => {
        const str = el("path", { stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
        el("circle", { cx: X[i], cy: G, r: 6, fill: INK }, svg);
        txt(svg, X[i], G + 36, name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        const g = el("g", {}, svg);
        const kn = el("path", { d: "M-7 55 L0 44 L7 55 Z", fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        const e = el("ellipse", { rx: 42, ry: 46, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const v = txt(g, 0, 8, "", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        return { str, g, e, v, col, kn };
      });
      const flag = el("g", {}, svg);
      el("rect", { x: -46, y: -16, width: 92, height: 32, rx: 16, fill: MINT, stroke: INK, "stroke-width": 2.5 }, flag);
      txt(flag, 0, 7, "ahead", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("rect", { x: 214, y: 516, width: 372, height: 48, rx: 24, fill: SOFT }, svg);
      const name = txt(svg, 400, 548, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      let user = null, shown = 0;
      const step = (d) => { user = { from: shown, to: (shown + d + 6) % 6, t0: api.now() }; api.poke(); };
      [[-1, 180, "Previous benchmark", "M5 -9 L-5 0 L5 9"], [1, 620, "Next benchmark", "M-5 -9 L5 0 L-5 9"]].forEach(([d, x, label, arrow]) => {
        const g = el("g", { transform: `translate(${x} 540)` }, svg);
        el("circle", { r: 30, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("circle", { r: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: arrow, stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        button(g, label, () => step(d));
        g.addEventListener("keydown", (e) => { const s = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0; if (s) { e.preventDefault(); step(s); } });
      });
      return (t, now) => {
        let idx, prev, u;
        if (user) { idx = user.to; prev = user.from; u = cl((now - user.t0) / P); }
        else { idx = Math.floor(t / P) % 6; prev = (idx + 5) % 6; u = (t % P) / P; }
        shown = idx; name.textContent = B[idx][0];
        const k = ob(seg(u, 0, 0.3)), pos = [];
        bal.forEach((b, i) => {
          const a = at(prev, i), c = at(idx, i), y = a.y + (c.y - a.y) * k, s = 1 - 0.22 * cl(a.nr + (c.nr - a.nr) * k), x = X[i] + Math.sin(now * 1.3 + i * 1.7) * 5;
          tf(b.g, x, y, s); pos.push([x, y - 46 * s]);
          b.str.setAttribute("d", `M${X[i]} ${G} Q${X[i]} ${(y + G) / 2 + 20} ${x} ${y + 55 * s}`);
          b.v.textContent = B[idx][1][i] == null ? "NR" : B[idx][1][i];
          b.e.setAttribute("fill", c.nr ? "#fff" : b.col); b.kn.setAttribute("fill", c.nr ? "#fff" : b.col); b.e.setAttribute("stroke-dasharray", c.nr ? "7 7" : "none");
        });
        const f = ob(seg(u, 0.3, 0.48)), [fx, fy] = pos[lead[idx]];
        tf(flag, fx, fy - 26, f); flag.setAttribute("opacity", f <= 0 ? 0 : 1);
      };
    },
  };

  /* ---- 4. two kettles reach the boil; one counts far fewer blocks of compute ---- */
  SC.kettles = {
    dur: 12, still: 9.6,
    build(svg) {
      txt(svg, 44, 62, "Reflection's claim", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "On advanced reasoning benchmarks, against the larger GLM 5.2", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const BOIL = 7;
      const mk = (x, name, col, times, maybe) => {
        const steam = [0, 1, 2].map(() => el("circle", { fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
        const flames = [-34, 0, 34].map((dx) => el("path", { d: "M0 0 Q-11 -10 0 -24 Q11 -10 0 0 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x + dx} 290)` }, svg));
        el("rect", { x: x - 84, y: 290, width: 168, height: 34, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        const k = el("g", {}, svg);
        el("path", { d: "M-34 -70 Q0 -126 34 -70", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, k);
        el("path", { d: "M46 -44 L80 -70 L90 -58 L56 -18 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, k);
        el("path", { d: "M-50 0 Q-62 -70 0 -76 Q62 -70 50 0 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, k);
        const lid = el("g", {}, k); el("path", { d: "M-26 -74 Q0 -88 26 -74", stroke: INK, "stroke-width": 3, fill: "#fff", "stroke-linejoin": "round" }, lid); el("circle", { cy: -88, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, lid);
        txt(svg, x, 350, "inference compute", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
        const slots = Array.from({ length: 12 }, (_, i) => {
          const bx = x - 92 + (i % 4) * 48 + 20, by = 362 + Math.floor(i / 4) * 32 + 12;
          el("rect", { x: bx - 20, y: by - 12, width: 40, height: 24, rx: 7, fill: "#fff", stroke: GREY, "stroke-width": 2, "stroke-dasharray": "4 4" }, svg);
          const f = el("rect", { x: -20, y: -12, width: 40, height: 24, rx: 7, fill: col, stroke: INK, "stroke-width": 2.5 }, svg);
          if (i === maybe) { f.setAttribute("stroke-dasharray", "5 4"); f.setAttribute("fill-opacity", 0.45); }
          return { f, bx, by };
        });
        txt(svg, x, 492, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        return (t) => {
          const heat = seg(t, 0.8, 1.2) * (1 - seg(t, 11.4, 11.9)), boil = seg(t, BOIL, BOIL + 0.4) * (1 - seg(t, 11.4, 11.9));
          k.setAttribute("transform", `translate(${x} 266) rotate(${Math.sin(t * 22 + x) * 1.2 * seg(t, 3, BOIL) * (1 - boil)})`);
          lid.setAttribute("transform", `translate(0 ${-5 * boil * Math.abs(Math.sin(t * 9 + x))})`);
          flames.forEach((f, i) => f.setAttribute("transform", `translate(${x + (i - 1) * 34} 290) scale(${heat * (0.8 + 0.25 * Math.sin(t * 13 + i * 2 + x))})`));
          steam.forEach((s, j) => { const p = (t * 0.55 + j / 3) % 1; s.setAttribute("cx", x + 88 + Math.sin(p * 5 + j) * 9 + 14 * p); s.setAttribute("cy", 196 - 62 * p); s.setAttribute("r", 7 + 9 * p); s.setAttribute("opacity", boil * Math.sin(p * Math.PI)); });
          slots.forEach((s, i) => { const a = times[i], q = a == null ? 0 : seg(t, a, a + 0.3) * (1 - seg(t, 11.4, 11.9)); tf(s.f, s.bx, s.by, ob(q)); s.f.setAttribute("opacity", q <= 0 ? 0 : 1); });
        };
      };
      const a = mk(180, "GLM 5.2", BLUE, Array.from({ length: 12 }, (_, i) => 1 + i * 0.5), -1);
      const b = mk(620, "Beam", YEL, [1, 3, 5, 6.5], 3);
      const pill = el("g", {}, svg), pr = el("rect", { y: -22, height: 44, rx: 22, fill: MINT, stroke: INK, "stroke-width": 3 }, pill), pt = txt(pill, 0, 7, "scores comparably", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const pw = pt.getComputedTextLength() + 36; pr.setAttribute("x", -pw / 2); pr.setAttribute("width", pw);
      const l1 = txt(svg, 400, 540, "Reflection says: 3 to 4 times less inference compute", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const l2 = txt(svg, 400, 572, "“an approximate compute comparison rather than measured inference cost”", { "text-anchor": "middle", "font-size": 20, "font-weight": 500, fill: MUTE });
      return (t) => {
        a(t); b(t);
        const out = 1 - seg(t, 11.4, 11.9), p = ob(seg(t, 7.3, 7.7)) * out;
        tf(pill, 400, 240, p); pill.setAttribute("opacity", p <= 0 ? 0 : 1);
        const k1 = oc(seg(t, 8, 8.5)) * out, k2 = oc(seg(t, 8.4, 8.9)) * out;
        l1.setAttribute("opacity", k1); l1.setAttribute("transform", `translate(0 ${12 * (1 - k1)})`);
        l2.setAttribute("opacity", k2);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 150, "Reflection AI Beam", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 178 H700", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 236, "The 501B open weight model, explained", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const L = wall(svg, 38, 304, 73, 300, 22, 22, 8);
      patch(L, 73 + 27 * 22, 300 + 3.5 * 22, 23, 3).forEach((l) => { l.n.setAttribute("fill", YEL); l.n.setAttribute("stroke", INK); l.n.setAttribute("stroke-width", 2.5); l.n.setAttribute("r", 9.5); });
      return () => {};
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
