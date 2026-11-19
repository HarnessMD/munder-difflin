/* Bright coded scenes for "Amp Alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const sat = (n, cx, cy, s = 1, dx = 0, dy = 0, r = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${s}) translate(${-cx} ${-cy})`);
  const op = (n, v) => n.setAttribute("opacity", cl(v));
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* a rounded box with a crisp ink outline and an optional soft offset shadow */
  const box = (p, x, y, w, h, r, fill, sh, off = 8, sw = 3) => {
    if (sh) el("rect", { x: x + off, y: y + off, width: w, height: h, rx: r, fill: sh }, p);
    return el("rect", { x, y, width: w, height: h, rx: r, fill, stroke: INK, "stroke-width": sw }, p);
  };
  /* the dashed focus and hover ring the stylesheet reveals */
  const ring = (p, a, t = "rect") => el(t, Object.assign({ fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6" }, a), p);
  /* a toothed gear drawn around 0,0 */
  const gear = (p, n, ro, fill) => {
    const g = el("g", {}, p), ri = ro - 11, st = (2 * Math.PI) / n, pt = (r, a) => `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`;
    let d = "";
    for (let i = 0; i < n; i++) { const a = i * st; d += `${i ? "L" : "M"}${pt(ri, a - st * 0.5)} L${pt(ri, a - st * 0.3)} L${pt(ro, a - st * 0.17)} L${pt(ro, a + st * 0.17)} L${pt(ri, a + st * 0.3)} `; }
    el("path", { d: d + "Z", fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("circle", { r: ri * 0.42, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
    el("circle", { r: 5, fill: INK }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. a pulley lifts the prompt box from the laptop up to the orb cloud ---- */
  SC.pulley = {
    dur: 8.5, still: 8.5,
    build(svg, api) {
      const PX = 330, PY = 150, PR = 64, RX = PX + PR, UP = 236, DOWN = 434, REST = 422, BW = 214, BH = 72, DX = 128, DY = 114;
      const rise = (x) => (x < 0.86 ? io(x / 0.86) * 1.035 : 1.035 - 0.035 * io((x - 0.86) / 0.14));
      /* cloud: shadow, outlined union of bumps, fill on top */
      const cloud = el("g", {}, svg), csh = el("g", { transform: "translate(10 10)" }, cloud);
      const bumps = [[470, 270, 52], [548, 226, 66], [636, 238, 58], [700, 282, 44]];
      const shape = (g, a) => { bumps.forEach(([cx, cy, r]) => el("circle", Object.assign({ cx, cy, r }, a), g)); el("rect", Object.assign({ x: 440, y: 268, width: 280, height: 66, rx: 33 }, a), g); };
      shape(csh, { fill: SOFT }); shape(cloud, { fill: SKY, stroke: INK, "stroke-width": 6 }); shape(cloud, { fill: SKY });
      const orb = mono(svg, 642, 304, "orb", { "font-size": 36 });
      /* ground and laptop */
      const lap = el("g", {}, svg);
      el("rect", { x: 150, y: 532, width: 500, height: 12, rx: 6, fill: SOFT }, lap);
      const lid = el("g", {}, lap);
      const lidR = el("rect", { x: 270, y: 352, width: 248, height: 154, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, lid);
      const scr = el("g", {}, lid);
      el("rect", { x: 286, y: 368, width: 216, height: 122, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, scr);
      [[306, 386, 120, SKY], [306, 408, 160, LIL], [306, 430, 96, MINT]].forEach(([x, y, w, c]) => el("rect", { x, y, width: w, height: 12, rx: 6, fill: c }, scr));
      el("path", { d: "M236 506 H552 L568 524 Q570 532 560 532 H228 Q218 532 220 524 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, lap);
      el("rect", { x: 364, y: 512, width: 60, height: 8, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, lap);
      /* lilac beam */
      const beam = el("g", {}, svg);
      box(beam, 70, 40, 660, 32, 12, LIL, SOFT, 8);
      [110, 690].forEach((x) => el("circle", { cx: x, cy: 56, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, beam));
      /* winding drum */
      const drum = el("g", {}, svg);
      el("rect", { x: DX - 8, y: 62, width: 16, height: 52, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, drum);
      el("circle", { cx: DX, cy: DY, r: 28, fill: BLUE, stroke: INK, "stroke-width": 3 }, drum);
      const dsp = el("g", {}, drum);
      [0, 60, 120].forEach((a) => el("path", { d: `M${DX - 18} ${DY} H${DX + 18}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round", transform: `rotate(${a} ${DX} ${DY})` }, dsp));
      el("circle", { cx: DX, cy: DY, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, drum);
      /* sky blue pulley, the button */
      const pul = el("g", {}, svg);
      ring(pul, { cx: PX, cy: PY, r: PR + 16 }, "circle");
      el("rect", { x: PX - 8, y: 62, width: 16, height: 94, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, pul);
      const wheel = el("g", {}, pul);
      el("circle", { cx: PX, cy: PY, r: PR, fill: SKY, stroke: INK, "stroke-width": 3 }, wheel);
      el("circle", { cx: PX, cy: PY, r: PR - 12, fill: "none", stroke: INK, "stroke-width": 2 }, wheel);
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; el("circle", { cx: PX + Math.cos(a) * 30, cy: PY + Math.sin(a) * 30, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, wheel); }
      const rope = el("path", { stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, pul);
      el("circle", { cx: PX, cy: PY, r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, pul);
      el("circle", { cx: PX, cy: PY, r: 4, fill: INK }, pul);
      /* mint box with its glow and sparkles */
      const bx = el("g", {}, svg);
      const halo = [[20, 30, 0.24], [10, 22, 0.42]].map(([g, r, o]) => ({ n: el("rect", { x: -BW / 2 - g, y: -g, width: BW + 2 * g, height: BH + 2 * g, rx: r, fill: MINT, opacity: 0 }, bx), o }));
      el("path", { d: "M-22 0 V-8 Q-22 -16 -14 -16 H14 Q22 -16 22 -8 V0", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, bx);
      box(bx, -BW / 2, 0, BW, BH, 14, MINT, LIL, 8);
      mono(bx, 0, 44, "Send a prompt", { "font-size": 22 });
      const spk = [[-BW / 2 - 30, 4], [BW / 2 + 30, -8], [-BW / 2 - 16, BH + 22], [BW / 2 + 40, BH + 4]].map(([x, y]) => {
        const g = el("g", {}, bx); el("path", { d: "M0 -13 Q2 -2 13 0 Q2 2 0 13 Q-2 2 -13 0 Q-2 -2 0 -13 Z", fill: YEL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g); return { g, x, y };
      });
      let tapAt = -99;
      button(pul, "Pulley: lower the box and lift it again", () => { if (!api.calm && api.now() - tapAt < 3.1) return; tapAt = api.mark(); api.poke(); });
      return (e) => {
        const kb = oc(seg(e, 0, 0.5)); tf(beam, 0, -24 * (1 - kb)); op(beam, kb);
        sat(drum, DX, DY, ob(seg(e, 0.1, 0.55))); op(drum, seg(e, 0.1, 0.2));
        sat(pul, PX, PY, ob(seg(e, 0.2, 0.7))); op(pul, seg(e, 0.2, 0.3));
        sat(cloud, 590, 250, 0.7 + 0.3 * ob(seg(e, 0.3, 0.85))); op(cloud, seg(e, 0.3, 0.45));
        const kl = oc(seg(e, 0.4, 0.9)); tf(lap, 0, 30 * (1 - kl)); op(lap, kl);
        /* box: drops onto the laptop, rides up, then the tap lowers and lifts it again */
        const L = rise(seg(e, 1.5, 4.3)), c = io(seg(e, 3.6, 4.7)), s = e - tapAt;
        const d = io(seg(s, 0, 1.1)) * (1 - rise(seg(s, 1.5, 3.0)));
        let y = DOWN - (DOWN - UP) * L + (REST - UP) * d - 70 * (1 - oc(seg(e, 0.55, 1.05)));
        y = Math.min(y, c > 0.5 ? REST : DOWN);
        tf(bx, RX, y); op(bx, seg(e, 0.55, 0.7));
        rope.setAttribute("d", `M${DX} 86 H${PX} A${PR} ${PR} 0 0 1 ${RX} ${PY} V${(y - 16).toFixed(1)}`); op(rope, seg(e, 0.55, 0.8));
        const lift = DOWN - y, press = 1 - 0.05 * Math.sin(Math.PI * seg(s, 0, 0.3));
        wheel.setAttribute("transform", `translate(${PX} ${PY}) scale(${press}) rotate(${(-lift / PR) * 57.3}) translate(${-PX} ${-PY})`);
        dsp.setAttribute("transform", `rotate(${(-lift / 28) * 57.3} ${DX} ${DY})`);
        /* laptop closes its lid */
        lidR.setAttribute("y", 352 + 142 * c); lidR.setAttribute("height", 154 - 142 * c);
        scr.setAttribute("transform", `translate(0 506) scale(1 ${1 - 0.92 * c}) translate(0 -506)`); op(scr, 1 - seg(c, 0, 0.4));
        /* the box keeps glowing */
        const up = 1 - cl(d * 1.6), g = oc(seg(e, 4.4, 5.0)) * up, pulse = 0.85 + 0.15 * Math.sin((e - 4.4) * 2.6);
        halo.forEach((h, i) => { op(h.n, h.o * g * pulse); sat(h.n, 0, BH / 2, 1 + 0.025 * (i + 1) * Math.sin((e - 4.4) * 2.6)); });
        spk.forEach((p, i) => { const k = ob(seg(e, 4.6 + i * 0.09, 5.0 + i * 0.09)) * up; tf(p.g, p.x, p.y, Math.max(0, k * (0.88 + 0.12 * Math.sin(e * 3 + i * 1.7))), e * 20 + i * 25); op(p.g, k); });
        /* the orb label lands last */
        const ko = ob(seg(e, 5.0, 5.5)); sat(orb, 642, 292, 0.5 + 0.5 * ko); op(orb, seg(e, 5.0, 5.15));
      };
    },
  };

  /* ---- 2. a gearbox swaps its effort dial for a model selector list ---- */
  SC.gearbox = {
    dur: 8, still: 8,
    build(svg, api) {
      const GB = el("g", {}, el("g", { transform: "translate(0 -30)" }, svg));
      ring(GB, { x: 98, y: 84, width: 604, height: 476, rx: 32 });
      const A = [352, 214], B = [430, 148];
      el("rect", { x: B[0] - 7, y: B[1], width: 14, height: 70, rx: 7, fill: SKY, stroke: INK, "stroke-width": 3 }, GB);
      const gA = gear(GB, 15, 66, BLUE), gB = gear(GB, 10, 46, "#fff");
      const hous = el("g", {}, GB);
      box(hous, 120, 214, 560, 322, 26, SKY, LIL, 10);
      [[150, 244], [650, 244], [150, 506], [650, 506]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, hous));
      /* the round yellow dial with four marks */
      const DC = [400, 418], dial = el("g", {}, hous);
      el("circle", { r: 92, fill: YEL, stroke: INK, "stroke-width": 3 }, dial);
      const marks = [["low", -108, -54, "end", -150], ["medium", -22, -118, "end", -110], ["high", 22, -118, "start", -70], ["ultra", 108, -54, "start", -30]];
      const labs = marks.map(([s, x, y, an, a]) => {
        el("path", { d: "M66 0 H82", stroke: INK, "stroke-width": 4, "stroke-linecap": "round", transform: `rotate(${a})` }, dial);
        return mono(dial, x, y, s, { "font-size": 22, "text-anchor": an });
      });
      const ptr = el("g", {}, dial);
      el("path", { d: "M0 0 H56", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, ptr);
      el("circle", { r: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, dial);
      el("circle", { r: 5, fill: INK }, dial);
      /* the lilac model selector list */
      const list = el("g", {}, hous);
      box(list, 250, 248, 300, 272, 20, LIL, SOFT, 8);
      const head = el("g", {}, list);
      mono(head, 400, 288, "Model selector", { "font-size": 22 });
      el("path", { d: "M272 306 H528", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, head);
      const chip = el("g", {}, list);
      box(chip, 272, 322, 176, 46, 23, MINT, null, 0, 2.5);
      mono(chip, 360, 352, "Staff Pick", { "font-size": 22 });
      const rows = [236, 188, 212].map((w, i) => el("rect", { x: 272, y: 386 + i * 42, width: w, height: 26, rx: 13, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, list));
      /* swap state: p 0 shows the dial, p 1 shows the list */
      let sw = { from: 0, to: 1, at: 2.6, D: 2.6 }, pressAt = -99;
      const spins = [2.4];
      const P = (e) => sw.from + (sw.to - sw.from) * seg(e, sw.at, sw.at + sw.D);
      button(GB, "Gearbox: swap the dial and the model selector list", () => {
        const cur = P(api.now()), to = sw.to === 1 ? 0 : 1, at = api.mark();
        sw = { from: cur, to, at, D: Math.max(0.6, 2.2 * Math.abs(to - cur)) }; spins.push(at); pressAt = at; api.poke();
      });
      return (e) => {
        sat(GB, 400, 375, 1 - 0.02 * Math.sin(Math.PI * seg(e - pressAt, 0, 0.3)));
        sat(hous, 400, 375, 0.85 + 0.15 * ob(seg(e, 0, 0.55))); op(hous, seg(e, 0, 0.15));
        const steps = [1.0, 1.45, 1.9].reduce((a, t) => a + ob(seg(e, t, t + 0.35)), 0);
        const turn = spins.reduce((a, t) => a + 200 * io(seg(e, t, t + 2.6)), 0) + 12 * steps - 30 * (1 - oc(seg(e, 0.12, 0.9)));
        tf(gA, A[0], A[1], ob(seg(e, 0.12, 0.6)), -40 + turn); op(gA, seg(e, 0.12, 0.22));
        tf(gB, B[0], B[1], ob(seg(e, 0.22, 0.7)), 122 - turn * 1.5); op(gB, seg(e, 0.22, 0.32));
        ptr.setAttribute("transform", `rotate(${-150 + 40 * steps})`);
        labs.forEach((n, i) => { const k = oc(seg(e, 0.55 + i * 0.09, 0.9 + i * 0.09)); op(n, k); n.setAttribute("transform", `translate(0 ${10 * (1 - k)})`); });
        const p = P(e), lift = io(seg(p, 0, 0.5));
        tf(dial, DC[0] + 194 * lift, DC[1] - 268 * lift, ob(seg(e, 0.3, 0.8)) * (1 - 0.3 * lift), -14 * Math.sin(Math.PI * lift)); op(dial, seg(e, 0.3, 0.4));
        tf(list, 250 * (1 - ob(seg(p, 0.3, 0.78))), 0); op(list, seg(p, 0.3, 0.42));
        const kh = oc(seg(p, 0.5, 0.7)); op(head, kh); tf(head, 0, 8 * (1 - kh));
        rows.forEach((n, i) => { const k = oc(seg(p, 0.58 + i * 0.04, 0.76 + i * 0.04)); op(n, k); tf(n, 20 * (1 - k), 0); });
        sat(chip, 360, 345, 0.5 + 0.5 * ob(seg(p, 0.8, 1))); op(chip, seg(p, 0.8, 0.86));
      };
    },
  };

  /* ---- 3. a ferris wheel of five alternatives; tap a car to bring it to the top ---- */
  SC.ferriswheel = {
    dur: 9, still: 9,
    build(svg, api) {
      const C = [400, 214], R = 156, V = 30, T = 1, R0 = 246;
      const CARS = [["Terminal and IDE", "Claude Code"], ["Team of agents", "Munder Difflin"], ["ChatGPT plan", "Codex CLI"], ["Open source", "OpenCode"], ["Editor", "Cursor"]];
      const dbl = (p, d, w) => { el("path", { d, stroke: INK, "stroke-width": w + 6, "stroke-linecap": "round", fill: "none" }, p); el("path", { d, stroke: LIL, "stroke-width": w, "stroke-linecap": "round", fill: "none" }, p); };
      const legs = el("g", {}, svg);
      el("rect", { x: 200, y: 456, width: 400, height: 12, rx: 6, fill: SOFT }, legs);
      dbl(legs, "M330 362 H470", 7); dbl(legs, "M400 214 L286 452", 10); dbl(legs, "M400 214 L514 452", 10);
      const wheel = el("g", {}, svg), spin = el("g", {}, wheel);
      const spoke = (w, c) => { for (let i = 0; i < 10; i++) { const a = (i * 36 * Math.PI) / 180; el("path", { d: `M${C[0]} ${C[1]} L${(C[0] + Math.cos(a) * R).toFixed(1)} ${(C[1] + Math.sin(a) * R).toFixed(1)}`, stroke: c, "stroke-width": w, "stroke-linecap": "round" }, spin); } };
      spoke(9, INK); spoke(4, LIL);
      el("circle", { cx: C[0], cy: C[1], r: 104, fill: "none", stroke: INK, "stroke-width": 10 }, spin);
      el("circle", { cx: C[0], cy: C[1], r: 104, fill: "none", stroke: LIL, "stroke-width": 4 }, spin);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: INK, "stroke-width": 17 }, spin);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: LIL, "stroke-width": 11 }, spin);
      el("circle", { cx: C[0], cy: C[1], r: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, wheel);
      el("circle", { cx: C[0], cy: C[1], r: 8, fill: LIL, stroke: INK, "stroke-width": 2.5 }, wheel);
      const cars = CARS.map(([lab, pick], i) => {
        const g = el("g", {}, svg);
        ring(g, { x: -92, y: 6, width: 184, height: 58, rx: 16 });
        el("path", { d: "M0 0 V16", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        box(g, -82, 14, 164, 42, 13, MINT, LIL, 5);
        mono(g, 0, 41, lab, { "font-size": 15 });
        el("circle", { r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        button(g, `${lab}: ${pick}`, () => pickCar(i));
        return g;
      });
      const card = el("g", {}, svg);
      ring(card, { x: 228, y: 462, width: 344, height: 116, rx: 26 });
      box(card, 240, 486, 320, 80, 20, SKY, LIL, 8);
      el("path", { d: "M386 488 L400 470 L414 488", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, card);
      const pickT = mono(card, 400, 536, "", { "font-size": 28 });
      /* rotation: the default run turns slowly, then settles with Terminal and IDE on top */
      const spinRaw = (from, s) => from + V * (s < T ? (s * s) / (2 * T) : s - T / 2);
      const def = (e) => {
        if (e < 3.8) return spinRaw(R0, Math.max(0, e - 0.5));
        const x = seg(e, 3.8, 5.8);
        return spinRaw(R0, 3.3) + 33 * x * (2 - x) - 3 * io(seg(e, 5.8, 6.2));
      };
      let ov = null, live = null;
      const state = (e) => {
        if (!ov || e < ov.at) return { rot: def(e), v: ob(seg(e, 5.9, 6.4)), lo: oc(seg(e, 6.35, 6.8)), pick: 0, land: 5.8, top: e >= 6.2 };
        const s = e - ov.at;
        if (ov.kind === "spin") { const v = ov.v0 * (1 - io(seg(s, 0, 0.35))); return { rot: api.calm ? ov.from : spinRaw(ov.from, s), v, lo: v, pick: ov.p0, land: -99, top: false }; }
        const arr = ov.at + ov.D, rot = ov.from + (ov.to + 3 - ov.from) * io(seg(e, ov.at, ov.at + ov.D * 0.85)) - 3 * io(seg(e, ov.at + ov.D * 0.85, arr));
        if (e < arr - 0.05) { const v = ov.v0 * (1 - io(seg(s, 0, 0.3))); return { rot, v, lo: v, pick: ov.p0, land: -99, top: false }; }
        return { rot, v: ob(seg(e, arr - 0.05, arr + 0.45)), lo: oc(seg(e, arr + 0.3, arr + 0.7)), pick: ov.car, land: arr - ov.D * 0.15, top: true };
      };
      const pickCar = (i) => {
        const st = state(api.now());
        if (st.top && st.pick === i) return;
        const from = st.rot;
        let to = from + ((((-72 * i - from) % 360) + 360) % 360);
        if (to - from < 8) to += 360;
        ov = { kind: "stop", at: api.mark(), from, to, car: i, D: 1 + (to - from) / 220, v0: cl(st.v), p0: st.pick };
        api.poke();
      };
      button(card, "Start the wheel again", () => {
        const st = state(api.now());
        if (st.v < 0.5) return;
        ov = { kind: "spin", at: api.mark(), from: st.rot, v0: cl(st.v), p0: st.pick };
        api.poke();
      });
      return (e) => {
        const st = state(e), kl = oc(seg(e, 0, 0.45));
        tf(legs, 0, 40 * (1 - kl)); op(legs, kl);
        const sw = 0.6 + 0.4 * ob(seg(e, 0.1, 0.65));
        sat(wheel, C[0], C[1], sw); op(wheel, seg(e, 0.1, 0.25));
        spin.setAttribute("transform", `rotate(${(st.rot - 90).toFixed(2)} ${C[0]} ${C[1]})`);
        const ds = e - st.land, tilt = ds > 0 ? 5 * Math.sin(ds * 8.2) * Math.exp(-2.8 * ds) : 0;
        cars.forEach((g, i) => {
          const a = ((st.rot + 72 * i - 90) * Math.PI) / 180, k = ob(seg(e, 0.55 + i * 0.09, 0.95 + i * 0.09));
          tf(g, (C[0] + Math.cos(a) * R * sw).toFixed(1), (C[1] + Math.sin(a) * R * sw).toFixed(1), k, tilt); op(g, seg(e, 0.55 + i * 0.09, 0.65 + i * 0.09));
        });
        tf(card, 0, 30 * (1 - st.v)); op(card, st.v);
        pickT.textContent = CARS[st.pick][1]; op(pickT, st.lo); pickT.setAttribute("transform", `translate(0 ${6 * (1 - st.lo)})`);
        const on = st.v > 0.5;
        if (on !== live) { live = on; card.setAttribute("tabindex", on ? "0" : "-1"); card.setAttribute("aria-hidden", on ? "false" : "true"); card.style.pointerEvents = on ? "" : "none"; }
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      box(pill, 397, 36, 166, 38, 19, LIL, null, 0, 2.5);
      mono(pill, 480, 61, "Alternatives", { "font-size": 18 });
      const title = txt(svg, 480, 156, "Amp alternatives", { "text-anchor": "middle", "font-size": 78, "font-weight": 700 });
      const line = txt(svg, 480, 210, "5 picks for the coding agent", { "text-anchor": "middle", "font-size": 28, "font-weight": 600 });
      const date = mono(svg, 480, 248, "Checked 19 Nov 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });
      const NAMES = ["Claude Code", "Munder Difflin", "Codex CLI", "OpenCode", "Cursor"];
      const ws = NAMES.map((s) => s.length * 12 + 40), gap = 18;
      let x = (960 - ws.reduce((a, b) => a + b, 0) - gap * 4) / 2;
      const xs = ws.map((w) => { const v = x; x += w + gap; return v; }), cx = xs.map((v, i) => v + ws[i] / 2);
      const wire = el("path", { d: `M480 336 V378 M${cx[0]} 404 V378 H${cx[4]} V404 ${cx.slice(1, 4).map((c) => `M${c} 378 V404`).join(" ")}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const amp = el("g", {}, svg);
      box(amp, 410, 282, 140, 54, 16, SOFT, null, 0, 2.5);
      mono(amp, 480, 317, "Amp", { "font-size": 24, fill: MUTE });
      const tiles = NAMES.map((s, i) => { const g = el("g", {}, svg); box(g, xs[i], 404, ws[i], 56, 16, MINT, LIL, 6, 2.5); mono(g, cx[i], 439, s, { "font-size": 20 }); return g; });
      return (e) => {
        sat(pill, 480, 55, 0.6 + 0.4 * ob(seg(e, 0, 0.45))); op(pill, seg(e, 0, 0.12));
        [title, line].forEach((n, i) => { const k = oc(seg(e, 0.1 + i * 0.1, 0.6 + i * 0.1)); op(n, k); tf(n, 0, 20 * (1 - k)); });
        tf(amp, 0, -24 * (1 - ob(seg(e, 0.6, 1.1)))); op(amp, seg(e, 0.6, 0.75));
        op(wire, seg(e, 1.0, 1.4));
        tiles.forEach((g, i) => { const t = 1.3 + i * 0.11; tf(g, -40 * (1 - ob(seg(e, t, t + 0.55))), 0); op(g, seg(e, t, t + 0.15)); });
        const kd = oc(seg(e, 2.3, 2.8)); op(date, kd); tf(date, 0, 10 * (1 - kd));
      };
    },
  };

  /* ---- player: plays once in view, holds a calm final frame, replays when it comes back into view ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let e = 0, last = 0, raf = 0, seen = false, touched = false, draw = () => {};
    const frame = () => draw(calm ? sc.still : e);
    const tick = () => { cancelAnimationFrame(raf); const n = performance.now() / 1000; e += cl(n - last, 0, 0.1); last = n; frame(); if (seen && !calm) raf = requestAnimationFrame(tick); };
    const api = {
      calm,
      now: () => (calm ? sc.still : e),
      mark: () => { touched = true; return calm ? sc.still - 100 : e; },
      poke: () => (calm || !seen ? frame() : tick()),
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed); return; }
    new IntersectionObserver(([en]) => {
      seen = en.isIntersecting;
      if (seen) {
        if (!touched && e > sc.dur + 2) e = 0;
        last = performance.now() / 1000; tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 28px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
