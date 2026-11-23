/* Bright coded scenes for "Gemini 4 Hydrogen". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  /* one text line made of parts, each [words, font]; a name is set in the mono font */
  const rich = (p, x, y, parts, a = {}) => { const n = txt(p, x, y, "", a); parts.forEach(([s, f]) => { const sp = el("tspan", f === MONO ? { "font-family": MONO, "font-weight": 700 } : {}, n); sp.textContent = s; }); return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const tw = (n) => n.getComputedTextLength() || n.textContent.length * parseFloat(n.getAttribute("font-size")) * 0.6;
  const fit = (n, max) => { const w = tw(n); if (w <= max) return w; n.setAttribute("font-size", (parseFloat(n.getAttribute("font-size")) * max) / w); return max; };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* focus ring and touch target in one: clear fill, dashed ink outline shown on keyboard focus */
  const ring = (g, x, y, width, height, rx) => el("rect", { x, y, width, height, rx, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "5 6" }, g);
  const hint = (svg, x, y, s, anchor) => txt(svg, x, y, s, { "text-anchor": anchor, "font-size": 17, "font-weight": 500, fill: MUTE });
  const can = (p, col) => {
    const g = el("g", {}, p);
    const body = el("rect", { x: -18, y: -26, width: 36, height: 52, rx: 9, fill: col, stroke: INK, "stroke-width": 3 }, g);
    el("rect", { x: -16.5, y: -5, width: 33, height: 11, fill: "#fff" }, g);
    el("path", { d: "M-11 -18 H11", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
    return { g, body };
  };

  const SC = {};

  /* ---- 1. a vending machine with three priced buttons ---- */
  SC.vendingmachine = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const ROWS = [118, 218, 318], CANS = [SKY, BLUE, MINT];
      const NAMES = [["Hydrogen", "$1.50 in $7.50 out"], ["Argon", "$2.00 in $10.00 out"], ["Carbon", "$2.00 in $10.00 out"]];
      el("rect", { x: 36, y: 36, width: 516, height: 528, rx: 30, fill: LIL, stroke: INK, "stroke-width": 4 }, svg);
      el("rect", { x: 62, y: 62, width: 200, height: 330, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const front = ROWS.map((cy, r) => {
        el("path", { d: `M62 ${cy + 34} H262`, stroke: INK, "stroke-width": 3 }, svg);
        return [102, 162, 222].map((cx) => { const c = can(svg, CANS[r]); tf(c.g, cx, cy + 8); return c.g; })[1];
      });
      el("rect", { x: 62, y: 428, width: 240, height: 108, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M78 454 H286", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "2 9" }, svg);
      el("rect", { x: 352, y: 410, width: 176, height: 124, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 398, y: 438, width: 84, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      el("rect", { x: 384, y: 478, width: 112, height: 32, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      let tap = null;
      const btns = NAMES.map(([n, p], r) => {
        const cy = ROWS[r], g = el("g", {}, svg);
        ring(g, 274, cy - 48, 262, 96, 22);
        const body = el("g", {}, g);
        el("rect", { x: 282, y: cy - 40, width: 246, height: 80, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, body);
        const glow = el("circle", { cx: 306, cy, r: 15, fill: "none", stroke: YEL, "stroke-width": 6 }, body);
        const lamp = el("circle", { cx: 306, cy, r: 9, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
        fit(txt(body, 330, cy - 6, n, { "font-family": MONO, "font-size": 21, "font-weight": 700 }), 184);
        fit(txt(body, 330, cy + 23, p, { "font-size": 19, "font-weight": 600 }), 184);
        button(g, `${n}: ${p}`, () => { tap = { r, at: api.now() }; api.burst(2.7); });
        return { body, glow, lamp };
      });
      const card = el("g", {}, svg);
      el("rect", { x: 572, y: 182, width: 206, height: 172, rx: 18, fill: YEL, stroke: INK, "stroke-width": 3 }, card);
      fit(txt(card, 675, 226, "From 1 Dec 2026:", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), 178);
      fit(txt(card, 675, 282, "$4.00 in", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 }), 178);
      fit(txt(card, 675, 324, "$20.00 out", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 }), 178);
      const links = el("path", { d: "M570 218 H538 M570 318 H538", stroke: INK, "stroke-width": 3, "stroke-dasharray": "2 8", "stroke-linecap": "round" }, svg);
      hint(svg, 778, 572, "Tap a button to drop a can", "end");
      const can0 = can(svg, SKY), canX = can(svg, SKY);
      const fall = (c, k, y0, x1, land) => tf(c.g, 162 + (x1 - 162) * k, y0 + (498 - y0) * k * k - Math.sin(land * Math.PI) * 12, 1, 90 * oc(k));
      const press = (r, k) => tf(btns[r].body, 0, 4 * Math.sin(cl(k) * Math.PI));
      return (t, now) => {
        btns.forEach((b, r) => { const on = seg(t, 0.3 + r * 0.25, 0.5 + r * 0.25); b.glow.setAttribute("opacity", on); b.lamp.setAttribute("fill", on > 0.5 ? YEL : "#fff"); tf(b.body, 0, 0); });
        press(0, seg(t, 1.2, 1.5));
        can0.g.setAttribute("opacity", t >= 1.5 ? 1 : 0);
        fall(can0, seg(t, 1.5, 2.25), ROWS[0] + 8, 182, seg(t, 2.25, 2.6));
        const shown = front.map((f, r) => (r === 0 && t >= 1.5 ? 0 : 1));
        const c = ob(seg(t, 3.4, 4.3));
        tf(card, 240 * (1 - c), 0); card.setAttribute("opacity", seg(t, 3.4, 3.6));
        links.setAttribute("opacity", seg(t, 4.3, 4.7));
        const s = tap ? now - tap.at : 99;
        if (s < 2.7) {
          const r = tap.r;
          press(r, s / 0.3);
          canX.body.setAttribute("fill", CANS[r]);
          canX.g.setAttribute("opacity", s < 0.25 ? 0 : 1 - seg(s, 2.1, 2.6));
          fall(canX, seg(s, 0.25, 0.95), ROWS[r] + 8, 246, seg(s, 0.95, 1.3));
          if (r > 0 || t < 1.5) shown[r] = s < 0.25 ? 1 : seg(s, 2.2, 2.6);
        } else canX.g.setAttribute("opacity", 0);
        front.forEach((f, r) => f.setAttribute("opacity", shown[r]));
      };
    },
  };

  /* ---- 2. a key ring with seven tagged keys ---- */
  SC.keyring = {
    dur: 8.5, still: 8.5,
    build(svg, api) {
      const C = [400, 112], R = 38, D = Math.PI / 180;
      hint(svg, 36, 50, "Tap a key to swing the ring again", "start");
      el("rect", { x: 364, y: 20, width: 72, height: 22, rx: 11, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M400 42 V72 q0 9 -8 8", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, svg);
      const rig = el("g", {}, svg);
      const A = [-78, -52, -26, 0, 26, 52, 78], LEN = [196, 210, 214, 250, 214, 210, 196];
      const TAGS = ["Gemini app", "Gemini API", "Google Sheets", "AI Studio", "Gemini for business", "Antigravity", "Google Search"];
      const COLS = [SKY, BLUE, LIL, MINT, YEL, SKY, LIL];
      let swingAt = -99;
      const keys = A.map((a, i) => {
        const g = el("g", {}, rig), x = C[0], y0 = C[1] + R, L = LEN[i];
        const k = el("g", { transform: `rotate(${-a} ${C[0]} ${C[1]})` }, g);
        const str = el("path", { d: `M${x} ${y0 + 86} V${C[1] + L}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, k);
        el("path", { d: `M${x - 5} ${y0 + 10} V${y0 + 88} H${x + 5} V${y0 + 86} H${x + 13} V${y0 + 78} H${x + 5} V${y0 + 72} H${x + 13} V${y0 + 64} H${x + 5} V${y0 + 10} Z`, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, k);
        el("circle", { cx: x, cy: y0, r: 15, fill: YEL, stroke: INK, "stroke-width": 3 }, k);
        el("circle", { cx: x, cy: y0, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, k);
        const P = [C[0] + L * Math.sin(a * D), C[1] + L * Math.cos(a * D)];
        const tag = el("g", {}, g);
        const rg = ring(tag, 0, 0, 0, 0, 16), box = el("rect", { rx: 12, fill: COLS[i], stroke: INK, "stroke-width": 3 }, tag);
        el("circle", { cx: P[0], cy: P[1], r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
        const lab = txt(tag, 0, 0, TAGS[i], { "font-family": MONO, "font-size": 18, "font-weight": 700 });
        const w = fit(lab, 240);
        let bx, by, bw = w + 44, bh = 44;
        if (a < 0) { bx = P[0] + 16 - bw; by = P[1] - 22; lab.setAttribute("x", bx + 14); lab.setAttribute("y", P[1] + 6); }
        else if (a > 0) { bx = P[0] - 16; by = P[1] - 22; lab.setAttribute("x", P[0] + 14); lab.setAttribute("y", P[1] + 6); }
        else { bw = w + 32; bh = 62; bx = P[0] - bw / 2; by = P[1] - 14; lab.setAttribute("x", P[0]); lab.setAttribute("y", P[1] + 34); lab.setAttribute("text-anchor", "middle"); }
        Object.entries({ x: bx, y: by, width: bw, height: bh }).forEach(([n, v]) => box.setAttribute(n, v));
        Object.entries({ x: bx - 7, y: by - 7, width: bw + 14, height: bh + 14 }).forEach(([n, v]) => rg.setAttribute(n, v));
        button(g, `${TAGS[i]} key`, () => { swingAt = api.now(); api.burst(4); });
        return { tag, str };
      });
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: INK, "stroke-width": 10 }, rig);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: YEL, "stroke-width": 4 }, rig);
      el("rect", { x: 370, y: 452, width: 60, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: "M400 470 V505 q0 9 -8 8", stroke: INK, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, svg);
      const note = el("g", {}, svg);
      const nb = el("rect", { y: 498, height: 64, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "7 6" }, note);
      el("circle", { cx: 400, cy: 512, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2 }, note);
      const nw = fit(rich(note, 400, 547, [["Not listed: ", SANS], ["Gemini CLI, Vertex AI", MONO]], { "text-anchor": "middle", "font-size": 19, "font-weight": 600 }), 600);
      nb.setAttribute("x", 400 - (nw + 48) / 2); nb.setAttribute("width", nw + 48);
      return (t, now) => {
        const s = now - swingAt;
        let th = 64 * Math.exp(-1.25 * t) * Math.cos(3.3 * t) * (1 - seg(t, 3.2, 4.6));
        if (s >= 0 && s < 4) th += 16 * Math.exp(-1.1 * s) * Math.sin(3.6 * s) * (1 - seg(s, 3, 4));
        rig.setAttribute("transform", `rotate(${th} 400 74)`);
        rig.setAttribute("opacity", seg(t, 0, 0.3));
        keys.forEach((k, i) => {
          const a = 1.2 + i * 0.45, q = seg(t, a, a + 0.5), o = seg(q, 0, 0.3);
          k.tag.setAttribute("transform", `translate(0 ${-20 * (1 - ob(q))})`); k.tag.setAttribute("opacity", o); k.str.setAttribute("opacity", o);
        });
        const n = seg(t, 4.9, 5.5);
        note.setAttribute("opacity", seg(n, 0, 0.4)); note.setAttribute("transform", `translate(0 ${-24 * (1 - ob(n))})`);
      };
    },
  };

  /* ---- 3. a zipline between the planner and Hydrogen ---- */
  SC.zipline = {
    dur: 11, still: 8.4,
    build(svg, api) {
      el("path", { d: "M40 540 H760", stroke: SOFT, "stroke-width": 18, "stroke-linecap": "round" }, svg);
      [170, 630].forEach((x) => el("rect", { x: x - 11, y: 150, width: 22, height: 392, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg));
      const d = "M170 166 Q400 266 630 186";
      el("path", { d, stroke: SOFT, "stroke-width": 10, fill: "none", "stroke-linecap": "round" }, svg);
      const cable = el("path", { d, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, svg), L = cable.getTotalLength();
      [[170, 166], [630, 186]].forEach(([x, y]) => { el("circle", { cx: x, cy: y, r: 13, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg); el("circle", { cx: x, cy: y, r: 4, fill: INK }, svg); });
      const sign = (x, l1, l2, col) => {
        const g = el("g", {}, svg), r = el("rect", { y: 384, height: 82, rx: 16, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const w = Math.max(fit(rich(g, x, 417, l1, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), 230), fit(rich(g, x, 449, l2, { "text-anchor": "middle", "font-size": 19, "font-weight": 600 }), 230));
        r.setAttribute("x", x - w / 2 - 20); r.setAttribute("width", w + 40);
      };
      sign(170, [["Planner:", SANS]], [["Carbon", MONO], [" or ", SANS], ["Argon", MONO]], LIL);
      sign(630, [["Hydrogen", MONO], [":", SANS]], [["edits and tests", SANS]], MINT);
      const fail = el("g", {}, svg);
      const tail = el("path", { d: "M544 114 L556 134 L568 114", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, fail);
      const fb = el("rect", { y: 66, height: 50, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, fail);
      const fw = fit(txt(fail, 556, 99, "Test failed twice", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 }), 260);
      fb.setAttribute("x", 556 - fw / 2 - 22); fb.setAttribute("width", fw + 44); tail.setAttribute("opacity", 1);
      const lines = [0, 1, 2].map(() => el("path", { stroke: MUTE, "stroke-width": 3, "stroke-linecap": "round", fill: "none" }, svg));
      const bk = el("g", {}, svg);
      ring(bk, -80, -18, 160, 150, 20);
      el("circle", { r: 11, fill: "#fff", stroke: INK, "stroke-width": 3 }, bk);
      el("path", { d: "M0 11 V16 M-66 16 H66 M-64 16 V64 M64 16 V64", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, bk);
      const cards = [["Plan", "#fff"], ["New plan", MINT]].map(([s, col]) => {
        const g = el("g", {}, bk);
        el("rect", { x: -54, y: 22, width: 108, height: 48, rx: 10, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        fit(txt(g, 0, 52, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }), 90);
        return g;
      });
      el("path", { d: "M-68 62 H68 L54 120 H-54 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bk);
      el("path", { d: "M-60 82 H60 M-56 101 H56", stroke: INK, "stroke-width": 2, "stroke-dasharray": "6 6" }, bk);
      button(bk, "Send the basket again", () => api.seek(0.8));
      hint(svg, 400, 586, "Tap the basket to send it again", "middle");
      const U = (t) => (t < 3.9 ? 0.2 + 0.6 * io(seg(t, 0.8, 3)) : t < 7 ? 0.8 - 0.6 * io(seg(t, 3.9, 6)) : 0.2 + 0.6 * io(seg(t, 7, 9.6)));
      return (t) => {
        const u = U(t), v = (u - U(Math.max(0, t - 0.06))) / 0.06, p = cable.getPointAtLength(L * u);
        tf(bk, p.x, p.y, 1, cl(v * 9, -7, 7));
        const out = seg(t, 6.1, 6.4), inn = ob(seg(t, 6.4, 6.8));
        cards[0].setAttribute("opacity", 1 - out); cards[0].setAttribute("transform", `translate(0 ${34 * out})`);
        cards[1].setAttribute("opacity", seg(t, 6.4, 6.55)); cards[1].setAttribute("transform", `translate(0 ${34 * (1 - inn)})`);
        const f = ob(seg(t, 3.1, 3.6));
        fail.setAttribute("opacity", t >= 3.1 ? 1 : 0); fail.setAttribute("transform", `translate(556 134) scale(${Math.max(0.001, f)}) translate(-556 -134)`);
        const sp = Math.abs(v), dir = v >= 0 ? 1 : -1, len = 34 * cl(sp / 0.5);
        lines.forEach((n, i) => {
          const x0 = p.x - dir * (90 + i * 8), y = p.y + 44 + i * 22;
          n.setAttribute("d", `M${x0} ${y} H${x0 - dir * len}`); n.setAttribute("opacity", len < 8 ? 0 : cl((sp - 0.05) / 0.3));
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3, still: 3,
    build(svg) {
      const pill = el("rect", { x: 64, y: 62, height: 42, rx: 21, fill: MINT, stroke: INK, "stroke-width": 2.5 }, svg);
      pill.setAttribute("width", tw(txt(svg, 86, 90, "New model", { "font-size": 20, "font-weight": 700 })) + 44);
      const line = el("path", { stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      const w = fit(txt(svg, 62, 194, "Gemini 4 Hydrogen", { "font-size": 76, "font-weight": 700 }), 720);
      line.setAttribute("d", `M66 224 H${62 + w}`);
      fit(txt(svg, 64, 278, "Price vs Argon, where to use it, when to pick it", { "font-size": 27, "font-weight": 500, fill: MUTE }), 832);
      txt(svg, 64, 320, "Checked 13 Nov 2026", { "font-size": 20, "font-weight": 600, fill: CAP });
      const c = can(svg, SKY); tf(c.g, 862, 108, 1.5, 14);
      [[796, 72, 8, YEL], [916, 172, 7, LIL], [918, 56, 6, MINT], [806, 168, 5, BLUE]].forEach(([cx, cy, r, fill]) => el("circle", { cx, cy, r, fill, stroke: INK, "stroke-width": 2 }, svg));
      const T = [["Hydrogen", "$1.50 in", SKY], ["Argon", "$2.00 in", BLUE], ["Carbon", "$2.00 in", LIL]];
      const tiles = T.map(([n, p, col], i) => {
        const g = el("g", {}, svg), x = 64 + i * 284;
        el("rect", { x, y: 382, width: 260, height: 104, rx: 18, fill: col, stroke: INK, "stroke-width": 3 }, g);
        fit(txt(g, x + 24, 424, n, { "font-family": MONO, "font-size": 24, "font-weight": 700 }), 212);
        fit(txt(g, x + 24, 466, p, { "font-size": 30, "font-weight": 700 }), 212);
        return g;
      });
      return (t) => tiles.forEach((g, i) => { const a = 0.2 + i * 0.45, k = ob(seg(t, a, a + 0.6)); g.setAttribute("transform", `translate(${90 * (1 - k)} 0)`); g.setAttribute("opacity", seg(t, a, a + 0.2)); });
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
    /* reduced motion: hold the still; a tap plays its short reply (burst) or one pass back to the still (seek), then holds again */
    let off = 0, raf = 0, seen = false, held = calm, until = 0, busy = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); if (calm && !held && now >= until) held = true; draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && (!held || clock() < busy)) raf = requestAnimationFrame(tick); };
    const api = {
      now: clock,
      seek: (s) => { off = s - clock(); held = false; until = clock() + (sc.still > s ? sc.still - s : sc.dur - s + sc.still); tick(); },
      poke: () => { held = false; until = clock() + sc.dur; tick(); },
      burst: (d) => { busy = clock() + d; tick(); },
    };
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
