/* Bright coded scenes for "Cursor pricing". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mix = (p, x, y, parts, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); parts.forEach(([s, mono]) => { const t = el("tspan", mono ? { "font-family": MONO } : {}, n); t.textContent = s; }); return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  let UID = 0; const uid = () => `mgc${++UID}`;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  // a transparent hit area plus the dashed focus ring, both the same box
  const hitbox = (g, x, y, w, h, rx = 14) => { el("rect", { x, y, width: w, height: h, rx, fill: "#fff", "fill-opacity": 0 }, g); el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 5", class: "mg-ring" }, g); };
  const pill = (svg, x, y, w, label, col, fn) => { const g = el("g", {}, svg); el("rect", { x: x - 5, y: y - 5, width: w + 10, height: 54, rx: 27, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g); el("rect", { x, y, width: w, height: 44, rx: 22, fill: col, stroke: INK, "stroke-width": 3 }, g); txt(g, x + w / 2, y + 29, label, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }); button(g, label, fn); return g; };
  const hint = (svg, x, y, s, anchor = "end") => txt(svg, x, y, s, { "text-anchor": anchor, "font-size": 16, "font-weight": 500, fill: MUTE });
  // a slightly tapered glass with rounded bottom corners
  const glass = (cx, top, bot, ht, hb) => `M${cx - ht} ${top} L${cx - hb} ${bot - 12} Q${cx - hb} ${bot} ${cx - hb + 12} ${bot} H${cx + hb - 12} Q${cx + hb} ${bot} ${cx + hb} ${bot - 12} L${cx + ht} ${top}`;
  const tag = (g, x, y, w, h, col) => { el("path", { d: `M${x + 14} ${y} H${x + w} V${y + h} H${x + 14} L${x} ${y + h / 2} Z`, fill: col, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g); el("circle", { cx: x + 13, cy: y + h / 2, r: 3.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, g); };

  const SC = {};

  /* ---- 1. five measuring cups, one per individual plan ---- */
  SC.cups = {
    dur: 12, still: 12,
    build(svg, api) {
      const PLANS = ["Free", "Plus", "Premium", "Super", "Ultra"], PRICE = ["$0", "$8", "$30", "$100", "$200"];
      const LINE = [[["limited"]], [["base"]], [["4x "], ["Plus", 1]], [["15x "], ["Plus", 1]], [["50x "], ["Plus", 1]]];
      const LV = [0.1, 0.24, 0.42, 0.66, 0.9], P = [0.9, 1, 1.1, 1.2, 1.5], S = [0.6, 2.6, 4.6, 6.6, 8.6];
      const X = (i) => 108 + i * 146, TOP = 160, BOT = 440, H = BOT - TOP;
      hint(svg, 400, 586, "tap a cup", "middle");
      const jug = el("g", {}, svg);
      el("path", { d: "M-30 -18 Q-46 -14 -44 2 Q-42 16 -29 14", fill: "none", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, jug);
      el("path", { d: "M-28 -30 H22 L40 -38 L30 -20 L28 30 Q28 36 22 36 H-22 Q-28 36 -28 30 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, jug);
      el("path", { d: "M-20 8 H20", stroke: INK, "stroke-width": 2, "stroke-opacity": 0.4, "stroke-linecap": "round" }, jug);
      const stream = el("rect", { width: 10, rx: 5, fill: BLUE }, svg);
      const refill = [-99, -99, -99, -99, -99];
      const cups = PLANS.map((name, i) => {
        const cx = X(i), g = el("g", {}, svg), id = uid(), d = glass(cx, TOP, BOT, 54, 46);
        el("path", { d: d + " Z", id, fill: SKY, "fill-opacity": 0.16 }, g);
        const cp = el("clipPath", { id: id + "c" }, g); el("path", { d: d + " Z" }, cp);
        const water = el("rect", { x: cx - 60, width: 120, fill: BLUE, "clip-path": `url(#${id}c)` }, g);
        const surf = el("rect", { x: cx - 60, width: 120, height: 5, fill: SKY, "clip-path": `url(#${id}c)` }, g);
        for (let k = 1; k <= 9; k++) { const y = BOT - k * 28, wx = cx - (46 + (8 * (BOT - y)) / H); el("path", { d: `M${wx + 4} ${y} H${wx + (k % 3 ? 11 : 18)}`, stroke: INK, "stroke-width": 1.5, "stroke-opacity": 0.45, "stroke-linecap": "round" }, g); }
        const ly = BOT - H * LV[i], half = 46 + (8 * (BOT - ly)) / H - 3;
        el("path", { d: `M${cx - half} ${ly} H${cx + half}`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 5" }, g);
        const lab = mix(g, cx, ly - 9, LINE[i], { "text-anchor": "middle", "font-size": 16, "font-weight": 700 });
        el("path", { d, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        el("path", { d: `M${cx - 58} ${TOP} H${cx + 58}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        txt(g, cx, 482, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        tag(g, cx - 44, 500, 88, 36, YEL);
        txt(g, cx + 7, 525, PRICE[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        hitbox(g, cx - 66, TOP - 14, 132, 400);
        button(g, `${name}, ${PRICE[i]}: pour it again`, () => { refill[i] = api.now(); api.poke(); });
        return { water, surf, lab };
      });
      const tilt = (u, i) => 45 * (io(seg(u, 0, 0.3)) - io(seg(u, 0.3 + P[i], 0.6 + P[i])));
      const spout = (a) => { const r = (a * Math.PI) / 180; return [40 * Math.cos(r) + 38 * Math.sin(r), 40 * Math.sin(r) - 38 * Math.cos(r)]; };
      return (t, now) => {
        let pos = 0, ang = 0, pour = -1;
        for (let i = 4; i >= 0; i--) if (t >= S[i]) { const u = t - S[i]; ang = tilt(u, i); pos = i < 4 ? i + io(seg(u, 0.6 + P[i], S[i + 1] - S[i])) : i; if (u > 0.3 && u < 0.3 + P[i]) pour = i; break; }
        const over = refill.findIndex((r, i) => now - r >= 0 && now - r < 0.7 + P[i]);
        if (over >= 0) { const u = now - refill[over]; pos = over; ang = tilt(u, over); pour = u > 0.3 && u < 0.3 + P[over] ? over : -1; }
        const [sx, sy] = spout(ang), jx = X(Math.floor(pos)) + (X(Math.ceil(pos)) - X(Math.floor(pos))) * (pos % 1) - sx;
        tf(jug, jx, 96, 1, ang);
        cups.forEach((c, i) => {
          const u = over === i ? now - refill[i] : t - S[i], lv = LV[i] * oc(seg(u, 0.3, 0.3 + P[i])), y = BOT - H * lv;
          c.water.setAttribute("y", y); c.water.setAttribute("height", H * lv + 4); c.surf.setAttribute("y", y); c.surf.setAttribute("opacity", lv > 0.01 ? 1 : 0);
          c.lab.setAttribute("opacity", seg(u, 0.3 + P[i] * 0.85, 0.5 + P[i]));
          if (pour === i) { const top = 96 + sy; stream.setAttribute("x", X(i) - 5); stream.setAttribute("y", top); stream.setAttribute("height", Math.max(0, y - top + 4)); }
        });
        stream.setAttribute("opacity", pour >= 0 ? 1 : 0);
      };
    },
  };

  /* ---- 2. a toy railway splits at a set of points ---- */
  SC.points = {
    dur: 12, still: 12,
    build(root, api) {
      const svg = el("g", { transform: "translate(0 -40)" }, root);
      const D1 = "M-60 400 H860", D2 = "M300 400 C390 400 410 230 500 230 H860", DR = "M-60 400 H300 C390 400 410 230 500 230 H860";
      [D1, D2].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 22, fill: "none" }, svg));
      [D1, D2].forEach((d) => el("path", { d, stroke: SOFT, "stroke-width": 16, fill: "none" }, svg));
      const bladeS = el("path", { d: "M300 400 H400", stroke: YEL, "stroke-width": 16, fill: "none" }, svg);
      const bladeB = el("path", { d: "M300 400 C390 400 410 230 500 230", stroke: YEL, "stroke-width": 16, fill: "none", "stroke-dasharray": "110 400" }, svg);
      [D1, D2].forEach((d) => el("path", { d, stroke: LIL, "stroke-width": 16, fill: "none", "stroke-dasharray": "4 12" }, svg));
      txt(svg, 770, 450, "legacy plan", { "text-anchor": "end", "font-size": 22 });
      txt(svg, 770, 160, "The X Subscription", { "text-anchor": "end", "font-family": MONO, "font-size": 22, "font-weight": 700 });
      const r1 = el("path", { d: D1, fill: "none", stroke: "none" }, svg), r2 = el("path", { d: DR, fill: "none", stroke: "none" }, svg);
      const L1 = r1.getTotalLength(), L2 = r2.getTotalLength();
      let stop2 = L2; for (let l = 0; l < L2; l += 2) { const p = r2.getPointAtLength(l); if (p.y < 300 && p.x >= 690) { stop2 = l; break; } }
      const stop1 = 680 + 60;
      const block = el("g", {}, svg);
      el("rect", { x: -16, y: -40, width: 32, height: 36, rx: 4, fill: LIL, stroke: INK, "stroke-width": 3 }, block);
      el("rect", { x: -24, y: -34, width: 48, height: 11, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, block);
      const wagon = (col, label) => {
        const g = el("g", {}, svg);
        el("rect", { x: -40, y: -40, width: 80, height: 32, rx: 7, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -22, y: -34, width: 44, height: 20, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        if (label) txt(g, 0, -18.5, label, { "text-anchor": "middle", "font-family": MONO, "font-size": 15, "font-weight": 700 });
        [-24, 24].forEach((x) => { el("circle", { cx: x, cy: -5, r: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g); });
        return g;
      };
      const w1 = wagon(YEL, "Pro"), w2 = wagon(BLUE, "");
      const place = (w, path, l) => { const p = path.getPointAtLength(l), q = path.getPointAtLength(Math.min(l + 1, path.getTotalLength())); tf(w, p.x, p.y, 1, (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI); };
      [[306, 490, 112, "optional", SKY], [306, 536, 130, "permanent", LIL]].forEach(([x, y, w, s, col], i) => {
        el("path", { d: i ? "M290 526 V554 H306" : "M278 508 H306", fill: "none", stroke: INK, "stroke-width": 2 }, svg);
        tag(svg, x, y, w, 36, col); txt(svg, x + 16 + (w - 16) / 2, y + 24, s, { "text-anchor": "middle", "font-size": 18 });
      });
      hint(svg, 196, 514, "tap the lever");
      const lever = el("g", {}, svg);
      hitbox(lever, 204, 416, 92, 122);
      const stick = el("g", {}, lever);
      el("path", { d: "M0 0 V-70", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, stick);
      el("circle", { cx: 0, cy: -72, r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, stick);
      el("rect", { x: 222, y: 500, width: 56, height: 26, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 3 }, lever);
      button(lever, "Pull the lever: the next wagon takes the branch", () => api.seek(4.2));
      return (t) => {
        place(w1, r1, stop1 * io(seg(t, 0.5, 4)));
        place(w2, r2, stop2 * io(seg(t, 5.6, 9.2)));
        const k = io(seg(t, 4.4, 5)); tf(stick, 250, 504, 1, -24 + 48 * k);
        const b = seg(t, 4.8, 5.1); bladeS.setAttribute("opacity", 1 - b); bladeB.setAttribute("opacity", b);
        const d = seg(t, 9.3, 9.9); tf(block, 590, 234 - 170 * (1 - ob(d))); block.setAttribute("opacity", d > 0 ? 1 : 0);
      };
    },
  };

  /* ---- 3. a weekly pool and a wallet of prepaid credit ---- */
  SC.wallet = {
    dur: 12, still: 12,
    build(svg, api) {
      const T = [200, 235], R = 105, id = uid();
      txt(svg, 200, 104, "weekly pool", { "text-anchor": "middle", "font-size": 22 });
      [[150, 128], [250, 272]].forEach(([a, b]) => el("path", { d: `M${a} 320 L${b} 386`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg));
      el("rect", { x: 193, y: 334, width: 14, height: 50, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M186 380 H214 V392 Q214 398 208 398 H192 Q186 398 186 392 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M200 362 H226", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("circle", { cx: T[0], cy: T[1], r: R, fill: "#fff" }, svg);
      const cp = el("clipPath", { id }, svg); el("circle", { cx: T[0], cy: T[1], r: R - 2 }, cp);
      const water = el("rect", { x: T[0] - R, width: 2 * R, fill: BLUE, "clip-path": `url(#${id})` }, svg);
      const surf = el("rect", { x: T[0] - R, width: 2 * R, height: 6, fill: SKY, "clip-path": `url(#${id})` }, svg);
      el("circle", { cx: T[0], cy: T[1], r: R, fill: "none", stroke: INK, "stroke-width": 4 }, svg);
      el("path", { d: "M286 175 L322 164", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      txt(svg, 345, 116, "weekly reset", { "text-anchor": "middle", "font-size": 16, "font-weight": 700 });
      el("circle", { cx: 345, cy: 155, r: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M345 129 V138", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const needle = el("path", { d: "M0 0 V-18", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, svg);
      el("circle", { cx: 345, cy: 155, r: 4, fill: MINT, stroke: INK, "stroke-width": 2 }, svg);
      const stream = el("rect", { x: 195, y: 398, width: 10, rx: 5, fill: BLUE }, svg);
      const cup = (cx, label) => {
        const d = glass(cx, 430, 530, 50, 44), i2 = uid();
        el("path", { d: d + " Z", fill: SKY, "fill-opacity": 0.16 }, svg);
        const c = el("clipPath", { id: i2 }, svg); el("path", { d: d + " Z" }, c);
        const w = el("rect", { x: cx - 56, width: 112, fill: BLUE, "clip-path": `url(#${i2})` }, svg);
        const g = el("g", {}, svg);
        el("path", { d, fill: "none", stroke: INK, "stroke-width": 3.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        el("path", { d: `M${cx - 54} 430 H${cx + 54}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        mix(svg, cx, 566, label, { "text-anchor": "middle", "font-size": 18 });
        return { w, g };
      };
      const c1 = cup(200, [["Grok", 1], [" and "], ["Composer", 1]]);
      const c2 = cup(690, [["third party models"]]);
      txt(svg, 550, 110, "prepaid credit", { "text-anchor": "middle", "font-size": 22 });
      el("path", { d: "M456 200 L472 138 H628 L644 200 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      [[512, 196], [546, 188], [582, 196]].forEach(([x, y]) => { el("circle", { cx: x, cy: y, r: 15, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg); el("circle", { cx: x, cy: y, r: 8, fill: "none", stroke: INK, "stroke-width": 1.5 }, svg); });
      el("rect", { x: 450, y: 200, width: 200, height: 110, rx: 16, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M600 236 H650 V274 H600 Q588 274 588 262 V248 Q588 236 600 236 Z", fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 606, cy: 255, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, svg);
      const N = 6, coins = Array.from({ length: N }, () => { const g = el("g", {}, svg); el("circle", { r: 15, fill: YEL, stroke: INK, "stroke-width": 2.5, "vector-effect": "non-scaling-stroke" }, g); el("circle", { r: 8, fill: "none", stroke: INK, "stroke-width": 1.5, "vector-effect": "non-scaling-stroke" }, g); return g; });
      c2.g.parentNode.appendChild(c2.g);
      hint(svg, 626, 58, "tap Reset");
      pill(svg, 640, 30, 120, "Reset", MINT, () => api.seek(7.9));
      return (t) => {
        const lv = 0.86 * (1 - seg(t, 0.6, 4.2)) + 0.86 * io(seg(t, 8.9, 10.6)), wy = T[1] + R - 2 * R * lv;
        water.setAttribute("y", wy); water.setAttribute("height", 2 * R * lv + 2); surf.setAttribute("y", wy); surf.setAttribute("opacity", lv > 0.01 ? 1 : 0);
        const f1 = 0.8 * seg(t, 0.75, 4.35), y1 = 530 - 100 * f1;
        c1.w.setAttribute("y", y1); c1.w.setAttribute("height", 100 * f1 + 2);
        const on = t > 0.6 && t < 4.3; stream.setAttribute("opacity", on ? 1 : 0); stream.setAttribute("height", Math.max(0, y1 - 398 + 4));
        c2.w.setAttribute("height", 0);
        coins.forEach((c, k) => {
          const u = seg(t, 4.8 + 0.5 * k, 5.45 + 0.5 * k), e = io(u), ty = 518 - k * 13, tx = 690 + (k % 2 ? 4 : -4);
          const x = (1 - e) ** 2 * 560 + 2 * e * (1 - e) * 700 + e * e * tx, y = (1 - e) ** 2 * 205 + 2 * e * (1 - e) * 70 + e * e * ty;
          const land = seg(u, 0.85, 1);
          c.setAttribute("transform", `translate(${x} ${y}) scale(${1 + 0.8 * land} ${1 - 0.5 * land})`);
          c.setAttribute("opacity", u > 0 ? 1 : 0);
        });
        needle.setAttribute("transform", `translate(345 155) rotate(${-130 + 130 * io(seg(t, 8, 8.8))})`);
      };
    },
  };

  /* ---- 4. an abacus counts the first paid plan of each tool ---- */
  SC.abacus = {
    dur: 11, still: 11,
    build(svg, api) {
      const ROWS = [["Cursor Premium", "$30", 15, BLUE], ["Claude Pro", "$20", 10, LIL], ["Codex Plus", "$20", 10, SKY], ["Copilot Pro", "$10", 5, MINT]];
      const frame = (g, y, h) => { el("rect", { x: 236, y, width: 468, height: h, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, g); el("rect", { x: 252, y: y + 16, width: 436, height: h - 32, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2 }, g); };
      const row = (g, y, [name, price, n, col]) => {
        el("path", { d: `M252 ${y} H688`, stroke: INK, "stroke-width": 3 }, g);
        txt(g, 224, y + 7, name, { "text-anchor": "end", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        const beads = Array.from({ length: 15 }, (_, j) => { const b = el("rect", { x: -8.5, y: -15, width: 17, height: 30, rx: 8, fill: j >= 15 - n ? col : SOFT, stroke: INK, "stroke-width": 2.5 }, g); tf(b, 254 + 9 + j * 18, y); return { b, j, x0: 263 + j * 18 }; });
        const tg = el("g", {}, g); tag(tg, 0, -17, 72, 34, "#fff"); txt(tg, 42, 7, price, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
        return { y, n, beads, tg };
      };
      const main = el("g", {}, svg); frame(main, 108, 304);
      const rows = ROWS.map((r, i) => row(main, 160 + i * 65, r));
      const fifth = el("g", {}, svg); frame(fifth, 446, 76);
      const plus = row(fifth, 484, ["Cursor Plus", "$8", 4, YEL]);
      const note = txt(svg, 786, 556, "own models only", { "text-anchor": "end", "font-size": 16, "font-weight": 500, fill: CAP });
      hint(svg, 650, 62, "tap Slide");
      pill(svg, 664, 30, 110, "Slide", LIL, () => api.seek(0.01));
      const run = (r, s) => {
        r.beads.forEach(({ b, j, x0 }) => { const mv = j >= 15 - r.n ? io(seg(s, (14 - j) * 0.03, 0.8 + (14 - j) * 0.03)) * 162 : 0; tf(b, x0 + mv, r.y); });
        const k = ob(seg(s, 0.9, 1.3)); r.tg.setAttribute("transform", `translate(714 ${r.y}) scale(${0.4 + 0.6 * k})`); r.tg.setAttribute("opacity", seg(s, 0.9, 1.05));
      };
      return (t) => {
        rows.forEach((r, i) => run(r, t - (0.6 + i * 1.3)));
        const f = io(seg(t, 6, 7)); fifth.setAttribute("transform", `translate(0 ${110 * (1 - f)})`); fifth.setAttribute("opacity", seg(t, 6, 6.5));
        run(plus, t - 7.2);
        note.setAttribute("opacity", seg(t, 8.6, 9.2));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 9, still: 9,
    build(svg) {
      el("rect", { x: 64, y: 58, width: 128, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 128, 85, "Pricing", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      mix(svg, 64, 190, [["Cursor", 1], [" pricing"]], { "font-size": 80, "font-weight": 700 });
      el("path", { d: "M66 216 H560", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 266, "Every plan after the 12 Oct change", { "font-size": 28, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 302, "Checked 26 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      el("path", { d: "M30 350 Q480 446 930 350", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const PRICES = ["$0", "$8", "$30", "$100", "$200"], COLS = [YEL, BLUE, LIL, SKY, MINT];
      const tags = PRICES.map((p, i) => {
        const x = 150 + i * 165, u = (x - 30) / 900, y = 350 + 192 * u * (1 - u), g = el("g", {}, svg);
        el("path", { d: "M0 0 V24", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-40 24 H40 L56 42 V92 Q56 98 50 98 H-50 Q-56 98 -56 92 V42 Z", fill: COLS[i], stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cx: 0, cy: 38, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, 0, 82, p, { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
        el("circle", { cx: x, cy: y, r: 5, fill: INK }, svg);
        return { g, x, y, s: 0.3 + i * 0.28 };
      });
      return (t) => tags.forEach((g) => {
        const s = t - g.s, d = ob(seg(s, 0, 0.6)), r = s > 0 ? 18 * Math.exp(-1.1 * s) * Math.sin(5 * s + 1.2) : 0;
        tf(g.g, g.x, g.y - 220 * (1 - d), 1, r); g.g.setAttribute("opacity", s > 0 ? 1 : 0);
      });
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
