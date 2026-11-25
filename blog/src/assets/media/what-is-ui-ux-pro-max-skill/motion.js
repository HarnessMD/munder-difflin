/* Bright coded scenes for "What is UI UX Pro Max?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  let uid = 0;
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 18, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const about = (n, cx, cy, s, pre = "") => n.setAttribute("transform", `${pre} translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * max) / w); return Math.min(w, max); };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hit = (p, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0 }, p);
  const ring = (p, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 7", "stroke-linecap": "round", class: "mg-ring" }, p);
  const clip = (svg, attrs) => {
    const id = `mguux${++uid}`, defs = svg.querySelector("defs") || el("defs", {}, svg);
    const c = el("clipPath", { id }, defs);
    return [`url(#${id})`, el("rect", attrs, c)];
  };
  const hint = (svg, x, y, s) => mono(svg, x, y, s, { "text-anchor": "middle", "font-size": 16, "font-weight": 500, fill: MUTE });
  /* a swatchbook card around its rivet at 0,0: round end at the rivet, long tongue to the right */
  const cardPath = (L, h) => `M0 ${-h} H${L - 16} Q${L} ${-h} ${L} ${-h + 16} V${h - 16} Q${L} ${h} ${L - 16} ${h} H0 A${h} ${h} 0 0 1 0 ${-h} Z`;

  const SC = {};

  /* ---- 1. a yellow swatchbook fans open into four soft white cards ---- */
  SC.swatchbook = {
    dur: 9,
    build(svg, api) {
      const P = [84, 410], STEP = 6.5, L = 660;
      const CARDS = [["141 UX guidelines", MINT], ["74 font pairings", SKY], ["194 colour palettes", LIL], ["80 searchable UI styles", BLUE]];
      const book = el("g", {}, svg);
      hit(book, 18, 38, 764, 448, 28);
      ring(book, 18, 38, 764, 448, 28);
      const inner = el("g", {}, book);
      el("path", { d: cardPath(L, 40), fill: LIL, transform: `translate(${P[0] + 8} ${P[1] + 8})` }, inner);
      const cards = [];
      for (let i = 3; i >= 0; i--) {
        const g = el("g", {}, inner);
        el("path", { d: cardPath(L, 40), fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        const chip = el("rect", { x: 322, y: -34, width: 24, height: 24, rx: 6, fill: CARDS[i][1], stroke: INK, "stroke-width": 2.5 }, g);
        const lab = mono(g, 360, -14, CARDS[i][0], { "font-size": 18 });
        cards[i] = { g, chip, lab };
      }
      const cover = el("g", { transform: `translate(${P[0]} ${P[1]})` }, inner);
      el("path", { d: cardPath(L, 40), fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, cover);
      const tag = el("g", {}, cover);
      const tbox = el("rect", { x: 236, y: -25, width: 280, height: 50, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, tag);
      el("circle", { cx: 258, cy: 0, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      const tt = txt(tag, 280, 10, "UI UX Pro Max", { "font-size": 28, "font-weight": 700 });
      tbox.setAttribute("width", fit(tt, 300) + 66);
      el("circle", { cx: 0, cy: 0, r: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, cover);
      el("circle", { cx: 0, cy: 0, r: 4.5, fill: INK }, cover);
      const tip = hint(svg, 400, 536, "tap the swatchbook");
      let open = true, tw = null;
      const F = [0, 0, 0, 0], start = (i) => 1.0 + (3 - i) * 0.7;
      button(book, "Swatchbook: fan it open or closed", () => { tw = { at: api.now(), from: F.slice(), to: open ? 0 : 1 }; open = !open; api.hold(1.5); });
      return (t, now) => {
        const e = oc(seg(t, 0, 0.8));
        inner.setAttribute("transform", `translate(0 ${46 * (1 - e)})`); inner.setAttribute("opacity", seg(t, 0, 0.35));
        for (let i = 0; i < 4; i++) {
          let f;
          if (tw) { const d = seg(now - tw.at - (3 - i) * 0.1, 0, 0.75); f = tw.from[i] + (tw.to - tw.from[i]) * (tw.to ? ob(d) : io(d)); }
          else f = ob(seg(t, start(i), start(i) + 0.9));
          F[i] = f;
          const c = cards[i], a = cl((f - 0.45) / 0.35), b = cl((f - 0.7) / 0.3);
          c.g.setAttribute("transform", `translate(${P[0]} ${P[1]}) rotate(${-STEP * (i + 1) * f})`);
          c.chip.setAttribute("opacity", a); about(c.chip, 334, -22, ob(a));
          c.lab.setAttribute("opacity", b); c.lab.setAttribute("transform", `translate(${14 * (1 - b)} 0)`);
        }
        const g = ob(seg(t, 4.5, 5.2));
        tag.setAttribute("opacity", seg(t, 4.5, 4.7)); tag.setAttribute("transform", `translate(0 ${-56 * (1 - g)})`);
        tip.setAttribute("opacity", oc(seg(t, 5.5, 6.1)));
      };
    },
  };

  /* ---- 2. a yellow paint roller rolls a tidy layout onto a soft white wall ---- */
  SC.paintroller = {
    dur: 9,
    build(svg, api) {
      const WX = 50, WY = 170, WW = 630, WH = 320, X0 = 50, X1 = 728, R0 = 2.0, R1 = 5.6;
      const note = el("g", {}, svg);
      el("rect", { x: 66, y: 34, width: 640, height: 92, rx: 16, fill: LIL }, note);
      el("rect", { x: 58, y: 26, width: 640, height: 92, rx: 16, fill: SKY, stroke: INK, "stroke-width": 3 }, note);
      fit(txt(note, 378, 82, "Build a landing page for my SaaS product", { "text-anchor": "middle", "font-size": 27, "font-weight": 600 }), 590);
      const pin = el("g", {}, note);
      el("circle", { cx: 378, cy: 26, r: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, pin);
      el("circle", { cx: 374, cy: 22, r: 3.5, fill: "#fff" }, pin);
      const wall = el("g", {}, svg);
      el("rect", { x: WX + 8, y: WY + 8, width: WW, height: WH, rx: 20, fill: LIL }, wall);
      el("rect", { x: WX, y: WY, width: WW, height: WH, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, wall);
      ring(wall, WX - 10, WY - 10, WW + 20, WH + 20, 28);
      const [cu, crect] = clip(svg, { x: WX, y: WY, width: 0, height: WH });
      const lay = el("g", { "clip-path": cu }, wall);
      el("rect", { x: 78, y: 194, width: 574, height: 106, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, lay);
      el("rect", { x: 104, y: 222, width: 250, height: 18, rx: 9, fill: "#fff" }, lay);
      el("rect", { x: 104, y: 254, width: 170, height: 14, rx: 7, fill: "#fff" }, lay);
      [78, 276, 474].forEach((x) => {
        el("rect", { x, y: 320, width: 178, height: 88, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, lay);
        el("circle", { cx: x + 32, cy: 348, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2 }, lay);
        el("rect", { x: x + 20, y: 376, width: 120, height: 12, rx: 6, fill: "#fff" }, lay);
      });
      const btn = el("g", {}, lay);
      el("rect", { x: 255, y: 424, width: 220, height: 44, rx: 22, fill: MINT, stroke: INK, "stroke-width": 2.5 }, btn);
      el("rect", { x: 315, y: 440, width: 100, height: 12, rx: 6, fill: "#fff" }, btn);
      const tip = hint(svg, 365, 566, "tap the wall");
      const rl = el("g", {}, svg);
      el("path", { d: "M0 474 V498 H30 V510", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, rl);
      el("rect", { x: 18, y: 506, width: 24, height: 76, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, rl);
      el("rect", { x: -24, y: 184, width: 48, height: 290, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, rl);
      const [ru] = clip(svg, { x: -21, y: 187, width: 42, height: 284, rx: 14 });
      const lines = el("g", { "clip-path": ru }, rl);
      const ls = [0, 1].map(() => el("path", { d: "M0 200 V458", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, lines));
      const X = (t) => X0 + (X1 - X0) * io(seg(t, R0, R1));
      let tb = R1; for (let s = R0; s < R1; s += 0.01) if (X(s) >= 365) { tb = s; break; }
      let back = null, played = false, cur = X1;
      button(wall, "Wall: roll it again", () => { if (back) return; back = { at: api.now(), from: cur }; api.hold(0.8); });
      return (t, now) => {
        if (back && now - back.at >= 0.7) { back = null; api.seek(R0); t = R0; }
        const w = oc(seg(t, 0, 0.7));
        wall.setAttribute("opacity", seg(t, 0, 0.3)); wall.setAttribute("transform", `translate(0 ${30 * (1 - w)})`);
        const n = ob(seg(t, 0.35, 1.05));
        note.setAttribute("opacity", seg(t, 0.35, 0.6)); note.setAttribute("transform", `translate(0 ${-40 * (1 - n)}) rotate(-1.2 378 72)`);
        about(pin, 378, 26, ob(seg(t, 1.0, 1.4)));
        let x;
        if (back) { x = back.from + (X0 - back.from) * io(seg(now - back.at, 0, 0.7)); lay.setAttribute("opacity", 1 - io(seg(now - back.at, 0, 0.5))); }
        else { x = t < R0 ? X0 - 110 * (1 - oc(seg(t, 1.3, 1.95))) : X(t); lay.setAttribute("opacity", 1); crect.setAttribute("width", cl(x - WX, 0, WW)); }
        cur = x;
        rl.setAttribute("transform", `translate(${x} 0)`); rl.setAttribute("opacity", back ? 1 : seg(t, 1.3, 1.55));
        ls.forEach((l, i) => { const p = ((((x - X0) * 0.8 + i * 22) % 44) + 44) % 44; l.setAttribute("transform", `translate(${p - 22} 0)`); });
        about(btn, 365, 446, ob(seg(t, tb + 0.15, tb + 0.65)));
        if (t >= 6.6) played = true;
        tip.setAttribute("opacity", played ? 1 : oc(seg(t, 6.1, 6.6)));
      };
    },
  };

  /* ---- 3. a yellow ruler with four width marks; four boxes snap into line ---- */
  SC.ruler = {
    dur: 8.5,
    build(svg, api) {
      const RX = 40, RY = 64, RW = 720, RH = 86, LY = 268;
      const MK = [375, 768, 1024, 1440], mx = (v) => RX + 20 + v * 0.425;
      const BW = [64, 80, 92, 108], COL = [BLUE, LIL, SKY, MINT];
      const LOOSE = [[170, 470, -12], [352, 505, 9], [522, 462, -7], [662, 500, 13]];
      const SCAT = [[-26, 34, -14], [22, 18, 11], [-18, 40, -9], [30, 24, 15]];
      const ruler = el("g", {}, svg);
      hit(ruler, RX - 12, RY - 12, RW + 24, RH + 38, 22);
      ring(ruler, RX - 12, RY - 12, RW + 24, RH + 38, 22);
      const body = el("g", {}, ruler);
      el("rect", { x: RX + 8, y: RY + 8, width: RW, height: RH, rx: 14, fill: LIL }, body);
      el("rect", { x: RX, y: RY, width: RW, height: RH, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, body);
      for (let v = 50; v < 1600; v += 50) el("path", { d: `M${mx(v)} ${RY + 1.5} V${RY + (v % 200 ? 13 : 23)}`, stroke: INK, "stroke-width": 2 }, body);
      const marks = MK.map((v) => {
        const x = mx(v), g = el("g", {}, ruler);
        el("path", { d: `M${x} ${RY + 1.5} V${RY + 36}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        el("path", { d: `M${x - 9} ${RY + RH} L${x + 9} ${RY + RH} L${x} ${RY + RH + 13} Z`, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        const lab = mono(g, x, RY + 68, `${v}px`, { "text-anchor": "middle", "font-size": 19 });
        const guide = el("path", { d: "", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 7", "stroke-linecap": "round" }, svg);
        return { g, lab, guide, x };
      });
      const boxes = BW.map((w, i) => { const g = el("g", {}, svg); el("rect", { x: -w / 2, y: -48, width: w, height: 96, rx: 10, fill: COL[i], stroke: INK, "stroke-width": 3 }, g); return g; });
      const tag = el("g", {}, svg);
      const tsh = el("path", { fill: LIL }, tag), tbody = el("path", { fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      const hole = el("circle", { r: 7, cy: 402, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      const tt = mono(tag, 0, 409, "text contrast 4.5:1 minimum", { "font-size": 19 });
      const tw = fit(tt, 520), tot = 52 + tw + 28, x0 = 400 - tot / 2, x1 = 400 + tot / 2, y0 = 372, y1 = 432;
      const tp = (dx, dy) => `M${x0 + 26 + dx} ${y0 + dy} H${x1 - 12 + dx} Q${x1 + dx} ${y0 + dy} ${x1 + dx} ${y0 + 12 + dy} V${y1 - 12 + dy} Q${x1 + dx} ${y1 + dy} ${x1 - 12 + dx} ${y1 + dy} H${x0 + 26 + dx} L${x0 + dx} ${(y0 + y1) / 2 + dy} Z`;
      tsh.setAttribute("d", tp(6, 6)); tbody.setAttribute("d", tp(0, 0)); hole.setAttribute("cx", x0 + 28); tt.setAttribute("x", x0 + 50);
      const tip = hint(svg, 400, 520, "tap the ruler");
      let sc = null, lastT = 0;
      button(ruler, "Ruler: scatter the boxes and snap them back", () => { if (lastT < 4.3 || sc) return; sc = { at: api.now() }; api.hold(2.5); });
      const st = (i) => 2.0 + i * 0.4;
      return (t, now) => {
        lastT = t;
        const S = sc ? now - sc.at : -1;
        if (sc && S >= 2.4) sc = null;
        const r = oc(seg(t, 0, 0.8));
        body.setAttribute("transform", `translate(0 ${-60 * (1 - r)})`); body.setAttribute("opacity", seg(t, 0, 0.3));
        boxes.forEach((b, i) => {
          const lx = mx(MK[i]), m = marks[i];
          let x, y, rot, s = 1, op = 1, land, draw;
          if (sc) {
            const [dx, dy, dr] = SCAT[i], a = oc(seg(S, 0, 0.4)) * (1 - ob(seg(S, 0.55 + i * 0.12, 1.15 + i * 0.12)));
            x = lx + dx * a; y = LY + dy * a; rot = dr * a;
            land = 0.85 + i * 0.12; draw = S < 0.4 ? 1 - seg(S, 0, 0.2) : oc(seg(S, land, land + 0.35));
            land = S - land;
          } else {
            const [ax, ay, ar] = LOOSE[i], k = ob(seg(t, st(i), st(i) + 0.85)), u = seg(t, 0.9 + i * 0.09, 1.4 + i * 0.09);
            x = ax + (lx - ax) * k; y = ay + (LY - ay) * k; rot = ar * (1 - k) + Math.sin(t * 4 + i * 1.7) * 3 * (1 - cl(k * 1.4));
            s = ob(u); op = seg(t, 0.9 + i * 0.09, 1.05 + i * 0.09);
            land = t - (st(i) + 0.4); draw = oc(seg(land, 0, 0.35));
          }
          b.setAttribute("transform", `translate(${x} ${y}) rotate(${rot}) scale(${s})`); b.setAttribute("opacity", op);
          const top = RY + RH + 19, bot = LY - 54;
          m.guide.setAttribute("d", `M${m.x} ${top} V${top + (bot - top) * draw}`); m.guide.setAttribute("opacity", draw > 0.02 ? 1 : 0);
          const k = oc(seg(t, 0.7 + i * 0.1, 1.1 + i * 0.1)), bump = Math.sin(Math.PI * seg(land, 0, 0.35));
          m.g.setAttribute("opacity", k);
          about(m.lab, m.x, RY + 62, 1 + 0.16 * bump);
          m.g.setAttribute("transform", `translate(0 ${10 * (1 - k) - 60 * (1 - r)})`);
        });
        const g = ob(seg(t, 4.4, 5.0));
        tag.setAttribute("opacity", seg(t, 4.4, 4.6)); tag.setAttribute("transform", `translate(0 ${-36 * (1 - g)})`);
        tip.setAttribute("opacity", oc(seg(t, 5.2, 5.7)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      const pr = el("rect", { x: 64, y: 44, width: 140, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      pr.setAttribute("width", mono(pill, 84, 71, "Explainer", { "font-size": 19 }).getComputedTextLength() + 40);
      const title = txt(svg, 62, 152, "What is UI UX Pro Max?", { "font-size": 64, "font-weight": 700 }); fit(title, 832);
      const line = txt(svg, 64, 202, "The design skill for coding agents", { "font-size": 30, "font-weight": 500, fill: MUTE });
      const chk = mono(svg, 64, 244, "Checked 25 Nov 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      const tile = (x, w, col, label, icon) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 8, y: 286, width: w, height: 206, rx: 22, fill: LIL }, g);
        el("rect", { x, y: 278, width: w, height: 206, rx: 22, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g); icon(ic);
        const lab = mono(g, x + w / 2, 452, label, { "text-anchor": "middle", "font-size": 19 }); fit(lab, w - 40);
        return { g, ic, lab, cx: x + w / 2 };
      };
      const tiles = [
        tile(64, 300, LIL, "MIT licence", (g) => {
          const P = [172, 384];
          [-44, -22, 0].forEach((a, i) => {
            const c = el("g", { transform: `translate(${P[0]} ${P[1]}) rotate(${a})` }, g);
            el("path", { d: cardPath(100, 15), fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, c);
            el("rect", { x: 70, y: -8, width: 16, height: 16, rx: 4, fill: [BLUE, LIL, MINT][i], stroke: INK, "stroke-width": 2 }, c);
          });
          el("circle", { cx: P[0], cy: P[1], r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        }),
        tile(396, 500, SKY, "80 searchable UI styles, per the README", (g) => {
          const c = el("g", { transform: "translate(640 352)" }, g);
          el("path", { d: "M58 -26 H74 V4 H0 V18", stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, c);
          el("rect", { x: -58, y: -46, width: 116, height: 40, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, c);
          el("path", { d: "M-30 -38 V-14 M0 -38 V-14 M30 -38 V-14", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, c);
          el("rect", { x: -9, y: 16, width: 18, height: 36, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, c);
        }),
      ];
      return (t) => {
        pill.setAttribute("opacity", seg(t, 0.1, 0.25)); about(pill, 134, 64, ob(seg(t, 0.1, 0.6)));
        [[title, 0.25], [line, 0.4], [chk, 0.52]].forEach(([n, a]) => { const k = oc(seg(t, a, a + 0.6)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${18 * (1 - k)})`); });
        tiles.forEach((T, i) => {
          const k = oc(seg(t, 0.8 + i * 0.1, 1.4 + i * 0.1)), p = ob(seg(t, 1.2 + i * 0.1, 1.75 + i * 0.1)), l = oc(seg(t, 1.6 + i * 0.1, 2.1 + i * 0.1));
          T.g.setAttribute("opacity", seg(t, 0.8 + i * 0.1, 1.0 + i * 0.1)); T.g.setAttribute("transform", `translate(0 ${40 * (1 - k)})`);
          about(T.ic, T.cx, 352, p); T.lab.setAttribute("opacity", l); T.lab.setAttribute("transform", `translate(0 ${10 * (1 - l)})`);
        });
      };
    },
  };

  /* ---- player: plays once in view, holds the calm final frame, taps replay ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let t = 0, last = 0, until = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => draw(held ? sc.dur : t, clock());
    const step = () => {
      const now = clock();
      if (!held) t = Math.min(sc.dur, t + Math.min(0.25, Math.max(0, now - last)));
      last = now; raf = 0;
      frame();
      if (!raf && seen && ((!held && t < sc.dur) || now < until)) raf = requestAnimationFrame(step);
    };
    const kick = () => { if (!raf) { last = clock(); raf = requestAnimationFrame(step); } };
    const api = { now: clock, seek: (s) => { t = s; held = false; kick(); }, hold: (s) => { until = Math.max(until, clock() + s); kick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.dur : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { kick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); raf = 0; }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 26px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
