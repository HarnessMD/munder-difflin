/* Bright coded scenes for "Claude API 2026-10-21". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, x, y, s, anchor = "end") => txt(svg, x, y, s, { "text-anchor": anchor, "font-size": 18, "font-weight": 500, fill: MUTE });
  const pill = (svg, x, y, w, label, col, fn) => {
    const g = el("g", {}, svg);
    el("rect", { x, y, width: w, height: 52, rx: 26, fill: col, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: x - 6, y: y - 6, width: w + 12, height: 64, rx: 32, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
    txt(g, x + w / 2, y + 33, label, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
    button(g, label, fn); return g;
  };
  let uid = 0;
  /* Every scene loops back to its own final frame: t = 0 and t = dur draw the same settled state,
     and the first half second fades that state out before the story plays again. */

  const SC = {};

  /* ---- title card, 16 by 9: a rubber stamp presses the new date onto an envelope ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      el("rect", { x: 64, y: 68, width: 88, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 108, 95, "API", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 62, 210, "Claude API", { "font-size": 74, "font-weight": 700 });
      txt(svg, 62, 294, "2026-10-21", { "font-size": 74, "font-weight": 700 });
      el("path", { d: "M66 324 H470", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 382, "What breaks and how to upgrade", { "font-size": 26, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 472, "Checked 22 Oct 2026", { "font-size": 18, "font-weight": 500, fill: CAP });
      el("rect", { x: 584, y: 266, width: 330, height: 220, rx: 14, fill: SKY }, svg);
      el("rect", { x: 572, y: 254, width: 330, height: 220, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M574 256 L737 326 L900 256 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg);
      const mark = (cx, cy, rot, col, s, w, h, fs) => {
        const g = el("g", {}, svg);
        el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 10, fill: "none", stroke: col, "stroke-width": 3.5 }, g);
        el("rect", { x: -w / 2 + 6, y: -h / 2 + 6, width: w - 12, height: h - 12, rx: 6, fill: "none", stroke: col, "stroke-width": 1.5 }, g);
        txt(g, 0, fs * 0.36, s, { "text-anchor": "middle", "font-family": MONO, "font-size": fs, "font-weight": 700, fill: col });
        tf(g, cx, cy, 1, rot); return g;
      };
      mark(712, 430, 6, LIL, "2023-06-01", 200, 54, 26).setAttribute("opacity", 0.5);
      const neu = mark(770, 378, -5, BLUE, "2026-10-21", 228, 64, 32);
      const sparks = Array.from({ length: 8 }, (_, i) => el("path", { stroke: i % 2 ? YEL : BLUE, "stroke-width": 4, "stroke-linecap": "round" }, svg));
      const st = el("g", {}, svg);
      el("rect", { x: -120, y: -14, width: 240, height: 14, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, st);
      el("rect", { x: -18, y: -116, width: 36, height: 62, rx: 8, fill: SKY, stroke: INK, "stroke-width": 3 }, st);
      el("rect", { x: -128, y: -56, width: 256, height: 44, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, st);
      el("ellipse", { cx: 0, cy: -138, rx: 36, ry: 26, fill: LIL, stroke: INK, "stroke-width": 3 }, st);
      return (t) => {
        const bob = Math.sin((t / 6) * Math.PI * 4) * 5;
        const down = io(seg(t, 1.3, 1.9)) - io(seg(t, 2.4, 3.4));
        const squash = 1 - 0.05 * Math.sin(seg(t, 1.9, 2.4) * Math.PI);
        st.setAttribute("transform", `translate(${lerp(792, 770, down)} ${lerp(236 + bob, 410, down)}) rotate(${lerp(3, -5, down)}) scale(1 ${squash})`);
        const rev = seg(t, 2.4, 3.0);
        neu.setAttribute("opacity", t < 1.3 ? 1 - seg(t, 0.2, 0.8) : oc(rev));
        tf(neu, 770, 378, t >= 2.4 ? 1 + 0.08 * (1 - oc(rev)) : 1, -5);
        const s = seg(t, 2.45, 3.25);
        sparks.forEach((p, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.3, c = Math.cos(a), n = Math.sin(a), r1 = 1.0 + 0.25 * oc(s), r2 = r1 + 0.18;
          p.setAttribute("d", `M${770 + c * 128 * r1} ${378 + n * 46 * r1} L${770 + c * 128 * r2} ${378 + n * 46 * r2}`);
          p.setAttribute("opacity", Math.sin(s * Math.PI));
        });
      };
    },
  };

  /* ---- 1. the version header flips, then the eight SDK badges land on a shelf ---- */
  SC.header = {
    dur: 12, still: 12,
    build(svg, api) {
      const id = "mgflap" + (++uid), defs = el("defs", {}, svg);
      [["t", -23], ["b", 0]].forEach(([n, y]) => el("rect", { x: -12, y, width: 24, height: 23 }, el("clipPath", { id: id + n }, defs)));
      hint(svg, 756, 56, "Tap a badge");
      el("rect", { x: 72, y: 108, width: 676, height: 128, rx: 24, fill: SKY }, svg);
      el("rect", { x: 60, y: 96, width: 676, height: 128, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 118, 169.5, "anthropic-version:", { "font-family": MONO, "font-size": 26, "font-weight": 500 });
      const OLD = "2023-06-01", NEW = "2026-10-21", changed = [...OLD].map((c, i) => (c !== NEW[i] ? i : -1)).filter((i) => i >= 0);
      const tiles = [...OLD].map((ch, i) => {
        const g = el("g", {}, svg); tf(g, 428 + i * 26, 160);
        const bg = el("rect", { x: -11, y: -22, width: 22, height: 44, rx: 5, fill: SOFT, stroke: INK, "stroke-width": 2 }, g);
        const T = el("g", {}, g);
        const mk = (clip, back) => {
          const outer = el("g", {}, T), inner = el("g", { "clip-path": `url(#${id}${clip})` }, outer);
          const r = back ? el("rect", { x: -10, y: -21, width: 20, height: 42, rx: 4, fill: SOFT }, inner) : null;
          return { outer, r, s: txt(inner, 0, 9.5, ch, { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 }) };
        };
        const d = { bg, T, sT: mk("t"), sB: mk("b"), fT: mk("t", true), fB: mk("b", true), old: ch, neu: NEW[i] };
        el("path", { d: "M-11 0 H11", stroke: INK, "stroke-width": 1.2, opacity: 0.35 }, g);
        d.fT.s.textContent = ch; d.fB.s.textContent = NEW[i];
        return d;
      });
      const NAMES = ["Python 2.0.0", "TypeScript 1.0.0", "Go 2.0.0", "Java 3.0.0", "C# 13.0.0", "PHP 1.0.0", "Ruby 2.0.0", "ant CLI 2.0.0"];
      const BW = 166, BH = 46, GAP = 14, X0 = 400 - (4 * BW + 3 * GAP) / 2, SHELF = [336, 436], FILL = [SKY, MINT, LIL, SOFT];
      SHELF.forEach((y) => {
        [84, 716].forEach((x) => el("path", { d: `M${x - 12} ${y + 10} H${x + 12} L${x} ${y + 28} Z`, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg));
        el("rect", { x: 30, y, width: 740, height: 12, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      });
      const strip = el("g", {}, svg);
      el("rect", { x: 250, y: 482, width: 300, height: 48, rx: 24, fill: SOFT }, strip);
      const sl = el("text", { x: 400, y: 513, "text-anchor": "middle", "font-family": SANS, "font-size": 20, "font-weight": 500, fill: INK }, strip);
      el("tspan", {}, sl).textContent = "Sends ";
      el("tspan", { "font-family": MONO, "font-weight": 700 }, sl).textContent = "2026-10-21";
      let pinned = -1;
      const pick = (i) => { if (pinned === i) { api.poke(); return; } pinned = i; api.seek(7.4); };
      const badges = NAMES.map((n, i) => {
        const row = i >> 2, x = X0 + (i % 4) * (BW + GAP), y = SHELF[row] - BH, col = FILL[(i + row * 2) % 4];
        const g = el("g", {}, svg);
        el("rect", { x: -6, y: -6, width: BW + 12, height: BH + 12, rx: 29, fill: "none", stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const body = el("rect", { width: BW, height: BH, rx: 23, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        const label = txt(g, BW / 2, 29.5, n, { "text-anchor": "middle", "font-size": 18, "font-weight": 600 });
        const w = label.getComputedTextLength ? label.getComputedTextLength() : 0;
        if (w > BW - 26) label.setAttribute("font-size", (18 * (BW - 26)) / w);
        button(g, `${n} sends 2026-10-21`, () => pick(i));
        g.addEventListener("focus", () => pick(i));
        return { g, body, x, y, col };
      });
      return (t) => {
        const resid = t < 0.25, tOp = t < 0.25 ? 1 - t * 4 : t < 0.5 ? (t - 0.25) * 4 : 1, lit = resid || t >= 2.6;
        tiles.forEach((d, i) => {
          const j = changed.indexOf(i);
          const k = resid ? 1 : j < 0 ? (t >= 2.6 ? 1 : 0) : seg(t, 1 + j * 0.35, 1.5 + j * 0.35);
          const f = lit ? SKY : SOFT;
          d.bg.setAttribute("fill", f); d.fT.r.setAttribute("fill", f); d.fB.r.setAttribute("fill", f);
          d.T.setAttribute("opacity", tOp);
          d.sT.s.textContent = k > 0 ? d.neu : d.old; d.sB.s.textContent = k >= 1 ? d.neu : d.old;
          const a = k > 0 && k < 0.5, b = k >= 0.5 && k < 1;
          d.fT.outer.setAttribute("opacity", a ? 1 : 0); d.fT.outer.setAttribute("transform", `scale(1 ${a ? 1 - 2 * k : 1})`);
          d.fB.outer.setAttribute("opacity", b ? 1 : 0); d.fB.outer.setAttribute("transform", `scale(1 ${b ? 2 * k - 1 : 1})`);
        });
        if (t > 0.5 && t < 7.4) pinned = -1;
        const up = pinned >= 0 ? pinned : 0, rest = 1 - seg(t, 0, 0.5), liftK = t < 0.5 ? 1 : oc(seg(t, 7.4, 7.8));
        badges.forEach((b, i) => {
          let dy = 0, op = rest;
          if (t >= 0.5) { const s = 3.2 + i * 0.42, k = seg(t, s, s + 0.5); dy = -64 * (1 - k * k) - 9 * Math.sin(seg(t, s + 0.5, s + 0.75) * Math.PI); op = seg(t, s, s + 0.12); }
          const lifted = i === up ? liftK : 0;
          tf(b.g, b.x, b.y + dy - 22 * lifted);
          b.g.setAttribute("opacity", op);
          b.body.setAttribute("fill", lifted > 0.4 ? YEL : b.col);
          b.body.setAttribute("stroke-width", lifted > 0.4 ? 3 : 2.5);
        });
        strip.setAttribute("opacity", t < 0.5 ? rest : liftK);
      };
    },
  };

  /* ---- 2. three dials on a request get a 400; lift them off and the request gets a 200 ---- */
  SC.dials = {
    dur: 13, still: 13,
    build(svg, api) {
      const COL = [SKY, LIL, MINT], NAMES = ["temperature", "top_p", "top_k"];
      const HOME = [[300, 186], [400, 186], [500, 186]], AWAY = [[648, 104, -14], [730, 172, 12], [644, 228, -8]];
      const lines = HOME.map(() => el("path", { stroke: BLUE, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg));
      el("rect", { x: 228, y: 98, width: 344, height: 140, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      HOME.forEach(([x, y]) => el("circle", { cx: x, cy: y, r: 31, fill: "#fff", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "4 6" }, svg));
      const card = (col, word) => {
        const g = el("g", {}, svg);
        el("rect", { width: 220, height: 120, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const dots = [54, 78, 102].map((y, i) => { el("rect", { x: 40, y: y - 5, width: [52, 150, 116][i], height: 10, rx: 5, fill: SOFT }, g); return el("circle", { cx: 24, cy: y, r: 7, fill: COL[i], stroke: INK, "stroke-width": 2 }, g); });
        const st = el("g", {}, g);
        el("rect", { x: -48, y: -25, width: 96, height: 50, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, st);
        el("rect", { x: -42, y: -19, width: 84, height: 38, rx: 6, fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "4 4" }, st);
        txt(st, 0, 12, word, { "text-anchor": "middle", "font-size": 32, "font-weight": 700 });
        return { g, dots, st };
      };
      const c1 = card(YEL, "400"), c2 = card(MINT, "200");
      const ends = HOME.map(() => el("circle", { r: 4.5, fill: BLUE, stroke: INK, "stroke-width": 1.5 }, svg));
      const dials = NAMES.map((n, i) => {
        const g = el("g", {}, svg);
        for (let a = -135; a <= 135; a += 45) { const r = ((a - 90) * Math.PI) / 180; el("path", { d: `M${Math.cos(r) * 34} ${Math.sin(r) * 34} L${Math.cos(r) * 39} ${Math.sin(r) * 39}`, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g); }
        el("circle", { r: 30, fill: COL[i], stroke: INK, "stroke-width": 3 }, g);
        el("circle", { r: 19, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
        const ptr = el("path", { d: "M0 0 V-15", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, g);
        txt(g, 0, -46, n, { "text-anchor": "middle", "font-family": MONO, "font-size": 16, "font-weight": 700 });
        return { g, ptr, x: 0, y: 0 };
      });
      const note = el("g", {}, svg);
      el("rect", { x: 435, y: 480, width: 330, height: 44, rx: 22, fill: SOFT }, note);
      const nt = el("text", { x: 600, y: 508, "text-anchor": "middle", "font-family": SANS, "font-size": 20, "font-weight": 500, fill: INK }, note);
      el("tspan", {}, nt).textContent = "Defaults, ";
      el("tspan", { "font-family": MONO, "font-weight": 700 }, nt).textContent = "temperature";
      el("tspan", {}, nt).textContent = " 1.0";
      pill(svg, 60, 494, 150, "Remove", LIL, () => api.seek(4.4));
      hint(svg, 232, 528, "Tap Remove", "start");
      const stamp = (st, k) => { tf(st, 152, 34, 1 + 0.6 * (1 - oc(k)), -10); st.setAttribute("opacity", cl(k * 4)); };
      return (t) => {
        const r = 1 - seg(t, 0, 0.6), P = (Math.PI * 2) / 13;
        const k0 = t < 1 ? 1 - io(seg(t, 0, 0.9)) : io(seg(t, 4.6, 6.0));
        dials.forEach((d, i) => {
          const [hx, hy] = HOME[i], [ax, ay, ar] = AWAY[i];
          const pop = Math.sin(seg(t, 4.6, 5.2) * Math.PI) * 0.12;
          d.x = lerp(hx, ax, k0); d.y = lerp(hy, ay, k0) + Math.sin(t * P * 5 + i * 2) * 4 * k0;
          tf(d.g, d.x, d.y, 1 + pop - 0.1 * k0, ar * k0);
          d.g.setAttribute("opacity", 1 - 0.6 * k0);
          d.ptr.setAttribute("transform", `rotate(${-60 + i * 50 + Math.sin(t * P * 8 + i) * 18 * (1 - k0)})`);
        });
        let c1x, c1y, c1s, c1o;
        if (t < 0.6) { c1x = 613; c1y = 268; c1s = 0.7; c1o = 0.9 * r; }
        else {
          const slide = io(seg(t, 1.2, 2.4)), shrink = io(seg(t, 3.6, 4.3));
          c1x = lerp(lerp(60, 490, slide), 613, shrink); c1y = lerp(340, 268, shrink); c1s = 1 - 0.3 * shrink; c1o = seg(t, 0.6, 1.0) * (1 - 0.1 * shrink);
        }
        c1.g.setAttribute("transform", `translate(${c1x} ${c1y}) scale(${c1s})`); c1.g.setAttribute("opacity", c1o);
        stamp(c1.st, t < 0.6 ? 1 : seg(t, 2.4, 2.75));
        let c2x, c2o;
        if (t < 0.6) { c2x = 490; c2o = r; } else if (t < 3.9) { c2x = 60; c2o = 0; } else { c2x = lerp(60, 490, io(seg(t, 6.3, 7.5))); c2o = seg(t, 3.9, 4.3); }
        c2.g.setAttribute("transform", `translate(${c2x} 340)`); c2.g.setAttribute("opacity", c2o);
        const dotOp = t < 0.6 ? 0 : 1 - seg(t, 4.6, 5.4);
        c2.dots.forEach((n) => n.setAttribute("opacity", dotOp));
        stamp(c2.st, t < 0.6 ? 1 : seg(t, 7.5, 7.85));
        note.setAttribute("opacity", t < 0.6 ? r : oc(seg(t, 8.0, 8.5)));
        let L, cx;
        if (t < 3.75) { L = seg(t, 0.7, 1.1) * (1 - seg(t, 3.4, 3.7)); cx = c1x; } else { L = seg(t, 3.95, 4.35) * (1 - seg(t, 4.6, 5.0)); cx = c2x; }
        lines.forEach((p, i) => {
          const sx = dials[i].x, sy = dials[i].y + 30, ex = cx + 70 + i * 40, ey = 340;
          p.setAttribute("d", `M${sx} ${sy} C${sx} ${sy + 70} ${ex} ${ey - 70} ${ex} ${ey}`); p.setAttribute("opacity", L);
          ends[i].setAttribute("cx", ex); ends[i].setAttribute("cy", ey); ends[i].setAttribute("opacity", L);
        });
      };
    },
  };

  /* ---- 3. the key moves to the Authorization slot; the gateway must look there too ---- */
  SC.key = {
    dur: 13, still: 13,
    build(svg, api) {
      const START = 40, CHECK = 140, FIN = [609, 252, 0.8], SLOT = [67, 119], EY = 230;
      el("rect", { x: 600, y: 160, width: 170, height: 270, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 685, 202, "Claude API", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      el("rect", { x: 370, y: 160, width: 190, height: 270, rx: 20, fill: "#fff" }, svg);
      const gm = el("rect", { x: 370, y: 160, width: 190, height: 270, rx: 20, fill: MINT, opacity: 0 }, svg);
      el("rect", { x: 370, y: 160, width: 190, height: 270, rx: 20, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, 465, 202, "Gateway", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      el("rect", { x: 380, y: 220, width: 170, height: 34, rx: 17, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      const chk = txt(svg, 465, 241.5, "X-Api-Key", { "text-anchor": "middle", "font-family": MONO, "font-size": 12, "font-weight": 700 });
      el("rect", { x: 400, y: 274, width: 130, height: 136, rx: 14, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 6", opacity: 0.45 }, svg);
      const env = el("g", {}, svg);
      el("rect", { width: 190, height: 140, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, env);
      el("path", { d: "M8 6 L95 30 L182 6", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linejoin": "round", opacity: 0.35 }, env);
      txt(env, 16, 52, "X-Api-Key", { "font-family": MONO, "font-size": 13, "font-weight": 700 });
      el("rect", { x: 14, y: 58, width: 162, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2 }, env);
      txt(env, 15, 104, "Authorization: Bearer", { "font-family": MONO, "font-size": 13, "font-weight": 700 });
      el("rect", { x: 14, y: 110, width: 162, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2 }, env);
      const key = el("g", {}, env);
      el("path", { d: "M-8 0 H30 M19 0 V7 M27 0 V6", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, key);
      el("circle", { cx: -17, cy: 0, r: 9, fill: LIL, stroke: INK, "stroke-width": 2.5 }, key);
      el("circle", { cx: -17, cy: 0, r: 3, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, key);
      const ptr = el("g", {}, svg);
      el("path", { d: "M0 0 H-28", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, ptr);
      el("circle", { cx: -36, cy: 0, r: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, ptr);
      el("path", { d: "M-47 -6 L-57 0 L-47 6 Z", fill: INK, stroke: INK, "stroke-width": 1.5, "stroke-linejoin": "round" }, ptr);
      const note = el("g", {}, svg);
      el("rect", { x: -92, y: -26, width: 184, height: 52, rx: 12, fill: YEL, stroke: INK, "stroke-width": 3 }, note);
      txt(note, 0, 8, "No key found", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      pill(svg, 40, 494, 200, "Fix gateway", SKY, () => api.seek(6.8));
      hint(svg, 262, 528, "Tap Fix gateway", "start");
      return (t) => {
        const r = 1 - seg(t, 0, 0.5);
        let ex, ey, es, eo, kx = 95, ky = SLOT[1];
        if (t < 0.5) { [ex, ey, es] = FIN; eo = r; }
        else {
          const go = io(seg(t, 2.9, 3.9)), pass = io(seg(t, 8.0, 9.4));
          ex = lerp(lerp(START, CHECK, go), FIN[0], pass); ey = lerp(EY, FIN[1], pass) - Math.sin(pass * Math.PI) * 40; es = lerp(1, FIN[2], pass); eo = seg(t, 0.5, 0.9);
          const a = io(seg(t, 1.0, 1.6)), b = io(seg(t, 1.6, 2.0)), c = io(seg(t, 2.0, 2.6));
          kx = 95 + 141 * (a - c); ky = SLOT[0] + (SLOT[1] - SLOT[0]) * b;
        }
        tf(env, ex, ey, es); env.setAttribute("opacity", eo); tf(key, kx, ky);
        const fixK = t < 0.5 ? 1 : io(seg(t, 6.8, 7.4)), out = t < 0.5 ? r : oc(seg(t, 3.9, 4.4));
        ptr.setAttribute("transform", `translate(${370 + 44 * (1 - out)} ${EY + lerp(SLOT[0], SLOT[1], fixK)})`); ptr.setAttribute("opacity", out);
        const auth = t < 0.25 || t >= 7.1;
        chk.textContent = auth ? "Authorization: Bearer" : "X-Api-Key";
        chk.setAttribute("opacity", t < 0.25 ? 1 - t * 4 : t < 0.5 ? (t - 0.25) * 4 : t < 6.8 ? 1 : t < 7.1 ? 1 - (t - 6.8) / 0.3 : seg(t, 7.1, 7.4));
        gm.setAttribute("opacity", t < 0.5 ? r : oc(seg(t, 7.4, 7.8)));
        const nk = t < 0.5 ? 0 : seg(t, 4.5, 4.9) * (1 - seg(t, 6.8, 7.1));
        tf(note, 440, 118, 0.6 + 0.4 * ob(seg(t, 4.5, 4.9)), -3); note.setAttribute("opacity", nk);
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
