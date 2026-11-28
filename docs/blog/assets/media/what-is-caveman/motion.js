/* Bright coded scenes for "What is Caveman?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 500 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const lerp = (a, b, k) => a + (b - a) * k;
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const about = (n, cx, cy, s = 1, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) scale(${s}) translate(${-cx} ${-cy})`);
  const show = (n, on) => n.setAttribute("display", on ? "inline" : "none");
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hitbox = (g, a) => el("rect", Object.assign({ fill: "#fff", "fill-opacity": 0 }, a), g);
  const ring = (g, a) => el("rect", Object.assign({ fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 6", "pointer-events": "none", class: "mg-ring" }, a), g);
  const tw = (api, now, at, d) => (api.calm ? 1 : cl((now - at) / d));
  const swing = (t, a, amp, f, d) => (t < a ? 0 : amp * Math.sin((t - a) * f) * Math.exp(-(t - a) * d));
  let uid = 0;

  /* a luggage tag whose hole sits at 0,0 and whose body points right */
  const tag = (p, w, col, label) => {
    const g = el("g", {}, p);
    el("path", { d: `M-14 0 L6 -24 H${w - 8} Q${w} -24 ${w} -16 V16 Q${w} 24 ${w - 8} 24 H6 Z`, fill: col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
    el("circle", { cx: 2, cy: 0, r: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    mono(g, (w + 6) / 2 + 4, 8, label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
    return g;
  };

  const SC = {};

  /* ---- 1. a long letter folds down into a short telegram strip ---- */
  SC.telegram = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const L = 134, W = 340, Y0 = 80, P = 105, B = Y0 + 4 * P, CX = L + W / 2, RE = L + W, SX = L + 210, SY = 430, SH = 70, NSS = {};
      el("rect", { x: L, y: Y0, width: W, height: 4 * P, fill: "none", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "3 9", "stroke-linecap": "round" }, svg);
      const shadow = el("rect", { x: L + 10, width: W, fill: LIL }, svg);
      const LW = [[0.84, 0.62, 0.74], [0.7, 0.86, 0.56], [0.8, 0.6, 0.78], [0.66, 0.82, 0.5]], BASE = [1.45, 1.3, 1.0, 0.7], lines = [];
      const fronts = [0, 1, 2, 3].map((j) => {
        const g = el("g", {}, svg);
        el("rect", Object.assign({ x: L, y: Y0 + j * P, width: W, height: P, fill: SOFT, stroke: INK, "stroke-width": 3 }, NSS), g);
        LW[j].forEach((f, r) => lines.push({ n: el("path", { stroke: LIL, "stroke-width": 10, "stroke-linecap": "round", fill: "none" }, g), x: L + 36, y: Y0 + j * P + 30 + r * 23, w: (W - 72) * f, at: BASE[j] + r * 0.08 }));
        return g;
      });
      const stack = el("rect", Object.assign({ x: L, width: W, fill: SOFT, stroke: INK, "stroke-width": 3 }, NSS), svg);
      const flap = el("rect", Object.assign({ x: L, width: W, height: P, fill: SOFT, stroke: INK, "stroke-width": 3 }, NSS), svg);
      const strip = el("g", {}, svg);
      const stripR = el("rect", { x: L, width: W, fill: YEL, stroke: INK, "stroke-width": 3 }, strip);
      const sl = [[452, 66], [478, 46]].map(([y, w]) => el("path", { d: `M${L + 32} ${y} H${L + 32 + w}`, stroke: LIL, "stroke-width": 9, "stroke-linecap": "round" }, strip));
      el("path", { d: `M${RE} 102 C${RE + 14} 98 ${RE + 23} 104 ${RE + 28} 116`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const skyTag = tag(svg, 164, SKY, "63 tokens");
      const mintStr = el("path", { d: `M${RE} 465 C${RE + 12} 463 ${RE + 21} 464 ${RE + 28} 470`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const mintTag = tag(svg, 164, MINT, "20 tokens");
      const burst = Array.from({ length: 8 }, () => el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round", fill: "none" }, svg));
      const stamp = el("g", {}, svg);
      el("rect", { x: -88, y: -32, width: 176, height: 64, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, stamp);
      el("rect", { x: -80, y: -24, width: 160, height: 48, rx: 8, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "5 5" }, stamp);
      mono(stamp, 0, 9, "same fix", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
      const btn = el("g", {}, svg);
      hitbox(btn, { x: L - 16, y: 412, width: W + 32, height: 106, rx: 16 });
      ring(btn, { x: L - 16, y: 412, width: W + 32, height: 106, rx: 16 });
      button(btn, "Telegram strip. Unfold the letter and play it again.", () => {
        if (api.calm) { api.pose(api.posed() ? null : 2.4); return; }
        if (api.t() > 2.4) api.seek(0);
      });
      const flip = (h, c, k) => `translate(${CX} ${h}) scale(${1 + 0.05 * Math.sin(Math.PI * k)} ${Math.abs(c) < 0.001 ? 0.001 : c}) translate(${-CX} ${-h})`;
      return (t) => {
        const R = t < 1.6;
        const k = [0, 1, 2].map((i) => (R ? 1 - io(seg(t, 0.55 + (2 - i) * 0.32, 0.87 + (2 - i) * 0.32)) : io(seg(t, 2.6 + i * 0.85, 3.22 + i * 0.85))));
        let s = 0; while (s < 3 && k[s] >= 1) s++;
        const a = s < 3 && k[s] > 0 ? s : -1, c = a >= 0 ? Math.cos(Math.PI * k[a]) : 1;
        const m = R ? 1 - io(seg(t, 0.2, 0.55)) : io(seg(t, 5.15, 5.75));
        fronts.forEach((g, j) => {
          let on = j > s, tr = "";
          if (j === 0 && s === 0) { on = a !== 0 || c >= 0; if (a === 0) tr = flip(Y0 + P, c, k[0]); }
          show(g, on); g.setAttribute("transform", tr);
        });
        lines.forEach((ln) => { const q = oc(seg(t, ln.at, ln.at + 0.35)); ln.n.setAttribute("d", `M${ln.x} ${ln.y} H${ln.x + ln.w * q}`); ln.n.setAttribute("opacity", q > 0.01 ? 1 : 0); });
        const gy = s === 3 ? lerp(Y0 + 3 * P, SY, m) : Y0 + s * P, gh = s === 3 ? lerp(P, SH, m) : P;
        const bump = Math.sin(Math.PI * seg(t, 7.0, 7.25)) * (R ? 0 : 1), squash = `translate(0 ${B}) scale(${1 + 0.03 * Math.sin(Math.PI * m)} ${1 - 0.07 * bump}) translate(0 ${-B})`;
        show(stack, s > 0 && a !== s && m < 1); stack.setAttribute("y", gy); stack.setAttribute("height", gh);
        stack.setAttribute("transform", `translate(${CX} 0) ${squash} translate(${-CX} 0)`);
        show(strip, s === 3 && m > 0); strip.setAttribute("opacity", m); stripR.setAttribute("y", gy); stripR.setAttribute("height", gh);
        strip.setAttribute("transform", `translate(${CX} 0) ${squash} translate(${-CX} 0)`);
        sl.forEach((n, i) => n.setAttribute("opacity", R ? 1 - seg(t, 0.1, 0.25) : oc(seg(t, 5.7 + i * 0.09, 6.0 + i * 0.09))));
        const flapOn = a >= 1 || (a === 0 && c < 0);
        show(flap, flapOn);
        if (flapOn) { flap.setAttribute("y", Y0 + a * P); flap.setAttribute("transform", flip(Y0 + (a + 1) * P, c, k[a])); }
        const top = a >= 0 ? Y0 + (a + 1) * P : gy, bot = s === 3 ? gy + gh : B;
        shadow.setAttribute("y", top + 10); shadow.setAttribute("height", Math.max(0, bot - top));
        const sr = 4 + swing(t, 1.5, 8, 7, 2.2) * (1 - seg(t, 2.3, 2.6)) + swing(t, 2.7, 5, 7, 2.5) * (1 - seg(t, 3.8, 4.2));
        tf(skyTag, RE + 28, 116, 1, sr);
        let mo, my, mr;
        if (R) { const q = io(seg(t, 0, 0.3)); mo = 1 - q; my = 24 * q; mr = 18 * q; }
        else { const q = ob(seg(t, 5.9, 6.4)); mo = seg(t, 5.9, 6.0); my = -30 * (1 - q); mr = -22 * (1 - q) + swing(t, 6.4, 6, 8, 2.6) * (1 - seg(t, 7.2, 7.6)); }
        tf(mintTag, RE + 28, 470 + my, 1, mr); mintTag.setAttribute("opacity", mo); mintStr.setAttribute("opacity", mo);
        if (R) { const q = io(seg(t, 0, 0.35)); tf(stamp, SX, 465 - 50 * q, 1 + 0.15 * q, -7 + 6 * q); stamp.setAttribute("opacity", 1 - q); }
        else { const q = seg(t, 6.6, 7.0), b = ob(q); tf(stamp, SX, 465 - 150 * (1 - oc(q)), 1.6 - 0.6 * b, -18 + 11 * b); stamp.setAttribute("opacity", seg(t, 6.6, 6.7)); }
        const bq = seg(t, 7.0, 7.45);
        burst.forEach((n, i) => { const an = i * Math.PI / 4 + 0.2, r1 = 104 + 26 * bq, r2 = 118 + 40 * bq; n.setAttribute("d", `M${SX + Math.cos(an) * r1} ${465 + Math.sin(an) * r1 * 0.6} L${SX + Math.cos(an) * r2} ${465 + Math.sin(an) * r2 * 0.6}`); n.setAttribute("opacity", !R && bq > 0 && bq < 1 ? 1 - bq : 0); });
      };
    },
  };

  /* ---- 2. a satchel with six pockets, a zipper and a tag on the strap ---- */
  SC.satchel = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const PK = ["Say less", "Read less", "Auto", "Blocks", "Waste fixes", "Browse"];
      const Z = 232, ZA = 172, ZB = 628;
      const strapD = "M184 214 C184 40 616 40 616 214";
      el("path", { d: strapD, stroke: INK, "stroke-width": 24, fill: "none" }, svg);
      el("path", { d: strapD, stroke: YEL, "stroke-width": 18, fill: "none" }, svg);
      el("rect", { x: 152, y: 208, width: 520, height: 336, rx: 30, fill: LIL }, svg);
      el("rect", { x: 140, y: 196, width: 520, height: 336, rx: 30, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      [184, 616].forEach((x) => el("rect", { x: x - 17, y: 186, width: 34, height: 22, rx: 7, fill: SKY, stroke: INK, "stroke-width": 2.5 }, svg));
      el("circle", { cx: 571, cy: 130, r: 9, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      const tagStr = el("path", { d: "M578 136 C592 134 603 138 610 146", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, svg);
      const sixTag = tag(svg, 164, MINT, "six parts");
      el("rect", { x: ZA - 12, y: Z - 14, width: ZB - ZA + 24, height: 28, rx: 14, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      const lens = el("path", { fill: "#fff", stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, svg);
      const teeth = [];
      for (let i = 0; i < 38; i++) [0, 1].forEach((b) => teeth.push({ x: ZA + 6 + i * 12 + b * 6, b, n: el("rect", { x: -4, y: -4, width: 8, height: 8, rx: 2, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, svg) }));
      const pull = el("g", {}, svg);
      el("rect", { x: -8, y: 6, width: 16, height: 22, rx: 6, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pull);
      el("circle", { cx: 0, cy: 21, r: 3.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, pull);
      el("rect", { x: -16, y: -12, width: 32, height: 24, rx: 7, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pull);
      const user = PK.map(() => null), curF = PK.map(() => 0), curG = PK.map(() => 1);
      const pk = PK.map((lab, i) => {
        const cx = 232 + (i % 3) * 168, w = 144, h = 106, x = cx - w / 2, y = i < 3 ? 276 : 402;
        const g = el("g", {}, svg), glow = el("g", {}, g), body = el("g", {}, g);
        const h1 = el("rect", { fill: MINT }, glow);
        el("rect", { x, y, width: w, height: h, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, body);
        const off = el("rect", { x, y, width: w, height: h, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, body);
        el("path", { d: `M${x + w} ${y + 30} Q${cx} ${y + 48} ${x} ${y + 30}`, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, body);
        el("circle", { cx, cy: y + 38, r: 5, fill: YEL, stroke: INK, "stroke-width": 2 }, body);
        const label = mono(body, cx, y + 82, lab, { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
        hitbox(g, { x: x - 11, y: y - 11, width: w + 22, height: h + 22, rx: 25 });
        ring(g, { x: x - 15, y: y - 15, width: w + 30, height: h + 30, rx: 28 });
        button(g, `${lab} pocket. Tap to turn it soft white, tap again to make it glow mint.`, () => {
          user[i] = { on: user[i] ? !user[i].on : false, at: api.now(), f0: curF[i], g0: curG[i] };
          api.redraw();
        });
        return { g, glow, h1, off, label, cx, cy: y + h / 2, x, y, w, h };
      });
      return (t, now) => {
        const R = t < 0.9;
        const zp = R ? 1 - io(seg(t, 0.2, 0.8)) : io(seg(t, 1.9, 3.2)), px = lerp(ZA, ZB, zp);
        const e = (x) => oc(cl((x - px) / 70));
        teeth.forEach((n) => { const o = 3 + 8 * e(n.x); n.n.setAttribute("transform", `translate(${n.x} ${Z + (n.b ? o : -o)})`); });
        if (px > ZB - 2) show(lens, false);
        else {
          show(lens, true);
          const up = [], dn = [];
          for (let x = px; x <= ZB + 0.5; x += 8) { const q = 6 * e(x); up.push(`${x.toFixed(1)} ${(Z - q).toFixed(1)}`); dn.unshift(`${x.toFixed(1)} ${(Z + q).toFixed(1)}`); }
          lens.setAttribute("d", `M${up.join(" L")} L${dn.join(" L")} Z`);
        }
        tf(pull, px, Z, 1, 12 * Math.sin(Math.PI * zp));
        pk.forEach((p, i) => {
          const out = io(seg(t, 0.3 + (5 - i) * 0.06, 0.55 + (5 - i) * 0.06)), li = 3.5 + i * 0.5;
          let sc, op, lk;
          if (R) { sc = 1 - 0.2 * out; op = 1 - out; lk = 1 - out; }
          else { sc = 0.8 + 0.2 * ob(seg(t, 0.95 + i * 0.09, 1.45 + i * 0.09)); op = seg(t, 0.95 + i * 0.09, 1.15 + i * 0.09); lk = oc(seg(t, 1.35 + i * 0.09, 1.7 + i * 0.09)); }
          let g = R ? 1 - oc(seg(t, 0.05 + (5 - i) * 0.06, 0.3 + (5 - i) * 0.06)) : ob(seg(t, li, li + 0.45)), f = 0;
          const u = user[i];
          if (u) { const q = tw(api, now, u.at, 0.45); f = lerp(u.f0, u.on ? 0 : 1, io(q)); g = u.on ? lerp(u.g0, 1, ob(q)) : lerp(u.g0, 0, io(q)); }
          curF[i] = f; curG[i] = cl(g);
          const hop = R || u ? 0 : -6 * Math.sin(Math.PI * seg(t, li, li + 0.3));
          about(p.g, p.cx, p.cy, sc, 0, hop); p.g.setAttribute("opacity", op);
          const gi = 9 * Math.max(0, g); show(p.h1, gi > 0.3);
          p.h1.setAttribute("x", p.x - gi); p.h1.setAttribute("y", p.y - gi); p.h1.setAttribute("width", p.w + 2 * gi); p.h1.setAttribute("height", p.h + 2 * gi); p.h1.setAttribute("rx", 14 + gi);
          p.off.setAttribute("opacity", f);
          p.label.setAttribute("opacity", lk); p.label.setAttribute("transform", `translate(0 ${10 * (1 - lk)})`);
        });
        let to, ty, tr;
        if (R) { const q = io(seg(t, 0, 0.35)); to = 1 - q; ty = -30 * q; tr = 8 - 20 * q; }
        else { const q = ob(seg(t, 6.9, 7.45)); to = seg(t, 6.9, 7.0); ty = -40 * (1 - q); tr = 8 - 16 * (1 - q) + swing(t, 7.45, 9, 8, 2.6) * (1 - seg(t, 8.6, 9.2)); }
        tf(sixTag, 610, 146 + ty, 1, tr); sixTag.setAttribute("opacity", to); tagStr.setAttribute("opacity", to);
      };
    },
  };

  /* ---- 3. a long scroll is snipped down to a short note; the rest rolls into a box ---- */
  SC.scroll = {
    dur: 9.5, still: 9.5,
    build(svg, api) {
      const SX = 110, SW = 260, SY = 120, CY = 240, SB = 540, MX = SX + SW / 2, BXC = 605;
      const ROWS = ["logs", "JSON", "CSV", "test output"];
      const cid = `mgclip${++uid}`;
      const clipR = el("rect", { x: 0, y: 0, width: 800, height: 0 }, el("clipPath", { id: cid }, el("defs", {}, svg)));
      el("rect", { x: 462, y: 364, width: 310, height: 188, rx: 14, fill: LIL }, svg);
      el("rect", { x: 450, y: 352, width: 310, height: 30, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const note = el("g", {}, svg);
      el("rect", { x: SX + 10, y: SY + 10, width: SW, height: CY - SY, fill: LIL }, note);
      el("rect", { x: SX, y: SY, width: SW, height: CY - SY, fill: SKY }, note);
      const noteSoft = el("rect", { x: SX, y: SY, width: SW, height: CY - SY, fill: SOFT }, note);
      const noteLine = el("rect", { x: SX, y: SY, width: SW, height: CY - SY, fill: "none", stroke: INK, "stroke-width": 3 }, note);
      const big = txt(note, MX, 178, "33.2% fewer", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      const small = mono(note, MX, 212, "input tokens", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      const bot = el("g", { "clip-path": `url(#${cid})` }, svg), inner = el("g", {}, bot);
      el("rect", { x: SX + 10, y: CY + 10, width: SW, height: SB - CY, fill: LIL }, inner);
      el("rect", { x: SX, y: CY, width: SW, height: SB - CY, fill: SKY }, inner);
      const botLine = el("rect", { x: SX, y: CY, width: SW, height: SB - CY, fill: "none", stroke: INK, "stroke-width": 3 }, inner);
      const unroll = (t) => 262 + 278 * io(seg(t, 1.3, 2.3));
      const rows = ROWS.map((lab, i) => {
        const y = 256 + i * 70, g = el("g", {}, inner);
        el("rect", { x: SX + 18, y, width: SW - 36, height: 56, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g);
        const lb = mono(g, SX + 34, y + 36, lab, { "font-size": 20, "font-weight": 700 });
        const bx = SX + 34 + lab.length * 12 + 14;
        const bars = [0, 1].map((r) => el("path", { d: `M${bx} ${y + 21 + r * 15} H${SX + SW - 34 - r * 16}`, stroke: LIL, "stroke-width": 6, "stroke-linecap": "round" }, g));
        let at = 2.3; for (let q = 1.3; q < 2.3; q += 0.01) if (unroll(q) >= y + 50) { at = q; break; }
        return { lb, bars, at };
      });
      const joined = el("rect", { x: SX, y: SY, width: SW, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      const cutDash = el("path", { d: `M${SX + 8} ${CY} H${SX + SW - 8}`, stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "8 8", "stroke-linecap": "round" }, svg);
      const cutLine = el("path", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg);
      const roll = el("g", {}, svg);
      el("rect", { x: -140, y: -22, width: 280, height: 44, rx: 22, fill: SKY, stroke: INK, "stroke-width": 3 }, roll);
      const stripes = [0, 1, 2].map(() => el("path", { d: "M-116 0 H116", stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, roll));
      el("rect", { x: 450, y: 368, width: 310, height: 172, rx: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("rect", { x: 476, y: 404, width: 258, height: 100, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      mono(svg, BXC, 446, "every original", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      mono(svg, BXC, 480, "stays on your disk", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      const sci = el("g", {}, svg);
      const half = (sg) => {
        const g = el("g", {}, sci);
        el("path", { d: `M-6 -2 L-40 ${16 * sg}`, stroke: INK, "stroke-width": 10, "stroke-linecap": "round" }, g);
        el("path", { d: `M-6 -2 L-40 ${16 * sg}`, stroke: YEL, "stroke-width": 5, "stroke-linecap": "round" }, g);
        el("circle", { cx: -46, cy: 19 * sg, r: 14, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        el("circle", { cx: -46, cy: 19 * sg, r: 6.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: `M-8 ${-6 * sg} L84 ${-1 * sg} Q86 0 82 ${2 * sg} L-8 ${6 * sg} Z`, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        return g;
      };
      const bladeB = half(-1), bladeA = half(1);
      el("circle", { r: 5, fill: SKY, stroke: INK, "stroke-width": 2 }, sci);
      const bb = el("g", {}, svg);
      hitbox(bb, { x: 438, y: 336, width: 334, height: 218, rx: 20 });
      ring(bb, { x: 438, y: 336, width: 334, height: 218, rx: 20 });
      button(bb, "Blue box: every original stays on your disk. Roll the full scroll back out.", () => {
        if (api.calm) { api.pose(api.posed() ? null : 2.85); return; }
        if (api.t() > 3.9) api.seek(0);
      });
      const rollAt = (t) => {
        if (t < 0.35) return [BXC, 366];
        if (t < 0.6) return [BXC, lerp(366, 336, io(seg(t, 0.35, 0.6)))];
        if (t < 1.3) { const p = 1 - io(seg(t, 0.6, 1.25)); return [lerp(MX, BXC, p), lerp(262, 336, p)]; }
        if (t < 3.9) return [MX, unroll(t)];
        if (t < 4.2) return [MX, 540 + 10 * oc(seg(t, 3.9, 4.1))];
        if (t < 5.1) return [MX, 550 - 278 * io(seg(t, 4.2, 5.0))];
        if (t < 5.8) { const p = io(seg(t, 5.1, 5.8)); return [lerp(MX, BXC, p), lerp(272, 336, p)]; }
        return [BXC, lerp(336, 366, ob(seg(t, 5.8, 6.1)))];
      };
      return (t) => {
        const R = t < 1.3, J = t >= 1.3 && t < 3.9;
        const [rx, ry] = rollAt(t);
        tf(roll, rx, ry);
        stripes.forEach((n, i) => { const a = (rx + ry) / 22 + (i * 2 * Math.PI) / 3; n.setAttribute("transform", `translate(0 ${15 * Math.sin(a)})`); n.setAttribute("opacity", Math.cos(a) > 0 ? 1 : 0); });
        const dy = t >= 3.9 && t < 5.1 ? 10 * oc(seg(t, 3.9, 4.1)) : 0;
        const se = t < 1.3 ? CY : t < 4.2 ? unroll(t) + (t >= 3.9 ? dy : 0) : t < 5.0 ? 550 - 278 * io(seg(t, 4.2, 5.0)) : CY;
        show(bot, se > CY + 0.5); clipR.setAttribute("height", se); inner.setAttribute("transform", `translate(0 ${dy})`);
        show(joined, J); joined.setAttribute("height", Math.max(0, se - SY));
        show(noteLine, !J); show(botLine, !J);
        show(cutDash, J);
        let sx, sy, sr, sa, so, ss = 1;
        if (t < 0.35) { const q = io(seg(t, 0, 0.3)); sx = 575; sy = 215; sr = -16; sa = 8; so = 1 - q; ss = 1 - 0.3 * q; }
        else if (t < 2.4) { sx = -80; sy = CY; sr = 0; sa = 20; so = 0; }
        else if (t < 2.9) { sx = -80 + 110 * ob(seg(t, 2.4, 2.8)); sy = CY; sr = 0; sa = 20; so = seg(t, 2.4, 2.5); }
        else if (t < 3.95) { const u = seg(t, 2.9, 3.85); sx = 30 + 310 * u; sy = CY; sr = 0; sa = 3 + 17 * Math.abs(Math.cos(Math.PI * 6 * u)); so = 1; }
        else { const p = io(seg(t, 3.95, 4.55)), q = ob(seg(t, 3.95, 4.55)); sx = lerp(340, 575, p); sy = lerp(CY, 215, p) - 40 * Math.sin(Math.PI * p); sr = -16 * q; sa = lerp(3, 8, p); so = 1; }
        tf(sci, sx, sy, ss, sr); sci.setAttribute("opacity", so);
        bladeA.setAttribute("transform", `rotate(${-sa})`); bladeB.setAttribute("transform", `rotate(${sa})`);
        const cx = t >= 2.9 && t < 3.95 ? cl(sx + 60, SX, SX + SW) : SX;
        show(cutLine, J && cx > SX); cutLine.setAttribute("d", `M${SX} ${CY} H${cx}`);
        rows.forEach((r) => {
          const k = oc(seg(t, r.at, r.at + 0.3));
          r.lb.setAttribute("opacity", k); r.lb.setAttribute("transform", `translate(${-12 * (1 - k)} 0)`);
          r.bars.forEach((b, j) => b.setAttribute("opacity", oc(seg(t, r.at + 0.08 + j * 0.08, r.at + 0.38 + j * 0.08))));
        });
        const ng = R ? 1 - io(seg(t, 0.1, 0.5)) : io(seg(t, 6.0, 6.5));
        about(note, MX, 180, 1 + 0.12 * ng, 0, 130 * ng);
        noteSoft.setAttribute("opacity", R ? 1 - io(seg(t, 0.4, 0.7)) : io(seg(t, 6.2, 6.6)));
        if (R) { big.setAttribute("opacity", 1 - io(seg(t, 0.05, 0.25))); big.removeAttribute("transform"); small.setAttribute("opacity", 1 - io(seg(t, 0, 0.2))); small.removeAttribute("transform"); }
        else {
          const b = ob(seg(t, 6.6, 7.1)), k = oc(seg(t, 6.85, 7.3));
          big.setAttribute("opacity", seg(t, 6.6, 6.75)); about(big, MX, 166, 0.6 + 0.4 * b);
          small.setAttribute("opacity", k); small.setAttribute("transform", `translate(0 ${12 * (1 - k)})`);
        }
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 6,
    build(svg) {
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 54, width: 152, height: 42, rx: 21, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      mono(pill, 140, 82, "Explainer", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const title = txt(svg, 60, 178, "What is Caveman?", { "font-size": 76, "font-weight": 700 });
      const sub = [["A skill and local proxy that makes coding agents", 230], ["say less and read less", 264]].map(([s, y]) => txt(svg, 64, y, s, { "font-size": 26, "font-weight": 500, fill: MUTE }));
      const chk = mono(svg, 64, 314, "Checked 25 Nov 2026", { "font-size": 18, fill: CAP });
      const tiles = [[64, LIL, "Apache-2.0"], [496, SKY, "v4.2.0, 22 Nov 2026"]].map(([x, col, lab], i) => {
        const g = el("g", {}, svg), cx = x + 200;
        el("rect", { x: x + 10, y: 360, width: 400, height: 144, rx: 20, fill: SOFT }, g);
        el("rect", { x, y: 350, width: 400, height: 144, rx: 20, fill: col, stroke: INK, "stroke-width": 3 }, g);
        const ic = el("g", {}, g);
        if (i === 0) {
          el("rect", { x: cx - 75, y: 378, width: 150, height: 34, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2.5 }, ic);
          [[390, 70], [401, 44]].forEach(([y, w]) => el("path", { d: `M${cx - 60} ${y} H${cx - 60 + w}`, stroke: LIL, "stroke-width": 5, "stroke-linecap": "round" }, ic));
        } else {
          el("path", { d: `M${cx - 22} 390 C${cx - 22} 362 ${cx + 22} 362 ${cx + 22} 390`, stroke: INK, "stroke-width": 9, fill: "none" }, ic);
          el("path", { d: `M${cx - 22} 390 C${cx - 22} 362 ${cx + 22} 362 ${cx + 22} 390`, stroke: BLUE, "stroke-width": 4, fill: "none" }, ic);
          el("rect", { x: cx - 36, y: 380, width: 72, height: 46, rx: 10, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, ic);
          el("path", { d: `M${cx + 36} 394 Q${cx} 406 ${cx - 36} 394`, stroke: INK, "stroke-width": 2, fill: "none" }, ic);
          el("circle", { cx, cy: 400, r: 3.5, fill: YEL, stroke: INK, "stroke-width": 1.5 }, ic);
        }
        const lb = mono(g, cx, 466, lab, { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        return { g, ic, lb, cx };
      });
      return (t) => {
        const p = ob(seg(t, 0.15, 0.55)); about(pill, 140, 75, 0.6 + 0.4 * p); pill.setAttribute("opacity", seg(t, 0.15, 0.3));
        const k = oc(seg(t, 0.35, 0.9)); title.setAttribute("opacity", k); title.setAttribute("transform", `translate(0 ${24 * (1 - k)})`);
        sub.forEach((n, i) => { const q = oc(seg(t, 0.8 + i * 0.1, 1.2 + i * 0.1)); n.setAttribute("opacity", q); n.setAttribute("transform", `translate(0 ${14 * (1 - q)})`); });
        const c = oc(seg(t, 1.05, 1.45)); chk.setAttribute("opacity", c); chk.setAttribute("transform", `translate(0 ${10 * (1 - c)})`);
        tiles.forEach((tl, i) => {
          const q = ob(seg(t, 1.4 + i * 0.12, 1.9 + i * 0.12)); about(tl.g, tl.cx, 422, 0.85 + 0.15 * q); tl.g.setAttribute("opacity", seg(t, 1.4 + i * 0.12, 1.55 + i * 0.12));
          const d = ob(seg(t, 1.9 + i * 0.12, 2.4 + i * 0.12)); tl.ic.setAttribute("transform", `translate(0 ${-30 * (1 - d)})`); tl.ic.setAttribute("opacity", seg(t, 1.9 + i * 0.12, 2.0 + i * 0.12));
          const l = oc(seg(t, 2.4 + i * 0.1, 2.8 + i * 0.1)); tl.lb.setAttribute("opacity", l); tl.lb.setAttribute("transform", `translate(0 ${10 * (1 - l)})`);
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
    let off = 0, raf = 0, seen = false, held = calm, pose = null, cur = sc.still;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => {
      const now = clock();
      if (held) cur = pose == null ? sc.still : pose;
      else { const u = now + off; if (calm && u >= sc.dur) { held = true; cur = sc.still; } else cur = ((u % sc.dur) + sc.dur) % sc.dur; }
      draw(cur, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = {
      calm, now: clock, t: () => cur,
      seek: (s) => { off = s - clock(); pose = null; held = false; tick(); },
      pose: (s) => { pose = s; held = true; tick(); }, posed: () => pose != null,
      redraw: () => tick(),
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
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
