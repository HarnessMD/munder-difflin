/* Bright coded scenes for "goose alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* a dashed focus ring plus a clear hit area, both around x, y, w, h */
  const ring = (g, x, y, w, h, r = 32) => {
    el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 10", class: "mg-ring" }, g);
  };

  const SC = {};

  /* ---- 1. a birdhouse nameplate flips from block/goose to Agentic AI Foundation ---- */
  SC.birdhouse = {
    w: 1600, h: 1200, dur: 8, still: 8,
    build(svg, api) {
      const ground = el("ellipse", { cx: 800, cy: 1130, rx: 400, ry: 30, fill: SOFT }, svg);
      const hit = el("g", {}, svg);
      ring(hit, 430, 34, 740, 940, 40);
      const pole = el("rect", { x: 766, y: 620, width: 68, height: 510, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, hit);
      const house = el("g", {}, hit);
      el("path", { d: "M-280 -380 H280 V0 H-280 Z M-340 -360 L0 -580 L340 -360 Z", transform: "translate(18 18)", fill: LIL }, house);
      el("rect", { x: -280, y: -380, width: 560, height: 380, rx: 16, fill: SKY, stroke: INK, "stroke-width": 3 }, house);
      el("path", { d: "M-340 -360 L0 -580 L340 -360 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, house);
      el("path", { d: "M-250 -380 H250", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, house);
      const door = el("g", {}, house);
      el("circle", { cx: 0, cy: 0, r: 72, fill: SOFT, stroke: INK, "stroke-width": 3 }, door);
      el("circle", { cx: 0, cy: 112, r: 16, fill: MINT, stroke: INK, "stroke-width": 3 }, door);
      const tag = el("g", {}, hit);
      el("path", { d: "M0 0 V62", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, tag);
      el("rect", { x: -240, y: 58, width: 480, height: 86, rx: 22, fill: LIL, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 0, cy: 74, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 0, 120, "Linux Foundation", 40);
      const plate = el("g", {}, hit);
      el("rect", { x: -308, y: -32, width: 640, height: 88, rx: 20, fill: LIL }, plate);
      const face = el("g", {}, plate);
      el("rect", { x: -320, y: -44, width: 640, height: 88, rx: 20, fill: YEL, stroke: INK, "stroke-width": 3 }, face);
      const word = mono(face, 0, 15, "block/goose", 46);
      const swing = (g) => (g <= 0 ? -95 : g >= 1 ? 0 : -95 * Math.exp(-5 * g) * Math.cos(2 * Math.PI * 1.6 * g));
      let rw = -99, f0 = 0, g0 = 0, lastF = 0, lastG = 0, settled = false;
      button(hit, "Flip the nameplate back and play it again", () => { rw = api.now(); f0 = lastF; g0 = lastG; settled = true; api.seek(1.3); });
      return (t, now) => {
        const E = (a, b) => (settled ? 1 : ob(seg(t, a, b)));
        ground.setAttribute("opacity", settled ? 1 : oc(seg(t, 0, 0.3)));
        const pk = E(0.1, 0.6);
        pole.setAttribute("transform", `translate(0 1130) scale(1 ${Math.max(0.001, pk)}) translate(0 -1130)`);
        tf(house, 800, 640 - 760 * (1 - E(0.2, 0.85)));
        house.setAttribute("opacity", settled ? 1 : seg(t, 0.2, 0.3));
        tf(door, 0, -230, Math.max(0.001, E(0.5, 0.95)));
        tf(plate, 800, 744, Math.max(0.001, E(0.6, 1.1)));
        let F = io(seg(t, 2.2, 3.0)), G = seg(t, 3.4, 5.8), ang = swing(G), op = seg(G, 0, 0.1);
        const r = now - rw < 0.7 ? io(seg(now - rw, 0, 0.7)) : 1;
        if (r < 1) { F = f0 * (1 - r); ang = swing(g0) + (-95 - swing(g0)) * r; op = seg(g0, 0, 0.1) * (1 - seg(r, 0.35, 1)); G = g0 * (1 - r); }
        lastF = F; lastG = G;
        const pop = r < 1 ? 0 : 0.08 * bump(t, 3.0, 3.4);
        face.setAttribute("transform", `scale(${1 + pop} ${Math.max(0.001, Math.abs(Math.cos(Math.PI * F))) * (1 + pop)})`);
        word.textContent = F < 0.5 ? "block/goose" : "Agentic AI Foundation";
        word.setAttribute("font-size", F < 0.5 ? 46 : 42);
        tag.setAttribute("transform", `translate(800 788) rotate(${ang})`);
        tag.setAttribute("opacity", op);
      };
    },
  };

  /* ---- 2. a tent hops round three pegs, a flag following ---- */
  SC.tent = {
    w: 1600, h: 1200, dur: 8, still: 8,
    build(svg, api) {
      const PX = [400, 800, 1200], NAMES = ["local", "Docker", "SSH"], TOP = 700, GY = 780;
      const HOPS = [[1.8, 2.5, 1, 2, 200], [2.8, 3.8, 2, 0, 300], [4.1, 4.8, 0, 1, 200]];
      const LAND = [[1.15, 1], [2.5, 2], [3.8, 0], [4.8, 1]];
      const pegs = PX.map((x) => {
        const g = el("g", {}, svg);
        el("path", { d: "M-22 28 V100 L0 128 L22 100 V28 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("rect", { x: -74, y: 0, width: 148, height: 34, rx: 12, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        return g;
      });
      const ground = el("rect", { x: 70, y: GY, width: 1460, height: 60, rx: 30, fill: SOFT }, svg);
      const labels = PX.map((x, i) => {
        const g = el("g", {}, svg), w = NAMES[i].length * 24 + 64;
        el("rect", { x: -w / 2, y: -46, width: w, height: 70, rx: 35, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, 0, 2, NAMES[i], 40);
        return g;
      });
      const flag = el("g", {}, svg);
      el("path", { d: "M0 0 V-180", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, flag);
      el("path", { d: "M0 -180 H96 L74 -148 L96 -116 H0 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, flag);
      const tent = el("g", {}, svg), body = el("g", {}, tent);
      ring(tent, -180, -410, 520, 436, 36);
      el("path", { d: "M-150 0 L0 -250 L150 0 Z", transform: "translate(16 4)", fill: LIL }, body);
      el("path", { d: "M0 -250 V-372", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, body);
      const pen = el("g", {}, tent);
      el("path", { d: "M0 0 H272 L312 36 L272 72 H0 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pen);
      mono(pen, 18, 47, "Runs anywhere", 30, { "text-anchor": "start" });
      el("path", { d: "M-150 0 L0 -250 L150 0 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
      el("path", { d: "M-56 0 L0 -120 L56 0 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
      el("path", { d: "M0 -120 L-56 0 L-22 0 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, body);
      let settled = false;
      button(tent, "Send the tent hopping round the pegs again", () => { settled = true; api.seek(1.6); });
      const pos = (t) => {
        let x = PX[1], y = 0, tilt = 0, air = 0, at = 1;
        for (const [a, b, f, to, H] of HOPS) {
          if (t >= b) { x = PX[to]; at = to; continue; }
          if (t > a) { const k = seg(t, a, b); x = PX[f] + (PX[to] - PX[f]) * io(k); y = -H * 4 * k * (1 - k); tilt = Math.sign(PX[to] - PX[f]) * 9 * Math.sin(Math.PI * k); air = 1; at = -1; }
          break;
        }
        return { x, y, tilt, air, at };
      };
      const dip = (i, t) => LAND.reduce((s, [L, p]) => s + (p === i ? 10 * bump(t, L, L + 0.3) : 0), 0);
      return (t) => {
        const E = (a, b) => (settled ? 1 : ob(seg(t, a, b)));
        ground.setAttribute("opacity", settled ? 1 : oc(seg(t, 0, 0.3)));
        pegs.forEach((g, i) => { g.setAttribute("transform", `translate(${PX[i]} ${TOP + dip(i, t)}) scale(${Math.max(0.001, E(0.1 + i * 0.1, 0.55 + i * 0.1))})`); });
        labels.forEach((g, i) => { const k = settled ? 1 : oc(seg(t, 0.4 + i * 0.1, 0.8 + i * 0.1)); g.setAttribute("transform", `translate(${PX[i]} ${916 + 30 * (1 - k)})`); g.setAttribute("opacity", k); });
        const p = pos(t);
        let y = p.y, sq = 0;
        if (!settled) { const k = seg(t, 0.7, 1.15); if (t < 1.15) y = -760 * (1 - k * k); sq += 0.14 * bump(t, 1.15, 1.45); }
        for (const [a, b] of HOPS) sq += 0.12 * bump(t, a - 0.2, a) + 0.14 * bump(t, b, b + 0.3);
        if (p.at >= 0) y += dip(p.at, t);
        tent.setAttribute("transform", `translate(${p.x} ${TOP + y}) rotate(${p.tilt})`);
        tent.setAttribute("opacity", settled ? 1 : seg(t, 0.7, 0.8));
        body.setAttribute("transform", `scale(${1 + sq * 0.5} ${1 - sq})`);
        pen.setAttribute("transform", `translate(0 ${-372 * (1 - sq)}) rotate(${p.air * 5 * Math.sin(t * 18)}) scale(${Math.max(0.001, E(1.3, 1.8))} 1)`);
        const f = pos(t - 0.3);
        flag.setAttribute("transform", `translate(${f.x - 240} ${GY + f.y * 0.7}) rotate(${f.tilt * 0.6}) scale(1 ${Math.max(0.001, E(1.15, 1.55))})`);
      };
    },
  };

  /* ---- 3. binoculars sweep five cards; the focused card shows its pick ---- */
  SC.binoculars = {
    w: 1600, h: 1200, dur: 9, still: 9,
    build(svg, api) {
      const CX = [230, 515, 800, 1085, 1370], CY = 680, BY = 300, LY = 930;
      const WORDS = [["General", "agent"], ["Team of", "agents"], ["Coding", "agent"], ["Control", "center"], ["ChatGPT", "plan"]];
      const PICK = ["Hermes Agent", "Munder Difflin", "OpenCode", "OpenHands", "Codex CLI"];
      const ARR = [1.5, 2.7, 3.9, 5.1, 6.3];
      const cone = el("path", { fill: SOFT }, svg);
      const cards = CX.map((x, i) => {
        const g = el("g", {}, svg), c = el("g", {}, g);
        el("rect", { x: -118, y: -108, width: 260, height: 240, rx: 24, fill: SOFT }, c);
        el("rect", { x: -130, y: -120, width: 260, height: 240, rx: 24, fill: LIL, stroke: INK, "stroke-width": 3 }, c);
        mono(c, 0, -8, WORDS[i][0], 40); mono(c, 0, 46, WORDS[i][1], 40);
        ring(c, -146, -136, 292, 272, 32);
        button(g, `${WORDS[i].join(" ")}: ${PICK[i]}`, () => pick(i));
        return { g, c };
      });
      const label = el("g", {}, svg), lab = el("g", {}, label);
      el("rect", { x: -200, y: -40, width: 400, height: 80, rx: 40, fill: YEL, stroke: INK, "stroke-width": 3 }, lab);
      const notch = el("g", {}, lab);
      el("path", { d: "M-18 -39 L0 -60 L18 -39", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, notch);
      el("path", { d: "M-16 -38 H16", stroke: YEL, "stroke-width": 5 }, notch);
      const word = mono(lab, 0, 14, "", 40);
      const bin = el("g", {}, svg), bo = el("g", {}, bin);
      ring(bo, -176, -140, 352, 262, 36);
      [-150, 30].forEach((x) => el("rect", { x: x + 14, y: -86, width: 120, height: 196, rx: 36, fill: LIL }, bo));
      el("rect", { x: -44, y: -70, width: 88, height: 54, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, bo);
      el("rect", { x: -24, y: -112, width: 48, height: 40, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, bo);
      el("path", { d: "M-8 -104 V-80 M8 -104 V-80", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, bo);
      [-1, 1].forEach((s) => {
        el("rect", { x: s < 0 ? -150 : 30, y: -100, width: 120, height: 196, rx: 36, fill: SKY, stroke: INK, "stroke-width": 3 }, bo);
        el("circle", { cx: s * 90, cy: 44, r: 52, fill: BLUE, stroke: INK, "stroke-width": 3 }, bo);
        el("circle", { cx: s * 90, cy: 44, r: 34, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, bo);
        el("circle", { cx: s * 90 - 11, cy: 33, r: 8, fill: "#fff" }, bo);
      });
      let settled = false, picked = -1, pt0 = 0, px0 = 0, prevF = -1, gt0 = -99, gx0 = 0, leaveF = -1, lastBx = CX[0], lastF = -1;
      const pick = (i) => { prevF = lastF; px0 = lastBx; pt0 = api.now(); picked = i; settled = true; api.poke(1.2); };
      button(bin, "Send the binoculars sweeping again", () => { leaveF = lastF; gx0 = lastBx; gt0 = api.now(); picked = -1; settled = true; api.seek(ARR[0] - 0.6); });
      const tlx = (t) => {
        for (let i = 0; i < 4; i++) { const k = seg(t, ARR[i] + 0.6, ARR[i + 1]); if (k < 1) return { x: CX[i] + (CX[i + 1] - CX[i]) * io(k), m: k > 0 ? Math.sin(Math.PI * k) : 0, d: 1 }; }
        return { x: CX[4], m: 0, d: 1 };
      };
      return (t, now) => {
        const ks = [0, 0, 0, 0, 0];
        let bx, m = 0, d = 1, F, lp;
        if (picked >= 0) {
          const e = now - pt0, k = io(seg(e, 0, 0.55));
          bx = px0 + (CX[picked] - px0) * k; m = Math.sin(Math.PI * k); d = Math.sign(CX[picked] - px0) || 1;
          F = e >= 0.3 || prevF < 0 ? picked : prevF;
          ks[picked] = ob(seg(e, 0.3, 0.65));
          if (prevF >= 0 && prevF !== picked) ks[prevF] = 1 - oc(seg(e, 0, 0.25));
          lp = seg(e, 0.3, 0.6);
        } else {
          const tl = tlx(t), g = now - gt0 < 0.6 ? io(seg(now - gt0, 0, 0.6)) : 1;
          bx = g < 1 ? gx0 + (tl.x - gx0) * g : tl.x; m = g < 1 ? Math.sin(Math.PI * g) : tl.m; d = g < 1 ? -1 : 1;
          const Ft = ARR.reduce((a, s, i) => (t >= s ? i : a), -1);
          F = Ft >= 0 ? Ft : leaveF;
          for (let i = 0; i <= Ft; i++) ks[i] = ob(seg(t, ARR[i], ARR[i] + 0.35)) * (i < Ft ? 1 - oc(seg(t, ARR[i] + 0.6, ARR[i] + 0.85)) : 1);
          if (Ft < 0 && leaveF >= 0) ks[leaveF] = 1 - oc(seg(now - gt0, 0, 0.25));
          lp = Ft >= 0 ? seg(t, ARR[Ft], ARR[Ft] + 0.3) : 1;
        }
        lastBx = bx; lastF = F;
        cards.forEach(({ g, c }, i) => {
          const k = settled ? 1 : ob(seg(t, 0.1 + i * 0.1, 0.6 + i * 0.1));
          g.setAttribute("transform", `translate(${CX[i]} ${CY + 80 * (1 - k)})`);
          g.setAttribute("opacity", settled ? 1 : seg(t, 0.1 + i * 0.1, 0.3 + i * 0.1));
          tf(c, 0, -28 * ks[i], 1 + 0.08 * ks[i]);
        });
        const be = settled ? 1 : ob(seg(t, 0.7, 1.3));
        tf(bin, bx, BY - 560 * (1 - be) - 18 * m, 1, d * 4 * m);
        bin.setAttribute("opacity", settled ? 1 : seg(t, 0.7, 0.8));
        cone.setAttribute("d", `M${bx - 120} ${BY + 80} H${bx + 120} L${bx + 160} 540 H${bx - 160} Z`);
        cone.setAttribute("opacity", settled ? 1 : oc(seg(t, 1.0, 1.4)));
        word.textContent = F >= 0 ? PICK[F] : "";
        label.setAttribute("opacity", F < 0 ? 0 : settled ? 1 : oc(seg(t, ARR[0], ARR[0] + 0.3)));
        const lx = cl(bx, 270, 1330); tf(label, lx, LY); notch.setAttribute("transform", `translate(${bx - lx} 0)`);
        lab.setAttribute("transform", `scale(${1 + 0.12 * Math.sin(Math.PI * lp)})`);
      };
    },
  };

  /* ---- title card, 16 by 9: five names slide out of a birdhouse ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 0, y: 0, width: 236, height: 56, rx: 28, fill: LIL, stroke: INK, "stroke-width": 3 }, pill);
      mono(pill, 118, 38, "Comparisons", 28);
      const t1 = txt(svg, 96, 300, "goose", { "font-size": 120, "font-weight": 700 });
      const bar = el("path", { d: "M104 462 H560", stroke: YEL, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      const t2 = txt(svg, 96, 430, "alternatives", { "font-size": 120, "font-weight": 700 });
      const t3 = txt(svg, 100, 552, "5 open source AI agents", { "font-size": 46, "font-weight": 500 });
      const t4 = txt(svg, 100, 618, "Checked 20 Nov 2026", { "font-family": MONO, "font-size": 30, "font-weight": 500, fill: MUTE });
      el("ellipse", { cx: 1330, cy: 868, rx: 130, ry: 16, fill: SOFT }, svg);
      const post = el("path", { d: "M1330 470 V866", stroke: INK, "stroke-width": 8, "stroke-linecap": "round" }, svg);
      const house = el("g", {}, svg);
      el("path", { d: "M1200 252 H1460 V470 H1200 Z M1165 258 L1330 108 L1495 258 Z", transform: "translate(14 14)", fill: LIL }, house);
      el("rect", { x: 1200, y: 240, width: 260, height: 230, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, house);
      el("path", { d: "M1165 258 L1330 108 L1495 258 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, house);
      el("circle", { cx: 1330, cy: 345, r: 48, fill: SOFT, stroke: INK, "stroke-width": 3 }, house);
      el("circle", { cx: 1330, cy: 425, r: 12, fill: MINT, stroke: INK, "stroke-width": 3 }, house);
      const NAMES = ["Hermes Agent", "Munder Difflin", "OpenCode", "OpenHands", "Codex CLI"], COLS = [LIL, YEL, MINT, SKY, BLUE];
      const FAN = [[1030, 500, 8], [1005, 576, 4], [995, 652, 0], [1005, 728, -4], [1030, 804, -8]];
      const cards = NAMES.map((n, i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -147, y: -23, width: 310, height: 62, rx: 16, fill: SOFT }, g);
        el("rect", { x: -155, y: -31, width: 310, height: 62, rx: 16, fill: COLS[i], stroke: INK, "stroke-width": 3 }, g);
        mono(g, 0, 10, n, 28);
        return g;
      });
      return (t) => {
        const up = (n, a, b, dy = 30) => { const k = oc(seg(t, a, b)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${dy * (1 - k)})`); };
        pill.setAttribute("transform", `translate(100 128) scale(${Math.max(0.001, ob(seg(t, 0.1, 0.5)))})`);
        up(t1, 0.2, 0.7); up(t2, 0.3, 0.8); up(t3, 0.5, 1.0); up(t4, 3.7, 4.2, 20);
        bar.setAttribute("transform", `translate(104 0) scale(${Math.max(0.001, oc(seg(t, 0.45, 0.95)))} 1) translate(-104 0)`);
        post.setAttribute("transform", `translate(0 866) scale(1 ${Math.max(0.001, ob(seg(t, 0.3, 0.7)))}) translate(0 -866)`);
        const hk = ob(seg(t, 0.4, 1.0));
        house.setAttribute("transform", `translate(0 ${-520 * (1 - hk)})`); house.setAttribute("opacity", seg(t, 0.4, 0.5));
        cards.forEach((g, i) => {
          const k = seg(t, 1.1 + i * 0.4, 1.85 + i * 0.4), p = oc(k), [fx, fy, fr] = FAN[i];
          g.setAttribute("transform", `translate(${1330 + (fx - 1330) * p} ${345 + (fy - 345) * p - 90 * Math.sin(Math.PI * k)}) rotate(${fr * p}) scale(${Math.max(0.001, 0.2 + 0.8 * ob(k))})`);
          g.setAttribute("opacity", seg(k, 0, 0.15));
        });
      };
    },
  };

  /* ---- player: plays once in view, then rests on the calm final frame ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, until = 0, paused = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    const T = () => cl(clock() + off, 0, sc.dur);
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? sc.still : T(), now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && (clock() + off < sc.dur || clock() < until)) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; until = 0; tick(); }, poke: (d = 1) => { held = false; until = clock() + d; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { off = paused - clock(); tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { paused = T(); cancelAnimationFrame(raf); }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
