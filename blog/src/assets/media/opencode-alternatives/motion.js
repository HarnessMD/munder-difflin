/* Bright coded scenes for "OpenCode Alternatives: 7 Coding Agents to Switch To". Vanilla JS, no library.
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
    return txt(svg, 400, y + 32, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 600 });
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  const SC = {};

  /* ---- 1. a glass revolving door: OpenCode goes in on the left, seven alternatives come round on the right ---- */
  SC.door = {
    dur: 12, still: 10.4,
    build(svg, api) {
      txt(svg, 40, 62, "Why look for an OpenCode alternative now?", { "font-size": 30, "font-weight": 700 });
      const DX = 332, R = 146, RY = 30, RT = 12, TOP = 170, BOT = 440, CY = 316, W = Math.PI / 4;
      const pyT = (a) => TOP - RT * Math.sin(a), pyB = (a) => BOT + RY * Math.sin(a);
      const poly = (a0, a1, f) => { let d = ""; for (let i = 0; i <= 16; i++) { const a = ((a0 + ((a1 - a0) * i) / 16) * Math.PI) / 180; d += `${i ? "L" : ""}${(DX + R * Math.cos(a)).toFixed(1)} ${f(a).toFixed(1)} `; } return d; };
      el("path", { d: `M30 ${BOT + 36} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* the ghost of the card that went in */
      const ghost = el("g", { transform: `translate(104 ${CY})` }, svg);
      el("rect", { x: -72, y: -22, width: 144, height: 44, rx: 10, fill: "#fff", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "6 8", "stroke-linecap": "round" }, ghost);
      txt(ghost, 0, 8, "OpenCode", { "text-anchor": "middle", "font-size": 23, "font-weight": 700, fill: MUTE });
      const door = el("g", {}, svg);
      const CR = R + 14, CH = 38;
      el("ellipse", { cx: DX, cy: BOT, rx: CR, ry: RY + 5, fill: SOFT, stroke: INK, "stroke-width": 3 }, door);
      el("ellipse", { cx: DX, cy: TOP, rx: CR, ry: RT + 3, fill: SOFT, stroke: INK, "stroke-width": 3 }, door);
      el("path", { d: `M${poly(225, 315, pyT)}L${poly(315, 225, pyB)}Z`, fill: SKY, "fill-opacity": 0.22 }, door);
      el("path", { d: `M${poly(200, 340, pyB)}`, fill: "none", stroke: LIL, "stroke-width": 2.5, "stroke-linecap": "round" }, door);
      const back = el("g", {}, door);
      el("rect", { x: DX - 7, y: TOP - 4, width: 14, height: BOT - TOP + 4, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, door);
      const cards = el("g", { "pointer-events": "none" }, door);
      const front = el("g", {}, door);
      /* the canopy, seen from just below */
      el("path", { d: `M${DX - CR} ${TOP - CH} A${CR} ${RT + 3} 0 0 1 ${DX + CR} ${TOP - CH} V${TOP} A${CR} ${RT + 3} 0 0 0 ${DX - CR} ${TOP} Z`, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, door);
      const wings = [0, 1, 2, 3].map(() => {
        const g = el("g", {});
        const pane = el("path", { fill: SKY, "fill-opacity": 0.34, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const edge = [el("path", { stroke: INK, "stroke-width": 11, "stroke-linecap": "round" }, g), el("path", { stroke: BLUE, "stroke-width": 5, "stroke-linecap": "round" }, g)];
        return { g, pane, edge };
      });
      el("rect", { x: DX - CR - 12, y: TOP - CH - RT - 16, width: 2 * CR + 24, height: BOT + RY + 22 - (TOP - CH - RT - 16), rx: 24, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, door);
      let pushes = 0, lastPush = -99;
      button(door, "Push the revolving door round", () => { pushes++; lastPush = api.now(); api.poke(); });
      /* the cards */
      const card = (s, fill, w) => {
        const g = el("g", {}, cards);
        el("rect", { x: -w / 2, y: -21, width: w, height: 42, rx: 10, fill, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 8, s, { "text-anchor": "middle", "font-size": 23, "font-weight": 700 });
        return g;
      };
      const oc0 = card("OpenCode", LIL, 144);
      const ALT = [["Claude Code", YEL], ["Codex CLI", SKY], ["Gemini CLI", MINT], ["Kilo Code", LIL], ["Crush", YEL], ["Pi", SKY], ["Goose", MINT]];
      const SX = 628, SY0 = 120, SP = 54;
      const alts = ALT.map(([s, col], i) => ({ g: card(s, col, 210), t0: 2.4 + i * 1.0, y: SY0 + i * SP }));
      const cap = strip(svg, 514, 700);
      return (t, now) => {
        const out = seg(t, 11.4, 11.9);
        const pk = seg(now - lastPush, 0, 0.8), push = pushes ? (pushes - 1 + oc(pk)) * (Math.PI / 2) : 0;
        const th = W * t + push + 0.35;
        wings.forEach((w, i) => {
          const ang = th + (i * Math.PI) / 2, c = Math.cos(ang), s = Math.sin(ang);
          const xe = DX + R * c, yt = TOP - RT * s, yb = BOT + RY * s;
          w.pane.setAttribute("d", `M${DX} ${TOP} L${xe.toFixed(1)} ${yt.toFixed(1)} L${xe.toFixed(1)} ${yb.toFixed(1)} L${DX} ${BOT} Z`);
          const ed = `M${xe.toFixed(1)} ${(yt + 4).toFixed(1)} V${(yb - 4).toFixed(1)}`;
          w.edge.forEach((p) => p.setAttribute("d", ed));
          (s > 0 ? front : back).appendChild(w.g);
        });
        /* OpenCode walks in on the left */
        const k = io(seg(t, 0.6, 2.1));
        tf(oc0, lerp(104, DX, k), CY, 1 - 0.25 * k);
        oc0.setAttribute("opacity", seg(t, 0, 0.3) * (1 - seg(k, 0.55, 0.95)));
        ghost.setAttribute("opacity", seg(t, 1.2, 1.8) * (1 - out));
        /* the alternatives come round one at a time */
        alts.forEach((c) => {
          const a = seg(t, c.t0, c.t0 + 0.45), b = io(seg(t, c.t0 + 0.4, c.t0 + 0.95));
          const x0 = lerp(DX, DX + R + 46, oc(a)), x = lerp(x0, SX, b), y = lerp(CY, c.y, b) - 34 * Math.sin(Math.PI * b);
          tf(c.g, x, y, 0.72 + 0.28 * oc(a));
          c.g.setAttribute("opacity", seg(t, c.t0, c.t0 + 0.25) * (1 - out));
        });
        cap.textContent = t < 2.4 || t >= 11.4 ? "OpenCode 2.0: “1.0 plugins will not work in 2.0”" : "Seven alternatives, checked 15 Oct 2026";
      };
    },
  };

  /* ---- 2. a vending machine: eight buttons, and the licence box each one drops into the tray ---- */
  SC.vending = {
    dur: 12, still: 10.3,
    build(svg, api) {
      txt(svg, 40, 58, "Which OpenCode alternatives are open source?", { "font-size": 28, "font-weight": 700 });
      const TOOLS = [["OpenCode", "MIT"], ["Claude Code", "All rights reserved"], ["Codex CLI", "Apache 2.0"], ["Gemini CLI", "Apache 2.0"], ["Kilo Code", "MIT"], ["Crush", "FSL 1.1, MIT future licence"], ["Pi", "MIT"], ["Goose", "Apache 2.0"]];
      const COL = { MIT: MINT, "Apache 2.0": SKY, "All rights reserved": LIL, "FSL 1.1, MIT future licence": YEL };
      const WX = 74, WY = 104, WW = 380, WH = 372, PX = 474, PW = 252, RH = WH / 8, TY = 494, TH = 54;
      const TCX = WX + WW / 2, TCY = TY + TH / 2;
      el("rect", { x: 50, y: 82, width: 700, height: 486, rx: 24, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: WX, y: WY, width: WW, height: WH, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: PX, y: WY, width: PW, height: WH, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: WX, y: TY, width: WW, height: TH, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${WX + 14} ${TY + 12} H${WX + WW - 14}`, stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: PX, y: TY, width: PW, height: TH, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const read = txt(svg, PX + PW / 2, TY + 35, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 700, "font-family": MONO });
      const clip = el("clipPath", { id: "mg-oca-vclip" }, el("defs", {}, svg));
      el("rect", { x: WX + 2, y: WY + 2, width: WW - 4, height: WH - 4, rx: 12 }, clip);
      el("rect", { x: WX + 2, y: TY + 2, width: WW - 4, height: TH - 4, rx: 10 }, clip);
      const box = (p, s, fill) => {
        const g = el("g", {}, p);
        const r = el("rect", { y: -16, height: 32, rx: 6, fill, stroke: INK, "stroke-width": 3 }, g);
        const tx = txt(g, 0, 7, s, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        const w = tx.getComputedTextLength() + 28; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
        return { g, w };
      };
      let user = null;
      const rows = TOOLS.map(([name, lic], i) => {
        const top = WY + RH * i, cy = top + 24, col = COL[lic];
        let d = `M${WX + 12} ${top + RH - 3}`;
        for (let x = WX + 12; x < WX + WW - 18; x += 12) d += " q3 -7 6 0 t6 0";
        el("path", { d, stroke: LIL, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
        const back = box(svg, lic, col), fr = box(svg, lic, col), bx = WX + 16 + fr.w / 2;
        tf(back.g, bx + 10, cy - 5); tf(fr.g, bx, cy);
        const by = WY + RH * i + RH / 2, g = el("g", {}, svg);
        el("rect", { x: PX + 6, y: by - 22, width: PW - 12, height: 44, rx: 22, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const btn = el("rect", { x: PX + 12, y: by - 18, width: PW - 24, height: 36, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const lamp = el("circle", { cx: PX + 32, cy: by, r: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, PX + 50, by + 7, name, { "font-size": 19, "font-weight": 700 });
        button(g, `${name}: ${lic}`, () => { user = { i, t0: api.now() }; api.poke(); });
        return { btn, lamp, x: bx, y: cy, t0: 1.0 + i * 1.15 };
      });
      const fly = el("g", { "clip-path": "url(#mg-oca-vclip)", "pointer-events": "none" }, svg);
      const drops = TOOLS.map(([, lic]) => box(fly, lic, COL[lic]).g);
      el("rect", { x: WX, y: WY, width: WW, height: WH, rx: 14, fill: SKY, "fill-opacity": 0.14, "pointer-events": "none" }, svg);
      el("path", { d: `M${WX + 362} ${WY + 16} L${WX + 326} ${WY + 92} M${WX + 364} ${WY + 52} L${WX + 344} ${WY + 94}`, stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round", opacity: 0.9, "pointer-events": "none" }, svg);
      const place = (g, r, k) => {
        if (k < 0) { g.setAttribute("opacity", 0); return; }
        g.setAttribute("opacity", 1);
        if (k < 0.25) { tf(g, r.x, r.y, 1 + 0.08 * oc(k / 0.25)); return; }
        const f = cl((k - 0.25) / 0.5), y = lerp(r.y, TCY, f * f), x = lerp(r.x, TCX, f), bo = k > 0.75 ? -7 * Math.sin(Math.PI * seg(k, 0.75, 0.98)) : 0;
        tf(g, x, y + bo, 1.08 - 0.08 * f);
      };
      return (t, now) => {
        const out = seg(t, 11.4, 11.9);
        let cur = -1;
        rows.forEach((r, i) => { if (t >= r.t0) cur = i; });
        const pick = user ? user.i : cur;
        rows.forEach((r, i) => {
          const lit = user ? i === user.i : i === cur && !out, done = t >= r.t0 && !out;
          r.btn.setAttribute("fill", lit ? YEL : "#fff");
          r.lamp.setAttribute("fill", lit ? YEL : done ? MINT : SOFT);
        });
        drops.forEach((g, i) => {
          if (user) { place(g, rows[i], i === user.i ? now - user.t0 : -1); return; }
          const r = rows[i], nx = rows[i + 1], k = t - r.t0, gone = nx && t >= nx.t0 + 0.75;
          place(g, r, gone ? -1 : k);
          if (k >= 0 && !gone) g.setAttribute("opacity", 1 - out);
        });
        read.textContent = pick >= 0 && !(out && !user) ? TOOLS[pick][0] : "15 Oct 2026";
      };
    },
  };

  /* ---- 3. a bookshelf fills one book at a time; each latest release slides out on a tag under its spine ---- */
  SC.shelf = {
    dur: 12, still: 10,
    build(svg, api) {
      txt(svg, 40, 60, "Latest release", { "font-size": 32, "font-weight": 700 });
      txt(svg, 760, 60, "15 Oct 2026", { "text-anchor": "end", "font-size": 24, "font-weight": 600, fill: MUTE });
      const B = [["OpenCode", "v1.19.0", "11 Oct", LIL, 68, 230], ["Claude Code", "v2.1.300", "14 Oct", SKY, 74, 214], ["Codex CLI", "rust-v0.162.1", "9 Oct", MINT, 66, 240], ["Gemini CLI", "v0.64.0", "13 Oct", BLUE, 72, 222],
        ["Kilo Code", "v7.8.12", "15 Oct", YEL, 70, 236], ["Crush", "v0.98.1", "9 Oct", LIL, 64, 206], ["Pi", "v1.2.0", "12 Oct", SKY, 60, 196], ["Goose", "v1.54.0", "8 Oct", MINT, 70, 226]];
      const SH = 356, BD = SH + 22;
      el("rect", { x: 58, y: 96, width: 684, height: SH - 96, fill: SOFT }, svg);
      const tagLayer = el("g", { "clip-path": "url(#mg-oca-tclip)" }, svg);
      const clip = el("clipPath", { id: "mg-oca-tclip" }, el("defs", {}, svg));
      el("rect", { x: 0, y: BD, width: 800, height: 600 - BD }, clip);
      el("rect", { x: 40, y: 80, width: 720, height: 20, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [40, 740].forEach((x) => el("rect", { x, y: 80, width: 20, height: BD - 80 + 4, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, svg));
      const books = el("g", {}, svg);
      el("rect", { x: 40, y: SH, width: 720, height: 22, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [[120, 367, 60], [420, 368, 80], [640, 366, 50], [250, 90, 70], [560, 89, 60]].forEach(([x, y, w]) => el("path", { d: `M${x} ${y} h${w}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round", opacity: 0.5 }, svg));
      let lift = -1, liftT = -99;
      const items = B.map(([name, ver, date, col, w, h], i) => {
        const cx = 102.5 + 85 * i, g = el("g", {}, books), inner = el("g", {}, g);
        el("rect", { x: -w / 2 - 8, y: -h - 8, width: w + 16, height: h + 16, rx: 12, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, inner);
        el("rect", { x: -w / 2, y: -h, width: w, height: h, rx: 6, fill: col, stroke: INK, "stroke-width": 3 }, inner);
        el("path", { d: `M${-w / 2 + 3} ${-h + 20} H${w / 2 - 3} M${-w / 2 + 3} -20 H${w / 2 - 3}`, stroke: INK, "stroke-width": 2.5 }, inner);
        txt(inner, 0, 0, name, { "text-anchor": "middle", "font-size": 21, "font-weight": 700, transform: `translate(8 ${-h / 2}) rotate(-90)` });
        button(g, `${name}: latest release ${ver}, ${date}`, () => { lift = i; liftT = api.now(); api.poke(); });
        const L = i % 2 ? 18 : 96, tg = el("g", {}, tagLayer), sw = el("g", {}, tg);
        el("path", { d: `M0 ${-L - 70} V${L}`, stroke: INK, "stroke-width": 2.5 }, sw);
        const r = el("rect", { y: L, height: 66, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, sw);
        el("circle", { cy: L + 12, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sw);
        const v = txt(sw, 0, L + 39, ver, { "text-anchor": "middle", "font-size": 18, "font-weight": 700, "font-family": MONO });
        txt(sw, 0, L + 59, date, { "text-anchor": "middle", "font-size": 18, "font-weight": 600 });
        const tw = Math.max(v.getComputedTextLength(), 60) + 26; r.setAttribute("x", -tw / 2); r.setAttribute("width", tw);
        return { g, inner, tg, sw, cx, L, t0: 0.6 + i * 0.95 };
      });
      return (t, now) => {
        const out = seg(t, 11.4, 11.9);
        items.forEach((b, i) => {
          const k = seg(t, b.t0, b.t0 + 0.55), e = ob(k);
          const lw = i === lift ? now - liftT : 99, up = lw >= 0 && lw < 1.4 ? 22 * Math.sin(Math.PI * cl(lw / 1.4)) : 0;
          tf(b.g, b.cx, SH - 14 * (1 - e) - up, 1.1 - 0.1 * e);
          b.g.setAttribute("opacity", seg(t, b.t0, b.t0 + 0.15) * (1 - out));
          const tt = t - b.t0 - 0.5, s = oc(seg(tt, 0, 0.5));
          const sw0 = tt < 0 ? 0 : 9 * Math.exp(-2.4 * tt) * Math.sin(7 * tt), sw1 = lw >= 0 && lw < 2 ? 12 * Math.exp(-2.2 * lw) * Math.sin(8 * lw) : 0;
          b.tg.setAttribute("transform", `translate(${b.cx} ${BD - (b.L + 70) * (1 - s)})`);
          b.sw.setAttribute("transform", `rotate(${sw0 + sw1})`);
          b.tg.setAttribute("opacity", (tt < 0 ? 0 : 1) * (1 - out));
        });
      };
    },
  };

  /* ---- title card, 16 by 9: a snow globe ---- */
  SC.hero = {
    w: 960, h: 540, dur: 8, still: 4,
    build(svg) {
      txt(svg, 64, 116, "7 coding agents to switch to", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 60, 208, "OpenCode", { "font-size": 82, "font-weight": 700 });
      txt(svg, 60, 296, "Alternatives", { "font-size": 82, "font-weight": 700 });
      el("path", { d: "M66 326 H552", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 60, y: 362, width: 316, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 399, "Checked 15 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M72 474 C190 430 300 500 420 462 S560 432 606 416", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 72, cy: 474, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const GX = 794, GY = 246, GR = 124;
      const clip = el("clipPath", { id: "mg-oca-gclip" }, el("defs", {}, svg));
      el("circle", { cx: GX, cy: GY, r: GR - 2 }, clip);
      el("circle", { cx: GX, cy: GY, r: GR, fill: SKY, "fill-opacity": 0.25 }, svg);
      const inside = el("g", { "clip-path": "url(#mg-oca-gclip)" }, svg);
      el("ellipse", { cx: GX, cy: GY + 112, rx: 140, ry: 52, fill: "#fff", stroke: INK, "stroke-width": 3 }, inside);
      const tree = (x, y, s) => { const g = el("g", { transform: `translate(${x} ${y}) scale(${s})` }, inside); el("rect", { x: -5, y: -6, width: 10, height: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M0 -74 L22 -40 H12 L30 -8 H-30 L-12 -40 H-22 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g); };
      tree(GX - 78, GY + 74, 0.9); tree(GX + 84, GY + 70, 0.75);
      const term = el("g", { transform: `translate(${GX} ${GY + 16})` }, inside);
      el("rect", { x: -54, y: -44, width: 108, height: 84, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, term);
      el("path", { d: "M-54 -24 V-34 a10 10 0 0 1 10 -10 H44 a10 10 0 0 1 10 10 V-24 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, term);
      [-40, -28, -16].forEach((x) => el("circle", { cx: x, cy: -34, r: 3.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, term));
      el("path", { d: "M-34 -6 L-18 6 L-34 18", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, term);
      const cur = el("path", { d: "M-6 20 H22", stroke: BLUE, "stroke-width": 5, "stroke-linecap": "round" }, term);
      const flakes = Array.from({ length: 26 }, (_, i) => {
        const h = (k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
        const x = GX - 106 + h(1) * 212, ph = h(2), sp = [1, 2][i % 2] / 8, r = 4 + (i % 3) * 1.5;
        const n = el("g", {}, inside);
        if (i % 2) el("path", { d: `M0 ${-r - 2} V${r + 2} M${-(r + 2) * 0.87} ${-(r + 2) / 2} L${(r + 2) * 0.87} ${(r + 2) / 2} M${-(r + 2) * 0.87} ${(r + 2) / 2} L${(r + 2) * 0.87} ${-(r + 2) / 2}`, stroke: BLUE, "stroke-width": 2, "stroke-linecap": "round" }, n);
        else el("circle", { r: r * 0.7, fill: "#fff", stroke: LIL, "stroke-width": 1.5 }, n);
        return { n, x, ph, sp, w: i * 1.7 };
      });
      el("circle", { cx: GX, cy: GY, r: GR, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${GX - 92} ${GY - 40} A100 100 0 0 1 ${GX - 40} ${GY - 92}`, stroke: "#fff", "stroke-width": 8, fill: "none", "stroke-linecap": "round" }, svg);
      el("path", { d: `M${GX - 104} ${GY - 4} A106 106 0 0 1 ${GX - 101} ${GY - 22}`, stroke: "#fff", "stroke-width": 8, fill: "none", "stroke-linecap": "round" }, svg);
      el("path", { d: `M${GX - 98} ${GY + 104} L${GX + 98} ${GY + 104} L${GX + 124} ${GY + 196} L${GX - 124} ${GY + 196} Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: `M${GX - 107} ${GY + 136} L${GX + 107} ${GY + 136} L${GX + 113} ${GY + 158} L${GX - 113} ${GY + 158} Z`, fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: GX - 136, y: GY + 196, width: 272, height: 16, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      [[620, 132, 15, SKY], [918, 112, 14, YEL], [640, 476, 12, MINT]].forEach(([x, y, r, col]) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, svg));
      return (t) => {
        flakes.forEach((f) => {
          const p = (f.ph + t * f.sp) % 1, y = GY - GR + 6 + p * (GR * 2 - 30), x = f.x + 7 * Math.sin(t * 0.785 * 2 + f.w);
          f.n.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t * 45 + f.w * 20) % 360})`);
        });
        cur.setAttribute("opacity", Math.floor(t * 2) % 2 ? 0.15 : 1);
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
