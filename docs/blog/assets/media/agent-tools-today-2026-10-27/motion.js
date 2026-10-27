/* Bright coded scene for "Agent tools today, 27 Oct 2026". Vanilla JS, no library.
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

  const SC = {};

  /* ---- a laptop runs an open weight model on its own: Files go in, a Chart comes out, and the Web search switch cuts the dotted line to Online ---- */
  SC.today = {
    w: 1600, h: 1200, dur: 11, still: 9.6,
    build(svg, api) {
      const A = (o) => Object.assign({ stroke: INK, "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round" }, o);
      const lp = (a, b, p) => a + (b - a) * p;
      /* geometry */
      const LX = 440, LW = 720, LT = 480, HINGE = 860, CX = 800, CHX = 900, CHY = 670, FY = 670;
      const SWX = 850, SWY = 338, SWW = 132, SWH = 66;
      const LINE_TOP = 272, LINE_BOT = LT - 10;
      /* beats, in seconds */
      const T_LINE = 0.7, T_SW = 0.9, T_FOLD = 1.4, T_SLIDE = 2.4, T_PULSE = 3.8, T_OUT = 4.6, T_BARS = 5.5, T_OFF = 7.0;

      /* the whole picture sits 50 lower so it is centred top to bottom */
      const inner = el("g", { transform: "translate(0 50)" }, svg);
      const defs = el("defs", {}, svg);

      /* the dotted line from the cloud down to the laptop; it grows in, then dots flow down it */
      const lclip = el("clipPath", { id: "mg-today-line" }, defs);
      const lrect = el("rect", { x: CX - 20, y: LINE_TOP - 10, width: 40, height: 0 }, lclip);
      const lineG = el("g", { "clip-path": "url(#mg-today-line)" }, inner);
      const line = el("path", { d: `M ${CX} ${LINE_TOP} V ${LINE_BOT}`, fill: "none", stroke: BLUE, "stroke-width": 10, "stroke-linecap": "round", "stroke-dasharray": "1 19" }, lineG);

      /* the cloud, labelled Online */
      const cloud = el("g", {}, inner);
      el("path", A({ d: "M640 270 A70 70 0 0 1 620 140 A95 95 0 0 1 790 80 A110 110 0 0 1 960 130 A80 80 0 0 1 980 270 Z", fill: SKY }), cloud);
      txt(cloud, CX, 214, "Online", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });

      /* the Chart sheet waits behind the screen, so it is drawn before the laptop */
      const sheet = el("g", {}, inner);
      el("rect", A({ x: -100, y: -125, width: 200, height: 250, rx: 16, fill: "#fff" }), sheet);
      txt(sheet, 0, -74, "Chart", { "text-anchor": "middle", "font-size": 36, "font-weight": 700 });
      const BARS = [[-66, 60, BLUE], [-28, 100, MINT], [10, 76, YEL], [48, 130, LIL]];
      const bars = BARS.map(([x, h, f]) => ({ h, n: el("rect", A({ x, y: 95, width: 28, height: 0, rx: 5, fill: f, "stroke-width": 3 }), sheet) }));
      el("path", A({ d: "M-78 95 H80", fill: "none", "stroke-width": 3.5 }), sheet);

      /* the laptop, labelled Your computer */
      const laptop = el("g", {}, inner);
      el("path", A({ d: `M${LX - 40} ${HINGE} H${LX + LW + 40} L${LX + LW + 74} ${HINGE + 46} Q${LX + LW + 78} ${HINGE + 56} ${LX + LW + 66} ${HINGE + 56} H${LX - 66} Q${LX - 78} ${HINGE + 56} ${LX - 74} ${HINGE + 46} Z`, fill: SOFT }), laptop);
      txt(laptop, CX, HINGE + 128, "Your computer", { "text-anchor": "middle", "font-size": 46, "font-weight": 700 });
      el("rect", A({ x: LX, y: LT, width: LW, height: HINGE - LT, rx: 24, fill: BLUE }), laptop);
      el("rect", A({ x: LX + 22, y: LT + 22, width: LW - 44, height: HINGE - LT - 44, rx: 12, fill: "#fff", "stroke-width": 3 }), laptop);

      /* the chip, labelled Open weight model, with pins that light up while it works */
      const chip = el("g", {}, laptop);
      const pinsInk = el("g", {}, chip), pinsLit = el("g", { opacity: 0 }, chip);
      for (let i = 0; i < 8; i++) {
        const x = -160 + i * 44 - 7;
        [[-83, pinsInk, INK], [65, pinsInk, INK], [-83, pinsLit, YEL], [65, pinsLit, YEL]].forEach(([y, g, f]) => el("rect", A({ x, y, width: 14, height: 18, rx: 3, fill: f, "stroke-width": 2.5 }), g));
      }
      el("rect", A({ x: -190, y: -65, width: 380, height: 130, rx: 18, fill: LIL }), chip);
      txt(chip, 0, 12, "Open weight model", { "text-anchor": "middle", "font-size": 33, "font-weight": 700 });

      /* the folder, labelled Files; it slides over the frame into the screen, so it is drawn after the laptop */
      const folder = el("g", {}, inner);
      el("path", A({ d: "M-95 68 V-78 Q-95 -85 -88 -85 H-30 L-14 -68 H88 Q95 -68 95 -61 V68 Q95 75 88 75 H-88 Q-95 75 -95 68 Z", fill: YEL }), folder);
      el("rect", A({ x: -74, y: -60, width: 148, height: 40, rx: 6, fill: "#fff", "stroke-width": 3 }), folder);
      el("rect", A({ x: -95, y: -46, width: 190, height: 121, rx: 10, fill: YEL }), folder);
      txt(folder, 0, 32, "Files", { "text-anchor": "middle", "font-size": 38, "font-weight": 700 });

      /* the Web search switch beside the line: mint and knob right when on, soft and knob left when off */
      const sw = el("g", {}, inner), swFace = el("g", {}, sw);
      el("rect", { x: SWX - 12, y: SWY - 12, width: SWW + 24 + 250, height: SWH + 24, rx: (SWH + 24) / 2, fill: "none", stroke: INK, "stroke-width": 3, "stroke-dasharray": "10 8", class: "mg-ring" }, swFace);
      el("rect", { x: SWX - 12, y: SWY - 12, width: SWW + 24 + 250, height: SWH + 24, rx: (SWH + 24) / 2, fill: "#fff", opacity: 0 }, swFace);
      el("rect", A({ x: SWX, y: SWY, width: SWW, height: SWH, rx: SWH / 2, fill: SOFT, "stroke-width": 3.5 }), swFace);
      const swOn = el("rect", A({ x: SWX, y: SWY, width: SWW, height: SWH, rx: SWH / 2, fill: MINT, "stroke-width": 3.5 }), swFace);
      const knob = el("circle", A({ cx: SWX + SWW - SWH / 2, cy: SWY + SWH / 2, r: 24, fill: "#fff", "stroke-width": 3.5 }), swFace);
      txt(swFace, SWX + SWW + 26, SWY + SWH / 2 + 13, "Web search", { "font-size": 38, "font-weight": 600 });

      /* tap the switch, or Enter or Space on it: Web search flips, and the dotted line follows */
      let user = false, from = 1, to = 1, at = -99, kv = 1, last = 0;
      button(sw, "Web search", () => {
        from = kv; to = kv < 0.5 ? 1 : 0; user = true;
        at = calm || frozen ? -99 : api.now();
        sw.setAttribute("aria-checked", to ? "true" : "false");
        if (calm || frozen) D(last, api.now());
      });
      sw.setAttribute("role", "switch");
      sw.setAttribute("aria-checked", "true");

      const pop = (n, p, x, y, s = 1) => { tf(n, x, y, (s * ob(p)).toFixed(3)); n.setAttribute("opacity", p > 0 ? 1 : 0); };
      const D = (t, now = 0) => {
        last = t;
        inner.setAttribute("opacity", (oc(seg(t, 0, 0.3)) * (1 - io(seg(t, 10.4, 10.9)))).toFixed(3));
        laptop.setAttribute("opacity", io(seg(t, 0.1, 0.5)).toFixed(3));
        cloud.setAttribute("opacity", io(seg(t, 0.2, 0.6)).toFixed(3));
        sw.setAttribute("opacity", io(seg(t, T_SW, T_SW + 0.4)).toFixed(3));

        /* switch value: the timeline flips it off once; after a tap it is the reader's */
        let lv;
        if (user) {
          const d = now - at;
          kv = lp(from, to, io(seg(d, 0, 0.35)));
          lv = lp(from, to, io(seg(d, 0.05, 0.6)));
        } else {
          kv = 1 - io(seg(t, T_OFF, T_OFF + 0.4));
          lv = 1 - io(seg(t, T_OFF + 0.1, T_OFF + 0.9));
        }
        knob.setAttribute("cx", lp(SWX + SWH / 2, SWX + SWW - SWH / 2, kv).toFixed(1));
        swOn.setAttribute("opacity", kv.toFixed(3));
        sw.setAttribute("aria-checked", kv >= 0.5 ? "true" : "false");

        /* the dotted line grows down to the laptop, dots flow while it is on, and it fades when Web search is off */
        lrect.setAttribute("height", ((LINE_BOT - LINE_TOP + 20) * io(seg(t, T_LINE, T_LINE + 0.7))).toFixed(1));
        line.setAttribute("stroke-dashoffset", (-(t * 40) % 20).toFixed(2));
        lineG.setAttribute("opacity", lp(0.22, 1, lv).toFixed(3));

        /* the folder pops in on the left, then slides into the screen */
        const sp = io(seg(t, T_SLIDE, T_SLIDE + 1.2));
        pop(folder, seg(t, T_FOLD, T_FOLD + 0.45), lp(240, 585, sp), FY, lp(1, 0.8, sp));

        /* the chip works: a small bump and lit pins */
        const cp = seg(t, T_PULSE, T_PULSE + 0.8), bump = Math.sin(Math.PI * cp);
        tf(chip, CHX, CHY, (1 + 0.06 * bump).toFixed(3));
        pinsLit.setAttribute("opacity", bump.toFixed(3));

        /* the Chart sheet slides out of the right side, then its bars grow */
        const op = io(seg(t, T_OUT, T_OUT + 1.2));
        sheet.setAttribute("opacity", t >= T_OUT ? 1 : 0);
        tf(sheet, lp(1000, 1340, op).toFixed(1), CHY, 1, 4 * Math.sin(Math.PI * op));
        bars.forEach((b, i) => {
          const h = b.h * oc(seg(t, T_BARS + i * 0.18, T_BARS + i * 0.18 + 0.5));
          b.n.setAttribute("y", (95 - h).toFixed(1));
          b.n.setAttribute("height", h.toFixed(1));
          b.n.setAttribute("opacity", h > 0.5 ? 1 : 0);
        });

        swFace.setAttribute("transform", `translate(${SWX + SWW / 2} ${SWY + SWH / 2}) scale(${(1 - 0.05 * Math.sin(Math.PI * seg(now - at, 0, 0.2))).toFixed(3)}) translate(${-(SWX + SWW / 2)} ${-(SWY + SWH / 2)})`);
      };
      return D;
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
    let off = 0, raf = 0, seen = false, held = calm, once = false;
    const base = performance.now(), clock = () => (performance.now() - base) / 1000;
    let draw = () => {};
    /* "once": a replay asked for under reduced motion plays through one time, then holds on the still */
    const frame = () => { const now = clock(); if (once && now + off >= sc.still) { once = false; held = true; } draw(held ? sc.still : (((now + off) % sc.dur) + sc.dur) % sc.dur, now); };
    const tick = () => { cancelAnimationFrame(raf); frame(); if (seen && !held) raf = requestAnimationFrame(tick); };
    const api = { now: clock, seek: (s, hold) => { off = s - clock(); held = false; once = !!hold; tick(); }, poke: () => { held = false; tick(); }, redraw: () => frame() };
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
