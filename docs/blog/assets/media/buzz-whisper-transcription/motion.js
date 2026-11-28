/* Bright coded scenes for "Buzz: free, offline Whisper transcription for a long recording". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88", WHITE = "#fff";
  const SANS = '"Space Grotesk", system-ui, sans-serif', MONO = '"JetBrains Mono", ui-monospace, monospace';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const mono = (p, x, y, s, size, a = {}) => txt(p, x, y, s, Object.assign({ "font-family": MONO, "font-size": size, "font-weight": 700, "text-anchor": "middle" }, a));
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  // scale and rotate n about (cx, cy), then shift it by dx, dy
  const about = (n, cx, cy, s = 1, dx = 0, dy = 0, r = 0) => n.setAttribute("transform", `translate(${cx + dx} ${cy + dy}) rotate(${r}) scale(${s}) translate(${-cx} ${-cy})`);
  const show = (n, o) => n.setAttribute("opacity", cl(o));
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  // a card with a soft lilac offset shadow and a crisp ink outline
  const card = (p, x, y, w, h, rx, fill, off = 14) => { if (off) el("rect", { x: x + off, y: y + off, width: w, height: h, rx, fill: LIL }, p); return el("rect", { x, y, width: w, height: h, rx, fill, stroke: INK, "stroke-width": 3 }, p); };
  const hint = (svg, s) => txt(svg, 80, 96, s, { "font-family": MONO, "font-size": 26, "font-weight": 500, fill: MUTE });
  const pad = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: WHITE, "fill-opacity": 0 }, g);
  const ring = (g, x, y, w, h, rx) => el("rect", { x, y, width: w, height: h, rx, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 10", "stroke-linecap": "round", class: "mg-ring" }, g);
  let uid = 0; // a counter for SVG ids, so ids are the same on every load
  const blink = (b) => (b <= 0 || b >= 1 ? 1 : 1 - 0.8 * (0.5 - 0.5 * Math.cos(Math.PI * 4 * b)));

  const SC = {};

  /* ---- 1. a cassette plays its tape onto a page of text ---- */
  SC.cassette = {
    w: 1600, h: 1200, dur: 9, still: 9, rest: 7,
    build(svg, api) {
      const hn = hint(svg, "tap the cassette");
      const D = "M350 676 C350 1010 760 1060 846 820 C900 668 868 360 968 323";
      const tapeO = el("path", { d: D, stroke: INK, "stroke-width": 32, fill: "none" }, svg);
      const tapeI = el("path", { d: D, stroke: LIL, "stroke-width": 25, fill: "none" }, svg);
      const L = tapeO.getTotalLength();
      [tapeO, tapeI].forEach((p) => p.setAttribute("stroke-dasharray", `${L} ${L + 20}`));
      const cas = el("g", {}, svg); pad(cas, 56, 316, 604, 414, 44);
      const ci = el("g", {}, cas);
      card(ci, 80, 340, 540, 350, 30, YEL, 16);
      [[114, 374], [586, 374], [114, 656], [586, 656]].forEach(([x, y]) => { el("circle", { cx: x, cy: y, r: 9, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, ci); el("path", { d: `M${x - 4} ${y - 4} L${x + 4} ${y + 4}`, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, ci); });
      el("rect", { x: 130, y: 382, width: 440, height: 220, rx: 18, fill: SOFT, stroke: INK, "stroke-width": 3 }, ci);
      txt(ci, 350, 450, "Buzz", { "text-anchor": "middle", "font-size": 56, "font-weight": 700 });
      el("rect", { x: 175, y: 474, width: 350, height: 108, rx: 54, fill: WHITE, stroke: INK, "stroke-width": 3 }, ci);
      const packL = el("circle", { cx: 262, cy: 528, r: 48, fill: LIL, stroke: INK, "stroke-width": 2.5 }, ci);
      el("circle", { cx: 438, cy: 528, r: 32, fill: LIL, stroke: INK, "stroke-width": 2.5 }, ci);
      const reels = [262, 438].map((x) => {
        const g = el("g", {}, ci);
        el("circle", { r: 25, fill: BLUE, stroke: INK, "stroke-width": 3 }, g);
        [0, 120, 240].forEach((a) => el("rect", { x: -4.5, y: -23, width: 9, height: 12, rx: 3, fill: WHITE, stroke: INK, "stroke-width": 2, transform: `rotate(${a})` }, g));
        el("circle", { r: 9, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, g);
        return { g, x };
      });
      el("path", { d: "M196 690 L226 628 H474 L504 690", fill: SOFT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, ci);
      [286, 414].forEach((x) => el("circle", { cx: x, cy: 662, r: 10, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, ci));
      [330, 356].forEach((x) => el("rect", { x, y: 652, width: 14, height: 14, rx: 3, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, ci));
      ring(cas, 56, 316, 604, 414, 44);
      button(cas, "Cassette: rewind the tape and play it again", () => api.rewind(0.9, 1.3));
      const pg = el("g", {}, svg);
      card(pg, 940, 250, 330, 600, 22, SOFT, 16);
      const lines = [250, 220, 245, 180, 250, 205, 235, 140].map((w, i) => ({ w, n: el("rect", { x: 976, y: 310 + i * 66, width: 0, height: 26, rx: 13, fill: SKY, stroke: INK, "stroke-width": 2.5 }, pg) }));
      const tag = el("g", {}, svg), ti = el("g", {}, tag);
      const halo = el("rect", { x: 1304, y: 500, width: 236, height: 92, rx: 24, fill: "none", stroke: MINT, "stroke-width": 8, opacity: 0 }, ti);
      card(ti, 1304, 500, 236, 92, 24, WHITE, 10);
      const lit = el("rect", { x: 1304, y: 500, width: 236, height: 92, rx: 24, fill: MINT, stroke: INK, "stroke-width": 3, opacity: 0 }, ti);
      el("circle", { cx: 1338, cy: 546, r: 10, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, ti);
      el("path", { d: "M1270 516 C1296 516 1316 534 1338 546", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, ti);
      const word = mono(ti, 1446, 558, "offline", 34, { fill: MUTE });
      return (t) => {
        about(ci, 350, 515, 0.86 + 0.14 * ob(seg(t, 0, 0.7))); show(ci, oc(seg(t, 0, 0.3)));
        const p = oc(seg(t, 0.12, 0.8)); show(pg, p); tf(pg, 70 * (1 - p), 0);
        const q = oc(seg(t, 0.24, 0.9)); show(tag, q); tf(tag, 70 * (1 - q), 0);
        show(hn, oc(seg(t, 0.36, 0.9)));
        const rot = 1700 * io(seg(t, 0.8, 5.6));
        reels.forEach((r) => tf(r.g, r.x, 528, 1, rot));
        const u = io(seg(t, 1.0, 4.0));
        tapeI.setAttribute("stroke-dashoffset", L * (1 - u)); tapeO.setAttribute("stroke-dashoffset", Math.max(0, L * (1 - u) - 4));
        show(tapeI, u > 0 ? 1 : 0); show(tapeO, u > 0 ? 1 : 0);
        packL.setAttribute("r", 48 - 16 * io(seg(t, 1.0, 5.2)));
        lines.forEach((l, i) => { const k = oc(seg(t, 3.9 + i * 0.12, 4.4 + i * 0.12)); l.n.setAttribute("width", l.w * k); show(l.n, k > 0 ? 1 : 0); });
        const lk = seg(t, 5.7, 6.05);
        show(lit, lk >= 0.35 ? 1 : 0); about(ti, 1338, 546, 1 + 0.1 * Math.sin(Math.PI * lk));
        const hk = seg(t, 5.82, 6.7); show(halo, hk > 0 && hk < 1 ? 1 : 0); halo.setAttribute("stroke-width", 10 * (1 - hk)); about(halo, 1422, 546, 1 + 0.32 * oc(hk));
        word.setAttribute("fill", lk >= 0.35 ? INK : MUTE); about(word, 1446, 546, 1, 0, -18 * Math.sin(Math.PI * seg(t, 5.95, 6.4)));
      };
    },
  };

  /* ---- 2. a typewriter types the transcript onto a sheet ---- */
  SC.typewriter = {
    w: 1600, h: 1200, dur: 9, still: 9,
    build(svg, api) {
      const LW = [380, 330, 360, 300, 370, 230], T0 = (i) => 2.2 + i * 0.62, N = LW.map((w) => Math.round(w / 26));
      const hn = hint(svg, "tap the typewriter");
      const tw = el("g", {}, svg); pad(tw, 270, 232, 1060, 740, 44);
      const rise = el("g", {}, tw);
      const sheet = (p) => {
        const g = el("g", {}, p);
        el("rect", { x: 560, y: 250, width: 480, height: 360, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        return { g, ls: LW.map((w, i) => el("rect", { x: 604, y: 300 + i * 42, width: 0, height: 20, rx: 10, fill: LIL, stroke: INK, "stroke-width": 2.5 }, g)) };
      };
      const old = sheet(rise); show(old.g, 0);
      const car = el("g", {}, rise);
      const cur = sheet(car);
      el("rect", { x: 330, y: 560, width: 940, height: 64, rx: 32, fill: BLUE, stroke: INK, "stroke-width": 3 }, car);
      const knobs = [318, 1282].map((x) => {
        const g = el("g", {}, car);
        el("circle", { r: 36, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
        el("path", { d: "M0 -33 V-17", stroke: INK, "stroke-width": 4, "stroke-linecap": "round" }, g);
        el("circle", { r: 9, fill: YEL, stroke: INK, "stroke-width": 2.5 }, g);
        return { g, x };
      });
      const BD = "M430 620 H1170 Q1210 620 1218 660 L1270 900 Q1278 940 1238 940 H362 Q322 940 330 900 L382 660 Q390 620 430 620 Z";
      el("path", { d: BD, fill: LIL, transform: "translate(16 16)" }, rise);
      el("path", { d: BD, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, rise);
      el("rect", { x: 450, y: 640, width: 700, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, rise);
      const keys = [];
      const key = (x, y, r, c) => { const g = el("g", {}, rise); el("circle", { cx: x, cy: y + 6, r: 22, fill: LIL }, g); keys.push({ g, k: el("circle", { cx: x, cy: y, r: 22, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, g), x, y, st: 0.1 + r * 0.06 + c * 0.012 }); };
      for (let i = 0; i < 10; i++) key(503 + 66 * i, 712, 0, i);
      for (let i = 0; i < 9; i++) key(536 + 66 * i, 774, 1, i);
      [536, 602, 998, 1064].forEach((x, i) => key(x, 852, 2, i < 2 ? i : i + 5));
      const run = el("g", {}, rise);
      el("rect", { x: 700, y: 830, width: 200, height: 60, rx: 30, fill: LIL }, run);
      const runK = el("g", {}, run);
      el("rect", { x: 700, y: 822, width: 200, height: 60, rx: 30, fill: YEL, stroke: INK, "stroke-width": 3 }, runK);
      mono(runK, 800, 863, "Run", 32);
      ring(tw, 270, 232, 1060, 740, 44);
      const done = el("g", {}, svg);
      card(done, 650, 128, 300, 82, 41, MINT, 10);
      mono(done, 800, 182, "Completed", 36);
      const tg = el("g", {}, svg);
      card(tg, 712, 1000, 184, 86, 24, SKY, 10);
      el("circle", { cx: 744, cy: 1043, r: 10, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, tg);
      el("path", { d: "M744 1043 C728 1004 748 968 764 941", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round" }, tg);
      const tgW = mono(tg, 826, 1057, "TXT", 40);
      const lineW = (i, t) => LW[i] * Math.floor(seg(t, T0(i), T0(i) + 0.48) * N[i] + 1e-6) / N[i];
      const carX = (t) => {
        for (let i = 0; i < LW.length; i++) { const a = T0(i); if (t >= a && t < a + 0.62) { const p = seg(t, a, a + 0.48); return p < 1 ? (-60 * Math.floor(p * N[i])) / N[i] : -60 * (1 - io(seg(t, a + 0.48, a + 0.62))); } }
        return 0;
      };
      const roll = (t) => oc(seg(t, 0.7, 1.5));
      const tags = (t, f) => {
        const a = seg(t, 6.0, 6.45); show(done, oc(seg(t, 6.0, 6.15)) * f); about(done, 800, 210, (0.5 + 0.5 * ob(a)) * (0.6 + 0.4 * f), 0, 24 * (1 - oc(a)));
        const b = seg(t, 6.3, 6.75); show(tg, oc(seg(t, 6.3, 6.45)) * f); about(tg, 764, 941, (0.5 + 0.5 * ob(b)) * (0.6 + 0.4 * f), 0, 0, 6 * Math.sin(b * Math.PI * 2) * (1 - b));
        const w = seg(t, 6.55, 6.95); show(tgW, oc(seg(t, 6.55, 6.7))); about(tgW, 826, 1043, 1, 0, -16 * Math.sin(Math.PI * w));
      };
      let tap = null;
      button(tw, "Typewriter: roll in a fresh sheet and type it again", () => {
        if (api.calm) return;
        const t = api.t();
        tap = { now: api.now(), t, cx: carX(t), ry: 320 * (1 - roll(t)) };
        old.ls.forEach((n, i) => { const w = lineW(i, t); n.setAttribute("width", w); show(n, w > 0 ? 1 : 0); });
        api.play(0.66);
      });
      return (t, now) => {
        const s = tap ? now - tap.now : 99;
        const e = oc(seg(t, 0, 0.6)); tf(rise, 0, 60 * (1 - e)); show(rise, oc(seg(t, 0, 0.3)));
        show(hn, oc(seg(t, 0.3, 0.6)));
        let press = -1, depth = 0;
        LW.forEach((w, i) => { const p = seg(t, T0(i), T0(i) + 0.48); if (p > 0 && p < 1) { const c = Math.floor(p * N[i]); press = (i * 7 + c * 5) % keys.length; depth = 5 * (1 - (p * N[i] - c)); } });
        keys.forEach((k, j) => { about(k.g, k.x, k.y, ob(seg(t, k.st, k.st + 0.3))); k.k.setAttribute("cy", k.y + (j === press ? depth : 0)); });
        about(run, 800, 851, ob(seg(t, 0.3, 0.6)));
        tf(runK, 0, t < 1.74 ? 8 * io(seg(t, 1.6, 1.74)) : 8 * (1 - ob(seg(t, 1.74, 2.1))));
        const r = roll(t); tf(cur.g, 0, 320 * (1 - r));
        cur.ls.forEach((n, i) => { const w = lineW(i, t); n.setAttribute("width", w); show(n, w > 0 ? 1 : 0); });
        tf(car, carX(t), 0);
        let feeds = 0; LW.forEach((w, i) => { feeds += io(seg(t, T0(i) + 0.48, T0(i) + 0.62)); });
        knobs.forEach((k) => tf(k.g, k.x, 592, 1, -240 * r - 36 * feeds));
        if (s < 0.8) { const k = seg(s, 0, 0.7); old.g.setAttribute("transform", `translate(${tap.cx} ${tap.ry - 760 * k * k}) rotate(${-5 * k} 800 430)`); show(old.g, 1 - seg(s, 0.4, 0.7)); } else show(old.g, 0);
        if (s < 0.45) tags(tap.t, 1 - oc(seg(s, 0, 0.4))); else tags(t, 1);
        return s < 0.8;
      };
    },
  };

  /* ---- 3. name tags sort a transcript by speaker ---- */
  SC.nametag = {
    w: 1600, h: 1200, dur: 9.5, still: 9.5,
    build(svg, api) {
      const C = [330, 800, 1270], FILL = [YEL, SKY, MINT];
      const SPK = [0, 1, 0, 2, 1, 1, 2, 0, 2], LW = [250, 210, 190, 240, 170, 230, 200, 220, 180];
      const hn = hint(svg, "tap a tag");
      const btn = el("g", {}, svg);
      const halos = [0, 1].map(() => el("rect", { x: 560, y: 200, width: 480, height: 96, rx: 48, fill: "none", stroke: SKY, "stroke-width": 12, opacity: 0 }, btn));
      card(btn, 560, 200, 480, 96, 48, BLUE, 12);
      txt(btn, 800, 262, "Identify speakers", { "text-anchor": "middle", "font-size": 40, "font-weight": 700 });
      const rib = el("rect", { x: 100, y: 400, width: 1400, height: 34, rx: 17, fill: LIL, stroke: INK, "stroke-width": 3 }, svg);
      let tap = null;
      const chipO = [0, 0, 0];
      const tags = C.map((c, j) => {
        const g = el("g", {}, svg); pad(g, c - 178, 404, 356, 300, 34);
        const gi = el("g", {}, g);
        el("rect", { x: c - 16, y: 404, width: 32, height: 100, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, gi);
        card(gi, c - 160, 490, 320, 190, 24, SOFT, 12);
        const cid = `mg-buzz-tag-${++uid}`;
        el("rect", { x: c - 160, y: 490, width: 320, height: 190, rx: 24 }, el("clipPath", { id: cid }, el("defs", {}, gi)));
        const fill = el("rect", { x: c - 160, y: 680, width: 320, height: 0, fill: FILL[j], "clip-path": `url(#${cid})` }, gi);
        el("rect", { x: c - 160, y: 490, width: 320, height: 190, rx: 24, fill: "none", stroke: INK, "stroke-width": 3 }, gi);
        el("rect", { x: c - 30, y: 476, width: 60, height: 32, rx: 9, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, gi);
        el("rect", { x: c - 112, y: 612, width: 224, height: 36, rx: 18, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, gi);
        const chip = el("g", { opacity: 0 }, gi);
        el("rect", { x: c - 106, y: 528, width: 212, height: 54, rx: 27, fill: MINT, stroke: INK, "stroke-width": 2.5 }, chip);
        mono(chip, c, 564, "10 seconds", 26);
        ring(g, c - 178, 472, 356, 232, 34);
        button(g, `Speaker tag ${j + 1}: blink its 10 seconds chip and sort the lines again`, () => {
          const prev = tap ? tap.j : 0;
          tap = { j, prev, prevO: chipO[prev], now: api.calm ? api.now() - 99 : api.now() };
          api.poke();
        });
        return { g, gi, fill, chip, c };
      });
      const cnt = [0, 0, 0];
      const lines = SPK.map((sp, i) => { const r = cnt[sp]++; return { n: el("rect", { x: 680, y: 760, width: LW[i], height: 30, rx: 15, fill: SOFT, stroke: INK, "stroke-width": 2.5, opacity: 0 }, svg), sx: 680, sy: 760 + i * 42, tx: C[sp] - 125, ty: 780 + r * 72 }; });
      return (t, now) => {
        const s = tap ? now - tap.now : 99;
        about(btn, 800, 248, (0.7 + 0.3 * ob(seg(t, 0, 0.5))) * (1 + 0.05 * Math.sin(Math.PI * seg(t, 0.55, 0.95)))); show(btn, oc(seg(t, 0, 0.2)));
        halos.forEach((h, i) => { const k = seg(t, 0.55 + i * 0.3, 1.35 + i * 0.3); show(h, k > 0 && k < 1 ? 1 : 0); h.setAttribute("stroke-width", 12 * (1 - k)); about(h, 800, 248, 1 + 0.22 * oc(k)); });
        show(hn, oc(seg(t, 0.3, 0.8)));
        const rk = oc(seg(t, 1.0, 1.6)); rib.setAttribute("width", Math.max(34, 1400 * rk)); show(rib, rk > 0 ? 1 : 0);
        tags.forEach((T, j) => {
          const k = seg(t, 1.35 + j * 0.12, 2.15 + j * 0.12), f = seg(t, 4.6 + j * 0.4, 4.95 + j * 0.4);
          const dx = -620 * (1 - oc(k)), rot = 9 * Math.sin(k * Math.PI * 2) * (1 - k), sc = 1 + 0.07 * Math.sin(Math.PI * f);
          T.gi.setAttribute("transform", `translate(${dx} 0) rotate(${rot} ${T.c} 417) translate(${T.c} 585) scale(${sc}) translate(${-T.c} -585)`);
          show(T.g, oc(seg(t, 1.35 + j * 0.12, 1.6 + j * 0.12)));
          const fh = 190 * io(f); T.fill.setAttribute("y", 680 - fh); T.fill.setAttribute("height", fh);
          let co = 0, cs = 1;
          if (!tap) { if (j === 0) { co = oc(seg(t, 6.2, 6.35)) * blink(seg(t, 6.75, 7.55)); cs = 0.4 + 0.6 * ob(seg(t, 6.2, 6.6)); } }
          else if (j === tap.j) { const same = tap.prev === j; co = (same ? 1 : oc(seg(s, 0, 0.12))) * blink(seg(s, 0.4, 1.2)); cs = same ? 1 + 0.12 * Math.sin(Math.PI * seg(s, 0, 0.3)) : 0.4 + 0.6 * ob(seg(s, 0, 0.35)); }
          else if (j === tap.prev) { const a = oc(seg(s, 0, 0.2)); co = tap.prevO * (1 - a); cs = 1 - 0.3 * a; }
          chipO[j] = co; show(T.chip, co); about(T.chip, T.c, 555, cs);
        });
        lines.forEach((L, i) => {
          const a = oc(seg(t, 0.3 + i * 0.06, 0.65 + i * 0.06)), k = io(seg(t, 2.7 + i * 0.1, 3.5 + i * 0.1));
          let x = lerp(L.sx, L.tx, k), y = lerp(L.sy, L.ty, k) - 40 * Math.sin(Math.PI * k);
          if (s < 2.4) { const u = io(seg(s, 0, 0.55)) * (1 - io(seg(s, 0.7 + i * 0.08, 1.5 + i * 0.08))); x = lerp(x, L.sx, u); y = lerp(y, L.sy, u) - 30 * Math.sin(Math.PI * u); }
          L.n.setAttribute("x", x - 30 * (1 - a)); L.n.setAttribute("y", y); show(L.n, a);
        });
        return s < 2.4;
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 1600, h: 900, dur: 4, still: 4,
    build(svg) {
      const parts = [];
      const up = (g, at) => parts.push((t) => { const k = oc(seg(t, at, at + 0.6)); show(g, k); tf(g, 0, 28 * (1 - k)); });
      const pop = (g, at, cx, cy) => parts.push((t) => { show(g, oc(seg(t, at, at + 0.2))); about(g, cx, cy, 0.4 + 0.6 * ob(seg(t, at, at + 0.6))); });
      const chip = el("g", {}, svg);
      el("rect", { x: 110, y: 140, width: 214, height: 62, rx: 31, fill: SKY, stroke: INK, "stroke-width": 3 }, chip);
      mono(chip, 217, 182, "AI tools", 30); up(chip, 0);
      up(txt(svg, 100, 430, "Buzz", { "font-size": 230, "font-weight": 700 }), 0.1);
      const bar = el("path", { d: "M114 476 H596", stroke: YEL, "stroke-width": 18, "stroke-linecap": "round", fill: "none" }, svg);
      parts.push((t) => { const k = io(seg(t, 0.3, 0.9)); bar.setAttribute("d", `M114 476 H${114 + 482 * k}`); show(bar, k > 0 ? 1 : 0); });
      up(txt(svg, 106, 580, "Turns a recording into text", { "font-size": 54, "font-weight": 600 }), 0.35);
      up(txt(svg, 106, 650, "on your own computer", { "font-size": 54, "font-weight": 600 }), 0.45);
      up(txt(svg, 110, 750, "Checked 26 Nov 2026", { "font-family": MONO, "font-size": 26, "font-weight": 500, fill: MUTE }), 0.55);
      // small blue headphones over a lilac card
      const hp = el("g", {}, svg), hpi = el("g", { transform: "translate(1250 196)" }, hp);
      const band = "M-66 34 V6 A66 66 0 0 1 66 6 V34";
      el("path", { d: band, stroke: INK, "stroke-width": 24, fill: "none", "stroke-linecap": "round" }, hpi);
      el("path", { d: band, stroke: BLUE, "stroke-width": 17, fill: "none", "stroke-linecap": "round" }, hpi);
      [-1, 1].forEach((sd) => {
        el("rect", { x: sd < 0 ? -92 : 52, y: 4, width: 40, height: 80, rx: 18, fill: BLUE, stroke: INK, "stroke-width": 3 }, hpi);
        el("rect", { x: sd < 0 ? -54 : 40, y: 14, width: 14, height: 60, rx: 6, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, hpi);
      });
      pop(hp, 0.6, 1250, 196);
      const c1 = el("g", {}, svg); card(c1, 1010, 300, 480, 130, 26, LIL, 14); up(c1, 0.7);
      up(mono(svg, 1250, 376, "Mac, Windows and Linux", 30), 1.15);
      // small yellow cassette over a mint card
      const cs = el("g", {}, svg), csi = el("g", { transform: "translate(1250 545)" }, cs);
      el("rect", { x: -96, y: -60, width: 192, height: 120, rx: 16, fill: YEL, stroke: INK, "stroke-width": 3 }, csi);
      el("rect", { x: -74, y: -46, width: 148, height: 68, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, csi);
      el("rect", { x: -54, y: -30, width: 108, height: 38, rx: 19, fill: WHITE, stroke: INK, "stroke-width": 2.5 }, csi);
      [-30, 30].forEach((x) => { el("circle", { cx: x, cy: -11, r: 12, fill: BLUE, stroke: INK, "stroke-width": 2.5 }, csi); el("circle", { cx: x, cy: -11, r: 4.5, fill: WHITE, stroke: INK, "stroke-width": 2 }, csi); });
      el("path", { d: "M-50 60 L-40 36 H40 L50 60", fill: SOFT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, csi);
      pop(cs, 0.8, 1250, 545);
      const c2 = el("g", {}, svg); card(c2, 1010, 630, 480, 130, 26, MINT, 14); up(c2, 0.9);
      up(mono(svg, 1250, 708, "Version 1.4.5", 36), 1.3);
      return (t) => parts.forEach((f) => f(t));
    },
  };

  /* ---- player: plays once from 0 to dur when in view, holds the calm final frame, a tap replays ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let raf = 0, seen = false, started = false, run = false, paused = false, from = 0, at = 0, rw = null;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    const time = () => {
      if (calm) return sc.still;
      if (!run) return from;
      const now = clock();
      if (rw) { const k = seg(now, rw.at, rw.at + rw.d); if (k < 1) return lerp(rw.a, rw.b, io(k)); from = rw.b; at = rw.at + rw.d; rw = null; }
      return Math.min(sc.dur, from + now - at);
    };
    let draw = () => false;
    const frame = () => { const t = time(); return draw(t, clock()) || (run && (!!rw || t < sc.dur)); };
    const tick = () => { cancelAnimationFrame(raf); const more = frame(); if (seen && more && !calm) raf = requestAnimationFrame(tick); };
    const api = {
      calm, now: clock, t: time,
      play: (s) => { if (!calm) { from = s; at = clock(); rw = null; run = true; } tick(); },
      rewind: (to, d) => { if (!calm) { rw = { a: Math.min(time(), sc.rest || sc.dur), b: to, at: clock(), d }; run = true; } tick(); },
      poke: () => tick(),
    };
    draw = sc.build(svg, api);
    if (frozen) { draw(isNaN(fixed) ? sc.still : fixed, 0); return; }
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen) {
        if (!started) { started = true; api.play(0); } else { if (paused) { at = clock(); run = true; paused = false; } tick(); }
        if (!fig.dataset.sent && window.posthog) { fig.dataset.sent = 1; window.posthog.capture("blog_scene_view", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); }
      } else { cancelAnimationFrame(raf); if (run) { from = time(); rw = null; run = false; paused = true; } }
    }, { threshold: 0.25 }).observe(fig);
    svg.addEventListener("click", () => { if (!fig.dataset.hit && window.posthog) { fig.dataset.hit = 1; window.posthog.capture("blog_scene_interact", { slug: location.pathname.split("/").filter(Boolean).pop(), scene: fig.dataset.scene }); } });
    frame();
  };
  const go = () => document.querySelectorAll("figure.mg[data-scene]").forEach(mount);
  const fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 32px "Space Grotesk"'), document.fonts.load('600 32px "Space Grotesk"'), document.fonts.load('500 20px "Space Grotesk"'), document.fonts.load('700 20px "JetBrains Mono"'), document.fonts.load('500 20px "JetBrains Mono"')]).catch(() => {}) : Promise.resolve();
  const start = () => fonts.then(go, go);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
