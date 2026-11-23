/* Bright coded scenes for "What is Shirudo?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, cx, cy, s, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`);
  const ink = (a = {}) => Object.assign({ stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, a);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (g, x, y, width, height, rx) => el("rect", { x, y, width, height, rx, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 3, "stroke-dasharray": "8 10" }, g);
  const DROP = "M0 -30 C8 -16 18 -6 18 6 A18 18 0 0 1 -18 6 C-18 -6 -8 -16 0 -30 Z";

  const SC = {};

  /* ---- 1. a yellow umbrella opens over a running toy train ---- */
  SC.umbrella = {
    dur: 9, still: 8.5,
    build(svg, api) {
      const CX = 700, TY = 930, RX = 500, RY = 150, N = 720;
      const pts = [], tab = [0];
      for (let i = 0; i <= N; i++) { const f = (i / N) * 2 * Math.PI; pts.push([CX - RX * Math.cos(f), TY + RY * Math.sin(f)]); if (i) tab.push(tab[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); }
      const L = tab[N];
      const at = (s) => { s = ((s % L) + L) % L; let lo = 0, hi = N; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab[m] <= s) lo = m; else hi = m; } const k = (s - tab[lo]) / (tab[hi] - tab[lo] || 1), a = pts[lo], b = pts[hi]; return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), dx: b[0] - a[0], dy: b[1] - a[1] }; };

      const trk = el("g", {}, svg);
      el("ellipse", { cx: CX, cy: TY + 14, rx: RX, ry: RY, fill: "none", stroke: LIL, "stroke-width": 60 }, trk);
      el("ellipse", { cx: CX, cy: TY, rx: RX, ry: RY, fill: "none", stroke: INK, "stroke-width": 60 }, trk);
      el("ellipse", { cx: CX, cy: TY, rx: RX, ry: RY, fill: "none", stroke: MINT, "stroke-width": 54 }, trk);
      el("ellipse", { cx: CX, cy: TY, rx: RX, ry: RY, fill: "none", stroke: "#fff", "stroke-width": 30, "stroke-dasharray": "7 30" }, trk);
      const back = el("g", {}, svg);
      const pole = el("g", {}, svg);
      el("ellipse", { cx: CX, cy: TY, rx: 64, ry: 20, fill: SOFT, ...ink() }, pole);
      el("rect", { x: CX - 9, y: 200, width: 18, height: TY - 200, rx: 9, fill: SOFT, ...ink() }, pole);

      const hit = el("g", {}, svg);
      ring(hit, 140, 160, 1120, 320, 30);
      const can = el("g", {}, hit);
      const canSh = el("path", { fill: LIL }, can);
      const canP = el("path", { fill: YEL, ...ink() }, can);
      const ribs = el("path", { fill: "none", ...ink({ "stroke-linecap": "round" }) }, can);
      const fin = el("circle", { r: 11, fill: YEL, ...ink() }, can);
      const plate = el("g", {}, can);
      el("rect", { x: -125, y: -40, width: 250, height: 80, rx: 18, fill: "#fff", ...ink() }, plate);
      mono(plate, 0, 17, "Shield", 48, { "text-anchor": "middle" });
      const geo = (k) => ({ w: 46 + 494 * k, E: 560 - 120 * k, T: 230 - 30 * k });
      const shape = ({ w, E, T }, k, ox = 0, oy = 0) => {
        const n = 5, dip = 34 * cl(k, 0, 1.2);
        let d = `M${CX - w + ox} ${E + oy} Q${CX + ox} ${2 * T - E + oy} ${CX + w + ox} ${E + oy}`;
        for (let i = n; i > 0; i--) { const x0 = CX - w + (2 * w * i) / n, x1 = CX - w + (2 * w * (i - 1)) / n; d += ` Q${(x0 + x1) / 2 + ox} ${E - dip + oy} ${x1 + ox} ${E + oy}`; }
        return d + " Z";
      };
      const front = el("g", {}, svg);

      const mkCar = (engine) => {
        const g = el("g", {}), body = el("g", {}, g); let lab = null;
        if (engine) {
          el("rect", { x: 30, y: -102, width: 26, height: 40, rx: 5, fill: BLUE, ...ink() }, body);
          el("rect", { x: -80, y: -116, width: 66, height: 56, rx: 10, fill: BLUE, ...ink() }, body);
          el("rect", { x: -68, y: -104, width: 40, height: 26, rx: 6, fill: SKY, ...ink() }, body);
        }
        el("rect", { x: -80, y: -70, width: 160, height: 56, rx: 12, fill: BLUE, ...ink() }, body);
        if (engine) el("circle", { cx: 78, cy: -44, r: 9, fill: YEL, ...ink() }, body);
        else { el("rect", { x: -68, y: -64, width: 136, height: 42, rx: 9, fill: "#fff", ...ink({ "stroke-width": 2.5 }) }, body); lab = el("g", {}, body); mono(lab, 0, -33, "Service", 28, { "text-anchor": "middle" }); }
        [-46, 46].forEach((x) => el("circle", { cx: x, cy: -12, r: 15, fill: "#fff", ...ink() }, body));
        return { g, body, lab };
      };
      const cars = [mkCar(true), mkCar(false)];
      const V = L / 6.4, GAP = 172, S0 = L / 4 + GAP - V * 8.5;
      const place = (c, s, k) => {
        const p = at(s), len = Math.hypot(p.dx, p.dy) || 1, ux = p.dx / len;
        const d = 0.8 + (0.2 * (p.y - (TY - RY))) / (2 * RY), sx = (ux < 0 ? -1 : 1) * Math.max(0.24, Math.abs(ux));
        (p.y > TY ? front : back).appendChild(c.g);
        tf(c.g, p.x, p.y + 6, d * k);
        c.body.setAttribute("transform", `scale(${sx} 1)`);
        if (c.lab) c.lab.setAttribute("transform", `scale(${sx < 0 ? -1 : 1} 1)`);
      };

      const sign = el("g", {}, svg);
      el("rect", { x: 1402, y: 700, width: 16, height: 210, rx: 8, fill: SOFT, ...ink() }, sign);
      el("rect", { x: 1272, y: 612, width: 300, height: 100, rx: 18, fill: LIL }, sign);
      el("rect", { x: 1260, y: 600, width: 300, height: 100, rx: 18, fill: SOFT, ...ink() }, sign);
      const signT = mono(sign, 1410, 664, "No restart", 38, { "text-anchor": "middle" });

      const leg = el("g", {}, svg);
      el("rect", { x: 1272, y: 102, width: 276, height: 76, rx: 38, fill: LIL }, leg);
      el("rect", { x: 1260, y: 90, width: 276, height: 76, rx: 38, fill: "#fff", ...ink() }, leg);
      el("path", { d: DROP, fill: SKY, ...ink(), transform: "translate(1310 130) scale(0.8)" }, leg);
      mono(leg, 1344, 141, "exploit", 36);

      const DX = [430, 930, 600, 1060, 330, 780, 520, 990, 660, 860, 400, 1120, 560, 760];
      const drops = [];
      for (let j = 0; 1.8 + j * 0.22 < 7.95; j++) drops.push({ s: 1.8 + j * 0.22, x: DX[j % DX.length], n: el("path", { d: DROP, fill: SKY, ...ink() }, svg) });

      let tap = -99;
      button(hit, "Umbrella: fold it and open it again", () => { if (api.now() - tap > 1.7) { tap = api.now(); api.burst(1.9); } });

      return (t, now) => {
        const a = seg(t, 0.15, 0.75); trk.setAttribute("opacity", seg(t, 0.15, 0.3)); about(trk, CX, TY, 0.85 + 0.15 * ob(a));
        const pk = ob(seg(t, 0.4, 1.0)); pole.setAttribute("opacity", seg(t, 0.4, 0.55)); pole.setAttribute("transform", `translate(0 ${80 * (1 - pk)})`);
        can.setAttribute("opacity", seg(t, 0.4, 0.55)); can.setAttribute("transform", `translate(0 ${80 * (1 - pk)})`);
        const u = now - tap; let m = 1;
        if (u >= 0 && u < 1.6) m = u < 0.9 ? 1 - io(seg(u, 0, 0.5)) : ob(seg(u, 0.9, 1.6));
        const k = ob(seg(t, 2.2, 3.0)) * m, g = geo(k);
        canP.setAttribute("d", shape(g, k)); canSh.setAttribute("d", shape(g, k, 12, 14));
        let rd = "";
        for (let i = 1; i < 5; i++) { const x = CX - g.w + (2 * g.w * i) / 5; rd += `M${CX} ${g.T} Q${CX + (x - CX) * 0.9} ${g.T + (g.E - g.T) * 0.25} ${x} ${g.E} `; }
        ribs.setAttribute("d", rd); tf(fin, CX, g.T - 6);
        tf(plate, CX, g.E - 70, ob(seg(t, 2.9, 3.4)) * seg(k, 0.75, 0.95));
        const tk = ob(seg(t, 0.6, 1.1)), s = S0 + V * t;
        place(cars[0], s, tk); place(cars[1], s - GAP, tk);
        const sk = ob(seg(t, 1.0, 1.5)); sign.setAttribute("opacity", seg(t, 1.0, 1.15)); sign.setAttribute("transform", `translate(0 ${-90 * (1 - sk)})`);
        about(signT, 1410, 650, ob(seg(t, 1.4, 1.8)));
        about(leg, 1400, 128, ob(seg(t, 1.5, 1.9)));
        const gate = seg(k, 0.7, 0.95);
        drops.forEach((d) => {
          const q = t - d.s;
          if (q < 0 || q > 1.4 || Math.abs(d.x - CX) > g.w - 24) { d.n.setAttribute("transform", "scale(0)"); return; }
          const r = (d.x - CX) / g.w, ys = g.E - (g.E - g.T) * (1 - r * r) - 24;
          let x = d.x, y, sc = 1, rot = 0;
          if (q < 0.9) { const p = q / 0.9; y = -40 + (ys + 40) * p * p; }
          else { const w = (q - 0.9) / 0.6, dir = d.x < CX ? -1 : 1; x += dir * 100 * w; y = ys - 110 * Math.sin(Math.PI * w * 0.85); sc = 1 - w * w; rot = dir * 70 * w; }
          tf(d.n, x, y, sc * (q < 0.9 ? 1 : gate), rot);
        });
      };
    },
  };

  /* ---- 2. a rubber stamp approves the shield card, then it goes to the target ---- */
  SC.stamp = {
    dur: 9, still: 8.5,
    build(svg, api) {
      const desk = el("g", {}, svg);
      el("rect", { x: 86, y: 276, width: 1440, height: 860, rx: 40, fill: LIL }, desk);
      el("rect", { x: 70, y: 260, width: 1440, height: 860, rx: 40, fill: SOFT, ...ink() }, desk);

      const box = el("g", {}, svg);
      el("rect", { x: 914, y: 464, width: 560, height: 540, rx: 30, fill: LIL }, box);
      el("rect", { x: 900, y: 450, width: 560, height: 540, rx: 30, fill: MINT, ...ink() }, box);
      el("rect", { x: 930, y: 480, width: 500, height: 420, rx: 18, fill: "#fff", ...ink() }, box);
      const tgt = mono(box, 1180, 962, "Target", 44, { "text-anchor": "middle" });

      const card = el("g", {}, svg);
      el("rect", { x: 10, y: 12, width: 440, height: 300, rx: 22, fill: LIL }, card);
      el("rect", { x: 0, y: 0, width: 440, height: 300, rx: 22, fill: SKY, ...ink() }, card);
      mono(card, 30, 58, "Shield", 40);
      el("rect", { x: 24, y: 80, width: 392, height: 196, rx: 14, fill: "#fff", ...ink() }, card);
      const imp = el("g", {}, card);
      el("rect", { x: -140, y: -44, width: 280, height: 88, rx: 14, fill: "none", stroke: BLUE, "stroke-width": 6 }, imp);
      el("rect", { x: -127, y: -31, width: 254, height: 62, rx: 8, fill: "none", stroke: BLUE, "stroke-width": 2.5 }, imp);
      mono(imp, 0, 16, "Approved", 44, { "text-anchor": "middle", fill: BLUE });
      const seal = el("g", {}, card);
      let sp = "";
      for (let i = 0; i < 24; i++) { const a = (i / 24) * 2 * Math.PI, r = i % 2 ? 57 : 67; sp += `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)} `; }
      el("path", { d: sp + "Z", fill: LIL, ...ink() }, seal);
      el("circle", { r: 50, fill: LIL, ...ink({ "stroke-width": 2.5 }) }, seal);
      mono(seal, 0, 8, "Signed", 24, { "text-anchor": "middle" });

      const stamp = el("g", {}, svg);
      ring(stamp, -164, -300, 328, 324, 24);
      const sq = el("g", {}, stamp);
      const parts = (g, sh) => {
        const f = (c) => (sh ? { fill: LIL } : { fill: c, ...ink() }), o = sh ? 12 : 0;
        el("rect", { x: -28 + o, y: -190 + o, width: 56, height: 100, rx: 10, ...f(YEL) }, g);
        el("rect", { x: -140 + o, y: -96 + o, width: 280, height: 76, rx: 16, ...f(YEL) }, g);
        el("rect", { x: -128 + o, y: -24 + o, width: 256, height: 24, rx: 6, ...f(BLUE) }, g);
        el("ellipse", { cx: o, cy: -232 + o, rx: 76, ry: 52, ...f(YEL) }, g);
      };
      parts(sq, true); parts(sq, false);

      let tap = -99;
      button(stamp, "Stamp: stamp the card again", () => { if (api.now() - tap > 2) { tap = api.now(); api.burst(2.1); } });

      return (t, now) => {
        desk.setAttribute("opacity", seg(t, 0.1, 0.3)); about(desk, 790, 690, 0.96 + 0.04 * oc(seg(t, 0.1, 0.6)));
        const bump = 0.025 * Math.sin(Math.PI * seg(t, 5.0, 5.35));
        about(box, 1180, 720, ob(seg(t, 0.5, 1.0)) * (1 + bump));
        about(tgt, 1180, 948, ob(seg(t, 0.85, 1.25)) * (1 + 4 * bump));
        const slide = io(seg(t, 4.1, 5.0));
        const cx = t < 4.1 ? lerp(-480, 250, ob(seg(t, 0.9, 1.8))) : lerp(250, 960, slide), cy = lerp(520, 540, slide);
        card.setAttribute("transform", `translate(${cx} ${cy})`);
        let sy;
        if (t < 2.4) sy = lerp(-60, 470, ob(seg(t, 1.5, 2.1)));
        else if (t < 2.75) sy = lerp(470, 700, Math.pow(seg(t, 2.4, 2.75), 3));
        else if (t < 3.0) sy = 700;
        else if (t < 5.0) sy = lerp(700, 470, oc(seg(t, 3.0, 3.45)));
        else sy = lerp(470, 800, io(seg(t, 5.0, 5.5)));
        let sx = 450, squash = 1 - 0.08 * Math.sin(Math.PI * seg(t, 2.75, 3.0));
        let impOn = t >= 2.75, impS = 1.25 - 0.25 * ob(seg(t, 2.75, 3.15));
        const u = now - tap;
        if (u >= 0 && u < 2) {
          const ix = cx + 200, iy = cy + 178, hy = iy - 230, bx = sx, by = sy;
          if (u < 0.5) { const p = io(u / 0.5); sx = lerp(bx, ix, p); sy = lerp(by, hy, p); }
          else if (u < 0.75) { sx = ix; sy = lerp(hy, iy, Math.pow((u - 0.5) / 0.25, 3)); }
          else if (u < 1.0) { sx = ix; sy = iy; squash = 1 - 0.08 * Math.sin(Math.PI * seg(u, 0.75, 1.0)); }
          else if (u < 1.35) { sx = ix; sy = lerp(iy, hy, oc((u - 1.0) / 0.35)); }
          else { const p = io(seg(u, 1.35, 1.95)); sx = lerp(ix, bx, p); sy = lerp(hy, by, p); }
          if (u >= 0.75) { impOn = true; impS = 1.25 - 0.25 * ob(seg(u, 0.75, 1.15)); }
        }
        stamp.setAttribute("transform", `translate(${sx} ${sy})`);
        sq.setAttribute("transform", `scale(${2 - squash} ${squash})`);
        tf(imp, 200, 178, impOn ? impS : 0, -6);
        const sk = ob(seg(t, 3.5, 3.95)); tf(seal, 428, 282, sk, -30 * (1 - sk));
      };
    },
  };

  /* ---- 3. a turnstile lets plain tokens through and turns back the exploit ---- */
  SC.turnstile = {
    dur: 10, still: 9.5,
    build(svg, api) {
      const FY = 880, R = 72, TY = FY - R, HX = 830, HY = 700;
      const floor = el("g", {}, svg);
      el("rect", { x: 60, y: FY, width: 1480, height: 46, rx: 23, fill: SOFT, ...ink() }, floor);

      const gate = el("g", {}, svg);
      ring(gate, 650, 396, 360, 504, 26);
      const post = el("g", {}, gate);
      el("rect", { x: 702, y: 422, width: 280, height: 72, rx: 16, fill: LIL }, post);
      el("rect", { x: 690, y: 410, width: 280, height: 72, rx: 16, fill: SOFT, ...ink() }, post);
      const gT = mono(post, 830, 457, "Base64 check", 32, { "text-anchor": "middle" });
      el("rect", { x: 822, y: 482, width: 16, height: 42, fill: SOFT, ...ink() }, post);
      el("rect", { x: 800, y: 520, width: 60, height: 360, rx: 12, fill: BLUE, ...ink() }, post);
      el("rect", { x: 770, y: 860, width: 120, height: 24, rx: 8, fill: BLUE, ...ink() }, post);
      const toks = el("g", {}, gate);
      const rotor = el("g", {}, gate);
      [150, 270, 30].forEach((a) => { const arm = el("g", { transform: `rotate(${a})` }, rotor); el("rect", { x: 0, y: -13, width: 150, height: 26, rx: 13, fill: YEL, ...ink() }, arm); });
      el("circle", { r: 30, fill: BLUE, ...ink() }, rotor);
      el("circle", { r: 10, fill: "#fff", ...ink() }, rotor);
      const lock = el("g", {}, gate);
      el("circle", { r: 40, fill: "#fff", ...ink() }, lock);
      const shackle = el("path", { d: "M-11 -4 V-14 A11 11 0 0 1 11 -14 V-4", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, lock);
      el("rect", { x: -18, y: -6, width: 36, height: 28, rx: 6, fill: YEL, ...ink() }, lock);

      const mkTok = (lil) => {
        const g = el("g", {}, toks), roll = el("g", {}, g);
        el("circle", { r: R, fill: lil ? LIL : SOFT, ...ink() }, roll);
        el("circle", { r: lil ? R - 6 : R - 12, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 12" }, roll);
        if (lil) mono(g, 0, 9, "exploit", 26, { "text-anchor": "middle" });
        else el("circle", { r: 11, fill: "#fff", ...ink() }, roll);
        return { g, roll };
      };
      const A = mkTok(false), B = mkTok(false), X = [mkTok(false), mkTok(false), mkTok(false)], C = mkTok(true);
      const put = (tk, x, y = TY) => { if (x <= -100 || x >= 1300) { tk.g.setAttribute("transform", "scale(0)"); return; } tk.g.setAttribute("transform", `translate(${x} ${y})`); tk.roll.setAttribute("transform", `rotate(${((x / R) * 180) / Math.PI})`); };

      const box = el("g", {}, svg);
      el("rect", { x: 1144, y: 444, width: 370, height: 436, rx: 24, fill: LIL }, box);
      el("rect", { x: 1130, y: 430, width: 370, height: 450, rx: 24, fill: MINT, ...ink() }, box);
      const bl = el("g", {}, box);
      el("rect", { x: 1160, y: 646, width: 310, height: 76, rx: 16, fill: "#fff", ...ink() }, bl);
      mono(bl, 1315, 696, "Elasticsearch", 34, { "text-anchor": "middle" });
      const light = el("circle", { cx: 1440, cy: 492, r: 20, fill: SKY, ...ink() }, box);
      const waves = el("path", { d: "M1466 466 A36 36 0 0 1 1466 518 M1478 452 A54 54 0 0 1 1478 532", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", transform: "rotate(-90 1440 492)" }, box);

      const taps = [-99, -99, -99]; let ti = 0;
      button(gate, "Turnstile: send another token", () => { taps[ti] = api.now(); ti = (ti + 1) % 3; api.burst(2.5); });
      const pass = (x) => io(seg(x, 560, 1000));

      return (t, now) => {
        floor.setAttribute("opacity", seg(t, 0.1, 0.3)); about(floor, 800, 903, 0.9 + 0.1 * oc(seg(t, 0.1, 0.6)));
        about(box, 1315, 880, ob(seg(t, 0.3, 0.8))); about(bl, 1315, 684, ob(seg(t, 0.7, 1.1)));
        const pk = ob(seg(t, 0.4, 0.9)); post.setAttribute("transform", `translate(0 ${120 * (1 - pk)})`); post.setAttribute("opacity", seg(t, 0.4, 0.55));
        about(gT, 830, 446, ob(seg(t, 0.8, 1.2)));
        const on = t > 1.2 && (t * 1.25 + 0.2) % 1 < 0.6;
        light.setAttribute("fill", on ? SKY : "#fff"); waves.setAttribute("opacity", on ? 1 : 0);
        const xa = -100 + 1400 * seg(t, 1.0, 3.3), xb = -100 + 1400 * seg(t, 2.3, 4.6);
        let xc;
        if (t < 4.75) xc = lerp(-100, 622, seg(t, 3.6, 4.75));
        else if (t < 4.95) xc = 622 - 22 * oc(seg(t, 4.75, 4.9));
        else xc = lerp(600, 330, oc(seg(t, 4.95, 6.3)));
        put(A, xa); put(B, xb); put(C, t < 3.6 ? -100 : xc);
        let rot = 120 * (pass(xa) + pass(xb)), open = 0;
        const sh = seg(t, 4.75, 5.15); rot += -5 * Math.sin(sh * Math.PI * 3) * (1 - sh);
        X.forEach((tk, i) => {
          const u = now - taps[i];
          if (u < 0 || u > 2.3) { put(tk, -100); return; }
          const x = -100 + 1400 * (u / 2.3), hop = t >= 3.6 ? 190 * Math.sin(Math.PI * seg(x, xc - 175, xc + 175)) : 0;
          put(tk, x, TY - hop); rot += 120 * pass(x); open = Math.max(open, seg(x, 470, 560) * (1 - seg(x, 1000, 1080)));
        });
        tf(rotor, HX, HY, ob(seg(t, 0.6, 1.0)), rot - 120 * (1 - oc(seg(t, 0.6, 1.1))));
        tf(lock, 925, 592, t >= 4.8 ? ob(seg(t, 4.8, 5.2)) : 0);
        shackle.setAttribute("transform", `translate(0 ${-10 * open})`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 6, still: 5.5,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 80, y: 70, width: 232, height: 66, rx: 33, fill: YEL, ...ink() }, pill);
      mono(pill, 196, 114, "Explainer", 30, { "text-anchor": "middle" });
      const date = mono(svg, 1520, 114, "Checked 24 Nov 2026", 28, { "text-anchor": "end", fill: MUTE, "font-weight": 500 });
      const title = txt(svg, 80, 330, "What is Shirudo?", { "font-size": 124, "font-weight": 700 });
      const ul = el("path", { d: "M88 378 H88", stroke: YEL, "stroke-width": 18, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 80, 460, "OpenAI and Cisco's open source Linux shield", { "font-size": 42, "font-weight": 500, fill: MUTE });
      const tile = (x, col, label) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 14, y: 574, width: 680, height: 250, rx: 30, fill: SOFT }, g);
        el("rect", { x, y: 560, width: 680, height: 250, rx: 30, fill: col, ...ink() }, g);
        const icon = el("g", {}, g), lab = mono(g, x + 340, 760, label, 38, { "text-anchor": "middle" });
        return { g, icon, lab, cx: x + 340 };
      };
      const t1 = tile(80, LIL, "Announced 23 Nov 2026"), t2 = tile(840, SKY, "No restart");
      let st = "";
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 17 : 40; st += `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)} `; }
      el("path", { d: st + "Z", fill: YEL, ...ink() }, t1.icon);
      el("path", { d: "M0 -2 V40 Q0 54 -14 54 Q-26 54 -26 42", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, t2.icon);
      el("path", { d: "M-60 0 Q0 -96 60 0 Q50 -12 36 0 Q24 -12 12 0 Q0 -12 -12 0 Q-24 -12 -36 0 Q-50 -12 -60 0 Z", fill: MINT, ...ink() }, t2.icon);
      el("circle", { cx: 0, cy: -50, r: 6, fill: MINT, ...ink() }, t2.icon);
      return (t) => {
        about(pill, 196, 103, ob(seg(t, 0.15, 0.6)));
        date.setAttribute("opacity", seg(t, 0.3, 0.6)); date.setAttribute("transform", `translate(${30 * (1 - oc(seg(t, 0.3, 0.8)))} 0)`);
        title.setAttribute("opacity", seg(t, 0.35, 0.55)); title.setAttribute("transform", `translate(0 ${40 * (1 - oc(seg(t, 0.35, 1.0)))})`);
        ul.setAttribute("d", `M88 378 H${88 + 440 * oc(seg(t, 0.9, 1.4))}`); ul.setAttribute("opacity", t < 0.9 ? 0 : 1);
        sub.setAttribute("opacity", seg(t, 1.0, 1.25)); sub.setAttribute("transform", `translate(0 ${24 * (1 - oc(seg(t, 1.0, 1.5)))})`);
        [t1, t2].forEach((s, i) => {
          const d = i * 0.12;
          about(s.g, s.cx, 685, ob(seg(t, 1.3 + d, 1.8 + d)));
          tf(s.icon, s.cx, 640, ob(seg(t, 1.75 + d, 2.2 + d)), -20 * (1 - oc(seg(t, 1.75 + d, 2.3 + d))));
          about(s.lab, s.cx, 748, ob(seg(t, 2.0 + d, 2.4 + d)));
        });
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 1600, H = sc.h || 1200;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    const stage = el("g", {}, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, until = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(), t = held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur; stage.setAttribute("opacity", 1 - seg(t, sc.dur - 0.35, sc.dur)); draw(t, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && (!held || clock() < until)) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, burst: (s) => { until = clock() + s; tick(); } };
    draw = sc.build(stage, api);
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
