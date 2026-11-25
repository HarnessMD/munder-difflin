/* Bright coded scenes for "Black Friday 2026: Spot Fake Deals With an AI Agent Team". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const land = (n, k, dx = 0, dy = 0) => { n.setAttribute("opacity", cl(k)); n.setAttribute("transform", `translate(${dx * (1 - k)} ${dy * (1 - k)})`); };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ringRect = (g, x, y, width, height, rx) => el("rect", { x, y, width, height, rx, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 7", class: "mg-ring" }, g);
  const pad = (g, x, y, width, height) => el("rect", { x, y, width, height, fill: "#fff", "fill-opacity": 0 }, g);
  let uid = 0; /* a counter for SVG ids, never random */
  const nid = (p) => `mg-${p}-${++uid}`;

  const SC = {};

  /* ---- 1. the Was line slides off a price tag; the price history unrolls underneath ---- */
  SC.pricetag = {
    dur: 9.6, still: 8.6,
    build(svg, api) {
      const root = el("g", {}, svg);
      const PX = 360, PY = 34, HOLD = 6.7, OUT = 9.0;
      const cid = nid("roll");
      const cr = el("rect", { x: 80, y: 356, width: 640, height: 0 }, el("clipPath", { id: cid }, el("defs", {}, svg)));
      const chart = el("g", { "clip-path": `url(#${cid})` }, root);
      el("rect", { x: 92, y: 364, width: 616, height: 212, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, chart);
      const title = mono(chart, 120, 404, "Price history", 22);
      const P = [[134, 470], [192, 452], [250, 464], [308, 444], [366, 474], [430, 512], [494, 478], [552, 458], [610, 446], [674, 462]];
      const d = "M" + P.map((p) => p.join(" ")).join(" L");
      const lens = [0];
      for (let i = 1; i < P.length; i++) lens.push(lens[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      const L = lens[lens.length - 1], fLow = lens[5] / L;
      const under = el("path", { d, fill: "none", stroke: INK, "stroke-width": 11, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${L} ${L + 20}` }, chart);
      const line = el("path", { d, fill: "none", stroke: SKY, "stroke-width": 5.5, "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": `${L} ${L + 20}` }, chart);
      const dot = el("g", {}, chart);
      el("circle", { r: 13, fill: MINT, stroke: INK, "stroke-width": 3 }, dot);
      const low = mono(chart, 430, 556, "Lowest price seen", 20, { "text-anchor": "middle" });
      const roller = el("rect", { x: 84, y: 348, width: 632, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, root);

      const tag = el("g", {}, root);
      el("path", { d: "M0 0 V56", stroke: INK, "stroke-width": 8.5, "stroke-linecap": "round" }, tag);
      el("path", { d: "M0 0 V56", stroke: SOFT, "stroke-width": 3.5, "stroke-linecap": "round" }, tag);
      el("path", { d: "M-58 36 H58 L130 96 V272 Q130 292 110 292 H-110 Q-130 292 -130 272 V96 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 0, cy: 64, r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      const was = el("g", {}, tag);
      mono(was, -104, 159, "Was", 26);
      el("rect", { x: -28, y: 139, width: 112, height: 20, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, was);
      const strike = el("path", { d: "M-114 150 H98", stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round", "stroke-dasharray": "212 240", "stroke-dashoffset": 212 }, was);
      const div = el("path", { d: "M-104 200 H104", stroke: INK, "stroke-width": 3, "stroke-dasharray": "2 10", "stroke-linecap": "round" }, tag);
      const nw = el("g", {}, tag);
      mono(nw, -104, 258, "Now", 32);
      el("rect", { x: -16, y: 232, width: 108, height: 30, rx: 15, fill: "#fff", stroke: INK, "stroke-width": 3 }, nw);
      ringRect(tag, -144, 22, 288, 284, 28);
      const peg = el("g", {}, root);
      el("circle", { r: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, peg);
      const q = txt(root, 0, 0, "?", { "text-anchor": "middle", "font-size": 116, "font-weight": 700, fill: LIL, stroke: INK, "stroke-width": 5, "paint-order": "stroke", "stroke-linejoin": "round" });

      let back = -99;
      button(tag, "Slide the Was line back onto the tag to compare again", () => { back = api.now(); api.seek(HOLD); });
      const lineAt = (t) => io(seg(t, 3.9, 5.6));
      let tDot = 5.6;
      for (let t = 3.9; t < 5.6; t += 0.01) if (lineAt(t) >= fLow) { tDot = t; break; }

      return (t, now) => {
        const on = back > -50, e = now - back;
        if (on && e >= 3.6) { back = -99; api.seek(HOLD); return; }
        const T = on ? HOLD : t;
        root.setAttribute("opacity", 1 - io(seg(T, OUT, 9.6)));
        tf(peg, PX, PY, cl(ob(seg(T, 0, 0.35)), 0, 1.3));
        const u = T - 0.9, sw = u > 0 ? 8 * Math.sin(u * 6.5) * Math.exp(-u * 2.4) : 0;
        tf(tag, PX, PY - 330 * (1 - oc(seg(T, 0.12, 0.9))), 1, sw);
        tag.setAttribute("opacity", seg(T, 0.12, 0.3));
        const wk = oc(seg(T, 0.7, 1.1));
        div.setAttribute("opacity", oc(seg(T, 0.8, 1.15)));
        land(nw, oc(seg(T, 0.9, 1.3)), -24, 0);
        const sk = io(seg(T, 1.5, 2.0));
        strike.setAttribute("stroke-dashoffset", 212 * (1 - sk)); strike.setAttribute("opacity", sk > 0 ? 1 : 0);
        const bk = on ? io(seg(e, 0, 0.7)) * (1 - io(seg(e, 2.7, 3.5))) : 0;
        const s = io(seg(T, 2.4, 3.3)) * (1 - bk);
        was.setAttribute("transform", `translate(${-24 * (1 - wk) - 340 * s} ${26 * s * s}) rotate(${-9 * s})`);
        was.setAttribute("opacity", wk * (1 - seg(s, 0.45, 0.95)));
        const rk = oc(seg(T, 3.0, 3.9));
        cr.setAttribute("height", 232 * rk);
        roller.setAttribute("y", 348 + 224 * rk);
        roller.setAttribute("opacity", seg(T, 3.0, 3.12) * (1 - seg(T, 3.85, 4.1)));
        land(title, oc(seg(T, 3.45, 3.9)), 0, 12);
        const lk = lineAt(T);
        [under, line].forEach((n) => { n.setAttribute("stroke-dashoffset", L * (1 - lk)); n.setAttribute("opacity", lk > 0 ? 1 : 0); });
        tf(dot, P[5][0], P[5][1], cl(ob(seg(T, tDot, tDot + 0.45)), 0, 1.4));
        dot.setAttribute("opacity", T >= tDot ? 1 : 0);
        const qs = seg(T, 5.7, 6.6);
        tf(q, 578, 318, cl(ob(seg(T, 5.7, 6.2)), 0, 1.3), 12 * (1 - qs) * Math.sin(qs * 12));
        q.setAttribute("opacity", T >= 5.7 ? 1 : 0);
        land(low, oc(seg(T, 6.1, 6.6)), 0, 14);
      };
    },
  };

  /* ---- 2. a till prints the return dates, one store at a time ---- */
  SC.receipt = {
    dur: 8.6, still: 7.8,
    build(svg, api) {
      const root = el("g", {}, svg);
      const SLOT = 452, X0 = 240, W = 320, START = 1.1;
      const cid = nid("slot");
      el("rect", { x: 0, y: -400, width: 800, height: SLOT + 400 }, el("clipPath", { id: cid }, el("defs", {}, svg)));
      const tear = el("g", {}, root);
      const paper = el("g", {}, el("g", { "clip-path": `url(#${cid})` }, tear));
      let zz = "M0 10";
      for (let i = 0; i < 16; i++) zz += ` L${(i + 0.5) * 20} 0 L${(i + 1) * 20} 10`;
      el("path", { d: zz + " V480 H0 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, paper);
      mono(paper, W / 2, 62, "Return by", 30, { "text-anchor": "middle" });
      const rule = (y) => el("path", { d: `M26 ${y} H${W - 26}`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 9", "stroke-linecap": "round" }, paper);
      rule(92);
      const rows = [["Amazon", "January 31, 2027", 140], ["Target electronics", "January 24, 2027", 236]];
      const hl = rows.map(([s, dte, y]) => {
        mono(paper, 26, y, s, 24, { "font-weight": 500 });
        const r = el("rect", { x: 18, y: y + 14, width: 0, height: 34, rx: 8, fill: YEL }, paper);
        mono(paper, 26, y + 38, dte, 24);
        return { r, w: dte.length * 14.4 + 16 };
      });
      rule(312);
      const tick = el("g", {}, paper);
      el("circle", { r: 32, fill: MINT, stroke: INK, "stroke-width": 3 }, tick);
      el("path", { d: "M-14 1 L-4 11 L15 -10", fill: "none", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, tick);

      const till = el("g", {}, root);
      el("rect", { x: 200, y: 456, width: 400, height: 128, rx: 22, fill: BLUE, stroke: INK, "stroke-width": 3 }, till);
      el("rect", { x: 224, y: 444, width: 352, height: 22, rx: 11, fill: SOFT, stroke: INK, "stroke-width": 3 }, till);
      const screen = el("rect", { x: 230, y: 486, width: 150, height: 50, rx: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, till);
      const keys = [];
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
        const k = el("g", {}, till);
        el("rect", { x: -19, y: -11, width: 38, height: 22, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, k);
        keys.push({ k, x: 439 + c * 50, y: 499 + r * 30 });
      }
      el("path", { d: "M216 558 H584", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, till);
      el("rect", { x: 368, y: 564, width: 64, height: 10, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, till);

      const hitg = el("g", {}, root);
      pad(hitg, 234, 24, 332, 420);
      ringRect(hitg, 232, 22, 336, 424, 16);
      let tearAt = -99;
      button(hitg, "Print the receipt again, one store at a time", () => { tearAt = api.now(); api.poke(); });

      const steps = [[START, START + 0.5, 0, 104], [2.0, 2.5, 104, 190], [3.3, 3.8, 190, 286], [4.6, 5.2, 286, 420]];
      const hlAt = [2.55, 3.85];
      return (t, now) => {
        const on = tearAt > -50, e = now - tearAt;
        if (on && e >= 0.6) { tearAt = -99; api.seek(START - 0.05); return; }
        let L = 0, feeding = false;
        for (const [a, b, l0, l1] of steps) if (t >= a) { L = l0 + (l1 - l0) * io(seg(t, a, b)); if (t < b) feeding = true; }
        tf(paper, X0, SLOT - L);
        hl.forEach((h, i) => h.r.setAttribute("width", h.w * oc(seg(t, hlAt[i], hlAt[i] + 0.4))));
        const tk = ob(seg(t, 5.3, 5.85));
        tf(tick, W / 2, 368 - 20 * (1 - cl(tk)), cl(tk, 0, 1.3));
        tick.setAttribute("opacity", t >= 5.3 ? 1 : 0);
        const rip = Math.max(on ? io(seg(e, 0, 0.55)) : 0, io(seg(t, 8.0, 8.4)));
        tear.setAttribute("transform", `translate(0 ${-60 * rip})`); tear.setAttribute("opacity", 1 - rip);
        const up = ob(seg(t, 0, 0.6)), gone = io(seg(t, 8.2, 8.6));
        till.setAttribute("transform", `translate(${feeding ? Math.sin(t * 70) * 0.8 : 0} ${46 * (1 - up) + 30 * gone})`);
        till.setAttribute("opacity", seg(t, 0, 0.2) * (1 - gone));
        screen.setAttribute("opacity", seg(t, 0.2, 0.5));
        keys.forEach((k, i) => tf(k.k, k.x, k.y, cl(ob(seg(t, 0.3 + i * 0.08, 0.62 + i * 0.08)), 0, 1.3)));
      };
    },
  };

  /* ---- 3. a pencil ticks five checks on a clipboard ---- */
  SC.clipboard = {
    dur: 9.8, still: 9.0,
    build(svg, api) {
      const root = el("g", {}, svg);
      const HOLD = 6.7, OUT = 9.2;
      const board = el("g", {}, root);
      el("rect", { x: 210, y: 52, width: 380, height: 526, rx: 24, fill: LIL, stroke: INK, "stroke-width": 3 }, board);
      const sheet = el("rect", { x: 236, y: 98, width: 328, height: 454, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, root);
      const clip = el("g", {}, root);
      el("rect", { x: -64, y: -26, width: 128, height: 52, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, clip);
      el("rect", { x: -28, y: -12, width: 56, height: 14, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, clip);
      let re = null;
      const NAMES = ["Price history", "Former price", "Return by", "Price match", "Most I will pay"];
      const rows = NAMES.map((s, i) => {
        const y = 170 + i * 62, g = el("g", {}, root), cx = 277, cy = y - 9;
        pad(g, 250, y - 38, 300, 56);
        ringRect(g, 248, y - 40, 304, 60, 14);
        el("rect", { x: 262, y: y - 24, width: 30, height: 30, rx: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, 308, y, s, 22);
        const tk = el("path", { d: `M${cx - 9} ${cy + 1} l7 7 l13 -16`, fill: "none", stroke: BLUE, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const len = tk.getTotalLength();
        tk.setAttribute("stroke-dasharray", `${len} ${len + 10}`);
        button(g, `Untick ${s} and run that check again`, () => { re = { i, at: api.now() }; api.seek(HOLD); });
        return { g, tk, len, a: [cx - 9, cy + 1] };
      });
      const box = el("g", {}, root);
      el("rect", { x: 296, y: 462, width: 208, height: 60, rx: 14, fill: SKY, stroke: INK, "stroke-width": 3 }, box);
      const boxT = mono(root, 400, 500, "Buy or wait", 24, { "text-anchor": "middle" });
      const star = el("g", {}, root);
      let sp = "";
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 15 : 34, a = -Math.PI / 2 + (i * Math.PI) / 5; sp += (i ? " L" : "M") + (r * Math.cos(a)).toFixed(1) + " " + (r * Math.sin(a)).toFixed(1); }
      el("path", { d: sp + " Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, star);
      const pencil = el("g", {}, root);
      const pb = el("g", { transform: "rotate(-50)" }, pencil);
      el("rect", { x: 26, y: -11, width: 116, height: 22, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, pb);
      el("path", { d: "M34 -3.5 H134", stroke: SKY, "stroke-width": 3, "stroke-linecap": "round" }, pb);
      el("rect", { x: 150, y: -11, width: 28, height: 22, rx: 7, fill: MINT, stroke: INK, "stroke-width": 2.5 }, pb);
      el("rect", { x: 142, y: -11, width: 14, height: 22, fill: SKY, stroke: INK, "stroke-width": 2.5 }, pb);
      el("path", { d: "M1 0 L26 -11 V11 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, pb);
      el("path", { d: "M0 0 L9 -4 V4 Z", fill: INK }, pb);

      const REST = [640, 470], OFF = [880, 330];
      const S = (i) => 1.6 + i * 0.72;
      const ptOn = (r, k) => { const p = r.tk.getPointAtLength(r.len * k); return [p.x, p.y]; };
      const mix = (a, b, k, lift = 0) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k - lift * Math.sin(Math.PI * k)];
      const tipAt = (T) => {
        if (T < S(0)) return mix(OFF, rows[0].a, io(seg(T, 1.0, 1.6)));
        for (let i = 0; i < 5; i++) {
          const s = S(i);
          if (T < s + 0.3) return ptOn(rows[i], oc(seg(T, s, s + 0.3)));
          if (i < 4 && T < S(i + 1)) return mix(ptOn(rows[i], 1), rows[i + 1].a, io(seg(T, s + 0.36, S(i + 1))), 22);
        }
        return mix(ptOn(rows[4], 1), REST, io(seg(T, S(4) + 0.42, S(4) + 0.95)), 30);
      };

      return (t, now) => {
        let e = 99;
        if (re) { e = now - re.at; if (e >= 2.5) { re = null; api.seek(HOLD); return; } }
        const T = re ? HOLD : t;
        root.setAttribute("opacity", 1 - io(seg(T, OUT, 9.8)));
        const bk = ob(seg(T, 0, 0.6));
        board.setAttribute("transform", `translate(0 ${60 * (1 - bk)})`); board.setAttribute("opacity", seg(T, 0, 0.2));
        land(sheet, oc(seg(T, 0.12, 0.55)), 0, 40);
        tf(clip, 400, 76, cl(ob(seg(T, 0.25, 0.65)), 0, 1.3));
        rows.forEach((r, i) => {
          land(r.g, oc(seg(T, 0.45 + i * 0.09, 0.85 + i * 0.09)), 0, 18);
          let k = oc(seg(T, S(i), S(i) + 0.3));
          if (re && re.i === i) k = 1 - io(seg(e, 0, 0.35)) + oc(seg(e, 1.25, 1.55));
          r.tk.setAttribute("stroke-dashoffset", r.len * (1 - k)); r.tk.setAttribute("opacity", k > 0.001 ? 1 : 0);
        });
        let tip = tipAt(T);
        if (re) {
          const r = rows[re.i];
          if (e < 0.6) tip = REST;
          else if (e < 1.25) tip = mix(REST, r.a, io(seg(e, 0.6, 1.2)), 30);
          else if (e < 1.6) tip = ptOn(r, oc(seg(e, 1.25, 1.55)));
          else tip = mix(ptOn(r, 1), REST, io(seg(e, 1.65, 2.2)), 30);
        }
        tf(pencil, tip[0], tip[1]);
        pencil.setAttribute("opacity", T >= 1.0 ? 1 : 0);
        let sk = ob(seg(T, 5.45, 6.05)), lift = 0, fadeIn = seg(T, 5.45, 5.6);
        if (re) { if (e < 1.7) lift = io(seg(e, 0, 0.4)); else { sk = ob(seg(e, 1.7, 2.3)); fadeIn = seg(e, 1.7, 1.85); } }
        star.setAttribute("transform", `translate(566 ${74 - 70 * (1 - sk) - 46 * lift}) rotate(${-60 * (1 - sk)}) scale(${0.6 + 0.4 * sk})`);
        star.setAttribute("opacity", fadeIn * (1 - lift));
        land(box, oc(seg(T, 5.9, 6.4)), 0, 24);
        land(boxT, oc(seg(T, 6.1, 6.55)), 0, 12);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const chip = el("g", {}, svg);
      el("rect", { x: -75, y: -20, width: 150, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, chip);
      mono(chip, 0, 7, "Use Cases", 18, { "text-anchor": "middle" });
      const t1 = txt(svg, 64, 152, "Black Friday 2026:", { "font-size": 70, "font-weight": 700 });
      const hl = el("path", { d: "M60 216 H600", stroke: YEL, "stroke-width": 24, "stroke-linecap": "round" }, svg);
      const t2 = txt(svg, 64, 228, "Spot Fake Deals", { "font-size": 70, "font-weight": 700 });
      const hw = t2.getComputedTextLength() + 8;
      hl.setAttribute("d", `M62 216 H${64 + hw}`); hl.setAttribute("stroke-dasharray", `${hw} ${hw + 40}`);
      const sub = txt(svg, 64, 290, "Check the price history, not the was price.", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const chk = mono(svg, 64, 326, "Checked 25 Nov 2026", 17, { "font-weight": 500, fill: MUTE });
      const card = (x, col, a, b) => {
        const g = el("g", {}, svg), tx = el("g", {}, g);
        el("rect", { x, y: 436, width: 400, height: 80, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, g).after(tx);
        mono(tx, x + 24, 469, a, 21); mono(tx, x + 24, 499, b, 21);
        return [g, tx];
      };
      const c1 = card(64, LIL, "Black Friday:", "Fri 27 Nov 2026"), c2 = card(496, SKY, "Amazon returns through", "January 31, 2027");
      const tag = el("g", {}, svg);
      const sd = "M0 -24 C 8 -44, 26 -48, 34 -40";
      el("path", { d: sd, fill: "none", stroke: INK, "stroke-width": 7, "stroke-linecap": "round" }, tag);
      el("path", { d: sd, fill: "none", stroke: SOFT, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      el("path", { d: "M-18 -30 H18 L38 -12 V20 Q38 28 30 28 H-30 Q-38 28 -38 20 V-12 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tag);
      el("circle", { cx: 0, cy: -18, r: 5.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      el("path", { d: "M-20 2 H8 M-20 14 H20", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, tag);
      const rec = el("g", {}, svg);
      let zz = "M-28 -26";
      for (let i = 0; i < 7; i++) zz += ` L${-28 + (i + 0.5) * 8} -34 L${-28 + (i + 1) * 8} -26`;
      el("path", { d: zz + " V30 H-28 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, rec);
      el("rect", { x: -21, y: 1, width: 38, height: 12, rx: 4, fill: YEL }, rec);
      el("path", { d: "M-18 -12 H18 M-18 7 H12 M-18 20 H6", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, rec);
      return (t) => {
        tf(chip, 139, 60, cl(ob(seg(t, 0.1, 0.5)), 0, 1.3));
        land(t1, oc(seg(t, 0.2, 0.65)), 0, 20); land(t2, oc(seg(t, 0.3, 0.75)), 0, 20);
        hl.setAttribute("stroke-dashoffset", hw * (1 - io(seg(t, 0.8, 1.3)))); hl.setAttribute("opacity", t > 0.8 ? 1 : 0);
        land(sub, oc(seg(t, 0.45, 0.9)), 0, 14);
        land(c1[0], oc(seg(t, 0.7, 1.15)), 0, 26); land(c2[0], oc(seg(t, 0.8, 1.25)), 0, 26);
        tf(tag, 264, 398, cl(ob(seg(t, 1.1, 1.6)), 0, 1.3), -12); tf(rec, 696, 398, cl(ob(seg(t, 1.2, 1.7)), 0, 1.3), 8);
        land(c1[1], oc(seg(t, 1.25, 1.6)), 10, 0); land(c2[1], oc(seg(t, 1.35, 1.7)), 10, 0);
        land(chk, oc(seg(t, 1.8, 2.25)), 0, 10);
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
