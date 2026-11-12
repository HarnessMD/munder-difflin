/* Bright coded scenes for "Marblism alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878", GREY = "#E3E1E6";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const pop = (n, x, y, k, r = 0) => { n.setAttribute("opacity", k > 0.02 ? 1 : 0); n.setAttribute("transform", `rotate(${r} ${x} ${y}) translate(${x} ${y}) scale(${Math.max(k, 0.01)}) translate(${-x} ${-y})`); };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* a see through hit area plus the dashed focus ring */
  const ring = (p, x, y, w, h, r) => {
    el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, p);
    el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 8", "stroke-linecap": "round", class: "mg-ring" }, p);
  };

  const SC = {};

  /* ---- 1. seven tangram pieces make one square: one plan ---- */
  SC.tangram = {
    dur: 9, still: 9,
    build(svg, api) {
      const U = 100, X = 110, Y = 100, CX = X + 200, CY = Y + 200;
      const at = (u, v) => [X + u * U, Y + v * U];
      const box = el("g", {}, svg);
      ring(box, X - 18, Y - 18, 436, 436, 24);
      const pieces = [
        [[[0, 0], [4, 0], [2, 2]], BLUE, "Contracts", [2, 0.72], 45, -6],
        [[[0, 0], [2, 2], [0, 4]], LIL, "Website", [0.72, 2], 60, 8],
        [[[2, 2], [3, 1], [4, 2], [3, 3]], YEL, "Inbox", [3, 2], 85, -15],
        [[[0, 4], [1, 3], [3, 3], [2, 4]], SKY, "Social", [1.5, 3.5], 60, 5],
        [[[4, 2], [4, 4], [2, 4]], MINT, "Leads", [3.36, 3.4], 80, 12],
        [[[4, 0], [4, 2], [3, 1]], SKY, "SEO", [3.6, 1], 70, -18],
        [[[2, 2], [3, 3], [1, 3]], MINT, "Phone", [2, 2.68], 22, -12],
      ].map(([pts, fill, word, w, dist, rot]) => {
        const p = pts.map(([u, v]) => at(u, v)), g = el("g", {}, box);
        el("polygon", { points: p.map((q) => q.join(",")).join(" "), fill, stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round" }, g);
        const [tx, ty] = at(w[0], w[1]);
        txt(g, tx, ty + 9, word, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cy = p.reduce((s, q) => s + q[1], 0) / p.length, n = Math.hypot(cx - CX, cy - CY) || 1;
        return { g, cx, cy, mx: ((cx - CX) / n) * dist, my: ((cy - CY) / n) * dist, rot };
      });
      const tag = el("g", {}, svg);
      el("path", { d: "M562 300 L590 266 H744 Q752 266 752 274 V326 Q752 334 744 334 H590 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("path", { d: "M510 300 Q546 280 582 300", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("circle", { cx: 582, cy: 300, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      txt(tag, 671, 310, "One plan", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      button(box, "Seven pieces, one plan. Tap to scatter and rebuild", () => api.seek(0.3));
      return (t) => {
        const out = oc(seg(t, 0.3, 1.2));
        pieces.forEach((p, i) => {
          const k = out * (1 - io(seg(t, 1.8 + i * 0.24, 2.9 + i * 0.24)));
          p.g.setAttribute("transform", `translate(${p.mx * k} ${p.my * k}) rotate(${p.rot * k} ${p.cx} ${p.cy})`);
        });
        const s = t < 1.5 ? 1 - seg(t, 0.3, 0.55) : ob(seg(t, 4.4, 5));
        pop(tag, 510, 300, s, -14 * (1 - cl(s)));
      };
    },
  };

  /* ---- 2. a tank of 50 hours turns a waterwheel ---- */
  SC.waterwheel = {
    dur: 14, still: 14,
    build(svg, api) {
      const ST = [0.9, 2.35, 3.8, 5.25, 6.7], WX = 600, WY = 406, R = 92;
      const lvl = (L) => 312 - 148 * L;
      el("path", { d: "M36 590 H764", stroke: SOFT, "stroke-width": 8, "stroke-linecap": "round" }, svg);
      el("path", { d: "M552 590 L600 406 L648 590", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      el("path", { d: "M100 316 V590 M270 316 V590 M100 540 H270", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      const topup = el("g", {}, svg);
      el("path", { d: "M185 350 L240 372 V420 Q240 428 232 428 H138 Q130 428 130 420 V372 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, topup);
      el("path", { d: "M185 316 V362", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, topup);
      el("circle", { cx: 185, cy: 366, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, topup);
      txt(topup, 185, 409, "Top up", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      const pipe = "M298 292 H588 Q600 292 600 304 V308";
      el("path", { d: pipe, fill: "none", stroke: INK, "stroke-width": 18 }, svg);
      el("path", { d: pipe, fill: "none", stroke: SOFT, "stroke-width": 11 }, svg);
      const stream = el("path", { d: "M600 310 V328", stroke: SKY, "stroke-width": 9, "stroke-linecap": "round" }, svg);
      const sign = el("g", {}, svg);
      el("path", { d: "M435 236 V283", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, sign);
      el("rect", { x: 345, y: 176, width: 180, height: 60, rx: 14, fill: MINT, stroke: INK, "stroke-width": 3 }, sign);
      txt(sign, 435, 215, "New month", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const tank = el("g", {}, svg);
      ring(tank, 54, 70, 262, 262, 28);
      el("path", { d: "M70 86 V292 Q70 316 94 316 H276 Q300 316 300 292 V86 Z", fill: "#fff" }, tank);
      const water = el("path", { fill: SKY }, tank), surf = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tank);
      const shine = el("path", { stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round", opacity: 0.8 }, tank);
      [1, 0.84, 0.68, 0.52, 0.36, 0.2].forEach((L) => el("path", { d: `M300 ${lvl(L)} H288`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tank));
      el("path", { d: "M70 86 V292 Q70 316 94 316 H276 Q300 316 300 292 V86", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linejoin": "round" }, tank);
      el("path", { d: "M60 86 H310", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, tank);
      el("rect", { x: 86, y: 100, width: 198, height: 44, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tank);
      txt(tank, 185, 129, "50 hours a month", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      button(tank, "50 hours a month. Tap to skip ahead to the new month", () => api.seek(9.3));
      const wheel = el("g", {}, svg);
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4, d = `M0 0 L${(Math.cos(a) * R).toFixed(1)} ${(Math.sin(a) * R).toFixed(1)}`;
        el("path", { d, stroke: INK, "stroke-width": 11, "stroke-linecap": "round" }, wheel);
        el("path", { d, stroke: BLUE, "stroke-width": 5, "stroke-linecap": "round" }, wheel);
      }
      el("circle", { r: R, fill: "none", stroke: INK, "stroke-width": 20 }, wheel);
      el("circle", { r: R, fill: "none", stroke: BLUE, "stroke-width": 14 }, wheel);
      el("circle", { r: 20, fill: BLUE, stroke: INK, "stroke-width": 3 }, wheel);
      el("circle", { r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, wheel);
      const buckets = [0, 1, 2, 3].map(() => {
        const g = el("g", {}, svg), body = el("g", {}, g);
        el("path", { d: "M-58 10 Q0 -10 58 10", fill: "none", stroke: INK, "stroke-width": 2.5 }, body);
        el("path", { d: "M-62 10 H62 L54 50 H-54 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
        const lip = el("path", { d: "M-55 15 H55", stroke: SKY, "stroke-width": 5, "stroke-linecap": "round" }, body);
        txt(body, 0, 37.5, "Advanced task", { "text-anchor": "middle", "font-size": 13.5, "font-weight": 700 });
        el("circle", { r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        return { g, body, lip };
      });
      const drops = [0, 1, 2].map(() => el("circle", { r: 5, fill: SKY, stroke: INK, "stroke-width": 1.5 }, svg));
      const chats = [0, 1, 2].map(() => {
        const g = el("g", {}, svg);
        el("path", { d: "M-42 -22 H42 Q50 -22 50 -14 V10 Q50 18 42 18 H-12 L-26 30 L-24 18 H-42 Q-50 18 -50 10 V-14 Q-50 -22 -42 -22 Z", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        txt(g, 0, 6, "Chat", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        return g;
      });
      return (t) => {
        let turn = 0, used = 0, fill = 0, tip = 0, tq = 0;
        ST.forEach((s) => {
          turn += io(seg(t, s + 0.6, s + 1.3));
          used += oc(seg(t, s, s + 0.6));
          if (t >= s && t < s + 0.65) fill = seg(t, s, s + 0.45);
          const q = seg(t, s + 1.3, s + 2); if (q > 0 && q < 1) { tip = Math.sin(Math.PI * q); tq = q; }
        });
        const L = 1 - 0.16 * used + 0.8 * io(seg(t, 10.2, 11.8)), y = lvl(L), a = 3 * Math.sin((t * 2 * Math.PI) / 1.75);
        water.setAttribute("d", `M70 ${y} Q127.5 ${y - a} 185 ${y} T300 ${y} V292 Q300 316 276 316 H94 Q70 316 70 292 Z`);
        surf.setAttribute("d", `M72 ${y} Q127.5 ${y - a} 185 ${y} T298 ${y}`);
        shine.setAttribute("d", `M90 ${Math.max(y + 18, 200)} V286`); shine.setAttribute("opacity", y + 18 < 274 ? 0.8 : 0);
        stream.setAttribute("opacity", fill > 0 ? 1 : 0);
        const W = 90 * turn;
        tf(wheel, WX, WY, 1, W);
        buckets.forEach((b, j) => {
          const ang = (((W + j * 90) % 360) + 360) % 360, r = (ang * Math.PI) / 180;
          const top = ang < 1 || ang > 359, bottom = Math.abs(ang - 180) < 1;
          tf(b.g, WX + R * Math.sin(r), WY - R * Math.cos(r));
          b.body.setAttribute("transform", `rotate(${bottom ? -42 * tip : 0})`);
          b.lip.setAttribute("opacity", top ? fill : bottom ? (tip > 0 ? cl(1 - tq * 2) : 0) : ang < 180 ? 1 : 0);
        });
        drops.forEach((d, i) => { const q = cl(tq * 1.6 - 0.25 - i * 0.18); d.setAttribute("opacity", tip > 0 && q > 0 && q < 1 ? 1 : 0); d.setAttribute("cx", 556 - i * 9); d.setAttribute("cy", 548 + q * 34); });
        chats.forEach((g, i) => tf(g, ((((180 + 320 * i - (640 / 14) * t) % 960) + 960) % 960) - 80, 40 + 4 * Math.sin((t * 2 * Math.PI) / 3.5 + i * 2)));
        const tu = t < 1 ? 1 - seg(t, 0.2, 0.6) : ob(seg(t, 7.6, 8.2)), sw = seg(t, 7.6, 9.6);
        pop(topup, 185, 316, tu, t < 1 ? 0 : 8 * Math.sin(sw * Math.PI * 3) * (1 - sw));
        pop(sign, 435, 284, t < 1 ? 1 - seg(t, 0.2, 0.6) : ob(seg(t, 9.4, 10)));
      };
    },
  };

  /* ---- 3. a stone hops a hopscotch grid: each square shows a name ---- */
  SC.hopscotch = {
    dur: 11, still: 11,
    build(svg, api) {
      const CW = 182, CH = 150, S = [26, 520];
      const cells = [[52, 225, "Named helpers", "Sintra"], [234, 150, "Your computer", "Munder Difflin"], [234, 300, "Slack and phone", "Lindy"], [416, 225, "xAI plan", "Grok Bot"], [598, 150, "Claude plan", "Claude Cowork"], [598, 300, "Stay put", "Marblism"]];
      const grid = el("g", {}, svg);
      ring(grid, 38, 136, 756, 328, 22);
      const wob = (i) => (((i * 53) % 9) - 4) * 0.7;
      /* each chalk line drawn once, so shared edges never double up */
      const lines = [[234, 150, 416, 150], [598, 150, 780, 150], [52, 225, 234, 225], [416, 225, 598, 225], [234, 300, 416, 300], [598, 300, 780, 300], [52, 375, 234, 375], [416, 375, 598, 375], [234, 450, 416, 450], [598, 450, 780, 450], [52, 225, 52, 375], [234, 150, 234, 450], [416, 150, 416, 450], [598, 150, 598, 450], [780, 150, 780, 450]];
      const d = lines.map(([x1, y1, x2, y2], k) => { const h = y1 === y2; return `M${x1} ${y1} Q${(x1 + x2) / 2 + (h ? 0 : wob(k))} ${(y1 + y2) / 2 + (h ? wob(k) : 0)} ${x2} ${y2}`; }).join(" ");
      el("path", { d, fill: "none", stroke: INK, "stroke-width": 3.2, "stroke-linecap": "round" }, grid);
      el("path", { d, fill: "none", stroke: INK, "stroke-width": 1.2, "stroke-linecap": "round", opacity: 0.3, transform: "translate(1.6 1.2)" }, grid);
      const pos = cells.map(([x, y]) => [x + CW / 2, y + 128]);
      const cards = cells.map(([x, y, w, n]) => {
        txt(grid, x + CW / 2, y + 46, w, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        const g = el("g", {}, grid);
        el("rect", { x: x + 10, y: y + 62, width: CW - 20, height: 42, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2 }, g);
        txt(g, x + CW / 2, y + 89, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return { g, cx: x + CW / 2, cy: y + 83 };
      });
      const shadow = el("ellipse", { rx: 15, ry: 6, fill: SOFT }, grid);
      const dust = el("ellipse", { fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 7", "stroke-linecap": "round" }, grid);
      const stone = el("g", {}, grid);
      el("ellipse", { rx: 17, ry: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, stone);
      el("path", { d: "M-8 -4 Q-2 -8 5 -6", fill: "none", stroke: "#fff", "stroke-width": 2.5, "stroke-linecap": "round" }, stone);
      const H = [0, 1, 2, 3, 4, 5].map((i) => 1 + i * 1.15);
      button(grid, "Hopscotch grid. Tap to throw the stone again", () => api.seek(0));
      return (t) => {
        let from = pos[5], to = S, u = io(seg(t, 0, 0.8)), hgt = 140, land = -1;
        if (t >= 0.8) {
          from = S; to = pos[0]; u = 0; hgt = 90;
          H.forEach((h, i) => { if (t >= h) { from = i ? pos[i - 1] : S; to = pos[i]; u = io(seg(t, h, h + 0.7)); if (t >= h + 0.7) land = i; } });
        }
        const arc = Math.sin(Math.PI * u), x = from[0] + (to[0] - from[0]) * u, y = from[1] + (to[1] - from[1]) * u;
        tf(stone, x, y - hgt * arc, 1 + 0.3 * arc, 360 * u);
        shadow.setAttribute("cx", x); shadow.setAttribute("cy", y + 8); shadow.setAttribute("opacity", arc > 0.02 ? 1 : 0);
        const q = land < 0 ? 1 : seg(t, H[land] + 0.7, H[land] + 1.2), lp = land < 0 ? pos[0] : pos[land];
        dust.setAttribute("cx", lp[0]); dust.setAttribute("cy", lp[1]); dust.setAttribute("rx", 20 + 24 * q); dust.setAttribute("ry", 10 + 10 * q); dust.setAttribute("opacity", q < 1 ? 1 - q : 0);
        cards.forEach((c, i) => pop(c.g, c.cx, c.cy, t < 0.8 ? 1 - seg(t, 0, 0.35) : ob(seg(t, H[i] + 0.62, H[i] + 1.02))));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3, still: 3,
    build(svg) {
      el("rect", { x: 64, y: 70, width: 158, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 143, 97, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 64, 196, "Marblism", { "font-size": 74, "font-weight": 700 });
      txt(svg, 64, 276, "alternatives", { "font-size": 74, "font-weight": 700 });
      el("path", { d: "M68 304 H330", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 360, "5 tools like Marblism for AI employees", { "font-size": 25, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 470, "Checked 12 Nov 2026", { "font-size": 19, "font-weight": 600, fill: CAP });
      el("rect", { x: 604, y: 64, width: 280, height: 58, rx: 14, fill: GREY, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 744, 102, "Marblism", { "text-anchor": "middle", "font-family": MONO, "font-size": 25, "font-weight": 700 });
      const spine = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, svg);
      const tiles = ["Sintra", "Munder Difflin", "Lindy", "Grok Bot", "Claude Cowork"].map((n, i) => {
        const g = el("g", {}, svg), y = 148 + i * 62;
        el("path", { d: `M630 ${y + 25} H656`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("rect", { x: 656, y, width: 228, height: 50, rx: 12, fill: [BLUE, LIL, SKY, MINT, YEL][i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 770, y + 32, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
        return g;
      });
      return (t) => {
        spine.setAttribute("d", `M630 122 V${122 + (421 - 122) * oc(seg(t, 0.1, 2.1))}`);
        tiles.forEach((g, i) => { const k = seg(t, 0.35 + i * 0.28, 0.9 + i * 0.28); g.setAttribute("transform", `translate(${360 * (1 - oc(k))} 0)`); g.setAttribute("opacity", k > 0 ? 1 : 0); });
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
