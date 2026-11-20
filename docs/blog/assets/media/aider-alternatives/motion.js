/* Bright coded scenes for "Aider alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 20, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const around = (n, cx, cy, s, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, x, y, w, h, r = 18) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 7", "stroke-linecap": "round", class: "mg-ring" }, p);
  const hit = (p, x, y, w, h, r = 18) => el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, p);

  const SC = {};

  /* ---- 1. a yellow tandem rolls along a mint path; each full turn of the wheels plants a commit flag ---- */
  SC.tandem = {
    dur: 9, still: 9, once: true,
    build(svg, api) {
      const PY = 384, RO = 38.5, RT = 32, HY = PY - RO, C0 = 146;
      const CIRC = 2 * Math.PI * RO, D = 2.06 * CIRC, T0 = 1.5, T1 = 6.8;
      const dist = (t) => D * io(seg(t, T0, T1));
      const when = [1, 2].map((k) => { for (let t = T0; t < T1; t += 0.005) if (dist(t) >= k * CIRC) return t; return T1; });
      const shade = el("rect", { x: 34, y: PY + 10, width: 740, height: 40, rx: 20, fill: SOFT }, svg);
      const path = el("rect", { x: 26, y: PY, width: 740, height: 40, rx: 20, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const fwrap = el("g", {}, svg);
      const flags = when.map((w, i) => {
        const g = el("g", {}, fwrap);
        el("path", { d: "M0 0 V-98", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        el("path", { d: "M-1 -96 H-94 Q-100 -96 -100 -90 V-62 Q-100 -56 -94 -56 H-1 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        const word = mono(g, -50, -70, "commit", { "text-anchor": "middle", "font-size": 17 });
        return { g, word, w, x: C0 + (i + 1) * CIRC - 146 };
      });
      const bwrap = el("g", {}, svg);
      const bike = el("g", {}, bwrap);
      ring(bike, -146, -202, 292, 252, 26); hit(bike, -146, -202, 292, 252, 26);
      const rock = el("g", {}, bike);
      const spins = [-92, 92].map((x) => {
        const w = el("g", { transform: `translate(${x} 0)` }, rock);
        el("circle", { r: RT, fill: "#fff", stroke: INK, "stroke-width": 13 }, w);
        el("circle", { r: RT, fill: "none", stroke: SKY, "stroke-width": 8 }, w);
        const spin = el("g", {}, w);
        el("path", { d: `M0 ${6 - RT} V${RT - 6} M${6 - RT} 0 H${RT - 6}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, spin);
        el("circle", { cx: 0, cy: -17, r: 5, fill: YEL, stroke: INK, "stroke-width": 2 }, spin);
        return spin;
      });
      const FR = "M-92 0 L-34 6 L-46 -62 Z M-34 6 H30 L18 -62 M-46 -62 L18 -62 L68 -66 M30 6 L73 -44 M68 -66 L73 -44 Q82 -20 92 0";
      el("path", { d: FR, stroke: INK, "stroke-width": 10, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, rock);
      el("path", { d: FR, stroke: YEL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, rock);
      [[-46, -48], [18, 16]].forEach(([x0, x1]) => {
        el("path", { d: `M${x0} -62 L${x1} -76`, stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round" }, rock);
        el("rect", { x: x1 - 16, y: -84, width: 30, height: 10, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, rock);
      });
      el("path", { d: "M68 -66 L65 -82 H82 Q92 -82 90 -72", stroke: INK, "stroke-width": 4.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, rock);
      el("path", { d: "M17 -70 H2 Q-4 -70 -4 -63", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, rock);
      [-92, 92].forEach((x) => el("circle", { cx: x, cy: 0, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, rock));
      const cranks = [-34, 30].map((x) => {
        el("circle", { cx: x, cy: 6, r: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, rock);
        const c = el("g", {}, rock);
        el("path", { d: "M0 0 V15", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, c);
        el("rect", { x: -7, y: 13, width: 14, height: 5, rx: 2.5, fill: SOFT, stroke: INK, "stroke-width": 2 }, c);
        return { c, x };
      });
      const tags = [[16, 14, "Aider"], [-48, 68, "almost any LLM"]].map(([x, L, s]) => {
        const w = s.length * 10.2 + 30, g = el("g", {}, rock);
        el("path", { d: `M0 0 V${-L}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("rect", { x: -w / 2, y: -L - 36, width: w, height: 36, rx: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
        return { g, x, word: mono(g, 0, -L - 12, s, { "text-anchor": "middle", "font-size": 17 }) };
      });
      button(bike, "Tandem bicycle: start a new lap", () => api.replay(1.3, [bwrap, fwrap]));
      return (t) => {
        const pw = 40 + 700 * oc(seg(t, 0.05, 0.75));
        path.setAttribute("width", pw); shade.setAttribute("width", pw);
        const d = dist(t), a = (d / RO) * 180 / Math.PI;
        tf(bike, C0 + d, HY - 28 * (1 - ob(seg(t, 0.25, 0.85)))); bike.setAttribute("opacity", seg(t, 0.25, 0.45));
        spins.forEach((s) => s.setAttribute("transform", `rotate(${a})`));
        cranks.forEach((c) => c.c.setAttribute("transform", `translate(${c.x} 6) rotate(${a * 0.6})`));
        const s = t - T1, rk = s > 0 ? 1.8 * Math.exp(-s * 4.5) * Math.abs(Math.sin(s * 9)) : 0;
        rock.setAttribute("transform", `rotate(${rk} 92 ${RO})`);
        tags.forEach((g, i) => {
          const u = seg(t, 0.7 + i * 0.1, 1.05 + i * 0.1);
          tf(g.g, g.x, -84, ob(u)); g.g.setAttribute("opacity", u > 0 ? 1 : 0);
          g.word.setAttribute("opacity", seg(t, 0.95 + i * 0.1, 1.15 + i * 0.1));
        });
        flags.forEach((f) => {
          tf(f.g, f.x, PY + 4, ob(seg(t, f.w, f.w + 0.45))); f.g.setAttribute("opacity", t >= f.w ? 1 : 0);
          f.word.setAttribute("opacity", seg(t, f.w + 0.2, f.w + 0.38));
        });
      };
    },
  };

  /* ---- 2. a stopwatch hand sweeps round and stops at each Aider date ---- */
  SC.stopwatch = {
    dur: 9.5, still: 9.5, once: true,
    build(svg, api) {
      const WX = 240, WY = 322, RB = 135, RF = 106, AR = 322, CW = 244, CH = 90;
      const CARDS = [["v0.86.0", "9 Aug 2025"], ["0.86.2", "12 Feb 2026"], ["last commit", "22 May 2026"]];
      const PHI = [-38, 0, 38], ANG = PHI.map((p) => 90 + p);
      const SW = [[1.7, 3], [3.55, 4.85], [5.4, 6.8]];
      const FROM = [0, 360 + ANG[0], 720 + ANG[1]], TO = [360 + ANG[0], 720 + ANG[1], 1080 + ANG[2]];
      let startA = 0, pressAt = -99, lastA = 0;
      const cards = CARDS.map(([a, b], i) => {
        const r = (PHI[i] * Math.PI) / 180, cx = WX + AR * Math.cos(r), cy = WY + AR * Math.sin(r), x = cx - CW / 2, y = cy - CH / 2;
        const g = el("g", {}, svg);
        el("rect", { x: x + 8, y: y + 8, width: CW, height: CH, rx: 16, fill: SOFT }, g);
        el("rect", { x, y, width: CW, height: CH, rx: 16, fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        const hi = el("rect", { x, y, width: CW, height: CH, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3, opacity: 0 }, g);
        const words = el("g", {}, g);
        mono(words, x + 22, y + 39, a, { "font-size": 24 });
        mono(words, x + 22, y + 71, b, { "font-size": 20, "font-weight": 500 });
        return { g, hi, words, cx, cy };
      });
      const watch = el("g", {}, svg);
      el("circle", { cx: 10, cy: 10, r: RB, fill: SOFT }, watch);
      const btn = el("g", {}, watch);
      hit(btn, -54, -RB - 64, 108, 68, 16); ring(btn, -48, -RB - 58, 96, 52, 16);
      const press = el("g", {}, btn);
      el("rect", { x: -13, y: -RB - 22, width: 26, height: 30, rx: 5, fill: SKY, stroke: INK, "stroke-width": 3 }, press);
      el("rect", { x: -34, y: -RB - 46, width: 68, height: 28, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, press);
      el("circle", { r: RB, fill: SKY, stroke: INK, "stroke-width": 3 }, watch);
      el("circle", { r: RF, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, watch);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6, big = i % 3 === 0, r1 = RF - (big ? 24 : 15), r2 = RF - 8;
        el("path", { d: `M${Math.sin(a) * r1} ${-Math.cos(a) * r1} L${Math.sin(a) * r2} ${-Math.cos(a) * r2}`, stroke: INK, "stroke-width": big ? 4 : 2.5, "stroke-linecap": "round" }, watch);
      }
      const hand = el("g", {}, watch);
      el("path", { d: "M-7 16 L-4 -80 Q0 -90 4 -80 L7 16 Q0 22 -7 16 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, hand);
      el("circle", { r: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, watch);
      el("circle", { r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, watch);
      button(btn, "Yellow button: send the hand round again", () => { startA = ((lastA % 360) + 360) % 360; pressAt = api.now(); api.seek(1.25); });
      const angle = (t) => {
        let a = startA * (1 - io(seg(t, 1.25, 1.65)));
        SW.forEach(([s0, s1], k) => {
          if (t < s0) return;
          a = FROM[k] + (TO[k] - FROM[k]) * io(seg(t, s0, s1));
          if (t > s1) { const s = t - s1; a += (k === 2 ? 7 : 4) * Math.exp(-s * 6) * Math.sin(s * 19); }
        });
        return a;
      };
      return (t, now) => {
        tf(watch, WX, WY, 0.82 + 0.18 * ob(seg(t, 0, 0.55))); watch.setAttribute("opacity", seg(t, 0, 0.2));
        lastA = angle(t); hand.setAttribute("transform", `rotate(${lastA})`);
        press.setAttribute("transform", `translate(0 ${6 * Math.sin(Math.PI * seg(now - pressAt, 0, 0.24))})`);
        cards.forEach((c, i) => {
          c.hi.setAttribute("opacity", t >= SW[i][1] - 0.02 && (i === 2 || t < SW[i + 1][0]) ? 1 : 0);
          const pop = 1 + (i === 2 ? 0.07 : 0.045) * Math.sin(Math.PI * seg(t, SW[i][1], SW[i][1] + 0.4));
          around(c.g, c.cx, c.cy, pop, 60 * (1 - oc(seg(t, 0.3 + i * 0.1, 0.8 + i * 0.1))));
          c.g.setAttribute("opacity", seg(t, 0.3 + i * 0.1, 0.5 + i * 0.1));
          c.words.setAttribute("opacity", seg(t, 0.62 + i * 0.1, 0.9 + i * 0.1));
        });
      };
    },
  };

  /* ---- 3. a crosswalk of six stripes; each stripe is a reason, the sign on the far side is the pick ---- */
  SC.crosswalk = {
    dur: 9, still: 9, once: true,
    build(svg, api) {
      const ROWS = [["Many providers", "OpenCode"], ["Team of agents", "Munder Difflin"], ["Local models", "Qwen Code"], ["Desktop app", "goose"], ["ChatGPT plan", "Codex CLI"], ["Claude plan", "Claude Code"]];
      const RY = 160, RH = 378, SX = 190, SWD = 420, SH = 44, GAP = 14, Y0 = RY + (RH - 6 * SH - 5 * GAP) / 2;
      const ORDER = [5, 4, 3, 2, 1, 0], STEP = [2, 2.75, 3.5, 4.25, 5, 6];
      let user = null, cur = -1;
      const road = el("g", {}, svg);
      el("rect", { x: 0, y: RY, width: 800, height: RH, fill: SKY }, road);
      el("path", { d: `M0 ${RY} H800 M0 ${RY + RH} H800`, stroke: INK, "stroke-width": 3 }, road);
      el("path", { d: `M18 ${RY + RH / 2} H160 M640 ${RY + RH / 2} H782`, stroke: INK, "stroke-width": 3, "stroke-dasharray": "22 16", "stroke-linecap": "round" }, road);
      ring(road, 14, RY + 10, 772, RH - 20, 20);
      button(road, "Road: clear the stripes", () => { user = { sel: -1, prev: cur, at: api.now() }; api.poke(1); });
      const posts = el("path", { d: `M330 100 V${RY} M470 100 V${RY}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const board = el("g", {}, svg);
      el("rect", { x: 248, y: 48, width: 320, height: 68, rx: 16, fill: SOFT }, board);
      el("rect", { x: 240, y: 40, width: 320, height: 68, rx: 16, fill: MINT, stroke: INK, "stroke-width": 3 }, board);
      const picks = ROWS.map(([, p]) => mono(board, 400, 84, p, { "text-anchor": "middle", "font-size": 28, opacity: 0 }));
      const stripes = ROWS.map(([lab, pick], i) => {
        const y = Y0 + i * (SH + GAP), cy = y + SH / 2, g = el("g", {}, svg);
        hit(g, SX - 8, y - 6, SWD + 16, SH + 12, 14); ring(g, SX - 8, y - 6, SWD + 16, SH + 12, 14);
        const body = el("g", {}, g);
        el("rect", { x: SX, y, width: SWD, height: SH, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, body);
        const hi = el("rect", { x: SX, y, width: SWD, height: SH, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5, opacity: 0 }, body);
        const sign = el("g", {}, body);
        el("rect", { x: 300, y: cy - 16, width: 200, height: 32, rx: 9, fill: LIL, stroke: INK, "stroke-width": 2.5 }, sign);
        const word = mono(sign, 400, cy + 6.5, lab, { "text-anchor": "middle", "font-size": 18 });
        button(g, `${lab}: ${pick}`, () => { user = { sel: i, prev: cur, at: api.now() }; api.poke(1); });
        return { g, body, hi, sign, word, cy };
      });
      return (t, now) => {
        road.setAttribute("opacity", seg(t, 0, 0.3)); around(road, 400, RY + RH / 2, 0.96 + 0.04 * oc(seg(t, 0, 0.5)));
        let sel = -1, prev = -1, dt = 9;
        if (user) { sel = user.sel; prev = user.prev; dt = now - user.at; }
        else { let k = 0; while (k < 6 && t >= STEP[k]) k++; if (k) { sel = ORDER[k - 1]; prev = k > 1 ? ORDER[k - 2] : -1; dt = t - STEP[k - 1]; } }
        cur = sel;
        stripes.forEach((s, j) => {
          const d = 0.3 + (5 - j) * 0.08;
          s.g.setAttribute("opacity", seg(t, d, d + 0.15));
          s.hi.setAttribute("opacity", j === sel ? 1 : 0);
          const pop = j === sel ? 1 + 0.035 * Math.sin(Math.PI * seg(dt, 0, 0.3)) : 1;
          around(s.body, 400, s.cy, pop, -60 * (1 - oc(seg(t, d, d + 0.45))));
          around(s.sign, 400, s.cy, ob(seg(t, d + 0.35, d + 0.7)));
          s.word.setAttribute("opacity", seg(t, d + 0.55, d + 0.75));
        });
        posts.setAttribute("transform", `translate(0 ${RY}) scale(1 ${oc(seg(t, 1.1, 1.4))}) translate(0 ${-RY})`);
        const key = !user && sel === 0 ? 0.075 : 0.04;
        around(board, 400, 74, ob(seg(t, 1.25, 1.7)) * (1 + (sel >= 0 ? key * Math.sin(Math.PI * seg(dt, 0, 0.32)) : 0)));
        picks.forEach((n, j) => {
          let o = 0, y = 0;
          if (j === sel) { const u = api.calm ? 1 : seg(dt, 0.13, 0.48); o = seg(u, 0, 0.35); y = -16 * (1 - ob(u)); }
          else if (j === prev) { const u = api.calm ? 1 : seg(dt, 0, 0.12); o = 1 - u; y = 12 * u; }
          n.setAttribute("opacity", o); n.setAttribute("transform", `translate(0 ${y})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6, once: true,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 76, width: 172, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 150, 104, "Comparisons", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const t1 = txt(svg, 64, 202, "Aider", { "font-size": 66, "font-weight": 700 });
      const t2 = txt(svg, 64, 274, "alternatives", { "font-size": 66, "font-weight": 700 });
      const line = el("path", { d: "M66 300 H330", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", "stroke-dasharray": "300 300" }, svg);
      const sub = txt(svg, 64, 356, "6 tools to switch to", { "font-size": 30, "font-weight": 600 });
      const chk = txt(svg, 64, 398, "Checked 20 Nov 2026", { "font-size": 21, "font-weight": 500, fill: MUTE });
      const watch = el("g", {}, svg);
      el("circle", { cx: 8, cy: 8, r: 80, fill: SOFT }, watch);
      el("rect", { x: -11, y: -98, width: 22, height: 24, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2.5 }, watch);
      el("rect", { x: -27, y: -116, width: 54, height: 22, rx: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, watch);
      el("circle", { r: 80, fill: LIL, stroke: INK, "stroke-width": 3 }, watch);
      el("circle", { r: 62, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, watch);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6, big = i % 3 === 0, r1 = 62 - (big ? 17 : 11), r2 = 56;
        el("path", { d: `M${Math.sin(a) * r1} ${-Math.cos(a) * r1} L${Math.sin(a) * r2} ${-Math.cos(a) * r2}`, stroke: INK, "stroke-width": big ? 3.5 : 2.5, "stroke-linecap": "round" }, watch);
      }
      const hand = el("path", { d: "M0 10 V-48", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, watch);
      el("circle", { r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, watch);
      const LX = 812, NAMES = ["OpenCode", "Munder Difflin", "Qwen Code", "goose", "Codex CLI", "Claude Code"];
      el("path", { d: `M${LX} -4 V478`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const cards = NAMES.map((n, i) => {
        const y = 91 + i * 62, g = el("g", {}, svg);
        el("rect", { x: LX - 90, y: y + 6, width: 192, height: 48, rx: 12, fill: LIL }, g);
        el("rect", { x: LX - 96, y, width: 192, height: 48, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, LX, y + 31, n, { "text-anchor": "middle", "font-size": 19 });
        return g;
      });
      return (t) => {
        [pill, t1, t2, sub, chk].forEach((n, i) => { const a = 0.1 + i * 0.09; n.setAttribute("opacity", seg(t, a, a + 0.2)); n.setAttribute("transform", `translate(0 ${14 * (1 - oc(seg(t, a, a + 0.5)))})`); });
        line.setAttribute("stroke-dashoffset", 300 * (1 - oc(seg(t, 0.6, 1.1))));
        tf(watch, 618, 290, 0.8 + 0.2 * ob(seg(t, 0.4, 0.9))); watch.setAttribute("opacity", seg(t, 0.4, 0.55));
        const s = t - 1.9;
        hand.setAttribute("transform", `rotate(${425 * io(seg(t, 0.7, 1.9)) + (s > 0 ? 5 * Math.exp(-s * 6) * Math.sin(s * 19) : 0)})`);
        cards.forEach((g, i) => { const a = 1.2 + (5 - i) * 0.12, y = 91 + i * 62; g.setAttribute("opacity", t >= a ? 1 : 0); g.setAttribute("transform", `translate(0 ${-(y + 60) * (1 - oc(seg(t, a, a + 0.5)))})`); });
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
    let off = 0, raf = 0, seen = false, held = calm, busy = 0, fading = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const at = (now) => (sc.once ? Math.min(now + off, sc.dur) : (((now + off) % sc.dur) + sc.dur) % sc.dur);
    const frame = () => { const now = clock(); draw(held ? sc.still : at(now), now); };
    const live = () => !held && (!(sc.once && clock() + off >= sc.dur) || clock() < busy);
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && live()) raf = requestAnimationFrame(tick); };
    const api = {
      now: clock, calm,
      seek: (s) => { off = s - clock(); held = false; tick(); },
      poke: (sec = 1) => { if (held) { off = sc.still - clock(); held = false; } busy = clock() + sec; tick(); },
      replay: (s, nodes) => {
        if (fading) return;
        if (calm) { api.seek(s); return; }
        fading = true;
        nodes.forEach((n) => { n.style.transition = "opacity 0.2s ease-in-out"; n.style.opacity = 0; });
        setTimeout(() => { fading = false; api.seek(s); nodes.forEach((n) => { n.style.opacity = 1; }); }, 210);
      },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && sc.once && !held && !fig.dataset.ran) { fig.dataset.ran = 1; off = -clock(); }
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 24px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
