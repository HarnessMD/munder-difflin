/* Bright coded scenes for "Claude Duet waitlist". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (+n.getAttribute("font-size") * max) / w); return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  /* back out with an adjustable overshoot: c 1.7 is a lively arrival, c 0.8 a soft one */
  const bk = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const dip = (k) => (k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0);
  /* a squash and stretch wobble after a landing: k runs 0 to 1 */
  const squash = (k) => (k > 0 && k < 1 ? Math.sin(k * Math.PI * 2) * (1 - k) * 0.14 : 0);
  /* a decaying wobble: k runs 0 to 1, n swings */
  const wob = (k, n = 3) => (k > 0 && k < 1 ? Math.sin(k * Math.PI * 2 * n) * Math.pow(1 - k, 2) : 0);
  /* a soft idle beat: 0 at rest, a smooth hump for the first w of each period P; always at rest when t = end (for d < P * (1 - w)) */
  const bump = (t, end, P, d = 0, w = 0.5) => { if (!isFinite(t)) return 0; const u = ((((t - end - d) / P) % 1) + 1) % 1; return u < w ? Math.sin((Math.PI * u) / w) : 0; };
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * cl(k)).toString(16).padStart(2, "0")).join(""); };
  const rise = (n, k, d = 16) => { n.setAttribute("transform", `translate(0 ${d * (1 - oc(k))})`); n.setAttribute("opacity", seg(k, 0, 0.4)); };
  /* scale a node about a point */
  const about = (n, x, y, sx, sy = sx, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${sx} ${sy}) translate(${-x} ${-y})`);
  const YEL_T = mix(YEL, "#ffffff", 0.55), SKY_T = mix(SKY, "#ffffff", 0.55), LIL_T = mix(LIL, "#ffffff", 0.6), MINT_T = mix(MINT, "#ffffff", 0.5);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, s, x = 756, y = 50) => txt(svg, x, y, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  /* draw a stroke on: n gets a dash as long as len, k runs 0 to 1 */
  const draw = (n, len, k) => { n.setAttribute("stroke-dasharray", `${len} ${len + 40}`); n.setAttribute("stroke-dashoffset", len * (1 - k)); n.setAttribute("opacity", k > 0 ? 1 : 0); };

  const SC = {};

  /* ---- title card, 16 by 9: sealed envelopes ride a rail; one lifts out and opens ---- */
  SC.hero = {
    w: 960, h: 540, dur: 11, still: 11,
    build(svg) {
      const END = 11;
      const pill = el("g", {}, svg);
      const pr = el("rect", { y: -20, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      const pt = txt(pill, 0, 7, "Access", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      const pw = Math.ceil(pt.getComputedTextLength()) + 40;
      pr.setAttribute("x", -pw / 2); pr.setAttribute("width", pw);
      const l1g = el("g", {}, svg), l2g = el("g", {}, svg);
      const l1 = txt(l1g, 60, 0, "Claude Duet", { "font-size": 80, "font-weight": 700 });
      const l2 = txt(l2g, 60, 0, "waitlist", { "font-size": 80, "font-weight": 700 });
      const TW = 450, tmax = Math.max(l1.getComputedTextLength(), l2.getComputedTextLength());
      if (tmax > TW) [l1, l2].forEach((n) => n.setAttribute("font-size", (80 * TW) / tmax));
      const FS = +l1.getAttribute("font-size"), Y1 = 204, Y2 = Math.round(Y1 + FS * 1.1);
      l1.setAttribute("y", Y1); l2.setAttribute("y", Y2);
      const UL = Math.round(l2.getComputedTextLength() - 6), UY = Y2 + 22;
      const under = el("path", { d: `M66 ${UY} H${66 + UL}`, stroke: YEL, "stroke-width": 13, "stroke-linecap": "round", fill: "none" }, svg);
      const s1g = el("g", {}, svg), s2g = el("g", {}, svg);
      const s1 = txt(s1g, 63, UY + 56, "Who gets in first,", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const s2 = txt(s2g, 63, UY + 90, "and what to use meanwhile", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const smax = Math.max(s1.getComputedTextLength(), s2.getComputedTextLength());
      if (smax > 440) [s1, s2].forEach((n) => n.setAttribute("font-size", (26 * 440) / smax));
      const chkG = el("g", {}, svg);
      txt(chkG, 64, 478, "Checked 22 Oct 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });

      /* the rail: a rounded bar on little wheels */
      const RX0 = 572, RX1 = 900, RY = 430, S = 84, EW = 66, EH = 43, BW = 190, BH = 124, K = EW / BW, LX = 740, LY = 296;
      const G = S * 1.5, T0 = 5.8, P = 1.3;
      const off = (t) => {
        let o = G * oc(seg(t, 0.9, 3.0));
        if (t >= T0) { const v = (t - T0) / P, n = Math.floor(v), u = (v - n) * P; o += (S / 2) * (n + bk(seg(u, 0, 0.62), 1.3)); }
        return o;
      };
      const X0 = LX - G, ROWY = RY - 1 - EH / 2;
      const railG = el("g", {}, svg);
      const bar = el("rect", { x: RX0, y: RY, width: RX1 - RX0, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, railG);
      const wheels = [];
      for (let x = RX0 + 30; x < RX1 - 10; x += 67) {
        const w = el("g", {}, svg), spin = el("g", {}, w);
        el("circle", { r: 11, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, spin);
        el("path", { d: "M0 0 V-7 M0 0 L6.1 3.5 M0 0 L-6.1 3.5", stroke: INK, "stroke-width": 2.2, "stroke-linecap": "round" }, spin);
        el("circle", { r: 2.4, fill: INK }, spin);
        wheels.push({ w, spin, x });
      }
      /* envelopes: body, folded pocket edge, flap, seal; the same shape at any size */
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "mg-wl-rail" }, defs);
      el("rect", { x: RX0 - 18, y: RY - 140, width: RX1 - RX0 + 36, height: 141 }, cp);
      const row = el("g", { "clip-path": "url(#mg-wl-rail)" }, svg);
      const COLS = [SKY, LIL, YEL, BLUE, MINT];
      const shape = (p, W, H, fill, sw) => {
        const inner = el("g", { transform: `translate(${-W / 2} ${-H})` }, p);
        el("rect", { x: 0, y: 0, width: W, height: H, rx: W * 0.08, fill, stroke: INK, "stroke-width": sw }, inner);
        el("path", { d: `M${W * 0.03} ${H * 0.36} L${W / 2} ${H * 0.64} L${W * 0.97} ${H * 0.36}`, fill: "none", stroke: INK, "stroke-width": sw * 0.8, "stroke-linejoin": "round", "stroke-linecap": "round" }, inner);
        el("path", { d: `M${W * 0.02} ${H * 0.04} L${W / 2} ${H * 0.55} L${W * 0.98} ${H * 0.04}`, fill, stroke: INK, "stroke-width": sw, "stroke-linejoin": "round" }, inner);
        el("circle", { cx: W / 2, cy: H * 0.55, r: H * 0.11, fill: "#fff", stroke: INK, "stroke-width": sw * 0.9 }, inner);
        return inner;
      };
      const pool = [];
      for (let k = -6; k <= 5; k++) {
        if (k === 0) continue;
        const g = el("g", {}, row), body = el("g", {}, g);
        shape(body, EW, EH, COLS[((k % 5) + 5) % 5], 2.5);
        pool.push({ g, body, k, at: 0.95 + 0.085 * Math.max(0, k), hid: k < 0 });
      }
      /* little housings at each end: envelopes come out of one and go into the other */
      const houses = [[RX0 - 18, 1], [RX1 + 18, -1]].map(([x, dir]) => {
        const g = el("g", {}, svg);
        el("rect", { x: -24, y: -62, width: 48, height: 70, rx: 12, fill: dir > 0 ? LIL : SKY, stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: `M${dir * 24} -50 V-4`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, g);
        el("circle", { cx: -dir * 6, cy: -40, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.2 }, g);
        return { g, x };
      });
      /* the chosen envelope, built large and shrunk into the row */
      const big = el("g", {}, svg), bigS = el("g", {}, big), bin = el("g", { transform: `translate(${-BW / 2} ${-BH})` }, bigS);
      const SW = [];
      const sw = (n, k = 1) => { SW.push([n, k]); return n; };
      sw(el("rect", { x: 0, y: 0, width: BW, height: BH, rx: BW * 0.08, fill: YEL, stroke: INK }, bin));
      const flapB = sw(el("path", { d: `M17 ${BH * 0.04} L${BW / 2} ${BH * 0.5} L${BW - 17} ${BH * 0.04} Z`, fill: YEL_T, stroke: INK, "stroke-linejoin": "round" }, bin));
      const ccp = el("clipPath", { id: "mg-wl-card" }, defs);
      el("rect", { x: -20, y: -300, width: BW + 40, height: 300 + BH * 0.66 }, ccp);
      const cardWrap = el("g", { "clip-path": "url(#mg-wl-card)" }, bin), card = el("g", {}, cardWrap);
      sw(el("rect", { x: 15, y: 0, width: BW - 30, height: 200, rx: 12, fill: MINT, stroke: INK }, card));
      const cardT = txt(card, BW / 2, 47, "You're in", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      fit(cardT, BW - 54);
      sw(el("path", { d: `M0 ${BH * 0.36} L${BW / 2} ${BH * 0.64} L${BW} ${BH * 0.36} V${BH - BW * 0.08} Q${BW} ${BH} ${BW * 0.92} ${BH} H${BW * 0.08} Q0 ${BH} 0 ${BH - BW * 0.08} Z`, fill: YEL, stroke: INK, "stroke-linejoin": "round" }, bin));
      const flapF = el("g", {}, bin);
      sw(el("path", { d: `M${BW * 0.02} ${BH * 0.04} L${BW / 2} ${BH * 0.55} L${BW * 0.98} ${BH * 0.04}`, fill: YEL, stroke: INK, "stroke-linejoin": "round" }, flapF));
      const seal = el("g", {}, flapF);
      sw(el("circle", { cx: BW / 2, cy: BH * 0.55, r: BH * 0.11, fill: "#fff", stroke: INK }, seal), 0.9);
      /* sparkle strokes around the card */
      const LB = 362, CT = LB - BH - 82;
      const SPK = [[-98, 14, -165], [-92, -14, -128], [98, 14, -15], [92, -14, -52], [0, -16, -90]];
      const spk = SPK.map(([x, y, a]) => {
        const r = (a * Math.PI) / 180, dx = Math.cos(r) * 16, dy = Math.sin(r) * 16;
        return el("path", { d: `M${LX + x} ${CT + y} l${dx} ${dy}`, stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round", fill: "none" }, svg);
      });

      return (t) => {
        /* type: pill, title lines, underline, subtitle, date */
        const a = bk(seg(t, 0.15, 0.6), 1.9);
        tf(pill, 64 + pw / 2, 96, 0.6 + 0.4 * a); pill.setAttribute("opacity", seg(t, 0.15, 0.3));
        [l1g, l2g].forEach((g, i) => rise(g, seg(t, 0.3 + i * 0.1, 0.9 + i * 0.1), 28));
        draw(under, UL, oc(seg(t, 0.95, 1.5)));
        [s1g, s2g].forEach((g, i) => rise(g, seg(t, 0.62 + i * 0.09, 1.2 + i * 0.09), 16));
        rise(chkG, seg(t, 0.95, 1.4), 10);

        /* rail grows from the left, wheels pop in turn */
        const rk = io(seg(t, 0.4, 1.05));
        about(railG, RX0, RY + 7, Math.max(0.01, rk), 1); railG.setAttribute("opacity", rk > 0 ? 1 : 0);
        houses.forEach((h, i) => { const k = seg(t, 0.45 + i * 0.5, 0.85 + i * 0.5); tf(h.g, h.x, RY + 7, 0.4 + 0.6 * bk(k, 2)); h.g.setAttribute("opacity", seg(k, 0, 0.3)); });
        const o = off(t);
        wheels.forEach((w, i) => {
          const k = seg(t, 0.55 + i * 0.07, 0.95 + i * 0.07);
          tf(w.w, w.x, RY + 27, bk(k, 2)); w.w.setAttribute("opacity", seg(k, 0, 0.3));
          w.spin.setAttribute("transform", `rotate(${(o / 11) * 57.3})`);
        });

        /* the row of sealed envelopes drops onto the rail and rides along */
        pool.forEach((e) => {
          const x = X0 + e.k * S + o, d = e.hid ? (t >= 0.9 ? 1 : 0) : seg(t, e.at, e.at + 0.4);
          tf(e.g, x, ROWY + EH / 2 - 54 * (1 - d * d));
          e.g.setAttribute("opacity", seg(d, 0, 0.3));
          const q = e.hid ? 0 : squash(seg(t, e.at + 0.4, e.at + 0.85));
          e.body.setAttribute("transform", `scale(${1 + q} ${1 - q})`);
        });

        /* the chosen one: drops in with the row, lifts out, swells, opens */
        const da = 0.95, d = seg(t, da, da + 0.4);
        const lift = seg(t, 3.25, 4.05), le = bk(lift, 1.3), grow = oc(seg(t, 3.25, 3.95));
        const antic = dip(seg(t, 3.0, 3.3));
        const bx = X0 + (t < 3.25 ? o : G), rb = ROWY + EH / 2 - 54 * (1 - d * d) + 4 * antic;
        const by = rb + (LB - rb) * le;
        const s = K + (1 - K) * grow;
        const settle = squash(seg(t, 5.12, 5.6)) * 0.5;
        const q0 = squash(seg(t, da + 0.4, da + 0.85));
        big.setAttribute("transform", `translate(${bx} ${by}) rotate(${7 * wob(lift, 1)})`);
        bigS.setAttribute("transform", `scale(${s * (1 + q0 + settle + 0.06 * antic)} ${s * (1 - q0 - settle - 0.08 * antic)})`);
        big.setAttribute("opacity", seg(d, 0, 0.3));
        const swl = (2.5 + 0.6 * grow) / s;
        SW.forEach(([n, k]) => { if (k) n.setAttribute("stroke-width", swl * k); });
        /* seal pops, flap folds back, card slides up */
        const sp = seg(t, 3.95, 4.2);
        about(seal, BW / 2, BH * 0.55, 1 + 0.5 * oc(sp)); seal.setAttribute("opacity", 1 - sp);
        const f = 1 - 2 * io(seg(t, 4.1, 4.55));
        about(flapF, 0, 0, 1, Math.max(0.001, f)); flapF.setAttribute("opacity", f > 0 ? 1 : 0);
        about(flapB, 0, 0, 1, Math.min(-0.001, f)); flapB.setAttribute("opacity", f > 0 ? 0 : 1);
        const ck = seg(t, 4.45, 5.15);
        card.setAttribute("transform", `translate(0 ${16 + (-82 - 16) * bk(ck, 1.5)})`);
        card.setAttribute("opacity", ck > 0 ? 1 : 0);
        spk.forEach((n, i) => {
          const k = seg(t, 5.0 + i * 0.05, 5.75 + i * 0.05);
          draw(n, 16, oc(seg(k, 0, 0.45)));
          n.setAttribute("opacity", k > 0 && k < 1 ? 1 - seg(k, 0.55, 1) : 0);
        });
      };
    },
  };

  /* ---- 1. an eligibility checker: plan picker, a US switch, a result panel ---- */
  SC.check = {
    dur: 12, still: 12,
    build(svg, api) {
      const END = 12, READY = 2.6;
      const hintT = hint(svg, "Try your plan", 756, 50);
      const cardG = el("g", {}, svg);
      el("rect", { x: 40, y: 78, width: 720, height: 486, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 3 }, cardG);
      const PLANS = ["Free", "Pro", "Max", "Team", "Enterprise"];
      const lab1 = el("g", {}, svg);
      txt(lab1, 84, 138, "Plan", { "font-size": 23, "font-weight": 700 });
      const TX = 84, TWD = 632, TY = 158, TH = 62, SG = TWD / 5, CY1 = TY + TH / 2;
      const track = el("rect", { x: TX, y: TY, width: TWD, height: TH, rx: TH / 2, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const thumb = el("g", {}, svg), thumbIn = el("g", {}, thumb);
      el("rect", { x: -SG / 2 + 6, y: -TH / 2 + 7, width: SG - 12, height: TH - 14, rx: (TH - 14) / 2, fill: YEL, stroke: INK, "stroke-width": 2.5 }, thumbIn);
      const group = el("g", { role: "radiogroup", "aria-label": "Plan" }, svg);
      const px = (i) => TX + SG * (i + 0.5);
      let user = null, lastT = 0, disp = { plan: -1, us: false };
      const opts = PLANS.map((p, i) => {
        const g = el("g", { role: "radio", tabindex: i ? -1 : 0, "aria-checked": "false", "aria-label": p, class: "mg-hit" }, group);
        const inner = el("g", {}, g);
        el("rect", { x: px(i) - SG / 2 + 2, y: TY + 2, width: SG - 4, height: TH - 4, rx: 26, fill: "transparent" }, inner);
        const t = txt(inner, px(i), CY1 + 7.5, p, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
        fit(t, SG - 26);
        el("rect", { x: px(i) - SG / 2 + 1, y: TY - 6, width: SG - 2, height: TH + 12, rx: 30, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, inner);
        g.addEventListener("click", () => setPlan(i));
        g.addEventListener("keydown", (e) => {
          const m = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
          let to = -1;
          if (m) to = (i + m + 5) % 5; else if (e.key === "Home") to = 0; else if (e.key === "End") to = 4; else if (e.key === "Enter" || e.key === " ") to = i;
          if (to < 0) return;
          e.preventDefault(); setPlan(to); if (to !== i) opts[to].g.focus();
        });
        return { g, inner };
      });
      const sep = [252, 346].map((y) => el("path", { d: `M84 ${y} H716`, stroke: SOFT, "stroke-width": 3, "stroke-linecap": "round", fill: "none" }, svg));
      const lab2 = el("g", {}, svg);
      txt(lab2, 84, 307, "In the US", { "font-size": 23, "font-weight": 700 });
      const SX = 566, SWD = 96, SH = 46, SCY = 299;
      const noT = txt(svg, SX - 14, SCY + 7, "No", { "text-anchor": "end", "font-size": 20, "font-weight": 600 });
      const yesT = txt(svg, SX + SWD + 14, SCY + 7, "Yes", { "font-size": 20, "font-weight": 600 });
      const sw = el("g", { role: "switch", tabindex: 0, "aria-checked": "false", "aria-label": "In the US", class: "mg-hit" }, svg);
      const swIn = el("g", {}, sw);
      const swTrack = el("rect", { x: SX, y: SCY - SH / 2, width: SWD, height: SH, rx: SH / 2, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, swIn);
      const knob = el("g", {}, swIn), knobIn = el("g", {}, knob);
      el("circle", { r: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, knobIn);
      el("rect", { x: SX - 8, y: SCY - SH / 2 - 8, width: SWD + 16, height: SH + 16, rx: SH / 2 + 8, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, swIn);
      sw.addEventListener("click", () => setUS());
      sw.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setUS(); } });

      /* result panel */
      const PX = 84, PY = 374, PW = 632, PH = 150, PCY = PY + PH / 2;
      const panelG = el("g", {}, svg);
      const ring = el("rect", { x: PX, y: PY, width: PW, height: PH, rx: 24, fill: "none", stroke: MINT, "stroke-width": 5, opacity: 0 }, panelG);
      const panel = el("rect", { x: PX, y: PY, width: PW, height: PH, rx: 24, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, panelG);
      const defs = el("defs", {}, svg), cp = el("clipPath", { id: "mg-wl-res" }, defs);
      el("rect", { x: PX + 2, y: PY + 2, width: PW - 4, height: PH - 4, rx: 22 }, cp);
      const wipeG = el("g", { "clip-path": "url(#mg-wl-res)" }, panelG);
      const wipe = el("circle", { cx: PX + 72, cy: PCY, r: 0, fill: SOFT }, wipeG);
      const resG = el("g", { "clip-path": "url(#mg-wl-res)" }, panelG);
      const RES = [["Can join the waitlist", MINT, 1], ["Not included yet", LIL, 0], ["Needs Pro or Max", LIL, 0], ["Starting with the US", LIL, 0]];
      const rtx = RES.map(([s]) => el("g", { opacity: 0 }, resG));
      RES.forEach(([s], i) => fit(txt(rtx[i], PX + 132, PCY + 10, s, { "font-size": 29, "font-weight": 700 }), PW - 160));
      const icon = el("g", {}, panelG), iconIn = el("g", {}, icon);
      el("circle", { r: 32, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, iconIn);
      const tick = el("path", { d: "M-13 1 L-4 10 L13 -9", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, iconIn);
      const clock = el("g", {}, iconIn);
      el("path", { d: "M0 -16 V0 L11 7", stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, clock);
      el("circle", { r: 3, fill: INK }, clock);
      const res = (s) => (s.plan < 0 ? -1 : s.plan === 0 ? 2 : s.plan >= 3 ? 1 : !s.us ? 3 : 0);

      /* autoplay: Free, then Pro, then the switch to Yes */
      const EV = [{ t: 0, plan: -1, us: false }, { t: 3.0, plan: 0, us: false }, { t: 5.3, plan: 1, us: false }, { t: 7.5, plan: 1, us: true }];
      const change = (plan, us) => {
        api.poke();
        if (plan === disp.plan && us === disp.us) return;
        user = { plan, us, prev: { plan: disp.plan, us: disp.us }, at: api.now() };
        if (lastT < READY) api.seek(READY); else api.poke();
      };
      function setPlan(i) { api.poke(); change(i, disp.us); }
      function setUS() { api.poke(); change(disp.plan < 0 ? 1 : disp.plan, !disp.us); }

      return (t, now) => {
        if (t < lastT - 0.5) user = null;
        lastT = t;
        const calm = api.calm;
        /* entrance */
        const ck = seg(t, 0.1, 0.6);
        about(cardG, 400, 321, 0.94 + 0.06 * bk(ck, 1.6)); cardG.setAttribute("opacity", seg(ck, 0, 0.4));
        rise(lab1, seg(t, 0.4, 0.85), 12);
        const tk = seg(t, 0.5, 1.0); about(track, TX, CY1, Math.max(0.01, oc(tk)), 1); track.setAttribute("opacity", tk > 0 ? 1 : 0);
        sep.forEach((n, i) => draw(n, 632, io(seg(t, 1.0 + i * 0.3, 1.6 + i * 0.3))));
        rise(lab2, seg(t, 1.1, 1.55), 12);
        const sk = seg(t, 1.25, 1.65); about(swIn, SX + SWD / 2, SCY, 0.5 + 0.5 * bk(sk, 2)); swIn.setAttribute("opacity", seg(sk, 0, 0.3));
        [noT, yesT].forEach((n, i) => n.setAttribute("opacity", seg(t, 1.35 + i * 0.08, 1.6 + i * 0.08)));
        const pk = seg(t, 1.55, 2.1);
        panelG.setAttribute("transform", `translate(0 ${24 * (1 - bk(pk, 1.4))})`); panelG.setAttribute("opacity", seg(pk, 0, 0.35));
        hintT.setAttribute("opacity", seg(t, READY - 0.4, READY));

        /* which state shows, the one before it, and since when */
        let cur, prev, since, ev = -1;
        if (user) { cur = user; prev = user.prev; since = calm ? 9 : now - user.at; }
        else { let i = 0; EV.forEach((e, j) => { if (t >= e.t) i = j; }); cur = EV[i]; prev = EV[Math.max(0, i - 1)]; since = t - EV[i].t; ev = i; }
        if (cur.plan !== disp.plan || cur.us !== disp.us) {
          opts.forEach((o, i) => { o.g.setAttribute("aria-checked", i === cur.plan ? "true" : "false"); o.g.setAttribute("tabindex", i === Math.max(0, cur.plan) ? 0 : -1); });
          sw.setAttribute("aria-checked", cur.us ? "true" : "false");
        }
        disp = { plan: cur.plan, us: cur.us };

        /* plan options pop in, then the pressed one dips */
        opts.forEach((o, i) => {
          const k = seg(t, 0.7 + i * 0.08, 1.1 + i * 0.08);
          let p = 0;
          if (user) { if (i === cur.plan && cur.plan !== prev.plan) p = dip(seg(since, 0, 0.26)); }
          else EV.forEach((e, j) => { if (j && e.plan === i && e.plan !== EV[j - 1].plan) p = Math.max(p, dip(seg(t, e.t - 0.2, e.t + 0.12))); });
          about(o.inner, px(i), CY1, (0.4 + 0.6 * bk(k, 2)) * (1 - 0.1 * p)); o.inner.setAttribute("opacity", seg(k, 0, 0.3));
        });
        /* the thumb slides with a stretch, or pops in on the first pick */
        if (cur.plan < 0) thumb.setAttribute("opacity", 0);
        else if (prev.plan < 0 || prev.plan === cur.plan) {
          const k = prev.plan < 0 ? seg(since, 0, 0.42) : 1;
          tf(thumb, px(cur.plan), CY1); about(thumbIn, 0, 0, 0.3 + 0.7 * bk(k, 2.2)); thumb.setAttribute("opacity", seg(k, 0, 0.25));
        } else {
          const k = seg(since, 0, 0.5), e = bk(k, 1.25);
          tf(thumb, px(prev.plan) + (px(cur.plan) - px(prev.plan)) * e, CY1);
          thumbIn.setAttribute("transform", `scale(${1 + 0.22 * dip(seg(k, 0, 0.7))} ${1 - 0.1 * dip(seg(k, 0, 0.7))})`); thumb.setAttribute("opacity", 1);
        }
        /* the switch knob */
        const KX0 = SX + 23, KX1 = SX + SWD - 23;
        let on = cur.us ? 1 : 0, kx = cur.us ? KX1 : KX0, stretch = 0, sp = 0;
        if (prev.us !== cur.us) {
          const k = seg(since, 0, 0.42), e = bk(k, 1.6);
          kx = prev.us ? KX1 + (KX0 - KX1) * e : KX0 + (KX1 - KX0) * e;
          on = cur.us ? oc(k) : 1 - oc(k); stretch = dip(seg(k, 0, 0.6));
        }
        if (user) { if (prev.us !== cur.us) sp = dip(seg(since, 0, 0.24)); }
        else EV.forEach((e, j) => { if (j && e.us !== EV[j - 1].us) sp = Math.max(sp, dip(seg(t, e.t - 0.2, e.t + 0.12))); });
        tf(knob, kx, SCY); knobIn.setAttribute("transform", `scale(${1 + 0.3 * stretch} ${1 - 0.12 * stretch})`);
        swTrack.setAttribute("fill", mix(SOFT, MINT, on));
        if (sk >= 1) about(swIn, SX + SWD / 2, SCY, 1 - 0.06 * sp);
        noT.setAttribute("fill", on > 0.5 ? MUTE : INK); yesT.setAttribute("fill", on > 0.5 ? INK : MUTE);
        noT.setAttribute("font-weight", on > 0.5 ? 500 : 700); yesT.setAttribute("font-weight", on > 0.5 ? 700 : 500);

        /* result: old line slides up and out, new one rises in, colour and icon follow */
        const rc = res(cur), rp = res(prev), same = rc === rp;
        const colOf = (r) => (r < 0 ? SOFT : RES[r][1]);
        /* the new colour spreads from the icon in a circle */
        const wk = same ? 1 : oc(seg(since, 0, 0.5));
        panel.setAttribute("fill", wk >= 1 ? colOf(rc) : colOf(rp));
        wipe.setAttribute("fill", colOf(rc)); wipe.setAttribute("r", wk >= 1 || wk <= 0 ? 0 : 640 * wk);
        rtx.forEach((n, i) => {
          if (i === rc) { const k = same ? 1 : seg(since, 0.2, 0.66); n.setAttribute("transform", `translate(0 ${70 * (1 - bk(k, 1.5))})`); n.setAttribute("opacity", seg(k, 0, 0.25)); }
          else if (i === rp && !same) { const k = seg(since, 0, 0.22); n.setAttribute("transform", `translate(0 ${-70 * io(k)})`); n.setAttribute("opacity", 1 - seg(k, 0.3, 0.9)); }
          else n.setAttribute("opacity", 0);
        });
        const IX = PX + 72;
        if (rc < 0) icon.setAttribute("opacity", 0);
        else {
          const ty = RES[rc][2], pty = rp < 0 ? -1 : RES[rp][2];
          let sx = 1, sy = 1, showT = ty;
          if (rp < 0 && !same) { const k = seg(since, 0.05, 0.45); sx = sy = 0.3 + 0.7 * bk(k, 2.2); icon.setAttribute("opacity", seg(k, 0, 0.3)); }
          else {
            icon.setAttribute("opacity", 1);
            if (!same && ty !== pty) { const k = seg(since, 0, 0.4); sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * k))); showT = k < 0.5 ? pty : ty; }
            else if (!same) { const k = seg(since, 0, 0.4); sx = sy = 1 - 0.12 * dip(k); }
          }
          const idle = rc === 0 ? 0.07 * bump(t, END, 1.8, 0, 0.45) * seg(t, 8.7, 9.1) * (user ? 0 : 1) : 0;
          tf(icon, IX, PCY); iconIn.setAttribute("transform", `scale(${sx * (1 + idle)} ${sy * (1 + idle)})`);
          tick.setAttribute("opacity", showT === 1 ? 1 : 0); clock.setAttribute("opacity", showT === 0 ? 1 : 0);
          draw(tick, 36, showT === 1 ? (same || ty !== 1 ? 1 : oc(seg(since, 0.22, 0.6))) : 0);
          if (showT === 1) tick.setAttribute("opacity", 1);
          clock.setAttribute("transform", `rotate(${showT === 0 && !same && ty === 0 ? -120 * (1 - bk(seg(since, 0.2, 0.7), 1.8)) : 0})`);
        }
        /* a mint ring ripples out when the answer turns to yes */
        const rk = rc === 0 && !same ? seg(since, 0.3, 1.1) : 0;
        about(ring, 400, PCY, 1 + 0.05 * oc(rk), 1 + 0.22 * oc(rk)); ring.setAttribute("opacity", rk > 0 && rk < 1 ? 0.9 * (1 - rk) : 0);
      };
    },
  };

  /* ---- 2. a white marble run with four lit stations ---- */
  SC.steps = {
    dur: 13, still: 13,
    build(svg, api) {
      const END = 13;
      const hintT = hint(svg, "Tap to drop the marble", 756, 44);
      const Y = [140, 254, 368, 482], D = 22, XL = 104, XR = 696, R = 46, MR = 10.5;
      const yAt = (k, x) => (k % 2 === 0 ? Y[k] + (D * (x - XL)) / (XR - XL) : Y[k] + (D * (XR - x)) / (XR - XL));
      const ST = [[0, 232, "Open the Claude Duet page"], [1, 470, "Join the waitlist"], [2, 272, "Wait for Anthropic's email"], [3, 154, "Open it on iOS, Android or claude.ai"]];
      const dipTo = (k, x, dir) => { const a = x - 26 * dir, b = x + 26 * dir; return `L${a} ${yAt(k, a)} Q${x} ${yAt(k, x) + 26} ${b} ${yAt(k, b)} `; };
      let d = `M60 50 L60 98 Q60 ${Y[0]} ${XL} ${Y[0]} `;
      d += dipTo(0, ST[0][1], 1) + `L${XR} ${Y[0] + D} A${R} ${R} 0 0 1 ${XR} ${Y[1]} `;
      d += dipTo(1, ST[1][1], -1) + `L${XL} ${Y[1] + D} A${R} ${R} 0 0 0 ${XL} ${Y[2]} `;
      d += dipTo(2, ST[2][1], 1) + `L${XR} ${Y[2] + D} A${R} ${R} 0 0 1 ${XR} ${Y[3]} `;
      const ex = ST[3][1], ey = yAt(3, ex);
      d += `L${ex + 28} ${yAt(3, ex + 28)} Q${ex} ${ey + 28} ${ex - 26} ${ey + 4} Q${ex - 38} ${ey - 4} ${ex - 40} ${ey - 18}`;
      const hopper = el("g", {}, svg);
      el("path", { d: "M32 22 H88 L72 58 H48 Z", fill: SKY, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, hopper);
      const shadow = el("path", { d, fill: "none", stroke: SOFT, "stroke-width": 30, "stroke-linecap": "round", "stroke-linejoin": "round", transform: "translate(0 7)" }, svg);
      const outer = el("path", { d, fill: "none", stroke: INK, "stroke-width": 30, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const innerP = el("path", { d, fill: "none", stroke: "#fff", "stroke-width": 24, "stroke-linecap": "round", "stroke-linejoin": "round" }, svg);
      const L = outer.getTotalLength(), N = 1600, pts = [];
      for (let i = 0; i <= N; i++) { const p = outer.getPointAtLength((L * i) / N); pts.push([p.x, p.y]); }
      const at = (s) => { const u = (cl(s, 0, L) / L) * N, i = Math.min(N - 1, Math.floor(u)), f = u - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]; };
      /* the lowest point of each dip is where a station sits */
      const sAt = (x, y) => { let b = 0, bd = 1e9; pts.forEach((p, i) => { const dd = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (dd < bd) { bd = dd; b = i; } }); return (b * L) / N; };
      const SS = ST.map(([k, x]) => sAt(x, yAt(k, x) + 13));
      SS[3] = sAt(ex - 2, ey + 14);
      /* stations: stem, lamp with its number, rays, label */
      const lamps = ST.map(([k, x, s], i) => {
        const cy = yAt(k, x) - 54;
        const stem = el("path", { d: `M${x} ${cy + 17} V${yAt(k, x) - 15}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, svg);
        const rays = el("g", {}, svg);
        for (let r = 0; r < 8; r++) { const a = (r * Math.PI) / 4 + Math.PI / 8; el("path", { d: `M${x + Math.cos(a) * 23} ${cy + Math.sin(a) * 23} L${x + Math.cos(a) * 29} ${cy + Math.sin(a) * 29}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, rays); }
        const lamp = el("g", {}, svg);
        const disc = el("circle", { cx: x, cy, r: 17, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, lamp);
        txt(lamp, x, cy + 6.5, String(i + 1), { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
        const lab = el("g", {}, svg);
        const lt = fit(txt(lab, x + 42, cy + 8, s, { "font-size": 22, "font-weight": 600, fill: MUTE }), 760 - x - 42);
        return { stem, rays, lamp, disc, lab, lt, x, cy, len: yAt(k, x) - 15 - cy - 17 };
      });
      /* a tiny envelope by the email station */
      const envX = lamps[2].x + 42 + lamps[2].lt.getComputedTextLength() + 34, envY = lamps[2].cy;
      const env = el("g", {}, svg), envIn = el("g", {}, env);
      el("rect", { x: -18, y: -12, width: 36, height: 25, rx: 4, fill: SKY, stroke: INK, "stroke-width": 2.5 }, envIn);
      el("path", { d: "M-17 -11 L0 3 L17 -11", fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, envIn);
      /* marble with a highlight that turns as it rolls */
      const marble = el("g", {}, svg), mIn = el("g", {}, marble);
      el("circle", { r: MR, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, mIn);
      const shine = el("circle", { r: 2.6, fill: "#fff" }, mIn);
      /* button */
      const btn = el("g", {}, svg), btnIn = el("g", {}, btn);
      const br = el("rect", { y: -24, height: 48, rx: 24, fill: YEL, stroke: INK, "stroke-width": 2.5 }, btnIn);
      const bt = txt(btnIn, 0, 7, "Drop the marble", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      const bw = Math.ceil(bt.getComputedTextLength()) + 44;
      br.setAttribute("x", -bw / 2); br.setAttribute("width", bw);
      el("rect", { x: -bw / 2 - 7, y: -31, width: bw + 14, height: 62, rx: 31, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, btnIn);
      const BX = 752 - bw / 2, BY = 552;
      let pressAt = -99;
      button(btn, "Drop the marble", () => { pressAt = api.now(); api.seek(1.72); });

      /* the run: drop and roll to the cup at station 3, rest, then roll on to the end */
      const prof = (u, a, dd) => { const v = 1 / (1 - a / 2 - dd / 2); if (u < a) return (v * u * u) / (2 * a); if (u < 1 - dd) return v * (a / 2 + (u - a)); const w = 1 - u; return 1 - (v * w * w) / (2 * dd); };
      const A0 = 2.0, A1 = 5.75, B0 = 7.45, B1 = 9.75;
      const sOf = (t) => {
        if (t < A0) return 0;
        if (t < A1) return SS[2] * prof(seg(t, A0, A1), 0.16, 0.14);
        if (t < B0) return SS[2] + 9 * wob(seg(t, A1, A1 + 1.0), 2.2);
        if (t < B1) return SS[2] + (SS[3] - SS[2]) * prof(seg(t, B0, B1), 0.24, 0.1);
        return SS[3] + 8 * wob(seg(t, B1, B1 + 0.9), 1.8);
      };
      /* when the marble reaches each station */
      const TS = SS.map((s, i) => { if (i === 2) return A1; if (i === 3) return B1; for (let t = A0; t < A1; t += 0.002) if (sOf(t) >= s) return t; return A1; });

      return (t, now) => {
        const calm = api.calm;
        const hk = seg(t, 0.1, 0.45); about(hopper, 60, 40, 0.4 + 0.6 * bk(hk, 2)); hopper.setAttribute("opacity", seg(hk, 0, 0.3));
        const dk = io(seg(t, 0.15, 1.5));
        [shadow, outer, innerP].forEach((n) => draw(n, L, dk));
        lamps.forEach((m, i) => {
          const a = 0.45 + i * 0.26;
          draw(m.stem, m.len, oc(seg(t, a, a + 0.2)));
          const k = seg(t, a + 0.12, a + 0.5);
          const lit = t >= TS[i] ? (calm ? 1 : seg(t, TS[i], TS[i] + 0.2)) : 0;
          const pop = t >= TS[i] ? dip(seg(t, TS[i], TS[i] + 0.4)) : 0;
          const idle = 0.07 * bump(t, END, 2.2, i * 0.16, 0.36) * seg(t, 10.4, 10.9);
          about(m.lamp, m.x, m.cy, (0.3 + 0.7 * bk(k, 2.2)) * (1 + 0.28 * pop + idle));
          m.lamp.setAttribute("opacity", seg(k, 0, 0.25));
          m.disc.setAttribute("fill", mix("#ffffff", YEL, lit));
          const rk = t >= TS[i] ? seg(t, TS[i], TS[i] + 0.6) : 0;
          about(m.rays, m.x, m.cy, 0.7 + 0.5 * oc(rk)); m.rays.setAttribute("opacity", rk > 0 && rk < 1 ? 1 - seg(rk, 0.4, 1) : 0);
          rise(m.lab, seg(t, a + 0.2, a + 0.65), 12);
          m.lt.setAttribute("fill", mix(MUTE, INK, lit));
        });
        /* envelope: pops in with its label, wobbles while the marble rests in the cup */
        const ek = seg(t, 1.17, 1.55), wk = seg(t, A1 + 0.15, B0 - 0.1);
        tf(env, envX, envY - 7 * dip(seg(wk, 0, 0.18)) - 5 * dip(seg(wk, 0.42, 0.56)), 0.3 + 0.7 * bk(ek, 2.2), 14 * wob(wk, 4.5));
        env.setAttribute("opacity", seg(ek, 0, 0.3));
        /* marble */
        const mk = seg(t, 1.75, 1.98), s = sOf(t), [mx, my] = at(s);
        tf(marble, mx, my, 0.2 + 0.8 * bk(mk, 2.4)); marble.setAttribute("opacity", mk > 0 ? 1 : 0);
        const a = s / MR;
        shine.setAttribute("cx", Math.cos(a - 2.2) * 4.2); shine.setAttribute("cy", Math.sin(a - 2.2) * 4.2);
        /* button */
        const bp = calm ? 0 : dip(seg(now - pressAt, 0, 0.26));
        const bk2 = seg(t, 1.3, 1.7);
        tf(btn, BX, BY, (0.5 + 0.5 * bk(bk2, 2)) * (1 - 0.08 * bp)); btn.setAttribute("opacity", seg(bk2, 0, 0.3));
        hintT.setAttribute("opacity", seg(t, 1.4, 1.75));
      };
    },
  };

  /* ---- 3. three doors open in turn ---- */
  SC.meanwhile = {
    dur: 12, still: 12,
    build(svg, api) {
      const END = 12, READY = 7.0;
      const hintT = hint(svg, "Tap a door", 756, 46);
      const capG = el("g", {}, svg);
      txt(capG, 400, 92, "While you wait", { "text-anchor": "middle", "font-size": 26, "font-weight": 600, fill: MUTE });
      const DW = 216, GAP = 36, X0 = (800 - 3 * DW - 2 * GAP) / 2, TOP = 232, BOT = 500, RAD = 62, MID = (TOP + BOT) / 2, OPEN = 0.9;
      const DOORS = [["Claude Cowork", "In paid Claude plans now", LIL], ["Munder Difflin", "Free and open source, on your computer", YEL], ["Claude Code", "For work inside your repo", SKY]];
      const arch = (l, top, w, bot, r) => `M${l} ${bot} V${top + r} A${r} ${r} 0 0 1 ${l + r} ${top} H${l + w - r} A${r} ${r} 0 0 1 ${l + w} ${top + r} V${bot} Z`;
      const ground = [[SOFT, 14], [INK, 2.5]].map(([c, w]) => el("path", { d: `M26 ${BOT} H774`, stroke: c, "stroke-width": w, "stroke-linecap": "round", fill: "none" }, svg));
      /* wrap a line into centred rows that fit maxW */
      const wrap = (p, x, yMid, s, maxW, fs) => {
        const probe = txt(p, 0, 0, "", { "font-size": fs, "font-weight": 600 }), rows = [];
        let line = "";
        s.split(" ").forEach((w) => { const tr = line ? line + " " + w : w; probe.textContent = tr; if (probe.getComputedTextLength() > maxW && line) { rows.push(line); line = w; } else line = tr; });
        rows.push(line); probe.remove();
        const LH = fs * 1.36, y0 = yMid - ((rows.length - 1) * LH) / 2 + fs * 0.35;
        return rows.map((r, i) => { const g = el("g", {}, p); txt(g, x, y0 + i * LH, r, { "text-anchor": "middle", "font-size": fs, "font-weight": 600 }); return g; });
      };
      let rep = [-99, -99, -99], lastT = 0;
      const doors = DOORS.map(([name, line, col], k) => {
        const l = X0 + k * (DW + GAP), r = l + DW, cx = l + DW / 2;
        const spill = el("path", { d: `M${l + 8} ${BOT + 2} H${r - 8} L${r + 4} ${BOT + 42} H${l + 34} Z`, fill: mix(col, "#ffffff", 0.45), opacity: 0 }, svg);
        const g = el("g", {}, svg), gIn = el("g", {}, g);
        el("path", { d: arch(l - 10, TOP - 10, DW + 20, BOT, RAD + 10), fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, gIn);
        el("path", { d: arch(l, TOP, DW, BOT, RAD), fill: mix(col, "#ffffff", 0.62), stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, gIn);
        const textX = l + DW * (1 - OPEN) + 9 + (DW - DW * (1 - OPEN) - 9) / 2;
        const rows = wrap(gIn, textX, MID + 14, line, DW - DW * (1 - OPEN) - 9 - 18, 21);
        const leaf = el("g", {}, gIn);
        el("path", { d: arch(l, TOP, DW, BOT, RAD), fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, leaf);
        el("path", { d: arch(l + 26, TOP + 30, DW - 52, MID - 10, RAD - 26), fill: mix(col, "#ffffff", 0.3), stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, leaf);
        el("rect", { x: l + 26, y: MID + 14, width: DW - 52, height: BOT - MID - 40, rx: 12, fill: mix(col, "#ffffff", 0.3), stroke: INK, "stroke-width": 2 }, leaf);
        const knob = el("g", {}, leaf);
        el("circle", { cx: r - 24, cy: MID + 2, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, knob);
        const handle = el("path", { d: `M${r - 24} ${MID + 2} H${r - 44}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, knob);
        const edge = el("rect", { y: TOP + RAD, height: BOT - TOP - RAD, width: 0, fill: SOFT, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, gIn);
        /* hanging sign above the door */
        const sign = el("g", {}, svg), signIn = el("g", {}, sign);
        el("path", { d: `M0 0 L-56 28 M0 0 L56 28`, stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, signIn);
        const sr = el("rect", { y: 25, height: 42, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, signIn);
        const st = fit(txt(signIn, 0, 53, name, { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), DW - 30);
        const sw = Math.ceil(st.getComputedTextLength()) + 30;
        sr.setAttribute("x", -sw / 2); sr.setAttribute("width", sw);
        const nail = el("circle", { cx: cx, cy: 146, r: 4.5, fill: INK }, svg);
        el("path", { d: arch(l - 18, TOP - 18, DW + 36, BOT + 8, RAD + 18), fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, g);
        const a = 2.3 + k * 1.65;
        const pick = () => {
          const now = api.now();
          if (now - rep[k] < 0.35) return;
          api.poke();
          rep[k] = now;
          if (lastT < READY) api.seek(READY); else api.poke();
        };
        button(g, `${name}: ${line}`, pick);
        g.addEventListener("focus", pick);
        return { g, gIn, spill, rows, leaf, handle, edge, sign, signIn, nail, l, r, cx, a, k, col };
      });

      return (t, now) => {
        if (t < lastT - 0.5) rep = [-99, -99, -99];
        lastT = t;
        const calm = api.calm;
        rise(capG, seg(t, 0.15, 0.6), 12);
        ground.forEach((n) => draw(n, 748, io(seg(t, 0.2, 0.9))));
        hintT.setAttribute("opacity", seg(t, READY - 0.4, READY));
        doors.forEach((D) => {
          const k = D.k;
          /* frame rises in, sign drops onto its nail and swings */
          const fk = seg(t, 0.4 + k * 0.11, 0.95 + k * 0.11);
          D.gIn.setAttribute("transform", `translate(0 ${36 * (1 - bk(fk, 1.5))})`); D.gIn.setAttribute("opacity", seg(fk, 0, 0.3));
          const nk = seg(t, 0.85 + k * 0.1, 1.05 + k * 0.1); about(D.nail, D.cx, 146, bk(nk, 2)); D.nail.setAttribute("opacity", nk > 0 ? 1 : 0);
          const sk = seg(t, 0.95 + k * 0.1, 1.35 + k * 0.1);
          let swing = 9 * wob(seg(t, 1.35 + k * 0.1, 3.0 + k * 0.1), 2.2);
          /* opening: the knob turns, the leaf swings with an overshoot */
          const ok = seg(t, D.a, D.a + 0.8);
          let o = bk(ok, 1.5);
          const turn = dip(seg(t, D.a - 0.42, D.a + 0.05));
          swing += 6 * wob(seg(t, D.a + 0.25, D.a + 1.8), 2);
          o += 0.035 * bump(t, END, 2.6, k * 0.45, 0.5) * seg(t, 7.3, 7.9);
          let since = 99;
          if (rep[k] > -99) {
            since = calm ? 9 : now - rep[k];
            if (since < 0.44) o = 1 - io(seg(since, 0, 0.26));
            else if (since < 1.2) o = bk(seg(since, 0.44, 1.2), 2.4);
            swing += 13 * wob(seg(since, 0.24, 1.9), 2.4);
          }
          const thud = rep[k] > -99 ? dip(seg(since, 0.24, 0.42)) : 0;
          const tw = rep[k] > -99 ? dip(seg(since, 0.34, 0.5)) : 0;
          about(D.handle, D.r - 24, MID + 2, 1, 1, -38 * (turn + tw));
          const c = Math.max(0.035, 1 - OPEN * cl(o, -0.2, 1.15));
          about(D.leaf, D.l, MID, c, 1 + 0.035 * cl(o, 0, 1.15));
          const ew = 9 * cl(o, 0, 1.15);
          D.edge.setAttribute("x", D.l + DW * c); D.edge.setAttribute("width", ew); D.edge.setAttribute("opacity", ew > 0.6 ? 1 : 0);
          about(D.edge, D.l, MID, 1, 1 + 0.035 * cl(o, 0, 1.15));
          if (fk >= 1) about(D.gIn, D.cx, BOT, 1 + 0.015 * thud, 1 - 0.015 * thud);
          D.spill.setAttribute("opacity", 0.95 * cl(o));
          /* the line behind the door rises in once the leaf is mostly open */
          D.rows.forEach((n, i) => { const v = rep[k] > -99 ? 1 : seg(t, D.a + 0.3 + i * 0.09, D.a + 0.75 + i * 0.09); rise(n, v, 12); });
          tf(D.sign, D.cx, 146, 1, swing);
          D.signIn.setAttribute("transform", `translate(0 ${-20 * (1 - sk * sk)})`);
          D.sign.setAttribute("opacity", seg(sk, 0, 0.3));
        });
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
    // with reduced motion a tap redraws the still frame with the new choice instead of starting playback
    const api = { now: clock, calm, seek: (s) => { if (calm) return frame(); off = s - clock(); held = false; tick(); }, poke: () => { if (calm) return frame(); held = false; tick(); } };
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
