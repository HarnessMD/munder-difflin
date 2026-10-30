/* Bright coded scenes for "Meta Muse alternatives". Vanilla JS, no library.
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

  /* ---- a compass face drawn around 0,0; returns the needle group ---- */
  const compass = (g, r) => {
    el("circle", { r: r + 14, fill: SKY, stroke: INK, "stroke-width": 3 }, g);
    el("circle", { r, fill: "#fff", stroke: INK, "stroke-width": 3 }, g);
    for (let i = 0; i < 24; i++) {
      const a = (i * 15 * Math.PI) / 180, l = i % 6 === 0 ? 16 : 8;
      el("path", { d: `M${Math.sin(a) * (r - 6)} ${-Math.cos(a) * (r - 6)} L${Math.sin(a) * (r - 6 - l)} ${-Math.cos(a) * (r - 6 - l)}`, stroke: INK, "stroke-width": i % 6 === 0 ? 3 : 2, "stroke-linecap": "round" }, g);
    }
    const n = el("g", {}, g), L = r - 26, w = r * 0.16;
    el("path", { d: `M0 ${-L} L${w} 0 L${-w} 0 Z`, fill: BLUE, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, n);
    el("path", { d: `M0 ${L * 0.72} L${w} 0 L${-w} 0 Z`, fill: "#fff", stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, n);
    el("circle", { r: w * 0.75, fill: YEL, stroke: INK, "stroke-width": 3 }, g);
    return n;
  };

  const SC = {};

  /* ---- 1. a globe turns, then three launch pins drop ---- */
  SC.globe = {
    dur: 11, still: 10.5,
    build(svg, api) {
      const C = [400, 290], R = 185;
      const clip = el("clipPath", { id: "mg-globe-clip" }, el("defs", {}, svg));
      el("circle", { cx: C[0], cy: C[1], r: R }, clip);
      el("circle", { cx: C[0], cy: C[1], r: R, fill: SKY }, svg);
      const sph = el("g", { "clip-path": "url(#mg-globe-clip)" }, svg);
      const land = el("g", {}, sph);
      const blobs = [
        "M262 158 Q300 128 352 144 Q384 156 378 196 Q372 232 342 248 Q330 276 304 284 Q282 270 286 238 Q262 214 252 190 Q248 170 262 158 Z",
        "M330 302 Q362 296 380 318 Q392 352 372 392 Q356 428 340 434 Q330 404 332 370 Q318 336 330 302 Z",
        "M440 286 Q480 272 506 292 Q520 326 500 360 Q482 398 464 402 Q450 372 452 340 Q430 312 440 286 Z",
        "M450 150 Q500 128 556 146 Q584 166 572 196 Q546 214 512 210 Q480 224 458 206 Q438 178 450 150 Z",
        "M548 236 Q560 232 566 244 Q568 262 556 276 Q546 284 542 272 Q540 252 548 236 Z",
      ];
      [-400, 0, 400].forEach((dx) => { const g = el("g", { transform: `translate(${dx} 0)` }, land); blobs.forEach((d) => el("path", { d, fill: MINT, stroke: INK, "stroke-width": 2.5, "stroke-linejoin": "round" }, g)); });
      el("ellipse", { cx: C[0], cy: C[1], rx: R, ry: 26, fill: "none", stroke: "#fff", "stroke-width": 2.5, "stroke-opacity": 0.8 }, sph);
      const mer = [0, 1].map(() => el("ellipse", { cx: C[0], cy: C[1], rx: R, ry: R, fill: "none", stroke: "#fff", "stroke-width": 2.5, "stroke-opacity": 0.8 }, sph));
      el("circle", { cx: C[0], cy: C[1], r: R, fill: "none", stroke: INK, "stroke-width": 3 }, svg);
      const P = [
        { name: "US", date: "8 Sep", src: "Meta launch post", col: YEL, at: [318, 252], card: [40, 252, 150, 78], d: 3.0 },
        { name: "Canada", date: "18 Sep", src: "iPhone in Canada", col: BLUE, at: [332, 186], card: [40, 132, 150, 78], d: 4.2 },
        { name: "Japan", date: "23 Oct", src: "RuntimeWire", col: LIL, at: [554, 262], card: [612, 196, 156, 116], d: 5.4, note: "Reported" },
      ];
      const pins = P.map((p, i) => {
        const g = el("g", {}, svg), [x, y] = p.at, [cx, cy, cw, ch] = p.card;
        const shadow = el("ellipse", { cx: x, cy: y, rx: 12, ry: 4, fill: INK, "fill-opacity": 0.25 }, g);
        const ex = cx + (cx < 400 ? cw : 0), ey = cy + 36;
        const lead = el("path", { d: `M${x} ${y - 30} L${ex} ${ey}`, stroke: INK, "stroke-width": 2, "stroke-dasharray": "3 6", "stroke-linecap": "round", fill: "none" }, g);
        const card = el("g", {}, g);
        el("rect", { x: cx - 6, y: cy - 6, width: cw + 12, height: ch + 12, rx: 20, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, card);
        const face = el("rect", { x: cx, y: cy, width: cw, height: ch, rx: 16, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
        txt(card, cx + 18, cy + 34, p.name, { "font-size": 26, "font-weight": 700 });
        txt(card, cx + 18, cy + 62, p.date, { "font-family": MONO, "font-size": 20, "font-weight": 500 });
        if (p.note) { el("rect", { x: cx + 14, y: cy + 76, width: 110, height: 28, rx: 14, fill: SOFT, stroke: INK, "stroke-width": 1.5 }, card); txt(card, cx + 69, cy + 96, p.note, { "text-anchor": "middle", "font-size": 16, "font-weight": 600, fill: MUTE }); }
        const pin = el("g", {}, g);
        el("path", { d: "M0 0 C-6 -10 -16 -20 -16 -32 A16 16 0 1 1 16 -32 C16 -20 6 -10 0 0 Z", fill: p.col, stroke: INK, "stroke-width": 3, "stroke-linejoin": "round" }, pin);
        el("circle", { cx: 0, cy: -32, r: 6, fill: "#fff", stroke: INK, "stroke-width": 2.5 }, pin);
        button(g, `${p.name}, ${p.date}${p.note ? ", " + p.note : ""}: ${p.src}`, () => { pinned = i; api.seek(6.4); });
        return { g, pin, shadow, lead, card, face, x, y };
      });
      let pinned = -1, last = 0;
      const tip = strip(svg, 528, 560);
      return (t) => {
        if (t < last) pinned = -1; last = t;
        const spin = io(seg(t, 0, 2.8)), shift = (700 * (1 - spin)) % 400;
        land.setAttribute("transform", `translate(${shift} 0)`);
        mer.forEach((m, i) => { const ph = (shift / 400) * Math.PI + Math.PI / 4 + i * Math.PI / 2; m.setAttribute("rx", Math.max(2, Math.abs(Math.cos(ph)) * R)); });
        let show = -1;
        pins.forEach((p, i) => {
          const k = seg(t, P[i].d, P[i].d + 0.55), drop = ob(k), c = oc(seg(t, P[i].d + 0.4, P[i].d + 0.9));
          tf(p.pin, p.x, p.y - 140 * (1 - drop)); p.pin.setAttribute("opacity", k > 0 ? 1 : 0);
          p.shadow.setAttribute("opacity", k); p.lead.setAttribute("opacity", c);
          p.card.setAttribute("opacity", c); p.card.setAttribute("transform", `translate(0 ${12 * (1 - c)})`);
          p.face.setAttribute("fill", pinned === i ? P[i].col : "#fff");
          if (t >= P[i].d) show = i;
        });
        if (pinned >= 0) show = pinned;
        tip.textContent = show < 0 ? "Tapping a pin shows its source" : `${P[show].name}: ${P[show].src}`;
      };
    },
  };

  /* ---- 2. one training switch, On then Off ---- */
  SC.sliders = {
    dur: 9, still: 8.6,
    build(svg, api) {
      const panel = el("g", {}, svg);
      el("rect", { x: 60, y: 60, width: 680, height: 400, rx: 28, fill: "#fff", stroke: INK, "stroke-width": 3 }, panel);
      txt(panel, 104, 140, "Muse", { "font-size": 46, "font-weight": 700 });
      const crumb = txt(panel, 104, 192, "", { "font-size": 24, "font-weight": 500, fill: MUTE });
      el("path", { d: "M104 230 H696", stroke: SOFT, "stroke-width": 4, "stroke-linecap": "round" }, panel);
      el("rect", { x: 92, y: 262, width: 616, height: 160, rx: 22, fill: SOFT }, panel);
      txt(panel, 128, 330, "Use my interactions", { "font-size": 30, "font-weight": 600 });
      txt(panel, 128, 370, "to improve models", { "font-size": 30, "font-weight": 600 });
      const sw = el("g", {}, panel);
      el("rect", { x: 546, y: 288, width: 136, height: 88, rx: 44, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, sw);
      const track = el("rect", { x: 556, y: 298, width: 116, height: 68, rx: 34, stroke: INK, "stroke-width": 3 }, sw);
      const pulse = el("circle", { r: 28, fill: "none", stroke: SKY, "stroke-width": 4 }, sw);
      const knob = el("circle", { r: 25, cy: 332, fill: "#fff", stroke: INK, "stroke-width": 3 }, sw);
      const word = txt(sw, 614, 405, "", { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
      sw.setAttribute("role", "switch");
      const LINE = "Settings, Data controls";
      let user = null, last = 0;
      button(sw, "Use my interactions to improve models", () => { user = !(cur > 0.5); api.seek(5.4); });
      sw.setAttribute("role", "switch");
      el("rect", { x: 100, y: 500, width: 600, height: 48, rx: 24, fill: SOFT }, svg);
      txt(svg, 400, 531, "Tapping the switch turns it back on or off", { "text-anchor": "middle", "font-size": 20, "font-weight": 500 });
      let cur = 1;
      return (t) => {
        if (t < last) user = null; last = t;
        const p = ob(seg(t, 0, 0.7));
        panel.setAttribute("transform", `translate(400 260) scale(${0.85 + 0.15 * p}) translate(-400 -260)`); panel.setAttribute("opacity", seg(t, 0, 0.3));
        crumb.textContent = LINE.slice(0, Math.round(LINE.length * seg(t, 2.4, 3.6)));
        const slide = io(seg(t, 4.3, 5.0));
        cur = user == null ? 1 - slide : user ? 1 : 0;
        const kx = 590 + 48 * cur;
        knob.setAttribute("cx", kx);
        track.setAttribute("fill", cur > 0.5 ? BLUE : "#fff");
        word.textContent = cur > 0.5 ? "On" : "Off";
        sw.setAttribute("aria-checked", cur > 0.5 ? "true" : "false");
        const q = user == null ? seg(t, 5.0, 5.8) : 0;
        pulse.setAttribute("cx", kx); pulse.setAttribute("cy", 332);
        pulse.setAttribute("r", 26 + 30 * oc(q)); pulse.setAttribute("stroke-opacity", q > 0 && q < 1 ? 1 - q : 0);
      };
    },
  };

  /* ---- 3. a compass needle points at three reasons to leave ---- */
  SC.compass = {
    dur: 10, still: 9.6,
    build(svg, api) {
      const C = [400, 268];
      el("rect", { x: 24, y: 22, width: 752, height: 380, rx: 28, fill: "#fff", stroke: INK, "stroke-width": 3 }, svg);
      const D = [
        { label: "Not in my country", at: [152, 112], w: 232, col: YEL, pick: ["OpenClaw and", "Hermes Agent"] },
        { label: "Keep my data", at: [400, 72], w: 184, col: MINT, pick: ["Open source picks"] },
        { label: "Agents for work", at: [648, 112], w: 212, col: LIL, pick: ["Claude Cowork", "and Munder Difflin"] },
      ];
      D.forEach((d) => { d.ang = (Math.atan2(d.at[0] - C[0], C[1] - d.at[1]) * 180) / Math.PI; });
      const g = el("g", {}, svg); tf(g, C[0], C[1]);
      const needle = compass(g, 104);
      const chips = D.map((d, i) => {
        const b = el("g", {}, svg), [x, y] = d.at;
        el("rect", { x: x - d.w / 2 - 6, y: y - 30, width: d.w + 12, height: 60, rx: 30, fill: "none", stroke: INK, "stroke-width": 2, "stroke-dasharray": "4 6", class: "mg-ring" }, b);
        const face = el("rect", { x: x - d.w / 2, y: y - 24, width: d.w, height: 48, rx: 24, fill: "#fff", stroke: INK, "stroke-width": 3 }, b);
        txt(b, x, y + 8, d.label, { "text-anchor": "middle", "font-size": 22, "font-weight": 700 });
        button(b, `${d.label}: ${d.pick.join(" ")}`, () => { pick = i; from = angle; pickAt = api.now(); api.seek(6.6); });
        const card = el("g", {}, svg), cx = x;
        el("rect", { x: cx - 115, y: 424, width: 230, height: 96, rx: 18, fill: "#fff", stroke: INK, "stroke-width": 3 }, card);
        el("circle", { cx: cx - 96, cy: 444, r: 7, fill: d.col, stroke: INK, "stroke-width": 2 }, card);
        d.pick.forEach((s, j) => txt(card, cx, (d.pick.length === 1 ? 480 : 466) + j * 30, s, { "text-anchor": "middle", "font-family": MONO, "font-size": 18, "font-weight": 700 }));
        return { face, card };
      });
      el("rect", { x: 140, y: 540, width: 520, height: 44, rx: 22, fill: SOFT }, svg);
      txt(svg, 400, 569, "Tapping a direction points the needle there", { "text-anchor": "middle", "font-size": 19, "font-weight": 500 });
      let pick = -1, from = 0, pickAt = 0, angle = 0, last = 0;
      const swings = [[0, 1.6, -330, D[0].ang], [3.0, 3.9, D[0].ang, D[1].ang], [5.2, 6.1, D[1].ang, D[2].ang]];
      return (t, now) => {
        if (t < last) pick = -1; last = t;
        if (pick >= 0) angle = from + (D[pick].ang - from) * ob(seg(now - pickAt, 0, 0.7));
        else { angle = swings[0][2]; swings.forEach(([a, b, f, to]) => { if (t >= a) angle = f + (to - f) * ob(seg(t, a, b)); }); }
        needle.setAttribute("transform", `rotate(${angle})`);
        const at = pick >= 0 ? pick : t >= swings[2][0] + 0.5 ? 2 : t >= swings[1][0] + 0.5 ? 1 : t >= 1.2 ? 0 : -1;
        chips.forEach((c, i) => {
          c.face.setAttribute("fill", i === at ? D[i].col : "#fff");
          const k = oc(seg(t, [1.4, 3.8, 6.0][i], [1.9, 4.3, 6.5][i]));
          c.card.setAttribute("opacity", pick >= 0 ? 1 : k); c.card.setAttribute("transform", `translate(0 ${pick >= 0 ? 0 : 16 * (1 - k)})`);
        });
      };
    },
  };

  /* ---- title card, 16 by 9 ---- */
  SC.hero = {
    w: 960, h: 540, dur: 1, still: 0,
    build(svg) {
      el("rect", { x: 64, y: 62, width: 176, height: 44, rx: 22, fill: LIL, stroke: INK, "stroke-width": 2.5 }, svg);
      txt(svg, 152, 91, "Comparisons", { "text-anchor": "middle", "font-size": 20, "font-weight": 700 });
      txt(svg, 64, 210, "Meta Muse", { "font-size": 84, "font-weight": 700 });
      txt(svg, 64, 300, "alternatives", { "font-size": 84, "font-weight": 700 });
      el("path", { d: "M66 328 H520", stroke: YEL, "stroke-width": 14, "stroke-linecap": "round" }, svg);
      txt(svg, 64, 388, "7 picks, open source and hosted", { "font-size": 30, "font-weight": 500, fill: MUTE });
      txt(svg, 64, 478, "Checked 30 Oct 2026", { "font-family": MONO, "font-size": 18, "font-weight": 500, fill: MUTE });
      const g = el("g", {}, svg); tf(g, 770, 290);
      compass(g, 112).setAttribute("transform", "rotate(38)");
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
