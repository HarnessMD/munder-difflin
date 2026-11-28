/* Bright coded scenes for "Check an agent skill before you install it". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878", WHITE = "#fff";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const ci = (x) => x * x * x;
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const ent = (n, k, dx = 0, dy = 0) => { n.setAttribute("opacity", cl(k)); n.setAttribute("transform", `translate(${dx * (1 - k)} ${dy * (1 - k)})`); };
  const pop = (n, x, y, k) => { n.setAttribute("opacity", cl(k * 3)); n.setAttribute("transform", `translate(${x} ${y}) scale(${Math.max(0, k)})`); };
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * max) / w); return n; };
  const ring = (g, a) => el(a.d ? "path" : "rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 7", "stroke-linecap": "round", class: "mg-ring" }, a), g);
  const tickMark = (g, r) => {
    el("circle", { r, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: `M${-r * 0.42} ${r * 0.04} L${-r * 0.1} ${r * 0.36} L${r * 0.46} ${-r * 0.3}`, stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  const SC = {};

  /* ---- 1. an x ray screen looks inside the skill folder ---- */
  SC.xray = {
    dur: 7, still: 7,
    build(svg, api) {
      const stand = el("g", {}, svg);
      el("ellipse", { cx: 400, cy: 570, rx: 196, ry: 10, fill: SOFT }, stand);
      el("rect", { x: 372, y: 462, width: 56, height: 84, fill: BLUE, stroke: INK, "stroke-width": 3 }, stand);
      el("rect", { x: 288, y: 538, width: 224, height: 26, rx: 13, fill: BLUE, stroke: INK, "stroke-width": 3 }, stand);
      const scr = el("g", {}, svg);
      ring(scr, { x: 84, y: 22, width: 632, height: 466, rx: 38 });
      const house = el("g", {}, scr);
      el("rect", { x: 96, y: 34, width: 608, height: 442, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, house);
      el("rect", { x: 120, y: 58, width: 560, height: 394, rx: 16, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, house);
      el("circle", { cx: 660, cy: 464, r: 5, fill: MINT, stroke: INK, "stroke-width": 2 }, house);
      const folder = el("g", {}, scr);
      el("rect", { x: 144, y: 76, width: 220, height: 60, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, folder);
      el("rect", { x: 144, y: 110, width: 512, height: 322, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, folder);
      txt(folder, 254, 101, "skill folder", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const card = (x, y, w, h, label, lines) => {
        const c = el("g", {}, scr), f = 22;
        el("path", { d: `M${x + 10} ${y} H${x + w - f} L${x + w} ${y + f} V${y + h - 10} Q${x + w} ${y + h} ${x + w - 10} ${y + h} H${x + 10} Q${x} ${y + h} ${x} ${y + h - 10} V${y + 10} Q${x} ${y} ${x + 10} ${y} Z`, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, c);
        el("path", { d: `M${x + w - f} ${y} V${y + f - 5} Q${x + w - f} ${y + f} ${x + w - f + 5} ${y + f} H${x + w} Z`, fill: WHITE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, c);
        txt(c, x + 20, y + 36, label, { "font-family": MONO, "font-size": 18, "font-weight": 700 });
        lines.forEach(([ly, lw]) => el("rect", { x: x + 20, y: ly, width: lw, height: 7, rx: 3.5, fill: MUTE }, c));
        return c;
      };
      const ins = card(170, 136, 244, 274, "instructions", [[198, 196], [232, 164], [266, 184], [334, 200], [368, 120]]);
      const cards = [ins, card(436, 136, 162, 120, "scripts", [[190, 118], [212, 92], [234, 106]]), card(436, 290, 162, 120, "references", [[344, 110], [366, 124], [388, 86]])];
      const pill = el("rect", { fill: MUTE, "stroke-width": 2.5 }, ins);
      const ptx = txt(ins, 270, 310, "network call", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      const bar = el("rect", { height: 14, rx: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, scr);
      const ticks = [196, 350].map((cy) => ({ g: tickMark(el("g", {}, scr), 17), cy }));
      const Y0 = 136, Y1 = 421, LY = 303.5, barAt = (u) => lerp(Y0, Y1, io(seg(u, 0, 2.2)));
      let cu = 1.2;
      for (let u = 0; u <= 2.2; u += 0.01) if (barAt(u) >= LY) { cu = u; break; }
      let tap = -1e9;
      button(scr, "Scan the skill folder again", () => { tap = api.now(); api.poke(); });
      return (t, now) => {
        ent(stand, oc(seg(t, 0, 0.5)), 0, 20);
        ent(house, oc(seg(t, 0.08, 0.58)), 0, 24);
        ent(folder, ob(seg(t, 0.3, 0.8)), 0, 28);
        cards.forEach((c, i) => ent(c, ob(seg(t, 0.95 + i * 0.12, 1.5 + i * 0.12)), 0, 44));
        const rt = now - tap, live = rt >= 0 && rt < 3.4;
        let y, pk, tk, bo = 1;
        if (live && rt < 0.45) { y = lerp(Y1, Y0, io(rt / 0.45)); pk = 1 - io(seg(rt, 0, 0.3)); tk = 1 - seg(rt, 0, 0.18); }
        else if (live) { const u = rt - 0.45; y = barAt(u); pk = u < cu ? 0 : ob(seg(u, cu, cu + 0.45)); tk = oc(seg(u, cu + 0.3, cu + 0.75)); }
        else { const u = t - 2.3; y = barAt(u); pk = u < cu ? 0 : ob(seg(u, cu, cu + 0.45)); tk = oc(seg(t, 4.8, 5.25)); bo = oc(seg(t, 2.0, 2.3)); }
        const bw = 264 * (0.5 + 0.5 * bo);
        bar.setAttribute("x", 292 - bw / 2); bar.setAttribute("width", bw); bar.setAttribute("y", y - 7); bar.setAttribute("opacity", bo);
        const lit = pk > 0.02, h = lerp(7, 36, pk), w = lerp(150, 168, pk);
        pill.setAttribute("x", lerp(190, 186, pk)); pill.setAttribute("width", w); pill.setAttribute("y", LY - h / 2); pill.setAttribute("height", h); pill.setAttribute("rx", h / 2);
        pill.setAttribute("fill", lit ? LIL : MUTE); pill.setAttribute("stroke", lit ? INK : "none");
        ptx.setAttribute("opacity", tk); ptx.setAttribute("transform", `translate(0 ${8 * (1 - tk)})`);
        ticks.forEach((k, i) => pop(k.g, 626, k.cy, ob(seg(t, 4.5 + i * 0.12, 4.95 + i * 0.12))));
        return live;
      };
    },
  };

  /* ---- 2. a customs desk stamps the parcel before the gate ---- */
  SC.customs = {
    dur: 8, still: 8,
    build(svg, api) {
      const floor = el("rect", { x: 20, y: 556, width: 760, height: 12, rx: 6, fill: SOFT }, svg);
      const gate = el("g", {}, svg);
      [626, 734].forEach((x) => el("rect", { x, y: 140, width: 28, height: 420, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, gate));
      el("rect", { x: 606, y: 92, width: 176, height: 60, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, gate);
      el("rect", { x: 618, y: 104, width: 152, height: 36, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, gate);
      fit(txt(gate, 694, 128.5, "convex.site", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 }), 138);
      const desk = el("g", {}, svg), PX = 112, PY = 358;
      el("rect", { x: 36, y: 334, width: 558, height: 226, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, desk);
      [372, 458].forEach((y) => { el("rect", { x: 352, y, width: 206, height: 64, rx: 10, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, desk); el("rect", { x: 431, y: y + 26, width: 48, height: 12, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2 }, desk); });
      const tag = el("g", {}, desk);
      el("circle", { cx: PX, cy: PY, r: 5, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, tag);
      el("path", { d: `M${PX} ${PY + 5} V416`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("path", { d: "M84 422 L104 396 H300 V448 H104 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 112, cy: 422, r: 6, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, tag);
      fit(txt(tag, 128, 428, "issue 64, open", { "font-family": MONO, "font-size": 17, "font-weight": 700 }), 160);
      const counter = el("rect", { x: 26, y: 310, width: 578, height: 30, rx: 10, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      const belt = el("g", {}, svg);
      el("rect", { x: 48, y: 268, width: 548, height: 42, rx: 21, fill: MINT, stroke: INK, "stroke-width": 3 }, belt);
      const rollers = Array.from({ length: 13 }, (_, i) => {
        const g = el("g", {}, belt);
        el("circle", { r: 9, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-6 0 H6", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        return { g, x: 74 + i * (500 / 12) };
      });
      const parcel = el("g", {}, svg), box = el("g", {}, parcel);
      ring(box, { x: -9, y: 139, width: 190, height: 138, rx: 16 });
      el("rect", { x: 0, y: 148, width: 172, height: 120, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, box);
      el("path", { d: "M2 166 H170", stroke: INK, "stroke-width": 2.5 }, box);
      el("rect", { x: 76, y: 148, width: 20, height: 18, fill: SOFT, stroke: INK, "stroke-width": 2 }, box);
      const mark = el("g", { transform: "rotate(-4 86 193)" }, box);
      el("rect", { x: 22, y: 176, width: 128, height: 34, rx: 8, fill: LIL, stroke: INK, "stroke-width": 2.5 }, mark);
      fit(txt(mark, 86, 199, "telemetry", { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 }), 112);
      el("rect", { x: 11, y: 222, width: 150, height: 34, rx: 6, fill: WHITE, stroke: INK, "stroke-width": 2 }, box);
      fit(txt(box, 86, 245, "your app idea", { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 }), 138);
      const stampW = el("g", {}, svg), stamp = el("g", {}, stampW), SX = 504;
      el("ellipse", { cx: 0, cy: -80, rx: 30, ry: 17, fill: LIL, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -14, y: -66, width: 28, height: 34, fill: LIL, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -70, y: -34, width: 140, height: 34, rx: 6, fill: LIL, stroke: INK, "stroke-width": 3 }, stamp);
      const PX0 = 60, PX1 = 418, SY0 = 124, SY1 = 210, RET = 1.1, LEN = RET + (8 - 1.6);
      const px = (t) => lerp(PX0, PX1, io(seg(t, 1.6, 4.6)));
      const sy = (t) => (t < 5.18 ? lerp(SY0, SY1, ci(seg(t, 4.9, 5.18))) : t < 5.4 ? SY1 : lerp(SY1, SY0, ob(seg(t, 5.4, 6.0))));
      let tap = -1e9, cur = { x: PX1, s: SY0, m: 1 }, from = cur, seenEnd = false;
      button(parcel, "Send the parcel again", () => { from = cur; tap = api.now(); api.poke(); });
      return (t, now) => {
        if (t >= 7.2) seenEnd = true;
        ent(floor, oc(seg(t, 0, 0.4)));
        ent(desk, oc(seg(t, 0.06, 0.56)), 0, 26);
        ent(counter, oc(seg(t, 0.16, 0.66)), 0, 26);
        ent(belt, oc(seg(t, 0.26, 0.76)), 0, 26);
        ent(gate, ob(seg(t, 0.36, 0.9)), 0, 34);
        ent(stampW, ob(seg(t, 0.48, 1.0)), 0, -30);
        const rt = now - tap, live = rt >= 0 && rt < LEN;
        let x, s, m, te = -1;
        if (live && rt < RET) { x = lerp(from.x, PX0, io(rt / RET)); s = lerp(from.s, SY0, oc(seg(rt, 0, 0.5))); m = from.m * (1 - seg(rt, 0, 0.25)); }
        else { te = live ? Math.min(8, 1.6 + rt - RET) : t; x = px(te); s = sy(te); m = te >= 5.18 ? 1 : 0; }
        cur = { x, s, m };
        const dk = ob(seg(t, 0.95, 1.4));
        parcel.setAttribute("transform", `translate(${x} ${-56 * (1 - dk)})`); parcel.setAttribute("opacity", cl(dk * 2.5));
        const q = Math.sin(Math.PI * seg(te, 5.18, 5.45));
        box.setAttribute("transform", `translate(86 268) scale(${1 + 0.03 * q} ${1 - 0.06 * q}) translate(-86 -268)`);
        mark.setAttribute("opacity", m);
        tf(stamp, SX, s);
        rollers.forEach((r) => r.g.setAttribute("transform", `translate(${r.x} 289) rotate(${((x - PX0) / 9) * 57.3})`));
        const gk = seenEnd ? 1 : seg(t, 6.2, 7.2), ang = 18 * Math.pow(1 - gk, 2) * Math.cos(gk * Math.PI * 3);
        tag.setAttribute("opacity", seenEnd ? 1 : oc(seg(t, 6.2, 6.45)));
        tag.setAttribute("transform", `rotate(${ang} ${PX} ${PY})`);
        return live;
      };
    },
  };

  /* ---- 3. a beehive of checks lights up one cell at a time ---- */
  SC.beehive = {
    dur: 8, still: 8,
    build(svg, api) {
      const R = 74, RS = 80, HX = Math.sqrt(3) * RS, CX = 400, CY = 246;
      const hex = (r) => Array.from({ length: 6 }, (_, i) => { const a = (i * Math.PI) / 3; return `${i ? "L" : "M"}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`; }).join(" ") + " Z";
      const stand = el("g", {}, svg);
      [226, 550].forEach((x) => el("rect", { x, y: 470, width: 24, height: 28, rx: 5, fill: SKY, stroke: INK, "stroke-width": 3 }, stand));
      el("rect", { x: 192, y: 450, width: 416, height: 24, rx: 10, fill: SKY, stroke: INK, "stroke-width": 3 }, stand);
      const POS = [[-1.5, -1], [1.5, -1], [0, -0.5], [-1.5, 0], [1.5, 0], [0, 0.5], [-1.5, 1], [1.5, 1]];
      const CH = [["Read every", "file"], ["Network", "calls"], ["Piped to", "a shell"], ["Split", "download"], ["Unpinned", "code"], ["Telemetry"], ["Safety", "checks"], ["Pin a", "commit"]];
      const taps = CH.map(() => -1e9);
      const cells = POS.map(([a, b], i) => {
        const g = el("g", {}, svg), inner = el("g", {}, g), L = CH[i];
        ring(inner, { d: hex(R + 8), "stroke-linejoin": "round" });
        const body = el("path", { d: hex(R), fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, inner);
        const words = el("g", {}, inner);
        L.forEach((s, j) => txt(words, 0, L.length === 1 ? 6 : -6 + j * 24, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 }));
        let flag = null;
        if (i === 2) {
          flag = el("g", {}, inner);
          el("path", { d: "M-10 -26 V-54", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, flag);
          el("path", { d: "M-10 -54 L14 -47 L-10 -40 Z", fill: WHITE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, flag);
        }
        tf(g, CX + a * RS, CY + b * HX);
        button(g, L.join(" "), () => { taps[i] = api.now(); api.poke(); });
        return { inner, body, words, flag };
      });
      const rib = el("g", {}, svg);
      const band = el("path", { d: "M-130 -25 H130 L114 0 L130 25 H-130 L-114 0 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, rib);
      const r8 = txt(rib, 0, 9, "8 checks", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      tf(rib, 376, 538);
      const done = tickMark(el("g", {}, svg), 20);
      const LT = (i) => 1.2 + i * 0.6;
      return (t, now) => {
        ent(stand, oc(seg(t, 0, 0.45)), 0, 20);
        let busy = false;
        cells.forEach((c, i) => {
          const e = ob(seg(t, 0.15 + i * 0.07, 0.6 + i * 0.07)), o = seg(t, 0.15 + i * 0.07, 0.35 + i * 0.07);
          const ru = now - taps[i], live = ru >= 0 && ru < 1.5;
          let u = t - LT(i), base = 1, dim = 0;
          if (live) { busy = true; if (ru < 0.24) { u = 99; dim = io(ru / 0.24); } else { u = ru - 0.3; base = u < 0 ? 0.94 : lerp(0.94, 1, oc(seg(u, 0, 0.3))); } }
          const lit = u >= 0, lil = i === 2 && u >= 0.62;
          const bump = 0.07 * Math.sin(Math.PI * seg(u, 0, 0.36)) + (i === 2 ? 0.09 * Math.sin(Math.PI * seg(u, 0.62, 1.0)) : 0);
          c.body.setAttribute("fill", lil ? LIL : lit ? YEL : SOFT);
          const wk = ob(seg(u, 0.1, 0.42));
          c.words.setAttribute("opacity", wk > 0.001 && dim < 0.5 ? 1 : 0); c.words.setAttribute("transform", `translate(0 ${6 * (1 - wk)}) scale(${(0.75 + 0.25 * wk) * (1 - 0.3 * dim)})`);
          if (c.flag) { const fk = ob(seg(u, 0.7, 1.1)); c.flag.setAttribute("opacity", fk > 0.001 && dim < 0.5 ? 1 : 0); c.flag.setAttribute("transform", `translate(-10 -26) scale(${Math.max(0, fk)}) translate(10 26)`); }
          c.inner.setAttribute("transform", `scale(${(0.7 + 0.3 * e) * (base - 0.06 * dim + bump)})`);
          c.inner.setAttribute("opacity", o);
        });
        const rk = oc(seg(t, 6.0, 6.55));
        band.setAttribute("transform", `scale(${Math.max(0.001, rk)} 1)`); band.setAttribute("opacity", rk > 0 ? 1 : 0);
        const lk = oc(seg(t, 6.6, 7.0));
        r8.setAttribute("opacity", lk); r8.setAttribute("transform", `translate(0 ${10 * (1 - lk)})`);
        pop(done, 542, 538, ob(seg(t, 6.4, 6.8)));
        return busy;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      const X = 64, MAXW = 520;
      const chip = el("g", {}, svg), cr = el("rect", { x: 0, y: 0, height: 40, rx: 20, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
      const ct = txt(chip, 20, 27, "Guides", { "font-family": MONO, "font-size": 18, "font-weight": 700 });
      cr.setAttribute("width", ct.getComputedTextLength() + 40);
      const t1 = txt(svg, X, 0, "Check an agent skill", { "font-size": 50, "font-weight": 700 }), t2 = txt(svg, X, 0, "before you install it", { "font-size": 50, "font-weight": 700 });
      const fs = Math.min(50, (50 * MAXW) / Math.max(t1.getComputedTextLength(), t2.getComputedTextLength()));
      [t1, t2].forEach((n) => n.setAttribute("font-size", fs));
      const y0 = (540 - (178 + 1.9 * fs)) / 2, b1 = y0 + 62 + 0.74 * fs, b2 = b1 + 1.16 * fs, uy = b2 + 26, b3 = uy + 50, b4 = b3 + 38;
      t1.setAttribute("y", b1); t2.setAttribute("y", b2);
      const ul = el("path", { stroke: YEL, "stroke-width": 10, "stroke-linecap": "round", fill: "none" }, svg);
      const uw = 0.5 * t1.getComputedTextLength();
      const line = fit(txt(svg, X, b3, "Treat like installing software.", { "font-size": 25, "font-weight": 500, fill: MUTE }), MAXW);
      const date = txt(svg, X, b4, "Checked 28 Nov 2026", { "font-family": MONO, "font-size": 17, "font-weight": 500, fill: CAP });
      const card = (y, fill, lines) => {
        const g = el("g", {}, svg);
        el("rect", { x: 624, y, width: 272, height: 90, rx: 16, fill, stroke: INK, "stroke-width": 2.5 }, g);
        lines.forEach((s, i) => fit(txt(g, 760, y + 38 + i * 28, s, { "text-anchor": "middle", "font-size": 21, "font-weight": 600 }), 240));
        return g;
      };
      const xr = el("g", {}, svg);
      el("rect", { x: 744, y: 150, width: 32, height: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, xr);
      el("rect", { x: 726, y: 158, width: 68, height: 8, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2.5 }, xr);
      el("rect", { x: 704, y: 84, width: 112, height: 68, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, xr);
      el("rect", { x: 714, y: 94, width: 92, height: 48, rx: 6, fill: WHITE, stroke: INK, "stroke-width": 2 }, xr);
      el("rect", { x: 726, y: 102, width: 22, height: 10, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2 }, xr);
      el("rect", { x: 726, y: 107, width: 68, height: 28, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2 }, xr);
      el("rect", { x: 720, y: 117, width: 80, height: 6, rx: 3, fill: YEL, stroke: INK, "stroke-width": 1.8 }, xr);
      const c1 = card(174, YEL, ["Same network access", "as any other program"]);
      const dk = el("g", {}, svg);
      el("rect", { x: 712, y: 322, width: 96, height: 40, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, dk);
      el("rect", { x: 700, y: 310, width: 120, height: 14, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, dk);
      el("rect", { x: 740, y: 284, width: 40, height: 26, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, dk);
      el("path", { d: "M741 292 H779", stroke: INK, "stroke-width": 2 }, dk);
      const c2 = card(372, MINT, ["Issue 64, open on", "28 Nov 2026"]);
      return (t) => {
        const ck = ob(seg(t, 0.1, 0.5));
        chip.setAttribute("opacity", cl(ck * 2)); chip.setAttribute("transform", `translate(${X} ${y0 + 12 * (1 - ck)})`);
        ent(t1, oc(seg(t, 0.25, 0.75)), 0, 18);
        ent(t2, oc(seg(t, 0.37, 0.87)), 0, 18);
        ul.setAttribute("d", `M${X + 2} ${uy} H${X + 2 + Math.max(0.5, uw * io(seg(t, 0.7, 1.2)))}`); ul.setAttribute("opacity", t > 0.7 ? 1 : 0);
        ent(line, oc(seg(t, 0.85, 1.3)), 0, 12);
        [xr, c1, dk, c2].forEach((n, i) => ent(n, ob(seg(t, 1.0 + i * 0.12, 1.5 + i * 0.12)), 0, 26));
        ent(date, oc(seg(t, 1.8, 2.2)), 0, 10);
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
    const at = (now) => cl(now + off, 0, sc.dur);
    const frame = () => { const now = clock(); return draw(held ? sc.still : at(now), now); };
    const tick = () => { cancelAnimationFrame(raf); const busy = frame(); if (seen && (busy || (!held && clock() + off < sc.dur))) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => tick() };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && !fig.dataset.ran) { fig.dataset.ran = 1; off = -clock(); }
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 21px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 17px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
