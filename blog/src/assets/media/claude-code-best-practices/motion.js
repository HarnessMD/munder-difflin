/* Bright coded scenes for "Claude Code Best Practices". Vanilla JS, no library.
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

  let UID = 0;
  /* shrink a line of text until it fits its box */
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", ((parseFloat(n.getAttribute("font-size")) * max) / w).toFixed(1)); };
  /* the soft caption strip along the bottom; returns a setter */
  const strip = (svg, y, x0 = 30, w = 740) => {
    el("rect", { x: x0, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    const n = txt(svg, x0 + w / 2, y + 31, "", { "text-anchor": "middle", "font-size": 21, "font-weight": 500 });
    return (s) => { if (n.textContent !== s) { n.textContent = s; n.setAttribute("font-size", 21); fit(n, w - 44); } };
  };
  /* a rounded label sized to its words, centred on 0,0 of its group */
  const pill = (g, s, fill, size = 22) => {
    const r = el("rect", { y: -21, height: 42, rx: 21, fill, stroke: INK, "stroke-width": 3 }, g), t = txt(g, 0, size * 0.36, s, { "text-anchor": "middle", "font-size": size, "font-weight": 700 });
    const w = t.getComputedTextLength() + 32; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return w;
  };

  const SC = {};

  /* ---- 1. a sieve: the check shakes, sand falls through, the three bad pebbles stay caught ---- */
  SC.sieve = {
    dur: 12, still: 9.8,
    build(svg, api) {
      const id = "mgsv" + ++UID, defs = el("defs", {}, svg);
      txt(svg, 44, 62, "Give Claude a way to verify its work", { "font-size": 32, "font-weight": 700 });
      const CX = 380, CY = 228, RX = 268, RY = 102, TY = 452;
      const UNDER = `M${CX - RX} ${CY} C${CX - RX + 14} ${CY + 190} ${CX + RX - 14} ${CY + 190} ${CX + RX} ${CY} Z`;
      const IN = `M${CX - RX} ${CY} A${RX} ${RY} 0 1 0 ${CX + RX} ${CY} A${RX} ${RY} 0 1 0 ${CX - RX} ${CY} Z`;
      el("path", { d: UNDER }, el("clipPath", { id: id + "u" }, defs));
      el("path", { d: IN }, el("clipPath", { id: id + "i" }, defs));
      /* the tray and the pile of sand that grows on it */
      el("rect", { x: 170, y: TY, width: 420, height: 30, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      const pile = el("path", { fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const heap = [0.16, 0.27, 0.36, 0.45, 0.55, 0.64, 0.73, 0.84].map((u, i) => ({ u, d: 6 + (i % 3) * 5, n: el("circle", { r: 3 + (i % 2), fill: "#fff", stroke: INK, "stroke-width": 1.5 }, svg) }));
      const fall = el("g", {}, svg);
      const grains = Array.from({ length: 44 }, (_, i) => ({ n: el("circle", { r: 3 + (i % 3), fill: YEL, stroke: INK, "stroke-width": 1.5 }, fall), x: 262 + ((i * 53) % 236), ph: (i * 0.379) % 1 }));
      /* the sieve itself */
      const sv = el("g", {}, svg);
      const hand = el("g", { transform: `translate(${CX + RX - 8} ${CY - 8}) rotate(-12)` }, sv);
      el("rect", { x: 0, y: -12, width: 130, height: 24, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, hand);
      el("circle", { cx: 112, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, hand);
      const und = el("g", {}, sv);
      el("path", { d: UNDER, fill: SOFT }, und);
      let hd = "";
      for (let x = CX - RX - 200; x <= CX + RX + 40; x += 18) hd += `M${x} ${CY} l200 200 M${x + 220} ${CY} l-200 200 `;
      el("path", { d: hd, stroke: LIL, "stroke-width": 2, fill: "none", "clip-path": `url(#${id}u)` }, und);
      el("path", { d: UNDER, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, und);
      const ins = el("g", {}, sv);
      el("path", { d: IN, fill: "#fff" }, ins);
      let md = "";
      for (let x = CX - RX + 22; x < CX + RX; x += 22) md += `M${x} ${CY - RY} V${CY + RY} `;
      for (let y = CY - RY + 14; y < CY + RY; y += 14) md += `M${CX - RX} ${y} H${CX + RX} `;
      el("path", { d: md, stroke: LIL, "stroke-width": 1.5, fill: "none", "clip-path": `url(#${id}i)` }, ins);
      const sand = Array.from({ length: 54 }, (_, i) => {
        const a = i * 2.39996, r = Math.sqrt((i + 0.5) / 54);
        return el("circle", { cx: (CX + Math.cos(a) * r * RX * 0.86).toFixed(1), cy: (CY + Math.sin(a) * r * RY * 0.78).toFixed(1), r: 4 + (i % 2), fill: YEL, stroke: INK, "stroke-width": 1.5 }, ins);
      });
      const pebs = [["failing test", 262, 200, -5], ["build error", 502, 198, 4], ["eslint", 382, 282, -2]].map(([s, x, y, r], i) => {
        const g = el("g", {}, sv);
        el("path", { d: "M-92 4 C-96 -26 -50 -36 0 -35 C52 -36 96 -24 92 2 C90 30 44 37 -4 36 C-52 36 -90 30 -92 4 Z", fill: MUTE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, 0, 8, s, { "text-anchor": "middle", "font-size": 23, "font-weight": 700, fill: "#fff" });
        return { g, x, y, r, i };
      });
      el("ellipse", { cx: CX, cy: CY, rx: RX, ry: RY, fill: "none", stroke: INK, "stroke-width": 18 }, sv);
      el("ellipse", { cx: CX, cy: CY, rx: RX, ry: RY, fill: "none", stroke: YEL, "stroke-width": 12 }, sv);
      const ring = el("ellipse", { cx: CX, cy: CY + 40, rx: RX + 24, ry: RY + 104, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, sv);
      ring.parentNode.insertBefore(ring, ring.parentNode.firstChild);
      let g0 = -99;
      button(sv, "Shake the check again: the failing test, the build error and eslint stay caught", () => { g0 = api.now(); api.poke(); });
      const cap = strip(svg, 518);
      return (t, now) => {
        const out = seg(t, 11.3, 11.8), dg = now - g0, gust = dg >= 0 && dg < 1.4 ? Math.sin((Math.PI * dg) / 1.4) : 0;
        const env = seg(t, 1.9, 2.3) * (1 - seg(t, 8.2, 8.7)), sh = Math.max(env, gust);
        const dx = 11 * env * Math.sin(t * 22) + 18 * gust * Math.sin(now * 24);
        sv.setAttribute("transform", `translate(${dx.toFixed(2)} 0) rotate(${(1.2 * env * Math.sin(t * 22 + 1) + 2 * gust * Math.sin(now * 24 + 1)).toFixed(2)} ${CX} ${CY})`);
        const dr = seg(t, 2.2, 8.4), fin = seg(t, 0.3, 0.7) * (1 - out);
        sand.forEach((s, i) => s.setAttribute("opacity", i / sand.length >= dr ? fin : 0));
        grains.forEach((g) => {
          const p = (t * 0.95 + g.ph) % 1, land = TY - 4 - 50 * io(seg(t, 2.3, 8.6)) * (1 - Math.abs(g.x - CX) / 210);
          g.n.setAttribute("cx", (g.x + dx * (1 - p) * 0.6).toFixed(1));
          g.n.setAttribute("cy", (CY + 130 + p * p * (land - CY - 130)).toFixed(1));
          g.n.setAttribute("opacity", env * (p < 0.9 ? 1 : (1 - p) * 10));
        });
        const h = 28 * io(seg(t, 2.3, 8.6));
        pile.setAttribute("d", `M196 ${TY} Q${CX} ${TY - 2 * h} 564 ${TY} Z`);
        pile.setAttribute("opacity", h > 0.5 ? 1 - out : 0);
        heap.forEach((g) => { const u = g.u, x = (1 - u) * (1 - u) * 196 + 2 * u * (1 - u) * CX + u * u * 564, y = TY - 4 * h * u * (1 - u) + g.d; g.n.setAttribute("cx", x.toFixed(1)); g.n.setAttribute("cy", y.toFixed(1)); g.n.setAttribute("opacity", h > 14 && y < TY - 5 ? 1 - out : 0); });
        pebs.forEach((p) => {
          const a = 0.5 + p.i * 0.25, k = ob(seg(t, a, a + 0.6)), b = 8.9 + p.i * 0.3;
          const pop = 1 + 0.14 * Math.sin(Math.PI * seg(t, b, b + 0.35));
          tf(p.g, p.x + sh * 3 * Math.sin(now * 19 + p.i * 2), p.y - 200 * (1 - k), pop, p.r + sh * 5 * Math.sin(now * 21 + p.i));
          p.g.setAttribute("opacity", seg(t, a, a + 0.12) * (1 - out));
        });
        cap(t < 2.2 || t >= 11.2 ? "Give Claude a check it can run" : t < 6 ? "tests, a build, or a screenshot to compare" : "show evidence, such as test output, rather than assert success");
      };
    },
  };

  /* ---- 2. a treasure map: the dotted route is drawn first, then a solid line walks it step by step ---- */
  SC.map = {
    dur: 12, still: 9.8,
    build(svg, api) {
      const id = "mgmp" + ++UID, defs = el("defs", {}, svg);
      txt(svg, 44, 62, "Explore first, then plan, then code", { "font-size": 28, "font-weight": 700 });
      const key = el("g", {}, svg);
      el("rect", { x: 598, y: 26, width: 172, height: 62, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", class: "mg-ring" }, key);
      const kc = el("g", {}, key);
      el("rect", { x: 606, y: 34, width: 156, height: 46, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, kc);
      txt(kc, 684, 64, "Shift+Tab", { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
      let pr = -99;
      button(key, "Shift+Tab: plan mode on, the route is drawn again", () => { pr = api.now(); api.seek(2.2); });
      const PX0 = 62, PX1 = 738, PY0 = 108, PY1 = 486, PW = PX1 - PX0, MID = 400;
      const clipR = el("rect", { y: PY0 - 4, height: PY1 - PY0 + 8 }, el("clipPath", { id: id + "c" }, defs));
      const paper = el("g", { "clip-path": `url(#${id}c)` }, svg);
      el("rect", { x: PX0, y: PY0, width: PW, height: PY1 - PY0, fill: SOFT, stroke: INK, "stroke-width": 3 }, paper);
      /* a little land to cross: waves, a lake, hills, trees */
      [[104, 150], [150, 176], [96, 204]].forEach(([x, y]) => el("path", { d: `M${x} ${y} q12 -10 24 0 t24 0 t24 0`, stroke: SKY, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, paper));
      el("ellipse", { cx: 440, cy: 178, rx: 64, ry: 30, fill: SKY, stroke: INK, "stroke-width": 3 }, paper);
      [[628, 468, 38, 54], [688, 468, 30, 40]].forEach(([x, y, w, hh]) => el("path", { d: `M${x - w} ${y} L${x} ${y - hh} L${x + w} ${y} Z`, fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, paper));
      [[250, 190], [282, 206], [520, 142]].forEach(([x, y]) => { el("path", { d: `M${x} ${y} V${y + 22}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, paper); el("circle", { cx: x, cy: y - 4, r: 15, fill: MINT, stroke: INK, "stroke-width": 3 }, paper); });
      const D = "M132 420 C190 330 240 290 300 300 C380 312 410 420 500 404 C580 390 600 262 652 194";
      const route = el("path", { d: D, fill: "none", stroke: "none" }, paper);
      const L = route.getTotalLength(), N = Math.floor(L / 17);
      const solid = el("path", { d: D, fill: "none", stroke: BLUE, "stroke-width": 11, "stroke-linecap": "round", "stroke-dasharray": `${L} ${L}` }, paper);
      const dots = Array.from({ length: N }, (_, i) => { const p = route.getPointAtLength(((i + 0.5) * L) / N); return el("circle", { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 3.6, fill: INK }, paper); });
            const ex = el("g", {}, paper);
      el("circle", { r: 15, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "4 6" }, ex);
      const start = el("g", {}, paper);
      el("circle", { r: 13, fill: MINT, stroke: INK, "stroke-width": 3 }, start);
      const X = el("g", {}, paper);
      el("path", { d: "M-17 -17 L17 17 M17 -17 L-17 17", stroke: INK, "stroke-width": 9, "stroke-linecap": "round" }, X);
      const LB = [["explore", 222, 452, 1.5, YEL], ["plan", 300, 256, 2.6, "#fff"], ["implement", 482, 454, 5.7, "#fff"], ["commit", 652, 140, 8.9, MINT]].map(([s, x, y, a, f]) => {
        const g = el("g", {}, paper); pill(g, s, f, 24); return { g, x, y, a };
      });
      const stops = [[300, 300, 2.6], [500, 404, 5.7]].map(([x, y, a]) => ({ g: el("circle", { cx: x, cy: y, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, paper), a }));
      const rolls = [0, 1].map(() => {
        const g = el("g", {}, svg);
        el("rect", { x: -16, y: PY0 - 14, width: 32, height: PY1 - PY0 + 28, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: `M0 ${PY0 + 2} V${PY1 - 2}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g);
        return g;
      });
      const cap = strip(svg, 520);
      return (t, now) => {
        const out = seg(t, 11.3, 11.8), w = PW * (io(seg(t, 0.15, 1.3)) - io(seg(t, 11.2, 11.85)));
        clipR.setAttribute("x", MID - w / 2); clipR.setAttribute("width", Math.max(0, w));
        rolls.forEach((g, i) => tf(g, MID + (i ? 1 : -1) * Math.max(w / 2, 16), 0));
        const S0 = route.getPointAtLength(0), E = route.getPointAtLength(L);
        tf(start, S0.x, S0.y, ob(seg(t, 1.3, 1.7)));
        const ep = ((t - 1.4) % 0.9) / 0.9, eo = t > 1.4 && t < 3.2 ? 1 - ep : 0;
        tf(ex, S0.x, S0.y, 1 + 2.4 * ep); ex.setAttribute("opacity", eo);
        const kd = io(seg(t, 2.2, 5));
        dots.forEach((d, i) => d.setAttribute("opacity", (i + 1) / N <= kd + 0.001 ? 1 : 0));
        tf(X, E.x, E.y, cl(ob(seg(t, 4.9, 5.3)), 0, 1.3) * (1 + 0.15 * Math.sin(Math.PI * seg(t, 8.8, 9.2))));
        const p = seg(t, 5.6, 8.8), st = 6, k2 = p >= 1 ? 1 : (Math.floor(p * st) + io(seg((p * st) % 1, 0, 0.7))) / st;
        solid.setAttribute("stroke-dashoffset", (L * (1 - k2)).toFixed(1)); solid.setAttribute("opacity", k2 > 0.002 ? 1 : 0);
        LB.forEach((b) => { const k = seg(t, b.a, b.a + 0.4); tf(b.g, b.x, b.y, 0.5 + 0.5 * cl(ob(k), 0, 1.2)); b.g.setAttribute("opacity", k > 0 ? 1 : 0); });
        stops.forEach((s) => s.g.setAttribute("opacity", seg(t, s.a, s.a + 0.2)));
        const pk = now - pr; kc.setAttribute("transform", `translate(0 ${pk >= 0 && pk < 0.22 ? 3 : 0})`);
        cap(t < 2.2 || t >= 11.2 ? "Separate research and planning from implementation" : t < 5.6 ? "Shift+Tab until the status bar shows plan mode on" : t < 9 ? "explore, plan, implement, commit" : "If you could describe the diff in one sentence, skip the plan");
      };
    },
  };

  /* ---- 3. a clipboard checklist: four short lines tick, the long fifth line is struck out ---- */
  SC.clipboard = {
    dur: 12, still: 10,
    build(svg) {
      txt(svg, 44, 62, "What should go in CLAUDE.md?", { "font-size": 32, "font-weight": 700 });
      el("rect", { x: 96, y: 98, width: 608, height: 470, rx: 26, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 124, y: 134, width: 552, height: 408, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 320, y: 82, width: 160, height: 46, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 400, cy: 100, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const RY = [188, 246, 304, 362, 420];
      const rows = ["Bash commands", "code style", "testing instructions", "repo etiquette", null].map((s, i) => {
        const y = RY[i], g = el("g", {}, svg);
        const box = el("rect", { x: 152, y: y - 19, width: 38, height: 38, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const tick = el("path", { d: `M${161} ${y + 1} L${168} ${y + 9} L${182} ${y - 9}`, stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "34 34", "stroke-dashoffset": 34 }, g);
        const body = el("g", {}, g);
        if (s) txt(body, 214, y + 10, s, { "font-size": 29, "font-weight": 700 });
        else [[214, 118], [346, 92], [452, 132], [598, 44]].forEach(([x, w]) => el("rect", { x, y: y - 9, width: w, height: 18, rx: 9, fill: LIL }, body));
        return { g, box, tick, body, y };
      });
      const halo = el("rect", { x: 140, y: RY[4] - 31, width: 524, height: 62, rx: 16, fill: "none", stroke: LIL, "stroke-width": 3, "stroke-dasharray": "5 7" }, svg);
      const strike = el("path", { d: `M144 ${RY[4]} H660`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-dasharray": "516 516" }, svg);
      const qs = el("rect", { x: 148, y: 462, width: 504, height: 56, rx: 16, fill: SOFT }, svg);
      const q = txt(svg, 400, 497, "Would removing this cause Claude to make mistakes?", { "text-anchor": "middle", "font-size": 22, "font-weight": 600 });
      fit(q, 470);
      const a = txt(svg, 400, 500, "under 200 lines per file", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      return (t) => {
        const out = seg(t, 11.3, 11.8);
        rows.forEach((r, i) => {
          const k = oc(seg(t, 0.8 + i * 0.45, 1.25 + i * 0.45));
          r.body.setAttribute("transform", `translate(${-24 * (1 - k)} 0)`);
          r.body.setAttribute("opacity", k);
          r.box.setAttribute("opacity", k);
          if (i < 4) {
            const tk = seg(t, 3.6 + i * 0.6, 3.95 + i * 0.6);
            r.tick.setAttribute("stroke-dashoffset", (34 * (1 - tk)).toFixed(1));
            r.box.setAttribute("fill", tk > 0.3 ? MINT : "#fff");
            r.g.setAttribute("opacity", 1 - out);
          } else r.tick.setAttribute("opacity", 0);
        });
        const qa = seg(t, 6.2, 6.5) * (1 - seg(t, 8.5, 8.7)), ans = seg(t, 8.7, 9) * (1 - out);
        q.setAttribute("opacity", qa); a.setAttribute("opacity", ans); qs.setAttribute("opacity", Math.max(qa, ans));
        halo.setAttribute("opacity", t > 6.2 && t < 7.4 ? 0.55 + 0.45 * Math.sin((t - 6.2) * 9) : 0);
        const sk = io(seg(t, 7.3, 7.8));
        strike.setAttribute("stroke-dashoffset", (516 * (1 - sk)).toFixed(1)); strike.setAttribute("opacity", sk > 0 ? 1 - out : 0);
        rows[4].g.setAttribute("opacity", (1 - 0.72 * seg(t, 7.8, 8.6)) * (1 - out));
      };
    },
  };

  /* ---- title card, 16 by 9: a small bonsai, kept short by pruning ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 130, "9 Habits From Anthropic's Docs", { "font-size": 27, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 218, "Claude Code", { "font-size": 70, "font-weight": 700 });
      txt(svg, 62, 298, "Best Practices", { "font-size": 70, "font-weight": 700 });
      el("path", { d: "M68 332 H500", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 374, width: 318, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 221, 411, "Checked 15 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      /* the bonsai */
      const limb = (d, w) => { el("path", { d, stroke: INK, "stroke-width": w + 6, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg); el("path", { d, stroke: MUTE, "stroke-width": w, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg); };
      limb("M780 412 C764 364 706 346 722 296 C734 258 800 266 810 222 C815 198 800 182 792 168", 24);
      limb("M724 300 C712 290 704 292 692 282", 11);
      limb("M806 236 C826 232 842 240 858 232", 10);
      const pad = (cx, cy, cs, f) => {
        [0, 1].forEach((pass) => {
          cs.forEach(([x, y, r]) => el("circle", { cx: cx + x, cy: cy + y, r: pass ? r : r + 3, fill: pass ? f : INK }, svg));
          el("rect", { x: cx - 58 - (pass ? 0 : 3), y: cy - (pass ? 0 : 3), width: 116 + (pass ? 0 : 6), height: 26 + (pass ? 0 : 6), rx: 13 + (pass ? 0 : 3), fill: pass ? f : INK }, svg);
        });
      };
      pad(690, 252, [[-34, 4, 24], [-4, -12, 31], [30, 0, 25]], MINT);
      pad(858, 206, [[-30, 6, 22], [0, -10, 28], [32, 4, 22]], MINT);
      pad(790, 140, [[-44, 8, 28], [-8, -14, 38], [34, 2, 30]], MINT);
      el("rect", { x: 666, y: 404, width: 228, height: 22, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M680 426 H880 L860 480 H700 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      [712, 832].forEach((x) => el("rect", { x, y: 480, width: 18, height: 12, rx: 3, fill: INK }, svg));
      el("ellipse", { cx: 780, cy: 404, rx: 96, ry: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M624 500 H906", stroke: LIL, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      [[620, 128, 15, SKY], [904, 336, 17, YEL], [600, 400, 12, LIL]].forEach(([x, y, r, col]) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, svg));
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
