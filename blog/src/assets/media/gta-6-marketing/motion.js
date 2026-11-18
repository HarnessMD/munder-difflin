/* Art Deco poster scenes for "GTA 6 marketing". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", SOFT = "#F1ECF9", MUTE = "#7A6A88", CAP = "#6B5878", NAVY = "#22305E";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x, c = 1.70158) => 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bump = (x) => Math.sin(Math.PI * x);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const show = (n, o) => n.setAttribute("opacity", cl(o));
  let uid = 0;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* hover and focus ease toward 1, read once per frame */
  const hover = (g) => {
    let to = 0, v = 0;
    const on = () => { to = 1; }, out = () => { to = 0; };
    g.addEventListener("pointerenter", on); g.addEventListener("pointerleave", out); g.addEventListener("focus", on); g.addEventListener("blur", out);
    return () => (v += (to - v) * 0.16);
  };
  /* tap: an exit plays for `len` seconds on top of the final frame, then the timeline restarts at `from` */
  const replay = (api, len, from) => {
    let at = -1;
    return {
      hit() { if (at < 0) { at = api.now(); api.poke(); } },
      x(now) { if (at < 0) return 0; const x = (now - at) / len; if (x >= 1) { at = -1; api.seek(from); return -1; } return Math.max(x, 0.0001); },
    };
  };
  const clip = (svg, x, y, w, h) => { const id = `mgd${++uid}`, c = el("clipPath", { id }, el("defs", {}, svg)); el("rect", { x, y, width: w, height: h }, c); return `url(#${id})`; };
  const stroke = (p, d, w = 2.5, col = INK, a = {}) => el("path", Object.assign({ d, stroke: col, "stroke-width": w, fill: "none" }, a), p);
  /* a line that draws itself: k from 0 to 1 */
  const pen = (p, d, w, col) => { const n = stroke(p, d, w, col, { pathLength: 1, "stroke-dasharray": "1 1", "stroke-dashoffset": 1 }); return (k) => { n.setAttribute("stroke-dashoffset", 1 - cl(k)); n.setAttribute("opacity", k <= 0.002 ? 0 : 1); }; };
  const diaD = (r) => `M0 ${-r} L${r * 0.72} 0 L0 ${r} L${-r * 0.72} 0 Z`;
  const dia = (p, x, y, r, fill = YEL, sw = 2) => { const g = el("g", {}, p); el("path", { d: diaD(r), fill, stroke: INK, "stroke-width": sw, "stroke-linejoin": "round" }, g); tf(g, x, y); return (s) => tf(g, x, y, Math.max(s, 0)); };
  /* one pointed sunburst ray, drawn pointing up from 0,0 */
  const rayD = (L, r0, hw) => { const s = Math.sin(hw), c = Math.cos(hw); return `M${-r0 * s} ${-r0 * c} L${-L * s} ${-L * c} L0 ${-(L * 1.035 + 4)} L${L * s} ${-L * c} L${r0 * s} ${-r0 * c} Z`; };
  /* stepped silhouette from tiers [halfWidth, top, bottom], top to bottom */
  const stepD = (cx, tiers) => { const r = [], l = []; tiers.forEach(([hw, a, b]) => { r.push(`${cx + hw} ${a}`, `${cx + hw} ${b}`); l.unshift(`${cx - hw} ${b}`, `${cx - hw} ${a}`); }); return "M" + r.concat(l).join(" L") + " Z"; };
  /* tall condensed display line: Space Grotesk 700 squeezed on x, fitted to maxW */
  const cond = (p, x, y, s, size, maxW, a = {}) => {
    const g = el("g", {}, p), t = txt(g, 0, 0, s, Object.assign({ "text-anchor": "middle", "font-size": size, "font-weight": 700, style: "font-variant-numeric: tabular-nums" }, a));
    let len = 0; try { len = t.getComputedTextLength(); } catch (e) { len = 0; }
    if (!len) len = size * 0.58 * s.length;
    const sx = Math.min(0.76, maxW / len);
    const set = (k = 1, dy = 0) => g.setAttribute("transform", `translate(${x} ${y + dy}) scale(${sx * k} ${k})`);
    set();
    return { g, t, set };
  };
  /* the yellow punchline chip, centred on 0,0 */
  const chip = (p, s, w) => {
    const g = el("g", {}, p), h = 46;
    el("rect", { x: -w / 2, y: -h / 2 + 7, width: w, height: h, rx: h / 2, fill: LIL, "fill-opacity": 0.6 }, g);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: h / 2, fill: YEL, stroke: INK, "stroke-width": 2.75 }, g);
    stroke(g, `M${-w / 2 + 24} ${-h / 2 + 8} H${w / 2 - 24}`, 2.5, "#fff", { "stroke-opacity": 0.6, "stroke-linecap": "round" });
    el("path", { d: diaD(5), fill: INK, transform: `translate(${-w / 2 + 22} 0)` }, g);
    el("path", { d: diaD(5), fill: INK, transform: `translate(${w / 2 - 22} 0)` }, g);
    txt(g, 0, 6.5, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 });
    return g;
  };

  const SC = {};

  /* ---- 1. the sunburst: two trailers, 17 months apart ---- */
  SC.sunburst = {
    dur: 8.6, still: 8.6,
    build(svg, api) {
      const AX = 400, BASE = 500, END = 8.6, D = Math.PI / 180;
      const hit = el("g", {}, svg);
      el("rect", { width: 800, height: 600, fill: "#fff", "fill-opacity": 0 }, hit);
      el("rect", { x: 12, y: 12, width: 776, height: 576, rx: 12, fill: "none", stroke: BLUE, "stroke-width": 4, class: "mg-ring" }, hit);
      const reach = (th) => { const s = Math.sin(th), c = Math.cos(th); let r = 60; for (; r < 460; r += 2) { const X = AX + s * r, Y = BASE - c * r; if (Y >= 270 ? Math.abs(X - AX) > 172 : ((X - AX) / 250) ** 2 + ((Y - 270) / 170) ** 2 > 1) break; } return r; };
      /* back layer: thin navy lines, a slower fan */
      const fine = [];
      for (let j = -6; j < 6; j++) { const th = (j + 0.5) * 13.5; fine.push({ th, len: reach(th * D) * 0.8, n: stroke(hit, "M0 0", 1.5, NAVY, { "stroke-linecap": "round" }) }); }
      /* front layer: yellow rays */
      const rays = [];
      for (let j = -6; j <= 6; j++) { const th = j * 13.5; rays.push({ j, th, len: reach(th * D) * (j % 2 ? 0.6 : 0.9), n: el("path", { fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, hit) }); }
      /* stepped pillars, shadows fall away from the sun */
      const pc = clip(svg, 0, 0, 800, BASE), pillars = el("g", { "clip-path": pc }, hit);
      const tiers = [[65, 440], [50, 352], [35, 270]];
      const mkPillar = (cx, dir) => tiers.map(([hw, top], i) => ({ top, i })).reverse().map(({ top, i }) => {
        const hw = tiers[i][0], g = el("g", {}, pillars), h = BASE - top + 40;
        el("rect", { x: cx - hw + dir * 9, y: top + 7, width: hw * 2, height: h, fill: LIL, "fill-opacity": 0.38 }, g);
        el("rect", { x: cx - hw, y: top, width: hw * 2, height: h, fill: LIL, stroke: INK, "stroke-width": 2.75 }, g);
        el("rect", { x: cx - dir * (hw - 6) - 3.5, y: top + 7, width: 7, height: h, fill: "#fff", "fill-opacity": 0.5 }, g);
        if (i === 1) [-14, 0, 14].forEach((dx) => stroke(g, `M${cx + dx} ${top + 14} V${top + 78}`, 1.75, INK, { "stroke-linecap": "round" }));
        if (i === 2) el("path", { d: diaD(9), fill: YEL, stroke: INK, "stroke-width": 2, transform: `translate(${cx} ${top + 34})` }, g);
        return { g, top, i };
      });
      const tierG = mkPillar(150, -1).concat(mkPillar(650, 1));
      /* sun and base rules */
      const sun = el("g", {}, hit);
      el("path", { d: "M-58 0 A58 58 0 0 1 58 0 Z", fill: YEL, stroke: INK, "stroke-width": 2.75, "stroke-linejoin": "round" }, sun);
      stroke(sun, "M-40 0 A40 40 0 0 1 40 0", 1.75);
      stroke(sun, "M-22 0 A22 22 0 0 1 22 0", 1.75);
      const base1 = stroke(hit, "", 2.5), base2 = stroke(hit, "", 2.5);
      /* labels under the pillars */
      const labels = [[150, "Trailer 1", "Dec 2023"], [650, "Trailer 2", "May 2025"]].map(([x, a, b]) => { const g = el("g", {}, hit); txt(g, x, 544, a, { "text-anchor": "middle", "font-size": 25, "font-weight": 700 }); txt(g, x, 572, b, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 500, fill: NAVY }); return g; });
      /* the arch: a double thin rule, drawn from both pillars to the apex */
      const arch = el("g", {}, hit);
      const pens = [pen(arch, "M150 270 A250 170 0 0 1 400 100", 2.5), pen(arch, "M650 270 A250 170 0 0 0 400 100", 2.5), pen(arch, "M161 270 A239 159 0 0 1 400 111", 2.5), pen(arch, "M639 270 A239 159 0 0 0 400 111", 2.5)];
      /* the tablet that holds the counter */
      const med = el("g", {}, hit);
      const tab = (hw, hh, n) => `M${-hw + n} ${-hh} H${hw - n} V${-hh + n} H${hw} V${hh - n} H${hw - n} V${hh} H${-hw + n} V${hh - n} H${-hw} V${-hh + n} H${-hw + n} Z`;
      el("path", { d: tab(108, 78, 16), fill: LIL, stroke: INK, "stroke-width": 2.75, transform: "translate(0 9)" }, med);
      el("path", { d: tab(108, 78, 16), fill: "#fff", stroke: INK, "stroke-width": 2.75, "stroke-linejoin": "miter" }, med);
      stroke(med, tab(98, 68, 12), 1.5);
      const num = cond(med, 0, 14, "17", 96, 150);
      const unit = txt(med, 0, 50, "months", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700, fill: NAVY, "letter-spacing": 2 });
      /* the punchline */
      const sp = [[-196, 0], [196, 0], [-220, 0], [220, 0]].map(([dx], i) => dia(hit, AX + dx, 77, i < 2 ? 8 : 4.5, i < 2 ? YEL : INK, i < 2 ? 2 : 0));
      const tag = chip(hit, "Posting schedule: rarely", 340);
      const rp = replay(api, 0.75, 0), hv = hover(hit);
      button(hit, "Fold the rays away and play it again", rp.hit);
      return (t, now) => {
        const x = rp.x(now); if (x < 0) return;
        const h = hv(), T = x > 0 ? END : t;
        const fold = 1 - io(seg(x, 0, 0.7)), gone = 1 - seg(x, 0, 0.45), shr = 1 - io(seg(x, 0.4, 1));
        const beat = bump(seg(T, 6.3, 6.9));
        const bk = oc(seg(T, 0, 0.7)) * shr;
        base1.setAttribute("d", `M${AX - 340 * bk} ${BASE} H${AX + 340 * bk}`); base2.setAttribute("d", `M${AX - 300 * bk} ${BASE + 9} H${AX + 300 * bk}`);
        show(base1, bk > 0.01 ? 1 : 0); show(base2, bk > 0.01 ? 1 : 0);
        tf(sun, AX, BASE, ob(seg(T, 0.2, 0.75)) * shr * (1 + 0.05 * beat));
        rays.forEach((r) => {
          const a = Math.abs(r.j), grow = oc(seg(T, 0.45 + a * 0.03, 1.25 + a * 0.03)), open = ob(seg(T, 0.95 + a * 0.09, 1.95 + a * 0.09), 1.2);
          const L = r.len * grow * shr * (1 + 0.025 * beat + 0.03 * h);
          r.n.setAttribute("d", rayD(Math.max(L, 41), 40, 3.6 * D)); show(r.n, L > 42 ? 1 : 0);
          r.n.setAttribute("transform", `translate(${AX} ${BASE}) rotate(${r.th * open * fold})`);
        });
        fine.forEach((f) => {
          const grow = oc(seg(T, 0.9, 2.0)) * shr, open = oc(seg(T, 1.2, 2.9));
          f.n.setAttribute("d", `M0 -60 V${-Math.max(60, f.len * grow)}`); show(f.n, grow > 0.02 ? 1 : 0);
          f.n.setAttribute("transform", `translate(${AX} ${BASE}) rotate(${f.th * open * fold})`);
        });
        tierG.forEach((p) => { const k = ob(seg(T, 1.5 + p.i * 0.11, 2.3 + p.i * 0.11), 1.1) * (1 - io(seg(x, 0.08, 0.7))); p.g.setAttribute("transform", `translate(0 ${(BASE - p.top + 14) * (1 - k)})`); });
        labels.forEach((g, i) => { const k = oc(seg(T, 2.55 + i * 0.12, 3.05 + i * 0.12)); show(g, k * gone); g.setAttribute("transform", `translate(0 ${12 * (1 - k)})`); });
        const ak = io(seg(T, 3.1, 4.2)) * (1 - io(seg(x, 0, 0.5)));
        pens[0](ak); pens[1](ak); pens[2](seg(ak, 0.08, 1)); pens[3](seg(ak, 0.08, 1));
        const land = seg(T, 7.0, 7.34), after = seg(T, 7.34, 7.85);
        arch.setAttribute("transform", `translate(0 ${4 * bump(seg(T, 7.34, 7.7))})`);
        tf(med, AX, 298, ob(seg(T, 3.75, 4.35)) * (1 - 0.3 * io(x))); show(med, seg(T, 3.75, 3.9) * gone);
        num.t.textContent = String(Math.round(17 * io(seg(T, 4.5, 6.3))));
        num.set(1 + 0.16 * beat); show(unit, seg(T, 4.4, 4.8));
        const cy = -70 + 147 * land * land - 9 * bump(after) * (1 - after) + 4 * bump(seg(T, 7.34, 7.7)) - 3 * h - 46 * io(x);
        tag.setAttribute("transform", `translate(${AX} ${cy}) rotate(${-5 * (1 - land)}) scale(${1 + 0.05 * bump(seg(T, 7.34, 7.6))} ${1 - 0.07 * bump(seg(T, 7.34, 7.6))})`);
        show(tag, seg(T, 7.0, 7.08) * gone);
        sp.forEach((s, i) => s(ob(seg(T, 7.6 + (i >> 1) * 0.1, 8.0 + (i >> 1) * 0.1)) * gone));
      };
    },
  };

  /* ---- 2. the plaque: four lines of a delay note ---- */
  SC.plaque = {
    dur: 8, still: 8,
    build(svg, api) {
      const AX = 400, END = 8, FLOOR = 522, D = Math.PI / 180;
      el("rect", { width: 800, height: 600, fill: YEL, "fill-opacity": 0.26 }, svg);
      /* back layer: a quiet fan of thin rays behind the plaque */
      const rc = clip(svg, 36, 36, 728, 486), back = el("g", { "clip-path": rc }, svg), thin = [];
      for (let j = -9; j <= 9; j++) thin.push({ th: j * 10, n: stroke(back, "M0 0", j % 2 ? 2 : 3.5, YEL, { "stroke-linecap": "round" }) });
      /* double frame, drawn from the axis outward */
      const fr = [22, 32].map((m) => [pen(svg, `M400 ${m} H${800 - m} V${600 - m} H400`, 2.25), pen(svg, `M400 ${m} H${m} V${600 - m} H400`, 2.25)]);
      /* the plaque */
      const shape = stepD(AX, [[75, 64, 84], [122, 84, 104], [170, 104, 470], [196, 470, 496], [222, 496, FLOOR + 30]]);
      const pc = clip(svg, 0, 0, 800, FLOOR), rise = el("g", { "clip-path": pc }, svg);
      const halo = el("path", { d: shape, fill: "#fff", stroke: "#fff", "stroke-width": 20, "stroke-linejoin": "miter" }, rise);
      const hit = el("g", {}, rise);
      el("path", { d: shape, fill: "none", stroke: BLUE, "stroke-width": 13, class: "mg-ring" }, hit);
      el("path", { d: shape, fill: LIL, stroke: INK, "stroke-width": 2.75 }, hit);
      [[84, 122], [104, 170]].forEach(([y, hw]) => stroke(hit, `M${AX - hw + 8} ${y + 7} H${AX + hw - 8}`, 3, "#fff", { "stroke-opacity": 0.5, "stroke-linecap": "round" }));
      stroke(hit, `M${AX - 62} 71 H${AX - 46} M${AX + 46} 71 H${AX + 62}`, 3, "#fff", { "stroke-opacity": 0.5, "stroke-linecap": "round" });
      el("rect", { x: 240, y: 116, width: 320, height: 340, fill: "#fff", "fill-opacity": 0.3, stroke: INK, "stroke-width": 1.75 }, hit);
      stroke(hit, `M${AX - 186} 483 H${AX + 186} M${AX - 212} 509 H${AX + 212}`, 1.75);
      /* crown: a small yellow fan that opens */
      const crown = [];
      for (let j = -3; j <= 3; j++) crown.push({ th: j * 25, n: el("path", { d: rayD(j % 2 ? 26 : 32, 7, 8.5 * D), fill: YEL, stroke: INK, "stroke-width": 1.75, "stroke-linejoin": "round" }, hit) });
      el("path", { d: `M${AX - 9} 108 A9 9 0 0 1 ${AX + 9} 108 Z`, fill: INK }, hit);
      /* four lines slide up into the recess */
      const lc = clip(svg, 241, 117, 318, 338), slot = el("g", { "clip-path": lc }, hit);
      const lines = ["We are sorry", "Exact new date", "One reason", "Thank you"].map((s, i) => {
        const y = 126 + i * 64, g = el("g", {}, slot);
        el("rect", { x: 252, y: y + 6, width: 296, height: 54, rx: 5, fill: NAVY, "fill-opacity": 0.16 }, g);
        el("rect", { x: 252, y, width: 296, height: 54, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        const d1 = dia(g, 274, y + 27, 7), d2 = dia(g, 526, y + 27, 7);
        txt(g, AX, y + 36, s, { "text-anchor": "middle", "font-size": 26, "font-weight": 700 });
        return { g, y, d1, d2, at: 2.1 + i * 0.75 };
      });
      const tag = chip(hit, "Blamed: nobody", 248);
      const f1 = stroke(svg, "", 2.5), f2 = stroke(svg, "", 2.5);
      const rp = replay(api, 0.8, 1.95), hv = hover(hit);
      button(hit, "Clear the lines and stack them again", rp.hit);
      return (t, now) => {
        const x = rp.x(now); if (x < 0) return;
        const h = hv(), T = x > 0 ? END : t;
        fr.forEach((p, i) => { const k = io(seg(T, i * 0.14, 0.95 + i * 0.14)); p[0](k); p[1](k); });
        thin.forEach((r) => {
          const a = Math.abs(r.th) / 10, grow = oc(seg(T, 0.2, 1.2)), open = oc(seg(T, 0.5 + a * 0.03, 1.9 + a * 0.03));
          r.n.setAttribute("d", `M0 -30 V${-30 - 560 * grow}`); show(r.n, grow > 0.01 ? 0.75 : 0);
          r.n.setAttribute("transform", `translate(${AX} 500) rotate(${r.th * open})`);
        });
        const fk = oc(seg(T, 0.2, 0.9));
        f1.setAttribute("d", `M${AX - 300 * fk} ${FLOOR} H${AX + 300 * fk}`); f2.setAttribute("d", `M${AX - 262 * fk} ${FLOOR + 9} H${AX + 262 * fk}`); show(f1, fk > 0.01 ? 1 : 0); show(f2, fk > 0.01 ? 1 : 0);
        const up = ob(seg(T, 0.5, 1.5), 0.9);
        let nudge = 0; lines.forEach((l) => { nudge += 3 * bump(seg(T, l.at + 0.36, l.at + 0.7)); });
        const press = 3.5 * bump(seg(T, 6.58, 6.95));
        hit.setAttribute("transform", `translate(0 ${480 * (1 - up) - nudge + press - 4 * h})`);
        halo.setAttribute("transform", `translate(0 ${480 * (1 - up)})`);
        crown.forEach((c) => { const a = Math.abs(c.th) / 25, k = ob(seg(T, 1.35 + a * 0.07, 1.95 + a * 0.07)); c.n.setAttribute("transform", `translate(${AX} 108) rotate(${c.th * k})`); show(c.n, seg(T, 1.3, 1.4)); });
        const wind = 3.5 * bump(seg(T, 5.95, 6.6));
        lines.forEach((l, i) => {
          const k = ob(seg(T, l.at, l.at + 0.65), 0.75) * (1 - io(seg(x, (3 - i) * 0.12, (3 - i) * 0.12 + 0.6)));
          l.g.setAttribute("transform", `translate(0 ${(470 - l.y) * (1 - k) - wind})`);
          const pop = ob(seg(T, l.at + 0.5, l.at + 0.85)) * (1 + 0.45 * bump(seg(T, 5.1 + i * 0.14, 5.5 + i * 0.14)));
          l.d1(pop); l.d2(pop);
        });
        const ck = seg(T, 6.3, 6.8), cs = (1.75 - 0.75 * ob(ck)) * (1 + 0.35 * io(x));
        tag.setAttribute("transform", `translate(${AX} ${416 - 26 * (1 - oc(ck)) - 30 * io(x)}) rotate(${-7 * (1 - oc(ck))}) scale(${cs})`);
        show(tag, seg(T, 6.3, 6.42) * (1 - seg(x, 0, 0.45)));
      };
    },
  };

  /* ---- 3. the marquee: one date, held ---- */
  SC.marquee = {
    dur: 9, still: 9,
    build(svg, api) {
      const AX = 400, END = 9;
      const X0 = 56, X1 = 744, Y0 = 52, Y1 = 220;
      const shade = el("rect", { x: X0, y: Y0 + 10, width: X1 - X0, height: Y1 - Y0, fill: LIL, "fill-opacity": 0.5 }, svg);
      const hit = el("g", {}, svg);
      el("rect", { x: X0 - 12, y: Y0 - 12, width: X1 - X0 + 24, height: Y1 - Y0 + 24, rx: 6, fill: "none", stroke: BLUE, "stroke-width": 4, class: "mg-ring" }, hit);
      const face = el("rect", { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: "#fff" }, hit);
      const half = (m, dir) => `M400 ${Y0 + m} H${dir > 0 ? X1 - m : X0 + m} V${Y1 - m} H400`;
      const rules = [0, 22].map((m) => [pen(hit, half(m, 1), 2.5), pen(hit, half(m, -1), 2.5)]);
      /* bulbs in the channel between the rules, lit from the axis outward */
      const bulbs = [];
      for (let n = 0; n < 8; n++) [-1, 1].forEach((s) => [Y0 + 11, Y1 - 11].forEach((y) => { const g = el("g", {}, hit), c = el("circle", { r: 5.5, fill: YEL, stroke: INK, "stroke-width": 1.75 }, g); bulbs.push({ g, c, n, x: AX + s * (17 + 34 * n), y }); }));
      /* the one line */
      const hc = clip(svg, X0 + 24, Y0 + 24, X1 - X0 - 48, Y1 - Y0 - 48), hold = el("g", { "clip-path": hc }, hit);
      const head = cond(hold, AX, 157, "Coming November 19, 2026", 60, 580);
      /* lilac stepped corners */
      const stair = "M-7 -7 H66 V22 H44 V44 H22 V66 H-7 Z";
      const corners = [[X0, Y0, 1, 1], [X1, Y0, -1, 1], [X0, Y1, 1, -1], [X1, Y1, -1, -1]].map(([x, y, sx, sy]) => { const g = el("g", {}, hit); el("path", { d: stair, fill: LIL, stroke: INK, "stroke-width": 2.75, "stroke-linejoin": "miter" }, g); stroke(g, "M3 5 H56 M5 3 V56", 3, "#fff", { "stroke-opacity": 0.5, "stroke-linecap": "round" }); return (k) => g.setAttribute("transform", `translate(${x} ${y}) scale(${sx * k} ${sy * k})`); });
      /* the two older dates on flap cards */
      const cards = [["Coming 2025", -1, 2.0], ["May 26, 2026", 1, 3.45]].map(([s, dir, at]) => {
        const g = el("g", {}, svg), w = 250, hh = 31;
        el("rect", { x: -w / 2, y: -hh + 8, width: w, height: hh * 2, rx: 6, fill: LIL, "fill-opacity": 0.5 }, g);
        el("rect", { x: -w / 2, y: -hh, width: w, height: hh * 2, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        [-1, 1].forEach((e) => el("rect", { x: e * (w / 2) - 4, y: -6, width: 8, height: 12, rx: 2, fill: SOFT, stroke: INK, "stroke-width": 1.75 }, g));
        const label = txt(g, 0, 8.5, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 24, "font-weight": 700 });
        const cut = stroke(g, "", 3, NAVY, { "stroke-linecap": "round" }), half = s.length * 7.2 + 14;
        return { g, label, cut, half, dir, at };
      });
      /* the day counter */
      const count = el("g", {}, svg);
      const dayLabel = txt(count, AX + 2, 352, "DAY", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700, fill: NAVY, "letter-spacing": 5 });
      const num = cond(count, AX, 456, "378", 120, 190);
      const wing = [-1, 1].map((s) => [stroke(count, "", 2.5), stroke(count, "", 2.5), dia(count, AX + s * 304, 415, 8), s]);
      const tag = chip(svg, "Changes since: none", 300);
      const rp = replay(api, 0.7, 5.1), hv = hover(hit);
      button(hit, "Run the day counter again", rp.hit);
      return (t, now) => {
        const x = rp.x(now); if (x < 0) return;
        const h = hv(), T = x > 0 ? END : t, back = 1 - io(seg(x, 0, 0.9));
        hit.setAttribute("transform", `translate(0 ${-4 * h})`);
        const fk = seg(T, 0, 0.5); show(face, fk); show(shade, oc(seg(T, 0.5, 1.1)));
        rules.forEach((p, i) => { const k = io(seg(T, i * 0.14, 0.9 + i * 0.14)); p[0](k); p[1](k); });
        corners.forEach((c, i) => c(ob(seg(T, 0.6 + (i >> 1) * 0.1, 1.1 + (i >> 1) * 0.1))));
        head.set(1, 96 * (1 - ob(seg(T, 0.95, 1.7), 0.9)));
        const flash = bump(seg(T, 7.2, 7.7));
        bulbs.forEach((b) => {
          const on = seg(T, 1.1 + b.n * 0.07, 1.3 + b.n * 0.07);
          const wave = T > 5.1 && T < 7.2 && x === 0 ? ((((T - 5.1) * 9 - b.n) % 6) + 6) % 6 < 1.3 : false;
          tf(b.g, b.x, b.y, ob(on) * (1 + 0.4 * flash));
          b.c.setAttribute("fill", wave ? "#fff" : YEL);
        });
        cards.forEach((c) => {
          const u = T - c.at, flip = ob(seg(u, 0, 0.45)), cut = io(seg(u, 0.62, 0.98)), slide = io(seg(u, 0.95, 1.5));
          c.g.setAttribute("transform", `translate(${AX + c.dir * 165 * slide} ${284 - 14 * (1 - oc(seg(u, 0, 0.45))) + 3 * bump(seg(u, 0.62, 0.98))}) scale(1 ${Math.max(flip, 0.001)})`);
          show(c.g, seg(u, 0, 0.08));
          c.cut.setAttribute("d", `M${-c.half} 0 H${-c.half + 2 * c.half * cut}`); show(c.cut, cut > 0.01 ? 1 : 0);
          c.label.setAttribute("fill", cut > 0.5 ? CAP : INK);
        });
        const beat = bump(seg(T, 7.2, 7.75));
        show(count, seg(T, 4.8, 4.95));
        num.t.textContent = String(Math.round(378 * oc(seg(T, 5.1, 7.2)) * back));
        num.set(ob(seg(T, 4.8, 5.15)) * (1 + 0.13 * beat)); show(dayLabel, seg(T, 4.9, 5.2));
        const wk = oc(seg(T, 5.1, 6.4)) * back;
        wing.forEach(([a, b, d, s]) => {
          a.setAttribute("d", `M${AX + s * 118} 410 H${AX + s * (118 + 172 * wk)}`); b.setAttribute("d", `M${AX + s * 118} 420 H${AX + s * (118 + 172 * wk)}`);
          show(a, wk > 0.01 ? 1 : 0); show(b, wk > 0.01 ? 1 : 0);
          d(ob(seg(T, 7.2, 7.6)) * back * (1 + 0.3 * beat));
        });
        const ck = seg(T, 7.7, 8.2), cs = (1.7 - 0.7 * ob(ck)) * (1 + 0.3 * io(x));
        tag.setAttribute("transform", `translate(${AX} ${518 - 24 * (1 - oc(ck)) - 3 * h - 26 * io(x)}) rotate(${-6 * (1 - oc(ck))}) scale(${cs})`);
        show(tag, seg(T, 7.7, 7.82) * (1 - seg(x, 0, 0.45)));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4, still: 4,
    build(svg) {
      const AX = 716, BASE = 474, D = Math.PI / 180;
      const pill = el("g", {}, svg);
      el("rect", { x: -78, y: -16, width: 156, height: 44, rx: 22, fill: LIL, "fill-opacity": 0.55 }, pill);
      el("rect", { x: -78, y: -22, width: 156, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 6.5, "Concepts", { "text-anchor": "middle", "font-family": MONO, "font-size": 19, "font-weight": 700 });
      const checked = txt(svg, 896, 73, "Checked 19 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 17, "font-weight": 500, fill: MUTE });
      const tc = clip(svg, 40, 120, 480, 200), tg = el("g", { "clip-path": tc }, svg);
      const l1 = txt(tg, 62, 208, "GTA 6", { "font-size": 90, "font-weight": 700 }), l2 = txt(tg, 62, 298, "marketing", { "font-size": 90, "font-weight": 700 });
      const under = stroke(svg, "", 14, YEL, { "stroke-linecap": "round" });
      const sub = txt(svg, 64, 396, "7 launch lessons for founders", { "font-size": 28, "font-weight": 500, fill: MUTE });
      /* the fan */
      const fine = [], rays = [];
      for (let j = -6; j < 6; j++) { const th = (j + 0.5) * 13.5; fine.push({ th, len: Math.min(215, 196 / Math.max(0.01, Math.abs(Math.sin(th * D)))), n: stroke(svg, "M0 0", 1.5, NAVY, { "stroke-linecap": "round" }) }); }
      for (let j = -6; j <= 6; j++) { const th = j * 13.5, lim = 204 / Math.max(0.01, Math.abs(Math.sin(th * D))); rays.push({ j, th, len: Math.min(j % 2 ? 196 : 250, lim), n: el("path", { fill: YEL, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, svg) }); }
      /* the plaque */
      const pc = clip(svg, 480, 0, 480, BASE), rise = el("g", { "clip-path": pc }, svg), pl = el("g", {}, rise);
      const shape = stepD(AX, [[50, 366, 378], [82, 378, 392], [114, 392, 444], [130, 444, 459], [146, 459, BASE + 30]]);
      el("path", { d: shape, fill: "#fff", stroke: "#fff", "stroke-width": 16 }, pl);
      el("path", { d: shape, fill: LIL, stroke: INK, "stroke-width": 2.75 }, pl);
      el("rect", { x: AX - 104, y: 399, width: 208, height: 38, fill: "#fff", stroke: INK, "stroke-width": 1.75 }, pl);
      stroke(pl, `M${AX - 74} 385 H${AX + 74}`, 3, "#fff", { "stroke-opacity": 0.5, "stroke-linecap": "round" });
      stroke(pl, `M${AX - 122} 452 H${AX + 122} M${AX - 138} 467 H${AX + 138}`, 1.75);
      const words = cond(pl, AX, 430, "7 LESSONS", 34, 180, { "letter-spacing": 2 });
      const b1 = stroke(svg, "", 2.5), b2 = stroke(svg, "", 2.5);
      const gems = [[AX, 352, 8], [AX - 216, BASE + 4.5, 7], [AX + 216, BASE + 4.5, 7]].map(([x, y, r]) => dia(svg, x, y, r));
      return (t) => {
        tf(pill, 142, 66, ob(seg(t, 0.1, 0.55))); show(pill, seg(t, 0.1, 0.2)); show(checked, seg(t, 0.5, 0.9));
        l1.setAttribute("transform", `translate(0 ${100 * (1 - oc(seg(t, 0.25, 0.9)))})`); l2.setAttribute("transform", `translate(0 ${100 * (1 - oc(seg(t, 0.37, 1.02)))})`);
        const uk = oc(seg(t, 0.85, 1.35)); under.setAttribute("d", `M68 330 H${68 + 170 * uk}`); show(under, uk > 0.01 ? 1 : 0);
        const sk = oc(seg(t, 1.0, 1.5)); show(sub, sk); sub.setAttribute("transform", `translate(0 ${12 * (1 - sk)})`);
        const bk = oc(seg(t, 0.4, 1.1));
        b1.setAttribute("d", `M${AX - 200 * bk} ${BASE} H${AX + 200 * bk}`); b2.setAttribute("d", `M${AX - 200 * bk} ${BASE + 9} H${AX + 200 * bk}`); show(b1, bk > 0.01 ? 1 : 0); show(b2, bk > 0.01 ? 1 : 0);
        const beat = bump(seg(t, 2.9, 3.4));
        rays.forEach((r) => {
          const a = Math.abs(r.j), grow = oc(seg(t, 0.7 + a * 0.03, 1.4 + a * 0.03)), open = ob(seg(t, 1.1 + a * 0.09, 2.1 + a * 0.09), 1.2), L = r.len * grow * (1 + 0.04 * beat);
          r.n.setAttribute("d", rayD(Math.max(L, 31), 30, 3.6 * D)); show(r.n, L > 32 ? 1 : 0);
          r.n.setAttribute("transform", `translate(${AX} ${BASE}) rotate(${r.th * open})`);
        });
        fine.forEach((f) => { const grow = oc(seg(t, 1.0, 2.0)), open = oc(seg(t, 1.3, 2.8)); f.n.setAttribute("d", `M0 -40 V${-Math.max(40, f.len * grow)}`); show(f.n, grow > 0.02 ? 1 : 0); f.n.setAttribute("transform", `translate(${AX} ${BASE}) rotate(${f.th * open})`); });
        pl.setAttribute("transform", `translate(0 ${130 * (1 - ob(seg(t, 1.7, 2.6), 0.9))})`);
        words.set(ob(seg(t, 2.5, 3.0)) * (1 + 0.08 * beat)); show(words.g, seg(t, 2.5, 2.62));
        gems.forEach((g, i) => g(ob(seg(t, 3.0 + i * 0.1, 3.4 + i * 0.1))));
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
    let off = 0, raf = 0, seen = false, begun = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    /* each timeline plays once and rests on its last frame; a tap replays it */
    const frame = () => { const now = clock(); draw(held ? sc.still : cl(now + off, 0, sc.dur), now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (!begun) { begun = true; off = -clock(); } tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
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
