/* Swiss kinetic type slam scenes for "GTA 6 online release date". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", LIL = "#B69CFF", SOFT = "#F1ECF9", MUTE = "#7A6A88", AQUA = "#3FC6C9";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 700, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const oe = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };

  /* ---- the slam kit: one grid, one camera, words that fall, stop hard and overshoot ---- */
  const BEAT = 0.5, FALL = 0.16, TIGHT = "-0.02em", X0 = 48, X1 = 752, COL = (X1 - X0) / 12;
  const measure = (svg, s, size, a = {}) => { const n = txt(svg, 0, -400, s, Object.assign({ "font-size": size, "letter-spacing": TIGHT }, a)), w = n.getComputedTextLength(); n.remove(); return w; };
  const fit = (svg, s, maxW, maxSize, a) => { const w = measure(svg, s, 100, a); return w > 0 ? Math.min(maxSize, Math.floor((1000 * maxW) / w) / 10) : maxSize * 0.8; };

  const stage = (svg, api, o) => {
    const W = o.W || 800, H = o.H || 600, top = o.top || 44, bot = o.bot || H - 28, k0 = o.k0 || 0;
    const root = el("g", {}, svg);
    el("rect", { width: W, height: H, fill: "#fff", "fill-opacity": 0 }, root);
    const grid = el("g", {}, root), cam = el("g", {}, root), fx = el("g", {}, root);
    const S = { svg, api, grid, cam, fx, items: [], fns: [], t: 0, live: !o.fixed };
    for (let i = k0; i <= 12; i++) {
      const x = X0 + i * COL, d = 0.1 + (i - k0) * 0.04;
      const ln = el("line", { x1: x, x2: x, y1: top, y2: top, stroke: INK, "stroke-opacity": 0.11, "stroke-width": 1 }, grid);
      S.fns.push((t) => ln.setAttribute("y2", top + (bot - top) * oe(seg(t, d, d + 0.7))));
      (o.marks || []).forEach((y, j) => {
        if ((i - k0) % 3) return;
        const c = el("path", { d: "M-5 0H5M0 -5V5", stroke: INK, "stroke-width": 1.5, fill: "none" }, grid), cd = 0.45 + (i - k0) * 0.03 + j * 0.06;
        S.fns.push((t) => { const k = seg(t, cd, cd + 0.3); c.setAttribute("opacity", k > 0 ? 1 : 0); c.setAttribute("transform", `translate(${x} ${y}) rotate(${90 * (1 - oc(k))}) scale(${ob(k)})`); });
      });
    }
    hr(S, X0, top, X1, 0.05, { p: grid, w: 2 }); hr(S, X0, bot, X1, 0.25, { p: grid, w: 2 });
    if (o.punch != null) { // the beat ruler: one tick per beat, the punch beat is the yellow one
      const n = Math.round(o.dur / BEAT);
      for (let i = 0; i <= n; i++) {
        const x = X0 + (i * (X1 - X0)) / n, at = Math.min(i * BEAT, o.dur - 0.4), hot = Math.abs(at - o.punch) < 0.01;
        const tk = hot ? el("rect", { x: x - 6, y: top - 21, width: 12, height: 12, fill: "#fff", stroke: INK, "stroke-width": 2 }, grid) : el("line", { x1: x, x2: x, y1: top - 9, y2: top - 19, stroke: INK, "stroke-width": 2 }, grid);
        S.fns.push((t) => {
          const on = t >= at - 0.001, k = seg(t, at, at + 0.28), g = seg(t, 0.2 + i * 0.03, 0.5 + i * 0.03);
          tk.setAttribute("opacity", on ? 1 : 0.28 * g);
          if (hot) { tk.setAttribute("fill", on ? YEL : "#fff"); tk.setAttribute("transform", `translate(${x} ${top - 15}) rotate(${on ? 45 * (1 - oc(k)) : 0}) scale(${on ? 0.5 + 0.7 * ob(k) : 1}) translate(${-x} ${15 - top})`); }
          else tk.setAttribute("y2", top - 19 - (on ? 7 * (1 - oc(k)) : 0));
        });
      }
    }
    if (!o.fixed) {
      el("rect", { x: 5, y: 5, width: W - 10, height: H - 10, rx: 14, fill: "none", stroke: AQUA, "stroke-width": 4, class: "mg-ring" }, root);
      button(root, "Replay the animation", () => api.seek(0));
    }
    S.render = (t, now) => {
      let sx = 0, sy = 0, busy = false; S.t = t;
      S.fns.forEach((f) => f(t));
      S.items.forEach((it) => {
        const h = now - it.hot, hov = it.hot > 0 && h < 0.9, lt = hov ? h : t - it.at; if (hov) busy = true;
        pose(it, lt);
        const d = lt - FALL; if (d >= 0 && d < 0.22) { const k = (1 - d / 0.22) ** 2; sx += Math.sin(d * 90) * it.amp * k; sy += Math.cos(d * 64) * it.amp * 0.55 * k; }
      });
      cam.setAttribute("transform", `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`); fx.setAttribute("transform", `translate(${sx.toFixed(2)} ${sy.toFixed(2)})`);
      grid.setAttribute("transform", `translate(${(sx * 0.35).toFixed(2)} ${(sy * 0.35).toFixed(2)})`);
      return busy;
    };
    return S;
  };
  // a thin rule that draws from left to right
  function hr(S, x1, y, x2, at, o = {}) {
    const ln = el("line", { x1, x2: x1, y1: y, y2: y, stroke: o.c || INK, "stroke-width": o.w || 1.5 }, o.p || S.cam);
    S.fns.push((t) => { const k = oe(seg(t, at, at + (o.d || 0.6))); ln.setAttribute("x2", x1 + (x2 - x1) * k); ln.setAttribute("opacity", k > 0 ? 1 : 0); });
    return ln;
  }
  // fall in with acceleration, stop hard, squash and overshoot, settle
  const pose = (it, lt) => {
    if (lt < 0) { it.g.setAttribute("opacity", 0); it.marks.forEach((m) => m.n.setAttribute("opacity", 0)); return; }
    const f = seg(lt, 0, FALL), e = f * f * f * f, a = f < 1 ? 0 : 1 - ob(seg(lt, FALL, FALL + 0.36));
    const s = it.from - (it.from - 1) * e, r = it.rot + it.spin * (1 - e) + (f < 1 ? 0 : it.rot * 0.8 * a);
    it.g.setAttribute("opacity", cl(f * 2.5));
    it.g.setAttribute("transform", `translate(${it.cx} ${it.cy}) rotate(${r.toFixed(2)}) scale(${(s * (1 + 0.08 * a)).toFixed(3)} ${(s * (1 - 0.15 * a)).toFixed(3)}) translate(${-it.cx} ${-it.cy})`);
    if (it.sh) { const d = it.d0 + 11 * (s - 1) - it.d0 * 0.7 * Math.max(0, a); it.sh.setAttribute("transform", `translate(${d.toFixed(2)} ${d.toFixed(2)})`); }
    const p = seg(lt, FALL, FALL + 0.34), q = oc(p);
    it.marks.forEach((m) => { m.n.setAttribute("opacity", f < 1 || p >= 1 ? 0 : 1 - p); m.n.setAttribute("transform", `translate(${(m.dx * 12 * q).toFixed(1)} ${(m.dy * 12 * q).toFixed(1)})`); });
  };
  const item = (S, g, box, at, o = {}) => {
    const [x, y, w, h] = box;
    const it = Object.assign({ g, cx: x + w / 2, cy: y + h, at, hot: -9, amp: 4, from: 2.3, rot: 0, spin: 0, sh: null, d0: 0, marks: [] }, o);
    if (it.amp >= 3) [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([dx, dy]) => {
      const px = x + (dx > 0 ? w : 0) + dx * 7, py = y + (dy > 0 ? h : 0) + dy * 7;
      it.marks.push({ dx, dy, n: el("line", { x1: px, y1: py, x2: px + dx * 9, y2: py + dy * 9, stroke: INK, "stroke-width": 2, opacity: 0 }, S.fx) });
    });
    if (S.live) g.addEventListener("pointerenter", (e) => {
      if (calm || e.pointerType === "touch") return;
      const now = S.api.now(); if (S.t >= it.at + 0.6 && now - it.hot > 0.7) { it.hot = now; S.api.poke(); }
    });
    S.items.push(it); return it;
  };
  const word = (S, s, x, base, size, at, o = {}) => {
    const g = el("g", {}, S.cam), a = { "font-size": size, "letter-spacing": o.ls || TIGHT, "font-family": o.fam || SANS, "font-weight": o.wt || 700 };
    const d0 = o.flat ? 0 : size > 60 ? 3.5 : 2, sh = o.flat ? null : txt(g, x, base, s, Object.assign({ fill: LIL }, a));
    const w = txt(g, x, base, s, a).getComputedTextLength(), cap = size * 0.7;
    el("rect", { x: x - 3, y: base - cap - 4, width: w + 6, height: cap + 8, fill: "#fff", "fill-opacity": 0 }, g);
    const it = item(S, g, [x, base - cap, w, cap], at, Object.assign({ sh, d0, amp: size > 60 ? 5 : 3 }, o.it));
    it.end = x + w; return it;
  };
  const line = (S, words, x, base, size, at, step, o) => words.map((s, i) => { const it = word(S, s, x, base, size, at + i * step, o); x = it.end + size * 0.25; return it; });
  // the yellow block: a dashed empty slot blinks on the beat, then the block slams into it
  const block = (S, lines, x, y, size, at, o = {}) => {
    const cap = size * 0.7, gap = size * 0.3, px = size * 0.36, py = size * 0.34;
    const w = Math.max(...lines.map((s) => measure(S.svg, s, size))) + px * 2, h = lines.length * cap + (lines.length - 1) * gap + py * 2, bx = o.right ? x - w : x;
    const slot = el("rect", { x: bx, y, width: w, height: h, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "7 7" }, S.cam);
    const g = el("g", {}, S.cam), sh = el("rect", { x: bx, y, width: w, height: h, fill: LIL }, g);
    el("rect", { x: bx, y, width: w, height: h, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    lines.forEach((s, i) => txt(g, bx + px, y + py + cap + i * (cap + gap), s, { "font-size": size, "letter-spacing": TIGHT }));
    const it = item(S, g, [bx, y, w, h], at, { sh, d0: 8, from: 2.7, amp: 10, rot: -2, spin: -6 });
    it.cy = y + h / 2; it.box = [bx, y, w, h];
    const sa = o.slotAt == null ? at - 1 : o.slotAt;
    S.fns.push((t) => {
      const k = seg(t, sa, sa + 0.25), blink = Math.floor((t - sa) / (BEAT / 2)) % 2 ? 0.3 : 1;
      slot.setAttribute("opacity", t < sa || t >= at + FALL ? 0 : k < 1 ? k : blink);
      slot.setAttribute("transform", `translate(${bx + w / 2} ${y + h / 2}) scale(${(0.92 + 0.08 * ob(k)).toFixed(3)}) translate(${-bx - w / 2} ${-y - h / 2})`);
    });
    return it;
  };

  const SC = {};

  /* ---- 1. single player, online mode: no date ---- */
  SC.nodate = {
    dur: 8,
    build(svg, api) {
      const S = stage(svg, api, { dur: 8, punch: 5.5, marks: [246] });
      const z = fit(svg, "SINGLE PLAYER", 700, 92), cap = z * 0.7;
      line(S, ["SINGLE", "PLAYER"], X0, 140, z, 1.0, BEAT);
      word(S, "EXPERIENCE", X0, 140 + cap + 20, z, 2.0);
      const sy = 140 + cap + 20 + 28;
      hr(S, X0, sy, X1, 2.5);
      const src = word(S, "ROCKSTAR NEWSWIRE 24 JUN 2026", X0 + 20, sy + 30, 18, 2.6, { fam: MONO, ls: "0.04em", flat: true, it: { from: 1.7, amp: 1.5 } });
      el("rect", { x: X0, y: sy + 17, width: 11, height: 11, fill: INK }, src.g);
      line(S, ["ONLINE", "MODE"], X0, 374, z, 3.5, BEAT);
      const b = block(S, ["NO DATE"], X1 - 8, 408, z, 5.5, { right: true, slotAt: 4.5 });
      const ly = 408 + b.box[3] / 2;
      hr(S, X0, ly, b.box[0] - 18, 4.5, { d: 0.9 });
      const end = el("path", { d: `M${b.box[0] - 18} ${ly - 8}V${ly + 8}`, stroke: INK, "stroke-width": 1.5 }, S.cam);
      S.fns.push((t) => end.setAttribute("opacity", seg(t, 5.0, 5.15)));
      return S.render;
    },
  };

  /* ---- 2. what Essential sells, and what GTA VI is ---- */
  SC.essential = {
    dur: 8,
    build(svg, api) {
      const S = stage(svg, api, { dur: 8, punch: 5.5, marks: [190, 336] });
      const xr = X0 + 5 * COL + 12, z = Math.min(48, fit(svg, "GAME PASS", 268, 48), fit(svg, "ESSENTIAL", 268, 48), fit(svg, "ONLINE CONSOLE", X1 - xr, 48));
      const row = (y, plan, perk, at) => {
        line(S, plan, X0, y, z, at, 0.1); word(S, "ESSENTIAL", X0, y + z * 1.08, z, at + plan.length * 0.1);
        line(S, perk, xr, y, z, at + BEAT, 0.1); word(S, "MULTIPLAYER", xr, y + z * 1.08, z, at + BEAT + perk.length * 0.1);
      };
      row(104, ["PS", "PLUS"], ["ONLINE"], 1.0);
      hr(S, X0, 190, X1, 2.0);
      row(250, ["GAME", "PASS"], ["ONLINE", "CONSOLE"], 2.5);
      hr(S, X0, 336, X1, 3.5);
      const bz = Math.min(78, (X1 - xr - 12) / (measure(svg, "PLAYER", 100) / 100 + 0.72));
      const b = block(S, ["SINGLE", "PLAYER"], xr, 454 - bz * 1.19, bz, 5.5, { slotAt: 4.5 });
      const g = fit(svg, "GTA VI", 262, 96);
      line(S, ["GTA", "VI"], X0, 454 + g * 0.35, g, 4.0, 0.12);
      return S.render;
    },
  };

  /* ---- 3. 2013: fourteen days between the game and its online mode ---- */
  SC.fourteen = {
    dur: 8,
    build(svg, api) {
      const S = stage(svg, api, { dur: 8, punch: 5.5, marks: [] });
      const xr = X0 + 7 * COL + 12, z = fit(svg, "17 SEP 2013", 7 * COL - 24, 84), lz = fit(svg, "GTA ONLINE", X1 - xr, 44);
      const y1 = 128, y2 = 492, top = y1 + 30, bot = y2 - z * 0.7 - 22, bh = bot - top;
      line(S, ["17", "SEP", "2013"], X0, y1, z, 1.0, 0.1); line(S, ["GTA", "V"], xr, y1, lz, 1.5, 0.1);
      line(S, ["1", "OCT", "2013"], X0, y2, z, 2.5, 0.1); line(S, ["GTA", "ONLINE"], xr, y2, lz, 3.0, 0.1);
      const bs = el("rect", { x: X0 + 8, y: top + 6, width: 18, height: 0, fill: LIL }, S.cam);
      const bar = el("rect", { x: X0 + 2, y: top, width: 18, height: 0, fill: YEL, stroke: INK, "stroke-width": 3 }, S.cam);
      const ticks = Array.from({ length: 15 }, (_, i) => el("line", { x1: X0 + 34, x2: X0 + 34, y1: top + (bh * i) / 14, y2: top + (bh * i) / 14, stroke: INK, "stroke-width": i % 7 ? 2 : 3 }, S.cam));
      S.fns.push((t) => {
        const p = io(seg(t, 3.5, 4.9));
        bar.setAttribute("height", bh * p); bs.setAttribute("height", bh * p); bar.setAttribute("opacity", p > 0 ? 1 : 0); bs.setAttribute("opacity", p > 0 ? 1 : 0);
        ticks.forEach((n, i) => { const k = ob(cl((p - i / 14) * 9 + (p >= 1 ? 1 : 0))); n.setAttribute("x2", X0 + 34 + (i % 7 ? 14 : 26) * Math.max(0, k)); n.setAttribute("opacity", p > 0 && p >= i / 14 ? 1 : 0); });
      });
      const dz = fit(svg, "14 DAYS", 455, 122), dh = dz * 0.7 + dz * 0.68;
      block(S, ["14 DAYS"], X0 + 2 * COL, (top + bot) / 2 - dh / 2, dz, 5.5, { slotAt: 4.9 });
      const label = "HISTORY, NOT A FORECAST", tw = measure(svg, label, 16, { "font-family": MONO, "letter-spacing": "0.03em" }) + 36, tx = X1 - tw, ty = y2 + 22;
      const tg = el("g", {}, S.cam), tsh = el("rect", { x: tx, y: ty, width: tw, height: 36, rx: 18, fill: LIL }, tg);
      el("rect", { x: tx, y: ty, width: tw, height: 36, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, tg);
      txt(tg, tx + 18, ty + 23.5, label, { "font-family": MONO, "font-size": 16, "letter-spacing": "0.03em" });
      item(S, tg, [tx, ty, tw, 36], 6.3, { sh: tsh, d0: 4, from: 1.9, amp: 2, rot: 0, spin: 5 });
      return S.render;
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 4,
    build(svg, api) {
      const S = stage(svg, api, { W: 800, H: 450, dur: 4, fixed: true, top: 92, bot: 398, k0: 7, marks: [92, 398] });
      const rise = (n, at, dy = 16) => S.fns.push((t) => { const k = oc(seg(t, at, at + 0.45)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${(dy * (1 - k)).toFixed(2)})`); });
      const pill = el("g", {}, S.grid);
      el("rect", { x: X0 + 4, y: 40, width: 84, height: 36, rx: 18, fill: LIL }, pill);
      el("rect", { x: X0, y: 36, width: 84, height: 36, rx: 18, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, X0 + 42, 60.5, "News", { "text-anchor": "middle", "font-size": 18 });
      rise(pill, 0.05, -14);
      rise(txt(S.grid, X1, 60, "Checked 19 Nov 2026", { "text-anchor": "end", "font-family": MONO, "font-size": 15, "font-weight": 500, fill: MUTE }), 0.15, -14);
      const lw = 7 * COL - 22, z = fit(svg, "GTA 6 online", lw, 64);
      rise(txt(S.grid, X0, 186, "GTA 6 online", { "font-size": z, "letter-spacing": TIGHT }), 0.2);
      rise(txt(S.grid, X0, 186 + z * 1.08, "release date", { "font-size": z, "letter-spacing": TIGHT }), 0.3);
      const uy = 186 + z * 1.08 + 26; hr(S, X0 + 2, uy, X0 + 150, 0.55, { p: S.grid, c: YEL, w: 11, d: 0.7 });
      const sub = "What Rockstar has confirmed so far";
      rise(txt(S.grid, X0, uy + 46, sub, { "font-size": fit(svg, sub, lw, 23, { "font-weight": 500, "letter-spacing": "0" }), "font-weight": 500, fill: MUTE }), 0.5);
      const xr = X0 + 7 * COL + 12, rw = X1 - xr, wz = fit(svg, "PLAYER", rw - 6, 84), cap = wz * 0.7;
      word(S, "SINGLE", xr, 120 + cap + 12, wz, 0.9); word(S, "PLAYER", xr, 120 + cap * 2 + 32, wz, 1.3);
      const by = 120 + cap * 2 + 62, bz = Math.min(46, (rw - 12) / (measure(svg, "NO DATE YET", 100) / 100 + 0.72));
      block(S, ["NO DATE YET"], xr, by, bz, 2.3, { slotAt: 1.7 });
      return S.render;
    },
  };

  /* ---- player: each scene plays once when it comes into view, then rests on its final frame ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, started = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => false;
    const frame = () => { const now = clock(), t = calm || !started ? sc.dur : cl(now + off, 0, sc.dur); return draw(t, calm ? 0 : now) || t < sc.dur; };
    const tick = () => { cancelAnimationFrame(raf); const live = frame(); if (seen && live && !calm) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); started = true; tick(); }, poke: tick };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.dur : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) { if (started) tick(); else api.seek(0); if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } }
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
