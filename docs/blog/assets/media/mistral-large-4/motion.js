/* Bright coded scenes for "Mistral Large 4". Vanilla JS, no library.
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
  const pill = (p, s, fill, a = {}) => {
    const g = el("g", {}, p), r = el("rect", Object.assign({ y: -20, height: 40, rx: 20, fill, stroke: INK, "stroke-width": 2.5 }, a), g), t = txt(g, 0, 7, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
    const w = t.getComputedTextLength() + 34; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return g;
  };

  const SC = {};

  /* ---- 1. a kitchen scale under a huge flour sack; one small scoop comes out for each token ---- */
  SC.scales = {
    dur: 11, still: 7.3,
    build(svg) {
      txt(svg, 44, 62, "1.05T total, 49B active", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "Mistral's model page", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("path", { d: "M44 472 H756", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("path", { d: "M470 380 V472 M716 380 V472", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 418, y: 356, width: 338, height: 24, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const rollers = [436, 587, 738].map((x) => el("path", { d: "M-5 0 H5", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", transform: `translate(${x} 368)` }, svg));
      el("rect", { x: 228, y: 384, width: 24, height: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 130, y: 398, width: 220, height: 74, rx: 20, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 96, y: 372, width: 288, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 240, cy: 436, r: 27, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      [-60, -30, 0, 30, 60].forEach((a) => el("path", { d: "M0 -21 V-16", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", transform: `translate(240 436) rotate(${a})` }, svg));
      const needle = el("path", { d: "M0 3 V-17", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, svg);
      el("circle", { cx: 240, cy: 436, r: 4, fill: INK }, svg);
      el("ellipse", { cx: 240, cy: 168, rx: 80, ry: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const scoop = el("g", {}, svg);
      el("rect", { x: 24, y: -8, width: 34, height: 12, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, scoop);
      el("path", { d: "M-22 -12 Q0 -34 22 -12 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, scoop);
      el("path", { d: "M-28 -12 H28 L22 14 Q0 24 -22 14 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, scoop);
      el("path", { d: "M128 200 Q132 170 160 168 A80 14 0 0 0 320 168 Q348 170 352 200 L370 340 Q375 372 355 372 H125 Q105 372 110 340 Z", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M133 214 Q240 236 347 214", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-dasharray": "2 9", "stroke-linecap": "round" }, svg);
      txt(svg, 240, 302, "1.05T", { "text-anchor": "middle", "font-size": 62, "font-weight": 700 });
      txt(svg, 240, 338, "total parameters", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      const T0 = 0.6, P = 1.9, HX = 688, STEP = 104;
      const chips = ["one", "scoop", "for", "each", "token"].map((s) => {
        const g = el("g", {}, svg), r = el("rect", { x: -46, y: -23, width: 92, height: 46, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 7, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return { g, r };
      });
      const tag = pill(svg, "49B active", "#fff");
      const cap = strip(svg, 512, 700);
      return (t) => {
        const out = seg(t, 10.3, 10.8);
        const i = cl(Math.floor((t - T0) / P), 0, 4), ph = t < T0 ? -1 : t - (T0 + i * P);
        const a = ph < 0 ? 0 : oc(seg(ph, 0, 0.3)), b = ph < 0 ? 0 : io(seg(ph, 0.3, 0.75)) - io(seg(ph, 1.0, 1.4));
        const c = ph < 0 ? 0 : seg(ph, 1.4, 1.55) * (1 - seg(ph, 1.8, 1.9)), d = ph < 0 ? 0 : io(seg(ph, 1.5, 1.75));
        const x = 240 + (HX - 240) * b, y = 225 - 67 * a * (1 - d) + 100 * b - 30 * Math.sin(b * Math.PI) + 8 * Math.sin(seg(ph, 0.75, 0.95) * Math.PI);
        tf(scoop, x, y, 1, -120 * c);
        const show = cl(a * 2 - 1) * (1 - seg(ph, 1.4, 1.55));
        tf(tag, x, y - 54); tag.setAttribute("opacity", show);
        needle.setAttribute("transform", `translate(240 436) rotate(${62 - 7 * a * (1 - d)})`);
        let moved = 0;
        chips.forEach((ch, j) => {
          const born = T0 + j * P + 0.8;
          let n = 0; for (let k = j + 1; k < 5; k++) n += io(seg(t, T0 + k * P + 0.2, T0 + k * P + 0.7));
          if (j === 0) moved = n;
          tf(ch.g, HX - STEP * n, 331, cl(ob(seg(t, born, born + 0.3)), 0, 1.3));
          ch.g.setAttribute("opacity", (t < born ? 0 : 1) * (1 - seg(n, 2, 2.5)) * (1 - out));
          ch.r.setAttribute("fill", n < 0.5 ? YEL : "#fff");
        });
        rollers.forEach((r, j) => r.setAttribute("transform", `translate(${[436, 587, 738][j]} 368) rotate(${-moved * 180})`));
        cap.textContent = t < T0 + 2 * P || t > 10.3 ? "The total sets how big the download will be" : "The active count sets how much work each token costs";
      };
    },
  };

  /* ---- 2. a crate rolls in on a trolley; its delivery slip says Coming soon twice while a calendar tears off days ---- */
  SC.crate = {
    dur: 11.2, still: 9,
    build(svg, api) {
      txt(svg, 44, 62, "The weights are not out yet", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 60, "tap the crate", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("path", { d: "M44 480 H756", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      /* tear-off calendar */
      el("rect", { x: 548, y: 112, width: 184, height: 196, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const num = txt(svg, 640, 280, "6", { "text-anchor": "middle", "font-size": 96, "font-weight": 700 });
      const leaf = el("g", {}, svg);
      el("rect", { x: -90.5, y: 0, width: 181, height: 138, fill: SOFT }, leaf);
      const old = txt(leaf, 0, 112, "", { "text-anchor": "middle", "font-size": 96, "font-weight": 700 });
      el("path", { d: "M548 168 V128 Q548 112 564 112 H716 Q732 112 732 128 V168 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      txt(svg, 640, 156, "October", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      [594, 686].forEach((x) => el("rect", { x: x - 6, y: 96, width: 12, height: 26, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      const notes = [["VentureBeat: Oct. 27", "#fff", 346, 6.3], ["Mistral: end of month", YEL, 398, 7.8]].map(([s, fill, y, at]) => ({ g: pill(svg, s, fill), y, at }));
      /* trolley and crate */
      const tr = el("g", {}, svg);
      el("path", { d: "M84 438 V262 Q84 236 60 236 H46", stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, tr);
      const wheels = [132, 442].map((x) => { const g = el("g", {}, tr); el("circle", { r: 15, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); el("path", { d: "M-9 0 H9 M0 -9 V9", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g); return { g, x }; });
      el("rect", { x: 72, y: 430, width: 430, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, tr);
      const cr = el("g", {}, tr);
      el("rect", { x: -185, y: -262, width: 370, height: 262, rx: 12, fill: MINT, stroke: INK, "stroke-width": 3 }, cr);
      el("path", { d: "M-185 -212 H185 M-185 -16 H185", stroke: INK, "stroke-width": 3 }, cr);
      [[-166, -237], [166, -237]].forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 4, fill: INK }, cr));
      txt(cr, 0, -228, "Mistral Large 4", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      el("rect", { x: -162, y: -194, width: 324, height: 162, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, cr);
      el("rect", { x: -32, y: -205, width: 64, height: 22, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2.5, transform: "rotate(-3 0 -194)" }, cr);
      el("path", { d: "M-140 -110 H140", stroke: SOFT, "stroke-width": 3, "stroke-linecap": "round" }, cr);
      txt(cr, -140, -137, "weights", { "font-size": 22, "font-weight": 700 });
      txt(cr, -140, -69, "licence", { "font-size": 22, "font-weight": 700 });
      const stamps = [[-144, -3], [-76, 2.5]].map(([y, rot]) => ({ g: pill(cr, "Coming soon", LIL, { rx: 10 }), y, rot }));
      el("rect", { x: -192, y: -269, width: 384, height: 276, rx: 18, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, cr);
      const cap = strip(svg, 512, 700);
      let poked = -99;
      button(cr, "The crate is closed. Weights and licence both read Coming soon.", () => { poked = api.now(); api.poke(); });
      return (t, now) => {
        const w = now - poked, shake = w >= 0 && w < 0.9 ? Math.sin(w * 30) * 3 * (1 - w / 0.9) : 0;
        const roll = oc(seg(t, 0.3, 1.3)) - io(seg(t, 10.3, 11)), dx = -580 * (1 - roll);
        tr.setAttribute("transform", `translate(${dx} 0)`);
        wheels.forEach((wh) => tf(wh.g, wh.x, 463, 1, (dx / 15) * 57.3));
        cr.setAttribute("transform", `translate(293 430) rotate(${shake})`);
        stamps.forEach((s, i) => { const k = seg(t, 1.8 + i * 0.7, 2.1 + i * 0.7); s.g.setAttribute("opacity", k <= 0 ? 0 : 1); tf(s.g, 76, s.y, 2.2 - 1.2 * ob(k), s.rot); });
        let f = t < 3.2 || t > 10.6 ? 0 : Math.min(21, (t - 3.2) / 0.14);
        if (t >= 7 && t <= 10.6) f = 21 + Math.min(4, (t - 7) / 0.15);
        const day = 6 + Math.floor(f), fr = f - Math.floor(f), moving = fr > 0 && day > 6;
        num.textContent = day; old.textContent = day - 1;
        leaf.setAttribute("transform", `translate(640 168) scale(1 ${moving ? 1 - seg(fr, 0, 0.8) : 0})`);
        leaf.setAttribute("opacity", moving ? 1 : 0);
        notes.forEach((n) => { const k = ob(seg(t, n.at, n.at + 0.35)) * (1 - seg(t, 10.3, 10.7)); tf(n.g, 640, n.y, cl(k, 0, 1.05)); n.g.setAttribute("opacity", k <= 0.01 ? 0 : 1); });
        cap.textContent = w >= 0 && w < 3 ? "Not yet. You can only rent it through the API for now." : "Mistral's model page on 6 Oct 2026: both read Coming soon";
      };
    },
  };

  /* ---- 3. three price tags on a line; a pencil strikes the higher price and the lower one drops in ---- */
  SC.tags = {
    dur: 11.6, still: 9,
    build(svg, api) {
      txt(svg, 44, 62, "Price per million tokens", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Mistral's model page, checked 6 Oct 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 756, 60, "tap a tag", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("path", { d: "M40 142 Q400 166 760 142", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const IT = [["Input", "$0.68", "$1.36", YEL], ["Cached input", "$0.07", "$0.14", SKY], ["Output", "$2.09", "$4.18", MINT]];
      const X = [150, 400, 650], LY = [148, 154, 148], S = (i) => 1.8 + i * 2;
      const LINES = IT.map(([n, p, o]) => `${n}: ${p} listed, ${o} struck through`);
      let pinned = -1;
      const tags = IT.map(([name, price, was, col], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -102, y: -2, width: 204, height: 327, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        el("path", { d: "M-95 52 L-46 6 H46 L95 52 V302 Q95 318 79 318 H-79 Q-95 318 -95 302 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, 0, 96, name, { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
        txt(g, 0, 156, was, { "text-anchor": "middle", "font-size": 34, "font-weight": 700 });
        const strike = el("path", { stroke: INK, "stroke-width": 4, "stroke-linecap": "round", fill: "none" }, g);
        const plate = el("g", {}, g);
        el("rect", { x: -80, y: -40, width: 160, height: 80, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, plate);
        txt(plate, 0, 17, price, { "text-anchor": "middle", "font-size": 48, "font-weight": 700 });
        const pen = el("g", {}, g);
        el("rect", { x: 16, y: -7, width: 60, height: 14, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, pen);
        el("rect", { x: 76, y: -7, width: 14, height: 14, rx: 3, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pen);
        el("path", { d: "M0 0 L16 -7 V7 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, pen);
        el("path", { d: "M0 0 L6 -2.6 V2.6 Z", fill: INK }, pen);
        button(g, LINES[i], () => { pinned = i; poked[i] = api.now(); api.poke(); });
        return { g, strike, plate, pen };
      });
      const poked = [-99, -99, -99];
      X.forEach((x, i) => el("rect", { x: x - 8, y: LY[i] - 22, width: 16, height: 42, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2.5, "pointer-events": "none" }, svg));
      const cap = strip(svg, 512, 700);
      return (t, now) => {
        const out = seg(t, 10.6, 11.1);
        let last = -1;
        tags.forEach((k, i) => {
          const te = Math.max(0, t - 0.15 * i), w = now - poked[i];
          const a = 10 * Math.exp(-2.2 * te) * Math.sin(6 * te) + (w >= 0 && w < 3 ? 8 * Math.exp(-2.5 * w) * Math.sin(8 * w) : 0);
          k.g.setAttribute("transform", `translate(${X[i]} ${LY[i]}) rotate(${a})`);
          const s = seg(t, S(i), S(i) + 0.55) * (1 - out), px = -58 + 116 * s;
          k.strike.setAttribute("d", `M-58 148 L${px} ${148 - 8 * s}`); k.strike.setAttribute("opacity", s > 0 ? 1 : 0);
          tf(k.pen, px, 148 - 8 * s, 1, -28 + Math.sin(t * 40) * 3 * (s > 0 && s < 1 ? 1 : 0));
          k.pen.setAttribute("opacity", seg(t, S(i) - 0.25, S(i) - 0.1) * (1 - seg(t, S(i) + 0.6, S(i) + 0.75)));
          const p = seg(t, S(i) + 0.75, S(i) + 1.15);
          tf(k.plate, 0, 250 - 80 * (1 - ob(p)));
          k.plate.setAttribute("opacity", seg(p, 0, 0.25) * (1 - out));
          if (t >= S(i) + 0.3) last = i;
        });
        cap.textContent = pinned >= 0 ? LINES[pinned] : t > 8.4 && t < 10.6 ? "The page did not say how long the lower prices last" : last < 0 || t >= 10.6 ? "A higher price was struck through beside each one" : LINES[last];
      };
    },
  };

  /* ---- 4. five flags hoisted to their scores; switch the test and the order changes ---- */
  SC.flags = {
    dur: 9, still: 3.4,
    build(svg, api) {
      const M = [["Mistral", "Large 4", YEL], ["Kimi K3", "", SKY], ["GLM-5.3", "", LIL], ["DeepSeek V4", "Pro 0813", BLUE], ["Qwen3.8", "Max", MINT]];
      const B = [["DeepSWE 1.1", [62, 68, 61, 57, 51]], ["Terminal-Bench 4", [28, 21, 40, 10, 17]]];
      const G = 425, P = 4.5, PX = (i) => 56 + i * 150, Y = (b, i) => G - 40 - B[b][1][i] * 2.8;
      const lead = B.map(([, v]) => v.indexOf(Math.max(...v)));
      txt(svg, 44, 62, "Mistral's own figures", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "Two rows we selected from its launch post. We did not run them.", { "font-size": 20, "font-weight": 500, fill: MUTE });
      txt(svg, 756, 60, "tap a test", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      el("path", { d: `M40 ${G} H760`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const flags = M.map(([n1, n2, col], i) => {
        const x = PX(i);
        el("path", { d: `M${x} ${G} V150`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
        el("rect", { x: x - 14, y: G - 8, width: 28, height: 8, rx: 3, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
        txt(svg, x + 43, G + 34, n1, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        if (n2) txt(svg, x + 43, G + 58, n2, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        const g = el("g", {}, svg), p = el("path", { fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const v = txt(g, 38, 10, "", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
        return { g, p, v };
      });
      const top = pill(svg, "highest", "#fff");
      let user = null, shown = 0;
      const btns = B.map(([name], b) => {
        const w = b ? 250 : 200, g = el("g", { transform: `translate(${b ? 508 : 267} 540)` }, svg);
        el("rect", { x: -w / 2 - 6, y: -32, width: w + 12, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
        const r = el("rect", { x: -w / 2, y: -26, width: w, height: 52, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        txt(g, 0, 8, name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        button(g, `Show ${name}`, () => { user = { from: shown, to: b, t0: api.now() }; api.poke(); });
        return { g, r };
      });
      return (t, now) => {
        let idx, prev, u;
        if (user) { idx = user.to; prev = user.from; u = cl((now - user.t0) / P); }
        else { idx = Math.floor(t / P) % 2; prev = 1 - idx; u = (t % P) / P; }
        shown = idx;
        const k = ob(seg(u, 0, 0.25)), ys = [];
        flags.forEach((f, i) => {
          const y = Y(prev, i) + (Y(idx, i) - Y(prev, i)) * k, wv = Math.sin(now * 3 + i * 1.4) * 3;
          ys.push(y); tf(f.g, PX(i), y);
          f.p.setAttribute("d", `M0 -26 Q43 ${-26 + wv} 86 -26 L74 0 L86 26 Q43 ${26 + wv} 0 26 Z`);
          f.v.textContent = B[idx][1][i];
        });
        const s = ob(seg(u, 0.25, 0.4));
        tf(top, PX(lead[idx]) + 62, ys[lead[idx]] - 52, cl(s, 0, 1.3)); top.setAttribute("opacity", s <= 0.01 ? 0 : 1);
        btns.forEach((b, i) => { b.r.setAttribute("fill", i === idx ? YEL : "#fff"); b.g.setAttribute("aria-pressed", i === idx ? "true" : "false"); });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 196, "Mistral Large 4", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 226 H606", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 288, "Le Chonk: size, price, scores, weights", { "font-size": 25, "font-weight": 500, fill: MUTE });
      el("rect", { x: 64, y: 326, width: 290, height: 52, rx: 26, fill: SOFT }, svg);
      txt(svg, 209, 360, "Checked 6 Oct 2026", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      /* one chunky kettlebell */
      const k = el("g", { transform: "translate(776 396)" }, svg);
      el("ellipse", { cx: 0, cy: 96, rx: 118, ry: 10, fill: SOFT }, k);
      el("path", { d: "M-50 -62 Q-74 -172 0 -172 Q74 -172 50 -62", stroke: INK, "stroke-width": 32, fill: "none", "stroke-linecap": "round" }, k);
      el("path", { d: "M-50 -62 Q-74 -172 0 -172 Q74 -172 50 -62", stroke: LIL, "stroke-width": 26, fill: "none", "stroke-linecap": "round" }, k);
      el("circle", { r: 96, fill: LIL, stroke: INK, "stroke-width": 3 }, k);
      el("rect", { x: -76, y: -26, width: 152, height: 52, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, k);
      txt(k, 0, 9, "Le Chonk", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
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
