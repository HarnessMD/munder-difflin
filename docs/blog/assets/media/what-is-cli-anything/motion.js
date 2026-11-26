/* Bright coded scenes for "What is CLI-Anything?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 22, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bump = (t, a, b) => Math.sin(seg(t, a, b) * Math.PI);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, cx, cy, s = 1, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 7", class: "mg-ring" }, p);
  const pad = (p, x, y, w, h) => el("rect", { x, y, width: w, height: h, fill: "#fff", "fill-opacity": 0 }, p);
  const box = (p, x, y, w, h, rx, fill, shadow) => {
    if (shadow) el("rect", { x: x + 12, y: y + 12, width: w, height: h, rx, fill: shadow }, p);
    return el("rect", { x, y, width: w, height: h, rx, fill, stroke: INK, "stroke-width": 3 }, p);
  };

  const SC = {};

  /* ---- 1. a yellow plug slides into a blue adapter with three app sockets ---- */
  const AD = 9;
  SC.adapter = {
    dur: AD, still: 8.8,
    build(svg, api) {
      const A = { x: 400, y: 120, w: 320, h: 360 }, CY = 300, HOME = A.x - 4, L = [2.8, 3.25, 3.7];
      const cord = "M-212 0 C-262 0 -272 92 -350 92 H-760";
      const plug = el("g", {}, svg);
      el("path", { d: cord, fill: "none", stroke: INK, "stroke-width": 16, "stroke-linecap": "round" }, plug);
      el("path", { d: cord, fill: "none", stroke: YEL, "stroke-width": 9, "stroke-linecap": "round" }, plug);
      box(plug, -212, -46, 202, 92, 22, YEL, LIL);
      [-27, 14].forEach((y) => el("rect", { x: -10, y, width: 50, height: 13, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, plug));
      mono(plug, -111, 8, "command line", { "text-anchor": "middle" });
      const ad = el("g", {}, svg);
      pad(ad, A.x - 20, A.y - 20, A.w + 44, A.h + 44);
      ring(ad, A.x - 12, A.y - 12, A.w + 36, A.h + 36, 38);
      box(ad, A.x, A.y, A.w, A.h, 30, BLUE, LIL);
      el("rect", { x: A.x - 4, y: CY - 32, width: 18, height: 64, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, ad);
      const socks = ["GIMP", "Blender", "LibreOffice"].map((name, i) => {
        const y = A.y + 44 + i * 100, cy = y + 36, g = el("g", {}, ad);
        el("rect", { x: A.x + 34, y, width: 212, height: 72, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        [58, 72].forEach((dx) => el("path", { d: `M${A.x + dx} ${cy - 11} V${cy + 11}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g));
        mono(g, A.x + 90, cy + 8, name);
        const halo = el("circle", { cx: A.x + 284, cy, r: 13, fill: "none", stroke: "#fff", "stroke-width": 4, opacity: 0 }, ad);
        const lamp = el("circle", { cx: A.x + 284, cy, r: 13, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, ad);
        return { g, halo, lamp, cy };
      });
      let rep = -99;
      button(ad, "Pull the plug out and push it in again", () => { rep = api.now(); api.seek(AD); });
      return (t, now) => {
        const s = now - rep, on = s >= 0 && s < 2.9, ae = seg(t, 0, 0.7);
        let seat = 0.022 * bump(t, 2.2, 2.55), x = HOME - 330 * (1 - io(seg(t, 1.15, 2.25))) + 7 * bump(t, 2.15, 2.5);
        if (on) { const o = io(seg(s, 0, 0.5)) - io(seg(s, 0.75, 1.35)); x = HOME - 180 * o + 7 * bump(s, 1.3, 1.62); seat = 0.022 * bump(s, 1.32, 1.65); }
        tf(plug, x, CY); plug.setAttribute("opacity", seg(t, 1.15, 1.4));
        about(ad, A.x + A.w / 2, A.y + A.h / 2, 0.92 + 0.08 * ob(ae) + seat, 0, 20 * (1 - oc(ae))); ad.setAttribute("opacity", oc(ae));
        socks.forEach((k, i) => {
          const e = oc(seg(t, 0.3 + 0.1 * i, 0.8 + 0.1 * i));
          k.g.setAttribute("opacity", e); k.g.setAttribute("transform", `translate(0 ${14 * (1 - e)})`);
          let v = seg(t, L[i], L[i] + 0.4);
          if (on) v = s < 1.7 ? 1 - seg(s, 0, 0.25) : seg(s, 1.7 + 0.3 * i, 2.1 + 0.3 * i);
          k.lamp.setAttribute("fill", v > 0.04 ? MINT : "#fff"); about(k.lamp, A.x + 284, k.cy, 1 + 0.32 * Math.sin(v * Math.PI));
          k.halo.setAttribute("r", 13 + 18 * v); k.halo.setAttribute("opacity", v > 0 ? 0.9 * (1 - v) : 0);
        });
        return on;
      };
    },
  };

  /* ---- 2. a remote presses help, project new and layer add; cards appear on a screen ---- */
  SC.remote = {
    dur: 9, still: 8.8,
    build(svg, api) {
      const R = { x: 70, y: 100, w: 220, h: 410 }, S = { x: 404, y: 130, w: 336, h: 330 }, P = [1.5, 2.9, 4.3];
      const scr = el("g", {}, svg);
      el("rect", { x: S.x + S.w / 2 - 24, y: S.y + S.h - 4, width: 48, height: 38, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, scr);
      el("rect", { x: S.x + S.w / 2 - 84, y: S.y + S.h + 32, width: 168, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, scr);
      box(scr, S.x, S.y, S.w, S.h, 26, BLUE, LIL);
      const flash = el("rect", { x: S.x + 10, y: S.y + 10, width: S.w - 20, height: S.h - 20, rx: 18, fill: "none", stroke: SKY, "stroke-width": 8, opacity: 0 }, scr);
      const cards = [["poster.json", YEL, P[1]], ["Background", MINT, P[2]]].map(([s, fill, T], i) => {
        const y = S.y + 62 + i * 112, g = el("g", { opacity: 0 }, scr);
        el("rect", { x: S.x + 28, y, width: S.w - 56, height: 82, rx: 16, fill, stroke: INK, "stroke-width": 3 }, g);
        const lb = mono(g, S.x + S.w / 2, y + 50, s, { "text-anchor": "middle", "font-size": 24 });
        return { g, lb, cy: y + 41, T: T + 0.72 };
      });
      const rm = el("g", {}, svg);
      pad(rm, R.x - 16, R.y - 16, R.w + 44, R.h + 44);
      ring(rm, R.x - 12, R.y - 12, R.w + 36, R.h + 36, 52);
      box(rm, R.x, R.y, R.w, R.h, 44, SOFT, LIL);
      const EX = R.x + R.w - 46, EY = R.y + 44;
      const eyeRing = el("circle", { cx: EX, cy: EY, r: 11, fill: "none", stroke: SKY, "stroke-width": 4, opacity: 0 }, rm);
      const eye = el("circle", { cx: EX, cy: EY, r: 11, fill: SKY, stroke: INK, "stroke-width": 2.5 }, rm);
      const keys = ["help", "project new", "layer add"].map((s, i) => {
        const x = R.x + 22, y = R.y + 92 + i * 100, g = el("g", {}, rm);
        el("rect", { x, y: y + 7, width: 176, height: 70, rx: 18, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
        const top = el("g", {}, g);
        el("rect", { x, y, width: 176, height: 70, rx: 18, fill: LIL, stroke: INK, "stroke-width": 3 }, top);
        mono(top, x + 88, y + 43, s, { "text-anchor": "middle" });
        return { g, top };
      });
      const dots = [11, 7, 4.5].map((r, i) => el("circle", { r, fill: SKY, stroke: INK, "stroke-width": i ? 2 : 2.5, opacity: 0 }, svg));
      const p0 = [EX + 8, EY - 6], pc = [350, 96], p1 = [S.x - 4, S.y + 96];
      const at = (u) => { const a = 1 - u; return [a * a * p0[0] + 2 * a * u * pc[0] + u * u * p1[0], a * a * p0[1] + 2 * a * u * pc[1] + u * u * p1[1]]; };
      const vis = (t, c) => seg(t, c.T, c.T + 0.45);
      let rep = -99, last = 0, prev = [0, 0];
      button(rm, "Clear the screen and press the buttons again", () => { prev = cards.map((c) => vis(last, c)); rep = api.now(); api.seek(1.1); });
      return (t, now) => {
        last = t; const s = now - rep, clr = s >= 0 && s < 0.4 ? io(seg(s, 0, 0.35)) : 1;
        const re = seg(t, 0, 0.7), se = oc(seg(t, 0.25, 0.95));
        about(rm, R.x + R.w / 2, R.y + R.h / 2, 0.94 + 0.06 * ob(re), 0, 22 * (1 - oc(re))); rm.setAttribute("opacity", oc(re));
        scr.setAttribute("transform", `translate(${30 * (1 - se)} 0)`); scr.setAttribute("opacity", se);
        let hit = 0, fl = 0, pu = -1;
        keys.forEach((k, i) => {
          const e = oc(seg(t, 0.3 + 0.1 * i, 0.8 + 0.1 * i));
          k.g.setAttribute("opacity", e); k.g.setAttribute("transform", `translate(0 ${12 * (1 - e)})`);
          const pd = oc(seg(t, P[i], P[i] + 0.12)) * (1 - io(seg(t, P[i] + 0.26, P[i] + 0.46)));
          k.top.setAttribute("transform", `translate(0 ${7 * pd})`);
          hit = Math.max(hit, bump(t, P[i], P[i] + 0.4));
          if (t >= P[i] + 0.72) fl = Math.max(fl, 1 - seg(t, P[i] + 0.72, P[i] + 1.25));
          if (t >= P[i] + 0.1 && t < P[i] + 0.72) pu = io(seg(t, P[i] + 0.1, P[i] + 0.72));
        });
        about(eye, EX, EY, 1 + 0.25 * hit); eyeRing.setAttribute("r", 11 + 16 * hit); eyeRing.setAttribute("opacity", 0.9 * hit);
        flash.setAttribute("opacity", 0.95 * fl);
        dots.forEach((d, i) => { const u = pu - i * 0.12; if (pu < 0 || u < 0) { d.setAttribute("opacity", 0); return; } const [x, y] = at(u); tf(d, x, y); d.setAttribute("opacity", 1 - i * 0.2); });
        cards.forEach((c, i) => {
          const v = vis(t, c), pv = prev[i] * (1 - clr);
          if (pv > v) { c.g.setAttribute("opacity", pv); about(c.g, S.x + S.w / 2, c.cy, 0.94 + 0.06 * pv); c.lb.setAttribute("opacity", 1); c.lb.setAttribute("transform", ""); return; }
          c.g.setAttribute("opacity", seg(t, c.T, c.T + 0.15)); about(c.g, S.x + S.w / 2, c.cy, 0.6 + 0.4 * ob(v));
          const lk = oc(seg(t, c.T + 0.22, c.T + 0.55)); c.lb.setAttribute("opacity", lk); c.lb.setAttribute("transform", `translate(0 ${10 * (1 - lk)})`);
        });
        return s >= 0 && s < 0.4;
      };
    },
  };

  /* ---- 3. a switchboard cable runs from agent to an app card, and a lamp says install ---- */
  const SW = 8.5;
  SC.switchboard = {
    dur: SW, still: 8.3,
    build(svg, api) {
      const B = { x: 60, y: 86, w: 680, h: 440 }, A = [284, 338], CX = 500, Y = [234, 338, 442], LX = 548, LY = 146;
      const bd = el("g", {}, svg);
      pad(bd, B.x - 16, B.y - 16, B.w + 44, B.h + 44);
      ring(bd, B.x - 12, B.y - 12, B.w + 36, B.h + 36, 40);
      box(bd, B.x, B.y, B.w, B.h, 30, SKY, LIL);
      const agent = el("g", {}, bd);
      el("rect", { x: 104, y: A[1] - 40, width: 180, height: 80, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, agent);
      mono(agent, 190, A[1] + 9, "agent", { "text-anchor": "middle", "font-size": 24 });
      el("circle", { cx: A[0], cy: A[1], r: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, agent);
      const apps = ["GIMP", "Blender", "Zotero"].map((s, i) => {
        const g = el("g", {}, bd), inner = el("g", {}, g);
        el("rect", { x: CX, y: Y[i] - 38, width: 200, height: 76, rx: 16, fill: MINT, stroke: INK, "stroke-width": 3 }, inner);
        mono(inner, CX + 106, Y[i] + 9, s, { "text-anchor": "middle", "font-size": 24 });
        el("circle", { cx: CX, cy: Y[i], r: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, inner);
        return { g, inner };
      });
      const halo = el("circle", { cx: LX, cy: LY, r: 18, fill: "#fff", opacity: 0 }, bd);
      const rays = el("g", { opacity: 0 }, bd);
      [-150, -110, -70, -30].forEach((a) => { const r = (a * Math.PI) / 180; el("path", { d: `M${LX + Math.cos(r) * 30} ${LY + Math.sin(r) * 30} L${LX + Math.cos(r) * 40} ${LY + Math.sin(r) * 40}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, rays); });
      el("rect", { x: LX - 10, y: LY + 14, width: 20, height: 12, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, bd);
      const lamp = el("circle", { cx: LX, cy: LY, r: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, bd);
      const word = mono(bd, LX + 50, LY + 8, "install", { opacity: 0 });
      const cab = el("g", {}, bd);
      const under = el("path", { fill: "none", stroke: INK, "stroke-width": 15, "stroke-linecap": "round" }, cab);
      const top = el("path", { fill: "none", stroke: BLUE, "stroke-width": 9, "stroke-linecap": "round" }, cab);
      el("circle", { cx: A[0], cy: A[1], r: 11, fill: BLUE, stroke: INK, "stroke-width": 3 }, cab);
      const head = el("circle", { r: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, cab);
      let rep = -99, from = 0, cur = 0;
      button(bd, "Move the cable to the next card", () => { from = cur; cur = (cur + 1) % 3; rep = api.now(); api.seek(SW); });
      return (t, now) => {
        const s = now - rep, on = s >= 0 && s < 1.6, be = seg(t, 0, 0.6);
        about(bd, 400, 306, 0.96 + 0.04 * ob(be)); bd.setAttribute("opacity", oc(be));
        [agent].concat(apps.map((a) => a.g)).forEach((g, i) => { const e = oc(seg(t, 0.3 + 0.1 * i, 0.8 + 0.1 * i)); g.setAttribute("opacity", e); g.setAttribute("transform", `translate(0 ${16 * (1 - e)})`); });
        let E, sag;
        if (on) { const mv = io(seg(s, 0.1, 0.85)); E = [CX, Y[from] + (Y[cur] - Y[from]) * mv]; sag = 34 + 40 * Math.sin(mv * Math.PI); }
        else { const e = io(seg(t, 1.3, 2.4)), w = seg(t, 2.4, 3.1); E = [A[0] + (CX - A[0]) * e, A[1] + (Y[cur] - A[1]) * e]; sag = 34 + 50 * (1 - e) + 14 * Math.sin(w * 2 * Math.PI) * (1 - w); }
        const d = `M${A[0]} ${A[1]} Q${(A[0] + E[0]) / 2} ${Math.max(A[1], E[1]) + sag} ${E[0]} ${E[1]}`;
        under.setAttribute("d", d); top.setAttribute("d", d); head.setAttribute("cx", E[0]); head.setAttribute("cy", E[1]);
        cab.setAttribute("opacity", seg(t, 1.25, 1.45));
        const pop = on ? bump(s, 0.85, 1.2) : bump(t, 2.4, 2.75);
        apps.forEach((a, i) => about(a.inner, CX + 100, Y[i], i === cur ? 1 + 0.06 * pop : 1));
        const lit = on ? (s < 0.15 ? 1 - s / 0.15 : seg(s, 0.9, 1.25)) : seg(t, 2.55, 2.95);
        const wd = on ? (s < 0.15 ? 1 - s / 0.15 : oc(seg(s, 1.15, 1.5))) : oc(seg(t, 2.95, 3.35));
        lamp.setAttribute("fill", lit > 0.04 ? LIL : SOFT); about(lamp, LX, LY, 1 + 0.2 * Math.sin(lit * Math.PI));
        halo.setAttribute("opacity", 0.85 * oc(lit)); halo.setAttribute("r", 18 + 14 * oc(lit)); rays.setAttribute("opacity", oc(lit));
        word.setAttribute("opacity", wd); word.setAttribute("transform", `translate(${-12 * (1 - wd)} 0)`);
        return on;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  const plugAdapter = (g) => {
    [-20, 10].forEach((x) => el("rect", { x, y: -50, width: 10, height: 24, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g));
    el("rect", { x: -46, y: -30, width: 92, height: 68, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: -24, y: -12, width: 48, height: 32, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
    [-8, 8].forEach((x) => el("path", { d: `M${x} -2 V10`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g));
  };
  const remoteSmall = (g) => {
    el("rect", { x: -32, y: -50, width: 64, height: 96, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cx: 0, cy: -32, r: 6, fill: SKY, stroke: INK, "stroke-width": 2 }, g);
    [-14, 4, 22].forEach((y) => el("rect", { x: -18, y: y - 6, width: 36, height: 12, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2 }, g));
  };
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 5.8,
    build(svg) {
      const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * max) / w); return n; };
      const parts = [], add = (d, pop) => { const g = el("g", {}, svg); parts.push({ g, d, pop }); return g; };
      const chip = add(0.1);
      const cr = el("rect", { x: 64, y: 50, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
      cr.setAttribute("width", txt(chip, 84, 78, "Concepts", { "font-size": 21, "font-weight": 600 }).getComputedTextLength() + 40);
      fit(txt(add(0.2), 62, 180, "What is CLI-Anything?", { "font-size": 68, "font-weight": 700 }), 836);
      fit(txt(add(0.32), 64, 236, "Gives AI agents a command line for existing software", { "font-size": 28, "font-weight": 500, fill: MUTE }), 836);
      txt(add(0.42), 64, 278, "Checked 26 Nov 2026", { "font-family": MONO, "font-size": 18, "font-weight": 500, fill: MUTE });
      const CW = 392;
      [["Apache 2.0, from HKUDS", LIL, plugAdapter, 6], ["No screenshots, no clicking", MINT, remoteSmall, -7]].forEach(([s, fill, draw, r], i) => {
        const x = 64 + i * 440, o = add(0.6 + i * 0.12, [x + CW / 2, 356]), inner = el("g", {}, o);
        draw(inner); tf(inner, x + CW / 2, 356, 1, r);
        const c = add(0.7 + i * 0.12);
        el("rect", { x, y: 420, width: CW, height: 74, rx: 18, fill, stroke: INK, "stroke-width": 3 }, c);
        fit(txt(c, x + CW / 2, 466, s, { "text-anchor": "middle", "font-size": 24, "font-weight": 600 }), CW - 48);
      });
      return (t) => {
        parts.forEach(({ g, d, pop }) => {
          const k = seg(t, d, d + 0.55);
          if (pop) { about(g, pop[0], pop[1], 0.6 + 0.4 * ob(k)); g.setAttribute("opacity", seg(t, d, d + 0.15)); }
          else { g.setAttribute("transform", `translate(0 ${16 * (1 - oc(k))})`); g.setAttribute("opacity", oc(k)); }
        });
      };
    },
  };

  /* ---- player: each scene plays once when it comes into view, then rests on its still frame ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, at = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => false;
    const frame = () => { const now = clock(), t = now + off, end = held || t >= sc.dur; return draw(end ? sc.still : Math.max(0, t), now) || !end; };
    const tick = () => { cancelAnimationFrame(raf); if (frame() && seen) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => tick() };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { off = at - clock(); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { at = clock() + off; cancelAnimationFrame(raf); }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
