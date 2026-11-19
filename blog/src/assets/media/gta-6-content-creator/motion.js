/* Halftone comic panel scenes for "GTA 6 content creator kit". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", AQUA = "#3FC6C9", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 700, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 500, "text-anchor": "middle" }, a));
  const HALO = { stroke: "#fff", "stroke-width": 10, "paint-order": "stroke", "stroke-linejoin": "round" };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const mix = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const pop = (n, x, y, k, r = 0) => { n.setAttribute("opacity", k > 0 ? 1 : 0); tf(n, x, y, Math.max(ob(k), 0.001), r); };
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let uid = 0;
  const id = (p) => `gcc-${p}-${++uid}`;
  const button = (g, label, fn, lift) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
    if (lift) { // hover and focus: the panel lifts off its shadow
      if (!calm) lift.style.transition = "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)";
      const up = () => { lift.style.transform = "translate(-5px, -6px)"; }, down = () => { lift.style.transform = ""; };
      g.addEventListener("pointerenter", up); g.addEventListener("pointerleave", down); g.addEventListener("focus", up); g.addEventListener("blur", down);
    }
  };

  /* ---- comic kit: page, halftone, panel, caption tab, action lines, round figure ---- */
  const sheet = (svg, W, H) => { el("rect", { x: 28, y: 28, width: W - 56, height: H - 56, rx: 16, fill: SOFT }, svg); return el("g", {}, svg); };
  const fade = (g, t, dur) => g.setAttribute("opacity", 1 - io(seg(t, dur - 0.6, dur)));
  const halftone = (g, x, y, w, h, col, corner) => { // dots shrink away from one corner
    const s = 20, box = el("g", { fill: col }, g);
    for (let r = 0; r * (s / 2) <= h; r++) for (let c = 0; c * s <= w + s; c++) {
      const u = (c * s + (r % 2 ? s / 2 : 0)) / w, v = (r * s) / 2 / h;
      const d = corner === "br" ? (u + v) / 2 : corner === "tl" ? 1 - (u + v) / 2 : corner === "tr" ? (u + 1 - v) / 2 : corner === "bl" ? (1 - u + v) / 2 : corner === "b" ? v : 0.62;
      const rad = 6.6 * cl((d - 0.36) / 0.64);
      if (rad > 0.9) el("circle", { cx: (x + u * w).toFixed(1), cy: (y + v * h).toFixed(1), r: rad.toFixed(1) }, box);
    }
    return box;
  };
  const panel = (parent, x, y, w, h, o = {}) => {
    const g = el("g", { opacity: 0 }, parent), lift = el("g", {}, g), cid = id("clip");
    el("rect", { x: 10, y: 10, width: w, height: h, rx: 6, fill: LIL }, lift);
    el("rect", { width: w, height: h, rx: 6 }, el("clipPath", { id: cid }, lift));
    el("rect", { width: w, height: h, rx: 6, fill: "#fff" }, lift);
    const body = el("g", { "clip-path": `url(#${cid})` }, lift);
    if (o.tone) halftone(body, 0, 0, w, h, o.tone, o.corner || "br");
    const art = el("g", {}, body);
    el("rect", { width: w, height: h, rx: 6, fill: "none", stroke: INK, "stroke-width": 5 }, lift);
    el("rect", { x: -9, y: -9, width: w + 28, height: h + 28, rx: 14, fill: "none", stroke: BLUE, "stroke-width": 5, class: "mg-ring" }, lift);
    const open = (k) => { // page turn snap: swings open from its left edge and overshoots
      g.setAttribute("opacity", k > 0 ? 1 : 0);
      g.setAttribute("transform", `translate(${x} ${y}) skewY(${-7 * (1 - oc(k))}) scale(${Math.max(ob(k), 0.001)} 1)`);
    };
    return { g, lift, body, art, x, y, w, h, open };
  };
  const tab = (parent, w, h, col) => { // caption box, drawn around 0,0
    const g = el("g", { opacity: 0 }, parent);
    el("rect", { x: -w / 2 + 7, y: -h / 2 + 7, width: w, height: h, rx: 5, fill: LIL }, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 5, fill: col, stroke: INK, "stroke-width": 4 }, g);
    return g;
  };
  const rays = (g, n, r0, r1, a0 = 0, a1 = 6.2832, sw = 4) => {
    for (let i = 0; i < n; i++) { const a = a0 + ((a1 - a0) * i) / (a1 - a0 > 6.2 ? n : n - 1), c = Math.cos(a), s = Math.sin(a); el("path", { d: `M${(c * r0).toFixed(1)} ${(s * r0).toFixed(1)} L${(c * r1).toFixed(1)} ${(s * r1).toFixed(1)}`, stroke: INK, "stroke-width": sw, "stroke-linecap": "round" }, g); }
    return g;
  };
  const burst = (parent, x, y, n = 8, r0 = 30, r1 = 54, a0, a1) => { // action lines that flash on a hit
    const g = rays(el("g", { opacity: 0 }, parent), n, r0, r1, a0, a1);
    return (k) => { g.setAttribute("opacity", k <= 0 || k >= 1 ? 0 : 1 - k * k); tf(g, x, y, 0.55 + 0.6 * oc(k)); };
  };
  const figure = (p, col, s = 1) => { // round head, two dots, rounded body
    const g = el("g", {}, p);
    el("rect", { x: -34 * s, y: -4 * s, width: 68 * s, height: 78 * s, rx: 30 * s, fill: col, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cy: -36 * s, r: 30 * s, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cx: -10 * s, cy: -38 * s, r: 3.4 * s, fill: INK }, g); el("circle", { cx: 10 * s, cy: -38 * s, r: 3.4 * s, fill: INK }, g);
    return g;
  };
  const card = (g, x, y, w, h, fill = "#fff", rx = 8) => { el("rect", { x: x + 7, y: y + 7, width: w, height: h, rx, fill: LIL }, g); return el("rect", { x, y, width: w, height: h, rx, fill, stroke: INK, "stroke-width": 3 }, g); };
  const stampMark = (parent, w, h, size) => { // the inked mark, drawn around 0,0
    const g = el("g", { opacity: 0 }, parent);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 14, fill: "#fff", stroke: BLUE, "stroke-width": 6 }, g);
    el("rect", { x: -w / 2 + 10, y: -h / 2 + 10, width: w - 20, height: h - 20, rx: 8, fill: "none", stroke: BLUE, "stroke-width": 2.5 }, g);
    txt(g, 0, size * 0.35, "You approve", { "text-anchor": "middle", "font-size": size });
    return g;
  };
  const stampTool = (parent, s = 1) => {
    const g = el("g", { opacity: 0 }, parent);
    el("rect", { x: -22 * s, y: -74 * s, width: 44 * s, height: 60 * s, rx: 8 * s, fill: LIL, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { cy: -94 * s, r: 34 * s, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: `M${-18 * s} ${-106 * s} Q${-8 * s} ${-118 * s} ${6 * s} ${-118 * s}`, stroke: "#fff", "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, g);
    el("rect", { x: -92 * s, y: -20 * s, width: 184 * s, height: 38 * s, rx: 8 * s, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
    return g;
  };
  // stamp choreography: k 0 to 1, lifts (anticipation), slams, squashes, then moves off to rest
  const stampRun = (tool, mark, zap, hit, rest, mr) => (k) => {
    const up = oc(seg(k, 0, 0.26)), slam = Math.pow(seg(k, 0.26, 0.4), 3), off = io(seg(k, 0.56, 1)), sq = Math.sin(Math.PI * seg(k, 0.4, 0.56));
    const y0 = hit[1] - 150 - 46 * up, y = mix(mix(y0, hit[1], slam), rest[1], off), x = mix(hit[0], rest[0], off);
    tool.setAttribute("opacity", seg(k, 0, 0.12));
    tool.setAttribute("transform", `translate(${x} ${y}) rotate(${rest[2] * off}) scale(${1 + 0.1 * sq} ${1 - 0.16 * sq})`);
    const m = seg(k, 0.4, 0.6);
    mark.setAttribute("opacity", k >= 0.4 ? 1 : 0); tf(mark, hit[0], hit[1], k >= 0.4 ? 0.86 + 0.14 * ob(m) : 0.86, mr);
    zap(seg(k, 0.4, 0.8));
  };

  /* ---- small props, each drawn around 0,0 and driven by k from 0 to 1 ---- */
  const PROPS = {
    play: (g) => { // a round figure with a pad in its hands
      figure(g, LIL, 1.3).setAttribute("transform", "translate(0 -10)");
      const pad = el("g", {}, g);
      el("rect", { x: -43, y: -15, width: 100, height: 46, rx: 21, fill: LIL }, pad);
      el("rect", { x: -50, y: -22, width: 100, height: 46, rx: 21, fill: SKY, stroke: INK, "stroke-width": 3 }, pad);
      el("path", { d: "M-34 1 H-16 M-25 -8 V10", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, pad);
      el("circle", { cx: 18, cy: -4, r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pad); el("circle", { cx: 32, cy: 7, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, pad);
      el("circle", { cx: -52, cy: 4, r: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, pad); el("circle", { cx: 52, cy: 4, r: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, pad);
      const l = rays(el("g", {}, g), 3, 70, 92, -0.5, 0.3), r = rays(el("g", {}, g), 3, 70, 92, 2.84, 3.64);
      return (k) => { const w = Math.sin(k * 12.566) * (1 - k * 0.5); pad.setAttribute("transform", `translate(0 ${48 - Math.abs(w) * 5}) rotate(${w * 8})`); tf(l, 0, 44, 0.9 + 0.12 * Math.abs(w)); tf(r, 0, 44, 0.9 + 0.12 * Math.abs(w)); };
    },
    cutter: (g) => { // scissors cut a clip strip in two
      const strip = (x0, x1) => { const s = el("g", {}, g); el("rect", { x: x0 + 7, y: -23, width: x1 - x0, height: 60, rx: 5, fill: LIL }, s); el("rect", { x: x0, y: -30, width: x1 - x0, height: 60, rx: 5, fill: YEL, stroke: INK, "stroke-width": 3 }, s); for (let x = x0 + 12; x + 34 <= x1 - 6; x += 46) el("rect", { x, y: -16, width: 34, height: 32, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, s); return s; };
      const a = strip(-134, 16), b = strip(16, 130), sc = el("g", {}, g);
      const blade = (d) => { const n = el("g", {}, sc); el("path", { d: "M0 -6 L0 50", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, n); el("path", { d: `M0 0 L${d * 12} -20`, stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, n); el("circle", { cx: d * 17, cy: -29, r: 12, fill: "#fff", stroke: INK, "stroke-width": 4 }, n); return n; };
      const b1 = blade(-1), b2 = blade(1);
      el("circle", { r: 4, fill: INK }, sc);
      const zap = burst(g, 16, 0, 6, 40, 60, -0.9, 0.9);
      return (k) => {
        const snip = oc(seg(k, 0.1, 0.5)), part = oc(seg(k, 0.45, 1)), ang = 30 - 22 * snip;
        b1.setAttribute("transform", `rotate(${ang})`); b2.setAttribute("transform", `rotate(${-ang})`);
        sc.setAttribute("transform", `translate(16 ${-84 + 22 * snip})`);
        a.setAttribute("transform", `translate(${-8 * part} 0)`); b.setAttribute("transform", `translate(${18 * part} ${8 * part}) rotate(${5 * part} 16 0)`);
        zap(seg(k, 0.45, 0.9));
      };
    },
    captions: (g) => { // caption bars type themselves under a frame
      card(g, -118, -84, 236, 158);
      el("rect", { x: -102, y: -68, width: 204, height: 78, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g);
      el("circle", { cx: -60, cy: -22, r: 20, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
      el("path", { d: "M-22 -40 H70 M-22 -18 H40", stroke: "#fff", "stroke-width": 8, "stroke-linecap": "round" }, g);
      const b1 = el("rect", { x: -96, y: 24, height: 14, rx: 7, fill: INK }, g), b2 = el("rect", { x: -96, y: 46, height: 14, rx: 7, fill: INK }, g);
      return (k) => { b1.setAttribute("width", Math.max(14, 192 * oc(seg(k, 0.05, 0.55)))); b2.setAttribute("width", Math.max(14, 132 * oc(seg(k, 0.4, 1)))); };
    },
    titles: (g) => { // a title bar grows behind a caret, then a spark
      card(g, -136, -52, 272, 104);
      const bar = el("rect", { x: -112, y: -18, height: 36, rx: 7, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
      const caret = el("path", { d: "M0 -28 V28", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
      const star = el("path", { d: "M0 -30 L8 -8 L30 0 L8 8 L0 30 L-8 8 L-30 0 L-8 -8 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      return (k) => { const w = 196 * oc(seg(k, 0.05, 0.75)); bar.setAttribute("width", Math.max(10, w)); caret.setAttribute("transform", `translate(${-100 + Math.max(10, w)} 0)`); pop(star, 128, -58, seg(k, 0.7, 1), 12); };
    },
    calendar: (g) => { // days get marked one by one
      card(g, -92, -72, 184, 160, "#fff", 10);
      el("path", { d: "M-92 -34 V-62 Q-92 -72 -82 -72 H82 Q92 -72 92 -62 V-34 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
      el("path", { d: "M-48 -86 V-60 M48 -86 V-60", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, g);
      const marks = { 1: YEL, 6: MINT, 8: MINT, 11: YEL }, cells = [];
      for (let i = 0; i < 12; i++) { const n = el("rect", { x: -78 + (i % 4) * 40, y: -22 + Math.floor(i / 4) * 35, width: 32, height: 27, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); if (marks[i]) cells.push([n, marks[i]]); }
      return (k) => cells.forEach(([n, c], i) => n.setAttribute("fill", k * 4.4 - i > 0.4 ? c : "#fff"));
    },
    tracker: (g) => { // rows tick off and their bars grow
      card(g, -108, -84, 216, 168);
      const rows = [132, 96, 140, 74].map((len, i) => { const y = -54 + i * 36; return { c: el("circle", { cx: -82, cy: y, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g), t: el("path", { d: `M-88 ${y} l4 5 l8 -10`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g), b: el("rect", { x: -60, y: y - 8, height: 16, rx: 8, fill: AQUA, stroke: INK, "stroke-width": 2.5 }, g), len }; });
      return (k) => rows.forEach((r, i) => { const q = seg(k, i * 0.2, i * 0.2 + 0.4); r.b.setAttribute("width", Math.max(16, r.len * oc(q))); r.c.setAttribute("fill", q >= 1 ? MINT : "#fff"); r.t.setAttribute("opacity", q >= 1 ? 1 : 0); });
    },
    thumb: (g) => { // a thumbnail frame with a figure and two text bars
      card(g, -124, -70, 248, 140);
      el("rect", { x: -110, y: -56, width: 220, height: 112, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g);
      figure(g, LIL, 0.72).setAttribute("transform", "translate(-62 14)");
      const b1 = el("rect", { x: -14, y: -34, height: 26, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g), b2 = el("rect", { x: -14, y: 4, height: 26, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
      return (k) => { b1.setAttribute("width", Math.max(10, 108 * oc(seg(k, 0.1, 0.6)))); b2.setAttribute("width", Math.max(10, 76 * oc(seg(k, 0.4, 1)))); };
    },
  };

  const SC = {};

  /* ---- 1. a comic page of clip lengths; tap a panel to flip it ---- */
  SC.capture = {
    w: 1600, h: 1200, dur: 12.5, still: 8.5,
    build(svg, api) {
      const fx = sheet(svg, 1600, 1200), PH = 350, clips = [], tabs = [];
      const wait = (now, at, d) => (calm ? 1 : seg(now, at, at + d));
      const ROWS = [
        { n: "PS5", y: 100, col: YEL, t0: 0.3, tones: [SKY, LIL], ps: [["15", "seconds", 0.25, 600, 0.6], ["1", "hour", 60, 810, 1.4]] },
        { n: "Xbox", y: 490, col: SKY, t0: 2.3, tones: [YEL, LIL, YEL, LIL], ps: [["30", "seconds", 0.5, 270, 2.6], ["2", "minutes", 2, 320, 3.3], ["10", "minutes", 10, 370, 4.0], ["1", "hour", 60, 390, 4.7]] },
      ];
      ROWS.forEach((row) => {
        let x = 80;
        row.ps.forEach(([num, unit, mins, w, t0], i) => {
          const p = panel(fx, x, row.y, w, PH, { tone: row.tones[i], corner: i % 2 ? "bl" : "br" });
          const wide = w >= 500, cx = wide ? w * 0.29 : w / 2, cy = wide ? 182 : 150, r = wide ? 96 : 66, tx = wide ? w * 0.66 : w / 2, R = r - 13;
          const f = el("g", {}, p.art);
          el("circle", { cx: cx + 7, cy: cy + 7, r, fill: LIL }, f);
          el("circle", { cx, cy, r, fill: "#fff", stroke: INK, "stroke-width": 3 }, f);
          const wedge = el("path", { fill: row.col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, f);
          tf(rays(el("g", {}, f), 12, r - 9, r - 3, 0, 6.2832, 3), cx, cy);
          const hand = el("path", { d: `M0 0 V${-(R - 6)}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, f);
          el("circle", { cx, cy, r: 7, fill: INK }, f);
          const numT = txt(f, 0, 0, num, Object.assign({ "text-anchor": "middle", "font-size": wide ? 132 : 76 }, HALO));
          const unitT = mono(f, tx, wide ? 286 : 326, unit, Object.assign({ "font-size": wide ? 38 : 28, "font-weight": 700 }, HALO));
          const b = el("g", { display: "none" }, p.art), bx = w / 2, by = 128;
          el("rect", { width: w, height: PH, fill: "#fff" }, b); halftone(b, 0, 0, w, PH, row.col, "all");
          tf(rays(el("g", {}, b), 7, 88, 112, -2.6, -0.54), bx, by);
          el("circle", { cx: bx, cy: by + 16, r: 68, fill: LIL, stroke: INK, "stroke-width": 3 }, b);
          const top = el("g", {}, b);
          el("circle", { cx: bx, cy: by, r: 62, fill: row.col, stroke: INK, "stroke-width": 3 }, top);
          el("path", { d: `M${bx - 40} ${by - 16} Q${bx - 30} ${by - 40} ${bx - 4} ${by - 44}`, stroke: "#fff", "stroke-width": 7, fill: "none", "stroke-linecap": "round" }, top);
          const zap = burst(b, bx, by, 10, 80, 108);
          el("rect", { x: bx - 117, y: 235, width: 244, height: 92, rx: 5, fill: LIL }, b);
          el("rect", { x: bx - 124, y: 228, width: 244, height: 92, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 3 }, b);
          mono(b, bx - 2, 266, "The button that", { "font-size": 23, "font-weight": 700 });
          mono(b, bx - 2, 300, `saves ${num} ${unit}`, { "font-size": 23, "font-weight": 700 });
          const c = { p, f, b, top, zap, t0, side: 0, at: -9, snap: burst(fx, x + w, row.y + PH / 2, 5, 16, 44, -0.8, 0.8) };
          c.front = (k, a) => {
            const A = 360 * (mins / 60) * a, q = ((A - 90) * Math.PI) / 180;
            wedge.setAttribute("d", A > 359.5 ? `M${cx} ${cy - R} A${R} ${R} 0 1 1 ${cx - 0.1} ${cy - R} Z` : `M${cx} ${cy} L${cx} ${cy - R} A${R} ${R} 0 ${A > 180 ? 1 : 0} 1 ${(cx + Math.cos(q) * R).toFixed(2)} ${(cy + Math.sin(q) * R).toFixed(2)} Z`);
            wedge.setAttribute("opacity", a > 0 ? 1 : 0);
            hand.setAttribute("transform", `translate(${cx} ${cy}) rotate(${A})`);
            pop(numT, tx, wide ? 232 : 284, k); unitT.setAttribute("opacity", k);
          };
          button(p.g, `${row.n}, ${num} ${unit}. Flip to show the button that saves that clip`, () => {
            c.side ^= 1; c.at = api.now();
            if (clips.some((n) => n.side)) api.hold(); else api.seek(SC.capture.still);
          }, p.lift);
          clips.push(c); x += w + 30;
        });
        const tg = tab(fx, 168, 62, row.col);
        txt(tg, 0, 14, row.n, { "text-anchor": "middle", "font-size": 40 });
        tabs.push([tg, 148, row.y - 12, row.t0]);
      });
      const last = panel(fx, 80, 880, 1440, 224, { tone: LIL, corner: "br" });
      tf(figure(last.art, YEL, 1.3), 150, 152);
      const bub = el("g", { opacity: 0 }, last.art), BD = "M70 -76 H990 Q1020 -76 1020 -46 V46 Q1020 76 990 76 H70 Q40 76 40 46 V24 L0 12 L40 -12 V-46 Q40 -76 70 -76 Z";
      el("path", { d: BD, fill: LIL, transform: "translate(8 8)" }, bub);
      el("path", { d: BD, fill: "#fff", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, bub);
      txt(bub, 530, 24, "Copy it before you forget", { "text-anchor": "middle", "font-size": 68 });
      const drive = el("g", { opacity: 0 }, last.art);
      el("rect", { x: -37, y: -17, width: 74, height: 48, rx: 8, fill: BLUE }, drive);
      el("rect", { x: 30, y: -13, width: 26, height: 26, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 3 }, drive);
      el("rect", { x: -44, y: -24, width: 74, height: 48, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, drive);
      el("path", { d: "M-28 -6 H8 M-28 8 H-6", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, drive);
      rays(drive, 5, 52, 70, -2.5, -0.64);
      const land = burst(last.art, 238, 112, 5, 14, 40, 2.3, 3.98);
      const hint = mono(fx, 800, 1150, "Tapping a panel flips it", { "font-size": 23, fill: MUTE });
      return (t, now) => {
        fade(fx, t, SC.capture.dur);
        tabs.forEach(([g, x, y, t0]) => pop(g, x, y, seg(t, t0, t0 + 0.32), -3));
        clips.forEach((c) => {
          const k = seg(t, c.t0, c.t0 + 0.45);
          c.front(seg(t, c.t0 + 0.3, c.t0 + 0.62), oc(seg(t, c.t0 + 0.4, c.t0 + 1.15)));
          c.snap(seg(t, c.t0 + 0.28, c.t0 + 0.7));
          c.p.open(k); if (k < 1) return;
          const w = wait(now, c.at, 0.5), fe = io(c.side ? w : 1 - w), back = fe > 0.5, pr = c.side && !calm ? seg(now, c.at + 0.5, c.at + 0.95) : 0;
          c.f.setAttribute("display", back ? "none" : "inline"); c.b.setAttribute("display", back ? "inline" : "none");
          c.p.g.setAttribute("transform", `translate(${c.p.x + c.p.w / 2} ${c.p.y - 16 * Math.sin(Math.PI * fe)}) scale(${Math.max(Math.abs(Math.cos(Math.PI * fe)), 0.02)} 1) translate(${-c.p.w / 2} 0)`);
          c.top.setAttribute("transform", `translate(0 ${12 * Math.sin(Math.PI * pr)})`); c.zap(seg(pr, 0.4, 1));
        });
        last.open(seg(t, 5.9, 6.35));
        pop(bub, 248, 112, seg(t, 6.6, 6.95)); land(seg(t, 6.75, 7.2));
        const d = seg(t, 7.15, 7.5); pop(drive, 1362, 112, d, -8 + 14 * Math.sin(Math.PI * seg(t, 7.3, 7.9)) * (1 - seg(t, 7.3, 7.9)));
        hint.setAttribute("opacity", oc(seg(t, 7.7, 8.2)));
      };
    },
  };

  /* ---- 2. three frames at true proportions; tap the banner to shade the crop ---- */
  SC.frames = {
    w: 1600, h: 1200, dur: 12.5, still: 8.5,
    build(svg, api) {
      const fx = sheet(svg, 1600, 1200);
      const mk = (x, y, w, h, tone, corner) => {
        const g = el("g", {}, fx), lift = el("g", {}, g), cid = id("clip"), wid = id("wipe"), per = 2 * (w + h);
        tf(g, x, y);
        const sh = el("rect", { x: 10, y: 10, width: w, height: h, rx: 4, fill: LIL, opacity: 0 }, lift), bg = el("rect", { width: w, height: h, rx: 4, fill: "#fff", opacity: 0 }, lift);
        const wipe = el("rect", { width: 0, height: h }, el("clipPath", { id: wid }, lift));
        el("rect", { width: w, height: h, rx: 4 }, el("clipPath", { id: cid }, lift));
        const body = el("g", { "clip-path": `url(#${cid})` }, lift), art = el("g", { "clip-path": `url(#${wid})` }, body);
        halftone(art, 0, 0, w, h, tone, corner);
        const line = el("rect", { width: w, height: h, rx: 4, fill: "none", stroke: INK, "stroke-width": 5, "stroke-dasharray": per, "stroke-dashoffset": per, "stroke-linecap": "round" }, lift);
        const pen = el("circle", { r: 9, fill: YEL, stroke: INK, "stroke-width": 3 }, lift);
        return { g, lift, body, art, w, h, draw(t, t0) {
          const k = io(seg(t, t0, t0 + 1)), f = oc(seg(t, t0 + 0.8, t0 + 1.4)), L = k * per;
          line.setAttribute("stroke-dashoffset", per * (1 - k)); line.setAttribute("opacity", k > 0 ? 1 : 0);
          const px = L < w ? L : L < w + h ? w : L < 2 * w + h ? w - (L - w - h) : 0, py = L < w ? 0 : L < w + h ? L - w : L < 2 * w + h ? h : h - (L - 2 * w - h);
          pen.setAttribute("cx", px); pen.setAttribute("cy", py); pen.setAttribute("opacity", k > 0 && k < 1 ? 1 : 0);
          sh.setAttribute("opacity", f); bg.setAttribute("opacity", f); wipe.setAttribute("width", w * f);
        } };
      };
      const label = (name, dims, col) => { const g = tab(fx, 262, 98, col); txt(g, 0, -8, name, { "text-anchor": "middle", "font-size": 36 }); mono(g, 0, 30, dims, { "font-size": 27, "font-weight": 700 }); return g; };
      const bar = (g, x, y, w, h, fill) => { el("rect", { x: x + 7, y: y + 7, width: w, height: h, rx: 10, fill: LIL }, g); el("rect", { x, y, width: w, height: h, rx: 10, fill, stroke: INK, "stroke-width": 3 }, g); };
      // thumbnail, 16 by 9
      const th = mk(90, 100, 840, 472.5, SKY, "br");
      tf(rays(el("g", {}, th.art), 9, 112, 150, -3.3, 0.16), 220, 250);
      tf(figure(th.art, LIL, 2.3), 220, 330);
      bar(th.art, 420, 170, 350, 60, YEL); bar(th.art, 420, 258, 270, 60, "#fff"); bar(th.art, 420, 346, 180, 44, MINT);
      const thL = label("Thumbnail", "3840 x 2160", YEL);
      // Shorts thumbnail, 9 by 16
      const sh = mk(1030, 100, 480, 853.33, LIL, "b");
      bar(sh.art, 70, 250, 340, 56, YEL); bar(sh.art, 110, 330, 260, 56, "#fff");
      tf(rays(el("g", {}, sh.art), 9, 118, 156, -3.3, 0.16), 240, 560);
      tf(figure(sh.art, MINT, 2.5), 240, 650);
      const shL = label("Shorts", "2160 x 3840", MINT);
      // banner, 16 by 9, with the safe area to scale
      const BW = 900, BH = 506.25, k0 = BW / 2048, SW = 1235 * k0, SH = 338 * k0, SX = (BW - SW) / 2, SY = (BH - SH) / 2;
      const bn = mk(90, 612, BW, BH, YEL, "tr");
      const cols = [MINT, BLUE, LIL, AQUA, SKY];
      for (let i = 0; i < 15; i++) {
        const top = i < 7, bx = top ? 330 + i * 84 : i < 13 ? 70 + (i - 7) * 126 : i === 13 ? 88 : 812, by = top ? 96 + (i % 2) * 34 : i < 13 ? 412 + (i % 2) * 30 : 253, c = cols[i % 5];
        if (i % 3 === 0) el("circle", { cx: bx, cy: by, r: 26, fill: c, stroke: INK, "stroke-width": 3 }, bn.art);
        else if (i % 3 === 1) el("rect", { x: bx - 24, y: by - 24, width: 48, height: 48, rx: 8, fill: c, stroke: INK, "stroke-width": 3, transform: `rotate(${i * 7} ${bx} ${by})` }, bn.art);
        else el("path", { d: `M${bx} ${by - 28} L${bx + 28} ${by + 22} L${bx - 28} ${by + 22} Z`, fill: c, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bn.art);
      }
      const hid = id("hatch"), hp = el("pattern", { id: hid, width: 14, height: 14, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, bn.body);
      el("path", { d: "M0 7 H14", stroke: INK, "stroke-width": 2.5 }, hp);
      const shade = el("path", { fill: LIL, "fill-opacity": 0.82, "fill-rule": "evenodd", opacity: 0 }, bn.body), hatch = el("path", { fill: `url(#${hid})`, "fill-rule": "evenodd", opacity: 0 }, bn.body);
      const sper = 2 * (SW + SH);
      const safe = el("rect", { x: SX, y: SY, width: SW, height: SH, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 4, "stroke-dasharray": sper, "stroke-dashoffset": sper, "fill-opacity": 0 }, bn.body);
      const safeT = el("g", { opacity: 0 }, bn.body);
      txt(safeT, 0, -8, "Safe area", { "text-anchor": "middle", "font-size": 40 }); mono(safeT, 0, 36, "1235 x 338", { "font-size": 30, "font-weight": 700 });
      const crop = el("g", { opacity: 0 }, bn.body);
      el("rect", { x: -183, y: -31, width: 366, height: 62, rx: 31, fill: "#fff", stroke: INK, "stroke-width": 3 }, crop);
      mono(crop, 0, 9, "Parts that get cropped", { "font-size": 25, "font-weight": 700 });
      el("rect", { x: -9, y: -9, width: BW + 28, height: BH + 28, rx: 14, fill: "none", stroke: BLUE, "stroke-width": 5, class: "mg-ring" }, bn.lift);
      const bnL = label("Banner", "2048 x 1152", SKY);
      let on = 0, at = -9;
      button(bn.g, "Banner 2048 x 1152. Shade the parts that get cropped", () => { on ^= 1; at = api.now(); if (on) api.hold(); else api.seek(SC.frames.still); }, bn.lift);
      const cap = tab(fx, 480, 132, YEL);
      txt(cap, 0, -10, "Text goes", { "text-anchor": "middle", "font-size": 44 }); txt(cap, 0, 40, "in the middle", { "text-anchor": "middle", "font-size": 44 });
      const hit = burst(fx, 1270, 1046, 12, 250, 290);
      const arrow = el("path", { d: "M1024 1046 Q900 1046 826 892 M826 892 l-1 30 M826 892 l24 18", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": "340 340", "stroke-dashoffset": 340, opacity: 0 }, fx);
      const hint = mono(fx, 800, 1154, "Tapping the banner shades the parts that get cropped", { "font-size": 22, fill: MUTE });
      return (t, now) => {
        fade(fx, t, SC.frames.dur);
        th.draw(t, 0.3); pop(thL, 244, 104, seg(t, 1.55, 1.9), -3);
        sh.draw(t, 1.9); pop(shL, 1184, 104, seg(t, 3.15, 3.5), 2.5);
        bn.draw(t, 3.5); pop(bnL, 244, 644, seg(t, 4.75, 5.1), -2.5);
        const s = io(seg(t, 5.3, 6.0));
        safe.setAttribute("stroke-dashoffset", sper * (1 - s)); safe.setAttribute("opacity", s > 0 ? 1 : 0); safe.setAttribute("fill-opacity", oc(seg(t, 5.8, 6.1)));
        pop(safeT, BW / 2, BH / 2, seg(t, 5.95, 6.3));
        const c = seg(t, 7.0, 7.4); pop(cap, 1270, 1046 - 70 * (1 - oc(c)), c, -2); hit(seg(t, 7.25, 7.75));
        arrow.setAttribute("stroke-dashoffset", 340 * (1 - oc(seg(t, 7.5, 8.0)))); arrow.setAttribute("opacity", t > 7.5 ? 1 : 0);
        hint.setAttribute("opacity", oc(seg(t, 7.8, 8.3)));
        const w = calm ? 1 : seg(now, at, at + 0.55), e = on ? oc(w) : 1 - oc(w);
        const hx = SX * e, hy = SY * e, hw = mix(BW, SW, e), hh = mix(BH, SH, e), d = `M0 0 H${BW} V${BH} H0 Z M${hx} ${hy} H${hx + hw} V${hy + hh} H${hx} Z`;
        shade.setAttribute("d", d); hatch.setAttribute("d", d); shade.setAttribute("opacity", e > 0 ? 1 : 0); hatch.setAttribute("opacity", e * 0.3);
        pop(crop, BW / 2, SY + SH + (BH - SY - SH) / 2 + 4, on ? (calm ? 1 : seg(now, at + 0.4, at + 0.75)) : 0);
      };
    },
  };

  /* ---- 3. the storyboard: six panels, then the stamp; tap a panel to enlarge it ---- */
  SC.storyboard = {
    w: 1600, h: 1200, dur: 13.5, still: 9.5,
    build(svg, api) {
      const fx = sheet(svg, 1600, 1200), items = [];
      const veil = el("rect", { width: 1600, height: 1200, fill: SOFT, opacity: 0, "pointer-events": "none" }, fx);
      const chip = (p, x, y) => { const g = el("g", { opacity: 0 }, p); el("rect", { x: -70, y: -23, width: 140, height: 46, rx: 23, fill: MINT, stroke: INK, "stroke-width": 3 }, g); mono(g, 0, 8, "one job", { "font-size": 23, "font-weight": 700 }); tf(g, x, y); return g; };
      const toggle = (it) => {
        const now = api.now(), open = it.to === 1;
        items.forEach((n) => { if (n.to === 1 || n === it) { n.from = n.e; n.to = n === it && !open ? 1 : 0; n.at = now; } });
        if (!open) { fx.appendChild(veil); fx.appendChild(it.p.g); api.hold(); } else api.seek(SC.storyboard.still);
      };
      const add = (p, name, run, t0, S) => { const it = { p, run, t0, S, e: 0, from: 0, to: 0, at: -9, chip: chip(p.art, p.w - 92, 42) }; button(p.g, `${name}. Enlarge to show its one job`, () => toggle(it), p.lift); items.push(it); return it; };
      [["You play", "play", SKY], ["Cutter", "cutter", LIL], ["Captions", "captions", YEL], ["Titles", "titles", LIL], ["Calendar", "calendar", YEL], ["Tracker", "tracker", SKY]].forEach(([name, prop, tone], i) => {
        const p = panel(fx, 80 + (i % 3) * 490, 90 + Math.floor(i / 3) * 350, 460, 320, { tone, corner: i % 2 ? "bl" : "br" });
        const pg = el("g", { transform: "translate(230 136)" }, p.art), run = PROPS[prop](pg);
        const cw = name.length * 20 + 44, cg = tab(p.art, cw, 58, tone === YEL ? "#fff" : YEL);
        txt(cg, 0, 12, name, { "text-anchor": "middle", "font-size": 34 });
        const it = add(p, name, run, 0.4 + i * 0.9, 2.4);
        it.cap = [cg, 24 + cw / 2, 268];
      });
      const fin = panel(fx, 80, 790, 1440, 300, { tone: YEL, corner: "br" });
      const who = figure(fin.art, LIL, 1.5);
      const minis = [YEL, SKY, MINT, AQUA, BLUE].map((c, i) => { const g = el("g", { opacity: 0 }, fin.art); el("rect", { x: -27, y: -35, width: 68, height: 84, rx: 7, fill: LIL }, g); el("rect", { x: -34, y: -42, width: 68, height: 84, rx: 7, fill: c, stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-18 -18 H18 M-18 0 H18 M-18 18 H4", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g); return g; });
      const flow = el("path", { d: "M700 150 H748 M734 136 L750 150 L734 164", stroke: INK, "stroke-width": 5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0 }, fin.art);
      const paper = el("g", { opacity: 0 }, fin.art);
      el("rect", { x: -232, y: -102, width: 480, height: 220, rx: 8, fill: LIL }, paper); el("rect", { x: -240, y: -110, width: 480, height: 220, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, paper);
      const mark = stampMark(fin.art, 410, 124, 58), zap = burst(fin.art, 1020, 150, 14, 228, 262), tool = stampTool(fin.art);
      const stamp = stampRun(tool, mark, zap, [1020, 150], [1338, 196, 14], -6);
      const fit = add(fin, "You approve", stamp, 6.0, 1.04);
      const hint = mono(fx, 800, 1152, "Tapping a panel enlarges it", { "font-size": 23, fill: MUTE });
      return (t, now) => {
        fade(fx, t, SC.storyboard.dur);
        let top = 0;
        items.forEach((it) => {
          const k = seg(t, it.t0, it.t0 + 0.45), w = calm ? 1 : seg(now, it.at, it.at + 0.5);
          it.e = it.from + (it.to - it.from) * (it.to > it.from ? ob(w) : oc(w)); top = Math.max(top, it.e);
          const p = it.p, e = it.e;
          p.open(k);
          if (k >= 1) { const s = mix(1, it.S, e); p.g.setAttribute("transform", `translate(${mix(p.x + p.w / 2, 800, e)} ${mix(p.y + p.h / 2, 600, e)}) scale(${s}) translate(${-p.w / 2} ${-p.h / 2})`); }
          it.chip.setAttribute("opacity", cl(e));
          const job = it.to === 1 && !calm ? seg(((now - it.at - 0.45) % 3.2) / 3.2, 0, 0.72) : -1;
          if (it === fit) {
            who.setAttribute("opacity", k >= 1 ? 1 : 0); tf(who, 150, 196);
            minis.forEach((m, i) => pop(m, 330 + i * 82, 152 + (i % 2) * 14, seg(t, 6.45 + i * 0.09, 6.75 + i * 0.09), i % 2 ? 6 : -7));
            flow.setAttribute("opacity", oc(seg(t, 6.95, 7.2))); pop(paper, 1020, 150, seg(t, 6.7, 7.0), 2);
            it.run(job >= 0 && now - it.at > 0.45 ? job : seg(t, 7.2, 8.5));
          } else {
            it.run(job >= 0 && now - it.at > 0.45 ? job : seg(t, it.t0 + 0.35, it.t0 + 1.2));
            pop(it.cap[0], it.cap[1], it.cap[2], seg(t, it.t0 + 0.45, it.t0 + 0.78), -2);
          }
        });
        veil.setAttribute("opacity", cl(top) * 0.9);
        hint.setAttribute("opacity", oc(seg(t, 8.7, 9.2)));
      };
    },
  };

  /* ---- title card, 16 by 9: the strip fills panel by panel, then the stamp ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 9, still: 4,
    build(svg) {
      el("rect", { x: 80, y: 70, width: 216, height: 62, rx: 31, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 188, 111, "Use Cases", { "text-anchor": "middle", "font-size": 29 });
      mono(svg, 1520, 110, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 25, fill: MUTE });
      txt(svg, 76, 392, "GTA 6 content", { "font-size": 112 });
      txt(svg, 76, 518, "creator kit", { "font-size": 112 });
      el("path", { d: "M84 562 H400", stroke: YEL, "stroke-width": 16, "stroke-linecap": "round" }, svg);
      txt(svg, 80, 656, "Clips, thumbnails, titles, a posting plan", { "font-size": 36, "font-weight": 500, fill: MUTE });
      const fx = el("g", {}, svg);
      const ps = [["cutter", SKY, "br"], ["thumb", YEL, "bl"], ["calendar", LIL, "br"]].map(([prop, tone, corner], i) => {
        const p = panel(fx, 1010, 160 + i * 222, 500, 196, { tone, corner });
        const g = el("g", { transform: `translate(${prop === "calendar" ? 170 : 250} ${prop === "cutter" ? 110 : 98}) scale(${prop === "cutter" ? 0.8 : prop === "calendar" ? 0.85 : 0.95})` }, p.art);
        return { p, run: PROPS[prop](g), t0: 0.3 + i * 0.8, snap: burst(fx, 1010, 160 + i * 222 + 98, 5, 16, 44, 2.34, 3.94) };
      });
      const mark = stampMark(fx, 276, 84, 38), zap = burst(fx, 1392, 786, 12, 156, 184), tool = stampTool(fx, 0.62);
      const stamp = stampRun(tool, mark, zap, [1392, 786], [1392, 560, 0], -7);
      return (t) => {
        fade(fx, t, SC.hero.dur);
        ps.forEach((n) => { n.p.open(seg(t, n.t0, n.t0 + 0.45)); n.run(seg(t, n.t0 + 0.3, n.t0 + 1.1)); n.snap(seg(t, n.t0 + 0.28, n.t0 + 0.7)); });
        stamp(seg(t, 2.6, 3.7));
        if (t > 3.3) tool.setAttribute("opacity", 1 - seg(t, 3.3, 3.7));
        
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, live = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(held ? (frozen && !isNaN(fixed) ? fixed : sc.still) : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if ((seen || frozen) && (!held || live)) raf = requestAnimationFrame(tick); };
    // seek resumes the loop from s; hold parks the scene on its still while an interaction animates
    const api = { now: clock, seek: (s) => { off = s - clock(); held = calm || frozen; live = frozen; tick(); }, hold: () => { held = true; live = true; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { held = true; draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
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
