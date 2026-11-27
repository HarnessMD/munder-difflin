/* Bright coded scenes for "Holiday Shipping Deadlines 2026". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, cx, cy, dx, dy, s = 1, r = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${s}) translate(${-cx} ${-cy})`);
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * max) / w); return n; };
  let uid = 0;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (g, x, y, w, h, r = 16) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 6", class: "mg-ring" }, g);
  const starD = (r) => { let d = ""; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.47 : r; d += (i ? "L" : "M") + (Math.cos(a) * q).toFixed(2) + " " + (Math.sin(a) * q).toFixed(2); } return d + "Z"; };

  /* a sleigh drawn with its deck at y 0, back post at x 0 and the front curl near x 726; w scales the strokes */
  const sleighShape = (g, w = 1) => {
    el("path", { d: "M150 74 V104 M540 74 V104", stroke: INK, "stroke-width": 5 * w, "stroke-linecap": "round" }, g);
    el("path", { d: "M30 104 H640 Q700 104 716 70 Q722 54 708 50", stroke: INK, "stroke-width": 6 * w, fill: "none", "stroke-linecap": "round" }, g);
    el("path", { d: "M0 -58 Q0 -74 17 -74 Q34 -74 34 -58 V0 H630 Q664 0 676 -26 Q688 -50 708 -50 Q728 -50 726 -28 Q720 30 668 58 Q636 74 590 74 H40 Q0 74 0 34 Z", fill: BLUE, stroke: INK, "stroke-width": 3 * w, "stroke-linejoin": "round" }, g);
    el("rect", { x: 54, y: 26, width: 560, height: 18, rx: 9, fill: YEL, stroke: INK, "stroke-width": 2.5 * w }, g);
  };

  const SC = {};

  /* ---- 1. a sleigh glides in with four parcels, one per ship by date ---- */
  SC.sleigh = {
    dur: 9, still: 9,
    build(svg, api) {
      const P = [["Ground Advantage", "17 Dec", "USPS", YEL], ["Priority Mail", "18 Dec", "USPS", LIL], ["Priority Mail Express", "19 Dec", "USPS", SKY], ["Next Day Air", "23 Dec", "UPS", MINT]];
      const PW = 282, PH = 124, GAP = 14, SX = 37, SY = 384;
      const track = el("rect", { x: 40, y: 498, width: 720, height: 14, rx: 7, fill: SOFT }, svg);
      const lines = [176, 262, 346].map(() => el("path", { d: "M0 0", stroke: SKY, "stroke-width": 7, "stroke-linecap": "round", fill: "none" }, svg));
      const sled = el("g", {}, svg), load = el("g", {}, sled);
      const st = P.map(() => ({ a: -1e9, v0: 0, to: 0, v: 0 }));
      let up = -1;
      const aim = (i, to) => { const s = st[i]; s.v0 = s.v; s.to = to; s.a = api.now(); };
      const parcels = P.map((p, i) => {
        const px = 44 + (i % 2) * (PW + GAP), py = i < 2 ? -(PH * 2 + GAP) : -PH;
        const g = el("g", {}, load);
        const shade = el("rect", { x: 8, y: 14, width: PW, height: PH, rx: 12, fill: SOFT, opacity: 0 }, g);
        el("rect", { width: PW, height: PH, rx: 12, fill: p[3], stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: 1.5, y: 12, width: PW - 3, height: 30, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M36 27 C24 8 6 14 13 27 C6 40 24 46 36 27 Z M36 27 C48 8 66 14 59 27 C66 40 48 46 36 27 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("circle", { cx: 36, cy: 27, r: 5.5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        const car = mono(g, 76, 34, p[2], { "font-size": 19 });
        const svc = fit(txt(g, 18, 76, p[0], { "font-size": 22 }), PW - 36);
        const date = txt(g, 18, 112, p[1], { "font-size": 32, "font-weight": 700 });
        ring(g, -7, -7, PW + 14, PH + 14, 18);
        button(g, `${p[0]}, ${p[2]}, ${p[1]}`, () => { if (up === i) { aim(i, 0); up = -1; } else { if (up >= 0) aim(up, 0); aim(i, 1); up = i; } api.busy(0.8); });
        return { g, shade, car, svc, date, px, py };
      });
      sleighShape(sled);
      return (t, now) => {
        const k = seg(t, 0.3, 3.2), x = -800 + (SX + 800) * ob(k, 0.9), speed = k < 1 ? Math.pow(1 - k, 1.4) : 0;
        tf(sled, x, SY + Math.sin(t * 8) * 3 * speed);
        track.setAttribute("opacity", oc(seg(t, 0, 0.5)));
        lines.forEach((n, j) => { const y = [176, 262, 346][j], L = 190 * speed * (1 - 0.18 * j); n.setAttribute("d", `M${x - 30 - L} ${y} H${x - 30}`); n.setAttribute("opacity", L > 4 ? 1 : 0); });
        parcels.forEach((p, i) => {
          const s = st[i], q = api.calm ? 1 : seg(now, s.a, s.a + 0.5);
          s.v = s.v0 + (s.to - s.v0) * (s.to ? ob(q, 1.2) : io(q));
          const h = seg(t, 3.0 + i * 0.1, 3.45 + i * 0.1), hop = Math.sin(Math.PI * h);
          const dy = Math.sin(t * 12 + i * 1.7) * 2.2 * speed - 16 * hop - 38 * s.v;
          about(p.g, PW / 2, PH / 2, p.px, p.py + dy, 1 + 0.06 * s.v, 3 * hop * (i % 2 ? -1 : 1));
          p.shade.setAttribute("opacity", cl(s.v));
          const a = oc(seg(t, 3.5 + i * 0.1, 3.9 + i * 0.1));
          p.svc.setAttribute("opacity", a); p.svc.setAttribute("transform", `translate(0 ${10 * (1 - a)})`);
          const d = seg(t, 4.0 + i * 0.1, 4.45 + i * 0.1);
          p.date.setAttribute("opacity", cl(d * 3)); about(p.date, 18, 112, 0, 0, d > 0 ? ob(d) : 0.01);
          const c = oc(seg(t, 4.7 + i * 0.1, 5.1 + i * 0.1));
          p.car.setAttribute("opacity", c); p.car.setAttribute("transform", `translate(${-12 * (1 - c)} 0)`);
        });
      };
    },
  };

  /* ---- 2. a gift tag fills in line by line ---- */
  SC.giftbox = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const L = ["Person", "Budget", "Idea", "Order by", "Ship by", "Status"], HX = 560, HY = 160, Y = (i) => 74 + i * 56;
      const defs = el("defs", {}, svg);
      const base = el("g", {}, svg);
      el("rect", { x: 88, y: 278, width: 288, height: 254, rx: 12, fill: SOFT }, base);
      el("rect", { x: 76, y: 266, width: 288, height: 254, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, base);
      el("rect", { x: 77.5, y: 374, width: 285, height: 38, fill: LIL, stroke: INK, "stroke-width": 2.5 }, base);
      el("rect", { x: 200, y: 267.5, width: 40, height: 251, fill: LIL, stroke: INK, "stroke-width": 2.5 }, base);
      const lid = el("g", {}, svg);
      el("rect", { x: 56, y: 214, width: 328, height: 56, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, lid);
      el("rect", { x: 200, y: 215.5, width: 40, height: 53, fill: LIL, stroke: INK, "stroke-width": 2.5 }, lid);
      const bow = el("g", {}, svg);
      el("path", { d: "M214 214 L194 254 L207 256 L224 218 Z M226 214 L246 254 L233 256 L216 218 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, bow);
      el("path", { d: "M220 210 C192 168 140 172 150 202 C156 224 194 222 220 210 Z M220 210 C248 168 300 172 290 202 C284 224 246 222 220 210 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bow);
      el("circle", { cx: 220, cy: 210, r: 13, fill: LIL, stroke: INK, "stroke-width": 3 }, bow);
      const TAG = "M-56 -34 H56 L150 36 V378 Q150 398 130 398 H-130 Q-150 398 -150 378 V36 Z";
      const tag = el("g", {}, svg);
      el("path", { d: TAG, fill: LIL, transform: "translate(10 10)" }, tag);
      el("path", { d: TAG, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      const string = el("path", { d: `M286 198 Q420 240 ${HX} ${HY}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1 }, svg);
      ring(tag, -164, -48, 328, 460, 22);
      const rows = L.map((s, i) => {
        const id = `mggift${++uid}`, cp = el("clipPath", { id }, defs), cr = el("rect", { x: -132, y: Y(i) - 32, width: 0, height: 52 }, cp);
        const g = el("g", { "clip-path": `url(#${id})` }, tag);
        el("path", { d: `M-118 ${Y(i) + 13} H118`, stroke: BLUE, "stroke-width": 3, "stroke-linecap": "round" }, g);
        const lab = mono(g, -118, Y(i), s, { "font-size": 22 });
        if (i === 5) txt(g, -118 + lab.getComputedTextLength() + 20, Y(i), "Ordered", { "font-size": 25, "font-weight": 700 });
        return { g, cr };
      });
      const tick = el("g", {}, tag);
      el("circle", { r: 18, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tick);
      el("path", { d: "M-8 0 L-2 7 L9 -7", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);
      const pen = el("g", {}, svg);
      el("rect", { x: 22, y: -9, width: 104, height: 18, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, pen);
      el("path", { d: "M22 -9 L1 0 L22 9 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, pen);
      el("path", { d: "M8 -3.4 L0 0 L8 3.4 Z", fill: INK }, pen);
      el("rect", { x: 126, y: -9, width: 12, height: 18, fill: MINT, stroke: INK, "stroke-width": 2.5 }, pen);
      el("rect", { x: 138, y: -9, width: 16, height: 18, rx: 5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pen);
      let clr = -1e9, snap = 0, cur = 0;
      button(tag, "Gift tag: Person, Budget, Idea, Order by, Ship by, Status Ordered. Clear it and fill it again", () => { snap = cur; clr = api.now(); api.busy(6.6); });
      const REST = [96, 566], WS = (i) => 0.4 + i * 0.75, END = 99;
      return (t, now) => {
        const s = now - clr, tapped = clr > -1e8 && s >= 0;
        let wt = t - 2.4, fade = 1;
        if (tapped) { if (api.calm) wt = s < 0.6 ? -1 : END; else if (s < 0.45) { wt = snap; fade = 1 - oc(s / 0.45); } else wt = s - 0.5; }
        cur = wt;
        const b = ob(seg(t, 0, 0.6)); base.setAttribute("opacity", cl(seg(t, 0, 0.25))); base.setAttribute("transform", `translate(0 ${40 * (1 - b)})`);
        const ld = seg(t, 0.35, 0.85); lid.setAttribute("opacity", cl(ld * 4)); lid.setAttribute("transform", `translate(0 ${-60 * (1 - ob(ld))})`);
        const bw = seg(t, 0.7, 1.1); about(bow, 220, 210, 0, 0, bw > 0 ? ob(bw) : 0.01);
        string.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 0.9, 1.4)));
        const ts = seg(t, 1.2, 1.7), u = Math.max(0, t - 1.2), v = tapped && !api.calm ? s : 99;
        const ang = 16 * Math.exp(-3.2 * u) * Math.cos(6.5 * u) + 6 * Math.exp(-4 * v) * Math.sin(9 * v);
        tf(tag, HX, HY, ts > 0 ? ob(ts) : 0.01, ang);
        const rad = (ang * Math.PI) / 180, P = (lx, ly) => [HX + lx * Math.cos(rad) - ly * Math.sin(rad), HY + lx * Math.sin(rad) + ly * Math.cos(rad)];
        rows.forEach((r, i) => { const w = seg(wt, WS(i), WS(i) + 0.55); r.cr.setAttribute("width", w >= 1 ? 300 : w > 0 ? 14 + 236 * w : 0); r.g.setAttribute("opacity", fade); });
        const tk = seg(wt, 4.9, 5.35); tf(tick, 110, Y(5) - 9, tk > 0 ? ob(tk) * (0.4 + 0.6 * fade) : 0.01); tick.setAttribute("opacity", tk > 0 ? fade : 0);
        let lx = -118, ly = Y(0) + 4, toRest = 1;
        if (wt < 0.4) { toRest = 1 - io(seg(wt, 0, 0.4)); }
        else if (wt < 4.7) {
          const i = Math.min(5, Math.floor((wt - 0.4) / 0.75)), q = wt - WS(i);
          if (q < 0.55) { const w = q / 0.55; lx = -118 + 236 * w; ly = Y(i) + 4 + Math.sin(w * 38) * 2.5; }
          else { const m = io(seg(q, 0.55, 0.75)); lx = 118 - 236 * m; ly = Y(i) + 4 + (Y(i + 1) - Y(i)) * m; }
          toRest = 0;
        } else { lx = 118; ly = Y(5) + 4; toRest = io(seg(wt, 4.75, 5.45)); }
        const [wx, wy] = P(lx, ly), pin = tapped ? 1 : oc(seg(t, 1.8, 2.3));
        const px = wx + (REST[0] - wx) * toRest - 40 * (1 - pin), py = wy + (REST[1] - wy) * toRest;
        tf(pen, px, py, 1, (-50 + ang) * (1 - toRest)); pen.setAttribute("opacity", pin);
      };
    },
  };

  /* ---- 3. an advent calendar opens its ship by doors ---- */
  SC.adventcalendar = {
    dur: 9, still: 9,
    build(svg, api) {
      const D = [["9 Dec", "Abroad"], ["17 Dec", "Ground"], ["18 Dec", "Priority"], ["19 Dec", "Express"], ["23 Dec", "Overnight"]];
      const DX = [100, 310, 520], DY = [76, 298], W = 180, H = 196, OP = (i) => 1.3 + i * 0.85;
      el("rect", { x: 100, y: 548, width: 600, height: 10, rx: 5, fill: SOFT }, svg);
      const brd = el("g", {}, svg);
      el("path", { d: "M156 510 L144 550 H222 L210 510 Z M590 510 L578 550 H656 L644 510 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, brd);
      el("rect", { x: 92, y: 62, width: 640, height: 462, rx: 26, fill: LIL }, brd);
      el("rect", { x: 80, y: 50, width: 640, height: 462, rx: 26, fill: SKY, stroke: INK, "stroke-width": 3 }, brd);
      const st = D.map(() => ({ a: -1e9, o0: 1, f: false, o: 0 }));
      const doors = D.map(([date, word], i) => {
        const x = DX[i % 3], y = DY[Math.floor(i / 3)], cx = x + 104, g = el("g", {}, brd);
        ring(g, x - 8, y - 8, W + 16, H + 16, 20);
        el("rect", { x, y, width: W, height: H, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const rays = el("g", {}, g);
        for (let j = 0; j < 8; j++) { const a = (j * Math.PI) / 4 + Math.PI / 8; el("path", { d: `M${(Math.cos(a) * 34).toFixed(1)} ${(Math.sin(a) * 34).toFixed(1)} L${(Math.cos(a) * 44).toFixed(1)} ${(Math.sin(a) * 44).toFixed(1)}`, stroke: YEL, "stroke-width": 5, "stroke-linecap": "round" }, rays); }
        const star = el("path", { d: starD(27), fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        const words = el("g", {}, g);
        txt(words, cx, y + 132, date, { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
        mono(words, cx, y + 170, word, { "text-anchor": "middle", "font-size": 21 });
        const panel = el("g", {}, g);
        const leaf = el("rect", { x, y, width: W, height: H, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, panel);
        const inset = el("rect", { x: x + 16, y: y + 16, width: W - 32, height: H - 32, rx: 10, fill: "none", stroke: LIL, "stroke-width": 2.5 }, panel);
        const knob = el("ellipse", { cx: x + 152, cy: y + H / 2, rx: 9, ry: 9, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, panel);
        button(g, `${date} ${word}. Close the door and open it again`, () => { const s = st[i]; s.o0 = s.o; s.a = api.now(); api.busy(1.7); });
        return { g, rays, star, words, leaf, inset, knob, x, y, cx };
      });
      const last = el("g", {}, brd), LX = DX[2], LY = DY[1];
      el("rect", { x: LX, y: LY, width: W, height: H, rx: 14, fill: LIL, stroke: INK, "stroke-width": 3 }, last);
      el("rect", { x: LX + 16, y: LY + 16, width: W - 32, height: H - 32, rx: 10, fill: "none", stroke: SOFT, "stroke-width": 2.5 }, last);
      txt(last, LX + W / 2, LY + 82, "25 Dec", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      const band = el("rect", { x: LX + 1.5, y: LY + 112, width: W - 3, height: 28, fill: MINT, stroke: INK, "stroke-width": 2.5 }, last);
      const bow = el("g", {}, last), BX = LX + W / 2, BY = LY + 126;
      el("path", { d: `M${BX - 5} ${BY + 4} L${BX - 22} ${BY + 46} L${BX - 9} ${BY + 48} L${BX + 3} ${BY + 8} Z M${BX + 5} ${BY + 4} L${BX + 22} ${BY + 46} L${BX + 9} ${BY + 48} L${BX - 3} ${BY + 8} Z`, fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, bow);
      el("path", { d: `M${BX} ${BY} C${BX - 22} ${BY - 34} ${BX - 58} ${BY - 26} ${BX - 50} ${BY - 4} C${BX - 44} ${BY + 14} ${BX - 18} ${BY + 10} ${BX} ${BY} Z M${BX} ${BY} C${BX + 22} ${BY - 34} ${BX + 58} ${BY - 26} ${BX + 50} ${BY - 4} C${BX + 44} ${BY + 14} ${BX + 18} ${BY + 10} ${BX} ${BY} Z`, fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, bow);
      el("circle", { cx: BX, cy: BY, r: 10, fill: MINT, stroke: INK, "stroke-width": 2.5 }, bow);
      const pops = doors.map((d) => [d.g, d.x + W / 2, d.y + H / 2]).concat([[last, LX + W / 2, LY + H / 2]]);
      return (t, now) => {
        const e = seg(t, 0, 0.7); brd.setAttribute("opacity", cl(e * 3)); brd.setAttribute("transform", `translate(0 ${40 * (1 - ob(e))})`);
        doors.forEach((d, i) => {
          const s = st[i], ago = now - s.a, hit = s.a > -1e8;
          let o = s.f ? 1 : io(seg(t, OP(i), OP(i) + 0.5)), c = s.f ? 1 : oc(seg(t, OP(i) + 0.3, OP(i) + 0.65));
          let sp = s.f ? 1 : seg(t, OP(i) + 0.45, OP(i) + 0.9), rp = s.f ? 1 : oc(seg(t, OP(i) + 0.7, OP(i) + 1.0));
          if (hit && ago >= 0 && ago < 1.6) {
            if (api.calm) { o = ago < 0.5 ? 0 : 1; c = sp = rp = o; }
            else if (ago < 0.45) { o = s.o0 * (1 - io(seg(ago, 0, 0.32))); }
            else { o = io(seg(ago, 0.48, 0.95)); c = oc(seg(ago, 0.75, 1.05)); sp = seg(ago, 0.85, 1.3); rp = oc(seg(ago, 1.1, 1.4)); }
          } else if (hit && ago >= 1.6) s.f = true;
          s.o = o;
          const pw = W * (1 - 0.84 * o), f = pw / W;
          d.leaf.setAttribute("width", pw); d.leaf.setAttribute("rx", Math.min(14, pw / 2));
          d.inset.setAttribute("x", d.x + 16 * f); d.inset.setAttribute("width", Math.max(0, pw - 32 * f)); d.inset.setAttribute("rx", 10 * f);
          d.knob.setAttribute("cx", d.x + 152 * f); d.knob.setAttribute("rx", Math.max(1, 9 * f));
          d.words.setAttribute("opacity", c); d.words.setAttribute("transform", `translate(0 ${12 * (1 - c)})`);
          tf(d.star, d.cx, d.y + 56, sp > 0 ? ob(sp) : 0.01, -40 * (1 - sp)); d.star.setAttribute("opacity", sp > 0 ? 1 : 0);
          tf(d.rays, d.cx, d.y + 56, 0.6 + 0.4 * rp); d.rays.setAttribute("opacity", rp);
        });
        pops.forEach(([g, cx, cy], j) => { { const p = seg(t, 0.35 + j * 0.08, 0.8 + j * 0.08); g.setAttribute("opacity", cl(p * 3)); about(g, cx, cy, 0, 0, 0.85 + 0.15 * ob(p)); } });
        const bd = oc(seg(t, 5.9, 6.35)); band.setAttribute("transform", `translate(${BX} 0) scale(${Math.max(0.01, bd)} 1) translate(${-BX} 0)`); band.setAttribute("opacity", bd > 0.02 ? 1 : 0);
        const bw = seg(t, 6.25, 6.75); about(bow, BX, BY, 0, 0, bw > 0 ? ob(bw) : 0.01, -12 * (1 - bw));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const sparks = [[820, 72, 14, YEL], [904, 128, 10, SKY], [838, 196, 8, MINT], [906, 262, 12, YEL], [790, 296, 7, LIL]].map(([x, y, r, c], i) => {
        const g = el("g", {}, svg);
        if (i % 2) el("circle", { r, fill: c, stroke: INK, "stroke-width": 2.5 }, g); else el("path", { d: starD(r * 1.4), fill: c, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        return { g, x, y };
      });
      const chip = el("g", {}, svg);
      el("rect", { x: 64, y: 36, width: 140, height: 40, rx: 20, fill: SKY, stroke: INK, "stroke-width": 2.5 }, chip);
      mono(chip, 134, 62, "Use Cases", { "text-anchor": "middle", "font-size": 18 });
      const t1 = txt(svg, 60, 140, "Holiday Shipping", { "font-size": 68, "font-weight": 700 });
      const t2 = txt(svg, 60, 212, "Deadlines 2026", { "font-size": 68, "font-weight": 700 });
      const w2 = t2.getComputedTextLength();
      const under = el("path", { d: `M66 232 H${60 + w2}`, stroke: YEL, "stroke-width": 12, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1 }, svg);
      svg.insertBefore(under, t2);
      const sub = txt(svg, 62, 272, "Plan gifts with an AI agent team", { "font-size": 28, "font-weight": 500, fill: MUTE });
      const chk = mono(svg, 62, 308, "Checked 27 Nov 2026", { "font-size": 17, "font-weight": 500, fill: MUTE });
      const card = (x, col, a, b) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 10, y: 378, width: 420, height: 124, rx: 18, fill: LIL }, g);
        el("rect", { x, y: 368, width: 420, height: 124, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const l1 = mono(g, x + 26, 410, a, { "font-size": 19 }), l2 = txt(g, x + 26, 462, b, { "font-size": 36, "font-weight": 700 });
        return { g, l1, l2 };
      };
      const c1 = card(48, YEL, "USPS Ground Advantage:", "Thursday 17 Dec"), c2 = card(492, MINT, "Priority Mail Express:", "Saturday 19 Dec");
      const gift = el("g", {}, svg);
      el("rect", { x: -30, y: -46, width: 60, height: 46, rx: 5, fill: LIL, stroke: INK, "stroke-width": 2.5 }, gift);
      el("rect", { x: -36, y: -58, width: 72, height: 15, rx: 4, fill: LIL, stroke: INK, "stroke-width": 2.5 }, gift);
      el("rect", { x: -7, y: -58, width: 14, height: 58, fill: SOFT, stroke: INK, "stroke-width": 2 }, gift);
      el("path", { d: "M0 -58 C-6 -78 -28 -78 -24 -64 C-21 -56 -9 -56 0 -58 Z M0 -58 C6 -78 28 -78 24 -64 C21 -56 9 -56 0 -58 Z", fill: SOFT, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, gift);
      const sl = el("g", {}, svg), sli = el("g", { transform: "scale(0.24)" }, sl);
      sleighShape(sli, 3.4);
      return (t) => {
        const ch = seg(t, 0.1, 0.5); about(chip, 134, 56, 0, 0, ch > 0 ? ob(ch) : 0.01); chip.setAttribute("opacity", cl(ch * 3));
        [t1, t2, sub, chk].forEach((n, i) => { const k = oc(seg(t, 0.25 + i * 0.1, 0.75 + i * 0.1)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${22 * (1 - k)})`); });
        under.setAttribute("stroke-dashoffset", 1 - oc(seg(t, 0.7, 1.2)));
        [c1, c2].forEach((c, i) => {
          const k = seg(t, 1.0 + i * 0.1, 1.55 + i * 0.1); c.g.setAttribute("opacity", cl(k * 3)); c.g.setAttribute("transform", `translate(0 ${36 * (1 - ob(k))})`);
          [c.l1, c.l2].forEach((n, j) => { const q = oc(seg(t, 1.9 + i * 0.1 + j * 0.1, 2.3 + i * 0.1 + j * 0.1)); n.setAttribute("opacity", q); n.setAttribute("transform", `translate(${-12 * (1 - q)} 0)`); });
        });
        const g1 = seg(t, 1.4, 1.85), g2 = seg(t, 1.5, 1.95);
        tf(gift, 410, 368 - 44 * (1 - ob(g1)), 0.86); gift.setAttribute("opacity", cl(g1 * 3));
        tf(sl, 707, 342 - 44 * (1 - ob(g2)), 1); sl.setAttribute("opacity", cl(g2 * 3));
        sparks.forEach((s, i) => { const k = seg(t, 2.2 + i * 0.08, 2.6 + i * 0.08); tf(s.g, s.x, s.y, k > 0 ? ob(k) : 0.01, -30 * (1 - k)); });
      };
    },
  };

  /* ---- player: plays once in view, rests on the final frame, replays when it comes back into view ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let t0 = 0, raf = 0, seen = false, busy = 0, ended = false, paused = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const at = () => (calm ? sc.still : cl(clock() - t0, 0, sc.dur));
    const frame = () => draw(at(), clock());
    const tick = () => {
      cancelAnimationFrame(raf); frame();
      const now = clock(), playing = !calm && now - t0 < sc.dur;
      if (!calm && !playing) ended = true;
      if (seen && (playing || now < busy)) raf = requestAnimationFrame(tick);
    };
    const api = { now: clock, calm, busy: (d) => { busy = Math.max(busy, clock() + d); tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    t0 = clock();
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        t0 = ended ? clock() : clock() - paused; ended = false; tick();
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else { paused = cl(clock() - t0, 0, sc.dur); cancelAnimationFrame(raf); }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('600 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
