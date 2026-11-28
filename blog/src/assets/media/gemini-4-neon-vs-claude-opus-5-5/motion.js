/* Bright coded scenes for "Gemini 4 Neon vs Claude Opus 5.5". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const D = Math.PI / 180;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700 }, a));
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
  /* a see through hit area plus the dashed focus ring that shows on hover and keyboard focus */
  const pad = (g, x, y, w, h, r = 18) => {
    el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 7", class: "mg-ring" }, g);
  };

  const SC = {};

  /* ---- 1. two rows of dominoes add up the price of 1M input plus 1M output ---- */
  SC.domino = {
    dur: 6.8,
    build(svg, api) {
      /* x of each tile's right foot (its pivot), heights, thicknesses, fall times and push speeds */
      const X = [125, 315, 505], HT = [176, 176, 216], TH = [46, 46, 60], F = [0.78, 0.5, 0.56], V = [0, 0.45, 0.45];
      /* does the tip of tile i, leaning th degrees, poke into tile i+1 leaning ph degrees? */
      const pen = (i, th, ph) => {
        const a = th * D, b = ph * D;
        const dx = X[i] + HT[i] * Math.sin(a) - (X[i + 1] - TH[i + 1] * Math.cos(b)), dy = HT[i] * Math.cos(a) - TH[i + 1] * Math.sin(b);
        const along = dx * Math.sin(b) + dy * Math.cos(b), into = dx * Math.cos(b) - dy * Math.sin(b);
        return into > 0 && along >= 0 && along <= HT[i + 1];
      };
      /* the furthest tile i can lean before it rests on tile i+1 */
      const tmax = (i, ph) => {
        for (let th = 0.5, lo = 0; th <= 90; lo = th, th += 0.5) {
          if (pen(i, th, ph)) { let hi = th; for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (pen(i, m, ph)) hi = m; else lo = m; } return lo; }
        }
        return 90;
      };
      const free = (j, u) => (u <= 0 ? 0 : 90 * cl(V[j] * (u / F[j]) + (1 - V[j]) * (u / F[j]) ** 2));
      const inv = (j, ang) => { let u = 0; while (free(j, u) < ang && u < 3) u += 0.002; return u; };
      const S = [0, inv(0, tmax(0, 0))]; S.push(S[1] + inv(1, tmax(1, 0)));
      const LAND = S[2] + F[2];
      const fall = (u) => {
        const th = [0, 1, 2].map((j) => free(j, u - S[j]));
        th[0] -= 5 * Math.sin(Math.PI * seg(u, -0.4, 0));
        if (u > LAND) th[2] = 90 - 7 * Math.sin(Math.PI * seg(u, LAND, LAND + 0.3));
        return th;
      };

      const ban = el("g", {}, svg);
      el("rect", { x: 186, y: 24, width: 440, height: 54, rx: 27, fill: LIL }, ban);
      el("rect", { x: 180, y: 18, width: 440, height: 54, rx: 27, fill: YEL, stroke: INK, "stroke-width": 3 }, ban);
      txt(ban, 400, 55, "1M input plus 1M output", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });

      const rows = [["Neon", MINT, 312, ["$3.00", "$15.00", "$18.00"], 2.0], ["Opus 5.5", LIL, 556, ["$4", "$20", "$24.00"], 3.0]].map(([name, col, gy, labels, start]) => {
        const g = el("g", {}, svg);
        pad(g, 50, gy - 224, 700, 238);
        const ground = el("rect", { x: 58, y: gy, width: 684, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        const chip = el("g", {}, g);
        el("rect", { x: 79, y: gy - 220, width: name.length * 13.2 + 30, height: 38, rx: 19, fill: col, stroke: INK, "stroke-width": 2.5 }, chip);
        mono(chip, 94, gy - 193, name, 22);
        const tiles = labels.map((s, j) => {
          const tg = el("g", {}, g), T = TH[j], H = HT[j], fs = j === 2 ? 30 : 24;
          el("rect", { x: -T, y: -H, width: T, height: H, rx: 8, fill: j === 2 ? SOFT : col, stroke: INK, "stroke-width": 3 }, tg);
          const lab = el("g", {}, tg);
          mono(lab, 0, fs * 0.36, s, fs, { "text-anchor": "middle" });
          return { tg, lab, T, H };
        });
        const r = { ground, chip, tiles, gy, start, tap: null, cap: [0, 0, 0], last: [0, 0, 0] };
        button(g, `${name}: stand the dominoes back up and run the row again`, () => { r.cap = r.last.slice(); r.tap = api.now(); api.play(1.2 + LAND + 0.6); });
        return r;
      });

      return (t, now) => {
        const kb = ob(seg(t, 0.1, 0.65));
        ban.setAttribute("transform", `translate(0 ${-90 * (1 - kb)})`); ban.setAttribute("opacity", seg(t, 0.1, 0.25));
        rows.forEach((r, ri) => {
          r.ground.setAttribute("width", Math.max(12, 684 * oc(seg(t, 0.3 + ri * 0.12, 0.9 + ri * 0.12))));
          r.ground.setAttribute("opacity", seg(t, 0.3 + ri * 0.12, 0.4 + ri * 0.12));
          const kc = ob(seg(t, 0.5 + ri * 0.12, 0.95 + ri * 0.12)), cy = r.gy - 201;
          r.chip.setAttribute("transform", `translate(79 ${cy}) scale(${kc}) translate(-79 ${-cy})`);
          /* a tapped row runs on its own clock: stand back up, a small lean back, then fall again */
          const v = r.tap == null ? null : api.calm ? 99 : now - r.tap, u = v == null ? t - r.start : v - 1.2;
          const th = v != null && v < 1.2 ? r.cap.map((a, j) => a * (1 - io(seg(v, j * 0.15, j * 0.15 + 0.5)))) : fall(u);
          th[1] = Math.min(th[1], tmax(1, th[2])); th[0] = Math.min(th[0], tmax(0, th[1]));
          r.last = th;
          r.tiles.forEach((p, j) => {
            const d = 0.7 + (ri * 3 + j) * 0.09, k = seg(t, d, d + 0.38) ** 2, sq = 1 - 0.08 * Math.sin(Math.PI * seg(t, d + 0.38, d + 0.6));
            p.tg.setAttribute("transform", `translate(${X[j]} ${r.gy - 80 * (1 - k)}) rotate(${th[j]}) scale(1 ${sq})`);
            p.tg.setAttribute("opacity", seg(t, d, d + 0.1));
            const pop = j === 2 ? 1 + 0.2 * Math.sin(Math.PI * seg(u, LAND + 0.05, LAND + 0.45)) : 1;
            p.lab.setAttribute("transform", `translate(${-p.T / 2} ${-p.H / 2}) rotate(-90) scale(${pop})`);
          });
        });
      };
    },
  };

  /* ---- 2. two catapults throw a 1M context ball as far as each output limit ---- */
  SC.catapult = {
    dur: 6.8,
    build(svg, api) {
      const G = 470, PY = 400, BR = 32, CX = [146, 314];
      const rot = (x, y, a) => { const c = Math.cos(a * D), s = Math.sin(a * D); return [x * c - y * s, x * s + y * c]; };
      const PL = [[396, 92, BLUE, "65,536"], [580, 92, BLUE, "128K"], [714, 122, SOFT, "1,048,576"]];
      const rel = (px) => { const [x, y] = rot(-96, -24, 70); return [px + x, PY + y]; };
      const arc = (R, i, h) => (s) => [R[0] + (PL[i][0] - R[0]) * s, R[1] + (G - 50 - BR - R[1]) * s - 4 * h * s * (1 - s)];
      const PA = arc(rel(CX[0]), 0, 200), PC = arc(rel(CX[1]), 1, 220), PB = arc(rel(CX[0]), 2, 290);
      /* dotted flight trails; a dot that would touch another trail's dot is left out */
      const placed = [];
      const trail = (f, n, col) => {
        const out = [];
        for (let k = 0; k < n; k++) {
          const s = 0.08 + (0.84 * k) / (n - 1), [x, y] = f(s);
          if (placed.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < 196)) continue;
          out.push({ s, x, y, c: el("circle", { cx: x, cy: y, r: 4, fill: col, stroke: INK, "stroke-width": 1.5 }, svg) });
        }
        out.forEach((d) => placed.push([d.x, d.y]));
        return out;
      };
      const TA = trail(PA, 15, MINT), TC = trail(PC, 15, LIL), TB = trail(PB, 26, MINT);
      const dots = (tr, s, o = 1) => tr.forEach((d) => d.c.setAttribute("opacity", d.s <= s ? o : 0));

      /* name plates hang under the strip; the Neon plate has a second face */
      const plate = (cx, col) => {
        const g = el("g", {}, svg);
        [-44, 44].forEach((dx) => el("path", { d: `M${cx + dx} 494 V520`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g));
        const f = el("g", {}, g);
        el("rect", { x: cx - 70, y: 516, width: 140, height: 60, rx: 12, fill: col, stroke: INK, "stroke-width": 3 }, f);
        return { g, f };
      };
      const pN = plate(95, MINT), pO = plate(263, LIL);
      const faceA = el("g", {}, pN.f), faceB = el("g", {}, pN.f);
      mono(faceA, 95, 555, "Neon", 24, { "text-anchor": "middle" });
      mono(faceB, 95, 539, "Neon", 16, { "text-anchor": "middle" });
      mono(faceB, 95, 563, "long decode", 18, { "text-anchor": "middle" });
      mono(pO.f, 263, 554, "Opus 5.5", 22, { "text-anchor": "middle" });

      const strip = el("rect", { x: 24, y: G, width: 752, height: 34, rx: 17, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      const pls = PL.map(([x, w, fill, s]) => {
        const g = el("g", {}, svg);
        el("rect", { x: -w / 2, y: -50, width: w, height: 50, rx: 9, fill, stroke: INK, "stroke-width": 3 }, g);
        mono(g, 0, -18, s, 19, { "text-anchor": "middle" });
        return { g, x };
      });
      const cats = CX.map((px, i) => {
        const col = i ? LIL : MINT, g = el("g", {}, svg);
        el("rect", { x: -116, y: 28, width: 130, height: 24, rx: 7, fill: col, stroke: INK, "stroke-width": 3 }, g);
        [-96, -8].forEach((x) => { el("circle", { cx: x, cy: 56, r: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); el("circle", { cx: x, cy: 56, r: 3.5, fill: INK }, g); });
        el("path", { d: "M-32 30 L20 30 L8 -2 L-8 -2 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const arm = el("g", {}, g);
        el("rect", { x: -100, y: -5, width: 112, height: 10, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, arm);
        el("path", { d: "M-128 -14 C-128 17 -64 17 -64 -14 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, arm);
        el("circle", { r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        return { g, arm, px };
      });
      const mkBall = () => {
        const b = el("g", {}, svg);
        el("circle", { r: BR, fill: YEL, stroke: INK, "stroke-width": 3 }, b);
        mono(b, 0, -2, "1M", 18, { "text-anchor": "middle" });
        mono(b, 0, 15, "context", 12, { "text-anchor": "middle" });
        return b;
      };
      const bA = mkBall(), bB = mkBall(), bC = mkBall();
      const put = (b, x, y, r = 0, sx = 1, sy = 1, o = 1) => { b.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) translate(0 ${BR}) scale(${sx} ${sy}) translate(0 ${-BR})`); b.setAttribute("opacity", o); };

      const hitG = el("g", {}, svg);
      pad(hitG, 10, 276, 164, 308);
      let mode = 0, tap = null;
      button(hitG, "Neon catapult: flip its sign to long decode", () => { mode = 1 - mode; tap = api.now(); api.play(3.6); });

      /* arm angle for a throw u seconds after it starts: wind back, fire, overshoot, settle upright */
      const ARM = (u) => (u < 0 ? -4 : u < 0.35 ? -4 - 8 * io(u / 0.35) : u < 0.5 ? -12 + 82 * ((u - 0.35) / 0.15) ** 2 : u < 0.62 ? 70 + 34 * oc((u - 0.5) / 0.12) : 104 - 14 * io(seg(u, 0.62, 0.95)));
      const fly = (b, u, a, F, path, px, drop, o) => {
        if (u < 0.5) { const [x, y] = rot(-96, -24, a); put(b, px + x, PY + y - 70 * (1 - drop), a, 1, 1, o); return 0; }
        const s = (u - 0.5) / F;
        if (s < 1) { const [x, y] = path(s); put(b, x, y, 70 + 290 * s); return s; }
        const k = seg(u, 0.5 + F, 0.95 + F), e = (1 - k) ** 2 * Math.cos(k * 2.5 * Math.PI), [x, y] = path(1);
        put(b, x, y, 0, 1 + 0.14 * e, 1 - 0.2 * e);
        return 1;
      };
      const bump = (x) => 1 + 0.08 * Math.sin(Math.PI * seg(x, 0, 0.3));
      const LY = G - 50 - BR;

      return (t, now) => {
        strip.setAttribute("width", Math.max(34, 752 * oc(seg(t, 0, 0.6)))); strip.setAttribute("opacity", seg(t, 0, 0.1));
        const enter = PL.map((_, i) => ob(seg(t, 0.3 + i * 0.1, 0.75 + i * 0.1)));
        cats.forEach((c, i) => { const k = ob(seg(t, 0.5 + i * 0.1, 1.0 + i * 0.1)); c.g.setAttribute("transform", `translate(${c.px} ${PY + 40 * (1 - k)})`); c.g.setAttribute("opacity", seg(t, 0.5 + i * 0.1, 0.62 + i * 0.1)); });
        [pN, pO].forEach((p, i) => { const k = ob(seg(t, 0.8 + i * 0.1, 1.25 + i * 0.1)); p.g.setAttribute("transform", `translate(0 ${-40 * (1 - k)})`); p.g.setAttribute("opacity", seg(t, 0.8 + i * 0.1, 0.9 + i * 0.1)); });

        const uC = t - 3.2, aC = ARM(uC);
        cats[1].arm.setAttribute("transform", `rotate(${aC})`);
        dots(TC, fly(bC, uC, aC, 1.1, PC, CX[1], ob(seg(t, 1.3, 1.7)), seg(t, 1.3, 1.4)));

        let aN, flip = 1, showB = false, p0 = -1, p2 = -1;
        if (tap == null) {
          const u = t - 2.0; aN = ARM(u);
          dots(TA, fly(bA, u, aN, 1.0, PA, CX[0], ob(seg(t, 1.2, 1.6)), seg(t, 1.2, 1.3)));
          dots(TB, 0); bB.setAttribute("opacity", 0); p0 = u - 1.5;
        } else {
          /* after a tap: the sign flips, the arm comes back for a new ball, then throws */
          const v = api.calm ? 99 : now - tap, u = v - 1.0, f = seg(v, 0.05, 0.45);
          flip = f < 0.5 ? 1 - io(f * 2) : ob((f - 0.5) * 2);
          showB = (f >= 0.5) === (mode === 1);
          aN = v < 1.0 ? 90 - 94 * io(seg(v, 0.1, 0.6)) : ARM(u);
          const drop = ob(seg(v, 0.55, 0.9)), dop = seg(v, 0.55, 0.62);
          if (mode === 1) {
            put(bA, PL[0][0], LY); dots(TA, 1);
            dots(TB, fly(bB, u, aN, 1.45, PB, CX[0], drop, dop)); p2 = u - 1.95;
          } else {
            const out = 1 - oc(seg(v, 0, 0.3)), fade = 1 - seg(v, 0, 0.35);
            put(bB, PL[2][0], LY, 0, out, out, out > 0.01 ? 1 : 0); dots(TB, 1, fade);
            if (v < 0.4) { put(bA, PL[0][0], LY, 0, out, out, out > 0.01 ? 1 : 0); dots(TA, 1, fade); }
            else { dots(TA, fly(bA, u, aN, 1.0, PA, CX[0], drop, dop)); p0 = u - 1.5; }
          }
        }
        cats[0].arm.setAttribute("transform", `rotate(${aN})`);
        faceA.setAttribute("opacity", showB ? 0 : 1); faceB.setAttribute("opacity", showB ? 1 : 0);
        pN.f.setAttribute("transform", `translate(0 546) scale(1 ${flip}) translate(0 -546)`);
        pls.forEach((p, i) => p.g.setAttribute("transform", `translate(${p.x} ${G}) scale(${enter[i] * bump([p0, uC - 1.6, p2][i])})`));
      };
    },
  };

  /* ---- 3. a flip digit scoreboard of Google's own figures ---- */
  SC.scoreboard = {
    dur: 7,
    build(svg, api) {
      const ROWS = [[["AutomationBench"], "56.3%", "42.5%"], [["Terminal Bench", "Science 0.1"], "70.5%", "63.3%"], [["Chartography"], "73.5%", "66.3%"]];
      const CY = [262, 377, 492], COLX = [296, 530], RS = [0, 0.75, 1.5], STEP = 0.075;
      const strip = el("g", {}, svg);
      el("rect", { x: 196, y: 26, width: 420, height: 54, rx: 27, fill: LIL }, strip);
      el("rect", { x: 190, y: 20, width: 420, height: 54, rx: 27, fill: YEL, stroke: INK, "stroke-width": 3 }, strip);
      txt(strip, 400, 57, "Google's own figures", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });

      const board = el("g", {}, svg);
      el("rect", { x: 42, y: 104, width: 732, height: 478, rx: 26, fill: LIL }, board);
      el("rect", { x: 34, y: 96, width: 732, height: 478, rx: 26, fill: SOFT, stroke: INK, "stroke-width": 3 }, board);
      el("rect", { x: 24, y: 86, width: 760, height: 506, rx: 32, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 7", class: "mg-ring" }, board);
      const stripes = COLX.map((x, c) => el("rect", { x, y: 114, width: 222, height: 442, rx: 18, fill: c ? LIL : MINT, stroke: INK, "stroke-width": 2.5 }, board));
      const heads = ["Neon", "Opus 5.5"].map((s, c) => { const g = el("g", {}, board); mono(g, COLX[c] + 111, 163, s, 26, { "text-anchor": "middle" }); return g; });
      const rows = ROWS.map(([lab, ...vals], r) => {
        const cy = CY[r], lg = el("g", {}, board);
        lab.forEach((s, i) => mono(lg, 56, cy + 7 + (lab.length > 1 ? (i ? 13 : -13) : 0), s, 19));
        const best = parseFloat(vals[0]) >= parseFloat(vals[1]) ? 0 : 1;
        const cells = vals.map((s, c) => {
          const g = el("g", {}, board), lx = COLX[c] + 28;
          const halo = el("circle", { cx: lx, cy, r: 18, fill: "none", stroke: SKY, "stroke-width": 4 }, g);
          const lamp = el("circle", { cx: lx, cy, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
          let x = COLX[c] + 51, j = 0; const tiles = [], marks = [];
          for (const ch of s) {
            if (ch >= "0" && ch <= "9") {
              const tg = el("g", {}, g); tf(tg, x + 17, cy);
              el("rect", { x: -17, y: -25, width: 34, height: 50, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, tg);
              el("path", { d: "M-15 0 H15", stroke: SOFT, "stroke-width": 2 }, tg);
              const fg = el("g", {}, tg), tx = mono(fg, 0, 11.5, "", 32, { "text-anchor": "middle" });
              tiles.push({ fg, tx, d: ch, N: 6 + j, at: c * 0.24 + j * 0.08 }); j++; x += 38;
            } else { marks.push(mono(g, x + (ch === "." ? 4 : 11), cy + 11, ch, 30, { "text-anchor": "middle" })); x += ch === "." ? 12 : 22; }
          }
          return { g, halo, lamp, lx, tiles, marks, cx: COLX[c] + 111, lit: c === best };
        });
        return { lg, cells, cy };
      });
      let tap = null;
      button(board, "Scoreboard: flip the rows blank and roll the digits again", () => { tap = api.now(); api.play(4.4); });

      /* a split flap tile: blank, then a run of digits that ends on the real one */
      const glyph = (p, rt) => {
        if (rt < 0) return ["", 1];
        const k = Math.floor(rt / STEP);
        if (k >= p.N) return [p.d, 1];
        const f = rt / STEP - k, at = (n) => (n <= 0 ? "" : String((+p.d - (p.N - n) + 100) % 10));
        return [f < 0.5 ? at(k) : at(k + 1), Math.abs(Math.cos(Math.PI * f))];
      };

      return (t, now) => {
        const kb = oc(seg(t, 0, 0.55));
        board.setAttribute("transform", `translate(0 ${30 * (1 - kb)})`); board.setAttribute("opacity", seg(t, 0, 0.25));
        stripes.forEach((s, c) => s.setAttribute("height", Math.max(36, 442 * oc(seg(t, 0.2 + c * 0.1, 0.75 + c * 0.1)))));
        heads.forEach((g, c) => { const k = ob(seg(t, 0.5 + c * 0.1, 0.9 + c * 0.1)), x = COLX[c] + 111; g.setAttribute("transform", `translate(${x} 154) scale(${k}) translate(${-x} -154)`); });
        const ks = ob(seg(t, 4.95, 5.5));
        strip.setAttribute("transform", `translate(0 ${-80 * (1 - ks)})`); strip.setAttribute("opacity", seg(t, 4.95, 5.1));
        const v = tap == null ? null : api.calm ? 99 : now - tap, roll = v == null ? t - 1.4 : v - 0.7, blank = v != null && v < 0.7 ? v : null;
        rows.forEach((r, ri) => {
          const kl = oc(seg(t, 0.65 + ri * 0.09, 1.1 + ri * 0.09));
          r.lg.setAttribute("transform", `translate(${-24 * (1 - kl)} 0)`); r.lg.setAttribute("opacity", kl);
          const rt = roll - RS[ri];
          r.cells.forEach((c, ci) => {
            const kc = ob(seg(t, 0.75 + ri * 0.09 + ci * 0.06, 1.15 + ri * 0.09 + ci * 0.06));
            c.g.setAttribute("transform", `translate(${c.cx} ${r.cy}) scale(${kc}) translate(${-c.cx} ${-r.cy})`);
            c.tiles.forEach((p) => {
              let g, sy;
              if (blank != null) { const a = ri * 0.08 + p.at * 0.3, f = seg(blank, a, a + 0.25); g = f < 0.5 ? p.d : ""; sy = Math.abs(Math.cos(Math.PI * f)); }
              else { [g, sy] = glyph(p, rt - p.at); }
              if (p.tx.textContent !== g) p.tx.textContent = g;
              p.fg.setAttribute("transform", `scale(1 ${sy})`);
            });
            const mo = blank != null ? 1 - seg(blank, ri * 0.08, ri * 0.08 + 0.2) : seg(rt, 0, 0.2);
            c.marks.forEach((m) => m.setAttribute("opacity", mo));
            /* the light beside the higher score blinks twice, then stays on with a small pop */
            const b = rt - 1.15, on = c.lit && blank == null && b >= 0 && (b >= 0.48 || Math.floor(b / 0.12) % 2 === 0);
            c.lamp.setAttribute("fill", on ? SKY : "#fff");
            c.halo.setAttribute("opacity", on ? 1 : 0);
            const lp = c.lit && blank == null ? 1 + 0.3 * Math.sin(Math.PI * seg(b, 0.48, 0.78)) : 1;
            c.lamp.setAttribute("transform", `translate(${c.lx} ${r.cy}) scale(${lp}) translate(${-c.lx} ${-r.cy})`);
          });
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 48, width: 158, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pill);
      mono(pill, 143, 76, "Comparisons", 19, { "text-anchor": "middle" });
      const lines = [["Gemini 4 Neon vs", 170, 68, 700, INK], ["Claude Opus 5.5", 246, 68, 700, INK], ["Price, limits and scores", 318, 28, 600, INK], ["Checked 19 Nov 2026", 352, 21, 500, MUTE]]
        .map(([s, y, size, w, fill]) => txt(svg, 62, y, s, { "font-size": size, "font-weight": w, fill }));
      const bar = el("path", { d: "M66 276 H66", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      const line = el("path", { d: "M48 476 H48", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const cards = [["Gemini 4 Neon", "$18.00", SKY, 64], ["Claude Opus 5.5", "$24.00", LIL, 352]].map(([n, p, col, x]) => {
        const g = el("g", {}, svg);
        el("rect", { x, y: 388, width: 270, height: 86, rx: 14, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, x + 20, 419, n, 18);
        txt(g, x + 20, 461, p, { "font-size": 34, "font-weight": 700 });
        return g;
      });
      const lab = mono(svg, 912, 464, "1M input plus 1M output", 17, { "text-anchor": "end", "font-weight": 500, fill: MUTE });
      return (t) => {
        const kp = ob(seg(t, 0, 0.4)); pill.setAttribute("transform", `translate(64 69) scale(${kp}) translate(-64 -69)`);
        lines.forEach((n, i) => { const k = oc(seg(t, 0.1 + i * 0.1, 0.6 + i * 0.1)); n.setAttribute("transform", `translate(0 ${18 * (1 - k)})`); n.setAttribute("opacity", k); });
        bar.setAttribute("d", `M66 276 H${66 + 300 * oc(seg(t, 0.5, 0.95))}`); bar.setAttribute("opacity", seg(t, 0.5, 0.56));
        line.setAttribute("d", `M48 476 H${48 + 864 * oc(seg(t, 0.6, 1.2))}`); line.setAttribute("opacity", seg(t, 0.6, 0.66));
        cards.forEach((g, i) => { const k = ob(seg(t, 1.0 + i * 0.12, 1.55 + i * 0.12)); g.setAttribute("transform", `translate(${90 * (1 - k)} 0)`); g.setAttribute("opacity", seg(t, 1.0 + i * 0.12, 1.15 + i * 0.12)); });
        const kl = oc(seg(t, 1.7, 2.1)); lab.setAttribute("transform", `translate(0 ${10 * (1 - kl)})`); lab.setAttribute("opacity", kl);
      };
    },
  };

  /* ---- player: plays once when first in view and holds the calm last frame; a tap replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, ran = false, busy = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const at = (now) => (calm ? sc.dur : ran ? cl(now + off, 0, sc.dur) : 0);
    const frame = () => { const now = clock(); draw(at(now), now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); const now = clock(); if (seen && !calm && (now + off < sc.dur || now < busy)) raf = requestAnimationFrame(tick); };
    const api = { calm, now: clock, play: (s) => { busy = Math.max(busy, clock() + s); tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.dur : cl(fixed, 0, sc.dur), 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && !ran) { ran = true; off = -clock(); }
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 28px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
