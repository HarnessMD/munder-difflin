/* Receipt printer scenes for "Make money while playing GTA 6". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", AQUA = "#3FC6C9", NAVY = "#22305E";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 18, "font-weight": 500 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* hover or focus, eased from 0 to 1 with a small overshoot on the way in */
  const hover = (g) => {
    const h = { on: 0, at: -9 }, sec = () => performance.now() / 1000;
    const set = (v) => () => { if (h.on !== v) { h.on = v; h.at = sec(); } };
    g.addEventListener("pointerenter", set(1)); g.addEventListener("pointerleave", set(0)); g.addEventListener("focus", set(1)); g.addEventListener("blur", set(0));
    return () => { const k = cl((sec() - h.at) / 0.24); return h.on ? ob(k) : 1 - oc(k); };
  };

  /* ---- print shop kit: spot ink dots, halftone discs, crop marks, the printer and its paper ---- */
  let uid = 0;
  const nid = (p) => "mgm-" + p + "-" + (++uid);
  const defs = (svg) => svg.querySelector("defs") || el("defs", {}, svg);
  const dots = (svg, col, step = 8, r = 2) => {
    const id = nid("d"), p = el("pattern", { id, width: step, height: step, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs(svg));
    el("circle", { cx: step / 2, cy: step / 2, r, fill: col }, p);
    return `url(#${id})`;
  };
  const half = (p, cx, cy, R, col, step = 13) => { // a halftone disc: dots grow along the diagonal
    const g = el("g", {}, p), w = el("g", { fill: col }, g);
    for (let j = -R, row = 0; j <= R; j += step * 0.866, row++) for (let i = -R + (row % 2 ? step / 2 : 0); i <= R; i += step) {
      if (i * i + j * j > R * R) continue;
      el("circle", { cx: (cx + i).toFixed(1), cy: (cy + j).toFixed(1), r: (step * (0.09 + 0.4 * cl((i + j) / (2.2 * R) + 0.5))).toFixed(2) }, w);
    }
    return g;
  };
  const disc = (p, cx, cy, r, col) => { // a spot ink circle printed a little off its key line
    const g = el("g", {}, p);
    el("circle", { cx: cx + 6, cy: cy + 6, r, fill: col }, g);
    el("circle", { cx, cy, r, fill: "none", stroke: INK, "stroke-width": 2.5 }, g);
    return g;
  };
  const marks = (svg, W, H) => [[34, 34], [W - 34, 34], [34, H - 34], [W - 34, H - 34]].forEach(([x, y]) => {
    const g = el("g", { stroke: INK, "stroke-width": 1.5, fill: "none", opacity: 0.55 }, svg);
    el("circle", { cx: x, cy: y, r: 6 }, g); el("path", { d: `M${x - 11} ${y} H${x + 11} M${x} ${y - 11} V${y + 11}` }, g);
  });
  const drift = (list, now) => list.forEach((g, i) => g.setAttribute("transform", `translate(${(Math.sin(now * (0.5 + i * 0.13) + i * 2.1) * (4 + i * 2)).toFixed(2)} ${(Math.cos(now * (0.42 + i * 0.1) + i) * (3 + i * 1.5)).toFixed(2)})`));
  const zig = (x0, x1, y, a) => { const n = Math.round(Math.abs(x1 - x0) / 10); let d = ""; for (let i = 1; i <= n; i++) d += ` L${x0 + ((x1 - x0) * (i - 0.5)) / n} ${y + a} L${x0 + ((x1 - x0) * i) / n} ${y}`; return d; };
  const riso = (p, x, y, s, size, a = {}) => { // big type with a second ink a hair off register
    txt(p, x + 2.5, y + 2.5, s, Object.assign({ "text-anchor": "middle", "font-size": size, "font-weight": 700, fill: LIL }, a));
    return txt(p, x, y, s, Object.assign({ "text-anchor": "middle", "font-size": size, "font-weight": 700 }, a));
  };
  const rule = (p, y, w, pad) => el("path", { d: `M${pad} ${y} H${w - pad}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "7 6" }, p);
  const leader = (p, y, a, b, w, pad) => { // label, dotted leader, value
    const L = mono(p, pad, y, a), R = mono(p, w - pad, y, b, { "font-weight": 700, "text-anchor": "end" });
    const x0 = pad + L.getComputedTextLength() + 10, x1 = w - pad - R.getComputedTextLength() - 10;
    if (x1 > x0 + 4) el("path", { d: `M${x0} ${y - 5} H${x1}`, stroke: MUTE, "stroke-width": 2.8, "stroke-dasharray": "0.1 7.4", "stroke-linecap": "round" }, p);
    return R;
  };
  const bars = (p, x, y, w, h) => { let c = x, i = 0; while (c < x + w - 4) { const bw = 1.5 + ((i * 7 + (i >> 1) * 3) % 4) * 1.4; el("rect", { x: c.toFixed(1), y, width: bw.toFixed(1), height: h, fill: NAVY }, p); c += bw + 2.2 + ((i * 5) % 3) * 1.3; i++; } };
  const swipe = (n, x, k) => { n.setAttribute("transform", `translate(${x} 0) scale(${Math.max(k, 0.001)} 1) translate(${-x} 0)`); n.setAttribute("opacity", k > 0.001 ? 1 : 0); };
  const sparks = (p, x, y) => { const g = el("g", { stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, p); el("path", { d: "M4 -6 L10 -16 M12 0 L24 -5 M11 9 L22 14" }, g); return (k) => g.setAttribute("transform", `translate(${x} ${y}) scale(${Math.max(k, 0.001)})`) || g.setAttribute("opacity", k > 0.001 ? 1 : 0); };

  const printer = (svg, sx, sy, bw, pw, bh) => {
    const g = el("g", {}, svg), x = sx - bw / 2, y = sy - 14, cy = y + 25 + (bh - 25) / 2, r = Math.min(17, (bh - 40) / 2);
    el("rect", { x: x + 14, y: y + 16, width: bw, height: bh, rx: 22, fill: dots(svg, LIL) }, g);
    [x + 42, x + bw - 88].forEach((fx) => el("rect", { x: fx, y: y + bh - 6, width: 46, height: 20, rx: 6, fill: INK }, g));
    el("rect", { x: x + 5, y: y + 5, width: bw, height: bh, rx: 22, fill: BLUE }, g);
    if (bh > 96) el("rect", { x: x + 22, y: y + 36, width: bw - 39, height: bh - 50, rx: 14, fill: SKY }, g);
    el("rect", { x, y, width: bw, height: bh, rx: 22, fill: "none", stroke: INK, "stroke-width": 3 }, g);
    if (bh > 96) el("rect", { x: x + 18, y: y + 32, width: bw - 36, height: bh - 46, rx: 14, fill: "none", stroke: INK, "stroke-width": 2.5 }, g);
    const led = el("circle", { cx: x + 46, cy, r: 7.5, fill: AQUA, stroke: INK, "stroke-width": 2.5 }, g);
    (bh > 96 ? [-10, 0, 10] : [-5, 5]).forEach((dy) => el("path", { d: `M${sx - 44} ${cy + dy} H${sx + 44}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g));
    const pulse = el("circle", { cx: x + bw - 50, cy, r, fill: "none", stroke: AQUA, "stroke-width": 3, opacity: 0 }, g);
    const btn = el("g", {}, g);
    el("circle", { cx: 3, cy: 3, r, fill: INK }, btn);
    el("circle", { r, fill: YEL, stroke: INK, "stroke-width": 3 }, btn);
    el("path", { d: `M${-r * 0.5} ${-r * 0.2} A${r * 0.55} ${r * 0.55} 0 0 1 ${-r * 0.05} ${-r * 0.55}`, stroke: "#fff", "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, btn);
    el("rect", { x: x - 9, y: y - 9, width: bw + 32, height: bh + 40, rx: 30, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, g);
    const bx = x + bw - 50, base = y + bh;
    const P = { g, led, sx, sy, slot: null,
      slotBar: (parent) => (P.slot = el("rect", { x: sx - pw / 2 - 16, y: sy - 3, width: pw + 32, height: 14, rx: 7, fill: INK }, parent)),
      /* dx: motor shake, sq: squash before the first line, press: button travel, hot: hover, ring: tap hint 0..1 */
      set(t, dx, sq, press, hot, ring, on) {
        const tr = `translate(${dx} ${base}) scale(1 ${1 - 0.05 * sq}) translate(0 ${-base})`;
        g.setAttribute("transform", tr); if (P.slot) P.slot.setAttribute("transform", tr);
        led.setAttribute("fill", on ? (Math.floor(t * 11) % 2 ? "#fff" : AQUA) : AQUA);
        btn.setAttribute("transform", `translate(${bx + 2.5 * press} ${cy + 2.5 * press}) scale(${1 + 0.14 * hot})`);
        pulse.setAttribute("r", r + 3 + 17 * oc(ring)); pulse.setAttribute("opacity", ring > 0 ? 0.85 * (1 - ring) : 0);
      } };
    return P;
  };
  const paper = (svg, sx, sy, w, H) => {
    const cid = nid("c"), cut = el("path", {}, el("clipPath", { id: cid }, defs(svg)));
    const outer = el("g", {}, svg), tilt = el("g", {}, outer), mv = el("g", { "clip-path": `url(#${cid})` }, tilt);
    const d = `M0 0${zig(0, w, 0, -5)} V${H + 40} H0 Z`;
    el("path", { d, fill: dots(svg, LIL), transform: "translate(10 10)" }, mv);
    el("path", { d, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, mv);
    const edge = el("path", { fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, mv);
    return { svg, outer, tilt, mv, cut, edge, sx, sy, w, x: sx - w / 2, key: "", front: null, slot: null };
  };
  /* fed: length out of the slot, rot: lean, d: tear progress 0..1 (lift, then drop in front of the printer) */
  const place = (P, fed, rot, d) => {
    const torn = d > 0, key = fed + (torn ? "t" : "a");
    if (P.key !== key) {
      P.key = key;
      P.cut.setAttribute("d", torn ? `M-20 -30 H${P.w + 40} V${fed}${zig(P.w + 40, -20, fed, 5)} Z` : `M-20 -30 H${P.w + 40} V${fed + 5} H-20 Z`);
      P.edge.setAttribute("d", torn ? `M${P.w} ${fed}${zig(P.w, 0, fed, 5)}` : "");
    }
    if (P.slot && P.front !== torn) { P.front = torn; P.svg.insertBefore(P.slot, torn ? P.outer : P.outer.nextSibling); }
    const lift = -9 * oc(cl(d * 4)), fall = d > 0.25 ? Math.pow((d - 0.25) / 0.75, 2.4) : 0;
    P.mv.setAttribute("transform", `translate(${P.x + 30 * fall} ${P.sy - fed + lift + 780 * fall})`);
    P.tilt.setAttribute("transform", `rotate(${(rot + 3.5 * cl(d * 4) + 9 * fall).toFixed(3)} ${P.sx} ${P.sy})`);
    P.outer.setAttribute("opacity", 1 - seg(d, 0.84, 1));
  };
  /* the motor: bursts of [start, end, length out], quantised to 6 unit steps */
  const feed = (B, t) => { let y = 0, on = false; for (const [a, b, to] of B) { if (t >= b) y = to; else { if (t > a) { y = Math.floor((y + (to - y) * seg(t, a, b)) / 6) * 6; on = true; } break; } } return [y, on]; };
  const shake = (y, on) => (on ? ((y / 6) % 2 ? 1.3 : -1.3) : 0);

  const SC = {};

  /* ---- 1. what in game cash is worth, as a receipt ---- */
  SC.receipt = {
    dur: 11.2, still: 6.8,
    build(svg, api) {
      const SX = 400, SY = 462, W = 440, H = 420, PAD = 28, TEAR = 10.2;
      const B = [[0.5, 1.0, 100], [1.3, 1.65, 146], [2.0, 2.35, 192], [2.7, 3.05, 238], [3.4, 3.75, 284], [5.0, 5.6, H]];
      const back = [half(svg, 124, 196, 112, LIL), disc(svg, 690, 296, 82, YEL), half(svg, 704, 122, 58, SKY, 11)];
      marks(svg, 800, 600);
      const pr = printer(svg, SX, SY, 560, W, 112), P = paper(svg, SX, SY, W, H), m = P.mv;
      P.slot = pr.slotBar(svg);
      riso(m, W / 2, 60, "In game cash", 32);
      rule(m, 84, W, PAD);
      [["Monetary value", "none"], ["Sell for real money", "not allowed"], ["Sell account", "not allowed"], ["Paid to your bank", "nothing"]].forEach(([a, b], i) => leader(m, 128 + i * 46, a, b, W, PAD));
      rule(m, 292, W, PAD);
      const hl = el("rect", { y: 311, height: 40, rx: 6, fill: YEL }, m);
      const tw = txt(m, W / 2, 340, "Thank you for playing", { "text-anchor": "middle", "font-size": 27, "font-weight": 700 }).getComputedTextLength();
      const hx = W / 2 - tw / 2 - 12; hl.setAttribute("x", hx); hl.setAttribute("width", tw + 24);
      const spark = sparks(m, W / 2 + tw / 2 + 14, 318);
      bars(m, W / 2 - 104, 368, 208, 30);
      const hot = hover(pr.g);
      let rip = null, last = 0;
      button(pr.g, "Tear off the slip and print it again", () => { if (rip || api.t() >= TEAR) return; api.poke(); rip = { at: api.now(), t: api.t(), fed: last }; });
      return (t, now) => {
        let d = seg(t, TEAR, TEAR + 0.95), T = t;
        if (rip) { d = Math.max(0.001, (now - rip.at) / 0.95); T = rip.t; if (d >= 1) { rip = null; api.seek(0); return; } }
        const [y, on] = feed(B, T), h = hot(); last = y;
        const lean = -1.3 * ob(seg(T, 5.6, 6.3)) + Math.sin(now * 1.2) * 0.3 * (y / H) + 0.9 * h * (y / H);
        place(P, y, lean, d);
        const idle = !rip && t > 7.4 && t < TEAR ? ((now % 1.9) / 1.9) : 0;
        pr.set(T, shake(y, on), Math.sin(seg(T, 0.08, 0.5) * Math.PI), Math.sin(cl(d * 3.4) * Math.PI), h, idle, on);
        swipe(hl, hx, ob(seg(T, 5.75, 6.2)));
        spark(ob(seg(T, 6.1, 6.5)));
        drift(back, now);
      };
    },
  };

  /* ---- 2. six slips on the spike, none sent ---- */
  SC.slips = {
    dur: 11.3, still: 7.6,
    build(svg, api) {
      const SX = 190, SY = 398, W = 270, SH = 42, LX = 440, PX = 470, EXIT = 10.2, STEP = 0.85;
      const NAMES = ["First draft", "Research brief", "Invoice draft", "Payment reminder", "Code change", "Weekly report"];
      const back = [half(svg, 160, 176, 118, SKY), disc(svg, 300, 92, 40, YEL)];
      marks(svg, 800, 600);
      /* the spike, its base and the counter */
      el("path", { d: `M${PX} 428 V60 L${PX} 40`, stroke: INK, "stroke-width": 4.5, "stroke-linecap": "round" }, svg);
      el("path", { d: `M${PX - 4} 62 L${PX} 38 L${PX + 4} 62 Z`, fill: INK, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, svg);
      el("rect", { x: 439, y: 440, width: 300, height: 48, rx: 12, fill: dots(svg, LIL) }, svg);
      el("rect", { x: 430, y: 430, width: 300, height: 48, rx: 12, fill: YEL }, svg);
      el("rect", { x: 426, y: 426, width: 300, height: 48, rx: 12, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      mono(svg, 576, 457.5, "Waiting for you", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      const cnt = el("g", {}, svg);
      el("rect", { x: 433, y: 503, width: 300, height: 52, rx: 26, fill: dots(svg, LIL) }, cnt);
      el("rect", { x: 426, y: 496, width: 300, height: 52, rx: 26, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, cnt);
      const lab = mono(cnt, 0, 528.5, "Sent by agents:", { "font-size": 19 }), lw = lab.getComputedTextLength();
      const probe = mono(cnt, 0, 528.5, "none", { "font-size": 19, "font-weight": 700 }), vw = probe.getComputedTextLength(); probe.remove();
      const x0 = 576 - (lw + 14 + vw) / 2, vx = x0 + lw + 14; lab.setAttribute("x", x0);
      const chl = el("rect", { x: vx - 7, y: 508, width: vw + 14, height: 28, rx: 6, fill: YEL }, cnt);
      const wid = nid("c"); el("rect", { x: vx - 8, y: 505, width: vw + 16, height: 34 }, el("clipPath", { id: wid }, defs(svg)));
      const reel = el("g", { "clip-path": `url(#${wid})` }, cnt), roll = el("g", {}, reel);
      [-2, -1, 0, 1].forEach((k) => mono(roll, vx, 528.5 + k * 30, "none", { "font-size": 19, "font-weight": 700 }));
      const pr = printer(svg, SX, SY, 330, W, 104);
      const land = NAMES.map((_, i) => 0.5 + i * STEP + 1.12);
      const shape = `M0 0 H${W} V${SH}${zig(W, 0, SH, 4)} Z`;
      const flips = NAMES.map(() => ({ to: 0, at: -9 }));
      const slips = NAMES.map((name, i) => {
        const cid = nid("c"), cut = el("rect", { x: -20, y: -20, width: W + 50, height: 20 }, el("clipPath", { id: cid }, defs(svg)));
        const g = el("g", {}, svg), pos = el("g", {}, g), turn = el("g", {}, pos);
        el("path", { d: shape, fill: dots(svg, LIL), transform: "translate(7 7)" }, turn);
        const front = el("g", {}, turn), rear = el("g", {}, turn);
        el("path", { d: shape, fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, front);
        mono(front, 54, 28, name, { "font-size": 19, "font-weight": 700 });
        el("path", { d: shape, fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, rear);
        mono(rear, 54, 28, "Sender: you", { "font-size": 19, "font-weight": 700 });
        const hole = el("g", {}, turn); el("circle", { cx: 30, cy: 21, r: 6.5, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, hole); el("circle", { cx: 30, cy: 21, r: 2.4, fill: INK }, hole);
        el("rect", { x: -6, y: -6, width: W + 12, height: SH + 16, rx: 8, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, pos);
        button(g, `${name}: flip the slip to see the sender`, () => { if (api.t() < land[i] + 0.3 || api.t() >= EXIT) return; api.poke(); flips[i] = { to: flips[i].to ? 0 : 1, at: api.now() }; api.hold(6); });
        return { g, pos, turn, front, rear, hole, cid, cut, hot: hover(g), ry: 370 - i * 56, rr: i % 2 ? 0.5 : -0.5 };
      });
      pr.slotBar(svg);
      let lastT = 0;
      return (t, now) => {
        if (t < lastT - 1) flips.forEach((f) => { f.to = 0; f.at = -9; });
        lastT = t;
        let printing = false, py = 0, rolls = 0;
        slips.forEach((s, i) => {
          const u = t - (0.5 + i * STEP);
          if (u <= 0) { s.g.setAttribute("opacity", 0); s.g.style.pointerEvents = "none"; return; }
          s.g.style.pointerEvents = "";
          let x = SX - W / 2, y, r = 0, op = 1, clip = false;
          if (u < 0.42) { // prints out of the slot, then dips before the throw
            const f = u < 0.3 ? Math.floor((46 * u) / 0.3 / 5) * 5 : 46; clip = true; s.cut.setAttribute("height", 20 + f);
            y = SY - f + 5 * Math.sin(seg(u, 0.3, 0.42) * Math.PI); if (u < 0.3) { printing = true; py = f / 5; }
          } else if (u < 0.86) { // arcs over to the top of the spike
            const k = io(seg(u, 0.42, 0.86)); x += (LX - x) * k; y = SY - 46 + (8 - (SY - 46)) * k - 40 * Math.sin(k * Math.PI); r = -12 * Math.sin(k * Math.PI);
          } else { // drops down the spike, bounces and settles
            const k = seg(u, 0.86, 1.12), b = seg(u, 1.12, 1.5); x = LX; y = 8 + (s.ry - 8) * k * k - 8 * Math.sin(b * Math.PI) * (1 - b); r = s.rr * k + 3.2 * Math.sin(b * Math.PI * 2) * (1 - b);
          }
          for (let j = i + 1; j < 6; j++) y += 3 * Math.sin(seg(t, land[j], land[j] + 0.28) * Math.PI); // the stack takes each new slip
          const e = seg(t, EXIT + (5 - i) * 0.07, EXIT + (5 - i) * 0.07 + 0.55); // loop end: slips lift off the spike
          if (e > 0) { y -= 9 * Math.sin(cl(e * 3) * Math.PI) + 0; y -= (s.ry + 80) * e * e * e; op = 1 - seg(e, 0.55, 1); }
          const f = flips[i], p = io(seg(now - f.at, 0, 0.46)), v = f.to ? p : 1 - p, h = s.hot();
          if (clip) s.pos.setAttribute("clip-path", `url(#${s.cid})`); else s.pos.removeAttribute("clip-path");
          s.g.setAttribute("opacity", op);
          s.pos.setAttribute("transform", `translate(${x.toFixed(2)} ${(y - (u > 1.5 ? 4 * h : 0) - 9 * Math.sin(v * Math.PI)).toFixed(2)}) rotate(${(r + (u > 1.5 ? 0.8 * h : 0)).toFixed(2)} 30 21)`);
          s.turn.setAttribute("transform", `translate(0 21) scale(1 ${Math.max(0.02, Math.abs(Math.cos(v * Math.PI))).toFixed(3)}) translate(0 -21)`);
          s.front.setAttribute("opacity", v > 0.5 ? 0 : 1); s.rear.setAttribute("opacity", v > 0.5 ? 1 : 0);
          s.hole.setAttribute("opacity", u >= 1.0 ? 1 : 0);
          rolls += ob(seg(t, land[i], land[i] + 0.36));
        });
        rolls += 4 * ob(seg(t, 6.2, 7.0)); // the counter spins, overshoots and settles on the same word
        roll.setAttribute("transform", `translate(0 ${((((rolls % 1) + 1) % 1) * 30).toFixed(2)})`);
        swipe(chl, vx - 7, ob(seg(t, 6.95, 7.35)));
        const pop = Math.sin(seg(t, 6.95, 7.3) * Math.PI) * 0.05;
        cnt.setAttribute("transform", `translate(576 522) scale(${1 + pop}) translate(-576 -522)`);
        pr.set(t, printing ? (py % 2 ? 1.3 : -1.3) : 0, Math.sin(seg(t, 0.08, 0.5) * Math.PI), 0, 0, 0, printing);
        drift(back, now);
      };
    },
  };

  /* ---- 3. the 20 minute approval routine as one long receipt ---- */
  SC.routine = {
    dur: 11.6, still: 7.3,
    build(svg, api) {
      const SX = 290, SY = 512, W = 380, H = 462, TEAR = 10.6, PX = 14;
      const ROWS = [["0 to 5", "Money", 5, YEL], ["5 to 12", "Client drafts", 7, SKY], ["12 to 17", "Code and reports", 5, LIL], ["17 to 20", "Tomorrow's tasks", 3, MINT]];
      const B = [[0.4, 0.9, 104], [1.3, 1.8, 202], [2.2, 2.6, 272], [3.0, 3.3, 314], [4.0, 4.45, 392], [5.7, 6.1, H]];
      const back = [half(svg, 694, 484, 66, SKY, 11), disc(svg, 566, 462, 26, YEL)];
      marks(svg, 800, 600);
      /* a 20 minute dial that fills as each line prints */
      const CX = 646, CY = 250, R = 92, C = 2 * Math.PI * R;
      el("circle", { cx: CX + 12, cy: CY + 13, r: R + 19, fill: dots(svg, LIL) }, svg);
      const dial = el("g", {}, svg);
      el("circle", { cx: CX, cy: CY, r: R + 19, fill: "#fff" }, dial);
      el("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: SOFT, "stroke-width": 38 }, dial);
      let cum = 0;
      const arcs = ROWS.map(([, , m, col]) => { const a = el("circle", { cx: CX, cy: CY, r: R, fill: "none", stroke: col, "stroke-width": 38, "stroke-dasharray": `0 ${C}`, "stroke-dashoffset": (-cum / 20) * C, transform: `rotate(-90 ${CX} ${CY})` }, dial); const o = { a, len: (m / 20) * C, from: cum, m }; cum += m; return o; });
      [R + 19, R - 19].forEach((r) => el("circle", { cx: CX, cy: CY, r, fill: "none", stroke: INK, "stroke-width": 3 }, dial));
      for (let k = 0; k < 20; k++) { const a = ((k * 18 - 90) * Math.PI) / 180, big = k === 0 || k === 5 || k === 12 || k === 17, r1 = R + 27, r2 = R + (big ? 41 : 34); el("path", { d: `M${CX + Math.cos(a) * r1} ${CY + Math.sin(a) * r1} L${CX + Math.cos(a) * r2} ${CY + Math.sin(a) * r2}`, stroke: INK, "stroke-width": big ? 3.5 : 2, "stroke-linecap": "round" }, dial); }
      const hand = el("g", {}, dial);
      el("path", { d: `M${CX} ${CY + 14} V${CY - R + 30}`, stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, hand);
      el("circle", { cx: CX + 2, cy: CY + 2, r: 11, fill: INK }, dial); el("circle", { cx: CX, cy: CY, r: 11, fill: YEL, stroke: INK, "stroke-width": 3 }, dial);
      const pr = printer(svg, SX, SY, 470, W, 72), P = paper(svg, SX, SY, W, H), m = P.mv;
      P.slot = pr.slotBar(svg);
      let y0 = 30;
      const inks = ROWS.map(([range, name, mins, col]) => {
        const h = mins * 14, ink = el("rect", { x: PX + 11, y: y0 + 6, width: 108, height: h - 6, rx: 8, fill: col }, m);
        el("rect", { x: PX + 8, y: y0 + 3, width: 108, height: h - 6, rx: 8, fill: "none", stroke: INK, "stroke-width": 2.5 }, m);
        mono(m, PX + 62, y0 + h / 2 + 6, range, { "text-anchor": "middle", "font-size": 17, "font-weight": 700 });
        txt(m, PX + 134, y0 + h / 2 + 8, name, { "font-size": 23, "font-weight": 600 });
        y0 += h; return ink;
      });
      rule(m, 327, W, 22);
      const thl = el("rect", { y: 343, height: 40, rx: 6, fill: YEL }, m);
      const tl = mono(m, 22, 372, "Total", { "font-size": 19 }), tv = txt(m, W - 30, 373, "20 minutes", { "text-anchor": "end", "font-size": 30, "font-weight": 700 });
      const vw = tv.getComputedTextLength(), tx = W - 30 - vw - 10; thl.setAttribute("x", tx); thl.setAttribute("width", vw + 20);
      el("path", { d: `M${22 + tl.getComputedTextLength() + 10} 367 H${tx - 10}`, stroke: MUTE, "stroke-width": 2.8, "stroke-dasharray": "0.1 7.4", "stroke-linecap": "round" }, m);
      const stamp = el("g", {}, m), st = el("g", {}, stamp);
      const sr1 = el("rect", { y: -20, height: 46, rx: 12, fill: LIL }, st), sr2 = el("rect", { y: -23, height: 46, rx: 12, fill: "none", stroke: INK, "stroke-width": 2.5 }, st);
      const bw = txt(m, W / 2, 432, "Back to the mission", { "text-anchor": "middle", "font-size": 24, "font-weight": 700, transform: `rotate(-2.5 ${W / 2} 424)` }).getComputedTextLength() + 44;
      sr1.setAttribute("x", -bw / 2 + 3); sr1.setAttribute("width", bw); sr2.setAttribute("x", -bw / 2); sr2.setAttribute("width", bw);
      const spark = sparks(m, W / 2 + bw / 2 + 2, 404);
      el("rect", { x: -8, y: -14, width: W + 16, height: H + 30, rx: 10, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, m);
      const hot = hover(P.outer);
      let rip = null, last = 0;
      button(P.outer, "Tear off the receipt and print a fresh one", () => { if (rip || api.t() >= TEAR || last < 12) return; api.poke(); rip = { at: api.now(), t: api.t(), fed: last }; });
      return (t, now) => {
        let d = seg(t, TEAR, TEAR + 0.95), T = t;
        if (rip) { d = Math.max(0.001, (now - rip.at) / 0.95); T = rip.t; if (d >= 1) { rip = null; api.seek(0); return; } }
        const [y, on] = feed(B, T), h = hot(); last = y;
        place(P, y, -1.3 * ob(seg(T, 6.1, 6.8)) + Math.sin(now * 1.1) * 0.25 * (y / H) + 1.1 * h * (y / H), d);
        pr.set(T, shake(y, on), Math.sin(seg(T, 0.05, 0.4) * Math.PI), 0, 0, 0, on);
        let mins = 0;
        ROWS.forEach((row, i) => {
          swipe(inks[i], PX + 11, oc(seg(T, B[i][1] - 0.05, B[i][1] + 0.32))); // the second ink lands after the key line
          const p = io(seg(T, B[i][0], B[i][1] + 0.25)); arcs[i].a.setAttribute("stroke-dasharray", `${(arcs[i].len * p).toFixed(2)} ${C}`); arcs[i].a.setAttribute("opacity", p > 0 ? 1 : 0); mins += row[2] * p;
        });
        const out = 1 - seg(d, 0.2, 0.9); // tearing winds the dial back
        arcs.forEach((o) => { if (d > 0) { const e = cl((20 * io(out) - o.from) / o.m); o.a.setAttribute("stroke-dasharray", `${(o.len * e).toFixed(2)} ${C}`); o.a.setAttribute("opacity", e > 0 ? 1 : 0); } });
        if (d > 0) mins = 20 * io(out);
        hand.setAttribute("transform", `rotate(${(mins * 18 + 5 * Math.sin(seg(T, 3.55, 4.0) * Math.PI * 2) * (1 - seg(T, 3.55, 4.0))).toFixed(2)} ${CX} ${CY})`);
        dial.setAttribute("transform", `translate(${CX} ${CY}) scale(${1 + 0.05 * Math.sin(seg(T, 4.5, 4.95) * Math.PI)}) translate(${-CX} ${-CY})`);
        swipe(thl, tx, ob(seg(T, 4.5, 4.95)));
        const k = seg(T, 6.2, 6.62);
        stamp.setAttribute("transform", `translate(${W / 2} 424) rotate(-2.5) scale(${(1 + 0.75 * Math.pow(1 - k, 3) - 0.07 * Math.sin(k * Math.PI)).toFixed(3)})`);
        stamp.setAttribute("opacity", cl(k * 5));
        spark(ob(seg(T, 6.55, 6.95)));
        drift(back, now);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 9.6, still: 4.8,
    build(svg) {
      const SX = 772, SY = 436, W = 270, H = 236, TEAR = 8.6;
      const B = [[1.0, 1.4, 88], [1.8, 2.15, 152], [2.6, 3.0, H]];
      const back = [half(svg, 768, 300, 172, LIL, 14), disc(svg, 916, 150, 24, SKY)];
      marks(svg, 960, 540);
      const pill = el("g", {}, svg);
      el("rect", { x: -76, y: -18, width: 158, height: 42, rx: 21, fill: YEL }, pill);
      el("rect", { x: -79, y: -21, width: 158, height: 42, rx: 21, fill: "none", stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 7, "Use Cases", { "text-anchor": "middle", "font-size": 20, "font-weight": 600 });
      const chk = mono(svg, 896, 78, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 17, fill: MUTE });
      const lines = ["Make money", "while playing", "GTA 6"].map((s, i) => txt(svg, 64, 200 + i * 78, s, { "font-size": 70, "font-weight": 700 }));
      const und = el("path", { d: "M68 388 H250", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", "stroke-dasharray": "200 200" }, svg);
      const sub = txt(svg, 64, 448, "A freelancer's AI agent setup", { "font-size": 27, "font-weight": 500, fill: MUTE });
      const pr = printer(svg, SX, SY, 324, W, 76), P = paper(svg, SX, SY, W, H), m = P.mv;
      P.slot = pr.slotBar(svg);
      let hx = 0;
      const hl = el("rect", { y: 172, height: 34, rx: 6, fill: YEL }, m);
      const ticks = ["Drafts ready", "Invoices drafted", "Approved by you"].map((s, i) => {
        const y = 66 + i * 64, g = el("g", {}, m);
        el("circle", { cx: 3, cy: 3, r: 13, fill: MINT }, g); el("circle", { r: 13, fill: "none", stroke: INK, "stroke-width": 2.5 }, g);
        el("path", { d: "M-6 0 L-1.5 5 L7 -5", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
        const w = mono(m, 64, y, s, { "font-weight": 700 }).getComputedTextLength();
        if (i === 2) { hx = 56; hl.setAttribute("x", hx); hl.setAttribute("width", w + 16); }
        return { g, y: y - 6 };
      });
      return (t, now) => {
        const d = seg(t, TEAR, TEAR + 0.95), [y, on] = feed(B, t);
        place(P, y, -1.8 * ob(seg(t, 3.0, 3.7)) + Math.sin(now * 1.2) * 0.3 * (y / H), d);
        pr.set(t, shake(y, on), Math.sin(seg(t, 0.6, 1.0) * Math.PI), 0, 0, 0, on);
        ticks.forEach((k, i) => { const s = ob(seg(t, B[i][1] + 0.02, B[i][1] + 0.4)); k.g.setAttribute("transform", `translate(36 ${k.y}) scale(${Math.max(s, 0.001)})`); });
        swipe(hl, hx, ob(seg(t, 3.25, 3.7)));
        /* the type sets itself once, on first view */
        const p = ob(seg(now, 0, 0.5)); pill.setAttribute("transform", `translate(143 69) scale(${Math.max(p, 0.001)})`);
        lines.forEach((n, i) => { const k = oc(seg(now, 0.12 + i * 0.1, 0.72 + i * 0.1)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${(28 * (1 - k)).toFixed(2)})`); });
        und.setAttribute("stroke-dashoffset", 200 * (1 - oc(seg(now, 0.7, 1.15)))); und.setAttribute("opacity", now > 0.7 ? 1 : 0);
        const s2 = oc(seg(now, 0.85, 1.35)); sub.setAttribute("opacity", s2); sub.setAttribute("transform", `translate(0 ${(14 * (1 - s2)).toFixed(2)})`);
        chk.setAttribute("opacity", oc(seg(now, 1.0, 1.5)));
        drift(back, now);
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
    let off = 0, raf = 0, seen = false, held = calm, base = performance.now(), fresh = true, holdTo = -1, cur = sc.still;
    const clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => {
      const now = clock();
      if (held) { cur = sc.still; draw(cur, 1e4); return; }
      let t = (((now + off) % sc.dur) + sc.dur) % sc.dur;
      if (now < holdTo && t >= sc.still) { off = sc.still - now; t = sc.still; }
      cur = t; draw(t, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, t: () => cur, seek: (s) => { off = s - clock(); held = false; tick(); }, hold: (s) => { holdTo = clock() + s; }, poke: () => { if (held) { held = false; off = sc.still - clock(); } tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { const T = isNaN(fixed) ? sc.still : fixed; draw(T, isNaN(fixed) ? 1e4 : T); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (fresh) { fresh = false; base = performance.now(); off = 0; } tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('600 20px "Space Grotesk"'), document.fonts.load('500 20px "JetBrains Mono"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
