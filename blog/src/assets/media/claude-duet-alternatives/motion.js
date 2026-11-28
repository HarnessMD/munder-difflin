/* Bright coded scenes for "Claude Duet alternatives". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SKY_SOFT = "#DDF1FF", YEL_SOFT = "#FFE9B0", DESK = "#FFE7A8";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const ios = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * cl(k)).toString(16).padStart(2, "0")).join(""); };
  /* a soft idle beat: 0 at rest, a smooth hump for the first w of each period P; always at rest when t = end */
  const bump = (t, end, P, d = 0, w = 0.5) => { if (!isFinite(t)) return 0; const u = ((((t - end - d) / P) % 1) + 1) % 1; return u < w ? Math.sin(Math.PI * u / w) : 0; };
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hint = (svg, s, y = 60) => txt(svg, 756, y, s, { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
  /* a rounded token centred on its origin, sized to its label, with an optional coloured dot */
  const token = (p, label, fill, dot, fs = 18) => {
    const g = el("g", {}, p), inner = el("g", {}, g);
    const halo = el("rect", { y: -17, height: 34, rx: 17, fill: "none", stroke: SKY, "stroke-width": 4, opacity: 0 }, inner);
    const r = el("rect", { y: -17, height: 34, rx: 17, fill, stroke: INK, "stroke-width": 2.5 }, inner);
    const padL = dot ? 31 : 16;
    const t = txt(inner, 0, 6, label, { "font-size": fs, "font-weight": 700 });
    const w = Math.ceil(t.getComputedTextLength()) + padL + 16;
    t.setAttribute("x", -w / 2 + padL);
    [r, halo].forEach((n) => { n.setAttribute("x", -w / 2); n.setAttribute("width", w); });
    if (dot) el("circle", { cx: -w / 2 + 17, cy: 0, r: 7, fill: dot, stroke: INK, "stroke-width": 2 }, inner);
    return { g, inner, halo, w };
  };
  const plen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const pat = (pts, d) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d <= L || i === pts.length - 1) { const k = L ? cl(d / L) : 0; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }
      d -= L;
    }
    return pts[pts.length - 1];
  };
  const pd = (pts) => "M" + pts.map((p) => p.join(" ")).join(" L");
  const dash = (n, L, p) => { n.setAttribute("stroke-dasharray", `${L} ${L + 2}`); n.setAttribute("stroke-dashoffset", L * (1 - p)); n.setAttribute("opacity", p > 0.001 ? 1 : 0); };

  const SC = {};

  /* ---- title card, 16 by 9: a stuck waitlist beside four open lanes ---- */
  SC.hero = {
    w: 960, h: 540, dur: 10, still: 10,
    build(svg) {
      const END = 10;
      const pill = el("g", {}, svg);
      const pr = el("rect", { y: -20, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      const pt = txt(pill, 0, 7, "Alternatives", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      const pw = Math.ceil(pt.getComputedTextLength()) + 40;
      pr.setAttribute("x", -pw / 2); pr.setAttribute("width", pw);
      const l1g = el("g", {}, svg), l2g = el("g", {}, svg);
      const l1 = txt(l1g, 60, 198, "Claude Duet", { "font-size": 76, "font-weight": 700 });
      const l2 = txt(l2g, 60, 276, "alternatives", { "font-size": 76, "font-weight": 700 });
      const tmax = Math.max(l1.getComputedTextLength(), l2.getComputedTextLength());
      if (tmax > 486) [l1, l2].forEach((n) => n.setAttribute("font-size", (76 * 486) / tmax));
      const UL = Math.round(l2.getComputedTextLength() * 0.62);
      const under = el("path", { d: `M66 300 H${66 + UL}`, stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", fill: "none" }, svg);
      const subg = el("g", {}, svg);
      const sub = txt(subg, 64, 356, "Proactive agents with no waitlist", { "font-size": 27, "font-weight": 500, fill: MUTE });
      if (sub.getComputedTextLength() > 490) sub.setAttribute("font-size", (27 * 490) / sub.getComputedTextLength());
      const chk = txt(svg, 64, 476, "Checked 22 Oct 2026", { "font-size": 18, "font-weight": 500, fill: MUTE });

      /* the waitlist: a post, a sign and a short queue of paper tickets */
      const floorS = el("path", { d: "M606 216 H904", stroke: SOFT, "stroke-width": 14, "stroke-linecap": "round", fill: "none" }, svg);
      const floorI = el("path", { d: "M606 216 H904", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none" }, svg);
      const post = el("path", { d: "M640 214 V106", stroke: INK, "stroke-width": 5, "stroke-linecap": "round", fill: "none" }, svg);
      const sign = el("g", {}, svg);
      const sr = el("rect", { y: -48, height: 44, rx: 12, fill: LIL, stroke: INK, "stroke-width": 2.5 }, sign);
      const st = txt(sign, 0, -19, "Waitlist", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 });
      const sw = Math.ceil(st.getComputedTextLength()) + 40;
      sr.setAttribute("x", -sw / 2); sr.setAttribute("width", sw);
      el("circle", { cx: 0, cy: -4, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sign);
      const TILT = [-4, 3, -2, 4];
      const tickets = [0, 1, 2, 3].map((i) => {
        const g = el("g", {}, svg);
        el("path", { d: "M-23 -64 H23 V-38 A6 6 0 0 0 23 -26 V0 H-23 V-26 A6 6 0 0 0 -23 -38 Z", fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
        el("path", { d: "M-15 -32 H15", stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 4" }, g);
        el("rect", { x: -11, y: -54, width: 22, height: 8, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, g);
        txt(g, 0, -7, String(i + 1), { "text-anchor": "middle", "font-family": MONO, "font-size": 21, "font-weight": 700 });
        return { g, x: 686 + i * 56 };
      });

      /* four lanes that light up, each tagged Open now */
      const defs = el("defs", {}, svg);
      const lanes = [0, 1, 2, 3].map((i) => {
        const y = 236 + i * 58, g = el("g", {}, svg);
        const cp = el("clipPath", { id: `mg-dalt-lane${i}` }, defs);
        const wipe = el("rect", { x: 588, y: y - 2, width: 0, height: 50 }, cp);
        el("rect", { x: 590, y, width: 326, height: 46, rx: 23, fill: SOFT }, g);
        el("rect", { x: 590, y, width: 326, height: 46, rx: 23, fill: SKY, "clip-path": `url(#mg-dalt-lane${i})` }, g);
        el("rect", { x: 590, y, width: 326, height: 46, rx: 23, fill: "none", stroke: INK, "stroke-width": 2.5 }, g);
        const halo = el("circle", { cx: 616, cy: y + 23, r: 10, fill: "none", stroke: YEL, "stroke-width": 4, opacity: 0 }, g);
        const lamp = el("circle", { cx: 616, cy: y + 23, r: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const chev = el("path", { d: [646, 664, 682].map((x) => `M${x} ${y + 15} L${x + 8} ${y + 23} L${x} ${y + 31}`).join(" "), stroke: INK, "stroke-width": 3, "stroke-linecap": "round", "stroke-linejoin": "round", fill: "none" }, g);
        const tag = token(svg, "Open now", MINT, null, 17);
        return { g, wipe, halo, lamp, chev, tag, y, at: 3.0 + i * 0.55 };
      });

      return (t) => {
        const a = ob(seg(t, 0.15, 0.6));
        tf(pill, 64 + pw / 2, 82, 0.6 + 0.4 * a); pill.setAttribute("opacity", seg(t, 0.15, 0.3));
        [l1g, l2g].forEach((g, i) => { const k = seg(t, 0.32 + i * 0.1, 0.92 + i * 0.1); tf(g, 0, 26 * (1 - oc(k))); g.setAttribute("opacity", seg(k, 0, 0.4)); });
        dash(under, UL, oc(seg(t, 0.85, 1.4)));
        const ks = seg(t, 0.62, 1.2); tf(subg, 0, 16 * (1 - oc(ks))); subg.setAttribute("opacity", seg(ks, 0, 0.5));
        chk.setAttribute("opacity", seg(t, 0.8, 1.2));

        const fl = oc(seg(t, 0.9, 1.5)); dash(floorS, 298, fl); dash(floorI, 298, fl);
        dash(post, 108, oc(seg(t, 1.0, 1.35)));
        tf(sign, 640, 106, ob(seg(t, 1.25, 1.7)), 0);
        const settle = seg(t, 5.0, 5.4);
        tickets.forEach((k, i) => {
          const e = seg(t, 1.35 + i * 0.1, 1.9 + i * 0.1);
          const nud = bump(t, END, 2.5, i * 0.09, 0.4) * settle;
          tf(k.g, k.x - 7 * nud, 214 - 44 * (1 - oc(e)), 0.86 + 0.14 * ob(e), TILT[i] + (1 - ob(e)) * -16 - 3 * nud);
          k.g.setAttribute("opacity", seg(e, 0, 0.3));
        });
        lanes.forEach((L, i) => {
          const e = seg(t, 1.7 + i * 0.09, 2.3 + i * 0.09);
          tf(L.g, 40 * (1 - ob(e)), 0); L.g.setAttribute("opacity", seg(e, 0, 0.4));
          L.wipe.setAttribute("width", 332 * oc(seg(t, L.at, L.at + 0.45)));
          const on = seg(t, L.at, L.at + 0.15);
          L.lamp.setAttribute("fill", mix("#ffffff", YEL, on));
          L.chev.setAttribute("opacity", 0.25 + 0.75 * on);
          const burst = seg(t, L.at, L.at + 0.6), pulse = bump(t, END, 1.8, i * 0.14, 0.5) * settle;
          const hr = burst < 1 ? 10 + 18 * oc(burst) : 10 + 9 * pulse, ho = burst < 1 ? (burst > 0 ? 1 - burst : 0) : 0.75 * pulse;
          L.halo.setAttribute("r", hr); L.halo.setAttribute("opacity", ho);
          const p = seg(t, L.at + 0.25, L.at + 0.7);
          tf(L.tag.g, 916 - 13 - L.tag.w / 2, L.y + 23, (0.4 + 0.6 * ob(p)) * (1 + 0.04 * pulse), -10 * (1 - ob(p)));
          L.tag.g.setAttribute("opacity", seg(p, 0, 0.3));
        });
      };
    },
  };

  /* ---- 1. where each tool runs, and what happens when the laptop lid shuts ---- */
  SC.where = {
    dur: 13, still: 13,
    build(svg, api) {
      const END = 13, FLIP = 6.4;
      hint(svg, "Flip the switch", 50);
      /* switch */
      const sw = el("g", {}, svg);
      const track = el("rect", { x: 0, y: -17, width: 64, height: 34, rx: 17, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, sw);
      const knob = el("circle", { cx: 17, cy: 0, r: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sw);
      const swl = txt(sw, 80, 8, "Laptop lid closed", { "font-size": 22, "font-weight": 700 });
      const ring = el("rect", { x: -9, y: -26, width: 80 + Math.ceil(swl.getComputedTextLength()) + 22, height: 52, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, sw);
      ring.parentNode.insertBefore(el("rect", { x: -9, y: -26, width: ring.getAttribute("width"), height: 52, rx: 26, fill: "#fff", opacity: 0 }), track);

      /* cloud: outline layer under a fill layer gives one merged shape */
      const cloudS = el("g", {}, svg), cloudF = el("g", {}, svg);
      const SH = [["r", 50, 160, 700, 142, 71, 400, 231], ["c", 170, 160, 44], ["c", 320, 146, 62], ["c", 500, 152, 56], ["c", 640, 164, 40]];
      const cloud = SH.map((s, i) => {
        const mk = (p, a) => s[0] === "r" ? el("rect", Object.assign({ x: s[1], y: s[2], width: s[3], height: s[4], rx: s[5] }, a), p) : el("circle", Object.assign({ cx: s[1], cy: s[2], r: s[3] }, a), p);
        return { a: mk(cloudS, { fill: INK, stroke: INK, "stroke-width": 6 }), b: mk(cloudF, { fill: SKY_SOFT }), cx: s[0] === "r" ? s[6] : s[1], cy: s[0] === "r" ? s[7] : s[2], i };
      });
      const cLab = txt(svg, 96, 210, "A vendor's cloud", { "font-size": 22, "font-weight": 700 });
      const still = el("g", {}, svg);
      const sr = el("rect", { y: -17, height: 34, rx: 17, fill: MINT, stroke: INK, "stroke-width": 2.5 }, still);
      const stt = txt(still, 0, 6, "Still working", { "font-size": 18, "font-weight": 700 });
      const stW = Math.ceil(stt.getComputedTextLength()) + 46;
      sr.setAttribute("x", -stW / 2); sr.setAttribute("width", stW); stt.setAttribute("x", -stW / 2 + 32);
      const sdot = el("circle", { cx: -stW / 2 + 17, cy: 0, r: 5, fill: INK }, still);

      /* desk zone */
      const desk = el("g", {}, svg), deskTok = el("g", {}, svg);
      const dLab = txt(svg, 60, 360, "Hardware you control", { "font-size": 22, "font-weight": 700 });
      const deskBody = el("g", {}, desk);
      [[76, 92], [708, 724]].forEach(([a, b]) => el("rect", { x: a, y: 548, width: b - a, height: 44, rx: 4, fill: YEL, stroke: INK, "stroke-width": 2.5 }, deskBody));
      el("rect", { x: 44, y: 534, width: 712, height: 18, rx: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, deskBody);
      el("path", { d: "M74 480 H726 L756 534 H44 Z", fill: DESK, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, deskBody);
      const mon = el("g", {}, desk);
      el("rect", { x: 620, y: 448, width: 20, height: 26, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, mon);
      el("rect", { x: 594, y: 472, width: 72, height: 9, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, mon);
      const screen = el("rect", { x: 540, y: 334, width: 180, height: 116, rx: 12, fill: SKY_SOFT, stroke: INK, "stroke-width": 3 }, mon);
      const bars = el("g", {}, mon);
      [[562, 360, 100, BLUE], [562, 384, 136, SKY], [562, 408, 76, LIL]].forEach(([x, y, w, c]) => el("rect", { x, y, width: w, height: 11, rx: 5.5, fill: c }, bars));
      const paused = el("g", {}, svg);
      const pr = el("rect", { x: 0, y: -18, height: 36, rx: 18, fill: SOFT, stroke: MUTE, "stroke-width": 2 }, paused);
      el("rect", { x: 16, y: -8, width: 5, height: 16, rx: 2, fill: MUTE }, paused);
      el("rect", { x: 25, y: -8, width: 5, height: 16, rx: 2, fill: MUTE }, paused);
      const pt = txt(paused, 42, 6, "Paused until it wakes", { "font-size": 18, "font-weight": 700, fill: MUTE });
      pr.setAttribute("width", 42 + Math.ceil(pt.getComputedTextLength()) + 18);

      const TOK = [["Claude Duet", YEL, 0, 262, 0], ["Claude Cowork", BLUE, 0, 262, 0], ["Munder Difflin", MINT, 0, 508, 1], ["OpenClaw", SKY, 0, 508, 1], ["Hermes Agent", LIL, 0, 508, 1]];
      const toks = TOK.map(([s, c, x, y, onDesk], i) => {
        const k = token(onDesk ? deskTok : svg, s, "#fff", c);
        return Object.assign(k, { x, y, onDesk, s0: 1.05 + i * 0.5, drop: onDesk ? 40 : 30 });
      });
      /* rows: the cloud pair centred in the cloud, the desk trio spread left of the monitor */
      const row = (ks, a, b) => { const tot = ks.reduce((q, k) => q + k.w, 0), gap = (b - a - tot) / (ks.length + 1); let x = a + gap; ks.forEach((k) => { k.x = x + k.w / 2; x += k.w + gap; }); };
      { const w = toks[0].w + toks[1].w + 40; row(toks.slice(0, 2), 400 - w / 2 - 40, 400 + w / 2 + 40); }
      row(toks.slice(2), 56, 600);

      let user = null, from = 0, at = 0, lastT = 0, curV = 0;
      const flip = () => {
        const on = user !== null ? user : lastT >= FLIP;
        from = curV; user = !on; at = api.now();
        api.poke();
      };
      button(sw, "Laptop lid closed", flip);
      sw.setAttribute("role", "switch");

      return (t, now) => {
        if (t < lastT - 0.5) user = null;
        lastT = t;
        let v;
        if (user === null) v = io(seg(t, FLIP, FLIP + 0.6));
        else v = api.calm ? +user : from + (+user - from) * io(seg(now - at, 0, 0.5));
        curV = v;
        sw.setAttribute("aria-checked", (user !== null ? user : t >= FLIP) ? "true" : "false");
        const se = seg(t, 0.15, 0.6); tf(sw, 44 - 24 * (1 - oc(se)), 44); sw.setAttribute("opacity", se);
        knob.setAttribute("cx", 17 + 30 * v);
        track.setAttribute("fill", mix(SOFT, LIL, v));

        cloud.forEach((c) => {
          const k = c.i === 0 ? oc(seg(t, 0.2, 0.7)) : ob(seg(t, 0.35 + c.i * 0.08, 0.8 + c.i * 0.08));
          const tr = c.i === 0 ? `translate(${c.cx} ${c.cy}) scale(${0.7 + 0.3 * k} ${0.85 + 0.15 * k}) translate(${-c.cx} ${-c.cy})` : `translate(${c.cx} ${c.cy}) scale(${k}) translate(${-c.cx} ${-c.cy})`;
          [c.a, c.b].forEach((n) => { n.setAttribute("transform", tr); n.setAttribute("opacity", c.i === 0 ? seg(t, 0.2, 0.45) : k > 0 ? 1 : 0); });
        });
        const cl1 = seg(t, 0.75, 1.15); cLab.setAttribute("opacity", cl1); cLab.setAttribute("transform", `translate(0 ${10 * (1 - oc(cl1))})`);

        const de = seg(t, 0.35, 0.95);
        deskBody.setAttribute("transform", `translate(0 ${-18 * (1 - oc(de))})`); deskBody.setAttribute("opacity", seg(de, 0, 0.4));
        const me = ob(seg(t, 0.6, 1.1));
        mon.setAttribute("transform", `translate(630 480) scale(${me}) translate(-630 -480)`);
        const dl = seg(t, 0.85, 1.25); dLab.setAttribute("opacity", dl); dLab.setAttribute("transform", `translate(0 ${10 * (1 - oc(dl))})`);
        desk.setAttribute("opacity", 1 - 0.6 * v); deskTok.setAttribute("opacity", 1 - 0.4 * v);
        screen.setAttribute("fill", mix(SKY_SOFT, SOFT, v));
        bars.setAttribute("opacity", 1 - v);

        const live = seg(t, 4.0, 4.4);
        toks.forEach((k, i) => {
          const d = seg(t, k.s0, k.s0 + 0.42), L = seg(t, k.s0 + 0.42, k.s0 + 0.95);
          const sq = L > 0 && L < 1 ? Math.sin(L * Math.PI * 2) * (1 - L) * 0.14 : 0;
          let bob = 0, sc = 1, ho = 0;
          if (k.onDesk) bob = -3 * bump(t, END, 1.6, i * 0.2, 0.5) * live * (1 - v);
          else { const p = bump(t, END, 1.6, i * 0.25, 0.5) * live; sc = 1 + 0.06 * p; ho = 0.85 * p; }
          tf(k.g, k.x, k.y - k.drop * (1 - d * d) + bob, sc);
          k.g.setAttribute("opacity", seg(t, k.s0, k.s0 + 0.2));
          k.inner.setAttribute("transform", `translate(0 17) scale(${1 + sq} ${1 - sq}) translate(0 -17)`);
          k.halo.setAttribute("opacity", ho);
          k.halo.setAttribute("transform", `scale(${1 + 0.1 * ho} ${1 + 0.35 * ho})`);
        });
        const pv = cl(v * 1.4), sv = cl((v - 0.2) / 0.8);
        tf(paused, 60, 408, 0.8 + 0.2 * ob(pv)); paused.setAttribute("opacity", pv);
        tf(still, 706 - stW / 2, 205, 0.8 + 0.2 * ob(sv)); still.setAttribute("opacity", sv);
        sdot.setAttribute("opacity", 0.45 + 0.55 * (1 - bump(t, END, 1.6, 0, 0.5)));
      };
    },
  };

  /* ---- 2. a 24 hour dial: when each tool acts without a prompt ---- */
  SC.start = {
    dur: 13, still: 13,
    build(svg, api) {
      const END = 13, C = [598, 312], R = 160, SWEEP = [2.2, 8.2], AUTO = 9.0, MD = 2;
      hint(svg, "Tap a tool");
      const TOOLS = [
        ["Claude Duet:", "morning brief, then checks every few hours", YEL, 132, [8, 11, 14, 17, 20]],
        ["Claude Cowork:", "scheduled tasks", BLUE, 110, [10, 19]],
        ["Munder Difflin:", "schedules", MINT, 88, [6, 13, 22]],
        ["Hermes Agent:", "cron scheduler", LIL, 66, [3, 16]],
      ];
      const P = (h, r) => { const a = (h / 24) * Math.PI * 2; return [C[0] + r * Math.sin(a), C[1] - r * Math.cos(a)]; };

      /* dial */
      const dial = el("g", {}, svg);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "#fff", stroke: INK, "stroke-width": 3 }, dial);
      const trail = el("path", { fill: YEL_SOFT, opacity: 0 }, dial);
      const tracks = TOOLS.map(([, , , r]) => el("circle", { cx: C[0], cy: C[1], r, fill: "none", stroke: SOFT, "stroke-width": 14, transform: `rotate(-90 ${C[0]} ${C[1]})` }, dial));
      const ticks = [];
      for (let h = 0; h < 24; h++) {
        const a = P(h, h % 6 ? 151 : 143), b = P(h, 158);
        ticks.push(el("path", { d: `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`, stroke: INK, "stroke-width": h % 6 ? 2 : 3.5, "stroke-linecap": "round" }, dial));
      }
      const labs = [0, 6, 12, 18].map((h) => { const p = P(h, 184); return txt(svg, p[0], p[1] + 7, String(h), { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 }); });
      const marks = [];
      TOOLS.forEach(([, , col, r, hours], ti) => hours.forEach((h) => {
        const [x, y] = P(h, r), g = el("g", {}, svg);
        const burst = el("circle", { r: 9, fill: "none", stroke: col, "stroke-width": 3, opacity: 0 }, g);
        const halo = el("circle", { r: 9, fill: "none", stroke: INK, "stroke-width": 2, opacity: 0 }, g);
        const dot = el("circle", { r: 9, fill: col, stroke: INK, "stroke-width": 2.5 }, g);
        marks.push({ g, burst, halo, dot, x, y, h, ti, col, n: marks.length });
      }));
      const hand = el("path", { d: "M0 12 V-148", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, svg);
      const hub = el("circle", { cx: C[0], cy: C[1], r: 8, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);

      /* chips */
      const chips = [];
      TOOLS.forEach(([name, rest, col], i) => {
        const g = el("g", {}, svg);
        const sh = el("rect", { x: 0, y: 0, width: 376, rx: 16, fill: col, stroke: INK, "stroke-width": 2.5, opacity: 0 }, g);
        sh.setAttribute("width", 364);
        const body = el("g", {}, g);
        const box = el("rect", { x: 0, y: 0, width: 364, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
        const mk = (y) => el("text", { x: 50, y, "font-family": SANS, "font-size": 18, fill: INK }, body);
        const sp = (ln, s, b) => { const n = el("tspan", { "font-weight": b ? 700 : 500 }, ln); n.textContent = s; return n; };
        let ln = mk(33), n = 1;
        sp(ln, name, true);
        rest.split(" ").forEach((w) => {
          const s = sp(ln, " " + w, false);
          if (ln.getComputedTextLength() > 296) { s.remove(); ln = mk(33 + n * 26); n++; sp(ln, w, false); }
        });
        const h = 33 + (n - 1) * 26 + 21;
        [sh, box].forEach((r) => r.setAttribute("height", h));
        el("circle", { cx: 26, cy: 27, r: 9, fill: col, stroke: INK, "stroke-width": 2.5 }, body);
        el("rect", { x: -7, y: -7, width: 378, height: h + 14, rx: 22, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, body);
        chips.push({ g, sh, body, h, label: name + " " + rest });
      });
      const total = chips.reduce((s, c) => s + c.h, 0) + 3 * 20;
      let y0 = C[1] - total / 2;
      chips.forEach((c) => { c.y = y0; y0 += c.h + 20; });

      let pinned = -1, lastT = 0, at = 0, from = [0, 0, 0, 0, 0];
      const cur = [0, 0, 0, 0, 0];
      chips.forEach((c, i) => {
        const pick = () => { if (pinned === i) return; from = cur.slice(); pinned = i; at = api.now(); api.poke(); };
        button(c.g, c.label, pick);
        c.g.addEventListener("focus", pick);
      });
      const sector = (a) => {
        a = Math.min(a, Math.PI * 2 - 0.0005);
        const e = P((a / (Math.PI * 2)) * 24, 150);
        return `M${C[0]} ${C[1]} L${C[0]} ${C[1] - 150} A150 150 0 ${a > Math.PI ? 1 : 0} 1 ${e[0]} ${e[1]} Z`;
      };

      return (t, now) => {
        if (t < lastT - 0.5) pinned = -1;
        lastT = t;
        /* focus levels: four chips plus a global dim */
        let f;
        if (pinned < 0) { const v = io(seg(t, AUTO, AUTO + 0.5)); f = [0, 0, v, 0, v]; }
        else { const v = api.calm ? 1 : io(seg(now - at, 0, 0.35)); f = from.map((x, i) => x + ((i === pinned || i === 4 ? 1 : 0) - x) * v); }
        f.forEach((x, i) => (cur[i] = x));
        const g = f[4];

        const de = seg(t, 0.15, 0.7);
        dial.setAttribute("transform", `translate(${C[0]} ${C[1]}) scale(${0.8 + 0.2 * ob(de)}) translate(${-C[0]} ${-C[1]})`);
        dial.setAttribute("opacity", seg(de, 0, 0.3));
        tracks.forEach((n, i) => dash(n, 2 * Math.PI * TOOLS[i][3], oc(seg(t, 0.6 + i * 0.1, 1.2 + i * 0.1))));
        ticks.forEach((n, h) => n.setAttribute("opacity", seg(t, 0.4 + h * 0.02, 0.6 + h * 0.02)));
        labs.forEach((n, j) => { const k = ob(seg(t, 0.6 + j * 0.08, 1.0 + j * 0.08)); const x = +n.getAttribute("x"), y = +n.getAttribute("y") - 7; n.setAttribute("transform", `translate(${x} ${y}) scale(${k}) translate(${-x} ${-y})`); n.setAttribute("opacity", k > 0 ? 1 : 0); });

        const sp = ios(seg(t, SWEEP[0], SWEEP[1])), hh = sp * 24;
        tf(hand, C[0], C[1], 1, sp * 360);
        const he = seg(t, 1.7, 2.1); hand.setAttribute("opacity", he); hub.setAttribute("opacity", seg(t, 0.5, 0.8));
        trail.setAttribute("d", sector(sp * Math.PI * 2));
        trail.setAttribute("opacity", sp > 0 ? 0.75 * (1 - seg(t, SWEEP[1], SWEEP[1] + 0.6)) : 0);

        marks.forEach((m) => {
          const e = seg(t, 1.2 + m.n * 0.06, 1.65 + m.n * 0.06), k = t >= SWEEP[1] ? 1 : seg(hh - m.h, 0, 1.4);
          const fi = f[m.ti], dim = 1 - 0.82 * g * (1 - fi);
          const s = (0.72 * ob(e) + 0.28 * k + 0.6 * Math.sin(Math.PI * k)) * (1 + 0.25 * fi);
          tf(m.g, m.x, m.y, s);
          m.g.setAttribute("opacity", (e > 0 ? 1 : 0) * dim);
          m.dot.setAttribute("fill", mix("#ffffff", m.col, 0.45 + 0.55 * k));
          m.burst.setAttribute("r", 9 + 18 * k); m.burst.setAttribute("opacity", k > 0 && k < 1 ? (1 - k) : 0);
          const p = bump(t, END, 1.6, (m.n % 3) * 0.15, 0.5) * seg(t, AUTO + 0.4, AUTO + 0.8) * fi;
          m.halo.setAttribute("r", 9 + 3 + 8 * p); m.halo.setAttribute("opacity", fi * (0.35 + 0.5 * p));
        });

        chips.forEach((c, i) => {
          const e = seg(t, 0.3 + i * 0.1, 0.85 + i * 0.1);
          tf(c.g, 24 - 22 * (1 - ob(e)), c.y);
          c.g.setAttribute("opacity", seg(e, 0, 0.35) * (1 - 0.42 * g * (1 - f[i])));
          c.body.setAttribute("transform", `translate(${-4 * f[i]} ${-5 * f[i]})`);
          c.sh.setAttribute("opacity", f[i]);
        });
      };
    },
  };

  /* ---- 3. a marble run that picks a tool ---- */
  SC.pick = {
    dur: 14, still: 14,
    build(svg, api) {
      const END = 14, X = [112, 304, 496, 688], GY = [150, 280, 410], BY = 532, CH = 500, RESET = 7.6;
      const MARBLE = {
        s: [[112, 24], [112, 150]],
        y0: [[112, 150], [112, BY]], n0: [[112, 150], [304, 150], [304, 280]],
        y1: [[304, 280], [304, BY]], n1: [[304, 280], [496, 280], [496, 410]],
        y2: [[496, 410], [496, BY]], n2: [[496, 410], [688, 410], [688, BY]],
      };
      const D = { s: 0.55, y0: 0.95, y1: 0.75, y2: 0.5, n0: 0.95, n1: 0.95, n2: 0.95 };
      const IDS = ["s", "y0", "n0", "y1", "n1", "y2", "n2"];
      const chanPts = (id) => { const p = MARBLE[id].map((q) => q.slice()); if (id === "s") p[0][1] = 40; if (p[p.length - 1][1] === BY) p[p.length - 1][1] = CH; return p; };
      const inkL = el("g", {}, svg), whiteL = el("g", {}, svg), hlL = el("g", {}, svg);
      const CHN = {};
      IDS.forEach((id) => {
        const pts = chanPts(id), d = pd(pts), L = plen(pts);
        const base = { d, fill: "none", "stroke-linejoin": "round" };
        CHN[id] = {
          L, off: id === "s" ? 16 : 0,
          ink: el("path", Object.assign({ stroke: INK, "stroke-width": 28 }, base), inkL),
          white: el("path", Object.assign({ stroke: "#fff", "stroke-width": 22 }, base), whiteL),
          hl: el("path", Object.assign({ stroke: YEL_SOFT, "stroke-width": 22 }, base), hlL),
        };
      });
      /* hopper */
      const hop = el("g", {}, svg);
      el("path", { d: "M-34 -18 H34 L16 14 H-16 Z", fill: YEL_SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, hop);
      /* bins */
      const NAMES = ["Claude Cowork", "Munder Difflin", "OpenClaw", "Hermes Agent"];
      const bins = NAMES.map((s, i) => {
        const g = el("g", {}, svg), x = X[i];
        const halo = el("path", { d: "M-86 -38 V40 Q-86 56 -70 56 H70 Q86 56 86 40 V-38", fill: "none", stroke: MINT, "stroke-width": 10, "stroke-linejoin": "round", "stroke-linecap": "round", opacity: 0 }, g);
        const cup = el("path", { d: "M-86 -38 V40 Q-86 56 -70 56 H70 Q86 56 86 40 V-38", fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round", "stroke-linecap": "round" }, g);
        const lb = txt(g, 0, 40, s, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
        const w = lb.getComputedTextLength(); if (w > 152) lb.setAttribute("font-size", (18 * 152) / w);
        return { g, cup, halo, x };
      });
      /* gates, question cards and exit labels */
      const QS = ["Must it work with your laptop shut?", "Want a team of agents, not one?", "Want it in WhatsApp or Telegram?"];
      const cards = QS.map((q, i) => {
        /* the first card wraps so it stays clear of the buttons */
        const g = el("g", {}, svg), x = X[i] + 32, maxW = i === 0 ? 236 : 800 - 24 - x - 32;
        const box = el("rect", { x: 0, y: 0, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const lines = []; let ln = txt(g, 16, 29, "", { "font-size": 19, "font-weight": 700 }); lines.push(ln);
        let w = 0;
        q.split(" ").forEach((word) => {
          const prev = ln.textContent; ln.textContent = prev ? prev + " " + word : word;
          if (ln.getComputedTextLength() > maxW && prev) { ln.textContent = prev; ln = txt(g, 16, 29 + lines.length * 25, word, { "font-size": 19, "font-weight": 700 }); lines.push(ln); }
        });
        lines.forEach((n) => (w = Math.max(w, n.getComputedTextLength())));
        const h = 44 + (lines.length - 1) * 25;
        box.setAttribute("width", Math.ceil(w) + 32); box.setAttribute("height", h);
        return { g, x, y: GY[i] - 22 - h };
      });
      const exits = [];
      GY.forEach((y, i) => {
        exits.push(txt(svg, X[i] - 24, y + 50, "Yes", { "text-anchor": "end", "font-size": 16, "font-weight": 700 }));
        exits.push(txt(svg, X[i] + 36, y + 36, "No", { "font-size": 16, "font-weight": 700 }));
      });
      const gates = GY.map((y, i) => {
        const g = el("g", {}, svg);
        const wait = el("circle", { r: 22, fill: "none", stroke: YEL, "stroke-width": 5, opacity: 0 }, g);
        el("circle", { r: 22, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        const arm = el("rect", { x: -4, y: -4, width: 24, height: 8, rx: 4, fill: INK }, g);
        el("circle", { r: 4, fill: YEL, stroke: INK, "stroke-width": 1.5 }, g);
        return { g, wait, arm, x: X[i], y };
      });
      /* controls */
      const hintT = txt(svg, 768, 46, "Steer the marble", { "text-anchor": "end", "font-size": 16, fill: MUTE, "font-weight": 500 });
      const mkBtn = (label, aria) => {
        const g = el("g", {}, svg), body = el("g", {}, g);
        const r = el("rect", { y: -20, height: 40, rx: 20, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, body);
        const t = txt(body, 0, 6.5, label, { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
        const w = Math.ceil(t.getComputedTextLength()) + 40;
        r.setAttribute("x", -w / 2); r.setAttribute("width", w);
        el("rect", { x: -w / 2 - 6, y: -26, width: w + 12, height: 52, rx: 26, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 5", class: "mg-ring" }, body);
        return { g, body, r, t, w, aria };
      };
      const bY = mkBtn("Yes"), bN = mkBtn("No"), bD = mkBtn("Drop again");
      { let x = 768; [bD, bN, bY].forEach((b) => { x -= b.w; b.x = x + b.w / 2; x -= 10; }); }
      const ghost = el("circle", { r: 11, fill: YEL, stroke: INK, "stroke-width": 2.5, opacity: 0 }, svg);
      const marble = el("g", {}, svg);
      el("circle", { r: 11, fill: YEL, stroke: INK, "stroke-width": 2.5 }, marble);
      el("circle", { cx: -3.5, cy: -3.5, r: 3, fill: "#fff" }, marble);

      /* where the marble is for a run, at clock c */
      const runState = (run, c) => {
        const S = { pos: MARBLE.s[0], dist: {}, flip: [null, null, null], wait: -1, bin: -1, land: 0, chosen: [] };
        (run.preLegs || []).forEach((id) => (S.dist[id] = 1e4));
        (run.preFlip || []).forEach((f, g) => f && (S.flip[g] = { dir: f.dir, at: -1e9 }));
        let g = run.from, cur = run.at;
        if (run.drop) {
          const k = seg(c, run.at, run.at + D.s), L = plen(MARBLE.s);
          S.dist.s = L * k * k; S.pos = pat(MARBLE.s, S.dist.s); cur = run.at + D.s;
          if (c < cur) return S;
        }
        S.pos = [X[g], GY[g]];
        for (const ch of run.choices) {
          const tc = Math.max(ch.at !== undefined ? ch.at : -1e9, cur + (ch.wait || 0));
          if (c < tc) { S.wait = g; return S; }
          S.flip[g] = { dir: ch.c, at: tc }; S.chosen.push({ c: ch.c, at: tc });
          const id = ch.c + g, dep = tc + 0.15, pts = MARBLE[id], L = plen(pts);
          if (c < dep) return S;
          const k = seg(c, dep, dep + D[id]), e = id[0] === "y" ? k * k : io(k);
          S.dist[id] = L * e; S.pos = pat(pts, L * e);
          if (k < 1) return S;
          cur = dep + D[id];
          if (id[0] === "y" || g === 2) { S.bin = id[0] === "y" ? g : 3; S.land = cur; return S; }
          g++;
          S.pos = [X[g], GY[g]];
        }
        S.wait = c >= cur ? g : -1;
        return S;
      };
      const W = 0.55;
      const runA = { drop: true, from: 0, at: 1.6, choices: [{ c: "n", wait: W }, { c: "n", wait: W }, { c: "y", wait: W }] };
      const runB = { drop: true, from: 0, at: RESET + 0.85, choices: [{ c: "n", wait: W }, { c: "y", wait: W }] };
      let man = null, last = null, press = { y: -9, n: -9, d: -9 }, gh = null;
      const choose = (c) => {
        const now = api.now();
        /* in manual play work out the marble from the clock, not from the last painted frame */
        const S = man ? runState(man, api.calm ? Infinity : now) : last;
        if (!S || S.wait < 0) return;
        if (!man) man = { drop: false, from: S.wait, at: now, preLegs: Object.keys(S.dist).filter((k) => S.dist[k] > 0), preFlip: S.flip.slice(), choices: [] };
        man.choices.push({ c, at: now });
        press[c] = now; api.poke();
      };
      button(bY.g, "Yes", () => choose("y"));
      button(bN.g, "No", () => choose("n"));
      button(bD.g, "Drop again", () => {
        const now = api.now();
        if (last) gh = { x: last.mx, y: last.my, at: now };
        man = { drop: true, from: 0, at: now + 0.3, choices: [] };
        press.d = now; api.poke();
      });

      return (t, now) => {
        const auto = !man, c = auto ? t : api.calm ? Infinity : now, ck = auto ? t : api.calm ? END : now;
        const B = auto ? t : 99;
        let S, out = 0, run;
        if (auto) { run = t < RESET + 0.5 ? runA : runB; S = runState(run, t); if (run === runA) out = seg(t, RESET, RESET + 0.4); }
        else { run = man; S = runState(man, c); }

        /* board build */
        IDS.forEach((id, i) => {
          const k = oc(seg(B, 0.3 + i * 0.08, 0.85 + i * 0.08)), ch = CHN[id];
          dash(ch.ink, ch.L, k); dash(ch.white, ch.L, k);
          const d = S.dist[id] || 0, vis = cl((d - ch.off) / ch.L);
          dash(ch.hl, ch.L, vis); ch.hl.setAttribute("opacity", vis > 0 ? 1 - out : 0);
        });
        tf(hop, 112, 24, ob(seg(B, 0.1, 0.5)));
        bins.forEach((b, i) => {
          const k = seg(B, 0.85 + i * 0.08, 1.35 + i * 0.08);
          const glow = S.bin === i ? seg(c, S.land, S.land + 0.4) * (1 - out) : 0;
          const p = bump(ck, END, 1.8, 0, 0.5) * glow;
          tf(b.g, b.x, 532 - 20 * (1 - ob(k)), 1); b.g.setAttribute("opacity", seg(k, 0, 0.3));
          b.cup.setAttribute("fill", mix("#ffffff", MINT, glow));
          b.halo.setAttribute("opacity", glow * (0.35 + 0.4 * p)); b.halo.setAttribute("stroke-width", 8 + 8 * p);
        });
        cards.forEach((cd, i) => { const k = seg(B, 0.7 + i * 0.12, 1.2 + i * 0.12); tf(cd.g, cd.x - 24 * (1 - ob(k)), cd.y); cd.g.setAttribute("opacity", seg(k, 0, 0.4)); });
        exits.forEach((n, i) => n.setAttribute("opacity", seg(B, 1.05 + i * 0.06, 1.35 + i * 0.06)));
        gates.forEach((gt, i) => {
          const k = ob(seg(B, 0.1 + i * 0.1, 0.5 + i * 0.1));
          tf(gt.g, gt.x, gt.y, k);
          const fl = S.flip[i];
          let a = 45;
          if (fl && !(auto && out >= 1)) { const target = fl.dir === "y" ? 90 : 0; a = 45 + (target - 45) * ob(seg(c, fl.at, fl.at + 0.35)); }
          if (auto && out > 0 && fl) { const target = fl.dir === "y" ? 90 : 0; a = target + (45 - target) * io(out); }
          gt.arm.setAttribute("transform", `rotate(${a})`);
          const w = S.wait === i ? bump(ck, 0, 1.0, 0, 1) : 0;
          gt.wait.setAttribute("r", 22 + 9 * w); gt.wait.setAttribute("opacity", S.wait === i ? 0.4 + 0.6 * (1 - w) : 0);
        });
        hintT.setAttribute("opacity", seg(B, 1.2, 1.5));
        const live = S.wait >= 0;
        const pressed = { y: -9, n: -9, d: -9 };
        if (auto) { S.chosen.forEach((ch) => (pressed[ch.c] = ch.at)); if (t >= RESET - 0.1) pressed.d = RESET - 0.1; }
        else { pressed.y = press.y; pressed.n = press.n; pressed.d = press.d; }
        [[bY, "y"], [bN, "n"], [bD, "d"]].forEach(([b, k], i) => {
          const e = seg(B, 1.2 + i * 0.08, 1.6 + i * 0.08);
          tf(b.g, b.x, 98 + 14 * (1 - ob(e))); b.g.setAttribute("opacity", seg(e, 0, 0.4));
          const pk = seg(auto ? t : now, pressed[k], pressed[k] + 0.3), dip = pk > 0 && pk < 1 ? Math.sin(Math.PI * pk) : 0;
          b.body.setAttribute("transform", `translate(0 ${3 * dip}) scale(${1 - 0.05 * dip})`);
          const on = k === "d" || live;
          b.r.setAttribute("fill", k === "d" ? mix("#ffffff", LIL, 0.35 + 0.65 * dip) : on ? mix(YEL, "#ffffff", 0) : SOFT);
          b.t.setAttribute("fill", on ? INK : MUTE);
          if (k !== "d") b.g.setAttribute("aria-disabled", on ? "false" : "true");
        });
        /* marble */
        let [mx, my] = S.pos;
        if (S.bin >= 0) { const k = seg(c, S.land, S.land + 0.55); my -= k > 0 && k < 1 ? 16 * Math.abs(Math.sin(k * Math.PI * 2)) * Math.pow(1 - k, 1.5) : 0; }
        const app = ob(seg(c, run.drop ? run.at - 0.35 : -1e9, run.drop ? run.at : -1e9 + 1));
        const ms = run.drop ? app : 1;
        tf(marble, mx, my, ms * (1 - 0.6 * out)); marble.setAttribute("opacity", (ms > 0 ? 1 : 0) * (1 - out));
        S.mx = mx; S.my = my; last = S;
        if (gh && !auto) { const k = api.calm ? 1 : seg(now, gh.at, gh.at + 0.3); tf(ghost, gh.x, gh.y, 1 - 0.7 * k); ghost.setAttribute("opacity", k < 1 ? 1 - k : 0); }
        else ghost.setAttribute("opacity", 0);
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
