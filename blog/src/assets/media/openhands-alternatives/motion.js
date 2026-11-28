/* Bright coded scenes for "OpenHands alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 18, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const sat = (n, cx, cy, s) => n.setAttribute("transform", `translate(${cx * (1 - s)} ${cy * (1 - s)}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  // a transparent hit area, or (ring = true) the dashed focus ring the CSS shows on focus and hover
  const box = (p, x, y, w, h, rx, ring) => el("rect", Object.assign({ x, y, width: w, height: h, rx }, ring ? { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 7", class: "mg-ring" } : { fill: "#fff", "fill-opacity": 0 }), p);

  const SC = {};

  /* ---- 1. a lighthouse beam passes three buoys and a flag rises over each ---- */
  SC.lighthouse = {
    dur: 8.5, still: 8.5,
    build(svg, api) {
      const L = [150, 203], A0 = 78, A1 = -12, BY = 478;
      const B = [["local", "OpenHands", 320, -184], ["remote", "Claude Code", 485, -226], ["cloud", "OpenCode", 655, -184]];
      const wave = (y, x0) => { let d = `M${x0} ${y}`; for (let i = 0; i < 22; i++) d += i ? " t40 0" : " q20 -9 40 0"; return d; };
      const wv = (y, x0, p) => el("path", { d: wave(y, x0), stroke: SKY, "stroke-width": 4, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, p);
      const back = [wv(524, -40, svg), wv(558, -60, svg)];
      const bm = el("g", {}, svg);
      const outer = el("path", { fill: YEL, "fill-opacity": 0.24 }, bm), inner = el("path", { fill: YEL, "fill-opacity": 0.3 }, bm);
      const wedge = (n, a, d) => { const r = Math.PI / 180, R = 900, p = (v) => `${(L[0] + Math.cos(v * r) * R).toFixed(1)} ${(L[1] + Math.sin(v * r) * R).toFixed(1)}`; n.setAttribute("d", `M${L[0]} ${L[1]} L${p(a - d)} L${p(a + d)} Z`); };
      const ang = (t) => A0 + (A1 - A0) * io(seg(t, 1.9, 6.5));
      const when = B.map(([, , x]) => { const tg = Math.atan2(BY - 40 - L[1], x - L[0]) * 180 / Math.PI; for (let t = 1.9; t < 6.5; t += 0.01) if (ang(t) <= tg) return t; return 6.5; });

      const tower = el("g", {}, svg);
      box(tower, 46, 126, 208, 384, 22);
      el("ellipse", { cx: 150, cy: 484, rx: 100, ry: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, tower);
      el("path", { d: "M110 478 L125 236 H175 L190 478 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tower);
      const hw = (y) => 25 + ((y - 236) / 242) * 15;
      [[286, 312], [404, 432]].forEach(([a, b]) => el("path", { d: `M${150 - hw(a)} ${a} H${150 + hw(a)} L${150 + hw(b)} ${b} H${150 - hw(b)} Z`, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tower));
      el("path", { d: "M139 478 V456 Q150 442 161 456 V478", fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tower);
      el("rect", { x: 114, y: 226, width: 72, height: 12, rx: 4, fill: SKY, stroke: INK, "stroke-width": 3 }, tower);
      el("rect", { x: 128, y: 180, width: 44, height: 46, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, tower);
      const lamp = el("circle", { cx: L[0], cy: L[1], r: 12, stroke: INK, "stroke-width": 2.5 }, tower);
      el("path", { d: "M122 182 L150 148 L178 182 Z", fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, tower);
      el("circle", { cx: 150, cy: 143, r: 6, fill: SKY, stroke: INK, "stroke-width": 2.5 }, tower);
      const sign = el("g", {}, tower);
      el("rect", { x: 76, y: 338, width: 160, height: 44, rx: 10, fill: LIL }, sign);
      el("rect", { x: 70, y: 332, width: 160, height: 44, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, sign);
      mono(sign, 150, 360.5, "Agent Canvas", { "text-anchor": "middle" });
      box(tower, 46, 126, 208, 384, 22, true);
      button(tower, "Send the beam round again", () => api.rewind(1.7, 1.1));

      const buoys = B.map(([lab, flag, x, top]) => {
        const g = el("g", {}, svg), w = flag.length * 10.8 + 36;
        el("path", { d: "M-66 8 q12 -7 24 0 M42 8 q12 -7 24 0", stroke: SKY, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round" }, g);
        const pole = el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        const fl = el("g", {}, g), F = (d) => `M${3 + d} ${top + d} H${w + d} L${w - 12 + d} ${top + 20 + d} L${w + d} ${top + 40 + d} H${3 + d} Z`;
        el("path", { d: F(6), fill: SOFT }, fl);
        el("path", { d: F(0), fill: LIL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, fl);
        el("circle", { cx: 0, cy: top - 8, r: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, fl);
        const ft = mono(fl, 15, top + 26.5, flag);
        el("rect", { x: -9, y: -68, width: 18, height: 13, rx: 3, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-50 -8 V-36 Q-50 -56 -30 -56 H30 Q50 -56 50 -36 V-8 Q50 2 40 2 H-40 Q-50 2 -50 -8 Z", fill: MINT, stroke: INK, "stroke-width": 3 }, g);
        const lb = mono(g, 0, -20.5, lab, { "text-anchor": "middle" });
        return { g, pole, fl, ft, lb, x, top };
      });
      const front = wv(490, -20, svg);

      return (t) => {
        const still = 1 - seg(t, 6.6, 8.2);
        [front, ...back].forEach((w, j) => { w.setAttribute("opacity", oc(seg(t, j * 0.08, 0.5 + j * 0.08))); w.setAttribute("transform", `translate(${8 * Math.sin(t * 1.1 + j * 1.7) * still} 0)`); });
        const kt = ob(seg(t, 0.05, 0.75));
        tower.setAttribute("opacity", seg(t, 0.05, 0.2)); tower.setAttribute("transform", `translate(0 ${50 * (1 - kt)})`);
        sat(sign, 150, 354, 0.5 + 0.5 * ob(seg(t, 0.55, 1.05))); sign.setAttribute("opacity", seg(t, 0.55, 0.7));
        lamp.setAttribute("fill", t >= 1.35 ? YEL : "#fff"); lamp.setAttribute("r", 12 * (1 + 0.3 * Math.sin(Math.PI * seg(t, 1.35, 1.8))));
        const a = ang(t); wedge(outer, a, 8); wedge(inner, a, 3.5); bm.setAttribute("opacity", oc(seg(t, 1.4, 1.9)));
        buoys.forEach((b, i) => {
          const a0 = 0.7 + i * 0.1, kb = ob(seg(t, a0, a0 + 0.5)), w0 = when[i], pulse = Math.sin(Math.PI * seg(t, w0 - 0.15, w0 + 0.35));
          b.g.setAttribute("opacity", seg(t, a0, a0 + 0.15));
          tf(b.g, b.x, BY + 2.5 * Math.sin(t * 2.3 + i * 1.4) * still, (0.4 + 0.6 * kb) * (1 + 0.07 * pulse));
          b.lb.setAttribute("opacity", seg(t, a0 + 0.3, a0 + 0.55));
          const off = 150 * (1 - ob(seg(t, w0, w0 + 0.6)));
          b.fl.setAttribute("transform", `translate(0 ${off})`); b.fl.setAttribute("opacity", seg(t, w0, w0 + 0.25));
          b.pole.setAttribute("d", `M0 -66 V${Math.min(-66, b.top - 8 + off)}`); b.pole.setAttribute("opacity", t > w0 ? 1 : 0);
          b.ft.setAttribute("opacity", seg(t, w0 + 0.35, w0 + 0.6));
        });
      };
    },
  };

  /* ---- 2. an abacus counts the three OpenHands prices ---- */
  SC.abacus = {
    dur: 9, still: 9,
    build(svg, api) {
      const R = [["Open Source", "Free", 150, 1.9], ["Teams", "$500 a month", 290, 3.2], ["Enterprise", "Custom", 450, 4.5]];
      const ab = el("g", {}, svg);
      [100, 656].forEach((x) => { el("rect", { x: x + 8, y: 532, width: 44, height: 34, rx: 8, fill: SOFT }, ab); el("rect", { x, y: 524, width: 44, height: 34, rx: 8, fill: LIL, stroke: INK, "stroke-width": 3 }, ab); });
      el("rect", { x: 50, y: 50, width: 720, height: 490, rx: 26, fill: SOFT }, ab);
      el("rect", { x: 40, y: 40, width: 720, height: 490, rx: 26, fill: LIL, stroke: INK, "stroke-width": 3 }, ab);
      el("rect", { x: 72, y: 72, width: 656, height: 426, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, ab);
      const rails = R.map(([lab, price, y, s]) => {
        const rod = el("rect", { x: 72, y: y - 6, height: 12, rx: 6, fill: MINT, stroke: INK, "stroke-width": 2.5 }, ab);
        const name = mono(ab, 96, y - 38, lab, { "font-size": 20 });
        const val = txt(ab, 704, y - 36, price, { "text-anchor": "end", "font-size": 28, "font-weight": 700 });
        const beads = Array.from({ length: 6 }, () => el("ellipse", { rx: 16, ry: 24, fill: SKY, stroke: INK, "stroke-width": 2.5 }, ab));
        return { rod, name, val, beads, y, s };
      });
      const tag = el("g", {}, ab);
      el("rect", { x: 102, y: 334, width: 244, height: 46, rx: 10, fill: LIL }, tag);
      el("rect", { x: 96, y: 328, width: 244, height: 46, rx: 10, fill: YEL, stroke: INK, "stroke-width": 3 }, tag);
      el("circle", { cx: 114, cy: 351, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, tag);
      el("path", { d: "M114 297 V345", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tag);
      mono(tag, 132, 357.5, "10 users included");
      const hit = el("g", {}, svg);
      box(hit, 28, 28, 744, 544, 32); box(hit, 28, 28, 744, 544, 32, true);
      button(hit, "Slide the beads back and count again", () => api.rewind(1.85, 1.2));

      return (t) => {
        sat(ab, 400, 300, 0.9 + 0.1 * ob(seg(t, 0, 0.6))); ab.setAttribute("opacity", seg(t, 0, 0.2));
        rails.forEach((r, j) => {
          const kr = oc(seg(t, 0.35 + j * 0.1, 0.95 + j * 0.1));
          r.rod.setAttribute("width", Math.max(0.01, 656 * kr)); r.rod.setAttribute("opacity", kr > 0 ? 1 : 0);
          const kl = oc(seg(t, 0.7 + j * 0.1, 1.1 + j * 0.1));
          r.name.setAttribute("opacity", kl); r.name.setAttribute("transform", `translate(${-14 * (1 - kl)} 0)`);
          r.beads.forEach((b, i) => {
            const a = 0.9 + j * 0.1 + i * 0.06, d = r.s + (5 - i) * 0.09;
            b.setAttribute("transform", `translate(${98 + i * 36 + 422 * oc(seg(t, d, d + 0.7))} ${r.y}) scale(${ob(seg(t, a, a + 0.4))})`);
            b.setAttribute("opacity", seg(t, a, a + 0.1));
          });
          const kv = ob(seg(t, r.s + 1, r.s + 1.5));
          r.val.setAttribute("opacity", seg(t, r.s + 1, r.s + 1.2)); r.val.setAttribute("transform", `translate(0 ${16 * (1 - kv)})`);
        });
        tag.setAttribute("opacity", seg(t, 6.1, 6.25));
        tag.setAttribute("transform", `rotate(${16 * (1 - ob(seg(t, 6.1, 6.9)))} 114 297)`);
      };
    },
  };

  /* ---- 3. a compass needle swings to the card you tap ---- */
  SC.compass = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const C = [400, 380], RIM = 108;
      const CARDS = [[["Open source", "agent"], "OpenCode", 100, 160], [["Team of", "agents"], "Munder Difflin", 250, 122], [["General", "purpose"], "goose", 400, 108], [["Your", "editor"], "Cline", 550, 122], [["Anthropic"], "Claude Code", 700, 160]];
      const ang = CARDS.map((c) => (Math.atan2(c[3] - C[1], c[2] - C[0]) * 180) / Math.PI + 90);
      let user = null, cur = { angle: 0, shown: -1 };
      const pickIt = (i) => { user = { at: api.now(), from: cur.angle, to: i < 0 ? 0 : ang[i], idx: i, prev: cur.shown }; api.poke(1.2); };
      const guide = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "2 10", "stroke-linecap": "round", fill: "none" }, svg);
      const cards = CARDS.map(([lines, pick, x, y], i) => {
        const g = el("g", {}, svg);
        el("rect", { x: -64, y: -32, width: 140, height: 76, rx: 14, fill: SOFT }, g);
        const lift = el("g", {}, g);
        el("rect", { x: -70, y: -38, width: 140, height: 76, rx: 14, fill: LIL, stroke: INK, "stroke-width": 2.5 }, lift);
        lines.forEach((s, j) => mono(lift, 0, lines.length > 1 ? -4 + j * 24 : 6.5, s, { "text-anchor": "middle" }));
        box(lift, -78, -46, 156, 92, 20, true);
        button(g, `${lines.join(" ")}: ${pick}`, () => pickIt(i));
        return { g, lift, x, y };
      });
      const comp = el("g", {}, svg);
      el("circle", { cx: C[0] + 8, cy: C[1] + 8, r: RIM, fill: LIL }, comp);
      el("circle", { cx: C[0], cy: C[1], r: RIM, fill: SKY, stroke: INK, "stroke-width": 3 }, comp);
      el("circle", { cx: C[0], cy: C[1], r: 84, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, comp);
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8, m = i % 4 === 0, r0 = m ? 66 : 73;
        el("path", { d: `M${(C[0] + Math.sin(a) * r0).toFixed(1)} ${(C[1] - Math.cos(a) * r0).toFixed(1)} L${(C[0] + Math.sin(a) * 80).toFixed(1)} ${(C[1] - Math.cos(a) * 80).toFixed(1)}`, stroke: INK, "stroke-width": m ? 3 : 2, "stroke-linecap": "round" }, comp);
      }
      const needle = el("g", {}, comp);
      el("path", { d: "M-13 0 H13 L0 60 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, needle);
      el("path", { d: "M0 -74 L13 0 H-13 Z", fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, needle);
      el("circle", { cx: C[0], cy: C[1], r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, comp);
      el("circle", { cx: C[0], cy: C[1], r: 124, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 7", class: "mg-ring" }, comp);
      button(comp, "Send the needle back to the top", () => pickIt(-1));
      const lab = el("g", {}, svg);
      const lsh = el("rect", { y: 518, height: 50, rx: 25, fill: LIL }, lab);
      const lbox = el("rect", { y: 512, height: 50, rx: 25, fill: YEL, stroke: INK, "stroke-width": 3 }, lab);
      const ltx = mono(lab, 400, 544.5, "", { "text-anchor": "middle", "font-size": 22 });

      // one swing of the needle: from, to, which card it lands on, which card it left
      const state = (u, x) => {
        const on = x >= u.at + 0.25, pop = on ? ob(seg(x, u.at + 0.25, u.at + 0.6)) : 1;
        return {
          angle: u.from + (u.to - u.from) * ob(seg(x, u.at, u.at + 0.7)),
          shown: on ? u.idx : u.prev, pop,
          op: on ? seg(x, u.at + 0.25, u.at + 0.4) : u.idx < 0 ? 1 - seg(x, u.at, u.at + 0.25) : 1,
          guide: on ? seg(x, u.at + 0.45, u.at + 0.7) : 1 - seg(x, u.at, u.at + 0.15),
          lift: (i) => (!on && i === u.prev ? 1 - oc(seg(x, u.at, u.at + 0.25)) : on && i === u.idx ? pop : 0),
        };
      };
      const SEQ = [0, 1, 2, 3, 4, 1];
      const sw = SEQ.map((idx, j) => ({ at: 2 + j * 1.05, from: j ? ang[SEQ[j - 1]] : 0, to: ang[idx], idx, prev: j ? SEQ[j - 1] : -1 }));

      return (t, now) => {
        const kc = ob(seg(t, 0, 0.6));
        comp.setAttribute("opacity", seg(t, 0, 0.15)); sat(comp, C[0], C[1], 0.6 + 0.4 * kc);
        let s;
        if (user) s = state(user, api.calm ? user.at + 9 : now);
        else {
          let j = -1; sw.forEach((w, k) => { if (t >= w.at) j = k; });
          s = j >= 0 ? state(sw[j], t) : { angle: -240 * (1 - oc(seg(t, 0.5, 1.6))), shown: -1, pop: 0, op: 0, guide: 0, lift: () => 0 };
        }
        cur = { angle: s.angle, shown: s.shown };
        needle.setAttribute("transform", `translate(${C[0]} ${C[1]}) rotate(${s.angle})`);
        cards.forEach((c, i) => {
          const a = 0.35 + i * 0.09, kd = ob(seg(t, a, a + 0.5));
          c.g.setAttribute("opacity", seg(t, a, a + 0.15)); tf(c.g, c.x, c.y - 40 * (1 - kd));
          c.lift.setAttribute("transform", `translate(0 ${-10 * s.lift(i)})`);
        });
        if (s.shown < 0) { lab.setAttribute("opacity", 0); guide.setAttribute("opacity", 0); return; }
        const name = CARDS[s.shown][1], w = name.length * 13.2 + 48;
        if (ltx.textContent !== name) { ltx.textContent = name; lbox.setAttribute("x", 400 - w / 2); lbox.setAttribute("width", w); lsh.setAttribute("x", 406 - w / 2); lsh.setAttribute("width", w); }
        lab.setAttribute("opacity", s.op); sat(lab, 400, 537, 0.8 + 0.2 * s.pop);
        const r = (ang[s.shown] * Math.PI) / 180, c = CARDS[s.shown];
        guide.setAttribute("d", `M${(C[0] + Math.sin(r) * (RIM + 12)).toFixed(1)} ${(C[1] - Math.cos(r) * (RIM + 12)).toFixed(1)} L${c[2]} ${c[3] + 50 - 10 * s.lift(s.shown)}`);
        guide.setAttribute("opacity", s.guide);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg, api) {
      const pill = el("g", {}, svg);
      el("rect", { x: 69, y: 55, width: 176, height: 40, rx: 20, fill: SOFT }, pill);
      el("rect", { x: 64, y: 50, width: 176, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pill);
      mono(pill, 152, 77, "Alternatives", { "text-anchor": "middle", "font-size": 20 });
      const title = txt(svg, 64, 168, "OpenHands alternatives", { "font-size": 62, "font-weight": 700 });
      const line = txt(svg, 64, 220, "5 picks after v1.42.0", { "font-size": 28, "font-weight": 600 });
      const date = txt(svg, 64, 258, "Checked 19 Nov 2026", { "font-size": 22, "font-weight": 500, fill: MUTE });
      const NAMES = ["OpenCode", "Munder Difflin", "goose", "Cline", "Claude Code"];
      const ws = NAMES.map((n) => n.length * 12 + 40);
      let x0 = 480 - (ws.reduce((a, b) => a + b, 0) + 18 * 4) / 2;
      const tiles = NAMES.map((n, i) => { const x = x0; x0 += ws[i] + 18; return { n, x, w: ws[i], cx: x + ws[i] / 2 }; });
      const tree = el("g", {}, svg);
      box(tree, 70, 282, 820, 208, 24);
      const wires = tiles.map((tl) => el("path", { d: `M480 348 V384 H${tl.cx} V420`, pathLength: 1, "stroke-dasharray": 1, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tree));
      const oh = el("g", {}, tree);
      el("rect", { x: 406, y: 296, width: 148, height: 52, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, oh);
      mono(oh, 480, 329, "OpenHands", { "text-anchor": "middle", "font-size": 20, fill: MUTE });
      const tg = tiles.map((tl) => {
        const g = el("g", {}, tree);
        el("rect", { x: tl.x + 5, y: 425, width: tl.w, height: 52, rx: 12, fill: LIL }, g);
        el("rect", { x: tl.x, y: 420, width: tl.w, height: 52, rx: 12, fill: MINT, stroke: INK, "stroke-width": 2.5 }, g);
        mono(g, tl.cx, 453, tl.n, { "text-anchor": "middle", "font-size": 20 });
        return g;
      });
      box(tree, 70, 282, 820, 208, 24, true);
      button(tree, "Replay the five picks", () => api.rewind(1.2, 0.8));

      return (t) => {
        sat(pill, 152, 70, 0.6 + 0.4 * ob(seg(t, 0.1, 0.5))); pill.setAttribute("opacity", seg(t, 0.1, 0.2));
        [title, line].forEach((n, i) => { const k = oc(seg(t, 0.25 + i * 0.12, 0.85 + i * 0.12)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${18 * (1 - k)})`); });
        sat(oh, 480, 322, 0.7 + 0.3 * ob(seg(t, 0.8, 1.25))); oh.setAttribute("opacity", seg(t, 0.8, 0.95));
        wires.forEach((w, i) => { const k = io(seg(t, 1.2 + i * 0.11, 1.9 + i * 0.11)); w.setAttribute("stroke-dashoffset", 1 - k); w.setAttribute("opacity", k > 0 ? 1 : 0); });
        tg.forEach((g, i) => { const a = 1.6 + i * 0.11; g.setAttribute("opacity", seg(t, a, a + 0.15)); g.setAttribute("transform", `translate(0 ${40 * (1 - ob(seg(t, a, a + 0.6)))})`); });
        const kd = oc(seg(t, 2.8, 3.4)); date.setAttribute("opacity", kd); date.setAttribute("transform", `translate(${-16 * (1 - kd)} 0)`);
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
    // scene time moves only while the figure is in view; it plays once and rests on its final frame
    let st = 0, last = -1, raf = 0, seen = false, until = 0, rw = null;
    const clock = () => performance.now() / 1000;
    const time = (now) => {
      if (!rw) return st;
      const r = seg(now, rw.at, rw.at + rw.len);
      if (r < 1) return rw.from + (rw.to - rw.from) * io(r);
      st = rw.to; rw = null; return st;
    };
    let draw = () => {};
    const tick = () => {
      cancelAnimationFrame(raf);
      const now = clock();
      if (!rw && last >= 0) st = Math.min(sc.dur, st + now - last);
      last = now;
      draw(calm ? sc.still : time(now), now);
      if (seen && (rw || (!calm && st < sc.dur) || now < until)) raf = requestAnimationFrame(tick); else last = -1;
    };
    const api = {
      calm, now: clock,
      rewind: (to, len = 1) => { if (!calm) rw = { from: time(clock()), to, at: clock(), len }; tick(); },
      poke: (s = 1) => { until = Math.max(until, clock() + s); tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else { cancelAnimationFrame(raf); last = -1; }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    tick();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 28px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
