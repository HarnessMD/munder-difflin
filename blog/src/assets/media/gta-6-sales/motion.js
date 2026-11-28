/* Bright coded scenes for "GTA 6 sales". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", AQUA = "#3FC6C9", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 14, "font-weight": 700 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const back = (x, c) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const ob = (x) => back(x, 1.70158);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const settle = (x, n) => back(x, cl(1.9 / Math.sqrt(n), 0.5, 1.7)); // a roll that ends with a small bounce
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const poly = (p, pts, a) => el("polygon", Object.assign({ points: pts.map((q) => q.join(",")).join(" "), "stroke-linejoin": "round" }, a), p);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const hover = (g, api) => { // true while the pointer or the keyboard focus is on g
    const s = { on: false, v: 0 };
    const set = (v) => () => { s.on = v; api.poke(); };
    g.addEventListener("pointerenter", set(true)); g.addEventListener("pointerleave", set(false));
    g.addEventListener("focus", set(true)); g.addEventListener("blur", set(false));
    return s;
  };
  let uid = 0;

  /* ---- the kit: island, water, palm, dock, odometer, flag, chip ---- */
  const IP = [[-1, 0.02], [-0.62, -0.3], [-0.1, -0.42], [0.5, -0.36], [0.95, -0.1], [0.8, 0.22], [0.3, 0.42], [-0.4, 0.38]];
  const water = (p, w, k = 1.3) => {
    const g = el("g", {}, p), P = IP.map(([x, y]) => [x * w * k, y * w * k]);
    poly(g, P, { fill: SKY, "fill-opacity": 0.5 });
    poly(g, [P[0], P[1], [P[1][0] + w * 0.3, P[1][1] + w * 0.2]], { fill: "#fff", "fill-opacity": 0.5 });
    poly(g, [P[4], P[5], [P[5][0] - w * 0.35, P[5][1] - w * 0.12]], { fill: "#fff", "fill-opacity": 0.45 });
    poly(g, [P[6], P[7], [P[7][0] + w * 0.3, P[7][1] - w * 0.16]], { fill: AQUA, "fill-opacity": 0.18 });
    const rip = el("g", {}, g);
    [[-1.05, 0.34, 0.2], [0.72, 0.4, 0.16], [0.98, 0.1, 0.12], [-0.2, 0.5, 0.14]].forEach(([x, y, l]) => el("path", { d: `M${x * w} ${y * w} h${l * w}`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round" }, rip));
    return { g, rip };
  };
  const island = (p, w, d) => {
    const g = el("g", {}, p);
    const T = IP.map(([x, y]) => [x * w, y * w]), B = IP.map(([x, y]) => [x * w * 0.7, y * w * 0.55 + d]);
    poly(g, [4, 5, 6, 7, 0].map((i) => [B[i][0] + 12, B[i][1] + 14]).concat([[T[0][0] + 12, T[0][1] + 14], [T[4][0] + 12, T[4][1] + 14]]), { fill: LIL, "fill-opacity": 0.4 });
    [[4, 5, BLUE, 0], [5, 6, AQUA, 0], [6, 7, AQUA, 0.28], [7, 0, AQUA, 0.5]].forEach(([a, b, f, o]) => {
      poly(g, [T[a], T[b], B[b], B[a]], { fill: f, stroke: INK, "stroke-width": 2.5 });
      if (o) poly(g, [T[a], T[b], B[b], B[a]], { fill: "#fff", "fill-opacity": o });
    });
    [[4, 5], [5, 6], [6, 7], [7, 0]].forEach(([a, b]) => poly(g, [T[a], T[b], B[b], B[a]], { fill: "none", stroke: INK, "stroke-width": 2.5 }));
    poly(g, T, { fill: MINT });
    const C = [w * 0.08, -w * 0.04];
    [0, 0.34, 0.14, 0, 0.24, 0, 0.4, 0.12].forEach((o, i) => { if (o) poly(g, [C, T[i], T[(i + 1) % 8]], { fill: "#fff", "fill-opacity": o }); });
    poly(g, [C, T[3], T[4]], { fill: AQUA, "fill-opacity": 0.22 });
    poly(g, T, { fill: "none", stroke: INK, "stroke-width": 3 });
    return g;
  };
  const palm = (p, x, y, s) => {
    const g = el("g", {}, p), q = el("g", {}, g);
    el("path", { d: "M-5 0 L-2 -22 L3 -44 L9 -62 L16 -60 L11 -42 L7 -21 L6 0 Z", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, q);
    el("path", { d: "M-2 -22 L7 -21 M3 -44 L11 -42", stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, q);
    const crown = el("g", { transform: "translate(12 -62)" }, q);
    [[-38, -4], [-24, -28], [5, -37], [32, -22], [38, 6]].forEach(([lx, ly], i) => poly(crown, [[0, 0], [lx * 0.5 - ly * 0.2, ly * 0.5 + lx * 0.2], [lx, ly], [lx * 0.5 + ly * 0.2, ly * 0.5 - lx * 0.2]], { fill: i % 2 ? AQUA : MINT, stroke: INK, "stroke-width": 2.5 }));
    el("circle", { cx: 2, cy: 5, r: 4.5, fill: YEL, stroke: INK, "stroke-width": 2 }, crown);
    q.setAttribute("transform", `scale(${s})`); tf(g, x, y);
    return { g, sway: (a) => crown.setAttribute("transform", `translate(12 -62) rotate(${a})`) };
  };
  const dock = (p) => {
    const g = el("g", {}, p);
    [-104, -24, 62].forEach((x) => el("path", { d: `M${x} 12 V34`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g));
    poly(g, [[-110, 10], [120, 10], [120, 19], [-110, 19]], { fill: LIL, stroke: INK, "stroke-width": 2.5 });
    poly(g, [[-130, -10], [100, -10], [120, 10], [-110, 10]], { fill: "#fff", stroke: INK, "stroke-width": 2.5 });
    [-92, -54, -16, 22, 60].forEach((x) => el("path", { d: `M${x} -10 l20 20`, stroke: INK, "stroke-width": 1.5 }, g));
    return g;
  };
  const figure = (p, fill) => { // a simple round head figure, sitting
    const g = el("g", {}, p);
    el("path", { d: "M-10 0 V-16 Q-10 -26 0 -26 Q10 -26 10 -16 V0 Z", fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g);
    el("circle", { cy: -36, r: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    el("circle", { cx: -5.5, cy: -37, r: 1.6, fill: INK }, g); el("circle", { cx: 0.5, cy: -37, r: 1.6, fill: INK }, g);
    return g;
  };
  const drum = (p, x, w, h, fs) => {
    const id = "mgsales" + (++uid), cp = el("clipPath", { id }, p);
    el("rect", { x, y: -h / 2, width: w, height: h, rx: 5 }, cp);
    el("rect", { x, y: -h / 2, width: w, height: h, rx: 5, fill: "#fff" }, p);
    const c = el("g", { "clip-path": `url(#${id})` }, p);
    const a = mono(c, x + w / 2, 0, "", { "text-anchor": "middle", "font-size": fs }), b = mono(c, x + w / 2, 0, "", { "text-anchor": "middle", "font-size": fs });
    el("rect", { x, y: -h / 2, width: w, height: h * 0.17, fill: SOFT }, c);
    el("rect", { x, y: h / 2 - h * 0.17, width: w, height: h * 0.17, fill: SOFT }, c);
    el("rect", { x, y: -h / 2, width: w, height: h, rx: 5, fill: "none", stroke: INK, "stroke-width": 2 }, p);
    return (pos, glyph) => {
      const i = Math.floor(pos), f = pos - i;
      a.textContent = glyph(i); b.textContent = glyph(i + 1);
      a.setAttribute("y", fs * 0.35 - f * h); b.setAttribute("y", fs * 0.35 + (1 - f) * h);
    };
  };
  // spec: "d" is a rolling drum, "." a fixed point, a string fixed text, an array fixed lines of text
  const odo = (p, spec, fs, fill) => {
    const g = el("g", {}, p), h = Math.round(fs * 1.5), cw = Math.round(fs * 0.8), items = []; let x = 0;
    spec.forEach((s) => { const w = s === "d" ? cw : s === "." ? fs * 0.24 : (Array.isArray(s) ? s[0] : s).length * 8.5 + 8; items.push([s, x, w]); x += w + 4; });
    const W = x - 4 + 24, H = h + 20, x0 = -W / 2 + 12, drums = [];
    el("rect", { x: -W / 2 + 6, y: -H / 2 + 8, width: W, height: H, rx: 13, fill: LIL, "fill-opacity": 0.55 }, g);
    el("rect", { x: -W / 2, y: -H / 2, width: W, height: H, rx: 13, fill, stroke: INK, "stroke-width": 3 }, g);
    el("path", { d: `M${-W / 2 + 14} ${-H / 2 + 5} H${W / 2 - 14}`, stroke: "#fff", "stroke-opacity": 0.6, "stroke-width": 2.5, "stroke-linecap": "round" }, g);
    el("rect", { x: W / 2 + 1.5, y: -9, width: 9, height: 18, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
    items.forEach(([s, ix, w]) => {
      if (s === "d") drums.push(drum(g, x0 + ix, w, h, fs));
      else if (s === ".") el("circle", { cx: x0 + ix + w / 2, cy: fs * 0.3, r: fs * 0.06 + 1.6, fill: INK }, g);
      else if (Array.isArray(s)) s.forEach((line, i) => mono(g, x0 + ix + w / 2, 5 + (i - (s.length - 1) / 2) * 20, line, { "text-anchor": "middle" }));
      else mono(g, x0 + ix + w / 2, 5, s, { "text-anchor": "middle" });
    });
    return { g, W, H, drums };
  };
  const legs = (p, x, y0, y1) => [-x, x].forEach((v) => { el("path", { d: `M${v} ${y0} V${y1}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, p); el("path", { d: `M${v - 8} ${y1} H${v + 8}`, stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, p); });
  const flag = (p, s, fill, pole) => { // origin at the pole base, the pennant flies to the right of the pole top
    const g = el("g", {}, p), w = s.length * 8.5 + 30, h = 30, y = -pole;
    if (pole) { el("path", { d: `M0 0 V${y - 5}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g); el("circle", { cy: y - 7, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g); }
    const f = el("g", {}, g);
    el("path", { d: `M5 ${y + 6} H${w + 5} l-9 ${h / 2} l9 ${h / 2} H5 Z`, fill: LIL, "fill-opacity": 0.5 }, f);
    el("path", { d: `M0 ${y} H${w} l-9 ${h / 2} l9 ${h / 2} H0 Z`, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, f);
    mono(f, 11, y + 20, s);
    return { g, f, pop: (k) => { f.setAttribute("transform", `translate(0 ${y + h / 2}) scale(${cl(ob(k), 0, 2)} ${0.6 + 0.4 * cl(ob(k), 0, 2)}) translate(0 ${-y - h / 2})`); f.setAttribute("opacity", cl(k * 6)); } };
  };
  const chip = (p, s, fs = 20) => {
    const g = el("g", {}, p), w = s.length * fs * 0.6 + 44, h = fs + 28;
    el("rect", { x: -w / 2 + 6, y: -h / 2 + 7, width: w, height: h, rx: h / 2, fill: LIL, "fill-opacity": 0.6 }, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    mono(g, 0, fs * 0.35, s, { "text-anchor": "middle", "font-size": fs });
    return g;
  };
  const land = (g, x, y, k, r) => { tf(g, x, y - 50 * (1 - oc(cl(k * 1.5))), 0.5 + 0.5 * ob(k), r - 9 * (1 - oc(k))); g.setAttribute("opacity", cl(k * 5)); };
  const rise = (g, x, y, k, s = 1) => { tf(g, x, y + 46 * (1 - ob(k)), s); g.setAttribute("opacity", cl(k * 4)); };
  const grow = (g, x, y, k) => { tf(g, x, y, cl(ob(k), 0.001, 2)); g.setAttribute("opacity", cl(k * 5)); };
  const fade = (g, t, dur) => g.setAttribute("opacity", Math.min(seg(t, 0, 0.25), 1 - seg(t, dur - 0.3, dur)));
  // a track of glyphs that passes through n digits between each pair of states
  const track = (states, n) => {
    const tr = [states[0]], keys = [0];
    for (let s = 1; s < states.length; s++) { const a = tr[tr.length - 1], base = /\d/.test(a) ? +a : 0; for (let k = 1; k < n; k++) tr.push(String((base + k) % 10)); tr.push(states[s]); keys.push(tr.length - 1); }
    const last = tr.length - 1;
    return { keys, last, glyph: (i) => (i <= last ? tr[Math.max(0, i)] : (i - last) % 12 === 0 ? tr[last] : String((i * 7) % 10)) };
  };
  const rollPos = (T, t, starts, len, lag) => { let p = 0; starts.forEach((s, i) => { const n = T.keys[i + 1] - T.keys[i]; p += n * settle(seg(t, s + lag, s + len + lag), n); }); return p; };
  const again = (T, u, lag, len = 1.3) => T.last + 12 * settle(seg(u, lag, len + lag), 12); // one more full turn, lands on the same glyph
  const spinGlyph = (i) => String(((i % 10) + 10) % 10);

  const SC = {};

  /* ---- 1. the estimate odometer climbs, the publisher counter never settles ---- */
  SC.odometer = {
    dur: 10, still: 9.4,
    build(svg, api) {
      const R = el("g", {}, svg);
      const w1 = water(R, 215), w2 = water(R, 120, 1.15);
      const dk = el("g", {}, R); dock(dk);
      const fig = figure(dk, LIL); tf(fig, 62, -8);
      const pf = flag(dk, "Publisher count", "#fff", 150); tf(pf.g, -112, -4);
      const pg = el("g", {}, dk); legs(pg, 30, 32, 66); const po = odo(pg, ["d", "d", "d"], 30, LIL);
      el("path", { d: "M70 -16 q9 16 0 32 M81 -9 q5 9 0 18", stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round" }, pg);
      const isl = el("g", {}, R), land0 = island(isl, 215, 56);
      el("ellipse", { cx: 0, cy: 28, rx: 236, ry: 112, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 8" }, isl);
      const pm = palm(isl, -150, -8, 1);
      const mast = el("g", {}, isl);
      el("path", { d: "M0 0 V-300", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, mast); el("circle", { cy: -302, r: 5, fill: YEL, stroke: INK, "stroke-width": 2.5 }, mast);
      el("path", { d: "M-9 0 H9", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, mast);
      const dates = [["4 Nov", "#fff", -150], ["11 Nov", SKY, -205], ["13 Nov", LIL, -260]].map(([s, f, y]) => { const fl = flag(mast, s, f, 0); tf(fl.g, 0, y); return fl; });
      const tw = el("g", {}, isl);
      legs(tw, 62, 50, 138); el("path", { d: "M-62 96 L62 132 M62 96 L-62 132", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tw);
      el("path", { d: "M0 -80 V-50", stroke: INK, "stroke-width": 4 }, tw);
      const main = odo(tw, ["d", "d", "d", "d"], 58, BLUE);
      const sign = el("g", {}, tw);
      el("rect", { x: -104, y: -128, width: 218, height: 54, rx: 10, fill: LIL, "fill-opacity": 0.5 }, sign);
      el("rect", { x: -109, y: -134, width: 218, height: 54, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sign);
      mono(sign, 0, -112, "Sensor Tower estimate", { "text-anchor": "middle" }); mono(sign, 0, -92, "million copies", { "text-anchor": "middle", fill: MUTE });
      const ch = chip(R, "Official: soon enough");
      const T = [["0", "7", "1", " "], [".", ".", "0", " "], ["0", "7", ".", "1"], ["0", "1", "3", "1"]].map((s, j) => track(s, 10 + j * 3));
      const hv = hover(isl, api); let tap = null, extra = 0;
      button(isl, "Roll both counters again", () => { tap = api.now(); extra += 14; api.poke(); });
      return (t, now) => {
        fade(R, t, 10);
        hv.v += ((hv.on ? 1 : 0) - hv.v) * 0.18;
        const u = tap == null ? 9 : now - tap, bob = Math.sin(now * 1.2) * 2.5, bob2 = Math.sin(now * 1.5 + 1.4) * 2;
        tf(w1.g, 500, 436); w1.g.setAttribute("opacity", oc(seg(t, 0, 0.5))); w1.rip.setAttribute("transform", `translate(${Math.sin(now * 0.7) * 8} 0)`);
        tf(w2.g, 190, 444); w2.g.setAttribute("opacity", oc(seg(t, 0.1, 0.6))); w2.rip.setAttribute("transform", `translate(${Math.sin(now * 0.9 + 2) * 6} 0)`);
        rise(isl, 500, 394 + bob - 6 * hv.v, seg(t, 0.1, 0.75));
        rise(dk, 200, 414 + bob2, seg(t, 0.22, 0.85));
        pm.g.setAttribute("transform", `translate(-150 -8) scale(${cl(ob(seg(t, 0.5, 0.95)), 0.001, 2)})`); pm.sway(Math.sin(now * 1.7) * 4 + 6 * hv.v * Math.sin(now * 9));
        grow(tw, 0, -155, seg(t, 0.42, 0.95)); grow(mast, 142, -4, seg(t, 0.62, 1.1));
        grow(pg, -35, -68, seg(t, 0.52, 1.0)); pf.pop(seg(t, 0.8, 1.2)); pf.g.setAttribute("opacity", cl(seg(t, 0.7, 0.8)));
        grow(fig, 62, -8, seg(t, 0.9, 1.3));
        sign.setAttribute("opacity", cl(seg(t, 0.7, 0.95)));
        main.drums.forEach((d, j) => d(u < 2 ? again(T[j], u, j * 0.09) : rollPos(T[j], t, [1.3, 3.1, 4.9], 1.0, j * 0.09), T[j].glyph));
        po.drums.forEach((d, j) => d(now * (6.5 + j * 2.3) + t * 1.3 + [0.94, 3.04, 5.86][j] + extra - 14 * (1 - oc(seg(u, 0, 1.6))) * (tap == null ? 0 : 1), spinGlyph));
        dates.forEach((f, i) => f.pop(seg(t, 2.25 + i * 1.8, 2.7 + i * 1.8)));
        land(ch, 192, 522, seg(t, 6.9, 7.4), -3);
      };
    },
  };

  /* ---- 2. three islands, three company totals, no GTA 6 line ---- */
  SC.bookings = {
    dur: 10, still: 9.4,
    build(svg, api) {
      const R = el("g", {}, svg);
      const head = txt(R, 40, 64, "Net bookings, billions of dollars", { "font-size": 31, "font-weight": 700 });
      const rule = el("path", { d: "M42 84 H190", stroke: SKY, "stroke-width": 8, "stroke-linecap": "round" }, R);
      const DATA = [
        { x: 140, tag: ["Jul to Sep"], spec: ["d", ".", "d", "d"], st: [["0", "1"], ["0", "6"], ["0", "0"]], fill: BLUE },
        { x: 400, tag: ["Oct to Dec", "outlook"], spec: ["d", ".", "d", "d", "to", "d", ".", "d"], st: [["0", "3"], ["0", "3"], ["0", "5"], ["0", "3"], ["0", "5"]], fill: BLUE },
        { x: 660, tag: ["Year to March 2027", "outlook"], spec: ["d", ".", "d", "to", "d", ".", "d"], st: [["0", "8"], ["0", "0"], ["0", "8"], ["0", "2"]], fill: BLUE },
      ];
      const waters = DATA.map((d) => water(R, 100, 1.22));
      const isles = DATA.map((d, i) => {
        const g = el("g", {}, R); island(g, 100, 44);
        el("ellipse", { cx: 0, cy: 22, rx: 116, ry: 62, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 8" }, g);
        const pm = palm(g, 76, 14, 0.55);
        const up = el("g", {}, g);
        el("path", { d: "M0 -140 V-190", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, up);
        const og = el("g", {}, up); legs(og, 40, 30, 106); const o = odo(og, d.spec, 28, d.fill); tf(og, 0, -118);
        const sg = el("g", {}, up), front = el("g", {}, sg), rear = el("g", {}, sg);
        el("rect", { x: -88, y: -21, width: 186, height: 54, rx: 10, fill: LIL, "fill-opacity": 0.5 }, sg);
        sg.insertBefore(sg.lastChild, front);
        el("rect", { x: -93, y: -27, width: 186, height: 54, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, front);
        d.tag.forEach((s, k) => mono(front, 0, 5 + (k - (d.tag.length - 1) / 2) * 20, s, { "text-anchor": "middle", fill: k ? MUTE : INK }));
        el("rect", { x: -93, y: -27, width: 186, height: 54, rx: 10, fill: SKY, stroke: INK, "stroke-width": 2.5 }, rear);
        mono(rear, 0, 6, "Every game", { "text-anchor": "middle", "font-size": 17 });
        const it = { g, up, og, sg, front, rear, o, pm, T: d.st.map((s, j) => track(s, 10 + j * 2)), flip: false, at: null, hv: hover(g, api) };
        button(g, `${d.tag.join(" ")}: flip the tag`, () => { it.flip = !it.flip; it.at = api.now(); api.poke(); });
        return it;
      });
      const ch = chip(R, "GTA 6 alone: not broken out", 19);
      return (t, now) => {
        fade(R, t, 10);
        const hk = oc(seg(t, 0.05, 0.5)); head.setAttribute("transform", `translate(${-24 * (1 - hk)} 0)`); head.setAttribute("opacity", hk);
        rule.setAttribute("stroke-dasharray", `${148 * oc(seg(t, 0.3, 0.8))} 400`); rule.setAttribute("opacity", t < 0.3 ? 0 : 1);
        isles.forEach((it, i) => {
          const d = DATA[i], s = 0.25 + i * 0.11;
          it.hv.v += ((it.hv.on ? 1 : 0) - it.hv.v) * 0.18;
          tf(waters[i].g, d.x, 469); waters[i].g.setAttribute("opacity", oc(seg(t, s - 0.1, s + 0.4))); waters[i].rip.setAttribute("transform", `translate(${Math.sin(now * 0.8 + i * 2) * 5} 0)`);
          rise(it.g, d.x, 442 + Math.sin(now * 1.25 + i * 1.9) * 2.2 - 6 * it.hv.v, seg(t, s, s + 0.6));
          it.pm.sway(Math.sin(now * 1.7 + i) * 4 + 6 * it.hv.v * Math.sin(now * 9));
          grow(it.up, 0, 0, seg(t, s + 0.3, s + 0.8));
          const k = it.at == null ? 1 : io(seg(now - it.at, 0, 0.5)), a = (it.flip ? k : 1 - k) * Math.PI, c = Math.cos(a);
          it.sg.setAttribute("transform", `translate(0 -205) scale(${Math.max(0.02, Math.abs(c))} ${1 + 0.06 * Math.sin(a)})`);
          it.front.setAttribute("opacity", c >= 0 ? 1 : 0); it.rear.setAttribute("opacity", c >= 0 ? 0 : 1);
          const r0 = 1.5 + i * 1.6;
          it.o.drums.forEach((dr, j) => dr(rollPos(it.T[j], t, [r0], 1.0, j * 0.08), it.T[j].glyph));
          tf(it.og, 0, -118 - 5 * Math.sin(Math.PI * seg(t, r0 + 1.0 + (it.o.drums.length - 1) * 0.08, r0 + 1.35 + (it.o.drums.length - 1) * 0.08)));
        });
        land(ch, 560, 140, seg(t, 6.9, 7.4), -2.5);
      };
    },
  };

  /* ---- 3. a seesaw that cannot tip: an estimate on one seat, question marks on the other ---- */
  SC.breakeven = {
    dur: 10, still: 9.4,
    build(svg, api) {
      const R = el("g", {}, svg);
      const w1 = water(R, 170, 1.28);
      const isl = el("g", {}, R); island(isl, 170, 48);
      const pm = palm(isl, 104, 44, 0.62);
      const ful = el("g", {}, isl);
      poly(ful, [[8, -66], [-30, 2], [46, 2]], { fill: LIL, "fill-opacity": 0.45 });
      poly(ful, [[0, -74], [-38, -6], [38, -6]], { fill: LIL, stroke: INK, "stroke-width": 3 });
      poly(ful, [[0, -74], [-38, -6], [-8, -6]], { fill: "#fff", "fill-opacity": 0.35 });
      const pl = el("g", {}, isl);
      const lf = flag(pl, "Preorders, estimate", "#fff", 148); tf(lf.g, -292, -8);
      const rf = flag(pl, "Budget", "#fff", 148); tf(rf.g, 148, -8);
      el("rect", { x: -296, y: -1, width: 600, height: 14, rx: 7, fill: LIL, "fill-opacity": 0.5 }, pl);
      el("rect", { x: -300, y: -8, width: 600, height: 14, rx: 7, fill: SKY, stroke: INK, "stroke-width": 3 }, pl);
      el("path", { d: "M-286 -3 H286", stroke: "#fff", "stroke-opacity": 0.7, "stroke-width": 2.5, "stroke-linecap": "round" }, pl);
      el("circle", { cy: -1, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, pl);
      const lg = el("g", {}, pl), lo = odo(lg, ["d", ["billion dollars", "plus"]], 36, BLUE);
      const rg = el("g", {}, pl);
      el("rect", { x: -74, y: -50, width: 148, height: 100, rx: 20, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "3 8" }, rg);
      const ro = odo(rg, ["d", "d", "d"], 36, LIL);
      const ch = chip(R, "Made it back? Not published.");
      const TL = track(["0", "1"], 11), TR = [0, 1, 2].map((j) => track(["0", "?"], 16 + j * 4));
      const hv = hover(rg, api); let tap = null;
      button(rg, "Spin the Budget counter again", () => { tap = api.now(); api.poke(); });
      return (t, now) => {
        fade(R, t, 10);
        hv.v += ((hv.on ? 1 : 0) - hv.v) * 0.18;
        const u = tap == null ? 9 : now - tap;
        tf(w1.g, 400, 496); w1.g.setAttribute("opacity", oc(seg(t, 0, 0.5))); w1.rip.setAttribute("transform", `translate(${Math.sin(now * 0.7) * 7} 0)`);
        rise(isl, 400, 456 + Math.sin(now * 1.2) * 2.2, seg(t, 0.1, 0.75));
        pm.sway(Math.sin(now * 1.7) * 4);
        grow(ful, 0, 0, seg(t, 0.4, 0.85));
        let a = -4 * ob(seg(t, 2.55, 3.05));
        const tau = t - 4.95; if (tau > 0) a = -4 * Math.cos(6.9 * tau) * Math.exp(-1.0 * tau);
        const v = u - 1.55; if (tap != null && v > 0) a += 3 * Math.sin(6.9 * v) * Math.exp(-1.1 * v);
        const pk = seg(t, 0.55, 1.05); pl.setAttribute("transform", `translate(0 ${-78 - 30 * (1 - ob(pk))}) rotate(${a})`); pl.setAttribute("opacity", cl(pk * 4));
        grow(lg, -200, -47, seg(t, 0.75, 1.2)); grow(rg, 207, -47 - 5 * hv.v, seg(t, 0.86, 1.3));
        lf.pop(seg(t, 1.0, 1.4)); lf.g.setAttribute("opacity", cl(seg(t, 0.9, 1.0))); rf.pop(seg(t, 1.1, 1.5)); rf.g.setAttribute("opacity", cl(seg(t, 1.0, 1.1)));
        lo.drums[0](rollPos(TL, t, [1.5], 1.1, 0), TL.glyph);
        ro.drums.forEach((d, j) => d(u < 2.2 ? again(TR[j], u, j * 0.2, 1.15) : rollPos(TR[j], t, [3.4], 1.15, j * 0.2), TR[j].glyph));
        land(ch, 400, 122, seg(t, 6.9, 7.4), -2.5);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 7, still: 6.4,
    build(svg) {
      el("rect", { x: 64, y: 50, width: 98, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 2.5 }, svg);
      mono(svg, 113, 77, "News", { "text-anchor": "middle", "font-size": 19 });
      txt(svg, 896, 77, "Checked 19 Nov 2026", { "text-anchor": "end", "font-size": 19, "font-weight": 500, fill: MUTE });
      txt(svg, 60, 268, "GTA 6 sales", { "font-size": 96, "font-weight": 700 });
      el("path", { d: "M68 304 H270", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 372, "Preorders, records and what is official", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const R = el("g", {}, svg);
      const w1 = water(R, 128, 1.25);
      const isl = el("g", {}, R); island(isl, 128, 46);
      const pm = palm(isl, -84, 0, 0.72);
      const fl = flag(isl, "Estimate", SKY, 262); tf(fl.g, 84, -2);
      const tw = el("g", {}, isl); legs(tw, 36, 56, 122);
      el("path", { d: "M-36 84 L36 116 M36 84 L-36 116", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, tw);
      const o = odo(tw, ["d", "d"], 62, BLUE);
      const T = [track(["0", "1"], 11), track(["0", "1"], 21)];
      return (t, now) => {
        fade(R, t, 7);
        tf(w1.g, 746, 430); w1.rip.setAttribute("transform", `translate(${Math.sin(now * 0.7) * 6} 0)`);
        rise(isl, 746, 392 + Math.sin(now * 1.2) * 2.2, seg(t, 0.1, 0.75));
        pm.sway(Math.sin(now * 1.7) * 4);
        grow(tw, -8, -140, seg(t, 0.4, 0.9));
        o.drums.forEach((d, j) => d(rollPos(T[j], t, [1.2], 1.3, j * 0.25), T[j].glyph));
        fl.pop(seg(t, 3.0, 3.45)); fl.g.setAttribute("opacity", cl(seg(t, 0.8, 1.0)));
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
