/* Data story bar scenes for "GTA 6 how long to beat". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", AQUA = "#3FC6C9";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": 15, "font-weight": 500 }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const obs = (x) => { const c = 1.1; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const op = (n, v) => n.setAttribute("opacity", v);
  const say = (n, s) => { if (n.textContent !== s) n.textContent = s; };
  let uid = 0;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* hover and focus lift: returns a 0 to 1 value eased over time */
  const hot = (g, api) => {
    let on = false, at = -9;
    const set = (v) => () => { if (on !== v) { on = v; at = api.now(); api.poke(); } };
    g.addEventListener("pointerenter", set(true)); g.addEventListener("pointerleave", set(false));
    g.addEventListener("focus", set(true)); g.addEventListener("blur", set(false));
    return (now) => { const k = oc(seg(now - at, 0, 0.18)); return on ? k : 1 - k; };
  };
  /* patterned fills: dots, grid and hatch, ink marks on a palette colour */
  const defs = (svg) => {
    const d = el("defs", {}, svg);
    return (kind, bg) => {
      const id = "mgp" + (++uid), s = kind === "hatch" ? 7 : 9;
      const p = el("pattern", { id, width: s, height: s, patternUnits: "userSpaceOnUse" }, d);
      el("rect", { width: s, height: s, fill: bg }, p);
      if (kind === "hatch") { p.setAttribute("patternTransform", "rotate(45)"); el("rect", { width: s, height: 2.2, fill: INK, "fill-opacity": 0.8 }, p); }
      if (kind === "dots") el("circle", { cx: 4.5, cy: 4.5, r: 1.5, fill: INK, "fill-opacity": 0.75 }, p);
      if (kind === "grid") el("path", { d: "M0 4.5 H9 M4.5 0 V9", stroke: INK, "stroke-width": 1.1, "stroke-opacity": 0.55 }, p);
      return `url(#${id})`;
    };
  };
  /* one Isotype cell drawn around 0,0: lilac offset shadow, ink outline, a small highlight */
  const cell = (p, w, h, fill, sw = 2.5, sh = 4, a = {}) => {
    const g = el("g", {}, p), r = Math.min(w, h) * 0.17;
    el("rect", { x: -w / 2 + sh, y: -h / 2 + sh, width: w, height: h, rx: r, fill: LIL, "fill-opacity": 0.55 }, g);
    el("rect", Object.assign({ x: -w / 2, y: -h / 2, width: w, height: h, rx: r, fill, stroke: INK, "stroke-width": sw }, a), g);
    if (w >= 24 && h >= 24) { const q = Math.min(w, h), x = -w / 2 + q * 0.2, y = -h / 2 + q * 0.2; el("path", { d: `M${x} ${y + q * 0.26} V${y + q * 0.1} Q${x} ${y} ${x + q * 0.1} ${y} H${x + q * 0.26}`, stroke: "#fff", "stroke-width": sw * 0.8, fill: "none", "stroke-linecap": "round", opacity: 0.8 }, g); }
    return g;
  };
  /* the yellow punchline chip, with impact ticks that fly out when it lands */
  const chip = (p, label, fs = 17, font = MONO) => {
    const sp = el("g", {}, p), g = el("g", {}, p);
    const sh = el("rect", { fill: LIL, "fill-opacity": 0.75 }, g), r = el("rect", { fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
    const t = txt(g, 0, fs * 0.36, label, { "text-anchor": "middle", "font-family": font, "font-size": fs, "font-weight": 700 });
    const w = Math.ceil(t.getComputedTextLength()) + fs * 1.8, h = fs * 2.15;
    [[sh, 4, 5], [r, 0, 0]].forEach(([n, dx, dy]) => { n.setAttribute("x", -w / 2 + dx); n.setAttribute("y", -h / 2 + dy); n.setAttribute("width", w); n.setAttribute("height", h); n.setAttribute("rx", h / 2); });
    const ticks = Array.from({ length: 10 }, () => el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, sp));
    const land = (x, y, rot, k, k2, sc = 1) => {
      const e = ob(k), d = 1 - oc(k);
      tf(g, x, y - 54 * d, k <= 0 ? 0 : (2.1 - 1.1 * e) * sc, rot - 14 * d); op(g, cl(k * 5));
      tf(sp, x, y, 1, rot); op(sp, k2 <= 0 || k2 >= 1 ? 0 : 1 - k2 * k2);
      ticks.forEach((n, i) => { const a = (i / 10) * 6.283 + 0.3, rx = w / 2 + 8 + 20 * oc(k2), ry = h / 2 + 8 + 20 * oc(k2), len = 9 * (1 - k2) + 2, c = Math.cos(a), s = Math.sin(a); n.setAttribute("d", `M${c * rx} ${s * ry} L${c * (rx + len)} ${s * (ry + len)}`); });
    };
    return { g, w, h, land };
  };
  const shake = (k2, amp = 4) => (k2 <= 0 || k2 >= 1 ? 0 : Math.sin(k2 * Math.PI * 3) * amp * (1 - k2));

  const SC = {};

  /* ---- 1. the tally: one cell for every 10 hours, four sources ---- */
  SC.tally = {
    dur: 12, still: 8,
    build(svg, api) {
      const pat = defs(svg), S = 38, P = 45, X = 44;
      const head = el("g", {}, svg), key = cell(head, 30, 30, YEL, 2.5, 3);
      txt(head, 90, 63, "One cell for every 10 hours", { "font-size": 32, "font-weight": 700 });
      const hint = mono(svg, 756, 60, "tap a row", { "text-anchor": "end", fill: MUTE });
      let sel = -1, selT = -9, lastT = 0;
      const rows = [
        ["Rockstar dev run", 80, pat("dots", BLUE), "TechRadar, 28 Aug 2026"],
        ["The Guardian", 70, MINT, "The Guardian, 18 Nov 2026"],
        ["IGN", 120, pat("grid", LIL), "IGN, 18 Nov 2026"],
        ["HowLongToBeat main story", 42, pat("hatch", SKY), "HowLongToBeat, 19 Nov 2026"],
      ].map(([name, val, fill, src], i) => {
        const y0 = 96 + i * 120, yc = y0 + 70, g = el("g", {}, svg), almost = val === 120;
        el("rect", { x: 26, y: y0, width: 748, height: 112, rx: 22, fill: "#fff", "fill-opacity": 0 }, g);
        const band = el("rect", { x: 30, y: y0 + 4, width: 740, height: 104, rx: 20, fill: "none", stroke: LIL, "stroke-width": 2.5, opacity: 0 }, g);
        el("rect", { x: 26, y: y0, width: 748, height: 112, rx: 24, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, g);
        const lift = el("g", {}, g), ghost = el("g", {}, lift);
        for (let j = 0; j < 12; j++) el("rect", { x: X + j * P, y: yc - S / 2, width: S, height: S, rx: 6.5, fill: SOFT }, ghost);
        const label = txt(lift, X, y0 + 34, name, { "font-size": 22 }), lw = label.getComputedTextLength();
        const tag = el("g", {}, lift), tr = el("rect", { y: -14, height: 28, rx: 14, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, tag);
        el("circle", { cx: 15, cy: 0, r: 4, fill: YEL, stroke: INK, "stroke-width": 1.5 }, tag);
        const tt = mono(tag, 27, 5, src, { "font-size": 14 }); tr.setAttribute("width", Math.ceil(tt.getComputedTextLength()) + 41);
        const full = Math.floor(val / 10) - (almost ? 1 : 0), frac = (val % 10) / 10, cells = [];
        for (let j = 0; j < full; j++) cells.push({ g: cell(lift, S, S, fill), x: X + j * P + S / 2 });
        if (almost) cells.push({ g: cell(lift, S, S, fill, 2.5, 4, { "stroke-dasharray": "5 4", "fill-opacity": 0.55 }), x: X + full * P + S / 2 });
        if (frac) cells.push({ g: cell(lift, S * frac, S, fill, 2.5, 3), x: X + full * P + (S * frac) / 2 });
        const last = cells[cells.length - 1], endX = last.x + (frac ? (S * frac) / 2 : S / 2);
        const vg = el("g", {}, lift), pre = almost ? mono(vg, 0, -2, "almost", { fill: MUTE }) : null;
        const num = txt(vg, almost ? 62 : 0, 0, "", { "font-size": 30, "font-weight": 700 });
        const lit = hot(g, api);
        button(g, `${name}, ${almost ? "almost " : ""}${val} h. Source: ${src}`, () => { sel = i; selT = api.now(); api.rest(7); });
        return { y0, yc, val, band, lift, ghost, label, lw, tag, cells, endX, vg, pre, num, lit, almost, a: 0.6 + i * 1.25 };
      });
      const ch = chip(svg, "zero plans to stop", 16);
      return (t, now) => {
        if (t < lastT - 2) sel = -1; lastT = t;
        const h = oc(seg(t, 0, 0.5)); op(head, h); head.setAttribute("transform", `translate(0 ${-14 * (1 - h)})`);
        tf(key, 59, 51, t <= 0.15 ? 0 : ob(seg(t, 0.15, 0.6)), -90 * (1 - oc(seg(t, 0.15, 0.6))));
        op(hint, seg(t, 5.6, 6.1));
        const k = seg(t, 6.3, 6.85), k2 = seg(t, 6.62, 7.3);
        rows.forEach((r, i) => {
          const kl = oc(seg(t, r.a, r.a + 0.4)), on = sel === i, w = now - selT, up = r.lit(now);
          r.lift.setAttribute("transform", `translate(0 ${-3 * up})`);
          op(r.label, kl); r.label.setAttribute("transform", `translate(${-22 * (1 - kl)} 0)`);
          op(r.ghost, kl); r.ghost.setAttribute("transform", `translate(${-34 * (1 - oc(seg(t, r.a, r.a + 0.9)))} 0)`);
          op(r.band, on ? oc(seg(w, 0, 0.25)) : 0);
          const kt = on ? ob(seg(w, 0.05, 0.42)) : 0; op(r.tag, on ? cl(seg(w, 0.05, 0.2)) : 0); tf(r.tag, X + r.lw + 14 - 18 * (1 - kt), r.y0 + 26);
          const N = r.cells.length, s0 = r.a + 0.2, dy = i === 2 ? shake(k2) : 0;
          r.cells.forEach((c, j) => {
            const kc = seg(t, s0 + j * 0.075, s0 + j * 0.075 + 0.36), bump = on ? Math.sin(seg(w - j * 0.035, 0, 0.32) * Math.PI) * 0.16 : 0;
            tf(c.g, c.x - 44 * (1 - ob(kc)), r.yc + dy * (j % 2 ? 1 : -0.6), 1 + bump); op(c.g, cl(kc * 3.5));
          });
          const cc = cl((t - s0 - 0.12) / 0.075, 0, N), done = seg(t, s0 + N * 0.075 + 0.2, s0 + N * 0.075 + 0.65);
          say(r.num, `${cc >= N ? r.val : Math.min(r.val, Math.floor(cc) * 10)} h`);
          op(r.vg, cl(cc)); tf(r.vg, X + 12 * P + 8 + 14 * (1 - oc(cl(cc))), r.yc + 11, 1 + 0.2 * Math.sin(done * Math.PI));
          if (r.pre) op(r.pre, oc(done));
        });
        ch.land(650, rows[2].y0 + 24, -3, k, k2);
      };
    },
  };

  /* ---- 2. siblings: three bars of patterned cells and a toggle ---- */
  SC.siblings = {
    dur: 12, still: 8,
    build(svg, api) {
      const pat = defs(svg), S = 36, P = 41, BASE = 496, CX = [190, 400, 610];
      const SETS = [[3.2, 5.05, 4.2], [5.1, 8.45, 8]], NAMES = ["GTA V", "Red Dead Redemption 2", "GTA VI"], FILL = [pat("dots", BLUE), pat("grid", MINT), pat("hatch", SKY)];
      let mode = 0, tapT = null, from = [0, 0, 0], lastT = 0; const cur = [0, 0, 0];
      const cols = CX.map((cx, i) => {
        const g = el("g", {}, svg), ghost = [];
        for (let j = 0; j < 9; j++) ghost[j] = el("rect", { x: cx - S / 2, y: BASE - j * P - S, width: S, height: S, rx: 6, fill: SOFT }, g);
        el("path", { d: `M${cx - 58} ${BASE + 12} H${cx + 58}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, g);
        const name = txt(g, cx, BASE + 50, NAMES[i], { "text-anchor": "middle", "font-size": 22 });
        const cells = Array.from({ length: 9 }, (_, j) => {
          const c = el("g", {}, g), bottom = BASE - j * P;
          const sh = el("rect", { x: cx - S / 2 + 4, width: S, fill: LIL, "fill-opacity": 0.55 }, c), b = el("rect", { x: cx - S / 2, width: S, fill: FILL[i], stroke: INK, "stroke-width": 2.5 }, c);
          return (f) => { op(c, f <= 0.03 ? 0 : 1); const hh = Math.max(0.03, f) * S, r = Math.min(6, hh / 2); [[sh, 4], [b, 0]].forEach(([n, d]) => { n.setAttribute("y", bottom - hh + d); n.setAttribute("height", hh); n.setAttribute("rx", r); }); };
        });
        const val = txt(g, cx, 0, "", { "text-anchor": "middle", "font-size": 30, "font-weight": 700 });
        return { g, ghost, name, cells, val, cx };
      });
      const tg = el("g", {}, svg);
      el("rect", { x: 190, y: 30, width: 420, height: 58, rx: 29, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tg);
      el("rect", { x: 183, y: 23, width: 434, height: 72, rx: 36, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, tg);
      const thumb = el("g", {}, tg);
      el("rect", { x: -98, y: -19, width: 204, height: 46, rx: 23, fill: LIL, "fill-opacity": 0.75 }, thumb);
      el("rect", { x: -102, y: -23, width: 204, height: 46, rx: 23, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, thumb);
      const labs = [txt(tg, 298, 66, "Main Story", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 }), txt(tg, 502, 66, "Main + Sides", { "text-anchor": "middle", "font-size": 21, "font-weight": 700 })];
      const lit = hot(tg, api);
      button(tg, "Switch between Main Story and Main + Sides", () => { from = cur.slice(); mode = 1 - mode; tapT = api.now(); tg.setAttribute("aria-pressed", mode ? "true" : "false"); api.rest(9); });
      tg.setAttribute("aria-pressed", "false");
      const ch = chip(svg, "sample size 1", 16);
      const fmt = (L) => { const v = Math.round(L * 20) / 2, w = Math.floor(v); return `${w}${v > w ? "½" : ""} h`; };
      return (t, now) => {
        if (t < lastT - 2) { mode = 0; tapT = null; tg.setAttribute("aria-pressed", "false"); } lastT = t;
        const w = tapT == null ? 9 : now - tapT, e = oc(seg(t, 0, 0.5)), up = lit(now);
        op(tg, e); tg.setAttribute("transform", `translate(0 ${-14 * (1 - e) - 2 * up})`);
        const p = obs(seg(w, 0, 0.36)), m = tapT == null ? 0 : mode ? p : 1 - p;
        tf(thumb, 298 + 204 * m, 59, 1 + 0.03 * up); labs.forEach((n, i) => n.setAttribute("fill", Math.round(cl(m)) === i ? INK : MUTE));
        cols.forEach((c, i) => {
          const a = 0.9 + i * 1.3, kin = oc(seg(t, 0.25 + i * 0.1, 0.7 + i * 0.1));
          op(c.g, kin); c.g.setAttribute("transform", `translate(0 ${18 * (1 - kin)})`);
          const tgt = SETS[mode][i], L = tapT == null ? SETS[0][i] * obs(seg(t, a, a + 1.4)) : from[i] + (tgt - from[i]) * obs(seg(w - i * 0.09, 0, 0.9));
          cur[i] = L;
          c.cells.forEach((set, j) => set(cl(L - j))); c.ghost.forEach((n, j) => op(n, cl((j - L - 1.2) * 2.5)));
          const shown = tapT == null ? Math.min(L, SETS[0][i]) : L, j = Math.floor(L), top = BASE - j * P - (L - j) * S;
          say(c.val, fmt(shown)); c.val.setAttribute("y", top - 16); op(c.val, seg(t, a, a + 0.2));
        });
        const k = tapT == null ? seg(t, 6.2, 6.75) : mode ? 1 : seg(w, 0.75, 1.3), k2 = tapT == null ? seg(t, 6.52, 7.2) : mode ? 1 : seg(w, 1.07, 1.75);
        ch.land(684, 420, -4, k, k2, tapT != null && mode ? 1 - io(seg(w, 0, 0.25)) : 1);
      };
    },
  };

  /* ---- 3. weeknights: a calendar strip and three paces ---- */
  SC.weeknights = {
    dur: 12, still: 8,
    build(svg, api) {
      const X0 = 318, P = 26, S = 20, STEP = 0.055, T0 = 1;
      txt(svg, 44, 63, "Starting Thu 19 Nov", { "font-size": 32, "font-weight": 700, class: "mg-t" });
      const title = svg.lastChild, hint = mono(svg, 756, 60, "tap a row", { "text-anchor": "end", fill: MUTE });
      const clipId = "mgc" + (++uid), cp = el("clipPath", { id: clipId }, svg); el("rect", { x: 304, y: 78, width: 496, height: 522 }, cp);
      const view = el("g", { "clip-path": `url(#${clipId})` }, svg), strip = el("g", {}, view);
      el("rect", { x: X0 - 6, y: 92, width: 17 * P + 8, height: 34, rx: 17, fill: SOFT }, strip);
      [[3, 4], [11, 4]].forEach(([c, n]) => el("rect", { x: X0 + c * P - 1, y: 96, width: n * P - 2, height: 26, rx: 13, fill: "#fff" }, strip));
      [16, 23, 30, 7, 14, 21, 28, 4, 11, 18, 25, 1, 8, 15, 22, 1, 8].forEach((d, c) => mono(strip, X0 + c * P + S / 2 + 1, 114, String(d), { "text-anchor": "middle", "font-size": 13, fill: MUTE }));
      let lastT = 0;
      const rows = [["1 hour a night", "10 Mar 2027", 80, BLUE], ["2 hours a night", "13 Jan 2027", 40, LIL], ["3 hours a night", "25 Dec 2026", 27, MINT]].map(([name, end, N, fill], b) => {
        const by = 142 + b * 146, g = el("g", {}, svg);
        el("rect", { x: 26, y: by - 9, width: 754, height: 140, rx: 22, fill: "#fff", "fill-opacity": 0 }, g);
        el("rect", { x: 26, y: by - 9, width: 754, height: 140, rx: 22, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, g);
        const lab = el("g", {}, g);
        el("rect", { x: 44, y: by + 14, width: 30, height: 30, rx: 6, fill: LIL, "fill-opacity": 0.55, transform: "translate(3 3)" }, lab);
        el("rect", { x: 44, y: by + 14, width: 30, height: 30, rx: 6, fill, stroke: INK, "stroke-width": 2.5 }, lab);
        txt(lab, 59, by + 37, String(b + 1), { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
        txt(lab, 88, by + 38, name, { "font-size": 25, "font-weight": 700 });
        const dg = el("g", {}, lab); mono(dg, 0, 0, "ends", { fill: MUTE, "font-size": 16 }); mono(dg, 50, 0, end, { "font-size": 17, "font-weight": 700 });
        const ul = el("path", { d: "M50 9 H164", stroke: YEL, "stroke-width": 6, "stroke-linecap": "round" }, dg); dg.insertBefore(ul, dg.firstChild);
        const grid = el("g", {}, strip), nights = [];
        for (let c = 0; c < 17; c++) for (let d = 0; d < 5; d++) {
          const pre = c === 0 && d < 3;
          el("rect", Object.assign({ x: X0 + c * P, y: by + d * P, width: S, height: S, rx: 4.5 }, pre ? { fill: "none", stroke: MUTE, "stroke-width": 1.2, "stroke-dasharray": "3 3", "stroke-opacity": 0.6 } : { fill: SOFT }), grid);
        }
        for (let n = 0; n < N; n++) { const c = Math.floor((n + 3) / 5), d = (n + 3) % 5; nights.push({ g: cell(grid, S, S, n === N - 1 ? YEL : fill, n === N - 1 ? 2.5 : 1.8, 2.5), x: X0 + c * P + S / 2, y: by + d * P + S / 2 }); }
        const r = { by, g, lab, dg, nights, N, rp: null, lit: null };
        r.lit = hot(g, api);
        button(g, `${name} ends ${end}. Replay this row`, () => { r.rp = api.now(); api.rest(7); });
        return r;
      });
      const ch = chip(svg, "credits on Christmas Day", 16);
      return (t, now) => {
        if (t < lastT - 2) rows.forEach((r) => { r.rp = null; }); lastT = t;
        const h = oc(seg(t, 0, 0.5)); op(title, h); title.setAttribute("transform", `translate(0 ${-14 * (1 - h)})`); op(hint, seg(t, 5.6, 6.1));
        const sx = 170 * (1 - io(seg(t, T0 - 0.1, T0 + 80 * STEP + 0.1)));
        strip.setAttribute("transform", `translate(${sx} 0)`); op(strip, oc(seg(t, 0.3, 0.9)));
        const k = seg(t, 6.3, 6.85), k2 = seg(t, 6.62, 7.3);
        rows.forEach((r, b) => {
          const kl = oc(seg(t, 0.3 + b * 0.11, 0.8 + b * 0.11)), up = r.lit(now), re = r.rp != null;
          op(r.lab, kl); r.lab.setAttribute("transform", `translate(${-26 * (1 - kl)} ${-3 * up})`);
          const tau = re ? now - r.rp : t, s0 = re ? 0.15 : T0, st = re ? Math.min(STEP, 2.2 / r.N) : STEP, dy = b === 2 ? shake(k2, 3) : 0;
          r.nights.forEach((c, n) => {
            const kc = seg(tau, s0 + n * st, s0 + n * st + 0.32), endB = n === r.N - 1 ? 0.5 * Math.sin(seg(tau, s0 + n * st + 0.2, s0 + n * st + 0.75) * Math.PI) : 0;
            tf(c.g, c.x + 9 * (1 - oc(kc)), c.y + dy * ((n % 3) - 1) - 3 * up * 0, kc <= 0 ? 0 : 0.35 + 0.65 * ob(kc) + endB); op(c.g, cl(kc * 4));
          });
          const E = s0 + (r.N - 1) * st + 0.2, kd = seg(tau, E, E + 0.5);
          op(r.dg, oc(seg(tau, E, E + 0.25))); tf(r.dg, 88 - 0 * kd, r.by + 76, 1 + 0.16 * Math.sin(kd * Math.PI));
        });
        ch.land(628 + sx, rows[2].by + 106, -3, k, k2);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 14, still: 4,
    build(svg) {
      const pat = defs(svg);
      const pill = el("g", {}, svg);
      el("rect", { x: -46, y: -14, width: 100, height: 36, rx: 18, fill: LIL, "fill-opacity": 0.75 }, pill);
      el("rect", { x: -50, y: -18, width: 100, height: 36, rx: 18, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 0, 6.5, "Guides", { "text-anchor": "middle", "font-size": 18, "font-weight": 700 });
      const chk = mono(svg, 756, 62, "Checked 19 Nov 2026", { "text-anchor": "end", fill: MUTE, "font-size": 16 });
      const lines = ["GTA 6", "how long", "to beat"].map((s, i) => txt(svg, 44, 172 + i * 72, s, { "font-size": 72, "font-weight": 700, "letter-spacing": "-1.5" }));
      const ul = el("path", { d: "M50 344 H50", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      const sub = txt(svg, 44, 396, "Story length in hours, every source", { "font-size": 21, "font-weight": 500, fill: MUTE });
      const panel = el("g", {}, svg);
      el("rect", { x: 462, y: 136, width: 300, height: 236, rx: 28, fill: LIL, "fill-opacity": 0.6 }, panel);
      el("rect", { x: 452, y: 126, width: 300, height: 236, rx: 28, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, panel);
      const S = 28, P = 34, X = 602 - (7 * P) / 2, Y = 304;
      for (let j = 0; j < 8; j++) el("rect", { x: X + j * P - S / 2, y: Y - S / 2, width: S, height: S, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 1.2, "stroke-opacity": 0.25 }, panel);
      const cells = Array.from({ length: 8 }, () => cell(panel, S, S, pat("dots", BLUE), 2.5, 3));
      const clock = el("g", {}, panel);
      el("circle", { cx: 3, cy: 4, r: 33, fill: LIL, "fill-opacity": 0.75 }, clock);
      el("circle", { r: 33, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, clock);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283, r1 = i % 3 ? 26 : 23; el("path", { d: `M${Math.cos(a) * r1} ${Math.sin(a) * r1} L${Math.cos(a) * 28.5} ${Math.sin(a) * 28.5}`, stroke: INK, "stroke-width": i % 3 ? 1.5 : 2.5, "stroke-linecap": "round" }, clock); }
      el("path", { d: "M0 0 L-9 -11", stroke: INK, "stroke-width": 3.5, "stroke-linecap": "round" }, clock);
      const hand = el("path", { d: "M0 4 V-22", stroke: BLUE, "stroke-width": 3, "stroke-linecap": "round" }, clock);
      el("circle", { r: 3.5, fill: YEL, stroke: INK, "stroke-width": 1.5 }, clock);
      const ch = chip(panel, "80 h", 30, SANS);
      return (t, now) => {
        tf(pill, 94, 54, t <= 0.1 ? 0 : ob(seg(t, 0.1, 0.55))); op(chk, oc(seg(t, 0.3, 0.8)));
        lines.forEach((n, i) => { const k = oc(seg(t, 0.25 + i * 0.12, 0.8 + i * 0.12)); op(n, k); n.setAttribute("transform", `translate(0 ${26 * (1 - k)})`); });
        ul.setAttribute("d", `M50 344 H${50 + 150 * obs(seg(t, 0.95, 1.45))}`); op(ul, t > 0.95 ? 1 : 0);
        const ks = oc(seg(t, 1.1, 1.6)); op(sub, ks); sub.setAttribute("transform", `translate(${-14 * (1 - ks)} 0)`);
        const kp = oc(seg(t, 0.5, 1.15)); op(panel, kp); panel.setAttribute("transform", `translate(${46 * (1 - kp)} 0)`);
        const k = seg(t, 3.05, 3.6), k2 = seg(t, 3.36, 3.98);
        cells.forEach((c, j) => { const s = 1.5 + j * 0.17, kc = seg(t, s, s + 0.4); tf(c, X + j * P - 22 * (1 - oc(kc)), Y + shake(k2, 3) * (j % 2 ? 1 : -1), kc <= 0 ? 0 : 0.3 + 0.7 * ob(kc)); op(c, cl(kc * 4)); });
        const sec = Math.floor(now * 1.25), fr = now * 1.25 - sec;
        tf(clock, 512, 196, 1 + 0.05 * Math.sin(seg(fr, 0, 0.3) * Math.PI)); hand.setAttribute("transform", `rotate(${48 + (sec + ob(seg(fr, 0, 0.3))) * 6})`);
        ch.land(668, 198, -5, k, k2);
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
    const root = el("g", {}, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, rest = 0;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const paint = (t, now) => { draw(t, now); op(root, 1 - io(seg(t, sc.dur - 0.5, sc.dur))); };
    const frame = () => {
      if (calm) return paint(sc.still, 1e6);
      const now = clock();
      if (rest) { if (now < rest) return paint(sc.still, now); off = sc.still - now; rest = 0; }
      paint((((now + off) % sc.dur) + sc.dur) % sc.dur, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !calm) raf = requestAnimationFrame(tick); };
    const api = { now: () => (calm ? 0 : clock()), seek: (s) => { rest = 0; off = s - clock(); tick(); }, poke: () => tick(), rest: (s) => { rest = clock() + s; tick(); } };
    draw = sc.build(root, api);
    if (frozen) { const t = isNaN(fixed) ? sc.still : fixed; paint(t, t); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 22px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('500 15px "JetBrains Mono"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
