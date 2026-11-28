/* Bright coded scenes for "OpusClip Alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 30, "font-weight": 700 }, a));
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * max) / w); return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  // with reduced motion every step lands at once, so taps still change the scene without movement
  const seg = (t, a, b) => (calm ? (t >= b ? 1 : 0) : cl((t - a) / (b - a)));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const ei = (x) => x * x * x;
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const at = (n, cx, cy, s = 1, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`);
  const op = (n, v) => n.setAttribute("opacity", cl(v));
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, a) => el(a.r ? "circle" : "rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "8 10", "stroke-linecap": "round", class: "mg-ring" }, a), p);
  const pad = (p, a) => el(a.r ? "circle" : "rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a), p);
  const blend = (a, b, k) => (Array.isArray(a) ? a.map((v, i) => blend(v, b[i], k)) : typeof a === "object" ? Object.fromEntries(Object.keys(a).map((n) => [n, blend(a[n], b[n], k)])) : lerp(a, b, k));
  const rr = (hw, hh, r) => `M${-hw + r} ${-hh} H${hw - r} Q${hw} ${-hh} ${hw} ${-hh + r} V${hh - r} Q${hw} ${hh} ${hw - r} ${hh} H${-hw + r} Q${-hw} ${hh} ${-hw} ${hh - r} V${-hh + r} Q${-hw} ${-hh} ${-hw + r} ${-hh} Z`;

  const SC = {};

  /* ---- 1. scissors snip a long strip of footage into three short clips ---- */
  SC.filmstrip = {
    dur: 9,
    build(svg, api) {
      const X0 = 120, Y0 = 640, P = 1360 / 3, H = 200, CUT = [X0 + P, X0 + 2 * P], RECUT = 2.1, JOIN = 0.7, DXF = [-60, 0, 60];
      const card = el("g", {}, svg);
      el("rect", { x: 474, y: 214, width: 680, height: 170, rx: 30, fill: LIL }, card);
      el("rect", { x: 460, y: 200, width: 680, height: 170, rx: 30, fill: MINT, stroke: INK, "stroke-width": 3 }, card);
      const cardT = fit(txt(card, 800, 311, "10 viral clips", { "text-anchor": "middle", "font-size": 76, "font-weight": 700 }), 600);
      const lab = mono(svg, X0, 606, "Any footage", { "font-size": 36 });
      const pieces = [0, 1, 2].map((i) => {
        const g = el("g", {}, svg), w = P + (i < 2 ? 1 : 0);
        el("rect", { x: 12, y: 12, width: P, height: H, fill: LIL }, g);
        el("rect", { x: 0, y: 0, width: w, height: H, fill: SOFT }, g);
        const wipe = el("rect", { x: 0, y: 0, width: 0, height: H, fill: YEL }, g);
        for (let k = 0; k < 8; k++) { const hx = k * (P / 8) + (P / 8 - 26) / 2; [14, H - 34].forEach((hy) => el("rect", { x: hx, y: hy, width: 26, height: 20, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g)); }
        [31.7, 241.7].forEach((wx) => el("rect", { x: wx, y: 50, width: 180, height: 100, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        el("path", { d: `M0 0 H${w} M0 ${H} H${w}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "square" }, g);
        const L = el("path", { d: `M0 0 V${H}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "square" }, g);
        const R = el("path", { d: `M${P} 0 V${H}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "square" }, g);
        return { g, wipe, L, R };
      });
      const tags = ["TikTok", "Shorts", "Reels"].map((s) => {
        const g = el("g", {}, svg);
        el("rect", { x: -120, y: -38, width: 240, height: 76, rx: 38, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        mono(g, 0, 12, s, { "text-anchor": "middle", "font-size": 34 });
        return g;
      });
      const sci = el("g", {}, svg);
      pad(sci, { cx: 0, cy: 50, r: 230 });
      ring(sci, { cx: 0, cy: 50, r: 230 });
      const half = (m) => {
        const g = el("g", {}, sci), h = el("g", { transform: `scale(${m} 1)` }, g);
        el("path", { d: "M0 -14 L0 250 Q-32 150 -28 22 Q-26 -14 0 -14 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, h);
        el("path", { d: "M-4 -4 L30 -76", stroke: INK, "stroke-width": 24, "stroke-linecap": "round" }, h);
        el("path", { d: "M-4 -4 L30 -76", stroke: BLUE, "stroke-width": 18, "stroke-linecap": "round" }, h);
        el("circle", { cx: 40, cy: -112, r: 42, fill: BLUE, stroke: INK, "stroke-width": 3 }, h);
        el("circle", { cx: 40, cy: -112, r: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, h);
        return g;
      };
      const hB = half(-1), hA = half(1);
      el("circle", { r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, sci);
      const OFF = [1780, 140, 30, 0.7], C1 = [CUT[0], 600, 0, 1], C2 = [CUT[1], 600, 0, 1], REST = [1340, 290, 30, 0.7];
      const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
      const S = (t) => {
        const m1 = io(seg(t, 1.3, 2.1)), m2 = io(seg(t, 2.6, 3.2)), m3 = io(seg(t, 4.0, 4.8));
        const pulse = (c) => io(seg(t, c - 0.22, c)) * (1 - oc(seg(t, c, c + 0.3)));
        const n1 = ob(seg(t, 2.3, 2.6)), n2 = ob(seg(t, 3.4, 3.7)), sep = [0, 1, 2].map((i) => ob(seg(t, 3.6 + i * 0.1, 4.2 + i * 0.1)));
        return {
          sx: -1560 * (1 - oc(seg(t, 0.2, 1.3))), lab: seg(t, 0.8, 1.3),
          sci: t < 2.6 ? mix(OFF, C1, m1) : t < 4.0 ? mix(C1, C2, m2) : mix(C2, REST, m3),
          th: 18 * (1 - Math.max(pulse(2.3), pulse(3.4))) * (1 - 0.8 * m3),
          cut: [t >= 2.3 ? 1 : 0, t >= 3.4 ? 1 : 0],
          dx: [-8 * n1 - 52 * sep[0], 0, 8 * n2 + 52 * sep[2]], dy: sep.map((k) => 30 * k),
          yel: [0, 1, 2].map((i) => io(seg(t, 3.9 + i * 0.1, 4.5 + i * 0.1))),
          tag: [0, 1, 2].map((i) => seg(t, 4.9 + i * 0.1, 5.35 + i * 0.1)),
          card: seg(t, 5.8, 6.4), cardT: seg(t, 6.3, 6.8),
        };
      };
      const render = (st) => {
        pieces.forEach((p, i) => {
          tf(p.g, X0 + i * P + st.dx[i] + st.sx, Y0 + st.dy[i]);
          p.wipe.setAttribute("width", (P + (i < 2 ? 1 : 0)) * st.yel[i]);
          op(p.L, i === 0 ? 1 : st.cut[i - 1]); op(p.R, i === 2 ? 1 : st.cut[i]);
          const k = st.tag[i]; tf(tags[i], X0 + (i + 0.5) * P + DXF[i], 960, 0.5 + 0.5 * ob(k)); op(tags[i], k * 3);
        });
        lab.setAttribute("x", X0 + st.sx + st.dx[0]); op(lab, st.lab);
        const [x, y, r, s] = st.sci; tf(sci, x, y, s, r);
        hA.setAttribute("transform", `rotate(${st.th})`); hB.setAttribute("transform", `rotate(${-st.th})`);
        const ck = ob(st.card); at(card, 800, 285, 0.9 + 0.1 * ck, 0, -50 * (1 - ck)); op(card, st.card * 3);
        const tk = oc(st.cardT); cardT.setAttribute("transform", `translate(0 ${16 * (1 - tk)})`); op(cardT, tk);
      };
      let tapAt = null, from = null, lastT = 0;
      button(sci, "Scissors: join the strip again and cut it once more", () => { if (tapAt === null) { from = S(lastT); tapAt = api.now(); api.poke(); } });
      api.reset = () => { tapAt = null; };
      return (t) => {
        if (tapAt !== null) {
          const s = api.since(tapAt);
          if (s < JOIN) { render(blend(from, S(RECUT), calm ? 1 : io(cl(s / JOIN)))); return true; }
          tapAt = null; if (!calm) { api.seek(RECUT); t = RECUT; }
        }
        lastT = t; render(S(t)); return false;
      };
    },
  };

  /* ---- 2. a clapperboard claps in one row of the comparison at a time ---- */
  SC.clapperboard = {
    dur: 10,
    build(svg, api) {
      const ROWS = [["AutoClip", "Yes, MIT", "Free app"], ["OpenShorts", "Yes, MIT", "Self hosted free"], ["OpusClip", "No", "60 credits a month"]];
      const COLS = [230, 560, 880], CT = [1.5, 3.6, 5.7, 7.8], TICK = [1, 1, 0];
      const G = el("g", {}, svg);
      pad(G, { x: 116, y: 262, width: 1368, height: 686, rx: 40 });
      ring(G, { x: 116, y: 262, width: 1368, height: 686, rx: 40 });
      el("rect", { x: 170, y: 404, width: 1300, height: 516, rx: 26, fill: SOFT }, G);
      el("rect", { x: 150, y: 452, width: 1300, height: 448, rx: 26, fill: LIL, stroke: INK, "stroke-width": 3 }, G);
      el("rect", { x: 190, y: 492, width: 1220, height: 368, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, G);
      el("rect", { x: 150, y: 384, width: 1300, height: 64, rx: 10, fill: LIL }, G);
      for (let k = 0; k < 8; k++) { const x0 = 230 + k * 150; el("path", { d: `M${x0} 384 H${x0 + 70} L${x0 + 110} 448 H${x0 + 40} Z`, fill: "#fff" }, G); }
      el("rect", { x: 150, y: 384, width: 1300, height: 64, rx: 10, fill: "none", stroke: INK, "stroke-width": 3 }, G);
      const clap = el("g", {}, G);
      el("rect", { x: 0, y: -64, width: 1300, height: 64, rx: 10, fill: BLUE }, clap);
      for (let k = 0; k < 8; k++) { const x0 = 120 + k * 150; el("path", { d: `M${x0} -64 H${x0 + 70} L${x0 + 30} 0 H${x0 - 40} Z`, fill: "#fff" }, clap); }
      el("rect", { x: 0, y: -64, width: 1300, height: 64, rx: 10, fill: "none", stroke: INK, "stroke-width": 3 }, clap);
      el("circle", { cx: 182, cy: 382, r: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, G);
      const burst = el("g", {}, G);
      const rays = [-50, -18, 14].map((a) => el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round", transform: `translate(1470 372) rotate(${a})` }, burst));
      const heads = ["Tool", "Open source", "Free plan"].map((s, i) => txt(G, COLS[i], 605, s, { "font-size": 40, "font-weight": 700 }));
      el("path", { d: "M230 641 H1370", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, G);
      const under = el("path", { d: "M226 781 H226", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, G);
      const rows = ROWS.map((r) => r.map((s, j) => mono(G, COLS[j], 755, s, { "font-size": 40 })));
      const tick = el("g", {}, G);
      el("circle", { r: 28, fill: MINT, stroke: INK, "stroke-width": 3 }, tick);
      el("path", { d: "M-12 1 L-3 10 L13 -9", stroke: INK, "stroke-width": 4.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      const T = (t) => {
        let n = 0; CT.forEach((c) => { if (t >= c) n++; });
        let o = 0;
        CT.forEach((c, i) => { if (t < c && t >= (i ? c - 0.65 : -1)) o = (i ? oc(seg(t, c - 0.65, c - 0.3)) : 1) * (1 - ei(seg(t, c - 0.16, c))); });
        return { e: seg(t, 0.2, 0.9), h: [0, 1, 2].map((i) => seg(t, 0.8 + i * 0.09, 1.2 + i * 0.09)), ang: -12 * o, since: n ? t - CT[n - 1] : 0, cur: n ? (n - 1) % 3 : -1, prev: n > 1 ? (n - 2) % 3 : -1 };
      };
      const render = (st) => {
        const e = ob(st.e), pulse = st.cur >= 0 ? Math.sin(Math.PI * seg(st.since, 0, 0.25)) : 0;
        at(G, 800, 640, 0.94 + 0.06 * e + 0.015 * pulse, 0, 60 * (1 - e)); op(G, st.e * 3);
        tf(clap, 150, 380, 1, st.ang);
        heads.forEach((h, i) => { op(h, st.h[i]); h.setAttribute("transform", `translate(0 ${20 * (1 - oc(st.h[i]))})`); });
        rows.forEach((cells, r) => cells.forEach((c, j) => {
          let o = 0, y = 0;
          if (r === st.cur) { const k = seg(st.since, 0.05 + j * 0.09, 0.45 + j * 0.09); o = k * 2; y = 26 * (1 - ob(k)); }
          else if (r === st.prev) { const k = io(seg(st.since, 0, 0.2)); o = 1 - k; y = -22 * k; }
          op(c, o); c.setAttribute("transform", `translate(0 ${y})`);
        }));
        const tk = st.cur >= 0 && TICK[st.cur] ? seg(st.since, 0.4, 0.7) : 0, tOld = st.prev >= 0 && TICK[st.prev] ? 1 - seg(st.since, 0, 0.15) : 0;
        if (tk > 0) { tf(tick, 1348, 742, 0.4 + 0.6 * ob(tk)); op(tick, tk * 3); } else { tf(tick, 1348, 742); op(tick, tOld); }
        if (st.cur === 2) { under.setAttribute("d", `M226 781 H${226 + 1092 * io(seg(st.since, 0.45, 0.9))}`); op(under, seg(st.since, 0.45, 0.5)); }
        else if (st.prev === 2) { under.setAttribute("d", "M226 781 H1318"); op(under, 1 - seg(st.since, 0, 0.2)); }
        else op(under, 0);
        const bk = seg(st.since, 0, 0.4), bOn = st.cur >= 0 && st.since < 0.4;
        rays.forEach((n) => n.setAttribute("d", `M${20 + 20 * oc(bk)} 0 H${36 + 34 * oc(bk)}`)); op(burst, bOn ? 1 - bk : 0);
      };
      let tap = null, shown = -1;
      button(G, "Clapperboard: clap it and show the next row", () => { tap = { at: api.now(), from: shown, to: (shown + 1) % 3 }; shown = tap.to; api.seek(SC.clapperboard.dur); api.poke(); });
      api.reset = () => { tap = null; shown = -1; };
      return (t) => {
        const st = T(t);
        if (tap) {
          const s = api.since(tap.at);
          st.ang = -12 * oc(seg(s, 0, 0.2)) * (1 - ei(seg(s, 0.22, 0.36)));
          if (s < 0.36) { st.cur = tap.from; st.prev = -1; st.since = 99; } else { st.cur = tap.to; st.prev = tap.from; st.since = s - 0.36; }
        } else shown = st.cur;
        render(st);
        return !!tap && api.since(tap.at) < 1.5;
      };
    },
  };

  /* ---- 3. a viewfinder slides along the strip and frames one pick at a time ---- */
  SC.viewfinder = {
    dur: 10,
    build(svg, api) {
      const CARDS = [[["On your computer:"], "AutoClip"], [["Agents around", "the clips:"], "Munder Difflin"], [["One click:"], "Klap"], [["Edit too:"], "Descript"]];
      const CW = 326, CH = 420, CY = 620, CX = [0, 1, 2, 3].map((i) => 251 + i * 366), LAND = [2.4, 4.4, 6.4, 8.4];
      const strip = el("rect", { x: 40, y: 370, width: 1520, height: 500, rx: 44, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const cards = CARDS.map(([lab, name]) => {
        const g = el("g", {}, svg), x = -CW / 2, y = -CH / 2;
        el("rect", { x: x + 10, y: y + 10, width: CW, height: CH, rx: 24, fill: LIL }, g);
        el("rect", { x, y, width: CW, height: CH, rx: 24, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        const lt = el("g", {}, g);
        lab.forEach((s, j) => fit(mono(lt, x + 28, y + 176 + j * 40, s, { "font-size": 27 }), CW - 56));
        const nm = fit(txt(g, x + 28, y + 350, name, { "font-size": 42, "font-weight": 700 }), CW - 56);
        return { g, lt, nm };
      });
      const vf = el("g", {}, svg);
      pad(vf, { x: -214, y: -294, width: 428, height: 556, rx: 50 });
      ring(vf, { x: -214, y: -294, width: 428, height: 556, rx: 50 });
      el("rect", { x: -64, y: -274, width: 128, height: 48, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, vf);
      el("path", { d: rr(193, 240, 40) + rr(181, 228, 32), "fill-rule": "evenodd", fill: SKY, stroke: INK, "stroke-width": 3 }, vf);
      el("path", { d: rr(181, 228, 32) + rr(171, 218, 24), "fill-rule": "evenodd", fill: YEL, stroke: INK, "stroke-width": 2.5 }, vf);
      const dot = el("circle", { cx: 144, cy: -191, r: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, vf);
      const T = (t) => {
        const f = io(seg(t, 3.7, 4.4)) + io(seg(t, 5.7, 6.4)) + io(seg(t, 7.7, 8.4));
        let b = 0; LAND.forEach((L) => { b = Math.max(b, Math.sin(Math.PI * seg(t, L - 0.05, L + 0.3))); });
        return {
          strip: seg(t, 0.1, 0.7), c: [0, 1, 2, 3].map((i) => seg(t, 0.45 + i * 0.1, 0.95 + i * 0.1)),
          lt: [0, 1, 2, 3].map((i) => seg(t, 0.95 + i * 0.1, 1.35 + i * 0.1)), nm: [0, 1, 2, 3].map((i) => seg(t, 1.15 + i * 0.1, 1.55 + i * 0.1)),
          x: t < 2.4 ? lerp(-260, CX[0], ob(seg(t, 1.7, 2.4))) : CX[0] + 366 * f, vo: seg(t, 1.7, 1.9), bump: b,
          dot: t >= SC.viewfinder.dur || t % 1 < 0.6 ? 1 : 0, idx: t < 2.4 ? -1 : Math.round(f),
        };
      };
      const render = (st) => {
        const sk = oc(st.strip); op(strip, sk); strip.setAttribute("transform", `translate(0 ${30 * (1 - sk)})`);
        cards.forEach((cd, i) => {
          tf(cd.g, CX[i], CY + 50 * (1 - ob(st.c[i]))); op(cd.g, st.c[i] * 3);
          op(cd.lt, oc(st.lt[i])); const k = oc(st.nm[i]); op(cd.nm, k); cd.nm.setAttribute("transform", `translate(0 ${16 * (1 - k)})`);
        });
        tf(vf, st.x, CY, 1 + 0.035 * st.bump); op(vf, st.vo); op(dot, st.dot);
      };
      let tap = null, shown = -1;
      button(vf, "Viewfinder: move it to the next card", () => {
        const from = shown, to = (shown + 1) % 4;
        tap = { at: api.now(), from, to, d: from === 3 ? 0.9 : 0.6 }; shown = to; api.seek(SC.viewfinder.dur); api.poke();
      });
      api.reset = () => { tap = null; shown = -1; };
      return (t) => {
        const st = T(t);
        if (tap) {
          const s = api.since(tap.at), a = tap.from < 0 ? -260 : CX[tap.from];
          st.x = lerp(a, CX[tap.to], io(seg(s, 0, tap.d))); st.bump = Math.sin(Math.PI * seg(s, tap.d - 0.05, tap.d + 0.3)); st.vo = 1;
          render(st); return s < tap.d + 0.4;
        }
        shown = st.idx; render(st); return false;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6,
    build(svg) {
      const chip = el("g", {}, svg);
      const cr = el("rect", { x: 120, y: 96, width: 10, height: 60, rx: 30, fill: SKY, stroke: INK, "stroke-width": 3 }, chip);
      const ct = mono(chip, 148, 137, "Comparisons", { "font-size": 30 });
      cr.setAttribute("width", ct.getComputedTextLength() + 56);
      const title = fit(txt(svg, 114, 292, "OpusClip Alternatives", { "font-size": 116, "font-weight": 700 }), 1360);
      const line = txt(svg, 120, 374, "Six picks for AI clips, free and open source", { "font-size": 44, "font-weight": 500, fill: MUTE });
      const when = mono(svg, 120, 436, "Checked 28 Nov 2026", { "font-size": 28, "font-weight": 500, fill: CAP });
      const film = el("g", {}, svg);
      el("rect", { x: 0, y: 0, width: 250, height: 92, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, film);
      for (let k = 0; k < 6; k++) [10, 68].forEach((hy) => el("rect", { x: k * (250 / 6) + 11, y: hy, width: 20, height: 14, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, film));
      [18, 132].forEach((wx) => el("rect", { x: wx, y: 32, width: 100, height: 28, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, film));
      const board = el("g", {}, svg);
      el("rect", { x: 0, y: 40, width: 210, height: 104, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 3 }, board);
      el("rect", { x: 16, y: 56, width: 178, height: 72, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, board);
      [[34, 82, 120], [34, 104, 90]].forEach(([x, y, w]) => el("path", { d: `M${x} ${y} H${x + w}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, board));
      const bar = (g, y, dir) => { el("rect", { x: 0, y, width: 210, height: 20, rx: 4, fill: BLUE }, g); for (let k = 0; k < 4; k++) { const x0 = 20 + k * 50; el("path", { d: dir ? `M${x0} ${y} H${x0 + 22} L${x0 + 34} ${y + 20} H${x0 + 12} Z` : `M${x0 + 12} ${y} H${x0 + 34} L${x0 + 22} ${y + 20} H${x0} Z`, fill: "#fff" }, g); } el("rect", { x: 0, y, width: 210, height: 20, rx: 4, fill: "none", stroke: INK, "stroke-width": 3 }, g); };
      bar(board, 18, 1);
      const lid = el("g", { transform: "rotate(-9 0 16)" }, board); bar(lid, -6, 0);
      const cards = [[120, MINT, LIL, "AutoClip:", "MIT, on your own computer"], [840, LIL, SOFT, "OpusClip Free:", "60 credits a month"]].map(([x, fill, sh, a, b]) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 14, y: 624, width: 640, height: 200, rx: 28, fill: sh }, g);
        el("rect", { x, y: 610, width: 640, height: 200, rx: 28, fill, stroke: INK, "stroke-width": 3 }, g);
        const words = el("g", {}, g);
        fit(txt(words, x + 36, 690, a, { "font-size": 50, "font-weight": 700 }), 568);
        fit(mono(words, x + 36, 758, b, { "font-size": 32 }), 568);
        return { g, words, x };
      });
      const objs = [[film, 156, 498, -4], [board, 876, 448, 0]];
      return (t) => {
        const c = seg(t, 0.15, 0.55); at(chip, 180, 126, 0.6 + 0.4 * ob(c)); op(chip, c * 3);
        const k = oc(seg(t, 0.3, 0.85)); title.setAttribute("transform", `translate(0 ${30 * (1 - k)})`); op(title, k);
        op(line, oc(seg(t, 0.5, 0.95))); op(when, oc(seg(t, 0.65, 1.05)));
        objs.forEach(([g, x, y, r], i) => { const o = seg(t, 1.0 + i * 0.12, 1.55 + i * 0.12); tf(g, x, y - 60 * (1 - ob(o)), 1, r); op(g, o * 3); });
        cards.forEach((cd, i) => {
          const o = seg(t, 1.15 + i * 0.12, 1.7 + i * 0.12); at(cd.g, cd.x + 320, 710, 0.9 + 0.1 * ob(o), 0, 40 * (1 - ob(o))); op(cd.g, o * 3);
          const w = oc(seg(t, 1.7 + i * 0.1, 2.2 + i * 0.1)); op(cd.words, w); cd.words.setAttribute("transform", `translate(0 ${12 * (1 - w)})`);
        });
        return false;
      };
    },
  };

  /* ---- player: plays once in view, holds the final frame, replays after it leaves the view ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 1600, H = sc.h || 1200;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    const clock = () => performance.now() / 1000;
    let start = null, paused = 0, raf = 0, seen = false;
    const tl = () => (calm ? sc.dur : start === null ? paused : Math.min(sc.dur, clock() - start));
    let draw = () => false;
    const tick = () => { cancelAnimationFrame(raf); if (frozen) return; const busy = draw(tl()); if (seen && (busy || (!calm && tl() < sc.dur))) raf = requestAnimationFrame(tick); };
    const api = { now: clock, since: (a) => clock() - a, seek: (s) => { paused = s; start = seen ? clock() - s : null; }, poke: () => tick(), reset: null };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.dur : cl(fixed, 0, sc.dur)); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (start === null) start = clock() - paused; tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); paused = tl(); start = null; if (!calm && paused >= sc.dur) { paused = 0; if (api.reset) api.reset(); draw(0); } }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    draw(tl());
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
