/* Bright coded scenes for "llama.cpp 1.0: What Changed and What to Check Before Upgrading". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", GREY = "#D9D0E4";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const fit = (n, max) => { let s = parseFloat(n.getAttribute("font-size")); try { while (s > 10 && n.getComputedTextLength() > max) { s -= 1; n.setAttribute("font-size", s); } } catch (e) { /* not laid out */ } return n; };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hitbox = (g, x, y, width, height, rx) => {
    el("rect", { x, y, width, height, rx, fill: "#fff", "fill-opacity": 0 }, g);
    el("rect", { x, y, width, height, rx, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, g);
  };
  const brick = (p, fill, label, mono, w = 140, h = 44) => {
    const g = el("g", {}, p);
    [-w / 4, w / 4].forEach((x) => el("rect", { x: x - w / 12, y: -h / 2 - 8, width: w / 6, height: 12, rx: 3, fill, stroke: INK, "stroke-width": 2.5 }, g));
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 6, fill, stroke: INK, "stroke-width": 3 }, g);
    if (label) fit(txt(g, 0, 7, label, { "text-anchor": "middle", "font-size": mono ? 23 : 19, "font-weight": 700, "font-family": mono ? MONO : SANS }), w - 20);
    return g;
  };

  const SC = {};

  /* ---- 1. deprecated bricks leave the tower, NextN snaps on top ---- */
  SC.legos = {
    dur: 9.6, still: 9.6,
    build(root, api) {
      const svg = el("g", { transform: "translate(0 -50)" }, root); // sit the table higher in the frame
      const TX = 300, rowY = (r) => 458 - 44 * r;
      [70, 716].forEach((x) => el("rect", { x, y: 488, width: 14, height: 82, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg));
      el("rect", { x: 104, y: 348, width: 10, height: 134, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 30, y: 480, width: 740, height: 16, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 40, y: 294, width: 138, height: 58, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      fit(txt(svg, 109, 332, "llama.h", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 }), 120);
      const tower = el("g", {}, svg);
      hitbox(tower, 214, 146, 172, 330, 16);
      const COL = [SKY, GREY, LIL, GREY, MINT, GREY, YEL];
      const bricks = COL.map((c, r) => ({ g: brick(tower, c, c === GREY ? "deprecated" : ""), r }));
      const OUT = [5, 3, 1], START = [0.7, 2.5, 4.3], PILE = [[638, 454], [660, 426], [650, 398]];
      const top = brick(tower, BLUE, "NextN", true);
      const snaps = el("g", {}, tower);
      [-1, 1].forEach((s) => el("path", { d: `M${TX + s * 80} 304 h${s * 16} M${TX + s * 78} 292 l${s * 12} -10 M${TX + s * 78} 316 l${s * 12} 10`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round", fill: "none" }, snaps));
      button(tower, "Replay the build", () => api.seek(0));
      el("path", { d: "M560 380 L524 342 L556 334 L590 380 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M740 380 L776 342 L744 334 L710 380 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 560, y: 380, width: 180, height: 100, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      fit(txt(svg, 650, 440, "35 removed", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 }), 160);
      return (t) => {
        bricks.forEach((b) => {
          const k = OUT.indexOf(b.r);
          let x = TX, y = rowY(b.r);
          OUT.forEach((r, j) => { if (r < b.r) y += 44 * oc(seg(t, START[j] + 0.5, START[j] + 0.85)); });
          if (k >= 0) {
            const s = START[k], q = seg(t, s + 0.5, s + 1.05), c = seg(t, s + 1.05, s + 1.45);
            x = TX + 150 * io(seg(t, s, s + 0.5));
            if (q > 0) { const e = io(q); x = lerp(450, PILE[k][0], e); y = lerp(rowY(b.r), 300, e) - 50 * Math.sin(Math.PI * q); }
            if (c > 0) { x = PILE[k][0]; y = lerp(300, PILE[k][1], c * c); }
          }
          tf(b.g, x, y);
        });
        const d = seg(t, 6.2, 6.8);
        tf(top, TX, lerp(-40, 282, d * d) - 9 * Math.sin(Math.PI * seg(t, 6.8, 7.1)));
        top.setAttribute("opacity", d > 0 ? 1 : 0);
        snaps.setAttribute("opacity", seg(t, 6.78, 6.9) * (1 - seg(t, 7.3, 7.7)));
      };
    },
  };

  /* ---- 2. the expert cache: hot cards go in the backpack, a miss goes to the CPU share desk ---- */
  SC.backpack = {
    dur: 10.5, still: 10.5,
    build(svg, api) {
      const SX = (i) => 120 + 112 * i, SY = 155;
      const FILL = [SKY, MINT, YEL, LIL, BLUE, MINT];
      const SETS = [[[0, 2, 4], [1, 3], 5], [[1, 3, 5], [0, 4], 2], [[1, 2, 4], [0, 5], 3]];
      const calls = (s) => { const [h, o, m] = SETS[s]; return [h[0], o[0], h[1], h[2], h[0], h[1], o[1], h[2], h[0], h[1], h[2]].map((c, i) => [c, 0.5 + i * 0.3]).concat([[m, 5.9]]); };
      let set = 0;
      el("rect", { x: 56, y: 210, width: 688, height: 14, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      [104, 696].forEach((x) => el("path", { d: `M${x - 16} 224 H${x + 16} L${x} 250 Z`, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg));
      const glow = el("ellipse", { cx: 610, cy: 450, rx: 150, ry: 74, fill: YEL, opacity: 0 }, svg);
      const rays = el("path", { d: "M488 452 L470 436 M480 472 H458 M732 452 L750 436 M740 472 H762", stroke: INK, "stroke-width": 3, "stroke-linecap": "round", fill: "none", opacity: 0 }, svg);
      [520, 688].forEach((x) => el("rect", { x, y: 520, width: 12, height: 60, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", { x: 514, y: 484, width: 192, height: 46, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 610, 515, "CPU share", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), 170);
      const desk = el("rect", { x: 500, y: 470, width: 220, height: 16, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M138 386 Q140 314 230 310 Q320 314 322 386 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M206 312 Q230 286 254 312", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      el("ellipse", { cx: 230, cy: 384, rx: 108, ry: 14, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const layer = el("g", {}, svg);
      const cards = FILL.map((f) => {
        const g = el("g", {}, layer);
        const ring = el("rect", { rx: 14, fill: "none", stroke: BLUE, "stroke-width": 3, opacity: 0 }, g);
        el("rect", { x: -44, y: -55, width: 88, height: 110, rx: 10, fill: f, stroke: INK, "stroke-width": 3 }, g);
        fit(txt(g, 0, -10, "expert", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), 76);
        const dots = [-16, 0, 16].map((x) => el("circle", { cx: x, cy: 30, r: 5, fill: INK, opacity: 0 }, g));
        return { g, ring, dots };
      });
      el("path", { d: "M122 384 Q230 404 338 384 V520 Q338 562 296 562 H164 Q122 562 122 520 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 146, y: 438, width: 168, height: 76, rx: 18, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 230, 484, "host memory", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), 150);
      const bag = el("g", {}, svg);
      hitbox(bag, 104, 278, 252, 298, 22);
      button(bag, "Shuffle which cards are packed", () => { set = (set + 1) % SETS.length; api.seek(0); });
      return (t) => {
        const [hot, , miss] = SETS[set], list = calls(set), light = oc(seg(t, 6.1, 6.5));
        glow.setAttribute("opacity", 0.35 * light); rays.setAttribute("opacity", light); desk.setAttribute("fill", light > 0.5 ? YEL : SOFT);
        cards.forEach((c, i) => {
          let n = 0, last = -9;
          list.forEach(([who, at]) => { if (who === i && t >= at) { n++; last = at; } });
          c.dots.forEach((d, j) => d.setAttribute("opacity", j < n ? 1 : 0));
          const k = seg(t, last, last + 0.45), d = 3 + 11 * k;
          c.ring.setAttribute("opacity", k > 0 && k < 1 ? 1 - k : 0);
          c.ring.setAttribute("x", -44 - d); c.ring.setAttribute("y", -55 - d); c.ring.setAttribute("width", 88 + 2 * d); c.ring.setAttribute("height", 110 + 2 * d);
          let x = SX(i), y = SY, s = 1 + 0.08 * Math.sin(Math.PI * k);
          const j = hot.indexOf(i);
          if (j >= 0) {
            const q = seg(t, 3.8 + j * 0.3, 4.5 + j * 0.3), up = io(seg(q, 0, 0.3)), across = io(seg(q, 0.3, 0.7)), down = seg(q, 0.7, 1);
            if (q > 0) {
              s = lerp(1, 0.66, up); x = lerp(SX(i), 160 + 70 * j, across);
              y = down > 0 ? lerp(58, 358, down * down) : lerp(SY, 58, up);
            }
            y += 3 * Math.sin((t - 5.1) * 5 + j * 1.7) * seg(t, 5.1, 5.5);
          } else if (i === miss) {
            const q = seg(t, 6.3, 7.2), e = io(q);
            if (q > 0) { x = lerp(SX(i), 610, e); y = lerp(SY, 423, e) - 40 * Math.sin(Math.PI * q); s = lerp(1, 0.85, e); }
          }
          tf(c.g, x, y, s);
        });
      };
    },
  };

  /* ---- 3. small waves pass, a major wave moves the anchor ---- */
  SC.anchor = {
    dur: 12, still: 12,
    build(svg, api) {
      const S = 280, A0 = 230, A1 = 520;
      const WAVES = [["minor", 0.3, 2.1, 190, 54, SKY, 20], ["patch", 1.6, 3.4, 190, 54, SKY, 20], ["major", 4.2, 8.2, 300, 150, BLUE, 26]];
      const bump = (u) => (Math.abs(u) < 1 ? (1 + Math.cos(Math.PI * u)) / 2 : 0);
      const at = (w, t) => { const q = seg(t, w[1], w[2]), e = q <= 0 || q >= 1 ? 0 : Math.min(1, q / 0.12, (1 - q) / 0.12); return { x: 90 + 620 * q, e, half: (w[3] / 2) * (0.5 + 0.5 * e), h: w[4] * e }; };
      const anchorShape = (g, stroke, w, dash) => {
        const a = { fill: "none", stroke, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" };
        if (dash) a["stroke-dasharray"] = dash;
        el("circle", Object.assign({ cx: 0, cy: 432, r: 11 }, a, { fill: "#fff" }), g);
        el("path", Object.assign({ d: "M0 443 V534 M-28 462 H28 M-46 500 Q-42 536 0 536 Q42 536 46 500" }, a), g);
        if (!dash) el("path", Object.assign({ d: "M-56 512 L-46 496 L-34 510 M56 512 L46 496 L34 510" }, a), g);
      };
      el("rect", { x: 40, y: 544, width: 720, height: 30, rx: 15, fill: SOFT }, svg);
      const ghost = el("g", { opacity: 0 }, svg);
      anchorShape(ghost, MUTE, 2.5, "5 7"); tf(ghost, A0, 0);
      const arrow = el("g", { opacity: 0 }, svg);
      const [sx, sy, cx, cy, ex, ey] = [A0 + 52, 474, (A0 + A1) / 2, 404, A1 - 64, 474], L = Math.hypot(ex - cx, ey - cy), ux = (ex - cx) / L, uy = (ey - cy) / L;
      el("path", { d: `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`, fill: "none", stroke: MUTE, "stroke-width": 2.5, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, arrow);
      const head = [Math.PI / 6, -Math.PI / 6].map((r) => [ex - 15 * (ux * Math.cos(r) - uy * Math.sin(r)), ey - 15 * (ux * Math.sin(r) + uy * Math.cos(r))]);
      el("path", { d: `M${head[0][0]} ${head[0][1]} L${ex} ${ey} L${head[1][0]} ${head[1][1]}`, fill: "none", stroke: MUTE, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-linejoin": "round" }, arrow);
      const line = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, svg);
      const anchor = el("g", {}, svg);
      anchorShape(anchor, INK, 6.5);
      el("path", { d: "M10 438 Q36 440 54 456", fill: "none", stroke: INK, "stroke-width": 2 }, anchor);
      el("rect", { x: 54, y: 446, width: 112, height: 38, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, anchor);
      fit(txt(anchor, 110, 471, "v1.0.0", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 }), 98);
      el("path", { d: `M40 ${S} H760`, stroke: SKY, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const waves = WAVES.map((w) => {
        const g = el("g", {}, svg), p = el("path", { fill: w[5], stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        const l = fit(txt(g, 0, S - (w[6] > 20 ? 28 : 18), w[0], { "text-anchor": "middle", "font-size": w[6], "font-weight": 700 }), w[3] * 0.5);
        return { w, g, p, l };
      });
      const buoy = el("g", {}, svg);
      hitbox(buoy, -100, -132, 200, 166, 18);
      el("path", { d: "M0 -24 V-80", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, buoy);
      el("rect", { x: -92, y: -122, width: 184, height: 42, rx: 21, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, buoy);
      fit(txt(buoy, 0, -94, "public C API", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 }), 166);
      el("rect", { x: -9, y: -34, width: 18, height: 12, rx: 3, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, buoy);
      el("ellipse", { rx: 36, ry: 25, fill: YEL, stroke: INK, "stroke-width": 3 }, buoy);
      el("path", { d: "M-33 -6 Q0 4 33 -6", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, buoy);
      button(buoy, "Send the waves again", () => api.seek(0));
      return (t) => {
        const st = waves.map((v) => at(v.w, t));
        waves.forEach((v, i) => {
          const s = st[i];
          v.g.setAttribute("opacity", s.e > 0 ? 1 : 0);
          v.p.setAttribute("d", `M${s.x - s.half} ${S} C${s.x - s.half / 2} ${S} ${s.x - s.half / 2} ${S - s.h} ${s.x} ${S - s.h} C${s.x + s.half / 2} ${S - s.h} ${s.x + s.half / 2} ${S} ${s.x + s.half} ${S} Z`);
          v.l.setAttribute("x", s.x); v.l.setAttribute("opacity", cl(s.e * 1.5));
        });
        const k = seg(t, 5.0, 7.0), ax = lerp(A0, A1, io(k)), lift = 70 * Math.sin(Math.PI * k), bx = ax + 30 * Math.sin(Math.PI * k);
        const hAt = (x) => st.reduce((a, s) => a + s.h * bump((x - s.x) / s.half), 0);
        const by = S - 6 + 3 * Math.sin(t * 2.2) - 0.55 * hAt(bx), rot = cl((hAt(bx - 14) - hAt(bx + 14)) * 0.15, -6, 6);
        tf(anchor, ax, -lift); tf(buoy, bx, by, 1, rot);
        line.setAttribute("d", `M${ax} ${421 - lift} Q${(ax + bx) / 2 - 16} ${(421 - lift + by + 24) / 2} ${bx} ${by + 24}`);
        ghost.setAttribute("opacity", seg(t, 5.3, 6.0)); arrow.setAttribute("opacity", seg(t, 6.8, 7.4));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.4, still: 3.4,
    build(svg) {
      el("rect", { x: 64, y: 54, width: 160, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      fit(txt(svg, 144, 82, "New release", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), 136);
      txt(svg, 896, 82, "Checked 13 Nov 2026", { "text-anchor": "end", "font-size": 19, "font-weight": 500, fill: MUTE });
      fit(txt(svg, 60, 192, "llama.cpp 1.0", { "font-family": MONO, "font-size": 80, "font-weight": 700 }), 830);
      fit(txt(svg, 64, 252, "What changed and what to check before upgrading", { "font-size": 28, "font-weight": 500, fill: MUTE }), 830);
      const icons = [
        (g) => { brick(g, GREY, "", false, 64, 22).setAttribute("transform", "translate(131 42) rotate(10)"); el("rect", { x: 99, y: 58, width: 64, height: 30, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g); },
        (g) => { brick(g, MINT, "", false, 64, 22).setAttribute("transform", "translate(131 72)"); brick(g, BLUE, "", false, 64, 22).setAttribute("transform", "translate(131 50)"); el("path", { d: "M90 61 h-12 M172 61 h12 M92 50 l-9 -7 M170 50 l9 -7", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g); },
        (g) => { el("rect", { x: 104, y: 24, width: 26, height: 38, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5, transform: "rotate(-8 117 43)" }, g); el("rect", { x: 132, y: 22, width: 26, height: 38, rx: 5, fill: MINT, stroke: INK, "stroke-width": 2.5, transform: "rotate(8 145 41)" }, g); el("rect", { x: 96, y: 54, width: 70, height: 38, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, g); },
      ];
      const tiles = [["35 removed", YEL, SANS], ["NextN API", SKY, MONO], ["MoE expert cache", LIL, SANS]].map(([s, f, font], i) => {
        const g = el("g", { opacity: 0 }, svg);
        el("rect", { width: 262, height: 158, rx: 22, fill: f, stroke: INK, "stroke-width": 3 }, g);
        icons[i](g);
        fit(txt(g, 131, 132, s, { "text-anchor": "middle", "font-family": font, "font-size": 25, "font-weight": 700 }), 230);
        return g;
      });
      return (t, now) => {
        const u = Math.max(t, now || 0); // plays once, then holds the final frame
        tiles.forEach((g, i) => { const q = seg(u, 0.35 + i * 0.5, 1.05 + i * 0.5); g.setAttribute("opacity", cl(q * 2.5)); tf(g, 64 + i * 284, 314 + 48 * (1 - oc(q))); });
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
