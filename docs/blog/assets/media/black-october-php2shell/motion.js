/* Bright coded scenes for "Black October: What PHP2Shell Is and How to Patch". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878", GREY = "#DCD6E3";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  /* text with mono runs: parts is a list of [string, isMono] */
  const rich = (p, x, y, parts, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); parts.forEach(([s, m]) => { const t = el("tspan", m ? { "font-family": MONO, "font-weight": 700 } : {}, n); t.textContent = s; }); return n; };
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
  /* a pill button with a focus ring, and the muted hint beside it */
  const pill = (svg, x, y, w, label, col, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x: x - 6, y: y - 6, width: w + 12, height: 56, rx: 28, fill: "none", stroke: INK, "stroke-width": 2.5, class: "mg-ring" }, g);
    el("rect", { x, y, width: w, height: 44, rx: 22, fill: col, stroke: INK, "stroke-width": 3 }, g);
    txt(g, x + w / 2, y + 29, label, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
    button(g, label, fn);
    return g;
  };
  const hint = (svg, x, y, s, anchor = "end") => txt(svg, x, y, s, { "text-anchor": anchor, "font-size": 16, "font-weight": 500, fill: MUTE });
  /* a mint tick in a round badge, drawn around 0,0 */
  const badge = (p, r = 18) => {
    const g = el("g", {}, p);
    el("circle", { r, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
    el("path", { d: `M${-r * 0.42} ${r * 0.02} L${-r * 0.1} ${r * 0.34} L${r * 0.44} ${-r * 0.32}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
    return g;
  };

  const SC = {};

  /* ---- 1. the October 2026 calendar: the 21st gets ringed and the page turns into Black October ---- */
  SC.calendar = {
    dur: 10, still: 9.6,
    build(svg, api) {
      const X = 50, Y = 64, W = 420, CW = 56, CH = 60, GX = X + (W - 7 * CW) / 2, GY = Y + 104;
      el("circle", { cx: X + W / 2, cy: 24, r: 6, fill: INK }, svg);
      el("path", { d: `M${X + W / 2} 24 L${X + 80} ${Y} M${X + W / 2} 24 L${X + W - 80} ${Y}`, stroke: INK, "stroke-width": 2, fill: "none" }, svg);
      el("rect", { x: X + 10, y: Y + 10, width: W, height: 480, rx: 20, fill: SOFT }, svg);
      el("rect", { x: X, y: Y, width: W, height: 480, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const head = el("path", { d: `M${X} ${Y + 84} V${Y + 20} Q${X} ${Y} ${X + 20} ${Y} H${X + W - 20} Q${X + W} ${Y} ${X + W} ${Y + 20} V${Y + 84} Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      [X + 80, X + W - 80].forEach((x) => el("circle", { cx: x, cy: Y, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      const hg = el("g", {}, svg);
      const h1 = txt(hg, 0, 13, "October 2026", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      const h2 = txt(hg, 0, 13, "Black October", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      for (let r = 1; r < 5; r++) el("path", { d: `M${GX} ${GY + r * CH} H${GX + 7 * CW}`, stroke: SOFT, "stroke-width": 2 }, svg);
      let c21 = null;
      for (let d = 1; d <= 31; d++) {
        const i = d + 2, cx = GX + (i % 7) * CW + CW / 2, cy = GY + Math.floor(i / 7) * CH + CH / 2;
        txt(svg, cx, cy + 8, String(d), { "text-anchor": "middle", "font-size": 22, "font-weight": d === 21 ? 700 : 500, fill: d === 21 ? INK : CAP });
        if (d === 21) c21 = [cx, cy];
      }
      const ring = el("circle", { cx: c21[0], cy: c21[1], r: 25, fill: "none", stroke: YEL, "stroke-width": 7, pathLength: 1, "stroke-dasharray": 1, "stroke-linecap": "round", transform: `rotate(-90 ${c21[0]} ${c21[1]})` }, svg);
      const lx = GX + 3 * CW;
      const lead = el("path", { d: `M${c21[0] + 19} ${c21[1] + 18} Q${lx} ${c21[1] + 24} ${lx} ${c21[1] + 44} V${GY + 5 * CH + 18}`, stroke: INK, "stroke-width": 2.5, fill: "none", pathLength: 1, "stroke-dasharray": 1, "stroke-linecap": "round" }, svg);
      const lab = el("g", {}, svg);
      el("rect", { x: -90, y: 0, width: 180, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, lab);
      txt(lab, 0, 27, "Fixes released", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const tag = el("g", {}, svg);
      el("path", { d: "M10 52 L48 14 H250 V196 H48 L10 158 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 42, cy: 105, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 72, 74, "PHP2Shell", { "font-family": MONO, "font-size": 28, "font-weight": 700 });
      el("path", { d: "M72 94 H230", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 7", "stroke-linecap": "round" }, tag);
      txt(tag, 72, 134, "2 CVEs", { "font-size": 26, "font-weight": 700 });
      txt(tag, 72, 172, "CVSS 9.2", { "font-size": 26, "font-weight": 700 });
      hint(svg, 604, 559, "tap Replay");
      pill(svg, 622, 530, 130, "Replay", SKY, () => api.seek(0));
      return (t) => {
        ring.setAttribute("stroke-dashoffset", 1 - io(seg(t, 1.2, 2.2)));
        lead.setAttribute("stroke-dashoffset", 1 - seg(t, 2.1, 2.6));
        const p = ob(seg(t, 2.5, 2.9)); tf(lab, lx, GY + 5 * CH + 18, p); lab.setAttribute("opacity", seg(t, 2.5, 2.6));
        const s = oc(seg(t, 3.4, 4.2)); tf(tag, 508 + 300 * (1 - s), 196, 1, 4 * (1 - s) - 2); tag.setAttribute("opacity", seg(t, 3.4, 3.7));
        const f = seg(t, 5.6, 6.4), first = f < 0.5, sy = first ? 1 - io(f * 2) : io(f * 2 - 1);
        hg.setAttribute("transform", `translate(${X + W / 2} ${Y + 42}) scale(1 ${Math.max(sy, 0.001)})`);
        h1.setAttribute("opacity", first ? 1 : 0); h2.setAttribute("opacity", first ? 0 : 1);
        head.setAttribute("fill", first ? LIL : BLUE);
      };
    },
  };

  /* ---- 2. a conveyor: Request 1 hits the memory limit, leaves a stale note, Request 2 takes it ---- */
  SC.conveyor = {
    dur: 11, still: 10.6,
    build(svg, api) {
      const BY = 430, NX = 480, S = 1.25;
      el("path", { d: `M90 ${BY + 34} V505 M710 ${BY + 34} V505 M70 505 H110 M690 505 H730`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: 30, y: BY, width: 740, height: 34, rx: 17, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const rollers = Array.from({ length: 11 }, (_, i) => { const g = el("g", {}, svg); el("circle", { r: 10, fill: SOFT, stroke: INK, "stroke-width": 2 }, g); el("path", { d: "M-6 0 H6", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g); return { g, x: 64 + i * 67 }; });
      /* gauge */
      txt(svg, 700, 100, "Memory limit", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      el("rect", { x: 680, y: 118, width: 40, height: 230, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const gf = el("rect", { x: 686, width: 28, rx: 14, fill: BLUE }, svg);
      el("path", { d: "M670 132 H730", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const tray = (label, col) => {
        const g = el("g", {}, svg), blocks = [];
        el("path", { d: "M-95 -100 V0 H95 V-100", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) blocks.push(el("rect", { x: -86 + c * 44, y: -55 - r * 20, width: 40, height: 17, rx: 5, fill: [BLUE, LIL, SKY][(r + c) % 3], stroke: INK, "stroke-width": 2 }, g));
        el("rect", { x: -95, y: -36, width: 190, height: 36, fill: col, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, -12, label, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
        return { g, blocks };
      };
      const t1 = tray("Request 1", SKY), t2 = tray("Request 2", LIL);
      t2.blocks.forEach((b) => b.setAttribute("opacity", 0));
      const note = el("g", {}, svg);
      el("path", { d: "M-38 -38 H38 V24 L24 38 H-38 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, note);
      el("path", { d: "M38 24 H24 V38", fill: "none", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, note);
      txt(note, 0, -6, "Stale", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      txt(note, 0, 16, "state", { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
      hint(svg, 584, 559, "tap Next request");
      pill(svg, 600, 530, 160, "Next request", YEL, () => api.seek(6));
      const x1 = (t) => -130 + 430 * seg(t, 0.3, 4.4);
      const x2 = (t) => -140 + 400 * oc(seg(t, 6.2, 7.6)) + 270 * io(seg(t, 8.5, 9.8));
      return (t) => {
        const a = x1(t), b = x2(t), travel = a + 110 + b + 120;
        rollers.forEach((r) => tf(r.g, r.x, BY + 17, 1, (travel / 10) * 57.3));
        const k = seg(t, 1.0, 4.4), drain = seg(t, 5.4, 6.2), lvl = k * (1 - drain), h = 218 * lvl;
        gf.setAttribute("y", 342 - h); gf.setAttribute("height", Math.max(h, 0)); gf.setAttribute("opacity", h > 1 ? 1 : 0);
        gf.setAttribute("fill", k >= 1 && drain < 0.5 ? YEL : BLUE);
        const jolt = Math.sin(seg(t, 4.4, 4.9) * Math.PI * 4) * 3 * (1 - seg(t, 4.4, 4.9)), lift = io(seg(t, 5.3, 5.9));
        tf(t1.g, a, BY - 120 * lift, S, jolt); t1.g.setAttribute("opacity", 1 - lift);
        t1.blocks.forEach((n, i) => n.setAttribute("opacity", k * 12 > i ? 1 : 0));
        tf(t2.g, b, BY, S);
        /* the note: pops out of tray 1, lands on the belt, then hops into tray 2 and rides along */
        const pop = seg(t, 4.7, 5.2), hop = seg(t, 7.7, 8.2);
        let nx, ny, nr, no = 1;
        if (t < 4.7) { nx = a; ny = BY - 75; nr = 0; no = 0; }
        else if (hop <= 0) { const q = io(pop); nx = a + (NX - a) * q; ny = BY - 75 - 90 * Math.sin(q * Math.PI) + 21 * q; nr = -4 * q; }
        else { const q = io(hop); nx = NX + (b - NX) * q; ny = BY - 54 - 70 * Math.sin(q * Math.PI) - 41 * q; nr = -4 + 7 * q; }
        if (t >= 8.2) { nx = b; ny = BY - 95; nr = 3; }
        tf(note, nx, ny, S, nr); note.setAttribute("opacity", no);
      };
    },
  };

  /* ---- 3. a tally counter clicks through four stops ---- */
  SC.tally = {
    dur: 11.5, still: 11,
    build(svg, api) {
      const ST = [1.0, 3.2, 5.4, 7.6], SX = [115, 305, 495, 685], TY = 420;
      const STOP = [["10 hours before", "thousands"], ["45 minutes after", "tens of thousands"], ["2 hours after", "hundreds of thousands"], ["later", "millions"]];
      el("path", { d: "M30 280 H770", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: "M30 290 H770", stroke: SOFT, "stroke-width": 8, "stroke-linecap": "round" }, svg);
      const plunger = el("g", {}, svg);
      el("rect", { x: 382, y: 82, width: 36, height: 30, fill: GREY, stroke: INK, "stroke-width": 3 }, plunger);
      el("rect", { x: 362, y: 62, width: 76, height: 26, rx: 13, fill: LIL, stroke: INK, "stroke-width": 3 }, plunger);
      el("circle", { cx: 660, cy: 192, r: 28, fill: "none", stroke: INK, "stroke-width": 9 }, svg);
      el("circle", { cx: 660, cy: 192, r: 28, fill: "none", stroke: GREY, "stroke-width": 4 }, svg);
      el("rect", { x: 170, y: 104, width: 460, height: 176, rx: 70, fill: GREY, stroke: INK, "stroke-width": 3.5 }, svg);
      el("rect", { x: 210, y: 154, width: 380, height: 76, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "mg-bo-tally-win" }, defs);
      el("rect", { x: 212, y: 156, width: 376, height: 72, rx: 12 }, cp);
      const win = el("g", { "clip-path": "url(#mg-bo-tally-win)" }, svg);
      const vals = STOP.map((s) => txt(win, 400, 202, s[1], { "text-anchor": "middle", "font-size": 28, "font-weight": 700 }));
      const tag = el("g", {}, svg);
      el("path", { d: "M-210 0 H200 L216 22 L200 44 H-210 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 196, cy: 22, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      txt(tag, -6, 30, "Attempts, not confirmed breaches", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      el("path", { d: `M${SX[0]} ${TY} H${SX[3]}`, stroke: SOFT, "stroke-width": 10, "stroke-linecap": "round" }, svg);
      const track = el("path", { stroke: LIL, "stroke-width": 10, "stroke-linecap": "round" }, svg);
      const dots = STOP.map((s, i) => {
        const halo = el("circle", { cx: SX[i], cy: TY, r: 20, fill: "none", stroke: LIL, "stroke-width": 3 }, svg);
        const d = el("circle", { cx: SX[i], cy: TY, r: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        txt(svg, SX[i], TY + 46, s[0], { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        txt(svg, SX[i], TY + 72, s[1], { "text-anchor": "middle", "font-size": 16, "font-weight": 500, fill: CAP });
        return { d, halo };
      });
      let man = -1, at = 0, last = 0;
      const idxAt = (t) => { let i = -1; ST.forEach((s, j) => { if (t >= s) i = j; }); return i; };
      hint(svg, 646, 51, "tap Step");
      pill(svg, 660, 22, 104, "Step", SKY, () => {
        const cur = man >= 0 ? man : idxAt(last);
        if (cur >= 3) { man = 3; at = api.now() - 9; } else { man = cur + 1; at = api.now(); }
        api.poke();
      });
      return (t, now) => {
        last = t;
        const tt = man < 0 ? t : man === 3 ? Math.min(ST[3] + (now - at), 11) : Math.min(ST[man] + (now - at), ST[man] + 1.2);
        const i = idxAt(tt), k = i < 0 ? 1 : oc(seg(tt, ST[i], ST[i] + 0.4));
        const press = i < 0 ? 0 : Math.sin(seg(tt, ST[i], ST[i] + 0.3) * Math.PI);
        plunger.setAttribute("transform", `translate(0 ${12 * press})`);
        vals.forEach((v, j) => {
          const y = j === i ? 40 * (1 - k) : j === i - 1 ? -40 * k : 0, o = j === i ? k : j === i - 1 ? 1 - k : 0;
          v.setAttribute("transform", `translate(0 ${y})`); v.setAttribute("opacity", o);
        });
        track.setAttribute("d", `M${SX[0]} ${TY} H${i > 0 ? SX[i - 1] + (SX[i] - SX[i - 1]) * k : SX[0]}`);
        track.setAttribute("opacity", i > 0 ? 1 : 0);
        dots.forEach((d, j) => {
          d.d.setAttribute("fill", j <= i ? LIL : "#fff");
          const q = j === i ? seg(tt, ST[i], ST[i] + 0.6) : 1;
          d.halo.setAttribute("opacity", j === i ? 1 - q * 0.4 : 0); d.halo.setAttribute("r", 14 + 8 * oc(q));
        });
        const g = oc(seg(tt, 8.6, 9.2)); tf(tag, 400, 316 - 16 * (1 - g)); tag.setAttribute("opacity", g);
      };
    },
  };

  /* ---- 4. a clipboard checklist ticks itself off ---- */
  SC.clipboard = {
    dur: 10, still: 9.6,
    build(svg, api) {
      const T = [1.2, 2.5, 3.8, 5.1], RY = [170, 255, 340, 425], BX = 190;
      const ROWS = [[["Run ", 0], ["php -v", 1]], [["Update to the fixed release", 0]], [["Keep the WAF on", 0]], [["Check logs from 17 Oct", 0]]];
      el("rect", { x: 152, y: 72, width: 520, height: 500, rx: 22, fill: LIL }, svg);
      el("rect", { x: 140, y: 60, width: 520, height: 500, rx: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 330, y: 36, width: 140, height: 56, rx: 14, fill: GREY, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 400, cy: 56, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const ticks = RY.map((y, i) => {
        el("rect", { x: BX, y: y - 23, width: 46, height: 46, rx: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
        rich(svg, 262, y + 9, ROWS[i], { "font-size": 26, "font-weight": 600 });
        if (i < 3) el("path", { d: `M190 ${y + 42} H610`, stroke: SOFT, "stroke-width": 2 }, svg);
        const g = el("g", {}, svg);
        const d = "M-12 1 L-4 10 L13 -11";
        el("path", { d, stroke: INK, "stroke-width": 10, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        el("path", { d, stroke: MINT, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        return { g, x: BX + 23, y };
      });
      const note = el("g", {}, svg);
      el("rect", { x: -182, y: -30, width: 364, height: 60, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, note);
      txt(note, 0, 8, "Plugins alone do not fix it", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      let man = -1, at = 0, last = 0;
      const countAt = (t) => T.filter((s) => t >= s).length;
      hint(svg, 778, 510, "tap Check");
      pill(svg, 682, 528, 96, "Check", MINT, () => {
        const cur = man >= 0 ? man : countAt(last);
        man = cur >= 4 ? 1 : cur + 1; at = api.now(); api.poke();
      });
      const land = (g, x, y, k) => { tf(g, x, y - 34 * (1 - k), 1.5 - 0.5 * k, -12 * (1 - k)); g.setAttribute("opacity", k > 0 ? 1 : 0); };
      return (t, now) => {
        last = t;
        let nk;
        if (man < 0) {
          ticks.forEach((s, i) => land(s.g, s.x, s.y, oc(seg(t, T[i], T[i] + 0.35))));
          nk = ob(seg(t, 6.6, 7.1));
        } else {
          const e = now - at;
          ticks.forEach((s, i) => land(s.g, s.x, s.y, i < man - 1 ? 1 : i === man - 1 ? oc(seg(e, 0, 0.35)) : 0));
          nk = man === 4 ? ob(seg(e, 0.4, 0.9)) : 0;
        }
        tf(note, 400, 510 + 20 * (1 - nk), 1, -2); note.setAttribute("opacity", cl(nk));
      };
    },
  };

  /* ---- title card, 16 by 9: a server rack whose four PHP versions get a tick in turn ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 5.8,
    build(svg) {
      el("rect", { x: 64, y: 90, width: 132, height: 42, rx: 21, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 130, 118, "Security", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 60, 238, "Black", { "font-size": 100, "font-weight": 700 });
      txt(svg, 60, 336, "October", { "font-size": 100, "font-weight": 700 });
      el("path", { d: "M66 364 H468", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      rich(svg, 64, 418, [["What ", 0], ["PHP2Shell", 1], [" is and how to patch", 0]], { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 464, "Checked 23 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      const RX = 600, RW = 250;
      el("rect", { x: RX + 12, y: 82, width: RW, height: 400, rx: 18, fill: SOFT }, svg);
      el("rect", { x: RX, y: 70, width: RW, height: 400, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3.5 }, svg);
      el("path", { d: `M${RX + 30} 470 V490 H${RX + 60} V470 M${RX + RW - 60} 470 V490 H${RX + RW - 30} V470`, fill: GREY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      const V = ["8.5.12", "8.4.27", "8.3.36", "8.2.35"];
      const ticks = V.map((v, i) => {
        const y = 96 + i * 92;
        el("rect", { x: RX + 22, y, width: RW - 44, height: 72, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
        txt(svg, RX + 42, y + 46, v, { "font-family": MONO, "font-size": 28, "font-weight": 700 });
        [0, 1, 2].forEach((j) => el("path", { d: `M${RX + 172 + j * 12} ${y + 24} V${y + 48}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg));
        el("circle", { cx: RX + RW + 42, cy: y + 36, r: 18, fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 5" }, svg);
        const b = badge(svg, 18);
        return { b, x: RX + RW + 42, y: y + 36, at: 0.8 + i * 0.9 };
      });
      return (t) => ticks.forEach((s) => { const k = ob(seg(t, s.at, s.at + 0.4)); tf(s.b, s.x, s.y, cl(k, 0, 1.3)); s.b.setAttribute("opacity", t >= s.at ? 1 : 0); });
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
