/* Bright coded scenes for "OpenCode 2.3". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  let uid = 0;
  const nid = (p) => `mg-${p}-${++uid}`;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, s) => txt(svg, 756, 60, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  const ring = (p, x, y, w, h, r = 20) => el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, p);

  const SC = {};

  /* ---- 1. the subagent kettle heats while the parent session notepad keeps filling ---- */
  SC.kettle = {
    dur: 9, still: 9, once: true,
    build(svg, api) {
      hint(svg, "tap the kettle");
      el("rect", { x: 40, y: 500, width: 720, height: 18, rx: 9, fill: SOFT }, svg);
      el("path", { d: "M40 500 H760", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      // notepad: parent session
      el("rect", { x: 520, y: 222, width: 230, height: 278, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 520, y: 210, width: 230, height: 34, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 0; i < 6; i++) el("circle", { cx: 548 + i * 35, cy: 227, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 635, 282, "parent session", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      el("path", { d: "M545 298 H725", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, svg);
      const LC = [LIL, SKY, MINT, BLUE];
      const lines = [170, 130, 180, 120, 160, 175, 135, 150].map((w, i) => ({ n: el("path", { d: "M547 0 H547", stroke: LC[i % 4], "stroke-width": 9, "stroke-linecap": "round", opacity: 0 }, svg), w, y: 322 + i * 21, d: 0.5 + i * 0.85 }));
      // hob
      const glow = el("ellipse", { cx: 260, cy: 438, rx: 140, ry: 13, fill: YEL, opacity: 0 }, svg);
      el("rect", { x: 100, y: 436, width: 320, height: 64, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      const knob = el("g", {}, svg);
      el("circle", { r: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, knob);
      el("path", { d: "M0 -2 V-11", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, knob);
      el("circle", { cx: 186, cy: 468, r: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M186 466 V457", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const dots = [0, 1, 2].map((i) => el("circle", { cx: 340 + i * 22, cy: 468, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg));
      // kettle: subagent
      const kg = el("g", {}, svg);
      const body = "M170 432 Q150 432 154 412 L180 302 Q184 286 200 286 H320 Q336 286 340 302 L366 412 Q370 432 350 432 Z";
      const cid = nid("kettle");
      const cp = el("clipPath", { id: cid }, svg); el("path", { d: body }, cp);
      const hd = "M182 314 Q118 322 132 378 Q142 404 162 414";
      el("path", { d: hd, stroke: INK, "stroke-width": 15, fill: "none", "stroke-linecap": "round" }, kg);
      el("path", { d: hd, stroke: BLUE, "stroke-width": 8, fill: "none", "stroke-linecap": "round" }, kg);
      el("path", { d: "M350 410 Q378 372 392 300 L414 306 Q406 376 362 424 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, kg);
      el("path", { d: body, fill: "#fff" }, kg);
      const wg = el("g", { "clip-path": `url(#${cid})` }, kg);
      const water = el("path", { d: "", fill: SKY }, wg);
      const bubbles = Array.from({ length: 7 }, (_, i) => el("circle", { r: 4 + (i % 3) * 2, fill: "#fff", stroke: INK, "stroke-width": 1.5, opacity: 0 }, wg));
      el("path", { d: "M198 318 L186 368", stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round", opacity: 0.9 }, kg);
      el("path", { d: body, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, kg);
      el("rect", { x: 150, y: 420, width: 220, height: 16, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, kg);
      el("path", { d: "M204 288 Q260 248 316 288 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, kg);
      el("circle", { cx: 260, cy: 262, r: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, kg);
      el("rect", { x: 196, y: 334, width: 128, height: 40, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, kg);
      txt(kg, 260, 361, "subagent", { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
      const whistle = el("path", { d: "M420 290 L436 278 M424 304 L444 302 M412 282 L416 264", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", opacity: 0 }, svg);
      // steam
      const puffs = Array.from({ length: 5 }, () => el("circle", { r: 10, fill: SOFT, stroke: INK, "stroke-width": 2, opacity: 0 }, svg));
      // the report back card
      const card = el("g", { opacity: 0 }, svg);
      el("rect", { x: -110, y: -30, width: 220, height: 60, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      txt(card, 0, 9, "report back", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      // tap target
      const hit = el("g", {}, svg);
      ring(hit, 108, 234, 330, 208, 26);
      button(hit, "Kettle labelled subagent: refill it and start the cycle again", () => api.seek(0));
      return (t, now) => {
        const ph = now > 0 ? now : t;
        const fill = seg(t, 0.1, 1.0), heat = seg(t, 0.8, 3.0), steam = seg(t, 2.0, 3.0);
        const level = 0.12 + 0.64 * oc(fill), wy = 432 - 146 * level, a = (fill > 0 && fill < 1 ? 6 * (1 - fill) : 0) + 3 * heat;
        const w1 = Math.sin(ph * 4) * a;
        water.setAttribute("d", `M130 ${wy} Q160 ${wy - w1} 190 ${wy} T250 ${wy} T310 ${wy} T370 ${wy} T430 ${wy} V440 H130 Z`);
        bubbles.forEach((b, i) => { const p = (ph * 0.6 + i * 0.37) % 1; b.setAttribute("cx", 192 + i * 23); b.setAttribute("cy", 426 - p * (426 - wy - 8)); b.setAttribute("opacity", heat > 0.15 ? heat * (1 - p * p) : 0); });
        glow.setAttribute("opacity", heat);
        tf(knob, 146, 468, 1, 120 * oc(seg(t, 0.4, 0.8)));
        dots.forEach((d, i) => d.setAttribute("fill", heat > (i + 0.5) / 3 ? YEL : "#fff"));
        lines.forEach((l) => { const k = oc(seg(t, l.d, l.d + 0.5)); l.n.setAttribute("d", `M547 ${l.y} H${547 + l.w * k}`); l.n.setAttribute("opacity", k > 0 ? 1 : 0); });
        const ws = seg(t, 5.0, 6.2), wob = ws > 0 && ws < 1 ? Math.sin(ws * Math.PI * 8) * 2.2 * (1 - ws) : 0;
        kg.setAttribute("transform", `rotate(${wob} 260 432)`);
        whistle.setAttribute("opacity", ws > 0 && ws < 1 ? Math.sin(ws * Math.PI) : 0);
        puffs.forEach((n, i) => { const p = (ph * 0.42 + i / 5) % 1; n.setAttribute("cx", 404 - 96 * p + 8 * Math.sin(ph * 2 + i)); n.setAttribute("cy", 290 - 150 * p); n.setAttribute("r", 8 + 10 * p); n.setAttribute("opacity", steam * Math.sin(Math.PI * p)); });
        const c = seg(t, 5.9, 7.0);
        card.setAttribute("opacity", c > 0 ? 1 : 0);
        tf(card, 404 + 126 * oc(c), 296 - 146 * ob(c), 0.2 + 0.8 * oc(c));
      };
    },
  };

  /* ---- 2. tool call and thought cards slide into the activity drawer ---- */
  SC.drawer = {
    dur: 7, still: 7, once: true,
    build(svg, api) {
      hint(svg, "tap the drawer");
      const RX = [139, 313, 487, 661], RY = 144, TX = [280, 360, 440, 520];
      RX.forEach((x) => el("rect", { x: x - 75, y: RY - 28, width: 150, height: 56, rx: 12, fill: "none", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "6 8" }, svg));
      el("path", { d: "M120 548 H680", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      // tag
      const tag = el("g", { opacity: 0 }, svg);
      el("path", { d: "M340 262 V288 M460 262 V288", stroke: INK, "stroke-width": 3 }, tag);
      const tagBox = el("rect", { x: 270, y: 212, width: 260, height: 52, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 292, cy: 238, r: 6, fill: SOFT, stroke: INK, "stroke-width": 2 }, tag);
      const tagT = txt(tag, 412, 246, "Verbosity low", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      // cabinet with the activity drawer
      const cab = el("g", {}, svg);
      el("rect", { x: 214, y: 524, width: 28, height: 24, rx: 4, fill: LIL, stroke: INK, "stroke-width": 3 }, cab);
      el("rect", { x: 558, y: 524, width: 28, height: 24, rx: 4, fill: LIL, stroke: INK, "stroke-width": 3 }, cab);
      el("rect", { x: 190, y: 300, width: 420, height: 230, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, cab);
      el("rect", { x: 176, y: 286, width: 448, height: 20, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, cab);
      el("rect", { x: 214, y: 332, width: 372, height: 140, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, cab);
      const inner = el("rect", { x: 228, y: 330, width: 344, height: 44, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, cab);
      const cardsG = el("g", {}, cab);
      const cards = ["tool call", "thought", "tool call", "thought"].map((s, i) => {
        const g = el("g", {}, cardsG);
        el("rect", { x: -75, y: -28, width: 150, height: 56, rx: 12, fill: i % 2 ? MINT : SKY, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 8, s, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        return g;
      });
      const panel = el("g", {}, cab);
      el("rect", { x: 208, y: 330, width: 384, height: 144, rx: 12, fill: LIL, stroke: INK, "stroke-width": 3 }, panel);
      txt(panel, 400, 394, "activity", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
      el("rect", { x: 355, y: 420, width: 90, height: 18, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, panel);
      ring(cab, 164, 274, 472, 284, 22);
      let user = null;
      button(cab, "Drawer labelled activity: open it to lay every card out, or close it again", () => { user = { high: !(user && user.high), at: api.now() }; api.poke(); });
      return (t, now) => {
        let o, es, tk = 1, high = false, flip = 1;
        if (user) {
          const s = now - user.at; high = user.high; flip = seg(s, 0, 0.36);
          if (high) { o = oc(seg(s, 0, 0.5)); es = cards.map((_, i) => 1 - io(seg(s, 0.4 + i * 0.15, 1.0 + i * 0.15))); }
          else { es = cards.map((_, i) => io(seg(s, i * 0.15, 0.6 + i * 0.15))); o = 1 - oc(seg(s, 1.1, 1.6)); }
        } else {
          o = 1 - io(seg(t, 3.9, 4.7)); es = cards.map((_, i) => io(seg(t, 0.3 + i * 0.85, 0.9 + i * 0.85))); tk = ob(seg(t, 4.7, 5.4));
        }
        inner.setAttribute("height", Math.max(0, 44 * o)); inner.setAttribute("opacity", o > 0.03 ? 1 : 0);
        panel.setAttribute("transform", `translate(0 ${44 * o})`);
        cards.forEach((g, i) => {
          const e = es[i], ty = 397 - 44 * (1 - o);
          tf(g, RX[i] + (TX[i] - RX[i]) * e, RY + (ty - RY) * e - 60 * Math.sin(Math.PI * e), 1 - 0.4 * e);
          g.setAttribute("opacity", e >= 0.999 ? 0 : 1);
        });
        const shown = flip < 0.5 ? !high : high;
        tagT.textContent = shown ? "Verbosity high" : "Verbosity low";
        tagBox.setAttribute("fill", shown ? SKY : "#fff");
        const sy = user ? Math.max(0.04, Math.abs(Math.cos(Math.PI * flip))) : 1;
        tag.setAttribute("opacity", tk > 0.01 ? 1 : 0);
        tag.setAttribute("transform", `translate(400 250) scale(${Math.max(0.01, tk)} ${Math.max(0.01, tk) * sy}) translate(-400 -250)`);
      };
    },
  };

  /* ---- 3. an elevator rides up past prompt floors ---- */
  SC.elevator = {
    dur: 7, still: 7, once: true,
    build(svg, api) {
      hint(svg, "tap a floor");
      const LV = [516, 426, 336, 246, 156];
      el("path", { d: "M40 540 H760", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      // glass shaft
      el("rect", { x: 200, y: 56, width: 180, height: 484, fill: SKY, "fill-opacity": 0.35, stroke: INK, "stroke-width": 3 }, svg);
      LV.forEach((y) => el("path", { d: `M203 ${y} H377`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, svg));
      el("path", { d: "M218 128 L252 94 M218 162 L286 94", stroke: "#fff", "stroke-width": 6, "stroke-linecap": "round" }, svg);
      el("rect", { x: 188, y: 40, width: 204, height: 22, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      // floors, each labelled prompt
      let user = null, lastY = LV[0], lastD = 0;
      const chips = LV.map((y, i) => {
        const g = el("g", {}, svg);
        ring(g, 44, y - 62, 166, 78, 14);
        el("rect", { x: 52, y, width: 148, height: 12, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
        const chip = el("rect", { x: 68, y: y - 50, width: 112, height: 36, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 124, y - 25, "prompt", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
        button(g, `Floor ${i + 1}, labelled prompt: send the car here`, () => { user = { from: lastY, d: lastD, to: i, at: api.now() }; api.poke(); });
        return chip;
      });
      // the car
      const cable = el("path", { d: "", stroke: INK, "stroke-width": 3 }, svg);
      const car = el("g", {}, svg);
      el("rect", { x: -76, y: -86, width: 152, height: 10, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, car);
      el("rect", { x: -70, y: -78, width: 140, height: 78, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, car);
      el("rect", { x: -60, y: -70, width: 120, height: 64, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, car);
      el("path", { d: "M-22 -54 H22 Q28 -54 28 -48 V-34 Q28 -28 22 -28 H-6 L-14 -20 V-28 H-22 Q-28 -28 -28 -34 V-48 Q-28 -54 -22 -54 Z", fill: SKY, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, car);
      el("path", { d: "M-16 -45 H16 M-16 -37 H6", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, car);
      const dl = el("rect", { x: -60, y: -70, width: 60, height: 64, fill: LIL, stroke: INK, "stroke-width": 2 }, car);
      const dr = el("rect", { x: 0, y: -70, width: 60, height: 64, fill: LIL, stroke: INK, "stroke-width": 2 }, car);
      // the panel beside the shaft
      el("path", { d: "M382 306 H462", stroke: INK, "stroke-width": 3, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, svg);
      el("rect", { x: 462, y: 222, width: 290, height: 168, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 607, 282, "Jump to message", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      let kx = 484;
      [["Cmd", 86], ["Alt", 76], ["G", 56]].forEach(([k, w]) => {
        el("rect", { x: kx, y: 310, width: w, height: 50, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
        txt(svg, kx + w / 2, 342, k, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        kx += w + 14;
      });
      return (t, now) => {
        let y, d;
        if (user) {
          const s = now - user.at, ride = 0.35 + Math.max(0.5, (Math.abs(LV[user.to] - user.from) / 90) * 0.45);
          y = user.from + (LV[user.to] - user.from) * io(seg(s, 0.35, ride));
          d = s < ride ? user.d * (1 - seg(s, 0, 0.35)) : oc(seg(s, ride + 0.1, ride + 0.7));
        } else {
          y = LV[0] + (LV[3] - LV[0]) * io(seg(t, 0.6, 4.2)); d = oc(seg(t, 4.4, 5.2));
        }
        lastY = y; lastD = d;
        tf(car, 290, y); cable.setAttribute("d", `M290 62 V${y - 86}`);
        const w = 60 * (1 - d);
        dl.setAttribute("width", w); dr.setAttribute("x", 60 - w); dr.setAttribute("width", w);
        dl.setAttribute("opacity", w > 1 ? 1 : 0); dr.setAttribute("opacity", w > 1 ? 1 : 0);
        chips.forEach((c, i) => { const g = Math.abs(y - LV[i]); c.setAttribute("fill", g < 2 && d > 0.05 ? YEL : g < 40 ? SKY : "#fff"); });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3, still: 3, once: true,
    build(svg) {
      el("rect", { x: 64, y: 56, width: 172, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 150, 82.5, "New version", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 896, 82, "Checked 13 Nov 2026", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: CAP });
      txt(svg, 64, 190, "OpenCode 2.3", { "font-family": MONO, "font-size": 76, "font-weight": 700 });
      el("path", { d: "M68 220 H420", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 274, "Background subagents by default and what else changed", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const icons = [
        (g) => { [[-8, 8, 7], [4, -2, 9], [-4, -14, 6]].forEach(([x, y, r]) => el("circle", { cx: x, cy: y, r, fill: SOFT, stroke: INK, "stroke-width": 2 }, g)); },
        (g) => { [[-12, 14], [-12, 8], [-12, 2]].forEach(([x, w], i) => el("path", { d: `M${x} ${-8 + i * 8} h${24 - i * 8}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g)); },
        (g) => { el("path", { d: "M0 12 V-12 M-9 -3 L0 -12 L9 -3", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g); },
      ];
      const tiles = [["Background", "subagents", SKY], ["Quieter", "transcripts", LIL], ["Jump to", "message", MINT]].map(([a, b, col], i) => {
        const g = el("g", { opacity: 0 }, svg), x = 64 + i * 288;
        el("rect", { x, y: 330, width: 262, height: 136, rx: 20, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g);
        el("circle", { r: 24, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, ic);
        icons[i](ic); tf(ic, x + 220, 374);
        txt(g, x + 24, 410, a, { "font-size": 26, "font-weight": 700 });
        txt(g, x + 24, 442, b, { "font-size": 26, "font-weight": 700 });
        return g;
      });
      return (t) => tiles.forEach((g, i) => { const s = 0.3 + i * 0.55, k = ob(seg(t, s, s + 0.7)); g.setAttribute("opacity", seg(t, s, s + 0.25)); g.setAttribute("transform", `translate(${90 * (1 - k)} 0)`); });
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
    let off = 0, raf = 0, seen = false, held = calm, begun = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const at = (now) => (sc.once ? cl(now + off, 0, sc.dur) : (((now + off) % sc.dur) + sc.dur) % sc.dur);
    const frame = () => { const now = clock(); draw(held ? sc.still : at(now), now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (!begun) { begun = true; if (sc.once) off = -clock(); } tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
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
