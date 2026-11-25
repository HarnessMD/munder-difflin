/* Bright coded scenes for "What is Skills over MCP? Plus MCP Tasks and Elicitation". Vanilla JS, no library.
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
  const obc = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, cx, cy, sx, sy = sx, r = 0, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${sx} ${sy}) translate(${-cx} ${-cy})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const lab = (p, x, y, s, size) => txt(p, x, y, s, { "text-anchor": "middle", "font-family": MONO, "font-size": size, "font-weight": 700 });
  const rr = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
  const ring = (p, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 7", class: "mg-ring" }, p);
  const O3 = { stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" };
  const shiftAll = (svg, dy) => { const g = el("g", { transform: `translate(0 ${dy})` }); [...svg.childNodes].slice(1).forEach((n) => g.appendChild(n)); svg.appendChild(g); };
  const line = (p, d, w, c = INK) => el("path", { d, fill: "none", stroke: c, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, p);

  const SC = {};

  /* ---- 1. a Job card comes in, the Skill guidebook opens and points at the Tools ---- */
  SC.guidebook = {
    dur: 9, still: 9,
    build(svg, api) {
      const S = 250, CW = 140, CT = 210, CH = 190;
      const bookSh = el("rect", { x: S + 10, y: CT + 10, width: CW, height: CH, rx: 8, fill: SOFT }, svg);
      el("rect", { x: 490, y: 310, width: 220, height: 100, rx: 12, fill: SOFT }, svg);
      el("rect", { x: 78, y: 408, width: 660, height: 24, rx: 8, fill: SOFT }, svg);
      el("path", Object.assign({ d: "M140 424 V470 L186 424 Z", fill: MINT }, O3), svg);
      el("path", Object.assign({ d: "M660 424 V470 L614 424 Z", fill: MINT }, O3), svg);
      el("rect", Object.assign({ x: 70, y: 400, width: 660, height: 24, rx: 8, fill: MINT }, O3), svg);

      // the toolbox, with two tools that peek up when the arrow lands
      const tb = el("g", {}, svg), tools = [];
      { const g = el("g", {}, tb); line(g, "M512 280 V316", 5); el("rect", { x: 502, y: 248, width: 20, height: 36, rx: 7, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g); tools.push(g); }
      { const g = el("g", {}, tb); el("rect", { x: 652, y: 238, width: 24, height: 78, rx: 3, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g); line(g, "M652 252 h9 M652 264 h14 M652 276 h9 M652 288 h14", 2); tools.push(g); }
      const HD = "M550 300 V284 Q550 268 566 268 H614 Q630 268 630 284 V300";
      line(tb, HD, 12); line(tb, HD, 5, SKY);
      el("rect", Object.assign({ x: 480, y: 300, width: 220, height: 100, rx: 12, fill: BLUE }, O3), tb);
      line(tb, "M482 330 H698", 2.5);
      el("rect", { x: 576, y: 321, width: 28, height: 18, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2.5 }, tb);
      lab(tb, 590, 376, "Tools", 30);

      // the guidebook: back cover, right pages, front cover, then the pages that turn
      el("rect", Object.assign({ x: S, y: CT, width: CW, height: CH, rx: 8, fill: YEL }, O3), svg);
      const PG = { x: S + 4, y: CT + 8, width: 128, height: CH - 14, rx: 4, fill: SOFT, stroke: INK, "stroke-width": 2.5 };
      const front = (g) => { line(g, `M${S + 22} 250 H${S + 74}`, 10, SKY); [[280, 92], [306, 80], [332, 96], [358, 62]].forEach(([y, w]) => line(g, `M${S + 22} ${y} h${w}`, 7, LIL)); };
      el("rect", PG, svg); front(el("g", {}, svg));
      const fc = el("g", {}, svg);
      el("rect", Object.assign({ x: S, y: CT, width: CW, height: CH, rx: 8, fill: YEL }, O3), fc);
      line(fc, `M${S + 16} ${CT + 12} V${CT + CH - 12}`, 2.5);
      const layer = el("g", {}, svg);
      const pages = [0, 1, 2, 3].map(() => {
        const g = el("g", {}, layer); el("rect", PG, g);
        const f = el("g", {}, g); front(f);
        const b = el("g", {}, g); [[292, 92], [318, 76], [344, 96], [370, 60]].forEach(([y, w]) => line(b, `M${S + 68 - w / 2} ${y} h${w}`, 7, LIL));
        return { g, f, b };
      });
      const skill = lab(svg, S + 78, 318, "Skill", 30);

      // the sky arrow from the pages to the toolbox
      const AD = "M374 224 C 424 132, 540 132, 590 238";
      const aInk = line(svg, AD, 14), aSky = line(svg, AD, 7, SKY);
      const AL = aSky.getTotalLength(), tip = aSky.getPointAtLength(AL), pre = aSky.getPointAtLength(AL - 6);
      const ang = (Math.atan2(tip.y - pre.y, tip.x - pre.x) * 180) / Math.PI;
      const head = el("g", {}, svg);
      el("path", Object.assign({ d: "M4 0 L-20 -14 L-20 14 Z", fill: SKY }, O3), head);

      // the Job card is the button
      const btn = el("g", {}, svg);
      ring(btn, 163, 74, 176, 102, 20);
      const cg = el("g", {}, btn);
      el("rect", { x: 183, y: 94, width: 150, height: 76, rx: 14, fill: SOFT }, cg);
      el("rect", Object.assign({ x: 175, y: 86, width: 150, height: 76, rx: 14, fill: LIL }, O3), cg);
      lab(cg, 250, 135, "Job", 32);
      let curT = 9, pressAt = -99, order = "";
      button(btn, "Job card: send in a new job", () => {
        pressAt = api.now();
        if (curT >= 6.6 || curT < 0.6) api.seek(0.6);
        else if (curT >= 1.3 && curT < 2.6) api.seek(2.6);
        else api.poke();
      });
      shiftAll(svg, 24);

      return (t, now) => {
        curT = t;
        const csx = t < 1.1 ? -1 : t < 2.6 ? -1 + 2 * io(seg(t, 1.1, 1.8)) : 1 - 2 * io(seg(t, 3.3, 3.95));
        about(fc, S, 0, csx, 1, 0, 0, -6 * (1 - Math.abs(csx)));
        bookSh.setAttribute("x", S + Math.min(0, CW * csx) + 10); bookSh.setAttribute("width", CW - Math.min(0, CW * csx));
        const psx = pages.map((p, i) => (t < 2.6 ? csx : 1 - 2 * io(seg(t, 3.95 + i * 0.12, 4.55 + i * 0.12))));
        pages.forEach((p, i) => {
          about(p.g, S, 0, psx[i], 1, 0, 0, -8 * (1 - Math.abs(psx[i])));
          p.g.setAttribute("opacity", csx <= 0 ? 1 : 0);
          p.f.setAttribute("opacity", psx[i] >= 0 ? 1 : 0); p.b.setAttribute("opacity", psx[i] < 0 ? 1 : 0);
        });
        const r = [], l = [];
        psx.forEach((v, i) => (v < 0 ? l : r).push(i));
        const key = r.reverse().concat(l).join("");
        if (key !== order) { order = key; for (const c of key) layer.appendChild(pages[+c].g); }

        let lx = S - 68, ly = 262, lo = 1, dy = 0;
        if (t < 0.6) lo = 1;
        else if (t < 1.8) lo = 1 - seg(t, 0.6, 0.8);
        else if (t < 3.3) { lx = S + 78; ly = 318; const k = seg(t, 1.8, 2.1); lo = k; dy = -10 * (1 - oc(k)); }
        else if (t < 6.2) { lx = S + 78; ly = 318; lo = 1 - seg(t, 3.3, 3.45); }
        else { const k = seg(t, 6.2, 6.6); lo = seg(k, 0, 0.5); dy = -14 * (1 - ob(k)); }
        skill.setAttribute("x", lx); skill.setAttribute("y", ly + dy); skill.setAttribute("opacity", lo);

        const ak = t < 0.6 ? 1 : t < 5.0 ? 1 - io(seg(t, 0.6, 1.0)) : oc(seg(t, 5.0, 5.7));
        [aInk, aSky].forEach((p) => { p.setAttribute("stroke-dasharray", `${Math.max(0.01, (AL - 14) * ak)} ${AL * 2}`); p.setAttribute("opacity", ak > 0.01 ? 1 : 0); });
        const hs = t < 0.6 ? 1 : t < 5.0 ? 1 - seg(t, 0.6, 0.75) : ob(seg(t, 5.55, 5.9));
        head.setAttribute("transform", `translate(${tip.x} ${tip.y}) rotate(${ang}) scale(${Math.max(hs, 0.001)})`); head.setAttribute("opacity", hs > 0.01 ? 1 : 0);

        tools.forEach((g, i) => { const u = t < 0.6 ? 1 : t < 5.0 ? 1 - io(seg(t, 0.6, 1.0)) : ob(seg(t, 5.8 + i * 0.1, 6.2 + i * 0.1)); g.setAttribute("transform", `translate(0 ${40 * (1 - u)})`); });
        const bk = seg(t, 5.75, 6.35), sq = 0.06 * Math.sin(bk * Math.PI * 3) * (1 - bk);
        about(tb, 590, 400, 1 + sq, 1 - sq);

        const cdx = t < 0.8 ? 0 : t < 1.3 ? -360 * Math.pow(seg(t, 0.8, 1.3), 3) : t < 2.6 ? -360 : -360 * (1 - obc(seg(t, 2.6, 3.3), 1.3));
        const pp = seg(now - pressAt, 0, 0.3), sc = 1 - 0.07 * Math.sin(Math.PI * pp);
        about(cg, 250, 124, sc, sc, 0, cdx, 0); cg.setAttribute("opacity", cdx > -359 ? 1 : 0);
      };
    },
  };

  /* ---- 2. the Task timer runs while Work keeps moving, then the Result comes out ---- */
  SC.oven = {
    dur: 9, still: 9,
    build(svg, api) {
      el("rect", { x: 70, y: 180, width: 260, height: 300, rx: 20, fill: SOFT }, svg);
      el("rect", { x: 330, y: 360, width: 450, height: 24, rx: 8, fill: SOFT }, svg);
      el("rect", { x: 340, y: 384, width: 428, height: 96, rx: 6, fill: SOFT }, svg);
      el("rect", Object.assign({ x: 330, y: 374, width: 428, height: 96, rx: 6, fill: BLUE }, O3), svg);
      el("rect", { x: 346, y: 390, width: 190, height: 64, rx: 6, fill: "none", stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 552, y: 390, width: 190, height: 64, rx: 6, fill: "none", stroke: INK, "stroke-width": 2.5 }, svg);
      [520, 568].forEach((x) => el("circle", { cx: x, cy: 422, r: 6, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", Object.assign({ x: 320, y: 350, width: 450, height: 24, rx: 8, fill: BLUE }, O3), svg);

      // lilac Work cards slide along the counter in steps
      const cards = [0, 1, 2, 3].map(() => {
        const g = el("g", {}, svg);
        el("rect", { x: 0, y: 300, width: 100, height: 50, rx: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g);
        lab(g, 50, 333, "Work", 22);
        return g;
      });

      // the oven: window, heat, tray, then the body with a hole for the window
      const og = el("g", {}, svg);
      el("rect", { x: 88, y: 276, width: 204, height: 80, rx: 12, fill: "#fff" }, og);
      const heat = [150, 190, 230].map((x) => line(og, `M${x} 302 q7 -5 0 -10 q-7 -5 0 -10`, 4, SKY));
      const tr = el("g", {}, og);
      el("ellipse", { cx: 190, cy: 313, rx: 50, ry: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tr);
      [108, 260].forEach((x) => el("rect", { x, y: 328, width: 12, height: 12, rx: 3, fill: MINT, stroke: INK, "stroke-width": 2 }, tr));
      el("rect", { x: 118, y: 322, width: 144, height: 28, rx: 6, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tr);
      const res = lab(tr, 190, 342, "Result", 20);
      el("path", Object.assign({ d: rr(60, 170, 260, 300, 20) + rr(88, 276, 204, 80, 12), "fill-rule": "evenodd", fill: YEL }, O3), og);
      line(og, "M62 248 H318", 2.5);
      line(og, "M116 262 H264", 7);
      el("path", { d: rr(88, 380, 204, 66, 10), fill: "none", stroke: INK, "stroke-width": 2.5 }, og);
      line(og, "M160 398 H220", 5);
      [[262, MINT], [296, LIL]].forEach(([x, c]) => el("circle", { cx: x, cy: 208, r: 11, fill: c, stroke: INK, "stroke-width": 2.5 }, og));
      const tm = el("g", {}, og);
      el("rect", { x: 104, y: 174, width: 16, height: 10, rx: 3, fill: SKY, stroke: INK, "stroke-width": 2.5 }, tm);
      el("circle", Object.assign({ cx: 112, cy: 208, r: 27, fill: SKY }, O3), tm);
      const wedge = el("path", { fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, tm);
      const hand = line(tm, "M112 208", 4);
      el("circle", { cx: 112, cy: 208, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tm);
      lab(og, 186, 219, "Task", 28);
      const ticks = [-135, -90, -45].map(() => line(svg, "M0 0", 3));

      const hit = el("g", {}, svg);
      ring(hit, 46, 156, 288, 328, 28);
      let curT = 9, pressAt = -99;
      button(hit, "Oven: bake again", () => {
        pressAt = api.now();
        if (curT >= 7.5 || curT < 0.5) api.seek(0.5); else api.poke();
      });
      shiftAll(svg, -30);

      return (t, now) => {
        curT = t;
        const py = 5 * Math.sin(Math.PI * seg(now - pressAt, 0, 0.3));
        og.setAttribute("transform", `translate(0 ${py})`);
        const dx = t < 0.5 ? 222 : t < 1.2 ? 222 * (1 - io(seg(t, 0.5, 1.2))) : t < 6.5 ? 0 : 222 * obc(seg(t, 6.5, 7.3), 1.3);
        tr.setAttribute("transform", `translate(${dx} ${dx > 110 ? -py : 0})`);
        about(res, 190, 335, 1 + 0.18 * Math.sin(Math.PI * seg(t, 7.25, 7.65)));

        const th = t < 0.6 ? 0 : t < 1.2 ? 300 * oc(seg(t, 0.6, 1.2)) : t < 6.2 ? 300 * (1 - seg(t, 1.2, 6.2)) : 0;
        const a = (th * Math.PI) / 180, R = 22, hx = 112 + R * Math.sin(a), hy = 208 - R * Math.cos(a);
        wedge.setAttribute("d", th < 0.5 ? "M112 208" : `M112 208 L112 ${208 - R} A${R} ${R} 0 ${th > 180 ? 1 : 0} 1 ${hx} ${hy} Z`);
        hand.setAttribute("d", `M112 208 L${hx} ${hy}`);
        const ws = seg(t, 6.2, 6.9);
        about(tm, 112, 208, 1, 1, 12 * Math.sin(2 * Math.PI * 4 * ws) * (1 - ws));
        const tk = seg(t, 6.2, 6.75);
        ticks.forEach((n, i) => {
          const g = ([-135, -90, -45][i] * Math.PI) / 180, r0 = 33 + 9 * oc(tk);
          n.setAttribute("d", `M${112 + Math.cos(g) * r0} ${208 + py + Math.sin(g) * r0} L${112 + Math.cos(g) * (r0 + 9)} ${208 + py + Math.sin(g) * (r0 + 9)}`);
          n.setAttribute("opacity", tk > 0 && tk < 1 ? 1 - tk : 0);
        });
        const ho = seg(t, 1.25, 1.6) * (1 - seg(t, 5.9, 6.3));
        heat.forEach((n, i) => { n.setAttribute("opacity", ho); n.setAttribute("transform", `translate(0 ${-3 * Math.sin(t * 5 + i * 1.3)})`); });

        let shift = 0;
        for (let j = 0; j < 4; j++) shift += obc(seg(t, 1.4 + j * 1.25, 2.1 + j * 1.25), 1.2);
        cards.forEach((g, k) => {
          const u = (k + shift) % 4, x = 392 + u * 126, op = seg(x, 452, 518) * (1 - seg(x, 644, 704));
          tf(g, x, -8 * (1 - op)); g.setAttribute("opacity", op);
        });
      };
    },
  };

  /* ---- 3. the parcel stops at the bell and the Input card asks before it goes on ---- */
  SC.doorbell = {
    dur: 9, still: 9,
    build(svg, api) {
      el("rect", { x: 600, y: 170, width: 140, height: 282, rx: 6, fill: SOFT }, svg);
      line(svg, "M30 452 H770", 3);
      el("rect", Object.assign({ x: 40, y: 420, width: 550, height: 32, rx: 16, fill: MINT }, O3), svg);
      const belt = Array.from({ length: 18 }, () => line(svg, "M0 430 V442", 2.5));
      [58, 572].forEach((x) => el("circle", { cx: x, cy: 436, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", Object.assign({ x: 590, y: 420, width: 140, height: 32, fill: "#fff" }, O3), svg);
      el("rect", Object.assign({ x: 590, y: 160, width: 140, height: 260, rx: 6, fill: "#fff" }, O3), svg);
      el("rect", { x: 602, y: 172, width: 116, height: 248, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg);

      const pc = el("g", {}, svg);
      el("rect", Object.assign({ x: 0, y: -80, width: 100, height: 80, rx: 6, fill: BLUE }, O3), pc);
      line(pc, "M2 -60 H98", 2.5);
      el("rect", { x: 40, y: -80, width: 20, height: 80, fill: SKY, stroke: INK, "stroke-width": 2 }, pc);

      const dp = el("g", {}, svg);
      el("rect", Object.assign({ x: 602, y: 172, width: 116, height: 248, rx: 3, fill: SOFT }, O3), dp);
      el("circle", { cx: 660, cy: 224, r: 18, fill: SKY, stroke: INK, "stroke-width": 2.5 }, dp);
      el("rect", { x: 630, y: 266, width: 70, height: 128, rx: 6, fill: "none", stroke: INK, "stroke-width": 2 }, dp);
      el("circle", { cx: 615, cy: 318, r: 6, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, dp);

      line(svg, "M590 250 H566 V258", 4);
      const bell = el("g", {}, svg);
      el("circle", { cx: 566, cy: 314, r: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, bell);
      el("path", Object.assign({ d: "M545 302 Q545 260 566 260 Q587 260 587 302 Z", fill: YEL }, O3), bell);
      el("rect", Object.assign({ x: 539, y: 300, width: 54, height: 10, rx: 5, fill: YEL }, O3), bell);
      const waves = el("g", {}, svg);
      ["M528 274 Q520 290 528 306", "M516 266 Q503 290 516 314", "M604 274 Q612 290 604 306", "M616 266 Q629 290 616 314"].forEach((d) => line(waves, d, 3));

      let choice = "accept", lastT = -1, curT = 9;
      const choose = (c) => { if (curT >= 6.9 || curT < 0.3) { choice = c; lastT = 0.3; api.seek(0.3); } };
      const CD = "M178 70 H502 Q520 70 520 88 V214 Q520 232 502 232 H500 L532 268 L462 232 H178 Q160 232 160 214 V88 Q160 70 178 70 Z";
      const cd = el("g", {}, svg);
      el("path", { d: CD, fill: SOFT, transform: "translate(8 8)" }, cd);
      el("path", Object.assign({ d: CD, fill: LIL }, O3), cd);
      const inp = lab(cd, 340, 124, "Input", 30);
      const mk = (x, s, c) => {
        const g = el("g", {}, cd);
        ring(g, x - 7, 143, 162, 70, 35);
        el("rect", Object.assign({ x, y: 150, width: 148, height: 56, rx: 28, fill: SKY }, O3), g);
        lab(g, x + 74, 187, s, 24);
        button(g, s, () => choose(c));
        return g;
      };
      const bA = mk(182, "Accept", "accept"), bD = mk(350, "Decline", "decline");
      shiftAll(svg, 36);

      return (t) => {
        if (t < lastT - 1) choice = choice === "accept" ? "decline" : "accept";
        lastT = t; curT = t;
        const acc = choice === "accept";
        let x, vis = 1;
        if (t < 3.2) {
          if (acc) { x = 440 + 168 * io(seg(t, 1.1, 2.3)); if (t >= 2.85) vis = 0; }
          else x = 440 - 560 * io(seg(t, 1.0, 2.6));
        } else x = -120 + 560 * oc(seg(t, 3.2, 5.4));
        pc.setAttribute("transform", `translate(${x} 420) rotate(${5 * Math.sin(Math.PI * seg(t, 5.15, 5.75))} 100 0)`);
        pc.setAttribute("opacity", vis);
        const off = (acc ? 168 * io(seg(t, 1.1, 2.3)) : -560 * io(seg(t, 1.0, 2.6))) + 560 * oc(seg(t, 3.2, 5.4));
        belt.forEach((n, i) => { const bx = 76 + ((((i * 28 + off) % 504) + 504) % 504); tf(n, bx, 0); n.setAttribute("opacity", bx <= 556 ? 1 : 0); });
        const ds = acc ? (t < 2.35 ? 1 - 0.86 * io(seg(t, 0.8, 1.3)) : 0.14 + 0.86 * obc(seg(t, 2.35, 2.85), 1)) : 1;
        about(dp, 718, 0, ds, 1);

        const bs = seg(t, 5.5, 6.4);
        about(bell, 566, 254, 1, 1, 16 * Math.sin(2 * Math.PI * 4.5 * bs) * (1 - bs));
        about(waves, 566, 290, 0.85 + 0.25 * bs); waves.setAttribute("opacity", bs > 0 && bs < 1 ? 1 - bs : 0);

        const cs = t < 0.55 ? 1 : t < 0.9 ? 1 - io(seg(t, 0.55, 0.9)) : t < 6.4 ? 0 : ob(seg(t, 6.4, 6.9));
        about(cd, 532, 268, Math.max(cs, 0.001)); cd.setAttribute("opacity", cs > 0.01 ? 1 : 0);
        const press = 0.1 * Math.sin(Math.PI * seg(t, 0.3, 0.55));
        [bA, bD].forEach((b, i) => {
          let s = 1, o = 1;
          if (t >= 6.4) { const k = seg(t, 6.6 + i * 0.1, 7.0 + i * 0.1); s = 0.6 + 0.4 * ob(k); o = seg(k, 0, 0.3); }
          else if ((i === 0) === acc) s = 1 - press;
          about(b, i ? 424 : 256, 178, s); b.setAttribute("opacity", o);
        });
        const lk = t >= 6.4 ? seg(t, 6.9, 7.25) : 1;
        inp.setAttribute("opacity", lk); inp.setAttribute("transform", `translate(0 ${-12 * (1 - oc(lk))})`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      el("circle", { cx: 770, cy: 300, r: 168, fill: SOFT }, svg);
      const t1 = txt(svg, 56, 150, "What is Skills", { "font-size": 72, "font-weight": 700 });
      const t2 = txt(svg, 56, 232, "over MCP?", { "font-size": 72, "font-weight": 700 });
      const uw = t2.getComputedTextLength();
      const ul = line(svg, `M60 260 H${56 + uw}`, 12, LIL);
      const s1 = txt(svg, 56, 308, "MCP servers can now ship skills,", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const s2 = txt(svg, 56, 342, "run tasks and ask for input", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const chips = [["Skills over MCP: public beta, 24 Nov 2026", SKY], ["Tasks and Elicitation: generally available", MINT]].map(([s, c], i) => {
        const g = el("g", {}, svg), y = 386 + i * 56;
        const r = el("rect", { x: 56, y, width: 10, height: 42, rx: 21, fill: c, stroke: INK, "stroke-width": 2.5 }, g);
        const tt = txt(g, 76, y + 27, s, { "font-family": MONO, "font-size": 17, "font-weight": 700 });
        r.setAttribute("width", tt.getComputedTextLength() + 40);
        return g;
      });

      const box = el("g", {}, svg);
      el("rect", { x: 642, y: 352, width: 270, height: 130, rx: 16, fill: LIL }, box);
      [616, 896].forEach((x) => el("rect", Object.assign({ x, y: 384, width: 18, height: 28, rx: 6, fill: BLUE }, O3), box));
      el("rect", Object.assign({ x: 630, y: 340, width: 270, height: 130, rx: 16, fill: BLUE }, O3), box);
      line(box, "M632 378 H898", 2.5);
      el("rect", { x: 748, y: 368, width: 34, height: 22, rx: 5, fill: SKY, stroke: INK, "stroke-width": 2.5 }, box);

      const book = el("g", {}, svg);
      el("rect", Object.assign({ x: 644, y: 282, width: 40, height: 58, rx: 14, fill: YEL }, O3), book);
      el("rect", Object.assign({ x: 652, y: 322, width: 230, height: 18, rx: 6, fill: YEL }, O3), book);
      el("rect", { x: 662, y: 300, width: 214, height: 24, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, book);
      line(book, "M668 308 H870 M668 316 H870", 1.5, MUTE);
      el("path", { d: "M834 304 V366 L845 357 L856 366 V304 Z", fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, book);
      el("rect", Object.assign({ x: 648, y: 282, width: 232, height: 20, rx: 6, fill: YEL }, O3), book);

      const acc = [];
      { const g = el("g", {}, svg); el("path", Object.assign({ d: "M0 -20 Q3 -3 20 0 Q3 3 0 20 Q-3 3 -20 0 Q-3 -3 0 -20 Z", fill: LIL }, O3), g); acc.push([g, 650, 200]); }
      { const g = el("g", {}, svg); el("circle", { r: 9, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g); acc.push([g, 716, 160]); }
      { const g = el("g", {}, svg); line(g, "M-12 0 H12 M0 -12 V12", 13); line(g, "M-12 0 H12 M0 -12 V12", 7, MINT); acc.push([g, 858, 172]); }
      { const g = el("g", {}, svg); el("circle", { r: 14, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g); acc.push([g, 900, 240]); }
      const UL = uw + 4;

      return (t) => {
        const up = (n, a) => { const k = oc(seg(t, a, a + 0.5)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${16 * (1 - k)})`); };
        up(t1, 0.15); up(t2, 0.25); up(s1, 0.85); up(s2, 0.95);
        const uk = oc(seg(t, 0.6, 1.1));
        ul.setAttribute("stroke-dasharray", `${Math.max(0.01, UL * uk)} ${UL * 2}`); ul.setAttribute("opacity", uk > 0.01 ? 1 : 0);
        const bk = seg(t, 0.3, 0.9);
        about(box, 765, 470, 1, 1, 0, 0, -50 * (1 - ob(bk))); box.setAttribute("opacity", seg(bk, 0, 0.3));
        const kk = seg(t, 0.75, 1.35), land = seg(t, 1.25, 1.6), sq = 0.08 * Math.sin(Math.PI * land);
        about(book, 765, 340, 1 + sq, 1 - sq, 0, 0, -70 * (1 - ob(kk))); book.setAttribute("opacity", seg(kk, 0, 0.3));
        acc.forEach(([g, x, y], i) => { const k = seg(t, 1.3 + i * 0.09, 1.7 + i * 0.09); tf(g, x, y, Math.max(0.001, ob(k)), 0); g.setAttribute("opacity", k > 0 ? 1 : 0); });
        chips.forEach((g, i) => { const k = seg(t, 1.7 + i * 0.1, 2.2 + i * 0.1); g.setAttribute("opacity", oc(k)); g.setAttribute("transform", `translate(${-18 * (1 - ob(k))} 0)`); });
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
