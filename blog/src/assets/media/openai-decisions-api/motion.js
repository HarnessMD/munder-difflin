/* Bright coded scenes for "OpenAI Decisions API". Vanilla JS, no library.
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
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };
  /* a pill that sizes itself to its text, centred on 0,0 */
  const chip = (p, s, fill, a = {}) => {
    const g = el("g", {}, p), r = el("rect", { y: -20, height: 40, rx: 20, fill, stroke: INK, "stroke-width": 2.5 }, g), t = txt(g, 0, 7, s, Object.assign({ "text-anchor": "middle", "font-size": 20, "font-weight": 700 }, a));
    const w = t.getComputedTextLength() + 36; r.setAttribute("x", -w / 2); r.setAttribute("width", w);
    return g;
  };
  const show = (n, k) => n.setAttribute("opacity", k <= 0.01 ? 0 : 1);

  const SC = {};

  /* ---- 1. marbles roll down a chute and drop through one of three trapdoors ---- */
  SC.chute = {
    dur: 11.4, still: 9.2,
    build(svg, api) {
      txt(svg, 44, 62, "Three types of question", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a cup", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const X = [170, 400, 630], HALF = 30, R = 17, SPEED = 250, X0 = 52, REST = 322;
      const sy = (x) => 138 + (x - 50) * 0.1;
      const COL = [YEL, LIL, MINT], TYPE = ["predicate", "choice", "score"];
      const TAG = [["probability"], ["one of your", "supplied values"], ["score"]];
      const LINE = ["predicate: check a condition, get a probability from 0 to 1", "choice: select one option, get one of your supplied values", "score: rate an input against ordered levels, get a score"];
      let d = `M40 ${sy(40) - 34} V${sy(40)} `, from = 40;
      X.forEach((x) => { d += `M${from} ${sy(from)} L${x - HALF - 8} ${sy(x - HALF - 8)} `; from = x + HALF + 8; });
      d += `M${from} ${sy(from)} L716 ${sy(716)} V${sy(716) - 30}`;
      el("path", { d, stroke: INK, "stroke-width": 6, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, svg);
      let user = null;
      const gates = X.map((x, i) => {
        const flap = el("g", {}, svg);
        el("rect", { x: -3, y: -6, width: HALF * 2 + 6, height: 12, rx: 6, fill: COL[i], stroke: INK, "stroke-width": 3 }, flap);
        el("circle", { r: 7, fill: "#fff", stroke: INK, "stroke-width": 3 }, flap);
        const g = el("g", {}, svg);
        el("rect", { x: x - 108, y: 252, width: 216, height: 232, rx: 22, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        el("path", { d: `M${x - 56} 262 L${x - 40} 342 H${x + 40} L${x + 56} 262`, fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        txt(g, x, 380, TYPE[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
        const tag = el("rect", { x: x - 98, y: 398, width: 196, height: 76, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        TAG[i].forEach((s, j) => txt(g, x, TAG[i].length > 1 ? 430 + j * 26 : 443, s, { "text-anchor": "middle", "font-size": 20, "font-weight": 700 }));
        button(g, LINE[i], () => { user = { i, t0: api.now() }; api.poke(); });
        return { flap, tag, x };
      });
      const marble = (col) => { const g = el("g", { "pointer-events": "none" }, svg); el("circle", { r: R, fill: col, stroke: INK, "stroke-width": 3 }, g); el("circle", { cx: 6, cy: -6, r: 4, fill: "#fff" }, g); return g; };
      const ms = X.map((_, i) => marble(COL[i])), um = marble(SKY);
      const cap = strip(svg, 506, 720);
      /* where marble i is, u seconds after launch */
      const place = (g, i, u) => {
        const x = X[i], tr = (x - X0) / SPEED;
        if (u < 0) { g.setAttribute("opacity", 0); return 0; }
        g.setAttribute("opacity", seg(u, 0, 0.15));
        if (u < tr) { const mx = X0 + u * SPEED; tf(g, mx, sy(mx) - R - 4, 1, u * SPEED * 3.2); return 0; }
        const f = seg(u, tr, tr + 0.42), top = sy(x) - R - 4, b = Math.sin(seg(u, tr + 0.42, tr + 0.75) * Math.PI) * -12;
        tf(g, x, top + (REST - top) * f * f + b, 1, tr * SPEED * 3.2); return f >= 1 ? 1 : 0;
      };
      const open = (i, u) => { const tr = (X[i] - X0) / SPEED; return io(seg(u, tr - 0.3, tr - 0.02)) - io(seg(u, tr + 0.5, tr + 0.85)); };
      return (t, now) => {
        const out = 1 - seg(t, 10.5, 11);
        let last = -1; const lit = [0, 0, 0], op = [0, 0, 0];
        ms.forEach((g, i) => { const u = t - (0.6 + i * 2.5); if (place(g, i, u)) { lit[i] = 1; last = i; } op[i] = open(i, u); g.setAttribute("opacity", +g.getAttribute("opacity") * out); });
        let pin = -1;
        if (user) {
          const u = now - user.t0;
          if (u > 5) { user = null; um.setAttribute("opacity", 0); }
          else { const landed = place(um, user.i, u); um.setAttribute("opacity", +um.getAttribute("opacity") * (1 - seg(u, 3, 3.5))); op[user.i] = Math.max(op[user.i], open(user.i, u)); if (landed) lit[user.i] = 1; pin = user.i; }
        } else um.setAttribute("opacity", 0);
        gates.forEach((k, i) => {
          k.flap.setAttribute("transform", `translate(${k.x - HALF} ${sy(k.x - HALF)}) rotate(${5.7 + 78 * op[i]})`);
          k.tag.setAttribute("fill", lit[i] && (out > 0.5 || pin === i) ? COL[i] : "#fff");
        });
        cap.textContent = pin >= 0 ? LINE[pin] : last < 0 || t >= 10.5 ? "Each question has one of three types" : t > 8 ? "predicate, choice or score: each returns a typed answer" : LINE[last];
      };
    },
  };

  /* ---- 2. a parking meter: input tokens move the display, output tokens fall straight through ---- */
  SC.meter = {
    dur: 11.6, still: 9.6,
    build(svg, api) {
      txt(svg, 44, 62, "You pay only for input tokens", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "tap a slot", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      txt(svg, 44, 98, "gpt-6-luna on /v1/decisions. OpenAI's guide, 7 Oct 2026", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const IX = 301, OX = 515, TOP = 190, BOT = 410;
      const tok = (col) => el("rect", { x: -11, y: -11, width: 22, height: 22, rx: 6, fill: col, stroke: INK, "stroke-width": 2.5, "pointer-events": "none" }, svg);
      const ins = Array.from({ length: 5 }, () => tok(SKY)), uin = tok(SKY);
      /* pole and base */
      el("rect", { x: 346, y: BOT - 6, width: 28, height: 92, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 276, y: 482, width: 168, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      /* head */
      el("rect", { x: 140, y: TOP + 10, width: 460, height: BOT - TOP, rx: 40, fill: LIL }, svg);
      el("rect", { x: 130, y: TOP, width: 460, height: BOT - TOP, rx: 40, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: IX - 34, y: TOP - 6, width: 68, height: 14, rx: 7, fill: INK }, svg);
      el("rect", { x: 156, y: 216, width: 290, height: 170, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const segs = Array.from({ length: 5 }, (_, i) => el("rect", { x: 175 + i * 52, y: 232, width: 44, height: 20, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg));
      const price = txt(svg, IX, 322, "$0.10", { "text-anchor": "middle", "font-family": MONO, "font-size": 54, "font-weight": 700 });
      const unit = txt(svg, IX, 364, "per 1M input tokens", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      /* the clear tube under the output slot */
      el("rect", { x: OX - 34, y: TOP - 8, width: 68, height: BOT - TOP + 34, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M${OX - 20} ${TOP + 26} V${BOT - 6} M${OX + 20} ${TOP + 26} V${BOT - 6}`, stroke: SOFT, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": "2 12" }, svg);
      const outs = Array.from({ length: 4 }, () => tok(LIL)), uout = tok(LIL);
      el("path", { d: `M${OX - 62} 462 V492 H${OX + 62} V462`, fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      const free = chip(svg, "No charge", MINT);
      let user = null;
      const slot = (x, label, right, line) => {
        const g = el("g", {}, svg), tx = right ? x + 52 : x - 52;
        const r = el("rect", { y: 116, height: 52, rx: 16, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, class: "mg-ring" }, g);
        const t = txt(g, tx, 151, label, { "text-anchor": right ? "start" : "end", "font-family": MONO, "font-size": 26, "font-weight": 700 });
        const w = t.getComputedTextLength();
        r.setAttribute("x", right ? x - 30 : tx - w - 12); r.setAttribute("width", w + 94);
        el("path", { d: `M${x} 126 V152 M${x - 9} 143 L${x} 153 L${x + 9} 143`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round", opacity: 0.25 }, g);
        button(g, line, () => { user = { out: right, t0: api.now() }; api.poke(); });
      };
      slot(IX, "input", false, "Input: $0.10 per 1M tokens on /v1/decisions");
      slot(OX, "output", true, "Output: no charge on /v1/decisions");
      const cap = strip(svg, 516, 720);
      const IN = (i) => 0.8 + i * 0.65, OUT = (i) => 5.4 + i * 0.7, PX = [-37.5, -12.5, 12.5, 37.5];
      const dropIn = (n, u) => { const f = seg(u, 0, 0.45); tf(n, IX, 104 + 110 * f * f, 1, u * 200); n.setAttribute("opacity", u < 0 ? 0 : seg(u, 0, 0.1)); };
      const dropOut = (n, u, x, y) => { const f = seg(u, 0, 0.8), e = f * f; tf(n, OX + (x - OX) * seg(f, 0.8, 1), 104 + (y - 104) * e + Math.sin(seg(u, 0.8, 1.05) * Math.PI) * -7, 1, f >= 1 ? 0 : u * 260); n.setAttribute("opacity", u < 0 ? 0 : seg(u, 0, 0.1)); };
      return (t, now) => {
        const out = 1 - seg(t, 10.7, 11.2);
        ins.forEach((n, i) => dropIn(n, t - IN(i)));
        let on = 0;
        segs.forEach((s, i) => { const k = t > IN(i) + 0.4 && out > 0.5; if (k) on++; s.setAttribute("fill", k ? MINT : SOFT); });
        const full = on === 5, pop = Math.sin(seg(t, IN(4) + 0.4, IN(4) + 0.75) * Math.PI) * 0.08;
        price.setAttribute("opacity", full ? 1 : 0.22); unit.setAttribute("opacity", full ? 1 : 0.4);
        price.setAttribute("transform", `translate(${IX} 304) scale(${1 + pop}) translate(${-IX} -304)`);
        let landed = 0;
        outs.forEach((n, i) => { const u = t - OUT(i); dropOut(n, u, OX + PX[i], 478); n.setAttribute("opacity", +n.getAttribute("opacity") * out); if (u > 0.8) landed++; });
        const fk = ob(seg(t, OUT(3) + 0.9, OUT(3) + 1.3)) * out;
        tf(free, 672, 474, cl(fk, 0, 1.2)); show(free, fk);
        let pin = 0;
        uin.setAttribute("opacity", 0); uout.setAttribute("opacity", 0);
        if (user) {
          const u = now - user.t0;
          if (u > 4) user = null;
          else if (user.out) { dropOut(uout, u, OX, 454); uout.setAttribute("opacity", +uout.getAttribute("opacity") * (1 - seg(u, 2.4, 2.8))); pin = 2; }
          else { dropIn(uin, u); pin = 1; }
        }
        cap.textContent = pin === 1 ? "Input: $0.10 per 1M tokens on /v1/decisions" : pin === 2 ? "Output: no charge on /v1/decisions" : t > OUT(0) + 0.6 && t < 10.7 ? "Output: no charge. The display does not move." : full ? "Input: $0.10 per 1M tokens on /v1/decisions" : "Regional premiums and long-context multipliers apply";
      };
    },
  };

  /* ---- 3. three picture cards meet a turnstile: one passes, two are stopped ---- */
  SC.turnstile = {
    dur: 12, still: 9.8,
    build(svg) {
      txt(svg, 44, 62, "Images: inline only", { "font-size": 32, "font-weight": 700 });
      txt(svg, 756, 62, "in beta", { "text-anchor": "end", "font-size": 20, fill: MUTE, "font-weight": 500 });
      const CX = 400, CY = 286;
      el("path", { d: "M44 459 H756", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      el("rect", { x: CX - 62, y: 440, width: 124, height: 18, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: CX - 28, y: 150, width: 56, height: 296, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const card = (label, mono) => {
        const g = el("g", {}, svg);
        el("rect", { x: -119, y: -49, width: 250, height: 110, rx: 18, fill: SKY }, g);
        el("rect", { x: -125, y: -55, width: 250, height: 110, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -40, y: -42, width: 80, height: 50, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        el("circle", { cx: 22, cy: -26, r: 7, fill: YEL, stroke: INK, "stroke-width": 2 }, g);
        el("path", { d: "M-34 4 L-14 -20 L0 -6 L10 -14 L30 4", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        txt(g, 0, 38, label, { "text-anchor": "middle", "font-family": mono ? MONO : SANS, "font-size": 20, "font-weight": 700 });
        return g;
      };
      const A = card("inline base64 data URL"), B = card("hosted image URL"), C = card("file_id", true);
      const arms = el("g", {}, svg);
      [0, 120, 240].forEach((a) => el("rect", { x: -9, y: -98, width: 18, height: 98, rx: 9, fill: YEL, stroke: INK, "stroke-width": 3, transform: `rotate(${a})` }, arms));
      el("circle", { cx: CX, cy: CY, r: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const hub = el("circle", { cx: CX, cy: CY, r: 11, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const ok = chip(svg, "passes", MINT), no = chip(svg, "not supported", SOFT);
      const cap = strip(svg, 510, 740);
      const LX = 240, HOME = 170, PASS = 630;
      const stopped = (g, t, a, y) => {
        const arrive = io(seg(t, a, a + 0.8)), jig = t > a + 0.8 && t < a + 1.4 ? Math.sin((t - a - 0.8) * 32) * 5 * (1 - (t - a - 0.8) / 0.6) : 0, back = io(seg(t, a + 1.4, a + 2.2));
        tf(g, -150 + (LX + 150) * arrive + jig + (HOME - LX) * back, CY + (y - CY) * back);
        g.setAttribute("opacity", t < a ? 0 : 1);
        return jig;
      };
      return (t) => {
        const out = 1 - seg(t, 11.2, 11.7);
        const a1 = io(seg(t, 0.5, 1.3)), p1 = io(seg(t, 1.3, 2.5));
        tf(A, -150 + (LX + 150) * a1 + (PASS - LX) * p1, CY); A.setAttribute("opacity", (t < 0.5 ? 0 : 1) * out);
        const j2 = stopped(B, t, 3.4, 196), j3 = stopped(C, t, 6, 376), j = j2 || j3;
        B.setAttribute("opacity", +B.getAttribute("opacity") * out); C.setAttribute("opacity", +C.getAttribute("opacity") * out);
        arms.setAttribute("transform", `translate(${CX} ${CY}) rotate(${-90 + 120 * p1 + j * 0.9})`);
        hub.setAttribute("fill", p1 > 0 && p1 < 1 ? MINT : j ? INK : SOFT);
        const k1 = ob(seg(t, 2.5, 2.9)) * out, k2 = ob(seg(t, 5.5, 5.9)) * out;
        tf(ok, PASS, 196, cl(k1, 0, 1.2)); show(ok, k1);
        tf(no, HOME, 286, cl(k2, 0, 1.2)); show(no, k2);
        cap.textContent = t < 3.4 || t >= 11.2 ? "Images must be inline base64 data URLs" : t < 8.4 ? "Hosted image URLs and file_id inputs are not supported" : "Images must be inline base64 data URLs. OpenAI's guide, 7 Oct 2026";
      };
    },
  };

  /* ---- 4. a thermometer with three marks: the probabilities pull the liquid to 1.1 ---- */
  SC.thermometer = {
    dur: 11.4, still: 9,
    build(svg) {
      txt(svg, 44, 62, "How a score is built", { "font-size": 32, "font-weight": 700 });
      txt(svg, 44, 98, "The illustrative example in OpenAI's guide", { "font-size": 20, "font-weight": 500, fill: MUTE });
      const TX = 206, Y0 = 408, STEP = 112, BY = 456, LV = (v) => Y0 - v * STEP;
      const ROW = [["cosmetic", 0.1, SKY], ["workaround available", 0.7, YEL], ["fully blocked", 0.2, LIL]];
      el("path", { d: `M${TX - 18} ${BY - 26} V142 a18 18 0 0 1 36 0 V${BY - 26} a32 32 0 1 1 -36 0 Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, svg);
      el("circle", { cx: TX, cy: BY, r: 22, fill: BLUE }, svg);
      const liq = el("rect", { x: TX - 9, width: 18, rx: 9, fill: BLUE }, svg);
      const rows = ROW.map(([name, p, col], i) => {
        const y = LV(i), w = p * 520;
        el("path", { d: `M${TX + 18} ${y} H${TX + 40}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
        txt(svg, TX + 50, y + 9, String(i), { "font-family": MONO, "font-size": 26, "font-weight": 700 });
        txt(svg, TX + 84, y - 8, name, { "font-size": 22, "font-weight": 700 });
        const bar = el("rect", { x: TX + 84, y: y + 4, height: 24, rx: 8, fill: col, stroke: INK, "stroke-width": 2.5 }, svg);
        const val = txt(svg, 0, y + 24, p.toFixed(1), { "font-family": MONO, "font-size": 22, "font-weight": 700 });
        return { bar, val, w, a: 0.8 + i * 1.1 };
      });
      const flag = el("g", {}, svg);
      el("path", { d: "M-140 -34 H-48 a10 10 0 0 1 10 10 V-10 L-22 0 L-38 10 V24 a10 10 0 0 1 -10 10 H-140 a10 10 0 0 1 -10 -10 V-24 a10 10 0 0 1 10 -10 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, flag);
      txt(flag, -94, -8, "score", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      txt(flag, -94, 22, "1.1", { "text-anchor": "middle", "font-family": MONO, "font-size": 28, "font-weight": 700 });
      const cap = strip(svg, 516, 720);
      return (t) => {
        const out = 1 - seg(t, 10.5, 11);
        rows.forEach((r) => { const k = oc(seg(t, r.a, r.a + 0.6)) * out, w = Math.max(r.w * k, 0.01); r.bar.setAttribute("width", w); show(r.bar, k); r.val.setAttribute("x", TX + 84 + w + 12); r.val.setAttribute("opacity", seg(t, r.a + 0.45, r.a + 0.7) * out); });
        const u = t - 4.4, rise = u <= 0 ? 0 : (1 - Math.exp(-4 * u) * Math.cos(5 * u)) * out;
        const top = BY - (BY - LV(1.1)) * rise;
        liq.setAttribute("y", top - 9); liq.setAttribute("height", BY - top + 9);
        const fk = ob(seg(t, 6, 6.4)) * out;
        tf(flag, TX - 18, LV(1.1), cl(fk, 0, 1.2)); show(flag, fk);
        cap.textContent = t < 4.4 || t >= 10.5 ? "Three levels, numbered from 0, each with a probability" : "0 × 0.1 + 1 × 0.7 + 2 × 0.2 = 1.1 in the guide's illustrative example";
      };
    },
  };

  /* ---- title card, 16 by 9: three desk bells, one being rung ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      txt(svg, 64, 92, "Concepts", { "font-family": MONO, "font-size": 24, "font-weight": 700, fill: MUTE });
      txt(svg, 64, 176, "OpenAI Decisions API", { "font-size": 76, "font-weight": 700 });
      el("path", { d: "M66 204 H800", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 258, "Checked 7 Oct 2026", { "font-size": 25, "font-weight": 500, fill: MUTE });
      el("rect", { x: 56, y: 462, width: 848, height: 20, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      [[220, YEL, 0], [480, MINT, 1], [740, LIL, 0]].forEach(([x, col, rung]) => {
        const g = el("g", { transform: `translate(${x} 462)` }, svg), dip = rung ? 9 : 0;
        el("rect", { x: -7, y: -112 + dip, width: 14, height: 30, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("rect", { x: -20, y: -124 + dip, width: 40, height: 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M-84 -14 A84 76 0 0 1 84 -14 Z", fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-56 -40 A58 52 0 0 1 -22 -74", fill: "none", stroke: "#fff", "stroke-width": 7, "stroke-linecap": "round" }, g);
        el("rect", { x: -100, y: -16, width: 200, height: 16, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        if (rung) el("path", { d: "M-112 -70 Q-128 -96 -112 -122 M112 -70 Q128 -96 112 -122 M-136 -62 Q-158 -96 -136 -130 M136 -62 Q158 -96 136 -130", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
      });
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
