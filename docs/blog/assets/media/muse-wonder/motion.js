/* Bright coded scenes for "Muse Wonder and Muse Code". Vanilla JS, no library.
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };

  const lerp = (a, b, k) => a + (b - a) * k;
  /* a rounded label sized to its words, centred on 0,0 of its group */
  const pill = (g, s, fill) => {
    const r = el("rect", { y: -20, height: 40, rx: 20, fill, stroke: INK, "stroke-width": 2.5 }, g), t = txt(g, 0, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
    const w = t.getComputedTextLength() + 28; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return w;
  };
  /* a jacket drawn below its collar at 0,0; ghost is the dashed outline of a jacket that is not there */
  const jacket = (g, fill, ghost) => {
    const look = ghost ? { fill: SOFT, stroke: LIL, "stroke-width": 3, "stroke-dasharray": "4 8", "stroke-linecap": "round" } : { fill, stroke: INK, "stroke-width": 3 };
    el("path", Object.assign({ d: "M-28 0 L-58 14 L-80 122 L-58 130 L-48 76 V190 H48 V76 L58 130 L80 122 L58 14 L28 0 Q0 24 -28 0 Z", "stroke-linejoin": "round" }, look), g);
    if (ghost) return;
    el("path", { d: "M0 12 V190 M-36 124 H-14 M14 124 H36", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, g);
    [48, 84].forEach((y) => el("circle", { cx: 11, cy: y, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, g));
  };

  const SC = {};

  /* ---- 1. coat hooks: where each model hangs today, and the hook that stays empty ---- */
  SC.hooks = {
    dur: 12, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "Where can you use Muse Wonder today?", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 98, "tap the Muse hook", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const HX = [132, 404, 682], HY = 204;
      el("rect", { x: 30, y: 116, width: 740, height: 58, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      ["Meta Model API", "Muse Code", "Muse"].forEach((s, i) => {
        txt(svg, HX[i], 153, s, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        el("path", { d: `M${HX[i] - 12} 174 V${HY - 12} a12 12 0 0 0 24 0`, stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, svg);
      });
      const muse = el("g", {}, svg);
      el("rect", { x: 596, y: 184, width: 172, height: 256, rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, muse);
      jacket(el("g", { transform: `translate(${HX[2]} ${HY + 36})` }, muse), SOFT, true);
      const tag = el("g", {}, muse);
      el("path", { d: "M0 0 V84", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("rect", { x: -56, y: 78, width: 112, height: 60, rx: 12, fill: MINT, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 0, cy: 91, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 0, 127, "soon", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      let poked = -99;
      button(muse, "Muse: will roll out first to subscribers, with no date.", () => { poked = api.now(); api.poke(); });
      const JK = [[0, 0, "Muse Wonder", YEL, 1.2, 0], [1, -88, "Muse Wonder", YEL, 2.8, -6], [1, 88, "Muse Wonder Full", LIL, 4.6, 12]].map(([h, dx, s, col, t0, px]) => {
        const g = el("g", { "pointer-events": "none" }, svg);
        el("path", { d: `M0 0 L${dx} 36`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        jacket(el("g", { transform: `translate(${dx} 36)` }, g), col);
        el("path", { d: `M${dx + px} 226 V246`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        pill(el("g", { transform: `translate(${dx + px} 264)` }, g), s, "#fff");
        return { g, x: HX[h], t0, amp: dx ? 4 : 9 };
      });
      const cap = strip(svg, 512, 720);
      return (t, now) => {
        const out = seg(t, 11.2, 11.8);
        JK.forEach((j) => {
          const q = seg(t, j.t0, j.t0 + 0.45), tt = t - j.t0 - 0.45, sw = tt < 0 ? 0 : j.amp * Math.exp(-2.2 * tt) * Math.sin(7 * tt);
          j.g.setAttribute("transform", `translate(${j.x} ${HY - 340 * (1 - q * q)}) rotate(${sw})`);
          j.g.setAttribute("opacity", seg(t, j.t0, j.t0 + 0.1) * (1 - out));
        });
        const w = now - poked, tt = t - 6.4, shake = w >= 0 && w < 1.2 ? Math.sin(w * 9) * 22 * (1 - w / 1.2) : 0;
        tag.setAttribute("opacity", w >= 0 && w < 4 ? 1 : tt < 0 ? 0 : seg(tt, 0, 0.15) * (1 - out));
        tag.setAttribute("transform", `translate(${HX[2]} ${HY}) rotate(${(tt < 0 ? 0 : -30 * Math.exp(-1.6 * tt) * Math.cos(6 * tt)) + Math.sin(now * 1.6) * 3 + shake})`);
        cap.textContent = w >= 0 && w < 4 ? "Muse: “will roll out first to subscribers”, with no date" : t < 1.2 || t >= 11.2 ? "Meta's launch post, 12 October 2026" : t < 4.6 ? "Muse Wonder: Meta Model API and Muse Code" : t < 6.4 ? "Muse Wonder Full: as a Muse Code subscriber" : "Muse itself comes later, with no date";
      };
    },
  };

  /* ---- 2. a toolbox opens; three tools work one plank side by side while a spirit level checks behind them ---- */
  SC.toolbox = {
    dur: 12, still: 8.2,
    build(svg) {
      txt(svg, 44, 62, "What is Muse Code?", { "font-size": 32, "font-weight": 700 });
      const F = 470, PT = 236, BX = 400, BT = 380;
      el("path", { d: `M30 ${F} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      [170, 600].forEach((x) => el("path", { d: `M${x - 48} ${F} L${x - 8} ${PT + 28} H${x + 8} L${x + 48} ${F} M${x - 31} ${F - 84} H${x + 31}`, stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, svg));
      const lev = el("g", {}, svg);
      el("rect", { x: -60, y: -32, width: 120, height: 32, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, lev);
      el("rect", { x: -26, y: -25, width: 52, height: 18, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, lev);
      const bub = el("circle", { cy: -16, r: 6, fill: SKY, stroke: INK, "stroke-width": 2 }, lev);
      el("path", { d: "M-9 -25 V-7 M9 -25 V-7", stroke: INK, "stroke-width": 2 }, lev);
      [-43, 43].forEach((x) => el("circle", { cx: x, cy: -16, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, lev));
      el("rect", { x: 60, y: PT, width: 680, height: 28, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M92 250 H150 M300 247 H372 M498 252 H560", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      const kerf = el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const nail = el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round", fill: "none" }, svg);
      const screw = el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round", fill: "none" }, svg);
      el("path", { d: `M${BX - 46} ${BT} V${BT - 22} a12 12 0 0 1 12 -12 H${BX + 34} a12 12 0 0 1 12 12 V${BT}`, stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, svg);
      el("rect", { x: BX - 110, y: BT, width: 220, height: F - BT - 2, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: BX - 86, y: BT + 22, width: 172, height: 46, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, BX, BT + 54, "Muse Code", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const flaps = [-1, 1].map((d) => { const g = el("g", {}, svg); el("rect", { x: d < 0 ? 0 : -112, y: -14, width: 112, height: 14, rx: 6, fill: SKY, stroke: INK, "stroke-width": 3 }, g); return { g, d }; });
      const ham = el("g", {}, svg);
      el("rect", { x: -8, y: -114, width: 16, height: 120, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, ham);
      el("rect", { x: -36, y: -130, width: 62, height: 30, rx: 7, fill: SKY, stroke: INK, "stroke-width": 3 }, ham);
      const saw = el("g", {}, svg);
      let bd = "M18 -18 L150 -5 L150 6";
      for (let k = 1; k <= 16; k++) bd += ` L${(150 - k * 8.25).toFixed(1)} ${(6 + k + (k % 2 ? 6 : 0)).toFixed(1)}`;
      el("path", { d: bd + " Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, saw);
      el("rect", { x: -28, y: -32, width: 52, height: 64, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, saw);
      el("rect", { x: -15, y: -16, width: 26, height: 32, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, saw);
      const scr = el("g", {}, svg);
      el("path", { d: "M0 0 V-54", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, scr);
      el("rect", { x: -15, y: -122, width: 30, height: 70, rx: 12, fill: LIL, stroke: INK, "stroke-width": 3 }, scr);
      const grip = [0, 1, 2, 3].map(() => el("path", { stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, scr));
      const LV = [[3.6, 130], [4.6, 325], [5.6, 325], [6.6, 521], [8.8, 521], [9.6, 325], [10.4, 130]];
      const lx = (t) => { for (let i = 1; i < LV.length; i++) if (t < LV[i][0]) return lerp(LV[i - 1][1], LV[i][1], io(seg(t, LV[i - 1][0], LV[i][0]))); return 130; };
      const cap = strip(svg, 506, 740);
      return (t) => {
        const out = seg(t, 10.9, 11.4), open = io(seg(t, 0.4, 1.1)) - io(seg(t, 11.3, 11.9));
        flaps.forEach((f) => f.g.setAttribute("transform", `translate(${BX + f.d * 110} ${BT}) rotate(${f.d * 118 * open})`));
        const place = (g, a, wx, wy, wr) => { const p = io(seg(t, a, a + 1)); tf(g, lerp(BX, wx, p), lerp(BT + 8, wy, p) - 70 * Math.sin(Math.PI * p), 0.35 + 0.65 * p, wr * p); g.setAttribute("opacity", seg(t, a, a + 0.12) * (1 - out)); return p >= 1; };
        const ph = (t * 2.1) % 1, up = ph < 0.7 ? Math.sin((ph / 0.7) * Math.PI) : 0;
        const hOn = t >= 2.2;
        place(ham, 1.2, 324, 186, -90 + 40 * (hOn ? up : 1));
        nail.setAttribute("d", `M203 ${222 + (hOn && !up ? 1.5 : 0)} H217 M210 222 V${PT}`); nail.setAttribute("opacity", seg(t, 1.9, 2.2) * (1 - out));
        const sOn = t >= 2.8, kd = 22 * seg(t, 2.8, 10.5), st = sOn ? Math.sin(t * 7) * 16 : 0;
        place(saw, 1.8, 620.5 + st * 0.707, 166.7 + st * 0.707 + kd, 45);
        kerf.setAttribute("d", `M670 ${PT} V${PT + Math.max(2, kd)}`); kerf.setAttribute("opacity", seg(t, 2.8, 3) * (1 - out));
        const cOn = t >= 3.4, sink = 9 * seg(t, 3.4, 10.5), sy = PT - 13 + sink;
        place(scr, 2.4, 440, sy, 0);
        screw.setAttribute("d", `M433 ${sy} H447 M440 ${sy} V${PT}`); screw.setAttribute("opacity", seg(t, 3, 3.3) * (1 - out));
        grip.forEach((g, k) => { const a = (cOn ? t * 6 : 0) + (k * Math.PI) / 2 + 0.5, x = 12 * Math.cos(a); g.setAttribute("d", `M${x.toFixed(1)} -110 V-64`); g.setAttribute("opacity", Math.sin(a) > 0 ? 1 : 0); });
        const x = lx(t);
        tf(lev, x, PT); lev.setAttribute("opacity", seg(t, 3.1, 3.5) * (1 - out));
        bub.setAttribute("cx", cl((lx(t - 0.18) - x) * 0.3, -14, 14));
        cap.textContent = t < 3.4 || t >= 10.9 ? "Muse Code is Meta's coding agent that runs in your terminal" : "Meta's developer home page: “Multi-agent coding in your terminal”";
      };
    },
  };

  /* ---- 3. a ladder of four plans; a ribbon ties onto the two rungs that carry Muse Wonder Full ---- */
  SC.ladder = {
    dur: 12, still: 9.4,
    build(svg, api) {
      txt(svg, 44, 62, "Four Muse Code plans", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a rung", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const PL = [
        ["Everyday Usage", "$5.00/month", ["10 to 50 prompts", "every 5 hours"]],
        ["High Usage", "$15.00/month", ["5x more than", "Everyday Usage"]],
        ["Power Usage", "$50.00/month", ["20x more than", "Everyday Usage"]],
        ["Maximum Usage", "$200.00/month", ["80x more than", "Everyday Usage"]],
      ];
      const RY = [416, 332, 248, 164], LX = 236, RX = 492, F = 478, KX = RX + 18;
      el("path", { d: `M30 ${F} H770`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const rungs = RY.map((y) => el("rect", { x: LX, y: y - 7, width: RX - LX, height: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, svg));
      [LX, RX].forEach((x) => el("rect", { x: x - 9, y: 112, width: 18, height: F - 112, rx: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, svg));
      let pinned = -1;
      const rows = PL.map(([name, price, use], i) => {
        const y = RY[i], g = el("g", {}, svg);
        el("rect", { x: 34, y: y - 20, width: 474, height: 82, rx: 18, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        txt(g, LX - 24, y + 8, name, { "text-anchor": "end", "font-size": 22, "font-weight": 700 });
        const c = el("g", {}, g);
        el("rect", { x: -100, y: 10, width: 200, height: 48, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
        txt(c, 0, 43, price, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        el("rect", { x: -17, y: -13, width: 34, height: 27, rx: 6, fill: MINT, stroke: INK, "stroke-width": 2.5 }, c);
        button(g, `${name}, ${price}: ${use.join(" ")}`, () => { pinned = i; api.poke(); });
        return { c, y, a: 1 + i * 0.9 };
      });
      const note = el("g", {}, svg);
      el("rect", { x: 546, y: 292, width: 222, height: 158, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, note);
      txt(note, 566, 328, "Usage listed", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const n0 = txt(note, 566, 364, "", { "font-size": 22, "font-weight": 700 }), n1 = txt(note, 566, 400, "", { "font-size": 20, "font-weight": 500 }), n2 = txt(note, 566, 428, "", { "font-size": 20, "font-weight": 500 });
      const rib = el("g", { "pointer-events": "none" }, svg);
      const band = (d) => [el("path", { d, stroke: INK, "stroke-width": 13, fill: "none", "stroke-linecap": "round" }, rib), el("path", { d, stroke: LIL, "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, rib)];
      const loose = [band(`M${KX} 248 q-14 30 -2 54`), band(`M${KX} 248 q16 24 10 50`), band(`M${KX} 164 Q${KX + 20} 172 546 190`), band(`M${KX} 248 Q${KX + 20} 240 546 222`)].flat();
      const ban = el("g", {}, rib);
      el("path", { d: "M544 168 H768 L752 206 L768 244 H544 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ban);
      txt(ban, 648, 200, "Muse Wonder", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(ban, 648, 230, "Full", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const bows = [248, 164].map((y) => {
        const g = el("g", {}, rib);
        el("path", { d: "M0 0 L-17 -14 Q-26 0 -17 14 Z M0 0 L17 -14 Q26 0 17 14 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("circle", { r: 6.5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
        return { g, y };
      });
      const cap = strip(svg, 508, 740);
      return (t) => {
        const out = seg(t, 11.2, 11.8);
        let last = 0;
        rows.forEach((r, i) => {
          const k = ob(seg(t, r.a, r.a + 0.45));
          r.c.setAttribute("transform", `translate(${(LX + RX) / 2} ${r.y + 46 * (1 - cl(k, 0, 1.15))})`);
          r.c.setAttribute("opacity", seg(t, r.a, r.a + 0.12) * (1 - out));
          if (t >= r.a + 0.2 && !out) last = i;
        });
        const show = pinned >= 0 ? pinned : last;
        rungs.forEach((r, i) => r.setAttribute("fill", i === show ? SKY : YEL));
        n0.textContent = PL[show][0]; n1.textContent = PL[show][2][0]; n2.textContent = PL[show][2][1];
        bows.forEach((b, i) => { const k = ob(seg(t, 5.4 + i * 0.4, 5.8 + i * 0.4)); tf(b.g, KX, b.y, cl(k, 0, 1.3)); b.g.setAttribute("opacity", (k <= 0.01 ? 0 : 1) * (1 - out)); });
        const lo = seg(t, 6, 6.3) * (1 - out);
        loose.forEach((p) => p.setAttribute("opacity", lo));
        const bk = ob(seg(t, 6.3, 6.9));
        ban.setAttribute("transform", `translate(544 206) scale(${cl(bk, 0, 1.1)} 1) translate(-544 -206)`);
        ban.setAttribute("opacity", (bk <= 0.01 ? 0 : 1) * (1 - out));
        cap.textContent = t >= 6.3 && t < 11.2 ? "Muse Wonder Full: on the Power Usage and Maximum Usage plans" : "Meta's Muse Code page listed four plans on 13 Oct 2026";
      };
    },
  };

  /* ---- 4. a magnifying glass slides down a sheet and enlarges the highest number in each row ---- */
  SC.magnifier = {
    dur: 12, still: 9.8,
    build(svg, api) {
      txt(svg, 44, 62, "Meta's own figures", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap a row", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      txt(svg, 44, 98, "Four coding rows from Meta's model card. We did not run them.", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const SX = 34, SY = 122, SW = 722, RH = 84, NX = 646, CR = 572;
      const ROWS = [
        ["Terminal-Bench 4.0-AA", "59.6", "Claude Opus 5.5", "", LIL, "Terminal-Bench 4.0-AA: 59.6 against 57.1 for Muse Wonder Full"],
        ["DeepSWE 1.1", "79.0", "Muse Wonder Full", "", YEL, "DeepSWE 1.1: 79.0 against 74.2 for Claude Opus 5.5"],
        ["SWE-Marathon", "57.5", "Muse Wonder Full (xhigh)", "(xhigh)", YEL, "SWE-Marathon: “not a controlled common-harness comparison”"],
        ["ProgramBench", "70.5", "Claude Opus 5.5", "", LIL, "ProgramBench: 70.5 against 59.0 for Muse Wonder Full"],
      ];
      const RY = (i) => SY + 6 + RH * (i + 0.5), S = [1, 3.2, 5.4, 7.6];
      el("rect", { x: SX + 10, y: SY + 10, width: SW, height: 4 * RH + 12, rx: 20, fill: LIL }, svg);
      el("rect", { x: SX, y: SY, width: SW, height: 4 * RH + 12, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      [1, 2, 3].forEach((i) => el("path", { d: `M${SX + 22} ${SY + 6 + RH * i} H${SX + SW - 22}`, stroke: SOFT, "stroke-width": 3, "stroke-linecap": "round" }, svg));
      let user = null, curY = RY(0);
      const rows = ROWS.map(([name, num, who, , col, line], i) => {
        const y = RY(i), g = el("g", {}, svg);
        el("rect", { x: SX + 8, y: y - 36, width: SW - 16, height: 72, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        txt(g, SX + 24, y + 8, name, { "font-size": 23, "font-weight": 700 });
        const res = el("g", {}, g), chip = el("g", {}, res), w = pill(chip, who, col);
        chip.setAttribute("transform", `translate(${CR - w / 2} ${y})`);
        txt(res, NX, y + 11, num, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        button(g, line, () => { user = { from: curY, to: y, t0: api.now(), i }; api.poke(); });
        return { res, y };
      });
      const lens = el("g", { "pointer-events": "none" }, svg);
      el("path", { d: "M48 28 L100 58", stroke: INK, "stroke-width": 15, "stroke-linecap": "round" }, lens);
      el("path", { d: "M58 34 L98 57", stroke: YEL, "stroke-width": 7, "stroke-linecap": "round" }, lens);
      el("circle", { r: 58, fill: "#fff", stroke: INK, "stroke-width": 5 }, lens);
      el("circle", { r: 55, fill: SKY, "fill-opacity": 0.35 }, lens);
      el("path", { d: "M-42 -20 A47 47 0 0 1 -16 -44", stroke: "#fff", "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, lens);
      const big = txt(lens, 0, 15, "", { "text-anchor": "middle", "font-size": 42, "font-weight": 700 });
      const sm = txt(lens, 0, 38, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      const cap = strip(svg, 508, 740);
      return (t, now) => {
        const out = seg(t, 11.2, 11.7);
        let y = RY(0), cur = -1;
        S.forEach((s, i) => { y = lerp(y, RY(i), io(seg(t, s, s + 0.6))); if (t >= s + 0.3) cur = i; });
        if (user) y = lerp(user.from, user.to, io(cl((now - user.t0) / 0.5)));
        curY = y;
        rows.forEach((r, i) => { const k = user ? 1 : seg(t, S[i] + 0.45, S[i] + 0.65) * (1 - out); r.res.setAttribute("opacity", k); });
        let near = 0; ROWS.forEach((_, i) => { if (Math.abs(RY(i) - y) < Math.abs(RY(near) - y)) near = i; });
        const q = ROWS[near][3], on = 1 - cl(Math.abs(RY(near) - y) / 26);
        big.textContent = ROWS[near][1]; big.setAttribute("y", q ? 6 : 15); big.setAttribute("opacity", on);
        sm.textContent = q; sm.setAttribute("opacity", on);
        tf(lens, NX, y, user ? 1 : 0.6 + 0.4 * ob(seg(t, 0.8, 1.3))); lens.setAttribute("opacity", user ? 1 : seg(t, 0.8, 1) * (1 - out));
        cap.textContent = user ? ROWS[user.i][5] : cur < 0 || t >= 11.2 ? "Each number is Meta's own figure" : t > 9.5 ? "Muse Wonder Full leads two rows, Claude Opus 5.5 the other two" : ROWS[cur][5];
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 66, 118, "Meta's new models, prices and scores", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 62, 220, "Muse Wonder", { "font-size": 82, "font-weight": 700 });
      el("path", { d: "M68 252 H594", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      el("rect", { x: 62, y: 296, width: 312, height: 56, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 218, 333, "Checked 13 Oct 2026", { "text-anchor": "middle", "font-size": 25, "font-weight": 700 });
      el("path", { d: "M70 452 C190 396 300 492 420 436 S560 400 612 372", stroke: LIL, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-dasharray": "1 16" }, svg);
      el("circle", { cx: 70, cy: 452, r: 11, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const c = el("g", { transform: "translate(758 300)" }, svg);
      el("circle", { cy: -152, r: 15, fill: "none", stroke: INK, "stroke-width": 5 }, c);
      el("rect", { x: -13, y: -146, width: 26, height: 18, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, c);
      el("circle", { r: 134, fill: YEL, stroke: INK, "stroke-width": 3 }, c);
      el("circle", { r: 110, fill: "#fff", stroke: INK, "stroke-width": 3 }, c);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * 6.2832, r0 = i % 4 ? 92 : 82; el("path", { d: `M${(Math.cos(a) * r0).toFixed(1)} ${(Math.sin(a) * r0).toFixed(1)} L${(Math.cos(a) * 101).toFixed(1)} ${(Math.sin(a) * 101).toFixed(1)}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, c); }
      const n = el("g", { transform: "rotate(38)" }, c);
      el("path", { d: "M0 -76 L17 0 H-17 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, n);
      el("path", { d: "M0 76 L17 0 H-17 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, n);
      el("circle", { r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, n);
      [[640, 146, 15, SKY], [878, 470, 18, MINT], [540, 474, 12, YEL]].forEach(([x, y, r, col]) => el("path", { d: `M0 ${-r} Q0 0 ${r} 0 Q0 0 0 ${r} Q0 0 ${-r} 0 Q0 0 0 ${-r} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: `translate(${x} ${y})` }, svg));
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
