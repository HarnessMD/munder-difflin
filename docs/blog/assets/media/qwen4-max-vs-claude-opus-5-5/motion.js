/* Bright coded scenes for "Qwen4-Max vs Claude Opus 5.5". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0;
  const nid = (p) => `mgqo-${p}-${++uid}`;
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
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "text-anchor": "middle", "font-family": MONO, "font-size": size, "font-weight": 700 }, a));

  const SC = {};

  /* ---- 1. two odometers count the same 1M plus 1M tokens ---- */
  SC.odometer = {
    dur: 9, still: 9,
    build(svg, api) {
      const ban = el("g", {}, svg);
      el("rect", { x: 186, y: 34, width: 428, height: 64, rx: 32, fill: YEL, stroke: INK, "stroke-width": 3 }, ban);
      txt(ban, 400, 76, "1M input plus 1M output", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      const T0 = 0.9, T1 = 7.1, money = (t) => 24 * io(seg(t, T0, T1));
      const tq = T0 + (T1 - T0) * Math.cbrt(0.0625);
      const DH = 100, B = 172, CY = B + 151;
      const rigs = [
        { cx: 205, name: "Qwen", col: LIL, cap: 6, stop: tq, places: [0, -1, -2], rows: [["Input", "$1.50"], ["Output", "$4.50"]] },
        { cx: 595, name: "Opus", col: MINT, cap: 24, stop: T1, places: [1, 0, -1, -2], rows: [["Input", "$4"], ["Output", "$20"]] },
      ].map((r) => {
        const rows = r.rows.map(([a, b]) => {
          const g = el("g", {}, svg);
          el("rect", { x: r.cx - 150, y: 0, width: 300, height: 56, rx: 16, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
          txt(g, r.cx - 126, 37, a, { "font-size": 24 });
          mono(g, r.cx + 126, 38, b, 26, { "text-anchor": "end" });
          return g;
        });
        const g = el("g", {}, svg), body = el("g", {}, g);
        el("rect", { x: r.cx - 182, y: B - 12, width: 364, height: 274, rx: 38, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
        el("rect", { x: r.cx - 170, y: B, width: 340, height: 250, rx: 28, fill: r.col, stroke: INK, "stroke-width": 4 }, body);
        el("rect", { x: r.cx - 72, y: B + 20, width: 144, height: 46, rx: 23, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
        mono(body, r.cx, B + 53, r.name, 26);
        const WX = r.cx - 145, WY = B + 86, WW = 290, WH = 130;
        el("rect", { x: WX, y: WY, width: WW, height: WH, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3.5 }, body);
        const id = nid("win"), cp = el("clipPath", { id }, el("defs", {}, body));
        const clip = el("g", { "clip-path": `url(#${id})` }, body);
        const cells = [["$", 40]];
        r.places.forEach((p) => { if (p === -1) cells.push([".", 24]); cells.push([p, 48]); });
        let x = r.cx - cells.reduce((s, c) => s + c[1], 0) / 2;
        const wheels = [];
        cells.forEach(([c, w]) => {
          const mx = x + w / 2;
          if (typeof c === "string") mono(body, mx, CY + 21, c, 58);
          else {
            el("rect", { x: x + 3, y: WY + 12, width: w - 6, height: WH - 24, rx: 8, fill: SOFT }, clip);
            el("rect", { x: x + 3, y: WY + 12, width: w - 6, height: WH - 24, rx: 8 }, cp);
            const col = el("g", {}, clip);
            for (let j = 0; j <= 10; j++) mono(col, mx, CY + 21 + j * DH, String(j % 10), 58);
            wheels.push({ i: c + 2, col });
          }
          x += w;
        });
        const rig = { r, g, body, rows, wheels, on: false, at: -99 };
        button(g, `${r.name} odometer, $${r.cap}.00 for 1M input plus 1M output. Show input and output`, () => { rig.on = !rig.on; rig.at = api.now(); api.poke(); });
        return rig;
      });
      const pos = (c, i) => {
        if (i === 0) return Math.floor(c + 1e-6) % 10;
        if (i === 1) return (c / 10) % 10;
        const d = Math.floor(c / Math.pow(10, i) + 1e-6) % 10, low = pos(c, i - 1);
        return d + Math.max(0, low - 9);
      };
      return (t, now) => {
        const kb = ob(seg(t, 0, 0.6));
        ban.setAttribute("opacity", cl(kb * 2)); ban.setAttribute("transform", `translate(0 ${-24 * (1 - kb)})`);
        const m = money(t);
        rigs.forEach((g) => {
          const c = Math.round(Math.min(g.r.cap, m) * 100 * 1e4) / 1e4;
          g.wheels.forEach((w) => w.col.setAttribute("transform", `translate(0 ${-pos(c, w.i) * DH})`));
          const pop = 1 + 0.045 * Math.sin(Math.PI * seg(t, g.r.stop, g.r.stop + 0.45)), cy = B + 125;
          g.body.setAttribute("transform", `translate(${g.r.cx} ${cy}) scale(${pop}) translate(${-g.r.cx} ${-cy})`);
          const u = oc(seg(now - g.at, 0, 0.5)), k = g.on ? u : 1 - u;
          g.g.setAttribute("transform", `translate(0 ${-28 * k})`);
          g.rows.forEach((row, i) => {
            row.setAttribute("transform", `translate(0 ${410 + i * 68 - (1 - k) * (110 + i * 68)})`);
            row.setAttribute("opacity", cl(k * 3));
          });
        });
      };
    },
  };

  /* ---- 2. two ferries carry the same 1M token crate and unload their max output ---- */
  SC.ferry = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const WT = 196, WB = 496, LANE = [282, 442];
      el("rect", { x: -10, y: WT, width: 820, height: WB - WT, fill: SKY }, svg);
      el("path", { d: `M-10 ${WT} H810 M-10 ${WB} H810`, stroke: INK, "stroke-width": 3 }, svg);
      const wavy = (y) => { let d = `M-40 ${y}`; for (let i = 0; i < 40; i++) d += " q12 -7 24 0 q12 7 24 0"; return d; };
      const waves = [216, 312, 480].map((y) => el("path", { d: wavy(y), stroke: "#fff", "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "54 46" }, svg));
      LANE.forEach((W) => {
        el("path", { d: `M640 ${W - 26} V${W + 22} M712 ${W - 26} V${W + 22} M784 ${W - 26} V${W + 22} M24 ${W - 26} V${W + 22}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
        el("rect", { x: 616, y: W - 44, width: 200, height: 18, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
        el("rect", { x: -16, y: W - 44, width: 66, height: 18, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      });
      const crate = (val) => {
        const g = el("g", {}, svg);
        el("rect", { x: 0, y: 0, width: 140, height: 76, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        mono(g, 70, 30, "max output:", 16);
        const vg = el("g", {}, g), vt = mono(vg, 70, 61, val, 22);
        return { g, vg, vt };
      };
      const ferry = (name, col, sign) => {
        const g = el("g", {}, svg);
        if (sign) el("rect", { x: -144, y: -154, width: 288, height: 182, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 7", class: "mg-ring" }, g);
        el("rect", { x: -118, y: -84, width: 80, height: 44, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        [-106, -74].forEach((x) => el("rect", { x, y: -75, width: 22, height: 18, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2 }, g));
        el("rect", { x: -26, y: -126, width: 152, height: 86, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3.5 }, g);
        el("rect", { x: -18, y: -118, width: 136, height: 70, rx: 5, fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "5 5" }, g);
        mono(g, 50, -76, "1M tokens", 20);
        el("path", { d: "M-134 -40 H134 L112 16 H-114 Z", fill: col, stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, g);
        mono(g, 0, -3, name, 24);
        let board = null, front = null, back = null;
        if (sign) {
          el("path", { d: "M-78 -84 V-110", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
          board = el("g", {}, g);
          front = el("rect", { x: -124, y: -142, width: 92, height: 32, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, board);
          back = el("g", {}, board);
          el("rect", { x: -124, y: -142, width: 92, height: 32, rx: 7, fill: YEL, stroke: INK, "stroke-width": 3 }, back);
          mono(back, -78, -120, "thinking", 16);
        }
        return { g, board, front, back };
      };
      const qBox = crate("131,072"), q = ferry("Qwen", LIL, true), oBox = crate("128K"), o = ferry("Opus", MINT, false);
      const boats = [
        { f: q, box: qBox, W: LANE[0], go: [0.5, 4.6], drop: [5.2, 6.4], lift: 90, ph: 0 },
        { f: o, box: oBox, W: LANE[1], go: [0.8, 4.9], drop: [5.6, 6.8], lift: 70, ph: 1.7 },
      ];
      let think = false, at = -99;
      button(q.g, "Qwen ferry: turn thinking on or off", () => { think = !think; at = api.now(); api.poke(); });
      return (t, now) => {
        waves.forEach((w, i) => w.setAttribute("stroke-dashoffset", (t * (26 + i * 6)).toFixed(2)));
        boats.forEach((b) => {
          const fx = 196 + 286 * io(seg(t, b.go[0], b.go[1])), fy = b.W + Math.sin(t * 2.6 + b.ph) * 2.5;
          tf(b.f.g, fx, fy);
          const u = seg(t, b.drop[0], b.drop[1]), e = io(u), sx = fx - 20, sy = fy - 116, ex = 636, ey = b.W - 120;
          tf(b.box.g, sx + (ex - sx) * e, sy + (ey - sy) * e - b.lift * Math.sin(Math.PI * u));
        });
        const u = seg(now - at, 0, 0.5), k = think ? u : 1 - u, c = Math.cos(Math.PI * k), s = Math.max(0.02, Math.abs(c));
        q.board.setAttribute("transform", `translate(-78 -126) scale(${s} 1) translate(78 126)`);
        q.front.setAttribute("opacity", k < 0.5 ? 1 : 0); q.back.setAttribute("opacity", k < 0.5 ? 0 : 1);
        qBox.vt.textContent = k < 0.5 ? "131,072" : "262,144";
        qBox.vg.setAttribute("transform", `translate(70 53) scale(1 ${s}) translate(-70 -53)`);
      };
    },
  };

  /* ---- 3. a toy train, a set of points and two stations ---- */
  SC.toytrain = {
    dur: 9, still: 9,
    build(svg, api) {
      const MY = 330, J = 215, Y = { up: 200, dn: 460 };
      const branch = (y) => `M${J} ${MY} C285 ${MY} 275 ${y} 345 ${y} H600`;
      const tracks = [`M-20 ${MY} H${J}`, branch(Y.up), branch(Y.dn)];
      tracks.forEach((d) => el("path", { d, stroke: INK, "stroke-width": 26, fill: "none" }, svg));
      tracks.forEach((d) => el("path", { d, stroke: MINT, "stroke-width": 20, fill: "none" }, svg));
      tracks.forEach((d) => el("path", { d, stroke: INK, "stroke-width": 12, fill: "none", "stroke-dasharray": "3 13" }, svg));
      const station = (y, col, name) => {
        const g = el("g", {}, svg);
        el("path", { d: `M586 ${y - 110} L688 ${y - 144} L790 ${y - 110} Z`, fill: col, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, g);
        el("rect", { x: 596, y: y - 110, width: 184, height: 140, rx: 6, fill: col, stroke: INK, "stroke-width": 3.5 }, g);
        el("rect", { x: 610, y: y - 98, width: 156, height: 40, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        mono(g, 688, y - 70, name, 22);
        el("rect", { x: 606, y: y - 44, width: 50, height: 74, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        [676, 726].forEach((x) => el("rect", { x, y: y - 42, width: 40, height: 30, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
        return g;
      };
      const st = { up: station(Y.up, LIL, "Anthropic"), dn: station(Y.dn, SKY, "QwenCloud") };
      const pts = el("g", {}, svg);
      el("rect", { x: 20, y: 298, width: 292, height: 140, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 7", class: "mg-ring" }, pts);
      const blade = (y) => {
        const g = el("g", {}, pts), d = `M195 ${MY} H${J} C285 ${MY} 275 ${y} 345 ${y}`;
        el("path", { d, stroke: INK, "stroke-width": 15, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "72 2000" }, g);
        el("path", { d, stroke: YEL, "stroke-width": 9, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "72 2000" }, g);
        return g;
      };
      const bl = { up: blade(Y.up), dn: blade(Y.dn) };
      const lever = el("g", {}, pts);
      el("path", { d: "M0 0 V-30", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, lever);
      el("circle", { cx: 0, cy: -30, r: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, lever);
      el("rect", { x: 30, y: 386, width: 220, height: 40, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, pts);
      mono(pts, 140, 412, "ANTHROPIC_BASE_URL", 16);
      const route = {};
      ["up", "dn"].forEach((k) => { route[k] = el("path", { d: `M-260 ${MY} H${J} ${branch(Y[k]).replace(/^M\S+ \S+ /, "")}`, fill: "none", stroke: "none" }, svg); });
      const L = route.up.getTotalLength(), S0 = 330, S1 = L - 89, run = (t) => S0 + (S1 - S0) * io(seg(t, 0.4, 6.2));
      let tJ = 9; for (let t = 0; t < 9; t += 0.02) if (run(t) + 66 >= 260 + J) { tJ = t; break; }
      const train = el("g", {}, svg), car = el("g", {}, train), eng = el("g", {}, train);
      el("path", { d: "M46 -24 H62", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, car);
      el("rect", { x: -48, y: -48, width: 96, height: 40, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3.5 }, car);
      el("rect", { x: -36, y: -42, width: 72, height: 28, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, car);
      mono(car, 0, -21, "Opus", 19);
      [-26, 26].forEach((x) => el("circle", { cx: x, cy: -6, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, car));
      el("rect", { x: -62, y: -78, width: 42, height: 32, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3.5 }, eng);
      el("rect", { x: -54, y: -72, width: 26, height: 18, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2 }, eng);
      el("rect", { x: 34, y: -70, width: 18, height: 24, rx: 4, fill: YEL, stroke: INK, "stroke-width": 3 }, eng);
      el("rect", { x: -66, y: -48, width: 132, height: 40, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3.5 }, eng);
      mono(eng, 0, -22, "Claude Code", 15);
      [-42, 0, 42].forEach((x) => el("circle", { cx: x, cy: -6, r: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, eng));
      const place = (n, p, s) => {
        const a = p.getPointAtLength(Math.max(0, s - 3)), b = p.getPointAtLength(s + 3), m = p.getPointAtLength(s);
        tf(n, m.x, m.y, 1, (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);
      };
      let flip = false, at = -99, last = 0;
      button(pts, "Points marked ANTHROPIC_BASE_URL: send the train to Anthropic or QwenCloud", () => {
        flip = !flip; at = api.now();
        if (last > tJ) api.seek(0.2); else api.poke();
      });
      return (t, now) => {
        last = t;
        const key = flip ? "dn" : "up", s = run(t), p = route[key];
        place(eng, p, s); place(car, p, s - 122);
        const u = seg(now - at, 0, 0.3), k = flip ? u : 1 - u;
        bl.up.setAttribute("opacity", 1 - k); bl.dn.setAttribute("opacity", k);
        tf(lever, 176, 386, 1, -32 + 64 * k);
        ["up", "dn"].forEach((n) => {
          const pop = n === key ? 1 + 0.05 * Math.sin(Math.PI * seg(t, 6.0, 6.5)) : 1, cy = Y[n] - 40;
          st[n].setAttribute("transform", `translate(688 ${cy}) scale(${pop}) translate(-688 ${-cy})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 46, width: 170, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 149, 74, "Comparisons", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 74, "Checked 16 Nov 2026", { "text-anchor": "end", "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 178, "Qwen4-Max vs", { "font-size": 68, "font-weight": 700 });
      txt(svg, 64, 254, "Claude Opus 5.5", { "font-size": 68, "font-weight": 700 });
      el("path", { d: "M66 282 H300", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 332, "Price, limits and Claude Code setup", { "font-size": 25, "font-weight": 500, fill: MUTE });
      el("path", { d: "M404 418 H556", stroke: INK, "stroke-width": 2 }, svg);
      [[64, SKY, "Qwen4-Max", "$6.00"], [556, LIL, "Claude Opus 5.5", "$24.00"]].forEach(([x, col, name, price]) => {
        el("rect", { x, y: 368, width: 340, height: 100, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, svg);
        mono(svg, x + 170, 406, name, 22);
        txt(svg, x + 170, 450, price, { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      });
      txt(svg, 480, 506, "1M input plus 1M output", { "text-anchor": "middle", "font-size": 18, "font-weight": 500, fill: MUTE });
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
