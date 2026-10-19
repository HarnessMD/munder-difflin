/* Bright coded scenes for "Kilo Code vs Cline". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 34, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
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
  /* shrink a label until it fits, never below 30 units in a 1600 wide drawing */
  const fit = (n, max, min = 30) => { let s = parseFloat(n.getAttribute("font-size")); try { while (n.getComputedTextLength() > max && s > min) { s -= 1; n.setAttribute("font-size", s); } } catch (e) {} return n; };
  /* a shape drawn three times: soft base, a colour layer that fades in, then the ink outline */
  const layered = (tag, a, p, base, col, sw = 4) => {
    el(tag, Object.assign({}, a, { fill: base }), p);
    const top = el(tag, Object.assign({}, a, { fill: col, opacity: 0 }), p);
    el(tag, Object.assign({}, a, { fill: "none", stroke: INK, "stroke-width": sw, "stroke-linejoin": "round" }), p);
    return top;
  };

  const SC = {};

  /* ---- 1. two tool belts, pouches fill one by one ---- */
  const TOOLS = [
    (g, c) => { // screwdriver handle
      el("rect", { x: -6, y: -40, width: 12, height: 80, fill: "#fff", stroke: INK, "stroke-width": 4 }, g);
      el("rect", { x: -18, y: -104, width: 36, height: 72, rx: 14, fill: c, stroke: INK, "stroke-width": 4 }, g);
      el("path", { d: "M-18 -56 H18", stroke: INK, "stroke-width": 4 }, g);
    },
    (g, c) => { // wrench
      el("rect", { x: -10, y: -76, width: 20, height: 120, rx: 8, fill: c, stroke: INK, "stroke-width": 4 }, g);
      el("circle", { cx: 0, cy: -90, r: 26, fill: c, stroke: INK, "stroke-width": 4 }, g);
      el("rect", { x: -9, y: -122, width: 18, height: 28, fill: "#fff" }, g);
      el("path", { d: "M-9 -114 V-96 H9 V-114", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, g);
    },
    (g, c) => { // pencil
      el("rect", { x: -15, y: -96, width: 30, height: 140, fill: c, stroke: INK, "stroke-width": 4 }, g);
      el("path", { d: "M-15 -96 L0 -126 L15 -96 Z", fill: "#fff", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, g);
      el("path", { d: "M-5 -116 L0 -126 L5 -116 Z", fill: INK }, g);
    },
    (g, c) => { // ruler
      el("rect", { x: -22, y: -100, width: 44, height: 150, rx: 5, fill: c, stroke: INK, "stroke-width": 4 }, g);
      el("path", { d: "M-22 -84 H-6 M-22 -68 H-12 M-22 -52 H-6 M-22 -36 H-12", stroke: INK, "stroke-width": 4 }, g);
    },
    (g, c) => { // hammer
      el("rect", { x: -8, y: -86, width: 16, height: 130, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 4 }, g);
      el("rect", { x: -42, y: -116, width: 84, height: 34, rx: 10, fill: c, stroke: INK, "stroke-width": 4 }, g);
    },
  ];
  SC.belts = {
    w: 1600, h: 1200, dur: 11, still: 7.5,
    build(svg) {
      txt(svg, 60, 122, "Where each one runs", { "font-size": 58, "font-weight": 700 });
      const note = txt(svg, 1540, 120, "", { "text-anchor": "end", "font-size": 36, "font-weight": 600 });
      const dot = el("circle", { r: 13, cy: 108, stroke: INK, "stroke-width": 4 }, svg);
      const SHARED = { "VS Code": 1, JetBrains: 1, CLI: 1 };
      const AT = { "VS Code": 0.8, JetBrains: 1.6, CLI: 2.4, cloud: 3.6, "desktop app": 4.4, SDK: 5.2 };
      const rows = [
        { name: "Kilo Code", oy: 0, items: ["VS Code", "JetBrains", "CLI", "cloud"] },
        { name: "Cline", oy: 486, items: ["VS Code", "JetBrains", "CLI", "desktop app", "SDK"] },
      ];
      const pouches = [];
      let tk = 0;
      rows.forEach((r) => {
        const oy = r.oy, n = r.items.length, gap = 26, pw = (1340 - gap * (n - 1)) / n, top = 368 + oy, h = 250;
        txt(svg, 60, 216 + oy, r.name, { "font-size": 52, "font-weight": 700 });
        el("rect", { x: 60, y: 350 + oy, width: 1480, height: 60, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 4 }, svg);
        el("path", { d: `M180 ${363 + oy} H1526 M180 ${397 + oy} H1526`, stroke: INK, "stroke-width": 3, "stroke-dasharray": "12 10", fill: "none" }, svg);
        el("rect", { x: 66, y: 334 + oy, width: 98, height: 92, rx: 16, fill: YEL, stroke: INK, "stroke-width": 4 }, svg);
        el("rect", { x: 88, y: 356 + oy, width: 54, height: 48, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 4 }, svg);
        el("path", { d: `M88 ${380 + oy} H156`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
        r.items.forEach((it, i) => {
          const px = 190 + i * (pw + gap), cx = px + pw / 2, col = SHARED[it] ? MINT : YEL;
          const tool = el("g", {}, svg);
          TOOLS[tk++ % TOOLS.length](tool, col === YEL ? BLUE : [LIL, SKY, YEL][i % 3]);
          const pg = el("g", {}, svg);
          const d = `M${px} ${top} H${px + pw} V${top + h - 54} Q${px + pw} ${top + h} ${px + pw - 54} ${top + h} H${px + 54} Q${px} ${top + h} ${px} ${top + h - 54} Z`;
          const fillL = layered("path", { d }, pg, SOFT, col);
          el("path", { d: `M${px + 18} ${top + 36} H${px + pw - 18}`, stroke: INK, "stroke-width": 3, "stroke-dasharray": "12 9" }, pg);
          [px + 24, px + pw - 24].forEach((x) => el("circle", { cx: x, cy: top + 18, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, pg));
          const lg = el("g", {}, pg);
          const one = txt(lg, 0, 14, it, { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
          let wide = false; try { wide = one.getComputedTextLength() > pw - 40; } catch (e) {}
          if (wide && it.includes(" ")) { // two lines instead of a smaller font
            const [a, b] = it.split(" "); one.textContent = a; one.setAttribute("y", -10);
            txt(lg, 0, 38, b, { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
          } else fit(one, pw - 40, 32);
          pouches.push({ tool, pg, fillL, lg, cx, top, ly: top + 142, at: AT[it] });
        });
      });
      return (t) => {
        const out = seg(t, 9.8, 10.5);
        pouches.forEach((p) => {
          const d = seg(t, p.at - 0.15, p.at + 0.35), k = oc(seg(t, p.at, p.at + 0.45)) * (1 - out);
          tf(p.tool, p.cx, p.top - 190 * (1 - ob(d)) - 120 * out);
          p.tool.setAttribute("opacity", d <= 0 ? 0 : 1 - out);
          const w = seg(t, p.at + 0.25, p.at + 1.0);
          p.pg.setAttribute("transform", `rotate(${Math.sin(w * Math.PI * 3) * 2.2 * (1 - w)} ${p.cx} ${p.top})`);
          p.fillL.setAttribute("opacity", k);
          p.lg.setAttribute("opacity", k);
          tf(p.lg, p.cx, p.ly, 0.7 + 0.3 * ob(seg(t, p.at + 0.1, p.at + 0.5)));
        });
        const s = t < 0.8 || out >= 1 ? 0 : t < 3.4 ? 1 : 2;
        note.textContent = s === 1 ? "Both cover the same core" : s === 2 ? "After that they split" : "";
        note.setAttribute("opacity", 1 - out);
        let nw = 0; try { nw = s ? note.getComputedTextLength() : 0; } catch (e) {}
        dot.setAttribute("cx", 1540 - nw - 28); dot.setAttribute("fill", s === 1 ? MINT : YEL); dot.setAttribute("opacity", s ? 1 - out : 0);
      };
    },
  };

  /* ---- 2. two fuel pumps, tap one to light its nozzles ---- */
  const NOZZLE = (g, s) => {
    const w = 4 / s;
    el("path", { d: "M34 -4 C62 -4 66 40 42 46", stroke: INK, "stroke-width": w + 1 / s, fill: "none", "stroke-linecap": "round" }, g);
    el("circle", { cx: 42, cy: 46, r: 7, fill: INK }, g);
    el("path", { d: "M-14 -18 L-52 -8 Q-58 -6 -55 0 L-14 -4 Z", fill: "#fff", stroke: INK, "stroke-width": w, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-2 8 V26 Q-2 34 6 34 H28 Q36 34 36 26 V8", fill: "none", stroke: INK, "stroke-width": w }, g);
    el("path", { d: "M8 8 L14 22", stroke: INK, "stroke-width": w, "stroke-linecap": "round" }, g);
    const body = el("rect", { x: -16, y: -26, width: 58, height: 36, rx: 12, fill: "#fff", stroke: INK, "stroke-width": w }, g);
    const rays = el("path", { d: "M-64 -14 L-78 -22 M-66 0 L-82 2 M-62 12 L-74 24", stroke: INK, "stroke-width": w, "stroke-linecap": "round" }, g);
    return { body, rays };
  };
  SC.pumps = {
    w: 1600, h: 1200, dur: 11, still: 8,
    build(svg, api) {
      txt(svg, 60, 122, "How you pay for the model", { "font-size": 58, "font-weight": 700 });
      txt(svg, 1540, 120, "tap a pump", { "text-anchor": "end", "font-size": 34, "font-weight": 500, fill: MUTE });
      el("rect", { x: 60, y: 1070, width: 1480, height: 44, rx: 22, fill: SOFT }, svg);
      const P = [
        { name: "Kilo Code", X: 170, side: -1, col: SKY, sum: "five ways to pay", items: ["free models", "local models", "BYOK", "Kilo Gateway", "Kilo Pass"], at0: 0.8 },
        { name: "Cline", X: 870, side: 1, col: LIL, sum: "two ways to pay", items: ["at cost", "BYOK"], at0: 3.9 },
      ];
      let pin = -1, pinAt = 0;
      const pumps = P.map((p, pi) => {
        const g = el("g", {}, svg), X = p.X, n = p.items.length, big = n < 3, BL = X + 20, BR = X + 540;
        el("rect", { x: p.side < 0 ? X - 100 : X - 20, y: 150, width: 680, height: 940, rx: 40, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 3, "stroke-dasharray": "8 10", class: "mg-ring" }, g);
        /* the big hose and the nozzle that hangs on the outer side */
        const hx = p.side < 0 ? BL : BR, cx = hx + p.side * 62, cy = 720;
        const hose = `M${cx} ${cy - 50} C${cx + p.side * 30} ${cy - 190} ${hx + p.side * 70} ${cy - 250} ${hx} ${cy - 262}`;
        el("path", { d: hose, stroke: INK, "stroke-width": 24, fill: "none", "stroke-linecap": "round" }, g);
        el("path", { d: hose, stroke: p.col, "stroke-width": 16, fill: "none", "stroke-linecap": "round" }, g);
        el("rect", { x: BL, y: 270, width: 520, height: 770, rx: 30, fill: "#fff", stroke: INK, "stroke-width": 4 }, g);
        const hang = el("g", { transform: `translate(${cx} ${cy}) scale(${-p.side} 1)` }, g);
        el("path", { d: "M26 -26 H52 Q62 -26 62 -16 V18 Q62 28 52 28 H26", fill: "none", stroke: INK, "stroke-width": 4 }, hang);
        el("path", { d: "M-10 36 L-18 112 Q-19 122 -10 122 L6 36 Z", fill: "#fff", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, hang);
        el("rect", { x: -28, y: -52, width: 56, height: 92, rx: 16, fill: p.col, stroke: INK, "stroke-width": 4 }, hang);
        el("path", { d: "M-14 -30 H14 M-14 -14 H14", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, hang);
        el("rect", { x: X, y: 1022, width: 560, height: 48, rx: 16, fill: p.col, stroke: INK, "stroke-width": 4 }, g);
        el("rect", { x: X, y: 170, width: 560, height: 112, rx: 26, fill: p.col, stroke: INK, "stroke-width": 4 }, g);
        txt(g, X + 280, 246, p.name, { "text-anchor": "middle", "font-size": 60, "font-weight": 700 });
        el("rect", { x: BL + 40, y: 320, width: 440, height: 106, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 4 }, g);
        const screen = txt(g, X + 280, 388, p.sum, { "text-anchor": "middle", "font-family": MONO, "font-size": 40, "font-weight": 700 });
        const top = 456, H = 556, rh = H / n, s = big ? 1.5 : 1.1;
        const rows = p.items.map((it, i) => {
          const cy = top + rh * (i + 0.5), nx = BL + (big ? 142 : 112), ny = cy - (big ? 12 : 8);
          const ng = el("g", {}, g); tf(ng, nx, ny, s);
          const nz = NOZZLE(ng, s);
          const pw = big ? 240 : 292, ph = big ? 124 : 80, px = BR - 28 - pw;
          const pill = layered("rect", { x: px, y: cy - ph / 2, width: pw, height: ph, rx: ph / 2 }, g, "#fff", p.col);
          const lab = fit(txt(g, px + pw / 2, cy + (big ? 18 : 13), it, { "text-anchor": "middle", "font-size": big ? 52 : 38, "font-weight": 700 }), pw - 36, 32);
          return { ng, nz, nx, ny, pill, lab };
        });
        button(g, `${p.name}: ${p.items.join(", ")}`, () => { if (pin === pi) { pin = -1; api.seek(0); } else { pin = pi; pinAt = api.now(); api.poke(); } });
        return { g, p, rows, screen, s };
      });
      return (t, now) => {
        const out = seg(t, 9.8, 10.4);
        pumps.forEach((u, pi) => {
          let last = -1, done = false;
          u.rows.forEach((r, i) => {
            let k, pop;
            if (pin >= 0) { const e = now - pinAt; k = pin === pi ? seg(e, 0.1 + i * 0.2, 0.4 + i * 0.2) : 0; pop = pin === pi ? seg(e, 0.1 + i * 0.2, 0.6 + i * 0.2) : 0; }
            else { const a = u.p.at0 + i * 0.55; k = seg(t, a, a + 0.3) * (1 - out); pop = seg(t, a, a + 0.5); }
            if (k > 0.5) last = i;
            r.pill.setAttribute("opacity", k);
            r.lab.setAttribute("fill", k > 0.5 ? INK : MUTE);
            r.nz.body.setAttribute("fill", k > 0.5 ? YEL : "#fff");
            r.nz.rays.setAttribute("opacity", k);
            tf(r.ng, r.nx, r.ny - 10 * Math.sin(pop * Math.PI), u.s, -8 * Math.sin(pop * Math.PI));
          });
          const n = u.rows.length;
          if (pin >= 0) done = pin === pi && now - pinAt > 0.9 + n * 0.2;
          else done = t > u.p.at0 + (n - 1) * 0.55 + 0.9;
          const showing = last >= 0 && !done ? u.p.items[last] : u.p.sum;
          u.screen.textContent = showing;
          u.screen.setAttribute("fill", last >= 0 ? INK : MUTE);
          u.g.setAttribute("aria-pressed", pin === pi ? "true" : "false");
        });
      };
    },
  };

  /* ---- 3. cinema seats, a slider lights more Kilo Code seats ---- */
  SC.seats = {
    w: 1600, h: 1200, dur: 11.5, still: 7.5,
    build(svg, api) {
      txt(svg, 60, 122, "Team plans", { "font-size": 58, "font-weight": 700 });
      const N = 5, SX = (i) => 80 + i * 288 + 19;
      const arms = (y) => { for (let i = 0; i <= N; i++) el("rect", { x: SX(i) - 32, y: y + 148, width: 26, height: 112, rx: 13, fill: SOFT, stroke: INK, "stroke-width": 4 }, svg); };
      const seat = (x, y, tag) => {
        const g = el("g", {}, svg); tf(g, x, y);
        el("rect", { x: 56, y: 252, width: 138, height: 32, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 4 }, g);
        const back = layered("rect", { x: 10, y: 0, width: 230, height: 222, rx: 36 }, g, SOFT, BLUE);
        const cush = layered("rect", { x: 0, y: 196, width: 250, height: 64, rx: 26 }, g, SOFT, LIL);
        if (!tag) return { g };
        const tg = el("g", {}, g);
        const tagL = layered("rect", { x: 26, y: 22, width: 198, height: 168, rx: 20 }, tg, "#fff", YEL, 4);
        el("circle", { cx: 125, cy: 42, r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, tg);
        txt(tg, 125, 104, "$15", { "text-anchor": "middle", "font-size": 56, "font-weight": 700 });
        fit(txt(tg, 125, 140, "per user", { "text-anchor": "middle", "font-size": 33, "font-weight": 600 }), 170, 30);
        fit(txt(tg, 125, 174, "per month", { "text-anchor": "middle", "font-size": 33, "font-weight": 600 }), 170, 30);
        return { g, back, cush, tg, tagL, x, y };
      };
      txt(svg, 60, 214, "Kilo Code", { "font-size": 52, "font-weight": 700 });
      const kilo = Array.from({ length: N }, (_, i) => seat(SX(i), 244, true));
      arms(244);
      el("rect", { x: 60, y: 528, width: 1480, height: 22, rx: 11, fill: SOFT }, svg);
      txt(svg, 60, 640, "Cline", { "font-size": 52, "font-weight": 700 });
      Array.from({ length: N }, (_, i) => seat(SX(i), 670, false));
      arms(670);
      el("rect", { x: 60, y: 954, width: 1480, height: 22, rx: 11, fill: SOFT }, svg);
      const sign = el("g", {}, svg);
      [600, 978].forEach((x) => el("rect", { x, y: 880, width: 22, height: 76, fill: "#fff", stroke: INK, "stroke-width": 4 }, sign));
      el("rect", { x: 450, y: 700, width: 700, height: 196, rx: 28, fill: YEL, stroke: INK, "stroke-width": 4 }, sign);
      txt(sign, 800, 786, "Enterprise,", { "text-anchor": "middle", "font-size": 64, "font-weight": 700 });
      txt(sign, 800, 862, "contact sales", { "text-anchor": "middle", "font-size": 64, "font-weight": 700 });
      const A = 560, B = 1500, Y = 1074;
      txt(svg, 60, Y + 11, "drag to light more seats", { "font-size": 32, "font-weight": 500, fill: MUTE });
      const hit = el("rect", { x: A - 30, y: Y - 44, width: B - A + 60, height: 88, fill: "#fff", "fill-opacity": 0 }, svg);
      el("path", { d: `M${A} ${Y} H${B}`, stroke: SOFT, "stroke-width": 24, "stroke-linecap": "round" }, svg);
      const fill = el("path", { d: `M${A} ${Y} H${A}`, stroke: YEL, "stroke-width": 24, "stroke-linecap": "round" }, svg);
      const knob = el("g", { role: "slider", tabindex: "0", "aria-label": "Light more Kilo Code seats", "aria-valuemin": 1, "aria-valuemax": N, class: "mg-hit" }, svg);
      el("circle", { r: 46, fill: "#fff", "fill-opacity": 0 }, knob);
      el("circle", { r: 30, fill: "#fff", stroke: INK, "stroke-width": 4 }, knob);
      el("path", { d: "M-8 -9 L-16 0 L-8 9 M8 -9 L16 0 L8 9", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, knob);
      let user = null, down = false;
      const set = (e) => { const r = svg.getBoundingClientRect(); user = cl(((e.clientX - r.left) / r.width * 1600 - A) / (B - A)); api.poke(); };
      [knob, hit].forEach((n) => {
        n.addEventListener("pointerdown", (e) => { down = true; knob.setPointerCapture(e.pointerId); set(e); knob.focus && knob.focus({ preventScroll: true }); });
      });
      knob.addEventListener("pointermove", (e) => { if (down) set(e); });
      knob.addEventListener("pointerup", () => { down = false; });
      knob.addEventListener("pointercancel", () => { down = false; });
      knob.addEventListener("keydown", (e) => {
        const step = 1 / (N - 1), cur = user == null ? 1 : user;
        const v = e.key === "ArrowRight" || e.key === "ArrowUp" ? cur + step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? cur - step : e.key === "Home" ? 0 : e.key === "End" ? 1 : null;
        if (v != null) { e.preventDefault(); user = cl(Math.round(v / step) * step); api.poke(); }
      });
      return (t) => {
        const v = user != null ? user : io(seg(t, 0.8, 5.2)) - io(seg(t, 9.6, 10.9));
        const L = 1 + v * (N - 1);
        tf(knob, A + (B - A) * v, Y); fill.setAttribute("d", `M${A} ${Y} H${A + (B - A) * v}`);
        knob.setAttribute("aria-valuenow", Math.round(L));
        kilo.forEach((s, i) => {
          const k = cl(L - i);
          s.back.setAttribute("opacity", k); s.cush.setAttribute("opacity", k); s.tagL.setAttribute("opacity", k);
          s.tg.setAttribute("opacity", 0.4 + 0.6 * k);
          tf(s.g, s.x, s.y - 12 * Math.sin(k * Math.PI));
        });
      };
    },
  };

  /* ---- title card, 16 by 9: a rally over a ping pong table ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 2.4, still: 1.6,
    build(svg) {
      txt(svg, 96, 214, "TWO OPEN SOURCE CODING AGENTS", { "font-family": MONO, "font-size": 32, "font-weight": 700, fill: MUTE, "letter-spacing": 2 });
      txt(svg, 88, 384, "Kilo Code", { "font-size": 150, "font-weight": 700 });
      txt(svg, 88, 548, "vs Cline", { "font-size": 150, "font-weight": 700 });
      el("path", { d: "M98 592 H600", stroke: YEL, "stroke-width": 18, "stroke-linecap": "round" }, svg);
      txt(svg, 96, 690, "Checked 19 Oct 2026", { "font-family": MONO, "font-size": 38, "font-weight": 700, fill: INK });
      [[1010, 668], [1470, 668]].forEach(([x, y]) => el("rect", { x: x - 10, y, width: 20, height: 150, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 4 }, svg));
      el("rect", { x: 940, y: 820, width: 600, height: 20, rx: 10, fill: SOFT }, svg);
      el("rect", { x: 950, y: 640, width: 580, height: 30, rx: 10, fill: MINT, stroke: INK, "stroke-width": 4 }, svg);
      el("path", { d: "M1240 644 V666", stroke: "#fff", "stroke-width": 4 }, svg);
      el("rect", { x: 1196, y: 576, width: 88, height: 64, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 4 }, svg);
      el("path", { d: "M1218 576 V640 M1240 576 V640 M1262 576 V640 M1196 597 H1284 M1196 618 H1284", stroke: INK, "stroke-width": 2 }, svg);
      const A = [1100, 392], B = [1360, 392], AP = 160;
      el("path", { d: `M${A[0]} ${A[1]} Q1240 ${2 * AP - A[1]} ${B[0]} ${B[1]}`, stroke: MUTE, "stroke-width": 4, "stroke-dasharray": "2 16", "stroke-linecap": "round", fill: "none" }, svg);
      const paddle = (col) => { const g = el("g", {}, svg); el("rect", { x: -17, y: 70, width: 34, height: 112, rx: 14, fill: YEL, stroke: INK, "stroke-width": 4 }, g); el("circle", { r: 86, fill: col, stroke: INK, "stroke-width": 4 }, g); el("circle", { r: 62, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "3 14", "stroke-linecap": "round" }, g); return g; };
      const L = paddle(BLUE), R = paddle(LIL);
      const conf = [[960, 200, SKY], [1520, 230, YEL], [1450, 120, LIL], [1080, 120, MINT]].map(([x, y, c], i) => el(i % 2 ? "circle" : "rect", i % 2 ? { cx: x, cy: y, r: 11, fill: c, stroke: INK, "stroke-width": 3 } : { x: x - 10, y: y - 10, width: 20, height: 20, rx: 4, fill: c, stroke: INK, "stroke-width": 3 }, svg));
      const ball = el("circle", { r: 20, fill: "#fff", stroke: INK, "stroke-width": 4 }, svg);
      return (t) => {
        const u = ((t % 2.4) + 2.4) % 2.4 / 2.4, half = u < 0.5, p = io(half ? u * 2 : (u - 0.5) * 2), f = half ? p : 1 - p;
        const x = A[0] + (B[0] - A[0]) * f, y = A[1] - (A[1] - AP) * 4 * f * (1 - f);
        ball.setAttribute("cx", x); ball.setAttribute("cy", y);
        const hitL = Math.max(0, 1 - Math.min(u, 1 - u) * 8), hitR = Math.max(0, 1 - Math.abs(u - 0.5) * 8);
        tf(L, 1012, 420, 1, -18 + 14 * hitL);
        tf(R, 1448, 420, 1, 18 - 14 * hitR);
        conf.forEach((n, i) => n.setAttribute("transform", `translate(0 ${Math.sin(t * 2.6 + i * 1.7) * 6})`));
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
