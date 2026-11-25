/* Bright coded scenes for "What is Cogentic?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const around = (n, cx, cy, sx, sy = sx) => n.setAttribute("transform", `translate(${cx} ${cy}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* dashed focus ring that doubles as the tap area */
  const ring = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "8 8", "stroke-linecap": "round", class: "mg-ring" }, g);

  /* a mint tick with a crisp ink edge, drawn by k from 0 to 1 */
  const TL = 38, TD = "M-13 0 L-4 9 L13 -9";
  const tickAt = (d) => { const a = 12.73, b = 24.76, s = cl(d) * (a + b); if (s <= a) return [lerp(-13, -4, s / a), lerp(0, 9, s / a)]; const u = (s - a) / b; return [lerp(-4, 13, u), lerp(9, -9, u)]; };
  const tick = (p) => {
    const g = el("g", {}, p), base = { d: TD, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${TL} ${TL}` };
    const a = el("path", Object.assign({ stroke: INK, "stroke-width": 11 }, base), g);
    const b = el("path", Object.assign({ stroke: MINT, "stroke-width": 6 }, base), g);
    return (k) => { const o = TL * (1 - cl(k)); a.setAttribute("stroke-dashoffset", o); b.setAttribute("stroke-dashoffset", o); g.setAttribute("opacity", k > 0.001 ? 1 : 0); };
  };

  const SC = {};

  /* ---- 1. provers run their lanes, the checker turns each card over ---- */
  SC.relay = {
    dur: 9,
    build(root, api) {
      const svg = el("g", { transform: "translate(0 -28)" }, root);
      const LY = [128, 248, 368], X0 = 130, X1 = 420, CW = 136, CH = 60, BX = 420;
      const run = () => api.replay();
      const tap = el("g", {}, svg);
      ring(tap, 34, 76, 480, 344, 48);
      const lanes = LY.map((y) => {
        const g = el("g", {}, tap);
        el("rect", { x: 48, y: y - 38, width: 452, height: 76, rx: 38, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: `M92 ${y} H456`, stroke: LIL, "stroke-width": 5, "stroke-linecap": "round", "stroke-dasharray": "0.1 18" }, g);
        return g;
      });
      button(tap, "Run the relay again", run);
      const boxBack = el("g", {}, svg);
      el("rect", { x: 262, y: 446, width: 316, height: 40, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, boxBack);
      const layer = el("g", {}, svg); layer.style.cursor = "pointer"; layer.addEventListener("click", run);
      const P = [
        { lane: 0, pass: 1, pop: 0.6, go: 1.1, flip: 2.2, out: 3.05, to: [340, 455], c: [425, 330] },
        { lane: 1, pass: 0, pop: 0.7, go: 3.0, flip: 4.1, out: 4.95 },
        { lane: 2, pass: 1, pop: 0.8, go: 4.6, flip: 5.7, out: 6.6, to: [500, 455], c: [470, 400] },
      ].map((p) => {
        const g = el("g", {}, layer);
        el("rect", { x: -CW / 2 + 6, y: -CH / 2 + 6, width: CW, height: CH, rx: 12, fill: LIL }, g);
        el("rect", { x: -CW / 2, y: -CH / 2, width: CW, height: CH, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        const label = mono(g, 0, 8, "prover", 22);
        const tg = el("g", {}, g);
        return Object.assign(p, { g, label, tg, tk: tick(tg) });
      });
      const boxFront = el("g", {}, svg);
      el("rect", { x: 258, y: 484, width: 340, height: 90, rx: 12, fill: LIL }, boxFront);
      el("rect", { x: 250, y: 476, width: 340, height: 90, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, boxFront);
      const boxLabel = mono(boxFront, BX, 532, "ledger", 26);
      const chk = el("g", {}, svg);
      el("rect", { x: -72, y: -52, width: 160, height: 120, rx: 18, fill: SOFT }, chk);
      el("rect", { x: -80, y: -60, width: 160, height: 120, rx: 18, fill: LIL, stroke: INK, "stroke-width": 3 }, chk);
      const chkLabel = mono(chk, 0, 9, "checker", 24);
      return (t) => {
        lanes.forEach((g, i) => { const a = 0.05 + i * 0.09; g.setAttribute("opacity", seg(t, a, a + 0.25)); g.setAttribute("transform", `translate(${-40 * (1 - oc(seg(t, a, a + 0.5)))} 0)`); });
        /* the checker steps to each lane in turn and leans in as it turns a card over */
        const cy = 128 + 120 * (io(seg(t, 3.2, 3.8)) + io(seg(t, 5.0, 5.6)) - io(seg(t, 6.6, 7.2)));
        const lean = P.reduce((s, p) => s + Math.sin(Math.PI * seg(t, p.flip, p.flip + 0.5)), 0);
        chk.setAttribute("opacity", seg(t, 0.3, 0.45));
        tf(chk, 640 - 12 * lean, cy, 0.85 + 0.15 * ob(seg(t, 0.3, 0.8)));
        chkLabel.setAttribute("opacity", seg(t, 0.8, 1.1)); chkLabel.setAttribute("transform", `translate(0 ${8 * (1 - oc(seg(t, 0.8, 1.1)))})`);
        /* the ledger box dips a little as each card lands */
        const bump = P.reduce((s, p) => s + (p.pass ? Math.sin(Math.PI * seg(t, p.out + 0.8, p.out + 1.1)) : 0), 0);
        const bs = 0.85 + 0.15 * ob(seg(t, 0.45, 0.95)), bo = seg(t, 0.45, 0.6);
        [boxBack, boxFront].forEach((n) => { n.setAttribute("opacity", bo); n.setAttribute("transform", `translate(0 ${5 * bump}) translate(${BX} 521) scale(${bs}) translate(${-BX} -521)`); });
        boxLabel.setAttribute("opacity", seg(t, 0.95, 1.25)); boxLabel.setAttribute("transform", `translate(0 ${8 * (1 - oc(seg(t, 0.95, 1.25)))})`);
        P.forEach((p) => {
          const y0 = LY[p.lane], pk = 0.6 + 0.4 * ob(seg(t, p.pop, p.pop + 0.4));
          let x = lerp(X0, X1, io(seg(t, p.go, p.go + 1))), y = y0, r = 0;
          const f = seg(t, p.flip, p.flip + 0.5), sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * f))), lift = 1 + 0.08 * Math.sin(Math.PI * f);
          const m = seg(t, p.flip + 0.5, p.flip + 0.8);
          if (p.pass) {
            const s = io(seg(t, p.out, p.out + 0.8)), u = 1 - s;
            if (s > 0) { x = u * u * X1 + 2 * s * u * p.c[0] + s * s * p.to[0]; y = u * u * y0 + 2 * s * u * p.c[1] + s * s * p.to[1]; r = 7 * Math.sin(Math.PI * s); }
            if (t >= p.out + 0.8) y += 5 * bump;
            p.tk(seg(m, 0, 0.7)); tf(p.tg, 46, 0, 0.6 + 0.4 * ob(m));
            p.label.setAttribute("x", -18 * oc(m));
          } else {
            r = 5 * Math.sin(m * Math.PI * 4) * (1 - m);
            const b = io(seg(t, p.out, p.out + 0.9)); if (b > 0) x = lerp(X1, X0, b);
            p.tk(0);
          }
          p.g.setAttribute("opacity", seg(t, p.pop, p.pop + 0.15));
          p.g.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${sx * lift * pk} ${lift * pk})`);
        });
      };
    },
  };

  /* ---- 2. the chalkboard writes the bound, then two labels land ---- */
  SC.chalkboard = {
    dur: 8.5,
    build(svg, api) {
      const tap = el("g", {}, svg);
      ring(tap, 54, 68, 692, 452, 34);
      const board = el("g", {}, tap);
      el("rect", { x: 80, y: 94, width: 660, height: 412, rx: 24, fill: LIL }, board);
      el("rect", { x: 70, y: 84, width: 660, height: 412, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 3 }, board);
      el("rect", { x: 94, y: 108, width: 612, height: 364, rx: 12, fill: SKY, stroke: INK, "stroke-width": 2.5 }, board);
      /* L_N[1/3, 105], one symbol at a time; N is a subscript */
      const SYM = [["L"], ["N", 1], ["["], ["1"], ["/"], ["3"], [","], ["1", 0, 22], ["0"], ["5"], ["]"]];
      const BIG = 66, SUB = 40, BASE = 222, STEP = 0.26, A0 = 1.0;
      let w = 0;
      const gl = SYM.map(([s, sub, gap = 0]) => { w += gap; const size = sub ? SUB : BIG, g = { s, x: w, w: size * 0.6, size, y: sub ? BASE + 14 : BASE }; w += g.w; return g; });
      const X0 = 400 - w / 2;
      const marks = gl.map((g, i) => ({ n: txt(tap, X0 + g.x, g.y, g.s, { "font-family": MONO, "font-size": g.size, "font-weight": 700 }), cx: X0 + g.x + g.w / 2, cy: g.y - g.size * 0.35, a: A0 + i * STEP, tip: [X0 + g.x + g.w * 0.85, g.y - 4] }));
      const chalk = el("g", {}, tap);
      el("rect", { x: -26, y: -7, width: 52, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, chalk);
      const REST = [588, 484], END = A0 + (marks.length - 1) * STEP;
      const TAG = "M-170 0 L-140 -33 H158 Q170 -33 170 -21 V21 Q170 33 158 33 H-140 Z";
      const tag = el("g", {}, tap);
      el("path", { d: TAG, fill: LIL, transform: "translate(7 7)" }, tag);
      el("path", { d: TAG, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: -138, cy: 0, r: 8, fill: SKY, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 14, 10, "subexponential", 28);
      const card = el("g", {}, tap);
      el("rect", { x: -163, y: -26, width: 340, height: 66, rx: 14, fill: SOFT }, card);
      el("rect", { x: -170, y: -33, width: 340, height: 66, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, card);
      const cardLabel = mono(card, 0, 10, "not polynomial", 28);
      button(tap, "Write it again", () => api.replay());
      return (t) => {
        board.setAttribute("opacity", seg(t, 0, 0.25)); around(board, 400, 290, 0.94 + 0.06 * oc(seg(t, 0, 0.6)));
        marks.forEach((m) => { m.n.setAttribute("opacity", seg(t, m.a, m.a + 0.06)); around(m.n, m.cx, m.cy, 0.55 + 0.45 * ob(seg(t, m.a, m.a + 0.3))); });
        /* the chalk visits each symbol as it appears, then goes back to the frame */
        const n = marks.length; let p, r;
        if (t < A0) { const k = io(seg(t, 0.55, A0)); p = [lerp(REST[0], marks[0].tip[0], k), lerp(REST[1], marks[0].tip[1], k)]; r = -35 * k; }
        else if (t < END) { const u = (t - A0) / STEP, i = Math.floor(u), f = io(u - i), a = marks[i].tip, b = marks[i + 1].tip; p = [lerp(a[0], b[0], f), lerp(a[1], b[1], f) - 10 * Math.sin(Math.PI * f)]; r = -35; }
        else { const k = io(seg(t, END + 0.25, END + 0.85)), a = marks[n - 1].tip; p = [lerp(a[0], REST[0], k), lerp(a[1], REST[1], k)]; r = -35 * (1 - k); }
        chalk.setAttribute("opacity", seg(t, 0.35, 0.55));
        chalk.setAttribute("transform", `translate(${p[0]} ${p[1]}) rotate(${r}) translate(26 0)`);
        tag.setAttribute("opacity", t >= 4.6 ? 1 : 0);
        tf(tag, 400, lerp(-120, 295, ob(seg(t, 4.6, 5.3), 0.9)), 1, -9 * (1 - ob(seg(t, 4.7, 5.45), 1.2)));
        card.setAttribute("opacity", t >= 5.7 ? 1 : 0);
        tf(card, lerp(940, 400, ob(seg(t, 5.7, 6.4), 0.9)), 385);
        cardLabel.setAttribute("opacity", seg(t, 6.05, 6.4));
      };
    },
  };

  /* ---- 3. the ledger keeps only the lines that get a tick ---- */
  SC.ledger = {
    dur: 8.5,
    build(root, api) {
      const svg = el("g", { transform: "translate(0 -24)" }, root);
      const SL = [[124, 240], [124, 330], [124, 420], [676, 240], [676, 330], [676, 420]];
      const COL = [LIL, BLUE, LIL, BLUE, LIL, BLUE], PASS = [[0, 1, 3, 5], [2], [4]];
      const A0 = 1.0, STEP = 0.75, REST = { x: 322, y: 562, r: 0 };
      let round = 0, kept = [0, 0, 0, 0, 0, 0], lastT = 0;
      const tap = el("g", {}, svg);
      ring(tap, 72, 92, 656, 450, 28);
      const tab = el("g", {}, tap);
      el("rect", { x: 320, y: 106, width: 160, height: 74, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, tab);
      const tabLabel = mono(tab, 400, 144, "checked", 24);
      const book = el("g", {}, tap);
      const shadow = el("rect", { x: 100, y: 174, width: 620, height: 352, rx: 18, fill: LIL }, book);
      const half = (right) => {
        const g = el("g", {}, book);
        el("path", { d: right ? "M400 164 H694 Q710 164 710 180 V500 Q710 516 694 516 H400 Z" : "M400 164 H106 Q90 164 90 180 V500 Q90 516 106 516 H400 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        [268, 358, 448].forEach((y) => el("path", { d: right ? `M424 ${y} H686` : `M114 ${y} H376`, stroke: LIL, "stroke-width": 2.5, "stroke-linecap": "round" }, g));
        return g;
      };
      const pages = [half(0), half(1)];
      el("path", { d: "M400 164 V516", stroke: INK, "stroke-width": 3 }, book);
      const slips = SL.map(([x, y], i) => {
        const g = el("g", {}, tap), left = i < 3, sx = left ? 156 : 426;
        el("rect", { x: sx, y: y - 20, width: 218, height: 40, rx: 10, fill: COL[i], stroke: INK, "stroke-width": 2.5 }, g);
        el("rect", { x: sx + 18, y: y - 5, width: i % 2 ? 128 : 150, height: 10, rx: 5, fill: SOFT }, g);
        const tg = el("g", { transform: `translate(${x} ${y})` }, g);
        return { g, left, tk: tick(tg) };
      });
      const pen = el("g", {}, tap);
      el("path", { d: "M142 -11 H154 Q160 -11 160 -5 V5 Q160 11 154 11 H142 Z", fill: LIL, stroke: INK, "stroke-width": 2.5 }, pen);
      el("rect", { x: 128, y: -11, width: 16, height: 22, fill: SKY, stroke: INK, "stroke-width": 2.5 }, pen);
      el("rect", { x: 26, y: -11, width: 104, height: 22, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pen);
      el("path", { d: "M26 -11 L0 0 L26 11 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, pen);
      el("path", { d: "M8 -3.4 L0 0 L8 3.4 Z", fill: MUTE, stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, pen);
      /* each tap runs the next round on the lines still open; a full page starts a fresh ledger */
      button(tap, "Run the next round", () => {
        const full = round === PASS.length - 1;
        api.replay(() => { if (full) { round = 0; kept = [0, 0, 0, 0, 0, 0]; } else { PASS[round].forEach((s) => (kept[s] = 1)); round++; } }, full || lastT < 8.4);
      });
      const mix = (p, q, k) => ({ x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), r: lerp(p.r, q.r, k) });
      return (t) => {
        lastT = t;
        const fresh = round === 0, list = [0, 1, 2, 3, 4, 5].filter((s) => !kept[s]), F = A0 + (list.length - 1) * STEP + 0.95;
        const open = fresh ? ob(seg(t, 0, 0.6), 1.2) : 1;
        pages.forEach((g) => around(g, 400, 340, 0.15 + 0.85 * open, 1));
        book.setAttribute("opacity", fresh ? seg(t, 0, 0.2) : 1);
        shadow.setAttribute("opacity", fresh ? seg(t, 0.35, 0.6) : 1);
        tab.setAttribute("opacity", fresh ? seg(t, 0.5, 0.6) : 1);
        tab.setAttribute("transform", `translate(0 ${fresh ? -60 * (1 - ob(seg(t, 0.5, 0.95))) : 0})`);
        tabLabel.setAttribute("opacity", fresh ? seg(t, 0.75, 1.05) : 1);
        slips.forEach((s, i) => {
          if (kept[i]) { s.g.setAttribute("opacity", 1); s.g.setAttribute("transform", "translate(0 0)"); s.tk(1); return; }
          const a = A0 + list.indexOf(i) * STEP, pass = PASS[round].includes(i), dir = s.left ? -1 : 1;
          let dx = dir * 320 * (1 - oc(seg(t, a, a + 0.45))), op = seg(t, a, a + 0.1);
          if (!pass) { const f = seg(t, F, F + 0.55); dx += dir * 40 * io(f); op *= 1 - f; }
          s.g.setAttribute("opacity", op); s.g.setAttribute("transform", `translate(${dx} 0)`);
          s.tk(pass ? seg(t, a + 0.5, a + 0.75) : 0);
        });
        /* the pencil goes line to line: a tick where the line holds, a lift where it does not */
        let p = REST, prev = REST;
        list.forEach((s, k) => {
          const a = A0 + k * STEP, sp = { x: SL[s][0], y: SL[s][1], r: -60 }, pass = PASS[round].includes(s);
          const m = io(seg(t, a + 0.2, a + 0.5));
          if (m > 0) p = mix(prev, sp, m);
          if (t >= a + 0.5) {
            const d = seg(t, a + 0.5, a + 0.75);
            if (pass) { const [qx, qy] = tickAt(d); p = { x: sp.x + qx, y: sp.y + qy, r: -60 }; } else p = { x: sp.x, y: sp.y - 14 * Math.sin(Math.PI * d), r: -60 };
          }
          prev = pass ? { x: sp.x + 13, y: sp.y - 9, r: -60 } : sp;
        });
        const back = io(seg(t, F + 0.1, F + 0.75)); if (back > 0) p = mix(prev, REST, back);
        const pin = fresh ? oc(seg(t, 0.6, 1.0)) : 1;
        pen.setAttribute("opacity", fresh ? seg(t, 0.6, 0.8) : 1);
        pen.setAttribute("transform", `translate(${p.x} ${p.y + 30 * (1 - pin)}) rotate(${p.r})`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4,
    build(svg) {
      const it = [];
      const up = (n, a) => it.push([n, a, 0]), pop = (n, a, cx, cy) => it.push([n, a, 1, cx, cy]);
      const chip = el("g", {}, svg);
      el("rect", { x: 64, y: 52, width: 150, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
      mono(chip, 139, 80, "Concepts", 20);
      up(chip, 0.1);
      up(txt(svg, 60, 172, "What is Cogentic?", { "font-size": 74, "font-weight": 700 }), 0.22);
      up(txt(svg, 64, 226, "Several AI agents try proofs, others check them.", { "font-size": 28, "font-weight": 500 }), 0.34);
      up(txt(svg, 64, 266, "Checked 25 Nov 2026", { "font-size": 20, "font-weight": 500, fill: MUTE }), 0.46);
      /* a small soft white ledger */
      const led = el("g", {}, svg);
      el("rect", { x: 188, y: 322, width: 140, height: 68, rx: 10, fill: LIL }, led);
      el("path", { d: "M252 316 H192 Q182 316 182 326 V374 Q182 384 192 384 H252 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, led);
      el("path", { d: "M252 316 H312 Q322 316 322 326 V374 Q322 384 312 384 H252 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, led);
      el("path", { d: "M252 316 V384", stroke: INK, "stroke-width": 2.5 }, led);
      ["M196 336 H240", "M196 352 H240", "M196 368 H228", "M264 336 H308", "M264 352 H300", "M264 368 H308"].forEach((d) => el("path", { d, stroke: LIL, "stroke-width": 4, "stroke-linecap": "round" }, led));
      pop(led, 0.75, 252, 350);
      /* a small sky chalkboard */
      const cb = el("g", {}, svg);
      el("rect", { x: 620, y: 310, width: 140, height: 84, rx: 12, fill: LIL }, cb);
      el("rect", { x: 614, y: 304, width: 140, height: 84, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cb);
      el("rect", { x: 626, y: 316, width: 116, height: 60, rx: 6, fill: SKY, stroke: INK, "stroke-width": 2 }, cb);
      ["M642 336 q8 -8 16 0 t16 0 t16 0", "M642 358 H694", "M704 358 H726"].forEach((d) => el("path", { d, fill: "none", stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round" }, cb));
      pop(cb, 0.88, 684, 346);
      const card = (x, w, fill, s, a) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 7, y: 411, width: w, height: 72, rx: 16, fill: SOFT }, g);
        el("rect", { x, y: 404, width: w, height: 72, rx: 16, fill, stroke: INK, "stroke-width": 3 }, g);
        up(g, a); up(mono(svg, x + w / 2, 447, s, 21), a + 0.3);
      };
      card(64, 376, LIL, "Six papers, 25 Nov 2026", 1.0);
      card(472, 424, YEL, "Subexponential, not polynomial", 1.12);
      return (t) => it.forEach(([n, a, kind, cx, cy]) => {
        const k = seg(t, a, a + 0.5);
        n.setAttribute("opacity", seg(t, a, a + 0.15));
        if (kind) around(n, cx, cy, 0.6 + 0.4 * ob(k)); else n.setAttribute("transform", `translate(0 ${22 * (1 - oc(k))})`);
      });
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, END = sc.dur;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    const root = el("g", {}, svg);
    img.replaceWith(svg);
    /* plays once while in view and holds its calm last frame; a tap fades it out and plays it again */
    let t = calm ? END : 0, raf = 0, seen = false, last = 0, fade = -1, prep = null, draw = () => {};
    const step = (ms) => {
      const dt = cl((ms - last) / 1000, 0, 0.1); last = ms;
      if (fade >= 0 && fade < 1) { fade += dt / 0.3; if (fade >= 1) { if (prep) prep(); prep = null; t = 0; fade = 1; } }
      else { if (fade >= 1) { fade += dt / 0.3; if (fade >= 2) fade = -1; } t = Math.min(END, t + dt); }
      root.setAttribute("opacity", fade < 0 ? 1 : fade < 1 ? 1 - io(fade) : io(cl(fade - 1)));
      draw(t);
      raf = seen && (fade >= 0 || t < END) ? requestAnimationFrame(step) : 0;
    };
    const kick = () => { if (seen && !raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
    const api = {
      replay: (fn, soft = true) => {
        if (soft && t > 0.05) { prep = fn || null; if (fade < 0) fade = 0; else if (fade >= 1) fade = 2 - fade; }
        else { if (fn) fn(); t = 0; draw(t); }
        kick();
      },
    };
    draw = sc.build(root, api);
    if (frozen) { draw(isNaN(fixed) ? END : cl(fixed, 0, END)); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { kick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    draw(t);
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
