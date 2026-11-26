/* Bright coded scenes for "What is diagram-design?". Vanilla JS, no library.
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
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 700, "font-size": 18 }, a));
  const about = (n, cx, cy, s = 1, dx = 0, dy = 0, r = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${s}) translate(${-cx} ${-cy})`);
  const rr = (x, y, w, h, r) => `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
  const R = { "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" };
  const thick = (p, d, w, col) => { el("path", Object.assign({ d, stroke: INK, "stroke-width": w + 5.5 }, R), p); return el("path", Object.assign({ d, stroke: col, "stroke-width": w }, R), p); };
  const line = (p, d, a) => el("path", Object.assign({ d, pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }, R, a), p);
  const trace = (n, k) => { n.setAttribute("stroke-dashoffset", 1 - k); n.setAttribute("opacity", seg(k, 0, 0.04)); };
  const hint = (svg, x, y, s) => mono(svg, x, y, s, { "text-anchor": "end", "font-size": 15, "font-weight": 500, fill: MUTE });
  const ring = (p, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 8" }, p);
  const tap = (g, label, api, fn) => button(g, label, () => { fn(); if (api.calm) api.redraw(); else api.poke(); });

  const SC = {};

  /* ---- 1. a yellow stencil sheet; four diagram cards slide out from under it ---- */
  const CARDS = [
    ["Architecture", (g) => el("rect", { x: -42, y: -50, width: 84, height: 56, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g)],
    ["Flowchart", (g) => el("path", { d: "M0 -62 L46 -22 L0 18 L-46 -22 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g)],
    ["Sequence", (g) => [-44, 0, 44].forEach((c) => el("path", { d: `M${c - 17} -30 H${c + 1} V-40 L${c + 19} -22 L${c + 1} -4 V-14 H${c - 17} Z`, fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g))],
    ["Quadrant", (g) => { el("rect", { x: -36, y: -58, width: 72, height: 72, rx: 6, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g); el("path", { d: "M0 -58 V14 M-36 -22 H36", stroke: INK, "stroke-width": 2.5 }, g); }],
  ];
  SC.stencil = {
    dur: 9, still: 7.2,
    build(svg, api) {
      hint(svg, 770, 46, "Tap the stencil sheet");
      const S = { x: 170, y: 76, w: 460, h: 260 }, C0 = [400, 206];
      const shadow = el("rect", { x: S.x + 12, y: S.y + 12, width: S.w, height: S.h, rx: 22, fill: SOFT }, svg);
      const cards = CARDS.map(([label, draw], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -74, y: -78, width: 168, height: 176, rx: 16, fill: LIL }, g);
        el("rect", { x: -84, y: -88, width: 168, height: 176, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        const sh = el("g", {}, g); draw(sh);
        const lb = mono(g, 0, 62, label, { "text-anchor": "middle", "font-size": 18 });
        return { g, sh, lb, fx: 124 + i * 188, fy: 468 };
      });
      const sheet = el("g", {}, svg);
      ring(sheet, S.x - 12, S.y - 12, S.w + 24, S.h + 24, 30);
      el("rect", { x: S.x, y: S.y, width: S.w, height: S.h, rx: 22, fill: YEL, stroke: INK, "stroke-width": 3 }, sheet);
      const cuts = [
        [rr(226, 132, 48, 48, 6), 250],
        ["M325 128 L353 156 L325 184 L297 156 Z", 325],
        ["M375 156 A25 25 0 1 0 425 156 A25 25 0 1 0 375 156 Z", 400],
        ["M475 129 L503 181 L447 181 Z", 475],
        ["M526 146 H546 V134 L574 156 L546 178 V166 H526 Z", 550],
      ].map(([d, cx]) => ({ n: el("path", { d, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, sheet), cx }));
      const tag = el("g", {}, sheet);
      el("rect", { x: 265, y: 252, width: 270, height: 56, rx: 28, fill: LIL, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 400, 288, "52 diagram types", { "text-anchor": "middle", "font-size": 22 });
      let user = null;
      const last = [0, 0, 0, 0];
      tap(sheet, "Stencil sheet: slide the cards out or back", api, () => {
        const target = user ? 1 - user.target : (last.reduce((a, b) => a + b, 0) / 4 > 0.5 ? 0 : 1);
        user = { target, at: api.now(), from: last.slice() };
      });
      return (t, now) => {
        const e = now > 9 ? 99 : t, k0 = ob(seg(e, 0, 0.6)), a0 = seg(e, 0, 0.25);
        [sheet, shadow].forEach((n) => { about(n, C0[0], C0[1], 0.9 + 0.1 * k0); n.setAttribute("opacity", a0); });
        cuts.forEach(({ n, cx }, i) => { const s = 0.35 + i * 0.08; about(n, cx, 156, 0.4 + 0.6 * ob(seg(e, s, s + 0.4))); n.setAttribute("opacity", seg(e, s, s + 0.1)); });
        cards.forEach((c, i) => {
          let k, raw;
          if (user) {
            const p = api.calm ? 1 : seg(now - user.at - (user.target ? i * 0.1 : (3 - i) * 0.08), 0, 0.7);
            k = user.from[i] + (user.target - user.from[i]) * (user.target ? ob(p) : io(p)); raw = cl(k);
          } else {
            raw = seg(t, 1.2 + i * 0.85, 2.0 + i * 0.85);
            k = ob(raw) * (1 - io(seg(t, 8.2 + (3 - i) * 0.08, 8.7 + (3 - i) * 0.08)));
          }
          last[i] = cl(k);
          tf(c.g, C0[0] + (c.fx - C0[0]) * k, C0[1] + (c.fy - C0[1]) * k, 1, (i % 2 ? 5 : -5) * (1 - cl(k)));
          about(c.sh, 0, -22, 0.6 + 0.4 * ob(seg(raw, 0.5, 1)));
          const lo = Math.min(oc(seg(raw, 0.8, 1)), seg(cl(k), 0.7, 0.95));
          c.lb.setAttribute("opacity", lo); c.lb.setAttribute("transform", `translate(0 ${8 * (1 - lo)})`);
        });
        const tk = user ? 1 : ob(seg(t, 4.9, 5.5));
        about(tag, 400, 280, 0.7 + 0.3 * tk);
        tag.setAttribute("opacity", user ? 1 : seg(t, 4.9, 5.1) * (1 - seg(t, 8.3, 8.8)));
      };
    },
  };

  /* ---- 2. a yellow easel; the prompt on a sky note, the boxes draw themselves ---- */
  SC.easel = {
    dur: 9, still: 7.3,
    build(svg, api) {
      hint(svg, 770, 40, "Tap the easel");
      const ez = el("g", {}, svg);
      ring(ez, 36, 80, 728, 382, 26);
      const legs = el("g", {}, ez);
      thick(legs, "M400 74 V584", 13, YEL);
      thick(legs, "M382 74 L172 584", 13, YEL);
      thick(legs, "M418 74 L628 584", 13, YEL);
      el("rect", { x: 378, y: 56, width: 44, height: 26, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, legs);
      const cv = el("g", {}, ez);
      el("rect", { x: 62, y: 140, width: 700, height: 300, rx: 14, fill: LIL }, cv);
      el("rect", { x: 50, y: 128, width: 700, height: 300, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, cv);
      const ledge = el("g", {}, ez); thick(ledge, "M40 437 H760", 14, YEL);
      const dg = el("g", {}, ez);
      const BX = [["frontend", BLUE], ["backend", LIL], ["database", MINT], ["Redis cache", SKY]].map(([s, col], i) => {
        const x = 77 + i * 172, g = el("g", {}, dg);
        const f = el("rect", { x, y: 248, width: 130, height: 84, rx: 10, fill: col }, g);
        const o = line(g, rr(x, 248, 130, 84, 10), { stroke: INK, "stroke-width": 2.5 });
        const lb = mono(g, x + 65, 296, s, { "text-anchor": "middle", "font-size": 16 });
        return { g, f, o, lb, cx: x + 65 };
      });
      const AR = [0, 1, 2].map((i) => {
        const a = 214 + i * 172, b = a + 28, g = el("g", {}, dg);
        return { ln: line(g, `M${a} 290 H${b}`, { stroke: BLUE, "stroke-width": 3 }), hd: el("path", Object.assign({ d: `M${b - 8} 283 L${b} 290 L${b - 8} 297`, stroke: BLUE, "stroke-width": 3 }, R), g) };
      });
      const note = el("g", {}, ez);
      el("rect", { x: 150, y: 92, width: 500, height: 60, rx: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, note);
      mono(note, 400, 134, "Make me an architecture diagram of my app", { "text-anchor": "middle", "font-size": 18, "font-weight": 500 });
      const pin = el("circle", { cx: 400, cy: 103, r: 7, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, ez);
      const tag = el("g", {}, svg);
      el("rect", { x: 298, y: 482, width: 220, height: 52, rx: 26, fill: LIL }, tag);
      el("rect", { x: 290, y: 474, width: 220, height: 52, rx: 26, fill: YEL, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 400, 507, "one HTML file", { "text-anchor": "middle", "font-size": 20 });
      let wipe = 0;
      button(ez, "Easel: draw the diagram again", () => { if (api.calm) api.seek(1.6); else if (!wipe) { wipe = api.now(); api.poke(); } });
      return (t, now) => {
        const e = now > 9 ? 99 : t;
        legs.setAttribute("opacity", seg(e, 0, 0.3)); about(legs, 400, 584, 1, 0, 24 * (1 - oc(seg(e, 0, 0.5))));
        about(cv, 400, 278, 0.92 + 0.08 * ob(seg(e, 0.12, 0.62))); cv.setAttribute("opacity", seg(e, 0.12, 0.3));
        ledge.setAttribute("opacity", seg(e, 0.24, 0.4)); about(ledge, 400, 437, 1, 0, 12 * (1 - oc(seg(e, 0.24, 0.7))));
        const nk = ob(seg(e, 0.6, 1.2)); about(note, 400, 122, 1, 0, -50 * (1 - nk), -6 + 4.5 * nk); note.setAttribute("opacity", seg(e, 0.6, 0.8));
        about(pin, 400, 103, ob(seg(e, 1.1, 1.4)));
        let w = 1;
        if (wipe) { const q = (now - wipe) / 0.35; if (q >= 1) { wipe = 0; api.seek(1.6); return; } w = 1 - io(q); }
        const fade = (1 - seg(t, 8.35, 8.85)) * w;
        dg.setAttribute("opacity", fade);
        BX.forEach((b, i) => {
          const s = 1.7 + i * 0.85;
          trace(b.o, oc(seg(t, s, s + 0.5))); b.f.setAttribute("opacity", seg(t, s + 0.3, s + 0.6));
          about(b.g, b.cx, 290, 0.94 + 0.06 * ob(seg(t, s + 0.3, s + 0.7)));
          const lo = oc(seg(t, s + 0.5, s + 0.8)); b.lb.setAttribute("opacity", lo); b.lb.setAttribute("transform", `translate(0 ${6 * (1 - lo)})`);
        });
        AR.forEach((a, i) => { const s = 2.3 + i * 0.85; trace(a.ln, io(seg(t, s, s + 0.35))); a.hd.setAttribute("opacity", seg(t, s + 0.25, s + 0.35)); });
        const tk = ob(seg(t, 5.3, 5.9));
        about(tag, 400, 500, 0.6 + 0.4 * tk, 0, 14 * (1 - cl(tk))); tag.setAttribute("opacity", seg(t, 5.3, 5.45) * fade);
      };
    },
  };

  /* ---- 3. a yellow lightbox; a rough sketch shows through, a clean diagram traces on top ---- */
  const wob = (pts, s, closed) => {
    const all = closed ? pts.concat([pts[0]]) : pts; let d = "", i = 0;
    for (let j = 0; j < all.length - 1; j++) {
      const [x1, y1] = all[j], [x2, y2] = all[j + 1], L = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(L / 12)), nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
      for (let m = j ? 1 : 0; m <= n; m++, i++) { const u = m / n, o = 2.6 * Math.sin(i * 1.3 + s) + 1.6 * Math.sin(i * 0.47 + s * 2); d += `${d ? "L" : "M"}${(x1 + (x2 - x1) * u + nx * o).toFixed(1)} ${(y1 + (y2 - y1) * u + ny * o).toFixed(1)}`; }
    }
    return d;
  };
  const arrow = (p, d, head) => {
    const g = el("g", {}, p);
    const a = line(g, d, { stroke: INK, "stroke-width": 9.5 }), ha = el("path", Object.assign({ d: head, stroke: INK, "stroke-width": 9.5 }, R), g);
    const b = line(g, d, { stroke: SKY, "stroke-width": 4 }), hb = el("path", Object.assign({ d: head, stroke: SKY, "stroke-width": 4 }, R), g);
    return (k) => { trace(a, k); trace(b, k); const h = seg(k, 0.75, 1); ha.setAttribute("opacity", h); hb.setAttribute("opacity", h); };
  };
  SC.lightbox = {
    dur: 9, still: 7.2,
    build(svg, api) {
      hint(svg, 770, 586, "Tap the lightbox");
      const lb = el("g", {}, svg);
      ring(lb, 96, 38, 608, 388, 32);
      const rays = [[190, 34, 0, -1], [295, 34, 0, -1], [400, 34, 0, -1], [505, 34, 0, -1], [610, 34, 0, -1], [190, 430, 0, 1], [295, 430, 0, 1], [400, 430, 0, 1], [505, 430, 0, 1], [610, 430, 0, 1],
        [92, 142, -1, 0], [92, 232, -1, 0], [92, 322, -1, 0], [708, 142, 1, 0], [708, 232, 1, 0], [708, 322, 1, 0]].map(([x, y, dx, dy], i) => {
        const g = el("g", {}, lb), b = thick(g, "M0 0", 7, YEL); return { g, a: g.firstChild, b, x, y, dx, dy, i };
      });
      const boxG = el("g", {}, lb);
      el("rect", { x: 110, y: 52, width: 580, height: 360, rx: 24, fill: YEL, stroke: INK, "stroke-width": 3 }, boxG);
      const paper = el("g", {}, boxG);
      el("rect", { x: 140, y: 80, width: 520, height: 304, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, paper);
      const sketch = el("g", {}, paper);
      const SK = [
        wob([[236, 150], [364, 142], [368, 210], [240, 218]], 1, true),
        wob([[452, 124], [566, 132], [560, 206], [448, 198]], 2.2, true),
        wob([[256, 290], [372, 296], [366, 362], [250, 354]], 3.1, true),
        wob([[460, 286], [580, 280], [586, 344], [466, 350]], 4.3, true),
        wob([[340, 186], [540, 304]], 5, false),
        wob([[548, 190], [330, 312]], 6, false),
        wob([[190, 252], [610, 236]], 7, false),
      ].map((d) => line(sketch, d, { stroke: MUTE, "stroke-width": 2.5 }));
      const dots = el("g", {}, paper);
      for (let x = 156; x <= 644; x += 24) for (let y = 88; y <= 376; y += 24) el("circle", { cx: x, cy: y, r: 1.6, fill: MUTE }, dots);
      const clean = el("g", {}, paper);
      const CB = [[228, 136, BLUE], [444, 136, BLUE], [228, 280, BLUE], [444, 280, LIL]].map(([x, y, col]) => {
        const g = el("g", {}, clean);
        return { g, f: el("rect", { x, y, width: 120, height: 72, rx: 8, fill: col }, g), o: line(g, rr(x, y, 120, 72, 8), { stroke: INK, "stroke-width": 2.5 }), cx: x + 60, cy: y + 36 };
      });
      const AW = [
        arrow(clean, "M358 172 H432", "M426 163 L435 172 L426 181"),
        arrow(clean, "M288 218 V268", "M279 262 L288 271 L297 262"),
        arrow(clean, "M504 218 V268", "M495 262 L504 271 L513 262"),
        arrow(clean, "M358 316 H432", "M426 307 L435 316 L426 325"),
      ];
      const tag = el("g", {}, svg);
      el("rect", { x: 172, y: 490, width: 456, height: 52, rx: 26, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 400, 522, "One accent, 1px hairlines, no shadows", { "text-anchor": "middle", "font-size": 18 });
      let user = null, lastC = 0;
      tap(lb, "Lightbox: switch between the sketch and the clean diagram", api, () => {
        const target = user ? 1 - user.target : (lastC > 0.5 ? 0 : 1);
        user = { target, at: api.now(), from: lastC };
      });
      return (t, now) => {
        const e = now > 9 ? 99 : t;
        about(boxG, 400, 232, 0.9 + 0.1 * ob(seg(e, 0, 0.6))); boxG.setAttribute("opacity", seg(e, 0, 0.2));
        about(paper, 400, 232, 1, 0, -14 * (1 - oc(seg(e, 0.15, 0.6)))); paper.setAttribute("opacity", seg(e, 0.15, 0.35));
        rays.forEach((r) => {
          const on = oc(seg(e, 0.4 + (r.i % 5) * 0.06, 0.8 + (r.i % 5) * 0.06)), len = on * (11 + 7 * (0.5 + 0.5 * Math.sin((t / 9) * Math.PI * 4 + r.i * 0.8)));
          const d = `M${r.x} ${r.y} l${(r.dx * len).toFixed(1)} ${(r.dy * len).toFixed(1)}`; r.a.setAttribute("d", d); r.b.setAttribute("d", d); r.g.setAttribute("opacity", seg(on, 0, 0.1));
        });
        const fade = user ? 1 : 1 - seg(t, 8.4, 8.9);
        let C;
        if (user) { const p = api.calm ? 1 : seg(now - user.at, 0, 0.9); C = user.from + (user.target - user.from) * io(p); }
        else C = seg(t, 2.5, 5.2);
        lastC = C;
        SK.forEach((n, j) => trace(n, user ? 1 : oc(seg(t, 0.7 + j * 0.12, 1.3 + j * 0.12))));
        sketch.setAttribute("opacity", (0.62 - 0.4 * seg(C, 0, 0.5)) * fade);
        dots.setAttribute("opacity", 0.32 * seg(C, 0, 0.12) * fade);
        clean.setAttribute("opacity", fade);
        CB.forEach((b, j) => {
          const s = j < 3 ? 0.06 + j * 0.11 : 0.45;
          trace(b.o, oc(seg(C, s, s + 0.18))); b.f.setAttribute("opacity", seg(C, s + 0.08, s + 0.2));
          about(b.g, b.cx, b.cy, j < 3 ? 1 : 0.86 + 0.14 * ob(seg(C, 0.5, 0.72)));
        });
        AW.forEach((f, j) => f(io(seg(C, 0.66 + j * 0.06, 0.82 + j * 0.06))));
        const tk = user ? 1 : ob(seg(t, 5.5, 6.1));
        about(tag, 400, 516, 0.6 + 0.4 * tk, 0, 14 * (1 - cl(tk))); tag.setAttribute("opacity", user ? 1 : seg(t, 5.5, 5.65) * fade);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 5,
    build(svg) {
      const chip = el("g", {}, svg);
      el("rect", { x: 64, y: 56, width: 152, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
      mono(chip, 140, 84, "Concepts", { "text-anchor": "middle", "font-size": 19 });
      const title = txt(svg, 64, 180, "What is Diagram Design?", { "font-size": 60, "font-weight": 700 });
      const ul = line(svg, "M66 208 H380", { stroke: YEL, "stroke-width": 12 });
      const sub = el("g", {}, svg);
      txt(sub, 64, 270, "An agent skill that draws diagrams", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(sub, 64, 306, "as one HTML + SVG file", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const chk = mono(svg, 64, 478, "Checked 26 Nov 2026", { "font-size": 17, "font-weight": 500, fill: MUTE });
      const st = el("g", {}, svg);
      el("rect", { x: 549, y: 291, width: 120, height: 78, rx: 10, fill: SOFT }, st);
      el("rect", { x: 541, y: 283, width: 120, height: 78, rx: 10, fill: YEL, stroke: INK, "stroke-width": 2.5 }, st);
      [rr(555, 310, 24, 24, 4), "M588 322 A13 13 0 1 0 614 322 A13 13 0 1 0 588 322 Z", "M624 335 L636 309 L648 335 Z"].forEach((d) => el("path", { d, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, st));
      const ez = el("g", {}, svg);
      thick(ez, "M827 262 V384", 7, SOFT); thick(ez, "M823 262 L789 384", 7, SOFT); thick(ez, "M831 262 L865 384", 7, SOFT);
      el("rect", { x: 777, y: 276, width: 100, height: 68, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, ez);
      thick(ez, "M769 349 H885", 7, SOFT);
      const cards = [["52 diagram types", LIL, 496], ["MIT licence", MINT, 722]].map(([s, col, x]) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 8, y: 404, width: 210, height: 64, rx: 14, fill: SOFT }, g);
        el("rect", { x, y: 396, width: 210, height: 64, rx: 14, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, x + 105, 434, s, { "text-anchor": "middle", "font-size": 18 });
        return g;
      });
      return (t) => {
        about(chip, 140, 77, 0.6 + 0.4 * ob(seg(t, 0.1, 0.5))); chip.setAttribute("opacity", seg(t, 0.1, 0.25));
        const a = oc(seg(t, 0.25, 0.8)); title.setAttribute("opacity", a); title.setAttribute("transform", `translate(0 ${18 * (1 - a)})`);
        trace(ul, io(seg(t, 0.6, 1.1)));
        const b = oc(seg(t, 0.8, 1.3)); sub.setAttribute("opacity", b); sub.setAttribute("transform", `translate(0 ${12 * (1 - b)})`);
        [st, ez].forEach((n, i) => { const s = 1.0 + i * 0.12; about(n, [601, 827][i], 384, 0.7 + 0.3 * ob(seg(t, s, s + 0.5))); n.setAttribute("opacity", seg(t, s, s + 0.15)); });
        cards.forEach((g, i) => { const s = 1.3 + i * 0.12; g.setAttribute("transform", `translate(0 ${24 * (1 - ob(seg(t, s, s + 0.5)))})`); g.setAttribute("opacity", seg(t, s, s + 0.15)); });
        const d = oc(seg(t, 1.9, 2.3)); chk.setAttribute("opacity", d); chk.setAttribute("transform", `translate(${-12 * (1 - d)} 0)`);
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
    let off = 0, raf = 0, seen = false, started = false, held = calm;
    let base = performance.now();
    const clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => {
      const now = clock(); let t = held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur;
      if (calm && !held && t >= sc.still) { held = true; t = sc.still; }
      draw(t, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { calm, now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, redraw: () => tick() };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && !started) { started = true; base = performance.now(); off = 0; }
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
