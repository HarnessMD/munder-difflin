/* Bright coded scenes for "Agent Tools Today, 20 Nov 2026". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
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
  const f1 = (v) => v.toFixed(1), f3 = (v) => v.toFixed(3);
  const LINE = { stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" };
  // a metronome body: a trapezoid with a rounded top, centred on cx (top half width th at ty, bottom half width bh at by)
  const bodyPath = (cx, ty, th, by, bh, r) => `M${cx - bh} ${by} L${cx - th} ${ty + r} Q${cx - th} ${ty} ${cx - th + r} ${ty} H${cx + th - r} Q${cx + th} ${ty} ${cx + th} ${ty + r} L${cx + bh} ${by} Z`;

  const SC = {};

  /* ---- a metronome: the blue arm swings over three lilac tiles; each turns mint as the arm passes over it; a tap stops the arm and shows that tile's date ---- */
  SC.metronome = {
    dur: 9.6, still: 9.2,
    build(svg, api) {
      const NAMES = ["Codex", "Claude Code", "Black holes"], DATES = ["20 Nov", "19 Nov", "17 Nov"], TX = [174, 400, 626];
      // the swing starts at S0 with period P, fades out between 6.9 and 8.6 so the arm settles upright, then rests
      const DUR = 9.6, STILL = 9.2, S0 = 1.5, P = 3.2, AMP = 38, DEC = 0.6, FADE = 0.7, DT = 0.025;
      const PX = 400, PY = 332, AL = 258, TW = 212, TH = 64, TY = 436, LIP = 7, FS = 25;
      const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      // the yellow body: a soft ground shadow, the body with its soft window and tempo ticks, then the plinth
      const body = el("g", {}, svg);
      el("ellipse", { cx: PX, cy: 391, rx: 180, ry: 9, fill: SOFT }, body);
      el("path", Object.assign({ d: bodyPath(PX, 150, 24, 362, 110, 12), fill: YEL }, LINE), body);
      el("path", { d: "M316 318 L356 228", stroke: "#fff", "stroke-width": 5, "stroke-linecap": "round", opacity: 0.75 }, body);
      el("path", Object.assign({ d: `M${PX - 14} 176 H${PX + 14} L${PX + 58} 346 H${PX - 58} Z`, fill: SOFT }, LINE, { "stroke-width": 2.5 }), body);
      for (let k = 0; k < 7; k++) el("path", { d: `M${PX - (k % 2 ? 9 : 15)} ${196 + k * 20} H${PX + (k % 2 ? 9 : 15)}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, body);
      el("rect", Object.assign({ x: PX - 132, y: 356, width: 264, height: 32, rx: 12, fill: YEL }, LINE), body);
      // the blue arm with its sliding weight, pinned at the pivot
      const arm = el("g", {}, svg);
      el("rect", Object.assign({ x: PX - 7, y: PY - AL, width: 14, height: AL + 8, rx: 7, fill: BLUE }, LINE), arm);
      el("rect", Object.assign({ x: PX - 26, y: PY - 200, width: 52, height: 36, rx: 9, fill: BLUE }, LINE), arm);
      el("path", { d: `M${PX - 16} ${PY - 190} H${PX - 2}`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.75 }, arm);
      const pin = el("circle", Object.assign({ cx: PX, cy: PY, r: 11, fill: SOFT }, LINE), svg);
      // three raised lilac tiles; a solid mint fill wipes out from the centre when the arm passes over one, and a dashed focus ring
      let tap = () => {};
      const R = { x: -TW / 2, width: TW, height: TH, rx: 16 }, EDGE = { fill: "none", stroke: INK, "stroke-width": 3 };
      const tiles = NAMES.map((w, i) => {
        const g = el("g", {}, svg);
        el("rect", Object.assign({ y: -TH / 2 + LIP, fill: LIL }, R), g);
        const mintD = el("rect", { y: -TH / 2 + LIP, height: TH, fill: MINT }, g);
        el("rect", Object.assign({ y: -TH / 2 + LIP }, R, EDGE), g);
        el("rect", Object.assign({ y: -TH / 2, fill: LIL }, R), g);
        const mintF = el("rect", { y: -TH / 2, height: TH, fill: MINT }, g);
        el("rect", Object.assign({ y: -TH / 2 }, R, EDGE), g);
        el("path", { d: `M${-TW / 2 + 18} ${-TH / 2 + 10} H${-TW / 2 + 54}`, stroke: "#fff", "stroke-width": 4, "stroke-linecap": "round", opacity: 0.75 }, g);
        el("rect", { x: -TW / 2 - 9, y: -TH / 2 - 9, width: TW + 18, height: TH + LIP + 18, rx: 22, fill: "none", stroke: INK, "stroke-width": 2.5, "stroke-dasharray": "6 8", class: "mg-ring" }, g);
        button(g, `${w}: stop the arm and show ${DATES[i]}`, () => tap(i));
        g.setAttribute("aria-pressed", "false");
        return { g, mintD, mintF, x: TX[i], y: TY + TH / 2 };
      });
      // the words and the soft white date tags float above everything; taps pass through them to the tile
      const labels = el("g", { "pointer-events": "none" }, svg);
      const MW = { "text-anchor": "middle", "font-family": MONO, "font-size": FS, "font-weight": 700 };
      const TAGP = "M-52 10 H-10 L0 0 L10 10 H52 Q64 10 64 22 V40 Q64 52 52 52 H-52 Q-64 52 -64 40 V22 Q-64 10 -52 10 Z";
      tiles.forEach((b, i) => {
        const lab = el("g", {}, labels), word = el("g", {}, lab);
        const halo = txt(word, 0, 9, NAMES[i], Object.assign({}, MW, { fill: "#fff", stroke: "#fff", "stroke-width": 0, "stroke-linejoin": "round", opacity: 0 }));
        const ink = txt(word, 0, 9, NAMES[i], MW);
        const tag = el("g", { opacity: 0 }, lab);
        el("path", { d: TAGP, fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, tag);
        const tagText = txt(tag, 0, 39, DATES[i], { "text-anchor": "middle", "font-family": MONO, "font-size": 22, "font-weight": 700 });
        Object.assign(b, { lab, word, halo, ink, tag, tagText });
      });
      // the swing: an envelope eases it in and out, so it starts and ends upright and still
      const envOf = (T) => oc(seg(T, S0, S0 + 1)) * (1 - io(seg(T, 6.9, 8.6)));
      const angOf = (T) => -AMP * envOf(T) * Math.sin((2 * Math.PI * (T - S0)) / P);
      const tipX = (T) => PX + AL * Math.sin((angOf(T) * Math.PI) / 180);
      const over = (T, i) => cl((TW / 2 - Math.abs(tipX(T) - TX[i])) / 14) * cl(envOf(T) * 4);
      // a tile stays lit for FADE seconds after the arm leaves it, and pops a little as the arm arrives
      const lit = (T, i) => { let m = 0; for (let k = 0; k * DT <= FADE; k++) m = Math.max(m, over(T - k * DT, i) * (1 - (k * DT) / FADE)); return m; };
      const wipe = (n, k) => { const ww = TW * k; n.setAttribute("x", f1(-ww / 2)); n.setAttribute("width", f1(ww)); n.setAttribute("rx", f1(Math.min(16, ww / 2))); n.setAttribute("opacity", ww > 0.5 ? 1 : 0); };
      const popOf = (T, i) => { if (over(T, i) < 0.5) return 0; let k = 0; while (k < 20 && over(T - (k + 1) * DT, i) >= 0.5) k++; return 0.07 * Math.sin(Math.PI * cl((k * DT) / 0.4)); };
      // a tap stops the arm (it slows over 0.6 s) and shows that tile's date; the same tile again sets it swinging
      let user = null, fade = null, woff = 0, lastT = STILL, lastRaw = 0, done = false;
      const C = [0, 0, 0];
      const stopT = (now) => { if (calm) return user.tc; const s = cl(now - user.t0, 0, DEC); return user.tc + s - (s * s) / (2 * DEC); };
      tap = (n) => {
        const now = api.now(); done = true;
        if (user && user.sel === n) { woff = stopT(now) - lastRaw; fade = { sel: n, t0: now, from: C[n] }; user = null; }
        else if (user) { fade = { sel: user.sel, t0: now, from: C[user.sel] }; user = Object.assign({}, user, { sel: n, cs: now, cd: 0.1 }); }
        else user = { sel: n, tc: lastT, t0: now, cs: now, cd: 0.2 };
        tiles.forEach((b, i) => b.g.setAttribute("aria-pressed", String(!!user && user.sel === i)));
        api.poke();
      };
      return (t, now) => {
        let T = user ? stopT(now) : calm ? STILL : t + woff;
        T = ((T % DUR) + DUR) % DUR;
        if (T > 2.2) done = true;
        lastT = T; lastRaw = t;
        // the entrance plays once: body, then the arm grows, then tiles 100 ms apart, then the words land last
        const E = done ? 99 : T, b0 = seg(E, 0, 0.6), a0 = seg(E, 0.35, 0.85);
        body.setAttribute("transform", `translate(${PX} 388) scale(${f3(0.86 + 0.14 * ob(b0))}) translate(${-PX} -388)`);
        body.setAttribute("opacity", f3(oc(seg(E, 0, 0.25))));
        arm.setAttribute("transform", `rotate(${angOf(T).toFixed(2)} ${PX} ${PY}) translate(0 ${PY}) scale(1 ${f3(Math.max(0.001, ob(a0)))}) translate(0 ${-PY})`);
        arm.setAttribute("opacity", a0 > 0 ? 1 : 0);
        pin.setAttribute("opacity", f3(oc(cl(a0 * 3))));
        tiles.forEach((b, i) => {
          const d = seg(E, 0.6 + 0.1 * i, 1.05 + 0.1 * i), w = seg(E, 0.95 + 0.1 * i, 1.4 + 0.1 * i);
          let c = 0;
          if (user && user.sel === i) c = calm ? 1 : seg(now - user.cs, user.cd, user.cd + 0.4);
          else if (fade && fade.sel === i) c = calm ? 0 : fade.from * (1 - seg(now - fade.t0, 0, 0.25));
          C[i] = c;
          const m = Math.max(lit(T, i), c), pop = popOf(T, i);
          const at = `translate(${b.x} ${f1(b.y + 26 * (1 - ob(d)))}) scale(${f3(1 + pop)})`;
          b.g.setAttribute("transform", at);
          b.g.setAttribute("opacity", f3(oc(cl(d * 2.5))));
          wipe(b.mintD, oc(m)); wipe(b.mintF, oc(m));
          b.lab.setAttribute("transform", at);
          b.word.setAttribute("transform", `scale(${f3((0.5 + 0.5 * ob(w)) * (1 + 0.04 * m))})`);
          b.word.setAttribute("opacity", f3(oc(cl(w * 2))));
          b.ink.setAttribute("opacity", f3(0.84 + 0.16 * m));
          const hw = 9 * oc(seg(m, 0.55, 1));
          b.halo.setAttribute("stroke-width", f1(hw));
          b.halo.setAttribute("opacity", hw > 0.1 ? 1 : 0);
          b.tag.setAttribute("opacity", f3(oc(cl(c * 2))));
          b.tag.setAttribute("transform", `translate(0 ${TH / 2 + LIP + 5}) scale(${f3(Math.max(0.001, 0.5 + 0.5 * ob(c)))})`);
          b.tagText.setAttribute("opacity", f3(oc(seg(c, 0.35, 1))));
        });
      };
    },
  };

  /* ---- title card, 16 by 9: a lilac metronome swings once and settles beside three stacked cards ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 5.6,
    build(svg) {
      const CX = 820, PY = 384, AL = 236, A = 22, CARDS = ["Codex", "Claude Code", "Black holes"], DOTS = [SKY, YEL, MINT];
      const pill = el("g", {}, svg);
      el("rect", { x: 64, y: 106, width: 172, height: 44, rx: 22, fill: YEL, stroke: INK, "stroke-width": 2.5 }, pill);
      txt(pill, 150, 135, "Daily Brief", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      const lines = [
        txt(svg, 60, 236, "Agent Tools", { "font-size": 76, "font-weight": 700 }),
        txt(svg, 60, 318, "Today", { "font-size": 76, "font-weight": 700 }),
        txt(svg, 64, 382, "20 Nov 2026", { "font-size": 30, "font-weight": 600 }),
        txt(svg, 64, 424, "Codex, Claude Code and black holes", { "font-size": 24, "font-weight": 500, fill: MUTE }),
      ];
      const met = el("g", {}, svg);
      el("ellipse", { cx: CX, cy: 439, rx: 92, ry: 7, fill: SOFT }, met);
      el("path", Object.assign({ d: bodyPath(CX, 206, 16, 416, 62, 10), fill: LIL }, LINE), met);
      el("path", Object.assign({ d: `M${CX - 9} 232 H${CX + 9} L${CX + 34} 396 H${CX - 34} Z`, fill: SOFT }, LINE, { "stroke-width": 2.5 }), met);
      for (let k = 0; k < 6; k++) el("path", { d: `M${CX - (k % 2 ? 6 : 11)} ${252 + k * 22} H${CX + (k % 2 ? 6 : 11)}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, met);
      el("rect", Object.assign({ x: CX - 78, y: 410, width: 156, height: 28, rx: 10, fill: LIL }, LINE), met);
      const arm = el("g", {}, svg);
      el("rect", Object.assign({ x: CX - 6, y: PY - AL, width: 12, height: AL + 7, rx: 6, fill: YEL }, LINE), arm);
      el("rect", Object.assign({ x: CX - 21, y: PY - 182, width: 42, height: 30, rx: 8, fill: YEL }, LINE), arm);
      const pin = el("circle", Object.assign({ cx: CX, cy: PY, r: 9, fill: SOFT }, LINE), svg);
      const cards = CARDS.map((s, i) => {
        const g = el("g", {}, svg), y = 216 + i * 62;
        el("rect", { x: 554, y: y + 6, width: 182, height: 48, rx: 12, fill: LIL }, g);
        el("rect", { x: 548, y, width: 182, height: 48, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g);
        el("circle", { cx: 570, cy: y + 24, r: 7, fill: DOTS[i], stroke: INK, "stroke-width": 2 }, g);
        return { g, label: txt(g, 586, y + 31, s, { "font-family": MONO, "font-size": 20, "font-weight": 700 }) };
      });
      // plays once, then holds its calm final frame
      let done = false;
      return (t) => {
        if (t >= 5.4) done = true;
        const T = done ? 99 : t, p = seg(T, 0, 0.45);
        pill.setAttribute("transform", `translate(64 128) scale(${f3(Math.max(0.001, 0.6 + 0.4 * ob(p)))}) translate(-64 -128)`);
        pill.setAttribute("opacity", f3(oc(cl(p * 2.5))));
        lines.forEach((n, i) => { const k = seg(T, 0.12 + 0.11 * i, 0.62 + 0.11 * i); n.setAttribute("transform", `translate(0 ${f1(26 * (1 - oc(k)))})`); n.setAttribute("opacity", f3(oc(k))); });
        const b = seg(T, 0.5, 1.1), a = seg(T, 0.8, 1.3), u = seg(T, 1.7, 4.7), th = A * Math.sin(2 * Math.PI * u) * (1 - u * u);
        met.setAttribute("transform", `translate(${CX} 438) scale(${f3(0.86 + 0.14 * ob(b))}) translate(${-CX} -438)`);
        met.setAttribute("opacity", f3(oc(cl(b * 3))));
        arm.setAttribute("transform", `rotate(${th.toFixed(2)} ${CX} ${PY}) translate(0 ${PY}) scale(1 ${f3(Math.max(0.001, ob(a)))}) translate(0 ${-PY})`);
        arm.setAttribute("opacity", a > 0 ? 1 : 0);
        pin.setAttribute("opacity", a > 0 ? 1 : 0);
        cards.forEach((c, i) => {
          const k = seg(T, 1.0 + 0.1 * i, 1.45 + 0.1 * i), w = seg(T, 1.25 + 0.1 * i, 1.65 + 0.1 * i);
          c.g.setAttribute("transform", `translate(0 ${f1(-30 * (1 - ob(k)))})`);
          c.g.setAttribute("opacity", f3(oc(cl(k * 2.5))));
          c.label.setAttribute("opacity", f3(oc(w)));
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
