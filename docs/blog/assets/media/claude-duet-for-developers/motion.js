/* Bright coded scenes for "Claude Duet for developers". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SKY_SOFT = "#DDF1FF", LIL_SOFT = "#E6DCFF", GREY = "#CAC3D2";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-weight": 700 }, a));
  const fit = (n, max) => { const w = n.getComputedTextLength(); if (w > max) n.setAttribute("font-size", (+n.getAttribute("font-size") * max) / w); return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  /* back out with an adjustable overshoot: c 1.7 is a lively arrival, c 0.8 a soft one */
  const bk = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const ob = (x) => bk(x);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const dip = (k) => (k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0);
  /* a squash and stretch wobble after a landing: k runs 0 to 1 */
  const squash = (k) => (k > 0 && k < 1 ? Math.sin(k * Math.PI * 2) * (1 - k) * 0.14 : 0);
  /* a soft idle beat: 0 at rest, a smooth hump for the first w of each period P; always at rest when t = end (for d < P * (1 - w)) */
  const bump = (t, end, P, d = 0, w = 0.5) => { if (!isFinite(t)) return 0; const u = ((((t - end - d) / P) % 1) + 1) % 1; return u < w ? Math.sin((Math.PI * u) / w) : 0; };
  /* a cursor blink that is on at t = end */
  const blink = (t, end, P = 0.9) => ((((t - end) / P) % 1) + 1) % 1 < 0.55;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * cl(k)).toString(16).padStart(2, "0")).join(""); };
  const rise = (n, k, d = 16) => { n.setAttribute("transform", `translate(0 ${d * (1 - oc(k))})`); n.setAttribute("opacity", seg(k, 0, 0.4)); };
  const YEL_T = mix(YEL, "#ffffff", 0.45), BLUE_T = mix(BLUE, "#ffffff", 0.68), MINT_T = mix(MINT, "#ffffff", 0.2);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, s, x = 756, y = 50) => txt(svg, x, y, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  /* a small window body: white box, coloured title band, three dots, optional label in the band */
  const winFrame = (p, x0, y0, w, h, band, label, r = 12, bh = 30) => {
    el("rect", { x: x0, y: y0, width: w, height: h, rx: r, fill: "#fff" }, p);
    el("path", { d: `M${x0} ${y0 + bh} V${y0 + r} A${r} ${r} 0 0 1 ${x0 + r} ${y0} H${x0 + w - r} A${r} ${r} 0 0 1 ${x0 + w} ${y0 + r} V${y0 + bh} Z`, fill: band }, p);
    el("path", { d: `M${x0} ${y0 + bh} H${x0 + w}`, stroke: INK, "stroke-width": 2.5 }, p);
    [0, 1, 2].forEach((i) => el("circle", { cx: x0 + 16 + i * 12, cy: y0 + bh / 2, r: 3.6, fill: "#fff", stroke: INK, "stroke-width": 1.8 }, p));
    if (label) fit(txt(p, x0 + 58, y0 + bh / 2 + 6, label, { "font-size": 17, "font-weight": 700 }), w - 70);
    el("rect", { x: x0, y: y0, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 3 }, p);
  };
  /* scale a node about a point */
  const about = (n, x, y, sx, sy = sx, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${sx} ${sy}) translate(${-x} ${-y})`);

  const SC = {};

  /* ---- title card, 16 by 9: a balance scale with an inbox tray and a code block that settles level ---- */
  SC.hero = {
    w: 960, h: 540, dur: 10, still: 10,
    build(svg) {
      const END = 10, CX = 742, PY = 198, L = 130, HANG = 100, GY = 478;
      const pill = el("g", {}, svg);
      const pr = el("rect", { y: -20, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      const pt = txt(pill, 0, 7, "Developers", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      const pw = Math.ceil(pt.getComputedTextLength()) + 40;
      pr.setAttribute("x", -pw / 2); pr.setAttribute("width", pw);
      const l1g = el("g", {}, svg), l2g = el("g", {}, svg);
      const l1 = txt(l1g, 60, 0, "Is Claude Duet good", { "font-size": 60, "font-weight": 700 });
      const l2 = txt(l2g, 60, 0, "for developers?", { "font-size": 60, "font-weight": 700 });
      const TW = 446, tmax = Math.max(l1.getComputedTextLength(), l2.getComputedTextLength());
      if (tmax > TW) [l1, l2].forEach((n) => n.setAttribute("font-size", (60 * TW) / tmax));
      const FS = +l1.getAttribute("font-size"), Y1 = 196, Y2 = Math.round(Y1 + FS * 1.17);
      l1.setAttribute("y", Y1); l2.setAttribute("y", Y2);
      const UL = Math.round(l2.getComputedTextLength() * 0.58), UY = Y2 + 22;
      const under = el("path", { d: `M66 ${UY} H${66 + UL}`, stroke: YEL, "stroke-width": 13, "stroke-linecap": "round", fill: "none" }, svg);
      const s1g = el("g", {}, svg), s2g = el("g", {}, svg);
      const s1 = txt(s1g, 63, UY + 54, "What it does with code,", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const s2 = txt(s2g, 63, UY + 88, "and what it doesn't", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const smax = Math.max(s1.getComputedTextLength(), s2.getComputedTextLength());
      if (smax > 420) [s1, s2].forEach((n) => n.setAttribute("font-size", (26 * 420) / smax));
      const chkG = el("g", {}, svg);
      txt(chkG, 64, 470, "Checked 22 Oct 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });

      /* ground, foot and post */
      const gr = el("g", {}, svg);
      const g1 = el("path", { d: `M576 ${GY} H908`, stroke: SOFT, "stroke-width": 16, "stroke-linecap": "round", fill: "none" }, gr);
      const g2 = el("path", { d: `M576 ${GY} H908`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, gr);
      const foot = el("g", {}, svg);
      el("path", { d: `M${CX - 74} ${GY} L${CX - 52} ${GY - 24} H${CX + 52} L${CX + 74} ${GY} Z`, fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, foot);
      const post = el("g", {}, svg);
      el("rect", { x: CX - 9, y: PY - 30, width: 18, height: GY - 24 - PY + 32, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, post);
      const fin = el("g", {}, svg);
      el("circle", { r: 10, fill: MINT, stroke: INK, "stroke-width": 3 }, fin);
      /* the gauge under the pivot */
      const gauge = el("g", {}, svg);
      el("path", { d: `M${CX - 38} ${PY + 4} A38 38 0 0 0 ${CX + 38} ${PY + 4} Z`, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, gauge);
      [-30, 0, 30].forEach((a) => { const r = (a + 90) * Math.PI / 180; el("path", { d: `M${CX + Math.cos(r) * 27} ${PY + 4 + Math.sin(r) * 27} L${CX + Math.cos(r) * 34} ${PY + 4 + Math.sin(r) * 34}`, stroke: a ? INK : MINT, "stroke-width": a ? 2.5 : 4, "stroke-linecap": "round" }, gauge); });
      const needle = el("path", { d: "M-3.5 0 L0 30 L3.5 0 Z", fill: INK, "stroke-linejoin": "round" }, svg);

      /* the pans hang from the beam ends and stay upright */
      const mkPan = () => {
        const g = el("g", {}, svg), sw = el("g", {}, g);
        el("path", { d: `M0 0 L-54 ${HANG} M0 0 L54 ${HANG}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, sw);
        const item = el("g", {}, sw);
        el("path", { d: `M-64 ${HANG} H64 Q52 ${HANG + 28} 0 ${HANG + 28} Q-52 ${HANG + 28} -64 ${HANG} Z`, fill: SKY, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, sw);
        el("circle", { r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sw);
        return { g, sw, item };
      };
      const beam = el("g", {}, svg);
      el("rect", { x: -L - 12, y: -8, width: 2 * L + 24, height: 16, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, beam);
      const pans = [mkPan(), mkPan()];
      const cap = el("g", {}, svg);
      el("circle", { r: 14, fill: BLUE, stroke: INK, "stroke-width": 3 }, cap);
      el("circle", { r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, cap);

      /* inbox tray: back plate, two sheets, a notched front */
      const tray = el("g", {}, pans[0].item), trayIn = el("g", {}, tray);
      el("rect", { x: -44, y: -44, width: 88, height: 18, rx: 5, fill: YEL_T, stroke: INK, "stroke-width": 2.5 }, trayIn);
      [[-12, -7], [12, 6]].forEach(([x, r]) => {
        const s = el("g", { transform: `translate(${x} -32) rotate(${r})` }, trayIn);
        el("rect", { x: -20, y: -18, width: 40, height: 28, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, s);
        el("rect", { x: -12, y: -10, width: 24, height: 5, rx: 2.5, fill: GREY }, s);
      });
      el("path", { d: "M-48 -30 H-20 L-14 -18 H14 L20 -30 H48 V-5 Q48 2 41 2 H-41 Q-48 2 -48 -5 Z", fill: YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, trayIn);
      /* code block */
      const code = el("g", {}, pans[1].item), codeIn = el("g", {}, code);
      el("rect", { x: -46, y: -56, width: 92, height: 58, rx: 12, fill: BLUE, stroke: INK, "stroke-width": 3 }, codeIn);
      mono(codeIn, 0, -16, "{ }", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });

      /* beam angle: tray lands, it tips left; the block lands, it swings right; then it settles and sways */
      const ang = (t) => {
        let a = -12 * bk(seg(t, 2.55, 3.35), 1.4);
        if (t >= 4.55) a = -12 + 22 * io(seg(t, 4.55, 5.45));
        if (t >= 5.45) { const u = seg(t, 5.45, 8.2); a = 10 * (1 - u) * (1 - u) * Math.cos(Math.PI * 2.5 * u); }
        return a + 0.9 * Math.sin((2 * Math.PI * (t - END)) / 3.6) * seg(t, 8.0, 8.8);
      };
      /* an item pops in just above its pan, then drops in under gravity and squashes */
      const drop = (n, inner, t, a) => {
        const p = seg(t, a - 0.22, a), f = seg(t, a, a + 0.36), y = -36 * (1 - f * f);
        n.setAttribute("transform", `translate(0 ${HANG + 6 + y}) scale(${0.5 + 0.5 * bk(p, 2)})`); n.setAttribute("opacity", seg(p, 0, 0.4));
        const q = squash(seg(t, a + 0.36, a + 0.8));
        inner.setAttribute("transform", `scale(${1 + q} ${1 - q})`);
      };

      return (t) => {
        const a = ob(seg(t, 0.15, 0.6));
        tf(pill, 64 + pw / 2, 96, 0.6 + 0.4 * a); pill.setAttribute("opacity", seg(t, 0.15, 0.3));
        [l1g, l2g].forEach((g, i) => rise(g, seg(t, 0.3 + i * 0.1, 0.9 + i * 0.1), 28));
        const ul = oc(seg(t, 0.95, 1.5)); under.setAttribute("stroke-dasharray", `${UL} ${UL + 20}`); under.setAttribute("stroke-dashoffset", UL * (1 - ul)); under.setAttribute("opacity", ul > 0 ? 1 : 0);
        [s1g, s2g].forEach((g, i) => rise(g, seg(t, 0.62 + i * 0.09, 1.2 + i * 0.09), 16));
        rise(chkG, seg(t, 0.95, 1.4), 10);

        const hk = oc(seg(t, 0.45, 1.1));
        [g1, g2].forEach((n) => { n.setAttribute("stroke-dasharray", "340 360"); n.setAttribute("stroke-dashoffset", 340 * (1 - hk)); });
        gr.setAttribute("opacity", hk > 0 ? 1 : 0);
        const fk = seg(t, 0.6, 1.0); about(foot, CX, GY, 0.5 + 0.5 * ob(fk), 0.3 + 0.7 * ob(fk)); foot.setAttribute("opacity", seg(fk, 0, 0.25));
        const pk = seg(t, 0.8, 1.25); about(post, CX, GY - 24, 1, Math.max(0.02, oc(pk))); post.setAttribute("opacity", pk > 0 ? 1 : 0);
        const nk = seg(t, 1.12, 1.45); tf(fin, CX, PY - 34, ob(nk)); fin.setAttribute("opacity", nk > 0 ? 1 : 0);
        const gk = seg(t, 1.3, 1.65); about(gauge, CX, PY, ob(gk)); gauge.setAttribute("opacity", gk > 0 ? 1 : 0);

        const th = ang(t), rad = (th * Math.PI) / 180;
        const bkk = seg(t, 1.2, 1.7);
        beam.setAttribute("transform", `translate(${CX} ${PY}) rotate(${th}) scale(${Math.max(0.01, bk(bkk, 1.4))} 1)`);
        beam.setAttribute("opacity", bkk > 0 ? 1 : 0);
        tf(needle, CX, PY, 1, th); needle.setAttribute("opacity", seg(t, 1.55, 1.75));
        const ck = seg(t, 1.32, 1.65); tf(cap, CX, PY, ob(ck)); cap.setAttribute("opacity", ck > 0 ? 1 : 0);

        const vel = (ang(t + 0.03) - ang(t - 0.03)) / 0.06;
        pans.forEach((P, i) => {
          const s = i ? 1 : -1, x = CX + s * L * Math.cos(rad), y = PY + s * L * Math.sin(rad);
          const k = seg(t, 1.55 + i * 0.1, 2.0 + i * 0.1);
          tf(P.g, x, y - 26 * (1 - ob(k)), 1, 0);
          P.g.setAttribute("opacity", seg(k, 0, 0.25));
          P.sw.setAttribute("transform", `rotate(${cl(-0.14 * vel, -7, 7)})`);
        });
        drop(tray, trayIn, t, 2.2);
        drop(code, codeIn, t, 4.2);
      };
    },
  };

  /* ---- 1. two overlapping circles: business apps, your repo, and the shared middle ---- */
  SC.venn = {
    dur: 12, still: 12,
    build(svg, api) {
      const END = 12, CY = 322, R = 205, LX = 290, RX = 510, H = Math.sqrt(R * R - 110 * 110), READY = 4.4;
      const hintT = hint(svg, "Tap a chip", 756, 46);
      const fillL = el("circle", { cx: LX, cy: CY, r: R, fill: YEL_T }, svg);
      const fillR = el("circle", { cx: RX, cy: CY, r: R, fill: BLUE_T }, svg);
      const lens = el("path", { d: `M400 ${CY - H} A${R} ${R} 0 0 1 400 ${CY + H} A${R} ${R} 0 0 1 400 ${CY - H} Z`, fill: MINT_T }, svg);
      const C = 2 * Math.PI * R;
      const ringL = el("circle", { cx: LX, cy: CY, r: R, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": `${C} ${C}`, transform: `translate(${LX} ${CY}) scale(-1 1) rotate(-90) translate(${-LX} ${-CY})` }, svg);
      const ringR = el("circle", { cx: RX, cy: CY, r: R, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": `${C} ${C}`, transform: `rotate(-90 ${RX} ${CY})` }, svg);

      /* circle labels with a swatch */
      const label = (x, name, rest, sw, right) => {
        const g = el("g", {}, svg);
        const t = txt(g, 0, 89, name, { "font-size": 21, "font-weight": 700 });
        el("tspan", { "font-weight": 500 }, t).textContent = rest;
        fit(t, 300);
        const w = t.getComputedTextLength(), x0 = right ? x - w : x + 24;
        t.setAttribute("x", x0);
        el("circle", { cx: x0 - 16, cy: 82, r: 9, fill: sw, stroke: INK, "stroke-width": 2.5 }, g);
        return g;
      };
      const labL = label(44, "Claude Duet:", " business apps", YEL_T, false);
      const labR = label(756, "Claude Code:", " your repo", BLUE_T, true);
      const lensG = el("g", {}, svg);
      [["Prototypes", -102], ["and web apps", -79]].forEach(([s, dy]) => {
        const top = dy - 13, room = 2 * (Math.sqrt(R * R - top * top) - 110) - 18;
        fit(txt(lensG, 400, CY + dy, s, { "text-anchor": "middle", "font-size": 17, "font-weight": 700 }), room);
      });

      /* chips */
      const GC = [YEL, BLUE, MINT];
      const NOTE = ["From Anthropic's Claude Duet examples", "From Anthropic's Claude Code page", "Both list it"];
      const mid = (dy, side) => 400 + side * Math.sqrt(R * R - dy * dy);
      const SPEC = [
        ["Gmail", 0, -138, 10], ["QuickBooks", 0, -83, -8], ["Gusto", 0, -28, 12], ["Docusign", 0, 28, -6], ["HubSpot", 0, 83, 10], ["Shopify", 0, 138, -4],
        ["Bug fix", 1, -105, -8], ["Tests", 1, -35, 10], ["Migration", 1, 35, -10], ["Code review", 1, 105, 4],
        ["Prototype", 2, -14, 0], ["Web app", 2, 48, 0],
      ];
      const chipL = el("g", {}, svg);
      let pinned = -1, pinAt = -99, lastT = 0;
      const COUNT = [0, 0, 0];
      const chips = SPEC.map(([s, grp, dy, zig], i) => {
        const g = el("g", {}, chipL), inner = el("g", {}, g);
        const wave = el("rect", { y: -17, height: 34, rx: 17, fill: "none", stroke: GC[grp], "stroke-width": 4, opacity: 0, "vector-effect": "non-scaling-stroke" }, inner);
        const glow = el("rect", { y: -22.5, height: 45, rx: 22.5, fill: "#fff", stroke: INK, "stroke-width": 2.5, opacity: 0 }, inner);
        const r = el("rect", { y: -17, height: 34, rx: 17, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, inner);
        const t = txt(inner, 0, 6, s, { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
        const w = Math.ceil(t.getComputedTextLength()) + 32;
        [r, wave].forEach((n) => { n.setAttribute("x", -w / 2); n.setAttribute("width", w); });
        glow.setAttribute("x", -w / 2 - 5.5); glow.setAttribute("width", w + 11);
        el("rect", { x: -w / 2 - 10, y: -27, width: w + 20, height: 54, rx: 27, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, inner);
        const n = COUNT[grp]++;
        const x = grp === 2 ? 400 : mid(dy, grp === 0 ? -1 : 1) + zig, y = CY + dy;
        const at = [1.5, 2.3, 3.05][grp] + n * (grp === 2 ? 0.14 : 0.1);
        const sx = grp === 0 ? w / 2 + 10 : grp === 1 ? 790 - w / 2 : x, sy = grp === 2 ? 556 : y;
        const pick = () => {
          const now = api.now();
          if (pinned === i && now - pinAt < 0.3) return;
          pinned = i; pinAt = now;
          if (lastT < READY) api.seek(READY); else api.poke();
        };
        button(g, `${s}: ${NOTE[grp]}`, pick);
        g.addEventListener("focus", pick);
        return { g, inner, r, wave, glow, grp, x, y, sx, sy, at, w, rot: grp === 0 ? -14 : grp === 1 ? 14 : 0, i };
      });
      const AUTO = [[5.0, 0], [7.2, 7], [9.4, 10]];

      /* the note under the diagram */
      const note = el("g", {}, svg), noteIn = el("g", {}, note);
      const nBox = el("rect", { y: -22, height: 44, rx: 22, fill: SOFT, stroke: INK, "stroke-width": 2 }, noteIn);
      const nDot = el("circle", { r: 8, fill: YEL, stroke: INK, "stroke-width": 2 }, noteIn);
      const nTxt = txt(noteIn, 0, 7, "", { "font-size": 19, "font-weight": 600 });
      const NW = NOTE.map((s) => { nTxt.textContent = s; return Math.ceil(nTxt.getComputedTextLength()); });
      let shown = -1;

      return (t, now) => {
        if (t < lastT - 0.5) pinned = -1;
        lastT = t;
        const calm = api.calm;
        /* circles draw, then fill */
        [ringL, ringR].forEach((n, i) => { const k = io(seg(t, 0.15 + i * 0.12, 1.15 + i * 0.12)); n.setAttribute("stroke-dashoffset", C * (1 - k)); n.setAttribute("opacity", k > 0 ? 1 : 0); });
        [[fillL, LX], [fillR, RX]].forEach(([n, x], i) => { const k = seg(t, 0.45 + i * 0.12, 1.1 + i * 0.12); about(n, x, CY, 0.86 + 0.14 * ob(k)); n.setAttribute("opacity", seg(k, 0, 0.4)); });
        const lk = seg(t, 1.0, 1.45); about(lens, 400, CY, 0.4 + 0.6 * ob(lk), 0.7 + 0.3 * ob(lk)); lens.setAttribute("opacity", seg(lk, 0, 0.3));
        rise(labL, seg(t, 0.6, 1.1), 14); rise(labR, seg(t, 0.72, 1.22), 14);
        rise(lensG, seg(t, 1.3, 1.75), 10);
        hintT.setAttribute("opacity", seg(t, READY, READY + 0.4));

        /* which chip is lit, and since when */
        let sel = -1, since = 0, live = false;
        if (pinned >= 0) { sel = pinned; since = calm ? 9 : now - pinAt; live = true; }
        else AUTO.forEach(([a, i]) => { if (t >= a) { sel = i; since = t - a; } });
        chips.forEach((c) => {
          const k = seg(t, c.at, c.at + 0.85), e = bk(k, 1.25);
          const x = c.sx + (c.x - c.sx) * e, y = c.sy + (c.y - c.sy) * e - 12 * Math.sin(Math.PI * oc(k)) * (c.grp === 2 ? 0 : 1);
          const bob = -2.5 * bump(t, END, 2.8, (c.i * 0.23) % 1.3, 0.5) * seg(t, READY, READY + 0.5);
          const on = c.i === sel, p = on ? dip(seg(since, 0, 0.45)) : 0;
          const lit0 = on ? (calm ? 1 : oc(seg(since, 0, 0.3))) : 0;
          tf(c.g, x, y + bob, 1 + 0.14 * p + 0.06 * lit0, c.rot * (1 - bk(k, 2.2)));
          c.g.setAttribute("opacity", seg(k, 0, 0.3));
          const q = squash(seg(t, c.at + 0.85, c.at + 1.25));
          c.inner.setAttribute("transform", `scale(${1 + q} ${1 - q})`);
          const lit = on ? (calm ? 1 : seg(since, 0, 0.25)) : 0;
          c.r.setAttribute("fill", mix("#ffffff", GC[c.grp], lit));
          c.glow.setAttribute("opacity", lit);
          /* a wave ring every 1.6 s while lit, at rest at the end of the loop */
          let wu = 2;
          if (on && !calm) wu = live ? (since % 1.6) / 0.9 : (((((t - END - 0.6) / 1.6) % 1) + 1) % 1) / 0.55;
          const wv = wu < 1 && (live || since > 0.3) ? Math.sin(Math.PI * wu) : 0;
          c.wave.setAttribute("opacity", 0.9 * wv);
          c.wave.setAttribute("transform", `scale(${1 + 0.22 * cl(wu)} ${1 + 0.6 * cl(wu)})`);
        });

        if (sel >= 0) {
          const g = chips[sel].grp;
          if (g !== shown) { shown = g; nTxt.textContent = NOTE[g]; const w = NW[g] + 62; nBox.setAttribute("x", -w / 2); nBox.setAttribute("width", w); nDot.setAttribute("cx", -w / 2 + 24); nTxt.setAttribute("x", -w / 2 + 42); nDot.setAttribute("fill", GC[g]); }
        }
        const nk = sel >= 0 ? (calm ? 1 : seg(since, 0.05, 0.4)) : 0;
        tf(note, 400, 566 + 10 * (1 - oc(nk))); note.setAttribute("opacity", seg(nk, 0, 0.6));
      };
    },
  };

  /* ---- 2. two machines: Duet's own virtual machine with a browser, and the places Claude Code runs ---- */
  SC.machines = {
    dur: 12, still: 12,
    build(svg) {
      const END = 12;
      /* left: the cloud, a dotted link, the virtual machine */
      const cloudG = el("g", {}, svg), cS = el("g", {}, cloudG), cF = el("g", {}, cloudG);
      const SH = [["r", 140, 78, 140, 44, 22], ["c", 178, 80, 28], ["c", 218, 66, 36], ["c", 254, 86, 22]];
      const cloud = SH.map((s, i) => {
        const mk = (p, a) => s[0] === "r" ? el("rect", Object.assign({ x: s[1], y: s[2], width: s[3], height: s[4], rx: s[5] }, a), p) : el("circle", Object.assign({ cx: s[1], cy: s[2], r: s[3] }, a), p);
        return { a: mk(cS, { fill: INK, stroke: INK, "stroke-width": 6 }), b: mk(cF, { fill: SKY_SOFT }), cx: s[0] === "r" ? s[1] + s[3] / 2 : s[1], cy: s[0] === "r" ? s[2] + s[4] / 2 : s[2], i };
      });
      const link = [130, 140].map((y) => el("circle", { cx: 210, cy: y, r: 3, fill: INK }, svg));
      const box = el("g", {}, svg);
      el("rect", { x: 40, y: 150, width: 340, height: 406, rx: 26, fill: SOFT, stroke: INK, "stroke-width": 3 }, box);
      const labL = el("g", {}, svg);
      fit(txt(labL, 64, 192, "Claude Duet's virtual machine", { "font-size": 21, "font-weight": 700 }), 292);

      /* the browser: tabs, address bar, two pages of content */
      const BX = 64, BY = 244, BW = 292, BH = 288;
      const browser = el("g", {}, svg);
      const TABS = [76, 162, 248].map((x, i) => {
        const g = el("g", {}, browser);
        const r = el("path", { d: `M${x} ${BY + 2} V${BY - 20} Q${x} ${BY - 30} ${x + 10} ${BY - 30} H${x + 70} Q${x + 80} ${BY - 30} ${x + 80} ${BY - 20} V${BY + 2}`, fill: LIL_SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("circle", { cx: x + 16, cy: BY - 14, r: 5, fill: [BLUE, MINT, YEL][i], stroke: INK, "stroke-width": 1.8 }, g);
        el("rect", { x: x + 28, y: BY - 17, width: 40, height: 6, rx: 3, fill: GREY }, g);
        return { g, r, x };
      });
      el("rect", { x: BX, y: BY, width: BW, height: BH, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, browser);
      const cover = el("rect", { x: 78.5, y: BY - 2, width: 77, height: 6, fill: "#fff" }, browser);
      const addr = el("g", {}, browser);
      el("rect", { x: BX + 16, y: BY + 14, width: BW - 32, height: 28, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 2 }, addr);
      el("circle", { cx: BX + 32, cy: BY + 28, r: 5, fill: "#fff", stroke: INK, "stroke-width": 1.8 }, addr);
      const url = el("rect", { x: BX + 46, y: BY + 25, width: 0, height: 6, rx: 3, fill: MUTE }, addr);
      const pageA = el("g", {}, browser), pageB = el("g", {}, browser);
      const A = [
        el("rect", { x: BX + 16, y: BY + 56, width: BW - 32, height: 40, rx: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, pageA),
        (() => { const g = el("g", {}, pageA); el("rect", { x: BX + 16, y: BY + 108, width: 118, height: 92, rx: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, g); el("circle", { cx: BX + 50, cy: BY + 136, r: 10, fill: YEL, stroke: INK, "stroke-width": 2 }, g); el("path", { d: `M${BX + 22} ${BY + 194} L${BX + 62} ${BY + 158} L${BX + 88} ${BY + 180} L${BX + 104} ${BY + 168} L${BX + 128} ${BY + 194} Z`, fill: MINT, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, g); return g; })(),
        ...[0, 1, 2, 3].map((j) => el("rect", { x: BX + 148, y: BY + 114 + j * 22, width: [124, 96, 112, 70][j], height: 8, rx: 4, fill: GREY }, pageA)),
        ...[0, 1, 2].map((j) => el("rect", { x: BX + 16 + j * 90, y: BY + 214, width: 80, height: 56, rx: 10, fill: [MINT, YEL, SOFT][j], stroke: INK, "stroke-width": 2.5 }, pageA)),
      ];
      const B = [0, 1, 2, 3, 4].map((j) => {
        const g = el("g", {}, pageB), y = BY + 74 + j * 42;
        el("rect", { x: BX + 16, y: y - 16, width: BW - 32, height: 32, rx: 10, fill: j === 1 ? YEL_T : "#fff", stroke: INK, "stroke-width": 2 }, g);
        el("circle", { cx: BX + 34, cy: y, r: 6, fill: [BLUE, YEL, MINT, LIL, SKY][j], stroke: INK, "stroke-width": 1.8 }, g);
        el("rect", { x: BX + 50, y: y - 4, width: [120, 150, 96, 136, 110][j], height: 8, rx: 4, fill: GREY }, g);
        el("rect", { x: BX + BW - 64, y: y - 7, width: 32, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 1.8 }, g);
        return g;
      });
      const ptr = el("g", {}, svg), ptrIn = el("g", {}, ptr);
      el("path", { d: "M0 0 L0 24 L6.5 18.5 L11 28 L15.5 26 L11 16.5 L19 16 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, ptrIn);
      const click = el("circle", { r: 10, fill: "none", stroke: BLUE, "stroke-width": 3, opacity: 0 }, svg);

      /* right: where Claude Code runs */
      const labR = el("g", {}, svg);
      fit(txt(labR, 420, 192, "Where Claude Code runs", { "font-size": 21, "font-weight": 700 }), 340);
      const panel = (x, y, w, h, band, label) => { const g = el("g", {}, svg); winFrame(g, x, y, w, h, band, label); return { g, cx: x + w / 2, cy: y + h / 2 }; };
      const term = panel(420, 214, 170, 116, BLUE, "Terminal");
      const ide = panel(610, 214, 150, 104, LIL, "IDE");
      const slack = panel(610, 333, 150, 104, MINT, "Slack");
      const web = panel(610, 452, 150, 104, SKY, "Web");
      const PANELS = [term, ide, slack, web];
      /* terminal body: two typed lines and a cursor */
      const defs = el("defs", {}, svg);
      const tLines = [[264, 92], [290, 64]].map(([y, w], i) => {
        el("path", { d: `M434 ${y - 6} L441 ${y} L434 ${y + 6}`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, term.g);
        const cp = el("clipPath", { id: `mg-cdd-t${i}` }, defs), wipe = el("rect", { x: 450, y: y - 6, width: 0, height: 12 }, cp);
        const g = el("g", { "clip-path": `url(#mg-cdd-t${i})` }, term.g);
        el("rect", { x: 450, y: y - 4, width: w * 0.45, height: 8, rx: 4, fill: MUTE }, g);
        el("rect", { x: 450 + w * 0.45 + 8, y: y - 4, width: w * 0.55 - 8, height: 8, rx: 4, fill: BLUE }, g);
        return { wipe, w, y };
      });
      const cur = el("rect", { x: 450, y: 306, width: 8, height: 14, rx: 1.5, fill: INK }, term.g);
      el("path", { d: "M434 307 L441 313 L434 319", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, term.g);
      /* IDE body: a gutter and indented code */
      el("path", { d: "M640 254 V308", stroke: GREY, "stroke-width": 2 }, ide.g);
      const ideRows = [[0, 64, LIL], [1, 52, GREY], [1, 70, BLUE], [2, 40, GREY], [0, 30, LIL]].map(([ind, w, c], j) => {
        const y = 258 + j * 11;
        el("rect", { x: 622, y: y - 2, width: 8, height: 4, rx: 2, fill: GREY }, ide.g);
        return el("rect", { x: 650 + ind * 14, y: y - 3, width: 0, height: 6, rx: 3, fill: c, "data-w": w }, ide.g);
      });
      /* Slack body: two messages */
      const msgs = [[0, 387, 84], [1, 417, 70]].map(([side, y, w]) => {
        const g = el("g", {}, slack.g), x = side ? 744 - w : 626;
        el("rect", { x, y: y - 12, width: w, height: 24, rx: 10, fill: side ? MINT : SOFT, stroke: INK, "stroke-width": 2 }, g);
        el("rect", { x: x + 12, y: y - 3, width: w - 24, height: 6, rx: 3, fill: side ? "#fff" : GREY }, g);
        return { g, x: x + (side ? w : 0), y: y + 12 };
      });
      /* Web body: an address pill and a block */
      const webIn = el("g", {}, web.g);
      el("rect", { x: 624, y: 494, width: 122, height: 16, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 1.8 }, webIn);
      el("rect", { x: 624, y: 518, width: 56, height: 26, rx: 6, fill: SKY, stroke: INK, "stroke-width": 2 }, webIn);
      [0, 1].forEach((j) => el("rect", { x: 690, y: 522 + j * 12, width: [56, 40][j], height: 6, rx: 3, fill: GREY }, webIn));

      /* the repo tree under the terminal */
      const TX = 451;
      const folder = el("g", {}, svg), folderIn = el("g", {}, folder);
      const fHalo = el("rect", { x: -20, y: -16, width: 40, height: 32, rx: 9, fill: "none", stroke: MINT, "stroke-width": 4, opacity: 0 }, folder);
      el("path", { d: "M-16 -12 H-4 L0 -7 H16 V12 H-16 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, folderIn);
      el("path", { d: "M-16 -3 H16", stroke: INK, "stroke-width": 2 }, folderIn);
      const repoL = el("g", {}, svg);
      txt(repoL, 476, 408, "Your repo", { "font-size": 19, "font-weight": 700 });
      const trunk = el("path", { d: `M${TX} 416 V502`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "86 90" }, svg);
      const files = [438, 470, 502].map((y, j) => {
        const g = el("g", {}, svg);
        el("path", { d: `M${TX} ${y} H${TX + 16}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
        el("path", { d: `M${TX + 20} ${y - 11} H${TX + 31} L${TX + 37} ${y - 5} V${y + 11} H${TX + 20} Z`, fill: "#fff", stroke: INK, "stroke-width": 2.2, "stroke-linejoin": "round" }, g);
        el("rect", { x: TX + 46, y: y - 4, width: [76, 58, 92][j], height: 8, rx: 4, fill: GREY }, g);
        return g;
      });
      /* the dotted line from the terminal down to the repo */
      const DOTS = [340, 350, 360, 370, 380].map((y) => el("circle", { cx: TX, cy: y, r: 3.2, fill: INK }, svg));
      const sig = el("circle", { cx: TX, r: 5.5, fill: MINT, stroke: INK, "stroke-width": 2, opacity: 0 }, svg);

      return (t) => {
        /* left */
        const settle = seg(t, 7.6, 8.4), bob = -4 * Math.sin((2 * Math.PI * (t - END)) / 3.4) * settle;
        cloudG.setAttribute("transform", `translate(0 ${bob})`);
        cloud.forEach((c) => {
          const k = c.i === 0 ? oc(seg(t, 0.3, 0.7)) : ob(seg(t, 0.4 + c.i * 0.09, 0.82 + c.i * 0.09));
          const tr = c.i === 0 ? `translate(${c.cx} ${c.cy}) scale(${0.7 + 0.3 * k} ${0.85 + 0.15 * k}) translate(${-c.cx} ${-c.cy})` : `translate(${c.cx} ${c.cy}) scale(${k}) translate(${-c.cx} ${-c.cy})`;
          [c.a, c.b].forEach((n) => { n.setAttribute("transform", tr); n.setAttribute("opacity", c.i === 0 ? seg(t, 0.3, 0.45) : k > 0 ? 1 : 0); });
        });
        link.forEach((d, j) => { const k = seg(t, 0.85 + j * 0.08, 1.1 + j * 0.08); d.setAttribute("r", 3 * ob(k)); d.setAttribute("opacity", k > 0 ? 1 : 0); });
        const bx = seg(t, 0.1, 0.6); box.setAttribute("opacity", seg(bx, 0, 0.4)); box.setAttribute("transform", `translate(0 ${22 * (1 - oc(bx))})`);
        rise(labL, seg(t, 0.35, 0.8), 12);
        const wk = seg(t, 0.9, 1.35); about(browser, 210, 388, 0.82 + 0.18 * ob(wk)); browser.setAttribute("opacity", seg(wk, 0, 0.3));
        const sw = seg(t, 3.05, 3.2), active = sw > 0.5 ? 1 : 0;
        TABS.forEach((T, j) => {
          const k = seg(t, 1.15 + j * 0.1, 1.45 + j * 0.1);
          T.g.setAttribute("transform", `translate(0 ${12 * (1 - ob(k))})`); T.g.setAttribute("opacity", k > 0 ? 1 : 0);
          T.r.setAttribute("fill", j === active ? "#fff" : LIL_SOFT);
        });
        cover.setAttribute("x", TABS[active].x + 2.5);
        cover.setAttribute("opacity", seg(t, 1.3, 1.45));
        addr.setAttribute("opacity", seg(t, 1.45, 1.65));
        url.setAttribute("width", active ? 20 + 100 * oc(seg(t, 3.2, 3.65)) : 150 * oc(seg(t, 1.6, 2.0)));
        const fa = 1 - seg(t, 3.08, 3.25);
        pageA.setAttribute("opacity", fa);
        A.forEach((n, j) => { const k = seg(t, 1.7 + j * 0.07, 2.1 + j * 0.07); n.setAttribute("opacity", seg(k, 0, 0.4)); n.setAttribute("transform", `translate(0 ${10 * (1 - oc(k))})`); });
        B.forEach((n, j) => { const k = seg(t, 3.3 + j * 0.08, 3.7 + j * 0.08); n.setAttribute("opacity", seg(k, 0, 0.4)); n.setAttribute("transform", `translate(${-14 * (1 - oc(k))} 0)`); });
        /* the pointer glides to the second tab and clicks */
        const pm = io(seg(t, 2.35, 3.0)), pa = seg(t, 2.2, 2.4);
        const px = 300 + (200 - 300) * pm, py = 470 + (BY - 16 - 470) * pm - 30 * Math.sin(Math.PI * pm);
        const pe = io(seg(t, 3.35, 3.9)), qx = px + 34 * pe, qy = py + 6 * pe;
        const pc = dip(seg(t, 3.0, 3.18));
        tf(ptr, qx, qy, 1 - 0.12 * pc); ptr.setAttribute("opacity", pa);
        const ck = seg(t, 3.02, 3.5); tf(click, 200, BY - 16, 0.4 + 1.4 * oc(ck)); click.setAttribute("opacity", ck > 0 && ck < 1 ? 1 - ck : 0);

        /* right */
        rise(labR, seg(t, 2.6, 3.05), 12);
        PANELS.forEach((P, j) => {
          const k = seg(t, 3.2 + j * 0.55, 3.7 + j * 0.55);
          P.g.setAttribute("transform", `translate(0 ${18 * (1 - oc(k))}) translate(${P.cx} ${P.cy}) scale(${0.6 + 0.4 * ob(k)}) translate(${-P.cx} ${-P.cy})`);
          P.g.setAttribute("opacity", seg(k, 0, 0.3));
        });
        let typing = false;
        tLines.forEach((L, j) => { const a = 3.7 + j * 0.55, p = Math.floor(seg(t, a, a + 0.45) * 8) / 8; L.wipe.setAttribute("width", p * (L.w + 2)); if (t >= a && t < a + 0.5) typing = true; });
        cur.setAttribute("opacity", seg(t, 3.5, 3.6) > 0 && (typing || blink(t, END)) ? 1 : 0);
        ideRows.forEach((n, j) => n.setAttribute("width", +n.getAttribute("data-w") * oc(seg(t, 4.2 + j * 0.08, 4.5 + j * 0.08))));
        msgs.forEach((M, j) => { const k = seg(t, 4.8 + j * 0.3, 5.15 + j * 0.3); about(M.g, M.x, M.y, ob(k)); M.g.setAttribute("opacity", k > 0 ? 1 : 0); });
        const wb = seg(t, 5.35, 5.7); webIn.setAttribute("opacity", seg(wb, 0, 0.5)); webIn.setAttribute("transform", `translate(0 ${8 * (1 - oc(wb))})`);

        /* the repo, then the dotted line, then a connect flash and an idle signal */
        const fk = seg(t, 5.7, 6.15), hit = seg(t, 7.35, 7.95);
        tf(folder, TX, 400, ob(fk) * (1 + 0.1 * dip(seg(t, 7.35, 7.7))), -10 * (1 - ob(fk)));
        folder.setAttribute("opacity", fk > 0 ? 1 : 0);
        const q = squash(seg(t, 7.35, 7.85)); folderIn.setAttribute("transform", `scale(${1 + q} ${1 - q})`);
        fHalo.setAttribute("opacity", hit > 0 && hit < 1 ? 1 - hit : 0); fHalo.setAttribute("transform", `scale(${1 + 0.6 * oc(hit)})`);
        rise(repoL, seg(t, 5.85, 6.3), 10);
        trunk.setAttribute("stroke-dashoffset", 86 * (1 - oc(seg(t, 6.0, 6.4))));
        files.forEach((g, j) => { const k = seg(t, 6.15 + j * 0.1, 6.5 + j * 0.1); g.setAttribute("opacity", seg(k, 0, 0.4)); g.setAttribute("transform", `translate(${-12 * (1 - oc(k))} 0)`); });
        DOTS.forEach((d, j) => { const k = seg(t, 6.75 + j * 0.11, 7.0 + j * 0.11); d.setAttribute("r", 3.2 * ob(k)); d.setAttribute("opacity", k > 0 ? 1 : 0); });
        const u = ((((t - END - 0.4) / 2.6) % 1) + 1) % 1, on = seg(t, 8.2, 8.3) > 0 && u < 0.45;
        const su = u / 0.45;
        sig.setAttribute("cy", 334 + 50 * io(su)); sig.setAttribute("opacity", on ? Math.sin(Math.PI * su) : 0);
      };
    },
  };

  /* ---- 3. a day from 08:00 to 08:00 with three bands and a scrubber ---- */
  SC.day = {
    dur: 13, still: 13,
    build(svg, api) {
      const END = 13, X0 = 268, X1 = 716, PH = (X1 - X0) / 24, AY = 490, READY = 5.6, TOP = 140, RY = 122;
      const LY = [194, 304, 414];
      const hx = (h) => X0 + h * PH;
      const hintT = hint(svg, "Drag the time", 756, 50);
      const BANDS = [
        { a: 0, b: 1.5, c: YEL, name: "Claude Duet:", sub: "morning brief" },
        { a: 2, b: 10, c: BLUE, name: "Claude Code:", sub: "you at the keyboard" },
        { a: 14, b: 22, c: MINT, name: "Munder Difflin:", sub: "scheduled agents" },
      ];
      /* grid, tracks, axis */
      const grid = el("g", {}, svg);
      [0, 4, 10, 16, 22, 24].forEach((h) => el("path", { d: `M${hx(h)} ${TOP + 16} V${AY - 8}`, stroke: GREY, "stroke-width": 2, "stroke-dasharray": "2 7", "stroke-linecap": "round" }, grid));
      const tracks = LY.map((y) => el("rect", { x: X0, y: y - 15, width: X1 - X0, height: 30, rx: 15, fill: SOFT }, svg));
      const axis = el("path", { d: `M${X0} ${AY} H${X1}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-dasharray": `${X1 - X0} ${X1 - X0 + 10}` }, svg);
      const hrs = el("g", {}, svg);
      for (let h = 1; h < 24; h++) if (![4, 10, 16, 22].includes(h)) el("path", { d: `M${hx(h)} ${AY - 4} V${AY + 4}`, stroke: MUTE, "stroke-width": 1.8, "stroke-linecap": "round" }, hrs);
      const MARKS = [[0, "08:00", "end"], [4, "12:00"], [10, "18:00"], [16, "00:00"], [22, "06:00"], [24, "08:00", "start"]].map(([h, s, side]) => {
        const g = el("g", {}, svg);
        el("path", { d: `M${hx(h)} ${AY - (side ? 10 : 8)} V${AY + (side ? 10 : 8)}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        if (side) mono(g, hx(h) + (side === "end" ? -23 : 23), AY + 6, s, { "text-anchor": side, "font-size": 17, fill: INK });
        else mono(g, hx(h), AY + 40, s, { "text-anchor": "middle", "font-size": 17, fill: MUTE });
        return { g, x: hx(h) };
      });
      /* lane labels in the left column */
      const labs = BANDS.map((B, i) => {
        const g = el("g", {}, svg), y = LY[i] + (i === 0 ? -10 : 3);
        const n = txt(g, 40, y - 4, B.name, { "font-size": 21, "font-weight": 700 });
        const s = txt(g, 40, y + 21, B.sub, { "font-size": 19, "font-weight": 700 });
        fit(n, 206); fit(s, 206);
        s.setAttribute("font-weight", 500); n.setAttribute("font-weight", 600);
        return { g, n, s };
      });
      const legend = el("g", {}, svg);
      el("rect", { x: 40, y: LY[0] + 26, width: 8, height: 20, rx: 3, fill: YEL, stroke: INK, "stroke-width": 2 }, legend);
      txt(legend, 58, LY[0] + 42, "checks", { "font-size": 18, "font-weight": 500, fill: MUTE });
      /* bands with a hard shadow that shows when they lift */
      const bands = BANDS.map((B, i) => {
        const x = hx(B.a), w = (B.b - B.a) * PH, y = LY[i] - 15;
        const sh = el("rect", { x, y, width: w, height: 30, rx: 12, fill: INK, opacity: 0 }, svg);
        const g = el("g", {}, svg);
        const r = el("rect", { x, y, width: w, height: 30, rx: 12, fill: B.c, stroke: INK, "stroke-width": 2.5 }, g);
        return Object.assign({ sh, g, r, x, w, y, on: false, at: -99 }, B);
      });
      const checks = [4, 8, 12, 16, 20].map((h) => {
        const g = el("g", {}, svg);
        el("rect", { x: -4, y: -11, width: 8, height: 22, rx: 3, fill: YEL, stroke: INK, "stroke-width": 2 }, g);
        return { g, h, x: hx(h) };
      });
      /* the scrubber: knob first so the focus styles find it, then the line and the readout */
      const scrub = el("g", { role: "slider", tabindex: "0", "aria-label": "Time of day", "aria-valuemin": 0, "aria-valuemax": 24, class: "mg-hit" }, svg);
      el("circle", { r: 26, fill: "#fff", "fill-opacity": 0 }, scrub);
      const knob = el("circle", { r: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, scrub);
      el("circle", { r: 21, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 4", class: "mg-ring" }, scrub);
      const halo = el("circle", { r: 14, fill: "none", stroke: YEL, "stroke-width": 4, opacity: 0 }, scrub);
      const line = el("path", { d: `M0 -14 V${TOP - AY}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, scrub);
      const ro = el("g", {}, scrub);
      el("rect", { x: -42, y: -17, width: 84, height: 34, rx: 17, fill: INK }, ro);
      const roT = mono(ro, 0, 6.5, "08:00", { "text-anchor": "middle", "font-size": 18, fill: "#fff" });
      const hit = el("rect", { x: X0 - 24, y: TOP - 4, width: X1 - X0 + 48, height: AY - TOP + 34, fill: "#fff", "fill-opacity": 0 }, svg);
      svg.insertBefore(hit, scrub);
      const clock = (h) => String((8 + Math.round(h)) % 24).padStart(2, "0") + ":00";

      /* scrubber state: null follows the autoplay, a number is the viewer's own hour */
      const autoV = (t) => 6 * io(seg(t, 6.0, 7.4)) + 12 * io(seg(t, 8.4, 10.2));
      let user = null, drag = null, down = false, lastT = 0, snapFrom = 0, snapAt = -99;
      const inBand = (B, v) => v >= B.a - 0.01 && v <= B.b + 0.01;
      const setV = (v, now) => { user = v; bands.forEach((B) => { const on = inBand(B, v); if (B.on !== on) { B.on = on; B.at = now; } }); api.poke(); };
      const first = () => { if (user === null) { const v = Math.round(autoV(lastT)); bands.forEach((B) => { B.on = inBand(B, v); B.at = -99; }); user = v; if (lastT < READY) api.seek(READY); } };
      const fromX = (e) => { const r = svg.getBoundingClientRect(); return cl((((e.clientX - r.left) / r.width) * 800 - X0) / PH, 0, 24); };
      const dragTo = (e) => { first(); drag = fromX(e); setV(Math.round(drag), api.now()); };
      [scrub, hit].forEach((n) => n.addEventListener("pointerdown", (e) => { down = true; try { scrub.setPointerCapture(e.pointerId); } catch (_) {} dragTo(e); scrub.focus && scrub.focus({ preventScroll: true }); }));
      scrub.addEventListener("pointermove", (e) => { if (down) dragTo(e); });
      const up = () => { if (drag !== null) { snapFrom = drag; snapAt = api.now(); } down = false; drag = null; api.poke(); };
      scrub.addEventListener("pointerup", up); scrub.addEventListener("pointercancel", up);
      scrub.addEventListener("keydown", (e) => {
        const k = e.key, cur = user === null ? Math.round(autoV(lastT)) : user;
        const n = k === "ArrowRight" || k === "ArrowUp" ? cur + 1 : k === "ArrowLeft" || k === "ArrowDown" ? cur - 1 : k === "PageUp" ? cur + 3 : k === "PageDown" ? cur - 3 : k === "Home" ? 0 : k === "End" ? 24 : null;
        if (n === null) return;
        e.preventDefault(); first(); snapFrom = cur; snapAt = api.now(); setV(Math.max(0, Math.min(24, n)), api.now());
      });

      return (t, now) => {
        if (t < lastT - 0.5 && !down) user = null;
        lastT = t;
        const calm = api.calm;
        grid.setAttribute("opacity", seg(t, 0.1, 0.6));
        tracks.forEach((n, i) => { const k = seg(t, 0.5 + i * 0.1, 0.95 + i * 0.1); n.setAttribute("opacity", seg(k, 0, 0.4)); n.setAttribute("transform", `translate(${-24 * (1 - oc(k))} 0)`); });
        axis.setAttribute("stroke-dashoffset", (X1 - X0) * (1 - oc(seg(t, 0.2, 0.95))));
        hrs.setAttribute("opacity", seg(t, 0.7, 1.1));
        MARKS.forEach((M, i) => { const k = seg(t, 0.4 + i * 0.09, 0.8 + i * 0.09); M.g.setAttribute("opacity", seg(k, 0, 0.3)); M.g.setAttribute("transform", `translate(0 ${10 * (1 - ob(k))})`); });
        hintT.setAttribute("opacity", seg(t, READY - 0.3, READY + 0.1));

        /* where the scrubber is */
        let v;
        if (drag !== null) v = drag;
        else if (user !== null) v = calm ? user : snapFrom + (user - snapFrom) * oc(seg(now - snapAt, 0, 0.22));
        else v = autoV(t);
        const shownH = user !== null ? user : Math.round(v);

        bands.forEach((B, i) => {
          let lift;
          if (user !== null) lift = calm ? +B.on : B.on ? bk(seg(now - B.at, 0, 0.35), 2) : 1 - io(seg(now - B.at, 0, 0.25));
          else { const e = Math.min(seg(v, B.a - 0.35, B.a + 0.05), 1 - seg(v, B.b - 0.05, B.b + 0.35)); lift = t < 5.5 ? 0 : bk(e, 2); }
          const k = i === 0 ? seg(t, 1.5, 1.9) : seg(t, 3.0 + (i - 1) * 1.0, 3.8 + (i - 1) * 1.0);
          const pop = i === 0 ? Math.max(0.01, ob(k)) : 1, cx = B.x + B.w / 2;
          if (i > 0) { const w = Math.max(0.1, B.w * oc(k)); B.r.setAttribute("width", w); B.sh.setAttribute("width", w); }
          B.g.setAttribute("opacity", k > 0 ? 1 : 0);
          B.g.setAttribute("transform", `translate(0 ${-6 * lift}) translate(${cx} ${LY[i]}) scale(${pop}) translate(${-cx} ${-LY[i]})`);
          B.sh.setAttribute("opacity", k >= 1 ? cl(lift * 3) : 0);
          const L = labs[i], lk = seg(t, [1.4, 2.9, 3.9][i], [1.85, 3.35, 4.35][i]);
          rise(L.g, lk, 12);
          const bold = lift > 0.5;
          L.n.setAttribute("font-weight", bold ? 700 : 600); L.s.setAttribute("font-weight", bold ? 700 : 500);
          L.s.setAttribute("fill", mix(MUTE, INK, cl(lift)));
        });
        checks.forEach((C, j) => {
          const k = seg(t, 2.0 + j * 0.09, 2.35 + j * 0.09), near = t > 5.5 ? cl(1 - Math.abs(v - C.h) / 0.6) : 0;
          tf(C.g, C.x, LY[0] - 5 * near, ob(k) * (1 + 0.18 * near)); C.g.setAttribute("opacity", k > 0 ? 1 : 0);
        });
        rise(legend, seg(t, 2.6, 3.0), 8);

        /* the scrubber arrives at 08:00, then sweeps; it pulses softly once it rests */
        const sk = seg(t, 5.0, 5.4), lk2 = oc(seg(t, 5.1, 5.55)), rk = seg(t, 5.35, 5.75);
        scrub.setAttribute("transform", `translate(${hx(v)} ${AY})`);
        scrub.setAttribute("opacity", sk > 0 ? 1 : 0);
        knob.setAttribute("r", 14 * ob(sk));
        line.setAttribute("d", `M0 -14 V${-14 + (TOP - AY + 14) * lk2}`);
        line.setAttribute("opacity", lk2 > 0.02 ? 1 : 0);
        const rx = cl(hx(v), 40 + 42, 800 - 40 - 42) - hx(v);
        ro.setAttribute("transform", `translate(${rx} ${RY - AY}) scale(${0.4 + 0.6 * ob(rk)})`);
        ro.setAttribute("opacity", seg(rk, 0, 0.3));
        roT.textContent = clock(shownH);
        scrub.setAttribute("aria-valuenow", Math.round(shownH));
        scrub.setAttribute("aria-valuetext", clock(shownH));
        const pu = calm ? 0 : bump(t, END, 2.2, 0, 0.6) * seg(t, 10.6, 11.0);
        const pk = ((((t - END) / 2.2) % 1) + 1) % 1 / 0.6;
        halo.setAttribute("r", 14 + 16 * cl(pk)); halo.setAttribute("opacity", pu);
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
