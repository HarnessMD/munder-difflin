/* Light terminal typing scenes for "Is GTA 6 on PC?". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SOFT = "#F1ECF9", AQUA = "#3FC6C9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const hash = (n) => { let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const about = (n, cx, cy, s, r = 0, dx = 0, dy = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${s}) translate(${-cx} ${-cy})`);
  const mono = (p, x, y, s, fs, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": fs, "font-weight": 500 }, a));

  /* ---- small diagram marks that sit to the right of an output line; each returns a draw(k), k from 0 to 1 ---- */
  const gap = (len, open) => (g, y) => { // console dot, a line as long as the wait, PC dot
    const x = 584, ln = el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", fill: "none", "stroke-dasharray": open ? "2 9" : "none" }, g);
    const a = el("circle", { cx: x, cy: y, r: 8, fill: BLUE, stroke: INK, "stroke-width": 2 }, g);
    const b = el("circle", { cx: x + len, cy: y, r: 8, fill: open ? "#fff" : MINT, stroke: INK, "stroke-width": 2, "stroke-dasharray": open ? "3.5 3.5" : "none" }, g);
    return (k) => { about(a, x, y, ob(seg(k, 0, 0.3))); ln.setAttribute("d", `M${x} ${y} H${x + len * io(seg(k, 0.15, 0.8))}`); ln.setAttribute("opacity", k > 0.15 ? 1 : 0); about(b, x + len, y, ob(seg(k, 0.7, 1))); b.setAttribute("opacity", k > 0.7 ? 1 : 0); };
  };
  const mark = (ok, x = 700) => (g, y) => { // a round status mark: tick or cross
    const m = el("g", {}, g);
    el("circle", { cx: x, cy: y, r: 15, fill: ok ? MINT : LIL, stroke: INK, "stroke-width": 2 }, m);
    el("path", { d: ok ? `M${x - 7} ${y} l5 5 l9 -10` : `M${x - 5.5} ${y - 5.5} l11 11 M${x + 5.5} ${y - 5.5} l-11 11`, stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, m);
    return (k) => { about(m, x, y, ob(seg(k, 0, 0.55)), -40 * (1 - oc(seg(k, 0, 0.55)))); m.setAttribute("opacity", k > 0 ? 1 : 0); };
  };
  const bar = (w) => (g, y) => { // a size bar drawn from the same left edge, so two sizes compare
    const x = 330, r = el("rect", { x, y: y - 9, width: 8, height: 18, rx: w < 12 ? 2.5 : 9, fill: w < 12 ? YEL : MINT, stroke: INK, "stroke-width": 2 }, g);
    return (k) => { r.setAttribute("width", w < 12 ? w : 18 + (w - 18) * io(seg(k, 0.1, 1))); if (w < 12) about(r, x + w / 2, y, ob(seg(k, 0, 0.5))); r.setAttribute("opacity", k > 0 ? 1 : 0); };
  };

  /* ---- the terminal: one builder for every scene of this post ---- */
  const term = (svg, api, o) => {
    const { X, Y, W, H, fs, cmds, note, dur } = o, cw = fs * 0.6, top = o.bar || 44, x0 = X + (o.pad || 34), tx = x0 + 2 * cw, t0 = o.t0 || 0.75, tin = o.tin || 0;
    const cx = X + W / 2, cy = Y + H / 2, rh = fs * 1.7;
    /* timeline: a time for every character, then squeezed to the scene length */
    let c = t0; const pT = [], cT = [], oT = [];
    cmds.forEach((m, i) => {
      pT.push(c); c += 0.3; const row = [];
      for (let j = 0; j < m.cmd.length; j++) { c += 0.04 + hash(i * 97 + j) * 0.045 + (m.cmd[j - 1] === " " && hash(i * 31 + j + 7) > 0.7 ? 0.13 : 0); row.push(c); }
      cT.push(row); c += i === cmds.length - 1 ? 0.62 : 0.3; oT.push(c); c += 0.14;
    });
    let nP = c, nT = [], punch = 0;
    if (note) { c += 0.34; for (let j = 0; j < note.text.length; j++) { c += 0.032 + hash(900 + j) * 0.03 + (note.text[j - 1] === "," ? 0.16 : 0); nT.push(c); } c += 0.5; punch = c; c += 0.72; } else c += 0.9;
    const k = (dur - t0) / (c - t0), fit = (v) => t0 + (v - t0) * k;
    pT.forEach((v, i) => { pT[i] = fit(v); oT[i] = fit(oT[i]); cT[i] = cT[i].map(fit); });
    nP = fit(nP); nT = nT.map(fit); punch = fit(punch);
    const stops = [].concat(...cT, nT), last = cmds.length - 1;

    const root = el("g", {}, svg);
    const back = el("rect", { x: X - 12, y: Y - 13, width: W, height: H, rx: 16, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, root);
    const shade = el("rect", { x: X, y: Y, width: W, height: H, rx: 16, fill: LIL }, root);
    const lift = el("g", { class: "mg-lift" }, root), win = el("g", {}, lift);
    el("rect", { x: X, y: Y, width: W, height: H, rx: 16, fill: "#fff" }, win);
    el("path", { d: `M${X} ${Y + top} V${Y + 16} Q${X} ${Y} ${X + 16} ${Y} H${X + W - 16} Q${X + W} ${Y} ${X + W} ${Y + 16} V${Y + top} Z`, fill: SOFT }, win);
    el("path", { d: `M${X} ${Y + top} H${X + W}`, stroke: INK, "stroke-width": 1.5 }, win);
    const foot = o.foot ? el("g", {}, win) : null;
    if (foot) {
      const fy = Y + H - 40;
      el("path", { d: `M${X} ${fy} H${X + W} V${Y + H - 16} Q${X + W} ${Y + H} ${X + W - 16} ${Y + H} H${X + 16} Q${X} ${Y + H} ${X} ${Y + H - 16} Z`, fill: SOFT }, win);
      el("path", { d: `M${X} ${fy} H${X + W}`, stroke: INK, "stroke-width": 1.5 }, win);
      mono(foot, X + 24, fy + 25, "any key or tapping types the next character", 13, { fill: MUTE });
      mono(foot, X + W - 24, fy + 25, "jumps to the end", 13, { fill: MUTE, "text-anchor": "end" });
      el("rect", { x: X + W - 216, y: fy + 9, width: 58, height: 23, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, foot);
      mono(foot, X + W - 187, fy + 25, "Enter", 13, { "font-weight": 700, "text-anchor": "middle" });
      win.appendChild(foot);
    }
    el("rect", { x: X, y: Y, width: W, height: H, rx: 16, fill: "none", stroke: INK, "stroke-width": 2.5 }, win);
    const dots = [MINT, YEL, LIL].map((f, i) => el("circle", { cx: X + 26 + i * 21, cy: Y + top / 2, r: 6.5, fill: f, stroke: INK, "stroke-width": 1.5 }, win));
    const pills = cmds.concat(note ? [0] : []).map((_, i, a) => el("rect", { x: X + W - 22 - (a.length - i) * 26, y: Y + top / 2 - 5, width: 20, height: 10, rx: 5, fill: "#fff", stroke: INK, "stroke-width": 1.5 }, win));
    const band = el("rect", { x: X + 14, y: 0, width: W - 28, height: rh, rx: 10, fill: SOFT }, win);

    const rows = cmds.map((m, i) => {
      const y = o.ys[i], oy = y + (o.step || 42);
      const pr = mono(win, x0, y, "$", fs, { fill: BLUE, "font-weight": 700 }), tp = mono(win, tx, y, "", fs), pop = mono(win, tx, y, "", fs);
      const og = el("g", {}, win);
      el("path", { d: `M${x0 + 3} ${oy - fs * 0.78} V${oy - fs * 0.3} H${x0 + cw * 1.05} m-5 -5 l5 5 l-5 5`, stroke: MUTE, "stroke-width": 2, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, og);
      let x = tx; const hl = [];
      m.out.forEach(([s, kind]) => {
        if (kind === "y") hl.push([el("rect", { x: x - 5, y: oy - fs * 0.96, width: s.length * cw + 11, height: fs * 1.32, rx: 5, fill: YEL }, og), x - 5]);
        mono(og, x, oy, s, fs, kind === "m" ? { fill: MUTE } : { "font-weight": 700 });
        x += s.length * cw;
      });
      const gl = m.gl ? m.gl(el("g", {}, win), oy - fs * 0.32) : null;
      return { y, oy, pr, tp, pop, og, hl, gl };
    });
    let nt = null;
    if (note) {
      const y = o.ny, ks = note.text.length - note.key.length, kx = x0 + ks * cw, kw = note.key.length * cw;
      const tp = mono(win, x0, y, "", fs, { fill: MUTE }), pop = mono(win, x0, y, "", fs, { fill: MUTE });
      const mx = kx + kw / 2, my = y - fs * 0.32;
      const rays = Array.from({ length: 10 }, () => el("path", { stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, win));
      const chip = el("g", {}, win);
      el("rect", { x: kx - 4, y: y - fs * 0.96 + 4, width: kw + 16, height: fs * 1.32, rx: 6, fill: LIL }, chip);
      el("rect", { x: kx - 8, y: y - fs * 0.96, width: kw + 16, height: fs * 1.32, rx: 6, fill: YEL, stroke: INK, "stroke-width": 2 }, chip);
      mono(chip, kx, y, note.key, fs, { "font-weight": 700 });
      nt = { y, tp, pop, chip, rays, mx, my, rx: kw / 2 + 14, ry: fs * 0.66 + 10 };
    }
    const tail = o.tail ? mono(win, x0, o.tail, "$", fs, { fill: BLUE, "font-weight": 700 }) : null;
    const cur = el("rect", { width: cw, height: fs * 1.24, rx: 2, fill: YEL, stroke: INK, "stroke-width": 1.2 }, win);
    const ring = o.hit ? el("rect", { x: X - 20, y: Y - 21, width: W + 40, height: H + 42, rx: 24, fill: "none", stroke: AQUA, "stroke-width": 3, class: "mg-ring" }, root) : null;

    if (o.hit) {
      root.setAttribute("role", "button"); root.setAttribute("tabindex", "0"); root.classList.add("mg-hit");
      root.setAttribute("aria-label", "Terminal. Press any key or tap to type the next character. Enter jumps to the end.");
      const type = () => {
        const t = api.t(); if (t >= dur - 0.01) return api.seek(0);
        const i = stops.findIndex((s) => s > t + 0.001); if (i < 0) return api.run(t, dur);
        api.run(stops[i], i + 1 < stops.length ? stops[i + 1] - 0.004 : dur);
      };
      root.addEventListener("click", type);
      root.addEventListener("keydown", (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey || (e.key.length > 1 && e.key !== "Enter" && e.key !== "Backspace")) return;
        e.preventDefault(); if (e.key === "Enter") api.run(dur, dur); else type();
      });
    }
    const typed = (tp, pop, s, times, t, bx, y) => {
      let n = 0; while (n < times.length && times[n] <= t) n++;
      const age = n ? (t - times[n - 1]) / 0.1 : 1, fresh = n > 0 && age < 1;
      tp.textContent = s.slice(0, fresh ? n - 1 : n);
      pop.textContent = fresh ? s[n - 1] : "";
      if (fresh) { pop.setAttribute("x", bx + (n - 1) * cw); pop.setAttribute("y", y + 6 * (1 - oc(age))); pop.setAttribute("opacity", 0.35 + 0.65 * age); }
      return n;
    };
    const thud = (t, at, a) => { const u = t - at; return u > 0 && u < 0.6 ? a * Math.exp(-7 * u) * Math.sin(u * 26) : 0; };

    return (t, now) => {
      /* entrance in three layers, and a soft exit before the loop starts again */
      const out = io(seg(t, dur + (o.hold || 0) - 0.5, dur + (o.hold || 0)));
      root.setAttribute("opacity", 1 - out); root.setAttribute("transform", `translate(0 ${14 * out})`);
      const a = seg(t, tin + 0.08, tin + 0.62), e = ob(a), bk = oc(seg(t, tin, tin + 0.5)), sh = ob(seg(t, tin + 0.3, tin + 0.8));
      about(win, cx, cy, 0.9 + 0.1 * e, 0, 0, 34 * (1 - oc(a)) + thud(t, oT[last], 5) + (note ? thud(t, punch, 4) : 0));
      win.setAttribute("opacity", seg(t, tin + 0.08, tin + 0.3));
      about(back, cx, cy, 0.94 + 0.06 * bk, -1.4 * bk, 0, 22 * (1 - bk)); back.setAttribute("opacity", bk);
      shade.setAttribute("transform", `translate(${11 * sh} ${11 * sh})`); shade.setAttribute("opacity", seg(t, tin + 0.3, tin + 0.4));
      dots.forEach((d, i) => about(d, X + 26 + i * 21, Y + top / 2, ob(seg(t, tin + 0.42 + i * 0.09, tin + 0.7 + i * 0.09))));
      pills.forEach((p, i) => { const at = i < cmds.length ? oT[i] : punch, on = t >= at; p.setAttribute("fill", on ? (i < cmds.length ? MINT : YEL) : "#fff"); about(p, +p.getAttribute("x") + 10, Y + top / 2, on ? 0.6 + 0.4 * ob(seg(t, at, at + 0.35)) : oc(seg(t, tin + 0.5 + i * 0.07, tin + 0.8 + i * 0.07))); });
      if (foot) { const f = oc(seg(t, tin + 0.55, tin + 1)); foot.setAttribute("opacity", f); foot.setAttribute("transform", `translate(0 ${8 * (1 - f)})`); }
      /* the soft row that follows the line being typed */
      const stopsY = rows.map((r, i) => [pT[i], r.y]).concat(note ? [[nP, nt.y]] : tail ? [[oT[last] + 0.14, o.tail]] : []);
      let by = stopsY[0][1]; for (let i = 1; i < stopsY.length; i++) by += (stopsY[i][1] - stopsY[i - 1][1]) * io(seg(t, stopsY[i][0] - 0.2, stopsY[i][0] + 0.14));
      band.setAttribute("y", by - rh * 0.68); band.setAttribute("opacity", oc(seg(t, pT[0] - 0.25, pT[0])));
      /* lines */
      let cxp = tx, cyp = rows[0].y, lastKey = pT[0];
      rows.forEach((r, i) => {
        r.pr.setAttribute("opacity", oc(seg(t, pT[i], pT[i] + 0.12)));
        const n = typed(r.tp, r.pop, cmds[i].cmd, cT[i], t, tx, r.y);
        if (t >= pT[i]) { cxp = tx + n * cw; cyp = r.y; lastKey = n ? cT[i][n - 1] : pT[i]; }
        const key = i === last, u = seg(t, oT[i], oT[i] + (key ? 0.42 : 0.3)), q = key ? ob(u) : oc(u);
        r.og.setAttribute("opacity", seg(u, 0, 0.4)); r.og.setAttribute("transform", `translate(${-16 * (1 - q)} 0)`);
        r.hl.forEach(([h, hx], j) => h.setAttribute("transform", `translate(${hx} 0) scale(${oc(seg(t, oT[i] + 0.2 + j * 0.1, oT[i] + 0.5 + j * 0.1))} 1) translate(${-hx} 0)`));
        if (r.gl) r.gl(seg(t, oT[i] + 0.12, oT[i] + 0.95));
      });
      if (nt) {
        const n = typed(nt.tp, nt.pop, note.text, nT, t, x0, nt.y), done = oc(seg(t, nT[nT.length - 1] + 0.08, nT[nT.length - 1] + 0.3));
        if (t >= nP) { cxp = x0 + (n + 1.15 * done) * cw; cyp = nt.y; lastKey = n ? nT[n - 1] : nP; }
        const p = seg(t, punch, punch + 0.46);
        about(nt.chip, nt.mx, nt.my, 0.55 + 0.45 * ob(p), -5 * (1 - oc(p))); nt.chip.setAttribute("opacity", seg(p, 0, 0.25));
        const b = oc(seg(t, punch + 0.06, punch + 0.5)), bo = t > punch + 0.06 ? 1 - seg(t, punch + 0.34, punch + 0.62) : 0;
        nt.rays.forEach((r, i) => { const an = (i / 10) * 6.2832 + 0.3, ux = Math.cos(an), uy = Math.sin(an), r1 = 1 + 0.22 * b, r2 = r1 + 0.1 + 0.08 * (i % 2); r.setAttribute("d", `M${nt.mx + ux * nt.rx * r1} ${nt.my + uy * nt.ry * r1} L${nt.mx + ux * nt.rx * r2} ${nt.my + uy * nt.ry * (r2 + 0.25)}`); r.setAttribute("opacity", bo); });
      }
      if (tail) { const at = oT[last] + 0.14; tail.setAttribute("opacity", oc(seg(t, at, at + 0.12))); if (t >= at) { cxp = tx; cyp = o.tail; lastKey = at; } }
      /* the block cursor: solid while typing, blinking when idle */
      const idle = api.idle() || t - lastKey, on = idle < 0.45 || Math.floor((idle - 0.45) / 0.5) % 2 === 1 || t === dur;
      cur.setAttribute("x", cxp + 1.5); cur.setAttribute("y", cyp - fs * 0.93); cur.setAttribute("opacity", t < pT[0] ? 0 : on ? 1 : 0);
    };
  };

  const SC = {};
  const frame = { X: 50, Y: 42, W: 700, H: 518, fs: 24, ys: [130, 236, 342], ny: 470, foot: true, hit: true, hold: 3.4 };
  const scene = (dur, cmds, text, key) => ({ dur, still: dur, hold: frame.hold, build: (svg, api) => term(svg, api, Object.assign({}, frame, { dur, cmds, note: { text, key } })) });

  /* ---- 1. when did the PC versions arrive ---- */
  SC.history = scene(8.8, [
    { cmd: "when pc gta5", out: [["console 2013, ", "m"], ["PC 2015", "k"]], gl: gap(95) },
    { cmd: "when pc rdr2", out: [["console 2018, ", "m"], ["PC 2019", "k"]], gl: gap(60) },
    { cmd: "when pc gta6", out: [["console 2026, ", "m"], ["PC not announced", "y"]], gl: gap(118, true) },
  ], "# pattern found, promise not found", "promise not found");

  /* ---- 2. the three ways to play from a PC ---- */
  SC.options = scene(9.6, [
    { cmd: "play gta6 on pc", out: [["not announced", "k"]], gl: mark(false) },
    { cmd: "play gta6 by remote play", out: [["needs your own ", "m"], ["PS5", "k"], [" and ", "m"], ["5Mbps", "k"]], gl: mark(true) },
    { cmd: "play gta6 by cloud on pc", out: [["not listed", "y"]], gl: mark(false) },
  ], "# your PC is now a monitor", "monitor");

  /* ---- 3. the fake installer against the real game ---- */
  SC.installer = scene(10, [
    { cmd: "size gta6_installer.exe", out: [["1.1 MB", "k"]], gl: bar(8) },
    { cmd: "size real game", out: [["up to 212 GB", "k"]], gl: bar(386) },
    { cmd: "scan gta6_installer.exe", out: [["infostealer", "y"]], gl: mark(false, 345) },
  ], "# the screenshot was bigger than the game", "bigger than the game");

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 4.6, still: 4.6, hold: 4,
    build(svg, api) {
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 50, width: 112, height: 40, rx: 20, fill: YEL, stroke: INK, "stroke-width": 1.5 }, pill);
      mono(pill, 120, 77, "Guides", 18, { "font-weight": 700, "text-anchor": "middle" });
      const date = mono(svg, 896, 77, "Checked 19 Nov 2026", 17, { fill: MUTE, "text-anchor": "end" });
      const t1 = txt(svg, 62, 226, "Is GTA 6", { "font-size": 98, "font-weight": 700, "letter-spacing": "-2" });
      const t2 = txt(svg, 62, 326, "on PC?", { "font-size": 98, "font-weight": 700, "letter-spacing": "-2" });
      const ul = el("path", { stroke: YEL, "stroke-width": 14, "stroke-linecap": "round", fill: "none" }, svg);
      const s1 = txt(svg, 64, 426, "What Rockstar has said,", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const s2 = txt(svg, 64, 460, "and your options", { "font-size": 26, "font-weight": 500, fill: MUTE });
      const run = term(svg, api, { X: 548, Y: 172, W: 348, H: 252, bar: 38, pad: 26, fs: 21, step: 40, ys: [258], tail: 364, t0: 1.5, tin: 0.55, dur: 4.6, hold: 4,
        cmds: [{ cmd: "is gta6 on pc", out: [["PC: ", "m"], ["not announced", "y"]] }] });
      const rise = (n, t, a, d = 26) => { const k = oc(seg(t, a, a + 0.5)); n.setAttribute("opacity", seg(t, a, a + 0.25)); n.setAttribute("transform", `translate(0 ${d * (1 - k)})`); };
      return (t, now) => {
        const out = io(seg(t, 8.1, 8.6)), left = [pill, date, t1, t2, ul, s1, s2];
        about(pill, 120, 70, ob(seg(t, 0.05, 0.45))); date.setAttribute("opacity", oc(seg(t, 0.2, 0.6)));
        rise(t1, t, 0.15, 40); rise(t2, t, 0.25, 40); rise(s1, t, 0.75, 16); rise(s2, t, 0.84, 16);
        ul.setAttribute("d", `M70 356 H${70 + 190 * ob(seg(t, 0.55, 1.05))}`); ul.setAttribute("opacity", t > 0.55 ? 1 : 0);
        if (out > 0) left.forEach((n) => n.setAttribute("opacity", 1 - out));
        run(t, now);
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, P = sc.dur + (sc.hold || 0);
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm, cap = null, capAt = 0, cur = sc.still;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => {
      const now = clock(); let t;
      if (held) t = sc.still;
      else if (cap != null) { // the reader is typing: run up to the next character, wait there, and take over again after a rest
        t = now + off;
        if (t >= cap) { t = cap; if (!capAt) capAt = now; if (now - capAt > 6) { off = cap - now; cap = null; capAt = 0; } }
      } else t = (((now + off) % P) + P) % P;
      cur = t; draw(t, now);
    };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = {
      now: clock, t: () => cur, idle: () => (capAt ? clock() - capAt : 0),
      seek: (s) => { off = s - clock(); cap = null; capAt = 0; held = false; tick(); },
      run: (from, to) => { off = from - clock(); cap = to; capAt = 0; held = false; tick(); },
      poke: () => { held = false; tick(); },
    };
    draw = sc.build(svg, api);
    if (frozen) { cur = isNaN(fixed) ? sc.still : fixed; draw(cur, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { tick(); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
      else cancelAnimationFrame(raf);
    }, { threshold: 0.25 }).observe(fig);
    const hit = () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } };
    svg.addEventListener("click", hit); svg.addEventListener("keydown", hit);
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('500 20px "JetBrains Mono"'), document.fonts.load('700 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
