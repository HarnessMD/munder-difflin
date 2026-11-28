/* Bright coded scenes for "Gemini 4 Argon vs Claude Opus 5.5 vs GPT-6 Astra". Vanilla JS, no library.
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
  /* ease that lands a little past the mark and settles; c sets how far past */
  const bk = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  /* scene heading on the left, the tap hint on the right; the heading shrinks if the two would touch */
  const head = (svg, s, hint) => {
    const a = txt(svg, 44, 62, s, { "font-size": 32, "font-weight": 700 });
    const b = txt(svg, 756, 60, hint, { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
    const room = 756 - b.getComputedTextLength() - 28 - 44, w = a.getComputedTextLength();
    if (w > room) a.setAttribute("font-size", Math.floor((32 * room) / w));
  };
  const star = (p, x, y, r, fill) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, p);
  /* a label that steps down a size when it would be wider than its room */
  const fit = (n, max, fs) => { n.setAttribute("font-size", fs); const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (Math.floor((fs * max * 10) / w) / 10).toFixed(1)); return n; };
  const say = (cap, s) => { if (cap.textContent !== s) { cap.textContent = s; fit(cap, 696, 20); } };

  const SC = {};

  /* ---- 1. three trophy cups on a shelf; a tally card rises out of each and is struck one row at a time ---- */
  SC.cups = {
    dur: 12, still: 10,
    build(svg, api) {
      head(svg, "Which model wins the most rows?", "tap a cup");
      const SH = 442, PL = 398, BOT = 352, RISE = 104;
      const C = [
        { n: "Gemini 4 Argon", k: 13, col: YEL, cx: 140, w: 170, h: 128, cw: 136, a: 1.3, line: "Gemini 4 Argon has the top score in 13 of the 19 rows" },
        { n: "GPT-6 Astra", k: 3, col: SKY, cx: 410, w: 140, h: 104, cw: 112, a: 4.6, line: "GPT-6 Astra has the top score in 3 of the 19 rows" },
        { n: "Claude Opus 5.5", k: 2, col: LIL, cx: 660, w: 124, h: 92, cw: 104, a: 6.3, line: "Claude Opus 5.5 has the top score in 2 of the 19 rows" },
      ];
      /* the shelf; the cup with 13 rows gets a second bracket */
      [92, 188, 410, 660].forEach((x) => el("path", { d: `M${x - 30} ${SH + 14} H${x + 30} L${x + 15} ${SH + 42} H${x - 15} Z`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg));
      el("rect", { x: 30, y: SH, width: 740, height: 16, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      let pinned = -1;
      const cups = C.map((c, i) => {
        const { cx, w, h, col, cw } = c, ry = BOT - h, g = el("g", {}, svg);
        el("rect", { x: cx - 108, y: ry - RISE - 8, width: 216, height: SH - ry + RISE + 10, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const cp = el("clipPath", { id: "mgc-cup" + i }, el("defs", {}, g));
        el("rect", { x: 0, y: 0, width: 800, height: ry - 4 }, cp);
        const card = el("g", {}, el("g", { "clip-path": `url(#mgc-cup${i})` }, g));
        el("rect", { x: -cw / 2, y: 0, width: cw, height: 200, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
        const nb = Math.floor(c.k / 5), rem = c.k % 5, W = nb * 38 + (rem ? (rem - 1) * 7 : -9), marks = [];
        for (let j = 0; j < c.k; j++) {
          const q = j % 5, bx = -W / 2 + Math.floor(j / 5) * 38;
          marks.push([el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round", fill: "none" }, card), q < 4 ? [bx + q * 7, 16, bx + q * 7, 40] : [bx - 5, 36, bx + 26, 20]]);
        }
        const lab = el("g", {}, card);
        txt(lab, 0, 0, c.k + " rows", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 });
        const hd = (s) => `M${cx + s * (w / 2 - 4)} ${ry + 14} C${cx + s * (w / 2 + 44)} ${ry + 6} ${cx + s * (w / 2 + 40)} ${ry + h * 0.62} ${cx + s * w * 0.3} ${ry + h * 0.7}`;
        [-1, 1].forEach((s) => {
          el("path", { d: hd(s), stroke: INK, "stroke-width": 15, fill: "none", "stroke-linecap": "round" }, g);
          el("path", { d: hd(s), stroke: col, "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, g);
        });
        el("rect", { x: cx - 10, y: BOT - 6, width: 20, height: PL - 8 - BOT, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${cx - 18} ${PL - 14} H${cx + 18} L${cx + 36} ${PL} H${cx - 36} Z`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: `M${cx - w / 2} ${ry} H${cx + w / 2} C${cx + w / 2} ${ry + h * 0.7} ${cx + w * 0.22} ${ry + h} ${cx} ${ry + h} C${cx - w * 0.22} ${ry + h} ${cx - w / 2} ${ry + h * 0.7} ${cx - w / 2} ${ry} Z`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: `M${cx - w * 0.34} ${ry + 24} Q${cx - w * 0.34} ${ry + h * 0.5} ${cx - w * 0.2} ${ry + h * 0.7}`, stroke: "#fff", "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, g);
        el("rect", { x: cx - w / 2 - 7, y: ry - 8, width: w + 14, height: 16, rx: 8, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: cx - 95, y: PL, width: 190, height: SH - PL, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        fit(txt(g, cx, PL + 30, c.n, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), 172, 21);
        const sp = [[cx + w * 0.2, ry + h * 0.3, 15], [cx - w * 0.08, ry + h * 0.62, 10], [cx + w * 0.36, ry - 22, 11]].map(([x, y, r]) => [star(g, x, y, r, "#fff"), x, y]);
        const u = { g, card, marks, lab, sp, ry, t0: -99 };
        button(g, c.line, () => { u.t0 = api.now(); pinned = i; api.poke(); });
        return u;
      });
      /* the ribbon tied from one handle to the other, with its tag */
      const P1 = [252, 269], P2 = [312.5, 285], RD = `M${P1[0]} ${P1[1]} Q282 358 ${P2[0]} ${P2[1]}`;
      const rb = el("g", {}, svg);
      const bands = [[INK, 11], [LIL, 5]].map(([stroke, sw]) => el("path", { d: RD, stroke, "stroke-width": sw, fill: "none", "stroke-linecap": "round", pathLength: 1 }, rb));
      const tag = el("g", {}, rb);
      el("path", { d: "M0 0 V26", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      const tr = el("rect", { y: 24, height: 42, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, tag);
      const tt = txt(tag, 0, 52, "one row shared", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const tw = Math.min(166, tt.getComputedTextLength() + 20); fit(tt, tw - 16, 20);
      tr.setAttribute("x", -tw / 2); tr.setAttribute("width", tw);
      const knots = [P1, P2].map(([x, y]) => el("circle", { cx: x, cy: y, r: 0, fill: LIL, stroke: INK, "stroke-width": 2.5 }, rb));
      const gleam = star(svg, C[0].cx + 46, C[0].h * 0.2 + BOT - C[0].h, 13, "#fff");
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = io(seg(t, 11.25, 11.8));
        let cur = -1;
        cups.forEach((u, i) => {
          const c = C[i], a = c.a, dt = c.k > 5 ? 0.15 : 0.24, w = now - u.t0, hit = w >= 0 && w < 2.4;
          u.g.setAttribute("transform", `rotate(${(hit ? 4 * Math.exp(-2.6 * w) * Math.sin(13 * w) : 0).toFixed(3)} ${c.cx} ${SH})`);
          const rise = bk(seg(t, a, a + 0.6), 1.5) * (1 - out);
          u.card.setAttribute("transform", `translate(${c.cx} ${(u.ry - RISE * rise).toFixed(2)})`);
          u.marks.forEach(([n, p], j) => {
            const k = oc(seg(t, a + 0.6 + j * dt, a + 0.72 + j * dt));
            n.setAttribute("d", `M${p[0]} ${p[1]} L${lerp(p[0], p[2], k).toFixed(2)} ${lerp(p[1], p[3], k).toFixed(2)}`);
            n.setAttribute("opacity", k > 0 ? 1 : 0);
          });
          const tl = a + 0.7 + c.k * dt;
          u.lab.setAttribute("transform", `translate(0 80) scale(${cl(bk(seg(t, tl, tl + 0.36), 2.4), 0, 1.3).toFixed(4)})`);
          u.sp.forEach(([n, x, y], j) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${(hit ? w * 70 : 0).toFixed(1)}) scale(${(hit ? Math.sin(Math.PI * seg(w, j * 0.18, 0.8 + j * 0.18)) : 0).toFixed(3)})`));
          if (t >= a) cur = i;
        });
        const rk = oc(seg(t, 8.3, 8.9));
        bands.forEach((b) => { b.setAttribute("stroke-dasharray", `${rk.toFixed(4)} 2`); b.setAttribute("opacity", rk > 0 ? 1 : 0); });
        knots.forEach((n, j) => n.setAttribute("r", (7 * cl(bk(seg(t, 8.25 + j * 0.6, 8.5 + j * 0.6), 3), 0, 1.5)).toFixed(2)));
        const tau = t - 9.25, drop = cl(bk(seg(t, 8.9, 9.25), 2), 0, 1.3);
        tag.setAttribute("transform", `translate(282.1 317.5) rotate(${((tau > 0 ? 9 * Math.exp(-2.4 * tau) * Math.sin(8 * tau) : 0) + seg(tau, 0.6, 1.6) * Math.sin(now * 1.3) * 2.2).toFixed(3)}) scale(${drop.toFixed(4)})`);
        rb.setAttribute("opacity", (1 - out).toFixed(3));
        gleam.setAttribute("transform", `translate(${C[0].cx + 46} ${BOT - C[0].h * 0.72}) scale(${(seg(t, 9.6, 9.9) * (1 - out) * (0.72 + 0.28 * Math.cos(now * 2.1))).toFixed(3)})`);
        const pw = pinned >= 0 ? now - cups[pinned].t0 : 99;
        say(cap, pw < 4 ? C[pinned].line : cur < 0 || t >= 11.25 ? "Google's own table, read on 13 Oct 2026" : t >= 9.9 ? "Gemini 4 Argon tops 13 of the 19 rows in Google's own table" : t >= 8.3 ? "One row shared: Gemini 4 Argon and GPT-6 Astra, CWE-bench v1 at 68.0%" : C[cur].line);
      };
    },
  };

  /* ---- 2. an abacus; on each wire one bead slides across to the model with the top score ---- */
  SC.abacus = {
    dur: 12, still: 9.8,
    build(svg, api) {
      head(svg, "Which model is best for coding agents?", "tap a wire");
      const COLS = [["Gemini 4", "Argon", YEL, 445], ["GPT-6", "Astra", SKY, 565], ["Claude", "Opus 5.5", LIL, 685]];
      const HOME = 349, WY = [222, 286, 350, 414];
      const R = [
        ["DeepSWE v1.1", 0, "77.9%", 1.5, "DeepSWE v1.1: Gemini 4 Argon tops it at 77.9%"],
        ["Vibe Code Bench", 0, "91.9%", 2.9, "Vibe Code Bench: Gemini 4 Argon tops it at 91.9%"],
        ["FrontierSWE v2", 1, "65.5%", 4.3, "FrontierSWE v2: GPT-6 Astra tops it at 65.5% against 55.0%"],
        ["Terminal-bench 4.0", 2, "66.4%", 6.4, "Terminal-bench 4.0: Claude Opus 5.5 tops it at 66.4% against 57.4%"],
      ];
      el("path", { d: "M30 490 H770", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      [96, 644].forEach((x) => el("rect", { x, y: 472, width: 60, height: 18, rx: 5, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: 34, y: 98, width: 732, height: 382, rx: 20, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 50, y: 114, width: 700, height: 350, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      COLS.forEach(([a, b, col, x]) => {
        el("path", { d: `M${x} 190 V452`, stroke: LIL, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "1 9" }, svg);
        el("rect", { x: x - 54, y: 124, width: 108, height: 58, rx: 12, fill: col, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, x, 148, a, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        txt(svg, x, 171, b, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      });
      txt(svg, 62, 160, "The four coding rows", { "font-size": 20, "font-weight": 500, fill: MUTE });
      let pinned = -1;
      const rows = R.map(([name, c, score, a, line], i) => {
        const y = WY[i], g = el("g", {}, svg);
        el("rect", { x: 54, y: y - 29, width: 692, height: 58, rx: 14, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: `M51 ${y} H749`, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: 58, y: y - 20, width: 200, height: 40, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        fit(txt(g, 158, y + 7, name, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), 186, 20);
        const slim = [0, 1].map(() => el("rect", { x: -6, y: -18, width: 12, height: 36, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g));
        const bead = el("g", {}, g), body = el("rect", { x: -46, y: -21, width: 92, height: 42, rx: 21, fill: "#fff", stroke: INK, "stroke-width": 3 }, bead);
        const sg = el("g", {}, bead);
        txt(sg, 0, 7.5, score, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
        const r = { slim, bead, body, sg, y, c, a, x: HOME, from: HOME, t0: -99 };
        button(g, line, () => { r.from = r.x; r.t0 = api.now(); pinned = i; api.poke(); });
        return r;
      });
      /* beads bound for the other two models stop at the first column out of habit, then carry on */
      const pos = (tau, c) => {
        const x0 = COLS[0][3];
        if (c === 0) return lerp(HOME, x0, bk(seg(tau, 0, 0.75), 1.5));
        return lerp(lerp(HOME, x0, bk(seg(tau, 0, 0.6), 0.9)), COLS[c][3], bk(seg(tau, 1.05, 1.8), 1.2));
      };
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        let cur = -1;
        rows.forEach((r, i) => {
          const w = now - r.t0, hit = w >= 0 && w < 4.2, land = r.c === 0 ? 0.6 : 1.62;
          let tau, x;
          if (hit) { tau = w - 0.5; x = tau < 0 ? lerp(r.from, HOME, io(seg(w, 0, 0.42))) : pos(tau, r.c); }
          else { tau = t >= 11.2 ? -1 : t - r.a; x = lerp(pos(t - r.a, r.c), HOME, io(seg(t, 11.2 + i * 0.07, 11.66 + i * 0.07))); }
          r.x = x;
          const on = tau >= land;
          r.body.setAttribute("fill", on ? COLS[r.c][2] : "#fff");
          r.sg.setAttribute("transform", `scale(${(on ? cl(bk(seg(tau, land, land + 0.32), 2.4), 0, 1.3) : 0).toFixed(4)})`);
          const hes = r.c > 0 && tau > 0.6 && tau < 1.05 ? Math.sin((tau - 0.6) * 28) * 2.2 * (1.05 - tau) : 0;
          tf(r.bead, (x + hes + (on ? seg(tau, land + 0.8, land + 1.8) * Math.sin(now * 1.3) * (i % 2 ? -1.4 : 1.4) : 0)).toFixed(2), r.y);
          const jig = tau > 0 ? 3 * Math.exp(-6 * tau) * Math.sin(20 * tau) : 0;
          r.slim.forEach((n, j) => n.setAttribute("transform", `translate(${(273 + j * 15 + jig * (j ? 1 : 0.4)).toFixed(2)} ${r.y})`));
          if (t >= r.a && t < 11.2) cur = i;
        });
        const pw = pinned >= 0 ? now - rows[pinned].t0 : 99;
        say(cap, pw < 4.2 ? R[pinned][4] : cur < 0 ? "Google's own figures, read on 13 Oct 2026" : t >= 8.8 ? "The four coding rows split two and two" : R[cur][4]);
      };
    },
  };

  /* ---- 3. a tape measure is pulled along the desk; cards clip onto the far end, as tall as their scores ---- */
  SC.tape = {
    dur: 12, still: 9.8,
    build(svg, api) {
      head(svg, "Which model handles the longest context?", "tap the tape");
      const DY = 430, BT = 390, X0 = 40, X1 = 644, CW = 112, HX = 47, px = (k) => X0 + ((X1 - X0) * k) / 1000;
      const all = el("g", {}, svg);
      el("rect", { x: 22, y: 92, width: 756, height: 404, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, all);
      el("path", { d: `M770 ${DY} H${X0} V${DY + 24}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, all);
      const cr = el("rect", { x: X0 - 4, y: 0, width: 0, height: 600 }, el("clipPath", { id: "mgc-tape" }, el("defs", {}, all)));
      const blade = el("g", { "clip-path": "url(#mgc-tape)" }, all);
      el("rect", { x: X0, y: BT, width: X1 - X0 + 80, height: DY - BT, fill: YEL, stroke: INK, "stroke-width": 3 }, blade);
      for (let k = 32; k <= 960; k += 32) if (k !== 128 && k !== 256) el("path", { d: `M${px(k).toFixed(1)} ${BT + 2} v${k % 128 === 0 ? 14 : 8}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, blade);
      [[128, "128k"], [256, "256k"], [1000, "1M"]].forEach(([k, s]) => {
        el("path", { d: `M${px(k).toFixed(1)} ${BT} V${DY}`, stroke: INK, "stroke-width": 2.5 }, blade);
        txt(blade, px(k) - (k === 1000 ? 14 : 7), BT + 31, s, { "text-anchor": "end", "font-size": 20, "font-weight": 700, "font-family": MONO });
      });
      el("rect", { x: 31, y: BT - 6, width: 10, height: DY - BT + 22, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 3 }, all);
      const M = [["Gemini 4", "Argon", "84.2%", YEL, 84.2, 4.9], ["GPT-6", "Astra", "71.8%", SKY, 71.8, 5.6], ["Claude", "Opus 5.5", "66.8%", LIL, 66.8, 6.3], ["Claude", "Fable 5.1", "65.0%", MINT, 65.0, 7.0]];
      const mk = (cx, wd, hg, fill, lines, a) => {
        const g = el("g", {}, all);
        el("rect", { x: -wd / 2, y: -8 - hg, width: wd, height: hg, rx: 10, fill, stroke: INK, "stroke-width": 3 }, g);
        lines.forEach(([s, y, fs]) => fit(txt(g, 0, -8 - hg + y, s, { "text-anchor": "middle", "font-size": fs, "font-weight": 700 }), wd - 12, fs));
        el("rect", { x: -20, y: -20, width: 40, height: 26, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: 0, cy: -7, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        return { g, cx, a };
      };
      const cards = [mk(112, 132, 128, "#fff", [["Up to 128k", 36, 20], ["90.6%", 74, 25], ["to 99.7%", 104, 25]], 2.1)];
      M.forEach(([a1, a2, sc, col, v, a], i) => cards.push(mk(250.5 + i * 113, 105, v * 2.9, col, [[sc, 42, 27], [a1, 76, 20], [a2, 100, 20]], a)));
      /* the measured stretch, marked under the desk edge the way a drawing marks a length */
      const DA = px(256), dim = el("g", {}, all), dl = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, dim);
      const dw = el("g", {}, dim), dt = txt(dw, (DA + X1) / 2, 471, "GraphWalks, 256k to 1M", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 }), dlen = dt.getComputedTextLength() + 24;
      dw.insertBefore(el("rect", { x: (DA + X1) / 2 - dlen / 2, y: 448, width: dlen, height: 32, fill: "#fff" }), dt);
      const cs = el("g", {}, all);
      el("rect", { x: CW / 2 - 18, y: DY - CW - 11, width: 36, height: 22, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, cs);
      el("path", { d: `M${CW - 3} ${DY - CW + 28} q17 3 15 26 q-2 15 -13 14`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, cs);
      el("path", { d: `M0 ${DY - 6} V${DY - CW + 24} q0 -24 24 -24 H${CW - 24} q24 0 24 24 V${DY - 6} q0 6 -6 6 H6 q-6 0 -6 -6 Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, cs);
      el("rect", { x: -5, y: BT - 4, width: 12, height: DY - BT + 2, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 3 }, cs);
      el("circle", { cx: CW / 2 + 4, cy: DY - CW / 2 - 2, r: 34, fill: "#fff", stroke: INK, "stroke-width": 3 }, cs);
      const spool = el("g", {}, cs);
      el("path", { d: "M0 -24 V24 M-20.8 -12 L20.8 12 M-20.8 12 L20.8 -12", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, spool);
      el("circle", { r: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, spool);
      button(all, "Pull the tape out again", () => api.seek(0.9));
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const back = seg(t, 11.25, 11.75), tip = t - 4.08;
        let X = lerp(lerp(HX, 250, bk(seg(t, 1.0, 1.9), 0.8)), X1, bk(seg(t, 2.9, 4.2), 0.7));
        X = lerp(X, HX, back * back * back) + (t > 11.75 ? -3 * Math.sin(Math.PI * seg(t, 11.75, 11.95)) : 0);
        /* the long pull to 1M lifts the case on its heel for a moment */
        const th = tip > 0 ? 7 * Math.sin(Math.PI * seg(tip, 0, 0.44)) + 2.2 * Math.sin(Math.PI * seg(tip, 0.44, 0.68)) : 0;
        cs.setAttribute("transform", `translate(${X.toFixed(2)} 0) rotate(${th.toFixed(3)} ${CW} ${DY})`);
        spool.setAttribute("transform", `translate(${CW / 2 + 4} ${DY - CW / 2 - 2}) rotate(${((X - HX) * 2.2).toFixed(1)})`);
        cr.setAttribute("width", Math.max(0, X + 8 - X0).toFixed(2));
        let cur = -1;
        cards.forEach((c, i) => {
          const tau = t - c.a, k = bk(seg(tau, 0, 0.42), 2.2), lift = io(seg(t, 10.85 + (4 - i) * 0.05, 11.2 + (4 - i) * 0.05));
          const rot = (tau > 0 ? 3.2 * Math.exp(-3.6 * tau) * Math.sin(13 * tau) : 0) + seg(tau, 1, 2) * Math.sin(now * 1.2 + i * 1.4) * 0.4;
          c.g.setAttribute("transform", `translate(${c.cx} ${(BT - 70 * (1 - k) - 60 * lift).toFixed(2)}) rotate(${rot.toFixed(3)})`);
          c.g.setAttribute("opacity", (seg(tau, 0, 0.12) * (1 - lift)).toFixed(3));
          if (tau >= 0) cur = i;
        });
        const dk = oc(seg(t, 4.45, 4.95)), db = lerp(DA, X1, dk);
        dl.setAttribute("d", `M${DA.toFixed(1)} 452 V472 M${DA.toFixed(1)} 462 H${db.toFixed(1)}${dk >= 1 ? ` M${X1} 452 V472` : ""}`);
        dw.setAttribute("opacity", seg(t, 4.8, 5.1).toFixed(3));
        dim.setAttribute("opacity", (seg(t, 4.45, 4.5) * (1 - seg(t, 10.85, 11.15))).toFixed(3));
        say(cap, cur < 0 || t >= 10.85 ? "Google's own figures, read on 13 Oct 2026" : t >= 8.6 ? "Gemini 4 Argon, by a wide margin on Google's long context row" : cur === 0 ? "Up to 128k the four sit closer, from 90.6% to 99.7%" : `GraphWalks, 256k to 1M: ${M[cur - 1][0]} ${M[cur - 1][1]} ${M[cur - 1][2]}`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 98, "Google's own table, 19 rows", { "font-size": 25, "font-weight": 500, fill: MUTE });
      let last = null;
      ["Gemini 4 Argon", "vs Claude Opus 5.5", "vs GPT-6 Astra"].forEach((s, i) => { last = fit(txt(svg, 62, 176 + i * 72, s, { "font-size": 60, "font-weight": 700 }), 630, 60); });
      el("path", { d: `M68 352 H${Math.round(56 + last.getComputedTextLength())}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 388, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 425, "Checked 13 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M70 498 C190 462 300 522 420 492 S600 486 676 452", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 498, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      /* a telescope on a tripod, pointed at three stars */
      const PX = 806, PY = 352;
      [[-62, 150], [0, 154], [62, 150]].forEach(([dx, dy]) => {
        el("path", { d: `M${PX} ${PY} L${PX + dx} ${PY + dy}`, stroke: INK, "stroke-width": 13, "stroke-linecap": "round" }, svg);
        el("path", { d: `M${PX} ${PY} L${PX + dx} ${PY + dy}`, stroke: YEL, "stroke-width": 7, "stroke-linecap": "round" }, svg);
      });
      const tube = el("g", {}, svg);
      el("rect", { x: -130, y: -12, width: 44, height: 24, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, tube);
      el("rect", { x: -42, y: -44, width: 70, height: 22, rx: 7, fill: SKY, stroke: INK, "stroke-width": 3 }, tube);
      el("rect", { x: -94, y: -26, width: 176, height: 52, rx: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, tube);
      el("rect", { x: -16, y: -26, width: 30, height: 52, fill: "#fff", stroke: INK, "stroke-width": 3 }, tube);
      el("rect", { x: 72, y: -35, width: 36, height: 70, rx: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, tube);
      el("circle", { cx: PX, cy: PY, r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const stars = [[892, 140, 27, YEL], [836, 78, 17, SKY], [922, 66, 14, LIL]].map(([x, y, r, col]) => [star(svg, x, y, r, col), x, y]);
      return (t, now) => {
        tube.setAttribute("transform", `translate(${PX} ${PY}) rotate(${(-62 + Math.sin(now * 0.8) * 1.6).toFixed(2)})`);
        stars.forEach(([n, x, y], i) => n.setAttribute("transform", `translate(${x} ${y}) scale(${(1 + 0.14 * Math.sin(now * 2 + i * 2.1)).toFixed(3)})`));
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
