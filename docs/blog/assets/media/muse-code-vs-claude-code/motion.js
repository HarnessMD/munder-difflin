/* Bright coded scenes for "Muse Code vs Claude Code". Vanilla JS, no library.
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

  const lerp = (a, b, k) => a + (b - a) * k;
  /* a rounded label sized to its words, centred on 0,0 of its group */
  const pill = (g, s, fill, fs = 20) => {
    const r = el("rect", { y: -fs, height: fs * 2, rx: fs, fill, stroke: INK, "stroke-width": 3 }, g), t = txt(g, 0, fs * 0.36, s, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 });
    const w = t.getComputedTextLength() + fs * 1.4; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return w;
  };
  /* a damped ring: 0 before it starts, then a fading wobble */
  const ringing = (w, amp, f = 8, d = 1.6) => (w < 0 ? 0 : amp * Math.exp(-d * w) * Math.sin(f * w));

  const SC = {};

  /* ---- 1. four bells on a string, one per plan; each rings and its price tag swings out ---- */
  SC.bells = {
    dur: 12, still: 7.9,
    build(svg, api) {
      txt(svg, 44, 62, "Muse Code's four plans", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a bell", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const PL = [
        ["Everyday Usage", "$5.00", MINT, 0.72, "Everyday Usage, $5.00/month: 10 to 50 prompts every 5 hours"],
        ["High Usage", "$15.00", SKY, 0.9, "High Usage, $15.00/month: 5x more usage than Everyday Usage"],
        ["Power Usage", "$50.00", LIL, 1.08, "Power Usage, $50.00/month: Muse Wonder Full; 20x more usage"],
        ["Maximum Usage", "$200.00", YEL, 1.26, "Maximum Usage, $200.00/month: 80x more usage than Everyday"],
      ];
      const X = [128, 308, 490, 672], RING = [1, 2.6, 4.2, 5.8], ALL = 7.4, TY = 318;
      const sy = (x) => { const s = (x - 40) / 720; return 112 + 76 * s * (1 - s); };
      el("path", { d: "M40 112 Q400 150 760 112", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg);
      [40, 760].forEach((x) => el("circle", { cx: x, cy: 112, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      const bellD = (k) => {
        const f = (v) => (v * k).toFixed(1);
        return `M0 ${f(16)} C${f(-26)} ${f(16)} ${f(-34)} ${f(34)} ${f(-36)} ${f(60)} C${f(-38)} ${f(84)} ${f(-46)} ${f(96)} ${f(-62)} ${f(104)} L${f(-62)} ${f(112)} H${f(62)} L${f(62)} ${f(104)} C${f(46)} ${f(96)} ${f(38)} ${f(84)} ${f(36)} ${f(60)} C${f(34)} ${f(34)} ${f(26)} ${f(16)} 0 ${f(16)} Z`;
      };
      let pinned = -1;
      const rung = [-99, -99, -99, -99];
      const B = PL.map(([name, price, col, k], i) => {
        const x = X[i], y = sy(x), g = el("g", {}, svg), M = 112 * k - 16 * k + 7;
        el("rect", { x: x - 86, y: y - 4, width: 172, height: 474 - y, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const arcs = el("g", {}, g), AR = [];
        [-1, 1].forEach((d) => [0].forEach((j) => AR.push(el("path", { d: `M${d * (66 * k + 12 + j * 16)} ${70 * k - 16 - j * 8} q${d * (10 + j * 6)} ${16 + j * 8} 0 ${32 + j * 16}`, stroke: BLUE, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, arcs))));
        const tag = el("g", {}, g), L = TY - (y + M);
        el("path", { d: `M0 0 V${L}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
        el("rect", { x: -72, y: L, width: 144, height: 82, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, tag);
        el("circle", { cx: 0, cy: L + 13, r: 5, fill: col, stroke: INK, "stroke-width": 2.5 }, tag);
        txt(tag, 0, L + 50, price, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        txt(tag, 0, L + 72, "a month", { "text-anchor": "middle", "font-size": 18, "font-weight": 500, fill: MUTE });
        const bell = el("g", {}, g);
        el("circle", { cx: 0, cy: 16 * k - 7, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, bell);
        const clap = el("g", {}, bell);
        el("path", { d: `M0 ${16 * k} V${112 * k + 4}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, clap);
        el("circle", { cx: 0, cy: 112 * k + 10, r: 9, fill: INK }, clap);
        el("path", { d: bellD(k), fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bell);
        el("path", { d: `M${-50 * k} ${98 * k} Q0 ${92 * k} ${50 * k} ${98 * k}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, bell);
        el("path", { d: `M${-20 * k} ${30 * k} Q${-27 * k} ${50 * k} ${-28 * k} ${74 * k}`, stroke: "#fff", "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, bell);
        txt(g, x, 452, name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        button(g, PL[i][4], () => { pinned = i; rung[i] = api.now(); api.poke(); });
        return { x, y, k, M, bell, clap, tag, arcs, AR };
      });
      const cap = strip(svg, 504, 740);
      return (t, now) => {
        const out = seg(t, 11.2, 11.8);
        let last = -1;
        B.forEach((b, i) => {
          const w1 = t - RING[i], w2 = t - ALL, wu = now - rung[i];
          const a = ringing(w1, 12) + ringing(w2, 9) + (wu < 5 ? ringing(wu, 12) : 0);
          b.bell.setAttribute("transform", `translate(${b.x} ${b.y}) rotate(${a}) translate(0 ${7 - 16 * b.k})`);
          b.clap.setAttribute("transform", `rotate(${-a * 0.9} 0 ${16 * b.k})`);
          const r = (a * Math.PI) / 180, mx = b.x - b.M * Math.sin(r), my = b.y + b.M * Math.cos(r);
          const sw = ringing(w1 - 0.12, -9, 7, 1.3) + ringing(w2 - 0.12, -7, 7, 1.3) + (wu < 5 ? ringing(wu - 0.12, -9, 7, 1.3) : 0) + Math.sin(now * 1.3 + i) * 1.2;
          const rv = rung[i] > -99 ? 1 : ob(seg(t, RING[i] + 0.05, RING[i] + 0.45)) * (1 - out);
          b.tag.setAttribute("transform", `translate(${mx} ${my}) rotate(${sw}) scale(${cl(0.6 + 0.4 * rv, 0, 1.1)})`);
          b.tag.setAttribute("opacity", rv <= 0.01 ? 0 : cl(rv * 1.5));
          const pulse = (w) => (w >= 0 && w < 1.3 ? 1 - w / 1.3 : 0), p = Math.max(pulse(w1), pulse(w2), wu < 5 ? pulse(wu) : 0);
          b.arcs.setAttribute("transform", `translate(${b.x} ${b.y})`);
          b.arcs.setAttribute("opacity", p);
          if (t >= RING[i] && t < 11.2) last = i;
        });
        cap.textContent = pinned >= 0 ? PL[pinned][4] : last < 0 || t >= 11.2 ? "Meta's Muse Code page, read 14 Oct 2026" : t >= ALL ? "From $5.00 to $200.00 a month" : PL[last][4];
      };
    },
  };

  /* ---- 2. two umbrella stands: Muse models drop into one, Claude models into the other ---- */
  SC.umbrellas = {
    dur: 12, still: 9.4,
    build(svg, api) {
      txt(svg, 44, 62, "Which models do they use?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a stand", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const RY = 384, F = 482, O = 156;
      el("path", { d: `M40 ${F} H760`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const umb = (g, col) => {
        el("path", { d: "M0 2 V-44 a16 16 0 0 0 -32 0 v8", stroke: INK, "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, g);
        el("path", { d: "M-7 0 L-22 34 Q-30 200 -12 284 L0 300 L12 284 Q30 200 22 34 L7 0 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M0 10 Q-6 160 0 290 M-12 32 Q-17 160 -5 280", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, g);
        el("path", { d: "M0 300 V312", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
      };
      const ST = [
        { cx: 270, W: 270, col: SKY, label: "Muse Code", line: "Muse Code uses Meta's Muse models", tap: "Power Usage adds “the most powerful Muse models”" },
        { cx: 592, W: 230, col: LIL, label: "Claude Code", line: "Claude Code uses Claude models", tap: "Claude Code runs Anthropic's Claude models" },
      ];
      ST.forEach((s) => el("ellipse", { cx: s.cx, cy: RY, rx: s.W / 2, ry: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg));
      const U = [];
      [["Muse Spark", YEL, 190, 40], ["Muse Wonder", LIL, 270, 102], ["Muse Image", MINT, 350, 164]].forEach(([s, col, x, py], i) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        umb(g, col);
        U.push({ g, s, x, py, st: 0, t0: 0.9 + i * 0.75 });
      });
      {
        const g = el("g", { "pointer-events": "none" }, svg);
        [[-36, BLUE], [36, YEL]].forEach(([dx, col]) => umb(el("g", { transform: `translate(${dx} 0)` }, g), col));
        U.push({ g, s: "Claude models", x: 592, py: 102, st: 1, t0: 3.6, fs: 22 });
      }
      U.forEach((u) => { u.pg = el("g", { "pointer-events": "none" }, svg); u.p = el("g", {}, u.pg); pill(u.p, u.s, "#fff", u.fs || 20); });
      const hit = [-99, -99];
      let pinned = -1;
      ST.forEach((s, i) => {
        const L = s.cx - s.W / 2, R = s.cx + s.W / 2, g = el("g", {}, svg);
        el("rect", { x: L - 10, y: 116, width: s.W + 20, height: F + 10 - 116, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: `M${L} ${RY} L${L + 12} ${F} H${R - 12} L${R} ${RY} A${s.W / 2} 16 0 0 1 ${L} ${RY} Z`, fill: s.col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const pw = s.label.length * 14 + 30;
        el("rect", { x: s.cx - pw / 2, y: RY + 32, width: pw, height: 46, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, s.cx, RY + 63, s.label, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        button(g, `${s.label}: ${s.tap}`, () => { pinned = i; hit[i] = api.now(); api.poke(); });
      });
      const cap = strip(svg, 504, 740);
      return (t, now) => {
        const out = seg(t, 11.2, 11.8);
        U.forEach((u, i) => {
          const q = seg(t, u.t0, u.t0 + 0.5), bo = Math.sin(seg(t, u.t0 + 0.5, u.t0 + 0.85) * Math.PI) * -12;
          const w = now - hit[u.st], jig = w >= 0 && w < 1.2 ? Math.sin(w * 14) * 7 * (1 - w / 1.2) : 0;
          const sway = Math.sin(now * 1.1 + i * 1.7) * 1 + jig;
          const tr = `translate(${u.x} ${O - 470 * (1 - q * q) + bo}) rotate(${sway} 0 ${RY - O})`, op = hit[u.st] > -99 ? 1 : seg(t, u.t0, u.t0 + 0.1) * (1 - out);
          u.g.setAttribute("transform", tr); u.pg.setAttribute("transform", tr);
          u.g.setAttribute("opacity", op); u.pg.setAttribute("opacity", op);
          const pk = hit[u.st] > -99 ? 1 : ob(seg(t, u.t0 + 0.55, u.t0 + 0.95));
          u.p.setAttribute("transform", `translate(0 ${u.py}) scale(${cl(pk, 0, 1.2)})`);
          u.p.setAttribute("opacity", pk <= 0.01 ? 0 : 1);
        });
        cap.textContent = pinned >= 0 ? ST[pinned].tap : t < 0.9 || t >= 11.2 ? "Each comes from one lab and runs that lab's models" : t < 3.6 ? ST[0].line : t < 6.4 ? ST[1].line : "Every Muse Code plan lists Muse Spark, Muse Wonder and Muse Image";
      };
    },
  };

  /* ---- 3. a brass telescope swings across two signs and brings each platform into focus ---- */
  SC.telescope = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "Where do they run?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a platform", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const MUSE = "Meta's page: “Available for MacOS and Windows.”";
      const IT = [
        ["MacOS", YEL, 0, 0, MUSE], ["Windows", MINT, 0, 1, MUSE],
        ["terminal", SKY, 1, 0, "Claude Code's overview names the terminal"], ["IDE", LIL, 1, 0, "IDE extensions for VS Code and JetBrains"],
        ["desktop app", MINT, 1, 1, "Claude Code's overview names a desktop app"], ["web", YEL, 1, 1, "And the web at claude.ai/code"],
      ];
      const BD = [{ x0: 34, x1: 304, name: "Muse Code", sh: LIL }, { x0: 440, x1: 766, name: "Claude Code", sh: SKY }];
      const BT = 86, BB = 318, RW = [194, 264], PH = 56, PX = 372, PY = 420;
      BD.forEach((b) => {
        el("rect", { x: b.x0 + 10, y: BT + 10, width: b.x1 - b.x0, height: BB - BT, rx: 22, fill: b.sh }, svg);
        el("rect", { x: b.x0, y: BT, width: b.x1 - b.x0, height: BB - BT, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, (b.x0 + b.x1) / 2, BT + 44, b.name, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        el("path", { d: `M${b.x0 + 22} ${BT + 64} H${b.x1 - 22}`, stroke: SOFT, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      });
      const beam = el("path", { fill: LIL, "fill-opacity": 0.22 }, svg);
      const defs = el("defs", {}, svg);
      let user = null, curA = -90;
      const S = IT.map(([s, col, b, row, line], i) => {
        const g = el("g", {}, svg), f = el("filter", { id: `mg-tel-${i}`, x: "-40%", y: "-80%", width: "180%", height: "260%" }, defs);
        const blur = el("feGaussianBlur", { stdDeviation: 6 }, f);
        const ring = el("rect", { y: RW[row] - PH / 2 - 7, height: PH + 14, rx: PH / 2 + 7, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const v = el("g", { filter: `url(#mg-tel-${i})` }, g);
        const r = el("rect", { y: RW[row] - PH / 2, height: PH, rx: PH / 2, fill: col, stroke: INK, "stroke-width": 3 }, v);
        const tx = txt(v, 0, RW[row] + 8, s, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        const w = Math.max(88, tx.getComputedTextLength() + 36);
        button(g, `${s}: ${line}`, () => { user = { from: curA, i, t0: api.now() }; api.poke(); });
        return { s, b, row, line, w, r, ring, tx, v, blur };
      });
      [0, 1].forEach((b) => [0, 1].forEach((row) => {
        const R = S.filter((o) => o.b === b && o.row === row), tot = R.reduce((a, o) => a + o.w, 0) + 18 * (R.length - 1);
        let x = (BD[b].x0 + BD[b].x1) / 2 - tot / 2;
        R.forEach((o) => { o.cx = x + o.w / 2; o.r.setAttribute("x", x); o.r.setAttribute("width", o.w); o.ring.setAttribute("x", x - 7); o.ring.setAttribute("width", o.w + 14); o.tx.setAttribute("x", o.cx); x += o.w + 18; });
      }));
      S.forEach((o) => { o.ang = (Math.atan2(RW[o.row] - PY, o.cx - PX) * 180) / Math.PI; });
      el("path", { d: "M40 482 H760", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${PX} ${PY} L${PX - 62} 482 M${PX} ${PY} L${PX + 62} 482 M${PX} ${PY} V482`, stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, svg);
      const scope = el("g", { "pointer-events": "none" }, svg);
      el("rect", { x: -76, y: -12, width: 28, height: 24, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, scope);
      el("path", { d: "M-52 -15 L88 -24 V24 L-52 15 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, scope);
      el("path", { d: "M4 -19 V19 M46 -22 V22", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, scope);
      el("rect", { x: 84, y: -30, width: 28, height: 60, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, scope);
      el("ellipse", { cx: 113, cy: 0, rx: 4.5, ry: 22, fill: SKY, stroke: INK, "stroke-width": 2.5 }, scope);
      el("circle", { cx: PX, cy: PY, r: 11, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      const FT = [1.2, 2.6, 4.2, 5.4, 6.6, 7.8];
      const cap = strip(svg, 504, 740);
      return (t, now) => {
        const out = seg(t, 11, 11.6);
        let a = -90, cur = -1;
        S.forEach((o, i) => { a = lerp(a, o.ang, io(seg(t, FT[i] - 0.8, FT[i]))); if (t >= FT[i] - 0.2) cur = i; });
        a = lerp(a, -90, io(seg(t, 11, 11.8)));
        let tgt = cur >= 0 && t < 11 ? cur : -1, bo = tgt >= 0 ? seg(t, FT[tgt] - 0.1, FT[tgt] + 0.25) : 0;
        if (user) { const k = io(cl((now - user.t0) / 0.6)); a = lerp(user.from, S[user.i].ang, k); tgt = user.i; bo = seg(k, 0.8, 1); }
        curA = a;
        tf(scope, PX, PY, 1, a);
        S.forEach((o, i) => {
          const fo = user ? 1 : seg(t, FT[i] - 0.2, FT[i] + 0.3) * (1 - out);
          o.blur.setAttribute("stdDeviation", (7 * (1 - fo)).toFixed(2));
          o.v.setAttribute("opacity", (0.3 + 0.7 * fo).toFixed(3));
          const pop = user && user.i === i ? Math.sin(seg(now - user.t0, 0.5, 0.9) * Math.PI) * 0.08 : Math.sin(seg(t, FT[i], FT[i] + 0.35) * Math.PI) * 0.08;
          o.v.setAttribute("transform", `translate(${o.cx} ${RW[o.row]}) scale(${1 + pop}) translate(${-o.cx} ${-RW[o.row]})`);
        });
        if (tgt >= 0 && bo > 0) {
          const r = (a * Math.PI) / 180, ox = PX + 116 * Math.cos(r), oy = PY + 116 * Math.sin(r), o = S[tgt], y = RW[o.row];
          beam.setAttribute("d", `M${ox.toFixed(1)} ${oy.toFixed(1)} L${o.cx - o.w / 2 + 10} ${y} L${o.cx + o.w / 2 - 10} ${y} Z`);
          beam.setAttribute("opacity", bo);
        } else beam.setAttribute("opacity", 0);
        cap.textContent = user ? S[user.i].line : cur < 0 || t >= 11 ? "Meta's Muse Code page and Anthropic's Claude Code overview" : t >= 9 ? "The Muse Code page does not mention Linux." : S[cur].line;
      };
    },
  };

  /* ---- 4. a desk fan turns to each paper sign; the sign flutters and shows its tag ---- */
  SC.fan = {
    dur: 12, still: 7,
    build(svg, api) {
      txt(svg, 44, 62, "Which should you pick?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a sign", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const F = 482, HX = 400, HY = 222, PT = 132, PH = 150;
      const LINES = ["Pick Muse Code if price matters most", "Pick Claude Code if you need Linux, an IDE or the browser"];
      el("path", { d: `M40 ${F} H760`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const SG = [
        { cx: 150, name: "Muse Code", tag: ["$5.00 a month"], col: YEL, dir: -1, t0: 1.9 },
        { cx: 650, name: "Claude Code", tag: ["terminal, IDE,", "desktop and web"], col: SKY, dir: 1, t0: 5.3 },
      ];
      let user = null, curP = 0;
      SG.forEach((s, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: s.cx - 106, y: PT - 22, width: 212, height: F - PT + 30, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: `M${s.cx} ${PT - 6} V${F - 8}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
        el("rect", { x: s.cx - 46, y: F - 14, width: 92, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        const tag = el("g", {}, g), th = s.tag.length * 28 + 34;
        el("path", { d: "M0 0 V32", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
        el("rect", { x: -98, y: 30, width: 196, height: th, rx: 14, fill: s.col, stroke: INK, "stroke-width": 3 }, tag);
        s.tag.forEach((l, j) => txt(tag, 0, 30 + 42 + j * 28 - (s.tag.length - 1) * 2, l, { "text-anchor": "middle", "font-size": s.tag.length > 1 ? 20 : 23, "font-weight": 700 }));
        const pap = el("g", {}, g);
        el("rect", { x: s.cx - 92, y: PT, width: 184, height: PH, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, pap);
        el("path", { d: `M${s.cx - 64} ${PT + 104} H${s.cx + 64} M${s.cx - 42} ${PT + 124} H${s.cx + 42}`, stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, pap);
        txt(pap, s.cx, PT + 78, s.name, { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        el("rect", { x: s.cx - 22, y: PT - 14, width: 44, height: 24, rx: 6, fill: INK }, g);
        el("path", { d: `M${s.cx - 14} ${PT - 14} L${s.cx - 8} ${PT - 30} H${s.cx + 8} L${s.cx + 14} ${PT - 14}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linejoin": "round" }, g);
        s.pap = pap; s.tagG = tag;
        button(g, `${s.name}: ${LINES[i]}`, () => { user = { i, from: curP, t0: api.now() }; api.poke(); });
      });
      const winds = SG.map((s) => {
        const g = el("g", { "pointer-events": "none" }, svg), x0 = HX + s.dir * 76, x1 = s.cx - s.dir * 100;
        return { g, s, P: [176, 222, 268].map((y, j) => el("path", { d: `M${x0} ${y} q${(x1 - x0) / 4} -14 ${(x1 - x0) / 2} 0 t${(x1 - x0) / 2} 0`, stroke: j === 1 ? LIL : SKY, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "22 16" }, g)) };
      });
      el("rect", { x: HX - 72, y: F - 24, width: 144, height: 24, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: HX - 9, y: HY + 60, width: 18, height: F - 24 - HY - 60, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const motor = el("g", { "pointer-events": "none" }, svg);
      el("circle", { r: 46, fill: SOFT, stroke: INK, "stroke-width": 3 }, motor);
      const head = el("g", { "pointer-events": "none" }, svg);
      el("circle", { r: 96, fill: "#fff", stroke: INK, "stroke-width": 3 }, head);
      const blades = el("g", {}, head);
      [0, 120, 240].forEach((r) => el("path", { d: "M0 0 C18 -14 56 -44 74 -16 C84 2 44 18 0 0 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `rotate(${r})` }, blades));
      el("circle", { r: 64, fill: "none", stroke: LIL, "stroke-width": 2 }, head);
      for (let k = 0; k < 12; k++) { const a = (k / 12) * 6.2832; el("path", { d: `M${(Math.cos(a) * 20).toFixed(1)} ${(Math.sin(a) * 20).toFixed(1)} L${(Math.cos(a) * 94).toFixed(1)} ${(Math.sin(a) * 94).toFixed(1)}`, stroke: LIL, "stroke-width": 2 }, head); }
      el("circle", { r: 96, fill: "none", stroke: INK, "stroke-width": 3 }, head);
      el("circle", { r: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, head);
      const K = [[0, 0], [0.8, 0], [1.6, -1], [4, -1], [5, 1], [7.6, 1], [8.4, 0], [12, 0]];
      const phi = (t) => { for (let i = 1; i < K.length; i++) if (t < K[i][0]) return lerp(K[i - 1][1], K[i][1], io(seg(t, K[i - 1][0], K[i][0]))); return 0; };
      const cap = strip(svg, 504, 740);
      return (t, now) => {
        const out = seg(t, 11.2, 11.8);
        let p = phi(t);
        if (user) p = lerp(user.from, user.i ? 1 : -1, io(cl((now - user.t0) / 0.6)));
        curP = p;
        const sx = 1 - 0.42 * Math.abs(p);
        head.setAttribute("transform", `translate(${HX + p * 24} ${HY}) scale(${sx} 1)`);
        motor.setAttribute("transform", `translate(${HX - p * 40} ${HY})`);
        blades.setAttribute("transform", `rotate(${(t * 760) % 360})`);
        SG.forEach((s, i) => {
          const gust = cl(s.dir * p * 1.4 - 0.4), fl = gust * (7 + 3 * Math.sin(now * 11 + i));
          const ang = s.dir * fl, shift = PH * Math.tan((ang * Math.PI) / 180);
          s.pap.setAttribute("transform", `translate(${s.cx} ${PT}) skewX(${ang}) scale(1 ${1 - 0.05 * gust * (0.5 + 0.5 * Math.sin(now * 9))}) translate(${-s.cx} ${-PT})`);
          const rv = user && user.i === i ? 1 : ob(seg(t, s.t0, s.t0 + 0.7)) * (user ? 1 : 1 - out);
          const sw = s.dir * (gust * 3.5 + Math.sin(now * 5 + i) * 1.5 * gust) + Math.sin(now * 1.4 + i) * 1.2 * cl(rv);
          s.tagG.setAttribute("transform", `translate(${s.cx + shift} ${PT + PH}) rotate(${sw}) translate(0 ${-150 * (1 - cl(rv, 0, 1.05))})`);
          s.tagG.setAttribute("opacity", rv < 0.05 ? 0 : 1);
          winds[i].g.setAttribute("opacity", gust);
          winds[i].P.forEach((w) => w.setAttribute("stroke-dashoffset", (-s.dir * t * 90).toFixed(1)));
        });
        cap.textContent = user ? LINES[user.i] : t < 1.6 || t >= 11.2 ? "Our view: pick by budget and platform" : t < 4.6 ? LINES[0] : t < 8.4 ? LINES[1] : "Try both on a real task from your own repo";
      };
    },
  };

  /* ---- title card, 16 by 9: two spinning tops face off ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 128, "Plans, prices, models and where they run", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 222, "Muse Code vs", { "font-size": 74, "font-weight": 700 });
      txt(svg, 62, 306, "Claude Code", { "font-size": 74, "font-weight": 700 });
      el("path", { d: "M68 334 H520", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 378, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 415, "Checked 14 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      const top = (x, y, r, body, band) => {
        el("ellipse", { cx: x, cy: y + 4, rx: 46, ry: 8, fill: SOFT }, svg);
        const g = el("g", { transform: `translate(${x} ${y}) rotate(${r})` }, svg);
        el("rect", { x: -9, y: -186, width: 18, height: 56, rx: 9, fill: band, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M0 0 L-64 -70 C-78 -84 -72 -110 -48 -118 C-18 -126 18 -126 48 -118 C72 -110 78 -84 64 -70 Z", fill: body, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-72 -92 Q0 -72 72 -92 L68 -78 Q0 -58 -68 -78 Z", fill: band, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("ellipse", { cx: 0, cy: -120, rx: 40, ry: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-76 -30 Q0 2 76 -30", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 14" }, g);
      };
      top(690, 440, -6, LIL, YEL);
      top(850, 452, 6, BLUE, SKY);
      [[640, 120, 15, SKY], [900, 186, 18, YEL], [588, 476, 12, MINT]].forEach(([x, y, r, col]) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, svg));
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
