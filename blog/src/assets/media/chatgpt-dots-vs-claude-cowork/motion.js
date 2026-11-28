/* Bright coded scenes for "ChatGPT Dots vs Claude Cowork". Vanilla JS, no library.
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
  /* each loop opens on the final frame and eases back to the start in R0 seconds, so the loop has no jump */
  const R0 = 0.6;
  const pv = (t, a, b, e = oc) => (t < R0 ? 1 - io(t / R0) : e(seg(t, a, b)));
  const hint = (svg, s) => txt(svg, 756, 52, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  const hitbox = (g, a) => el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a), g);
  const ring = (g, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", class: "mg-ring" }, a), g);
  /* a tap toggles one thing between 0 and 1; under reduced motion it jumps */
  const flipper = (api, D = 0.6) => {
    let m = null, last = 0;
    return {
      v(auto, now) { last = m ? m.f + (m.to - m.f) * io(seg(now, m.at, m.at + (calm ? 1e-3 : D))) : auto; return last; },
      flip() { m = { f: last, to: last > 0.5 ? 0 : 1, at: api.now() }; api.nudge(); },
    };
  };
  let uid = 0;

  const SC = {};
  const CAP = "#6B5878";
  /* shrink a line of text until it fits a width */
  const fit = (n, w) => { const l = n.getComputedTextLength(); if (l > w) n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * w) / l); return n; };

  /* ---- 1. a book turns its own pages under a ribbon; an index card fills and drops into a finished tray ---- */
  SC.bookmark = {
    dur: 7.4, still: 7.4,
    build(svg, api) {
      hint(svg, "tap the book");
      const SX = 230, PT = 150, PB = 380, PW = 160, F = 0.9, FLIPS = [1.0, 2.5, 4.0];
      const book = el("g", {}, svg);
      hitbox(book, { x: SX - PW - 30, y: PT - 34, width: 2 * PW + 60, height: 380 });
      ring(book, { x: SX - PW - 34, y: PT - 38, width: 2 * PW + 68, height: 388, rx: 18 });
      el("rect", { x: SX - PW - 14, y: PT - 10, width: 2 * PW + 28, height: PB - PT + 62, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, book);
      const edges = [-1, 1].map((s) => [7, 6, 5, 4, 3, 2, 1].map((j) => ({ j, n: el("rect", { x: s < 0 ? SX - PW : SX, y: PT + j * 6, width: PW, height: PB - PT, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, book) })));
      [SX - PW, SX].forEach((x) => el("rect", { x, y: PT, width: PW, height: PB - PT, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, book));
      el("rect", { x: SX - PW + 24, y: PT + 26, width: 76, height: 12, rx: 6, fill: LIL }, book);
      [112, 96, 118, 88, 108, 70].forEach((w, i) => el("rect", { x: SX - PW + 24, y: PT + 62 + i * 26, width: w, height: 6, rx: 3, fill: SKY }, book));
      [104, 118, 92, 114, 100, 116, 64].forEach((w, i) => el("rect", { x: SX + 26, y: PT + 30 + i * 26, width: w, height: 6, rx: 3, fill: SKY }, book));
      el("path", { d: `M${SX} ${PT} V${PB}`, stroke: INK, "stroke-width": 3 }, book);
      const turn = el("path", { fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, book);
      const ribI = el("path", { stroke: INK, "stroke-width": 22, fill: "none" }, book), ribO = el("path", { stroke: LIL, "stroke-width": 15, fill: "none" }, book);
      const tag = el("g", {}, book), tagR = el("rect", { y: 0, height: 42, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, tag);
      const tagT = txt(tag, 0, 27, "ChatGPT Dots", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
      const tw = tagT.getComputedTextLength() + 32; tagR.setAttribute("x", -tw / 2); tagR.setAttribute("width", tw);
      const taps = [];
      button(book, "Turn a page", () => { taps.push(api.now()); if (taps.length > 12) taps.shift(); api.nudge(); });
      /* the card and the tray */
      el("rect", { x: 488, y: 424, width: 264, height: 30, rx: 8, fill: MINT, stroke: INK, "stroke-width": 3 }, svg);
      const card = el("g", {}, svg);
      el("rect", { x: 510, y: 150, width: 220, height: 186, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      fit(txt(card, 530, 192, "Claude Cowork", { "font-size": 24, "font-weight": 700 }), 180);
      el("path", { d: "M530 208 H710", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, card);
      const LW = [150, 128, 164, 116, 140];
      const lines = LW.map((w, i) => el("rect", { x: 530, y: 228 + i * 20, width: w, height: 8, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, card));
      el("path", { d: "M470 450 H770 L756 522 H484 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      txt(svg, 620, 494, "finished", { "text-anchor": "middle", "font-size": 20 });
      return (t, now) => {
        /* pages turned so far: three chapters on the timeline, plus taps */
        const auto = t < R0 ? Math.round(3 * (1 - io(t / R0))) : FLIPS.filter((s) => t >= s + F / 2).length;
        const D = calm ? 1e-3 : F, man = taps.filter((s) => now >= s + D / 2).length;
        const n = Math.round(1.5 * Math.min(4, auto + man));
        edges[0].forEach((e) => e.n.setAttribute("display", e.j <= 1 + n ? "inline" : "none"));
        edges[1].forEach((e) => e.n.setAttribute("display", e.j <= 7 - n ? "inline" : "none"));
        let k = -1, sw = 0;
        const kick = (u) => { if (u >= 0 && u <= 1) { k = u; sw -= 30 * Math.sin(Math.PI * u); } else if (u > 1) { const v = (u - 1) * F; sw += 9 * Math.exp(-3 * v) * Math.sin(9 * v); } };
        if (t >= R0) FLIPS.forEach((s) => kick((t - s) / F));
        if (!calm) taps.forEach((s) => kick((now - s) / F));
        if (k >= 0) {
          const xe = SX + PW * Math.cos(Math.PI * k), lift = 22 * Math.sin(Math.PI * k), mx = (SX + xe) / 2;
          turn.setAttribute("d", `M${SX} ${PT} Q${mx} ${PT - lift * 1.6} ${xe} ${PT - lift} L${xe} ${PB - lift} Q${mx} ${PB - lift * 0.6} ${SX} ${PB} Z`);
          turn.setAttribute("display", "inline");
        } else turn.setAttribute("display", "none");
        const ex = SX + 12 + sw, ey = PB + 82, d = `M${SX + 12} ${PT - 18} C${SX + 12} ${PB - 40} ${SX + 12 + sw * 0.3} ${PB + 30} ${ex} ${ey}`;
        ribI.setAttribute("d", d); ribO.setAttribute("d", d); tf(tag, ex, ey - 2, 1, -sw * 0.25);
        /* the card: appears, fills line by line, slides into the tray */
        let op = 1, sc = 1, dy = 150;
        if (t < R0) { op = 1 - seg(t, 0, 0.35); lines.forEach((l, i) => { l.setAttribute("width", LW[i]); l.setAttribute("display", "inline"); }); }
        else {
          const a = seg(t, 0.7, 1.1); op = a > 0 ? 1 : 0; sc = 0.6 + 0.4 * ob(a); dy = 150 * io(seg(t, 5.2, 6.0));
          lines.forEach((l, i) => { const w = LW[i] * oc(seg(t, 1.3 + i * 0.7, 1.8 + i * 0.7)); l.setAttribute("width", w); l.setAttribute("display", w > 1 ? "inline" : "none"); });
        }
        card.setAttribute("opacity", op);
        card.setAttribute("transform", `translate(620 ${243 + dy}) scale(${sc}) translate(-620 -243)`);
      };
    },
  };

  /* ---- 2. two lunchboxes pop open one after the other ---- */
  const sandwich = (g, tag) => {
    g = el("g", { transform: "translate(0 -8)" }, g);
    el("path", { d: "M-78 0 L0 -92 L78 0 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: "translate(11 -9)" }, g);
    el("path", { d: "M-78 0 L0 -92 L78 0 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", transform: "translate(5 -4)" }, g);
    el("path", { d: "M-70 0 Q-76 0 -72 -6 L-6 -84 Q0 -90 6 -84 L72 -6 Q76 0 70 0 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("path", { d: "M-46 -12 L0 -66 L46 -12 Z", fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g);
    el("path", { d: "M0 -84 V-112", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
    const r = el("rect", { x: 0, y: -134, height: 30, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    const n = txt(g, 0, -113, tag, { "font-family": MONO, "font-size": 17, "font-weight": 700 });
    const w = n.getComputedTextLength() + 22; r.setAttribute("width", w); n.setAttribute("x", 11);
    return 144;
  };
  const snack = (g, tag) => {
    const s = el("g", { transform: "rotate(-8 0 -62)" }, g);
    el("circle", { cx: 0, cy: -62, r: 58, fill: YEL, stroke: INK, "stroke-width": 3 }, s);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 + 0.3; el("circle", { cx: Math.cos(a) * 44, cy: -62 + Math.sin(a) * 44, r: 5, fill: BLUE }, s); }
    txt(s, 0, -53, tag, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
    return 124;
  };
  SC.lunchbox = {
    dur: 6.4, still: 6.4,
    build(svg, api) {
      hint(svg, "tap a lunchbox");
      el("path", { d: "M40 534 H760", stroke: SOFT, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      const B = [
        { x: 70, w: 260, h: 160, col: SKY, name: "Claude Pro", price: "$20", food: sandwich, tag: "Cowork", at: 1.0, ph: 132 },
        { x: 390, w: 340, h: 220, col: MINT, name: "ChatGPT Pro", price: "from $100", food: snack, tag: "Dots", at: 2.3, ph: 146 },
      ];
      const boxes = B.map((b) => {
        const rim = 528 - b.h, cx = b.x + b.w / 2, g = el("g", {}, svg);
        hitbox(g, { x: b.x - 10, y: rim - 196, width: b.w + 20, height: b.h + 204 });
        ring(g, { x: b.x - 14, y: rim - 200, width: b.w + 28, height: b.h + 212, rx: 18 });
        const handle = (y) => `M${cx - 40} ${y} V${y - 16} Q${cx - 40} ${y - 32} ${cx - 24} ${y - 32} H${cx + 24} Q${cx + 40} ${y - 32} ${cx + 40} ${y - 16} V${y}`;
        const pH = el("path", { stroke: INK, "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, g), pH2 = el("path", { stroke: YEL, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, g);
        const panel = el("rect", { x: b.x + 10, width: b.w - 20, rx: 14, fill: b.col, stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: b.x + 14, y: rim - 9, width: b.w - 28, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        const food = el("g", {}, g), fh = b.food(el("g", {}, food), b.tag);
        el("rect", { x: b.x, y: rim, width: b.w, height: b.h, rx: 20, fill: b.col, stroke: INK, "stroke-width": 3 }, g);
        const sr = el("rect", { y: rim + b.h / 2 - 42, height: 84, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const t1 = txt(g, cx, rim + b.h / 2 - 8, b.name, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        const t2 = txt(g, cx, rim + b.h / 2 + 26, b.price, { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        const sw = Math.max(t1.getComputedTextLength(), t2.getComputedTextLength()) + 44; sr.setAttribute("x", cx - sw / 2); sr.setAttribute("width", sw);
        const cap = el("g", {}, g);
        el("path", { d: handle(rim - 28), stroke: INK, "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, cap);
        el("path", { d: handle(rim - 28), stroke: YEL, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, cap);
        el("rect", { x: b.x - 6, y: rim - 30, width: b.w + 12, height: 40, rx: 14, fill: b.col, stroke: INK, "stroke-width": 3 }, cap);
        const f = flipper(api, 0.9);
        button(g, `Lunchbox: ${b.name}, ${b.price}`, () => f.flip());
        return { b, rim, cx, pH, pH2, panel, food, cap, f, sink: fh - 4, handle };
      });
      return (t, now) => boxes.forEach((x) => {
        const o = x.f.v(pv(t, x.b.at, x.b.at + 1.0), now);
        const ck = cl(o / 0.45), pk = cl((o - 0.4) / 0.6), fk = ob(cl((o - 0.45) / 0.55));
        x.cap.setAttribute("display", o < 0.45 ? "inline" : "none");
        x.cap.setAttribute("transform", `translate(0 ${x.rim - 40 * ck}) scale(1 ${1 - 0.7 * ck}) translate(0 ${-x.rim})`);
        const show = pk > 0.01 ? "inline" : "none", top = x.rim - 6 - x.b.ph * pk;
        [x.panel, x.pH, x.pH2].forEach((n) => n.setAttribute("display", show));
        x.panel.setAttribute("y", top); x.panel.setAttribute("height", x.b.ph * pk + 6);
        x.pH.setAttribute("d", x.handle(top + 2)); x.pH2.setAttribute("d", x.handle(top + 2));
        tf(x.food, x.cx, x.rim + 12 + x.sink * (1 - fk));
      });
    },
  };

  /* ---- 3. a key rack: the second key swings on once the tag flips ---- */
  SC.keys = {
    dur: 7.2, still: 7.2,
    build(svg, api) {
      hint(svg, "tap the Allow access tag");
      el("rect", { x: 70, y: 100, width: 700, height: 60, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M130 120 H300 M350 142 H520 M560 120 H700", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, svg);
      [100, 740].forEach((x) => { el("circle", { cx: x, cy: 130, r: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg); el("path", { d: `M${x - 5} 130 H${x + 5}`, stroke: INK, "stroke-width": 2.5 }, svg); });
      const key = (g, col, label) => {
        el("path", { d: "M8 26 L40 48", stroke: INK, "stroke-width": 3 }, g);
        const fob = el("rect", { x: 34, y: 40, height: 46, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const ft = txt(g, 0, 70, label, { "text-anchor": "middle", "font-size": 19 });
        const w = ft.getComputedTextLength() + 32; fob.setAttribute("width", w); ft.setAttribute("x", 34 + w / 2);
        el("circle", { cx: 0, cy: 16, r: 15, fill: "none", stroke: INK, "stroke-width": 5 }, g);
        el("rect", { x: -8, y: 76, width: 16, height: 120, rx: 4, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M8 150 H22 V162 H8 Z M8 172 H26 V186 H8 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("circle", { cx: 0, cy: 58, r: 26, fill: col, stroke: INK, "stroke-width": 3 }, g);
        el("circle", { cx: 0, cy: 52, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
      };
      const k1 = el("g", {}, svg); key(k1, SKY, "Cloud computer"); tf(k1, 140, 196);
      const k2 = el("g", {}, svg); key(k2, LIL, "Your computer");
      [130, 370].forEach((hx) => el("path", { d: `M${hx} 158 V186 Q${hx} 200 ${hx + 12} 200 Q${hx + 24} 200 ${hx + 24} 188`, stroke: INK, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, svg));
      /* the tag hangs on a string; front reads Allow access, back is a mint tick */
      el("path", { d: "M690 158 V212", stroke: INK, "stroke-width": 2.5 }, svg);
      const tg = el("g", {}, svg);
      const fr = el("g", {}, tg), bk = el("g", {}, tg);
      const face = (g, fill, ticked) => {
        const r = el("rect", { y: 0, height: 56, rx: 12, fill, stroke: INK, "stroke-width": 3 }, g);
        const tt = txt(g, 0, 39, "Allow access", { "font-size": 18 }), w = tt.getComputedTextLength() + 74;
        r.setAttribute("x", -w / 2); r.setAttribute("width", w); tt.setAttribute("x", -w / 2 + 52);
        el("circle", { cx: 0, cy: 9, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: -w / 2 + 16, y: 18, width: 24, height: 24, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        if (ticked) {
          const d = `M${-w / 2 + 21} 30 L${-w / 2 + 27} 36 L${-w / 2 + 37} 23`;
          el("path", { d, stroke: INK, "stroke-width": 8, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
          el("path", { d, stroke: MINT, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        }
        return w;
      };
      const TW = face(fr, LIL, false); face(bk, "#fff", true);
      const hit = el("g", {}, svg);
      hitbox(hit, { x: 690 - TW / 2 - 8, y: 196, width: TW + 16, height: 80 });
      ring(hit, { x: 690 - TW / 2 - 10, y: 194, width: TW + 20, height: 84, rx: 16 });
      /* the card that sways below */
      el("circle", { cx: 260, cy: 436, r: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const dc = el("g", {}, svg);
      el("path", { d: "M0 0 L-50 34 M0 0 L50 34", stroke: INK, "stroke-width": 2.5, fill: "none" }, dc);
      el("rect", { x: -78, y: 34, width: 156, height: 86, rx: 12, fill: SKY, stroke: INK, "stroke-width": 3 }, dc);
      txt(dc, 0, 70, "Delete?", { "text-anchor": "middle", "font-size": 24, "font-weight": 700 });
      txt(dc, 0, 101, "Ask first", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      el("circle", { cx: 0, cy: 0, r: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, dc);
      let m = null, lastF = 0, lastK = 0;
      const D = (x) => (calm ? 1e-3 : x);
      button(hit, "Allow access tag", () => { m = { to: lastF > 0.5 ? 0 : 1, at: api.now(), f0: lastF, k0: lastK }; api.nudge(); });
      return (t, now) => {
        let F, K, s;
        if (m) {
          const u = now - m.at; F = m.f0 + (m.to - m.f0) * io(seg(u, 0, D(0.7)));
          if (m.to) { const a = D(0.8), b = D(1.7); K = m.k0 > 0.99 ? 1 : m.k0 + (1 - m.k0) * io(seg(u, a, b)); s = m.k0 > 0.99 ? 99 : u - b; }
          else { K = m.k0 * (1 - io(seg(u, 0, D(0.6)))); s = 99; }
        } else { F = pv(t, 1.4, 2.1, io); K = pv(t, 2.4, 3.3, io); s = t < R0 ? 99 : t - 3.3; }
        lastF = F; lastK = K;
        const c = Math.cos(Math.PI * F);
        fr.setAttribute("display", c >= 0 ? "inline" : "none"); bk.setAttribute("display", c >= 0 ? "none" : "inline");
        tg.setAttribute("transform", `translate(690 210) scale(${Math.max(0.001, Math.abs(c))} 1)`);
        const sway = s > 0 && !calm ? 16 * Math.exp(-2.4 * s) * Math.sin(6 * s) : 0;
        k2.setAttribute("display", K > 0.002 ? "inline" : "none");
        tf(k2, 380 + 380 * (1 - K), 196 + 70 * (1 - K) - 90 * Math.sin(Math.PI * K), 1, -35 * (1 - K) + sway);
        tf(dc, 260, 436, 1, calm ? 0 : 4 * Math.sin((2 * Math.PI * t) / 2.4));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      const pr = el("rect", { x: 64, y: 64, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      const pt = txt(svg, 84, 91, "Comparisons", { "font-size": 18, "font-weight": 700 });
      pr.setAttribute("width", pt.getComputedTextLength() + 40);
      fit(txt(svg, 64, 196, "ChatGPT Dots vs", { "font-size": 62, "font-weight": 700 }), 520);
      fit(txt(svg, 64, 270, "Claude Cowork", { "font-size": 62, "font-weight": 700 }), 520);
      el("path", { d: "M66 296 H400", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 352, "Ongoing jobs or finished files?", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 470, "Checked 28 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      el("path", { d: "M628 120 H688 V410 L658 382 L628 410 Z", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("path", { d: "M640 132 V376 M676 132 V376", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "5 7" }, svg);
      el("circle", { cx: 742, cy: 266, r: 28, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 742, 274, "vs", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const c = el("g", { transform: "rotate(-4 860 266)" }, svg);
      el("rect", { x: 790, y: 212, width: 144, height: 108, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, c);
      el("path", { d: "M806 240 H918", stroke: BLUE, "stroke-width": 3, "stroke-linecap": "round" }, c);
      el("path", { d: "M806 262 H906 M806 282 H916 M806 302 H884", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, c);
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
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); }, nudge: () => { if (held) frame(); else tick(); } };
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
