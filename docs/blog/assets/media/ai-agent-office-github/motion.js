/* Bright coded scenes for "Open Source AI Agent Office Apps on GitHub". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878", GREY = "#D9D0E4";
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
  const ring = (g, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, a), g);
  const pill = (svg, x, y, w, label, col, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x, y, width: w, height: 48, rx: 24, fill: col, stroke: INK, "stroke-width": 3 }, g);
    ring(g, { x: x - 6, y: y - 6, width: w + 12, height: 60, rx: 30 });
    txt(g, x + w / 2, y + 31, label, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
    button(g, label, fn); return g;
  };
  const hint = (svg, x, y, s) => txt(svg, x, y, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  const envelope = (p) => {
    const g = el("g", {}, p);
    el("rect", { x: -17, y: -12, width: 34, height: 24, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
    el("path", { d: "M-17 -11 L0 2 L17 -11", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linejoin": "round" }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. roles, a shared board and messages ---- */
  SC.corkboard = {
    dur: 12, still: 10.6,
    build(svg, api) {
      const TR = [["Researcher", SKY], ["Writer", LIL], ["Reviewer", MINT]], TY = [96, 186, 276];
      [52, 230].forEach((x) => el("rect", { x, y: 120, width: 8, height: 200, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg));
      const trays = TR.map(([name, col], i) => {
        const g = el("g", {}, svg), y = TY[i];
        el("rect", { x: 64, y: y - 12, width: 150, height: 30, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: 40, y, width: 210, height: 62, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 145, y + 40, name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        return g;
      });
      el("rect", { x: 300, y: 60, width: 460, height: 330, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 316, y: 104, width: 428, height: 270, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 530, 92, "Shared board", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(svg, 425, 138, "To do", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 625, 138, "Done", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("circle", { cx: 670, cy: 131, r: 10, fill: MINT, stroke: INK, "stroke-width": 2 }, svg);
      el("path", { d: "M665 131 l3.5 4 l6.5 -8", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      el("path", { d: "M530 118 V362", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, svg);
      const BAR = [SKY, LIL, MINT, YEL, BLUE], cardsG = el("g", {}, svg);
      const cards = BAR.map((c) => {
        const g = el("g", {}, cardsG);
        el("rect", { x: -85, y: -17, width: 170, height: 34, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        el("circle", { cx: -69, cy: 0, r: 5, fill: c, stroke: INK, "stroke-width": 1.5 }, g);
        el("rect", { x: -55, y: -7, width: 92, height: 6, rx: 3, fill: c }, g);
        el("rect", { x: -55, y: 3, width: 58, height: 5, rx: 2.5, fill: GREY }, g);
        const tk = el("g", {}, g);
        el("circle", { cx: 65, cy: 0, r: 9, fill: MINT, stroke: INK, "stroke-width": 1.5 }, tk);
        el("path", { d: "M60.5 0 l3 3.5 l6 -7", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tk);
        return { g, tk };
      });
      el("rect", { x: 40, y: 436, width: 720, height: 60, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      for (let h = 0; h < 8; h++) {
        el("rect", { x: 47 + h * 90, y: 443, width: 76, height: 46, rx: 5, fill: SOFT }, svg);
        if (h) el("path", { d: `M${40 + h * 90} 436 V496`, stroke: INK, "stroke-width": 2 }, svg);
      }
      txt(svg, 40, 534, "Messages", { "font-size": 20, "font-weight": 700 });
      const RX = 276;
      const route = (i, hx) => {
        const y = TY[i] + 31, d = hx >= RX ? 1 : -1;
        const tail = Math.abs(hx - RX) < 28 ? `V430 L${hx} 466` : `V407 Q${RX} 420 ${RX + 13 * d} 420 H${hx - 13 * d} Q${hx} 420 ${hx} 433 V466`;
        return el("path", { d: `M250 ${y} H${RX - 13} Q${RX} ${y} ${RX} ${y + 13} ${tail}`, fill: "none", stroke: "none" }, svg);
      };
      const M = [[0, 1, 1], [1, 5, 2], [2, 3, 0], [0, 6, 2], [1, 0, 0], [2, 4, 1], [0, 2, 1]].map(([a, h, b], k) => {
        const hx = 85 + h * 90, pin = route(a, hx), pout = route(b, hx);
        return { t0: 0.4 + k * 1.4, a, b, hx, pin, pout, Lin: pin.getTotalLength(), Lout: pout.getTotalLength(), n: envelope(svg) };
      });
      const T = [1.6, 3.9, 6.2];
      let clicks = [], lastT = 0;
      hint(svg, 584, 547, "tap Next card");
      pill(svg, 600, 516, 160, "Next card", YEL, () => {
        const done = T.filter((x) => lastT >= x).length + clicks.length;
        if (done >= 5) { clicks = []; api.seek(0.6); } else { clicks.push(api.now()); api.poke(); }
      });
      return (t, now) => {
        if (t < lastT - 0.5) clicks = [];
        lastT = t;
        const fade = 1 - seg(t, 11.3, 11.9);
        let p = 0;
        T.forEach((x) => (p += io(seg(t, x, x + 1.1))));
        clicks.forEach((c) => (p += io(seg(now, c, c + 0.9))));
        p = Math.min(p, 5);
        cardsG.setAttribute("opacity", seg(t, 0, 0.5) * fade);
        cards.forEach((c, i) => {
          const k = cl(p - i); let s = 0;
          for (let j = 0; j < i; j++) s += io(seg(cl(p - j), 0.55, 1));
          let x = 425, y = 167 + 42 * (i - s), sc = 1, r = 0;
          if (k > 0) { const a = Math.sin(Math.PI * k); x = 425 + 210 * io(k); y = 167 + 42 * i * io(k) - 24 * a; sc = 1 + 0.08 * a; r = 5 * a; }
          tf(c.g, x, y, sc, r); c.tk.setAttribute("opacity", seg(k, 0.85, 1));
        });
        const bump = [0, 0, 0];
        M.forEach((m) => {
          const a = t - m.t0; let x = m.hx, y = 466, op = 1;
          if (a < 0 || a > 5.6) op = 0;
          else if (a < 0.7) { const pt = m.pin.getPointAtLength(m.Lin * io(a / 0.7)); x = pt.x; y = pt.y; op = seg(a, 0, 0.12); }
          else if (a > 4.9) { const pt = m.pout.getPointAtLength(m.Lout * (1 - io((a - 4.9) / 0.7))); x = pt.x; y = pt.y; op = 1 - seg(a, 5.45, 5.6); }
          if (a >= 0 && a < 0.3) bump[m.a] = Math.max(bump[m.a], Math.sin((Math.PI * a) / 0.3));
          if (a > 5.3 && a <= 5.6) bump[m.b] = Math.max(bump[m.b], Math.sin((Math.PI * (a - 5.3)) / 0.3));
          tf(m.n, x, y); m.n.setAttribute("opacity", op * fade);
        });
        trays.forEach((g, i) => g.setAttribute("transform", `translate(0 ${-5 * bump[i]})`));
      };
    },
  };

  /* ---- 2. eight boxes land on a shelf, each with its licence tag ---- */
  SC.shelf = {
    dur: 12, still: 10,
    build(svg, api) {
      const B = [["ChatDev"], ["Munder", "Difflin"], ["OpenHands"], ["CrewAI"], ["AG2"], ["Pixel", "Agents"], ["AgentOffice"], ["Claude", "Squad"]];
      const LIC = ["Apache 2.0", "MIT", "MIT", "MIT", "Apache 2.0", "MIT", "MIT", "AGPL 3.0"];
      const H = [190, 208, 180, 198, 172, 204, 186, 196], COL = [YEL, SKY, LIL, MINT, YEL, SKY, LIL, MINT];
      const W = B.map((b) => Math.max(70, Math.max(...b.map((s) => s.length)) * 9.6 + 18)), GAP = 7, SY = 440;
      let x0 = (800 - W.reduce((a, b) => a + b, 0) - GAP * 7) / 2;
      hint(svg, 756, 46, "tap a box");
      [130, 670].forEach((x) => el("path", { d: `M${x} ${SY + 18} V${SY + 64} L${x - 34} ${SY + 18} Z`, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg));
      el("rect", { x: 18, y: SY, width: 764, height: 18, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const call = el("g", { opacity: 0 }, svg);
      el("rect", { x: 220, y: 62, width: 360, height: 118, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, call);
      const cName = txt(call, 400, 104, "", { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
      const cLic = txt(call, 400, 160, "", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });
      let sel = -1, prev = -1, selAt = -99, lastT = 0;
      const boxes = B.map((lines, i) => {
        const w = W[i], h = H[i], x = x0 + w / 2; x0 += w + GAP;
        const g = el("g", {}, svg);
        el("rect", { x: -w / 2, y: -h, width: w, height: h, rx: 8, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M${-w / 2 + 10} ${-h + 14} H${w / 2 - 10}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 6", "stroke-linecap": "round" }, g);
        lines.forEach((s, j) => txt(g, 0, -h + 44 + j * 22, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 }));
        ring(g, { x: -w / 2 - 7, y: -h - 7, width: w + 14, height: h + 14, rx: 12 });
        const tag = el("g", {}, g), tl = LIC[i].split(" ");
        el("rect", { x: -30, y: -54, width: 60, height: 44, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
        tl.forEach((s, j) => txt(tag, 0, tl.length > 1 ? -35 + j * 17 : -26, s, { "text-anchor": "middle", "font-size": 14, "font-weight": 700 }));
        button(g, `${lines.join(" ")}: ${LIC[i]}`, () => { prev = sel; sel = sel === i ? -1 : i; selAt = api.now(); if (lastT < 8.4) api.seek(8.6); else api.poke(); });
        return { g, tag, x, h, s: 0.5 + i * 0.85 };
      });
      return (t, now) => {
        if (t < lastT - 0.5) { sel = -1; prev = -1; }
        lastT = t;
        const fade = 1 - seg(t, 11.3, 11.9), u = oc(seg(now - selAt, 0, 0.35));
        boxes.forEach((b, i) => {
          const k = oc(seg(t, b.s, b.s + 0.8)), dk = ob(seg(t, b.s + 0.8, b.s + 1.3));
          const lift = i === sel ? u : i === prev ? 1 - u : 0;
          tf(b.g, b.x + (900 - b.x) * (1 - k), SY - 36 * lift, 1, -4 * Math.sin(Math.PI * k));
          b.g.setAttribute("opacity", (t > b.s ? 1 : 0) * fade);
          b.tag.setAttribute("transform", `translate(0 ${-(b.h + 10) * (1 - dk)})`);
          b.tag.setAttribute("opacity", seg(t, b.s + 0.8, b.s + 0.95));
        });
        const show = sel >= 0 ? sel : prev, co = sel >= 0 ? u : 1 - u;
        call.setAttribute("opacity", show >= 0 ? co * fade : 0);
        call.setAttribute("transform", `translate(400 121) scale(${0.9 + 0.1 * co}) translate(-400 -121)`);
        if (show >= 0) { cName.textContent = B[show].join(" "); cLic.textContent = LIC[show]; }
      };
    },
  };

  /* ---- 3. name cards drop into three bins ---- */
  SC.bins = {
    dur: 12, still: 10,
    build(svg, api) {
      const BX = [40, 290, 540], BC = [SKY, LIL, MINT], BL = [["Apps", "you run"], ["Frameworks", "you code"], ["Viewers", "you watch"]];
      hint(svg, 624, 64, "tap Sort");
      pill(svg, 640, 34, 120, "Sort", YEL, () => api.seek(0));
      BX.forEach((x) => el("path", { d: `M${x} 256 H${x + 220} L${x + 206} 524 H${x + 14} Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg));
      const CARDS = [["ChatDev", 0], ["Munder Difflin", 0], ["OpenHands", 0], ["CrewAI", 1], ["AG2", 1], ["Pixel Agents", 2]];
      const cnt = [0, 0, 0], ROT = [-2, 1.5, -1, 2, -1.5, 1];
      const cards = CARDS.map(([s, b], j) => {
        const g = el("g", {}, svg);
        el("rect", { x: -90, y: -21, width: 180, height: 42, rx: 10, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 7, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
        const slot = cnt[b]++;
        return { g, tx: BX[b] + 110, ty: 418 - slot * 52, s: 0.7 + j * 1.25, r: ROT[j] };
      });
      BX.forEach((x, i) => {
        el("rect", { x: x - 6, y: 248, width: 232, height: 16, rx: 8, fill: BC[i], stroke: INK, "stroke-width": 3 }, svg);
        BL[i].forEach((s, j) => txt(svg, x + 110, 478 + j * 28, s, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }));
      });
      return (t) => {
        const fade = 1 - seg(t, 11.3, 11.9);
        cards.forEach((c) => {
          const a = t - c.s, pop = ob(seg(a, 0, 0.3)), k = seg(a, 0.45, 1.05);
          let x = 400, y = 150, sc = pop, r = 0;
          if (k > 0) { x = 400 + (c.tx - 400) * io(k); y = 150 + (c.ty - 150) * k * k - 8 * Math.sin(Math.PI * seg(a, 1.05, 1.3)); sc = 1; r = c.r * k; }
          tf(c.g, x, y, Math.max(sc, 0.001), r); c.g.setAttribute("opacity", (a > 0 ? 1 : 0) * fade);
        });
      };
    },
  };

  /* ---- 4. two lamps dim, AG2 relights one ---- */
  SC.lamps = {
    dur: 11, still: 9,
    build(svg, api) {
      const LX = [100, 330, 560], TOP = 400;
      hint(svg, 624, 64, "tap Swap");
      pill(svg, 640, 34, 120, "Swap", YEL, () => api.seek(4.6));
      const lamps = LX.map((bx) => {
        const cx = bx + 64, d = `M${cx - 30} 272 H${cx + 30} L${cx + 76} ${TOP} H${cx - 76} Z`;
        return { bx, cx, cone: el("path", { d, fill: YEL, opacity: 0.35 }, svg), bcone: el("path", { d, fill: BLUE, opacity: 0 }, svg) };
      });
      [56, 728].forEach((x) => el("rect", { x, y: TOP + 18, width: 16, height: 110, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: 30, y: TOP, width: 740, height: 22, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      lamps.forEach((L) => {
        const { bx, cx } = L;
        el("rect", { x: bx - 34, y: TOP - 14, width: 68, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        el("path", { d: `M${bx} ${TOP - 12} L${bx - 18} 316 L${cx} 230`, stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
        el("circle", { cx: bx - 18, cy: 316, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        L.halo = el("circle", { cx, cy: 266, r: 28, fill: YEL, opacity: 0.4 }, svg);
        L.bhalo = el("circle", { cx, cy: 266, r: 28, fill: BLUE, opacity: 0 }, svg);
        el("circle", { cx, cy: 266, r: 13, fill: GREY, stroke: INK, "stroke-width": 2.5 }, svg);
        L.lit = el("circle", { cx, cy: 266, r: 13, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
        L.blue = el("circle", { cx, cy: 266, r: 13, fill: BLUE, stroke: INK, "stroke-width": 2.5, opacity: 0 }, svg);
        el("path", { d: `M${cx - 22} 222 Q${cx} 208 ${cx + 22} 222 L${cx + 38} 264 H${cx - 38} Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      });
      txt(svg, LX[1] + 64, 470, "MetaGPT", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      txt(svg, LX[1] + 64, 496, "last commit 21 Jan 2026", { "text-anchor": "middle", "font-size": 17, "font-weight": 500 });
      txt(svg, LX[2] + 64, 470, "AutoGen", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      txt(svg, LX[2] + 64, 496, "archived", { "text-anchor": "middle", "font-size": 17, "font-weight": 500 });
      const card = el("g", {}, svg);
      el("rect", { x: -40, y: -19, width: 80, height: 38, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, card);
      txt(card, 0, 8, "AG2", { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const CX = LX[2] + 84;
      return (t) => {
        const back = seg(t, 10.2, 10.9);
        const flick = (a, b) => { const k = seg(t, a, b); if (k <= 0) return 1; if (k >= 1) return 0; return (1 - k) * (Math.sin(t * 47) > 0.2 ? 1 : 0.35); };
        const lv = [1, Math.max(flick(1.4, 2.4), back), Math.max(flick(3.0, 4.0), back)];
        const blue = oc(seg(t, 6.1, 6.7)) * (1 - back);
        lamps.forEach((L, i) => {
          const b = i === 2 ? blue : 0, y = lv[i] * (1 - b);
          L.lit.setAttribute("opacity", y); L.halo.setAttribute("opacity", 0.4 * y); L.cone.setAttribute("opacity", 0.35 * y);
          L.blue.setAttribute("opacity", b); L.bhalo.setAttribute("opacity", 0.35 * b); L.bcone.setAttribute("opacity", 0.22 * b);
        });
        const k = oc(seg(t, 4.8, 6.0));
        tf(card, CX + 340 * (1 - k), TOP - 20); card.setAttribute("opacity", (t >= 4.8 ? 1 : 0) * (1 - back));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 9, still: 7.8,
    build(svg) {
      el("rect", { x: 56, y: 62, width: 104, height: 38, rx: 19, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 108, 88, "GitHub", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      txt(svg, 56, 190, "AI agent", { "font-size": 70, "font-weight": 700 });
      txt(svg, 56, 268, "office apps", { "font-size": 70, "font-weight": 700 });
      el("path", { d: "M58 294 H420", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 56, 348, "Open source, on ", { "font-size": 26, "font-weight": 500, fill: MUTE });
      el("tspan", { "font-family": MONO, "font-weight": 700 }, sub).textContent = "GitHub";
      txt(svg, 56, 470, "Checked 23 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      const R = { x: 528, y: 56, w: 392, h: 428 };
      el("rect", { x: R.x, y: R.y, width: R.w, height: R.h, rx: 10, fill: "#fff" }, svg);
      for (let x = R.x + 28; x < R.x + R.w; x += 28) el("path", { d: `M${x} ${R.y} V${R.y + R.h}`, stroke: SOFT, "stroke-width": 1.5 }, svg);
      for (let y = R.y + 28; y < R.y + R.h; y += 28) el("path", { d: `M${R.x} ${y} H${R.x + R.w}`, stroke: SOFT, "stroke-width": 1.5 }, svg);
      el("rect", { x: R.x, y: R.y, width: R.w, height: R.h, rx: 10, fill: "none", stroke: INK, "stroke-width": 4 }, svg);
      el("rect", { x: 737, y: R.y + R.h - 4, width: 48, height: 8, fill: "#fff" }, svg);
      el("path", { d: `M737 ${R.y + R.h} V${R.y + R.h - 48}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: `M737 ${R.y + R.h - 48} A48 48 0 0 1 785 ${R.y + R.h}`, stroke: MUTE, "stroke-width": 1.5, "stroke-dasharray": "3 5", fill: "none" }, svg);
      const D = [["Research", SKY], ["Write", LIL], ["Review", MINT]], DY = [175, 283, 391];
      D.forEach(([s, c], i) => {
        el("rect", { x: 548, y: DY[i] - 16, width: 26, height: 32, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
        el("rect", { x: 586, y: DY[i] - 32, width: 150, height: 64, rx: 8, fill: c, stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, 646, DY[i] + 8, s, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      });
      el("rect", { x: 790, y: 96, width: 110, height: 350, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 800, y: 132, width: 90, height: 304, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 845, 122, "Board", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const cards = Array.from({ length: 6 }, (_, m) => {
        const g = el("g", {}, svg);
        el("rect", { x: -17, y: -12, width: 34, height: 24, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: -10, y: -5, width: 20, height: 4, rx: 2, fill: "#fff" }, g);
        el("rect", { x: -10, y: 2, width: 13, height: 3, rx: 1.5, fill: "#fff" }, g);
        return { g, row: m % 3, col: 1 - Math.floor(m / 3), s: 0.5 + m * 1.1 };
      });
      return (t) => {
        const fade = 1 - seg(t, 8.3, 8.9);
        cards.forEach((c) => {
          const a = t - c.s, pop = ob(seg(a, 0, 0.25)), k = io(seg(a, 0.3, 1.0)), x0 = 716, x1 = 826 + 40 * c.col;
          tf(c.g, x0 + (x1 - x0) * k, DY[c.row] - 22 * Math.sin(Math.PI * k), Math.max(0.001, pop), 0);
          c.g.setAttribute("opacity", (a > 0 ? 1 : 0) * fade);
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
