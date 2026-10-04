/* Motion graphics for the ASD-STE100 prompting post.
   Each <figure class="mg" data-scene="..."> ships a still <img>; this script swaps in a
   live SVG scene that plays only while on screen. Reduced motion keeps one drawn frame.
   No dependencies. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const C = { ink: "#1A1320", ink2: "#251B2E", ink3: "#3D2E4A", faint: "#8E7B9C", line: "#4A3A58", paper: "#FCFAF0", y: "#FFCA54", sky: "#4ECDC4", lilac: "#B197FC", blue: "#6C8EF5", mint: "#6BCF7F" };
  const W = 960, H = 540, GROT = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const out = (t) => 1 - Math.pow(1 - t, 3);
  const back = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const x = rgb(a), y = rgb(b); return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(",")})`; };
  const el = (tag, attrs, parent, text) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };
  const set = (n, attrs) => { for (const k in attrs) n.setAttribute(k, attrs[k]); };
  const txt = (parent, x, y, s, size, fill, extra) => el("text", Object.assign({ x, y, "font-size": size, fill, "font-family": GROT, "font-weight": 500 }, extra || {}), parent, s);

  // Shared stage: deep ink panel, a soft glow and a fine hairline grid.
  function stage(svg, id, glow) {
    const d = el("defs", {}, svg);
    const g = el("radialGradient", { id: id + "g", cx: glow[0], cy: glow[1], r: 0.75 }, d);
    el("stop", { offset: 0, "stop-color": "#3A2A4A" }, g);
    el("stop", { offset: 1, "stop-color": C.ink }, g);
    const pt = el("pattern", { id: id + "p", width: 48, height: 48, patternUnits: "userSpaceOnUse" }, d);
    el("path", { d: "M48 0H0V48", fill: "none", stroke: "#FFFFFF", "stroke-opacity": 0.035, "stroke-width": 1 }, pt);
    el("rect", { width: W, height: H, fill: `url(#${id}g)` }, svg);
    el("rect", { width: W, height: H, fill: `url(#${id}p)` }, svg);
    return d;
  }
  const chip = (svg, x, y, s) => {
    const g = el("g", {}, svg);
    const r = el("rect", { x, y, height: 30, rx: 15, fill: C.y }, g);
    const t = txt(g, x + 14, y + 20.5, s, 14, C.ink, { "font-weight": 700, "letter-spacing": "0.14em" });
    r.setAttribute("width", Math.max(60, s.length * 10.6 + 28));
    return { g, r, t, set(v) { t.textContent = v; r.setAttribute("width", v.length * 10.6 + 28); } };
  };

  const SCENES = {};

  /* 1. The ladder: five shapes morph from messy text to clean text, a diagram, a web page, a video. */
  SCENES.ladder = {
    dur: 14, still: 6.4,
    build(svg) {
      stage(svg, "la", [0.5, 0.35]);
      const lab = chip(svg, 60, 48, "1  WRITING");
      const cap = txt(svg, 60, 112, "", 26, C.paper, { "font-weight": 500 });
      const L = [
        [[250, 168, 460, 18, 9], [250, 220, 420, 18, 9], [250, 272, 470, 18, 9], [250, 324, 380, 18, 9], [250, 376, 440, 18, 9]],
        [[290, 168, 250, 18, 9], [290, 220, 210, 18, 9], [290, 272, 270, 18, 9], [290, 324, 190, 18, 9], [290, 376, 230, 18, 9]],
        [[130, 170, 170, 70, 14], [395, 170, 170, 70, 14], [660, 170, 170, 70, 14], [262, 330, 170, 70, 14], [528, 330, 170, 70, 14]],
        [[240, 150, 480, 40, 12], [300, 350, 60, 60, 6], [400, 310, 60, 100, 6], [500, 260, 60, 150, 6], [600, 210, 60, 200, 6]],
        [[250, 428, 460, 8, 4], [330, 386, 12, 26, 6], [352, 372, 12, 40, 6], [374, 392, 12, 20, 6], [396, 380, 12, 32, 6]],
      ];
      const F = [
        ["#6B5878", "#6B5878", "#6B5878", "#6B5878", "#6B5878"],
        [C.paper, C.paper, C.paper, C.paper, C.paper],
        [C.sky, C.lilac, C.blue, C.mint, C.y],
        ["#3D2E4A", C.lilac, C.sky, C.blue, C.y],
        ["#4A3A58", C.y, C.y, C.y, C.y],
      ];
      const KF = [[0, 0], [1.3, 0], [2.1, 1], [3.5, 1], [4.4, 2], [6.9, 2], [7.8, 3], [10.3, 3], [11.2, 4], [13.2, 4], [14, 0]];
      // overlays sit under the actors where they frame them
      const frame = el("rect", { x: 240, y: 150, width: 480, height: 290, rx: 12, fill: "#211729", stroke: C.line, "stroke-width": 2 }, svg);
      const edges = el("g", { fill: "none", stroke: C.paper, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const E = ["M300 205H395", "M565 205H660", "M215 240C215 300 300 300 347 330", "M480 240C480 290 400 300 380 330", "M745 240C745 300 660 300 613 330"].map((d) => {
        const n = el("path", { d }, edges); const len = n.getTotalLength(); set(n, { "stroke-dasharray": len }); n._len = len; return n;
      });
      const actors = L[0].map(() => el("rect", {}, svg));
      const ticks = [0, 1, 2, 3, 4].map((i) => el("path", { d: `M250 ${172 + i * 52}l7 7 13-14`, fill: "none", stroke: C.y, "stroke-width": 4, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": 32 }, svg));
      const web = el("g", {}, svg);
      [0, 1, 2].forEach((i) => el("circle", { cx: 262 + i * 18, cy: 170, r: 5, fill: [C.y, C.mint, C.sky][i] }, web));
      el("rect", { x: 300, y: 418, width: 360, height: 4, rx: 2, fill: C.line }, web);
      const knob = el("circle", { cy: 420, r: 9, fill: C.paper, stroke: C.ink, "stroke-width": 3 }, web);
      const vid = el("g", {}, svg);
      const wave = el("path", { fill: "none", stroke: C.sky, "stroke-width": 4, "stroke-linecap": "round" }, vid);
      el("circle", { cx: 480, cy: 265, r: 44, fill: C.y }, vid);
      el("path", { d: "M466 242v46l38-23z", fill: C.ink }, vid);
      const head = el("circle", { cy: 432, r: 9, fill: C.y }, vid);
      const bars = Array.from({ length: 14 }, (_, i) => el("rect", { x: 418 + i * 22, width: 12, rx: 6, fill: C.line }, vid));
      const steps = ["WRITING", "DIAGRAM", "WEB PAGE", "VIDEO"].map((s, i) => {
        const x = 60 + i * 215;
        const base = el("rect", { x, y: 486, width: 195, height: 4, rx: 2, fill: C.line }, svg);
        const fill = el("rect", { x, y: 486, width: 0, height: 4, rx: 2, fill: C.y }, svg);
        const t = txt(svg, x, 516, `${i + 1}  ${s}`, 14, C.faint, { "font-weight": 700, "letter-spacing": "0.14em" });
        return { base, fill, t };
      });
      const CAPS = ["Messy answer in, clean answer out", "Skip the reading: draw it", "Ask for HTML, get a page you can use", "A custom explainer, on any topic"];
      const NAMES = ["1  WRITING", "2  DIAGRAM", "3  WEB PAGE", "4  VIDEO"];
      const BOUNDS = [0, 3.5, 6.9, 10.3, 14];
      return (t) => {
        let k = 0; while (k < KF.length - 2 && t >= KF[k + 1][0]) k++;
        const [t0, a] = KF[k], [t1, b] = KF[k + 1], m = io(p(t, t0, t1));
        actors.forEach((n, i) => {
          const A = L[a][i], B = L[b][i];
          set(n, { x: lerp(A[0], B[0], m), y: lerp(A[1], B[1], m), width: lerp(A[2], B[2], m), height: lerp(A[3], B[3], m), rx: lerp(A[4], B[4], m), fill: mix(F[a][i], F[b][i], m) });
        });
        const ph = t < 3.5 ? 0 : t < 6.9 ? 1 : t < 10.3 ? 2 : 3;
        lab.set(NAMES[ph]); cap.textContent = CAPS[ph];
        set(cap, { opacity: Math.min(p(t, BOUNDS[ph], BOUNDS[ph] + 0.5), 1 - p(t, BOUNDS[ph + 1] - 0.35, BOUNDS[ph + 1])) });
        ticks.forEach((n, i) => set(n, { "stroke-dashoffset": 32 * (1 - out(p(t, 2.1 + i * 0.12, 2.5 + i * 0.12))), opacity: 1 - p(t, 3.3, 3.6) }));
        E.forEach((n, i) => set(n, { "stroke-dashoffset": n._len * (1 - io(p(t, 4.5 + i * 0.22, 5.2 + i * 0.22))), opacity: 1 - p(t, 6.7, 7.0) }));
        const fo = Math.min(p(t, 7.3, 7.9), 1 - p(t, 13.3, 13.8));
        set(frame, { opacity: fo });
        set(web, { opacity: Math.min(p(t, 7.8, 8.3), 1 - p(t, 10.2, 10.6)) });
        set(knob, { cx: lerp(330, 620, io(p(t, 8.4, 9.9))) });
        set(vid, { opacity: Math.min(p(t, 11.0, 11.5), 1 - p(t, 13.1, 13.5)) });
        let d = ""; const ph2 = t * 2.4;
        for (let x = 270; x <= 690; x += 6) d += (x === 270 ? "M" : "L") + x + " " + (330 + Math.sin(x / 34 - ph2) * 16 * Math.sin(((x - 270) / 420) * Math.PI)).toFixed(1);
        set(wave, { d });
        const pr = p(t, 11.2, 13.2);
        set(head, { cx: lerp(250, 710, pr) });
        bars.forEach((n, i) => { const h = 10 + 22 * Math.abs(Math.sin(i * 1.7 + t * 5)); set(n, { y: 399 - h / 2, height: h, fill: i / 14 < pr ? C.y : C.line }); });
        steps.forEach((s, i) => {
          set(s.fill, { width: 195 * p(t, BOUNDS[i], BOUNDS[i + 1]) });
          set(s.t, { fill: i === ph ? C.y : i < ph ? C.paper : C.faint });
        });
      };
    },
  };

  /* 2. The filter: a wordy paragraph, its filler marked, then the same facts in four short sentences. */
  SCENES.filter = {
    dur: 13, still: 10.5, fonts: true,
    build(svg) {
      stage(svg, "fi", [0.3, 0.4]);
      const lab = chip(svg, 60, 48, "BEFORE");
      const BEFORE = "*Please *be *aware *that prompt caching can be *leveraged to *significantly reduce costs, *as *it *essentially allows previously processed portions of a prompt to be reused across subsequent requests *rather *than *being *reprocessed *each *time.".split(" ");
      const AFTER = ["Prompt caching lowers cost.", "The model saves the processed parts of your prompt.", "Later requests use the saved parts again.", "The model does not process them a second time."];
      const gB = el("g", {}, svg), gA = el("g", {}, svg);
      let x = 60, y = 150, n = 0;
      const words = BEFORE.map((w) => {
        const fill = w[0] === "*", s = fill ? w.slice(1) : w;
        const g = el("g", {}, gB);
        const hl = el("rect", { height: 30, rx: 6, fill: C.y, opacity: 0 }, g);
        const t = txt(g, 0, 0, s, 25, C.paper);
        const wd = t.getComputedTextLength() || s.length * 13.4;
        if (x + wd > 640) { x = 60; y += 44; }
        set(t, { x, y }); set(hl, { x: x - 4, y: y - 23, width: 0 });
        const strike = el("line", { x1: x - 2, x2: x - 2, y1: y - 8, y2: y - 8, stroke: C.ink, "stroke-width": 2.5 }, g);
        const o = { g, t, hl, strike, fill, x, wd, i: fill ? n++ : -1 };
        x += wd + 9;
        return o;
      });
      const lines = AFTER.map((s, i) => {
        const g = el("g", {}, gA), yy = 168 + i * 66;
        el("rect", { x: 60, y: yy - 27, width: 38, height: 38, rx: 10, fill: C.y }, g);
        txt(g, 79, yy - 1, String(i + 1), 20, C.ink, { "font-weight": 700, "text-anchor": "middle" });
        txt(g, 116, yy - 1, s, 22, C.paper);
        return g;
      });
      // dial
      const R = 78, CX = 800, CY = 230, CIRC = 2 * Math.PI * R;
      el("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: C.line, "stroke-width": 12 }, svg);
      const arc = el("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: C.y, "stroke-width": 12, "stroke-linecap": "round", "stroke-dasharray": CIRC, transform: `rotate(-90 ${CX} ${CY})` }, svg);
      const pct = txt(svg, CX, CY + 14, "0%", 44, C.paper, { "font-weight": 700, "text-anchor": "middle" });
      txt(svg, CX, CY + R + 44, "ASD-STE100", 17, C.faint, { "font-weight": 700, "letter-spacing": "0.16em", "text-anchor": "middle" });
      const cnt = txt(svg, CX, 430, "35", 60, C.y, { "font-weight": 700, "text-anchor": "middle", "font-family": MONO });
      const cl = txt(svg, CX, 462, "words, 1 sentence", 17, C.paper, { "text-anchor": "middle" });
      return (t) => {
        const sw = io(p(t, 1.4, 3.4));
        set(arc, { "stroke-dashoffset": CIRC * (1 - 0.8 * sw) });
        pct.textContent = Math.round(80 * sw) + "%";
        words.forEach((w, i) => {
          const inn = out(p(t, 0.1 + i * 0.03, 0.5 + i * 0.03));
          let op = inn;
          if (w.fill) {
            const h = out(p(t, 3.4 + w.i * 0.09, 3.8 + w.i * 0.09));
            set(w.hl, { width: (w.wd + 8) * h, opacity: h });
            set(w.t, { fill: mix(C.paper, C.ink, h) });
            const s = out(p(t, 5.2 + w.i * 0.05, 5.6 + w.i * 0.05));
            set(w.strike, { x2: w.x - 2 + (w.wd + 4) * s });
          }
          set(w.g, { opacity: op });
        });
        const leave = io(p(t, 6.4, 7.2));
        set(gB, { opacity: 1 - leave, transform: `translate(0 ${-18 * leave})` });
        lines.forEach((g, i) => { const a = out(p(t, 7.3 + i * 0.45, 7.9 + i * 0.45)); set(g, { opacity: a * (1 - p(t, 12.5, 13)), transform: `translate(${(1 - a) * 28} 0)` }); });
        lab.set(t < 6.8 ? "BEFORE" : "AFTER  80% ASD-STE100");
        cnt.textContent = Math.round(lerp(35, 29, io(p(t, 7.3, 9.1))));
        cl.textContent = t < 8.2 ? "words, 1 sentence" : "words, 4 sentences";
      };
    },
  };

  /* 3. The diagram: a wall of text becomes a flow, then a request runs through it. */
  SCENES.diagram = {
    dur: 11, still: 8.2,
    build(svg) {
      stage(svg, "di", [0.6, 0.5]);
      const lab = chip(svg, 60, 48, "TEXT");
      const N = [["Browser", 90, 250, C.sky], ["Login API", 300, 250, C.lilac], ["Auth check", 510, 250, C.blue], ["Session", 720, 150, C.mint], ["Try again", 720, 350, C.y]];
      const P = ["M240 285H300", "M450 285H510", "M660 270C690 250 690 200 720 190", "M660 300C690 320 690 370 720 380"];
      const wall = Array.from({ length: 9 }, (_, i) => el("rect", { x: 90, y: 160 + i * 36, width: [760, 700, 780, 640, 740, 690, 770, 610, 420][i], height: 14, rx: 7, fill: "#6B5878" }, svg));
      const edges = P.map((d) => { const n = el("path", { d, fill: "none", stroke: C.paper, "stroke-width": 2.5, "stroke-linecap": "round" }, svg); n._len = n.getTotalLength(); set(n, { "stroke-dasharray": n._len }); return n; });
      const tags = [txt(svg, 668, 214, "ok", 16, C.mint, { "font-weight": 700 }), txt(svg, 656, 356, "wrong", 16, C.y, { "font-weight": 700, "text-anchor": "end" })];
      txt(svg, 60, 112, "How a login request moves", 26, C.paper);
      const nodes = N.map(([s, x, y, c]) => {
        const g = el("g", {}, svg);
        el("rect", { x, y, width: 150, height: 70, rx: 14, fill: "#211729", stroke: c, "stroke-width": 3 }, g);
        txt(g, x + 75, y + 42, s, 19, C.paper, { "text-anchor": "middle", "font-weight": 700 });
        g._o = [x + 75, y + 35];
        return g;
      });
      const pulse = el("circle", { r: 9, fill: C.y }, svg);
      const halo = el("circle", { r: 18, fill: "none", stroke: C.y, "stroke-width": 2 }, svg);
      const ROUTES = [[0, 1, 2], [0, 1, 3]];
      return (t) => {
        wall.forEach((n, i) => { const k = io(p(t, 1.2 + i * 0.06, 2.2 + i * 0.06)); set(n, { opacity: 1 - k, transform: `translate(${k * 40} 0)` }); });
        lab.set(t < 1.9 ? "TEXT" : "DIAGRAM");
        nodes.forEach((g, i) => { const k = back(p(t, 2.0 + i * 0.22, 2.6 + i * 0.22)), [ox, oy] = g._o; set(g, { opacity: p(t, 2.0 + i * 0.22, 2.3 + i * 0.22), transform: `translate(${ox} ${oy}) scale(${0.6 + 0.4 * k}) translate(${-ox} ${-oy})` }); });
        edges.forEach((n, i) => set(n, { "stroke-dashoffset": n._len * (1 - io(p(t, 3.2 + i * 0.3, 3.9 + i * 0.3))) }));
        tags.forEach((n, i) => set(n, { opacity: p(t, 4.4 + i * 0.2, 4.8 + i * 0.2) }));
        const run = t > 5 ? (t - 5) / 2.6 : -1, r = ROUTES[Math.floor(Math.max(run, 0)) % 2], k = run - Math.floor(run);
        if (run < 0 || run >= 2.2) { set(pulse, { opacity: 0 }); set(halo, { opacity: 0 }); return; }
        const seg = Math.min(2, Math.floor(k * 3)), path = edges[r[seg]], q = io(k * 3 - seg), pt = path.getPointAtLength(path._len * q);
        set(pulse, { cx: pt.x, cy: pt.y, opacity: 1 });
        set(halo, { cx: pt.x, cy: pt.y, r: 12 + 14 * q, opacity: 0.7 * (1 - q) });
      };
    },
  };

  /* 4. The video: a turning circle draws its own sine wave, with narration and a scrubber. */
  SCENES.video = {
    dur: 12, still: 7.5,
    build(svg) {
      stage(svg, "vi", [0.25, 0.45]);
      chip(svg, 60, 48, "EXPLAINER");
      const CX = 210, CY = 240, R = 110, X0 = 400, X1 = 890;
      el("line", { x1: 60, x2: 900, y1: CY, y2: CY, stroke: C.line, "stroke-width": 1.5 }, svg);
      el("line", { x1: X0, x2: X0, y1: CY - 130, y2: CY + 130, stroke: C.line, "stroke-width": 1.5 }, svg);
      el("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: C.faint, "stroke-width": 2.5 }, svg);
      const sweep = el("path", { fill: C.y, "fill-opacity": 0.16 }, svg);
      const rad = el("line", { x1: CX, y1: CY, stroke: C.paper, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const hgt = el("line", { stroke: C.y, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const link = el("line", { stroke: C.y, "stroke-width": 2, "stroke-dasharray": "6 8" }, svg);
      const wave = el("path", { fill: "none", stroke: C.sky, "stroke-width": 4.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const dot = el("circle", { r: 10, fill: C.y, stroke: C.ink, "stroke-width": 3 }, svg);
      const tip = el("circle", { cx: X0, r: 8, fill: C.sky, stroke: C.ink, "stroke-width": 3 }, svg);
      const th = txt(svg, CX + 26, CY - 12, "θ", 24, C.paper, { "font-style": "italic" });
      const sub = txt(svg, 480, 418, "", 23, C.paper, { "text-anchor": "middle" });
      const SUBS = ["A point moves around a circle.", "Its height is sin(θ).", "Plot the height over time: a sine wave."];
      el("circle", { cx: 80, cy: 478, r: 20, fill: C.y }, svg);
      el("path", { d: "M74 467v22l18-11z", fill: C.ink }, svg);
      const bars = Array.from({ length: 64 }, (_, i) => el("rect", { x: 122 + i * 11.6, width: 6, rx: 3 }, svg));
      const time = txt(svg, 900, 485, "0:00", 17, C.faint, { "text-anchor": "end", "font-family": MONO });
      return (t) => {
        const a = t * 1.25, px = CX + R * Math.cos(a), py = CY - R * Math.sin(a);
        set(rad, { x2: px, y2: py }); set(dot, { cx: px, cy: py });
        set(hgt, { x1: px, x2: px, y1: CY, y2: py });
        set(link, { x1: px, y1: py, x2: X0, y2: py }); set(tip, { cy: py });
        const am = a % (2 * Math.PI), ex = CX + 34 * Math.cos(am), ey = CY - 34 * Math.sin(am);
        set(sweep, { d: `M${CX} ${CY}L${CX + 34} ${CY}A34 34 0 ${am > Math.PI ? 1 : 0} 0 ${ex.toFixed(1)} ${ey.toFixed(1)}Z` });
        set(th, { opacity: 0.9 });
        let d = ""; const grow = lerp(X0, X1, out(p(t, 0.3, 3.2)));
        for (let x = X0; x <= grow; x += 5) d += (x === X0 ? "M" : "L") + x + " " + (CY - R * Math.sin(a - (x - X0) / 62)).toFixed(1);
        set(wave, { d });
        const si = Math.min(2, Math.floor(t / 4)), lt = t - si * 4;
        sub.textContent = SUBS[si]; set(sub, { opacity: Math.min(p(lt, 0, 0.4), 1 - p(lt, 3.6, 4)) });
        const pr = t / 12;
        bars.forEach((n, i) => {
          const live = Math.abs(i / 64 - pr) < 0.05 ? 1 + 0.5 * Math.sin(t * 14 + i) : 1;
          const h = (8 + 26 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37))) * live;
          set(n, { y: 478 - h / 2, height: h, fill: i / 64 < pr ? C.y : C.line });
        });
        time.textContent = "0:" + String(Math.floor(t)).padStart(2, "0");
      };
    },
  };

  /* Hero: one still frame that shows all four formats. Used for the page hero and share image. */
  SCENES.hero = {
    dur: 1, still: 0,
    build(svg) {
      stage(svg, "he", [0.5, 0.3]);
      txt(svg, 60, 118, "Four ways to ask", 54, C.paper, { "font-weight": 700 });
      txt(svg, 60, 174, "for a clearer answer", 54, C.y, { "font-weight": 700 });
      const card = (i, name) => {
        const x = 60 + i * 215, g = el("g", {}, svg);
        el("rect", { x, y: 236, width: 195, height: 232, rx: 18, fill: "#211729", stroke: C.line, "stroke-width": 2 }, g);
        el("rect", { x: x + 18, y: 254, width: 34, height: 34, rx: 9, fill: C.y }, g);
        txt(g, x + 35, 278, String(i + 1), 19, C.ink, { "font-weight": 700, "text-anchor": "middle" });
        txt(g, x + 18, 444, name, 15, C.paper, { "font-weight": 700, "letter-spacing": "0.14em" });
        return [g, x];
      };
      let [g, x] = card(0, "WRITING");
      [120, 96, 132, 84].forEach((w, i) => el("rect", { x: x + 34, y: 316 + i * 24, width: w, height: 10, rx: 5, fill: C.paper }, g));
      [g, x] = card(1, "DIAGRAM");
      el("path", { d: `M${x + 62} 334H${x + 132}M${x + 97} 334V378`, stroke: C.paper, "stroke-width": 2.5, fill: "none" }, g);
      [[24, 316, C.sky], [132, 316, C.lilac], [78, 372, C.mint]].forEach(([dx, y, c]) => el("rect", { x: x + dx, y, width: 40, height: 34, rx: 8, fill: c }, g));
      [g, x] = card(2, "WEB PAGE");
      el("rect", { x: x + 24, y: 310, width: 147, height: 100, rx: 8, fill: "none", stroke: C.faint, "stroke-width": 2 }, g);
      [28, 44, 60, 78].forEach((h, i) => el("rect", { x: x + 40 + i * 31, y: 400 - h, width: 20, height: h, rx: 4, fill: [C.lilac, C.sky, C.blue, C.y][i] }, g));
      [g, x] = card(3, "VIDEO");
      el("circle", { cx: x + 97, cy: 356, r: 40, fill: C.y }, g);
      el("path", { d: `M${x + 84} 335v42l35-21z`, fill: C.ink }, g);
      return () => {};
    },
  };

  /* Live SIP calculator: the "ask for HTML" trick, working inside the post. */
  function sip(fig) {
    const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
    const box = document.createElement("div");
    box.className = "mg-sip";
    box.innerHTML = `
      <div class="mg-sip-head"><span class="mg-chip">LIVE</span><strong>SIP calculator</strong></div>
      <div class="mg-sip-grid">
        <div class="mg-sip-controls">
          ${[["m", "Monthly amount", 1000, 50000, 500, 10000], ["r", "Yearly return", 4, 18, 0.5, 12], ["y", "Years", 1, 30, 1, 15]].map(([k, l, a, b, s, v]) => `<label>${l}<output data-o="${k}"></output><input type="range" data-i="${k}" min="${a}" max="${b}" step="${s}" value="${v}"></label>`).join("")}
        </div>
        <div class="mg-sip-out">
          <div class="mg-sip-total"><span>Estimated value</span><b data-t="v"></b></div>
          <div class="mg-sip-split"><span><i class="a"></i>Invested <b data-t="p"></b></span><span><i class="b"></i>Growth <b data-t="g"></b></span></div>
          <div class="mg-sip-bars" role="img" aria-label="Bar chart of the invested amount and the growth, year by year"></div>
          <div class="mg-sip-axis"><span>Year 1</span><span data-t="last"></span></div>
        </div>
      </div>
      <p class="mg-sip-note">Assumes one fixed yearly return, compounded monthly. An illustration, not financial advice.</p>`;
    fig.querySelector("img").replaceWith(box);
    const $ = (s) => box.querySelector(s), bars = $(".mg-sip-bars");
    const shown = { v: 0, p: 0, g: 0 }; let raf = 0;
    const instant = location.search.includes("mgstill") || matchMedia("(prefers-reduced-motion: reduce)").matches;
    function draw() {
      const m = +$('[data-i="m"]').value, r = +$('[data-i="r"]').value, y = +$('[data-i="y"]').value, i = r / 1200;
      $('[data-o="m"]').textContent = "₹" + fmt.format(m);
      $('[data-o="r"]').textContent = r + "%";
      $('[data-o="y"]').textContent = y;
      const rows = [];
      for (let k = 1; k <= y; k++) { const n = k * 12; rows.push([m * n, m * ((Math.pow(1 + i, n) - 1) / i) * (1 + i)]); }
      const [pT, vT] = rows[rows.length - 1], max = vT;
      while (bars.children.length > y) bars.lastChild.remove();
      while (bars.children.length < y) { const b = document.createElement("div"); b.className = "mg-bar"; b.innerHTML = "<i></i><i></i>"; bars.appendChild(b); }
      rows.forEach(([pp, vv], k) => {
        const b = bars.children[k];
        b.children[0].style.height = ((vv - pp) / max) * 100 + "%";
        b.children[1].style.height = (pp / max) * 100 + "%";
        b.title = `Year ${k + 1}: ₹${fmt.format(vv)}`;
      });
      $('[data-t="last"]').textContent = "Year " + y;
      const target = { v: vT, p: pT, g: vT - pT }, from = Object.assign({}, shown), t0 = performance.now();
      cancelAnimationFrame(raf);
      const tick = (now) => {
        const k = instant ? 1 : out(clamp((now - t0) / 450));
        for (const key in target) { shown[key] = lerp(from[key], target[key], k); $(`[data-t="${key}"]`).textContent = "₹" + fmt.format(shown[key]); }
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    box.addEventListener("input", draw);
    draw();
  }

  function mount(fig) {
    const name = fig.dataset.scene;
    if (name === "sip") return sip(fig);
    const sc = SCENES[name], img = fig.querySelector("img");
    if (!sc || !img) return;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": img.alt, class: "mg-svg" });
    img.replaceWith(svg);
    const draw = sc.build(svg);
    const q = new URLSearchParams(location.search).get("mgstill");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (q != null || reduce) return draw(q ? +q : sc.still);
    let t = 0, last = 0, on = false, raf = 0;
    const loop = (now) => {
      if (!on) return;
      t = (t + Math.min(0.05, (now - last) / 1000)) % sc.dur; last = now;
      draw(t); raf = requestAnimationFrame(loop);
    };
    draw(0);
    new IntersectionObserver(([e]) => {
      on = e.isIntersecting; cancelAnimationFrame(raf);
      if (on) { last = performance.now(); raf = requestAnimationFrame(loop); }
    }, { threshold: 0.25 }).observe(svg);
  }

  const start = () => document.querySelectorAll("figure.mg[data-scene]").forEach((f) => { try { mount(f); } catch (e) { /* keep the still image */ } });
  // Word layout measures text, so the typeface must be loaded first.
  const ready = () => (document.fonts && document.fonts.load ? Promise.race([Promise.all([document.fonts.load('500 25px "Space Grotesk"'), document.fonts.load('700 25px "Space Grotesk"')]), new Promise((r) => setTimeout(r, 1500))]).then(start, start) : start());
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
})();
