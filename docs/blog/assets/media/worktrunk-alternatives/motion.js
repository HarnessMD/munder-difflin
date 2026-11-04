/* Bright coded scenes for "Worktrunk alternatives". Vanilla JS, no library.
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
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const lerp = (a, b, k) => a + (b - a) * k;
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const ring = (p, x, y, w, h, r = 20) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 7", "vector-effect": "non-scaling-stroke", class: "mg-ring" }, p);

  const SC = {};

  /* ---- 1. a sheet with feat written three times; a rubber stamp prints one clean line ---- */
  SC.stamp = {
    dur: 8, still: 8,
    build(svg, api) {
      el("rect", { x: 142, y: 142, width: 460, height: 430, rx: 12, fill: SOFT }, svg);
      el("rect", { x: 130, y: 130, width: 460, height: 430, rx: 12, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      [430, 476, 522].forEach((y) => el("path", { d: `M178 ${y} H542`, stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, svg));
      const defs = el("defs", {}, svg);
      const WORDS = [[236, 262, -7, 46], [360, 256, 4, 42], [484, 264, -4, 46]];
      const hand = WORDS.map(([x, y, r, s]) => {
        const id = uid("mgst"), cp = el("clipPath", { id }, defs);
        const box = el("rect", { x: x - 62, y: y - 60, width: 0, height: 90 }, cp);
        const n = txt(svg, x, y, "feat", { "text-anchor": "middle", "font-size": s, "font-weight": 400, "font-style": "italic", transform: `rotate(${r} ${x} ${y})`, "clip-path": `url(#${id})` });
        return { box, n };
      });
      const imp = el("g", {}, svg);
      el("rect", { x: 162, y: 192, width: 396, height: 168, rx: 16, fill: "none", stroke: BLUE, "stroke-width": 5 }, imp);
      el("rect", { x: 174, y: 204, width: 372, height: 144, rx: 10, fill: "none", stroke: BLUE, "stroke-width": 2 }, imp);
      txt(imp, 360, 330, "wt switch -c feat", { "text-anchor": "middle", "font-family": MONO, "font-size": 30, "font-weight": 700 });
      const shadow = el("rect", { x: 160, y: 186, width: 400, height: 180, rx: 18, fill: SOFT }, svg);
      const st = el("g", {}, svg);
      el("rect", { x: -200, y: 70, width: 400, height: 34, rx: 8, fill: BLUE, stroke: INK, "stroke-width": 3 }, st);
      el("rect", { x: -200, y: -100, width: 400, height: 184, rx: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, st);
      el("ellipse", { cx: 0, cy: 6, rx: 46, ry: 18, fill: LIL, stroke: INK, "stroke-width": 3 }, st);
      el("path", { d: "M-24 4 V-58 H24 V4", fill: LIL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, st);
      el("ellipse", { cx: 0, cy: -66, rx: 58, ry: 40, fill: MINT, stroke: INK, "stroke-width": 3 }, st);
      el("ellipse", { cx: -18, cy: -80, rx: 16, ry: 8, fill: "#fff" }, st);
      ring(st, -220, -126, 440, 248, 26);
      button(st, "Clear the sheet and stamp again", () => api.seek(0));
      const REST = [690, 118, 0.32], OVER = [360, 252, 1.08], PRESS = [360, 276, 1];
      return (t) => {
        hand.forEach((h, i) => { const k = io(seg(t, 0.4 + i * 0.7, 1.05 + i * 0.7)); h.box.setAttribute("width", 124 * k); h.n.setAttribute("fill", t > 3.9 ? MUTE : INK); });
        let p = REST;
        const go = io(seg(t, 2.7, 3.5)), down = seg(t, 3.5, 3.75), up = seg(t, 4.05, 4.35), back = io(seg(t, 4.6, 5.4));
        if (t >= 2.7 && t < 3.5) p = REST.map((v, j) => lerp(v, OVER[j], go));
        else if (t >= 3.5 && t < 4.05) p = OVER.map((v, j) => lerp(v, PRESS[j], oc(down)));
        else if (t >= 4.05 && t < 4.6) p = PRESS.map((v, j) => lerp(v, OVER[j], oc(up)));
        else if (t >= 4.6) p = OVER.map((v, j) => lerp(v, REST[j], back));
        tf(st, p[0], p[1], p[2], t >= 2.7 && t < 5.4 ? -2 * Math.sin(Math.PI * seg(t, 2.7, 3.5)) : 0);
        shadow.setAttribute("opacity", t > 2.9 && t < 5 ? 0.9 * seg(t, 2.9, 3.4) * (1 - seg(t, 4.4, 5)) : 0);
        const ink = t >= 3.75 ? 1 : 0;
        imp.setAttribute("opacity", ink);
        const thump = Math.sin(Math.PI * seg(t, 4.3, 4.7));
        imp.setAttribute("transform", `translate(360 276) scale(${1 + 0.02 * thump}) translate(-360 -276)`);
      };
    },
  };

  /* ---- 2. a kite climbs beside a stars card; a gust lifts it higher ---- */
  SC.kite = {
    dur: 9, still: 9,
    build(svg, api) {
      el("ellipse", { cx: 150, cy: 600, rx: 260, ry: 70, fill: SOFT }, svg);
      const wind = [[150, 0], [214, 0.25], [292, 0.12], [356, 0.36]].map(([y, d]) => ({ n: el("path", { d: `M0 ${y} q 40 -14 80 0 t 80 0`, stroke: SKY, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, svg), d }));
      const str = el("path", { stroke: INK, "stroke-width": 2.5, fill: "none" }, svg);
      el("path", { d: "M118 572 V530", stroke: INK, "stroke-width": 5, "stroke-linecap": "round" }, svg);
      el("circle", { cx: 118, cy: 524, r: 24, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      el("circle", { cx: 118, cy: 524, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      const kite = el("g", {}, svg), body = el("g", {}, kite);
      const tail = el("path", { stroke: INK, "stroke-width": 2.5, fill: "none", "stroke-linejoin": "round" }, body);
      const tailAt = (u, t) => [Math.sin(u * 5.5 - t * 3) * 12 * u + 46 * u * u, 58 + 170 * u];
      const bows = [YEL, MINT, BLUE].map((c) => { const b = el("g", {}, body); el("path", { d: "M-12 -8 L12 8 V-8 L-12 8 Z", fill: c, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, b); return b; });
      [["M0 -62 L-44 -8 L0 0 Z", LIL], ["M0 -62 L44 -8 L0 0 Z", SKY], ["M-44 -8 L0 58 L0 0 Z", SKY], ["M44 -8 L0 58 L0 0 Z", LIL]].forEach(([d, f]) => el("path", { d, fill: f }, body));
      el("path", { d: "M0 -62 L44 -8 L0 58 L-44 -8 Z", fill: "none", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, body);
      el("path", { d: "M0 -62 V58 M-44 -8 H44", stroke: INK, "stroke-width": 2.5 }, body);
      ring(kite, -64, -82, 128, 160, 22);
      let taps = 0, tapAt = -99, last = 0;
      button(kite, "Let out more string", () => { taps = taps >= 3 ? 0 : taps + 1; tapAt = api.now(); api.poke(); });
      const card = el("g", {}, svg);
      el("rect", { x: 452, y: 182, width: 300, height: 160, rx: 18, fill: SOFT }, card);
      el("rect", { x: 440, y: 170, width: 300, height: 160, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
      txt(card, 468, 232, "10,580 stars", { "font-size": 38, "font-weight": 700 });
      const l2 = el("g", {}, card);
      el("rect", { x: 462, y: 264, width: 178, height: 44, rx: 12, fill: MINT }, l2);
      txt(l2, 476, 296, "438 today", { "font-size": 28, "font-weight": 600 });
      const note = txt(svg, 590, 390, "Attention, not use", { "text-anchor": "middle", "font-size": 26, "font-weight": 500, fill: MUTE });
      return (t, now) => {
        if (t < last - 1) taps = 0;
        last = t;
        const climb = io(seg(t, 0.3, 3.0)), gust = io(seg(t, 3.5, 4.6));
        let x = lerp(lerp(176, 252, climb), 300, gust), y = lerp(lerp(470, 272, climb), 186, gust);
        const sw = Math.sin(t * 2.1) * (0.4 + 0.6 * climb);
        const dt = now - tapAt, bump = dt >= 0 && dt < 1.4 ? Math.sin(Math.PI * seg(dt, 0, 0.5)) * 14 * (1 - seg(dt, 0.5, 1.4)) : 0;
        const goal = taps * 22, lift = dt >= 0 && dt < 1.4 ? lerp((taps ? taps - 1 : 0) * 22, goal, oc(seg(dt, 0, 0.6))) : goal;
        y += sw * 5 - lift - bump; x += lift * 0.4 + sw * 3;
        const rot = 8 * sw + 6 * Math.sin(Math.PI * seg(t, 3.5, 4.6));
        tf(kite, x, y, 0.55 + 0.45 * climb, rot);
        tail.setAttribute("d", "M" + Array.from({ length: 21 }, (_, j) => tailAt(j / 20, t).map((v) => v.toFixed(1)).join(" ")).join(" L"));
        bows.forEach((b, i) => { const [bx0, by0] = tailAt(0.28 + i * 0.3, t); tf(b, bx0, by0, 1, 10 * Math.sin(t * 3 + i)); });
        const sc = 0.55 + 0.45 * climb, bx = x, by = y + 4 * sc;
        str.setAttribute("d", `M118 524 Q ${(118 + bx) / 2 + 40} ${Math.max(524, by) - 10 + (524 - by) * 0.1} ${bx} ${by}`);
        wind.forEach((w) => { const k = seg(t, 3.3 + w.d, 4.7 + w.d); w.n.setAttribute("opacity", Math.sin(Math.PI * k)); w.n.setAttribute("transform", `translate(${lerp(-80, 330, k)} 0)`); });
        const kc = oc(seg(t, 0.2, 0.7)); card.setAttribute("opacity", kc); card.setAttribute("transform", `translate(0 ${12 * (1 - kc)})`);
        const k2 = ob(seg(t, 4.2, 4.8)); l2.setAttribute("opacity", seg(t, 4.2, 4.4)); l2.setAttribute("transform", `translate(0 ${16 * (1 - k2)})`);
        note.setAttribute("opacity", oc(seg(t, 5.6, 6.3)));
      };
    },
  };

  /* ---- 3. six teacups on saucers; steam in turn, each saucer says where it runs ---- */
  SC.teacups = {
    dur: 9, still: 9,
    build(svg, api) {
      const CUPS = [
        ["Plain git", ["Your terminal"], ["Free and", "open source"], YEL],
        ["Munder Difflin", ["Your computer"], ["Free and", "open source"], BLUE],
        ["Claude Squad", ["Terminal"], ["AGPL 3.0"], LIL],
        ["Orca", ["Desktop and", "Android"], ["MIT"], SKY],
        ["Emdash", ["Desktop"], ["Apache 2.0"], MINT],
        ["Conductor", ["Mac or cloud"], ["Free, Pro $50", "a month"], YEL],
      ];
      const root = el("g", { transform: "translate(0 -64)" }, svg);
      el("rect", { x: 16, y: 336, width: 768, height: 172, rx: 24, fill: SOFT }, root);
      const SY = 384, TOP = 300, BOT = 372;
      const cups = CUPS.map(([name, where, lic, fill], i) => {
        const cx = 80 + i * 128, g = el("g", {}, root);
        el("ellipse", { cx, cy: SY, rx: 61, ry: 34, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
        el("ellipse", { cx, cy: BOT - 2, rx: 32, ry: 10, fill: "none", stroke: SOFT, "stroke-width": 3 }, g);
        const w = el("g", {}, g);
        where.forEach((s, j) => txt(w, cx, (where.length > 1 ? 392 : 398) + j * 15, s, { "text-anchor": "middle", "font-size": 13, "font-weight": 600 }));
        name.split(" ").length > 1 && name.length > 10
          ? name.split(" ").forEach((s, j) => txt(g, cx, 450 + j * 22, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 }))
          : txt(g, cx, 450, name, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        const chip = el("g", {}, g);
        const ch = lic.length > 1 ? 40 : 28;
        el("rect", { x: cx - 56, y: 360 - ch / 2, width: 112, height: ch, rx: 10, fill: MINT, stroke: INK, "stroke-width": 2 }, chip);
        lic.forEach((s, j) => txt(chip, cx, (lic.length > 1 ? 356 : 365) + j * 15, s, { "text-anchor": "middle", "font-size": 13, "font-weight": 700 }));
        const steam = [-13, 13].map((dx) => el("path", { d: `M${cx + dx} 290 c -12 -14 12 -28 0 -42 s 12 -28 0 -42`, stroke: SKY, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, g));
        const cup = el("g", {}, g);
        el("path", { d: `M${cx + 40} 314 C ${cx + 66} 312 ${cx + 66} 350 ${cx + 32} 352`, stroke: INK, "stroke-width": 9, fill: "none", "stroke-linecap": "round" }, cup);
        el("path", { d: `M${cx + 40} 314 C ${cx + 66} 312 ${cx + 66} 350 ${cx + 32} 352`, stroke: fill, "stroke-width": 4, fill: "none", "stroke-linecap": "round" }, cup);
        el("path", { d: `M${cx - 46} ${TOP} H${cx + 46} Q ${cx + 44} ${BOT} ${cx + 20} ${BOT} H${cx - 20} Q ${cx - 44} ${BOT} ${cx - 46} ${TOP} Z`, fill, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, cup);
        el("ellipse", { cx, cy: TOP, rx: 46, ry: 9, fill: "#fff", stroke: INK, "stroke-width": 3 }, cup);
        el("ellipse", { cx, cy: TOP + 2, rx: 36, ry: 5, fill: SOFT }, cup);
        ring(cup, cx - 54, TOP - 16, 126, BOT - TOP + 28, 16);
        const s = { cx, w, chip, steam, cup, up: false, at: -99 };
        button(cup, `Lift the ${name} cup`, () => { s.up = !s.up; s.at = api.now(); api.poke(); });
        return s;
      });
      return (t, now) => {
        cups.forEach((c, i) => {
          const a = 0.5 + i * 1.15;
          const lk = c.at < -50 ? (c.up ? 1 : 0) : (c.up ? oc(seg(now - c.at, 0, 0.45)) : 1 - oc(seg(now - c.at, 0, 0.45)));
          const puff = Math.sin(Math.PI * seg(t, a, a + 0.5)) * (1 - lk);
          c.cup.setAttribute("transform", `translate(0 ${-104 * lk - 4 * puff}) rotate(${-5 * lk} ${c.cx} ${BOT})`);
          c.chip.setAttribute("opacity", seg(lk, 0.15, 0.6));
          const sk = seg(t, a, a + 2.2);
          c.steam.forEach((p, j) => { p.setAttribute("opacity", (seg(t, a, a + 0.5) * (1 - seg(t, a + 1.5, a + 2.2))) * (1 - lk)); p.setAttribute("transform", `translate(${Math.sin(t * 3 + j) * 3} ${-26 * sk - 104 * lk})`); });
          const wk = oc(seg(t, a + 0.2, a + 0.6));
          c.w.setAttribute("opacity", wk);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 3.6, still: 3.6, once: true,
    build(svg) {
      el("rect", { x: 64, y: 40, width: 176, height: 40, rx: 20, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 152, 67, "Alternatives", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 896, 67, "Checked 4 Nov 2026", { "text-anchor": "end", "font-size": 18, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 150, "Worktrunk", { "font-size": 62, "font-weight": 700 });
      txt(svg, 64, 216, "alternatives", { "font-size": 62, "font-weight": 700 });
      el("path", { d: "M66 240 H420", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 288, "6 picks by why you are leaving", { "font-size": 25, "font-weight": 500, fill: MUTE });
      const top = el("g", {}, svg);
      el("rect", { x: 64, y: 312, width: 240, height: 44, rx: 12, fill: SOFT, stroke: MUTE, "stroke-width": 2 }, top);
      txt(top, 184, 340, "Worktrunk", { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700, fill: MUTE });
      const PICKS = ["Plain git", "Munder Difflin", "Claude Squad", "Orca", "Emdash", "Conductor"], FILLS = [YEL, BLUE, LIL, SKY, MINT, YEL];
      const tiles = PICKS.map((s, i) => {
        const x = 64 + (i % 3) * 284, y = 378 + Math.floor(i / 3) * 58, g = el("g", {}, svg);
        el("rect", { x, y, width: 264, height: 44, rx: 12, fill: FILLS[i], stroke: INK, "stroke-width": 2.5 }, g);
        txt(g, x + 132, y + 28, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
        return g;
      });
      return (t) => {
        const k0 = oc(seg(t, 0.1, 0.5)); top.setAttribute("opacity", k0); top.setAttribute("transform", `translate(0 ${-12 * (1 - k0)})`);
        tiles.forEach((g, i) => { const a = 0.6 + i * 0.3, k = ob(seg(t, a, a + 0.6)); g.setAttribute("opacity", seg(t, a, a + 0.2)); g.setAttribute("transform", `translate(0 ${-30 * (1 - k)})`); });
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
    const at = (now) => (sc.once ? Math.min(now + off, sc.dur) : (((now + off) % sc.dur) + sc.dur) % sc.dur);
    const frame = () => { const now = clock(); draw(held ? sc.still : at(now), now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && !(sc.once && clock() + off >= sc.dur)) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && sc.once && !fig.dataset.ran) { fig.dataset.ran = 1; off = -clock(); }
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
