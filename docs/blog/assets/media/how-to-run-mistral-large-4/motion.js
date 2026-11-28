/* Bright coded scenes for "How to run Mistral Large 4". Vanilla JS, no library.
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
  const button = (g, label, fn) => {
    g.setAttribute("role", "button"); g.setAttribute("tabindex", "0"); g.setAttribute("aria-label", label); g.classList.add("mg-hit");
    g.addEventListener("click", fn);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } });
  };
  const strip = (svg, y, w = 680) => {
    el("rect", { x: (800 - w) / 2, y, width: w, height: 48, rx: 24, fill: SOFT }, svg);
    return txt(svg, 400, y + 31, "", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
  };


  const SC = {};

  /* ---- shared suitcase, drawn with its bottom centre at 0,0 ---- */
  const suitcase = (g, w, h, col, tag) => {
    el("path", { d: `M-14 ${-h} V${-h - 10} H14 V${-h}`, stroke: INK, "stroke-width": 3, fill: "none", "stroke-linejoin": "round" }, g);
    el("rect", { x: -w / 2, y: -h, width: w, height: h, rx: 10, fill: col, stroke: INK, "stroke-width": 3 }, g);
    [-0.27, 0.27].forEach((f) => el("path", { d: `M${w * f} ${-h + 3} V-3`, stroke: INK, "stroke-width": 2 }, g));
    const tw = tag.length * 8.4 + 18;
    el("path", { d: `M0 ${-h - 10} V${-h - 32}`, stroke: INK, "stroke-width": 2 }, g);
    const tg = el("rect", { x: -tw / 2, y: -h - 58, width: tw, height: 26, rx: 6, fill: "#fff", stroke: INK, "stroke-width": 2 }, g);
    txt(g, 0, -h - 40, tag, { "text-anchor": "middle", "font-family": MONO, "font-size": 14, "font-weight": 700 });
    return { tg, tw };
  };

  /* ---- 1. five suitcases on a carousel, one shelf of memory ---- */
  SC.luggage = {
    dur: 10, still: 10,
    build(svg, api) {
      const TAG = ["233 GB 1 bit", "378 GB 2 bit", "605 GB 4 bit", "1.1 TB 8 bit", "2.1 TB full"];
      const SZ = ["233 GB", "378 GB", "605 GB", "1.1 TB", "2.1 TB"];
      const W = [64, 80, 100, 128, 160], H = [46, 58, 72, 90, 110], X = [715, 592, 455, 300, 125], COL = [YEL, SKY, LIL, BLUE, YEL];
      const BY = 470, SX = 400, SY = 230;
      /* shelf: two side posts 76 apart, so only the smallest case fits between them */
      const glow = el("rect", { x: SX - 38, y: SY - 72, width: 76, height: 72, fill: MINT, opacity: 0 }, svg);
      [-40, 40].forEach((d) => el("rect", { x: SX + d - 4, y: SY - 76, width: 8, height: 76, rx: 3, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg));
      el("rect", { x: SX - 80, y: SY, width: 160, height: 12, rx: 4, fill: BLUE, stroke: INK, "stroke-width": 3 }, svg);
      txt(svg, SX, SY + 40, "256 GB memory", { "text-anchor": "middle", "font-family": MONO, "font-size": 20, "font-weight": 700 });
      /* the carousel */
      el("rect", { x: 30, y: BY, width: 740, height: 24, rx: 12, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      const slats = el("path", { d: `M44 ${BY + 12} H756`, stroke: MUTE, "stroke-width": 12, "stroke-dasharray": "2 38" }, svg);
      for (let x = 70; x <= 730; x += 110) el("circle", { cx: x, cy: BY + 34, r: 8, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      let pinned = -1;
      const cases = W.map((w, i) => {
        const g = el("g", {}, svg), rw = Math.max(w, TAG[i].length * 8.4 + 18) + 16;
        el("rect", { x: -rw / 2, y: -H[i] - 66, width: rw, height: H[i] + 74, rx: 14, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6" }, g);
        const s = suitcase(g, w, H[i], COL[i], TAG[i]);
        button(g, `${TAG[i]}: Needs more than ${SZ[i]} of memory`, () => { pinned = i; api.poke(); });
        return Object.assign({ g }, s);
      });
      const bar = el("g", {}, svg);
      el("rect", { x: 160, y: 532, width: 480, height: 48, rx: 24, fill: SOFT }, bar);
      const line = txt(bar, 400, 563, "", { "text-anchor": "middle", "font-size": 21, "font-weight": 600 });
      const LIFT = [2.6, 3.8], HOP = (i) => 4.3 + (i - 1) * 0.8;
      return (t) => {
        const ride = io(seg(t, 0.3, 2.4)), back = 900 * (1 - ride);
        slats.setAttribute("stroke-dashoffset", -900 * ride);
        let auto = -1;
        cases.forEach((c, i) => {
          let x = X[i] - back, y = BY, r = 0;
          if (i === 0) {
            const k = io(seg(t, LIFT[0], LIFT[1]));
            x = X[0] + (SX - X[0]) * k; y = BY + (SY - BY) * k - Math.sin(k * Math.PI) * 60;
            if (t >= LIFT[0]) auto = 0;
          } else {
            const h = seg(t, HOP(i), HOP(i) + 0.7), up = Math.sin(h * Math.PI);
            x += (SX - X[i]) * 0.18 * up; y -= 44 * up; r = Math.sin(h * Math.PI * 4) * 5 * up;
            if (h > 0 && h < 1) auto = i;
          }
          tf(c.g, x, y, 1, r);
        });
        if (t >= 7.6) auto = 0;
        glow.setAttribute("opacity", seg(t, LIFT[1] - 0.2, LIFT[1] + 0.2));
        const show = pinned >= 0 ? pinned : auto;
        cases.forEach((c, i) => c.tg.setAttribute("fill", i === show ? YEL : "#fff"));
        line.textContent = show < 0 ? "" : `Needs more than ${SZ[show]} of memory`;
        bar.setAttribute("opacity", show < 0 ? 0 : 1);
      };
    },
  };

  /* ---- 2. one loaf, eight cups ---- */
  SC.tin = {
    dur: 9, still: 9,
    build(svg, api) {
      const LY = 96, LH = 84, CY = 330, CH = 100, cx = (i) => 68 + i * 84, FULL = 84, SMALL = 84 * 76 / 128;
      txt(svg, 400, 74, "Mistral Large 4", { "text-anchor": "middle", "font-family": MONO, "font-size": 26, "font-weight": 700 });
      el("rect", { x: 66, y: LY - 2, width: 668, height: LH + 4, rx: 38, fill: "none", stroke: MUTE, "stroke-width": 2, "stroke-dasharray": "4 8" }, svg);
      const loaf = el("rect", { x: 68, y: LY, width: 664, height: LH, rx: 36, fill: YEL, stroke: INK, "stroke-width": 3 }, svg);
      const cuts = Array.from({ length: 7 }, (_, i) => el("path", { d: `M${cx(i + 1) - 2} ${LY - 12} V${LY + LH + 12}`, stroke: INK, "stroke-width": 3, "stroke-linecap": "round" }, svg));
      el("rect", { x: 56, y: CY - 14, width: 688, height: CH + 26, rx: 16, fill: SKY, stroke: INK, "stroke-width": 3 }, svg);
      for (let i = 0; i < 8; i++) {
        el("rect", { x: cx(i), y: CY, width: 80, height: CH, rx: 10, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
        txt(svg, cx(i) + 40, CY + CH + 52, `GPU ${i + 1}`, { "text-anchor": "middle", "font-family": MONO, "font-size": 17, "font-weight": 700 });
      }
      const slices = Array.from({ length: 8 }, (_, i) => el("rect", { x: cx(i) + 4, width: 72, rx: i === 0 || i === 7 ? 18 : 8, fill: YEL, stroke: INK, "stroke-width": 3 }, svg));
      const sw = el("g", {}, svg), SWX = 214, SWY = 508;
      el("rect", { x: SWX - 10, y: SWY - 10, width: 392, height: 60, rx: 30, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6" }, sw);
      const track = el("rect", { x: SWX, y: SWY, width: 76, height: 40, rx: 20, fill: SOFT, stroke: INK, "stroke-width": 3 }, sw);
      const knob = el("circle", { cy: SWY + 20, r: 14, fill: "#fff", stroke: INK, "stroke-width": 3 }, sw);
      const lab = txt(sw, SWX + 96, SWY + 29, "", { "font-size": 25, "font-weight": 700 });
      let user = null, from = 0, at = 0;
      const cur = (t, now) => user == null ? io(seg(t, 5.2, 5.8)) : from + (user - from) * io(seg(now - at, 0, 0.6));
      let last = 0, lastT = 0;
      button(sw, "FP8 or NVFP4", () => { from = last; user = last > 0.5 ? 0 : 1; at = api.now(); if (lastT < 4.6) api.seek(4.6); else api.poke(); });
      sw.setAttribute("role", "switch");
      return (t, now) => {
        const v = cur(t, now); last = v; lastT = t;
        const cut = seg(t, 0.5, 1.8), sliced = t >= 2;
        loaf.setAttribute("opacity", sliced ? 0 : 1);
        cuts.forEach((c, i) => c.setAttribute("opacity", !sliced && cut * 7 > i ? 1 : 0));
        const hh = FULL + (SMALL - FULL) * v;
        slices.forEach((s, i) => {
          const d = seg(t, 2.1 + i * 0.26, 2.1 + i * 0.26 + 0.55), k = d < 0.75 ? Math.pow(d / 0.75, 2) : 1 - Math.sin((d - 0.75) / 0.25 * Math.PI) * 0.06;
          const landed = d >= 1, h = landed ? hh : FULL;
          const yTop = LY + (CY + CH - 4 - FULL - LY) * k;
          s.setAttribute("y", landed ? CY + CH - 4 - h : yTop); s.setAttribute("height", h);
          s.setAttribute("opacity", sliced ? 1 : 0);
        });
        const on = v > 0.5;
        knob.setAttribute("cx", SWX + 20 + 36 * v);
        track.setAttribute("fill", on ? BLUE : SOFT);
        lab.textContent = on ? "NVFP4, 76 GiB a cup" : "FP8, 128 GiB a cup";
        sw.setAttribute("aria-checked", on ? "true" : "false");
        sw.setAttribute("aria-label", on ? "NVFP4, 76 GiB a cup" : "FP8, 128 GiB a cup");
      };
    },
  };

  /* ---- 3. the licence as a signpost ---- */
  SC.signpost = {
    dur: 8, still: 8,
    build(svg, api) {
      const PX = 320, GY = 522, AH = 46;
      const ARMS = [["Use", 1, 140], ["Modify", -1, 205], ["Fine tune", 1, 270], ["Sell", -1, 335], ["Model as a Service", 1, 400]];
      el("ellipse", { cx: PX, cy: GY + 4, rx: 170, ry: 14, fill: SOFT }, svg);
      const post = el("g", {}, svg);
      el("rect", { x: PX - 40, y: 92, width: 80, height: GY - 92 + 12, rx: 16, fill: "#fff", "fill-opacity": 0, class: "mg-ring", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6" }, post);
      el("rect", { x: PX - 12, y: 104, width: 24, height: GY - 104, rx: 6, fill: YEL, stroke: INK, "stroke-width": 3 }, post);
      button(post, "Swing the arms out again", () => api.seek(1.2));
      const arms = ARMS.map(([word, s, y], i) => {
        const g = el("g", {}, svg), last = i === 4, base = PX + 12 * s;
        const path = el("path", { fill: last ? LIL : YEL, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, g);
        const t0 = last ? 22 : 54, label = txt(g, base + s * t0, y + 8, word, { "text-anchor": s > 0 ? "start" : "end", "font-size": 24, "font-weight": 700 });
        const L = t0 + label.getComputedTextLength() + 40;
        path.setAttribute("d", `M${base} ${y - AH / 2} H${base + s * (L - 22)} L${base + s * L} ${y} L${base + s * (L - 22)} ${y + AH / 2} H${base} Z`);
        let tick = null;
        if (!last) { tick = el("g", {}, g); el("circle", { r: 13, fill: MINT, stroke: INK, "stroke-width": 2.5 }, tick); el("path", { d: "M-6 0 L-2 5 L6 -5", stroke: INK, "stroke-width": 3, fill: "none", "stroke-linecap": "round", "stroke-linejoin": "round" }, tick); }
        return { g, s, y, tick, tx: base + s * 28, L, start: last ? 3.4 : 1.4 + i * 0.45 };
      });
      const maas = arms[4], nx = PX + 40;
      const note = el("g", {}, svg);
      el("path", { d: `M${nx + 110} ${maas.y + AH / 2} V${maas.y + 50}`, stroke: INK, "stroke-width": 2 }, note);
      const nt = txt(note, nx + 16, maas.y + 78, "Separate licence from Mistral", { "font-size": 19, "font-weight": 600 });
      const nw = nt.getComputedTextLength() + 32;
      const card = el("rect", { x: nx, y: maas.y + 50, width: nw, height: 40, rx: 10, fill: SOFT, stroke: INK, "stroke-width": 2 }, note);
      note.insertBefore(card, nt);
      return (t) => {
        const r = ob(seg(t, 0.2, 1.2));
        post.setAttribute("transform", `translate(0 ${GY}) scale(1 ${cl(r, 0, 1.08)}) translate(0 ${-GY})`);
        arms.forEach((a) => {
          const p = seg(t, a.start, a.start + 0.6), k = ob(p);
          a.g.setAttribute("transform", `rotate(${a.s * 80 * (1 - k)} ${PX} ${a.y})`);
          a.g.setAttribute("opacity", p > 0 ? 1 : 0);
          if (a.tick) tf(a.tick, a.tx, a.y, ob(seg(t, a.start + 0.45, a.start + 0.8)));
        });
        const n = oc(seg(t, 4.3, 4.9));
        note.setAttribute("opacity", n); note.setAttribute("transform", `translate(0 ${-18 * (1 - n)})`);
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 70, width: 104, height: 38, rx: 19, fill: SOFT, stroke: INK, "stroke-width": 2 }, svg);
      txt(svg, 116, 96, "Guides", { "text-anchor": "middle", "font-size": 19, "font-weight": 700 });
      txt(svg, 64, 210, "Run Mistral", { "font-size": 72, "font-weight": 700 });
      txt(svg, 64, 292, "Large 4", { "font-size": 72, "font-weight": 700 });
      el("path", { d: "M66 318 H330", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 376, "From 256 GB of memory", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 470, "Checked 29 Oct 2026", { "font-size": 18, "font-weight": 500, fill: "#6B5878" });
      const BY = 440;
      el("rect", { x: 540, y: BY, width: 380, height: 22, rx: 11, fill: SOFT, stroke: INK, "stroke-width": 3 }, svg);
      el("path", { d: `M552 ${BY + 11} H908`, stroke: MUTE, "stroke-width": 10, "stroke-dasharray": "2 34" }, svg);
      for (let x = 572; x <= 900; x += 82) el("circle", { cx: x, cy: BY + 31, r: 7, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, svg);
      [[600, 80, 58, YEL, "233 GB"], [712, 100, 74, SKY, "378 GB"], [846, 124, 94, LIL, "605 GB"]].forEach(([x, w, h, c, s]) => { const g = el("g", {}, svg); suitcase(g, w, h, c, s); tf(g, x, BY); });
      return () => {};
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
