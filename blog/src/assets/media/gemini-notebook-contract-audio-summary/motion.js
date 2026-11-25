/* Bright coded scenes for "Gemini Notebook: turn a long contract into an audio summary". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 22, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, x, y, s) => n.setAttribute("transform", `translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let uid = 0;
  const nid = (p) => `mg-${p}-${++uid}`;
  const ring = (p, a) => el(a.r ? "circle" : "rect", Object.assign({ fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "4 8" }, a), p);
  const sheet = (p, x, y, w, h, r = 20, off = 12) => { el("rect", { x: x + off, y: y + off, width: w, height: h, rx: r, fill: LIL }, p); return el("rect", { x, y, width: w, height: h, rx: r, fill: SOFT, stroke: INK, "stroke-width": 3 }, p); };

  const SC = {};

  /* ---- 1. a magnifier follows a citation to the quoted line ---- */
  SC.magnifier = {
    dur: 8, still: 8,
    build(svg, api) {
      const pg = el("g", {}, svg);
      sheet(pg, 130, 60, 320, 480);
      const head = el("rect", { x: 160, y: 98, width: 0, height: 16, rx: 8, fill: LIL }, pg);
      const LW = [250, 220, 260, 200, 250, 235, 180, 255, 140], LY = LW.map((_, i) => 160 + i * 42);
      const lines = LW.map((w, i) => el("rect", { x: 160, y: LY[i] - 6, width: 0, height: 12, rx: 6, fill: LIL }, pg));
      const T0 = [536, 194], LX = 340, U0 = 0.24, TG = [4, 7, 1];
      const ctl = (y) => [(T0[0] + LX) / 2 + 30, Math.max(T0[1], y) + 30];
      const bez = (y, u) => { const c = ctl(y), a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, d = u * u; return [a * T0[0] + b * c[0] + d * LX, a * T0[1] + b * c[1] + d * y]; };
      const part = (y, u) => { const c = ctl(y), e = bez(y, u); return `M${T0[0]} ${T0[1]} Q${T0[0] + (c[0] - T0[0]) * u} ${T0[1] + (c[1] - T0[1]) * u} ${e[0]} ${e[1]}`; };
      const dots = { stroke: BLUE, "stroke-width": 7, fill: "none", "stroke-dasharray": "0.5 14", "stroke-linecap": "round", opacity: 0 };
      const oldPath = el("path", Object.assign({}, dots), pg), path = el("path", Object.assign({}, dots), pg);
      const mint = LW.map((w, i) => el("rect", { x: 157, y: LY[i] - 7, width: w + 6, height: 14, rx: 7, fill: MINT, stroke: INK, "stroke-width": 2.5, opacity: 0 }, pg));
      const bub = el("g", {}, svg);
      const BD = "M566 74 H712 Q734 74 734 96 V138 Q734 160 712 160 H594 L536 194 L562 160 Q544 160 544 138 V96 Q544 74 566 74 Z";
      el("path", { d: BD, fill: LIL, transform: "translate(8 8)" }, bub);
      el("path", { d: BD, fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bub);
      [570, 589].forEach((x) => { el("circle", { cx: x, cy: 102, r: 6.5, fill: INK }, bub); el("path", { d: `M${x + 5.5} 103 Q${x + 5} 116 ${x - 4} 121`, stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, bub); });
      [[608, 94, 102], [608, 114, 74], [568, 134, 142]].forEach(([x, y, w]) => el("rect", { x, y, width: w, height: 11, rx: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, bub));
      const mag = el("g", { opacity: 0 }, svg);
      ring(mag, { r: 66 });
      el("rect", { x: 40, y: -10, width: 60, height: 20, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3, transform: "rotate(45)" }, mag);
      el("circle", { r: 41, fill: "none", stroke: YEL, "stroke-width": 11 }, mag);
      el("circle", { r: 47, fill: "none", stroke: INK, "stroke-width": 3 }, mag);
      el("circle", { r: 35, fill: "none", stroke: INK, "stroke-width": 3 }, mag);
      el("path", { d: "M-23 -9 A25 25 0 0 1 -9 -23", stroke: "#fff", "stroke-width": 5, fill: "none", "stroke-linecap": "round" }, mag);
      const lab = el("g", { opacity: 0 }, svg);
      el("rect", { x: 6, y: -18, width: 240, height: 48, rx: 24, fill: LIL }, lab);
      el("rect", { x: 0, y: -24, width: 240, height: 48, rx: 24, fill: BLUE, stroke: INK, "stroke-width": 3 }, lab);
      mono(lab, 120, 8, "check the quote", { "text-anchor": "middle" });
      let cur = 0, prev = -1, from = [0, 0], fromOp = 0, labFrom = [0, 0, 0], pos = [0, 0], labAt = [0, 0, 0];
      button(mag, "Send the magnifier to another line", () => {
        from = pos.slice(); fromOp = +mint[TG[cur]].getAttribute("opacity"); labFrom = labAt.slice();
        prev = cur; cur = (cur + 1) % TG.length; api.seek(1.9);
      });
      return (t) => {
        const y = LY[TG[cur]], rp = prev >= 0, e = oc(seg(t, 0, 0.8));
        pg.setAttribute("opacity", seg(t, 0, 0.35)); pg.setAttribute("transform", `translate(0 ${26 * (1 - e)})`);
        head.setAttribute("width", 130 * cl(ob(seg(t, 0.25, 0.7)), 0, 1.06));
        lines.forEach((n, i) => n.setAttribute("width", LW[i] * cl(ob(seg(t, 0.32 + i * 0.08, 0.8 + i * 0.08)), 0, 1.06)));
        const kb = ob(seg(t, 1.0, 1.55));
        about(bub, 536, 194, kb); bub.setAttribute("opacity", kb > 0 ? 1 : 0);
        const d = oc(seg(t, 2.1, 3.0));
        path.setAttribute("d", part(y, Math.max(d, 0.001))); path.setAttribute("opacity", d > 0 ? 1 : 0);
        if (rp) oldPath.setAttribute("d", part(LY[TG[prev]], 1));
        oldPath.setAttribute("opacity", rp ? 1 - oc(seg(t, 1.9, 2.4)) : 0);
        let p = bez(y, U0 + (1 - U0) * io(seg(t, 3.2, 4.8)));
        if (rp && t < 3.2) { const r = io(seg(t, 1.9, 2.8)), b = bez(y, U0); p = [from[0] + (b[0] - from[0]) * r, from[1] + (b[1] - from[1]) * r - 30 * Math.sin(Math.PI * r)]; }
        pos = p;
        const km = rp ? 1 : ob(seg(t, 1.3, 1.85)), press = 1 + 0.08 * Math.sin(Math.PI * seg(t, 4.75, 5.2));
        tf(mag, p[0], p[1], Math.max(km, 0) * press); mag.setAttribute("opacity", km > 0 ? 1 : 0);
        const m = seg(t, 4.85, 5.35);
        mint.forEach((n, i) => {
          let o = 0, h = 14;
          if (i === TG[cur]) { o = m > 0 ? 1 : 0; h = 14 * oc(m) + 9 * Math.sin(Math.PI * m); }
          else if (rp && i === TG[prev]) o = fromOp * (1 - oc(seg(t, 1.9, 2.4)));
          n.setAttribute("opacity", o); n.setAttribute("height", Math.max(h, 0)); n.setAttribute("y", LY[i] - h / 2);
        });
        const kl = ob(seg(t, 5.45, 6.05));
        if (rp && t < 5.45) { const o = labFrom[2] * (1 - seg(t, 1.9, 2.2)); tf(lab, labFrom[0], labFrom[1]); lab.setAttribute("opacity", o); labAt = [labFrom[0], labFrom[1], o]; }
        else { tf(lab, 470, y + 70, Math.max(kl, 0)); lab.setAttribute("opacity", kl > 0 ? 1 : 0); labAt = [470, y + 70, kl > 0 ? 1 : 0]; }
      };
    },
  };

  /* ---- 2. the contract goes into a radio and comes out as a sound wave ---- */
  SC.radio = {
    dur: 9, still: 9,
    build(svg, api) {
      const FMT = ["Deep Dive", "The Brief", "The Critique", "The Debate"], DC = [462, 330], LB = [262, 314, 366, 418];
      const ANG = LB.map((y) => (Math.atan2(y - 7 - DC[1], 98) * 180) / Math.PI);
      const WAVE = [[30, 54, 80, 60, 36, 70, 92, 66, 40, 74, 56, 34, 24], [16, 26, 40, 56, 66, 56, 40, 30, 22, 30, 22, 16, 12], [24, 40, 30, 62, 84, 62, 30, 46, 70, 46, 28, 38, 22], [70, 28, 76, 32, 84, 26, 78, 30, 72, 34, 66, 28, 58]];
      const id = nid("slot"), cp = el("clipPath", { id }, el("defs", {}, svg));
      el("rect", { x: 0, y: -300, width: 800, height: 540 }, cp);
      const root = el("g", { transform: "translate(0 -24)" }, svg), rad = el("g", {}, root);
      const ant = el("g", {}, rad);
      el("path", { d: "M450 246 L500 152", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, ant);
      el("circle", { cx: 500, cy: 152, r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, ant);
      el("rect", { x: 102, y: 252, width: 440, height: 280, rx: 34, fill: LIL }, rad);
      el("rect", { x: 90, y: 240, width: 440, height: 280, rx: 34, fill: BLUE, stroke: INK, "stroke-width": 3 }, rad);
      el("rect", { x: 125, y: 280, width: 250, height: 130, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, rad);
      const bars = WAVE[0].map((_, i) => el("rect", { x: 140 + i * 17.5, y: 345, width: 10, height: 0, rx: 5, fill: MINT, stroke: INK, "stroke-width": 2 }, rad));
      ANG.forEach((a) => { const r = (a * Math.PI) / 180; el("circle", { cx: DC[0] + Math.cos(r) * 60, cy: DC[1] + Math.sin(r) * 60, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, rad); });
      const dial = el("g", {}, rad);
      el("circle", { r: 44, fill: SKY, stroke: INK, "stroke-width": 3 }, dial);
      const ptr = el("g", {}, dial);
      el("path", { d: "M0 0 H32", stroke: INK, "stroke-width": 6, "stroke-linecap": "round" }, ptr);
      el("circle", { r: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, dial);
      [424, 446, 468].forEach((y) => el("rect", { x: 420, y, width: 84, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2 }, rad));
      const tag = el("g", {}, rad);
      el("rect", { x: 125, y: 438, width: 250, height: 52, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 148, cy: 464, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      mono(tag, 264, 472, "Audio Overview", { "text-anchor": "middle" });
      const doc = el("g", {}, el("g", { "clip-path": `url(#${id})` }, rad));
      sheet(doc, 230, 30, 160, 200, 12, 9);
      el("rect", { x: 250, y: 58, width: 72, height: 12, rx: 6, fill: LIL }, doc);
      [120, 104, 120, 90, 112, 76].forEach((w, i) => el("rect", { x: 250, y: 86 + i * 22, width: w, height: 9, rx: 4.5, fill: LIL }, doc));
      el("rect", { x: -17, y: -6, width: 34, height: 12, rx: 6, fill: SKY, stroke: INK, "stroke-width": 2.5, transform: "translate(246 44) rotate(-35)" }, doc);
      el("rect", { x: 212, y: 232, width: 196, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 3 }, rad);
      ring(rad, { x: 74, y: 224, width: 474, height: 324, rx: 44 });
      const labs = FMT.map((s, i) => {
        const g = el("g", {}, root);
        el("rect", { x: 562, y: LB[i] - 29, width: 176, height: 42, rx: 21, fill: SOFT }, g);
        const on = el("rect", { x: 562, y: LB[i] - 29, width: 176, height: 42, rx: 21, fill: SKY, stroke: INK, "stroke-width": 2.5, opacity: 0 }, g);
        const tx = mono(g, 580, LB[i], s, { "font-size": 20, fill: MUTE });
        return { g, on, tx };
      });
      let to = 1, again = false, aF = ANG[0], hF = WAVE[0].slice(), wF = [1, 0, 0, 0], aN = aF, hN = hF.slice(), wN = wF.slice();
      button(rad, "Turn the dial to the next Audio Overview format", () => { aF = aN; hF = hN.slice(); wF = wN.slice(); to = (to + 1) % 4; again = true; api.seek(5.2); });
      return (t) => {
        const e = oc(seg(t, 0, 0.7));
        rad.setAttribute("opacity", seg(t, 0, 0.3)); rad.setAttribute("transform", `translate(0 ${40 * (1 - e)})`);
        ant.setAttribute("transform", `rotate(${-40 * (1 - ob(seg(t, 0.35, 0.85)))} 450 246)`);
        const kd = Math.max(0, ob(seg(t, 0.3, 0.8)));
        tf(dial, DC[0], DC[1], kd);
        const kdoc = oc(seg(t, 0.5, 1.2)), sl = io(seg(t, 1.6, 3.2));
        doc.setAttribute("transform", `translate(0 ${-60 * (1 - kdoc) + 110 * sl})`); doc.setAttribute("opacity", seg(t, 0.5, 0.85));
        aN = aF + (ANG[to] - aF) * ob(seg(t, 5.2, 6.1)); ptr.setAttribute("transform", `rotate(${aN})`);
        const mh = io(seg(t, 5.3, 6.3)), env = (again ? seg(t, 5.2, 5.7) : seg(t, 2.8, 3.4)) * (1 - seg(t, 6.6, 7.6));
        bars.forEach((n, i) => {
          const base = hF[i] + (WAVE[to][i] - hF[i]) * mh, g = again ? 1 : cl(ob(seg(t, 2.2 + i * 0.11, 2.7 + i * 0.11)), 0, 1.2);
          hN[i] = base;
          const h = Math.max(0, base * g * (1 + 0.2 * env * Math.sin(t * 8 + i * 0.9)));
          n.setAttribute("height", h); n.setAttribute("y", 345 - h / 2); n.setAttribute("opacity", g > 0 ? 1 : 0);
        });
        const kt = ob(seg(t, 4.2, 4.75));
        about(tag, 250, 464, Math.max(kt, 0)); tag.setAttribute("opacity", kt > 0 ? 1 : 0);
        const mw = io(seg(t, 5.5, 6.05)), pop = Math.sin(Math.PI * seg(t, 5.75, 6.3));
        labs.forEach((L, i) => {
          const k = oc(seg(t, 0.6 + i * 0.09, 1.1 + i * 0.09)), w = wF[i] + ((i === to ? 1 : 0) - wF[i]) * mw;
          wN[i] = w; L.on.setAttribute("opacity", w); L.tx.setAttribute("fill", w > 0.5 ? INK : MUTE);
          const s = 1 + (i === to ? 0.07 * pop : 0), cy = LB[i] - 8;
          L.g.setAttribute("transform", `translate(${24 * (1 - k)} 0) translate(650 ${cy}) scale(${s}) translate(-650 ${-cy})`); L.g.setAttribute("opacity", k);
        });
      };
    },
  };

  /* ---- 3. a bookmark stops at the line that reads must ---- */
  SC.bookmark = {
    dur: 8.5, still: 8.5,
    build(svg, api) {
      const pg = el("g", {}, svg);
      sheet(pg, 90, 50, 330, 500);
      const head = el("rect", { x: 122, y: 86, width: 0, height: 16, rx: 8, fill: LIL }, pg);
      const LY = Array.from({ length: 10 }, (_, i) => 150 + i * 40), MUST = [4, 7, 2], LW = [262, 240, 0, 220, 0, 250, 206, 0, 236, 180];
      const glow = LY.map((y) => el("rect", { x: 106, y: y - 17, width: 298, height: 34, rx: 17, fill: MINT, stroke: INK, "stroke-width": 2.5, opacity: 0 }, pg));
      const rows = LY.map((y, i) => {
        const g = el("g", {}, pg);
        if (MUST.includes(i)) { el("rect", { x: 122, y: y - 6, width: 72, height: 12, rx: 6, fill: LIL }, g); mono(g, 206, y + 8, "must"); el("rect", { x: 270, y: y - 6, width: 100, height: 12, rx: 6, fill: LIL }, g); }
        else el("rect", { x: 122, y: y - 6, width: LW[i], height: 12, rx: 6, fill: LIL }, g);
        return g;
      });
      const bm = el("g", {}, svg);
      const id = nid("top"), cp = el("clipPath", { id }, el("defs", {}, svg));
      el("rect", { x: 0, y: 52, width: 800, height: 600 }, cp);
      const rib = el("path", { d: "M372 -620 H408 V20 L390 6 L372 20 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, el("g", { "clip-path": `url(#${id})` }, bm));
      const top = el("g", {}, bm);
      ring(top, { x: 354, y: -66, width: 72, height: 104, rx: 18 });
      const str = el("path", { d: "M408 0 H451", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, top);
      const tag = el("g", {}, top);
      el("rect", { x: 446, y: -17, width: 264, height: 46, rx: 14, fill: LIL }, tag);
      el("rect", { x: 440, y: -23, width: 264, height: 46, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 456, cy: 0, r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      mono(tag, 581, 8, "read it yourself", { "text-anchor": "middle" });
      const dot = el("circle", { cx: 730, cy: 0, r: 11, fill: SKY, stroke: INK, "stroke-width": 2.5 }, top);
      let cur = 0, prev = -1, yF = 90, yN = 30, gF = 0, tagF = 0, dotF = 0, tagN = 0, dotN = 0;
      button(bm, "Move the bookmark to the next line", () => { yF = yN; gF = +glow[MUST[cur]].getAttribute("opacity"); tagF = tagN; dotF = dotN; prev = cur; cur = (cur + 1) % MUST.length; api.seek(1.9); });
      return (t) => {
        const rp = prev >= 0, yT = LY[MUST[cur]], e = oc(seg(t, 0, 0.8));
        pg.setAttribute("opacity", seg(t, 0, 0.35)); pg.setAttribute("transform", `translate(0 ${26 * (1 - e)})`);
        head.setAttribute("width", 150 * cl(ob(seg(t, 0.25, 0.7)), 0, 1.06));
        rows.forEach((g, i) => { const k = oc(seg(t, 0.32 + i * 0.07, 0.8 + i * 0.07)); g.setAttribute("opacity", k); g.setAttribute("transform", `translate(${-18 * (1 - k)} 0)`); });
        let y;
        if (!rp && t < 2) y = 30 + 60 * ob(seg(t, 1.2, 1.8));
        else { const f = rp ? yF : 90; y = f + (yT - f) * io(seg(t, 2.0, 3.8)) + Math.sign(yT - f) * 12 * Math.sin(Math.PI * seg(t, 3.55, 4.15)); }
        yN = y;
        rib.setAttribute("transform", `translate(0 ${y})`); top.setAttribute("transform", `translate(0 ${y})`);
        const gk = seg(t, 4.0, 4.55);
        glow.forEach((n, i) => {
          let o = 0, h = 34;
          if (i === MUST[cur]) { o = oc(cl(gk * 2)); h = 34 * oc(gk) + 12 * Math.sin(Math.PI * gk); }
          else if (rp && i === MUST[prev]) o = gF * (1 - oc(seg(t, 1.9, 2.4)));
          n.setAttribute("opacity", o); n.setAttribute("height", Math.max(h, 0)); n.setAttribute("y", LY[i] - h / 2);
        });
        const kt = ob(seg(t, 4.65, 5.3));
        let to = seg(t, 4.65, 4.85), rot = -38 * (1 - kt);
        if (rp && t < 4.65) { to = tagF * (1 - seg(t, 1.9, 2.2)); rot = -14 * seg(t, 1.9, 2.2); }
        tagN = to; tag.setAttribute("opacity", to); str.setAttribute("opacity", to); tag.setAttribute("transform", `rotate(${rot} 456 0)`);
        const kd = ob(seg(t, 5.15, 5.5)), bl = seg(t, 5.5, 7.48);
        let dop = kd > 0 ? (bl > 0 && bl < 1 ? 0.2 + 0.8 * (0.5 + 0.5 * Math.cos(bl * 6 * Math.PI)) : 1) : 0, ds = kd;
        if (rp && t < 5.15) { dop = dotF * (1 - seg(t, 1.9, 2.1)); ds = 1; }
        dotN = dop; dot.setAttribute("opacity", dop); about(dot, 730, 0, Math.max(ds, 0));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 56, y: 46, width: 108, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      mono(pill, 110, 74, "Guide", { "text-anchor": "middle", "font-size": 20 });
      const lines = [
        txt(svg, 52, 178, "Gemini Notebook", { "font-size": 80, "font-weight": 700 }),
        txt(svg, 56, 232, "Turn a long contract into an audio summary", { "font-size": 30, "font-weight": 500, fill: MUTE }),
        mono(svg, 56, 274, "Checked 25 Nov 2026", { "font-size": 19, "font-weight": 500, fill: CAP }),
      ];
      const tiles = [[56, LIL, "Free with a Google account"], [490, SKY, "The Brief: under two minutes"]].map(([x, c, s], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: x + 10, y: 322, width: 414, height: 168, rx: 24, fill: LIL }, g);
        el("rect", { x, y: 312, width: 414, height: 168, rx: 24, fill: c, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g), inner = el("g", { transform: `translate(${x + 207 - (i ? 30 : 56)} 334)` }, ic);
        if (i === 0) {
          el("path", { d: "M78 24 L94 4", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, inner);
          el("circle", { cx: 94, cy: 4, r: 7, fill: YEL, stroke: INK, "stroke-width": 2.5 }, inner);
          el("rect", { x: 0, y: 24, width: 112, height: 64, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, inner);
          el("rect", { x: 12, y: 36, width: 56, height: 40, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, inner);
          [10, 20, 28, 16, 24].forEach((h, j) => el("rect", { x: 19 + j * 9, y: 56 - h / 2, width: 6, height: h, rx: 3, fill: MINT, stroke: INK, "stroke-width": 1.5 }, inner));
          el("circle", { cx: 90, cy: 56, r: 13, fill: SKY, stroke: INK, "stroke-width": 2.5 }, inner);
          el("path", { d: "M90 56 L98 49", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, inner);
        } else {
          el("path", { d: "M8 0 H52 V88 L30 72 L8 88 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, inner);
        }
        const lab = mono(g, x + 207, 452, s, { "font-size": 20, "text-anchor": "middle" });
        return { g, ic, lab, cx: x + 207 };
      });
      return (t) => {
        const kp = ob(seg(t, 0.15, 0.65)); about(pill, 110, 67, Math.max(kp, 0)); pill.setAttribute("opacity", kp > 0 ? 1 : 0);
        lines.forEach((n, i) => { const k = oc(seg(t, 0.3 + i * 0.12, 0.95 + i * 0.12)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${22 * (1 - k)})`); });
        tiles.forEach((T, i) => {
          const k = ob(seg(t, 1.0 + i * 0.12, 1.6 + i * 0.12)); about(T.g, T.cx, 396, 0.9 + 0.1 * k); T.g.setAttribute("opacity", cl(seg(t, 1.0 + i * 0.12, 1.3 + i * 0.12)));
          const ki = ob(seg(t, 1.45 + i * 0.12, 2.0 + i * 0.12)); T.ic.setAttribute("transform", `translate(0 ${-30 * (1 - ki)})`); T.ic.setAttribute("opacity", cl(ki * 3));
          const kl = oc(seg(t, 1.9 + i * 0.12, 2.5 + i * 0.12)); T.lab.setAttribute("opacity", kl); T.lab.setAttribute("transform", `translate(0 ${12 * (1 - kl)})`);
        });
      };
    },
  };

  /* ---- player: plays once from the moment it is in view, holds the final frame, a tap replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let t0 = null, done = 0, raf = 0, seen = false;
    const clock = () => performance.now() / 1000;
    const at = () => (calm ? sc.still : t0 == null ? done : Math.min(clock() - t0, sc.dur));
    let draw = () => {};
    const tick = () => { cancelAnimationFrame(raf); const t = at(); draw(t); if (seen && !calm && t < sc.dur) raf = requestAnimationFrame(tick); };
    const api = { seek: (s) => { if (seen) t0 = clock() - s; else done = s; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { t0 = clock() - done; tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { if (t0 != null) done = Math.min(clock() - t0, sc.dur); t0 = null; cancelAnimationFrame(raf); }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    tick();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
