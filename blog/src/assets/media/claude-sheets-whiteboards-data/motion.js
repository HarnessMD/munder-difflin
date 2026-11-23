/* Bright coded scenes for "Claude Sheets, Whiteboards and Data". Vanilla JS, no library.
   <figure class="mg" data-scene="NAME"> holds a still image; this script swaps in a live SVG.
   Plays only in view, honours reduced motion, "?mgstill" freezes each scene on its still frame. */
(() => {
  const NS = "http://www.w3.org/2000/svg";
  const INK = "#1A1320", YEL = "#FFCA54", BLUE = "#6C8EF5", LIL = "#B69CFF", MINT = "#7FD8AE", SKY = "#9AD8FF", SOFT = "#F1ECF9", MUTE = "#7A6A88";
  const SANS = '"Space Grotesk", system-ui, sans-serif';
  const el = (t, a = {}, p) => { const n = document.createElementNS(NS, t); for (const k in a) n.setAttribute(k, a[k]); if (p) p.appendChild(n); return n; };
  const txt = (p, x, y, s, a = {}) => { const n = el("text", Object.assign({ x, y, "font-family": SANS, "font-size": 24, "font-weight": 600, fill: INK }, a), p); n.textContent = s; return n; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const seg = (t, a, b) => cl((t - a) / (b - a));
  const oc = (x) => 1 - Math.pow(1 - x, 3);
  const ob = (x) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const lerp = (a, b, k) => a + (b - a) * k;
  const tf = (n, x, y, s = 1, r = 0) => n.setAttribute("transform", `translate(${x} ${y}) rotate(${r}) scale(${s})`);
  let uid = 0; /* counter for SVG ids */
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  /* dashed focus ring that doubles as the tap area */
  const ring = (p, a) => el("rect", Object.assign({ rx: 20, fill: "#fff", "fill-opacity": 0, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 7", class: "mg-ring" }, a), p);
  /* a thick bar with an ink outline */
  const bar = (p, d, w, fill) => {
    el("path", { d, fill: "none", stroke: INK, "stroke-width": w + 6, "stroke-linecap": "round", "stroke-linejoin": "round" }, p);
    return el("path", { d, fill: "none", stroke: fill, "stroke-width": w, "stroke-linecap": "round", "stroke-linejoin": "round" }, p);
  };
  /* with reduced motion a tap fades the part out and back in, with no movement */
  const blink = (api) => {
    let t0 = -9;
    return {
      go: () => { t0 = api.now(); const step = () => { api.redraw(); if (api.now() - t0 < 0.8) requestAnimationFrame(step); }; step(); },
      v: (now) => { const k = (now - t0) / 0.8; return k < 0 || k > 1 ? 1 : Math.abs(1 - 2 * k); },
    };
  };
  /* a tap jumps to the closing phase at f, holding the state the scene had when tapped */
  const replay = (api, f) => {
    const b = blink(api); let last = 0, hold = null;
    return {
      tap: () => { if (api.calm()) b.go(); else if (last < f) { hold = last; api.seek(f); } },
      t: (t) => { last = t; if (t < f) hold = null; return hold == null ? t : hold; },
      fade: b.v,
    };
  };

  const SC = {};

  /* ---- 1. a flip chart on a yellow easel: notes drift, then group under ideas and actions ---- */
  const SCAT = [[262, 300, -12, 34, 20], [520, 290, 9, -30, 24], [440, 392, -6, -36, -14], [310, 380, 14, 28, -30],
    [556, 380, -10, -24, -28], [360, 290, 7, 30, 30], [470, 330, -14, 22, 26], [240, 380, 10, 20, -34]];
  const SLOT = [[247, 262], [333, 262], [247, 350], [333, 350], [467, 262], [553, 262], [467, 350], [553, 350]];
  const easelArt = (p, words) => {
    const g = el("g", {}, p);
    bar(g, "M400 40 V572", 14, YEL);
    bar(g, "M266 534 H534", 10, YEL);
    bar(g, "M386 38 L254 572", 16, YEL);
    bar(g, "M414 38 L546 572", 16, YEL);
    ["M274 492 l-6 24", "M262 534 l-4 16", "M526 492 l6 24", "M538 534 l4 16", "M398 500 v26"].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g));
    el("rect", { x: 168, y: 460, width: 464, height: 20, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    ["M196 470 h44", "M560 470 h34"].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 2, "stroke-linecap": "round" }, g));
    const hit = el("g", {}, g);
    if (words) ring(hit, { x: 170, y: 36, width: 460, height: 436, rx: 18 });
    el("rect", { x: 190, y: 66, width: 420, height: 394, fill: "#fff", stroke: INK, "stroke-width": 3 }, hit);
    const pg = el("g", {}, hit);
    el("rect", { x: 190, y: 66, width: 420, height: 394, fill: "#fff", stroke: INK, "stroke-width": 3 }, pg);
    const lb = el("g", {}, pg);
    if (words) {
      txt(lb, 290, 200, "ideas", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
      txt(lb, 510, 200, "actions", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 });
    }
    ["M252 214 h76", "M462 214 h96"].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, lb));
    el("path", { d: "M400 180 V430", stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round", "stroke-dasharray": "1 10" }, lb);
    const hd = el("g", {}, pg);
    const HEAD = "retro board";
    const ht = words ? txt(hd, 400, 136, HEAD, { "text-anchor": "middle", "font-size": 40, "font-weight": 700 }) : null;
    const hw = ht ? ht.getComputedTextLength() : 220;
    const hu = el("path", { d: `M${400 - hw / 2} 152 h${hw}`, fill: "none", stroke: YEL, "stroke-width": 10, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": "1 1" }, hd);
    const notes = SCAT.map((_, i) => {
      const n = el("g", {}, pg);
      el("rect", { x: -36, y: -36, width: 72, height: 72, rx: 5, fill: i % 2 ? BLUE : YEL, stroke: INK, "stroke-width": 2.5 }, n);
      ["M-20 -8 h34", "M-20 8 h22"].forEach((d) => el("path", { d, stroke: INK, "stroke-width": 2.5, "stroke-linecap": "round" }, n));
      return n;
    });
    el("rect", { x: 176, y: 50, width: 448, height: 26, rx: 8, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    [206, 594].forEach((x) => el("circle", { cx: x, cy: 63, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, g));
    return {
      hit,
      /* nt: build time, fk: page flip 0 to 1, fade: reduced motion tap fade */
      draw(nt, fk, fade) {
        pg.setAttribute("transform", `translate(0 70) scale(1 ${Math.max(0.02, 1 - fk)}) translate(0 -70)`);
        pg.setAttribute("opacity", fade * (1 - seg(fk, 0.85, 1)));
        lb.setAttribute("opacity", seg(nt, 0, 0.4));
        notes.forEach((n, i) => {
          const [sx, sy, r, dx, dy] = SCAT[i], [ex, ey] = SLOT[i % 2 ? 4 + (i >> 1) : i >> 1];
          const a = oc(seg(nt, 0.2 + i * 0.08, 0.7 + i * 0.08)), d = io(seg(nt, 0.3, 2.6)), k = io(seg(nt, 2.7 + i * 0.18, 3.5 + i * 0.18));
          tf(n, lerp(sx + dx * d, ex, k), lerp(sy + dy * d, ey, k), 0.6 + 0.4 * a, lerp(r + 4 * d, (i % 3) - 1, k));
          n.setAttribute("opacity", a);
        });
        const h = seg(nt, 5.0, 5.7), u = seg(nt, 5.6, 6.0);
        if (ht) ht.textContent = HEAD.slice(0, Math.round(HEAD.length * h));
        hu.setAttribute("stroke-dashoffset", 1 - u); hu.setAttribute("opacity", u > 0 ? 1 : 0);
      },
    };
  };
  SC.easel = {
    dur: 9, still: 7,
    build(svg, api) {
      const r = replay(api, 8.2), E = easelArt(svg, true);
      button(E.hit, "Flip chart. Press to flip to a fresh page and group the notes again.", r.tap);
      return (t, now) => E.draw(r.t(t), io(seg(t, 8.2, 8.8)), r.fade(now));
    },
  };

  /* ---- 2. a mint seed tray on a white table: cells fill row by row, a formula tag goes in ---- */
  const RW = 4, CL = 6, TAGC = [1, 4];
  const tp = (u, v) => [lerp(lerp(214, 586, u), lerp(158, 642, u), v), lerp(200, 380, v)];
  const quad = (c, r, i) => [[c + i, r + i], [c + 1 - i, r + i], [c + 1 - i, r + 1 - i], [c + i, r + 1 - i]].map(([u, v]) => tp(u / CL, v / RW).map((n) => n.toFixed(1)).join(",")).join(" ");
  const trayArt = (p, words) => {
    const g = el("g", {}, p);
    if (words) {
      [100, 676].forEach((x) => el("rect", { x, y: 468, width: 24, height: 114, rx: 4, fill: "#fff", stroke: INK, "stroke-width": 3 }, g));
      el("rect", { x: 56, y: 450, width: 688, height: 22, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
    }
    const hit = el("g", {}, g);
    if (words) ring(hit, { x: 122, y: 170, width: 556, height: 298, rx: 20 });
    el("path", { d: "M196 186 L604 186 L664 388 L136 388 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, hit);
    el("path", { d: "M136 388 L664 388 L650 452 L150 452 Z", fill: MINT, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, hit);
    const cells = [];
    for (let r = 0; r < RW; r++) for (let c = 0; c < CL; c++) {
      el("polygon", { points: quad(c, r, 0.09), fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, hit);
      const s = el("g", {}, hit);
      el("polygon", { points: quad(c, r, 0.16), fill: LIL, stroke: INK, "stroke-width": 2, "stroke-linejoin": "round" }, s);
      [[0.36, 0.4], [0.62, 0.5], [0.46, 0.66]].forEach(([u, v]) => { const [x, y] = tp((c + u) / CL, (r + v) / RW); el("circle", { cx: x, cy: y, r: 2.6, fill: INK }, s); });
      cells.push({ s, r, c, m: tp((c + 0.5) / CL, (r + 0.5) / RW) });
    }
    const [tx, ty] = tp((TAGC[1] + 0.5) / CL, (TAGC[0] + 0.5) / RW);
    const tag = el("g", {}, hit), ti = el("g", {}, tag);
    el("path", { d: "M-5 -120 H5 V-8 L0 4 L-5 -8 Z", fill: "#fff", stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, ti);
    const plate = el("rect", { y: -176, height: 58, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, ti);
    let pw = 120;
    if (words) pw = txt(ti, 0, -138, "formula", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 }).getComputedTextLength() + 36;
    plate.setAttribute("x", -pw / 2); plate.setAttribute("width", pw);
    const lab = el("rect", { y: 402, height: 38, rx: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, hit);
    let lw = 90;
    if (words) lw = txt(hit, 400, 430, "beta", { "text-anchor": "middle", "font-size": 26, "font-weight": 700 }).getComputedTextLength() + 36;
    lab.setAttribute("x", 400 - lw / 2); lab.setAttribute("width", lw);
    return {
      hit,
      /* nt: build time, ek: emptying 0 to 1, fade: reduced motion tap fade */
      draw(nt, ek, fade) {
        cells.forEach(({ s, r, c, m }) => {
          const a = r * 0.85 + c * 0.1 + 0.4, k = ob(seg(nt, a, a + 0.35)) * (1 - ek);
          s.setAttribute("transform", `translate(${m[0]} ${m[1]}) scale(${Math.max(0.001, k)}) translate(${-m[0]} ${-m[1]})`);
          s.setAttribute("opacity", k > 0.001 ? fade : 0);
        });
        const a = oc(seg(nt, 4.2, 4.8));
        tf(tag, tx, ty - 110 * (1 - a) - 90 * ek);
        tf(ti, 0, 0, 1, -4);
        tag.setAttribute("opacity", Math.min(cl(a * 3), 1 - ek) * fade);
      },
    };
  };
  SC.seedtray = {
    dur: 9, still: 7,
    build(svg, api) {
      const r = replay(api, 8.2), T = trayArt(svg, true);
      button(T.hit, "Seed tray. Press to empty the cells and fill them again in order.", r.tap);
      return (t, now) => T.draw(r.t(t), io(seg(t, 8.2, 8.7)), r.fade(now));
    },
  };

  /* ---- 3. a yellow barometer on a white wall: the needle settles on live, a ribbon reads certified ---- */
  const BC = [400, 250];
  const pol = (r, a) => [BC[0] + r * Math.sin((a * Math.PI) / 180), BC[1] - r * Math.cos((a * Math.PI) / 180)];
  const baroArt = (p, words) => {
    const g = el("g", {}, p);
    el("circle", { cx: 400, cy: 40, r: 7, fill: SOFT, stroke: INK, "stroke-width": 3 }, g);
    bar(g, "M400 44 L376 82 M400 44 L424 82", 4, YEL);
    const hit = el("g", {}, g);
    if (words) ring(hit, { x: 210, y: 60, width: 380, height: 380, rx: 190 });
    el("circle", { cx: 400, cy: 250, r: 178, fill: YEL, stroke: INK, "stroke-width": 3 }, hit);
    el("circle", { cx: 400, cy: 250, r: 164, fill: "none", stroke: INK, "stroke-width": 1.5 }, hit);
    [45, 135, 225, 315].forEach((a) => { const [x, y] = pol(171, a); el("circle", { cx: x, cy: y, r: 4.5, fill: "#fff", stroke: INK, "stroke-width": 2 }, hit); });
    el("circle", { cx: 400, cy: 250, r: 146, fill: "#fff", stroke: INK, "stroke-width": 3 }, hit);
    [[-135, -45, SKY], [-45, 45, MINT], [45, 135, LIL]].forEach(([a, b, c]) => {
      const [x0, y0] = pol(134, a), [x1, y1] = pol(134, b);
      el("path", { d: `M${x0} ${y0} A134 134 0 0 1 ${x1} ${y1}`, fill: "none", stroke: c, "stroke-width": 12 }, hit);
    });
    for (let a = -135; a <= 135; a += 9) {
      const big = a % 45 === 0, [x0, y0] = pol(124, a), [x1, y1] = pol(big ? 104 : 114, a);
      el("path", { d: `M${x0} ${y0} L${x1} ${y1}`, stroke: INK, "stroke-width": big ? 3.5 : 2.5, "stroke-linecap": "round" }, hit);
    }
    el("rect", { x: 350, y: 298, width: 100, height: 46, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 3 }, hit);
    const live = words ? txt(hit, 400, 330, "live", { "text-anchor": "middle", "font-size": 28, "font-weight": 700 }) : null;
    const nd = el("g", {}, hit);
    el("path", { d: "M0 -122 L6 0 L0 30 L-6 0 Z", fill: BLUE, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, nd);
    el("circle", { cx: 400, cy: 250, r: 14, fill: YEL, stroke: INK, "stroke-width": 3 }, hit);
    el("circle", { cx: 400, cy: 250, r: 4, fill: INK }, hit);
    const rb = el("g", {}, g), knot = el("g", {}, rb), ki = el("g", { transform: "translate(-400 -440)" }, knot);
    bar(ki, "M396 440 L372 470", 8, BLUE);
    bar(ki, "M404 440 L428 470", 8, BLUE);
    el("ellipse", { cx: 380, cy: 438, rx: 20, ry: 11, transform: "rotate(-18 380 438)", fill: BLUE, stroke: INK, "stroke-width": 3 }, ki);
    el("ellipse", { cx: 420, cy: 438, rx: 20, ry: 11, transform: "rotate(18 420 438)", fill: BLUE, stroke: INK, "stroke-width": 3 }, ki);
    el("circle", { cx: 400, cy: 440, r: 9, fill: BLUE, stroke: INK, "stroke-width": 3 }, ki);
    const id = `mg-sw-clip-${++uid}`;
    const cr = el("rect", { y: 450, height: 110 }, el("clipPath", { id }, el("defs", {}, rb)));
    const bn = el("g", { "clip-path": `url(#${id})` }, rb);
    el("path", { d: "M248 480 H196 L214 506 L196 532 H248 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bn);
    el("path", { d: "M552 480 H604 L586 506 L604 532 H552 Z", fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, bn);
    el("rect", { x: 226, y: 466, width: 348, height: 56, rx: 6, fill: BLUE, stroke: INK, "stroke-width": 3 }, bn);
    const cert = words ? txt(bn, 400, 505, "certified", { "text-anchor": "middle", "font-size": 32, "font-weight": 700 }) : null;
    return {
      hit,
      /* ang: needle angle in degrees from straight up, lk: live window, kk: bow, uk: ribbon unroll */
      draw(ang, lk, kk, uk, fade) {
        tf(nd, 400, 250, 1, cl(ang, -135, 135));
        nd.setAttribute("opacity", fade);
        if (live) live.setAttribute("opacity", lk);
        tf(knot, 400, 440, Math.max(0.001, kk));
        knot.setAttribute("opacity", cl(kk * 3));
        const w = 440 * uk;
        cr.setAttribute("x", 400 - w / 2); cr.setAttribute("width", w);
        if (cert) cert.setAttribute("opacity", seg(uk, 0.4, 0.7));
      },
    };
  };
  /* damped swing from -120 that settles on 30 */
  const swing = (t) => { const s = t - 0.6; return s < 0 ? -120 : 30 - 150 * Math.exp(-1.5 * s) * Math.cos(4.4 * s); };
  SC.barometer = {
    dur: 9, still: 7,
    build(svg, api) {
      const b = blink(api), B = baroArt(svg, true);
      let k0 = -9;
      button(B.hit, "Barometer dial. Press to make the needle swing and settle again.", () => { if (api.calm()) b.go(); else { k0 = api.now(); api.redraw(); } });
      return (t, now) => {
        const s = now - k0, kick = s >= 0 && s < 5 ? 75 * Math.exp(-1.4 * s) * Math.sin(4.6 * s) : 0;
        const back = io(seg(t, 8.3, 8.9));
        B.draw(lerp(swing(t), -120, back) + kick, seg(t, 3.3, 3.8) * (1 - seg(t, 8.2, 8.5)), ob(seg(t, 3.9, 4.3)) * (1 - seg(t, 8.5, 8.8)), io(seg(t, 4.3, 5.2)) * (1 - io(seg(t, 8.2, 8.7))), b.v(now));
      };
    },
  };

  /* ---- title card, 16 by 9: the three objects small in a row, no words on them ---- */
  SC.hero = {
    w: 960, h: 540, dur: 6, still: 4.6,
    build(svg) {
      const kg = el("g", { transform: "translate(64 44)" }, svg);
      const kr = el("rect", { x: 0, y: 0, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, kg);
      const kt = txt(kg, 20, 28, "Launch", { "font-size": 22, "font-weight": 700 });
      kr.setAttribute("width", kt.getComputedTextLength() + 40);
      txt(svg, 60, 156, "Claude Sheets,", { "font-size": 60, "font-weight": 700 });
      const l2 = txt(svg, 60, 226, "Whiteboards and Data", { "font-size": 60, "font-weight": 700 });
      el("path", { d: `M66 250 H${60 + l2.getComputedTextLength() - 6}`, stroke: YEL, "stroke-width": 12, "stroke-linecap": "round" }, svg);
      l2.parentNode.appendChild(l2);
      txt(svg, 64, 298, "What launched and who gets it", { "font-size": 28, "font-weight": 500 });
      txt(svg, 64, 334, "Checked 10 Nov 2026", { "font-size": 22, "font-weight": 500, fill: MUTE });
      const T = 508;
      el("rect", { x: 40, y: T, width: 880, height: 14, rx: 7, fill: SOFT, stroke: INK, "stroke-width": 2.5 }, svg);
      const place = (x, s, by, st) => { const o = el("g", {}, svg), i = el("g", { transform: `translate(-400 ${-by})` }, o); return { o, i, x, s, st }; };
      const P = [place(200, 0.27, 580, 0.3), place(476, 0.36, 452, 0.6), place(752, 0.27, 536, 0.9)];
      easelArt(P[0].i, false).draw(7, 0, 1);
      trayArt(P[1].i, false).draw(7, 0, 1);
      baroArt(P[2].i, false).draw(30, 1, 1, 1, 1);
      return (t) => {
        const out = 1 - seg(t, 5.4, 5.9);
        P.forEach(({ o, x, s, st }) => { const k = oc(seg(t, st, st + 0.7)); tf(o, x, T + 1 + 24 * (1 - k), s); o.setAttribute("opacity", Math.min(k, out)); });
      };
    },
  };

  /* ---- player ---- */
  const q = new URLSearchParams(location.search), frozen = q.has("mgstill"), fixed = parseFloat(q.get("mgstill"));
  const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = (fig) => {
    const sc = SC[fig.dataset.scene], img = fig.querySelector("img"); if (!sc || !img) return;
    const W = sc.w || 800, H = sc.h || 600, fz = isNaN(fixed) ? sc.still : fixed;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "mg-svg", role: "group", "aria-label": img.alt || "" });
    svg.style.aspectRatio = `${W} / ${H}`;
    el("rect", { width: W, height: H, fill: "#fff" }, svg);
    img.replaceWith(svg);
    let off = 0, raf = 0, seen = false, held = calm;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    const frame = () => { const now = clock(); draw(frozen ? fz : held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held && !frozen) raf = requestAnimationFrame(tick); };
    const api = { now: clock, calm: () => held || frozen, redraw: tick, seek: (s) => { off = s - clock(); held = false; tick(); }, poke: () => { held = false; tick(); } };
    draw = sc.build(svg, api);
    if (frozen) { draw(fz, 0); return; }
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
