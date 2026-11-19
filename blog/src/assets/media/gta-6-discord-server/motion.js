/* Paper cutout scenes for "GTA 6 Discord server". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", AQUA = "#3FC6C9", NAVY = "#22305E";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size = 16, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  let uid = 0;
  const nid = (p) => `mg-gta6-${p}-${++uid}`;
  const hash = (n) => { let x = Math.imul((n | 0) ^ 0x9E3779B9, 0x85EBCA6B); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };

  /* ---- paper kit: every piece is cut paper with a white rim, an ink line and a soft lilac shadow ---- */
  const rrp = (x, y, w, h, r) => `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
  const cut = (p, d, fill, sh = true) => {
    const g = el("g", {}, p);
    if (sh) g.sh = el("path", { d, fill: LIL, stroke: LIL, "stroke-width": 12, "stroke-linejoin": "round", opacity: 0.5, transform: "translate(5 7)" }, g);
    el("path", { d, fill: INK, stroke: INK, "stroke-width": 13, "stroke-linejoin": "round" }, g);
    el("path", { d, fill, stroke: "#fff", "stroke-width": 8, "stroke-linejoin": "round" }, g);
    return g;
  };
  const paper = (p, w, h, fill, r = 12) => cut(p, rrp(-w / 2 + 6.5, -h / 2 + 6.5, w - 13, h - 13, r), fill);
  const lift = (g, k) => { if (g.sh) g.sh.setAttribute("transform", `translate(${5 + 3 * k} ${7 + 6 * k})`); };
  const ring = (g, x, y, w, h, r) => el("rect", { x, y, width: w, height: h, rx: r, fill: "none", stroke: AQUA, "stroke-width": 3.5, class: "mg-ring" }, g);
  const stage = (svg, W = 800, H = 600) => { el("rect", { width: W, height: H, fill: SOFT }, svg); return el("g", {}, svg); };
  const fade = (t, d) => oc(seg(t, 0, 0.3)) * (1 - io(seg(t, d - 0.45, d)));
  const sway = (now, i, a) => (frozen ? 0 : Math.sin(now * 0.6 + i * 1.7) * a);
  const jit = (now, i) => (frozen ? 0 : hash(Math.floor(now * 8) * 31 + i) - 0.5); // stop motion, on twos
  const hov = (g, api) => {
    const h = { on: false, at: -9, k: (now) => { const v = oc(cl((now - h.at) / 0.18)); return h.on ? v : 1 - v; } };
    const set = (v) => () => { if (h.on !== v) { h.on = v; h.at = api.now(); } };
    g.addEventListener("pointerenter", set(true)); g.addEventListener("pointerleave", set(false));
    g.addEventListener("focus", set(true)); g.addEventListener("blur", set(false));
    return h;
  };
  // a rubber stamp: swings in big, lands at 0.22 s with a squash and a burst of ticks; returns the jolt
  const stamp = (p, x, y, w, h, label, fill, rot, fs = 16) => {
    const g = el("g", { opacity: 0 }, p), ticks = [], N = 8;
    for (let i = 0; i < N; i++) ticks.push(el("path", { d: "M0 0 H11", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, g));
    const s = el("g", {}, g);
    el("rect", { x: -w / 2 + 4, y: -h / 2 + 5, width: w, height: h, rx: 9, fill: LIL, opacity: 0.55 }, s);
    el("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 9, fill, stroke: INK, "stroke-width": 2.5 }, s);
    el("rect", { x: -w / 2 + 5, y: -h / 2 + 5, width: w - 10, height: h - 10, rx: 5, fill: "none", stroke: INK, "stroke-width": 1.5, "stroke-dasharray": "1 5", "stroke-linecap": "round" }, s);
    mono(s, 0, fs * 0.35, label, fs);
    return (u) => {
      if (u <= 0) { g.setAttribute("opacity", 0); return 0; }
      const d = u - 0.22, sc = d < 0 ? 2.3 - 1.3 * Math.pow(u / 0.22, 3) : 1 - 0.09 * Math.sin(d * 24) * Math.exp(-d * 9);
      g.setAttribute("opacity", cl(u / 0.08)); tf(g, x, y);
      s.setAttribute("transform", `rotate(${rot + (d < 0 ? 12 * (1 - u / 0.22) : 0)}) scale(${sc})`);
      const b = oc(seg(d, 0, 0.3)), o = d < 0 ? 0 : 1 - seg(d, 0.16, 0.42);
      ticks.forEach((n, i) => { const a = (i / N) * 6.283 + 0.3, rx = w / 2 + 8 + b * 16, ry = h / 2 + 8 + b * 14; n.setAttribute("transform", `rotate(${rot}) translate(${Math.cos(a) * rx} ${Math.sin(a) * ry}) rotate(${a * 57.3})`); n.setAttribute("opacity", o); });
      return d < 0 ? 0 : Math.sin(d * 26) * Math.exp(-d * 9);
    };
  };
  const face = (g, x, y, r, fill) => { // simple round head, two dots
    el("circle", { cx: x, cy: y, r, fill, stroke: INK, "stroke-width": 2.5 }, g);
    el("circle", { cx: x - r * 0.36, cy: y - 1, r: 2.6, fill: INK }, g); el("circle", { cx: x + r * 0.36, cy: y - 1, r: 2.6, fill: INK }, g);
  };

  const SC = {};

  /* ---- 1. channel cards slide apart, a spoiler word is blocked, a ticket lifts the curtain ---- */
  SC.curtain = {
    dur: 13.5, still: 9,
    build(svg, api) {
      const root = stage(svg);
      const hills = el("g", {}, root);
      cut(hills, "M-30 330 V236 Q60 168 150 222 Q205 256 236 330 Z", "#fff");
      cut(hills, "M566 330 Q596 238 680 216 Q764 198 830 252 V330 Z", "#fff");
      const arch = el("g", {}, root);
      cut(arch, "M222 310 V130 Q222 44 308 44 H492 Q578 44 578 130 V310 Z", "#fff");
      /* back layer: the spoilers card, the curtain in front of it, the pelmet on top */
      const L1 = el("g", {}, root);
      const spo = el("g", {}, L1); paper(spo, 214, 106, LIL);
      mono(spo, 0, -6, "spoilers", 26);
      el("rect", { x: -62, y: 14, width: 124, height: 9, rx: 4.5, fill: "#fff", opacity: 0.85 }, spo);
      const cid = nid("clip");
      el("rect", { x: 222, y: 62, width: 356, height: 270 }, el("clipPath", { id: cid }, svg));
      const cur = el("g", {}, el("g", { "clip-path": `url(#${cid})` }, L1));
      let cd = "M-146 0 H146 V186"; for (let i = 0; i < 6; i++) cd += " q-24.33 22 -48.67 0"; cd += " Z";
      cut(cur, cd, BLUE);
      [-97, -49, 0, 49, 97].forEach((x) => { el("path", { d: `M${x} 10 V182`, stroke: NAVY, "stroke-width": 2, opacity: 0.45, "stroke-linecap": "round" }, cur); el("path", { d: `M${x + 8} 12 V176`, stroke: "#fff", "stroke-width": 3, opacity: 0.4, "stroke-linecap": "round" }, cur); });
      const pel = el("g", {}, L1); paper(pel, 336, 36, BLUE, 10); tf(pel, 400, 60);
      [232, 568].forEach((x) => el("circle", { cx: x, cy: 60, r: 10, fill: YEL, stroke: INK, "stroke-width": 2.5 }, L1));
      cut(root, rrp(-30, 322, 860, 26, 8), "#fff");
      /* the ticket */
      const tick = el("g", {}, root), tin = el("g", {}, tick);
      const tp = cut(tin, "M-88 -31 H88 Q94 -31 94 -25 V-9 A9 9 0 0 0 94 9 V25 Q94 31 88 31 H-88 Q-94 31 -94 25 V9 A9 9 0 0 0 -94 -9 V-25 Q-94 -31 -88 -31 Z", YEL);
      el("path", { d: "M-60 -26 V26", stroke: INK, "stroke-width": 2, "stroke-dasharray": "2 6", "stroke-linecap": "round" }, tin);
      el("path", { d: "M-83 0 l5 5 l9 -11", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tin);
      mono(tin, 15, 6, "Finished story", 15.5);
      ring(tin, -108, -45, 216, 90, 16);
      const th = hov(tick, api);
      /* front layer: channel cards and the modlog */
      const chan = (label, fill) => { const g = el("g", {}, root); paper(g, 190, 120, fill); mono(g, 0, -10, label, 26); el("rect", { x: -60, y: 12, width: 120, height: 9, rx: 4.5, fill: "#fff", opacity: 0.85 }, g); el("rect", { x: -60, y: 29, width: 78, height: 9, rx: 4.5, fill: "#fff", opacity: 0.85 }, g); return g; };
      const photos = chan("photos", AQUA), general = chan("general", SKY), lfg = chan("lfg", MINT);
      const mod = el("g", {}, root); paper(mod, 500, 108, "#fff");
      mono(mod, -218, 7, "modlog", 21, { "text-anchor": "start" });
      el("rect", { x: -96, y: -29, width: 136, height: 58, rx: 10, fill: SOFT, stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "5 6" }, mod);
      const aim = el("path", { d: "", stroke: NAVY, "stroke-width": 3, "stroke-dasharray": "2 10", "stroke-linecap": "round", fill: "none" }, root);
      const aimDot = el("circle", { r: 5, fill: NAVY }, root);
      const tag = el("g", {}, root);
      el("path", { d: "M-44 0 Q-60 -14 -70 4", stroke: INK, "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, tag);
      cut(tag, "M-36 -18 H50 Q56 -18 56 -12 V12 Q56 18 50 18 H-36 L-54 0 Z", "#fff");
      el("circle", { cx: -38, cy: 0, r: 4, fill: SOFT, stroke: INK, "stroke-width": 2 }, tag);
      mono(tag, 10, 7, "ending", 19);
      const pin = el("g", {}, tag); el("circle", { r: 7, fill: AQUA, stroke: INK, "stroke-width": 2.5 }, pin); el("circle", { cx: -2, cy: -2, r: 2, fill: "#fff" }, pin);
      const blocked = stamp(root, 544, 503, 152, 52, "Blocked", LIL, -6, 19);
      let user = null, prev = 0, skip = false, last = 0;
      button(tick, "Finished story: lift the curtain", () => { user = { from: last, to: last > 0.5 ? 0 : 1, at: api.now() }; skip = true; api.seek(9); });
      return (t, now) => {
        if (t < prev && !skip) user = null; skip = false; prev = t;
        root.setAttribute("opacity", fade(t, 13.5));
        tf(hills, sway(now, 0, 2), 70 * (1 - io(seg(t, 0.3, 2.3))));
        tf(arch, sway(now, 1, 3), 120 * (1 - io(seg(t, 0.3, 2.0))));
        tf(L1, sway(now, 2, 4), 170 * (1 - oc(seg(t, 0.3, 1.7))));
        const j = blocked(t - 4.4);
        const a = oc(seg(t, 0.35, 1.25)), b = oc(seg(t, 0.45, 1.55)), c = ob(seg(t, 0.6, 1.4));
        tf(general, 400 - 250 * a + sway(now, 3, 5), 338 + 7 * a - 9 * Math.sin(Math.PI * seg(t, 4.85, 5.25)), 1, -8 + 6 * a);
        tf(photos, 400 + 250 * b + sway(now, 3, 5), 350 - 5 * b, 1, 7 - 5 * b);
        tf(lfg, 400 + sway(now, 3, 5), 318 + 27 * c, 1, 0.6 * jit(now, 4));
        tf(mod, 400 + sway(now, 5, 6), 505 + 200 * (1 - ob(seg(t, 0.9, 1.65))) + j * 5);
        /* the word drifts toward general, then gets pinned */
        const dr = seg(t, 2.2, 4.62), de = 1 - Math.pow(1 - dr, 2), pk = ob(seg(t, 4.62, 5.0));
        const tx = 880 - 448 * de - 62 * pk + sway(now, 5, 6) * cl(pk), ty = 585 - 117 * de + Math.sin(dr * 10) * 9 * (1 - dr) + 37 * pk;
        tf(tag, tx, ty, 1, (-10 + Math.sin(dr * 8) * 6) * (1 - cl(pk)));
        tag.setAttribute("opacity", seg(t, 2.2, 2.4));
        const ao = seg(t, 2.7, 3.3) * (1 - seg(t, 4.6, 4.8));
        aim.setAttribute("d", `M${tx - 66} ${ty - 8} Q${(tx + 120) / 2} ${ty - 70} 196 414`); aim.setAttribute("opacity", ao);
        aimDot.setAttribute("cx", 196); aimDot.setAttribute("cy", 414); aimDot.setAttribute("opacity", ao);
        const pp = seg(t, 4.75, 5.05); tf(pin, -14, -18 - 34 * (1 - oc(pp)), cl(ob(pp), 0, 1.3)); pin.setAttribute("opacity", pp > 0 ? 1 : 0);
        /* the ticket and the curtain */
        const hk = frozen ? 0 : th.k(now), ua = user ? now - user.at : 9;
        const press = Math.sin(Math.PI * seg(t, 6.4, 6.7)) + Math.sin(Math.PI * cl(ua / 0.3));
        const wob = Math.sin(seg(t, 5.8, 6.4) * Math.PI * 4) * 5 * Math.sin(Math.PI * seg(t, 5.8, 6.4));
        tf(tick, 672 + sway(now, 6, 3), 150 - 4 * hk, cl(ob(seg(t, 1.5, 2.05)), 0, 1.2), 5 + wob + 1.2 * jit(now, 9));
        tin.setAttribute("transform", `scale(${1 - 0.09 * press + 0.04 * hk})`); lift(tp, hk);
        let lf = io(seg(t, 6.6, 7.7)) + 0.045 * Math.sin(Math.PI * seg(t, 7.7, 8.2));
        if (user) { const k = io(cl(ua / 0.9)); lf = user.from + (user.to - user.from) * k + 0.045 * Math.sin(Math.PI * cl((ua - 0.9) / 0.5)) * (user.to ? 1 : -1) * (user.to === user.from ? 0 : 1); }
        last = cl(lf);
        tf(cur, 400, 62 - 168 * lf);
        tf(spo, 400, 180, 1 + 0.07 * Math.sin(Math.PI * (user ? cl((ua - 0.7) / 0.45) * user.to : seg(t, 7.5, 8.0))), user ? 0 : -3 * Math.sin(Math.PI * seg(t, 7.5, 8.0)));
      };
    },
  };

  /* ---- 2. a banner frame with sliding paper hills; a larger sheet drops in and is resized ---- */
  SC.banner = {
    dur: 14, still: 9.5,
    build(svg, api) {
      const root = stage(svg), FX = 40, FY = 150, FW = 560, FH = 315, GY = 542;
      const legs = el("g", {}, root);
      [150, 476].forEach((x) => el("rect", { x, y: 468, width: 14, height: 90, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, legs));
      const stick = el("g", {}, root); el("rect", { x: 693, y: 300, width: 14, height: 258, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, stick);
      cut(root, "M-30 552 Q200 522 420 540 T830 528 V640 H-30 Z", "#fff");
      const fr = el("g", {}, root);
      const tabA = el("g", {}, fr); paper(tabA, 156, 48, YEL, 10); mono(tabA, 0, 2, "960 x 540", 17);
      const tabB = el("g", {}, fr); paper(tabB, 96, 48, SKY, 10); mono(tabB, 0, 2, "16:9", 17);
      const mat = cut(fr, rrp(FX - 4, FY - 4, FW + 8, FH + 8, 10), "#fff");
      const cid = nid("clip");
      el("rect", { x: FX, y: FY, width: FW, height: FH, rx: 6 }, el("clipPath", { id: cid }, svg));
      const view = el("g", { transform: `translate(${FX} ${FY})` }, el("g", { "clip-path": `url(#${cid})` }, fr));
      el("rect", { x: 0, y: 0, width: FW, height: FH, fill: "#fff" }, view);
      const hill = (d, fill) => { const g = el("g", {}, view); el("path", { d, fill: NAVY, opacity: 0.16, transform: "translate(0 -6)" }, g); el("path", { d, fill, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g); return g; };
      const cloud = (s) => { const g = el("g", {}, view), d = "M-40 12 a14 14 0 0 1 4 -27 a20 20 0 0 1 38 -6 a16 16 0 0 1 30 12 a11 11 0 0 1 -4 21 Z"; const c = el("g", { transform: `scale(${s})` }, g); el("path", { d, fill: LIL, opacity: 0.5, transform: "translate(4 6)" }, c); el("path", { d, fill: "#fff", stroke: INK, "stroke-width": 2.5 / s, "stroke-linejoin": "round" }, c); return g; };
      const sun = el("circle", { r: 32, fill: YEL, stroke: INK, "stroke-width": 2.5 }, view);
      const far = hill("M-160 330 V200 Q-20 120 120 190 T380 170 T720 200 V330 Z", SKY);
      const c2 = cloud(0.8);
      const mid = hill("M-160 330 V240 Q0 170 160 235 T440 225 T720 250 V330 Z", LIL);
      const c1 = cloud(1.1);
      const near = hill("M-160 330 V280 Q40 235 220 275 T520 268 T720 285 V330 Z", MINT);
      el("rect", { x: FX, y: FY, width: FW, height: FH, rx: 6, fill: "none", stroke: INK, "stroke-width": 2.5 }, fr);
      ring(fr, FX - 20, FY - 20, FW + 40, FH + 40, 20);
      const fh = hov(fr, api);
      /* the larger sheet: the owner's own plain art */
      const sheet = el("g", { "pointer-events": "none", opacity: 0 }, root);
      el("rect", { x: -274, y: -148, width: 560, height: 315, rx: 6, fill: LIL, opacity: 0.5 }, sheet);
      el("rect", { x: -280, y: -157.5, width: 560, height: 315, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sheet);
      const sid = nid("clip");
      el("rect", { x: -278.5, y: -156, width: 557, height: 312, rx: 5 }, el("clipPath", { id: sid }, svg));
      const art = el("g", { "clip-path": `url(#${sid})` }, sheet);
      el("circle", { cx: 150, cy: -42, r: 44, fill: YEL, stroke: INK, "stroke-width": 2.5 }, art);
      el("path", { d: "M-300 170 V70 Q-150 -40 10 70 T300 40 V170 Z", fill: AQUA, stroke: INK, "stroke-width": 2.5 }, art);
      el("path", { d: "M-300 170 V118 Q-110 50 70 118 T300 100 V170 Z", fill: BLUE, stroke: INK, "stroke-width": 2.5 }, art);
      [[-150, -42, 1.25], [10, -84, 0.85]].forEach(([x, y, k]) => { const c = el("g", { transform: `translate(${x} ${y}) scale(${k})` }, art), d = "M-40 12 a14 14 0 0 1 4 -27 a20 20 0 0 1 38 -6 a16 16 0 0 1 30 12 a11 11 0 0 1 -4 21 Z"; el("path", { d, fill: LIL, opacity: 0.5, transform: "translate(4 6)" }, c); el("path", { d, fill: "#fff", stroke: INK, "stroke-width": 2.5 / k, "stroke-linejoin": "round" }, c); });
      el("rect", { x: -264, y: 104, width: 156, height: 36, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, sheet);
      mono(sheet, -186, 128, "1920 x 1080", 17);
      /* the safe strip across the top */
      const strip = el("g", { "pointer-events": "none" }, root), sbar = el("g", {}, strip);
      el("rect", { x: 1.5, y: 1.5, width: FW - 3, height: 30, rx: 4, fill: "#fff", opacity: 0.94 }, sbar);
      el("path", { d: `M2 32 H${FW - 2}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "7 6" }, sbar);
      const slab = mono(strip, FW / 2, 22, "Top 48px simple", 16);
      /* the tag, the icon, the stamp */
      const tag = el("g", { "pointer-events": "none" }, root);
      el("path", { d: "M0 -19 V-200", stroke: INK, "stroke-width": 2 }, tag);
      paper(tag, 204, 44, MINT, 15); el("circle", { cx: 0, cy: -19, r: 4, fill: "#fff", stroke: INK, "stroke-width": 2 }, tag);
      mono(tag, 0, 7, "Resized for you", 16);
      const icon = el("g", {}, root);
      cut(icon, "M-55 0 a55 55 0 1 0 110 0 a55 55 0 1 0 -110 0 Z", LIL);
      mono(icon, 0, 6, "128 x 128", 16);
      const own = stamp(root, 474, 410, 178, 52, "Your own art", YEL, -7, 18);
      button(fr, "Drop in a larger sheet, 1920 x 1080", () => api.seek(4.9));
      return (t, now) => {
        root.setAttribute("opacity", fade(t, 14));
        const pop = (k) => `translate(0 ${GY}) scale(1 ${Math.max(0.001, k)}) translate(0 ${-GY})`;
        const k1 = ob(seg(t, 0.35, 1.1)), k2 = ob(seg(t, 1.1, 1.75)), hk = frozen ? 0 : fh.k(now);
        const pr = 1 - 0.02 * Math.sin(Math.PI * seg(t, 4.9, 5.25)) + 0.008 * hk;
        legs.setAttribute("transform", pop(k1));
        fr.setAttribute("transform", `${pop(k1)} translate(320 307) scale(${pr}) translate(-320 -307)`); lift(mat, hk);
        tf(tabA, 126, 127 + 50 * (1 - ob(seg(t, 1.0, 1.5))), 1, -2);
        tf(tabB, 536, 127 + 50 * (1 - ob(seg(t, 1.12, 1.62))), 1, 2);
        stick.setAttribute("transform", pop(k2)); icon.setAttribute("transform", `${pop(k2)} translate(700 250) rotate(${-14 * (1 - cl(k2)) + 1.5 * jit(now, 2)})`);
        /* hills and clouds slide at their own speeds */
        tf(far, 60 * (1 - oc(seg(t, 0.5, 5.0))) + sway(now, 0, 3), 0);
        tf(mid, -95 * (1 - oc(seg(t, 0.5, 3.9))) + sway(now, 1, 6), 0);
        tf(near, 135 * (1 - oc(seg(t, 0.5, 2.9))) + sway(now, 2, 10), 0);
        tf(c1, 128 + 190 * (1 - oc(seg(t, 0.5, 4.5))) + sway(now, 3, 9), 96);
        tf(c2, 392 - 170 * (1 - oc(seg(t, 0.5, 5.0))) + sway(now, 4, 5), 78);
        tf(sun, 462, 150 + 90 * (1 - ob(seg(t, 1.5, 2.3))));
        /* the sheet drops in large, then shrinks to fit */
        const dy = -560 * (1 - oc(seg(t, 5.2, 5.85))) - 10 * Math.sin(Math.PI * seg(t, 5.85, 6.15));
        const b = io(seg(t, 6.4, 7.3)), s = 1.42 - 0.42 * b - 0.03 * Math.sin(Math.PI * seg(t, 7.3, 7.7));
        tf(sheet, 400 - 80 * b, 300 + 7.5 * b + dy, s, -4 * (1 - b));
        sheet.setAttribute("opacity", seg(t, 5.2, 5.3));
        const so = t < 6.5 ? 1 - seg(t, 5.2, 5.4) : seg(t, 7.4, 7.6);
        tf(strip, FX, FY - (t < 6.5 ? 0 : 8 * (1 - ob(seg(t, 7.4, 7.8)))));
        sbar.setAttribute("transform", `scale(${Math.max(0.001, oc(seg(t, 1.7, 2.4)))} 1)`); strip.setAttribute("opacity", so * seg(t, 1.7, 1.8));
        slab.setAttribute("opacity", seg(t, 2.2, 2.5));
        const tu = t - 7.6, tk = seg(t, 7.6, 8.1);
        tag.setAttribute("transform", `rotate(${tu > 0 ? Math.sin(tu * 9) * Math.exp(-tu * 3.2) * 7 : 0} 330 -60) translate(330 ${122 - 190 * (1 - ob(tk))})`);
        own(t - 8.35);
      };
    },
  };

  /* ---- 3. four drafts slide onto the desk, get approved, and one goes into the webhook tube ---- */
  SC.drafts = {
    dur: 14, still: 9.5,
    build(svg, api) {
      const root = stage(svg);
      const X = [130, 310, 490, 670], COL = [SKY, MINT, YEL, AQUA], ROT = [-2, 1.5, -1, 2];
      const F = ["Weekly news", "Welcome", "Events", "Mod report"], A = ["News writer", "Greeter", "Event planner", "Mod reporter"];
      const S = [1.2, 1.32, 1.26, 1.4], E = [2.2, 2.85, 2.5, 3.2];
      const back = el("g", {}, root);
      const heads = X.map((x, i) => { const g = el("g", {}, back); face(g, 0, 0, 19, COL[i]); return g; });
      const wall = el("g", {}, back); cut(wall, rrp(36, 56, 728, 86, 14), LIL);
      X.forEach((x) => el("rect", { x: x - 58, y: 68, width: 116, height: 62, rx: 8, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, wall));
      const desk = el("g", {}, root);
      cut(desk, rrp(36, 196, 728, 190, 16), "#fff");
      cut(desk, rrp(36, 394, 728, 20, 8), BLUE, false);
      X.forEach((x) => el("rect", { x: x - 68, y: 212, width: 136, height: 146, rx: 12, fill: SOFT, opacity: 0.7, stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "5 7" }, desk));
      const plate = el("g", {}, desk); paper(plate, 104, 46, YEL, 10); mono(plate, 0, 7, "You", 21); tf(plate, 400, 404);
      const tube = el("g", {}, root);
      el("ellipse", { cx: 130, cy: 478, rx: 96, ry: 17, fill: INK }, tube);
      el("ellipse", { cx: 130, cy: 478, rx: 92, ry: 13.5, fill: LIL, stroke: "#fff", "stroke-width": 3 }, tube);
      const cardsL = el("g", {}, root);
      const tubeF = el("g", {}, root);
      cut(tubeF, "M38 478 A92 14 0 0 0 222 478 V502 H840 V566 H62 Q38 566 38 542 Z", SKY);
      [252, 276].forEach((x) => el("path", { d: `M${x} 508 V560`, stroke: INK, "stroke-width": 2, opacity: 0.55 }, tubeF));
      el("path", { d: "M300 512 H690", stroke: "#fff", "stroke-width": 5, opacity: 0.6, "stroke-linecap": "round" }, tubeF);
      const chev = [712, 738, 764].map((x) => el("path", { d: `M${x - 5} 525 l9 9 l-9 9`, stroke: INK, "stroke-width": 3.5, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tubeF));
      const chip = el("g", {}, tubeF); paper(chip, 308, 44, "#fff", 12); mono(chip, 0, 6, "Webhook set up by the owner", 16);
      const cards = X.map((x, i) => {
        const g = el("g", {}, cardsL), fl = el("g", {}, g), fr = el("g", {}, fl), bk = el("g", { opacity: 0 }, fl);
        const pf = paper(fr, 150, 160, "#fff");
        el("rect", { x: -64.5, y: -69.5, width: 129, height: 38, rx: 6, fill: COL[i] }, fr);
        mono(fr, 0, -44.5, F[i], 16);
        el("rect", { x: -56, y: -22, width: 112, height: 8, rx: 4, fill: SOFT }, fr);
        el("rect", { x: -56, y: 48, width: 72, height: 8, rx: 4, fill: SOFT }, fr); el("rect", { x: -56, y: 62, width: 100, height: 8, rx: 4, fill: SOFT }, fr);
        const st = stamp(fr, 4, 16, 116, 38, "Approved", MINT, -8, 16);
        const pb = paper(bk, 150, 160, COL[i]);
        el("path", { d: "M-34 22 Q-34 -8 0 -8 Q34 -8 34 22 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, bk);
        face(bk, 0, -30, 21, "#fff");
        mono(bk, 0, 52, A[i], 16);
        ring(g, -84, -89, 168, 178, 18);
        const fs = { on: false, at: -9 }, h = hov(g, api);
        button(g, `${F[i]}, drafted by ${A[i]}`, () => { fs.on = !fs.on; fs.at = api.now(); skip = true; api.seek(9.5); });
        return { g, fl, fr, bk, pf, pb, st, fs, h };
      });
      let prev = 0, skip = false;
      return (t, now) => {
        if (t < prev && !skip) cards.forEach((c) => { c.fs.on = false; c.fs.at = -9; }); skip = false; prev = t;
        root.setAttribute("opacity", fade(t, 14));
        tf(back, sway(now, 0, 3), 150 * (1 - oc(seg(t, 0.25, 1.0))));
        heads.forEach((g, i) => tf(g, X[i], 34 + 44 * (1 - ob(seg(t, 0.75 + i * 0.09, 1.2 + i * 0.09))) + 1.4 * jit(now, i), 1, 5 * jit(now, i + 7)));
        tf(desk, sway(now, 2, 1.5), 460 * (1 - ob(seg(t, 0.35, 1.15)) * 1) * (t < 1.15 ? 1 : 0));
        const tk = 180 * (1 - ob(seg(t, 0.8, 1.5))) * (t < 1.5 ? 1 : 0), gulp = 4 * Math.sin(Math.PI * seg(t, 6.6, 6.95));
        tf(tube, 0, tk + gulp); tf(tubeF, 0, tk + gulp);
        cards.forEach((c, i) => {
          const k = seg(t, S[i], E[i]), p = oc(k), j = c.st(t - (3.5 + 0.38 * i));
          let x = X[i] + sway(now, 2, 1.5) * p, y = 98 + 187 * p + j * 4, s = 0.36 + 0.64 * p + 0.07 * Math.sin(Math.PI * k), r = ROT[i] * p + j * 1.5;
          if (k <= 0) s = 0.36 * cl(ob(seg(t, 0.95 + i * 0.08, 1.2 + i * 0.08)), 0, 1.2);
          if (i === 0) { const a = oc(seg(t, 5.7, 6.05)), d = io(seg(t, 6.05, 6.7)); y += -18 * a * (1 - d) + 147 * d - 6 * Math.sin(Math.PI * seg(t, 6.7, 7.0)); r = r * (1 - d) - 5 * a * (1 - d); x = X[0] + (x - X[0]) * (1 - d); }
          const hk = frozen ? 0 : c.h.k(now), fv = frozen ? 0 : (() => { const v = io(cl((now - c.fs.at) / 0.5)); return c.fs.on ? v : 1 - v; })();
          tf(c.g, x, y - 6 * hk * cl(p) - 12 * Math.sin(Math.PI * fv), s * (1 + 0.03 * hk), r);
          c.g.setAttribute("opacity", seg(t, 0.95 + i * 0.08, 1.05 + i * 0.08));
          c.fl.setAttribute("transform", `scale(${Math.max(0.02, Math.abs(Math.cos(Math.PI * fv)))} 1)`);
          c.fr.setAttribute("opacity", fv > 0.5 ? 0 : 1); c.bk.setAttribute("opacity", fv > 0.5 ? 1 : 0);
          lift(c.pf, hk); lift(c.pb, hk);
        });
        const ck = seg(t, 7.15, 7.6); tf(chip, 520, 536, cl(ob(ck), 0, 1.2), -3 * (1 - cl(ob(ck)))); chip.setAttribute("opacity", seg(t, 7.15, 7.25));
        chev.forEach((n, i) => n.setAttribute("opacity", t < 6.7 ? 0.25 : 0.3 + 0.7 * Math.max(0, Math.sin(t * 4.2 - i * 0.9 + 1.2))));
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 800, h: 450, dur: 8, still: 4,
    build(svg) {
      const root = stage(svg, 800, 450);
      const disc = el("g", {}, root); cut(disc, "M-150 0 a150 150 0 1 0 300 0 a150 150 0 1 0 -300 0 Z", "#fff");
      const pill = el("g", {}, root); paper(pill, 122, 46, YEL, 16); mono(pill, 0, 7, "Guides", 19);
      const chk = mono(root, 752, 54, "Checked 19 Nov 2026", 16, { "text-anchor": "end", fill: MUTE });
      const t1 = txt(root, 46, 188, "GTA 6 Discord", { "font-size": 54, "font-weight": 700 });
      const t2 = txt(root, 46, 250, "server", { "font-size": 54, "font-weight": 700 });
      const ul = el("path", { d: "M50 276 H50", stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, root);
      const s1 = txt(root, 46, 326, "Start, grow and moderate one", { "font-size": 22, "font-weight": 500, fill: MUTE });
      const s2 = txt(root, 46, 356, "with AI agents", { "font-size": 22, "font-weight": 500, fill: MUTE });
      const card = (label, fill) => { const g = el("g", {}, root); paper(g, 226, 124, fill, 14); mono(g, 0, -14, label, 27); el("rect", { x: -74, y: 10, width: 148, height: 9, rx: 4.5, fill: "#fff", opacity: 0.85 }, g); el("rect", { x: -74, y: 28, width: 96, height: 9, rx: 4.5, fill: "#fff", opacity: 0.85 }, g); return g; };
      const cs = [[card("general", SKY), 598, 150, -6, 0.4], [card("spoilers", LIL), 652, 238, 4, 0.7], [card("events", YEL), 606, 330, -3, 1]];
      return (t, now) => {
        root.setAttribute("opacity", fade(t, 8));
        const rise = (n, a, dy = 26) => { const k = oc(seg(t, a, a + 0.6)); n.setAttribute("opacity", k); n.setAttribute("transform", `translate(0 ${dy * (1 - k)})`); };
        tf(pill, 107, 56, cl(ob(seg(t, 0.15, 0.6)), 0, 1.2), -3);
        rise(t1, 0.3); rise(t2, 0.42); rise(s1, 1.05, 14); rise(s2, 1.15, 14);
        chk.setAttribute("opacity", seg(t, 1.2, 1.6));
        ul.setAttribute("d", `M50 276 H${50 + 150 * oc(seg(t, 0.9, 1.4))}`); ul.setAttribute("opacity", t > 0.9 ? 1 : 0);
        tf(disc, 622 + sway(now, 0, 2), 246, cl(ob(seg(t, 0.5, 1.2)), 0, 1.2));
        cs.forEach(([g, x, y, r, d], i) => { const a = 1.5 + i * 0.4, k = seg(t, a, a + 0.6), o = ob(k); tf(g, x + sway(now, i, 7 * d) + 40 * d * (1 - oc(k)), y + 70 * (1 - o) + sway(now, i + 3, 3 * d), 0.6 + 0.4 * cl(o, 0, 1.15), r + 10 * (1 - o) + 0.8 * jit(now, i)); g.setAttribute("opacity", seg(t, a, a + 0.12)); });
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
